/**
 * Section 321: a device's inputs on the Harmony 600, 650 and 700, read off Logitech's compiles and
 * composed from Logitech's catalogue.
 *
 * Four kinds of claim, in the order they were established:
 *
 * - **What the compiler writes**, measured over every arch 14 configuration Logitech compiled that the
 *   lab holds: the input variable and the device's state variables, how each value is reached, and
 *   how an activity's start sets them. Written before anything was composed.
 * - **The plan's rules**, on made up catalogue records, which need no checkout and are not the
 *   archive's JSON, per decision 15: what each catalogue shape becomes and what is refused.
 * - **The calibration**: ten devices Logitech compiled, composed again from the catalogue alone and
 *   compared with Logitech's transition for transition, with every divergence counted by name, and an
 *   eleventh compared at the plan.
 * - **An activity sets an input**, todo 3.6: the start of a composed activity writes the input value
 *   between the power writes, in Logitech's order.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { IR_ARCHIVE, needing, require_, skipUnless, skipWithoutIrArchive } from '@harmony/lab';
import {
  ACTIVITY_STATE_NAME, ComposeError, catalogueCommands, catalogueDevice, catalogueDriving, codeKey,
  commandIndex, composeActivity, composeDevice, composeDeviceInputs, deviceDriving, deviceStateMachines,
  deviceVariables, devices, handlerSets, inputPlan, inputTarget, irGroups, joinPowerOff,
  activityStartTargets, parse, payloadOf, stateVariables, taggedList,
  type Container, type HeldStep, type HeldVariable, type InputPlan,
} from '../src/index.ts';
import { irFrame } from '../src/irframe.ts';

/** Every arch 14 configuration Logitech compiled that the lab holds, as `compose.test.ts` lists them. */
const ARCH14 = ['h650_config_region', 'h650_panasonic_config', 'h600_config', 'calibration_h600',
                'h700_config', 'h700_config_2', 'h700_28_config_region',
                'h650_power_hold_compile', 'h650_power_hold_compile_2', 'h700_power_hold_compile',
                'h700_power_hold_compile_2', 'h700_power_hold_compile_3',
                'h700_power_hold_compile_4'] as const;

/** A compile as the lab holds it: a bare container, or one inside Logitech's EZHex wrapping. */
function open(name: string): Container {
  const bytes = require_(name);
  try { return parse(bytes); } catch { return parse(payloadOf(bytes)); }
}

/** A device state variable that is neither its power nor the connected app machinery. */
const IS_STATE = (property: string): boolean =>
  property !== 'Power' && property !== 'Input' && property !== 'OnlinePower' && !/Delay/.test(property);

