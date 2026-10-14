/**
 * The Harmony 650 built from nothing: `todo-compile-650.md` 11.1.1, plan 008.
 *
 * Every other route to a configuration starts from a Logitech compile and overwrites parts of it. This one
 * starts from no file at all: it numbers every table entry itself, asks each generator for fresh pieces on
 * those numbers, and hands the pieces to the linker, `placePieces` and `layOutContainer`. Nothing it emits
 * is read off a compile; what it knows about the remote it knows from the generators' own descriptions,
 * whose facts were measured on Logitech's compiles and are stated in those modules.
 *
 * **Only our own look can be built this way**, our letters, and later the state colours and our pictures,
 * since Logitech's letters and designed backgrounds are their artwork and exist only in a compile.
 *
 * **The font table is described here rather than measured.** A donor's sets are lettered by measuring
 * which of Logitech's faces each one is, `withOxaniumFonts`; with no donor there is nothing to measure,
 * so the sets are stated: one per face and colouring a screen of ours draws in, in `EMPTY_FONT_SETS`'
 * order, and every printable ASCII character takes the code of its place in `LETTERING_CHARACTERS`
 * plus one, the same in every set. The order of the sets is the order the faces first appear in on
 * Logitech's two device compile, `harvest_650_two_devices`, which is what a reader that takes "the
 * first set of this height" has always been run against: the plain bold 14 before the shadowed one,
 * the regular 15 before the bold one. The regular 13, which only Help draws, is left out with Help.
 *
 * Arch 14 only, the Harmony 650. Read only towards hardware: the result is bytes in memory.
 */
import type { Container } from '../../gspm.ts';
import { CLOCK_FIELD_COUNT, clockRecordFields } from '../../gspm.ts';
import type { ContainerPiece, PieceRef } from '../../frame.ts';
import { layOutContainer } from '../../frame.ts';
import { placePieces } from '../../placer.ts';
import { encodeGlyph } from '../../font.ts';
import { CLOCK_STATE_MAXIMA } from '../../sections.ts';
import {
  FIRMWARE_STATE_VARIABLE_COUNT, activityStateVariables, buildStateTables, menuMarkerVariable, startSequenceVariables,
  type BuiltStateTables, type PieceTarget, type StateTablesSpec, type StateVariableSpec, type ValueMapSpec,
  hourListBytes,
} from '../../statetables.ts';
import {
  ACTIVITY_KEY_SCANS, FIRMWARE_SCREENS, FIXED_ENTRIES, buildWiring, wiringFrontIndex, wiringNeeds, type BuiltWiring, type WiringSettings,
  type WiringSpec,
} from '../../wiring.ts';
import {
  SCREEN_DRAW_IMAGE, SCREEN_END, SCREEN_JUMP, SCREEN_QUEUE_INSTRUCTION, SCREEN_SELECT_FONT, SCREEN_SWITCH_NARROW,
  SCREEN_TEXT_INLINE,
} from '../../screen.ts';
import { modeZeroKeyList } from '../../modezero.ts';
import { type SetFace, letterFaceOf } from '../../fonttable.ts';
import {
  LETTERING_CHARACTERS, OXANIUM_FACE_SPECS, defaultWeight, letterRows, type LetterInks, type Lettering,
  type OxaniumFaceName, type OxaniumWeight,
} from '../../lettering.ts';
import { type BlendedSet, checkBlendedLetters, withBlendedLetters } from '../../blending.ts';
import { barBytes, stateBackgroundBytes, statePatchBytes } from '../../backgrounds.ts';
import { buildOurPictures, buildPictures, type OurPictureChoices, type OurPictureName } from '../../pictures.ts';
import { ENTER_MODE, MAP_VALUE_OPCODE } from '../../inventory.ts';
import { STATE_WRITE_BASE } from '../../actions.ts';
import { SENDING_FLAG_VARIABLE } from './chrome.ts';
import { caseProgram as caseProgramBytes } from '../../shared/menus.ts';
import { type BuiltFirmwareScreens, buildFirmwareScreens, firmwareScreenTemplates } from '../../firmwarescreens.ts';
import {
  type BuiltScreen, type BuiltScreenRecords, type ScreenMenuSpec, buildScreenRecords,
} from '../../screenrecords.ts';


/** A refusal, named so a caller can tell a request this does not build from a bug. */
export class EmptyConfigurationError extends Error {}

/** The font sets an empty configuration of ours carries, in table order: a face and how it is lettered. */
export const EMPTY_FONT_SETS: readonly { face: OxaniumFaceName; lettering: Lettering }[] = [
  { face: 'R15', lettering: 'shadowed' },
  { face: 'F14', lettering: 'plain' },
  { face: 'R14', lettering: 'shadowed' },
  { face: 'F15', lettering: 'shadowed' },
  { face: 'F10', lettering: 'shadowed' },
  { face: 'F14W', lettering: 'shadowed' },
  { face: 'F13', lettering: 'shadowed' },
  { face: 'F11', lettering: 'shadowed' },
  { face: 'F14', lettering: 'shadowed' },
];

/** The code a character takes in a configuration of ours: its place among the printable characters, from 1. */
export function emptyCodeOf(ch: string): number {
  const k = LETTERING_CHARACTERS.indexOf(ch);
  if (k < 0) throw new EmptyConfigurationError(`'${ch}' is not a character our letters draw`);
  return k + 1;
}

/** A font set's header, `fontSetHeader`'s form with the first code at +1 and the count at +2. */
const FONT_SET_HEADER = 3;
/** Every table here names its entries in three byte addresses. */
const POINTER = 3;

/** Our font table, built from `EMPTY_FONT_SETS`: the table, the sets and the glyphs, each shared glyph once. */
export interface EmptyFontTable {
  table: ContainerPiece;
  sets: ContainerPiece[];
  glyphs: ContainerPiece[];
  /** Per set, in table order, the face it is lettered in, as `withOxaniumFonts` reports a donor's. */
  faces: SetFace[];
}

