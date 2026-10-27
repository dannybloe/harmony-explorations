/**
 * The Harmony 300 and 350's power on delays, read and changed by the readers every other family uses.
 *
 * `todo-compile-350.md` 1.8 wants one delay changed on the bench 350 and heard on the infrared receiver.
 * Until this file `deviceDelays` returned nothing on this family and `devices` named no device, and the
 * cause was one missing row: base slot 13, the state variable table, was not in `ARCH16_SLOT_MAP`, so
 * `stateRecords` answered undefined and every reader built on a variable's transitions went quiet. The
 * firmware had already named raw slot 9 as base slot 13 (`tests/test_harmony_350_slots.py`); placing it
 * is the whole code change, and nothing outside the slot map names this family.
 *
 * **What a power on delay is here.** A device's `Power` variable runs, on its transition from 0 to 1,
 * a list of two instructions: a call of the list that sends the power code, and one `0x7C` naming the
 * device's infrared group with the delay as its low byte. That is the arch 8, 9 and 12 shape (the Harmony
 * 880 and 885, the Harmony 525, the Harmony One), `powerOnInstructions`. The firmware half, that this
 * image's `0x7C` is the same queued quantity and the tick counts it down per device, is
 * `tests/test_harmony_350_delay.py`.
 *
 * **The counts, over the five configurations of this family.** 14 devices send a code; `devices` names
 * all 14 by the route that reads a variable's transitions, and `deviceDelays` reads 13 power on delays.
 * The one it leaves out is the factory Harmony 350's television, whose transition carries **two**
 * quantities, 100 and 70, and `powerOnInstructions` takes exactly one by design. That the two make a wait
 * of 170 is an inference from the fold, which refuses to merge into a queued 100, and from the same
 * configuration's activity, which carries that television's copy as one `0x7C` of 170; why the compiler
 * split one and not the other is not established. Values over these five: 15 nine times, 50 twice and 80
 * twice, so the reader is not passing on one repeated number. The bench 350's own configuration for 1.8,
 * not a fixture, reads 100 for its television and 20 for its receiver.
 *
 * **The independent closure is another remote.** The programmed Harmony 350 was set up through Logitech's
 * service with the bench Harmony 600's devices. The Harmony 600 keeps a power on delay as a variable whose
 * unit its own screen draws, `( 0 sec )` to `( 45 sec )` in tenths; this remote keeps it as an operand.
 * The two agree device for device, 80, 15 and 15, by name. Two of the three are 15, which is likely a
 * common default and so weak; the television's 80 is the value that carries the closure, the compiler
 * writing the same tenths of a second into two formats. It is the shape of section 235, on a third
 * architecture, with one discriminating value where section 235 had three. What it does not
 * show is that this remote's firmware waits a tenth of a second per unit: the tick's rate is not read,
 * and the bench receiver measures it in 1.8.
 *
 * **A rail for a writer that this file found.** The one activity of this family carries its **own** copy
 * of the delay for each device its start switches on directly: `{0x7F power list, 0x7C group value}` in
 * the list the key table's tag `0x86` binding calls, eight copies over the five. Seven are of devices
 * `powerOnInstructions` reads and equal their device's value; the eighth is the factory television's, one
 * `0x7C` of 170 where its own transition carries 100 and 70. `setPowerOnDelay` changes the device's transition and not that copy, so on a
 * configuration with an activity the activity keeps the old delay. The bench 350's configuration for 1.8
 * has no activity, so the one edit is the whole change there; asserted below so that it is visible.
 *
 * **Sources checked first.** Logitech's client builds no part of this container. The archive: sections
 * 70, 86, 234, 235 and 263. The reference: `reference/config-format/actions.md` and `state.md`, and the
 * family's `memory.md`. Which architectures: arch 16 alone, both models, two generations of compiler.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { require_, skipUnless } from '@harmony/lab';

import {
  applyEdits,
  deviceDelays,
  devices,
  parse,
  powerOnInstructions,
  setPowerOnDelay,
  stateVariables,
  trailerChecksum,
} from '../src/index.ts';
import type { Container } from '../src/gspm.ts';
import { taggedList } from '../src/sections.ts';
import { TRAILER_CHECKSUM_OFFSET } from '../src/gspm.ts';

const CONFIGS = ['h350_config', 'h350_programmed_config', 'h350_three_devices_config', 'h300_config',
  'h300_programmed_config'] as const;

/** Every power on delay `deviceDelays` reads, as `[group, name, tenths]`, per configuration. */
const EXPECTED: Readonly<Record<(typeof CONFIGS)[number], readonly (readonly [number, string, number])[]>> = {
  h350_config: [[1, 'Delta', 15], [3, 'Radio', 15]],
  h350_programmed_config: [[0, 'TV', 80], [1, 'KPN', 15], [2, 'PS', 15]],
  h350_three_devices_config: [[0, 'TV', 80], [1, 'KPN', 15]],
  h300_config: [[0, 'Panasonic_TX-29PS11P', 50], [1, 'Sagem_ITAD-83_SD', 15]],
  h300_programmed_config: [[0, 'Panasonic_TV', 50], [1, 'KPN', 15], [2, 'Panasonic_DVD', 15],
    [3, 'Sony_VCR', 15]],
};

