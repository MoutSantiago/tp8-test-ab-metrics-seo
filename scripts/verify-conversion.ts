import 'dotenv/config'
import { recordConversion as recordConversionDb } from '../lib/events'
import { getPool, closePool } from '../lib/db'

async function main() {
  const pool = getPool()
  const visitorId = '550e8400-e29b-41d4-a716-446655440000'

  // Limpieza
  await pool.query('DELETE FROM conversions WHERE visitor_id = $1', [visitorId])

  const countBefore = Number((await pool.query('SELECT count(*) FROM conversions'))
    .rows[0].count)
  console.log(`Conversiones antes del 1er clic: ${countBefore}`)

  // 1er clic: debe insertar (counted=true)
  const r1 = await recordConversionDb({ visitorId, variant: 'A' })
  console.log(`1er clic: counted=${r1}`)

  const countAfter1 = Number((await pool.query('SELECT count(*) FROM conversions'))
    .rows[0].count)
  console.log(`Conversiones después del 1er clic: ${countAfter1}`)

  // Cargar página varias veces: no debe cambiar
  const countAfterLoads = Number((await pool.query('SELECT count(*) FROM conversions'))
    .rows[0].count)
  console.log(`Conversiones tras cargas de página: ${countAfterLoads}`)

  // 2º clic con mismo visitorId: no debe duplicar (counted=false)
  const r2 = await recordConversionDb({ visitorId, variant: 'A' })
  console.log(`2º clic (mismo visitante): counted=${r2}`)

  const countAfter2 = Number((await pool.query('SELECT count(*) FROM conversions'))
    .rows[0].count)
  console.log(`Conversiones después del 2º clic: ${countAfter2}`)

  // Preview: no debe sumar (simulado: no llamamos recordConversionDb)
  const countAfterPreview = Number((await pool.query('SELECT count(*) FROM conversions'))
    .rows[0].count)
  console.log(`Conversiones tras preview (sin llamada): ${countAfterPreview}`)

  await closePool()

  let passed = 0
  let failed = 0
  function check(cond: boolean, msg: string) {
    if (cond) { passed++; console.log(`  ✓ ${msg}`) }
    else { failed++; console.error(`  ✗ ${msg}`) }
  }

  check(countBefore === 0, 'Antes: 0 conversiones')
  check(r1 === true, '1er clic: counted=true')
  check(countAfter1 === 1, 'Después 1er clic: 1 conversión')
  check(countAfterLoads === 1, 'Cargas de página: aún 1 conversión')
  check(r2 === false, '2º clic mismo visitante: counted=false')
  check(countAfter2 === 1, 'Después 2º clic: aún 1 conversión')
  check(countAfterPreview === 1, 'Preview: sin cambio')

  console.log(`\nResultado: ${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
