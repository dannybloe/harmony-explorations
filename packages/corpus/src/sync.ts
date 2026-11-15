/**
 * Syncing a document to a remote, the contract: one function for every model, which reports what it does as events
 * a screen can show, R79, and a pretend remote to run it against with nothing attached, R80.
 *
 * **One function, because the three ways a remote is written are not an application's business.** A compiled
 * configuration is written into flash, a file is put on a remote that keeps files, and a remote that asks for
 * documents is answered; which one applies follows from the model. An application names a document and a remote and
 * is told what happens.
 *
 * **Events beside the journal, never instead of it.** The write paths each take a line sink that is required,
 * because the record of what was sent to an irreplaceable device must not depend on a caller remembering to keep
 * one, `CLAUDE.md`. That stays: `journal` is required here too and receives the same lines. The events are a second
 * channel for a person watching: which phase the sync is in, how far along, what they must do or leave, and how it
 * ended.
 *
 * **A stop is a request.** Between an erase and the write that follows it a remote holds no configuration, and
 * between two blocks it holds half of each, so a sync that stopped the moment it was asked could leave a remote
 * that does not start. `stop` is honoured up to the first write and not after it: a sync that has begun to write
 * runs to its end, and an outcome of `stopped` always means the remote is as it was.
 *
 * **The rails do not move.** This function will choose a write path and call it; every rail is still asserted
 * inside that path, on the same inputs, and which units may be written is still the library's list and never a
 * caller's, `packages/usb/src/rails.ts`. Writing a user's own remote is R6, a decision of its own before it is built.
 *
 * **Built**: a sync to an attached remote of a model whose configuration is written into flash, the Harmony One, 600,
 * 650 and 700, through `writeConfiguration` and nothing else; a sync to an attached Harmony Touch, a remote that asks
 * for its documents and is answered, through `answerTouchSync` and nothing else; and the pretend remote, R80, which
 * answers a sync of the same models and a read of a configuration, below. A sync of a document of any other model
 * refuses by name, `NotBuiltError`, with the requirement it waits on, before anything is opened, to a pretend remote
 * as to an attached one.
 *
 * **What an attached sync adds to the write path is nothing.** It checks and builds the document, hands what was
 * built to the model's write path with the keeper's records of the unit, and turns what that reports into events.
 * Which unit is on the cable, whether it may be written, every compare before an erase and every read back after a
 * write, every request a Touch is sent and every check of an answer are that path's and the rails' under it,
 * asserted where they always were.
 *
 * **The pretend remote runs the same sync, and only the cable is pretended.** What a sync reports is derived once, in
 * the stages below that every path goes through: the phases before anything is opened, the check and the build, and
 * the two mappings from what a write path reports to events and an outcome, one for a write into flash and one for an
 * answered sync. An attached sync hands those mappings the model's real write path; a pretend sync hands them a stand
 * in that reports the same steps, lines and outcomes `writeConfiguration` and `answerTouchSync` report, and keeps what
 * it was given in memory. So a screen built against the pretend remote sees the events, the order, the outcomes and
 * the words of the real one, and a change to a mapping changes both, which `pretend-against-attached.test.ts` holds.
 * Where the pretend's stand in says something itself, the words a failure is reported with, it says it in the form
 * the real path's own failures take.
 *
 * **Two kinds of remote, two kinds of keeper.** The contract was first written against the compiled family alone,
 * and a Harmony Touch fits it only where its sync has the same shape: the phases before anything is opened, a stop
 * honoured up to the first request that acts, and an outcome that says what the remote was left as. Where it does not,
 * the contract says so in its own types: `RemoteKeeper` is a union by the kind of family the model is chosen into,
 * plan 013 decision 1, since what a keeper holds for a flash write (a region read, the records of several units) and
 * for an answered sync (one unit's record, the account's addresses, the folder the run is kept in) have nothing in
 * common but `keep` and `open`, and those two take different things. A Touch adds one phase, `hand-over`, and reports
 * no progress, since nothing it reports gives a total; the pretend remote of a Touch reports the same.
 *
 * **Reading.** The read of a remote an application has today is the read of a configuration out of flash,
 * `readConfig` on `@harmony/corpus`'s main entry, which a `ConfigReader` and a `RemoteProfile` serve. A pretend remote
 * of a model that read serves offers both, `pretendReader`, over what it holds. A Harmony Touch's documents have no
 * read of their own on any entry yet, so a pretend Touch offers none either.
 */
import {
  buildFromRecipe, chooseByModel, NotBuiltError, recipe, recipeTarget,
  type BuildSources, type Built, type Recipe, type RecipeModel,
} from '@harmony/codec/node';
import { harmonyTouch } from '@harmony/codec/build';
import {
  HarmonyRemote, openFileBasedRemote, openHarmony, RailError, readTouchPowerSource, skinId, type FoundRemote,
  type TouchPowerSource, type Transport,
} from '@harmony/usb';
import { encodeVersionBlock } from '@harmony/usb/protocol';
import { ERASE_BLOCK_SIZE } from '@harmony/usb/rails';
import { blocksDiffering } from '@harmony/usb/write';
import { PROFILES, ReadError, type ConfigReader, type RemoteProfile } from './read.ts';
import {
  CONFIG_WRITE_MODELS, ConfigWriteRefusal, ConfigWriteStopped, writeConfiguration,
  type ConfigWriteResult, type ConfigWriteStep, type ConfigWriteUnit, type UnitRecords,
} from './writeconfig.ts';
import {
  RECOVERY, SYNC_LINES, abortCost, answerTouchSync, assertTouchSyncAllowed, assertTouchSyncUnit, describePowerSource,
  prepareSet, touchFolderRefusal, touchPowerRefusal, touchSetOf, type TouchSet, type TouchSyncOutcome,
} from './touchsync.ts';

/**
 * What a sync is doing, in the order it does it; a model's sync leaves out the phases it has no use for. A sync of a
 * configuration written into flash runs `identify`, `check`, `build`, `backup`, `write`, `verify` and `restart`; a sync
 * of a Harmony Touch runs `identify`, `check`, `build`, `hand-over` and `write`, and has no read back and no restart:
 * the remote commits what it gathered itself and goes on running, and the answerer reads nothing back.
 */
export type SyncPhase =
  // Which remote is on the cable, as far as it says without being opened, and whether the keeper holds what a sync of
  // that remote needs. Which unit it is, is read off the remote itself by the write path once it is opened, and never
  // taken from the caller.
  | 'identify'
  // The document checked, and what the remote is given built from it, before the remote is touched. For a Harmony
  // Touch the build includes the set its documents are delivered as and the answerer's gate over that set.
  | 'check' | 'build'
  // What the remote holds read into a backup, which a write needs to exist first.
  | 'backup'
  // **A Harmony Touch's own changes handed up**, each kept in the folder before its answer, and written back to it
  // under a tag of ours. Not a backup, though it keeps what the remote holds: the remote commits what it handed up,
  // so this is the first phase that acts on it, and a person is told not to unplug before it.
  | 'hand-over'
  // The write itself: a configuration into flash, or every document and picture a Harmony Touch asks for answered
  // until it commits them; then, for flash, the read back that compares every byte and the restart that makes the
  // remote take it up.
  | 'write' | 'verify' | 'restart';

/** What a person must do or leave while a sync runs. */
export type SyncAttention =
  // From here on, pulling the cable or the batteries can leave the remote without a configuration.
  | 'do-not-unplug'
  // The remote is whole again: it may be unplugged.
  | 'safe-to-unplug'
  // The remote restarts by itself and will be away from the cable for a moment.
  | 'restarting'
  // The remote has to be restarted by hand, its batteries out and in, before it takes the configuration up.
  | 'restart-by-hand';

