/**
 * The Harmony One's activity screens as our builder makes them, checked against every activity of Logitech's One
 * compiles, findings section 402, `todo-compile-one.md` 1.2.11.2.6: each activity rebuilt from its name and its
 * pads onto its own compile, lettered in ours, and its working screen and start up screen compared with
 * Logitech's part by part.
 *
 * **What the comparison leaves out, each by a design choice section 399 or the builder's docstring records**:
 * where a text starts across, since our letters are other widths and a centred text moves with them; a font
 * select before every label, which ours makes for the blending; which list a screen queues or a timer it starts,
 * since ours shares one where Logitech gives each screen its own with the same instructions; a picture drawn
 * twice over one pad; and screen instruction 1, which 23 of the 64 carry in a program their working screen calls,
 * with operands naming the whole screen, and which is unread. Everything
 * else is compared: the record's key map and handlers, every page's hit areas and bindings, and every text, by
 * its height and its words, and every picture, by where it is drawn.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import { activities, activityScreens, type Container, modeRecords, parse, taggedList, touchPages } from '../src/index.ts';
import { touchOwner } from '../src/touch.ts';
import { deviceListRowMode, devices, idleActivityValue } from '../src/inventory.ts';
import { SCREEN_CALL, SCREEN_DRAW_IMAGE, SCREEN_JUMP, SCREEN_SELECT_FONT, SCREEN_SWITCH_NARROW, SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, screenProgram } from '../src/screen.ts';
import { deviceListMenus } from '../src/shared/menus.ts';
import { textGlyphs } from '../src/shared/spelling.ts';
import { characterMap, decode } from '../src/text.ts';
import { fontSets } from '../src/font.ts';
import { measureSet } from '../src/fonttable.ts';
import { buildTouchActivityScreens, touchActivityFonts } from '../src/families/touch/activityscreen.ts';
import { TOUCH_CHOICES } from '../src/families/touch/choices.ts';
import { fontsOfFace } from '../src/families/touch/labels.ts';
import { letterTouchDonor } from '../src/families/touch/look.ts';

/** The Harmony One compiles that hold an activity, fifteen of the nineteen. */
const WITH_ACTIVITIES = ['one_config', 'one_config_unprogrammed', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830',
  'calibration_one', 'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2',
  'compiled_protocols_3', 'one_friend_asfound_config', 'one_friend_legacy_sync_config', 'phase7_before', 'phase7_after'] as const;

/**
 * Where a working screen page draws its six pad boxes, in reading order. Which key a box is comes from the touch area
 * under its middle: on a screen with a Favourites key every pad is one key along, 50 to 53, 43 and 44, where it is
 * 49 to 53 and 43 on the rest.
 */
const PAD_PLACES = [[6, 38], [89, 38], [6, 92], [89, 92], [6, 146], [89, 146]] as const;
const PAD_SIZE = [81, 50] as const;

const hex = (n: number): string => n.toString(16);

/** A screen reduced to what it does, the parts the file's docstring names left out. */
function shapeOf(c: Container, mode: number, self: { working: number; startup: number }) {
  const lists = c.actionLists() ?? [];
  const record = modeRecords(c)![mode]!;
  const hits = touchPages(c)!;
  const map = characterMap(c);
  const deviceLists = new Set(deviceListMenus(c).menus);
  const modeName = (m: number): string =>
    m === self.working ? 'working' : m === self.startup ? 'startup' : deviceLists.has(m) ? 'device list' : 'another mode';
  const instruction = (one: { opcode: number; operand: number }, depth: number): string => {
    if (one.opcode === 0x7f) return depth < 3 ? `[${(lists[one.operand] ?? []).map((i) => instruction(i, depth + 1)).join(' ')}]` : 'call';
    if (one.opcode === 0x7e) return `enter ${modeName(one.operand)}`;
    if (one.opcode === 0x72 || one.opcode === 0x71) return `${hex(one.opcode)} map`;
    if (one.opcode === 0x1f && (one.operand & 0xff00) === 0xeb00) return 'timer start';
    if (one.opcode === 0x1f && (one.operand & 0xff00) === 0xea00) return 'timer cancel';
    return `${hex(one.opcode)}:${hex(one.operand)}`;
  };
  const entry = (one: { tag: number; opcode: number; operand: number }): string =>
    `${hex(one.tag)}=${one.opcode === 0 && one.operand === 0 ? 'nothing' : instruction(one, 0)}`;
  let instructionOne = 0;
  const program = (address: number, depth: number): string[] => {
    const out: string[] = [];
    for (const one of screenProgram(c, address) ?? []) {
      const o = one.opcode;
      if (o === SCREEN_CALL && depth < 3) out.push('call{', ...program(one.targets[0] as number, depth + 1), '}');
      else if (o === SCREEN_TEXT_INLINE || o === SCREEN_TEXT_AT) {
        const glyphs = textGlyphs(c, one);
        out.push(`text at ${one.operands[1]} "${glyphs === undefined || map === undefined ? '?' : decode(glyphs, map)}"`);
      } else if (o === SCREEN_DRAW_IMAGE) {
        const drawn = `picture at ${one.operands[0]},${one.operands[1]}`;
        if (out.at(-1) !== drawn) out.push(drawn);
      } else if (o === SCREEN_SELECT_FONT) continue;
      else if (o === 17 && one.operands[2] === 0x7f) {
        const queued = lists[(one.operands[0] as number) | ((one.operands[1] as number) << 8)] ?? [];
        out.push(`queue [${queued.map((i) => instruction(i, 1)).join(' ')}]`);
      } else if (o === 1) instructionOne += 1;
      else if (o === SCREEN_SWITCH_NARROW || o === SCREEN_JUMP) out.push(`op ${o}`);
      else out.push(`op ${o} ${[...one.operands].map(hex).join(' ')}`);
    }
    return out;
  };
  const pages = record.pages.map((page) => ({
    hits: (hits.records[page.lead as number]?.areas ?? []).map((a) => `${a.code} at ${a.x},${a.y},${a.width},${a.height}`),
    list: (taggedList(c, page.list)?.entries ?? []).map(entry),
    program: program(page.program, 0),
  }));
  return { record: record.entries.map(entry), pages, instructionOne };
}

