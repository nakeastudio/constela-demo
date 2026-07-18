// ============================================================
//  HOY — el día, con una tarjeta por módulo
// ============================================================
// La barra está organizada por HORIZONTE DE TIEMPO (hoy / la semana / el
// pasado / ajustes), no por módulo. Por eso nunca crece: un módulo nuevo es
// una tarjeta más acá, no un destino más abajo.
//
// Core no sabe qué módulos existen: App arma las tarjetas y las pasa.
// Cada tarjeta: { id, titulo, detalle, Icon, hecho, total, onAbrir }
//
// El color acá cuenta una historia con dos voces, nunca monótona:
//   · cada módulo tiene su TINTE pastel (identidad en reposo),
//   · el TURQUESA marca el progreso y lo completado,
//   · el GUINDA es solo la marca (el encabezado), nunca un reproche.
// Lo que falta queda en su pastel, apagado y esperando: jamás en rojo.

import React from 'react'
import { IconChevronRight, IconCheck } from '../components/icons.jsx'
import ConstelaMark from '../components/Constela.jsx'
import Vacio from '../components/Vacio.jsx'
import { fmtLargo, nombreDiaSemana, hoyISO } from '../lib/dates.js'

// Tintes por tarjeta. Se apoya en lavanda y cardo (leen cute sin ser rosa) y
// deja orquídea —el más rosa— para el final de la rotación. Clases literales
// porque Tailwind no las descubre si se arman por concatenación.
const TINTES = [
  { chip: 'bg-tinte-lavanda text-tinte-ink dark:bg-tinte-lavanda/25 dark:text-tinte-lavanda', surf: 'border-tinte-lavanda/40 bg-tinte-lavanda/40 dark:border-tinte-lavanda/25 dark:bg-tinte-lavanda/[0.12]' },
  { chip: 'bg-tinte-cardo text-tinte-ink dark:bg-tinte-cardo/25 dark:text-tinte-cardo', surf: 'border-tinte-cardo/40 bg-tinte-cardo/40 dark:border-tinte-cardo/25 dark:bg-tinte-cardo/[0.12]' },
  { chip: 'bg-tinte-agua text-tinte-ink dark:bg-tinte-agua/25 dark:text-tinte-agua', surf: 'border-tinte-agua/40 bg-tinte-agua/40 dark:border-tinte-agua/25 dark:bg-tinte-agua/[0.12]' },
  { chip: 'bg-tinte-orquidea text-tinte-ink dark:bg-tinte-orquidea/25 dark:text-tinte-orquidea', surf: 'border-tinte-orquidea/40 bg-tinte-orquidea/40 dark:border-tinte-orquidea/25 dark:bg-tinte-orquidea/[0.12]' }
]

// Anillo de progreso: turquesa porque el turquesa ES el progreso. Cuando llega
// a 1 lo reemplaza el check macizo. Solo SVG, sin librería.
function Anillo({ ratio }) {
  const R = 15
  const C = 2 * Math.PI * R
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90 shrink-0" aria-hidden="true">
      <circle cx="20" cy="20" r={R} fill="none" strokeWidth="4" className="stroke-superficie-alta" />
      <circle
        cx="20"
        cy="20"
        r={R}
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        className="stroke-completo"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - ratio)}
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
    </svg>
  )
}

export default function Hoy({ tarjetas, onIrAjustes }) {
  const hoy = hoyISO()
  const hayTarjetas = tarjetas.length > 0
  const completas = tarjetas.filter((t) => t.total > 0 && t.hecho >= t.total).length
  const todoListo = hayTarjetas && completas === tarjetas.length

  return (
    <div className="animate-in space-y-5 p-4 pb-24">
      {/* Encabezado-héroe: la marca (guinda) saluda el día y resume el avance
          como una constelación de puntos —uno por módulo—, que se encienden en
          turquesa al completarse. La constelación no es adorno: es el progreso. */}
      <header className="relative overflow-hidden rounded-3xl bg-marca/10 p-5 ring-1 ring-marca/15">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-texto">Hoy</h1>
            <p className="mt-0.5 text-sm font-medium capitalize text-texto-soft">
              {nombreDiaSemana(hoy)} · {fmtLargo(hoy)}
            </p>
          </div>
          <span className="text-marca">
            <ConstelaMark className="h-10 w-10" />
          </span>
        </div>

        {hayTarjetas && (
          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {tarjetas.map((t) => {
                const listo = t.total > 0 && t.hecho >= t.total
                return (
                  <span
                    key={t.id}
                    className={`h-2.5 w-2.5 rounded-full transition-colors ${
                      listo ? 'bg-completo' : 'bg-texto-soft/30'
                    }`}
                  />
                )
              })}
            </div>
            <p className="text-xs font-semibold text-texto-soft">
              {todoListo ? '¡Día completo! Bien ahí.' : `${completas} de ${tarjetas.length} listos`}
            </p>
          </div>
        )}
      </header>

      {/* Todos los módulos apagados: la pantalla no puede quedar muda. */}
      {!hayTarjetas && (
        <Vacio
          mensaje="No hay módulos activos. Activa alguno en Ajustes para registrar tu día."
          onAjustes={onIrAjustes}
        />
      )}

      <div className="space-y-3">
        {tarjetas.map((t, i) => {
          // Completo solo cuando todo está hecho. Lo que falta no se castiga:
          // se queda en su pastel, esperando.
          const completo = t.total > 0 && t.hecho >= t.total
          const ratio = t.total > 0 ? Math.min(1, t.hecho / t.total) : 0
          const tinte = TINTES[i % TINTES.length]
          return (
            <button
              key={t.id}
              onClick={t.onAbrir}
              className={`w-full rounded-3xl border p-5 text-left shadow-suave transition-transform active:scale-[0.98] ${
                completo ? 'border-completo/50 bg-completo/10' : tinte.surf
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    completo ? 'bg-completo/20 text-completo' : tinte.chip
                  }`}
                >
                  <t.Icon className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold leading-tight tracking-tight text-texto">
                    {t.titulo}
                  </h2>
                  <p className="mt-0.5 text-xs font-medium text-texto-soft">{t.detalle}</p>
                </div>
                {completo ? (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-completo">
                    <IconCheck className="h-6 w-6 text-contraste" />
                  </span>
                ) : t.total > 0 ? (
                  <span className="relative flex shrink-0 items-center justify-center">
                    <Anillo ratio={ratio} />
                    <span className="absolute text-[10px] font-bold tabular-nums text-texto-soft">
                      {t.hecho}/{t.total}
                    </span>
                  </span>
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-superficie-alta">
                    <IconChevronRight className="h-6 w-6 text-texto-soft" />
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {hayTarjetas && (
        <p className="px-1 text-center text-xs font-medium leading-relaxed text-texto-soft">
          Constancia &gt; perfección. Un día flojo no arruina la semana.
        </p>
      )}
    </div>
  )
}
