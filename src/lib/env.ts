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

/**
 * Lead notification — Gmail SMTP via Nodemailer.
 *
 * `GMAIL_USER` does double duty as both the SMTP username and the message's `From` address:
 * Gmail's SMTP servers reject a `From` that is not the authenticated account (or one of its
 * configured "Send As" aliases), so there is no separate from-address to configure — unlike a
 * provider such as Resend, where any domain-verified address works. `GMAIL_APP_PASSWORD` is a
 * 16-character App Password from the Google Account's security settings, not the account's
 * login password — Google's SMTP no longer accepts the login password for third-party clients
 * once 2-Step Verification is on, which it must be to generate an App Password at all.
 *
 * All three or none: a from-account with nowhere to send is as useless as a destination with
 * nothing configured to send from. `isLeadNotificationConfigured()` is the single gate every
 * caller checks; the three readers below exist for the one call site that already knows the
 * gate passed, so it is not re-deriving `null` checks it has already done.
 */
export const gmailUser = () => read('GMAIL_USER');
export const gmailAppPassword = () => read('GMAIL_APP_PASSWORD');
export const leadNotificationEmail = () => read('LEAD_NOTIFICATION_EMAIL');

export const isLeadNotificationConfigured = () =>
  gmailUser() !== null && gmailAppPassword() !== null && leadNotificationEmail() !== null;

/**
 * Upstash Redis — the REST client, not a TCP connection string.
 *
 * `@upstash/redis` talks to Upstash over HTTPS/`fetch`, which is why it is the right client
 * for this app rather than a TCP client like `ioredis`: a Next.js route or server action runs
 * in a short-lived serverless invocation that cannot hold a persistent TCP socket the way a
 * long-running Node process can, and a TCP pool sized for that model exhausts a managed Redis
 * provider's connection limit almost immediately under real serverless concurrency. The two
 * variables below are the **REST API** credentials specifically — found on the Upstash
 * database's own page under "REST API", not the `redis://` connection string shown under
 * "Connect", which is a different credential for a different client entirely.
 */
export const upstashRedisRestUrl = () => read('UPSTASH_REDIS_REST_URL');
export const upstashRedisRestToken = () => read('UPSTASH_REDIS_REST_TOKEN');

/**
 * Why this is checked for *shape* and not merely for presence.
 *
 * `UPSTASH_REDIS_REST_URL` has to be an HTTPS origin. The Upstash console shows two different
 * credentials on two different tabs, and the one people reach for first is the wrong one: a
 * `redis://` connection string, or the whole `redis-cli --tls -u redis://…` command with the
 * binary name still attached. Both are non-empty strings, so a presence check passes them, and
 * the failure then surfaces at the worst possible moment — `new Redis()` throws synchronously,
 * which once took the entire server down at startup (see `src/lib/redis/client.ts`).
 *
 * Checking the shape here turns that into something a deployment preflight can catch, and it
 * is the difference between "distributed rate limiting is off" being a decision and being an
 * accident: in production, an invalid value must fail loudly rather than quietly degrade to
 * the in-memory limiter, which protects one instance out of however many are running.
 */
export type RedisConfigStatus =
  | { state: 'absent' }
  | { state: 'valid'; url: string; token: string }
  | { state: 'invalid'; reason: string };

export function redisConfigStatus(): RedisConfigStatus {
  const url = upstashRedisRestUrl();
  const token = upstashRedisRestToken();

  if (url === null && token === null) return { state: 'absent' };
  if (url === null) return { state: 'invalid', reason: 'UPSTASH_REDIS_REST_URL is not set' };
  if (token === null) return { state: 'invalid', reason: 'UPSTASH_REDIS_REST_TOKEN is not set' };

  if (/^redis(s)?:\/\//i.test(url)) {
    return {
      state: 'invalid',
      reason:
        'UPSTASH_REDIS_REST_URL is a redis:// connection string. That is the TCP credential ' +
        'for a different client. Use the HTTPS endpoint from the database’s "REST API" tab.',
    };
  }
  if (/\s/.test(url)) {
    return {
      state: 'invalid',
      reason:
        'UPSTASH_REDIS_REST_URL contains whitespace — it looks like a shell command was ' +
        'pasted rather than the URL on its own.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { state: 'invalid', reason: `UPSTASH_REDIS_REST_URL is not a URL: ${url}` };
  }
  if (parsed.protocol !== 'https:') {
    return {
      state: 'invalid',
      reason: `UPSTASH_REDIS_REST_URL must be https://, got ${parsed.protocol}//`,
    };
  }

  return { state: 'valid', url, token };
}

/**
 * True only when Redis is configured **and** the configuration is shaped correctly.
 *
 * An invalid value reads as unconfigured here so that no caller has to think about it: the
 * in-memory fallbacks are already correct for a single instance, and `redisConfigStatus()`
 * plus the preflight are where a broken value gets reported.
 */
export const isRedisConfigured = () => redisConfigStatus().state === 'valid';

export const isProduction = () => process.env.NODE_ENV === 'production';
