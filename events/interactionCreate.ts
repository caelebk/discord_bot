import { Events, BaseInteraction, CommandInteraction } from "discord.js";
import myClient from "..";
import { Command } from "../commands/command";

export const interactionCreateEvent = {
  name: Events.InteractionCreate,
  once: false,
  execute(client: myClient, interaction: BaseInteraction) {
    if (!interaction.isChatInputCommand()) return;
    const chatInteraction = interaction as CommandInteraction;

    const command: Command | undefined = client?.commands?.get(
      chatInteraction.commandName
    );

    if (!command) {
      console.error(
        `No command matching ${chatInteraction.commandName} was found.`
      );
      return;
    }

    try {
      command.execute(client, chatInteraction);
    } catch (error) {
      console.error(`Error executing ${chatInteraction.commandName}`);
      console.error(error);
    }
  },
};
