/**
 * How many times a press sends the repeating part of a code whose family's definition states no count:
 * the device's own `timing.pressMinRepeats`, section 348, `todo-process-logitech.md` 2.2.
 *
 * **What is claimed, and over what.** On the device groups pinned below, a family stating no count
 * repeats exactly the device's number, 1 or 3, on 45 of the 47 catalogue devices holding one, with two
 * exceptions on devices whose codeset is mostly a family that states a count of its own; and the
 * composer, given that number, writes the set top box's and the Panasonic TX-28A1U's records word for
 * word as Logitech did. The pins are groups of compiles our own accounts produced whose devices are known
 * from outside their bytes: the harvest manifests, the account captures, the power hold compiles' own
 * labels and the test setup. They are chosen, not every such group: a device compiled several times is
 * pinned where its catalogue entry is named, and devices holding only families that state a count add
 * nothing to the claim. Sixteen records of the pins rebuild at no count, `none` in the table: learned
 * codes and a code no catalogue command of the device is.
 * Every count is read off the record by **rebuilding** it: a record's first block is taken to repeat `n`
 * times when Logitech's definition of the command, built at `n`, is that block, interval for interval.
 *
 * **And since section 350, the rhythm table's own blocks.** Each of the table's 26 families stating no
 * count carries the one count it was measured at, read here off a named code each; where a device states
 * another, the composer builds the command at the device's count, scored on the same pins before and after,
 * and the Dell 2300MP composes whole as Logitech compiled it.
 *
 * **What is not claimed.** Other people's configurations and the everyday Harmony One's disagree with the device's number in both directions, and their accounts' settings, which
 * MyHarmony lets an owner change per device, are not known; section 348 names them. Nothing here was
 * checked on a remote.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { IR_ARCHIVE, LAB, needing, require_, skipUnless, skipWithoutIrArchive } from '@harmony/lab';
import {
  archiveProtocolsByName,
  blockOfStatedCode,
  catalogueCommandBlocks,
  catalogueCommands,
  catalogueDevice,
  catalogueDriving,
  cataloguePressRepeats,
  composableKeycode,
  composeCatalogueDevices,
  type Container,
  devices,
  irBlockWords,
  irGroups,
  irHeaderPointers,
  longPressBlockOfStatedCode,
  mergedIntervals,
  parse,
  payloadOf,
  PROTOCOLS,
  type Pulse,
  sameTrain,
  TABLE_PRESS_REPEATS,
  waveformOfArchiveCommand,
} from '../src/index.ts';

/** A device group of a Logitech compile and the catalogue device it is, known from outside its bytes. */
interface Pin {
  readonly fixture: string;
  readonly group: number;
  readonly manufacturer: string;
  readonly file: string;
}

/** A harvest compile carries the name every harvest compile carries, so it is read by its folder. */
const HARVEST = (folder: string, compile: number) =>
  `work/harvest/${folder}/compile-${String(compile).padStart(3, '0')}-Result.EzHex`;

/**
 * Device groups of compiles our own accounts produced, each with the device the account, the manifest
 * or the compile's label names. Where a group was compiled several times byte for byte, for instance the
 * set top box in thirteen compiles, it is here once per distinct group.
 */
