// ============================================================
//  REPORTE SEMANAL DE NUTRICIÓN
// ============================================================
// Espeja modules/gym/lib/report.js. No reimplementa los límites de semana:
// los toma de core/lib/dates.js, igual que el reporte del gym.
//
// El promedio de la semana manda. Un día flojo es contexto, no un veredicto:
// por eso acá no hay "días fallados", hay días registrados y un promedio.

import { rangoSemana, enRango, toISO, fromISO } from '../../../core/lib/dates.js'
import { getPlan, getDiaNutricion, litrosObjetivoDe } from './storage.js'
import { claveDiaDeFecha, CATEGORIAS } from '../data/plan.js'

// Fechas ISO de un rango inclusivo.
function fechasDe(inicio, fin) {
  const out = []
  const d = fromISO(inicio)
  const hasta = fromISO(fin)
  while (d <= hasta) {
    out.push(toISO(d))
    d.setDate(d.getDate() + 1)
  }
  return out
}

// Un día "en objetivo" es un día con TODAS las comidas del plan marcadas.
// No se castiga lo que falta: solo se cuenta lo que se cumplió.
function diaEnObjetivo(plan, fecha) {
  const dia = plan.dias[claveDiaDeFecha(fecha)]
  if (!dia || !dia.comidas.length) return false
  const reg = getDiaNutricion(fecha)
  return dia.comidas.every((c) => reg.comidas[c.id]?.done)
}

export function generarReporte(isoRef) {
  const plan = getPlan()
  const { inicio, fin } = rangoSemana(isoRef)
  const fechas = fechasDe(inicio, fin)

  // --- Adherencia por tipo de comida ---
  // Denominador = comidas que el plan pedía esa semana. Numerador = marcadas.
  const porCategoria = {}
  let planificadasTotal = 0
  let hechasTotal = 0

  fechas.forEach((f) => {
    const dia = plan.dias[claveDiaDeFecha(f)]
    if (!dia) return
    const reg = getDiaNutricion(f)
    dia.comidas.forEach((c) => {
      const cat = c.categoria
      if (!porCategoria[cat]) porCategoria[cat] = { categoria: cat, label: CATEGORIAS[cat] || cat, planificadas: 0, hechas: 0 }
      porCategoria[cat].planificadas += 1
      planificadasTotal += 1
      if (reg.comidas[c.id]?.done) {
        porCategoria[cat].hechas += 1
        hechasTotal += 1
      }
    })
  })

  const adherencia = Object.values(porCategoria).map((x) => ({
    ...x,
    pct: x.planificadas ? Math.round((x.hechas / x.planificadas) * 100) : 0
  }))

  // --- Días en objetivo ---
  const diasConPlan = fechas.filter((f) => plan.dias[claveDiaDeFecha(f)])
  const diasEnObjetivo = diasConPlan.filter((f) => diaEnObjetivo(plan, f))

  // --- Racha de suplementos ---
  // Días consecutivos (hacia atrás desde el final de la semana) con TODOS los
  // suplementos del plan marcados. Solo cuenta hasta hoy: el futuro no rompe
  // una racha que todavía no pudo pasar.
  const hoy = toISO(new Date())
  const hastaHoy = fechas.filter((f) => f <= hoy)
  let racha = 0
  for (let i = hastaHoy.length - 1; i >= 0; i--) {
    const reg = getDiaNutricion(hastaHoy[i])
    const todos = plan.suplementos.length > 0 && plan.suplementos.every((s) => reg.suplementos[s.id]?.done)
    if (!todos) break
    racha += 1
  }

  // --- Agua ---
  const aguas = hastaHoy.map((f) => ({
    fecha: f,
    litros: getDiaNutricion(f).agua.ml / 1000,
    objetivo: litrosObjetivoDe(f)
  }))
  const conRegistro = aguas.filter((a) => a.litros > 0)
  const promedioAgua = conRegistro.length
    ? conRegistro.reduce((s, a) => s + a.litros, 0) / conRegistro.length
    : 0
  const objetivoPromedio = aguas.length ? aguas.reduce((s, a) => s + a.objetivo, 0) / aguas.length : 0

  // --- Anotaciones de la semana ---
  const notas = []
  fechas.forEach((f) => {
    const reg = getDiaNutricion(f)
    Object.entries(reg.comidas).forEach(([id, c]) => {
      if (c.nota && c.nota.trim()) notas.push({ fecha: f, id, nota: c.nota.trim() })
    })
  })

  return {
    rango: { inicio, fin },
    adherencia,
    adherenciaTotal: planificadasTotal ? Math.round((hechasTotal / planificadasTotal) * 100) : 0,
    planificadasTotal,
    hechasTotal,
    diasEnObjetivo: diasEnObjetivo.length,
    diasConPlan: diasConPlan.length,
    rachaSuplementos: racha,
    agua: {
      promedio: Math.round(promedioAgua * 100) / 100,
      objetivoPromedio: Math.round(objetivoPromedio * 100) / 100,
      diasRegistrados: conRegistro.length
    },
    notas,
    hayDatos: hechasTotal > 0 || conRegistro.length > 0 || racha > 0
  }
}

