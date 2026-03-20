const { ActivityType } = require('discord.js');

module.exports = (client) => {
    // Calculate totals dynamically
    const serverCount = client.guilds.cache.size;
    const commandCount = client.commands.size;
    const userCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

    return [
        {
            activities: [{ 
                name: `${serverCount} Servers | ${commandCount} Commands`, 
                type: ActivityType.Watching 
            }],
            status: 'online',
        },
        {
            activities: [{ 
                name: `Slash Commands in ${serverCount} Guilds`, 
                type: ActivityType.Listening 
            }],
            status: 'dnd',
        },
        {
            activities: [{ 
                name: `with ${userCount} users!`, 
                type: ActivityType.Playing 
            }],
            status: 'idle',
        },
        {
            activities: [{ 
                name: 'AetherOS Development', 
                type: ActivityType.Competing 
            }],
            status: 'online',
        }
    ];
};