const PINS: readonly Pin[] = [
  // The spare Harmony One's configuration, imported into MyHarmony and synced, and the account behind it.
  { fixture: 'one_spare_myharmony', group: 0, manufacturer: 'Denon', file: 'AVR-X4800H' },
  { fixture: 'one_spare_myharmony', group: 2, manufacturer: 'Motorola', file: 'vip_1853' },
  { fixture: 'one_spare_myharmony', group: 3, manufacturer: 'LG', file: 'OLED65G26LA' },
  { fixture: 'one_spare_myharmony', group: 4, manufacturer: 'Plex', file: 'Plex_Player' },
  // The calibration account, on a Harmony One and a Harmony 600, and its LG added for phase 7.
  { fixture: 'calibration_one', group: 0, manufacturer: 'Denon', file: 'AVR-1912' },
  { fixture: 'calibration_one', group: 1, manufacturer: 'Sony', file: 'KDL-32W705B' },
  { fixture: 'calibration_one', group: 2, manufacturer: 'Panasonic', file: 'DMP-BDT110' },
  { fixture: 'calibration_h600', group: 0, manufacturer: 'Sony', file: 'KDL-32W705B' },
  { fixture: 'calibration_h600', group: 1, manufacturer: 'Panasonic', file: 'DMP-BDT110' },
  { fixture: 'calibration_h600', group: 2, manufacturer: 'Denon', file: 'AVR-1912' },
  { fixture: 'phase7_after', group: 0, manufacturer: 'LG', file: '42LM3400' },
  // The three compiles of section 160, whose appliances the catalogue capture beside each names.
  { fixture: 'compiled_protocols', group: 0, manufacturer: 'Pioneer', file: 'CLD-V880' },
  { fixture: 'compiled_protocols', group: 1, manufacturer: 'Sony', file: 'CMT-ED2' },
  { fixture: 'compiled_protocols', group: 2, manufacturer: 'Toshiba', file: '20VL44G2' },
  { fixture: 'compiled_protocols', group: 3, manufacturer: 'Microsoft', file: 'MS-1039' },
  { fixture: 'compiled_protocols', group: 4, manufacturer: 'Denon', file: 'AVR-28' },
  { fixture: 'compiled_protocols', group: 7, manufacturer: 'JVC', file: 'A-X5' },
  { fixture: 'compiled_protocols', group: 8, manufacturer: 'Pioneer', file: 'CLD50' },
  { fixture: 'compiled_protocols', group: 11, manufacturer: 'Pioneer', file: 'DV-37' },
  { fixture: 'compiled_protocols', group: 12, manufacturer: 'Motorola', file: 'X4S2000' },
  { fixture: 'compiled_protocols', group: 13, manufacturer: 'Samsung', file: 'CB-5322A' },
  { fixture: 'compiled_protocols', group: 14, manufacturer: 'Motorola', file: 'vip_1853' },
  { fixture: 'compiled_protocols_2', group: 0, manufacturer: 'Samsung', file: 'CT8685' },
  { fixture: 'compiled_protocols_2', group: 1, manufacturer: 'Samsung', file: 'BD-D5100' },
  { fixture: 'compiled_protocols_2', group: 2, manufacturer: 'Denon', file: 'AVR-A1' },
  { fixture: 'compiled_protocols_2', group: 5, manufacturer: 'Thomson', file: '14MG115' },
  { fixture: 'compiled_protocols_2', group: 8, manufacturer: 'Yamaha', file: 'DVD-S501' },
  { fixture: 'compiled_protocols_2', group: 9, manufacturer: 'Samsung', file: 'BDC8000' },
  { fixture: 'compiled_protocols_2', group: 10, manufacturer: 'Thomson', file: '32FA3103W' },
  { fixture: 'compiled_protocols_2', group: 11, manufacturer: 'Microsoft', file: 'VIP2250' },
  { fixture: 'compiled_protocols_2', group: 12, manufacturer: 'Samsung', file: 'CX-348ZME' },
  { fixture: 'compiled_protocols_2', group: 13, manufacturer: 'Thomson', file: '21MS56F' },
  { fixture: 'compiled_protocols_3', group: 3, manufacturer: 'Thomson', file: '25DT66H' },
  { fixture: 'compiled_protocols_3', group: 6, manufacturer: 'Yamaha', file: 'DSP-A592' },
  { fixture: 'compiled_protocols_3', group: 8, manufacturer: 'Thomson', file: '28DG57H' },
  // The bench Harmony 650's own configuration and the bench Harmony 600's, through MyHarmony.
  { fixture: 'h650_config_region', group: 1, manufacturer: 'Motorola', file: 'vip_1853' },
  { fixture: 'h650_config_region', group: 3, manufacturer: 'Denon', file: 'AVR-X4800H' },
  // Not the Harmony 600's own configuration: its devices are known from their bytes only. Its television
  // was matched to one codeset, section 305, and eleven catalogue entries rebuild all of its set top
  // box's records, some stating 1 and some 3, only one code leaning to the KPN VIP1853. Section 348.
  // The power hold compiles of sections 306 to 308, whose labels are the catalogue's own names.
  { fixture: 'h700_power_hold_compile', group: 0, manufacturer: 'Barco', file: '6300' },
  { fixture: 'h700_power_hold_compile', group: 2, manufacturer: 'Motorola', file: 'vip_1853' },
  { fixture: 'h700_power_hold_compile', group: 3, manufacturer: 'JVC', file: 'DLA-HD10KU' },
  { fixture: 'h700_power_hold_compile', group: 6, manufacturer: 'Panasonic', file: 'TX-P42GT30E' },
  { fixture: 'h650_power_hold_compile', group: 1, manufacturer: 'Panasonic', file: 'TX-29AK40F' },
  { fixture: 'h650_power_hold_compile', group: 6, manufacturer: 'Knoll', file: 'HDP-1100' },
  { fixture: 'h700_power_hold_compile_2', group: 1, manufacturer: 'Pioneer', file: 'DEH-P47DH' },
  { fixture: 'h700_power_hold_compile_2', group: 3, manufacturer: 'Mivar', file: '14_M3_TVD' },
  { fixture: 'h700_power_hold_compile_2', group: 7, manufacturer: 'Thomson', file: 'DSI-4400' },
  { fixture: 'h650_power_hold_compile_2', group: 0, manufacturer: 'Dell', file: '2300MP' },
  { fixture: 'h650_power_hold_compile_2', group: 7, manufacturer: 'Panasonic', file: 'TX-28A1U' },
  { fixture: 'h700_power_hold_compile_3', group: 1, manufacturer: 'Panasonic', file: 'TH-42PA30' },
  { fixture: 'h700_power_hold_compile_3', group: 3, manufacturer: 'Quasar', file: 'SP2717T' },
  { fixture: 'h700_power_hold_compile_3', group: 4, manufacturer: 'Panasonic', file: 'CS-29FJ20S' },
  { fixture: 'h700_power_hold_compile_4', group: 1, manufacturer: 'Panasonic', file: 'TX-D37LT84F' },
  { fixture: 'h700_power_hold_compile_4', group: 5, manufacturer: 'Sony', file: 'KE-50MR1E' },
  { fixture: 'h700_power_hold_compile_4', group: 7, manufacturer: 'Thomson', file: '25DT60H' },
  // The bench Harmony 650's test setup, plan 006, whose three devices not above are these.
  { fixture: 'h650_start_config', group: 1, manufacturer: 'KPN', file: 'TV6000COK' },
  { fixture: 'h650_start_config', group: 4, manufacturer: 'Sony', file: 'DAV-C540' },
  { fixture: 'h650_start_config', group: 6, manufacturer: 'Ligawo', file: '3090063' },
  // The harvest's compiles on the first test account's Harmony One, devices named by each manifest.
  { fixture: HARVEST('families-one', 1), group: 0, manufacturer: 'Samsung', file: 'Samsung_Test_Device_3' },
  { fixture: HARVEST('families-one', 2), group: 0, manufacturer: 'Philips', file: '70FA930_00S' },
  { fixture: HARVEST('families-one', 2), group: 1, manufacturer: 'Samsung', file: 'LNR408DX' },
  { fixture: HARVEST('families-one', 3), group: 0, manufacturer: 'Sony', file: 'RDR-GXD500' },
  { fixture: HARVEST('families-one', 3), group: 1, manufacturer: 'Gemini', file: 'TestQuhd' },
  { fixture: HARVEST('families-one', 3), group: 2, manufacturer: 'Pioneer', file: 'VSX-90TXV' },
  { fixture: HARVEST('families-one', 3), group: 3, manufacturer: 'Rosen_Aviation', file: '0602-2XX-8' },
  { fixture: 'harvest_one_two_devices', group: 0, manufacturer: 'LG', file: 'OLED65G26LA' },
];

