// Genera los íconos PNG de la PWA sin dependencias externas (node + zlib).
// Dibuja una mancuerna blanca sobre fondo magenta de la marca.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC = join(__dirname, '..', 'public')
mkdirSync(PUBLIC, { recursive: true })

const BG = [194, 24, 91] // #C2185B
const FG = [255, 255, 255]

// CRC32 para los chunks PNG
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

// ¿El pixel (x,y) pertenece a la mancuerna? (coords normalizadas 0..1)
function esMancuerna(nx, ny) {
  const cy = Math.abs(ny - 0.5)
  // barra central
  if (nx > 0.3 && nx < 0.7 && cy < 0.06) return true
  // plato izquierdo
  if (nx > 0.18 && nx < 0.3 && cy < 0.2) return true
  // plato derecho
  if (nx > 0.7 && nx < 0.82 && cy < 0.2) return true
  // topes externos
  if (nx > 0.12 && nx < 0.18 && cy < 0.12) return true
  if (nx > 0.82 && nx < 0.88 && cy < 0.12) return true
  return false
}

function generar(size, nombre) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  let p = 0
  for (let y = 0; y < size; y++) {
    raw[p++] = 0 // filtro de fila
    for (let x = 0; x < size; x++) {
      const nx = x / size
      const ny = y / size
      const c = esMancuerna(nx, ny) ? FG : BG
      raw[p++] = c[0]
      raw[p++] = c[1]
      raw[p++] = c[2]
      raw[p++] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
  writeFileSync(join(PUBLIC, nombre), png)
  console.log('  ✓', nombre, `${size}x${size}`)
}

console.log('Generando íconos PWA...')
generar(192, 'pwa-192.png')
generar(512, 'pwa-512.png')
generar(180, 'apple-touch-icon.png')
console.log('Listo.')
