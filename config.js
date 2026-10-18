const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, 'config.env');

if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
}

function convertToBool(text, fault = 'true') {
    return String(text ?? fault).toLowerCase() === 'true';
}

module.exports = {
    SESSION_ID: String(
        process.env.SESSION_ID || 'THENUVA-XMD=https://mega.nz/file/9v4RVJbD#Xqxn0rAP008PGc_lGC3lbSMYfftWzMfAFA8BFVAwuqw'
    ).trim(),

    BOT_OWNER: String(
        process.env.BOT_OWNER || '94772194789'
    ).replace(/\D/g, ''),

    PREFIX: process.env.PREFIX || '.',

    MODE: process.env.MODE || 'public',

    AUTO_READ: convertToBool(
        process.env.AUTO_READ,
        'false'
    )
};
