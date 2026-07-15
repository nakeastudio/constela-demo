// ============================================================
//  HOOK DEL CRONÓMETRO DE DESCANSO
// ============================================================
// Cuenta hacia atrás. Permite pausar, saltar y sumar 15s.
// Al llegar a 0: vibra el celular y suena un beep.

import { useCallback, useEffect, useRef, useState } from 'react'

// Beep con Web Audio API (no requiere archivos de audio)
function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const tono = (freq, start, dur) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.001, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + dur)
    }
    // Triple beep ascendente
    tono(660, 0, 0.18)
    tono(880, 0.22, 0.18)
    tono(1046, 0.44, 0.3)
    setTimeout(() => ctx.close(), 1200)
  } catch {
    /* sin audio disponible */
  }
}

function vibrar() {
  // iOS no implementa la Vibration API: ahí esto no hace nada y el beep queda solo.
  if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 300])
}

// Mantiene la pantalla encendida mientras corre el descanso, para que el
// cronómetro siga en primer plano y el beep suene en el segundo exacto.
// El sistema libera el lock al ocultar la pestaña, por eso se vuelve a pedir
// al volver: sin eso funciona una sola vez.
function useWakeLock(activo) {
  const lockRef = useRef(null)

  useEffect(() => {
    if (!activo || !('wakeLock' in navigator)) return
    let cancelado = false

    const pedir = async () => {
      try {
        lockRef.current = await navigator.wakeLock.request('screen')
      } catch {
        // Sin permiso, batería baja o pestaña oculta: el cronómetro funciona igual,
        // solo que la pantalla puede apagarse.
      }
    }
    const alVolver = () => {
      if (!cancelado && document.visibilityState === 'visible') pedir()
    }

    pedir()
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      cancelado = true
      document.removeEventListener('visibilitychange', alVolver)
      lockRef.current?.release().catch(() => {})
      lockRef.current = null
    }
  }, [activo])
}

// El descanso es parte del ENTRENAMIENTO, no de una pantalla: por eso este hook
// vive en App y no en Session. Si vive en la pantalla, navegar la desmonta, el
// cleanup mata el intervalo y el descanso desaparece a mitad del entrenamiento.
// La pantalla ARRANCA el descanso; no lo CONTIENE.
export function useRestTimer() {
  const [activo, setActivo] = useState(false)
  const [pausado, setPausado] = useState(false)
  const [restante, setRestante] = useState(0)
  const [total, setTotal] = useState(0)
  // Qué ejercicio arrancó este descanso. Lo carga el cronómetro y no la pantalla:
  // el panel sigue visible desde Historial o Ajustes, donde no hay ningún
  // ejercicio "activo" del que leerlo.
  const [etiqueta, setEtiqueta] = useState('')
  const finRef = useRef(0) // timestamp de fin (ms)
  const intervalRef = useRef(null)

  // Solo mientras corre de verdad: en pausa no tiene sentido gastar batería.
  useWakeLock(activo && !pausado)

  const limpiar = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const detener = useCallback(() => {
    limpiar()
    setActivo(false)
    setPausado(false)
    setRestante(0)
  }, [limpiar])

  const dispararFin = useCallback(() => {
    limpiar()
    vibrar()
    beep()
    setRestante(0)
    setPausado(false)
    // Deja el panel visible un momento en 0; el componente lo cierra.
    setTimeout(() => setActivo(false), 2500)
  }, [limpiar])

  // Loop basado en timestamp (preciso aunque el navegador throttlee)
  const tick = useCallback(() => {
    const seg = Math.max(0, Math.round((finRef.current - Date.now()) / 1000))
    setRestante(seg)
    if (seg <= 0) dispararFin()
  }, [dispararFin])

  const iniciar = useCallback(
    (segundos, nombre = '') => {
      limpiar()
      const dur = Math.max(1, Math.round(segundos))
      finRef.current = Date.now() + dur * 1000
      setTotal(dur)
      setRestante(dur)
      setEtiqueta(nombre)
      setActivo(true)
      setPausado(false)
      intervalRef.current = setInterval(tick, 250)
    },
    [limpiar, tick]
  )

  const pausar = useCallback(() => {
    limpiar()
    setPausado(true)
  }, [limpiar])

  const reanudar = useCallback(() => {
    finRef.current = Date.now() + restante * 1000
    setPausado(false)
    intervalRef.current = setInterval(tick, 250)
  }, [restante, tick])

  const sumar = useCallback(
    (segundos) => {
      finRef.current += segundos * 1000
      setTotal((t) => t + segundos)
      setRestante((r) => r + segundos)
    },
    []
  )

  useEffect(() => () => limpiar(), [limpiar])

  return { activo, pausado, restante, total, etiqueta, iniciar, pausar, reanudar, sumar, detener }
}
