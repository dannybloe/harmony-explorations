/**
 * The Harmony 350's first full bench test, `todo-compile-350.md` 3.3, held against the file it tests.
 *
 * **What this is for.** `packages/bench/irtests/350-3-3-logitech-setup.json` tells the person at the bench
 * which keys to press and what the receiver should hear. Every expectation in it was derived from the
 * configuration the bench Harmony 350 holds, Logitech's own compile of the test setup, the lab's
 * `work/setups/h350-test/compile-Result.EzHex`, before the run. This file is that derivation kept as a test:
 * it presses the same keys on a model of the remote built from the file and fails if the JSON names
 * anything the file would not send, in another order, or leaves something out. So the JSON cannot drift
 * from the file, and a run that disagrees with it disagrees with the file.
 *
 * **The model is the file's own instructions, walked.** A key raises an event, press `0x80 | scan`, release
 * `0x40 | scan` and, for a key held about a second, the held event `0xC0 | scan` and no release
 * (`tests/test_harmony_350_long_press.py`). The event is looked up in the selected key map, raw slot 6,
 * and then in entry 0, the key table every press falls through to (`reference/architectures/harmony-300-350/
 * memory.md`). A binding is one instruction, almost always `0x7F`, a call of a raw slot 7 action list. In a
 * list: `0x7D` sends, its operand the infrared group and the code; `0x1F` band `0xFF` selects a key map;
 * `0x1F` band `0xFB` loads the byte register; `0x71` compares the register with a state variable, with one
 * or two arms after it; `0x80 | n` writes state variable `n` and fires its matching transitions, raw slot 9,
 * at once (`reference/config-format/actions.md` and `state.md`). Delays (`0x7C`), the light pins and timers
 * (`0x1F` bands `0xE9` and `0xEB`) and the timer cancel (`0x07 0xFFFB`) send nothing and are passed over.
 * A favourite channel is `0x7A`, which loads the accumulator with the channel, then `0x1F` band `0xF3`, which
 * hands it to that record of the number sender, raw slot 11: the record adds its base, writes the sum in
 * decimal with at least its minimum of digits, and queues its first instruction, one instruction per digit
 * out of its digit tables, and its last (`reference/config-format/state.md`, base slot 16). A channel with
 * a leading zero is not a number there, and the compile spells it out as one list per digit instead.
 * **Any other instruction on a path a press reaches throws**, so the model cannot skip something that sends.
 *
 * **What it rests on that is not this family's own reading.** Which transitions a write fires was read on
 * the Harmony 600, 650 and One images and not on this family's; the Denon's input is sent by a write of the
 * value its variable already holds, through a transition from any value (`-2`), which only that reading
 * makes fire. Whether a power on delay holds back codes to other devices is not checked on this image
 * either, which is why the JSON states an order and no pauses: the order is the same either way.
 *
 * **Two compiles of one record.** The first compile, kept in the lab as `work/setups/h350-test/
 * first-compile/compile-Result.EzHex`, followed a save of the five favourite channels through the
 * service's button map call, and bound none of them: its KPN map binds seven keys and its number sender
 * holds no record. The record was compiled again after the same five channels were saved through
 * MyHarmony's own favourite channel screen, and that compile is the file at `BENCH_FILE`. A test below
 * holds what changed between the two: the KPN's map gains the five favourite keys, the number sender gains
 * one record, and five action lists are added; every other key map, every state variable with its
 * transitions, and all 250 infrared codes are the same. The KPN's map still binds no channel key and no
 * digit, so Channel Up and the digits send nothing in its mode.
 *
 * **Which favourite key is which code.** The file binds the five channels to codes 8, 9, 11, 34 and 2, in
 * the order they were entered, 1, 2, 3, 666 and 07. Code 2 is favourite 5, heard on a unit
 * (`tests/test_harmony_350_keys.py`), and the order of the other four keys was open. The steps predicted
 * that favourite keys 1 to 4 are codes 8, 9, 11 and 34, the order the channels were entered in, which is
 * what `SCAN` below states; since each code sends a channel of its own, the channel heard names the code
 * whatever the prediction, so the run settles it either way. It settled it as predicted, below.
 *
 * ## The runs, `todo-compile-350.md` 3.3
 *
 * **What was done.** The compile was written to the bench Harmony 350 through `write-file-config.ts`, with
 * the first compile named as the backup since the remote held it. The first attempt found no remote of the
 * family attached and the second got no reply to its first request, neither writing anything; the third
 * wrote 39 chunks, the check answered `m`, the read back was identical less the end marker and the reboot
 * was sent (the write logs sit beside the compile in the lab). Then the bench test was run with the Flirc,
 * twice: the lab's `h350_logitech_setup_ir` and `h350_logitech_setup_ir_2`. A run between the two heard
 * presses in step 1 only and is not a sample.
 *
 * **The first run's stored verdicts are wrong, and not because of the remote.** The bench server that
 * recorded it was started before `BENCH_CONFIGS` named this compile, so the monitor matched every frame
 * against the other bench remotes only: the run's stored matches name six other files and never this one.
 * A code only this file holds, the Knoll's, the Switch's, the Sony's, the Denon's two power codes and the
 * KPN's DVR, went unrecognised, and seven steps failed, 2, 6, 7, 8, 10, 11 and 14. The second run was made
 * after the server was restarted and its stored verdicts pass. **So these tests never read a stored match
 * or verdict as the result**: `rematched` builds a `CodeBook` holding this compile alone, matches every
 * press again from the pulses the receiver reported, and `judge` decides each step afresh. Both runs pass
 * 20 of 20 that way, 35 expectations and the silent step 13. **The control on that method** is the second
 * run: judged again, it gives the verdicts its own monitor stored, word for word.
 *
 * **What the tester noted in the second run**, and what was heard: a 9 pressed by accident in step 4, heard
 * as Kodi's 9 between two of Kodi's Enter, the second of which no note explains; Input pressed first in step
 * 16, heard as the television's Input before favourite 2's channel; and Watch TV perhaps pressed twice in
 * step 11, of which one sequence was heard and no second. None of these presses is held to anything.
 *
 * **Which code each key raised.** `fitting` asks, for every key the runs pressed where something was heard,
 * which of the 56 codes raised in its place at that point of the run gives what the receiver heard, and the
 * two runs agree on every key. **Favourites 1 to 4 are codes 8, 9, 11 and 34**: favourite 1 sent the KPN's
 * 1, favourite 2 its 2, favourite 3 its 3 and favourite 4 three 6s, and favourite 5 its 0 then 7, as
 * already known. Menu is 10, Enter 54, Watch TV 6, and the top right and bottom right device keys 1 and 4,
 * short press and long, none of which had been heard on a Harmony 350 before; every other key came out on
 * the code it already had. **DVR is not decided**: the KPN's code 14, which DVR's binding sends, and its code
 * 11, which OK's sends, are the same bytes in every block, so DVR's press fits 16 and 50 alike. It agrees
 * with 16, and OK is 50 by the first bench run, but the drawing takes a code only from a press that decides
 * it. The first run heard that frame twice in step 7, 3.8 s apart, where the step asked for one.
 *
 * **Every device key's long press selected its second device**, the Knoll, Kodi, the Switch and the Sony:
 * the held event, read in the firmware and one configuration (`tests/test_harmony_350_long_press.py`),
 * watched on a unit. Each groups as `4 + place`, a second configuration with that rule. How long each key
 * was held is not recorded, about two seconds being what the step asked; whether one second suffices was
 * not tried.
 *
 * **In Watch TV, a power on delay held back no power code to another device.** From everything off it sent
 * the TV's PowerOn, then the Denon's power on, arriving 0.19 s later although the TV's wait is ten seconds,
 * then the KPN's toggle 0.50 s after that although the Denon's wait is two, and the Denon's own input
 * 2.54 s after its power code: the same in both runs to within three milliseconds. These are the host's
 * arrival times, `atMs`, so each frame's own length sits in them; start to start the first is about a
 * twentieth of a second longer and the last as much shorter, which leaves every comparison with a wait as
 * it is. That is the case the family's memory page listed as not checked, measured once per run in one
 * activity, and only for power codes: a key pressed for another device inside a wait was not tried.
 *
 * **The KPN's digits of a favourite arrive a third of a second apart**, not the tenth the bench test's text
 * gave. The file waits one tenth after each digit, the `0x7C` of 1 in every digit list; heard, each digit is
 * its frame and one repeat, the next arrives 0.32 to 0.33 s after it, and 0.21 s of silence separates them.
 * That is past the monitor's 200 ms repeat window, so 666 read as three presses where the bench test
 * allowed for one with repeats. What fills the difference between the tenth and the silence was not traced,
 * and another device's digits, of another length, would arrive another distance apart.
 *
 * **Sources checked first**: this file's model and the compile, `reference/remotes/harmony-350/keys.md`,
 * the family's `memory.md` and `firmware.md`, `tests/test_harmony_350_keys.py` and `keys350.test.ts`. The
 * decompiled client was not read for this: it says nothing about which key raises which code on a unit.
 *
 * **Which architectures.** The Harmony 350 alone, one file, the one on the bench unit, and one unit. The
 * Harmony 300 shares the image and the moulding, and nothing here was pressed on one.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  bytes, devices, irBlockWords, irGroups, irHeaderPointers, numberSenders, parse, stateRecords, taggedList,
  type Container,
} from '@harmony/codec';
import { IR_ARCHIVE, LAB, needing, require_, skipUnless, skipWithoutIrArchive, skipWithoutLab } from '@harmony/lab';

import { BENCH_CONFIGS, CodeBook, REPEAT_WINDOW_US } from '../src/irmonitor.ts';
import {
  judge, testDefinitions, type Expectation, type RunPress, type TestDefinition, type Verdict,
} from '../src/irsession.ts';

/** The file, by its path in the lab, which is also the name the monitor gives it in `BENCH_CONFIGS`. */
const BENCH_FILE = 'work/setups/h350-test/compile-Result.EzHex';

