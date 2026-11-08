/**
 * What the codec needs at run time and does not carry in its own source: two typefaces' files, Node's deflate for a
 * PNG of ours and SHA-256. Supplied by whoever loads the codec, plan 013 decision 5 and `todo.md` 7.3.5, so that the
 * main entry loads where there is no disk and no Node, an Electron renderer or a browser.
 *
 * **Who supplies them.** The Node entry, `@harmony/codec/node`, supplies all five as it loads, from this package's own
 * copy of Oxanium, the pinned `@mdi/font` package and Node's `zlib` and `crypto`, `resources.node.ts`; so a Node
 * caller that imports from there never meets this module. A renderer supplies what it holds, fetched or bundled, through
 * `supplyResources`, once and before the first use, since a parsed font is kept. A builder that needs one nobody
 * supplied refuses naming it, `ResourceError`, at the first letter, icon or picture it draws, never at load.
 *
 * **Why these five are supplied and not written here**, each for its own reason:
 *
 * * **The fonts and the icon list are files.** The core reads no disk, and a font's bytes are not source; a bundler
 *   serves them as assets.
 * * **The deflate is Node's on purpose.** Every PNG this codec has written, the Harmony Touch's logos and background
 *   among them, was compressed by Node's zlib, and the background's name is the SHA-256 of its bytes, so a different
 *   encoder renames it. `deflate.ts` writes stock zlib's stream, which is what Logitech's compiler wrote and not what
 *   Node's zlib writes, a fork whose matcher differs (that module's header has the measurement), and it refuses an
 *   input past 65273 bytes, which a contact sheet exceeds. Inflating is the other way round: every decoder gives the
 *   same bytes, so `inflateZlib` and `inflateRaw` in `deflate.ts` are our own and the core reads a PNG or a metadata
 *   archive with nothing supplied.
 * * **SHA-256 names a background of ours**, `ourBackground` in `harmony-touch/fromnothing.ts`. A renderer has one in
 *   Web Crypto, which answers asynchronously, and the builder that asks is synchronous; a second implementation here
 *   would be one more derivation to check against Node's.
 */

/** Everything the codec asks its loader for. */
export interface CodecResources {
  /** A cut of Oxanium, the bytes of `packages/codec/fonts/Oxanium/static/Oxanium-<weight>.ttf`. */
  readonly oxanium: (weight: string) => Uint8Array;
  /** Material Design Icons' font, the bytes of `@mdi/font`'s `fonts/materialdesignicons-webfont.ttf`. */
  readonly iconFont: () => Uint8Array;
  /** Its icons' names and code points, the text of `@mdi/font`'s `scss/_variables.scss`. */
  readonly iconList: () => string;
  /** `bytes` as a zlib stream, RFC 1950, exactly as Node's `zlib.deflateSync` writes it at its defaults. */
  readonly deflate: (bytes: Uint8Array) => Uint8Array;
  /** The SHA-256 of `bytes`, in lower case hexadecimal. */
  readonly sha256: (bytes: Uint8Array) => string;
}

/** A resource the codec needed and nobody supplied, by its name. */
export class ResourceError extends Error {}

const supplied: { -readonly [K in keyof CodecResources]?: CodecResources[K] } = {};

/** Hand the codec what it asks for. Later calls replace the resources they name and keep the others. */
export function supplyResources(resources: Partial<CodecResources>): void {
  Object.assign(supplied, resources);
}

/** One resource, or the refusal naming it when nobody supplied it. */
export function resource<K extends keyof CodecResources>(name: K): CodecResources[K] {
  const found = supplied[name];
  if (found === undefined) {
    throw new ResourceError(`the codec was supplied no ${name}: import it through @harmony/codec/node, or hand it one with supplyResources`);
  }
  return found as CodecResources[K];
}
