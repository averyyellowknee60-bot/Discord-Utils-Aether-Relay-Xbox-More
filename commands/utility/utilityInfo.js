const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits, 
    version, 
    MessageFlags 
} = require('discord.js');
const os = require('os');
const bedrock = require('bedrock-protocol');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('utility-info')
        .setDescription('Display AetherOS & Bedrock Relay diagnostics.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        // 1. Fixed Uptime Calculation
        // client.uptime is in milliseconds since the bot started
        let totalSeconds = (client.uptime / 1000);
        let days = Math.floor(totalSeconds / 86400);
        totalSeconds %= 86400;
        let hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        let minutes = Math.floor(totalSeconds / 60);
        let seconds = Math.floor(totalSeconds % 60);

        const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

        // 2. Fixed Bedrock Version Detection
        // We pull from the library's internal constants to ensure it's the latest supported
        const supported = bedrock.supportedVersions;
        const mcVersion = Array.isArray(supported) ? supported[supported.length - 1] : '1.21.x';
        
        // 3. System Stats
        const memoryFormatted = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const relayStatus = client.relayClient ? '🟢 ACTIVE' : '🔴 OFFLINE';

        const infoEmbed = new EmbedBuilder()
            .setTitle('🛡️ AetherOS | Bedrock Relay Terminal')
            .setColor('#800000') // Your Maroon theme
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: '🌐 Relay Status', value: `\`${relayStatus}\``, inline: true },
                { name: '🎮 MC Version', value: `\`${mcVersion}\``, inline: true },
                { name: '📜 Protocol', value: `\`v${bedrock.version || '3.53.0'}\``, inline: true },
                { name: '🛰️ API Latency', value: `\`${client.ws.ping}ms\``, inline: true },
                { name: '⌛ Bot Uptime', value: `\`${uptimeString}\``, inline: true },
                { name: '📦 RAM Usage', value: `\`${memoryFormatted} MB\``, inline: true }
            )
            .addFields({ 
                name: '💻 Host Environment', 
                value: `\`Node ${process.version}\` on \`${os.platform()}\`` 
            })
            .setFooter({ 
                text: `Diagnostic Hash: ${Math.random().toString(36).substring(7).toUpperCase()}`, 
                iconURL: interaction.user.displayAvatarURL() 
            })
            .setTimestamp();

        await interaction.reply({ 
            embeds: [infoEmbed], 
            flags: [MessageFlags.Ephemeral] 
        });
    },
};