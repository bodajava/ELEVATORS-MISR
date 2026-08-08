'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { LanguageSwitcher } from '@/components/navigation/language-switcher';
import { Button } from '@/components/ui/button';
import { primaryCta, primaryNav } from '@/content/navigation';
import type { Locale } from '@/i18n/config';
import { Link, usePathname } from '@/i18n/navigation';

/**
 * Mobile navigation — a full-screen plaster panel, not a squeezed desktop menu.
 *
 * **This is Motion, not GSAP, and that is deliberate.** The panel is a React state transition
 * with mount/unmount and an exit animation, which is exactly what `AnimatePresence` is for and
 * exactly what GSAP is awkward at. Nothing in this component is touched by GSAP, so no element
 * is ever driven by both libraries.
 *
 * Radix Dialog handles the parts that are easy to get wrong: focus trapping, focus restoration
 * to the trigger, Escape, `aria-modal`, and inert-ing the background. Each link is wrapped in
 * `Dialog.Close` so navigating closes the panel without an effect watching the pathname.
 *
 * Layout is one-handed: destinations sit low, within thumb reach, and the conversion CTA is
 * the last and largest target.
 */
export function MobileNav({ locale }: { locale: Locale }) {
  const t = useTranslations('nav');
  const tCta = useTranslations('cta');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t('openMenu')}>
          {/* Two rules rather than a hamburger icon — same affordance, drawn in the system. */}
          <span aria-hidden className="flex w-5 flex-col gap-[5px]">
            <span className="h-px w-full bg-ink" />
            <span className="h-px w-full bg-ink" />
          </span>
        </Button>
      </Dialog.Trigger>

      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-40 bg-ink/25 lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.2 }}
              />
            </Dialog.Overlay>

            <Dialog.Content asChild aria-label={t('menuLabel')}>
              <motion.div
                className="fixed inset-0 z-50 flex flex-col bg-paper lg:hidden"
                initial={reduceMotion ? { opacity: 0 } : { clipPath: 'inset(0 0 100% 0)' }}
                animate={reduceMotion ? { opacity: 1 } : { clipPath: 'inset(0 0 0% 0)' }}
                exit={reduceMotion ? { opacity: 0 } : { clipPath: 'inset(0 0 100% 0)' }}
                transition={{ duration: reduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  paddingTop: 'env(safe-area-inset-top)',
                  paddingBottom: 'env(safe-area-inset-bottom)',
                }}
              >
                <Dialog.Title className="sr-only">{t('menuLabel')}</Dialog.Title>

                <div className="flex items-center justify-between px-(--gutter) py-4">
                  <LanguageSwitcher locale={locale} />
                  <Dialog.Close asChild>
                    <Button variant="ghost" size="icon" aria-label={t('closeMenu')}>
                      <span aria-hidden className="relative block size-4">
                        <span className="absolute top-1/2 left-0 h-px w-full rotate-45 bg-ink" />
                        <span className="absolute top-1/2 left-0 h-px w-full -rotate-45 bg-ink" />
                      </span>
                    </Button>
                  </Dialog.Close>
                </div>

                <nav
                  aria-label={t('menuLabel')}
                  className="flex flex-1 flex-col justify-end px-(--gutter) pb-6"
                >
                  <ul className="flex flex-col">
                    {primaryNav.map((item, index) => {
                      const isActive =
                        pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <motion.li
                          key={item.key}
                          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: reduceMotion ? 0 : 0.4,
                            delay: reduceMotion ? 0 : 0.12 + index * 0.05,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          className="rule-t"
                        >
                          <Dialog.Close asChild>
                            <Link
                              href={item.href}
                              aria-current={isActive ? 'page' : undefined}
                              className="flex min-h-16 items-center justify-between gap-4 py-4 font-display text-2xl text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                            >
                              {t(item.key)}
                              <span className="numeric annotation text-ink-3" dir="ltr">
                                {String(index + 1).padStart(2, '0')}
                              </span>
                            </Link>
                          </Dialog.Close>
                        </motion.li>
                      );
                    })}
                  </ul>

                  <div className="mt-10">
                    <Dialog.Close asChild>
                      <Button asChild variant="primary" size="lg" className="w-full">
                        <Link href={primaryCta.href}>{tCta('requestInspection')}</Link>
                      </Button>
                    </Dialog.Close>
                  </div>
                </nav>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
