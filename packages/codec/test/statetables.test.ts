/**
 * Base slots 0, 13 and 14 built from a description, `todo-compile-650.md` 10.3, section 324, measured
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
 * **The failing controls are the alternative rules**, counted with their split: the name tree in index
 * order fails all thirteen and its hash at half the capacity fails all thirteen, while at double the
 * capacity it fails only the two Harmony 600 trees, since every other tree's indices sit below 128
 * where a wider table changes nothing; the value map cases in ascending order fail the 332 records
 * whose key sets make the order visible. The trees `compose.ts` wrote fail the rule, all twenty.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import type { Container, ContainerLayout, ContainerPiece, StateTablesSpec } from '../src/index.ts';
import {
  FIRMWARE_STATE_RECORDS,
  FIRST_WIDE_VARIABLE,
  NARROW_MAX_MEASURED,
  VALUE_MAP_LEAD,
  StateTablesError,
  WIDE_MAX_MEASURED,
  activityNames,
  activityStateVariables,
  buildStateRecord,
  composeDevice,
  composedNameTreeOrder,
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
    const c = containerOf(name);
    for (const map of valueMaps(c)!) {
      const keys = map.entries.map(([value]) => value);
      assert.deepEqual(compilerCaseOrder(keys), keys, name);
      // No range table on any arch 14 compile, and the lead byte is 2.
      assert.equal(map.ranges.length, 0, name);
      assert.equal(c.blob[c.blobOffsetOf(map.address)!], VALUE_MAP_LEAD, name);
      records += 1;
      if (!keys.every((v, k) => k === 0 || v > keys[k - 1]!)) ascendingFails += 1;
    }
  }
  assert.equal(records, 501);
  assert.equal(ascendingFails, 332);
});

test('the firmware\'s block and the first two byte variable are constant over the thirteen, and the widths part at 100 and 254',
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
    // Stored in index order, but for the first two byte variable and, on most, the highest one byte
    // records stored after the two byte ones.
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

/**
 * Every configuration in the lab whose name tree Logitech's compiler wrote, on arch 8, 9, 12 and 16:
 * read off a remote after a sync, compiled by their service, or written back by us unchanged. The
 * arch 9 safe mode image and the firmware package's container are left out, being one node trees
 * that are not a user configuration's.
 */
const LOGITECH_TREES = [
  'h525_config', 'h525_config_2', 'h525_region_820000',
  'arch8_config_a', 'arch8_config_b', 'arch8_config_c', 'arch8_config_d', 'arch8_config_880', 'arch8_config_885',
  'one_config', 'one_config_unprogrammed', 'one_spare_before_sync', 'one_spare_after_sync', 'one_spare_myharmony',
  'one_spare_20260830', 'one_spare_after_first_write', 'one_spare_20260901_delay', 'one_spare_20260901_denon',
  'one_spare_20260901_region', 'one_spare_written_by_us', 'one_spare_written_region',
  'calibration_one', 'calibration_favchannels', 'calibration_favzero',
  'compiled_protocols', 'compiled_protocols_2', 'compiled_protocols_3',
  'phase7_before', 'phase7_after', 'vendor_region_user_config',
  'h350_config', 'h350_programmed_config', 'h350_three_devices_config', 'h300_config', 'h300_programmed_config',
] as const;

/** Configurations composed here, whose name tree `compose.ts` appended a node to. */
const COMPOSED_TREES = [
  'one_spare_plus_lg_region', 'one_spare_mixed_region', 'one_spare_plus_lg2_region', 'one_spare_denon65_region',
  'one_spare_reverted_region', 'one_spare_lg_activity_region', 'one_spare_narrow_base', 'one_spare_probe_base',
  'one_spare_retarget_base', 'one_spare_paired_base', 'one_spare_screen_base', 'one_spare_poweroff_base',
  'one_spare_page4_base',
  'h650_lg_region', 'h650_notour_region', 'h650_pre144_region', 'h650_post144_region', 'h650_glow20_region',
  'h650_glow10_region', 'h650_devicelist_region',
] as const;

/** The level 1 indices of a tree in stored order. */
const levelOne = (name: string): number[] =>
  nameNodes(containerOf(name))!.filter((n) => n.level === 1).map((n) => n.index);

