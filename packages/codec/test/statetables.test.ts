/**
 * Base slots 0, 13 and 14 built from a description, `todo-compile-650.md` 10.3, section NNN, measured
 * against Logitech's own compiles.
 *
 * **The measurement is a round trip through a description that leaves out what the generator owns.**
 * `takeApart` cuts each compile into pieces, `describeStateTables` reads back only what a composer
 * would supply, `buildStateTables` builds the three slots' pieces from that, `withStateTables` puts
 * them where Logitech's sat, and `layOutContainer` lays the whole container out again. Byte equality
 * with the compile then says the generator computed everything the description lacks.
 *
 * **The blind control makes that a test rather than a hope.** Before describing, every byte the
 * generator claims to own is overwritten in a copy of the pieces: the firmware's records 7 to 17 and
 * the first two byte one, the header's `wide` and repeated `narrow`, the clock's increments, every
 * name's value count, the name tree's node order, every value map's lead byte and case order. The
 * rebuild from that copy still equals the compile, so none of those bytes reached the generator.
 *
 * **The failing controls are the alternative rules**, counted: the name tree in index order, its
 * hash at half and at double the capacity, and the value map cases in ascending order. Each fails on
 * compiles the generator reproduces.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import type { Container, ContainerLayout, ContainerPiece, StateTablesSpec } from '../src/index.ts';
import {
  FIRMWARE_STATE_RECORDS,
  FIRST_WIDE_VARIABLE,
  NARROW_MAX_MEASURED,
  StateTablesError,
  WIDE_MAX_MEASURED,
  activityNames,
  activityStateVariables,
  buildStateRecord,
  buildStateTables,
  buildValueMap,
  clockTransitions,
  compilerCaseOrder,
  describeStateTables,
  deviceDelayVariables,
  isWideVariable,
  keyListCapacity,
  keyListHash,
  layOutContainer,
  nameNodes,
  nameTreeOrder,
  parse,
  stateRecords,
  stateTable,
  takeApart,
  valueMaps,
  withStateTables,
} from '../src/index.ts';

/** The thirteen arch 14 compiles section 312 names, as `frame.test.ts` lists them. */
const ARCH14_COMPILES = [
  'h650_config_region', 'h650_panasonic_config', 'h600_config', 'calibration_h600',
  'h700_config', 'h700_config_2', 'h700_28_config_region',
  'h650_power_hold_compile', 'h650_power_hold_compile_2', 'h700_power_hold_compile',
  'h700_power_hold_compile_2', 'h700_power_hold_compile_3', 'h700_power_hold_compile_4',
] as const;
/** The two Harmony 600 compiles, the only ones whose name tree has 48 nodes or fewer. */
const SMALL_TREES = ['h600_config', 'calibration_h600'] as const;

const containerOf = (name: string): Container => parse(load(name) as Uint8Array);

function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  if (a.length !== b.length) return Math.min(a.length, b.length);
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return i;
  return undefined;
}

/** Describe, build, put back and lay out: the bytes the generator's round trip produces. */
function rebuilt(layout: ContainerLayout, described: ContainerLayout = layout): Uint8Array {
  const built = buildStateTables(describeStateTables(described));
  return layOutContainer(withStateTables(layout, built)).bytes;
}

test('base slots 0, 13 and 14 of every arch 14 compile are rebuilt byte for byte from a description',
     skipUnless(...ARCH14_COMPILES), () => {
  let variables = 0;
  let maps = 0;
  for (const name of ARCH14_COMPILES) {
    const c = containerOf(name);
    const layout = takeApart(c);
    const spec = describeStateTables(layout);
    variables += spec.variables.length;
    maps += spec.valueMaps.length;
    assert.equal(firstDifference(rebuilt(layout), c.blob), undefined, `${name} differs`);
  }
  // Every variable from 18 upward but the first two byte one, and every value map, came from the
  // description; the counts say how much of each compile that is.
  assert.equal(variables, 1051);
  assert.equal(maps, 501);
});

/**
 * A copy of `layout` with every byte the generator owns overwritten, so a description read off it
 * cannot carry any of them. Only the three slots' pieces are copied; the rest are shared, which is
 * what lets the value maps' targets still name the pieces the layout holds.
 */
