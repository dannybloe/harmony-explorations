/**
 * Sequences: what Logitech's compiler made of the only two in the lab, and the composer scored on them.
 *
 * Section 327, todo-compile-650 4.2. Three kinds of claim:
 *
 * - **The Harmony One calibration.** Four compiles of the spare Harmony One's account hold the two
 *   sequences Danny authored, and a capture of their steps from a second account record was taken the
 *   same evening, `GetButtonMaps.json`, in the vendor's words: device, command name, wait in seconds.
 *   Each is composed again from those steps and compared with Logitech's lists instruction for
 *   instruction, against wrong readings that a sample this size could otherwise hide.
 * - **The arch 14 absence.** None of the thirteen Harmony 600, 650 and 700 compiles holds a pause across
 *   several devices, asserted, so the day one does this file fails and says the arch 14 form can now be
 *   calibrated. A sequence with no pause, or on a one device activity, would not be seen by this.
 * - **The composer on the Harmony 650**: the lists it appends, the key binding, and the refusal of a
 *   sequence the action queue cannot hold, section 238, at the exact boundary.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LAB, require_, skipUnless } from '@harmony/lab';
import {
  ACTION_QUEUE_INSTRUCTIONS, ARCH14_INFERRED, ComposeError, EditError, QueueError, SCREEN_ITEM_BEEP,
  activities, activityPauseGroups, applyEdits, devices, assertQueueFits, bindKeyToList, composeSequence,
  handlerSets, infraredCodesPerList, irGroups, modeRecords, parse, payloadOf, queueRun, sendPreludes, sequenceBody,
  taggedList,
  type Container, type Instruction, type SequenceStep,
} from '../src/index.ts';

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

/**
 * Every compile in the lab holding a sequence: the spare Harmony One's own, and the three of the same
 * account for the protocol campaign, whose added devices renumber the activity's three.
 */
const SEQUENCE_COMPILES = ['one_spare_20260830', 'compiled_protocols', 'compiled_protocols_2',
                           'compiled_protocols_3'] as const;

/** The groups each compile's pauses name, television, set top box, receiver, as read off the lists. */
const PAUSE_GROUPS: Record<string, number[]> = {
  one_spare_20260830: [3, 2, 0], compiled_protocols: [6, 14, 9], compiled_protocols_2: [4, 14, 6],
  compiled_protocols_3: [2, 7, 4],
};

const CALL = 0x7f;
const QUANTITY = 0x7c;

/**
 * Every list holding what a pause looks like on the Harmony One: two or more `0x7C` in a row carrying
 * one wait for different devices. An ordinary send list holds one `0x7C` for its own device, and a
 * Harmony 600's delay tables repeat one device, so neither matches.
 */
function pauseShaped(c: Container): number[] {
  const out: number[] = [];
  (c.actionLists() ?? []).forEach((list, index) => {
    for (let k = 1; k < list.length; k += 1) {
      const a = list[k - 1] as Instruction;
      const b = list[k] as Instruction;
      if (a.opcode === QUANTITY && b.opcode === QUANTITY
          && (a.operand & 0xff) === (b.operand & 0xff) && a.operand >>> 8 !== b.operand >>> 8) {
        out.push(index);
        return;
      }
    }
  });
  return out;
}

/** The steps the account states, as the vendor's capture holds them. */
interface Authored {
  name: string;
  steps: ({ device: number; command: string } | { seconds: number })[];
}

function authored(): Authored[] {
  // `LAB!` rather than a guard: `skipUnless` cannot pass without a lab. The capture is a **dated** one,
  // taken on 23 August 2026 after the two sequences were authored, so it states what was compiled.
  const reply = JSON.parse(readFileSync(
    join(LAB!, 'work', 'myharmony', 'responses-account2', 'GetButtonMaps.json'), 'utf8')) as {
      GetButtonMapsResult: { Sequences?: {
        Name: string;
        Actions: { Order: number; CommandName?: string; DeviceId?: { Value: number }; Duration?: number }[];
      }[] }[];
    };
  return reply.GetButtonMapsResult.flatMap((map) => map.Sequences ?? []).map((one) => ({
    name: one.Name,
    steps: [...one.Actions].sort((a, b) => a.Order - b.Order).map((action) => (action.Duration !== undefined
      ? { seconds: action.Duration }
      : { device: (action.DeviceId as { Value: number }).Value, command: action.CommandName as string })),
  }));
}