/** The first compile of the same record, which bound no favourite channel, kept beside it. */
const FIRST_COMPILE = 'work/setups/h350-test/first-compile/compile-Result.EzHex';

/** The bench test this file pins. */
const DEFINITION_ID = '350-3-3-logitech-setup';

/**
 * The scan code of every key the bench test presses, by the drawing's key name.
 *
 * The codes are the reference's, `reference/remotes/harmony-350/keys.md`, and `packages/bench/test/
 * keys350.test.ts` is where they are argued. A test below holds this table against the drawing for every
 * key the drawing carries a code for, which is all of them but DVR.
 *
 * **Favourites 1 to 4 were a prediction when this was written**, each one of the four codes in
 * `FAVOURITES_1_TO_4`: the order the channels were entered in. Both runs heard it so, the tests at the end.
 */
const SCAN: Readonly<Record<string, number>> = {
  CablePc: 1, Favorite5: 2, Power: 3, DvdMusic: 4, TvMedia: 5, WatchTV: 6, AvrGame: 7, Favorite1: 8,
  Favorite2: 9, Menu: 10, Favorite3: 11, Dvr: 16, Number1: 24, PrevChannel: 32, Favorite4: 34, Info: 36,
  Stop: 40, VolumeUp: 49, DirectionUp: 51, Enter: 54, ChannelUp: 55,
};

/** Favourites 1 to 4, in that order: the codes no configuration orders, heard in this order by the runs. */
const FAVOURITES_1_TO_4 = [8, 9, 11, 34] as const;

/**
 * What a person does with one key, named by the drawing's key name, or by a scan code where the run is asked
 * which code a pressed key raised.
 */
type Key = string | number;
type Action =
  | { readonly short: Key }
  | { readonly long: Key }
  | { readonly press: Key }
  // Press Power in the selected mode, and once more if that press switched the device on: what the bench
  // test asks for as "stop when the last thing heard is its power off". Only the last press is expected.
  | { readonly powerOff: true };

/**
 * What each step of the bench test does, in the JSON's order, one entry per step.
 *
 * The instructions are prose for a person, so the keys they name are restated here for the model; the
 * first test checks that the two have the same number of steps, and the step text is quoted in failures.
 */
const STEPS: readonly (readonly Action[])[] = [
  [{ short: 'TvMedia' }, { press: 'VolumeUp' }, { press: 'Info' }],
  [{ long: 'TvMedia' }, { press: 'VolumeUp' }, { press: 'DirectionUp' }],
  [{ short: 'CablePc' }, { press: 'VolumeUp' }, { press: 'Menu' }],
  [{ long: 'CablePc' }, { press: 'VolumeUp' }, { press: 'Enter' }],
  [{ short: 'AvrGame' }, { press: 'VolumeUp' }, { press: 'Info' }],
  [{ long: 'AvrGame' }, { press: 'VolumeUp' }, { press: 'Number1' }],
  [{ short: 'DvdMusic' }, { press: 'VolumeUp' }, { press: 'PrevChannel' }, { press: 'Dvr' }],
  [{ long: 'DvdMusic' }, { press: 'VolumeUp' }, { press: 'Stop' }],
  [{ short: 'TvMedia' }, { powerOff: true }],
  [{ short: 'AvrGame' }, { powerOff: true }],
  [{ press: 'WatchTV' }],
  [{ press: 'VolumeUp' }, { press: 'PrevChannel' }],
  [{ press: 'ChannelUp' }, { press: 'Number1' }],
  [{ press: 'WatchTV' }],
  [{ press: 'Favorite1' }],
  [{ press: 'Favorite2' }],
  [{ press: 'Favorite3' }],
  [{ press: 'Favorite4' }],
  [{ press: 'Favorite5' }],
  [{ short: 'TvMedia' }, { press: 'VolumeUp' }],
];

