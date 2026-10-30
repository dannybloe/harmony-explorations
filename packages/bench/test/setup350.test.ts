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
 * **Any other instruction on a path a press reaches throws**, so the model cannot skip something that sends.
 *
 * **What it rests on that is not this family's own reading.** Which transitions a write fires was read on
 * the Harmony 600, 650 and One images and not on this family's; the Denon's input is sent by a write of the
 * value its variable already holds, through a transition from any value (`-2`), which only that reading
 * makes fire. Whether a power on delay holds back codes to other devices is not checked on this image
 * either, which is why the JSON states an order and no pauses: the order is the same either way.
 *
 * **What the derivation found that the setup asked for and the file does not do.** The KPN's map binds
 * seven keys: Volume Up and Down to the Denon, Input to the LG TV, and Power, Previous Channel, OK and DVR
 * to the KPN. Its digits are in the file as action lists that nothing calls, and none of the five
 * favourite channels saved on the KPN before the compile is bound to any key: no map binds codes 8, 9, 11
 * or 34, favourites 1 to 4, and the number sender holds no record. So the favourite steps predict silence
 * and the run cannot settle which favourite key is which of those four codes. The service's own read back
 * of the KPN's button map after the save held all 43 buttons, the five channels among them; why the
 * compile kept seven is not established.
 *
 * **Which architectures.** The Harmony 350 alone, one file, the one on the bench unit.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { bytes, devices, parse, stateRecords, taggedList, type Container } from '@harmony/codec';
import { IR_ARCHIVE, LAB, needing, skipWithoutIrArchive, skipWithoutLab } from '@harmony/lab';

import { BENCH_CONFIGS, CodeBook } from '../src/irmonitor.ts';
import { testDefinitions, type Expectation, type TestDefinition } from '../src/irsession.ts';

/** The file, by its path in the lab, which is also the name the monitor gives it in `BENCH_CONFIGS`. */
const BENCH_FILE = 'work/setups/h350-test/compile-Result.EzHex';

/** The bench test this file pins. */
const DEFINITION_ID = '350-3-3-logitech-setup';

/**
 * The scan code of every key the bench test presses, by the drawing's key name.
 *
 * The codes are the reference's, `reference/remotes/harmony-350/keys.md`, and `packages/bench/test/
 * keys350.test.ts` is where they are argued. A test below holds this table against the drawing for every
 * key the drawing carries a code for; the six it does not are exactly the keys never heard on a 350 that
 * this run presses, the two device keys on the right, Watch TV, Menu, DVR and Enter.
 */
const SCAN: Readonly<Record<string, number>> = {
  CablePc: 1, Favorite5: 2, Power: 3, DvdMusic: 4, TvMedia: 5, WatchTV: 6, AvrGame: 7, Menu: 10,
  Dvr: 16, Number1: 24, PrevChannel: 32, Info: 36, Stop: 40, VolumeUp: 49, DirectionUp: 51, Enter: 54,
  ChannelUp: 55,
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
  | { readonly powerOff: true }
  // A key whose code is one of several: every candidate must send exactly what the step expects.
  | { readonly anyOf: readonly number[] };

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
  [{ anyOf: FAVOURITES_1_TO_4 }],
  [{ anyOf: FAVOURITES_1_TO_4 }],
  [{ anyOf: FAVOURITES_1_TO_4 }],
  [{ anyOf: FAVOURITES_1_TO_4 }],
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
    if ('powerOff' in action) {
      const first = this.act({ press: 'Power' });
      // Pressed again only when the first press switched a device on, as the instruction says.
      return this.writes.some((one) => one.value === 1) ? this.act({ press: 'Power' }) : first;
    }
    // Every candidate from the same state, which must agree; the state after is the first candidate's.
    const each = action.anyOf.map((scan) => {
      const saved = { map: this.map, values: [...this.values] };
      const sent = [...this.event(PRESS | scan), ...this.event(RELEASE | scan)];
      this.map = saved.map;
      this.values.splice(0, this.values.length, ...saved.values);
      return sent;
    });
    for (const one of each) assert.deepEqual(one, each[0], 'the favourite candidates send different things');
    return each[0]!;
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
    else if (opcode >= 0x80) this.write(opcode & 0x7F, operand, out);
    else assert.fail(`an instruction the model does not read: ${opcode.toString(16)} ${operand.toString(16)}`);
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

function container(): { c: Container; blob: Uint8Array } {
  const path = join(LAB!, BENCH_FILE);
  // The lab is there, so a missing file fails rather than skips: the claim is about this one file.
  assert.ok(existsSync(path), `${BENCH_FILE} is in the lab`);
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
    ['CablePc', 'DvdMusic', 'Dvr', 'Enter', 'Menu', 'WatchTV']);
  // And the favourite candidates are the drawing's, so the steps that press them press the right four.
  const candidates = [...svg.matchAll(/data-name="Favorite[1-4]"[^>]*? data-scan-candidates="([\d ]+)"/g)].map((m) => m[1]);
  assert.deepEqual(candidates, ['8 9 11 34', '8 9 11 34', '8 9 11 34', '8 9 11 34']);
});

