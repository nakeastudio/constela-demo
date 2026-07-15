// ============================================================
//  UTILIDADES DE FECHAS  (semana = lunes a domingo)
// ============================================================

// Fecha local en formato YYYY-MM-DD (sin desfase de zona horaria)
export function hoyISO() {
  return toISO(new Date())
}

export function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Parsea YYYY-MM-DD a Date local (mediodía para evitar saltos de DST)
export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

// Lunes de la semana de una fecha dada
export function lunesDe(date) {
  const d = new Date(date)
  const dia = (d.getDay() + 6) % 7 // 0 = lunes
  d.setDate(d.getDate() - dia)
  d.setHours(12, 0, 0, 0)
  return d
}

// Rango [lunes, domingo] de la semana que contiene `iso`
export function rangoSemana(iso) {
  const lunes = lunesDe(fromISO(iso))
  const domingo = new Date(lunes)
  domingo.setDate(domingo.getDate() + 6)
  return { inicio: toISO(lunes), fin: toISO(domingo) }
}

// Rango de la semana anterior a `iso`
export function rangoSemanaAnterior(iso) {
  const lunes = lunesDe(fromISO(iso))
  lunes.setDate(lunes.getDate() - 7)
  const domingo = new Date(lunes)
  domingo.setDate(domingo.getDate() + 6)
  return { inicio: toISO(lunes), fin: toISO(domingo) }
}

// ¿`iso` está dentro de [inicio, fin]?
export function enRango(iso, inicio, fin) {
  return iso >= inicio && iso <= fin
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Nombres de mes completos (para el encabezado del calendario: "Noviembre 2026")
export const MESES_LARGO = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

// "Noviembre 2026" a partir de un Date (o de año+mes)
export function fmtMesAnio(date) {
  return `${MESES_LARGO[date.getMonth()]} ${date.getFullYear()}`
}

// Grilla de un mes alineada a semanas lunes→domingo.
// Devuelve un array de semanas; cada semana es un array de 7 celdas.
// Cada celda: { iso, dia, mesActual } — mesActual=false para días de relleno
// del mes anterior/siguiente que completan la primera/última semana.
export function gridMes(anio, mes) {
  const primero = new Date(anio, mes, 1, 12, 0, 0)
  const inicio = lunesDe(primero) // lunes que abre la grilla
  const semanas = []
  const cursor = new Date(inicio)
  // 6 filas cubren cualquier mes; cortamos al salir del mes si la fila ya terminó
  for (let s = 0; s < 6; s++) {
    const semana = []
    for (let d = 0; d < 7; d++) {
      semana.push({ iso: toISO(cursor), dia: cursor.getDate(), mesActual: cursor.getMonth() === mes })
      cursor.setDate(cursor.getDate() + 1)
    }
    semanas.push(semana)
    // Si ya pasamos el mes por completo, no agregamos más filas vacías
    if (cursor.getMonth() !== mes && cursor > primero) break
  }
  return semanas
}

// "12 may" — formato corto legible
export function fmtCorto(iso) {
  const d = fromISO(iso)
  return `${d.getDate()} ${MESES[d.getMonth()]}`
}

// "12 may 2026" — formato largo
export function fmtLargo(iso) {
  const d = fromISO(iso)
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

const DIAS_SEM = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
export function nombreDiaSemana(iso) {
  return DIAS_SEM[fromISO(iso).getDay()]
}
