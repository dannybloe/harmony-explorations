/**
 * Which generator of ours writes each byte of a Harmony 300 or 350 configuration, `todo-compile-350.md` 5.2.1 and
 * plan 011's "The check that proves 5.2": the no screen family's counterpart of the four slot family's
 * `attributeBytes` and the touch family's `touchAttributedBytes`, over the generic ledger of `attribution.ts`.
 *
 * **What it measures, and what it does not remember.** It takes a finished file and nothing else: no description of
 * the setup, no memory of how the file was made, no Logitech file to compare with. Each generator reads its part's
 * numbers off the file, writes the part again, and only where what it writes is the file byte for byte are those
 * bytes counted as its. The numbers it read are counted apart as its description, by asking the generator which bytes
 * they reach, `describedByChange`. Whatever no generator writes again is reported by the region a reader knows it to
 * be in, carried, or as unclaimed. So it measures a Logitech compile and a build of ours alike, which is what lets the
 * one be the calibration of the other: on Logitech's seven compiles it says how much of their file our generators
 * write and names the rest, and on our build it has to find nothing left.
 *
 * **Why by structure and content and never by number.** Logitech's compiler numbers lists, maps, timers and state
 * variables in an order no rule was found for over four setups, `todo-compile-350.md` 5.1.8, so a list's index says
 * nothing about which generator wrote it. A list is credited by its shape and its own numbers: its numbers read off
 * it, its writer asked for the list those numbers make, and the two compared. Where a structure names its parts, the
 * start up table its lists and the key table's send event tags theirs, the parts are found by following it.
 *
 * **The generators, in the order they mark**, a byte two of them write going to the first:
 *
 * | generator | what it writes | how it is held to the file |
 * |---|---|---|
 * | frame | the header, the section table, its marker, the trailer, the architecture record and the stamp | the whole file taken apart and laid out again into itself, first, or nothing is credited; the record and the stamp rebuilt from the skin and the moment the file states |
 * | state tables | the name tree, the state variable table and its records | described and rebuilt by the family's facts, `NO_SCREEN_STATE_TABLES`, and the whole file laid out again equal |
 * | constants | the log area, the parameter block, the digit entry table, the start up table and its six lists, the send events' thirteen lists and their four key table entries, and the entry binding event `0xFF` where a file holds it | `constants.ts`' builders, given the list numbers read by following raw slot 5 and the key table's tags `0x2D` to `0x30` |
 * | metadata archive | raw slot 13, the length and the ZIP | `noScreenMetadataSection` given the devices, their numbers and the ZIP time the archive states |
 * | infrared | the group arrays, every record's header and every duration block | `irBuildRecord` given the carrier and the block addresses, `irBuildBlock` given the words |
 * | number sender | its record and its three digit tables | `numberSenderBlock` given the digits' send lists |
 * | key timers | the timer records | `keyTimerRecords` given the key's pin |
 * | the list kinds | every action list but the constants' | each kind of `NO_SCREEN_LIST_KINDS` in turn, the first whose writer gives the list back owning it; a spelled out channel against the number sender's digits |
 * | key maps | the key table and every device's map | stored in the compiler's hash order, `inCompilerOrder`, and every entry a call of a list on a key a composer of the family binds |
 * | table headers | the counts and addresses of the five tables of a count and addresses | a count of the family's width, `NO_SCREEN_COUNT_WIDTHS`, and as many addresses as it states |
 *
 * **What is description**, the bytes a generator is handed rather than computes: the list, map, timer and variable
 * numbers in every list and map; a send's group and record; a power on delay; a device key's pin; the channel; the
 * skin and the stamp; the archive's ZIP time; the carrier and **every duration word of an infrared block**, which are
 * the catalogue's and which `irBuildBlock` only frames with its terminator. That last is most of a file, and it is
 * why 5.2.3 is a check of its own: an attribution cannot tell a duration taken from the catalogue from one copied out
 * of a Logitech file, so what keeps a build honest about them is that no Logitech file goes in. The archive's device
 * names and numbers are description as well, inside the deflate stream where no byte can be pointed at, so only the
 * ZIP time is counted apart there.
 *
 * **What it refuses**: a configuration of another architecture, and one that does not lay out again into itself,
 * where no offset of the frame's can be trusted. Everything else it reports rather than refuses, since reporting is
 * its job: a part no generator writes is carried, by its region.
 *
 * Measured on the seven compiles of `noscreenattribution.test.ts` and on our own build; both models alike, decision
 * 28, and its counts per compile are in that test, with why each remainder is not ours.
 */