test('the bench test has one step per entry of the model, and names this file wherever it names a code', () => {
  // The monitor names a code only from a file it loads, so the file is one of the bench's.
  assert.ok(BENCH_CONFIGS.includes(BENCH_FILE));
  const steps = definition().steps;
  assert.equal(steps.length, STEPS.length);
  for (const step of steps) {
    for (const want of step.expect ?? []) {
      if (want.code !== undefined) assert.equal(want.config, BENCH_FILE, step.instruction);
      assert.equal(want.times, undefined, 'one press of each, so no count');
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
    [], [], [], [], [],
    ['LG_TV 1'],
  ]);
  // The groups follow the keys' places, 4 + place for a long press: the LG TV 0, Plasma 1, Denon 2, KPN 3,
  // Knoll 4, Kodi 5, Switch 6 and Sony HT 7, top left, top right, bottom left and bottom right.
  assert.deepEqual(devices(c).map((one) => `${one.group} ${one.name}`),
    ['0 LG_TV', '1 Plasma', '2 Denon', '3 KPN', '4 Knoll', '5 Kodi', '6 Switch', '7 Sony_HT']);
});

test('no key of this file sends a favourite channel, and the KPN\'s map binds seven keys', needing(skipWithoutLab()), () => {
  const { c } = container();
  const maps = c.pointerArray(6)!.map((address) => taggedList(c, address)!.entries);
  // Nine maps: the key table and one per device.
  assert.equal(maps.length, 9);
  // Codes 8, 9, 11 and 34, favourites 1 to 4, are bound by no map with any event type.
  for (const scan of FAVOURITES_1_TO_4) {
    assert.deepEqual(maps.flatMap((entries, at) => entries.filter((one) => (one.tag & 0x3F) === scan).map(() => at)), []);
  }
  // Favourite 5, code 2, by the TV's and the Plasma's maps only, entries 1 and 8, which send their own keys.
  assert.deepEqual(maps.flatMap((entries, at) => entries.filter((one) => one.tag === (PRESS | 2)).map(() => at)), [1, 8]);
  // The KPN's map is the one DVD/Music's release selects, entry 3, the last instruction of the list it
  // calls being `0x1F 0xFF03`, and it binds seven tags.
  const kpn = maps[0]!.find((one) => one.tag === (RELEASE | SCAN['DvdMusic']!))!;
  assert.equal(kpn.opcode, 0x7F);
  const select = c.blobOffsetOf(c.pointerArray(7)![kpn.operand]!)!;
  const last = select + 1 + 3 * (bytes.u8(c.blob, select) - 1);
  assert.deepEqual([bytes.u16(c.blob, last), bytes.u8(c.blob, last + 2)], [0xFF03, 0x1F]);
  assert.deepEqual(maps[3]!.map((one) => one.tag & 0x3F).sort((a, b) => a - b), [3, 16, 32, 35, 49, 50, 52]);
  // No action list loads a number for the number sender, `0x7A`.
  const lists = c.pointerArray(7)!;
  let loads = 0;
  for (const address of lists) {
    const at = c.blobOffsetOf(address)!;
    for (let k = 0; k < bytes.u8(c.blob, at); k += 1) if (bytes.u8(c.blob, at + 3 + 3 * k) === 0x7A) loads += 1;
  }
  assert.equal(loads, 0);
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
    const expected = derived(c).map((sends) => sends.map((send): Expectation => (ambiguous(send)
      ? { device: names.get(send.group)!, code: send.code, config: BENCH_FILE }
      : { device: names.get(send.group)!, command: commandOf(send)! })));
    assert.deepEqual(steps.map((step) => step.expect ?? []), expected);
    // Counted, so a step quietly losing its expectations shows.
    assert.equal(expected.flat().length, 29);
    assert.equal(expected.filter((one) => one.length === 0).length, 6);
  });
