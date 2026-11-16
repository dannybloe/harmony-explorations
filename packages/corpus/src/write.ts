/**
 * `@harmony/corpus/write`: writing a configuration to a remote, the two write paths that need the codec.
 *
 * **Why a subpath of its own and not the main entry.** Decision 31 settled that a write function is never
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
export {
  CONFIG_WRITE_MODELS, CONFIG_WRITE_UNITS, ConfigWriteRefusal, ConfigWriteStopped, writeConfiguration,
} from './writeconfig.ts';
export type {
  ConfigWrite,
  ConfigWriteModel,
  ConfigWriteModelName,
  ConfigWriteResult,
  ConfigWriteStamp,
  ConfigWriteStep,
  ConfigWriteUnit,
  ConfigWriteUnitLabel,
  UnitRecords,
} from './writeconfig.ts';

// Answering a Harmony Touch's sync: the whole run, the flags it checks first, and what a caller hands it.
export {
  RECOVERY, SYNC_LINES, TOUCH_SYNC_UNITS, answerTouchSync, assertTouchSyncAllowed, prepareSet,
} from './touchsync.ts';
export type { SetAnswer, TouchSet, TouchSyncMode, TouchSyncOutcome, TouchSyncRun } from './touchsync.ts';

// **Syncing a document**, the contract an application writes a remote through, decision 38: one function for every
// model, reporting as events, and a pretend remote to run it against, R80, which a read of a configuration,
// `readConfig` on the main entry, reads through `pretendReader`. Built to a pretend remote and to an attached remote of
// the same models: a Harmony One, 600, 650 or 700, over `writeConfiguration`, and a Harmony Touch, over
// `answerTouchSync`; for a document of any other model it refuses by name. The keeper is one of two kinds, by the kind
// of family the remote's model is chosen into: `CompiledKeeper` for a write into flash, `DocumentKeeper` for an
// answered sync.
// What a failed sync leaves a remote needing is a state of a closed list, `SYNC_STATES`, with what is true of the
// remote, whether it may be unplugged and what puts it right, so an application acts on data rather than on a sentence.
export { SYNC_ENDINGS, SYNC_STATES, pretendReader, pretendRemote, syncDocument } from './sync.ts';
export type {
  AttachedRemote, CompiledKeeper, DocumentKeeper, PretendFailure, PretendOptions, PretendRead, PretendRemote, RemoteKeeper,
  SyncAttention, SyncEnding, SyncEvent, SyncOutcome, SyncPhase, SyncRemote, SyncRequest, SyncState,
} from './sync.ts';
