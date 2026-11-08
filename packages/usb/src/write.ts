/**
 * The write path's own entry point, for a caller in this workspace that composes two packages.
 *
 * **Why this exists rather than a deep import.** `blockwrite.ts`, `filewrite.ts` and `rehearsal.ts` are
 * on no other entry of the package, and `rails.ts` is not on the main entry: a consumer of `@harmony/usb`
 * gets the read path and `RailError`, the refusal it meets, and not the machinery that erases flash. The
 * rails whole are their own subpath, `@harmony/usb/rails`, and this file carries the three a block writer
 * asserts, `todo.md` 7.3.6, which made `index.ts` say the same. `bin/rehearse-block.ts` reaches them by
 * relative path because it lives inside this package. A script that also needs `@harmony/codec`
 * cannot, since the container parser is where the trailer checksum lives and a writer that does not
 * check it can produce a file the remote refuses to boot.
 *
 * So this is one named subpath, `@harmony/usb/write`, holding exactly what such a caller needs. It
 * widens the package's surface on purpose and the widening is bounded to this file, which is the
 * point: adding a second write caller should be a decision visible in a diff rather than an import
 * nobody notices.
 *
 * Nothing here is permission. `WRITES_ENABLED` is off unless `HARMONY_ENABLE_WRITES=1`, every
 * command still passes the rails, and `writeBlock` still demands a `WritePermission` whose three
 * caller assertions the library cannot check.
 */
export {
  BlockWriteError,
  MAX_TRANSFER,
  firstDifference,
  reportCount,
  transfersFor,
  writeBlock,
} from './blockwrite.ts';
export type { BlockWrite } from './blockwrite.ts';

export {
  CONFIG_REGION_BASE,
  assertFirstWriteAllowed,
  assertUnitIsPermitted,
} from './rails.ts';
export type { WritePermission } from './rails.ts';

// The file based family's write path: the Harmony 300 and 350. A second protocol's writer beside the
// first, behind its own rail, `assertFileWriteAllowed`. `writeFileFamilyConfiguration` is the whole run an
// application calls, `todo.md` 7.3.10: the container, the open, the judgement and `writeFileConfig`.
export {
  FileWriteError,
  chunksFor,
  judgeCurrentContent,
  readFileWriteFacts,
  withEndMarker,
  writeFileConfig,
  writeFileFamilyConfiguration,
} from './filewrite.ts';
export type {
  CurrentContent,
  FileConfigWrite,
  FileFamilyUnit,
  FileFamilyWrite,
  FileFamilyWriteResult,
  FileWriteFacts,
  FileWriteResult,
} from './filewrite.ts';

export {
  NOMINAL_FLASH_SIZE,
  blocksDiffering,
  failureLine,
  neighbourBlocks,
} from './rehearsal.ts';
