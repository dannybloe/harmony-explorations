/**
 * The Harmony One's lists below its screens, `todo-compile-one.md` 6.5, findings section 418: the base slot 10
 * lists the firmware screens, the fixed screens and the tour and Remote Assistant reach only through a list of
 * their own, and the lists the transitions of three of the wiring's own variables call. Each builder's own test
 * holds its rebuild byte for byte and its blind control, `touchfirmwarescreens.test.ts`,
 * `touchfixedscreens.test.ts`, `touchtourscreens.test.ts` and `wiring-one.test.ts`; this file holds the claims
 * that span them.
 *
 * **Who builds a list below is the claim worth a test of its own.** Logitech's compiler shares some of these
 * lists between screens that belong to different builders, channel 7's off list among them, and copies others.
 * Section 418's rule is that every screen set reaching a list the wiring does not build states it, so a shared
 * list is built by each of its sets, identically, and the composed path's attribution gives its bytes to the first
 * in `TOUCH_BUILT` order. Two things would break that silently: a set stating a list the wiring also builds, which
 * the attribution would hand to the set, and a set leaving below it a list nobody builds, which would stay the
 * donor's on the composed path. `leftBelow` measures both, and both are pinned empty here.
 *
 * Every figure is exact, and the populations are literals in this file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import { type Container, ScreenRecordError, layOutContainer, parse, stateRecords, takeApart } from '../src/index.ts';
import { STATE_TABLE_SLOT } from '../src/sections.ts';
import { WiringError, compareWiring, tablePiece, tableTargets } from '../src/wiringparts.ts';
import { buildTouchFirmwareScreens, describeTouchFirmwareScreens } from '../src/families/touch/firmwarescreens.ts';
import {
  TOUCH_FIXED_SCREENS, buildTouchFixedScreens, describeTouchFixedScreens, touchFixedScreenModes, withTouchFixedScreens,
} from '../src/families/touch/fixedscreens.ts';
import {
  TOUCH_ASSISTANT_SCREENS, TOUCH_TOUR_SCREENS, buildTouchTourScreens, describeTouchTourScreens, withTouchTourScreens,
} from '../src/families/touch/tourscreens.ts';
import { buildTouchWiring, describeTouchWiring } from '../src/families/touch/wiring.ts';
import { touchStartupVariables } from '../src/families/touch/startupassistant.ts';
import { leftBelow, namedByRecords } from './screenlists.ts';

/** The sixteen English compiles of skin 54, section 405, and of them the five where "Devices Off Again" stops. */
const SIXTEEN = ['harvest_one_two_devices', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830',
  'calibration_one', 'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2',
  'compiled_protocols_3', 'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3',
  'one_friend_legacy_sync_config', 'phase7_before', 'phase7_after'] as const;
