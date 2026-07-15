// ============================================================
//  PLANTILLA DE RUTINA  (semilla genérica — se edita en la app)
// ============================================================
// Esto NO es la rutina de nadie: es un ejemplo neutro de 4 días para que la app
// tenga forma desde la primera apertura. Una rutina real es DATO, no código:
// cambia con el cuerpo, el gimnasio y el consejo de un profesional. Vive en
// almacenamiento y se edita desde "Ajustes → Editar rutina".
//
// La rutina GUARDADA siempre gana sobre esta plantilla (ver getRutina() en
// lib/storage.js), así que cambiarla acá no toca los datos de quien ya usa la
// app: solo cambia el punto de partida de una instalación nueva.
//
// Cada ejercicio trae su `descanso` en segundos: el cronómetro lo usa
// automáticamente al completar una serie.
//   - tipoReg: 'peso' (default) | 'tiempo' (registra segundos) | 'cardio'
//   - grupo: para el cálculo de volumen semanal por músculo
//   - aprox: series de aproximación (calentamiento progresivo). NO cuentan como
//     volumen ni se registran: solo preparan músculo y articulación.

export const RUTINA_INICIAL = {
  dia1: {
    nombre: 'Día 1 — Tren inferior',
    tipo: 'fuerza',
    calentamiento: 'Caminadora 5 min · inclinación suave · ritmo cómodo',
    activacion: [
      'Puente de glúteo 1×15',
      'Sentadilla al aire 1×10',
      'Zancada al aire 1×8 por pierna'
    ],
    ejercicios: [
      { nombre: 'Sentadilla', series: 4, reps: '6-8', descanso: 120, grupo: 'cuadriceps', aprox: ['1×10 al 50%', '1×5 al 70%'] },
      { nombre: 'Peso muerto rumano', series: 4, reps: '8-10', descanso: 120, grupo: 'isquios', aprox: ['1×8 al 50-60%'] },
      { nombre: 'Zancada con mancuernas', series: 3, reps: '8-10 c/pierna', descanso: 90, grupo: 'gluteo' },
      { nombre: 'Extensión de cuádriceps', series: 3, reps: '12-15', descanso: 45, grupo: 'cuadriceps' },
      { nombre: 'Abducción de cadera', series: 3, reps: '15-20', descanso: 45, grupo: 'gluteo' }
    ],
    core: [],
    cardio: null
  },

  dia2: {
    nombre: 'Día 2 — Tracción + Brazos + Core + Cardio',
    tipo: 'fuerza',
    calentamiento: 'Caminadora 5 min · inclinación suave · ritmo cómodo',
    activacion: ['Rotaciones de hombro 10 por lado', 'Face Pull muy ligero 1×15', 'Remo ligero 1×12'],
    ejercicios: [
      { nombre: 'Remo sentado en polea', series: 4, reps: '10-12', descanso: 90, grupo: 'espalda', aprox: ['1×12 ligero'] },
      { nombre: 'Remo a una mano con mancuerna', series: 3, reps: '10-12 c/lado', descanso: 90, grupo: 'espalda' },
      { nombre: 'Face Pull (cuerda)', series: 3, reps: '12-15', descanso: 60, grupo: 'espalda' },
      { nombre: 'Aperturas posteriores', series: 3, reps: '12-15', descanso: 60, grupo: 'espalda' },
      { nombre: 'Curl martillo', series: 3, reps: '10-12', descanso: 60, grupo: 'brazos' },
      { nombre: 'Extensión de tríceps en polea', series: 3, reps: '10-12', descanso: 60, grupo: 'brazos' }
    ],
    core: [
      { nombre: 'Plancha', series: 3, reps: '30-45 seg', descanso: 45, tipoReg: 'tiempo', grupo: 'core' },
      { nombre: 'Crunch en polea', series: 3, reps: '12-15', descanso: 45, grupo: 'core' }
    ],
    cardio: {
      nombre: 'Caminata inclinada — 20 min',
      protocolo: [
        { min: '0-5', inclinacion: '5%', velocidad: '4.0 km/h' },
        { min: '5-10', inclinacion: '10%', velocidad: '4.0 km/h' },
        { min: '10-15', inclinacion: '5%', velocidad: '4.5 km/h' },
        { min: '15-20', inclinacion: '8%', velocidad: '4.0 km/h' }
      ]
    }
  },

  dia3: {
    nombre: 'Día 3 — Tren inferior (2º estímulo)',
    tipo: 'fuerza',
    calentamiento: 'Caminadora 5 min · inclinación suave · ritmo cómodo',
    activacion: ['Puente de glúteo 1×15', 'Sentadilla al aire 1×10', 'Zancada al aire 1×8 por pierna'],
    ejercicios: [
      { nombre: 'Sentadilla goblet', series: 4, reps: '10-12', descanso: 90, grupo: 'cuadriceps', aprox: ['1×12 ligero'] },
      { nombre: 'Prensa de piernas', series: 3, reps: '12-15', descanso: 90, grupo: 'cuadriceps', aprox: ['1×15 al 50%'] },
      { nombre: 'Empuje de cadera', series: 3, reps: '10-12', descanso: 90, grupo: 'gluteo' },
      { nombre: 'Curl femoral', series: 3, reps: '12-15', descanso: 60, grupo: 'isquios' },
      { nombre: 'Aducción de cadera', series: 3, reps: '12-15', descanso: 60, grupo: 'cuadriceps' }
    ],
    core: [],
    cardio: null
  },

  dia4: {
    nombre: 'Día 4 — Empuje + Core + Cardio',
    tipo: 'fuerza',
    calentamiento: 'Caminadora 5 min · inclinación suave · ritmo cómodo',
    activacion: ['Rotaciones de hombro 10 por lado', 'Flexiones en pared 1×10', 'Press ligero 1×12'],
    ejercicios: [
      { nombre: 'Press de banca con mancuernas', series: 4, reps: '8-10', descanso: 120, grupo: 'brazos', aprox: ['1×10 al 50%'] },
      { nombre: 'Press de hombro', series: 3, reps: '10-12', descanso: 90, grupo: 'brazos' },
      { nombre: 'Jalón al pecho', series: 3, reps: '10-12', descanso: 90, grupo: 'espalda' },
      { nombre: 'Elevaciones laterales', series: 3, reps: '12-15', descanso: 60, grupo: 'brazos' },
      { nombre: 'Extensión de espalda', series: 3, reps: '10-12', descanso: 60, grupo: 'gluteo' }
    ],
    core: [
      { nombre: 'Elevación de piernas colgada', series: 3, reps: '10-12', descanso: 45, grupo: 'core' },
      { nombre: 'Dead Bug', series: 3, reps: '8-10 c/lado', descanso: 45, grupo: 'core' }
    ],
    cardio: {
      nombre: 'Caminata inclinada — 15-20 min',
      protocolo: [
        { min: '0-5', inclinacion: '5%', velocidad: '4.0 km/h' },
        { min: '5-10', inclinacion: '10%', velocidad: '4.0 km/h' },
        { min: '10-15', inclinacion: '5%', velocidad: '4.5 km/h' },
        { min: '15-20', inclinacion: '8%', velocidad: '4.0 km/h' }
      ]
    }
  }
}

