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
    .addBooleanOption((option) =>
      option.setName("profile").setDescription("Include profile statistics?")
    )
    .addBooleanOption((option) =>
      option
        .setName("solo-duo")
        .setDescription("Include Ranked Solo/Duo statistics?")
    )
    .addBooleanOption((option) =>
      option.setName("flex").setDescription("Include Ranked Flex statistics?")
    )
    .setName("opgg")
    .setDescription("Displays someone's opgg."),
  async execute(client: myClient, interaction: CommandInteraction) {
    const baseUrl = "https://op.gg/summoners/na/";

    const userInput = interaction.options.get("user");
    let username: string = userInput?.value as string;
    username = username.trim().replace("#", "-").replace(" ", "%20");
    console.log(username);

    const includeProfileInput = interaction.options.get("profile")?.value !== undefined ? Boolean(interaction.options.get("profile")?.value) : true;
    const includeSoloDuoInput = interaction.options.get("solo-duo")?.value !== undefined ? Boolean(interaction.options.get("solo-duo")?.value) : true;
    const includeFlexInput = interaction.options.get("flex")?.value !== undefined ? Boolean(interaction.options.get("flex")?.value) : true;

    console.log(`${includeProfileInput} ${includeSoloDuoInput} ${includeFlexInput}`)
    const userUrl = baseUrl + username;
    interaction.deferReply();
    await getUser(
      userUrl,
      includeProfileInput,
      includeSoloDuoInput,
      includeFlexInput
    )
      .then((values: EmbedBuilder[]) => {
        if (values.length === 0) {
          interaction.editReply("Failed to retrieve content.");
        } else {
          interaction.editReply({ embeds: values });
        }
      })
      .catch((reason: any) => {
        console.log(reason);
        const error = reason as Error;
        interaction.editReply(error.message);
      });
  },
};

async function getUser(
  url: string,
  includeProfile: boolean,
  includeSoloDuo: boolean,
  includeFlex: boolean
): Promise<EmbedBuilder[]> {
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  const embeds: EmbedBuilder[] = [];
  const profileClass = ".css-1gadcid";
  const profileStats = parseProfile($, profileClass, url);
  const profileEmbed = createProfileEmbed(profileStats);
  console.log(profileStats);
  if (profileEmbed && includeProfile) {
    embeds.push(profileEmbed);
  }

  const rankedSoloClass = ".css-1kw4425";
  const rankedSoloTitle = "Ranked Solo/Duo";
  const rankedSoloStats = parseRankedStats($, rankedSoloClass, rankedSoloTitle);
  console.log(rankedSoloStats);
  if (rankedSoloStats && includeSoloDuo) {
    embeds.push(createRankedEmbed(profileStats, rankedSoloStats));
  }

  const rankedFlexClass = ".css-1ialdhq";
  const rankedFlexStats = parseRankedStats($, rankedFlexClass, "Ranked Flex");
  console.log(rankedFlexStats);
  if (rankedFlexStats && includeFlex) {
    embeds.push(createRankedEmbed(profileStats, rankedFlexStats));
  }

  return embeds;
}

function parseProfile(
  $: cheerio.CheerioAPI,
  elementClass: string,
  url: string
) {
  const profile = $(elementClass);
  const profileName = profile
    .find(".name")
    .clone()
    .find("style")
    .remove()
    .end()
    .text();
  let profileLadder = profile.find(".rank").text();
  if (profileLadder.length > 0) {
    profileLadder = profileLadder.split("\n").slice(-2).join(" ").trim();
  } else {
    profileLadder = "Player has yet to play ranked.";
  }
  const profileImage = profile.find(".profile-icon").find("img").attr("src");
  const profileLevel = profile.find("span[class='level']").text();

  if (isWhitespace(profileName)) {
    const msg = "Failed to parse profile.";
    throw new Error(msg);
  }

  return {
    name: profileName,
    ladder: profileLadder,
    imgSrc: profileImage,
    level: profileLevel,
    url: url,
  } as Profile;
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

function createProfileEmbed(profileStats: Profile) {
  const opggLogoUrl =
    "https://i0.wp.com/log.op.gg/wp-content/uploads/2022/01/cropped-opgg_favicon.png?fit=512%2C512&ssl=1";
  return new EmbedBuilder()
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
    .setURL(profileStats.url)
    .setThumbnail(opggLogoUrl);
}

function createRankedEmbed(profileStats: Profile, rankedStats: RankedStats) {
  return new EmbedBuilder()
    .setColor(0x0099ff)
    .setAuthor({
      name: profileStats.name,
      iconURL: profileStats.imgSrc,
      url: profileStats.url,
    })
    .setTitle(rankedStats.title)
    .setThumbnail(rankedStats.imgSrc)
    .addFields(
      {
        name: rankedStats.rank,
        value: rankedStats.lp,
        inline: true,
      },
      {
        name: "Win Rate",
        value: rankedStats.winRate,
        inline: true,
      },
      {
        name: "Win Loss",
        value: rankedStats.winLoss,
        inline: true,
      }
    );
}

interface Profile {
  name: string;
  ladder: string;
  imgSrc: string;
  level: string;
  url: string;
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
