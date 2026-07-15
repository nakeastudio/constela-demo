// ============================================================
//  PANTALLA DE NUTRICIÓN  (tablero del módulo — fuera de la barra)
// ============================================================
// Se abre en HOY. La semana está a un toque, pero el día de hoy no cuesta nada.
// Todo se autoguarda: marcar es instantáneo, sin confirmar y sin botón de
// guardar (igual que la pantalla de sesión del gym).
//
// Una comida sin marcar NO es un error: queda apagada, esperando. El color
// entra solo cuando algo se cumple. Acá no se usa `peligro` para nada.

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  getPlan,
  planDesactualizado,
  getDiaNutricion,
  saveDiaNutricion,
  litrosObjetivoDe,
  claveDiaDeFecha,
  ML_POR_VASO
} from '../lib/storage.js'
import { techoProteina, FACTOR_PROTEINA } from '../data/plan.js'
import { getPerfil } from '../../../core/lib/perfil.js'
import { alternarItem, marcarItem } from '../../../core/lib/dia.js'
import { hoyISO, rangoSemana, fromISO, toISO, fmtLargo, nombreDiaSemana } from '../../../core/lib/dates.js'
import {
  IconChevronLeft,
  IconCheck,
  IconWater,
  IconPill,
  IconNote,
  IconInfo,
  IconPlus,
  IconMinus
} from '../../../core/components/icons.jsx'

// Tailwind necesita las clases literales, así que los tintes se enumeran.
// Claro: pastel de relleno + tinta oscura. Oscuro: pastel con alpha como
// tinte + pastel a fuerza completa como tinta de la etiqueta.
const ESTILO = {
  desayuno: {
    tarjeta: 'border-tinte-agua bg-tinte-agua dark:border-tinte-agua/40 dark:bg-tinte-agua/25',
    etiqueta: 'text-tinte-ink dark:text-tinte-agua',
    texto: 'text-tinte-ink dark:text-texto',
    suave: 'text-tinte-ink/75 dark:text-texto-soft',
    relleno: 'bg-tinte-ink text-tinte-agua dark:bg-tinte-agua dark:text-tinte-ink'
  },
  almuerzo: {
    tarjeta: 'border-tinte-lavanda bg-tinte-lavanda dark:border-tinte-lavanda/40 dark:bg-tinte-lavanda/25',
    etiqueta: 'text-tinte-ink dark:text-tinte-lavanda',
    texto: 'text-tinte-ink dark:text-texto',
    suave: 'text-tinte-ink/75 dark:text-texto-soft',
    relleno: 'bg-tinte-ink text-tinte-lavanda dark:bg-tinte-lavanda dark:text-tinte-ink'
  },
  postEntreno: {
    tarjeta: 'border-tinte-cardo bg-tinte-cardo dark:border-tinte-cardo/40 dark:bg-tinte-cardo/25',
    etiqueta: 'text-tinte-ink dark:text-tinte-cardo',
    texto: 'text-tinte-ink dark:text-texto',
    suave: 'text-tinte-ink/75 dark:text-texto-soft',
    relleno: 'bg-tinte-ink text-tinte-cardo dark:bg-tinte-cardo dark:text-tinte-ink'
  },
  cena: {
    tarjeta: 'border-tinte-orquidea bg-tinte-orquidea dark:border-tinte-orquidea/40 dark:bg-tinte-orquidea/25',
    etiqueta: 'text-tinte-ink dark:text-tinte-orquidea',
    texto: 'text-tinte-ink dark:text-texto',
    suave: 'text-tinte-ink/75 dark:text-texto-soft',
    relleno: 'bg-tinte-ink text-tinte-orquidea dark:bg-tinte-orquidea dark:text-tinte-ink'
  },
  // El café no es una comida: es un ritual. Va sobre superficie neutra.
  cafe: {
    tarjeta: 'border-borde/25 bg-superficie',
    etiqueta: 'text-texto-soft',
    texto: 'text-texto',
    suave: 'text-texto-soft',
    relleno: 'bg-completo text-contraste'
  }
}
const estiloDe = (categoria) => ESTILO[categoria] || ESTILO.cafe

// ¿El registro tiene algo? Evita guardar días vacíos solo por abrirlos.
function tieneAlgo(r) {
  return (
    Object.values(r.comidas || {}).some((c) => c.done || c.nota || c.carbo) ||
    Object.values(r.suplementos || {}).some((s) => s.done) ||
    (r.agua?.ml || 0) > 0
  )
}