export function emptyFontTable(
  inks: LetterInks, weights: Readonly<Partial<Record<OxaniumFaceName, OxaniumWeight>>> = {},
): EmptyFontTable {
  const glyphPieces = new Map<string, ContainerPiece>();
  const faces = EMPTY_FONT_SETS.map(({ face, lettering }): SetFace => ({
    height: OXANIUM_FACE_SPECS[face].cell,
    shadow: lettering === 'shadowed' ? inks.shadow : undefined,
    ink: inks[lettering],
    // The two measurements `measureSet` tells Logitech's faces apart by, stated for ours: a label face's
    // stroke is two pixels and a regular face's one. Nothing reads a capital's top on a set we letter.
    stroke: face.startsWith('R') ? 1 : 2,
    capitalTop: undefined,
    face,
    lettering,
    inks,
    weight: weights[face] ?? defaultWeight(face),
  }));
  const count = LETTERING_CHARACTERS.length;
  const sets = faces.map((one): ContainerPiece => {
    const bytes = new Uint8Array(FONT_SET_HEADER + POINTER * count);
    bytes[0] = one.height;
    bytes[1] = 1;
    bytes[2] = count;
    const refs: PieceRef[] = LETTERING_CHARACTERS.map((ch, k) => {
      const key = `${one.face} ${one.weight} ${one.lettering} ${ch}`;
      let glyph = glyphPieces.get(key);
      if (glyph === undefined) {
        const rows = letterRows(letterFaceOf(one), ch, one.lettering, inks);
        glyph = { bytes: encodeGlyph(rows[0]!.length, rows), refs: [], owner: 'slot-7-glyph' };
        glyphPieces.set(key, glyph);
      }
      return { at: FONT_SET_HEADER + POINTER * k, to: glyph, offset: 0 };
    });
    return { bytes, refs, owner: 'slot-7-set' };
  });
  return { table: countedTable(2, sets, 'slot-7-table'), sets, glyphs: [...glyphPieces.values()], faces };
}

/**
 * A table of a count and three byte addresses, the shape of base slots 5, 7, 9, 10, 11, 12, 14 and 15,
 * whose count is one or two bytes, and of base slot 6, whose count is three. Each entry names its piece's
 * start, or `offsets[k]` bytes into it.
 */
export function countedTable(
  countWidth: number, targets: readonly ContainerPiece[], owner: string, offsets: readonly number[] = [],
): ContainerPiece {
  const bytes = new Uint8Array(countWidth + POINTER * targets.length);
  for (let k = 0; k < countWidth; k += 1) bytes[k] = (targets.length >> (8 * k)) & 0xff;
  if (targets.length >= 1 << (8 * countWidth)) throw new EmptyConfigurationError(`${targets.length} entries do not fit a ${countWidth} byte count`);
  return {
    bytes, owner,
    refs: targets.map((to, k): PieceRef => ({ at: countWidth + POINTER * k, to, offset: offsets[k] ?? 0 })),
  };
}

/** The seven clock records stamped from the moment of building: each field its `first`, the year's maximum one above it. */
export function clockSpec(builtAt: string): StateTablesSpec['clock'] {
  const fields = clockRecordFields(builtAt);
  if (fields === undefined) throw new EmptyConfigurationError(`${builtAt} is not a time base slot 3 can hold`);
  return Array.from({ length: CLOCK_FIELD_COUNT }, (_, k) => ({
    first: fields[k]!, max: CLOCK_STATE_MAXIMA[k] ?? fields[k]! + 1,
  }));
}

/**
 * The models an empty configuration is built for, by skin: the Harmony 650's two, and since
 * `todo-compile-700.md` the Harmony 700's 66. Its EMEA twin 69 has no compile or unit here and stays out.
 */
export type EmptyModel = 'harmony-650' | 'harmony-700';
const EMPTY_MODELS: ReadonlyMap<number, EmptyModel> = new Map([[72, 'harmony-650'], [74, 'harmony-650'], [66, 'harmony-700']]);

/** The model an empty configuration of `skin` is built for, refused where none is. */
export function emptyModelOf(skin: number): EmptyModel {
  const model = EMPTY_MODELS.get(skin);
  if (model === undefined) throw new EmptyConfigurationError(`an empty configuration is built for the Harmony 650 and 700, not skin ${skin}`);
  return model;
}

/**
 * Mode 0's own key list, the key table: on the Harmony 600 and 650 the "add an Activity" placeholder's, and
 * on the Harmony 700 a charging frame's, whose leading entry sets the low battery flag, section 357.
 */
function emptyModeZeroKeys(model: EmptyModel): Uint8Array {
  return model === 'harmony-700' ? modeZeroKeyList(model, { variable: emptyVariable('lowBattery') }) : modeZeroKeyList(model);
}

export interface EmptyOptions {
  skin: number;
  builtAt: string;
  inks: LetterInks;
  weights?: Readonly<Partial<Record<OxaniumFaceName, OxaniumWeight>>>;
}

export interface EmptyBuilt {
  bytes: Uint8Array;
  container: Container;
  faces: SetFace[];
}

/**
 * The skeleton, plan 008's first step: our font table, every section table, the clock and mode 0's key
 * list, laid out. It holds no screen yet, so nothing in it can be shown on a remote.
 */
export function buildEmptySkeleton(options: EmptyOptions): EmptyBuilt {
  return layOutSkeleton(options, []);
}

