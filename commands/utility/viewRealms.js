const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags 
} = require('discord.js');

const { Authflow, Titles } = require('prismarine-auth');
const { RealmAPI } = require('prismarine-realms');
const path = require('path');

const cachePath = path.join(__dirname, '../../auth_cache');

// Cache for session-based data
const nameCache = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('view-realms')
        .setDescription('View and monitor connected Realms.'),

    async execute(interaction, client) {
        // FIX: Removed deprecated 'ephemeral' for 'MessageFlags'
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const sessionName = `aether_session_${interaction.guild.id}`;

        try {
            const authflow = new Authflow(sessionName, cachePath, { 
                authTitle: Titles.MinecraftNintendoSwitch, // Match your standard auth title
                deviceType: 'Nintendo',
                flow: 'live'
            });

            const realmApi = RealmAPI.from(authflow, 'bedrock');
            const realms = await realmApi.getRealms();

            if (!realms?.length) {
                return interaction.editReply({ content: '❌ **No Realms Found:** This account has no active Realm memberships.' });
            }

            const embed = new EmbedBuilder()
                .setAuthor({ name: 'AetherOS | Realm Explorer', iconURL: client.user.displayAvatarURL() })
                .setTitle('🛰️ Connected Realms')
                .setColor('#800000')
                .setDescription('Select a realm to view live player data.')
                .setFooter({ text: `Registry: ${sessionName.toUpperCase()}` })
                .setTimestamp();

            const rows = [];
            let row = new ActionRowBuilder();

            realms.forEach((realm, i) => {
                embed.addFields({
                    name: `${i + 1}. ${realm.name}`,
                    value: `ID: \`${realm.id}\` • Status: \`${realm.state}\``
                });

                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`vrealm_${realm.id}`) // Shortened ID for safety
                        .setLabel(`${i + 1}`)
                        .setStyle(realm.state === 'OPEN' ? ButtonStyle.Success : ButtonStyle.Secondary)
                );

                if (row.components.length === 5 || i === realms.length - 1) {
                    rows.push(row);
                    row = new ActionRowBuilder();
                }
            });

            const msg = await interaction.editReply({
                embeds: [embed],
                components: rows.slice(0, 5)
            });

            // --- BUTTON COLLECTOR ---
            const collector = msg.createMessageComponentCollector({ time: 120000 });

            collector.on('collect', async (btn) => {
                if (btn.user.id !== interaction.user.id) {
                    return btn.reply({ content: '❌ Access Denied.', flags: [MessageFlags.Ephemeral] });
                }

                await btn.deferReply({ flags: [MessageFlags.Ephemeral] });

                const realmId = btn.customId.split('_')[1];

                try {
                    // Bedrock getRealm returns the detailed player list directly
                    const realmData = await realmApi.getRealm(realmId);
                    
                    // In Bedrock, players in this list with 'online: true' are currently in-game
                    const players = realmData.players || [];
                    const currentlyOnline = players.filter(p => p.online);

                    const onlineList = currentlyOnline.length
                        ? currentlyOnline.map(p => `🟢 **${p.name}**`).join('\n')
                        : '*No players currently online.*';

                    const realmEmbed = new EmbedBuilder()
                        .setTitle(`🛰️ ${realmData.name}`)
                        .setColor('#800000')
                        .addFields(
                            { name: '📡 Status', value: `\`${realmData.state}\``, inline: true },
                            { name: '🟢 Online', value: `\`${currentlyOnline.length}\``, inline: true },
                            { name: '👥 Total Members', value: `\`${players.length}\``, inline: true },
                            { name: '📋 Current Activity', value: onlineList }
                        )
                        .setTimestamp();

                    await btn.editReply({ embeds: [realmEmbed] });

                } catch (err) {
                    console.error('REALM FETCH ERROR:', err);
                    await btn.editReply({ content: '❌ **Fetch Failed:** Could not retrieve data for this Realm.' });
                }
            });

            collector.on('end', () => {
                const disabledRows = rows.map(r => {
                    const newRow = new ActionRowBuilder();
                    r.components.forEach(b => {
                        newRow.addComponents(ButtonBuilder.from(b).setDisabled(true));
                    });
                    return newRow;
                });

                interaction.editReply({ components: disabledRows }).catch(() => {});
            });

        } catch (err) {
            console.error('[CRITICAL COMMAND ERROR]', err);
            await interaction.editReply({
                content: '❌ **Auth Failure:** Your session has expired. Please run `/xbox-auth` again.'
            });
        }
    },
};