/**
 * Section 320: a device composed from Logitech's catalogue switches on and off the way their compiler
 * makes it switch, records and wiring both.
 *
 * The known answers are the six power hold compiles of sections 306 to 308, whose test devices were put
 * on the first test account's Harmony 650 and Harmony 700 records by us and compiled by Logitech's
 * service. Each test device is composed from nothing but its catalogue entry onto the Harmony 650's own
 * configuration, and what its power variable runs is compared with what the compile's runs: the
 * records sent, word for word, in order; whether an action is a step's own list or a list calling
 * several; the `0x7C` amount after each send; the power on delay the on transition ends with and the
 * inter device delay every send's prelude maps. What the compile has and the composer deliberately does
 * not, the input states a power on resets, is counted rather than ignored, and composed with the inputs
 * by the test after it, section NNN.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { IR_ARCHIVE, needing, require_, skipUnless, skipWithoutIrArchive } from '@harmony/lab';
import {
  ComposeError,
  type Container,
  DEVICE_QUANTITY_DEFAULT,
  INTER_DEVICE_DELAY_DEFAULT,
  POWER_ON_DELAY_DEFAULT,
  catalogueCommands,
  catalogueDevice,
  catalogueDevicePower,
  composeCatalogueDevice,
  catalogueDriving,
  composeDevice,
  deviceDriving,
  deviceVariables,
  irBlockWords,
  irGroups,
  irHeaderPointers,
  parse,
  payloadOf,
  stateRecords,
} from '../src/index.ts';

const CALL = 0x7f;
const SEND = 0x7d;
const QUANTITY = 0x7c;
const MAP_VALUE = 0x72;

/** One test device of one compile: the label the compile gave it and its catalogue entry. */
type Row = { fixture: string; name: string; slug: string; file: string };
const row = (fixture: string, name: string, slug: string, file: string): Row => ({ fixture, name, slug, file });
/**
 * Every test device of the six compiles, 18 instances of 16 catalogue devices. The 650's own television
 * is `Panasonic_TV` there and is the TX-P42GT30E, section 306; the account's other devices, the LG, the
 * KPN box, the Denon, the PS3 and Kodi, were not put there by us and their catalogue entries are not
 * pinned, so they are not rows.
 */
const ROWS: readonly Row[] = [
  row('h650_power_hold_compile', 'Panasonic_TX-29AK40F', 'Panasonic', 'TX-29AK40F'),
  row('h650_power_hold_compile', 'Panasonic_TV', 'Panasonic', 'TX-P42GT30E'),
  row('h650_power_hold_compile', 'Knoll_HDP-1100', 'Knoll', 'HDP-1100'),
  row('h650_power_hold_compile_2', 'Dell_2300MP', 'Dell', '2300MP'),
  row('h650_power_hold_compile_2', 'Panasonic_TV', 'Panasonic', 'TX-P42GT30E'),
  row('h650_power_hold_compile_2', 'Panasonic_TX-28A1U', 'Panasonic', 'TX-28A1U'),
  row('h700_power_hold_compile', 'Barco_6300', 'Barco', '6300'),
  row('h700_power_hold_compile', 'JVC_DLA-HD10KU', 'JVC', 'DLA-HD10KU'),
  row('h700_power_hold_compile', 'Panasonic_TX-P42GT30E', 'Panasonic', 'TX-P42GT30E'),
  row('h700_power_hold_compile_2', 'Pioneer_DEH-P47DH', 'Pioneer', 'DEH-P47DH'),
  row('h700_power_hold_compile_2', 'Mivar_14_M3_TVD', 'Mivar', '14_M3_TVD'),
  row('h700_power_hold_compile_2', 'Thomson_DSI-4400', 'Thomson', 'DSI-4400'),
  row('h700_power_hold_compile_3', 'Panasonic_TH-42PA30', 'Panasonic', 'TH-42PA30'),
  row('h700_power_hold_compile_3', 'Quasar_SP2717T', 'Quasar', 'SP2717T'),
  row('h700_power_hold_compile_3', 'Panasonic_CS-29FJ20S', 'Panasonic', 'CS-29FJ20S'),
  row('h700_power_hold_compile_4', 'Panasonic_TX-D37LT84F', 'Panasonic', 'TX-D37LT84F'),
  row('h700_power_hold_compile_4', 'Sony_KE-50MR1E', 'Sony', 'KE-50MR1E'),
  row('h700_power_hold_compile_4', 'Thomson_25DT60H', 'Thomson', '25DT60H'),
];
const FIXTURES = [...new Set(ROWS.map((one) => one.fixture))];

