/**
 * The base every other package stands on: facts about a Harmony that are neither a transport nor a
 * codec, and that a browser, an Electron window and the command line all need alike.
 *
 * Plan 013, decision 4. The first three modules lived in `packages/usb` at first, and the
 * codec depended on that package for two of them, so a program that only wanted to parse a
 * configuration pulled in `node-hid`, a native module with an install step. Here they depend on
 * nothing outside Node's own, and nothing in this package reads the disk or loads a native module;
 * `test/base.test.ts` holds that.
 *
 * Each module is also its own subpath, `@harmony/base/models` and the rest, because the key reader page
 * loads them in a browser one module at a time and must not reach for anything else. **Explicit names**
 * here, all four modules' whole, held by `test/surface.test.ts`; the byte comparison joined them last.
 *
 * The fifth module is the FHSDK's requirements and every bench model's status on each, `requirements.ts`, decision
 * 33: data, which an application, the codec's capability answer and the generated documents all read. Its one
 * import is the sixth, `proofs.ts`, the proofs in the tests that make a requirement met, generated from the test
 * sources so an application can read them; its type is on this entry, and both are their own subpaths too.
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
// Whether two byte arrays hold the same bytes, the one copy.
export { sameBytes } from './bytes.ts';
// What the FHSDK must do for an application, numbered for good, and each bench model's status on every requirement
// with its evidence, decision 33. The codec's `capabilitiesOf` joins these to a model's properties.
export {
  benchModel,
  BENCH_MODELS,
  requirement,
  REQUIREMENT_STATUS_NAMES,
  REQUIREMENT_SUBJECTS,
  REQUIREMENTS,
  requirementState,
} from './requirements.ts';
export type { BenchModel, BenchModelKey, Proof, Requirement, RequirementScope, RequirementState, RequirementStatus } from './requirements.ts';
