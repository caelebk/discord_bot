# Discord Bot (Discord.js v14)

- should probably come up with a name other than discord bot

- Porting over previous discord bot (discord.js v12) to be supported on discord.js (v14)
- Node.js 18.13.0

- npm v8.1.0

## Current Features

### Message management

- Clear messages.

### League of Legends

- Opgg search

## Features in the future

### Party

- Users can start a party by selecting a role, number of players, starting time, and timeout.
  - Bot will mention the selected role with the number of players with the specified time, and the message will live until the timeout.
  - Users can join the party by selecting the join button. Message will increment on each join.
  - at 20% of time left, the bot will send another mention with the remaining time.
  - at full party, the bot will mention all the users in the party.
  - at timeout, boot will call a not enough players.
