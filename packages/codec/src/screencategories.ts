/**
 * Every byte of a configuration's screen sections, cut into units and given one of three categories:
 * **fixed**, **dynamic** or **setup**. Section 317, for `todo-compile-650.md` 7.2.
 *
 * The question is a generator's. To build a Harmony 650 configuration with nothing copied, which screen
 * bytes are the same whatever the setup, which draw something the remote decides while it runs, and
 * which follow from the devices and activities? The three answers are three kinds of work, a constant to
 * emit, a family of alternatives to emit, and a composer, so the categories are defined by what a
 * generator has to do rather than by where the bytes sit:
 *
 * * **fixed**: the unit is emitted for every setup and its content does not depend on the setup.
 * * **dynamic**: the unit draws state the remote holds at run time, choosing between alternatives by a
 *   state variable while it runs: the battery icons and the two delay countdowns.
 * * **setup**: whether the unit exists, how many of it there are, or what it holds follows from the
 *   devices, the activities and the names in them.
 *
 * **What counts as a screen byte**, `SCREEN_OWNERS`: every byte the byte accounting gives to base slot 6
 * (the mode table, each mode's record, entry, pages, page lists and their second copies, and mode 0's
 * record where it doubles as the key table), base slot 7 (the font table, each set's header and every
 * glyph), base slot 11 (the program table, every screen program and every picture outside the bank),
 * the picture bank, and on arch 14 base slot 17's two bytes in front of the bank. **Base slot 14 is left
 * out on purpose**: it is the state value map, a lookup from a state variable's value to an address, and
 * the programs it names are counted here because they are base slot 11 programs. Its own records draw
 * nothing and their size is set by how many delay cases the setup has.
 *
 * **The unit is the thing a generator emits whole**, so a category is decided per unit:
 *
 * * a **mode**: its record's own list, its entry, its page records, each page's list and that list's
 *   second copy, and every screen program reachable from the mode's own program or its pages' programs.
 * * a **dynamic program**: a base slot 11 entry that no value map names, with what it reaches. These are
 *   what a page's queued `0x73` runs.
 * * a **case program**: a base slot 11 program a value map case names, with what it reaches. On arch 14
 *   almost all of them queue one action list instruction and end.
 * * a **shared program**: program bytes two or more of the above reach. Zero on every arch 14
 *   configuration here, and kept so that a sharing configuration would be attributed, not counted twice.
 * * a **picture**, a **glyph**, a **font set** header, and the **tables**: base slot 6's, base slot 11's,
 *   base slot 7's and base slot 17's two bytes.
 *
 * **Two routes decide fixed, and both have to agree**, because neither is enough alone:
 *
 * 1. **Structure** says which units are allowed to be fixed: the firmware's own screens at the head of
 *    the mode table, the introduction tour, the Off screen, the pictures, base slot 17's two bytes, a
 *    case program of a lookup not keyed by a device or an activity, a glyph a fixed or dynamic unit
 *    draws, and a font set holding only such glyphs. Everything else is setup by structure, with the
 *    reason: a device's mode, a device list, an activity's start up screen, the help and Remote
 *    Assistant screens, a lookup keyed by a device's delay or the running activity, a glyph only setup
 *    screens draw, a table whose length counts the setup's modes, programs or fonts.
 * 2. **A census** of other configurations of the same model then has to find the unit the same number
 *    of times in each, in **look**. A structurally eligible unit the census sees vary is setup.
 *
 * The census alone is not enough and that was measured rather than assumed: the four Harmony 650
 * compiles in the lab share most of one household's devices, so help screens such as "Is the Denon set
 * to the Media Player input?" occur once in each of them and a census alone calls them fixed. Structure
 * alone is not enough either, since it cannot see a count move.
 *
 * **Two normal forms, because "the same" has two strengths**, and 7.2 asked which one fixed means:
 *
 * * `look` abstracts **placement**: every address becomes what it addresses, a glyph code becomes the
 *   glyph's own bytes, a font index becomes the font's height, an action operand that indexes a table
 *   this configuration numbers is dropped, an instruction writing a state variable keeps the write and
 *   the value and drops which variable, for every variable including the firmware's own 0 to 17 (the
 *   variable is the opcode's low bits), and a switch on a state variable above the firmware's own keeps
 *   the switch and drops the number. Two units with one look draw the same pixels and bind the same
 *   keys to the same kinds of instruction. **This is what fixed means.**
 * * `verbatim` abstracts addresses and nothing else. A fixed unit whose verbatim form differs between two
 *   configurations is fixed in look and **re-encoded** per configuration: its glyph codes, its font index,
 *   its string sharing or its table indices are that configuration's own. `attributeScreens` says which.
 *
 * Arch 14 (Harmony 600, 650 and 700) only: `screenUnits` returns undefined anywhere else, because the
 * roles rest on readers whose arch 14 shapes are the ones checked, and a Harmony One's pages call
 * shared programs, which would put its chrome into shared units with no meaning of their own.
 */
