// Load environment variables from .env.
require("dotenv").config({ path: "../.env" });

// Loads classes used from discord.js module.
const { REST, Routes, ApplicationCommandOptionType } = require("discord.js");

// list of the slash commands and the choices used. Value is puuid
const commands = [
  {
    //   Acutal /option to get the bot to reply.
    name: "get_match_history",
    description: "get match history",
    //   Options for the slash command.
    options: [
      {
        //   Main option name and description of what it does.
        name: "user",
        description: "user match history",
        // Type of option being uses, I.E. String, Integer, etc.
        type: ApplicationCommandOptionType.String,
        // Choices being passed for the option. These are what show up when you use the / command in disco.
        choices: [
          {
            name: "kjdjr18",
            //   The value is the actual puuid that is being passed back when a user makes a name choice in disco.
            value:
              "GlduOg4YGUr3bf6qxnmrHcp9TBQc39Wm44WGUrzLzJ_BK2IBsZprU-9M-2yErkMVvJL-ZopspLfeTA",
          },
          {
            name: "limnadian",
            value:
              "rHhzHdAii4htH7XdLf76fYuv2cYMtAAndrYq-PMsBR9QOetJD3-27QxnXBgH7zTrYx6JZv0QNOKmXA",
          },
          {
            name: "champsaurus rex",
            value:
              "FAcwkuxoz3zFRQ9bn4CD-v6WdhmTDfHpb5NvYlhBWrhoxcQwHVhkXQuZGIsCibXUcX72g0sWkutcRw",
          },
          {
            name: "savager2d2",
            value:
              "vqbxP54HZBW0KjTjCmWEtvaQdmTIwgrfrnPXmE6NcOUQw1317q2x5mOKb9TvhNbA2f0vjmVKwNmx9Q",
          },
          {
            name: "onlysmites",
            value:
              "51M2WQ8EK5klPb2M9kGWOFxcXvnvh-gIGynlJl2RM9wZPttHCvIZGoxl5lNP_1X0Gs2CcBstB6xHYA",
          },
        ],
        required: true,
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
