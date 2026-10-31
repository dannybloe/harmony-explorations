/**
 * The no screen family's activity, `todo-compile-350.md` 4.2: Watch TV composed by `composeNoScreenActivity` and
 * held against what Logitech's compiler writes for the same devices.
 *
 * **What Logitech's compile holds**, read off the lab's `work/setups/h350-test/compile-Result.EzHex`, Logitech's
 * compile of the Harmony 350 test setup, whose one activity puts the LG TV on HDMI 1, the Denon on CBL/SAT and ends
 * in the KPN's map: no activity record, no activity map; one list bound to Watch TV's press, tag `0x86` in entry 0,
 * which flips each device's power in the metadata archive's order (the LG and the Denon through two lists of the
 * activity's own over their power variables, the KPN by its toggle's send list and a wait of 15), flips the flag
 * `ActivityPowerState_2`, then, gated on the flag being 1, writes the LG's and the Denon's input variables 0, and
 * selects the KPN's map. Ten lists are the activity's, and the Denon's input variable adds nineteen more, one per
 * input, each sending a record of the Denon's that nothing else sends. The lab's `chapter4-reading.md` section 1 is
 * an independent reading of the same compile and agrees on every fact used here.
 *
 * **The calibration.** No compile of this family holds devices and no activity, so the test setup's activity is
 * composed onto one that holds another: `h350_three_devices_config`, Logitech's compile for the bench Harmony 350
 * with the KPN box of that account, a Panasonic plasma called TV and a Chromecast, whose activity is the KPN and the
 * TV. The LG TV and the Denon are composed onto its free bottom left key, short press and long, by the family's
 * device composer, and then the activity replaces the donor's. What came out, part by part, in the tests below:
 *
 * * the LG's and the Denon's steps, the flag's, the input gate and the map selected are Logitech's, spelled out
 *   with every variable named and every send named by its record's bytes; the KPN's step is the donor's own
 *   activity's, since its KPN is another model with other codes; the order is the metadata archive's in both;
 * * the Denon's input variable is Logitech's: 19 values, each going from any value to its own by a list of
 *   Logitech's shape sending a record word for word Logitech's for the same input, 19 of 19, so the value numbering
 *   is the catalogue's input order; the LG's is Logitech's one value with no transitions;
 * * the composer adds 29 lists and 19 records, where Logitech's activity owns 29 lists and the Denon's input 19
 *   records.
 *
 * **Second samples**, seven compiles of the current generation, six for a Harmony 350 and one for a Harmony 300,
 * every one holding an activity: each given its own activity's devices again, read off its Watch TV list, and its
 * channel device, and composed with no inputs. Every power step, in its order, the flag's step and the map selected
 * are Logitech's in all seven, so the order rule, the toggle's wait as one `0x7C` (170 tenths on the factory
 * compile, whose device's own list splits it in two) and the map rule hold beyond the test setup. The input gate is
 * compared on the test setup alone, since composing an input onto a device that holds one is refused. And on the
 * five of them that put a device on an input, every one of the 50 input values runs a list of its own, the family's
 * send waiting a tenth, sending a record that no other list sends and that is one block with no silence in front of
 * it: so the copy and the tenth are not the Denon's alone. The arm writing one input itself is on four of them and
 * composed once below; the list of two writes is on the test setup alone.
 *
 * **Which device is the channel device** on the second samples: the KPN box on the five compiles of a setup with
 * one, read from the setups, `packages/corpus/setups/h350-test.json` and the bench accounts' copies of the Harmony
 * 600's; the only device on another owner's compile of one device; and the factory compile's Delta, which is the
 * device its activity's map belongs to and is not otherwise known, so that compile is not a sample of the map rule.
 *
 * **What was not measured**, and so is refused: an input that steps or mixes codes and states, a device whose key
 * delay is not a tenth given an input, a toggle with no power on delay, replacing a device's input variable. And
 * what is reproduced without a judgement: the activity flips every device's power whatever its real state, as
 * Logitech's does, so a device already on is switched off, `reference/architectures/harmony-300-350/memory.md`.
 *
 * **Sources checked first.** Logitech's client compiles nothing for this family, the service does
 * (`reference/logitech/clients.md`). The reference: the family's `memory.md`, `reference/config-format/state.md`
 * and `actions.md`, the 350's `features.md` and `behaviour.md`; the archive, sections 262 to 265 and 278;
 * `packages/bench/test/setup350.test.ts`, which walks the same list on a model of the remote, and the bench run it
 * records, which heard Watch TV send the TV's, the Denon's and the KPN's power and the Denon's input. **Which
 * architectures**: the Harmony 350, six compiles of one generation, and the Harmony 300, one; the Harmony 300's
 * compile of an older generation of the service, with no flag and no register, is not a sample.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { IR_ARCHIVE, LAB, needing, require_, skipUnless, skipWithoutIrArchive, skipWithoutLab } from '@harmony/lab';

import {
  bytes, catalogueDriving, ComposeError, composeNoScreenActivity, inputPlan, irBlockWords, irHeaderPointers, composeNoScreenDevice, type Container, devices, irGroups, mapOfGroup,
  metadataArchive, parse, stateRecords, stateVariables, taggedList,
} from '../src/index.ts';
import { recordKey } from './noscreenparts.ts';

const COMPILE = 'work/setups/h350-test/compile-Result.EzHex';
const FIRST = 'work/setups/h350-test/first-compile/compile-Result.EzHex';
const LG = { manufacturer: 'LG', model: 'OLED65G26LA' };
const DENON = { manufacturer: 'Denon', model: 'AVR-X4800H' };
/** The test setup's activity, `packages/corpus/setups/h350-test.json`. */
const ACTIVITY = {
  devices: [{ name: 'LG TV', input: 'HDMI 1', ...LG }, { name: 'KPN' }, { name: 'Denon', input: 'CBL/SAT', ...DENON }],
  channel: 'KPN',
};

