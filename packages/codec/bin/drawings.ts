/**
 * The scan codes the drawings in `packages/silhouettes` name, for the codec's own checks of them.
 *
 * **Why this exists.** Until plan 009's step 3.3 the scan code of each key the calibration configurations
 * reach was a Markdown table, `reference/button-maps.md`, and five readers in two languages parsed it back
 * out: `bin/catalogue.ts`, `test/catalogue.test.ts` and `test/irframe.test.ts` here, the silhouettes'
 * own model test and a Python test. The drawings already held the same codes, so the table was a second
 * copy kept in step by a test. The codes are the drawings' data now and these readers take them from
 * there, which leaves one copy.
 *
 * **Why it loads them at run time rather than importing them.** `packages/silhouettes` depends on this
 * package, for the screen sizes and the slot maps its reference generator writes, and TypeScript refuses a
 * cycle of project references. Its library in `src` imports nothing, so loading it by path works under
 * Node and costs only the types, which `DrawnKey` restates for the four fields read here, and `drawnKeys`
 * checks at run time so a renamed field fails loudly instead of reading as absent.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** The four fields of a drawing's key a scan check reads, `Key` in `packages/silhouettes/src/types.ts`. */
export interface DrawnKey {
  readonly name: string;
  readonly src: 'catalogue' | 'printed';
  readonly scan?: number;
  /** The archive section that established `scan`, `SCAN_SOURCES` in the same file. */
  readonly scanFrom?: number;
}

const INDEX = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'silhouettes', 'src', 'index.ts');
const silhouettes = (await import(pathToFileURL(INDEX).href)) as {
  readonly MODELS: Readonly<Record<string, { readonly keys: readonly DrawnKey[] }>>;
};

/**
 * The sections whose scan codes are named through Logitech's own maps: section 133's button maps for the
 * calibration configurations, and the device maps that decided the arrow pairs, section 323 on the Harmony
 * 600 and section 398 on the Harmony One. The other sources a drawing names, the One's touch hit map and
 * the 600's Help, come from the configuration alone and no map of Logitech's names them.
 */
export const NAMED_BY_LOGITECH: ReadonlySet<number> = new Set([133, 323, 398]);

/** Each calibration configuration and the drawing of the model it was compiled for. */
export const CALIBRATION_DRAWINGS: Readonly<Record<string, string>> = {
  calibration_one: 'one',
  calibration_h600: 'h600',
};

/** Every key of one drawing, checked to carry the fields `DrawnKey` claims. */
export function drawnKeys(drawing: string): readonly DrawnKey[] {
  const model = silhouettes.MODELS[drawing];
  if (model === undefined) throw new Error(`packages/silhouettes draws no model ${drawing}`);
  for (const key of model.keys) {
    if (typeof key.name !== 'string' || (key.scan !== undefined && typeof key.scanFrom !== 'number')) {
      throw new Error(`${drawing}: a key does not have the shape DrawnKey reads, ${JSON.stringify(key.name)}`);
    }
  }
  return model.keys;
}

/**
 * Scan code to button name on one drawing, for the keys whose code came from one of `sources`, all of
 * them when none is given. A scan code names one key, which the silhouettes' own test asserts, so a map
 * loses nothing.
 */
export function drawnScans(drawing: string, sources?: ReadonlySet<number>): Map<number, string> {
  const out = new Map<number, string>();
  for (const key of drawnKeys(drawing)) {
    if (key.scan === undefined) continue;
    if (sources !== undefined && !sources.has(key.scanFrom!)) continue;
    out.set(key.scan, key.name);
  }
  return out;
}
