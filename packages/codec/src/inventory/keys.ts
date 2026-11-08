/**
 * What each key does and what a screen says it does: the codes a key sends, a device mode's keypad map, the scan
 * codes a screen page binds, and the labels a page draws for its keys, paired with them by place. Part of the
 * inventory, `inventory.ts`.
 */
import { Container } from '../container/gspm.ts';
import {
  ACTION_LIST_INDEX_OPCODE, handlerSets, type ModePage, modePages, type ModeRecord, modeRecords, taggedList,
} from '../container/sections.ts';
import type { TouchArea } from '../container/tables.ts';
import { irGroups } from '../infrared/ir.ts';
import { characterMap, type ScreenString, screenStrings } from '../screens/text.ts';
import { type InfraredCode, infraredCodesPerList } from './devices.ts';
import { KEY_EVENT_SHIFT, SCAN_CODE_MASK } from './instructions.ts';
import { panelPoint, touchPageOf } from './touch.ts';

/** What a button does: the codes it sends, in order, and where it is. */
export interface KeyCode {
  /**
   * Which kind of tagged list the binding is in.
   *
   * **Both matter and for a while this only had the first.** A `page` binding belongs to a screen,
   * which is where a soft key lives. A `set` binding belongs to a base slot 9 handler set, which is
   * the key map an activity installs, and that is where the hard keys are: the volume keys of the
   * bench Harmony One are in its activities' sets and in no mode page at all.
   */
  where: 'page' | 'set';
  /** Index into `modePages` or into base slot 9's addresses, according to `where`. */
  index: number;
  /** The tagged list's key code: an event type in `0xC0` and a scan code in `0x3F`. Section 17. */
  tag: number;
  /**
   * The event type: 0 none, 1 release, 2 press, 3 repeat.
   *
   * **A code sending binding is a press, with seventeen exceptions in the corpus and they are all
   * type 0**, tags 1, 2 and 5 in a base slot 9 set, which are that set's enter and leave handlers
   * rather than keys at all. Nothing sends a code on a release or on a repeat, anywhere.
   */
  event: number;
  /** The scan code alone. Only a key when `event` is not 0. */
  scan: number;
  /** The codes the binding sends, in the order the action list sends them. */
  codes: InfraredCode[];
}

/**
 * Every button binding in the config that sends infrared, and what it sends.
 *
 * This is the button map an interface shows for a device or for a running activity, and it is the last
 * hop of section 126: a page's tagged list binds a key to a base slot 10 list and the list's `0x7D`
 * instructions name the device and the code. **A binding may send several**, 85 of 3106 across the
 * corpus, which is a macro and why the order is kept.
 *
 * Two properties hold on every container here and both are worth knowing before building on this.
 * **A code is sent on the press**, 4431 of 4448 bindings, and the seventeen that are not are event type
 * 0 in a base slot 9 set, tags 1, 2 and 5, which are its enter and leave handlers rather than keys.
 * Nothing sends a code on a release or on a repeat. And most bindings send nothing at all, because
 * navigation and screen switching are bindings too.
 *
 * **A code carries no name of its own**, since an infrared record is a stream of durations and an index
 * in its group, so a label for a button comes from the screen where a screen draws one. This used to
 * end "and from nowhere for a hard key"<!--superseded-->, and section 133 is where that stopped being
 * true: the durations decode back into the bit frame the device sees, `irframe.ts`, and a frame can be
 * matched against a catalogue of named commands. Thirty two buttons of a Harmony One and thirty six of
 * a Harmony 600 are named that way, section 133, with nothing written anywhere; the drawings in
 * `packages/silhouettes` carry them.
 *
 * **That route is not available from inside this function**, which is why the return value still has a
 * number and no name: it needs the catalogue and the button maps of the account that generated the
 * config, so it works on a config we had made and not on one somebody contributed.
 */
