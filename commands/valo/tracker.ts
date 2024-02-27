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
  return embeds;
}

function parseProfile($: cheerio.CheerioAPI): ValorantProfile {

  const userContainer = $(".ph__container");
  const userImage = userContainer.find(".user-avatar__image").attr("src");
  const userName = userContainer.find("trn-ign__username").text();
  if (!userImage || isWhitespace(userImage)) {
    throw new Error("failed");
  }

  const valorantStats = {
      trackerScore: 2,
      KAST: 2,
      ACS: 2,
      damageDeltaPerRound: 2,
      roundWinRate: 2,
      headshotPercent: 2,
      KD: 2,
      ADR: 2,
  };

  const valorantRank = {
    title: "",
    imgUrl: "",
    rr: "",
  };

  const valorantMatchHistory = {
    winRate: 2,
    wins: 2,
    losses: 2
  }
  console.log(userImage);
  return {
    username: userName,
    imgUrl: userImage,
    rank: valorantRank,
    stats: valorantStats,
    matchHistory: valorantMatchHistory
  };
}

interface ValorantProfile {
  username: string;
  imgUrl: string;
  rank: ValorantRank;
  stats: ValorantStatistics;
  matchHistory: ValorantMatchHistory;
}

interface ValorantStatistics {
  trackerScore: number;
  KAST: number;
  ACS: number;
  damageDeltaPerRound: number;
  roundWinRate: number;
  headshotPercent: number;
  KD: number;
  ADR: number;
}

interface ValorantMatchHistory {
  winRate: number;
  wins: number;
  losses: number;
}

interface ValorantRank {
  title: string;
  imgUrl: string;
  rr?: string;
}