const needsAll = needing(skipWithoutLab(), skipWithoutIrArchive(), skipUnless('h350_three_devices_config'));

function labFile(path: string): Container {
  const at = join(LAB!, path);
  // The lab is there, so a missing file fails rather than skips: the claim is about this one file.
  assert.ok(existsSync(at), `${path} is in the lab`);
  return parse(new Uint8Array(readFileSync(at)));
}

/** One entry of a ZIP, by its central directory: another owner's compile comes as the service's ZIP. */
function unzipped(zip: Uint8Array, name: string): Uint8Array {
  for (let at = 0; at + 46 <= zip.length; at += 1) {
    if (bytes.u32(zip, at) !== 0x02014b50) continue;
    const nameLength = bytes.u16(zip, at + 28);
    if (Buffer.from(zip.subarray(at + 46, at + 46 + nameLength)).toString('latin1') !== name) continue;
    const size = bytes.u32(zip, at + 20);
    const local = bytes.u32(zip, at + 42);
    const data = local + 30 + bytes.u16(zip, local + 26) + bytes.u16(zip, local + 28);
    return new Uint8Array(inflateRawSync(zip.subarray(data, data + size)));
  }
  throw new Error(`no ${name} in the archive`);
}

/** Watch TV's list in a configuration: entry 0's binding of its press. */
function watchTv(c: Container): number {
  const entry = taggedList(c, c.pointerArray(6)![0]!)!.entries.find((one) => one.tag === 0x86);
  assert.ok(entry !== undefined && entry.opcode === 0x7f, 'Watch TV calls a list');
  return entry.operand;
}

function body(c: Container, list: number): { operand: number; opcode: number }[] {
  const at = c.blobOffsetOf(c.pointerArray(7)![list]!)!;
  return Array.from({ length: bytes.u8(c.blob, at) }, (_, k) => ({
    operand: bytes.u16(c.blob, at + 1 + 3 * k), opcode: bytes.u8(c.blob, at + 3 + 3 * k),
  }));
}

