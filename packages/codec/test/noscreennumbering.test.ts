/**
 * The numbering of the Harmony 300 and 350's lists, key maps, timers and state variables in Logitech's compiles:
 * is there a rule a generator could derive it from, `todo-compile-350.md` 5.1.8, a question left open by
 * [plan 011](../../../docs/plans/011-the-350-from-nothing.md). **The answer is no rule found, for all four, and
 * this test pins what was tried and by how much each candidate missed**, so that a rule found later is a
 * measurement against these counts and not a start from nothing. Where a build takes the numbering as an input,
 * it is description, not something a generator derives (`reference/architectures/harmony-300-350/memory.md`,
 * "Numbering").
 *
 * **The samples.** The 13 compiles `noscreenconstants.test.ts` reads, and they are not 13 independent ones: the test
 * setup's two compiles are one setup compiled twice and agree on every order measured here, and four compiles of
 * one day's harvest share devices. Two further limits: 2 of the 13 hold a single device with a power command
 * (any order fits one device), and 6 hold two or three, where a random order fits one time in two or six. **What
 * can refute a rule is the compiles with four or more power devices: 5 of the 13**, the setup twice, the eight device
 * harvest compile, the other owner's five device compile and the bench 300's four device one, so 4 distinct setups.
 * Every count below says which of these it is over.
 *
 * **What was found, which is a structure and not a rule.**
 *
 * 1. **A power variable's numbering and the numbering of the list that switches it on are one walk**: in all 13 the
 *    on lists ascend with the variable index (`powerOrderIsListOrder`). So whatever orders the variables orders
 *    those lists; one question, not two. It does not extend to the input variables, whose lists come after all the
 *    power lists in the compiles that have them while the variables sit among the power ones, and the flag has none.
 * 2. **The send lists of one infrared group ascend with the group's record number** in 12 of the 12 compiles that
 *    hold any (the 2011 compile stores none), and across groups they interleave in runs of varying length. No
 *    key tried reproduces that interleaving (below).
 * 3. **A compile is deterministic**: the setup's two compiles agree on the order of variables, maps and timers,
 *    and differ only in the five lists the favourite channels add (331 against 326).
 *
 * **What was tried, each as an exact match of the whole order, per compile.**
 *
 * - **The order of the devices in the variable walk** (so the on lists, 1.): 278 candidates, 8 plain keys and 270 hash
 *   map orders. The plain keys: the metadata archive's order, ascending and descending device number, name ascending
 *   (case sensitive and not) and descending, the infrared group ascending and descending. The hash maps: Java
 *   `HashMap` iteration over the device's number, its number as text, its name, its underscored name and its
 *   group, each under Java 6 and 7's spreading hash, Java 8's and none, at the table size the count implies and at
 *   16 to 65536 buckets, with ties by insertion order and by its reverse. **No candidate fits all 11 compiles with two
 *   or more devices; the best fits 5 of 11, and at most 1 of those 5 is a compile with four devices or more**, so
 *   the rest are the two and three device compiles, which a random order fits one time in two or six. Pairwise, no simple
 *   key beats chance: of 110 ordered pairs of devices the metadata order puts 56 as Logitech does, ascending number
 *   56, name 46, group 57. (A throwaway run also ordered the variables as a whole, inputs and flag included, by a
 *   hash of each variable's name, four spellings of it and the same hashes: best 3 of 11. That run is not pinned.)
 * - **The order of the device key maps**, raw slot 6 from entry 1, as the same walk: the same 278 candidates, best 5
 *   of 11, again the small compiles, and none fits more than 1 of the 5. Ascending group fits the five smallest
 *   and 69 of 110 pairs. The two walks are not one: the setup's variables run Sony HT, Knoll, Switch, LG TV, Plasma,
 *   Denon, Kodi, KPN and its maps LG TV, Knoll, KPN, Denon, Switch, Sony HT, Kodi, Plasma.
 * - **The interleaving of the send lists across groups**, as an ascending order of a hash of the list's key: the key
 *   `a * group + record` for a from 0 to 300, the device number times a plus the record, the device number's last
 *   three digits, the hash of the device's name or of its number with the record, and the plain `group << 8 | record`
 *   the list's own operand, under the three spreads at six table sizes: best 2 of 12, the two smallest compiles.
 * - **The timers**, 16 records on the setup and the eight device compile, 12 on the other owner's, in an order that is
 *   neither paired (a device's 400 and 600 tick records adjacent: 0 of the 10 compiles with four records or more),
 *   nor sorted by duration then pin, nor by pin then duration (0 of 10 each). The order the keys' places first
 *   appear in the table is the order they first appear in the variable walk in 3 of 10 and in the map order in 1
 *   of 10, and with four places, where luck is one in 24, in 0 of 6 and 1 of 6 (`timerCandidates`). Which timer
 *   belongs to which device is the press list's, and the table's order is not that of the lists that start them.
 *
 * **Not tried, and so not ruled out**: an order Logitech's own database holds that the file does not state, such as the
 * order the devices were added to the account. The device number is account scoped and ascends with that order on an
 * account, so the "number ascending" candidate stands for it and fits no better than chance. Nor the identity hash
 * code of a Java object, which differs from run to run and which the two identical setup compiles argue against.
 * **What a builder takes as input** if it is to reproduce Logitech's numbering rather than choose its own: the order
 * of the devices in the walk, one permutation, from which the power variable numbers and their on lists follow; the
 * order of the device key maps, a second permutation; the order of the timers, a third; and the interleaving of the
 * send lists across groups, a fourth. Ours is free, since nothing on the remote reads an index but the instructions
 * that name it, `noscreenstatetables.test.ts`.
 *
 * **Sources checked first.** Logitech's client (`../lab/work/myharmony/src/`, MyHarmony as C#) holds the runtime classes for
 * state variables (`StateVariable`, `StateVariables`, `WriteStateVariableAction`), which read and write a variable's
 * value on the remote; it compiles nothing for this family, the service does, so it states no numbering
 * (`reference/logitech/clients.md`). `reference/architectures/harmony-300-350/memory.md` (the six slots, the
 * activity, the state variables), plan 011's census, `noscreenstatetables.test.ts` (where the transition order of
 * a record was found to follow no rule either) and `noscreen.test.ts`'s `inCompilerOrder`, which is the one
 * numbering here that does follow a rule: a key map's entries in the order of Java 6's hash map over their tags.
 *
 * **Width.** Arch 16 (Harmony 300 and 350), two generations of Logitech's compiler, 13 compiles of 4 to 5 independent
 * setups at best. **Not checked**: other accounts' orderings beyond these, and any rule that needs a quantity this
 * test does not read off a compile.
 *
 * **What would falsify it.** A candidate key that fits all 11 compiles with two or more devices and the 5 with four or
 * more. The candidate counts below are the ones to beat.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LAB, needing, require_, skipUnless, skipWithoutLab } from '@harmony/lab';

import { type Container, irGroups, metadataArchive, parse, stateRecords, stateVariables } from '../src/index.ts';
import { instructionsAt, mapOfGroup } from '../src/families/harmony-300-350/devices.ts';
import { DEVICE_KEYS } from '../src/families/harmony-300-350/keys.ts';
import { nameOfLabel } from '../src/shared/core.ts';

const NAMED = ['h350_config', 'h350_three_devices_config', 'h350_programmed_config', 'h300_config', 'h300_programmed_config'];
const PATHS = [
  'work/setups/h350-test/compile-Result.EzHex',
  'work/setups/h350-test/first-compile/compile-Result.EzHex',
  'work/harvest/check-350/compile-001-Result.EzHex',
  'work/harvest/check-350/compile-002-Result.EzHex',
  'work/harvest/check-350-retry/compile-001-Result.EzHex',
  'work/harvest/check-350-eight/compile-001-Result.EzHex',
  'work/harvest/check-300/compile-001-Result.EzHex',
  'dumps/kkong42/issue-37-harmony-350/unzipped/H350-Sample/H350-Config-inner/Result.EzHex',
];
const needsLab = needing(skipWithoutLab(), skipUnless(...NAMED));

function atPath(path: string): Container {
  const at = join(LAB!, path);
  assert.ok(existsSync(at), `${path} is in the lab`);
  const bytes = readFileSync(at);
  return parse(new Uint8Array(bytes.subarray(bytes.indexOf('GSPM'))));
}
const thirteen = (): [string, Container][] => [
  ...PATHS.map((path): [string, Container] => [path, atPath(path)]),
  ...NAMED.map((name): [string, Container] => [name, parse(require_(name))]),
];

/** A device of a compile, with what its power variable, its key and its map say about it. */
interface Dev { name: string; id: number; group?: number; map?: number; variable?: number; on?: number }

