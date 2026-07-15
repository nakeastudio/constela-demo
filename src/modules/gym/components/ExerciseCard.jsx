// Tarjeta de ejercicio estilo Hevy / Symmetric.
// Cada serie es una FILA de tabla: SERIE · ANTERIOR · KG · REPS · ✓
// Los valores se TIPEAN (celda → teclado numérico), precargados de la última vez.
// Sin steppers +/- por serie: tabla limpia, nada se corta a 320-360px.
import React from 'react'
import { ejercicioCompleto } from '../lib/session.js'
import { IconCheck, IconPlus, IconMinus, IconTrophy } from '../../../core/components/icons.jsx'

// Celda numérica tipeable (input grande, abre teclado numérico en el cel)
function Celda({ value, placeholder, onChange, done }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value}
      placeholder={placeholder != null && placeholder !== '' ? String(placeholder) : '—'}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      className={`h-11 w-full min-w-0 rounded-lg text-center text-lg font-bold outline-none transition-colors focus:ring-2 focus:ring-marca/40 ${
        done
          ? 'bg-completo/15 text-completo'
          : 'bg-superficie-alta text-texto placeholder:text-texto-soft'
      }`}
    />
  )
}

// Series de aproximación: INSTRUCCIONES, no registro.
// Vienen del plan del coach y preparan músculo y articulación antes de las
// series reales. Por eso no tienen input, ni ✓, ni `done`: no se registran y no
// cuentan como volumen (viven en la rutina, jamás en la sesión — ver Session.jsx).
// Van ARRIBA de las series de trabajo porque ese es el orden en que se hacen.
function Aproximacion({ series }) {
  // La mayoría de los ejercicios no tiene: ausente no pinta nada, ni un hueco.
  if (!series || series.length === 0) return null
  return (
    <div className="mb-3 rounded-xl bg-superficie-alta/60 p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-texto-soft">Aproximación</p>
      <ul className="mt-1 space-y-0.5">
        {series.map((s, i) => (
          <li key={i} className="text-xs font-medium leading-snug text-texto">{s}</li>
        ))}
      </ul>
      {/* Dice por qué no hay nada que marcar, antes de que la pregunta aparezca. */}
      <p className="mt-1.5 text-[10px] font-medium leading-snug text-texto-soft">
        Preparan el músculo. No se registran ni cuentan como volumen.
      </p>
    </div>
  )
}

export default function ExerciseCard({ ejercicio, anteriores = [], aprox = [], onChangeSet, onToggleSet, onAddSet, onRemoveSet, prInfo }) {
  const completo = ejercicioCompleto(ejercicio)
  const esTiempo = ejercicio.tipoReg === 'tiempo'

  // Texto "anterior" para la serie i (lo hecho la última vez en esa misma serie)
  const anteriorTexto = (i) => {
    const a = anteriores[i]
    if (!a) return '—'
    if (esTiempo) return a.segundos ? `${a.segundos}s` : '—'
    return a.peso || a.reps ? `${a.peso || 0}×${a.reps || 0}` : '—'
  }

  return (
    <div
      className={`rounded-2xl border bg-superficie p-4 shadow-suave transition-colors ${
        completo ? 'border-completo/50' : 'border-borde/25'
      }`}
    >
      {/* Encabezado */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold leading-tight tracking-tight text-texto">{ejercicio.nombre}</h3>
          <p className="mt-0.5 text-xs font-medium text-texto-soft">
            {ejercicio.seriesObjetivo} series · {ejercicio.repsObjetivo} · descanso {ejercicio.descanso}s
          </p>
        </div>
        {completo && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-completo text-contraste">
            <IconCheck className="h-4 w-4" />
          </span>
        )}
      </div>

      {prInfo && (
        <p className="mb-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-acento-fuerte px-2.5 py-1 text-xs font-semibold text-contraste-fuerte">
          <IconTrophy className="h-4 w-4 shrink-0" />
          Récord: {prInfo.maxPeso > 0 ? `${prInfo.maxPeso}kg` : ''} {prInfo.maxReps > 0 ? `· ${prInfo.maxReps} reps` : ''}
        </p>
      )}

      {/* Primero la aproximación: es lo que se hace antes de las series reales. */}
      <Aproximacion series={aprox} />

      {/* Encabezado de columnas */}
      <div className="mb-1 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wide text-texto-soft">
        <span className="w-7 shrink-0 text-center">Serie</span>
        <span className="w-12 shrink-0 text-center">Ant.</span>
        {!esTiempo && <span className="flex-1 text-center">Kg</span>}
        <span className="flex-1 text-center">{esTiempo ? 'Seg' : 'Reps'}</span>
        <span className="w-11 shrink-0" />
      </div>

      {/* Filas de series */}
      <div className="space-y-1.5">
        {ejercicio.sets.map((set, i) => (
          <div
            key={i}
            className={`flex items-center gap-1.5 rounded-xl px-1 py-1 ${set.done ? 'bg-completo/10' : ''}`}
          >
            {/* Serie */}
            <span className="flex h-8 w-7 shrink-0 items-center justify-center rounded-md bg-superficie-alta text-sm font-bold text-texto-soft">
              {i + 1}
            </span>

            {/* Anterior (referencia, no editable) */}
            <span className="w-12 shrink-0 text-center text-[11px] font-medium text-texto-soft">{anteriorTexto(i)}</span>

            {/* Kg */}
            {!esTiempo && (
              <div className="min-w-0 flex-1">
                <Celda value={set.peso} placeholder={anteriores[i]?.peso} done={set.done} onChange={(v) => onChangeSet(i, 'peso', v)} />
              </div>
            )}

            {/* Reps o Segundos */}
            <div className="min-w-0 flex-1">
              {esTiempo ? (
                <Celda value={set.segundos} placeholder={anteriores[i]?.segundos} done={set.done} onChange={(v) => onChangeSet(i, 'segundos', v)} />
              ) : (
                <Celda value={set.reps} placeholder={anteriores[i]?.reps} done={set.done} onChange={(v) => onChangeSet(i, 'reps', v)} />
              )}
            </div>

            {/* Completar serie */}
            <button
              onClick={() => onToggleSet(i)}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform active:scale-90 ${
                set.done ? 'bg-completo text-contraste' : 'border-2 border-borde/25 text-texto-soft'
              }`}
              aria-label={set.done ? 'Desmarcar serie' : 'Completar serie'}
            >
              <IconCheck className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>

      {/* Agregar / quitar serie (como Hevy).
          min-h-[44px]: se tocan a mitad del entrenamiento, con las manos
          mojadas, igual que todo lo demás en esta pantalla. */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={onAddSet}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-marca/40 py-2 text-sm font-bold text-marca active:scale-95"
        >
          <IconPlus className="h-4 w-4" /> Agregar serie
        </button>
        {ejercicio.sets.length > 1 && (
          <button
            onClick={onRemoveSet}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border-2 border-borde/25 px-4 py-2 text-texto-soft active:scale-95"
            aria-label="Quitar última serie"
          >
            <IconMinus className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
