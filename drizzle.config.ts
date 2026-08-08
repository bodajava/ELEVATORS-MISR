import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit configuration.
 *
 * Migrations run against `DIRECT_URL` when one exists, because providers that front Postgres
 * with PgBouncer in transaction pooling mode cannot run DDL over the pooled endpoint. Where
 * there is no separate endpoint — local Postgres, RDS, Cloud SQL — `DATABASE_URL` is used
 * and the distinction costs nothing.
 *
 * `dialect: 'postgresql'` and nothing provider-specific: the SQL this emits applies to any
 * PostgreSQL 14+.
 *
 *   pnpm db:generate   write a migration from the schema diff (no database needed)
 *   pnpm db:migrate    apply pending migrations
 *   pnpm db:studio     browse the data
 */
config({ path: ['.env.local', '.env'], quiet: true });

const url = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  // `generate` diffs the schema against the migration folder and never connects. Only
  // `migrate`, `push` and `studio` need this, and they fail with a clear message when it is
  // absent — which is better than this file throwing at import and breaking `generate` too.
  dbCredentials: { url: url ?? '' },
  strict: true,
  verbose: true,
});
