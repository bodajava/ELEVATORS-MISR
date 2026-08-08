import createMiddleware from 'next-intl/middleware';

import { routing } from '@/i18n/routing';

/**
 * Locale negotiation.
 *
 * Next.js 16 renamed the `middleware` convention to `proxy` (Node runtime only — the edge
 * runtime is not supported here). The exported function must be named `proxy`.
 *
 * Locale preference is resolved on the server from the NEXT_LOCALE cookie and the
 * Accept-Language header. Doing it here rather than in a client effect is what keeps the
 * first paint correct and avoids a hydration mismatch on `<html dir>`.
 */
const proxy = createMiddleware(routing);

export default proxy;

export const config = {
  // Skip API routes, Next internals, and anything with a file extension.
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
