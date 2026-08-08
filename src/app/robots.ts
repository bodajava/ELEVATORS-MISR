import type { MetadataRoute } from 'next';

import { siteUrl } from '@/content/company';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Nothing under /api is content, and the media derivatives are already linked from
        // the pages that use them.
        disallow: ['/api/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
