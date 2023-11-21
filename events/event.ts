import { Interaction } from "discord.js";
import { readyEvent } from "./ready";
import myClient from "..";
import { interactionCreateEvent } from "./interactionCreate";

export interface Event {
  name: string;
  once: boolean;
  execute: (client: myClient, interaction: Interaction) => void;
}

export const eventList: Event[] = [readyEvent, interactionCreateEvent];
