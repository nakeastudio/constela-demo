// ============================================================
//  PERSISTENCIA GENÉRICA  (localStorage)
// ============================================================
// Core no conoce ningún módulo. Solo sabe leer/escribir claves con prefijo y
// guardar las preferencias de la app (tema). Cada módulo (gym, nutrición,
// skincare…) es dueño de sus propias claves y de su propia semilla.
//
// El prefijo `appgym:` es histórico y se mantiene a propósito: renombrarlo
// huerfanaría el historial real de entrenamiento. Las claves nuevas usan el
// mismo prefijo por consistencia.

export const PREFIJO = 'appgym:'

// Arma una clave namespaceada: clave('rutina') → 'appgym:rutina'
export function clave(nombre) {
  return `${PREFIJO}${nombre}`
}

export function leer(nombre, fallback) {
  try {
    const raw = localStorage.getItem(clave(nombre))
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function escribir(nombre, valor) {
  localStorage.setItem(clave(nombre), JSON.stringify(valor))
}

export function borrar(nombre) {
  localStorage.removeItem(clave(nombre))
}

// --- PREFERENCIAS DE LA APP (core: tema) ---
// Dark-first: el diseño se piensa en oscuro, así que ese es el default de una
// instalación nueva. Una preferencia ya guardada siempre gana.
export function getSettings() {
  return leer('settings', { dark: true })
}

export function saveSettings(s) {
  escribir('settings', s)
}
