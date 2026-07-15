// ============================================================
//  HELPERS DE SESIÓN
// ============================================================
// Construye la estructura de una sesión a partir de un día de la rutina,
// auto-rellenando peso/reps de la última vez que se hizo cada ejercicio.

import { getSessions, getRutina } from './storage.js'
import { rangoSemana, enRango, hoyISO } from '../../../core/lib/dates.js'

// Id opaco y estable. NO se deriva de la fecha: la fecha es editable (se puede
// mover una sesión de día) y un id derivado dejaría huérfana la fila vieja en
// el upsert de saveSession, duplicando el historial. Los ids viejos con forma
// `2026-07-15_dia1` siguen siendo válidos: nadie los interpreta.
function nuevoId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// Aplana fuerza + core en una sola lista de ejercicios "registrables"
export function ejerciciosDelDia(dia) {
  const fuerza = (dia.ejercicios || []).map((e) => ({ ...e, seccion: 'fuerza' }))
  const core = (dia.core || []).map((e) => ({ ...e, seccion: 'core' }))
  return [...fuerza, ...core]
}

// Busca los últimos valores registrados de un ejercicio (sesión más reciente)
export function ultimosValores(nombreEjercicio) {
  const sessions = getSessions()
  for (let i = sessions.length - 1; i >= 0; i--) {
    const ej = sessions[i].ejercicios.find((e) => e.nombre === nombreEjercicio)
    if (ej && ej.sets.some((s) => s.done)) {
      // último set hecho con datos
      const done = ej.sets.filter((s) => s.done)
      const ref = done[done.length - 1]
      return { peso: ref.peso ?? '', reps: ref.reps ?? '', segundos: ref.segundos ?? '' }
    }
  }
  return null
}

// Devuelve los sets COMPLETADOS de la última sesión donde se hizo este ejercicio.
// Sirve para la columna "Anterior" estilo Hevy (referencia por serie).
export function ultimaSesionSets(nombreEjercicio) {
  const sessions = getSessions()
  for (let i = sessions.length - 1; i >= 0; i--) {
    const ej = sessions[i].ejercicios.find((e) => e.nombre === nombreEjercicio)
    if (ej && ej.sets.some((s) => s.done)) {
      return ej.sets.filter((s) => s.done)
    }
  }
  return []
}

// Crea una sesión nueva (o draft) lista para registrar
export function crearSesion(diaKey, dia, fecha) {
  const lista = ejerciciosDelDia(dia)
  const ejercicios = lista.map((ej) => {
    const tipoReg = ej.tipoReg || 'peso'
    const last = ultimosValores(ej.nombre)
    // `registradoEn` sigue la convención de core/lib/dia.js: cuándo pasó la
    // serie. Null mientras no esté marcada.
    const sets = Array.from({ length: ej.series }, () => ({
      peso: last?.peso ?? '',
      reps: tipoReg === 'tiempo' ? '' : (last?.reps ?? ''),
      segundos: tipoReg === 'tiempo' ? (last?.segundos ?? '') : '',
      done: false,
      registradoEn: null
    }))
    return {
      nombre: ej.nombre,
      grupo: ej.grupo,
      seccion: ej.seccion,
      tipoReg,
      descanso: ej.descanso,
      repsObjetivo: ej.reps,
      seriesObjetivo: ej.series,
      sets,
      done: false
    }
  })

  return {
    id: nuevoId(),
    fecha,
    diaKey,
    diaNombre: dia.nombre,
    ejercicios,
    cardio: dia.cardio ? { nombre: dia.cardio.nombre, done: false } : null,
    notas: '',
    finalizada: false,
    completadaEn: null
  }
}

// ¿Todas las series de un ejercicio están completas?
export function ejercicioCompleto(ej) {
  return ej.sets.length > 0 && ej.sets.every((s) => s.done)
}

// ¿La sesión se cerró? Un día cuenta como entrenado porque existe una sesión
// FINALIZADA, no porque un timestamp sea truthy. `finalizada` guarda la
// intención; `completadaEn` guarda solo el cuándo, y por eso puede editarse
// sin que el calendario se apague.
//
// Lectura tolerante: las sesiones guardadas antes de `finalizada` no lo traen,
// así que se cae a la presencia de `completadaEn`, que era el criterio viejo.
export function sesionFinalizada(s) {
  if (!s) return false
  return s.finalizada ?? s.completadaEn != null
}

// --- Resumen para la tarjeta del módulo en HOY ---
// Lo arma el módulo: core no sabe qué es un entrenamiento.
export function resumenHoy() {
  const { inicio, fin } = rangoSemana(hoyISO())
  const dias = new Set()
  getSessions().forEach((s) => {
    if (enRango(s.fecha, inicio, fin) && sesionFinalizada(s)) dias.add(s.diaKey)
  })
  const total = Object.keys(getRutina()).length
  return { hecho: dias.size, total, detalle: `${dias.size}/${total} días esta semana` }
}
