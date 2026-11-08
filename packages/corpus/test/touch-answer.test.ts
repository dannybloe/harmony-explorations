/**
 * `answerTouchSync`, a Harmony Touch's sync answered as a function an application calls, `todo.md` 7.3.10.
 *
 * **What this holds**: the run around the answerer that was `bin/touch-sync.ts`'s `--commit` until 7.3.10. The
 * two flags, and the recovery flag that refuses, are checked before the Touch is opened; the session's unit check
 * refuses another Touch before any request is written; a run that finishes has closed the transport, and so has
 * one that was refused. The words of the two flag refusals are the script's, which `touch-sync.test.ts` reads
 * off the script, so this holds the function to them as well.
 *
 * **Every run but the first is in a process of its own** with the flags it names, `touch-answer-run.ts`, the
 * remote the fake Touch and nothing else. One model, the Harmony Touch, on the build the rail admits; none of
 * this has met a remote.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { runAnswer, type AnswerRun, type AnswerScenario } from './touch-answer-run.ts';

const NEEDS = '--commit needs HARMONY_ENABLE_WRITES=1 and HARMONY_TOUCH_REQUESTS=1';

function withFlags(flags: Record<string, string>, scenario: AnswerScenario = {}): AnswerRun {
  const script = fileURLToPath(new URL('./touch-answer-run.ts', import.meta.url));
  const out = execFileSync(process.execPath, [script], {
    input: JSON.stringify(scenario),
    env: { ...process.env, HARMONY_ENABLE_WRITES: '', HARMONY_TOUCH_REQUESTS: '', HARMONY_TOUCH_RECOVERY: '', ...flags },
    encoding: 'utf8',
  });
  return JSON.parse(out) as AnswerRun;
}

const BOTH = { HARMONY_ENABLE_WRITES: '1', HARMONY_TOUCH_REQUESTS: '1' };

describe('answering a sync as a library function', () => {
  it('refuses in the shipped state before the Touch is opened', async () => {
    const run = await runAnswer({});
    assert.deepEqual(run.error, { name: 'RailError', message: NEEDS });
    assert.equal(run.opened, false);
  });

  it('refuses with either flag alone, and with the recovery flag set beside both, before the Touch is opened', () => {
    for (const flags of [{ HARMONY_ENABLE_WRITES: '1' }, { HARMONY_TOUCH_REQUESTS: '1' }]) {
      const run = withFlags(flags);
      assert.equal(run.error?.message, NEEDS);
      assert.equal(run.opened, false);
    }
    const recovery = withFlags({ ...BOTH, HARMONY_TOUCH_RECOVERY: '1' });
    assert.match(recovery.error?.message ?? '', /^--commit refuses with HARMONY_TOUCH_RECOVERY set/);
    assert.equal(recovery.opened, false);
  });

  it('with both flags runs the sync to proxy://Finished and closes the Touch', () => {
    const run = withFlags(BOTH);
    assert.equal(run.error, undefined, run.error?.message);
    assert.equal(run.outcome?.ending, 'finished');
    assert.ok(run.opened && run.closed);
    assert.ok(run.log.includes('the unit matches its record'), 'the session checked the unit');
    assert.equal(run.reports.at(-1), 'sync: finished');
    assert.ok(run.written.length > 0, 'the control for the refusals: this run did write into /sys/hlapi');
  });

  it('refuses another Touch at the session, before any request is written, and still closes it', () => {
    const run = withFlags(BOTH, { recordSerial: '20000101000000-999999' });
    assert.ok(run.error !== undefined, 'refused');
    assert.ok(run.opened && run.closed);
    assert.deepEqual(run.written, []);
  });
});
