/**
 * What the Harmony One shows when it starts, findings section 403: the Remote Assistant and the "Welcome!" screen,
 * each kept by a state variable found by the shape of the lists the start runs, `startupassistant.ts`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import { parse } from '../src/index.ts';
import { characterMap, screenStrings } from '../src/text.ts';
import { stateRecords } from '../src/sections.ts';
import {
  ASSISTANT_HIDDEN, touchStartupVariables, withoutStartupAssistant,
} from '../src/families/touch/startupassistant.ts';

const ONE_COMPILES = ['one_config', 'one_config_unprogrammed', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830',
  'calibration_one', 'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2',
  'compiled_protocols_3', 'harvest_one_two_devices', 'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3',
  'one_friend_asfound_config', 'one_friend_legacy_sync_config', 'phase7_before', 'phase7_after'] as const;

test('section 403: 18 of the 19 Harmony One compiles hold the Remote Assistant\'s ladder on one variable running 0 to 3 and all 19 the welcome screen\'s variable running 0 to 1, both starting at 0, the everyday One\'s drawing no assistant screen',
     skipUnless(...ONE_COMPILES), () => {
  const tally = { assistant: 0, welcome: 0 };
  for (const name of ONE_COMPILES) {
    const c = parse(load(name) as Uint8Array);
    const found = touchStartupVariables(c);
    const records = stateRecords(c)!;
    if (found.assistant !== undefined) {
      tally.assistant += 1;
      assert.deepEqual([records[found.assistant]!.first, records[found.assistant]!.second], [0, 3], name);
      // Lists opening on a test of the variable, by the test's kind and their first arm's opcode: exactly one "at
      // most", 0x84, and one "equal", 0x80, have an enter as their first arm. Others test it too, 2 to 30 more per
      // compile, and reach screens through calls.
      const lists = c.actionLists()!;
      const arms = lists.flatMap((list) => list[0]?.opcode === 0x71 && (list[0].operand & 0xff) === found.assistant
        ? [`${(list[0].operand >> 8).toString(16)}:${list[1]?.opcode.toString(16)}`] : []);
      assert.deepEqual([arms.filter((one) => one === '84:7e').length, arms.filter((one) => one === '80:7e').length], [1, 1], name);
    } else {
      assert.equal(name, 'one_config');
      // It draws neither of the assistant's screens at all.
      const texts = screenStrings(c, characterMap(c)).map((one) => one.text);
      assert.deepEqual(texts.filter((one) => /^Welcome to your remote|^Ensure all your devices/.test(one)), [], name);
    }
    assert.notEqual(found.welcome, undefined, name);
    tally.welcome += 1;
    assert.deepEqual([records[found.welcome!]!.first, records[found.welcome!]!.second], [0, 1], name);
    assert.notEqual(found.assistant, found.welcome, name);
  }
  assert.deepEqual(tally, { assistant: 18, welcome: 19 });
});

test('section 403: the welcome screen\'s variable is written 0 silently by a list of each of the 19 compiles',
     skipUnless(...ONE_COMPILES), () => {
  let reset = 0;
  for (const name of ONE_COMPILES) {
    const c = parse(load(name) as Uint8Array);
    const welcome = touchStartupVariables(c).welcome!;
    // `07 FFFF`, the next write silent, then the variable written 0.
    const silent = c.actionLists()!.some((list) => list.some((one, k) =>
      one.opcode === 0x80 + welcome && one.operand === 0 && list[k - 1]?.opcode === 0x07 && list[k - 1]?.operand === 0xffff));
    if (silent) reset += 1;
  }
  assert.equal(reset, 19);
});

test('section 403: started past the assistant, a compile starts its assistant at 3 and nothing else moves, and one with no assistant is left as it is',
     skipUnless('harvest_one_two_devices', 'one_config'), () => {
  const c = parse(load('harvest_one_two_devices') as Uint8Array);
  const assistant = touchStartupVariables(c).assistant!;
  const after = withoutStartupAssistant(c);
  assert.ok(after.allChecksPass);
  const before = stateRecords(c)!;
  const records = stateRecords(after)!;
  assert.equal(records[assistant]!.first, ASSISTANT_HIDDEN);
  assert.deepEqual(before.flatMap((one, k) => (one.first !== records[k]!.first ? [k] : [])), [assistant]);
  // The everyday One's compile holds no assistant: the same container back.
  const everyday = parse(load('one_config') as Uint8Array);
  assert.equal(withoutStartupAssistant(everyday), everyday);
});
