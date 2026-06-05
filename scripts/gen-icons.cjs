const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function writeUint32BE(val) {
  return Buffer.from([(val >>> 24) & 0xFF, (val >>> 16) & 0xFF, (val >>> 8) & 0xFF, val & 0xFF])
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = writeUint32BE(data.length)
  const crcData = Buffer.concat([typeBytes, data])
  const crc = writeUint32BE(crc32(crcData))
  return Buffer.concat([len, typeBytes, data, crc])
}

function makePNG(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2

  const r = 0x2F, g = 0x34, b = 0x37
  const rawRows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3)
    row[0] = 0
    for (let x = 0; x < size; x++) {
      const barTop = Math.floor(size * 0.30)
      const barH = Math.floor(size * 0.10)
      const stemX = Math.floor(size * 0.42)
      const stemW = Math.floor(size * 0.16)
      const stemTop = Math.floor(size * 0.33)
      const stemBot = Math.floor(size * 0.75)
      const barLeft = Math.floor(size * 0.22)
      const barRight = Math.floor(size * 0.78)

      let pr = r, pg = g, pb = b
      if ((y >= barTop && y < barTop + barH && x >= barLeft && x < barRight) ||
          (x >= stemX && x < stemX + stemW && y >= stemTop && y < stemBot)) {
        pr = 0xFF; pg = 0xFF; pb = 0xFF
      }
      row[1 + x * 3] = pr
      row[1 + x * 3 + 1] = pg
      row[1 + x * 3 + 2] = pb
    }
    rawRows.push(row)
  }

  const rawData = Buffer.concat(rawRows)
  const compressed = zlib.deflateSync(rawData)
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', compressed), pngChunk('IEND', Buffer.alloc(0))])
}

const publicDir = path.join(__dirname, '..', 'public')
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), makePNG(192))
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), makePNG(512))
console.log('Icons generated!')