/**
 * The account's inter key delay per device of `groups`, in tenths, keyed by the configuration's infrared
 * group and joined on the device's name, which both state.
 */
function accountInterKeyDelays(c: Container, groups: readonly number[]): Record<number, number> {
  const listed = (JSON.parse(readFileSync(
    join(LAB!, 'work', 'myharmony', 'responses-account2', 'GetDevicesInAccount_20260831.json'), 'utf8')) as
    { GetDevicesInAccountResult: { Name: string; InterKeyDelay: number }[] }).GetDevicesInAccountResult;
  const out: Record<number, number> = {};
  for (const device of devices(c)) {
    const theirs = listed.find((one) => one.Name === device.name);
    const group = device.group;
    if (theirs !== undefined && group !== undefined && groups.includes(group)) out[group] = theirs.InterKeyDelay / 100;
  }
  return out;
}

const body = (c: Container, list: number): Instruction[] => (c.actionLists() ?? [])[list] as Instruction[];
const same = (a: readonly Instruction[], b: readonly Instruction[]): boolean =>
  a.length === b.length && a.every((one, k) => one.opcode === b[k]?.opcode && one.operand === b[k]?.operand);

test('each compile holding the two sequences has six sequence lists in four bindings, and the account\'s compile before them has none',
     skipUnless('one_spare_myharmony', ...SEQUENCE_COMPILES), () => {
  const before = parse(require_('one_spare_myharmony'));
  // Before Danny authored them, the same unit's compile held none: the control that the shape is the
  // sequences' and not something every Harmony One configuration carries.
  assert.deepEqual(pauseShaped(before), []);
  for (const name of SEQUENCE_COMPILES) {
    const after = parse(require_(name));
    const lists = pauseShaped(after);
    assert.equal(lists.length, 6, name);
    // Four open with the screen item's beeper: each sequence's screen item and that page's second copy,
    // section 69. The other two are MySequence's two key copies, with no beeper.
    const beeped = lists.filter((one) => body(after, one)[0]?.opcode === SCREEN_ITEM_BEEP.opcode);
    assert.equal(beeped.length, 4, name);
  }
});

test('none of the thirteen Harmony 600, 650 and 700 compiles holds a pause across devices, so their form is carried over',
     skipUnless(...ARCH14), () => {
  // **This is the assertion that makes the arch 14 composer an inference**, and it is written to fail
  // the day a compile with a sequence arrives: then the five entries of `ARCH14_INFERRED` can be
  // scored rather than carried.
  for (const name of ARCH14) assert.deepEqual(pauseShaped(open(name)), [], name);
  assert.equal(ARCH14_INFERRED.length, 5);
});

test('no screen item on a Harmony 600, 650 or 700 opens with the beeper every spare Harmony One screen item opens with',
     skipUnless('one_spare_20260830', ...ARCH14), () => {
  // The ground for the third inference: a sequence's screen copy on arch 14 is its key copy.
  const opened = (c: Container): { all: number; beeped: number } => {
    let all = 0;
    let beeped = 0;
    for (const record of modeRecords(c) ?? []) {
      for (const page of record.pages) {
        for (const entry of taggedList(c, page.list)?.entries ?? []) {
          if (entry.opcode !== CALL) continue;
          all += 1;
          if (body(c, entry.operand)?.[0]?.opcode === SCREEN_ITEM_BEEP.opcode) beeped += 1;
        }
      }
    }
    return { all, beeped };
  };
  const one = opened(parse(require_('one_spare_20260830')));
  assert.equal(one.beeped, one.all, 'every Harmony One screen item beeps');
  assert.equal(one.all, 929);
  for (const name of ARCH14) {
    const counted = opened(open(name));
    assert.equal(counted.beeped, 0, name);
    assert.ok(counted.all > 0, `${name} binds screen items at all`);
  }
});

