require('dotenv').config();

const defaults = {
    ALIVE_IMG: 'https://telegra.ph/file/6d91fd79aab5663032b97.jpg',
    ALIVE_MSG: 'Hello, I am alive now!!',
    PREFIX: '.',
    AUTO_READ_STATUS: 'true',
    MODE: 'private'
};

async function readEnv() {
    return { ...defaults, ...Object.fromEntries(
        Object.keys(defaults)
            .filter(key => process.env[key] !== undefined && process.env[key] !== '')
            .map(key => [key, process.env[key]])
    ) };
}

async function updateEnv(key, value) {
    if (!Object.prototype.hasOwnProperty.call(defaults, key)) {
        throw new Error(`Unsupported environment setting: ${key}`);
    }

    process.env[key] = String(value);
    console.log(`Updated environment setting: ${key}`);
}

module.exports = { readEnv, updateEnv };
