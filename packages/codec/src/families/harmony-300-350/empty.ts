/**
 * The Harmony 300 and 350 built from nothing: the configuration with no device and no activity, `todo-compile-350.md`
 * 5.1.5, step 5 of plan 011, the no screen family's half of what `families/harmony-600-650-700/empty.ts` is for the Harmony 650
 * and `families/harmony-one/empty.ts` for the Harmony One.
 *
 * Every other route to a configuration of this family starts from one of Logitech's compiles and edits it, chapter 4.
 * This one takes no container at all: a skin and a moment, and each section comes from a generator of ours that was
 * measured against Logitech's compiles on its own, the frame laying them out, `layOutContainer`. Nothing here reads a
 * byte of a Logitech file, and the test that holds the result runs with no lab.
 *
 * **What "empty" is, and why it is a choice.** No compile of the family the lab holds has no device: the smallest
 * holds one, the harvest's second Harmony 350 compile, so what Logitech's compiler writes for a configuration of
 * none is not read, plan 011's open. So this is the least configuration every section's generator can write, each
 * with nothing in it, and where a section of the family keeps a fixed part whatever the setup, the fixed part:
 *
 * | section | what the empty one holds | from |
 * |---|---|---|
 * | the key table, after `LWJL` | the four send event entries and the entry binding event `0xFF`, in the compiler's hash order | `noScreenSendEventEntries`, `noScreenAcknowledgingEntry`, `inCompilerOrder` |
 * | base slot 0, the name tree | Root and State, no variable named | `buildNoScreenStateTables` |
 * | base slots 1 and 3 | the architecture record for the skin, and the build stamp | the frame |
 * | base slot 2, the log area | the family's constant region | `noScreenLogArea` |
 * | base slot 5, the infrared table | the model's allocation of empty groups, eight on a Harmony 350 and four on a Harmony 300 | `INFRARED_GROUPS_BY_SKIN` |
 * | raw slot 5, the start up events | the eleven calls, whose first selects no map, since there is no device to select | `noScreenStartUpTable` |
 * | raw slot 6, the key map table | one entry, the key table | `countedTable` |
 * | base slot 10, the action lists | the six of the start up and the thirteen of the send events, nineteen | `noScreenStartUpLists`, `noScreenSendEventLists` |
 * | raw slot 8, the timers | none | `countedTable` |
 * | base slot 13, the state variables | the firmware's eighteen, the clock stamped, and the compiler's one two byte variable | `buildNoScreenStateTables` |
 * | base slot 15, the parameter block | the family's five groups | `noScreenParameterBlock` |
 * | base slot 16, the number sender | none | `numberSenderTable` |
 * | raw slot 12, the digit entry table | none | `noScreenDigitEntryTable` |
 * | raw slot 13, the metadata archive | no device | `noScreenMetadataSection` |
 *
 * **Three choices of ours**, none of them a measurement, each the least that keeps every reader of the file working:
 *
 * * **The start up selects no map.** In all 13 compiles read, the first start up event's list ends by selecting the
 *   map of the device on the lowest infrared group that holds one, `startUpGroup`; with no device there is no such
 *   map, so the list stops after the hold list and the empty list, as events 2 to 4's do. Selecting the key table
 *   itself, map 0, was the other candidate, and is not taken: the hold list already pushes map 0 as the table every
 *   lookup falls through to, and what a select of it would add is not read. What the firmware does with a start that
 *   selects nothing is not checked; the bench write of `todo-compile-350.md` 5.1.5 is what says.
 * * **The lists' numbers.** Logitech numbers the start up's four event lists 0 to 3 in all 13 compiles, and so does
 *   this; the hold list, the two empty lists and the send events' lists follow in the order `EMPTY_LIST_NUMBERS`
 *   gives. Lists are called by number and the numbering is description, plan 011, so any order the calls agree with
 *   is the same configuration to the remote.
 * * **Where each piece sits.** The regions in the order every compile of the family has them, `frame.ts`: the key
 *   table, then the lists, then the state records, then the sections in raw slot order, with the empty infrared
 *   groups in front of base slot 5's table and the parameter groups in front of base slot 15's, which is where
 *   Logitech's compiles have both. Every piece is reached by an address, so the order is carried and not read.
 *
 * **What it holds that no Logitech compile does**: the binding of firmware event `0xFF` to the list event `0x30`'s
 * entry calls, `noScreenAcknowledgingEntry`, which makes a Harmony 300 run a Harmony 350's configuration, decision 28,
 * `todo-compile-350.md` 5.4. Until 5.4 this left it out, so that 5.2's attribution held on a build with no entry of
 * ours that Logitech lacks; it is in now so that every configuration of ours built from nothing is one file for both
 * models, this one included. `buildNoScreenSetup` starts from the same configuration without it,
 * `emptyNoScreenForComposing`, and binds it as its last step, which keeps the key table in Logitech's order; no
 * composer adds it. On the empty configuration itself it is never reached:
 * with no device nothing is sent, so neither model raises the event. It costs four bytes, 1105 bytes on a Harmony
 * 350 where 5.1.5 built 1101, and 1081 on a Harmony 300 where it built 1077.
 *
 * Both models alike but for the skin and the infrared allocation, decision 28. Read only towards hardware: the result
 * is bytes in memory, and the write is `packages/usb/bin/write-file-config.ts`'s.
 */
