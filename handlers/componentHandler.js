const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    // Standardize collections (Ensure they exist in index.js too!)
    client.buttons = client.buttons || new Map();
    client.selectMenus = client.selectMenus || new Map();
    client.modals = client.modals || new Map();

    const componentPath = path.join(__dirname, '../components');
    if (!fs.existsSync(componentPath)) return;

    const componentFolders = fs.readdirSync(componentPath);
    const componentStatus = [];
    let loadedCount = 0;

    const color = {
        cyan: '\x1b[36m',
        green: '\x1b[32m',
        red: '\x1b[31m',
        reset: '\x1b[0m',
        yellow: '\x1b[33m',
        magenta: '\x1b[35m',
        blue: '\x1b[34m'
    };

    console.log(`${color.cyan}=========================================`);
    console.log(`${color.magenta}   🧩 LOADING INTERACTIVE COMPONENTS... `);
    console.log(`${color.cyan}=========================================${color.reset}`);

    for (const folder of componentFolders) {
        const folderPath = path.join(componentPath, folder);
        if (!fs.lstatSync(folderPath).isDirectory()) continue;

        const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
        console.log(`${color.blue}📁 Type: ${folder.toUpperCase()}${color.reset}`);

        for (const file of files) {
            const filePath = path.join(folderPath, file);
            
            try {
                // Prevent stale code on reload
                delete require.cache[require.resolve(filePath)];
                const component = require(filePath);

                if (component.data && component.data.name) {
                    // Route to correct collection based on folder name
                    switch (folder) {
                        case 'buttons':
                            client.buttons.set(component.data.name, component);
                            break;
                        case 'selectMenus':
                            client.selectMenus.set(component.data.name, component);
                            break;
                        case 'modals':
                            client.modals.set(component.data.name, component);
                            break;
                    }

                    componentStatus.push({ 
                        "📦 Component": file, 
                        "🆔 ID": component.data.name, 
                        "🎭 Type": folder, 
                        "⚙️ Status": '✅ ONLINE' 
                    });
                    loadedCount++;
                } else {
                    componentStatus.push({ 
                        "📦 Component": file, 
                        "🆔 ID": '---', 
                        "🎭 Type": folder, 
                        "⚙️ Status": '⚠️ NO DATA' 
                    });
                }
            } catch (error) {
                componentStatus.push({ 
                    "📦 Component": file, 
                    "🆔 ID": 'ERROR', 
                    "🎭 Type": folder, 
                    "⚙️ Status": '🔥 CRASHED' 
                });
                console.error(`${color.red}[COMPONENT ERROR]${color.reset} ${file}:`, error.message);
            }
        }
    }

    if (componentStatus.length > 0) {
        console.table(componentStatus);
    }

    console.log(`${color.cyan}-----------------------------------------`);
    console.log(`${color.green}✨ Total Components Active: ${loadedCount}${color.reset}`);
    console.log(`${color.cyan}-----------------------------------------${color.reset}\n`);
};