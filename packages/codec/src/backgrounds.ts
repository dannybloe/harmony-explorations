/**
 * The Harmony 650's screen backgrounds as one flat colour per state: `todo-compile-650.md` 9.1.2.
 *
 * Logitech draws the device pages, the device lists, the activity menu and the activities' working screens
 * over five designed pictures, a curved grey or red shape with a cross or a line (section 363). The project
 * owner decided on 10 October 2026 that ours are one colour per **state** instead, and that the colours will
 * become a user's setting, a colour or a picture:
 *
 * * **device**: a device's own pages and every device list entered while an activity runs, `rgb(184 32 55)`;
 * * **activity**: an activity's working screens, `rgb(18 37 200)`;
 * * **idle**, nothing running and no device chosen: the activity menu and the idle device list, the corner
 *   list the key under the display's centre opens while no activity runs, `rgb(1 136 53)`.
 *
 * **Logitech's pictures do not follow these states**, so this is not a swap of five pictures. The idle device
 * list draws the device pages' picture, and the activity menu's page of one row draws the same picture as an
 * activity's page of one command, measured over the 13 Harmony 650 compiles. So each mode is given its
 * state's picture by repointing the references its pages' programs make, and a reference shared by two
 * states is refused rather than given either colour.
 *
 * **The corner the battery icon sits in has to change with them.** A screen queues one of three battery
 * programs, each a switch on state variable 17 that draws the icon from 1 to 3 and at 0 a patch in the colour
 * of the background under it, section 363; one program serves every device screen and the idle device list,
 * another the activity menu and every working screen. Two programs cannot paint three colours, so the
 * activity menu's program is copied for the idle state, its patch drawn in the idle colour, the copy appended
 * to base slot 11's table, and the two idle screens' records rebuilt through `screenrecords.ts` naming it.
 * The two shared programs keep their table entries and get their state's patch.
 *
 * What is left as it was: the plain background, the bars, the start up picture, the corner icon and the
 * firmware screens' pictures, which are not a state's (section 363's other rows). A designed background no
 * screen draws any more is dropped from the picture bank, so the result holds none of the five.
 *
 * The Harmony 650 alone, by its two skins: the 2026 Harmony 700 compiles share the look and nobody has checked
 * one built this way. Read only towards hardware: the result is a layout.
 */
import type { ContainerLayout, ContainerPiece, PieceRef } from './frame.ts';
import { layOutContainer } from './frame.ts';
import { rgbTo565 } from './png.ts';
import type { Container } from './gspm.ts';
import { archSlot } from './gspm.ts';
import { HARMONY_650_PICTURES, pictureRows } from './pictures.ts';
import {
  SCREEN_QUEUE_INSTRUCTION, SCREEN_TABLE_SLOT, bitmapAt, encodeBitmap, pictureReference, reachablePrograms, screenProgram,
} from './screen.ts';
import { contentKey, modeRoles } from './screencategories.ts';
import { buildScreenRecords, describeScreenRecords, screenRecordModes, withScreenRecords } from './screenrecords.ts';
import { DEVICE_MODE_PROGRAM_TAG, activityKeyedRecords } from './compose.ts';
import { valueMaps } from './valuemap.ts';
import { modeRecords } from './sections.ts';

/** A refusal, named so a caller can tell a configuration this does not handle from a bug. */
export class BackgroundError extends Error {}

export type ScreenState = 'device' | 'activity' | 'idle';
export const SCREEN_STATES: readonly ScreenState[] = ['device', 'activity', 'idle'];

/** A colour per state, as the panel's RGB565. */
export type BackgroundColours = Record<ScreenState, number>;

/** The colours decided on 10 October 2026, until a user's setting replaces them. */
export const DEFAULT_BACKGROUND_COLOURS: BackgroundColours = {
  device: rgbTo565(184, 32, 55),
  activity: rgbTo565(18, 37, 200),
  idle: rgbTo565(1, 136, 53),
};

/** The five designed backgrounds, by `HARMONY_650_PICTURES` name: the ones a state's colour replaces. */
export const DESIGNED_BACKGROUNDS: readonly string[] = [
  'device page crossed', 'device page of one item', 'activity menu of two', 'activity menu of one', 'working screen crossed',
];
const DEVICE_BACKGROUNDS = new Set(['device page crossed', 'device page of one item']);
/** The patches a battery program draws at 0, which take the colour of the background under them. */
const STATE_PATCHES = new Set(['corner patch, grey', 'corner patch, red']);

