/**
 * The Harmony One's base slot 11 case programs, their lists and the table, built from a description,
 * `todo-compile-one.md` 6.6, findings section 416.
 *
 * **The blind control makes "generated" a test**, as sections 409 to 414 did: every byte of the case programs,
 * their lists and the table that the description does not read is overwritten, in the file the description reads
 * and in the layout's own pieces, and the sixteen still come back byte for byte. The description still finds its way
 * through the container itself: which record holds which cases, which instruction a case queues.
 *
 * Every figure is exact, and the populations are literals in this file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  type ContainerPiece, ScreenRecordError, archSlot, handlerSets, layOutContainer, modeRecords, parse, reachablePrograms,
  screenProgram, takeApart, taggedList, valueMaps,
} from '../src/index.ts';
import { deviceVariables } from '../src/inventory.ts';
import { stateRecords } from '../src/sections.ts';
import {
  TOUCH_VALUE_MAP_ROLES, buildTouchCasePrograms, buildTouchScreenTable, checkTouchCasePrograms, describeTouchCasePrograms,
  touchValueMapRoles, withTouchCasePrograms,
} from '../src/families/touch/caseprograms.ts';
import { touchClockHeaderEntries } from '../src/families/touch/clockheader.ts';

/** The first offset two files differ at, or undefined where they are the same. */
function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  const length = Math.max(a.length, b.length);
  for (let at = 0; at < length; at += 1) if (a[at] !== b[at]) return at;
  return undefined;
}

/** The sixteen English compiles of skin 54, section 405. */
const NAMES = [
  'harvest_one_two_devices', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830', 'calibration_one',
  'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2', 'compiled_protocols_3',
  'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3', 'one_friend_legacy_sync_config',
  'phase7_before', 'phase7_after',
];
/** The three Harmony One compiles beyond the sixteen: the everyday One's and the European factory file, skin 59, and the Dutch one. */
const BEYOND = ['one_config', 'one_config_unprogrammed', 'one_friend_asfound_config'];
const ALL = [...NAMES, ...BEYOND];

/** The base slot 11 table's addresses. */
const tableOf = (c: ReturnType<typeof parse>): number[] => c.pointerArray(archSlot(c.architecture as number, 11)) ?? [];

/**
 * What one check counts per compile: value maps, our cases, our lists, the table's entries, the bytes read as values
 * and the bytes spanned. The cases are 25 everywhere a Remote Assistant is: the routes three, the idle write, the
 * menu, the help, the all off, the idle cases of `devices`, its unread copy and `working`, two page cases, two start
 * up cases, two sound cases and the frames, six and three. The lists are the six toggles' and the all off's where it
 * writes more than one. Read: 24 bytes of numbers, one per power variable and two for the all off's list.
 */
const EXPECTED: Readonly<Record<string, { records: number; cases: number; lists: number; entries: number; described: number; structure: number }>> = {
  harvest_one_two_devices: { records: 16, cases: 25, lists: 7, entries: 29, described: 28, structure: 497 },
  one_spare_after_sync: { records: 16, cases: 25, lists: 6, entries: 33, described: 25, structure: 502 },
  one_spare_myharmony: { records: 16, cases: 25, lists: 7, entries: 57, described: 30, structure: 587 },
  one_spare_20260830: { records: 16, cases: 25, lists: 7, entries: 57, described: 31, structure: 590 },
  calibration_one: { records: 16, cases: 25, lists: 7, entries: 37, described: 29, structure: 524 },
  calibration_favchannels: { records: 16, cases: 25, lists: 7, entries: 37, described: 29, structure: 524 },
  calibration_favzero: { records: 16, cases: 25, lists: 7, entries: 57, described: 31, structure: 590 },
  compiled_protocols: { records: 16, cases: 25, lists: 7, entries: 57, described: 40, structure: 617 },
  compiled_protocols_2: { records: 16, cases: 25, lists: 7, entries: 57, described: 40, structure: 617 },
  compiled_protocols_3: { records: 16, cases: 25, lists: 7, entries: 57, described: 34, structure: 599 },
  harvest_one_families_1: { records: 16, cases: 25, lists: 6, entries: 29, described: 24, structure: 486 },
  harvest_one_families_2: { records: 16, cases: 25, lists: 7, entries: 29, described: 28, structure: 497 },
  harvest_one_families_3: { records: 16, cases: 25, lists: 7, entries: 29, described: 30, structure: 503 },
  one_friend_legacy_sync_config: { records: 16, cases: 25, lists: 7, entries: 41, described: 29, structure: 536 },
  phase7_before: { records: 16, cases: 25, lists: 7, entries: 37, described: 29, structure: 524 },
  phase7_after: { records: 16, cases: 25, lists: 7, entries: 37, described: 30, structure: 527 },
  // The everyday One's compile keeps no Remote Assistant and so no start up toggle: fifteen records, two cases and
  // two lists fewer, and five bytes less read.
  one_config: { records: 15, cases: 23, lists: 5, entries: 59, described: 25, structure: 563 },
  one_config_unprogrammed: { records: 16, cases: 25, lists: 6, entries: 33, described: 25, structure: 502 },
  // The Dutch compile: nothing here draws a word, so its language changes nothing.
  one_friend_asfound_config: { records: 16, cases: 25, lists: 7, entries: 33, described: 28, structure: 509 },
};

