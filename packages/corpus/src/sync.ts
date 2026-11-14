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
 * **Built**: the pretend remote, and a sync to one, which checks and builds the document for real and only
 * pretends the cable; a sync to an attached remote of a model whose configuration is written into flash, the
 * Harmony One, 600, 650 and 700, through `writeConfiguration` and nothing else; and a sync to an attached Harmony
 * Touch, a remote that asks for its documents and is answered, through `answerTouchSync` and nothing else. A sync to
 * an attached remote of any other model refuses by name, `NotBuiltError`, with the requirement it waits on, before
 * anything is opened.
 *
 * **What an attached sync adds to the write path is nothing.** It checks and builds the document, hands what was
 * built to the model's write path with the keeper's records of the unit, and turns what that reports into events.
 * Which unit is on the cable, whether it may be written, every compare before an erase and every read back after a
 * write, every request a Touch is sent and every check of an answer are that path's and the rails' under it,
 * asserted where they always were.
 *
 * **Two kinds of remote, two kinds of keeper.** The contract was first written against the compiled family alone,
 * and a Harmony Touch fits it only where its sync has the same shape: the phases before anything is opened, a stop
 * honoured up to the first request that acts, and an outcome that says what the remote was left as. Where it does not,
 * the contract says so in its own types: `RemoteKeeper` is a union by the kind of family the model is chosen into,
 * plan 013 decision 1, since what a keeper holds for a flash write (a region read, the records of several units) and
 * for an answered sync (one unit's record, the account's addresses, the folder the run is kept in) have nothing in
 * common but `keep` and `open`, and those two take different things. A Touch adds one phase, `hand-over`, and reports
 * no progress, since nothing it reports gives a total; the pretend remote of a document model reports the same.
 */
import {
  buildFromRecipe, chooseByModel, NotBuiltError, recipe, recipeTarget,
  type BuildSources, type Built, type Recipe, type RecipeModel,
} from '@harmony/codec/node';
import { harmonyTouch } from '@harmony/codec/build';
import {
  HarmonyRemote, openFileBasedRemote, openHarmony, RailError, readTouchPowerSource, skinId, type FoundRemote,
  type Transport,
} from '@harmony/usb';
import {
  CONFIG_WRITE_MODELS, ConfigWriteRefusal, ConfigWriteStopped, writeConfiguration,
  type ConfigWriteStep, type ConfigWriteUnit, type UnitRecords,
} from './writeconfig.ts';
import {
  SYNC_LINES, answerTouchSync, assertTouchSyncAllowed, assertTouchSyncUnit, describePowerSource, touchFolderRefusal,
  touchPowerRefusal, touchSetOf, type TouchSet, type TouchSyncOutcome,
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
  readonly result:
    // The remote holds the document's configuration: read back and equal, or, on a Harmony Touch, committed by it.
    | 'written'
    // The remote already held it.
    | 'nothing-to-write'
    // Everything up to the first write was done and nothing was sent, `commit` being false.
    | 'dry-run'
    // A stop was asked and honoured.
    | 'stopped'
    // A check or a rail refused before anything was written.
    | 'refused'
    // Something went wrong on the cable or in the remote; `remote` says what that left.
    | 'failed';
  /** The remote as the sync left it: untouched, holding the new configuration, or needing its recovery route. */
  readonly remote: 'as-before' | 'new-configuration' | 'needs-recovery';
  /** Why, in a sentence, for every result but `written`. */
  readonly message?: string;
}

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
 * A remote that is not there, R80: it answers a sync with the phases, the progress and the warnings a sync has,
 * and it can be told to fail, so an application's every screen can be built and tried with nothing attached. It
 * holds whatever was last synced to it, for as long as the object lives. Made by `pretendRemote` and by nothing
 * else: an object put together to look like one is refused.
 */
export interface PretendRemote {
  readonly kind: 'pretend';
  readonly model: RecipeModel;
  /** The document last synced to it, or the one it was made with. */
  readonly holds: () => Recipe | undefined;
}

/** How a pretend remote behaves. */
export interface PretendOptions {
  readonly model: RecipeModel;
  /** What it holds to begin with; absent is a remote with no setup of ours. */
  readonly holds?: Recipe;
  /** Fail the next sync in this phase, and that one only; the outcome says what a failure there leaves. */
  readonly failIn?: SyncPhase;
  /**
   * How long it takes over each step of progress, in milliseconds, so a screen can be watched moving; absent or 0
   * answers at once, which is what a test wants. A number the caller picks: it is no measurement of any remote.
   */
  readonly stepMs?: number;
}