/**
 * The Harmony 650's two skins, 72 and its EMEA twin 74 (`packages/usb/src/models.ts`). The Harmony 700's 2026
 * compiles share the look and run through this too, which nobody has checked on a 700, and the 600's do
 * not, so the model is gated rather than the architecture.
 */
const HARMONY_650_SKINS: ReadonlySet<number> = new Set([72, 74]);
const BACKGROUND_SIZE = 128;
/** The action that enters a mode, `0x7E`; a private constant in seven other modules as well. */
const OP_ENTER_MODE = 0x7e;
/** The action that runs a base slot 11 program, `0x73`, as a page's program queues its battery program. */
const RUN_SCREEN_PROGRAM = 0x73;
/** The two state patches' size, 12 by 10, at 114, 112. */
const PATCH_WIDTH = 12;
const PATCH_HEIGHT = 10;

const nameByKey = new Map(HARMONY_650_PICTURES.map((entry) => [entry.key, entry.name]));

/** A fill of one colour, encoded. */
const flat = (width: number, height: number, colour: number): Uint8Array =>
  encodeBitmap(pictureRows({ kind: 'fill', width, height, colour }));

/** Every piece of a layout, in the order `takeApart` keeps them. */
function piecesOf(layout: ContainerLayout): ContainerPiece[] {
  return [layout.keyTable, ...layout.body,
    ...layout.sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])), ...layout.pictures];
}

/** The layout with every piece fresh, references following, so the input is left as it was. */
function fresh(layout: ContainerLayout): ContainerLayout {
  const map = new Map<ContainerPiece, ContainerPiece>();
  for (const old of piecesOf(layout)) map.set(old, { ...old, bytes: Uint8Array.from(old.bytes), refs: [] });
  for (const [old, made] of map) {
    made.refs = old.refs.map((ref): PieceRef => ('to' in ref ? { ...ref, to: map.get(ref.to) ?? ref.to } : { ...ref }));
  }
  const run = (pieces: ContainerPiece[]): ContainerPiece[] => pieces.map((piece) => map.get(piece) as ContainerPiece);
  return {
    ...layout,
    keyTable: map.get(layout.keyTable) as ContainerPiece,
    body: run(layout.body),
    sections: layout.sections.map((s) => (s === undefined ? s : { before: run(s.before), head: run(s.head) })),
    pictures: run(layout.pictures),
  };
}

/** Where a laid out container's address fields sit, as a piece and an offset into it. */
function fieldLocator(layout: ContainerLayout): { c: Container; at: (blobOffset: number) => { piece: ContainerPiece; at: number } } {
  const laid = layOutContainer(layout);
  const starts = piecesOf(layout)
    .map((piece) => ({ piece, from: laid.offsetOf(piece) as number }))
    .sort((a, b) => a.from - b.from);
  return {
    c: laid.container,
    at: (offset) => {
      let low = 0;
      let high = starts.length - 1;
      while (low < high) {
        const mid = (low + high + 1) >> 1;
        if ((starts[mid] as { from: number }).from <= offset) low = mid;
        else high = mid - 1;
      }
      const hit = starts[low] as { piece: ContainerPiece; from: number };
      return { piece: hit.piece, at: offset - hit.from };
    },
  };
}

/** The reference a piece holds at `at`, which a picture instruction's last three bytes are. */
function refAt(piece: ContainerPiece, at: number): Extract<PieceRef, { to: ContainerPiece }> {
  const ref = piece.refs.find((one) => one.at === at);
  if (ref === undefined || !('to' in ref)) throw new BackgroundError(`no address field at ${at} of a program piece`);
  return ref;
}

/** The `HARMONY_650_PICTURES` name of the picture at `address`, or undefined. */
function pictureName(c: Container, address: number): string | undefined {
  const b = bitmapAt(c, address);
  const off = c.blobOffsetOf(address);
  if (b?.length === undefined || off === undefined) return undefined;
  return nameByKey.get(contentKey(c.blob.slice(off, off + b.length)));
}

/** Each picture drawing instruction a set of programs reaches: the picture's name and where its field is. */
function pictureFields(c: Container, roots: readonly number[]): { name: string | undefined; field: number }[] {
  const out: { name: string | undefined; field: number }[] = [];
  for (const program of reachablePrograms(c, roots).values()) {
    for (const instruction of program) {
      const address = pictureReference(instruction);
      if (address === undefined) continue;
      out.push({ name: pictureName(c, address), field: instruction.start + instruction.length - 3 });
    }
  }
  return out;
}

