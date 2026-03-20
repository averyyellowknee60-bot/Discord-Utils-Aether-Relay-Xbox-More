const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Token } = require('./config.json');
const fs = require('fs');
const path = require('path');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // Add this if you need to read message text
        GatewayIntentBits.GuildMembers    // Add this for join/leave events
    ] 
});

// 1. Initialize Collections (The "Storage" for your dynamic files)
client.commands = new Collection();
client.buttons = new Collection();
client.selectMenus = new Collection();

// 2. Load All Handlers
// Adding 'componentHandler' here automatically runs it from your /handlers folder
const handlers = ['commandHandler', 'eventHandler', 'componentHandler'];

for (const handler of handlers) {
    try {
        require(`./handlers/${handler}`)(client);
    } catch (error) {
        console.error(`\x1b[31m[CRITICAL ERROR]\x1b[0m Failed to start handler: ${handler}\n`, error);
    }
}

// 3. Global Error Handling (The Safety Net)
process.on('unhandledRejection', error => {
    console.error('\x1b[31m[FATAL]\x1b[0m Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('\x1b[31m[FATAL]\x1b[0m Uncaught exception:', error);
});

// 4. Start the Bot
client.login(Token);