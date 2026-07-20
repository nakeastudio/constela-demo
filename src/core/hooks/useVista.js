// ============================================================
//  useVista — la vista actual, espejada en el historial del navegador
// ============================================================
// El problema: navegar era estado de React y nada más, así que para el sistema
// la app tenía UNA sola entrada de historial. Instalada en Android, el gesto de
// atrás no volvía una pantalla: cerraba la app.
//
// La cura es mínima y aditiva: cada pantalla que se abre empuja una entrada, y
// `popstate` manda de vuelta. El historial es la fuente de verdad de "dónde
// estoy"; el estado de React lo espeja. No se toca el sistema de vistas.
//
// NO se cambia la URL (`pushState` con la misma ruta, solo `state`). Una ruta
// real por vista obligaría a configurar el hosting para reescribir todo a
// index.html —si no, entrar directo a /reporte da 404— y a cambio solo daría
// links compartibles, que en una app personal instalada no sirven para nada.
//
// Reglas del apilado (evitan el doble atrás y la pila infinita):
//   · ir a la vista actual                → no hace nada
//   · ir a la vista ANTERIOR de la pila   → atrás real (no apila un duplicado)
//   · ir a la raíz estando adentro        → vuelve de una a la raíz (go(-n))
//   · cualquier otra                      → apila
// Con eso, saltar entre pestañas de la barra no hace crecer la pila: A→B→A→B se
// mantiene en dos entradas porque cada vuelta es un atrás real.
import { useCallback, useEffect, useRef, useState } from 'react'

// ── Capas que interceptan el atrás ──────────────────────────────────────────
// Una hoja/overlay abierta tiene que COMERSE el atrás: cerrarse y cancelar, sin
// que la vista de abajo cambie. Al abrirse empuja una entrada centinela; el
// atrás del sistema la consume y nosotros la traducimos en "descartar".
const capas = []
// Retrocesos que disparamos nosotros (al consumir un centinela). Su `popstate`
// no es un atrás de la persona: no debe cerrar ninguna capa.
let sinteticos = 0

export function bloquearAtras(fn) {
  if (typeof window === 'undefined') return null
  const capa = { fn, vivo: true }
  capas.push(capa)
  window.history.pushState({ ...window.history.state, capa: capas.length }, '')
  return capa
}

// Cierre por botón, scrim o Esc: la capa se va sola, así que hay que consumir su
// centinela para que el historial no quede con una entrada de más.
export function liberarAtras(capa) {
  if (!capa?.vivo) return
  capa.vivo = false
  const i = capas.indexOf(capa)
  if (i >= 0) capas.splice(i, 1)
  sinteticos += 1
  window.history.back()
}

export function useVista(raiz) {
  const [vista, setVista] = useState(raiz)
  // Pila de vistas espejada. Es un ref y no estado: solo sirve para decidir si
  // apilar o retroceder, no se pinta.
  const pila = useRef([raiz])

  useEffect(() => {
    if (typeof window === 'undefined') return
    // La entrada actual pasa a ser la raíz. Atrás desde acá sale de la app, que
    // es lo correcto en Android: la raíz es la puerta.
    window.history.replaceState({ vista: raiz, prof: 0 }, '')

    const alVolver = (e) => {
      if (sinteticos > 0) {
        sinteticos -= 1
      } else {
        const capa = capas[capas.length - 1]
        if (capa?.vivo) {
          capa.vivo = false
          capas.pop()
          capa.fn()
          return
        }
      }
      const destino = e.state?.vista
      if (!destino) return
      const prof = e.state.prof ?? 0
      pila.current = pila.current.slice(0, prof + 1)
      pila.current[prof] = destino
      setVista(destino)
    }

    window.addEventListener('popstate', alVolver)
    return () => window.removeEventListener('popstate', alVolver)
  }, [raiz])

  const irVista = useCallback((destino) => {
    const actual = pila.current
    if (destino === actual[actual.length - 1]) return
    if (destino === actual[actual.length - 2]) {
      window.history.back()
      return
    }
    if (destino === raiz && actual.length > 1) {
      window.history.go(-(actual.length - 1))
      return
    }
    pila.current = [...actual, destino]
    window.history.pushState({ vista: destino, prof: pila.current.length - 1 }, '')
    setVista(destino)
  }, [raiz])

  return [vista, irVista]
}
