/**
 * Write or check the Harmony Touch's 7.1 bench tests, `todo-touch.md` 7.1.
 *
 *   node packages/bench/bin/touch-tests.ts            print each test's steps and expectations, write nothing
 *   node packages/bench/bin/touch-tests.ts --write    write them to packages/bench/irtests/touch-7-1-*.json
 *
 * Opens no remote and sends nothing. The predictions come from the documents the bench Touch holds, the lab's
 * `work/touch-firmware/sets/6.9-label-back`, and the favourites' documents of the recorded full sync, through the
 * engine model `packages/codec/src/families/harmony-touch/engine.ts`; `src/touchbench.ts` holds the plans and `test/touch-full-bench-predicted.test.ts` that the files
 * written are what this gives. A file of the 7.1 series that the plans no longer name is reported, not deleted.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { harmonyTouch } from '@harmony/codec/node';
import { LAB } from '@harmony/lab';
import { answersWritten, commands, records, sessions } from '@harmony/usb/test/touch-recording';

import { TOUCH_7_1_SET, touch71Configuration, touch71Tests } from '../src/touchbench.ts';

if (LAB === undefined || !existsSync(join(LAB, TOUCH_7_1_SET))) {
  process.stderr.write(`no lab, or no ${TOUCH_7_1_SET} in it\n`);
  process.exit(1);
}
const set = JSON.parse(readFileSync(join(LAB, TOUCH_7_1_SET), 'utf8')) as { answers: unknown[] };
const recorded = answersWritten(sessions(commands(records('touch_full_sync_recording'))).filter((s) => s.path === '/sys/hlapi'));
const configuration = touch71Configuration(set, harmonyTouch.documentsOfAnswers(recorded));
const tests = touch71Tests(configuration);

const directory = fileURLToPath(new URL('../irtests/', import.meta.url));
const write = process.argv.includes('--write');
for (const { id, definition } of tests) {
  const expected = definition.steps.reduce((n, s) => n + (s.expect?.length ?? 0), 0);
  process.stdout.write(`${id}: ${definition.steps.length} steps, ${expected} expectations\n`);
  if (!write) {
    for (const step of definition.steps) {
      process.stdout.write(`  ${step.instruction}\n`);
      for (const e of step.expect ?? []) {
        const times = (e.times ?? 1) > 1 ? ` x${e.times}` : '';
        const pause = e.pauseMs === undefined ? '' : `, ${e.pauseMs[0]} to ${e.pauseMs[1]} ms after the previous`;
        process.stdout.write(`      ${String(e.device)} ${e.command ?? ''}${times}${pause}\n`);
      }
    }
    continue;
  }
  writeFileSync(join(directory, `${id}.json`), `${JSON.stringify(definition, null, 2)}\n`);
}
const named = new Set(tests.map((t) => `${t.id}.json`));
for (const file of readdirSync(directory).filter((f) => f.startsWith('touch-7-1-') && !named.has(f))) {
  process.stdout.write(`not in the plans any more, left in place: ${file}\n`);
}
if (write) process.stdout.write(`wrote ${tests.length} files to ${directory}\n`);