interface Walk {
  label: string;
  c: Container;
  /** Every device, in the metadata archive's order: what a candidate is handed to order. */
  devices: Dev[];
  /** The devices with a power variable, in the order of their variable's index. */
  byVariable: Dev[];
  /** The devices with a key map, in the order of the map. */
  byMap: Dev[];
  timers: { dur: number; pin: number }[];
  lists: number;
}

const body = (c: Container, i: number) => instructionsAt(c.blob, c.blobOffsetOf(c.pointerArray(7)![i]!)!);

/**
 * Read a compile's devices. A device's group is the high byte of the `0x7C` operand in its power variable's off
 * list, which names the group the send reads from; the one device whose lists nest instead (the test setup's Knoll,
 * whose off list calls others) takes the one group that holds records and that no other device has.
 */
function walkOf(label: string, c: Container): Walk {
  const records = stateRecords(c)!;
  const named = stateVariables(c).filter((v) => v.index >= 18);
  const devs: Dev[] = metadataArchive(c)!.devices.map((d) => ({ name: d.name, id: Number(d.deviceId) }));
  for (const d of devs) {
    const v = named.find((x) => x.name === `${nameOfLabel(d.name)}_Power_2`);
    if (v === undefined) continue;
    d.variable = v.index;
    const on = records[v.index]!.values.find((t) => t.to === 1)!;
    const off = records[v.index]!.values.find((t) => t.to === 0)!;
    d.on = on.operand;
    const send = body(c, off.operand).find((x) => x.opcode === 0x7c);
    if (send !== undefined) d.group = send.operand >> 8;
  }
  const used = new Set(devs.map((d) => d.group).filter((g) => g !== undefined));
  const free = (irGroups(c) ?? []).map((g, i) => [g, i] as const).filter(([g, i]) => g.addresses.length > 0 && !used.has(i)).map(([, i]) => i);
  const none = devs.filter((d) => d.group === undefined);
  if (none.length === 1 && free.length === 1) none[0]!.group = free[0]!;
  for (const d of devs) {
    if (d.group === undefined) continue;
    try { d.map = mapOfGroup(c, d.group); } catch { /* a group no device key selects */ }
  }
  const timers = (c.pointerArray(8) ?? []).map((a) => {
    const at = c.blobOffsetOf(a)!;
    return { dur: c.blob[at + 1]! | (c.blob[at + 2]! << 8), pin: c.blob[at + 4]! >> 4 };
  });
  return {
    label, c, timers, lists: c.pointerArray(7)!.length, devices: devs,
    byVariable: devs.filter((d) => d.variable !== undefined).sort((a, b) => a.variable! - b.variable!),
    byMap: devs.filter((d) => d.map !== undefined).sort((a, b) => a.map! - b.map!),
  };
}

