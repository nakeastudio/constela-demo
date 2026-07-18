// ============================================================
//  PERSISTENCIA DEL MÓDULO SKINCARE
// ============================================================
// Mismo trato que gym y nutrición: el módulo es dueño de sus claves y de su
// semilla. Claves nuevas con el prefijo histórico `appgym:` por consistencia
// (renombrarlo huerfanaría el historial real que ya existe en el dispositivo).
//
// Un día de skincare sigue la convención de core/lib/dia.js: cada paso marcable
// es { done, registradoEn }. Un día nuevo nace vacío solo: no hay "reset", hay
// una fecha distinta.

import { leer, escribir } from '../../../core/lib/storage.js'
import { RUTINAS_INICIAL, claveDiaDeFecha } from '../data/rutinas.js'

// --- RUTINAS (editable, la semilla es solo el arranque) ---
export function getRutinas() {
  return leer('skincare', RUTINAS_INICIAL)
}
export function saveRutinas(rutinas) {
  escribir('skincare', rutinas)
}
export function resetRutinas() {
  escribir('skincare', RUTINAS_INICIAL)
  return RUTINAS_INICIAL
}

// ¿La semilla avanzó respecto de lo guardado? Se usa para ofrecer restaurar
// sin pisar nada por sorpresa.
export function rutinasDesactualizadas() {
  const guardado = leer('skincare', null)
  return !!guardado && (guardado.version || 0) < RUTINAS_INICIAL.version
}

// --- REGISTRO DIARIO ---
// { '2026-07-15': { pasos: { [pasoId]: { done, registradoEn } } } }
// Una sola fila por fecha, igual que nutrición. El registro se indexa por
// pasoId (opaco y estable): renombrar un paso no huerfana lo marcado.
function getDias() {
  return leer('skincare_dias', {})
}
function saveDias(dias) {
  escribir('skincare_dias', dias)
}

export function diaVacio() {
  return { pasos: {} }
}

export function getDiaSkincare(fecha) {
  const d = getDias()[fecha]
  if (!d) return diaVacio()
  // Lectura tolerante: un registro viejo puede no traer todas las secciones.
  return { ...diaVacio(), ...d, pasos: { ...(d.pasos || {}) } }
}

export function saveDiaSkincare(fecha, registro) {
  const dias = getDias()
  dias[fecha] = registro
  saveDias(dias)
  return registro
}

// --- Qué rutinas aplican a una fecha ---
// Puede devolver varias: la mañana y una de noche caen el mismo día. El orden
// es el de la lista de rutinas, para que la pantalla las muestre estable.
export function rutinasDeFecha(fecha) {
  const clave = claveDiaDeFecha(fecha)
  return getRutinas().rutinas.filter((r) => r.dias.includes(clave))
}

// Total de pasos planificados y hechos de una fecha, cruzando todas las rutinas
// que aplican ese día. Un helper para los resúmenes.
function conteoDe(fecha) {
  const rutinas = rutinasDeFecha(fecha)
  const registro = getDiaSkincare(fecha)
  let total = 0
  let hecho = 0
  rutinas.forEach((r) => {
    r.pasos.forEach((p) => {
      total += 1
      if (registro.pasos[p.id]?.done) hecho += 1
    })
  })
  return { hecho, total, rutinas: rutinas.length }
}

// --- Resumen para la tarjeta del módulo en HOY ---
export function resumenHoy(fecha) {
  const { hecho, total, rutinas } = conteoDe(fecha)
  return {
    hecho,
    total,
    detalle: `${hecho}/${total} pasos · ${rutinas} rutina${rutinas === 1 ? '' : 's'}`
  }
}

// ============================================================
//  CONTRATO DE MÓDULO  (lo consume core/lib/modulos.js)
// ============================================================
export const moduloSkincare = {
  id: 'skincare',
  nombre: 'Skincare',

  diaSlice: (fecha) => {
    const d = getDias()[fecha]
    return d || null
  },

  fechasConRegistro: () => Object.keys(getDias()),

  // Una línea para el Historial. Sin registro guardado devuelve null: abrir un
  // día no lo convierte en historia.
  resumenDia: (fecha) => {
    if (!getDias()[fecha]) return null
    const { hecho, total } = conteoDe(fecha)
    return { detalle: `${hecho}/${total} pasos` }
  }

  // markdownSemana se engancha en modules/registro.js (ver gym/lib/storage.js):
  // report.js ya depende de este archivo, así que importarlo acá cerraría un
  // ciclo de imports.
}

// Re-export por comodidad de las pantallas.
export { claveDiaDeFecha }