/** The skeleton with `programs` as base slot 11's entries, which `spellingContainer` uses to draw a probe. */
function layOutSkeleton(options: EmptyOptions, programs: ContainerPiece[]): EmptyBuilt {
  const model = emptyModelOf(options.skin);
  const fonts = emptyFontTable(options.inks, options.weights);
  const states = buildStateTables({ clock: clockSpec(options.builtAt), hourList: 0, variables: [], valueMaps: [] });
  const empty = (owner: string, length: number): ContainerPiece => ({ bytes: new Uint8Array(length), refs: [], owner });
  const tables: (ContainerPiece | undefined)[] = new Array(20).fill(undefined);
  tables[0] = states.nameTree;
  tables[2] = empty('slot-2-log', 8);
  tables[4] = empty('slot-4-event', 1);
  tables[5] = countedTable(1, [], 'slot-5-table');
  tables[6] = countedTable(3, [], 'slot-6-table');
  tables[7] = fonts.table;
  tables[8] = empty('slot-8-list', 1);
  tables[9] = countedTable(1, [], 'slot-9-table');
  tables[10] = countedTable(2, [], 'slot-10-table');
  tables[11] = countedTable(2, programs, 'slot-11-table');
  tables[12] = countedTable(1, [], 'slot-12-table');
  tables[13] = states.stateTable;
  tables[14] = states.valueMapTable;
  tables[15] = countedTable(1, [], 'slot-15-table');
  tables[16] = empty('slot-16-table', 1);
  tables[17] = empty('slot-17-table', 2);
  const keyTable: ContainerPiece = { bytes: emptyModeZeroKeys(model), refs: [], owner: 'key-table' };
  const placed = placePieces({
    architecture: 14, skin: options.skin, builtAt: options.builtAt, keyTable,
    body: [...programs, ...states.records, ...states.valueMaps],
    tables,
    loose: [...fonts.glyphs, ...fonts.sets],
  });
  const laid = layOutContainer(placed.layout);
  return { bytes: laid.bytes, container: laid.container, faces: fonts.faces };
}

// ---------------------------------------------------------------------------------------------------
// Plan 008 step 2: the wiring and the state tables on our own numbers.
// ---------------------------------------------------------------------------------------------------

/**
 * The modes of an empty configuration: the model's firmware screens first, `FIRMWARE_SCREENS`, which the
 * wiring enters by their place, then the three screens every configuration holds. No status screens, no
 * tour and no Help, plan 008.
 */
export function emptyModes(model: EmptyModel): { idleList: number; activityMenu: number; off: number } {
  const firmware = FIRMWARE_SCREENS[model].length;
  return { idleList: firmware, activityMenu: firmware + 1, off: firmware + 2 };
}

/** The Harmony 650's, `emptyModes`. */
export const EMPTY_MODES = emptyModes('harmony-650');

/**
 * The variables an empty configuration holds after the firmware's own, in index order, by the names the
 * wiring and the screens use: the two every activity reads, `activityStateVariables`, the start sequence's
 * two, `startSequenceVariables`, the menu marker, and the three the firmware's screens and the tour's start
 * list write, each with the range it has on every Harmony 650 compile, `harvest_650_two_devices` read.
 */
export const EMPTY_VARIABLES: readonly (readonly [string, StateVariableSpec])[] = [
  ['activity', activityStateVariables(0)[0]!],
  ['location', activityStateVariables(0)[1]!],
  ['start', startSequenceVariables()[0]!],
  ['flag', startSequenceVariables()[1]!],
  ['menuMarker', menuMarkerVariable()],
  ['lowBattery', { first: 0, max: 1 }],
  ['tourMark', { first: 0, max: 1 }],
  ['usb', { first: 0, max: 3 }],
];

/**
 * The Harmony 700's one more, after the rest so every other keeps its index: the Remote Assistant's mark the
 * leave handler of "USB Connected" tests before it restores the running activity's keys, 0 to 1 on all seven
 * of Logitech's 700 compiles read, `wiring.ts`' `usbLeave.second`.
 */
const SEVEN_HUNDRED_VARIABLES: readonly (readonly [string, StateVariableSpec])[] = [['assistantSeen', { first: 0, max: 1 }]];

/** The variables an empty configuration of `model` holds after the firmware's, in index order. */
export function emptyVariables(model: EmptyModel): readonly (readonly [string, StateVariableSpec])[] {
  return model === 'harmony-700' ? [...EMPTY_VARIABLES, ...SEVEN_HUNDRED_VARIABLES] : EMPTY_VARIABLES;
}

/** The variable a name in `emptyVariables` takes: all are one byte, so after the firmware's in that order. */
export function emptyVariable(name: string): number {
  const k = emptyVariables('harmony-700').findIndex(([one]) => one === name);
  if (k < 0) throw new EmptyConfigurationError(`an empty configuration names no variable ${name}`);
  return FIRMWARE_STATE_VARIABLE_COUNT + k;
}

/**
 * The value maps of an empty configuration, by name, in index order: the wiring's three, then the three the
 * two menus' keys go through, each the one Logitech's compiles with an activity hold, `h650_start_config`
 * read, cut down to the idle case:
 *
 * * `backMap`, on the location: what the key under the display's centre on the device list and scan 4 on
 *   the activity menu map through, section 352's record back to the running activity. Its case queues the
 *   working screen record;
 * * `workingMap`, on the activity counter: the working screen record, whose case per activity enters that
 *   activity's working screen and whose idle case queues `locationMap`, section 336, which enters the
 *   activity menu. With no activity only the idle case is left;
 * * `devicesMap`, on the activity counter: the key under Devices' record on the activity menu, whose idle
 *   case enters the idle device list, section 330.
 *
 * So with nothing running Back on the device list opens the activity menu and Devices on the activity menu
 * opens the device list, which is what a compile with activities does when none runs and what Logitech's
 * compile with no activity does, `harvest_650_two_devices`, section 374. There the activity menu's scan 4
 * shows the "add Activities" placeholder; ours maps it through `backMap`, as every compile with activities
 * does, so the menu's reader and the first composed activity meet one form.
 */
