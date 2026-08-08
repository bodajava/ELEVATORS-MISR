/**
 * Stand-in for the `server-only` package under vitest.
 *
 * The real package throws on import so that a server module pulled into a client bundle
 * fails loudly at build time. That guard stays in place for the application; this file only
 * neutralises it for the node test runner, which is neither a client nor a server bundle.
 * Aliased in vitest.config.mts.
 */
export {};
