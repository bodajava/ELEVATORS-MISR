'use client';

import type { ReactNode } from 'react';

/** The event the launcher listens for. One string, exported so both sides cannot drift. */
export const OPEN_CONCIERGE_EVENT = 'concierge:open';

/**
 * A button anywhere on the page that opens the concierge.
 *
 * ── Why an event and not shared state ───────────────────────────────────────
 * The launcher is mounted once in the layout and owns whether the panel is open. The footer is
 * a server component several trees away. Lifting that state into a context would make every
 * page a client boundary for the sake of one button; a `CustomEvent` on `window` costs one
 * listener and keeps the footer static.
 *
 * The footer's card is about the assistant, so its button now opens the assistant. It used to
 * link to /contact, which is a different thing wearing the same label.
 */
export function OpenConcierge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_CONCIERGE_EVENT))}
      className={className}
    >
      {children}
    </button>
  );
}
