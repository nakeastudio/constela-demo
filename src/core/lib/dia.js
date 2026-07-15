// ============================================================
//  EL DÍA — primitiva transversal a los módulos
// ============================================================
// Un día es la unidad de registro y cruza módulos: el lunes es gym + nutrición
// (y mañana skincare), no tres apps separadas que comparten una fecha.
//
// El día NO se guarda: se compone al leer. Cada módulo es dueño de su propio
// almacenamiento y responde "¿qué tenés de esta fecha?". Guardar además un
// registro-de-día duplicaría la fuente de verdad y pediría sincronizarlos.
//
// ---- Convención de marcado (la comparten TODOS los módulos) ----
//   { done: boolean, registradoEn: string|null, ...campos del módulo }
//
//   `done`         se llama así porque así se llama ya en los datos reales
//                  guardados del gym. Renombrarlo obligaría a migrar cada
//                  serie del historial para no ganar nada.
//   `registradoEn` ISO completo. Es CUÁNDO PASÓ, no cuándo se anotó: se
//                  autocompleta con el momento actual al marcar porque casi
//                  siempre se registra en el momento, pero es editable porque
//                  a veces no. Un solo timestamp a propósito — no hay a quién
//                  auditar, y dos obligarían a elegir cuál se edita.
//
// `registradoEn` manda sobre la fecha del día: si se corrige el timestamp a
// otro día, el registro se mueve de día. Por eso los ids de sesión son opacos
// (ver modules/gym/lib/session.js): un id derivado de la fecha se rompería.

import { toISO } from './dates.js'
import { modulos } from './modulos.js'

export function ahoraISO() {
  return new Date().toISOString()
}

// Marca un ítem. Sin `cuando`, se asume ahora.
export function marcarItem(item, cuando = ahoraISO()) {
  return { ...item, done: true, registradoEn: cuando }
}

export function desmarcarItem(item) {
  return { ...item, done: false, registradoEn: null }
}

export function alternarItem(item, cuando) {
  return item?.done ? desmarcarItem(item) : marcarItem(item || {}, cuando)
}

// Lectura tolerante: los datos guardados antes de esta convención no tienen
// `registradoEn`. Devolver null (y no inventar una hora) es lo honesto: la UI
// muestra "sin hora" y ofrece completarla.
export function registradoEnDe(item) {
  return item?.registradoEn || null
}

// A qué día pertenece un registro, según su timestamp.
export function fechaDeRegistro(registradoEn) {
  if (!registradoEn) return null
  const d = new Date(registradoEn)
  return isNaN(d.getTime()) ? null : toISO(d)
}

// --- El día compuesto ---
// { fecha, modulos: { gym: <porción>|null, nutricion: <porción>|null } }
export function getDia(fecha) {
  const porciones = {}
  modulos().forEach((m) => {
    porciones[m.id] = m.diaSlice ? m.diaSlice(fecha) : null
  })
  return { fecha, modulos: porciones }
}

// Todas las fechas con registro de cualquier módulo, más recientes primero.
export function fechasConRegistro() {
  const set = new Set()
  modulos().forEach((m) => {
    if (!m.fechasConRegistro) return
    m.fechasConRegistro().forEach((f) => set.add(f))
  })
  return [...set].sort((a, b) => b.localeCompare(a))
}
