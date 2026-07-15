// ============================================================
//  VACÍO — qué se ve cuando no hay nada que mostrar
// ============================================================
// No es un error ni un reto: es una explicación y una salida. Se usa cuando la
// persona apagó módulos y una pantalla se quedaría en blanco. Un vacío mudo
// parece la app rota; esto dice por qué está vacío y adónde ir.
import React from 'react'

export default function Vacio({ mensaje, onAjustes }) {
  return (
    <div className="animate-in flex flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      <p className="text-sm font-medium leading-relaxed text-texto-soft">{mensaje}</p>
      <button
        onClick={onAjustes}
        className="min-h-[44px] rounded-xl bg-marca px-5 text-sm font-bold text-contraste active:scale-95"
      >
        Ir a Ajustes
      </button>
    </div>
  )
}