import { ByteLedger, type Attributed, describedByChange, differing } from '../../attribution.ts';
import { claims, type Claim } from '../../coverage.ts';
import { architectureRecord, buildTimestampSection, type ContainerPiece, layOutContainer, takeApart } from '../../frame.ts';
import { actionListBytes, type Container, type Instruction } from '../../gspm.ts';
import { irBlockWords, irBuildBlock, irBuildRecord, irGroups, irHeaderPointers, IR_RECORD_POINTER_BIAS, irRecordStart } from '../../ir.ts';
import { metadataArchive, metadataZipTime } from '../../metadata.ts';
import { stateTable, taggedList, taggedListBytes, taggedListExtent } from '../../sections.ts';
import { ComposeError } from '../../shared/core.ts';
import { buildStateTables, builtStatePieces, describeStateTables, withStateTables } from '../../statetables.ts';
import { numberSenders } from '../../tables.ts';
import { WATCH_TV_SCAN } from './activity.ts';
import {
  noScreenAcknowledgingEntry, noScreenDigitEntryTable, noScreenLogArea, noScreenParameterBlock, noScreenSendEventEntries,
  noScreenSendEventLists,
  type NoScreenSendEventNumbers, noScreenStartUpLists, type NoScreenStartUpNumbers, noScreenStartUpTable, SEND_EVENT_PINS,
  type SendEventLists, START_UP_EVENT_COUNT, START_UP_OWN_EVENTS,
} from './constants.ts';
import { HELD, inCompilerOrder, instructionsAt, PRESS, RELEASE } from './devices.ts';
import { NO_SCREEN_COUNT_WIDTHS } from './empty.ts';
import {
  DEVICE_KEYS, FAVOURITE_FIVE, FAVOURITE_SCANS, INPUT_KEY, KEY_MAP_SLOT, NO_SCREEN_HARD_KEYS, POWER_SCAN, START_UP_SLOT, TIMER_SLOT,
  VOLUME_SCANS,
} from './keys.ts';
import {
  channelDigitsList, keyTimerRecords, type ListNames, NO_SCREEN_LIST_KINDS, numberSenderBlock, readChannelDigits, TIMER_RECORD_LENGTH,
} from './lists.ts';
import { noScreenMetadataSection } from './metadata.ts';
import { NO_SCREEN_STATE_TABLES } from './statetables.ts';

/** The generators a byte can belong to, in the order they mark; the list kinds by the names `lists.ts` gives them. */
export const NO_SCREEN_ATTRIBUTIONS = [
  'frame', 'state tables', 'constants', 'metadata archive', 'infrared', 'number sender', 'key timers',
  'send lists', 'power on lists', 'gate lists', 'flip lists', 'reset lists', 'key press lists', 'key select lists',
  'activity lists', 'condition lists', 'input write lists', 'channel lists', 'action step lists',
  'key maps', 'table headers',
] as const;
export type NoScreenAttribution = (typeof NO_SCREEN_ATTRIBUTIONS)[number];

// Every list kind has to be a name above, so that a kind added to `lists.ts` and not here fails at once rather than
// marking under a name the ledger refuses halfway through a file.
for (const kind of NO_SCREEN_LIST_KINDS) {
  if (!(NO_SCREEN_ATTRIBUTIONS as readonly string[]).includes(kind.name)) throw new Error(`the list kind ${kind.name} is no attribution`);
}

export type NoScreenAttributed = Attributed<NoScreenAttribution>;

export interface NoScreenAttributionOptions {
  /** Generators whose claims are dropped: the control that a generator's claim is what keeps its bytes attributed. */
  readonly without?: ReadonlySet<NoScreenAttribution>;
}

