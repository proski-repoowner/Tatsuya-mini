const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
module.exports = {
SESSION_ID: 'THENUVA-XMD=https://mega.nz/file/9v4RVJbD#Xqxn0rAP008PGc_lGC3lbSMYfftWzMfAFA8BFVAwuqw',
BOT_OWNER: '94772194789',  // Replace with the owner's phone number
};