import { countedTable, type ContainerPiece, layOutContainer } from '../../assembly/frame.ts';
import { BASE_SLOT_COUNT, type Container, parse } from '../../container/gspm.ts';
import { taggedListBytes } from '../../container/sections.ts';
import { ComposeError, restamped } from '../../shared/core.ts';
import { numberSenderTable } from '../../container/tables.ts';
import {
  ACKNOWLEDGED_AS, noScreenAcknowledgingEntry, noScreenDigitEntryTable, noScreenLogArea, noScreenParameterBlock, noScreenSendEventEntries,
  noScreenSendEventLists, type NoScreenSendEventNumbers, noScreenStartUpLists, type NoScreenStartUpNumbers, noScreenStartUpTable, SEND_EVENT_PINS,
} from './constants.ts';
import { inCompilerOrder, keyMaps, withMapEntries } from './devices.ts';
import { KEY_MAP_SLOT, START_UP_SLOT, TIMER_SLOT } from './keys.ts';
import { noScreenMetadataSection, noScreenZipTime } from './metadata.ts';
import { buildNoScreenStateTables, type NoScreenStateTables } from './statetables.ts';

/**
 * How many infrared groups Logitech's compiles allocate, by the skin the architecture record states: the model's
 * maximum device count, every group present and the unused ones empty, `reference/architectures/harmony-300-350/
 * memory.md`. Eight on skin 104, the Harmony 350, in the nine of its compiles the lab holds from Logitech's current
 * service; four on skin 79, the European Harmony 300, in all three of its, the one from 2011 included. The tenth
 * Harmony 350 compile, from 2017, holds seven, so the count is the compiler's choice and this table states the current
 * service's, `test/families/harmony-300-350/noscreenempty.test.ts`. **Skin 78, the Harmony 300's other printing, is not here**: no
 * configuration stating it has been read, and a table by skin answers only for the skins measured, so a build for it
 * is refused rather than given 79's answer. A table by skin rather than a test of it, `code-for-a-family`.
 */
export const INFRARED_GROUPS_BY_SKIN: Readonly<Record<number, number>> = { 104: 8, 79: 4 };

/**
 * The count widths of the family's tables of a count and three byte addresses, by raw slot: one byte everywhere but
 * the action list table's two, on all seven of Logitech's compiles the census counts, `noscreencensus.test.ts`, which
 * rebuilds each of the five tables of every one of them through `countedTable` at these widths. Raw slot 11, the
 * number sender, is the shared `numberSenderTable`, whose one byte count is the same measurement.
 */
export const NO_SCREEN_COUNT_WIDTHS: Readonly<Record<number, number>> = { 4: 1, [KEY_MAP_SLOT]: 1, 7: 2, [TIMER_SLOT]: 1 };

/**
 * The empty configuration's list numbers: the start up's four event lists 0 to 3, as Logitech numbers them in all
 * 13 compiles read, then its hold list and its empty list, then the send events' own empty list and each event's
 * three lists in tag order. Nineteen lists, numbered densely from 0, since the action list table names every index
 * below its count.
 */
export const EMPTY_LIST_NUMBERS: { readonly startUp: NoScreenStartUpNumbers; readonly sendEvents: NoScreenSendEventNumbers } = {
  startUp: { events: [0, 1, 2, 3], hold: 4, empty: 5 },
  sendEvents: {
    empty: 6,
    events: new Map([...SEND_EVENT_PINS.keys()].map((tag, k) => [tag, { bound: 7 + 3 * k, load: 8 + 3 * k, test: 9 + 3 * k }])),
  },
};

/**
 * The zone the metadata archive's ZIP time is taken back by, in whole hours: none. Logitech's compiles take the
 * stamp back 5 or 6 hours, its service's zone, and the one from 2011 none, `noScreenZipTime`; a build of ours has
 * no service, and nothing on a remote is known to read the archive, so the stamp's own zone is the plain choice.
 */
export const EMPTY_ZONE_HOURS = 0;

/** The family's architecture, which the frame lays out by. */
const ARCHITECTURE = 16;

/** The empty group array of the infrared table: `u8 spare; u16 count`, all zero, as every unused group is. */
const EMPTY_GROUP_LENGTH = 3;