/** The key table's binding for the activity, tag `0x86`, `tests/test_harmony_350_slots.py`. */
const ACTIVITY_TAG = 0x86;
/** Raw slot 6, the key map table, whose entry 0 is the key table. Read raw: the map does not place it. */
const KEY_MAP_RAW_SLOT = 6;

function activityList(c: Container): number | undefined {
  const table = c.pointerArray(KEY_MAP_RAW_SLOT);
  const entries = table?.[0] === undefined ? [] : taggedList(c, table[0])?.entries ?? [];
  const bound = entries.filter((entry) => entry.tag === ACTIVITY_TAG && entry.opcode === 0x7f);
  return bound.length === 1 ? (bound[0] as { operand: number }).operand : undefined;
}

test('every Harmony 300 and 350 device that sends a code is named, and 13 of the 14 power on delays read',
  skipUnless(...CONFIGS), () => {
    let named = 0;
    let read = 0;
    const values: number[] = [];
    for (const name of CONFIGS) {
      const c = parse(require_(name));
      assert.equal(c.architecture, 16, name);
      const sending = devices(c).filter((one) => one.codes > 0);
      assert.ok(sending.every((one) => one.name !== undefined), `${name} has a device with no name`);
      named += sending.length;
      const delays = deviceDelays(c);
      assert.deepEqual(delays.map((one) => [one.group, one.name, one.powerOn]), EXPECTED[name], name);
      assert.ok(delays.every((one) => one.source === 'instruction'), `${name} holds a delay as a variable`);
      read += delays.length;
      values.push(...delays.map((one) => one.powerOn));
    }
    assert.equal(named, 14);
    assert.equal(read, 13);
    // The values vary, so the table above is not one number repeated.
    assert.deepEqual([15, 50, 80].map((v) => values.filter((one) => one === v).length), [9, 2, 2]);
  });

test('the one delay left out is spelled as two quantities, 100 and then 70',
  skipUnless('h350_config'), () => {
    const c = parse(require_('h350_config'));
    const tv = devices(c).find((one) => one.name === 'TV');
    assert.equal(tv?.group, 0);
    assert.equal(powerOnInstructions(c).get(0), undefined);
    // Its own power transition, `TV_Power`'s 0 to 1, read through the records the reader uses.
    const lists = c.actionLists() ?? [];
    const power = stateVariables(c).find((one) => one.label === 'TV_Power');
    const on = power?.record?.values.filter((one) => one.from === 0 && one.to === 1) ?? [];
    assert.equal(on.length, 1);
    assert.equal(on[0]?.opcode, 0x7f);
    const list = lists[on[0]?.operand ?? -1] ?? [];
    assert.deepEqual(list.map((one) => one.opcode), [0x7f, 0x7c, 0x7c]);
    assert.deepEqual(list.slice(1).map((one) => [one.operand >> 8, one.operand & 0xff]), [[0, 100], [0, 70]]);
    // The activity's copy of the same television's wait is one 0x7C of 170, after the same call.
    const start = lists[activityList(c) ?? -1] ?? [];
    const at = start.findIndex((one) => one.opcode === 0x7f && one.operand === list[0]?.operand);
    assert.deepEqual([start[at + 1]?.opcode, start[at + 1]?.operand], [0x7c, 170]);
  });

