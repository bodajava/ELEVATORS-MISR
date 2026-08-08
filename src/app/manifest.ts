import type { MetadataRoute } from 'next';

import { brand } from '@/content/company';
import { defaultLocale } from '@/i18n/config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.name,
    description:
      'Panorama elevators designed as part of the building. Every project begins with a physical site inspection.',
    start_url: `/${defaultLocale}`,
    display: 'standalone',
    background_color: '#f3f0e8',
    theme_color: '#080d10',
    icons: [
      {
        src: brand.logo.square,
        sizes: '512x512',
        type: 'image/png',
        // `any` only. The logo is a photographic badge with its own edges, so a maskable
        // declaration would let the platform crop into the arch.
        purpose: 'any',
      },
    ],
  };
}
