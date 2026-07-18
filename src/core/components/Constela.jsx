// ============================================================
//  MARCA CONSTELA — el logo y el motivo visual de la app
// ============================================================
// Constela = el día como una CONSTELACIÓN de hábitos chicos. La marca son
// puntos y líneas: estrellas conectadas en un trazo que ASCIENDE, porque la
// tesis es constancia. No es un starfield literal ni una mascota: geometría
// limpia, en guinda (hereda `currentColor`), a tono con el favicon.
//
// Un solo set de primitivas (círculos + líneas) compuesto acá; los sitios de
// uso solo eligen tamaño (className) y color (text-marca). El motivo se reusa
// en el login y en los estados vacíos, así que la firma es siempre la misma.
import React from 'react'

// Trazo principal: un zigzag que sube de abajo-izquierda a arriba-derecha.
const NODOS = [
  [16, 76],
  [34, 54],
  [52, 62],
  [67, 36],
  [84, 18]
]
// Estrellas de acento (titilan, desfasadas), fuera del trazo.
const ACENTOS = [
  [45, 27, 1.9, '0s'],
  [73, 66, 1.7, '1.1s'],
  [24, 38, 1.5, '2.1s']
]

export default function ConstelaMark({ className = 'h-7 w-7', animated = true, titulo }) {
  const linea = NODOS.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      role={titulo ? 'img' : undefined}
      aria-hidden={titulo ? undefined : 'true'}
    >
      {titulo && <title>{titulo}</title>}
      {/* Líneas del trazo: finas y tenues, para que manden los puntos. */}
      <path
        d={linea}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.45"
      />
      {/* Nodos del trazo: el primero y el último, más grandes (inicio y meta). */}
      {NODOS.map(([x, y], i) => {
        const r = i === NODOS.length - 1 ? 4 : i === 0 ? 3.4 : 2.4
        return <circle key={i} cx={x} cy={y} r={r} fill="currentColor" />
      })}
      {/* Estrellas de acento: titilan leve y desfasadas (solo opacity). */}
      {ACENTOS.map(([x, y, r, delay], i) => (
        <circle
          key={`a${i}`}
          cx={x}
          cy={y}
          r={r}
          fill="currentColor"
          className={animated ? 'star-twinkle' : undefined}
          style={animated ? { animationDelay: delay } : undefined}
        />
      ))}
    </svg>
  )
}
