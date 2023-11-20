const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Clears all bot messages."),
  async execute(interaction) {
    interaction.channel.messages
      .fetch()
      .then((messages) =>
        interaction.channel.bulkDelete(
          messages.filter((m) => m.author.bot),
          true
        )
      )
      .catch((err) => {
        message.channel.send("Not enough permission to clear.");
        console.log(err);
      });
    await interaction.reply("Cleared all messages!");
  },
};
