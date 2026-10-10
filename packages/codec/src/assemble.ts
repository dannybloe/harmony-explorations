/**
 * A setup description in, a whole container out: `todo-compile-650.md` 10.6, `docs/findings.md` sections
 * 362 and 364.
 *
 * Until this module a configuration of ours was a chain of lab scripts, each starting from a Logitech
 * compile and replacing a part: the 6.2.13 file's composers, then the 7.5 file's three screen passes,
 * then 10.2.2's wiring. This is that chain as one function with its inputs named, so that the
 * finish line's audit, 11.1, has one thing to look at and one input to swap:
 *
 * * **the setup**, the file `packages/corpus/setups/` already holds, which states the devices, the
 *   activities and their order, and which devices stay on between activities;
 * * **the donor**, a container every part comes from that no generator builds yet, named as a
 *   parameter rather than buried in a script, so that 11.1 can hand in a different one and count what
 *   is left;
 * * **the settings**, MyHarmony's and this track's, `TRACK_SETTINGS` unless given.
 *
 * **What it does, in order**, each a generator or a composer this project already has and a check that
 * it calibrated against Logitech's compiles:
 *
 * 1. checks that the donor holds nothing the setup does not, a device by the setup's name or by the
 *    `<manufacturer>_<model>` name the service's compiles of catalogue devices here carry, since no
 *    composer removes a device or an activity;
 * 2. composes every device the setup names and the donor lacks from the catalogue, in the setup's order,
 *    `composeCatalogueDevices`, section 331, which needs the archive, `options.archive`, and the model's
 *    device count, `options.maxDevices`;
 * 3. applies the setup's "keep this device on when switching Activities" with `keepDeviceOn` to the
 *    donor's activities, section 340, and refuses where the donor keeps a device on that the setup does not;
 * 4. composes every activity the setup names and the donor lacks, in the setup's order,
 *    `composeSetupActivity`: the start and the keypad from the roles, the inputs by name, the working
 *    screen from `options.screens`, the menu row, the activity's device list and its activity key;
 * 5. the idle device list, the activity menu in the setup's order and Off, section 356;
 * 6. the firmware's own screens, section 357;
 * 7. every text, section 358;
 * 8. the six pictures a rule draws, section 363;
 * 9. the firmware's wiring with the settings, sections 347 and 360;
 * 10. the state variables, value maps and name tree, section 324;
 * 11. mode 0's key list, section 315;
 * 12. **drops every action list the donor named and the result names by nothing**, renumbering every
 *     list after it, which no step before could do since each put its pieces back at the donor's
 *     numbering: with the wiring's three settings off that is the 70 lists section 360 counted;
 * 13. moves what the composers parked where Logitech's compiler parks nothing into the body, places
 *     what is parked in front of a table and the picture bank, section 328, and lays the frame out,
 *     section 318.
 *
 * **What it cannot do yet, measured in section 364.** An activity's working screen is not in the setup
 * file, which is the platform's soft button list and a person's choice, section 323, so it is an input of
 * its own, `options.screens`, named rather than read off a Logitech file. And the composers need a donor
 * that already holds an activity. On `harvest_650_two_devices`, two devices and no activity, the device
 * composer finds the device list through the activity menu, which it knows by its activity rows, and
 * there are none, though three modes map the key under Devices through the activity counter; the fonts
 * lack letters the setup's labels need; and the activity composer tells the records keyed by an activity
 * apart by the activities already there. On a one device compile the lab also holds, every composition
 * is refused first because no single list switches every device off. And the assembly's own screen
 * record pass reads the activity menu the same way, so even a setup of nothing but such a donor's devices
 * is refused.
 *
 * Arch 14 only and measured on the Harmony 650 alone; the Harmony 600 and 700 are refused, see
 * `ASSEMBLY_SKINS`. Read only towards hardware, like everything in this package: the result is bytes.
 */
import { u16, u8 } from './bytes.ts';
import { ARCH_RECORD_LENGTH, BINDING_SLOT, CLOCK_SECTION_LENGTH, END_MARKER_LENGTH, INSTRUCTION_LENGTH,
  TRAILER_CHECKSUM_OFFSET, parse, type Container } from './gspm.ts';
import { assertQueueFits } from './queue.ts';
import { claims, coverage } from './coverage.ts';
import { pointers, trailerAgrees } from './growth.ts';
import { roundTrip } from './emit.ts';
import { saveEdits } from './edit.ts';
import {
  ACTION_LIST_INDEX_OPCODE, assertStateTableConsistent, handlerSets, modePages, modeRecords, pageListCopies,
  stateRecords, taggedListExtent,
} from './sections.ts';
import { numberSenders, timers } from './tables.ts';
import { SCREEN_QUEUE_INSTRUCTION, SCREEN_TEXT_INLINE, reachablePrograms, screenProgram } from './screen.ts';
import { characterMap, decode, glyphsReferencedBy } from './text.ts';
import { activities, devices, deviceVariables } from './inventory.ts';
import type { ContainerLayout, ContainerPiece } from './frame.ts';
import { layOutContainer, takeApart } from './frame.ts';
import { LOOSE_KINDS, loosen, placePieces } from './placer.ts';
import { buildStateTables, describeStateTables, withStateTables } from './statetables.ts';
import {
  buildWiring, builtPieces, checkWiring, describeWiring, withWiring, wiringModelOfSkin, type WiringSettings,
} from './wiring.ts';
import { modeZeroKeyList } from './modezero.ts';
import { checkPictures, describePictures, withPictures } from './pictures.ts';
import {
  activityEntriesByName, buildScreenRecords, checkScreenRecords, describeScreenRecords, inActivityOrder,
  withScreenRecords,
} from './screenrecords.ts';
import { buildFirmwareScreens, checkFirmwareScreens, describeFirmwareScreens, withFirmwareScreens } from './firmwarescreens.ts';
import { buildScreenTexts, checkScreenTexts, describeScreenTexts, withScreenTexts } from './screentexts.ts';
import {
  ComposeError, composeActivity, composeActivityDeviceList, composeActivityMenuRow, composeActivityScreen, keepDeviceOn,
  nextActivityValue, startsSwitchingOff,
} from './compose.ts';
import {
  activityFromRoles, activityKeysFromRoles, activityScreenRows, deviceKeypadLists, type ActivityDevice,
  type ActivityRoleName,
} from './activityroles.ts';
import { composeCatalogueDevices, type ComposedCatalogueDevice } from './composecatalogue.ts';
import { inputPlan, inputTarget } from './inputs.ts';
import { catalogueDriving } from './driving.ts';
import { activityPauseGroups, composeSequence } from './sequence.ts';
import type { ActivityKey } from './activitykeys.ts';
import type { ComposeRow } from './compose.ts';

/** A refusal, named so a caller can tell a setup the donor cannot serve from a bug. */
export class AssemblyError extends Error {}

// ---------------------------------------------------------------------------------------------------
// The setup, as `packages/corpus/setups/` states it
// ---------------------------------------------------------------------------------------------------