/** What `pretendRemote` keeps for a pretend remote, apart from the object an application holds. */
interface PretendState {
  holds: Recipe | undefined;
  failIn: SyncPhase | undefined;
  readonly stepMs: number;
}

/** Every pretend remote made here, by its object: what tells one made by `pretendRemote` from one put together. */
const PRETEND = new WeakMap<PretendRemote, PretendState>();

/** A pretend remote of a model, R80. */
export function pretendRemote(options: PretendOptions): PretendRemote {
  const stepMs = options.stepMs ?? 0;
  if (!Number.isFinite(stepMs) || stepMs < 0) throw new RangeError(`a pretend remote cannot take ${String(options.stepMs)} milliseconds over a step`);
  const state: PretendState = { holds: options.holds, failIn: options.failIn, stepMs };
  const remote: PretendRemote = { kind: 'pretend', model: options.model, holds: () => state.holds };
  PRETEND.set(remote, state);
  return remote;
}

/** The size of one step of a pretend write: an erase block of the compiled families' flash. */
const PRETEND_BLOCK = 0x10000;

/**
 * The phases a pretend sync runs after the build, by what was built, the first of them that acts on the remote, and
 * how many steps of progress each has. A configuration is written into flash, so what the remote held is read first,
 * every byte is read back and the remote restarts at the end, with progress by erase block. Documents are delivered
 * as a Harmony Touch's sync delivers them, **the same phases in the same order as `syncAttachedTouch` reports**, so a
 * screen built against the pretend remote fits the real one: the remote's own changes handed up, then the documents
 * answered until it commits, and no progress, since nothing a Touch reports gives a total. **This is the pretend
 * remote's own shape**, there for a screen to be built against, and each real path reports the phases it has.
 */
function pretendSteps(built: Built): { readonly phases: readonly SyncPhase[]; readonly acts: SyncPhase; readonly steps: number } {
  if (built.kind === 'configuration') {
    return { phases: ['backup', 'write', 'verify', 'restart'], acts: 'write', steps: Math.max(1, Math.ceil(built.bytes.length / PRETEND_BLOCK)) };
  }
  return { phases: ['hand-over', 'write'], acts: 'hand-over', steps: 0 };
}

/** What a failure leaves, which is the first thing a person has to be told. */
type Left = { readonly result: SyncOutcome['result']; readonly remote: SyncOutcome['remote']; readonly message: string };

/** What a failure in a phase leaves, for a configuration written into flash and for the phases every sync has. */
const FAILURE: Readonly<Record<SyncPhase, Left>> = {
  identify: { result: 'failed', remote: 'as-before', message: 'the remote did not answer when it was asked which remote it is' },
  check: { result: 'refused', remote: 'as-before', message: 'the document was refused by its check' },
  build: { result: 'refused', remote: 'as-before', message: 'the document could not be built' },
  backup: { result: 'failed', remote: 'as-before', message: 'reading what the remote holds stopped part way, before anything was written' },
  'hand-over': {
    result: 'failed', remote: 'needs-recovery',
    message: 'the sync stopped while the remote handed its own changes up, so it may hold a sync marked running: run its recovery, which starts with a read that says whether anything is left to clear',
  },
  write: { result: 'failed', remote: 'needs-recovery', message: 'the write stopped part way, so the remote holds a part of each configuration' },
  verify: { result: 'failed', remote: 'needs-recovery', message: 'what the remote holds does not read back as what was written' },
  restart: { result: 'failed', remote: 'new-configuration', message: 'the remote holds the new configuration and did not restart by itself' },
};

/**
 * What a failure in the write leaves on a remote that asks for documents, where it differs from flash: a Harmony
 * Touch swaps the new set in only at its commit, so a sync stopped before it leaves the set it held, and what is left
 * to clear is a sync marked running, `reference/architectures/harmony-touch/firmware.md` "A sync that stops halfway".
 */
const DOCUMENT_FAILURE: Readonly<Partial<Record<SyncPhase, Left>>> = {
  write: {
    result: 'failed', remote: 'needs-recovery',
    message: 'the sync stopped before the remote committed it, so it keeps the set it held and may hold a sync marked running: run its recovery, which starts with a read that says whether anything is left to clear',
  },
};

