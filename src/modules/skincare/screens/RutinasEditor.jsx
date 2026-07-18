// ============================================================
//  EDITOR DE RUTINAS DE SKINCARE  (totalmente editable)
// ============================================================
// Espejo de modules/nutricion/screens/PlanEditor.jsx y del editor de rutina del
// gym: mismos patrones, mismas palabras, mismas afordancias. Editar rutinas de
// skincare y editar un plan son la misma tarea, así que no se inventa un
// segundo idioma para hacerla.
//
// Permite: crear/renombrar/eliminar rutinas, elegir a qué días aplica cada una,
// agregar/editar/reordenar/quitar pasos, con descripción y tiempo de espera por
// paso; e IMPORTAR las rutinas como JSON (la versión que una IA devuelve a
// partir del reporte). No hay exportar/compartir: se quitó de los otros
// editores y este los acompaña.

import React, { useState } from 'react'
import {
  DIAS_SEMANA,
  DIA_CORTO,
  rutinaVacia,
  pasoVacio,
  validarRutinas
} from '../data/rutinas.js'
import { getRutinas, saveRutinas, resetRutinas } from '../lib/storage.js'
import {
  IconChevronLeft,
  IconPlus,
  IconTrash,
  IconUpload
} from '../../../core/components/icons.jsx'

// La espera se guarda SIEMPRE en segundos; la unidad de entrada (min o seg) es
// una afordancia del editor, elegible por paso. Se convierte al guardar, así
// que renombrar la unidad no migra nada y el cronómetro consume segundos
// directos. Se admite decimal en minutos para casos cortos (1.5 min = 90 seg).
const aSegundos = (valor, unidad) => {
  const n = Number(valor)
  if (!(n > 0)) return 0
  return unidad === 'min' ? Math.round(n * 60) : Math.round(n)
}
const desdeSegundos = (segundos, unidad) => {
  if (!(segundos > 0)) return ''
  return unidad === 'min' ? String(Math.round((segundos / 60) * 100) / 100) : String(segundos)
}
// Unidad por defecto para MOSTRAR una espera guardada: minutos si es un número
// entero de minutos (o no hay espera), segundos si no (p. ej. 90 seg).
const unidadPorDefecto = (segundos) => (segundos && segundos % 60 !== 0 ? 'seg' : 'min')

