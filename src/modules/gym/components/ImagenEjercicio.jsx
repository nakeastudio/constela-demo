// ============================================================
//  IMAGEN DE EJERCICIO  (única fuente de verdad del render de media)
// ============================================================
// La usan el selector del catálogo y la pantalla de sesión. Existe como
// componente y no como dos <img> sueltos porque el camino que importa NO es el
// feliz: es el gimnasio en un sótano sin señal, upstream caído, o un ejercicio
// cargado a mano que nunca tuvo imagen. Si cada pantalla arma su propio
// fallback, tarde o temprano una de las dos muestra el ícono de imagen rota.
// Acá se decide una sola vez, para las dos.
//
// La imagen es © Gym visual y vive en upstream: se referencia por URL, nunca se
// copia a este repo. Toda pantalla que la muestre tiene que llevar la
// atribución visible (MEDIA_ATRIBUCION en data/catalogo.js) — lo exige el
// NOTICE.md de upstream.
import React, { useEffect, useState } from 'react'
import { urlMedia } from '../data/catalogo.js'
import { IconDumbbell } from '../../../core/components/icons.jsx'

export default function ImagenEjercicio({ mediaId, className = 'h-11 w-11', iconClassName = 'h-5 w-5' }) {
  const [falla, setFalla] = useState(false)

  // Si cambia el ejercicio, se vuelve a intentar. Sin esto, una imagen que
  // falló dejaría en fallback al siguiente ejercicio que reuse el componente
  // (la sesión pasa de un ejercicio al otro sin desmontarlo).
  useEffect(() => setFalla(false), [mediaId])

  const url = urlMedia(mediaId)
  const mostrarImagen = url && !falla

  // El cuadro se reserva siempre igual, haya imagen o no: así el fallback no
  // mueve el layout cuando una carga falla tarde.
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-superficie-alta ${className}`}
    >
      {mostrarImagen ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          width="180"
          height="180"
          onError={() => setFalla(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <IconDumbbell className={`text-texto-soft/60 ${iconClassName}`} />
      )}
    </span>
  )
}
