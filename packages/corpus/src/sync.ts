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
 * pretends the cable. A sync to an attached remote is not: it refuses by name, `NotBuiltError`, with the
 * requirement it waits on, before anything is opened.
 */
import {
  buildFromRecipe, NotBuiltError, recipe, type BuildSources, type Built, type Recipe, type RecipeModel,
} from '@harmony/codec/node';
import type { FoundRemote } from '@harmony/usb';

/** What a sync is doing, in the order it does it; a model's sync leaves out the phases it has no use for. */
export type SyncPhase =
  // Which remote is on the cable, read off the remote itself and never taken from the caller.
  | 'identify'
  // The document checked and the configuration built, before the remote is touched.
  | 'check' | 'build'
  // What the remote holds read into a backup, which a write needs to exist first.
  | 'backup'
  // The write itself, the read back that compares every byte, and the restart that makes the remote take it up.
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

/** How a sync ended, and what state it left the remote in, which is what a person needs to know first. */
export interface SyncOutcome {
  readonly result:
    // The remote holds the document's configuration, read back and equal.
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
 * The remote a sync writes: one found on the cable, `listHarmony`, or a pretend one. Which unit an attached remote
 * is, is read off the remote during `identify`; a caller cannot state it.
 */
export type SyncRemote = { readonly kind: 'attached'; readonly found: FoundRemote } | PretendRemote;

/** What a sync is given. */
export interface SyncRequest {
  readonly document: Recipe;
  readonly remote: SyncRemote;
  /** What a build reads beyond the document: the catalogue for a device whose definition it does not carry. */
  readonly sources: BuildSources;
  /** False runs everything up to the first write and sends nothing that changes the remote. */
  readonly commit: boolean;
  readonly onEvent: (event: SyncEvent) => void;
  /** Every line the write path prints, in order; required, as the write paths require it. */
  readonly journal: (line: string) => void;
  /** Ask the sync to stop; honoured up to the first write, and a sync that has begun to write runs to its end. */
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
 * The phases a pretend sync runs after the build, by what was built. A configuration is written into flash, so
 * what the remote held is read first and the remote restarts at the end; documents are handed over and taken up
 * with neither. **This is the pretend remote's own shape**, there for a screen to be built against, and each real
 * path reports the phases it has.
 */
function pretendSteps(built: Built): { readonly phases: readonly SyncPhase[]; readonly steps: number } {
  if (built.kind === 'configuration') {
    return { phases: ['backup', 'write', 'verify', 'restart'], steps: Math.max(1, Math.ceil(built.bytes.length / PRETEND_BLOCK)) };
  }
  return { phases: ['write', 'verify'], steps: Math.max(1, Object.keys(built.documents).length) };
}

/** What a failure in a phase leaves, which is the first thing a person has to be told. */
const FAILURE: Readonly<Record<SyncPhase, { readonly result: SyncOutcome['result']; readonly remote: SyncOutcome['remote']; readonly message: string }>> = {
  identify: { result: 'failed', remote: 'as-before', message: 'the remote did not answer when it was asked which remote it is' },
  check: { result: 'refused', remote: 'as-before', message: 'the document was refused by its check' },
  build: { result: 'refused', remote: 'as-before', message: 'the document could not be built' },
  backup: { result: 'failed', remote: 'as-before', message: 'reading what the remote holds stopped part way, before anything was written' },
  write: { result: 'failed', remote: 'needs-recovery', message: 'the write stopped part way, so the remote holds a part of each configuration' },
  verify: { result: 'failed', remote: 'needs-recovery', message: 'what the remote holds does not read back as what was written' },
  restart: { result: 'failed', remote: 'new-configuration', message: 'the remote holds the new configuration and did not restart by itself' },
};

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
  /** Enter a phase; the outcome to end with where this is the phase told to fail or a stop is honoured here. */
  const enter = (phase: SyncPhase, stoppable: boolean): SyncOutcome | undefined => {
    if (stoppable && request.stop?.aborted === true) {
      return { result: 'stopped', remote: 'as-before', message: `stopped before ${phase}, with nothing written` };
    }
    say(phase);
    onEvent({ kind: 'phase', phase });
    if (failIn !== phase) return undefined;
    const { result, remote: left, message } = FAILURE[phase];
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
  say(built.kind === 'configuration' ? `built a configuration of ${built.bytes.length} bytes` : `built ${Object.keys(built.documents).length} documents`);

  // The remote holds this very document already: there is nothing to send it.
  if (state.holds !== undefined && JSON.stringify(state.holds) === JSON.stringify(document)) {
    return end({ result: 'nothing-to-write', remote: 'as-before', message: 'the remote already holds this document' });
  }

  const { phases, steps } = pretendSteps(built);
  let writing = false;
  for (const phase of phases) {
    if (phase === 'write') {
      if (!request.commit) {
        return end({ result: 'dry-run', remote: 'as-before', message: `everything up to the write was done, and ${steps} ${steps === 1 ? 'part' : 'parts'} would be written` });
      }
      // The last moment a stop is honoured, and the first at which the cable must stay in.
      if (request.stop?.aborted === true) return end({ result: 'stopped', remote: 'as-before', message: 'stopped before the write, with nothing written' });
      onEvent({ kind: 'attention', attention: 'do-not-unplug', message: 'Leave the remote on its cable until the sync says it is done.' });
      writing = true;
    }
    if (phase === 'restart') {
      onEvent({ kind: 'attention', attention: 'restarting', message: 'The remote restarts and is away from the cable for a moment.' });
    }
    const failed = enter(phase, !writing);
    if (failed !== undefined) {
      if (phase === 'restart') {
        onEvent({ kind: 'attention', attention: 'restart-by-hand', message: 'Take the batteries out of the remote and put them back.' });
      }
      return end(failed);
    }
    if (phase === 'restart') {
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
  onEvent({ kind: 'attention', attention: 'safe-to-unplug', message: 'The remote can be unplugged.' });
  return end({ result: 'written', remote: 'new-configuration' });
}

/**
 * Sync a document to a remote, R79: checked, built, written by the model's own write path and read back, reported
 * as events. Resolves with the outcome, which is also the last event; a document or a remote that is refused is an
 * outcome and not a throw. To a pretend remote it is built; to an attached one it refuses by name before anything
 * is opened.
 */
export async function syncDocument(request: SyncRequest): Promise<SyncOutcome> {
  const remote = request.remote;
  if (remote.kind === 'pretend') return syncPretend(request, remote);
  throw new NotBuiltError('syncDocument for an attached remote', 79);
}
