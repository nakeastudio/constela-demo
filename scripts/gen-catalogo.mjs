// ============================================================
//  GENERADOR DEL CATÁLOGO DE EJERCICIOS
// ============================================================
// Baja el dataset de hasaneyldrm/exercises-dataset y escribe
// src/modules/gym/data/catalogo.js con SOLO los cuatro campos que la app usa.
//
//   node scripts/gen-catalogo.mjs
//
// Por qué existe este script: catalogo.js tiene 1324 entradas generadas. Un
// archivo generado sin su generador es una trampa de mantenimiento — nadie
// sabría cómo regenerarlo cuando el dataset se actualice, ni por qué un
// ejercicio quedó en un grupo y no en otro. El mapeo de grupos vive acá.
//
// NO se copia ningún archivo de media. Las imágenes son © Gym visual y quedan
// fuera de la licencia MIT del dataset: se referencian por URL desde upstream,
// nunca se guardan en este repo. Ver README.md.

import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const FUENTE = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json'
const SALIDA = join(dirname(fileURLToPath(import.meta.url)), '../src/modules/gym/data/catalogo.js')

// ---- Mapeo de la taxonomía del dataset a los grupos de la app ----
//
// El dataset trae tres ejes de músculo: `category`/`body_part` (idénticos entre
// sí, 10 valores), `muscle_group` (29 valores, sucio: tiene "traps" y
// "trapezius", "lats" y "latissimus dorsi") y `target` (19 valores, limpio).
//
// Se mapea sobre `target` porque anida perfecto dentro de `category`: cada
// target aparece bajo una sola category, así que `target` es un refinamiento
// estricto y no hay que desempatar entre ejes. `muscle_group` se descarta por
// inconsistente.
const GRUPO_POR_TARGET = {
  // --- calzan directo en los grupos que la app ya conocía ---
  abs: 'core',
  glutes: 'gluteo',
  quads: 'cuadriceps',
  hamstrings: 'isquios',
  'upper back': 'espalda',
  lats: 'espalda',
  biceps: 'brazos',
  triceps: 'brazos',

  // --- grupos nuevos: el catálogo completo los implica ---
  pectorals: 'pecho',
  delts: 'hombro',
  calves: 'gemelos',
  traps: 'trapecio',
  forearms: 'antebrazo',
  'cardiovascular system': 'cardio',

  // --- decisiones de criterio (ver README y el reporte del cambio) ---

  // Abducción de cadera → glúteo. Coincide con la semilla de la app, que ya
  // mapeaba "Abducción de cadera" a gluteo.
  abductors: 'gluteo',

  // Aducción de cadera → cuádriceps. Anatómicamente los aductores son su
  // propio grupo (cara interna del muslo), pero la semilla de la app ya
  // mapeaba "Aducción de cadera" a cuadriceps: se elige consistencia con los
  // datos que ya existen por sobre pureza anatómica. Son 6 ejercicios.
  adductors: 'cuadriceps',

  // target=spine son hiperextensiones y extensiones de espalda. El dataset las
  // pone en category=back, así que van a espalda. OJO: la semilla de la app
  // mapea "Extensión de espalda" a gluteo, y el propio dataset marca
  // muscle_group=glutes en la mayoría. Es una discrepancia real y conocida.
  spine: 'espalda',

  // Serrato anterior: category=chest en el dataset. 5 ejercicios.
  'serratus anterior': 'pecho',

  // Elevador de la escápula: son 2 estirmientos de cuello. No hay grupo
  // "cuello" y crear uno para 2 entradas no se paga. El dataset los marca
  // muscle_group=trapezius.
  'levator scapulae': 'trapecio'
}

// ---- Reparación de codificación ----
//
// Cuatro nombres del dataset vienen con el grado roto: "sled 45в° leg press".
// El "°" (UTF-8 C2 B0) se decodificó como cp1251 y quedó "В°", que el dataset
// después pasó a minúscula: "в°". No es un nombre raro, es basura de encoding, y
// en pantalla se ve como basura.
//
// Reparar una codificación rota NO es traducir: la regla de "nombres en inglés
// verbatim" es para no convertirlos al español, no para conservar la corrupción.
// El propio dataset trae "sled 45° leg press (side pov)" bien escrito: la forma
// correcta es la suya, no una invención nuestra.
const MOJIBAKE = [[/в°/g, '°']]
const repararNombre = (n) => MOJIBAKE.reduce((s, [re, to]) => s.replace(re, to), n)

