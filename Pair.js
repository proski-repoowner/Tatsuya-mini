const { Telegraf } = require('telegraf')
const { default: makeWASocket, useMultiFileAuthState, delay } = require('@whiskeysockets/baileys')
const pino = require('pino')
const express = require('express')

const BOT_TOKEN = process.env.BOT_TOKEN || "8543773058:AAGEOg-3SXSgeHIrAm3TuDICQfPN9WgTMdA"
const bot = new Telegraf(BOT_TOKEN)
const app = express()

app.get('/', (req,res)=> res.send('TATSUYA MD ONLINE - ROYAL INTELLIGENCE'))

bot.start((ctx)=>{
  ctx.reply(
`┏━━ ⟡ T A T S U Y A ⟡ ━━┓
┃ ROYAL INTELLIGENCE
┗━━━━━━━━━━━━┛
Send your WhatsApp number
Example: 254782902024`)
})

bot.on('text', async (ctx)=>{
  let number = ctx.message.text.replace(/[^0-9]/g,'')
  if(number.length < 11) return ctx.reply('❌ Send valid number: 254782902024')

  await ctx.reply(`⏳ Generating pair code for ${number}...`)

  try {
    const { state, saveCreds } = await useMultiFileAuthState(`./session/${number}`)
    const sock = makeWASocket({
      auth: state,
      logger: pino({level:'silent'}),
      printQRInTerminal: false,
      browser: ['TATSUYA MD','Chrome','1.0']
    })
    sock.ev.on('creds.update', saveCreds)
    
    if(!sock.authState.creds.registered){
      await delay(3000)
      let code = await sock.requestPairingCode(number)
      await ctx.reply(
`✅ TATSUYA PAIR CODE

Number: ${number}
Code: ${code}

WhatsApp > Linked Devices > Link with phone number

Expires in 60s`,
      {parse_mode:'Markdown'})
    }
  } catch(e){
    ctx.reply('❌ Error: '+ e.message)
  }
})

bot.launch()
app.listen(process.env.PORT || 3000, ()=> console.log('TATSUYA ONLINE'))

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
