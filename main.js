import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'
import P from 'pino'
import { Boom } from '@hapi/boom'
import { handler } from './handler.js'
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
  conn.ev.on('messages.upsert', handler.bind(conn))

  conn.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') console.log('✓ WhatsApp connected')
    if (connection === 'close') {
      const shouldReconnect = new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
      console.log(`✗ WhatsApp disconnected${shouldReconnect ? ', reconnecting...' : ''}`)
      if (shouldReconnect) startBot()
    }
  })
}

startBot().catch(console.error)
