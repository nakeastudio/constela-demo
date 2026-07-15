// ============================================================
//  SELECTOR DE EJERCICIO  (catálogo + salida a mano)
// ============================================================
// Por qué existe: los PRs se guardan por NOMBRE (prs[ej.nombre] en
// lib/storage.js). Escrito a mano, "Hip Thrust" y "Hip thrust" son dos
// ejercicios distintos para la app: el historial se parte, el gráfico de peso
// se rompe y los récords desaparecen. Y un `grupo` equivocado corrompe el
// volumen semanal sin que nada avise. Un catálogo canónico no valida esos dos
// errores: hace que no puedan pasar.
//
// El `grupo` SIEMPRE sale del catálogo, nunca se tipea.
//
// La salida a mano se queda: el gimnasio puede tener una máquina que no está en
// el catálogo. Esto guía, no encierra.
import React, { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CATALOGO, MEDIA_ATRIBUCION } from '../data/catalogo.js'
import { GRUPO_LABEL } from '../data/rutina.js'
import ImagenEjercicio from './ImagenEjercicio.jsx'
import { IconChevronLeft, IconPlus } from '../../../core/components/icons.jsx'

const GRUPOS = Object.keys(GRUPO_LABEL)

// Normaliza para buscar: sin mayúsculas y sin acentos.
// NFD separa la letra de su tilde; el rango ̀-ͯ son esas tildes.
//
// Los nombres del catálogo están en inglés y casi no tienen acentos, así que lo
// que esto resuelve de verdad está del lado de quien escribe: teclado en
// español, autocorrector, o la costumbre de acentuar. "cúrl" encuentra los
// mismos 185 que "curl", y "HIP THRUST" encuentra "hip thrust". Sin esto, una
// tilde de más devuelve cero resultados y el catálogo parece vacío.
const normalizar = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export default function SelectorEjercicio({ seccion, onElegir, onCerrar }) {
  // En la sección de core arranca filtrado por core: es lo que se busca el 99%
  // de las veces. Pero el grupo lo decide el catálogo, no la sección — si se
  // elige un curl de bíceps acá, su grupo es "brazos", que es la verdad. Forzar
  // grupo:'core' por estar en esta sección inflaría el volumen de core y
  // escondería el de brazos: justo la corrupción que el catálogo viene a evitar.
  const [grupo, setGrupo] = useState(seccion === 'core' ? 'core' : 'todos')
  const [busqueda, setBusqueda] = useState('')
  const [aMano, setAMano] = useState(false)

  // Índice de búsqueda: se normalizan los 1324 nombres una sola vez al abrir el
  // selector, no en cada tecla. Se busca por nombre y por equipo.
  const indice = useMemo(
    () => CATALOGO.map((e) => ({ ej: e, buscable: normalizar(`${e.nombre} ${e.equipo}`) })),
    []
  )

  // Todos los términos tienen que aparecer: "band curl" encuentra
  // "band biceps curl". Un .filter() sobre 1324 strings es instantáneo.
  const resultados = useMemo(() => {
    const terminos = normalizar(busqueda).split(/\s+/).filter(Boolean)
    return indice
      .filter(({ ej, buscable }) => {
        if (grupo !== 'todos' && ej.grupo !== grupo) return false
        return terminos.every((t) => buscable.includes(t))
      })
      .map(({ ej }) => ej)
  }, [indice, busqueda, grupo])

  const inputBase = 'rounded-lg border border-borde/25 bg-fondo p-2 text-sm outline-none focus:border-marca'

  // Se monta en <body> con un portal, no donde se lo invoca. El editor de rutina
  // envuelve todo en un `space-y-4`, que en Tailwind es
  // `> * + * { margin-top: 1rem }`: ese margen le caía encima a este overlay y
  // peleaba con `inset-0` — quedaba 16px más abajo y 16px más corto que la
  // pantalla. El portal lo saca del flujo del padre, así ninguna utilidad de
  // espaciado ni ningún `overflow-hidden` futuro puede recortarlo.
  if (aMano) {
    return createPortal(
      <AltaAMano
        nombreInicial={busqueda.trim()}
        grupoInicial={seccion === 'core' ? 'core' : grupo === 'todos' ? 'gluteo' : grupo}
        inputBase={inputBase}
        onGuardar={onElegir}
        onVolver={() => setAMano(false)}
      />,
      document.body
    )
  }

  return createPortal(
    <div className="animate-in fixed inset-0 z-50 flex flex-col bg-fondo">
      {/* --- Cabecera fija: título, búsqueda y filtro --- */}
      <div className="shrink-0 space-y-3 border-b border-borde/25 bg-superficie p-4 pt-3">
        <header className="flex items-center gap-2">
          <button
            onClick={onCerrar}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-texto-soft active:bg-superficie-alta"
            aria-label="Cerrar selector"
          >
            <IconChevronLeft className="h-6 w-6" />
          </button>
          <h2 className="flex-1 text-xl font-extrabold tracking-tight text-texto">Agregar ejercicio</h2>
        </header>

        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar: hip thrust, curl, dumbbell…"
          aria-label="Buscar ejercicio"
          className={`w-full min-h-[44px] text-texto ${inputBase}`}
        />

        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1 text-[11px] font-medium text-texto-soft">
            Grupo muscular
            <select
              value={grupo}
              onChange={(e) => setGrupo(e.target.value)}
              className={`mt-0.5 min-h-[44px] w-full text-texto ${inputBase}`}
            >
              <option value="todos">Todos</option>
              {GRUPOS.map((g) => (
                <option key={g} value={g}>
                  {GRUPO_LABEL[g]}
                </option>
              ))}
            </select>
          </label>
          <p className="shrink-0 pb-3 text-[11px] font-medium text-texto-soft" aria-live="polite">
            {resultados.length} {resultados.length === 1 ? 'ejercicio' : 'ejercicios'}
          </p>
        </div>
      </div>

      {/* --- Lista --- */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {resultados.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <p className="text-sm font-medium leading-relaxed text-texto-soft">
              {busqueda.trim()
                ? `Ningún ejercicio del catálogo coincide con «${busqueda.trim()}».`
                : 'No hay ejercicios de este grupo en el catálogo.'}
            </p>
            <button
              onClick={() => setAMano(true)}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-marca px-5 text-sm font-bold text-contraste active:scale-95"
            >
              <IconPlus className="h-4 w-4" /> Cargarlo a mano
            </button>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {resultados.map((ej) => (
              <li key={ej.media_id}>
                {/* Se lleva el media_id: la sesión lo usa para mostrar la imagen
                    mientras se entrena. Va el id, no la URL — la URL se arma al
                    renderizar, así upstream puede mover archivos sin romper la
                    rutina guardada. */}
                <button
                  onClick={() => onElegir({ nombre: ej.nombre, grupo: ej.grupo, media_id: ej.media_id })}
                  className="flex w-full min-h-[44px] items-center gap-3 rounded-xl bg-superficie p-2 text-left active:bg-superficie-alta"
                >
                  <ImagenEjercicio mediaId={ej.media_id} />
                  <span className="min-w-0 flex-1">
                    {/* El nombre NO se trunca: es la identidad del ejercicio y
                        la clave con la que se guardan los récords. Con
                        ellipsis, "…on exercise ball" y "…on exercise ball v. 2"
                        se ven idénticos y se elige a ciegas. El más largo del
                        catálogo son 67 caracteres: envuelve en dos líneas. */}
                    <span className="block break-words text-sm font-semibold text-texto">{ej.nombre}</span>
                    <span className="block truncate text-[11px] text-texto-soft">
                      {GRUPO_LABEL[ej.grupo]} · {ej.equipo}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* --- Salida a mano + atribución de la media --- */}
      {/* La atribución la exige el NOTICE.md de upstream: toda muestra de la
          media tiene que llevarla. Las imágenes se referencian desde upstream,
          no se copian a este repo. */}
      <div className="shrink-0 space-y-2 border-t border-borde/25 bg-superficie p-4">
        <button
          onClick={() => setAMano(true)}
          className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-marca/50 text-sm font-bold text-marca active:scale-95"
        >
          <IconPlus className="h-4 w-4" /> ¿No está? Cargarlo a mano
        </button>
        <p className="text-center text-[10px] leading-tight text-texto-soft">Imágenes: {MEDIA_ATRIBUCION}</p>
      </div>
    </div>,
    document.body
  )
}

// --- Alta a mano ---
// El catálogo guía, no encierra: el gimnasio puede tener una máquina rara. Pero
// el grupo se elige de la misma lista, nunca se escribe: el volumen semanal
// depende de que sea un valor conocido.
function AltaAMano({ nombreInicial, grupoInicial, inputBase, onGuardar, onVolver }) {
  const [nombre, setNombre] = useState(nombreInicial)
  const [grupo, setGrupo] = useState(grupoInicial)

  return (
    <div className="animate-in fixed inset-0 z-50 flex flex-col bg-fondo">
      <div className="shrink-0 border-b border-borde/25 bg-superficie p-4 pt-3">
        <header className="flex items-center gap-2">
          <button
            onClick={onVolver}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-texto-soft active:bg-superficie-alta"
            aria-label="Volver al catálogo"
          >
            <IconChevronLeft className="h-6 w-6" />
          </button>
          <h2 className="flex-1 text-xl font-extrabold tracking-tight text-texto">Ejercicio a mano</h2>
        </header>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <p className="text-xs leading-relaxed text-texto-soft">
          Para lo que no está en el catálogo. El nombre queda tal cual se escriba: los récords y el historial se
          guardan por nombre, así que conviene escribirlo siempre igual.
        </p>

        <label className="block text-[11px] font-medium text-texto-soft">
          Nombre
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Máquina de abductores del gimnasio"
            className={`mt-0.5 min-h-[44px] w-full font-semibold text-texto ${inputBase}`}
          />
        </label>

        <label className="block text-[11px] font-medium text-texto-soft">
          Grupo muscular
          <select
            value={grupo}
            onChange={(e) => setGrupo(e.target.value)}
            className={`mt-0.5 min-h-[44px] w-full text-texto ${inputBase}`}
          >
            {GRUPOS.map((g) => (
              <option key={g} value={g}>
                {GRUPO_LABEL[g]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="shrink-0 border-t border-borde/25 bg-superficie p-4">
        <button
          onClick={() => onGuardar({ nombre: nombre.trim(), grupo })}
          disabled={!nombre.trim()}
          className="min-h-[44px] w-full rounded-xl bg-marca text-sm font-bold text-contraste active:scale-95 disabled:opacity-50"
        >
          Agregar ejercicio
        </button>
      </div>
    </div>
  )
}
