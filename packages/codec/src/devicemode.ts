/**
 * How Logitech's compiler lays a whole device out in device mode, the part every family shares: which
 * commands go to the keypad, by the family's own table of hard keys, `Family.deviceModeKeys`, and which go
 * to the screen and in what order. Section 325 read it on the Harmony 600, 650 and 700, section 397 the keys
 * on the Harmony One. How a four slot page sizes, splits and places a label, cuts a title and draws its
 * counter is that family's, `families/four-slot/devicemode.ts`, `todo-compile-one.md` 3.3.3.3.
 *
 * **Every rule here is read off the compiler's output and none off its code.** The population is the
 * twenty devices Logitech compiled from its catalogue for the test accounts, in seven of the thirteen
 * configurations of section 312: seventeen test devices of the six power hold compiles and the three
 * devices of `calibration_h600`, nineteen catalogue entries since one is on two records. Each
 * device's commands are named from the archive's own codeset, and its device mode is then read as a key
 * map and a run of screen pages. `test/devicemode.test.ts` scores every rule against all twenty and names
 * every difference; the counts live there and in section 325, not here.
 *
 * Two things a reader should know before trusting it, each said again where it bites:
 *
 * * a family's **hard key table is fitted** to its compiles. Each scan's preference list is the
 *   shortest order consistent with every device that offers more than one candidate. A command name no
 *   device of the population carries will never be placed on a key, which is the safe direction: it
 *   lands on the screen, where the compiler would put any command it did not place on a key;
 * * the **screen's leading commands are an order and not a set of rules**: power first, then a short
 *   fixed list, then everything else sorted. Several pairs in that list are never decided by the
 *   population, so their order is a choice, and `SCREEN_FIRST`'s docstring names them. It was read on
 *   the Harmony 600 family's pages; the Harmony One's composer orders its pages by it too, which no
 *   measurement on the One's pages has checked.
 */
import type { Container } from './gspm.ts';
import { fontSets, glyphOf } from './font.ts';
import { blockOfStatedCode, statedCode, statedProtocol, type StatedCode } from './stated.ts';
import { letterForm } from './lettering.ts';
import { oxaniumAlphabet } from './text.ts';

// ---------------------------------------------------------------------------------------------------
// Keys and screen

/**
 * One hard key a device mode binds: its scan, the key as printed, and the catalogue commands it takes **in
 * order of preference**: the first the device has is the one bound, and a key none of whose candidates the
 * device has is bound to nothing. Each family states its own table, `Family.deviceModeKeys`.
 */
export interface HardKey {
  readonly scan: number;
  readonly button: string;
  readonly prefer: readonly string[];
  /**
   * Commands taken after `prefer`, each only where no other key of the device sends it already: the
   * Harmony One's scan 13 takes Enter on two catalogue devices and nothing on the three whose Guide or
   * Select key sends Enter, which no preference list can say.
   */
  readonly ifFree?: readonly string[];
}

/**
 * The commands a device mode's screen opens with, in this order, **whether or not a key holds them
 * too**: Return is on the screen of every device here that has it, while three hold it on the Previous
 * channel key and four on the Stop key. Every other command follows, sorted, and only if no key holds it.
 *
 * The order is what the population shows, as constraints between pairs: the three power commands first,
 * then Teletext before Home, Eject, Subtitle, Aspect, Timer and List; Home before Eject and Subtitle; all
 * of them before Return; Return before the disc pair and the PlayStation's four symbols. **Several pairs
 * are never decided by it** and are ordered here by choice, not by evidence: Home, Eject and Subtitle
 * against Aspect and Timer, Eject against Subtitle, and List against everything after Teletext. The four
 * symbols are read off the Harmony 650's own PlayStation 3, a user configuration rather than a catalogue
 * compile.
 */
export const SCREEN_FIRST: readonly string[] = [
  'PowerToggle', 'PowerOn', 'PowerOff', 'Teletext', 'List', 'Home', 'Eject', 'Subtitle', 'Aspect',
  'Timer', 'Return', 'NextDisc', 'PreviousDisc', 'Triangle', 'Circle', 'Square', 'Cross',
];

/**
 * The order of everything after `SCREEN_FIRST`: **case folded, hyphens passed over, and then by
 * character code**, which is neither the catalogue's order nor a hash order. What separates it from a
 * plain sort: `i-Manual` after `Football`, `InputHdmi2` before `InputHDMI3` before `InputHdmi4`,
 * `InputVideo 1/MD` between `InputVideo` and `InputVideo1`, a space sorting below a digit, and `In-Start`
 * after `InputTv`, which is the one case in the population a hyphen decides and the one device the rules
 * were not fitted to, `IGNORED`. Ties, two names folding to the same string, keep the catalogue's order,
 * which no device here puts to the test.
 *
 * **What is sorted is the label and not the command**, which for a catalogue device is one string: the
 * Harmony 650 account's Denon, whose labels its account edited, has `okidoki` between `ModeVirtual` and
 * `Option`. A composer that lets a person rename a command sorts by the new name.
 */