/**
 * Each authored command's send, read off the compiled key copy under the rule being tested: one call
 * per command, a run of the activity's devices per pause. The rule is then checked by everything the
 * mapping does not decide, which is every pause, every repeat and the second sequence.
 */
function commandsOf(c: Container, sequence: Authored, list: number, groups: readonly number[]):
    Map<string, { group: number; code: number; list: number }> {
  const codes = infraredCodesPerList(c);
  const out = new Map<string, { group: number; code: number; list: number }>();
  const compiled = body(c, list).filter((one) => one.opcode !== SCREEN_ITEM_BEEP.opcode);
  let at = 0;
  for (const step of sequence.steps) {
    if ('seconds' in step) { at += groups.length; continue; }
    const call = compiled[at] as Instruction;
    assert.equal(call.opcode, CALL, `${sequence.name}: a command is one call`);
    const sent = codes.get(call.operand) ?? [];
    assert.equal(sent.length, 1, `${sequence.name}: the call sends one code`);
    const key = `${step.device}:${step.command}`;
    const found = { group: (sent[0] as { group: number }).group, code: (sent[0] as { code: number }).code,
                    list: call.operand };
    const earlier = out.get(key);
    // **One list per command**, measured: a command that occurs twice calls the same list both times.
    if (earlier !== undefined) assert.deepEqual(found, earlier, `${sequence.name}: ${key} twice, one list`);
    out.set(key, found);
    at += 1;
  }
  assert.equal(at, compiled.length, `${sequence.name}: the steps account for the whole list`);
  return out;
}