function blinded(layout: ContainerLayout): ContainerLayout {
  const table = layout.sections[13]!.head[0]!;
  const records = [...table.refs].sort((a, b) => a.at - b.at).map((ref) => ('to' in ref ? ref.to : undefined)!);
  const narrow = table.bytes[2]! | (table.bytes[3]! << 8);
  const scrambled = new Map<ContainerPiece, ContainerPiece>();
  const copy = (p: ContainerPiece, bytes: Uint8Array): ContainerPiece => {
    const out = { ...p, bytes, refs: [...p.refs] };
    scrambled.set(p, out);
    return out;
  };
  // The firmware's records 7 to 17 and the compiler's first two byte one: every byte.
  for (const index of [...Array.from({ length: 11 }, (_, k) => 7 + k), narrow]) {
    copy(records[index]!, new Uint8Array(records[index]!.bytes.length).fill(0xee));
  }
  // The clock's three increments: the operand and opcode of the minute's, day's and month's only
  // transition. The hour's is the description's list and stays.
  for (const index of [1, 3, 5]) {
    const bytes = records[index]!.bytes.slice();
    bytes.fill(0xee, 7 + 5, 7 + 8);
    copy(records[index]!, bytes);
  }
  // The header's `wide` and repeated `narrow`; `count` and `narrow` stay, since the description
  // needs to know which index to leave out, and a wrong one would show as a mismatch.
  const header = table.bytes.slice();
  header.fill(0xee, 4, 8);
  const newTable = copy(table, header);
  newTable.refs = table.refs.map((ref) => ('to' in ref && scrambled.has(ref.to) ? { ...ref, to: scrambled.get(ref.to)! } : ref));

  // The name tree: nodes in reverse order, and every level 1 name's value count turned to nines.
  const tree = layout.sections[0]!.head[0]!.bytes;
  const nodes: Uint8Array[] = [];
  for (let at = 5; at < tree.length - 2;) {
    const length = 3 + (tree[at + 1]! | (tree[at + 2]! << 8));
    const node = tree.slice(at, at + length);
    if ((node[3]! | (node[4]! << 8)) === 1) {
      for (let i = node.length - 1; i >= 7 && node[i] !== 0x5f; i -= 1) node[i] = 0x39;
    }
    nodes.push(node);
    at += length;
  }
  const newTree = new Uint8Array(tree.length);
  newTree.set(tree.subarray(0, 5));
  let at = 5;
  for (const node of nodes.reverse()) { newTree.set(node, at); at += node.length; }
  newTree.set(tree.subarray(tree.length - 2), at);
  copy(layout.sections[0]!.head[0]!, newTree);

  // Every value map: its lead byte, and its cases reversed with their address fields.
  const mapTable = layout.sections[14]!.head[0]!;
  const newMaps = mapTable.refs.map((ref) => {
    if (!('to' in ref)) throw new Error('a value map is not a piece');
    const p = ref.to;
    const n = p.bytes[1]! | (p.bytes[2]! << 8);
    const bytes = p.bytes.slice();
    bytes[0] = 0xee;
    const refs = p.refs.map((one) => {
      if (one.at < 3 || one.at >= 3 + 5 * n) return one;
      const k = Math.floor((one.at - 3) / 5);
      return { ...one, at: 3 + 5 * (n - 1 - k) + 2 };
    });
    for (let k = 0; k < n; k += 1) bytes.set(p.bytes.subarray(3 + 5 * k, 3 + 5 * k + 5), 3 + 5 * (n - 1 - k));
    const out = copy(p, bytes);
    out.refs = refs;
    return { ...ref, to: out };
  });
  copy(mapTable, mapTable.bytes).refs = newMaps;

  const swap = (run: ContainerPiece[]): ContainerPiece[] => run.map((p) => scrambled.get(p) ?? p);
  return {
    ...layout,
    body: swap(layout.body),
    sections: layout.sections.map((s) => (s === undefined ? s : { before: swap(s.before), head: swap(s.head) })),
  };
}

