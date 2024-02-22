import {
  CommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";
import { Command } from "../command";
import axios from "axios";
import * as cheerio from "cheerio";
import myClient from "../..";
import { isWhitespace } from "../../utility/string/stringUtility";

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
    username = username.trim().replace("#", "-").replace(" ", "%20");
    console.log(username);

    interaction.deferReply();
    const baseUrl = "https://op.gg/summoners/na/";
    scrape(baseUrl + username)
      .then((value: EmbedBuilder[]) => {
        interaction.editReply({ embeds: value });
      })
      .catch((reason: any) => {
        console.log(reason);
        const error = reason as Error;
        interaction.editReply(error.message);
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
  if (isWhitespace(profileName)) {
    throw new Error(
      "Profile not found or has a custom background that prevents me from parsing the profile."
    );
  }
  let profileLadder = profile.find(".rank").text();
  profileLadder =
    profileLadder.length > 0
      ? profileLadder.split("\n").slice(-2).join(" ").trim()
      : "Player has yet to play ranked.";
  const profileImage = profile.find(".profile-icon").find("img").attr("src");
  const profileLevel = profile.find("span[class='level']").text();
  const profileStats = {
    name: profileName,
    ladder: profileLadder,
    imgSrc: profileImage,
    level: profileLevel,
  } as Profile;
  console.log(profileStats);

  const profileEmbed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle(`${profileStats.name}`)
    .addFields(
      {
        name: "Level",
        value: profileStats.level,
        inline: true,
      },
      {
        name: "Ladder Rank",
        value: profileStats.ladder,
        inline: true,
      }
    )
    .setThumbnail(
      "https://i0.wp.com/log.op.gg/wp-content/uploads/2022/01/cropped-opgg_favicon.png?fit=512%2C512&ssl=1"
    );

  const embeds: EmbedBuilder[] = [profileEmbed];

  const rankedSoloClass = ".css-1kw4425";
  const rankedSoloStats = parseRankedStats(
    $,
    rankedSoloClass,
    "Ranked Solo/Duo"
  );
  console.log(rankedSoloStats);
  if (rankedSoloStats) {
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
    embeds.push(rankedSoloEmbed);
  }

  const rankedFlexStats = parseRankedStats($, ".css-1ialdhq", "Ranked Flex");
  console.log(rankedFlexStats);
  if (rankedFlexStats) {
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
    embeds.push(rankedFlexEmbed);
  }

  return embeds;
}

function parseRankedStats(
  $: cheerio.CheerioAPI,
  elementClass: string,
  title: string
): RankedStats | null {
  const rankHtml = $(elementClass);
  let rank = rankHtml.find(".tier").text();
  rank = rank.charAt(0).toUpperCase() + rank.slice(1);
  const lp = rankHtml.find(".lp").text();
  const winRate = rankHtml.find(".ratio").text().slice(-3);
  const winLoss = rankHtml.find(".win-lose").text();
  const imageSrc = rankHtml.find("img").attr("src");

  if (
    isWhitespace(rank) ||
    isWhitespace(lp) ||
    isWhitespace(winRate) ||
    isWhitespace(winLoss) ||
    imageSrc === null
  ) {
    return null;
  }
  return {
    title: title,
    rank: rank,
    lp: lp,
    winRate: winRate,
    winLoss: winLoss,
    imgSrc: imageSrc,
  } as RankedStats;
}

interface Profile {
  name: string;
  ladder: string;
  imgSrc: string;
  level: string;
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