// --- Tira de la semana: los días son puntos ---
function TiraSemana({ fecha, onIr }) {
  const { inicio } = rangoSemana(hoyISO())
  const dias = useMemo(() => {
    const base = fromISO(inicio)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      return toISO(d)
    })
  }, [inicio])

  return (
    <div className="flex gap-1.5">
      {dias.map((f) => {
        const activo = f === fecha
        const esHoy = f === hoyISO()
        return (
          <button
            key={f}
            onClick={() => onIr(f)}
            aria-current={activo ? 'date' : undefined}
            aria-label={`${nombreDiaSemana(f)} ${f}`}
            className={`flex h-11 flex-1 flex-col items-center justify-center rounded-xl text-[11px] font-bold transition-colors ${
              activo
                ? 'bg-marca text-contraste'
                : esHoy
                  ? 'bg-superficie-alta text-marca'
                  : 'bg-superficie text-texto-soft'
            }`}
          >
            {nombreDiaSemana(f).slice(0, 3)}
          </button>
        )
      })}
    </div>
  )
}

// --- Selector de carbo: uno solo. La regla no se valida, no se puede romper ---
function SelectorCarbo({ carbos, elegido, onElegir, estilo }) {
  return (
    <div className="mt-3">
      <p className={`mb-1.5 text-[11px] font-bold uppercase tracking-wide ${estilo.suave}`}>
        Un carbo de la olla
      </p>
      <div className="flex flex-wrap gap-1.5">
        {carbos.map((c) => {
          const sel = elegido === c.id
          return (
            <button
              key={c.id}
              onClick={() => onElegir(sel ? null : c.id)}
              aria-pressed={sel}
              className={`flex min-h-[44px] items-center rounded-xl px-3 text-xs font-semibold transition-colors ${
                sel ? estilo.relleno : `border border-current/25 ${estilo.suave}`
              }`}
            >
              <span className="text-left leading-tight">
                {c.nombre}
                <span className="block text-[10px] font-medium opacity-80">
                  {c.porcion} · {c.kcal} kcal
                </span>
              </span>
            </button>
          )
        })}
      </div>
      {elegido && carbos.find((c) => c.id === elegido)?.extra && (
        <p className={`mt-1.5 text-[11px] font-semibold ${estilo.texto}`}>
          {carbos.find((c) => c.id === elegido).extra}
        </p>
      )}
    </div>
  )
}

