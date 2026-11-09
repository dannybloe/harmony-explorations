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
 * `0x7C` of 170 where its own transition carries 100 and 70. Until `todo-compile-350.md` 4.6 `setPowerOnDelay`
 * changed the device's transition and not that copy, so on a configuration with an activity the activity kept the
 * old delay; on the bench Harmony 300 the activity's was the only copy any key reached, and the transition's none,
 * `docs/test-notes/harmony-300.md`.
 *
 * **What the edit changes now, 4.6**, the family's rule in `src/families/harmony-300-350/delay.ts`: the device's own
 * `0x7C` and, in Watch TV's list and every list it calls, each call of the list the device's switch on list calls
 * followed by a `0x7C` naming the device. Four measurements hold it, each with a control:
 *
 * * **The known answer.** The bench Harmony 300's television was set from 50 to 100 tenths with both copies at 100,
 *   `after.bin`, written, and heard: the first Volume Up after its power code 11.545 s later against 6.543 s
 *   before. The edit, given the same file and the same value, reproduces that file byte for byte, the transition
 *   at `0x1706A`, Watch TV's copy at `0xD3` and the checksum. Dropping the activity's copy leaves `0xD3` and the
 *   checksum different, so the comparison can tell.
 * * **Kinds of device, counted.** Logitech's compile of the Harmony 350 test setup has eight devices, seven with a
 *   single wait: in Watch TV, the KPN box switched by its toggle and the LG and the Denon by their `Power`
 *   variables; outside it the Plasma and the Switch with two codes and Kodi and the Sony with one. The edit moves
 *   the KPN's transition and Watch TV's wait after its toggle, and each other device's transition alone, asserted
 *   by address, so the rule is about what Watch TV calls and not about which devices toggle: two toggle devices
 *   outside the activity get one. The LG's and the Denon's waits are reached through the variable flips Watch TV
 *   reaches, whose transition is the byte the edit changes.
 * * **Nothing missed, by the same pattern.** Over the five configurations every copy found by searching every
 *   list, reached or not, is the one the family names, 7 of 7, all in the list Watch TV's press calls; the edits
 *   move 20 bytes for 13 delays. That search uses the rule's own pattern, so it checks reachability and nothing
 *   else.
 * * **Nothing missed, independently.** Every `0x7C` in a list Watch TV could run, following calls and the
 *   transitions of the variables it writes, is one of four kinds over the five configurations: the wait a send
 *   list carries after its `0x7D`, one or three tenths, 16 of them; a device's own switch on, reached through its
 *   flipped variable, 2; a copy the family names, 7; and the factory television's 170 that the edit refuses, 1. So
 *   no wait of another shape that a person would call a power on delay is left behind. Removing the family's
 *   member fails the four tests that edit; this one asks the rule directly.
 *
 * **Which copy a key reaches, a reading the blind review added.** On the bench Harmony 300's configuration every
 * device has one code and none of the transition lists is reached by any key: device mode's power key sends the
 * code's list itself, and Watch TV calls it with its own wait. On the test setup's compile the same holds for its
 * three one code devices, and the two code devices' power keys flip their variables. So for a one code device the
 * transition's copy is reached by no key on either file and the activity's is the one heard; the edit changes both
 * and keeps them equal. Asserted below over every key map of both files.
 *
 * The factory television's 170 is not reached, since its own transition holds two waits and the edit refuses the
 * device. An older generation's activity, the bench Harmony 300's, calls its toggle devices' codes the same way,
 * so it needs no rule of its own. The bench 350's configuration for 1.8 has no activity, so the one edit is the
 * whole change there.
 *
 * **Sources checked first.** Logitech's client builds no part of this container. The archive: sections
 * 70, 86, 234, 235 and 263. The reference: `reference/config-format/actions.md` and `state.md`, and the
 * family's `memory.md`. Which architectures: arch 16 alone, both models, two generations of compiler.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FILE_BASED_FAMILY, LAB, require_, skipUnless, skipWithoutLab } from '@harmony/lab';

import { applyEdits, deviceDelays, devices, parse, setPowerOnDelay } from '../src/index.ts';
import { powerOnInstructions, stateVariables, trailerChecksum } from '../src/internal.ts';
import { STATE_WRITE_BASE } from '../src/container/actions.ts';
import { noScreenPowerOnDelayCopies } from '../src/families/harmony-300-350/delay.ts';
import type { Container } from '../src/container/gspm.ts';
import { stateRecords, taggedList } from '../src/container/sections.ts';
import { TRAILER_CHECKSUM_OFFSET } from '../src/container/gspm.ts';
import '../src/support/resources.node.ts';

const CONFIGS = FILE_BASED_FAMILY.full;

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