export const EMPTY_MAPS = ['idleEnterMap', 'idleMap', 'locationMap', 'backMap', 'workingMap', 'devicesMap'] as const;
/**
 * The Harmony 700's one more, after the rest: `usbLeaveMap`, on the location, which the leave handler of
 * "USB Connected" maps through, `wiring.ts`' `usbLeave.second`. On Logitech's 700 compiles its one case
 * maps the activity counter through the record that selects the running activity's handler set, so the
 * keys come back to that activity's; with no activity there is no set to select, so it has no case, as
 * `idleMap` has none.
 */
const SEVEN_HUNDRED_MAPS = ['usbLeaveMap'] as const;
export type EmptyMapName = (typeof EMPTY_MAPS)[number] | (typeof SEVEN_HUNDRED_MAPS)[number];

/** The value maps an empty configuration of `model` holds, in index order. */
export function emptyMaps(model: EmptyModel): readonly EmptyMapName[] {
  return model === 'harmony-700' ? [...EMPTY_MAPS, ...SEVEN_HUNDRED_MAPS] : EMPTY_MAPS;
}

/** A `0x72` operand: the map in the high byte, the variable it is read on in the low. */
function throughMap(map: EmptyMapName, variable: string): number {
  return (emptyMaps('harmony-700').indexOf(map) << 8) | emptyVariable(variable);
}

/**
 * A base slot 14 case's program as every compile writes one: queue one action, `0x11` and its operand and
 * opcode, then the end, five bytes, `shared/menus.ts`' `caseProgram`.
 */
function caseProgram(opcode: number, operand: number): ContainerPiece {
  return { bytes: caseProgramBytes(opcode, operand), refs: [], owner: 'slot-11-program' };
}

/** What the wiring and state tables of an empty configuration came to, numbered. */
export interface EmptyWiring {
  spec: WiringSpec;
  wiring: BuiltWiring;
  states: BuiltStateTables;
  /** Base slot 10 index to list: the wiring's, the clock's hour list among them. */
  lists: Map<number, ContainerPiece>;
  /** The base slot 11 programs the value maps' cases queue, in table order. */
  programs: ContainerPiece[];
  hourList: number;
}

/**
 * The wiring with the family's settings, numbered from nothing: the front where the wiring puts it, the
 * clock's hour list right after it, `[0x1F 0xF203, 0x1F 0xF204]`, which increments the day and the weekday
 * (docs/config-format.md, the clock's transitions), then every list the wiring names in `wiringNeeds`'
 * order. No activity, so every activity key enters the "add an Activity" screen and the leftover entry is
 * the idle one. The value maps hold the idle cases only, `EMPTY_MAPS`, and the wiring's three:
 *
 * * `idleEnterMap`, on the location: the running activity set to the counter's idle value, the value it
 *   holds with nothing running, section 120;
 * * `idleMap`, on the location: no case. On a Logitech compile its case calls the list that switches every
 *   device off; with no device there is nothing to switch, and a map with no case is one the firmware
 *   already meets, `harvest_650_two_devices`' map 11. The device composer gives it its case;
 * * `locationMap`, on the location: the activity menu, which is where the Remote Assistant's gate leads
 *   on a compile that has one, `harvest_650_two_devices`' map 4.
 */
export function emptyWiring(settings: WiringSettings, builtAt: string, model: EmptyModel = 'harmony-650'): EmptyWiring {
  const activityKeys = Object.fromEntries(ACTIVITY_KEY_SCANS.map((scan) => [scan, null]));
  const needs = wiringNeeds(model, settings, activityKeys, 0);
  const modes = emptyModes(model);
  const maps = emptyMaps(model);
  const hourList = needs.frontLength;
  const listIndex = Object.fromEntries(needs.lists.map((name, k) => [name, hourList + 1 + k]));
  const modeIndex: Record<string, number> = { off: modes.off };
  const variableIndex = Object.fromEntries(needs.variables.map((name) => [name, emptyVariable(name)]));
  const mapIndex = Object.fromEntries(needs.maps.map((name) => {
    const k = (maps as readonly string[]).indexOf(name);
    if (k < 0) throw new EmptyConfigurationError(`the wiring names a value map ${name} an empty configuration does not hold`);
    return [name, k];
  }));
  for (const name of needs.modes) if (modeIndex[name] === undefined) throw new EmptyConfigurationError(`the wiring enters a mode ${name} an empty configuration does not hold`);
  if (needs.entries.some((name) => name !== 'idle')) throw new EmptyConfigurationError(`the wiring names entries ${needs.entries.join(', ')}`);
  const spec: WiringSpec = {
    model, settings, activityKeys, activityCount: 0, deviceTimers: [], statusScreens: false,
    lists: listIndex, modes: modeIndex, variables: variableIndex, maps: mapIndex, entries: { idle: FIXED_ENTRIES - 1 },
  };
  const wiring = buildWiring(spec);

  // The value maps' cases, each a program of its own.
  const idle = (EMPTY_VARIABLES.find(([name]) => name === 'activity')?.[1] as StateVariableSpec).first;
  const enterIdle = caseProgram(STATE_WRITE_BASE + emptyVariable('activity'), idle);
  const toMenu = caseProgram(ENTER_MODE, modes.activityMenu);
  const toWorking = caseProgram(MAP_VALUE_OPCODE, throughMap('workingMap', 'activity'));
  const toLocation = caseProgram(MAP_VALUE_OPCODE, throughMap('locationMap', 'location'));
  const toIdleList = caseProgram(ENTER_MODE, modes.idleList);
  const one = (value: number, to: ContainerPiece): ValueMapSpec => ({ cases: [{ value, target: { to, offset: 0 } }] });
  const cases: Record<EmptyMapName, ValueMapSpec> = {
    idleEnterMap: one(0, enterIdle),
    idleMap: { cases: [] },
    locationMap: one(0, toMenu),
    backMap: one(0, toWorking),
    workingMap: one(idle, toLocation),
    devicesMap: one(idle, toIdleList),
    usbLeaveMap: { cases: [] },
  };
  const variables = emptyVariables(model);
  const states = buildStateTables({
    clock: clockSpec(builtAt), hourList,
    variables: variables.map(([, variable]) => variable),
    valueMaps: maps.map((name) => cases[name]),
  });
  states.indexOf.forEach((index, k) => {
    if (index !== FIRMWARE_STATE_VARIABLE_COUNT + k) throw new EmptyConfigurationError(`variable ${variables[k]![0]} took ${index}`);
  });

  const lists = new Map(wiring.lists);
  lists.set(hourList, { bytes: hourListBytes(), refs: [], owner: 'slot-10-list' });
  return { spec, wiring, states, lists, programs: [enterIdle, toMenu, toWorking, toLocation, toIdleList], hourList };
}

