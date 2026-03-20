const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { Authflow, Titles } = require('prismarine-auth');
const path = require('path');

const cachePath = path.join(__dirname, '../../auth_cache');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xbl-recent')
        .setDescription('View full game history and playtime for a Gamertag.')
        .addStringOption(opt => opt.setName('gamertag').setDescription('Target Gamertag').setRequired(true)),
 
    async execute(interaction, client) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const gamertag = interaction.options.getString('gamertag');
        const sessionName = `aether_session_${interaction.guild.id}`;

        try {
            const authflow = new Authflow(sessionName, cachePath, { 
                authTitle: Titles.MinecraftNintendoSwitch, 
                flow: 'live', 
                deviceType: 'Nintendo' 
            });

            const xsts = await authflow.getXboxToken('http://xboxlive.com');
            const headers = {
                'x-xbl-contract-version': '2',
                'Authorization': `XBL3.0 x=${xsts.userHash};${xsts.XSTSToken}`,
                'Accept-Language': 'en-US'
            };

            // 1. Resolve Gamertag to XUID first
            const profileRes = await fetch(`https://profile.xboxlive.com/users/gt(${encodeURIComponent(gamertag)})/profile/settings`, { headers });
            if (!profileRes.ok) throw new Error('Profile not found');
            const profileData = await profileRes.json();
            const xuid = profileData.profileUsers[0].id;

            // 2. Fetch Deep Title History
            const historyRes = await fetch(`https://titlehub.xboxlive.com/users/xuid(${xuid})/titles/titlehistory/decoration/scid,PnS,Achievement`, { headers });
            if (!historyRes.ok) throw new Error('Could not fetch history');
            const historyData = await historyRes.json();
            const games = historyData.titles || [];

            if (games.length === 0) {
                return await interaction.editReply({ content: `📦 **${gamertag}** has no recorded game history.` });
            }

            // 3. Pagination Logic
            let currentPage = 0;
            const gamesPerPage = 1; // Showing 1 game per page for maximum detail

            const generateEmbed = (page) => {
    const game = games[page];
    const lastPlayedDate = game.titleHistory?.lastTimePlayed 
        ? new Date(game.titleHistory.lastTimePlayed).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Unknown';

    const minutesPlayed = game.detail?.playTime || 0; 
    const playTimeStr = minutesPlayed > 0 ? `${(minutesPlayed / 60).toFixed(1)} Hours` : "Hidden/Private";

    // --- FIX: VALIDATE THE THUMBNAIL URL ---
    // If displayImage is an empty string or undefined, use a placeholder or set to null
    const thumbnail = (game.displayImage && game.displayImage.startsWith('http')) 
        ? game.displayImage 
        : 'https://news.xbox.com/en-us/wp-content/uploads/sites/2/2022/03/Xbox_Sphere_Logo_Large_RGB_White_Generic-1.png'; // Optional: Default Xbox Logo

    const embed = new EmbedBuilder()
        .setAuthor({ name: `AetherOS | Game Library: ${gamertag}`, iconURL: client.user.displayAvatarURL() })
        .setTitle(game.name || 'Unknown Title')
        .setURL(`https://www.xbox.com/en-US/games/store/p/${game.titleId}`)
        .setColor('#00ff00')
        .setThumbnail(thumbnail) // Now guaranteed to be a valid URL
        .addFields(
            { name: '🕒 Last Session', value: `\`${lastPlayedDate}\``, inline: true },
            { name: '⏳ Total Playtime', value: `\`${playTimeStr}\``, inline: true },
            { name: '🏆 Achievements', value: `\`${game.achievement?.currentAchievements || 0}\` / \`${game.achievement?.totalAchievements || 0}\``, inline: true },
            { name: '📈 Gamerscore', value: `\`${game.achievement?.currentGamerscore || 0}\` / \`${game.achievement?.totalGamerscore || 0}\`G`, inline: true },
            { name: '🎮 Platform', value: `\`${game.devices?.length ? game.devices.join(', ') : 'Unknown'}\``, inline: true },
            { name: '🆔 Title ID', value: `\`${game.titleId || 'N/A'}\``, inline: true }
        )
        .setFooter({ text: `Page ${page + 1} of ${games.length} | Registry: ${sessionName.toUpperCase()}` })
        .setTimestamp();

    return embed;
};

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev').setLabel('◀️ Previous').setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('next').setLabel('Next ▶️').setStyle(ButtonStyle.Primary).setDisabled(games.length <= 1)
            );

            const response = await interaction.editReply({
                embeds: [generateEmbed(0)],
                components: [row]
            });

            // 4. Interaction Collector
            const collector = response.createMessageComponentCollector({ time: 300000 }); // 5 minute timeout

            collector.on('collect', async i => {
                if (i.customId === 'next') currentPage++;
                else if (i.customId === 'prev') currentPage--;

                const newRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('prev').setLabel('◀️ Previous').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 0),
                    new ButtonBuilder().setCustomId('next').setLabel('Next ▶️').setStyle(ButtonStyle.Primary).setDisabled(currentPage === games.length - 1)
                );

                await i.update({
                    embeds: [generateEmbed(currentPage)],
                    components: [newRow]
                });
            });

            collector.on('end', () => {
                interaction.editReply({ components: [] }).catch(() => null);
            });

        } catch (err) {
            console.error('[RECENT ERROR]', err);
            await interaction.editReply({ content: '⚠️ **Error:** User not found or session is invalid. Run `/xbox-auth`.' });
        }
    }
};