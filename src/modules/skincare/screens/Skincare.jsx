// ============================================================
//  PANTALLA DE SKINCARE  (tablero del módulo — fuera de la barra)
// ============================================================
// Se abre en HOY. La semana está a un toque, pero el día de hoy no cuesta nada.
// Todo se autoguarda: marcar es instantáneo, sin confirmar y sin botón de
// guardar (igual que la sesión del gym y la pantalla de nutrición).
//
// Un paso sin marcar NO es un error: queda apagado, esperando. El color entra
// solo cuando algo se cumple (turquesa). Acá no se usa `peligro` para nada.
//
// Un día puede tener VARIAS rutinas (mañana + una de noche): se muestran todas,
// cada una con sus pasos. Los pasos con `espera` ofrecen arrancar el cronómetro
// compartido de la app (el mismo del descanso del gym): no hay un segundo
// cronómetro, la pantalla solo lo DISPARA.

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  getRutinas,
  rutinasDesactualizadas,
  getDiaSkincare,
  saveDiaSkincare,
  rutinasDeFecha
} from '../lib/storage.js'
import { formatearEspera } from '../data/rutinas.js'
import { alternarItem, ahoraEnFecha, horaDe, conHora } from '../../../core/lib/dia.js'
import { hoyISO, rangoSemana, enRango, fromISO, toISO, fmtLargo, fmtCorto, nombreDiaSemana } from '../../../core/lib/dates.js'
import {
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconClock,
  IconPlay,
  IconSparkle
} from '../../../core/components/icons.jsx'

// Tintes por rutina. Se enumeran literales porque Tailwind no los descubre por
// concatenación. Rotan por posición, igual que las tarjetas de Hoy.
const TINTES = [
  {
    tarjeta: 'border-tinte-agua bg-tinte-agua dark:border-tinte-agua/40 dark:bg-tinte-agua/25',
    etiqueta: 'text-tinte-ink dark:text-tinte-agua',
    suave: 'text-tinte-ink/75 dark:text-texto-soft'
  },
  {
    tarjeta: 'border-tinte-lavanda bg-tinte-lavanda dark:border-tinte-lavanda/40 dark:bg-tinte-lavanda/25',
    etiqueta: 'text-tinte-ink dark:text-tinte-lavanda',
    suave: 'text-tinte-ink/75 dark:text-texto-soft'
  },
  {
    tarjeta: 'border-tinte-cardo bg-tinte-cardo dark:border-tinte-cardo/40 dark:bg-tinte-cardo/25',
    etiqueta: 'text-tinte-ink dark:text-tinte-cardo',
    suave: 'text-tinte-ink/75 dark:text-texto-soft'
  },
  {
    tarjeta: 'border-tinte-orquidea bg-tinte-orquidea dark:border-tinte-orquidea/40 dark:bg-tinte-orquidea/25',
    etiqueta: 'text-tinte-ink dark:text-tinte-orquidea',
    suave: 'text-tinte-ink/75 dark:text-texto-soft'
  }
]

// ¿El registro tiene algo? Evita guardar días vacíos solo por abrirlos.
function tieneAlgo(r) {
  return Object.values(r.pasos || {}).some((p) => p.done)
}