/** Event types in the top two bits of a key map tag. */
const PRESS = 0x80;
const RELEASE = 0x40;
const HELD = 0xC0;

/** One instruction, as raw slot 7 and the key maps hold it: a `u16` operand, low byte first, and an opcode. */
interface Instruction { readonly operand: number; readonly opcode: number }

/** A code the remote sends: its infrared group, which is the device, and its number in that group. */
interface Send { readonly group: number; readonly code: number }

/**
 * The remote, as far as the file decides what it sends: the selected key map and the state variables.
 *
 * The state starts at each variable's `first`, which the firmware seeds from on a cold start; whether the
 * bench unit's restart after the write seeded them is not known, which is why the bench test sets the two
 * power states it depends on before Watch TV.
 */
class Remote {
  private map: number | undefined;
  private register = 0;
  private accumulator = 0;
  private silent = false;
  private readonly values: number[];
  private readonly records: NonNullable<ReturnType<typeof stateRecords>>;
  private readonly maps: Map<number, Instruction>[];
  /** The writes the last key made, for the Power step that presses again when it switched something on. */
  writes: { index: number; value: number }[] = [];

  private readonly c: Container;

  constructor(c: Container) {
    this.c = c;
    this.records = stateRecords(c)!;
    this.values = this.records.map((one) => one.first);
    this.maps = c.pointerArray(6)!.map((address) => new Map(taggedList(c, address)!.entries
      .map((one) => [one.tag, { operand: one.operand, opcode: one.opcode }] as const)));
  }

  /** A key's events in the order the firmware raises them, and what they sent. */
  act(action: Action): Send[] {
    this.writes = [];
    const code = (key: Key): number => (typeof key === 'number' ? key : SCAN[key]!);
    if ('short' in action) return [...this.event(PRESS | code(action.short)), ...this.event(RELEASE | code(action.short))];
    if ('long' in action) return [...this.event(PRESS | code(action.long)), ...this.event(HELD | code(action.long))];
    if ('press' in action) return [...this.event(PRESS | code(action.press)), ...this.event(RELEASE | code(action.press))];
    const first = this.act({ press: 'Power' });
    // Pressed again only when the first press switched a device on, as the instruction says.
    return this.writes.some((one) => one.value === 1) ? this.act({ press: 'Power' }) : first;
  }

  /** The selected map first, then entry 0, the first that binds the tag. */
  private event(tag: number): Send[] {
    const binding = (this.map === undefined ? undefined : this.maps[this.map]!.get(tag)) ?? this.maps[0]!.get(tag);
    const out: Send[] = [];
    if (binding !== undefined) this.run([binding], out);
    return out;
  }

  private list(index: number): Instruction[] {
    const at = this.c.blobOffsetOf(this.c.pointerArray(7)![index]!)!;
    return Array.from({ length: bytes.u8(this.c.blob, at) }, (_, k) => ({
      operand: bytes.u16(this.c.blob, at + 1 + 3 * k), opcode: bytes.u8(this.c.blob, at + 3 + 3 * k),
    }));
  }

  /** A run of instructions in order, with a `0x71` taking the one or two after it as its arms. */
  private run(body: readonly Instruction[], out: Send[]): void {
    for (let i = 0; i < body.length; i += 1) {
      const one = body[i]!;
      if (one.opcode !== 0x71) {
        this.step(one, out);
        continue;
      }
      const variable = one.operand & 0xFF;
      const operation = (one.operand >> 8) & 0x0F;
      assert.ok(operation === 0 || operation === 1, `a 0x71 comparison ${operation} the model does not read`);
      const holds = operation === 0 ? this.register === this.values[variable] : this.register !== this.values[variable];
      if ((one.operand & 0x8000) !== 0) {
        this.step(holds ? body[i + 1]! : body[i + 2]!, out);
        i += 2;
      } else {
        if (holds) this.step(body[i + 1]!, out);
        i += 1;
      }
    }
  }

  private step(one: Instruction, out: Send[]): void {
    const { operand, opcode } = one;
    const band = operand >> 8;
    if (opcode === 0x7F) this.run(this.list(operand), out);
    else if (opcode === 0x7D) out.push({ group: band, code: operand & 0xFF });
    else if (opcode === 0x7C || opcode === 0x00) return;
    else if (opcode === 0x07 && operand === 0xFFFF) this.silent = true;
    else if (opcode === 0x07 && operand === 0xFFFB) return;
    else if (opcode === 0x1F && band === 0xFB) this.register = operand & 0xFF;
    else if (opcode === 0x1F && band === 0xFF) this.map = operand & 0xFF;
    else if (opcode === 0x1F && (band === 0xE9 || band === 0xEB)) return;
    else if (opcode === 0x7A) this.accumulator = operand;
    else if (opcode === 0x1F && band === 0xF3) this.sendNumber(operand & 0xFF, out);
    else if (opcode >= 0x80) this.write(opcode & 0x7F, operand, out);
    else assert.fail(`an instruction the model does not read: ${opcode.toString(16)} ${operand.toString(16)}`);
  }

  /**
   * `0x1F` band `0xF3`: the number sender's record, given the accumulator.
   *
   * The prefix fires only with `flags` bit 1 or 2, and which of the three digit tables a lone digit takes is
   * not stated, so the model refuses a record that needs either answer: on this file `flags` is 0 and the
   * three tables are the same thirty bytes, which a test below asserts.
   */
  private sendNumber(index: number, out: Send[]): void {
    const record = numberSenders(this.c)!.records[index]!;
    assert.equal(record.flags & 0x06, 0, 'a number sender whose prefix can fire');
    const [first, middle, last] = record.tables.map((one) => JSON.stringify(one.instructions));
    assert.ok(first === middle && middle === last, 'three different digit tables');
    const digits = String(this.accumulator + record.base).padStart(record.digits, '0');
    this.step(record.prologue, out);
    for (const digit of digits) this.step(record.tables[0]!.instructions[Number(digit)]!, out);
    this.step(record.epilogue, out);
  }

  /** `0x80 | n`: store, then fire every transition whose `from` and `to` match, in record order. */
  private write(index: number, value: number, out: Send[]): void {
    const old = this.values[index]!;
    this.values[index] = value;
    this.writes.push({ index, value });
    if (this.silent) {
      this.silent = false;
      return;
    }
    const matches = (end: number, against: number): boolean =>
      end === against || end === -2 || (end === -3 && old !== value);
    for (const one of this.records[index]!.values) {
      if (matches(one.from, old) && matches(one.to, value)) this.step({ operand: one.operand, opcode: one.opcode }, out);
    }
  }
}

function definition(): TestDefinition {
  const found = testDefinitions(fileURLToPath(new URL('../irtests/', import.meta.url)))
    .concat(testDefinitions(fileURLToPath(new URL('../irtests/done/', import.meta.url))))
    .find((one) => one.id === DEFINITION_ID);
  assert.ok(found, `${DEFINITION_ID}.json in irtests/ or irtests/done/`);
  return found.definition;
}

