/**
 * The Harmony 300 and 350's state tables, built from a description and from our own numbering, held against every
 * compile of the family the lab holds, `todo-compile-350.md` 5.1.2, step 2 of
 * [plan 011](../../../docs/plans/011-the-350-from-nothing.md). The facts and the allocator are
 * `families/harmony-300-350/statetables.ts`; the builder is the generic `buildStateTables`.
 *
 * **The question.** Plan 011 counted base slot 13 as `other` on this family: the four slot and One families build
 * it, and `NO_SCREEN_FAMILY.stateTables` refused. It said the facts were measured on seven compiles (records 7 to
 * 17 identical, no clock transitions, one wide variable, no value maps) and not filled in, and that Logitech numbers
 * the setup's own variables, 18 upward, in an order no rule is known for. So two things are asked here: does the
 * generic builder, given this family's facts, rebuild the section; and does a setup's state table numbered by our
 * own rule hold the same variables as Logitech's, role for role.
 *
 * **What was measured, over the 13 compiles `noscreenconstants.test.ts` reads**, ten for a Harmony 350 and three for
 * a Harmony 300, one from 2011, one from 2017 and eleven from Logitech's current service:
 *
 * 1. **The firmware's records 7 to 17 are the same eleven `[first, max]` pairs in 13 of 13**, none with a
 *    transition, and they are the Harmony 600, 650 and 700's (`FIRMWARE_STATE_RECORDS`); the Harmony One's differ in
 *    records 13 and 14, and fail all 13.
 * 2. **No clock record holds a transition in 13 of 13**, so the hour names no list and the family's `clockCarry` is
 *    false; the clock's `first` values are the build stamp's fields, and `clockSpec` of the stamp rebuilds all seven
 *    records byte for byte in 13 of 13. The four slot family's facts, whose clock carries, refuse every one.
 * 3. **One two byte variable in 13 of 13**, the compiler's first, holding 0 under 65277 at index `narrow`, which is
 *    the last index; every other variable above 17 is one byte, with maxima up to 18 (the test setup's Denon input,
 *    19 values), so `narrowMax` is 18.
 * 4. **No base slot 14**: the configurations hold no value map table, so the family's `caseCountWidth` is undefined.
 * 5. **The round trip**: `takeApart`, `describeStateTables`, `buildStateTables`, `withStateTables`, `layOutContainer`
 *    gives each compile back byte for byte, 13 of 13, 65 variables described. **What it needed**: `takeApart` leaves
 *    the parameter block's five groups, 21 bytes, inside the state table's piece in all 13, since they sit straight
 *    behind it and nothing claims them, and the parameter table names them by an offset past the table's length.
 *    `withStateTables` now keeps such parked content as a piece of its own behind the built table.
 *    **The blind control**: every byte the generator claims (records 7 to 17, the compiler's first two byte variable,
 *    the header's `wide` and repeated `narrow`, every name's value count, the name tree's node order) overwritten
 *    before describing, and all 13 still rebuild.
 * 6. **The setup's variables are three kinds, then the compiler's one two byte variable of item 3, and nothing else,
 *    in 13 of 13**: a power variable for each device the metadata archive lists with a power command (the two
 *    bench compiles' Chromecast has no command and no variable; every other device has a power command, so this
 *    cannot tell "a power command" from "any command"), first 0, max 1, going to 1 calling one list and to 0 another; an input variable where the activity
 *    puts a device on an input, `_Input_<values>`, first 0, one transition per value from any value calling a list,
 *    or none and one value where the input only sets the catalogue's states (the test setup's LG TV, `h350_config`'s
 *    TV); and the activity's flag, first 0, max 1, no transitions, wherever Watch TV is bound in key map 0, but on
 *    `h300_config`, the 2011 compile, whose activity is the older generation's with no flag
 *    (`reference/architectures/harmony-300-350/memory.md`, the activity). That exception is one compile named by
 *    label: Watch TV bound gives the flag in 12 of 13, and nothing here tells "older generation" from "this one
 *    file". 49 power variables, 8 inputs, 8 flags. **Which devices have an input variable, and how many values,
 *    is read off the compile's own names here**, so this test does not hold the inputs against the activity; that
 *    is `noscreenactivity.test.ts`'s.
 * 7. **Our numbering gives the same tables by content**: for each compile, the devices read off its metadata archive
 *    in the archive's order, each one's two power lists, its input's value count and send lists, and whether the
 *    activity keeps a flag are handed to `buildNoScreenStateTables`, and the result is held against Logitech's
 *    variable by variable through its role: the same name, `first`, `max` and transitions, the header's four words,
 *    the firmware's eighteen records and the compiler's first two byte one byte for byte, every Logitech variable
 *    matched once, a name tree of the same names, and as many bytes of base slot 13 as Logitech's, 588 on the test
 *    setup's compile and 312 on `h300_programmed_config`, the census's two. 13 of 13. The list numbers in the transitions are
 *    the description's, read off the compile, because which list does what is the composers' and their numbering
 *    is the list allocator's, plan 011.
 *
 * **The samples are not 13 independent ones.** The test setup's two compiles are one setup compiled twice and agree
 * record for record; four compiles are of one day's harvest and share their devices. So a count over the 13, such as
 * the 33 of 49 below, is a count of records, of which fewer are distinct.
 *
 * **What is not reproduced**: the stored order of a record's transitions. 33 of the 49 power records store the switch
 * on first and 16 the switch off; ascending list number fits 16 and a Java 6 hash of the list numbers at 16 buckets
 * 22, so no rule is known. The comparison is of the transitions as a set, since the firmware runs every transition
 * that matches a write (`reference/config-format/state.md`) and no two of one record's go to the same value. So 33 of
 * the 49 power records are byte for byte, the rest are the same transitions the other way round; of the 8 inputs,
 * the three with no transitions and the two with values 0 and 1 stored ascending are byte for byte, and the Denon's
 * 19 values (twice) and the issue 37 LG TV's 8 are stored in neither the values' order nor the lists'.
 *
 * **Our numbering is a choice**, the allocator's docstring: the power variables in the setup's order, then the
 * inputs, then the flag. Logitech's differs on the test setup's compile (its LG TV input last, its Denon input
 * fifth), which the last test pins, so that the comparison is visibly by role and not by number.
 *
 * **Controls that fail**: the Harmony One's firmware records, on 13 of 13; a description by the four slot family's
 * facts, refused on 13 of 13; one device's on and off lists swapped, on every compile with a power variable, 13 of
 * 13; the flag dropped, on the 8 that have one; an input with a value more, on the 6 that have one.
 *
 * **Sources checked first.** `reference/architectures/harmony-300-350/memory.md` (the state variables, the activity),
 * `reference/config-format/state.md`, plan 011's census and step 2, `noscreencensus.test.ts`, `statetables.test.ts`
 * and the four slot and One families' facts, `tests/test_harmony_350_clock.py` for the clock. Logitech's client
 * compiles nothing for this family (`reference/logitech/clients.md`), so it states none of this; `docs/findings.md`
 * sections 259 to 265 name the slots and hold no state record of this family.
 *
 * **Width.** Arch 16 alone, both models, two generations of the compiler. **Not checked**: whether the remote cares
 * about the order of the variables (nothing reads an index but the instructions that name it, which is why our order
 * is free), and a two byte variable of the setup's own, which no compile holds.
 *
 * **What would falsify it.** A compile of the family whose records 7 to 17 or clock transitions differ, a variable of
 * a fourth kind, a power or input variable of another shape, or a flag where Watch TV is unbound.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LAB, needing, require_, skipUnless, skipWithoutLab } from '@harmony/lab';

import { type Container, metadataArchive, parse } from '../src/index.ts';
import {
  buildNoScreenStateTables,
  buildStateTables,
  type ContainerLayout,
  type ContainerPiece,
  describeStateTables,
  layOutContainer,
  NO_SCREEN_FAMILY,
  NO_SCREEN_FIRMWARE_STATE_RECORDS,
  NO_SCREEN_NARROW_MAX,
  NO_SCREEN_STATE_TABLES,
  type NoScreenStateDevice,
  type NoScreenStateRequest,
  type NoScreenStateTables,
  noScreenStateVariables,
  StateTablesError,
  stateVariableName,
  takeApart,
  WATCH_TV_SCAN,
  withStateTables,
} from '../src/build.ts';
import { nameNodes, stateRecords, stateTable, stateVariables } from '../src/internal.ts';
import { keyMaps, PRESS } from '../src/families/harmony-300-350/devices.ts';
import { nameOfLabel } from '../src/shared/core.ts';
import { FIRMWARE_STATE_RECORDS, FOUR_SLOT_STATE_TABLES } from '../src/families/harmony-600-650-700/statetables.ts';
import { ONE_STATE_TABLES } from '../src/families/harmony-one/statetables.ts';
import { sameBytes } from '../src/bytes.ts';

/** The five bench fixtures, by the lab's names. */
const NAMED = ['h350_config', 'h350_three_devices_config', 'h350_programmed_config', 'h300_config', 'h300_programmed_config'];
/** The other eight, by their path in the lab, as `noscreenconstants.test.ts` reads them. */
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
/** The one compile whose activity is the older generation's, with no flag. */
const OLDER_GENERATION = 'h300_config';

