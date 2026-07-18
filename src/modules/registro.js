// ============================================================
//  REGISTRO DE MÓDULOS  (raíz de composición)
// ============================================================
// Único lugar donde se declara qué módulos existen. Core expone el registro;
// acá se lo llena. Sumar skincare = importar su módulo y agregar una línea.
// Se importa desde main.jsx antes de renderizar.

import { registrarModulo } from '../core/lib/modulos.js'
import { registrarSync } from '../core/lib/sync.js'
import { moduloGym } from './gym/lib/storage.js'
import { markdownSemana as markdownGym } from './gym/lib/report.js'
import { moduloNutricion } from './nutricion/lib/storage.js'
import { markdownSemana as markdownNutricion } from './nutricion/lib/report.js'
import { moduloSkincare } from './skincare/lib/storage.js'
import { markdownSemana as markdownSkincare } from './skincare/lib/report.js'

// `markdownSemana` se engancha acá y no dentro de cada `modulo*`: report.js ya
// importa storage.js, así que declararlo allá cerraría un ciclo de imports.
// La raíz de composición es el lugar natural para unir las dos mitades.
registrarModulo({ ...moduloGym, markdownSemana: markdownGym })
registrarModulo({ ...moduloNutricion, markdownSemana: markdownNutricion })
registrarModulo({ ...moduloSkincare, markdownSemana: markdownSkincare })

// ============================================================
//  MAPA DE SINCRONIZACIÓN
// ============================================================
// Va acá y no en core/lib/sync.js por la misma razón que `markdownSemana`: saber
// que `sessions` es del gym es conocimiento de MÓDULO, y core no puede tenerlo.
// La raíz de composición es el único lugar que conoce a los dos lados.
//
// `activeSession` queda AFUERA a propósito: es el borrador del entrenamiento en
// curso: pertenece al dispositivo donde se está entrenando, no a la nube.
registrarSync({
  // Valores chicos y enteros → una fila en `documentos`.
  //
  // `skincare` es la plantilla de rutinas (chica: rutinas y pasos). `skincare_dias`
  // es el registro POR FECHA. Un espejo fiel de nutrición le daría a `skincare_dias`
  // su propia tabla fila-por-fecha (como `nutricion_registros`), pero eso sería un
  // cambio de esquema, y el esquema no lo maneja el front. En su lugar viaja como
  // UN documento (blob) en la tabla genérica `documentos`, sin tabla nueva. El
  // costo —reescribir todo el historial de skincare en cada cambio— es
  // despreciable a este volumen (unos pocos pasos por día). Si más adelante se
  // agrega una tabla `skincare_registros`, se mueve a `colecciones` sin tocar el
  // resto (mismo patrón que `nutricion`).
  documentos: ['rutina', 'prs', 'plan', 'perfil', 'settings', 'skincare', 'skincare_dias'],

  // Valores que son muchas filas → su tabla propia, fila por fila, para no
  // reescribir todo el historial cada vez que se marca una comida.
  colecciones: {
    sessions: {
      tabla: 'gym_sesiones',
      conflicto: 'user_id,id',
      desarmar: (valor) => (valor || []).map((s) => ({ id: s.id, datos: s })),
      fila: (item, uid) => ({
        user_id: uid,
        id: item.id,
        fecha: item.datos.fecha,
        dia_key: item.datos.diaKey ?? null,
        finalizada: !!item.datos.finalizada,
        completada_en: item.datos.completadaEn ?? null,
        datos: item.datos
      }),
      desdeFila: (r) => ({ id: r.id, datos: r.datos }),
      filtroId: (id, uid) => ({ user_id: uid, id }),
      // El historial se lee siempre ordenado por fecha (ver lib/storage.js).
      armar: (items) => items.map((i) => i.datos).sort((a, b) => a.fecha.localeCompare(b.fecha))
    },

    nutricion: {
      tabla: 'nutricion_registros',
      conflicto: 'user_id,fecha',
      desarmar: (valor) => Object.entries(valor || {}).map(([fecha, datos]) => ({ id: fecha, datos })),
      fila: (item, uid) => ({ user_id: uid, fecha: item.id, datos: item.datos }),
      desdeFila: (r) => ({ id: r.fecha, datos: r.datos }),
      filtroId: (id, uid) => ({ user_id: uid, fecha: id }),
      armar: (items) => Object.fromEntries(items.map((i) => [i.id, i.datos]))
    }
  }
})
