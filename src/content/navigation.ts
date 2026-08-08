/**
 * Site navigation.
 *
 * Labels live in the dictionaries (`nav.*`); this module owns structure only, so the two
 * locales can never drift out of sync structurally.
 */

export type NavItem = {
  /** Dictionary key under `nav`. */
  key: string;
  href: string;
};

export const primaryNav: readonly NavItem[] = [
  { key: 'panorama', href: '/panorama-elevators' },
  { key: 'projects', href: '/projects' },
  { key: 'process', href: '/process' },
  { key: 'about', href: '/about' },
  { key: 'contact', href: '/contact' },
] as const;

export const legalNav: readonly NavItem[] = [
  { key: 'privacy', href: '/privacy' },
  { key: 'terms', href: '/terms' },
] as const;

/** The single conversion path. Every page leads here. */
export const primaryCta = {
  key: 'requestInspection',
  href: '/contact#request-inspection',
} as const;
