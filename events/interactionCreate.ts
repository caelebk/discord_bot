import {
  Events,
  BaseInteraction,
  CommandInteraction,
  Message,
  ComponentType,
  ButtonInteraction,
  MessageReaction,
  User,
} from 'discord.js';
import myClient from '..';
import { Command } from '../commands/command';
import { clearPartyContext, getPartyContext } from '../commands/party/partyContext';
import { createPartySearchMsgUI } from '../commands/party/partyUI';
import { convertIDsToMentions } from '../commands/party/party';

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

        const { selectedRoles, joinSet } = context;
        const fillSet = new Set<string>();

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

        const updatedPartyMsg = () => {
          const joined = convertIDsToMentions(joinSet) || 'None';
          const fillers = convertIDsToMentions(fillSet) || 'None';
          const newContent =
            `${content}\n` +
            `> ✅ **Joined (${joinSet.size}/${partySize})**: ${joined}\n` +
            `> 🧩 **Fillers**: ${fillers}\n` +
            `React with ✅ to join/leave or 🧩 to fill/unfill.\nFor multiple users, use the dropdown:`;
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

        reactionCollector.on('collect', (reaction: MessageReaction, user: User) => {
          if (user.bot) return;

          const emoji = reaction.emoji.name;
          if (emoji === '✅') {
            joinSet.add(user.id);
            fillSet.delete(user.id);
          } else if (emoji === '🧩' && !joinSet.has(user.id)) {
            fillSet.add(user.id);
          }

          partySearchMsg.edit(updatedPartyMsg());

          if (joinSet.size >= partySize) {
            buttonCollector.stop();
            reactionCollector.stop('full');
          }
        });

        reactionCollector.on('remove', (reaction, user) => {
          if (user.bot) return;

          const emoji = reaction.emoji.name;
          if (emoji === '✅') {
            joinSet.delete(user.id);
          } else if (emoji === '🧩') {
            fillSet.delete(user.id);
          }

          partySearchMsg.edit(updatedPartyMsg());
        });

        reactionCollector.on('end', async (_, reason) => {
          if (reason === 'full') {
            handlePartyEnd();
            await partySearchMsg.reply({
              content: `✅ The party is full!\nParty: ${convertIDsToMentions(joinSet)}`,
              components: [],
              allowedMentions: { users: Array.from(joinSet) },
            });
          } else {
            if (reason != 'cancelButton') {
              handlePartyEnd();
              partySearchMsg.reply('⌛ Party search timed out.');
            }
          }
        });

        const buttonCollector = partySearchMsg.createMessageComponentCollector({
          filter: (i) => i.user.id === authorId,
          componentType: ComponentType.Button,
          time: durationInMs,
        });

        buttonCollector.once('collect', async (buttonInteraction: ButtonInteraction) => {
          buttonInteraction.deferUpdate();
          handlePartyEnd();
          try {
            await partySearchMsg.reply('❌ Party has been cancelled.');
          } catch {}
          buttonCollector.stop();
          reactionCollector.stop('cancelButton');
          return;
        });
      }
    }
  },
};
