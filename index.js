 const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  getContentType,
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const P = require('pino');
const express = require('express');
const path = require('path');
const { pipeline } = require('stream/promises');

const config = require('./config');
const { sms } = require('./lib/msg');
const { getGroupAdmins } = require('./lib/functions');
const { File } = require('megajs');
const { commands, replyHandlers } = require('./command');

const app = express();
const port = process.env.PORT || 8000;

const prefix = '.';
const ownerNumber = ['254782902024'];

const authDir = path.join(__dirname, 'auth_info_baileys');
const credsPath = path.join(authDir, 'creds.json');

let isConnecting = false;
let reconnectTimer = null;
let pluginsLoaded = false;

function getMegaUrl() {
  const sessionValue = String(config.SESSION_ID || '').trim();

  // Supports: THENUVA-XMD=https://mega.nz/file/...
  const megaUrl = sessionValue.replace(/^THENUVA-XMD=/i, '').trim();

  if (!/^https:\/\/mega\.nz\/file\/[^#]+#[^#]+$/i.test(megaUrl)) {
    throw new Error(
      'Invalid SESSION_ID. Use THENUVA-XMD= followed by the complete MEGA file URL.'
    );
  }

  return megaUrl;
}

async function ensureSessionFile() {
  try {
    fs.mkdirSync(authDir, { recursive: true });

    if (!fs.existsSync(credsPath)) {
      console.log('🔄 creds.json not found. Downloading session from MEGA...');

      const megaUrl = getMegaUrl();
      const tempPath = `${credsPath}.download`;

      try {
        const megaFile = File.fromURL(megaUrl);
        const downloadStream = megaFile.download();
        const outputStream = fs.createWriteStream(tempPath);

        await pipeline(downloadStream, outputStream);

        // Validate the downloaded JSON before replacing creds.json.
        const content = fs.readFileSync(tempPath, 'utf8');
        const parsed = JSON.parse(content);

        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Downloaded credentials JSON is invalid.');
        }

        fs.renameSync(tempPath, credsPath);
        console.log('✅ Session credentials downloaded successfully.');
      } catch (error) {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
        throw error;
      }
    } else {
      console.log('✅ Existing session credentials found.');
    }

    await connectToWA();
  } catch (error) {
    console.error('❌ SESSION ERROR:', error.message);
    process.exitCode = 1;
  }
}