function container(file = BENCH_FILE): { c: Container; blob: Uint8Array } {
  const path = join(LAB!, file);
  // The lab is there, so a missing file fails rather than skips: the claim is about this one file.
  assert.ok(existsSync(path), `${file} is in the lab`);
  const blob = new Uint8Array(readFileSync(path));
  return { c: parse(blob), blob };
}

/** Every step's sends, from the file, as `device code` so a literal table can be read. */
function derived(c: Container): Send[][] {
  const remote = new Remote(c);
  return STEPS.map((actions) => {
    const lastOnly = actions.some((one) => 'powerOff' in one);
    const sends = actions.map((one) => remote.act(one));
    return lastOnly ? sends[sends.length - 1]! : sends.flat();
  });
}

test('the key table the bench test uses agrees with the drawing wherever the drawing carries a code', () => {
  const svg = readFileSync(fileURLToPath(new URL('../../../reference/silhouettes/h350.svg', import.meta.url)), 'utf8');
  const drawn = Object.fromEntries([...svg.matchAll(/data-name="(\w+)"[^>]*? data-scan="(\d+)"/g)]
    .map((m) => [m[1]!, Number(m[2])]));
  for (const [key, scan] of Object.entries(SCAN)) if (drawn[key] !== undefined) assert.equal(drawn[key], scan, key);
  // The one key this run presses that the drawing gives no code to: DVR, whose press fits two codes. The
  // drawing lacked ten until the runs heard the other nine.
  assert.deepEqual(Object.keys(SCAN).filter((key) => drawn[key] === undefined), ['Dvr']);
  // Favourites 1 to 4 carry the four codes the configurations left them, in the order the channels were entered.
  assert.deepEqual([1, 2, 3, 4].map((n) => drawn[`Favorite${n}`]), [...FAVOURITES_1_TO_4]);
  assert.deepEqual([1, 2, 3, 4].map((n) => SCAN[`Favorite${n}`]), [...FAVOURITES_1_TO_4]);
});

test('the bench test has one step per entry of the model, and names this file wherever it names a code', () => {
  // The monitor names a code only from a file it loads, so the file is one of the bench's.
  assert.ok(BENCH_CONFIGS.includes(BENCH_FILE));
  const steps = definition().steps;
  assert.equal(steps.length, STEPS.length);
  for (const step of steps) {
    for (const want of step.expect ?? []) {
      if (want.code !== undefined) assert.equal(want.config, BENCH_FILE, step.instruction);
      // No count: the monitor folds a frame within 200 ms of the same code into the press before it, so
      // the three 6s of channel 666 may read as one press with repeats, and one is what is expected.
      assert.equal(want.times, undefined, 'no count');
      assert.equal(want.pauseMs, undefined, 'no pause is predicted on this image');
    }
  }
});

test('Logitech\'s compile of the test setup sends exactly these codes for the bench test\'s presses', needing(skipWithoutLab()), () => {
  const { c } = container();
  const names = new Map(devices(c).map((one) => [one.group, one.name]));
  const read = derived(c).map((sends) => sends.map((one) => `${names.get(one.group)} ${one.code}`));
  assert.deepEqual(read, [
    ['LG_TV 1', 'LG_TV 15'],
    ['Denon 14', 'Knoll 3'],
    ['Plasma 42', 'Plasma 32'],
    ['Denon 14', 'Kodi 15'],
    ['Denon 14', 'Denon 11'],
    ['Denon 14', 'Switch 1'],
    ['Denon 14', 'KPN 4', 'KPN 14'],
    ['Denon 14', 'Sony_HT 20'],
    ['LG_TV 49'],
    ['Denon 12'],
    // Watch TV from everything off: the TV on, the Denon on, the KPN's toggle, and the Denon's input,
    // which the activity's flag sends once it is set. No input goes to the TV.
    ['LG_TV 38', 'Denon 6', 'KPN 9', 'Denon 31'],
    ['Denon 14', 'KPN 4'],
    [],
    // And again: the TV off, the Denon off, the KPN's toggle, and no input.
    ['LG_TV 49', 'Denon 12', 'KPN 9'],
    // The five favourites in the KPN's mode, which Watch TV left the remote in: channels 1, 2 and 3 as one
    // digit each, 666 as three, and 07 as its two digits, the leading zero included. Nothing follows the
    // digits, since the number sender's last instruction is empty. The KPN's 1 is code 12, 2 is 13, 3 is
    // 8, 6 is 3, 0 is 10 and 7 is 5.
    ['KPN 12'],
    ['KPN 13'],
    ['KPN 8'],
    ['KPN 3', 'KPN 3', 'KPN 3'],
    ['KPN 10', 'KPN 5'],
    ['LG_TV 1'],
  ]);
  // The groups follow the keys' places, 4 + place for a long press: the LG TV 0, Plasma 1, Denon 2, KPN 3,
  // Knoll 4, Kodi 5, Switch 6 and Sony HT 7, top left, top right, bottom left and bottom right.
  assert.deepEqual(devices(c).map((one) => `${one.group} ${one.name}`),
    ['0 LG_TV', '1 Plasma', '2 Denon', '3 KPN', '4 Knoll', '5 Kodi', '6 Switch', '7 Sony_HT']);
});

/** An instruction with every list it calls written out in place, so two files compare by content and not by list number. */
function spelled(c: Container, one: Instruction, depth = 0): string {
  const head = `${one.opcode.toString(16)}:${one.opcode === 0x7F ? 'call' : one.operand.toString(16)}`;
  if (one.opcode !== 0x7F || depth > 8) return head;
  const at = c.blobOffsetOf(c.pointerArray(7)![one.operand]!)!;
  const body = Array.from({ length: bytes.u8(c.blob, at) }, (_, k) => spelled(c, {
    operand: bytes.u16(c.blob, at + 1 + 3 * k), opcode: bytes.u8(c.blob, at + 3 + 3 * k),
  }, depth + 1));
  return `${head}(${body.join(' ')})`;
}

/** Per key map, its bindings by tag, spelled out. */
function spelledMaps(c: Container): Map<number, string>[] {
  return c.pointerArray(6)!.map((address) => new Map(taggedList(c, address)!.entries
    .map((one) => [one.tag, spelled(c, one)] as const)));
}

/** Every number loaded for the number sender, `0x7A` then `0x1F` band `0xF3`, by the tag that does it. */
function favourites(c: Container): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [entry, map] of spelledMaps(c).entries()) {
    for (const [tag, body] of map) {
      const load = /7a:([0-9a-f]+) 1f:f3/.exec(body);
      if (load !== null) out[`map ${entry} tag ${tag.toString(16)}`] = parseInt(load[1]!, 16);
    }
  }
  return out;
}

