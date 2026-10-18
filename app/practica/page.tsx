import type { Metadata } from 'next'
import { headers, cookies } from 'next/headers'
import Link from 'next/link'
import { Landing } from '@/components/landing'
import {
  CANONICAL_PATH,
  VARIANTS,
  isVariant,
  type Variant,
} from '@/lib/experiment'

type PracticaPageProps = {
  searchParams: Promise<{ preview?: string | string[] }>
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/**
 * Normaliza el parámetro de preview a Variant ('A' | 'B') o null.
 * Acepta 'a'|'A'|'b'|'B'. Cualquier otro valor se trata como no-preview.
 */
function normalizePreview(value: string | string[] | undefined): Variant | null {
  const v = firstParam(value)
  if (v === undefined) return null
  if (v === 'a' || v === 'A') return 'A'
  if (v === 'b' || v === 'B') return 'B'
  return null
}

/**
 * Resuelve la variante efectiva sin sorteo:
 * 1. preview (?preview=a|b) — solo para mostrar, no persiste.
 * 2. header x-variant — seteado por proxy.ts desde la cookie.
 * 3. cookie tn_variant — validada con isVariant.
 * 4. 'A' (control) por defecto.
 */
export function resolveVariant({
  preview,
  headerVariant,
  cookieVariant,
}: {
  preview: Variant | null
  headerVariant: string | null
  cookieVariant: string | null
}): Variant {
  if (preview) return preview
  if (isVariant(headerVariant)) return headerVariant
  if (isVariant(cookieVariant)) return cookieVariant
  return 'A'
}

export async function generateMetadata({
  searchParams,
}: PracticaPageProps): Promise<Metadata> {
  const params = await searchParams
  const preview = normalizePreview(params.preview)

  const headersList = await headers()
  const headerVariant = headersList.get('x-variant')

  const cookieStore = await cookies()
  const cookieVariant = cookieStore.get('tn_variant')?.value ?? null

  const variant = resolveVariant({ preview, headerVariant, cookieVariant })
  const copy = VARIANTS[variant]

  const metadata: Metadata = {
    // Título como string simple: el layout ya no aplica template, así que
    // el title queda exactamente como el copy de la variante (50-60 caracteres).
    title: copy.seoTitle,
    description: copy.seoDescription,
    alternates: { canonical: CANONICAL_PATH },
  }

  // robots: noindex únicamente en vistas preview. El resto no toca robots
  // (el layout ya no lo define globalmente).
  if (preview) {
    metadata.robots = { index: false, follow: false }
  }

  return metadata
}

export default async function PracticaPage({
  searchParams,
}: PracticaPageProps) {
  const params = await searchParams
  const preview = normalizePreview(params.preview)

  const headersList = await headers()
  const headerVariant = headersList.get('x-variant')

  const cookieStore = await cookies()
  const cookieVariant = cookieStore.get('tn_variant')?.value ?? null

  const variant = resolveVariant({ preview, headerVariant, cookieVariant })
  const copy = VARIANTS[variant]
  const isPreview = preview !== null

  const titleLength = copy.seoTitle.length
  const descriptionLength = copy.seoDescription.length

  return (
    <main id="contenido" className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10 md:py-14">
      <p className="font-mono text-[0.7rem] tracking-[0.16em] text-muted-foreground uppercase">
        Laboratorio 01 · test A/B
      </p>
      <p className="border-b border-border pb-4 text-sm text-muted-foreground">
        {isPreview
          ? `Vista previa del copy ${variant.toLowerCase()} (?preview). No se escriben cookies.`
          : `Variante servida: ${variant} (${VARIANTS[variant].name}).`}
      </p>
      <Landing variant={variant} isPreview={isPreview} />
      <div className="flex flex-wrap gap-2">
        <Link href="/practica?preview=A" className="rounded-md border border-border px-3 py-1.5 text-sm">
          Ver copy A
        </Link>
        <Link href="/practica?preview=B" className="rounded-md border border-border px-3 py-1.5 text-sm">
          Ver copy B
        </Link>
        <Link href="/bitacora" className="rounded-md border border-border px-3 py-1.5 text-sm">
          Bitácora
        </Link>
      </div>
      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">Metadatos publicados en el servidor</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1 border-b border-border pb-3">
            <dt className="font-mono text-[0.7rem] tracking-[0.14em] text-muted-foreground uppercase">
              Title de {variant}
            </dt>
            <dd>{copy.seoTitle}</dd>
            <dd className="font-mono text-sm text-muted-foreground">
              {titleLength} caracteres · {titleLength >= 50 && titleLength <= 60 ? 'dentro de 50–60' : 'fuera de rango'}
            </dd>
          </div>
          <div className="flex flex-col gap-1 border-b border-border pb-3">
            <dt className="font-mono text-[0.7rem] tracking-[0.14em] text-muted-foreground uppercase">
              Description de {variant}
            </dt>
            <dd>{copy.seoDescription}</dd>
            <dd className="font-mono text-sm text-muted-foreground">
              {descriptionLength} caracteres ·{' '}
              {descriptionLength >= 140 && descriptionLength <= 160 ? 'dentro de 140–160' : 'fuera de rango'}
            </dd>
          </div>
        </dl>
      </section>
    </main>
  )
}
