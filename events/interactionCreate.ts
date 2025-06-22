import {
  Events,
  BaseInteraction,
  CommandInteraction,
  Message,
  ComponentType,
  ButtonInteraction,
  MessageReaction,
  User,
  UserSelectMenuInteraction,
} from 'discord.js';
import myClient from '..';
import { Command } from '../commands/command';
import { clearPartyContext, getPartyContext } from '../commands/party/partyContext';
import { createPartySearchMsgUI } from '../commands/party/partyUI';
import {
  convertIDsToMentions,
  convertProxiesToMentions,
  handleFillers,
  handleProxyUpdate,
} from '../commands/party/party';
import { FillQueue } from '../utility/string/collectionUtility';

export const interactionCreateEvent = {
  name: Events.InteractionCreate,
  once: false,
  async execute(client: myClient, interaction: BaseInteraction) {
    if (interaction.isChatInputCommand()) {
      const chatInteraction = interaction as CommandInteraction;
      const command: Command | undefined = client?.commands?.get(chatInteraction.commandName);

      if (!command) {
        console.error(`No command matching ${chatInteraction.commandName} was found.`);
        return;
      }

      try {
        command.execute(client, chatInteraction);
      } catch (error) {
        console.error(`Error executing ${chatInteraction.commandName}`);
        console.error(error);
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'partyModal') {
        const authorId = interaction.user.id;
        const context = getPartyContext(authorId);

        if (!context) {
          await interaction.reply({
            content: 'Session expired. Please run `/party` again.',
            ephemeral: true,
          });
          return;
        }

        const { selectedRoles, joinSet, proxyMap } = context;
        const fillQueue: FillQueue = new FillQueue();

        const partySize = parseInt(interaction.fields.getTextInputValue('partySize') || '0', 10);
        const startDelay = parseInt(interaction.fields.getTextInputValue('startTime') || '0', 10);
        const duration = parseInt(interaction.fields.getTextInputValue('duration') || '60', 10);

        if (isNaN(partySize) || partySize <= 0) {
          clearPartyContext(authorId);
          await interaction.reply({
            content: '❌ Invalid party size. Please enter a positive number.',
            ephemeral: true,
          });
          return;
        }

        const { content, components } = createPartySearchMsgUI(startDelay, duration, partySize, selectedRoles);
        const joinedSize = () => joinSet.size + proxyMap.size;

        const updatedPartyMsg = () => {
          const joined = convertIDsToMentions(joinSet, '\n', '> ');
          const fillers = convertIDsToMentions(new Set(fillQueue.getAll()), '\n', '> ');
          const proxies = convertProxiesToMentions(proxyMap) || ``;

          const allJoinedIds = joinedSize() > 0 ? `\n${joined}\n${proxies}`.trimEnd() : `None`;
          const fillerString = fillers.length > 0 ? `\n${fillers}` : `None`;

          const newContent =
            `${content}\n` +
            `> ✅ **Joined (${joinedSize()}/${partySize})**: ` +
            `${allJoinedIds}` +
            `\n> 🧩 **Fillers**: ${fillerString}`;
          return newContent;
        };

        await interaction.reply({
          content: updatedPartyMsg(),
          components,
          fetchReply: true,
        });

        const partySearchMsg = (await interaction.fetchReply()) as Message;

        await Promise.all([partySearchMsg.react('✅'), partySearchMsg.react('🧩')]);

        const handlePartyEnd = async () => {
          clearPartyContext(authorId);
          try {
            await partySearchMsg.reactions.removeAll();
            await partySearchMsg.delete();
          } catch {}
        };

        if (joinSet.size > 0) {
          if (joinSet.size >= partySize) {
            handlePartyEnd();
            await partySearchMsg.reply({
              content: `✅ The party is full!\nParty: ${convertIDsToMentions(joinSet)}`,
              components: [],
              allowedMentions: { users: Array.from(joinSet) },
            });
            return;
          }
          partySearchMsg.edit(updatedPartyMsg());
        }

        const durationInMs = duration * 60_000;

        const reactionCollector = partySearchMsg.createReactionCollector({
          time: durationInMs,
          dispose: true,
        });

        const userCollector = partySearchMsg.createMessageComponentCollector({
          componentType: ComponentType.UserSelect,
          time: durationInMs,
        });

        const buttonCollector = partySearchMsg.createMessageComponentCollector({
          filter: (i) => i.user.id === authorId,
          componentType: ComponentType.Button,
          time: durationInMs,
        });

        const handleFullParty = async () => {
          if (joinSet.size + proxyMap.size >= partySize) {
            buttonCollector.stop();
            userCollector.stop();
            reactionCollector.stop('full');
          } else if (joinSet.size + fillQueue.size() >= partySize) {
            await handleFillers(partySearchMsg, fillQueue, joinSet);
            await handleFullParty();
          }
        };

        reactionCollector.on('collect', async (reaction: MessageReaction, user: User) => {
          if (user.bot) return;

          const emoji = reaction.emoji.name;
          if (emoji === '✅') {
            joinSet.add(user.id);
            if (fillQueue.has(user.id)) {
              fillQueue.remove(user.id);
            }
          } else if (emoji === '🧩' && !joinSet.has(user.id) && !fillQueue.has(user.id)) {
            fillQueue.enqueue(user.id);
          }

          partySearchMsg.edit(updatedPartyMsg());
          await handleFullParty();
        });

        reactionCollector.on('remove', (reaction, user) => {
          if (user.bot) return;

          const emoji = reaction.emoji.name;
          if (emoji === '✅') {
            joinSet.delete(user.id);
            for (const [proxiedId, proxyId] of proxyMap.entries()) {
              if (proxyId === user.id) {
                proxyMap.delete(proxiedId);
              }
            }
          } else if (emoji === '🧩') {
            fillQueue.remove(user.id);
          }

          partySearchMsg.edit(updatedPartyMsg());
        });

        reactionCollector.on('end', async (_, reason) => {
          if (reason === 'full') {
            handlePartyEnd();

            const proxyMentions = proxyMap.size > 0 ? `, ${convertIDsToMentions(new Set(proxyMap.keys()), ', ')}` : ``;
            await partySearchMsg.reply({
              content: `✅ The party is full!\n${convertIDsToMentions(joinSet, ', ') + proxyMentions}`,
              components: [],
              allowedMentions: { users: Array.from(joinSet).concat(Array.from(proxyMap.keys())) },
            });
          } else {
            handlePartyEnd();
            try {
              await partySearchMsg.reply('⌛ Party search timed out.');
            } catch {}
          }
        });

        userCollector.on('collect', async (interaction: UserSelectMenuInteraction) => {
          if (interaction.customId === 'additionalUsers' && joinSet.has(interaction.user.id)) {
            const userIds = interaction.users.map((user: User) => user.id);
            handleProxyUpdate(interaction.user.id, userIds, proxyMap, joinSet);
            partySearchMsg.edit(updatedPartyMsg());
          }
          await handleFullParty();
          await interaction.deferUpdate();
        });

        buttonCollector.once('collect', async (buttonInteraction: ButtonInteraction) => {
          buttonInteraction.deferUpdate();
          handlePartyEnd();
          try {
            await partySearchMsg.reply('❌ Party has been cancelled.');
          } catch {}
          return;
        });
      }
    }
  },
};