test('the rebuild reads none of the bytes the generator owns: a blinded description rebuilds all thirteen',
     skipUnless(...ARCH14_COMPILES), () => {
  for (const name of ARCH14_COMPILES) {
    const c = containerOf(name);
    const layout = takeApart(c);
    const blind = blinded(layout);
    // The blinded copy is really different where it should be, which is the control on the control.
    assert.notDeepEqual(blind.sections[0]!.head[0]!.bytes, layout.sections[0]!.head[0]!.bytes, `${name}: tree`);
    assert.notDeepEqual(blind.sections[13]!.head[0]!.bytes, layout.sections[13]!.head[0]!.bytes, `${name}: header`);
    assert.equal(firstDifference(rebuilt(layout, blind), c.blob), undefined, `${name} differs`);
  }
});

/** A Java 6 hash map's bucket order for the level 1 indices at `capacity`, ties left in file order. */
function bucketOrder(indices: readonly number[], capacity: number): number[] {
  return [...indices].sort((a, b) => (keyListHash(a) & (capacity - 1)) - (keyListHash(b) & (capacity - 1)));
}

test('the name tree stores its level 1 nodes in the bucket order of the variable index, and the capacity is pinned',
     skipUnless(...ARCH14_COMPILES), () => {
  const fits = { rule: 0, ascending: 0, half: 0, double: 0 };
  const sizes: number[] = [];
  for (const name of ARCH14_COMPILES) {
    const nodes = nameNodes(containerOf(name))!;
    // Root and State open every tree, in that order.
    assert.deepEqual(nodes.slice(0, 2).map((n) => [n.level, n.index, n.name]), [[0, 0, 'Root'], [0, 1, 'State']], name);
    const stored = nodes.slice(2).map((n) => n.index);
    assert.ok(nodes.slice(2).every((n) => n.level === 1), `${name}: only level 1 follows`);
    sizes.push(stored.length);
    const capacity = keyListCapacity(stored.length);
    const same = (order: number[]): boolean => order.every((v, k) => v === stored[k]);
    if (same(nameTreeOrder(stored))) fits.rule += 1;
    if (same([...stored].sort((a, b) => a - b))) fits.ascending += 1;
    if (same(bucketOrder(stored, capacity / 2))) fits.half += 1;
    if (same(bucketOrder(stored, capacity * 2))) fits.double += 1;
  }
  assert.deepEqual(fits, { rule: 13, ascending: 0, half: 0, double: 11 });
  // The two that fail at double are the two smallest trees, 32 and 41 nodes in 64 buckets; the next
  // size up, 51, fails at 64. So the table doubles past a count between 41 and 51 in 64 buckets.
  assert.deepEqual([...sizes].sort((a, b) => a - b).slice(0, 3), [32, 41, 51]);
  for (const name of SMALL_TREES) {
    const stored = nameNodes(containerOf(name))!.slice(2).map((n) => n.index);
    assert.equal(keyListCapacity(stored.length), 64, name);
    assert.ok(!bucketOrder(stored, 128).every((v, k) => v === stored[k]), `${name} fits 128`);
  }
});

test('a value map\'s cases are generated in the compiler\'s order, and ascending order fails',
     skipUnless(...ARCH14_COMPILES), () => {
  let records = 0;
  let ascendingFails = 0;
  for (const name of ARCH14_COMPILES) {
    for (const map of valueMaps(containerOf(name))!) {
      const keys = map.entries.map(([value]) => value);
      assert.deepEqual(compilerCaseOrder(keys), keys, name);
      // No range table on any arch 14 compile, and the lead byte is 2.
      assert.equal(map.ranges.length, 0, name);
      records += 1;
      if (!keys.every((v, k) => k === 0 || v > keys[k - 1]!)) ascendingFails += 1;
    }
  }
  assert.equal(records, 501);
  assert.equal(ascendingFails, 332);
});

