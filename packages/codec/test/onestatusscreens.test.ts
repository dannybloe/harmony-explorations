/**
 * Which of a Harmony One configuration's screens anything enters: the configuration's half of section 408,
 * for `todo-compile-one.md` 4.4.1.
 *
 * The firmware's half is `tests/test_status_screens.py`'s `OnTheHarmonyOneOnlyCodeNineIsDrawnFromTheConfiguration`:
 * the 3.4 firmware makes a mode current from an `0x7E` instruction's operand, the mode stack, or the event map,
 * and walks the configuration's event map for one status code only, 9, "LCD Module Failed". So a screen the
 * configuration's own instructions never enter, and the event map does not name for code 9, is never shown.
 * This file is the census of those instructions over Logitech's compiles.
 *
 * **An instruction is found wherever the readers know one sits**: every action list, every mode's own list and
 * page lists, base slot 9's handler sets, the timers, base slot 13's transitions, the value maps' one
 * instruction payloads, every screen program's queued instruction, and base slot 8's leading list. The same
 * walk as section 357's tour measurement, with the screen programs added.
 *
 * Every figure is exact, and the lists are literals in this file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  type Container,
  SCREEN_QUEUE_INSTRUCTION,
  archSlot,
  attributeScreens,
  eventMap,
  handlerSets,
  householdNames,
  modeRecords,
  modeRoles,
  parse,
  reachablePrograms,
  screenStrings,
  screenUnits,
  stateRecords,
  taggedList,
  timers,
  valueMaps,
} from '../src/index.ts';

/** The sixteen English compiles of skin 54, section 405's population. */
const SKIN_54 = ['harvest_one_two_devices', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830',
  'calibration_one', 'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2',
  'compiled_protocols_3', 'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3',
  'one_friend_legacy_sync_config', 'phase7_before', 'phase7_after'] as const;
/** The European skin's two compiles and the Dutch one, which section 405 measured beside them. */
const OTHERS = ['one_config', 'one_config_unprogrammed', 'one_friend_asfound_config'] as const;
const ALL = [...SKIN_54, ...OTHERS];

/** `0x7E`, enter a mode, and `0x7F`, call an action list. */
const ENTER = 0x7e;
const CALL = 0x7f;
/** The head of the mode table: 10 firmware screens, then one per status code. */
const FIRMWARE_SCREENS = 10;
const STATUS_CODES = 30;

/** Where an instruction sits, which is what decides what makes it run. */
type Holder =
  | { kind: 'list'; index: number }
  | { kind: 'mode'; tag: number }
  | { kind: 'set'; tag: number }
  | { kind: 'timer' | 'state' | 'value-map' | 'program' | 'lead' };
interface Site { opcode: number; operand: number; holder: Holder }

function sites(c: Container): Site[] {
  const out: Site[] = [];
  (c.actionLists() ?? []).forEach((list, index) => {
    for (const one of list) out.push({ ...one, holder: { kind: 'list', index } });
  });
  for (const record of modeRecords(c) ?? []) {
    const entries = [...record.entries, ...record.pages.flatMap((page) => taggedList(c, page.list)?.entries ?? [])];
    for (const e of entries) out.push({ opcode: e.opcode, operand: e.operand, holder: { kind: 'mode', tag: e.tag } });
  }
  for (const address of handlerSets(c)?.addresses ?? []) {
    for (const e of taggedList(c, address)?.entries ?? []) out.push({ opcode: e.opcode, operand: e.operand, holder: { kind: 'set', tag: e.tag } });
  }
  for (const timer of timers(c)?.records ?? []) out.push({ ...timer.instruction, holder: { kind: 'timer' } });
  for (const record of stateRecords(c) ?? []) {
    for (const v of record.values) out.push({ opcode: v.opcode, operand: v.operand, holder: { kind: 'state' } });
  }
  for (const map of valueMaps(c) ?? []) {
    for (const address of [...map.entries.map((one) => one[1]), ...map.ranges.map((one) => one[2])]) {
      const at = c.blobOffsetOf(address);
      if (at === undefined || c.blob[at] !== 0x11) continue;
      out.push({ operand: (c.blob[at + 1] as number) | ((c.blob[at + 2] as number) << 8), opcode: c.blob[at + 3] as number, holder: { kind: 'value-map' } });
    }
  }
  for (const [, instructions] of reachablePrograms(c)) {
    for (const one of instructions) {
      if (one.opcode !== SCREEN_QUEUE_INSTRUCTION) continue;
      out.push({ operand: (one.operands[0] as number) | ((one.operands[1] as number) << 8), opcode: one.operands[2] as number, holder: { kind: 'program' } });
    }
  }
  const lead = c.sections[archSlot(c.architecture as number, 8)];
  const at = c.blobOffsetOf(lead!.address) as number;
  for (let k = 0; k < (c.blob[at] as number); k += 1) {
    out.push({ operand: (c.blob[at + 1 + 3 * k] as number) | ((c.blob[at + 2 + 3 * k] as number) << 8), opcode: c.blob[at + 3 + 3 * k] as number, holder: { kind: 'lead' } });
  }
  return out;
}