/** True when no stored node sits in a lower bucket than the one before it, at the rule's capacity. */
function bucketsNeverStepDown(stored: readonly number[]): boolean {
  const capacity = keyListCapacity(stored.length);
  const bucket = (v: number): number => keyListHash(v) & (capacity - 1);
  return stored.every((v, k) => k === 0 || bucket(v) >= bucket(stored[k - 1]!));
}

test('the level 1 order holds on every name tree Logitech built on arch 8, 9, 12 and 16, and ties are stored larger first',
     skipUnless(...LOGITECH_TREES), () => {
  // Several of these are one tree read more than once, so count distinct trees and not files.
  const trees = new Map<string, number[]>();
  for (const name of LOGITECH_TREES) {
    const stored = levelOne(name);
    trees.set(stored.join(','), stored);
  }
  let fits = 0;
  let ascending = 0;
  const sizes: number[] = [];
  const ties = new Set<string>();
  let treesWithTies = 0;
  let largerFirst = 0;
  let tiesSeen = 0;
  for (const stored of trees.values()) {
    sizes.push(stored.length);
    if (bucketsNeverStepDown(stored)) fits += 1;
    if (stored.every((v, k) => k === 0 || v > stored[k - 1]!)) ascending += 1;
    const capacity = keyListCapacity(stored.length);
    const bucket = (v: number): number => keyListHash(v) & (capacity - 1);
    let tied = false;
    stored.forEach((v, k) => {
      if (k === 0 || bucket(v) !== bucket(stored[k - 1]!)) return;
      tied = true;
      tiesSeen += 1;
      const before = stored[k - 1]!;
      ties.add(`${Math.max(before, v)}&${Math.min(before, v)}`);
      if (before > v) largerFirst += 1;
    });
    if (tied) treesWithTies += 1;
  }
  assert.equal(trees.size, 22);
  assert.deepEqual({ fits, ascending }, { fits: 22, ascending: 0 });
  assert.deepEqual([Math.min(...sizes), Math.max(...sizes)], [2, 25]);
  // Ten distinct pairs, and in every occurrence the larger index is stored first. Not adopted by the
  // generator, which refuses a tie: see the section for why the insertion order is not established.
  assert.equal(ties.size, 10);
  assert.equal(treesWithTies, 10);
  assert.equal(tiesSeen, 15);
  assert.equal(largerFirst, tiesSeen);
});

test('the name trees composed here before section 331 break the order, since compose.ts appended a node rather than placing it',
     skipUnless(...COMPOSED_TREES), () => {
  let fits = 0;
  for (const name of COMPOSED_TREES) if (bucketsNeverStepDown(levelOne(name))) fits += 1;
  assert.equal(fits, 0);
});

/**
 * Section 331: the order a composer extends a tree in, `composedNameTreeOrder`, is the rule with a tie
 * stored larger first, which is every tie Logitech's compilers wrote. Sorting each tree that way gives
 * back its stored order on every tree in section 324's two populations, arch 14's thirteen compiles
 * and the other architectures' 35 files, ties included; the refusing generator's order is the control,
 * since it throws on exactly the trees holding a tie. A wider pass over every registered sample found
 * every tree not composed by us in this order, which this test does not assert. The tie order is fitted
 * to the fifteen ties these trees hold, the only ones in the lab, so the second control below is what
 * makes it a claim: storing a tie smaller first breaks exactly the files holding one.
 */
