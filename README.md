# Discord Bot for Riot Games API Integration

This is a Discord bot that integrates with the Riot Games API to provide match history information for League of Legends players.

## Features

- Retrieve match history for a given League of Legends summoner.
- Display match details including wins/losses, champion stats, and more.
- Seamless integration with Discord servers.

## Prerequisites

Before running the bot, make sure you have the following:

- Node.js and npm installed.
- Discord bot token. You can create a bot and get the token from the [Discord Developer Portal](https://discord.com/developers/applications).
- Riot developer API key.
- Create a .env file and place your tokens in that file with the format of
  DISCORD_TOKEN="YOUR_TOKEN"
  RIOT_API_KEY="YOUR_TOKEN"
  GUILD_ID="DISCORD_SERVER_ID"
  CLIENT_ID="DISCORD_BOT_ID"

## Running the bot

- install the dependencies
- use nodemon or npm start
- Once the bot is running, use /get_match_history <summoner_name> to find a summoners match history for the last 10 games.
