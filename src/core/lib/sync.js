// ============================================================
//  SYNC — local primero, Supabase detrás
// ============================================================
// Reglas del diseño (no son negociables sin romper la sensación de la app):
//
//  1. LEER NUNCA ESPERA. localStorage es el camino de lectura y el de escritura
//     inmediata. Marcar una comida no puede esperar un round-trip: se sentiría
//     rota. Supabase se escribe DETRÁS, encolado.
//  2. LAST-WRITE-WINS con sesgo local. Una persona, un dispositivo por vez.
//     Sin CRDTs, sin vector clocks, sin UI de conflictos.
//  3. FALLAR ES NORMAL. Sin red, la app anda igual. El error se muestra como
//     estado, nunca como modal, nunca en rojo.
//
// ---- Cómo sabemos qué cambió ----
// Guardamos una FOTO de lo último que se subió bien. Si lo local difiere de la
// foto, está sucio y hay que subirlo. La foto hace de cola de pendientes: no
// necesita una lista aparte, y sobrevive al reload porque vive en localStorage.
//
// De ahí sale la regla de merge, que es la parte peligrosa:
//   · sucio  → gana lo LOCAL  (es lo que la persona acaba de hacer acá)
//   · limpio → gana lo REMOTO (nadie perdió nada: local ya estaba sincronizado)
// En el primer login de un dispositivo con datos, NADA tiene foto, así que todo
// está sucio y todo se sube. Ese es justo el caso que no puede perder nada.

import { supabase, hayBackend } from './supabase.js'
import { leer, escribir, clave, prefijoDe, observarEscrituras, setUsuarioActual } from './storage.js'

// --- Mapa de sincronización ---
// Lo llena la raíz de composición (modules/registro.js): core no sabe que
// existen `sessions` o `nutricion`, igual que no sabe qué módulos hay.
let mapa = { documentos: [], colecciones: {} }
export function registrarSync(m) {
  mapa = { documentos: m.documentos || [], colecciones: m.colecciones || {} }
}

// --- Estado observable (para el indicador de Ajustes) ---
// 'inactivo' | 'sincronizando' | 'ok' | 'error'
//
// `ultimoOk` NO es decorativo: es lo único que separa "nunca se sincronizó" de
// "se sincronizaba bien y ahora falla". Esa diferencia decide si la app puede
// decirle que sus datos están a salvo en la nube o solo en el teléfono, así que
// se PERSISTE por usuario. En memoria se perdía en cada recarga y la app habría
// dicho "nunca" de alguien que sincronizó ayer — la misma mentira al revés.
let estado = { fase: 'inactivo', detalle: '', ultimoOk: null }
const oyentes = new Set()
export function observarEstadoSync(fn) {
  oyentes.add(fn)
  fn(estado)
  return () => oyentes.delete(fn)
}
function setEstado(parcial) {
  estado = { ...estado, ...parcial }
  oyentes.forEach((f) => f(estado))
}
export function estadoSync() {
  return estado
}

let uid = null
let temporizador = null

// --- Foto de lo último subido ---
const FOTO = '_sync_foto'
const fotos = () => leer(FOTO, {})
const guardarFotos = (f) => localStorage.setItem(clave(FOTO), JSON.stringify(f))

// --- Última sincronización con éxito (por usuario, persistida) ---
const ULTIMO_OK = '_sync_ultimo_ok'
const leerUltimoOk = () => leer(ULTIMO_OK, null)
function marcarOk() {
  const cuando = new Date().toISOString()
  localStorage.setItem(clave(ULTIMO_OK), JSON.stringify(cuando))
  return cuando
}

// --- Encolado ---
// Solo marca y agenda. Nadie espera red acá.
function encolar(nombre) {
  if (!uid || !hayBackend) return
  if (nombre === FOTO || nombre === ULTIMO_OK) return // la contabilidad interna no se sincroniza
  const esSync = mapa.documentos.includes(nombre) || !!mapa.colecciones[nombre]
  if (!esSync) return
  clearTimeout(temporizador)
  // Coalescer: marcar cinco comidas seguidas hace UN empuje, no cinco.
  temporizador = setTimeout(() => { empujar() }, 800)
}

