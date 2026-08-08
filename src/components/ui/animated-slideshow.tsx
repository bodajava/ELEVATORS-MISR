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
  /**
   * How the line looks before it is selected.
   *
   * The upstream component hard-codes `opacity-30` here. On this palette that puts the
   * resting titles at roughly 1.5:1 against the page — and these are the names of the
   * installations, body content rather than decoration, so they have to stay readable when
   * nothing is hovered. Callers pass a real colour token; the default is the annotation ink.
   */
  restingClassName?: string;
}

interface HoverSliderImageProps {
  index: number;
  imageUrl: string;
}

interface HoverSliderContextValue {
  activeSlide: number;
  changeSlide: (index: number) => void;
}

/**
 * Arabic is cursive: every letter changes shape according to its neighbours. Splitting
 * `'نحاس وزجاج'` into `['ن','ح','ا','س', …]` and wrapping each in its own element severs
 * those joins, and the browser falls back to the isolated form of each letter — the word
 * stops being the word. The upstream component splits unconditionally, which would have
 * shipped mangled type on every Arabic page.
 *
 * So the unit of animation is script-dependent: Latin staggers per character, Arabic staggers
 * per word, which keeps each word's shaping intact while still reading as a stagger.
 */
const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

/**
 * Split into words first, then into animation units inside each word.
 *
 * The nesting is not cosmetic. Flattening straight to characters — which the upstream
 * component does — makes every character its own inline-block, and the browser will then
 * break a line between any two of them: "a classic / al hall", "timbe / r stair". Keeping the
 * word as a `whitespace-nowrap` wrapper restores normal word-boundary wrapping while the
 * characters inside it still animate one by one.
 */
function splitText(text: string): string[][] {
  const words = text.split(' ').map((word) => word.concat(' '));
  if (ARABIC.test(text)) return words.map((word) => [word]);
  return words.map((word) => word.split(''));
}

const HoverSliderContext = React.createContext<HoverSliderContextValue | undefined>(undefined);

function useHoverSliderContext() {
  const context = React.useContext(HoverSliderContext);
  if (context === undefined) {
    throw new Error('useHoverSliderContext must be used within a HoverSlider');
  }
  return context;
}

/**
 * Read the active slide from outside the built-in parts.
 *
 * Selecting a title is not navigating to it, so a caller that wants the revealed frame to be
 * a link needs the index. Exported rather than duplicated as a second piece of state, which
 * would let the frame and the link drift apart.
 */
export function useHoverSlide() {
  return useHoverSliderContext();
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
>(({ text, index, restingClassName = 'text-ink-3', className, ...props }, ref) => {
  const { activeSlide, changeSlide } = useHoverSliderContext();
  const words = splitText(text);
  const isActive = activeSlide === index;
  const select = () => changeSlide(index);
  // Stagger runs across the whole line, so the delay keeps counting across word boundaries
  // rather than restarting inside each word. Precomputed rather than incremented during the
  // render pass, which is a closure write React cannot guarantee the ordering of.
  const wordOffsets = words.reduce<number[]>(
    (acc, word, i) => [...acc, (acc[i - 1] ?? 0) + (words[i - 1]?.length ?? 0)],
    []
  );

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
      {words.map((chars, wordIndex) => (
        // The word is the wrapping unit; the characters inside it are the animation unit.
        <span key={`w-${wordIndex}`} aria-hidden className="inline-block whitespace-nowrap">
          {chars.map((char, charIndex) => {
            const unit = (wordOffsets[wordIndex] ?? 0) + charIndex;
            return (
              <span
                key={`${char}-${charIndex}`}
                className="relative inline-block overflow-hidden align-bottom"
              >
                <MotionConfig
                  transition={{
                    delay: unit * 0.025,
                    duration: 0.3,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                >
                  {/* `whitespace-pre` rather than an `&nbsp;` special case: the tokens already
                      carry their own trailing space, and an inline-block would otherwise
                      collapse it — which for Arabic word tokens runs the line together. */}
                  <motion.span
                    className={cn('inline-block whitespace-pre', restingClassName)}
                    initial={{ y: '0%' }}
                    animate={isActive ? { y: '-110%' } : { y: '0%' }}
                  >
                    {char}
                  </motion.span>

                  <motion.span
                    className="absolute start-0 top-0 inline-block whitespace-pre"
                    initial={{ y: '110%' }}
                    animate={isActive ? { y: '0%' } : { y: '110%' }}
                  >
                    {char}
                  </motion.span>
                </MotionConfig>
              </span>
            );
          })}
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
