import {
  CommandInteraction,
  SlashCommandBuilder,
  MessageComponentInteraction,
  ComponentType,
  RoleSelectMenuInteraction,
  ButtonInteraction,
  InteractionResponse,
  InteractionReplyOptions,
  User,
  UserSelectMenuInteraction,
} from 'discord.js';
import { Command } from '../command';
import { createPartyModal, createPartyOptionsUI } from './partyUI';
import { getPartyContext, setPartyContext } from './partyContext';

export const partyCommand: Command = {
  data: new SlashCommandBuilder().setName('party').setDescription('Starts a party'),

  async execute(_, interaction: CommandInteraction) {
    if (getPartyContext(interaction?.user?.id)) {
      try {
        await interaction.reply({
          content: 'Party search already in progress.',
          ephemeral: true,
        });
      } catch {}
    }

    const selectedRoles: string[] = [];
    const joinSet: Set<string> = new Set<string>([]);

    const partyComponents = createPartyOptionsUI();
    const partyOptions: InteractionReplyOptions = {
      components: partyComponents,
      ephemeral: true,
    };

    const partyInitMsg: InteractionResponse = await interaction.reply(partyOptions);

    const userFilter = (i: MessageComponentInteraction) => i.user.id === interaction.user.id;

    //filter for only current user's interactions for the party options
    const roleCollector = partyInitMsg.createMessageComponentCollector({
      filter: userFilter,
      componentType: ComponentType.RoleSelect,
      time: 60_000, // 1 minute in milliseconds
    });

    const buttonCollector = partyInitMsg.createMessageComponentCollector({
      filter: userFilter,
      componentType: ComponentType.Button,
      time: 60_000,
    });

    const userCollector = partyInitMsg.createMessageComponentCollector({
      filter: userFilter,
      componentType: ComponentType.UserSelect,
      time: 60_000,
    });

    userCollector.on('collect', async (interaction: UserSelectMenuInteraction) => {
      interaction.deferUpdate();
      if (interaction?.users?.values)
        for (const user of interaction.users.values()) {
          joinSet.add(user.id);
        }
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
          content: 'Role Selection has timed out.',
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
          content: 'Party has been cancelled.',
          ephemeral: true,
        });
        return;
      }

      joinSet.add(interaction.user.id);
      //store context by user ID of party creator
      setPartyContext(interaction.user.id, {
        selectedRoles: [...selectedRoles],
        joinSet: joinSet,
      });

      await createPartyModal(buttonInteraction);
    });
  },
};

export function convertIDsToMentions(users: Set<string>): string {
  return [...users].map((id) => `<@${id}>`).join(', ');
}
