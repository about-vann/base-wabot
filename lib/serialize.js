export function serializeMessage(message = {}) {
  return {
    key: message.key,
    message: message.message,
    pushName: message.pushName || '',
    sender: message.key?.participant || message.key?.remoteJid || ''
  }
}