export interface EmptyNoScreenOptions {
  /** The skin the architecture record states, 104 for a Harmony 350 and 79 for a European Harmony 300. */
  readonly skin: number;
  /** When it is built, `YYYY-MM-DDTHH:MM:SS`: the stamp, the clock records and the archive's time are taken from it. */
  readonly builtAt: string;
  /** The archive's zone, `EMPTY_ZONE_HOURS` unless given. */
  readonly zoneHours?: number;
}

export interface EmptyNoScreenConfiguration {
  /** The whole container, end marker included, as `/cfg/usercfg` takes it, its trailer stamped last. */
  readonly bytes: Uint8Array;
  /** The same, parsed. */
  readonly container: Container;
  /** The state tables it holds, which a composer continues from. */
  readonly stateTables: NoScreenStateTables;
  /** Per action list index, the list: what the numbering holds. */
  readonly lists: ReadonlyMap<number, ContainerPiece>;
}

/** The pieces of a table numbered from 0, refusing a gap, since the table names every index below its count. */
function dense(byIndex: ReadonlyMap<number, ContainerPiece>): ContainerPiece[] {
  const out: ContainerPiece[] = [];
  for (let k = 0; k < byIndex.size; k += 1) {
    const one = byIndex.get(k);
    if (one === undefined) throw new ComposeError(`list ${k} has nothing, and the action list table names every index below its count`);
    out.push(one);
  }
  return out;
}

/** Add `from` into `into`, refusing an index given twice: the start up's and the send events' lists are kept apart. */
function merge(into: Map<number, ContainerPiece>, from: ReadonlyMap<number, ContainerPiece>): void {
  for (const [index, piece] of from) {
    if (into.has(index)) throw new ComposeError(`list ${index} is numbered twice`);
    into.set(index, piece);
  }
}

/** The infrared groups a skin's configurations allocate, or a refusal naming the skins measured. */
export function infraredGroupsOf(skin: number): number {
  const groups = INFRARED_GROUPS_BY_SKIN[skin];
  if (groups === undefined) {
    throw new ComposeError(`no configuration of skin ${skin} has been read, so its infrared allocation is not known; `
      + `the skins measured are ${Object.keys(INFRARED_GROUPS_BY_SKIN).join(' and ')}`);
  }
  return groups;
}

/**
 * The Harmony 300 or 350 configuration with no device and no activity, from a skin and a moment and nothing else,
 * the module comment's table, the entry binding event `0xFF` included. Refuses a skin `INFRARED_GROUPS_BY_SKIN` does
 * not hold and a stamp base slot 3 cannot hold; `layOutContainer` then refuses anything the frame would, and parses
 * the result with every container check.
 */
export function buildEmptyNoScreenConfiguration(options: EmptyNoScreenOptions): EmptyNoScreenConfiguration {
  return emptyConfiguration(options, true);
}

/**
 * The same configuration with the entry binding event `0xFF` left for last, which only a chain of composers that ends
 * by putting it in may start from: `buildNoScreenSetup`, which binds it with `withAcknowledgingEntry` once every
 * device, the activity and the favourites are composed. **Why it is not put in first there.** The key table is a hash
 * map in the compiler's order, `inCompilerOrder`, and where an entry lands depends on when the table doubled; a fifth
 * entry from the start doubles the table one device earlier and stores the test setup's `0xC1` before `0x2E` and
 * `0x85` where Logitech stores it after them. Put in last, the key table is Logitech's binding for binding and in
 * order with `0xFF` between `0x2D` and `0x30`, the same as the file the bench Harmony 300 ran, made by putting the
 * entry into Logitech's compile, `noscreeneventff.test.ts`. The remote reads neither order differently, since a tag
 * is in a list once; the order is kept so that our build stays comparable entry for entry with Logitech's.
 * Not exported from the package: a configuration without the entry is never a finished one of ours.
 */
export function emptyNoScreenForComposing(options: EmptyNoScreenOptions): EmptyNoScreenConfiguration {
  return emptyConfiguration(options, false);
}

/**
 * The entry binding event `0xFF` put into a finished configuration's key table, `noScreenAcknowledgingEntry` for the
 * send events' numbers `EMPTY_LIST_NUMBERS` gives, where the compiler's order puts it, `withMapEntries`, and the
 * trailer restamped. Refuses a configuration whose `0x30` entry no longer calls the list those numbers name, since
 * then the numbers are not this configuration's and the entry would call another list, and one that binds `0xFF`
 * already.
 */
