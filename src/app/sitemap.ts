import type { MetadataRoute } from 'next';

import { siteUrl } from '@/content/company';
import { projects } from '@/content/projects';
import { defaultLocale, locales, localeTags } from '@/i18n/config';

/**
 * Sitemap.
 *
 * Every URL carries its full set of `alternates.languages`, so each locale's page declares
 * the other. A bilingual sitemap without reciprocal alternates is the usual reason one
 * language fails to get indexed.
 */
const ROUTES: {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
}[] = [
  { path: '', priority: 1, changeFrequency: 'monthly' },
  { path: '/panorama-elevators', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/projects', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/process', priority: 0.7, changeFrequency: 'yearly' },
  { path: '/about', priority: 0.6, changeFrequency: 'yearly' },
  { path: '/contact', priority: 0.9, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.2, changeFrequency: 'yearly' },
];

function alternatesFor(path: string) {
  return {
    languages: {
      ...Object.fromEntries(locales.map((l) => [localeTags[l], `${siteUrl}/${l}${path}`])),
      'x-default': `${siteUrl}/${defaultLocale}${path}`,
    },
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticEntries = ROUTES.flatMap((route) =>
    locales.map((locale) => ({
      url: `${siteUrl}/${locale}${route.path}`,
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: alternatesFor(route.path),
    }))
  );

  const projectEntries = projects.flatMap((project) =>
    locales.map((locale) => ({
      url: `${siteUrl}/${locale}/projects/${project.slug}`,
      lastModified,
      changeFrequency: 'yearly' as const,
      priority: 0.7,
      alternates: alternatesFor(`/projects/${project.slug}`),
    }))
  );

  return [...staticEntries, ...projectEntries];
}
