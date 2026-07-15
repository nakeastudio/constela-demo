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
  if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 300])
}

export function useRestTimer() {
  const [activo, setActivo] = useState(false)
  const [pausado, setPausado] = useState(false)
  const [restante, setRestante] = useState(0)
  const [total, setTotal] = useState(0)
  const finRef = useRef(0) // timestamp de fin (ms)
  const intervalRef = useRef(null)

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
    (segundos) => {
      limpiar()
      const dur = Math.max(1, Math.round(segundos))
      finRef.current = Date.now() + dur * 1000
      setTotal(dur)
      setRestante(dur)
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

  return { activo, pausado, restante, total, iniciar, pausar, reanudar, sumar, detener }
}
