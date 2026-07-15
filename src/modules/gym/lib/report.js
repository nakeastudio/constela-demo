// ============================================================
//  GENERACIÓN DEL REPORTE SEMANAL
// ============================================================

import { getSessions } from './storage.js'
import { rangoSemana, rangoSemanaAnterior, enRango } from '../../../core/lib/dates.js'
import { OBJETIVOS_VOLUMEN } from '../data/rutina.js'

// Filtra sesiones dentro de un rango [inicio, fin]
function sesionesEnRango(sessions, inicio, fin) {
  return sessions.filter((s) => enRango(s.fecha, inicio, fin))
}

// Mejor peso y reps de un ejercicio dentro de un grupo de sesiones
function mejorDeEjercicio(sesiones, nombre) {
  let peso = 0
  let reps = 0
  let encontrado = false
  sesiones.forEach((s) => {
    const ej = s.ejercicios.find((e) => e.nombre === nombre)
    if (!ej) return
    ej.sets.forEach((set) => {
      if (!set.done) return
      encontrado = true
      const p = Number(set.peso) || 0
      const r = Number(set.reps ?? set.segundos) || 0
      if (p > peso) peso = p
      if (r > reps) reps = r
    })
  })
  return encontrado ? { peso, reps } : null
}

// Flecha de comparación: ↑ subió, ↓ bajó, = mantuvo
function tendencia(actual, anterior) {
  if (anterior == null) return { flecha: '—', dir: 'nuevo' }
  if (actual > anterior) return { flecha: '↑', dir: 'sube' }
  if (actual < anterior) return { flecha: '↓', dir: 'baja' }
  return { flecha: '=', dir: 'igual' }
}

// Construye el reporte completo de la semana que contiene `isoRef` (default: hoy)
export function generarReporte(isoRef) {
  const sessions = getSessions()
  const { inicio, fin } = rangoSemana(isoRef)
  const { inicio: pInicio, fin: pFin } = rangoSemanaAnterior(isoRef)

  const actuales = sesionesEnRango(sessions, inicio, fin)
  const previas = sesionesEnRango(sessions, pInicio, pFin)

  // --- Días entrenados ---
  const diasEntrenados = actuales.map((s) => ({
    fecha: s.fecha,
    diaKey: s.diaKey,
    nombre: s.diaNombre
  }))

  // --- Ejercicios entrenados (con comparación vs semana anterior) ---
  const nombresEjercicios = []
  actuales.forEach((s) =>
    s.ejercicios.forEach((e) => {
      if (e.sets.some((set) => set.done) && !nombresEjercicios.includes(e.nombre)) {
        nombresEjercicios.push(e.nombre)
      }
    })
  )

  const ejercicios = nombresEjercicios.map((nombre) => {
    // Recolecta todas las series hechas esta semana (por sesión)
    const seriesSemana = []
    let tipoReg = 'peso'
    actuales.forEach((s) => {
      const ej = s.ejercicios.find((e) => e.nombre === nombre)
      if (!ej) return
      tipoReg = ej.tipoReg
      ej.sets.forEach((set) => {
        if (set.done) seriesSemana.push({ peso: set.peso, reps: set.reps, segundos: set.segundos })
      })
    })

    const mejorAct = mejorDeEjercicio(actuales, nombre)
    const mejorPrev = mejorDeEjercicio(previas, nombre)

    return {
      nombre,
      tipoReg,
      series: seriesSemana,
      tendenciaPeso: tendencia(mejorAct?.peso ?? 0, mejorPrev?.peso),
      tendenciaReps: tendencia(mejorAct?.reps ?? 0, mejorPrev?.reps),
      mejorPeso: mejorAct?.peso ?? 0,
      mejorReps: mejorAct?.reps ?? 0
    }
  })

  // --- PRs logrados esta semana (fecha del PR dentro del rango) ---
  // Se recalculan comparando contra todo lo anterior a esta semana.
  const previasTotales = sessions.filter((s) => s.fecha < inicio)
  const prs = []
  nombresEjercicios.forEach((nombre) => {
    const histPrev = mejorDeEjercicio(previasTotales, nombre)
    const act = mejorDeEjercicio(actuales, nombre)
    if (!act) return
    const supPeso = act.peso > (histPrev?.peso ?? 0)
    const supReps = act.reps > (histPrev?.reps ?? 0)
    if (supPeso || supReps) {
      prs.push({
        nombre,
        peso: act.peso,
        reps: act.reps,
        tipo: supPeso && supReps ? 'peso y reps' : supPeso ? 'peso' : 'reps'
      })
    }
  })

  // --- Cardio realizado ---
  const cardio = actuales
    .filter((s) => s.cardio && s.cardio.done)
    .map((s) => ({ fecha: s.fecha, nombre: s.cardio.nombre }))

  // --- Volumen por grupo muscular (series completadas) ---
  const volumenRaw = {}
  actuales.forEach((s) =>
    s.ejercicios.forEach((ej) => {
      const hechos = ej.sets.filter((set) => set.done).length
      if (!hechos) return
      volumenRaw[ej.grupo] = (volumenRaw[ej.grupo] || 0) + hechos
    })
  )
  // Agrupa cuadriceps+isquios como objetivo conjunto
  const volumen = Object.entries(OBJETIVOS_VOLUMEN).reduce((acc, [grupo, obj]) => {
    if (!acc[obj.label]) acc[obj.label] = { label: obj.label, series: 0, min: obj.min, max: obj.max }
    acc[obj.label].series += volumenRaw[grupo] || 0
    return acc
  }, {})
  const volumenLista = Object.values(volumen)

  // --- Notas (de la primera sesión que tenga notas) ---
  const notas = actuales.find((s) => s.notas && s.notas.trim())?.notas || ''

  return {
    rango: { inicio, fin },
    diasEntrenados,
    ejercicios,
    prs,
    cardio,
    volumen: volumenLista,
    notas,
    hayDatos: actuales.length > 0
  }
}
