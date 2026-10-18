import 'dotenv/config'
import * as crypto from 'crypto'
import {
  assignVariant,
  computeRate,
  diffInPp,
  formatDiffInPp,
  formatPercent,
  isVariant,
  parseCount,
  parseVisitorId,
} from '../lib/experiment'

let passed = 0
let failed = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++
    console.log(`  ✓ ${message}`)
  } else {
    failed++
    console.error(`  ✗ ${message}`)
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${message} (esperado ${JSON.stringify(expected)}, obtuvo ${JSON.stringify(actual)})`)
}

// 1. Estabilidad: assignVariant('lab-visitor-demo-01') da lo mismo 1000 veces
console.log('\n1. Estabilidad de assignVariant (1000 repeticiones)')
const id = 'lab-visitor-demo-01'
const primera = assignVariant(id)
let estable = true
for (let i = 0; i < 1000; i++) {
  if (assignVariant(id) !== primera) {
    estable = false
    break
  }
}
assert(estable, 'assignVariant es estable en 1000 repeticiones')
console.log(`   Variante de '${id}': ${primera}`)

// 2. Tasas del caso de prueba
console.log('\n2. Tasas del caso de prueba')
assertEqual(
  formatPercent(computeRate(240, 18)),
  '7,50%',
  '18/240 → 7,50%'
)
assertEqual(
  formatPercent(computeRate(236, 31)),
  '13,14%',
  '31/236 → 13,14%'
)
const gap = diffInPp(computeRate(240, 18), computeRate(236, 31))
assertEqual(formatDiffInPp(gap), '5,64 pp', 'diferencia B − A → 5,64 pp')

// 3. Sin impresiones → null, nunca 0,00%
console.log('\n3. Sin impresiones')
assert(computeRate(0, 0) === null, 'computeRate(0, 0) === null')
assert(computeRate(0, 5) === null, 'computeRate(0, 5) === null')
assert(formatPercent(null) !== '0,00%', 'formatPercent(null) no devuelve "0,00%"')
assert(formatPercent(null) === 'Pendiente', 'formatPercent(null) devuelve "Pendiente"')

// 4. Distribución con 10.000 UUID generados
console.log('\n4. Distribución (10.000 UUID v4 aleatorios)')
let contaA = 0
let contaB = 0
let invalidos = 0
for (let i = 0; i < 10_000; i++) {
  const uuid = crypto.randomUUID()
  if (!parseVisitorId(uuid)) {
    invalidos++
    continue
  }
  const v = assignVariant(uuid)
  if (v === 'A') contaA++
  else if (v === 'B') contaB++
}
const total = contaA + contaB
const pctA = (contaA / total) * 100
const pctB = (contaB / total) * 100
console.log(`   A: ${contaA} (${pctA.toFixed(2)}%)`)
console.log(`   B: ${contaB} (${pctB.toFixed(2)}%)`)
console.log(`   UUIDs inválidos: ${invalidos}`)
assert(pctA >= 45 && pctA <= 55, `A entre 45% y 55% (obtuvo ${pctA.toFixed(2)}%)`)
assert(pctB >= 45 && pctB <= 55, `B entre 45% y 55% (obtuvo ${pctB.toFixed(2)}%)`)
assert(invalidos === 0, 'todos los UUID generados son válidos')

// 5. Validadores
console.log('\n5. Validadores')
assert(isVariant('A') === true, "isVariant('A') === true")
assert(isVariant('B') === true, "isVariant('B') === true")
assert(isVariant('a') === false, "isVariant('a') === false (minúsculas no válidas)")
assert(isVariant(null) === false, "isVariant(null) === false")
assert(isVariant('C') === false, "isVariant('C') === false")

assert(parseVisitorId('550e8400-e29b-41d4-a716-446655440000') === '550e8400-e29b-41d4-a716-446655440000', 'UUID v4 válido aceptado')
assert(parseVisitorId('no-es-un-uuid') === null, 'string no UUID → null')
assert(parseVisitorId(null) === null, 'null → null')
assert(parseVisitorId(123) === null, 'número → null')

assert(parseCount(5) === 5, 'parseCount(5) === 5')
assert(parseCount(0) === 0, 'parseCount(0) === 0')
assert(parseCount(-1) === null, 'parseCount(-1) === null')
assert(parseCount(1.5) === null, 'parseCount(1.5) === null (no entero)')
assert(parseCount(null) === null, 'parseCount(null) === null')
assert(parseCount('5') === null, 'parseCount("5") === null (string no válido)')

// Resumen
console.log(`\nResultado: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
