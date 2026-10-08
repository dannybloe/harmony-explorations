/**
 * The activity keys of a Harmony 600, 650 and 700, read and edited, section 314.
 *
 * The calibration is Logitech's own compiles: every key in them is either a select Logitech wrote for
 * an activity or the call Logitech wrote for an empty key, so an edit that moves an activity can be
 * scored against the bytes Logitech wrote for that same activity on another key, and an edit that
 * empties a key against the bytes Logitech wrote for an empty one.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import { activities as activityList, activityKeys as keysOf, parse as parseConfig } from '../src/index.ts';
import {
  ACTIVITY_KEYS,
  type ActivityKey,
  ACTIVITY_STATE_NAME,
  activityKeyEntry,
  activityKeys,
  activityOfSet,
  applyEdits,
  clearActivityKey,
  ComposeError,
  composeActivity,
  coverage,
  EditError,
  firmwareStateVariableMax,
  handlerSetRoles,
  idleActivityValue,
  parse,
  placeholderList,
  placeholderMode,
  roundTrip,
  setActivityKey,
  stateVariables,
  trailerAgrees,
} from '../src/index.ts';

/** The thirteen Logitech compiles section 314 measured, the same population as the inventory test's. */
const COMPILES = ['h600_config', 'calibration_h600', 'h650_config_region',
  'h650_panasonic_config', 'h650_power_hold_compile', 'h650_power_hold_compile_2', 'h700_config',
  'h700_config_2', 'h700_28_config_region', 'h700_power_hold_compile', 'h700_power_hold_compile_2',
  'h700_power_hold_compile_3', 'h700_power_hold_compile_4'] as const;

const KEYS = Object.keys(ACTIVITY_KEYS) as ActivityKey[];

/** The three instruction bytes of a key's entry, which is what both edits replace. */
function instruction(bytes: Uint8Array, at: number): number[] {
  return [...bytes.subarray(at, at + 3)];
}

/**
 * What a finished edit has to be, beyond its own claim: accounted for exactly as its input was,
 * consistent, and reproduced by the emitter.
 *
 * The accounting is compared with the input's rather than with the whole file, because one of the
 * thirteen, `h650_panasonic_config`, has 14 bytes no reader claims before anything is edited, and a
 * same length edit should neither cure nor cause that.
 */
function assertWhole(name: string, before: { accounted: number; total: number }, bytes: Uint8Array): void {
  const after = parse(bytes);
  const report = coverage(after);
  assert.equal(report.total, before.total, `${name}: the same length`);
  assert.equal(report.accounted, before.accounted, `${name}: every byte claimed that was claimed before`);
  assert.deepEqual(report.overlaps, [], `${name}: and no byte twice`);
  assert.ok(trailerAgrees(after), `${name}: the trailer checksum recomputes`);
  assert.equal(roundTrip(after).equal, true, `${name}: the emitter reproduces the edited file`);
}

test('the reader finds what section 314 counted: a select on Watch TV and Watch a Movie, and Listen to Music empty on six',
     skipUnless(...COMPILES), () => {
  const tally = new Map<string, number>();
  for (const name of COMPILES) {
    const c = parse(require_(name));
    const roles = handlerSetRoles(c);
    const placeholder = placeholderList(c);
    for (const one of activityKeys(c)) {
      tally.set(`${one.key} ${one.kind}`, (tally.get(`${one.key} ${one.kind}`) ?? 0) + 1);
      if (one.kind === 'activity') {
        // The independent check on `activityOfSet`: the menu rows say the same entry is an activity.
        assert.equal(roles[one.set!], 'activity', `${name}: ${one.key}`);
        assert.notEqual(activityOfSet(c, one.set!), undefined, `${name}: ${one.key}`);
      } else {
        // No compile holds an `other`, so anything that is not a select is the placeholder call.
        assert.equal(one.kind, 'placeholder', `${name}: ${one.key}`);
        assert.equal(one.list, placeholder, `${name}: the empty key calls the list placeholderList finds`);
      }
    }
    // The idle entry starts no activity by this test either, so it cannot be put on a key.
    const idle = roles.indexOf('idle');
    assert.ok(idle >= 0, name);
    const written = activityOfSet(c, idle);
    assert.ok(written === undefined || written === idleActivityValue(c), `${name}: the idle entry writes ${written}`);
  }
  assert.deepEqual(Object.fromEntries([...tally].sort()), {
    'Listen to Music activity': 7,
    'Listen to Music placeholder': 6,
    'Watch TV activity': 13,
    'Watch a Movie activity': 13,
  });
});