/** One thing a sync reports. A screen needs no more than the latest of each kind. */
export type SyncEvent =
  | { readonly kind: 'phase'; readonly phase: SyncPhase }
  | { readonly kind: 'progress'; readonly phase: SyncPhase; readonly done: number; readonly total: number }
  | { readonly kind: 'attention'; readonly attention: SyncAttention; readonly message: string }
  | { readonly kind: 'outcome'; readonly outcome: SyncOutcome };

/**
 * How a sync ended, and what state it left the remote in, which is what a person needs to know first.
 *
 * **For a Harmony Touch**: `written` when the remote finished, which it does only after it has committed what it was
 * answered, so it holds the new set (nothing is read back: the answerer has no read back, and the remote's own commit
 * is the check); `refused` with the remote `as-before` for every refusal before the first request that acts on it,
 * the gate, a power source but `usb` and the provisioning read among them; `failed` with the remote `needs-recovery` for a refusal after it,
 * the message carrying the recovery order and what an abort would cost there; and `failed` with the remote
 * `as-before` when the remote itself aborted, since an abort deletes what it had gathered and reloads the set it
 * held. **`nothing-to-write` is never a Touch's outcome**: what the remote holds can be told only by asking it, a
 * request the answerer does not send, and a sync whose every answer turns out 304 has still handed the remote's own
 * changes up and committed, so it is `written`.
 */
export interface SyncOutcome {
  /** How it ended: one of `SYNC_ENDINGS`' results, each described there. */
  readonly result: SyncEnding['result'];
  /** The remote as the sync left it: untouched, holding the new configuration, or needing its recovery route. */
  readonly remote: SyncEnding['remote'];
  /** Why, in a sentence, for every result but `written`. */
  readonly message?: string;
}

/**
 * **Every way a sync ends, per kind of remote**: each result with what it leaves the remote as. The one place the
 * outcomes are stated, so that `SyncOutcome`'s types are derived from it and a screen, or a test that every ending is
 * reached, can walk it; a result or a state added to the type is added here or nowhere.
 *
 * * `written`: the remote holds the document's configuration, read back and equal, or, on a Harmony Touch, committed
 *   by it.
 * * `nothing-to-write`: the remote already held it; a write into flash only, `SyncOutcome`'s header says why.
 * * `dry-run`: everything up to the first write was done and nothing was sent, `commit` being false.
 * * `stopped`: a stop was asked and honoured, so the remote is as it was.
 * * `refused`: a check or a rail refused before anything was written.
 * * `failed`: something went wrong on the cable, in the remote or in its keeper; `remote` says what that left: as it
 *   was before anything changed, needing its recovery part way, and, for flash, the new configuration whole with only
 *   the restart owed. A Harmony Touch swaps a set in only at its commit, so a failure never leaves it the new one.
 */
export const SYNC_ENDINGS = {
  compiled: [
    { result: 'written', remote: 'new-configuration' },
    { result: 'nothing-to-write', remote: 'as-before' },
    { result: 'dry-run', remote: 'as-before' },
    { result: 'stopped', remote: 'as-before' },
    { result: 'refused', remote: 'as-before' },
    { result: 'failed', remote: 'as-before' },
    { result: 'failed', remote: 'needs-recovery' },
    { result: 'failed', remote: 'new-configuration' },
  ],
  document: [
    { result: 'written', remote: 'new-configuration' },
    { result: 'dry-run', remote: 'as-before' },
    { result: 'stopped', remote: 'as-before' },
    { result: 'refused', remote: 'as-before' },
    { result: 'failed', remote: 'as-before' },
    { result: 'failed', remote: 'needs-recovery' },
  ],
} as const;

/** One ending of `SYNC_ENDINGS`, of either kind of remote. */
export type SyncEnding = (typeof SYNC_ENDINGS)[keyof typeof SYNC_ENDINGS][number];

/**
 * What a sync to an attached remote needs that only whoever keeps the remote holds. On the bench these are the lab's;
 * in an application they are kept with the user's own data. **None of it is a permission**: which units may be written
 * is the library's list, `CONFIG_WRITE_UNITS` or `TOUCH_SYNC_UNITS`, and a label outside it is refused.
 *
 * **A union by kind**, the kind of family the remote's model is chosen into, because a flash write and an answered
 * sync need different things of a keeper: the compiled family's write compares every block with a read of what the
 * remote held and identifies the unit among several records; a Harmony Touch's answerer reads nothing back, compares
 * the one unit's serial, and keeps its whole run in a folder. A keeper of the other kind than the remote found is
 * refused by name before anything is opened.
 */
export type RemoteKeeper = CompiledKeeper | DocumentKeeper;

/**
 * The keeper of a remote whose configuration is written into flash: the records that say which unit it is, and the
 * read of what it held, which is both the backup and what every block is compared with before it is erased.
 */
export interface CompiledKeeper {
  readonly kind: 'compiled';
  /** The units this caller keeps records of, each with the names of its region reads. */
  readonly units: readonly ConfigWriteUnit[];
  /** Each unit's recorded identity, which the remote on the cable has to match by its own identity block. */
  readonly records: UnitRecords;
  /**
   * The read of the unit's configuration region as it is now, whole blocks from the region's base: its name, one of
   * the unit's `regions`, and its bytes. A write is refused where the remote does not hold exactly this.
   */
  readonly region: { readonly name: string; readonly bytes: Uint8Array };
  /**
   * Keep the configuration that is about to be written, called once before a committed write with the bytes built,
   * so that whatever happens next the caller holds what the remote was being given.
   */
  readonly keep: (configuration: Uint8Array) => void;
  /** Open the remote; absent, the one found is opened through the guarded transport. A test hands in a stand in. */
  readonly open?: () => Promise<{ readonly remote: HarmonyRemote; readonly productId: number }>;
}

/**
 * The keeper of a remote that asks for documents and is answered, a Harmony Touch, the only model of a document family
 * there is: a second document family whose write path takes other things is a third arm, not a reason to widen this one.
 *
 * **What it holds, and why each is the keeper's.** The unit's label and its recorded identity, because which unit may
 * be synced is the library's list and the identity is what the session compares the remote's serial with, as
 * `answerTouchSync` takes them. The account's addresses, because the documents a sync delivers are answered at the
 * addresses the remote asks by, and those name the account and the remote by number: they are read off a set the
 * remote held and kept with its other records, never in a document, and the codec's build neither needs nor holds
 * them, `touchSetOf`. And the folder, because the answerer keeps every request, every answer and every document the
 * remote hands up in it, before the next step: that is this path's journal of content, beside the journal of lines.
 */
export interface DocumentKeeper {
  readonly kind: 'document';
  /** The label of the unit's record, refused unless it is one of the library's `TOUCH_SYNC_UNITS`. */
  readonly label: string;
  /** That unit's recorded identity, which the session compares the remote's serial with when it opens. */
  readonly permittedUnit: Uint8Array;
  /** The address each of the six configuration documents is asked at, by the document's name. */
  readonly addresses: Readonly<Record<string, string>>;
  /**
   * Make the folder the run is kept in, new or empty; called once, before a committed sync opens anything, and never
   * by a dry run, which keeps nothing. A function rather than a path, so that a dry run leaves no empty folder behind.
   */
  readonly folder: () => string;
  /**
   * Keep the set that is about to be delivered, called once before a committed sync opens anything, so that whatever
   * happens next the caller holds what the remote was being given. It holds the account's values, so it is kept
   * where the account's description is.
   */
  readonly keep: (set: TouchSet) => void;
  /** Open the Touch; absent, the one found is opened through the file protocol's guard. A test hands in a stand in. */
  readonly open?: () => Promise<Transport>;
}

/** A remote found on the cable, `listHarmony`, with what its keeper holds for it. */
export interface AttachedRemote {
  readonly kind: 'attached';
  readonly found: FoundRemote;
  readonly keeper: RemoteKeeper;
}