test('the firmware\'s block, the first two byte variable and the widths are constant over the thirteen',
     skipUnless(...ARCH14_COMPILES), () => {
  let narrowWidest = 0;
  let wideNarrowest = Infinity;
  let apart = 0;
  for (const name of ARCH14_COMPILES) {
    const c = containerOf(name);
    const t = stateTable(c)!;
    const records = stateRecords(c)!;
    FIRMWARE_STATE_RECORDS.forEach(([first, max], k) => {
      const r = records[7 + k]!;
      assert.deepEqual([r.first, r.second, r.count], [first, max, 0], `${name}: record ${7 + k}`);
    });
    // The clock's transitions are generated: three increments and the hour's call, whose list
    // increments the day and the weekday.
    for (let index = 0; index < 7; index += 1) {
      const held = records[index]!.values.map((v) => ({ from: v.from, to: v.to, operand: v.operand, opcode: v.opcode }));
      assert.deepEqual(held, clockTransitions(index, records[2]!.values[0]!.operand), `${name}: clock record ${index}`);
    }
    const hourList = c.actionLists()![records[2]!.values[0]!.operand]!;
    assert.deepEqual(hourList.map((one) => [one.opcode, one.operand]), [[0x1f, 0xf203], [0x1f, 0xf204]], `${name}: hour list`);
    const firstWide = records[t.narrow]!;
    assert.deepEqual([firstWide.first, firstWide.second, firstWide.count], [FIRST_WIDE_VARIABLE.first, FIRST_WIDE_VARIABLE.max, 0], name);
    // It sits straight after record 17 in the file, and nothing names it.
    const blobOf = (address: number): number => c.blobOffsetOf(address)!;
    assert.equal(blobOf(firstWide.address), blobOf(records[17]!.address) + records[17]!.length, name);
    assert.ok(!nameNodes(c)!.some((n) => n.level === 1 && n.index === t.narrow), name);
    // Stored in index order, but for the first two byte variable and, on most, one record apart.
    const byAddress = records.map((_, index) => index).sort((a, b) => records[a]!.address - records[b]!.address)
      .filter((index) => index !== t.narrow);
    if (byAddress.some((index, k) => k > 0 && index < byAddress[k - 1]!)) apart += 1;
    records.forEach((r, index) => {
      if (index < 18 || index === t.narrow) return;
      if (index < t.narrow) narrowWidest = Math.max(narrowWidest, r.second);
      else wideNarrowest = Math.min(wideNarrowest, r.second);
    });
  }
  assert.equal(apart, 11);
  assert.equal(narrowWidest, NARROW_MAX_MEASURED);
  assert.equal(wideNarrowest, WIDE_MAX_MEASURED);
});

/** Every programmed configuration of arch 8, 9 and 12 in the lab, plus the Harmony One's factory one. */
const OTHER_ARCHITECTURES = [
  'one_config', 'one_config_unprogrammed', 'one_spare_before_sync', 'one_spare_after_sync',
  'h525_config', 'h525_config_2', 'arch8_config_a', 'arch8_config_b', 'arch8_config_c', 'arch8_config_d',
] as const;

test('the level 1 order holds on arch 8, 9 and 12 too, where the generator is not offered',
     skipUnless(...OTHER_ARCHITECTURES), () => {
  let fits = 0;
  let ascending = 0;
  for (const name of OTHER_ARCHITECTURES) {
    const stored = nameNodes(containerOf(name))!.filter((n) => n.level === 1).map((n) => n.index);
    const capacity = keyListCapacity(stored.length);
    const bucket = (v: number): number => keyListHash(v) & (capacity - 1);
    if (stored.every((v, k) => k === 0 || bucket(v) >= bucket(stored[k - 1]!))) fits += 1;
    if (stored.every((v, k) => k === 0 || v > stored[k - 1]!)) ascending += 1;
  }
  // Small trees, 4 to 13 level 1 nodes, so weaker evidence than the thirteen; and their trees carry a
  // third level 0 node and a level 2 on arch 8 and 9, which the generator does not build.
  assert.deepEqual({ fits, ascending }, { fits: 10, ascending: 0 });
});

