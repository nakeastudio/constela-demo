// ============================================================
//  PERSISTENCIA DEL MÓDULO NUTRICIÓN
// ============================================================
// Mismo trato que gym: el módulo es dueño de sus claves y de su semilla.
// Claves nuevas con el prefijo histórico `appgym:` por consistencia
// (renombrarlo huerfanaría el historial real de entrenamiento).
//
// Un día de nutrición sigue la convención de core/lib/dia.js: cada ítem
// marcable es { done, registradoEn }.

import { leer, escribir } from '../../../core/lib/storage.js'
import { PLAN_INICIAL, claveDiaDeFecha, litrosObjetivo } from '../data/plan.js'

export const ML_POR_VASO = 250

// --- PLAN (editable, la semilla es solo el arranque) ---
export function getPlan() {
  return leer('plan', PLAN_INICIAL)
}
export function savePlan(plan) {
  escribir('plan', plan)
}
export function resetPlan() {
  escribir('plan', PLAN_INICIAL)
  return PLAN_INICIAL
}

// ¿La semilla avanzó respecto de lo guardado? Se usa para ofrecer restaurar
// sin pisar nada por sorpresa.
export function planDesactualizado() {
  const guardado = leer('plan', null)
  return !!guardado && (guardado.version || 0) < PLAN_INICIAL.version
}

// --- REGISTRO DIARIO ---
// { '2026-07-15': { comidas: {...}, suplementos: {...}, agua: {...} } }
function getDias() {
  return leer('nutricion', {})
}
function saveDias(dias) {
  escribir('nutricion', dias)
}

export function diaVacio() {
  return { comidas: {}, suplementos: {}, agua: { ml: 0, registradoEn: null } }
}

export function getDiaNutricion(fecha) {
  const d = getDias()[fecha]
  if (!d) return diaVacio()
  // Lectura tolerante: un registro viejo puede no traer todas las secciones.
  return { ...diaVacio(), ...d, agua: { ...diaVacio().agua, ...(d.agua || {}) } }
}

export function saveDiaNutricion(fecha, registro) {
  const dias = getDias()
  dias[fecha] = registro
  saveDias(dias)
  return registro
}

// El objetivo de agua depende del tipo de día del PLAN GUARDADO (no de la
// semilla), porque ella puede haber cambiado qué días entrena.
export function litrosObjetivoDe(fecha) {
  const plan = getPlan()
  const dia = plan.dias[claveDiaDeFecha(fecha)]
  return dia?.tipo === 'gym' ? plan.agua.gym : plan.agua.normal
}

// --- Resumen para la tarjeta del módulo en HOY ---
export function resumenHoy(fecha) {
  const plan = getPlan()
  const dia = plan.dias[claveDiaDeFecha(fecha)]
  const registro = getDiaNutricion(fecha)
  const total = dia?.comidas.length || 0
  const hecho = dia ? dia.comidas.filter((c) => registro.comidas[c.id]?.done).length : 0
  const litros = (registro.agua.ml / 1000).toFixed(2).replace(/\.?0+$/, '')
  return {
    hecho,
    total,
    detalle: `${hecho}/${total} comidas · ${litros}L de ${litrosObjetivoDe(fecha)}L`
  }
}

// ============================================================
//  CONTRATO DE MÓDULO  (lo consume core/lib/modulos.js)
// ============================================================
export const moduloNutricion = {
  id: 'nutricion',
  nombre: 'Nutrición',

  exportar: () => ({
    plan: getPlan(),
    dias: getDias()
  }),

  importar: (porcion) => {
    if (!porcion) return
    if (porcion.plan) escribir('plan', porcion.plan)
    if (porcion.dias) escribir('nutricion', porcion.dias)
  },

  diaSlice: (fecha) => {
    const d = getDias()[fecha]
    return d || null
  },

  fechasConRegistro: () => Object.keys(getDias()),

  // Una línea para el Historial. Sin registro guardado devuelve null: abrir un
  // día no lo convierte en historia.
  resumenDia: (fecha) => {
    if (!getDias()[fecha]) return null
    const r = getDiaNutricion(fecha)
    const dia = getPlan().dias[claveDiaDeFecha(fecha)]
    const total = dia?.comidas.length || 0
    const hechas = dia ? dia.comidas.filter((c) => r.comidas[c.id]?.done).length : 0
    const litros = (r.agua.ml / 1000).toFixed(2).replace(/\.?0+$/, '')
    return { detalle: `${hechas}/${total} comidas · ${litros}L` }
  }

  // markdownSemana se engancha en modules/registro.js (ver gym/lib/storage.js).
}

// Re-export por comodidad de las pantallas.
export { claveDiaDeFecha, litrosObjetivo }
