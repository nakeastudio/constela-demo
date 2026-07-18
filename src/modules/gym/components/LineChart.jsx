// Gráfico de líneas simple en SVG propio (sin librerías externas).
// Recibe puntos { x: etiqueta, y: número } y dibuja la evolución.
import React from 'react'

export default function LineChart({ puntos, alto = 140, sufijo = '' }) {
  if (!puntos || puntos.length === 0) {
    return <p className="py-6 text-center text-sm text-texto-soft">Sin datos todavía</p>
  }

  const ancho = 320
  const padX = 32
  const padY = 20
  const ys = puntos.map((p) => p.y)
  const maxY = Math.max(...ys)
  const minY = Math.min(...ys)
  const rango = maxY - minY || 1

  const px = (i) =>
    puntos.length === 1 ? ancho / 2 : padX + (i * (ancho - 2 * padX)) / (puntos.length - 1)
  const py = (y) => padY + (1 - (y - minY) / rango) * (alto - 2 * padY)

  const linea = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${px(i)} ${py(p.y)}`).join(' ')

  return (
    <div className="overflow-x-auto">
      <svg width={ancho} height={alto} className="mx-auto block">
        {/* Línea base */}
        <line x1={padX} y1={alto - padY} x2={ancho - padX} y2={alto - padY} className="stroke-borde/40" strokeWidth="1" />
        {/* Trazo: la evolución es PROGRESO, así que va en turquesa (completo),
            no en la marca. */}
        <path d={linea} fill="none" className="stroke-completo" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Puntos + valores */}
        {puntos.map((p, i) => (
          <g key={i}>
            <circle cx={px(i)} cy={py(p.y)} r="4" className="fill-completo" />
            <text x={px(i)} y={py(p.y) - 8} textAnchor="middle" className="fill-texto-soft" fontSize="10" fontWeight="700">
              {p.y}
              {sufijo}
            </text>
            <text x={px(i)} y={alto - 6} textAnchor="middle" className="fill-texto-soft" fontSize="9">
              {p.x}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
