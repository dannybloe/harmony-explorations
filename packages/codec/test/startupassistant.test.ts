/**
 * What the Harmony One shows when it starts, findings section 403: the Remote Assistant and the "Welcome!" screen,
 * each kept by a state variable found by the shape of the lists the start runs, `startupassistant.ts`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import { parse } from '../src/index.ts';
import { stateRecords } from '../src/sections.ts';
import {
  ASSISTANT_HIDDEN, touchStartupVariables, WELCOME_SEEN, withoutStartupAssistant,
} from '../src/families/touch/startupassistant.ts';

const ONE_COMPILES = ['one_config', 'one_config_unprogrammed', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830',
  'calibration_one', 'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2',
  'compiled_protocols_3', 'harvest_one_two_devices', 'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3',
  'one_friend_asfound_config', 'one_friend_legacy_sync_config', 'phase7_before', 'phase7_after'] as const;

test('section 403: 18 of the 19 Harmony One compiles hold the Remote Assistant\'s ladder on one variable running 0 to 3 and all 19 the welcome screen\'s variable running 0 to 1, both starting at 0, the everyday One\'s holding no assistant',
     skipUnless(...ONE_COMPILES), () => {
  const tally = { assistant: 0, welcome: 0 };
  for (const name of ONE_COMPILES) {
    const c = parse(load(name) as Uint8Array);
    const found = touchStartupVariables(c);
    const records = stateRecords(c)!;
    if (found.assistant !== undefined) {
      tally.assistant += 1;
      assert.deepEqual([records[found.assistant]!.first, records[found.assistant]!.second], [0, 3], name);
    } else {
      assert.equal(name, 'one_config');
    }
    assert.notEqual(found.welcome, undefined, name);
    tally.welcome += 1;
    assert.deepEqual([records[found.welcome!]!.first, records[found.welcome!]!.second], [0, 1], name);
    assert.notEqual(found.assistant, found.welcome, name);
  }
  assert.deepEqual(tally, { assistant: 18, welcome: 19 });
});

test('section 403: started past the assistant, a compile starts its assistant at 3 and its welcome screen at 1, and every check passes',
     skipUnless('harvest_one_two_devices', 'one_config'), () => {
  for (const name of ['harvest_one_two_devices', 'one_config']) {
    const c = parse(load(name) as Uint8Array);
    const found = touchStartupVariables(c);
    const after = withoutStartupAssistant(c);
    assert.ok(after.allChecksPass, name);
    const records = stateRecords(after)!;
    if (found.assistant !== undefined) assert.equal(records[found.assistant]!.first, ASSISTANT_HIDDEN, name);
    assert.equal(records[found.welcome!]!.first, WELCOME_SEEN, name);
    // Every other variable starts where it did.
    const before = stateRecords(c)!;
    const moved = before.flatMap((one, k) => (one.first !== records[k]!.first ? [k] : []));
    assert.deepEqual(moved, [found.assistant, found.welcome].filter((one) => one !== undefined), name);
  }
});