export default function RutinasEditor({ onSalir }) {
  const [datos, setDatos] = useState(() => getRutinas())
  const [rutSel, setRutSel] = useState(() => getRutinas().rutinas[0]?.id || null)
  const [panel, setPanel] = useState(null) // 'import' | null
  const [importText, setImportText] = useState('')
  // Unidad de entrada elegida por paso (min | seg). Override sobre el valor
  // derivado de los segundos guardados: solo afecta la ENTRADA, no lo guardado.
  const [unidades, setUnidades] = useState({})

  const rutinas = datos.rutinas
  const rutina = rutinas.find((r) => r.id === rutSel) || rutinas[0]

  // Persiste en cada cambio, como los otros editores.
  const persistir = (nuevo) => {
    setDatos(nuevo)
    saveRutinas(nuevo)
  }

  // ---- edición de la rutina seleccionada ----
  const editarRutina = (campo, valor) =>
    persistir({ ...datos, rutinas: rutinas.map((r) => (r.id === rutina.id ? { ...r, [campo]: valor } : r)) })

  const alternarDia = (dia) => {
    const dias = rutina.dias.includes(dia)
      ? rutina.dias.filter((d) => d !== dia)
      : [...rutina.dias, dia]
    // Se guarda en el orden canónico de la semana, no en el orden de toque.
    editarRutina('dias', DIAS_SEMANA.filter((d) => dias.includes(d)))
  }

  const agregarRutina = () => {
    const nueva = rutinaVacia()
    persistir({ ...datos, rutinas: [...rutinas, nueva] })
    setRutSel(nueva.id)
  }
  const eliminarRutina = () => {
    if (rutinas.length <= 1) return
    if (!confirm(`¿Eliminar "${rutina.nombre}"? No borra los registros ya guardados.`)) return
    const resto = rutinas.filter((r) => r.id !== rutina.id)
    persistir({ ...datos, rutinas: resto })
    setRutSel(resto[0].id)
  }

  // ---- pasos ----
  const setPasos = (pasos) => editarRutina('pasos', pasos)
  const editarPaso = (idx, campo, valor) =>
    setPasos(rutina.pasos.map((p, i) => (i === idx ? { ...p, [campo]: valor } : p)))
  const borrarPaso = (idx) => setPasos(rutina.pasos.filter((_, i) => i !== idx))
  const agregarPaso = () => setPasos([...rutina.pasos, pasoVacio()])
  const moverPaso = (idx, delta) => {
    const destino = idx + delta
    if (destino < 0 || destino >= rutina.pasos.length) return
    const lista = [...rutina.pasos]
    ;[lista[idx], lista[destino]] = [lista[destino], lista[idx]]
    setPasos(lista)
  }
  // La unidad de entrada del paso (override o valor derivado de lo guardado).
  const unidadDe = (p) => unidades[p.id] || unidadPorDefecto(p.espera)
  const cambiarUnidad = (p, unidad) => setUnidades((u) => ({ ...u, [p.id]: unidad }))

  // Vaciar la espera la quita (undefined), no la pone en 0. El valor se
  // interpreta según la unidad elegida y se guarda en segundos.
  const editarEspera = (idx, valor, unidad) => {
    const seg = aSegundos(valor, unidad)
    setPasos(rutina.pasos.map((p, i) => {
      if (i !== idx) return p
      const { espera, ...resto } = p
      return seg > 0 ? { ...resto, espera: seg } : resto
    }))
  }
  // Vaciar la descripción la quita (undefined), no la deja como cadena vacía.
  const editarDescripcion = (idx, texto) => {
    setPasos(rutina.pasos.map((p, i) => {
      if (i !== idx) return p
      const { descripcion, ...resto } = p
      return texto.trim() ? { ...resto, descripcion: texto } : resto
    }))
  }

  // ---- import JSON ----
  // Solo la vuelta: el reporte se copia desde Reporte ("Copiar reporte para
  // IA"); una IA devuelve las rutinas ajustadas y se pegan acá. La ida no vive
  // en este editor.
  const aplicarImport = () => {
    try {
      const limpio = validarRutinas(JSON.parse(importText))
      persistir(limpio)
      setRutSel(limpio.rutinas[0].id)
      setImportText('')
      setPanel(null)
      alert('Rutinas importadas y guardadas.')
    } catch (e) {
      alert('JSON inválido: ' + e.message)
    }
  }

  const resetear = () => {
    if (!confirm('¿Restaurar las rutinas originales? Perderás tus cambios (no tus registros).')) return
    const def = resetRutinas()
    setDatos(def)
    setRutSel(def.rutinas[0].id)
  }

  const inputBase = 'rounded-lg border border-borde/25 bg-fondo p-2 text-sm outline-none focus:border-marca'

  return (
    <div className="animate-in space-y-4 p-4 pb-28">
      <header className="flex items-center gap-2 pt-2">
        <button onClick={onSalir} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-texto-soft active:bg-superficie-alta" aria-label="Volver">
          <IconChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 text-2xl font-extrabold tracking-tight text-texto">Editar skincare</h1>
      </header>

      {/* Tabs de rutinas + agregar rutina */}
      <div className="flex flex-wrap gap-2">
        {rutinas.map((r) => (
          <button
            key={r.id}
            onClick={() => setRutSel(r.id)}
            className={`min-h-[44px] max-w-[10rem] truncate rounded-xl px-3 text-sm font-bold transition-colors ${
              rutina.id === r.id ? 'bg-marca-fuerte text-contraste-fuerte shadow-flotante' : 'bg-superficie-alta text-texto-soft'
            }`}
          >
            {r.nombre}
          </button>
        ))}
        <button onClick={agregarRutina} className="flex min-h-[44px] items-center gap-1 rounded-xl border-2 border-dashed border-marca px-3 text-sm font-bold text-marca active:scale-95">
          <IconPlus className="h-4 w-4" /> Rutina
        </button>
      </div>

      {/* ---- Rutina seleccionada ---- */}
      <div className="space-y-4 rounded-2xl border border-borde/25 bg-superficie p-4 shadow-suave">
        <label className="block text-xs font-bold uppercase tracking-wide text-texto-soft">
          Nombre de la rutina
          <input value={rutina.nombre} onChange={(e) => editarRutina('nombre', e.target.value)} className={`mt-1 w-full font-semibold text-texto ${inputBase}`} />
        </label>

        {/* Días en los que aplica: chips que se prenden y apagan. */}
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-texto-soft">Días en los que aplica</p>
          <div className="flex flex-wrap gap-1.5">
            {DIAS_SEMANA.map((d) => {
              const activo = rutina.dias.includes(d)
              return (
                <button
                  key={d}
                  onClick={() => alternarDia(d)}
                  role="switch"
                  aria-checked={activo}
                  aria-label={d}
                  className={`flex h-11 min-w-[3rem] flex-1 items-center justify-center rounded-xl text-xs font-bold transition-colors ${
                    activo ? 'bg-marca-fuerte text-contraste-fuerte' : 'bg-superficie-alta text-texto-soft'
                  }`}
                >
                  {DIA_CORTO[d]}
                </button>
              )
            })}
          </div>
          {rutina.dias.length === 0 && (
            <p className="mt-1.5 text-[11px] font-semibold text-texto-soft">
              Sin días asignados esta rutina no aparece en ningún día.
            </p>
          )}
        </div>
      </div>

      {/* ---- Pasos ---- */}
      <div className="space-y-3 rounded-2xl border border-borde/25 bg-superficie p-4 shadow-suave">
        <h2 className="text-xs font-bold uppercase tracking-wide text-texto-soft">Pasos</h2>
        {rutina.pasos.length === 0 && <p className="text-sm text-texto-soft">Sin pasos.</p>}
        {rutina.pasos.map((p, idx) => (
          <div key={p.id} className="space-y-2 rounded-xl bg-fondo p-3">
            <div className="flex items-center gap-2">
              <input value={p.nombre} onChange={(e) => editarPaso(idx, 'nombre', e.target.value)} className={`w-full font-semibold text-texto ${inputBase}`} />
              <button onClick={() => moverPaso(idx, -1)} disabled={idx === 0} className="flex h-11 w-8 shrink-0 items-center justify-center text-texto-soft disabled:opacity-30" aria-label="Subir">↑</button>
              <button onClick={() => moverPaso(idx, 1)} disabled={idx === rutina.pasos.length - 1} className="flex h-11 w-8 shrink-0 items-center justify-center text-texto-soft disabled:opacity-30" aria-label="Bajar">↓</button>
            </div>

            <label className="block text-[11px] font-medium text-texto-soft">
              Descripción (opcional)
              <input value={p.descripcion || ''} onChange={(e) => editarDescripcion(idx, e.target.value)} placeholder="Ej. Aplica sobre piel seca" className={`mt-0.5 w-full text-texto ${inputBase}`} />
            </label>

            <div className="flex items-end justify-between gap-2">
              {/* Espera opcional: número + interruptor de unidad (min/seg), para
                  escribir "12" + min o "30" + seg sin hacer cuentas. Se guarda
                  en segundos. */}
              <div className="min-w-0">
                <p className="mb-0.5 text-[11px] font-medium text-texto-soft">Espera después (opcional)</p>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    inputMode={unidadDe(p) === 'min' ? 'decimal' : 'numeric'}
                    step={unidadDe(p) === 'min' ? '0.5' : '5'}
                    min="0"
                    value={desdeSegundos(p.espera, unidadDe(p))}
                    onChange={(e) => editarEspera(idx, e.target.value, unidadDe(p))}
                    placeholder="0"
                    aria-label="Tiempo de espera"
                    className={`h-11 w-20 shrink-0 text-texto ${inputBase}`}
                  />
                  <div className="flex h-11 shrink-0 overflow-hidden rounded-lg border border-borde/25" role="group" aria-label="Unidad de espera">
                    {['min', 'seg'].map((u) => (
                      <button
                        key={u}
                        onClick={() => cambiarUnidad(p, u)}
                        aria-pressed={unidadDe(p) === u}
                        className={`px-3 text-xs font-bold transition-colors ${
                          unidadDe(p) === u ? 'bg-marca-fuerte text-contraste-fuerte' : 'bg-fondo text-texto-soft'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={() => borrarPaso(idx)} className="-mx-2 flex min-h-[44px] shrink-0 items-center gap-1 px-2 text-[11px] font-semibold text-peligro">
                <IconTrash className="h-4 w-4" /> Quitar
              </button>
            </div>
          </div>
        ))}
        <button onClick={agregarPaso} className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-marca/50 text-sm font-bold text-marca active:scale-95">
          <IconPlus className="h-4 w-4" /> Agregar paso
        </button>
      </div>

      {/* ---- Eliminar rutina ---- */}
      {rutinas.length > 1 && (
        <button onClick={eliminarRutina} className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-peligro/40 py-2.5 text-sm font-bold text-peligro active:scale-95">
          <IconTrash className="h-4 w-4" /> Eliminar esta rutina
        </button>
      )}

      {/* ---- Importar rutinas (JSON) ---- */}
      <div className="space-y-2 rounded-2xl border border-borde/25 bg-superficie p-4 shadow-suave">
        <h2 className="font-bold tracking-tight text-texto">Importar rutinas</h2>
        <p className="text-xs text-texto-soft">Pega el JSON de las rutinas que te devuelva una IA para reemplazar las actuales.</p>
        <button onClick={() => setPanel(panel === 'import' ? null : 'import')} className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border-2 border-borde/25 text-sm font-bold text-texto active:scale-95">
          <IconUpload className="h-4 w-4" /> Importar
        </button>

        {panel === 'import' && (
          <div className="space-y-2 pt-1">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={6}
              placeholder="Pega aquí el JSON de las rutinas…"
              className={`w-full font-mono text-[11px] text-texto ${inputBase}`}
            />
            <button onClick={aplicarImport} disabled={!importText.trim()} className="min-h-[44px] w-full rounded-xl bg-marca-fuerte text-sm font-bold text-contraste-fuerte active:scale-95 disabled:opacity-50">
              Importar y reemplazar rutinas
            </button>
            <p className="text-[11px] text-texto-soft">Reemplaza todas las rutinas. Tus registros diarios no se tocan.</p>
          </div>
        )}
      </div>

      <button onClick={resetear} className="min-h-[44px] w-full rounded-xl text-sm font-semibold text-texto-soft">Restaurar rutinas originales</button>
    </div>
  )
}
