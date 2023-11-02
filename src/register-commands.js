// Load environment variables from .env.
require("dotenv").config({ path: "../.env" });

// Loads classes used from discord.js module.
const { REST, Routes, ApplicationCommandOptionType } = require("discord.js");

// list of the slash commands and the choices used. Value is puuid
const commands = [
  {
    name: "get_match_history",
    description: "Get match history",
    options: [
      {
        name: "summoner",
        description: "Custom input string",
        type: ApplicationCommandOptionType.String,
        required: true, // Set this to true if you want it to be required.
      },
    ],
  },
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN); // Ensure DISCORD_TOKEN is defined in your .env file

(async () => {
  try {
    console.log("Registering slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log("Slash commands were registered successfully");
  } catch (error) {
    console.log(`There was an error: ${error}`);
  }
})();

module.exports = { commands };