export function screenCompare(a: string, b: string): number {
  const ordinal = (x: string, y: string): number => (x < y ? -1 : x > y ? 1 : 0);
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return ordinal(x.replace(IGNORED, ''), y.replace(IGNORED, '')) || ordinal(x, y);
}

/**
 * What the order passes over: a hyphen. `In-Start` and `In-Stop` follow `InputTv` on the Harmony 650
 * account's LG OLED65G26LA, which they would precede if the hyphen counted, since it is below every
 * letter. That is how a word sort treats a hyphen, so that `co-op` sorts beside `coop`. Two names that
 * differ only in a hyphen are then ordered with it, which nothing here puts to the test.
 */
const IGNORED = /-/g;

export interface DeviceModeLayout {
  /** The command each hard key sends, by scan. A scan absent here is bound to nothing. */
  keys: Map<number, string>;
  /** The screen's commands in order, four to a page, filling top left, top right, bottom left, bottom right. */
  screen: string[];
}

/**
 * A device's device mode as the compiler lays it out, from its catalogue commands in catalogue order, with
 * the hard key table of the device's family, `Family.deviceModeKeys`, since which command a key takes is
 * the family's: the Harmony One binds other commands to its keys than the Harmony 650 to the same names.
 * A name the catalogue states twice counts once, at its first place, which is what a composer reading
 * the catalogue by name has to do anyway.
 */
export function deviceModeLayout(commands: readonly string[], hardKeys: readonly HardKey[]): DeviceModeLayout {
  const names = [...new Set(commands)];
  const have = new Set(names);
  const keys = new Map<number, string>();
  for (const key of hardKeys) {
    const chosen = key.prefer.find((name) => have.has(name));
    if (chosen !== undefined) keys.set(key.scan, chosen);
  }
  // A key's free candidates once every key has had its preferences, since free means no key sends it.
  for (const key of hardKeys) {
    if (keys.has(key.scan) || key.ifFree === undefined) continue;
    const held = new Set(keys.values());
    const chosen = key.ifFree.find((name) => have.has(name) && !held.has(name));
    if (chosen !== undefined) keys.set(key.scan, chosen);
  }
  const onKeys = new Set(keys.values());
  const first = SCREEN_FIRST.filter((name) => have.has(name));
  const leading = new Set(first);
  // A stable sort, so two names folding equal keep their catalogue order.
  const rest = names.filter((name) => !leading.has(name) && !onKeys.has(name)).sort(screenCompare);
  return { keys, screen: [...first, ...rest] };
}

/**
 * Whether a catalogue keycode can be composed into a record at all: a code the notation reads, a family
 * with a rhythm, and a whole block the rhythm table can build. The same three checks `composeIrGroup`
 * refuses on, asked in advance so a whole device can leave out what it cannot send and say how much.
 *
 * `read` is the code as its family's definition reads it, `statedCodeOfDefinition`, where the caller has
 * the archive, which is what the catalogue composer passes since section 359; without it the code is read
 * at the widths its family's name spells, which is the verdict `make composecensus` prints as the table
 * alone, before section 348.
 */
export function composableKeycode(keycode: string, read: StatedCode | undefined = statedCode(keycode)): boolean {
  if (read === undefined || statedProtocol(read.family) === undefined) return false;
  return blockOfStatedCode(read, undefined, 'once') !== undefined;
}

/**
 * Which of our faces, in which weights, could have drawn each of a configuration's font sets, as
 * `F14/SemiBold` and so on: every face and weight that draws all of its one bit letters, by their form,
 * `oxaniumAlphabet().drawnIn`; empty for a set none does, Logitech's and a blended copy among them. Read off
 * the letters alone, so a configuration in any weights is known with no memory of how it was built, 10.8.5.
 *
 * **More than one is the rule, not an accident**: a label face and the regular face of its height, F15 and
 * R15, F13 and R13, are one geometry in two weights, so a set in SemiBold is F15 or R15 in SemiBold alike.
 * `ladderOf` settles that by Logitech's convention, which the choice is held to.
 */
export function oxaniumFacesOf(c: Container): readonly (readonly string[])[] {
  const known = FACES_OF.get(c);
  if (known !== undefined) return known;
  const drawnIn = oxaniumAlphabet().drawnIn;
  const out = (fontSets(c) ?? []).map((set) => {
    const counts = new Map<string, number>();
    let letters = 0;
    set.glyphs.forEach((address, k) => {
      if (address === undefined) return;
      const glyph = glyphOf(c, set, set.first + k);
      const form = glyph === undefined ? undefined : letterForm(glyph.rows);
      if (form === undefined) return;
      letters += 1;
      for (const face of drawnIn[form.form] ?? []) counts.set(face, (counts.get(face) ?? 0) + 1);
    });
    return letters === 0 ? [] : [...counts].filter(([, count]) => count === letters).map(([face]) => face);
  });
  FACES_OF.set(c, out);
  return out;
}

const FACES_OF = new WeakMap<Container, readonly (readonly string[])[]>();