// ---------------------------------------------------------------------------------------------------
// Plan 008 step 3: the screens, in our look.
// ---------------------------------------------------------------------------------------------------

/** The look an empty configuration is drawn in: the family's choices it needs. */
export interface EmptyLook {
  /** The idle state's colour, which the device list and the activity menu are drawn over. */
  idleColour: number;
  /** The two bars' one colour. */
  barColour: number;
  /** Our six pictures' icons and colours, `buildOurPictures`. */
  pictures: OurPictureChoices;
}

/** The pictures of an empty configuration, each a piece of the bank. */
export interface EmptyPictures {
  plain: ContainerPiece;
  topBar: ContainerPiece;
  bottomBar: ContainerPiece;
  idle: ContainerPiece;
  idlePatch: ContainerPiece;
  ours: Map<OurPictureName, ContainerPiece>;
}

/**
 * Every picture an empty configuration's screens draw: the plain background, Logitech's rule picture the
 * firmware screens are drawn over, the two bars in the bar colour, the idle state's background and corner
 * patch, and those of ours the model's screens draw, `emptyPictureNames`. Nothing else is in the bank, since the
 * placer refuses a picture nothing draws.
 */
export function emptyPictures(look: EmptyLook, model: EmptyModel = 'harmony-650'): EmptyPictures {
  const drawn = emptyPictureNames(model);
  const piece = (bytes: Uint8Array): ContainerPiece => ({ bytes, refs: [], owner: 'picture-bank' });
  const plain = buildPictures().get('plain background');
  if (plain === undefined) throw new EmptyConfigurationError('the plain background is no rule picture');
  return {
    plain: piece(plain),
    topBar: piece(barBytes('top bar', look.barColour)),
    bottomBar: piece(barBytes('bottom bar', look.barColour)),
    idle: piece(stateBackgroundBytes(look.idleColour)),
    idlePatch: piece(statePatchBytes(look.idleColour)),
    ours: new Map([...buildOurPictures(look.pictures)].filter(([name]) => drawn.has(name as OurPictureName))
      .map(([name, bytes]) => [name as OurPictureName, piece(bytes)])),
  };
}

function ourPicture(pictures: EmptyPictures, name: OurPictureName): ContainerPiece {
  const found = pictures.ours.get(name);
  if (found === undefined) throw new EmptyConfigurationError(`our picture ${name} was not built`);
  return found;
}

/**
 * Where a corner program draws the mark and the patch over it, the screen's bottom right corner. Logitech's
 * compiles draw them at 114, 112, level with the top of the bottom bar, 70 of 70 on 24 compiles, section 374.
 * Ours are three rows lower, so the mark's 10 rows are centred on the bar's 16, rows 112 to 127, as was asked
 * for at the bench after `todo-compile-650.md` 11.2.4. A program is read at either place, and a state's look
 * added to a configuration takes the place its existing corner program draws at, so patch and mark move together.
 */
export const CORNER_PLACES = { logitech: [114, 112], ours: [114, 115] } as const satisfies Record<string, readonly [number, number]>;
type CornerPlace = (typeof CORNER_PLACES)[keyof typeof CORNER_PLACES];
/** The corner program's tail, after its switch: queue `0x07 0xFFFA`, then the end. What `0xFFFA` does is not read. */
const CORNER_TAIL = [SCREEN_QUEUE_INSTRUCTION, 0xfa, 0xff, 0x07, SCREEN_END] as const;
/** The switch, `0x12`, on variable 17, one case and one range, each with its three byte target. */
const CORNER_SWITCH_LENGTH = 13;

/**
 * A corner program, the sending mark's: variable 17 is the sending flag, section 369, which section 317
 * had read as the battery, so the program draws the mark while the remote sends. Written as every Harmony
 * 600, 650 and 700 compile writes one, 70 of 70 on 24 compiles, section 374: a switch on variable 17 whose case 0 draws the state's patch over the corner
 * and whose range 1 to 3 draws the mark there, each case then jumping back to the tail. Three pieces in
 * the compiler's order, the switch with its tail, then the patch case, then the mark case; the first is
 * the base slot 11 entry.
 */
export function cornerProgram(patch: ContainerPiece, mark: ContainerPiece, place: CornerPlace = CORNER_PLACES.ours): ContainerPiece[] {
  const root: ContainerPiece = {
    bytes: Uint8Array.from([
      SCREEN_SWITCH_NARROW, SENDING_FLAG_VARIABLE, 1, 0, 0, 0, 0, 1, 1, 3, 0, 0, 0, ...CORNER_TAIL,
    ]),
    refs: [], owner: 'slot-11-program',
  };
  const draw = (picture: ContainerPiece): ContainerPiece => ({
    bytes: Uint8Array.from([SCREEN_DRAW_IMAGE, ...place, 0, 0, 0, SCREEN_JUMP, 0, 0, 0]),
    refs: [{ at: 3, to: picture, offset: 0 }, { at: 7, to: root, offset: CORNER_SWITCH_LENGTH }],
    owner: 'slot-11-program',
  });
  const patchCase = draw(patch);
  const markCase = draw(mark);
  root.refs = [{ at: 4, to: patchCase, offset: 0 }, { at: 10, to: markCase, offset: 0 }];
  return [root, patchCase, markCase];
}