test('section 402: our builder rebuilds 52 of the 64 activities of Logitech\'s One compiles part for part, and each of the other 12 is a feature it does not build or a letter ours lack',
     skipUnless(...WITH_ACTIVITIES), () => {
  const tally = { activities: 0, same: 0, favourites: 0, gaps: 0, picturePads: 0, notLettered: 0, instructionOne: 0, other: [] as string[] };
  for (const name of WITH_ACTIVITIES) {
    const original = parse(load(name) as Uint8Array);
    const screens = activityScreens(original)!.screens;
    tally.activities += screens.size;
    let c: Container;
    try {
      c = parse(letterTouchDonor(original, TOUCH_CHOICES).bytes);
    } catch (error) {
      // The one compile drawing a letter ours do not have, "ë"; its activities are counted and not rebuilt.
      assert.match((error as Error).message, /which our letters do not have/, name);
      tally.notLettered += screens.size;
      continue;
    }
    const lists = c.actionLists() ?? [];
    const map = characterMap(c)!;
    const deviceLists = new Set(deviceListMenus(c).menus);
    const records = modeRecords(c)!;
    const named = activities(c);
    const values = [...screens.keys()];
    const idle = idleActivityValue(c);
    let fresh = 0;
    while (values.includes(fresh) || fresh === idle) fresh += 1;
    for (const [value, working] of screens) {
      const activity = named.find((one) => one.activity === value)!;
      const startup = activity.modes[0] as number;
      const pages = records[working]!.pages;
      // What a pad holds is read off the page by its place: the key the touch area under its box reports, that
      // key's binding, and the text drawn inside the box.
      let favourites = false;
      const pads = pages.map((page) => {
        const entries = taggedList(c, page.list)?.entries ?? [];
        const areas = touchPages(c)!.records[page.lead as number]?.areas ?? [];
        const scans = PAD_PLACES.map(([x, y]) => touchOwner(areas, x + PAD_SIZE[0] / 2, y + PAD_SIZE[1] / 2)?.code);
        // A key other than a pad entering a screen that is not a device list: the Favourites key.
        favourites ||= entries.some((one) => !scans.includes(one.tag & 0x3f) && (lists[one.operand] ?? [])
          .some((i) => i.opcode === 0x7e && !deviceLists.has(i.operand)));
        const texts = (screenProgram(c, page.program) ?? []).filter((one) => one.opcode === SCREEN_TEXT_INLINE || one.opcode === SCREEN_TEXT_AT);
        return PAD_PLACES.flatMap(([x, y], k) => {
          const scan = scans[k];
          const bound = scan === undefined ? undefined : entries.find((one) => one.tag === (0x80 | scan));
          if (bound === undefined) return [];
          const words = texts.filter((one) => (one.operands[0] as number) >= x && (one.operands[0] as number) < x + PAD_SIZE[0]
            && (one.operands[1] as number) >= y && (one.operands[1] as number) < y + PAD_SIZE[1])
            .sort((a, b) => (a.operands[1] as number) - (b.operands[1] as number)).map((one) => decode(textGlyphs(c, one)!, map));
          const body = lists[bound.operand] ?? [];
          const list = body.length === 2 && body[0]!.opcode === 0x75 && body[1]!.opcode === 0x7f ? body[1]!.operand : bound.operand;
          return [{ label: words.join(' '), list }];
        });
      });
      // Favourite channels, which the builder has no input for.
      if (favourites) { tally.favourites += 1; continue; }
      if (pads.flat().some((one) => one.label === '')) { tally.picturePads += 1; continue; }
      // A page short of six before the last, which a list of rows does not state.
      if (pads.slice(0, -1).some((one) => one.length < PAD_PLACES.length)) { tally.gaps += 1; continue; }
      const built = buildTouchActivityScreens(c, fresh, activity.name as string, pads.flat(), {});
      const b = parse(built.bytes);
      const theirs = [shapeOf(c, working, { working, startup }), shapeOf(c, startup, { working, startup })];
      const ours = [shapeOf(b, built.mode, { working: built.mode, startup: built.startupMode }),
        shapeOf(b, built.startupMode, { working: built.mode, startup: built.startupMode })];
      if (theirs.some((one) => one.instructionOne > 0)) tally.instructionOne += 1;
      const strip = (one: ReturnType<typeof shapeOf>) => JSON.stringify({ record: one.record, pages: one.pages });
      if (theirs.every((one, k) => strip(one) === strip(ours[k]!))) tally.same += 1;
      else tally.other.push(`${name} ${activity.name}`);
    }
  }
  assert.deepEqual(tally, {
    activities: 64, same: 52, favourites: 8, gaps: 2, picturePads: 1, notLettered: 1, instructionOne: 13, other: [],
  });
});