const needsLab = needing(skipWithoutLab(), skipUnless(...NAMED));

/** A compile by its path in the lab, from its `GSPM` on; the lab is there, so a missing file fails. */
function atPath(path: string): Container {
  const at = join(LAB!, path);
  assert.ok(existsSync(at), `${path} is in the lab`);
  const bytes = readFileSync(at);
  return parse(new Uint8Array(bytes.subarray(bytes.indexOf('GSPM'))));
}

/** All 13, labelled. */
const thirteen = (): [string, Container][] => [
  ...PATHS.map((path): [string, Container] => [path, atPath(path)]),
  ...NAMED.map((name): [string, Container] => [name, parse(require_(name))]),
];

// The codec's one byte comparison, `todo.md` 7.3.7, under the name this file has always used.
const same = sameBytes;

/** Describe by a family's facts, build, put back and lay out. */
function rebuilt(layout: ContainerLayout, described: ContainerLayout = layout): Uint8Array {
  const built = buildStateTables(describeStateTables(described, NO_SCREEN_STATE_TABLES), NO_SCREEN_STATE_TABLES);
  return layOutContainer(withStateTables(layout, built)).bytes;
}

/** A Logitech record's stored bytes, by index. */
function theirRecord(c: Container, index: number): Uint8Array {
  const record = stateRecords(c)![index]!;
  const at = c.blobOffsetOf(record.address)!;
  return c.blob.slice(at, at + record.length);
}