test('todo-compile-one 6.6: the case programs, their lists and base slot 11\'s table of the sixteen English compiles of skin 54 are rebuilt byte for byte from a description',
     skipUnless(...NAMES), () => {
  assert.equal(TOUCH_VALUE_MAP_ROLES.length, 16);
  for (const name of NAMES) assert.deepEqual(checkTouchCasePrograms(parse(require_(name))), EXPECTED[name], name);
});

test('todo-compile-one 6.6: beyond the sixteen, the everyday One\'s compile with no start up toggle, the European factory file and the Dutch compile rebuild byte for byte too',
     skipUnless(...BEYOND), () => {
  for (const name of BEYOND) assert.deepEqual(checkTouchCasePrograms(parse(require_(name))), EXPECTED[name], name);
});

test('todo-compile-one 6.6: on all nineteen every value map takes exactly one role, sixteen roles on eighteen and fifteen on the everyday One\'s compile, which has no start up toggle, in four orders',
     skipUnless(...ALL), () => {
  const counts = new Map<number, number>();
  const orders = new Map<string, number>();
  for (const name of ALL) {
    const c = parse(require_(name));
    const { records } = touchValueMapRoles(c);
    // The finder refuses a record left over or taken twice, so the roles found are the records held.
    assert.equal(records.size, valueMaps(c)?.length, name);
    assert.equal(new Set(records.values()).size, records.size, name);
    counts.set(records.size, (counts.get(records.size) ?? 0) + 1);
    if (records.size === 15) assert.equal(records.has('assistant'), false, name);
    const order = [...records].sort((a, b) => a[1] - b[1]).map(([role]) => role).join(' / ');
    orders.set(order, (orders.get(order) ?? 0) + 1);
  }
  assert.deepEqual(Object.fromEntries(counts), { 16: 18, 15: 1 });
  // Which record each role is differs by compile, so it is the description's: four orders, the everyday One's its own.
  assert.deepEqual([...orders.values()].sort((a, b) => b - a), [11, 4, 3, 1]);
});