const walks = (): Walk[] => thirteen().map(([label, c]) => walkOf(label, c));

// ---------------------------------------------------------------------------------------------------------------
// Candidate keys

const strHash = (s: string): number => { let h = 0; for (let i = 0; i < s.length; i += 1) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return h; };
/** Java 6 and 7's `HashMap` spreading hash, all four terms. */
const java6 = (h: number): number => { h |= 0; h ^= (h >>> 20) ^ (h >>> 12); return (h ^ (h >>> 7) ^ (h >>> 4)) | 0; };
const java8 = (h: number): number => (h ^ (h >>> 16)) | 0;
const none = (h: number): number => h;
const SPREADS: [string, (h: number) => number][] = [['java6', java6], ['java8', java8], ['none', none]];

type Order = (devs: Dev[]) => Dev[];

/** Iterate a hash map of `T` buckets holding the devices by `key`: bucket order, ties by insertion or its reverse. */
function iterate(devs: Dev[], key: (d: Dev) => number, spread: (h: number) => number, T: number, head: boolean): Dev[] {
  const buckets: Dev[][] = Array.from({ length: T }, () => []);
  for (const d of devs) {
    const bucket = buckets[spread(key(d)) & (T - 1)]!;
    if (head) bucket.unshift(d); else bucket.push(d);
  }
  return buckets.flat();
}
/** Java's table size for `n` entries: 16 doubled while the count passes three quarters. */
const sizeFor = (n: number): number => { let T = 16; while (n > T * 0.75) T *= 2; return T; };