test('moving an activity onto another activity key writes the bytes Logitech wrote for it on its own key',
     skipUnless(...COMPILES), () => {
  let moved = 0;
  for (const name of COMPILES) {
    const c = parse(require_(name));
    const before = coverage(c);
    const keys = activityKeys(c);
    for (const from of keys) {
      for (const to of keys) {
        if (from === to || from.kind !== 'activity' || from.set === to.set) continue;
        const report = applyEdits(c, setActivityKey(c, to.key, from.set!));
        // Logitech's own encoding of "select this activity" is the instruction on its own key, so ours
        // has to be byte equal to it, landed on the other key's entry.
        assert.deepEqual(instruction(report.bytes, to.instructionAt), instruction(c.blob, from.instructionAt),
                         `${name}: ${from.key}'s activity on ${to.key}`);
        // And nothing else moved but the trailer, which is the last two bytes before the end cookie.
        const touched = report.changed.filter((run) => run.start < to.instructionAt || run.start >= to.instructionAt + 3);
        assert.ok(touched.every((run) => run.start >= c.blob.length - 8), `${name}: only the entry and the trailer`);
        // Read back through the locator rather than `activityKeys`, which also finds the placeholder by
        // its text and costs a second per call, so 66 of them would dominate the suite.
        const after = parse(report.bytes);
        const entry = activityKeyEntry(after, to.key);
        assert.deepEqual(entry.list.entries[entry.index]!.operand, 0xff00 | from.set!);
        assertWhole(`${name} ${from.key} to ${to.key}`, before, report.bytes);
        moved += 1;
      }
    }
  }
  // Every key holding an activity is moved onto each of the other two keys, the empty one included:
  // the 7 compiles with three distinct activities give six moves each, and the 6 with Listen to Music
  // empty give four, two of them onto the empty key.
  assert.equal(moved, 7 * 6 + 6 * 4);
});

test('emptying a key writes the call Logitech wrote for an empty key, and is refused where no such list exists',
     skipUnless(...COMPILES), () => {
  let emptied = 0;
  let refused = 0;
  for (const name of COMPILES) {
    const c = parse(require_(name));
    const keys = activityKeys(c);
    const empty = keys.find((one) => one.kind === 'placeholder');
    if (empty === undefined) {
      // All three keys taken: Logitech compiled no list entering the placeholder, so there is nothing
      // a same length edit can point the key at.
      assert.equal(placeholderList(c), undefined, name);
      // Stronger than the list's shape: no action list enters the placeholder mode at all.
      const mode = placeholderMode(c);
      assert.notEqual(mode, undefined, `${name}: the placeholder screen is there`);
      assert.equal((c.actionLists() ?? []).filter((list) => list.some((one) => one.opcode === 0x7e && one.operand === mode)).length,
                   0, name);
      assert.throws(() => clearActivityKey(c, 'Watch TV'), /holds no \[07 FFFD, 7E placeholder\] list/);
      refused += 1;
      continue;
    }
    const before = coverage(c);
    const report = applyEdits(c, clearActivityKey(c, 'Watch TV'));
    const watchTv = keys.find((one) => one.key === 'Watch TV')!;
    assert.deepEqual(instruction(report.bytes, watchTv.instructionAt), instruction(c.blob, empty.instructionAt), name);
    assertWhole(`${name} Watch TV emptied`, before, report.bytes);

    // The list outlives the key that called it: fill the empty key, so nothing calls the list any
    // more, and emptying another key still finds it, by the placeholder's text and the list's shape.
    const activity = keys.find((one) => one.kind === 'activity')!;
    const filled = parse(applyEdits(c, setActivityKey(c, empty.key, activity.set!)).bytes);
    assert.ok(activityKeys(filled).every((one) => one.kind === 'activity'), name);
    assert.equal(placeholderList(filled), empty.list, name);
    const again = applyEdits(filled, clearActivityKey(filled, 'Watch a Movie'));
    const watchAMovie = keys.find((one) => one.key === 'Watch a Movie')!;
    assert.deepEqual(instruction(again.bytes, watchAMovie.instructionAt), instruction(c.blob, empty.instructionAt), name);
    assertWhole(`${name} Watch a Movie emptied after filling`, before, again.bytes);
    emptied += 1;
  }
  assert.equal(emptied, 6);
  assert.equal(refused, 7);
});

