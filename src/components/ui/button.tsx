import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * Button.
 *
 * Signal orange is the conversion colour and it is spent here first. `primary` — the
 * site-inspection path, the one action this whole site exists to produce — is the only solid
 * orange element in the layout, which is what makes it findable without a single arrow
 * pointing at it. Everything else steps down: `secondary` is a hairline, `ghost` is type.
 * That ordering is a product requirement, so it is encoded here rather than left to call
 * sites.
 *
 * **Orange fills carry carbon text, never white.** #FF6B00 on white is 2.9:1 and fails at
 * every size; on #080D10 it is 6.8:1 and passes for body text. The token `--color-on-accent`
 * exists so this cannot be got wrong by accident.
 *
 * Compact radius by design: controls are instruments and take the tight curve, while
 * sections and media take the large one. Every variant clears the 44x44 touch target.
 */
const buttonVariants = cva(
  [
    'group/btn relative inline-flex items-center justify-center gap-3 whitespace-nowrap',
    'font-body font-semibold tracking-[-0.01em]',
    'rounded-(--radius-control) border cursor-pointer select-none',
    'min-h-11 transition-[background-color,border-color,color,transform] duration-fast ease-standard',
    'focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus',
    'disabled:pointer-events-none disabled:opacity-40',
  ].join(' '),
  {
    variants: {
      variant: {
        /** The inspection path. The only solid orange in the layout. */
        primary:
          'border-accent bg-accent text-on-accent hover:border-accent-hi hover:bg-accent-hi active:translate-y-px',
        secondary:
          'border-rule-strong bg-transparent text-ink hover:border-ink hover:bg-ink hover:text-paper',
        ghost: 'border-transparent bg-transparent text-ink-2 hover:text-ink',
        /* For use on carbon, where the ground is dark. */
        onDark:
          'border-rule-on-dark bg-transparent text-ink-on-dark hover:border-accent hover:bg-accent hover:text-on-accent',
        /** The inspection path on carbon — still orange, because it means the same thing. */
        primaryOnDark:
          'border-accent bg-accent text-on-accent hover:border-accent-hi hover:bg-accent-hi active:translate-y-px',
      },
      size: {
        sm: 'min-w-11 px-4 py-2 text-xs',
        md: 'min-w-11 px-6 py-3 text-sm',
        lg: 'min-w-11 px-8 py-4 text-base',
        icon: 'size-11 min-w-11 p-0',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  }
);

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  return (
    <Component
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

/**
 * The CTA arrow.
 *
 * Steps forward on hover and mirrors itself in RTL — an arrow that points left in Arabic is
 * pointing backwards. Purely decorative, so it is hidden from assistive technology; the
 * button's own label carries the meaning.
 */
export function CtaArrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 10"
      fill="none"
      aria-hidden
      className={cn(
        'duration-base size-3.5 shrink-0 icon-directional transition-transform ease-travel',
        'group-hover/btn:translate-x-1 rtl:group-hover/btn:-translate-x-1',
        className
      )}
    >
      <path
        d="M0 5h14M10 1l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="square"
      />
    </svg>
  );
}

export { buttonVariants };
