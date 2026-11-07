/**
 * Write or check the Harmony Touch's 8.1 bench test, `todo-touch.md` 8.1: device mode for a device of ours.
 *
 *   node packages/bench/bin/touch-device-tests.ts            print the test's steps and expectations, write nothing
 *   node packages/bench/bin/touch-device-tests.ts --write    write it to packages/bench/irtests/touch-8-1-*.json
 *
 * Opens no remote and sends nothing. The prediction comes from the lab's `work/touch-firmware/sets/8.1-device`,
 * which `packages/corpus/bin/touch-device-set.ts` built, and the favourites' documents of the recorded full sync,
 * through the engine model `packages/codec/src/harmony-touch/engine.ts`; `experiments/touchdevicetest.ts` holds the plan and `test/touch-device-predicted.test.ts` that the
 * file written is what this gives.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { harmonyTouch } from '@harmony/codec';
import { LAB } from '@harmony/lab';
import { answersWritten, commands, records, sessions } from '@harmony/usb/test/touch-recording';

import { touch71Configuration } from '../src/touchbench.ts';
import { TOUCH_8_1_SET, touch81Tests } from '../experiments/touchdevicetest.ts';

if (LAB === undefined || !existsSync(join(LAB, TOUCH_8_1_SET))) {
  process.stderr.write(`no lab, or no ${TOUCH_8_1_SET} in it\n`);
  process.exit(1);
}
const set = JSON.parse(readFileSync(join(LAB, TOUCH_8_1_SET), 'utf8')) as { answers: unknown[] };
const recorded = answersWritten(sessions(commands(records('touch_full_sync_recording'))).filter((s) => s.path === '/sys/hlapi'));
const configuration = touch71Configuration(set, harmonyTouch.documentsOfAnswers(recorded));
const tests = touch81Tests(configuration);

const directory = fileURLToPath(new URL('../irtests/', import.meta.url));
const write = process.argv.includes('--write');
for (const { id, definition } of tests) {
  const expected = definition.steps.reduce((n, s) => n + (s.expect?.length ?? 0), 0);
  process.stdout.write(`${id}: ${definition.steps.length} steps, ${expected} expectations\n`);
  if (write) {
    writeFileSync(join(directory, `${id}.json`), `${JSON.stringify(definition, null, 2)}\n`);
    continue;
  }
  for (const step of definition.steps) {
    process.stdout.write(`  ${step.instruction}\n`);
    for (const e of step.expect ?? []) {
      const times = (e.times ?? 1) > 1 ? ` x${e.times}` : '';
      const pause = e.pauseMs === undefined ? '' : `, ${e.pauseMs[0]} to ${e.pauseMs[1]} ms after the previous`;
      process.stdout.write(`      ${String(e.device)} ${e.command ?? ''}${times}${pause}\n`);
    }
  }
}
if (write) process.stdout.write(`wrote ${tests.length} ${tests.length === 1 ? 'file' : 'files'} to ${directory}\n`);
