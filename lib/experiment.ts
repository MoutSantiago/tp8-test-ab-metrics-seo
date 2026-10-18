export type Variant = 'A' | 'B'

export type VariantStats = {
  impressions: number
  conversions: number
}

export type ExperimentLog = Record<Variant, VariantStats>

export const COOKIE = {
  visitor: 'lab_visitor',
  variant: 'lab_variant',
  log: 'lab_log',
  impressed: 'lab_impressed',
  converted: 'lab_converted',
} as const

export const THIRTY_DAYS = 60 * 60 * 24 * 30
export const SESSION_WINDOW = 60 * 30
export const CANONICAL_PATH = '/practica'
export const TITLE_RANGE = { min: 50, max: 60 }
export const DESCRIPTION_RANGE = { min: 140, max: 160 }

export const OFFER = [
  { label: 'Inicio', value: '14 de abril' },
  { label: 'Duración', value: '8 semanas' },
  { label: 'Cupo', value: '12 personas' },
  { label: 'Oficios', value: 'Carpintería, electricidad, cocina' },
] as const

export const VARIANTS = {
  A: {
    id: 'A',
    name: 'Control',
    seoTitle: 'Cursos de oficio en ocho semanas, con salida laboral',
    seoDescription:
      'Aprendé carpintería, electricidad o cocina en ocho semanas. Grupos de doce personas y práctica real, con una salida laboral que se puede cobrar.',
    headline: 'Ocho semanas para un oficio que se puede cobrar.',
    emphasis: null,
    lede: 'La práctica empieza en la primera clase. El mensaje de esta variante habla del método, no de la escasez.',
    cta: 'Ver cupos de abril',
  },
  B: {
    id: 'B',
    name: 'Tratamiento',
    seoTitle: 'Abril abre cupos: cursos de oficio en grupos de 12',
    seoDescription:
      'El 14 de abril empiezan grupos de doce. En la cohorte anterior, ocho de cada diez consiguieron trabajo en el rubro antes de los noventa días.',
    headline: 'El curso empieza el 14 de abril.',
    emphasis: 'El cupo, no.',
    lede: 'Doce lugares y una fecha. El mensaje de esta variante apura la decisión, sin cambiar la oferta.',
    cta: 'Reservar mi lugar',
  },
} as const

export const TEST_CASE: ExperimentLog = {
  A: { impressions: 240, conversions: 18 },
  B: { impressions: 236, conversions: 31 },
}

export const HASH_EXAMPLE_ID = 'lab-visitor-demo-01'

/**
 * Función de hash FNV-1a de 32 bits.
 *
 * Es una función hash no criptográfica, rápida y determinística: dado el mismo
 * string de entrada siempre devuelve el mismo número. Por eso es apta para
 * asignar variantes de forma estable sin sorteos ni estado.
 *
 * @param input - string a hashear (ej. id de visitante)
 * @returns número entero sin signo de 32 bits
 */
function fnv1a32(input: string): number {
  let hash = 2166136261 >>> 0 // offset basis FNV-1a 32 bits
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619) >>> 0 // primo FNV-1a 32 bits, wrapping
  }
  return hash >>> 0
}

/**
 * Asigna una variante de forma determinística a partir del id de visitante.
 * El mismo id siempre devuelve la misma variante (A o B).
 *
 * @param visitorId - identificador del visitante
 * @returns 'A' (control) o 'B' (tratamiento)
 */
export function assignVariant(visitorId: string): Variant {
  const hash = fnv1a32(visitorId)
  return hash % 2 === 0 ? 'A' : 'B'
}

/**
 * Calcula la tasa de conversión: conversiones / impresiones.
 * Devuelve null si no hay impresiones (nunca 0, porque sin impresiones no hay tasa).
 *
 * @param impressions - cantidad de impresiones
 * @param conversions - cantidad de conversiones
 * @returns tasa como decimal (ej. 0.075) o null si no hay impresiones
 */
export function computeRate(impressions: number, conversions: number): number | null {
  if (impressions <= 0) return null
  return conversions / impressions
}

/**
 * Formatea una tasa como porcentaje con dos decimales y coma decimal.
 * Ejemplo: 0.075 → "7,50%". Si es null devuelve "Pendiente".
 *
 * @param rate - tasa decimal o null
 * @returns string formateado
 */
