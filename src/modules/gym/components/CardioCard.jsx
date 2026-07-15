// Tarjeta de cardio: muestra el protocolo por minutos y permite marcarlo completo.
import React from 'react'
import { IconRun, IconCheck } from '../../../core/components/icons.jsx'

export default function CardioCard({ cardio, protocolo, done, onToggle }) {
  return (
    <div className={`rounded-2xl border bg-superficie p-4 shadow-suave ${done ? 'border-completo/50' : 'border-cardio/30'}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-bold tracking-tight text-cardio">
          <IconRun className="h-5 w-5 shrink-0" /> {cardio.nombre}
        </h3>
        {done && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-completo text-contraste">
            <IconCheck className="h-4 w-4" />
          </span>
        )}
      </div>

      {/* Tabla del protocolo */}
      <div className="overflow-hidden rounded-xl border border-borde/25">
        <table className="w-full text-sm">
          <thead className="bg-cardio/10 text-cardio">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Min</th>
              <th className="px-3 py-2 text-center font-semibold">Inclinación</th>
              <th className="px-3 py-2 text-right font-semibold">Velocidad</th>
            </tr>
          </thead>
          <tbody>
            {protocolo.map((p, i) => (
              <tr key={i} className="border-t border-borde/25">
                <td className="px-3 py-2 font-medium text-texto">{p.min}</td>
                <td className="px-3 py-2 text-center text-texto-soft">{p.inclinacion}</td>
                <td className="px-3 py-2 text-right text-texto-soft">{p.velocidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* `cardio-fuerte` no cambia con el tema, así que la tinta es blanca en ambos
          (6.30:1). `contraste` no sirve acá: en oscuro sería casi negro sobre azure. */}
      <button
        onClick={onToggle}
        className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold transition-transform active:scale-95 ${
          done ? 'bg-completo text-contraste' : 'bg-cardio-fuerte text-white'
        }`}
      >
        {done && <IconCheck className="h-5 w-5" />}
        {done ? 'Cardio completado' : 'Marcar cardio como hecho'}
      </button>
    </div>
  )
}
