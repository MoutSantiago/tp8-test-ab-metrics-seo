-- Esquema inicial del experimento A/B Taller Norte.
-- Montado por Postgres en /docker-entrypoint-initdb.d al crear el volumen.

CREATE TABLE IF NOT EXISTS impressions (
  id SERIAL PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('A', 'B')),
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversions (
  id SERIAL PRIMARY KEY,
  visitor_id TEXT NOT NULL UNIQUE,
  variant TEXT NOT NULL CHECK (variant IN ('A', 'B')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
