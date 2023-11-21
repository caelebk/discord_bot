import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../command";
import myClient from "../..";

export const serverCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("server")
    .setDescription("Provides information about the server."),
  async execute(client: myClient, interaction: CommandInteraction) {
    // interaction.guild is the object representing the Guild in which the command was run
    await interaction.reply(
      `This server is ${interaction?.guild?.name} and has ${interaction?.guild?.memberCount} members.`
    );
  },
};