/** Every candidate order of a compile's devices, by name. 278: 8 plain keys and 270 hash maps. */
function candidates(): Map<string, Order> {
  const all = new Map<string, Order>();
  all.set('metadata order', (d) => [...d]);
  all.set('number ascending', (d) => [...d].sort((a, b) => a.id - b.id));
  all.set('number descending', (d) => [...d].sort((a, b) => b.id - a.id));
  all.set('name ascending', (d) => [...d].sort((a, b) => (a.name < b.name ? -1 : 1)));
  all.set('name ascending, any case', (d) => [...d].sort((a, b) => (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1)));
  all.set('name descending', (d) => [...d].sort((a, b) => (a.name < b.name ? 1 : -1)));
  all.set('group ascending', (d) => [...d].sort((a, b) => (a.group ?? 99) - (b.group ?? 99)));
  all.set('group descending', (d) => [...d].sort((a, b) => (b.group ?? -1) - (a.group ?? -1)));
  const keys: [string, (d: Dev) => number][] = [
    ['number', (d) => d.id], ['name', (d) => strHash(d.name)], ['underscored name', (d) => strHash(nameOfLabel(d.name))],
    ['number as text', (d) => strHash(String(d.id))], ['group', (d) => d.group ?? 0],
  ];
  for (const [keyName, key] of keys) {
    for (const [spreadName, spread] of SPREADS) {
      for (const head of [false, true]) {
        const ties = head ? 'ties reversed' : 'ties in order';
        all.set(`hash map of ${keyName}, ${spreadName}, ${ties}, size by count`, (d) => iterate(d, key, spread, sizeFor(d.length), head));
        for (const T of [16, 32, 64, 128, 256, 1024, 4096, 65536]) {
          all.set(`hash map of ${keyName}, ${spreadName}, ${ties}, ${T} buckets`, (d) => iterate(d, key, spread, T, head));
        }
      }
    }
  }
  return all;
}

const sameIds = (a: Dev[], b: Dev[]): boolean => a.length === b.length && a.every((d, k) => d.id === b[k]!.id);

/** Per candidate, the compiles it reproduces exactly, among the compiles whose `theirs` order has two or more devices. */
function score(all: Walk[], theirs: (w: Walk) => Dev[], pool: Map<string, Order>): { name: string; fits: string[] }[] {
  const multi = all.filter((w) => theirs(w).length >= 2);
  return [...pool].map(([name, order]) => ({
    // A candidate is handed the same devices in the archive's order, never in the order it is being asked to find.
    name, fits: multi.filter((w) => sameIds(order(w.devices.filter((d) => theirs(w).includes(d))), theirs(w))).map((w) => w.label),
  }));
}

// ---------------------------------------------------------------------------------------------------------------
// The tests

test('a power variable\'s index and the number of the list that switches it on ascend together in 13 of 13', needsLab, () => {
  let together = 0;
  let controlBroken = 0;
  for (const w of walks()) {
    const ons = w.byVariable.map((d) => d.on!);
    if (ons.every((on, k) => k === 0 || on > ons[k - 1]!)) together += 1;
    // The control: the same lists with the first two swapped are no longer ascending, wherever there are two.
    if (ons.length >= 2) {
      const swapped = [...ons];
      [swapped[0], swapped[1]] = [swapped[1]!, swapped[0]!];
      if (!swapped.every((on, k) => k === 0 || on > swapped[k - 1]!)) controlBroken += 1;
    }
  }
  assert.equal(together, 13);
  assert.equal(controlBroken, 11);
});