test('the KPN\'s favourite keys send 1, 2 and 3 through the number sender, 666 too, and 07 digit by digit', needing(skipWithoutLab()), () => {
  const { c } = container();
  const maps = spelledMaps(c);
  // Nine maps: the key table and one per device.
  assert.equal(maps.length, 9);
  // The KPN's map is the one DVD/Music's release selects, entry 3, and Watch TV's press ends there too.
  assert.match(maps[0]!.get(RELEASE | SCAN['DvdMusic']!)!, /1f:ff03\)$/);
  assert.match(maps[0]!.get(PRESS | SCAN['WatchTV']!)!, /1f:ff03\)$/);
  // Twelve tags: the seven of the first compile and the five favourite keys' presses.
  assert.deepEqual([...maps[3]!.keys()].map((tag) => tag & 0x3F).sort((a, b) => a - b),
    [2, 3, 8, 9, 11, 16, 32, 34, 35, 49, 50, 52]);
  // Four favourites load a number for the number sender's record 0, all in the KPN's map, and no other
  // binding anywhere does.
  assert.deepEqual(favourites(c), { 'map 3 tag 88': 1, 'map 3 tag 89': 2, 'map 3 tag 8b': 3, 'map 3 tag a2': 666 });
  assert.match(maps[3]!.get(PRESS | 8)!, /1f:f300\)$/);
  // The fifth, 07, is two calls, each of one digit's list, and no number: a leading zero is not a number.
  assert.equal(maps[3]!.get(PRESS | 2), '7f:call(7f:call(7:fffb 7d:30a 7c:301) 7f:call(7:fffb 7d:305 7c:301))');
  // Codes 8, 9, 11 and 34 are bound by no other map with any event type, so each sends in the KPN's mode only.
  for (const scan of FAVOURITES_1_TO_4) {
    assert.deepEqual(maps.flatMap((map, at) => [...map.keys()].filter((tag) => (tag & 0x3F) === scan).map(() => at)), [3]);
  }
  // The number sender: one record, nothing added to the number, no minimum of digits, no prefix, empty
  // first and last instructions, and three digit tables that are the same ten calls, digit d sending the
  // KPN's own d. What the digit lists send is the literal table above.
  const record = numberSenders(c)!.records;
  assert.equal(record.length, 1);
  assert.deepEqual([record[0]!.flags, record[0]!.base, record[0]!.digits], [0, 0, 0]);
  assert.deepEqual([record[0]!.prologue, record[0]!.epilogue, record[0]!.prefix].map((one) => one.opcode), [0, 0, 0]);
  const tables = record[0]!.tables.map((table) => table.instructions.map((one) => spelled(c, one)));
  assert.equal(tables.length, 3);
  assert.deepEqual(tables[1], tables[0]);
  assert.deepEqual(tables[2], tables[0]);
  assert.deepEqual(tables[0], [10, 12, 13, 8, 0, 2, 3, 5, 1, 7]
    .map((code) => `7f:call(7:fffb 7d:3${code.toString(16).padStart(2, '0')} 7c:301)`));
});

test('the first compile bound no favourite, and the second differs from it in the KPN\'s map and the number sender alone',
  needing(skipWithoutLab()), () => {
    const first = container(FIRST_COMPILE).c;
    const second = container().c;
    // The first compile: no favourite channel anywhere, the KPN's map at seven tags, no number sender record.
    assert.deepEqual(favourites(first), {});
    assert.deepEqual([...spelledMaps(first)[3]!.keys()].map((tag) => tag & 0x3F).sort((a, b) => a - b),
      [3, 16, 32, 35, 49, 50, 52]);
    assert.equal(numberSenders(first)!.records.length, 0);
    for (const scan of FAVOURITES_1_TO_4) {
      assert.ok(spelledMaps(first).every((map) => [...map.keys()].every((tag) => (tag & 0x3F) !== scan)));
    }
    // Every map but the KPN's is the same, binding for binding, once list numbers are written out.
    const [a, b] = [spelledMaps(first), spelledMaps(second)];
    assert.equal(a.length, b.length);
    const changed = a.map((map, at) => JSON.stringify([...map].sort()) === JSON.stringify([...b[at]!].sort()))
      .flatMap((same, at) => (same ? [] : [at]));
    assert.deepEqual(changed, [3]);
    // The KPN's map changed by gaining the five favourite presses and nothing else.
    const added = [...b[3]!.keys()].filter((tag) => !a[3]!.has(tag)).map((tag) => tag & 0x3F).sort((x, y) => x - y);
    assert.deepEqual(added, [2, 8, 9, 11, 34]);
    for (const [tag, body] of a[3]!) assert.equal(b[3]!.get(tag), body);
    // Every state variable, with its values and its transitions spelled out. The first seven are the clock,
    // whose starting values are the moment the compile was built, so those are compared without them;
    // the two compiles differ in the second, the minute and the hour.
    const states = (c: Container): string[] => stateRecords(c)!.map((one, index) => `${index < 7 ? '' : one.first} ${one.second} `
      + one.values.map((v) => `${v.from}>${v.to} ${spelled(c, { operand: v.operand, opcode: v.opcode })}`).join(' '));
    assert.deepEqual(states(second), states(first));
    const clock = (c: Container): number[] => stateRecords(c)!.slice(0, 7).map((one) => one.first);
    assert.deepEqual(clock(first).map((value, at) => value !== clock(second)[at]),
      [true, true, true, false, false, false, false]);
    // Every infrared code, its three blocks' durations.
    const codes = (c: Container): string[] => irGroups(c)!.flatMap((group) => group.addresses.map((address) =>
      irHeaderPointers(c, address).map((pointer) => (pointer ? (irBlockWords(c, pointer) ?? []).join(',') : '-')).join('|')));
    assert.equal(codes(second).length, 250);
    assert.deepEqual(codes(second), codes(first));
    // Five lists more: one per favourite.
    assert.equal(second.pointerArray(7)!.length - first.pointerArray(7)!.length, 5);
  });

/**
 * Each device's power on waits, by name, in tenths of a second: the waits at the top level of the list a
 * device's power variable runs going from 0 to 1. The `0x7C` of 1 after every send sits one level down, in
 * the send's own list.
 */
function powerOnDelays(c: Container): Record<string, number[]> {
  const records = stateRecords(c)!;
  const names = new Map(devices(c).map((one) => [one.group, one.name]));
  const delays: Record<string, number[]> = {};
  for (const record of records) {
    for (const one of record.values) {
      if (one.from !== 0 || one.to !== 1 || one.opcode !== 0x7F) continue;
      const at = c.blobOffsetOf(c.pointerArray(7)![one.operand]!)!;
      const waits: { group: number; tenths: number }[] = [];
      for (let k = 0; k < bytes.u8(c.blob, at); k += 1) {
        if (bytes.u8(c.blob, at + 3 + 3 * k) !== 0x7C) continue;
        const operand = bytes.u16(c.blob, at + 1 + 3 * k);
        waits.push({ group: operand >> 8, tenths: operand & 0xFF });
      }
      if (waits.length === 0) continue;
      assert.equal(new Set(waits.map((w) => w.group)).size, 1);
      delays[names.get(waits[0]!.group)!] = waits.map((w) => w.tenths);
    }
  }
  return delays;
}

