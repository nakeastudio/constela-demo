// ============================================================
//  REPORTE SEMANAL DE SKINCARE
// ============================================================
// Espeja modules/nutricion/lib/report.js. No reimplementa los límites de
// semana: los toma de core/lib/dates.js, igual que los otros reportes.
//
// El promedio de la semana manda. Un paso salteado es contexto, no un
// veredicto: acá no hay "pasos fallados", hay pasos registrados y una
// adherencia por rutina.

import { rangoSemana, toISO, fromISO } from '../../../core/lib/dates.js'
import { getRutinas, getDiaSkincare, rutinasDeFecha } from './storage.js'

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

export function generarReporte(isoRef) {
  const { inicio, fin } = rangoSemana(isoRef)
  const fechas = fechasDe(inicio, fin)

  // --- Adherencia por rutina ---
  // Denominador = pasos que la rutina pedía los días que aplicó esa semana.
  // Numerador = pasos marcados. No se castiga lo que falta: se cuenta lo hecho.
  const porRutina = {}
  let planificadosTotal = 0
  let hechosTotal = 0

  fechas.forEach((f) => {
    const registro = getDiaSkincare(f)
    rutinasDeFecha(f).forEach((r) => {
      if (!porRutina[r.id]) porRutina[r.id] = { id: r.id, nombre: r.nombre, planificados: 0, hechos: 0 }
      r.pasos.forEach((p) => {
        porRutina[r.id].planificados += 1
        planificadosTotal += 1
        if (registro.pasos[p.id]?.done) {
          porRutina[r.id].hechos += 1
          hechosTotal += 1
        }
      })
    })
  })

  const adherencia = Object.values(porRutina).map((x) => ({
    ...x,
    pct: x.planificados ? Math.round((x.hechos / x.planificados) * 100) : 0
  }))

  return {
    rango: { inicio, fin },
    adherencia,
    adherenciaTotal: planificadosTotal ? Math.round((hechosTotal / planificadosTotal) * 100) : 0,
    planificadosTotal,
    hechosTotal,
    hayDatos: hechosTotal > 0
  }
}

// --- Markdown para llevarle el reporte a una IA ---
// Autocontenido: incluye las RUTINAS vigentes (días y pasos), no solo los
// deltas, porque una IA sin contexto previo no puede aconsejar sobre números
// sueltos. Todo sale de lo guardado; nada de constantes del repo.
export function markdownSemana(isoRef) {
  const { rutinas } = getRutinas()
  const r = generarReporte(isoRef)
  const L = []

  L.push('## Skincare')
  L.push('')

  if (!r.hayDatos) {
    L.push('_Sin registros de skincare esta semana._')
    L.push('')
  } else {
    L.push(`**Adherencia general:** ${r.adherenciaTotal}% (${r.hechosTotal}/${r.planificadosTotal} pasos)`)
    L.push('')
    L.push('### Adherencia por rutina')
    L.push('')
    L.push('| Rutina | Cumplidos | Planificados | % |')
    L.push('| --- | ---: | ---: | ---: |')
    r.adherencia.forEach((a) => L.push(`| ${a.nombre} | ${a.hechos} | ${a.planificados} | ${a.pct}% |`))
    L.push('')
  }

  // Contexto de las rutinas: sin esto, una IA no sabe contra qué comparar.
  L.push('### Rutinas vigentes (contexto)')
  L.push('')
  rutinas.forEach((rut) => {
    const dias = rut.dias.length === 7 ? 'todos los días' : rut.dias.join(', ')
    L.push(`- **${rut.nombre}** (${dias}): ${rut.pasos.map((p) => p.nombre).join(' → ')}`)
  })
  L.push('')
  return L.join('\n')
}