/**
 * The remote a sync writes: one found on the cable or a pretend one. Which unit an attached remote is, is read off
 * the remote itself; a caller cannot state it.
 */
export type SyncRemote = AttachedRemote | PretendRemote;

/** What a sync is given. */
export interface SyncRequest {
  readonly document: Recipe;
  readonly remote: SyncRemote;
  /**
   * What a build reads beyond the document: the catalogue for a device whose definition it does not carry, and the
   * moment it is built at, which every stamp in the configuration is taken from. **A sync run again after one
   * that failed part way is given the same moment**: the remote then holds a part of that build, and the write
   * recognises a block it left unfinished only against the same bytes.
   *
   * **A Harmony Touch's build also needs `account`**, the identifiers its documents carry, and refuses without it;
   * its documents take no stamp from the moment, so for a Touch the moment changes nothing. The addresses the
   * documents are answered at are the account's too, and are the keeper's, `DocumentKeeper.addresses`, since the
   * build neither needs nor holds them.
   */
  readonly sources: BuildSources;
  /** False runs everything up to the first write and sends nothing that changes the remote. */
  readonly commit: boolean;
  readonly onEvent: (event: SyncEvent) => void;
  /** Every line the write path prints, in order; required, as the write paths require it. */
  readonly journal: (line: string) => void;
  /**
   * Ask the sync to stop; honoured up to the first write, and a sync that has begun to write runs to its end. On a
   * Harmony Touch, honoured up to the moment the remote is opened and not after, `syncAttachedTouch` says why.
   */
  readonly stop?: AbortSignal;
}

/**
 * A remote that is not there, R80: an application syncs to it and reads it as it would a remote on the cable, and it
 * answers with the events, the outcomes and the words a remote on the cable gives, its failures included, so every
 * screen of a sync and a read can be built and tried with nothing attached. Made by `pretendRemote` and by nothing
 * else: an object put together to look like one is refused.
 *
 * **What it holds**, for as long as the object lives: for a model whose configuration is written into flash, the
 * bytes of the configuration last written to it, which a sync compares by erase block as the real write does and a
 * read reads back; for a Harmony Touch, nothing but the document last synced, since a Touch's sync never asks the
 * remote what it holds.
 */
export interface PretendRemote {
  readonly kind: 'pretend';
  readonly model: RecipeModel;
  /**
   * The document whose configuration it holds whole: the one last synced to it, or the one it was made with; undefined
   * when it holds none of ours, and after a write that stopped part way, which leaves it holding a part of each.
   */
  readonly holds: () => Recipe | undefined;
}

/**
 * What goes wrong in the next sync or the next read of a pretend remote, once. Each is a failure of the remote or the
 * cable, reported where the real path meets it, and the outcome says what the real path says a failure there leaves:
 *
 * * `identify`: the remote does not answer when it is asked which unit it is. **This shows after `build`**, where both
 *   real paths open the remote, since the `identify` phase reads only what the remote says without being opened and
 *   cannot fail on the cable; it ends `failed` with the remote as it was.
 * * `check` and `build`: the document refused by its check or its build, `refused` and as it was. These two are the
 *   document's and not the remote's, and stand in for a document that fails them.
 * * `backup`: reading what the remote holds stops part way, `failed` and as it was.
 * * `hand-over`, a Harmony Touch's: the remote stops answering while it hands its own changes up, `failed` and needing
 *   its recovery.
 * * `write`: the remote stops answering part way through the write, `failed` and needing its recovery; for flash the
 *   block being written is left erased, and the same sync run again finishes it, as on the real remote.
 * * `verify`: what the remote holds does not read back as what was written, `failed` and needing its recovery.
 * * `restart`: the restart fails, `failed` with the remote holding the new configuration, and a restart by hand asked.
 * * `read`: the next read stops answering part way, after the windows the retries allow, as `readConfig` meets it.
 *
 * A phase a model's sync does not have is never entered, so failing in it fails nothing.
 */
export type PretendFailure = SyncPhase | 'read';

/** How a pretend remote behaves. */
export interface PretendOptions {
  readonly model: RecipeModel;
  /** What it holds to begin with; absent is a remote with no setup of ours, whose configuration region is erased. */
  readonly holds?: Recipe;
  /**
   * What the configuration it holds to begin with was built from, for a model whose configuration is written into
   * flash: the moment, which every stamp in it is taken from, and a catalogue for a device `holds` names and does not
   * carry. Absent, it is built at the first moment of 2026 with no catalogue, any moment before a sync's own being as good. A sync of the same document built at the same
   * moment then has nothing to write, and one built at another moment writes the blocks the stamps are in, as a remote
   * on the cable does.
   */
  readonly heldSources?: BuildSources;
  /** Fail the next sync or read where this says, and that one only, `PretendFailure`. */
  readonly failIn?: PretendFailure;
  /**
   * A Harmony Touch's own abort: the next sync that reaches the write is aborted by the remote, which deletes what it
   * had gathered and keeps the set it held, `failed` with the remote as it was. Once, as `failIn` is.
   */
  readonly aborts?: boolean;
  /**
   * The power source a pretend Harmony Touch reports, `usb` when absent: on any other a sync is refused before the
   * remote is acted on, in a dry run and a commit alike, with the words the real check gives.
   */
  readonly powerSource?: TouchPowerSource;
  /**
   * How long it takes over each step, in milliseconds, so a screen can be watched moving; absent or 0 answers at once,
   * which is what a test wants. A number the caller picks: it is no measurement of any remote.
   */
  readonly stepMs?: number;
}

/**
 * A read of a pretend remote, as `readConfig` takes one: the reader its commands go to, and the profile of the
 * remote's model, which says where its configuration starts. `readConfig(read.reader, read.profile, options)` then
 * reads it as it reads a remote on the cable, with the same progress, the same checks and the same failures.
 */
export interface PretendRead {
  readonly reader: ConfigReader;
  readonly profile: RemoteProfile;
}

// ---------------------------------------------------------------------------------------------------
// What every sync shares: the events, the phases before anything is opened, and the two mappings
// ---------------------------------------------------------------------------------------------------

/**
 * The words a person is told, once, for every path. Stated once here so that the pretend remote and an attached one
 * cannot drift apart in what they ask of a person.
 */
const ATTENTION = {
  'do-not-unplug': 'Leave the remote on its cable until the sync says it is done.',
  restarting: 'The remote restarts and is away from the cable for a moment.',
  'safe-to-unplug': 'The remote can be unplugged.',
  'restart-by-hand': 'Take the batteries out of the remote and put them back.',
} as const satisfies Readonly<Record<SyncAttention, string>>;

/** What a thrown value says, as a sentence. */
const said = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** The first of a list of problems and how many more there are, as one sentence. */
const firstOf = (list: readonly string[], noun: 'problem' | 'reason', of: string): string => {
  const more = list.length - 1;
  return `${list[0]!}${more === 0 ? '' : `, and ${more} more ${more === 1 ? noun : `${noun}s`} ${of} lists`}`;
};

/**
 * How one sync reports, whichever path it takes: its events, its own lines in the journal, the phase it is in, and how
 * it ends. One of these per sync, so that every path emits, journals and ends the same way.
 */
interface Reporter {
  /** A line of the sync's own, under the path's prefix: `sync: ` on the cable, the pretend remote's name otherwise. */
  readonly say: (line: string) => void;
  /** A line a write path reports itself, into the journal as it comes. */
  readonly log: (line: string) => void;
  readonly emit: (event: SyncEvent) => void;
  readonly enter: (phase: SyncPhase) => void;
  /** The phase last entered, undefined before the first. */
  readonly phase: () => SyncPhase | undefined;
  readonly end: (outcome: SyncOutcome) => SyncOutcome;
  readonly refused: (message: string) => SyncOutcome;
  readonly stopped: (before: string) => SyncOutcome;
  /** Whether a stop has been asked, read afresh each time since it can be asked at any moment. */
  readonly asked: () => boolean;
}

