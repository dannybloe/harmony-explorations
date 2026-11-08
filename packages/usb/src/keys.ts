/**
 * The key tables, moved to `packages/base/src/keys.ts` by `todo.md` 7.3.4, plan 013 decision 4.
 *
 * Kept as a subpath for compatibility, for anyone importing `@harmony/usb/keys`; off this package's main entry
 * since the library half of `todo.md` 7.3.6, and the subpath goes in its FreeHarmony half. A re-export, not a
 * copy. New code imports `@harmony/base/keys`.
 */
export * from '@harmony/base/keys';