test('all 13 compiles of the family rebuild byte for byte from a description by the family\'s facts', needsLab, () => {
  let variables = 0;
  let parked = 0;
  let groupsBehind = 0;
  for (const [label, c] of thirteen()) {
    const layout = takeApart(c);
    const table = layout.sections[13]!.head[0]!;
    const stated = 8 + 3 * stateTable(c)!.count;
    parked += table.bytes.length - stated;
    // What is parked there is the parameter block's groups: base slot 15's table names five, all past the state table.
    const parameters = layout.sections[15]!.head[0]!;
    // And they fill the whole gap: base slot 15's table starts where they end.
    const gap = c.blobOffsetOf(c.sections[10]!.address)! - c.blobOffsetOf(c.sections[9]!.address)!;
    if (parameters.refs.length === 5 && parameters.refs.every((r) => 'to' in r && r.to === table && r.offset >= stated)
      && gap === table.bytes.length) groupsBehind += 1;
    variables += describeStateTables(layout, NO_SCREEN_STATE_TABLES).variables.length;
    assert.ok(same(rebuilt(layout), c.blob), `${label} rebuilds`);
  }
  assert.equal(variables, 65);
  // The parameter block's five groups, 21 bytes, behind the state table in every compile.
  assert.equal(parked, 13 * 21);
  assert.equal(groupsBehind, 13);
});