function reporterOf(request: SyncRequest, say: (line: string) => void, log: (line: string) => void): Reporter {
  // An observer never stops a sync: a screen that throws between an erase and its write must not be what leaves a
  // remote without a configuration, nor, once a Touch's hand over has begun, a sync marked running on it, so what it
  // throws is dropped, as the write path drops its own observer's. The pretend remote drops it too, so a screen that
  // throws is met the same way with nothing attached.
  const emit = (event: SyncEvent): void => {
    try {
      request.onEvent(event);
    } catch {
      // Dropped on purpose.
    }
  };
  let current: SyncPhase | undefined;
  const end = (outcome: SyncOutcome): SyncOutcome => {
    say(`${outcome.result}, the remote ${outcome.remote}${outcome.message === undefined ? '' : `: ${outcome.message}`}`);
    emit({ kind: 'outcome', outcome });
    return outcome;
  };
  return {
    say,
    log,
    emit,
    enter: (next) => {
      current = next;
      say(next);
      emit({ kind: 'phase', phase: next });
    },
    phase: () => current,
    end,
    refused: (message) => end({ result: 'refused', remote: 'as-before', message }),
    stopped: (before) => end({ result: 'stopped', remote: 'as-before', message: `stopped before ${before}, with nothing written` }),
    asked: () => request.stop?.aborted === true,
  };
}

/**
 * The `identify` phase: whether the document is for the remote, by the skin the remote reports without being opened.
 * The skin a document is for is asked the way its path asks it, `recipeTarget` for a model whose configuration is
 * written into flash and the registry's choice for one given documents, `recipeTarget` refusing the latter. Undefined
 * where it is; the outcome to end with where it is not or a stop was asked.
 */
function identify(r: Reporter, document: Recipe, documents: boolean, reported: number | undefined): SyncOutcome | undefined {
  if (r.asked()) return r.stopped('identify');
  r.enter('identify');
  let skin: number;
  try {
    skin = documents ? chooseByModel(document.model).skin : recipeTarget(document).skin;
  } catch (error) {
    return r.refused(said(error));
  }
  if (reported !== skin) {
    return r.refused(`the document is for a ${document.model.name}, skin ${skin}, and the remote on the cable reports ${reported === undefined ? 'no skin' : `skin ${reported}`}`);
  }
  return undefined;
}

/**
 * The `check` and `build` phases, the same for every path: the document's check, refused on its first error with the
 * count of the rest, and the build from the request's sources. `inject` lets the pretend remote stand in for a document
 * that fails either; an attached sync passes none.
 */
function checkAndBuild(
  r: Reporter, request: SyncRequest, inject?: (phase: 'check' | 'build') => string | undefined,
): { readonly built: Built } | { readonly outcome: SyncOutcome } {
  const { document } = request;
  if (r.asked()) return { outcome: r.stopped('check') };
  r.enter('check');
  const checkFails = inject?.('check');
  if (checkFails !== undefined) return { outcome: r.refused(checkFails) };
  let errors: ReturnType<typeof recipe.check>;
  try {
    errors = recipe.check(document).filter((one) => one.severity === 'error');
  } catch (error) {
    return { outcome: r.refused(said(error)) };
  }
  if (errors.length > 0) return { outcome: r.refused(firstOf(errors.map((one) => one.message), 'problem', 'the check')) };

  if (r.asked()) return { outcome: r.stopped('build') };
  r.enter('build');
  const buildFails = inject?.('build');
  if (buildFails !== undefined) return { outcome: r.refused(buildFails) };
  try {
    return { built: buildFromRecipe(document, request.sources) };
  } catch (error) {
    // Every refusal of a build is the document's or the sources', and nothing has touched the remote.
    return { outcome: r.refused(said(error)) };
  }
}

/**
 * A write into flash as the sync sees it: called with the observer of its steps, it resolves with how the write ended
 * and the blocks it wrote or would write, or throws as `writeConfiguration` throws, `ConfigWriteStopped` for a stop it
 * honoured, `ConfigWriteRefusal` or `RailError` for a refusal, anything else for a failure.
 */
type FlashWrite = (onStep: (at: ConfigWriteStep) => void) => Promise<{
  readonly outcome: ConfigWriteResult['outcome'];
  readonly blocks: readonly number[];
}>;

/**
 * From the build on, for a configuration written into flash: the write's steps turned into phases and progress, and
 * how it ended into the outcome.
 *
 * **Which phase a failure is in decides what the remote is left as**, and that is tracked by the steps the write
 * itself reports: before its first command that changes the remote, the remote is as it was; from there until the
 * whole configuration has read back, it holds a part of each, and the same sync run again is the way out, since
 * the write recognises its own interrupted blocks; after that it holds the new configuration and only the restart
 * is owed.
 */
async function intoFlash(r: Reporter, request: SyncRequest, write: FlashWrite): Promise<SyncOutcome> {
  // What the write reports, turned into phases and progress. `began` and `verified` are what a failure is judged by.
  let began = false;
  let verified = false;
  const onStep = (at: ConfigWriteStep): void => {
    if (at.step === 'identified') {
      r.say(`the remote on the cable is ${at.unit}`);
    } else if (at.step === 'comparing') {
      if (r.phase() !== 'backup') r.enter('backup');
      r.emit({ kind: 'progress', phase: 'backup', done: at.done, total: at.total });
    } else if (at.step === 'writing') {
      if (at.done === 0) {
        began = true;
        r.emit({ kind: 'attention', attention: 'do-not-unplug', message: ATTENTION['do-not-unplug'] });
        r.enter('write');
      } else {
        r.emit({ kind: 'progress', phase: 'write', done: at.done, total: at.total });
      }
    } else if (at.step === 'verifying') {
      r.enter('verify');
    } else {
      verified = true;
      r.emit({ kind: 'attention', attention: 'restarting', message: ATTENTION.restarting });
      r.enter('restart');
    }
  };

  if (r.asked()) return r.stopped('the remote was opened');
  try {
    const result = await write(onStep);
    if (result.outcome === 'nothing to write') return r.end({ result: 'nothing-to-write', remote: 'as-before', message: 'the remote already holds this configuration' });
    if (result.outcome === 'dry run') {
      return r.end({
        result: 'dry-run', remote: 'as-before',
        message: `everything up to the write was done, and ${result.blocks.length} ${result.blocks.length === 1 ? 'block' : 'blocks'} would be written`,
      });
    }
    r.emit({ kind: 'attention', attention: 'safe-to-unplug', message: ATTENTION['safe-to-unplug'] });
    return r.end({ result: 'written', remote: 'new-configuration' });
  } catch (error) {
    if (error instanceof ConfigWriteStopped) return r.stopped('the write');
    if (!began) {
      // Nothing that changes the remote was sent: a refusal of the write or of a rail, or a read that failed.
      const result = error instanceof ConfigWriteRefusal || error instanceof RailError ? 'refused' : 'failed';
      return r.end({ result, remote: 'as-before', message: said(error) });
    }
    if (verified) {
      r.emit({ kind: 'attention', attention: 'restart-by-hand', message: ATTENTION['restart-by-hand'] });
      return r.end({ result: 'failed', remote: 'new-configuration', message: `the configuration is written and read back, and the restart failed: ${said(error)}` });
    }
    return r.end({
      result: 'failed', remote: 'needs-recovery',
      message: `the write stopped part way: ${said(error)}. Leave the remote on its cable with its batteries in and run the same sync again, built at the same moment, which finishes the blocks it left`,
    });
  }
}

