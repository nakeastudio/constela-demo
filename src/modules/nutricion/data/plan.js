// ============================================================
//  PLANTILLA DE PLAN DE NUTRICIÓN  (semilla genérica — se edita en la app)
// ============================================================
// Esto NO es el plan de nadie: es un ejemplo neutro para que la pantalla tenga
// forma desde la primera apertura. Los números son redondos y de referencia.
//
// Un plan real (objetivos, comidas, suplementos) es DATO, no código: cambia
// cuando cambia el cuerpo, la rutina o el consejo de un profesional. Vive en
// almacenamiento y se edita desde la app. Nada personal entra a este archivo.
//
// Espeja la forma de modules/gym/data/rutina.js: la constante es SEMILLA, no
// fuente viva. getPlan() devuelve la copia guardada; para volver a esta
// plantilla existe "Restaurar el plan original".
//
// Los días comparten plantillas de comidas: la relación día→comidas es dato,
// no literales repetidos.
//
//   tipo:      'gym' | 'trabajo' | 'descanso'
//   categoria: da el color de la tarjeta (ver COLOR_CATEGORIA abajo)
//   carbo:     true → la comida pide elegir UN carbo de la tabla de canje

// --- Comidas de un día de entrenamiento ---
const COMIDAS_GYM = [
  {
    id: 'desayuno',
    categoria: 'desayuno',
    titulo: 'Desayuno',
    items: ['Porción de proteína', 'Lácteo o fermentado', 'Fruta']
  },
  {
    id: 'almuerzo',
    categoria: 'almuerzo',
    titulo: 'Almuerzo',
    items: ['Porción de proteína magra', 'Verduras'],
    carbo: true
  },
  {
    id: 'postEntreno',
    categoria: 'postEntreno',
    titulo: 'Post-entreno',
    items: ['Batido de proteína + agua'],
    detalle: 'Dentro de la primera hora'
  },
  {
    id: 'cena',
    categoria: 'cena',
    titulo: 'Cena',
    items: ['Porción de proteína', 'Verduras o fruta']
  }
]

// --- Comidas de un día sin entrenamiento, fuera de casa ---
const COMIDAS_TRABAJO = [
  {
    id: 'desayuno',
    categoria: 'desayuno',
    titulo: 'Desayuno',
    items: ['Batido de proteína + agua'],
    detalle: 'Llevar en shaker o térmico'
  },
  {
    id: 'mediaManana',
    categoria: 'almuerzo',
    titulo: 'Media mañana',
    items: ['Tupper: porción de proteína', 'Porción de carbo', 'Fruta']
  },
  {
    id: 'cafe',
    categoria: 'cafe',
    titulo: 'Café',
    items: ['Café sin azúcar']
  },
  {
    id: 'cena',
    categoria: 'cena',
    titulo: 'Cena',
    items: ['Porción de proteína', 'Fruta']
  }
]

// --- Comidas de un día de descanso ---
const COMIDAS_DESCANSO = [
  {
    id: 'desayuno',
    categoria: 'desayuno',
    titulo: 'Desayuno',
    items: ['Porción de proteína', 'Lácteo o fermentado', 'Fruta']
  },
  {
    id: 'almuerzo',
    categoria: 'almuerzo',
    titulo: 'Almuerzo',
    items: ['Porción de proteína magra', 'Verduras'],
    carbo: true
  },
  {
    id: 'cena',
    categoria: 'cena',
    titulo: 'Cena',
    items: ['Porción de proteína', 'Verduras o fruta']
  }
]

// Objetivos de ejemplo. Redondos a propósito: son un punto de partida para
// editar, no una recomendación. Los reales se cargan desde la app.
const OBJETIVOS_GYM = { kcal: 2000, proteina: 130, carbos: 200, grasa: 60 }
const OBJETIVOS_TRABAJO = { kcal: 1800, proteina: 120, carbos: 180, grasa: 55 }
const OBJETIVOS_DESCANSO = { kcal: 1700, proteina: 110, carbos: 160, grasa: 55 }

