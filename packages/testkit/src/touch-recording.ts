/**
 * A recorded sync of a Harmony Touch, read out of the lab by name, for the tests that read one.
 *
 * The decoder itself is a library, `@harmony/usb/touchrecording`, and this module carries it whole so a test
 * imports one module. What it adds reads the lab, which a library of this workspace does not: `records`, a
 * recording by its name, and the readers of a run of this project's own answerer,
 * `packages/corpus/bin/touch-sync.ts`, whose folder in the lab keeps each request list, each write of answers
 * and each reply as a file of its own. One copy of them for every test that reads such a run, where the first
 * and second sync's tests each held their own until a third sync's tests arrived. They assert, since a
 * fixture that is not what its name says is a test's failure.
 *
 * Moved here from `packages/usb/test/touch-recording.ts`, with the decoder moved into
 * `packages/usb/src/touchrecording.ts`. Not a test file itself, so the runner does not pick it up.
 */
import assert from 'node:assert/strict';

import * as lab from '@harmony/lab';
import { WRITE, recordsOf, type Answer, type Record_, type Request_ } from '@harmony/usb/touchrecording';

export * from '@harmony/usb/touchrecording';

/** A recording's records, out of the lab by the recording's name. */
export function records(fixture: string): Record_[] {
  return recordsOf(lab.require_(fixture));
}

/** A reply the remote's request file gave, `Response,` and its JSON. */
export interface Reply {
  errorCode: string;
  errorMessage: string;
  mime: string;
  result: unknown;
}

/** A reply a run of the answerer kept, out of its file in the lab. */
export function reply(fixture: string): Reply {
  const text = new TextDecoder().decode(lab.require_(fixture));
  assert.ok(text.startsWith('Response,'), `${fixture} is not a request answer`);
  return JSON.parse(text.slice('Response,'.length)) as Reply;
}

/** A request list the remote handed out, as a run of the answerer kept it. */
export function list(fixture: string): Request_[] {
  const r = reply(fixture);
  assert.equal(r.errorCode, '200');
  return (JSON.parse(r.result as string) as { requests: Request_[] }).requests;
}

/** The answers one write carried, out of the request line as a run of the answerer wrote it. */
export function written(fixture: string): Answer[] {
  const line = new TextDecoder().decode(lab.require_(fixture));
  assert.ok(line.startsWith(`${WRITE}&`), `${fixture} is not a write of answers`);
  return (JSON.parse(decodeURIComponent(line.split('&responses=')[1]!)) as { responses: Answer[] }).responses;
}
