// ============================================================
//  DÓNDE VIVEN LOS DATOS  (una sola fuente de verdad)
// ============================================================
// "Tus datos quedan solo en este dispositivo" era una constante en dos
// pantallas. Era cierta cuando localStorage era el único almacén, y dejó de
// serlo en cuanto hay sesión y sync. Esa frase es justo la que alguien lee antes
// de decidir si borra el navegador o cambia de teléfono: si miente, la decisión
// se toma con información falsa.
//
// Por eso la frase se DERIVA del mismo estado que muestra EstadoSync, y no de
// una segunda fuente que se desincronizaría de la primera.

import { useEffect, useState } from 'react'
import { observarEstadoSync, estadoSync } from '../lib/sync.js'
import { fmtLargo } from '../lib/dates.js'

export function useEstadoSync() {
  const [estado, setEstado] = useState(() => estadoSync())
  useEffect(() => observarEstadoSync(setEstado), [])
  return estado
}

// Devuelve lo que es CIERTO ahora mismo sobre dónde están los datos.
//
// La distinción que importa: `ultimoOk` separa "nunca subió nada" de "subía bien
// y ahora falla". Sin ella habría que elegir entre dos mentiras. Por eso se
// persiste por usuario (ver core/lib/sync.js).
//
// Nada de esto es una alarma: es un estado. Que no haya sincronizado no es una
// falla de ella, y sus datos no están en peligro por eso.
export function fraseDondeViven(estado, email) {
  const cuenta = email ? ` con ${email}` : ''
  const nuncaSincronizo = !estado?.ultimoOk

  switch (estado?.fase) {
    // Sin sesión (o sin backend): la frase original sigue siendo la verdadera.
    case 'inactivo':
      return 'Los datos se guardan solo en este dispositivo.'

    case 'ok':
      return `Guardado en este dispositivo y sincronizado${cuenta}.`

    case 'sincronizando':
      return nuncaSincronizo
        ? `Guardado en este dispositivo. Sincronizando${cuenta} por primera vez…`
        : `Guardado en este dispositivo. Sincronizando${cuenta}…`

    // El caso que más importa: si la primera subida nunca llegó, la verdad se
    // parece mucho más a "solo en este dispositivo" que a "sincronizado".
    case 'error':
      return nuncaSincronizo
        ? `Por ahora, solo en este dispositivo: todavía no se ha podido sincronizar${cuenta}.`
        : `Guardado en este dispositivo. La última sincronización${cuenta} fue el ${fmtLargo(estado.ultimoOk.slice(0, 10))}.`

    default:
      return 'Los datos se guardan solo en este dispositivo.'
  }
}
