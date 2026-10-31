/**
 * The census of what a Harmony 350 and a Harmony 300 configuration holds and which of it a generator of ours
 * builds, `todo-compile-350.md` 5.1, written for [plan 011](../../../docs/plans/011-the-350-from-nothing.md).
 *
 * **What it is for.** Chapter 5 asks for a configuration built entirely by our own generators with nothing copied
 * out of a Logitech file. Before any generator is written for it, this cuts Logitech's compiles of this family
 * into categories, every byte in exactly one, and says per category whether a generator exists in
 * `packages/codec` that builds it **for this family**, **for another family only**, or **nowhere**. The plan's
 * order of work is read off these counts. It reads and writes nothing: no build code is here.
 *
 * **The two files.** The 350's is Logitech's compile of the test setup, the lab's
 * `work/setups/h350-test/compile-Result.EzHex`: eight devices, one activity, five favourite channels and four long
 * presses. The 300's is `h300_programmed_config`: four devices, one activity, four favourite channels, built by
 * Logitech's service for the bench 300, whose keypad has no long press. Both are one generation of the service, so
 * a constant both share is two samples of one compiler and not of the format; the second samples are the five other
 * compiles of this family the lab holds, and the constants below are counted over all seven.
 *
 * **How a byte gets its category.** `claims` in `coverage.ts` names what a reader already attributes, 96.6 percent
 * of the 350's file; the rest, which no reader claims, is named here from the pointer tables (the key maps, the
 * timer records, the parameter groups, the clock record's tail, the archive). An action list is named by what
 * reaches it: the Watch TV binding's lists and nothing else's are the activity's, the start up entries' are the
 * start up's, the four key table tags without an event type bring the pin lists, and a list nothing reaches is its
 * own category; the rest are named by their shape, which is the generator's own, since a composer emits one shape
 * per job. A byte claimed twice goes to the first claim, so the categories add to the file.
 *
 * **The four verdicts.** `builds`: a generator of ours reproduces this family's bytes with no Logitech file in
 * hand, probed below. `edits`: this family's composer produces the bytes, but only by editing a donor container, so
 * a configuration built from nothing has no donor to edit. `other`: a generator exists for another family and
 * refuses this one, probed. `nowhere`: none exists. The split between `builds` and `edits` is the finding that
 * orders the plan: every composer of this family edits a donor, as every composer of the four slot family did
 * before plan 008.
 *
 * **What each verdict rests on** is a probe in the tests below and not a sentence here: the frame refuses
 * architecture 16, the name tree builder, the architecture record builder and
 * the timestamp builder reproduce those sections of all seven files byte for byte, the family's own members refuse as the registry
 * says, and the device composer emits lists of exactly the roles the table credits it with. A verdict that stops
 * being true fails here, so a generator written for this family forces the census to move.
 *
 * **The metadata archive's text and stream.** Node's zlib reproduces none of the three archives checked at any of
 * 3465 settings of level, strategy, memory level and window, while the same search finds the stream Node's own
 * zlib wrote; stock zlib at its defaults reproduces all six distinct archives, which `tests/
 * test_harmony_350_metadata_deflate.py` holds. So the archive needs a deflate of our own, calibrated against
 * those six. The text around the devices is the same 149 and 610 characters in 7 of 7 compiles, a device's number
 * is the account's, and the ZIP's time is the stamp's less whole hours and 413 to 419 seconds, the three probes
 * below; what the check of 5.2 does about the last two is plan 011's.
 *
 * **Sources checked first.** Logitech's client compiles nothing for this family, the service does
 * (`reference/logitech/clients.md`); the reference `reference/architectures/harmony-300-350/memory.md`; the lab's
 * `work/setups/h350-test/chapter4-reading.md`, a reading of the same compile, which agrees with every count here
 * that it also states (331 lists, 9 maps, 16 timers, 30 state variables, 250 codes, the activity's ten lists).
 * **Which architectures**: architecture 16 alone, the Harmony 350 and the Harmony 300, one generation of Logitech's
 * service; the same cut over another family's compile is the four slot family's `attributeBytes`, which this
 * mirrors in kind and not in code.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { IR_ARCHIVE, LAB, needing, require_, skipUnless, skipWithoutIrArchive, skipWithoutLab } from '@harmony/lab';

import {
  type Container, ComposeError, FRAME_ARCHITECTURES, LayoutError, NO_SCREEN_FAMILY, architectureRecord, buildNameTree,
  buildTimestampSection, claims, composeNoScreenDevice, frameArchitecture, metadataArchive, nameNodes, numberSenders, parse,
  stateRecords, taggedList, taggedListExtent,
} from '../src/index.ts';

const COMPILE = 'work/setups/h350-test/compile-Result.EzHex';

/** The Watch TV key's press tag, scan 6: bound to the activity in every compile of the family read, chapter 4's reading. */
const ACTIVITY_TAG = 0x86;
/** The four tags of the key table with no event type, whose lists switch a pin: the firmware's own. */
const PIN_TAGS = new Set([0x2d, 0x2e, 0x2f, 0x30]);
const ACTION_LIST_CALL = 0x7f;
/** The clock record's length, `CLOCK_SECTION_LENGTH`: the cookie, seven field bytes, the terminator and three zeros. */
const CLOCK_LENGTH = 14;
/** The trailer, `TRAILER_CHECKSUM_OFFSET`: the checksum and the end of the file. */
const TRAILER_LENGTH = 6;

