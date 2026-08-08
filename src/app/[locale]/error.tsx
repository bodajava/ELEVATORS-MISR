'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';

/**
 * Route error boundary.
 *
 * States what happened and what to do about it, in the interface's voice. The underlying
 * error is logged for us and never shown to the visitor — a stack trace or a database
 * message on screen is both useless to them and an information leak.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('error');

  useEffect(() => {
    console.error('Route error', { digest: error.digest });
  }, [error]);

  return (
    <Container width="text" className="pt-40 pb-32">
      <SectionHeading as="h1" title={t('title')} lede={t('description')} />
      <div className="mt-10">
        <Button variant="secondary" onClick={reset}>
          {t('retry')}
        </Button>
      </div>
    </Container>
  );
}
