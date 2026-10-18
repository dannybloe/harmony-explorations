/**
 * The Harmony One's welcome tour and Remote Assistant left out of a configuration, `todo-compile-one.md` 4.10,
 * findings section 421: decided on 18 October 2026, a person reads the manual instead. The eleven screens of the tour
 * and the five of the Remote Assistant, section 412, go, with the lists only they run, the hit pages only they are
 * touched through and the pictures only they draw; Options loses "Turn Remote Assistant On" and "Tutorial"; the Help
 * button's troubleshooting screens, section 415, stay.
 *
 * **What reached them, and how each stops**, found by the census of every place that enters one of the sixteen
 * (`instructionSites` for `0x7E`, section 421), which outside the sixteen themselves is three paths and nothing else
 * on Logitech's compile of two devices, the test setup's donor:
 *
 * 1. **The start's ladder**, section 403, and the leftover entry's events 1 and 5, which run it (section 412): the
 *    wiring built again with the ladder as `one_config` holds it, its last rung alone, and the leftover entry without
 *    the scan 34 press that writes the assistant's variable, `withoutTouchStartupLadder`. This takes the welcome and
 *    "Ensure all your devices are off" out of reach.
 * 2. **Options' Tutorial row**, whose list enters the tour's "Welcome!", and its "Turn Remote Assistant" row, whose
 *    value map writes the variable the ladder tested: Options built again without both, one page,
 *    `withTouchOptionsWithoutTour`.
 * 3. **The OK of "Devices Off Again"**, which goes on to the tour on eleven of the sixteen English compiles: it is one
 *    of the five and goes with them.
 *
 * First every text that stays is drawn without pointing into a screen that goes, `withTextsSharedAway`. Then the
 * sixteen modes are taken out, `dropModes`, renumbering every mode above each; every list reached before and by
 * nothing after, `dropLists`, renumbering base slot 10, with any list nothing reached before either that still names
 * one of those, three on five of the sixteen compiles; every hit page named before and by nothing after,
 * `withoutHitPages`; and the texts' form rule applied once more over what is left. Any other list nothing reached
 * before stays as it was (`todo-compile-one.md` 6.7's 34 on the test setup).
 *
 * **What stays and is reached by nothing**: the assistant's value map, its two case programs and their lists, since
 * leaving a value map out renumbers base slot 14 and the `0x72` that name it, which nothing here does yet; it writes
 * a variable nothing tests once the ladder is gone. And the assistant's and the welcome screen's state variables,
 * which base slot 13 keeps at their places.
 *
 * Arch 12 (Harmony One) alone, the touch family's; the Harmony 600, 650 and 700 skip their own tour another way,
 * `skipIntroductionTour`. Measured on the sixteen English compiles of skin 54, where the result passes every check
 * and every builder of the family rebuilds it byte for byte, and on the composed test setup; the two European
 * compiles and the Dutch one are refused, as the fixed screens' and the tour's finders refuse them. Logitech's
 * compiles keep the screens and every builder still rebuilds them, the choice `TouchChoices.welcomeTour` keeping
 * them in ours.
 */
import type { Container } from '../../gspm.ts';
import { u16 } from '../../bytes.ts';
import { BINDING_SLOT, archSlot, parse } from '../../gspm.ts';
import { layOutContainer, takeApart } from '../../frame.ts';
import { dropLists, listCallSites, namedLists } from '../../assemble.ts';
import { modeProgramRoots, modeRecords } from '../../sections.ts';
import { reachablePrograms, screenProgramRoots } from '../../screen.ts';
import { ScreenRecordError } from '../../screenrecords.ts';
import { dropModes } from '../../shared/dropmodes.ts';
import { withScreenTexts } from '../../shared/screentexts.ts';
import { blobReader } from '../../shared/spelling.ts';
import { touchTourScreenModes } from './tourscreens.ts';
import { withoutTouchStartupLadder } from './wiring.ts';
import { TOUCH_FIXED_SCREENS, touchFixedScreenModes, withTouchOptionsWithoutTour } from './fixedscreens.ts';
import { namedHitPages, withoutHitPages } from './hitpages.ts';
import { buildTouchScreenTexts, describeTouchScreenTexts, touchCharacterMap } from './screentexts.ts';

/** What leaving the tour and the assistant out took, for a caller measuring it. */
export interface WithoutTour {
  container: Container;
  /** The modes taken out, in the input's numbering: the tour's eleven and the assistant's five. */
  modes: number[];
  /** The lists taken out, in the input's numbering, and their bytes. */
  lists: number[];
  listBytes: number;
  /** Of `lists`, those nothing reached before either, which named one that goes. */
  unreachedBefore: number;
  /** The hit pages taken out, in the input's numbering. */
  hitPages: number[];
  /** The pictures only the sixteen drew. */
  pictures: number;
}

/** Where the start list is, base slot 8's leading list's call: no list below it is dropped, whatever it holds. */
function startList(c: Container): number {
  const lead = c.sections[archSlot(c.architecture as number, BINDING_SLOT)];
  const at = lead === undefined || lead.isNull ? undefined : c.blobOffsetOf(lead.address);
  if (at === undefined) throw new ScreenRecordError('base slot 8 does not read');
  return u16(c.blob, at + 1);
}