export function keyCodes(c: Container): KeyCode[] {
  const codes = infraredCodesPerList(c);
  const out: KeyCode[] = [];
  const collect = (where: 'page' | 'set', index: number, list: number): void => {
    for (const entry of taggedList(c, list)?.entries ?? []) {
      if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
      const sent = codes.get(entry.operand);
      if (sent === undefined) continue;
      out.push({
        where,
        index,
        tag: entry.tag,
        event: entry.tag >> KEY_EVENT_SHIFT,
        scan: entry.tag & SCAN_CODE_MASK,
        codes: sent,
      });
    }
  };
  modePages(c).forEach((page, index) => collect('page', index, page.list));
  (handlerSets(c)?.addresses ?? []).forEach((address, index) => collect('set', index, address));
  return out;
}

/** One device's own map: the keypad it takes over in device mode, and the screen pages beside it. */
export interface DeviceModeMap {
  /** The device, as an index into base slot 5's group array. */
  group: number;
  /** The base slot 6 mode it is, which is what the device list enters for this device. */
  mode: number;
  /**
   * The keypad bindings, from the **mode record's own** tagged list rather than a page's.
   *
   * The tag is the whole key code, an event type in `0xC0` and a scan code in `0x3F`, exactly as
   * base slot 9 spells one. These are physical keys: the scan codes here and the ones a page binds
   * are disjoint populations on arch 9, 12 and 14, section 271.
   */
  keypad: KeyCode[];
  /** The same for every page of that mode, which is device mode's screen and is usually the larger half. */
  screen: KeyCode[];
  /** How many pages those screen bindings are spread over. */
  pages: number;
}

/**
 * Device mode's own map, per device: the map the remote installs when somebody picks a device.
 *
 * **This closes section 151's open question and refutes what it left standing.** That section
 * measured base slot 9 and found that every keypad map sending an infrared code is installed by an
 * activity, and concluded that no configuration here holds a map for device mode. Base slot 9 is
 * the wrong place to have looked: a device's map is a **base slot 6 mode record's own tagged list**,
 * the one section 52 reads through the back pointer beside the entry, and the firmware consults it
 * on every key press. Section 271.
 *
 * The mode is picked as the one whose maps are largest for this device, and that choice is checked
 * two ways rather than trusted: it is unique in all 62 device groups of the corpus that have codes,
 * it sends **only** that device in all 62, and on arch 12 (Harmony One), where the drawn device list
 * names a mode by an entirely separate route, the two agree 8 times out of 8.
 *
 * A device with no infrared codes is absent, because a map that sends nothing cannot be found this
 * way; the Harmony 600 configuration has one such device.
 */
export function deviceModeMaps(c: Container): DeviceModeMap[] {
  const codes = infraredCodesPerList(c);
  const records = modeRecords(c);
  if (records === undefined) return [];

  // A mode's own bindings and its pages', reduced to the devices each half addresses. Built once
  // for every mode, because the pick below is a maximum over all of them per device.
  const read = (list: number, where: 'page' | 'set', index: number): KeyCode[] => {
    const out: KeyCode[] = [];
    for (const entry of taggedList(c, list)?.entries ?? []) {
      if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
      const sent = codes.get(entry.operand);
      if (sent === undefined) continue;
      out.push({
        where,
        index,
        tag: entry.tag,
        event: entry.tag >> KEY_EVENT_SHIFT,
        scan: entry.tag & SCAN_CODE_MASK,
        codes: sent,
      });
    }
    return out;
  };
  const groupsOf = (bindings: readonly KeyCode[]): Set<number> =>
    new Set(bindings.flatMap((one) => one.codes.map((sent) => sent.group)));

  let firstPage = 0;
  const surveyed = records.map((record, mode) => {
    const at = firstPage;
    firstPage += record.pages.length;
    const keypad = read(record.start, 'set', mode);
    const screen = record.pages.flatMap((page, k) => read(page.list, 'page', at + k));
    return { mode, keypad, screen, groups: groupsOf([...keypad, ...screen]) };
  });

  const out: DeviceModeMap[] = [];
  for (const group of irGroups(c)?.map((_, index) => index) ?? []) {
    // Only the modes that carry a keypad map are candidates. A screen only mode addressing this
    // device is an activity's page, which serves several devices at once and would win on size.
    const mine = surveyed.filter((one) => one.keypad.length > 0 && one.groups.has(group));
    if (mine.length === 0) continue;
    const size = (one: (typeof surveyed)[number]): number => one.keypad.length + one.screen.length;
    const largest = Math.max(...mine.map(size));
    const top = mine.filter((one) => size(one) === largest);
    if (top.length !== 1) continue;
    const found = top[0] as (typeof surveyed)[number];
    if (found.groups.size !== 1) continue;
    out.push({
      group,
      mode: found.mode,
      keypad: found.keypad,
      screen: found.screen,
      pages: (records[found.mode] as ModeRecord).pages.length,
    });
  }
  return out;
}

