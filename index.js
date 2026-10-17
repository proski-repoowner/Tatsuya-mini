const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const pino = require('pino')
const fs = require('fs')
const path = require('path')
const config = require('./config')

async function startTatsuya() {
  const { state, saveCreds } = await useMultiFileAuthState('./session/254782902024')
  
  const sock = makeWASocket({
    auth: state,
    logger: pino({level:'silent'}),
    browser: ['TATSUYA MD','Chrome','1.0']
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update)=>{
    const { connection, lastDisconnect } = update
    if(connection === 'close'){
      if(lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut){
        startTatsuya()
      }
    } else if(connection === 'open'){
      console.log('TATSUYA MD CONNECTED - ROYAL INTELLIGENCE ONLINE')
    }
  })

  sock.ev.on('messages.upsert', async ({messages})=>{
    const m = messages[0]
    if(!m.message) return
    if(m.key.fromMe) return

    const body = m.message.conversation || m.message.extendedTextMessage?.text || ""
    if(!body.startsWith(config.prefix)) return

    const args = body.slice(config.prefix.length).trim().split(/ +/)
    const command = args.shift().toLowerCase()
    const from = m.key.remoteJid

    // Load commands dynamically
    try {
      const cmdPath = path.join(__dirname, 'commands', `${command}.js`)
      if(fs.existsSync(cmdPath)){
        const cmd = require(cmdPath)
        await cmd(sock, m, args, { from, config })
      }
    } catch(e){
      console.log('Command error:', e.message)
    }
  })
}

// Only run if you want bot mode, not pairing mode
if(process.env.MODE === 'bot'){
  startTatsuya()
}

module.exports = startTatsuya
