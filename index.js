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
const qrcode = require('qrcode-terminal');

const config = require('./config');
const { sms } = require('./lib/msg');

const {
    getGroupAdmins
} = require('./lib/functions');

const { File } = require('megajs');
const { commands, replyHandlers } = require('./command');

const app = express();
const port = process.env.PORT || 8000;

const prefix = '.';
const ownerNumber = ['94742876482'];

const authDir = path.join(__dirname, 'auth_info_baileys');
const credsPath = path.join(authDir, 'creds.json');

let danuwa;
let isConnecting = false;
let reconnectTimer = null;
let reconnectAttempts = 0;
let pluginsLoaded = false;

// ========================================
// EXPRESS SERVER
// ========================================

app.get('/', (req, res) => {
    res.send('Hey, THENUVA X MD started ✅');
});

app.get('/api/status', (req, res) => {
    res.json({
        bot: 'THENUVA X MD',
        status: danuwa?.user ? 'connected' : 'disconnected',
        owner: 'Dilshan Ashinsa'
    });
});

app.listen(port, () => {
    console.log(`🌐 THENUVA X MD server listening on port ${port}`);
});

// ========================================
// SESSION RESTORE FROM MEGA
// ========================================

async function ensureSessionFile() {
    const tempPath = `${credsPath}.download`;

    try {
        fs.mkdirSync(authDir, { recursive: true });

        if (!fs.existsSync(credsPath)) {
            let sessionUrl = String(config.SESSION_ID || '')
                .trim()
                .replace(/^THENUVA-XMD=/i, '')
                .trim();

            if (
                !/^https:\/\/mega\.nz\/file\/[^#]+#[^#]+$/i.test(sessionUrl)
            ) {
                throw new Error(
                    'Invalid SESSION_ID. Set the complete MEGA URL including its # key.'
                );
            }

            console.log('🔄 Downloading session from MEGA...');

            const { pipeline } = require('stream/promises');
            const megaFile = File.fromURL(sessionUrl);

            await pipeline(
                megaFile.download(),
                fs.createWriteStream(tempPath)
            );

            let sessionData;

            try {
                sessionData = JSON.parse(
                    fs.readFileSync(tempPath, 'utf8')
                );
            } catch {
                throw new Error(
                    'Downloaded file is not valid JSON.'
                );
            }

            if (
                !sessionData ||
                typeof sessionData !== 'object' ||
                Array.isArray(sessionData)
            ) {
                throw new Error('Invalid session file format.');
            }

            fs.renameSync(tempPath, credsPath);

            console.log('✅ Session credentials downloaded successfully.');
        } else {
            console.log('✅ Existing creds.json found.');
        }

        await connectToWA();

    } catch (error) {
        if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }

        console.error('❌ SESSION RESTORE ERROR:', error.message);
        console.error(error.stack || 'No stack trace available');
    }
}

// ========================================
// CONNECT TO WHATSAPP
// ========================================

