/**
 * The key tables, moved to `packages/base/src/keys.ts`, plan 013 decision 4.
 *
 * Kept as a subpath for compatibility, for anyone importing `@freeharmony-sdk/usb/keys`; off this package's main entry,
 * and the subpath stays only until FreeHarmony's imports have moved to the base. A re-export, not a
 * copy. New code imports `@freeharmony-sdk/base/keys`.
 */
export * from '@freeharmony-sdk/base/keys';