export function withAcknowledgingEntry(c: Container): Container {
  const { sendEvents } = EMPTY_LIST_NUMBERS;
  const entry = noScreenAcknowledgingEntry(sendEvents);
  const keyTable = keyMaps(c)[0]?.entries ?? [];
  if (keyTable.some((one) => one.tag === entry.tag)) throw new ComposeError('the key table binds event 0xff already');
  const thirty = keyTable.find((one) => one.tag === ACKNOWLEDGED_AS);
  if (thirty === undefined || thirty.opcode !== entry.opcode || thirty.operand !== entry.operand) {
    throw new ComposeError(`the key table's 0x30 entry does not call list ${entry.operand}, so the empty configuration's numbers are not this one's`);
  }
  return parse(restamped(new Uint8Array(withMapEntries(c, 0, [entry]).blob)));
}

/** The empty configuration, with the entry binding event `0xFF` in its key table or without it. */
function emptyConfiguration(options: EmptyNoScreenOptions, acknowledging: boolean): EmptyNoScreenConfiguration {
  const { skin, builtAt } = options;
  const groupCount = infraredGroupsOf(skin);
  const { startUp, sendEvents } = EMPTY_LIST_NUMBERS;

  // The lists, every one a generator's, numbered by `EMPTY_LIST_NUMBERS`.
  const lists = new Map<number, ContainerPiece>();
  merge(lists, noScreenStartUpLists(startUp));
  merge(lists, noScreenSendEventLists(sendEvents));
  const listPieces = dense(lists);

  // The key table: the send events' four entries, in the order Logitech's compiler would store them with nothing
  // else in the table, which is its hash map's order at the smallest size, `inCompilerOrder`; then the entry binding
  // event 0xFF, put in after them. Where it lands is the hash's slot for 0xFF, slot 1 of 16, first of the five. A
  // chain of composers starts without it and puts it in last, `emptyNoScreenForComposing`, for the reason given there.
  // The order of a tagged list changes nothing the remote does, since a tag is in it once.
  const entries = [...noScreenSendEventEntries(sendEvents), ...(acknowledging ? [noScreenAcknowledgingEntry(sendEvents)] : [])];
  const keyTable: ContainerPiece = { bytes: taggedListBytes(inCompilerOrder([], entries)), refs: [], owner: 'raw-6-key-table' };

  // Base slots 0 and 13: no variable of the setup's, so the firmware's eighteen and the compiler's two byte one.
  const stateTables = buildNoScreenStateTables({ devices: [], activity: false }, builtAt);
  const { built } = stateTables;

  // Base slot 5: the model's allocation, each group an empty array, named by the table in group order.
  const groups = Array.from({ length: groupCount }, (): ContainerPiece => ({
    bytes: new Uint8Array(EMPTY_GROUP_LENGTH), refs: [], owner: 'slot-5-group',
  }));
  const parameters = noScreenParameterBlock();
  const archive = noScreenMetadataSection([], {
    deviceIds: [], time: noScreenZipTime(builtAt, options.zoneHours ?? EMPTY_ZONE_HOURS),
  });

  const sections: ({ before: ContainerPiece[]; head: ContainerPiece[] } | undefined)[] = new Array(BASE_SLOT_COUNT).fill(undefined);
  sections[0] = { before: [], head: [built.nameTree] };
  sections[2] = { before: [], head: [noScreenLogArea()] };
  sections[5] = { before: groups, head: [countedTable(NO_SCREEN_COUNT_WIDTHS[4]!, groups, 'raw-4-table')] };
  sections[10] = { before: [], head: [countedTable(NO_SCREEN_COUNT_WIDTHS[7]!, listPieces, 'raw-7-table')] };
  sections[13] = { before: [], head: [built.stateTable] };
  sections[15] = { before: parameters.groups, head: [parameters.table] };
  sections[16] = { before: [], head: [numberSenderTable([])] };

  const laid = layOutContainer({
    architecture: ARCHITECTURE,
    skin,
    builtAt,
    keyTable,
    body: [...listPieces, ...built.records],
    sections,
    inserted: {
      [START_UP_SLOT]: { before: [], head: [{ bytes: noScreenStartUpTable(startUp), refs: [], owner: 'raw-5-table' }] },
      [KEY_MAP_SLOT]: { before: [], head: [countedTable(NO_SCREEN_COUNT_WIDTHS[KEY_MAP_SLOT]!, [keyTable], 'raw-6-table')] },
      [TIMER_SLOT]: { before: [], head: [countedTable(NO_SCREEN_COUNT_WIDTHS[TIMER_SLOT]!, [], 'raw-8-table')] },
      12: { before: [], head: [noScreenDigitEntryTable()] },
      13: { before: [], head: [{ bytes: archive, refs: [], owner: 'raw-13-archive' }] },
    },
    pictures: [],
  });
  // The frame writes the trailer itself; stamping it again last is what every writer of this family does, so that
  // nothing after the layout can leave a file whose checksum is the layout's and not its own.
  const bytes = restamped(laid.bytes);
  return { bytes, container: laid.container, stateTables, lists };
}