/**
 * One device of a setup: what the remote calls it, its catalogue entry as `<manufacturer>/<file>`, and
 * MyHarmony's "I want to keep this device on when switching Activities", absent meaning off. The
 * corpus package's `SetupDevice` is this type; it lives here because the assembly reads it and the
 * corpus package depends on this one, not the other way round.
 */
export interface SetupDevice {
  readonly name: string;
  readonly device: string;
  readonly poweredOnBetweenActivities?: boolean;
}

/** One activity of a setup: its name, MyHarmony's type, and its devices with their input and jobs. */
export interface SetupActivity {
  readonly name: string;
  readonly type: string;
  readonly devices: readonly { device: string; input?: string; roles: readonly ActivityRoleName[] }[];
}

/** A setup: devices and the activities that use them, in the order the activity menu lists them. */
export interface SetupDescription {
  readonly about?: string;
  readonly devices: readonly SetupDevice[];
  readonly activities: readonly SetupActivity[];
}

/**
 * One item of an activity's working screen, which the setup file does not state, section 323: a device's
 * command by the label that device's own screen draws it under, or a sequence, Logitech's "sequence" of
 * MyHarmony, by its name and its steps. A step sends the command a device's key sends, by the key's scan
 * code, `keys.md`, or pauses, in tenths of a second.
 */
export type AssemblyScreenItem =
  | { readonly device: string; readonly command: string }
  | { readonly sequence: string; readonly steps: readonly AssemblySequenceStep[] };
export type AssemblySequenceStep = { readonly device: string; readonly scan: number } | { readonly pause: number };

/**
 * MyHarmony's activity type to the Harmony 650's activity key; `Custom` holds none. An inference: it agrees
 * with Logitech's compiles of the test setup, the only ones whose types are known here, while section 314
 * reads the account's root button map as what decides which activity a key starts. The three typed
 * branches run in no test, since every donor the composers take already holds its typed activities.
 */
const KEY_OF_TYPE: Readonly<Record<string, ActivityKey | undefined>> = {
  WatchTV: 'Watch TV', WatchDvd: 'Watch a Movie', ListenToMusic: 'Listen to Music', Custom: undefined,
};

// ---------------------------------------------------------------------------------------------------
// Which lists are named, and dropping the ones that are not
// ---------------------------------------------------------------------------------------------------

/** What holds an instruction naming an action list. */
export type ListSiteHolder =
  | 'action list' | 'mode key map' | 'page list' | 'page list copy' | 'base slot 9 entry' | 'timer'
  | 'state transition' | 'screen program' | 'number sender' | 'leading list';

/** One `0x7F`: where its operand sits in the blob, the list it names, and what holds it. */
export interface ListCallSite {
  /** Blob offset of the instruction's operand, the `u16` that is the list's index. */
  at: number;
  list: number;
  holder: ListSiteHolder;
  /** For a site inside an action list, that list's index. */
  within?: number;
}

/**
 * Every instruction in the container that names an action list, which is opcode `0x7F` and nothing
 * else, section 34: the action lists' own calls, every tagged list (mode key maps, page lists, their
 * second copies, base slot 9's entries), the timers, the state transitions, every instruction a screen
 * program queues (where base slot 14's cases lead, section 279), the number senders and base slot 8's
 * leading list.
 *
 * **The one enumeration a renumbering of base slot 10 can rest on**, the same role `stateVariableSite`
 * plays for variables, and the same hazard if it is short: a site it misses keeps naming the old index
 * and the configuration parses and runs the wrong list. The walk of section 360's `orphans.ts` read
 * the same holders but only the first instruction a value map case's program queues and not the number
 * senders, which did not matter there, since it counted only what a composition stopped naming. It matters for a renumbering: every list a screen
 * program queues is named by that program and by nothing else, 5769 on `h650_test_config_clean`.
 * An instruction reached twice, a list two tables share, is one site.
 */
export function listCallSites(c: Container): ListCallSite[] {
  const sites = new Map<number, ListCallSite>();
  const blob = c.blob;
  const add = (operandAt: number, holder: ListSiteHolder, within?: number): void => {
    if (operandAt < 0 || operandAt + INSTRUCTION_LENGTH > blob.length) return;
    if (blob[operandAt + 2] !== ACTION_LIST_INDEX_OPCODE || sites.has(operandAt)) return;
    sites.set(operandAt, { at: operandAt, list: u16(blob, operandAt), holder, ...(within === undefined ? {} : { within }) });
  };
  const offsetOf = (address: number): number | undefined => c.blobOffsetOf(address);

  // The action lists, through the table, so a list two entries share is walked once.
  const table = c.pointerArray(10) ?? [];
  const seenLists = new Set<number>();
  table.forEach((address, index) => {
    if (seenLists.has(address)) return;
    seenLists.add(address);
    for (const site of c.actionListSites(address) ?? []) add(site.operandAt, 'action list', index);
  });

  // Every tagged list: the instruction is an entry's last three bytes, in either form.
  const tagged = (at: number | undefined, holder: ListSiteHolder): void => {
    if (at === undefined) return;
    const extent = taggedListExtent(blob, at);
    if (extent === undefined || at + extent.length > blob.length) return;
    const stride = extent.wide ? 5 : 4;
    const first = extent.wide ? 2 : 1;
    for (let k = 0; k < extent.count; k += 1) add(at + first + stride * k + stride - INSTRUCTION_LENGTH, holder);
  };
  for (const record of modeRecords(c) ?? []) tagged(offsetOf(record.start), 'mode key map');
  for (const page of modePages(c)) tagged(offsetOf(page.list), 'page list');
  // `pageListCopies` answers blob offsets, not addresses: nothing names a copy, so it has no address.
  for (const at of pageListCopies(c)) tagged(at, 'page list copy');
  for (const address of handlerSets(c)?.addresses ?? []) tagged(offsetOf(address), 'base slot 9 entry');

  // A timer's one instruction, `u8 kind; u24 duration; u16 operand; u8 opcode`, section 43.
  for (const timer of timers(c)?.records ?? []) {
    const at = offsetOf(timer.address);
    if (at !== undefined) add(at + 4, 'timer');
  }
  // A transition, `u8 zero; i16 from; i16 to; u16 operand; u8 opcode`, section 86.
  for (const record of stateRecords(c) ?? []) for (const value of record.values) add(value.start + 5, 'state transition');
  // An instruction a screen program queues, opcode 17's three operand bytes.
  for (const [, program] of reachablePrograms(c)) {
    for (const one of program) if (one.opcode === SCREEN_QUEUE_INSTRUCTION) add(one.start + 1, 'screen program');
  }
  // A number sender's three instructions at +5, +8 and +11, and its three digit tables of ten.
  for (const record of numberSenders(c)?.records ?? []) {
    const at = offsetOf(record.address);
    if (at !== undefined) for (const field of [5, 8, 11]) add(at + field, 'number sender');
    for (const digits of record.tables) {
      const from = offsetOf(digits.address);
      if (from !== undefined) for (let d = 0; d < digits.instructions.length; d += 1) add(from + INSTRUCTION_LENGTH * d, 'number sender');
    }
  }
  // Base slot 8's leading list: a count, then one instruction per entry point, section 286.
  const lead = c.sections[BINDING_SLOT];
  const leadAt = lead === undefined || lead.isNull ? undefined : offsetOf(lead.address);
  if (leadAt !== undefined) for (let k = 0; k < u8(blob, leadAt); k += 1) add(leadAt + 1 + INSTRUCTION_LENGTH * k, 'leading list');

  return [...sites.values()].sort((a, b) => a.at - b.at);
}

