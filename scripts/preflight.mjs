/**
 * Deployment preflight — is this environment actually able to take a lead?
 *
 * Checks the five integrations the inspection request depends on, reports what each one would
 * do under the current configuration, and exits non-zero when something is configured **wrong**
 * as opposed to configured **off**. That distinction is the whole point:
 *
 *   · absent   — a supported state. Blank Gmail credentials mean nobody is emailed; blank
 *                Redis means the single-instance in-memory limiter. Both are documented
 *                degradations and neither loses a lead.
 *   · invalid  — a mistake. A `redis://` string in a REST URL, a database that will not accept
 *                a connection, a migration that has not been applied. These pass a
 *                "is it non-empty" check and fail at the worst possible moment instead.
 *
 * In production (`--production`, or NODE_ENV=production) an `invalid` result fails the run, and
 * so does an `absent` result for anything required to serve traffic safely. In development
 * everything is reported and nothing fails.
 *
 *   node scripts/preflight.mjs [--production] [--json]
 *
 * It never prints a credential. Values are reported as a state and, where a host is useful for
 * telling two environments apart, as a hostname alone.
 */
import { config } from 'dotenv';
import process from 'node:process';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

const args = process.argv.slice(2);
const PRODUCTION = args.includes('--production') || process.env.NODE_ENV === 'production';
const JSON_OUT = args.includes('--json');

const results = [];
const record = (name, state, detail, { requiredInProduction = false } = {}) =>
  results.push({ name, state, detail, requiredInProduction });

const read = (key) => {
  const value = process.env[key];
  return value === undefined || value.trim() === '' ? null : value.trim();
};

/** A URL reduced to something safe to print: scheme and host, never userinfo or a token. */
const safeHost = (value) => {
  try {
    return new URL(value).host;
  } catch {
    return '(unparseable)';
  }
};

/* ── PostgreSQL: can we connect, and is the schema current? ─────────────────── */
async function checkDatabase() {
  const url = read('DATABASE_URL');
  if (!url) {
    record('database', 'absent', 'DATABASE_URL is not set — requests would be held in memory', {
      requiredInProduction: true,
    });
    return;
  }

  let sql;
  try {
    const { default: postgres } = await import('postgres');
    sql = postgres(url, { max: 1, idle_timeout: 5, connect_timeout: 10, onnotice: () => {} });
    const [{ version }] = await sql`select version()`;
    const server = String(version).split(' ').slice(0, 2).join(' ');

    // Migration state, read from Drizzle's own journal table rather than inferred from the
    // presence of a table — a partially applied migration is the case worth catching.
    const applied = await sql`
      select count(*)::int as count
      from information_schema.tables
      where table_schema = 'drizzle' and table_name = '__drizzle_migrations'
    `;
    if (applied[0].count === 0) {
      record(
        'database.migrations',
        'invalid',
        'no drizzle migration journal — run pnpm db:migrate',
        {
          requiredInProduction: true,
        }
      );
    } else {
      const rows = await sql`select count(*)::int as count from drizzle.__drizzle_migrations`;
      const { readdirSync } = await import('node:fs');
      const onDisk = readdirSync(new URL('../drizzle/', import.meta.url)).filter((f) =>
        f.endsWith('.sql')
      ).length;
      const state = rows[0].count >= onDisk ? 'ok' : 'invalid';
      record(
        'database.migrations',
        state,
        `${rows[0].count} applied, ${onDisk} on disk${state === 'ok' ? '' : ' — run pnpm db:migrate'}`,
        { requiredInProduction: true }
      );
    }

    // The one table the lead path writes to. Absent means the migration ran somewhere else.
    const table = await sql`
      select count(*)::int as count
      from information_schema.tables
      where table_schema = 'public' and table_name = 'inspection_requests'
    `;
    record(
      'database',
      table[0].count === 1 ? 'ok' : 'invalid',
      `${safeHost(url)} · ${server}${table[0].count === 1 ? '' : ' · inspection_requests is missing'}`,
      { requiredInProduction: true }
    );
  } catch (error) {
    record('database', 'invalid', `${safeHost(url)} · ${errorClass(error)}`, {
      requiredInProduction: true,
    });
  } finally {
    await sql?.end({ timeout: 5 }).catch(() => {});
  }
}

/* ── Redis: shape first, then a real round trip ─────────────────────────────── */
async function checkRedis() {
  const url = read('UPSTASH_REDIS_REST_URL');
  const token = read('UPSTASH_REDIS_REST_TOKEN');

  if (!url && !token) {
    record(
      'redis',
      'absent',
      'not configured — in-memory rate limiting, correct for a single instance'
    );
    return;
  }
  if (!url || !token) {
    record('redis', 'invalid', `only ${url ? 'the URL' : 'the token'} is set; both are required`);
    return;
  }
  if (/^rediss?:\/\//i.test(url)) {
    record(
      'redis',
      'invalid',
      'UPSTASH_REDIS_REST_URL is a redis:// connection string — use the HTTPS endpoint from the "REST API" tab'
    );
    return;
  }
  if (/\s/.test(url)) {
    record(
      'redis',
      'invalid',
      'UPSTASH_REDIS_REST_URL contains whitespace — a command was pasted, not a URL'
    );
    return;
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    record('redis', 'invalid', 'UPSTASH_REDIS_REST_URL is not a URL');
    return;
  }
  if (parsed.protocol !== 'https:') {
    record('redis', 'invalid', `UPSTASH_REDIS_REST_URL must be https://, got ${parsed.protocol}//`);
    return;
  }

  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({ url, token });
    const key = `preflight:${Date.now()}`;
    await redis.set(key, '1', { ex: 30 });
    const value = await redis.get(key);
    await redis.del(key);
    record('redis', value === '1' || value === 1 ? 'ok' : 'invalid', `${parsed.host} · round trip`);
  } catch (error) {
    record('redis', 'invalid', `${parsed.host} · ${errorClass(error)}`);
  }
}

