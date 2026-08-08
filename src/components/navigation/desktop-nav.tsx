'use client';

import { useTranslations } from 'next-intl';

import { primaryNav } from '@/content/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * Desktop navigation.
 *
 * Each label is two stacked copies of the same word inside a fixed-height mask. On hover the
 * pair slides up by exactly one line: the resting copy leaves through the top, its twin
 * arrives from the bottom in orange. Because both copies are always in the DOM at the same
 * size, the item's width never changes and nothing around it reflows.
 *
 * The duplicate is `aria-hidden` — a screen reader must hear the destination once, not twice.
 *
 * Active state is an orange rule under the label plus `aria-current`. Colour alone is never
 * the only signal: the rule is a shape, and `aria-current` carries it non-visually.
 */
export function DesktopNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <nav aria-label={t('menuLabel')} className="hidden lg:block">
      <ul className="flex items-center gap-8">
        {primaryNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const label = t(item.key);

          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group relative inline-flex min-h-11 flex-col justify-center text-sm font-medium',
                  'rounded-(--radius-control) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus',
                  isActive ? 'text-ink' : 'text-ink-2'
                )}
              >
                <span className="link-masked leading-tight">
                  <span data-masked-out>{label}</span>
                  <span data-masked-in aria-hidden>
                    {label}
                  </span>
                </span>

                {/* Active rule, and the hover rule that grows from the leading edge. */}
                <span
                  aria-hidden
                  className={cn(
                    'duration-base absolute inset-x-0 -bottom-0.5 h-0.5 origin-[left] bg-accent transition-transform ease-travel rtl:origin-[right]',
                    isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
