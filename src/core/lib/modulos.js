// ============================================================
//  REGISTRO DE MÓDULOS + BACKUP
// ============================================================
// Core no importa ningún módulo: son los módulos los que se registran acá
// (ver src/modules/registro.js). Así, sumar skincare más adelante no toca core.
//
// Contrato de un módulo:
//   id                  'gym' | 'nutricion' | …
//   nombre              cómo se llama para la persona ('Entrenamiento')
//   exportar()          → su porción del backup
//   importar(porcion)   ← restaura esa porción
//   diaSlice(fecha)     → su registro de ese día, o null si no hay nada
//   fechasConRegistro() → fechas ISO en las que el módulo tiene algo guardado
//   resumenDia(fecha)   → { detalle } legible para Historial, o null si no hay
//                         nada ese día. Core no sabe leer la porción de nadie:
//                         cada módulo la resume en una línea.
//   markdownSemana(iso) → (opcional) su sección del reporte para IA

import { getSettings, saveSettings } from './storage.js'
import { getPerfil, perfilCargado } from './perfil.js'
import { fmtLargo, rangoSemana } from './dates.js'

const registrados = []

export function registrarModulo(modulo) {
  if (registrados.some((m) => m.id === modulo.id)) return
  registrados.push(modulo)
}

export function modulos() {
  return registrados
}

export function modulo(id) {
  return registrados.find((m) => m.id === id) || null
}

// ============================================================
//  MÓDULOS PRENDIDOS / APAGADOS  (preferencia de la persona)
// ============================================================
// Apagar un módulo lo ESCONDE: no borra nada. Sus datos siguen en sus propias
// claves, intactos, y vuelven tal cual al prenderlo. Por eso nada de esto toca
// `exportar`/`importar`: el backup se lleva todo, esté prendido o no.
//
// Se guarda la lista de APAGADOS y no la de prendidos a propósito: así un módulo
// que se registre mañana (skincare) aparece prendido solo, sin migrar las
// preferencias ya guardadas ni tener que nombrarlo acá.
//
// Vive en settings (no en una constante del repo) porque es POR PERSONA: cuando
// haya dos usuarias, cada una apaga lo suyo.
export function modulosApagados() {
  const off = getSettings().modulosOff
  return Array.isArray(off) ? off : []
}

export function moduloActivo(id) {
  return !modulosApagados().includes(id)
}

export function setModuloActivo(id, activo) {
  const off = new Set(modulosApagados())
  if (activo) off.delete(id)
  else off.add(id)
  saveSettings({ ...getSettings(), modulosOff: [...off] })
}

// Lo que la UI debe mostrar. Lo que se GUARDA sale de `registrados`, no de acá.
export function modulosActivos() {
  return registrados.filter((m) => moduloActivo(m.id))
}

// --- BACKUP (export / import JSON) ---
// v2: cada módulo aporta su porción bajo `modulos`. v1 (formato viejo) tenía
// rutina/sessions/prs planos en la raíz: se sigue importando (ver abajo).
export const VERSION_BACKUP = 2

export function exportarTodo() {
  const porciones = {}
  registrados.forEach((m) => {
    porciones[m.id] = m.exportar()
  })
  return {
    _app: 'appgym',
    _version: VERSION_BACKUP,
    exportadoEn: new Date().toISOString(),
    settings: getSettings(),
    modulos: porciones
  }
}

// ============================================================
//  REPORTE PARA IA  (markdown, al portapapeles)
// ============================================================
// Cada módulo aporta su sección; core solo pone el encabezado y las une.
// Sumar skincare = implementar markdownSemana en su contrato, sin tocar esto.
//
// Autocontenido a propósito: una IA sin ningún contexto previo tiene que poder
// aconsejar con SOLO este texto. Por eso van el perfil y el plan/rutina
// vigentes, no únicamente los deltas de la semana.
//
// Todo sale de lo guardado en el dispositivo. Ninguna constante del repo entra
// acá, y el texto no sale del dispositivo salvo que ella lo pegue en algún lado.
export function reporteMarkdown(isoRef) {
  const { inicio, fin } = rangoSemana(isoRef)
  const p = getPerfil()
  const L = []

  L.push(`# Reporte semanal · ${fmtLargo(inicio)} — ${fmtLargo(fin)}`)
  L.push('')

  // Perfil: la línea base contra la que comparar.
  if (perfilCargado(p)) {
    L.push('## Perfil')
    L.push('')
    if (p.nombre) L.push(`- Nombre: ${p.nombre}`)
    if (p.edad) L.push(`- Edad: ${p.edad} años`)
    if (p.peso) L.push(`- Peso: ${p.peso} kg`)
    if (p.altura) L.push(`- Altura: ${p.altura} cm`)
    if (p.objetivo) L.push(`- Objetivo: ${p.objetivo}`)
    L.push('')
  } else {
    L.push('## Perfil')
    L.push('')
    L.push('_Sin datos de perfil cargados._')
    L.push('')
  }

  // Solo los módulos prendidos: si ella apagó nutrición, el reporte que le pega
  // a una IA no puede seguir opinando sobre nutrición.
  modulosActivos().forEach((m) => {
    if (!m.markdownSemana) return
    L.push(m.markdownSemana(isoRef))
  })

  // El marco: el promedio manda, un día no es un veredicto.
  L.push('---')
  L.push('')
  L.push(
    'Nota de lectura: lo que importa es el promedio de la semana, no un día suelto. ' +
      'Un día flojo es contexto, no un fracaso. Al sugerir cambios, priorizá la constancia ' +
      'sostenible por encima de la perfección.'
  )
  L.push('')
  return L.join('\n')
}

export function importarTodo(data) {
  if (!data || data._app !== 'appgym') throw new Error('Archivo no válido')

  if (data.settings) saveSettings(data.settings)

  // --- v1: rutina / sessions / prs sueltos en la raíz, todo era del gym ---
  // Ella tiene backups viejos con datos reales: un archivo que ya no restaura
  // es pérdida de datos. Se traduce a la porción del módulo gym.
  const version = Number(data._version) || 1
  if (version < 2) {
    const gym = modulo('gym')
    if (gym) {
      gym.importar({
        rutina: data.rutina,
        sessions: data.sessions,
        prs: data.prs
      })
    }
    return
  }

  // --- v2 en adelante ---
  const porciones = data.modulos || {}
  registrados.forEach((m) => {
    if (porciones[m.id]) m.importar(porciones[m.id])
  })
}