test('composed again from the account\'s steps, five of each compile\'s six sequence lists come back as Logitech compiled them, on all four',
     skipUnless(...SEQUENCE_COMPILES), () => {
  let descendingFits = 0;
  for (const name of SEQUENCE_COMPILES) {
    const c = parse(require_(name));
    const tv = activities(c).find((one) => one.name === 'TV kijken');
    assert.ok(tv !== undefined);
    const groups = activityPauseGroups(c, tv.set);
    // The television, the set top box and the receiver, in the order the activity switches them on,
    // whatever numbers the compile gave them: the three protocol compiles renumber all three.
    const byName = (wanted: string): number => devices(c).find((one) => one.name === wanted)?.group as number;
    const [tvGroup, boxGroup, receiverGroup] = [byName('TV'), byName('KPN'), byName('Denon')];
    assert.deepEqual(groups, [tvGroup, boxGroup, receiverGroup], name);
    assert.deepEqual(groups, PAUSE_GROUPS[name], name);
    if (JSON.stringify(groups) === JSON.stringify([...groups].sort((a, b) => b - a))) descendingFits += 1;

    const sequences = authored();
    assert.deepEqual(sequences.map((one) => [one.name, one.steps.length]), [['Netflix', 6], ['MySequence', 25]]);
    const [netflix, mine] = sequences as [Authored, Authored];

    // The compiled copies, found by binding rather than by number: the key copies are the activity's,
    // the screen copies a page's.
    const lists = pauseShaped(c);
    const keyCopies = lists.filter((one) => body(c, one)[0]?.opcode !== SCREEN_ITEM_BEEP.opcode);
    const mineKey = keyCopies.find((one) => body(c, one).length === 33) as number;
    const commands = commandsOf(c, mine, mineKey, groups);
    const netflixScreen = lists.find((one) => body(c, one).length === 9) as number;
    for (const [key, value] of commandsOf(c, netflix, netflixScreen, groups)) {
      // The second sequence names two commands the first does, and they resolve to the same lists.
      const shared = commands.get(key);
      if (shared !== undefined) assert.deepEqual(value, shared, `${key} across the two sequences`);
      commands.set(key, value);
    }
    // Seventeen in MySequence, and Netflix adds Red: its 2 and 0 are MySequence's.
    assert.equal(commands.size, 18, 'eighteen distinct commands over the two sequences');
    // Each device of the account resolves to one group, and the three are the activity's three.
    const perDevice = new Map<string, Set<number>>();
    for (const [key, { group }] of commands) {
      const device = key.split(':')[0] as string;
      perDevice.set(device, (perDevice.get(device) ?? new Set()).add(group));
    }
    assert.deepEqual([...perDevice.values()].map((one) => [...one]).flat().sort((a, b) => a - b),
                     [...groups].sort((a, b) => a - b));

    const stepsOf = (sequence: Authored): SequenceStep[] => sequence.steps.map((step) => ('seconds' in step
      ? { pause: step.seconds * 10 }
      : { send: commands.get(`${step.device}:${step.command}`) as { group: number; code: number } }));

    // Each device's inter key delay as the compiling account record states it, joined to the
    // configuration's devices by name. Captured after the compiles, so the settings as they then stood.
    const interKeyDelays = accountInterKeyDelays(c, groups);
    assert.deepEqual(interKeyDelays, { [tvGroup]: 1, [boxGroup]: 2, [receiverGroup]: 1 });
    const composed = composeSequence(c, { steps: stepsOf(mine), pauseGroups: groups, interKeyDelays,
                                          copies: ['key', 'screen'] });
    const netflixComposed = composeSequence(c, { steps: stepsOf(netflix), pauseGroups: groups, interKeyDelays,
                                                 copies: ['screen', 'screen'] });
    // Every send list already exists, and it is the one Logitech's copies call.
    assert.deepEqual(composed.created, []);
    assert.deepEqual(netflixComposed.created, []);
    const out = parse(composed.bytes);
    const outNetflix = parse(netflixComposed.bytes);
    const [key, screen] = composed.lists as [number, number];
    assert.ok(same(body(out, key), body(c, mineKey)), 'MySequence, the key copy');
    const mineScreens = lists.filter((one) => body(c, one).length === 34
      && body(c, one)[0]?.opcode === SCREEN_ITEM_BEEP.opcode);
    assert.equal(mineScreens.length, 2, 'the screen copy and its page copy');
    for (const one of mineScreens) assert.ok(same(body(out, screen), body(c, one)), 'MySequence, a screen copy');
    const netflixScreens = lists.filter((one) => body(c, one).length === 9);
    assert.equal(netflixScreens.length, 2);
    for (const [k, one] of netflixScreens.entries()) {
      assert.ok(same(body(outNetflix, netflixComposed.lists[k] as number), body(c, one)), 'Netflix, a screen copy');
    }
    // 34 deep at most. Section 238's 35, the figure the hang was set against, is the sixth list's below,
    // whose one extra call comes first and so sits on top of the whole body.
    assert.equal(composed.peak, 34);
    // **The control on the quantity**: the set top box's own device mode lists carry 1, and reusing them,
    // which is what the first version of this composer did, appends lists Logitech did not write.
    const atOne = composeSequence(c, { steps: stepsOf(mine), pauseGroups: groups,
                                       interKeyDelays: { ...interKeyDelays, [boxGroup]: 1 } });
    assert.ok(atOne.created.length > 0);
    assert.ok(!same(body(parse(atOne.bytes), atOne.lists[0] as number), body(c, mineKey)));

    // **The sixth list is not reproduced and that is a finding, not a gap in the test.** The other key,
    // scan 17, runs the body after one more call: a set top box command, the one the activity's scan 17
    // sent before the sequence was bound to it.
    const other = keyCopies.find((one) => one !== mineKey) as number;
    assert.equal(body(c, other).length, 34);
    assert.ok(same(body(c, other).slice(1), body(c, mineKey)));
    const lead = (body(c, other)[0] as Instruction);
    assert.equal(lead.opcode, CALL);
    const leadSends = infraredCodesPerList(c).get(lead.operand) ?? [];
    assert.equal(leadSends.length, 1);
    assert.equal(leadSends[0]?.group, boxGroup);
    if (name === 'one_spare_20260830') assert.deepEqual(leadSends, [{ group: 2, code: 26 }]);
  }
  // **The control on the order**: descending group number fits the spare's own compile and no other.
  assert.equal(descendingFits, 1);
});