test('changing a Harmony 300 or 350 delay moves its copies and the trailer checksum, and reads back',
  skipUnless(...CONFIGS), () => {
    let edited = 0;
    let moved = 0;
    for (const name of CONFIGS) {
      const c = parse(require_(name));
      const before = deviceDelays(c);
      for (const delay of before) {
        const wanted = delay.powerOn === 30 ? 31 : 30;
        const edits = setPowerOnDelay(c, delay.group, wanted);
        // The device's own transition first, then one per copy the family names, each one byte.
        assert.equal(edits.length, 1 + noScreenPowerOnDelayCopies(c, delay.group).length, `${name} group ${delay.group}`);
        assert.ok(edits.every((one) => one.bytes.length === 1));
        const report = applyEdits(c, edits);
        const trailer = report.bytes.length - TRAILER_CHECKSUM_OFFSET;
        const at = new Set(edits.map((one) => one.start));
        // Only the delays' bytes and the checksum word differ.
        for (const run of report.changed) {
          for (let i = run.start; i < run.start + run.length; i += 1) {
            assert.ok(at.has(i) || i === trailer || i === trailer + 1,
              `${name} group ${delay.group}: 0x${i.toString(16)} moved`);
          }
        }
        for (const one of at) assert.equal(report.bytes[one], wanted);
        moved += at.size;
        const after = parse(report.bytes);
        assert.equal(after.trailerChecksum, trailerChecksum(report.bytes));
        assert.deepEqual(deviceDelays(after).map((one) => [one.group, one.powerOn]),
          before.map((one) => [one.group, one.group === delay.group ? wanted : one.powerOn]));
        edited += 1;
      }
    }
    assert.equal(edited, 13);
    // 13 transitions and the 7 activity copies of the next test.
    assert.equal(moved, 20);
  });

test('each activity copy of a read delay equals the device\'s, is the one the family names, and the edit changes it too',
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
        // Every other place the same call is followed by a 0x7C for the same device, searched over every list and
        // not only the ones a key reaches, so that a copy the family's rule misses shows here.
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
        // The family's rule names exactly these.
        assert.deepEqual(noScreenPowerOnDelayCopies(c, group), elsewhere.map(({ list, at }) => ({ list, at })),
          `${name} group ${group}`);
        const wanted = found.tenths === 30 ? 31 : 30;
        const after = parse(applyEdits(c, setPowerOnDelay(c, group, wanted)).bytes);
        for (const copy of elsewhere) {
          assert.equal(copy.list, start, `${name} group ${group}: a copy outside the activity`);
          assert.equal(copy.value, found.tenths, `${name} group ${group}: a copy that differs`);
          const changed = after.actionLists()?.[copy.list]?.[copy.at];
          assert.equal((changed?.operand ?? -1) & 0xff, wanted, `${name} group ${group}: the copy did not move`);
          copies += 1;
        }
      }
    }
    // The eighth copy, the factory television's 170, is asserted in the test above; its device the edit refuses.
    assert.equal(copies, 7);
  });

/**
 * The bench Harmony 300's television, set from 50 to 100 tenths in both its copies by hand and heard at the bench:
 * the first Volume Up 11.545 s after the power code against 6.543 s before, `docs/test-notes/harmony-300.md`
 * "The first change". `before.bin` is the unit's own configuration, `h300_programmed_config`; the heard file is
 * the known answer, so the edit has to reproduce it whole.
 */
const DELAY_BEFORE = 'work/300-delay/before.bin';
const DELAY_AFTER = 'work/300-delay/after.bin';

function labFile(path: string): Uint8Array {
  const at = join(LAB!, path);
  // The lab is there, so a missing file fails rather than skips: the claim is about this one file.
  assert.ok(existsSync(at), `${path} is in the lab`);
  return new Uint8Array(readFileSync(at));
}

test('the Harmony 300 television\'s delay set to 100 tenths reproduces the file heard on the bench, byte for byte',
  skipWithoutLab(), () => {
    const before = labFile(DELAY_BEFORE);
    const heard = labFile(DELAY_AFTER);
    const c = parse(before);
    const tv = deviceDelays(c).find((one) => one.group === 0);
    assert.deepEqual([tv?.name, tv?.powerOn], ['Panasonic_TV', 50]);
    const edits = setPowerOnDelay(c, 0, 100);
    // The television's transition and Watch TV's wait after its toggle.
    assert.equal(edits.length, 2);
    assert.deepEqual(applyEdits(c, edits).bytes, heard);
    // The control: without the activity's copy, which is all this edit changed before, the file is not the one
    // heard, at that byte and in the checksum word, here one of its two bytes.
    const transitionOnly = applyEdits(c, edits.slice(0, 1)).bytes;
    const trailer = heard.length - TRAILER_CHECKSUM_OFFSET;
    const differ = [...transitionOnly.keys()].filter((i) => transitionOnly[i] !== heard[i]);
    assert.deepEqual(differ.filter((i) => i < trailer), [edits[1]!.start]);
    assert.equal(differ.length, 2);
    assert.ok(differ.every((i) => i === edits[1]!.start || i === trailer || i === trailer + 1));
  });