/**
 * The action lists something reaches: named by a site outside every action list, or called by a list
 * that is reached. A list only lists that nothing reaches call, a dead chain, is not reached, which is
 * where this differs from section 360's walk, which dropped lists until nothing changed and so kept a
 * chain that calls itself round.
 */
export function namedLists(c: Container, sites: readonly ListCallSite[] = listCallSites(c)): Set<number> {
  const calls = new Map<number, number[]>();
  const named = new Set<number>();
  for (const site of sites) {
    if (site.within === undefined) {
      named.add(site.list);
    } else if (site.list !== site.within) {
      const out = calls.get(site.within) ?? [];
      out.push(site.list);
      calls.set(site.within, out);
    }
  }
  const pending = [...named];
  while (pending.length > 0) {
    for (const next of calls.get(pending.pop() as number) ?? []) {
      if (!named.has(next)) {
        named.add(next);
        pending.push(next);
      }
    }
  }
  return named;
}

/** What `dropLists` did. */
export interface DroppedLists {
  bytes: Uint8Array;
  /** The indices dropped, ascending, in the input's numbering. */
  dropped: number[];
  /** Bytes the dropped lists held. */
  length: number;
  /** How many sites were renumbered. */
  renumbered: number;
}

/**
 * Take action lists out of base slot 10 and renumber every list after each, at every site
 * `listCallSites` finds.
 *
 * Refuses, rather than leaving a wrong index behind: a dropped list that something reached still names
 * (outside the dropped lists themselves), a dropped list below `floor`, which is where the wiring's
 * front sits and where an index is the firmware's and not ours, section 347, a dropped list whose piece
 * carries more than the list, and a piece anything but base slot 10's table names. The result is laid
 * out by `layOutContainer`, so every address moves with it.
 *
 * `sites` is the census the renumbering rewrites, `listCallSites` unless given. It is a parameter so that
 * a test can hand in the census short of one holder and watch the drop refuse, which is how each holder
 * is shown to be needed rather than assumed to be. The result is checked by `checkRenumbering` against a
 * census of its own, so a short one is refused rather than written.
 */
export function dropLists(
  c: Container, drop: Iterable<number>, floor = 0, sites: readonly ListCallSite[] = listCallSites(c),
): DroppedLists {
  const dropping = [...new Set(drop)].sort((a, b) => a - b);
  const lists = c.actionLists();
  if (lists === undefined) throw new AssemblyError('base slot 10 does not read');
  if (dropping.length === 0) return { bytes: c.blob, dropped: [], length: 0, renumbered: 0 };
  for (const index of dropping) {
    if (!Number.isInteger(index) || index < 0 || index >= lists.length) throw new AssemblyError(`there is no list ${index} to drop`);
    if (index < floor) throw new AssemblyError(`list ${index} is below ${floor}, where an index is the firmware's`);
  }
  const gone = new Set(dropping);
  for (const site of sites) {
    if (gone.has(site.list) && (site.within === undefined || !gone.has(site.within))) {
      throw new AssemblyError(`list ${site.list} is named by a ${site.holder} at ${site.at}${site.within === undefined ? '' : ` in list ${site.within}`}, so it cannot be dropped`);
    }
  }
  // The new index of a kept list: its old one less every dropped list below it.
  const below = (index: number): number => {
    let low = 0;
    let high = dropping.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if ((dropping[mid] as number) < index) low = mid + 1;
      else high = mid;
    }
    return low;
  };
  const bytes = c.blob.slice();
  let renumbered = 0;
  for (const site of sites) {
    if (site.within !== undefined && gone.has(site.within)) continue;
    const now = site.list - below(site.list);
    if (now === site.list) continue;
    bytes[site.at] = now & 0xff;
    bytes[site.at + 1] = now >>> 8;
    renumbered += 1;
  }

  // The table and the pieces. The rewritten operands change no address, so taking the rewritten blob
  // apart cuts it exactly as the input would be cut.
  const layout = takeApart(parse(bytes));
  const tableHead = layout.sections[10]?.head;
  if (tableHead === undefined || tableHead.length !== 1) throw new AssemblyError('base slot 10\'s table is not one piece');
  const table = tableHead[0] as ContainerPiece;
  const refs = [...table.refs].sort((a, b) => a.at - b.at);
  const width = table.bytes.length - 3 * refs.length;
  if (refs.length !== lists.length || (width !== 1 && width !== 2)) throw new AssemblyError('base slot 10\'s table does not read as its lists');
  const keptRefs = refs.filter((_, index) => !gone.has(index));
  const count = keptRefs.length;
  if (count >= 1 << (8 * width)) throw new AssemblyError(`${count} lists do not fit a ${width} byte count`);
  const out = new Uint8Array(width + 3 * count);
  out[0] = count & 0xff;
  if (width === 2) out[1] = count >>> 8;
  const newTable: ContainerPiece = {
    ...table,
    bytes: out,
    refs: keptRefs.map((ref, k) => ({ ...ref, at: width + 3 * k })),
  };
  const droppedPieces = new Set<ContainerPiece>();
  let length = 0;
  dropping.forEach((index) => {
    const ref = refs[index];
    if (ref === undefined || !('to' in ref) || ref.offset !== 0) throw new AssemblyError(`list ${index} is not a piece of its own`);
    const piece = ref.to;
    const own = 1 + INSTRUCTION_LENGTH * (lists[index] as unknown[]).length;
    if (piece.bytes.length !== own) {
      throw new AssemblyError(`list ${index}'s piece holds ${piece.bytes.length} bytes where the list is ${own}, so dropping it would drop what follows`);
    }
    if (keptRefs.some((kept) => 'to' in kept && kept.to === piece)) return; // shared with a kept index
    if (!droppedPieces.has(piece)) length += piece.bytes.length;
    droppedPieces.add(piece);
  });
  const all = [layout.keyTable, ...layout.body,
    ...layout.sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])), ...layout.pictures];
  for (const piece of all) {
    if (piece === table || droppedPieces.has(piece)) continue;
    if (piece.refs.some((ref) => 'to' in ref && droppedPieces.has(ref.to))) {
      throw new AssemblyError(`a piece${piece.owner === undefined ? '' : ` (${piece.owner})`} names a list being dropped by its address`);
    }
  }
  const keep = (run: ContainerPiece[]): ContainerPiece[] =>
    run.filter((piece) => !droppedPieces.has(piece)).map((piece) => (piece === table ? newTable : piece));
  const result: ContainerLayout = {
    ...layout,
    body: keep(layout.body),
    sections: layout.sections.map((s) => (s === undefined ? s : { before: keep(s.before), head: keep(s.head) })),
    pictures: keep(layout.pictures),
  };
  const laid = layOutContainer(result).bytes;
  checkRenumbering(c, parse(laid), dropping);
  return { bytes: laid, dropped: dropping, length, renumbered };
}

