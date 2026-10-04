/**
 * Section 325: a whole catalogue device laid out in device mode the way Logitech's compiler lays it out,
 * on the Harmony 600, 650 and 700, and composed that way.
 *
 * The known answers are twenty devices Logitech compiled from its catalogue: the seventeen test devices of
 * the six power hold compiles, sections 306 to 308, and the three devices of `calibration_h600`, section
 * 121; nineteen catalogue entries, since the TX-P42GT30E is on both the 650's and the 700's records.
 * Each device's commands are named from its own codeset in the archive, by building every command's
 * once block and comparing it word for word with the compiled records, so a name is read and not
 * guessed. Where a family's built block differs from the compile's, the Dell 2300MP's, the Panasonic
 * TX-28A1U's and the Sony KE-50MR1E's one Toshiba code, the decoded frame value names the record instead.
 *
 * Two scores, and both are counts with every difference named:
 *
 * 1. **the rules**, `devicemode.ts` on its own: from the catalogue's command names to the key map, the
 *    screen order, every label's size and lines, the title and the counter, against what each compile's
 *    device mode holds;
 * 2. **the composer**: every device whose commands all compose is put whole into its own compile with
 *    `composeDevice` and `composeDeviceScreen` under `compiled`, and the new device mode is read back with
 *    the same reader as Logitech's and compared page for page, in the same container so that a picture
 *    is the same address on both sides.
 *
 * The control is that a device laid out in catalogue order, which is what composing the catalogue as it
 * comes would give, fails the same comparison.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { IR_ARCHIVE, needing, require_, skipUnless, skipWithoutIrArchive } from '@harmony/lab';
import {
  ACTION_LIST_INDEX_OPCODE,
  type Container,
  IR_PULSE_MARK,
  LABEL_SIZES,
  SEND_INFRARED,
  bitmapAt,
  bitmapReference,
  blockOfStatedCode,
  catalogueCommands,
  catalogueDevice,
  characterMap,
  compiledBlockWords,
  composableKeycode,
  composeCatalogueDevice,
  composeCatalogueDevices,
  composeDevice,
  composeDeviceScreen,
  deviceListRows,
  deviceModeLayout,
  deviceModeTitle,
  fontSets,
  fontsBySize,
  glyphOf,
  irBlockWords,
  irFrame,
  irGroups,
  irHeaderPointers,
  labelBreak,
  labelLayout,
  modeRecords,
  pageCounter,
  parse,
  payloadOf,
  placeLabel,
  screenProgram,
  screenCompare,
  screenStrings,
  sizeOfSet,
  statedCode,
  taggedList,
} from '../src/index.ts';

// ---------------------------------------------------------------------------------------------------
// 0. The rules on their own, with nothing from the lab: the cases each rule was read off

test('section 325: labelBreak, the first place a label can split, is its first space, else its first word boundary, never a slash', () => {
  assert.deepEqual(labelBreak('Pip Channel Up'), ['Pip', 'Channel Up']);
  assert.deepEqual(labelBreak('WakeUp'), ['Wake', 'Up']);
  // A lower case letter before a digit is a boundary too: `Greater100` is drawn `Greater`, `100`.
  assert.deepEqual(labelBreak('Greater100'), ['Greater', '100']);
  // After a hyphen not followed by another, and not before an upper case letter followed by one.
  assert.deepEqual(labelBreak('i-Manual'), ['i-', 'Manual']);
  assert.equal(labelBreak('Tv/Radio'), undefined);
  assert.equal(labelBreak('Teletext'), undefined);
});

test('section 325: a label goes in the first size it fits, and a split label is held one pixel tighter', () => {
  // 58 pixels in the largest size: one line.
  assert.deepEqual(labelLayout('Teletext'), { size: 0, lines: ['Teletext'] });
  // 59 and nowhere to split stays whole; 59 with a boundary is split, the tie that section 325 measured.
  assert.deepEqual(labelLayout('Program'), { size: 0, lines: ['Program'] });
  assert.deepEqual(labelLayout('WakeUp'), { size: 0, lines: ['Wake', 'Up'] });
  // 66 with nowhere to split goes down a size, where it is 59.
  assert.deepEqual(labelLayout('Surround'), { size: 1, lines: ['Surround'] });
  // Too wide for every size on one line or two, so cut in the smallest.
  assert.deepEqual(labelLayout('TV/Teletextoff'), { size: 5, lines: ['TV/Teletex..'] });
  // A character no size has a width for is not measured.
  assert.equal(labelLayout('#'), undefined);
});

test('section 325: a label with spaces wraps as many words to a line as fit, section 323\'s rule', () => {
  // The one three word label measured, on an activity's page in section 323: `Rcvr V-` over `Aux`.
  // The first space would give `Rcvr` over `V- Aux`, which is the control: the wrap is what decides.
  assert.deepEqual(labelLayout('Rcvr V- Aux')?.lines, ['Rcvr V-', 'Aux']);
  assert.deepEqual(labelBreak('Rcvr V- Aux'), ['Rcvr', 'V- Aux']);
  // Two words is the first space either way, and section 323's band edges hold: 55 whole, 59 broken.
  assert.deepEqual(labelLayout('TV Vol+'), { size: 0, lines: ['TV Vol+'] });
  assert.deepEqual(labelLayout('Sony TV'), { size: 0, lines: ['Sony', 'TV'] });
  // Three words that wrap to three lines in a size go down until two lines hold them.
  assert.deepEqual(labelLayout('Pip Channel Up'), { size: 4, lines: ['Pip', 'Channel Up'] });
});

test('section 325: the counter ends at 125 and the title stops 3 short of its widest page number', () => {
  assert.deepEqual(pageCounter(1, 7).map((one) => [one.text, one.x]), [['1', 106], ['/', 113], ['7', 118]]);
  assert.deepEqual(pageCounter(1, 24).map((one) => [one.text, one.x]), [['1', 99], ['/', 106], ['24', 111]]);
  assert.deepEqual(pageCounter(17, 23).map((one) => [one.text, one.x]), [['17', 92], ['/', 106], ['23', 111]]);
  assert.deepEqual(pageCounter(1, 1), []);
  // 98 pixels: it fits under a one digit counter, 103, and is cut under a two digit one, 89.
  assert.equal(deviceModeTitle('Sony KE-50MR1E', 9), 'Sony KE-50MR1E');
  assert.equal(deviceModeTitle('Sony KE-50MR1E', 23), 'Sony KE-50M..');
  assert.equal(deviceModeTitle('Panasonic TX-29AK40F', 6), 'Panasonic TX-29..');
});

test('section 325: the screen after the leading commands is case folded, hyphens passed over, then by character code', () => {
  const sorted = ['InputHDMI3', 'InputHdmi4', 'InputVideo1', 'i-Manual', 'InputVideo 1/MD', 'Football',
    'InputHdmi2', 'InputVideo', 'In-Start', 'InputTv'].sort(screenCompare);
  assert.deepEqual(sorted, ['Football', 'i-Manual', 'InputHdmi2', 'InputHDMI3', 'InputHdmi4', 'InputTv',
    'InputVideo', 'InputVideo 1/MD', 'InputVideo1', 'In-Start']);
  // Return leads the screen and also holds the Previous channel key; Cancel takes the Exit key.
  const layout = deviceModeLayout(['Mute', 'Return', 'Cancel', 'PowerOff', 'PowerOn', 'Zoom', 'Aspect']);
  assert.deepEqual(layout.screen, ['PowerOn', 'PowerOff', 'Aspect', 'Return', 'Zoom']);
  assert.equal(layout.keys.get(12), 'Cancel');
  assert.equal(layout.keys.get(43), 'Cancel');
  assert.equal(layout.keys.get(16), 'Mute');
});

const CALL = 0x7f;
/** A font select, a text by reference and a text inline, the screen language's opcodes, section 55. */
const OP_FONT = 0x10;
const OP_TEXT_AT = 0x04;
const OP_TEXT_INLINE = 0x05;
/** The corners a page fills, in order: top left, top right, bottom left, bottom right. */
const FILL = [8, 2, 9, 34] as const;
const SCAN = 0x3f;
const PRESS = 2;

