const fs = require('fs');
const path = require('path');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
module.exports = {
    SESSION_ID: process.env.SESSION_ID || "",
    ALIVE_IMG: process.env.ALIVE_IMG || path.join(__dirname, 'Assets', 'IMG', 'Alive.png'),
    WELCOME_IMG: process.env.WELCOME_IMG || path.join(__dirname, 'Assets', 'IMG', 'Welcome.png'),
    MENU_IMG: process.env.MENU_IMG || path.join(__dirname, 'Assets', 'IMG', 'Menu.png'),
    ALIVE_MSG: process.env.ALIVE_MSG || "*Hello👋 Olya Assistant Is Alive Now😍*",
    BOT_NUMBER: process.env.BOT_NUMBER || '94742053080',
    OWNER_NUMBER: process.env.OWNER_NUMBER || '94779912589',
    OWNER_NAME: process.env.OWNER_NAME || "Hansaka",
    GEMINI_API_KEYS: process.env.GEMINI_API_KEYS ? process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()) : [],

};
