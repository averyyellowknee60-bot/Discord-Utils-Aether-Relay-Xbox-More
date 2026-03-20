module.exports = {
    data: {
        name: 'realm_manage_panel'
    },
    async execute(interaction, client) {
        const realmId = interaction.customId.split('_')[3]; // Adjust index based on ID length
        const configCommand = client.commands.get('realm-config');
        
        if (configCommand) {
            // Mocking the options so the config command works
            interaction.options = {
                getString: () => realmId
            };
            await configCommand.execute(interaction, client);
        }
    }
};