const STOPS = new Set(['one_spare_20260830', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2', 'compiled_protocols_3']);

/** The nineteen Harmony One compiles of section 405, `wiring-one.test.ts`' list. */
const ONES = [...SIXTEEN, 'one_config', 'one_config_unprogrammed', 'one_friend_asfound_config'] as const;

const CALL = 0x7f;

/** What the three screen sets and the wiring build on one compile, each a map of list index to bytes. */
function builds(c: Container): { firmware: Map<number, Uint8Array>; fixed: Map<number, Uint8Array>; tour: Map<number, Uint8Array>; wiring: Set<number> } {
  const layout = takeApart(c);
  const bytesOf = (lists: Map<number, { bytes: Uint8Array }>): Map<number, Uint8Array> =>
    new Map([...lists].map(([index, piece]) => [index, piece.bytes]));
  return {
    firmware: bytesOf(buildTouchFirmwareScreens(c, describeTouchFirmwareScreens(c, layout).spec).lists),
    fixed: bytesOf(buildTouchFixedScreens(c, describeTouchFixedScreens(c, layout).spec).lists),
    tour: bytesOf(buildTouchTourScreens(c, describeTouchTourScreens(c, layout).spec).lists),
    wiring: new Set(buildTouchWiring(describeTouchWiring(layout)).lists.keys()),
  };
}

/**
 * A list's instructions as text with the configuration's numbers left out, so one shape reads the same on every
 * compile: a call, an enter and a state write by their kind, every other instruction by opcode and operand.
 */
function shape(bytes: Uint8Array): string {
  const out: string[] = [];
  for (let k = 0; k < (bytes[0] as number); k += 1) {
    const operand = (bytes[1 + 3 * k] as number) | ((bytes[2 + 3 * k] as number) << 8);
    const opcode = bytes[3 + 3 * k] as number;
    if (opcode === CALL) out.push('call');
    else if (opcode === 0x7e) out.push('enter');
    else if (opcode >= 0x80) out.push(`write ${operand}`);
    else out.push(`${opcode.toString(16).padStart(2, '0')} ${operand.toString(16).padStart(4, '0')}`);
  }
  return out.join(' | ');
}

test('section 418: on the sixteen, below the lists the firmware screens, the fixed screens and the tour build there are 6, 5 and 7 lists, 6 on the five where "Devices Off Again" stops, every one the wiring\'s, and none of the lists the three build is the wiring\'s',
     skipUnless(...SIXTEEN), () => {
  const found = SIXTEEN.map((name) => {
    const c = parse(require_(name));
    const built = builds(c);
    // The first list below each set that is not its own, through every call, set against the wiring's: `notWiring`
    // is what no builder would make, `both` what two would.
    const below = (lists: Map<number, Uint8Array>) => {
      const { left, notWiring, both } = leftBelow(c, new Set(lists.keys()), built.wiring);
      return { lists: lists.size, left, notWiring: notWiring.length, both: both.length };
    };
    return [name, { firmware: below(built.firmware), fixed: below(built.fixed), tour: below(built.tour) }] as const;
  });
  // The firmware screens' 196 are their 178 and 18 below, the fixed screens' 685 their 531 and 154 and the tour's
  // 115 or 111 their 98 and 17 or 13; what is left below each is the wiring's: its key light lists, `lights` and
  // `events`, and below the firmware screens and the tour a few of its start up and settling lists.
  const leads = {
    firmware: { lists: 196, left: 6, notWiring: 0, both: 0 },
    fixed: { lists: 685, left: 5, notWiring: 0, both: 0 },
    tour: { lists: 115, left: 7, notWiring: 0, both: 0 },
  };
  const stops = { ...leads, tour: { lists: 111, left: 6, notWiring: 0, both: 0 } };
  assert.deepEqual(Object.fromEntries(found), Object.fromEntries(SIXTEEN.map((name) => [name, STOPS.has(name) ? stops : leads])));
});

test('section 418: the lists two screen sets build are built the same by each: channel 7\'s and the page keys\' off lists by all three, channel 5\'s by the fixed screens and the tour, and the Remote Assistant\'s turning on by those two on the eleven where "Devices Off Again" leads on to the tour',
     skipUnless(...SIXTEEN), () => {
  const found = SIXTEEN.map((name) => {
    const c = parse(require_(name));
    const { firmware, fixed, tour } = builds(c);
    const sets = { firmware, fixed, tour };
    const holders = new Map<number, string[]>();
    for (const [set, lists] of Object.entries(sets)) for (const index of lists.keys()) holders.set(index, [...(holders.get(index) ?? []), set]);
    const shared: string[] = [];
    for (const [index, by] of holders) {
      if (by.length < 2) continue;
      // Each set's bytes for the list, which have to be one: otherwise the attribution would credit the first set
      // with bytes another set builds otherwise, and only the first would ever be compared.
      const bytes = new Set(by.map((set) => Buffer.from(sets[set as keyof typeof sets].get(index)!).toString('hex')));
      assert.equal(bytes.size, 1, `${name}: list ${index}`);
      shared.push(`${by.join(' and ')}: ${shape(firmware.get(index) ?? fixed.get(index)!)}`);
    }
    return [name, shared.sort()] as const;
  });
  // The off lists end in a write of 0 to a variable of the key lights', and the Remote Assistant's turning on is
  // section 403's `07 FFFB`, a call of the wiring's `lights`, entering the tour's "Welcome!" and a write of 1 to the
  // assistant's variable; the variables, the list and the mode differ by compile and are read.
  const always = [
    'firmware and fixed and tour: 3f c030 | 3f c010 | write 0',
    'firmware and fixed and tour: 3f c070 | write 0',
    'fixed and tour: 3f c050 | write 0',
  ];
  const on = 'fixed and tour: 07 fffb | call | enter | write 1';
  assert.deepEqual(Object.fromEntries(found), Object.fromEntries(SIXTEEN.map((name) => [name, (STOPS.has(name) ? always : [...always, on]).sort()])));
});

test('section 418: the transitions of the wiring\'s readyVar, relightVar and settleVar call 14 lists on all 19 One compiles, the four each transition calls named by that variable\'s record and by no list, the other ten each called by one list of the 14 and by no other',
     skipUnless(...ONES), () => {
  const TRANSITIONS = { readyVar: 1, relightVar: 2, settleVar: 1 };
  const found = ONES.map((name) => {
    const c = parse(require_(name));
    const spec = describeTouchWiring(takeApart(c));
    const own = new Map(Object.entries(spec.lists).filter(([symbol]) => /^(readyVar|relightVar|settleVar)\.t/.test(symbol)));
    const indices = new Set(own.values());
    const callers = new Map<number, number[]>();
    (c.actionLists() ?? []).forEach((list, index) => {
      for (const one of list) if (one.opcode === CALL && indices.has(one.operand)) callers.set(one.operand, [...(callers.get(one.operand) ?? []), index]);
    });
    const records = stateRecords(c) ?? [];
    let first = 0;
    let inner = 0;
    for (const [symbol, index] of own) {
      const by = callers.get(index) ?? [];
      const top = /^\w+\.t\d+$/.test(symbol);
      if (top) {
        // A transition's list: the record of its variable calls it at the transition's place, and no list does.
        const [variable, t] = symbol.split('.t') as [keyof typeof TRANSITIONS, string];
        const value = records[spec.variables[variable] as number]?.values[Number(t)];
        assert.deepEqual([value?.opcode, value?.operand, by.length], [CALL, index, 0], `${name}: ${symbol}`);
        first += 1;
      } else {
        // A list below one: called once, by its parent among the 14.
        const parent = own.get(symbol.slice(0, symbol.lastIndexOf('.')));
        assert.deepEqual(by, [parent], `${name}: ${symbol}`);
        inner += 1;
      }
    }
    // And each record holds exactly the transitions the catalogue names, so none is left unbuilt.
    const held = Object.entries(TRANSITIONS).map(([variable]) => records[spec.variables[variable] as number]?.values.length);
    return [name, { lists: own.size, first, inner, held }] as const;
  });
  assert.deepEqual(Object.fromEntries(found), Object.fromEntries(ONES.map((name) => [name, { lists: 14, first: 4, inner: 10, held: [1, 2, 1] }])));
});

/** The first offset two files differ at, or undefined where they are the same. */
function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  const length = Math.max(a.length, b.length);
  for (let at = 0; at < length; at += 1) if (a[at] !== b[at]) return at;
  return undefined;
}

test('section 418: the controls fail: a list below the fixed screens and one below the tour moved to the next index, the tour\'s setting the other way, a variable a list below writes moved, two transitions\' lists swapped, and a record holding a transition more than the wiring\'s',
     skipUnless('harvest_one_two_devices', 'one_spare_20260830'), () => {
  const c = parse(require_('harvest_one_two_devices'));
  const differs = /the rebuilt file differs/;
  const refused = (pattern: RegExp) => (e: Error): boolean => e instanceof ScreenRecordError && pattern.test(e.message);
  type Fixed = ReturnType<typeof describeTouchFixedScreens>['spec'];
  const fixed = (change: (spec: Fixed) => void): void => {
    const layout = takeApart(c);
    const d = describeTouchFixedScreens(c, layout);
    change(d.spec);
    const out = layOutContainer(withTouchFixedScreens(layout, buildTouchFixedScreens(c, d.spec), d.place)).bytes;
    if (firstDifference(out, c.blob) !== undefined) throw new ScreenRecordError('the rebuilt file differs');
  };
  type Tour = ReturnType<typeof describeTouchTourScreens>['spec'];
  const tour = (on: Container, change: (spec: Tour) => void): void => {
    const layout = takeApart(on);
    const d = describeTouchTourScreens(on, layout);
    change(d.spec);
    const out = layOutContainer(withTouchTourScreens(layout, buildTouchTourScreens(on, d.spec), d.place)).bytes;
    if (firstDifference(out, on.blob) !== undefined) throw new ScreenRecordError('the rebuilt file differs');
  };
  fixed(() => undefined);
  tour(c, () => undefined);

  // The lists below a set's own, and of a screen's numbers the first that is one, one on: below the fixed screens
  // the index moves onto another list they build, and below the tour onto a list no record of theirs runs.
  const below = (lists: Iterable<number>, modes: Set<number>): Set<number> => {
    const own = namedByRecords(c, modes);
    return new Set([...lists].filter((index) => !own.has(index)));
  };
  const fixedBelow = below(buildTouchFixedScreens(c, describeTouchFixedScreens(c, takeApart(c)).spec).lists.keys(), new Set(touchFixedScreenModes(c)));
  const options = TOUCH_FIXED_SCREENS.indexOf('Options');
  assert.throws(() => fixed((spec) => {
    const numbers = (spec.screens[options] as { numbers: number[] }).numbers;
    numbers[numbers.findIndex((n) => fixedBelow.has(n))]! += 1;
  }), refused(/^list \d+ is built two ways$/));
  const names = [...TOUCH_TOUR_SCREENS, ...TOUCH_ASSISTANT_SCREENS];
  const d = describeTouchTourScreens(c, takeApart(c));
  const tourBelow = below(buildTouchTourScreens(c, d.spec).lists.keys(), new Set(d.spec.screens.map((one) => one.mode)));
  const again = names.indexOf('Assistant Devices Off Again');
  assert.throws(() => tour(c, (spec) => {
    const numbers = (spec.screens[again] as { numbers: number[] }).numbers;
    numbers[numbers.findIndex((n) => tourBelow.has(n))]! += 1;
  }), refused(/^list \d+ is not one the configuration's records run$/));
  // "Devices Off Again"'s OK stopping where it leads on to the tour, which leaves the numbers of the four lists
  // below the stop unread, and leading on where it stops, which reads the numbers that follow as a variable.
  assert.throws(() => tour(c, (spec) => { spec.onToTour = false; }), refused(/^the description holds 20 numbers more than Assistant Devices Off Again takes$/));
  const stops = parse(require_('one_spare_20260830'));
  tour(stops, () => undefined);
  assert.throws(() => tour(stops, (spec) => { spec.onToTour = true; }), refused(/^\d+ is not a variable a state write can name$/));
  // The variable the Remote Assistant's turning on writes 1 to, below Options' Remote Assistant row, one on. The
  // list is reached from both of Options' pages and read twice, so both readings move, or the build would refuse
  // the list for being built two ways before the comparison ran.
  const assistant = touchStartupVariables(c).assistant as number;
  assert.throws(() => fixed((spec) => {
    const numbers = (spec.screens[options] as { numbers: number[] }).numbers;
    numbers.forEach((n, k) => { if (n === assistant) numbers[k] = n + 1; });
  }), differs);

  // The wiring: readyVar's and settleVar's transition lists swapped, which the byte comparison names, and a relightVar
  // record holding three transitions, which the description refuses before anything is built.
  const layout = takeApart(c);
  const spec = describeTouchWiring(layout);
  // Swapped rather than moved on: every index near them is a list the wiring builds already, and the engine
  // refuses one index built as two lists before anything is compared.
  const moved = { ...spec, lists: { ...spec.lists, 'readyVar.t0': spec.lists['settleVar.t0']!, 'settleVar.t0': spec.lists['readyVar.t0']! } };
  assert.throws(() => compareWiring(c, takeApart(c), buildTouchWiring(moved)),
    (e: Error) => e instanceof WiringError && /^the built wiring differs from the configuration's at byte \d+/.test(e.message));
  const tampered = takeApart(c);
  const record = tableTargets(tablePiece(tampered, STATE_TABLE_SLOT))[spec.variables.relightVar as number]!;
  record.bytes[4] = (record.bytes[4] as number) + 1;
  assert.throws(() => describeTouchWiring(tampered),
    (e: Error) => e instanceof WiringError && e.message === 'relightVar\'s record holds 3 transitions, where the wiring\'s holds 2');
});
