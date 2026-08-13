import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Content Security Policy.
 *
 * Written against what this site actually loads, which is very little: its own JavaScript and
 * CSS, its own images and video out of `/media`, and two Google Fonts origins. Nothing is
 * fetched from a CDN, there is no third-party script, no analytics vendor, no chat widget, no
 * embedded map and no iframe of any kind. The AI provider is called from a **server** route
 * (`/api/concierge`), so the browser only ever talks to this origin about it — no provider
 * host appears here, and none should be added: a `connect-src` entry for an LLM vendor would
 * mean the key had moved into the browser.
 *
 * ── `'unsafe-inline'` for scripts, and why it is the honest choice here ─────
 * The stronger policy is a per-request nonce with `'strict-dynamic'`. This app cannot use it,
 * and the reason is structural rather than lazy: a nonce has to be generated per request and
 * written into the HTML, which forces **every** route to render dynamically. This site
 * prerenders 40 routes at build time and serves them as static files — that is where its
 * sub-300ms LCP comes from. Trading all of it for a nonce is the wrong trade for a brochure
 * site with no user accounts, no user-generated content rendered as HTML, and no third-party
 * script.
 *
 * Hashing is not available either: Next inlines its own flight-data bootstraps
 * (`self.__next_f.push(...)`) whose contents differ per page, so there is no fixed set to
 * enumerate.
 *
 * `'strict-dynamic'` was tried and removed. When it is present, browsers **ignore** `'self'`,
 * `https:` and `'unsafe-inline'` in the same directive — and with no nonce on the initial
 * `<script src>` tags, every chunk on every route was blocked. The check that caught it is
 * kept as `scripts/csp-check.mjs`.
 *
 * What this policy still buys, which is not nothing: no script may be loaded from any other
 * origin, `eval` is refused everywhere, the page cannot be framed, `object-src` and
 * `base-uri` are closed, forms may only post to this origin, and `connect-src 'self'` means
 * an injected script has nowhere to send what it steals.
 *
 * `'unsafe-inline'` for styles is the same story with lower stakes: Next injects critical CSS
 * inline and this project sets inline custom properties on elements (the ambient field's drift
 * timings, the carousel's card height). Style injection is a defacement risk, not execution.
 */
const isDev = process.env.NODE_ENV !== 'production';

const contentSecurityPolicy = [
  "default-src 'self'",
  // `'unsafe-eval'` is granted in development only — Turbopack's HMR client needs it, and
  // nothing in the production bundle compiles code at runtime.
  isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  // `'self'`, and nothing else. `next/font/google` downloads the families at build time and
  // serves them from `/_next/static/media` — no request ever reaches fonts.gstatic.com, and
  // listing it would grant an origin the site does not use. Verified: without `'self'` here
  // every route logged a font violation and fell back to a system face.
  "font-src 'self' data:",
  // `data:` covers the blur placeholders next/image inlines; `blob:` covers nothing today but
  // is what a client-side canvas export would need, so it is deliberately absent.
  "img-src 'self' data:",
  "media-src 'self'",
  // Same-origin only. The concierge posts to this app's own route handler.
  isDev ? "connect-src 'self' ws: wss:" : "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "worker-src 'self' blob:",
  'upgrade-insecure-requests',
].join('; ');

const nextConfig: NextConfig = {
  // A stray pnpm-workspace.yaml exists in the user's home directory, so Turbopack's
  // automatic root inference walks up too far and warns. Pin the root explicitly.
  turbopack: {
    root: __dirname,
  },

  images: {
    // Source photography is capped at 1280px on the long edge (see docs/asset-manifest.md),
    // so there is no point generating or requesting anything larger.
    deviceSizes: [400, 640, 828, 1080, 1280],
    imageSizes: [64, 96, 128, 256, 384],
    formats: ['image/avif', 'image/webp'],
  },

  // Fail the build on type errors rather than shipping them.
  typescript: { ignoreBuildErrors: false },

  poweredByHeader: false,
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          // The site is same-origin throughout and embeds nothing cross-origin, so the strict
          // isolation policies cost nothing here and close off cross-origin leaks by default.
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
        ],
      },
      {
        // Derivatives are content-addressed by name and never mutated in place.
        source: '/media/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
