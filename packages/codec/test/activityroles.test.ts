/**
 * An activity's keypad map and screen built from its roles, scored against Logitech's own compiles of
 * the same activities, section 323. Harmony 600, 650 and 700.
 *
 * The population is the 13 compiles section 312 measured, which hold 40 activities. Each activity's
 * roles are read off its own sends, `activityRolesFromSends`, since no configuration states them; the
 * first test is what that inference is checked against.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipWithoutLab } from '@harmony/lab';
import {
  ACTION_LIST_INDEX_OPCODE,
  activities,
  activityKeysFromRoles,
  activityRolesFromSends,
  activityScreenRows,
  type ActivityRoles,
  bitmapReference,
  caseQueued,
  characterMap,
  composeActivityScreen,
  type Container,
  decode,
  deviceKeypadLists,
  deviceModeMaps,
  deviceScreenItems,
  devices,
  fontSets,
  FOUR_SLOT_ITEMS,
  fourSlotCellAt,
  glyphOf,
  glyphsReferencedBy,
  handlerSets,
  idleActivityValue,
  modeRecords,
  modeScreenItems,
  nextActivityValue,
  parse,
  payloadOf,
  screenProgram,
  screenStrings,
  taggedList,
  valueMaps,
  VOLUME_SCANS,
} from '../src/index.ts';

const COMPILES = ['h600_config', 'calibration_h600', 'h650_config_region',
  'h650_panasonic_config', 'h650_power_hold_compile', 'h650_power_hold_compile_2', 'h700_config',
  'h700_config_2', 'h700_28_config_region', 'h700_power_hold_compile', 'h700_power_hold_compile_2',
  'h700_power_hold_compile_3', 'h700_power_hold_compile_4'] as const;

/**
 * The two configurations that are not Logitech's choices: `h600_config` is Danny's own Harmony 600,
 * customised by hand over years, and the `h700_config` pair is a contributor's Harmony 700, customised
 * the same way. Their keypads and screens are scored like the rest and their differences are counted,
 * but a rule about what the compiler chooses is judged on the other ten.
 */
const CUSTOMISED = new Set(['h600_config', 'h700_config', 'h700_config_2']);

const load = (name: string): Container => parse(payloadOf(require_(name)));

