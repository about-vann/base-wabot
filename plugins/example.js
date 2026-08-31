/**
 * Plugin skeleton.
 * Add your own feature implementation here.
 */

let handler = async (m, { conn, text, args, usedPrefix, command }) => {
  await conn.sendMessage(m.chat, {
    text: `Plugin ${command || 'example'} siap dikembangkan.`
  }, { quoted: m })
}

handler.command = ['example']
handler.help = ['example']
handler.tags = ['main']

export default handler