/** Logitech's compile of the Harmony 350 test setup, `noscreenactivity.test.ts`. */
const SETUP_COMPILE = 'work/setups/h350-test/compile-Result.EzHex';

test('on the Harmony 350 test setup\'s compile the edit reaches Watch TV\'s copy of its one code device and nothing else',
  skipWithoutLab(), () => {
    const c = parse(labFile(SETUP_COMPILE));
    const lists = c.actionLists() ?? [];
    const watch = activityList(c)!;
    const records = stateRecords(c) ?? [];
    const powerOf = (name: string): number => stateVariables(c).find((one) => one.label === `${name}_Power`)!.index;
    // Every list Watch TV reaches by calls, and whether it flips a variable, a write of it, `activity.ts`.
    const reached = new Set<number>();
    const walk = (list: number): void => {
      if (reached.has(list)) return;
      reached.add(list);
      for (const one of lists[list] ?? []) if (one.opcode === 0x7f) walk(one.operand);
    };
    walk(watch);
    const flips = (variable: number): boolean => [...reached]
      .some((list) => (lists[list] ?? []).some((one) => one.opcode === STATE_WRITE_BASE + variable));
    // Per device with one delay: its power codes, how Watch TV reaches it, and how many bytes the edit moves.
    const seen: Record<string, [string, string, string[]]> = {};
    for (const delay of deviceDelays(c)) {
      const values = records[powerOf(delay.name!)]!.values;
      const on = values.find((one) => one.from === 0 && one.to === 1)!;
      const off = values.find((one) => one.from === 1 && one.to === 0)!;
      const call = lists[on.operand]![0]!;
      // One code: switching on calls the very list switching off runs.
      const kind = call.operand === off.operand ? 'one code' : 'two codes';
      const route = lists[watch]!.some((one) => one.opcode === 0x7f && one.operand === call.operand) ? 'calls its code'
        : flips(powerOf(delay.name!)) ? 'flips its variable' : 'not in Watch TV';
      // Each byte the edit moves, named by where it is: the quantity of the device's own switch on list's `0x7C`,
      // or of a `0x7C` naming the device right after Watch TV's call of its code, both located here by hand.
      const own = powerOnInstructions(c).get(delay.group)!;
      const names = new Map<number, string>([[quantityOffset(c, own.list, own.at), 'its transition']]);
      lists[watch]!.forEach((one, k) => {
        const next = lists[watch]![k + 1];
        if (one.opcode === 0x7f && one.operand === call.operand && next?.opcode === 0x7c && next.operand >> 8 === delay.group) {
          names.set(quantityOffset(c, watch, k + 1), 'Watch TV');
        }
      });
      const report = applyEdits(c, setPowerOnDelay(c, delay.group, delay.powerOn === 30 ? 31 : 30));
      const trailer = report.bytes.length - TRAILER_CHECKSUM_OFFSET;
      const moved = report.changed.flatMap((run) => Array.from({ length: run.length }, (_, k) => run.start + k))
        .filter((i) => i !== trailer && i !== trailer + 1);
      seen[delay.name!] = [kind, route, moved.map((i) => names.get(i) ?? `0x${i.toString(16)}`)];
    }
    // The two code devices Watch TV switches are reached through their variables, whose switch on list is the one
    // copy; the one code device it switches has its second copy in Watch TV; the one code devices it leaves out
    // have one copy, so the rule is about what Watch TV holds and not about the kind of device.
    assert.deepEqual(seen, {
      LG_TV: ['two codes', 'flips its variable', ['its transition']],
      Plasma: ['two codes', 'not in Watch TV', ['its transition']],
      Denon: ['two codes', 'flips its variable', ['its transition']],
      KPN: ['one code', 'calls its code', ['Watch TV', 'its transition']],
      Kodi: ['one code', 'not in Watch TV', ['its transition']],
      Switch: ['two codes', 'not in Watch TV', ['its transition']],
      Sony_HT: ['one code', 'not in Watch TV', ['its transition']],
    });
    // The KPN's second byte is Watch TV's wait after its toggle, the list's fourth instruction.
    const kpn = deviceDelays(c).find((one) => one.name === 'KPN')!;
    assert.deepEqual(noScreenPowerOnDelayCopies(c, kpn.group), [{ list: watch, at: 3 }]);
    // The control: the KPN's edit without the activity's copy leaves Watch TV waiting the old 15.
    const without = parse(applyEdits(c, setPowerOnDelay(c, kpn.group, 30).slice(0, 1)).bytes);
    assert.equal((without.actionLists()![watch]![3]!.operand) & 0xff, 15);
  });

