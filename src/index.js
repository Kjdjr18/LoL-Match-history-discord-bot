const { Client, IntentsBitField } = require("discord.js");
const axios = require("axios");
require("dotenv").config({ path: "../.env" });

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const RIOT_API_KEY = process.env.RIOT_API_KEY;
const region1 = "na1"; //This is the region variable for before you have the puuid
const region = "americas"; //This is the region variable for after you have the puuid

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

// Helper function to convert seconds to MM:SS format
function secondsToMinutesAndSeconds(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
}

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "get_match_history") {
    const customString = interaction.options.getString("summoner");

    try {
      const summonerResponse = await axios.get(
        `https://${region1}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${customString}`,
        { headers: { "X-Riot-Token": RIOT_API_KEY } }
      );

      const userPuuid = summonerResponse.data.puuid;

      const response = await axios.get(
        `https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${userPuuid}/ids?start=0&count=10`,
        { headers: { "X-Riot-Token": RIOT_API_KEY } }
      );

      const matchDetails = await Promise.all(
        response.data.map(async (matchId) => {
          const matchData = await axios.get(
            `https://${region}.api.riotgames.com/lol/match/v5/matches/${matchId}`,
            { headers: { "X-Riot-Token": RIOT_API_KEY } }
          );
          const totalSeconds = matchData.data.info.gameDuration;
          const formattedTime = secondsToMinutesAndSeconds(totalSeconds);
          const gameMode = matchData.data.info.gameMode;
          const participant = matchData.data.info.participants.find(
            (p) => p.puuid === userPuuid
          );

          if (participant) {
            const {
              championName,
              kills,
              deaths,
              assists,
              totalDamageDealtToChampions,
              win,
              pentaKills,
            } = participant;

            const formattedDamageDealt = new Intl.NumberFormat("en-US").format(
              totalDamageDealtToChampions
            );

            const outcome = win ? "W" : "L";

            return `${outcome}\t${gameMode}\t${championName}\t${kills}/${deaths}/${assists}\t${formattedDamageDealt}\t${formattedTime}\t${pentaKills}`;
          }

          return null;
        })
      );

      // Define column headers and corresponding widths
      const columns = [
        { header: "W/L", width: 3 },
        { header: "Game Mode", width: 10 },
        { header: "Champion", width: 12 },
        { header: "K/D/A", width: 8 },
        { header: "Damage", width: 7 },
        { header: "Duration", width: 8 },
        { header: "Pentas", width: 1 },
      ];

      // Calculate the separator length based on the total width of columns
      const separatorLength = columns.reduce(
        (total, col) => total + col.width,
        10
      );

      // Create the formatted table
      const formattedMatchHistory = [
        "```",
        columns.map((col) => col.header.padEnd(col.width)).join(" "),
        "-".repeat(separatorLength),
        ...matchDetails.filter(Boolean).map((row) => {
          const values = row.split("\t");
          return columns
            .map((col, index) => values[index].padEnd(col.width))
            .join(" ");
        }),
        "```",
      ];

      // Send a single response with the formatted match history
      await interaction.reply(
        `Here is the match history, in descending order ↓, for ${customString}:\n${formattedMatchHistory.join(
          "\n"
        )}`
      );
    } catch (error) {
      if (error.response) {
        if (error.response.status === 404) {
          // The summoner name is not valid
          await interaction.reply("Not a valid summoner name");
        } else {
          // Handle other errors gracefully, you might want to log these
          console.error("Error fetching summoner data:", error);
          await interaction.followUp(
            "An error occurred while fetching summoner data."
          );
        }
      } else {
        // Handle network errors, for example, when Riot API is down
        console.error("Network error:", error);
        await interaction.followUp(
          "A network error occurred. Please try again later."
        );
      }
    }
  }
});

client.login(DISCORD_TOKEN);
