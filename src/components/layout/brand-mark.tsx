import Image from 'next/image';

import { brand } from '@/content/company';
import type { Locale } from '@/i18n/config';
import { cn } from '@/lib/utils';

/**
 * The name beside the badge, and the specialism under it, in the locale's own language.
 *
 * Both were hard-coded English, so an Arabic visitor met "Egypt Elevators / Panorama
 * elevators" in the header and the footer of every page — the company's own name in a
 * language it is not registered under. The Arabic here is the registered name, not a
 * transliteration of the English one.
 */
const lockup = {
  en: { name: 'Egypt Elevators', specialism: 'Panorama elevators' },
  ar: { name: brand.nameAr, specialism: 'مصاعد بانوراما' },
} satisfies Record<Locale, { name: string; specialism: string }>;

/**
 * The brand lockup — the real supplied logo, not a substitute.
 *
 * The logo is a photographic render of the physical sign (see `brand.logo`), so it is framed
 * as a badge rather than tinted or knocked out: a compact rounded tile with a hairline, which
 * sits correctly on both the cream page and the carbon sections. Its own gold and navy carry
 * the brand colour; nothing here recolours it.
 *
 * The Arabic wordmark is *inside* the logo, so it is not repeated underneath as caption text.
 * The English name sits beside the badge because the logo has no English lockup — that is a
 * real gap in the brand assets, recorded in `brand.logo.hasEnglishLockup`.
 *
 * `tone` selects the treatment, not the artwork:
 *   · `light` — on cream. Hairline in ink.
 *   · `dark`  — on carbon. Hairline in warm white, and the English name inverts.
 */
export function BrandMark({
  locale,
  className,
  tone = 'light',
  size = 'compact',
}: {
  locale: Locale;
  className?: string;
  tone?: 'light' | 'dark';
  /** `compact` is the navbar treatment; `large` is the footer treatment. */
  size?: 'compact' | 'large';
}) {
  const compact = size === 'compact';
  const arabic = locale === 'ar';
  const { name, specialism } = lockup[locale];

  return (
    <span
      className={cn('inline-flex items-center', compact ? 'gap-2 sm:gap-3' : 'gap-5', className)}
    >
      <Image
        src={brand.logo.badge}
        alt={`${brand.name} — ${brand.nameAr}`}
        width={brand.logo.badgeWidth}
        height={brand.logo.badgeHeight}
        // The badge is never rendered above ~240px, so the browser is told that rather
        // than being left to fetch a 720px variant for a 38px slot.
        sizes={compact ? '52px' : '240px'}
        priority={compact}
        className={cn(
          'w-auto shrink-0 object-cover',
          'rounded-(--radius-control) border',
          compact ? 'h-11' : 'h-30 rounded-(--radius-media) sm:h-36',
          tone === 'dark' ? 'border-rule-on-dark' : 'border-rule'
        )}
      />

      {/* Below `sm` the navbar lockup is the badge alone. The name needs ~110px, and the
          phone header also has to carry a language control, a theme control and a menu
          button — with the name present those either overflowed the gutter or squeezed each
          other under the 44px target minimum. The badge already carries the Arabic wordmark,
          so the header stays branded; the full lockup returns at `sm` and in the footer. */}
      <span className={cn('flex-col leading-none', compact ? 'hidden sm:flex' : 'flex')}>
        <span
          lang={locale}
          dir={arabic ? 'rtl' : 'ltr'}
          className={cn(
            'font-display',
            // Arabic keeps its own tracking and case: `uppercase` does nothing to it and the
            // tight Latin tracking breaks the joins of a connected script. The global
            // `:lang(ar)` rules undo both, but not setting them is clearer than relying on
            // that, and the leading has to be loosened here regardless.
            arabic
              ? cn(
                  'leading-[1.35] font-semibold',
                  compact ? 'text-[0.95rem]' : 'text-2xl sm:text-3xl'
                )
              : cn(
                  'font-bold uppercase',
                  compact
                    ? 'text-[0.95rem] tracking-[-0.02em]'
                    : 'text-2xl tracking-[-0.03em] sm:text-3xl'
                ),
            tone === 'dark' ? 'text-ink-on-dark' : 'text-ink'
          )}
        >
          {name}
        </span>

        {/* The badge already carries the Arabic name; below it, the footer states the
            specialism instead of repeating the wordmark at an unreadable size. */}
        {!compact ? (
          <span
            lang={locale}
            className={cn(
              'mt-3 text-2xs',
              // The mono annotation face has no Arabic coverage, so the Arabic caption is set
              // in Alexandria instead of falling back to whatever the system supplies.
              arabic ? 'font-arabic-stack' : 'font-mono tracking-[0.14em] uppercase',
              tone === 'dark' ? 'text-ink-2-on-dark' : 'text-ink-3'
            )}
          >
            {specialism}
          </span>
        ) : null}
      </span>
    </span>
  );
}
