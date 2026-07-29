// ============================================================
//  NOTIFICACIONES NATIVAS  (solo dentro del APK de Capacitor)
// ============================================================
// El caso que una PWA no puede cubrir: avisar cuando termina un cronómetro con
// la app cerrada o en segundo plano. Dentro del APK, se PROGRAMA una notificación
// local para el instante de fin; el sistema operativo la dispara aunque la app
// esté suspendida o muerta. En el navegador, todo esto es no-op: ahí el aviso lo
// dan el beep + wake lock de useRestTimer, que es lo único que el navegador
// permite.
//
// Un solo código, dos comportamientos según dónde corra: esa es la razón de
// Capacitor sobre una reescritura. La detección es en runtime, no en build.

import { Capacitor } from '@capacitor/core'

// Import perezoso del plugin: en el navegador el paquete existe pero el plugin
// nativo no, así que solo se toca cuando de verdad estamos en nativo.
let plugin = null
async function local() {
  if (plugin) return plugin
  const mod = await import('@capacitor/local-notifications')
  plugin = mod.LocalNotifications
  return plugin
}

export function esNativo() {
  return Capacitor.isNativePlatform()
}

// Id fijo por cada tipo de cronómetro: programar uno nuevo reemplaza al anterior,
// así nunca se apilan avisos viejos. Dos ids porque descanso y espera de skincare
// pueden convivir (aunque en la práctica rara vez a la vez).
const IDS = { descanso: 4001, espera: 4002 }

// Pide permiso una vez (Android 13+ lo exige). Silencioso si ya está concedido
// o si no estamos en nativo.
export async function pedirPermisoNotificaciones() {
  if (!esNativo()) return false
  try {
    const LN = await local()
    const { display } = await LN.checkPermissions()
    if (display === 'granted') return true
    const req = await LN.requestPermissions()
    return req.display === 'granted'
  } catch {
    return false
  }
}

// Programa (o reprograma) la notificación de fin de un cronómetro.
//   tipo: 'descanso' | 'espera'
//   segundos: cuánto falta para que termine
//   titulo / cuerpo: texto del aviso
// En el navegador no hace nada: devuelve sin tocar el plugin.
export async function programarFinCronometro(tipo, segundos, titulo, cuerpo) {
  if (!esNativo() || !(segundos > 0)) return
  try {
    const LN = await local()
    const id = IDS[tipo] ?? 4009
    // Cancela cualquier aviso previo de este tipo antes de reprogramar (p. ej.
    // al sumar +15s o reiniciar): si no, quedaría el viejo colgado.
    await LN.cancel({ notifications: [{ id }] })
    await LN.schedule({
      notifications: [
        {
          id,
          title: titulo,
          body: cuerpo,
          // Momento absoluto de fin: el SO lo dispara aunque la app esté cerrada.
          schedule: { at: new Date(Date.now() + segundos * 1000), allowWhileIdle: true },
          smallIcon: 'ic_stat_constela'
        }
      ]
    })
  } catch {
    // Sin permiso o error del plugin: el cronómetro sigue igual, solo sin aviso
    // nativo. El beep en primer plano no depende de esto.
  }
}

// Cancela el aviso programado de un tipo. Se llama al pausar, saltar, detener o
// cuando el fin ocurre con la app en primer plano (ahí ya sonó el beep, la
// notificación sería redundante).
export async function cancelarFinCronometro(tipo) {
  if (!esNativo()) return
  try {
    const LN = await local()
    const id = IDS[tipo] ?? 4009
    await LN.cancel({ notifications: [{ id }] })
  } catch {
    /* no-op */
  }
}