/**
 * That a drop renumbered every list and nothing else: a fresh census of `after`, holder by holder and in
 * walk order, names exactly what `before`'s did outside the dropped lists, each index less the dropped
 * lists below it; and every kept list holds what it held, its own calls renumbered the same way.
 *
 * **Recomputed from both containers, never from the census the drop was handed**, so a census short of a
 * holder cannot vouch for itself. That is what makes it worth having: no reader of what a person sees
 * follows the lists a screen program queues, opcode 17, and on `h650_test_config_clean` 5759 of those
 * 5769 places name a list of different content when they are left at their old numbers, which every
 * other check here passes.
 */
export function checkRenumbering(before: Container, after: Container, dropped: readonly number[]): void {
  const gone = new Set(dropped);
  const sorted = [...gone].sort((a, b) => a - b);
  const map = (index: number): number => {
    let low = 0;
    let high = sorted.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if ((sorted[mid] as number) < index) low = mid + 1;
      else high = mid;
    }
    return index - low;
  };
  const was = listCallSites(before)
    .filter((site) => site.within === undefined || !gone.has(site.within))
    .map((site) => `${site.holder} ${map(site.list)}${site.within === undefined ? '' : ` in ${map(site.within)}`}`);
  const now = listCallSites(after).map((site) => `${site.holder} ${site.list}${site.within === undefined ? '' : ` in ${site.within}`}`);
  if (was.length !== now.length) throw new AssemblyError(`the drop left ${now.length} places naming a list where ${was.length} were expected`);
  const wrong = was.findIndex((one, k) => one !== now[k]);
  if (wrong >= 0) throw new AssemblyError(`a place names ${now[wrong]} after the drop where it named ${was[wrong]}, renumbered`);
  const listsBefore = before.actionLists() ?? [];
  const listsAfter = after.actionLists() ?? [];
  if (listsAfter.length !== listsBefore.length - gone.size) throw new AssemblyError('the drop did not take out exactly the lists it names');
  listsBefore.forEach((list, index) => {
    if (gone.has(index)) return;
    const kept = listsAfter[map(index)];
    const same = kept !== undefined && kept.length === list.length && list.every((one, k) =>
      one.opcode === kept[k]?.opcode
      && (one.opcode === ACTION_LIST_INDEX_OPCODE ? map(one.operand) : one.operand) === kept[k]?.operand);
    if (!same) throw new AssemblyError(`list ${index}, now ${map(index)}, does not hold what it held`);
  });
}

// ---------------------------------------------------------------------------------------------------
// The assembly
// ---------------------------------------------------------------------------------------------------

/**
 * The skins the assembly takes. The Harmony 650 alone, skin 72, which is the one model every step was
 * run on together; each generator states its own wider scope, and what the Harmony 600 and 700 would
 * need is in section 362: the 700's wiring refuses the Remote Assistant off, and neither model has had
 * this chain run on one of its compiles.
 */
export const ASSEMBLY_SKINS: ReadonlySet<number> = new Set([72]);

/**
 * This track's settings, `todo-compile-650.md`: the screen lit 20 seconds, the 650's default (6.2.13),
 * the tilt sensor on (4.3.3), and the Remote Assistant, the restore of saved delays, Help and the tour
 * all left out (4.3.2, 3.13, 7.4, section 360). The boot step is the Harmony 700's alone.
 */
export const TRACK_SETTINGS: Readonly<WiringSettings> = {
  glowTime: 20,
  tiltSensor: true,
  remoteAssistant: false,
  bootStep: false,
  tourShown: false,
  delayRestore: false,
  help: false,
};

export interface AssembleOptions {
  /** The container every part no generator builds is taken from: a Logitech compile, or a library. */
  readonly donor: Uint8Array;
  /** Settings over `TRACK_SETTINGS`. */
  readonly settings?: Partial<WiringSettings>;
  /** The build time to stamp, `YYYY-MM-DDTHH:MM:SS`; absent keeps the donor's. A write stamps again. */
  readonly builtAt?: string;
  /** False keeps the donor's placement of parked pieces and pictures instead of `placePieces`'. */
  readonly place?: boolean;
  /**
   * The checkout of the device catalogue's archive, decision 15, which composing a device needs, and
   * naming a donor device's input does, since an input's value is its place in the catalogue's list.
   */
  readonly archive?: string;
  /**
   * The most devices the model holds, which composing a device needs: `maxDevices` in `packages/usb`'s
   * model table, eight on a Harmony 650, passed in since this package does not depend on that one.
   */
  readonly maxDevices?: number;
  /**
   * Each composed activity's working screen by the activity's name, which the setup file does not state.
   * Absent for an activity composes it with an empty working screen.
   */
  readonly screens?: Readonly<Record<string, readonly AssemblyScreenItem[]>>;
}

/** One step of the assembly, for a caller that reports. */
export interface AssemblyStep {
  step: string;
  /** The container's length after the step. */
  bytes: number;
  detail?: string;
}

export interface Assembled {
  bytes: Uint8Array;
  container: Container;
  steps: AssemblyStep[];
  /** The donor's list indices dropped because nothing in the result names them any more. */
  dropped: number[];
  /** The devices `keepDeviceOn` was applied to, by the setup's name. */
  keptOn: string[];
  /** The setup's devices and activities the composers added, by the setup's name, in the order added. */
  composed: { devices: string[]; activities: string[] };
}

/** A device's name as base slot 0 spells it, with `_` for a space, read back as the setup writes it. */
const spoken = (name: string | undefined): string => (name ?? '').replaceAll('_', ' ');

/**
 * Build the setup's container out of the donor and every generator there is, refusing where the donor
 * cannot serve the setup, and check the result as every generator's own calibration checks a compile.
 */