/** One send of a power action, as everything about it that the comparison looks at. */
type Sent = { words: string; held: number; tail: number; amount: number; interDevice: number };
/**
 * A power transition read whole: how it is shaped, what it sends in order, and what follows. `layout` is
 * the transition list's calls in order, `S` a send list, `D` the power on delay, `T` an input state.
 */
type Action = { shape: 'direct' | 'calling'; sends: Sent[]; powerOnDelay?: number; states: number; layout: string };

/**
 * Read what one transition runs. A send list is `[0x7F prelude, 0x7D, 0x7C]` on arch 14: its prelude
 * loads 1, calls a condition, which calls the device's delay list, one `0x72` naming the inter device
 * delay variable, whose first value is the delay. A transition's list is either a send list itself,
 * `direct`, or a list of calls, `calling`, to send lists, to the power on delay list, one `0x72`, and to
 * the input state lists Logitech's compile adds after it, counted as `states`.
 */
function actionOf(c: Container, list: number): Action {
  const lists = c.actionLists()!;
  const firstOf = stateRecords(c)!;
  const sends = (index: number) => lists[index]!.some((one) => one.opcode === SEND);
  const mapped = (index: number) => {
    const only = lists[index]!;
    return only.length === 1 && only[0]!.opcode === MAP_VALUE ? firstOf[only[0]!.operand & 0xff]!.first : undefined;
  };
  const sentBy = (index: number): Sent => {
    const body = lists[index]!;
    const send = body.find((one) => one.opcode === SEND)!;
    const amount = body.find((one) => one.opcode === QUANTITY)!;
    assert.equal(amount.operand >> 8, send.operand >> 8, 'the 0x7C names the device the send does');
    const load = lists[body[0]!.operand]!;
    const condition = lists[load.find((one) => one.opcode === CALL)!.operand]!;
    const interDevice = mapped(condition.find((one) => one.opcode === CALL)!.operand)!;
    const [once, held, tail] = irHeaderPointers(c, irGroups(c)![send.operand >> 8]!.addresses[send.operand & 0xff]!);
    return { words: irBlockWords(c, once!)!.join(','), held: held!, tail: tail!, amount: amount.operand & 0xff, interDevice };
  };
  if (sends(list)) return { shape: 'direct', sends: [sentBy(list)], states: 0, layout: 'S' };
  const action: Action = { shape: 'calling', sends: [], states: 0, layout: '' };
  for (const one of lists[list]!) {
    assert.equal(one.opcode, CALL, `list ${list} is a list of calls`);
    if (sends(one.operand)) {
      action.sends.push(sentBy(one.operand));
      action.layout += 'S';
    } else if (mapped(one.operand) !== undefined) {
      action.powerOnDelay = mapped(one.operand)!;
      action.layout += 'D';
    } else {
      action.states += 1;
      action.layout += 'T';
    }
  }
  return action;
}