/** One catalogue device Logitech compiled: where, under which label, and its catalogue entry. */
type Cal = { fixture: string; label: string; slug: string; file: string; codeset?: string };
const cal = (fixture: string, label: string, slug: string, file: string, codeset?: string): Cal =>
  ({ fixture, label, slug, file, ...(codeset === undefined ? {} : { codeset }) });
/**
 * The twenty. `Panasonic_TV` is the TX-P42GT30E, section 306, a label that appears once, in the first
 * compile, and the same catalogue entry as `Panasonic_TX-P42GT30E` on the Harmony 700's record;
 * `calibration_h600`'s three are pinned in `inputs.test.ts` and `catalogue.test.ts`, the Blu-ray player
 * by its codeset since its catalogue model is not pinned. The account's own devices on the power hold
 * compiles, the LG, the KPN box, the Denon, the PS3 and Kodi, are not rows: nothing pins their entries.
 */
const CAL: readonly Cal[] = [
  cal('h650_power_hold_compile', 'Panasonic_TX-29AK40F', 'Panasonic', 'TX-29AK40F'),
  cal('h650_power_hold_compile', 'Panasonic_TV', 'Panasonic', 'TX-P42GT30E'),
  cal('h650_power_hold_compile', 'Knoll_HDP-1100', 'Knoll', 'HDP-1100'),
  cal('h650_power_hold_compile_2', 'Dell_2300MP', 'Dell', '2300MP'),
  cal('h650_power_hold_compile_2', 'Panasonic_TX-28A1U', 'Panasonic', 'TX-28A1U'),
  cal('h700_power_hold_compile', 'Barco_6300', 'Barco', '6300'),
  cal('h700_power_hold_compile', 'JVC_DLA-HD10KU', 'JVC', 'DLA-HD10KU'),
  cal('h700_power_hold_compile', 'Panasonic_TX-P42GT30E', 'Panasonic', 'TX-P42GT30E'),
  cal('h700_power_hold_compile_2', 'Pioneer_DEH-P47DH', 'Pioneer', 'DEH-P47DH'),
  cal('h700_power_hold_compile_2', 'Mivar_14_M3_TVD', 'Mivar', '14_M3_TVD'),
  cal('h700_power_hold_compile_2', 'Thomson_DSI-4400', 'Thomson', 'DSI-4400'),
  cal('h700_power_hold_compile_3', 'Panasonic_TH-42PA30', 'Panasonic', 'TH-42PA30'),
  cal('h700_power_hold_compile_3', 'Quasar_SP2717T', 'Quasar', 'SP2717T'),
  cal('h700_power_hold_compile_3', 'Panasonic_CS-29FJ20S', 'Panasonic', 'CS-29FJ20S'),
  cal('h700_power_hold_compile_4', 'Panasonic_TX-D37LT84F', 'Panasonic', 'TX-D37LT84F'),
  cal('h700_power_hold_compile_4', 'Sony_KE-50MR1E', 'Sony', 'KE-50MR1E'),
  cal('h700_power_hold_compile_4', 'Thomson_25DT60H', 'Thomson', '25DT60H'),
  cal('calibration_h600', 'Sony_TV', 'Sony', 'KDL-32W705B'),
  cal('calibration_h600', 'Denon_AV_Receiver', 'Denon', 'AVR-1912'),
  cal('calibration_h600', 'Panasonic_Blu-ray_Player', 'Panasonic', '', 'codesets/31/31e3ef8da16ec7c7.json'),
];
const FIXTURES = [...new Set(CAL.map((one) => one.fixture))];

