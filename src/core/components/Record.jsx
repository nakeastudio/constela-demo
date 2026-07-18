// ============================================================
//  RÉCORD — el trato distinto para un PR (un momento raro y ganado)
// ============================================================
// El guinda pasó a ser la marca (CTAs, nav, login). Si un récord fuera solo
// "algo guinda", dejaría de sentirse raro. Así que un PR NO se distingue por el
// tono: se distingue por un TRATO.
//   · relleno guinda-fuerte (el texto blanco vive acá y pasa AA — el turquesa
//     brillante no aguanta texto blanco, por eso no carga la tinta),
//   · un aro turquesa (el color de lo completado) abrazando el guinda,
//   · el trofeo,
//   · y un destello turquesa que cruza UNA vez al aparecer (los dos colores
//     insignia se cruzan solo en el momento del récord).
// Los dos colores de la app se encuentran únicamente cuando algo se gana.
import React from 'react'
import { IconTrophy } from './icons.jsx'

export default function Record({ children, className = '', celebrar = false }) {
  return (
    <span
      className={`record-shine relative inline-flex max-w-full items-center gap-1.5 overflow-hidden rounded-full bg-marca-fuerte px-2.5 py-1 text-xs font-semibold text-contraste-fuerte ring-2 ring-completo/70 ${
        celebrar ? 'record-pop' : ''
      } ${className}`}
    >
      <IconTrophy className="h-4 w-4 shrink-0" />
      <span className="min-w-0 truncate">{children}</span>
    </span>
  )
}
