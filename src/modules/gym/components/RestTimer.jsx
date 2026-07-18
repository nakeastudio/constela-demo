// Panel del cronómetro de descanso. Aparece fijo abajo y MUY visible.
// Anillo circular animado + tiempo grande + controles.
import React from 'react'
import { IconPlay, IconPause, IconClock, IconCheck } from '../../../core/components/icons.jsx'

function mmss(seg) {
  const m = Math.floor(seg / 60)
  const s = seg % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// El nombre del ejercicio viaja DENTRO del cronómetro: el panel se ve desde
// cualquier pantalla, así que no puede depender del estado local de Session.
export default function RestTimer({ timer }) {
  const { activo, pausado, restante, total, etiqueta, pausar, reanudar, sumar, detener } = timer
  if (!activo) return null

  const progreso = total > 0 ? restante / total : 0
  const R = 52
  const C = 2 * Math.PI * R
  const dash = C * progreso
  const terminado = restante <= 0

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 animate-in">
      <div
        className={`mx-auto max-w-md rounded-t-3xl border-x-2 border-t-2 p-5 shadow-2xl ${
          terminado ? 'border-completo bg-completo text-contraste' : 'border-marca bg-superficie'
        }`}
      >
        <div className="flex items-center gap-4">
          {/* Anillo de progreso */}
          <div className={`relative shrink-0 ${terminado ? 'animate-pulse-ring' : ''}`}>
            <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
              <circle cx="60" cy="60" r={R} fill="none" strokeWidth="9" className={terminado ? 'stroke-contraste/30' : 'stroke-borde/40'} />
              <circle
                cx="60"
                cy="60"
                r={R}
                fill="none"
                strokeWidth="9"
                strokeLinecap="round"
                className={terminado ? 'stroke-contraste' : 'stroke-marca'}
                strokeDasharray={C}
                strokeDashoffset={C - dash}
                style={{ transition: 'stroke-dashoffset 0.25s linear' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-extrabold tabular-nums ${terminado ? 'text-contraste' : 'text-texto'}`}>
                {terminado ? '¡YA!' : mmss(restante)}
              </span>
            </div>
          </div>

          {/* Info + controles */}
          <div className="flex-1">
            <p className={`mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${terminado ? 'text-contraste/90' : 'text-marca'}`}>
              <IconClock className="h-4 w-4" /> Descanso
            </p>
            {etiqueta && (
              <p className={`mb-3 line-clamp-1 text-sm font-medium ${terminado ? 'text-contraste' : 'text-texto-soft'}`}>
                {etiqueta}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {!terminado && (
                <button
                  onClick={pausado ? reanudar : pausar}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-superficie-alta py-2 text-sm font-bold text-texto active:scale-95"
                >
                  {pausado ? <IconPlay className="h-4 w-4" /> : <IconPause className="h-4 w-4" />}
                  {pausado ? 'Seguir' : 'Pausar'}
                </button>
              )}
              {!terminado && (
                <button
                  onClick={() => sumar(15)}
                  className="rounded-lg bg-superficie-alta py-2 text-sm font-bold text-texto active:scale-95"
                >
                  +15s
                </button>
              )}
              <button
                onClick={detener}
                className={`col-span-2 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-bold active:scale-95 ${
                  terminado ? 'bg-superficie text-completo' : 'bg-marca-fuerte text-contraste-fuerte'
                }`}
              >
                {terminado && <IconCheck className="h-4 w-4" />}
                {terminado ? 'Listo' : 'Saltar descanso'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