test('no key puts the devices in Logitech\'s variable order: 278 candidates, the best fits 5 of 11 and 1 of the 5 with four devices or more', needsLab, () => {
  const all = walks();
  const pool = candidates();
  assert.equal(pool.size, 278);
  const multi = all.filter((w) => w.byVariable.length >= 2);
  assert.equal(multi.length, 11);
  const big = multi.filter((w) => w.byVariable.length >= 4);
  assert.deepEqual(big.map((w) => w.byVariable.length), [8, 8, 8, 5, 4]);
  const scored = score(all, (w) => w.byVariable, pool);
  const best = Math.max(...scored.map((s) => s.fits.length));
  const bestBig = Math.max(...scored.map((s) => s.fits.filter((l) => big.some((w) => w.label === l)).length));
  assert.equal(best, 5);
  assert.equal(bestBig, 1);
  assert.ok(scored.every((s) => s.fits.length < multi.length), 'no candidate fits all');
  // Pairwise, of 110 ordered pairs: the metadata order, ascending number, name and group.
  const pairs = (order: Order): number => {
    let agree = 0;
    for (const w of multi) {
      const mine = order(w.devices.filter((d) => w.byVariable.includes(d))).map((d) => d.id);
      const theirs = w.byVariable.map((d) => d.id);
      for (let i = 0; i < theirs.length; i += 1) for (let j = i + 1; j < theirs.length; j += 1) if (mine.indexOf(theirs[i]!) < mine.indexOf(theirs[j]!)) agree += 1;
    }
    return agree;
  };
  assert.deepEqual(
    ['metadata order', 'number ascending', 'name ascending', 'group ascending'].map((n) => pairs(pool.get(n)!)),
    [56, 56, 46, 57],
  );
  // The calibration: the harness accepts the true order, 11 of 11.
  const truth = new Map<string, Order>([['truth', (d) => [...d].sort((a, b) => a.variable! - b.variable!)]]);
  assert.equal(score(all, (w) => w.byVariable, truth)[0]!.fits.length, 11);
});

test('no key puts the device key maps in Logitech\'s order either: the best fits 5 of 11 and 1 of the 5 with four devices or more', needsLab, () => {
  const all = walks();
  const pool = candidates();
  const multi = all.filter((w) => w.byMap.length >= 2);
  assert.equal(multi.length, 11);
  const big = multi.filter((w) => w.byMap.length >= 4);
  assert.equal(big.length, 5);
  const scored = score(all, (w) => w.byMap, pool);
  assert.equal(Math.max(...scored.map((s) => s.fits.length)), 5);
  assert.equal(Math.max(...scored.map((s) => s.fits.filter((l) => big.some((w) => w.label === l)).length)), 1);
  assert.ok(scored.every((s) => s.fits.length < multi.length));
  // Ascending group fits the five smallest and is not the rule.
  const group = scored.find((s) => s.name === 'group ascending')!;
  assert.equal(group.fits.length, 5);
  assert.ok(group.fits.every((l) => !big.some((w) => w.label === l)));
  // Of 110 ordered pairs of devices ascending group puts 69 as Logitech's maps do, against 55 for a coin.
  let agree = 0;
  for (const w of multi) {
    const mine = pool.get('group ascending')!(w.devices.filter((d) => w.byMap.includes(d))).map((d) => d.id);
    const theirs = w.byMap.map((d) => d.id);
    for (let i = 0; i < theirs.length; i += 1) for (let j = i + 1; j < theirs.length; j += 1) if (mine.indexOf(theirs[i]!) < mine.indexOf(theirs[j]!)) agree += 1;
  }
  assert.equal(agree, 69);
  // And the two walks are not one: the maps and the variables order the same devices differently in the setup.
  const setup = all[0]!;
  assert.deepEqual(setup.byVariable.map((d) => d.name), ['Sony HT', 'Knoll', 'Switch', 'LG TV', 'Plasma', 'Denon', 'Kodi', 'KPN']);
  assert.deepEqual(setup.byMap.map((d) => d.name), ['LG TV', 'Knoll', 'KPN', 'Denon', 'Switch', 'Sony HT', 'Kodi', 'Plasma']);
  // The twin agrees with it on both, so a compile is deterministic.
  const twin = all[1]!;
  assert.deepEqual(twin.byVariable.map((d) => d.name), setup.byVariable.map((d) => d.name));
  assert.deepEqual(twin.byMap.map((d) => d.name), setup.byMap.map((d) => d.name));
  assert.deepEqual(twin.timers, setup.timers);
  assert.deepEqual([setup.lists, twin.lists], [331, 326]);
});

