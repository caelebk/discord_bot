import {
  CommandInteraction,
  SlashCommandBuilder,
  ComponentType,
  RoleSelectMenuInteraction,
  ButtonInteraction,
  InteractionResponse,
  InteractionReplyOptions,
  UserSelectMenuInteraction,
  User,
  Collection,
} from 'discord.js';
import { Command } from '../command';
import { createPartyModal, createPartyOptionsUI } from './partyUI';
import { getPartyContext, setPartyContext } from './partyContext';

//TODO:
// 1. proxies
// 2. user select state management
// 3. timer
// 4. fillers queue

export const partyCommand: Command = {
  data: new SlashCommandBuilder().setName('party').setDescription('Starts a party'),

  async execute(_, interaction: CommandInteraction) {
    const authorId = interaction.user.id;

    if (getPartyContext(interaction?.user?.id)) {
      try {
        await interaction.reply({
          content: '❌ Party search already in progress.',
          ephemeral: true,
        });
      } catch {}
      return;
    }

    const selectedRoles: string[] = [];
    const joinSet: Set<string> = new Set<string>([]);
    const proxyMap: Map<string, string> = new Map<string, string>();

    const partyComponents = createPartyOptionsUI();
    const partyOptions: InteractionReplyOptions = {
      components: partyComponents,
      ephemeral: true,
    };

    const partyInitMsg: InteractionResponse = await interaction.reply(partyOptions);

    const roleCollector = partyInitMsg.createMessageComponentCollector({
      filter: (i) => i.user.id === authorId,
      componentType: ComponentType.RoleSelect,
      time: 60_000, // 1 minute in milliseconds
    });

    const buttonCollector = partyInitMsg.createMessageComponentCollector({
      filter: (i) => i.user.id === authorId,
      componentType: ComponentType.Button,
      time: 60_000,
    });

    const userCollector = partyInitMsg.createMessageComponentCollector({
      filter: (i) => i.user.id === authorId,
      componentType: ComponentType.UserSelect,
      time: 60_000,
    });

    userCollector.on('collect', async (interaction: UserSelectMenuInteraction) => {
      if (interaction.customId === 'includedUsers') {
        const userIds = interaction.users.map((user) => user.id);
        handleProxyUpdate(authorId, userIds, proxyMap, joinSet);
      }
      await interaction.deferUpdate();
    });

    //Subscription for handling when users select one or more roles.
    roleCollector.on('collect', (interaction: RoleSelectMenuInteraction) => {
      interaction.deferUpdate();
      selectedRoles.splice(0, selectedRoles.length, ...interaction.values);
      if (selectedRoles.length > 0) {
        partyOptions.components = createPartyOptionsUI(false);
      } else {
        partyOptions.components = createPartyOptionsUI(true);
      }
      partyInitMsg.edit(partyOptions);
    });

    //Subscription for handling when role collection times out.
    roleCollector.on('end', async (_, reason: string) => {
      if (reason !== 'user') {
        await partyInitMsg.edit({
          content: '⌛ Role selection has timed out.',
          components: [],
        });
      }
    });

    //Subscription for handling when either the cancel/confirm button has been selected.
    buttonCollector.once('collect', async (buttonInteraction: ButtonInteraction) => {
      roleCollector.stop();
      userCollector.stop();
      buttonCollector.stop();

      try {
        await partyInitMsg.delete();
      } catch {}

      if (buttonInteraction.customId === 'cancelRoles') {
        buttonInteraction.reply({
          content: '❌ Party search has been cancelled.',
          ephemeral: true,
        });
        return;
      }

      joinSet.add(authorId);
      setPartyContext(authorId, {
        selectedRoles,
        joinSet,
        proxyMap,
      });

      await createPartyModal(buttonInteraction);
    });
  },
};

export function convertIDsToMentions(users: Set<string>, separator: string = `\n`): string {
  return [...users].map((id) => `<@${id}>`).join(separator);
}

export function convertProxiesToMentions(proxyMap: Map<string, string>): string {
  let proxySummary = '';
  for (const [proxiedId, proxyId] of proxyMap.entries()) {
    proxySummary += `<@${proxiedId}> (added by <@${proxyId}>)\n`;
  }
  return proxySummary;
}

export function handleProxyUpdate(
  authorId: string,
  userIds: string[],
  proxyMap: Map<string, string>,
  joinSet: Set<string>
) {
  for (const [proxiedId, proxyId] of proxyMap.entries()) {
    if (proxyId === authorId && !userIds.includes(proxiedId)) {
      proxyMap.delete(proxiedId);
    }
  }
  userIds.forEach((userId: string) => {
    if (userId === authorId) {
      return;
    }
    if (!proxyMap.has(userId) && !joinSet.has(userId)) {
      proxyMap.set(userId, authorId);
    }
  });
}