/** Each text a program draws, with the font set selected before it, following the programs it calls one deep. */
function textsWithFonts(c: Container, address: number): { font: number | undefined; y: number }[] {
  const out: { font: number | undefined; y: number }[] = [];
  let font: number | undefined;
  const walk = (at: number, depth: number): void => {
    for (const one of screenProgram(c, at) ?? []) {
      if (one.opcode === SCREEN_SELECT_FONT) font = one.operands[0];
      if (one.opcode === SCREEN_CALL && depth === 0) walk(one.targets[0] as number, 1);
      if (one.opcode === SCREEN_TEXT_INLINE || one.opcode === SCREEN_TEXT_AT) out.push({ font, y: one.operands[1] as number });
    }
  };
  walk(address, 0);
  return out;
}

/** The compiles of Logitech's for the Harmony One holding no activity, four of the nineteen. */
const WITHOUT_ACTIVITIES = ['harvest_one_two_devices', 'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3'] as const;

test('section 402: every Logitech One compile with an activity holds two font sets of the start up title\'s face, draws every start up title in the one without a shadow and nothing at the title\'s height in the other, and the four compiles with none hold the shadowed one',
     skipUnless(...WITH_ACTIVITIES, ...WITHOUT_ACTIVITIES), () => {
  let titled = 0;
  for (const name of WITH_ACTIVITIES) {
    const c = parse(load(name) as Uint8Array);
    const sets = fontsOfFace(c, 'One15');
    assert.equal(sets.length, 2, name);
    const chosen = touchActivityFonts(c, TOUCH_CHOICES)[0]!.like;
    const other = sets.find((one) => one !== chosen);
    assert.ok(sets.includes(chosen) && other !== undefined, name);
    // The two have one ink and differ in their shadow: the titles' set has none.
    const shadow = (set: number): number | undefined => measureSet(c, (fontSets(c) ?? [])[set]!, characterMap(c)!).shadow;
    assert.deepEqual([shadow(chosen) ?? 0, (shadow(other) ?? 0) !== 0], [0, true], name);
    const records = modeRecords(c)!;
    for (const activity of activities(c)) {
      // Each activity's start up screen, its first mode, draws "Starting" and its name at the title's height
      // in the set the builder chose.
      const titles = records[activity.modes[0] as number]!.pages.flatMap((page) => textsWithFonts(c, page.program))
        .filter((one) => one.y === 124);
      assert.ok(titles.length > 0 && titles.every((one) => one.font === chosen), `${name} ${activity.name}`);
      titled += 1;
    }
    // The other set draws nothing at that height anywhere in the configuration.
    for (const record of records) {
      for (const page of record?.pages ?? []) {
        assert.ok(!textsWithFonts(c, page.program).some((one) => one.y === 124 && one.font === other), name);
      }
    }
  }
  assert.equal(titled, 64);
  // The four with none hold the shadowed one only.
  for (const name of WITHOUT_ACTIVITIES) {
    const c = parse(load(name) as Uint8Array);
    const sets = fontsOfFace(c, 'One15');
    assert.equal(sets.length, 1, name);
    assert.notEqual(measureSet(c, (fontSets(c) ?? [])[sets[0]!]!, characterMap(c)!).shadow ?? 0, 0, name);
  }
});