import { type Container, archSlot } from './gspm.ts';
import { claims, namedContentEnd } from './coverage.ts';
import { decodedSet, fontSets } from './font.ts';
import {
  type ScreenInstruction,
  SCREEN_JUMP,
  SCREEN_QUEUE_INSTRUCTION,
  SCREEN_SELECT_FONT,
  SCREEN_SWITCH_NARROW,
  SCREEN_SWITCH_WIDE,
  SCREEN_TABLE_SLOT,
  SCREEN_TEXT_AT,
  SCREEN_TEXT_INLINE,
  bitmaps,
  deadTerminator,
  pictureBank,
  pictureReference,
  reachablePrograms,
  screenProgram,
  screenSwitch,
} from './screen.ts';
import {
  ACTION_LIST_INDEX_OPCODE,
  HANDLER_TAG_ENTER,
  type ModeRecord,
  type TaggedEntry,
  handlerSets,
  modeRecords,
  pageListCopies,
  taggedList,
  taggedListExtent,
} from './sections.ts';
import { glyphRunAt, referencedStringAddress } from './text.ts';
import { valueMaps } from './valuemap.ts';
import { STATE_WRITE_BASE } from './actions.ts';
import {
  ACTIVITY_STATE_NAME,
  deviceListRowMode,
  deviceModeMarker,
  deviceVariables,
  devices,
  handlerSetRoles,
  stateVariables,
} from './inventory.ts';
import { introductionTour } from './edit.ts';

/** The architectures `screenUnits` answers on. See the module comment for why only one. */
export const SCREEN_CATEGORY_ARCHITECTURES: ReadonlySet<number> = new Set([14]);

/**
 * The byte accounting's owners that make up the screen sections, as `coverage.ts` names them.
 *
 * `slot-17-table` is the two bytes in front of the picture bank on arch 14; on arch 12 the same owner is
 * the touch map, which is one reason `screenUnits` refuses that architecture.
 */
export const SCREEN_OWNERS: ReadonlySet<string> = new Set([
  'slot-6-table', 'slot-6-mode', 'key-table', 'slot-6-entry', 'slot-6-page', 'slot-6-page-list',
  'slot-6-page-list-copy', 'slot-11-table', 'slot-11-program', 'slot-11-bitmap', 'picture-bank',
  'slot-7-table', 'slot-7-set', 'slot-7-glyph', 'slot-17-table',
]);

export type ScreenCategory = 'fixed' | 'dynamic' | 'setup';

export type ScreenUnitKind =
  | 'mode' | 'dynamic-program' | 'case-program' | 'shared-program'
  | 'picture' | 'glyph' | 'font-set' | 'table';

/**
 * What a mode is, by structure alone and before any census.
 *
 * * `system`: the head of the mode table, a mode binding a whole keypad. Mode 0 is the screen an empty
 *   activity key shows, and its list is the key table, section 311.
 * * `status`: the head of the mode table, a mode binding nothing. The firmware enters these by number.
 * * `tour`: the introduction tour, found as `introductionTour` finds it, in either of its two forms.
 * * `off`: the screen shown while the system switches off. Every key bound to nothing, as on a start
 *   up screen, and entered by no activity's start.
 * * `start-up`: an activity's start up screen, the mode its start list enters first, section 290.
 * * `device`: a device's own mode, the one its device list row enters.
 * * `device-list`: a mode one of whose pages holds a device list row.
 * * `other`: everything else, which on the four Harmony 650 compiles is the help and Remote Assistant
 *   screens, the activity menu and the activities' working screens.
 */
export type ModeRole =
  | 'system' | 'status' | 'tour' | 'off' | 'start-up' | 'device' | 'device-list' | 'other';

/** The roles a mode may be fixed in. Every other role is the setup's by structure. */
export const FIXED_MODE_ROLES: ReadonlySet<ModeRole> = new Set(['system', 'status', 'tour', 'off']);

/** A run of container bytes, as blob offsets. */
export interface ByteRange {
  start: number;
  length: number;
}

export interface ScreenUnit {
  kind: ScreenUnitKind;
  /** A name for a person: `mode 57`, `picture at 3a51c0`, `base slot 11's table`. */
  label: string;
  /** The bytes the unit owns, disjoint from every other unit's. */
  ranges: ByteRange[];
  /** Their total. */
  bytes: number;
  /** The normal form with placement abstracted. Two units with one look are the same screen. */
  look: string;
  /** The normal form with only addresses abstracted. Equal means byte identical once relocated. */
  verbatim: string;
  /** For a mode, what the structural readers say it is. */
  role?: ModeRole;
  /**
   * Why structure alone makes this unit the setup's, or undefined where structure allows it to be
   * fixed. Glyphs and font sets are left undefined here and decided in `attributeScreens`, since what
   * decides them is which other units are fixed.
   */
  setupBy?: string;
  /** Set on a dynamic program and on a picture that only dynamic programs draw. */
  dynamicBy?: string;
  /** The looks of the glyphs this unit's text draws, for the glyph rule. */
  drawsGlyphs?: string[];
  /** For a font set, the looks of the glyphs it holds. */
  holdsGlyphs?: string[];
}

/**
 * Opcodes of the action language whose operand indexes a table this configuration numbers, so the
 * operand is placement and not content: `0x7E` a mode, `0x7F` an action list, `0x72` a value map and
 * a state variable, `0x73` a base slot 11 entry, `0x1F` a base slot 9 set, `0x7D` an infrared code.
 * A state variable write carries its index in the opcode, `0x80 + n`, and is folded to one opcode.
 */