export function formatPercent(rate: number | null): string {
  if (rate === null) return 'Pendiente'
  return `${(rate * 100).toFixed(2).replace('.', ',')}%`
}

/**
 * Calcula la diferencia de tasas en puntos porcentuales (B - A).
 * Devuelve null si alguna tasa es null. Redondeado a 2 decimales.
 *
 * @param rateA - tasa del control
 * @param rateB - tasa del tratamiento
 * @returns diferencia en pp o null
 */
export function diffInPp(rateA: number | null, rateB: number | null): number | null {
  if (rateA === null || rateB === null) return null
  return Math.round((rateB - rateA) * 100 * 100) / 100
}

/**
 * Formatea una diferencia en puntos porcentuales con coma decimal.
 * Ejemplo: 5.64 → "5,64 pp". Si es null devuelve "Pendiente".
 *
 * @param value - diferencia en pp o null
 * @returns string formateado
 */
export function formatDiffInPp(value: number | null): string {
  if (value === null) return 'Pendiente'
  return `${value.toFixed(2).replace('.', ',')} pp`
}

/**
 * Valida que un valor sea una variante conocida ('A' o 'B').
 * Nada de lo que viene de cookies o de la base se usa sin validar con esta función.
 *
 * @param x - valor a validar
 * @returns true si es 'A' o 'B'
 */
export function isVariant(x: unknown): x is Variant {
  return x === 'A' || x === 'B'
}

/**
 * Valida y devuelve un id de visitante si es un UUID v4 válido, o null en caso contrario.
 *
 * @param x - valor a validar
 * @returns el UUID v4 string o null
 */
export function parseVisitorId(x: unknown): string | null {
  if (typeof x !== 'string') return null
  const uuidV4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidV4Regex.test(x) ? x : null
}

/**
 * Valida que un valor sea un número entero mayor o igual a cero.
 * Devuelve null si no es un entero válido o es negativo.
 *
 * @param x - valor a validar
 * @returns el número entero o null
 */
export function parseCount(x: unknown): number | null {
  if (typeof x !== 'number' || !Number.isInteger(x) || x < 0) return null
  return x
}

export function emptyLog(): ExperimentLog {
  return {
    A: { impressions: 0, conversions: 0 },
    B: { impressions: 0, conversions: 0 },
  }
}

// Mantiene compatibilidad con la firma anterior (conversiones / impresiones).
// Se prefiere computeRate para código nuevo.
export function conversionRate(_stats: VariantStats): number | null {
  // TODO: migrar llamadas a computeRate(stats.impressions, stats.conversions)
  return null
}

export function rateGap(log: ExperimentLog): number | null {
  const control = conversionRate(log.A)
  const treatment = conversionRate(log.B)
  if (control === null || treatment === null) return null
  return (treatment - control) * 100
}

export function parseLog(_raw: string | undefined): ExperimentLog {
  // TODO: validar el JSON antes de usarlo. Si falla, log vacío.
  return emptyLog()
}

export function serializeLog(log: ExperimentLog): string {
  return JSON.stringify(log)
}

const numberFormat = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const integerFormat = new Intl.NumberFormat('es-AR')

export function formatCount(value: number): string {
  return integerFormat.format(value)
}

export function formatRate(rate: number | null): string {
  if (rate === null) return 'Pendiente'
  return `${numberFormat.format(rate * 100)}%`
}

export function formatPoints(value: number | null): string {
  if (value === null) return 'Pendiente'
  return `${numberFormat.format(value)} pp`
}

export function characterCount(value: string): number {
  return Array.from(value).length
}

export function inRange(length: number, range: { min: number; max: number }): boolean {
  return length >= range.min && length <= range.max
}

export function cookieOptions(secure: boolean, maxAge?: number) {
  // El preview corre en un iframe: la cookie tiene que ser Secure y SameSite=None.
  return {
    path: '/',
    httpOnly: true,
    secure,
    sameSite: secure ? ('none' as const) : ('lax' as const),
    partitioned: secure,
    ...(typeof maxAge === 'number' ? { maxAge } : {}),
  }
}