/**
 * What finally runs each instruction that enters `mode`: walk up from an action list through every `0x7F`
 * naming it until a holder that is not a list. A key or a touch is a mode's or a handler set's entry whose
 * tag is a press, `0x80 | scan`, of a keypad scan, 1 to 40, or a touch scan, 43 to 55 (`reference/remotes/harmony-one/keys.md`).
 */
function roots(all: readonly Site[], mode: number): Set<string> {
  const callers = new Map<number, Site[]>();
  for (const one of all) if (one.opcode === CALL) callers.set(one.operand, [...(callers.get(one.operand) ?? []), one]);
  const out = new Set<string>();
  const seen = new Set<number>();
  const queue = all.filter((one) => one.opcode === ENTER && one.operand === mode);
  while (queue.length > 0) {
    const one = queue.shift() as Site;
    const h = one.holder;
    if (h.kind === 'list') {
      if (seen.has(h.index)) continue;
      seen.add(h.index);
      queue.push(...(callers.get(h.index) ?? []));
    } else if (h.kind === 'mode' || h.kind === 'set') {
      const scan = h.tag & 0x3f;
      const press = (h.tag & 0xc0) === 0x80;
      out.add(press && ((scan >= 1 && scan <= 40) || (scan >= 43 && scan <= 55)) ? 'key or touch' : `${h.kind} event`);
    } else {
      out.add(h.kind);
    }
  }
  return out;
}

function head(c: Container): { entered: number[]; map: [number, number][]; fallback: number } {
  const all = sites(c);
  const map = eventMap(c);
  assert.ok(map !== undefined);
  const entered: number[] = [];
  for (let m = 0; m < FIRMWARE_SCREENS + STATUS_CODES; m += 1) {
    if (all.some((one) => one.opcode === ENTER && one.operand === m)) entered.push(m);
  }
  return { entered, map: [...map.entries.entries()].sort((a, b) => a[0] - b[0]), fallback: map.fallback };
}

test('section 408: of the head of a Harmony One mode table, the configuration enters modes 0, 1 and 9 alone, and its event map names 10 to 39, code 9 naming mode 19, on all nineteen',
     skipUnless(...ALL), () => {
  for (const name of ALL) {
    const c = parse(require_(name));
    const { entered, map, fallback } = head(c);
    // Low Battery, USB Connected and the charging problem: entered by the wiring. The other seven firmware
    // screens and all thirty status screens are entered by no instruction anywhere in the file.
    assert.deepEqual(entered, [0, 1, 9], name);
    // Keys 0 to 29, key k naming mode 10 + k, so the key the firmware walks for, 9, names mode 19.
    assert.deepEqual(map, Array.from({ length: STATUS_CODES }, (_, k) => [k, FIRMWARE_SCREENS + k]), name);
    assert.equal(fallback, FIRMWARE_SCREENS, name);
    assert.equal(new Map(map).get(9), 19, name);
  }
});