// Orden inicial de los días (semilla). La rutina real es editable: los días
// se derivan con clavesDia() para soportar agregar/quitar días dinámicamente.
export const DIAS_KEYS = ['dia1', 'dia2', 'dia3', 'dia4']

// Claves de día en orden de inserción (dia1, dia2, ...)
export function clavesDia(rutina) {
  return Object.keys(rutina)
}

// Genera la próxima clave libre: dia{N+1} sobre el mayor sufijo numérico
export function siguienteClaveDia(rutina) {
  const nums = Object.keys(rutina)
    .map((k) => parseInt(String(k).replace(/\D/g, ''), 10))
    .filter((n) => !isNaN(n))
  const max = nums.length ? Math.max(...nums) : 0
  return `dia${max + 1}`
}

// Estructura de un día nuevo y vacío
export function diaVacio(numero) {
  return {
    nombre: `Día ${numero} — Nuevo`,
    tipo: 'fuerza',
    calentamiento: '',
    activacion: [],
    ejercicios: [],
    core: [],
    cardio: null
  }
}

// Protocolo de cardio por defecto (al activar cardio en un día)
export function cardioVacio() {
  return {
    nombre: 'Caminata inclinada — 15 min',
    protocolo: [
      { min: '0-5', inclinacion: '5%', velocidad: '4.0 km/h' },
      { min: '5-10', inclinacion: '10%', velocidad: '4.0 km/h' },
      { min: '10-15', inclinacion: '5%', velocidad: '4.5 km/h' }
    ]
  }
}