test('every arch 14 input variable is reached by value or by stepping, and every state of a device with one the same way',
     skipUnless(...ARCH14), () => {
  // Counted per configuration, so a device the test account compiled into eight configurations counts
  // eight times: the population is the containers, not the models.
  const tally = new Map<string, number>();
  const bump = (key: string, by = 1): void => { tally.set(key, (tally.get(key) ?? 0) + by); };
  for (const name of ARCH14) {
    const c = open(name);
    const records = new Map(stateVariables(c).map((one) => [one.index, one.record]));
    const held = new Map<string, HeldVariable[]>();
    const machines = (label: string): HeldVariable[] => {
      if (!held.has(label)) held.set(label, deviceStateMachines(c, label));
      return held.get(label)!;
    };
    const all = deviceVariables(c);
    for (const label of new Set(all.map((one) => one.device))) {
      const mine = all.filter((one) => one.device === label);
      const input = mine.find((one) => one.property === 'Input');
      const states = mine.filter((one) => IS_STATE(one.property));
      if (input === undefined) {
        bump('device without an input variable');
        if (states.length > 0) bump('device without an input variable and with states');
        continue;
      }
      for (const one of [input, ...states]) {
        const record = records.get(one.index)!;
        const kind = one === input ? 'input' : 'state';
        const values = record.second + 1;
        bump(`${kind} variable`);
        bump(`${kind} values`, values);
        if (record.first !== 0) bump(`${kind} starting anywhere but 0`);
        const tos = record.values.map((t) => t.to);
        const byValue = record.values.length === new Set(tos).size && tos.every((to) => to >= 0 && to < values)
          && record.values.every((t) => t.from === -2 || t.from === -3);
        const stepping = record.values.length === values * (values - 1)
          && record.values.every((t) => t.from >= 0 && t.from < values && t.from !== t.to);
        if (byValue && record.values.length > 0) {
          bump(`${kind} by value`);
          // The input layer has a transition for every value; a state can leave a value unreachable,
          // the TX-29AK40F's OnScreenMenu False, which its catalogue entry states no commands for.
          if (one === input) assert.equal(record.values.length, values, `${name} ${one.device} input`);
          for (const t of record.values) bump(`${kind} from ${t.from}`);
        } else if (stepping) {
          bump(`${kind} stepping`);
          if (values === 1) bump(`${kind} stepping over one value`);
          // Stepping from i to j is the one step transition repeated (j - i) mod n times: the body of
          // every transition is the forward step's body that many times over, wrapping round.
          const variable = machines(label).find((v) => v.variable === one.index)!;
          const unit = variable.transitions.find((t) => t.to === (t.from + 1) % values)?.steps ?? [];
          for (const t of variable.transitions) {
            const times = (t.to - t.from + values) % values;
            assert.deepEqual(t.steps, Array.from({ length: times }, () => unit).flat(),
              `${name} ${one.device} ${one.property} ${t.from} to ${t.to}`);
            bump('stepping transitions checked');
          }
        } else {
          assert.fail(`${name} ${one.device} ${one.property}: neither by value nor stepping`);
        }
        for (const t of record.values) {
          bump(t.opcode === 0 && t.operand === 0 ? `${kind} null instruction`
            : t.opcode >= 0x80 ? `${kind} inline write` : t.opcode === 0x7f ? `${kind} list` : `${kind} opcode ${t.opcode}`);
        }
      }
    }
  }
  assert.deepEqual(Object.fromEntries([...tally].sort()), {
    'device without an input variable': 32,
    // The Panasonic TX-P42GT30E of h700_power_hold_compile holds InputType and no Input, where the
    // same model in h650_panasonic_config holds both. Measured and not explained.
    'device without an input variable and with states': 1,
    'input by value': 37,
    'input from -2': 437,
    'input inline write': 103,
    'input list': 340,
    'input null instruction': 6,
    // The Chromecast of h600_config, which no infrared catalogue entry identifies, and the Quasar
    // SP2717T: one input each, so a variable of one value with nowhere to step to.
    'input stepping': 3,
    'input stepping over one value': 2,
    'input values': 443,
    'input variable': 40,
    'state by value': 22,
    'state from -2': 73,
    'state from -3': 54,
    // Every state transition runs a list, 73 + 54 by value and 116 stepping, where the input layer
    // carries a lone state write inline.
    'state list': 243,
    'state stepping': 23,
    'state values': 194,
    'state variable': 45,
    // The 116 stepping state transitions and the 12 of the one input layer that steps, the TX-28A1U's.
    'stepping transitions checked': 128,
  });
});

