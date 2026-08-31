import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from '@rexxhayanasi/elaina-baileys'
import P from 'pino'
import { handler } from './handler.js'
import { smsg } from './lib/simple.js'
import './setting.js'

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session')
  const { version } = await fetchLatestBaileysVersion()

  const conn = makeWASocket({
    version,
    auth: state,
    logger: P({ level: 'silent' }),
    printQRInTerminal: true,
    browser: ['Base WaBot', 'Chrome', '1.0.0']
  })

  conn.ev.on('creds.update', saveCreds)

  conn.ev.on('messages.upsert', async ({ messages }) => {
    for (const message of messages) {
      if (!message?.message) continue
      const m = smsg(conn, message)
      await handler.call(conn, { messages: [m] })
    }
  })

  conn.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') console.log('✓ WhatsApp connected')
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut
      console.log(`✗ WhatsApp disconnected${shouldReconnect ? ', reconnecting...' : ''}`)
      if (shouldReconnect) startBot().catch(console.error)
    }
  })
}

startBot().catch(console.error)
