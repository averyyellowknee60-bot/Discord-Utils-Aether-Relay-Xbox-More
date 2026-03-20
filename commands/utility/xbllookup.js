const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { Authflow, Titles } = require('prismarine-auth');
const path = require('path');

const cachePath = path.join(__dirname, '../../auth_cache');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xbl-lookup')
        .setDescription('Retrieve detailed Xbox profile data using the server’s authorized session.')
        .addStringOption(option => 
            option.setName('gamertag')
                .setDescription('Target Gamertag to lookup')
                .setRequired(true)
        ),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const gamertag = interaction.options.getString('gamertag');

        // This must match the name used in your xbox-auth.js file
        const sessionName = `aether_session_${interaction.guild.id}`;

        try {
            // 1. Initialize Authflow using the server-specific session
            const authflow = new Authflow(
                sessionName, 
                cachePath, 
                { 
                    authTitle: Titles.MinecraftNintendoSwitch, 
                    flow: 'live', 
                    deviceType: 'Nintendo' 
                }
            );

            // 2. Get the session token (automatically refreshes if needed)
            const xsts = await authflow.getXboxToken('http://xboxlive.com');
            const headers = {
                'x-xbl-contract-version': '2',
                'Authorization': `XBL3.0 x=${xsts.userHash};${xsts.XSTSToken}`,
                'Accept-Language': 'en-US'
            };

            // 3. Fetch Profile Data
            const profileRes = await fetch(`https://profile.xboxlive.com/users/gt(${encodeURIComponent(gamertag)})/profile/settings?settings=Gamerscore,GameDisplayPicRaw,AccountTier,TenureLevel`, { headers });
            
            if (!profileRes.ok) {
                return await interaction.editReply({ 
                    content: `❌ **Error:** Profile \`${gamertag}\` not found or session expired. Try running \`/xbox-auth\` again.` 
                });
            }

            const profileData = await profileRes.json();
            const user = profileData.profileUsers[0];
            const getSetting = (id) => user.settings.find(s => s.id === id)?.value || '0';
            
            // 4. Calculate Account Age
            const tenureYears = parseInt(getSetting('TenureLevel'));
            const currentYear = new Date().getFullYear();
            const estCreationYear = currentYear - tenureYears;
            
            // 5. Fetch Activity & Status
            const titleRes = await fetch(`https://titlehub.xboxlive.com/users/xuid(${user.id})/titles/titlehistory/decoration/scid,PnS,Achievement`, { headers });
            let activity = "*No recent games.*";
            let status = "Offline";

            if (titleRes.ok) {
                const titleData = await titleRes.json();
                if (titleData.titles?.length > 0) {
                    status = titleData.titles[0].state === 'Active' ? '🟢 Online' : '⚪ Offline';
                    activity = titleData.titles.slice(0, 3).map(g => `**${g.name}**\n└ \`${g.achievement?.currentGamerscore || 0}G\``).join('\n');
                }
            }

            // 6. Build The AetherOS UI
            const embed = new EmbedBuilder()
                .setAuthor({ name: 'AetherOS | Xbox Relay', iconURL: client.user.displayAvatarURL() })
                .setColor('#800000')
                .setTitle(`🎮 ${gamertag}`)
                .setURL(`https://account.xbox.com/en-us/profile?gamertag=${encodeURIComponent(gamertag)}`)
                .setThumbnail(getSetting('GameDisplayPicRaw'))
                .addFields(
                    { name: '📋 Identity', value: `**XUID:** \`${user.id}\`\n**Tier:** \`${getSetting('AccountTier')}\``, inline: true },
                    { name: '⏳ Account Age', value: `**Tenure:** \`${tenureYears} Years\`\n**Est. Created:** \`${estCreationYear}\``, inline: true },
                    { name: '📈 Stats', value: `**Score:** \`${getSetting('Gamerscore')}G\`\n**Status:** ${status}`, inline: true },
                    { name: '🕹️ Recent Activity', value: activity }
                )
                .setFooter({ text: `Registry: ${sessionName.toUpperCase()}`, iconURL: interaction.guild.iconURL() })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error('[LOOKUP ERROR]', err);
            await interaction.editReply({ 
                content: '⚠️ **Auth Error:** Could not find a valid session for this server. Please run `/xbox-auth` first.' 
            });
        }
    }
};