const lab = (path: string): Container => {
  const at = join(LAB!, path);
  // The lab is there, so a missing file fails rather than skips: the claim is about this one file.
  assert.ok(existsSync(at), `${path} is in the lab`);
  return parse(new Uint8Array(readFileSync(at)));
};

/** The seven compiles of this family the lab holds, outside the other owner's ZIP: the second samples of every constant. */
const SEVEN = ['h350_config', 'h350_three_devices_config', 'h350_programmed_config', 'h300_config', 'h300_programmed_config'];

const needsLab = needing(skipWithoutLab(), skipUnless(...SEVEN));
const needsComposer = needing(skipWithoutLab(), skipWithoutIrArchive(), skipUnless('h350_three_devices_config'));

/** Every compile the census counts constants over: the test setup's two compiles and the five registered files. */
function seven(): [string, Container][] {
  return [['setup', lab(COMPILE)], ['setup without favourites', lab('work/setups/h350-test/first-compile/compile-Result.EzHex')],
    ...SEVEN.map((name): [string, Container] => [name, parse(require_(name))])];
}

// ---------------------------------------------------------------------------------------------------------------
// The cut

interface Instruction { operand: number; opcode: number }

function listBody(c: Container, index: number): Instruction[] {
  const at = c.blobOffsetOf(c.pointerArray(7)![index]!)!;
  return Array.from({ length: c.blob[at]! }, (_, k) => ({
    operand: c.blob[at + 1 + 3 * k]! | (c.blob[at + 2 + 3 * k]! << 8), opcode: c.blob[at + 3 + 3 * k]!,
  }));
}

/** An action list's shape: its opcodes, with the band named where a band is what tells two jobs apart. */
function shapeOf(body: readonly Instruction[]): string {
  return body.map((one) => one.opcode.toString(16)
    + (one.opcode === 0x1f ? `:${(one.operand >> 8).toString(16)}` : one.opcode === 0x07 ? `:${one.operand.toString(16)}` : '')).join(' ');
}

/** The lists a list calls, itself included, closed over the calls. */
function reach(c: Container, seeds: readonly number[]): Set<number> {
  const seen = new Set<number>();
  const todo = [...seeds];
  for (let next = todo.pop(); next !== undefined; next = todo.pop()) {
    if (seen.has(next)) continue;
    seen.add(next);
    for (const one of listBody(c, next)) if (one.opcode === ACTION_LIST_CALL) todo.push(one.operand);
  }
  return seen;
}

/** The lists the number sender's digit tables call: the device's own digits, which the sender needs from it. */
function numberSenderLists(c: Container): number[] {
  return (numberSenders(c)?.records ?? []).flatMap((record) => record.tables.flatMap((table) => table.instructions.map((one) => one.operand)));
}

/** A list's role, the name its category takes: how each is told is in the header. */
function listRoles(c: Container): string[] {
  const lists = c.pointerArray(7)!;
  const maps = c.pointerArray(6)!;
  const callsOf = (entries: readonly { opcode: number; operand: number }[]) =>
    entries.filter((one) => one.opcode === ACTION_LIST_CALL).map((one) => one.operand);
  const keyTable = taggedList(c, maps[0]!)!.entries;
  const activityEntry = keyTable.find((one) => one.tag === ACTIVITY_TAG);
  const pinEntries = keyTable.filter((one) => PIN_TAGS.has(one.tag));
  // Raw slot 5 is a count and then instructions, three bytes each, and `pointerArray` reads each as an address:
  // the value is the opcode over the operand, so a call of list n reads as `0x7f0000 | n`.
  const startUp = (c.pointerArray(5) ?? []).filter((value) => value >> 16 === ACTION_LIST_CALL).map((value) => value & 0xffff);
  // Everything else that calls a list: the other key table entries, every other map, every transition.
  const others: number[] = [];
  keyTable.forEach((one) => { if (one !== activityEntry && !PIN_TAGS.has(one.tag)) others.push(...callsOf([one])); });
  maps.slice(1).forEach((address) => others.push(...callsOf(taggedList(c, address)!.entries)));
  for (const record of stateRecords(c) ?? []) others.push(...callsOf(record.values ?? []));
  const digits = numberSenderLists(c);
  const closeOthers = reach(c, [...others, ...digits]);
  const activityAll = activityEntry === undefined ? new Set<number>() : reach(c, callsOf([activityEntry]));
  const activity = new Set([...activityAll].filter((index) => !closeOthers.has(index)));
  const startUpAll = reach(c, startUp);
  const pinAll = reach(c, callsOf(pinEntries));
  const reached = new Set([...closeOthers, ...activityAll, ...startUpAll, ...pinAll]);
  return lists.map((_, index) => {
    if (activity.has(index)) return 'activity';
    if (startUpAll.has(index) && !closeOthers.has(index)) return 'start up';
    if (pinAll.has(index) && !closeOthers.has(index)) return 'pin';
    const body = listBody(c, index);
    const shape = shapeOf(body);
    if (!reached.has(index)) return `uncalled ${shape === '7:fffb 7d 7c' ? 'send' : shape.startsWith('7:ffff') ? 'silent write' : 'other'}`;
    if (shape === '7:fffb 7d 7c') return 'send';
    if (shape.startsWith('7:fffb 1f:e9') || shape === '7:fffb 1f:ff') return 'key';
    // A favourite channel is an integer loaded and handed to the sender, or, with a leading zero, its digits called.
    if (shape === '7a 1f:f3' || (shape === '7f 7f' && body.every((one) => digits.includes(one.operand)))) return 'channel';
    return 'power';
  });
}

