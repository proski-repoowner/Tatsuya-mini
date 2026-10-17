const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
module.exports = {
SESSION_ID: process.env.SESSION_ID || "THENUVA-XMD=pzwRlYYQ#Ei76I1aj_-kcqQ0JDbczj0TaNQlgiDJuE4qMqU2j1wU",
};