export const PLAN_INICIAL = {
  // Versión de la plantilla. Sube si la plantilla cambia; sirve para avisar
  // que hay una versión nueva sin pisar lo que se haya editado.
  version: 1,

  dias: {
    lunes: {
      nombre: 'Lunes',
      tipo: 'gym',
      entreno: 'Día de entrenamiento',
      objetivos: OBJETIVOS_GYM,
      comidas: COMIDAS_GYM,
      nota: ''
    },
    martes: {
      nombre: 'Martes',
      tipo: 'trabajo',
      entreno: null,
      objetivos: OBJETIVOS_TRABAJO,
      comidas: COMIDAS_TRABAJO,
      nota: 'Preparar el tupper la noche anterior'
    },
    miercoles: {
      nombre: 'Miércoles',
      tipo: 'gym',
      entreno: 'Día de entrenamiento',
      objetivos: OBJETIVOS_GYM,
      comidas: COMIDAS_GYM,
      nota: ''
    },
    jueves: {
      nombre: 'Jueves',
      tipo: 'trabajo',
      entreno: null,
      objetivos: OBJETIVOS_TRABAJO,
      comidas: COMIDAS_TRABAJO,
      nota: 'Preparar el tupper la noche anterior'
    },
    viernes: {
      nombre: 'Viernes',
      tipo: 'gym',
      entreno: 'Día de entrenamiento',
      objetivos: OBJETIVOS_GYM,
      comidas: COMIDAS_GYM,
      nota: ''
    },
    sabado: {
      nombre: 'Sábado',
      tipo: 'gym',
      entreno: 'Día de entrenamiento',
      objetivos: OBJETIVOS_GYM,
      comidas: COMIDAS_GYM,
      nota: ''
    },
    domingo: {
      nombre: 'Domingo',
      tipo: 'descanso',
      entreno: null,
      objetivos: OBJETIVOS_DESCANSO,
      comidas: COMIDAS_DESCANSO,
      nota: 'Descanso — sin batido'
    }
  },

  // Tabla de canje: elegir UNO por comida principal. La UI lo resuelve con un
  // selector único, así que la regla "nunca dos carbos" no necesita validarse:
  // no se puede expresar. Porciones y kcal son de referencia general.
  carbos: [
    { id: 'arroz', nombre: 'Arroz cocido', porcion: '100g', kcal: 130 },
    { id: 'papa', nombre: 'Papa sancochada', porcion: '150g', kcal: 120 },
    { id: 'pasta', nombre: 'Pasta cocida', porcion: '100g', kcal: 130 },
    { id: 'legumbre', nombre: 'Legumbre cocida', porcion: '150g', kcal: 175, extra: 'suma proteína extra' },
    { id: 'avena', nombre: 'Avena', porcion: '40g', kcal: 150 },
    { id: 'pan', nombre: 'Pan integral', porcion: '60g', kcal: 150 }
  ],

  // AM/PM: no son comidas y siguen otro ritmo, por eso se marcan aparte.
  // Ejemplos genéricos — los reales se cargan desde la app.
  suplementos: [
    { id: 'am1', nombre: 'Suplemento de la mañana', momento: 'am', detalle: 'Con el desayuno' },
    { id: 'pm1', nombre: 'Suplemento de la noche', momento: 'pm', detalle: 'Antes de dormir' }
  ],

  frutas: [
    { nombre: 'Fruta rica en carbos', cuando: 'Días de entrenamiento' },
    { nombre: 'Fruta cítrica', cuando: 'Cualquier día' },
    { nombre: 'Fruta ligera', cuando: 'Cena o días sin entrenamiento' }
  ],

  agua: { normal: 2, gym: 2.5 },

  reglas: [
    'Proteína primero — nunca la recortes para un déficit más agresivo',
    'Un solo carbo por comida principal',
    'Batido post-entreno dentro de la primera hora',
    'Preparar el tupper la noche anterior',
    'La balanza miente — medite por cómo te queda la ropa',
    'Constancia > perfección — un día malo no arruina nada',
    'Hidratación: alcanza el objetivo del día, y algo más los días de entrenamiento'
  ]
}

// --- Claves de día en orden de semana (lunes primero, como dates.js) ---
export const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

// Date.getDay() → 0=domingo. Mapea a nuestras claves.
const POR_INDICE = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

export function claveDiaDeFecha(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return POR_INDICE[new Date(y, m - 1, d, 12, 0, 0).getDay()]
}

// Tinte por categoría de comida. Los cuatro pasteles se reservaron para esto.
// `cafe` no lleva tinte a propósito: no es una comida, es un ritual, y se lee
// más liviano sobre superficie neutra.
export const COLOR_CATEGORIA = {
  desayuno: 'tinte-agua',
  almuerzo: 'tinte-lavanda',
  postEntreno: 'tinte-cardo',
  cena: 'tinte-orquidea'
}

export function litrosObjetivo(dia) {
  return dia?.tipo === 'gym' ? PLAN_INICIAL.agua.gym : PLAN_INICIAL.agua.normal
}

// El techo útil de proteína se DERIVA del peso del perfil, no se guarda como
// prosa ni como número fijo: si cambia el peso, cambia el número solo.
export const FACTOR_PROTEINA = 2

export function techoProteina(peso) {
  const p = Number(peso)
  return p > 0 ? Math.round(p * FACTOR_PROTEINA) : null
}

// ============================================================
//  HELPERS DE EDICIÓN  (espejo de los de data/rutina.js)
// ============================================================

export const TIPOS_DIA = {
  gym: 'Entrenamiento',
  trabajo: 'Trabajo',
  descanso: 'Descanso'
}

