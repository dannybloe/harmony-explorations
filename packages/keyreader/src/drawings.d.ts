/**
 * The shape of `drawings.js`, which has no TypeScript source: `bin/build.ts` writes it from the drawings in
 * `reference/silhouettes/` and the key data in `packages/silhouettes`, through `bin/drawings.ts`, which says
 * why the drawings are inlined rather than fetched. `page.ts` imports it as `./drawings.js`, which the
 * compiler resolves to this declaration and the build to the generated file beside the page.
 */
import type { Drawing } from './session.ts';

/** Every drawn model the page reads keys on, its keys in the order the page asks for them. */
export declare const DRAWINGS: readonly Drawing[];