// ============================================================
//  EMPUJE
// ============================================================
export async function empujar() {
  if (!uid || !hayBackend) return
  setEstado({ fase: 'sincronizando', detalle: '' })
  const f = fotos()
  try {
    // --- documentos: la clave entera es un valor JSON ---
    for (const nombre of mapa.documentos) {
      const valor = leer(nombre, undefined)
      if (valor === undefined) continue
      const serial = JSON.stringify(valor)
      if (f[`doc:${nombre}`] === serial) continue // limpio
      const { error } = await supabase
        .from('documentos')
        .upsert({ user_id: uid, clave: nombre, valor, actualizado_en: new Date().toISOString() }, { onConflict: 'user_id,clave' })
      if (error) throw error
      f[`doc:${nombre}`] = serial
    }

    // --- colecciones: cada fila es una fila de su tabla ---
    for (const [nombre, col] of Object.entries(mapa.colecciones)) {
      const valor = leer(nombre, undefined)
      if (valor === undefined) continue
      const items = col.desarmar(valor)
      const vistos = new Set()

      for (const item of items) {
        vistos.add(String(item.id))
        const serial = JSON.stringify(item.datos)
        const k = `col:${nombre}/${item.id}`
        if (f[k] === serial) continue // esta fila no cambió
        const { error } = await supabase
          .from(col.tabla)
          .upsert({ ...col.fila(item, uid), actualizado_en: new Date().toISOString() }, { onConflict: col.conflicto })
        if (error) throw error
        f[k] = serial
      }

      // Borrado: estaba en la foto y ya no está local → borrarlo allá también.
      for (const k of Object.keys(f)) {
        if (!k.startsWith(`col:${nombre}/`)) continue
        const id = k.slice(`col:${nombre}/`.length)
        if (vistos.has(id)) continue
        const { error } = await supabase.from(col.tabla).delete().match(col.filtroId(id, uid))
        if (error) throw error
        delete f[k]
      }
    }

    guardarFotos(f)
    setEstado({ fase: 'ok', detalle: '', ultimoOk: marcarOk() })
  } catch (e) {
    // Guardamos lo que SÍ se subió: reintentar no repite trabajo hecho.
    guardarFotos(f)
    // Sin red esto es lo normal, no una falla de la app. `ultimoOk` NO se toca:
    // que esto falle no borra el hecho de que alguna vez funcionó.
    setEstado({ fase: 'error', detalle: mensajeDeError(e) })
  }
}

// El texto que ve la persona nunca es el error del proveedor: "JWT cryptographic
// operation failed" no le dice nada y encima está en inglés. El detalle crudo va
// a la consola, para quien pueda hacer algo con él.
function mensajeDeError(e) {
  if (e) console.warn('[sync]', e)
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'Sin conexión'
  return 'No se pudo sincronizar'
}

// ============================================================
//  HIDRATACIÓN
// ============================================================
// Trae lo remoto y lo escribe local, SIN pisar lo que está sucio.
export async function hidratar() {
  if (!uid || !hayBackend) return
  setEstado({ fase: 'sincronizando', detalle: '' })
  const f = fotos()
  try {
    // --- documentos ---
    const { data: docs, error: eDocs } = await supabase
      .from('documentos')
      .select('clave, valor')
      .eq('user_id', uid)
    if (eDocs) throw eDocs

    for (const row of docs || []) {
      if (!mapa.documentos.includes(row.clave)) continue
      const local = leer(row.clave, undefined)
      const serial = local === undefined ? undefined : JSON.stringify(local)
      const sucio = serial !== undefined && f[`doc:${row.clave}`] !== serial
      if (sucio) continue // lo local es más nuevo: lo empuja el flush
      escribirSinEncolar(row.clave, row.valor)
      f[`doc:${row.clave}`] = JSON.stringify(row.valor)
    }

    // --- colecciones: unión. Nunca se borra local por no venir de allá. ---
    for (const [nombre, col] of Object.entries(mapa.colecciones)) {
      const { data: filas, error } = await supabase.from(col.tabla).select('*').eq('user_id', uid)
      if (error) throw error

      const local = leer(nombre, undefined)
      const items = new Map()
      if (local !== undefined) for (const it of col.desarmar(local)) items.set(String(it.id), it)

      for (const r of filas || []) {
        const remoto = col.desdeFila(r)
        const id = String(remoto.id)
        const actual = items.get(id)
        if (actual) {
          const serial = JSON.stringify(actual.datos)
          const sucio = f[`col:${nombre}/${id}`] !== serial
          if (sucio) continue // lo local gana; el flush lo sube
        }
        items.set(id, remoto)
        f[`col:${nombre}/${id}`] = JSON.stringify(remoto.datos)
      }

      escribirSinEncolar(nombre, col.armar([...items.values()]))
    }

    guardarFotos(f)
    setEstado({ fase: 'ok', detalle: '', ultimoOk: marcarOk() })
    // Lo que quedó sucio (o nunca se subió) sale ahora. Este es el camino del
    // PRIMER LOGIN con datos locales: nada tiene foto ⇒ todo está sucio ⇒ sube.
    await empujar()
  } catch (e) {
    guardarFotos(f)
    setEstado({ fase: 'error', detalle: mensajeDeError(e) })
  }
}

