export function serializeMessage(message = {}) {
  const key = message.key || {}
  const remoteJid = key.remoteJid || ''
  const participant = key.participant || ''

  return {
    ...message,
    key,
    id: key.id || '',
    chat: remoteJid,
    sender: participant || remoteJid,
    fromMe: Boolean(key.fromMe),
    pushName: message.pushName || '',
    text: message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      message.message?.imageMessage?.caption ||
      message.message?.videoMessage?.caption || ''
  }
}
