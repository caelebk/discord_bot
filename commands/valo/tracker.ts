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

export const trackerCommand: Command = {
  data: new SlashCommandBuilder()
    .addStringOption((option) =>
      option
        .setName("user")
        .setDescription("The user + tag you want to find on tracker.gg")
        .setRequired(true)
    )
    .setName("tracker")
    .setDescription("Displays someone's valorant tracker."),
  async execute(client: myClient, interaction: CommandInteraction) {
    const baseUrl = "https://tracker.gg/valorant/profile/riot/";

    const userInput = interaction.options.get("user");
    let username: string = userInput?.value as string;
    username = username.trim().replace("#", "%23");
    const userUrl = `${baseUrl}${username}/overview`;

    await interaction.deferReply();
    let embeds: EmbedBuilder[] = [];

    try {
      embeds = await getUserEmbeds(userUrl);
    } catch (error) {
      const errorObject = error as Error;
      return interaction.editReply(errorObject.message);
    }

    if (embeds.length === 0) {
      return interaction.editReply("Failed to retrieve content.");
    } else {
      return interaction.editReply({ embeds: embeds });
    }
  },
};

async function getUserEmbeds(url: string): Promise<EmbedBuilder[]> {
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  const embeds: EmbedBuilder[] = [];
  const profile: ValorantProfile = parseProfile($);
  console.log(profile);
  return embeds;
}

function parseProfile($: cheerio.CheerioAPI): ValorantProfile {

  const userContainer = $(".ph__container");
  const userImage = userContainer.find(".user-avatar__image").attr("src");
  const userName = userContainer.find(".trn-ign__username").text();
  if (!userImage || isWhitespace(userImage)) {
    throw new Error("failed to find image");
  }

  const highlightContainer = $(".highlighted");
  const levelContainer = highlightContainer.find('.stat__label:contains("Level")').parent();
  const level = levelContainer.find('.stat__value').text().trim();

  const rankContainer = highlightContainer.find('.stat__label:contains("Rating")').parent();
  const rank = rankContainer.find('.stat__value').text().trim();
  const rankImage = highlightContainer.find(".trn-profile-highlighted-content__icon").attr("src");

  if (!rankImage) {
    throw new Error("failed to find image");
  }

  const valorantRank = {
    title: rank,
    imgUrl: rankImage,
    rr: "Information not provided.",
  };

  const statsContainer = $(".area-main-stats");
  const scoreContainer = statsContainer.find(".score__container");
  const score = scoreContainer.find(".value").contents().first().text().trim();
  const scoreImage = scoreContainer.find(".score__emblem").attr("src");

  if (!scoreImage) {
    throw new Error("failed to find image");
  }

  const giantStatsContainer = statsContainer.find(".giant-stats");
  const damagePerRoundContainer = giantStatsContainer.find('[title="Damage/Round"]').parent();
  const damagePerRound = damagePerRoundContainer.find(".value").text().trim();

  const kdContainer = giantStatsContainer.find('[title="K/D Ratio"]').parent();
  const KD = kdContainer.find(".value").text().trim();

  const headshotPercentContainer = giantStatsContainer.find('[title="Headshot %"]').parent();
  const headshotPercent = headshotPercentContainer.find(".value").text().trim();

  const winRateContainer = giantStatsContainer.find('[title="Win %"]').parent();
  const winRate = winRateContainer.find(".value").text().trim();

  const mainStatsContainer = statsContainer.find(".main");
  const kastContainer = mainStatsContainer.find('[title="KAST"]').parent();
  const KAST = kastContainer.find(".value").text().trim();

  const damageDeltaContainer = mainStatsContainer.find('[title="DDΔ/Round"]').parent();
  const ddPerRound = damageDeltaContainer.find(".value").text().trim();

  const acsContainer = mainStatsContainer.find('[title="ACS"]').parent();
  const ACS = acsContainer.find(".value").text().trim();

  const valorantStats = {
      trackerScore: Number(score),
      trackerImage: scoreImage,
      KAST: KAST,
      ACS: Number(ACS),
      damageDeltaPerRound: Number(ddPerRound),
      winRate: winRate,
      headshotPercent: headshotPercent,
      KD: Number(KD),
      ADR: Number(damagePerRound),
  } as ValorantStatistics;

  return {
    username: userName,
    level: Number(level),
    imgUrl: userImage,
    rank: valorantRank,
    stats: valorantStats,
  };
}

interface ValorantProfile {
  username: string;
  imgUrl: string;
  level: number;
  rank: ValorantRank;
  stats: ValorantStatistics;
}

interface ValorantStatistics {
  trackerScore: number;
  trackerImage: string;
  KAST: string;
  ACS: number;
  damageDeltaPerRound: number;
  winRate: string;
  headshotPercent: string;
  KD: number;
  ADR: number;
}

interface ValorantRank {
  title: string;
  imgUrl: string;
  rr?: string;
}