async function connectToWA() {
  if (isConnecting) return;
  isConnecting = true;

  try {
    console.log('🔄 Connecting THENUVA X MD...');

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
      logger: P({ level: 'silent' }),
      printQRInTerminal: false,
      browser: Browsers.macOS('THENUVA X MD'),
      auth: state,
      version,
      syncFullHistory: true,
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: true
    });

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'connecting') {
        console.log('⏳ THENUVA X MD is connecting...');
      }

      if (connection === 'open') {
        console.log('✅ THENUVA X MD connected to WhatsApp!');

        if (!pluginsLoaded) {
          pluginsLoaded = true;

          try {
            const pluginsDir = path.join(__dirname, 'plugins');

            if (fs.existsSync(pluginsDir)) {
              fs.readdirSync(pluginsDir)
                .filter((file) => path.extname(file).toLowerCase() === '.js')
                .forEach((file) => {
                  try {
                    require(path.join(pluginsDir, file));
                    console.log(`✅ Plugin loaded: ${file}`);
                  } catch (error) {
                    console.error(`❌ Plugin error (${file}):`, error.message);
                  }
                });
            }
          } catch (error) {
            console.error('❌ Plugin loader error:', error.message);
          }
        }

        try {
          await conn.sendMessage(`${ownerNumber[0]}@s.whatsapp.net`, {
            text:
              '╭─〔 *ᴛʜᴇɴᴜᴠᴀ x ᴍᴅ* 〕──●●►\n' +
              '│\n' +
              '│ ✅ WhatsApp Connected\n' +
              `│ ⚡ Prefix: ${prefix}\n` +
              '│ 👑 Owner: Dilshan Ashinsa\n' +
              '│\n' +
              '╰─────────────────●●►\n\n' +
              '> ᴛʜᴇɴᴜᴠᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ Dilshan Ashinsa'
          });
        } catch (error) {
          console.error('❌ Owner notification failed:', error.message);
        }
      }

      if (connection === 'close') {
        isConnecting = false;

        const statusCode = lastDisconnect?.error?.output?.statusCode;

        console.log('⚠️ WhatsApp connection closed:', statusCode || 'unknown');

        if (statusCode === DisconnectReason.loggedOut) {
          console.error(
            '❌ Session logged out. A new WhatsApp session is required.'
          );
          return;
        }

        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connectToWA().catch((error) => {
              console.error('❌ Reconnect error:', error.message);
            });
          }, 5000);
        }
      }
    });

    conn.ev.on('messages.upsert', async ({ messages }) => {
      for (const mek of messages) {
        try {
          if (!mek || !mek.message) continue;

          if (mek.key?.remoteJid === 'status@broadcast') continue;

          const m = sms(conn, mek);
          if (!m) continue;

          const type = getContentType(mek.message);
          const from = mek.key.remoteJid;

          const body =
            type === 'conversation'
              ? mek.message.conversation
              : mek.message[type]?.text ||
                mek.message[type]?.caption ||
                '';

          const isCmd = body.startsWith(prefix);
          const commandName = isCmd
            ? body.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase()
            : '';

          const args = body.trim().split(/\s+/).slice(1);
          const q = args.join(' ');

          const sender = mek.key.fromMe
            ? conn.user.id
            : mek.key.participant || mek.key.remoteJid;

          const senderNumber = sender.split('@')[0].split(':')[0];
          const isGroup = from.endsWith('@g.us');
          const botNumber = conn.user.id.split(':')[0].split('@')[0];
          const pushname = mek.pushName || 'User';

          const isMe = botNumber === senderNumber;
          const isOwner = ownerNumber.includes(senderNumber) || isMe;
          const botNumber2 = jidNormalizedUser(conn.user.id);

          let groupMetadata = null;
          let groupName = '';
          let participants = [];
          let groupAdmins = [];
          let isBotAdmins = false;
          let isAdmins = false;

          if (isGroup) {
            groupMetadata = await conn.groupMetadata(from).catch(() => null);
            groupName = groupMetadata?.subject || '';
            participants = groupMetadata?.participants || [];
            groupAdmins = getGroupAdmins(participants);
            isBotAdmins = groupAdmins.includes(botNumber2);
            isAdmins = groupAdmins.includes(sender);
          }

          const reply = (text) =>
            conn.sendMessage(from, { text }, { quoted: mek });

          const context = {
            from,
            quoted: mek,
            body,
            isCmd,
            command: commandName,
            args,
            q,
            isGroup,
            sender,
            senderNumber,
            botNumber2,
            botNumber,
            pushname,
            isMe,
            isOwner,
            groupMetadata,
            groupName,
            participants,
            groupAdmins,
            isBotAdmins,
            isAdmins,
            reply
          };

          if (isCmd) {
            const cmd = commands.find(
              (c) =>
                c.pattern === commandName ||
                (c.alias && c.alias.includes(commandName))
            );

            if (cmd) {
              if (cmd.react) {
                conn.sendMessage(from, {
                  react: { text: cmd.react, key: mek.key }
                }).catch(() => {});
              }

              try {
                await cmd.function(conn, mek, m, context);
              } catch (error) {
                console.error(`[PLUGIN ERROR: ${commandName}]`, error);
                await reply('❌ Command failed. Please try again.').catch(() => {});
              }
            }
          }

          for (const handler of replyHandlers) {
            try {
              if (handler.filter(body, { sender, message: mek })) {
                await handler.function(conn, mek, m, {
                  from,
                  quoted: mek,
                  body,
                  sender,
                  reply
                });
                break;
              }
            } catch (error) {
              console.error('❌ Reply handler error:', error.message);
            }
          }
        } catch (error) {
          console.error('❌ Message handler error:', error.message);
        }
      }
    });

  } catch (error) {
    console.error('❌ WhatsApp startup error:', error.message);
    isConnecting = false;
    throw error;
  }

  isConnecting = false;
}

app.get('/', (req, res) => {
  res.send('THENUVA X MD is running ✅');
});

app.listen(port, () => {
  console.log(`🌐 THENUVA X MD server listening on port ${port}`);
});

ensureSessionFile().catch((error) => {
  console.error('❌ Fatal startup error:', error.message);
  process.exitCode = 1;
});
