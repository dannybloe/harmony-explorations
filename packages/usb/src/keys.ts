/**
 * The key tables, moved to `packages/base/src/keys.ts` by `todo.md` 7.3.4, plan 013 decision 4.
 *
 * Kept for compatibility until 7.3.6, for anyone importing `@harmony/usb/keys` or reaching the tables
 * through this package's barrel. A re-export, not a copy. New code imports `@harmony/base/keys`.
 */
export * from '@harmony/base/keys';
