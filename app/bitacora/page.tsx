import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { unstable_noStore } from 'next/cache'
import Link from 'next/link'
import {
  TEST_CASE,
  computeRate,
  diffInPp,
  formatDiffInPp,
  formatPercent,
  HASH_EXAMPLE_ID,
  assignVariant,
  type VariantStats,
} from '@/lib/experiment'
import { getCounts } from '@/lib/events'

export const metadata: Metadata = {
  title: 'Bitácora',
}

type TestCaseRow = {
  variant: 'A' | 'B'
  label: string
  stats: VariantStats
}

const TEST_CASE_ROWS: TestCaseRow[] = [
  {
    variant: 'A',
    label: 'A · Control',
    stats: TEST_CASE.A,
  },
  {
    variant: 'B',
    label: 'B · Tratamiento',
    stats: TEST_CASE.B,
  },
]

/**
 * Muestra un rate formateado o "Pendiente" si no hay impresiones.
 * Nunca muestra "0%" cuando no hay datos.
 */
function formatRateOrPending(stats: VariantStats): string {
  const rate = computeRate(stats.impressions, stats.conversions)
  return formatPercent(rate)
}

export default async function BitacoraPage() {
  // Página dinámica: evitar caché estática de datos reales.
  unstable_noStore()

  const headersList = await headers()
  const headerVariant = headersList.get('x-variant')

  let counts: Awaited<ReturnType<typeof getCounts>> | null = null
  let dbError: string | null = null

  try {
    counts = await getCounts()
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'Error inesperado'
  }

  const rates = {
    A: computeRate(TEST_CASE.A.impressions, TEST_CASE.A.conversions),
    B: computeRate(TEST_CASE.B.impressions, TEST_CASE.B.conversions),
  }
  const testCaseDiff = diffInPp(rates.A, rates.B)

  const dbDiff = counts
    ? diffInPp(
        computeRate(counts.A.impressions, counts.A.conversions),
        computeRate(counts.B.impressions, counts.B.conversions)
      )
    : null

  const hashResult = assignVariant(HASH_EXAMPLE_ID)

  return (
    <main id="contenido" className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10 md:py-14">
      <p className="font-mono text-[0.7rem] tracking-[0.16em] text-muted-foreground uppercase">
        Bitácora
      </p>
      <h1 className="max-w-2xl font-serif text-4xl tracking-tight text-balance md:text-5xl">
        Métricas del experimento A/B
      </h1>

      {/* Sección 1: Caso de prueba fijo (sin depender de sesión ni base) */}
      <section className="flex flex-col gap-6">
        <h2 className="font-serif text-2xl">Caso de prueba fijo</h2>
        <p className="text-sm text-muted-foreground">
          Conteo fijo para verificar el cálculo. Las tasas salen de la fórmula,
          no escritas a mano.
        </p>
        <table className="w-full text-left text-sm">
          <caption className="mb-3 text-left text-muted-foreground">
            Cohorte fija. A: 240 impresiones / 18 conversiones. B: 236 /
            31 conversiones.
          </caption>
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 font-medium">Variante</th>
              <th className="py-2 font-medium">Impresiones</th>
              <th className="py-2 font-medium">Conversiones</th>
              <th className="py-2 font-medium">Tasa</th>
            </tr>
          </thead>
          <tbody>
            {TEST_CASE_ROWS.map((row) => (
              <tr key={row.variant} className="border-b border-border">
                <td className="py-3">{row.label}</td>
                <td className="py-3 font-mono">{row.stats.impressions}</td>
                <td className="py-3 font-mono">{row.stats.conversions}</td>
                <td className="py-3 font-mono">
                  {formatRateOrPending(row.stats)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="font-mono text-sm">
          B − A = {formatDiffInPp(testCaseDiff)}
        </p>
      </section>

      {/* Sección 2: Datos de la base */}
      <section className="flex flex-col gap-6">
        <h2 className="font-serif text-2xl">Datos de la base</h2>
        {dbError ? (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 border border-red-100">
            No se pudieron leer los conteos de la base de datos:
            {dbError}. La sección de caso de prueba fijo no se ve afectada.
          </div>
        ) : (
          <>
            <table className="w-full text-left text-sm">
              <caption className="mb-3 text-left text-muted-foreground">
                Conteos registrados en la base de datos (impresiones y
                conversiones reales).
              </caption>
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 font-medium">Variante</th>
                  <th className="py-2 font-medium">Impresiones</th>
                  <th className="py-2 font-medium">Conversiones</th>
                  <th className="py-2 font-medium">Tasa</th>
                </tr>
              </thead>
              <tbody>
                {['A', 'B'].map((variant) => {
                  const stats = counts![variant as 'A' | 'B']
                  return (
                    <tr key={variant} className="border-b border-border">
                      <td className="py-3">
                        {variant === 'A' ? 'A · Control' : 'B · Tratamiento'}
                      </td>
                      <td className="py-3 font-mono">{stats.impressions}</td>
                      <td className="py-3 font-mono">{stats.conversions}</td>
                      <td className="py-3 font-mono">
                        {formatRateOrPending(stats)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="font-mono text-sm">
              B − A = {formatDiffInPp(dbDiff)}
            </p>
          </>
        )}
      </section>

      {/* Nota metodológica */}
      <section className="rounded-md bg-amber-50 p-4 text-sm text-amber-800 border border-amber-100">
        <p className="font-medium">Nota metodológica:</p>
        <p className="mt-1">
          La diferencia entre tasas es una diferencia observada, no una prueba
          de significancia estadística. No se declara superioridad.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <p className="font-mono text-sm">
          assignVariant('{HASH_EXAMPLE_ID}') → {hashResult}
        </p>
        <Link href="/practica" className="text-sm text-muted-foreground underline">
          Volver a la landing
        </Link>
      </section>
    </main>
  )
}