/**
 * A copy of `layout` with every byte the generator owns overwritten: records 7 to 17 and the compiler's first two
 * byte variable, the header's `wide` and repeated `narrow`, every level 1 name's value count, and the name tree's
 * node order reversed. Arch 16 has no value maps and no clock transitions, so nothing else is the generator's.
 */
function blinded(layout: ContainerLayout): ContainerLayout {
  const table = layout.sections[13]!.head[0]!;
  const records = [...table.refs].filter((ref) => ref.at < 8 + 3 * (table.bytes[0]! | (table.bytes[1]! << 8)))
    .sort((a, b) => a.at - b.at).map((ref) => ('to' in ref ? ref.to : undefined)!);
  const narrow = table.bytes[2]! | (table.bytes[3]! << 8);
  const scrambled = new Map<ContainerPiece, ContainerPiece>();
  const copy = (p: ContainerPiece, bytes: Uint8Array): ContainerPiece => {
    const out = { ...p, bytes, refs: [...p.refs] };
    scrambled.set(p, out);
    return out;
  };
  for (const index of [...Array.from({ length: 11 }, (_, k) => 7 + k), narrow]) {
    copy(records[index]!, new Uint8Array(records[index]!.bytes.length).fill(0xee));
  }
  const header = table.bytes.slice();
  header.fill(0xee, 4, 8);
  const newTable = copy(table, header);
  newTable.refs = table.refs.map((ref) => ('to' in ref && scrambled.has(ref.to) ? { ...ref, to: scrambled.get(ref.to)! } : ref));

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

  const swap = (run: ContainerPiece[]): ContainerPiece[] => run.map((p) => scrambled.get(p) ?? p);
  // The parameter table names the groups parked in the state table's piece, so it follows the copy.
  const redirect = (p: ContainerPiece): ContainerPiece => (p.refs.some((r) => 'to' in r && r.to === table)
    ? { ...p, refs: p.refs.map((r) => ('to' in r && r.to === table ? { ...r, to: newTable } : r)) } : p);
  return {
    ...layout,
    body: swap(layout.body),
    sections: layout.sections.map((s) => (s === undefined ? s : { before: swap(s.before).map(redirect), head: swap(s.head).map(redirect) })),
  };
}

test('the rebuild reads none of the bytes the generator owns: a blinded description rebuilds all 13', needsLab, () => {
  for (const [label, c] of thirteen()) {
    const layout = takeApart(c);
    const blind = blinded(layout);
    // The blinded copy really differs where it should, the control on the control.
    assert.ok(!same(blind.sections[0]!.head[0]!.bytes, layout.sections[0]!.head[0]!.bytes), `${label}: tree`);
    assert.ok(!same(blind.sections[13]!.head[0]!.bytes, layout.sections[13]!.head[0]!.bytes), `${label}: header`);
    assert.ok(same(rebuilt(layout, blind), c.blob), `${label} rebuilds blind`);
  }
});

