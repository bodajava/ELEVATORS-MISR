'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { primaryCta } from '@/content/navigation';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * Mobile-only sticky inspection CTA.
 *
 * Appears only after the hero has passed — the hero carries the same CTA, so showing it twice
 * at the top would just cover content — and hides again near the footer, where the closing CTA
 * takes over. It is `inert` while off-screen so it is never a stray tab stop.
 *
 * Plain CSS transform, no animation library: it is a single boolean transition and pulling in
 * either library for it would be waste.
 */
export function MobileCtaBar() {
  const t = useTranslations('cta');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const nearBottom =
        y + window.innerHeight > document.documentElement.scrollHeight - window.innerHeight * 1.2;
      setVisible(y > window.innerHeight * 0.9 && !nearBottom);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      className={cn(
        'duration-base fixed inset-x-0 bottom-0 z-20 border-t border-rule bg-paper px-(--gutter) pt-3 transition-transform ease-travel lg:hidden',
        visible ? 'translate-y-0' : 'translate-y-full'
      )}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      aria-hidden={!visible}
      inert={!visible ? true : undefined}
    >
      <Button asChild variant="primary" size="lg" className="w-full">
        <Link href={primaryCta.href}>{t('requestInspection')}</Link>
      </Button>
    </div>
  );
}
