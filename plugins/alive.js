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
        const status = `┏━❮  𝗧𝗛𝗘𝗡𝗨𝗟𝗪𝗔 𝗫𝗠𝗗 〽️𝗗 ❯━
┃◈┃🤖 ʙᴏᴛ ɴᴀᴍᴇ :𝚃𝙷𝙴𝙽𝚄𝚆𝙰 𝚇𝙼𝙳 𝚅1
┃◈┃🔖 ᴠᴇʀsɪᴏɴ : 1.0.0 𝙱𝙴𝚃𝙰
┃◈┃📟 ᴘʟᴀᴛғᴏʀᴍ : 𝚁𝙴𝙿𝙻𝙸𝚃
┃◈┃👨‍💻ᴏᴡɴᴇʀ: 𝙲𝚈𝙱𝙴𝚁 𝚇 𝚃𝙷𝙴𝙽𝚄𝙻𝙰
┃◈┃📆 ʀᴜɴᴛɪᴍᴇ : ${runtime(process.uptime())} 
┃◈┃📈ʀᴀᴍ ᴜsᴀɢᴇ: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(require('os').totalmem / 1024 / 1024)}MB
┃◈┗━━━━━━━━━━━━━━𖣔𖣔
╰──────────────┈⊷
> © 𝗣𝗢𝗪𝗘𝗥𝗘𝗗 𝗕𝗬 𝗧𝗛𝗘𝗡𝗨𝗪𝗔 𝗫𝗠𝗗 〽️𝗗`;

        // Send the status message with an image
        await conn.sendMessage(from, { 
            image: { url: `https://i.ibb.co/My8CRQ49/jawadmd.jpg` },  // Image URL
            caption: status,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363420387793916@newsletter',
                    newsletterName: '𝗧𝗛𝗘𝗡𝗨𝗪𝗔 𝗫𝗠𝗗 〽️𝗗',
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

    } catch (e) {
        console.error("Error in alive command:", e);
        reply(`An error occurred: ${e.message}`);
    }
});
