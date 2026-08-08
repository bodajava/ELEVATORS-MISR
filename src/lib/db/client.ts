import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { databaseUrl } from '@/lib/env';
import * as schema from '@/lib/db/schema';

/**
 * Database connection.
 *
 * Provider-neutral by construction: the `postgres` driver over a standard connection string,
 * and nothing else. No Neon serverless driver, no Supabase client, no platform SDK. Point
 * `DATABASE_URL` at any PostgreSQL 14+ and this works unchanged.
 *
 * ── Lazy, and why it matters ────────────────────────────────────────────────
 * The connection is built on first use, not at import. This project prerenders 40 routes at
 * build time; a module-level `postgres(...)` would mean `pnpm build` needs live production
 * credentials, which is both a nuisance and a way to leak them into CI. Nothing here opens a
 * socket until a request asks it to.
 *
 * The instance is cached on `globalThis` because Next's dev server re-evaluates modules on
 * every edit, and a fresh pool per edit exhausts the server's connection limit within a few
 * minutes of ordinary work.
 */

const POOL_KEY = Symbol.for('egypt-elevators.pg');

type Cache = { sql: postgres.Sql; db: ReturnType<typeof drizzle<typeof schema>> };

const globalCache = globalThis as unknown as { [POOL_KEY]?: Cache };

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super('DATABASE_URL is not set, so there is nowhere to persist this request.');
    this.name = 'DatabaseNotConfiguredError';
  }
}

export function getDb() {
  const cached = globalCache[POOL_KEY];
  if (cached) return cached.db;

  const url = databaseUrl();
  if (!url) throw new DatabaseNotConfiguredError();

  const sql = postgres(url, {
    // Small on purpose. Serverless and edge-adjacent runtimes multiply this by the instance
    // count, and a lead form does not need throughput — it needs to not exhaust the server.
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    // Managed Postgres almost always fronts a certificate the driver cannot chain to a
    // system root. `sslmode=require` in the URL still encrypts; this stops the driver
    // refusing the handshake over the chain it cannot verify.
    ssl: url.includes('sslmode=require') ? 'require' : undefined,
    // Never emit query text or parameters: every row in this schema is personal data.
    onnotice: () => {},
  });

  const db = drizzle(sql, { schema });
  globalCache[POOL_KEY] = { sql, db };
  return db;
}

/** Close the pool. For scripts and tests; the server keeps its pool for its lifetime. */
export async function closeDb(): Promise<void> {
  const cached = globalCache[POOL_KEY];
  if (!cached) return;
  await cached.sql.end({ timeout: 5 });
  delete globalCache[POOL_KEY];
}