test('the firmware\'s records, the clock and the widths are the family\'s on all 13, and the other families\' fail them', needsLab, () => {
  // The family's records are the Harmony 600, 650 and 700's, measured twice; the Harmony One's differ.
  assert.deepEqual(NO_SCREEN_FIRMWARE_STATE_RECORDS, FIRMWARE_STATE_RECORDS);
  const tally = { firmware: 0, touchFirmware: 0, clockBare: 0, widest: 0, oneWide: 0, fourSlotRefused: 0 };
  for (const [label, c] of thirteen()) {
    const records = stateRecords(c)!;
    const table = stateTable(c)!;
    const firmware = records.slice(7, 18).map((r) => [r.first, r.second]);
    if (JSON.stringify(firmware) === JSON.stringify(NO_SCREEN_FIRMWARE_STATE_RECORDS) && records.slice(7, 18).every((r) => r.values.length === 0)) tally.firmware += 1;
    if (JSON.stringify(firmware) === JSON.stringify(ONE_STATE_TABLES.firmwareRecords)) tally.touchFirmware += 1;
    if (records.slice(0, 7).every((r) => r.values.length === 0)) tally.clockBare += 1;
    tally.widest = Math.max(tally.widest, ...records.slice(18).filter((_, k) => 18 + k !== table.narrow).map((r) => r.second));
    if (table.wide === 1 && table.narrow === table.count - 1 && table.narrowAgain === table.narrow
      && records[table.narrow]!.first === 0 && records[table.narrow]!.second === 65277) tally.oneWide += 1;
    try {
      describeStateTables(takeApart(c), FOUR_SLOT_STATE_TABLES);
    } catch (error) {
      if (!(error instanceof StateTablesError) || !error.message.includes('calls one list')) throw error;
      tally.fourSlotRefused += 1;
    }
    assert.equal(c.sections.length, 15, `${label}: fifteen raw slots and so no base slot 14`);
  }
  assert.deepEqual(tally, { firmware: 13, touchFirmware: 0, clockBare: 13, widest: NO_SCREEN_NARROW_MAX, oneWide: 13, fourSlotRefused: 13 });
  // The family member answers now, where it refused until 5.1.2.
  assert.equal(NO_SCREEN_FAMILY.stateTables, NO_SCREEN_STATE_TABLES);
});

/** Whether a compile's activity keeps the flag: Watch TV bound in key map 0, in the current compiler's shape. */
function keepsFlag(label: string, c: Container): boolean {
  const bound = keyMaps(c)[0]!.entries.some((one) => one.tag === (PRESS | WATCH_TV_SCAN));
  return bound && label !== OLDER_GENERATION;
}

/**
 * The description of a compile's setup as its state variables need it: the devices off the metadata archive, in its
 * order, a power variable for each with a power command, and the activity off key map 0. The lists the transitions
 * call and an input's value count are read off Logitech's records, being the composers' and the catalogue's.
 */
function requestOf(label: string, c: Container): NoScreenStateRequest {
  const records = stateRecords(c)!;
  const named = new Map(stateVariables(c).map((v) => [v.name, v.index]));
  const inputs = new Map(stateVariables(c).flatMap((v) => {
    const match = /^(.*)_Input_(\d+)$/.exec(v.name);
    return match === null ? [] : [[match[1]!, { index: v.index, values: Number(match[2]) }] as const];
  }));
  const devices = metadataArchive(c)!.devices.map((one): NoScreenStateDevice => {
    const stem = nameOfLabel(one.name);
    const device: { name: string; power?: { on: number; off: number }; input?: { values: number; sends?: number[] } } = { name: one.name };
    if (one.commands.some((command) => /power/i.test(command.name))) {
      const index = named.get(`${stem}_Power_2`);
      assert.ok(index !== undefined, `${label}: ${one.name} has a power command and so a power variable`);
      const values = records[index]!.values;
      device.power = { on: values.find((v) => v.to === 1)!.operand, off: values.find((v) => v.to === 0)!.operand };
    }
    const input = inputs.get(stem);
    if (input !== undefined) {
      const values = records[input.index]!.values;
      device.input = values.length === 0 ? { values: input.values }
        : { values: input.values, sends: Array.from({ length: input.values }, (_, k) => values.find((v) => v.to === k)!.operand) };
    }
    return device;
  });
  return { devices, activity: keepsFlag(label, c) };
}

/** A transition as a comparable string. */
const transition = (t: { from: number; to: number; operand: number; opcode: number }): string => `${t.from}>${t.to}:${t.opcode}/${t.operand}`;