function open(name: string): Container {
  const bytes = require_(name);
  try { return parse(bytes); } catch { return parse(payloadOf(bytes)); }
}

/** A device's catalogue commands, first of each name, in catalogue order. */
function commandsOf(one: Cal): { name: string; keycode: string }[] {
  const codeset = one.codeset ?? catalogueDevice(IR_ARCHIVE!, one.slug, one.file).codeset!;
  const seen = new Set<string>();
  return catalogueCommands(IR_ARCHIVE!, codeset).filter((command) => {
    if (seen.has(command.name)) return false;
    seen.add(command.name);
    return true;
  });
}

/** The marks and spaces of a block after its leading silence, as one comparable string. */
function wordsAfterSilence(pairs: readonly { mark: boolean; us: number }[]): string {
  let k = 0;
  while (k < pairs.length && !(pairs[k] as { mark: boolean }).mark) k += 1;
  return pairs.slice(k).map((p) => `${p.mark ? 'm' : 's'}${p.us}`).join(',');
}

/** A compiled record's once block, as `wordsAfterSilence` spells it. */
function recordWords(c: Container, record: number): string | undefined {
  const once = irHeaderPointers(c, record)[0];
  if (once === undefined || once === 0) return undefined;
  const words = irBlockWords(c, once);
  if (words === undefined) return undefined;
  return wordsAfterSilence(words.filter((w) => w !== 0)
    .map((w) => ({ mark: (w & IR_PULSE_MARK) !== 0, us: w & 0x7fff })));
}

/** A catalogue keycode's once block as the composer would build it, as `wordsAfterSilence` spells it. */
function builtWords(keycode: string): string | undefined {
  const block = blockOfStatedCode(keycode, undefined, 'once');
  if (block === undefined) return undefined;
  return wordsAfterSilence(compiledBlockWords(block, 0).map((p) => ({ mark: p.mark, us: p.microseconds })));
}

/**
 * A namer for one container and one device's commands: a record's names are every command whose built
 * block it is, word for word, and where no command's is, every command whose stated frame value it
 * decodes to, which names the records of a family whose built block is not the compile's: the Dell
 * 2300MP's and the Panasonic TX-28A1U's, and the Sony KE-50MR1E's one Toshiba code. A set because
 * Logitech's catalogue gives one code several names.
 */
function namer(c: Container, commands: readonly { name: string; keycode: string }[]):
    (record: number) => Set<string> {
  const byWords = new Map<string, Set<string>>();
  const byValue = new Map<string, Set<string>>();
  for (const command of commands) {
    const words = builtWords(command.keycode);
    if (words !== undefined) byWords.set(words, (byWords.get(words) ?? new Set()).add(command.name));
    const value = statedCode(command.keycode)?.frames[0]?.value.toString(16);
    if (value !== undefined) byValue.set(value, (byValue.get(value) ?? new Set()).add(command.name));
  }
  return (record) => {
    const words = recordWords(c, record);
    const named = words === undefined ? undefined : byWords.get(words);
    if (named !== undefined) return named;
    const value = irFrame(c, record)?.value.toString(16);
    return value === undefined ? new Set() : byValue.get(value) ?? new Set();
  };
}

/** The records a list sends, following calls, in order. */
function sentRecords(c: Container, list: number, seen = new Set<number>()): number[] {
  if (seen.has(list)) return [];
  seen.add(list);
  const groups = irGroups(c) ?? [];
  const out: number[] = [];
  for (const one of c.actionLists()?.[list] ?? []) {
    if (one.opcode === SEND_INFRARED) {
      const record = groups[one.operand >> 8]?.addresses[one.operand & 0xff];
      if (record !== undefined) out.push(record);
    } else if (one.opcode === CALL) out.push(...sentRecords(c, one.operand, seen));
  }
  return out;
}

/** A text drawn on a device mode page, with the rung of `LABEL_SIZES` its font is. */
type Drawn = { text: string; x: number; y: number; size: number | undefined };

/** A device mode as a reader sees it, the same reader for Logitech's and ours. */
interface ReadMode {
  pages: {
    items: Set<string>[];
    title: Drawn[];
    counter: Drawn[];
    /** Per corner in fill order, the label's lines. */
    labels: Drawn[][];
    background: number | undefined;
    /** The program's instructions as kinds, undefined where nothing was composed to compare. */
    shape: string | undefined;
  }[];
  /** A press of a key, by scan, to the names its list sends. */
  keys: Map<number, Set<string>>;
}