/** Per pin: the device's count, then each family's records by the count they repeat. */
const EXPECTED: readonly string[] = [
  'AVR-X4800H 3: Sharp 15 Bit 2 3 x29, Sharp 48 Bit 2 3 x110, none x5',
  'vip_1853 1: Kreatel IP 22 Bit 1 x50, none x1',
  'OLED65G26LA 1: Toshiba 32 Bit 1 x83',
  'Plex_Player 1: Toshiba 32 Bit 1 x69',
  'AVR-1912 3: Sharp 15 Bit 2 3 x1, Sharp 48 Bit 2 3 x91',
  'KDL-32W705B 3: Sony 12 Bit 3 x56, Sony 15 Bit 3 x44',
  'DMP-BDT110 3: PanasonicV2 48 Bit 3 x49',
  'KDL-32W705B 3: Sony 12 Bit 3 x56, Sony 15 Bit 3 x44, none x1',
  'DMP-BDT110 3: PanasonicV2 48 Bit 3 x49',
  'AVR-1912 3: Sharp 15 Bit 2 3 x1, Sharp 48 Bit 2 3 x91',
  '42LM3400 1: Toshiba 32 Bit 1 x79',
  'CLD-V880 3: MemorexV2 32 Bit 3 x38, MemorexV2 32 Bit Dual 3 x2',
  'CMT-ED2 3: Sony 12 Bit 3 x56, Sony 20 Bit 3 x14',
  '20VL44G2 3: Memorex 32 Bit 1 x8, Toshiba 32 Bit 1 x36',
  'MS-1039 3: Microsoft 30 Bit 3 x65',
  'AVR-28 3: Sharp 15 Bit 2 3 x133, Sharp 48 Bit 2 3 x7',
  'A-X5 3: JVC 16 Bit 3 x108, Panasonic 16 Bit 3 x1, Sharp 48 Bit 3 x1, Sony 15 Bit 3 x3',
  'CLD50 3: Pioneer 32 Bit 2 3 x3, Pioneer 32 Bit 3 x6, Pioneer 32 Bit Dual 3 x34',
  'DV-37 3: PioneerO1 32 Bit 3 x7, PioneerO1 32 Bit Dual 3 x40',
  'X4S2000 1: JerroldO1 16 Bit 1 x49',
  'CB-5322A 3: Magnavox 13 Bit 3 x105, Pioneer 32 Bit 3 x1',
  'vip_1853 1: Kreatel IP 22 Bit 1 x56, none x1',
  'CT8685 3: Philips RC5 13 Bit Toggle 3 x51',
  'BD-D5100 1: Samsung 16 and 20 Bit 1 x46',
  'AVR-A1 3: Sharp 15 Bit 3 x95, Sharp 48 Bit 2 3 x5',
  '14MG115 3: Thomson 12 Bit Toggle 3 x59',
  'DVD-S501 3: Philips Hurd 16 Bit LongToggle 3 x46',
  'BDC8000 1: Samsung 38 Bit 1 x35',
  '32FA3103W 3: RCAV1 LF 24 Bit 3 x52',
  'VIP2250 1: Galaxis 16 Bit Quad Toggle 1 x48',
  'CX-348ZME 3: MitsubishiO1 Dual 8 16 Bit 3 x40',
  '21MS56F 3: Short 11 Bit 2 3 x42',
  '25DT66H 3: Philips RECS80 11 Bit 3 x34, Philips RECS80 11 Bit held power x1',
  'DSP-A592 3: PanasonicV2 48 Bit 1 x4, Toshiba 32 Bit 1 x127',
  '28DG57H 3: Videocrypt 11 Bit Toggle 3 x32',
  'vip_1853 1: Kreatel IP 22 Bit 1 x50, none x1',
  'AVR-X4800H 3: Sharp 15 Bit 2 3 x29, Sharp 48 Bit 2 3 x110, none x5',
  '6300 3: Magnavox 13 Bit 3 x33, Magnavox 13 Bit held power x1',
  'vip_1853 1: Kreatel IP 22 Bit 1 x50, none x1',
  'DLA-HD10KU 3: JVC 16 Bit 3 x15, JVC 16 Bit held power x2',
  'TX-P42GT30E 3: PanasonicV2 48 Bit 3 x83, PanasonicV2 48 Bit held power x2',
  'TX-29AK40F 3: PanasonicV2 48 Bit 3 x63, PanasonicV2 48 Bit held power x2',
  'HDP-1100 1: Toshiba 32 Bit 1 x12, Toshiba 32 Bit held power x2',
  'DEH-P47DH 3: Pioneer 32 Bit 3 x11, Pioneer 32 Bit Dual 3 x40, Pioneer 32 Bit held power x1',
  '14_M3_TVD 3: Philips RECS80 11 Bit 3 x30, Philips RECS80 11 Bit held power x2',
  'DSI-4400 3: Thomson 12 Bit Toggle 3 x47, Thomson 12 Bit Toggle held power x1',
  '2300MP 3: Memorex 32 Bit 3 x34, Memorex 32 Bit held power x1',
  'TX-28A1U 3: Technics 22 Bit 3 x38, Technics 22 Bit held power x1',
  'TH-42PA30 3: PanasonicV2 48 Bit 3 x60, PanasonicV2 48 Bit held power x2',
  'SP2717T 3: PanasonicV2 48 Bit 3 x59, PanasonicV2 48 Bit held power x1',
  'CS-29FJ20S 3: PanasonicV2 48 Bit 3 x85, PanasonicV2 48 Bit held power x1',
  'TX-D37LT84F 3: PanasonicV2 48 Bit 3 x59, PanasonicV2 48 Bit held power x2',
  'KE-50MR1E 3: Sony 12 Bit 3 x112, Sony 12 Bit held power x2, Sony 15 Bit 3 x35, Toshiba 32 Bit 3 x1',
  '25DT60H 3: Philips RECS80 11 Bit 3 x34, Philips RECS80 11 Bit held power x1',
  'TV6000COK 1: Toshiba 32 Bit 1 x49',
  'DAV-C540 3: Sony 12 Bit 3 x4, Sony 15 Bit 3 x17, Sony 20 Bit 3 x37',
  '3090063 1: Toshiba 32 Bit 1 x15',
  'Samsung_Test_Device_3 3: GoVideoO1 32 Bit 3 x255',
  '70FA930_00S 1: Philips 13 Bit 1 x43, Philips Hurd 16 Bit LongToggle 1 x3, none x1',
  'LNR408DX 3: GoVideo 32 Bit 2 3 x1, GoVideo 32 Bit 3 x108',
  'RDR-GXD500 3: Sony 20 Bit 3 x73',
  'TestQuhd 3: Microsoft 30 Bit 3 x72',
  'VSX-90TXV 3: Pioneer 32 Bit 3 x43, Pioneer 32 Bit Dual 3 x100',
  '0602-2XX-8 1: LG 32 Bit 1 x48',
  'OLED65G26LA 1: Toshiba 32 Bit 1 x76',
];
const AGREE_RECORDS = 3391;
const STATED_AGREE = 1021;
const AT_THREE_WRONG = 299;

const FIXTURES = [...new Set(PINS.flatMap((one) => (one.fixture.startsWith('work/') ? [] : [one.fixture])))];

function open(fixture: string): Container {
  // A harvest compile is read by its path, guarded by the fixtures beside it: `skipUnless` cannot pass
  // without a lab, and a missing compile is a failure rather than a skip.
  const bytes = fixture.startsWith('work/')
    ? (() => {
      const path = join(LAB!, fixture);
      assert.ok(existsSync(path), `${fixture} is in the lab`);
      return new Uint8Array(readFileSync(path));
    })()
    : require_(fixture);
  let payload = bytes;
  try { payload = payloadOf(bytes); } catch { /* a bare container */ }
  return parse(payload);
}

