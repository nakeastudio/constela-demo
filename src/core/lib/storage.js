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

// ============================================================
//  A QUIÉN PERTENECEN ESTAS CLAVES
// ============================================================
// Con dos personas y UN solo navegador, `appgym:sessions` a secas es una fuga:
// si A entra, sincroniza, sale (salir NO borra nada), y después entra B, B lee
// las mismas claves y ve el historial de salud de A.
//
// Por eso las claves se namespacean por usuario: `appgym:u:<uid>:sessions`.
// La alternativa —borrar lo local al cambiar de usuario— destruiría lo que A
// todavía no subió, y enfrentaría "no borrar al salir" con "no filtrar".
// Namespacear da las dos cosas: no se borra nada nunca, solo se mueve el puntero.
//
// `usuarioActual` se fija ANTES del primer render (ver AuthGate en App.jsx):
// las lecturas son síncronas a propósito y no pueden esperar a la sesión.
let usuarioActual = null

export function setUsuarioActual(uid) {
  usuarioActual = uid || null
}

export function getUsuarioActual() {
  return usuarioActual
}

// Prefijo de un usuario concreto (lo usa la reclamación del legado).
export function prefijoDe(uid) {
  return uid ? `${PREFIJO}u:${uid}:` : PREFIJO
}

// clave('rutina') → 'appgym:u:<uid>:rutina'  (o 'appgym:rutina' sin sesión)
export function clave(nombre) {
  return `${prefijoDe(usuarioActual)}${nombre}`
}

// Se avisa a la capa de sync qué clave cambió. Es un callback y no un import
// para que storage.js siga sin saber que Supabase existe.
let alEscribir = null
export function observarEscrituras(fn) {
  alEscribir = fn
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
  // Local primero: lo de arriba ya pasó. Esto solo encola; nadie espera red.
  if (alEscribir) alEscribir(nombre, valor)
}

export function borrar(nombre) {
  localStorage.removeItem(clave(nombre))
  if (alEscribir) alEscribir(nombre, null)
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
