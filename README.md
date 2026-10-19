# Taller Norte — Test A/B + Métricas + SEO (Laboratorio 01)

Proyecto Next.js 16 + React 19 que implementa un experimento A/B sobre una
única URL indexable (`/practica`) sin duplicar contenido para motores de
búsqueda. Una misma persona ve siempre el mismo mensaje; un buscador ve una
sola URL con un canonical único.

## Cómo levantarlo

```bash
cp .env.example .env
docker compose up --build
```

Esto levanta, en un solo comando:

- **db**: PostgreSQL 16 (puerto 5433 en el host, volumen nombrado).
- **web**: Next.js en producción (puerto 3000 en el host).

Luego de levantar, accede a:

- `http://localhost:3000/practica` — landing del experimento.
- `http://localhost:3000/bitacora` — métricas del experimento.
- `http://localhost:3000/practica?preview=a` y `?preview=b` — vistas previas
  de cada copy (no escriben cookies, llevan `noindex`).

## Estructura de archivos

| Archivo                   | Qué hace                                                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `proxy.ts`                | Asigna visitante y variante (`/practica`). Anota una impresión por sesión de 30 min. Propaga la variante efectiva por header `x-variant`. |
| `lib/experiment.ts`       | Hash estable (FNV-1a 32 bits), tasas, validadores de cookies/base, copy, oferta, caso de prueba fijo, formateadores.                      |
| `lib/db.ts`               | Pool de conexiones PostgreSQL (`pg`), singleton, sin lógica de negocio.                                                                   |
| `lib/events.ts`           | `recordImpression`, `recordConversion`, `getCounts`. Valida todo antes de insertar.                                                       |
| `app/practica/page.tsx`   | Metadatos en el servidor (`generateMetadata`) y landing.                                                                                  |
| `app/practica/actions.ts` | Server Action de conversión (una por visitante, solo CTA).                                                                                |
| `app/bitacora/page.tsx`   | Conteos de la base y caso de prueba fijo (tasas por fórmula).                                                                             |
| `components/landing.tsx`  | Landing con titular, CTA y oferta igual en ambas variantes.                                                                               |
| `components/cta.tsx`      | Botón CTA con feedback tras el clic.                                                                                                      |
| `app/layout.tsx`          | Layout raíz, tipografía, `metadataBase` por `SITE_URL`.                                                                                   |
| `Dockerfile`              | Imagen multi-stage con `output: 'standalone'`, usuario no root.                                                                           |
| `docker-compose.yml`      | Servicios `db` y `web` con `depends_on` y healthcheck.                                                                                    |
| `db/init.sql`             | Tablas `impressions` y `conversions`.                                                                                                     |
| `.env.example`            | Plantilla de variables de entorno (sin valores sensibles).                                                                                |

## Asignación de variante (hash)

Se usa **FNV-1a de 32 bits** sobre el identificador del visitante. Es una función
hash determinística: el mismo identificador devuelve siempre la misma variante
(`hash % 2 === 0` → `A`, de lo contrario → `B`).

Prueba de estabilidad con `lab-visitor-demo-01`:

```
assignVariant('lab-visitor-demo-01') → B
```

Repetir el cálculo 10 veces devuelve siempre `B`. No hay sorteo en cada render
ni dependencia de la URL.

## Gestor de paquetes

pnpm (`pnpm dev`, `pnpm build`, `pnpm install`).