test('an arch 14 activity starts its devices, then sets their inputs in the order they were switched on, before switching any off',
     skipUnless(...ARCH14), () => {
  // Read off the enter list, tag 1 of every activity's handler set, following its calls: each write
  // of a device's Power or Input variable, and of the activity counter, in the order they run. A
  // write behind the silent flag is skipped, since it records a value without running a transition.
  let activities = 0;
  let withInputs = 0;
  let inputWrites = 0;
  let unpowered = 0;
  let skipped = 0;
  /** `<configuration>|<device>` for every device that has a power variable. */
  const powerOf = new Set<string>();
  for (const name of ARCH14) {
    const c = open(name);
    const lists = c.actionLists() ?? [];
    const byIndex = new Map(deviceVariables(c).map((one) => [one.index, one]));
    for (const one of byIndex.values()) if (one.property === 'Power') powerOf.add(`${name}|${one.device}`);
    const hasInput = new Set([...byIndex.values()].filter((one) => one.property === 'Input').map((one) => one.device));
    const counter = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME))!;
    const seen = new Set<number>();
    for (const address of handlerSets(c)!.addresses) {
      const enter = taggedList(c, address)?.entries.find((one) => one.tag === 1);
      if (enter?.opcode !== 0x7f || seen.has(enter.operand)) continue;
      seen.add(enter.operand);
      const writes: { rank: number; device: string }[] = [];
      const walk = (list: number, depth: number): void => {
        let silent = false;
        for (const one of lists[list] ?? []) {
          if (one.opcode === 0x07 && one.operand === 0xffff) { silent = true; continue; }
          if (one.opcode === 0x7f && depth < 4) walk(one.operand, depth + 1);
          else if (one.opcode >= 0x80 && !silent) {
            const variable = one.opcode - 0x80;
            const device = byIndex.get(variable);
            if (variable === counter.index) writes.push({ rank: 3, device: '' });
            else if (device?.property === 'Power') writes.push({ rank: one.operand === 1 ? 0 : 2, device: device.device });
            else if (device?.property === 'Input') writes.push({ rank: 1, device: device.device });
          }
          silent = false;
        }
      };
      walk(enter.operand, 0);
      if (!writes.some((one) => one.rank === 3)) continue;
      activities += 1;
      // Ranks never go down: power on, inputs, power off, the counter.
      writes.forEach((one, k) => {
        if (k > 0) assert.ok(one.rank >= writes[k - 1]!.rank, `${name} list ${enter.operand}: ${JSON.stringify(writes)}`);
      });
      const on = writes.filter((one) => one.rank === 0).map((one) => one.device);
      const inputs = writes.filter((one) => one.rank === 1).map((one) => one.device);
      if (inputs.length > 0) withInputs += 1;
      inputWrites += inputs.length;
      // The inputs of the devices switched on here follow the order they were switched on in. A device
      // with no power variable at all has its input set too, the Chromecast of h600_config, ahead of
      // the television; every other input written belongs to a device this activity switched on.
      const powered = inputs.filter((device) => powerOf.has(`${name}|${device}`));
      assert.deepEqual(powered, on.filter((device) => powered.includes(device)), `${name} list ${enter.operand}`);
      unpowered += inputs.length - powered.length;
      // A device switched on here with an input variable need not have its input set: the activity
      // chooses, and on these compiles 11 such pairs are left alone.
      skipped += on.filter((device) => hasInput.has(device) && !inputs.includes(device)).length;
    }
  }
  assert.deepEqual({ activities, withInputs, inputWrites, unpowered, skipped },
                   { activities: 40, withInputs: 40, inputWrites: 72, unpowered: 1, skipped: 11 });
});

/** A made up catalogue record: a timing block and whatever else a test needs. Not the archive's JSON. */
function made(rest: Record<string, unknown>, timing: Record<string, unknown> = {}) {
  return deviceDriving({
    timing: {
      interKeyDelay: 100, interDeviceDelay: 500, holdInterDeviceDelay: 0, inputDelay: 1000,
      connectedAppPowerOnDelay: 0, pressMinRepeats: 3, isInterKeyDelayOptimized: false, ...timing,
    },
    ...rest,
  });
}

/** The plan as `from>to: steps`, one line per transition, which reads in a failure message. */
function lines(plan: InputPlan): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const variable of [...plan.states, ...(plan.input === undefined ? [] : [plan.input])]) {
    out[variable.property] = variable.transitions.map((t) => `${t.from}>${t.to}: ${t.steps.map((s) =>
      s.kind === 'send' ? `${s.command}/${s.amount}` : s.kind === 'wait' ? `wait ${s.tenths}` : `${s.state}=${s.value}`).join(' ')}`);
  }
  return out;
}

