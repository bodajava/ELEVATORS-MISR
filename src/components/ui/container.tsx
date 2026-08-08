import type { ComponentProps, ElementType } from 'react';

import { cn } from '@/lib/utils';

const widths = {
  text: 'max-w-text',
  wide: 'max-w-wide',
  full: 'max-w-page',
} as const;

type ContainerProps<T extends ElementType> = {
  as?: T;
  width?: keyof typeof widths;
} & Omit<ComponentProps<T>, 'as'>;

/**
 * Horizontal container.
 *
 * The gutter is a single token (`--gutter`) rather than per-breakpoint padding classes, so
 * hairline rules and full-bleed apertures can align to exactly the same axis as the text.
 * Logical padding, so the gutter behaves identically in RTL. Widths are `max-w` only.
 */
export function Container<T extends ElementType = 'div'>({
  as,
  width = 'wide',
  className,
  ...props
}: ContainerProps<T>) {
  const Component = (as ?? 'div') as ElementType;
  return (
    <Component
      className={cn('mx-auto w-full px-(--gutter)', widths[width], className)}
      {...props}
    />
  );
}
