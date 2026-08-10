import { brand } from '@/content/company';
import { inspectionForm } from '@/content/inspection';
import type { InspectionRequest } from '@/lib/inspection/schema';

/**
 * The lead-notification email — one bilingual, table-based HTML document plus a plain-text
 * fallback, sent to the team's own inbox by `lead-notification.ts`.
 *
 * ── Why table-based HTML, inline styles, no external anything ─────────────────
 * This has to render correctly in whatever the team actually opens it in, which for a small
 * Egyptian business is very plausibly Outlook desktop — still built on Word's HTML engine,
 * which ignores most of CSS beyond inline styles on tables. There is no external stylesheet,
 * no webfont, no background image and no `<style>` block depended on for anything structural;
 * `<style>` is used only for the `color-scheme` opt-out below, which degrades harmlessly
 * where it is not understood.
 *
 * ── Why every value is escaped ─────────────────────────────────────────────────
 * Every field below is visitor-supplied free text that has passed validation, not sanitisation
 * — the Zod schema checks length and shape, not HTML safety. Interpolating `request.notes`
 * unescaped would let a submission write live markup into the team's inbox. `esc()` is the one
 * place text enters the HTML string, and every interpolated field goes through it.
 *
 * ── Why bilingual labels rather than a language switch ─────────────────────────
 * This email has exactly one reader: someone on the team, who may be more comfortable in
 * either language regardless of which one the visitor submitted in. Every label is shown as
 * "English / العربية" so nothing depends on guessing the right reader — no locale branch, no
 * possibility of the wrong one.
 */

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const INK = '#3d3929';
const INK_2 = '#5c5747';
const INK_3 = '#6f6a5b';
const PAPER = '#faf9f5';
const PAPER_RAISED = '#ffffff';
const RULE = '#e3e0d5';
const ACCENT = '#a84e2b';

type Row = { labelEn: string; labelAr: string; value: string; href?: string };

function fieldRows(request: InspectionRequest): Row[] {
  const setting = inspectionForm.setting.options[request.setting];
  const finish = inspectionForm.finish.options[request.finish];

  const rows: Row[] = [
    { labelEn: 'Name', labelAr: 'الاسم', value: request.name },
    { labelEn: 'Phone', labelAr: 'الهاتف', value: request.phone, href: `tel:${request.phone}` },
    { labelEn: 'Area', labelAr: 'المنطقة', value: request.area },
    { labelEn: 'Setting', labelAr: 'نوع المكان', value: `${setting.en} / ${setting.ar}` },
    { labelEn: 'Finish', labelAr: 'التشطيب', value: `${finish.en} / ${finish.ar}` },
    {
      labelEn: 'Submitted in',
      labelAr: 'لغة النموذج',
      value: request.locale === 'ar' ? 'Arabic / العربية' : 'English',
    },
  ];

  if (request.notes) rows.push({ labelEn: 'Notes', labelAr: 'ملاحظات', value: request.notes });

  return rows;
}

function row({ labelEn, labelAr, value, href }: Row): string {
  const displayValue = href
    ? `<a href="${esc(href)}" style="color:${ACCENT};text-decoration:none;font-weight:600;">${esc(value)}</a>`
    : esc(value);

  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${RULE};vertical-align:top;width:38%;">
        <span style="font-family:ui-monospace,'SF Mono',Consolas,monospace;font-size:11px;letter-spacing:0.04em;color:${INK_3};text-transform:uppercase;">
          ${esc(labelEn)} / ${esc(labelAr)}
        </span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid ${RULE};vertical-align:top;font-size:15px;color:${INK};line-height:1.5;">
        ${displayValue}
      </td>
    </tr>`;
}

export function renderLeadEmailHtml(
  request: InspectionRequest,
  reference: string,
  submittedAt: Date
): string {
  const timestamp = submittedAt.toLocaleString('en-GB', {
    timeZone: 'Africa/Cairo',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-scheme" content="light" />
    <title>New site inspection request — ${esc(reference)}</title>
    <style>
      /* Opts every client that respects it out of automatic dark-mode inversion, so a
         light-designed template does not get repainted with unpredictable contrast. Everything
         structural is still inline, so a client that ignores this tag entirely still renders
         correctly — this only controls colour-scheme guessing. */
      :root { color-scheme: light; supported-color-scheme: light; }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:${PAPER};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <!-- Preheader: the inbox preview snippet, hidden from the rendered view. -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      New site inspection request from ${esc(request.name)} — ${esc(reference)}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAPER};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:${PAPER_RAISED};border:1px solid ${RULE};border-radius:12px;overflow:hidden;">
            <!-- Header -->
            <tr>
              <td style="padding:28px 28px 20px;border-bottom:1px solid ${RULE};">
                <div style="font-size:13px;letter-spacing:0.06em;text-transform:uppercase;color:${INK_3};font-weight:600;">
                  ${esc(brand.name)} · <span dir="rtl">${esc(brand.nameAr)}</span>
                </div>
                <div style="margin-top:10px;font-size:20px;font-weight:700;color:${INK};">
                  New site inspection request
                </div>
                <div dir="rtl" style="font-size:15px;color:${INK_2};margin-top:2px;">
                  طلب معاينة موقع جديد
                </div>
              </td>
            </tr>

            <!-- Reference -->
            <tr>
              <td style="padding:20px 28px 4px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-family:ui-monospace,'SF Mono',Consolas,monospace;font-size:11px;letter-spacing:0.04em;color:${INK_3};text-transform:uppercase;">
                      Reference / المرجع
                    </td>
                  </tr>
                  <tr>
                    <td style="font-family:ui-monospace,'SF Mono',Consolas,monospace;font-size:18px;font-weight:600;color:${ACCENT};padding-top:2px;">
                      ${esc(reference)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Fields -->
            <tr>
              <td style="padding:8px 28px 4px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${fieldRows(request).map(row).join('')}
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:20px 28px 28px;">
                <div style="font-size:12px;color:${INK_3};line-height:1.6;">
                  Received ${esc(timestamp)} (Cairo time). Automated notification — this
                  inbox is not monitored by the visitor.
                </div>
                <div dir="rtl" style="font-size:12px;color:${INK_3};line-height:1.6;margin-top:4px;">
                  استُلم في ${esc(timestamp)} (بتوقيت القاهرة). إشعار تلقائي، ولا يراقب الزائر هذا البريد.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderLeadEmailText(
  request: InspectionRequest,
  reference: string,
  submittedAt: Date
): string {
  const setting = inspectionForm.setting.options[request.setting];
  const finish = inspectionForm.finish.options[request.finish];
  const timestamp = submittedAt.toLocaleString('en-GB', {
    timeZone: 'Africa/Cairo',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const lines = [
    `${brand.name} — New site inspection request`,
    '',
    `Reference: ${reference}`,
    `Name: ${request.name}`,
    `Phone: ${request.phone}`,
    `Area: ${request.area}`,
    `Setting: ${setting.en} / ${setting.ar}`,
    `Finish: ${finish.en} / ${finish.ar}`,
    `Submitted in: ${request.locale === 'ar' ? 'Arabic' : 'English'}`,
    request.notes ? `Notes: ${request.notes}` : null,
    '',
    `Received ${timestamp} (Cairo time). Automated notification.`,
  ];

  return lines.filter((line): line is string => line !== null).join('\n');
}