/**
 * The two lines of the answerer's account that move a screen on, out of `SYNC_LINES`, its own list of every line it
 * reports: the hand over starting, the first request that acts on the remote, and the sync started. Taken from the
 * list rather than typed again, and `sync-attached-touch.test.ts` holds that each is still one of its forms and that
 * the events follow it.
 */
const HANDING_OVER = SYNC_LINES.find((form) => form.test('sync: handing over the remote\'s changes'))!;
const STARTED = SYNC_LINES.find((form) => form.test('sync: started'))!;

/** The dry run's words for a set of documents, the same for every path. */
const documentsDryRun = (documents: number, pictures: number): string =>
  `everything before the remote is acted on was done, and the set holds ${documents} ${documents === 1 ? 'document' : 'documents'} `
  + `and ${pictures} ${pictures === 1 ? 'picture' : 'pictures'}`;

/** What a sync delivered as documents needs from its path, once the set is made and has passed the gate. */
interface DocumentDelivery {
  /** A dry run's one read: the remote's power source, opened for and closed again; throws as the open or the read does. */
  readonly powerSource: () => Promise<TouchPowerSource>;
  /**
   * What a commit does before the remote is opened, the flags, the folder and the set kept: a refusal, or undefined.
   * What it throws, a keeper whose folder or keep fails, ends the sync `failed` with the remote as it was.
   */
  readonly beforeCommit: () => string | undefined;
  /** The answered sync, its account reported line by line; throws only before anything acts, as `answerTouchSync`. */
  readonly answer: (report: (line: string) => void) => Promise<TouchSyncOutcome>;
}

/**
 * From the gate on, for a remote given documents: a dry run's power source, and a commit's answered sync, whose
 * account becomes the events and whose outcome becomes the sync's.
 *
 * **A dry run reads the remote's power source and ends**, refusing on any source but `usb` as a commit would, since a
 * dry run exists to say up front whether a commit would go through. **A stop is honoured up to the moment the remote
 * is opened, and never after**: the answerer takes no stop, so once it is called the sync runs to its end.
 *
 * **What the outcome says**, `SyncOutcome`'s header: `written` once the remote committed and finished; a refusal
 * before the remote was acted on `refused` and `as-before`, a power source but `usb` among them; one after it `failed`
 * and `needs-recovery`, with the recovery order and the abort's cost in the message; the remote's own abort `failed`
 * and `as-before`. A throw out of the answer is always before anything acts: a rail's refusal is `refused`, anything
 * else, the open or the session failing, `failed`, and either `as-before`.
 */
async function deliverDocuments(
  r: Reporter, request: SyncRequest, counts: { readonly documents: number; readonly pictures: number }, path: DocumentDelivery,
): Promise<SyncOutcome> {
  if (!request.commit) {
    // The power source, the one thing a dry run reads off the remote: a read, closed again before the dry run ends.
    if (r.asked()) return r.stopped('the remote was opened');
    let source: TouchPowerSource;
    try {
      source = await path.powerSource();
    } catch (error) {
      // Nothing that acts was sent: the open or the read failed, or the guard refused it.
      return r.end({ result: error instanceof RailError ? 'refused' : 'failed', remote: 'as-before', message: said(error) });
    }
    r.say(`power source, ${describePowerSource(source)}`);
    const unpowered = touchPowerRefusal(source);
    if (unpowered !== undefined) return r.refused(unpowered);
    return r.end({ result: 'dry-run', remote: 'as-before', message: documentsDryRun(counts.documents, counts.pictures) });
  }

  // The last moment a stop is honoured, the header says why.
  if (r.asked()) return r.stopped('the remote was opened');
  // A keeper that cannot make its folder or keep the set fails before anything is opened, and an application learns
  // of it through the outcome as of every other failure, never as a throw out of `syncDocument`; the same as the
  // keeper of a write into flash, whose keep runs inside the write `intoFlash` catches.
  let before: string | undefined;
  try {
    before = path.beforeCommit();
  } catch (error) {
    return r.end({ result: error instanceof RailError ? 'refused' : 'failed', remote: 'as-before', message: said(error) });
  }
  if (before !== undefined) return r.refused(before);

  /** The answerer's account: every line into the journal, and the two that move a screen on, into events. */
  const report = (line: string): void => {
    r.log(line);
    if (HANDING_OVER.test(line)) {
      // From the hand over on, the remote has been acted on: a cable pulled now can leave a sync marked running.
      r.emit({ kind: 'attention', attention: 'do-not-unplug', message: ATTENTION['do-not-unplug'] });
      r.enter('hand-over');
    } else if (STARTED.test(line)) {
      r.enter('write');
    }
  };
  let outcome: TouchSyncOutcome;
  try {
    outcome = await path.answer(report);
  } catch (error) {
    // Every throw of the answer is before anything that acts on the remote was sent.
    return r.end({ result: error instanceof RailError ? 'refused' : 'failed', remote: 'as-before', message: said(error) });
  }
  if (outcome.ending === 'finished') {
    r.emit({ kind: 'attention', attention: 'safe-to-unplug', message: ATTENTION['safe-to-unplug'] });
    return r.end({ result: 'written', remote: 'new-configuration' });
  }
  if (outcome.ending === 'aborted') {
    // The remote's own abort deletes the set it was gathering and reloads the one it held before it is queued,
    // `reference/architectures/harmony-touch/answering-a-sync.md` "How a sync aborts", so nothing is left running.
    r.emit({ kind: 'attention', attention: 'safe-to-unplug', message: ATTENTION['safe-to-unplug'] });
    return r.end({ result: 'failed', remote: 'as-before', message: 'the remote aborted the sync, deleted what it had gathered and kept the set it held' });
  }
  const reason = outcome.reason ?? 'no reason given';
  if (!outcome.acted) return r.refused(reason);
  return r.end({
    result: 'failed', remote: 'needs-recovery',
    message: `${reason}. Recovery: ${outcome.recovery ?? 'none stated'}. ${outcome.abortCost ?? ''}`.trimEnd(),
  });
}

/**
 * The set a build of documents is delivered as, through the answerer's gate, `touchSetOf`; the outcome where the gate
 * refuses it, with nothing opened, as the answerer would refuse it with nothing sent.
 */
function setOf(r: Reporter, built: Extract<Built, { kind: 'documents' }>, addresses: Readonly<Record<string, string>>): TouchSet | SyncOutcome {
  const made = touchSetOf(built, addresses);
  if ('refusals' in made) return r.refused(firstOf(made.refusals, 'reason', 'the gate'));
  r.say(`built ${Object.keys(built.documents).length} documents and ${built.pictures.length} pictures, `
    + `a set of ${made.set.answers.length} answers the gate passes`);
  return made.set;
}

// ---------------------------------------------------------------------------------------------------
// The pretend remote
// ---------------------------------------------------------------------------------------------------

/** What `pretendRemote` keeps for a pretend remote, apart from the object an application holds. */
interface PretendState {
  holds: Recipe | undefined;
  failIn: PretendFailure | undefined;
  aborts: boolean;
  readonly powerSource: TouchPowerSource;
  readonly stepMs: number;
  /** The skin it reports without being opened, as a remote on the cable reports it in its release word. */
  readonly skin: number;
  /** Its model's architecture, which says how large an erase block is and where a read finds the configuration. */
  readonly architecture: number | undefined;
  /** Its configuration region from the region's base, whole blocks where it was written; undefined is erased. */
  region: Uint8Array | undefined;
}

/** Every pretend remote made here, by its object: what tells one made by `pretendRemote` from one put together. */
const PRETEND = new WeakMap<PretendRemote, PretendState>();

/** The state of a pretend remote made here, or a refusal of one put together by hand. */
function stateOf(remote: PretendRemote): PretendState {
  const state = PRETEND.get(remote);
  if (state === undefined) throw new TypeError('a pretend remote comes through pretendRemote: this one was put together by hand');
  return state;
}

