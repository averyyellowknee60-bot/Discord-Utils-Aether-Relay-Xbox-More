const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { chromium } = require('playwright');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('generate-ms')
        .setDescription('Provision a new Microsoft Account via AetherOS.')
        .addStringOption(opt => opt.setName('email').setDescription('Target Email').setRequired(true))
        .addStringOption(opt => opt.setName('password').setDescription('Account Password').setRequired(true)),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const email = interaction.options.getString('email');
        const password = interaction.options.getString('password');
        const sessionID = Date.now();

        const statusEmbed = new EmbedBuilder()
            .setAuthor({ name: 'AetherOS | Account Provisioning', iconURL: client.user.displayAvatarURL() })
            .setTitle('🌐 Microsoft Registry Protocol')
            .setDescription('📡 **Status:** Initializing stealth instance...')
            .setColor('#00a4ef')
            .setTimestamp();

        const updateStatus = async (msg, color = '#00a4ef') => {
            statusEmbed.setDescription(msg).setColor(color);
            await interaction.editReply({ embeds: [statusEmbed] }).catch(() => null);
        };

        const getDiscordCode = async (header) => {
            await updateStatus(`✉️ **${header}**\n\nMicrosoft sent a code to **${email}**.\n\n**Type the code in this channel now.**`, '#f1c40f');
            return new Promise((resolve, reject) => {
                const filter = m => m.author.id === interaction.user.id;
                const collector = interaction.channel.createMessageCollector({ filter, time: 240000, max: 1 });
                
                collector.on('collect', async m => {
                    const c = m.content.trim();
                    if (m.deletable) await m.delete().catch(() => null);
                    resolve(c);
                });
                
                collector.on('end', collected => {
                    if (collected.size === 0) reject(new Error('No code received within timeout.'));
                });
            });
        };

        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 }
        });
        const page = await context.newPage();

        try {
            await page.goto('https://signup.live.com/signup', { waitUntil: 'networkidle' });

            await updateStatus(`🔎 **Step 2:** Validating email \`${email}\`...`);
            const emailInput = page.locator('input[type="email"], input[name="MemberName"]');
            await emailInput.waitFor({ state: 'visible', timeout: 15000 });
            await emailInput.fill(email);
            await page.keyboard.press('Enter');

            await updateStatus(`🔓 **Step 3:** Analyzing security challenge...`);

            // LOCATORS UPDATED FOR THE SCREENSHOT PROVIDED
            const passField = page.locator('input[type="password"], input[name="Password"]');
            // This now looks for the specific boxes shown in your image
            const codeBoxGrid = page.locator('input[id*="VerificationCode"], input[name*="VerificationCode"], input[data-index="0"]');
            const errorBox = page.locator('#MemberNameError, #EmailAddressError');

            const nextAction = await Promise.race([
                passField.waitFor({ state: 'attached', timeout: 35000 }).then(() => 'password'),
                codeBoxGrid.first().waitFor({ state: 'attached', timeout: 35000 }).then(() => 'code'),
                page.waitForSelector('text="Verify email"', { timeout: 35000 }).then(() => 'code'),
                errorBox.waitFor({ state: 'visible', timeout: 35000 }).then(() => 'error')
            ]).catch(() => 'timeout');

            if (nextAction === 'error') {
                const msg = await errorBox.textContent();
                return await updateStatus(`❌ **Registry Error:** ${msg.trim()}`, '#ff0000');
            }

            if (nextAction === 'timeout') {
                const screen = `stalled_${sessionID}.png`;
                await page.screenshot({ path: screen });
                throw new Error(`Flow stalled at unrecognized screen. Saved: ${screen}`);
            }

            // --- PATH: VERIFY EMAIL (As seen in your screenshot) ---
            if (nextAction === 'code') {
                const code = await getDiscordCode("Verify your email");
                await updateStatus(`🔄 **Step 4:** Injecting code sequence...`);
                
                // We click the first box and type the code. MS usually moves focus automatically.
                const firstBox = codeBoxGrid.first();
                await firstBox.waitFor({ state: 'visible' });
                await firstBox.click();
                await page.keyboard.type(code, { delay: 150 }); 
                
                // If it doesn't auto-submit, press Enter
                await page.keyboard.press('Enter');

                // Wait for password if it wasn't asked for yet
                try {
                    await updateStatus(`🔑 **Step 5:** Finalizing credentials...`);
                    await passField.waitFor({ state: 'visible', timeout: 15000 });
                    await passField.fill(password);
                    await page.keyboard.press('Enter');
                } catch (e) { /* Password might have been handled already */ }

            // --- PATH: PASSWORD FIRST ---
            } else if (nextAction === 'password') {
                await updateStatus(`🔑 **Step 4:** Injecting password...`);
                await passField.fill(password);
                await page.keyboard.press('Enter');

                await updateStatus(`✉️ **Step 5:** Waiting for verification screen...`);
                await codeBoxGrid.first().waitFor({ state: 'visible', timeout: 20000 });

                const code = await getDiscordCode("Final Verification");
                await codeBoxGrid.first().click();
                await page.keyboard.type(code, { delay: 150 });
                await page.keyboard.press('Enter');
            }

            // --- STEP 6: NAMES ---
            try {
                await page.waitForSelector('input[name="FirstName"]', { timeout: 10000 });
                await page.fill('input[name="FirstName"]', 'Aether');
                await page.fill('input[name="LastName"]', 'User');
                await page.keyboard.press('Enter');
            } catch (e) { /* MS skips names sometimes */ }

            await updateStatus(`🔄 **Step 6:** Syncing with MS registry...`);
            await page.waitForTimeout(10000); 

            await updateStatus(`✅ **Success!** Microsoft account created.\n\n**User:** \`${email}\`\n**Pass:** \`${password}\``, '#2ecc71');

        } catch (err) {
            console.error(`[AetherOS Error]`, err);
            const path = `crash_${sessionID}.png`;
            await page.screenshot({ path: path });
            await updateStatus(`⚠️ **Registry Crash:** ${err.message}\n*Saved as ${path}*`, '#ff0000');
        } finally {
            await browser.close().catch(() => null);
        }
    }
};