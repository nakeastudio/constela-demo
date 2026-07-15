// ============================================================
//  PANTALLA DE SESIÓN DE ENTRENAMIENTO  (la más usada)
// ============================================================
// Flujo sin fricción: registrar serie → marcar ✓ → arranca el descanso solo.
// Todo se autoguarda en localStorage en cada cambio (no se pierde nada).
import React, { useEffect, useRef, useState } from 'react'
import ExerciseCard from '../components/ExerciseCard.jsx'
import CardioCard from '../components/CardioCard.jsx'
import RestTimer from '../components/RestTimer.jsx'
import { useRestTimer } from '../hooks/useRestTimer.js'
import { crearSesion, ultimaSesionSets } from '../lib/session.js'
import {
  getActiveSession,
  saveActiveSession,
  clearActiveSession,
  saveSession,
  actualizarPRs,
  getPRs
} from '../lib/storage.js'
import { hoyISO } from '../../../core/lib/dates.js'
import { alternarItem, ahoraISO } from '../../../core/lib/dia.js'
import { IconChevronLeft, IconFlame, IconNote, IconCheck } from '../../../core/components/icons.jsx'

export default function Session({ rutina, diaKey, onSalir, onFinalizada }) {
  const dia = rutina[diaKey]
  const timer = useRestTimer()
  const [ejercicioActivo, setEjercicioActivo] = useState('')
  const prs = useRef(getPRs())
  // Sets de la última vez por ejercicio (columna "Anterior" estilo Hevy)
  const anteriores = useRef(
    Object.fromEntries(dia.ejercicios.concat(dia.core || []).map((e) => [e.nombre, ultimaSesionSets(e.nombre)]))
  )

  // --- Carga o crea la sesión (resume el draft si es del mismo día y fecha) ---
  // El borrador se busca por día y se reconoce por sus campos, no
  // reconstruyendo el id: los ids son opacos desde que la fecha es editable
  // (ver lib/session.js).
  const [sesion, setSesion] = useState(() => {
    const activa = getActiveSession(diaKey)
    if (activa && activa.fecha === hoyISO()) return activa
    return crearSesion(diaKey, dia, hoyISO())
  })

  // --- Autoguardado en cada cambio ---
  useEffect(() => {
    saveActiveSession(sesion)
  }, [sesion])

  // Actualiza un campo de una serie
  const cambiarSet = (ejIdx, setIdx, campo, valor) => {
    setSesion((prev) => {
      const ejercicios = prev.ejercicios.map((ej, i) => {
        if (i !== ejIdx) return ej
        const sets = ej.sets.map((s, j) => (j === setIdx ? { ...s, [campo]: valor } : s))
        return { ...ej, sets }
      })
      return { ...prev, ejercicios }
    })
  }

  // Marca/desmarca serie. Al marcar → arranca el cronómetro de descanso.
  const toggleSet = (ejIdx, setIdx) => {
    setSesion((prev) => {
      const ej = prev.ejercicios[ejIdx]
      const yaHecha = ej.sets[setIdx].done
      const ejercicios = prev.ejercicios.map((e, i) => {
        if (i !== ejIdx) return e
        // alternarItem sella `registradoEn` con el momento actual al marcar.
        const sets = e.sets.map((s, j) => (j === setIdx ? alternarItem(s) : s))
        return { ...e, sets }
      })
      // Si la estamos completando (no desmarcando) → descanso automático
      if (!yaHecha) {
        timer.iniciar(ej.descanso)
        setEjercicioActivo(ej.nombre)
      }
      return { ...prev, ejercicios }
    })
  }

  // Agrega una serie (copia los valores de la última como arranque, como Hevy)
  const agregarSet = (ejIdx) => {
    setSesion((prev) => {
      const ejercicios = prev.ejercicios.map((ej, i) => {
        if (i !== ejIdx) return ej
        const ultima = ej.sets[ej.sets.length - 1]
        const nueva = { peso: ultima?.peso ?? '', reps: ultima?.reps ?? '', segundos: ultima?.segundos ?? '', done: false, registradoEn: null }
        return { ...ej, sets: [...ej.sets, nueva] }
      })
      return { ...prev, ejercicios }
    })
  }

  // Quita la última serie (mínimo 1)
  const quitarSet = (ejIdx) => {
    setSesion((prev) => {
      const ejercicios = prev.ejercicios.map((ej, i) => {
        if (i !== ejIdx || ej.sets.length <= 1) return ej
        return { ...ej, sets: ej.sets.slice(0, -1) }
      })
      return { ...prev, ejercicios }
    })
  }

  const toggleCardio = () => {
    setSesion((prev) => ({ ...prev, cardio: prev.cardio ? { ...prev.cardio, done: !prev.cardio.done } : null }))
  }

  const cambiarNotas = (notas) => setSesion((prev) => ({ ...prev, notas }))

  // Finaliza: guarda en historial, recalcula PRs, limpia el borrador del día.
  // `finalizada` es la intención; `completadaEn`, solo el cuándo.
  const finalizar = () => {
    const finalizada = { ...sesion, finalizada: true, completadaEn: ahoraISO() }
    saveSession(finalizada)
    const { nuevos } = actualizarPRs(finalizada)
    clearActiveSession(diaKey)
    timer.detener()
    onFinalizada(nuevos)
  }

  const totalSets = sesion.ejercicios.reduce((a, e) => a + e.sets.length, 0)
  const hechos = sesion.ejercicios.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0)
  const progreso = totalSets ? Math.round((hechos / totalSets) * 100) : 0

  // Índice de fuerza vs core para separar secciones visualmente
  const fuerza = sesion.ejercicios.map((e, i) => ({ e, i })).filter((x) => x.e.seccion === 'fuerza')
  const core = sesion.ejercicios.map((e, i) => ({ e, i })).filter((x) => x.e.seccion === 'core')

  return (
    <div className="animate-in pb-44">
      {/* Header pegajoso con progreso */}
      <div className="sticky top-0 z-30 border-b border-borde/25 bg-superficie/90 px-4 py-3 backdrop-blur-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={onSalir}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-texto-soft active:bg-superficie-alta"
            aria-label="Volver"
          >
            <IconChevronLeft className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-bold leading-tight tracking-tight text-texto">{dia.nombre}</h1>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-superficie-alta">
                <div className="h-full rounded-full bg-marca transition-all" style={{ width: `${progreso}%` }} />
              </div>
              <span className="text-xs font-bold tabular-nums text-marca">{hechos}/{totalSets}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Calentamiento + activación */}
        <details className="rounded-2xl border border-borde/25 bg-superficie-alta p-4">
          <summary className="flex cursor-pointer items-center gap-2 font-bold text-texto">
            <IconFlame className="h-5 w-5 shrink-0 text-acento" /> Calentamiento & activación
          </summary>
          <p className="mt-2 text-sm text-texto-soft">{dia.calentamiento}</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-texto-soft">
            {dia.activacion.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </details>

        {/* Ejercicios de fuerza */}
        {fuerza.map(({ e, i }) => (
          <ExerciseCard
            key={i}
            ejercicio={e}
            anteriores={anteriores.current[e.nombre]}
            prInfo={prs.current[e.nombre]}
            onChangeSet={(setIdx, campo, valor) => cambiarSet(i, setIdx, campo, valor)}
            onToggleSet={(setIdx) => toggleSet(i, setIdx)}
            onAddSet={() => agregarSet(i)}
            onRemoveSet={() => quitarSet(i)}
          />
        ))}

        {/* Core */}
        {core.length > 0 && (
          <>
            <h2 className="px-1 pt-2 text-sm font-bold uppercase tracking-wide text-texto-soft">Core</h2>
            {core.map(({ e, i }) => (
              <ExerciseCard
                key={i}
                ejercicio={e}
                anteriores={anteriores.current[e.nombre]}
                prInfo={prs.current[e.nombre]}
                onChangeSet={(setIdx, campo, valor) => cambiarSet(i, setIdx, campo, valor)}
                onToggleSet={(setIdx) => toggleSet(i, setIdx)}
                onAddSet={() => agregarSet(i)}
                onRemoveSet={() => quitarSet(i)}
              />
            ))}
          </>
        )}

        {/* Cardio */}
        {dia.cardio && (
          <CardioCard cardio={dia.cardio} protocolo={dia.cardio.protocolo} done={sesion.cardio?.done} onToggle={toggleCardio} />
        )}

        {/* Notas de la sesión */}
        <div className="rounded-2xl border border-borde/25 bg-superficie p-4 shadow-suave">
          <label className="mb-2 flex items-center gap-2 text-sm font-bold text-texto">
            <IconNote className="h-5 w-5 text-marca" /> ¿Cómo me sentí?
          </label>
          <textarea
            value={sesion.notas}
            onChange={(e) => cambiarNotas(e.target.value)}
            placeholder="Energía, fatiga, dolores, motivación..."
            rows={3}
            className="w-full resize-none rounded-xl border border-borde/25 bg-fondo p-3 text-sm text-texto outline-none focus:border-marca"
          />
        </div>

        <button
          onClick={finalizar}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-completo py-4 text-lg font-extrabold text-contraste shadow-lg active:scale-95"
        >
          <IconCheck className="h-6 w-6" /> Finalizar entrenamiento
        </button>
      </div>

      {/* Cronómetro de descanso (overlay fijo) */}
      <RestTimer timer={timer} ejercicioNombre={ejercicioActivo} />
    </div>
  )
}
