// ============================================================
//  PERSISTENCIA DEL MÓDULO GYM
// ============================================================
// El módulo es dueño de sus claves y de su semilla. Core no sabe que existe.
// Las claves mantienen el prefijo histórico `appgym:` (ver core/lib/storage.js).

import { leer, escribir, borrar } from '../../../core/lib/storage.js'
import { RUTINA_INICIAL } from '../data/rutina.js'

// --- RUTINA ---
// Ojo: getRutina() devuelve la copia guardada, así que editar RUTINA_INICIAL
// no llega a quien ya tiene datos. Por eso Routine.jsx expone "Restaurar la
// rutina original" — la semilla es un punto de partida, no una fuente viva.
export function getRutina() {
  return leer('rutina', RUTINA_INICIAL)
}
export function saveRutina(rutina) {
  escribir('rutina', rutina)
}
export function resetRutina() {
  escribir('rutina', RUTINA_INICIAL)
  return RUTINA_INICIAL
}

// --- SESIONES (historial) ---
export function getSessions() {
  return leer('sessions', [])
}
export function saveSession(session) {
  const all = getSessions()
  // Upsert por id. El id es OPACO y estable: no se deriva de la fecha, así que
  // mover una sesión de día edita `fecha` sin duplicar la fila.
  const idx = all.findIndex((s) => s.id === session.id)
  if (idx >= 0) all[idx] = session
  else all.push(session)
  all.sort((a, b) => a.fecha.localeCompare(b.fecha))
  escribir('sessions', all)
  return all
}
export function deleteSession(id) {
  const all = getSessions().filter((s) => s.id !== id)
  escribir('sessions', all)
  return all
}

// --- SESIONES ACTIVAS (en curso, autoguardadas) ---
// Los borradores se guardan POR DÍA. Antes había uno solo: cambiar de día a
// mitad de un entrenamiento pisaba el borrador anterior sin avisar y se perdía
// lo registrado. Guardarlos por clave de día lo resuelve sin diálogos ni
// gestión de borradores múltiples.
//
// Forma vieja: un objeto de sesión suelto (tiene `id`). Se lee como el
// borrador de SU día y se normaliza en la próxima escritura. Sin migración.
function leerBorradores() {
  const raw = leer('activeSession', null)
  if (!raw) return {}
  if (raw.id) return raw.diaKey ? { [raw.diaKey]: raw } : {}
  return raw
}

export function getActiveSession(diaKey) {
  return leerBorradores()[diaKey] || null
}

// Todos los borradores en curso (mapa diaKey→sesión). Lo usa App para armar la
// barra de sesión persistente sin conocer la forma interna del almacenamiento
// (mismo idioma que getActiveSession, pero sin fijar un día).
export function getActiveSessions() {
  return leerBorradores()
}

export function saveActiveSession(session) {
  const borradores = leerBorradores()
  borradores[session.diaKey] = session
  escribir('activeSession', borradores)
}

export function clearActiveSession(diaKey) {
  const borradores = leerBorradores()
  delete borradores[diaKey]
  if (Object.keys(borradores).length === 0) borrar('activeSession')
  else escribir('activeSession', borradores)
}

// --- PRs (récords personales) ---
// Estructura: { [nombreEjercicio]: { maxPeso, maxReps, fecha } }
export function getPRs() {
  return leer('prs', {})
}
export function savePRs(prs) {
  escribir('prs', prs)
}

// ============================================================
//  LÓGICA DE PRs
// ============================================================
// Recalcula los récords a partir de una sesión completada. Un PR salta cuando
// se supera el peso máximo o las reps máximas previas de un ejercicio.
// Devuelve { prs, nuevos: [nombres] }.
export function actualizarPRs(session) {
  const prs = getPRs()
  const nuevos = []

  session.ejercicios.forEach((ej) => {
    if (ej.tipoReg === 'cardio') return
    let mejorPeso = 0
    let mejorReps = 0
    ej.sets.forEach((set) => {
      if (!set.done) return
      const peso = Number(set.peso) || 0
      const reps = Number(set.reps ?? set.segundos) || 0
      if (peso > mejorPeso) mejorPeso = peso
      if (reps > mejorReps) mejorReps = reps
    })
    if (mejorPeso === 0 && mejorReps === 0) return

    const prev = prs[ej.nombre] || { maxPeso: 0, maxReps: 0, fecha: null }
    let esPR = false
    if (mejorPeso > (prev.maxPeso || 0)) {
      prev.maxPeso = mejorPeso
      esPR = true
    }
    if (mejorReps > (prev.maxReps || 0)) {
      prev.maxReps = mejorReps
      esPR = true
    }
    if (esPR) {
      prev.fecha = session.fecha
      prs[ej.nombre] = prev
      nuevos.push(ej.nombre)
    }
  })

  savePRs(prs)
  return { prs, nuevos }
}

// ============================================================
//  CONTRATO DE MÓDULO  (lo consume core/lib/modulos.js)
// ============================================================
export const moduloGym = {
  id: 'gym',
  nombre: 'Entrenamiento',

  // Un día puede tener más de una sesión (ella podría entrenar dos veces), así
  // que la porción del gym es una lista, no un objeto suelto.
  diaSlice: (fecha) => {
    const sesiones = getSessions().filter((s) => s.fecha === fecha)
    return sesiones.length ? { sesiones } : null
  },

  fechasConRegistro: () => getSessions().map((s) => s.fecha),

  // Una línea para el Historial. Cuenta series HECHAS, no series planificadas:
  // lo que no se hizo no es un número que valga la pena mostrar en el pasado.
  resumenDia: (fecha) => {
    const sesiones = getSessions().filter((s) => s.fecha === fecha)
    if (!sesiones.length) return null
    const series = sesiones.reduce(
      (a, s) => a + s.ejercicios.reduce((b, e) => b + e.sets.filter((x) => x.done).length, 0),
      0
    )
    const nombres = sesiones.map((s) => (s.diaNombre || 'Sesión').replace(/^Día \d+ — /, '')).join(' · ')
    return { detalle: `${nombres} · ${series} series` }
  }

  // markdownSemana se engancha en modules/registro.js: report.js ya depende de
  // este archivo, así que importarlo acá cerraría un ciclo.
}
