const fs = require('fs');
const path = require('path');
const pluginPath = path.join(__dirname, '../node_modules/expo-sqlite/app.plugin.js');
try {
  fs.writeFileSync(pluginPath, 'module.exports = (config) => config;');
  console.log('✅ Patched expo-sqlite');
} catch(e) {
  console.log('Skip patch:', e.message);
}