test('section 402: each activity of Logitech\'s One compiles has a device list of its own holding every device once, as some devices and then the rest in the idle list\'s order, which the 600 family\'s order fits on 12 of the 64',
     skipUnless(...WITH_ACTIVITIES), () => {
  const tally = { lists: 0, idleComplete: 0, everyDevice: 0, headThenIdle: 0, headWithAnother: 0, familyOrder: 0, idleOrder: 0 };
  for (const name of WITH_ACTIVITIES) {
    const c = parse(load(name) as Uint8Array);
    const actionLists = c.actionLists() ?? [];
    const records = modeRecords(c)!;
    const hits = touchPages(c)!.records;
    const { menus, marker } = deviceListMenus(c);
    // The device modes a device list's rows enter, in the order the rows stand on the screen: page by page, and
    // on a page by its touch area, the panel's y running upwards.
    const rows = (mode: number): number[] => records[mode]!.pages.flatMap((page) => {
      const areas = hits[page.lead as number]?.areas ?? [];
      return (taggedList(c, page.list)?.entries ?? []).flatMap((one) => {
        if (one.opcode !== 0x7f) return [];
        const entered = deviceListRowMode(actionLists[one.operand] ?? [], c.architecture, marker);
        const area = areas.find((a) => a.code === (one.tag & 0x3f));
        return entered === undefined || area === undefined ? [] : [{ entered, y: area.y, x: area.x }];
      }).sort((a, b) => (b.y - a.y) || (a.x - b.x)).map((one) => one.entered);
    });
    const named = activities(c);
    const own = new Map<number, number>();
    for (const activity of named) for (const mode of activity.modes) if (menus.includes(mode)) own.set(activity.activity, mode);
    // The list no activity enters is the one the Devices key opens with no activity running.
    const idle = rows(menus.find((mode) => ![...own.values()].includes(mode))!);
    const inventory = devices(c);
    if (idle.length === inventory.length && inventory.every((one) => idle.includes(one.mode as number))) tally.idleComplete += 1;
    const modeOfGroup = new Map(inventory.map((one) => [one.group, one.mode as number]));
    for (const activity of named) {
      const mode = own.get(activity.activity);
      if (mode === undefined) continue;
      tally.lists += 1;
      const actual = rows(mode);
      const same = (order: number[]): boolean => JSON.stringify(order) === JSON.stringify(actual);
      if (actual.length === idle.length && new Set(actual).size === actual.length && actual.every((one) => idle.includes(one))) tally.everyDevice += 1;
      // The activity's devices, by infrared group.
      const mine = activity.devices.map((group) => modeOfGroup.get(group) as number);
      if (same([...mine, ...idle.filter((one) => !mine.includes(one))])) tally.familyOrder += 1;
      if (same(idle)) tally.idleOrder += 1;
      // The shortest head holding the activity's devices after which the rest follow in the idle order.
      for (let k = 0; k <= actual.length; k += 1) {
        const head = actual.slice(0, k);
        if (!mine.every((one) => head.includes(one)) || !same([...head, ...idle.filter((one) => !head.includes(one))])) continue;
        tally.headThenIdle += 1;
        if (head.some((one) => !mine.includes(one))) tally.headWithAnother += 1;
        break;
      }
    }
  }
  assert.deepEqual(tally, { lists: 64, idleComplete: 15, everyDevice: 64, headThenIdle: 64, headWithAnother: 32, familyOrder: 12, idleOrder: 8 });
});

test('section 402: screen instruction 1 stands on the working screens of 23 of Logitech\'s 64 One activities, one call deep, naming the whole screen, and on no start up screen',
     skipUnless(...WITH_ACTIVITIES), () => {
  const seen = new Map<string, number>();
  let carriers = 0;
  for (const name of WITH_ACTIVITIES) {
    const c = parse(load(name) as Uint8Array);
    const records = modeRecords(c)!;
    for (const [value, working] of activityScreens(c)!.screens) {
      const activity = activities(c).find((one) => one.activity === value)!;
      const found = (mode: number): string[] => records[mode]!.pages.flatMap((page) => {
        const out: string[] = [];
        const walk = (at: number, depth: number): void => {
          for (const one of screenProgram(c, at) ?? []) {
            if (one.opcode === SCREEN_CALL && depth < 3) walk(one.targets[0] as number, depth + 1);
            if (one.opcode === 1) out.push(`depth ${depth}: ${[...one.operands].join(' ')}`);
          }
        };
        walk(page.program, 0);
        return out;
      });
      assert.deepEqual(found(activity.modes[0] as number), [], `${name} ${activity.name}`);
      const here = found(working);
      if (here.length > 0) carriers += 1;
      for (const one of here) seen.set(one, (seen.get(one) ?? 0) + 1);
    }
  }
  assert.equal(carriers, 23);
  // The One's screen is 176 by 220.
  assert.deepEqual([...seen.keys()], ['depth 1: 0 0 176 220 0 0']);
});