/** Every byte of a compile in exactly one category, counted. */
export function census(c: Container): Map<string, number> {
  const category = new Array<string | undefined>(c.blob.length).fill(undefined);
  const put = (from: number, length: number, name: string): void => {
    for (let k = from; k < from + length && k < category.length; k += 1) if (category[k] === undefined) category[k] = name;
  };
  const roles = listRoles(c);
  const listIndexAt = new Map(c.pointerArray(7)!.map((address, index) => [c.blobOffsetOf(address)!, index]));
  const recordAt = new Map<number, number>();
  (stateRecords(c) ?? []).forEach((record, index) => recordAt.set(c.blobOffsetOf(record.address)!, index));
  const variableName = new Map(nameNodes(c)!.filter((node) => node.level === 1).map((node) => [node.index, node.name]));

  // What no reader claims, from the tables that point at it.
  c.pointerArray(6)!.forEach((address, map) => {
    const at = c.blobOffsetOf(address)!;
    put(at, taggedListExtent(c.blob, at)!.length, map === 0 ? 'key table (map 0)' : 'device key map');
  });
  for (const address of c.pointerArray(8)!) put(c.blobOffsetOf(address)!, 7, 'timer record');
  for (const address of c.pointerArray(10)!) {
    const at = c.blobOffsetOf(address)!;
    put(at, 1 + 2 * c.blob[at]!, 'parameter group');
  }
  put(c.blobOffsetOf(c.sections[3]!.address)!, CLOCK_LENGTH, 'clock record');
  const archive = metadataArchive(c)!;
  put(archive.offset, c.blob.length - TRAILER_LENGTH - archive.offset, 'metadata archive');

  const names: Record<string, string> = {
    header: 'header', 'section-table': 'section table', marker: 'end marker', trailer: 'trailer',
    'slot-0-tree': 'name tree', 'slot-1-arch': 'architecture record', 'slot-2-log': 'log area',
    'slot-5-block': 'infrared blocks', 'slot-5-header': 'infrared record headers', 'slot-5-group': 'infrared group arrays',
    'raw-4-table': 'infrared group table', 'raw-5-table': 'start up table', 'raw-6-table': 'key map table',
    'raw-7-table': 'action list table', 'raw-8-table': 'timer table', 'slot-13-table': 'state variable table',
    'raw-10-table': 'parameter table', 'slot-16-table': 'number sender table', 'raw-11-table': 'number sender table',
    'slot-16-digits': 'number sender digit tables', 'slot-16-record': 'number sender record', 'raw-12-table': 'digit entry table',
    'slot-3-clock': 'clock record',
  };
  for (const claim of claims(c)) {
    let name = names[claim.owner];
    if (claim.owner === 'slot-13-record') {
      const index = recordAt.get(claim.start)!;
      const variable = variableName.get(index) ?? '';
      name = index < 7 ? 'state record, clock' : index < 18 ? 'state record, firmware'
        : variable.includes('_Power_') ? 'state record, device power' : variable.includes('_Input_') ? 'state record, device input'
          : variable.startsWith('ActivityPowerState') ? 'state record, activity flag' : 'state record, unnamed';
    }
    if (claim.owner === 'slot-10-list') name = `list, ${roles[listIndexAt.get(claim.start)!]}`;
    assert.ok(name !== undefined, `a claim by ${claim.owner} has a category`);
    put(claim.start, claim.length, name);
  }
  const out = new Map<string, number>();
  category.forEach((name) => out.set(name ?? 'unnamed', (out.get(name ?? 'unnamed') ?? 0) + 1));
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// The verdicts

type Verdict = 'builds' | 'edits' | 'other' | 'nowhere';

/**
 * What exists for each category, and the probe or test that holds it. The text names the generator and what it
 * was measured against; where the verdict is partial the text says which part is not. A row nobody's census uses
 * fails `EveryVerdictIsUsed`, so a category that stops existing is not left behind.
 */
export const VERDICTS: Readonly<Record<string, { verdict: Verdict; by: string }>> = {
  'header': { verdict: 'other', by: 'layOutContainer, arch 12 and 14; refuses 16' },
  'section table': { verdict: 'other', by: 'layOutContainer, arch 12 and 14; refuses 16' },
  'end marker': { verdict: 'other', by: 'layOutContainer, arch 12 and 14; refuses 16' },
  'trailer': { verdict: 'other', by: 'layOutContainer, arch 12 and 14; refuses 16' },
  'name tree': { verdict: 'builds', by: 'buildNameTree, byte for byte on 7 of 7 files; the names come from the state tables, which are nowhere' },
  'architecture record': { verdict: 'builds', by: 'architectureRecord(16, skin), 7 of 7 files' },
  'log area': { verdict: 'nowhere', by: 'a constant of eight bytes in 7 of 7 files, written by no generator' },
  'clock record': { verdict: 'builds', by: 'buildTimestampSection, 7 of 7 files' },
  'infrared group arrays': { verdict: 'edits', by: 'fillIrGroup, into the donor\'s group at its allocation' },
  'infrared group table': { verdict: 'other', by: 'countedTable in the frame, a table of three byte addresses; not used for 16' },
  'infrared record headers': { verdict: 'edits', by: 'composeIrGroup and irBuildRecord through composeDeviceFor, and the digit copies through deviceDigitLists; 51 of the plasma\'s 51 records, word for word' },
  'infrared blocks': { verdict: 'edits', by: 'the same' },
  'start up table': { verdict: 'nowhere', by: 'eleven instructions in 7 of 7 files, written by no generator' },
  'list, start up': { verdict: 'nowhere', by: 'the hold time parameter, the four device selects and the empty list, written by no generator' },
  'key map table': { verdict: 'edits', by: 'appendTableEntries, onto the donor\'s table' },
  'key table (map 0)': { verdict: 'edits', by: 'composeNoScreenDevice adds the press, release and held entries; the four pin tags and the activity entry are the donor\'s' },
  'device key map': { verdict: 'edits', by: 'composeNoScreenDevice from NO_SCREEN_HARD_KEYS with Logitech\'s routing of Input, volume and the favourite key, 4.1.1; equal to Logitech\'s with the other seven devices there, noscreenremove.test.ts' },
  'action list table': { verdict: 'edits', by: 'appendActionLists, onto the donor\'s table' },
  'list, send': { verdict: 'edits', by: 'NO_SCREEN_SENDS through composeDeviceFor' },
  'list, key': { verdict: 'edits', by: 'composeNoScreenDevice: the press list, the release and the held select' },
  'list, power': { verdict: 'edits', by: 'composeNoScreenDevice and composeDeviceFor: wrapper, toggle helper, transition' },
  'list, channel': { verdict: 'edits', by: 'composeNoScreenFavourites' },
  'list, pin': { verdict: 'nowhere', by: 'the four pin lists of the key table, their wrappers and helpers, written by no generator' },
  'list, activity': { verdict: 'nowhere', by: 'todo-compile-350.md 4.2, in progress and not in this tree' },
  'list, uncalled send': { verdict: 'edits', by: 'composeNoScreenDevice: Teletext, STORED_UNBOUND, and the digit copies, DIGIT_COPIES_BY_TYPE, 4.1.1' },
  'list, uncalled silent write': { verdict: 'edits', by: 'composeNoScreenDevice: two per power variable, POWER_RESETS, 4.1.3' },
  'timer table': { verdict: 'edits', by: 'appendTableEntries, onto the donor\'s table' },
  'timer record': { verdict: 'edits', by: 'composeNoScreenDevice, two per key device' },
  'state variable table': { verdict: 'other', by: 'buildStateTables for the four slot and touch families; NO_SCREEN_FAMILY.stateTables refuses' },
  'state record, clock': { verdict: 'other', by: 'buildStateTables, clockSpec; refuses 16' },
  'state record, firmware': { verdict: 'other', by: 'buildStateTables, firmwareRecords; refuses 16' },
  'state record, device power': { verdict: 'edits', by: 'composeDeviceFor, appendNarrowStateVariable' },
  'state record, device input': { verdict: 'nowhere', by: 'the Denon\'s 19 input values: the family\'s sends refuse inputs' },
  'state record, activity flag': { verdict: 'nowhere', by: 'todo-compile-350.md 4.2' },
  'state record, unnamed': { verdict: 'nowhere', by: 'the compiler\'s first two byte variable; the four slot family builds it, FIRST_WIDE_VARIABLE, and refuses 16' },
  'parameter table': { verdict: 'nowhere', by: 'five pointers, the same in 7 of 7 files, written by no generator' },
  'parameter group': { verdict: 'nowhere', by: 'five groups, the same 21 bytes in 7 of 7 files, written by no generator' },
  'number sender table': { verdict: 'edits', by: 'composeNoScreenFavourites' },
  'number sender record': { verdict: 'edits', by: 'composeNoScreenFavourites' },
  'number sender digit tables': { verdict: 'edits', by: 'composeNoScreenFavourites' },
  'digit entry table': { verdict: 'nowhere', by: 'two zero bytes in 7 of 7 files, written by no generator' },
  'metadata archive': { verdict: 'edits', by: 'withMetadataDevice adds a device to a donor\'s archive through Node\'s zlib, whose stream is not Logitech\'s while stock zlib\'s is; no whole archive is written' },
};

/** The census with each category's verdict, summed per verdict. */
function byVerdict(counts: ReadonlyMap<string, number>): Record<Verdict, number> {
  const out: Record<Verdict, number> = { builds: 0, edits: 0, other: 0, nowhere: 0 };
  for (const [name, bytes] of counts) out[VERDICTS[name]!.verdict] += bytes;
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// The tests

test('the census cuts both compiles into categories that add to the file, every one with a verdict', needsLab, () => {
  const files: [string, Container, number][] = [['350', lab(COMPILE), 118513], ['300', parse(require_('h300_programmed_config')), 97474]];
  for (const [label, c, length] of files) {
    const counts = census(c);
    assert.equal(c.blob.length, length, label);
    assert.equal([...counts.values()].reduce((a, b) => a + b, 0), length, `${label}: the categories add to the file`);
    assert.equal(counts.has('unnamed'), false, `${label}: every byte is named`);
    for (const name of counts.keys()) assert.ok(VERDICTS[name] !== undefined, `${label}: ${name} has a verdict`);
  }
  // The control that the first-claim rule is doing work: two readers claim the number sender's table, so the claims
  // add up to more than the bytes they cover, by the four bytes the two share.
  const c = lab(COMPILE);
  const covered = new Set<number>();
  let total = 0;
  for (const claim of claims(c)) {
    total += claim.length;
    for (let k = claim.start; k < claim.start + claim.length; k += 1) covered.add(k);
  }
  assert.equal(total - covered.size, 4);
});

test('the 331 lists of the Harmony 350 compile by role, against the lab note\'s own count of lists nothing calls and of the activity\'s', needsLab, () => {
  const tally = (c: Container): Record<string, number> => {
    const m: Record<string, number> = {};
    listRoles(c).forEach((role) => { m[role] = (m[role] ?? 0) + 1; });
    return Object.fromEntries(Object.entries(m).sort());
  };
  // Chapter 4's reading of this compile, made by hand from the bytes and not by this classifier, counts 331 lists,
  // 50 that nothing references and 10 that are the activity's alone: two numbers that this classifier, which walks
  // calls from every table that holds one, has to arrive at independently. 34 and 16 are the uncalled sends and
  // silent writes, 50 together.
  const ours = tally(lab(COMPILE));
  assert.deepEqual(ours, {
    'activity': 10, 'channel': 5, 'key': 12, 'pin': 13, 'power': 19, 'send': 216, 'start up': 6, 'uncalled send': 34,
    'uncalled silent write': 16,
  });
  assert.equal(Object.values(ours).reduce((a, b) => a + b, 0), 331);
  assert.equal(ours['uncalled send']! + ours['uncalled silent write']!, 50);
  // The Harmony 300's: 198 lists, and the same roles in fewer numbers.
  const theirs = tally(parse(require_('h300_programmed_config')));
  assert.equal(Object.values(theirs).reduce((a, b) => a + b, 0), 198);
  assert.equal(theirs['activity'], 5);
  assert.equal(theirs['pin'], 13);
  assert.equal(theirs['start up'], 6);
});

test('EveryVerdictIsUsed: no verdict row outlives its category', needsLab, () => {
  const used = new Set([...census(lab(COMPILE)).keys(), ...census(parse(require_('h300_programmed_config'))).keys()]);
  assert.deepEqual(Object.keys(VERDICTS).filter((name) => !used.has(name)), []);
});

test('the census of the Harmony 350 test setup compile, in bytes per category', needsLab, () => {
  const counts = census(lab(COMPILE));
  assert.deepEqual(Object.fromEntries([...counts].sort()), CENSUS_350);
  assert.deepEqual(byVerdict(counts), VERDICT_BYTES_350);
});

test('the census of the Harmony 300 programmed compile, in bytes per category', needsLab, () => {
  const counts = census(parse(require_('h300_programmed_config')));
  assert.deepEqual(Object.fromEntries([...counts].sort()), CENSUS_300);
  assert.deepEqual(byVerdict(counts), VERDICT_BYTES_300);
});

test('the frame lays out arch 12 and 14 and refuses arch 16, so no whole container is built for this family', () => {
  assert.deepEqual(Object.keys(FRAME_ARCHITECTURES), ['12', '14']);
  assert.doesNotThrow(() => frameArchitecture(12));
  assert.doesNotThrow(() => frameArchitecture(14));
  assert.throws(() => frameArchitecture(16), LayoutError);
});

test('the architecture record, the clock record and the name tree are built byte for byte on all seven compiles', needsLab, () => {
  const all = seven();
  assert.equal(all.length, 7);
  for (const [label, c] of all) {
    const at = (slot: number) => c.blobOffsetOf(c.sections[slot]!.address)!;
    const skin = c.blob[at(1) + 2]!;
    assert.deepEqual(architectureRecord(16, skin), c.blob.slice(at(1), at(1) + 7), `${label}: the architecture record`);
    assert.deepEqual(buildTimestampSection(c.builtAt!), c.blob.slice(at(3), at(3) + CLOCK_LENGTH), `${label}: the clock record`);
    const named = nameNodes(c)!.filter((node) => node.level === 1).map((node) => ({ index: node.index, name: node.name }));
    const built = buildNameTree(named);
    assert.deepEqual(built, c.blob.slice(at(0), at(0) + built.length), `${label}: the name tree`);
  }
  // The control: the builders are not echoing the file. A skin that is not the file's, a name changed by a letter.
  const c = all[0]![1];
  const slot1 = c.blobOffsetOf(c.sections[1]!.address)!;
  assert.notDeepEqual(architectureRecord(16, 79), c.blob.slice(slot1, slot1 + 7));
  const named = nameNodes(c)!.filter((node) => node.level === 1).map((node) => ({ index: node.index, name: node.name }));
  const original = buildNameTree(named);
  named[0]!.name += 'x';
  assert.notDeepEqual(buildNameTree(named), original);
  // The skin is the one byte that tells the models apart: 104 on the 350 files and 79 on the 300's, and nothing else
  // in the architecture record does.
  const skins = all.map(([label, file]) => [label, file.blob[file.blobOffsetOf(file.sections[1]!.address)! + 2]]);
  assert.deepEqual(skins.map(([, skin]) => skin), [104, 104, 104, 104, 104, 79, 79]);
});

test('seven compiles of the family share the sections no generator writes, byte for byte', needsLab, () => {
  const all = seven();
  const bytesOf = (c: Container, slot: number, length: number): string => {
    const section = c.sections[slot]!;
    return section.address === 0 ? 'NULL' : Buffer.from(c.blob.slice(c.blobOffsetOf(section.address)!, c.blobOffsetOf(section.address)! + length)).toString('hex');
  };
  const distinct = (read: (c: Container) => string): string[] => [...new Set(all.map(([, c]) => read(c)))];
  assert.deepEqual(distinct((c) => bytesOf(c, 2, 8)), ['0020000007000008'], 'the log area');
  assert.deepEqual(distinct((c) => bytesOf(c, 12, 2)), ['0000'], 'the digit entry table');
  assert.deepEqual(distinct((c) => bytesOf(c, 14, 1)), ['NULL'], 'raw slot 14');
  assert.deepEqual(distinct((c) => c.pointerArray(10)!.map((address) => {
    const at = c.blobOffsetOf(address)!;
    return Buffer.from(c.blob.slice(at, at + 1 + 2 * c.blob[at]!)).toString('hex');
  }).join(' ')), ['013c00 015000 0458025a02fe020103 010807 010000'], 'the five parameter groups');
  assert.deepEqual(distinct((c) => String(c.pointerArray(5)!.length)), ['11'], 'the start up entries');
  assert.deepEqual(distinct((c) => String(c.pointerArray(10)!.length)), ['5'], 'the parameter pointers');
  // And what does vary, so the constants above are not a property of the sample: groups, lists, maps and timers.
  assert.deepEqual(distinct((c) => String(c.pointerArray(4)!.length)).sort(), ['4', '8']);
  assert.equal(distinct((c) => String(c.pointerArray(7)!.length)).length, 7);
});

test('the metadata archive\'s ZIP time is the stamp\'s less whole hours and 413 to 419 seconds, in 7 of 7 compiles', needsLab, () => {
  // The archive's DOS time and date, in the local header, against the build stamp base slot 3 states. The whole hours
  // are a zone: 6 in the July and September compiles, 5 on the day the setup was compiled and none in 2011. What is
  // left after them is not a constant, 413 to 419 seconds across the seven, so a generator of ours picks a value in
  // that band and the two time fields of the archive are not reproducible to the byte.
  const left = (c: Container, shift = 0): number => {
    const m = metadataArchive(c)!;
    const view = new DataView(c.blob.buffer, c.blob.byteOffset + m.offset + 4, m.length);
    const time = view.getUint16(10, true);
    const zip = (time >> 11) * 3600 + ((time >> 5) & 63) * 60 + (time & 31) * 2;
    const [hours, minutes, seconds] = c.builtAt!.split('T')[1]!.split(':').map(Number);
    return ((((hours! * 3600 + minutes! * 60 + seconds! - zip + shift) % 3600) + 3600) % 3600);
  };
  const all = seven().map(([, c]) => left(c));
  assert.equal(Math.min(...all), 413);
  assert.equal(Math.max(...all), 419);
  // The control: a stamp a minute later is outside the band, so the band is a measurement.
  assert.ok(seven().every(([, c]) => !(Math.abs(left(c, 60) - 416) <= 3)));
  // The date is the stamp's own in all seven, so no zone shift has crossed a midnight in any of them.
  for (const [label, c] of seven()) {
    const m = metadataArchive(c)!;
    const date = new DataView(c.blob.buffer, c.blob.byteOffset + m.offset + 4, m.length).getUint16(12, true);
    const [year, month, day] = c.builtAt!.split('T')[0]!.split('-').map(Number);
    assert.deepEqual([1980 + (date >> 9), (date >> 5) & 15, date & 31], [year, month, day], label);
  }
});

test('the metadata archive\'s text around its devices is the same 149 and 610 characters in 7 of 7 compiles', needsLab, () => {
  const all = seven();
  const around = (c: Container): { before: string; after: string; ids: number[] } => {
    const xml = metadataArchive(c)!.xml;
    const open = xml.indexOf('<Devices>') + '<Devices>'.length;
    const close = xml.indexOf('</Devices>');
    return {
      before: xml.slice(0, open), after: xml.slice(close),
      ids: [...xml.matchAll(/<DeviceId>(\d+)<\/DeviceId>/g)].map((one) => Number(one[1])),
    };
  };
  const first = around(all[0]![1]);
  assert.equal(first.before.length, 149);
  assert.equal(first.after.length, 610);
  for (const [label, c] of all) {
    assert.equal(around(c).before, first.before, label);
    assert.equal(around(c).after, first.after, label);
  }
  // A device's number is the account's, not a function of the file, and the two models differ: consecutive within
  // each of the five 350 compiles and not within either 300 compile.
  const consecutive = (ids: number[]) => ids.every((id, k) => k === 0 || id === ids[k - 1]! + 1);
  const verdicts = Object.fromEntries(all.map(([label, c]) => [label, consecutive(around(c).ids)]));
  assert.deepEqual(verdicts, {
    'setup': true, 'setup without favourites': true, 'h350_config': true, 'h350_three_devices_config': true,
    'h350_programmed_config': true, 'h300_config': false, 'h300_programmed_config': false,
  });
  assert.equal(around(all[0]![1]).ids.length, 8);
});

test('the family\'s own members refuse the state tables, the wiring and an activity\'s start', () => {
  const c = undefined as unknown as Container;
  for (const [name, ask] of [
    ['stateTables', () => NO_SCREEN_FAMILY.stateTables.measuredOn],
    ['wiring', () => NO_SCREEN_FAMILY.wiring.check(c)],
    ['activityStart', () => NO_SCREEN_FAMILY.activityStart.lists],
    ['activityKeyRules', () => NO_SCREEN_FAMILY.activityKeyRules.volume],
  ] as const) assert.throws(ask, ComposeError, name);
});

test('the device composer emits lists of the roles the census credits it with, and no others', needsComposer, () => {
  const donor = parse(require_('h350_three_devices_config'));
  const out = composeNoScreenDevice(donor, IR_ARCHIVE!, { manufacturer: 'Panasonic', model: 'TX-P42GT30E', name: 'Plasma', place: 2 });
  const tally = (c: Container): Map<string, number> => {
    const m = new Map<string, number>();
    listRoles(c).forEach((role) => m.set(role, (m.get(role) ?? 0) + 1));
    return m;
  };
  const [before, after] = [tally(donor), tally(parse(out.bytes))];
  const added = Object.fromEntries([...after].map(([role, n]) => [role, n - (before.get(role) ?? 0)]).filter(([, n]) => n !== 0));
  // Forty sends, the press and release pair and three power lists; and the lists nothing calls that Logitech stores
  // for the plasma too, `todo-compile-350.md` 4.1.1 and 4.1.3: eleven sends, Teletext and the ten digits' one block
  // copies, and the power variable's two silent writes, `POWER_RESETS`. No pin, start up or activity list; the
  // activity and start up counts of the donor itself do not move.
  assert.deepEqual(added, { send: 40, key: 2, power: 3, 'uncalled send': 11, 'uncalled silent write': 2 });
});

test('node zlib reproduces none of the three metadata archives\' deflate streams, and the same search finds its own', needsLab, () => {
  const streamOf = (c: Container): { text: Buffer; stream: Buffer } => {
    const m = metadataArchive(c)!;
    const zip = c.blob.subarray(m.offset + 4, m.offset + 4 + m.length);
    const view = new DataView(zip.buffer, zip.byteOffset, zip.length);
    const nameLength = view.getUint16(26, true);
    let central = -1;
    for (let at = 30 + nameLength; at + 46 <= zip.length && central < 0; at += 1) if (view.getUint32(at, true) === 0x02014b50) central = at;
    const size = view.getUint32(central + 20, true);
    return { text: Buffer.from(m.xml, 'utf8'), stream: Buffer.from(zip.subarray(30 + nameLength, 30 + nameLength + size)) };
  };
  /** How many settings of zlib write exactly `stream` from `text`, out of every one tried. */
  const search = (text: Buffer, stream: Buffer): { hits: number; tried: number } => {
    let hits = 0, tried = 0;
    for (let level = -1; level <= 9; level += 1) for (const strategy of [0, 1, 2, 3, 4]) {
      for (let memLevel = 1; memLevel <= 9; memLevel += 1) for (let windowBits = 9; windowBits <= 15; windowBits += 1) {
        tried += 1;
        try {
          const out = deflateRawSync(text, { level, strategy, memLevel, windowBits });
          if (out.length === stream.length && Buffer.compare(out, stream) === 0) hits += 1;
        } catch { /* a window of 9 bits is refused for a raw stream on some builds, which is a setting not tried */ }
      }
    }
    return { hits, tried };
  };
  const files = [lab(COMPILE), parse(require_('h350_programmed_config')), parse(require_('h300_programmed_config'))];
  for (const c of files) {
    const { text, stream } = streamOf(c);
    assert.equal(search(text, stream).hits, 0);
  }
  // The control: the search finds a stream it could have written, so a hit is possible and the zero is a result.
  const { text } = streamOf(files[0]!);
  const own = deflateRawSync(text, { level: 6, strategy: 0, memLevel: 8, windowBits: 15 });
  const control = search(text, own);
  assert.equal(control.tried, 3465);
  assert.ok(control.hits > 0);
});

// The counts, pinned from the run: see the header. A change moves these in the diff.
const CENSUS_350 = {
  'action list table': 995, 'architecture record': 7, 'clock record': 14, 'device key map': 844, 'digit entry table': 2,
  'end marker': 4, 'header': 11, 'infrared blocks': 102982, 'infrared group arrays': 774, 'infrared group table': 25,
  'infrared record headers': 5250, 'key map table': 28, 'key table (map 0)': 69, 'list, activity': 94, 'list, channel': 35,
  'list, key': 156, 'list, pin': 109, 'list, power': 157, 'list, send': 2160, 'list, start up': 42, 'list, uncalled send': 340,
  'list, uncalled silent write': 112, 'log area': 8, 'metadata archive': 3033, 'name tree': 259, 'number sender digit tables': 90,
  'number sender record': 23, 'number sender table': 4, 'parameter group': 21, 'parameter table': 16, 'section table': 60,
  'start up table': 34, 'state record, activity flag': 7, 'state record, clock': 49, 'state record, device input': 166,
  'state record, device power': 184, 'state record, firmware': 77, 'state record, unnamed': 7, 'state variable table': 98,
  'timer record': 112, 'timer table': 49, 'trailer': 6,
};
const CENSUS_300 = {
  'action list table': 596, 'architecture record': 7, 'clock record': 14, 'device key map': 536, 'digit entry table': 2,
  'end marker': 4, 'header': 11, 'infrared blocks': 88228, 'infrared group arrays': 474, 'infrared group table': 13,
  'infrared record headers': 3234, 'key map table': 16, 'key table (map 0)': 37, 'list, activity': 53, 'list, channel': 28,
  'list, pin': 109, 'list, power': 56, 'list, send': 1330, 'list, start up': 42, 'list, uncalled send': 210,
  'list, uncalled silent write': 56, 'log area': 8, 'metadata archive': 1610, 'name tree': 153, 'number sender digit tables': 90,
  'number sender record': 23, 'number sender table': 4, 'parameter group': 21, 'parameter table': 16, 'section table': 60,
  'start up table': 34, 'state record, activity flag': 7, 'state record, clock': 49, 'state record, device power': 92,
  'state record, firmware': 77, 'state record, unnamed': 7, 'state variable table': 80, 'timer record': 56, 'timer table': 25,
  'trailer': 6,
};
// Plan 011 measured 958 and 565 bytes nowhere; the uncalled sends and silent writes moved to `edits` when the device
// composer took them on, `todo-compile-350.md` 4.1.1 and 4.1.3, 452 and 266 bytes.
const VERDICT_BYTES_350 = { builds: 280, edits: 117397, other: 330, nowhere: 506 };
const VERDICT_BYTES_300 = { builds: 174, edits: 96701, other: 300, nowhere: 299 };