/**
 * The scan codes this config's screens label, meaning its soft keys.
 *
 * **Derived rather than tabulated**, section 128, because the container states it: a mode page's tagged
 * list belongs to a screen, so a scan bound there is a key that screen labels, and a base slot 9 set
 * belongs to a running activity, so a scan bound there is a key on the keypad. The closure is that the
 * two are **disjoint**: across the corpus arch 9 (Harmony 525), arch 12 (Harmony One) and arch 14
 * (Harmony 600 and 700) share not one scan between the two, and arch 8 (Harmony 880) shares exactly
 * one. The census is 8 scans on arch 8, 5 on arch 9, 8 on arch 12 and 4 on arch 14, and it is per
 * architecture rather than per config: six arch 8 configs agree exactly, as do four arch 12 ones and
 * three arch 14 ones. Two independent agreements, both partial and both worth having: arch 12's eight
 * are section 125's touch codes bar the two side keys, and arch 9's include the four that
 * `reference/silhouettes/h525.svg` narrows its soft keys to by a route through the firmware.
 */
export function softKeyScans(c: Container): number[] {
  const found = new Set<number>();
  for (const scans of pageScans(c)) for (const scan of scans) found.add(scan);
  return [...found].sort((a, b) => a - b);
}

/**
 * The scan codes each mode page binds, in page order, whatever the binding does.
 *
 * **Not the same population as `keyCodes`**, and the difference has bitten twice: `keyCodes` only
 * reports a binding that ends in an infrared code, so a key that starts an activity or opens another
 * menu is absent from it. Anything asking "which pages are there and what do they bind" wants this,
 * or it silently loses every activity page. Section 129.
 */
export function pageScans(c: Container): number[][] {
  return modePages(c).map((page) => {
    const found = new Set<number>();
    for (const entry of taggedList(c, page.list)?.entries ?? []) {
      if (entry.opcode === ACTION_LIST_INDEX_OPCODE) found.add(entry.tag & SCAN_CODE_MASK);
    }
    return [...found].sort((a, b) => a - b);
  });
}

/**
 * A screen row: the two keys beside it, and the band of pixel rows its label is drawn in.
 *
 * **Measured, not laid out by eye**, section 128. Every architecture but arch 12 (Harmony One) puts its
 * soft keys in two columns down the side of the screen, and the row a key belongs to is fixed by the
 * hardware rather than stated by the config. The bands come from where the labels of activities are
 * actually drawn, which section 121 attributes without using geometry at all: on arch 8 (Harmony 880)
 * four rows at pixel 42, 74, 106 and 138, on arch 14 (Harmony 600 and 700) two at 35 and 79, and on
 * arch 9 (Harmony 525) two at 13 and 35. An item may wrap onto a second line, so a band is roughly a
 * row and a half rather than a line.
 *
 * **Which key is the left one is settled per architecture and not assumed.** On arch 8 the activity
 * route names all eight keys of one page, four at x 3 and four at x 70 to 97, so the left column is
 * `5, 6, 7, 8`. On arch 9 the same route names three keys, and it puts the **larger** scan of each pair
 * on the left, so the 525's left column is the odd one; that also answers what
 * `reference/silhouettes/h525.svg` deliberately left open, which of matrix columns 6 and 7 is the left.
 * On arch 14 the route only ever names centred labels, so the side comes from behaviour instead: the
 * help screens draw "No" at x 5 and "Yes" at x 97, and scan 9's action list is the one that differs per
 * screen while scan 34's is identical on all of them, which is what a retry and a finish look like.
 */