/** The dry run's words for a set of documents, the same for the pretend remote and an attached Harmony Touch. */
const documentsDryRun = (documents: number, pictures: number): string =>
  `everything before the remote is acted on was done, and the set holds ${documents} ${documents === 1 ? 'document' : 'documents'} `
  + `and ${pictures} ${pictures === 1 ? 'picture' : 'pictures'}`;

/** A sync to a pretend remote: the document checked and built for real, the cable pretended. */
async function syncPretend(request: SyncRequest, remote: PretendRemote): Promise<SyncOutcome> {
  const state = PRETEND.get(remote);
  if (state === undefined) throw new TypeError('a pretend remote comes through pretendRemote: this one was put together by hand');
  const { document, onEvent, journal } = request;
  // One failure asked for is one failure: the sync after it runs as any other.
  const failIn = state.failIn;
  state.failIn = undefined;
  const say = (line: string): void => journal(`pretend ${remote.model.name}: ${line}`);
  const end = (outcome: SyncOutcome): SyncOutcome => {
    say(`${outcome.result}, the remote ${outcome.remote}${outcome.message === undefined ? '' : `: ${outcome.message}`}`);
    onEvent({ kind: 'outcome', outcome });
    return outcome;
  };
  /** Which failures apply: a configuration's, or a set of documents' where the two differ, known once it is built. */
  let failures: Readonly<Partial<Record<SyncPhase, Left>>> = {};
  /** Enter a phase; the outcome to end with where this is the phase told to fail or a stop is honoured here. */
  const enter = (phase: SyncPhase, stoppable: boolean): SyncOutcome | undefined => {
    if (stoppable && request.stop?.aborted === true) {
      return { result: 'stopped', remote: 'as-before', message: `stopped before ${phase}, with nothing written` };
    }
    say(phase);
    onEvent({ kind: 'phase', phase });
    if (failIn !== phase) return undefined;
    const { result, remote: left, message } = failures[phase] ?? FAILURE[phase];
    return { result, remote: left, message };
  };
  const step = async (): Promise<void> => {
    if (state.stepMs > 0) await new Promise<void>((resolve) => { setTimeout(resolve, state.stepMs); });
  };

  let stopped = enter('identify', true);
  if (stopped !== undefined) return end(stopped);
  await step();
  // A remote takes a configuration built for its own model and no other; which model that is, a pretend remote
  // was made with and a real one reports.
  if (document.model.name !== remote.model.name
    || (document.model.skin !== undefined && remote.model.skin !== undefined && document.model.skin !== remote.model.skin)) {
    return end({ result: 'refused', remote: 'as-before', message: `the document is for a ${document.model.name} and the remote is a ${remote.model.name}` });
  }

  stopped = enter('check', true);
  if (stopped !== undefined) return end(stopped);
  let errors: ReturnType<typeof recipe.check>;
  try {
    errors = recipe.check(document).filter((one) => one.severity === 'error');
  } catch (error) {
    return end({ result: 'refused', remote: 'as-before', message: error instanceof Error ? error.message : String(error) });
  }
  if (errors.length > 0) {
    const more = errors.length - 1;
    return end({
      result: 'refused', remote: 'as-before',
      message: `${errors[0]!.message}${more === 0 ? '' : `, and ${more} more ${more === 1 ? 'problem' : 'problems'} the check lists`}`,
    });
  }

  stopped = enter('build', true);
  if (stopped !== undefined) return end(stopped);
  let built: Built;
  try {
    built = buildFromRecipe(document, request.sources);
  } catch (error) {
    // Every refusal of a build is the document's or the sources', and nothing has touched the remote.
    return end({ result: 'refused', remote: 'as-before', message: error instanceof Error ? error.message : String(error) });
  }
  if (built.kind === 'documents') {
    // The answerer's gate over the documents, which the real path runs before anything is sent: a set the codec's
    // reader and check refuse is refused here too. The addresses and the envelope are the keeper's and the set's, which
    // a pretend remote does not have, so this is the documents' half of `prepareSet`.
    const findings = harmonyTouch.refusalsBeforeASync(built.documents);
    if (findings.length > 0) {
      const more = findings.length - 1;
      // A favourites document is named by its whole address, which carries the account's identifiers: name its kind.
      const named = findings[0]!.document.includes('://') ? 'a favourites document' : findings[0]!.document;
      return end({
        result: 'refused', remote: 'as-before',
        message: `${named}: ${findings[0]!.message}${more === 0 ? '' : `, and ${more} more ${more === 1 ? 'reason' : 'reasons'} the gate lists`}`,
      });
    }
    failures = DOCUMENT_FAILURE;
  }
  say(built.kind === 'configuration' ? `built a configuration of ${built.bytes.length} bytes` : `built ${Object.keys(built.documents).length} documents and ${built.pictures.length} pictures`);

  // The remote holds this very document already: there is nothing to send it. **A configuration only**: a remote that
  // asks for documents cannot be asked what it holds by the real path, which syncs it again whatever it holds, so the
  // pretend one does too.
  if (built.kind === 'configuration' && state.holds !== undefined && JSON.stringify(state.holds) === JSON.stringify(document)) {
    return end({ result: 'nothing-to-write', remote: 'as-before', message: 'the remote already holds this document' });
  }

  const { phases, acts, steps } = pretendSteps(built);
  let writing = false;
  for (const phase of phases) {
    if (phase === acts) {
      if (!request.commit) {
        return end({
          result: 'dry-run', remote: 'as-before',
          message: built.kind === 'documents' ? documentsDryRun(Object.keys(built.documents).length, built.pictures.length)
            : `everything up to the write was done, and ${steps} ${steps === 1 ? 'part' : 'parts'} would be written`,
        });
      }
      // The last moment a stop is honoured, and the first at which the cable must stay in.
      if (request.stop?.aborted === true) {
        return end({ result: 'stopped', remote: 'as-before', message: `stopped before the ${phase === 'hand-over' ? 'hand over' : 'write'}, with nothing written` });
      }
      onEvent({ kind: 'attention', attention: 'do-not-unplug', message: ATTENTION['do-not-unplug'] });
      writing = true;
    }
    if (phase === 'restart') {
      onEvent({ kind: 'attention', attention: 'restarting', message: ATTENTION['restarting'] });
    }
    const failed = enter(phase, !writing);
    if (failed !== undefined) {
      if (phase === 'restart') {
        onEvent({ kind: 'attention', attention: 'restart-by-hand', message: ATTENTION['restart-by-hand'] });
      }
      return end(failed);
    }
    // A phase with no progress, the restart and every phase of a set of documents, takes one step and reports none.
    if (phase === 'restart' || steps === 0) {
      await step();
      continue;
    }
    for (let done = 1; done <= steps; done += 1) {
      await step();
      // A read can be given up between two steps; a write cannot, `stop` in the header.
      if (!writing && request.stop?.aborted === true) {
        return end({ result: 'stopped', remote: 'as-before', message: `stopped during ${phase}, with nothing written` });
      }
      onEvent({ kind: 'progress', phase, done, total: steps });
    }
  }
  // A dry run whose build has no write phase cannot be: every build is written. Reached with the write done.
  state.holds = document;
  onEvent({ kind: 'attention', attention: 'safe-to-unplug', message: ATTENTION['safe-to-unplug'] });
  return end({ result: 'written', remote: 'new-configuration' });
}

