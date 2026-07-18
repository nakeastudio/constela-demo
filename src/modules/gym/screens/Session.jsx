// ============================================================
//  PANTALLA DE SESIÓN DE ENTRENAMIENTO  (la más usada)
// ============================================================
// UN PASO A LA VEZ, no una lista.
//
// Una lista larga sirve para PLANIFICAR y estorba para ENTRENAR: son dos
// momentos distintos que antes compartían pantalla. El editor (Routine.jsx) es
// la superficie de planificación y sigue siendo una lista. Esta es la superficie
// de entrenamiento: muestra una cosa, grande, con una forma de avanzar.
// Llegar al cuarto ejercicio costaba medio metro de scroll entre serie y serie,
// con las manos mojadas.
//
// El día es un recorrido ORDENADO, y así se modela: calentamiento, cada
// ejercicio, cardio y el cierre son pasos de la misma secuencia, no regiones de
// scroll separadas.
//
// NUNCA avanza sola. Completar la última serie ENCIENDE "Siguiente", no lo
// pulsa: la pantalla no se mueve debajo de las manos de nadie. Quien decide
// cuándo pasar es ella (a veces falta agregar una serie, o corregir un número).
//
// Todo se autoguarda en cada cambio (no hay botón de guardar, no se pierde nada).
import React, { useEffect, useMemo, useRef, useState } from 'react'
import ExerciseCard from '../components/ExerciseCard.jsx'
import CardioCard from '../components/CardioCard.jsx'
import { crearSesion, reconciliarSesion, ultimaSesionSets, ejercicioCompleto } from '../lib/session.js'
import {
  getActiveSession,
  saveActiveSession,
  clearActiveSession,
  saveSession,
  actualizarPRs,
  getPRs
} from '../lib/storage.js'
import { hoyISO } from '../../../core/lib/dates.js'
import { alternarItem, ahoraISO } from '../../../core/lib/dia.js'
import {
  IconChevronLeft,
  IconChevronRight,
  IconFlame,
  IconRun,
  IconNote,
  IconCheck
} from '../../../core/components/icons.jsx'

// --- Tira de pasos: dónde estoy y cuánto falta ---
// Es lo que devuelve la vista de conjunto que se pierde al mostrar un ejercicio
// por vez. Hace dos trabajos con un componente: INDICADOR (posición y avance) y
// ÍNDICE (tocar para saltar). Mismo idioma que la tira de la semana de
// nutrición, así que no hay concepto nuevo que aprender.
//
// Vive en el encabezado pegajoso a propósito: el cronómetro de descanso ocupa
// el borde inferior, así que esta tira es la navegación que SIEMPRE está a mano
// —incluso descansando del ejercicio 3 mientras se espía el 4—.
function TiraPasos({ pasos, actual, onIr, completo }) {
  const tira = useRef(null)
  const chipActual = useRef(null)

  // Con una rutina real (siete ejercicios + core + cardio) la tira no entra en
  // 360px y desplaza. Si no la seguimos, el indicador deja de indicar: al llegar
  // al paso 8 el chip encendido quedaría fuera de vista.
  // Se mueve `scrollLeft` de la tira a mano y no con scrollIntoView, que además
  // arrastraría el scroll vertical de la página.
  useEffect(() => {
    const c = tira.current
    const b = chipActual.current
    if (!c || !b) return
    const destino = b.offsetLeft - c.clientWidth / 2 + b.offsetWidth / 2
    c.scrollTo({ left: Math.max(0, destino), behavior: 'smooth' })
  }, [actual])

  return (
    <div ref={tira} className="flex gap-1.5 overflow-x-auto pb-0.5">
      {pasos.map((p, i) => {
        const esActual = i === actual
        const hecho = completo(p)
        return (
          <button
            key={i}
            ref={esActual ? chipActual : null}
            onClick={() => onIr(i)}
            aria-current={esActual ? 'step' : undefined}
            aria-label={`Paso ${i + 1} de ${pasos.length}: ${p.titulo}`}
            // min-w-[44px] + scroll horizontal: el objetivo táctil manda sobre
            // el "que entren todos". Con manos mojadas, un punto de 20px no.
            className={`flex h-11 min-w-[44px] flex-1 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-colors ${
              esActual
                ? 'bg-marca-fuerte text-contraste-fuerte'
                : hecho
                  ? 'bg-completo/20 text-completo'
                  : 'bg-superficie-alta text-texto-soft'
            }`}
          >
            {p.Icon ? <p.Icon className="h-4 w-4" /> : p.numero}
          </button>
        )
      })}
    </div>
  )
}

