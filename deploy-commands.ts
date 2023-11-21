import { REST, Routes } from "discord.js";
import { CLIENT_ID, DEV_SERVER_ID, BOT_TOKEN } from "./config.json";
import { Command, commandList } from "./commands/command";

const rest = new REST().setToken(BOT_TOKEN);

(async () => {
  try {
    console.log(
      `Started refreshing ${commandList.length} application (/) commands.`
    );
    // Routes.applicationCommands(CLIENT_ID) -> Global commands route
    // Routes.applicationGuildCommands(CLIENT_ID, DEV_SERVER_ID) -> Server specific commands route
    const data = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, DEV_SERVER_ID),
      {
        body: commandList.map((command: Command) => {
          return command.data.toJSON();
        }),
      }
    );
    console.log(`Successfully reloaded ${data} application (/) commands.`);
  } catch (error) {
    console.error(error);
  }
})();
