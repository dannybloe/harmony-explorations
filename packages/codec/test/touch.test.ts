/**
 * The Harmony One's touch panel: which hit map page belongs to a screen, and where its rectangles are.
 *
 * `docs/findings.md` section 125. The tests that carry weight here are the controls: the index into the
 * hit map is a byte that would look plausible whatever it pointed at, and the transform from panel
 * coordinates to pixels is two numbers that would place a label somewhere whatever they were. So each
 * is asserted together with what happens when it is perturbed.
 *
 * No label text is quoted. A One's activity names are its owner's own words.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import {
  ACTION_LIST_INDEX_OPCODE,
  type Container,
  EDGE_CODES,
  handlerSets,
  infraredCodesPerList,
  irBlockWords,
  irGroups,
  irRecordBlocks,
  modeRecords,
  payloadOf,
  activityBindings,
  activityNames,
  modePages,
  panelPoint,
  parse,
  pixelPoint,
  screenStrings,
  taggedList,
  touchOwner,
  touchPageOf,
  touchPages,
} from '../src/index.ts';

const SAMPLES = ['one_config', 'one_config_unprogrammed'];
const SCAN = 0x3f;

/**
 * How many pages a wrong lead byte breaks, per sample and per offset. Measured, and exact rather
 * than the floor of 20 that used to stand in the loop: the numbers are what says the lead byte fits
 * **uniquely** rather than merely fitting, and the two are the same claim at different strengths.
 */
const SHIFT_FAILURES: Record<string, Record<number, number>> = {
  one_config: { 1: 91, 2: 81, 3: 69, [-1]: 214, 5: 68, 7: 83, 11: 227 },
  one_config_unprogrammed: { 1: 57, 2: 54, 3: 56, [-1]: 71, 5: 57, 7: 55, 11: 56 },
};

test('the mode page lead byte is an index into the hit map, and no other value works',
  skipUnless(...SAMPLES), () => {
    for (const name of SAMPLES) {
      const c = parse(load(name) as Uint8Array);
      const pages = modePages(c);
      const touch = touchPages(c)?.records as { areas: { code: number }[] }[];
      // It is a plain zero based index: every value in range, and every page named by something.
      const leads = pages.map((p) => p.lead as number);
      assert.equal(Math.min(...leads), 0, name);
      assert.equal(Math.max(...leads), touch.length - 1, name);
      assert.equal(new Set(leads).size, touch.length, `${name}: every hit page is named`);

      // The closure: a page never binds a key code its own hit page does not offer. And the control,
      // which is what makes that mean something, since two thirds of the hit pages would satisfy an
      // arbitrary page's demands: every other offset breaks dozens of them.
      const demands = pages.map((page) => {
        const bound = new Set<number>();
        for (const entry of taggedList(c, page.list)?.entries ?? []) bound.add(entry.tag & SCAN);
        return [...bound].filter((code) => code >= 43 && code <= 53);
      });
      const failures = (shift: number): number => demands.reduce((n, want, i) => {
        if (want.length === 0) return n;
        const at = (((leads[i] as number) + shift) % touch.length + touch.length) % touch.length;
        const offered = new Set((touch[at] as { areas: { code: number }[] }).areas.map((a) => a.code));
        return n + (want.every((code) => offered.has(code)) ? 0 : 1);
      }, 0);
      const checked = demands.filter((d) => d.length > 0).length;
      // Exact per sample, not a floor of 100: the two configs bind 268 and 104 touch pages, and a
      // floor sized to the smaller one would let the larger lose more than half of its pages.
      assert.equal(checked, name === 'one_config' ? 268 : 104, `${name}: pages binding a touch code`);
      assert.equal(failures(0), 0, `${name}: the lead byte fits every page`);
      // The control, exact per offset. A floor of 20 said "many pages break" and could not tell 54
      // from 227, which is the difference between a lead byte that barely fits and one that fits
      // uniquely. The spread is itself the evidence: `one_config` binds more codes per page, so a
      // wrong offset costs it more, and the two offsets that wrap the whole table cost the most.
      for (const shift of [1, 2, 3, -1, 5, 7, 11]) {
        assert.equal(failures(shift), (SHIFT_FAILURES[name] as Record<number, number>)[shift],
          `${name}: offset ${shift} broke ${failures(shift)} pages`);
        assert.ok(failures(shift) > 20, `${name}: offset ${shift} should break many pages`);
      }
    }
  });