/** A block's intervals with adjacent ones of a kind joined and the silence it opens with dropped. */
function train(pulses: readonly Pulse[]): string {
  const merged = mergedIntervals(pulses);
  while (merged.length > 0 && !merged[0]!.mark) merged.shift();
  return merged.map((one) => `${one.mark ? '+' : '-'}${one.us}`).join(',');
}
const pulsesOfWords = (words: readonly number[]): Pulse[] =>
  words.map((word) => ({ mark: (word & 0x8000) !== 0, us: word & 0x7fff }));

/**
 * How many times each record of a group repeats, read by rebuilding it: every command of the device's
 * codeset built from its definition at 0 to 6 repetitions, and the device's held power steps cut the way
 * section 309 cuts them. Keyed `family n`, or `family held power` for a power step held for a time, or
 * `none` for a record nothing rebuilds.
 */
function repeatsOfGroup(c: Container, pin: Pin): Map<string, number> {
  const protocols = archiveProtocolsByName(IR_ARCHIVE!);
  const device = catalogueDevice(IR_ARCHIVE!, pin.manufacturer, pin.file);
  const commands = catalogueCommands(IR_ARCHIVE!, device.codeset!);
  const driving = catalogueDriving(IR_ARCHIVE!, pin.manufacturer, pin.file);
  const holds = Object.values(driving.power ?? {}).flatMap((steps) => (Array.isArray(steps) ? steps : []))
    .flatMap((step) => (step.kind === 'send' && step.holdMs !== undefined ? [step] : []));
  const known = new Map<string, Set<string>>();
  const note = (pulses: readonly Pulse[], what: string) => {
    const key = train(pulses);
    known.set(key, (known.get(key) ?? new Set()).add(what));
  };
  for (const command of commands) {
    const family = /^G:([^:]+):/.exec(command.keycode)?.[1];
    const protocol = family === undefined ? undefined : protocols.get(family);
    if (protocol === undefined) continue;
    for (let n = 0; n <= 6; n += 1) {
      const built = waveformOfArchiveCommand(protocol, command.keycode, { repeats: n, asStored: true });
      if ('refusal' in built || built.once.length === 0) continue;
      note(built.once, `${family} ${n}`);
      for (const hold of holds) {
        if (hold.command !== command.name) continue;
        const held = longPressBlockOfStatedCode(command.keycode, hold.holdMs!, undefined, built.once);
        if (held !== undefined) note(held, `${family} held power`);
      }
    }
  }
  const out = new Map<string, number>();
  for (const address of irGroups(c)![pin.group]!.addresses) {
    const [once] = irHeaderPointers(c, address);
    const words = irBlockWords(c, once!)!.filter((word) => word !== 0);
    const found = known.get(train(pulsesOfWords(words)));
    // A record two readings rebuild is one count only where they agree, and a held power step wins,
    // since it is cut to its hold and the count it would otherwise read as is the cut's.
    const what = found === undefined ? 'none'
      : [...found].find((one) => one.endsWith('held power')) ?? (found.size === 1 ? [...found][0]! : `${[...found].join(' or ')}`);
    out.set(what, (out.get(what) ?? 0) + 1);
  }
  return out;
}

test('a family stating no repeat count repeats the device\'s own count on 45 of the 47 pinned catalogue devices holding such a family',
  needing(skipWithoutIrArchive(), skipUnless(...FIXTURES)), () => {
    const protocols = archiveProtocolsByName(IR_ARCHIVE!);
    const table: string[] = [];
    /** Per distinct catalogue device holding a family that states no count: its count, and whether every such record is at it. */
    const noCount = new Map<string, { count: number; agrees: boolean }>();
    let agreeRecords = 0;
    let statedAgree = 0;
    const disagree: string[] = [];
    let atThreeWrong = 0;
    for (const pin of PINS) {
      const c = open(pin.fixture);
      const count = catalogueDriving(IR_ARCHIVE!, pin.manufacturer, pin.file).timing.pressMinRepeats;
      const counts = repeatsOfGroup(c, pin);
      table.push(`${pin.file} ${count}: ${[...counts].sort().map(([what, n]) => `${what} x${n}`).join(', ')}`);
      let agrees = true;
      let holdsOne = false;
      for (const [what, n] of counts) {
        const match = /^(.*) (\d)$/.exec(what);
        if (match === null) continue;
        const [, family, read] = match;
        const stated = protocols.get(family!)?.pressMinimumRepeats ?? null;
        if (stated !== null) {
          if (Number(read) === stated) statedAgree += n;
          else disagree.push(`${pin.file} ${family} states ${stated}, read ${read} x${n}`);
          continue;
        }
        holdsOne = true;
        if (Number(read) === count) agreeRecords += n;
        else { agrees = false; disagree.push(`${pin.file} ${family} device ${count}, read ${read} x${n}`); }
        // **The control**: the working idea of `todo-secure-logitech.md` 2.2.2, the stated count or three.
        if (Number(read) !== 3) atThreeWrong += n;
      }
      const key = `${pin.manufacturer}/${pin.file}`;
      if (holdsOne) noCount.set(key, { count, agrees: agrees && (noCount.get(key)?.agrees ?? true) });
    }
    assert.equal(PINS.length, 65);
    assert.deepEqual(table, EXPECTED);
    // A family with no count of its own repeats the device's count, record for record, on 45 of the 47
    // distinct catalogue devices holding one; the two others are mostly `Toshiba 32 Bit`, which states 1,
    // and Logitech wrote 1 for every command of both. And a family that states a count is written at it
    // except for one record: the Sony KE-50MR1E's one `Toshiba 32 Bit` command, written at the device's 3
    // among 147 Sony records at 3.
    assert.equal(noCount.size, 47);
    assert.equal([...noCount.values()].filter((one) => one.agrees).length, 45);
    // **What separates the device's count from three is three devices**, the only ones stating 1: the set
    // top box, counted once although four compiles hold it, the Samsung Blu-ray player and the Philips
    // television. The other 42 that agree state 3, which three for every family would fit as well.
    assert.deepEqual([...noCount].filter(([, one]) => one.count !== 3).map(([key, one]) => `${key} ${one.count} ${one.agrees}`),
      ['Motorola/vip_1853 1 true', 'Samsung/BDC8000 1 true', 'Philips/70FA930_00S 1 true']);
    assert.equal(agreeRecords, AGREE_RECORDS);
    assert.equal(statedAgree, STATED_AGREE);
    assert.deepEqual(disagree, [
      '20VL44G2 Memorex 32 Bit device 3, read 1 x8',
      'DSP-A592 PanasonicV2 48 Bit device 3, read 1 x4',
      'KE-50MR1E Toshiba 32 Bit states 1, read 3 x1',
    ]);
    // Three for every family that states nothing would be wrong on the records of the devices stating 1:
    // the set top box's four compiles, the Philips, the Samsung Blu-ray, and the two devices above.
    assert.equal(atThreeWrong, AT_THREE_WRONG);
  });