// Valida/normaliza una rutina importada (JSON del coach o de Claude).
// Lanza error si la forma es inválida; completa campos faltantes con defaults.
export function validarRutina(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error('La rutina debe ser un objeto con días (dia1, dia2, ...).')
  }
  const claves = Object.keys(obj)
  if (claves.length === 0) throw new Error('La rutina no tiene días.')

  const limpia = {}
  claves.forEach((k, i) => {
    const d = obj[k] || {}
    if (!Array.isArray(d.ejercicios)) {
      throw new Error(`El día "${k}" no tiene una lista de ejercicios válida.`)
    }
    limpia[k] = {
      nombre: typeof d.nombre === 'string' ? d.nombre : `Día ${i + 1}`,
      tipo: d.tipo || 'fuerza',
      calentamiento: typeof d.calentamiento === 'string' ? d.calentamiento : '',
      activacion: Array.isArray(d.activacion) ? d.activacion.filter((x) => typeof x === 'string') : [],
      ejercicios: d.ejercicios.map((e) => normalizarEjercicio(e)),
      core: Array.isArray(d.core) ? d.core.map((e) => normalizarEjercicio(e)) : [],
      cardio: d.cardio && typeof d.cardio === 'object' ? d.cardio : null
    }
  })
  return limpia
}

function normalizarEjercicio(e) {
  e = e || {}
  return {
    nombre: typeof e.nombre === 'string' ? e.nombre : 'Ejercicio',
    series: Number(e.series) > 0 ? Number(e.series) : 3,
    reps: typeof e.reps === 'string' || typeof e.reps === 'number' ? String(e.reps) : '10-12',
    descanso: Number(e.descanso) >= 0 ? Number(e.descanso) : 60,
    grupo: typeof e.grupo === 'string' ? e.grupo : 'gluteo',
    ...(e.tipoReg ? { tipoReg: e.tipoReg } : {}),
    // Opcional, igual que tipoReg y aprox: pasa si está, se omite si no.
    // Solo lo traen los ejercicios elegidos del catálogo. Los cargados a mano y
    // los de cualquier rutina anterior no tienen, y así se quedan: no se
    // adivina una imagen cruzando el nombre contra el catálogo. Eso reescribiría
    // su historial por atrás y le pondría la foto de otro ejercicio al suyo.
    // Un JSON pegado de una IA tampoco va a traerlo: tiene que seguir entrando.
    ...(typeof e.media_id === 'string' && e.media_id ? { media_id: e.media_id } : {}),
    ...(Array.isArray(e.aprox) && e.aprox.length
      ? { aprox: e.aprox.filter((x) => typeof x === 'string') }
      : {})
  }
}

// Objetivos de volumen semanal (series por grupo muscular)
//
// Solo están los grupos para los que hay un objetivo REAL, puesto a propósito.
// Los grupos nuevos que trajo el catálogo (pecho, hombro, gemelos, trapecio,
// antebrazo, cardio) NO se agregan acá: un objetivo que nadie eligió haría que
// el reporte rete por "te falta volumen de pecho" que nunca se propuso hacer.
// El reporte muestra las series de esos grupos sin veredicto (ver Report.jsx).
export const OBJETIVOS_VOLUMEN = {
  gluteo: { min: 16, max: 20, label: 'Glúteo' },
  cuadriceps: { min: 12, max: 16, label: 'Cuádriceps/Isquios' },
  isquios: { min: 12, max: 16, label: 'Cuádriceps/Isquios' },
  espalda: { min: 16, max: 20, label: 'Espalda' },
  brazos: { min: 8, max: 12, label: 'Brazos' },
  core: { min: 8, max: 12, label: 'Core' }
}

// Etiquetas legibles por grupo (para reporte e historial)
//
// Los seis primeros son los que la app conocía desde el principio. Los otros
// llegaron con el catálogo de ejercicios (data/catalogo.js): un catálogo
// completo tiene press de banca y elevaciones laterales, y meterlos en "brazos"
// sería mentirle al volumen semanal.
export const GRUPO_LABEL = {
  gluteo: 'Glúteo',
  cuadriceps: 'Cuádriceps',
  isquios: 'Isquios',
  espalda: 'Espalda',
  brazos: 'Brazos',
  core: 'Core',
  pecho: 'Pecho',
  hombro: 'Hombro',
  gemelos: 'Gemelos',
  trapecio: 'Trapecio',
  antebrazo: 'Antebrazo',
  cardio: 'Cardio'
}
