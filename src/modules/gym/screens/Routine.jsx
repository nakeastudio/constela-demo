// ============================================================
//  EDITOR DE RUTINA  (totalmente editable)
// ============================================================
// Permite: renombrar días, agregar/quitar días, editar calentamiento,
// activación, ejercicios de fuerza y core (con series de aproximación),
// prender/apagar cardio, e IMPORTAR la rutina como JSON (la versión que el
// coach o una IA devuelven a partir del reporte que se copia desde Report).
import React, { useState } from 'react'
import { GRUPO_LABEL, clavesDia, siguienteClaveDia, diaVacio, cardioVacio, validarRutina } from '../data/rutina.js'
import { saveRutina, resetRutina } from '../lib/storage.js'
import { IconChevronLeft, IconChevronUp, IconChevronDown, IconPlus, IconTrash, IconUpload } from '../../../core/components/icons.jsx'
import { confirmar, avisar } from '../../../core/components/Hoja.jsx'
import Toggle from '../../../core/components/Toggle.jsx'
import SelectorEjercicio from '../components/SelectorEjercicio.jsx'

const GRUPOS = Object.keys(GRUPO_LABEL)

// --- reps: rango numérico sin escribir el guion ---
// Las reps son un STRING y se guardan como STRING (ExerciseCard muestra
// repsObjetivo, los validadores hacen String): esto es un cambio de AFORDANCIA
// de entrada, no de esquema. No hay migración; las rutinas viejas y el JSON
// pegado siguen entrando igual.
//
// El caso común es un rango (`6-8`, `10-12`) → dos campos numéricos, sin teclear
// el `-` (que en el celular forzaba cambiar de teclado). Pero las reps también
// llevan cualificadores (`c/pierna`, `c/lado`, `seg`) y valores sueltos
// (`AMRAP`, un número solo), y eso NO se pierde: va en un tercer campo de texto.
//
// Un solo parser cubre todo: mín opcional, máx opcional (tras `-`), y el resto
// como cualificador. `AMRAP` → sin números, cualificador "AMRAP". `30-45 seg` →
// 30, 45, "seg". `8-10 c/pierna` → 8, 10, "c/pierna". `12` → 12, "", "".
function parsearReps(reps) {
  const m = String(reps ?? '').trim().match(/^(\d+)?\s*(?:-\s*(\d+))?\s*(.*?)\s*$/)
  return { min: m?.[1] ?? '', max: m?.[2] ?? '', cualif: (m?.[3] ?? '').trim() }
}

function componerReps(min, max, cualif) {
  const rango = min && max ? `${min}-${max}` : (min || '')
  return [rango, (cualif || '').trim()].filter(Boolean).join(' ')
}