// ---------------------------------------------------------------------------------------------------
// The composer, given the device's count

/** A group's records as their three blocks' words, `-` for an empty pointer, as `composecatalogue.test.ts` reads them. */
function recordBlocks(c: Container, group: number): string[][] {
  return irGroups(c)![group]!.addresses.map((address) => irHeaderPointers(c, address).slice(0, 3).map((pointer) => {
    if (pointer === 0) return '-';
    const words: number[] = [];
    for (let at = c.blobOffsetOf(pointer)!; ; at += 2) {
      const word = c.blob[at]! | (c.blob[at + 1]! << 8);
      if (word === 0) break;
      words.push(word);
    }
    return words.join(',');
  }));
}

/**
 * The once block without the silence it opens with. The Harmony 600's compile opens its blocks with
 * none where the Harmony 650's open with 50 ms, a difference of the compile's and not of the count, so
 * a 600 compile is compared on what follows the silence.
 */
const withoutLead = (blocks: readonly string[]): string => {
  const words = blocks[0]!.split(',').map(Number);
  return [words.slice(words.findIndex((word) => (word & 0x8000) !== 0)).join(','), ...blocks.slice(1)].join('|');
};

/**
 * Whole devices whose families state no count and the rhythm table holds no block for, composed onto the
 * Harmony 650's configuration and compared with Logitech's records for the same device: the set top box
 * at its count of 1 and the Panasonic TX-28A1U at 3. And the same box sold under the KPN name, at its 3,
 * against the Harmony 600's set top box, which is written at 3 and whose catalogue device is not known,
 * the first test's pins: that one shows the intro and three repetitions compose, not whose count 3 is.
 */
const WHOLE = [
  { fixture: 'h650_config_region', group: 1, manufacturer: 'Motorola', model: 'vip_1853', lead: true },
  { fixture: 'h600_config', group: 1, manufacturer: 'KPN', model: 'VIP1853', lead: false },
  { fixture: 'h650_power_hold_compile_2', group: 7, manufacturer: 'Panasonic', model: 'TX-28A1U', lead: true },
] as const;

test('two devices whose families state no repeat count, composed whole at their own count, press as Logitech compiled them',
  needing(skipWithoutIrArchive(), skipUnless('h650_panasonic_config', ...WHOLE.map((one) => one.fixture))), () => {
    const base = open('h650_panasonic_config');
    const results: string[] = [];
    for (const one of WHOLE) {
      const composed = composeCatalogueDevices(base, IR_ARCHIVE!, [{ manufacturer: one.manufacturer, model: one.model,
        label: 'Test', full: true, inputs: true }], { maxDevices: 99 });
      assert.deepEqual(composed.devices[0]!.leftOut, [], `${one.model}: every catalogue command composes`);
      const c = parse(composed.bytes);
      const whole = one.lead ? (blocks: readonly string[]) => blocks.join('|') : withoutLead;
      const once = (blocks: readonly string[]) => whole(blocks.slice(0, 1));
      const mine = recordBlocks(c, devices(c).find((d) => d.name === 'Test')!.group!);
      const theirs = recordBlocks(open(one.fixture), one.group);
      const found = (key: (blocks: readonly string[]) => string) => {
        const theirKeys = new Set(theirs.map(key));
        return mine.filter((blocks) => theirKeys.has(key(blocks))).length;
      };
      const count = catalogueDriving(IR_ARCHIVE!, one.manufacturer, one.model).timing.pressMinRepeats;
      results.push(`${one.model} at ${count}: once ${found(once)}, whole ${found(whole)} of ${mine.length}`);
    }
    // On the Harmony 650's own compiles every record composed, once, held and tail block, is one of
    // Logitech's for the same device; the rest of Logitech's groups are the one block copies of section
    // 337. The KPN entry at its 3 agrees with the Harmony 600's set top box, a device not known but
    // written at 3, on the block a press sends for all but `DVR`, which no record there matches and which
    // is not read further; that compile gives five commands, Home, PowerToggle, Radio, TV and Teletext, no
    // block while held, which is not the count and is not read here.
    assert.deepEqual(results, [
      'vip_1853 at 1: once 39, whole 39 of 39',
      'VIP1853 at 3: once 38, whole 33 of 39',
      'TX-28A1U at 3: once 28, whole 28 of 28',
    ]);
  });

test('the control: the set top box built at the other count matches none of Logitech\'s records for it',
  needing(skipWithoutIrArchive(), skipUnless('h650_config_region')), () => {
    const protocols = archiveProtocolsByName(IR_ARCHIVE!);
    const device = catalogueDevice(IR_ARCHIVE!, 'Motorola', 'vip_1853');
    const theirs = new Set(recordBlocks(open('h650_config_region'), 1).map((blocks) =>
      train(pulsesOfWords(blocks[0]!.split(',').map(Number)))));
    const matched = (repeats: number) => catalogueCommands(IR_ARCHIVE!, device.codeset!).filter((command) => {
      const built = catalogueCommandBlocks(command.keycode, { repeats }, protocols);
      return built !== undefined && !('refusal' in built) && theirs.has(train(built.once));
    }).length;
    // At the device's 1 every command of the codeset is one of Logitech's records; at the 3 a family
    // with no count of its own was assumed to repeat, none is.
    assert.equal(catalogueCommands(IR_ARCHIVE!, device.codeset!).length, 38);
    assert.equal(matched(1), 38);
    assert.equal(matched(3), 0);
  });

