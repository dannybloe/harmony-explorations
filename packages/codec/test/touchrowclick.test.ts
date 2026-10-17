/**
 * A Harmony One device page's row clicks before it runs its command, findings section 404: Logitech's rows do, and
 * ours sent the code without the click until the touch family's device page wrapped each row the same way.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import { deviceListRows, modeRecords, parse, taggedList } from '../src/index.ts';
import { BEEP_OPCODE, SCREEN_ITEM_BEEP } from '../src/inventory.ts';

const ONE_COMPILES = ['one_config', 'one_config_unprogrammed', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830',
  'calibration_one', 'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2',
  'compiled_protocols_3', 'harvest_one_two_devices', 'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3',
  'one_friend_asfound_config', 'one_friend_legacy_sync_config', 'phase7_before', 'phase7_after'] as const;

test('section 404: every row of the device pages of Logitech\'s One compiles opens with the click, 3545 rows over 19 compiles, 3495 of them the click and a call and 50 the click and a 0x72',
     skipUnless(...ONE_COMPILES), () => {
  const tally = { compiles: 0, rows: 0, clicked: 0, clickAndCall: 0, clickAndMap: 0 };
  for (const name of ONE_COMPILES) {
    const c = parse(load(name) as Uint8Array);
    const lists = c.actionLists()!;
    const records = modeRecords(c)!;
    // The device modes the device list enters, which finds every compile's; `deviceModeMaps` misses those whose
    // own keypad map sends nothing, all of `harvest_one_families_1`'s and one of `compiled_protocols_3`'s.
    const modes = [...new Set(deviceListRows(c).map((one) => one.mode))];
    if (modes.length > 0) tally.compiles += 1;
    for (const mode of modes) {
      for (const page of records[mode]!.pages) {
        for (const entry of taggedList(c, page.list)?.entries ?? []) {
          // A row here is a call; the two keys below the screen are not rows, section 401.
          const scan = entry.tag & 0x3f;
          if (entry.opcode !== 0x7f || scan === 43 || scan === 44) continue;
          const list = lists[entry.operand] ?? [];
          const click = list[0]?.opcode === BEEP_OPCODE && list[0].operand === SCREEN_ITEM_BEEP.operand;
          tally.rows += 1;
          if (click) tally.clicked += 1;
          if (click && list.length === 2 && list[1]?.opcode === 0x7f) tally.clickAndCall += 1;
          if (click && list.length === 2 && list[1]?.opcode === 0x72) tally.clickAndMap += 1;
        }
      }
    }
  }
  assert.deepEqual(tally, { compiles: 19, rows: 3545, clicked: 3545, clickAndCall: 3495, clickAndMap: 50 });
});
