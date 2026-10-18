const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
module.exports = {
SESSION_ID: 'THENUVA-XMD=https://mega.nz/file/pzQ3hQTK#BGRuWSE0cU5prIRtdou-nGqBgoZw_7MaRaJq5g-Pbx4',
BOT_OWNER: '94772194789',  // Replace with the owner's phone number

};
