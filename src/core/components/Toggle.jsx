// Switch reutilizable (presentacional). El click lo maneja el contenedor.
// Geometría simétrica (2px de aire a cada lado) y animación con leve rebote.
import React from 'react'

export default function Toggle({ checked, onColor = 'bg-marca' }) {
  return (
    <span
      className={`relative inline-flex h-[30px] w-[52px] shrink-0 items-center rounded-full transition-colors duration-300 ${
        checked ? onColor : 'bg-borde/40'
      }`}
    >
      <span
        className={`absolute left-[2px] h-[26px] w-[26px] rounded-full bg-superficie shadow-md will-change-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-0'
        }`}
        // Cubic-bezier con overshoot → sensación de "spring" al deslizar
        style={{ transition: 'transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      />
    </span>
  )
}