/** The base slot 11 entries a mode's own key map queues under the program tag. */
function batteryOperands(c: Container, mode: number): number[] {
  return (modeRecords(c)?.[mode]?.entries ?? []).filter((one) => one.tag === DEVICE_MODE_PROGRAM_TAG).map((one) => one.operand);
}

/**
 * Each mode's state, where it has one, by structure and never by the pictures drawn, so it reads our own
 * result as it reads Logitech's. The idle device list and the activity menu are idle; every other mode the
 * structural readers call a device's or a device list is device mode; and the modes the working screen
 * record enters, one per activity (`activityKeyedRecords`), are activity screens, and so is any other mode
 * queuing their battery program. On the 7.5 file those are the same five modes that draw Logitech's working
 * backgrounds.
 */
export function screenStates(c: Container, layout: ContainerLayout): Map<number, ScreenState> {
  if (c.architecture !== 14 || !HARMONY_650_SKINS.has(layout.skin)) {
    throw new BackgroundError('the backgrounds are built and checked for the Harmony 650 alone');
  }
  const special = screenRecordModes(c, layout);
  const roles = modeRoles(c);
  const records = modeRecords(c) ?? [];
  const working = workingModes(c);
  const states = new Map<number, ScreenState>();
  records.forEach((_record, mode) => {
    if (mode === special.off) return;
    if (mode === special['idle device list'] || mode === special['activity menu']) {
      states.set(mode, 'idle');
      return;
    }
    if (roles[mode] === 'device' || roles[mode] === 'device-list') {
      states.set(mode, 'device');
      return;
    }
    if (working.has(mode)) states.set(mode, 'activity');
  });
  // An activity's further screens, such as its favourite channels page whose corner item "Commands" leads to
  // the working screen, are entered from it rather than by the record. They queue the working screens'
  // battery program, which on the 13 compiles only an activity's screens and the activity menu queue, and
  // the activity menu is idle above, before this pass: the device screens queue their own and every other
  // screen the plain one. Five modes over the 13, all favourite channel pages.
  const activityBatteries = new Set([...working].flatMap((mode) => batteryOperands(c, mode)));
  records.forEach((_record, mode) => {
    if (states.has(mode) || mode === special.off) return;
    if (batteryOperands(c, mode).some((index) => activityBatteries.has(index))) states.set(mode, 'activity');
  });
  for (const mode of working) {
    if (records[mode] === undefined) throw new BackgroundError(`the working screen record enters mode ${mode}, which does not exist`);
  }
  return states;
}

/**
 * The modes the working screen record enters: each of its cases queues one `0x7E` naming the activity's
 * working mode, but the idle case, which queues a further record (section 336).
 */
function workingModes(c: Container): Set<number> {
  const { working } = activityKeyedRecords(c);
  const map = valueMaps(c)?.[working];
  if (map === undefined) throw new BackgroundError('the working screen record is missing');
  const out = new Set<number>();
  for (const [, target] of map.entries) {
    const [first] = screenProgram(c, target) ?? [];
    if (first?.opcode !== SCREEN_QUEUE_INSTRUCTION || first.operands.length !== 3) {
      throw new BackgroundError('a working screen case does not queue one instruction');
    }
    if (first.operands[2] === OP_ENTER_MODE) out.add((first.operands[0] as number) | ((first.operands[1] as number) << 8));
  }
  return out;
}

/** What `withStateBackgrounds` did, for a caller to report and a test to assert. */
export interface StateBackgrounds {
  layout: ContainerLayout;
  /** Per state, the modes given its background. */
  modes: Record<ScreenState, number[]>;
  /** The base slot 11 entry of the idle battery program appended here. */
  idleBattery: number;
  /** Designed backgrounds dropped from the bank, by name. */
  dropped: string[];
}

/**
 * The layout with every screen of a state drawn over that state's colour, its battery corner patched in the
 * same colour, and the designed backgrounds gone. `layout` is a `takeApart` of a Harmony 650 configuration
 * and is left as it was.
 */