// --- Tira de la semana: los días son puntos (idéntica a la de nutrición) ---
function TiraSemana({ fecha, onIr }) {
  const { inicio, fin } = rangoSemana(fecha)
  const dias = useMemo(() => {
    const base = fromISO(inicio)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      return toISO(d)
    })
  }, [inicio])

  const moverSemana = (delta) => {
    const d = fromISO(fecha)
    d.setDate(d.getDate() + delta * 7)
    onIr(toISO(d))
  }

  const hoy = hoyISO()
  const estaSemana = enRango(hoy, inicio, fin)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => moverSemana(-1)}
          aria-label="Semana anterior"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-marca active:bg-marca/15"
        >
          <IconChevronLeft className="h-5 w-5" />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-xs font-bold tabular-nums text-texto-soft">
          {fmtCorto(inicio)} – {fmtCorto(fin)}
        </p>
        {!estaSemana && (
          <button
            onClick={() => onIr(hoy)}
            className="min-h-[44px] shrink-0 rounded-xl px-3 text-xs font-bold text-marca active:bg-marca/15"
          >
            Hoy
          </button>
        )}
        <button
          onClick={() => moverSemana(1)}
          aria-label="Semana siguiente"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-marca active:bg-marca/15"
        >
          <IconChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="flex gap-1.5">
        {dias.map((f) => {
          const activo = f === fecha
          const esHoy = f === hoy
          return (
            <button
              key={f}
              onClick={() => onIr(f)}
              aria-current={activo ? 'date' : undefined}
              aria-label={`${nombreDiaSemana(f)} ${f}`}
              className={`flex h-11 flex-1 flex-col items-center justify-center rounded-xl text-[11px] font-bold transition-colors ${
                activo
                  ? 'bg-marca-fuerte text-contraste-fuerte'
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
    </div>
  )
}

// --- Hora de un registro: editable, discreta (idéntica a la de nutrición) ---
function HoraRegistro({ registradoEn, fecha, onCambiar, className = '' }) {
  const hora = horaDe(registradoEn)
  return (
    <label className={`mt-2 flex items-center gap-1.5 text-[11px] font-medium ${className}`}>
      <IconClock className="h-3.5 w-3.5 shrink-0" />
      <span className="sr-only">Hora del registro</span>
      <input
        type="time"
        value={hora}
        onChange={(e) => onCambiar(conHora(registradoEn, e.target.value, fecha))}
        className="min-h-[44px] rounded-lg bg-transparent px-1 font-semibold tabular-nums outline-none focus:bg-current/10"
      />
      {!hora && <span className="opacity-75">sin hora</span>}
    </label>
  )
}

// --- Un paso: marcable, con descripción y una espera opcional ---
function Paso({ paso, registro, fecha, estilo, onToggle, onHora, onEsperar }) {
  const hecho = !!registro?.done
  return (
    <div className="rounded-xl bg-superficie/70 p-3 dark:bg-superficie/40">
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          role="switch"
          aria-checked={hecho}
          aria-label={`Marcar ${paso.nombre}`}
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90 ${
            hecho ? 'bg-completo text-contraste' : 'border-2 border-current/30 text-texto-soft'
          }`}
        >
          <IconCheck className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-snug text-texto">{paso.nombre}</p>
          {paso.descripcion && (
            <p className="mt-0.5 text-xs font-medium leading-snug text-texto-soft">{paso.descripcion}</p>
          )}

          {/* Espera: dispara el cronómetro compartido de la app. No es un segundo
              cronómetro; la etiqueta nombra el paso para que se lea desde
              cualquier pantalla. */}
          {paso.espera > 0 && (
            <button
              onClick={onEsperar}
              className="mt-2 flex min-h-[44px] items-center gap-1.5 rounded-lg bg-marca/10 px-3 text-xs font-bold text-marca active:scale-95"
            >
              <IconPlay className="h-3.5 w-3.5" />
              Esperar {formatearEspera(paso.espera)}
            </button>
          )}

          {hecho && (
            <HoraRegistro
              registradoEn={registro?.registradoEn}
              fecha={fecha}
              onCambiar={onHora}
              className="text-texto-soft"
            />
          )}
        </div>
      </div>
    </div>
  )
}

// --- Una rutina: encabezado con tinte + sus pasos ---
function TarjetaRutina({ rutina, registro, fecha, tinte, onToggle, onHora, onEsperar }) {
  const total = rutina.pasos.length
  const hechos = rutina.pasos.filter((p) => registro.pasos[p.id]?.done).length
  const completa = total > 0 && hechos >= total

  return (
    <section className={`space-y-2 rounded-2xl border p-4 shadow-suave ${tinte.tarjeta}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className={`text-sm font-extrabold tracking-tight ${tinte.etiqueta}`}>{rutina.nombre}</h2>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
            completa ? 'bg-completo text-contraste' : `bg-current/10 ${tinte.suave}`
          }`}
        >
          {hechos}/{total}
        </span>
      </div>

      <div className="space-y-2">
        {rutina.pasos.map((p) => (
          <Paso
            key={p.id}
            paso={p}
            registro={registro.pasos[p.id]}
            fecha={fecha}
            estilo={tinte}
            onToggle={() => onToggle(p.id)}
            onHora={(iso) => onHora(p.id, iso)}
            onEsperar={() => onEsperar(p)}
          />
        ))}
      </div>
    </section>
  )
}

// ============================================================
// `fechaInicial` permite abrir esta misma pantalla en un día pasado (desde
// Historial). No hay un editor aparte para el pasado: es la pantalla de
// siempre, mirando otra fecha. `timer` es el cronómetro compartido de la app.
export default function Skincare({ fechaInicial, timer, onSalir }) {
  const [sello] = useState(0)
  const desactualizado = useMemo(() => rutinasDesactualizadas(), [sello])

  // Fecha y registro viajan juntos: si se separan, el autoguardado escribe el
  // registro de un día en la fecha de otro.
  const [estado, setEstado] = useState(() => {
    const f = fechaInicial || hoyISO()
    return { fecha: f, registro: getDiaSkincare(f) }
  })
  const { fecha, registro } = estado

  const irAFecha = (f) => setEstado({ fecha: f, registro: getDiaSkincare(f) })
  const actualizar = (fn) => setEstado((e) => ({ ...e, registro: fn(e.registro) }))

  // Las rutinas que aplican a la fecha mirada. Se releen si cambia la fecha.
  const rutinas = useMemo(() => rutinasDeFecha(fecha), [fecha])

  // Autoguardado. No persiste días vacíos: abrir una fecha no la "registra".
  const montado = useRef(false)
  useEffect(() => {
    if (!montado.current) {
      montado.current = true
      if (!tieneAlgo(registro)) return
    }
    if (tieneAlgo(registro)) saveDiaSkincare(fecha, registro)
  }, [fecha, registro])

  // Marcar sella el día que se está mirando, no "ahora": marcar el lunes desde
  // el miércoles no puede quedar registrado el miércoles. La hora es una
  // suposición editable (ver ahoraEnFecha en core/lib/dia.js).
  const togglePaso = (id) =>
    actualizar((r) => ({
      ...r,
      pasos: { ...r.pasos, [id]: alternarItem(r.pasos[id] || {}, ahoraEnFecha(fecha)) }
    }))

  const horaPaso = (id, registradoEn) =>
    actualizar((r) => ({
      ...r,
      pasos: { ...r.pasos, [id]: { ...(r.pasos[id] || { done: false }), registradoEn } }
    }))

  // Arranca el cronómetro compartido con el nombre del paso, para que se lea
  // desde cualquier pantalla ("Tratamiento — espera").
  const esperar = (paso) => {
    if (timer && paso.espera > 0) timer.iniciar(paso.espera, `${paso.nombre} — espera`)
  }

  const total = rutinas.reduce((a, r) => a + r.pasos.length, 0)
  const hechos = rutinas.reduce(
    (a, r) => a + r.pasos.filter((p) => registro.pasos[p.id]?.done).length,
    0
  )

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
          <h1 className="text-2xl font-extrabold tracking-tight text-texto">Skincare</h1>
          <p className="text-sm font-medium text-texto-soft">
            {fmtLargo(fecha)} · {hechos}/{total} pasos
          </p>
        </div>
      </header>

      <TiraSemana fecha={fecha} onIr={irAFecha} />

      {rutinas.length === 0 ? (
        <div className="rounded-2xl border border-borde/25 bg-superficie p-5 text-center">
          <IconSparkle className="mx-auto h-8 w-8 text-texto-soft/60" />
          <p className="mt-2 text-sm font-medium text-texto-soft">
            No hay ninguna rutina para este día. Puedes asignar días a tus rutinas en Ajustes → Editar
            skincare.
          </p>
        </div>
      ) : (
        <>
          {rutinas.map((r, i) => (
            <TarjetaRutina
              key={r.id}
              rutina={r}
              registro={registro}
              fecha={fecha}
              tinte={TINTES[i % TINTES.length]}
              onToggle={togglePaso}
              onHora={horaPaso}
              onEsperar={esperar}
            />
          ))}

          {desactualizado && (
            <p className="rounded-xl bg-superficie-alta px-3 py-2 text-xs font-semibold text-texto">
              Hay una versión más nueva de las rutinas originales. Puedes restaurarla desde Ajustes →
              Editar skincare.
            </p>
          )}
        </>
      )}
    </div>
  )
}
