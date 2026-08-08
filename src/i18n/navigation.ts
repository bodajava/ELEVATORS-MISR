import { createNavigation } from 'next-intl/navigation';

import { routing } from './routing';

/**
 * Locale-aware navigation primitives.
 *
 * Always import `Link`, `redirect`, `usePathname` and `useRouter` from here rather than from
 * `next/link` or `next/navigation` — these keep the active locale on every transition, and
 * `usePathname` returns the path *without* the locale prefix, which is what the language
 * switcher needs to land the visitor on the same page in the other language.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
