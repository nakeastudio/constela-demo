// ============================================================
//  PLANTILLA DE RUTINAS DE SKINCARE  (semilla genérica — se edita en la app)
// ============================================================
// Esto NO es la rutina de nadie: es un ejemplo neutro para que la pantalla
// tenga forma desde la primera apertura. Sin marcas, sin productos reales,
// sin la asignación de días de una persona concreta.
//
// Una rutina real (nombres, días, activos, tiempos de espera) es DATO, no
// código: cambia con la piel, la estación y el consejo de un profesional. Vive
// en almacenamiento y se edita desde la app. Nada personal entra a este archivo.
//
// Espeja la forma de modules/nutricion/data/plan.js: la constante es SEMILLA,
// no fuente viva. getRutinas() devuelve la copia guardada; para volver a esta
// plantilla existe "Restaurar las rutinas originales".
//
// El modelo: una rutina tiene un NOMBRE, un conjunto de DÍAS en los que aplica,
// y una lista ORDENADA de pasos. Más de una rutina puede caer el mismo día
// (mañana + una de noche): por eso un día puede tener varias rutinas, a
// diferencia del gym, que tiene una sesión.
//
//   paso:
//     nombre       'Limpieza', 'Sérum'…
//     descripcion  (opcional) texto libre de apoyo
//     espera       (opcional) segundos a esperar DESPUÉS del paso, antes del
//                  siguiente. Es el ⏳: se guarda en segundos y se muestra amable.

// El vocabulario de días de la semana es único en la app: se reutiliza el de
// nutrición en lugar de declarar un segundo. `claveDiaDeFecha` también, para
// que "qué día es esta fecha" se resuelva en un solo lugar.
import { DIAS_SEMANA, claveDiaDeFecha } from '../../nutricion/data/plan.js'

export { DIAS_SEMANA, claveDiaDeFecha }

// Etiquetas cortas y largas de cada día, para el editor (chips) y para nombrar
// a qué días aplica una rutina. No es un segundo vocabulario: son rótulos del
// mismo `DIAS_SEMANA`.
export const DIA_CORTO = {
  lunes: 'Lun',
  martes: 'Mar',
  miercoles: 'Mié',
  jueves: 'Jue',
  viernes: 'Vie',
  sabado: 'Sáb',
  domingo: 'Dom'
}
export const DIA_LARGO = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo'
}

export const RUTINAS_INICIAL = {
  // Versión de la plantilla. Sube si la plantilla cambia; sirve para ofrecer
  // restaurar sin pisar por sorpresa lo que ya se editó.
  version: 1,

  rutinas: [
    {
      id: 'rut_manana',
      nombre: 'Rutina de mañana',
      dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
      pasos: [
        { id: 'paso_m1', nombre: 'Limpieza', descripcion: 'Limpiador suave o solo agua' },
        { id: 'paso_m2', nombre: 'Sérum' },
        { id: 'paso_m3', nombre: 'Hidratante' },
        { id: 'paso_m4', nombre: 'Protector solar', descripcion: 'Todos los días, incluso nublado' }
      ]
    },
    {
      id: 'rut_noche',
      nombre: 'Rutina de noche',
      dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
      pasos: [
        { id: 'paso_n1', nombre: 'Desmaquillante' },
        { id: 'paso_n2', nombre: 'Limpieza' },
        {
          id: 'paso_n3',
          nombre: 'Tratamiento',
          descripcion: 'Aplica tu activo (por ejemplo un exfoliante o un retinoide)',
          espera: 300
        },
        { id: 'paso_n4', nombre: 'Hidratante' }
      ]
    }
  ]
}

// ============================================================
//  HELPERS DE EDICIÓN  (espejo de los de data/plan.js)
// ============================================================

// Id estable y opaco para rutinas y pasos nuevos: el id de un paso es la clave
// de su registro diario, así que no puede derivarse del nombre (renombrar un
// paso perdería lo marcado). Misma razón que los ids de comida y de sesión.
function nuevoId(prefijo) {
  if (globalThis.crypto?.randomUUID) return `${prefijo}_${globalThis.crypto.randomUUID().slice(0, 8)}`
  return `${prefijo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function pasoVacio() {
  return { id: nuevoId('paso'), nombre: 'Nuevo paso' }
}

export function rutinaVacia() {
  return {
    id: nuevoId('rut'),
    nombre: 'Nueva rutina',
    dias: [...DIAS_SEMANA],
    pasos: [pasoVacio()]
  }
}

// --- Espera: segundos ⇄ texto amable ---
// La espera SIEMPRE se guarda en segundos (una sola unidad interna: el
// cronómetro compartido ya habla segundos, así no hay que convertir al
// dispararlo ni migrar nada cuando se edita). La unidad de ENTRADA (min o seg)
// es solo una afordancia del editor; lo que se persiste es el número de
// segundos, nunca un par número+unidad.
//
// Se muestra amable en todos lados: "12 min", "30 seg", "1 min 30 seg" para lo
// mixto — nunca "750 seg". Vaciar el campo quita la espera (undefined), no la
// pone en 0: "sin espera" es un estado, no una espera de cero.
export function formatearEspera(segundos) {
  const s = Math.round(Number(segundos))
  if (!s || s <= 0) return ''
  const min = Math.floor(s / 60)
  const seg = s % 60
  if (min && seg) return `${min} min ${seg} seg`
  if (min) return `${min} min`
  return `${seg} seg`
}

// ============================================================
//  VALIDACIÓN  (JSON pegado desde una IA o un respaldo)
// ============================================================
// Valida/normaliza rutinas importadas. Lanza si la forma es inválida; completa
// lo que falte con defaults. Los pasos sin id reciben uno opaco nuevo: un JSON
// escrito a mano no tiene por qué traerlos.
export function validarRutinas(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error('Las rutinas deben ser un objeto con una lista "rutinas".')
  }
  if (!Array.isArray(obj.rutinas)) {
    throw new Error('Falta la lista "rutinas".')
  }

  const rutinas = obj.rutinas.map((r) => {
    if (!r || typeof r !== 'object') throw new Error('Cada rutina debe ser un objeto.')
    const dias = Array.isArray(r.dias) ? r.dias.filter((d) => DIAS_SEMANA.includes(d)) : []
    const pasos = Array.isArray(r.pasos)
      ? r.pasos.map((p) => {
          if (!p || typeof p !== 'object') throw new Error('Cada paso debe ser un objeto.')
          const espera = Number(p.espera)
          return {
            id: typeof p.id === 'string' && p.id ? p.id : nuevoId('paso'),
            nombre: typeof p.nombre === 'string' && p.nombre ? p.nombre : 'Paso',
            ...(typeof p.descripcion === 'string' && p.descripcion.trim()
              ? { descripcion: p.descripcion.trim() }
              : {}),
            ...(espera > 0 ? { espera: Math.round(espera) } : {})
          }
        })
      : []
    return {
      id: typeof r.id === 'string' && r.id ? r.id : nuevoId('rut'),
      nombre: typeof r.nombre === 'string' && r.nombre ? r.nombre : 'Rutina',
      dias,
      pasos
    }
  })

  if (rutinas.length === 0) throw new Error('No hay ninguna rutina válida.')

  return {
    version: Number(obj.version) || RUTINAS_INICIAL.version,
    rutinas
  }
}