/** The moment a pretend remote's first configuration is built at, where `PretendOptions.heldSources` names none. */
const PRETEND_HELD_AT = '2026-01-01T00:00:00';

/** A pretend remote of a model, R80. */
export function pretendRemote(options: PretendOptions): PretendRemote {
  const stepMs = options.stepMs ?? 0;
  if (!Number.isFinite(stepMs) || stepMs < 0) throw new RangeError(`a pretend remote cannot take ${String(options.stepMs)} milliseconds over a step`);
  // The model as the library knows it: a skin to report, an architecture, and the kind of family that builds for it.
  let choice: ReturnType<typeof chooseByModel>;
  try {
    choice = chooseByModel(options.model);
  } catch (error) {
    throw new RangeError(`a pretend remote is of a model the library knows: ${said(error)}`);
  }
  // What it holds to begin with, built now where its model's configuration is written into flash, so that a read
  // before any sync reads it and the first sync compares with it, as a remote on the cable is read and compared.
  let region: Uint8Array | undefined;
  if (options.holds !== undefined) {
    if (options.holds.model.name !== options.model.name) {
      throw new RangeError(`a pretend ${options.model.name} cannot hold a document for a ${options.holds.model.name}`);
    }
    if (choice.family.kind === 'compiled') {
      const built = buildFromRecipe(options.holds, options.heldSources ?? { builtAt: PRETEND_HELD_AT });
      if (built.kind === 'configuration') region = Uint8Array.from(built.bytes);
    }
  }
  const state: PretendState = {
    holds: options.holds,
    failIn: options.failIn,
    aborts: options.aborts === true,
    powerSource: options.powerSource ?? 'usb',
    stepMs,
    skin: choice.skin,
    architecture: choice.model?.architecture,
    region,
  };
  const remote: PretendRemote = { kind: 'pretend', model: options.model, holds: () => state.holds };
  PRETEND.set(remote, state);
  return remote;
}

/** One step of a pretend remote's time, `PretendOptions.stepMs`. */
const pause = async (state: PretendState): Promise<void> => {
  if (state.stepMs > 0) await new Promise<void>((resolve) => { setTimeout(resolve, state.stepMs); });
};

/**
 * What the pretend remote's stand ins throw when told to fail, each worded as the real path's own failure there is
 * worded once it reaches the outcome: a remote that does not answer, a read back that differs, a restart not taken.
 */
const PRETEND_FAILS = {
  identify: 'the remote did not answer when it was asked which unit it is',
  backup: 'the remote stopped answering while what it holds was read',
  write: 'the remote stopped answering',
  verify: 'what the remote holds does not read back as what was written',
  restart: 'the remote did not take the restart',
  check: 'the document was refused by its check',
  build: 'the document could not be built',
} as const;

/** Made up addresses for a pretend Harmony Touch's set, one per configuration document, each keyed by its name. */
const PRETEND_ADDRESSES: Readonly<Record<string, string>> = Object.fromEntries(
  harmonyTouch.CONFIGURATION_DOCUMENTS.map((name) => [name, `harmony://pretend/${name}`]),
);

/**
 * The pretend remote's write into flash, in `writeConfiguration`'s steps and order: asked which unit it is, every block
 * that differs read and compared, nothing to write where none differs, a dry run ended there, a stop honoured there and
 * nowhere later, then the blocks erased and written one by one, the whole read back and the restart. **The blocks are
 * the real write's**, `blocksDiffering` over what it holds and what was built, at its model's erase block size, so a
 * screen's counts are the counts a remote on the cable would give for the same two configurations.
 */
function pretendFlashWrite(
  state: PretendState, request: SyncRequest, bytes: Uint8Array, failIn: PretendFailure | undefined, name: string,
): FlashWrite {
  return async (onStep) => {
    await pause(state);
    if (failIn === 'identify') throw new Error(PRETEND_FAILS.identify);
    onStep({ step: 'identified', unit: `a pretend ${name}` });
    // Every model a document is synced into flash for has a write target, `CONFIG_WRITE_MODELS`; the refusal is
    // `writeConfiguration`'s own for an architecture with none.
    const blockSize = ERASE_BLOCK_SIZE[state.architecture ?? -1];
    if (blockSize === undefined) throw new ConfigWriteRefusal(`architecture ${String(state.architecture)} has no write target`);
    const held = state.region ?? new Uint8Array(0);
    const length = Math.ceil(Math.max(held.length, bytes.length) / blockSize) * blockSize;
    // What it holds, in whole blocks, erased past its end; and what it should hold, the new configuration over it.
    const region = new Uint8Array(length).fill(0xff);
    region.set(held, 0);
    const target = Uint8Array.from(region);
    target.set(bytes, 0);
    const blocks = blocksDiffering(region, target, 0, blockSize);
    if (blocks.length === 0) return { outcome: 'nothing to write', blocks };
    for (let done = 1; done <= blocks.length; done += 1) {
      await pause(state);
      // A read that stops part way, at the block half way through, before it is reported compared, as the real write
      // reports a block only once it is read. With one block to compare, no block is reported and the failure shows
      // after the build, as it does on the cable.
      if (failIn === 'backup' && done === Math.ceil(blocks.length / 2)) throw new Error(PRETEND_FAILS.backup);
      onStep({ step: 'comparing', done, total: blocks.length });
    }
    if (!request.commit) return { outcome: 'dry run', blocks };
    // The one point a stop is honoured, as in the real write: every block compared and nothing changed.
    if (request.stop?.aborted === true) throw new ConfigWriteStopped('stopped before anything was written');
    onStep({ step: 'writing', done: 0, total: blocks.length });
    // From the first erase the remote holds no document of ours whole until the write is read back.
    state.region = region;
    state.holds = undefined;
    const failAt = failIn === 'write' ? Math.floor(blocks.length / 2) : -1;
    for (const [k, block] of blocks.entries()) {
      await pause(state);
      region.fill(0xff, block, block + blockSize);
      // The block erased and not written, which the same sync run again finishes.
      if (k === failAt) throw new Error(PRETEND_FAILS.write);
      region.set(target.subarray(block, block + blockSize), block);
      onStep({ step: 'writing', done: k + 1, total: blocks.length });
    }
    onStep({ step: 'verifying' });
    await pause(state);
    if (failIn === 'verify') {
      // What reads back differs: the last block written reads erased, so a sync run again writes it.
      const last = blocks.at(-1)!;
      region.fill(0xff, last, last + blockSize);
      throw new Error(PRETEND_FAILS.verify);
    }
    state.holds = request.document;
    onStep({ step: 'restarting' });
    await pause(state);
    if (failIn === 'restart') throw new Error(PRETEND_FAILS.restart);
    return { outcome: 'written', blocks };
  };
}

/**
 * The pretend remote's answered sync, in `answerTouchSync`'s order and lines, each one of `SYNC_LINES`: the open, the
 * gate's line, the power source and its refusal, the provisioning, the hand over, the sync started, every list of the
 * set answered, and the finish; a failure after the remote was acted on carries `RECOVERY` and the abort's cost as
 * the answerer words them, `abortCost`.
 */