/**
 * Every way ours differs from Logitech's, through each variable's role: empty when they hold the same variables.
 * The firmware's block, the compiler's first two byte variable and the header byte for byte; the setup's variables
 * by name, value, maximum and transitions as a set; every Logitech variable matched once; the name tree's names.
 */
function differences(c: Container, ours: NoScreenStateTables): string[] {
  const out: string[] = [];
  const theirs = stateTable(c)!;
  const { built } = ours;
  const header = built.stateTable.bytes;
  const words = [0, 2, 4, 6].map((at) => header[at]! | (header[at + 1]! << 8));
  if (JSON.stringify(words) !== JSON.stringify([theirs.count, theirs.narrow, theirs.wide, theirs.narrowAgain])) out.push(`header ${words}`);
  for (const index of [...Array.from({ length: 18 }, (_, k) => k), theirs.narrow]) {
    if (built.records[index] === undefined || !same(built.records[index]!.bytes, theirRecord(c, index))) out.push(`record ${index}`);
  }
  const records = stateRecords(c)!;
  const byName = new Map(stateVariables(c).map((v) => [v.name, v.index]));
  const matched = new Set<number>();
  ours.spec.variables.forEach((variable, k) => {
    const name = stateVariableName(variable.stem!, variable.max);
    const index = byName.get(name);
    if (index === undefined) { out.push(`${name} is not Logitech's`); return; }
    matched.add(index);
    const record = records[index]!;
    const mine = [...(variable.transitions ?? [])].map(transition).sort();
    const theirsT = record.values.map(transition).sort();
    if (record.first !== variable.first || record.second !== variable.max || JSON.stringify(mine) !== JSON.stringify(theirsT)) {
      out.push(`${name} differs`);
    }
    if (ours.indices[k] === undefined) out.push(`${name} has no index`);
  });
  for (let index = 18; index < theirs.count; index += 1) {
    if (index !== theirs.narrow && !matched.has(index)) out.push(`Logitech's variable ${index} has no role here`);
  }
  if (matched.size !== ours.spec.variables.length) out.push('two of our variables match one of Logitech\'s');
  const names = (tree: { level: number; name: string }[]): string[] => tree.filter((n) => n.level === 1).map((n) => n.name).sort();
  const ourTree = parse(layOutContainer(withStateTables(takeApart(c), built)).bytes);
  if (JSON.stringify(names(nameNodes(ourTree) ?? [])) !== JSON.stringify(names(nameNodes(c) ?? []))) out.push('name tree');
  return out;
}

test('a setup\'s state tables numbered by our allocator equal Logitech\'s by content on all 13', needsLab, () => {
  const kinds = { power: 0, input: 0, flag: 0 };
  const byteForByte = { power: 0, input: 0 };
  const sizes: Record<string, number> = {};
  for (const [label, c] of thirteen()) {
    const request = requestOf(label, c);
    const ours = buildNoScreenStateTables(request, c.builtAt!);
    assert.deepEqual(differences(c, ours), [], label);
    // The flag is where Watch TV is bound, in the current compiler's shape, and nowhere else.
    assert.equal(stateVariables(c).some((v) => v.name === 'ActivityPowerState_2'), request.activity, `${label}: flag`);
    ours.roles.forEach((role, k) => {
      kinds[role.kind] += 1;
      if (role.kind === 'flag') return;
      const theirs = stateVariables(c).find((v) => v.name === stateVariableName(ours.spec.variables[k]!.stem!, ours.spec.variables[k]!.max))!;
      if (same(ours.built.records[ours.indices[k]!]!.bytes, theirRecord(c, theirs.index))) byteForByte[role.kind] += 1;
    });
    // Base slot 13's bytes our builder makes for this compile: the table and every record.
    sizes[label] = ours.built.stateTable.bytes.length + ours.built.records.reduce((sum, r) => sum + r.bytes.length, 0);
    const table = stateTable(c)!;
    assert.equal(sizes[label], table.length + stateRecords(c)!.reduce((sum, r) => sum + r.length, 0), `${label}: as many bytes as Logitech's`);
  }
  assert.deepEqual(kinds, { power: 49, input: 8, flag: 8 });
  assert.deepEqual(byteForByte, { power: 33, input: 5 });
  assert.deepEqual(sizes, {
    'work/setups/h350-test/compile-Result.EzHex': 588,
    'work/setups/h350-test/first-compile/compile-Result.EzHex': 588,
    'work/harvest/check-350/compile-001-Result.EzHex': 224,
    'work/harvest/check-350/compile-002-Result.EzHex': 224,
    'work/harvest/check-350-retry/compile-001-Result.EzHex': 250,
    'work/harvest/check-350-eight/compile-001-Result.EzHex': 406,
    'work/harvest/check-300/compile-001-Result.EzHex': 260,
    'dumps/kkong42/issue-37-harmony-350/unzipped/H350-Sample/H350-Config-inner/Result.EzHex': 412,
    'h350_config': 296,
    'h350_three_devices_config': 286,
    'h350_programmed_config': 312,
    'h300_config': 250,
    'h300_programmed_config': 312,
  });
});

