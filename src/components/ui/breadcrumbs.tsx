import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

export type Crumb = { label: string; href?: string };

/**
 * Breadcrumbs.
 *
 * Set in the annotation layer with a slash separator rather than a chevron icon — it needs no
 * mirroring in RTL, and it keeps the drawing-label register consistent with section eyebrows.
 * The separator is decorative and hidden; the list and `aria-current` carry the structure.
 */
export async function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = await getTranslations('nav');

  return (
    <nav aria-label={t('breadcrumb')} className="mb-12">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 annotation">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {index > 0 ? (
                <span aria-hidden className="text-ink-3/60">
                  /
                </span>
              ) : null}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="rounded-xs transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} className="text-ink">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
