const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
module.exports = {
SESSION_ID: process.env.SESSION_ID || "THENUVA-XMD=czBH1bQK#OG-3JxyiSsbglBrkMRc8UKXb8KZSlo0dXs0FJ8p15AA",
};