// --- Tarjeta de comida ---
function TarjetaComida({ comida, registro, carbos, onToggle, onNota, onCarbo }) {
  const estilo = estiloDe(comida.categoria)
  const hecho = !!registro?.done
  const [abriNota, setAbriNota] = useState(!!registro?.nota)

  return (
    <section className={`rounded-2xl border p-4 shadow-suave ${estilo.tarjeta}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-bold uppercase tracking-wide ${estilo.etiqueta}`}>
            {comida.titulo}
          </p>
          <ul className={`mt-1 space-y-0.5 text-sm font-medium ${estilo.texto}`}>
            {comida.items.map((it, i) => (
              <li key={i} className="leading-snug">
                {it}
              </li>
            ))}
          </ul>
          {comida.detalle && (
            <p className={`mt-1 text-xs font-medium ${estilo.suave}`}>{comida.detalle}</p>
          )}
        </div>

        {/* Marcar. Sin marcar = apagado, nunca en rojo. */}
        <button
          onClick={onToggle}
          role="switch"
          aria-checked={hecho}
          aria-label={`Marcar ${comida.titulo}`}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90 ${
            hecho ? estilo.relleno : `border-2 border-current/30 ${estilo.suave}`
          }`}
        >
          <IconCheck className="h-5 w-5" />
        </button>
      </div>

      {comida.carbo && (
        <SelectorCarbo
          carbos={carbos}
          elegido={registro?.carbo || null}
          onElegir={onCarbo}
          estilo={estilo}
        />
      )}

      {/* Anotaciones */}
      {abriNota ? (
        <textarea
          value={registro?.nota || ''}
          onChange={(e) => onNota(e.target.value)}
          placeholder="Anotación…"
          rows={2}
          className={`mt-3 w-full resize-none rounded-xl border border-current/20 bg-transparent p-2.5 text-sm outline-none placeholder:opacity-60 focus:border-current/50 ${estilo.texto}`}
        />
      ) : (
        <button
          onClick={() => setAbriNota(true)}
          className={`mt-2 flex min-h-[44px] items-center gap-1.5 text-xs font-semibold ${estilo.suave}`}
        >
          <IconNote className="h-4 w-4" /> Agregar anotación
        </button>
      )}
    </section>
  )
}

// --- Suplementos: no son comidas, siguen otro ritmo ---
function Suplementos({ lista, registro, onToggle }) {
  const bloques = [
    { momento: 'am', titulo: 'Mañana' },
    { momento: 'pm', titulo: 'Noche' }
  ]
  return (
    <section className="rounded-2xl border border-borde/25 bg-superficie p-4 shadow-suave">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-texto">
        <IconPill className="h-5 w-5 text-marca" /> Suplementos
      </h2>
      <div className="space-y-3">
        {bloques.map((b) => {
          const items = lista.filter((s) => s.momento === b.momento)
          if (!items.length) return null
          return (
            <div key={b.momento}>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-texto-soft">
                {b.titulo}
              </p>
              <div className="space-y-1.5">
                {items.map((s) => {
                  const hecho = !!registro[s.id]?.done
                  return (
                    <button
                      key={s.id}
                      onClick={() => onToggle(s.id)}
                      role="switch"
                      aria-checked={hecho}
                      className="flex w-full items-center gap-3 rounded-xl bg-superficie-alta p-2.5 text-left active:scale-[0.99]"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          hecho ? 'bg-completo text-contraste' : 'border-2 border-borde/40 text-texto-soft'
                        }`}
                      >
                        <IconCheck className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-texto">{s.nombre}</span>
                        <span className="block text-xs font-medium text-texto-soft">{s.detalle}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// --- Agua ---
function Agua({ ml, objetivoL, onCambiar }) {
  const objetivoMl = objetivoL * 1000
  const pct = Math.min(100, Math.round((ml / objetivoMl) * 100))
  const litros = (ml / 1000).toFixed(2).replace(/\.?0+$/, '')
  return (
    <section className="rounded-2xl border border-borde/25 bg-superficie p-4 shadow-suave">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-texto">
          <IconWater className="h-5 w-5 text-cardio" /> Agua
        </h2>
        <p className="text-sm font-bold tabular-nums text-texto">
          {litros}L <span className="font-medium text-texto-soft">/ {objetivoL}L</span>
        </p>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-superficie-alta">
        <div
          className="h-full rounded-full bg-cardio transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => onCambiar(Math.max(0, ml - ML_POR_VASO))}
          disabled={ml <= 0}
          aria-label="Quitar un vaso"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-superficie-alta text-texto disabled:opacity-40 active:scale-95"
        >
          <IconMinus className="h-5 w-5" />
        </button>
        <button
          onClick={() => onCambiar(ml + ML_POR_VASO)}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-cardio/15 text-sm font-bold text-cardio active:scale-95"
        >
          <IconPlus className="h-5 w-5" /> Un vaso ({ML_POR_VASO}ml)
        </button>
      </div>
    </section>
  )
}

// ============================================================
export default function Nutricion({ onSalir }) {
  // `sello` fuerza releer el plan tras restaurarlo.
  const [sello, setSello] = useState(0)
  const plan = useMemo(() => getPlan(), [sello])
  const desactualizado = useMemo(() => planDesactualizado(), [sello])


  // Fecha y registro viajan juntos: si se separan, el autoguardado escribe el
  // registro de un día en la fecha de otro.
  const [estado, setEstado] = useState(() => {
    const f = hoyISO()
    return { fecha: f, registro: getDiaNutricion(f) }
  })
  const { fecha, registro } = estado

  const irAFecha = (f) => setEstado({ fecha: f, registro: getDiaNutricion(f) })
  const actualizar = (fn) => setEstado((e) => ({ ...e, registro: fn(e.registro) }))

  // Autoguardado. No persiste días vacíos: abrir una fecha no la "registra".
  const montado = useRef(false)
  useEffect(() => {
    if (!montado.current) {
      montado.current = true
      if (!tieneAlgo(registro)) return
    }
    if (tieneAlgo(registro)) saveDiaNutricion(fecha, registro)
  }, [fecha, registro])

  const dia = plan.dias[claveDiaDeFecha(fecha)]
  const objetivoL = litrosObjetivoDe(fecha)
  // Techo útil de proteína: derivado del peso del perfil, nunca fijo.
  const techo = useMemo(() => techoProteina(getPerfil().peso), [sello])

  const toggleComida = (id) =>
    actualizar((r) => ({
      ...r,
      comidas: { ...r.comidas, [id]: alternarItem(r.comidas[id] || {}) }
    }))

  const notaComida = (id, nota) =>
    actualizar((r) => ({
      ...r,
      comidas: { ...r.comidas, [id]: { ...(r.comidas[id] || { done: false, registradoEn: null }), nota } }
    }))

  const carboComida = (id, carbo) =>
    actualizar((r) => ({
      ...r,
      comidas: { ...r.comidas, [id]: { ...(r.comidas[id] || { done: false, registradoEn: null }), carbo } }
    }))

  const toggleSuplemento = (id) =>
    actualizar((r) => ({
      ...r,
      suplementos: { ...r.suplementos, [id]: alternarItem(r.suplementos[id] || {}) }
    }))

  const cambiarAgua = (ml) =>
    actualizar((r) => ({
      ...r,
      agua: ml > 0 ? marcarItem({ ...r.agua, ml }) : { ml: 0, registradoEn: null }
    }))

  const hechas = dia ? dia.comidas.filter((c) => registro.comidas[c.id]?.done).length : 0

  return (
    <div className="animate-in space-y-4 p-4 pb-24">
      <header className="flex items-center gap-2 pt-2">
        <button
          onClick={onSalir}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-texto-soft active:bg-superficie-alta"
          aria-label="Volver"
        >
          <IconChevronLeft className="h-6 w-6" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-texto">Nutrición</h1>
          <p className="text-sm font-medium text-texto-soft">
            {fmtLargo(fecha)} · {hechas}/{dia?.comidas.length || 0} comidas
          </p>
        </div>
      </header>

      <TiraSemana fecha={fecha} onIr={irAFecha} />

      {!dia ? (
        <p className="text-sm font-medium text-texto-soft">No hay plan para este día.</p>
      ) : (
        <>
          {/* Objetivos del día */}
          <section className="rounded-2xl border border-borde/25 bg-superficie p-4 shadow-suave">
            <p className="text-[11px] font-bold uppercase tracking-wide text-texto-soft">
              {dia.nombre}
              {dia.entreno ? ` · ${dia.entreno}` : dia.tipo === 'trabajo' ? ' · trabajo' : ' · descanso'}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold tabular-nums text-texto">
              <span>{dia.objetivos.kcal} kcal</span>
              <span className="text-marca">{dia.objetivos.proteina}g proteína</span>
              <span>{dia.objetivos.carbos}g carbos</span>
              {dia.objetivos.grasa && <span>{dia.objetivos.grasa}g grasa</span>}
            </div>
            {dia.nota && (
              <p className="mt-2 rounded-xl bg-superficie-alta px-3 py-2 text-xs font-semibold text-texto">
                {dia.nota}
              </p>
            )}
          </section>

          {/* Comidas */}
          {dia.comidas.map((c) => (
            <TarjetaComida
              key={c.id}
              comida={c}
              registro={registro.comidas[c.id]}
              carbos={plan.carbos}
              onToggle={() => toggleComida(c.id)}
              onNota={(n) => notaComida(c.id, n)}
              onCarbo={(k) => carboComida(c.id, k)}
            />
          ))}

          <Suplementos
            lista={plan.suplementos}
            registro={registro.suplementos}
            onToggle={toggleSuplemento}
          />

          <Agua ml={registro.agua.ml} objetivoL={objetivoL} onCambiar={cambiarAgua} />

          {/* El porqué del número, no el número suelto. Se DERIVA del peso del
              perfil: si cambia el peso, cambia el techo solo. */}
          <details className="rounded-2xl border border-borde/25 bg-superficie p-4">
            <summary className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-bold text-texto">
              <IconInfo className="h-5 w-5 shrink-0 text-marca" />
              ¿Por qué {dia.objetivos.proteina}g de proteína?
            </summary>
            <p className="mt-2 text-sm font-medium leading-relaxed text-texto-soft">
              {techo ? (
                <>
                  Tu peso × {FACTOR_PROTEINA}g = <strong className="text-texto">{techo}g</strong> es el
                  máximo aprovechable para construir músculo. Más proteína no construye más: el resto
                  se procesa como energía.
                </>
              ) : (
                <>
                  El máximo aprovechable para construir músculo es tu peso × {FACTOR_PROTEINA}g. Más
                  proteína no construye más: el resto se procesa como energía. Cargá tu peso en
                  Ajustes → Perfil y el número aparece acá.
                </>
              )}
            </p>
          </details>

          {/* Reglas del plan */}
          <details className="rounded-2xl border border-borde/25 bg-superficie p-4">
            <summary className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-bold text-texto">
              <IconNote className="h-5 w-5 shrink-0 text-marca" /> Reglas del plan
            </summary>
            <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm font-medium text-texto-soft">
              {plan.reglas.map((r, i) => (
                <li key={i} className="leading-snug">
                  {r}
                </li>
              ))}
            </ol>
          </details>

          {/* Aviso de plantilla nueva. Restaurar vive en el editor de plan
              (Ajustes → Editar plan), igual que "Restaurar rutina original"
              vive en el editor de rutina y no en la pantalla del día. */}
          {desactualizado && (
            <p className="rounded-xl bg-superficie-alta px-3 py-2 text-xs font-semibold text-texto">
              Hay una versión más nueva del plan original. Podés restaurarla desde Ajustes → Editar plan.
            </p>
          )}
        </>
      )}
    </div>
  )
}
