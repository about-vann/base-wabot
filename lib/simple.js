import { downloadContentFromMessage } from '@rexxhayanasi/elaina-baileys'

const getMessageText = message =>
  message?.conversation ||
  message?.extendedTextMessage?.text ||
  message?.imageMessage?.caption ||
  message?.videoMessage?.caption ||
  message?.documentMessage?.caption ||
  message?.buttonsResponseMessage?.selectedButtonId ||
  message?.listResponseMessage?.singleSelectReply?.selectedRowId || ''

export function smsg(conn, m) {
  if (!m) return m
  const key = m.key || {}
  const msg = m.message || {}
  const context = msg.extendedTextMessage?.contextInfo || {}

  m.id = key.id || ''
  m.chat = key.remoteJid || ''
  m.fromMe = Boolean(key.fromMe)
  m.isGroup = m.chat.endsWith('@g.us')
  m.sender = key.participant || m.chat
  m.pushName = m.pushName || ''
  m.text = getMessageText(msg)
  m.mentionedJid = context.mentionedJid || []
  m.quoted = context.quotedMessage ? { message: context.quotedMessage, key: context.stanzaId ? { id: context.stanzaId, remoteJid: context.remoteJid || m.chat, participant: context.participant } : {} } : null

  m.reply = (text, options = {}) => conn.sendMessage(m.chat, { text: String(text) }, { quoted: m, ...options })
  m.react = emoji => conn.sendMessage(m.chat, { react: { text: emoji, key } })

  m.download = async () => {
    const source = msg.imageMessage || msg.videoMessage || msg.audioMessage || msg.documentMessage || msg.stickerMessage
    if (!source) return null
    const type = msg.imageMessage ? 'image' : msg.videoMessage ? 'video' : msg.audioMessage ? 'audio' : msg.documentMessage ? 'document' : 'sticker'
    const stream = await downloadContentFromMessage(source, type)
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    return Buffer.concat(chunks)
  }

  return m
}

export default smsg
