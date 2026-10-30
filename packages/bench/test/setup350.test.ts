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
 * (`tests/test_harmony_350_keys.py`), and the order of the other four keys is open. The steps predict that
 * favourite keys 1 to 4 are codes 8, 9, 11 and 34, the order the channels were entered in, which is what
 * `SCAN` below states; since each code sends a channel of its own, the channel heard names the code
 * whatever the prediction, so the run settles it either way.
 *
 * **Which architectures.** The Harmony 350 alone, one file, the one on the bench unit.
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
import { IR_ARCHIVE, LAB, needing, skipWithoutIrArchive, skipWithoutLab } from '@harmony/lab';

import { BENCH_CONFIGS, CodeBook } from '../src/irmonitor.ts';
import { testDefinitions, type Expectation, type TestDefinition } from '../src/irsession.ts';

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
 * key the drawing carries a code for; the ten it does not are exactly the keys never heard on a 350 that
 * this run presses, the two device keys on the right, Watch TV, Menu, DVR, Enter and favourites 1 to 4.
 *
 * **Favourites 1 to 4 are a prediction**, each one of the four codes in `FAVOURITES_1_TO_4`: the order the
 * channels were entered in, which the run checks.
 */
const SCAN: Readonly<Record<string, number>> = {
  CablePc: 1, Favorite5: 2, Power: 3, DvdMusic: 4, TvMedia: 5, WatchTV: 6, AvrGame: 7, Favorite1: 8,
  Favorite2: 9, Menu: 10, Favorite3: 11, Dvr: 16, Number1: 24, PrevChannel: 32, Favorite4: 34, Info: 36,
  Stop: 40, VolumeUp: 49, DirectionUp: 51, Enter: 54, ChannelUp: 55,
};

/** Favourites 1 to 4 are these four codes in an order no configuration states, keys.md. */
const FAVOURITES_1_TO_4 = [8, 9, 11, 34] as const;

/** What a person does with one key. */
type Action =
  | { readonly short: string }
  | { readonly long: string }
  | { readonly press: string }
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
    if ('short' in action) return [...this.event(PRESS | SCAN[action.short]!), ...this.event(RELEASE | SCAN[action.short]!)];
    if ('long' in action) return [...this.event(PRESS | SCAN[action.long]!), ...this.event(HELD | SCAN[action.long]!)];
    if ('press' in action) return [...this.event(PRESS | SCAN[action.press]!), ...this.event(RELEASE | SCAN[action.press]!)];
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
  // The keys the drawing gives no code to, which is the set this run hears for the first time.
  assert.deepEqual(Object.keys(SCAN).filter((key) => drawn[key] === undefined).sort(),
    ['CablePc', 'DvdMusic', 'Dvr', 'Enter', 'Favorite1', 'Favorite2', 'Favorite3', 'Favorite4', 'Menu', 'WatchTV']);
  // The favourite candidates are the drawing's, and the prediction gives each of the four keys one of them.
  const candidates = [...svg.matchAll(/data-name="Favorite[1-4]"[^>]*? data-scan-candidates="([\d ]+)"/g)].map((m) => m[1]);
  assert.deepEqual(candidates, ['8 9 11 34', '8 9 11 34', '8 9 11 34', '8 9 11 34']);
  assert.deepEqual([1, 2, 3, 4].map((n) => SCAN[`Favorite${n}`]).sort((a, b) => a! - b!), [...FAVOURITES_1_TO_4]);
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

test('the power on delays the bench test\'s description states are the file\'s', needing(skipWithoutLab()), () => {
  const { c } = container();
  const records = stateRecords(c)!;
  const names = new Map(devices(c).map((one) => [one.group, one.name]));
  // The waits at the top level of the list a device's power variable runs going from 0 to 1, by group,
  // in tenths of a second; the 0x7C of 1 after every send sits one level down, in the send's own list.
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
  assert.deepEqual(delays, {
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
