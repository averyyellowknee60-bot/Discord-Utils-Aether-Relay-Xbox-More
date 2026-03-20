const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const { Token, Client_ID } = require('../config.json');
const getPresences = require('../util/presences.js');

module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        const color = {
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            magenta: '\x1b[35m',
            cyan: '\x1b[36m',
            red: '\x1b[31m',
            blue: '\x1b[34m',
            reset: '\x1b[0m'
        };

        // 1. Startup Diagnostics
        const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        console.log(`${color.magenta}[SYSTEM]${color.reset} Authenticated: ${color.yellow}${client.user.tag}${color.reset}`);
        console.log(`${color.magenta}[SYSTEM]${color.reset} Memory Usage: ${color.cyan}${memoryUsage} MB${color.reset}`);
        console.log(`${color.magenta}[SYSTEM]${color.reset} Heartbeat: ${color.cyan}${client.ws.ping}ms${color.reset}`);

        // 2. Global Command Synchronization
        const rest = new REST({ version: '10' }).setToken(Token);
        try {
            const commands = client.commands
    .filter(cmd => cmd.data instanceof SlashCommandBuilder) // Only pick real commands
    .map(cmd => cmd.data.toJSON());
            
            // Log that we are starting the sync
            process.stdout.write(`${color.blue}[SYNC]${color.reset} Pushing ${commands.length} commands to Discord... `);
            
            await rest.put(
                Routes.applicationCommands(Client_ID),
                { body: commands },
            );

            process.stdout.write(`${color.green}DONE${color.reset}\n`);
        } catch (error) {
            console.error(`\n${color.red}[CRITICAL]${color.reset} Command Registration Failed:`, error);
        }

        // 3. Automated Presence Cycler
        let index = 0;
        const startPresenceCycle = () => {
            const list = getPresences(client);
            if (!list || list.length === 0) return;

            const current = list[index];
            client.user.setPresence(current);

            index = (index + 1) % list.length;
        };

        // Initial set and then start interval
        startPresenceCycle();
        setInterval(startPresenceCycle, 15000);

        // 4. Final Boot Confirmation
        console.log(`${color.cyan}-----------------------------------------`);
        console.log(`${color.green}✨ AetherOS Core: Status [ONLINE]${color.reset}`);
        console.log(`${color.green}🛰️  Connected to ${client.guilds.cache.size} Servers${color.reset}`);
        console.log(`${color.cyan}-----------------------------------------${color.reset}\n`);
    },
};