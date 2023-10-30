//Load module exported from register-commands.js to give access to the commands name and value.
const { commands } = require("./register-commands");

// Load environment variables from .env.
require("dotenv").config({ path: "../.env" });

// Create Classes that require the discord.js module.
const { Client, IntentsBitField } = require("discord.js");

// Name the dicord token variable that is pulled in from the other file.
const DISCORD_TOKEN = process.env.DISCORD_TOKEN; // Load the bot token from environment variables

// Intents or permissions for the bot per discord docs.
const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

// This console logs a message on login.
client.on("ready", (c) => {
  console.log(`Logged in as ${c.user.tag}`);
});

// Main code that runs the interactions.
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "get_match_history") {
    //This is actually the puuid that is hard coded to our lol summoner names due to the upcoming changes from riot that will go away from use of summoner names. Can improve code by making it find this instead of hard code.
    const user = interaction.options.get("user")?.value;
    //This takes the user choice and attaches the corresponding name so it can display that in discord instead of the puuid.
    const userChoiceName = commands[0].options[0].choices.find(
      (choice) => choice.value === user
    )?.name;

    //Axios is a module imported to handle api calls.
    const axios = require("axios");
    //Variable to assign riot api key imported from dotenv.
    const RIOT_API_KEY = process.env.RIOT_API_KEY; // Load the RIOT API KEY from environment variables.
    //Assigns user variable(puuid) to summonerName variable.
    const summonerName = user;
    //Assigns the variable region to americas for use in the api. na1 was used to get summoner puuid but americas is for this api call.
    const region = "americas";

    // Send an initial response with the userchoice name variable.
    await interaction.reply(
      `Here is your match history for ${userChoiceName}:`
    );

    // Introduce a delay (e.g., 1 seconds) before fetching and sending the match history. This is the second message which has all the formatted data.
    setTimeout(async () => {
      try {
        const response = await axios.get(
          `https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${summonerName}/ids?start=0&count=10`,
          {
            headers: {
              "X-Riot-Token": RIOT_API_KEY,
            },
          }
        );

        const summonerData = response.data;

        // Initialize an array to store match details for display
        const matchDetails = [];

        // Iterate over the match IDs and fetch detailed data
        for (let i = 0; i < summonerData.length; i++) {
          const matchId = summonerData[i];
          const matchData = await axios.get(
            `https://${region}.api.riotgames.com/lol/match/v5/matches/${matchId}`,
            {
              headers: {
                "X-Riot-Token": RIOT_API_KEY,
              },
            }
          );

          // Find the participant data for the specific summoner
          const puuid = summonerName; // Replace with the summoner's puuid
          const participant = matchData.data.info.participants.find(
            (p) => p.puuid === puuid
          );

          if (participant) {
            const championName = participant.championName;
            const kills = participant.kills;
            const deaths = participant.deaths;
            const assists = participant.assists;
            const damageDealt = participant.totalDamageDealtToChampions;
            const formattedDamageDealt = new Intl.NumberFormat("en-US").format(
              damageDealt
            );
            let outcome = participant.win ? "Victory" : "Defeat";
            const pentakills = participant.pentaKills;

            // Create a formatted string for the match
            const formattedMatch = `${outcome}       ${championName}       ${kills}/${deaths}/${assists}      ${formattedDamageDealt}          ${pentakills}`;
            matchDetails.push(formattedMatch);
          }
        }

        // Define the maximum width for each column
        const maxWidth = 10; // Adjust the width as needed
        const columnSpacing = 4; // Adjust the spacing between columns

        // Create the header for the table
        const tableHeader =
          `Outcome`.padEnd(maxWidth + 4) +
          `Champion`.padEnd(maxWidth + columnSpacing) +
          `K/D/A`.padEnd(maxWidth + columnSpacing) +
          `Damage Dealt`.padEnd(maxWidth + columnSpacing) +
          `Pentas`.padEnd(maxWidth);

        // Calculate the length of the header line
        const headerLength = tableHeader.length;

        // Create a shorter line of dashes to match the header length
        const tableSeparator = "-".repeat(headerLength);

        // Join the formatted match details with newline characters
        const matchHistory = [
          tableHeader,
          tableSeparator,
          ...matchDetails.map((row) => {
            const columns = row.split(/\s{2,}/); // Split on two or more spaces

            // Ensure each column has a fixed width with reduced spacing
            const outcome = columns[0].padEnd(maxWidth);
            const champion = columns[1].padEnd(maxWidth + columnSpacing); // Adjust spacing here
            const kda = columns[2].padEnd(maxWidth + columnSpacing); // Adjust spacing here
            const damage = columns[3].padEnd(maxWidth + columnSpacing); // Adjust spacing here
            const pentas = columns[4].padEnd(maxWidth);

            return (
              `${outcome}`.padEnd(maxWidth + columnSpacing) +
              `${champion}`.padEnd(maxWidth + columnSpacing) +
              `${kda}`.padEnd(maxWidth + columnSpacing) +
              `${damage}`.padEnd(maxWidth + columnSpacing) +
              `${pentas}`
            );
          }),
        ].join("\n");

        // Send the match history data to the user as a follow-up message
        await interaction.followUp(`\`\`\`${matchHistory}\`\`\``);
      } catch (error) {
        console.error("Error fetching summoner data:", error);
        await interaction.followUp(
          "An error occurred while fetching summoner data."
        );
      }
    }, 1000); // Introduce a 1-second delay
  }
});

// This logs in to the discord bot
client.login(DISCORD_TOKEN);
