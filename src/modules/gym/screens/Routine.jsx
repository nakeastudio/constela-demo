// ============================================================
//  EDITOR DE RUTINA  (totalmente editable)
// ============================================================
// Permite: renombrar días, agregar/quitar días, editar calentamiento,
// activación, ejercicios de fuerza y core, prender/apagar cardio, y
// EXPORTAR/IMPORTAR la rutina como JSON (para enviársela al coach o a una IA
// y pegar de vuelta la versión actualizada).
import React, { useState } from 'react'
import { GRUPO_LABEL, clavesDia, siguienteClaveDia, diaVacio, cardioVacio, validarRutina } from '../data/rutina.js'
import { saveRutina, resetRutina } from '../lib/storage.js'
import { IconChevronLeft, IconChevronUp, IconChevronDown, IconPlus, IconTrash, IconDownload, IconUpload } from '../../../core/components/icons.jsx'
import Toggle from '../../../core/components/Toggle.jsx'

const GRUPOS = Object.keys(GRUPO_LABEL)

export default function Routine({ rutina, onChange, onSalir }) {
  const [r, setR] = useState(rutina)
  const [diaSel, setDiaSel] = useState(clavesDia(rutina)[0])
  const [panel, setPanel] = useState(null) // 'export' | 'import' | null
  const [importText, setImportText] = useState('')

  const dias = clavesDia(r)
  const dia = r[diaSel] || r[dias[0]]

  // Persiste y propaga a toda la app
  const persistir = (nuevo) => {
    setR(nuevo)
    saveRutina(nuevo)
    onChange(nuevo)
  }

  // ---- edición del día ----
  const editarDia = (campo, valor) => persistir({ ...r, [diaSel]: { ...dia, [campo]: valor } })

  // ---- ejercicios (sección = 'ejercicios' | 'core') ----
  const editarEj = (seccion, idx, campo, valor) => {
    const lista = dia[seccion].map((e, i) => (i === idx ? { ...e, [campo]: valor } : e))
    persistir({ ...r, [diaSel]: { ...dia, [seccion]: lista } })
  }
  const borrarEj = (seccion, idx) => {
    const lista = dia[seccion].filter((_, i) => i !== idx)
    persistir({ ...r, [diaSel]: { ...dia, [seccion]: lista } })
  }
  const agregarEj = (seccion) => {
    const base = { nombre: 'Nuevo ejercicio', series: 3, reps: '10-12', descanso: 60, grupo: 'gluteo' }
    if (seccion === 'core') base.grupo = 'core'
    persistir({ ...r, [diaSel]: { ...dia, [seccion]: [...(dia[seccion] || []), base] } })
  }

  // ---- activación ----
  const editarActiv = (idx, valor) => {
    const a = dia.activacion.map((x, i) => (i === idx ? valor : x))
    persistir({ ...r, [diaSel]: { ...dia, activacion: a } })
  }
  const agregarActiv = () => persistir({ ...r, [diaSel]: { ...dia, activacion: [...(dia.activacion || []), 'Nuevo'] } })
  const borrarActiv = (idx) => persistir({ ...r, [diaSel]: { ...dia, activacion: dia.activacion.filter((_, i) => i !== idx) } })

  // ---- cardio ----
  // Apagar el cardio lo pone en null: el día deja de tenerlo. Prenderlo vuelve a
  // la plantilla de cardioVacio(), no al protocolo anterior — no se guarda un
  // borrador escondido de algo que la UI dice que no existe.
  const toggleCardio = () => editarDia('cardio', dia.cardio ? null : cardioVacio())
  const editarCardio = (campo, valor) => editarDia('cardio', { ...dia.cardio, [campo]: valor })

  // ---- intervalos del cardio ----
  // Lectura tolerante: un cardio importado puede no traer `protocolo`.
  const intervalos = dia.cardio?.protocolo || []
  const editarIntervalo = (idx, campo, valor) =>
    editarCardio('protocolo', intervalos.map((t, i) => (i === idx ? { ...t, [campo]: valor } : t)))
  const borrarIntervalo = (idx) => editarCardio('protocolo', intervalos.filter((_, i) => i !== idx))
  const agregarIntervalo = () => editarCardio('protocolo', [...intervalos, { min: '', inclinacion: '', velocidad: '' }])
  const moverIntervalo = (idx, delta) => {
    const destino = idx + delta
    if (destino < 0 || destino >= intervalos.length) return
    const p = [...intervalos]
    ;[p[idx], p[destino]] = [p[destino], p[idx]]
    editarCardio('protocolo', p)
  }

  // ---- días ----
  const agregarDia = () => {
    const key = siguienteClaveDia(r)
    const num = dias.length + 1
    persistir({ ...r, [key]: diaVacio(num) })
    setDiaSel(key)
  }
  const eliminarDia = () => {
    if (dias.length <= 1) return
    if (!confirm(`¿Eliminar "${dia.nombre}"? No borra sesiones ya registradas.`)) return
    const nuevo = { ...r }
    delete nuevo[diaSel]
    persistir(nuevo)
    setDiaSel(clavesDia(nuevo)[0])
  }

  // ---- import / export JSON ----
  const exportarRutina = JSON.stringify(r, null, 2)
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(exportarRutina)
      alert('Rutina copiada. Ya puedes pegarla donde quieras (coach / IA).')
    } catch {
      alert('No se pudo copiar automáticamente. Selecciona el texto y cópialo a mano.')
    }
  }
  const aplicarImport = () => {
    try {
      const obj = JSON.parse(importText)
      const limpia = validarRutina(obj)
      persistir(limpia)
      setDiaSel(clavesDia(limpia)[0])
      setImportText('')
      setPanel(null)
      alert('Rutina importada y guardada.')
    } catch (e) {
      alert('JSON inválido: ' + e.message)
    }
  }

  const resetear = () => {
    if (!confirm('¿Restaurar la rutina original? Perderás tus cambios al plan (no tus sesiones).')) return
    const def = resetRutina()
    setR(def)
    setDiaSel(clavesDia(def)[0])
    onChange(def)
  }

  const inputBase =
    'rounded-lg border border-borde/25 bg-fondo p-2 text-sm outline-none focus:border-marca'

  return (
    <div className="animate-in space-y-4 p-4 pb-28">
      <header className="flex items-center gap-2 pt-2">
        <button onClick={onSalir} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-texto-soft active:bg-superficie-alta" aria-label="Volver">
          <IconChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 text-2xl font-extrabold tracking-tight text-texto">Editar rutina</h1>
      </header>

      {/* Tabs de días (dinámicos) + agregar día */}
      <div className="flex flex-wrap gap-2">
        {dias.map((k, i) => (
          <button
            key={k}
            onClick={() => setDiaSel(k)}
            className={`rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
              diaSel === k ? 'bg-marca text-contraste shadow-flotante' : 'bg-superficie-alta text-texto-soft'
            }`}
          >
            D{i + 1}
          </button>
        ))}
        <button
          onClick={agregarDia}
          className="flex items-center gap-1 rounded-xl border-2 border-dashed border-marca px-3 py-2 text-sm font-bold text-marca active:scale-95"
        >
          <IconPlus className="h-4 w-4" /> Día
        </button>
      </div>

      {/* ---- Edición del día seleccionado ---- */}
      <div className="space-y-4 rounded-2xl border border-borde/25 bg-superficie p-4 shadow-suave">
        {/* Nombre del día */}
        <label className="block text-xs font-bold uppercase tracking-wide text-texto-soft">
          Nombre del día
          <input value={dia.nombre} onChange={(e) => editarDia('nombre', e.target.value)} className={`mt-1 w-full font-semibold text-texto ${inputBase}`} />
        </label>

        {/* Calentamiento */}
        <label className="block text-xs font-bold uppercase tracking-wide text-texto-soft">
          Calentamiento
          <input value={dia.calentamiento} onChange={(e) => editarDia('calentamiento', e.target.value)} placeholder="Caminadora 5 min..." className={`mt-1 w-full text-texto ${inputBase}`} />
        </label>

        {/* Activación */}
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-texto-soft">Activación</p>
          <div className="space-y-1.5">
            {(dia.activacion || []).map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={a} onChange={(e) => editarActiv(i, e.target.value)} className={`w-full text-texto ${inputBase}`} />
                <button onClick={() => borrarActiv(i)} className="shrink-0 text-texto-soft" aria-label="Quitar"><IconTrash className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <button onClick={agregarActiv} className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-marca"><IconPlus className="h-3.5 w-3.5" /> Agregar activación</button>
        </div>
      </div>

      {/* ---- Ejercicios de fuerza ---- */}
      <SeccionEjercicios
        titulo="Ejercicios de fuerza"
        seccion="ejercicios"
        lista={dia.ejercicios}
        onEdit={editarEj}
        onBorrar={borrarEj}
        onAgregar={() => agregarEj('ejercicios')}
        inputBase={inputBase}
      />

      {/* ---- Core ---- */}
      <SeccionEjercicios
        titulo="Core"
        seccion="core"
        lista={dia.core || []}
        onEdit={editarEj}
        onBorrar={borrarEj}
        onAgregar={() => agregarEj('core')}
        inputBase={inputBase}
        conTiempo
      />

      {/* ---- Cardio ---- */}
      <div className="rounded-2xl border border-borde/25 bg-superficie p-4 shadow-suave">
        <div className="flex items-center justify-between">
          <span className="font-bold text-texto">Cardio</span>
          <button onClick={toggleCardio} role="switch" aria-checked={!!dia.cardio} aria-label="Activar cardio" className="active:scale-95">
            <Toggle checked={!!dia.cardio} onColor="bg-cardio-fuerte" />
          </button>
        </div>
        {dia.cardio && (
          <div className="mt-3 space-y-3">
            <input
              value={dia.cardio.nombre}
              onChange={(e) => editarCardio('nombre', e.target.value)}
              className={`w-full text-texto ${inputBase}`}
              placeholder="Caminata inclinada — 20 min"
            />

            <p className="text-xs font-bold uppercase tracking-wide text-texto-soft">Protocolo</p>
            {intervalos.length === 0 && <p className="text-sm text-texto-soft">Sin intervalos.</p>}

            {intervalos.map((t, i) => (
              <div key={i} className="space-y-2 rounded-xl bg-fondo p-3">
                <div className="grid grid-cols-3 gap-2">
                  <label className="text-[11px] font-medium text-texto-soft">
                    Min
                    <input value={t.min ?? ''} onChange={(e) => editarIntervalo(i, 'min', e.target.value)} placeholder="0-5" className={`mt-0.5 w-full text-texto ${inputBase}`} />
                  </label>
                  <label className="text-[11px] font-medium text-texto-soft">
                    Inclinación
                    <input value={t.inclinacion ?? ''} onChange={(e) => editarIntervalo(i, 'inclinacion', e.target.value)} placeholder="5%" className={`mt-0.5 w-full text-texto ${inputBase}`} />
                  </label>
                  <label className="text-[11px] font-medium text-texto-soft">
                    Velocidad
                    <input value={t.velocidad ?? ''} onChange={(e) => editarIntervalo(i, 'velocidad', e.target.value)} placeholder="4.0 km/h" className={`mt-0.5 w-full text-texto ${inputBase}`} />
                  </label>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moverIntervalo(i, -1)}
                      disabled={i === 0}
                      aria-label="Subir intervalo"
                      className="flex h-11 w-11 items-center justify-center rounded-lg text-texto-soft active:bg-superficie-alta disabled:opacity-30"
                    >
                      <IconChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moverIntervalo(i, 1)}
                      disabled={i === intervalos.length - 1}
                      aria-label="Bajar intervalo"
                      className="flex h-11 w-11 items-center justify-center rounded-lg text-texto-soft active:bg-superficie-alta disabled:opacity-30"
                    >
                      <IconChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <button onClick={() => borrarIntervalo(i)} className="flex min-h-[44px] shrink-0 items-center gap-1 px-2 text-[11px] font-semibold text-peligro">
                    <IconTrash className="h-4 w-4" /> Quitar
                  </button>
                </div>
              </div>
            ))}

            <button onClick={agregarIntervalo} className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-marca/50 py-2.5 text-sm font-bold text-marca active:scale-95">
              <IconPlus className="h-4 w-4" /> Agregar intervalo
            </button>
          </div>
        )}
      </div>

      {/* Eliminar día */}
      {dias.length > 1 && (
        <button onClick={eliminarDia} className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-peligro/40 py-2.5 text-sm font-bold text-peligro active:scale-95">
          <IconTrash className="h-4 w-4" /> Eliminar este día
        </button>
      )}

      {/* ---- Compartir / Importar rutina (JSON) ---- */}
      <div className="space-y-2 rounded-2xl border border-borde/25 bg-superficie p-4 shadow-suave">
        <h2 className="font-bold tracking-tight text-texto">Compartir / Importar plan</h2>
        <p className="text-xs text-texto-soft">Exporta la rutina para enviársela al coach o a una IA, y pega de vuelta la versión que te devuelvan.</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setPanel(panel === 'export' ? null : 'export')} className="flex items-center justify-center gap-1.5 rounded-xl bg-marca py-2.5 text-sm font-bold text-contraste active:scale-95">
            <IconDownload className="h-4 w-4" /> Exportar
          </button>
          <button onClick={() => setPanel(panel === 'import' ? null : 'import')} className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-borde/25 py-2.5 text-sm font-bold text-texto active:scale-95">
            <IconUpload className="h-4 w-4" /> Importar
          </button>
        </div>

        {panel === 'export' && (
          <div className="space-y-2 pt-1">
            <textarea readOnly value={exportarRutina} rows={6} className={`w-full font-mono text-[11px] text-texto ${inputBase}`} onFocus={(e) => e.target.select()} />
            <button onClick={copiar} className="w-full rounded-xl bg-completo py-2.5 text-sm font-bold text-contraste active:scale-95">Copiar al portapapeles</button>
          </div>
        )}

        {panel === 'import' && (
          <div className="space-y-2 pt-1">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={6}
              placeholder='Pega aquí el JSON de la rutina…'
              className={`w-full font-mono text-[11px] text-texto ${inputBase}`}
            />
            <button onClick={aplicarImport} disabled={!importText.trim()} className="w-full rounded-xl bg-marca py-2.5 text-sm font-bold text-contraste active:scale-95 disabled:opacity-50">
              Importar y reemplazar rutina
            </button>
            <p className="text-[11px] text-texto-soft">Reemplaza toda la rutina. Tus sesiones del historial no se tocan.</p>
          </div>
        )}
      </div>

      <button onClick={resetear} className="w-full rounded-xl py-2 text-sm font-semibold text-texto-soft">Restaurar rutina original</button>
    </div>
  )
}