/**
 * The corner program at base slot 11 address `root`, read against `cornerProgram`: its three pieces back to
 * back in the compiler's order, each byte for byte the built one but its address fields, the switch's two
 * cases naming the two pieces behind it and each case jumping back to the tail. Returns each piece's blob
 * offset and length, or undefined where any of that fails. One reading for the calibration, section 374,
 * and for `attributeBytes`, section 375. At either of `CORNER_PLACES`.
 */
export function cornerProgramAt(c: Container, root: number): { at: number; length: number }[] | undefined {
  for (const place of Object.values(CORNER_PLACES)) {
    const pieces = cornerProgramAtPlace(c, root, place);
    if (pieces !== undefined) return pieces;
  }
  return undefined;
}

/** Which of `CORNER_PLACES` the corner program at `root` draws at, or undefined where it is none. */
export function cornerPlaceAt(c: Container, root: number): CornerPlace | undefined {
  return Object.values(CORNER_PLACES).find((place) => cornerProgramAtPlace(c, root, place) !== undefined);
}

function cornerProgramAtPlace(c: Container, root: number, place: CornerPlace): { at: number; length: number }[] | undefined {
  const blank = (): ContainerPiece => ({ bytes: new Uint8Array(0), refs: [], owner: 'picture-bank' });
  const built = cornerProgram(blank(), blank(), place);
  const start = c.blobOffsetOf(root);
  if (start === undefined) return undefined;
  const u24 = (o: number): number => (c.blob[o] ?? 0) | ((c.blob[o + 1] ?? 0) << 8) | ((c.blob[o + 2] ?? 0) << 16);
  const out: { at: number; length: number }[] = [];
  let off = start;
  for (const piece of built) {
    const theirs = Uint8Array.from(c.blob.subarray(off, off + piece.bytes.length));
    for (const ref of piece.refs) theirs.fill(0, ref.at, ref.at + 3);
    if (theirs.length !== piece.bytes.length || theirs.some((value, k) => value !== piece.bytes[k])) return undefined;
    out.push({ at: off, length: piece.bytes.length });
    off += piece.bytes.length;
  }
  const [rootPiece, patchCase] = built as [ContainerPiece, ContainerPiece, ContainerPiece];
  const cases = [rootPiece.refs[0], rootPiece.refs[1]].map((ref) => c.blobOffsetOf(u24(start + (ref as PieceRef & { at: number }).at)));
  if (cases[0] !== out[1]?.at || cases[1] !== out[2]?.at) return undefined;
  const jump = patchCase.refs[1] as PieceRef & { at: number };
  if (out.slice(1).some((one) => u24(one.at + jump.at) - root !== CORNER_SWITCH_LENGTH)) return undefined;
  return out;
}

/** The index of a font set of ours by its face and lettering, `EMPTY_FONT_SETS`. */
export function emptyFont(face: OxaniumFaceName, lettering: Lettering): number {
  const k = EMPTY_FONT_SETS.findIndex((one) => one.face === face && one.lettering === lettering);
  if (k < 0) throw new EmptyConfigurationError(`an empty configuration holds no ${lettering} ${face}`);
  return k;
}

/**
 * The fonts our screens are drawn in, each the face Logitech's compiles draw that text in, measured on
 * `h650_start_config` and `harvest_650_two_devices`: the firmware screens' body text in the regular 15 and
 * their large text in the regular 14, the menus' titles and counters in the plain label 14 on the white bar,
 * and Off in the regular 14, the start up screens' face.
 */
export const EMPTY_SCREEN_FONTS = {
  body: emptyFont('R15', 'shadowed'),
  large: emptyFont('R14', 'shadowed'),
  menu: emptyFont('F14', 'plain'),
  off: emptyFont('R14', 'shadowed'),
} as const;

/**
 * Which picture each firmware screen draws, by `FIRMWARE_SCREENS` name, the rest the plain background: on the
 * Harmony 650 as on 2 of 2 of its compiles read, and on the Harmony 700 as on its compiles drawn for
 * `todo-compile-700.md` 1.2, which draw a filling battery on the four charging frames, the empty battery the
 * 650 draws on its battery blank screen on "Please charge your remote" instead, and a full battery on the
 * battery blank screen.
 */
const FIRMWARE_SCREEN_PICTURES: Readonly<Record<EmptyModel, Readonly<Record<string, OurPictureName>>>> = {
  'harmony-650': {
    usbConnected: 'USB Connected',
    lowBattery: 'Low Battery',
    batteryBlank: 'battery blank screen',
    upgradeBlank: 'upgrade and learn blank screens',
    learnBlank: 'upgrade and learn blank screens',
  },
  'harmony-700': {
    frame0: 'charging 1',
    frame1: 'charging 2',
    frame2: 'charging 3',
    frame3: 'charging 4',
    usbConnected: 'USB Connected',
    lowBattery: 'Low Battery',
    pleaseCharge: 'battery blank screen',
    batteryBlank: 'charged',
    upgradeBlank: 'upgrade and learn blank screens',
    learnBlank: 'upgrade and learn blank screens',
  },
};

/** The pictures of ours a model's empty configuration draws: its firmware screens', Off's and the corner mark. */
function emptyPictureNames(model: EmptyModel): Set<OurPictureName> {
  return new Set<OurPictureName>(['start up picture', 'corner mark', ...Object.values(FIRMWARE_SCREEN_PICTURES[model])]);
}

