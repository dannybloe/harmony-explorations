/**
 * How Logitech's compiler lays a whole device out in device mode on arch 14 (Harmony 600, 650 and
 * 700): which commands go to the keypad, which to the screen and in what order, how a label is sized
 * and split over two lines, how a title is cut, and where the page counter sits. Section 325.
 *
 * **Every rule here is read off the compiler's output and none off its code.** The population is the
 * twenty devices Logitech compiled from its catalogue for the test accounts, in seven of the thirteen
 * configurations of section 312: seventeen test devices of the six power hold compiles and the three
 * devices of `calibration_h600`, nineteen catalogue entries since one is on two records. Each
 * device's commands are named from the archive's own codeset, and its device mode is then read as a key
 * map and a run of screen pages. `test/devicemode.test.ts` scores every rule against all twenty and names
 * every difference; the counts live there and in section 325, not here.
 *
 * Three things a reader should know before trusting it, each said again where it bites:
 *
 * * the **hard key table is fitted** to those twenty devices. Each scan's preference list is the
 *   shortest order consistent with every device that offers more than one candidate, and the account's
 *   own button maps for `calibration_h600` agree with it where they were captured. A command name no
 *   device of the population carries will never be placed on a key, which is the safe direction: it
 *   lands on the screen, where the compiler would put any command it did not place on a key;
 * * the **screen's leading commands are an order and not a set of rules**: power first, then a short
 *   fixed list, then everything else sorted. Several pairs in that list are never decided by the
 *   population, so their order is a choice, and `SCREEN_FIRST`'s docstring names them;
 * * the **glyph widths are a table**, `LABEL_SIZES`, because a configuration carries only the glyphs it
 *   draws and the compiler decides a label's size from the whole typeface. A character with no width in
 *   a size, because no configuration here draws it there or because the character map names no code
 *   for it, as with `J` and `#`, is measured as not fitting that size.
 */
import type { Container } from './gspm.ts';
import { fontSets, glyphOf, type FontSet } from './font.ts';
import { blockOfStatedCode, statedCode, statedProtocol, type StatedCode } from './stated.ts';
import { FOUR_SLOT_LEFT_X, FOUR_SLOT_RIGHT_END, FOUR_SLOT_LABEL_Y } from './inventory.ts';

// ---------------------------------------------------------------------------------------------------
// Keys and screen

/**
 * The hard keys a device mode binds, by scan, each with the catalogue commands it takes **in order of
 * preference**: the first the device has is the one bound, and a key none of whose candidates the device
 * has is bound to nothing.
 *
 * Fitted to the twenty devices of the population, as the module docstring says, and corroborated by the
 * account's own button maps for `calibration_h600`'s Denon AVR-1912 and Panasonic Blu-ray, captured off
 * Logitech's service: Exit is Return on the receiver and Cancel on the player, Info is DirectionDown on
 * the receiver, Guide and Select are Enter on the receiver and OK on the player, Channel Up is TuneUp on
 * the receiver and DirectionUp on the player. **A key taking a direction or a confirm as a fallback is
 * the compiler's own choice and not a slip**: those maps are the defaults the service assigned.
 *
 * **The orders are thin evidence**: only Menu, Exit, the two channel keys, Guide, Info, Stop, Previous
 * channel, Play, Pause and Select have a device offering two candidates. On Number plus, the skip keys
 * and rewind and fast forward none does, so their order is a choice; most fallbacks rest on one device,
 * the Menu key's Home on the Sony KDL-32W705B among them; and the Enter key's NumberEnter is the only
 * candidate any device here offered.
 */
