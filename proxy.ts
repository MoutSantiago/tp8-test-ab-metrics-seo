import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { assignVariant, parseVisitorId, isVariant } from '@/lib/experiment'
import { recordImpression } from '@/lib/events'

const THIRTY_DAYS = 60 * 60 * 24 * 30
const SESSION_TTL = 60 * 30 // 1800 s

const COOKIE_NAMES = {
  visitor: 'tn_visitor',
  variant: 'tn_variant',
  session: 'tn_session',
} as const

function esPreviewParam(value: string | null): boolean {
  return value === 'a' || value === 'A' || value === 'b' || value === 'B'
}

const CRAWLER_UA = [
  'Googlebot',
  'bingbot',
  'DuckDuckBot',
  'Baiduspider',
  'YandexBot',
  'Slurp',
  'facebookexternalhit',
]

function esCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false
  return CRAWLER_UA.some((bot) => userAgent.includes(bot))
}

function esProduccion(): boolean {
  return process.env.NODE_ENV === 'production'
}

function cookieOptions() {
  // COOKIE_SAME_SITE_NONE=true obliga Secure + SameSite=None (vistas embebidas/iframe).
  // En producción siempre Secure; en desarrollo SameSite=Lax salvo que se fuerce None.
  const sameSiteNone = process.env.COOKIE_SAME_SITE_NONE === 'true'
  const secure = esProduccion() || sameSiteNone
  return {
    path: '/',
    httpOnly: true,
    secure,
    sameSite: sameSiteNone ? ('none' as const) : ('lax' as const),
    partitioned: sameSiteNone,
  }
}

function setCookie(
  response: NextResponse,
  name: string,
  value: string,
  maxAge: number
): void {
  const opts = cookieOptions()
  response.cookies.set({
    name,
    value,
    path: opts.path,
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    ...(opts.partitioned ? { partitioned: true } : {}),
    maxAge,
  })
}

/**
 * Decisión pura sobre qué hacer con la request.
 * No toca cookies ni base de datos; solo recibe información ya extraída y devuelve
 * qué variant aplicar y qué cookies/acciones setear. Es testeable de forma aislada.
 */
export function decide({
  visitorId,
  existingVariant,
  sessionId,
  isPreview,
  isCrawler,
}: {
  visitorId: string | null
  existingVariant: string | null
  sessionId: string | null
  isPreview: boolean
  isCrawler: boolean
}): {
  variant: 'A' | 'B'
  setVisitor: string | null
  setVariant: string | null
  setSession: string | null
  shouldRecordImpression: boolean
} {
  // Crawler conocido: siempre servir control A en la misma URL y canonical.
  // No se asignan cookies ni se registra impresión. Como la URL y el canonical no cambian
  // (el crawler ve el mismo /practica que cualquier persona), esto no es cloaking.
  if (isCrawler) {
    return {
      variant: 'A',
      setVisitor: null,
      setVariant: null,
      setSession: null,
      shouldRecordImpression: false,
    }
  }

  // Preview por query: no toca cookies, no registra impresión.
  if (isPreview) {
    return {
      variant: 'A',
      setVisitor: null,
      setVariant: null,
      setSession: null,
      shouldRecordImpression: false,
    }
  }

  // Sin visitante válido: crear visitante + variante + sesión, registrar impresión.
  if (!visitorId) {
    const newVisitorId = crypto.randomUUID()
    const variant = assignVariant(newVisitorId)
    return {
      variant,
      setVisitor: newVisitorId,
      setVariant: variant,
      setSession: crypto.randomUUID(),
      shouldRecordImpression: true,
    }
  }

  // Visitante válido pero variante faltante o inválida: recomputar (nunca sortear).
  if (!isVariant(existingVariant)) {
    const variant = assignVariant(visitorId)
    return {
      variant,
      setVisitor: null,
      setVariant: variant,
      setSession: sessionId ?? crypto.randomUUID(),
      shouldRecordImpression: !sessionId,
    }
  }

  // Visitante y variante válidos: mantener, crear sesión si no existe.
  return {
    variant: existingVariant,
    setVisitor: null,
    setVariant: null,
    setSession: sessionId ?? crypto.randomUUID(),
    shouldRecordImpression: !sessionId,
  }
}

export async function proxy(request: NextRequest) {
  const userAgent = request.headers.get('user-agent')
  const isCrawler = esCrawler(userAgent)
  const isPreview = esPreviewParam(request.nextUrl.searchParams.get('preview'))

  const visitorIdRaw = request.cookies.get(COOKIE_NAMES.visitor)?.value ?? null
  const visitorId = parseVisitorId(visitorIdRaw)

  const variantRaw = request.cookies.get(COOKIE_NAMES.variant)?.value ?? null
  const existingVariant = isVariant(variantRaw) ? variantRaw : null

  const sessionIdRaw = request.cookies.get(COOKIE_NAMES.session)?.value
  const sessionId =
    typeof sessionIdRaw === 'string' && sessionIdRaw.length > 0
      ? sessionIdRaw
      : null

  const decision = decide({
    visitorId,
    existingVariant,
    sessionId,
    isPreview,
    isCrawler,
  })

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-variant', decision.variant)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // Propagar variante efectiva vía header para que la página la lea primero (antes que la cookie).
  response.headers.set('x-variant', decision.variant)

  // Aplicar cookies decididas.
  if (decision.setVisitor) {
    setCookie(response, COOKIE_NAMES.visitor, decision.setVisitor, THIRTY_DAYS)
  }
  if (decision.setVariant) {
    setCookie(response, COOKIE_NAMES.variant, decision.setVariant, THIRTY_DAYS)
  }
  if (decision.setSession) {
    setCookie(response, COOKIE_NAMES.session, decision.setSession, SESSION_TTL)
  }

  // Registrar impresión solo si corresponde y hay sesión nueva. No romper la página si falla.
  if (decision.shouldRecordImpression && decision.setSession) {
    try {
      await recordImpression({
        visitorId: decision.setVisitor ?? visitorId ?? '',
        variant: decision.variant,
        sessionId: decision.setSession,
      })
    } catch (err) {
      console.error('[proxy] error registrando impresión:', err)
    }
  }

  return response
}

export const config = {
  matcher: ['/practica'],
}
