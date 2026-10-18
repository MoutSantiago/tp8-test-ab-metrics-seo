import { getPool } from './db'
import { isVariant, parseCount, parseVisitorId, type Variant } from './experiment'

/**
 * Valida que sessionId sea una cadena no vacía.
 */
function esSessionIdValido(sessionId: unknown): sessionId is string {
  return typeof sessionId === 'string' && sessionId.length > 0
}

/**
 * Registra una impresión en la tabla `impressions`.
 * Valida los tres parámetros antes de insertar. Si alguno es inválido,
 * no inserta y retorna `false`. Usa consultas parametrizadas ($1, $2, $3),
 * nunca interpolación de strings.
 *
 * @param params.visitorId - UUID v4 del visitante (validado con parseVisitorId)
 * @param params.variant - 'A' o 'B' (validado con isVariant)
 * @param params.sessionId - identificador de sesión (cadena no vacía)
 * @returns true si se insertó la fila, false si algún parámetro es inválido
 */
export async function recordImpression(params: {
  visitorId: unknown
  variant: unknown
  sessionId: unknown
}): Promise<boolean> {
  const visitorId = parseVisitorId(params.visitorId)
  const variant = isVariant(params.variant) ? params.variant : null
  const sessionId = esSessionIdValido(params.sessionId) ? params.sessionId : null

  if (!visitorId || !variant || !sessionId) return false

  const pool = getPool()
  const result = await pool.query(
    `INSERT INTO impressions (visitor_id, variant, session_id)
     VALUES ($1, $2, $3)`,
    [visitorId, variant, sessionId]
  )
  return (result.rowCount ?? 0) > 0
}

/**
 * Registra una conversión en la tabla `conversions`.
 * Garantiza una conversión por visitante mediante
 * `INSERT ... ON CONFLICT (visitor_id) DO NOTHING`.
 * Retorna `true` solo si se insertó una fila nueva (rowCount > 0);
 * si ya existía una conversión para ese visitor_id, retorna `false`.
 *
 * @param params.visitorId - UUID v4 del visitante (validado con parseVisitorId)
 * @param params.variant - 'A' o 'B' (validado con isVariant)
 * @returns true si se insertó una fila nueva, false si ya existía o params inválidos
 */
export async function recordConversion(params: {
  visitorId: unknown
  variant: unknown
}): Promise<boolean> {
  const visitorId = parseVisitorId(params.visitorId)
  const variant = isVariant(params.variant) ? params.variant : null

  if (!visitorId || !variant) return false

  const pool = getPool()
  const result = await pool.query(
    `INSERT INTO conversions (visitor_id, variant)
     VALUES ($1, $2)
     ON CONFLICT (visitor_id) DO NOTHING`,
    [visitorId, variant]
  )
  return (result.rowCount ?? 0) > 0
}

/**
 * Devuelve los conteos agregados por variante con un único query agregado
 * (UNION ALL sobre las dos tablas). Valida y normaliza lo leído con
 * `parseCount`; si una variante no tiene filas, devuelve 0. Si `parseCount`
 * devolviera `null` (no debería ocurrir con COUNT(*), pero se maneja por
 * seguridad), se trata como 0.
 *
 * @returns { A: {impressions, conversions}, B: {impressions, conversions} }
 */
export async function getCounts(): Promise<{
  A: { impressions: number; conversions: number }
  B: { impressions: number; conversions: number }
}> {
  const pool = getPool()
  const result = await pool.query(`
    SELECT 'impressions' AS tipo, variant, COUNT(*) AS cnt
    FROM impressions
    GROUP BY variant
    UNION ALL
    SELECT 'conversions' AS tipo, variant, COUNT(*) AS cnt
    FROM conversions
    GROUP BY variant
  `)

  const data: Record<Variant, { impressions: number; conversions: number }> = {
    A: { impressions: 0, conversions: 0 },
    B: { impressions: 0, conversions: 0 },
  }

  for (const row of result.rows) {
    const variant = row.variant as string
    const tipo = row.tipo as string
    // pg devuelve COUNT(*) (bigint) como string; normalizar a número antes de validar.
    const countValue = typeof row.cnt === 'string' ? Number(row.cnt) : row.cnt
    const count = parseCount(countValue)

    if (!isVariant(variant)) continue
    if (tipo !== 'impressions' && tipo !== 'conversions') continue

    // parseCount nunca debería devolver null con COUNT(*),
    // pero si lo hace se trata como 0 (documentado arriba).
    data[variant][tipo as 'impressions' | 'conversions'] = count ?? 0
  }

  return data
}