export const PLACEMENT_OPCODES: ReadonlySet<number> = new Set([0x7e, 0x7f, 0x72, 0x73, 0x1f, 0x7d]);
/** Opcode `0x7E`, enter the mode the operand indexes. */
const ENTER_MODE = 0x7e;
/** Opcode `0x72`, look a state variable's value up in a base slot 14 record. */
const MAP_VALUE = 0x72;
/**
 * The state variables the arch 14 firmware owns, 0 to 17, section 284. A switch on one of these is a
 * switch on the same thing in every configuration, so its index is content; above it is placement.
 */
const FIRMWARE_VARIABLE_MAX = 17;
/**
 * A mode whose own list binds more than this many keys carries a whole keypad. The head of an arch 14
 * mode table is modes of that kind and modes binding nothing; a later mode binds at most 54 on every
 * arch 14 configuration here.
 */
const WHOLE_KEYPAD = 100;

/** A short stable hash of some bytes, FNV-1a and a second multiplier, as sixteen hex digits. */
function hashBytes(bytes: Uint8Array): string {
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ bytes.length;
  for (const byte of bytes) {
    a = Math.imul(a ^ byte, 0x01000193) >>> 0;
    b = Math.imul(b ^ byte, 0x5bd1e995) >>> 0;
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

/** Bytes as lower case hex, without `Buffer`, since the codec also runs outside Node. */
function hex(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out;
}

/** One action instruction as text, at either strength. The tag is a tagged list's, or 0 when queued. */
function entryForm(entry: TaggedEntry, look: boolean): string {
  const flags = entry.flags === undefined ? '' : `f${entry.flags}`;
  if (!look) return `${flags}${entry.tag}:${entry.opcode.toString(16)}:${entry.operand}`;
  if (entry.opcode >= STATE_WRITE_BASE) return `${flags}${entry.tag}:w:${entry.operand}`;
  if (PLACEMENT_OPCODES.has(entry.opcode)) return `${flags}${entry.tag}:${entry.opcode.toString(16)}`;
  return `${flags}${entry.tag}:${entry.opcode.toString(16)}:${entry.operand}`;
}

/** What a configuration's screen bytes are drawn from, gathered once per container. */
interface Context {
  c: Container;
  /** Picture address to its content hash. */
  pictures: Map<number, string>;
  /** Per font index, glyph code to the glyph's look. */
  glyphKeys: Map<number, string>[];
  /** Per font index, its height. */
  fontHeights: number[];
}

/**
 * The program graph reachable from `roots`, serialised in a canonical order: depth first from the roots
 * in the order given, every program numbered at first visit, every transfer written as that number. Two
 * graphs that differ only in where they sit serialise identically. The glyph looks the text draws are
 * added to `glyphs` when one is passed.
 *
 * The font carries along a transfer, which is how the remote runs it: opcode 16 sets a variable the text
 * opcodes read, and a jump does not reset it.
 */
function graphForm(ctx: Context, roots: readonly number[], look: boolean, glyphs?: Set<string>): string {
  const order = new Map<number, number>();
  const parts: string[] = [];
  const visit = (address: number, inherited: number): void => {
    if (order.has(address)) return;
    order.set(address, order.size);
    const program = screenProgram(ctx.c, address);
    if (program === undefined) {
      parts.push(`#${order.get(address)}:?`);
      return;
    }
    let font = inherited;
    const out: string[] = [];
    const later: [number, number][] = [];
    for (const one of program) {
      if (one.opcode === SCREEN_SELECT_FONT) font = one.operands[0] ?? -1;
      out.push(instructionForm(ctx, one, font, look, glyphs, (target) => {
        if (!order.has(target)) later.push([target, font]);
        return target;
      }));
    }
    parts.push(`#${order.get(address)}:${out.join(' ')}`);
    for (const [target, carried] of later) visit(target, carried);
  };
  for (const root of roots) visit(root, -1);
  // A transfer was written with its address, since its number is only known once the walk reaches it.
  return parts.join('|').replace(/@p(\d+)/g, (_, a) => `@${order.get(Number(a)) ?? '?'}`);
}

/** One screen instruction as text. `follow` registers a program target and returns it. */
function instructionForm(
  ctx: Context, one: ScreenInstruction, font: number, look: boolean, glyphs: Set<string> | undefined,
  follow: (target: number) => number,
): string {
  const ops = one.operands;
  const picture = pictureReference(one);
  if (picture !== undefined) {
    // Where a picture lands is part of the look; where it is stored is not.
    return `${one.opcode}(${hex(ops.subarray(0, ops.length - 3))})@pic:${ctx.pictures.get(picture) ?? '?'}`;
  }
  if (one.opcode === SCREEN_TEXT_INLINE || one.opcode === SCREEN_TEXT_AT) {
    const codes = one.opcode === SCREEN_TEXT_INLINE ? one.glyphs
      : glyphRunAt(ctx.c, referencedStringAddress(one) as number);
    const keys = [...(codes ?? [])].map((code) => ctx.glyphKeys[font]?.get(code) ?? `c${code}`);
    for (const key of keys) glyphs?.add(key);
    const position = hex(ops.subarray(0, 2));
    if (!look) return `${one.opcode}(${position})${hex(codes ?? new Uint8Array(0))}`;
    // A glyph code is the configuration's own numbering, so the look reads the glyph it names. Both
    // text opcodes are one draw in the look: whether a string is inline or names another program's copy
    // is how the compiler shared bytes, not what the screen shows.
    return `T(${position})[${keys.join(',')}]`;
  }
  if (one.opcode === SCREEN_SELECT_FONT) return look ? `F${ctx.fontHeights[font] ?? '?'}` : `F${font}`;
  if (one.opcode === SCREEN_QUEUE_INSTRUCTION) {
    const operand = (ops[0] as number) | ((ops[1] as number) << 8);
    return `A${entryForm({ tag: 0, operand, opcode: ops[2] as number, flags: undefined }, look)}`;
  }
  if (one.opcode === SCREEN_JUMP) return `J@p${follow(one.targets[0] as number)}`;
  if (one.opcode === SCREEN_SWITCH_NARROW || one.opcode === SCREEN_SWITCH_WIDE) {
    const decoded = screenSwitch(one);
    if (decoded === undefined) return 'S?';
    const variable = look && decoded.variable > FIRMWARE_VARIABLE_MAX ? 'v' : `${decoded.variable}`;
    const arms = decoded.cases.map((arm) => {
      const key = arm.value !== undefined ? `${arm.value}` : `${arm.from}-${arm.to}`;
      return arm.target === 0 ? `${key}>0` : `${key}>@p${follow(arm.target)}`;
    });
    return `S${one.opcode}:${variable}{${arms.join(',')}}`;
  }
  return `${one.opcode}(${hex(ops)})`;
}

/** Both forms of a tagged list's entries. */
function listForms(entries: readonly TaggedEntry[]): [string, string] {
  return [entries.map((e) => entryForm(e, true)).join(' '), entries.map((e) => entryForm(e, false)).join(' ')];
}

/** The structural role of every mode, independent of any census. */
export function modeRoles(c: Container): ModeRole[] {
  const records = modeRecords(c) ?? [];
  const roles: ModeRole[] = records.map(() => 'other');
  const pageEntries = (record: ModeRecord): TaggedEntry[] =>
    record.pages.flatMap((page) => taggedList(c, page.list)?.entries ?? []);

  // The head of the table: the compiler emits the firmware's own screens first, those that bind a
  // whole keypad and those that bind nothing, and the first mode of any other shape ends the run.
  for (let m = 0; m < records.length; m += 1) {
    const record = records[m] as ModeRecord;
    if (record.entries.length > WHOLE_KEYPAD) roles[m] = 'system';
    else if (record.entries.length === 0 && pageEntries(record).length === 0) roles[m] = 'status';
    else break;
  }

  // Devices and their lists, by the readers that already know them.
  const lists = c.actionLists() ?? [];
  const marker = deviceModeMarker(c);
  records.forEach((record, m) => {
    if (roles[m] !== 'other') return;
    const isList = pageEntries(record).some((entry) => entry.opcode === ACTION_LIST_INDEX_OPCODE
      && deviceListRowMode(lists[entry.operand], c.architecture, marker) !== undefined);
    if (isList) roles[m] = 'device-list';
  });
  for (const device of devices(c)) {
    if (device.mode !== undefined && roles[device.mode] === 'other') roles[device.mode] = 'device';
  }

  // An activity's start up screen: the mode the first instruction of its start list enters.
  const sets = handlerSets(c)?.addresses ?? [];
  const setRoles = handlerSetRoles(c);
  const startUps = new Set<number>();
  sets.forEach((address, index) => {
    if (setRoles[index] !== 'activity') return;
    const enter = taggedList(c, address)?.entries.find((e) => e.tag === HANDLER_TAG_ENTER
      && e.opcode === ACTION_LIST_INDEX_OPCODE);
    const first = enter === undefined ? undefined : lists[enter.operand]?.[0];
    if (first?.opcode === ENTER_MODE) startUps.add(first.operand);
  });
  for (const m of startUps) if (roles[m] === 'other') roles[m] = 'start-up';

  // The Off screen: a start up screen's shape, every key of its own list bound to nothing and no page
  // binding anything, that no activity's start enters.
  records.forEach((record, m) => {
    if (roles[m] !== 'other' || record.entries.length === 0) return;
    if (record.entries.every((e) => e.opcode === 0) && pageEntries(record).length === 0) roles[m] = 'off';
  });

  // The introduction tour, in either form: the screens one list enters, or the screens that run the
  // list the tour list calls instead, as `introductionTour` finds them.
  let tour: ReturnType<typeof introductionTour> | undefined;
  try {
    tour = introductionTour(c);
  } catch {
    tour = undefined;
  }
  if (tour !== undefined) {
    const bindings = (m: number): TaggedEntry[] => {
      const record = records[m];
      return record === undefined ? [] : [...record.entries, ...pageEntries(record)];
    };
    const closure = (from: number): { modes: Set<number>; exits: Set<number> } => {
      const modes = new Set<number>();
      const exits = new Set<number>();
      const queue = [from];
      while (queue.length > 0) {
        const m = queue.shift() as number;
        if (modes.has(m)) continue;
        modes.add(m);
        for (const entry of bindings(m)) {
          if (entry.opcode === ENTER_MODE) queue.push(entry.operand);
          else if (entry.opcode === ACTION_LIST_INDEX_OPCODE) exits.add(entry.operand);
        }
      }
      return { modes, exits };
    };
    let found: Set<number> | undefined;
    if (tour.mode !== undefined) found = closure(tour.mode).modes;
    else {
      for (let m = 0; m < records.length && found === undefined; m += 1) {
        const { modes, exits } = closure(m);
        if (modes.size === tour.modes && exits.size === 1 && exits.has(tour.exit)) found = modes;
      }
    }
    for (const m of found ?? []) if (roles[m] === 'other') roles[m] = 'tour';
  }
  return roles;
}

/** Why structure makes a mode of this role the setup's. */
const SETUP_ROLE_REASON: Readonly<Record<ModeRole, string>> = {
  'system': '', 'status': '', 'tour': '', 'off': '',
  'start-up': "an activity's start up screen, which draws the activity's name",
  'device': "a device's own mode, one per device, titled with its name",
  'device-list': "a device list, whose rows and pages are the setup's devices",
  'other': 'a screen the compiler builds from the account: help, Remote Assistant, the activity menu or a working screen',
};

/**
 * The value map records keyed by a variable that belongs to a device or to the running activity, by
 * index, with that variable's name. Such a record's cases are one per device delay or per activity.
 */
function setupKeyedMaps(c: Container): Map<number, string> {
  const variables = new Map(stateVariables(c).map((v) => [v.index, v]));
  const deviceOwned = new Set(deviceVariables(c).map((v) => v.index));
  const out = new Map<number, string>();
  const note = (operand: number): void => {
    const record = operand >> 8;
    const variable = variables.get(operand & 0xff);
    if (variable === undefined) return;
    const setup = variable.deviceId !== undefined || deviceOwned.has(variable.index)
      || variable.name.split('_')[0] === ACTIVITY_STATE_NAME;
    if (setup && !out.has(record)) out.set(record, variable.name);
  };
  for (const list of c.actionLists() ?? []) for (const one of list) if (one.opcode === MAP_VALUE) note(one.operand);
  for (const [, program] of reachablePrograms(c)) {
    for (const one of program) {
      if (one.opcode === SCREEN_QUEUE_INSTRUCTION && one.operands[2] === MAP_VALUE) {
        note((one.operands[0] as number) | ((one.operands[1] as number) << 8));
      }
    }
  }
  const tagged = [
    ...(modeRecords(c) ?? []).flatMap((r) => [...r.entries, ...r.pages.flatMap((p) => taggedList(c, p.list)?.entries ?? [])]),
    ...(handlerSets(c)?.addresses ?? []).flatMap((a) => taggedList(c, a)?.entries ?? []),
  ];
  for (const entry of tagged) if (entry.opcode === MAP_VALUE) note(entry.operand);
  return out;
}

/**
 * Cut a configuration's screen bytes into units, each with its two normal forms and what structure says
 * about it.
 *
 * Every byte `SCREEN_OWNERS` claims lands in exactly one unit; this throws if one does not, since an
 * unattributed screen byte would make every category total quietly short.
 */
export function screenUnits(c: Container): ScreenUnit[] | undefined {
  if (c.architecture === undefined || !SCREEN_CATEGORY_ARCHITECTURES.has(c.architecture)) return undefined;
  const records = modeRecords(c);
  const fonts = fontSets(c);
  if (records === undefined || fonts === undefined) return undefined;

  // Which bytes are screen bytes, and which owner holds each, first claim first as `coverage` does.
  const owner = new Array<string | undefined>(c.blob.length);
  for (const claim of claims(c)) {
    if (!SCREEN_OWNERS.has(claim.owner)) continue;
    for (let i = claim.start; i < claim.start + claim.length; i += 1) owner[i] ??= claim.owner;
  }

  // What the normal forms look things up in: every picture's content, every glyph's.
  const bank = pictureBank(c, namedContentEnd(c)) ?? [];
  const inBank = new Set(bank.map((p) => p.address));
  const pictureList = [...bank, ...bitmaps(c).filter((b) => !inBank.has(b.address))];
  const pictures = new Map<number, string>();
  for (const picture of pictureList) {
    const off = c.blobOffsetOf(picture.address) as number;
    pictures.set(picture.address, hashBytes(c.blob.subarray(off, off + (picture.length ?? 0))));
  }
  const glyphKeys: Map<number, string>[] = [];
  const units: ScreenUnit[] = [];
  fonts.forEach((font, index) => {
    const keys = new Map<number, string>();
    for (const one of decodedSet(c, font)) {
      if (one.glyph === undefined) continue;
      const off = c.blobOffsetOf(one.address) as number;
      // A glyph's look is its own bytes and the height of the set it is drawn at.
      const key = `${font.height}:${hashBytes(c.blob.subarray(off, off + one.glyph.length))}`;
      keys.set(font.first + one.index, key);
      units.push(finish({ kind: 'glyph', label: `glyph ${font.first + one.index} of font set ${index}`,
                          ranges: [{ start: off, length: one.glyph.length }], look: `glyph:${key}`,
                          verbatim: `glyph:${key}` }));
    }
    glyphKeys.push(keys);
  });
  const ctx: Context = { c, pictures, glyphKeys, fontHeights: fonts.map((font) => font.height) };

  // The units that own programs, with their roots.
  const table = c.pointerArray(archSlot(c.architecture, SCREEN_TABLE_SLOT)) ?? [];
  const caseOf = new Map<number, number[]>();
  (valueMaps(c) ?? []).forEach((record, index) => {
    for (const target of [...record.entries.map(([, t]) => t), ...record.ranges.map(([, , t]) => t)]) {
      caseOf.set(target, [...(caseOf.get(target) ?? []), index]);
    }
  });
  interface Owning { kind: ScreenUnitKind; label: string; roots: number[] }
  const owning: Owning[] = records.map((record, m) => ({
    kind: 'mode', label: `mode ${m}`, roots: [record.start + record.length, ...record.pages.map((p) => p.program)],
  }));
  table.forEach((address, index) => {
    if (!caseOf.has(address)) owning.push({ kind: 'dynamic-program', label: `base slot 11 entry ${index}`, roots: [address] });
  });
  const tableIndex = new Map(table.map((address, index) => [address, index]));
  for (const address of [...caseOf.keys()].sort((a, b) => a - b)) {
    const index = tableIndex.get(address);
    owning.push({ kind: 'case-program', roots: [address],
                  label: index === undefined ? `case program at ${address.toString(16)}` : `base slot 11 entry ${index}` });
  }

  // Which owning units reach each program byte, and which draw each picture.
  const reachedBy = new Map<number, Set<number>>();
  const drawnBy = new Map<number, Set<number>>();
  owning.forEach((unit, index) => {
    const mark = (start: number, length: number): void => {
      for (let i = start; i < start + length; i += 1) {
        const set = reachedBy.get(i) ?? new Set<number>();
        set.add(index);
        reachedBy.set(i, set);
      }
    };
    for (const [, program] of reachablePrograms(c, unit.roots)) {
      for (const one of program) {
        mark(one.start, one.length);
        const picture = pictureReference(one);
        if (picture !== undefined) drawnBy.set(picture, (drawnBy.get(picture) ?? new Set<number>()).add(index));
      }
      const dead = deadTerminator(c, program);
      if (dead !== undefined) mark(dead, 1);
    }
  });

  // Runs of program bytes with one reaching set: a single unit's own, or a shared program.
  const ownRanges: ByteRange[][] = owning.map(() => []);
  const shared = new Map<string, ByteRange[]>();
  let run: { start: number; length: number; key: string } | undefined;
  const flush = (): void => {
    if (run === undefined) return;
    const users = run.key.split(',').map(Number);
    if (users.length === 1) ownRanges[users[0] as number]!.push({ start: run.start, length: run.length });
    else shared.set(run.key, [...(shared.get(run.key) ?? []), { start: run.start, length: run.length }]);
    run = undefined;
  };
  for (const i of [...reachedBy.keys()].sort((a, b) => a - b)) {
    if (owner[i] !== 'slot-11-program') continue;
    const key = [...(reachedBy.get(i) as Set<number>)].sort((a, b) => a - b).join(',');
    if (run !== undefined && run.key === key && run.start + run.length === i) run.length += 1;
    else { flush(); run = { start: i, length: 1, key }; }
  }
  flush();

  // The modes: a mode's own structures beside its programs.
  const copies = pageListCopies(c);
  const roles = modeRoles(c);
  let pageIndex = 0;
  records.forEach((record, m) => {
    const ranges = ownRanges[m] as ByteRange[];
    ranges.push({ start: c.blobOffsetOf(record.start) as number, length: record.length });
    ranges.push({ start: c.blobOffsetOf(record.address) as number, length: record.entryLength });
    let lookPages = '';
    let verbatimPages = '';
    for (const page of record.pages) {
      ranges.push({ start: c.blobOffsetOf(page.address) as number, length: page.length });
      const list = taggedList(c, page.list);
      if (list !== undefined) ranges.push({ start: c.blobOffsetOf(page.list) as number, length: list.length });
      const copy = copies[pageIndex];
      pageIndex += 1;
      const extent = copy === undefined ? undefined : taggedListExtent(c.blob, copy);
      if (copy !== undefined && extent !== undefined) ranges.push({ start: copy, length: extent.length });
      // The second copy means what its page's list means, so only the verbatim form carries it.
      const [lookList, verbatimList] = listForms(list?.entries ?? []);
      lookPages += `P[${lookList}]`;
      verbatimPages += `P[${verbatimList}]`
        + (copy !== undefined && extent !== undefined ? `C${hex(c.blob.subarray(copy, copy + extent.length))}` : '');
    }
    const [lookOwn, verbatimOwn] = listForms(record.entries);
    const glyphs = new Set<string>();
    const roots = (owning[m] as Owning).roots;
    const role = roles[m] as ModeRole;
    units.push(finish({
      kind: 'mode', label: `mode ${m}`, ranges, role,
      look: `mode k${record.kind}[${lookOwn}]${lookPages}G${graphForm(ctx, roots, true, glyphs)}`,
      verbatim: `mode k${record.kind}[${verbatimOwn}]${verbatimPages}G${graphForm(ctx, roots, false)}`,
      drawsGlyphs: [...glyphs],
      ...(FIXED_MODE_ROLES.has(role) ? {} : { setupBy: SETUP_ROLE_REASON[role] }),
    }));
  });

  // The programs no mode owns.
  const keyed = setupKeyedMaps(c);
  owning.forEach((unit, index) => {
    if (unit.kind === 'mode') return;
    const glyphs = new Set<string>();
    const look = `${unit.kind}:${graphForm(ctx, unit.roots, true, glyphs)}`;
    const verbatim = `${unit.kind}:${graphForm(ctx, unit.roots, false)}`;
    const maps = caseOf.get(unit.roots[0] as number) ?? [];
    const keyedBy = maps.map((record) => keyed.get(record)).find((name) => name !== undefined);
    units.push(finish({
      kind: unit.kind, label: unit.label, ranges: ownRanges[index] as ByteRange[], look, verbatim,
      drawsGlyphs: [...glyphs],
      ...(unit.kind === 'dynamic-program'
        ? { dynamicBy: 'a base slot 11 program no value map names, run by a queued 0x73: a switch on a state variable chooses what it draws while the remote runs' }
        : {}),
      ...(keyedBy === undefined ? {} : { setupBy: `a case of the lookup keyed by ${keyedBy}, one per device delay or activity` }),
    }));
  });
  for (const [key, ranges] of shared) {
    const users = key.split(',').map((one) => (owning[Number(one)] as Owning).label);
    const bytes = ranges.map((r) => hex(c.blob.subarray(r.start, r.start + r.length))).join('');
    // Nothing on arch 14 is shared, so this is a defence with no case behind it, and it is the setup's
    // until a configuration shows what such bytes are.
    units.push(finish({ kind: 'shared-program', label: `program bytes shared by ${users.join(', ')}`, ranges,
                        look: `shared:${bytes}`, verbatim: `shared:${bytes}`, setupBy: 'program bytes several units reach' }));
  }

  // Pictures, one unit each. One only dynamic programs draw is dynamic; the rest are left to the census,
  // since a picture carries no name and which screens draw it says where it is shown, not what it is.
  for (const picture of pictureList) {
    const off = c.blobOffsetOf(picture.address) as number;
    const users = [...(drawnBy.get(picture.address) ?? [])].map((u) => (owning[u] as Owning).kind);
    const onlyDynamic = users.length > 0 && users.every((kind) => kind === 'dynamic-program');
    const key = `picture:${pictures.get(picture.address)}`;
    units.push(finish({ kind: 'picture', label: `picture at ${picture.address.toString(16)}`,
                        ranges: [{ start: off, length: picture.length ?? 0 }], look: key, verbatim: key,
                        ...(onlyDynamic ? { dynamicBy: 'a picture only dynamic programs draw' } : {}) }));
  }

  // Font set headers. The look is the set's height and the glyphs it holds, in code order.
  fonts.forEach((font, index) => {
    const keys = glyphKeys[index] as Map<number, string>;
    const held = font.glyphs.map((_, k) => keys.get(font.first + k) ?? '-');
    const off = c.blobOffsetOf(font.address) as number;
    units.push(finish({ kind: 'font-set', label: `font set ${index}`, ranges: [{ start: off, length: font.length }],
                        look: `font:${font.height}:${held.join(',')}`,
                        verbatim: `font:${hex(c.blob.subarray(off, off + 3))}:${held.join(',')}`,
                        holdsGlyphs: held.filter((k) => k !== '-') }));
  });

  // The tables. Three are counted arrays of addresses whose length is the setup's number of modes,
  // programs and font sets; base slot 17's two bytes are not addresses and are compared as they are.
  const tables: [string, string, string | undefined][] = [
    ['slot-6-table', "base slot 6's table", 'its count is the number of modes the setup needs'],
    ['slot-11-table', "base slot 11's table", 'its count is the number of programs the setup needs'],
    ['slot-7-table', "base slot 7's table", "its count is the number of font sets the setup's text needs"],
    ['slot-17-table', "base slot 17's two bytes", undefined],
  ];
  for (const [name, label, why] of tables) {
    const ranges = runsOf(owner, (o) => o === name);
    const bytes = ranges.reduce((n, r) => n + r.length, 0);
    if (bytes === 0) continue;
    const raw = why === undefined ? ranges.map((r) => hex(c.blob.subarray(r.start, r.start + r.length))).join('') : '';
    units.push(finish({ kind: 'table', label, ranges, look: `${name}:${bytes}:${raw}`, verbatim: `${name}:${bytes}:${raw}`,
                        ...(why === undefined ? {} : { setupBy: why }) }));
  }

  // Every screen byte exactly once, or the totals are not what they say.
  const seen = new Uint8Array(c.blob.length);
  for (const unit of units) {
    for (const range of unit.ranges) {
      for (let i = range.start; i < range.start + range.length; i += 1) {
        if (owner[i] === undefined) throw new Error(`${unit.label} claims byte ${i}, which is not a screen byte`);
        if (seen[i] !== 0) throw new Error(`${unit.label} claims byte ${i} a second time`);
        seen[i] = 1;
      }
    }
  }
  for (let i = 0; i < c.blob.length; i += 1) {
    if (owner[i] !== undefined && seen[i] === 0) throw new Error(`screen byte ${i} (${owner[i]}) is in no unit`);
  }
  return units;
}

function finish(unit: Omit<ScreenUnit, 'bytes'>): ScreenUnit {
  return { ...unit, bytes: unit.ranges.reduce((n, r) => n + r.length, 0) };
}

/** Maximal runs of indices whose owner satisfies `pick`, in order. */
function runsOf(owner: readonly (string | undefined)[], pick: (o: string | undefined) => boolean): ByteRange[] {
  const out: ByteRange[] = [];
  let start: number | undefined;
  for (let i = 0; i <= owner.length; i += 1) {
    const inside = i < owner.length && pick(owner[i]);
    if (inside && start === undefined) start = i;
    if (!inside && start !== undefined) {
      out.push({ start, length: i - start });
      start = undefined;
    }
  }
  return out;
}

/** How many units of each look a configuration has. */
export function screenCensus(units: readonly ScreenUnit[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const unit of units) out.set(unit.look, (out.get(unit.look) ?? 0) + 1);
  return out;
}

/** One configuration of a population: a name for the reasons, and its units. */
export interface CensusMember {
  name: string;
  units: readonly ScreenUnit[];
}

/** One unit's answer. */
export interface ScreenAttribution {
  unit: ScreenUnit;
  category: ScreenCategory;
  /** Why, in words. */
  reason: string;
  /**
   * For a fixed unit, whether every member of the population holds it byte for byte once relocated
   * (`verbatim`), or only in look, so that it is re-encoded per configuration (`re-encoded`).
   */
  strength?: 'verbatim' | 're-encoded';
}

/**
 * Give every unit of one configuration a category, against a population of the same model.
 *
 * `population` holds the configurations to compare with, this one included or not. Dynamic comes first
 * and does not consult the population. Then structure: a unit carrying `setupBy` is setup. A glyph is
 * setup unless a unit that is not setup draws it, and a font set unless every glyph it holds is fixed.
 *
 * What is left is fixed when two things hold in **every** member: its look occurs there as many times
 * as here, and no unit of that look is setup there by structure. The second half is what keeps one
 * configuration's answer from depending on which configuration is asked: the delay cases of a lookup
 * this configuration does not tie to a device can have the look of another configuration's per device
 * cases, and there they are the setup's. An empty population makes nothing fixed.
 */
export function attributeScreens(
  units: readonly ScreenUnit[], population: readonly CensusMember[],
): ScreenAttribution[] {
  const own = screenCensus(units);
  const members = population.map((member) => {
    const verbatim = new Map<string, Set<string>>();
    const setup = new Set<string>();
    for (const unit of member.units) {
      verbatim.set(unit.look, (verbatim.get(unit.look) ?? new Set<string>()).add(unit.verbatim));
      if (unit.setupBy !== undefined) setup.add(unit.look);
    }
    return { name: member.name, census: screenCensus(member.units), verbatim, setup };
  });
  const byCensus = (unit: ScreenUnit): ScreenAttribution => {
    const count = own.get(unit.look) ?? 0;
    if (members.length === 0) return { unit, category: 'setup', reason: 'no population to compare with' };
    const marked = members.find((member) => member.setup.has(unit.look));
    if (marked !== undefined) {
      return { unit, category: 'setup', reason: `its look is the setup's by structure in ${marked.name}` };
    }
    const differs = members.find((member) => (member.census.get(unit.look) ?? 0) !== count);
    if (differs !== undefined) {
      const there = differs.census.get(unit.look) ?? 0;
      return { unit, category: 'setup',
               reason: there === 0 ? `absent from ${differs.name}` : `${count} here and ${there} in ${differs.name}` };
    }
    const verbatim = members.every((member) =>
      [...(member.verbatim.get(unit.look) ?? [])].every((form) => form === unit.verbatim));
    return { unit, category: 'fixed', strength: verbatim ? 'verbatim' : 're-encoded',
             reason: `${count} in each of the ${members.length} configurations` };
  };

  // Everything but the glyphs and the font sets, which depend on what the rest came out as.
  const out = new Map<ScreenUnit, ScreenAttribution>();
  for (const unit of units) {
    if (unit.kind === 'glyph' || unit.kind === 'font-set') continue;
    if (unit.dynamicBy !== undefined) out.set(unit, { unit, category: 'dynamic', reason: unit.dynamicBy });
    else if (unit.setupBy !== undefined) out.set(unit, { unit, category: 'setup', reason: unit.setupBy });
    else out.set(unit, byCensus(unit));
  }
  const needed = new Set<string>();
  for (const [unit, answer] of out) {
    if (answer.category === 'setup') continue;
    for (const glyph of unit.drawsGlyphs ?? []) needed.add(glyph);
  }
  const fixedGlyphs = new Set<string>();
  for (const unit of units) {
    if (unit.kind !== 'glyph') continue;
    const key = unit.look.slice('glyph:'.length);
    const answer = needed.has(key) ? byCensus(unit)
      : { unit, category: 'setup' as const, reason: 'a glyph only setup screens draw' };
    if (answer.category === 'fixed') fixedGlyphs.add(key);
    out.set(unit, answer);
  }
  for (const unit of units) {
    if (unit.kind !== 'font-set') continue;
    const all = (unit.holdsGlyphs ?? []).every((glyph) => fixedGlyphs.has(glyph));
    out.set(unit, all ? byCensus(unit) : { unit, category: 'setup', reason: 'a font set holding a glyph only setup screens draw' });
  }
  return units.map((unit) => out.get(unit) as ScreenAttribution);
}

/** Bytes per category, the figure 7.2 asks for. */
export function screenCategoryTotals(attributions: readonly ScreenAttribution[]): Record<ScreenCategory, number> {
  const out: Record<ScreenCategory, number> = { fixed: 0, dynamic: 0, setup: 0 };
  for (const one of attributions) out[one.category] += one.unit.bytes;
  return out;
}