test('the wrong readings of a pause each fail to reproduce MySequence', skipUnless('one_spare_20260830'), () => {
  // The control. Each is a rule a single sample could have been read as; each produces a list that is
  // not the one Logitech compiled.
  const c = parse(require_('one_spare_20260830'));
  const tv = activities(c).find((one) => one.name === 'TV kijken')!;
  const groups = activityPauseGroups(c, tv.set);
  const mine = authored()[1] as Authored;
  const keyCopy = pauseShaped(c).find((one) => body(c, one).length === 33) as number;
  const commands = commandsOf(c, mine, keyCopy, groups);
  const right = (steps: SequenceStep[], g: readonly number[]) => sequenceBody(steps, (group, code) => {
    for (const value of commands.values()) if (value.group === group && value.code === code) return value.list;
    throw new Error('no list');
  }, g);
  const steps = (tenths: (seconds: number) => number): SequenceStep[] => mine.steps.map((step) => ('seconds' in step
    ? { pause: tenths(step.seconds) }
    : { send: commands.get(`${step.device}:${step.command}`) as { group: number; code: number } }));
  const compiled = body(c, keyCopy);
  assert.ok(same(right(steps((s) => s * 10), groups), compiled), 'the reading under test');
  assert.ok(!same(right(steps((s) => s), groups), compiled), 'a wait in whole seconds');
  assert.ok(!same(right(steps((s) => s * 10), [...groups].sort((a, b) => a - b)), compiled), 'devices ascending');
  assert.ok(!same(right(steps((s) => s * 10), [groups[0] as number]), compiled), 'one quantity per pause');
  assert.ok(!same(right(steps((s) => s * 10), [2]), compiled), 'the set top box alone, which most steps send to');
  // Merging the 3 and 20 second pauses into one 23 second wait.
  const merged: SequenceStep[] = [];
  for (const step of steps((s) => s * 10)) {
    const last = merged[merged.length - 1];
    if ('pause' in step && last !== undefined && 'pause' in last) merged[merged.length - 1] = { pause: last.pause + step.pause };
    else merged.push(step);
  }
  assert.ok(!same(right(merged, groups), compiled), 'consecutive pauses merged');
});

test('Logitech wrote the 20 second pause as one 0x7C of 200, past the hundred section 70 read as never exceeded',
     skipUnless('one_spare_20260830'), () => {
  // A correction to section 70's corpus statement, which held over the twelve containers it counted.
  const c = parse(require_('one_spare_20260830'));
  const values = (c.actionLists() ?? []).flat().filter((one) => one.opcode === QUANTITY)
    .map((one) => one.operand & 0xff).filter((value) => value > 100);
  // Every one of them is the 20 second pause: once per device of the activity in each of the four
  // MySequence lists, the two key copies and the screen copy with its page copy.
  assert.deepEqual([...new Set(values)], [200]);
  assert.equal(values.length, 12, 'four copies of MySequence, three devices each');
});

