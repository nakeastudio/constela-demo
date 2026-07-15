// ============================================================
//  PERFIL — datos de la persona, transversales a los módulos
// ============================================================
// Vive en core y NO en un módulo porque lo cruzan todos: gym necesita el peso,
// nutrición necesita peso y objetivos, skincare mañana necesitará lo suyo.
//
// Nada de esto se versiona: el perfil se carga desde la app y vive en
// almacenamiento. El archivo solo define la FORMA y un vacío neutro.

import { leer, escribir } from './storage.js'

export const PERFIL_VACIO = {
  nombre: '',
  edad: null,
  peso: null, // kg
  altura: null, // cm
  objetivo: ''
}

export function getPerfil() {
  return { ...PERFIL_VACIO, ...leer('perfil', {}) }
}

export function savePerfil(p) {
  escribir('perfil', { ...PERFIL_VACIO, ...p })
}

// ¿Hay algo cargado? Sirve para no mostrar cálculos derivados de la nada.
export function perfilCargado(p = getPerfil()) {
  return !!(p.peso || p.altura || p.edad || p.nombre)
}
