/**
 * The trailer checksum, moved to `packages/base/src/trailer.ts` by `todo.md` 7.3.4, plan 013 decision 4.
 *
 * A re-export, not a copy, so the derivation still exists once. Two readers remain: the
 * `@harmony/usb/trailer` subpath, kept for compatibility until FreeHarmony's half of `todo.md` 7.3.6, and
 * `rails.ts` and `filewrite.ts`, which import it from here so that the move left the rails' own text untouched.
 * New code imports `@harmony/base/trailer`.
 */
export * from '@harmony/base/trailer';
