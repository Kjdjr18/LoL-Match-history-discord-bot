const { Client, IntentsBitField, EmbedBuilder } = require("discord.js");
const axios = require("axios");
require("dotenv").config({ path: "../.env" });

// Load environment variables
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const RIOT_API_KEY = process.env.RIOT_API_KEY;

// Constants for Riot API URLs
const RIOT_API_URLS = {
  SUMMONER: "https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/",
  MATCH: "https://americas.api.riotgames.com/lol/match/v5/matches/",
};

// Create a Discord client
const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

// Function to make Riot API requests with common headers
async function makeRiotAPIRequest(url) {
  try {
    const response = await axios.get(url, {
      headers: { "X-Riot-Token": RIOT_API_KEY },
    });
    return response.data;
  } catch (error) {
    console.error("Error in makeRiotAPIRequest:", error);
    throw new Error("Failed to make Riot API request: " + error.message);
  }
}

// Function to get summoner data
async function getSummonerData(summonerName) {
  const url = `${RIOT_API_URLS.SUMMONER}${summonerName}`;

  try {
    const response = await axios.get(url, {
      headers: { "X-Riot-Token": RIOT_API_KEY },
    });

    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // Handle 404 "Not Found" response
      handleErrors(null, error); // Pass null as the interaction
      return null; // Return null for 404 responses
    } else {
      console.error("Error in getSummonerData:", error);
      throw new Error("Failed to get summoner data: " + error.message);
    }
  }
}

// Function to get match details
async function getMatchDetails(userPuuid) {
  const url = `${RIOT_API_URLS.MATCH}by-puuid/${userPuuid}/ids?start=0&count=5`;

  try {
    const response = await axios.get(url, {
      headers: { "X-Riot-Token": RIOT_API_KEY },
    });

    return response.data;
  } catch (error) {
    console.error("Error in getMatchDetails:", error);
    throw new Error("Failed to get match details: " + error.message);
  }
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
  // Format the date as a string
  return date.toLocaleString("en-US", options);
}

// Helper function to convert seconds to MM:SS format
function secondsToMinutesAndSeconds(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  // Format as MM:SS
  return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
}

// Handle errors gracefully
function handleErrors(interaction, error) {
  if (error) {
    if (error.response && error.response.status === 404) {
      // Handle 404 "Not Found" error
      console.error("Summoner not found:", error);
      return interaction.reply(
        "Summoner not found. Please check the summoner name and try again."
      );
    } else if (error.response && error.response.status === 401) {
      // Handle 401 "Unauthorized" error
      console.error("Invalid API key:", error);
      return interaction.reply("Invalid API key");
    } else {
      // Handle other API errors
      console.error("Error fetching summoner data:", error);
      return interaction.reply(
        "An error occurred while fetching summoner data."
      );
    }
  } else {
    // Handle other errors (not related to axios or the response)
    console.error("An unexpected error occurred:", error);
    return interaction.reply(
      "An unexpected error occurred. Please try again later."
    );
  }
}

// Event listener for when a user interacts with the bot
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "get_match_history") {
    const summonerName = interaction.options.getString("summoner");
    // Remove whitespace from summoner name
    const customString = summonerName.replace(/\s/g, "");

    try {
      // Get summoner data
      const summonerData = await getSummonerData(customString);

      if (!summonerData) {
        // Summoner not found, already handled by the 404 response in getSummonerData
        return;
      }

      const userPuuid = summonerData.puuid;
      // Get match IDs
      const matchIds = await getMatchDetails(userPuuid);

      // Fetch match details for each match ID
      const matchDetails = await Promise.all(
        matchIds.map(async (matchId) => {
          const matchData = await makeRiotAPIRequest(
            `${RIOT_API_URLS.MATCH}${matchId}`
          );

          // Extract and format match data
          const totalSeconds = matchData.info.gameDuration;
          const formattedTime = secondsToMinutesAndSeconds(totalSeconds);
          const date = formatMatchDate(matchData.info.gameCreation);
          const gameMode = matchData.info.gameMode;

          const participant = matchData.info.participants.find(
            (p) => p.puuid === userPuuid
          );

          if (participant) {
            // Extract and format participant data
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

            // Return match details as an object
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

      // Filter out invalid matches
      const validMatches = matchDetails.filter(Boolean);

      if (validMatches.length === 0) {
        interaction.reply("No valid matches found for the summoner.");
        return;
      }

      // Create match embeds for valid matches
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

        // Create an embed for each match
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

      // Create a message with the match history and a clickable URL
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
      // Handle errors gracefully
      handleErrors(interaction, error);
    }
  }
});

// Event listener for when the bot is ready
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Log in the Discord bot with the token
client.login(DISCORD_TOKEN);
