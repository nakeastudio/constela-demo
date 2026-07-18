// ============================================================
//  VACÍO — qué se ve cuando no hay nada que mostrar
// ============================================================
// No es un error ni un reto: es una explicación y una salida. Se usa cuando la
// persona apagó módulos y una pantalla se quedaría en blanco. Un vacío mudo
// parece la app rota; esto dice por qué está vacío y adónde ir.
//
// La constelación acá no es decorado: es la misma marca del login, así el vacío
// se siente parte de la app —invitación, no página rota—.
import React from 'react'
import ConstelaMark from './Constela.jsx'

export default function Vacio({ mensaje, onAjustes, cta = 'Ir a Ajustes' }) {
  return (
    <div className="animate-in flex flex-col items-center justify-center gap-4 px-8 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-marca/10 text-marca ring-1 ring-marca/15">
        <ConstelaMark className="h-9 w-9" />
      </span>
      <p className="max-w-xs text-sm font-medium leading-relaxed text-texto-soft">{mensaje}</p>
      {onAjustes && (
        <button
          onClick={onAjustes}
          className="min-h-[44px] rounded-xl bg-marca-fuerte px-5 text-sm font-bold text-contraste-fuerte transition-transform active:scale-95"
        >
          {cta}
        </button>
      )}
    </div>
  )
}