/** The group of the first send a list reaches, through its calls. */
function groupOf(c: Container, list: number, seen = new Set<number>()): number | undefined {
  if (seen.has(list)) return undefined;
  seen.add(list);
  for (const one of c.actionLists()![list]!) {
    if (one.opcode === SEND) return one.operand >> 8;
    if (one.opcode === CALL) {
      const found = groupOf(c, one.operand, seen);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

/** A device's two transitions, by the variable named `<label>_Power`. */
function powerOf(c: Container, variable: number): { on: Action; off: Action } {
  const values = stateRecords(c)![variable]!.values;
  const on = values.find((one) => one.from === 0 && one.to === 1)!;
  const off = values.find((one) => one.from === 1 && one.to === 0)!;
  assert.equal(on.opcode, CALL);
  assert.equal(off.opcode, CALL);
  return { on: actionOf(c, on.operand), off: actionOf(c, off.operand) };
}

test('a device composed from the catalogue switches with the records and the wiring Logitech compiles for it, on 17 of the 18 test device instances',
  needing(skipWithoutIrArchive(), skipUnless('h650_config_region', ...FIXTURES)), () => {
    const pristine = parse(require_('h650_config_region'));
    const compiles = new Map(FIXTURES.map((name) => [name, parse(payloadOf(require_(name)))]));
    const seen: string[] = [];
    const refused: string[] = [];
    // Agreement counted both ways: each record our transitions send found at the same place in theirs,
    // and each of theirs found at the same place in ours, over both transitions of every device.
    let oursInTheirs = 0;
    let theirsInOurs = 0;
    let ours = 0;
    let theirs = 0;
    let statesNotComposed = 0;
    // The control: what the composer before section 320 would have got wrong on the same transitions,
    // counted off Logitech's side alone, since it gave every send a 0x7C amount of 1, every device an
    // inter device delay of 5 and a power on delay of 15, and every action one step.
    const before = { amount: 0, interDevice: 0, powerOnDelay: 0, several: 0 };
    for (const one of ROWS) {
      const driving = catalogueDriving(IR_ARCHIVE!, one.slug, one.file);
      const codes = new Map<string, string>();
      const device = catalogueDevice(IR_ARCHIVE!, one.slug, one.file);
      for (const command of catalogueCommands(IR_ARCHIVE!, device.codeset!)) {
        if (!codes.has(command.name)) codes.set(command.name, command.keycode);
      }
      const power = catalogueDevicePower(driving, (name) => codes.get(name));
      // The device's commands are its power commands' ordinary presses, which is all this compares.
      const names = [...new Set([...power.onCommands, ...power.offCommands])];
      let composed;
      try {
        composed = composeDevice(pristine, {
          label: 'Test', commands: names.map((name) => ({ stated: codes.get(name)!, held: false })), power: 0,
          powerOn: power.powerOn, powerOff: power.powerOff, interKeyDelay: power.interKeyDelay,
          interDeviceDelay: power.interDeviceDelay, ...(power.powerOnDelay === undefined ? {} : { powerOnDelay: power.powerOnDelay }),
        });
      } catch (error) {
        assert.ok(error instanceof ComposeError, String(error));
        refused.push(`${one.name}: ${error.message}`);
        continue;
      }
      const mine = powerOf(parse(composed.bytes), composed.variable);
      const compile = compiles.get(one.fixture)!;
      const variable = deviceVariables(compile).find((each) => each.device === one.name && each.property === 'Power')!;
      const logitech = powerOf(compile, variable.index);
      for (const which of ['on', 'off'] as const) {
        const a = mine[which];
        const b = logitech[which];
        ours += a.sends.length;
        theirs += b.sends.length;
        oursInTheirs += a.sends.filter((sent, k) => sent.words === b.sends[k]?.words).length;
        theirsInOurs += b.sends.filter((sent, k) => sent.words === a.sends[k]?.words).length;
        // Everything else, field for field: the shape, the delays, the amounts, no held or tail block.
        assert.equal(a.shape, b.shape, `${one.name} ${which}: shape`);
        assert.equal(a.layout, b.layout.replaceAll('T', ''), `${one.name} ${which}: order of the calls`);
        assert.match(b.layout, /^[SD]*T*$/, `${one.name} ${which}: the input states come last`);
        assert.deepEqual(a.sends, b.sends, `${one.name} ${which}: what is sent`);
        assert.equal(a.powerOnDelay, b.powerOnDelay, `${one.name} ${which}: power on delay`);
        // The input states a power on resets are one list per state the catalogue's `onReset` names,
        // after the power on delay. This composes no inputs, so ours has none; the test below composes
        // them with the inputs and compares them with Logitech's.
        assert.equal(a.states, 0);
        assert.equal(b.states, which === 'on' ? power.onResetStates : 0, `${one.name} ${which}: reset states`);
        statesNotComposed += b.states;
        before.amount += b.sends.filter((sent) => sent.amount !== DEVICE_QUANTITY_DEFAULT).length;
        before.interDevice += b.sends.filter((sent) => sent.interDevice !== INTER_DEVICE_DELAY_DEFAULT).length;
        if (b.powerOnDelay !== undefined && b.powerOnDelay !== POWER_ON_DELAY_DEFAULT) before.powerOnDelay += 1;
        if (b.sends.length > 1) before.several += 1;
      }
      seen.push(`${one.name} ${power.type} on ${mine.on.sends.length} off ${mine.off.sends.length}`);
    }
    assert.deepEqual(seen, [
      'Panasonic_TX-29AK40F toggle on 1 off 1', 'Panasonic_TV discrete on 1 off 1', 'Knoll_HDP-1100 discrete on 1 off 3',
      'Dell_2300MP toggle on 1 off 1', 'Panasonic_TV discrete on 1 off 1',
      'Barco_6300 discrete on 1 off 1', 'JVC_DLA-HD10KU discrete on 1 off 1', 'Panasonic_TX-P42GT30E discrete on 1 off 1',
      'Pioneer_DEH-P47DH toggle on 1 off 1', 'Mivar_14_M3_TVD discrete on 1 off 1', 'Thomson_DSI-4400 toggle on 1 off 1',
      'Panasonic_TH-42PA30 discrete on 1 off 1', 'Quasar_SP2717T toggle on 1 off 1', 'Panasonic_CS-29FJ20S toggle on 1 off 1',
      'Panasonic_TX-D37LT84F discrete on 1 off 1', 'Sony_KE-50MR1E discrete on 1 off 1', 'Thomson_25DT60H discrete on 1 off 1',
    ]);
    // The Technics family states no press block, section 309, so its toggle cannot be built at all.
    assert.deepEqual(refused, ['Panasonic_TX-28A1U: Technics 22 Bit has no measured whole block, so nothing can be sent']);
    assert.deepEqual({ ours, theirs, oursInTheirs, theirsInOurs }, { ours: 36, theirs: 36, oursInTheirs: 36, theirsInOurs: 36 });
    // TX-29AK40F 2, TV 1 twice, TX-P42GT30E 1, TH-42PA30 4, Quasar 1, Sony 1, 25DT60H 2.
    assert.equal(statesNotComposed, 13);
    // So the defaults alone would have sent a wrong 0x7C amount on 18 of the 36 sends, a wrong inter
    // device delay on 14 and a wrong power on delay on 11 of the 17 devices, and one action, the
    // Knoll's off, would have been one send of three.
    assert.deepEqual(before, { amount: 18, interDevice: 14, powerOnDelay: 11, several: 1 });
  });

/**
 * Section NNN: the states a power on puts back, `power.onReset`, composed the way Logitech's compiler
 * writes them. A device is composed whole from its catalogue entry, power steps and inputs, by
 * `composeCatalogueDevice` as `compose-device.ts --inputs` does, and the calls its power on list makes
 * after the power on delay are compared with Logitech's, as the variable's property word, the value and
 * whether the write is silent, so that no variable number has to agree. The TX-28A1U is the one device
 * whose power cannot be built, the test above; its reset is counted as not compared.
 */
test('the states a power on resets are composed as Logitech compiles them, silent and in order, on all 13 reset lists of the 8 instances that compose',
  needing(skipWithoutIrArchive(), skipUnless('h650_config_region', ...FIXTURES)), () => {
    const pristine = parse(require_('h650_config_region'));
    /** The calls after the power on delay, read as `<property>=<value>` with `silent ` in front where flagged. */
    const resetsOf = (c: Container, label: string): string[] => {
      const lists = c.actionLists()!;
      const names = new Map(deviceVariables(c).map((one) => [one.index, one.property]));
      const variable = deviceVariables(c).find((one) => one.device === label && one.property === 'Power')!;
      const on = stateRecords(c)![variable.index]!.values.find((one) => one.from === 0 && one.to === 1)!;
      const calls = lists[on.operand]!;
      // Everything after the power on delay, which is the one call to a single `0x72` list.
      const delay = calls.findIndex((one) => lists[one.operand]!.length === 1 && lists[one.operand]![0]!.opcode === MAP_VALUE);
      assert.ok(delay >= 0, `${label}: the power on list holds the power on delay`);
      return calls.slice(delay + 1).map((one) => {
        const body = lists[one.operand]!;
        assert.equal(body.length, 2, `${label}: a reset list is two instructions`);
        const silent = body[0]!.opcode === 0x07 && body[0]!.operand === 0xffff;
        const write = body[1]!;
        assert.ok(write.opcode >= 0x80, `${label}: a reset list writes a state`);
        return `${silent ? 'silent ' : ''}${names.get(write.opcode - 0x80)}=${write.operand}`;
      });
    };
    const results: Record<string, string> = {};
    const undeclared: string[] = [];
    let lists = 0;
    for (const one of ROWS) {
      const driving = catalogueDriving(IR_ARCHIVE!, one.slug, one.file);
      const theirs = resetsOf(parse(payloadOf(require_(one.fixture))), one.name);
      const key = `${one.fixture} ${one.name}`;
      let composed;
      try {
        // One screen command, the first power step under a short label, since the screen is not what this compares.
        const codes = new Map(catalogueCommands(IR_ARCHIVE!, catalogueDevice(IR_ARCHIVE!, one.slug, one.file).codeset!)
          .map((command) => [command.name, command.keycode]));
        const first = catalogueDevicePower(driving, (name) => codes.get(name)).onCommands[0]!;
        composed = composeCatalogueDevice(pristine, IR_ARCHIVE!, {
          manufacturer: one.slug, model: one.file, label: 'Test', commands: [first], labels: ['On'], inputs: true,
        });
      } catch (error) {
        assert.ok(error instanceof ComposeError, String(error));
        results[key] = `refused, theirs ${theirs.length}: ${error.message}`;
        continue;
      }
      const ours = resetsOf(parse(composed.bytes), 'Test');
      assert.deepEqual(ours, theirs, key);
      assert.deepEqual(composed.inputs?.resetsLeftOut ?? [], [], `${key}: nothing left out`);
      undeclared.push(...(composed.inputs?.resets ?? []).filter((r) => !r.declared).map((r) => `${one.name} ${r.state} ${r.named}`));
      lists += theirs.length;
      results[key] = theirs.join(' ') || '-';
    }
    assert.deepEqual(results, {
      'h650_power_hold_compile Panasonic_TX-29AK40F': 'silent Input=0 silent OnScreenMenu=0',
      'h650_power_hold_compile Panasonic_TV': 'silent InputType=7',
      'h650_power_hold_compile Knoll_HDP-1100': '-',
      'h650_power_hold_compile_2 Dell_2300MP': '-',
      'h650_power_hold_compile_2 Panasonic_TV': 'silent InputType=7',
      // The Technics family has no press block, so its codes do not compose; Logitech's compile has one reset.
      'h650_power_hold_compile_2 Panasonic_TX-28A1U': 'refused, theirs 1: the inputs send TvVideo, whose code does not compose',
      'h700_power_hold_compile Barco_6300': '-',
      'h700_power_hold_compile JVC_DLA-HD10KU': '-',
      'h700_power_hold_compile Panasonic_TX-P42GT30E': 'silent InputType=7',
      'h700_power_hold_compile_2 Pioneer_DEH-P47DH': '-',
      'h700_power_hold_compile_2 Mivar_14_M3_TVD': '-',
      'h700_power_hold_compile_2 Thomson_DSI-4400': '-',
      'h700_power_hold_compile_3 Panasonic_TH-42PA30': 'silent Input=0 silent AV1Scart=0 silent AV2Scart=0 silent AV4Scart=0',
      'h700_power_hold_compile_3 Quasar_SP2717T': 'silent Input=0',
      'h700_power_hold_compile_3 Panasonic_CS-29FJ20S': '-',
      'h700_power_hold_compile_4 Panasonic_TX-D37LT84F': '-',
      'h700_power_hold_compile_4 Sony_KE-50MR1E': 'silent Input=0',
      'h700_power_hold_compile_4 Thomson_25DT60H': 'silent InputType=0 silent Input=0',
    });
    assert.equal(lists, 13);
    // Two resets name a value their variable does not declare, and Logitech's compile writes 0 for both.
    assert.deepEqual(undeclared, ['Panasonic_TX-29AK40F Input TunerMode', 'Quasar_SP2717T Input True']);
  });

/**
 * What the `0x7C` after a send carries, over every send list Logitech compiled for a test device and not
 * only its power lists: 1, the catalogue's inter key delay or its input delay, in tenths. What this
 * asserts is the counts per value and that no list carries a fourth value, and nothing about which
 * command a list sends. That was read off the catalogue while measuring, by the number each record
 * decodes to, and is written beside the counts as a reading rather than a claim: section 320 says
 * which part of it is unexplained. All 18 instances, the
 * Technics television's included, since nothing about this needs the composer. `composeDevice` gives its
 * ordinary commands 1 and its power steps the inter key delay, and does not compose digits or inputs yet.
 */
test('a send list Logitech compiled for a test device carries 1, the inter key delay or the input delay, and nothing else',
  needing(skipWithoutIrArchive(), skipUnless(...FIXTURES)), () => {
    const seen: string[] = [];
    for (const one of ROWS) {
      const c = parse(payloadOf(require_(one.fixture)));
      const variable = deviceVariables(c).find((each) => each.device === one.name && each.property === 'Power')!;
      // The device's group, read off what its power variable sends rather than off a name.
      const off = stateRecords(c)![variable.index]!.values.find((each) => each.from === 1 && each.to === 0)!;
      const group = groupOf(c, off.operand);
      assert.ok(group !== undefined, `${one.name} has a power off that sends`);
      const timing = catalogueDriving(IR_ARCHIVE!, one.slug, one.file).timing;
      const meaning = new Map([[timing.inputDelay / 100, 'input'], [timing.interKeyDelay / 100, 'key'], [1, 'press']]);
      const count = new Map<string, number>();
      for (const body of c.actionLists()!) {
        const send = body.find((each) => each.opcode === SEND);
        if (send === undefined || send.operand >> 8 !== group) continue;
        const amount = body.find((each) => each.opcode === QUANTITY)!;
        assert.equal(amount.operand >> 8, group, `${one.name}: the 0x7C names the device`);
        const what = meaning.get(amount.operand & 0xff);
        assert.ok(what !== undefined, `${one.name}: an amount of ${amount.operand & 0xff}`);
        count.set(what, (count.get(what) ?? 0) + 1);
      }
      seen.push(`${one.name} ${['press', 'key', 'input'].map((what) => count.get(what) ?? 0).join(' ')}`);
    }
    // press, key, input. Where the inter key delay is 1 the key lists count as presses, and on the Knoll,
    // the JVC, the Mivar, the TH-42PA30 and the TX-P42GT30E that is every list. Read while measuring and
    // not asserted: the key lists are the power steps and, where the count is 11 or 12, an uncalled second
    // list per digit 0 to 9 as well, which the Barco and the Pioneer do not get; the input lists are second
    // lists for the TX-29AK40F's Red, the TX-28A1U's TvVideo and the Sony's nine inputs.
    assert.deepEqual(seen, [
      'Panasonic_TX-29AK40F 65 0 1', 'Panasonic_TV 85 0 0', 'Knoll_HDP-1100 14 0 0',
      'Dell_2300MP 34 1 0', 'Panasonic_TV 85 0 0', 'Panasonic_TX-28A1U 27 11 1',
      'Barco_6300 32 2 0', 'JVC_DLA-HD10KU 17 0 0', 'Panasonic_TX-P42GT30E 85 0 0',
      'Pioneer_DEH-P47DH 51 1 0', 'Mivar_14_M3_TVD 32 0 0', 'Thomson_DSI-4400 37 11 0',
      'Panasonic_TH-42PA30 62 0 0', 'Quasar_SP2717T 49 11 0', 'Panasonic_CS-29FJ20S 75 11 0',
      'Panasonic_TX-D37LT84F 49 12 0', 'Sony_KE-50MR1E 129 12 9', 'Thomson_25DT60H 23 12 0',
    ]);
  });

/** A minimal version 2 record's timing, made up, as `driving.test.ts` makes one. */
const TIMING = {
  interKeyDelay: 500, interDeviceDelay: 100, holdInterDeviceDelay: 0, powerOnDelay: 2500, inputDelay: 0,
  connectedAppPowerOnDelay: 0, pressMinRepeats: 3, isInterKeyDelayOptimized: false,
};
const KEYS = new Map([['PowerOn', 'G:X:(0x1)():3'], ['PowerOff', 'G:X:(0x2)():3'], ['PowerToggle', 'G:X:(0x3)():3']]);
const read = (power: unknown, timing: object = TIMING) =>
  catalogueDevicePower(deviceDriving(power === undefined ? { timing } : { timing, power }), (name) => KEYS.get(name));

/**
 * The mapping on records made up here, which need no checkout: a toggle is one action used both ways, a
 * held step keeps its hold, several steps stay in order, the three delays come out in tenths, and every
 * statement no compile shows composed is refused rather than guessed at.
 */
test('the catalogue\'s power and delays read as the composer\'s options, and what no compile shows is refused', () => {
  const toggle = read({ type: 'toggle', toggle: [{ command: 'PowerToggle', durationMs: 1500 }] });
  assert.deepEqual(toggle.powerOn, [{ stated: KEYS.get('PowerToggle'), holdMs: 1500 }]);
  assert.equal(toggle.powerOff, toggle.powerOn);
  assert.deepEqual([toggle.powerOnDelay, toggle.interDeviceDelay, toggle.interKeyDelay], [25, 1, 5]);
  const discrete = read({
    type: 'discrete', on: ['PowerOn'], off: [{ command: 'PowerOff', durationMs: 500 }, 'PowerOff'],
    onReset: [{ set: 'Input', to: 'TV' }, { set: 'Mode', to: 'On' }],
  });
  assert.deepEqual(discrete.powerOn, [{ stated: KEYS.get('PowerOn') }]);
  assert.deepEqual(discrete.offCommands, ['PowerOff', 'PowerOff']);
  assert.deepEqual(discrete.powerOff, [{ stated: KEYS.get('PowerOff'), holdMs: 500 }, { stated: KEYS.get('PowerOff') }]);
  assert.equal(discrete.onResetStates, 2);
  const { powerOnDelay: _unused, ...noDelay } = TIMING;
  assert.equal('powerOnDelay' in read({ type: 'toggle', toggle: ['PowerToggle'] }, noDelay), false);

  const refusals: [unknown, RegExp, object?][] = [
    [undefined, /as absent/], [{ type: 'none' }, /as none/], [{ type: 'unknown' }, /as unknown/],
    [{ type: 'discrete', on: ['PowerOn'] }, /no power off action/],
    [{ type: 'toggle', toggle: ['PowerToggle'], off: ['PowerOff'] }, /also states/],
    [{ type: 'toggle', toggle: ['PowerToggle', { delayMs: 500 }, 'PowerToggle'] }, /holds a wait/],
    [{ type: 'toggle', toggle: [{ hold: 'PowerToggle' }] }, /unstated time/],
    [{ type: 'discrete', on: [{ set: 'Input', to: 'TV' }, 'PowerOn'], off: ['PowerOff'] }, /holds a state/],
    [{ type: 'toggle', toggle: ['Eject'] }, /sends Eject, which the codeset lacks/],
    [{ type: 'toggle', toggle: [] }, /no steps/],
    [{ type: 'toggle', toggle: ['PowerToggle'], onReset: ['PowerOn'] }, /followed by a send/],
    [{ type: 'toggle', toggle: ['PowerToggle'] }, /power on delay of 2250 ms/, { ...TIMING, powerOnDelay: 2250 }],
    [{ type: 'toggle', toggle: ['PowerToggle'] }, /inter device delay of 50 ms/, { ...TIMING, interDeviceDelay: 50 }],
  ];
  for (const [power, why, timing] of refusals) {
    assert.throws(() => read(power, timing ?? TIMING),
      (error: unknown) => error instanceof ComposeError && why.test(error.message), String(why));
  }
});

/**
 * An action of several steps, on the two architectures whose power variable the composer shapes
 * differently. On the Harmony 650 the on transition calls each step and then the power on delay, and a
 * list of its own calling the steps is what a device page's key gets; on the Harmony One, which has no
 * power on delay list, that list is what the on transition runs. The off action of three is one list
 * calling one step's send list three times, which is the shape of the Knoll's off in Logitech's compile.
 * The on half has no compile behind it: the shape is inferred, section 320.
 */
test('a power action of several steps is a list calling each step in order, on the Harmony 650 and the Harmony One',
  skipUnless('h650_config_region', 'one_config'), () => {
    const ON = 'G:Toshiba 32 Bit:(0x20DF23DC)(Repeat)():3';
    const OFF = 'G:Toshiba 32 Bit:(0x20DFA35C)(Repeat)():3';
    for (const host of ['h650_config_region', 'one_config'] as const) {
      const before = parse(require_(host));
      const held = { stated: OFF, holdMs: 500 };
      const device = composeDevice(before, {
        label: 'Several', commands: [{ stated: ON, held: false }], power: 0, interKeyDelay: 4,
        powerOn: [{ stated: ON }, held], powerOff: [held, held, held],
      });
      const after = parse(device.bytes);
      const lists = after.actionLists()!;
      const calls = (list: number) => lists[list]!.map((one) => (one.opcode === CALL ? one.operand : -1));
      const sendOf = (list: number) => lists[list]!.find((one) => one.opcode === SEND)!.operand & 0xff;
      const amountOf = (list: number) => lists[list]!.find((one) => one.opcode === QUANTITY)!.operand & 0xff;
      // Two distinct steps, so three records: the command's press, then the on step, then the held one.
      assert.equal(irGroups(after)![device.group]!.addresses.length, 3, host);
      const onAction = calls(device.powerSteps!.on!);
      const offAction = calls(device.powerSteps!.off!);
      assert.deepEqual(onAction.map(sendOf), [1, 2], `${host}: the on action's steps in order`);
      assert.deepEqual(offAction.map(sendOf), [2, 2, 2], `${host}: one record called three times`);
      assert.equal(new Set(offAction).size, 1, `${host}: and one send list`);
      assert.deepEqual([...onAction, ...offAction].map(amountOf), [4, 4, 4, 4, 4], `${host}: the steps carry the inter key delay`);
      assert.equal(amountOf(device.lists[0]!), 1, `${host}: an ordinary press carries 1`);
      const values = stateRecords(after)![device.variable]!.values;
      const on = values.find((one) => one.from === 0 && one.to === 1)!.operand;
      const off = values.find((one) => one.from === 1 && one.to === 0)!.operand;
      assert.equal(off, device.powerSteps!.off, `${host}: the off transition runs the off action`);
      if (host === 'h650_config_region') {
        assert.deepEqual(calls(on), [...onAction, device.powerOnDelay!.list], `${host}: on calls the steps, then the delay`);
      } else {
        assert.equal(on, device.powerSteps!.on, `${host}: with no delay list, on runs the on action`);
      }
    }
  });

/**
 * How much of the catalogue the mapping takes, over every record of the archive, and every refusal by
 * its reason. Exact counts, so a reader change or an archive change moves them in the diff.
 */
test('the mapping takes the power of 235572 of the archive\'s 276236 devices, and every refusal is counted by its reason',
  skipWithoutIrArchive(), () => {
    const outcomes = new Map<string, number>();
    let several = 0;
    let held = 0;
    // The commonest shape among the devices refused for a wait: discrete, a power on with no wait in
    // it and a power off with one. A compile of one of these is the next calibration this needs.
    let waitInOffOnly = 0;
    const root = join(IR_ARCHIVE!, 'devices');
    for (const slug of readdirSync(root)) {
      for (const file of readdirSync(join(root, slug))) {
        if (file === 'index.json') continue;
        const driving = deviceDriving(JSON.parse(readFileSync(join(root, slug, file), 'utf8')));
        let outcome = 'accepted';
        try {
          // Any code will do: the mapping passes it through, and this counts shapes, not codes.
          const power = catalogueDevicePower(driving, () => 'G:X:(0x1)():3');
          if (power.powerOn.length > 1 || power.powerOff.length > 1) several += 1;
          if ([...power.powerOn, ...power.powerOff].some((step) => step.holdMs !== undefined)) held += 1;
        } catch (error) {
          assert.ok(error instanceof ComposeError, String(error));
          outcome = error.message.replace(/\d+ ms/, 'N ms').replace(/power (on|off|toggle) action holds/, 'action holds')
            .replace(/, .*/, '');
          const power = driving.power;
          const waits = (steps: readonly { kind: string }[] | undefined) => steps?.some((step) => step.kind === 'wait') === true;
          if (outcome === 'the catalogue\'s action holds a wait' && power?.type === 'discrete'
            && !waits(power.on) && waits(power.off)) waitInOffOnly += 1;
        }
        outcomes.set(outcome, (outcomes.get(outcome) ?? 0) + 1);
      }
    }
    assert.deepEqual(Object.fromEntries(outcomes), {
      'accepted': 235572,
      // No power action at all, 35716 between them, which no compile here shows composed.
      'the catalogue states the power as absent': 35409,
      'the catalogue states the power as unknown': 304,
      'the catalogue states the power as none': 3,
      // An action this does not know how to compose, for want of a compile holding one. Of the 2993
      // refused for a wait, the commonest shape is asserted below as waitInOffOnly.
      'the catalogue\'s action holds a wait': 2993,
      'the catalogue\'s action holds a state': 66,
      'the catalogue\'s action holds a press held for an unstated time': 5,
      'the catalogue\'s power on is followed by a send': 89,
      'the catalogue\'s power on is followed by a wait': 2,
      // Statements that are incomplete or ambiguous.
      'a toggle device with no toggle action': 1321,
      'a discrete device with no power on action': 302,
      'a discrete device with no power off action': 17,
      'a toggle device that also states a power on or off action': 32,
      // Delays a configuration cannot state, counted where nothing above refused the device first.
      'the catalogue\'s power on delay of N ms is not a whole number of tenths of a second': 118,
      'the catalogue\'s inter device delay of N ms is not a whole number of tenths of a second': 3,
    });
    assert.equal([...outcomes.values()].reduce((sum, n) => sum + n, 0), 276236);
    assert.deepEqual({ several, held, waitInOffOnly }, { several: 2868, held: 2938, waitInOffOnly: 1655 });
  });