// `timer` llega desde App: el descanso sobrevive a salir de esta pantalla.
// Session lo ARRANCA y lo detiene al finalizar, pero no es su dueña. Moverse
// entre pasos NO lo toca: su `etiqueta` sigue nombrando al ejercicio que lo
// arrancó, no al que esté en pantalla.
export default function Session({ rutina, diaKey, timer, onSalir, onFinalizada }) {
  const dia = rutina[diaKey]
  const prs = useRef(getPRs())
  // Sets de la última vez por ejercicio (columna "Anterior" estilo Hevy)
  const anteriores = useRef(
    Object.fromEntries(dia.ejercicios.concat(dia.core || []).map((e) => [e.nombre, ultimaSesionSets(e.nombre)]))
  )

  // Series de aproximación, leídas de la RUTINA y nunca de la sesión.
  // Esto no es un detalle de implementación: es la garantía. `crearSesion` no
  // copia `aprox` al registro, y el volumen y los récords se calculan
  // recorriendo `sesion.ejercicios[].sets`. Al vivir solo en el plan, la
  // aproximación NO PUEDE contar como volumen ni disparar un PR: no existe el
  // camino, no es una regla que haya que recordar respetar.
  // Se indexa por nombre (igual que `anteriores`) y no por índice: el borrador
  // puede ser anterior a una edición de la rutina.
  const aprox = useRef(
    Object.fromEntries(dia.ejercicios.concat(dia.core || []).map((e) => [e.nombre, e.aprox || []]))
  )

  // --- Carga o crea la sesión (resume el draft si es del mismo día y fecha) ---
  // El borrador se busca por día y se reconoce por sus campos, no
  // reconstruyendo el id: los ids son opacos desde que la fecha es editable
  // (ver lib/session.js).
  const [sesion, setSesion] = useState(() => {
    const activa = getActiveSession(diaKey)
    // Un borrador de hoy se retoma, pero PRIMERO se reconcilia contra el plan
    // vigente: si editó la rutina mientras no entrenaba (agregó/quitó/reordenó
    // ejercicios o cambió objetivos), la sesión que retoma refleja el plan de
    // ahora sin perder lo ya registrado. Ver reconciliarSesion.
    if (activa && activa.fecha === hoyISO()) return reconciliarSesion(activa, dia)
    return crearSesion(diaKey, dia, hoyISO())
  })

  // --- Reconciliar en vivo si el plan cambia con la sesión montada ---
  // El router de App desmonta Session al ir al editor, así que el caso normal lo
  // cubre el inicializador de arriba. Este efecto es la red por si `dia` cambia
  // sin desmontar: reconciliarSesion devuelve el MISMO borrador cuando nada
  // cambió, así que en el montaje (ya reconciliado) no dispara re-render.
  useEffect(() => {
    setSesion((prev) => reconciliarSesion(prev, dia))
  }, [dia])

  // --- Autoguardado en cada cambio ---
  useEffect(() => {
    saveActiveSession(sesion)
  }, [sesion])

  // --- Los pasos del día, en orden ---
  const pasos = useMemo(() => {
    const l = []
    if (dia.calentamiento || (dia.activacion || []).length) {
      l.push({ tipo: 'calentamiento', titulo: 'Calentamiento y activación', Icon: IconFlame })
    }
    sesion.ejercicios.forEach((e, idx) => {
      l.push({ tipo: 'ejercicio', idx, titulo: e.nombre, numero: idx + 1 })
    })
    if (dia.cardio) l.push({ tipo: 'cardio', titulo: 'Cardio', Icon: IconRun })
    // El cierre es un paso más: el recorrido termina en "¿cómo me sentí?".
    l.push({ tipo: 'cierre', titulo: 'Terminar', Icon: IconCheck })
    return l
  }, [dia, sesion.ejercicios])

  // Dónde estaba. Vive DENTRO del borrador: retomar a mitad del entrenamiento
  // tiene que devolverla al ejercicio en el que estaba, no al principio.
  // Se recorta por si la rutina se editó y hay menos pasos que antes.
  const paso = Math.min(Math.max(sesion.paso ?? 0, 0), pasos.length - 1)
  const irAPaso = (i) =>
    setSesion((prev) => ({ ...prev, paso: Math.max(0, Math.min(i, pasos.length - 1)) }))

  const actual = pasos[paso]

  // Actualiza un campo de una serie
  const cambiarSet = (ejIdx, setIdx, campo, valor) => {
    setSesion((prev) => {
      const ejercicios = prev.ejercicios.map((ej, i) => {
        if (i !== ejIdx) return ej
        const sets = ej.sets.map((s, j) => (j === setIdx ? { ...s, [campo]: valor } : s))
        return { ...ej, sets }
      })
      return { ...prev, ejercicios }
    })
  }

  // Marca/desmarca serie. Al marcar → arranca el cronómetro de descanso.
  // NO avanza de paso: encender "Siguiente" es sugerir; moverse lo decide ella.
  const toggleSet = (ejIdx, setIdx) => {
    setSesion((prev) => {
      const ej = prev.ejercicios[ejIdx]
      const yaHecha = ej.sets[setIdx].done
      const ejercicios = prev.ejercicios.map((e, i) => {
        if (i !== ejIdx) return e
        // alternarItem sella `registradoEn` con el momento actual al marcar.
        const sets = e.sets.map((s, j) => (j === setIdx ? alternarItem(s) : s))
        return { ...e, sets }
      })
      // Si la estamos completando (no desmarcando) → descanso automático.
      // El nombre del ejercicio va con el cronómetro: el panel se ve desde otras
      // pantallas, donde no hay "ejercicio activo" que consultar.
      if (!yaHecha) timer.iniciar(ej.descanso, ej.nombre)
      return { ...prev, ejercicios }
    })
  }

  // Agrega una serie (copia los valores de la última como arranque, como Hevy)
  const agregarSet = (ejIdx) => {
    setSesion((prev) => {
      const ejercicios = prev.ejercicios.map((ej, i) => {
        if (i !== ejIdx) return ej
        const ultima = ej.sets[ej.sets.length - 1]
        const nueva = { peso: ultima?.peso ?? '', reps: ultima?.reps ?? '', segundos: ultima?.segundos ?? '', done: false, registradoEn: null }
        return { ...ej, sets: [...ej.sets, nueva] }
      })
      return { ...prev, ejercicios }
    })
  }

  // Quita la última serie (mínimo 1)
  const quitarSet = (ejIdx) => {
    setSesion((prev) => {
      const ejercicios = prev.ejercicios.map((ej, i) => {
        if (i !== ejIdx || ej.sets.length <= 1) return ej
        return { ...ej, sets: ej.sets.slice(0, -1) }
      })
      return { ...prev, ejercicios }
    })
  }

  const toggleCardio = () => {
    setSesion((prev) => ({
      ...prev,
      // Si el borrador nació antes de que el día tuviera cardio, `prev.cardio`
      // es null y marcar no hacía NADA en silencio. Se arma al vuelo desde la
      // rutina vigente.
      cardio: prev.cardio
        ? { ...prev.cardio, done: !prev.cardio.done }
        : { nombre: dia.cardio?.nombre || 'Cardio', done: true }
    }))
  }

  const cambiarNotas = (notas) => setSesion((prev) => ({ ...prev, notas }))

  // Finaliza: guarda en historial, recalcula PRs, limpia el borrador del día.
  // `finalizada` es la intención; `completadaEn`, solo el cuándo.
  // `paso` es estado de la pantalla, no del entrenamiento: no entra al historial.
  const finalizar = () => {
    const { paso: _enPantalla, ...limpia } = sesion
    const finalizada = { ...limpia, finalizada: true, completadaEn: ahoraISO() }
    saveSession(finalizada)
    const { nuevos } = actualizarPRs(finalizada)
    clearActiveSession(diaKey)
    timer.detener()
    onFinalizada(nuevos)
  }

  const totalSets = sesion.ejercicios.reduce((a, e) => a + e.sets.length, 0)
  const hechos = sesion.ejercicios.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0)
  const progreso = totalSets ? Math.round((hechos / totalSets) * 100) : 0

  // ¿Este paso está hecho? El calentamiento y el cierre no se "completan": no
  // son deuda, y pintarlos como pendientes sería reprochar algo que no falta.
  const pasoCompleto = (p) => {
    if (p.tipo === 'ejercicio') return ejercicioCompleto(sesion.ejercicios[p.idx])
    if (p.tipo === 'cardio') return !!sesion.cardio?.done
    return false
  }

  const hayAnterior = paso > 0
  const haySiguiente = paso < pasos.length - 1
  // Sugerencia, no movimiento: cuando el paso está listo, "Siguiente" se
  // enciende. La pantalla no se mueve sola.
  const listoParaSeguir = pasoCompleto(actual)

  return (
    <div className="animate-in pb-44">
      {/* Encabezado pegajoso: día, progreso y la tira de pasos.
          Nunca lo tapa el cronómetro, que vive abajo. */}
      <div className="sticky top-0 z-30 space-y-2 border-b border-borde/25 bg-superficie/90 px-4 py-3 backdrop-blur-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={onSalir}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-texto-soft active:bg-superficie-alta"
            aria-label="Volver"
          >
            <IconChevronLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold leading-tight tracking-tight text-texto">{dia.nombre}</h1>
            <div className="mt-1.5 flex items-center gap-2">
              {/* Progreso = turquesa. El avance de la sesión es completado, no
                  marca. */}
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-superficie-alta">
                <div className="h-full rounded-full bg-completo transition-all" style={{ width: `${progreso}%` }} />
              </div>
              <span className="text-xs font-bold tabular-nums text-completo">{hechos}/{totalSets}</span>
            </div>
          </div>
        </div>

        {/* Navegación + tira, en una fila y ARRIBA.
            Abajo sería el pulgar, pero abajo vive el cronómetro (fijo, a nivel
            de app) y lo tapaba justo en el único momento en que hace falta pasar
            de ejercicio: al terminar la última serie, que es cuando arranca el
            descanso. Un botón medio tapado no es un botón. Acá siempre está
            entero y no cuesta scroll. */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => irAPaso(paso - 1)}
            disabled={!hayAnterior}
            aria-label="Paso anterior"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-superficie-alta text-texto active:scale-90 disabled:opacity-30"
          >
            <IconChevronLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <TiraPasos pasos={pasos} actual={paso} onIr={irAPaso} completo={pasoCompleto} />
          </div>

          {/* Se enciende cuando el paso está listo: sugiere, no empuja. */}
          <button
            onClick={() => irAPaso(paso + 1)}
            disabled={!haySiguiente}
            aria-label="Paso siguiente"
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors active:scale-90 disabled:opacity-30 ${
              listoParaSeguir && haySiguiente ? 'bg-marca-fuerte text-contraste-fuerte' : 'bg-superficie-alta text-texto'
            }`}
          >
            <IconChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Dónde estoy y qué viene. Saber qué sigue deja preparar la barra o el
          peso antes de llegar; la tira sola da la posición, no el plan. */}
      <div className="px-4 pt-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-texto-soft">
          Paso {paso + 1} de {pasos.length}
          {haySiguiente && (
            <span className="font-medium normal-case text-texto-soft/70"> · sigue {pasos[paso + 1].titulo}</span>
          )}
        </p>
      </div>

      <div className="space-y-4 p-4 pt-2">
        {actual.tipo === 'calentamiento' && (
          <div className="rounded-2xl border border-borde/25 bg-superficie p-4 shadow-suave">
            <h2 className="flex items-center gap-2 font-bold text-texto">
              <IconFlame className="h-5 w-5 shrink-0 text-marca" /> Calentamiento y activación
            </h2>
            {dia.calentamiento && <p className="mt-2 text-sm text-texto-soft">{dia.calentamiento}</p>}
            {(dia.activacion || []).length > 0 && (
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-texto-soft">
                {dia.activacion.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {actual.tipo === 'ejercicio' && (
          <>
            {/* SEAM DE LA IMAGEN DEL EJERCICIO.
                El renderer compartido del catálogo (que resuelve `media_id` y
                maneja el caso ausente/fallido) todavía no existe en el repo.
                Cuando llegue, esto es UNA línea:
                  <MediaEjercicio mediaId={sesion.ejercicios[actual.idx].mediaId} />
                No se escribe acá un segundo renderer ni un segundo fallback: sin
                imagen no se pinta nada, y no hay hueco roto. `media_id` es
                opcional para siempre (rutina propia, ejercicios fuera de
                catálogo), así que "sin imagen" es lo NORMAL, no una falla. */}
            <ExerciseCard
              ejercicio={sesion.ejercicios[actual.idx]}
              anteriores={anteriores.current[sesion.ejercicios[actual.idx].nombre]}
              aprox={aprox.current[sesion.ejercicios[actual.idx].nombre]}
              prInfo={prs.current[sesion.ejercicios[actual.idx].nombre]}
              onChangeSet={(setIdx, campo, valor) => cambiarSet(actual.idx, setIdx, campo, valor)}
              onToggleSet={(setIdx) => toggleSet(actual.idx, setIdx)}
              onAddSet={() => agregarSet(actual.idx)}
              onRemoveSet={() => quitarSet(actual.idx)}
            />
          </>
        )}

        {actual.tipo === 'cardio' && dia.cardio && (
          <CardioCard
            cardio={dia.cardio}
            protocolo={dia.cardio.protocolo}
            done={sesion.cardio?.done}
            onToggle={toggleCardio}
          />
        )}

        {actual.tipo === 'cierre' && (
          <>
            <div className="rounded-2xl border border-borde/25 bg-superficie p-4 shadow-suave">
              <label className="mb-2 flex items-center gap-2 text-sm font-bold text-texto">
                <IconNote className="h-5 w-5 text-marca" /> ¿Cómo me sentí?
              </label>
              <textarea
                value={sesion.notas}
                onChange={(e) => cambiarNotas(e.target.value)}
                placeholder="Energía, fatiga, dolores, motivación..."
                rows={3}
                className="w-full resize-none rounded-xl border border-borde/25 bg-fondo p-3 text-sm text-texto outline-none focus:border-marca"
              />
            </div>

            {/* El promedio manda: terminar con series sin marcar no es un fracaso. */}
            <p className="px-1 text-xs font-medium leading-relaxed text-texto-soft">
              {hechos}/{totalSets} series registradas. Terminar guarda lo que hiciste; lo que quedó sin
              marcar simplemente no se cuenta.
            </p>

            <button
              onClick={finalizar}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-completo py-4 text-lg font-extrabold text-contraste shadow-lg active:scale-95"
            >
              <IconCheck className="h-6 w-6" /> Finalizar entrenamiento
            </button>
          </>
        )}

        {/* La navegación NO se repite acá abajo a propósito. Sería el pulgar,
            pero el cronómetro (fijo, borde inferior) la tapaba a la mitad justo
            al terminar la última serie —el momento exacto de pasar de
            ejercicio—. Un control medio tapado no es un control, y dos
            navegaciones para lo mismo confunden. Vive arriba, entera, siempre. */}
      </div>
      {/* El panel del cronómetro lo renderiza App: sigue visible al navegar. */}
    </div>
  )
}