function pretendAnswer(
  state: PretendState, request: SyncRequest, set: TouchSet, failIn: PretendFailure | undefined, aborts: boolean,
): DocumentDelivery {
  /** A refusal once the remote was acted on, as `syncTouch` ends one. */
  const actedAndStopped = (report: (line: string) => void, stage: 'hand over' | 'sync', lists: number, answered: number): TouchSyncOutcome => {
    const reason = `the run stopped on an error: ${PRETEND_FAILS.write}`;
    const cost = abortCost(stage, []);
    report(`sync: refused, ${reason}`);
    report(`sync: recovery, ${RECOVERY}`);
    report(`sync: recovery, ${cost}`);
    return { ending: 'refused', reason, acted: true, recovery: RECOVERY, abortCost: cost, lists, answered, handedUp: [] };
  };
  return {
    powerSource: async () => {
      await pause(state);
      if (failIn === 'identify') throw new Error(PRETEND_FAILS.identify);
      return state.powerSource;
    },
    beforeCommit: () => undefined,
    answer: async (report) => {
      await pause(state);
      if (failIn === 'identify') throw new Error(PRETEND_FAILS.identify);
      const gate = prepareSet(set);
      if ('refusals' in gate) throw new Error(gate.refusals[0]);
      report(`sync: gate passed, ${gate.set.entries.size} answers, ${gate.set.tags.stated} tags stated and ${gate.set.tags.ours} ours`);
      report(`sync: power source, ${describePowerSource(state.powerSource)}`);
      const unpowered = touchPowerRefusal(state.powerSource);
      if (unpowered !== undefined) {
        report(`sync: refused, ${unpowered}`);
        return { ending: 'refused', reason: unpowered, acted: false, lists: 0, answered: 0, handedUp: [] };
      }
      report('sync: provisioned, mode 0');
      report('sync: handing over the remote\'s changes');
      await pause(state);
      if (failIn === 'hand-over') return actedAndStopped(report, 'hand over', 0, 0);
      report('sync: hand over, request list 1, 1 answered');
      report('sync: started');
      await pause(state);
      if (aborts) {
        report('sync: request list 1, 1 answered');
        report('sync: aborted');
        return { ending: 'aborted', acted: true, lists: 1, answered: 1, handedUp: [] };
      }
      if (failIn === 'write') return actedAndStopped(report, 'sync', 0, 0);
      // The lists a remote that holds none of the set asks: its documents, then its pictures, then the finish.
      const lists = [
        set.answers.filter((a) => a['body-type'] === 'application/json').length,
        set.answers.filter((a) => a['body-type'] === 'image/png').length,
        1,
      ].filter((n) => n > 0);
      for (const [k, n] of lists.entries()) {
        await pause(state);
        report(`sync: request list ${k + 1}, ${n} answered`);
      }
      report('sync: finished');
      state.holds = request.document;
      return { ending: 'finished', acted: true, lists: lists.length, answered: lists.reduce((a, b) => a + b, 0), handedUp: [] };
    },
  };
}

/**
 * A sync to a pretend remote: the document checked and built for real, and handed to the stage every path shares
 * with a stand in for the model's write path, `pretendFlashWrite` or `pretendAnswer`, so the events and the outcome are
 * derived as an attached sync's are. Its own lines go into the journal under the pretend remote's name, so a journal
 * never reads as a record of a remote that was there.
 */
async function syncPretend(request: SyncRequest, remote: PretendRemote, documents: boolean): Promise<SyncOutcome> {
  const state = stateOf(remote);
  const { document, journal } = request;
  // One failure asked for is one failure: the sync after it runs as any other. A failure of the next read is the
  // read's, and stays for it.
  const failIn = state.failIn === 'read' ? undefined : state.failIn;
  if (state.failIn !== 'read') state.failIn = undefined;
  const aborts = state.aborts;
  state.aborts = false;
  const log = (line: string): void => journal(`pretend ${remote.model.name}: ${line}`);
  const r = reporterOf(request, log, log);

  const refusedAtIdentify = identify(r, document, documents, state.skin);
  if (refusedAtIdentify !== undefined) return refusedAtIdentify;
  const made = checkAndBuild(r, request, (phase) => (failIn === phase ? PRETEND_FAILS[phase] : undefined));
  if ('outcome' in made) return made.outcome;
  const { built } = made;

  if (built.kind === 'configuration') {
    r.say(`built a configuration of ${built.bytes.length} bytes for skin ${built.skin}, stamped ${request.sources.builtAt}`);
    return intoFlash(r, request, pretendFlashWrite(state, request, built.bytes, failIn, remote.model.name));
  }
  const set = setOf(r, built, PRETEND_ADDRESSES);
  if (!('answers' in set)) return set;
  return deliverDocuments(r, request, { documents: Object.keys(built.documents).length, pictures: built.pictures.length },
    pretendAnswer(state, request, set, failIn, aborts));
}

/**
 * A read of a pretend remote, R80: what `readConfig` takes, a reader and the profile of the remote's model, served
 * from what the pretend remote holds. The read itself is `readConfig`'s, so its progress, its retries and its checks
 * are a real read's; a remote holding none of ours reads as erased and is refused by the same check as a remote that
 * holds no configuration. Refused, as `profileFor` refuses a product id, for a model the read of a configuration does
 * not serve: a Harmony Touch, whose documents no entry reads yet, and the Harmony 300 and 350.
 */
export function pretendReader(remote: PretendRemote): PretendRead {
  const state = stateOf(remote);
  const profile = PROFILES.find((one) => one.architecture === state.architecture);
  if (profile === undefined) {
    throw new ReadError(`no config base known for the ${remote.model.name}. Known: ${PROFILES.map((one) => one.model).join(', ')}`);
  }
  /** Where a read told to fail stops answering: half way into the configuration, past the windows before it. */
  let failsFrom: number | undefined;
  const reader: ConfigReader = {
    getVersion: async () => {
      await pause(state);
      // The first command of every read: a failure asked for the next read is this read's.
      if (state.failIn === 'read') {
        state.failIn = undefined;
        failsFrom = Math.floor((state.region?.length ?? 0) / 2);
      }
      return encodeVersionBlock({ architecture: state.architecture!, skin: state.skin });
    },
    readFlash: async (address, count) => {
      await pause(state);
      const at = address - profile.configBase;
      // A window that is never answered, in the words the command layer gives silence, so the read asks again as
      // often as it does on the cable and then gives up.
      if (failsFrom !== undefined && at > 0 && at + count > failsFrom) throw new Error(`flash read returned 0 of ${count} bytes`);
      const out = new Uint8Array(count).fill(0xff);
      const held = state.region;
      if (held !== undefined && at < held.length) out.set(held.subarray(Math.max(0, at), Math.min(held.length, at + count)), 0);
      return out;
    },
  };
  return { reader, profile };
}

// ---------------------------------------------------------------------------------------------------
// A remote on the cable
// ---------------------------------------------------------------------------------------------------

/**
 * A sync to an attached remote whose configuration is written into flash: the document checked and built, and the
 * configuration written by `writeConfiguration`, whose steps become the events through `intoFlash`.
 */