test('a device\'s eight delay variables are built from its identifier and four delays, on all 83 devices',
     skipUnless(...ARCH14_COMPILES), () => {
  let devices = 0;
  for (const name of ARCH14_COMPILES) {
    const spec = describeStateTables(takeApart(containerOf(name)));
    const byStem = new Map(spec.variables.filter((v) => v.stem !== undefined).map((v) => [v.stem!, v]));
    const ids = [...byStem.keys()].map((stem) => /^PowerOnDelay_(\d+)$/.exec(stem)).filter((m) => m !== null).map((m) => Number(m![1]));
    for (const id of ids) {
      const held = (property: string): number => byStem.get(`${property}_${id}`)!.first;
      const built = deviceDelayVariables(id, {
        powerOn: held('PowerOnDelay'), interDevice: held('InterDeviceDelay'),
        defaultPowerOn: held('DefaultPowerOnDelay'), defaultInterDevice: held('DefaultInterDeviceDelay'),
      });
      for (const one of built) {
        const stated = byStem.get(one.stem!);
        assert.ok(stated !== undefined, `${name}: ${one.stem} absent`);
        assert.deepEqual([stated.first, stated.max, stated.transitions?.length ?? 0], [one.first, one.max, 0], `${name}: ${one.stem}`);
      }
      devices += 1;
    }
    // Every name with a delay property belongs to one of those devices, so nothing is left over.
    const delayNames = [...byStem.keys()].filter((stem) => /Delay\w*_\d+$/.test(stem));
    assert.equal(delayNames.length, 8 * ids.length, name);
  }
  assert.equal(devices, 83);
});

test('the activity variables are built from the activity count, which the menu states independently',
     skipUnless(...ARCH14_COMPILES), () => {
  for (const name of ARCH14_COMPILES) {
    const c = containerOf(name);
    const spec = describeStateTables(takeApart(c));
    const built = activityStateVariables(activityNames(c).length);
    for (const one of built) {
      const stated = spec.variables.find((v) => v.stem === one.stem);
      assert.ok(stated !== undefined, `${name}: ${one.stem}`);
      assert.deepEqual([stated.first, stated.max, stated.transitions?.length ?? 0], [one.first, one.max, 0], `${name}: ${one.stem}`);
    }
  }
});

test('the generator refuses what it cannot establish', () => {
  // A width in the gap between the measured one byte and two byte maxima.
  assert.throws(() => isWideVariable(150), StateTablesError);
  assert.equal(isWideVariable(NARROW_MAX_MEASURED), false);
  assert.equal(isWideVariable(WIDE_MAX_MEASURED), true);
  // Two indices in one bucket: 20 and 80 both land in bucket 21 of 64.
  const crowded = [20, 80, ...Array.from({ length: 39 }, (_, k) => 30 + k).filter((v) => v !== 80)];
  assert.equal(keyListCapacity(crowded.length), 64);
  assert.throws(() => nameTreeOrder(crowded), StateTablesError);
  // A value wider than its two bytes. A value above its own maximum is not refused, since one of
  // Logitech's thirteen compiles writes one.
  assert.throws(() => buildStateRecord(0x10000, 4), StateTablesError);
  assert.doesNotThrow(() => buildStateRecord(65535, 254));
  const target = { to: { bytes: new Uint8Array(1), refs: [] }, offset: 0 };
  // A case key set no compile pins, and a key twice.
  assert.throws(() => buildValueMap({ cases: [2, 3, 16].map((value) => ({ value, target })) }), StateTablesError);
  assert.throws(() => buildValueMap({ cases: [{ value: 1, target }, { value: 1, target }] }), StateTablesError);
  const spec: StateTablesSpec = {
    clock: Array.from({ length: 6 }, () => ({ first: 0, max: 59 })), hourList: 12, variables: [], valueMaps: [],
  };
  assert.throws(() => buildStateTables(spec), StateTablesError);
});

test('a built table names its records, and the header follows the widths', () => {
  const built = buildStateTables({
    clock: [[1, 59], [2, 59], [3, 23], [4, 30], [5, 6], [6, 11], [26, 27]].map(([first, max]) => ({ first: first!, max: max! })),
    hourList: 12,
    variables: [
      { stem: 'A', first: 0, max: 65277 }, { stem: 'B', first: 0, max: 1 }, { first: 0, max: 100 },
    ],
    valueMaps: [],
  });
  // 18 firmware, B and the unnamed one byte variable, then the first two byte one and A.
  assert.deepEqual(built.indexOf, [21, 18, 19]);
  assert.deepEqual([...built.stateTable.bytes.subarray(0, 8)], [22, 0, 20, 0, 2, 0, 20, 0]);
  assert.equal(built.records.length, 22);
  assert.deepEqual(built.stateTable.refs.map((ref) => ('to' in ref ? built.records.indexOf(ref.to) : -1)),
                   Array.from({ length: 22 }, (_, k) => k));
});
