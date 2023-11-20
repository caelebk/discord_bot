import { Events } from "discord.js";

export const readyEvent = {
  name: Events.ClientReady,
  once: true,
  execute(client: any) {
    console.log(`Ready! Logged in as ${client.user.tag}`);
  },
};
