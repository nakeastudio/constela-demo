// ============================================================
//  HOJA — confirmaciones y avisos como bottom sheet (no chrome del navegador)
// ============================================================
// Reemplaza `confirm()`/`alert()` del navegador —el cuadro gris "localhost
// dice…", que rompe el diseño guinda/negro— por una hoja que sube desde abajo,
// con la paleta de la app. Vive en `core` porque es UI cruzada: la usan gym,
// nutrición, skincare y las pantallas de core. `core` no importa módulos; los
// módulos importan esto.
//
// API imperativa, estilo `toast()` de Sonner: sin hooks ni contexto en cada
// sitio de uso. Se llama `confirmar({...})` / `avisar({...})` desde cualquier
// lado y el `<Hoja/>` montado una sola vez en App las pinta. Es promesa, no
// booleano síncrono como `confirm()`: por eso el handler pasa a `async` y hace
// `const ok = await confirmar({...}); if (!ok) return`. Esa es la única forma de
// tocar lo mínimo en cada sitio; un modal por estado obligaría a partir cada
// handler en dos (abrir → callback), mucho más diff.
import React, { useEffect, useReducer, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconCheck, IconInfo } from './icons.jsx'
import { bloquearAtras, liberarAtras } from '../hooks/useVista.js'

// ── Store singleton ─────────────────────────────────────────────────────────
// Una cola: se muestra de a una hoja. Encolar devuelve la promesa que el sitio
// de uso espera; se resuelve cuando la persona actúa o descarta.
let cola = []
const oyentes = new Set()
let secuencia = 0

const avisarCambio = () => oyentes.forEach((o) => o())

// Descarte de la hoja que está pintada ahora. Lo publica el host en cada
// render; lo llama el atrás del sistema a través de la capa.
let descartarPintada = null

function encolar(peticion) {
  return new Promise((resolver) => {
    // Quién disparó la hoja: se le devuelve el foco al cerrar (no regresar el
    // foco sería peor que `confirm()`, que al menos no lo pierde).
    const disparador = typeof document !== 'undefined' ? document.activeElement : null
    // El atrás del sistema tiene que cerrar la hoja, no navegar por debajo de
    // ella. Se registra acá —fuera de React— porque es el momento exacto en que
    // la hoja pasa a existir, y así el historial no depende del ciclo de vida.
    const capa = bloquearAtras(() => descartarPintada?.())
    cola = [...cola, { ...peticion, id: ++secuencia, resolver, disparador, capa }]
    avisarCambio()
  })
}

// Confirmación destructiva/benigna. Devuelve Promise<boolean>: true = acción,
// false = cancelar (y CUALQUIER descarte ambiguo —scrim, Esc— es false: nunca
// se ejecuta lo destructivo por las dudas).
export function confirmar({ titulo, cuerpo, accion = 'Confirmar', cancelar = 'Cancelar', peligro = false }) {
  return encolar({ tipo: 'confirm', titulo, cuerpo, accion, cancelar, peligro })
}

// Aviso de un solo botón (reemplaza `alert()`). Acepta texto suelto o un objeto.
// `tono`: 'ok' (algo se completó → tilde turquesa, el color de lo hecho) o
// 'neutral' (información/error → ícono suave, sin rojo: un error no es una
// alarma acá). Devuelve Promise<void>.
export function avisar(entrada) {
  const o = typeof entrada === 'string' ? { mensaje: entrada } : entrada
  return encolar({
    tipo: 'notice',
    titulo: o.titulo,
    mensaje: o.mensaje,
    cerrar: o.cerrar || 'Entendido',
    tono: o.tono || 'neutral'
  })
}

// Movimiento reducido: sin deslizar, y sin esperar la transición para desmontar.
const sinMovimiento = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const MS_SALIDA = 200 // debe coincidir con la transición de salida de la hoja

// ── Host: montar una sola vez en App ────────────────────────────────────────
export default function Hoja() {
  const [, redibujar] = useReducer((n) => n + 1, 0)
  const [pintado, setPintado] = useState(null) // petición actualmente en el DOM
  const [abierto, setAbierto] = useState(false) // abierto (para la transición)

  useEffect(() => {
    const oyente = () => redibujar()
    oyentes.add(oyente)
    return () => oyentes.delete(oyente)
  }, [])

  const enCola = cola[0] || null

  // Entra una petición nueva: montar y, al frame siguiente, abrir (deslizar).
  useEffect(() => {
    if (enCola && !pintado) {
      setPintado(enCola)
      if (sinMovimiento()) {
        setAbierto(true)
      } else {
        // doble rAF: garantiza que el navegador pinte el estado cerrado antes de
        // abrir, si no la transición no arranca.
        requestAnimationFrame(() => requestAnimationFrame(() => setAbierto(true)))
      }
    }
  }, [enCola, pintado])

  const cerrar = (resultado) => {
    if (!pintado) return
    // Consume el centinela del atrás. Si el cierre VINO del atrás, la capa ya
    // está muerta y esto no hace nada.
    liberarAtras(pintado.capa)
    pintado.resolver(resultado)
    cola = cola.filter((r) => r.id !== pintado.id)
    setAbierto(false)
    const desmontar = () => {
      setPintado(null)
      avisarCambio() // reevaluar la cola: entra la próxima si hay
    }
    if (sinMovimiento()) desmontar()
    else setTimeout(desmontar, MS_SALIDA)
  }

  // El atrás del sistema es un descarte ambiguo más, igual que el scrim o Esc:
  // en confirm cancela (false), en aviso solo cierra. Se publica en cada render
  // para que el cierre siempre apunte a la hoja que está pintada.
  descartarPintada = pintado ? () => cerrar(pintado.tipo === 'confirm' ? false : undefined) : null

  if (!pintado) return null
  return <Pieza req={pintado} abierto={abierto} onCerrar={cerrar} />
}

