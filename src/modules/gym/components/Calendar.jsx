// Calendario mensual: grilla Lun→Dom, semanas como filas.
// Marca en verde los días con una sesión FINALIZADA.
// Tocar un día entrenado dispara onSelectFecha(iso) si el padre lo pasa.
import React, { useMemo, useState } from 'react'
import { getSessions } from '../lib/storage.js'
import { sesionFinalizada } from '../lib/session.js'
import { gridMes, fmtMesAnio, toISO, hoyISO } from '../../../core/lib/dates.js'
import { IconChevronLeft, IconChevronRight } from '../../../core/components/icons.jsx'

const DIAS_COL = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export default function Calendar({ onSelectFecha }) {
  // Mes que se está mostrando (arranca en el mes actual)
  const [cursor, setCursor] = useState(() => {
    const h = new Date()
    return { anio: h.getFullYear(), mes: h.getMonth() }
  })

  // Fechas con sesión finalizada. Se pregunta por la intención (`finalizada`),
  // no por si un timestamp existe: así `completadaEn` puede editarse.
  const entrenados = useMemo(() => {
    const set = new Set()
    getSessions().forEach((s) => {
      if (sesionFinalizada(s)) set.add(s.fecha)
    })
    return set
  }, [])

  const semanas = useMemo(() => gridMes(cursor.anio, cursor.mes), [cursor])
  const hoy = hoyISO()

  const mover = (delta) => {
    setCursor((c) => {
      const d = new Date(c.anio, c.mes + delta, 1, 12, 0, 0)
      return { anio: d.getFullYear(), mes: d.getMonth() }
    })
  }

  const titulo = fmtMesAnio(new Date(cursor.anio, cursor.mes, 1))

  return (
    <section className="rounded-2xl border border-borde/25 bg-superficie p-4 shadow-suave">
      {/* Navegación de mes */}
      <header className="mb-3 flex items-center justify-between">
        <button
          onClick={() => mover(-1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-marca active:bg-marca/15"
          aria-label="Mes anterior"
        >
          <IconChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-center text-sm font-bold capitalize tracking-tight text-texto">{titulo}</h2>
        <button
          onClick={() => mover(1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-marca active:bg-marca/15"
          aria-label="Mes siguiente"
        >
          <IconChevronRight className="h-5 w-5" />
        </button>
      </header>

      {/* Encabezado de columnas Lun→Dom */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DIAS_COL.map((d, i) => (
          <span key={i} className="text-center text-[11px] font-semibold text-texto-soft">{d}</span>
        ))}
      </div>

      {/* Grilla de días */}
      <div className="space-y-1">
        {semanas.map((semana, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {semana.map((celda) => {
              const trained = entrenados.has(celda.iso)
              const esHoy = celda.iso === hoy
              const clickable = trained && onSelectFecha
              return (
                <button
                  key={celda.iso}
                  type="button"
                  disabled={!clickable}
                  onClick={clickable ? () => onSelectFecha(celda.iso) : undefined}
                  className={[
                    'flex aspect-square items-center justify-center rounded-lg text-xs font-semibold transition-colors',
                    clickable ? 'active:scale-90' : 'cursor-default',
                    !celda.mesActual ? 'text-texto-soft' : 'text-texto',
                    // Día entrenado: punto encendido (relleno). Hoy: solo el aro.
                    // `marca` y `completo` son el mismo turquesa, así que la
                    // diferencia la hace el relleno, no el color.
                    trained ? 'bg-completo font-bold text-contraste' : 'bg-fondo',
                    esHoy ? 'ring-2 ring-marca' : '',
                    trained && esHoy ? 'ring-offset-2 ring-offset-superficie' : ''
                  ].join(' ')}
                  aria-label={trained ? `${celda.iso} — entrenado` : celda.iso}
                >
                  {celda.dia}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Leyenda */}
      <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-texto-soft">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-completo" /> Entrenado
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded ring-2 ring-marca" /> Hoy
        </span>
      </div>
    </section>
  )
}