export default function Routine({ rutina, onChange, onSalir }) {
  const [r, setR] = useState(rutina)
  const [diaSel, setDiaSel] = useState(clavesDia(rutina)[0])
  const [panel, setPanel] = useState(null) // 'import' | null
  const [importText, setImportText] = useState('')
  const [selector, setSelector] = useState(null) // 'ejercicios' | 'core' | null

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
  // El nombre y el grupo llegan del selector — del catálogo o del alta a mano —
  // y nunca se tipean sueltos acá. Los récords se guardan por nombre, así que un
  // "Nuevo ejercicio" tipeado a mano cada vez partía el historial; y el grupo
  // decide el volumen semanal. El resto son los defaults de siempre: series,
  // reps y descanso se ajustan abajo, en los campos normales del editor.
  // `media_id` solo viene si se eligió del catálogo, y se omite si no: un
  // ejercicio cargado a mano no tiene imagen y no se le inventa una. La sesión
  // lo lee para mostrar la imagen mientras se entrena; se guarda el id, nunca la
  // URL armada.
  const agregarEj = (seccion, { nombre, grupo, media_id }) => {
    const base = {
      nombre,
      series: 3,
      reps: '10-12',
      descanso: 60,
      grupo,
      ...(media_id ? { media_id } : {})
    }
    persistir({ ...r, [diaSel]: { ...dia, [seccion]: [...(dia[seccion] || []), base] } })
    setSelector(null)
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
  const eliminarDia = async () => {
    if (dias.length <= 1) return
    const ok = await confirmar({
      titulo: `¿Eliminar "${dia.nombre}"?`,
      cuerpo: 'No borra sesiones ya registradas.',
      accion: 'Eliminar',
      peligro: true
    })
    if (!ok) return
    const nuevo = { ...r }
    delete nuevo[diaSel]
    persistir(nuevo)
    setDiaSel(clavesDia(nuevo)[0])
  }

  // ---- import JSON ----
  // Solo la vuelta: el reporte se copia desde Report.jsx ("Copiar reporte para
  // IA"); una IA devuelve la rutina ajustada y se pega acá. La ida no vive en
  // este editor.
  const aplicarImport = () => {
    try {
      const obj = JSON.parse(importText)
      const limpia = validarRutina(obj)
      persistir(limpia)
      setDiaSel(clavesDia(limpia)[0])
      setImportText('')
      setPanel(null)
      avisar({ titulo: 'Rutina importada', mensaje: 'Los cambios quedaron guardados.', tono: 'ok' })
    } catch (e) {
      avisar({ titulo: 'No se pudo importar', mensaje: 'El texto no es un JSON válido: ' + e.message })
    }
  }

  const resetear = async () => {
    const ok = await confirmar({
      titulo: '¿Restaurar la rutina original?',
      cuerpo: 'Perderás tus cambios al plan (no tus sesiones).',
      accion: 'Restaurar'
    })
    if (!ok) return
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
              diaSel === k ? 'bg-marca-fuerte text-contraste-fuerte shadow-flotante' : 'bg-superficie-alta text-texto-soft'
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
        onAgregar={() => setSelector('ejercicios')}
        inputBase={inputBase}
      />

      {/* ---- Core ---- */}
      <SeccionEjercicios
        titulo="Core"
        seccion="core"
        lista={dia.core || []}
        onEdit={editarEj}
        onBorrar={borrarEj}
        onAgregar={() => setSelector('core')}
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

      {/* ---- Importar rutina (JSON) ---- */}
      {/* Solo la vuelta: el reporte se copia desde Report ("Copiar reporte para
          IA"), la IA devuelve la rutina ajustada y se pega acá. */}
      <div className="space-y-2 rounded-2xl border border-borde/25 bg-superficie p-4 shadow-suave">
        <h2 className="font-bold tracking-tight text-texto">Importar rutina</h2>
        <p className="text-xs text-texto-soft">Pega el JSON de la rutina que te devuelva el coach o la IA para reemplazar la actual.</p>
        <button onClick={() => setPanel(panel === 'import' ? null : 'import')} className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-borde/25 py-2.5 text-sm font-bold text-texto active:scale-95">
          <IconUpload className="h-4 w-4" /> Importar
        </button>

        {panel === 'import' && (
          <div className="space-y-2 pt-1">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={6}
              placeholder='Pega aquí el JSON de la rutina…'
              className={`w-full font-mono text-[11px] text-texto ${inputBase}`}
            />
            <button onClick={aplicarImport} disabled={!importText.trim()} className="w-full rounded-xl bg-marca-fuerte py-2.5 text-sm font-bold text-contraste-fuerte active:scale-95 disabled:opacity-50">
              Importar y reemplazar rutina
            </button>
            <p className="text-[11px] text-texto-soft">Reemplaza toda la rutina. Tus sesiones del historial no se tocan.</p>
          </div>
        )}
      </div>

      <button onClick={resetear} className="w-full rounded-xl py-2 text-sm font-semibold text-texto-soft">Restaurar rutina original</button>

      {/* Selector de ejercicio: mismo componente para fuerza y para core. La
          sección solo define el filtro con el que arranca; el grupo lo decide
          el catálogo. */}
      {selector && (
        <SelectorEjercicio
          seccion={selector}
          onElegir={(ej) => agregarEj(selector, ej)}
          onCerrar={() => setSelector(null)}
        />
      )}
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
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] font-medium text-texto-soft">
              Series
              <input type="number" value={ej.series} onChange={(e) => onEdit(seccion, idx, 'series', Number(e.target.value))} className={`mt-0.5 w-full text-texto ${inputBase}`} />
            </label>
            <label className="text-[11px] font-medium text-texto-soft">
              Descanso (s)
              <input type="number" value={ej.descanso} onChange={(e) => onEdit(seccion, idx, 'descanso', Number(e.target.value))} className={`mt-0.5 w-full text-texto ${inputBase}`} />
            </label>
          </div>
          {/* Reps: rango sin teclear el guion (ver CamposReps). */}
          <CamposReps value={ej.reps} onChange={(v) => onEdit(seccion, idx, 'reps', v)} inputBase={inputBase} />
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
          {/* Series de aproximación: INSTRUCCIONES (calentamiento progresivo),
              no registro. La sesión las lee del plan y nunca las cuenta como
              volumen ni PR. Opcional: la mayoría no tiene y no se fuerza una
              caja vacía — solo queda el botón de agregar. */}
          <CamposAprox
            lista={ej.aprox || []}
            onChange={(arr) => onEdit(seccion, idx, 'aprox', arr.length ? arr : undefined)}
            inputBase={inputBase}
          />
        </div>
      ))}
      <button onClick={onAgregar} className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-marca/50 py-2.5 text-sm font-bold text-marca active:scale-95">
        <IconPlus className="h-4 w-4" /> Agregar ejercicio
      </button>
    </div>
  )
}