export function assembleSetup(setup: SetupDescription, options: AssembleOptions): Assembled {
  let c = parse(options.donor);
  if (c.architecture !== 14) throw new AssemblyError(`the assembly is arch 14's, and the donor is arch ${c.architecture}`);
  const skin = (c.versionWord ?? -1) & 0xff;
  if (!ASSEMBLY_SKINS.has(skin)) throw new AssemblyError(`the assembly is measured on the Harmony 650, skin 72, and the donor is skin ${skin}`);
  const settings: WiringSettings = { ...TRACK_SETTINGS, ...options.settings };
  const steps: AssemblyStep[] = [];
  const note = (step: string, detail?: string): void => {
    steps.push({ step, bytes: c.blob.length, ...(detail === undefined ? {} : { detail }) });
  };
  note('donor');

  // 1. The donor holds nothing the setup does not, since no composer removes a device or an activity.
  //    A donor device is the setup's by the setup's name, or by `<manufacturer>_<model>`, the name the
  //    service's compiles of catalogue devices for this project carry; other owners' configurations name
  //    a device by manufacturer and type instead. It keeps the donor's label either way.
  const wantedDevices = new Set(setup.devices.map((one) => one.name));
  if (wantedDevices.size !== setup.devices.length) throw new AssemblyError('the setup names one device twice');
  const setupDeviceOf = (label: string | undefined): SetupDevice | undefined =>
    setup.devices.find((one) => one.name === spoken(label) || one.device.replace('/', '_') === label);
  for (const one of devices(c)) {
    if (setupDeviceOf(one.name) === undefined) {
      throw new AssemblyError(`the donor holds a device called ${spoken(one.name)} that the setup does not, and no composer removes one`);
    }
  }
  const names = setup.activities.map((one) => one.name);
  if (new Set(names).size !== names.length) throw new AssemblyError('the setup names one activity twice');
  for (const name of activities(c).map((one) => spoken(one.name))) {
    if (!names.includes(name)) {
      throw new AssemblyError(`the donor holds an activity called ${name} that the setup does not, and no composer removes one`);
    }
  }
  /** The donor's or a composed device's label for a setup device, once it is in the container. */
  const labelOf = (name: string): string | undefined =>
    devices(c).find((one) => setupDeviceOf(one.name)?.name === name)?.name;

  // 2. The setup's devices the donor lacks, from the catalogue, in the setup's order, section 331.
  const composed = { devices: [] as string[], activities: [] as string[] };
  const missingDevices = setup.devices.filter((one) => labelOf(one.name) === undefined);
  const composedDevices = new Map<string, ComposedCatalogueDevice>();
  if (missingDevices.length > 0) {
    if (options.archive === undefined) {
      throw new AssemblyError(`the donor lacks ${missingDevices.map((one) => one.name).join(', ')}, and composing a device needs the catalogue's archive`);
    }
    if (options.maxDevices === undefined) {
      throw new AssemblyError(`the donor lacks ${missingDevices.map((one) => one.name).join(', ')}, and composing a device needs the model's device count`);
    }
    const requests = missingDevices.map((one) => {
      const [manufacturer, model] = one.device.split('/');
      if (manufacturer === undefined || model === undefined) throw new AssemblyError(`${one.name}'s device is not <manufacturer>/<model>`);
      return { manufacturer, model, label: one.name, full: true, inputs: true };
    });
    let result;
    try {
      result = composeCatalogueDevices(c, options.archive, requests, { maxDevices: options.maxDevices });
    } catch (error) {
      if (error instanceof ComposeError) throw new AssemblyError(`composing ${missingDevices.map((one) => one.name).join(', ')}: ${error.message}`);
      throw error;
    }
    c = parse(result.bytes);
    result.devices.forEach((one, k) => composedDevices.set(missingDevices[k]!.name, one));
    composed.devices.push(...missingDevices.map((one) => one.name));
    note('devices composed', composed.devices.join(', '));
  }

  // 3. Keep on between activities, section 340, on the activities already there. A device with no
  //    power variable is always on. The activities composed below leave a kept on device on themselves.
  const keptOn: string[] = [];
  const present = activities(c).map((one) => spoken(one.name));
  /** The power variable of a setup device, by its label in the container. */
  const powerOf = (name: string): number | undefined => {
    const label = labelOf(name);
    return deviceVariables(c).find((one) => one.device === label && one.property === 'Power')?.index;
  };
  for (const wanted of setup.devices) {
    const power = powerOf(wanted.name);
    if (power === undefined || present.length === 0) continue;
    const off = new Set([...startsSwitchingOff(c, power).values()].flatMap((one) => [...one].map(spoken)));
    const unused = setup.activities.filter((one) => present.includes(one.name)
      && !one.devices.some((d) => d.device === wanted.name)).map((one) => one.name);
    if (wanted.poweredOnBetweenActivities === true) {
      if (off.size > 0) {
        c = parse(keepDeviceOn(c, power).bytes);
        keptOn.push(wanted.name);
      }
    } else if (unused.some((name) => !off.has(name))) {
      throw new AssemblyError(`the donor keeps ${wanted.name} on in ${unused.filter((name) => !off.has(name)).join(', ')}, `
        + 'which the setup does not ask for, and no composer puts a switch off back');
    }
  }
  if (keptOn.length > 0) note('kept on', keptOn.join(', '));

  // 4. The setup's activities the donor lacks, in the setup's order: the start and the keypad from the
  //    roles, section 323, the inputs by their names, the working screen from `options.screens`, its
  //    sequences first, the menu row and the activity's own device list, `compose-activity.ts`'s route.
  for (const activity of setup.activities) {
    if (activities(c).some((one) => spoken(one.name) === activity.name)) continue;
    try {
      c = composeSetupActivity(c, setup, activity, options, labelOf, powerOf, composedDevices);
    } catch (error) {
      if (error instanceof ComposeError || error instanceof AssemblyError) {
        throw new AssemblyError(`composing ${activity.name}: ${error.message}`);
      }
      throw error;
    }
    composed.activities.push(activity.name);
    note('activity composed', activity.name);
  }
  const namedBefore = namedLists(c);

  // 5. The idle device list, the activity menu in the setup's order, and Off.
  let layout = takeApart(c);
  const records = describeScreenRecords(c, layout);
  const spec = inActivityOrder(records.spec, activityEntriesByName(c, names));
  c = parse(layOutContainer(withScreenRecords(layout, buildScreenRecords(spec, c), records.place)).bytes);
  note('screen records');

  // 6. The firmware's own screens.
  layout = takeApart(c);
  const firmware = describeFirmwareScreens(c, layout);
  c = parse(layOutContainer(withFirmwareScreens(layout, buildFirmwareScreens(firmware.spec, c), firmware.place)).bytes);
  note('firmware screens');

  // 7. Every text.
  layout = takeApart(c);
  const texts = describeScreenTexts(c, layout);
  c = parse(layOutContainer(withScreenTexts(layout, buildScreenTexts(texts.spec, c), texts.place)).bytes);
  note('texts');

  // 8. The pictures a rule draws, section 363; the artwork and any picture its table does not know stay.
  layout = takeApart(c);
  c = parse(layOutContainer(withPictures(layout, describePictures(layout))).bytes);
  note('pictures');

  // 9. The wiring, with the settings.
  layout = takeApart(c);
  const wiring = describeWiring(layout);
  if (wiringModelOfSkin(skin) !== wiring.model) throw new AssemblyError('the wiring reads another model than the skin names');
  const built = buildWiring({ ...wiring, settings });
  c = parse(layOutContainer(withWiring(layout, built)).bytes);
  note('wiring', JSON.stringify(settings));

  // 10. The state tables.
  layout = takeApart(c);
  c = parse(layOutContainer(withStateTables(layout, buildStateTables(describeStateTables(layout)))).bytes);
  note('state tables');

  // 11. Mode 0's key list, after the end marker.
  // The piece is written in place, since base slot 6's table names it as mode 0's record: a new object
  // would leave that address naming a piece the layout no longer holds.
  layout = takeApart(c);
  const zero = modeZeroKeyList(wiring.model);
  if (zero.length !== layout.keyTable.bytes.length || layout.keyTable.refs.length > 0) {
    throw new AssemblyError(`mode 0's key list is ${zero.length} bytes where the donor's key table piece is ${layout.keyTable.bytes.length}`);
  }
  layout.keyTable.bytes = zero;
  c = parse(layOutContainer(layout).bytes);
  note('mode 0');

  // 12. The lists the donor named and nothing names now. Below the wiring's front nothing is dropped.
  const namedAfter = namedLists(c);
  const orphans = [...namedBefore].filter((index) => !namedAfter.has(index));
  const dropped = dropLists(c, orphans, built.frontLength);
  c = parse(dropped.bytes);
  note('lists dropped', `${dropped.dropped.length} lists, ${dropped.length} bytes, ${dropped.renumbered} sites renumbered`);

  // 13. Placement and the frame.
  if (options.place !== false) {
    const into = composedIntoBody(takeApart(c));
    c = parse(layOutContainer(placePieces(loosen(into.layout)).layout).bytes);
    note('placed', into.moved === 0 ? undefined : `${into.moved} composed pieces moved into the body first`);
  }
  if (options.builtAt !== undefined) {
    c = parse(saveEdits(c, [], options.builtAt).bytes);
    note('stamped', options.builtAt);
  }

  checkAssembled(c);
  return { bytes: c.blob, container: c, steps, dropped: dropped.dropped, keptOn, composed };
}

