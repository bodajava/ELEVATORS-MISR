import 'server-only';

/**
 * Server environment.
 *
 * Read lazily and validated at the point of use, never at module load. That distinction
 * matters more than it looks: this project prerenders 40 routes at build time, and a module
 * that throws on import because `DATABASE_URL` is unset would make the build depend on
 * production credentials. Nothing here runs until a request actually needs it.
 *
 * `server-only` makes an accidental client import a build error rather than a leaked secret.
 * The one public value, `NEXT_PUBLIC_SITE_URL`, is deliberately *not* here — it is read in
 * `src/content/company.ts`, which both runtimes may import.
 */

/** Thrown when a required variable is absent or empty. Caught by callers that can degrade. */
export class MissingEnvError extends Error {
  constructor(readonly key: string) {
    super(
      `Environment variable ${key} is not set. Copy .env.example to .env.local and fill it in.`
    );
    this.name = 'MissingEnvError';
  }
}

function read(key: string): string | null {
  const value = process.env[key];
  return value === undefined || value.trim() === '' ? null : value.trim();
}

function require_(key: string): string {
  const value = read(key);
  if (value === null) throw new MissingEnvError(key);
  return value;
}

/** Runtime database connection string. Prefer the pooled endpoint. */
export const databaseUrl = () => read('DATABASE_URL');

/**
 * Connection string for migrations. Falls back to `DATABASE_URL` when the provider has no
 * separate direct endpoint — which is the common case outside PgBouncer-fronted platforms.
 */
export const migrationDatabaseUrl = () => read('DIRECT_URL') ?? require_('DATABASE_URL');

/**
 * Salt for hashing client IPs into rate-limit keys.
 *
 * Required in production: without it the limiter would either key on raw IPs (holding
 * personal data it has no reason to hold) or on a constant, which would throttle every
 * visitor together. In development an ephemeral per-process value is generated instead so
 * `pnpm dev` works from a clean checkout.
 */
export const rateLimitSalt = (): string => {
  const configured = read('RATE_LIMIT_SALT');
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') throw new MissingEnvError('RATE_LIMIT_SALT');
  return developmentSalt;
};

const developmentSalt = `dev-only-${Math.random().toString(36).slice(2)}`;

/** True when persistence is configured. Callers branch on this rather than catching. */
export const isDatabaseConfigured = () => databaseUrl() !== null;

export const isProduction = () => process.env.NODE_ENV === 'production';
