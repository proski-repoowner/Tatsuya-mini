const { cmd } = require('../command');
const os = require('os');
const { runtime } = require('../lib/functions');

const BOT_NAME = 'THENUVA X MD';
const OWNER = 'Dilshan Ashinsa';
const VERSION = '2.0.0';
const PREFIX = '.';

// Optional direct image URL.
// Leave empty to send text only.
const ALIVE_IMAGE = '';

cmd({
    pattern: 'alive',
    alias: ['status', 'runtime', 'uptime'],
    desc: 'Check bot uptime and system status',
    category: 'main',
    react: '⚡',
    filename: __filename
}, async (conn, mek, m, { from, pushname, reply }) => {
    try {
        const memory = process.memoryUsage();
        const usedMemory = (memory.rss / 1024 / 1024).toFixed(2);
        const totalMemory = (os.totalmem() / 1024 / 1024).toFixed(0);

        const status = [
            '╭━━〔 ᴛʜᴇɴᴜᴠᴀ x ᴍᴅ 〕━━╮',
            '',
            `👋 Hello, ${pushname || 'User'}! ❤️`,
            '',
            '╭─〔 ʙᴏᴛ sᴛᴀᴛᴜs 〕',
            '┃',
            '┃ 🟢 Status : *ONLINE*',
            `┃ 🤖 Bot : *${BOT_NAME}*`,
            `┃ 🔖 Version : *${VERSION}*`,
            '┃ 📟 Platform : *Node.js*',
            `┃ ⏱️ Uptime : *${runtime(process.uptime())}*`,
            `┃ 💾 RAM Usage : *${usedMemory} MB*`,
            `┃ 🖥️ Total RAM : *${totalMemory} MB*`,
            `┃ ⌨️ Prefix : *${PREFIX}*`,
            `┃ 👑 Owner : *${OWNER}*`,
            '┃',
            '╰━━━━━━━━━━━━━━━━━━',
            '',
            '✨ *THENUVA X MD is running successfully!*',
            '',
            '> ᴛʜᴇɴᴜᴠᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ Dilshan Ashinsa'
        ].join('\n');

        if (ALIVE_IMAGE && /^https?:\/\//i.test(ALIVE_IMAGE)) {
            await conn.sendMessage(
                from,
                {
                    image: { url: ALIVE_IMAGE },
                    caption: status
                },
                { quoted: mek }
            );
        } else {
            await conn.sendMessage(
                from,
                { text: status },
                { quoted: mek }
            );
        }
    } catch (error) {
        console.error('[ALIVE ERROR]', error.stack || error.message);

        if (typeof reply === 'function') {
            await reply('❌ Alive command failed. Check GitHub Actions logs.');
        }
    }
});
