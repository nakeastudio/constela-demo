// ============================================================
//  REGISTRO DE MÓDULOS  (raíz de composición)
// ============================================================
// Único lugar donde se declara qué módulos existen. Core expone el registro;
// acá se lo llena. Sumar skincare = importar su módulo y agregar una línea.
// Se importa desde main.jsx antes de renderizar.

import { registrarModulo } from '../core/lib/modulos.js'
import { moduloGym } from './gym/lib/storage.js'
import { markdownSemana as markdownGym } from './gym/lib/report.js'
import { moduloNutricion } from './nutricion/lib/storage.js'
import { markdownSemana as markdownNutricion } from './nutricion/lib/report.js'

// `markdownSemana` se engancha acá y no dentro de cada `modulo*`: report.js ya
// importa storage.js, así que declararlo allá cerraría un ciclo de imports.
// La raíz de composición es el lugar natural para unir las dos mitades.
registrarModulo({ ...moduloGym, markdownSemana: markdownGym })
registrarModulo({ ...moduloNutricion, markdownSemana: markdownNutricion })