/** A send list: the cancel, one send, the tail naming the group; its group and record number. */
function sends(w: Walk): { list: number; group: number; record: number; id: number; name: string }[] {
  const out = [];
  const devices = new Map(w.byVariable.map((d) => [d.group, d]));
  for (let i = 0; i < w.lists; i += 1) {
    const b = body(w.c, i);
    if (b.length === 3 && b[0]!.opcode === 7 && b[0]!.operand === 0xfffb && b[1]!.opcode === 0x7d && b[2]!.opcode === 0x7c) {
      const group = b[1]!.operand >> 8;
      const d = devices.get(group);
      out.push({ list: i, group, record: b[1]!.operand & 0xff, id: d?.id ?? 0, name: d?.name ?? '' });
    }
  }
  return out;
}

test('the send lists ascend with the record number inside each group in 12 of 12, and no key sweep orders them across groups: best 2 of 12', needsLab, () => {
  const per = walks().map((w) => ({ w, items: sends(w) }));
  const holding = per.filter((p) => p.items.length > 0);
  assert.equal(holding.length, 12);
  let ascending = 0;
  for (const p of holding) {
    const groups = [...new Set(p.items.map((i) => i.group))];
    if (groups.every((g) => { const s = p.items.filter((i) => i.group === g); return s.every((x, k) => k === 0 || x.record > s[k - 1]!.record); })) ascending += 1;
  }
  assert.equal(ascending, 12);
  type Item = (typeof per)[number]['items'][number];
  const keys: [string, (i: Item, a: number) => number, number[]][] = [
    ['a * group + record', (i, a) => a * i.group + i.record, Array.from({ length: 301 }, (_, a) => a)],
    ['a * number + record', (i, a) => (a * i.id + i.record) | 0, Array.from({ length: 301 }, (_, a) => a)],
    ['a * (number mod 1000) + record', (i, a) => a * (i.id % 1000) + i.record, Array.from({ length: 301 }, (_, a) => a)],
    ['hash of the name, times 31, plus record', (i) => (Math.imul(strHash(i.name), 31) + i.record) | 0, [0]],
    ['hash of number and record as text', (i) => strHash(String(i.id) + i.record), [0]],
    ['hash of number_record', (i) => strHash(`${i.id}_${i.record}`), [0]],
    ['hash of name_record', (i) => strHash(`${i.name}_${i.record}`), [0]],
    ['hash of group_record', (i) => strHash(`${i.group}_${i.record}`), [0]],
    ['group << 8 | record', (i) => (i.group << 8) | i.record, [0]],
  ];
  const fitsOf = (key: (i: Item, a: number) => number, spread: (h: number) => number, a: number, T: number, pool: typeof per): number => {
    let fits = 0;
    for (const p of pool) {
      if (p.items.length < 2) continue;
      const order = [...p.items].sort((x, y) => ((spread(key(x, a)) & (T - 1)) - (spread(key(y, a)) & (T - 1))) || (x.list - y.list));
      if (order.every((x, k) => k === 0 || x.list > order[k - 1]!.list)) fits += 1;
    }
    return fits;
  };
  let best = 0;
  let tried = 0;
  for (const [, key, as] of keys) {
    for (const [, spread] of SPREADS) {
      for (const a of as) {
        for (const T of [16, 64, 256, 1024, 4096, 65536]) { tried += 1; best = Math.max(best, fitsOf(key, spread, a, T, per)); }
      }
    }
  }
  assert.equal(tried, 3 * 3 * 301 * 6 + 6 * 3 * 6);
  assert.equal(best, 2);
  // The calibration: the list's own number as the key is accepted by 12 of 12 under no spreading and a table past them.
  assert.equal(fitsOf((i) => i.list, none, 0, 65536, per), 12);
});

