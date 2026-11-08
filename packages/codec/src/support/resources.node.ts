/**
 * The codec's resources as Node supplies them, `resources.ts`: Oxanium from this package's own copy beside the source,
 * Material Design Icons from the pinned `@mdi/font`, the deflate of Node's `zlib` and the SHA-256 of its `crypto`.
 * Supplied when this module loads, which the Node entry, `node.ts`, does first; a Node caller that imports a module of
 * the core directly by its path, as the codec's own tests do, imports this module as well when it draws a letter, an
 * icon or a picture.
 *
 * Each is what the module that now asks for it read itself until `todo.md` 7.3.5, the same file and the same call, so
 * nothing drawn or written changes: `typeface.ts` read the fonts, `icons.ts` the icon package, `png.ts` deflated and
 * `harmony-touch/fromnothing.ts` hashed.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { deflateSync } from 'node:zlib';
import { supplyResources, type CodecResources } from './resources.ts';

const require = createRequire(import.meta.url);

/** The five resources from this checkout and Node. */
export const NODE_RESOURCES: CodecResources = {
  oxanium: (weight) => readFileSync(new URL(`../../fonts/Oxanium/static/Oxanium-${weight}.ttf`, import.meta.url)),
  iconFont: () => readFileSync(require.resolve('@mdi/font/fonts/materialdesignicons-webfont.ttf')),
  iconList: () => readFileSync(require.resolve('@mdi/font/scss/_variables.scss'), 'utf8'),
  deflate: (bytes) => new Uint8Array(deflateSync(bytes)),
  sha256: (bytes) => createHash('sha256').update(bytes).digest('hex'),
};

supplyResources(NODE_RESOURCES);
