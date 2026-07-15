// ============================================================
//  BOTTOM NAV — navegación principal entre módulos
// ============================================================
import React from 'react'
import { IconHome, IconChart, IconTrend, IconSettings } from '../components/icons.jsx'

// Destinos de la barra, organizados por HORIZONTE DE TIEMPO: hoy, la semana,
// el pasado, los ajustes. Es deliberadamente cerrada — NO crece con los
// módulos. Un módulo nuevo (nutrición, skincare) es una tarjeta en Hoy y una
// sección dentro de Reporte/Historial; su tablero se abre desde esa tarjeta,
// fuera de la barra (igual que "Editar rutina").
//
// Organizarla por módulo era el error: cada módulo pedía su lugar y en un
// celular caben cuatro. Además un día es un día, no cuatro apps sueltas.
export const NAV_ITEMS = [
  { id: 'hoy', Icon: IconHome, label: 'Hoy' },
  { id: 'report', Icon: IconChart, label: 'Reporte' },
  { id: 'history', Icon: IconTrend, label: 'Historial' },
  { id: 'settings', Icon: IconSettings, label: 'Ajustes' }
]

export default function BottomNav({ vista, onIr, items = NAV_ITEMS }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md justify-around border-t border-borde bg-fondo/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
      {items.map((it) => {
        const activo = vista === it.id
        return (
          <button
            key={it.id}
            onClick={() => onIr(it.id)}
            aria-current={activo ? 'page' : undefined}
            className="flex flex-1 flex-col items-center gap-1 py-2.5"
          >
            <span
              className={`flex h-9 w-12 items-center justify-center rounded-full transition-colors ${
                activo ? 'bg-marca/15 text-marca' : 'text-texto-soft'
              }`}
            >
              <it.Icon className="h-[22px] w-[22px]" />
            </span>
            <span
              className={`text-[11px] font-semibold tracking-tight ${
                activo ? 'text-marca' : 'text-texto-soft'
              }`}
            >
              {it.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
