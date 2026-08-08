import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { primaryNav } from '@/content/navigation';
import { Link } from '@/i18n/navigation';

/**
 * Not found.
 *
 * An empty screen is an invitation to act: rather than apologising, this lists every
 * destination on the site so the visitor can get where they were going.
 */
export default async function NotFound() {
  const t = await getTranslations('notFound');
  const tNav = await getTranslations('nav');

  return (
    <Container width="text" className="pt-40 pb-32">
      <SectionHeading as="h1" title={t('title')} lede={t('description')} />
      <ul className="mt-12 flex flex-col divide-y divide-rule border-y border-rule">
        {primaryNav.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              className="hover:text-accent-strong flex min-h-14 items-center py-4 font-display text-lg text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {tNav(item.key)}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-10">
        <Button asChild variant="secondary">
          <Link href="/">{t('backHome')}</Link>
        </Button>
      </div>
    </Container>
  );
}
