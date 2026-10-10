import fs from 'fs'
import path from 'path'
import zlib from 'zlib'

function createPng(width, height) {
  // RGBA buffer
  const stride = width * 4 + 1
  const rawData = Buffer.alloc(stride * height)

  const cx = width / 2
  const cy = height / 2
  const r = width * 0.45

  for (let y = 0; y < height; y++) {
    const rowOffset = y * stride
    rawData[rowOffset] = 0 // Filter type: None

    for (let x = 0; x < width; x++) {
      const px = rowOffset + 1 + x * 4
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      // Background rounded square or circle
      if (dist <= r) {
        // Gradient from blue (#2563eb) to deep indigo (#1e1b4b)
        const t = (y / height)
        const red = Math.round(37 * (1 - t) + 30 * t)
        const green = Math.round(99 * (1 - t) + 27 * t)
        const blue = Math.round(235 * (1 - t) + 75 * t)

        // Draw a stylized white compass needle / map pin in center
        // Compass needle triangle
        const isInNeedle = (Math.abs(dx) < (width * 0.12 * (1 - Math.abs(dy) / (height * 0.35)))) && (Math.abs(dy) < height * 0.35)
        const isNorth = isInNeedle && dy < 0
        const isSouth = isInNeedle && dy >= 0

        if (isNorth) {
          // Vibrant red north needle
          rawData[px] = 239
          rawData[px + 1] = 68
          rawData[px + 2] = 68
          rawData[px + 3] = 255
        } else if (isSouth) {
          // White south needle
          rawData[px] = 248
          rawData[px + 1] = 250
          rawData[px + 2] = 252
          rawData[px + 3] = 255
        } else if (dist > r - 8) {
          // White outer border ring
          rawData[px] = 255
          rawData[px + 1] = 255
          rawData[px + 2] = 255
          rawData[px + 3] = 230
        } else {
          rawData[px] = red
          rawData[px + 1] = green
          rawData[px + 2] = blue
          rawData[px + 3] = 255
        }
      } else {
        // Transparent outside circle
        rawData[px] = 0
        rawData[px + 1] = 0
        rawData[px + 2] = 0
        rawData[px + 3] = 0
      }
    }
  }

  // Deflate
  const compressed = zlib.deflateSync(rawData)

  // Build PNG chunks
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  function makeChunk(type, data) {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length, 0)
    const typeBuf = Buffer.from(type)
    const crcVal = crc32(Buffer.concat([typeBuf, data]))
    const crcBuf = Buffer.alloc(4)
    crcBuf.writeUInt32BE(crcVal >>> 0, 0)
    return Buffer.concat([len, typeBuf, data, crcBuf])
  }

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const ihdrChunk = makeChunk('IHDR', ihdr)
  const idatChunk = makeChunk('IDAT', compressed)
  const iendChunk = makeChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

// Simple CRC32 implementation
function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return ~crc
}

const pubDir = path.resolve('public')
fs.writeFileSync(path.join(pubDir, 'icon-192.png'), createPng(192, 192))
fs.writeFileSync(path.join(pubDir, 'icon-512.png'), createPng(512, 512))
fs.writeFileSync(path.join(pubDir, 'icon-maskable-512.png'), createPng(512, 512))
console.log('PWA icons created successfully in public/')