// Categorías que llevan tinte + el café, que va neutro.
export const CATEGORIAS = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo / principal',
  postEntreno: 'Post-entreno',
  cena: 'Cena',
  cafe: 'Café / otro'
}

// Id estable y opaco para comidas nuevas: el id es la clave del registro
// diario, así que no puede derivarse del título (renombrar perdería lo
// marcado). Misma razón que los ids de sesión en el gym.
function nuevoId(prefijo) {
  if (globalThis.crypto?.randomUUID) return `${prefijo}_${globalThis.crypto.randomUUID().slice(0, 8)}`
  return `${prefijo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function comidaVacia() {
  return { id: nuevoId('comida'), categoria: 'desayuno', titulo: 'Nueva comida', items: ['Nuevo ítem'] }
}

export function suplementoVacio() {
  return { id: nuevoId('sup'), nombre: 'Nuevo suplemento', momento: 'am', detalle: '' }
}

export function carboVacio() {
  return { id: nuevoId('carbo'), nombre: 'Nuevo carbo', porcion: '100g', kcal: 100 }
}

export function diaVacio(nombre) {
  return {
    nombre: nombre || 'Nuevo día',
    tipo: 'descanso',
    entreno: null,
    objetivos: { kcal: 1800, proteina: 110, carbos: 180, grasa: 55 },
    comidas: [comidaVacia()],
    nota: ''
  }
}

// Valida/normaliza un plan importado (JSON del nutricionista o de una IA).
// Lanza error si la forma es inválida; completa lo que falte con defaults.
export function validarPlan(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error('El plan debe ser un objeto con días.')
  }
  if (!obj.dias || typeof obj.dias !== 'object') {
    throw new Error('El plan no tiene días (falta la clave "dias").')
  }
  const dias = {}
  DIAS_SEMANA.forEach((k) => {
    const d = obj.dias[k]
    if (!d) return
    if (!Array.isArray(d.comidas)) {
      throw new Error(`El día "${k}" no tiene una lista de comidas válida.`)
    }
    dias[k] = {
      nombre: typeof d.nombre === 'string' ? d.nombre : k,
      tipo: TIPOS_DIA[d.tipo] ? d.tipo : 'descanso',
      entreno: typeof d.entreno === 'string' ? d.entreno : null,
      objetivos: {
        kcal: Number(d.objetivos?.kcal) || 0,
        proteina: Number(d.objetivos?.proteina) || 0,
        carbos: Number(d.objetivos?.carbos) || 0,
        ...(d.objetivos?.grasa ? { grasa: Number(d.objetivos.grasa) } : {})
      },
      comidas: d.comidas.map((c) => ({
        id: typeof c.id === 'string' && c.id ? c.id : nuevoId('comida'),
        categoria: CATEGORIAS[c.categoria] ? c.categoria : 'desayuno',
        titulo: typeof c.titulo === 'string' ? c.titulo : 'Comida',
        items: Array.isArray(c.items) ? c.items.filter((x) => typeof x === 'string') : [],
        ...(c.detalle ? { detalle: String(c.detalle) } : {}),
        ...(c.carbo ? { carbo: true } : {})
      })),
      nota: typeof d.nota === 'string' ? d.nota : ''
    }
  })
  if (Object.keys(dias).length === 0) throw new Error('El plan no tiene ningún día válido.')

  return {
    version: Number(obj.version) || PLAN_INICIAL.version,
    dias,
    carbos: Array.isArray(obj.carbos)
      ? obj.carbos.map((c) => ({
          id: typeof c.id === 'string' && c.id ? c.id : nuevoId('carbo'),
          nombre: typeof c.nombre === 'string' ? c.nombre : 'Carbo',
          porcion: typeof c.porcion === 'string' ? c.porcion : '',
          kcal: Number(c.kcal) || 0,
          ...(c.extra ? { extra: String(c.extra) } : {})
        }))
      : PLAN_INICIAL.carbos,
    suplementos: Array.isArray(obj.suplementos)
      ? obj.suplementos.map((s) => ({
          id: typeof s.id === 'string' && s.id ? s.id : nuevoId('sup'),
          nombre: typeof s.nombre === 'string' ? s.nombre : 'Suplemento',
          momento: s.momento === 'pm' ? 'pm' : 'am',
          detalle: typeof s.detalle === 'string' ? s.detalle : ''
        }))
      : PLAN_INICIAL.suplementos,
    frutas: Array.isArray(obj.frutas) ? obj.frutas : PLAN_INICIAL.frutas,
    agua: {
      normal: Number(obj.agua?.normal) || PLAN_INICIAL.agua.normal,
      gym: Number(obj.agua?.gym) || PLAN_INICIAL.agua.gym
    },
    reglas: Array.isArray(obj.reglas) ? obj.reglas.filter((x) => typeof x === 'string') : PLAN_INICIAL.reglas
  }
}
