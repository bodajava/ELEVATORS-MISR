'use client';

/**
 * Pinned-sequence lock.
 *
 * A pinned ScrollTrigger keeps the visitor inside one section while the scroll position keeps
 * increasing. Anything that reacts to "scrolling down" — most obviously the retracting
 * navigation — therefore fires during the hero and hides itself for the whole sequence, which
 * reads as the nav having disappeared.
 *
 * Sequences call this to declare themselves on `<html data-sequence>` while their trigger is
 * active. Consumers check for the attribute's presence rather than importing anything from a
 * section, so nothing needs to know which sequences exist.
 *
 * Nested/overlapping sequences are counted rather than toggled, so one finishing does not
 * release the lock another still holds.
 */
const held = new Set<string>();

function sync() {
  const el = document.documentElement;
  if (held.size > 0) el.dataset.sequence = [...held].join(' ');
  else delete el.dataset.sequence;
}

export function acquireSequence(id: string) {
  held.add(id);
  sync();
}

export function releaseSequence(id: string) {
  held.delete(id);
  sync();
}

/** ScrollTrigger `onToggle` handler: locks while the trigger is active. */
export function sequenceToggle(id: string) {
  return (self: { isActive: boolean }) => {
    if (self.isActive) acquireSequence(id);
    else releaseSequence(id);
  };
}
