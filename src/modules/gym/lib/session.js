// ============================================================
//  HELPERS DE SESIÓN
// ============================================================
// Construye la estructura de una sesión a partir de un día de la rutina,
// auto-rellenando peso/reps de la última vez que se hizo cada ejercicio.

import { getSessions, getRutina, getActiveSessions } from './storage.js'
import { rangoSemana, enRango, hoyISO } from '../../../core/lib/dates.js'
import { ahoraISO } from '../../../core/lib/dia.js'

// Id opaco y estable. NO se deriva de la fecha: la fecha es editable (se puede
// mover una sesión de día) y un id derivado dejaría huérfana la fila vieja en
// el upsert de saveSession, duplicando el historial. Los ids viejos con forma
// `2026-07-15_dia1` siguen siendo válidos: nadie los interpreta.
function nuevoId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// Aplana fuerza + core en una sola lista de ejercicios "registrables"
export function ejerciciosDelDia(dia) {
  const fuerza = (dia.ejercicios || []).map((e) => ({ ...e, seccion: 'fuerza' }))
  const core = (dia.core || []).map((e) => ({ ...e, seccion: 'core' }))
  return [...fuerza, ...core]
}

// Busca los últimos valores registrados de un ejercicio (sesión más reciente)
export function ultimosValores(nombreEjercicio) {
  const sessions = getSessions()
  for (let i = sessions.length - 1; i >= 0; i--) {
    const ej = sessions[i].ejercicios.find((e) => e.nombre === nombreEjercicio)
    if (ej && ej.sets.some((s) => s.done)) {
      // último set hecho con datos
      const done = ej.sets.filter((s) => s.done)
      const ref = done[done.length - 1]
      return { peso: ref.peso ?? '', reps: ref.reps ?? '', segundos: ref.segundos ?? '' }
    }
  }
  return null
}

// Devuelve los sets COMPLETADOS de la última sesión donde se hizo este ejercicio.
// Sirve para la columna "Anterior" estilo Hevy (referencia por serie).
export function ultimaSesionSets(nombreEjercicio) {
  const sessions = getSessions()
  for (let i = sessions.length - 1; i >= 0; i--) {
    const ej = sessions[i].ejercicios.find((e) => e.nombre === nombreEjercicio)
    if (ej && ej.sets.some((s) => s.done)) {
      return ej.sets.filter((s) => s.done)
    }
  }
  return []
}

// Arma el registro de UN ejercicio a partir de su definición en el plan
// (ya aplanada por ejerciciosDelDia, con `seccion`). Auto-rellena peso/reps de
// la última vez. Lo usan por igual crearSesion (sesión nueva) y reconciliar
// (ejercicio agregado al plan a mitad de sesión), así que la forma de un
// registro es UNA sola y no se puede desincronizar entre ambos caminos.
function nuevoEjercicioSesion(ej) {
  const tipoReg = ej.tipoReg || 'peso'
  const last = ultimosValores(ej.nombre)
  // `registradoEn` sigue la convención de core/lib/dia.js: cuándo pasó la
  // serie. Null mientras no esté marcada.
  const sets = Array.from({ length: ej.series }, () => ({
    peso: last?.peso ?? '',
    reps: tipoReg === 'tiempo' ? '' : (last?.reps ?? ''),
    segundos: tipoReg === 'tiempo' ? (last?.segundos ?? '') : '',
    done: false,
    registradoEn: null
  }))
  return {
    nombre: ej.nombre,
    grupo: ej.grupo,
    seccion: ej.seccion,
    tipoReg,
    descanso: ej.descanso,
    repsObjetivo: ej.reps,
    seriesObjetivo: ej.series,
    sets,
    done: false
  }
}

// Crea una sesión nueva (o draft) lista para registrar
export function crearSesion(diaKey, dia, fecha) {
  const ejercicios = ejerciciosDelDia(dia).map(nuevoEjercicioSesion)

  return {
    id: nuevoId(),
    fecha,
    diaKey,
    diaNombre: dia.nombre,
    ejercicios,
    cardio: dia.cardio ? { nombre: dia.cardio.nombre, done: false } : null,
    notas: '',
    finalizada: false,
    completadaEn: null,
    // Momento en que arrancó el entrenamiento. Es un TIMESTAMP guardado, no un
    // contador en memoria: el tiempo transcurrido se DERIVA de `ahora - inicioEn`,
    // así sobrevive a navegar, recargar y al segundo plano —vuelve con el valor
    // real, no congelado donde se detuvo el JS— (misma lección que el descanso).
    inicioEn: ahoraISO()
  }
}

