// ============================================================
//  GENERADOR DE ÍCONOS — una sola marca, todos los tamaños
// ============================================================
// El favicon, el ícono de la PWA y el de iOS salen de ACÁ, con la misma
// geometría que `src/core/components/Constela.jsx`. Antes cada uno se dibujaba
// por su lado y terminaron siendo tres marcas distintas: el favicon una pesita,
// el login un cubierto. Un logo que cambia de forma según dónde aparece no es
// una identidad.
//
// Uso:  node scripts/gen-iconos.mjs
// Requiere `sharp` solo para rasterizar (dependencia de desarrollo).

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

// Misma geometría que Constela.jsx: el trazo que asciende.
const NODOS = [
  [16, 76],
  [34, 54],
  [52, 62],
  [67, 36],
  [84, 18]
]
const ACENTOS = [
  [45, 27, 1.9],
  [73, 66, 1.7],
  [24, 38, 1.5]
]

const GUINDA = '#D1345B'
const TINTA = '#ffffff'

// `relleno` = fondo guinda con tinta blanca (favicon, PWA, iOS: necesitan
// fondo propio porque se ven sobre el escritorio del sistema).
// `zona` = fracción del lienzo que ocupa la marca. En maskable el sistema
// recorta hasta el 20% de cada borde, así que la marca vive en el centro: con
// 0.62 el nodo final (la meta del trazo) sobrevive a un recorte circular.
// Sin esto ese punto queda pegado al borde y desaparece en medio Android.
function marcaSVG({ lado = 64, radio = 14, zona = 0.62 } = {}) {
  const esc = zona
  const off = (100 - 100 * esc) / 2
  const px = (x) => +(off + x * esc).toFixed(2)
  const pr = (r) => +(r * esc).toFixed(2)

  const linea = NODOS.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${px(x)} ${px(y)}`).join(' ')
  const nodos = NODOS.map(([x, y], i) => {
    const r = i === NODOS.length - 1 ? 4 : i === 0 ? 3.4 : 2.4
    return `<circle cx="${px(x)}" cy="${px(y)}" r="${pr(r)}"/>`
  }).join('')
  const acentos = ACENTOS.map(
    ([x, y, r]) => `<circle cx="${px(x)}" cy="${px(y)}" r="${pr(r)}" opacity="0.75"/>`
  ).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${lado}" height="${lado}">
  <rect width="100" height="100" rx="${radio}" fill="${GUINDA}"/>
  <path d="${linea}" fill="none" stroke="${TINTA}" stroke-width="${pr(2.2)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.45"/>
  <g fill="${TINTA}">${nodos}${acentos}</g>
</svg>`
}

// El favicon va en SVG: escala solo y pesa nada. No lo recorta nadie, así que
// la marca puede llenar más el cuadro y leerse a 16px en una pestaña.
writeFileSync(join(raiz, 'public/favicon.svg'), marcaSVG({ lado: 64, radio: 14, zona: 0.86 }) + '\n')

// Los PNG los pide el manifest (Android) y iOS. `maskable` necesita que la
// marca viva dentro del 80% central: el sistema recorta los bordes con la
// forma que quiera (círculo, cuadrado, gota).
const salidas = [
  // El manifest declara pwa-512 también como `maskable`: por eso la zona chica.
  { archivo: 'public/pwa-192.png', lado: 192, radio: 22, zona: 0.62 },
  { archivo: 'public/pwa-512.png', lado: 512, radio: 60, zona: 0.62 },
  // iOS no recorta con formas raras, solo redondea las esquinas.
  { archivo: 'public/apple-touch-icon.png', lado: 180, radio: 0, zona: 0.76 }
]

const { default: sharp } = await import('sharp').catch(() => ({ default: null }))
if (!sharp) {
  console.error('Falta `sharp` para rasterizar. Instala con: pnpm add -D sharp')
  process.exit(1)
}

for (const { archivo, lado, radio, zona } of salidas) {
  const svg = marcaSVG({ lado, radio, zona })
  await sharp(Buffer.from(svg)).png().toFile(join(raiz, archivo))
  console.log('escrito', archivo, `${lado}×${lado}`)
}
console.log('listo: una sola marca en favicon, PWA e iOS')
