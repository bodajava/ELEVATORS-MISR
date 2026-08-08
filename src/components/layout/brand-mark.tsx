import Image from 'next/image';

import { brand } from '@/content/company';
import { cn } from '@/lib/utils';

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
  className,
  tone = 'light',
  size = 'compact',
}: {
  className?: string;
  tone?: 'light' | 'dark';
  /** `compact` is the navbar treatment; `large` is the footer treatment. */
  size?: 'compact' | 'large';
}) {
  const compact = size === 'compact';

  return (
    <span className={cn('inline-flex items-center', compact ? 'gap-3' : 'gap-5', className)}>
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

      <span className="flex flex-col leading-none">
        <span
          lang="en"
          dir="ltr"
          className={cn(
            'font-display font-bold uppercase',
            compact
              ? 'text-[0.95rem] tracking-[-0.02em]'
              : 'text-2xl tracking-[-0.03em] sm:text-3xl',
            tone === 'dark' ? 'text-ink-on-dark' : 'text-ink'
          )}
        >
          Egypt Elevators
        </span>

        {/* The badge already carries the Arabic name; below it, the footer states the
            specialism instead of repeating the wordmark at an unreadable size. */}
        {!compact ? (
          <span
            className={cn(
              'mt-3 font-mono text-2xs tracking-[0.14em] uppercase',
              tone === 'dark' ? 'text-ink-2-on-dark' : 'text-ink-3'
            )}
          >
            Panorama elevators
          </span>
        ) : null}
      </span>
    </span>
  );
}
