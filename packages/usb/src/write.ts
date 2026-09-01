/**
 * The write path's own entry point, for a caller in this workspace that composes two packages.
 *
 * **Why this exists rather than a deep import.** `blockwrite.ts`, `rails.ts` and `rehearsal.ts` are
 * all deliberately absent from the package barrel: a consumer of `@harmony/usb` gets the read path
 * and the protocol, not the machinery that erases flash. `bin/rehearse-block.ts` reaches them by
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

export {
  NOMINAL_FLASH_SIZE,
  blocksDiffering,
  failureLine,
  neighbourBlocks,
} from './rehearsal.ts';
