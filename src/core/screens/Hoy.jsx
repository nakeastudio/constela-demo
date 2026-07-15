// ============================================================
//  HOY — el día, con una tarjeta por módulo
// ============================================================
// La barra está organizada por HORIZONTE DE TIEMPO (hoy / la semana / el
// pasado / ajustes), no por módulo. Por eso nunca crece: un módulo nuevo es
// una tarjeta más acá, no un destino más abajo.
//
// Core no sabe qué módulos existen: App arma las tarjetas y las pasa.
// Cada tarjeta: { id, titulo, detalle, Icon, hecho, total, onAbrir }

import React from 'react'
import { IconChevronRight, IconCheck } from '../components/icons.jsx'
import Vacio from '../components/Vacio.jsx'
import { fmtLargo, nombreDiaSemana, hoyISO } from '../lib/dates.js'

export default function Hoy({ tarjetas, onIrAjustes }) {
  const hoy = hoyISO()

  return (
    <div className="animate-in space-y-5 p-4 pb-24">
      <header className="pt-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-texto">Hoy</h1>
        <p className="text-sm font-medium capitalize text-texto-soft">
          {nombreDiaSemana(hoy)} · {fmtLargo(hoy)}
        </p>
      </header>

      {/* Todos los módulos apagados: la pantalla no puede quedar muda. */}
      {tarjetas.length === 0 && (
        <Vacio
          mensaje="No hay módulos prendidos. Prendé alguno en Ajustes para volver a registrar tu día."
          onAjustes={onIrAjustes}
        />
      )}

      <div className="space-y-3">
        {tarjetas.map((t) => {
          // Completo solo cuando todo está hecho. Lo que falta no se castiga:
          // se queda apagado, esperando.
          const completo = t.total > 0 && t.hecho >= t.total
          return (
            <button
              key={t.id}
              onClick={t.onAbrir}
              className={`w-full rounded-2xl border p-5 text-left shadow-suave transition-transform active:scale-[0.98] ${
                completo ? 'border-completo/40 bg-completo/10' : 'border-borde/25 bg-superficie'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    completo ? 'bg-completo/20 text-completo' : 'bg-superficie-alta text-texto-soft'
                  }`}
                >
                  <t.Icon className="h-5 w-5" />
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

      <p className="px-1 text-center text-xs font-medium leading-relaxed text-texto-soft">
        Constancia &gt; perfección. Un día flojo no arruina la semana.
      </p>
    </div>
  )
}