test('section 331: every name tree in section 324\'s populations is in the composer\'s order, ties stored larger first',
     skipUnless(...LOGITECH_TREES, ...ARCH14_COMPILES), () => {
  const trees = new Map<string, number>();
  const refused: string[] = [];
  const holdingATie: string[] = [];
  // The control on the tie order itself: the same rule with a tie stored smaller first.
  const smallerFirstBreaks: string[] = [];
  for (const name of [...LOGITECH_TREES, ...ARCH14_COMPILES]) {
    const c = containerOf(name);
    const stored = nameNodes(c)!.filter((n) => n.level === 1).map((n) => n.index);
    assert.deepEqual(composedNameTreeOrder(stored), stored, name);
    const capacity = keyListCapacity(stored.length);
    const bucket = (v: number): number => keyListHash(v) & (capacity - 1);
    // How many nodes share a bucket with an earlier one, counted once per distinct tree.
    trees.set(stored.join(','), stored.length - new Set(stored.map(bucket)).size);
    if (new Set(stored.map(bucket)).size < stored.length) holdingATie.push(name);
    const smallerFirst = [...stored].sort((x, y) => bucket(x) - bucket(y) || x - y);
    if (smallerFirst.some((v, k) => v !== stored[k])) smallerFirstBreaks.push(name);
    try { nameTreeOrder(stored); } catch (error) {
      assert.ok(error instanceof StateTablesError);
      refused.push(name);
    }
  }
  assert.equal(trees.size, 34, 'the 22 of the other architectures and the 12 distinct arch 14 trees');
  // Fifteen ties in all, section 324's count, and none on arch 14 (Harmony 600, 650 and 700).
  assert.equal([...trees.values()].reduce((sum, n) => sum + n, 0), 15);
  assert.ok(holdingATie.length > 0);
  assert.ok(ARCH14_COMPILES.every((name) => !holdingATie.includes(name)));
  // The generator refuses exactly the files holding a tie, and storing a tie smaller first breaks
  // exactly those files: so the larger first order is what every one of them holds, not a sort that
  // would pass whichever way a tie went.
  assert.deepEqual(refused, holdingATie);
  assert.deepEqual(smallerFirstBreaks, holdingATie);
});

/** A catalogue power code, as `compose.test.ts` composes one onto the Harmony 650. */
const PANASONIC_POWER = 'G:PanasonicV2 48 Bit:()(0x400401007C7D)():3';

test('section 331: a device composed now leaves its name tree in the compiler\'s order, on the Harmony 650 and the Harmony One',
     skipUnless('h650_config_region', 'one_config'), () => {
  for (const name of ['h650_config_region', 'one_config']) {
    const c = containerOf(name);
    const composed = parse(composeDevice(c, { label: 'Test', commands: [{ stated: PANASONIC_POWER }] }).bytes);
    const nodes = nameNodes(composed)!;
    const stored = nodes.filter((n) => n.level === 1).map((n) => n.index);
    assert.equal(stored.length, levelOne(name).length + (name === 'one_config' ? 1 : 3), `${name}: the nodes`);
    assert.ok(bucketsNeverStepDown(stored), `${name}: in bucket order`);
    assert.deepEqual(composedNameTreeOrder(stored), stored, name);
    // The control: the same nodes with the power variable's node last, where appending put it, are not.
    const power = nodes.find((n) => n.name === 'Test_Power_2')!.index;
    assert.ok(!bucketsNeverStepDown([...stored.filter((v) => v !== power), power]), `${name}: appended`);
  }
});

test('which variable gets which index is not a hash order of its name',
     skipUnless(...ARCH14_COMPILES), () => {
  // Java's String.hashCode of the whole name, then Java 6's and Java 8's supplemental hash, at the
  // rule's capacity: a pair of named variables adjacent in index order steps down about as often as
  // not, which is what an order unrelated to the hash gives.
  const stringHash = (s: string): number => {
    let h = 0;
    for (let i = 0; i < s.length; i += 1) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h >>> 0;
  };
  const java6 = (h: number): number => {
    const x = h ^ (h >>> 20) ^ (h >>> 12);
    return (x ^ (x >>> 7) ^ (x >>> 4)) >>> 0;
  };
  const java8 = (h: number): number => (h ^ (h >>> 16)) >>> 0;
  let pairs = 0;
  let down6 = 0;
  let down8 = 0;
  for (const name of ARCH14_COMPILES) {
    const c = containerOf(name);
    const t = stateTable(c)!;
    const named = nameNodes(c)!.filter((n) => n.level === 1);
    const byIndex = new Map(named.map((n) => [n.index, n.name]));
    const capacity = keyListCapacity(named.length);
    for (const [low, high] of [[18, t.narrow], [t.narrow + 1, t.count]] as const) {
      const run: string[] = [];
      for (let i = low; i < high; i += 1) if (byIndex.has(i)) run.push(byIndex.get(i)!);
      for (let k = 1; k < run.length; k += 1) {
        pairs += 1;
        const [a, b] = [stringHash(run[k - 1]!), stringHash(run[k]!)];
        if ((java6(b) & (capacity - 1)) < (java6(a) & (capacity - 1))) down6 += 1;
        if ((java8(b) & (capacity - 1)) < (java8(a) & (capacity - 1))) down8 += 1;
      }
    }
  }
  assert.deepEqual({ pairs, down6, down8 }, { pairs: 831, down6: 408, down8: 413 });
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
