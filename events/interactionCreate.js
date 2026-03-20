const { MessageFlags, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Helper function for uniform error reporting
        const handleError = async (err, type) => {
            console.error(`\x1b[31m[INTERACTION ERROR]\x1b[0m Failed to execute ${type}:`, err);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#800000') // Your Maroon theme
                .setTitle('⚠️ System Execution Error')
                .setDescription('An unexpected error occurred within the AetherOS core while processing this request.')
                .setFooter({ text: 'Error logged to terminal' });

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] }).catch(() => null);
            } else {
                await interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] }).catch(() => null);
            }
        };

        // 1. Handle Slash Commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, client);
            } catch (err) {
                await handleError(err, `Command: ${interaction.commandName}`);
            }
        }

      // 2. Handle Dynamic Buttons
else if (interaction.isButton()) {
    // Look for a button that matches the start of the customId
    const button = client.buttons.find(btn => interaction.customId.startsWith(btn.data.name));
    if (!button) return;

    try {
        await button.execute(interaction, client);
    } catch (err) {
        await handleError(err, `Button: ${interaction.customId}`);
    }
}

// 3. Handle Select Menus
else if (interaction.isStringSelectMenu() || interaction.isAnySelectMenu()) {
    const menu = client.selectMenus.find(m => interaction.customId.startsWith(m.data.name));
    if (!menu) return;

    try {
        await menu.execute(interaction, client);
    } catch (err) {
        await handleError(err, `SelectMenu: ${interaction.customId}`);
    }
}

// 4. Handle Modals
else if (interaction.isModalSubmit()) {
    const modal = client.modals.find(m => interaction.customId.startsWith(m.data.name));
    if (!modal) return;

    try {
        await modal.execute(interaction, client);
    } catch (err) {
        await handleError(err, `Modal: ${interaction.customId}`);
    }
}
    },
};