test('the panel to pixel transform puts every drawn label inside a hit region',
  skipUnless(...SAMPLES), () => {
    // The measurement behind the transform, as a property rather than as the two constants: a label the
    // screen draws is a label on a touchable thing, so it has to land inside one of that page's
    // rectangles. Two of 1777 do not, and they are on one page.
    //
    // The control is the offset. Moving it by one row pitch, which is the smallest move that could be
    // an off by one rather than a wrong reading, leaves hundreds of labels outside every rectangle.
    let inside = 0;
    let outside = 0;
    for (const name of SAMPLES) {
      const c = parse(load(name) as Uint8Array);
      const drawn = screenStrings(c);
      for (const page of modePages(c)) {
        const areas = touchPageOf(c, page)?.areas ?? [];
        for (const one of drawn) {
          if (one.program !== page.program || one.text.trim().length < 2) continue;
          if (touchOwner(areas, one.x, one.y) === undefined) outside += 1; else inside += 1;
        }
      }
    }
    assert.equal(inside, 1775, 'labels that have a hit region');
    assert.equal(outside, 2, 'and the two that do not are the known pair');
  });

test('the three rows of blocks are where the screen actually draws them', skipUnless('one_config'),
  () => {
    // What the transform is checked against, and it is not a fit: the Harmony One draws at most three
    // blocks down the screen plus a bar under it, and a row holds either one block or two side by side.
    // Under the transform the rows land at pixel 33 to 83, 87 to 137 and 141 to 191, which is a 50 high
    // block every 54 pixels, and 54 is the row pitch the screen programs draw text at. A wrong offset
    // would put those boundaries at arbitrary numbers rather than at a clean grid.
    const c = parse(load('one_config') as Uint8Array);
    const edge = new Set(EDGE_CODES);
    const bands = new Map<string, number>();
    let widest = 0;
    for (const page of touchPages(c)?.records ?? []) {
      const rows = new Map<string, number>();
      for (const area of page.areas) {
        if (edge.has(area.code)) continue;
        const key = `${area.y}+${area.height}`;
        rows.set(key, (rows.get(key) ?? 0) + 1);
      }
      for (const [key, across] of rows) {
        widest = Math.max(widest, across);
        bands.set(key, (bands.get(key) ?? 0) + 1);
      }
    }
    assert.equal(widest, 2, 'a row is one block or two, never three');
    // The three list rows and the bar, by how often they are used.
    const common = [...bands].sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([key]) => {
        const [y, height] = key.split('+').map(Number) as [number, number];
        return [Math.round(pixelPoint(0, y + height).y), Math.round(pixelPoint(0, y).y)];
      })
      .sort((a, b) => (a[0] as number) - (b[0] as number));
    assert.deepEqual(common, [[33, 83], [87, 137], [141, 191], [191, 253]]);
    // The bar starts exactly where the third row ends, and it runs past the bottom of the display,
    // which is what the remote itself has: two touch points below the screen rather than
    // on it. The two edge strips are the other touch keys, one at each side.
    assert.equal(common[2]?.[1], common[3]?.[0]);
    assert.ok((common[3]?.[1] as number) > 220, 'the bar is partly off the display');
  });

test('a point maps to the first rectangle that contains it, as the firmware does',
  skipUnless('one_config'), () => {
    // Section 45 read the loop: it returns on the first match rather than the smallest or the last. So
    // the order of a page's rectangles is data, and this test is the one that would fail if a reader
    // ever sorted them.
    const c = parse(load('one_config') as Uint8Array);
    let overlapping = 0;
    for (const page of touchPages(c)?.records ?? []) {
      for (const [i, a] of page.areas.entries()) {
        for (const b of page.areas.slice(i + 1)) {
          if (a.x < b.x + b.width && b.x < a.x + a.width
            && a.y < b.y + b.height && b.y < a.y + a.height) overlapping += 1;
        }
      }
    }
    assert.equal(overlapping, 104, 'overlapping pairs, which is why the order matters');
    // And the two directions are inverses, which is what a caller drawing a hit region needs.
    for (const [x, y] of [[0, 0], [88, 110], [175, 219]] as [number, number][]) {
      const back = pixelPoint(panelPoint(x, y).x, panelPoint(x, y).y);
      assert.ok(Math.abs(back.x - x) < 1e-9 && Math.abs(back.y - y) < 1e-9);
    }
  });