/** The orders of the places' first timers, against the places in a device order. */
function timerCandidates(all: Walk[]): Record<string, number> {
  const out: Record<string, number> = { paired: 0, sortedByDuration: 0, sortedByPin: 0, placesInVariableOrder: 0, placesInMapOrder: 0, fourPlacesInVariableOrder: 0, fourPlacesInMapOrder: 0, withFourPlaces: 0 };
  let pinned = 0;
  for (const w of all) {
    const t = w.timers;
    if (t.length < 4) continue;
    pinned += 1;
    if (t.every((x, k) => k % 2 === 1 || (x.dur === 400 && t[k + 1]!.dur === 600 && t[k + 1]!.pin === x.pin))) out.paired! += 1;
    if (t.every((x, k) => k === 0 || (x.dur > t[k - 1]!.dur) || (x.dur === t[k - 1]!.dur && x.pin >= t[k - 1]!.pin))) out.sortedByDuration! += 1;
    if (t.every((x, k) => k === 0 || (x.pin > t[k - 1]!.pin) || (x.pin === t[k - 1]!.pin && x.dur >= t[k - 1]!.dur))) out.sortedByPin! += 1;
    const placeOf = (d: Dev): number => DEVICE_KEYS[d.group! % DEVICE_KEYS.length]!.pin;
    const seen = [...new Set(t.map((x) => x.pin))];
    const firstSeen = (devs: Dev[]): number[] => [...new Set(devs.filter((d) => d.group !== undefined).map(placeOf))];
    const matches = (devs: Dev[]): boolean => {
      const order = firstSeen(devs).filter((pin) => seen.includes(pin));
      return JSON.stringify(order) === JSON.stringify(seen);
    };
    // A fit with two or three places is one in two or six by luck, so the fits are counted by how many places they order.
    if (matches(w.byVariable)) { out.placesInVariableOrder! += 1; if (seen.length === 4) out.fourPlacesInVariableOrder! += 1; }
    if (matches(w.byMap)) { out.placesInMapOrder! += 1; if (seen.length === 4) out.fourPlacesInMapOrder! += 1; }
    if (seen.length === 4) out.withFourPlaces! += 1;
  }
  out.compiles = pinned;
  return out;
}

test('the timers\' order is neither paired nor sorted, and the keys\' places follow the variable walk in 0 of 6 and the map order in 1 of 6 with four keys', needsLab, () => {
  const all = walks();
  const got = timerCandidates(all);
  // Compiles with at least four timer records: the setup twice, the retry's pair of devices (4), the eight device
  // compile, the other owner's, the three that hold three or four device keys.
  assert.deepEqual(got, {
    paired: 0, sortedByDuration: 0, sortedByPin: 0, placesInVariableOrder: 3, placesInMapOrder: 1,
    fourPlacesInVariableOrder: 0, fourPlacesInMapOrder: 1, withFourPlaces: 6, compiles: 10,
  });
  // The calibration: a hand made table in each candidate's order is accepted by that candidate, so the counts above are not zeros by construction.
  const paired = [{ dur: 400, pin: 1 }, { dur: 600, pin: 1 }, { dur: 400, pin: 0 }, { dur: 600, pin: 0 }];
  const fake = { ...all[0]!, timers: paired, byVariable: [], byMap: [] } as Walk;
  assert.equal(timerCandidates([fake]).paired, 1);
  assert.equal(timerCandidates([{ ...fake, timers: [...paired].sort((a, b) => a.dur - b.dur || a.pin - b.pin) }]).sortedByDuration, 1);
});
