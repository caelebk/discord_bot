import { Client, Collection, GatewayIntentBits } from "discord.js";
import { BOT_TOKEN } from "./config.json";
import { Command } from "./commands/command";
import { events } from "./events/eventList";

export default class myClient extends Client {
  commands: Collection<string, Command>;
  constructor(options: any) {
    super(options);
    this.commands = new Collection();
    this.loadCommands();
    this.loadEvents();
    console.log("Bot is online");
  }

  loadCommands() {}

  loadEvents() {
    for (const event of events) {
      if (event.once) {
        this.once(event.name, (client, interaction) =>
          event.execute(client, interaction)
        );
      } else {
        this.on(event.name, (client, interaction) =>
          event.execute(client, interaction)
        );
      }
    }
  }
}

const client = new myClient({ intents: [GatewayIntentBits.Guilds] });

client.login(BOT_TOKEN);
