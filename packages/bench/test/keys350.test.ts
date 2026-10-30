/**
 * Which printed key on a Harmony 350 raises which scan code, named by what the keys send.
 *
 * `todo-compile-350.md` 2.2. The argument is the header of `tests/test_harmony_350_keys.py`, which holds the
 * firmware half (a key map's tag is an event type plus the code the keypad scan computes, 1 to 56) and the
 * keys whose binding says what they are: the four device keys, Watch TV, Power and the five favourites.
 * This file holds the rest, which needs the bench's infrared monitor and so lives beside it.
 *
 * **The method.** Every press a device map binds in the five lab configurations of this family is
 * followed to the first code it sends, and that code is named the way the monitor will name it when the
 * key is pressed at the bench: by Logitech's catalogue, from the device's identified codeset, through
 * `CodeBook.storedName`. Logitech's compile binds a command to the key of the same name, so the name a
 * code carries in most of the maps that bind it is the key. The census below is every such name, counted,
 * including the ones that disagree, and the table is what it supports.
 *
 * **What the census shows.** 41 keys are named that way. Every disagreeing name is in a Harmony 300 file,
 * twelve bindings on three devices: one television calls its volume pair `DirectionRight` and
 * `DirectionLeft` (reached from both maps of its file), with `Picture2` and `MenuOff` beside `Menu` and
 * `Info`; one video recorder names its transport keys after the direction keys; one set top box sends
 * `Pause` from Play. For the recorder the cause was measured by the prose reviewer: its transport codes are
 * the same signal as its direction codes, so the monitor shows one of two names for one signal. The
 * television's volume is not checked.
 *
 * **How strong the counts are.** They count bindings, and a map often sends another device's volume, so
 * `VolumeUp` 8 of 10 is three distinct codes of four; the named maps of the Harmony 350 are one television
 * compiled twice, so most of the naming comes from the Harmony 300's files, and Input, DVR, Clear, Enter
 * and Power's name rest on them alone. The accepted names per key (`LastView`, `ChapterPrev`, `InputNext`,
 * `Cancel` and the rest) were chosen after the census was seen, so for those keys the majority is partly by
 * construction; the bench configuration, which this census does not read, uses other words again (`Qview`,
 * `-`, `TuneDown`), which is why the bench test names commands per device rather than through this table. Three keys rest on one or two bindings, all of them in Harmony 300
 * files: `Dvr` (code 16, `List`, which the 300 prints on that key), `Clear` (19) and `Enter` (54). Two
 * scans no catalogue lookup names here, 25 and 26, and they are the up and down arrow pair by elimination,
 * as candidates; Live is 43 or 56, which nothing binds.
 *
 * **Not checked on a remote.** `packages/bench/irtests/350-2-2-keys.json` presses every key of the bench
 * Harmony 350 in two device modes with the receiver listening; until it has run this table is a reading of
 * configurations.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { bytes, parse, taggedList, type Container } from '@harmony/codec';
import { IR_ARCHIVE, load, needing, skipUnless, skipWithoutIrArchive } from '@harmony/lab';

import { CodeBook } from '../src/irmonitor.ts';

const CONFIGS = [
  'h350_config', 'h350_programmed_config', 'h350_three_devices_config', 'h300_config', 'h300_programmed_config',
] as const;

/** A key map tag's type bits, the firmware's press. */
const PRESS = 0x80;

/** How a key's code was established. */
type Evidence =
  // What the binding does says which key it is: a device key, Watch TV, Power. `tests/test_harmony_350_keys.py`.
  | 'structure'
  // The commonest catalogue name of what it sends, in the census below.
  | 'named';

/**
 * Every key on the Harmony 350's face, by the drawing's name, and its code.
 *
 * `names` are the catalogue names that count for the key: its own name, or Logitech's for the same key on
 * another device, `LastView` for the previous channel key, `ChapterPrev` for the skip back key.
 */