async function connectToWA() {
    if (isConnecting) return;

    isConnecting = true;

    try {
        fs.mkdirSync(authDir, { recursive: true });

        const { state, saveCreds } =
            await useMultiFileAuthState(authDir);

        const { version } = await fetchLatestBaileysVersion();

        console.log(
            `🔄 Connecting THENUVA X MD using Baileys ${version.join('.')}`
        );

        const socket = makeWASocket({
            logger: P({ level: 'silent' }),
            printQRInTerminal: false,
            browser: Browsers.macOS('THENUVA X MD'),
            auth: state,
            version,
            syncFullHistory: false,
            markOnlineOnConnect: false,
            generateHighQualityLinkPreview: true
        });

        danuwa = socket;

        socket.ev.on('creds.update', saveCreds);

        // ========================================
        // CONNECTION STATUS
        // ========================================

        socket.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('📱 Scan this QR with WhatsApp:');
                qrcode.generate(qr, { small: true });
            }

            if (connection === 'connecting') {
                console.log('⏳ THENUVA X MD is connecting...');
            }

            if (connection === 'open') {
                isConnecting = false;
                reconnectAttempts = 0;

                if (reconnectTimer) {
                    clearTimeout(reconnectTimer);
                    reconnectTimer = null;
                }

                console.log('✅ THENUVA X MD connected to WhatsApp!');

                try {
                    await socket.sendMessage(
                        ownerNumber[0] + '@s.whatsapp.net',
                        {
                            text:
                                '✅ THENUVA X MD connected!\n\n' +
                                'PREFIX: ' + prefix + '\n' +
                                'OWNER: Dilshan Ashinsa'
                        }
                    );
                } catch (error) {
                    console.error(
                        '⚠️ Owner notification failed:',
                        error.message
                    );
                }

                // Load plugins once
                if (!pluginsLoaded) {
                    pluginsLoaded = true;

                    const pluginsDir = path.join(__dirname, 'plugins');

                    if (fs.existsSync(pluginsDir)) {
                        for (const plugin of fs.readdirSync(pluginsDir)) {
                            if (
                                path.extname(plugin).toLowerCase() !== '.js'
                            ) {
                                continue;
                            }

                            try {
                                require(path.join(pluginsDir, plugin));
                                console.log(`🔌 Plugin loaded: ${plugin}`);
                            } catch (error) {
                                console.error(
                                    `❌ Plugin error (${plugin}):`,
                                    error.message
                                );
                            }
                        }
                    } else {
                        console.warn('⚠️ plugins directory not found.');
                    }
                }
            }

            if (connection === 'close') {
                isConnecting = false;

                const error = lastDisconnect?.error;
                const statusCode = error?.output?.statusCode;

                console.error('⚠️ WhatsApp connection closed:', {
                    statusCode: statusCode || 'unknown',
                    message: error?.message || 'No error message',
                    payload: error?.output?.payload,
                    stack: error?.stack || 'No stack trace available'
                });

                if (statusCode === DisconnectReason.loggedOut) {
                    console.error(
                        '❌ WhatsApp logged out. A fresh session is required.'
                    );
                    return;
                }

                reconnectAttempts++;

                const delay = Math.min(
                    5000 * (2 ** (reconnectAttempts - 1)),
                    60000
                );

                console.log(
                    `🔄 Reconnecting in ${Math.ceil(delay / 1000)} seconds...`
                );

                if (reconnectTimer) {
                    clearTimeout(reconnectTimer);
                }

                reconnectTimer = setTimeout(() => {
                    reconnectTimer = null;

                    connectToWA().catch((err) => {
                        isConnecting = false;
                        console.error('❌ RECONNECT ERROR:', err.message);
                    });
                }, delay);
            }
        });

        // ========================================
        // INCOMING MESSAGES / COMMANDS
        // ========================================

        socket.ev.on('messages.upsert', async ({ messages }) => {
            for (const msg of messages) {
                if (msg.messageStubType === 68) {
                    try {
                        await socket.sendMessageAck(msg.key);
                    } catch (error) {
                        console.error(
                            '⚠️ Message acknowledgement error:',
                            error.message
                        );
                    }
                }
            }

            for (const mek of messages) {
                if (!mek || !mek.message) continue;

                if (
                    getContentType(mek.message) === 'ephemeralMessage'
                ) {
                    mek.message =
                        mek.message.ephemeralMessage.message;
                }

                const from = mek.key?.remoteJid;

                if (!from || from === 'status@broadcast') continue;

                let m;

                try {
                    m = sms(socket, mek);
                } catch (error) {
                    console.error('❌ MESSAGE PARSE ERROR:', error.message);
                    continue;
                }

                const type = getContentType(mek.message);

                const body =
                    type === 'conversation'
                        ? mek.message.conversation || ''
                        : mek.message[type]?.text ||
                          mek.message[type]?.caption ||
                          '';

                const isCmd = body.startsWith(prefix);

                const commandName = isCmd
                    ? body.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase()
                    : '';

                const args = body.trim().split(/ +/).slice(1);
                const q = args.join(' ');

                const sender = mek.key.fromMe
                    ? socket.user.id
                    : (mek.key.participant || from);

                const senderNumber = sender.split('@')[0].split(':')[0];

                const isGroup = from.endsWith('@g.us');

                const botNumber = socket.user.id
                    .split(':')[0]
                    .split('@')[0];

                const pushname = mek.pushName || 'User';

                const isMe = botNumber === senderNumber;

                const isOwner =
                    ownerNumber.includes(senderNumber) || isMe;

                const botNumber2 =
                    await jidNormalizedUser(socket.user.id);

                const groupMetadata = isGroup
                    ? await socket.groupMetadata(from).catch(() => null)
                    : null;

                const groupName =
                    isGroup ? groupMetadata?.subject || '' : '';

                const participants =
                    isGroup ? groupMetadata?.participants || [] : [];

                const groupAdmins = isGroup
                    ? getGroupAdmins(participants)
                    : [];

                const isBotAdmins = isGroup
                    ? groupAdmins.includes(botNumber2)
                    : false;

                const isAdmins = isGroup
                    ? groupAdmins.includes(sender)
                    : false;

                const reply = (text) =>
                    socket.sendMessage(
                        from,
                        { text },
                        { quoted: mek }
                    );

                // ========================================
                // COMMAND HANDLER
                // ========================================

                if (isCmd) {
                    const cmd = commands.find(
                        (c) =>
                            c.pattern === commandName ||
                            (c.alias && c.alias.includes(commandName))
                    );

                    if (cmd) {
                        if (cmd.react) {
                            socket.sendMessage(from, {
                                react: {
                                    text: cmd.react,
                                    key: mek.key
                                }
                            }).catch(() => {});
                        }

                        try {
                            await cmd.function(
                                socket,
                                mek,
                                m,
                                {
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
                                }
                            );
                        } catch (error) {
                            console.error('[PLUGIN ERROR]', error);
                        }
                    }
                }

                // ========================================
                // REPLY HANDLERS
                // ========================================

                for (const handler of replyHandlers) {
                    try {
                        if (
                            handler.filter(body, {
                                sender,
                                message: mek
                            })
                        ) {
                            await handler.function(
                                socket,
                                mek,
                                m,
                                {
                                    from,
                                    quoted: mek,
                                    body,
                                    sender,
                                    reply
                                }
                            );

                            break;
                        }
                    } catch (error) {
                        console.error(
                            '❌ Reply handler error:',
                            error.message
                        );
                    }
                }
            }
        });

    } catch (error) {
        isConnecting = false;

        console.error('❌ WHATSAPP STARTUP ERROR:', error.message);
        console.error(error.stack || 'No stack trace available');

        reconnectAttempts++;

        const delay = Math.min(
            5000 * (2 ** (reconnectAttempts - 1)),
            60000
        );

        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
        }

        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;

            connectToWA().catch((err) => {
                console.error('❌ RECONNECT ERROR:', err.message);
            });
        }, delay);
    }
}

// ========================================
// START BOT
// ========================================

ensureSessionFile();
