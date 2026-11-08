/**
 * Write or check the Harmony Touch's 8.3 bench test, `todo-touch.md` 8.3: favourites of ours, in a new order with a
 * channel added, each tapped, and a logo of ours to look at.
 *
 *   node packages/bench/bin/touch-favourites-tests.ts            print the test's steps and expectations, write nothing
 *   node packages/bench/bin/touch-favourites-tests.ts --write    write it to packages/bench/irtests/touch-8-3-*.json
 *
 * Opens no remote and sends nothing. The prediction comes from the lab's `work/touch-firmware/sets/8.3-favourites`,
 * which `packages/corpus/bin/touch-device-set.ts --favourites` built, and the favourites documents of the recorded full
 * sync that set leaves the remote to keep, through the engine model `packages/codec/src/families/harmony-touch/engine.ts`; `experiments/touchfavouritestest.ts` holds the
 * plan and `test/touch-favourites-predicted.test.ts` that the file written is what this gives. The description,
 * `packages/corpus/touch-favourites/8.3-favourites.json`, says which channel was added and the logo's text.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The Node entry, for the fonts, the icons, the deflate and the SHA-256 the core asks its loader for.
import '@harmony/codec/node';
import { harmonyTouch } from '@harmony/codec/build';
import { LAB, require_ } from '@harmony/lab';
import { answersWritten, commands, recordsOf, sessions } from '@harmony/usb/touchrecording';

import { touch71Configuration } from '../src/touchbench.ts';
import { TOUCH_8_3_SET, touch83Tests } from '../experiments/touchfavouritestest.ts';

if (LAB === undefined || !existsSync(join(LAB, TOUCH_8_3_SET))) {
  process.stderr.write(`no lab, or no ${TOUCH_8_3_SET} in it\n`);
  process.exit(1);
}
const set = JSON.parse(readFileSync(join(LAB, TOUCH_8_3_SET), 'utf8')) as { answers: unknown[] };
const recorded = answersWritten(sessions(commands(recordsOf(require_('touch_full_sync_recording')))).filter((s) => s.path === '/sys/hlapi'));
const configuration = touch71Configuration(set, harmonyTouch.documentsOfAnswers(recorded));
const description = (JSON.parse(readFileSync(fileURLToPath(new URL('../../corpus/touch-favourites/8.3-favourites.json', import.meta.url)), 'utf8')) as
  { favourites: harmonyTouch.OwnFavourites }).favourites;
const tests = touch83Tests(configuration, description.add ?? [], description.logos?.[0]?.text ?? '');

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
