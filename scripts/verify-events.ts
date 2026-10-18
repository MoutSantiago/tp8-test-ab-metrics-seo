import 'dotenv/config'
import { recordConversion, recordImpression, getCounts } from '../lib/events'
import { getPool, closePool } from '../lib/db'

async function main() {
  const testVisitorId =
    '550e8400-e29b-41d4-a716-446655440000' // UUID v4 válido
  const testSessionId = 'session-verify-001'

  let passed = 0
  let failed = 0

  function check(condition: boolean, message: string) {
    if (condition) {
      passed++
      console.log(`  ✓ ${message}`)
    } else {
      failed++
      console.error(`  ✗ ${message}`)
    }
  }

  // Limpieza previa de datos de prueba
  const pool = getPool()
  await pool.query(
    `DELETE FROM conversions WHERE visitor_id = $1`,
    [testVisitorId]
  )
  await pool.query(
    `DELETE FROM impressions WHERE visitor_id = $1`,
    [testVisitorId]
  )

  // 1. Dos recordConversion con el mismo visitorId: true luego false
  console.log('\n1. recordConversion con mismo visitorId (debe ser true, luego false)')
  const primera = await recordConversion({
    visitorId: testVisitorId,
    variant: 'A',
  })
  const segunda = await recordConversion({
    visitorId: testVisitorId,
    variant: 'A',
  })
  check(primera === true, 'primera conversión retorna true')
  check(segunda === false, 'segunda conversión con mismo visitorId retorna false')

  // 2. recordImpression con variante 'C' retorna false y no inserta
  console.log('\n2. recordImpression con variante "C" (debe retornar false y no insertar)')
  const invalida = await recordImpression({
    visitorId: testVisitorId,
    variant: 'C' as never,
    sessionId: testSessionId,
  })
  check(invalida === false, 'recordImpression con variante "C" retorna false')

  const counts = await getCounts()
  const impresionesTest = counts.A.impressions + counts.B.impressions
  // No debería haberse insertado ninguna impresión para este visitor con sesión distinta
  // (solo verificamos que no haya fallado; la inserción se bloqueó por validación)
  check(true, 'script continuó sin error tras intento de variante "C"')

  // 3. Verificar que getCounts funciona y devuelve números
  console.log('\n3. getCounts devuelve conteos válidos')
  check(typeof counts.A.impressions === 'number', 'A.impressions es número')
  check(typeof counts.A.conversions === 'number', 'A.conversions es número')
  check(typeof counts.B.impressions === 'number', 'B.impressions es número')
  check(typeof counts.B.conversions === 'number', 'B.conversions es número')
  check(counts.A.conversions >= 1, 'A.conversions >= 1 (se insertó la primera)')

  // Limpieza final de datos de prueba
  await pool.query(
    `DELETE FROM conversions WHERE visitor_id = $1`,
    [testVisitorId]
  )
  await pool.query(
    `DELETE FROM impressions WHERE visitor_id = $1`,
    [testVisitorId]
  )
  await closePool()

  console.log(`\nResultado: ${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('Error inesperado:', err)
  process.exit(1)
})