/** The group of the device a setup names, through its label in the container. */
function groupOfDevice(c: Container, label: string | undefined, name: string): number {
  const group = label === undefined ? undefined : devices(c).find((one) => one.name === label)?.group;
  if (group === undefined) throw new AssemblyError(`the setup's device ${name} is not in the container`);
  return group;
}

/**
 * One activity of the setup composed onto `c`, the route `compose-activity.ts` takes: the start's writes
 * and the keypad from the roles, `activityFromRoles`, with each input written by its place in the
 * catalogue's list of the device's inputs, which is how the composer numbers a composed device's and how
 * Logitech's compiler numbers its own, section 321; the devices the setup keeps on between activities get
 * no write of 0, section 340; the working screen from `options.screens`, a sequence composed first as
 * `composeSequence` composes one; then the menu row, the activity's own device list, and its activity key
 * by its type, section 314.
 */
function composeSetupActivity(
  c: Container, setup: SetupDescription, activity: SetupActivity, options: AssembleOptions,
  labelOf: (name: string) => string | undefined, powerOf: (name: string) => number | undefined,
  composedDevices: ReadonlyMap<string, ComposedCatalogueDevice>,
): Container {
  if (!(activity.type in KEY_OF_TYPE)) throw new AssemblyError(`${activity.name}'s type ${activity.type} is not one this assembly knows`);
  const listed: ActivityDevice[] = activity.devices.map((one) => {
    const label = labelOf(one.device);
    const group = groupOfDevice(c, label, one.device);
    if (one.input === undefined) return { group, roles: one.roles };
    const setupDevice = setup.devices.find((each) => each.name === one.device);
    const own = composedDevices.get(one.device)?.inputs;
    let names: readonly string[] | undefined;
    if (own !== undefined) {
      names = own.input === undefined ? undefined : [...own.input.values.keys()];
    } else {
      if (options.archive === undefined) {
        throw new AssemblyError(`${activity.name} puts ${one.device} on ${one.input}, and naming a donor device's input needs the catalogue's archive`);
      }
      const [slug, file] = (setupDevice?.device ?? '').split('/');
      names = inputPlan(catalogueDriving(options.archive, slug ?? '', file ?? '')).input?.values;
    }
    const variable = deviceVariables(c).find((each) => each.device === label && each.property === 'Input')?.index;
    // A device with one input that does not step has no input variable, and Logitech's compiler writes
    // none for it, section 321: the input named is the only one there is.
    if (names === undefined && variable === undefined) return { group, roles: one.roles };
    // Logitech's compile of the two device donor gives neither device an input variable, where the
    // catalogue lists ten inputs for its television, so that is said apart from an input name the
    // catalogue does not know.
    if (variable === undefined) throw new AssemblyError(`${one.device} has no input variable here to put on ${one.input}`);
    const value = names?.indexOf(one.input) ?? -1;
    if (value < 0) throw new AssemblyError(`${one.device} has no input called ${JSON.stringify(one.input)}`);
    if (own !== undefined) {
      const target = inputTarget(own, one.input);
      if (target.value !== value) throw new AssemblyError(`${one.device}'s ${one.input} is ${target.value} to its composer and ${value} by its place`);
    }
    return { group, roles: one.roles, input: { variable, value } };
  });
  const from = activityFromRoles(c, listed);
  const keep = new Set<number>();
  for (const one of setup.devices) {
    const power = one.poweredOnBetweenActivities === true ? powerOf(one.name) : undefined;
    if (power !== undefined) keep.add(power);
  }
  const targets = from.targets.filter((one) => !(one.value === 0 && keep.has(one.variable)));
  const keys = activityKeysFromRoles(c, from.roles);

  // The working screen, in the order given; a sequence's lists are appended, so the rows read before
  // it keep their numbers.
  const powered = (group: number): boolean => {
    const label = devices(c).find((each) => each.group === group)?.name;
    return deviceVariables(c).some((each) => each.device === label && each.property === 'Power');
  };
  const pauseGroups = listed.filter((one) => powered(one.group)).map((one) => one.group);
  const rows: ComposeRow[] = [];
  let sequenced = false;
  for (const item of options.screens?.[activity.name] ?? []) {
    if ('device' in item) {
      const group = groupOfDevice(c, labelOf(item.device), item.device);
      rows.push(...activityScreenRows(c, [{ group, label: item.command }]));
      continue;
    }
    const lists = c.actionLists() ?? [];
    const interKeyDelays: Record<number, number> = {};
    const steps = item.steps.map((step) => {
      if ('pause' in step) return { pause: step.pause };
      const group = groupOfDevice(c, labelOf(step.device), step.device);
      const list = deviceKeypadLists(c, group).get(step.scan);
      const body = list === undefined ? undefined : lists[list];
      const send = body?.find((one) => one.opcode === SEND_OPCODE);
      const quantity = body?.find((one) => one.opcode === QUANTITY_OPCODE);
      if (send === undefined || quantity === undefined) {
        throw new AssemblyError(`${item.sequence}: ${step.device}'s key ${step.scan} sends no code to put in a sequence`);
      }
      interKeyDelays[group] = quantity.operand & 0xff;
      return { send: { group, code: send.operand & 0xff } };
    });
    const sequence = composeSequence(c, { steps, pauseGroups, interKeyDelays, copies: ['screen'] });
    c = parse(sequence.bytes);
    rows.push({ label: item.sequence, list: sequence.lists[0] as number });
    sequenced = true;
  }

  const screen = composeActivityScreen(c, nextActivityValue(c), activity.name, rows);
  const key = KEY_OF_TYPE[activity.type];
  const built = composeActivity(parse(screen.bytes), {
    label: activity.name, targets, keys,
    screen: {
      startupMode: screen.startupMode, workingMode: screen.mode, activity: screen.activity,
      startVariable: screen.startVariable, flagVariable: screen.flagVariable, set: screen.set,
    },
    ...(key === undefined ? {} : { activityKey: key }),
  });
  const rowed = parse(composeActivityMenuRow(parse(built.bytes), built.label, built.set).bytes);
  const after = parse(composeActivityDeviceList(rowed, built.activity).bytes);
  // A sequence's pauses name the activity's devices as its start switches them on, which is read back.
  if (sequenced) {
    const started = activityPauseGroups(after, built.set);
    if (started.join() !== pauseGroups.join()) {
      throw new AssemblyError(`${activity.name}'s sequence pauses name ${pauseGroups.join(', ')} where its start switches on ${started.join(', ')}`);
    }
  }
  return after;
}