export const HARD_KEYS: readonly { scan: number; button: string; prefer: readonly string[] }[] = [
  { scan: 10, button: 'Menu', prefer: ['Menu', 'Home'] },
  { scan: 12, button: 'Exit', prefer: ['Cancel', 'Exit', 'Clear', 'Return'] },
  { scan: 13, button: 'Red', prefer: ['Red'] },
  { scan: 49, button: 'Green', prefer: ['Green'] },
  { scan: 28, button: 'Yellow', prefer: ['Yellow'] },
  { scan: 29, button: 'Blue', prefer: ['Blue'] },
  { scan: 14, button: 'Volume up', prefer: ['VolumeUp'] },
  { scan: 15, button: 'Volume down', prefer: ['VolumeDown'] },
  { scan: 16, button: 'Mute', prefer: ['Mute'] },
  { scan: 19, button: 'Number plus', prefer: ['Clear', '.', '*'] },
  { scan: 20, button: '0', prefer: ['0'] },
  { scan: 24, button: '1', prefer: ['1'] },
  { scan: 47, button: '2', prefer: ['2'] },
  { scan: 39, button: '3', prefer: ['3'] },
  { scan: 17, button: '4', prefer: ['4'] },
  { scan: 48, button: '5', prefer: ['5'] },
  { scan: 37, button: '6', prefer: ['6'] },
  { scan: 18, button: '7', prefer: ['7'] },
  { scan: 53, button: '8', prefer: ['8'] },
  { scan: 45, button: '9', prefer: ['9'] },
  { scan: 21, button: 'Skip back', prefer: ['ChapterPrev', 'SkipBack'] },
  { scan: 22, button: 'Rewind', prefer: ['Rewind', 'iPodRewind'] },
  { scan: 23, button: 'Record', prefer: ['Record'] },
  { scan: 26, button: 'Page up', prefer: ['PageUp'] },
  { scan: 27, button: 'Page down', prefer: ['PageDown'] },
  { scan: 30, button: 'Fast forward', prefer: ['FastForward', 'iPodFastForward'] },
  { scan: 31, button: 'Channel up', prefer: ['ChannelUp', 'NextDisc', 'TuneUp', 'DirectionUp'] },
  { scan: 32, button: 'Channel down', prefer: ['ChannelDown', 'PreviousDisc', 'TuneDown', 'DirectionDown'] },
  { scan: 33, button: 'Guide', prefer: ['Guide', 'Select', 'Enter', 'OK'] },
  { scan: 36, button: 'Info', prefer: ['Info', 'Display', 'DirectionDown'] },
  { scan: 38, button: 'Skip forward', prefer: ['ChapterNext', 'SkipForward'] },
  { scan: 40, button: 'Stop', prefer: ['Stop', 'Pause', 'iPodStop', 'Return'] },
  { scan: 41, button: 'Right', prefer: ['DirectionRight'] },
  { scan: 52, button: 'Left', prefer: ['DirectionLeft'] },
  { scan: 50, button: 'Up', prefer: ['DirectionUp'] },
  { scan: 42, button: 'Down', prefer: ['DirectionDown'] },
  { scan: 43, button: 'Previous channel', prefer: ['ChannelPrev', 'Cancel', 'Return'] },
  { scan: 44, button: 'Play', prefer: ['Play', 'Select', 'iPodPlay', 'Enter'] },
  { scan: 46, button: 'Pause', prefer: ['Pause', 'Select', 'iPodPause'] },
  { scan: 51, button: 'Select', prefer: ['Select', 'OK', 'Enter', 'Stop'] },
  { scan: 54, button: 'Enter', prefer: ['NumberEnter'] },
];

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
 * A device's device mode as the compiler lays it out, from its catalogue commands in catalogue order.
 * A name the catalogue states twice counts once, at its first place, which is what a composer reading
 * the catalogue by name has to do anyway.
 */