test('the power on delays the bench test\'s description states are the file\'s', needing(skipWithoutLab()), () => {
  assert.deepEqual(powerOnDelays(container().c), {
    LG_TV: [100], Plasma: [50], Denon: [20], KPN: [15], Knoll: [100, 100, 50], Kodi: [15], Switch: [15], Sony_HT: [15],
  });
});

test('every expectation in the bench test is what the monitor will name the code the file sends',
  needing(skipWithoutLab(), skipWithoutIrArchive()), () => {
    const { c, blob } = container();
    const names = new Map(devices(c).map((one) => [one.group, one.name]));
    const book = new CodeBook((name) => (name === BENCH_FILE ? blob : undefined), [BENCH_FILE], IR_ARCHIVE);
    book.nameFromCatalogue();
    const commandOf = (send: Send): string | undefined => book.storedName(BENCH_FILE, send.group, send.code)?.command;
    // A name the catalogue gives two codes of one device does not say which was heard, so such a code is
    // expected by its number; the KPN's OK and DVR are both `List`.
    const ambiguous = (send: Send): boolean => {
      const name = commandOf(send);
      if (name === undefined) return true;
      let same = 0;
      for (let code = 0; code < 256; code += 1) if (book.storedName(BENCH_FILE, send.group, code)?.command === name) same += 1;
      return same > 1;
    };
    const steps = definition().steps;
    // The same code twice in a row is one expectation: the monitor folds a frame within 200 ms of the same
    // code into the press before it, and the three 6s of 666 are a tenth of a second apart.
    const expected = derived(c).map((sends) => sends
      .filter((send, at) => at === 0 || send.group !== sends[at - 1]!.group || send.code !== sends[at - 1]!.code)
      .map((send): Expectation => (ambiguous(send)
        ? { device: names.get(send.group)!, code: send.code, config: BENCH_FILE }
        : { device: names.get(send.group)!, command: commandOf(send)! })));
    assert.deepEqual(steps.map((step) => step.expect ?? []), expected);
    // Counted, so a step quietly losing its expectations shows.
    assert.equal(expected.flat().length, 35);
    assert.equal(expected.filter((one) => one.length === 0).length, 1);
  });

// ---------------------------------------------------------------------------------------------------------
// The two runs, `todo-compile-350.md` 3.3: the lab's `h350_logitech_setup_ir` and `h350_logitech_setup_ir_2`.
// ---------------------------------------------------------------------------------------------------------

/** The two run files of the bench test, by their lab names, in the order they were run. */
const FIRST = 'h350_logitech_setup_ir';
const SECOND = 'h350_logitech_setup_ir_2';
const RUNS = [FIRST, SECOND] as const;
type RunName = (typeof RUNS)[number];

/** A step of a run file, as far as these tests read it. */
interface RunFileStep {
  readonly instruction: string;
  readonly expect: readonly Expectation[];
  readonly presses: RunPress[];
  readonly verdicts: readonly Verdict[];
  readonly problem?: string;
}

function runFile(name: RunName): { readonly name: string; readonly steps: readonly RunFileStep[] } {
  return JSON.parse(new TextDecoder().decode(require_(name)));
}

/** Each run matched again, once, by `rematched`. */
const REMATCHED = new Map<RunName, readonly RunFileStep[]>();
let BOOK: CodeBook | undefined;

/**
 * Every press of a run matched again, against the compile alone, from the pulses the receiver reported.
 *
 * **Never the matches a run file stored**: the bench server that recorded the first run was started before
 * `BENCH_CONFIGS` named the compile, so it matched every frame against the other bench remotes only, and its
 * verdicts are the monitor's and not the remote's. The second run's stored matches are right, and both are
 * matched again here all the same, so the two are read the same way. What a press is, is its pulses.
 */
function rematched(name: RunName): readonly RunFileStep[] {
  const done = REMATCHED.get(name);
  if (done !== undefined) return done;
  if (BOOK === undefined) {
    // Built once: naming the codes from the catalogue is a pass over the whole archive.
    const { blob } = container();
    BOOK = new CodeBook((one) => (one === BENCH_FILE ? blob : undefined), [BENCH_FILE], IR_ARCHIVE);
    BOOK.nameFromCatalogue();
  }
  const book = BOOK;
  const steps = runFile(name).steps.map((step) => ({
    ...step,
    presses: step.presses.map((press) => {
      assert.ok(press.frame.pulses.length > 0, 'every press keeps its pulses');
      return { ...press, frame: { ...press.frame, matches: book.match(press.frame.pulses) } };
    }),
  }));
  REMATCHED.set(name, steps);
  return steps;
}

/** A press's codes in the compile, as `group/code`: every code whose stored frame the heard one matches. */
function heardCodes(press: RunPress): Set<string> {
  return new Set(press.frame.matches.filter((one) => one.config === BENCH_FILE).map((one) => `${one.group}/${one.code}`));
}

/** A press as the monitor names it from the compile, `KPN 6`, every name its frame matches. */
function heardNames(press: RunPress): string {
  return [...new Set(press.frame.matches.filter((one) => one.config === BENCH_FILE)
    .map((one) => `${one.device} ${one.command ?? `code ${one.code}`}`))].join('/');
}

/** The presses of a step that are not a bare trailing frame, which is what a step's sends are held to. */
function sent(step: RunFileStep): RunPress[] {
  return step.presses.filter((press) => !press.frame.bare);
}

/** The same action on another scan code. */
function onScan(action: Action, scan: number): Action {
  if ('short' in action) return { short: scan };
  if ('long' in action) return { long: scan };
  if ('press' in action) return { press: scan };
  throw new Error('a Power step is not asked which code it raised');
}

/**
 * One key pressed in the runs: its step (1 based), its action in that step, the last action whose sends are
 * held, and which of the step's presses those are, per run.
 */
interface Pressed {
  readonly key: string;
  readonly step: number;
  readonly from: number;
  readonly to: number;
  readonly presses: Readonly<Record<RunName, readonly number[]>>;
}

/**
 * Which of the 56 scan codes, raised in place of one action of a run, gives what the receiver heard.
 *
 * The remote is walked from the start of the run with every step's keys, up to the step asked about, then
 * that step's actions with the one at `from` replaced by each code in turn. The sends of actions `from` to
 * `to` have to be, one for one and in order, among the codes each of the row's presses matched. So a device
 * key, which sends nothing, is held to what the keys after it sent in the mode it selected, and a key that
 * sends is held to its own codes. The answer is every code that fits; a key's code is decided when that is
 * one. A code whose binding the model cannot walk is reported rather than passed over, since it might fit.
 */
