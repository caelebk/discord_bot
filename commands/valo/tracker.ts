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
    console.log(username);
    const userUrl = `${baseUrl}${username}/overview`;

    interaction.deferReply();
    let embeds: EmbedBuilder[] = [];

    try {
      embeds = await getUserEmbeds(userUrl);
    } catch (error) {
      const errorObject = error as Error;
      return interaction.editReply(errorObject.message);
    }

    if (embeds.length === 0) {
      interaction.editReply("Failed to retrieve content.");
    } else {
      interaction.editReply({ embeds: embeds });
    }
  },
};

async function getUserEmbeds(url: string): Promise<EmbedBuilder[]> {
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  const embeds: EmbedBuilder[] = [];

  return embeds;
}

function parseProfile($: cheerio.CheerioAPI): EmbedBuilder {
  const userImage = $().find("user-avatar__image").attr("src");
  return new EmbedBuilder();
}

interface TrackerProfile {
  username: string;
  level: number;
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
  rr: string;
}
