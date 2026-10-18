import { Pool, type PoolClient } from 'pg'

let _pool: Pool | null = null

/**
 * Devuelve un pool de conexiones singleton a PostgreSQL.
 * Lee DATABASE_URL del entorno. Lanza error si no está definida.
 * Sin lógica de negocio: solo administra el pool.
 */
export function getPool(): Pool {
  if (_pool) return _pool
  if (!process.env.DATABASE_URL) {
    throw new Error('lib/db: DATABASE_URL no está definida en el entorno')
  }
  _pool = new Pool({ connectionString: process.env.DATABASE_URL })
  return _pool
}

/**
 * Cierra el pool de conexiones (útil en tests o al apagar el servidor).
 */
export async function closePool(): Promise<void> {
  if (!_pool) return
  await _pool.end()
  _pool = null
}
