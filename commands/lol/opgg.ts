import {
  CommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";
import { Command } from "../command";
import axios from "axios";
import * as cheerio from "cheerio";
import myClient from "../..";

export const opggCommand: Command = {
  data: new SlashCommandBuilder()
    .addStringOption((option) =>
      option
        .setName("user")
        .setDescription("The user + tag you want to find on OP.GG")
        .setRequired(true)
    )
    .setName("opgg")
    .setDescription("Displays someone's opgg."),
  async execute(client: myClient, interaction: CommandInteraction) {
    const input = interaction.options.get("user");
    let username: string = input?.value as string;
    username = username.replace("#", "-");
    const baseUrl = "https://op.gg/summoners/na/";
    scrape(baseUrl + username)
      .then((value: EmbedBuilder[]) => {
        interaction.reply({ embeds: value });
      })
      .catch((reason: any) => {
        // interaction.reply("User was not found.");
        console.log(reason);
      });
  },
};
async function scrape(url: string): Promise<EmbedBuilder[]> {
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  const profile = $(".css-1gadcid");
  const profileName = profile
    .find(".name")
    .clone()
    .find("style")
    .remove()
    .end()
    .text();
  let profileLadder = profile.find(".rank").text();
  profileLadder = profileLadder.split("\n").slice(-2).join(" ").trim();
  const profileImage = profile.find(".profile-icon").find("img").attr("src");

  const profileStats = {
    name: profileName,
    ladder: profileLadder,
    imgSrc: profileImage,
  } as Profile;

  console.log(profileStats);

  const rankedSolo = $(".css-1kw4425");
  let rankedSoloRank = rankedSolo.find(".tier").text();
  rankedSoloRank =
    rankedSoloRank.charAt(0).toUpperCase() + rankedSoloRank.slice(1);
  const rankedSoloLP = rankedSolo.find(".lp").text();
  const rankedSoloWinRate = rankedSolo.find(".ratio").text().slice(-3);
  const rankedSoloWinLoss = rankedSolo.find(".win-lose").text();
  const rankedSoloImage = rankedSolo.find("img").attr("src");

  const rankedSoloStats = {
    title: "Ranked Solo/Duo",
    rank: rankedSoloRank,
    lp: rankedSoloLP,
    winRate: rankedSoloWinRate,
    winLoss: rankedSoloWinLoss,
    imgSrc: rankedSoloImage,
  } as RankedStats;
  console.log(rankedSoloStats);

  const rankedFlex = $(".css-1ialdhq");
  let rankedFlexRank = rankedFlex.find(".tier").text();
  rankedFlexRank =
    rankedFlexRank.charAt(0).toUpperCase() + rankedFlexRank.slice(1);
  const rankedFlexLP = rankedFlex.find(".lp").text();
  const rankedFlexWinRate = rankedFlex.find(".ratio").text().slice(-3);
  const rankedFlexWinLoss = rankedFlex.find(".win-lose").text();
  const rankedFlexImage = rankedFlex.find("img").attr("src");

  const rankedFlexStats = {
    title: "Ranked Flex",
    rank: rankedFlexRank,
    lp: rankedFlexLP,
    winRate: rankedFlexWinRate,
    winLoss: rankedFlexWinLoss,
    imgSrc: rankedFlexImage,
  } as RankedStats;
  console.log(rankedFlexStats);

  const profileEmbed = new EmbedBuilder()
    .setColor(0x0099ff)

    .setTitle(`${profileStats.name}`)
    .setURL(url)
    .addFields({
      name: "Ladder Rank",
      value: profileStats.ladder,
    })
    .setThumbnail(
      "https://i0.wp.com/log.op.gg/wp-content/uploads/2022/01/cropped-opgg_favicon.png?fit=512%2C512&ssl=1"
    );
  //https://s-lol-web.op.gg/images/reverse.rectangle.png
  //https://i0.wp.com/log.op.gg/wp-content/uploads/2022/01/cropped-opgg_favicon.png?fit=512%2C512&ssl=1

  const rankedSoloEmbed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setAuthor({
      name: profileStats.name,
      iconURL: profileStats.imgSrc,
      url: url,
    })
    .setTitle(rankedSoloStats.title)
    .setThumbnail(rankedSoloStats.imgSrc)
    .addFields(
      {
        name: rankedSoloStats.rank,
        value: rankedSoloStats.lp,
        inline: true,
      },
      {
        name: "Win Rate",
        value: rankedSoloStats.winRate,
        inline: true,
      },
      {
        name: "Win Loss",
        value: rankedSoloStats.winLoss,
        inline: true,
      }
    );

  const rankedFlexEmbed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setAuthor({
      name: profileStats.name,
      iconURL: profileStats.imgSrc,
      url: url,
    })
    .setTitle(rankedFlexStats.title)
    .setThumbnail(rankedFlexStats.imgSrc)
    .addFields(
      {
        name: rankedFlexStats.rank,
        value: rankedFlexStats.lp,
        inline: true,
      },
      {
        name: "Win Rate",
        value: rankedFlexStats.winRate,
        inline: true,
      },
      {
        name: "Win Loss",
        value: rankedFlexStats.winLoss,
        inline: true,
      }
    );

  return [profileEmbed, rankedSoloEmbed, rankedFlexEmbed];
}

async function oldScraper(url: string) {
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  const summary = $('meta[name="description"]').attr("content");

  const stats = summary?.split("/");

  if (!stats) {
    return "Failed to find stats.";
  }

  for (let x = 0; x < stats.length; x++) {
    stats[x] = stats[x].trim();
  }

  if (stats.length <= 1) {
    return "User was not found.";
  }

  return createStatisticsString(stats);
}

function createStatisticsString(stats: string[]) {
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

function createNameString(name: string) {
  return `**Name:** ${name}\n`;
}

function createRankString(rank: string) {
  const rankinfo = rank.split(" ");
  if (rankinfo.length < 3) {
    return `**Rank:** ${rankinfo[0]} ${rankinfo[1]}\n`;
  } else {
    return `**Rank:** ${rankinfo[0]} ${rankinfo[1]} | ${rankinfo[2]}\n`;
  }
}

function createWinRateString(winRate: string) {
  const ratio = winRate.split(" ");
  return `**Win Rate:** ${ratio[4]} |  ${ratio[0].replace(
    "Win",
    "W"
  )}  -  ${ratio[1].replace("Lose", "L")}\n`;
}

function createChampsString(champs: string) {
  const champinfo = champs.split(",");
  let msg = "**Most Played Champions:**\n**--------------------------**";
  for (var x = 0; x < champinfo.length; x++) {
    msg += "\n" + champinfo[x].trim().replace("Win", "W").replace("Lose", "L");
  }
  return msg + "\n";
}
interface Profile {
  name: string;
  ladder: string;
  imgSrc: string;
}

interface RankedStats {
  title: string;
  rank: string;
  lp: string;
  winRate: string;
  winLoss: string;
  imgSrc: string;
}

interface Champion {
  name: string;
  wins: number;
  losses: number;
  winRate: number;
  kda: string;
  numberPlayed: number;
  imgSrc: string;
  csTotalAverage: number;
  csPerMinAverage: number;
}
