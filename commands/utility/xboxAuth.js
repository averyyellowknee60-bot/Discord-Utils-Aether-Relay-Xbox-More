const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { Authflow, Titles } = require('prismarine-auth');
const path = require('path');

const cachePath = path.join(__dirname, '../../auth_cache');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xbox-auth')
        .setDescription('Link an Xbox account specifically for this server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        // Generate a filename based on the Server ID to keep it unique
        const sessionName = `aether_session_${interaction.guild.id}`;
        let isAuthorized = false;
        let updateInterval;

        try {
            const authflow = new Authflow(
                sessionName, 
                cachePath, 
                { 
                    authTitle: Titles.MinecraftNintendoSwitch, 
                    deviceType: 'Nintendo',
                    flow: 'live'
                },
                async (code) => {
                    let timeLeft = 300; 

                    const updateEmbed = async () => {
                        const minutes = Math.floor(timeLeft / 60);
                        const seconds = timeLeft % 60;
                        const timeString = `${minutes}m ${seconds.toString().padStart(2, '0')}s`;

                        const authEmbed = new EmbedBuilder()
                            .setAuthor({ name: 'AetherOS | Identity Manager', iconURL: client.user.displayAvatarURL() })
                            .setTitle('🔐 Account Link Required')
                            .setColor(timeLeft < 60 ? '#ff4747' : '#107C10')
                            .setDescription(`Establishing a persistent link for **${interaction.guild.name}**.\n\nPlease complete the Microsoft authorization below:`)
                            .addFields(
                                { name: '🌐 Step 1: Open Link', value: `[microsoft.com/link](${code.verification_uri})`, inline: true },
                                { name: '🔑 Step 2: Enter Code', value: `\`${code.user_code}\``, inline: true },
                                { name: '⏳ Time Remaining', value: `\`${timeString}\``, inline: true }
                            )
                            .setFooter({ text: `Session ID: ${sessionName.toUpperCase()}` })
                            .setTimestamp();

                        await interaction.editReply({ embeds: [authEmbed] }).catch(() => {
                            clearInterval(updateInterval);
                        });
                    };

                    await updateEmbed();

                    updateInterval = setInterval(async () => {
                        timeLeft -= 5;
                        if (timeLeft <= 0 || isAuthorized) {
                            clearInterval(updateInterval);
                        } else {
                            await updateEmbed();
                        }
                    }, 5000);
                }
            );

            // Block until browser login is complete
            const xsts = await authflow.getXboxToken();
            isAuthorized = true;
            clearInterval(updateInterval);

            const successEmbed = new EmbedBuilder()
                .setAuthor({ name: 'AetherOS | Identity Manager', iconURL: client.user.displayAvatarURL() })
                .setTitle('✅ Authorization Bound')
                .setColor('#2ecc71')
                .setDescription(`Successfully linked account to this server.\n\n**Server:** \`${interaction.guild.name}\`\n**Identity:** \`${xsts.userHash}\`\n**Registry:** \`${sessionName}.json\``)
                .setFooter({ text: 'All Realm/Server tools for this guild are now active.' })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            clearInterval(updateInterval);
            console.error('[AUTH ERROR]', error);
            await interaction.editReply({ 
                content: '❌ **Link Failed:** The authorization window timed out or was cancelled.',
                embeds: [] 
            });
        }
    },
};