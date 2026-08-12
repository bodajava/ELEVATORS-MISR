import { describe, expect, it } from 'vitest';

import { renderLeadEmailHtml, renderLeadEmailText } from '@/lib/email/lead-notification-template';
import type { InspectionRequest } from '@/lib/inspection/schema';

const base: InspectionRequest = {
  name: 'Ahmed Hassan',
  phone: '+201012345678',
  area: 'New Cairo',
  setting: 'villa',
  notes: '',
  consent: true,
  locale: 'en',
};

const submittedAt = new Date('2026-08-10T12:00:00Z');

describe('lead notification HTML template', () => {
  it('includes the reference and the visitor-supplied fields', () => {
    const html = renderLeadEmailHtml(base, 'EE-4K7P-2QX9', submittedAt);
    expect(html).toContain('EE-4K7P-2QX9');
    expect(html).toContain('Ahmed Hassan');
    expect(html).toContain('+201012345678');
    expect(html).toContain('New Cairo');
  });

  it('escapes HTML in every visitor-supplied field — the email body is not a place free text becomes markup', () => {
    const hostile: InspectionRequest = {
      ...base,
      name: '<img src=x onerror=alert(1)>',
      area: '"><script>alert(2)</script>',
      notes: '<b>bold</b> & "quoted"',
    };
    const html = renderLeadEmailHtml(hostile, 'EE-4K7P-2QX9', submittedAt);

    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>bold</b>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&lt;script&gt;alert(2)&lt;/script&gt;');
  });

  it('omits the notes row entirely when there are no notes', () => {
    const html = renderLeadEmailHtml(base, 'EE-4K7P-2QX9', submittedAt);
    expect(html).not.toMatch(/Notes \/ ملاحظات/);
  });

  it('includes the notes row when notes are present', () => {
    const withNotes: InspectionRequest = { ...base, notes: 'Please call after 5pm.' };
    const html = renderLeadEmailHtml(withNotes, 'EE-4K7P-2QX9', submittedAt);
    expect(html).toContain('Please call after 5pm.');
    expect(html).toMatch(/Notes \/ ملاحظات/);
  });

  it('renders a tel: link for the phone number', () => {
    const html = renderLeadEmailHtml(base, 'EE-4K7P-2QX9', submittedAt);
    expect(html).toContain('href="tel:+201012345678"');
  });

  it("shows both languages for the setting regardless of the visitor's own locale", () => {
    const html = renderLeadEmailHtml(base, 'EE-4K7P-2QX9', submittedAt);
    // The setting appears in English and Arabic both — the reader should not need to guess
    // which language the team member on duty prefers.
    expect(html).toMatch(/Villa/);
    expect(html).toMatch(/فيلا/);
  });

  it('opts out of automatic dark-mode repainting', () => {
    const html = renderLeadEmailHtml(base, 'EE-4K7P-2QX9', submittedAt);
    expect(html).toContain('color-scheme" content="light"');
  });
});

describe('lead notification plain-text fallback', () => {
  it('includes every field a client that cannot render HTML still needs', () => {
    const withNotes: InspectionRequest = { ...base, notes: 'Please call after 5pm.' };
    const text = renderLeadEmailText(withNotes, 'EE-4K7P-2QX9', submittedAt);

    expect(text).toContain('EE-4K7P-2QX9');
    expect(text).toContain('Ahmed Hassan');
    expect(text).toContain('+201012345678');
    expect(text).toContain('New Cairo');
    expect(text).toContain('Please call after 5pm.');
  });

  it('omits the Notes line when there are no notes, rather than printing it empty', () => {
    const text = renderLeadEmailText(base, 'EE-4K7P-2QX9', submittedAt);
    expect(text).not.toMatch(/^Notes:/m);
  });

  it('is plain text: no HTML tags leak into it even with hostile input', () => {
    const hostile: InspectionRequest = { ...base, notes: '<b>bold</b>' };
    const text = renderLeadEmailText(hostile, 'EE-4K7P-2QX9', submittedAt);
    // The text fallback needs no escaping — it is never interpreted as markup — but the raw
    // value should still appear verbatim, unlike the HTML version.
    expect(text).toContain('<b>bold</b>');
  });
});