test('a Harmony 350 set up with the Harmony 600\'s devices states the same delays, 80, 15 and 15',
  skipUnless('h350_programmed_config', 'h600_before_empty'), () => {
    const h350 = new Map(deviceDelays(parse(require_('h350_programmed_config')))
      .map((one) => [one.name, [one.source, one.powerOn]]));
    const h600 = new Map(deviceDelays(parse(require_('h600_before_empty')))
      .map((one) => [one.name, [one.source, one.powerOn]]));
    for (const name of ['TV', 'KPN', 'PS']) {
      assert.deepEqual(h350.get(name), ['instruction', h600.get(name)?.[1]], name);
      assert.equal(h600.get(name)?.[0], 'variable', `${name} on the Harmony 600`);
    }
    assert.deepEqual(['TV', 'KPN', 'PS'].map((name) => h350.get(name)?.[1]), [80, 15, 15]);
  });

test('changing a Harmony 300 or 350 delay moves one byte and the trailer checksum, and reads back',
  skipUnless(...CONFIGS), () => {
    let edited = 0;
    for (const name of CONFIGS) {
      const c = parse(require_(name));
      const before = deviceDelays(c);
      for (const delay of before) {
        const wanted = delay.powerOn === 30 ? 31 : 30;
        const edits = setPowerOnDelay(c, delay.group, wanted);
        assert.equal(edits.length, 1);
        const report = applyEdits(c, edits);
        const trailer = report.bytes.length - TRAILER_CHECKSUM_OFFSET;
        const at = (edits[0] as { start: number }).start;
        // Only the delay's byte and the checksum word differ.
        for (const run of report.changed) {
          for (let i = run.start; i < run.start + run.length; i += 1) {
            assert.ok(i === at || i === trailer || i === trailer + 1,
              `${name} group ${delay.group}: 0x${i.toString(16)} moved`);
          }
        }
        assert.equal(report.bytes[at], wanted);
        const after = parse(report.bytes);
        assert.equal(after.trailerChecksum, trailerChecksum(report.bytes));
        assert.deepEqual(deviceDelays(after).map((one) => [one.group, one.powerOn]),
          before.map((one) => [one.group, one.group === delay.group ? wanted : one.powerOn]));
        edited += 1;
      }
    }
    assert.equal(edited, 13);
  });

test('the activity keeps its own copy of each read delay, equal to it, which the edit does not change',
  skipUnless(...CONFIGS), () => {
    let copies = 0;
    for (const name of CONFIGS) {
      const c = parse(require_(name));
      const lists = c.actionLists() ?? [];
      const start = activityList(c);
      assert.notEqual(start, undefined, `${name} has no activity binding`);
      for (const [group, found] of powerOnInstructions(c)) {
        const call = lists[found.list]?.[found.at - 1];
        assert.equal(call?.opcode, 0x7f, `${name} group ${group}: no call before the delay`);
        // Every other place the same call is followed by a 0x7C for the same device.
        const elsewhere: { list: number; at: number; value: number }[] = [];
        lists.forEach((list, index) => {
          if (index === found.list) return;
          for (let k = 0; k + 1 < list.length; k += 1) {
            const a = list[k] as { opcode: number; operand: number };
            const b = list[k + 1] as { opcode: number; operand: number };
            if (a.opcode === 0x7f && a.operand === call?.operand && b.opcode === 0x7c && b.operand >> 8 === group) {
              elsewhere.push({ list: index, at: k + 1, value: b.operand & 0xff });
            }
          }
        });
        for (const copy of elsewhere) {
          assert.equal(copy.list, start, `${name} group ${group}: a copy outside the activity`);
          assert.equal(copy.value, found.tenths, `${name} group ${group}: a copy that differs`);
          // The edit leaves it alone.
          const after = parse(applyEdits(c, setPowerOnDelay(c, group, found.tenths === 30 ? 31 : 30)).bytes);
          const kept = after.actionLists()?.[copy.list]?.[copy.at];
          assert.equal((kept?.operand ?? -1) & 0xff, found.tenths, `${name} group ${group}: the copy moved`);
          copies += 1;
        }
      }
    }
    // The eighth copy, the factory television's 170, is asserted in the test above.
    assert.equal(copies, 7);
  });