export function withStateBackgrounds(layout: ContainerLayout, colours: BackgroundColours = DEFAULT_BACKGROUND_COLOURS): StateBackgrounds {
  for (const state of SCREEN_STATES) rgbCheck(colours[state], state);
  const backgrounds = Object.fromEntries(SCREEN_STATES.map((state) =>
    [state, { bytes: flat(BACKGROUND_SIZE, BACKGROUND_SIZE, colours[state]), refs: [] } as ContainerPiece])) as Record<ScreenState, ContainerPiece>;
  const patches = Object.fromEntries(SCREEN_STATES.map((state) =>
    [state, { bytes: flat(PATCH_WIDTH, PATCH_HEIGHT, colours[state]), refs: [] } as ContainerPiece])) as Record<ScreenState, ContainerPiece>;

  // 1. The idle battery program: the activity menu's, its switch and its patch case copied, the patch the
  // idle one, appended to base slot 11's table. The icon case and the shared tail are named, not copied.
  let step = fresh(layout);
  step.pictures = [...step.pictures, ...SCREEN_STATES.map((state) => backgrounds[state]), ...SCREEN_STATES.map((state) => patches[state])];
  let { c, at } = fieldLocator(step);
  const special = screenRecordModes(c, step);
  const [menuBattery] = batteryOperands(c, special['activity menu']);
  const slot = archSlot(14, SCREEN_TABLE_SLOT);
  const tableAt = c.pointerArrayAt(slot);
  const table = tableAt?.values;
  if (menuBattery === undefined || table?.[menuBattery] === undefined || tableAt?.width !== 2) {
    throw new BackgroundError('the activity menu queues no battery program this reads');
  }
  const root = at(table[menuBattery] - c.flashBase);
  if (root.at !== 0) throw new BackgroundError('the battery program does not start a piece');
  const patchFields = pictureFields(c, [table[menuBattery]]).filter((one) => one.name !== undefined && STATE_PATCHES.has(one.name));
  if (patchFields.length !== 1) throw new BackgroundError(`the activity menu's battery program draws ${patchFields.length} state patches`);
  const patchCase = at((patchFields[0] as { field: number }).field);
  if (patchCase.piece === root.piece) throw new BackgroundError('the battery program draws its patch in its own first piece');
  const caseCopy: ContainerPiece = {
    bytes: Uint8Array.from(patchCase.piece.bytes),
    refs: patchCase.piece.refs.map((ref) => (ref.at === patchCase.at ? { at: ref.at, to: patches.idle, offset: 0 } : { ...ref })),
  };
  const switchCopy: ContainerPiece = {
    bytes: Uint8Array.from(root.piece.bytes),
    refs: root.piece.refs.map((ref) => ('to' in ref && ref.to === patchCase.piece ? { ...ref, to: caseCopy } : { ...ref })),
  };
  if (!switchCopy.refs.some((ref) => 'to' in ref && ref.to === caseCopy)) throw new BackgroundError('the battery switch does not name its patch case');
  const tablePiece = step.sections[slot]?.head[0];
  if (tablePiece === undefined) throw new BackgroundError('base slot 11 has no table');
  const idleBattery = table.length;
  if (idleBattery >= 0xffff) throw new BackgroundError('base slot 11 is full');
  const grown = new Uint8Array(tablePiece.bytes.length + 3);
  grown.set(tablePiece.bytes);
  grown[0] = (idleBattery + 1) & 0xff;
  grown[1] = (idleBattery + 1) >> 8;
  tablePiece.bytes = grown;
  tablePiece.refs.push({ at: 2 + 3 * idleBattery, to: switchCopy, offset: 0 });
  step.body = [...step.body, switchCopy, caseCopy];

  // 2. The two idle screens rebuilt naming the idle program and the idle background.
  ({ c } = fieldLocator(step));
  const records = describeScreenRecords(c, step);
  for (const menu of [records.spec.idle, records.spec.menu]) {
    menu.battery = idleBattery;
    if (menu.pictures.one !== undefined) menu.pictures.one = { to: backgrounds.idle, offset: 0 };
    if (menu.pictures.several !== undefined) menu.pictures.several = { to: backgrounds.idle, offset: 0 };
  }
  const firstNew = step.pictures.length - 2 * SCREEN_STATES.length;
  const bankLength = step.pictures.length;
  step = withScreenRecords(step, buildScreenRecords(records.spec, c), records.place);
  // `withScreenRecords` hands back fresh pieces, so the new pictures are found again by their place in the
  // bank, which it keeps.
  if (step.pictures.length !== bankLength) throw new BackgroundError('rebuilding the idle screens changed the picture bank');
  SCREEN_STATES.forEach((state, k) => {
    backgrounds[state] = step.pictures[firstNew + k] as ContainerPiece;
    patches[state] = step.pictures[firstNew + SCREEN_STATES.length + k] as ContainerPiece;
  });

  // 3. Every other screen of a state over its colour, and the two shared battery programs' patches. The
  // layout is this function's own since step 1, so its pieces are changed in place, and the new pictures
  // keep their identity for the references made below.
  ({ c, at } = fieldLocator(step));
  const states = screenStates(c, step);
  const records2 = modeRecords(c) ?? [];
  const given = new Map<ContainerPiece, Map<number, ScreenState>>();
  const give = (field: number, state: ScreenState, what: string): void => {
    const where = at(field);
    const byAt = given.get(where.piece) ?? new Map<number, ScreenState>();
    const before = byAt.get(where.at);
    if (before !== undefined && before !== state) throw new BackgroundError(`${what} is shared by a ${before} and a ${state} screen`);
    byAt.set(where.at, state);
    given.set(where.piece, byAt);
  };
  const modes: Record<ScreenState, number[]> = { device: [], activity: [], idle: [] };
  const batteries = new Map<number, ScreenState>();
  for (const [mode, state] of states) {
    modes[state].push(mode);
    for (const one of pictureFields(c, (records2[mode]?.pages ?? []).map((page) => page.program))) {
      if (one.name !== undefined && DESIGNED_BACKGROUNDS.includes(one.name)) give(one.field, state, `mode ${mode}'s background`);
    }
    for (const index of batteryOperands(c, mode)) {
      const before = batteries.get(index);
      if (before !== undefined && before !== state) throw new BackgroundError(`battery program ${index} serves a ${before} and a ${state} screen`);
      batteries.set(index, state);
    }
  }
  const table2 = c.pointerArray(slot) ?? [];
  for (const [index, state] of batteries) {
    for (const one of pictureFields(c, [table2[index] as number])) {
      if (one.name !== undefined && STATE_PATCHES.has(one.name)) give(one.field, state, `battery program ${index}'s patch`);
    }
  }
  for (const [piece, byAt] of given) {
    for (const [offset, state] of byAt) {
      const ref = refAt(piece, offset);
      ref.to = DESIGNED_BACKGROUNDS.includes(pictureNameOfPiece(ref.to) ?? '') ? backgrounds[state] : patches[state];
      ref.offset = 0;
    }
  }

  // 4. What no screen draws any more leaves the bank: the designed backgrounds, the old patches, and any of
  // the new pictures no state used.
  const named = new Set<ContainerPiece>();
  for (const piece of piecesOf(step)) for (const ref of piece.refs) if ('to' in ref) named.add(ref.to);
  const dropped: string[] = [];
  const ours = new Set([...Object.values(backgrounds), ...Object.values(patches)]);
  step.pictures = step.pictures.filter((piece) => {
    if (named.has(piece)) return true;
    const name = pictureNameOfPiece(piece);
    if (ours.has(piece)) return false;
    if (name !== undefined && (DESIGNED_BACKGROUNDS.includes(name) || STATE_PATCHES.has(name))) {
      dropped.push(name);
      return false;
    }
    return true;
  });
  return { layout: step, modes, idleBattery, dropped };
}

