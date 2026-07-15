// ============================================================
//  HISTORIAL — el pasado, cruzado por módulos
// ============================================================
// "El pasado" es un horizonte de tiempo, no un módulo: un lunes fue gym Y
// nutrición (y mañana skincare). Antes esta pantalla era 100% gym y mostraba la
// mitad de los datos.
//
// Core no sabe qué módulos existen: itera el REGISTRO. Cada módulo responde
// `resumenDia(fecha)` con una línea legible, o null si ese día no tiene nada.
// Sumar skincare = implementar ese método, sin tocar este archivo.
//
// No edita nada. Enruta: tocar un módulo abre SU pantalla en esa fecha. No hay
// un editor del pasado aparte que pueda desincronizarse del de siempre.
import React, { useMemo } from 'react'
import Vacio from '../components/Vacio.jsx'
import { modulosActivos } from '../lib/modulos.js'
import { fechasConRegistro } from '../lib/dia.js'
import { fmtLargo, nombreDiaSemana, hoyISO } from '../lib/dates.js'
import { IconChevronRight } from '../components/icons.jsx'

export default function Historial({ onAbrirModulo, onIrAjustes }) {
  const mods = modulosActivos()
  // Se recalcula en cada montaje: volver acá después de registrar algo debe
  // mostrarlo. La pantalla se re-monta al navegar, así que alcanza.
  const fechas = useMemo(() => fechasConRegistro(), [])
  const hoy = hoyISO()

  if (mods.length === 0) {
    return (
      <div className="animate-in p-4 pb-24">
        <h1 className="pt-2 text-2xl font-extrabold tracking-tight text-texto">Historial</h1>
        <Vacio
          mensaje="No hay módulos prendidos. Prendé alguno en Ajustes para ver tu historial."
          onAjustes={onIrAjustes}
        />
      </div>
    )
  }

  return (
    <div className="animate-in space-y-5 p-4 pb-24">
      <header className="pt-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-texto">Historial</h1>
        <p className="text-sm font-medium text-texto-soft">
          {fechas.length === 0 ? 'Todavía sin registros' : `${fechas.length} día(s) con registro`}
        </p>
      </header>

      {/* Sin nada registrado no se inventa un vacío dramático: se explica. */}
      {fechas.length === 0 && (
        <p className="rounded-2xl border border-borde/25 bg-superficie p-5 text-center text-sm font-medium text-texto-soft">
          Todavía no registraste nada. Lo que marques en Hoy va a aparecer acá.
        </p>
      )}

      <div className="space-y-3">
        {fechas.map((f) => {
          // Un día solo se lista si algún módulo prendido tiene algo ahí.
          const filas = mods
            .map((m) => ({ modulo: m, resumen: m.resumenDia ? m.resumenDia(f) : null }))
            .filter((x) => x.resumen)
          if (filas.length === 0) return null

          return (
            <section key={f} className="overflow-hidden rounded-2xl border border-borde/25 bg-superficie shadow-suave">
              <header className="flex items-baseline gap-2 px-4 pt-3">
                <h2 className="text-sm font-bold tracking-tight text-texto">
                  {nombreDiaSemana(f)} {fmtLargo(f)}
                </h2>
                {f === hoy && (
                  <span className="rounded-full bg-marca/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-marca">
                    Hoy
                  </span>
                )}
              </header>

              <div className="p-2">
                {filas.map(({ modulo, resumen }) => (
                  <button
                    key={modulo.id}
                    onClick={() => onAbrirModulo(modulo.id, f)}
                    className="flex min-h-[44px] w-full items-center gap-3 rounded-xl p-2 text-left active:bg-superficie-alta"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-texto">{modulo.nombre}</span>
                      <span className="block text-xs font-medium text-texto-soft">{resumen.detalle}</span>
                    </span>
                    <IconChevronRight className="h-5 w-5 shrink-0 text-texto-soft" />
                  </button>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