// ¿Estos dos ejercicios de sesión son equivalentes para autoguardar?
// Compara los campos del PLAN (objetivos, descanso, orden) y los sets POR
// REFERENCIA: reconciliarSesion reusa `prev.sets` tal cual, así que la igualdad
// de referencia distingue "solo refresqué la etiqueta del plan" de "toqué lo
// registrado". Sirve para devolver el mismo borrador cuando nada cambió y no
// disparar una escritura (ni un re-render) en vano.
function ejerciciosIguales(a, b) {
  if (a.length !== b.length) return false
  return a.every((x, i) => {
    const y = b[i]
    return (
      x.nombre === y.nombre &&
      x.seccion === y.seccion &&
      x.tipoReg === y.tipoReg &&
      x.descanso === y.descanso &&
      x.repsObjetivo === y.repsObjetivo &&
      x.seriesObjetivo === y.seriesObjetivo &&
      x.grupo === y.grupo &&
      x.sets === y.sets
    )
  })
}

// Reconcilia un borrador contra el PLAN vigente, por IDENTIDAD (el nombre del
// ejercicio), nunca por índice. Editar el plan a mitad de entrenamiento —
// cambiar reps/series/descanso, agregar, quitar o reordenar ejercicios— tiene
// que reflejarse en la sesión en curso SIN perder las series ya registradas.
//
//   - Ejercicio que sigue en el plan → conserva sus `sets` (lo que ella
//     anotó) y solo se le refrescan los campos del plan (repsObjetivo,
//     seriesObjetivo, descanso, grupo, seccion, tipoReg). El número de series
//     registrables NO se fuerza al del plan: los sets son SU dato desde que
//     agregó o quitó alguno; el objetivo cambia, las filas se respetan.
//   - Ejercicio nuevo en el plan → se arma como en una sesión nueva.
//   - Ejercicio borrado del plan → si tiene series marcadas, NO se tira: se
//     conserva al final como historial huérfano (perder lo registrado sería el
//     peor resultado). Si no tiene ninguna marcada, se descarta y la sesión
//     sigue al plan.
//
// El orden del plan manda: los ejercicios reconciliados van en el orden vigente
// y los huérfanos con datos quedan al final.
//
// Nota sobre RENOMBRAR: no hay id estable de ejercicio (la identidad ES el
// nombre), así que renombrar a mitad de sesión se ve como quitar+agregar: las
// series ya anotadas quedan atadas al nombre viejo (huérfano con datos, se
// conserva) y el nombre nuevo arranca vacío. Es raro y no pierde nada.
export function reconciliarSesion(draft, dia) {
  const plan = ejerciciosDelDia(dia)
  const porNombre = new Map(draft.ejercicios.map((e) => [e.nombre, e]))
  const usados = new Set()

  const reconciliados = plan.map((p) => {
    const prev = porNombre.get(p.nombre)
    if (!prev) return nuevoEjercicioSesion(p)
    usados.add(p.nombre)
    return {
      ...prev,
      grupo: p.grupo,
      seccion: p.seccion,
      tipoReg: p.tipoReg || 'peso',
      descanso: p.descanso,
      repsObjetivo: p.reps,
      seriesObjetivo: p.series
    }
  })

  const huerfanos = draft.ejercicios.filter(
    (e) => !usados.has(e.nombre) && e.sets.some((s) => s.done)
  )

  const ejercicios = [...reconciliados, ...huerfanos]
  // Nada cambió → devolver el MISMO borrador: sin escritura, sin re-render.
  if (ejerciciosIguales(draft.ejercicios, ejercicios)) return draft
  return { ...draft, ejercicios }
}

// ¿Todas las series de un ejercicio están completas?
export function ejercicioCompleto(ej) {
  return ej.sets.length > 0 && ej.sets.every((s) => s.done)
}

