/**
 * The theme's storage key and its pre-paint bootstrap.
 *
 * This lives in its own module, importable from both sides, for a reason that cost a shipped
 * feature: it used to be exported from `theme-toggle.tsx`, which is a `'use client'` module.
 * Every export of a client module becomes a *client reference* when a Server Component
 * imports it — not the value. The layout was interpolating that reference into the document,
 * so what actually reached the browser was the stub Next generates in its place:
 *
 *     <script>function() { throw new Error("Attempted to call themeScript() from the
 *     server but themeScript is on the client. ...") }</script>
 *
 * which is not even valid as a statement, so it threw at parse and the bootstrap never ran.
 * A visitor who chose dark got the OS preference back on every single load — the toggle only
 * held for the page view it was pressed on. Nothing in the type system catches this: the
 * reference is typed as the string it stands in for.
 */

/** Where an explicit choice is remembered. Read by the bootstrap, written by the toggle. */
export const THEME_STORAGE_KEY = 'ee-theme';

/**
 * Runs before first paint, inlined as the first thing in <body>.
 *
 * Without it the page renders light and then flips — a flash of the wrong theme on every load
 * for anyone who chose dark. It is deliberately tiny and deliberately `try`-wrapped: blocked
 * `localStorage` must not stop the document rendering.
 *
 * No attribute at all means "follow the OS", which is why only an explicit 'dark' or 'light'
 * is written back. See the layout for why it reaches the DOM as innerHTML rather than as a
 * <script> element.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t}}catch(e){}})();`;
