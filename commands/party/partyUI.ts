import {
  ActionRowBuilder,
  APIActionRowComponent,
  APIMessageActionRowComponent,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ModalBuilder,
  RoleSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} from 'discord.js';

export async function createPartyModal(interaction: ButtonInteraction) {
  const modal = new ModalBuilder().setCustomId('partyModal').setTitle('Create a Party');

  const partySizeInput = new TextInputBuilder()
    .setCustomId('partySize')
    .setLabel('Party Size')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. 5')
    .setRequired(true);

  const durationInput = new TextInputBuilder()
    .setCustomId('duration')
    .setLabel('Duration (minutes)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. 60 = 1 hour, default is 60 min')
    .setRequired(false);

  const startTimeInput = new TextInputBuilder()
    .setCustomId('startTime')
    .setLabel('Start Delay (minutes from now)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. 15 = play in 15 min, default is now')
    .setRequired(false);

  //nice to have? A checkbox for a reminder 5 minute before start time.

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(partySizeInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(durationInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(startTimeInput)
  );

  await interaction.showModal(modal);
}

export function createPartyOptionsUI(disabled: boolean = true): APIActionRowComponent<APIMessageActionRowComponent>[] {
  const confirm = new ButtonBuilder()
    .setCustomId('confirmRoles')
    .setLabel('Confirm')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(disabled);

  const cancel = new ButtonBuilder().setCustomId('cancelRoles').setLabel('Cancel').setStyle(ButtonStyle.Secondary);

  const roleSelect = new RoleSelectMenuBuilder()
    .setCustomId('roles')
    .setPlaceholder('Select roles to notify.')
    .setMinValues(0)
    .setMaxValues(5);

  const userSelect = new UserSelectMenuBuilder()
    .setCustomId('includedUsers')
    .setPlaceholder('(Optional) Select users to include.')
    .setMinValues(0)
    .setMaxValues(10);

  const buttonRow: APIActionRowComponent<APIMessageActionRowComponent> = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(cancel, confirm)
    .toJSON();
  const roleRow: APIActionRowComponent<APIMessageActionRowComponent> = new ActionRowBuilder<RoleSelectMenuBuilder>()
    .addComponents(roleSelect)
    .toJSON();
  const userRow: APIActionRowComponent<APIMessageActionRowComponent> = new ActionRowBuilder<UserSelectMenuBuilder>()
    .addComponents(userSelect)
    .toJSON();

  return [roleRow, userRow, buttonRow];
}

export function createPartySearchMsgUI(
  startDelay: number,
  duration: number,
  partySize: number,
  selectedRoles: string[]
) {
  const partyTime = Date.now() + (startDelay || 0) * 60_000;
  const discordStartTime = `<t:${Math.floor(partyTime / 1000)}:R>`; // Discord timestamp formatting

  const endTime = Date.now() + (duration || 60) * 60_000;
  const discordEndTime = `<t:${Math.floor(endTime / 1000)}:R>`; // Discord timestamp formatting

  const roleMentions: string[] = selectedRoles.map((id: string) => `<@&${id}>`);

  const description =
    `Looking for ${roleMentions}\n` +
    `> 👥 **${partySize} players**\n` +
    `> ⏳ **Start Time: **${
      startDelay ? `${new Date(partyTime).toLocaleTimeString().slice(0, -6)}` : 'now'
    } (${discordStartTime})\n` +
    `> ⌛ **End Time: **${discordEndTime}`;
  const cancelButton = new ButtonBuilder().setCustomId('cancelParty').setLabel('Cancel').setStyle(ButtonStyle.Danger);
  const userSelect = new UserSelectMenuBuilder()
    .setCustomId('additionalUsers')
    .setPlaceholder('(Optional) Select additional users to include.')
    .setMinValues(0)
    .setMaxValues(partySize);

  const userSelectRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect);
  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(cancelButton);

  return {
    content: description,
    components: [userSelectRow, buttonRow],
  };
}