/**
 * A container to spell from: the skeleton with one program that draws every character of ours once. The
 * screen builders spell through `characterMap`, which resolves a configuration's codes from the texts it
 * draws, and an empty configuration draws none until its screens exist. The program is not part of the
 * result.
 */
function spellingContainer(options: EmptyOptions): Container {
  const codes = LETTERING_CHARACTERS.map(emptyCodeOf);
  const probe: ContainerPiece = {
    bytes: Uint8Array.from([SCREEN_SELECT_FONT, 0, SCREEN_TEXT_INLINE, 0, 0, ...codes, 0, SCREEN_END]),
    refs: [], owner: 'slot-11-program',
  };
  return layOutSkeleton(options, [probe]).container;
}

/**
 * The firmware screens with our pictures and fonts, and "USB Connected"'s lists numbered from `firstList`.
 * On the Harmony 700 the list that clears the USB variable is the first call of the wiring's `usbLeave`,
 * which the wiring names and leaves to these screens to write, so its index is the wiring's and the screens
 * number one list fewer, `USB_LISTS`.
 */
function emptyFirmwareScreens(
  spec: WiringSpec, pictures: EmptyPictures, firstList: number, spelling: Container,
): BuiltFirmwareScreens {
  const model = spec.model;
  if (model === 'harmony-600') throw new EmptyConfigurationError('an empty configuration is built for the Harmony 650 and 700, not the Harmony 600');
  const screens = firmwareScreenTemplates(model);
  const seven = model === 'harmony-700';
  const cleared = seven ? spec.lists['usbLeave.first'] : firstList;
  if (cleared === undefined) throw new EmptyConfigurationError('the wiring names no first call of the USB leave handler');
  const at = (k: number): number => firstList + (seven ? k - 1 : k);
  return buildFirmwareScreens({
    wiring: spec,
    fonts: { body: EMPTY_SCREEN_FONTS.body, large: EMPTY_SCREEN_FONTS.large },
    pictures: screens.map(({ name, template }) => {
      const ours = FIRMWARE_SCREEN_PICTURES[model][name];
      const background = { to: ours === undefined ? pictures.plain : ourPicture(pictures, ours), offset: 0 };
      return template.exit ? { background, bar: { to: pictures.bottomBar, offset: 0 } } : { background };
    }),
    usb: {
      variable: emptyVariable('usb'), key: seven ? firstList : at(0), cleared: seven ? cleared : at(1),
      steps: [at(2), at(3), at(4)], tests: [at(5), at(6), at(7)], advances: [at(8), at(9)],
    },
    order: screens.map((_, k) => k),
    homes: new Map(),
  }, spelling);
}

/**
 * How many lists "USB Connected" writes, `FirmwareUsbSpec`, on every model: on the Harmony 700 one of them
 * at the wiring's index for `usbLeave.first`, so it numbers nine of its own there.
 */
const USB_LISTS = 10;

/** The device list, the activity menu and Off, empty, over the idle colour, with our start up picture on Off. */
function emptyScreenRecords(
  model: EmptyModel, pictures: EmptyPictures, corner: number, homes: Map<string, PieceTarget>, spelling: Container,
  addActivities: number,
): BuiltScreenRecords {
  const modes = emptyModes(model);
  const idle = { to: pictures.idle, offset: 0 };
  const menu = (kind: ScreenMenuSpec['kind'], mode: number): ScreenMenuSpec => ({
    kind, mode, rows: [], slots: [],
    titleFont: EMPTY_SCREEN_FONTS.menu, counterFont: EMPTY_SCREEN_FONTS.menu,
    backKey: throughMap('backMap', 'location'),
    // More Activities on the empty activity menu shows "add Activities" as Logitech's compile with no
    // activity does, through the list base slot 9 entry 1 runs on it, section 383.
    ...(kind === 'activity menu' ? { devicesKey: throughMap('devicesMap', 'activity'), addActivities } : {}),
    corner: corner, marker: emptyVariable('menuMarker'),
    pictures: { one: idle, several: idle, topBar: { to: pictures.topBar, offset: 0 }, bottomBar: { to: pictures.bottomBar, offset: 0 } },
  });
  return buildScreenRecords({
    idle: menu('idle device list', modes.idleList),
    menu: menu('activity menu', modes.activityMenu),
    off: { mode: modes.off, font: EMPTY_SCREEN_FONTS.off, picture: { to: ourPicture(pictures, 'start up picture'), offset: 0 } },
    order: ['idle device list', 'activity menu', 'off'],
    homes,
  }, spelling);
}

/** The pieces of a table numbered from 0, refused where an index has nothing. */
function dense(what: string, byIndex: ReadonlyMap<number, ContainerPiece>): ContainerPiece[] {
  const out: ContainerPiece[] = [];
  for (let k = 0; k < byIndex.size; k += 1) {
    const one = byIndex.get(k);
    if (one === undefined) throw new EmptyConfigurationError(`${what} ${k} has nothing, and its table names every index below its count`);
    out.push(one);
  }
  return out;
}

/** Options for the whole empty configuration: the skeleton's, the family's settings and its look. */
export interface EmptyConfigurationOptions extends EmptyOptions {
  settings: WiringSettings;
  look: EmptyLook;
  /** Our letters blended into the colour under each text, `FourSlotChoices.blendLetters`, decision 22. */
  blendLetters: boolean;
}

/** What the empty configuration came to, with the numbering a composer continues from. */
export interface EmptyConfiguration extends EmptyBuilt {
  wiring: EmptyWiring;
  pictures: EmptyPictures;
  /** The base slot 11 index of the idle corner program, which both menus queue. */
  corner: number;
  /** Base slot 10 index to list, every one the configuration holds. */
  lists: Map<number, ContainerPiece>;
  /** With blending, the copies of each set blended for a background, which `checkBlendedLetters` reads. */
  blended?: BlendedSet[];
}

