// ============================================================
//  BARRA DE SESIÓN EN CURSO  (el "mini-player" del entrenamiento)
// ============================================================
// Chrome de app, no pantalla de módulo: vive a nivel de App (como el cronómetro
// de descanso) y se ve desde CUALQUIER vista que no sea la propia sesión. Su
// trabajo es que un entrenamiento abierto no se pierda de vista: recuerda que
// está en curso, cuánto lleva y cuánto se avanzó, y devuelve a él tocándola.
//
// App decide CUÁNDO mostrarla y le pasa los datos ya calculados (App es la raíz
// de composición y lee el estado del gym, igual que arma las tarjetas de Hoy).
// Este componente solo pinta. El POSICIONAMIENTO (encima de la nav / del panel
// de descanso) lo resuelve el contenedor de App, no acá.
//
// El reloj tiquea SOLO para mostrar: el tiempo real se deriva de `inicioMs`
// (timestamp), así que un re-render por segundo no acumula error ni deriva.
import React, { useEffect, useState } from 'react'
import { fmtDuracion } from '../lib/session.js'
import { IconDumbbell, IconClock, IconChevronRight } from '../../../core/components/icons.jsx'

export default function SessionBar({ diaNombre, hecho, total, inicioMs, descansando, onAbrir }) {
  const pct = total > 0 ? Math.round((hecho / total) * 100) : 0

  // Segundero para el reloj. No es la fuente de verdad —solo empuja un re-render
  // cada segundo—; el valor sale de `ahora - inicioMs`. Bajo reduced-motion el
  // reset global de animaciones no toca esto (no es animación, es dato), y así
  // debe ser: la hora tiene que seguir corriendo.
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const elapsed = inicioMs != null ? Math.max(0, Math.round((ahora - inicioMs) / 1000)) : null

  return (
    <button
      onClick={onAbrir}
      // Toda la barra es el objetivo (56px de alto, muy por encima del piso de
      // 44). El acento es guinda —entrenamiento vivo, afordancia de marca—,
      // NUNCA rojo: una sesión a medias está EN CURSO, no fallada. El avance y el
      // reloj no son alarmas.
      className="group animate-in relative flex h-14 w-full items-center gap-3 overflow-hidden border-t border-borde bg-superficie px-4 text-left shadow-flotante transition-colors active:bg-superficie-alta"
      aria-label={`Entrenamiento en curso, ${hecho} de ${total} series. Volver a la sesión`}
    >
      {/* Icono en círculo guinda tenue: mismo idioma que la tarjeta de gym en Hoy
          y el estado activo de la barra de navegación. */}
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-marca/15 text-marca">
        <IconDumbbell className="h-[18px] w-[18px]" />
        {/* Punto de descanso: turquesa con latido leve. NO es un cronómetro —el
            panel de descanso ya lo muestra grande; duplicarlo sería ruido—. Solo
            avisa "hay un descanso corriendo". Informa el color y la presencia, no
            el movimiento: reduced-motion apaga el latido y el punto sigue ahí. */}
        {descansando && (
          <span className="animate-pulse-ring absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-superficie bg-completo" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold leading-tight text-texto">
          Entrenamiento en curso
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-xs leading-tight text-texto-soft">
          {elapsed != null && (
            <>
              <IconClock className="h-3.5 w-3.5 shrink-0" />
              <span className="shrink-0 font-semibold tabular-nums">{fmtDuracion(elapsed)}</span>
              {diaNombre && <span className="shrink-0 text-texto-soft/60">·</span>}
            </>
          )}
          {diaNombre && <span className="truncate">{diaNombre}</span>}
        </span>
      </span>

      {/* Avance general en turquesa (completado). Es la misma proporción que el
          hilo del borde inferior. */}
      <span className="shrink-0 text-sm font-bold tabular-nums text-completo">
        {hecho}/{total}
      </span>
      <IconChevronRight className="h-5 w-5 shrink-0 text-texto-soft transition-transform group-active:translate-x-0.5" />

      {/* Avance como hilo fino al borde inferior, turquesa. Refuerzo silencioso
          del contador, sin naggear. La transición de ancho la apaga el reset de
          reduced-motion; el ancho final es correcto igual. */}
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-completo transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }}
        aria-hidden="true"
      />
    </button>
  )
}