// Escribe local sin re-encolar: viene de allá, no hay nada que devolver.
function escribirSinEncolar(nombre, valor) {
  localStorage.setItem(clave(nombre), JSON.stringify(valor))
}

// ============================================================
//  RECLAMO DEL LEGADO  (el momento más peligroso del proyecto)
// ============================================================
// Antes del login las claves eran `appgym:rutina`. Ahí está el historial real de
// entrenamiento que la persona ya tiene. Al entrar por primera vez hay que
// pasarlo a `appgym:u:<uid>:rutina` sin perder nada.
//
// Se reclama UNA sola vez y SOLO el primer usuario. Si no, entra B más tarde,
// encuentra el legado de A y se lo queda: la misma fuga de datos de salud por
// otra puerta.
//
// COPIA, no mueve: las claves viejas quedan como red de seguridad. Son inertes
// —nadie las lee con sesión abierta— y borrarlas no daría nada a cambio.
const MARCA_LEGADO = `${prefijoDe(null)}_legado_reclamado_por`

export function legadoReclamadoPor() {
  return localStorage.getItem(MARCA_LEGADO)
}

export function reclamarLegado(uidNuevo, claves) {
  const yaFue = legadoReclamadoPor()
  if (yaFue) return { reclamado: false, motivo: yaFue === uidNuevo ? 'ya-reclamado-por-esta-persona' : 'de-otra-persona' }

  const origen = prefijoDe(null)
  const destino = prefijoDe(uidNuevo)
  const movidas = []
  for (const nombre of claves) {
    const raw = localStorage.getItem(`${origen}${nombre}`)
    if (raw === null) continue
    // Si el usuario ya tiene algo propio en esa clave, no lo pisamos.
    if (localStorage.getItem(`${destino}${nombre}`) !== null) continue
    localStorage.setItem(`${destino}${nombre}`, raw)
    movidas.push(nombre)
  }
  localStorage.setItem(MARCA_LEGADO, uidNuevo)
  return { reclamado: true, movidas }
}

// ============================================================
//  CICLO DE VIDA
// ============================================================
// Claves que viajan. `activeSession` NO: es el borrador del entrenamiento en
// curso, vive en el dispositivo donde se está entrenando.
export function clavesSincronizables() {
  return [...mapa.documentos, ...Object.keys(mapa.colecciones)]
}

export function iniciarSync(uidNuevo) {
  uid = uidNuevo
  setUsuarioActual(uidNuevo)
  observarEscrituras(encolar)
  // El uid ya está fijado, así que esto lee la marca DE ESTA persona: alguien
  // que entra por primera vez en un navegador ajeno no hereda el "ya sincronizó"
  // de la anterior.
  setEstado({
    fase: uidNuevo && hayBackend ? 'sincronizando' : 'inactivo',
    detalle: '',
    ultimoOk: uidNuevo ? leerUltimoOk() : null
  })
}

// Salir NO borra nada local: las claves del usuario quedan intactas bajo su
// namespace y vuelven tal cual en el próximo login.
export function detenerSync() {
  clearTimeout(temporizador)
  uid = null
  setUsuarioActual(null)
  setEstado({ fase: 'inactivo', detalle: '', ultimoOk: null })
}
