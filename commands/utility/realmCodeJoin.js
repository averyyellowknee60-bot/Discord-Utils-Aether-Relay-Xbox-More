const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { Authflow, Titles } = require('prismarine-auth');
const bedrock = require('bedrock-protocol');
const { RealmAPI } = require('prismarine-realms'); 
const path = require('path');

const cachePath = path.join(__dirname, '../../auth_cache');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('realm-code-join')
        .setDescription('Materialize AetherBot via Invite Code.')
        .addStringOption(opt => opt.setName('code').setDescription('Invite Code (e.g., iGg3krrBKAgojhA)').setRequired(true))
        .addStringOption(opt => opt.setName('spammessage').setDescription('Message to broadcast'))
        .addIntegerOption(opt => opt.setName('count').setDescription('Repeat count (Max 50)').setMaxValue(50))
        .addIntegerOption(opt => opt.setName('delay').setDescription('Delay in ms (Default 1000)').setMinValue(500)),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        let inviteCode = interaction.options.getString('code');
        // Clean URL if pasted
        inviteCode = inviteCode.replace(/https?:\/\/realms\.gg\//g, '').replace(/realms\.gg\//g, '');
        
        const spamMessage = interaction.options.getString('spammessage');
        const count = interaction.options.getInteger('count') || 5;
        const delay = interaction.options.getInteger('delay') || 1000;
        const sessionName = `aether_session_${interaction.guild.id}`;

        const statusEmbed = new EmbedBuilder()
            .setAuthor({ name: 'AetherOS | Injection Protocol', iconURL: client.user.displayAvatarURL() })
            .setTitle('📡 Initializing Infiltration...')
            .setColor('#f1c40f')
            .setDescription('🔄 **Step 1:** Resolving Realm Address...')
            .setTimestamp();

        await interaction.editReply({ embeds: [statusEmbed] });

        try {
            const authflow = new Authflow(sessionName, cachePath, { 
                authTitle: Titles.MinecraftNintendoSwitch, 
                deviceType: 'Nintendo',
                flow: 'live'
            });

            // --- THE FIX: MANUAL REALM RESOLUTION ---
            const api = RealmAPI.from(authflow, 'bedrock');
            const realm = await api.getRealmFromInvite(inviteCode);
            
            // This pulls the actual AWS/Azure IP and Port used by the Realm
            const address = await realm.getAddress(); 

            statusEmbed.setDescription(`🔄 **Step 2:** Breaking Walls at \`${address.host}\`...`)
                .setColor('#3498db')
                .addFields({ name: 'Target Realm', value: `\`${realm.name}\``, inline: true });
            await interaction.editReply({ embeds: [statusEmbed] });

            // Create client with DIRECT IP to bypass syntax errors
            const bot = bedrock.createClient({
                host: address.host,
                port: address.port,
                authflow: authflow,
                version: '1.21.0',
                offline: false,
                
                // --- CRITICAL STABILITY SETTINGS ---
                raknetBackend: 'raknet-node', // Required for stable socket syntax
                useRaknetWorker: true,        // Prevents main thread lag
                mtu: 1100,                    // Lower MTU = Higher compatibility with Realm proxies
                skipPing: true,               // Realms often ignore pings, causing the "Timed Out" error
                connectTimeout: 120000,       // 2 Minutes; Realms take a long time to start up
                conLog: null
            });

            client.currentRealmBot = bot;

            // --- LISTENERS ---
            bot.on('spawn', async () => {
                statusEmbed.setTitle('✅ Injection Successful')
                    .setDescription(`🟢 **Status:** Active in **${realm.name}**\n🚀 **Executing Spam...**`)
                    .setColor('#2ecc71');
                await interaction.editReply({ embeds: [statusEmbed] });

                if (spamMessage) {
                    for (let i = 0; i < count; i++) {
                        if (client.currentRealmBot) {
                            bot.chat(spamMessage);
                            await new Promise(res => setTimeout(res, delay));
                        }
                    }
                    statusEmbed.setFooter({ text: 'Spam Protocol Completed.' });
                    await interaction.editReply({ embeds: [statusEmbed] });
                }
            });

            bot.on('error', (err) => {
                console.error(`[AetherOS Error]`, err);
                statusEmbed.setTitle('❌ Injection Failed')
                    .setDescription(`🔴 **Error:** \`${err.message}\` (Check if the bot is banned)`)
                    .setColor('#e74c3c');
                interaction.editReply({ embeds: [statusEmbed] }).catch(() => null);
                client.currentRealmBot = null;
            });

            bot.on('disconnect', (packet) => {
                statusEmbed.setTitle('📡 Connection Lost')
                    .setDescription(`⚠️ **Reason:** ${packet.reason || 'Kicked or Realm Closed'}`)
                    .setColor('#95a5a6');
                interaction.editReply({ embeds: [statusEmbed] }).catch(() => null);
                client.currentRealmBot = null;
            });

        } catch (err) {
            console.error('[AetherOS Resolution Error]', err);
            statusEmbed.setTitle('❌ Realm Lookup Failed')
                .setDescription(`🔴 **Error:** Resolution failed. The code may be expired or the bot account is banned.`)
                .setColor('#c0392b');
            await interaction.editReply({ embeds: [statusEmbed] });
        }
    }
};