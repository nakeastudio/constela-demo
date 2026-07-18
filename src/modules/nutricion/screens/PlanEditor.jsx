// ============================================================
//  EDITOR DE PLAN  (totalmente editable)
// ============================================================
// Espejo de modules/gym/screens/Routine.jsx: mismos patrones, mismas palabras
// y mismas afordancias. Editar un plan y editar una rutina son la misma tarea,
// así que no se inventa un segundo idioma para hacerla.
//
// Permite: renombrar días y cambiar su tipo, editar objetivos, agregar/quitar/
// mover/renombrar comidas, editar suplementos, la tabla de canje de carbos,
// los objetivos de agua y las reglas; e IMPORTAR el plan como JSON (la versión
// que el nutricionista o una IA devuelven a partir del reporte que se copia
// desde Report).
import React, { useState } from 'react'
import {
  DIAS_SEMANA,
  TIPOS_DIA,
  CATEGORIAS,
  comidaVacia,
  suplementoVacio,
  carboVacio,
  diaVacio,
  validarPlan
} from '../data/plan.js'
import { getPlan, savePlan, resetPlan } from '../lib/storage.js'
import { IconChevronLeft, IconPlus, IconTrash, IconUpload } from '../../../core/components/icons.jsx'

const TIPOS = Object.keys(TIPOS_DIA)
const CATS = Object.keys(CATEGORIAS)
const ETIQUETA_CORTA = { lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom' }

export default function PlanEditor({ onSalir }) {
  const [p, setP] = useState(() => getPlan())
  const [diaSel, setDiaSel] = useState(() => DIAS_SEMANA.find((k) => getPlan().dias[k]) || 'lunes')
  const [panel, setPanel] = useState(null) // 'import' | null
  const [importText, setImportText] = useState('')

  const dias = DIAS_SEMANA.filter((k) => p.dias[k])
  const dia = p.dias[diaSel] || p.dias[dias[0]]

  // Persiste en cada cambio, como el editor de rutina.
  const persistir = (nuevo) => {
    setP(nuevo)
    savePlan(nuevo)
  }

  // ---- edición del día ----
  const editarDia = (campo, valor) =>
    persistir({ ...p, dias: { ...p.dias, [diaSel]: { ...dia, [campo]: valor } } })

  const editarObjetivo = (campo, valor) =>
    editarDia('objetivos', { ...dia.objetivos, [campo]: Number(valor) || 0 })

  const agregarDia = () => {
    const libre = DIAS_SEMANA.find((k) => !p.dias[k])
    if (!libre) return
    persistir({ ...p, dias: { ...p.dias, [libre]: diaVacio(libre[0].toUpperCase() + libre.slice(1)) } })
    setDiaSel(libre)
  }
  const eliminarDia = () => {
    if (dias.length <= 1) return
    if (!confirm(`¿Eliminar "${dia.nombre}"? No borra los registros ya guardados.`)) return
    const nuevos = { ...p.dias }
    delete nuevos[diaSel]
    persistir({ ...p, dias: nuevos })
    setDiaSel(DIAS_SEMANA.find((k) => nuevos[k]))
  }

  // ---- comidas ----
  const editarComida = (idx, campo, valor) => {
    const lista = dia.comidas.map((c, i) => (i === idx ? { ...c, [campo]: valor } : c))
    editarDia('comidas', lista)
  }
  const borrarComida = (idx) => editarDia('comidas', dia.comidas.filter((_, i) => i !== idx))
  const agregarComida = () => editarDia('comidas', [...dia.comidas, comidaVacia()])
  const moverComida = (idx, delta) => {
    const destino = idx + delta
    if (destino < 0 || destino >= dia.comidas.length) return
    const lista = [...dia.comidas]
    ;[lista[idx], lista[destino]] = [lista[destino], lista[idx]]
    editarDia('comidas', lista)
  }
  const editarItem = (cIdx, iIdx, valor) => {
    const items = dia.comidas[cIdx].items.map((x, i) => (i === iIdx ? valor : x))
    editarComida(cIdx, 'items', items)
  }
  const agregarItem = (cIdx) => editarComida(cIdx, 'items', [...dia.comidas[cIdx].items, 'Nuevo ítem'])
  const borrarItem = (cIdx, iIdx) =>
    editarComida(cIdx, 'items', dia.comidas[cIdx].items.filter((_, i) => i !== iIdx))

  // ---- listas globales del plan ----
  const editarLista = (clave, idx, campo, valor) =>
    persistir({ ...p, [clave]: p[clave].map((x, i) => (i === idx ? { ...x, [campo]: valor } : x)) })
  const borrarDeLista = (clave, idx) => persistir({ ...p, [clave]: p[clave].filter((_, i) => i !== idx) })
  const agregarALista = (clave, item) => persistir({ ...p, [clave]: [...p[clave], item] })

  const editarRegla = (idx, valor) => persistir({ ...p, reglas: p.reglas.map((x, i) => (i === idx ? valor : x)) })
  const agregarRegla = () => persistir({ ...p, reglas: [...p.reglas, 'Nueva regla'] })
  const borrarRegla = (idx) => persistir({ ...p, reglas: p.reglas.filter((_, i) => i !== idx) })

  const editarAgua = (campo, valor) => persistir({ ...p, agua: { ...p.agua, [campo]: Number(valor) || 0 } })

  // ---- import JSON ----
  // Solo la vuelta: el reporte se copia desde Report ("Copiar reporte para
  // IA"); una IA devuelve el plan ajustado y se pega acá. La ida no vive en
  // este editor.
  const aplicarImport = () => {
    try {
      const limpio = validarPlan(JSON.parse(importText))
      persistir(limpio)
      setDiaSel(DIAS_SEMANA.find((k) => limpio.dias[k]))
      setImportText('')
      setPanel(null)
      alert('Plan importado y guardado.')
    } catch (e) {
      alert('JSON inválido: ' + e.message)
    }
  }

  const resetear = () => {
    if (!confirm('¿Restaurar el plan original? Perderás tus cambios al plan (no tus registros).')) return
    const def = resetPlan()
    setP(def)
    setDiaSel(DIAS_SEMANA.find((k) => def.dias[k]))
  }

  const inputBase = 'rounded-lg border border-borde/25 bg-fondo p-2 text-sm outline-none focus:border-marca'

  return (
    <div className="animate-in space-y-4 p-4 pb-28">
      <header className="flex items-center gap-2 pt-2">
        <button onClick={onSalir} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-texto-soft active:bg-superficie-alta" aria-label="Volver">
          <IconChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 text-2xl font-extrabold tracking-tight text-texto">Editar plan</h1>
      </header>

      {/* Tabs de días + agregar día */}
      <div className="flex flex-wrap gap-2">
        {dias.map((k) => (
          <button
            key={k}
            onClick={() => setDiaSel(k)}
            className={`min-h-[44px] rounded-xl px-3 text-sm font-bold transition-colors ${
              diaSel === k ? 'bg-marca text-contraste shadow-flotante' : 'bg-superficie-alta text-texto-soft'
            }`}
          >
            {ETIQUETA_CORTA[k]}
          </button>
        ))}
        {dias.length < DIAS_SEMANA.length && (
          <button onClick={agregarDia} className="flex min-h-[44px] items-center gap-1 rounded-xl border-2 border-dashed border-marca px-3 text-sm font-bold text-marca active:scale-95">
            <IconPlus className="h-4 w-4" /> Día
          </button>
        )}
      </div>

      {/* ---- Día seleccionado ---- */}
      <div className="space-y-4 rounded-2xl border border-borde/25 bg-superficie p-4 shadow-suave">
        <label className="block text-xs font-bold uppercase tracking-wide text-texto-soft">
          Nombre del día
          <input value={dia.nombre} onChange={(e) => editarDia('nombre', e.target.value)} className={`mt-1 w-full font-semibold text-texto ${inputBase}`} />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-bold uppercase tracking-wide text-texto-soft">
            Tipo de día
            <select value={dia.tipo} onChange={(e) => editarDia('tipo', e.target.value)} className={`mt-1 h-11 w-full text-texto ${inputBase}`}>
              {TIPOS.map((t) => (
                <option key={t} value={t}>{TIPOS_DIA[t]}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold uppercase tracking-wide text-texto-soft">
            Entreno (opcional)
            <input value={dia.entreno || ''} onChange={(e) => editarDia('entreno', e.target.value || null)} placeholder="Ej. Tren inferior" className={`mt-1 h-11 w-full text-texto ${inputBase}`} />
          </label>
        </div>

        {/* Objetivos */}
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-texto-soft">Objetivos del día</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { c: 'kcal', l: 'Kcal' },
              { c: 'proteina', l: 'Proteína (g)' },
              { c: 'carbos', l: 'Carbos (g)' },
              { c: 'grasa', l: 'Grasa (g)' }
            ].map(({ c, l }) => (
              <label key={c} className="text-[11px] font-medium text-texto-soft">
                {l}
                <input type="number" inputMode="numeric" value={dia.objetivos[c] ?? ''} onChange={(e) => editarObjetivo(c, e.target.value)} className={`mt-0.5 h-11 w-full text-texto ${inputBase}`} />
              </label>
            ))}
          </div>
        </div>

        <label className="block text-xs font-bold uppercase tracking-wide text-texto-soft">
          Nota del día
          <input value={dia.nota || ''} onChange={(e) => editarDia('nota', e.target.value)} placeholder="Ej. Preparar el tupper la noche anterior" className={`mt-1 w-full text-texto ${inputBase}`} />
        </label>
      </div>

      {/* ---- Comidas ---- */}
      <div className="space-y-3 rounded-2xl border border-borde/25 bg-superficie p-4 shadow-suave">
        <h2 className="text-xs font-bold uppercase tracking-wide text-texto-soft">Comidas</h2>
        {dia.comidas.length === 0 && <p className="text-sm text-texto-soft">Sin comidas.</p>}
        {dia.comidas.map((c, idx) => (
          <div key={c.id} className="space-y-2 rounded-xl bg-fondo p-3">
            <div className="flex items-center gap-2">
              <input value={c.titulo} onChange={(e) => editarComida(idx, 'titulo', e.target.value)} className={`w-full font-semibold text-texto ${inputBase}`} />
              <button onClick={() => moverComida(idx, -1)} disabled={idx === 0} className="flex h-11 w-8 shrink-0 items-center justify-center text-texto-soft disabled:opacity-30" aria-label="Subir">↑</button>
              <button onClick={() => moverComida(idx, 1)} disabled={idx === dia.comidas.length - 1} className="flex h-11 w-8 shrink-0 items-center justify-center text-texto-soft disabled:opacity-30" aria-label="Bajar">↓</button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] font-medium text-texto-soft">
                Categoría (color)
                <select value={c.categoria} onChange={(e) => editarComida(idx, 'categoria', e.target.value)} className={`mt-0.5 h-11 w-full text-texto ${inputBase}`}>
                  {CATS.map((k) => (
                    <option key={k} value={k}>{CATEGORIAS[k]}</option>
                  ))}
                </select>
              </label>
              <label className="text-[11px] font-medium text-texto-soft">
                Detalle (opcional)
                <input value={c.detalle || ''} onChange={(e) => editarComida(idx, 'detalle', e.target.value)} placeholder="Ej. Dentro de la primera hora" className={`mt-0.5 h-11 w-full text-texto ${inputBase}`} />
              </label>
            </div>

            {/* Ítems */}
            <div>
              <p className="mb-1 text-[11px] font-medium text-texto-soft">Ítems</p>
              <div className="space-y-1.5">
                {c.items.map((it, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={it} onChange={(e) => editarItem(idx, i, e.target.value)} className={`w-full text-texto ${inputBase}`} />
                    <button onClick={() => borrarItem(idx, i)} className="flex h-11 w-8 shrink-0 items-center justify-center text-texto-soft" aria-label="Quitar ítem"><IconTrash className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => agregarItem(idx)} className="mt-1.5 flex min-h-[44px] items-center gap-1 text-xs font-semibold text-marca"><IconPlus className="h-3.5 w-3.5" /> Agregar ítem</button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-[11px] font-medium text-texto-soft">
                <input type="checkbox" checked={!!c.carbo} onChange={(e) => editarComida(idx, 'carbo', e.target.checked || undefined)} className="h-5 w-5 accent-marca" />
                Pide elegir un carbo
              </label>
              <button onClick={() => borrarComida(idx)} className="-mx-2 flex min-h-[44px] shrink-0 items-center gap-1 px-2 text-[11px] font-semibold text-peligro">
                <IconTrash className="h-4 w-4" /> Quitar
              </button>
            </div>
          </div>
        ))}
        <button onClick={agregarComida} className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-marca/50 text-sm font-bold text-marca active:scale-95">
          <IconPlus className="h-4 w-4" /> Agregar comida
        </button>
      </div>

      {/* ---- Eliminar día ---- */}
      {dias.length > 1 && (
        <button onClick={eliminarDia} className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-peligro/40 py-2.5 text-sm font-bold text-peligro active:scale-95">
          <IconTrash className="h-4 w-4" /> Eliminar este día
        </button>
      )}

      {/* ---- Suplementos (todo el plan) ---- */}
      <div className="space-y-3 rounded-2xl border border-borde/25 bg-superficie p-4 shadow-suave">
        <h2 className="text-xs font-bold uppercase tracking-wide text-texto-soft">Suplementos</h2>
        {p.suplementos.map((s, idx) => (
          <div key={s.id} className="space-y-2 rounded-xl bg-fondo p-3">
            <input value={s.nombre} onChange={(e) => editarLista('suplementos', idx, 'nombre', e.target.value)} className={`w-full font-semibold text-texto ${inputBase}`} />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] font-medium text-texto-soft">
                Momento
                <select value={s.momento} onChange={(e) => editarLista('suplementos', idx, 'momento', e.target.value)} className={`mt-0.5 h-11 w-full text-texto ${inputBase}`}>
                  <option value="am">Mañana</option>
                  <option value="pm">Noche</option>
                </select>
              </label>
              <label className="text-[11px] font-medium text-texto-soft">
                Detalle
                <input value={s.detalle || ''} onChange={(e) => editarLista('suplementos', idx, 'detalle', e.target.value)} className={`mt-0.5 h-11 w-full text-texto ${inputBase}`} />
              </label>
            </div>
            <button onClick={() => borrarDeLista('suplementos', idx)} className="-mx-2 flex min-h-[44px] items-center gap-1 px-2 text-[11px] font-semibold text-peligro">
              <IconTrash className="h-4 w-4" /> Quitar
            </button>
          </div>
        ))}
        <button onClick={() => agregarALista('suplementos', suplementoVacio())} className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-marca/50 text-sm font-bold text-marca active:scale-95">
          <IconPlus className="h-4 w-4" /> Agregar suplemento
        </button>
      </div>

      {/* ---- Tabla de canje de carbos ---- */}
      <div className="space-y-3 rounded-2xl border border-borde/25 bg-superficie p-4 shadow-suave">
        <h2 className="text-xs font-bold uppercase tracking-wide text-texto-soft">Carbos intercambiables</h2>
        <p className="text-[11px] text-texto-soft">Se elige UNO por comida. El selector es único: la regla no se valida, no se puede romper.</p>
        {p.carbos.map((c, idx) => (
          <div key={c.id} className="space-y-2 rounded-xl bg-fondo p-3">
            <input value={c.nombre} onChange={(e) => editarLista('carbos', idx, 'nombre', e.target.value)} className={`w-full font-semibold text-texto ${inputBase}`} />
            <div className="grid grid-cols-3 gap-2">
              <label className="text-[11px] font-medium text-texto-soft">
                Porción
                <input value={c.porcion} onChange={(e) => editarLista('carbos', idx, 'porcion', e.target.value)} className={`mt-0.5 h-11 w-full text-texto ${inputBase}`} />
              </label>
              <label className="text-[11px] font-medium text-texto-soft">
                Kcal
                <input type="number" inputMode="numeric" value={c.kcal} onChange={(e) => editarLista('carbos', idx, 'kcal', Number(e.target.value) || 0)} className={`mt-0.5 h-11 w-full text-texto ${inputBase}`} />
              </label>
              <label className="text-[11px] font-medium text-texto-soft">
                Extra
                <input value={c.extra || ''} onChange={(e) => editarLista('carbos', idx, 'extra', e.target.value || undefined)} placeholder="opcional" className={`mt-0.5 h-11 w-full text-texto ${inputBase}`} />
              </label>
            </div>
            <button onClick={() => borrarDeLista('carbos', idx)} className="-mx-2 flex min-h-[44px] items-center gap-1 px-2 text-[11px] font-semibold text-peligro">
              <IconTrash className="h-4 w-4" /> Quitar
            </button>
          </div>
        ))}
        <button onClick={() => agregarALista('carbos', carboVacio())} className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-marca/50 text-sm font-bold text-marca active:scale-95">
          <IconPlus className="h-4 w-4" /> Agregar carbo
        </button>
      </div>

      {/* ---- Agua ---- */}
      <div className="rounded-2xl border border-borde/25 bg-superficie p-4 shadow-suave">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-texto-soft">Objetivo de agua (litros)</h2>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] font-medium text-texto-soft">
            Día normal
            <input type="number" step="0.1" inputMode="decimal" value={p.agua.normal} onChange={(e) => editarAgua('normal', e.target.value)} className={`mt-0.5 h-11 w-full text-texto ${inputBase}`} />
          </label>
          <label className="text-[11px] font-medium text-texto-soft">
            Día de entrenamiento
            <input type="number" step="0.1" inputMode="decimal" value={p.agua.gym} onChange={(e) => editarAgua('gym', e.target.value)} className={`mt-0.5 h-11 w-full text-texto ${inputBase}`} />
          </label>
        </div>
      </div>

      {/* ---- Reglas ---- */}
      <div className="space-y-2 rounded-2xl border border-borde/25 bg-superficie p-4 shadow-suave">
        <h2 className="text-xs font-bold uppercase tracking-wide text-texto-soft">Reglas del plan</h2>
        {p.reglas.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={r} onChange={(e) => editarRegla(i, e.target.value)} className={`w-full text-texto ${inputBase}`} />
            <button onClick={() => borrarRegla(i)} className="flex h-11 w-8 shrink-0 items-center justify-center text-texto-soft" aria-label="Quitar regla"><IconTrash className="h-4 w-4" /></button>
          </div>
        ))}
        <button onClick={agregarRegla} className="flex min-h-[44px] items-center gap-1 text-xs font-semibold text-marca"><IconPlus className="h-3.5 w-3.5" /> Agregar regla</button>
      </div>

      {/* ---- Importar plan (JSON) ---- */}
      {/* Solo la vuelta: el reporte se copia desde Report ("Copiar reporte para
          IA"), la IA devuelve el plan ajustado y se pega acá. */}
      <div className="space-y-2 rounded-2xl border border-borde/25 bg-superficie p-4 shadow-suave">
        <h2 className="font-bold tracking-tight text-texto">Importar plan</h2>
        <p className="text-xs text-texto-soft">Pega el JSON del plan que te devuelva el nutricionista o la IA para reemplazar el actual.</p>
        <button onClick={() => setPanel(panel === 'import' ? null : 'import')} className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border-2 border-borde/25 text-sm font-bold text-texto active:scale-95">
          <IconUpload className="h-4 w-4" /> Importar
        </button>

        {panel === 'import' && (
          <div className="space-y-2 pt-1">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={6}
              placeholder="Pega aquí el JSON del plan…"
              className={`w-full font-mono text-[11px] text-texto ${inputBase}`}
            />
            <button onClick={aplicarImport} disabled={!importText.trim()} className="min-h-[44px] w-full rounded-xl bg-marca text-sm font-bold text-contraste active:scale-95 disabled:opacity-50">
              Importar y reemplazar plan
            </button>
            <p className="text-[11px] text-texto-soft">Reemplaza todo el plan. Tus registros diarios no se tocan.</p>
          </div>
        )}
      </div>

      <button onClick={resetear} className="min-h-[44px] w-full rounded-xl text-sm font-semibold text-texto-soft">Restaurar plan original</button>
    </div>
  )
}
