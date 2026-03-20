const { 
    SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags, 
    ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder 
} = require('discord.js');
const { Authflow, Titles } = require('prismarine-auth');
const { RealmAPI } = require('prismarine-realms');
const path = require('path');

const cachePath = path.join(__dirname, '../../auth_cache');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('realm-config')
        .setDescription('Open the AetherOS Realm Management Dashboard.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => 
            option.setName('realm_id')
                .setDescription('The ID of the Realm to manage.')
                .setRequired(true)),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const realmId = interaction.options.getString('realm_id');
        const sessionName = `aether_session_${interaction.guild.id}`;

        try {
            const authflow = new Authflow(sessionName, cachePath, { 
                authTitle: Titles.MinecraftJava, 
                flow: 'live',
                deviceType: 'Win32' 
            });
            
            const realmApi = RealmAPI.from(authflow, 'bedrock');
            const allRealms = await realmApi.getRealms();
            const realm = allRealms.find(r => r.id.toString() === realmId);

            if (!realm) throw new Error("Realm not found or unauthorized.");

            const embed = new EmbedBuilder()
                .setAuthor({ name: 'AetherOS | Realm Dashboard', iconURL: client.user.displayAvatarURL() })
                .setTitle(`🖥️ Managing: ${realm.name}`)
                .setColor('#800000')
                .setThumbnail(realm.activeSlot === 1 ? 'https://i.imgur.com/v09S8yP.png' : null) // Optional icon
                .addFields(
                    { name: '🆔 Realm ID', value: `\`${realm.id}\``, inline: true },
                    { name: '🔗 Join Code', value: `\`${realm.mainInviteCode || 'Private'}\``, inline: true },
                    { name: '🛰️ Status', value: `\`${realm.state}\``, inline: true },
                    { name: '📝 Description', value: `\`${realm.description || 'No description set.'}\`` }
                )
                .setFooter({ text: `Registry: ${sessionName.toUpperCase()}` })
                .setTimestamp();

            // Create the Select Menu for actions
            const select = new StringSelectMenuBuilder()
                .setCustomId(`realm_manage_${realmId}`)
                .setPlaceholder('Select a configuration action...')
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Edit Name')
                        .setDescription('Change the display name of the Realm.')
                        .setValue('edit_name')
                        .setEmoji('📝'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Edit Description')
                        .setDescription('Change the Realm bio/rules.')
                        .setValue('edit_desc')
                        .setEmoji('📄'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Reset Invite Code')
                        .setDescription('Instantly generate a new join link.')
                        .setValue('reset_code')
                        .setEmoji('🔑'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Toggle State')
                        .setDescription('Open or Close the Realm.')
                        .setValue('toggle_state')
                        .setEmoji('🔌')
                );

            const row = new ActionRowBuilder().addComponents(select);

            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('[CONFIG ERROR]', error);
            await interaction.editReply({ content: `❌ **Access Denied:** ${error.message}` });
        }
    },
};