test('an input selected by its own commands waits the input delay, and a state its key delay', () => {
  const plan = inputPlan(made({
    inputs: { type: 0, list: [
      { name: 'TV', commands: [{ set: 'Screen', to: 'Tuner' }] },
      { name: 'HDMI1', commands: ['InputHdmi1', { delayMs: 2000 }] },
      { name: 'Media' },
    ] },
    states: { Screen: { values: [
      { name: 'Tuner', select: [{ setType: 1, commands: ['InputTv'] }] },
      { name: 'Game', select: [{ setType: 2, commands: ['InputGame'] }] },
    ] } },
  }));
  assert.deepEqual(lines(plan), {
    // setType 1 is from any value, -2; setType 2 from a changed one, -3. A state's send waits 1 tenth.
    Screen: ['-2>0: InputTv/1', '-3>1: InputGame/1'],
    // An input's send waits 10 tenths, a wait is its own step, and an input with no commands is empty.
    Input: ['-2>0: Screen=0', '-2>1: InputHdmi1/10 wait 20', '-2>2: '],
  });
  // With no input delay stated, an input's sends wait the key delay: the Sony KDL-32W705B.
  const sony = inputPlan(made({ inputs: { type: 0, list: [{ name: 'A', commands: ['A'] }, { name: 'B', commands: ['B'] }] } },
    { inputDelay: 0 }));
  assert.deepEqual(lines(sony), { Input: ['-2>0: A/1', '-2>1: B/1'] });
});

test('stepping goes forward from every value to every other, as many steps as it takes, and wraps', () => {
  const plan = inputPlan(made({
    inputs: { type: 0, next: ['InputNext'], list: [{ name: 'Tuner' }, { name: 'AV1' }, { name: 'AV2' }] },
  }));
  assert.deepEqual(lines(plan), {
    Input: ['0>1: InputNext/10', '0>2: InputNext/10 InputNext/10', '1>0: InputNext/10 InputNext/10',
            '1>2: InputNext/10', '2>0: InputNext/10', '2>1: InputNext/10 InputNext/10'],
  });
  // A state that steps does it at the key delay, reached here through an input's write.
  const state = inputPlan(made({
    inputs: { type: 0, list: [{ name: 'A', commands: [{ set: 'Mode', to: 'Y' }] }, { name: 'B', commands: ['B'] }] },
    states: { Mode: { next: ['Green'], values: [{ name: 'X' }, { name: 'Y' }] } },
  }));
  assert.deepEqual(lines(state).Mode, ['0>1: Green/1', '1>0: Green/1']);
});

test('one input gets a variable only when it steps, and a state no input reaches is left out', () => {
  // The Quasar SP2717T's shape: one input stepping with InputNext, and states nothing writes. Logitech
  // compiled a variable of one value with no transitions, and none of the states.
  const quasar = inputPlan(made({
    inputs: { type: 6, next: ['InputNext'], list: [{ name: 'Tuner' }] },
    states: { AVType: { values: [{ name: 'Red', select: [{ setType: 2, commands: ['Red'] }] }] } },
  }));
  assert.deepEqual(quasar.input?.values, ['Tuner']);
  assert.deepEqual(lines(quasar), { Input: [] });
  // The Plex player's: one input that does not step. No variable at all.
  assert.deepEqual(inputPlan(made({ inputs: { type: 6, list: [{ name: 'Media' }] } })), { states: [] });
  assert.deepEqual(inputPlan(made({})), { states: [] });
});

test('what no compile shows is refused rather than guessed', () => {
  const two = [{ name: 'A', commands: ['A'] }, { name: 'B', commands: ['B'] }];
  const refusals: [RegExp, Record<string, unknown>, Record<string, unknown>?][] = [
    [/a start list/, { inputs: { type: 0, list: two, start: ['Menu'] } }],
    [/canSkip/, { inputs: { type: 0, list: two, canSkip: true } }],
    [/no input states a command/, { inputs: { type: 0, list: [{ name: 'A' }, { name: 'B' }] } }],
    [/both step and state commands/, { inputs: { type: 0, list: two, next: ['N'] } }],
    [/below the key delay/, { inputs: { type: 0, list: two } }, { inputDelay: 50 }],
    [/not a whole number of tenths/, { inputs: { type: 0, list: two } }, { inputDelay: 1050 }],
    [/holds A for a time/, { inputs: { type: 0, list: [{ name: 'A', commands: [{ command: 'A', durationMs: 500 }] }, two[1]] } }],
    [/does not declare/, { inputs: { type: 0, list: [{ name: 'A', commands: [{ set: 'S', to: 'X' }] }, two[1]] } }],
    [/both selects and steps/, {
      inputs: { type: 0, list: [{ name: 'A', commands: [{ set: 'S', to: 'X' }] }, two[1]] },
      states: { S: { next: ['N'], values: [{ name: 'X', select: [{ setType: 1, commands: ['X'] }] }] } },
    }],
    [/setType 0/, {
      inputs: { type: 0, list: [{ name: 'A', commands: [{ set: 'S', to: 'X' }] }, two[1]] },
      states: { S: { values: [{ name: 'X', select: [{ setType: 0, commands: ['X'] }] }] } },
    }],
    [/reached 2 ways/, {
      inputs: { type: 0, list: [{ name: 'A', commands: [{ set: 'S', to: 'X' }] }, two[1]] },
      states: { S: { values: [{ name: 'X', select: [{ setType: 1, commands: ['X'] }, { setType: 2, commands: ['Y'] }] }] } },
    }],
    [/cannot be named in the name tree/, {
      inputs: { type: 0, list: [{ name: 'A', commands: [{ set: 'My_State', to: 'X' }] }, two[1]] },
      states: { My_State: { values: [{ name: 'X', select: [{ setType: 1, commands: ['X'] }] }] } },
    }],
  ];
  for (const [what, rest, timing] of refusals) {
    // The message is checked as well as the class, so a record refused for some other reason fails.
    assert.throws(() => inputPlan(made(rest, timing)), (e: unknown) => e instanceof ComposeError && what.test(e.message));
  }
});

