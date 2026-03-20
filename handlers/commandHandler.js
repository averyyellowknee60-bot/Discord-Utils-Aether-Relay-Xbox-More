const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const commandsPath = path.join(__dirname, '../commands');
    const commandFolders = fs.readdirSync(commandsPath);
    
    const commandStatus = [];
    let successCount = 0;
    let failCount = 0;

    const color = {
        green: '\x1b[32m',
        red: '\x1b[31m',
        cyan: '\x1b[36m',
        reset: '\x1b[0m',
        yellow: '\x1b[33m',
        magenta: '\x1b[35m',
        blue: '\x1b[34m'
    };

    // Fancy Header
    console.log(`${color.cyan}=========================================`);
    console.log(`${color.magenta}   🚀 LOADING APPLICATION COMMANDS...   `);
    console.log(`${color.cyan}=========================================${color.reset}`);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        
        // Skip files that aren't folders (like a random .txt or .md file)
        if (!fs.lstatSync(folderPath).isDirectory()) continue;

        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        console.log(`${color.blue}📂 Category: ${folder.toUpperCase()}${color.reset}`);

        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            
            try {
                // Clear cache so if you restart, changes are picked up
                delete require.cache[require.resolve(filePath)];
                const command = require(filePath);

                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    
                    commandStatus.push({ 
                        "📦 File": file, 
                        "🏷️ Name": `/${command.data.name}`, 
                        "📁 Folder": folder,
                        "⚙️ Status": '✅ READY' 
                    });
                    successCount++;
                } else {
                    commandStatus.push({ 
                        "📦 File": file, 
                        "🏷️ Name": '---', 
                        "📁 Folder": folder,
                        "⚙️ Status": '⚠️ INVALID' 
                    });
                    failCount++;
                    console.warn(`${color.yellow}[WARN]${color.reset} "${file}" is missing 'data' or 'execute'.`);
                }
            } catch (error) {
                commandStatus.push({ 
                    "📦 File": file, 
                    "🏷️ Name": 'ERROR', 
                    "📁 Folder": folder,
                    "⚙️ Status": '🔥 CRASHED' 
                });
                failCount++;
                console.error(`${color.red}[ERROR]${color.reset} Failed to initialize ${file}:\n`, error.message);
            }
        }
    }

    // Display the detailed table
    console.table(commandStatus);

    // Final Summary Footer
    console.log(`${color.cyan}-----------------------------------------`);
    console.log(`${color.green}✅ Success: ${successCount}${color.reset} | ${color.red}❌ Failed: ${failCount}${color.reset}`);
    console.log(`${color.magenta}✨ Command Handler: All systems clear!${color.reset}`);
    console.log(`${color.cyan}-----------------------------------------${color.reset}\n`);
};