export interface ScreenRow {
  left: number;
  right: number;
  /** Pixel rows `[from, to)`, which is where this row's label and its wrapped continuation are drawn. */
  from: number;
  to: number;
}

export const SCREEN_ROWS: Readonly<Record<number, readonly ScreenRow[]>> = {
  8: [
    { left: 5, right: 45, from: 36, to: 62 },
    { left: 6, right: 46, from: 68, to: 94 },
    { left: 7, right: 48, from: 100, to: 126 },
    { left: 8, right: 44, from: 132, to: 158 },
  ],
  9: [
    { left: 39, right: 38, from: 8, to: 30 },
    { left: 31, right: 30, from: 30, to: 52 },
  ],
  14: [
    { left: 2, right: 8, from: 29, to: 55 },
    { left: 9, right: 34, from: 73, to: 99 },
  ],
};

/**
 * The gap in pixels that separates the two columns of a row from one wrapped label's own indentation.
 *
 * A row holds either one item across the screen or one per column, and the two cases have to be told
 * apart from the drawing: 24 pixels is comfortably above the few pixels a second line is indented by
 * and comfortably below the 50 to 90 that separate two columns in every sample here.
 */
const COLUMN_GAP = 24;

/**
 * How far below a label's line its wrapped continuation can start, in pixels.
 *
 * A band is wide enough to hold a two line label and that means it is also wide enough to catch a line
 * of something else. The two are told apart by the line pitch: a continuation sits one text line below
 * its own first line, 11 pixels on arch 9 (Harmony 525) and 14 on arch 8 (Harmony 880) and arch 14
 * (Harmony 600 and 700), where the menu footers that share these bands sit 19 or more below. Four of
 * the five labels that disagreed with the activity route before this test were a footer's first line
 * joined onto an item's name.
 */
const LINE_GAP = 16;

/** A drawn label attributed to a button. */
export interface KeyLabel {
  /** Index into `modePages`. Only a page binding can have a label; a set binding is a hard key. */
  index: number;
  scan: number;
  /** The text, with a wrapped label's rows joined by a space. */
  text: string;
  /**
   * How it was attributed, and the two are not equally strong.
   *
   * `touch` is stated: base slot 17 gives the key's rectangle and the label is the text inside it, so
   * it exists on arch 12 (Harmony One) alone. `row` is `SCREEN_ROWS`, whose band is measured and whose
   * side is established per architecture, so it is a reading of the hardware's layout rather than of
   * the config. Neither is the chain of section 121, which names an activity's key without geometry of
   * any kind: that is `activityNames`, and it is what these two are calibrated against rather than a
   * third route here, since it agrees with them on 62 of the 63 keys where both have an opinion.
   */
  source: 'touch' | 'row';
}

/** Reading order: down the screen, then across it. */
function inReadingOrder(a: ScreenString, b: ScreenString): number {
  return a.y === b.y ? a.x - b.x : a.y - b.y;
}

/**
 * The label drawn for each button that a screen labels, keyed by `<page>:<scan>`.
 *
 * This is what turns "device 0, code 29" into a word on a page, and there is no other source for it:
 * an infrared record has no name, section 126, so a button's name is the text beside it or nothing.
 *
 * **A label is attributed to the nearest region, not to the first one that contains it.**
 * `touchOwner` implements the firmware's rule, which is the first rectangle containing the point, and
 * that is right for a touch and wrong for a label: a label's `x` is where its first glyph starts, so a
 * long string in the right hand column starts inside the left hand rectangle where the two overlap.
 * Nearest centre fixes seven labels in `one_config` that first match put on the wrong key, and it is
 * the same seven either way, since a region a label is wholly inside is also the nearest.
 *
 * **Off arch 12 the route is `SCREEN_ROWS`**, and the rule it replaced is worth stating because it fits
 * the counts and is wrong: the k-th soft key in ascending scan order taking the k-th row of text from
 * the top. On the 600's own activity menu that pairs four keys with four rows perfectly and gets two of
 * them wrong, because scans 2 and 8 both belong to the first row and 9 and 34 both to the second, while
 * the outer two rows of text are a title and a footer. A key belongs to a **place** on the screen, and
 * the places are two columns of rows, so that is what is measured.
 */