/** The family's architecture, the one this attribution reads, as `empty.ts` builds it. */
const ARCHITECTURE = 16;

/** The family's raw slots that the attribution follows, `ARCH16_SLOT_MAP` and `FRAME_ARCHITECTURES[16]`. */
const RAW = { arch: 1, log: 2, stamp: 3, infrared: 4, lists: 7, parameters: 10, digits: 12 } as const;
/** The clock record's length, `CLOCK_SECTION_LENGTH`: the cookie, seven field bytes, the terminator and three zeros. */
const CLOCK_LENGTH = 14;
/** Where the stamp's seven fields sit in the clock record, after its two byte cookie. */
const STAMP_FIELDS = { at: 2, length: 7 } as const;
/** A key map entry in the narrow form: the tag, the operand and the opcode. */
const ENTRY_LENGTH = 4;
/** A number sender record's own fields before its three table pointers: flags, base, minimum, prologue, epilogue, prefix. */
const SENDER_FIELDS = 14;

/**
 * The regions a reader knows, which name what no generator writes: `claims` in `coverage.ts`, and the five this family
 * holds that `claims` leaves out, each named the way the census names it, `noscreencensus.test.ts`: the key maps, the
 * timer records, the parameter groups, the clock record's three closing zeros and the metadata archive.
 */
export function noScreenRegions(c: Container): Claim[] {
  const out = claims(c);
  for (const address of c.pointerArray(KEY_MAP_SLOT) ?? []) {
    const at = c.blobOffsetOf(address);
    const extent = at === undefined ? undefined : taggedListExtent(c.blob, at);
    if (at !== undefined && extent !== undefined) out.push({ start: at, length: extent.length, owner: 'raw-6-map' });
  }
  for (const address of c.pointerArray(TIMER_SLOT) ?? []) {
    const at = c.blobOffsetOf(address);
    if (at !== undefined) out.push({ start: at, length: TIMER_RECORD_LENGTH, owner: 'raw-8-timer' });
  }
  for (const address of c.pointerArray(RAW.parameters) ?? []) {
    const at = c.blobOffsetOf(address);
    if (at !== undefined) out.push({ start: at, length: 1 + 2 * (c.blob[at] ?? 0), owner: 'raw-10-group' });
  }
  const clock = sectionAt(c, RAW.stamp);
  if (clock !== undefined) out.push({ start: clock, length: CLOCK_LENGTH, owner: 'slot-3-clock' });
  const archive = metadataArchive(c);
  if (archive !== undefined) out.push({ start: archive.offset, length: 4 + archive.length, owner: 'raw-13-archive' });
  return out;
}

/** A raw slot's section as a blob offset, or undefined where it is NULL or outside the file. */
function sectionAt(c: Container, raw: number): number | undefined {
  const section = c.sections[raw];
  return section === undefined || section.isNull ? undefined : c.blobOffsetOf(section.address);
}

/** A piece's bytes with every absolute address it names written in, as the frame lays it: the log area's two ends. */
function resolved(piece: ContainerPiece): Uint8Array | undefined {
  const out = new Uint8Array(piece.bytes);
  for (const ref of piece.refs) {
    if (!('address' in ref)) return undefined;
    out.set([ref.address & 0xff, (ref.address >> 8) & 0xff, (ref.address >> 16) & 0xff], ref.at);
  }
  return out;
}

/** Runs `step`, treating the family's own refusal as "this part is no generator's", which the tally then reports. */
function attempt(step: () => void): void {
  try {
    step();
  } catch (error) {
    if (!(error instanceof ComposeError) && !(error instanceof RangeError)) throw error;
  }
}

/**
 * Every byte of a Harmony 300 or 350 configuration attributed to the generator that writes it, the module comment's
 * table, or reported as carried by its region or unclaimed. Refuses another architecture and a file that does not lay
 * out again into itself.
 */
