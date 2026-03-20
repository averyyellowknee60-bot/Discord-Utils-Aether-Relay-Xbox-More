const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const eventsPath = path.join(__dirname, '../events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    const eventStatus = [];
    let successCount = 0;
    let failCount = 0;

    const color = {
        cyan: '\x1b[36m',
        green: '\x1b[32m',
        red: '\x1b[31m',
        reset: '\x1b[0m',
        magenta: '\x1b[35m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m'
    };

    console.log(`${color.cyan}=========================================`);
    console.log(`${color.magenta}   📡 INITIALIZING SYSTEM EVENTS...      `);
    console.log(`${color.cyan}=========================================${color.reset}`);

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        
        try {
            // Clear cache for hot-reloading support
            delete require.cache[require.resolve(filePath)];
            const event = require(filePath);

            if (event.name && typeof event.execute === 'function') {
                // Ensure we don't accidentally bind the same event twice on restart
                client.removeAllListeners(event.name);

                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args, client));
                } else {
                    client.on(event.name, (...args) => event.execute(...args, client));
                }
                
                eventStatus.push({ 
                    "📜 Event File": file, 
                    "🔗 Trigger": event.name, 
                    "⏲️ Mode": event.once ? 'ONCE' : 'ON', 
                    "⚙️ Status": '✅ ACTIVE' 
                });
                successCount++;
            } else {
                eventStatus.push({ 
                    "📜 Event File": file, 
                    "🔗 Trigger": '---', 
                    "⏲️ Mode": 'N/A', 
                    "⚙️ Status": '❌ INVALID' 
                });
                failCount++;
                console.warn(`${color.yellow}[WARN]${color.reset} ${file} is missing "name" or "execute".`);
            }
        } catch (error) {
            eventStatus.push({ 
                "📜 Event File": file, 
                "🔗 Trigger": 'ERROR', 
                "⏲️ Mode": 'N/A', 
                "⚙️ Status": '🔥 CRASH' 
            });
            failCount++;
            console.error(`${color.red}[EVENT ERROR]${color.reset} Failed to load ${file}:\n`, error.message);
        }
    }

    // Display formatted table
    if (eventStatus.length > 0) {
        console.table(eventStatus);
    }

    // Final Summary
    console.log(`${color.cyan}-----------------------------------------`);
    console.log(`${color.green}✅ Ready: ${successCount}${color.reset} | ${color.red}❌ Failed: ${failCount}${color.reset}`);
    console.log(`${color.magenta}📡 Event Handler: All listeners bound.${color.reset}`);
    console.log(`${color.cyan}-----------------------------------------${color.reset}\n`);
};