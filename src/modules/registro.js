// ============================================================
//  REGISTRO DE MÓDULOS  (raíz de composición)
// ============================================================
// Único lugar donde se declara qué módulos existen. Core expone el registro;
// acá se lo llena. Sumar skincare = importar su módulo y agregar una línea.
// Se importa desde main.jsx antes de renderizar.

import { registrarModulo } from '../core/lib/modulos.js'
import { moduloGym } from './gym/lib/storage.js'
import { moduloNutricion } from './nutricion/lib/storage.js'

registrarModulo(moduloGym)
registrarModulo(moduloNutricion)
