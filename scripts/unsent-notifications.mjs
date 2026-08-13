/**
 * Which leads is nobody aware of?
 *
 * A lead is durable the moment it is written; the email telling the team about it is not, and
 * before `notified_at` existed a failed send left no trace anywhere except a log line that had
 * probably already rotated. This answers the only question that matters after an SMTP outage:
 * which requests came in that nobody was told about, so they can be worked by hand.
 *
 *   node scripts/unsent-notifications.mjs [--since 7d] [--json]
 *
 * ── What it prints, and what it refuses to ──────────────────────────────────
 * The reference, when it arrived, the locale, and the failure's class. **No personal data**:
 * not the name, not the phone number, not the area, not the notes. Those are in the database
 * for the team to look up against a reference through whatever tool they already use — this
 * one exists to produce a list of references, and printing a customer's phone number into a
 * terminal, a CI log or a screenshot is exactly the accident it is designed not to have.
 */
import { config } from 'dotenv';
import process from 'node:process';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const sinceArg = args.find((a) => a.startsWith('--since'))?.split('=')[1] ?? '7d';

const match = /^(\d+)([hd])$/.exec(sinceArg);
if (!match) {
  console.error(`--since must look like 24h or 7d, got "${sinceArg}"`);
  process.exit(2);
}
const hours = Number(match[1]) * (match[2] === 'd' ? 24 : 1);

const url = process.env.DATABASE_URL;
if (!url || url.trim() === '') {
  console.error('DATABASE_URL is not set — nothing to read.');
  process.exit(2);
}

const { default: postgres } = await import('postgres');
const sql = postgres(url, { max: 1, idle_timeout: 5, connect_timeout: 10, onnotice: () => {} });

try {
  const rows = await sql`
    select reference, created_at, locale, notification_error, status
    from inspection_requests
    where notified_at is null
      and created_at > now() - ${`${hours} hours`}::interval
    order by created_at desc
  `;

  const total = await sql`
    select count(*)::int as count
    from inspection_requests
    where created_at > now() - ${`${hours} hours`}::interval
  `;

  if (JSON_OUT) {
    console.log(
      JSON.stringify(
        {
          windowHours: hours,
          received: total[0].count,
          unsent: rows.map((r) => ({
            reference: r.reference,
            createdAt: r.created_at,
            locale: r.locale,
            error: r.notification_error,
            status: r.status,
          })),
        },
        null,
        2
      )
    );
  } else {
    console.log(`\n══ notifications not sent — last ${sinceArg} ══\n`);
    console.log(`  ${total[0].count} request(s) received, ${rows.length} with no notification\n`);
    if (rows.length === 0) {
      console.log('  Nothing outstanding.\n');
    } else {
      console.log(`  ${'reference'.padEnd(16)}${'arrived'.padEnd(26)}${'loc'.padEnd(5)}reason`);
      for (const r of rows) {
        const reason =
          r.notification_error ??
          'no attempt recorded — notification is probably switched off in this environment';
        console.log(
          `  ${r.reference.padEnd(16)}${new Date(r.created_at).toISOString().padEnd(26)}${String(r.locale).padEnd(5)}${reason}`
        );
      }
      console.log('\n  Look each reference up in the database to contact the visitor.\n');
    }
  }
} finally {
  await sql.end({ timeout: 5 }).catch(() => {});
}
