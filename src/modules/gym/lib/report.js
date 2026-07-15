// ============================================================
//  GENERACIÓN DEL REPORTE SEMANAL
// ============================================================

import { getSessions, getRutina } from './storage.js'
import { rangoSemana, rangoSemanaAnterior, enRango } from '../../../core/lib/dates.js'
import { OBJETIVOS_VOLUMEN, GRUPO_LABEL } from '../data/rutina.js'

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

  // Grupos entrenados que NO tienen objetivo (pecho, hombro, gemelos... los que
  // trajo el catálogo, o un grupo raro de una rutina importada).
  //
  // Antes se caían del reporte sin decir nada: el reduce de arriba solo recorre
  // OBJETIVOS_VOLUMEN, así que las series de pecho se contaban en volumenRaw y
  // después se tiraban. Se hacía trabajo y no se veía en ningún lado.
  //
  // Ahora se muestran con min/max en null: el volumen es un hecho y se cuenta;
  // el veredicto ("en rango", "por debajo") necesita un objetivo que nadie puso,
  // así que no se inventa. Un objetivo inventado haría que el reporte rete por
  // algo que nunca se propuso: lo contrario de constancia > perfección.
  const sinObjetivo = Object.entries(volumenRaw)
    .filter(([grupo, series]) => series > 0 && !OBJETIVOS_VOLUMEN[grupo])
    .map(([grupo, series]) => ({
      label: GRUPO_LABEL[grupo] || grupo,
      series,
      min: null,
      max: null
    }))

  const volumenLista = [...Object.values(volumen), ...sinObjetivo]

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

// --- Markdown para llevarle el reporte a una IA ---
// Autocontenido: incluye la RUTINA vigente además de los deltas, porque una IA
// sin contexto previo no puede aconsejar sobre números sueltos. Todo sale de
// los datos guardados; nada de constantes del repo.
export function markdownSemana(isoRef) {
  const r = generarReporte(isoRef)
  const rutina = getRutina()
  const L = []

  L.push('## Entrenamiento')
  L.push('')

  if (!r.hayDatos) {
    L.push('_Sin entrenamientos registrados esta semana._')
    L.push('')
  } else {
    L.push(`**Días entrenados:** ${r.diasEntrenados.length}`)
    r.diasEntrenados.forEach((d) => L.push(`- ${d.fecha} · ${d.nombre}`))
    L.push('')

    L.push('### Volumen por grupo (series completadas vs objetivo)')
    L.push('')
    L.push('| Grupo | Series | Objetivo | Estado |')
    L.push('| --- | ---: | :---: | --- |')
    r.volumen.forEach((v) => {
      // Sin objetivo no hay veredicto. Sin este corte, `v.series > null` se
      // evalúa como `> 0` y la tabla le diría a la IA "pecho: por encima del
      // objetivo" sobre un objetivo que no existe.
      const sinObjetivo = v.min == null || v.max == null
      const estado = sinObjetivo
        ? 'sin objetivo'
        : v.series < v.min
          ? 'por debajo'
          : v.series > v.max
            ? 'por encima'
            : 'en rango'
      L.push(`| ${v.label} | ${v.series} | ${sinObjetivo ? '—' : `${v.min}-${v.max}`} | ${estado} |`)
    })
    L.push('')

    if (r.prs.length) {
      L.push('### Récords de la semana')
      L.push('')
      r.prs.forEach((p) => L.push(`- ${p.nombre}: ${p.peso}kg · ${p.reps} reps (${p.tipo})`))
      L.push('')
    }

    L.push('### Ejercicios vs semana anterior')
    L.push('')
    L.push('| Ejercicio | Mejor peso | Mejor reps | Peso | Reps |')
    L.push('| --- | ---: | ---: | :---: | :---: |')
    r.ejercicios.forEach((e) => {
      const unidad = e.tipoReg === 'tiempo' ? 's' : 'kg'
      L.push(`| ${e.nombre} | ${e.mejorPeso}${unidad === 's' ? '' : 'kg'} | ${e.mejorReps}${unidad === 's' ? 's' : ''} | ${e.tendenciaPeso.flecha} | ${e.tendenciaReps.flecha} |`)
    })
    L.push('')

    L.push(r.cardio.length ? `**Cardio:** ${r.cardio.length} sesión(es) — ${r.cardio.map((c) => `${c.fecha} (${c.nombre})`).join(' · ')}` : '**Cardio:** ninguno esta semana')
    L.push('')

    if (r.notas) {
      L.push(`**Cómo me sentí:** ${r.notas}`)
      L.push('')
    }
  }

  // Contexto de la rutina: sin esto, una IA no sabe qué se suponía que pasara.
  L.push('### Rutina vigente (contexto)')
  L.push('')
  Object.values(rutina).forEach((d) => {
    const ejs = (d.ejercicios || []).map((e) => `${e.nombre} ${e.series}×${e.reps}`).join(' · ')
    L.push(`- **${d.nombre}**${ejs ? `: ${ejs}` : ''}${d.cardio ? ` · cardio: ${d.cardio.nombre}` : ''}`)
  })
  L.push('')
  return L.join('\n')
}
