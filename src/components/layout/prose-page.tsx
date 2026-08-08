import type { ReactNode } from 'react';

import { Breadcrumbs, type Crumb } from '@/components/ui/breadcrumbs';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';

/**
 * Shared shell for text-led pages.
 *
 * Measure is capped so lines stay in the comfortable 60–75 character range in both scripts.
 * Sections are separated by hairline rules rather than whitespace alone, which keeps a long
 * legal page navigable by eye.
 */
export function ProsePage({
  crumbs,
  title,
  lede,
  children,
}: {
  crumbs: Crumb[];
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  return (
    <Container width="text" className="pt-32 pb-28 lg:pt-40">
      <Breadcrumbs items={crumbs} />
      <SectionHeading as="h1" title={title} lede={lede} />
      <div className="mt-16 flex flex-col">{children}</div>
    </Container>
  );
}

export function ProseSection({ heading, paragraphs }: { heading: string; paragraphs: string[] }) {
  return (
    <section className="py-10 rule-t first:pt-0">
      <h2 className="text-xl text-ink sm:text-2xl">{heading}</h2>
      <div className="mt-4 flex flex-col gap-4">
        {paragraphs.map((paragraph) => (
          <p key={paragraph} className="text-base text-pretty text-ink-2">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
