const { Client, IntentsBitField, EmbedBuilder } = require("discord.js");
const axios = require("axios");
require("dotenv").config({ path: "../.env" });

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const RIOT_API_KEY = process.env.RIOT_API_KEY;
const region1 = "na1"; // This is the region variable for before you have the puuid
const region = "americas"; // This is the region variable for after you have the puuid

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

            const outcome = win ? "Victory" : "Defeat";

            return {
              outcome,
              gameMode,
              championName,
              kills,
              deaths,
              assists,
              formattedDamageDealt,
              formattedTime,
              pentaKills,
            };
          }

          return null;
        })
      );

      const validMatches = matchDetails.filter(Boolean);

      if (validMatches.length === 0) {
        await interaction.reply("No valid matches found for the summoner.");
        return;
      }

      const matchEmbeds = validMatches.map((match) => {
        const {
          outcome,
          gameMode,
          championName,
          kills,
          deaths,
          assists,
          formattedDamageDealt,
          formattedTime,
          pentaKills,
        } = match;

        const matchEmbed = new EmbedBuilder()
          .setTitle(`${outcome} - ${gameMode}`)
          .setColor(outcome === "Victory" ? "#00FF00" : "#FF0000")
          .addFields(
            { name: "CHAMPION", value: championName, inline: true },
            {
              name: "K/D/A",
              value: `${kills}/${deaths}/${assists}`,
              inline: true,
            },
            { name: "DAMAGE", value: formattedDamageDealt, inline: true },
            { name: "DURATION", value: formattedTime, inline: true },
            { name: "PENTAS", value: pentaKills || "0", inline: true }
          );

        return matchEmbed;
      });

      const message = `Here is your match history for: ${customString}`;

      // Send the message before the match embeds
      await interaction.reply({ content: message, embeds: matchEmbeds });
    } catch (error) {
      if (error.response) {
        if (error.response.status === 404) {
          // The summoner name is not valid
          await interaction.reply("Not a valid summoner name");
        } else if (error.response.status === 401) {
          // The API key is invalid
          console.error("Invalid API key:", error);
          await interaction.reply("Invalid API key");
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
