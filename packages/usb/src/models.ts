/**
 * The model table, moved to `packages/base/src/models.ts` by `todo.md` 7.3.4, plan 013 decision 4.
 *
 * Kept for compatibility until 7.3.6: FreeHarmony imports `@harmony/usb/models` in its window, and its
 * `test/boundary.test.ts` checks that this subpath resolves to this file. This is a re-export, not a
 * copy, so the table still exists once. New code imports `@harmony/base/models`.
 */
export * from '@harmony/base/models';