// ---- Capitalización ----
//
// El dataset trae todo en minúscula ("sled 45° leg press"). Se capitaliza ACÁ,
// en el generador, y no con un `text-transform` de CSS ni con un helper al
// renderizar. El motivo no es estético: `nombre` es la clave de los récords
// (prs[ej.nombre]). Si lo que se muestra y lo que se guarda difieren en las
// mayúsculas, o si una pantalla aplica la transformación y otra no, el mismo
// ejercicio pasa a ser dos claves y el historial se parte. Justo lo que el
// catálogo viene a evitar. Un solo string canónico, ya capitalizado.
//
// Title Case con las excepciones de siempre: las palabras chicas van en
// minúscula salvo que abran el nombre o abran un paréntesis.
const MINUSCULAS = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'from', 'by'])

// Siglas que no son palabras: quedarían "Ez" o "Sz" con Title Case a secas.
const SIGLAS = new Map([
  ['ez', 'EZ'], // ez barbell / ez-bar
  ['sz', 'SZ'], // (sz-bar)
  ['jm', 'JM'], // jm bench press
  ['pov', 'POV'] // (back pov)
])

// Se recorren las CORRIDAS DE LETRAS, no las palabras separadas por espacio: así
// cada parte de un guion se decide sola y "t-bar" queda "T-Bar", "sz-bar" queda
// "SZ-Bar" y "elbow-to-knee" queda "Elbow-to-Knee".
function capitalizar(nombre) {
  return nombre.replace(/[A-Za-z]+/g, (palabra, pos, completo) => {
    const baja = palabra.toLowerCase()

    // "v. 2" es un marcador de versión, no la letra V.
    if (baja === 'v' && completo[pos + palabra.length] === '.') return 'v'

    if (SIGLAS.has(baja)) return SIGLAS.get(baja)

    // Abre el nombre, o abre un paréntesis: siempre va en mayúscula.
    const antes = completo.slice(0, pos).trimEnd()
    const esPrimera = antes === '' || antes.endsWith('(')

    if (!esPrimera && MINUSCULAS.has(baja)) return baja
    return baja[0].toUpperCase() + baja.slice(1)
  })
}

const r = await fetch(FUENTE)
if (!r.ok) throw new Error(`No se pudo bajar el dataset: HTTP ${r.status}`)
const datos = await r.json()

// Falla ruidosa si upstream agrega un target nuevo: es preferible romper el
// generador a asignar un grupo equivocado en silencio. Un `grupo` mal puesto
// corrompe el volumen semanal sin que nada lo avise.
const sinMapear = [...new Set(datos.map((e) => e.target))].filter((t) => !(t in GRUPO_POR_TARGET))
if (sinMapear.length) {
  throw new Error(`Targets sin mapear en GRUPO_POR_TARGET: ${sinMapear.join(', ')}`)
}

