const axios = require("axios");
const cheerio = require("cheerio");
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("opgg")
    .setDescription("Finds OPGG statistics.")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("The username to find.")
        .setRequired(true)
    ),
  async execute(interaction) {
    const baseUrl = "https://op.gg/summoners/na/";
    const user = interaction.options.getString("username");
    scrape(baseUrl + user, interaction);
  },
};

async function scrape(url, interaction) {
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  let content = $('meta[name="description"]').attr("content");
  let stats = content.split("/");
  console.log(stats);
  for (let x = 0; x < stats.length; x++) {
    stats[x] = stats[x].trim();
  }
  //console.log(stats);

  if (stats.length <= 1) {
    interaction.reply("User doesn't exist.");
    return;
  }

  interaction.reply(createStatisticsString(stats));
}

function createStatisticsString(stats) {
  if (stats.length < 4) {
    return (
      "**Name: **" + stats[0] + "\n**Level: **" + stats[2] + "\nNo Stats Found."
    );
  }

  let msg = createNameString(stats[0]);
  msg += createRankString(stats[1]);
  msg += createWinRateString(stats[2]);
  msg += createChampsString(stats[3]);
  return msg;
}

function createNameString(name) {
  return `**Name:** ${name}\n`;
}

function createRankString(rank) {
  const rankinfo = rank.split(" ");
  if (rankinfo.length < 3) {
    return `**Rank:** ${rankinfo[0]} ${rankinfo[1]}\n`;
  } else {
    return `**Rank:** ${rankinfo[0]} ${rankinfo[1]} | ${rankinfo[2]}\n`;
  }
}

function createWinRateString(winrate) {
  const ratio = winrate.split(" ");
  return `**Win Rate:** ${ratio[4]} |  ${ratio[0].replace(
    "Win",
    "W"
  )}  -  ${ratio[1].replace("Lose", "L")}\n`;
}

function createChampsString(champs) {
  const champinfo = champs.split(",");
  let msg = "**Most Played Champions:**\n**--------------------------**";
  for (var x = 0; x < champinfo.length; x++) {
    msg += "\n" + champinfo[x].trim().replace("Win", "W").replace("Lose", "L");
  }
  return msg + "\n";
}