test('a sequence composed onto the Harmony 650: a missing send list is made with the device\'s own delay step',
     skipUnless('h650_config_region'), () => {
  const c = parse(require_('h650_config_region'));
  const tv = activities(c).find((one) => one.name === 'TV kijken');
  assert.ok(tv !== undefined);
  const groups = activityPauseGroups(c, tv.set);
  assert.deepEqual(groups, [0, 1, 3]);
  // Most codes of this configuration have a send list at 1, 369 of 419, so the case that makes a list is
  // a device whose inter key delay is not 1: the set top box here at 2, as the spare Harmony One's was.
  const codes = infraredCodesPerList(c);
  // A set top box code with no list at 2, found rather than named: its digits have lists at its own
  // inter key delay already, section 320's digit copies.
  const atTwo = new Set([...codes.entries()]
    .filter(([list, sent]) => sent.length === 1 && sent[0]?.group === 1 && body(c, list)[2]?.operand === 0x102)
    .map(([, sent]) => sent[0]?.code));
  let code = 0;
  while (atTwo.has(code)) code += 1;
  const composed = composeSequence(c, {
    steps: [{ send: { group: 0, code: 3 } }, { pause: 10 }, { send: { group: 1, code } }],
    pauseGroups: groups,
    interKeyDelays: { 0: 1, 1: 2 },
  });
  const out = parse(composed.bytes);
  assert.equal(composed.created.length, 1);
  assert.equal(composed.sendLists.get(`1:${code}`), composed.created[0]);
  // The television's command reuses Logitech's list at 1.
  const tvList = composed.sendLists.get('0:3') as number;
  assert.ok(tvList < (c.actionLists() ?? []).length);
  assert.deepEqual(codes.get(tvList), [{ group: 0, code: 3 }]);
  // The send, then its own load and condition, the condition calling the set top box's one delay list
  // with the operands its other commands' pairs carry, section 287.
  const made = composed.created[0] as number;
  const prelude = sendPreludes(c).filter((one) => one.group === 1);
  assert.equal(new Set(prelude.map((one) => one.delay)).size, 1);
  assert.deepEqual(body(out, made), [
    { opcode: CALL, operand: made + 1 }, { opcode: 0x7d, operand: 0x100 | code }, { opcode: QUANTITY, operand: 0x102 },
  ]);
  assert.deepEqual(body(out, made + 1), [
    { opcode: 0x1f, operand: prelude[0]?.loadOperand }, { opcode: CALL, operand: made + 2 },
  ]);
  assert.deepEqual(body(out, made + 2), [
    { opcode: 0x71, operand: prelude[0]?.conditionOperand }, { opcode: CALL, operand: prelude[0]?.delay },
  ]);
  // And the reader of that shape reads it as one of the device's own.
  assert.ok(sendPreludes(out).some((one) => one.list === made && one.delay === prelude[0]?.delay));
  assert.deepEqual(body(out, composed.lists[0] as number), [
    { opcode: CALL, operand: tvList },
    { opcode: QUANTITY, operand: 10 }, { opcode: QUANTITY, operand: 0x10a }, { opcode: QUANTITY, operand: 0x30a },
    { opcode: CALL, operand: composed.created[0] },
  ]);
  assert.doesNotThrow(() => assertQueueFits(out));
  assert.equal(composed.peak, 8);
});

test('bound to a key of the activity, the sequence is what that key runs', skipUnless('h650_config_region'), () => {
  const c = parse(require_('h650_config_region'));
  const tv = activities(c).find((one) => one.name === 'TV kijken')!;
  const composed = composeSequence(c, {
    steps: [{ send: { group: 1, code: 3 } }, { pause: 20 }, { send: { group: 1, code: 4 } }],
    pauseGroups: activityPauseGroups(c, tv.set),
    interKeyDelays: { 1: 1 },
  });
  const out = parse(composed.bytes);
  const set = taggedList(out, handlerSets(out)!.addresses[tv.set] as number)!;
  // A key the activity binds by one press and nothing else, the first one, found rather than named.
  const scans = set.entries.map((one) => one.tag & 0x3f);
  const scan = scans.find((one, k) => scans.indexOf(one) === k && scans.lastIndexOf(one) === k
    && (set.entries[k] as { tag: number; opcode: number }).tag >> 6 === 2
    && (set.entries[k] as { opcode: number }).opcode === CALL) as number;
  const bound = parse(applyEdits(out, bindKeyToList(out, tv.set, scan, composed.lists[0] as number)).bytes);
  const entry = taggedList(bound, handlerSets(bound)!.addresses[tv.set] as number)!.entries
    .find((one) => (one.tag & 0x3f) === scan)!;
  assert.equal(entry.operand, composed.lists[0]);
  assert.doesNotThrow(() => assertQueueFits(bound));
  // A key the activity does not bind is refused, since binding it is a length change.
  const unbound = [...Array(64).keys()].find((one) => !scans.includes(one)) as number;
  assert.throws(() => bindKeyToList(out, tv.set, unbound, composed.lists[0] as number), EditError);
  // And so is a key bound twice, a press and a repeat, which would keep its old command while held.
  const twice = scans.find((one) => scans.indexOf(one) !== scans.lastIndexOf(one));
  if (twice !== undefined) assert.throws(() => bindKeyToList(out, tv.set, twice, composed.lists[0] as number), EditError);
});