/**
 * One instruction spelled so that two compiles can be compared: every list it calls written out, a variable by its
 * name, a send by its device and its record's bytes, a wait by its device, a map by the device whose key selects it.
 */
function spell(c: Container, one: { operand: number; opcode: number }, depth = 0): string {
  const variables = new Map(stateVariables(c).map((v) => [v.index, v.name]));
  const deviceOf = new Map(devices(c).flatMap((d) => (d.group === undefined ? [] : [[d.group, d.name] as const])));
  if (one.opcode === 0x7f) {
    assert.ok(depth < 6, 'lists nest at most six deep');
    return `(${body(c, one.operand).map((x) => spell(c, x, depth + 1)).join(' ')})`;
  }
  if (one.opcode === 0x7d) {
    const group = one.operand >> 8;
    return `send ${deviceOf.get(group)} ${recordKey(c, irGroups(c)![group]!.addresses[one.operand & 0xff]!)}`;
  }
  if (one.opcode === 0x7c) return `wait ${deviceOf.get(one.operand >> 8)} ${one.operand & 0xff}`;
  if (one.opcode >= 0x80) return `${variables.get(one.opcode & 0x7f)} := ${one.operand}`;
  if (one.opcode === 0x71) return `compare ${variables.get(one.operand & 0xff)} ${one.operand >> 8 === 0x80 ? 'two arms' : `op ${one.operand >> 8}`}`;
  if (one.opcode === 0x1f && one.operand >> 8 === 0xfb) return `register := ${one.operand & 0xff}`;
  if (one.opcode === 0x1f && one.operand >> 8 === 0xff) {
    // A device on no key of its own, the Chromecast with no codes, has no map to own.
    const selects = (group: number) => { try { return mapOfGroup(c, group); } catch { return undefined; } };
    const owners = [...deviceOf].filter(([group]) => selects(group) === (one.operand & 0xff)).map(([, name]) => name);
    return `select the map of ${owners.join('/')}`;
  }
  if (one.opcode === 0x07 && one.operand === 0xfffb) return 'cancel timers';
  if (one.opcode === 0 && one.operand === 0) return 'nothing';
  return `${one.opcode.toString(16)}:${one.operand.toString(16)}`;
}

/** Watch TV's list, step by step. */
const steps = (c: Container): string[] => body(c, watchTv(c)).map((one) => spell(c, one));

