// ============================================================
//  REPORTE SEMANAL  (diseñado para screenshot / exportar PNG y enviar al coach)
// ============================================================
import React, { useMemo, useRef, useState } from 'react'
import { generarReporte } from '../lib/report.js'
import { fmtLargo, fmtCorto, hoyISO, fromISO, toISO, nombreDiaSemana } from '../../../core/lib/dates.js'
import { getSettings, saveSettings } from '../../../core/lib/storage.js'
import { IconChevronLeft, IconChevronRight, IconTrophy, IconRun, IconNote, IconDownload } from '../../../core/components/icons.jsx'

// Nota semanal para el coach (persistida por semana en settings)
function getNotaSemana(inicio) {
  return getSettings().weekNotes?.[inicio] || ''
}
function setNotaSemana(inicio, texto) {
  const s = getSettings()
  const weekNotes = { ...(s.weekNotes || {}), [inicio]: texto }
  saveSettings({ ...s, weekNotes })
}

function Flecha({ t }) {
  const map = {
    sube: 'text-completo',
    baja: 'text-texto-soft',
    igual: 'text-texto-soft',
    nuevo: 'text-texto-soft'
  }
  return <span className={`font-bold ${map[t.dir]}`}>{t.flecha}</span>
}

export default function Report({ onSalir }) {
  const [refIso, setRefIso] = useState(hoyISO())
  const reporte = useMemo(() => generarReporte(refIso), [refIso])
  const [nota, setNota] = useState(() => getNotaSemana(generarReporte(refIso).rango.inicio))
  const [exportando, setExportando] = useState(false)
  const capturaRef = useRef(null)

  const cambiarSemana = (delta) => {
    const d = fromISO(refIso)
    d.setDate(d.getDate() + delta * 7)
    const nuevo = toISO(d)
    setRefIso(nuevo)
    setNota(getNotaSemana(generarReporte(nuevo).rango.inicio))
  }

  const onNota = (v) => {
    setNota(v)
    setNotaSemana(reporte.rango.inicio, v)
  }

  // Exporta el bloque del reporte como imagen PNG (html2canvas, carga diferida)
  const exportarPNG = async () => {
    setExportando(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      // El fondo del PNG sale del token vigente, no de un hex fijo: así el
      // export sigue al tema en vez de quedarse con un color viejo.
      const superficie = getComputedStyle(document.documentElement).getPropertyValue('--superficie').trim()
      const canvas = await html2canvas(capturaRef.current, {
        backgroundColor: superficie ? `rgb(${superficie})` : '#17171C',
        scale: 2,
        useCORS: true
      })
      const link = document.createElement('a')
      link.download = `reporte_${reporte.rango.inicio}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e) {
      alert('No se pudo exportar la imagen: ' + e.message)
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="animate-in p-4 pb-28">
      {/* Barra de navegación de semana */}
      <header className="mb-3 flex items-center gap-2">
        <button
          onClick={onSalir}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-texto-soft active:bg-superficie-alta"
          aria-label="Volver"
        >
          <IconChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 text-xl font-extrabold tracking-tight text-texto">Reporte semanal</h1>
      </header>
      <div className="mb-4 flex items-center justify-between rounded-xl bg-superficie-alta p-1">
        <button onClick={() => cambiarSemana(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-marca active:bg-marca/15" aria-label="Semana anterior">
          <IconChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-bold tabular-nums text-texto">
          {fmtCorto(reporte.rango.inicio)} – {fmtCorto(reporte.rango.fin)}
        </span>
        <button onClick={() => cambiarSemana(1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-marca active:bg-marca/15" aria-label="Semana siguiente">
          <IconChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* ====== BLOQUE CAPTURABLE ====== */}
      <div ref={capturaRef} className="space-y-4 rounded-2xl bg-superficie p-4">
        <div className="border-b-2 border-marca pb-2">
          <h2 className="text-lg font-extrabold text-marca">Reporte de entrenamiento</h2>
          <p className="text-sm text-texto-soft">
            {fmtLargo(reporte.rango.inicio)} — {fmtLargo(reporte.rango.fin)}
          </p>
        </div>

        {!reporte.hayDatos ? (
          <p className="py-8 text-center text-sm text-texto-soft">Sin entrenamientos registrados esta semana.</p>
        ) : (
          <>
            {/* Días entrenados */}
            <section>
              <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-texto-soft">Días entrenados ({reporte.diasEntrenados.length}/4)</h3>
              <div className="flex flex-wrap gap-2">
                {reporte.diasEntrenados.map((d) => (
                  <span key={d.fecha} className="rounded-full bg-marca/10 px-3 py-1 text-xs font-semibold text-marca">
                    {nombreDiaSemana(d.fecha)} · {d.nombre.replace(/^Día \d+ — /, '')}
                  </span>
                ))}
              </div>
            </section>

            {/* PRs destacados */}
            {reporte.prs.length > 0 && (
              <section className="rounded-xl bg-gradient-to-r from-acento/10 to-marca/10 p-3">
                <h3 className="mb-1 flex items-center gap-1.5 text-sm font-bold text-acento">
                  <IconTrophy className="h-4 w-4" /> Récords logrados
                </h3>
                <ul className="space-y-0.5 text-sm text-texto">
                  {reporte.prs.map((p, i) => (
                    <li key={i}>
                      <strong>{p.nombre}</strong> — {p.peso > 0 ? `${p.peso}kg` : ''} {p.reps > 0 ? `· ${p.reps} reps` : ''} <span className="text-xs text-texto-soft">({p.tipo})</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Ejercicios con comparación */}
            <section>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-texto-soft">Ejercicios vs semana anterior</h3>
              <div className="space-y-2">
                {reporte.ejercicios.map((ej, i) => (
                  <div key={i} className="rounded-xl border border-borde/25 p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-texto">{ej.nombre}</span>
                      <span className="text-sm">
                        peso <Flecha t={ej.tendenciaPeso} /> · reps <Flecha t={ej.tendenciaReps} />
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {ej.series.map((s, j) => (
                        <span key={j} className="rounded bg-superficie-alta px-1.5 py-0.5 text-xs font-medium text-texto-soft">
                          {ej.tipoReg === 'tiempo' ? `${s.segundos}s` : `${s.peso || 0}×${s.reps || 0}`}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Volumen por grupo muscular */}
            <section>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-texto-soft">Volumen semanal (series)</h3>
              <div className="space-y-1.5">
                {reporte.volumen.map((v, i) => {
                  const enRango = v.series >= v.min && v.series <= v.max
                  const bajo = v.series < v.min
                  const pct = Math.min(100, (v.series / v.max) * 100)
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-texto">{v.label}</span>
                        <span className={enRango ? 'font-bold text-completo' : 'text-texto-soft'}>
                          {v.series} / {v.min}-{v.max} {enRango ? '✓' : bajo ? '↓' : '↑'}
                        </span>
                      </div>
                      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-superficie-alta">
                        <div className={`h-full rounded-full ${enRango ? 'bg-completo' : 'bg-texto-soft/40'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Cardio */}
            {reporte.cardio.length > 0 && (
              <section>
                <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-texto-soft">Cardio</h3>
                <p className="flex items-start gap-1.5 text-sm text-cardio">
                  <IconRun className="mt-0.5 h-4 w-4 shrink-0" /> {reporte.cardio.length} sesión(es): {reporte.cardio.map((c) => `${nombreDiaSemana(c.fecha)} (${c.nombre})`).join(' · ')}
                </p>
              </section>
            )}

            {/* Nota para el coach */}
            <section className="rounded-xl bg-fondo p-3">
              <h3 className="mb-1 flex items-center gap-1.5 text-sm font-bold text-texto">
                <IconNote className="h-4 w-4 text-marca" /> Nota para el coach
              </h3>
              <p className="whitespace-pre-wrap text-sm italic text-texto-soft">
                {nota || reporte.notas || 'Sin notas esta semana.'}
              </p>
            </section>
          </>
        )}
      </div>
      {/* ====== FIN BLOQUE CAPTURABLE ====== */}

      {/* Editor de nota (fuera de la captura) */}
      <div className="mt-4">
        <label className="mb-1 block text-sm font-bold text-texto">Editar nota para el coach</label>
        <textarea
          value={nota}
          onChange={(e) => onNota(e.target.value)}
          rows={3}
          placeholder="Cómo me sentí esta semana: energía, fatiga, dolores, motivación..."
          className="w-full resize-none rounded-xl border border-borde/25 bg-superficie p-3 text-sm text-texto outline-none focus:border-marca"
        />
      </div>

      <button
        onClick={exportarPNG}
        disabled={exportando || !reporte.hayDatos}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-marca py-4 font-extrabold text-contraste shadow-flotante active:scale-95 disabled:opacity-50"
      >
        {!exportando && <IconDownload className="h-5 w-5" />}
        {exportando ? 'Generando imagen…' : 'Exportar reporte como PNG'}
      </button>
    </div>
  )
}
