# Reglas permanentes del trabajo (TP 8 — Test A/B + métricas + SEO)

Este archivo es de cumplimiento obligatorio. Se consulta antes de tocar cualquier archivo. Las reglas del trabajo están en `consigna.md`; consultarla cada vez que sea necesario.

## Gestor de paquetes
- Usar **pnpm** (`pnpm dev`, `pnpm build`, `pnpm install`). El repo ya trae `pnpm-lock.yaml`.

## Prohibiciones absolutas
- No usar `localStorage` ni `sessionStorage` (ni para asignación ni para eventos).
- No usar `Math.random()` en render ni en la asignación de variantes.
- La variante **nunca** va en la URL canónica. Canonical siempre `/practica`, sin query.
- `title` y `description` se generan en el servidor con `generateMetadata`, nunca en el cliente.
- No reescribir el copy ni la oferta: inicio 14 de abril, duración 8 semanas, cupo 12 personas, oficios carpintería/electricidad/cocina.
  - `title`: 50–60 caracteres. `description`: 140–160 caracteres.
- No declarar ganador en la bitácora. Las tasas se calculan con fórmula (`conversiones / impresiones`), nunca texto fijo. Sin impresiones, la tasa es `null`, nunca `0%`.

## Una responsabilidad por archivo
- `proxy.ts`: asignación de visitante y variante, anotación de impresión (sesión 30 min).
- `lib/experiment.ts`: hash estable, tasa, validación del log, copy, oferta, caso de prueba, formateadores.
- `app/practica/page.tsx`: metadatos (title/description/canonical) y landing.
- `app/practica/actions.ts`: conversión (una por visitante, solo desde el CTA).
- `app/bitacora/page.tsx`: conteos, tasas y diferencia (caso fijo incluido).

## Entorno y secretos
- No guardar secretos en el repo: usar `.env.example` y variables de entorno (`DATABASE_URL`, etc.). Nunca commitear `.env`.
- Proyecto dockerizado: `Dockerfile` + `docker-compose.yml` (web + base de datos), levantable con un único comando (`docker compose up --build`).

## Flujo esperado (según consigna.md)
1. Asignar en el primer request sin cookie: visitante + variante determinística (hash), persistir ambos. Recargar no cambia la variante.
2. Dos mensajes distintos, oferta igual.
3. Metadatos en el servidor; canonical único `/practica`. `?preview=a|b` lleva `noindex` y no pisa la cookie.
4. Una impresión por sesión de 30 minutos. Una conversión por visitante, solo con clic en el CTA.
5. Bitácora: impresiones, conversiones y tasa por variante + caso de prueba fijo (7,50% / 13,14% / 5,64 pp).
6. El log de eventos persiste en base de datos; la cookie alcanza solo para visitante y variante.

## Buenas prácticas básicas
- Escribir el código en el mismo idioma que la base actual: nombres de variables, funciones, comentarios y strings de usuario en español.
- Generar JSDocs simples en español para funciones exportadas y tipos públicos (qué hace, parámetros y valor de retorno).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