/**
 * The configuration with every text drawn by the form rule, `shareRuns`, over its texts in address order, except
 * that the texts of the programs at `last` count as coming after every other: so where a text those programs draw
 * inline is drawn elsewhere too, the first of the others holds the inline copy and nothing outside `last` draws by
 * reference into them. With `last` empty it is the rule as Logitech's compiles hold it, which every one of the
 * nineteen keeps, section 406.
 *
 * **Why the order is bent first and put back after**: a text is drawn inline once and by reference everywhere
 * else, and Logitech's compiles share across screens that otherwise have nothing to do with each other. On 14 of the
 * sixteen English compiles of skin 54 a page that stays draws text by reference into a page of the sixteen, 4 to 36
 * such draws a compile, an activity's own Remote Assistant screens drawing the start's words among them; the test
 * setup's donor and `harvest_one_families_1` have none. On `compiled_protocols` a text that stays points into
 * Options' page as well, which the Options step refuses. Taking a screen out while another points into it would
 * leave the pointer naming nothing, so the copies are moved out of the screens that go first, and once they are
 * gone the rule is applied again over what is left, which puts every inline copy back at the first draw in
 * address order.
 */
function withTextsSharedAway(c: Container, last: ReadonlySet<number>): Container {
  const layout = takeApart(c);
  const map = touchCharacterMap(c);
  const d = describeTouchScreenTexts(c, layout, blobReader(c), map);
  const order = d.texts.map((_, k) => k).sort((a, b) => Number(last.has(d.draws[a] as number)) - Number(last.has(d.draws[b] as number)) || a - b);
  const built = buildTouchScreenTexts(order.map((k) => d.texts[k]!), c, map);
  // Back into the description's order, each home renumbered with it.
  const draws = new Array<(typeof built.draws)[number]>(order.length);
  order.forEach((k, j) => {
    const one = built.draws[j]!;
    draws[k] = one.home === undefined ? { ...one } : { ...one, home: order[one.home] as number };
  });
  return parse(layOutContainer(withScreenTexts(layout, { draws, spans: draws.map((_, k) => [k, k + 1]) }, d.place)).bytes);
}

/** The blob offsets of every instruction of the programs only `roots` reach, against every other root. */
function instructionsOnlyFrom(c: Container, roots: ReadonlySet<number>): Set<number> {
  const kept = reachablePrograms(c, screenProgramRoots(c).filter((one) => !roots.has(one)));
  const out = new Set<number>();
  for (const [address, program] of reachablePrograms(c, [...roots])) {
    if (kept.has(address)) continue;
    for (const one of program) out.add(one.start);
  }
  return out;
}

/** The program roots of `modes`: each page's program and the mode's own. */
function programRootsOf(c: Container, modes: readonly number[]): Set<number> {
  const records = modeRecords(c) ?? [];
  const own = modeProgramRoots(c);
  const out = new Set<number>();
  for (const mode of modes) {
    for (const page of records[mode]?.pages ?? []) out.add(page.program);
    if (own[mode] !== undefined) out.add(own[mode] as number);
  }
  return out;
}

/**
 * The configuration without the welcome tour and the Remote Assistant. A configuration holding neither, ours after
 * this step, is returned as it is; one holding the tour without the assistant, the everyday One's compile, is taken
 * the same way, its ladder already the last rung.
 */
export function withoutTourAndAssistant(c: Container): WithoutTour {
  const found = touchTourScreenModes(c);
  if (found.modes.length === 0) return { container: c, modes: [], lists: [], listBytes: 0, unreachedBefore: 0, hitPages: [], pictures: 0 };
  const reached = namedLists(c);
  const touched = namedHitPages(c);
  const floor = startList(c);

  let out = withoutTouchStartupLadder(c);
  // No text that stays drawn by reference into the sixteen or into Options, whose page is built again: those draw
  // last, the others hold the inline copies, `withTextsSharedAway`.
  const options = touchFixedScreenModes(out)[TOUCH_FIXED_SCREENS.indexOf('Options')] as number;
  out = withTextsSharedAway(out, instructionsOnlyFrom(out, programRootsOf(out, [...found.modes, options])));
  out = withTouchOptionsWithoutTour(out);
  const modes = dropModes(out, found.modes);
  out = modes.container;
  // Every list reached before and by nothing now, the stale ones the drop left among them.
  const now = namedLists(out);
  const leaving = new Set([...reached].filter((index) => !now.has(index)));
  // A list nothing reached before either goes too where it still names what leaves: a list left entering a dropped
  // screen, which `dropModes` reports, and every list nothing reaches that calls one that goes, so that no list that
  // stays names a number that is gone. Logitech's compiles hold such chains: on `one_spare_20260830` two lists
  // nothing reaches call the one the Tutorial row ran, which enters the tour's first screen.
  for (const index of modes.stale) leaving.add(index);
  const sites = listCallSites(out);
  for (let grew = true; grew;) {
    grew = false;
    for (const site of sites) {
      if (site.within === undefined || !leaving.has(site.list) || leaving.has(site.within)) continue;
      if (now.has(site.within)) throw new ScreenRecordError(`list ${site.within} is reached and calls list ${site.list}, which goes`);
      leaving.add(site.within);
      grew = true;
    }
  }
  const gone = [...leaving].sort((a, b) => a - b);
  const lists = dropLists(out, gone, floor, sites);
  out = parse(lists.bytes);
  const pages = [...touched].filter((index) => !namedHitPages(out).has(index)).sort((a, b) => a - b);
  out = withoutHitPages(out, pages);
  // And the form rule over what is left, every inline copy at its first draw in address order again.
  out = withTextsSharedAway(out, new Set());
  return {
    container: out, modes: modes.dropped, lists: lists.dropped, listBytes: lists.length,
    unreachedBefore: gone.filter((index) => !reached.has(index)).length, hitPages: pages, pictures: modes.pictures,
  };
}
