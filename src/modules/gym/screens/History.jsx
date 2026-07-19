// Historial DEL GYM: sesiones por fecha + evolución de peso/reps + PRs.
// Se abre desde el Historial cruzado (core/screens/Historial.jsx), que puede
// pedir una fecha concreta para desplegarla al entrar.
import React, { useEffect, useMemo, useRef, useState } from 'react'
import LineChart from '../components/LineChart.jsx'
import Calendar from '../components/Calendar.jsx'
import { getSessions, getPRs, deleteSession } from '../lib/storage.js'
import { fmtLargo, fmtCorto, nombreDiaSemana } from '../../../core/lib/dates.js'
import { IconChevronLeft, IconChevronDown, IconTrend, IconTrash, IconRun } from '../../../core/components/icons.jsx'
import Record from '../../../core/components/Record.jsx'
import { confirmar } from '../../../core/components/Hoja.jsx'

export default function History({ fecha, onSalir }) {
  const [sessions, setSessions] = useState(() => [...getSessions()].reverse()) // más reciente primero
  const prs = getPRs()
  const [ejSel, setEjSel] = useState('')

  // Lista única de ejercicios registrados (para el selector del gráfico)
  const ejercicios = useMemo(() => {
    const set = new Set()
    sessions.forEach((s) => s.ejercicios.forEach((e) => e.sets.some((x) => x.done) && set.add(e.nombre)))
    return [...set].sort()
  }, [sessions])

  // Puntos del gráfico: mejor peso por fecha para el ejercicio elegido
  const puntos = useMemo(() => {
    if (!ejSel) return []
    return [...getSessions()]
      .map((s) => {
        const ej = s.ejercicios.find((e) => e.nombre === ejSel)
        if (!ej) return null
        const pesos = ej.sets.filter((x) => x.done).map((x) => Number(x.peso) || 0)
        if (!pesos.length) return null
        return { x: fmtCorto(s.fecha), y: Math.max(...pesos) }
      })
      .filter(Boolean)
  }, [ejSel])

  const borrar = async (id) => {
    const ok = await confirmar({
      titulo: '¿Borrar esta sesión?',
      cuerpo: 'Se quita del historial. No se puede deshacer.',
      accion: 'Borrar',
      peligro: true
    })
    if (!ok) return
    deleteSession(id)
    setSessions([...getSessions()].reverse())
  }

  // Refs a cada <details> por fecha para abrir/desplazar al tocar el calendario
  const sesionRefs = useRef({})
  const irASesion = (iso) => {
    const el = sesionRefs.current[iso]
    if (!el) return
    el.open = true
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // Al entrar desde el Historial cruzado con una fecha, se abre esa sesión.
  // Va en un efecto porque los refs recién existen después del primer render.
  useEffect(() => {
    if (fecha) irASesion(fecha)
  }, [fecha])

  return (
    <div className="animate-in space-y-5 p-4 pb-24">
      <header className="flex items-center gap-2 pt-2">
        <button
          onClick={onSalir}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-texto-soft active:bg-superficie-alta"
          aria-label="Volver"
        >
          <IconChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight text-texto">Historial</h1>
      </header>

      {/* Calendario mensual: días entrenados en verde */}
      <Calendar onSelectFecha={irASesion} />

      {/* Evolución por ejercicio */}
      <section className="rounded-2xl border border-borde/25 bg-superficie p-4 shadow-suave">
        <h2 className="mb-3 flex items-center gap-2 font-bold tracking-tight text-texto">
          <IconTrend className="h-5 w-5 text-marca" /> Evolución de peso
        </h2>
        <select
          value={ejSel}
          onChange={(e) => setEjSel(e.target.value)}
          className="mb-3 w-full rounded-xl border border-borde/25 bg-fondo p-3 text-sm text-texto"
        >
          <option value="">Elige un ejercicio…</option>
          {ejercicios.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        {ejSel && <LineChart puntos={puntos} sufijo="" />}
        {ejSel && prs[ejSel] && (
          <div className="mt-2 flex justify-center">
            <Record>Récord: {prs[ejSel].maxPeso}kg · {prs[ejSel].maxReps} reps</Record>
          </div>
        )}
      </section>

      {/* Lista de sesiones */}
      <section className="space-y-3">
        <h2 className="px-1 font-bold tracking-tight text-texto">Sesiones ({sessions.length})</h2>
        {sessions.length === 0 && <p className="py-8 text-center text-sm text-texto-soft">Todavía no registraste ninguna sesión.</p>}
        {sessions.map((s) => {
          const hechos = s.ejercicios.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0)
          return (
            <details
              key={s.id}
              ref={(el) => { if (el) sesionRefs.current[s.fecha] = el }}
              className="group overflow-hidden rounded-2xl border border-borde/25 bg-superficie shadow-suave scroll-mt-4"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-2 p-4">
                <div className="min-w-0">
                  <p className="truncate font-bold tracking-tight text-texto">{s.diaNombre.replace(/^Día \d+ — /, '')}</p>
                  <p className="truncate text-xs font-medium text-texto-soft">
                    {nombreDiaSemana(s.fecha)} {fmtLargo(s.fecha)} · {hechos} series
                  </p>
                </div>
                <IconChevronDown className="h-5 w-5 shrink-0 text-texto-soft transition-transform group-open:rotate-180" />
              </summary>
              <div className="space-y-2 border-t border-borde/25 p-4">
                {s.ejercicios.filter((e) => e.sets.some((x) => x.done)).map((e, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-semibold text-texto">{e.nombre}</p>
                    <p className="text-texto-soft">
                      {e.sets.filter((x) => x.done).map((x, j) => (
                        <span key={j} className="mr-2 inline-block">
                          {e.tipoReg === 'tiempo' ? `${x.segundos}s` : `${x.peso || 0}kg×${x.reps || 0}`}
                        </span>
                      ))}
                    </p>
                  </div>
                ))}
                {s.cardio?.done && (
                  <p className="flex items-center gap-1.5 text-sm font-medium text-cardio">
                    <IconRun className="h-4 w-4" /> {s.cardio.nombre}
                  </p>
                )}
                {s.notas && <p className="rounded-lg bg-fondo p-2 text-sm italic text-texto-soft">"{s.notas}"</p>}
                <button onClick={() => borrar(s.id)} className="-mx-2 flex min-h-[44px] items-center gap-1 px-2 text-xs font-semibold text-peligro">
                  <IconTrash className="h-4 w-4" /> Borrar sesión
                </button>
              </div>
            </details>
          )
        })}
      </section>
    </div>
  )
}