/** A step's device: the power variable it flips, the toggle it sends, or none for the flag, the gate and the select. */
function stepDevice(c: Container, step: { operand: number; opcode: number }): string | undefined {
  const text = spell(c, step);
  const flipped = /\(register := 0 \(compare (.+)_Power_2 two arms/.exec(text);
  if (flipped !== null) return flipped[1];
  if (step.opcode === 0x7f) {
    const sent = /^\(cancel timers send (\S+) /.exec(text);
    if (sent !== null) return sent[1];
  }
  return undefined;
}

/** The devices Watch TV switches, in its order, by their names in the name tree. */
const activityDevices = (c: Container): string[] =>
  body(c, watchTv(c)).flatMap((one) => { const d = stepDevice(c, one); return d === undefined ? [] : [d]; });

let memo: {
  theirs: Container; donor: Container; before: Container; ours: Container; out: ReturnType<typeof composeNoScreenActivity>;
} | undefined;
function composed() {
  if (memo !== undefined) return memo;
  const donor = parse(require_('h350_three_devices_config'));
  let c = parse(composeNoScreenDevice(donor, IR_ARCHIVE!, { ...LG, name: 'LG TV', place: 2 }).bytes);
  c = parse(composeNoScreenDevice(c, IR_ARCHIVE!, { ...DENON, name: 'Denon', place: 2, press: 'long' }).bytes);
  const out = composeNoScreenActivity(c, IR_ARCHIVE!, ACTIVITY);
  memo = { theirs: labFile(COMPILE), donor, before: c, ours: parse(out.bytes), out };
  return memo;
}

test('the composed Watch TV is Logitech\'s step for step, the LG\'s and the Denon\'s power, the flag, the inputs on the way on and the KPN\'s map, and the KPN\'s toggle is the donor\'s', needsAll, () => {
  const { theirs, donor, ours, out } = composed();
  const mine = steps(ours);
  const logitech = steps(theirs);
  // Seven instructions each: three devices' power, the KPN's in two, its toggle's send and its wait, then the
  // flag, the input gate and the map.
  assert.equal(mine.length, 7);
  assert.equal(logitech.length, 7);
  // The order is each file's metadata archive's: ours put the KPN first, the donor's account having it first, and
  // Logitech's the LG TV, its account having it first. Both are ascending.
  const order = (c: Container) => activityDevices(c).map((name) => metadataArchive(c)!.devices.find((d) => d.name.replaceAll(' ', '_') === name)!.index);
  assert.deepEqual(activityDevices(ours), ['KPN', 'LG_TV', 'Denon']);
  assert.deepEqual(activityDevices(theirs), ['LG_TV', 'Denon', 'KPN']);
  assert.deepEqual(order(ours), [0, 3, 4]);
  assert.deepEqual(order(theirs), [0, 2, 3]);
  // The LG's and the Denon's flips are Logitech's, the lists' own words; the KPN's toggle is the donor's own
  // activity's, its KPN being another model: its send list and a wait of 15, one `0x7C`.
  assert.equal(mine[2], logitech[0]);
  assert.equal(mine[3], logitech[1]);
  assert.match(mine[2]!, /^\(register := 0 \(compare LG_TV_Power_2 two arms LG_TV_Power_2 := 1 LG_TV_Power_2 := 0\)\)$/);
  const donorKpn = body(donor, watchTv(donor)).slice(0, 2).map((one) => spell(donor, one));
  assert.deepEqual(body(ours, out.list).slice(0, 2).map((one) => spell(ours, one)), donorKpn);
  assert.equal(donorKpn[1], 'wait KPN 15');
  assert.equal(logitech[3], 'wait KPN 15');
  // The flag, the gate and the map: Logitech's.
  assert.deepEqual(mine.slice(4), logitech.slice(4));
  assert.deepEqual(mine.slice(4), [
    '(register := 0 (compare ActivityPowerState_2 two arms ActivityPowerState_2 := 1 ActivityPowerState_2 := 0))',
    '(register := 1 (compare ActivityPowerState_2 op 0 (LG_TV_Input_1 := 0 Denon_Input_19 := 0)))',
    'select the map of KPN',
  ]);
  // And what the composer says it did.
  assert.deepEqual(out.power.map((one) => `${one.kind} ${one.device}`), ['toggle KPN', 'variable LG TV', 'variable Denon']);
  assert.deepEqual(out.inputs.map((one) => `${one.device} ${one.value} of ${one.values}`), ['LG TV 0 of 1', 'Denon 0 of 19']);
  assert.equal(out.flag.reused, true);
  assert.equal(out.replaced, watchTv(donor));
});

test('the input variables are Logitech\'s: the Denon\'s nineteen values each send Logitech\'s record for that input, and the LG\'s has one value and sends nothing', needsAll, () => {
  const { theirs, ours } = composed();
  const variable = (c: Container, name: string) => {
    const index = stateVariables(c).find((one) => one.name === name)!.index;
    return stateRecords(c)![index]!;
  };
  // Each value, the list its transition runs, spelled: the timers cancelled, the Denon's record sent, a tenth waited.
  const byValue = (c: Container) => {
    const record = variable(c, 'Denon_Input_19');
    assert.equal(record.first, 0);
    assert.equal(record.second, 18);
    return new Map(record.values.map((one) => {
      assert.equal(one.from, -2, 'every value is reached from any value');
      assert.equal(one.opcode, 0x7f);
      return [one.to, spell(c, one)];
    }));
  };
  const mine = byValue(ours);
  const logitech = byValue(theirs);
  assert.equal(mine.size, 19);
  let same = 0;
  for (const [value, spelled] of logitech) {
    assert.equal(mine.get(value), spelled, `value ${value}`);
    assert.match(spelled, /^\(cancel timers send Denon \S+ wait Denon 1\)$/);
    same += 1;
  }
  assert.equal(same, 19);
  // The LG's: one value, no transitions, in both.
  for (const c of [ours, theirs]) {
    const record = variable(c, 'LG_TV_Input_1');
    assert.deepEqual([record.first, record.second, record.values.length], [0, 0, 0]);
  }
  // **Only the activity's devices have one**: Logitech's compile holds the LG's and the Denon's, and none for the
  // four others whose catalogue entries list inputs, the screen families' compiles holding one for each.
  assert.deepEqual(stateVariables(theirs).filter((one) => /_Input_/.test(one.name)).map((one) => one.name).sort(),
    ['Denon_Input_19', 'LG_TV_Input_1']);
  const others = [['Panasonic', 'TX-P42GT30E'], ['Ligawo', '3090063'], ['Sony', 'DAV-C540'], ['Knoll', 'HDP-1100']] as const;
  assert.equal(others.filter(([m, model]) => inputPlan(catalogueDriving(IR_ARCHIVE!, m, model)).input !== undefined).length, 4);
  // No other input variable is new: the donor's KPN keeps its own, which nothing writes now.
  assert.deepEqual(stateVariables(ours).filter((one) => /_Input_/.test(one.name)).map((one) => one.name).sort(),
    ['Denon_Input_19', 'KPN_Input_2', 'LG_TV_Input_1']);
});

test('the composer adds the 29 lists and 19 records Logitech\'s activity owns', needsAll, () => {
  const { theirs, donor, ours, out } = composed();
  // Logitech's activity's own lists: every list Watch TV reaches, but the KPN's send list, which is the device's,
  // and every list the Denon's input variable runs.
  const reached = new Set<number>();
  const walk = (c: Container, list: number) => {
    if (reached.has(list)) return;
    reached.add(list);
    for (const one of body(c, list)) if (one.opcode === 0x7f) walk(c, one.operand);
  };
  walk(theirs, watchTv(theirs));
  const kpnSend = body(theirs, watchTv(theirs)).find((one) => stepDevice(theirs, one) === 'KPN')!.operand;
  reached.delete(kpnSend);
  assert.equal(reached.size, 10);
  const denonInput = stateVariables(theirs).find((one) => one.name === 'Denon_Input_19')!.index;
  const inputLists = stateRecords(theirs)![denonInput]!.values.map((one) => one.operand);
  assert.equal(new Set([...reached, ...inputLists]).size, 29);
  assert.equal(out.listsAdded, 29);
  // The records: the Denon's input records are sent by its input's lists alone in Logitech's compile, 19 of them;
  // ours are 19 new records in the Denon's group, each word for word one of Logitech's Denon records.
  assert.equal(out.recordsAdded, 19);
  const denonGroup = (c: Container) => devices(c).find((one) => one.name === 'Denon')!.group!;
  const theirKeys = new Set(irGroups(theirs)![denonGroup(theirs)]!.addresses.map((a) => recordKey(theirs, a)));
  const added = irGroups(ours)![denonGroup(ours)]!.addresses.slice(-19);
  assert.equal(added.filter((a) => theirKeys.has(recordKey(ours, a))).length, 19);
  // The table grew by exactly those, and the donor's Watch TV list is still there, called by nothing now.
  const { before } = composed();
  assert.equal(ours.pointerArray(7)!.length - before.pointerArray(7)!.length, 29);
  const callers = (c: Container, list: number) => c.pointerArray(7)!.flatMap((_, k) => body(c, k))
    .filter((one) => one.opcode === 0x7f && one.operand === list).length
    + c.pointerArray(6)!.flatMap((address) => taggedList(c, address)!.entries).filter((one) => one.opcode === 0x7f && one.operand === list).length;
  assert.equal(callers(before, watchTv(donor)), 1);
  assert.equal(callers(ours, watchTv(donor)), 0);
});

test('one input is written by the gate\'s arm itself, not by a list, as four of Logitech\'s compiles with one input hold it',
  needing(skipWithoutLab(), skipWithoutIrArchive(),
    skipUnless('h350_programmed_config', 'h350_three_devices_config', 'h350_config', 'h350_issue37_config', 'h300_programmed_config')), () => {
  const { before, donor } = composed();
  // Logitech's: every gate whose arm writes one input holds the write itself, four compiles; the test setup's two
  // are a list of the writes, and the Harmony 300's none is the null instruction.
  const arms = SAMPLES.map((sample) => {
    const c = sample.load();
    return spell(c, body(c, watchTv(c)).at(-2)!).replace(/^\(register := 1 \(compare ActivityPowerState_2 op 0 /, '').replace(/\)\)$/, '');
  });
  assert.deepEqual(arms.map((arm) => (arm.startsWith('(') ? 'list' : arm === 'nothing' ? 'nothing' : 'write')),
    ['list', 'list', 'write', 'write', 'write', 'write', 'nothing']);
  // The donor's own activity puts its KPN on an input: its gate's arm is the one write.
  const gate = (c: Container, list: number) => spell(c, body(c, list).at(-2)!);
  assert.equal(gate(donor, watchTv(donor)), '(register := 1 (compare ActivityPowerState_2 op 0 KPN_Input_2 := 0))');
  // The test setup's activity with the Denon's input alone: the same shape on the Denon's variable.
  const out = composeNoScreenActivity(before, IR_ARCHIVE!, {
    devices: [{ name: 'LG TV' }, { name: 'KPN' }, { name: 'Denon', input: 'CBL/SAT', ...DENON }], channel: 'KPN',
  });
  const ours = parse(out.bytes);
  assert.equal(gate(ours, out.list), '(register := 1 (compare ActivityPowerState_2 op 0 Denon_Input_19 := 0))');
  // One list fewer than with two inputs, the list of writes, and the LG's variable not made.
  assert.equal(out.listsAdded, 28);
  assert.equal(stateVariables(ours).some((one) => one.name === 'LG_TV_Input_1'), false);
});

/** The seven compiles of the current generation and their activities' channel devices. */
const SAMPLES: { name: string; channel: string; load: () => Container; mapRule: boolean }[] = [
  { name: 'the test setup', channel: 'KPN', load: () => labFile(COMPILE), mapRule: true },
  { name: 'the test setup before its favourites', channel: 'KPN', load: () => labFile(FIRST), mapRule: true },
  { name: 'the bench 350 with four devices', channel: 'KPN', load: () => parse(require_('h350_programmed_config')), mapRule: true },
  { name: 'the bench 350 with three devices', channel: 'KPN', load: () => parse(require_('h350_three_devices_config')), mapRule: true },
  { name: 'the bench 350 as it came', channel: 'Delta', load: () => parse(require_('h350_config')), mapRule: false },
  { name: 'another owner\'s 350', channel: 'LG TV', load: () => parse(unzipped(require_('h350_issue37_config'), 'Result.EzHex')), mapRule: true },
  { name: 'the bench 300 programmed', channel: 'KPN', load: () => parse(require_('h300_programmed_config')), mapRule: true },
];

test('on seven compiles of two models, the same devices composed again give Logitech\'s power steps in Logitech\'s order and its flag, and on six its channel device\'s map',
  needing(skipWithoutLab(), skipWithoutIrArchive(),
    skipUnless('h350_programmed_config', 'h350_three_devices_config', 'h350_config', 'h350_issue37_config', 'h300_programmed_config')),
  () => {
    let compared = 0;
    let mapped = 0;
    for (const sample of SAMPLES) {
      const c = sample.load();
      const theirs = body(c, watchTv(c));
      // The devices, by their setup names, out of order: the composer orders them.
      const names = activityDevices(c).map((name) => metadataArchive(c)!.devices.find((d) => d.name.replaceAll(' ', '_') === name)!.name);
      const out = composeNoScreenActivity(c, IR_ARCHIVE!, { devices: [...names].reverse().map((name) => ({ name })), channel: sample.channel });
      const ours = parse(out.bytes);
      const mine = body(ours, out.list);
      assert.equal(mine.length, theirs.length, sample.name);
      const powerAndFlag = names.length + 1;
      assert.deepEqual(mine.slice(0, powerAndFlag).map((one) => spell(ours, one)), theirs.slice(0, powerAndFlag).map((one) => spell(c, one)),
        sample.name);
      // The gate: the null instruction here, no input being asked for.
      assert.equal(spell(ours, mine.at(-2)!), '(register := 1 (compare ActivityPowerState_2 op 0 nothing))', sample.name);
      // The map: Logitech's, which is the channel device's.
      assert.deepEqual(mine.at(-1), theirs.at(-1), sample.name);
      compared += 1;
      if (sample.mapRule) mapped += 1;
    }
    assert.equal(compared, 7);
    assert.equal(mapped, 6);
  });

test('the Harmony 300\'s compile of an older generation holds an older activity, its two power codes and waits and the map, with no register and no flag',
  needing(skipWithoutLab(), skipUnless('h300_config')), () => {
    const c = parse(require_('h300_config'));
    assert.deepEqual(steps(c).map((one) => one.replace(/send (\S+) \S+/, 'send $1')), [
      '(send Panasonic_TX-29PS11P wait Panasonic_TX-29PS11P 3)', 'wait Panasonic_TX-29PS11P 50',
      '(send Sagem_ITAD-83_SD wait Sagem_ITAD-83_SD 3)', 'wait Sagem_ITAD-83_SD 15', 'select the map of Sagem_ITAD-83_SD',
    ]);
    assert.equal(stateVariables(c).some((one) => one.name === 'ActivityPowerState_2'), false);
  });

test('every input value of five compiles runs a list of its own sending a record of one block that nothing else sends, and waits a tenth',
  needing(skipWithoutLab(),
    skipUnless('h350_programmed_config', 'h350_three_devices_config', 'h350_config', 'h350_issue37_config', 'h300_programmed_config')), () => {
    const counts: number[] = [];
    for (const sample of SAMPLES) {
      const c = sample.load();
      const lists = c.pointerArray(7)!.map((_, k) => body(c, k));
      let values = 0;
      for (const variable of stateVariables(c).filter((one) => /_Input_/.test(one.name))) {
        for (const one of stateRecords(c)![variable.index]!.values) {
          assert.equal(one.from, -2, `${sample.name} ${variable.name}`);
          const list = lists[one.operand]!;
          assert.deepEqual(list.map((x) => x.opcode), [0x07, 0x7d, 0x7c]);
          const send = list[1]!.operand;
          assert.equal(list[2]!.operand, ((send >> 8) << 8) | 1, 'a tenth, naming the same device');
          // No other list sends that record, and the record has a first block and nothing else.
          assert.equal(lists.filter((other) => other.some((x) => x.opcode === 0x7d && x.operand === send)).length, 1);
          const pointers = irHeaderPointers(c, irGroups(c)![send >> 8]!.addresses[send & 0xff]!);
          assert.deepEqual(pointers.map((p, k) => (k % 3 === 0 ? p !== 0 : p === 0)), pointers.map(() => true));
          // And the block opens with a mark, no silence in front of it: the copy's shape.
          assert.equal(pointers.filter((p, k) => k % 3 === 0 && (irBlockWords(c, p)![0]! & 0x8000) === 0).length, 0);
          values += 1;
        }
      }
      counts.push(values);
    }
    // The seven compiles in `SAMPLES`' order: the Denon's 19 twice, the KPN box's 2 twice, none on the factory
    // compile's one value television and the Harmony 300's, another owner's LG's 8.
    assert.deepEqual(counts, [19, 19, 2, 2, 0, 8, 0]);
  });

/**
 * The keys of a map that send one code of a device: a binding whose list sends that device's group once.
 * `noscreen.test.ts` explained the test setup's KPN map binding three of the key table's keys by its being the map
 * the activity ends in; this is what refutes that explanation.
 */
function ownSends(c: Container, map: number, group: number): number {
  return taggedList(c, c.pointerArray(6)![map]!)!.entries.filter((one) => {
    if (one.opcode !== 0x7f) return false;
    const sends = body(c, one.operand).filter((x) => x.opcode === 0x7d);
    return sends.length === 1 && sends[0]!.operand >> 8 === group;
  }).length;
}

test('ending in a device\'s map does not empty it: one KPN map, the same in two compiles, has 33 bindings sending one of its codes, the test setup\'s other KPN 4',
  needing(skipWithoutLab(), skipUnless('h350_three_devices_config', 'h350_programmed_config')), () => {
    const count = (c: Container) => {
      const kpn = devices(c).find((one) => one.name === 'KPN')!.group!;
      const end = body(c, watchTv(c)).at(-1)!;
      // The activity ends in the KPN's own map, the one its key selects, on all three.
      assert.equal(end.operand & 0xff, mapOfGroup(c, kpn));
      return ownSends(c, mapOfGroup(c, kpn), kpn);
    };
    const three = parse(require_('h350_three_devices_config'));
    const four = parse(require_('h350_programmed_config'));
    assert.equal(count(three), 33);
    assert.equal(count(four), 33);
    // The two are one map, the same bindings in both, so one sample; the KPN box there is another model than the
    // test setup's.
    const mapOf = (c: Container) => taggedList(c, c.pointerArray(6)![body(c, watchTv(c)).at(-1)!.operand & 0xff]!)!.entries.length;
    assert.equal(mapOf(three), 41);
    assert.equal(mapOf(four), 41);
    assert.equal(count(labFile(COMPILE)), 4);
  });

test('what no compile shows is refused: an input that steps, an input on a device whose key delay is not a tenth, a device on an input it holds a variable for, a channel device outside the activity', needsAll, () => {
  const { ours } = composed();
  const donor = parse(require_('h350_three_devices_config'));
  // The KPN of the donor holds an input variable already.
  assert.throws(() => composeNoScreenActivity(donor, IR_ARCHIVE!, {
    devices: [{ name: 'KPN', input: 'x', manufacturer: 'KPN', model: 'TV6000COK' }], channel: 'KPN',
  }), /holds an input variable already/);
  assert.throws(() => composeNoScreenActivity(donor, IR_ARCHIVE!, { devices: [{ name: 'TV' }], channel: 'KPN' }), /not one of its devices/);
  assert.throws(() => composeNoScreenActivity(donor, IR_ARCHIVE!, { devices: [{ name: 'Nobody' }], channel: 'Nobody' }), /no device called/);
  // The Sony DAV-C540 steps through its inputs with one Function code; no compile of this family has one.
  const sony = parse(composeNoScreenDevice(donor, IR_ARCHIVE!, { manufacturer: 'Sony', model: 'DAV-C540', name: 'Sony', place: 2 }).bytes);
  assert.throws(() => composeNoScreenActivity(sony, IR_ARCHIVE!, {
    devices: [{ name: 'Sony', input: 'DVD', manufacturer: 'Sony', model: 'DAV-C540' }], channel: 'Sony',
  }), /step or mix codes and states/);
  // An input on a device whose key delay is not a tenth: the Ligawo switch's is half a second.
  const ligawo = parse(composeNoScreenDevice(donor, IR_ARCHIVE!, { manufacturer: 'Ligawo', model: '3090063', name: 'Switch', place: 2 }).bytes);
  assert.throws(() => composeNoScreenActivity(ligawo, IR_ARCHIVE!, {
    devices: [{ name: 'Switch', input: 'Input 1', manufacturer: 'Ligawo', model: '3090063' }], channel: 'Switch',
  }), /key delay is 500 ms/);
  // Composing again over a composed activity's inputs is the replacement nobody has built.
  assert.throws(() => composeNoScreenActivity(ours, IR_ARCHIVE!, ACTIVITY), /holds an input variable already/);
});
