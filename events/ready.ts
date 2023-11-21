import { Events, BaseInteraction } from "discord.js";
import myClient from "..";

export const readyEvent = {
  name: Events.ClientReady,
  once: true,
  execute(client: myClient, interaction: BaseInteraction) {
    console.log(`Ready! Logged in as ${client?.user?.tag}`);
  },
};
