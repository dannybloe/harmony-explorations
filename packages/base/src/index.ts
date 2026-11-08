/**
 * The base every other package stands on: facts about a Harmony that are neither a transport nor a
 * codec, and that a browser, an Electron window and the command line all need alike.
 *
 * Plan 013, decision 4. These three modules lived in `packages/usb` until `todo.md` 7.3.4, and the
 * codec depended on that package for two of them, so a program that only wanted to parse a
 * configuration pulled in `node-hid`, a native module with an install step. Here they depend on
 * nothing outside Node's own, and nothing in this package reads the disk or loads a native module;
 * `test/base.test.ts` holds that.
 *
 * Each module is also its own subpath, `@harmony/base/models` and the rest, because the key reader page
 * loads them in a browser one module at a time and must not reach for anything else. **Explicit names**
 * here, all three modules' whole, held by `test/surface.test.ts`, `todo.md` 7.3.6.
 */

// The model table: a skin to a model and what its hardware can do.
export {
  architectureHasTouch,
  hasLongPress,
  modelForSkin,
  MODELS_BY_SKIN,
  MODELS_WITHOUT_A_SKIN,
  OUT_OF_TRANSPORT_REACH,
  SKINS_WITH_A_LONG_PRESS,
  SKINS_WITHOUT_A_MODEL_RECORD,
} from './models.ts';
export type { Model, MotionSensor, Panel } from './models.ts';
// The configuration container's trailer checksum, the one copy.
export { TRAILER_CHECKSUM_OFFSET, TRAILER_CHECKSUM_SEED, trailerChecksum } from './trailer.ts';
// Where a running remote keeps the key being pressed, per model.
export { ARCH_8_PRODUCT, WATCH, WATCH_BY_SKIN } from './keys.ts';
export type { Watch } from './keys.ts';