// --- Reps: dos campos numéricos (mín/máx) + un texto para el cualificador ---
// El rango se arma solo al unir mín y máx: no hay que teclear el guion. El
// tercer campo conserva lo que un rango no expresa (`c/pierna`, `seg`, `AMRAP`,
// un número suelto). Parsea desde el string guardado y vuelve a componer uno,
// así que `6-8`, `8-10 c/pierna`, `30-45 seg`, `15-20` cargan y guardan idénticos.
function CamposReps({ value, onChange, inputBase }) {
  const { min, max, cualif } = parsearReps(value)
  const set = (campo, v) => {
    const next = { min, max, cualif, [campo]: v }
    onChange(componerReps(next.min, next.max, next.cualif))
  }
  return (
    <div>
      <p className="mb-0.5 text-[11px] font-medium text-texto-soft">Reps (objetivo)</p>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          inputMode="numeric"
          min="0"
          value={min}
          onChange={(e) => set('min', e.target.value)}
          placeholder="mín"
          aria-label="Reps mínimas"
          className={`w-14 shrink-0 text-center text-texto ${inputBase}`}
        />
        <span aria-hidden="true" className="shrink-0 font-bold text-texto-soft">–</span>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          value={max}
          onChange={(e) => set('max', e.target.value)}
          placeholder="máx"
          aria-label="Reps máximas"
          className={`w-14 shrink-0 text-center text-texto ${inputBase}`}
        />
        <input
          value={cualif}
          onChange={(e) => set('cualif', e.target.value)}
          placeholder="c/pierna, seg…"
          aria-label="Detalle de reps (opcional)"
          className={`min-w-0 flex-1 text-texto ${inputBase}`}
        />
      </div>
    </div>
  )
}

// --- Series de aproximación (opcional, por ejercicio) ---
// Lista de strings libres (`1×10 al 50%`). Ausente NO pinta caja: solo el botón
// de agregar, igual que la activación del día. Al quitar la última, la lista se
// vacía y el padre la vuelve a `undefined` (ausente-ausente, ver onChange).
function CamposAprox({ lista, onChange, inputBase }) {
  const editar = (i, v) => onChange(lista.map((x, j) => (j === i ? v : x)))
  const agregar = () => onChange([...lista, ''])
  const quitar = (i) => onChange(lista.filter((_, j) => j !== i))
  return (
    <div>
      {lista.length > 0 && (
        <>
          <p className="mb-1 text-[11px] font-medium text-texto-soft">Series de aproximación</p>
          <div className="space-y-1.5">
            {lista.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={a}
                  onChange={(e) => editar(i, e.target.value)}
                  placeholder="1×10 al 50%"
                  aria-label={`Aproximación ${i + 1}`}
                  className={`w-full text-texto ${inputBase}`}
                />
                <button onClick={() => quitar(i)} className="flex h-11 w-8 shrink-0 items-center justify-center text-texto-soft" aria-label="Quitar aproximación">
                  <IconTrash className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      <button onClick={agregar} className="mt-1.5 flex min-h-[44px] items-center gap-1 text-xs font-semibold text-marca">
        <IconPlus className="h-3.5 w-3.5" /> Agregar aproximación
      </button>
    </div>
  )
}
