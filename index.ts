import { Client, Collection, GatewayIntentBits } from "discord.js";
import { BOT_TOKEN } from "./config.json";
import { Command } from "./commands/command";
import { eventList } from "./events/event";
import { commandList } from "./commands/command";

export default class myClient extends Client {
  commands: Collection<string, Command>;
  constructor(options: any) {
    super(options);
    this.commands = new Collection();
    this.loadCommands();
    this.loadEvents();
  }

  loadCommands() {
    for (const command of commandList) {
      this.commands.set(command.data.name, command);
    }
  }

  loadEvents() {
    for (const event of eventList) {
      if (event.once) {
        this.once(event.name, (interaction) =>
          event.execute(this, interaction)
        );
      } else {
        this.on(event.name, (interaction) => event.execute(this, interaction));
      }
    }
  }
}

const client = new myClient({ intents: [GatewayIntentBits.Guilds] });

client.login(BOT_TOKEN);