// ---- Suplemento: ejercicios estándar que le faltan al dataset ----
//
// El dataset tiene 1324 entradas y aun así le faltan ejercicios que hay en
// CUALQUIER gimnasio comercial. No son ejercicios exóticos: son agujeros del
// dataset. Y el catálogo existe justamente para que los récords no se partan por
// una mayúscula; si los ejercicios más registrados caen en la carga a mano,
// el catálogo no sirve para lo único que tenía que servir.
//
// El más grave: NO HAY hip thrust. El dataset solo trae "resistance band hip
// thrusts on knees (female)". El hip thrust con barra es de lo más común que se
// hace para glúteo. Tampoco hay bulgarian split squat (hay 11 split squats,
// ninguno con el pie de atrás elevado) ni face pull.
//
// Criterios para entrar acá:
//   - Genérico y estándar. Esto NO es la rutina de nadie: son ejercicios que usa
//     cualquiera. Nada de series, pesos, ni esquemas personales.
//   - Que NO exista ya con otro nombre. Se verificó uno por uno contra sinónimos:
//     el "pec deck" ya está como "lever seated fly", el "ab wheel" como "wheel
//     rollerout", el "nordic curl" como "inverse leg curl", el "rear delt fly"
//     como "reverse fly", el "glute kickback" como "hip extension". Agregarlos
//     habría creado DOS nombres para el mismo ejercicio: exactamente la partición
//     de historial que el catálogo viene a evitar. Por eso no están.
//   - Mismo idioma y misma convención de nombre que el dataset: minúscula, inglés,
//     "smith ..." para smith machine, "lever ..." para leverage machine.
//   - Mismo vocabulario de `equipo` (los 28 valores que ya usa el dataset).
//   - SIN media_id: no tenemos imagen para estos y no se inventa ni se le presta
//     la de otro ejercicio. ImagenEjercicio degrada solo, con su ícono.
//
// El `grupo` se eligió mirando cómo agrupa el dataset a los vecinos, para que el
// catálogo no se contradiga:
//   - split squat -> quads (11/11)  => bulgarian split squat -> cuadriceps
//   - glute bridge -> glutes        => hip thrust -> gluteo
//   - lunge -> glutes (14)          => curtsy lunge -> gluteo
//   - rear delt row / reverse fly -> delts => face pull -> hombro
//   - dead bug -> abs               => bird dog / hollow hold -> core
//
// OJO con el face pull: va a `hombro` por coherencia interna (el vecino más
// cercano, "cable rear delt row", es delts -> hombro). La semilla de rutina.js
// mapea "Face Pull (cuerda)" a `espalda`. Misma discrepancia que `spine`: la
// semilla es una plantilla genérica y no se migra nada.
const SUPLEMENTO = [
  // --- Hip thrust: el agujero más grande del dataset ---
  { nombre: 'barbell hip thrust', grupo: 'gluteo', equipo: 'barbell' },
  { nombre: 'dumbbell hip thrust', grupo: 'gluteo', equipo: 'dumbbell' },
  { nombre: 'smith hip thrust', grupo: 'gluteo', equipo: 'smith machine' },
  { nombre: 'lever hip thrust', grupo: 'gluteo', equipo: 'leverage machine' },
  { nombre: 'band hip thrust', grupo: 'gluteo', equipo: 'band' },
  { nombre: 'single leg hip thrust', grupo: 'gluteo', equipo: 'body weight' },
  // --- Zancada curtsy ---
  { nombre: 'curtsy lunge', grupo: 'gluteo', equipo: 'body weight' },
  { nombre: 'dumbbell curtsy lunge', grupo: 'gluteo', equipo: 'dumbbell' },
  // --- Bulgarian split squat: hay 11 split squats y ninguno es este ---
  { nombre: 'bulgarian split squat', grupo: 'cuadriceps', equipo: 'body weight' },
  { nombre: 'barbell bulgarian split squat', grupo: 'cuadriceps', equipo: 'barbell' },
  { nombre: 'dumbbell bulgarian split squat', grupo: 'cuadriceps', equipo: 'dumbbell' },
  { nombre: 'smith bulgarian split squat', grupo: 'cuadriceps', equipo: 'smith machine' },
  { nombre: 'barbell box squat', grupo: 'cuadriceps', equipo: 'barbell' },
  // --- Face pull y landmine press ---
  { nombre: 'cable face pull (with rope)', grupo: 'hombro', equipo: 'cable' },
  { nombre: 'band face pull', grupo: 'hombro', equipo: 'band' },
  { nombre: 'landmine press', grupo: 'hombro', equipo: 'barbell' },
  // --- Core ---
  { nombre: 'bird dog', grupo: 'core', equipo: 'body weight' },
  { nombre: 'hollow hold', grupo: 'core', equipo: 'body weight' }
]

const entradas = datos.map((e) => ({
  // Verbatim del dataset, en inglés. No se traduce: solo se repara el encoding
  // roto y se capitaliza (ver capitalizar()).
  nombre: capitalizar(repararNombre(e.name)),
  grupo: GRUPO_POR_TARGET[e.target],
  equipo: e.equipment, // verbatim del dataset.
  // OJO con el nombre: `media_id` acá NO es el `media_id` suelto del dataset
  // ("2gPfomN"), que por sí solo no alcanza para armar la ruta. Upstream guarda
  // `image: "images/0001-2gPfomN.jpg"`, o sea id + media_id. Se guarda esa clave
  // compuesta, que es la mínima que reconstruye la URL.
  media_id: `${e.id}-${e.media_id}`
}))