test('what is still unknown is refused: a count of 0 and a device whose codeset holds a family stating another count, while a release group builds',
  needing(skipWithoutIrArchive()), () => {
    const protocols = archiveProtocolsByName(IR_ARCHIVE!);
    // The Toshiba 20VL44G2 states 3, and its codeset is mostly `Toshiba 32 Bit`, which states 1: Logitech
    // wrote its `Memorex 32 Bit` commands at 1, the first test, so the device's 3 is not used there.
    const toshiba = catalogueCommands(IR_ARCHIVE!, catalogueDevice(IR_ARCHIVE!, 'Toshiba', '20VL44G2').codeset!)
      .map((command) => command.keycode);
    assert.deepEqual(cataloguePressRepeats(catalogueDriving(IR_ARCHIVE!, 'Toshiba', '20VL44G2'), toshiba, protocols), {
      refusal: 'the device states a repeat count of 3 and its Toshiba 32 Bit commands\' family states 1, '
        + 'and on such a device Logitech\'s compiler does not always use the device\'s number',
    });
    // The set top box's own codeset at the counts devices state: 1 and 3 are used, 0 is not.
    const box = catalogueCommands(IR_ARCHIVE!, catalogueDevice(IR_ARCHIVE!, 'Motorola', 'vip_1853').codeset!)
      .map((command) => command.keycode);
    assert.deepEqual(cataloguePressRepeats({ timing: { pressMinRepeats: 1 } }, box, protocols), { repeats: 1 });
    assert.deepEqual(cataloguePressRepeats({ timing: { pressMinRepeats: 0 } }, box, protocols),
      { refusal: 'the device states a repeat count of 0, which no Logitech compile here shows' });
    // A refused count refuses every command it would build, and a code the table composes is not built.
    assert.deepEqual(catalogueCommandBlocks(box[0]!, { refusal: 'why' }, protocols), { refusal: 'why' });
    // A code naming a release group was refused here until todo-process-logitech 2.5, section 365, which
    // found Logitech's compiles storing the release behind the record's third pointer. It builds now, once,
    // held and release, and the release is the definition's finish group alone.
    const finlux = catalogueCommandBlocks('G:Finlux 16 Bit:(Start)(0x7FFB)(Finish):3', { repeats: 3 }, protocols);
    assert.ok(finlux !== undefined && !('refusal' in finlux));
    assert.deepEqual([finlux.once.length > 0, (finlux.held?.length ?? 0) > 0, (finlux.release?.length ?? 0) > 0],
      [true, true, true]);
  });

// ---------------------------------------------------------------------------------------------------
// The rhythm table's own blocks, each measured on one device, at the device's count: section 350

/**
 * One code per family `TABLE_PRESS_REPEATS` names, from the archive's codesets, whose table block
 * Logitech's definition rebuilds at the family's number and at no other count from 0 to 6. The census,
 * `make composecensus`, rereads every code of every family; these are what a test can name.
 */
const TABLE_SAMPLES: Readonly<Record<string, string>> = {
  'JVC 16 Bit': 'G:JVC 16 Bit:(Start)(0xCD06)():3',
  'Magnavox 13 Bit': 'G:Magnavox 13 Bit:()(0x057F)():3',
  'Memorex 32 Bit': 'G:Memorex 32 Bit:()(0x53AA9A65)():3',
  'MemorexO1 32 Bit': 'G:MemorexO1 32 Bit:()(0xEFF2B04F)():3',
  'MemorexV2 32 Bit': 'G:MemorexV2 32 Bit:()(0x76899867)():3',
  'MemorexV2 32 Bit Dual': 'G:MemorexV2 32 Bit Dual:()(0x120A6897_1x120A6897)():3',
  'Microsoft 30 Bit': 'G:Microsoft 30 Bit:()(0x3FD942CD)():3',
  'PanasonicV2 48 Bit': 'G:PanasonicV2 48 Bit:()(0x40040D009895)():3',
  'Philips Hurd 16 Bit LongToggle': 'G:Philips Hurd 16 Bit LongToggle:()(0x7_1x0_2xFF26)():3',
  'Philips RC5 13 Bit Toggle': 'G:Philips RC5 13 Bit Toggle:()(0x10C6)():3',
  'Philips RECS80 11 Bit': 'G:Philips RECS80 11 Bit:()(0x54E)():3',
  'Pioneer 32 Bit': 'G:Pioneer 32 Bit:()(0x55AAE916)():3',
  'Pioneer 32 Bit 2': 'G:Pioneer 32 Bit 2:(0x659A45BA)(0xF50AB649)():3',
  'Pioneer 32 Bit Dual': 'G:Pioneer 32 Bit Dual:()(0x55AACB34_0xF50A3CC3)():3',
  'PioneerO1 32 Bit': 'G:PioneerO1 32 Bit:()(0x55AA00FF)():3',
  'PioneerO1 32 Bit Dual': 'G:PioneerO1 32 Bit Dual:()(0x25DAC837_0x25DAC837)():3',
  'RCAV1 LF 24 Bit': 'G:RCAV1 LF 24 Bit:()(0x0CFF30)():3',
  'Samsung 38 Bit': 'G:Samsung 38 Bit:()(0x00801_1x1DA05F)():3',
  'Sharp 15 Bit': 'G:Sharp 15 Bit:()(0x120C_0x11F3)():3',
  'Sharp 15 Bit 2': 'G:Sharp 15 Bit 2:()(0x6142_0x62BD)():3',
  'Sharp 48 Bit 2': 'G:Sharp 48 Bit 2:()(0x2A4C028974FF)():3',
  'Short 11 Bit 2': 'G:Short 11 Bit 2:()(0x031)():3',
  'Sony 15 Bit': 'G:Sony 15 Bit:()(0x5CE9)():3',
  'Sony 20 Bit': 'G:Sony 20 Bit:()(0x2CB9C)():3',
  'Thomson 12 Bit Toggle': 'G:Thomson 12 Bit Toggle:()(0xA0E)():3',
  'Videocrypt 11 Bit Toggle': 'G:Videocrypt 11 Bit Toggle:()(0x1CE)():3',
};

/** The counts 0 to 6 at which a code's definition rebuilds its table block, by the given comparison. */
function tableReads(keycode: string, same: (a: readonly Pulse[], b: readonly Pulse[]) => boolean): number[] {
  const protocols = archiveProtocolsByName(IR_ARCHIVE!);
  const family = /^G:([^:]+):/.exec(keycode)![1]!;
  const table = blockOfStatedCode(keycode, undefined, 'once')!;
  const reads: number[] = [];
  for (let n = 0; n <= 6; n += 1) {
    const built = waveformOfArchiveCommand(protocols.get(family)!, keycode, { repeats: n, asStored: true });
    if (!('refusal' in built) && built.once.length > 0 && same(built.once, table)) reads.push(n);
  }
  return reads;
}