export function deviceModeLayout(commands: readonly string[]): DeviceModeLayout {
  const names = [...new Set(commands)];
  const have = new Set(names);
  const keys = new Map<number, string>();
  for (const key of HARD_KEYS) {
    const chosen = key.prefer.find((name) => have.has(name));
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

// ---------------------------------------------------------------------------------------------------
// Labels, titles and the counter

/**
 * A typeface at one size, as the compiler measures text with it: a height and every character's width,
 * the letter gap included, which is how a glyph is stored, `font.ts`.
 *
 * **A size is several font sets in one configuration**, all drawing the same glyphs at the same widths
 * and each carrying only the characters its own texts use: `h650_config_region` has six sets of the
 * title's size. So a size is recognised by its widths and not by a font number, `sizeOfSet`, and the
 * table below is the union over the thirteen arch 14 configurations in the lab, every set of a size
 * agreeing on every character they share.
 */
export interface LabelSize {
  name: string;
  height: number;
  widths: ReadonlyMap<string, number>;
}

function size(name: string, height: number, chars: string, widths: string): LabelSize {
  if (chars.length !== widths.length) throw new Error(`${name}: ${chars.length} characters, ${widths.length} widths`);
  return { name, height, widths: new Map([...chars].map((ch, k) => [ch, parseInt(widths[k] as string, 16)])) };
}

/**
 * The sizes a device mode label is tried in, largest first, which is the ladder the compiler walks:
 * a label goes in the first size it fits, on one line or split over two. Every label line on the twenty
 * devices' pages is drawn in one of these six sizes. The width strings are hexadecimal, one digit per
 * character, and `devicemode.test.ts` holds them equal to the union over the thirteen arch 14
 * configurations Logitech compiled.
 */
export const LABEL_SIZES: readonly LabelSize[] = [
  size('15', 15, ' +-./0123456789ABCDEFGHIKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz',
    '485458888888888baaa99ba4a8dab9ba98abfbba9898996994584c99996859ac997'),
  size('14 wide', 14, ' -./0123456789ABCDEFGHIKLMNOPRSTUVWXZabcdefghiklmnopqrstuvwxyz',
    '44457777777777b99988a9498b9a99989aea988788688474c888857489c987'),
  size('14', 14, ' -./0123456789ABCDEFGHIKLMNOPQRSTUVWXZabcdefghijklmnopqrstuvwxyz',
    '34357777777777a8887698387a898988789d98777776773573b777757578b886'),
  size('13', 13, ' -./012346789ABCDEFGHIKLMNOPRSTUVWXZabcdefghiklmnopqrstuvwxyz',
    '343566666666697876687387a78787779c9867677577373b777757577b777'),
  size('11', 11, ' -./01234678ABCDEFGHILMNOPRSTUVWXZabcdefghiklmnopqrstuvwxy',
    '3334666676669777768736978777678b87666665663639666646568a77'),
  size('10', 10, './126ACDGHILMNOPRSTVWZabcdefghilmnoprstuvwxy',
    '34555777773677767677a75656556633866645466866'),
];

/** The size the title and the page counter are drawn in, the third rung of the ladder, on every page. */
export const TITLE_SIZE = LABEL_SIZES[2] as LabelSize;

/**
 * The widest a label line may be, in pixels: 59, the widest one line label on the twenty devices' pages,
 * and the widest corner label line on the 13 Logitech compiles for the Harmony 600, 650 and 700,
 * `Simplink`, section 323, where `Antenna`, 60 pixels in that font, is drawn by the compiler in another
 * font, the one case of the kind. The activity screen composer held its corner labels to this as
 * `FOUR_SLOT_LABEL_MAX` until section 330 made the two one constant.
 */
export const LABEL_WIDTH = 59;

/**
 * **Where a label that can break does break onto a second line: wider than 58 pixels**, one less than
 * `LABEL_WIDTH`. One threshold for the two label layouts measured, device mode page labels and an
 * activity's corner labels, measured twice over overlapping populations of the same thirteen compiles,
 * since most of section 323's corner labels are on device mode pages:
 *
 * * **section 325, device mode pages**: of the four labels exactly 59 pixels wide in the largest size, the
 *   one with no place to break, `Program`, stays whole, and the three that have one, `WakeUp`, `ChLevel`
 *   and `InputAm`, are split. Read it as "a measured tie goes to the split": on those pages no label
 *   wider than 59 is drawn on one line in a size and none narrower than 59 is split in it;
 * * **section 323, corner labels**: over the 13 compiles, the labels drawn in their page's most common
 *   font where a corner label sits number 2037, counted once per configuration, label and place, 422
 *   distinct texts, and one rule places all 2036 whose width can be measured. Any width from 55 to 58
 *   reproduces them, the widest label left whole with a space in it being 55 pixels, `TV Vol+`, and the
 *   narrowest broken one 59, `Sony TV` and `TV Input`, so the band rests on those three labels.
 *
 * **What pins 58 is labels with no space**, sections 325 and 330: in the largest size `TvRadio` and
 * `PipInput`, 58 wide, are drawn whole, and `InputAm`, `ChLevel` and `WakeUp`, 59, are split. For a
 * label with a space the device mode pages bound it only from 53 to 62, `PS3 Off` whole and the narrowest
 * split 63, and the corner labels from 55 to 58; 58 for those is the assumption that one threshold serves
 * both kinds, which nothing contradicts and nothing measured forces. Breaking a label of three or more
 * words is tested by one label, `Rcvr V-` over `Aux`. This was two
 * constants, `FOUR_SLOT_WRAP_WIDTH` in `compose.ts` and `LABEL_WIDTH - 1` here, each with its own copy of
 * the greedy wrap, until section 330.
 */
export const LABEL_WRAP_WIDTH = LABEL_WIDTH - 1;

/** A text's width in a size, or undefined when the size has no width for one of its characters. */
export function textWidthIn(sizeOf: LabelSize, text: string): number | undefined {
  let wide = 0;
  for (const ch of text) {
    const one = sizeOf.widths.get(ch);
    if (one === undefined) return undefined;
    wide += one;
  }
  return wide;
}

/**
 * The first place a label can split, regardless of size: **its first space**, the space dropped, and in a
 * label with no space at its first word boundary, which is after a hyphen not followed by another, or
 * between a lower case letter and an upper case letter or a digit, unless that letter is followed by a
 * hyphen. A slash is not a boundary: `Tv/Radio` goes down a size rather than split. Undefined when there
 * is nowhere to split. `labelLayout` breaks a label **with** spaces by `wrapAtSpaces` in each size,
 * which is this on two words; this decides whether a label can split at all, the one pixel tie rule,
 * a label without spaces, and the cut in the smallest size.
 */
export function labelBreak(text: string): [string, string] | undefined {
  const space = text.indexOf(' ');
  if (space >= 0) return [text.slice(0, space), text.slice(space + 1)];
  for (let k = 1; k < text.length; k += 1) {
    const a = text[k - 1] as string;
    const b = text[k] as string;
    const after = text[k + 1] ?? '';
    const lower = a >= 'a' && a <= 'z';
    if ((a === '-' && b !== '-')
        || (lower && ((b >= 'A' && b <= 'Z') || (b >= '0' && b <= '9')) && after !== '-')) {
      return [text.slice(0, k), text.slice(k)];
    }
  }
  return undefined;
}

export interface LabelLayout {
  /** The rung of `LABEL_SIZES` the label is drawn in. */
  size: number;
  /** One line or two, cut with `..` where the smallest size still did not hold it. */
  lines: string[];
}

/**
 * A label with spaces broken the way a word wrap does: as many words to a line as fit within
 * `LABEL_WRAP_WIDTH`, greedily, each line measured whole by `widthOf`. **The one copy of the wrap**, which
 * `labelLayout` calls with a size's table widths and the activity screen composer with a configuration's
 * own glyph widths; until section 330 each carried its own loop, section 325's report.
 *
 * Undefined where `widthOf` cannot measure a line, which with table widths is every label with a space
 * in the smallest size. On a label of two words too wide for one line this is the first space; it
 * differs only on three or more, and the one label measured on which the two differ, `Rcvr V-` over
 * `Aux` on an activity's page, is the reason it is a wrap. It does not decide whether a label wraps at
 * all, nor refuse a line too wide or a third line: those are each caller's, since a device mode page
 * goes down a size where a corner label of an activity is refused.
 */
export function wrapAtSpaces(text: string, widthOf: (line: string) => number | undefined): string[] | undefined {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(' ')) {
    const longer = current === '' ? word : `${current} ${word}`;
    const wide = widthOf(longer);
    if (wide === undefined) return undefined;
    if (current !== '' && wide > LABEL_WRAP_WIDTH) {
      lines.push(current);
      current = word;
    } else {
      current = longer;
    }
  }
  lines.push(current);
  return lines;
}

/** The longest prefix of `text` that fits `limit` with `..` after it, in a size. */
function cut(sizeOf: LabelSize, text: string, limit: number): string | undefined {
  for (let n = text.length; n > 0; n -= 1) {
    const candidate = `${text.slice(0, n)}..`;
    const wide = textWidthIn(sizeOf, candidate);
    if (wide !== undefined && wide <= limit) return candidate;
  }
  return undefined;
}

/**
 * A label as the compiler draws it: in the first size of the ladder where it fits on one line, or in two
 * lines each fitting, a label with spaces wrapped by `wrapAtSpaces` and one without split at
 * `labelBreak`; and where no size holds it, in the smallest, split at `labelBreak` if it can
 * be and each part cut with `..`. Undefined when a character has no width in the size that decides it,
 * which is a label nothing here can lay out without guessing.
 */
export function labelLayout(text: string): LabelLayout | undefined {
  const split = labelBreak(text);
  for (let k = 0; k < LABEL_SIZES.length; k += 1) {
    const sizeOf = LABEL_SIZES[k] as LabelSize;
    const whole = textWidthIn(sizeOf, text);
    if (whole !== undefined && whole <= (split === undefined ? LABEL_WIDTH : LABEL_WRAP_WIDTH)) {
      return { size: k, lines: [text] };
    }
    const lines = text.includes(' ') ? wrapAtSpaces(text, (line) => textWidthIn(sizeOf, line)) : split;
    if (lines !== undefined && lines.length === 2) {
      const widths = lines.map((part) => textWidthIn(sizeOf, part));
      if (widths.every((one) => one !== undefined && one <= LABEL_WIDTH)) return { size: k, lines: [...lines] };
    }
  }
  const last = LABEL_SIZES.length - 1;
  const sizeOf = LABEL_SIZES[last] as LabelSize;
  const fitOrCut = (part: string): string | undefined => {
    const wide = textWidthIn(sizeOf, part);
    return wide !== undefined && wide <= LABEL_WIDTH ? part : cut(sizeOf, part, LABEL_WIDTH);
  };
  const parts = (split ?? [text]).map(fitOrCut);
  if (parts.some((one) => one === undefined)) return undefined;
  return { size: last, lines: parts as string[] };
}

export interface PlacedText {
  text: string;
  x: number;
  y: number;
}

/**
 * Where a label's lines go in a corner: a left label's lines start at x 3 and a right label's each
 * **end** at 125, measured line by line, so the two lines of a right label start at different places.
 * One line sits at y 40 in the top row and 90 in the bottom; two start 15 higher, the second one height
 * of the label's size below the first, `FOUR_SLOT_LABEL_Y`'s docstring.
 */
export function placeLabel(layout: LabelLayout, column: 0 | 1, row: 0 | 1): PlacedText[] {
  const sizeOf = LABEL_SIZES[layout.size] as LabelSize;
  const top = FOUR_SLOT_LABEL_Y[row] - (layout.lines.length > 1 ? TWO_LINE_RISE : 0);
  return layout.lines.map((text, k) => ({
    text,
    x: column === 0 ? FOUR_SLOT_LEFT_X : FOUR_SLOT_RIGHT_END - (textWidthIn(sizeOf, text) ?? 0),
    y: top + k * sizeOf.height,
  }));
}

/** How far a two line label starts above where a one line label sits. */
export const TWO_LINE_RISE = 15;

/** The width of the page counter's digits and of its slash, in the title's size: 7 and 5. */
const COUNTER_DIGIT = 7;
const COUNTER_SLASH = 5;
/** The gap the title keeps from the counter's leftmost glyph on any page of its mode. */
const TITLE_GAP = 3;

/**
 * The page counter of page `page` of `total`, as three texts on the title's line at y 2: **the total
 * ends at 125, the slash sits right before it and the page number right before the slash**, so a two
 * digit total moves all three left, `1/24` at 99, 106 and 111 and `10/12` starting at 92. A mode of one
 * page draws none. Every device mode page of the population, single and two digit totals alike.
 */
export function pageCounter(page: number, total: number): PlacedText[] {
  if (total < 2) return [];
  const wide = (text: string): number => text.length * COUNTER_DIGIT;
  const totalX = FOUR_SLOT_RIGHT_END - wide(String(total));
  const slashX = totalX - COUNTER_SLASH;
  return [
    { text: String(page), x: slashX - wide(String(page)), y: 2 },
    { text: '/', x: slashX, y: 2 },
    { text: String(total), x: totalX, y: 2 },
  ];
}

/**
 * A device mode's title as drawn on every one of its pages, in `TITLE_SIZE`: the device's name whole
 * where it fits, and otherwise the longest prefix that fits with `..` after it. **What it has to fit is
 * set by the widest page counter its mode draws**, the one whose page number has as many digits as the
 * total, less a gap of 3: 103 pixels under a one digit total and 89 under a two digit one, which is what
 * cuts `Sony KE-50MR1E` to `Sony KE-50M..` on a mode of 23 pages where it would have kept it whole on
 * a mode of nine. The two limits are measured, pinned on both sides; the gap of 3 is the reading that
 * joins them, and no whole name here falls between 98 and 106 pixels to test it in between. A mode of one page has no counter and its title may run to the right edge, which no title
 * here reaches. Undefined where a character has no width.
 */
export function deviceModeTitle(name: string, total: number): string | undefined {
  const limit = total < 2
    ? FOUR_SLOT_RIGHT_END
    : FOUR_SLOT_RIGHT_END - 2 * String(total).length * COUNTER_DIGIT - COUNTER_SLASH - TITLE_GAP;
  const wide = textWidthIn(TITLE_SIZE, name);
  if (wide !== undefined) return wide <= limit ? name : cut(TITLE_SIZE, name, limit);
  // A character with no width: the name is still measurable as too long when what precedes that
  // character already is, and then the cut stops short of it, `Panasonic CS-29FJ20S` cut at `CS-`
  // before its `J` is reached.
  const unknown = [...name].findIndex((ch) => !TITLE_SIZE.widths.has(ch));
  const before = textWidthIn(TITLE_SIZE, name.slice(0, unknown));
  if (before === undefined || before <= limit) return undefined;
  return cut(TITLE_SIZE, name, limit);
}

// ---------------------------------------------------------------------------------------------------
// Sizes in a configuration

/**
 * Which rung of `LABEL_SIZES` a configuration's font set is, by its height and its glyph widths: every
 * glyph it carries has to have the table's width, and it must share at least eight characters with the
 * table, or all of its own if it carries fewer. Undefined for a set of no size here, the bold face of
 * the device list's labels among them.
 */
export function sizeOfSet(
  c: Container, set: FontSet, map: { codes: ReadonlyMap<number, string> },
): number | undefined {
  const own = new Map<string, number>();
  for (const [code, ch] of map.codes) {
    const glyph = glyphOf(c, set, code);
    if (glyph !== undefined && !own.has(ch)) own.set(ch, glyph.width);
  }
  const found = LABEL_SIZES.findIndex((sizeOf) => {
    if (sizeOf.height !== set.height) return false;
    let shared = 0;
    for (const [ch, wide] of own) {
      const want = sizeOf.widths.get(ch);
      if (want === undefined) continue;
      if (want !== wide) return false;
      shared += 1;
    }
    return shared >= Math.min(8, own.size) && own.size > 0;
  });
  return found < 0 ? undefined : found;
}

/** Every font of a configuration, by the rung of `LABEL_SIZES` it is, in font order. */
export function fontsBySize(
  c: Container, map: { codes: ReadonlyMap<number, string> },
): Map<number, number[]> {
  const out = new Map<number, number[]>();
  (fontSets(c) ?? []).forEach((set, font) => {
    const found = sizeOfSet(c, set, map);
    if (found !== undefined) out.set(found, [...(out.get(found) ?? []), font]);
  });
  return out;
}
