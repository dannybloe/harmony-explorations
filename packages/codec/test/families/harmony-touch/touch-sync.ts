/**
 * The documents of a recorded Harmony Touch sync, for the codec's tests of the Touch reader.
 *
 * The recordings are decoded by `packages/usb/src/touchrecording.ts`, the one decoder of them, and this
 * file only picks what the codec's tests need out of it: the answers the computer wrote back to the remote
 * and the requests the remote handed over, through the same `answersWritten` walk the tests in
 * `packages/usb` use.
 *
 * **How the decoder is reached.** A relative import of a file in another project is refused by the
 * compiler here, TS2878, because `rewriteRelativeImportExtensions` cannot rewrite a path that crosses into
 * another project's outputs. So this is an ordinary package import of the test kit,
 * `@harmony/testkit/touch-recording`, which carries the decoder and reads a recording out of the lab by its
 * name, typed from the decoder itself. The kit is a dev dependency of the codec and of no product. Until `packages/usb` exported the decoder as a test only subpath, and before that this file
 * loaded it at run time by URL and declared four of its signatures by hand, which was a copy that nothing
 * checked.
 *
 * Not a test file itself, so the runner does not pick it up.
 */
import { answersWritten, commands, records, requestLists, sessions, type Session } from '@harmony/testkit/touch-recording';
import type { SyncAnswer } from '../../../src/families/harmony-touch/documents.ts';

export const TRIAL = 'touch_sync_recording';
export const FULL = 'touch_full_sync_recording';
export const REVERSE = 'touch_reverse_sync_recording';

/** One request the remote hands over: a verb and an address. */
export interface RemoteRequest {
  readonly verb: string;
  readonly uri: string;
}

const hlapi = (fixture: string): Session[] => sessions(commands(records(fixture))).filter((s) => s.path === '/sys/hlapi');

/** Every answer the computer wrote back to the remote in a `proxy/response?write`, in order. */
export function answersOf(fixture: string): SyncAnswer[] {
  return answersWritten(hlapi(fixture));
}

/** Every request the remote handed over, in order: what it asked for, as opposed to what it was given. */
export function requestsOf(fixture: string): RemoteRequest[] {
  return requestLists(hlapi(fixture)).flat();
}