test('the comparison fails where the tables differ: the One\'s firmware records, swapped power lists, a dropped flag, an input of a value more', needsLab, () => {
  const tally = { touchFirmware: 0, swapped: 0, flagDropped: 0, inputWider: 0 };
  for (const [label, c] of thirteen()) {
    const request = requestOf(label, c);
    // The Harmony One's records 7 to 17 under the same description.
    const touch = buildStateTables({ ...buildNoScreenStateTables(request, c.builtAt!).spec },
      { ...NO_SCREEN_STATE_TABLES, firmwareRecords: ONE_STATE_TABLES.firmwareRecords });
    const asTouch = { ...buildNoScreenStateTables(request, c.builtAt!), built: touch };
    if (differences(c, asTouch).some((one) => one.startsWith('record '))) tally.touchFirmware += 1;
    // One device's on and off lists the other way round.
    const first = request.devices.findIndex((one) => one.power !== undefined);
    const swapped = request.devices.map((one, k) => (k === first ? { ...one, power: { on: one.power!.off, off: one.power!.on } } : one));
    if (differences(c, buildNoScreenStateTables({ ...request, devices: swapped }, c.builtAt!)).length > 0) tally.swapped += 1;
    // The flag left out of tables otherwise ours, since the allocator itself refuses inputs without the activity.
    if (request.activity) {
      const ours = buildNoScreenStateTables(request, c.builtAt!);
      const keep = ours.roles.map((role) => role.kind !== 'flag');
      const spec = { ...ours.spec, variables: ours.spec.variables.filter((_, k) => keep[k]) };
      const built = buildStateTables(spec, NO_SCREEN_STATE_TABLES);
      const without = { spec, built, roles: ours.roles.filter((_, k) => keep[k]), indices: built.indexOf };
      if (differences(c, without).length > 0) tally.flagDropped += 1;
    }
    const withInput = request.devices.findIndex((one) => one.input !== undefined);
    if (withInput >= 0) {
      const wider = request.devices.map((one, k) => (k !== withInput ? one : {
        ...one, input: { values: one.input!.values + 1, ...(one.input!.sends === undefined ? {} : { sends: [...one.input!.sends, 0xfff] }) },
      }));
      const input = wider[withInput]!.input!;
      // A states only input of two values is refused by the allocator, which is a failure too.
      try {
        if (differences(c, buildNoScreenStateTables({ ...request, devices: wider }, c.builtAt!)).length > 0) tally.inputWider += 1;
      } catch (error) {
        if (!(error instanceof StateTablesError) || input.sends !== undefined) throw error;
        tally.inputWider += 1;
      }
    }
  }
  assert.deepEqual(tally, { touchFirmware: 13, swapped: 13, flagDropped: 8, inputWider: 6 });
});