test('todo-compile-one 6.6: the table is the clock header\'s four programs at their entries, then every value map case\'s program in base slot 14\'s order, each record\'s cases as stored and its ranges after, no program twice: 805 entries over the nineteen, four plus our cases plus four per activity on each, and only the four run by entry',
     skipUnless(...ALL), () => {
  let entries = 0;
  let queued = 0;
  let beyond = 0;
  for (const name of ALL) {
    const c = parse(require_(name));
    const table = tableOf(c);
    const { addresses, entries: at } = touchClockHeaderEntries(c);
    at.forEach((entry, p) => assert.equal(table[entry], addresses[p], `${name}: header ${p}`));
    const cases = (valueMaps(c) ?? []).flatMap((map) => [...map.entries.map(([, target]) => target), ...map.ranges.map(([, , target]) => target)]);
    assert.deepEqual(table.slice(4), cases, name);
    assert.equal(new Set(table).size, table.length, name);
    // The closure: the table counts the header, the cases built here and the activities' four cases each.
    const { records, idle } = touchValueMapRoles(c);
    const activities = (valueMaps(c)?.[records.get('devices') as number]?.entries ?? []).filter(([value]) => value !== idle).length;
    assert.equal(table.length, 4 + (EXPECTED[name] as { cases: number }).cases + 4 * activities, name);
    entries += table.length;
    // Only the header's entries are run by entry: every `0x73`, in a list, a queued screen instruction, a mode's or
    // a page's key map, a handler set or a state transition, names an entry from 0 to 3.
    const run = (opcode: number, operand: number): void => {
      if (opcode !== 0x73) return;
      queued += 1;
      if (operand > 3) beyond += 1;
    };
    for (const list of c.actionLists() ?? []) for (const one of list) run(one.opcode, one.operand);
    for (const [, program] of reachablePrograms(c)) {
      for (const one of program) if (one.opcode === 0x11) run(one.operands[2] as number, (one.operands[0] as number) | ((one.operands[1] as number) << 8));
    }
    for (const record of modeRecords(c) ?? []) {
      for (const entry of record.entries) run(entry.opcode, entry.operand);
      for (const page of record.pages) for (const entry of taggedList(c, page.list)?.entries ?? []) run(entry.opcode, entry.operand);
    }
    for (const address of handlerSets(c)?.addresses ?? []) for (const entry of taggedList(c, address)?.entries ?? []) run(entry.opcode, entry.operand);
    for (const record of stateRecords(c) ?? []) for (const one of record.values ?? []) run(one.opcode, one.operand);
  }
  assert.equal(entries, 805);
  assert.deepEqual({ queued, beyond }, { queued: 19806, beyond: 0 });
});

test('todo-compile-one 6.6: the activities\' cases, not built here, are one per activity in each of devices, its unread copy, working and select, 64 activities and 256 cases over the nineteen, and select holds none at the idle value',
     skipUnless(...ALL), () => {
  const perRole = new Map<string, number>();
  let activities = 0;
  for (const name of ALL) {
    const c = parse(require_(name));
    const { records, idle } = touchValueMapRoles(c);
    const maps = valueMaps(c) ?? [];
    const keysOf = (role: (typeof TOUCH_VALUE_MAP_ROLES)[number]): string => (maps[records.get(role) as number]?.entries ?? [])
      .map(([value]) => value).filter((value) => value !== idle).sort((a, b) => a - b).join();
    const keys = keysOf('devices');
    for (const role of ['devices', 'devices unread', 'working', 'select'] as const) {
      assert.equal(keysOf(role), keys, `${name}: ${role}`);
      perRole.set(role, (perRole.get(role) ?? 0) + (keys === '' ? 0 : keys.split(',').length));
    }
    assert.equal(maps[records.get('select') as number]?.entries.some(([value]) => value === idle), false, name);
    activities += keys === '' ? 0 : keys.split(',').length;
  }
  assert.equal(activities, 64);
  assert.deepEqual(Object.fromEntries(perRole), { devices: 64, 'devices unread': 64, working: 64, select: 64 });
});

test('todo-compile-one 6.6: the unread copy of devices holds the same cases as devices and no instruction looks it up, and help is looked up by one handler set\'s tag 0xA6 alone, on the location, on all nineteen',
     skipUnless(...ALL), () => {
  let unread = 0;
  let help = 0;
  for (const name of ALL) {
    const c = parse(require_(name));
    const { records } = touchValueMapRoles(c);
    // Every `0x72` anywhere names a record in its operand's high byte: in a list, a queued instruction of a screen
    // program, a mode's own key map, a page's list or a handler set.
    const named = new Set<number>();
    const { records: roles, location } = touchValueMapRoles(c);
    const helps: string[] = [];
    const note = (opcode: number, operand: number, where = 'elsewhere'): void => {
      if (opcode !== 0x72) return;
      named.add(operand >> 8);
      if (operand >> 8 === roles.get('help')) helps.push(`${where}:${operand & 0xff}`);
    };
    for (const list of c.actionLists() ?? []) for (const one of list) note(one.opcode, one.operand);
    for (const record of stateRecords(c) ?? []) for (const one of record.values ?? []) note(one.opcode, one.operand);
    for (const [, program] of reachablePrograms(c)) {
      for (const one of program) if (one.opcode === 0x11) note(one.operands[2] as number, (one.operands[0] as number) | ((one.operands[1] as number) << 8));
    }
    for (const record of modeRecords(c) ?? []) {
      for (const entry of record.entries) note(entry.opcode, entry.operand);
      for (const page of record.pages) for (const entry of taggedList(c, page.list)?.entries ?? []) note(entry.opcode, entry.operand);
    }
    for (const address of handlerSets(c)?.addresses ?? []) {
      for (const entry of taggedList(c, address)?.entries ?? []) note(entry.opcode, entry.operand, `handler set tag ${entry.tag.toString(16)}`);
    }
    assert.deepEqual(helps, [`handler set tag a6:${location}`], name);
    help += 1;
    const copy = records.get('devices unread') as number;
    assert.equal(named.has(copy), false, name);
    assert.equal(named.has(records.get('devices') as number), true, name);
    const maps = valueMaps(c) ?? [];
    const bytesOf = (index: number): string => (maps[index]?.entries ?? []).map(([value, target]) => {
      const program = screenProgram(c, target) ?? [];
      const at = c.blobOffsetOf(target) as number;
      const end = Math.max(...program.map((one) => one.start + one.length));
      return `${value}:${Buffer.from(c.blob.subarray(at, end)).toString('hex')}`;
    }).join();
    assert.equal(bytesOf(copy), bytesOf(records.get('devices') as number), name);
    unread += 1;
  }
  assert.equal(unread, 19);
  assert.equal(help, 19);
});