test('the composer refuses a sequence the action queue cannot hold, at the exact boundary',
     skipUnless('h650_config_region', 'one_spare_20260830', 'h525_config'), () => {
  const c = parse(require_('h650_config_region'));
  const tv = activities(c).find((one) => one.name === 'TV kijken')!;
  const groups = activityPauseGroups(c, tv.set);
  const sends = (n: number): SequenceStep[] => Array.from({ length: n }, () => ({ send: { group: 1, code: 3 } }));
  // Sends alone: the list is spooled whole and the first send's delay step nests three deep.
  const fits = composeSequence(c, { steps: sends(37), pauseGroups: groups, interKeyDelays: { 1: 1 } });
  assert.equal(fits.peak, ACTION_QUEUE_INSTRUCTIONS);
  assert.throws(() => composeSequence(c, { steps: sends(38), pauseGroups: groups, interKeyDelays: { 1: 1 } }), QueueError);
  // **Logitech's own step limit is not a safe bound**: 25 steps, 11 commands and 14 pauses on a three
  // device activity is 11 + 14 * 3 = 53 instructions in one list, which their editor allows.
  const atTheirLimit: SequenceStep[] = [];
  for (let k = 0; k < 25; k += 1) atTheirLimit.push(k % 2 === 0 && k < 22 ? { send: { group: 1, code: 3 } } : { pause: 10 });
  assert.equal(atTheirLimit.length, 25);
  assert.equal(atTheirLimit.filter((one) => 'pause' in one).length, 14);
  assert.throws(() => composeSequence(c, { steps: atTheirLimit, pauseGroups: groups, interKeyDelays: { 1: 1 } }), QueueError);
  // The same on the Harmony One, where the remote that hung ran a sequence the queue held.
  const one = parse(require_('one_spare_20260830'));
  assert.throws(() => composeSequence(one, { steps: atTheirLimit.map((step) => ('send' in step
    ? { send: { group: 2, code: 19 } } : step)), pauseGroups: [3, 2, 0], interKeyDelays: { 2: 2 } }), QueueError);
  // A device sent to with no inter key delay, out of range waits, and an architecture this has not been
  // taught.
  assert.throws(() => composeSequence(c, { steps: sends(1), pauseGroups: groups, interKeyDelays: {} }), ComposeError);
  assert.throws(() => composeSequence(c, { steps: [{ pause: 256 }], pauseGroups: groups, interKeyDelays: {} }), ComposeError);
  assert.throws(() => composeSequence(c, { steps: [{ pause: 0 }], pauseGroups: groups, interKeyDelays: {} }), ComposeError);
  assert.throws(() => composeSequence(parse(require_('h525_config')), { steps: [{ pause: 10 }], pauseGroups: [0], interKeyDelays: {} }),
                ComposeError);
  // The queue model agrees with the composer's figure on the list it composed.
  assert.equal(queueRun(parse(fits.bytes), fits.lists[0] as number)?.peak, fits.peak);
});