// --- Markdown para llevarle el reporte a una IA ---
// Autocontenido: incluye el PLAN (objetivos y comidas), no solo los deltas,
// porque una IA sin contexto previo no puede aconsejar sobre números sueltos.
// Todo sale de los datos guardados; nada de constantes del repo.
export function markdownSemana(isoRef) {
  const plan = getPlan()
  const r = generarReporte(isoRef)
  const L = []

  L.push('## Nutrición')
  L.push('')

  if (!r.hayDatos) {
    L.push('_Sin registros de nutrición esta semana._')
    L.push('')
  } else {
    L.push(`**Adherencia general:** ${r.adherenciaTotal}% (${r.hechasTotal}/${r.planificadasTotal} comidas del plan)`)
    L.push(`**Días completos:** ${r.diasEnObjetivo}/${r.diasConPlan}`)
    L.push(`**Racha de suplementos:** ${r.rachaSuplementos} día(s) seguidos`)
    L.push(
      r.agua.diasRegistrados
        ? `**Agua:** promedio ${r.agua.promedio}L/día sobre un objetivo promedio de ${r.agua.objetivoPromedio}L (${r.agua.diasRegistrados} día(s) registrados)`
        : '**Agua:** sin registros esta semana'
    )
    L.push('')
    L.push('### Adherencia por tipo de comida')
    L.push('')
    L.push('| Tipo | Cumplidas | Planificadas | % |')
    L.push('| --- | ---: | ---: | ---: |')
    r.adherencia.forEach((a) => L.push(`| ${a.label} | ${a.hechas} | ${a.planificadas} | ${a.pct}% |`))
    L.push('')
    if (r.notas.length) {
      L.push('### Anotaciones')
      L.push('')
      r.notas.forEach((n) => L.push(`- ${n.fecha} · ${n.id}: ${n.nota}`))
      L.push('')
    }
  }

  // Contexto del plan: sin esto, una IA no sabe contra qué comparar.
  L.push('### Plan vigente (contexto)')
  L.push('')
  L.push('| Día | Tipo | Kcal | Proteína | Carbos | Grasa |')
  L.push('| --- | --- | ---: | ---: | ---: | ---: |')
  Object.entries(plan.dias).forEach(([, d]) => {
    const o = d.objetivos || {}
    L.push(`| ${d.nombre} | ${d.tipo} | ${o.kcal ?? '—'} | ${o.proteina ?? '—'}g | ${o.carbos ?? '—'}g | ${o.grasa != null ? o.grasa + 'g' : '—'} |`)
  })
  L.push('')
  L.push(`**Objetivo de agua:** ${plan.agua.normal}L normal · ${plan.agua.gym}L los días de entrenamiento`)
  L.push('')
  if (plan.reglas?.length) {
    L.push('**Reglas del plan:**')
    plan.reglas.forEach((x) => L.push(`- ${x}`))
    L.push('')
  }
  return L.join('\n')
}