/** Logitech's own keypad map for an activity: a scan's press and the list it runs. */
function stated(c: Container, set: number): Map<number, number> {
  const out = new Map<number, number>();
  const sets = handlerSets(c);
  for (const entry of taggedList(c, sets?.addresses[set] as number)?.entries ?? []) {
    if (entry.tag >> 6 !== 2 || entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
    out.set(entry.tag & 0x3f, entry.operand);
  }
  return out;
}

/** Score a built map against Logitech's, key by key. */
function score(built: Map<number, number>, logitech: Map<number, number>) {
  const out = { match: 0, differ: 0, missing: 0, extra: 0, keys: [] as string[] };
  for (const scan of [...new Set([...built.keys(), ...logitech.keys()])].sort((a, b) => a - b)) {
    const ours = built.get(scan);
    const theirs = logitech.get(scan);
    if (ours === theirs) out.match++;
    else if (theirs === undefined) { out.extra++; out.keys.push(`+${scan}`); }
    else if (ours === undefined) { out.missing++; out.keys.push(`-${scan}`); }
    else { out.differ++; out.keys.push(`~${scan}`); }
  }
  return out;
}

const keysOf = (c: Container, roles: ActivityRoles) =>
  new Map(activityKeysFromRoles(c, roles).map((one) => [one.scan, one.list]));

test('the roles read off the calibration Harmony 600\'s sends name the devices Logitech\'s stated button maps give', skipWithoutLab(), () => {
  // Pinned from `GET_MapList_skin71.json`, captured from that remote's account record and filed in
  // the lab on 13 August 2026: per activity, the device every hard button's command names. In both
  // activities VolumeUp, VolumeDown and VolumeMute name the receiver and the other 36 buttons all
  // name one device, the television in Watch TV and the disc player in Watch a Movie. Those three
  // devices are told apart there by the function groups the service gives each, `Channel` on the
  // television only, `RadioTuner` on the receiver only and no `Volume` group on the disc player, and
  // here by their names in the configuration. The capture states maps, not roles, so this checks the
  // reading of the configuration against the record rather than the rule.
  const STATED: Record<string, { volume: string; control: string }> = {
    'Watch TV': { volume: 'Denon_AV_Receiver', control: 'Sony_TV' },
    'Watch a Movie': { volume: 'Denon_AV_Receiver', control: 'Panasonic_Blu-ray_Player' },
  };
  const c = load('calibration_h600');
  const name = new Map(devices(c).map((one) => [one.group, one.name]));
  const read = Object.fromEntries(activities(c).map((one) => {
    const roles = activityRolesFromSends(c, one.activity);
    return [one.name, { volume: name.get(roles.volume as number), control: name.get(roles.control as number) }];
  }));
  assert.deepEqual(read, STATED);
});

test('an activity\'s keypad built from its roles is Logitech\'s on 20 of the 40 activities, and every activity that differs is named', skipWithoutLab(), () => {
  const total = { match: 0, differ: 0, missing: 0, extra: 0 };
  const differing: Record<string, string> = {};
  let activityCount = 0;
  for (const name of COMPILES) {
    const c = load(name);
    for (const one of activities(c)) {
      activityCount++;
      const result = score(keysOf(c, activityRolesFromSends(c, one.activity)), stated(c, one.set));
      total.match += result.match; total.differ += result.differ;
      total.missing += result.missing; total.extra += result.extra;
      if (result.keys.length > 0) differing[`${name} ${one.name}`] = result.keys.join(' ');
    }
  }
  assert.equal(activityCount, 40);
  assert.equal(Object.keys(differing).length, 20);
  assert.deepEqual(total, { match: 1241, differ: 53, missing: 34, extra: 70 });
  // Every activity that differs, and how. Scans per reference/button-maps.md: 51 Select, 36 Info,
  // 26 and 27 the arrows above the direction pad, 12 Exit, 43 PrevChannel, 13 28 29 49 the colours.
  //
  // 1. "TV kijken" on the test account's Harmony 650 and 700 records, nine compiles of one activity:
  //    Select sends another command of the same box and Info and the two arrows are not bound at
  //    all, where the same box's own map has all four and PanaWatch, driving it on three of these
  //    records, matches whole. Why is not established: the stated map would say, and the read of it
  //    failed. These nine are also the nine sets whose bucket ties are in the other order.
  const kpn = '+26 +27 +36 ~51';
  for (const name of ['h650_config_region', 'h650_panasonic_config', 'h650_power_hold_compile',
    'h650_power_hold_compile_2', 'h700_28_config_region', 'h700_power_hold_compile',
    'h700_power_hold_compile_2', 'h700_power_hold_compile_3', 'h700_power_hold_compile_4']) {
    assert.equal(differing[`${name} TV kijken`], kpn, name);
    delete differing[`${name} TV kijken`];
  }
  // 2. The customised configurations: every remaining differing activity, named. Only PS3's keys are
  //    asserted; "Chromecast" drives a device with no infrared, and its only other keys, Play and Pause,
  //    send two other television commands, so the television is read as the control device and its
  //    whole map is predicted where the activity binds two keys.
  assert.deepEqual(Object.keys(differing).map((key) => key.split(' ')[0]).filter((name) => !CUSTOMISED.has(name as string)), []);
  assert.deepEqual(Object.keys(differing).sort(), [
    'h600_config Chromecast', 'h600_config PS3', 'h600_config TV kijken',
    'h700_config Watch Bluray', 'h700_config Watch Roku', 'h700_config Watch TV', 'h700_config Watch VCR',
    'h700_config_2 Watch Bluray', 'h700_config_2 Watch Roku', 'h700_config_2 Watch TV', 'h700_config_2 Watch VCR',
  ]);
  assert.equal(differing['h600_config PS3'], '~43');
});

test('the control: swapping the two roles leaves almost nothing matching', skipWithoutLab(), () => {
  let match = 0;
  let scored = 0;
  for (const name of COMPILES) {
    const c = load(name);
    for (const one of activities(c)) {
      const roles = activityRolesFromSends(c, one.activity);
      const result = score(keysOf(c, { volume: roles.control, control: roles.volume }), stated(c, one.set));
      match += result.match;
      scored += result.match + result.differ + result.missing + result.extra;
    }
  }
  assert.equal(match, 3);
  assert.equal(scored, 1559);
});

test('the three refinements change exactly the keys they are for, and the plain rule misses Logitech\'s own calibration', skipWithoutLab(), () => {
  // The plain rule: the volume device's three volume keys and the control device's own map for the rest.
  const plain = (c: Container, roles: ActivityRoles): Map<number, number> => {
    const out = new Map<number, number>();
    if (roles.control !== undefined) {
      for (const [scan, list] of deviceKeypadLists(c, roles.control)) if (!VOLUME_SCANS.includes(scan)) out.set(scan, list);
    }
    if (roles.volume !== undefined) {
      for (const [scan, list] of deviceKeypadLists(c, roles.volume)) if (VOLUME_SCANS.includes(scan)) out.set(scan, list);
    }
    return out;
  };
  const changed = { right: 0, wrong: 0 };
  const wrongBy = new Map<string, number>();
  const byScan = new Map<number, number>();
  let calibration = '';
  for (const name of COMPILES) {
    const c = load(name);
    for (const one of activities(c)) {
      const roles = activityRolesFromSends(c, one.activity);
      const before = plain(c, roles);
      const after = keysOf(c, roles);
      const theirs = stated(c, one.set);
      for (const scan of new Set([...before.keys(), ...after.keys()])) {
        if (before.get(scan) === after.get(scan)) continue;
        byScan.set(scan, (byScan.get(scan) ?? 0) + 1);
        if (after.get(scan) === theirs.get(scan)) changed.right++;
        else {
          changed.wrong++;
          const where = `${one.name} ${scan}`;
          wrongBy.set(where, (wrongBy.get(where) ?? 0) + 1);
        }
      }
      if (name === 'calibration_h600' && one.name === 'Watch a Movie') calibration = score(before, theirs).keys.join(' ');
    }
  }
  // Without them Logitech's own calibration activity is wrong on Exit and the two channel keys and
  // lacks the two arrows.
  assert.equal(calibration, '~12 -26 -27 ~31 ~32');
  // Only the arrows, the channel keys and Exit ever move.
  assert.deepEqual([...byScan.keys()].sort((a, b) => a - b), [12, 26, 27, 31, 32]);
  // What they get wrong is only ever the arrow fallback, on the ten "TV kijken", the nine on the test
  // account's records and Danny's own, and on two activities of the customised configurations.
  assert.deepEqual(changed, { right: 39, wrong: 26 });
  assert.deepEqual(Object.fromEntries([...wrongBy].sort()), {
    'Chromecast 26': 1, 'Chromecast 27': 1, 'TV kijken 26': 10, 'TV kijken 27': 10, 'Watch TV 26': 2, 'Watch TV 27': 2,
  });
  assert.ok(changed.right > changed.wrong, JSON.stringify(changed));
});

/** The activity working screens: activity value to base slot 6 mode, through the record keyed by activity. */
function workingModes(c: Container): Map<number, number> {
  const acts = activities(c);
  const idle = idleActivityValue(c);
  for (const map of valueMaps(c) ?? []) {
    if (map.ranges.length !== 0) continue;
    const queued = new Map(map.entries.map(([key, target]) => [key, caseQueued(c, target)]));
    if (!acts.every((one) => queued.get(one.activity)?.opcode === 0x7e)) continue;
    if (idle === undefined || !queued.has(idle) || queued.get(idle)?.opcode === 0x7e) continue;
    if (queued.size !== acts.length + 1) continue;
    return new Map(acts.map((one) => [one.activity, queued.get(one.activity)?.operand as number]));
  }
  return new Map();
}

/**
 * A page as tokens a reader can compare across two configurations: pictures by their bytes, since a
 * composed one is the same picture at another address; fonts by the order they are first chosen;
 * texts with their place and decoded, since the compiler often draws a string by reference to an
 * equal one elsewhere where the composer writes it inline, section 312.
 */
function shape(c: Container, program: number): string[] {
  const map = characterMap(c);
  const fonts = new Map<number, string>();
  const bytesAt = (address: number): string => {
    const at = c.blobOffsetOf(address);
    return at === undefined ? `@${address}` : [...c.blob.subarray(at, at + 12)].join(',');
  };
  return (screenProgram(c, program) ?? []).map((one) => {
    if (one.opcode === 0x02) return `picture ${bytesAt(bitmapReference(one) as number)}`;
    if (one.opcode === 0x03) {
      const o = [...one.operands];
      return `bar ${o.slice(0, 6).join(' ')} ${bytesAt((o[6] as number) | ((o[7] as number) << 8) | ((o[8] as number) << 16))}`;
    }
    if (one.opcode === 0x10) {
      const font = one.operands[0] as number;
      if (!fonts.has(font)) fonts.set(font, String(fonts.size));
      return `font ${fonts.get(font)}`;
    }
    if (one.opcode === 0x04 || one.opcode === 0x05) {
      return `text ${one.operands[0]} ${one.operands[1]} ${decode(one.glyphs ?? glyphsReferencedBy(c, one) ?? new Uint8Array(), map as NonNullable<typeof map>)}`;
    }
    return `${one.opcode} ${[...one.operands].join(' ')}`;
  });
}

/** The start up title as drawn: each line's place and text, read off the page that draws it. */
function startupTitle(c: Container, name: string): string[] | undefined {
  const drawn = screenStrings(c, characterMap(c));
  for (const record of modeRecords(c) ?? []) {
    if (record.pages.length !== 1) continue;
    const lines = drawn.filter((one) => one.program === record.pages[0]?.program && (one.y === 5 || one.y === 19))
      .sort((a, b) => a.y - b.y);
    if (lines.map((one) => one.text).join(' ') === `Starting ${name}`) return lines.map((one) => `${one.x},${one.y} ${one.text}`);
  }
  return undefined;
}

test('an activity\'s screens composed from its commands are Logitech\'s page for page, but where a user left a gap', skipWithoutLab(), () => {
  const pages = { same: 0, differ: 0 };
  const records = { same: 0, differ: 0 };
  const titles = { same: 0, differ: 0 };
  const differing: string[] = [];
  const refused: string[] = [];
  const resolved = { plain: { items: 0, resolved: 0 }, customised: { items: 0, resolved: 0 } };
  for (const name of COMPILES) {
    const c = load(name);
    const working = workingModes(c);
    const own = deviceModeMaps(c).map((one) => ({ group: one.group, items: deviceScreenItems(c, one.group) }));
    for (const one of activities(c)) {
      const mode = working.get(one.activity) as number;
      const theirs = (modeRecords(c) ?? [])[mode];
      assert.ok(theirs !== undefined, `${name} ${one.name}`);
      // The commands, as the device and label each is, resolved back through the device's own screen.
      // An item no device's own screen holds under its label is a user's, carried as it stands.
      const items = modeScreenItems(c, mode);
      const tally = CUSTOMISED.has(name) ? resolved.customised : resolved.plain;
      const rows = items.map((item) => {
        tally.items++;
        const owner = own.find((device) => device.items.some((mine) => mine.list === item.list && mine.label === item.label));
        if (owner === undefined) return item;
        tally.resolved++;
        return activityScreenRows(c, [{ group: owner.group, label: item.label }])[0] as typeof item;
      });
      assert.deepEqual(rows, items);
      let screen;
      try {
        screen = composeActivityScreen(c, nextActivityValue(c), one.name ?? '', rows);
      } catch (error) {
        refused.push(`${name} ${one.name}: ${(error as Error).message}`);
        continue;
      }
      const after = parse(screen.bytes);
      const ours = (modeRecords(after) ?? [])[screen.mode];
      assert.ok(ours !== undefined);
      const sameEntries = JSON.stringify(theirs.entries.map((e) => [e.tag, e.opcode, e.operand]))
        === JSON.stringify(ours.entries.map((e) => [e.tag, e.opcode, e.operand]));
      if (sameEntries) records.same++; else records.differ++;
      let allSame = ours.pages.length === theirs.pages.length;
      for (let p = 0; p < Math.max(ours.pages.length, theirs.pages.length); p++) {
        const a = theirs.pages[p] === undefined ? [] : shape(c, theirs.pages[p]?.program as number);
        const b = ours.pages[p] === undefined ? [] : shape(after, ours.pages[p]?.program as number);
        const listA = JSON.stringify(taggedList(c, theirs.pages[p]?.list ?? -1)?.entries.map((e) => [e.tag, e.opcode, e.operand]));
        const listB = JSON.stringify(taggedList(after, ours.pages[p]?.list ?? -1)?.entries.map((e) => [e.tag, e.opcode, e.operand]));
        if (JSON.stringify(a) === JSON.stringify(b) && listA === listB) pages.same++;
        else { pages.differ++; allSame = false; }
      }
      if (!allSame) differing.push(`${name} ${one.name}`);
      const title = startupTitle(after, one.name ?? '');
      if (title !== undefined && JSON.stringify(title) === JSON.stringify(startupTitle(c, one.name ?? ''))) titles.same++;
      else titles.differ++;
    }
  }
  // Every command on the screens of the ten uncustomised compiles is a device's own screen command
  // under the same label, and some on the customised ones are too.
  assert.deepEqual(resolved, { plain: { items: 64, resolved: 64 }, customised: { items: 101, resolved: 16 } });
  // Refused: the one label wider than a corner's line in the label font, which the compiler draws in a
  // smaller one, on the same activity of both copies of one contributed configuration.
  assert.deepEqual(refused, ['h700_config', 'h700_config_2'].map((name) =>
    `${name} Watch TV: 'Antenna' is 60 pixels wide and a corner holds 59: give it a shorter label`));
  assert.deepEqual(records, { same: 38, differ: 0 });
  assert.deepEqual(titles, { same: 38, differ: 0 });
  assert.deepEqual(pages, { same: 41, differ: 6 });
  // The three activities that differ, two pages each, are all customised ones, and each has a page
  // Logitech left short before its last: a gap the user left, which a list of commands cannot state,
  // so every later command sits one corner earlier in ours.
  assert.deepEqual(differing, ['h600_config PS3', 'h700_config Watch Bluray', 'h700_config_2 Watch Bluray']);
  for (const key of differing) {
    const [name, ...rest] = key.split(' ');
    const c = load(name as string);
    const one = activities(c).find((each) => each.name === rest.join(' '));
    const record = (modeRecords(c) ?? [])[workingModes(c).get(one?.activity as number) as number];
    const counts = (record?.pages ?? []).map((page) => taggedList(c, page.list)?.entries.length ?? 0);
    assert.ok(counts.slice(0, -1).some((n) => n < 4), `${key} ${counts}`);
  }
});

test('a corner label breaks at spaces greedily within 55 to 58 pixels, and no corner label line in its font is wider than 59', skipWithoutLab(), () => {
  // Every corner label on every mode page of the 13 that binds a corner, in the font most labels of
  // its page are drawn in, where a corner label sits: one line at y 40 or 90, two at 25 and 40 or 75
  // and 90, a left one from x 3 and a right one ending at 125 line by line. Once per configuration,
  // corner, text and place.
  type Label = { lines: string[]; width: (text: string) => number };
  const labels: Label[] = [];
  let smaller = 0;
  for (const name of COMPILES) {
    const c = load(name);
    const map = characterMap(c);
    const sets = fontSets(c) ?? [];
    const widthIn = (font: number) => (text: string): number => {
      let sum = 0;
      for (const ch of text) {
        const code = [...(map?.codes ?? [])].find(([k, v]) => v === ch && glyphOf(c, sets[font] as never, k) !== undefined)?.[0];
        if (code === undefined) return Number.NaN;
        sum += glyphOf(c, sets[font] as never, code)?.width ?? Number.NaN;
      }
      return sum;
    };
    const drawn = screenStrings(c, map);
    const seen = new Set<string>();
    for (const record of modeRecords(c) ?? []) {
      for (const page of record.pages) {
        const bound = new Set((taggedList(c, page.list)?.entries ?? []).map((e) => e.tag & 0x3f));
        if (!FOUR_SLOT_ITEMS.some((item) => bound.has(item.scan))) continue;
        const band = drawn.filter((one) => one.program === page.program && one.y >= 20 && one.y <= 100);
        const tally = new Map<number, number>();
        for (const one of band) tally.set(one.font, (tally.get(one.font) ?? 0) + 1);
        const base = [...tally].sort((a, b) => b[1] - a[1])[0]?.[0];
        if (base === undefined) continue;
        const width = widthIn(base);
        for (let cell = 0; cell < 4; cell++) {
          const lines = band.filter((one) => fourSlotCellAt(one.x, one.y) === cell).sort((a, b) => a.y - b.y);
          if (lines.length === 0) continue;
          const key = `${cell}|${lines.map((one) => `${one.text}@${one.x},${one.y},${one.font}`).join('|')}`;
          if (seen.has(key)) continue;
          seen.add(key);
          if (lines.some((one) => one.font !== base)) { smaller++; continue; }
          const ys = JSON.stringify(lines.map((one) => one.y));
          const placed = (ys === (lines.length === 1 ? '[40]' : '[25,40]') || ys === (lines.length === 1 ? '[90]' : '[75,90]'))
            && (cell % 2 === 0 ? lines.every((one) => one.x === 3) : lines.every((one) => one.x + width(one.text) === 125));
          if (placed) labels.push({ lines: lines.map((one) => one.text), width });
        }
      }
    }
  }
  const measured = labels.filter((one) => one.lines.every((line) => !Number.isNaN(one.width(line))));
  assert.deepEqual([labels.length, measured.length], [2037, 2036]);
  assert.deepEqual([measured.filter((one) => one.lines.length === 1).length, measured.filter((one) => one.lines.length === 2).length], [1156, 880]);
  assert.equal(Math.max(...measured.flatMap((one) => one.lines.map((line) => one.width(line)))), 59);
  // The corner cells drawn in a font other than their page's most common one, most of them help and
  // dialog text, which the wrap rule does not cover.
  assert.equal(smaller, 890);
  const wrap = (one: Label, limit: number): string[] => {
    const text = one.lines.join(' ');
    if (!text.includes(' ') || one.width(text) <= limit) return [text];
    const out: string[] = [];
    let current = '';
    for (const word of text.split(' ')) {
      const longer = current === '' ? word : `${current} ${word}`;
      if (current !== '' && one.width(longer) > limit) { out.push(current); current = word; } else current = longer;
    }
    out.push(current);
    return out;
  };
  const placedBy = (limit: number): number => measured.filter((one) => JSON.stringify(wrap(one, limit)) === JSON.stringify(one.lines)).length;
  // The band, and the two widths either side of it, which is the control.
  assert.deepEqual([54, 55, 56, 57, 58, 59].map(placedBy), [2035, 2036, 2036, 2036, 2036, 2033]);
});
