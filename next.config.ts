import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

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
