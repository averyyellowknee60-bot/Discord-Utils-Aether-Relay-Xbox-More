const { Authflow, Titles } = require('prismarine-auth');
const { RealmAPI } = require('prismarine-realms');
const path = require('path');

module.exports = {
    data: {
        name: 'modal_realm' // Matches customId start
    },
    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        const parts = interaction.customId.split('_');
        const type = parts[2]; // 'name' or 'desc'
        const realmId = parts[3];
        const newValue = interaction.fields.getTextInputValue(type === 'name' ? 'realm_new_name_input' : 'realm_new_desc_input');

        try {
            const cachePath = path.join(__dirname, '../../auth_cache');
            const sessionName = `aether_session_${interaction.guild.id}`;

            const authflow = new Authflow(sessionName, cachePath, { 
                authTitle: Titles.MinecraftJava, flow: 'live', deviceType: 'Win32' 
            });
            const realmApi = RealmAPI.from(authflow, 'bedrock');
            const realms = await realmApi.getRealms();
            const realm = realms.find(r => r.id.toString() === realmId);

            await realm.updateConfig({
                name: type === 'name' ? newValue : realm.name,
                description: type === 'desc' ? newValue : realm.description
            });

            await interaction.editReply({ content: `✅ **AetherOS Registry Updated:** ${type} is now \`${newValue}\`` });
        } catch (err) {
            await interaction.editReply({ content: `❌ **System Error:** ${err.message}` });
        }
    }
};