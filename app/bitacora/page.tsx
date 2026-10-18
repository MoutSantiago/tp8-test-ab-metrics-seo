import type { Metadata } from 'next'
import Link from 'next/link'
import {
  HASH_EXAMPLE_ID,
  TEST_CASE,
  VARIANTS,
  conversionRate,
  formatCount,
  formatPoints,
  formatRate,
  rateGap,
  type Variant,
} from '@/lib/experiment'

export const metadata: Metadata = {
  title: 'Bitácora',
  robots: { index: false, follow: false },
}

const ROWS: Variant[] = ['A', 'B']

export default function BitacoraPage() {
  return (
    <main id="contenido" className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10 md:py-14">
      <p className="font-mono text-[0.7rem] tracking-[0.16em] text-muted-foreground uppercase">
        Sin eventos
      </p>
      <h1 className="max-w-2xl font-serif text-4xl tracking-tight text-balance md:text-5xl">
        La bitácora todavía no calcula.
      </h1>
      <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
        Los conteos del caso de prueba ya están. La tasa no: conversiones divididas por impresiones. No se declara ganador.
      </p>
      <table className="w-full text-left text-sm">
        <caption className="mb-3 text-left text-muted-foreground">
          Cohorte fija. Cuando la fórmula esté, A tiene que dar 7,50%, B 13,14% y la diferencia 5,64 pp.
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
          {ROWS.map((variant) => (
            <tr key={variant} className="border-b border-border">
              <td className="py-3">
                {variant.toUpperCase()} · {VARIANTS[variant].name}
              </td>
              <td className="py-3 font-mono">{formatCount(TEST_CASE[variant].impressions)}</td>
              <td className="py-3 font-mono">{formatCount(TEST_CASE[variant].conversions)}</td>
              <td className="py-3 font-mono">{formatRate(conversionRate(TEST_CASE[variant]))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="font-mono text-sm">B − A = {formatPoints(rateGap(TEST_CASE))}</p>
      <p className="font-mono text-sm">
        assignVariant({`'${HASH_EXAMPLE_ID}'`}) → pendiente
      </p>
      <Link href="/practica" className="text-sm text-muted-foreground underline">
        Volver a la landing
      </Link>
    </main>
  )
}