function readMode(c: Container, mode: number, nameOf: (record: number) => Set<string>): ReadMode {
  const map = characterMap(c)!;
  const sets = fontSets(c) ?? [];
  const record = modeRecords(c)![mode]!;
  const strings = screenStrings(c, map);
  const names = (list: number): Set<string> => {
    const out = new Set<string>();
    for (const one of sentRecords(c, list)) for (const name of nameOf(one)) out.add(name);
    return out;
  };
  const pages = record.pages.map((page) => {
    const entries = taggedList(c, page.list)?.entries ?? [];
    const items = FILL.map((scan) => entries.find((e) => (e.tag & SCAN) === scan))
      .filter((e) => e !== undefined).map((e) => names(e.operand));
    const drawn: Drawn[] = strings.filter((s) => s.program === page.program).map((s) => ({
      text: s.text, x: s.x, y: s.y,
      size: s.font === undefined || sets[s.font] === undefined ? undefined : sizeOfSet(c, sets[s.font]!, map),
    }));
    // A corner's label is every line in its quarter: left of the middle or right of it, above the
    // dividing bar or below it, and between the title bar and the bottom bar.
    const labels = FILL.map((_, k) => {
      const column = k % 2;
      const row = k < 2 ? 0 : 1;
      return drawn.filter((s) => s.y > 10 && s.y < 110 && (s.x >= 64 ? 1 : 0) === column
        && (s.y >= 64 ? 1 : 0) === row).sort((a, b) => a.y - b.y);
    }).slice(0, items.length);
    const program = screenProgram(c, page.program) ?? [];
    const first = program[0];
    return {
      items,
      title: drawn.filter((s) => s.y === 2 && s.x === 0),
      counter: drawn.filter((s) => s.y === 2 && s.x > 0).sort((a, b) => a.x - b.x),
      labels,
      background: first === undefined ? undefined : bitmapReference(first),
      // The program instruction by instruction, with a text drawn inline and one drawn by reference as
      // one kind, which is the difference section 294 kept, and a font select as the size it selects.
      shape: program.map((one) => (one.opcode === OP_FONT ? `font${sizeOfSet(c, sets[one.operands[0] as number]!, map) ?? '?'}`
        : one.opcode === OP_TEXT_AT || one.opcode === OP_TEXT_INLINE ? 'text' : one.opcode.toString(16))).join(' '),
    };
  });
  const keys = new Map<number, Set<string>>();
  for (const entry of record.entries) {
    if (entry.tag >> 6 !== PRESS || entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
    if ((FILL as readonly number[]).includes(entry.tag & SCAN)) continue;
    keys.set(entry.tag & SCAN, names(entry.operand));
  }
  return { pages, keys };
}

/** One compiled device: its compile, the namer, its mode index, and the catalogue's commands. */
interface Found {
  one: Cal;
  c: Container;
  commands: { name: string; keycode: string }[];
  mode: number;
  read: ReadMode;
}

/** Find a compiled device's mode: the device list row whose first page's first item sends its codes. */
function find(one: Cal): Found {
  const c = open(one.fixture);
  const commands = commandsOf(one);
  const groups = irGroups(c) ?? [];
  const nameOf = namer(c, commands);
  // The device's group is the one most of whose records are named.
  const hits = groups.map((g) => g.addresses.filter((a) => nameOf(a).size > 0).length);
  const best = hits.indexOf(Math.max(...hits));
  const records = modeRecords(c)!;
  for (const mode of new Set(deviceListRows(c).map((row) => row.mode))) {
    const entries = taggedList(c, records[mode]!.pages[0]!.list)?.entries ?? [];
    const firstItem = entries.find((e) => (e.tag & SCAN) === FILL[0]);
    const sent = firstItem === undefined ? [] : sentRecords(c, firstItem.operand);
    if (sent.some((record) => groups[best]?.addresses.includes(record))) {
      return { one, c, commands, mode, read: readMode(c, mode, nameOf) };
    }
  }
  throw new Error(`${one.label}: no device mode sends its codes`);
}

/** A tally of differences by kind, each kind a list of where it happened. */
class Tally {
  readonly kinds = new Map<string, string[]>();
  count = 0;
  add(kind: string, where: string): void {
    this.kinds.set(kind, [...(this.kinds.get(kind) ?? []), where]);
  }
  of(kind: string): number { return this.kinds.get(kind)?.length ?? 0; }
  get total(): number { return [...this.kinds.values()].reduce((sum, one) => sum + one.length, 0); }
  report(): string {
    return [...this.kinds].map(([kind, where]) => `${kind}: ${where.length}\n    ${where.join('\n    ')}`).join('\n');
  }
}

/** The scores of one comparison, by what was compared, and every difference by kind. */
interface Score {
  agree: Map<string, number>;
  total: Map<string, number>;
  differences: Tally;
}

function score(): Score {
  return { agree: new Map(), total: new Map(), differences: new Tally() };
}

function tick(s: Score, what: string, same: boolean, kind: string, where: string): void {
  s.total.set(what, (s.total.get(what) ?? 0) + 1);
  if (same) s.agree.set(what, (s.agree.get(what) ?? 0) + 1);
  else s.differences.add(kind, where);
}

const show = (lines: readonly Drawn[]): string =>
  lines.map((line) => `${line.text}@${line.x},${line.y}/${line.size}`).join(' ') || 'nothing';
const sameLines = (a: readonly Drawn[], b: readonly Drawn[]): boolean => a.length === b.length
  && a.every((line, k) => line.text === b[k]!.text && line.x === b[k]!.x && line.y === b[k]!.y
    && line.size === b[k]!.size);
const nameList = (names: Set<string> | undefined): string =>
  names === undefined ? 'nothing' : [...names].join('|') || '?';
const meets = (a: Set<string> | undefined, b: Set<string> | undefined): boolean =>
  a !== undefined && b !== undefined && [...a].some((name) => b.has(name));
/** The same names exactly, none on both sides included; for comparing two of our own compositions. */
const sameNames = (a: Set<string> | undefined, b: Set<string> | undefined): boolean =>
  a !== undefined && b !== undefined && a.size === b.size && [...a].every((name) => b.has(name));

/**
 * Compare a device mode with Logitech's, everything a reader can see: the page count, the key map, the
 * items in page order, every label's lines, places and size where both put the same command in the same
 * corner, the title and the counter on every page, and the background where both sides have one.
 *
 * Two lists are the same command when they send one name in common, `meets`, which is what a comparison
 * with Logitech's can ask. Two of our own compositions can be held to more, `sameNames`: the same names
 * exactly, so that two lists sending nothing a namer can name agree with each other and with nothing else.
 */
function compare(s: Score, label: string, theirs: ReadMode, ours: ReadMode,
                 alike: (a: Set<string> | undefined, b: Set<string> | undefined) => boolean = meets): void {
  const where = (more: string): string => `${label} ${more}`;
  tick(s, 'pages', theirs.pages.length === ours.pages.length, 'page count differs',
       where(`ours ${ours.pages.length}, theirs ${theirs.pages.length}`));
  for (const scan of new Set([...theirs.keys.keys(), ...ours.keys.keys()])) {
    tick(s, 'keys', alike(ours.keys.get(scan), theirs.keys.get(scan)), 'key differs',
         where(`scan ${scan}: ours ${nameList(ours.keys.get(scan))}, theirs ${nameList(theirs.keys.get(scan))}`));
  }
  const theirItems = theirs.pages.flatMap((page) => page.items);
  const ourItems = ours.pages.flatMap((page) => page.items);
  const theirLabels = theirs.pages.flatMap((page) => page.labels);
  const ourLabels = ours.pages.flatMap((page) => page.labels);
  for (let k = 0; k < Math.max(theirItems.length, ourItems.length); k += 1) {
    const same = alike(ourItems[k], theirItems[k]);
    tick(s, 'items', same, 'item differs',
         where(`item ${k + 1}: ours ${nameList(ourItems[k])}, theirs ${nameList(theirItems[k])} drawn `
           + `'${(theirLabels[k] ?? []).map((line) => line.text).join(' ')}'`));
    if (!same) continue;
    const a = ourLabels[k] ?? [];
    const b = theirLabels[k] ?? [];
    tick(s, 'labels', sameLines(a, b), 'label differs', where(`item ${k + 1}: ours ${show(a)}, theirs ${show(b)}`));
  }
  theirs.pages.forEach((page, p) => {
    const mine = ours.pages[p];
    if (mine === undefined) return;
    tick(s, 'titles', sameLines(mine.title, page.title), 'title differs',
         where(`page ${p + 1}: ours ${show(mine.title)}, theirs ${show(page.title)}`));
    tick(s, 'counters', sameLines(mine.counter, page.counter), 'counter differs',
         where(`page ${p + 1}: ours ${show(mine.counter)}, theirs ${show(page.counter)}`));
    if (mine.background !== undefined && page.background !== undefined) {
      tick(s, 'backgrounds', mine.background === page.background, 'background differs', where(`page ${p + 1}`));
    }
    if (mine.shape !== undefined && page.shape !== undefined) {
      tick(s, 'programs', mine.shape === page.shape, 'program differs',
           where(`page ${p + 1}: ours ${mine.shape}, theirs ${page.shape}`));
    }
  });
}

/** What the rules alone predict a device's mode reads as, with no picture to compare. */
function predicted(name: string, layout: { keys: Map<number, string>; screen: string[] }): ReadMode {
  const pageCount = Math.ceil(layout.screen.length / 4);
  const title = deviceModeTitle(name, pageCount);
  return {
    pages: Array.from({ length: pageCount }, (_, p) => {
      const onPage = layout.screen.slice(4 * p, 4 * p + 4);
      return {
        items: onPage.map((one) => new Set([one])),
        title: title === undefined ? [] : [{ text: title, x: 0, y: 2, size: 2 }],
        counter: pageCounter(p + 1, pageCount).map((one) => ({ ...one, size: 2 })),
        labels: onPage.map((one, k) => {
          const laid = labelLayout(one);
          if (laid === undefined) return [];
          return placeLabel(laid, (k % 2) as 0 | 1, (k < 2 ? 0 : 1) as 0 | 1).map((line) => ({ ...line, size: laid.size }));
        }),
        background: undefined,
        shape: undefined,
      };
    }),
    keys: new Map([...layout.keys].map(([scan, one]) => [scan, new Set([one])])),
  };
}

/** The device's name as its title states it: the compile's label with its underscores as spaces. */
const titleOf = (one: Cal): string => one.label.replaceAll('_', ' ');

function report(s: Score): string {
  const lines = [...s.total].map(([what, total]) => `${what} ${s.agree.get(what) ?? 0}/${total}`);
  return `${lines.join(', ')}\n${s.differences.report()}`;
}

/** Every score as `agree/total`, for one exact comparison. */
const tallies = (s: Score): Record<string, string> =>
  Object.fromEntries([...s.total].map(([what, total]) => [what, `${s.agree.get(what) ?? 0}/${total}`]));
/** Every difference as its device and place, the part of its description before the colon. */
const places = (s: Score): Record<string, string[]> =>
  Object.fromEntries([...s.differences.kinds].map(([kind, where]) => [kind, where.map((one) => one.split(':')[0] as string)]));

/**
 * The differences the rules leave, each named, and the same ones the composer leaves since it draws
 * what the rules say. None of them is a rule this module has wrong on evidence it could use:
 *
 * * **the archive's name is not the compile's** on the Panasonic TH-42PA30: one command is `Pip` in the
 *   archive and drawn `Multi`, `Window` by the compile, so the compile sorts it as `MultiWindow`, before
 *   `Normalize`, where the rules sort `Pip` after it. Two items;
 * * **a character with no width or no code**: `J`, in `AspectJust` and in the JVC's title on all three
 *   of its pages, and `#`, the Blu-ray player's. The compiles draw a glyph for each, but the character
 *   map names no code for either, so the glyph cannot be filed under its character and the table holds
 *   no width for it. The rules decline to measure them rather than guess;
 * * **`-/--` is drawn `-/`** on the TH-42PA30, one line, with the rest dropped: one label, unexplained;
 * * **`Pip Channel Down` is drawn `Pip`, `Channel`** in the second size on the Sony KE-50MR1E, its third
 *   word dropped, where the rules, finding no size for `Channel Down`, cut it in the smallest. One label of
 *   three words that fits no size, which is too few to state the compiler's rule for it.
 */
const NAMED = {
  'item differs': ['Panasonic_TH-42PA30 item 12', 'Panasonic_TH-42PA30 item 13'],
  'label differs': ['Panasonic_TH-42PA30 item 6', 'Panasonic_CS-29FJ20S item 12', 'Sony_KE-50MR1E item 66',
    'Panasonic_Blu-ray_Player item 7'],
  'title differs': ['JVC_DLA-HD10KU page 1', 'JVC_DLA-HD10KU page 2', 'JVC_DLA-HD10KU page 3'],
};

/** The thirteen arch 14 configurations Logitech compiled, section 312, which the width table is the union of. */
const ARCH14 = ['h650_config_region', 'h650_panasonic_config', 'h600_config', 'calibration_h600', 'h700_config',
  'h700_config_2', 'h700_28_config_region', ...FIXTURES.filter((one) => one !== 'calibration_h600')];

test('section 325: the size table is every glyph width the thirteen arch 14 configurations draw in those sizes',
  needing(skipUnless(...ARCH14)), () => {
    // Per size, every character any set of that size draws, and its width: the union must be the table,
    // character for character, and no set may disagree with another of its size.
    const seen = LABEL_SIZES.map(() => new Map<string, number>());
    let sized = 0;
    for (const name of ARCH14) {
      const c = open(name);
      const map = characterMap(c)!;
      const sets = fontSets(c)!;
      for (const [rung, fonts] of fontsBySize(c, map)) {
        for (const font of fonts) {
          sized += 1;
          for (const [code, ch] of map.codes) {
            const glyph = glyphOf(c, sets[font]!, code);
            if (glyph === undefined) continue;
            const was = seen[rung]!.get(ch);
            assert.ok(was === undefined || was === glyph.width, `${name} font ${font}: '${ch}' is ${glyph.width}, was ${was}`);
            seen[rung]!.set(ch, glyph.width);
          }
        }
      }
    }
    LABEL_SIZES.forEach((one, rung) => {
      assert.deepEqual(new Map([...seen[rung]!].sort()), new Map([...one.widths].sort()), `size ${one.name}`);
    });
    // 167 sets of the thirteen configurations are one of the six sizes.
    assert.equal(sized, 167);
  });

// ---------------------------------------------------------------------------------------------------
// 1. The rules

test('section 325: the compiler\'s device mode rules against twenty catalogue devices it compiled',
  needing(skipWithoutIrArchive(), skipUnless(...FIXTURES)), () => {
    const s = score();
    let lines = 0;
    const unsized: string[] = [];
    for (const f of CAL.map(find)) {
      compare(s, f.one.label, f.read, predicted(titleOf(f.one), deviceModeLayout(f.commands.map((one) => one.name))));
      for (const line of f.read.pages.flatMap((page) => page.labels).flat()) {
        lines += 1;
        if (line.size === undefined) unsized.push(`${f.one.label} ${line.text}`);
      }
    }
    if (process.env.DEVICEMODE_DETAIL) console.log(report(s));
    // Every label line of the twenty devices is drawn in one of the six sizes, which is what makes the
    // ladder the whole of the choice.
    assert.deepEqual(unsized, []);
    assert.equal(lines, 734);
    // Every key of every device, and all but the named items, labels and titles.
    assert.deepEqual(tallies(s), {
      pages: '20/20', keys: '546/546', items: '474/476', labels: '470/474', titles: '125/128', counters: '128/128',
    });
    assert.deepEqual(places(s), NAMED);
  });

/**
 * A device the rules were not fitted to: the Harmony 650 account's own LG OLED65G26LA, pinned in
 * `inputs.test.ts`, as Logitech compiled it into the first power hold compile and into
 * `h650_config_region`. Its title is the name the account gave it. **It is what corrected the order**:
 * its `In-Start` and `In-Stop` follow `InputTv`, which put the hyphen out of `screenCompare`.
 *
 * The same account's Denon AVR-X4800H is deliberately not here. Its device mode draws labels no
 * catalogue name spells, `down`, `left`, `right`, `up` and `okidoki`, and puts the arrows on the screen,
 * so its button map has been edited on the account and it is no sample of what the compiler gives a
 * device by default. What it does show is that the screen is sorted by the **label**, `okidoki` between
 * `ModeVirtual` and `Option`, which for a catalogue device is its command's name.
 */
const HELD_OUT: readonly Cal[] = [
  cal('h650_power_hold_compile', 'TV', 'LG', 'OLED65G26LA'),
  cal('h650_config_region', 'TV', 'LG', 'OLED65G26LA'),
];

test('section 325: the rules against a device they were not fitted to, in two compiles',
  needing(skipWithoutIrArchive(), skipUnless('h650_power_hold_compile', 'h650_config_region')), () => {
    const s = score();
    for (const f of HELD_OUT.map(find)) {
      compare(s, `${f.one.fixture} ${f.one.label}`, f.read,
              predicted(titleOf(f.one), deviceModeLayout(f.commands.map((one) => one.name))));
    }
    if (process.env.DEVICEMODE_DETAIL) console.log(`HELD OUT ${report(s)}`);
    assert.deepEqual(tallies(s), {
      pages: '2/2', keys: '72/72', items: '56/56', labels: '56/56', titles: '14/14', counters: '14/14',
    });
  });

// ---------------------------------------------------------------------------------------------------
// 2. The composer

/**
 * A device composed whole from its catalogue entry into its own compile: every command that composes,
 * laid out by the rules, with the key map they choose, or in catalogue order for the control.
 */
function composeWhole(f: Found, order: 'compiler' | 'catalogue'):
    { c: Container; mode: number; left: string[]; substituted: string[] } | undefined {
  const buildable = f.commands.filter((one) => composableKeycode(one.keycode));
  const left = f.commands.filter((one) => !composableKeycode(one.keycode)).map((one) => one.name);
  // A device none of whose codes compose has nothing to put on a page.
  if (buildable.length === 0) return undefined;
  const composed = composeDevice(f.c, {
    label: 'Whole', commands: buildable.map((one) => ({ stated: one.keycode })),
  });
  const listOf = new Map(buildable.map((one, k) => [one.name, composed.lists[k] as number]));
  const layout = deviceModeLayout(f.commands.map((one) => one.name));
  const screen = (order === 'compiler' ? layout.screen
    : f.commands.map((one) => one.name).filter((one) => layout.screen.includes(one)))
    .filter((one) => listOf.has(one));
  const keys = new Map<number, number>();
  for (const [scan, one] of layout.keys) if (listOf.has(one)) keys.set(scan, listOf.get(one) as number);
  const placed = composeDeviceScreen(parse(composed.bytes), 'TV',
    screen.map((one) => ({ label: one, list: listOf.get(one) as number })),
    { compiled: { title: titleOf(f.one), keys } });
  return { c: parse(placed.bytes), mode: placed.mode, left, substituted: placed.substituted ?? [] };
}

/** The devices the control composes in catalogue order: one on each of the Harmony 600, 650 and 700. */
const CONTROL: readonly string[] = ['Sony_TV', 'Panasonic_TV', 'Sony_KE-50MR1E'];

test('section 325: a catalogue device composed whole reads back as the compiler\'s device mode',
  needing(skipWithoutIrArchive(), skipUnless(...FIXTURES)), () => {
    const s = score();
    const control = score();
    const notWhole: string[] = [];
    const substituted: string[] = [];
    for (const f of CAL.map(find)) {
      const whole = composeWhole(f, 'compiler');
      if (whole === undefined) { notWhole.push(`${f.one.label}: every command`); continue; }
      if (whole.left.length > 0) notWhole.push(`${f.one.label}: ${whole.left.join(', ')}`);
      substituted.push(...whole.substituted.map((one) => `${f.one.label}: ${one}`));
      // Both modes read out of the composed container, so a picture is one address on both sides.
      const nameOf = namer(whole.c, f.commands);
      compare(s, f.one.label, readMode(whole.c, f.mode, nameOf), readMode(whole.c, whole.mode, nameOf));
      // The control, on one device per model, since a composition is seconds: the same device with its
      // screen in catalogue order. Three suffice to show the comparison can fail.
      if (!CONTROL.includes(f.one.label)) continue;
      const wrong = composeWhole(f, 'catalogue') as NonNullable<ReturnType<typeof composeWhole>>;
      const wrongNames = namer(wrong.c, f.commands);
      compare(control, f.one.label, readMode(wrong.c, f.mode, wrongNames), readMode(wrong.c, wrong.mode, wrongNames));
    }
    if (process.env.DEVICEMODE_DETAIL) {
      console.log(`not whole: ${notWhole.length}\n    ${notWhole.join('\n    ')}`);
      console.log(`substituted: ${substituted.length}\n    ${substituted.join('\n    ')}`);
      console.log(report(s));
      console.log(`CONTROL ${report(control).split('\n')[0]}`);
    }
    // The Panasonic TX-28A1U's codes are a family with no whole block, so it has no page to compare.
    assert.deepEqual(notWhole, ['Panasonic_TX-28A1U: every command']);
    // The texts reported as substituted are exactly the ones the rules could not measure.
    assert.deepEqual(substituted, ['JVC_DLA-HD10KU: title \'JVC DLA-HD10KU\'',
      'Panasonic_CS-29FJ20S: label \'AspectJust\'', 'Panasonic_Blu-ray_Player: label \'#\'']);
    // Page for page, the composed device reads as Logitech's, but for the differences named. The named
    // differences sit on nine pages; the five programs that differ are among them, and the other four
    // differ in text only, which `shape` does not see: it compares instruction kinds and font sizes.
    assert.deepEqual(tallies(s), {
      pages: '19/19', keys: '527/527', items: '466/468', labels: '462/466', titles: '123/126',
      counters: '126/126', backgrounds: '126/126', programs: '121/126',
    });
    assert.deepEqual(places(s), {
      ...NAMED,
      'program differs': ['Panasonic_TH-42PA30 page 3', 'Panasonic_TH-42PA30 page 4', 'Panasonic_CS-29FJ20S page 3',
        'Sony_KE-50MR1E page 17', 'Panasonic_Blu-ray_Player page 2'],
    });
    // The control: the same three devices in catalogue order agree on 2 items of 155, so the comparison
    // sees the order, and on every key, since the key map does not depend on it.
    assert.equal(tallies(control)['items'], '2/155');
    assert.equal(tallies(control)['keys'], '111/111');
  });

// ---------------------------------------------------------------------------------------------------
// 3. Several devices in one run, section NNN

/**
 * The labels the devices of one compile are composed under. Each is short enough for the device list's
 * one line and spelled only in characters the list's font holds, section NNN, and none is a label any of
 * these compiles already carries, which `composeCatalogueDevices` would refuse.
 */
const SEVERAL_LABELS = ['Whole', 'Whale', 'While'] as const;

/** Every picture's bytes, header and pixels, numbered in the order first met, across containers. */
const PICTURES = new Map<string, number>();
/**
 * A device mode with each page's background stated as the picture it is rather than where it sits, so
 * that two containers can be compared: the number `PICTURES` gives that picture's bytes.
 */
function byPicture(c: Container, mode: ReadMode): ReadMode {
  return {
    ...mode,
    pages: mode.pages.map((page) => {
      if (page.background === undefined) return page;
      const at = c.blobOffsetOf(page.background);
      const length = bitmapAt(c, page.background)?.length;
      if (at === undefined || length === undefined) return { ...page, background: undefined };
      const key = Buffer.from(c.blob.subarray(at, at + length)).toString('hex');
      if (!PICTURES.has(key)) PICTURES.set(key, PICTURES.size);
      return { ...page, background: PICTURES.get(key) as number };
    }),
  };
}

/**
 * The compiles whose devices are composed several at a time, into the compile itself, as the single
 * device score does: a compile's fonts hold every glyph its own devices' titles need, where the
 * configuration it was compiled from does not, and drawing a glyph a configuration lacks is chapter 8's
 * and not this one's. Each with the devices composed: those whose catalogue entry is pinned by model and
 * whose codes compose, so not the Blu-ray player, which has no model, nor the TX-28A1U, which composes
 * nothing, and so not the 650's second compile, which keeps one.
 *
 * **Two of them are refused part way**, past the model's device count, which is deliberately not passed
 * here since each compile already holds eight, and that is the control on the state variable ceiling: a write
 * names its variable in seven bits, so 128 variables is the most a configuration holds, and a device
 * composed with no inputs costs three. The 650's first compile already holds 122, so two fit and the
 * third is refused; the 700's third holds 124, so one fits and the second is refused, which leaves it
 * nothing several to compare. The 650's composes its first two.
 */
const CEILING = 'a delay variable at 128 is past what a write opcode can name';
const SEVERAL: readonly { compile: string; refused?: { message: string; keep: number } }[] = [
  { compile: 'h650_power_hold_compile', refused: { message: `While, after 2 composed in this run: ${CEILING}`, keep: 2 } },
  { compile: 'h700_power_hold_compile' },
  { compile: 'h700_power_hold_compile_2' },
  { compile: 'h700_power_hold_compile_3', refused: { message: `Whale, after 1 composed in this run: ${CEILING}`, keep: 1 } },
  { compile: 'h700_power_hold_compile_4' },
  { compile: 'calibration_h600' },
];

test('section NNN: several catalogue devices composed in one run each read back as the same device composed alone, and Logitech\'s differ only where named',
  needing(skipWithoutIrArchive(), skipUnless(...SEVERAL.map((one) => one.compile))), () => {
    // Against the same device composed alone into the same compile, against Logitech's, and the control.
    const alike = score();
    const logitech = score();
    const control = score();
    const composedDevices: string[] = [];
    for (const { compile, refused } of SEVERAL) {
      const found = CAL.filter((one) => one.fixture === compile && one.file !== '' && one.file !== 'TX-28A1U').map(find);
      const base = found[0]!.c;
      const requests = found.map((f, k) => ({
        manufacturer: f.one.slug, model: f.one.file, label: SEVERAL_LABELS[k] as string, title: titleOf(f.one),
        full: true,
      }));
      if (refused !== undefined) {
        assert.throws(() => composeCatalogueDevices(base, IR_ARCHIVE!, requests), { message: refused.message }, compile);
        requests.splice(refused.keep);
        found.splice(refused.keep);
        if (found.length < 2) continue;
      }
      const together = composeCatalogueDevices(base, IR_ARCHIVE!, requests);
      const all = parse(together.bytes);
      found.forEach((f, k) => {
        const where = `${compile} ${f.one.label}`;
        const alone = composeCatalogueDevice(base, IR_ARCHIVE!, requests[k]!);
        const one = parse(alone.bytes);
        const mine = readMode(one, alone.screen.mode, namer(one, f.commands));
        // One namer for the composed container, since naming builds every catalogue command's block.
        const names = namer(all, f.commands);
        // A mode index is fixed once composed: a later device appends its own and moves none.
        const ours = readMode(all, together.devices[k]!.screen.mode, names);
        // Two containers, so a picture is compared by its bytes: a later device moves every address.
        compare(alike, where, byPicture(one, mine), byPicture(all, ours), sameNames);
        // Logitech's mode read out of the composed container too, so a picture is one address on both sides.
        compare(logitech, f.one.label, readMode(all, f.mode, names), ours);
        // The control: the next device's mode, read with this device's names, is not this one.
        const other = together.devices[(k + 1) % found.length]!.screen.mode;
        compare(control, where, byPicture(one, mine), byPicture(all, readMode(all, other, names)), sameNames);
        composedDevices.push(f.one.label);
      });
    }
    if (process.env.DEVICEMODE_DETAIL) {
      console.log(`ALIKE ${report(alike)}`);
      console.log(`LOGITECH ${report(logitech)}`);
      console.log(`CONTROL ${report(control).split('\n')[0]}`);
    }
    assert.deepEqual(composedDevices, ['Panasonic_TX-29AK40F', 'Panasonic_TV', 'Barco_6300', 'JVC_DLA-HD10KU',
      'Panasonic_TX-P42GT30E', 'Pioneer_DEH-P47DH', 'Mivar_14_M3_TVD', 'Thomson_DSI-4400', 'Panasonic_TX-D37LT84F',
      'Sony_KE-50MR1E', 'Thomson_25DT60H', 'Sony_TV', 'Denon_AV_Receiver']);
    // Composed together, every device's mode is the one it gets composed alone, to the page, the key, the
    // label's place and size, the picture's bytes and the program's instructions.
    assert.deepEqual(tallies(alike), {
      pages: '13/13', keys: '369/369', items: '338/338', labels: '338/338', titles: '91/91', counters: '91/91',
      backgrounds: '91/91', programs: '91/91',
    });
    assert.equal(alike.differences.total, 0);
    // Against Logitech's: the single device score's named differences on these devices, and one more kind,
    // which is the catalogue composition's and not the run's. **A power pad runs the device's whole power
    // action**, `composeCatalogueDevice`'s `padList`, on every device that has power steps, and Logitech's
    // device mode sends none of its power transition records, 0 of 13 measured by the sentence audit: it
    // sends the plain press. The score sees that on four places only, the Mivar's Power On and Power Off,
    // the DSI-4400's Power Toggle and the 25DT60H's key 1, because there the record the action sends first
    // carries a different frame value from the stated command. On the other ten `namer` names that record
    // by its value as the plain command, so the score cannot tell them apart, and this assertion is no
    // evidence that their pads agree with Logitech's. Composed alone they are the same, which the score
    // above already says.
    assert.deepEqual(places(logitech), {
      'title differs': NAMED['title differs'],
      'item differs': ['Mivar_14_M3_TVD item 1', 'Mivar_14_M3_TVD item 2', 'Thomson_DSI-4400 item 1'],
      'label differs': ['Sony_KE-50MR1E item 66'],
      'program differs': ['Sony_KE-50MR1E page 17'],
      'key differs': ['Thomson_25DT60H scan 24'],
    });
    // The control: the next device's mode agrees on no page count, title or counter, so the score sees
    // which device a mode is.
    assert.equal(tallies(control)['pages'], '0/13');
    assert.equal(tallies(control)['titles'], '0/57');
  });