test('a rule names a command the codeset spells in another case, and an ambiguous spelling is refused', () => {
  // The Denon AVR-X4800H's rules say InputTvAudio where its codeset says InputTVAudio.
  assert.equal(commandIndex(['Power', 'InputTVAudio'], 'InputTvAudio'), 1);
  assert.equal(commandIndex(['InputUsb', 'InputUSB'], 'InputUSB'), 1);
  assert.throws(() => commandIndex(['InputUsb', 'InputUSB'], 'InputusB'), /differ from it only in case/);
  assert.throws(() => commandIndex(['Power'], 'InputHdmi1'), /not among the device's commands/);
});

/**
 * The devices Logitech compiled whose inputs are composed again here: the configuration, the label it
 * gave the device, and the catalogue entry, as the test accounts' own records name it. The TX-28A1U
 * of h650_power_hold_compile_2 is the eleventh and is checked at the plan, below, because its infrared
 * family has no whole block measured and `composeDevice` refuses it.
 */
const CALIBRATION = [
  ['h650_config_region', 'TV', 'LG', 'OLED65G26LA'],
  ['h650_config_region', 'Denon', 'Denon', 'AVR-X4800H'],
  ['h650_panasonic_config', 'Panasonic_TV', 'Panasonic', 'TX-P42GT30E'],
  ['calibration_h600', 'Sony_TV', 'Sony', 'KDL-32W705B'],
  ['calibration_h600', 'Denon_AV_Receiver', 'Denon', 'AVR-1912'],
  ['h650_power_hold_compile', 'Panasonic_TX-29AK40F', 'Panasonic', 'TX-29AK40F'],
  ['h700_power_hold_compile_3', 'Panasonic_TH-42PA30', 'Panasonic', 'TH-42PA30'],
  ['h700_power_hold_compile_3', 'Quasar_SP2717T', 'Quasar', 'SP2717T'],
  ['h700_power_hold_compile_4', 'Thomson_25DT60H', 'Thomson', '25DT60H'],
  ['h700_power_hold_compile_4', 'Sony_KE-50MR1E', 'Sony', 'KE-50MR1E'],
] as const;

/** The numbers a group's records decode to, which is what identifies a group in the catalogue. */
function groupValues(c: Container, group: number): string[] {
  return (irGroups(c)?.[group]?.addresses ?? []).flatMap((address) => {
    const frame = irFrame(c, address);
    return frame === undefined ? [] : [codeKey(frame.value.toString(16))];
  });
}

/**
 * A device's variables with every transition's body written in catalogue names, so ours and Logitech's
 * compare without sharing a single number: a send is the command its frame decodes to in the device's
 * codeset and the wait paired with it, a write names the variable's property and the value.
 */
function canonical(c: Container, held: readonly HeldVariable[], nameOf: ReadonlyMap<string, string>) {
  const property = new Map(held.map((one) => [one.variable, one.property]));
  const word = (step: HeldStep): string => {
    switch (step.kind) {
      case 'send': {
        const address = irGroups(c)?.[step.group]?.addresses[step.record];
        const frame = address === undefined ? undefined : irFrame(c, address);
        const value = frame === undefined ? '?' : codeKey(frame.value.toString(16));
        return `${nameOf.get(value) ?? `?${value}`}/${step.amount}`;
      }
      case 'wait': return `wait ${step.tenths}`;
      case 'write': return `${step.silent ? 'silent ' : ''}${property.get(step.variable) ?? `v${step.variable}`}=${step.value}`;
      case 'other': return `other ${step.opcode.toString(16)}`;
    }
  };
  return new Map(held.map((one) => [one.property, {
    values: one.values,
    bodies: new Map(one.transitions.map((t) => [`${t.from}>${t.to}`, t.steps.map(word).join(' ')])),
  }]));
}

/**
 * `agree/exact/ours/theirs` per property: transitions equal once the silent flag is set aside, how many
 * of those are equal with it, and how many are in one compile and not the other. The input layer is
 * compared as a set of bodies, because Logitech numbers inputs by an order the archive does not keep.
 */
function compare(ours: ReturnType<typeof canonical>, theirs: ReturnType<typeof canonical>): Record<string, string> {
  const loud = (body: string): string => body.replaceAll('silent ', '');
  const out: Record<string, string> = {};
  for (const property of new Set([...ours.keys(), ...theirs.keys()])) {
    const a = ours.get(property);
    const b = theirs.get(property);
    if (a === undefined || b === undefined) { out[property] = a === undefined ? 'theirs only' : 'ours only'; continue; }
    assert.equal(a.values, b.values, `${property}: the same number of values`);
    let agree = 0;
    let exact = 0;
    let oursOnly = 0;
    if (property === 'Input') {
      const left = [...b.bodies.values()];
      for (const body of a.bodies.values()) {
        const at = left.findIndex((other) => loud(other) === loud(body));
        if (at < 0) { oursOnly += 1; continue; }
        agree += 1;
        if (left[at] === body) exact += 1;
        left.splice(at, 1);
      }
      out[property] = `${agree}/${exact}/${oursOnly}/${left.length}`;
      continue;
    }
    for (const [key, body] of a.bodies) {
      const other = b.bodies.get(key);
      if (other !== undefined && loud(other) === loud(body)) { agree += 1; if (other === body) exact += 1; } else oursOnly += 1;
    }
    out[property] = `${agree}/${exact}/${oursOnly}/${b.bodies.size - agree}`;
  }
  return out;
}

test('ten devices Logitech compiled, composed again from the catalogue, agree transition for transition but for the divergences named, and an eleventh at the plan',
     needing(skipUnless(...new Set(CALIBRATION.map(([config]) => config)), 'h650_power_hold_compile_2'),
             skipWithoutIrArchive()), () => {
  const root = IR_ARCHIVE!;
  const host = open('h650_config_region');
  const results: Record<string, Record<string, string>> = {};
  const pinned: Record<string, string> = {};
  for (const [config, label, slug, file] of CALIBRATION) {
    const theirs = open(config);
    const device = catalogueDevice(root, slug, file);
    const commands = catalogueCommands(root, device.codeset!);
    const nameOf = new Map<string, string>();
    for (const one of commands) {
      for (const value of one.keycode.matchAll(/\(0x([0-9A-Fa-f]+)\)/g)) {
        if (!nameOf.has(codeKey(value[1]!))) nameOf.set(codeKey(value[1]!), one.name);
      }
    }
    // The pin is checked, not trusted: how many of the numbers the group Logitech compiled decodes to
    // are in this codeset, counted below. Not that the codeset is the catalogue's best match, since
    // near identical codesets edge past each other: the TX-29AK40F's group scores higher against
    // another one. The two Denon receivers' misses are not examined.
    const group = devices(theirs).find((one) => one.name === label)?.group;
    assert.ok(group !== undefined, `${config} has a device ${label}`);
    const values = groupValues(theirs, group);
    pinned[label] = `${values.filter((value) => nameOf.has(value)).length}/${values.length}`;
    const driving = catalogueDriving(root, slug, file);
    const plan = inputPlan(driving);
    // The device gets exactly the commands its inputs send, named as the rules name them.
    const distinct = commands.filter((one, k) => commands.findIndex((other) => other.name === one.name) === k);
    const sent = [...new Set([...plan.states, ...(plan.input === undefined ? [] : [plan.input])]
      .flatMap((v) => v.transitions.flatMap((t) => t.steps.flatMap((s) => (s.kind === 'send' ? [s.command] : [])))))];
    const used = sent.map((name) => distinct[commandIndex(distinct.map((one) => one.name), name)]!);
    const stated = used.length > 0 ? used : [distinct[0]!];
    const composed = composeDevice(host, { label: 'Cal', commands: stated.map((one) => ({ stated: one.keycode })) });
    const inputs = composeDeviceInputs(parse(composed.bytes), {
      device: composed, label: 'Cal', commandNames: used.length > 0 ? sent : [distinct[0]!.name], driving,
    });
    const ours = parse(inputs.bytes);
    results[label] = compare(canonical(ours, deviceStateMachines(ours, 'Cal'), nameOf),
                             canonical(theirs, deviceStateMachines(theirs, label), nameOf));
  }
  assert.deepEqual(pinned, {
    TV: '83/83', Denon: '115/144', Panasonic_TV: '85/85', Sony_TV: '100/100', Denon_AV_Receiver: '91/92',
    'Panasonic_TX-29AK40F': '65/65', 'Panasonic_TH-42PA30': '62/62', Quasar_SP2717T: '60/60',
    // None of the Thomson's records decodes to a number its Philips RECS80 codeset states, so its
    // pin rests on the label the test account gave it, and its sends below compare as the numbers
    // they decode to rather than by name. Measured, not explained.
    Thomson_25DT60H: '0/35',
    'Sony_KE-50MR1E': '150/150',
  });
  const same = (n: number): string => `${n}/${n}/0/0`;
  assert.deepEqual(results, {
    // OnlinePower is the connected app machinery, which this does not compose: no transitions.
    TV: { Screen: same(8), TVInput: same(6), Input: same(10), OnlinePower: 'theirs only' },
    Denon: { Input: same(19) },
    Panasonic_TV: { Input: same(12), InputType: same(9), TVInput: same(12) },
    // Netflix is the input Logitech marks online: their transition waits for the connected app first.
    Sony_TV: { Input: '10/10/1/1', OnlinePower: 'theirs only' },
    Denon_AV_Receiver: { Input: same(16) },
    // One input writes OnScreenMenu silently, which the archive does not say.
    'Panasonic_TX-29AK40F': {
      AV2Mode: same(2), AV3Mode: same(2), AV4Mode: same(2), AVType: same(4), InputMode: same(2),
      OnScreenMenu: same(1), Input: '8/7/0/0',
    },
    // Silent writes on seven inputs and both INPUTMODE steps, and four values whose only step is a
    // Select press that Logitech's compile holds no transition for. Measured, not explained.
    'Panasonic_TH-42PA30': {
      AV1Scart: '1/1/1/0', AV2Input: same(2), AV2Scart: '1/1/1/0', AV3Input: same(2), AV4Input: same(2),
      AV4Scart: '1/1/1/0', AVS: same(6), INPUTMODE: '2/0/0/0', MENU: '1/1/1/0', PAGE12: same(2), Input: '10/3/0/0',
    },
    // One input, stepping: a variable of one value, no transitions, and none of its six states.
    Quasar_SP2717T: { Input: same(0) },
    Thomson_25DT60H: { AVInput: same(6), InputType: same(2), Input: '4/3/0/0' },
    'Sony_KE-50MR1E': { Input: same(9) },
  });

  // The eleventh, at the plan: the TX-28A1U steps through four inputs with InputNext, and the plan
  // states the same pairs with the same number of presses and the same wait as Logitech's compile.
  const tx = catalogueDriving(root, 'Panasonic', 'TX-28A1U');
  const planned = inputPlan(tx).input!;
  const compiled = deviceStateMachines(open('h650_power_hold_compile_2'), 'Panasonic_TX-28A1U')
    .find((one) => one.property === 'Input')!;
  const shape = (pairs: { from: number; to: number; sends: number[] }[]): string[] =>
    pairs.map((one) => `${one.from}>${one.to} ${one.sends.join(',')}`).sort();
  assert.deepEqual(
    shape(planned.transitions.map((t) => ({ from: t.from, to: t.to,
      sends: t.steps.flatMap((s) => (s.kind === 'send' ? [s.amount] : [])) }))),
    shape(compiled.transitions.map((t) => ({ from: t.from, to: t.to,
      sends: t.steps.flatMap((s) => (s.kind === 'send' ? [s.amount] : [])) }))));
  assert.equal(planned.transitions.length, 12);
});

test('a composed activity puts a composed device on its input, between the power writes, in Logitech\'s order',
     needing(skipUnless('h650_config_region'), skipWithoutIrArchive()), () => {
  // Todo 3.6 on the Harmony 650's own configuration: an LG OLED65G26LA composed with its inputs, and
  // an activity that switches it on and puts it on HDMI 1.
  const root = IR_ARCHIVE!;
  const device = catalogueDevice(root, 'LG', 'OLED65G26LA');
  const driving = catalogueDriving(root, 'LG', 'OLED65G26LA');
  const commands = catalogueCommands(root, device.codeset!);
  const plan = inputPlan(driving);
  const sent = [...new Set([...plan.states, plan.input!]
    .flatMap((v) => v.transitions.flatMap((t) => t.steps.flatMap((s) => (s.kind === 'send' ? [s.command] : [])))))];
  const names = ['PowerOn', ...sent];
  const stated = names.map((name) => ({ stated: commands.find((one) => one.name === name)!.keycode }));

  const host = open('h650_config_region');
  const composed = composeDevice(host, { label: 'LG', commands: stated, power: 0 });
  const inputs = composeDeviceInputs(parse(composed.bytes), { device: composed, label: 'LG', commandNames: names, driving });
  const joined = parse(joinPowerOff(parse(inputs.bytes), composed.variable).bytes);
  const hdmi1 = inputTarget(inputs, 'HDMI 1');
  assert.deepEqual(hdmi1, { variable: inputs.input!.variable, value: 3 });
  assert.throws(() => inputTarget(inputs, 'HDMI 9'), ComposeError);

  const targets = activityStartTargets(joined, [composed.variable], [hdmi1]);
  const activity = composeActivity(joined, { label: 'Watch', targets });
  const after = parse(activity.bytes);
  const counter = stateVariables(after).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME))!;
  const others = deviceVariables(after).filter((one) => one.property === 'Power' && one.device !== 'LG');
  const writes = (after.actionLists()?.[activity.enterList] ?? [])
    .filter((one) => one.opcode >= 0x80).map((one) => [one.opcode - 0x80, one.operand]);
  // Power on, the input, every other device off in the all off list's order, the counter: section
  // 321's order.
  assert.deepEqual(writes.slice(0, 2), [[composed.variable, 1], [hdmi1.variable, 3]]);
  assert.deepEqual(writes.slice(2, -1).map(([variable]) => variable).sort(), others.map((one) => one.index).sort());
  assert.ok(writes.slice(2, -1).every(([, value]) => value === 0));
  assert.equal(writes.at(-1)![0], counter.index);

  // And what that write runs: the input's transition puts Screen on HDMI1, and Screen's sends the
  // code, which decodes to the catalogue's InputHdmi1.
  const held = deviceStateMachines(after, 'LG');
  const input = held.find((one) => one.property === 'Input')!;
  const screen = held.find((one) => one.property === 'Screen')!;
  const step = input.transitions.find((t) => t.from === -2 && t.to === 3)!.steps;
  assert.deepEqual(step, [{ kind: 'write', variable: screen.variable, value: 1, silent: false }]);
  const send = screen.transitions.find((t) => t.to === 1)!.steps;
  assert.equal(send.length, 1);
  assert.equal(send[0]!.kind, 'send');
  const record = send[0]!.kind === 'send' ? send[0]! : undefined;
  const frame = irFrame(after, irGroups(after)![record!.group]!.addresses[record!.record]!)!;
  const hdmi = commands.find((one) => one.name === 'InputHdmi1')!;
  assert.ok(hdmi.keycode.toLowerCase().includes(`0x${frame.value.toString(16)}`), `${hdmi.keycode} against ${frame.value.toString(16)}`);
});