/** A send's opcode and its quantity's, the pair section 278 requires, read off a key's send list. */
const SEND_OPCODE = 0x7d;
const QUANTITY_OPCODE = 0x7c;

/**
 * Every parked piece of a kind the placer has no rule for, into the body. A composer parks what it adds
 * in front of a table: a composed activity's key map in front of base slot 9's, a composed device's
 * infrared records in front of base slot 5's. Logitech's compiler parks only the kinds `LOOSE_KINDS`
 * names, exact on the thirteen compiles of section 328, so everything else is a body piece in its
 * compiles: on `h650_test_config_clean`, `h650_start_config`, `h700_config` and `h600_config` every key
 * map is in the body, the activities' in one run that ends with the last. So each piece goes after the
 * body's last piece of its own kind, which is our choice, as the page lists' order is, section 328.
 * Exported for a caller that places a composed file itself rather than through `assembleSetup`, the
 * todo-compile-650 10.5 bench file, so that file takes this step rather than a copy of it.
 */
export function composedIntoBody(layout: ContainerLayout): { layout: ContainerLayout; moved: number } {
  const ruled = new Set<string | undefined>(LOOSE_KINDS);
  const moving = layout.sections.flatMap((s) => s?.before.filter((piece) => !ruled.has(piece.owner)) ?? []);
  if (moving.length === 0) return { layout, moved: 0 };
  const body = [...layout.body];
  for (const piece of moving) {
    let last = -1;
    body.forEach((one, k) => {
      if (one.owner === piece.owner) last = k;
    });
    if (last < 0) throw new AssemblyError(`the body holds no ${piece.owner ?? 'unnamed'} piece to put a composed one after`);
    body.splice(last + 1, 0, piece);
  }
  const gone = new Set(moving);
  return {
    layout: {
      ...layout,
      body,
      sections: layout.sections.map((s) => (s === undefined ? s : { ...s, before: s.before.filter((piece) => !gone.has(piece)) })),
    },
    moved: moving.length,
  };
}

/**
 * Every check the assembly's result has to pass: the container's own and both checksums' agreement,
 * every byte claimed once, the emitter's round trip, the queue and state table rails of the
 * `writing-a-config` skill, and each generator's calibration against the result, which rebuilds it from
 * its own description and compares byte for byte.
 */
export function checkAssembled(c: Container): void {
  if (!c.allChecksPass) {
    throw new AssemblyError(`the result fails ${Object.entries(c.checks).filter(([, ok]) => !ok).map(([name]) => name).join(', ')}`);
  }
  if (!trailerAgrees(c)) throw new AssemblyError('the result does not state its own trailer checksum');
  const report = coverage(c);
  if (report.accounted !== report.total) throw new AssemblyError(`${report.total - report.accounted} bytes of the result are claimed by nothing`);
  if (report.overlaps.length > 0) throw new AssemblyError(`${report.overlaps.length} byte ranges of the result are claimed twice`);
  if (!roundTrip(c).equal) throw new AssemblyError('the emitter does not reproduce the result');
  assertQueueFits(c);
  assertStateTableConsistent(c);
  checkWiring(c);
  checkScreenRecords(c);
  checkFirmwareScreens(c);
  checkScreenTexts(c);
  checkPictures(c);
  const layout = takeApart(c);
  const rebuilt = layOutContainer(withStateTables(layout, buildStateTables(describeStateTables(layout)))).bytes;
  if (!sameBytes(rebuilt, c.blob)) throw new AssemblyError('the state tables do not rebuild from their description');
  if (!sameBytes(layout.keyTable.bytes, modeZeroKeyList(describeWiring(layout).model))) {
    throw new AssemblyError('mode 0\'s key list is not the generated one');
  }
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((x, k) => x === b[k]);
}

/**
 * Every text a person sees on the screens the text pass places, as `kind|word|x,y` with how many times it
 * is drawn: section 358's comparison, which `compareViews` does not make, since that reads the setup's
 * keys, starts and pages and not the start up screens or the firmware's own. A left out screen's texts
 * are not counted.
 */
export function drawnTexts(c: Container): Map<string, number> {
  const described = describeScreenTexts(c, takeApart(c));
  const map = characterMap(c);
  if (map === undefined) throw new AssemblyError('the configuration draws no text to read');
  const out = new Map<string, number>();
  described.spec.texts.forEach((text, k) => {
    if (text.kind === 'left out') return;
    for (const at of described.draws[k] ?? []) {
      const one = screenProgram(c, c.flashBase + at)?.[0];
      if (one === undefined) throw new AssemblyError(`a text at ${at} does not read as a screen instruction`);
      const glyphs = one.opcode === SCREEN_TEXT_INLINE ? one.glyphs : glyphsReferencedBy(c, one);
      if (glyphs === undefined) throw new AssemblyError(`the text at ${at} names no glyphs`);
      const key = `${text.kind}|${decode(glyphs, map)}|${one.operands[0]},${one.operands[1]}`;
      out.set(key, (out.get(key) ?? 0) + 1);
    }
  });
  return out;
}

/** Where two configurations' `drawnTexts` differ: each text and how often each draws it. */
export function compareDrawnTexts(a: Container, b: Container): { text: string; a: number; b: number }[] {
  const [x, y] = [drawnTexts(a), drawnTexts(b)];
  return [...new Set([...x.keys(), ...y.keys()])].sort()
    .filter((text) => (x.get(text) ?? 0) !== (y.get(text) ?? 0))
    .map((text) => ({ text, a: x.get(text) ?? 0, b: y.get(text) ?? 0 }));
}