test('todo-compile-one 6.6: the all off writes 0 into every power variable, as the end with none, the write with one and a list with several: 1, 2 and 16 of the nineteen',
     skipUnless(...ALL), () => {
  const forms = new Map<string, number>();
  for (const name of ALL) {
    const c = parse(require_(name));
    const d = describeTouchCasePrograms(c, takeApart(c));
    const powers = deviceVariables(c).filter((one) => one.property === 'Power').map((one) => one.index);
    // The set and not the order: the order is not the variables' nor the inventory's, so the description carries it.
    assert.deepEqual([...d.spec.allOff.powers].sort((a, b) => a - b), [...powers].sort((a, b) => a - b), name);
    const form = powers.length === 0 ? 'end' : powers.length === 1 ? 'write' : 'list';
    assert.equal(d.spec.allOff.list === undefined, form !== 'list', name);
    forms.set(form, (forms.get(form) ?? 0) + 1);
  }
  assert.deepEqual(Object.fromEntries(forms), { list: 16, write: 2, end: 1 });
});

test('todo-compile-one 6.6: the case programs are laid out in table order, back to back, in two runs, the frames the second, on all nineteen',
     skipUnless(...ALL), () => {
  for (const name of ALL) {
    const c = parse(require_(name));
    const table = tableOf(c).slice(4);
    const { records } = touchValueMapRoles(c);
    const maps = valueMaps(c) ?? [];
    const frames = new Set([records.get('grid'), records.get('column')]
      .flatMap((index) => (maps[index as number]?.entries ?? []).map(([, target]) => target)));
    const runs: { from: number; frames: boolean }[] = [];
    let end = -1;
    for (const address of table) {
      const at = c.blobOffsetOf(address) as number;
      const program = screenProgram(c, address) ?? [];
      if (at !== end) runs.push({ from: at, frames: frames.has(address) });
      else assert.equal((runs.at(-1) as { frames: boolean }).frames, frames.has(address), `${name}: a run mixes frames and the rest`);
      end = Math.max(...program.map((one) => one.start + one.length));
    }
    assert.deepEqual(runs.map((run) => run.frames), [false, true], name);
    assert.ok((runs[0] as { from: number }).from < (runs[1] as { from: number }).from, name);
  }
});