/**
 * Which label owns which infrared group, given what each device variable reaches.
 *
 * Extracted from `devices` so the refusal below has a caller that can reach it: no container in the
 * corpus contests a group, 0 in nineteen, so the branch is unreachable through `devices` and a rail
 * nobody can trigger is a rail nobody has tested. Same move as `eraseBoundsFor` in `packages/usb`.
 *
 * **A contested group names nobody, and it is not "left over" either.** The rule used to be a bare
 * `continue`, which kept the group for the first label and left the second **free**, so the forced
 * pairing in `devices` could hand that label an unrelated leftover group and return it as
 * `source: 'elimination'`. That reads as a weaker but real answer where the evidence in fact
 * contradicts itself, and it is where a wrong device name would reach FreeHarmony. So both the
 * label and the group are withdrawn, and `contested` is what keeps the group out of the free pool.
 * Section 139.
 */
export function pairLabelsToGroups(
  reaches: readonly { label: string; group: number }[],
): { named: Map<string, number>; contested: Set<number> } {
  const named = new Map<string, number>();
  const contested = new Set<number>();
  for (const { label, group } of reaches) {
    const already = named.get(label);
    // Two variables of one device must agree, and two devices must not claim one group.
    if (already !== undefined && already !== group) continue;
    if (already === undefined && [...named.values()].includes(group)) {
      contested.add(group);
      continue;
    }
    named.set(label, group);
  }
  for (const group of contested) {
    for (const [label, mine] of [...named]) if (mine === group) named.delete(label);
  }
  return { named, contested };
}

/**
 * The scan codes one mode page binds, which is the population both label routes answer for.
 *
 * One derivation rather than two: the row route computed it and the touch route did not, which is
 * how the touch route came to label keys a page has not got. Section 139.
 */
function boundScans(c: Container, page: ModePage): Set<number> {
  return new Set(
    (taggedList(c, page.list)?.entries ?? [])
      .filter((entry) => entry.opcode === ACTION_LIST_INDEX_OPCODE)
      .map((entry) => entry.tag & SCAN_CODE_MASK),
  );
}

export function keyLabels(c: Container): Map<string, KeyLabel> {
  const out = new Map<string, KeyLabel>();
  const pages = modePages(c);
  const map = characterMap(c);
  const drawn = screenStrings(c, map);
  pages.forEach((page, index) => {
    const texts = drawn
      .filter((one) => one.program === page.program && one.text.trim().length > 0)
      .sort(inReadingOrder);
    if (texts.length === 0) return;
    const areas = touchPageOf(c, page)?.areas;
    if (areas === undefined || areas.length === 0) return;
    // **Only scans this page actually binds**, which the row route below has always required and
    // this one did not: a region holding text got a label whether or not the page has a key there.
    // 292 of `one_config`'s 1103 entries named a scan its page does not bind. Inert for the bench,
    // which looks up by bound scan, and not inert for a consumer that **iterates** the map, which
    // is what a `Map` invites: it would get labels for keys that page has not got. Section 139.
    const bound = boundScans(c, page);
    if (bound.size === 0) return;
    // The stated route. Group the page's strings by the region each belongs to, then join the strings
    // of one region in reading order, which is what a label wrapped onto a second line is.
    const perArea = new Map<number, ScreenString[]>();
    for (const one of texts) {
      const inside = areas.filter((area) => panelInside(area, one));
      const nearest = nearestArea(inside, one);
      if (nearest === undefined) continue;
      const acc = perArea.get(nearest.code) ?? [];
      acc.push(one);
      perArea.set(nearest.code, acc);
    }
    for (const [scan, found] of perArea) {
      if (!bound.has(scan)) continue;
      out.set(`${index}:${scan}`, {
        index,
        scan,
        text: found.map((one) => one.text.trim()).join(' '),
        source: 'touch',
      });
    }
  });
  // The row route, for every architecture whose keys sit beside the screen rather than on it. A row's
  // band is read for the text it holds, which is split into columns only where there is a real gap,
  // since a label wrapped onto a second line is indented by a few pixels and a second column is not.
  const rows = SCREEN_ROWS[c.architecture ?? -1] ?? [];
  if (rows.length > 0) {
    pages.forEach((page, index) => {
      const bound = boundScans(c, page);
      if (bound.size === 0) return;
      const texts = distinct(drawn.filter((one) => one.program === page.program
        && one.text.trim().length > 0));
      for (const row of rows) {
        if (!bound.has(row.left) && !bound.has(row.right)) continue;
        const on = texts.filter((one) => one.y >= row.from && one.y < row.to).sort(inReadingOrder);
        if (on.length === 0) continue;
        const columns = byColumn(on);
        // One item across the row belongs to both its keys, since either of them chooses it. Two items
        // belong to one key each, and that is the only place the side of the row matters.
        const [first, second] = columns.map(contiguous);
        for (const [scan, found] of [[row.left, first], [row.right, second ?? first]] as const) {
          if (!bound.has(scan) || found === undefined || found.length === 0) continue;
          const key = `${index}:${scan}`;
          if (out.has(key)) continue;
          out.set(key, {
            index,
            scan,
            text: found.map((one) => one.text.trim()).join(' '),
            source: 'row',
          });
        }
      }
    });
  }
  return out;
}

