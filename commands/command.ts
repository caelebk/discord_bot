import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import myClient from "..";

export interface Command {
  data: SlashCommandBuilder;
  execute: (client: myClient, interaction: CommandInteraction) => void;
}
