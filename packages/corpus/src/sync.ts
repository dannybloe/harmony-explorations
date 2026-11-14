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
 * **A stop is a request.** Between an erase and the write that follows it a remote holds no configuration, so a
 * sync that stopped the moment it was asked could leave a remote that does not start. `stop` is honoured at the
 * next point where the remote is whole, and the outcome says whether that was before anything was written.
 *
 * **The rails do not move.** This function will choose a write path and call it; every rail is still asserted
 * inside that path, on the same inputs, and which units may be written is still the library's list and never a
 * caller's, `packages/usb/src/rails.ts`. Writing a user's own remote is R6, a decision of its own before it is built.
 *
 * Nothing here is built yet: both functions refuse by name, `NotBuiltError`, with the requirement they wait on.
 */
import { NotBuiltError, type BuildSources, type Recipe, type RecipeModel } from '@harmony/codec';
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
    // Something went wrong after the write began.
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
  /** Ask the sync to stop; honoured where the remote is whole, never between an erase and its write. */
  readonly stop?: AbortSignal;
}

/**
 * A remote that is not there, R80: it answers a sync as a remote of its model would, with the phases, the progress
 * and the pace, and it can be told to fail, so an application's every screen can be built and tried with nothing
 * attached. It holds whatever was last synced to it, for as long as the object lives.
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
  /** Fail the next sync in this phase, the way a remote of the model fails there. */
  readonly failIn?: SyncPhase;
  /** How fast it goes: 1 is a real remote's pace, 0 answers at once, which is what a test wants. */
  readonly pace?: number;
}

/** Sync a document to a remote, R79: checked, built, written by the model's own write path and read back, reported as events. */
export async function syncDocument(request: SyncRequest): Promise<SyncOutcome> {
  void request;
  throw new NotBuiltError('syncDocument', 79);
}

/** A pretend remote of a model, R80. */
export function pretendRemote(options: PretendOptions): PretendRemote {
  void options;
  throw new NotBuiltError('pretendRemote', 80);
}