// ¿La sesión se cerró? Un día cuenta como entrenado porque existe una sesión
// FINALIZADA, no porque un timestamp sea truthy. `finalizada` guarda la
// intención; `completadaEn` guarda solo el cuándo, y por eso puede editarse
// sin que el calendario se apague.
//
// Lectura tolerante: las sesiones guardadas antes de `finalizada` no lo traen,
// así que se cae a la presencia de `completadaEn`, que era el criterio viejo.
export function sesionFinalizada(s) {
  if (!s) return false
  return s.finalizada ?? s.completadaEn != null
}

// --- Resumen para la tarjeta del módulo en HOY ---
// Lo arma el módulo: core no sabe qué es un entrenamiento.
export function resumenHoy() {
  const { inicio, fin } = rangoSemana(hoyISO())
  const dias = new Set()
  getSessions().forEach((s) => {
    if (enRango(s.fecha, inicio, fin) && sesionFinalizada(s)) dias.add(s.diaKey)
  })
  const total = Object.keys(getRutina()).length
  return { hecho: dias.size, total, detalle: `${dias.size}/${total} días esta semana` }
}

// --- Duración de la sesión (reloj de pared, de arranque a cierre) ---
// Momento de arranque en ms. La fuente de verdad es el timestamp `inicioEn` del
// borrador. Un borrador viejo —de antes de que existiera este campo— no lo trae:
// se estima con la primera serie marcada (`registradoEn`), y si no hay ninguna,
// con "ahora". Es aproximado SOLO para ese borrador heredado, nunca un número
// disparatado ni negativo.
export function inicioSesionMs(sesion) {
  if (!sesion) return null
  if (sesion.inicioEn) {
    const t = Date.parse(sesion.inicioEn)
    if (!Number.isNaN(t)) return t
  }
  let min = Infinity
  for (const ej of sesion.ejercicios || []) {
    for (const s of ej.sets || []) {
      if (!s.registradoEn) continue
      const t = Date.parse(s.registradoEn)
      if (!Number.isNaN(t) && t < min) min = t
    }
  }
  return min === Infinity ? Date.now() : min
}

// Segundos transcurridos desde el arranque hasta `hasta` (ms). Nunca negativo:
// el reloj de pared solo avanza. No hay pausa —una sesión corre de principio a
// fin, se la mire o no; una pausa invita al "me olvidé de reanudar y el tiempo
// quedó mal"—. Si algún día hace falta, es otro campo, no un rediseño.
export function duracionSesionSeg(sesion, hasta = Date.now()) {
  const ini = inicioSesionMs(sesion)
  if (ini == null) return 0
  return Math.max(0, Math.round((hasta - ini) / 1000))
}

// Formatea segundos como reloj legible: `m:ss` hasta la hora, `h:mm:ss` a partir
// de una hora. Nunca "92:00" ni "5472 seg".
export function fmtDuracion(seg) {
  const s = Math.max(0, Math.floor(seg))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${m}:${pad(ss)}`
}

// --- Sesión EN CURSO (para la barra persistente de App) ---
// Un borrador de HOY es un entrenamiento abierto: se crea al montar Session y
// solo se limpia al finalizar. Devuelve con qué día retomarlo, el avance GENERAL
// —series hechas sobre totales, el MISMO número que Session muestra en su
// encabezado (hechos/totalSets), sin métrica nueva— y el arranque en ms para el
// reloj.
//
// Lee el borrador CRUDO, sin reconciliar contra el plan (eso lo hace Session al
// abrir). En el caso normal —no editar la rutina con la barra a la vista— los
// números coinciden; si editó el plan justo entonces, se alinean al retomar. Es
// un desfase efímero, no un dato falso.
//
// Solo cuenta un borrador cuyo día SIGUE en la rutina: si el día se borró del
// plan, retomarlo rompería Session (no existe `rutina[diaKey]`), así que no se
// ofrece.
export function sesionEnCurso() {
  const rutina = getRutina()
  const borradores = getActiveSessions()
  const hoy = hoyISO()
  const draft = Object.values(borradores).find(
    (s) => s && s.fecha === hoy && !s.finalizada && rutina[s.diaKey]
  )
  if (!draft) return null
  const total = draft.ejercicios.reduce((a, e) => a + e.sets.length, 0)
  const hecho = draft.ejercicios.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0)
  return { diaKey: draft.diaKey, diaNombre: draft.diaNombre, hecho, total, inicioMs: inicioSesionMs(draft) }
}