async function syncAttached(request: SyncRequest, remote: AttachedRemote): Promise<SyncOutcome> {
  const { document, journal } = request;
  const r = reporterOf(request, (line) => journal(`sync: ${line}`), journal);

  // Which model is on the cable, as far as its enumeration says: the skin a remote reports without being opened.
  // Which unit it is, is read off the remote by the write, after every check that needs no remote has passed.
  const refusedAtIdentify = identify(r, document, false, remote.found.release === undefined ? undefined : skinId(remote.found.release));
  if (refusedAtIdentify !== undefined) return refusedAtIdentify;
  // The keeper has to hold what a flash write needs: a keeper of a remote that asks for documents holds no region read
  // and no records of these units, and handing it on would fail inside the write for a reason nobody named.
  const keeper = remote.keeper;
  if (keeper.kind !== 'compiled') {
    return r.refused(`the remote on the cable is a ${document.model.name}, whose configuration is written into flash, and its keeper `
      + 'holds what a sync of a remote that asks for documents needs, not the region read and unit records a write into flash compares with');
  }

  const made = checkAndBuild(r, request);
  if ('outcome' in made) return made.outcome;
  const { built } = made;
  if (built.kind !== 'configuration') return r.refused(`the ${document.model.name} is given documents, which this path does not write`);
  r.say(`built a configuration of ${built.bytes.length} bytes for skin ${built.skin}, stamped ${request.sources.builtAt}`);

  return intoFlash(r, request, async (onStep) => {
    // What the remote is given is kept first, before a committed write opens anything. A keep that throws is caught
    // by `intoFlash` before the write began, so the sync ends `failed` with the remote as it was and nothing opened,
    // as a Harmony Touch's keeper that fails does, `deliverDocuments`.
    if (request.commit) keeper.keep(built.bytes);
    return writeConfiguration({
      config: { name: `the configuration built for ${document.model.name}`, bytes: built.bytes },
      region: keeper.region,
      units: keeper.units,
      records: keeper.records,
      // The build stamped it, `BuildSources.builtAt`, and the same document built again at the same moment is the
      // same bytes, so a run after a stop writes what this one was writing.
      stamp: { kind: 'as-is' },
      commit: request.commit,
      invalidate: true,
      restart: true,
      open: keeper.open ?? (async () => ({
        remote: new HarmonyRemote(await openHarmony({
          productId: remote.found.productId, ...(remote.found.path === undefined ? {} : { path: remote.found.path }),
        })),
        productId: remote.found.productId,
      })),
      // Never called, since nothing is stamped here; what is written was kept above.
      saveStamped: keeper.keep,
      say: journal,
      onStep,
      ...(request.stop === undefined ? {} : { stop: request.stop }),
    });
  });
}

/**
 * The models a sync answers through `answerTouchSync`: the Harmony Touch, which the request rail serves for a sync,
 * skin 99. The Harmony Elite runs the same image and its request channel carries reads alone, decision 36, so it is
 * not here, and is refused by its skin besides.
 */
const TOUCH_SYNC_MODELS: readonly string[] = ['Harmony Touch'];

/**
 * A sync to an attached Harmony Touch: the document checked and built, the set its documents are delivered as made
 * and passed through the gate, and the set answered by `answerTouchSync`, whose account becomes the events through
 * `deliverDocuments`.
 *
 * **The order**, each refusal before anything is opened ending `refused` with the remote as it was: the model the
 * remote enumerates as, by its skin, against the document's, and the keeper's kind, its unit against the library's
 * list, `identify`; the document's check, `check`; the build, which needs the account, and the set made from it at
 * the keeper's addresses with the gate over it, `build`. **A dry run then reads the remote's power source and
 * ends**: it opens the remote, reads the identity file and `/tde/powerstate` through the read only route, closes it,
 * and refuses on any source but `usb` as a commit would; it sends nothing that acts and needs no flag, which is
 * `bin/touch-sync.ts --document` without `--commit`. A commit then checks the flags, makes the keeper's folder, keeps
 * the set, and hands it to `answerTouchSync`, which opens the remote, reads its power source, compares its serial with
 * the record, refuses on any source but `usb`, reads its provisioning, and only then acts: `hand-over` from its line
 * saying so, `write` from its line saying the sync started.
 *
 * **A stop is honoured up to the moment the remote is opened, and never after.** The first request that acts is the
 * hand over, and between the open and it there are only reads, the power source, the identity file, the gate run
 * again and the provisioning read, at which a stop could in principle still be honoured; but the answerer takes no
 * stop and is not changed here, so once it is called the sync runs to its end.
 */
async function syncAttachedTouch(request: SyncRequest, remote: AttachedRemote): Promise<SyncOutcome> {
  const { document, journal } = request;
  const r = reporterOf(request, (line) => journal(`sync: ${line}`), journal);

  // The model as the remote enumerates it, by the skin in its release word, which a Harmony Touch states as 99 and the
  // Harmony Elite, on the same product id, as 111; the unit is the session's to read once the remote is opened.
  const refusedAtIdentify = identify(r, document, true, remote.found.release === undefined ? undefined : skinId(remote.found.release));
  if (refusedAtIdentify !== undefined) return refusedAtIdentify;
  const keeper = remote.keeper;
  if (keeper.kind !== 'document') {
    return r.refused(`the remote on the cable is a ${document.model.name}, which asks for its documents and is answered, and its keeper `
      + 'holds what a write into flash needs, not the unit record, the account\'s addresses and the folder an answered sync keeps');
  }
  // The library's list of units, asked now so a dry run is refused for a unit a commit would be; the same check and
  // words `answerTouchSync` asks again before it opens anything.
  try {
    assertTouchSyncUnit(keeper.label);
  } catch (error) {
    return r.refused(said(error));
  }

  const made = checkAndBuild(r, request);
  if ('outcome' in made) return made.outcome;
  const { built } = made;
  if (built.kind !== 'documents') return r.refused(`the ${document.model.name} is given a configuration, which this path does not answer`);
  // The set the documents are delivered as, at the keeper's addresses, through the answerer's gate.
  const set = setOf(r, built, keeper.addresses);
  if (!('answers' in set)) return set;

  /** Open the Touch: the keeper's way, a test's stand in, or the one found, through the file protocol's guard. */
  const openTouch = keeper.open ?? (() => openFileBasedRemote({
    productId: remote.found.productId, ...(remote.found.path === undefined ? {} : { path: remote.found.path }),
  }));
  let folder = '';
  return deliverDocuments(r, request, { documents: Object.keys(built.documents).length, pictures: built.pictures.length }, {
    powerSource: async () => {
      const transport = await openTouch();
      try {
        return await readTouchPowerSource(transport);
      } finally {
        await transport.close();
      }
    },
    beforeCommit: () => {
      // The flags, before a folder is made or the set kept: `answerTouchSync` asks the same again before it opens
      // anything, so this moves no rail; asking here leaves nothing behind for a commit that cannot run, as
      // `bin/touch-sync.ts` asks first for the same reason.
      try {
        assertTouchSyncAllowed();
      } catch (error) {
        return said(error);
      }
      folder = keeper.folder();
      const taken = touchFolderRefusal(folder);
      if (taken !== undefined) return taken;
      // What the remote is given is kept first, before anything is opened.
      keeper.keep(set);
      return undefined;
    },
    answer: (report) => answerTouchSync({
      mode: { kind: 'set', set },
      folder,
      label: keeper.label,
      permittedUnit: keeper.permittedUnit,
      open: openTouch,
      log: journal,
      report,
    }),
  });
}

/**
 * Sync a document to a remote, R79: checked, built, written by the model's own write path and, where that path reads
 * back, read back; reported as events. Resolves with the outcome, which is also the last event; a document or a remote
 * that is refused is an outcome and not a throw. Built for the Harmony One, 600, 650 and 700 and the Harmony Touch, on
 * the cable and as a pretend remote; for a document of any other model it refuses by name before anything is opened.
 */
export async function syncDocument(request: SyncRequest): Promise<SyncOutcome> {
  const remote = request.remote;
  const model = request.document.model.name;
  // The path is chosen by the document's model: a Touch's document to a Touch's path, which refuses a remote that
  // enumerates as another model, and so on for flash. Which remote is attached never chooses the path, so a document
  // is never handed to a write path that was not built for it, and a pretend remote takes the same path.
  const documents = TOUCH_SYNC_MODELS.includes(model);
  // The models `writeConfiguration` writes and a document builds for. The Harmony 885 is written by it and built
  // from no document yet, which its build says; the Harmony 300 and 350 are written by a path of their own, not
  // behind this function yet, so a pretend remote of theirs refuses as an attached one does.
  if (!documents && !Object.hasOwn(CONFIG_WRITE_MODELS, model)) {
    throw new NotBuiltError(`syncDocument for ${remote.kind === 'pretend' ? 'a pretend' : 'an attached'} ${model}`, 79);
  }
  if (remote.kind === 'pretend') return syncPretend(request, remote, documents);
  return documents ? syncAttachedTouch(request, remote) : syncAttached(request, remote);
}