test('todo-compile-one 6.6: a blinded input rebuilds all sixteen: no byte of the case programs, their lists or the table outside the description reaches the build',
     skipUnless(...NAMES), () => {
  const totals = { structure: 0, described: 0, blinded: 0 };
  for (const name of NAMES) {
    const c = parse(require_(name));
    const first = describeTouchCasePrograms(c, takeApart(c));
    totals.structure += first.structure.size;
    // Every number is read inside what is built: none outside it.
    for (const at of first.described) assert.ok(first.structure.has(at), `${name}: read outside at ${at}`);
    totals.described += first.described.size;
    const blinded = c.blob.slice();
    for (const at of first.structure) {
      if (first.described.has(at)) continue;
      blinded[at] = (blinded[at] as number) ^ 0xff;
      totals.blinded += 1;
    }
    const layout = takeApart(c);
    const laid = layOutContainer(layout);
    const pieces = [layout.keyTable, ...layout.body,
      ...layout.sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])), ...layout.pictures];
    const starts = pieces.map((piece) => ({ piece, at: laid.offsetOf(piece) as number })).sort((a, b) => a.at - b.at);
    const d = describeTouchCasePrograms(c, layout, (at) => blinded[at] as number);
    assert.deepEqual([...d.described].sort((a, b) => a - b), [...first.described].sort((a, b) => a - b), `${name}: reads`);
    let k = 0;
    for (const at of [...first.structure].sort((a, b) => a - b)) {
      if (first.described.has(at)) continue;
      while (k + 1 < starts.length && (starts[k + 1] as (typeof starts)[number]).at <= at) k += 1;
      const one = starts[k] as { piece: ContainerPiece; at: number };
      one.piece.bytes[at - one.at] = blinded[at] as number;
    }
    const out = layOutContainer(withTouchCasePrograms(layout, buildTouchCasePrograms(d.spec), d.place,
      buildTouchScreenTable(d.table.header, d.table.valueMaps))).bytes;
    assert.equal(firstDifference(out, c.blob), undefined, `${name} differs`);
  }
  // 8720 bytes of programs, lists and tables over the sixteen, the sum of the per compile figures above; the
  // description reads 487 of them, and every other byte, 8233, is the builder's and blinded.
  assert.deepEqual(totals, { structure: 8720, described: 487, blinded: 8233 });
});

test('todo-compile-one 6.6: a description with the page lists swapped, devices\' record, the sound variable or the all off\'s order changed, or the header\'s entries reordered, is refused by the rebuild, and one with the idle value moved, a case built for another value or a list it does not hold by the put back; the records of the roles nothing built names change nothing',
     skipUnless('harvest_one_two_devices'), () => {
  const c = parse(require_('harvest_one_two_devices'));
  type Described = ReturnType<typeof describeTouchCasePrograms>;
  const tamper = (change: (d: Described) => void): void => {
    const layout = takeApart(c);
    const d = describeTouchCasePrograms(c, layout);
    change(d);
    const out = layOutContainer(withTouchCasePrograms(layout, buildTouchCasePrograms(d.spec), d.place,
      buildTouchScreenTable(d.table.header, d.table.valueMaps))).bytes;
    if (firstDifference(out, c.blob) !== undefined) throw new ScreenRecordError('the rebuilt file differs');
  };
  tamper(() => undefined);
  const moved = /the rebuilt file differs/;
  assert.throws(() => tamper((d) => { d.spec.page.lists.reverse(); }), moved);
  // The idle value moved is caught where its first case goes back, the devices record's at the idle value.
  assert.throws(() => tamper((d) => { d.spec.idle += 1; }),
    (error: Error) => error instanceof ScreenRecordError && /the devices record's case 1 is built for 1 where the configuration's is for 0/.test(error.message));
  assert.throws(() => tamper((d) => { d.spec.records.devices = d.spec.records['devices unread'] as number; }), moved);
  assert.throws(() => tamper((d) => { d.spec.sound.variable += 1; }), moved);
  assert.throws(() => tamper((d) => { d.spec.allOff.powers.reverse(); }), moved);
  // The table names the clock header's programs by entry, so it is the table that moves when they are reordered.
  assert.throws(() => tamper((d) => { d.table.header.reverse(); }), moved);
  // The case values are generated and base slot 14 states the configuration's: a built case for another value is
  // refused where it would be put back.
  assert.throws(() => tamper((d) => { d.place.keys.set('sound', [1, 0]); }),
    (error: Error) => error instanceof ScreenRecordError && /the sound record's case 1 is built for 0 where the configuration's is for 1/.test(error.message));
  assert.throws(() => tamper((d) => { d.spec.page.lists[0] = 9999; }),
    (error: Error) => error instanceof ScreenRecordError && /list 9999 is not one the programs or their calls run/.test(error.message));
  // Which value map `help` and the unread copy are is named by no byte built here, only by base slot 14's table,
  // which is the state tables' (section 407): moving them changes nothing this compares.
  tamper((d) => { [d.spec.records.help, d.spec.records['devices unread']] = [d.spec.records['devices unread'] as number, d.spec.records.help as number]; });
});
