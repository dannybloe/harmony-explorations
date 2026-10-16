/**
 * The test setup composed onto a Logitech compile for the Harmony One, `composeSetup`, `todo-compile-one.md` 1.2:
 * since 1.2.11.2.7 the family's look runs inside it, the donor lettered first and the rest over the composed
 * file, where a lab script used to run those steps after it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { IR_ARCHIVE, require_, skipUnless, skipWithoutIrArchive } from '@harmony/lab';
import { composeSetup, deviceModeMaps, modeRecords, readRecipe, taggedList, touchPages } from '../src/index.ts';
import { characterMap } from '../src/text.ts';
import { timers } from '../src/tables.ts';
import { touchScreenLightTimer } from '../src/families/touch/screenlight.ts';
import { TOUCH_CHOICES } from '../src/families/touch/choices.ts';

const recipe = () => readRecipe(JSON.parse(readFileSync(new URL('../../corpus/setups/one-test.json', import.meta.url), 'utf8')));

test('the One test setup composed onto Logitech\'s compile of two devices comes out lettered in ours, in the family\'s look, with every check passing',
     // Either missing skips it; spreading the two would let the second's `false` hide the first's reason.
     { skip: skipUnless('harvest_one_two_devices').skip || skipWithoutIrArchive().skip }, () => {
  const out = composeSetup(recipe(), { donor: require_('harvest_one_two_devices'), archive: IR_ARCHIVE!, builtAt: '2026-10-15T12:00:00' });
  const c = out.container;
  // The look's two halves, in place: lettered before anything is composed, the look after, the stamp last.
  const names = out.steps.map((one) => one.step);
  assert.deepEqual([names[0], names[1], names.at(-2), names.at(-1)], ['donor', 'lettered', 'look', 'stamped']);
  assert.ok(c.allChecksPass);
  assert.equal(characterMap(c)?.alphabet, 'oxanium');
  // The screen light at the family's default.
  assert.equal(timers(c)!.records[touchScreenLightTimer(c)!]!.duration, TOUCH_CHOICES.screenLightSeconds);
  // Every device page whose hit page offers the keys below the screen binds both, the composed ones included,
  // section 401: seven devices, the two the donor held and the five composed.
  const records = modeRecords(c)!;
  const hits = touchPages(c)!;
  const modes = [...new Set(deviceModeMaps(c).map((one) => one.mode))];
  assert.equal(modes.length, 7);
  for (const mode of modes) {
    for (const page of records[mode]!.pages) {
      const codes = (hits.records[page.lead!]?.areas ?? []).map((area) => area.code);
      if (!codes.includes(43) || !codes.includes(44)) continue;
      const bound = (taggedList(c, page.list)?.entries ?? []).filter((one) => [0x80 | 43, 0x80 | 44].includes(one.tag) && one.opcode !== 0);
      assert.equal(bound.length, 2, `mode ${mode}`);
    }
  }
  // The file the spare Harmony One was given before the screen light was raised, the lab's `one-test-setup.bin`
  // as the lab script built it, is this one byte for byte; its length is pinned so a change shows here first.
  assert.equal(c.blob.length, 1750855);
});
