/**
 * The model table, moved to `packages/base/src/models.ts`, plan 013 decision 4.
 *
 * Kept as a subpath for compatibility: FreeHarmony imports `@harmony/usb/models` in its window, and its
 * `test/boundary.test.ts` checks that this subpath resolves to this file. Off this package's main entry; the
 * subpath stays only until FreeHarmony's imports have moved to the base. This is a re-export, not a
 * copy, so the table still exists once. New code imports `@harmony/base/models`.
 */
export * from '@harmony/base/models';