/**
 * An empty configuration: the skeleton, the wiring and the state tables, and the screens. The modes are the
 * firmware's fourteen, then the device list, the activity menu and Off, `EMPTY_MODES`, each record laid out
 * as the compiler lays one, its own key map, its programs and page records, then its entry; mode 0's own key
 * map is the key table. The page lists' second copies, which nothing names, follow the last entry, and base
 * slot 9's sets follow them, which is where `taggedListPools` finds them on every compile, section 69.
 */
export function buildEmptyConfiguration(options: EmptyConfigurationOptions): EmptyConfiguration {
  const model = emptyModelOf(options.skin);
  const fonts = emptyFontTable(options.inks, options.weights);
  const pictures = emptyPictures(options.look, model);
  // The corner program first, so it is base slot 11 entry 0, below the 256 a queued program can reach, section 369.
  const cornerPieces = cornerProgram(pictures.idlePatch, ourPicture(pictures, 'corner mark'));
  const corner = 0;
  const numbered = emptyWiring(options.settings, options.builtAt, model);
  const { wiring, states } = numbered;

  const spelling = spellingContainer(options);
  // After every list the wiring numbers, those it builds and on the Harmony 700 the one it names and leaves
  // to the screens, `usbLeave.first`.
  const firstList = Math.max(...numbered.lists.keys(), ...Object.values(numbered.spec.lists)) + 1;
  const firmware = emptyFirmwareScreens(numbered.spec, pictures, firstList, spelling);
  const records = emptyScreenRecords(model, pictures, corner, firmware.inline, spelling, wiringFrontIndex(numbered.spec, 'entry1.0x84'));
  const lists = new Map([...numbered.lists, ...firmware.lists, ...records.rowLists]);
  if (firmware.lists.size !== USB_LISTS) throw new EmptyConfigurationError(`USB Connected runs ${firmware.lists.size} lists`);

  const modes: BuiltScreen[] = [
    ...firmware.screens,
    records.screens['idle device list'], records.screens['activity menu'], records.screens.off,
  ];
  const order = emptyModes(model);
  if (modes[order.idleList] !== records.screens['idle device list'] || modes[order.off] !== records.screens.off) {
    throw new EmptyConfigurationError('the modes are not in emptyModes order');
  }
  const keyTable = modes[0]!.own;
  if (keyTable.bytes.join(',') !== emptyModeZeroKeys(model).join(',')) {
    throw new EmptyConfigurationError('mode 0\'s own key map is not the key table mode 0 needs');
  }
  // The copies ride on the last entry, the sets right behind them.
  const last = modes[modes.length - 1]!;
  const copies = modes.flatMap((one) => one.copies);
  const tail = new Uint8Array(last.entry.bytes.length + copies.reduce((n, one) => n + one.length, 0));
  tail.set(last.entry.bytes, 0);
  let at = last.entry.bytes.length;
  for (const one of copies) {
    tail.set(one, at);
    at += one.length;
  }
  const entriesOf = modes.map((one) => (one === last ? { ...one.entry, bytes: tail } : one.entry));
  const modeBody = modes.flatMap((one, k) => [
    ...(k === 0 ? [] : [one.own]),
    ...one.programs.flatMap((program, p) => [program, one.records[p]!]),
    entriesOf[k]!,
  ]);

  const listPieces = dense('action list', lists);
  const sets = dense('base slot 9 entry', wiring.entries);
  const programs = [cornerPieces[0]!, ...numbered.programs];
  const tables: (ContainerPiece | undefined)[] = new Array(20).fill(undefined);
  tables[0] = states.nameTree;
  tables[2] = wiring.logArea;
  tables[4] = wiring.eventMap;
  tables[5] = countedTable(1, [], 'slot-5-table');
  tables[6] = countedTable(3, entriesOf, 'slot-6-table');
  tables[7] = fonts.table;
  tables[8] = wiring.leadingList;
  tables[9] = countedTable(1, sets, 'slot-9-table');
  tables[10] = countedTable(2, listPieces, 'slot-10-table');
  tables[11] = countedTable(2, programs, 'slot-11-table');
  tables[12] = wiring.timerTable;
  tables[13] = states.stateTable;
  tables[14] = states.valueMapTable;
  tables[15] = wiring.parameterTable;
  tables[16] = { bytes: new Uint8Array(1), refs: [], owner: 'slot-16-table' };
  tables[17] = { bytes: new Uint8Array(2), refs: [], owner: 'slot-17-table' };
  const placed = placePieces({
    architecture: 14, skin: options.skin, builtAt: options.builtAt, keyTable,
    body: [
      ...modeBody, ...sets, ...cornerPieces, ...numbered.programs,
      ...wiring.timerRecords, ...states.records, ...states.valueMaps,
    ],
    tables,
    loose: [
      ...fonts.glyphs, ...fonts.sets, ...listPieces, ...wiring.parameterGroups,
      ...modes.flatMap((one) => one.lists),
      pictures.plain, pictures.topBar, pictures.bottomBar, pictures.idle, pictures.idlePatch,
      ...pictures.ours.values(),
    ],
  });
  const laid = layOutContainer(placed.layout);
  const built = { faces: fonts.faces, wiring: numbered, pictures, corner, lists };
  if (!options.blendLetters) return { bytes: laid.bytes, container: laid.container, ...built };
  // Our letters blended into the colour under each text, as the assembly's last step does it, then read back.
  const blending = withBlendedLetters(placed.layout, fonts.faces);
  const blended = layOutContainer(blending.layout);
  checkBlendedLetters(blended.container, fonts.faces, blending.blended);
  return { bytes: blended.bytes, container: blended.container, ...built, blended: blending.blended };
}
