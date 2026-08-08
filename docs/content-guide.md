# Content Guide — verified facts, and what may not be said

Every factual claim on the site must trace to this document. If it is not here, it is not verified,
and it does not ship. Source: the company work-history record
(`reference/private/company-work-history-2025.pdf`, git-ignored, never published).

---

## 1. Verified from the company record

Audited 2026-08-06. Text extracted with `pdftotext` and counted programmatically, not by eye.

| Fact                                                              | Value                                                                     | Where it appears                  |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------- |
| Total documented **project records**                              | **213**                                                                   | rows 1–213                        |
| Records with a stated lift type                                   | **201**                                                                   | 12 rows leave the type cell blank |
| Records **classified Panorama** (بانوراما)                        | **51**                                                                    | type column                       |
| Records classified Hydraulic (هيدروليك)                           | 71                                                                        | type column                       |
| Records classified Electric / traction (كهربائي، كهربائى، كهرباء) | 76                                                                        | type column                       |
| Records classified Dumbwaiter (طعام)                              | 5                                                                         | type column                       |
| Commercial registration                                           | **C.R. 151595**                                                           | printed on every page header      |
| Company's own English name                                        | **"Arab Egypt Co. for Lifts"**                                            | printed on every page header      |
| Stated activities                                                 | Supply & installation, repair, maintenance (توريد وتركيب – إصلاح – صيانة) | page header                       |
| Document title                                                    | سابقة أعمال الشركة لعام 2025                                              | page 1                            |

Counts reconcile: 51 + 71 + 76 + 5 = 203, minus 2 compound cells (`هيدروليك+كهرباء`,
`بانوراما+طعام`) counted twice = **201 typed records**. ✔

### 1.1 The approved experience statement

> **English:** "Backed by 213 documented project records, including 51 panorama-classified projects."
>
> **Arabic:** «خبرة موثقة عبر 213 سجل مشروع، من بينها 51 مشروعًا مصنفًا ضمن مصاعد البانوراما.»

This is the **only** permitted phrasing. Use these figures only with that context.

### 1.2 Counting methodology and its limits

**How the numbers were produced.** Text was extracted from the PDF with `pdftotext -layout`, bidi
control characters were stripped, and each table row was matched on its leading type cell. Counting
was programmatic, not visual. Compound cells (`هيدروليك+كهرباء`, `بانوراما+طعام`) are counted once in
each of their categories, which is why the per-type totals sum to 203 across 201 typed records.

**What these numbers are not.** A row is a _record_, and a record is not a unit:

- **Some records cover multiple units.** The quantity column contains values of 2, 3 and 7, not only 1.
  213 records therefore represents _more_ than 213 units, by an amount this document does not let us
  determine reliably.
- **12 records state no type at all**, so the type breakdown describes 201 records, not 213.
- **Some records have incomplete or blank quantity data**, so the units in those rows are unknown.
- **The record is a work log, not a client list.** One client may appear on several rows.
- **Nothing indicates project status.** These are historical records, not currently active work.

**Therefore, never convert these row counts into:** installed-unit counts, elevator counts, client
counts, currently-active project counts, annual throughput, or any figure implying scale beyond
"documented project records". Never write "213 elevators", "213 installations", "51 panorama
elevators", "over 200 projects", or any rounding that blurs the 51-of-213 relationship.

If a unit-level or client-level figure is ever needed, it must come from the company directly — it
cannot be derived from this document.

### 1.3 Geographic coverage — verified, publishable

Area names appear throughout the record. These are **city/district level only** — no addresses, no
unit numbers — so they carry no private information:

New Cairo (التجمع) · 6th of October (أكتوبر) · Sheikh Zayed (الشيخ زايد) · Al Rehab (الرحاب) ·
Madinaty (مدينتي) · New Administrative Capital (العاصمة الإدارية) · Obour (العبور) ·
Shorouk (الشروق) · Katameya (القطامية) · Nasr City (مدينة نصر) · Heliopolis (مصر الجديدة) ·
Mohandessin (المهندسين) · Mokattam (المقطم) · Giza (الجيزة) · Helwan (حلوان) · Qalyub (قليوب) ·
North Coast (الساحل الشمالي) · Alexandria (الإسكندرية) · Asyut (أسيوط) · Suez (السويس)

