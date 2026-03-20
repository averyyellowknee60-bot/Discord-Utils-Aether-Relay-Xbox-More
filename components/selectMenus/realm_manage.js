const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'realm_manage' // This matches the start of your CustomID
    },
    async execute(interaction, client) {
        const realmId = interaction.customId.split('_')[2];
        const action = interaction.values[0];

        if (action === 'edit_name') {
            const modal = new ModalBuilder()
                .setCustomId(`modal_realm_name_${realmId}`)
                .setTitle('AetherOS | Update Name');

            const input = new TextInputBuilder()
                .setCustomId('realm_new_name_input')
                .setLabel("Enter New Name")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return await interaction.showModal(modal);
        }

        if (action === 'edit_desc') {
            const modal = new ModalBuilder()
                .setCustomId(`modal_realm_desc_${realmId}`)
                .setTitle('AetherOS | Update Description');

            const input = new TextInputBuilder()
                .setCustomId('realm_new_desc_input')
                .setLabel("Enter New Description")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return await interaction.showModal(modal);
        }
    }
};