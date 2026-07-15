// ============================================================
//  REGISTRO DE MÓDULOS + BACKUP
// ============================================================
// Core no importa ningún módulo: son los módulos los que se registran acá
// (ver src/modules/registro.js). Así, sumar skincare más adelante no toca core.
//
// Contrato de un módulo:
//   id                  'gym' | 'nutricion' | …
//   exportar()          → su porción del backup
//   importar(porcion)   ← restaura esa porción
//   diaSlice(fecha)     → su registro de ese día, o null si no hay nada
//   fechasConRegistro() → fechas ISO en las que el módulo tiene algo guardado

import { getSettings, saveSettings } from './storage.js'

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
