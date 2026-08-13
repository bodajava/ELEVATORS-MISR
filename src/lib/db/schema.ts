import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/**
 * Database schema.
 *
 * Plain PostgreSQL — no provider extensions, no vendor types, no RLS policies expressed
 * here. It applies identically to a local Postgres, Neon, Supabase, RDS or Cloud SQL, which
 * is the point: the deployment target is not a decision this repository has made.
 *
 * ── What is stored, and what is not ─────────────────────────────────────────
 * A lead is a name, a phone number and an area. That is what the form asks for and it is all
 * that is kept. Not stored: IP address (hashed in memory for rate limiting, never written),
 * user agent, referrer, session identifier, or any analytics join key. Every one of those
 * would be personal data under Egypt's PDPL with no operational purpose behind it.
 */

/**
 * What kind of building the lift is going into.
 *
 * `factory` was added on 2026-08-12, when the owner replaced the "Apartment building" option
 * with "Factories". `residence` stays in the type because rows recorded before that date hold
 * it and a Postgres enum value cannot be removed without rewriting the column — but the form
 * no longer offers it and `src/lib/inspection/schema.ts` no longer accepts it, so nothing new
 * can be written with it.
 */
export const inspectionSetting = pgEnum('inspection_setting', [
  'villa',
  'residence',
  'factory',
  'commercial',
  'unsure',
]);

/**
 * The finish the visitor had in mind.
 *
 * **No longer collected.** The question was removed from the form on 2026-08-12 on the
 * owner's instruction. The column is kept, with its default, so the historic rows that do
 * carry an answer stay readable; every new row takes the default and means "not asked".
 */
export const inspectionFinish = pgEnum('inspection_finish', [
  'brass-glass',
  'smoked-glass',
  'unsure',
]);

export const inspectionStatus = pgEnum('inspection_status', [
  'new',
  'contacted',
  'scheduled',
  'closed',
]);

export const requestLocale = pgEnum('request_locale', ['en', 'ar']);

export const inspectionRequests = pgTable(
  'inspection_requests',
  {
    /**
     * Internal identifier. Random, not sequential — but still internal: it is never sent to
     * the browser. `reference` is the public handle.
     */
    id: uuid('id').primaryKey().defaultRandom(),

    /**
     * The public reference the visitor is shown. Unique so `canonicaliseReference` can look
     * a request up unambiguously when someone reads it back over the phone.
     */
    reference: text('reference').notNull(),

    name: text('name').notNull(),
    /** E.164, normalised on the way in — one person is one value however they typed it. */
    phone: text('phone').notNull(),
    /** Free text: whatever the visitor calls their area. Not geocoded, not validated. */
    area: text('area').notNull(),

    setting: inspectionSetting('setting').notNull().default('unsure'),
    /** Not written any more — see the enum above. Every new row takes the default. */
    finish: inspectionFinish('finish').notNull().default('unsure'),
    notes: text('notes').notNull().default(''),

    /** The language the visitor was reading — determines the language of any follow-up. */
    locale: requestLocale('locale').notNull(),

    /**
     * Record of the consent that made this row lawful to hold. `consentedAt` is a real
     * column rather than an inferred one so a deletion request can be answered with
     * evidence rather than an assumption.
     */
    consentedAt: timestamp('consented_at', { withTimezone: true }).notNull(),

    status: inspectionStatus('status').notNull().default('new'),

    /**
     * When the team's notification email for this row was accepted by the SMTP server.
     *
     * Null means it has not been sent — which covers three different situations that an
     * operator needs to be able to tell apart, so `notificationError` carries the reason:
     * notification is switched off entirely (null error), the send failed (an error class),
     * or it has not been attempted yet. Without this column a failed send left no trace
     * anywhere except a log line, and a lead nobody was told about is indistinguishable from
     * one they were. `scripts/unsent-notifications.mjs` reads exactly these two columns.
     *
     * The email itself is never stored — not the body, not the recipient, not the payload.
     */
    notifiedAt: timestamp('notified_at', { withTimezone: true }),
    /** The failure's class, e.g. `Error (ETIMEDOUT)`. Never a message, never an address. */
    notificationError: text('notification_error'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('inspection_requests_reference_idx').on(table.reference),
    // The operational query is "what came in, newest first, still untouched".
    index('inspection_requests_status_created_idx').on(table.status, table.createdAt),
  ]
);

export type InspectionRequestRow = typeof inspectionRequests.$inferSelect;
export type NewInspectionRequestRow = typeof inspectionRequests.$inferInsert;
