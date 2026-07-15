// ============================================================
//  ESTADO DE SINCRONIZACIÓN
// ============================================================
// Un fallo de sync NO es un fracaso de la persona ni de la app: es una red que
// no está. Se informa como estado, nunca como modal que bloquee, y nunca en
// rojo — `peligro` es para acciones destructivas, no para "todavía no subió".
// Sus datos están a salvo en el dispositivo igual; por eso el texto lo dice.
import React from 'react'
import { empujar } from '../lib/sync.js'
import { useEstadoSync } from '../hooks/useSync.js'
import { IconCheck, IconInfo, IconUpload } from '../components/icons.jsx'

export default function EstadoSync() {
  const estado = useEstadoSync()

  if (estado.fase === 'inactivo') return null

  const mapa = {
    sincronizando: { Icon: IconUpload, texto: 'Sincronizando…', detalle: '', tinte: 'text-texto-soft' },
    ok: { Icon: IconCheck, texto: 'Todo sincronizado', detalle: '', tinte: 'text-completo' },
    error: {
      Icon: IconInfo,
      texto: estado.detalle || 'Sin sincronizar',
      // Lo importante no es el error: es que no perdió nada.
      detalle: 'Tus datos están guardados en este dispositivo. Se suben solos cuando vuelva la conexión.',
      tinte: 'text-texto-soft'
    }
  }
  const v = mapa[estado.fase] || mapa.sincronizando

  return (
    <div className="rounded-2xl border border-borde/25 bg-superficie p-3.5 shadow-suave">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-superficie-alta ${v.tinte}`}>
          <v.Icon className="h-4 w-4" />
        </span>
        <p className={`min-w-0 flex-1 text-sm font-bold tracking-tight ${v.tinte}`}>{v.texto}</p>
        {estado.fase === 'error' && (
          <button
            onClick={() => empujar()}
            className="min-h-[44px] shrink-0 px-2 text-xs font-bold text-marca"
          >
            Reintentar
          </button>
        )}
      </div>
      {v.detalle && <p className="mt-1.5 text-xs font-medium leading-relaxed text-texto-soft">{v.detalle}</p>}
    </div>
  )
}
