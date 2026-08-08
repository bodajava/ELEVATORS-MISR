import { Reveal } from '@/components/motion/reveal';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { process } from '@/content/home';
import type { Locale } from '@/i18n/config';

/**
 * Process.
 *
 * Numbered because this genuinely is an ordered sequence and the number carries information —
 * stage two is what makes stages three onward possible. Numbers as decoration would be a
 * different matter.
 *
 * Laid out as a schedule: a hairline per row, the index in the annotation layer at the start,
 * title and body in two columns. It reads like a drawing's revision table, which is the right
 * register for a page about method.
 */
export function ProcessSteps({
  locale,
  headingLevel = 'h2',
}: {
  locale: Locale;
  headingLevel?: 'h1' | 'h2';
}) {
  const steps = process.steps[locale];

  return (
    <section className="py-20 lg:py-24">
      <Container width="wide">
        <SectionHeading
          as={headingLevel}
          eyebrow={process.eyebrow[locale]}
          title={process.heading[locale]}
          lede={process.lede[locale]}
        />

        <ol className="mt-12">
          {steps.map((step, index) => (
            <Reveal as="li" key={step.title} delay={0.04 * index}>
              <div className="grid gap-3 py-7 rule-t sm:grid-cols-[auto_1fr] sm:gap-10 lg:grid-cols-[auto_0.9fr_1.1fr]">
                <span className="numeric pt-1 annotation text-ink" dir="ltr">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="text-xl text-ink lg:text-2xl">{step.title}</h3>
                <p className="max-w-[52ch] text-sm text-ink-2 sm:col-start-2 sm:text-base lg:col-start-3">
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </ol>

        <Reveal delay={0.08}>
          <p className="mt-4 max-w-[58ch] pt-6 text-sm text-ink-3 rule-t">{process.note[locale]}</p>
        </Reveal>
      </Container>
    </section>
  );
}