// --- Sección reutilizable de lista de ejercicios (fuerza o core) ---
function SeccionEjercicios({ titulo, seccion, lista, onEdit, onBorrar, onAgregar, inputBase, conTiempo }) {
  return (
    <div className="space-y-3 rounded-2xl border border-borde/25 bg-superficie p-4 shadow-suave">
      <h2 className="text-xs font-bold uppercase tracking-wide text-texto-soft">{titulo}</h2>
      {lista.length === 0 && <p className="text-sm text-texto-soft">Sin ejercicios.</p>}
      {lista.map((ej, idx) => (
        <div key={idx} className="space-y-2 rounded-xl bg-fondo p-3">
          <input value={ej.nombre} onChange={(e) => onEdit(seccion, idx, 'nombre', e.target.value)} className={`w-full font-semibold text-texto ${inputBase}`} />
          <div className="grid grid-cols-3 gap-2">
            <label className="text-[11px] font-medium text-texto-soft">
              Series
              <input type="number" value={ej.series} onChange={(e) => onEdit(seccion, idx, 'series', Number(e.target.value))} className={`mt-0.5 w-full text-texto ${inputBase}`} />
            </label>
            <label className="text-[11px] font-medium text-texto-soft">
              Reps
              <input value={ej.reps} onChange={(e) => onEdit(seccion, idx, 'reps', e.target.value)} className={`mt-0.5 w-full text-texto ${inputBase}`} />
            </label>
            <label className="text-[11px] font-medium text-texto-soft">
              Descanso (s)
              <input type="number" value={ej.descanso} onChange={(e) => onEdit(seccion, idx, 'descanso', Number(e.target.value))} className={`mt-0.5 w-full text-texto ${inputBase}`} />
            </label>
          </div>
          {/* Etiquetas ARRIBA del control (no al lado): con la etiqueta en línea,
              Grupo + Registro + Quitar no entran en 360px y "Quitar" se salía de
              la pantalla. Apiladas, los selects se encogen (min-w-0 flex-1) y el
              botón conserva sus 44px. Mismo idioma que Series/Reps/Descanso. */}
          <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1 text-[11px] font-medium text-texto-soft">
              Grupo
              <select value={ej.grupo} onChange={(e) => onEdit(seccion, idx, 'grupo', e.target.value)} className={`mt-0.5 w-full text-texto ${inputBase}`}>
                {GRUPOS.map((g) => (
                  <option key={g} value={g}>{GRUPO_LABEL[g]}</option>
                ))}
              </select>
            </label>
            {conTiempo && (
              <label className="min-w-0 flex-1 text-[11px] font-medium text-texto-soft">
                Registro
                <select value={ej.tipoReg || 'peso'} onChange={(e) => onEdit(seccion, idx, 'tipoReg', e.target.value)} className={`mt-0.5 w-full text-texto ${inputBase}`}>
                  <option value="peso">Peso/Reps</option>
                  <option value="tiempo">Tiempo (seg)</option>
                </select>
              </label>
            )}
            <button onClick={() => onBorrar(seccion, idx)} className="flex min-h-[44px] shrink-0 items-center gap-1 px-2 text-[11px] font-semibold text-peligro">
              <IconTrash className="h-4 w-4" /> Quitar
            </button>
          </div>
        </div>
      ))}
      <button onClick={onAgregar} className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-marca/50 py-2.5 text-sm font-bold text-marca active:scale-95">
        <IconPlus className="h-4 w-4" /> Agregar ejercicio
      </button>
    </div>
  )
}
