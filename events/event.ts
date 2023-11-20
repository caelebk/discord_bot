import { Interaction } from "discord.js";
import myClient from "..";

export interface Event {
  name: string;
  once: boolean;
  execute: (client: myClient, interaction: Interaction) => void;
}