/* ── Gmail SMTP: all three or none, and the credentials must authenticate ───── */
async function checkEmail() {
  const user = read('GMAIL_USER');
  const password = read('GMAIL_APP_PASSWORD');
  const to = read('LEAD_NOTIFICATION_EMAIL');
  const set = [user, password, to].filter(Boolean).length;

  if (set === 0) {
    record('email', 'absent', 'not configured — leads are recorded but nobody is notified');
    return;
  }
  if (set < 3) {
    const missing = [
      !user && 'GMAIL_USER',
      !password && 'GMAIL_APP_PASSWORD',
      !to && 'LEAD_NOTIFICATION_EMAIL',
    ].filter(Boolean);
    record('email', 'invalid', `partially configured — missing ${missing.join(', ')}`);
    return;
  }
  // An App Password is sixteen characters, usually shown in four groups of four. The login
  // password is the thing people paste instead, and Gmail rejects it at send time.
  if (password.replace(/\s/g, '').length !== 16) {
    record(
      'email',
      'invalid',
      'GMAIL_APP_PASSWORD is not 16 characters — that is an App Password, not the account password'
    );
    return;
  }

  try {
    const { createTransport } = await import('nodemailer');
    const transport = createTransport({
      service: 'gmail',
      auth: { user, pass: password.replace(/\s/g, '') },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
    await transport.verify();
    transport.close();
    record('email', 'ok', `authenticated as ${user.replace(/^(.).*(@.*)$/, '$1***$2')}`);
  } catch (error) {
    record('email', 'invalid', errorClass(error));
  }
}

/* ── Concierge provider: is one configured, and which? ──────────────────────── */
function checkConcierge() {
  const providers = [
    ['ANTHROPIC_API_KEY', 'Anthropic'],
    ['OPENAI_API_KEY', 'OpenAI'],
    ['GOOGLE_GENERATIVE_AI_API_KEY', 'Google Gemini'],
  ].filter(([key]) => read(key));

  if (providers.length === 0) {
    record('concierge', 'absent', 'no provider key — the concierge renders its unavailable state');
    return;
  }
  record('concierge', 'ok', `${providers.map(([, name]) => name).join(', ')} configured`);
}

/* ── The two variables that are required outright in production ─────────────── */
function checkRequired() {
  const salt = read('RATE_LIMIT_SALT');
  record(
    'rateLimitSalt',
    salt ? (salt.length >= 16 ? 'ok' : 'invalid') : 'absent',
    salt
      ? salt.length >= 16
        ? `${salt.length} characters`
        : `only ${salt.length} characters — generate one with: openssl rand -base64 32`
      : 'RATE_LIMIT_SALT is not set; the server refuses submissions in production without it',
    { requiredInProduction: true }
  );

  const site = read('NEXT_PUBLIC_SITE_URL');
  if (!site) {
    record('siteUrl', 'absent', 'NEXT_PUBLIC_SITE_URL is not set — canonical URLs would be wrong', {
      requiredInProduction: true,
    });
    return;
  }
  let parsed;
  try {
    parsed = new URL(site);
  } catch {
    record('siteUrl', 'invalid', 'NEXT_PUBLIC_SITE_URL is not a URL', {
      requiredInProduction: true,
    });
    return;
  }
  const localhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  record(
    'siteUrl',
    PRODUCTION && (localhost || parsed.protocol !== 'https:') ? 'invalid' : 'ok',
    `${parsed.origin}${site.endsWith('/') ? ' — remove the trailing slash' : ''}`,
    { requiredInProduction: true }
  );
}

/** Never the message: a provider error can carry a URL with credentials in it. */
function errorClass(error) {
  const name = error?.name ?? 'Error';
  const code = error?.code ? ` (${error.code})` : '';
  return `${name}${code}`;
}

/* ── Run ────────────────────────────────────────────────────────────────────── */
checkRequired();
checkConcierge();
await checkDatabase();
await checkRedis();
await checkEmail();

const symbol = { ok: '✓', absent: '·', invalid: '✗' };
const failures = results.filter(
  (r) => r.state === 'invalid' || (PRODUCTION && r.requiredInProduction && r.state === 'absent')
);

if (JSON_OUT) {
  console.log(
    JSON.stringify({ production: PRODUCTION, results, ok: failures.length === 0 }, null, 2)
  );
} else {
  console.log(`\n══ preflight — ${PRODUCTION ? 'production' : 'development'} ══\n`);
  for (const r of results) {
    console.log(`  ${symbol[r.state] ?? '?'} ${r.name.padEnd(22)} ${r.detail}`);
  }
  console.log('');
  if (failures.length === 0) {
    console.log(
      PRODUCTION
        ? 'PASS — every integration required to serve traffic is configured and reachable.'
        : 'PASS — nothing is misconfigured. Anything marked · is off, which is a supported state.'
    );
  } else {
    console.log(`FAIL — ${failures.length} blocking issue(s):`);
    for (const r of failures) console.log(`  ✗ ${r.name}: ${r.detail}`);
  }
  console.log('');
}

process.exit(failures.length === 0 ? 0 : 1);