test('the activity names a One resolves do not depend on the x half of the transform',
  skipUnless('one_config'), () => {
    // The honest half of section 125. The y transform is measured; the x transform rests on one reading,
    // that the display spans the gap between the two edge strips, and containment barely constrains it.
    // This is why that does not matter for the names: every activity sits on a full width row, so
    // ignoring x entirely resolves the same labels.
    const c = parse(load('one_config') as Uint8Array);
    const drawn = screenStrings(c);
    const pages = modePages(c);
    const withoutX = new Map<number, string>();
    for (const binding of activityBindings(c)) {
      const page = pages[binding.page];
      if (page === undefined) continue;
      const areas = touchPageOf(c, page)?.areas ?? [];
      const area = areas.find((one) => one.code === binding.scan);
      if (area === undefined) continue;
      const inside = drawn.filter((one) => one.program === page.program
        && one.text.trim().length >= 2
        && touchOwner(areas, one.x, one.y, true) === area);
      const distinct = [...new Set(inside.map((one) => one.text))];
      if (distinct.length === 1) withoutX.set(binding.activity, distinct[0] as string);
    }
    const named = activityNames(c);
    assert.equal(named.length, 8, 'eight activities');
    assert.equal(withoutX.size, 8, 'and eight of them resolve with x ignored');
    for (const one of named) assert.equal(one.name, withoutX.get(one.activity), `activity ${one.activity}`);
  });

/**
 * Every binding that sends infrared on a Harmony One, split into screen and key, and what runs before
 * the send. Section 337. The firmware half, that the click is a busy loop the send waits for, is
 * `tests/test_touch_send.py`.
 *
 * The population is every press binding in a device's own map, on a screen page and in a base slot 9
 * set, whose list reaches a `0x7D` through `0x7F` calls. A screen binding is one whose scan is a hit
 * map code, section 45.
 */
const TOUCH_SCANS = new Set([43, 44, 46, 47, 48, 49, 50, 51, 52, 53]);
const CLICK = 0x75;
const SEND = 0x7d;
const CALL = 0x7f;

