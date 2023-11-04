const { Client, IntentsBitField, EmbedBuilder } = require("discord.js");
const axios = require("axios");
require("dotenv").config({ path: "../.env" });

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const RIOT_API_KEY = process.env.RIOT_API_KEY;

// Constants for Riot API URLs
const RIOT_API_URLS = {
  SUMMONER: "https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/",
  MATCH: "https://americas.api.riotgames.com/lol/match/v5/matches/",
};

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

async function getSummonerData(summonerName) {
  const url = `https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${summonerName}`;
  const response = await axios.get(url, {
    headers: { "X-Riot-Token": RIOT_API_KEY },
  });
  return response.data;
}

async function getMatchDetails(userPuuid) {
  const url = `https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${userPuuid}/ids?start=0&count=5`;
  const response = await axios.get(url, {
    headers: { "X-Riot-Token": RIOT_API_KEY },
  });
  return response.data;
}

// Helper function to format match date
function formatMatchDate(unixTime) {
  const date = new Date(unixTime);
  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  };
  return date.toLocaleString("en-US", options);
}

// Helper function to convert seconds to MM:SS format
function secondsToMinutesAndSeconds(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
}

// Handle errors gracefully
function handleErrors(interaction, error) {
  if (error.response) {
    if (error.response.status === 404) {
      interaction.reply("Not a valid summoner name");
    } else if (error.response.status === 401) {
      console.error("Invalid API key:", error);
      interaction.reply("Invalid API key");
    } else {
      console.error("Error fetching summoner data:", error);
      interaction.followUp("An error occurred while fetching summoner data.");
    }
  } else {
    console.error("Network error:", error);
    interaction.followUp("A network error occurred. Please try again later.");
  }
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "get_match_history") {
    const customString = interaction.options.getString("summoner");

    try {
      const summonerData = await getSummonerData(customString);
      const userPuuid = summonerData.puuid;
      const matchIds = await getMatchDetails(userPuuid);

      const matchDetails = await Promise.all(
        matchIds.map(async (matchId) => {
          const matchData = await axios.get(
            `https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}`,
            { headers: { "X-Riot-Token": RIOT_API_KEY } }
          );

          const totalSeconds = matchData.data.info.gameDuration;
          const formattedTime = secondsToMinutesAndSeconds(totalSeconds);
          const date = formatMatchDate(matchData.data.info.gameCreation);
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
              date,
            };
          }

          return null;
        })
      );

      const validMatches = matchDetails.filter(Boolean);

      if (validMatches.length === 0) {
        interaction.reply("No valid matches found for the summoner.");
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
          date,
        } = match;

        // Ensure formattedTime and pentaKills are strings
        const formattedTimeString = formattedTime.toString();
        const pentaKillsString = pentaKills.toString();

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
            { name: "DATE", value: date, inline: true },
            { name: "DURATION", value: formattedTimeString, inline: true },
            { name: "PENTAS", value: pentaKillsString || "0", inline: true }
          );

        return matchEmbed;
      });

      const message = `Here is your match history for ${customString}\nMost recent on top ↓\n[Click here for more details](https://u.gg/lol/profile/na1/${customString}/overview)`;

      // Set the URL for the entire message by including it in the `content`
      const messageOptions = {
        content: message,
        embeds: matchEmbeds,
        components: [], // Optionally, add message components here
        allowedMentions: { parse: [] }, // Adjust mentions as needed
      };

      // Send the message with all the match embeds and the clickable URL
      await interaction.reply(messageOptions);
    } catch (error) {
      handleErrors(interaction, error);
    }
  }
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(DISCORD_TOKEN);