/** The words a person is told, once, for the pretend remote and an attached one alike. */
const ATTENTION = {
  'do-not-unplug': 'Leave the remote on its cable until the sync says it is done.',
  restarting: 'The remote restarts and is away from the cable for a moment.',
  'safe-to-unplug': 'The remote can be unplugged.',
  'restart-by-hand': 'Take the batteries out of the remote and put them back.',
} as const satisfies Readonly<Record<SyncAttention, string>>;

/**
 * A sync to an attached remote whose configuration is written into flash: the document checked and built, and the
 * configuration written by `writeConfiguration`, whose steps become the events.
 *
 * **Which phase a failure is in decides what the remote is left as**, and that is tracked by the steps the write
 * itself reports: before its first command that changes the remote, the remote is as it was; from there until the
 * whole configuration has read back, it holds a part of each, and the same sync run again is the way out, since
 * the write recognises its own interrupted blocks; after that it holds the new configuration and only the restart
 * is owed.
 */
async function syncAttached(request: SyncRequest, remote: AttachedRemote): Promise<SyncOutcome> {
  const { document, journal } = request;
  // An observer never stops a sync: a screen that throws between an erase and its write must not be what leaves a
  // remote without a configuration, so what it throws is dropped, as the write path drops its own observer's.
  const emit = (event: SyncEvent): void => {
    try {
      request.onEvent(event);
    } catch {
      // Dropped on purpose.
    }
  };
  const end = (outcome: SyncOutcome): SyncOutcome => {
    journal(`sync: ${outcome.result}, the remote ${outcome.remote}${outcome.message === undefined ? '' : `: ${outcome.message}`}`);
    emit({ kind: 'outcome', outcome });
    return outcome;
  };
  const refused = (message: string): SyncOutcome => end({ result: 'refused', remote: 'as-before', message });
  const stopped = (before: string): SyncOutcome => end({ result: 'stopped', remote: 'as-before', message: `stopped before ${before}, with nothing written` });
  const said = (error: unknown): string => (error instanceof Error ? error.message : String(error));
  /** Whether a stop has been asked, read afresh each time since it can be asked at any moment. */
  const asked = (): boolean => request.stop?.aborted === true;
  let phase: SyncPhase = 'identify';
  const enter = (next: SyncPhase): void => {
    phase = next;
    journal(`sync: ${next}`);
    emit({ kind: 'phase', phase: next });
  };

  // Which model is on the cable, as far as its enumeration says: the skin a remote reports without being opened.
  // Which unit it is, is read off the remote by the write, after every check that needs no remote has passed.
  if (asked()) return stopped('identify');
  enter('identify');
  let skin: number;
  try {
    skin = recipeTarget(document).skin;
  } catch (error) {
    return refused(said(error));
  }
  const attached = remote.found.release === undefined ? undefined : skinId(remote.found.release);
  if (attached !== skin) {
    return refused(`the document is for a ${document.model.name}, skin ${skin}, and the remote on the cable reports ${attached === undefined ? 'no skin' : `skin ${attached}`}`);
  }
  // The keeper has to hold what a flash write needs: a keeper of a remote that asks for documents holds no region read
  // and no records of these units, and handing it on would fail inside the write for a reason nobody named.
  const keeper = remote.keeper;
  if (keeper.kind !== 'compiled') {
    return refused(`the remote on the cable is a ${document.model.name}, whose configuration is written into flash, and its keeper `
      + 'holds what a sync of a remote that asks for documents needs, not the region read and unit records a write into flash compares with');
  }

  if (asked()) return stopped('check');
  enter('check');
  let errors: ReturnType<typeof recipe.check>;
  try {
    errors = recipe.check(document).filter((one) => one.severity === 'error');
  } catch (error) {
    return refused(said(error));
  }
  if (errors.length > 0) {
    const more = errors.length - 1;
    return refused(`${errors[0]!.message}${more === 0 ? '' : `, and ${more} more ${more === 1 ? 'problem' : 'problems'} the check lists`}`);
  }

  if (asked()) return stopped('build');
  enter('build');
  let built: Built;
  try {
    built = buildFromRecipe(document, request.sources);
  } catch (error) {
    return refused(said(error));
  }
  if (built.kind !== 'configuration') return refused(`the ${document.model.name} is given documents, which this path does not write`);
  journal(`sync: built a configuration of ${built.bytes.length} bytes for skin ${built.skin}, stamped ${request.sources.builtAt}`);

  // What the write reports, turned into phases and progress. `began` and `verified` are what a failure is judged by.
  let began = false;
  let verified = false;
  const onStep = (at: ConfigWriteStep): void => {
    if (at.step === 'identified') {
      journal(`sync: the remote on the cable is ${at.unit}`);
    } else if (at.step === 'comparing') {
      if (phase !== 'backup') enter('backup');
      emit({ kind: 'progress', phase: 'backup', done: at.done, total: at.total });
    } else if (at.step === 'writing') {
      if (at.done === 0) {
        began = true;
        emit({ kind: 'attention', attention: 'do-not-unplug', message: ATTENTION['do-not-unplug'] });
        enter('write');
      } else {
        emit({ kind: 'progress', phase: 'write', done: at.done, total: at.total });
      }
    } else if (at.step === 'verifying') {
      enter('verify');
    } else {
      verified = true;
      emit({ kind: 'attention', attention: 'restarting', message: ATTENTION.restarting });
      enter('restart');
    }
  };

  if (asked()) return stopped('the remote was opened');
  // What the remote is given is kept first, before a committed write opens anything.
  if (request.commit) keeper.keep(built.bytes);
  try {
    const result = await writeConfiguration({
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
    if (result.outcome === 'nothing to write') return end({ result: 'nothing-to-write', remote: 'as-before', message: 'the remote already holds this configuration' });
    if (result.outcome === 'dry run') {
      return end({
        result: 'dry-run', remote: 'as-before',
        message: `everything up to the write was done, and ${result.blocks.length} ${result.blocks.length === 1 ? 'block' : 'blocks'} would be written`,
      });
    }
    emit({ kind: 'attention', attention: 'safe-to-unplug', message: ATTENTION['safe-to-unplug'] });
    return end({ result: 'written', remote: 'new-configuration' });
  } catch (error) {
    if (error instanceof ConfigWriteStopped) return stopped('the write');
    if (!began) {
      // Nothing that changes the remote was sent: a refusal of the write or of a rail, or a read that failed.
      const result = error instanceof ConfigWriteRefusal || error instanceof RailError ? 'refused' : 'failed';
      return end({ result, remote: 'as-before', message: said(error) });
    }
    if (verified) {
      emit({ kind: 'attention', attention: 'restart-by-hand', message: ATTENTION['restart-by-hand'] });
      return end({ result: 'failed', remote: 'new-configuration', message: `the configuration is written and read back, and the restart failed: ${said(error)}` });
    }
    return end({
      result: 'failed', remote: 'needs-recovery',
      message: `the write stopped part way: ${said(error)}. Leave the remote on its cable with its batteries in and run the same sync again, built at the same moment, which finishes the blocks it left`,
    });
  }
}

/**
 * The models a sync answers through `answerTouchSync`: the Harmony Touch, which the request rail serves for a sync,
 * skin 99. The Harmony Elite runs the same image and its request channel carries reads alone, decision 36, so it is
 * not here, and is refused by its skin besides.
 */
const TOUCH_SYNC_MODELS: readonly string[] = ['Harmony Touch'];

/**
 * The two lines of the answerer's account that move a screen on, out of `SYNC_LINES`, its own list of every line it
 * reports: the hand over starting, the first request that acts on the remote, and the sync started. Taken from the
 * list rather than typed again, and `sync-attached-touch.test.ts` holds that each is still one of its forms and that
 * the events follow it.
 */
const HANDING_OVER = SYNC_LINES.find((form) => form.test('sync: handing over the remote\'s changes'))!;
const STARTED = SYNC_LINES.find((form) => form.test('sync: started'))!;

/**
 * A sync to an attached Harmony Touch: the document checked and built, the set its documents are delivered as made
 * and passed through the gate, and the set answered by `answerTouchSync`, whose account becomes the events.
 *
 * **The order**, each refusal before anything is opened ending `refused` with the remote as it was: the model the
 * remote enumerates as, by its skin, against the document's, and the keeper's kind, its unit against the library's
 * list, `identify`; the document's check, `check`; the build, which needs the account, and the set made from it at
 * the keeper's addresses with the gate over it, `build`. **A dry run then reads the remote's power source and
 * ends**: it opens the remote, reads the identity file and `/tde/powerstate` through the read only route, closes it, and refuses on any
 * source but `usb` as a commit would, since a dry run exists to say up front whether a commit would go through; it
 * sends nothing that acts and needs no flag, which is `bin/touch-sync.ts --document` without `--commit`. A commit then
 * checks the flags, makes the keeper's folder, keeps the set, and hands it to `answerTouchSync`, which opens the
 * remote, reads its power source and refuses on any but `usb`, compares its serial with the record, reads its
 * provisioning, and only then acts: `hand-over` from its line saying so, `write` from its line saying the sync
 * started.
 *
 * **A stop is honoured up to the moment the remote is opened, and never after.** The first request that acts is the
 * hand over, and between the open and it there are only reads, the power source, the identity file, the gate run
 * again and the provisioning read, at which a stop could in principle still be honoured; but the answerer takes no stop and is not
 * changed here, so once it is called the sync runs to its end. That is the last check before `answerTouchSync`.
 *
 * **What the outcome says**, `SyncOutcome`'s header: `written` once the remote committed and finished; a refusal
 * before the remote was acted on `refused` and `as-before`, a power source but `usb` among them, in a dry run and a
 * commit alike; one after it `failed` and `needs-recovery`, with the
 * recovery order and the abort's cost in the message, since those are what a person does next; and the remote's own
 * abort `failed` and `as-before`. A throw out of `answerTouchSync` is always before anything acts, its header says so:
 * a rail's refusal is `refused`, anything else, the open or the session failing, `failed`, and either `as-before`.
 */
async function syncAttachedTouch(request: SyncRequest, remote: AttachedRemote): Promise<SyncOutcome> {
  const { document, journal } = request;
  // An observer never stops a sync, as `syncAttached` argues: once the hand over has begun, a screen that throws must
  // not be what leaves a sync marked running on the remote.
  const emit = (event: SyncEvent): void => {
    try {
      request.onEvent(event);
    } catch {
      // Dropped on purpose.
    }
  };
  const end = (outcome: SyncOutcome): SyncOutcome => {
    journal(`sync: ${outcome.result}, the remote ${outcome.remote}${outcome.message === undefined ? '' : `: ${outcome.message}`}`);
    emit({ kind: 'outcome', outcome });
    return outcome;
  };
  const refused = (message: string): SyncOutcome => end({ result: 'refused', remote: 'as-before', message });
  const stopped = (before: string): SyncOutcome => end({ result: 'stopped', remote: 'as-before', message: `stopped before ${before}, with nothing written` });
  const said = (error: unknown): string => (error instanceof Error ? error.message : String(error));
  const asked = (): boolean => request.stop?.aborted === true;
  const enter = (next: SyncPhase): void => {
    journal(`sync: ${next}`);
    emit({ kind: 'phase', phase: next });
  };
  /** The first refusal of a list, and how many more there are, as a sentence. */
  const first = (refusals: readonly string[], of: string): string => {
    const more = refusals.length - 1;
    return `${refusals[0]!}${more === 0 ? '' : `, and ${more} more ${more === 1 ? 'reason' : 'reasons'} ${of} lists`}`;
  };

  if (asked()) return stopped('identify');
  enter('identify');
  // The model as the remote enumerates it, by the skin in its release word, which a Harmony Touch states as 99 and the
  // Harmony Elite, on the same product id, as 111; the unit is the session's to read once the remote is opened.
  let skin: number;
  try {
    skin = chooseByModel(document.model).skin;
  } catch (error) {
    return refused(said(error));
  }
  const attached = remote.found.release === undefined ? undefined : skinId(remote.found.release);
  if (attached !== skin) {
    return refused(`the document is for a ${document.model.name}, skin ${skin}, and the remote on the cable reports ${attached === undefined ? 'no skin' : `skin ${attached}`}`);
  }
  const keeper = remote.keeper;
  if (keeper.kind !== 'document') {
    return refused(`the remote on the cable is a ${document.model.name}, which asks for its documents and is answered, and its keeper `
      + 'holds what a write into flash needs, not the unit record, the account\'s addresses and the folder an answered sync keeps');
  }
  // The library's list of units, asked now so a dry run is refused for a unit a commit would be; the same check and
  // words `answerTouchSync` asks again before it opens anything.
  try {
    assertTouchSyncUnit(keeper.label);
  } catch (error) {
    return refused(said(error));
  }

  if (asked()) return stopped('check');
  enter('check');
  let errors: ReturnType<typeof recipe.check>;
  try {
    errors = recipe.check(document).filter((one) => one.severity === 'error');
  } catch (error) {
    return refused(said(error));
  }
  if (errors.length > 0) return refused(first(errors.map((one) => one.message), 'the check'));

  if (asked()) return stopped('build');
  enter('build');
  let built: Built;
  try {
    built = buildFromRecipe(document, request.sources);
  } catch (error) {
    return refused(said(error));
  }
  if (built.kind !== 'documents') return refused(`the ${document.model.name} is given a configuration, which this path does not answer`);
  // The set the documents are delivered as, at the keeper's addresses, through the answerer's gate: a set the gate
  // refuses is refused here with nothing opened, as the answerer would refuse it with nothing sent.
  const made = touchSetOf(built, keeper.addresses);
  if ('refusals' in made) return refused(first(made.refusals, 'the gate'));
  const set = made.set;
  journal(`sync: built ${Object.keys(built.documents).length} documents and ${built.pictures.length} pictures, `
    + `a set of ${set.answers.length} answers the gate passes`);

  /** Open the Touch: the keeper's way, a test's stand in, or the one found, through the file protocol's guard. */
  const openTouch = keeper.open ?? (() => openFileBasedRemote({
    productId: remote.found.productId, ...(remote.found.path === undefined ? {} : { path: remote.found.path }),
  }));

  if (!request.commit) {
    // The power source, the one thing a dry run reads off the remote: a read, closed again before the dry run ends.
    if (asked()) return stopped('the remote was opened');
    let source: string;
    try {
      const transport = await openTouch();
      try {
        source = await readTouchPowerSource(transport);
      } finally {
        await transport.close();
      }
    } catch (error) {
      // Nothing that acts was sent: the open or the read failed, or the guard refused it.
      return end({ result: error instanceof RailError ? 'refused' : 'failed', remote: 'as-before', message: said(error) });
    }
    journal(`sync: power source, ${describePowerSource(source)}`);
    const unpowered = touchPowerRefusal(source);
    if (unpowered !== undefined) return refused(unpowered);
    return end({ result: 'dry-run', remote: 'as-before', message: documentsDryRun(Object.keys(built.documents).length, built.pictures.length) });
  }

  // The last moment a stop is honoured, the header says why.
  if (asked()) return stopped('the remote was opened');
  // The flags, before a folder is made or the set kept: `answerTouchSync` asks the same again before it opens
  // anything, so this moves no rail; asking here leaves nothing behind for a commit that cannot run, as
  // `bin/touch-sync.ts` asks first for the same reason.
  try {
    assertTouchSyncAllowed();
  } catch (error) {
    return refused(said(error));
  }
  const folder = keeper.folder();
  const taken = touchFolderRefusal(folder);
  if (taken !== undefined) return refused(taken);
  // What the remote is given is kept first, before anything is opened.
  keeper.keep(set);

  /** The answerer's account: every line into the journal, and the two that move a screen on, into events. */
  const report = (line: string): void => {
    journal(line);
    if (HANDING_OVER.test(line)) {
      // From the hand over on, the remote has been acted on: a cable pulled now can leave a sync marked running.
      emit({ kind: 'attention', attention: 'do-not-unplug', message: ATTENTION['do-not-unplug'] });
      enter('hand-over');
    } else if (STARTED.test(line)) {
      enter('write');
    }
  };
  let outcome: TouchSyncOutcome;
  try {
    outcome = await answerTouchSync({
      mode: { kind: 'set', set },
      folder,
      label: keeper.label,
      permittedUnit: keeper.permittedUnit,
      open: openTouch,
      log: journal,
      report,
    });
  } catch (error) {
    // Every throw of `answerTouchSync` is before anything that acts on the remote was sent.
    return end({ result: error instanceof RailError ? 'refused' : 'failed', remote: 'as-before', message: said(error) });
  }
  if (outcome.ending === 'finished') {
    emit({ kind: 'attention', attention: 'safe-to-unplug', message: ATTENTION['safe-to-unplug'] });
    return end({ result: 'written', remote: 'new-configuration' });
  }
  if (outcome.ending === 'aborted') {
    // The remote's own abort deletes the set it was gathering and reloads the one it held before it is queued,
    // `reference/architectures/harmony-touch/answering-a-sync.md` "How a sync aborts", so nothing is left running.
    emit({ kind: 'attention', attention: 'safe-to-unplug', message: ATTENTION['safe-to-unplug'] });
    return end({ result: 'failed', remote: 'as-before', message: 'the remote aborted the sync, deleted what it had gathered and kept the set it held' });
  }
  const reason = outcome.reason ?? 'no reason given';
  if (!outcome.acted) return refused(reason);
  return end({
    result: 'failed', remote: 'needs-recovery',
    message: `${reason}. Recovery: ${outcome.recovery ?? 'none stated'}. ${outcome.abortCost ?? ''}`.trimEnd(),
  });
}

/**
 * Sync a document to a remote, R79: checked, built, written by the model's own write path and, where that path reads
 * back, read back; reported as events. Resolves with the outcome, which is also the last event; a document or a remote
 * that is refused is an outcome and not a throw. Built to a pretend remote, to an attached remote of a model whose
 * configuration is written into flash, and to an attached Harmony Touch; to an attached remote of any other model it
 * refuses by name before anything is opened.
 */
export async function syncDocument(request: SyncRequest): Promise<SyncOutcome> {
  const remote = request.remote;
  if (remote.kind === 'pretend') return syncPretend(request, remote);
  const model = request.document.model.name;
  // The path is chosen by the document's model: a Touch's document to a Touch's path, which refuses a remote that
  // enumerates as another model, and so on for flash. Which remote is attached never chooses the path, so a document
  // is never handed to a write path that was not built for it.
  if (TOUCH_SYNC_MODELS.includes(model)) return syncAttachedTouch(request, remote);
  // The models `writeConfiguration` writes and a document builds for. The Harmony 885 is written by it and built
  // from no document yet, which its build says; the Harmony 300 and 350 are written by a path of their own.
  if (!Object.hasOwn(CONFIG_WRITE_MODELS, model)) throw new NotBuiltError(`syncDocument for an attached ${model}`, 79);
  return syncAttached(request, remote);
}