function rgbCheck(colour: number, state: ScreenState): void {
  if (!Number.isInteger(colour) || colour < 0 || colour > 0xffff) throw new BackgroundError(`the ${state} colour ${colour} is not RGB565`);
}

/** The `HARMONY_650_PICTURES` name of a picture piece's bytes. */
function pictureNameOfPiece(piece: ContainerPiece): string | undefined {
  return nameByKey.get(contentKey(piece.bytes));
}

/** What `checkStateBackgrounds` found. */
export interface StateBackgroundsChecked {
  modes: Record<ScreenState, number>;
  /** Picture drawing instructions checked, backgrounds and patches together. */
  pictures: number;
}

/**
 * Read a configuration back and check it the way a person would look at it: every page of a mode with a
 * state draws exactly one whole screen background besides the bottom bar and it is that state's colour
 * throughout, the battery program its key map queues patches the corner in the same colour, and every
 * program its pages queue is one its key map names. The colours are read from pixels, not from pieces.
 * **Which modes are checked is not independent of the builder**: both take it from `screenStates`, whose
 * second pass reads an activity's further screens off their battery program, so a favourite channels page
 * moved to the device program would leave the check unseen. The 13 device modes with no battery program,
 * the two row device list of each compile, have no corner to check.
 */
export function checkStateBackgrounds(c: Container, layout: ContainerLayout,
  colours: BackgroundColours = DEFAULT_BACKGROUND_COLOURS): StateBackgroundsChecked {
  const states = screenStates(c, layout);
  const records = modeRecords(c) ?? [];
  const table = c.pointerArray(archSlot(14, SCREEN_TABLE_SLOT)) ?? [];
  const counts: Record<ScreenState, number> = { device: 0, activity: 0, idle: 0 };
  let pictures = 0;
  const flatIn = (address: number, colour: number, width: number, height: number): boolean => {
    const b = bitmapAt(c, address);
    const off = c.blobOffsetOf(address);
    if (b === undefined || b.length === undefined || off === undefined) return false;
    const expected = flat(width, height, colour);
    const bytes = c.blob.subarray(off, off + b.length);
    return bytes.length === expected.length && bytes.every((value, k) => value === expected[k]);
  };
  for (const [mode, state] of states) {
    counts[state] += 1;
    const record = records[mode];
    // Exactly one whole screen picture per page besides the bottom bar, and it is the state's colour: on
    // the 13 compiles every page of a mode with a state draws exactly one designed background, 934 pages.
    // A page drawing the plain background, or none, or two, is refused, which counting only unnamed
    // pictures did not do.
    record?.pages.forEach((page, k) => {
      let backgrounds = 0;
      for (const program of reachablePrograms(c, [page.program]).values()) {
        for (const instruction of program) {
          const address = pictureReference(instruction);
          if (address === undefined) continue;
          const b = bitmapAt(c, address);
          if (b?.stride !== BACKGROUND_SIZE || b.rows !== BACKGROUND_SIZE || pictureName(c, address) === 'bottom bar') continue;
          if (!flatIn(address, colours[state], BACKGROUND_SIZE, BACKGROUND_SIZE)) {
            const name = pictureName(c, address);
            throw new BackgroundError(`mode ${mode}, a ${state} screen, draws ${name === undefined ? 'a background that is not its colour' : name} on page ${k}`);
          }
          backgrounds += 1;
        }
      }
      if (backgrounds !== 1) throw new BackgroundError(`mode ${mode}, a ${state} screen, draws ${backgrounds} backgrounds on page ${k}`);
      pictures += 1;
    });
    // A page's own program queues the battery program again, which the record's rebuild has to have
    // changed as well: every program a page queues has to be one its mode's key map names.
    const named = new Set(batteryOperands(c, mode));
    for (const page of record?.pages ?? []) {
      for (const program of reachablePrograms(c, [page.program]).values()) {
        for (const instruction of program) {
          if (instruction.opcode !== SCREEN_QUEUE_INSTRUCTION || instruction.operands[2] !== RUN_SCREEN_PROGRAM) continue;
          const index = (instruction.operands[0] as number) | ((instruction.operands[1] as number) << 8);
          if (!named.has(index)) throw new BackgroundError(`mode ${mode}, a ${state} screen, has a page queuing program ${index}, which its key map does not name`);
        }
      }
    }
    for (const index of batteryOperands(c, mode)) {
      const address = table[index];
      if (address === undefined) throw new BackgroundError(`mode ${mode} queues base slot 11 entry ${index}, which does not exist`);
      let patched = 0;
      for (const program of reachablePrograms(c, [address]).values()) {
        for (const instruction of program) {
          const picture = pictureReference(instruction);
          const b = picture === undefined ? undefined : bitmapAt(c, picture);
          if (picture === undefined || b?.stride !== PATCH_WIDTH || b.rows !== PATCH_HEIGHT || pictureName(c, picture) === 'corner mark') continue;
          if (!flatIn(picture, colours[state], PATCH_WIDTH, PATCH_HEIGHT)) {
            throw new BackgroundError(`mode ${mode}, a ${state} screen, patches its battery corner in another colour`);
          }
          patched += 1;
          pictures += 1;
        }
      }
      if (patched !== 1) throw new BackgroundError(`mode ${mode}'s battery program draws ${patched} patches`);
    }
  }
  for (const name of DESIGNED_BACKGROUNDS) {
    const key = HARMONY_650_PICTURES.find((entry) => entry.name === name)?.key;
    for (const piece of layout.pictures) if (contentKey(piece.bytes) === key) throw new BackgroundError(`the bank still holds ${name}`);
  }
  return { modes: counts, pictures };
}