function fitting(c: Container, name: RunName, row: Pressed): number[] {
  const heard = sent(rematched(name)[row.step - 1]!);
  const presses = row.presses[name];
  const fits: number[] = [];
  for (let scan = 1; scan <= 56; scan += 1) {
    const remote = new Remote(c);
    for (const actions of STEPS.slice(0, row.step - 1)) for (const action of actions) remote.act(action);
    const sends: Send[] = [];
    for (const [at, action] of STEPS[row.step - 1]!.entries()) {
      let one: Send[];
      try {
        one = remote.act(at === row.from ? onScan(action, scan) : action);
      } catch (error) {
        throw new Error(`${row.key} in step ${row.step}: code ${scan} binds what the model does not read`, { cause: error });
      }
      if (at >= row.from && at <= row.to) sends.push(...one);
    }
    if (sends.length === presses.length
      && sends.every((one, at) => heardCodes(heard[presses[at]!]!).has(`${one.group}/${one.code}`))) fits.push(scan);
  }
  return fits;
}

/** A row whose presses are the same in both runs. */
function both(key: string, step: number, from: number, to: number, presses: readonly number[]): Pressed {
  return { key, step, from, to, presses: { [FIRST]: presses, [SECOND]: presses } };
}

/**
 * Every key the runs pressed where something was heard, and what holds it. Power is left out, since its
 * steps press it once or twice by what the remote did, and so are the two keys of step 13, silent as
 * predicted. The presses a tester added are not held to anything: in the first run step 7's DVR was heard
 * twice and the first is held to it; in the second, step 4 has a 9 and a second Enter after the first, and
 * step 16 the television's Input before favourite 2, as the tester noted.
 */
const PRESSED: readonly Pressed[] = [
  both('TvMedia', 1, 0, 2, [0, 1]),
  both('VolumeUp', 1, 1, 1, [0]),
  both('Info', 1, 2, 2, [1]),
  both('TvMedia', 2, 0, 2, [0, 1]),
  both('VolumeUp', 2, 1, 1, [0]),
  both('DirectionUp', 2, 2, 2, [1]),
  both('CablePc', 3, 0, 2, [0, 1]),
  both('VolumeUp', 3, 1, 1, [0]),
  both('Menu', 3, 2, 2, [1]),
  both('CablePc', 4, 0, 2, [0, 1]),
  both('VolumeUp', 4, 1, 1, [0]),
  both('Enter', 4, 2, 2, [1]),
  both('AvrGame', 5, 0, 2, [0, 1]),
  both('VolumeUp', 5, 1, 1, [0]),
  both('Info', 5, 2, 2, [1]),
  both('AvrGame', 6, 0, 2, [0, 1]),
  both('VolumeUp', 6, 1, 1, [0]),
  both('Number1', 6, 2, 2, [1]),
  both('DvdMusic', 7, 0, 2, [0, 1]),
  both('VolumeUp', 7, 1, 1, [0]),
  both('PrevChannel', 7, 2, 2, [1]),
  both('Dvr', 7, 3, 3, [2]),
  both('DvdMusic', 8, 0, 2, [0, 1]),
  both('VolumeUp', 8, 1, 1, [0]),
  both('Stop', 8, 2, 2, [1]),
  both('WatchTV', 11, 0, 0, [0, 1, 2, 3]),
  both('VolumeUp', 12, 0, 0, [0]),
  both('PrevChannel', 12, 1, 1, [1]),
  both('WatchTV', 14, 0, 0, [0, 1, 2]),
  both('Favorite1', 15, 0, 0, [0]),
  { key: 'Favorite2', step: 16, from: 0, to: 0, presses: { [FIRST]: [0], [SECOND]: [1] } },
  both('Favorite3', 17, 0, 0, [0]),
  both('Favorite4', 18, 0, 0, [0, 1, 2]),
  both('Favorite5', 19, 0, 0, [0, 1]),
  both('TvMedia', 20, 0, 1, [0]),
  both('VolumeUp', 20, 1, 1, [0]),
];

/** Per run, per key, the codes every one of its presses fits, the intersection over the run. */
function decided(c: Container, name: RunName, rows: readonly Pressed[] = PRESSED): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const row of rows) {
    const fits = fitting(c, name, row);
    out[row.key] = out[row.key] === undefined ? fits : out[row.key]!.filter((scan) => fits.includes(scan));
  }
  return out;
}

/** The run steps' failures, as `step expected detail`. */
function failures(verdicts: readonly (readonly Verdict[])[]): string[] {
  return verdicts.flatMap((one, at) => one.filter((v) => !v.ok).map((v) => `${at + 1} ${v.expected} ${v.detail}`));
}

const NEEDS_RUNS = needing(skipWithoutLab(), skipWithoutIrArchive(), skipUnless(...RUNS));

test('both runs are the bench test as it stands, and the first run\'s monitor never named the compile, failing seven steps',
  needing(skipUnless(...RUNS)), () => {
    for (const name of RUNS) {
      const run = runFile(name);
      assert.equal(run.name, "Harmony 350, Logitech's compile of the test setup", name);
      // Each run is of this definition, step for step, so its expectations are the ones the derivation holds.
      assert.deepEqual(run.steps.map((step) => [step.instruction, step.expect]),
        definition().steps.map((step) => [step.instruction, step.expect ?? []]), name);
    }
    // The trap, in the first run: no stored match names the compile, so every code only it holds went
    // unrecognised and seven steps failed. The second, after the server was restarted, names it.
    const configs = (name: RunName): string[] => [...new Set(runFile(name).steps
      .flatMap((step) => step.presses.flatMap((press) => press.frame.matches.map((m) => m.config))))].sort();
    const others = ['h600_setup6_on', 'h650_devicelist_region', 'h700_28_config_region', 'one_config',
      'one_spare_page4_base', 'work/350-delay/before.bin'];
    assert.deepEqual(configs(FIRST), others);
    assert.deepEqual(configs(SECOND), [...others, BENCH_FILE].sort());
    const failed = (name: RunName): number[] => runFile(name).steps
      .flatMap((step, at) => (step.verdicts.every((one) => one.ok) ? [] : [at + 1]));
    assert.deepEqual(failed(FIRST), [2, 6, 7, 8, 10, 11, 14]);
    assert.deepEqual(failed(SECOND), []);
    // The second run's three notes, by step: a 9 pressed by accident in step 4, Watch TV perhaps pressed
    // twice in step 11, and Input pressed first in step 16.
    assert.deepEqual(runFile(SECOND).steps.flatMap((step, at) => (step.problem ? [at + 1] : [])), [4, 11, 16]);
    assert.deepEqual(runFile(FIRST).steps.filter((step) => step.problem), []);
  });

