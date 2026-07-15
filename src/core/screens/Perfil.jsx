// ============================================================
//  PERFIL — pantalla de datos personales (se abre desde Ajustes)
// ============================================================
// Se autoguarda, como el resto de la app: sin botón de guardar.
// Estos datos no viven en el repo: se cargan acá y se guardan en el dispositivo
// (y, con sesión abierta, se sincronizan — la pantalla lo dice sin adivinar).

import React, { useEffect, useRef, useState } from 'react'
import { getPerfil, savePerfil } from '../lib/perfil.js'
import { useEstadoSync, fraseDondeViven } from '../hooks/useSync.js'
import { IconChevronLeft } from '../components/icons.jsx'

const CAMPOS = [
  { id: 'nombre', label: 'Nombre', tipo: 'text', sufijo: null, placeholder: 'Tu nombre' },
  { id: 'edad', label: 'Edad', tipo: 'number', sufijo: 'años', placeholder: '' },
  { id: 'peso', label: 'Peso', tipo: 'number', sufijo: 'kg', placeholder: '' },
  { id: 'altura', label: 'Altura', tipo: 'number', sufijo: 'cm', placeholder: '' }
]

export default function Perfil({ email, onSalir }) {
  const [perfil, setPerfil] = useState(() => getPerfil())
  const estadoSync = useEstadoSync()

  // Autoguardado en cada cambio (igual que la sesión y la nutrición).
  const montado = useRef(false)
  useEffect(() => {
    if (!montado.current) {
      montado.current = true
      return
    }
    savePerfil(perfil)
  }, [perfil])

  const cambiar = (id, valor) =>
    setPerfil((p) => ({ ...p, [id]: valor === '' ? null : valor }))

  return (
    <div className="animate-in space-y-5 p-4 pb-24">
      <header className="flex items-center gap-2 pt-2">
        <button
          onClick={onSalir}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-texto-soft active:bg-superficie-alta"
          aria-label="Volver"
        >
          <IconChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 text-2xl font-extrabold tracking-tight text-texto">Perfil</h1>
      </header>

      <div className="space-y-3">
        {CAMPOS.map((c) => (
          <label
            key={c.id}
            className="flex items-center gap-3 rounded-2xl border border-borde/25 bg-superficie p-3.5 shadow-suave"
          >
            <span className="w-20 shrink-0 text-sm font-bold text-texto">{c.label}</span>
            <input
              type={c.tipo}
              inputMode={c.tipo === 'number' ? 'decimal' : undefined}
              value={perfil[c.id] ?? ''}
              onChange={(e) => cambiar(c.id, e.target.value)}
              placeholder={c.placeholder}
              className="h-11 min-w-0 flex-1 rounded-xl border border-borde/25 bg-fondo px-3 text-right text-base font-bold text-texto outline-none focus:border-marca"
            />
            {c.sufijo && (
              <span className="w-10 shrink-0 text-sm font-medium text-texto-soft">{c.sufijo}</span>
            )}
          </label>
        ))}

        <label className="block rounded-2xl border border-borde/25 bg-superficie p-3.5 shadow-suave">
          <span className="mb-2 block text-sm font-bold text-texto">Objetivo</span>
          <textarea
            value={perfil.objetivo ?? ''}
            onChange={(e) => cambiar('objetivo', e.target.value)}
            placeholder="Qué buscas con esto"
            rows={2}
            className="w-full resize-none rounded-xl border border-borde/25 bg-fondo p-3 text-sm text-texto outline-none focus:border-marca"
          />
        </label>
      </div>

      {/* Antes esto afirmaba "solo en este dispositivo" pasara lo que pasara.
          Ahora dice lo que es cierto, incluida la cuenta: en un navegador
          compartido, "se sincroniza" sin decir con quién es media verdad. */}
      <p className="px-1 text-xs font-medium leading-relaxed text-texto-soft">
        {fraseDondeViven(estadoSync, email)} La app usa estos datos para calcular
        referencias — por ejemplo, el techo útil de proteína a partir del peso.
      </p>
    </div>
  )
}