// ---------------------------------------------------------------------------------------------------
// Which bytes a generator reproduces
// ---------------------------------------------------------------------------------------------------

/**
 * Who reproduces a byte. A byte two of them claim goes to the one `attributeBytes` marks first: the frame,
 * the wiring with its description, the state tables, mode 0, the screens and the texts, and **address
 * fields last**, so `addresses` counts only the address fields inside pieces that are otherwise carried.
 * The frame lays those too, but a reader asking how much of a configuration is ours wants them apart:
 * they are a pointer into the donor's bytes, rewritten, and not content.
 */
export const ATTRIBUTIONS = [
  'frame', 'addresses', 'description', 'mode 0', 'wiring', 'state tables', 'screen records', 'firmware screens',
  'texts', 'pictures',
] as const;
export type Attribution = (typeof ATTRIBUTIONS)[number];

export interface AttributedBytes {
  /** Bytes each generator reproduces, and the bytes the generators read rather than compute. */
  generated: Record<Attribution, number>;
  /** The rest, by what claims it, `coverage.ts`'s owner names, a list split into named and not. */
  carried: Map<string, number>;
  total: number;
}

/**
 * Which bytes of a configuration some generator reproduces from a description, measured rather than
 * remembered: each generator describes the container, rebuilds its part, and the bytes of what it
 * rebuilt are counted only after its own calibration finds the rebuild byte equal. **The description is
 * counted apart**, the bytes a generator reads off the container rather than computing (a list index,
 * a word's glyph codes, a setting), since those come from wherever the description came from, which in
 * `assembleSetup` is the donor. Everything else is carried, and is reported by what claims it.
 *
 * This is the count `todo-compile-650.md` 11.1 asks for, "every byte comes from one of our
 * generators", over a finished file and with no memory of how it was made, so it measures a Logitech
 * compile and an assembled container alike.
 */
export function attributeBytes(c: Container): AttributedBytes {
  const owner = new Uint8Array(c.blob.length); // 0 is carried, else 1 + the index in ATTRIBUTIONS
  const mark = (from: number, length: number, who: Attribution): void => {
    const tag = ATTRIBUTIONS.indexOf(who) + 1;
    for (let k = from; k < from + length && k < owner.length; k += 1) if (owner[k] === 0) owner[k] = tag;
  };
  const markSet = (offsets: Iterable<number>, who: Attribution): void => { for (const at of offsets) mark(at, 1, who); };

  // The frame: the header, the section table and its marker, base slots 1 and 3 and the trailer. Its
  // address fields are marked after every generator, below.
  mark(0, c.markerOffset + END_MARKER_LENGTH, 'frame');
  for (const [slot, length] of [[1, ARCH_RECORD_LENGTH], [3, CLOCK_SECTION_LENGTH]] as const) {
    const at = c.blobOffsetOf((c.sections[slot] as { address: number }).address);
    if (at !== undefined) mark(at, length, 'frame');
  }
  mark(c.blob.length - TRAILER_CHECKSUM_OFFSET, TRAILER_CHECKSUM_OFFSET, 'frame');

  const layout = takeApart(c);
  // The wiring: every built piece where the rebuild laid it, the description's offsets apart.
  checkWiring(c);
  const wired = buildWiring(describeWiring(layout));
  const wiredLaid = layOutContainer(withWiring(layout, wired));
  for (const piece of builtPieces(wired)) {
    const at = wiredLaid.offsetOf(piece);
    if (at === undefined) continue;
    for (const k of wired.described.get(piece) ?? []) mark(at + k, 1, 'description');
    mark(at, piece.bytes.length, 'wiring');
  }
  // The state tables, likewise, the whole of what they build.
  const tables = buildStateTables(describeStateTables(layout));
  const tablesLaid = layOutContainer(withStateTables(layout, tables));
  if (!sameBytes(tablesLaid.bytes, c.blob)) throw new AssemblyError('the state tables do not rebuild from their description');
  for (const piece of [tables.nameTree, tables.stateTable, tables.valueMapTable, ...tables.records, ...tables.valueMaps]) {
    const at = tablesLaid.offsetOf(piece);
    if (at !== undefined) mark(at, piece.bytes.length, 'state tables');
  }
  // Mode 0, the key table.
  const zeroAt = c.markerOffset + END_MARKER_LENGTH;
  if (sameBytes(layout.keyTable.bytes, modeZeroKeyList(describeWiring(layout).model))) mark(zeroAt, layout.keyTable.bytes.length, 'mode 0');
  // The screens and the texts, through what their own descriptions span.
  checkScreenRecords(c);
  const records = describeScreenRecords(c, layout);
  markSet(records.described, 'description');
  markSet(records.structure, 'screen records');
  checkFirmwareScreens(c);
  const firmware = describeFirmwareScreens(c, layout);
  markSet(firmware.described, 'description');
  markSet(firmware.structure, 'firmware screens');
  checkScreenTexts(c);
  const texts = describeScreenTexts(c, layout);
  markSet(texts.described, 'description');
  markSet(texts.structure, 'texts');

  // The pictures a rule draws, where they are byte for byte the built ones, section 363.
  checkPictures(c);
  const laidPictures = layOutContainer(layout);
  for (const one of describePictures(layout)) {
    if (one.entry?.source !== 'rule') continue;
    const at = laidPictures.offsetOf(one.piece);
    if (at !== undefined) mark(at, one.piece.bytes.length, 'pictures');
  }

  // Every address field no generator laid: the frame's, inside a piece otherwise carried.
  for (const p of pointers(c)) mark(p.at, 3, 'addresses');

  // What is left, by its owner, and an action list by whether anything reaches it.
  const named = namedLists(c);
  const listAt = new Map<number, number>();
  (c.pointerArray(10) ?? []).forEach((address, index) => {
    const at = c.blobOffsetOf(address);
    if (at !== undefined && !listAt.has(at)) listAt.set(at, index);
  });
  const carried = new Map<string, number>();
  for (const claim of claims(c)) {
    let name = claim.owner;
    if (name === 'slot-10-list') {
      const index = listAt.get(claim.start);
      name = index !== undefined && named.has(index) ? 'slot-10-list reached' : 'slot-10-list reached by nothing';
    }
    let count = 0;
    for (let k = claim.start; k < claim.start + claim.length; k += 1) {
      if (owner[k] === 0) {
        owner[k] = 0xff;
        count += 1;
      }
    }
    if (count > 0) carried.set(name, (carried.get(name) ?? 0) + count);
  }
  const generated = Object.fromEntries(ATTRIBUTIONS.map((who) => [who, 0])) as Record<Attribution, number>;
  owner.forEach((tag) => { if (tag !== 0 && tag !== 0xff) generated[ATTRIBUTIONS[tag - 1] as Attribution] += 1; });
  const unclaimed = owner.reduce((n, tag) => n + (tag === 0 ? 1 : 0), 0);
  if (unclaimed > 0) carried.set('unclaimed', unclaimed);
  return { generated, carried, total: c.blob.length };
}