// El mojibake tiene que haber desaparecido. Si upstream introduce una corrupción
// nueva, es mejor romper el generador que publicar basura en pantalla.
const cirilico = entradas.filter((x) => /[Ѐ-ӿ]/.test(x.nombre))
if (cirilico.length) {
  throw new Error(`Nombres con caracteres cirílicos (¿mojibake nuevo?): ${cirilico.map((x) => x.nombre).join(', ')}`)
}

// El suplemento NO puede pisar un nombre del dataset. Si upstream agrega el hip
// thrust que le falta, esto avisa para sacarlo de acá en vez de terminar con dos
// filas iguales — que es el problema que el catálogo viene a resolver.
const nombresDataset = new Set(entradas.map((x) => x.nombre.toLowerCase()))
const colisiones = SUPLEMENTO.filter((s) => nombresDataset.has(s.nombre.toLowerCase()))
if (colisiones.length) {
  throw new Error(
    `El suplemento choca con nombres que el dataset ya trae (sacarlos de SUPLEMENTO): ${colisiones
      .map((c) => c.nombre)
      .join(', ')}`
  )
}

// El suplemento usa el vocabulario del dataset, no uno propio.
const equiposDataset = new Set(datos.map((e) => e.equipment))
const equiposRaros = SUPLEMENTO.filter((s) => !equiposDataset.has(s.equipo))
if (equiposRaros.length) {
  const lista = equiposRaros.map((s) => `${s.nombre} (${s.equipo})`).join(', ')
  throw new Error(`Suplemento con equipo fuera del vocabulario del dataset: ${lista}`)
}

// El suplemento usa grupos que la app conoce.
const gruposValidos = new Set(Object.values(GRUPO_POR_TARGET))
const gruposRaros = SUPLEMENTO.filter((s) => !gruposValidos.has(s.grupo))
if (gruposRaros.length) {
  throw new Error(`Suplemento con grupo desconocido: ${gruposRaros.map((s) => `${s.nombre} (${s.grupo})`).join(', ')}`)
}

// El suplemento se escribe en minúscula arriba y pasa por el MISMO capitalizar()
// que el dataset. No se capitaliza a mano: si la regla cambia, cambian los 1342
// juntos y el catálogo sigue leyéndose como una sola cosa.
const suplementoFinal = SUPLEMENTO.map((s) => ({ ...s, nombre: capitalizar(s.nombre) }))

// Una sola lista alfabética. El dataset ya viene ordenado; si el suplemento
// quedara pegado al final, "Bulgarian Split Squat" aparecería en el puesto 81 de
// 85 al buscar "squat" — justo lo que se está buscando, al final de todo. El
// orden del array es el orden en que se ven los resultados.
//
// El suplemento sigue siendo revisable donde importa: en la constante SUPLEMENTO
// de este generador, con el criterio de cada uno. En el archivo generado se
// reconoce porque es el único sin media_id.
const todas = [...entradas, ...suplementoFinal].sort((a, b) => a.nombre.localeCompare(b.nombre, 'en'))

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
const fila = (x) =>
  `  { nombre: '${esc(x.nombre)}', grupo: '${x.grupo}', equipo: '${esc(x.equipo)}'${
    x.media_id ? `, media_id: '${x.media_id}'` : ''
  } }`

const filas = todas.map(fila).join(',\n')