test('section 408: above the head, one mode of each of the nineteen is named by no enter at all, a device list, and every instruction a configuration builds at run time is an 0x76, never an enter',
     skipUnless(...ALL), () => {
  for (const name of ALL) {
    const c = parse(require_(name));
    const b = c.blob;
    // The strong direction of a byte search: a mode number then 0x7E anywhere in the file, instruction or not.
    const named = new Set<number>();
    for (let i = 0; i + 2 < b.length; i += 1) if (b[i + 2] === ENTER) named.add((b[i] as number) | ((b[i + 1] as number) << 8));
    const roles = modeRoles(c);
    const unnamed = roles.map((_, m) => m).filter((m) => m >= FIRMWARE_SCREENS + STATUS_CODES && !named.has(m));
    assert.equal(unnamed.length, 1, name);
    assert.equal(roles[unnamed[0] as number], 'device-list', name);
    // The two forms that build an instruction at run time, sections 34 and 72: 0x7B takes the opcode from its
    // operand's high byte (0x25032 in the 3.4 image), an opcode 0x1F to 0x3E over 0xF7 from its low byte (0x254F0),
    // the operand coming from a register. Each compile holds seven or nine, every one `1F F776`, building an 0x76
    // and never an enter.
    const built = sites(c).flatMap((one) => one.opcode === 0x7b ? [one.operand >> 8]
      : one.opcode >= 0x1f && one.opcode <= 0x3e && (one.operand >> 8) === 0xf7 ? [one.operand & 0xff] : []);
    assert.equal(built.length, OTHERS.includes(name as (typeof OTHERS)[number]) ? 9 : 7, name);
    assert.deepEqual([...new Set(built)], [0x76], name);
  }
});

test('section 408: the screen code 9 walks to is "LCD Module Failed" on the eighteen English compiles',
     skipUnless(...ALL), () => {
  for (const name of ALL.filter((one) => one !== 'one_friend_asfound_config')) {
    const c = parse(require_(name));
    const pages = new Set((modeRecords(c)?.[19]?.pages ?? []).map((page) => page.program));
    const drawn = screenStrings(c).filter((one) => pages.has(one.program)).map((one) => one.text);
    assert.deepEqual(drawn, ['LCD Module', 'Failed'], name);
  }
});

test('section 408: every one of the 38 other fixed screens of skin 54 is entered by the configuration, 30 from a key or a touch, the Remote Assistant\'s first two from the start and six blank screens by timers alone',
     skipUnless(...SKIN_54), () => {
  const population = SKIN_54.map((name) => {
    const c = parse(require_(name));
    const units = screenUnits(c);
    assert.ok(units !== undefined, name);
    return { name, c, units, household: householdNames(c) };
  });
  for (const one of population) {
    const all = sites(one.c);
    const others = attributeScreens(one.units, population)
      .filter((a) => a.unit.kind === 'mode' && a.category === 'fixed')
      .map((a) => Number(a.unit.label.split(' ')[1]))
      .filter((m) => m >= FIRMWARE_SCREENS + STATUS_CODES);
    assert.equal(others.length, 38, one.name);
    const tally = { entered: 0, keyOrTouch: 0, lead: 0, timer: 0, timerOnly: 0, neither: [] as string[] };
    for (const m of others) {
      const r = roots(all, m);
      if (all.some((s) => s.opcode === ENTER && s.operand === m)) tally.entered += 1;
      if (r.has('key or touch')) tally.keyOrTouch += 1;
      if (r.has('lead')) tally.lead += 1;
      if (r.has('timer')) tally.timer += 1;
      if (r.size === 1 && r.has('timer')) tally.timerOnly += 1;
      if (!r.has('key or touch')) tally.neither.push([...r].sort().join(','));
    }
    assert.deepEqual([tally.entered, tally.keyOrTouch, tally.lead, tally.timer, tally.timerOnly], [38, 30, 3, 7, 6], one.name);
    // The eight with no key or touch behind them: two started by the leading list and an activity's handler
    // set, the Remote Assistant's "Welcome to your remote" and "Ensure all your devices are off", and six
    // that only a timer enters.
    assert.deepEqual(tally.neither.sort(), [...Array(2).fill('lead,set event'), ...Array(6).fill('timer')], one.name);
    // The two the start enters are the Remote Assistant's first two screens, by what they draw.
    const strings = screenStrings(one.c);
    const records = modeRecords(one.c) ?? [];
    const started = others.filter((m) => roots(all, m).has('lead') && !roots(all, m).has('key or touch'));
    const drawn = started.map((m) => {
      const pages = new Set((records[m]?.pages ?? []).map((page) => page.program));
      return strings.filter((s) => pages.has(s.program)).map((s) => s.text).join(' ');
    }).sort();
    assert.equal(drawn.length, 2, one.name);
    assert.ok(drawn[0]?.includes('Ensure all your devices are') && drawn[1]?.includes('Welcome to your remote.'), `${one.name}: ${drawn.join(' | ')}`);
  }
});
