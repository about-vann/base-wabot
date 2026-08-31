export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

export const isNumber = value => typeof value === 'number' && Number.isFinite(value)

export const pick = (object = {}, keys = []) =>
  Object.fromEntries(keys.filter(key => key in object).map(key => [key, object[key]]))

export const parseMention = text =>
  [...String(text || '').matchAll(/@([0-9]{5,16})/g)].map(match => `${match[1]}@s.whatsapp.net`)

export const decodeJid = jid => {
  if (!jid) return jid
  return String(jid).replace(/:[0-9]+@/, '@')
}

export const formatBytes = bytes => {
  if (!isNumber(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index ? 2 : 0)} ${units[index]}`
}

export const isUrl = value => /^https?:\/\/[^\s]+$/i.test(String(value || ''))