export function noScreenAttributedBytes(c: Container, options: NoScreenAttributionOptions = {}): NoScreenAttributed {
  if (c.architecture !== ARCHITECTURE) {
    throw new ComposeError(`the no screen family's attribution reads arch ${ARCHITECTURE}, not arch ${c.architecture}`);
  }
  const ledger = new ByteLedger<NoScreenAttribution>(c.blob, NO_SCREEN_ATTRIBUTIONS, options.without ?? new Set());
  const listTable = c.pointerArray(RAW.lists) ?? [];
  const listAt = (index: number): number | undefined => {
    const address = listTable[index];
    return address === undefined ? undefined : c.blobOffsetOf(address);
  };
  const listBody = (index: number): Instruction[] | undefined => {
    const at = listAt(index);
    return at === undefined ? undefined : instructionsAt(c.blob, at);
  };

  // The frame. The file has to lay out again into itself before anything is credited, as `touchAttributedBytes`
  // checks first: laying out generates the header, the section table, its marker and the trailer from the pieces, so
  // where it gives the file back those bytes are the frame's.
  const layout = takeApart(c);
  const again = layOutContainer(layout).bytes;
  if (again.length !== c.blob.length || again.some((one, k) => one !== c.blob[k])) {
    throw new ComposeError('the configuration does not lay out again into itself, so no offset of the frame\'s can be trusted');
  }
  const regions = noScreenRegions(c);
  for (const claim of regions) {
    if (['header', 'section-table', 'marker', 'trailer'].includes(claim.owner)) ledger.mark(claim.start, claim.length, 'frame');
  }
  // The architecture record from the skin it states, the skin being description; and the clock record from the moment
  // the file states, its seven fields the moment's.
  const archAt = sectionAt(c, RAW.arch);
  if (archAt !== undefined) {
    const skin = c.blob[archAt + 2] ?? 0;
    const write = ([one]: readonly number[]) => architectureRecord(ARCHITECTURE, one!);
    ledger.markRebuilt(archAt, write([skin]), 'frame', describedByChange(write, [skin]));
  }
  const clockAt = sectionAt(c, RAW.stamp);
  if (clockAt !== undefined && c.builtAt !== undefined) {
    const fields = new Set(Array.from({ length: STAMP_FIELDS.length }, (_, k) => STAMP_FIELDS.at + k));
    ledger.markRebuilt(clockAt, buildTimestampSection(c.builtAt), 'frame', fields);
  }

  // The state tables, the generic builder over the family's facts, as `touchBuiltBytes` takes the One's: described off
  // the file, built, laid out again and held to the file whole, then each built piece credited where it landed. What a
  // record holds is the description's and the builder makes every byte of it from that, so none is counted apart.
  attempt(() => {
    const built = buildStateTables(describeStateTables(layout, NO_SCREEN_STATE_TABLES), NO_SCREEN_STATE_TABLES);
    const laid = layOutContainer(withStateTables(layout, built));
    if (laid.bytes.length !== c.blob.length || laid.bytes.some((one, k) => one !== c.blob[k])) return;
    for (const piece of builtStatePieces(built)) {
      const at = laid.offsetOf(piece);
      if (at !== undefined) ledger.mark(at, piece.bytes.length, 'state tables');
    }
  });

  // The constants. The log area, the parameter block and the digit entry table take no numbers at all.
  const logAt = sectionAt(c, RAW.log);
  const log = resolved(noScreenLogArea());
  if (logAt !== undefined && log !== undefined) ledger.markRebuilt(logAt, log, 'constants');
  attempt(() => {
    const block = noScreenParameterBlock();
    const pointers = c.pointerArray(RAW.parameters) ?? [];
    const tableAt = sectionAt(c, RAW.parameters);
    if (pointers.length !== block.groups.length || tableAt === undefined || c.blob[tableAt] !== block.groups.length) return;
    // The table is the count and as many addresses, the addresses the frame's: credited where every group it names is
    // the block's own.
    const groups = pointers.map((address, k) => ledger.markRebuilt(c.blobOffsetOf(address) ?? -1, block.groups[k]!.bytes, 'constants'));
    if (groups.every(Boolean)) ledger.mark(tableAt, 1 + 3 * pointers.length, 'constants');
  });
  const digitsAt = sectionAt(c, RAW.digits);
  if (digitsAt !== undefined) ledger.markRebuilt(digitsAt, noScreenDigitEntryTable().bytes, 'constants');
  // The start up: its table's eleven calls name the empty list and the four events' lists, and the first event's list
  // names the hold list and, where it ends in one, the map it selects. Every number taken one on, the table and the
  // lists written again, and what moved is the description.
  attempt(() => {
    const at = sectionAt(c, START_UP_SLOT);
    if (at === undefined) return;
    const calls = instructionsAt(c.blob, at);
    if (calls.length !== START_UP_EVENT_COUNT) return;
    const first = listBody(calls[START_UP_OWN_EVENTS[0]]!.operand);
    if (first === undefined || first.length < 2) return;
    const last = first.at(-1)!;
    const numbers: NoScreenStartUpNumbers = {
      empty: calls[0]!.operand,
      hold: first[0]!.operand,
      events: START_UP_OWN_EVENTS.map((entry) => calls[entry]!.operand) as unknown as [number, number, number, number],
      map: first.length === 3 && last.opcode === 0x1f ? last.operand & 0xff : undefined,
    };
    const shifted: NoScreenStartUpNumbers = {
      empty: numbers.empty + 1, hold: numbers.hold + 1,
      events: numbers.events.map((one) => one + 1) as unknown as [number, number, number, number],
      map: numbers.map === undefined ? undefined : numbers.map ^ 1,
    };
    const table = noScreenStartUpTable(numbers);
    ledger.markRebuilt(at, table, 'constants', differing(table, noScreenStartUpTable(shifted)));
    const lists = noScreenStartUpLists(numbers);
    const others = noScreenStartUpLists(shifted);
    for (const [index, piece] of lists) {
      const other = others.get(index + 1)?.bytes ?? new Uint8Array();
      ledger.markRebuilt(listAt(index) ?? -1, piece.bytes, 'constants', differing(piece.bytes, other));
    }
  });
  // The send events: each tag of `SEND_EVENT_PINS` in the key table names its bound list, which calls its load list and
  // the empty list, and the load list calls the test.
  attempt(() => {
    const keyTableAddress = (c.pointerArray(KEY_MAP_SLOT) ?? [])[0];
    const keyTable = keyTableAddress === undefined ? undefined : taggedList(c, keyTableAddress);
    if (keyTable === undefined || keyTableAddress === undefined) return;
    const events = new Map<number, SendEventLists>();
    let empty: number | undefined;
    for (const tag of SEND_EVENT_PINS.keys()) {
      const bound = keyTable.entries.find((one) => one.tag === tag)?.operand;
      const boundBody = bound === undefined ? undefined : listBody(bound);
      const load = boundBody?.[0]?.operand;
      const loadBody = load === undefined ? undefined : listBody(load);
      const test = loadBody?.[1]?.operand;
      if (bound === undefined || load === undefined || test === undefined) return;
      empty = boundBody![1]?.operand;
      events.set(tag, { bound, load, test });
    }
    if (empty === undefined) return;
    const numbers: NoScreenSendEventNumbers = { empty, events };
    const shift = (one: SendEventLists): SendEventLists => ({ bound: one.bound + 1, load: one.load + 1, test: one.test + 1 });
    const shifted: NoScreenSendEventNumbers = { empty: empty + 1, events: new Map([...events].map(([tag, one]) => [tag, shift(one)])) };
    const lists = noScreenSendEventLists(numbers);
    const others = noScreenSendEventLists(shifted);
    for (const [index, piece] of lists) {
      const other = others.get(index + 1)?.bytes ?? new Uint8Array();
      ledger.markRebuilt(listAt(index) ?? -1, piece.bytes, 'constants', differing(piece.bytes, other));
    }
    // The four entries, each where the key table holds its tag: a tag, the bound list's index and the call.
    const tableAt = c.blobOffsetOf(keyTableAddress)!;
    for (const entry of noScreenSendEventEntries(numbers)) {
      const k = keyTable.entries.findIndex((one) => one.tag === entry.tag);
      const bytes = taggedListBytes([entry]).subarray(1);
      ledger.markRebuilt(tableAt + 1 + ENTRY_LENGTH * k, bytes, 'constants', new Set([1, 2]));
    }
    // The entry binding event 0xFF, where the key table holds one: ours, `todo-compile-350.md` 5.4, credited only where
    // it is exactly `noScreenAcknowledgingEntry` for the numbers just read, a call of event 0x30's bound list. Logitech's
    // compiles bind no 0xFF, so on them this finds nothing and their calibration is what it was; an 0xFF bound to any
    // other list is left to the key maps' pass, which does not take the tag, and so its four bytes show as carried, in
    // the key map's region, `noscreenacknowledging.test.ts`.
    const acknowledging = noScreenAcknowledgingEntry(numbers);
    const k = keyTable.entries.findIndex((one) => one.tag === acknowledging.tag);
    if (k >= 0) {
      const bytes = taggedListBytes([acknowledging]).subarray(1);
      ledger.markRebuilt(tableAt + 1 + ENTRY_LENGTH * k, bytes, 'constants', new Set([1, 2]));
    }
  });

  // The metadata archive: the devices, their numbers and the ZIP time it states, written again. The time is the one
  // number that sits in bytes of its own, found by writing the archive with the time's two words inverted.
  attempt(() => {
    const archive = metadataArchive(c);
    if (archive === undefined) return;
    const section = c.blob.subarray(archive.offset, archive.offset + 4 + archive.length);
    const devices = archive.devices.map((one) => ({ name: one.name, commands: one.commands.map((command) => command.name) }));
    const deviceIds = archive.devices.map((one) => Number(one.deviceId));
    const time = metadataZipTime(section.subarray(4));
    const built = noScreenMetadataSection(devices, { deviceIds, time });
    const other = noScreenMetadataSection(devices, { deviceIds, time: { time: time.time ^ 0xffff, date: time.date ^ 0xffff } });
    ledger.markRebuilt(archive.offset, built, 'metadata archive', differing(built, other));
  });

  // The infrared table: every group array, a spare zero, a count and the records' addresses; every record's header
  // from its carrier and its block addresses, those being where its blocks went; every block from its words.
  const groups = irGroups(c) ?? [];
  for (const group of groups) {
    if (c.blob[group.start] === 0) ledger.mark(group.start, group.length, 'infrared');
    for (const address of group.addresses) {
      attempt(() => {
        const start = irRecordStart(c, address);
        const off = start === undefined ? undefined : c.blobOffsetOf(start);
        if (start === undefined || off === undefined || address !== start + IR_RECORD_POINTER_BIAS) return;
        const pointers = irHeaderPointers(c, address);
        const period = (c.blob[off + 1] ?? 0) | ((c.blob[off + 2] ?? 0) << 8) | ((c.blob[off + 3] ?? 0) << 16);
        const write = ([one]: readonly number[]) => irBuildRecord({ periodNs: one!, start, pointers }).bytes;
        ledger.markRebuilt(off, write([period]), 'infrared', describedByChange(write, [period]));
        for (const pointer of pointers) {
          if (pointer === 0) continue;
          const at = c.blobOffsetOf(pointer);
          const words = irBlockWords(c, pointer);
          if (at === undefined || words === undefined) continue;
          // The words but the terminator, which the builder writes itself.
          const durations = words.slice(0, -1);
          const block = (from: readonly number[]) => irBuildBlock(from.map((word) => ({ mark: (word & 0x8000) !== 0, microseconds: word & 0x7fff })));
          ledger.markRebuilt(at, block(durations), 'infrared', new Set(Array.from({ length: 2 * durations.length }, (_, k) => k)));
        }
      });
    }
  }

  // The number sender: each record's three digit tables are one table, a call of each digit's send list, and its own
  // fields all zero; its three pointers name its tables.
  const listCount = listTable.length;
  const senders = numberSenders(c)?.records ?? [];
  let digitLists: number[] | undefined;
  for (const record of senders) {
    const first = record.tables[0]?.instructions ?? [];
    if (first.length === 0 || !first.every((one) => one.opcode === 0x7f && one.operand < listCount)) continue;
    const lists = first.map((one) => one.operand);
    digitLists ??= lists;
    const built = numberSenderBlock(lists);
    const described = describedByChange((numbers) => numberSenderBlock(numbers).table, lists);
    const tables = record.tables.map((table) => ledger.markRebuilt(c.blobOffsetOf(table.address) ?? -1, built.table, 'number sender', described));
    const at = c.blobOffsetOf(record.address);
    if (at !== undefined && tables.every(Boolean) && ledger.holds(at, built.record.subarray(0, SENDER_FIELDS))) {
      ledger.mark(at, built.record.length, 'number sender');
    }
  }

  // The timers: a record is a key's where it is one of `keyTimerRecords` for the pin it switches.
  const pins = new Set(DEVICE_KEYS.map((one) => one.pin));
  const timerTable = c.pointerArray(TIMER_SLOT) ?? [];
  for (const address of timerTable) {
    const at = c.blobOffsetOf(address);
    if (at === undefined) continue;
    const pin = (c.blob[at + 4] ?? 0) >> 4;
    if (!pins.has(pin)) continue;
    keyTimerRecords(pin).some((record, k) => ledger.markRebuilt(at, record, 'key timers',
      describedByChange(([one]) => keyTimerRecords(one!)[k]!, [pin])));
  }

  // The lists, each by the first kind whose writer gives it back from the numbers read off it, and only where those
  // numbers name what the configuration holds. **Every kind is asked of every list**, the constants' lists included,
  // and not only until one answers: a list two writers give back is counted contested, which is how the ledger shows
  // where one shape is two generators' (the start up's two calls are an action of two steps as well), rather than the
  // first-claim rule hiding it. Ownership stays the first's either way.
  const mapCount = (c.pointerArray(KEY_MAP_SLOT) ?? []).length;
  const variableCount = stateTable(c)?.count ?? 0;
  const groupSizes = groups.map((group) => group.addresses.length);
  // Whether list `index` is given back by one of the kinds named, read with that kind and written again: what a writer
  // calls, which a list's shape alone does not say. One level deep, since what the called list calls is that list's
  // own question when the loop reaches it.
  const isOfKind = (index: number, kinds: readonly string[]): boolean => {
    const body = listBody(index);
    const at = listAt(index);
    if (body === undefined || at === undefined) return false;
    return NO_SCREEN_LIST_KINDS.some((kind) => {
      if (!kinds.includes(kind.name)) return false;
      const numbers = kind.read(body);
      if (numbers === undefined) return false;
      try {
        return ledger.holds(at, actionListBytes(kind.write(numbers)));
      } catch (error) {
        if (error instanceof ComposeError || error instanceof RangeError) return false;
        throw error;
      }
    });
  };
  const exists = (names: ListNames): boolean =>
    (names.lists ?? []).every((one) => one < listCount)
    && (names.calling ?? []).every(([one, kinds]) => isOfKind(one, kinds))
    && (names.records ?? []).every(([group, record]) => record < (groupSizes[group] ?? 0))
    && (names.groups ?? []).every((one) => one < groupSizes.length)
    && (names.maps ?? []).every((one) => one < mapCount)
    && (names.timers ?? []).every((one) => one < timerTable.length)
    && (names.variables ?? []).every((one) => one < variableCount)
    && (names.pins ?? []).every((one) => pins.has(one));
  listTable.forEach((_, index) => {
    const at = listAt(index);
    const body = listBody(index);
    if (at === undefined || body === undefined) return;
    // A channel spelled out first, read against the number sender's digits: its calls read as an action of several
    // steps as well, `callingList`, and the digits and the leading zero are what tell the two apart.
    const channel = digitLists === undefined ? undefined : readChannelDigits(body, digitLists);
    if (channel !== undefined && digitLists !== undefined) {
      const write = (from: readonly number[]) => actionListBytes(channelDigitsList(from, channel));
      ledger.markRebuilt(at, write(digitLists), 'channel lists', describedByChange(write, digitLists));
    }
    for (const kind of NO_SCREEN_LIST_KINDS) {
      const numbers = kind.read(body);
      if (numbers === undefined || !exists(kind.names(numbers))) continue;
      // A channel sent as a number goes through number sender record 0, which has to be there.
      if (kind.name === 'channel lists' && senders.length === 0) continue;
      const write = (from: readonly number[]) => actionListBytes(kind.write(from));
      let bytes: Uint8Array;
      try {
        bytes = write(numbers);
      } catch (error) {
        if (error instanceof ComposeError || error instanceof RangeError) continue;
        throw error;
      }
      ledger.markRebuilt(at, bytes, kind.name as NoScreenAttribution, describedByChange(write, numbers));
    }
  });

  // The key maps: stored in the compiler's hash order, and each entry a call of a list on a key some composer of the
  // family binds. The key table takes the device keys' three events and Watch TV, its send event entries being the
  // constants' already; a device's map takes the family's keys, its power, its input, its volume and the model's
  // favourite keys.
  const skin = archAt === undefined ? -1 : c.blob[archAt + 2] ?? -1;
  const deviceScans = new Set([
    ...NO_SCREEN_HARD_KEYS.map((one) => one.scan), POWER_SCAN, INPUT_KEY.scan, ...VOLUME_SCANS,
    ...(FAVOURITE_FIVE[skin] === undefined ? [] : [FAVOURITE_FIVE[skin]!.scan]), ...(FAVOURITE_SCANS[skin] ?? []),
  ]);
  const keyTableTags = new Set([
    ...DEVICE_KEYS.flatMap((key) => [PRESS | key.scan, RELEASE | key.scan, HELD | key.scan]), PRESS | WATCH_TV_SCAN,
  ]);
  (c.pointerArray(KEY_MAP_SLOT) ?? []).forEach((address, map) => {
    const at = c.blobOffsetOf(address);
    const list = taggedList(c, address);
    const extent = at === undefined ? undefined : taggedListExtent(c.blob, at);
    if (at === undefined || list === undefined || extent === undefined || extent.wide) return;
    let ordered: boolean;
    try {
      const again = inCompilerOrder(list.entries, []);
      ordered = again.every((one, k) => one.tag === list.entries[k]!.tag);
    } catch (error) {
      if (!(error instanceof ComposeError)) throw error;
      ordered = false;
    }
    if (!ordered || !ledger.holds(at, taggedListBytes(list.entries))) return;
    if (list.entries.length === 0) {
      ledger.mark(at, extent.length, 'key maps');
      return;
    }
    ledger.mark(at, 1, 'key maps');
    list.entries.forEach((entry, k) => {
      const allowed = map === 0 ? keyTableTags.has(entry.tag) : (entry.tag & 0xc0) === PRESS && deviceScans.has(entry.tag & 0x3f);
      if (!allowed || entry.opcode !== 0x7f || entry.operand >= listCount) return;
      ledger.mark(at + 1 + ENTRY_LENGTH * k, ENTRY_LENGTH, 'key maps', (offset) => {
        const within = offset - (at + 1 + ENTRY_LENGTH * k);
        return within === 1 || within === 2;
      });
    });
  });

  // The five tables of a count and three byte addresses, at the family's count widths, `NO_SCREEN_COUNT_WIDTHS`, and
  // the number sender's, one byte: the count the entries it names state, the addresses the frame's. The census's
  // reading of the same five, `noscreencensus.test.ts`, rebuilds each through `countedTable` on all seven compiles.
  const widths: Readonly<Record<string, number>> = {
    'raw-4-table': NO_SCREEN_COUNT_WIDTHS[4]!, 'raw-6-table': NO_SCREEN_COUNT_WIDTHS[KEY_MAP_SLOT]!,
    'raw-7-table': NO_SCREEN_COUNT_WIDTHS[RAW.lists]!, 'raw-8-table': NO_SCREEN_COUNT_WIDTHS[TIMER_SLOT]!,
    'raw-11-table': 1, 'slot-16-table': 1,
  };
  for (const claim of regions) {
    const width = widths[claim.owner];
    if (width === undefined) continue;
    let count = 0;
    for (let k = width - 1; k >= 0; k -= 1) count = count * 256 + (c.blob[claim.start + k] ?? 0);
    if (width + 3 * count === claim.length) ledger.mark(claim.start, claim.length, 'table headers');
  }

  return ledger.tally(regions);
}
