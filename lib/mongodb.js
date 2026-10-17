require('dotenv').config();

const defaultEnvVariables = {
    ALIVE_IMG: 'https://telegra.ph/file/6d91fd79aab5663032b97.jpg',
    ALIVE_MSG: 'Hello, I am alive now!!',
    PREFIX: '.',
    AUTO_READ_STATUS: 'true',
    MODE: 'private'
};

// Set defaults only when environment variables are missing.
for (const [key, value] of Object.entries(defaultEnvVariables)) {
    if (process.env[key] === undefined || process.env[key] === '') {
        process.env[key] = value;
    }
}

async function connectDB() {
    console.log('✅ Database connection skipped (MongoDB removed)');
    console.log('✅ Default environment variables loaded');
}

module.exports = connectDB;
