'use server'

import { cookies } from 'next/headers'
import { parseVisitorId, isVariant } from '@/lib/experiment'
import { recordConversion as recordConversionDb } from '@/lib/events'

/**
 * Server Action: registra una conversión solo si el visitante tiene cookies válidas.
 * Lee tn_visitor y tn_variant de las cookies, las valida, y llama a recordConversionDb.
 * No se invoca al cargar la página: solo desde el clic del CTA.
 *
 * @returns { ok: false } si faltan cookies o son inválidas.
 *         { ok: true, counted: true } si se insertó una conversión nueva.
 *         { ok: true, counted: false } si el visitante ya convirtió antes (no se duplica).
 */
export async function recordConversion(): Promise<{
  ok: boolean
  counted?: boolean
}> {
  const cookieStore = await cookies()
  const visitorIdRaw = cookieStore.get('tn_visitor')?.value ?? null
  const variantRaw = cookieStore.get('tn_variant')?.value ?? null

  const visitorId = parseVisitorId(visitorIdRaw)
  const variant = isVariant(variantRaw) ? variantRaw : null

  if (!visitorId || !variant) {
    return { ok: false }
  }

  const counted = await recordConversionDb({ visitorId, variant })
  return { ok: true, counted }
}
