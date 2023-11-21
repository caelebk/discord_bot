import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { serverCommand } from "./info/server";
import myClient from "..";

export interface Command {
  data: SlashCommandBuilder;
  execute: (client: myClient, interaction: CommandInteraction) => void;
}

export const commandList: Command[] = [serverCommand];