const KEYS: Readonly<Record<string, { scan: number; from: Evidence; names?: readonly string[] }>> = {
  CablePc: { scan: 1, from: 'structure' },
  Power: { scan: 3, from: 'structure', names: ['PowerToggle'] },
  DvdMusic: { scan: 4, from: 'structure' },
  TvMedia: { scan: 5, from: 'structure' },
  WatchTV: { scan: 6, from: 'structure' },
  AvrGame: { scan: 7, from: 'structure' },
  Menu: { scan: 10, from: 'named', names: ['Menu'] },
  Exit: { scan: 12, from: 'named', names: ['Exit', 'Cancel'] },
  Red: { scan: 13, from: 'named', names: ['Red'] },
  DirectionLeft: { scan: 14, from: 'named', names: ['DirectionLeft'] },
  VolumeMute: { scan: 15, from: 'named', names: ['Mute'] },
  Dvr: { scan: 16, from: 'named', names: ['List'] },
  Number4: { scan: 17, from: 'named', names: ['4'] },
  Number7: { scan: 18, from: 'named', names: ['7'] },
  Clear: { scan: 19, from: 'named', names: ['Clear'] },
  Number0: { scan: 20, from: 'named', names: ['0'] },
  SkipBack: { scan: 21, from: 'named', names: ['ChapterPrev'] },
  Rewind: { scan: 22, from: 'named', names: ['Rewind'] },
  Record: { scan: 23, from: 'named', names: ['Record'] },
  Number1: { scan: 24, from: 'named', names: ['1'] },
  Green: { scan: 27, from: 'named', names: ['Green'] },
  Yellow: { scan: 28, from: 'named', names: ['Yellow'] },
  Blue: { scan: 29, from: 'named', names: ['Blue'] },
  FastForward: { scan: 30, from: 'named', names: ['FastForward'] },
  DirectionRight: { scan: 31, from: 'named', names: ['DirectionRight'] },
  PrevChannel: { scan: 32, from: 'named', names: ['LastView'] },
  Guide: { scan: 33, from: 'named', names: ['Guide'] },
  Input: { scan: 35, from: 'named', names: ['InputNext'] },
  Info: { scan: 36, from: 'named', names: ['Info'] },
  Number6: { scan: 37, from: 'named', names: ['6'] },
  SkipForward: { scan: 38, from: 'named', names: ['ChapterNext'] },
  Number3: { scan: 39, from: 'named', names: ['3'] },
  Stop: { scan: 40, from: 'named', names: ['Stop'] },
  ChannelDown: { scan: 41, from: 'named', names: ['ChannelDown'] },
  DirectionDown: { scan: 42, from: 'named', names: ['DirectionDown'] },
  Play: { scan: 44, from: 'named', names: ['Play'] },
  Number9: { scan: 45, from: 'named', names: ['9'] },
  Pause: { scan: 46, from: 'named', names: ['Pause'] },
  Number2: { scan: 47, from: 'named', names: ['2'] },
  Number5: { scan: 48, from: 'named', names: ['5'] },
  VolumeUp: { scan: 49, from: 'named', names: ['VolumeUp'] },
  Select: { scan: 50, from: 'named', names: ['OK', 'Select', 'MenuSelect'] },
  DirectionUp: { scan: 51, from: 'named', names: ['DirectionUp'] },
  VolumeDown: { scan: 52, from: 'named', names: ['VolumeDown'] },
  Number8: { scan: 53, from: 'named', names: ['8'] },
  Enter: { scan: 54, from: 'named', names: ['Enter', 'NumberEnter'] },
  ChannelUp: { scan: 55, from: 'named', names: ['ChannelUp'] },
};

/**
 * Keys whose code is narrowed to a set and not decided, `scanCandidates` in the drawing's vocabulary.
 *
 * The five favourites are the codes that call the number sender, `tests/test_harmony_350_keys.py`, and the
 * two configurations disagree about which is which. The arrow pair is the two codes left bound once every
 * other key is placed, and Live the key left over, on one of the two codes nothing binds.
 */
const UNDECIDED: readonly { keys: readonly string[]; scans: readonly number[] }[] = [
  { keys: ['Favorite1', 'Favorite2', 'Favorite3', 'Favorite4', 'Favorite5'], scans: [2, 8, 9, 11, 34] },
  { keys: ['UpArrow', 'DownArrow'], scans: [25, 26] },
  { keys: ['Live'], scans: [43, 56] },
];