// ── La hoja en sí ───────────────────────────────────────────────────────────
function Pieza({ req, abierto, onCerrar }) {
  const cajaRef = useRef(null)
  const focoInicialRef = useRef(null)
  const esConfirm = req.tipo === 'confirm'

  // Descarte ambiguo (scrim/Esc): en confirm = cancelar (false); en aviso = cerrar.
  const descartar = () => onCerrar(esConfirm ? false : undefined)

  // Foco al abrir → botón seguro (cancelar en confirm; descartar en aviso), así
  // Enter no dispara lo destructivo. Se devuelve al disparador al desmontar.
  useEffect(() => {
    const disparador = req.disparador
    const t = setTimeout(() => focoInicialRef.current?.focus(), 0)
    return () => {
      clearTimeout(t)
      if (disparador && typeof disparador.focus === 'function') disparador.focus()
    }
  }, [req.disparador])

  // Bloquear el scroll de la página detrás mientras la hoja está abierta.
  useEffect(() => {
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previo }
  }, [])

  // Trampa de foco + Escape. El foco vive atrapado dentro de la hoja: Tab cicla,
  // Esc descarta. ~20 líneas, sin librería.
  const alTeclado = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      descartar()
      return
    }
    if (e.key !== 'Tab') return
    const foco = cajaRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (!foco || foco.length === 0) return
    const primero = foco[0]
    const ultimo = foco[foco.length - 1]
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault()
      ultimo.focus()
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault()
      primero.focus()
    }
  }

  const tituloId = `hoja-titulo-${req.id}`
  const cuerpoId = `hoja-cuerpo-${req.id}`
  const texto = esConfirm ? req.cuerpo : req.mensaje

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center" onKeyDown={alTeclado}>
      {/* Scrim: oscurece todo el viewport y captura el toque para descartar.
          Su opacidad transiciona con el estado abierto. */}
      <div
        onClick={descartar}
        aria-hidden="true"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ease-out"
        style={{ opacity: abierto ? 1 : 0 }}
      />

      {/* La hoja: anclada abajo, en la columna de ancho de la app. Sube desde su
          propia altura (translateY 100% → 0). El scrim tapa todo; la hoja se
          queda en la columna del teléfono aunque el viewport sea ancho. */}
      <div
        ref={cajaRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={req.titulo ? tituloId : undefined}
        aria-describedby={texto ? cuerpoId : undefined}
        className="relative w-full max-w-md rounded-t-3xl border-t border-borde/25 bg-superficie px-5 pt-3 shadow-flotante"
        style={{
          paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
          transform: abierto ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 260ms cubic-bezier(0.32, 0.72, 0, 1)'
        }}
      >
        {/* Asa: el gesto visual de "hoja que se arrastra", aunque acá se descarta
            por botón/scrim/Esc. */}
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-texto-soft/30" aria-hidden="true" />

        <div className="flex gap-3">
          {!esConfirm && (
            <span className="mt-0.5 shrink-0" aria-hidden="true">
              {req.tono === 'ok' ? (
                <IconCheck className="h-5 w-5 text-completo" />
              ) : (
                <IconInfo className="h-5 w-5 text-texto-soft" />
              )}
            </span>
          )}
          <div className="min-w-0 flex-1">
            {req.titulo && (
              <h2 id={tituloId} className="text-lg font-extrabold tracking-tight text-texto text-balance">
                {req.titulo}
              </h2>
            )}
            {texto && (
              <p id={cuerpoId} className="mt-1 text-sm font-medium leading-relaxed text-texto-soft">
                {texto}
              </p>
            )}
          </div>
        </div>

        {/* Botonera. Apilada: en 360px dos botones al lado se aprietan y el texto
            de "Restaurar…" se corta. Vertical asegura 44px y el texto entero. */}
        <div className="mt-5 flex flex-col gap-2">
          {esConfirm ? (
            <>
              <button
                onClick={() => onCerrar(true)}
                className={`min-h-[48px] w-full rounded-2xl px-4 text-sm font-bold shadow-suave transition-transform duration-150 ease-out active:scale-[0.98] ${
                  req.peligro
                    ? 'bg-peligro-fuerte text-contraste-fuerte'
                    : 'bg-marca-fuerte text-contraste-fuerte'
                }`}
              >
                {req.accion}
              </button>
              <button
                ref={focoInicialRef}
                onClick={() => onCerrar(false)}
                className="min-h-[48px] w-full rounded-2xl bg-superficie-alta px-4 text-sm font-semibold text-texto transition-transform duration-150 ease-out active:scale-[0.98]"
              >
                {req.cancelar}
              </button>
            </>
          ) : (
            <button
              ref={focoInicialRef}
              onClick={() => onCerrar(undefined)}
              className="min-h-[48px] w-full rounded-2xl bg-superficie-alta px-4 text-sm font-semibold text-texto transition-transform duration-150 ease-out active:scale-[0.98]"
            >
              {req.cerrar}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
