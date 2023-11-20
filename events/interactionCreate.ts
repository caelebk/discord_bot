import { Events, Interaction } from "discord.js";
import myClient from "..";
import { Command } from "../commands/command";

export const interactionCreateEvent = {
  name: Events.InteractionCreate,
  execute(client: myClient, interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command: Command | undefined = client.commands.get(
      interaction.commandName
    );

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`
      );
      return;
    }

    try {
      command.execute(client, interaction);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}`);
      console.error(error);
    }
  },
};