function beforeTheSend(c: Container): { touch: Map<string, number>; key: Map<string, number> } {
  const lists = c.actionLists() ?? [];
  // The instructions run before the first send, or undefined when the list never sends.
  const walk = (list: number, seen: Set<number>): string[] | undefined => {
    if (seen.has(list)) return undefined;
    seen.add(list);
    const ran: string[] = [];
    for (const one of lists[list] ?? []) {
      if (one.opcode === SEND) return ran;
      if (one.opcode === CALL) {
        const inner = walk(one.operand, seen);
        if (inner !== undefined) return [...ran, ...inner];
        continue;
      }
      ran.push(`${one.opcode.toString(16)}:${one.operand.toString(16)}`);
    }
    return undefined;
  };
  const out = { touch: new Map<string, number>(), key: new Map<string, number>() };
  const collect = (entries: readonly { tag: number; opcode: number; operand: number }[]): void => {
    for (const entry of entries) {
      if (entry.tag >> 6 !== 2 || entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
      const ran = walk(entry.operand, new Set());
      if (ran === undefined) continue;
      const side = TOUCH_SCANS.has(entry.tag & SCAN) ? out.touch : out.key;
      const shape = ran.join(' ') || 'nothing';
      side.set(shape, (side.get(shape) ?? 0) + 1);
    }
  };
  for (const record of modeRecords(c) ?? []) collect(record.entries);
  for (const page of modePages(c)) collect(taggedList(c, page.list)?.entries ?? []);
  for (const address of handlerSets(c)?.addresses ?? []) collect(taggedList(c, address)?.entries ?? []);
  return out;
}

test('in Logitech\'s compiles for a Harmony One every screen command clicks before it sends and no key command does, and this project\'s own write is the exception',
  skipUnless('one_config', 'one_config_unprogrammed', 'one_spare_after_sync', 'calibration_one', 'one_spare_plus_lg_region'), () => {
    // Measured. The unprogrammed One is the factory configuration, the spare after its sync and the
    // calibration record are Logitech's compiles, and `one_config` is a configuration grown by hand,
    // so the click is the compiler's rule across both eras and not one owner's choice.
    const EXPECTED: Record<string, [number, number]> = {
      one_config: [241, 377],
      one_config_unprogrammed: [71, 54],
      one_spare_after_sync: [93, 44],
      calibration_one: [169, 163],
    };
    for (const [name, [touch, key]] of Object.entries(EXPECTED)) {
      const found = beforeTheSend(parse(payloadOf(load(name) as Uint8Array)));
      assert.deepEqual([...found.touch], [[`${CLICK.toString(16)}:fca`, touch]], `${name} screen`);
      assert.deepEqual([...found.key], [['nothing', key]], `${name} keys`);
    }
    // The control: the spare Harmony One with the LG television this project composed and wrote,
    // section 242, whose six screen sends were written without the click and still sent. So the walk
    // can see a screen send without it, and the click is Logitech's convention, not a requirement.
    const ours = beforeTheSend(parse(payloadOf(load('one_spare_plus_lg_region') as Uint8Array)));
    assert.deepEqual([...ours.touch].sort(), [['75:fca', 340], ['nothing', 6]]);
    assert.deepEqual([...ours.key], [['nothing', 432]]);
  });

test('on a Harmony One a screen command far more often sends a one block copy that waits its device\'s delay between devices first',
  skipUnless('one_config', 'one_config_unprogrammed', 'one_spare_after_sync', 'calibration_one', 'harvest_one_two_devices'), () => {
    // Section 337. Per press binding that sends, the silence before the first pulse of the record its
    // first send names, in milliseconds: 50 for an ordinary two block record, 500 or 1000 for a copy.
    const EXPECTED: Record<string, Record<string, number>> = {
      one_config: { 'key 1000': 6, 'key 50': 354, 'key 500': 17, 'screen 1000': 42, 'screen 50': 93, 'screen 500': 106 },
      one_config_unprogrammed: { 'key 50': 48, 'key 500': 6, 'screen 50': 12, 'screen 500': 59 },
      one_spare_after_sync: { 'key 50': 44, 'screen 50': 84, 'screen 500': 9 },
      calibration_one: { 'key 50': 163, 'screen 50': 133, 'screen 500': 36 },
      harvest_one_two_devices: { 'key 50': 62, 'screen 50': 123, 'screen 500': 6 },
    };
    for (const [name, expected] of Object.entries(EXPECTED)) {
      const c = parse(payloadOf(load(name) as Uint8Array));
      const sent = infraredCodesPerList(c);
      const groups = irGroups(c) ?? [];
      const lead = (group: number, code: number): number => {
        const record = groups[group]?.addresses[code] as number;
        let total = 0;
        for (const word of irBlockWords(c, irRecordBlocks(c, record)[0] as number) ?? []) {
          if (word === 0 || word & 0x8000) break;
          total += word;
        }
        return Math.round(total / 1000);
      };
      const found: Record<string, number> = {};
      const collect = (entries: readonly { tag: number; opcode: number; operand: number }[]): void => {
        for (const entry of entries) {
          if (entry.tag >> 6 !== 2 || entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
          const first = sent.get(entry.operand)?.[0];
          if (first === undefined) continue;
          const key = `${TOUCH_SCANS.has(entry.tag & SCAN) ? 'screen' : 'key'} ${lead(first.group, first.code)}`;
          found[key] = (found[key] ?? 0) + 1;
        }
      };
      for (const record of modeRecords(c) ?? []) collect(record.entries);
      for (const page of modePages(c)) collect(taggedList(c, page.list)?.entries ?? []);
      for (const address of handlerSets(c)?.addresses ?? []) collect(taggedList(c, address)?.entries ?? []);
      assert.deepEqual(Object.fromEntries(Object.entries(found).sort()), expected, name);
    }
  });
