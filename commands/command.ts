import myClient from "..";
import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { serverCommand } from "./info/server";
import { partyCommand } from "./party/party";

export interface Command {
  data: SlashCommandBuilder;
  execute: (client: myClient, interaction: CommandInteraction) => void;
}

export const commandList: Command[] = [serverCommand, partyCommand];