test('judged again from their pulses against Logitech\'s compile alone, every step of both runs passes, 20 of 20',
  NEEDS_RUNS, () => {
    for (const name of RUNS) {
      const steps = rematched(name);
      const verdicts = steps.map((step) => judge(step));
      assert.equal(steps.length, 20, name);
      assert.deepEqual(failures(verdicts), [], name);
      assert.equal(verdicts.flat().length, 35, name);
      // Step 13, Channel Up and the digit 1 in the KPN's mode, was silent as predicted.
      assert.deepEqual(steps[12]!.presses, [], name);
    }
    // The control on the method: the second run's monitor had the compile loaded, and judging its
    // presses again gives the verdicts it stored, word for word.
    assert.deepEqual(rematched(SECOND).map((step) => judge(step)), runFile(SECOND).steps.map((step) => step.verdicts));
  });

test('the second run\'s extra presses: a 9 and a second Enter in step 4, Input in step 16, and one Watch TV in step 11',
  NEEDS_RUNS, () => {
    const steps = rematched(SECOND);
    // Step 4: Kodi's Enter, then a 9, then Enter again. Step 16: the television's Input, which the KPN's map
    // sends, then favourite 2. Step 11 heard one Watch TV and no second: a second press would have switched
    // the devices off again.
    assert.deepEqual(sent(steps[3]!).map(heardNames), ['Denon VolumeUp', 'Kodi Enter', 'Kodi 9', 'Kodi Enter']);
    assert.deepEqual(sent(steps[15]!).map(heardNames), ['LG_TV Input', 'KPN 2']);
    assert.deepEqual(sent(steps[10]!).map(heardNames),
      ['LG_TV PowerOn', 'Denon code 6', 'KPN PowerToggle', 'Denon InputCbl/Sat']);
  });

test('the favourite keys sent the channels in the order they were entered: favourites 1 to 4 are codes 8, 9, 11 and 34',
  NEEDS_RUNS, () => {
    const { c } = container();
    for (const name of RUNS) {
      // What each favourite was heard to send, as the KPN's command names: channel 1, 2, 3, 666 and 07.
      const heard = PRESSED.filter((row) => row.key.startsWith('Favorite'))
        .map((row) => row.presses[name].map((at) => heardNames(sent(rematched(name)[row.step - 1]!)[at]!)));
      assert.deepEqual(heard, [['KPN 1'], ['KPN 2'], ['KPN 3'], ['KPN 6', 'KPN 6', 'KPN 6'], ['KPN 0', 'KPN 7']], name);
      // So each favourite key is the one code whose binding sends that channel.
      assert.deepEqual(decided(c, name, PRESSED.filter((row) => row.key.startsWith('Favorite'))), {
        Favorite1: [8], Favorite2: [9], Favorite3: [11], Favorite4: [34], Favorite5: [2],
      }, name);
    }
  });

test('every key listed raised one code in both runs, but DVR, whose press sent the frame OK sends as well', NEEDS_RUNS, () => {
  const { c } = container();
  for (const name of RUNS) {
    const codes = decided(c, name);
    assert.deepEqual(codes, {
      TvMedia: [5], VolumeUp: [49], Info: [36], DirectionUp: [51], CablePc: [1], Menu: [10], Enter: [54],
      AvrGame: [7], Number1: [24], DvdMusic: [4], PrevChannel: [32], Dvr: [16, 50], Stop: [40], WatchTV: [6],
      Favorite1: [8], Favorite2: [9], Favorite3: [11], Favorite4: [34], Favorite5: [2],
    }, name);
    // Each decided code is the one `SCAN` and the reference give the key.
    for (const [key, scans] of Object.entries(codes)) if (scans.length === 1) assert.equal(scans[0], SCAN[key], key);
  }
  // DVR is not decided by these runs: the KPN's code 14, which DVR's binding sends, and its code 11, which
  // OK's sends, are the same bytes in every block, so the receiver cannot tell the two keys apart.
  const kpn = irGroups(c)![3]!;
  const blocks = (code: number): string => irHeaderPointers(c, kpn.addresses[code]!)
    .map((pointer) => (pointer ? (irBlockWords(c, pointer) ?? []).join(',') : '-')).join('|');
  assert.equal(blocks(14), blocks(11));
  // The first run heard that frame twice in step 7, 3.8 s apart, the second once.
  assert.deepEqual(RUNS.map((name) => sent(rematched(name)[6]!).map(heardNames)), [
    ['Denon VolumeUp', 'KPN ChannelPrev', 'KPN List', 'KPN List'],
    ['Denon VolumeUp', 'KPN ChannelPrev', 'KPN List'],
  ]);
});

test('in Watch TV the Denon\'s and the KPN\'s power codes arrived inside the waits before them, and the Denon\'s input after its own',
  NEEDS_RUNS, () => {
    // Step 11, Watch TV from everything off: the TV's PowerOn, the Denon's power on, the KPN's toggle and the
    // Denon's input, when each reached the host, in milliseconds since each run started.
    const at = RUNS.map((name) => sent(rematched(name)[10]!).map((press) => press.atMs));
    assert.deepEqual(at, [[266157, 266349, 266846, 268887], [149486, 149675, 150170, 152210]]);
    // The file's waits, in tenths: the TV's after its power on and the Denon's.
    const waits = powerOnDelays(container().c);
    const [tv, denon] = [waits['LG_TV']![0]! * 100, waits['Denon']![0]! * 100];
    assert.deepEqual([tv, denon], [10000, 2000]);
    for (const one of at) {
      // The Denon's power code arrived within 0.2 s of the TV's, inside the TV's ten seconds, and the KPN's
      // toggle within 0.5 s of the Denon's, inside its two: neither wait held back another device's code.
      assert.ok(one[1]! - one[0]! < tv && one[2]! - one[1]! < denon);
      // The Denon's own next code, its input, arrived more than its two seconds after its power code.
      assert.ok(one[3]! - one[1]! > denon);
    }
    assert.deepEqual(at.map((one) => [one[1]! - one[0]!, one[2]! - one[1]!, one[3]! - one[1]!]),
      [[192, 497, 2538], [189, 495, 2535]]);
  });

test('the KPN\'s digits of a favourite arrived a third of a second apart, each its own press on the monitor', NEEDS_RUNS, () => {
  // Channel 666, step 18, and 07, step 19: when each digit reached the host, the silence the receiver reported before
  // it, and its repeats. The file waits one tenth after each digit, the `7c:301` of every digit list above;
  // heard, each digit is its frame and one repeat, and 0.21 s of silence separates two digits.
  const read = (step: RunFileStep): number[][] => sent(step).map((press) => [press.atMs, press.frame.gapUs!, press.repeats]);
  assert.deepEqual(RUNS.map((name) => [read(rematched(name)[17]!), read(rematched(name)[18]!)]), [
    [[[369529, 5708000, 1], [369854, 208000, 1], [370182, 209000, 1]], [[376712, 6442000, 1], [377040, 209000, 1]]],
    [[[253234, 3273000, 1], [253551, 208000, 1], [253880, 208000, 1]], [[258049, 4065000, 1], [258373, 208000, 1]]],
  ]);
  // Past the monitor's repeat window, so three presses where the bench test allowed for one with repeats.
  for (const gap of [208000, 209000]) assert.ok(gap > REPEAT_WINDOW_US);
});
