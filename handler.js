import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import smsg from './lib/simple.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const databasePath = path.join(__dirname, 'database.json')
const pluginsPath = path.join(__dirname, 'plugins')
const DEFAULT_FREE_LIMIT = 25
const LIMIT_TZ = 'Asia/Jakarta'

const setNumber = (obj, key, value = 0) => { if (!(key in obj) || obj[key] === undefined || obj[key] === null || (typeof obj[key] === 'number' && Number.isNaN(obj[key]))) obj[key] = value }
const setString = (obj, key, value = '') => { if (typeof obj[key] !== 'string') obj[key] = value }
const setBoolean = (obj, key, value = false) => { if (typeof obj[key] !== 'boolean') obj[key] = value }
const setDefault = (obj, key, value) => { if (!(key in obj)) obj[key] = value }

function getLimitDayKey(ms = Date.now()) {
  const d = new Date(new Date(ms).toLocaleString('en-US', { timeZone: LIMIT_TZ }))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function syncLimitTotal(user) {
  if (!user || typeof user !== 'object' || user.limit === Infinity || user.limit === 'Infinity') return
  user.limitFree = Math.max(0, Math.min(DEFAULT_FREE_LIMIT, Number(user.limitFree) || 0))
  user.limitExtra = Math.max(0, Number(user.limitExtra) || 0)
  user.limit = user.limitFree + user.limitExtra
}
function applyLimitDelta(user, delta, useFreeFirst = false) {
  if (!user || typeof user !== 'object' || user.limit === Infinity || user.limit === 'Infinity') return
  delta = Number(delta) || 0
  user.limitFree = Math.max(0, Math.min(DEFAULT_FREE_LIMIT, Number(user.limitFree) || 0))
  user.limitExtra = Math.max(0, Number(user.limitExtra) || 0)
  if (delta > 0) user.limitExtra += delta
  else if (delta < 0) {
    let cut = Math.abs(delta)
    if (useFreeFirst) { const n = Math.min(user.limitFree, cut); user.limitFree -= n; cut -= n; if (cut) user.limitExtra = Math.max(0, user.limitExtra - cut) }
    else { const n = Math.min(user.limitExtra, cut); user.limitExtra -= n; cut -= n; if (cut) user.limitFree = Math.max(0, user.limitFree - cut) }
  }
  syncLimitTotal(user)
}
function normalizeLimitBucket(user) {
  if (!user || typeof user !== 'object' || user.limit === Infinity || user.limit === 'Infinity') return user
  const today = getLimitDayKey()
  let current = Number(user.limit); if (!Number.isFinite(current)) current = 0
  if (!user.__limitBucketV1) {
    user.limitFree = Math.min(Math.max(current, 0), DEFAULT_FREE_LIMIT); user.limitExtra = Math.max(0, current - user.limitFree); user.limitDay = user.limitDay || today; user.__limitBucketV1 = true
  } else {
    user.limitFree = Math.max(0, Math.min(DEFAULT_FREE_LIMIT, Number(user.limitFree) || 0)); user.limitExtra = Math.max(0, Number(user.limitExtra) || 0)
    const delta = current - (user.limitFree + user.limitExtra); if (delta) applyLimitDelta(user, delta, false)
  }
  if (user.limitDay !== today) { user.limitDay = today; user.limitFree = DEFAULT_FREE_LIMIT }
  syncLimitTotal(user); return user
}
function normalizeUserData(user = {}, name = '') {
  setNumber(user,'exp',0); setNumber(user,'limit',DEFAULT_FREE_LIMIT); normalizeLimitBucket(user); setNumber(user,'lastclaim',0); setBoolean(user,'registered',false); setString(user,'name',name || ''); setNumber(user,'age',-1); setNumber(user,'regTime',-1); setNumber(user,'afk',-1); setString(user,'afkReason',''); setBoolean(user,'banned',false); setString(user,'banReason',''); setNumber(user,'warn',0); setNumber(user,'level',0); setString(user,'role','Free user'); setBoolean(user,'autolevelup',true); setDefault(user,'premium',false); setNumber(user,'premiumTime',0)
  setNumber(user,'money',500); setNumber(user,'bank',0); setNumber(user,'atm',0); setNumber(user,'fullatm',0); setNumber(user,'health',100); setNumber(user,'maxHealth',100); setNumber(user,'healt',100); setNumber(user,'maxHealt',100); setNumber(user,'energy',100); setNumber(user,'stamina',100); setNumber(user,'mana',100); setNumber(user,'potion',0); setNumber(user,'petfood',0); setNumber(user,'umpan',0); setNumber(user,'tiketcoin',0); setNumber(user,'bunuh',0); setNumber(user,'area',1)
  for (const key of ['sword','sworddurability','armor','armordurability','pickaxe','pickaxedurability','fishingrod','fishingroddurability','wood','kayu','rock','batu','stone','iron','string','emerald','diamond','gold','clay','coal','sand','trash','sampah','common','uncommon','mythic','legendary','pet','pisang','anggur','mangga','jeruk','apel','bibitpisang','bibitanggur','bibitmangga','bibitjeruk','bibitapel','banteng','harimau','gajah','kambing','panda','buaya','kerbau','sapi','monyet','ayam','babi','babihutan','cat','horse','fox','wolf','dragon','lion','rhinoceros','centaur','kyubi','griffin','phonix','robo','naga','nugget','aqua','rendang','salads','steak','candy','ramen','pizza','vodka','sushi','bandage','ganja','roti','spagetti','croissant','onigiri','hamburger','hotdog','cake','sandwich','escream','pudding','juice','teh','popcorn','kopi','soju','kopimatcha','susu','boba','kentang','soda','lastbansos','lastdagang','lastberkebon','lastdungeon','lasthunt','lastgrab','lastmisi','lastduel']) setNumber(user,key,0)
  setBoolean(user,'jadian',false); setString(user,'pasangan',''); setString(user,'pacar',''); setNumber(user,'jadianTime',0)
  if (!user.cafe || typeof user.cafe !== 'object' || Array.isArray(user.cafe)) user.cafe = { name:'Kafe Lezat', level:1, capacity:10, stock:50, maxStock:50, customers:0, revenue:0, popularity:5, upgradeCost:1000000, menu:[{item:'Kopi Hitam',price:30000}], facilities:['Meja Kayu'], openHours:{start:8,end:22}, rating:4.2 }
  return user
}
function createEmptyDatabase() { return { users:{}, chats:{}, settings:{}, bots:{stock:{}}, monsters:['Wither','Ender Dragon','Warden','Giant'], tembak:{} } }
function loadDatabase() { try { if (!fs.existsSync(databasePath)) return createEmptyDatabase(); return { ...createEmptyDatabase(), ...JSON.parse(fs.readFileSync(databasePath,'utf8')) } } catch (e) { console.error('Failed to load database:',e); return createEmptyDatabase() } }
let writeTimer
function saveDatabase() { clearTimeout(writeTimer); writeTimer = setTimeout(() => fs.writeFileSync(databasePath, JSON.stringify(global.db.data,null,2)),150) }

const plugins = new Map()
async function loadPlugins() {
  if (!fs.existsSync(pluginsPath)) fs.mkdirSync(pluginsPath,{recursive:true})
  for (const file of fs.readdirSync(pluginsPath).filter(x => x.endsWith('.js'))) {
    try { const mod = await import(`${pathToFileURL(path.join(pluginsPath,file)).href}?update=${Date.now()}`); if (typeof mod.default === 'function') plugins.set(file, mod.default) }
    catch (e) { console.error(`Plugin ${file} failed:`,e) }
  }
}
await loadPlugins()

export async function handler(chatUpdate) {
  const conn = this
  if (!chatUpdate?.messages?.length) return
  const raw = chatUpdate.messages[chatUpdate.messages.length - 1]
  if (!raw?.key?.remoteJid || raw.key.remoteJid === 'status@broadcast') return
  const m = smsg(conn, raw)
  const sender = m.sender || m.chat
  const user = global.db.data.users[sender] ||= {}
  normalizeUserData(user, m.pushName || user.name)
  global.db.data.chats[m.chat] ||= {}
  const botJid = conn.user?.id || conn.user?.jid || 'default'
  global.db.data.settings[botJid] ||= { self:false, autoread:false, restrict:false, anticall:false, restartDB:0 }

  const body = String(m.text || '').trim()
  const prefix = /^[!#./?]/.test(body) ? body[0] : null
  if (prefix) {
    const parts = body.slice(1).trim().split(/\s+/)
    const command = (parts.shift() || '').toLowerCase()
    const args = parts
    const text = args.join(' ')
    for (const plugin of plugins.values()) {
      const commands = Array.isArray(plugin.command) ? plugin.command : plugin.command ? [plugin.command] : []
      if (!commands.map(String).map(x => x.toLowerCase()).includes(command)) continue
      try { await plugin.call(conn, m, { conn, m, text, args, command, usedPrefix:prefix, user, db:global.db.data }) }
      catch (e) { console.error(`Command ${command} failed:`,e); await m.reply('Terjadi kesalahan saat menjalankan perintah.') }
      break
    }
  }
  saveDatabase()
}

global.db = global.db || { data: loadDatabase() }
global.DATABASE = global.db
export { normalizeUserData }
