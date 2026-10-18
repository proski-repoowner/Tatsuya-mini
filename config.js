const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
module.exports = {
SESSION_ID: 'THENUVA-XMD=https://mega.nz/file/k2JgGZoD#Y1cmIPcsiujcbB8qWC7yC_jNM8HBqOAzHOp4qjjDPLM',
ALIVE_IMG: process.env.ALIVE_IMG || "",
ALIVE_MSG: process.env.ALIVE_MSG || "",
BOT_OWNER: '94772194789',  // Replace with the owner's phone number



};
