import fs from 'fs'
import path from 'path'
import { fileTypeFromBuffer } from 'file-type'

export async function getFile(input) {
  let data
  let filename = ''

  if (Buffer.isBuffer(input)) data = input
  else if (typeof input === 'string' && /^https?:\/\//i.test(input)) {
    const response = await fetch(input)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    data = Buffer.from(await response.arrayBuffer())
  } else if (typeof input === 'string' && fs.existsSync(input)) {
    filename = input
    data = await fs.promises.readFile(input)
  } else {
    throw new TypeError('Input media tidak valid')
  }

  const type = await fileTypeFromBuffer(data) || {
    mime: 'application/octet-stream',
    ext: 'bin'
  }

  return {
    data,
    filename,
    mime: type.mime,
    ext: type.ext,
    size: data.length,
    deleteFile: filename ? () => fs.promises.unlink(filename).catch(() => {}) : () => {}
  }
}

export function mediaPath(...parts) {
  return path.join(process.cwd(), 'media', ...parts)
}