test('our numbering is ours: power variables in the setup\'s order, then inputs, then the flag, where Logitech\'s differs', needsLab, () => {
  const c = atPath(PATHS[0]!);
  const ours = buildNoScreenStateTables(requestOf(PATHS[0]!, c), c.builtAt!);
  const named = ours.spec.variables.map((v, k) => [ours.indices[k], stateVariableName(v.stem!, v.max)]);
  assert.deepEqual(named, [
    [18, 'LG_TV_Power_2'], [19, 'Plasma_Power_2'], [20, 'Denon_Power_2'], [21, 'KPN_Power_2'], [22, 'Kodi_Power_2'],
    [23, 'Switch_Power_2'], [24, 'Sony_HT_Power_2'], [25, 'Knoll_Power_2'], [26, 'LG_TV_Input_1'], [27, 'Denon_Input_19'],
    [28, 'ActivityPowerState_2'],
  ]);
  // Logitech's, plan 011: Sony HT, Knoll, Switch, LG TV, the Denon's input, Plasma, Denon, Kodi, the flag, KPN and the
  // LG TV's input.
  const theirs = stateVariables(c).filter((v) => v.index >= 18).sort((a, b) => a.index - b.index).map((v) => [v.index, v.name]);
  assert.deepEqual(theirs.map(([, name]) => name), [
    'Sony_HT_Power_2', 'Knoll_Power_2', 'Switch_Power_2', 'LG_TV_Power_2', 'Denon_Input_19', 'Plasma_Power_2', 'Denon_Power_2',
    'Kodi_Power_2', 'ActivityPowerState_2', 'KPN_Power_2', 'LG_TV_Input_1',
  ]);
  assert.notDeepEqual(named, theirs);
});

test('the allocator refuses what it cannot number', () => {
  const tv = { name: 'TV', power: { on: 1, off: 2 } };
  // A device named twice, also when the two differ only by a space where the other has an underscore.
  assert.throws(() => noScreenStateVariables({ devices: [tv, { name: 'TV' }], activity: false }), StateTablesError);
  assert.throws(() => noScreenStateVariables({ devices: [{ name: 'LG TV' }, { name: 'LG_TV' }], activity: false }), StateTablesError);
  // An input is the activity's.
  assert.throws(() => noScreenStateVariables({ devices: [{ ...tv, input: { values: 1 } }], activity: false }), /activity/);
  // An input's lists match its values, and one that sends nothing has one value.
  assert.throws(() => noScreenStateVariables({ devices: [{ ...tv, input: { values: 3, sends: [4, 5] } }], activity: true }), StateTablesError);
  assert.throws(() => noScreenStateVariables({ devices: [{ ...tv, input: { values: 2 } }], activity: true }), StateTablesError);
  // An input of 20 values is past the widest one byte variable measured, so its width is not established.
  assert.throws(() => buildNoScreenStateTables({
    devices: [{ ...tv, input: { values: 20, sends: Array.from({ length: 20 }, (_, k) => 10 + k) } }], activity: true,
  }, '2026-11-01T12:00:00'), /past 18/);
  // The family's facts refuse a value map and an hour list.
  const clock = Array.from({ length: 7 }, () => ({ first: 0, max: 59 }));
  assert.throws(() => buildStateTables({ clock, hourList: 3, variables: [], valueMaps: [] }, NO_SCREEN_STATE_TABLES), /carries nothing/);
  const target = { to: { bytes: new Uint8Array(1), refs: [] }, offset: 0 };
  assert.throws(() => buildStateTables({ clock, variables: [], valueMaps: [{ cases: [{ value: 0, target }] }] }, NO_SCREEN_STATE_TABLES), /no value maps/);
  // An empty setup is the firmware's block and the compiler's first two byte variable alone, no value map table.
  const empty = buildNoScreenStateTables({ devices: [], activity: false }, '2026-11-01T12:00:00');
  assert.equal(empty.built.records.length, 19);
  assert.equal(empty.built.narrow, 18);
  assert.equal(empty.built.valueMapTable, undefined);
});