test('a named code of each rhythm table family stating no count rebuilds at that family\'s count and no other, and the map names every such family',
  needing(skipWithoutIrArchive()), () => {
    const protocols = archiveProtocolsByName(IR_ARCHIVE!);
    // Every row carrying a whole block whose family's definition states no count is in the map, and
    // nothing else is: a row the generator adds would otherwise compose at a guessed count.
    const owed = [...new Set(PROTOCOLS.filter((row) => (row.tail ?? row.quad ?? row.longToggle ?? row.sections) !== undefined
      && protocols.get(row.family)?.pressMinimumRepeats === null).map((row) => row.family))].sort();
    assert.deepEqual([...TABLE_PRESS_REPEATS.keys()].sort(), owed);
    assert.equal(owed.length, 26);
    assert.deepEqual(Object.keys(TABLE_SAMPLES).sort(), owed);
    const read: string[] = [];
    for (const [family, keycode] of Object.entries(TABLE_SAMPLES)) {
      assert.ok(composableKeycode(keycode), `${family}: the table composes the named code`);
      read.push(`${family} ${tableReads(keycode, sameTrain).join('/')}`);
    }
    assert.deepEqual(read.sort(), [...TABLE_PRESS_REPEATS].map(([family, n]) => `${family} ${n}`).sort());
    // Three families at 1: the two Memorex families and Samsung's sectioned one. The rest at 3.
    assert.deepEqual([...TABLE_PRESS_REPEATS].filter(([, n]) => n !== 3).map(([family]) => family),
      ['Memorex 32 Bit', 'MemorexO1 32 Bit', 'Samsung 38 Bit']);
    // **The control for the one microsecond `sameTrain` forgives.** Compared exactly, the long toggle
    // family's table block rebuilds at no count, because its emitter leaves off the microsecond every
    // stored block ends in; every other named code reads the same either way.
    const exact = (a: readonly Pulse[], b: readonly Pulse[]) => train(a) === train(b);
    assert.deepEqual(tableReads(TABLE_SAMPLES['Philips Hurd 16 Bit LongToggle']!, exact), []);
    assert.deepEqual(Object.entries(TABLE_SAMPLES).filter(([, keycode]) =>
      tableReads(keycode, exact).join() !== tableReads(keycode, sameTrain).join()).map(([family]) => family),
    ['Philips Hurd 16 Bit LongToggle']);
  });

test('a code the table composes is built at the device\'s count where that is not the table\'s, keeps the table\'s block where it is or where the count is not known, and is refused where the two disagree about the frames a press sends',
  needing(skipWithoutIrArchive()), () => {
    const protocols = archiveProtocolsByName(IR_ARCHIVE!);
    const memorex = TABLE_SAMPLES['Memorex 32 Bit']!;
    // At the table's own 1, and on a device whose count is refused, the table's block is sent.
    assert.equal(catalogueCommandBlocks(memorex, { repeats: 1 }, protocols), undefined);
    assert.equal(catalogueCommandBlocks(memorex, { refusal: 'why' }, protocols), undefined);
    // At 3, the definition's blocks at 3, which is not the table's block.
    const at3 = catalogueCommandBlocks(memorex, { repeats: 3 }, protocols);
    assert.ok(at3 !== undefined && !('refusal' in at3));
    if (at3 === undefined || 'refusal' in at3) return;
    assert.ok(!sameTrain(at3.once, blockOfStatedCode(memorex, undefined, 'once')!));
    assert.deepEqual(tableReads(memorex, sameTrain), [1]);
    const built = waveformOfArchiveCommand(protocols.get('Memorex 32 Bit')!, memorex, { repeats: 3, asStored: true });
    assert.ok(!('refusal' in built));
    if ('refusal' in built) return;
    assert.equal(train(at3.once), train(built.once));
    // A family that states its own count is the table's at every count.
    const toshiba = 'G:Toshiba 32 Bit:()(0x02FD48B7)():3';
    assert.ok(composableKeycode(toshiba));
    assert.equal(protocols.get('Toshiba 32 Bit')!.pressMinimumRepeats, 1);
    assert.equal(catalogueCommandBlocks(toshiba, { repeats: 3 }, protocols), undefined);
    // A code whose table block sends another number of frames than the definition at the table's count:
    // this one states its start frame three times, so the table's three copies are the definition at 0.
    // At the table's 3 the table's block is sent; at any other count it is refused.
    const sony = 'G:Sony 15 Bit:(0x420A_0x420A_0x420A)(0x4B0B)():3';
    assert.ok(composableKeycode(sony));
    assert.deepEqual(tableReads(sony, sameTrain), [0]);
    assert.equal(catalogueCommandBlocks(sony, { repeats: 3 }, protocols), undefined);
    assert.deepEqual(catalogueCommandBlocks(sony, { repeats: 1 }, protocols), {
      refusal: 'the rhythm table\'s block for this code and the definition at the table\'s 3 send different '
        + 'numbers of frames, so how many a press sends at the device\'s count is not known',
    });
  });

/**
 * Over the pins of the first test, every record that rebuilds as a command of a family stating no count
 * which the table composes, scored exactly: right, wrong only by the one microsecond a stored block ends
 * in, or wrong. Before is the table's block, which is what the composer sent until section 350; after is
 * the composer's block now. A device compiled in several groups is counted once per group.
 */
