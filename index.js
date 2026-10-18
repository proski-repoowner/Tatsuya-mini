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
const axios = require('axios');
const path = require('path');
const qrcode = require('qrcode-terminal');

const config = require('./config');
const { sms, downloadMediaMessage } = require('./lib/msg');

const {
    getBuffer,
    getGroupAdmins,
    getRandom,
    h2k,
    isUrl,
    Json,
    runtime,
    sleep,
    fetchJson
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
let pluginsLoaded = false;

// ========================================
// MEGA SESSION RESTORE
// ========================================

async function ensureSessionFile() {
    const tempPath = `${credsPath}.download`;

    try {
        fs.mkdirSync(authDir, { recursive: true });

        if (!fs.existsSync(credsPath)) {
            let sessionUrl = String(config.SESSION_ID || '').trim();

            // Support SESSION_ID=THENUVA-XMD=https://mega.nz/file/...
            sessionUrl = sessionUrl
                .replace(/^THENUVA-XMD=/i, '')
                .trim();

            if (!sessionUrl) {
                throw new Error(
                    'SESSION_ID is missing in config.'
                );
            }

            if (
                !/^https:\/\/mega\.nz\/file\/[^#]+#[^#]+$/i.test(sessionUrl)
            ) {
                throw new Error(
                    'Invalid SESSION_ID. Use the complete MEGA URL including the # key.'
                );
            }

            console.log(
                '🔄 creds.json not found. Downloading session from MEGA...'
            );

            const { pipeline } = require('stream/promises');

            try {
                const megaFile = File.fromURL(sessionUrl);

                await pipeline(
                    megaFile.download(),
                    fs.createWriteStream(tempPath)
                );

                const downloadedData = fs.readFileSync(
                    tempPath,
                    'utf8'
                );

                let parsed;

                try {
                    parsed = JSON.parse(downloadedData);
                } catch {
                    throw new Error(
                        'Downloaded file is not valid JSON.'
                    );
                }

                if (
                    !parsed ||
                    typeof parsed !== 'object' ||
                    Array.isArray(parsed)
                ) {
                    throw new Error(
                        'Downloaded session credentials have an invalid format.'
                    );
                }

                fs.renameSync(tempPath, credsPath);

                console.log(
                    '✅ Session credentials downloaded successfully.'
                );
            } catch (err) {
                if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }

                throw err;
            }
        } else {
            console.log('✅ Existing creds.json found.');
        }

        await connectToWA();

    } catch (err) {
        console.error(
            '❌ SESSION RESTORE ERROR:',
            err.message
        );

        console.error(
            err.stack || 'No stack trace available'
        );

        process.exitCode = 1;
    }
}

// ========================================
// WHATSAPP CONNECTION
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

        danuwa = makeWASocket({
            logger: P({ level: 'silent' }),
            printQRInTerminal: false,
            browser: Browsers.macOS('THENUVA X MD'),
            auth: state,
            version,
            syncFullHistory: true,
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true
        });

        danuwa.ev.on('creds.update', saveCreds);

        // ========================================
        // CONNECTION STATUS / RECONNECT
        // ========================================

        danuwa.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log(
                    '⚠️ QR received. This session may need fresh pairing.'
                );

                qrcode.generate(qr, { small: true });
            }

            if (connection === 'connecting') {
                console.log(
                    '🔄 Connecting to WhatsApp...'
                );
            }

            if (connection === 'open') {
                isConnecting = false;

                if (reconnectTimer) {
                    clearTimeout(reconnectTimer);
                    reconnectTimer = null;
                }

                console.log(
                    '✅ THENUVA X MD connected to WhatsApp!'
                );

                console.log(
                    '👑 Owner: Dilshan Ashinsa'
                );

                const up =
                    'THENUVA X MD connected ✅\n\n' +
                    `PREFIX: ${prefix}\n` +
                    'OWNER: Dilshan Ashinsa';

                try {
                    await danuwa.sendMessage(
                        ownerNumber[0] + '@s.whatsapp.net',
                        {
                            text: up
                        }
                    );
                } catch (err) {
                    console.error(
                        '⚠️ Owner notification failed:',
                        err.message
                    );
                }

                // Load plugins only once per process
                if (!pluginsLoaded) {
                    pluginsLoaded = true;

                    const pluginsDir = path.join(
                        __dirname,
                        'plugins'
                    );

                    if (fs.existsSync(pluginsDir)) {
                        fs.readdirSync(pluginsDir).forEach((plugin) => {
                            if (
                                path.extname(plugin).toLowerCase() === '.js'
                            ) {
                                try {
                                    require(path.join(
                                        pluginsDir,
                                        plugin
                                    ));

                                    console.log(
                                        `🔌 Plugin loaded: ${plugin}`
                                    );
                                } catch (err) {
                                    console.error(
                                        `❌ Plugin load failed (${plugin}):`,
                                        err.message
                                    );
                                }
                            }
                        });
                    } else {
                        console.warn(
                            '⚠️ plugins directory not found.'
                        );
                    }
                }
            }

            if (connection === 'close') {
                isConnecting = false;

                const statusCode =
                    lastDisconnect?.error?.output?.statusCode;

                console.error(
                    '⚠️ WhatsApp connection closed:',
                    statusCode || 'unknown',
                    lastDisconnect?.error?.message ||
                    'No error message'
                );

                console.error(
                    '📌 Disconnect error details:',
                    lastDisconnect?.error ||
                    'No error details available'
                );

                console.error(
                    lastDisconnect?.error?.stack ||
                    'No stack trace available'
                );

                if (
                    statusCode === DisconnectReason.loggedOut
                ) {
                    console.error(
                        '❌ WhatsApp logged out. A fresh session is required.'
                    );

                    return;
                }

                if (reconnectTimer) {
                    clearTimeout(reconnectTimer);
                }

                console.log(
                    '🔄 Reconnecting in 5 seconds...'
                );

                reconnectTimer = setTimeout(() => {
                    reconnectTimer = null;

                    connectToWA().catch((err) => {
                        isConnecting = false;

                        console.error(
                            '❌ RECONNECT ERROR:',
                            err.message
                        );
                    });
                }, 5000);
            }
        });

        // ========================================
        // INCOMING MESSAGES / COMMANDS
        // ========================================

        danuwa.ev.on(
            'messages.upsert',
            async ({ messages }) => {
                for (const msg of messages) {
                    if (msg.messageStubType === 68) {
                        try {
                            await danuwa.sendMessageAck(msg.key);
                        } catch (err) {
                            console.error(
                                'Message acknowledgement error:',
                                err.message
                            );
                        }
                    }
                }

                const mek = messages[0];

                if (!mek || !mek.message) return;

                if (
                    getContentType(mek.message) === 'ephemeralMessage'
                ) {
                    mek.message =
                        mek.message.ephemeralMessage.message;
                }

                if (
                    mek.key?.remoteJid === 'status@broadcast'
                ) {
                    return;
                }

                const m = sms(danuwa, mek);

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
                    ? body
                        .slice(prefix.length)
                        .trim()
                        .split(' ')[0]
                        .toLowerCase()
                    : '';

                const args = body.trim().split(/ +/).slice(1);
                const q = args.join(' ');

                const sender = mek.key.fromMe
                    ? danuwa.user.id
                    : (
                        mek.key.participant ||
                        mek.key.remoteJid
                    );

                const senderNumber = sender.split('@')[0];

                const isGroup = from.endsWith('@g.us');

                const botNumber = danuwa.user.id
                    .split(':')[0]
                    .split('@')[0];

                const pushname = mek.pushName || 'User';

                const isMe =
                    botNumber === senderNumber;

                const isOwner =
                    ownerNumber.includes(senderNumber) || isMe;

                const botNumber2 =
                    await jidNormalizedUser(danuwa.user.id);

                const groupMetadata = isGroup
                    ? await danuwa.groupMetadata(from).catch(() => null)
                    : null;

                const groupName =
                    isGroup ? groupMetadata?.subject : '';

                const participants =
                    isGroup ? groupMetadata?.participants || [] : [];

                const groupAdmins = isGroup
                    ? await getGroupAdmins(participants)
                    : [];

                const isBotAdmins = isGroup
                    ? groupAdmins.includes(botNumber2)
                    : false;

                const isAdmins = isGroup
                    ? groupAdmins.includes(sender)
                    : false;

                const reply = (text) =>
                    danuwa.sendMessage(
                        from,
                        { text },
                        { quoted: mek }
                    );

                if (isCmd) {
                    const cmd = commands.find(
                        (c) =>
                            c.pattern === commandName ||
                            (
                                c.alias &&
                                c.alias.includes(commandName)
                            )
                    );

                    if (cmd) {
                        if (cmd.react) {
                            danuwa.sendMessage(from, {
                                react: {
                                    text: cmd.react,
                                    key: mek.key
                                }
                            }).catch(() => {});
                        }

                        try {
                            await cmd.function(
                                danuwa,
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
                        } catch (err) {
                            console.error(
                                '[PLUGIN ERROR]',
                                err
                            );
                        }
                    }
                }

                // ========================================
                // REPLY HANDLERS
                // ========================================

                const replyText = body;

                for (const handler of replyHandlers) {
                    try {
                        if (
                            handler.filter(
                                replyText,
                                {
                                    sender,
                                    message: mek
                                }
                            )
                        ) {
                            await handler.function(
                                danuwa,
                                mek,
                                m,
                                {
                                    from,
                                    quoted: mek,
                                    body: replyText,
                                    sender,
                                    reply
                                }
                            );

                            break;
                        }
                    } catch (err) {
                        console.error(
                            'Reply handler error:',
                            err.message
                        );
                    }
                }
            }
        );

    } catch (err) {
        isConnecting = false;

        console.error(
            '❌ WHATSAPP STARTUP ERROR:',
            err.message
        );

        console.error(
            err.stack || 'No stack trace available'
        );

        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
        }

        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;

            connectToWA().catch((error) => {
                console.error(
                    '❌ RESTART CONNECTION ERROR:',
                    error.message
                );
            });
        }, 10000);
    }
}

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
    console.log(
        `🌐 Server listening on port ${port}`
    );
});

// ========================================
// START BOT
// ========================================

ensureSessionFile();