Safe claim: _"Installations across Greater Cairo, the New Administrative Capital, the North Coast,
Alexandria, Asyut and Suez."_

---

## 2. Present in the source but deliberately NOT used

### 2.1 Contact details — found, not used

The PDF footer carries a full address, telefax, mobile and email on every page.

**These are not in the build and must not be added from this source.** The instruction is explicit:
do not scrape contact details from assets, watermarks, screenshots, or the PDF. They are recorded here
only so the company can confirm them quickly — a confirmed value supplied directly by the user is the
only thing that may ship.

Until then the site omits phone, email, address, hours, founding year and social links entirely.
No placeholders, no "coming soon", no empty `tel:` links.

### 2.2 Client names, addresses, villa and unit numbers

The record is overwhelmingly composed of **named private individuals** with villa numbers, compound
names and street addresses. **None of it may be published in any form** — not as a client list, not as
a case-study title, not as an anonymised-but-guessable reference, and not inside the AI concierge's
knowledge base.

The concierge's knowledge is assembled only from `src/content/*`, so it structurally cannot reach this
document.

### 2.3 Institutional clients — available, unused, needs approval

The record includes public institutions: the Supreme Council of Antiquities (Museums Sector), the
Textile Museum, the Coptic Museum, a university hospital, a medical centre and several factories.

These are a genuine trust asset and unlike the private entries they could be named with permission.
**They are not used**, for two reasons: no permission has been given, and the ones visible in the
record are electric and hydraulic lifts — **not panorama** — so featuring them would conflict with the
site's panorama-only scope. Raised for the company to decide.

### 2.4 English name conflict

The company's own letterhead reads **"Arab Egypt Co. for Lifts"**, and three videos have
**"ARAB EGYPT FOR ELEVATORS"** burned in. The website brand is **"Egypt Elevators"** by decision.

Handled honestly in structured data rather than hidden:

```
Organization.name          = "Egypt Elevators"
Organization.alternateName = ["Arab Egypt Co. for Lifts", "مصر العربية للمصاعد"]
```

The three conflicting videos are excluded from production media, as instructed.

---

## 3. Standing prohibitions

Absolute, regardless of what any other source suggests:

- **No prices.** No ranges, no "starting from", no calculators, no tier tables.
- **No response-time promise.** No SLA, no "within 24 hours", no countdown.
- **No WhatsApp** anywhere — no button, no `wa.me` link, no mention.
- **No fabricated** testimonials, quotes, names, roles, client logos, awards, certifications, ratings,
  or engineering specifications.
- **No invented** load ratings, speeds, materials, suppliers, safety standards, warranty terms or
  compliance claims. The record proves _that_ work happened, never _how_ it was engineered.
- **No claim that every documented record is panorama**, and **no conversion of record counts into
  unit, elevator, or client counts** (see §1.2).
- **No identification of individuals** in photographs.

---

## 4. Where copy lives

| File                                 | Holds                                                       |
| ------------------------------------ | ----------------------------------------------------------- |
| `src/content/company.ts`             | Brand, verified stats, the unconfirmed-value registry       |
| `src/content/projects.ts`            | Installation records built from `docs/asset-inventory.json` |
| `src/content/home.ts`                | Homepage section copy, both locales                         |
| `src/content/faq.ts`                 | FAQ — only questions answerable from verified facts         |
| `src/content/legal.ts`               | Privacy and terms                                           |
| `src/i18n/dictionaries/{en,ar}.json` | UI strings (labels, buttons, errors)                        |

Arabic is **written as Arabic**, not translated from English. Where Egyptian usage is genuinely
bilingual (اسانسير بانوراما) that usage stands.