/**
 * A column's lines from its first one down, stopping at the first line that is too far below the last.
 *
 * This is what keeps a menu's footer out of the bottom row's label: a wrapped second line is one text
 * line below, a footer is a line and a half or more.
 */
function contiguous(on: readonly ScreenString[]): ScreenString[] {
  const out: ScreenString[] = [];
  for (const one of on) {
    const last = out[out.length - 1];
    if (last !== undefined && one.y - last.y > LINE_GAP) break;
    out.push(one);
  }
  return out;
}

/** The same string drawn twice at the same place is one label, which is what a page's copies are. */
function distinct(texts: readonly ScreenString[]): ScreenString[] {
  const seen = new Set<string>();
  return texts.filter((one) => {
    const key = `${one.x}:${one.y}:${one.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * A row's strings split into its columns, in reading order, one entry per column.
 *
 * The split is the widest gap between adjacent x positions, taken only if it is at least `COLUMN_GAP`,
 * so a two line label whose second line starts a few pixels in stays one item and a left and a right
 * item do not. A row never holds three, which is why this returns one entry or two.
 */
function byColumn(on: readonly ScreenString[]): ScreenString[][] {
  const xs = [...new Set(on.map((one) => one.x))].sort((a, b) => a - b);
  let at = -1;
  let widest = 0;
  for (let i = 1; i < xs.length; i += 1) {
    const gap = (xs[i] as number) - (xs[i - 1] as number);
    if (gap <= widest) continue;
    widest = gap;
    at = i;
  }
  if (widest < COLUMN_GAP || at < 0) return [[...on]];
  const split = xs[at] as number;
  return [on.filter((one) => one.x < split), on.filter((one) => one.x >= split)];
}

/** Whether a drawn string's own start point is inside a rectangle, in panel coordinates. */
function panelInside(area: TouchArea, one: ScreenString): boolean {
  const point = panelPoint(one.x, one.y);
  return (
    point.x >= area.x &&
    point.x < area.x + area.width &&
    point.y >= area.y &&
    point.y < area.y + area.height
  );
}

/** Of the rectangles a point is inside, the one whose centre is closest to it. */
function nearestArea(areas: readonly TouchArea[], one: ScreenString): TouchArea | undefined {
  const point = panelPoint(one.x, one.y);
  let best: TouchArea | undefined;
  let bestDistance = Infinity;
  for (const area of areas) {
    const dx = area.x + area.width / 2 - point.x;
    const dy = area.y + area.height / 2 - point.y;
    const distance = dx * dx + dy * dy;
    if (distance >= bestDistance) continue;
    bestDistance = distance;
    best = area;
  }
  return best;
}
