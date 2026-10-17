const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
module.exports = {
SESSION_ID: process.env.SESSION_ID || "wSkEyBCC#NKMuLwlRdaALlai2zH6cgYJRvDcKToRBJrGTza-ub-4",
MONGODB: process.env.MONGODB || "mongodb+srv://Dilshan:<Rathnayake@cluster0.slp4i1y.mongodb.net/",
};
