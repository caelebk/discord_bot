import {
  CommandInteraction,
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  RoleSelectMenuBuilder,
  MessageComponentInteraction,
  ComponentType,
  RoleSelectMenuInteraction,
  ButtonInteraction,
  InteractionResponse,
  APIActionRowComponent,
  APIMessageActionRowComponent,
  InteractionReplyOptions,
  Message,
  MessageReaction,
  User,
} from "discord.js";
import { Command } from "../command";
import myClient from "../..";

export const partyCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("party")
    .setDescription("Starts a party"),

  async execute(client: myClient, interaction: CommandInteraction) {
    const selectedRoles: string[] = [];
    const usersInParty: Set<User> = new Set<User>([]);

    const partyComponents = createPartyOptionsUI();
    const partyOptions: InteractionReplyOptions = {
      content: `Party options:\n\nStart Time: 2 hours from now\nTimeout: 1 hour\n\nSelect Roles:`,
      components: partyComponents,
      ephemeral: true,
    };

    const partyInitMsg: InteractionResponse = await interaction.reply(
      partyOptions
    );

    const userFilter = (i: MessageComponentInteraction) =>
      i.user.id === interaction.user.id;

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

    roleCollector.on("collect", (interaction: RoleSelectMenuInteraction) => {
      interaction.deferUpdate();
      selectedRoles.splice(0, selectedRoles.length, ...interaction.values);
      if (selectedRoles.length > 0) {
        partyOptions.components = createPartyOptionsUI(false);
      } else {
        partyOptions.components = createPartyOptionsUI(true);
      }
      partyInitMsg.edit(partyOptions);
    });

    buttonCollector.once(
      "collect",
      async (buttonInteraction: ButtonInteraction) => {
        roleCollector.stop();
        buttonCollector.stop();
        const mentionedRoleIds: string[] = selectedRoles.map(
          (id: string) => `<@&${id}>`
        );

        await partyInitMsg.delete();
        const partyStatusOptions: InteractionReplyOptions = handlePartySubmit(
          buttonInteraction,
          mentionedRoleIds,
          usersInParty
        );
        const partyStatusMsg: InteractionResponse =
          await buttonInteraction.reply(partyStatusOptions);
        if (!partyStatusOptions.ephemeral) {
          await handleReactions(partyStatusMsg, usersInParty, mentionedRoleIds);
        }
      }
    );

    roleCollector.on("end", async (_, reason: string) => {
      if (reason !== "user") {
        try {
          await partyInitMsg.delete();
        } catch {}
        interaction.followUp({
          content: "Party setup has timed out.",
          ephemeral: true,
        });
      }
    });
  },
};

/*
    Mesage component creator function for better readability.
*/
function createPartyOptionsUI(
  disabled: boolean = true
): APIActionRowComponent<APIMessageActionRowComponent>[] {
  const confirm = new ButtonBuilder()
    .setCustomId("confirm")
    .setLabel("Confirm")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(disabled);
  const cancel = new ButtonBuilder()
    .setCustomId("cancel")
    .setLabel("Cancel")
    .setStyle(ButtonStyle.Secondary);
  const roleSelect = new RoleSelectMenuBuilder()
    .setCustomId("users")
    .setPlaceholder("Select multiple roles.")
    .setMinValues(0)
    .setMaxValues(5);

  const buttonRow: APIActionRowComponent<APIMessageActionRowComponent> =
    new ActionRowBuilder<ButtonBuilder>()
      .addComponents(cancel, confirm)
      .toJSON();
  const roleRow: APIActionRowComponent<APIMessageActionRowComponent> =
    new ActionRowBuilder<RoleSelectMenuBuilder>()
      .addComponents(roleSelect)
      .toJSON();

  return [roleRow, buttonRow];
}

/*
    Party options interaction handler.
*/
function handlePartySubmit(
  buttonInteraction: ButtonInteraction,
  mentionedRoleIds: string[],
  usersInParty: Set<User>
) {
  let message: InteractionReplyOptions;
  if (buttonInteraction.customId === "confirm") {
    usersInParty.add(buttonInteraction.user);
    message = {
      content: `${getUserNames(
        usersInParty
      )} in a party for ${mentionedRoleIds}.`,
    };
  } else {
    message = {
      content: "Party has been cancelled.",
      ephemeral: true,
    };
  }
  return message;
}

async function handleReactions(
  partyStatusResponse: InteractionResponse,
  usersInParty: Set<User>,
  mentionedRoleIds: string[]
) {
  console.log(usersInParty);
  const partyStatusMessage: Message = await partyStatusResponse.fetch();
  const collectorFilter = (reaction: MessageReaction, user: User) =>
    !user.bot && reaction.emoji.name === "🔼";
  partyStatusMessage.react("🔼");
  const partyReactionCollector = partyStatusMessage.createReactionCollector({
    filter: collectorFilter,
    maxUsers: 5,
    time: 120_000,
    dispose: true,
  });
  partyReactionCollector.on(
    "collect",
    (reaction: MessageReaction, user: User) => {
      console.log(`Collected ${reaction.emoji.name} from ${user.tag}`);
      usersInParty.add(user);
      partyStatusResponse.edit(
        `${getUserNames(usersInParty)} in a party for ${mentionedRoleIds}.`
      );
    }
  );
  partyReactionCollector.on(
    "remove",
    (reaction: MessageReaction, user: User) => {
      console.log(`Removed ${reaction.emoji.name} from ${user.tag}`);
      usersInParty.delete(user);
      partyStatusResponse.edit(
        `${getUserNames(usersInParty)} in a party for ${mentionedRoleIds}.`
      );
    }
  );

  partyReactionCollector.on("end", (collected) => {
    console.log(`Collected ${collected.size} items`);
  });
  return partyReactionCollector;
}

function getUserNames(users: Set<User>) {
  const userList = Array.from(users);
  return userList.map((user: User) => user.displayName);
}
