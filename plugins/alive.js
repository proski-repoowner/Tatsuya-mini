const { cmd, commands } = require('../command');
const os = require("os");
const { runtime } = require('../lib/functions');

cmd({
    pattern: "alive",
    alias: ["status", "runtime", "uptime"],
    desc: "Check uptime and system status",
    category: "main",
    react: "👨🏻‍💻",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        // Generate system status message
        const status = `┏━❮  NORMAL WHATSAPP BOT ❯━
┃◈┃🤖 ʙᴏᴛ ɴᴀᴍᴇ : *normal whatsapp bot*
┃◈┃🔖 ᴠᴇʀsɪᴏɴ : *1.0.0 beta*
┃◈┃📟 ᴘʟᴀᴛғᴏʀᴍ : *replit*
┃◈┃👨‍💻ᴏᴡɴᴇʀ: *Dilshan Ashinsa*
┃◈┃📆 ʀᴜɴᴛɪᴍᴇ : ${runtime(process.uptime())} 
┃◈┃📈ʀᴀᴍ ᴜsᴀɢᴇ: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(require('os').totalmem / 1024 / 1024)}MB
┃◈┗━━━━━━━━━━━━━━𖣔𖣔
╰──────────────┈⊷

> normal whatsapp bot`;

        // Send the status message with an image
        await conn.sendMessage(from, { 
            image: { url: `` },  // Image URL
            caption: status,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '6363837@newsletter',
                    newsletterName: '❤️සුපිරි බොටා ඈ❤️',
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

    } catch (e) {
        console.error("Error in alive command:", e);
        reply(`An error occurred: ${e.message}`);
    }
});
