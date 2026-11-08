/**
 * `@harmony/corpus/write`: writing a configuration to a remote, the two write paths that need the codec.
 * `todo.md` 7.3.10.
 *
 * **Why a subpath of its own and not the main entry.** `todo.md` 7.3.6 settled that a write function is never
 * on a main entry: an application that reads a remote imports `@harmony/corpus` and gets the reader, and one
 * that writes names this subpath, which is a decision visible in a diff. The same reasoning made
 * `@harmony/usb/write`, and the third write path, the file write for the Harmony 300 and 350, sits there,
 * `writeFileFamilyConfiguration`, because it needs nothing of the codec.
 *
 * **Why these two are here and not in `@harmony/usb/write`.** Each needs the codec, which `packages/usb` cannot
 * import: the configuration write parses the container and runs `assertQueueFits` and
 * `assertStateTableConsistent` before anything is erased, and the Touch's answerer refuses a set the codec's
 * reader and check reject before anything is written, `touchsync.ts` argues it. A gate a caller hands in is a
 * gate a caller can hand in empty, so the gate stays inside the function that writes.
 *
 * Nothing here is permission. Every rail is still asserted inside the function, and every command goes through
 * `@harmony/usb`'s guarded transports; the flags are read by the rails, never by a caller.
 */

// Writing a configuration to a remote of the compiled families: the Harmony One, 600, 650, 700 and 885.
export { CONFIG_WRITE_MODELS, ConfigWriteRefusal, writeConfiguration } from './writeconfig.ts';
export type {
  ConfigWrite,
  ConfigWriteModel,
  ConfigWriteModelName,
  ConfigWriteResult,
  ConfigWriteStamp,
  ConfigWriteUnit,
  UnitRecords,
} from './writeconfig.ts';

// Answering a Harmony Touch's sync: the whole run, the flags it checks first, and what a caller hands it.
export { RECOVERY, SYNC_LINES, answerTouchSync, assertTouchSyncAllowed, prepareSet } from './touchsync.ts';
export type { SetAnswer, TouchSet, TouchSyncMode, TouchSyncOutcome, TouchSyncRun } from './touchsync.ts';
