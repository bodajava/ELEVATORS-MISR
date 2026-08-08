'use client';

import * as React from 'react';
import { type HTMLMotionProps, MotionConfig, motion } from 'motion/react';

import { cn } from '@/lib/utils';

/**
 * Hover slider — a list of titles that drives a stacked image set.
 *
 * Hovering or focusing a title staggers its characters up out of the line while the replacement
 * rises into place, and the matching frame is revealed by animating a `clip-path` rather than
 * cross-fading. Nothing here animates layout, so it costs no reflow.
 *
 * ── Adapted for this codebase ───────────────────────────────────────────────
 *  · **Keyboard.** The upstream component reacts to `mouseenter` only, which makes it inert to
 *    a keyboard and to touch. Each title is a real focusable element that also responds to
 *    `focus`, so the same state is reachable three ways.
 *  · **Reduced motion.** `MotionConfig` is given a zero-duration transition under the
 *    preference, so the swap is instant rather than removed — the component still works, it
 *    just stops moving.
 *  · **Direction.** Uses logical properties, so the Arabic RTL page mirrors it for free.
 *
 * Images are supplied by the caller. In this project that means real project media from the
 * manifest — never stock photography, which the content rules forbid.
 */

interface TextStaggerHoverProps {
  text: string;
  index: number;
}

interface HoverSliderImageProps {
  index: number;
  imageUrl: string;
}

interface HoverSliderContextValue {
  activeSlide: number;
  changeSlide: (index: number) => void;
}

function splitText(text: string) {
  const words = text.split(' ').map((word) => word.concat(' '));
  const characters = words.map((word) => word.split('')).flat(1);
  return { words, characters };
}

const HoverSliderContext = React.createContext<HoverSliderContextValue | undefined>(undefined);

function useHoverSliderContext() {
  const context = React.useContext(HoverSliderContext);
  if (context === undefined) {
    throw new Error('useHoverSliderContext must be used within a HoverSlider');
  }
  return context;
}

export const HoverSlider = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => {
    const [activeSlide, setActiveSlide] = React.useState(0);
    const changeSlide = React.useCallback((index: number) => setActiveSlide(index), []);
    const value = React.useMemo(() => ({ activeSlide, changeSlide }), [activeSlide, changeSlide]);

    return (
      <HoverSliderContext.Provider value={value}>
        <div ref={ref} className={className} {...props}>
          {children}
        </div>
      </HoverSliderContext.Provider>
    );
  }
);
HoverSlider.displayName = 'HoverSlider';

export const TextStaggerHover = React.forwardRef<
  HTMLButtonElement,
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onSelect'> & TextStaggerHoverProps
>(({ text, index, className, ...props }, ref) => {
  const { activeSlide, changeSlide } = useHoverSliderContext();
  const { characters } = splitText(text);
  const isActive = activeSlide === index;
  const select = () => changeSlide(index);

  return (
    // A real button: hover is a convenience, not the only way in.
    <button
      type="button"
      ref={ref}
      aria-pressed={isActive}
      onMouseEnter={select}
      onFocus={select}
      onClick={select}
      className={cn(
        'relative inline-block origin-bottom cursor-pointer overflow-hidden text-start',
        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus',
        className
      )}
      {...props}
    >
      {characters.map((char, charIndex) => (
        <span
          key={`${char}-${charIndex}`}
          aria-hidden
          className="relative inline-block overflow-hidden"
        >
          <MotionConfig
            transition={{
              delay: charIndex * 0.025,
              duration: 0.3,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            <motion.span
              className="inline-block opacity-30"
              initial={{ y: '0%' }}
              animate={isActive ? { y: '-110%' } : { y: '0%' }}
            >
              {char}
              {char === ' ' && charIndex < characters.length - 1 && <>&nbsp;</>}
            </motion.span>

            <motion.span
              className="absolute start-0 top-0 inline-block opacity-100"
              initial={{ y: '110%' }}
              animate={isActive ? { y: '0%' } : { y: '110%' }}
            >
              {char}
            </motion.span>
          </MotionConfig>
        </span>
      ))}

      {/* The characters are split and aria-hidden, so the accessible name comes from here. */}
      <span className="sr-only">{text}</span>
    </button>
  );
});
TextStaggerHover.displayName = 'TextStaggerHover';

export const clipPathVariants = {
  visible: { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' },
  hidden: { clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0px)' },
};

export const HoverSliderImageWrap = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'grid overflow-hidden [&>*]:col-start-1 [&>*]:col-end-1 [&>*]:row-start-1 [&>*]:row-end-1 [&>*]:size-full',
      className
    )}
    {...props}
  />
));
HoverSliderImageWrap.displayName = 'HoverSliderImageWrap';

export const HoverSliderImage = React.forwardRef<
  HTMLImageElement,
  HTMLMotionProps<'img'> & HoverSliderImageProps
>(({ index, imageUrl, className, ...props }, ref) => {
  const { activeSlide } = useHoverSliderContext();
  return (
    <motion.img
      ref={ref}
      src={imageUrl}
      className={cn('inline-block align-middle', className)}
      transition={{ ease: [0.33, 1, 0.68, 1], duration: 0.8 }}
      variants={clipPathVariants}
      animate={activeSlide === index ? 'visible' : 'hidden'}
      {...props}
    />
  );
});
HoverSliderImage.displayName = 'HoverSliderImage';