/** The file offset of the quantity byte of instruction `at` of action list `list`, located by hand. */
function quantityOffset(c: Container, list: number, at: number): number {
  return c.blobOffsetOf(c.pointerArray(7)![list]! + 1 + 3 * at)!;
}

/**
 * Every list reached from `starts`, following calls and, where a list writes a state variable, that variable's
 * transitions: a write of a device's `Power` is what runs its switch on list. Conditions are not evaluated, so
 * this is every list that could run, the conservative side for a claim that a list is reached by nothing.
 */
function reachedFrom(c: Container, starts: readonly { opcode: number; operand: number }[]): Set<number> {
  const lists = c.actionLists() ?? [];
  const records = stateRecords(c) ?? [];
  const seen = new Set<number>();
  const written = new Set<number>();
  const run = (one: { opcode: number; operand: number }): void => {
    if (one.opcode === 0x7f && !seen.has(one.operand)) {
      seen.add(one.operand);
      for (const next of lists[one.operand] ?? []) run(next);
    }
    if (one.opcode >= STATE_WRITE_BASE && !written.has(one.opcode - STATE_WRITE_BASE)) {
      written.add(one.opcode - STATE_WRITE_BASE);
      for (const transition of records[one.opcode - STATE_WRITE_BASE]?.values ?? []) run(transition);
    }
  };
  starts.forEach(run);
  return seen;
}

test('every wait Watch TV can reach is a send\'s, a device\'s own switch on, a copy the family names, or the refused 170',
  skipUnless(...CONFIGS), () => {
    // Independent of the rule's pattern: every `0x7C` in every list Watch TV could run, classified.
    const kinds: Record<string, number[]> = {};
    for (const name of CONFIGS) {
      const c = parse(require_(name));
      const lists = c.actionLists() ?? [];
      const named = new Set<string>();
      const own = new Set<string>();
      for (const [group, found] of powerOnInstructions(c)) {
        own.add(`${found.list}:${found.at}`);
        for (const copy of noScreenPowerOnDelayCopies(c, group)) named.add(`${copy.list}:${copy.at}`);
      }
      for (const list of reachedFrom(c, [{ opcode: 0x7f, operand: activityList(c)! }])) {
        (lists[list] ?? []).forEach((one, k) => {
          if (one.opcode !== 0x7c) return;
          const kind = named.has(`${list}:${k}`) ? 'a copy the family names'
            : own.has(`${list}:${k}`) ? 'a device\'s own switch on'
              : lists[list]![k - 1]?.opcode === 0x7d ? 'after a send' : `${name} other`;
          (kinds[kind] ??= []).push(one.operand & 0xff);
        });
      }
    }
    const sorted = Object.fromEntries(Object.entries(kinds).map(([kind, values]) => [kind, values.sort((a, b) => a - b)]));
    assert.deepEqual(sorted, {
      'a copy the family names': [15, 15, 15, 15, 15, 50, 50],
      'a device\'s own switch on': [80, 80],
      // A send's own wait, one or three tenths: never a power on delay.
      'after a send': [...Array(14).fill(1), 3, 3],
      // The factory television's, whose own transition holds 100 and 70 and whose device the edit refuses.
      'h350_config other': [170],
    });
  });

test('a one code device\'s switch on list is reached by no key, so the copy a key reaches is Watch TV\'s',
  skipWithoutLab(), () => {
    const reach: Record<string, boolean> = {};
    for (const [file, path] of [['300', DELAY_BEFORE], ['350', SETUP_COMPILE]] as const) {
      const c = parse(labFile(path));
      // Every binding of every key map, raw slot 6, entry 0 the key table every press falls through to.
      const keys = (c.pointerArray(6) ?? []).flatMap((address) => taggedList(c, address)?.entries ?? []);
      const reached = reachedFrom(c, keys);
      for (const delay of deviceDelays(c)) {
        reach[`${file} ${delay.name}`] = reached.has(powerOnInstructions(c).get(delay.group)!.list);
      }
    }
    // The Harmony 300's four devices and the test setup's KPN, Kodi and Sony have one code; the rest two.
    assert.deepEqual(reach, {
      '300 Panasonic_TV': false, '300 KPN': false, '300 Panasonic_DVD': false, '300 Sony_VCR': false,
      '350 LG_TV': true, '350 Plasma': true, '350 Denon': true, '350 KPN': false, '350 Kodi': false,
      '350 Switch': true, '350 Sony_HT': false,
    });
  });
