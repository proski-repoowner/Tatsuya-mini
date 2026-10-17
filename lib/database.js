require('dotenv').config();

const defaultEnvVariables = {
    ALIVE_IMG: 'https://telegra.ph/file/6d91fd79aab5663032b97.jpg',
    ALIVE_MSG: 'Hello, I am alive now!!',
    PREFIX: '.',
    AUTO_READ_STATUS: 'true',
    MODE: 'private'
};

// Read environment variables
const readEnv = async () => {
    const envVars = { ...defaultEnvVariables };

    for (const key of Object.keys(defaultEnvVariables)) {
        if (process.env[key] !== undefined && process.env[key] !== '') {
            envVars[key] = process.env[key];
        }
    }

    return envVars;
};

// Update an environment variable for the current process
const updateEnv = async (key, newValue) => {
    if (typeof key !== 'string' || !key.trim()) {
        throw new Error('Environment variable key is required');
    }

    if (typeof newValue !== 'string') {
        newValue = String(newValue);
    }

    process.env[key] = newValue;
    console.log(`Updated environment variable: ${key}`);
};

module.exports = {
    readEnv,
    updateEnv
};
