// Tablero del módulo gym: los días de la rutina. Se abre desde su tarjeta en
// HOY, no desde la barra — la barra es por horizonte de tiempo, no por módulo.
import React, { useMemo } from 'react'
import { clavesDia } from '../data/rutina.js'
import { getSessions } from '../lib/storage.js'
import { sesionFinalizada } from '../lib/session.js'
import { rangoSemana, enRango, hoyISO, fmtCorto } from '../../../core/lib/dates.js'
import { IconCheck, IconChevronRight, IconChevronLeft } from '../../../core/components/icons.jsx'

export default function Home({ rutina, onSelectDia, onSalir }) {
  // Días entrenados esta semana (sesión FINALIZADA, no timestamp truthy)
  const entrenadosSemana = useMemo(() => {
    const { inicio, fin } = rangoSemana(hoyISO())
    const set = new Set()
    getSessions().forEach((s) => {
      if (enRango(s.fecha, inicio, fin) && sesionFinalizada(s)) set.add(s.diaKey)
    })
    return set
  }, [])

  const { inicio, fin } = rangoSemana(hoyISO())
  const dias = clavesDia(rutina) // días dinámicos (editables)

  return (
    <div className="animate-in space-y-5 p-4 pb-24">
      <header className="flex items-center gap-2 pt-2">
        <button
          onClick={onSalir}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-texto-soft active:bg-superficie-alta"
          aria-label="Volver"
        >
          <IconChevronLeft className="h-6 w-6" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-texto">Entrenamiento</h1>
          <p className="text-sm font-medium text-texto-soft">
            Semana {fmtCorto(inicio)} – {fmtCorto(fin)} · {entrenadosSemana.size}/{dias.length} días
          </p>
        </div>
      </header>

      {/* Tarjetas de los días. El único color es el de "hecho": un día pendiente
          no se marca en rojo ni se castiga, solo espera. */}
      <div className="space-y-3">
        {dias.map((key, i) => {
          const dia = rutina[key]
          if (!dia) return null
          const hecho = entrenadosSemana.has(key)
          return (
            <button
              key={key}
              onClick={() => onSelectDia(key)}
              className={`relative w-full overflow-hidden rounded-2xl border p-5 text-left shadow-suave transition-transform active:scale-[0.98] ${
                hecho ? 'border-completo/40 bg-completo/10' : 'border-borde/25 bg-superficie'
              }`}
            >
              <div className="relative flex items-center justify-between">
                <div className="min-w-0 flex-1 pr-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-texto-soft">Día {i + 1}</p>
                  <h2 className="mt-0.5 text-lg font-bold leading-tight tracking-tight text-texto">
                    {dia.nombre.replace(/^Día \d+ — /, '')}
                  </h2>
                  <p className="mt-1 text-xs font-medium text-texto-soft">
                    {dia.ejercicios.length} ejercicios{dia.cardio ? ' · cardio' : ''}
                  </p>
                </div>
                {hecho ? (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-completo">
                    <IconCheck className="h-6 w-6 text-contraste" />
                  </span>
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-superficie-alta">
                    <IconChevronRight className="h-6 w-6 text-texto-soft" />
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