test('only an activity\'s entry goes on a key, and only on a Harmony 600, 650 or 700',
     skipUnless('h650_config_region', 'one_config'), () => {
  const c = parse(require_('h650_config_region'));
  const roles = handlerSetRoles(c);
  // A prefix entry, the idle entry, one past the end and a fraction.
  assert.throws(() => setActivityKey(c, 'Watch TV', 0), /not an activity's/);
  assert.throws(() => setActivityKey(c, 'Watch TV', roles.indexOf('idle')), /not an activity's/);
  assert.throws(() => setActivityKey(c, 'Watch TV', roles.length), /no entry/);
  assert.throws(() => setActivityKey(c, 'Watch TV', 5.5), /no entry/);
  assert.throws(() => setActivityKey(c, 'More Activities' as ActivityKey, roles.indexOf('activity')), EditError);
  assert.throws(() => setActivityKey(c, 'toString' as ActivityKey, roles.indexOf('activity')), /not an activity key/);
  // The Harmony One's activity keys were not compared in section 314, so nothing here guesses at them.
  const one = parse(require_('one_config'));
  assert.throws(() => activityKeys(one), /Harmony 600, 650 or 700 only/);
  assert.throws(() => setActivityKey(one, 'Watch TV', 1), /Harmony 600, 650 or 700 only/);
});

test('a composed activity goes on the key it is given, and on no key without one',
     skipUnless('h650_config_region', 'h700_config', 'one_config'), () => {
  for (const name of ['h650_config_region', 'h700_config'] as const) {
    const c = parse(require_(name));
    const counter = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
    const target = stateVariables(c).find((one) =>
      one.index > firmwareStateVariableMax(c.architecture) && one.index !== counter?.index
      && (one.record?.second ?? 0) >= 1)!;
    const plain = composeActivity(c, { label: 'Radio', targets: [{ variable: target.index, value: 1 }] });
    const keyed = composeActivity(c, {
      label: 'Radio', targets: [{ variable: target.index, value: 1 }], activityKey: 'Listen to Music',
    });
    assert.equal(keyed.set, plain.set);
    const before = activityKeys(parse(plain.bytes));
    const after = activityKeys(parse(keyed.bytes));
    // The asked for key selects the new entry, the other two are as they were, and the composition
    // without a key left all three alone.
    assert.deepEqual(after.map((one) => [one.key, one.kind, one.set]), before.map((one) =>
      one.key === 'Listen to Music' ? [one.key, 'activity', keyed.set] : [one.key, one.kind, one.set]));
    assert.deepEqual(before.map((one) => [one.key, one.operand, one.opcode]),
                     activityKeys(c).map((one) => [one.key, one.operand, one.opcode]));
    assertWhole(`${name} composed on Listen to Music`, coverage(parse(plain.bytes)), keyed.bytes);
  }
  // Refused before anything is built, as a composer refusal.
  const one = parse(require_('one_config'));
  assert.throws(() => composeActivity(one, { label: 'Radio', targets: [], activityKey: 'Watch TV' }),
                (error: unknown) => error instanceof ComposeError && /cannot go on Watch TV/.test((error as Error).message));
});

test('an activity saved again as Custom keeps its Listen to Music key in Logitech\'s compile',
  skipUnless('h650_start_config', 'h650_options_config'), () => {
    // todo-compile-650 3.11's attempt at an empty key: Muziek saved again as Custom, its group read back
    // as 0 on the account. Logitech's compile still puts it on the Listen to Music key, and Kodi
    // kijken, Custom from the start, still holds no key. So the type does not decide the key alone.
    for (const name of ['h650_start_config', 'h650_options_config']) {
      const c = parseConfig(require_(name));
      const byset = new Map(activityList(c).map((one) => [one.set, one.name]));
      assert.deepEqual(keysOf(c).map((one) => [one.key, one.kind, byset.get((one as { set?: number }).set ?? -1)]), [
        ['Watch TV', 'activity', 'TV kijken'],
        ['Watch a Movie', 'activity', 'Film kijken'],
        ['Listen to Music', 'activity', 'Muziek'],
      ], name);
    }
  });

test('in every compile measured a key is empty only where the activities number two, fewer than the keys',
     skipUnless(...COMPILES, 'h650_start_config', 'h650_options_config'), () => {
  // Section 340: the measurement behind todo-compile-650 3.11's next step. It states the pattern over
  // these fifteen compiles and not its cause.
  const seen = [...COMPILES, 'h650_start_config', 'h650_options_config'].map((name) => {
    const c = parseConfig(require_(name));
    return [activityList(c).length, keysOf(c).filter((one) => one.kind !== 'activity').map((one) => one.key).join(',')];
  });
  const tally = new Map<string, number>();
  for (const [count, empty] of seen) tally.set(`${count}:${empty}`, (tally.get(`${count}:${empty}`) ?? 0) + 1);
  assert.deepEqual(Object.fromEntries([...tally].sort()), {
    '2:Listen to Music': 6, '3:': 2, '4:': 5, '5:': 2,
  });
});
