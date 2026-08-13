import 'server-only';
import { eq } from 'drizzle-orm';

import { DatabaseNotConfiguredError, getDb } from '@/lib/db/client';
import { inspectionRequests, type InspectionRequestRow } from '@/lib/db/schema';
import { isDatabaseConfigured, isProduction } from '@/lib/env';
import { generateReference } from '@/lib/inspection/reference';
import type { InspectionRequest } from '@/lib/inspection/schema';

/**
 * Persistence for inspection requests.
 *
 * One narrow interface with two implementations. Production writes to PostgreSQL. When
 * `DATABASE_URL` is absent **and the build is not production**, a memory store stands in so
 * a fresh clone can run `pnpm dev`, submit the form, and see the real success path without
 * anyone provisioning a database first.
 *
 * The condition is the important part. In production an unset `DATABASE_URL` is a
 * misconfiguration, and quietly accepting leads into a variable that dies with the process
 * would lose real business while showing the visitor a confirmation. So production refuses
 * and the visitor is told the request was not recorded. Silently dropping a lead is the one
 * outcome this module exists to prevent.
 */

export interface InspectionStore {
  create(request: InspectionRequest): Promise<{ reference: string; createdAt: Date }>;
  findByReference(reference: string): Promise<InspectionRequestRow | null>;
  /**
   * Record what happened to this row's notification email.
   *
   * Called after the send resolves, one way or the other, so a lead nobody was told about is
   * distinguishable from one they were — see `scripts/unsent-notifications.mjs`. Never throws
   * for a row that does not exist: the caller is in a best-effort path and a missing row is
   * not worth a second failure.
   */
  recordNotification(
    reference: string,
    outcome: { sentAt: Date } | { error: string }
  ): Promise<void>;
}

/** How many times to retry a reference collision before giving up. */
const REFERENCE_ATTEMPTS = 5;

/* ──────────────────────────────── postgres ───────────────────────────────── */

const postgresStore: InspectionStore = {
  async create(request) {
    const db = getDb();
    const consentedAt = new Date();

    // The unique index on `reference` is the authority, not a pre-flight SELECT: two
    // concurrent inserts could both pass that check and only one would survive. Collisions
    // are astronomically unlikely at 30^8, so this loop should never spend a second
    // iteration — it exists so that "should never" is not load-bearing.
    for (let attempt = 0; attempt < REFERENCE_ATTEMPTS; attempt++) {
      const reference = generateReference();
      try {
        const [row] = await db
          .insert(inspectionRequests)
          .values({
            reference,
            name: request.name,
            phone: request.phone,
            area: request.area,
            setting: request.setting,
            notes: request.notes,
            locale: request.locale,
            consentedAt,
          })
          .returning({
            reference: inspectionRequests.reference,
            createdAt: inspectionRequests.createdAt,
          });

        if (row) return row;
      } catch (error) {
        if (!isUniqueViolation(error) || attempt === REFERENCE_ATTEMPTS - 1) throw error;
      }
    }

    throw new Error('Could not allocate a unique request reference.');
  },

  async findByReference(reference) {
    const db = getDb();
    const rows = await db.query.inspectionRequests.findMany({
      where: (table, { eq }) => eq(table.reference, reference),
      limit: 1,
    });
    return rows[0] ?? null;
  },

  async recordNotification(reference, outcome) {
    const db = getDb();
    await db
      .update(inspectionRequests)
      .set(
        'sentAt' in outcome
          ? { notifiedAt: outcome.sentAt, notificationError: null, updatedAt: new Date() }
          : { notifiedAt: null, notificationError: outcome.error, updatedAt: new Date() }
      )
      .where(eq(inspectionRequests.reference, reference));
  },
};

/** PostgreSQL unique-violation SQLSTATE, surfaced by the `postgres` driver as `code`. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}

/* ─────────────────────────── development fallback ────────────────────────── */

const memoryRows = new Map<string, InspectionRequestRow>();

const memoryStore: InspectionStore = {
  async create(request) {
    let reference = generateReference();
    while (memoryRows.has(reference)) reference = generateReference();

    const now = new Date();
    memoryRows.set(reference, {
      id: crypto.randomUUID(),
      reference,
      name: request.name,
      phone: request.phone,
      area: request.area,
      setting: request.setting,
      // Not collected any more. The real table applies this as a column default; the memory
      // store has to write it explicitly to produce the same row shape.
      finish: 'unsure',
      notes: request.notes,
      locale: request.locale,
      consentedAt: now,
      status: 'new',
      notifiedAt: null,
      notificationError: null,
      createdAt: now,
      updatedAt: now,
    });

    console.warn(
      `[inspection] DATABASE_URL is not set — request ${reference} was held in memory and ` +
        `will be lost when this process exits. Set DATABASE_URL to persist it.`
    );

    return { reference, createdAt: now };
  },

  async findByReference(reference) {
    return memoryRows.get(reference) ?? null;
  },

  async recordNotification(reference, outcome) {
    const row = memoryRows.get(reference);
    if (!row) return;
    memoryRows.set(reference, {
      ...row,
      notifiedAt: 'sentAt' in outcome ? outcome.sentAt : null,
      notificationError: 'sentAt' in outcome ? null : outcome.error,
      updatedAt: new Date(),
    });
  },
};

/* ──────────────────────────────── selection ──────────────────────────────── */

let override: InspectionStore | null = null;

/** Install a different store. For tests, and for the seam's own sake. */
export function setInspectionStore(store: InspectionStore | null): void {
  override = store;
}

export function getInspectionStore(): InspectionStore {
  if (override) return override;
  if (isDatabaseConfigured()) return postgresStore;
  if (isProduction()) throw new DatabaseNotConfiguredError();
  return memoryStore;
}

/** True when submissions are being held in memory rather than persisted. */
export function isUsingMemoryStore(): boolean {
  return override === null && !isDatabaseConfigured() && !isProduction();
}
