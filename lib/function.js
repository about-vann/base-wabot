import crypto from 'crypto'
import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  downloadContentFromMessage,
  delay
} from '@whiskeysockets/baileys'

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
export const isNumber = value => typeof value === 'number' && Number.isFinite(value)
export const pick = (object = {}, keys = []) => Object.fromEntries(keys.filter(key => key in object).map(key => [key, object[key]]))
export const parseMention = text => [...String(text || '').matchAll(/@([0-9]{5,16})/g)].map(match => `${match[1]}@s.whatsapp.net`)
export const decodeJid = jid => jid ? String(jid).replace(/:[0-9]+@/, '@') : jid
export const formatBytes = bytes => {
  if (!isNumber(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index ? 2 : 0)} ${units[index]}`
}
export const isUrl = value => /^https?:\/\/[^\s]+$/i.test(String(value || ''))

const safeJson = value => {
  try { return JSON.stringify(value ?? {}) } catch { return '{}' }
}

const normalizeSock = conn => {
  if (!conn) throw new Error('Socket is required')
  if (typeof conn.relayMessage !== 'function') throw new Error('Invalid WhatsApp socket')
  return conn
}

const nativeFlowNodes = () => [{
  tag: 'biz',
  attrs: {},
  content: [{
    tag: 'interactive',
    attrs: { type: 'native_flow', v: '1' },
    content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
  }]
}]

export class BaseBuilder {
  constructor() {
    this._title = ''
    this._subtitle = ''
    this._body = ''
    this._footer = ''
    this._contextInfo = {}
    this._extraPayload = {}
  }
  setTitle(value = '') { this._title = String(value); return this }
  setSubtitle(value = '') { this._subtitle = String(value); return this }
  setBody(value = '') { this._body = String(value); return this }
  setFooter(value = '') { this._footer = String(value); return this }
  setContextInfo(value = {}) { this._contextInfo = value; return this }
  addPayload(value = {}) { Object.assign(this._extraPayload, value); return this }
  static async fetchBuffer(url, options = {}) {
    const response = await fetch(url, options)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return Buffer.from(await response.arrayBuffer())
  }
}

export class Button extends BaseBuilder {
  #client
  constructor(client) {
    super()
    this.#client = normalizeSock(client)
    this._buttons = []
    this._data = null
    this._params = {}
    this._selectionIndex = -1
    this._sectionIndex = -1
  }
  setImage(value, options = {}) { this._data = Buffer.isBuffer(value) ? { image: value, ...options } : { image: { url: value }, ...options }; return this }
  setVideo(value, options = {}) { this._data = Buffer.isBuffer(value) ? { video: value, ...options } : { video: { url: value }, ...options }; return this }
  setDocument(value, options = {}) { this._data = Buffer.isBuffer(value) ? { document: value, ...options } : { document: { url: value }, ...options }; return this }
  setMedia(value = {}) { this._data = value; return this }
  setParams(value = {}) { this._params = value; return this }
  clearButtons() { this._buttons = []; return this }
  addButton(name, params = {}) { this._buttons.push({ name, buttonParamsJson: typeof params === 'string' ? params : safeJson(params) }); return this }
  addReply(display_text = '', id = '', options = {}) { return this.addButton('quick_reply', { display_text, id, ...options }) }
  addUrl(display_text = '', url = '', webview_interaction = false, options = {}) { return this.addButton('cta_url', { display_text, url, webview_interaction, ...options }) }
  addCopy(display_text = '', copy_code = '', options = {}) { return this.addButton('cta_copy', { display_text, copy_code, ...options }) }
  addCall(display_text = '', id = '', options = {}) { return this.addButton('cta_call', { display_text, id, ...options }) }
  addLocation(options = {}) { return this.addButton('send_location', options) }
  addSelection(title = 'Pilih', options = {}) {
    this._buttons.push({ ...options, name: 'single_select', buttonParamsJson: safeJson({ title, sections: [] }) })
    this._selectionIndex = this._buttons.length - 1
    this._sectionIndex = -1
    return this
  }
  makeSection(title = '', highlight_label = '') {
    if (this._selectionIndex < 0) throw new Error('Create a selection first')
    const params = JSON.parse(this._buttons[this._selectionIndex].buttonParamsJson)
    params.sections.push({ title, highlight_label, rows: [] })
    this._sectionIndex = params.sections.length - 1
    this._buttons[this._selectionIndex].buttonParamsJson = safeJson(params)
    return this
  }
  makeRow(header = '', title = '', description = '', id = '') {
    if (this._selectionIndex < 0 || this._sectionIndex < 0) throw new Error('Create a selection and section first')
    const params = JSON.parse(this._buttons[this._selectionIndex].buttonParamsJson)
    params.sections[this._sectionIndex].rows.push({ header, title, description, id: id || title })
    this._buttons[this._selectionIndex].buttonParamsJson = safeJson(params)
    return this
  }
  async build(jid, options = {}) {
    const media = this._data ? await prepareWAMessageMedia(this._data, { upload: this.#client.waUploadToServer }) : {}
    return generateWAMessageFromContent(jid, {
      ...this._extraPayload,
      interactiveMessage: {
        header: { title: this._title, subtitle: this._subtitle, hasMediaAttachment: !!this._data, ...media },
        body: { text: this._body },
        footer: { text: this._footer },
        contextInfo: this._contextInfo,
        nativeFlowMessage: { messageParamsJson: safeJson(this._params), buttons: this._buttons }
      }
    }, { userJid: this.#client.user?.jid, ...options })
  }
  async send(jid, options = {}) {
    const msg = await this.build(jid, options)
    await this.#client.relayMessage(msg.key.remoteJid, msg.message, { messageId: msg.key.id, additionalNodes: nativeFlowNodes(), ...options })
    return msg
  }
}

export class ButtonV2 extends BaseBuilder {
  #client
  constructor(client) { super(); this.#client = normalizeSock(client); this._buttons = []; this._data = null }
  addButton(displayText = '', buttonId = crypto.randomUUID()) { this._buttons.push({ buttonId, buttonText: { displayText }, type: 1 }); return this }
  addRawButton(button = {}) { this._buttons.push(button); return this }
  setMedia(value = {}) { this._data = value; return this }
  async build(jid, options = {}) {
    return generateWAMessageFromContent(jid, {
      ...this._extraPayload,
      buttonsMessage: { contentText: this._body, footerText: this._footer, ...(this._data || {}), viewOnce: true, contextInfo: this._contextInfo, buttons: this._buttons }
    }, { userJid: this.#client.user?.jid, ...options })
  }
  async send(jid, options = {}) {
    if (!this._buttons.length) throw new Error('ButtonV2 requires at least one button')
    const msg = await this.build(jid, options)
    await this.#client.relayMessage(msg.key.remoteJid, msg.message, { messageId: msg.key.id, additionalNodes: nativeFlowNodes(), ...options })
    return msg
  }
}

export class Carousel extends BaseBuilder {
  #client
  constructor(client) { super(); this.#client = normalizeSock(client); this._cards = [] }
  addCard(card) { const cards = Array.isArray(card) ? card : [card]; cards.forEach(c => { if (!c?.header?.hasMediaAttachment) throw new Error('Carousel card must include media') }); this._cards.push(...cards); return this }
  async build(jid, options = {}) {
    return generateWAMessageFromContent(jid, { ...this._extraPayload, interactiveMessage: { header: { hasMediaAttachment: false }, body: { text: this._body }, footer: { text: this._footer }, contextInfo: this._contextInfo, carouselMessage: { cards: this._cards } } }, { userJid: this.#client.user?.jid, ...options })
  }
  async send(jid, options = {}) { const msg = await this.build(jid, options); await this.#client.relayMessage(msg.key.remoteJid, msg.message, { messageId: msg.key.id, additionalNodes: nativeFlowNodes(), ...options }); return msg }
}

export class AIRich extends BaseBuilder {
  #client
  constructor(client) { super(); this.#client = normalizeSock(client); this._submessages = []; this._sections = []; this._richResponseSources = [] }
  static newLayout(name, data) { return { view_model: { [Array.isArray(data) ? 'primitives' : 'primitive']: data, __typename: `GenAI${name}LayoutViewModel` } } }
  addSubmessage(value) { this._submessages.push(...(Array.isArray(value) ? value : [value])); return this }
  addSection(value) { this._sections.push(...(Array.isArray(value) ? value : [value])); return this }
  addText(text) { const value = String(text); this._submessages.push({ messageType: 2, messageText: value }); this._sections.push(AIRich.newLayout('Single', { text: value, __typename: 'GenAIMarkdownTextUXPrimitive' })); return this }
  addImage(url) { const urls = (Array.isArray(url) ? url : [url]).filter(Boolean); this._submessages.push({ messageType: 1, gridImageMetadata: { gridImageUrl: { imagePreviewUrl: urls[0] || '' }, imageUrls: urls.map(item => ({ imagePreviewUrl: item, imageHighResUrl: item, sourceUrl: item })) } }); urls.forEach(item => this._sections.push(AIRich.newLayout('Single', { media: { url: item, mime_type: 'image/png' }, imagine_type: 'IMAGE', status: { status: 'READY' }, __typename: 'GenAIImaginePrimitive' }))); return this }
  addVideo(url) { const items = Array.isArray(url) ? url : [url]; items.forEach(item => this._sections.push(AIRich.newLayout('Single', { media: { url: String(item).split('|')[0], mime_type: 'video/mp4', duration: Number(String(item).split('|')[1]) || 0 }, imagine_type: 'ANIMATE', status: { status: 'READY' }, __typename: 'GenAIImaginePrimitive' }))); return this }
  addTable(table) { if (!Array.isArray(table)) throw new TypeError('Table must be an array'); const rows = table.map(row => Array.isArray(row) ? row.map(v => String(v ?? '')) : [String(row ?? '')]); this._sections.push(AIRich.newLayout('Single', { rows: rows.map((cells, i) => ({ is_header: i === 0, cells })), __typename: 'GenATableUXPrimitive' })); return this }
  addCode(language = 'javascript', code = '') { this._sections.push(AIRich.newLayout('Single', { language: String(language), code_blocks: [{ content: String(code), type: 'DEFAULT' }], __typename: 'GenAICodeUXPrimitive' })); return this }
  addReels(items = []) { const list = Array.isArray(items) ? items : [items]; this._sections.push(AIRich.newLayout('HScroll', list.map(item => ({ reels_url: item.videoUrl ?? item.url ?? '', thumbnail_url: item.thumbnailUrl ?? item.thumbnail ?? '', creator: item.username ?? item.title ?? '', avatar_url: item.profileIconUrl ?? item.profile_url ?? '', reels_title: item.reels_title ?? item.title ?? '', likes_count: item.likes_count ?? item.like ?? 0, view_count: item.view_count ?? item.view ?? 0, __typename: 'GenAIReelPrimitive' })))); return this }
  addSuggest(value) { const list = Array.isArray(value) ? value : [value]; this._sections.push(AIRich.newLayout('ActionRow', list.map(text => ({ prompt_text: String(text), prompt_type: 'SUGGESTED_PROMPT', __typename: 'GenAIFollowUpSuggestionPillPrimitive' })))); return this }
  addTip(text) { return this.addText(text) }
  build(options = {}) {
    const sections = this._footer ? [...this._sections, AIRich.newLayout('Single', { text: this._footer, __typename: 'GenAIMetadataTextPrimitive' })] : this._sections
    return { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2, botMetadata: { messageDisclaimerText: this._title, richResponseSourcesMetadata: { sources: this._richResponseSources } } }, ...this._extraPayload, botForwardedMessage: { message: { richResponseMessage: { messageType: 1, submessages: options.includesSubmessages === false ? [] : this._submessages, unifiedResponse: { data: options.includesUnifiedResponse === false ? '' : Buffer.from(JSON.stringify({ response_id: crypto.randomUUID(), sections })).toString('base64') }, contextInfo: this._contextInfo } } } }
  }
  async send(jid, options = {}) { const payload = this.build(options); const messageId = options.messageId || crypto.randomUUID(); await this.#client.relayMessage(jid, payload, { messageId, ...options }); return payload }
}

export async function sendButton(conn, jid, { title = '', subtitle = '', body = '', footer = '', buttons = [], image, video, document, quoted = null, ...extra } = {}) {
  const nativeButtons = buttons.map(btn => {
    const type = btn.type
    const map = { reply: 'quick_reply', url: 'cta_url', copy: 'cta_copy', call: 'cta_call', location: 'send_location', address: 'address_message' }
    const name = map[type] || btn.name
    if (!name) return null
    const params = type === 'url' ? { display_text: btn.text, url: btn.url, webview_interaction: !!btn.webview, ...btn.options } : type === 'copy' ? { display_text: btn.text, copy_code: btn.code, ...btn.options } : { display_text: btn.text, id: btn.id || btn.text, ...btn.options }
    return { name, buttonParamsJson: safeJson(params) }
  }).filter(Boolean)
  let mediaPayload = {}
  if (image || video || document) mediaPayload = await prepareWAMessageMedia(image ? { image: Buffer.isBuffer(image) ? image : { url: image } } : video ? { video: Buffer.isBuffer(video) ? video : { url: video } } : { document: Buffer.isBuffer(document) ? document : { url: document } }, { upload: conn.waUploadToServer })
  const msg = generateWAMessageFromContent(jid, { ...extra, interactiveMessage: { header: { title, subtitle, hasMediaAttachment: !!(image || video || document), ...mediaPayload }, body: { text: body }, footer: { text: footer }, nativeFlowMessage: { messageParamsJson: '{}', buttons: nativeButtons } } }, { userJid: conn.user?.jid, quoted })
  await conn.relayMessage(msg.key.remoteJid, msg.message, { messageId: msg.key.id, additionalNodes: nativeFlowNodes() })
  return msg
}

export async function sendAlbum(conn, jid, array, options = {}) {
  const album = generateWAMessageFromContent(jid, { messageContextInfo: { messageSecret: crypto.randomBytes(32) }, albumMessage: { expectedImageCount: array.filter(x => x.image).length, expectedVideoCount: array.filter(x => x.video).length } }, { userJid: conn.user?.jid, upload: conn.waUploadToServer })
  await conn.relayMessage(album.key.remoteJid, album.message, { messageId: album.key.id })
  for (const content of array) { const msg = await generateWAMessageFromContent(jid, content, { quoted: options.quoted, upload: conn.waUploadToServer }); await conn.relayMessage(msg.key.remoteJid, msg.message, { messageId: msg.key.id }); await delay(options.delay ?? 500) }
  return album
}

export function ceciliafunc(conn) {
  conn.sendTextWithMentions = (jid, text, quoted, options = {}) => conn.sendMessage(jid, { text, contextInfo: { mentionedJid: parseMention(text) }, ...options }, { quoted })
  conn.sendReact = (jid, text, key) => conn.sendMessage(jid, { react: { text, key } })
  conn.getBuffer = BaseBuilder.fetchBuffer
  conn.sendAlbum = (jid, array, options = {}) => sendAlbum(conn, jid, array, options)
  conn.downloadMediaMessage = async message => {
    const msg = message?.msg || message
    const type = message?.mtype ? message.mtype.replace(/Message$/i, '') : String(msg?.mimetype || '').split('/')[0]
    const stream = await downloadContentFromMessage(msg, type)
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    return Buffer.concat(chunks)
  }
  return conn
}

export const VERSION = 'base-1.0'