test('the table\'s families stating no count, built at the device\'s count, are right on 2632 of 2636 pinned records where the table was on 2551',
  needing(skipWithoutIrArchive(), skipUnless(...FIXTURES)), () => {
    const protocols = archiveProtocolsByName(IR_ARCHIVE!);
    const familyOf = (keycode: string) => /^G:([^:]+):/.exec(keycode)?.[1];
    const lastMicrosecond = (a: string, b: string) => {
      const [x, y] = [a.split(','), b.split(',')];
      return x.length === y.length && x.slice(0, -1).join() === y.slice(0, -1).join()
        && Math.abs(Number(x.at(-1)!.slice(1)) - Number(y.at(-1)!.slice(1))) === 1;
    };
    const tally = { records: 0, before: new Map<string, number>(), after: new Map<string, number>() };
    const off: string[] = [];
    for (const pin of PINS) {
      const c = open(pin.fixture);
      const commands = catalogueCommands(IR_ARCHIVE!, catalogueDevice(IR_ARCHIVE!, pin.manufacturer, pin.file).codeset!);
      const press = cataloguePressRepeats(catalogueDriving(IR_ARCHIVE!, pin.manufacturer, pin.file),
        commands.map((one) => one.keycode), protocols);
      // Which of the table's commands of a family stating no count each record is, by rebuilding at 0 to 6.
      const who = new Map<string, Set<string>>();
      for (const { keycode } of commands) {
        const protocol = protocols.get(familyOf(keycode) ?? '');
        if (protocol === undefined || protocol.pressMinimumRepeats !== null || !composableKeycode(keycode)) continue;
        for (let n = 0; n <= 6; n += 1) {
          const built = waveformOfArchiveCommand(protocol, keycode, { repeats: n, asStored: true });
          if ('refusal' in built || built.once.length === 0) continue;
          who.set(train(built.once), (who.get(train(built.once)) ?? new Set()).add(keycode));
        }
      }
      for (const address of irGroups(c)![pin.group]!.addresses) {
        const [once] = irHeaderPointers(c, address);
        const theirs = train(pulsesOfWords(irBlockWords(c, once!)!.filter((word) => word !== 0)));
        const keycodes = who.get(theirs);
        if (keycodes === undefined) continue;
        tally.records += 1;
        const score = (block: (keycode: string) => string | undefined): string => {
          const mine = [...keycodes].map(block);
          if (mine.includes(theirs)) return 'right';
          if (mine.every((one) => one === undefined)) return 'refused';
          return mine.some((one) => one !== undefined && lastMicrosecond(one, theirs)) ? 'last microsecond' : 'wrong';
        };
        const before = score((keycode) => train(blockOfStatedCode(keycode, undefined, 'once')!));
        const after = score((keycode) => {
          const blocks = catalogueCommandBlocks(keycode, press, protocols);
          if (blocks === undefined) return train(blockOfStatedCode(keycode, undefined, 'once')!);
          return 'refusal' in blocks ? undefined : train(blocks.once);
        });
        tally.before.set(before, (tally.before.get(before) ?? 0) + 1);
        tally.after.set(after, (tally.after.get(after) ?? 0) + 1);
        if (before !== 'right' || after !== 'right') off.push(`${pin.file} ${familyOf([...keycodes][0]!)}: ${before}, now ${after}`);
      }
    }
    assert.equal(tally.records, 2636);
    assert.deepEqual(Object.fromEntries(tally.before), { right: 2551, 'last microsecond': 46, wrong: 39 });
    assert.deepEqual(Object.fromEntries(tally.after), { right: 2632, wrong: 4 });
    // Before: the Dell's 34 at the table's 1 where it was written at its own 3, the Philips 70FA930's long
    // toggle record at the table's 3 where it was written at its own 1, and the Yamaha DSP-A592's 4 at the
    // table's 3 where it was written at 1. After: only the Yamaha, whose count `cataloguePressRepeats`
    // refuses, so the table's block stays, todo-process-logitech 2.2.2. The 46 are the Yamaha DVD-S501's
    // long toggle records at the table's own 3, one microsecond short at the end, a fault of the table's
    // emitter and not of the count, which section 350 left; since todo-process-logitech 2.5, section 365, a
    // code of a whole record row is built from the definition where it sends the row's train, and all 46 are
    // right.
    const counted = new Map<string, number>();
    for (const one of off) counted.set(one, (counted.get(one) ?? 0) + 1);
    assert.deepEqual([...counted].map(([one, n]) => `${one} x${n}`).sort(), [
      '2300MP Memorex 32 Bit: wrong, now right x34',
      '70FA930_00S Philips Hurd 16 Bit LongToggle: wrong, now right x1',
      'DSP-A592 PanasonicV2 48 Bit: wrong, now wrong x4',
      'DVD-S501 Philips Hurd 16 Bit LongToggle: last microsecond, now right x46',
    ]);
  });

test('the Dell 2300MP, whose family\'s table block holds a count it does not state, composed whole at its own count presses as Logitech compiled it, and the Philips 70FA930 gains its long toggle record',
  needing(skipWithoutIrArchive(), skipUnless('h650_panasonic_config', 'h650_power_hold_compile_2')), () => {
    const composed = composeCatalogueDevices(open('h650_panasonic_config'), IR_ARCHIVE!, [{ manufacturer: 'Dell',
      model: '2300MP', label: 'Test', full: true, inputs: true }], { maxDevices: 99 });
    assert.deepEqual(composed.devices[0]!.leftOut, []);
    const c = parse(composed.bytes);
    const mine = recordBlocks(c, devices(c).find((d) => d.name === 'Test')!.group!).map((blocks) => blocks.join('|'));
    const theirList = recordBlocks(open('h650_power_hold_compile_2'), 0).map((blocks) => blocks.join('|'));
    const theirs = new Set(theirList);
    // Every record, once, held and tail block, is one of Logitech's for the device, its power step held
    // for a time included, and the two groups are the same size. Two of Logitech's records are alike,
    // two commands of one code, so they hold 34 distinct records and so does ours.
    assert.equal(mine.length, 35);
    assert.equal(theirList.length, 35);
    assert.equal(theirs.size, 34);
    assert.equal(new Set(mine).size, 34);
    assert.equal(mine.filter((one) => theirs.has(one)).length, 35);
    // **The control**: the table's own block for each of its codes, at the 1 it was measured at, is the
    // first block of none of Logitech's 35 records.
    const firsts = new Set(recordBlocks(open('h650_power_hold_compile_2'), 0).map((blocks) =>
      train(pulsesOfWords(blocks[0]!.split(',').map(Number)))));
    const codes = catalogueCommands(IR_ARCHIVE!, catalogueDevice(IR_ARCHIVE!, 'Dell', '2300MP').codeset!);
    assert.equal(codes.filter(({ keycode }) => firsts.has(train(blockOfStatedCode(keycode, undefined, 'once')!))).length, 0);

    // **The Philips 70FA930**, a Harmony One compile of the harvest, states 1 and its one long toggle
    // record the table composes was written at 1, against the table's 3. Composed whole onto the same
    // configuration and compared on what follows each record's opening silence, since a Harmony One
    // compile opens its blocks with none: 46 of its 47 records are Logitech's in all three blocks, the long
    // toggle one now among them with the held block the definition states. The other is a power step,
    // not read here. Two more long toggle codes state their frame three times, which the table's block does
    // not take: they were left out, 44 of 45, until section 361 built them from the definition at the
    // device's 1, and both are Logitech's records, which `catalogueleftovers.test.ts` holds by name.
    const philips = composeCatalogueDevices(open('h650_panasonic_config'), IR_ARCHIVE!, [{ manufacturer: 'Philips',
      model: '70FA930_00S', label: 'Test', full: true }], { maxDevices: 99 });
    assert.deepEqual(philips.devices[0]!.leftOut, []);
    const p = parse(philips.bytes);
    const ours = recordBlocks(p, devices(p).find((d) => d.name === 'Test')!.group!).map(withoutLead);
    const logitech = new Set(recordBlocks(open(HARVEST('families-one', 2)), 0).map(withoutLead));
    assert.equal(ours.length, 47);
    assert.equal(ours.filter((one) => logitech.has(one)).length, 46);
  });