/** The drawing's key names, read out of its source, since this package does not depend on the drawings. */
function drawingKeys(): string[] {
  const source = readFileSync(fileURLToPath(new URL('../../silhouettes/src/models/h350.ts', import.meta.url)), 'utf8');
  return [...source.matchAll(/\{ name: '(\w+)', src:/g)].map((m) => m[1]!);
}

/** An action list's instructions, raw slot 7 being this family's action list table. */
function listBody(c: Container, index: number): { operand: number; opcode: number }[] {
  const at = c.blobOffsetOf(c.pointerArray(7)![index]!)!;
  return Array.from({ length: bytes.u8(c.blob, at) }, (_, k) => ({
    operand: bytes.u16(c.blob, at + 1 + 3 * k), opcode: bytes.u8(c.blob, at + 3 + 3 * k),
  }));
}

/** The first `0x7D` an instruction reaches through the lists it calls, as its operand: group and code. */
function firstSend(c: Container, operand: number, opcode: number, depth = 0): number | undefined {
  if (opcode === 0x7D) return operand;
  if (opcode !== 0x7F || depth > 4) return undefined;
  for (const one of listBody(c, operand)) {
    const found = firstSend(c, one.operand, one.opcode, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** Per scan code, how many device map presses send a code the monitor names each way. */
function census(): Map<number, Map<string, number>> {
  const out = new Map<number, Map<string, number>>();
  // One book for all five, as the bench builds one for every remote on it: the catalogue's index is
  // the slow part and is built once, and names are still identified per configuration and device.
  const book = new CodeBook(load, CONFIGS, IR_ARCHIVE);
  book.nameFromCatalogue();
  for (const name of CONFIGS) {
    const c = parse(load(name)!);
    for (const [entry, address] of c.pointerArray(6)!.entries()) {
      if (entry === 0) continue; // the key table, which sends nothing itself
      for (const one of taggedList(c, address)!.entries) {
        if ((one.tag & 0xC0) !== PRESS) continue;
        const send = firstSend(c, one.operand, one.opcode);
        const label = send === undefined ? 'no send' : (book.storedName(name, send >> 8, send & 0xFF)?.command ?? 'unnamed');
        const counts = out.get(one.tag & 0x3F) ?? new Map<string, number>();
        counts.set(label, (counts.get(label) ?? 0) + 1);
        out.set(one.tag & 0x3F, counts);
      }
    }
  }
  return out;
}

test('the table places every key on the Harmony 350 drawing once, and every code at most once', () => {
  const placed = [...Object.keys(KEYS), ...UNDECIDED.flatMap((one) => one.keys)];
  assert.deepEqual([...placed].sort(), drawingKeys().sort());
  assert.equal(placed.length, 55);
  const scans = [...Object.values(KEYS).map((one) => one.scan), ...UNDECIDED.flatMap((one) => one.scans)];
  assert.equal(new Set(scans).size, scans.length, 'a code claimed twice');
  // 47 decided, 9 codes shared by 8 keys, and all 56 codes of the matrix accounted for, one of them no key.
  assert.equal(Object.keys(KEYS).length, 47);
  assert.deepEqual([...scans].sort((a, b) => a - b), Array.from({ length: 56 }, (_, i) => i + 1));
});

test('what every device map press sends, named as the monitor names it, over the five configurations',
  needing(skipUnless(...CONFIGS), skipWithoutIrArchive()), () => {
    const counts = census();
    const flat = Object.fromEntries([...counts.entries()].sort((a, b) => a[0] - b[0])
      .map(([scan, names]) => [scan, Object.fromEntries([...names.entries()].sort())]));
    assert.deepEqual(flat, {
      2: { Internet: 2, 'no send': 3 },
      3: { PowerToggle: 5, 'no send': 4, unnamed: 5 },
      8: { 'no send': 3 },
      9: { 'no send': 3 },
      10: { Menu: 6, Picture2: 1, unnamed: 6 },
      11: { Teletext: 1, TextTv: 1, 'no send': 2, unnamed: 1 },
      12: { Cancel: 1, Exit: 4, unnamed: 4 },
      13: { Red: 5, unnamed: 6 },
      14: { DirectionLeft: 6, unnamed: 7 },
      15: { Mute: 10, unnamed: 3 },
      16: { List: 1, unnamed: 4 },
      17: { 4: 7, unnamed: 7 },
      18: { 7: 7, unnamed: 7 },
      19: { Clear: 1, unnamed: 2 },
      20: { 0: 7, unnamed: 7 },
      21: { ChapterPrev: 4, unnamed: 3 },
      22: { DirectionLeft: 1, Rewind: 5, unnamed: 7 },
      23: { Record: 5, unnamed: 5 },
      24: { 1: 7, unnamed: 7 },
      25: { unnamed: 3 },
      26: { unnamed: 3 },
      27: { Green: 5, unnamed: 6 },
      28: { Yellow: 5, unnamed: 6 },
      29: { Blue: 5, unnamed: 6 },
      30: { DirectionRight: 1, FastForward: 5, unnamed: 7 },
      31: { DirectionRight: 6, unnamed: 7 },
      32: { LastView: 3, unnamed: 7 },
      33: { Guide: 4, unnamed: 6 },
      34: { 'no send': 3 },
      35: { InputNext: 2, unnamed: 3 },
      36: { Info: 4, MenuOff: 1, unnamed: 6 },
      37: { 6: 7, unnamed: 7 },
      38: { ChapterNext: 4, unnamed: 3 },
      39: { 3: 7, unnamed: 7 },
      40: { DirectionDown: 1, Stop: 5, unnamed: 7 },
      41: { ChannelDown: 6, unnamed: 5 },
      42: { DirectionDown: 5, unnamed: 7 },
      44: { OK: 1, Pause: 1, Play: 4, unnamed: 7 },
      45: { 9: 7, unnamed: 7 },
      46: { DirectionUp: 1, Pause: 5, unnamed: 7 },
      47: { 2: 7, unnamed: 7 },
      48: { 5: 7, unnamed: 7 },
      49: { DirectionRight: 2, VolumeUp: 8, unnamed: 3 },
      50: { MenuSelect: 1, OK: 4, Select: 2, unnamed: 7 },
      51: { DirectionUp: 5, unnamed: 7 },
      52: { DirectionLeft: 2, VolumeDown: 8, unnamed: 3 },
      53: { 8: 7, unnamed: 7 },
      54: { Enter: 1, NumberEnter: 1 },
      55: { ChannelUp: 6, unnamed: 5 },
    });

    // Every named key's own names are most of the named bindings at its code, and at no other code.
    const majority: Record<string, string> = {};
    for (const [key, one] of Object.entries(KEYS)) {
      if (one.names === undefined) continue;
      const named = [...(counts.get(one.scan) ?? new Map<string, number>()).entries()]
        .filter(([label]) => label !== 'unnamed' && label !== 'no send');
      const ours = named.filter(([label]) => one.names!.includes(label)).reduce((n, [, k]) => n + k, 0);
      const all = named.reduce((n, [, k]) => n + k, 0);
      majority[key] = `${ours} of ${all}`;
      assert.ok(2 * ours > all, `${key}: ${ours} of ${all} named bindings at code ${one.scan}`);
      for (const [scan, names] of counts) {
        if (scan === one.scan) continue;
        for (const [label, n] of names) {
          if (!one.names.includes(label)) continue;
          // A name may turn up elsewhere only as a minority there, the misidentified codesets above.
          const others = [...names.entries()].filter(([l]) => l !== 'unnamed' && l !== 'no send' && l !== label)
            .reduce((m, [, k]) => m + k, 0);
          assert.ok(n < others, `${label} at code ${scan} as well as ${one.scan}`);
        }
      }
    }
    // The strength of each, stated, so a census that moves shows which key it moved.
    assert.deepEqual(majority, {
      Power: '5 of 5', Menu: '6 of 7', Exit: '5 of 5', Red: '5 of 5', DirectionLeft: '6 of 6', VolumeMute: '10 of 10',
      Dvr: '1 of 1', Number4: '7 of 7', Number7: '7 of 7', Clear: '1 of 1', Number0: '7 of 7', SkipBack: '4 of 4',
      Rewind: '5 of 6', Record: '5 of 5', Number1: '7 of 7', Green: '5 of 5', Yellow: '5 of 5', Blue: '5 of 5',
      FastForward: '5 of 6', DirectionRight: '6 of 6', PrevChannel: '3 of 3', Guide: '4 of 4', Input: '2 of 2',
      Info: '4 of 5', Number6: '7 of 7', SkipForward: '4 of 4', Number3: '7 of 7', Stop: '5 of 6',
      ChannelDown: '6 of 6', DirectionDown: '5 of 5', Play: '4 of 6', Number9: '7 of 7', Pause: '5 of 6',
      Number2: '7 of 7', Number5: '7 of 7', VolumeUp: '8 of 10', Select: '7 of 7', DirectionUp: '5 of 5',
      VolumeDown: '8 of 10', Number8: '7 of 7', Enter: '2 of 2', ChannelUp: '6 of 6',
    });
    // The two arrow codes are bound and never named, which is why they are candidates rather than decided.
    for (const scan of [25, 26]) assert.deepEqual([...counts.get(scan)!.keys()], ['unnamed']);
    // And the two Live candidates are bound by no device map.
    for (const scan of [43, 56]) assert.equal(counts.get(scan), undefined);
  });