const cabecera = `// ============================================================
//  CATÁLOGO DE EJERCICIOS  (generado — no editar a mano)
// ============================================================
// ${todas.length} ejercicios: ${entradas.length} del dataset + ${SUPLEMENTO.length} de suplemento.
// Regenerar con:  node scripts/gen-catalogo.mjs
//
// Fuente: https://github.com/hasaneyldrm/exercises-dataset
//
// ${SUPLEMENTO.length} de esas entradas son SUPLEMENTO: ejercicios estándar de gimnasio que al
// dataset le faltan (no trae hip thrust, ni bulgarian split squat, ni face
// pull). Se reconocen porque son las únicas SIN media_id — no tenemos imagen
// para ellas y no se inventa ninguna. El criterio de por qué entra cada una está
// en scripts/gen-catalogo.mjs.
//
// La lista va alfabética: es el orden en que se ven los resultados al buscar.
//
// Los nombres van capitalizados desde acá, no con CSS: \`nombre\` es la clave de
// los récords, así que lo que se muestra y lo que se guarda tienen que ser el
// mismo string.
//
// Los nombres quedan en inglés, tal cual vienen del dataset. No se traducen: el
// vocabulario de gimnasio ya es inglés (Hip Thrust, Romanian Deadlift, Face
// Pull) y traducirlos inventaría nombres que nadie usa. La búsqueda normaliza
// acentos y mayúsculas, así que se puede tipear sin acentos.
//
// Solo cuatro campos. El dataset trae instrucciones en nueve idiomas: son
// megabytes de prosa que la app no muestra en ningún lado, y se descartan.
//
//   nombre    — verbatim del dataset (inglés)
//   grupo     — grupo muscular de la app (ver GRUPO_LABEL en rutina.js)
//   equipo    — verbatim del dataset (inglés)
//   media_id  — clave que reconstruye la URL upstream de la imagen. NO es el
//               \`media_id\` suelto del dataset: es "{id}-{media_id}", porque
//               upstream sirve \`images/0001-2gPfomN.jpg\`. Es lo que se guarda
//               en la rutina al elegir del catálogo, y de ahí lo lee la sesión.
//
// ------------------------------------------------------------
//  LICENCIA DEL DATASET (datos, NO media)
// ------------------------------------------------------------
// MIT License
//
// Copyright (c) 2026 Hasan Emir Yıldırım
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation and data files (the
// "Software"), to deal in the Software without restriction, including without
// limitation the rights to use, copy, modify, merge, publish, distribute,
// sublicense, and/or sell copies of the Software, and to permit persons to
// whom the Software is furnished to do so, subject to the following
// conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
// DEALINGS IN THE SOFTWARE.
//
// ------------------------------------------------------------
//  MEDIA — © Gym visual, NO redistribuida
// ------------------------------------------------------------
// La licencia MIT de arriba cubre los datos, no las imágenes. La media es
// © Gym visual (https://gymvisual.com/) y queda explícitamente fuera del
// permiso MIT. Este repo NO copia ni re-hostea ninguna imagen: las referencia
// por URL desde upstream, a 180×180, con la atribución visible en el selector.
// Ver README.md.

// Prefijo de la media upstream. Referenciada, nunca copiada acá.
export const MEDIA_BASE = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images'

// Atribución obligatoria de la media (la exige NOTICE.md de upstream: "every
// use must carry the copyright indication"). Se muestra en el selector.
export const MEDIA_ATRIBUCION = '© Gym visual — gymvisual.com'

// URL de la miniatura upstream a partir del media_id del catálogo. Devuelve
// null si no hay media_id — un ejercicio cargado a mano no tiene, y una rutina
// vieja tampoco. Quien renderice decide el fallback (ver ImagenEjercicio.jsx).
//
// La URL se arma acá, en tiempo de render, y NUNCA se guarda en los datos de la
// persona: congelar la ruta de un tercero en su rutina la dejaría rota el día
// que upstream mueva un archivo.
export function urlMedia(mediaId) {
  return mediaId ? \`\${MEDIA_BASE}/\${mediaId}.jpg\` : null
}

export const CATALOGO = [
`

await writeFile(SALIDA, cabecera + filas + '\n]\n')

const reparados = datos.filter((e) => repararNombre(e.name) !== e.name).length
console.log(`catalogo.js: ${todas.length} ejercicios (${entradas.length} dataset + ${SUPLEMENTO.length} suplemento)`)
console.log(`nombres con mojibake reparado: ${reparados}`)

const porGrupo = todas.reduce((a, e) => ({ ...a, [e.grupo]: (a[e.grupo] || 0) + 1 }), {})
console.table(porGrupo)
