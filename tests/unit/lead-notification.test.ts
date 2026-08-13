import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { InspectionRequest } from '@/lib/inspection/schema';

/**
 * What the notification path owes the business, tested at the seam a visitor actually feels.
 *
 * The rule these all serve: **a lead that reached the database is never lost, and never turns
 * into a visitor-facing error, whatever the email does.** The send is awaited inside the
 * visitor's own submission, so every failure mode here is also a latency question.
 */

const sendMail = vi.fn();
const recordNotification = vi.fn();

vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail }) },
  createTransport: () => ({ sendMail }),
}));

vi.mock('@/lib/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/env')>()),
  isLeadNotificationConfigured: () => true,
  gmailUser: () => 'team@example.com',
  gmailAppPassword: () => 'abcd efgh ijkl mnop',
  leadNotificationEmail: () => 'leads@example.com',
}));

vi.mock('@/lib/redis/client', () => ({ getRedis: () => null }));

vi.mock('@/lib/db/inspection-repository', () => ({
  getInspectionStore: () => ({ recordNotification }),
}));

const request: InspectionRequest = {
  name: 'Ahmed Hassan',
  phone: '+201012345678',
  area: 'New Cairo',
  setting: 'villa',
  notes: '',
  consent: true,
  locale: 'en',
};

describe('lead notification', () => {
  beforeEach(() => {
    sendMail.mockReset();
    recordNotification.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('records the send against the row so an operator can find what went out', async () => {
    sendMail.mockResolvedValue({ messageId: 'x' });
    const { notifyLead } = await import('@/lib/email/lead-notification');

    await notifyLead(request, 'EE-TEST-0001');

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(recordNotification).toHaveBeenCalledWith(
      'EE-TEST-0001',
      expect.objectContaining({ sentAt: expect.any(Date) })
    );
  });

  it('retries once on a transient failure and succeeds without the caller knowing', async () => {
    sendMail
      .mockRejectedValueOnce(Object.assign(new Error('connect ECONNRESET'), { code: 'ECONNRESET' }))
      .mockResolvedValueOnce({ messageId: 'x' });
    const { notifyLead } = await import('@/lib/email/lead-notification');

    await expect(notifyLead(request, 'EE-TEST-0002')).resolves.toBeUndefined();

    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(recordNotification).toHaveBeenCalledWith(
      'EE-TEST-0002',
      expect.objectContaining({ sentAt: expect.any(Date) })
    );
  });

  it('gives up after the second attempt rather than retrying a credential that cannot work', async () => {
    sendMail.mockRejectedValue(Object.assign(new Error('Invalid login'), { code: 'EAUTH' }));
    const { notifyLead } = await import('@/lib/email/lead-notification');

    await expect(notifyLead(request, 'EE-TEST-0003')).resolves.toBeUndefined();

    expect(sendMail).toHaveBeenCalledTimes(2);
    const [reference, outcome] = recordNotification.mock.calls[0];
    expect(reference).toBe('EE-TEST-0003');
    expect(outcome.error).toContain('EAUTH');
  });

  it('never lets an SMTP failure escape into the submission', async () => {
    sendMail.mockRejectedValue(new Error('smtp is on fire'));
    const { notifyLead } = await import('@/lib/email/lead-notification');

    // The assertion is the absence of a throw: the caller in `actions.ts` has already written
    // the lead and returns success immediately after this resolves.
    await expect(notifyLead(request, 'EE-TEST-0004')).resolves.toBeUndefined();
  });

  it('survives the outcome write failing too — bookkeeping is not worth a lost confirmation', async () => {
    sendMail.mockResolvedValue({ messageId: 'x' });
    recordNotification.mockRejectedValue(new Error('database went away'));
    const { notifyLead } = await import('@/lib/email/lead-notification');

    await expect(notifyLead(request, 'EE-TEST-0005')).resolves.toBeUndefined();
  });

  it('logs the failure class and the reference, never the recipient or the payload', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    sendMail.mockRejectedValue(
      Object.assign(new Error('550 5.1.1 <leads@example.com> recipient rejected'), {
        code: 'EENVELOPE',
      })
    );
    const { notifyLead } = await import('@/lib/email/lead-notification');

    await notifyLead(request, 'EE-TEST-0006');

    const logged = spy.mock.calls.flat().join(' ');
    expect(logged).toContain('EE-TEST-0006');
    expect(logged).toContain('EENVELOPE');
    // The message quotes the envelope back, and the envelope is an address.
    expect(logged).not.toContain('leads@example.com');
    expect(logged).not.toContain('Ahmed Hassan');
    expect(logged).not.toContain('+201012345678');
  });
});
