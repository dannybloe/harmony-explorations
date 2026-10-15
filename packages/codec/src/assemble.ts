/**
 * A setup description in, a whole container out: `todo-compile-650.md` 10.6, `docs/findings.md` sections
 * 362 and 364.
 *
 * Until this module a configuration of ours was a chain of lab scripts, each starting from a Logitech
 * compile and replacing a part: the 6.2.13 file's composers, then the 7.5 file's three screen passes,
 * then 10.2.2's wiring. This is that chain as one function with its inputs named, so that the
 * finish line's audit, 11.1, has one thing to look at and one input to swap:
 *
 * * **the recipe**, the file `packages/corpus/setups/` already holds, `recipe/recipe.ts`: the model it is
 *   for, the devices, the activities and their order, which devices stay on between activities, each
 *   activity's working screen, and the choices. What the model can hold comes from its definition;
 * * **the donor**, a container every part comes from that no generator builds yet, named as a
 *   parameter rather than buried in a script, so that 11.1 can hand in a different one and count what
 *   is left;
 *   its choices are the four slot family's, `FourSlotChoices`: the letters, the backgrounds and their
 *   colours, blending, the settings, which activity key a type of activity takes, what to do with a label
 *   too wide and the delays a device starts with, each the family's default unless given, 10.7.3.
 *
 * **What it does, in order**, each a generator or a composer this project already has and a check that
 * it calibrated against Logitech's compiles:
 *
 * 1. checks that the donor holds nothing the setup does not, a device by the setup's name or by the
 *    `<manufacturer>_<model>` name the service's compiles of catalogue devices here carry, since no
 *    composer removes a device or an activity;
 * 2. composes every device the setup names and the donor lacks from the catalogue, in the setup's order,
 *    `composeCatalogueDevices`, section 331, which needs the archive, `options.archive`, and the model's
 *    device count, which the recipe's model's definition states;
 * 3. applies the setup's "keep this device on when switching Activities" with `keepDeviceOn` to the
 *    donor's activities, section 340, and refuses where the donor keeps a device on that the setup does not;
 * 4. composes every activity the setup names and the donor lacks, in the setup's order,
 *    `composeSetupActivity`: the start and the keypad from the roles, the inputs by name, the working
 *    screen from the recipe, the menu row, the activity's device list and its activity key;
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
 *     section 318;
 * 14. with the state colours chosen, one flat colour per screen state in place of the designed
 *     backgrounds, decision 20, `withStateBackgrounds`;
 * 15. with our pictures chosen, the six pictures that are no state's background drawn from icons,
 *     `todo-compile-650.md` 9.1.2.2, `buildOurPictures`;
 * 16. with blending chosen, our letters blended into the colour under each text, decision 22,
 *     `withBlendedLetters`. All three run on the placed file, the order the files written to the Harmony 650
 *     were built in, `todo-compile-650.md` 9.1.2.1 and 8.2.6.
 *
 * Step 0 letters the donor in ours when that is chosen, before any composer spells a label.
 *
 * **What it cannot do yet, measured in section 364.** The composers need a donor
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
import { type Recipe, recipeTarget } from './recipe/recipe.ts';
import { AssemblyError, type AssembleOptions, type AssemblyStep, checkComposed, composeSetupParts } from './shared/setup.ts';
import { u16, u8 } from './bytes.ts';
import { archSlot } from './gspm.ts';
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
import { SCREEN_QUEUE_INSTRUCTION, SCREEN_TABLE_SLOT, SCREEN_TEXT_INLINE, reachablePrograms, screenProgram } from './screen.ts';
import { characterMap, decode, glyphsReferencedBy, oxaniumAlphabet } from './text.ts';
import { activities, devices, deviceVariables, SEND_INFRARED, DEVICE_QUANTITY } from './inventory.ts';
import type { ContainerLayout, ContainerPiece } from './frame.ts';
import { layOutContainer, takeApart } from './frame.ts';
import { LOOSE_KINDS, loosen, placePieces } from './placer.ts';
import { buildStateTables, describeStateTables, hourListBytes, withStateTables } from './statetables.ts';
import {
  buildWiring, builtPieces, checkWiring, describeWiring, withWiring, wiringModelOfSkin, type WiringSettings, type WiringSpec,
} from './wiring.ts';
import { modeZeroKeyList } from './modezero.ts';
import { LOGITECH_REPLACED, buildOurPictures, buildPictures, checkOurPictures, checkPictures, describePictures, withPictures } from './pictures.ts';
import {
  activityEntriesByName, buildScreenRecords, checkScreenRecords, describeScreenRecords, inActivityOrder,
  withScreenRecords,
} from './screenrecords.ts';
import { buildFirmwareScreens, checkFirmwareScreens, describeFirmwareScreens, withFirmwareScreens } from './firmwarescreens.ts';
import { buildScreenTexts, checkScreenTexts, describeScreenTexts, withScreenTexts } from './screentexts.ts';
import { checkOxaniumFonts, withOxaniumFonts, type SetFace } from './fonttable.ts';
import { LETTERING_FACES, letterForm, maskForm } from './lettering.ts';
import { type FontSet, IMAGE_SET_HEADER, fontSets, glyphOf } from './font.ts';
import type { ActivityRoleName } from './activityroles.ts';
import { FOUR_SLOT } from './families/four-slot/index.ts';
import {
  FOUR_SLOT_CHOICES, OUR_FOUR_SLOT_CHOICES, type FourSlotChoices, type FourSlotChoicesGiven, fourSlotChoices,
} from './families/four-slot/choices.ts';
import { SCREEN_STATES, checkStateBackgrounds, ourPictureName, withStateBackgrounds } from './backgrounds.ts';
import { oneLook, ourStateColours, recolouredStates } from './families/four-slot/statelook.ts';
import { cornerPrograms, inOurLook } from './families/four-slot/chrome.ts';
import { cornerProgramAt, emptyFontTable } from './families/four-slot/empty.ts';
import { caseProgram } from './shared/menus.ts';
import { valueMaps } from './valuemap.ts';
import { type BlendedSet, checkBlendedLetters, type LettersBlended, withBlendedLetters } from './blending.ts';
import type { ComposeRow } from './compose.ts';




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
 * The skins the assembly takes on a donor of ours alone, an empty configuration in our look: the Harmony
 * 700's 66, `todo-compile-700.md` 2.1, and the Harmony 600's 71 and 73, `todo-compile-600.md` 2.1. None of
 * Logitech's compiles for either has had the chain run on it, so one of them as the donor is refused.
 */
export const OUR_DONOR_SKINS: ReadonlySet<number> = new Set([66, 71, 73]);



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
  /** With our letters, the face and colouring each font set was given, which `withBlendedLetters` needs. */
  faces?: SetFace[];
  /** With blending, the copies of each set blended for a background, which `checkBlendedLetters` reads. */
  blended?: BlendedSet[];
}



/**
 * Build the setup's container out of the donor and every generator there is, refusing where the donor
 * cannot serve the setup, and check the result as every generator's own calibration checks a compile.
 */
export function assembleSetup(setup: Recipe, options: AssembleOptions): Assembled {
  // The recipe's model, whose definition says what it can hold and whose family builds for it.
  const target = recipeTarget(setup);
  if (target.family !== FOUR_SLOT || !(ASSEMBLY_SKINS.has(target.skin) || OUR_DONOR_SKINS.has(target.skin))) {
    throw new AssemblyError(`the assembly is measured on the Harmony 650, skin 72, and on a donor of ours the 700, skin 66, and the 600, skins 71 and 73, and the recipe is for the ${setup.model.name}`);
  }
  let c = parse(options.donor);
  if (c.architecture !== 14) throw new AssemblyError(`the assembly is arch 14's, and the donor is arch ${c.architecture}`);
  const skin = (c.versionWord ?? -1) & 0xff;
  if (skin !== target.skin) throw new AssemblyError(`the recipe is for skin ${target.skin}, and the donor is skin ${skin}`);
  // A donor of ours, an empty configuration, section 377, takes our look as its defaults, smoothed letters
  // included; one of Logitech's compiles takes theirs, which its byte for byte tests are held to.
  const ours = inOurLook(c);
  if (!ASSEMBLY_SKINS.has(target.skin) && !ours) {
    throw new AssemblyError(`the assembly takes the ${setup.model.name} on a donor of ours alone, an empty configuration, and this donor is Logitech's`);
  }
  const choices = fourSlotChoices(setup.choices as FourSlotChoicesGiven | undefined, ours ? OUR_FOUR_SLOT_CHOICES : FOUR_SLOT_CHOICES);
  if (choices.blendLetters && choices.letters !== 'oxanium') {
    throw new AssemblyError('only our letters can be blended, since only theirs come with grey levels');
  }
  const settings: WiringSettings = choices.settings;
  const steps: AssemblyStep[] = [];
  const note = (step: string, detail?: string): void => {
    steps.push({ step, bytes: c.blob.length, ...(detail === undefined ? {} : { detail }) });
  };
  note('donor');
  // What the donor names, for step 12: a composer renumbers no list, so these indices still mean the same
  // lists after it. Read here as well as after the composers, since the first activity on a donor of ours
  // shortens the wiring's front and leaves the list behind it named by nothing, section 379.
  const namedByDonor = namedLists(c);

  // A donor of ours, an empty configuration, section 377: its letters, its state colours and its pictures are
  // ours already, so steps 0, 14 and 15, which turn Logitech's artwork into ours, are not run on it. Its faces
  // are the empty configuration's description, held to its font sets byte for byte, so blending, the one
  // look step left, letters exactly the sets it holds; it has to be unblended, since blending runs once,
  // last, over every text the composers add.
  let faces: SetFace[] | undefined;
  if (ours) {
    if (choices.letters !== 'oxanium' || choices.backgrounds !== 'state colours' || choices.pictures !== 'ours') {
      throw new AssemblyError('a donor of ours is in our letters, the state colours and our pictures, and the choices ask for another');
    }
    faces = donorFaces(c, choices);
    note('a donor of ours', `${faces.length} sets of our letters`);
  }

  // 0. Our letters, before any composer spells a label, so none has to borrow one. Lettering the donor
  //    in our own font table means every set spells every printable character, so every label a composer
  //    writes is drawn in the font its page uses and none is borrowed from another size, and the text
  //    step places every text in our letters' widths, `withOxaniumFonts`, decision 19, 8.2.3.
  if (!ours && choices.letters === 'oxanium') {
    const lettered = withOxaniumFonts(takeApart(c), choices.letterInks, choices.faceWeights);
    c = layOutContainer(lettered.layout).container;
    checkOxaniumFonts(c, lettered.faces);
    faces = lettered.faces;
    // Re-lettering keeps every text where Logitech placed it in Logitech's widths, and the composers
    // check their pages against the donor's, the bottom word centred among them, so the donor's texts
    // are placed again in ours before any composer reads them. Step 7 does the same for the whole result.
    const placing = takeApart(c);
    const described = describeScreenTexts(c, placing);
    c = parse(layOutContainer(withScreenTexts(placing, buildScreenTexts(described.spec, c), described.place)).bytes);
    note('our letters', `${lettered.glyphs} glyphs, ${lettered.added.length} characters given a code, every text placed in them`);
  }

  const setupParts = composeSetupParts(c, setup, target, options,
    { family: FOUR_SLOT, choices }, note);
  c = setupParts.container;
  const { composed, keptOn } = setupParts;
  const names = setup.activities.map((one) => one.name);
  const namedBefore = new Set([...namedByDonor, ...namedLists(c)]);

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

  // 8. The pictures a rule draws, section 363; the rest of the artwork and any picture its table does not know stay.
  layout = takeApart(c);
  c = parse(layOutContainer(withPictures(layout, describePictures(layout), buildPictures())).bytes);
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
  const zero = modeZeroOf(wiring);
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

  // The assembly's own checks run here, before the look: several of them know a page by Logitech's
  // designed backgrounds, which the state colours replace. Each look step is held to its own check instead.
  checkAssembled(c);

  // 14. The state colours, on the placed file.
  if (!ours && choices.backgrounds === 'state colours') {
    const coloured = withStateBackgrounds(takeApart(c), choices.stateColours, choices.barColour);
    c = layOutContainer(coloured.layout).container;
    checkStateBackgrounds(c, takeApart(c), choices.stateColours);
    note('state colours');
  }
  // On a donor of ours the composers draw in the colours the file has, the defaults on an empty one, and the
  // chosen ones are written over them here, decision 20: a state's background and corner patch, same length.
  // A model drawn in one look, the Harmony 600, takes `oneLookColour` for all three, `todo-compile-600.md`
  // 1.2.4, and refuses state colours chosen apart, which it has no looks to draw in.
  if (ours && oneLook(c)) {
    if (SCREEN_STATES.some((state) => choices.stateColours[state] !== FOUR_SLOT_CHOICES.stateColours[state])) {
      throw new AssemblyError(`the ${setup.model.name} draws every state in one look, so its colour is oneLookColour and not stateColours`);
    }
    const one = choices.oneLookColour;
    if (ourStateColours(c).idle !== one) c = recolouredStates(c, { idle: one, device: one, activity: one });
    if (ourStateColours(c).idle !== one) throw new AssemblyError('the one look reads back in another colour than chosen');
    note('one look', one.toString(16));
  } else if (ours && SCREEN_STATES.some((state) => choices.stateColours[state] !== FOUR_SLOT_CHOICES.stateColours[state])) {
    c = recolouredStates(c, choices.stateColours);
    const read = ourStateColours(c);
    const wrong = SCREEN_STATES.filter((state) => read[state] !== undefined && read[state] !== choices.stateColours[state]);
    if (wrong.length > 0) throw new AssemblyError(`the ${wrong.join(' and ')} state reads back in another colour than chosen`);
    note('state colours', SCREEN_STATES.filter((state) => read[state] !== undefined).join(', '));
  }

  // 15. Our pictures, the six that are no state's background drawn from icons, 9.1.2.2. On the placed file
  //     and after the checks and the colours, since the composers, several checks and the colours' screen
  //     records find the start up picture by Logitech's artwork; before the blending, which reads the colour
  //     under each text.
  if (!ours && choices.pictures === 'ours') {
    const before = c;
    layout = takeApart(c);
    const ours = buildOurPictures({ icons: choices.icons, colour: choices.iconColour, background: choices.iconBackground }, LOGITECH_REPLACED);
    c = layOutContainer(withPictures(layout, describePictures(layout), new Map([...buildPictures(), ...ours]))).container;
    note('our pictures', checkOurPictures(before, c, ours).join(', '));
  }

  // 16. Our letters blended into the colour under each text.
  let blended: LettersBlended | undefined;
  if (choices.blendLetters) {
    blended = withBlendedLetters(takeApart(c), faces as SetFace[]);
    c = layOutContainer(blended.layout).container;
    checkBlendedLetters(c, faces as SetFace[], blended.blended);
    note('blended letters', `${blended.blended.length} sets blended, ${blended.repointed} selects pointed at them`);
  }

  if (options.builtAt !== undefined) {
    c = parse(saveEdits(c, [], options.builtAt).bytes);
    note('stamped', options.builtAt);
  }

  return { bytes: c.blob, container: c, steps, dropped: dropped.dropped, keptOn, composed, ...(faces === undefined ? {} : { faces }),
    ...(blended === undefined ? {} : { blended: blended.blended }) };
}

/**
 * The faces of a donor of ours: the empty configuration's font table as described, `emptyFontTable`, in the
 * choices' inks and weights, refused unless the donor holds exactly those sets, glyph for glyph. A donor
 * already blended holds more sets than the description and is refused with the rest.
 */
function donorFaces(c: Container, choices: FourSlotChoices): SetFace[] {
  const built = emptyFontTable(choices.letterInks, choices.faceWeights);
  const sets = fontSets(c) ?? [];
  if (sets.length !== built.sets.length) {
    throw new AssemblyError(`a donor of ours holds ${sets.length} font sets where the empty configuration's are ${built.sets.length}, `
      + 'so it is blended or not one of ours');
  }
  built.sets.forEach((set, k) => {
    const theirs = sets[k] as FontSet;
    set.refs.forEach((ref, n) => {
      const glyph = glyphOf(c, theirs, n + 1);
      const at = glyph === undefined ? undefined : c.blobOffsetOf(glyph.address);
      const want = 'to' in ref ? ref.to.bytes : undefined;
      if (at === undefined || want === undefined || !sameBytes(c.blob.subarray(at, at + want.length), want)) {
        throw new AssemblyError(`a donor of ours letters set ${k} other than the empty configuration in these inks and weights`);
      }
    });
  });
  return built.faces;
}

/**
 * Every parked piece of a kind the placer has no rule for, into the body. A composer parks what it adds
 * in front of a table: a composed activity's key map in front of base slot 9's, a composed device's
 * infrared records in front of base slot 5's. Logitech's compiler parks only the kinds `LOOSE_KINDS`
 * names, exact on the thirteen compiles of section 328, so everything else is a body piece in its
 * compiles: on `h650_test_config_clean`, `h650_start_config`, `h700_config` and `h600_config` every key
 * map is in the body, the activities' in one run that ends with the last. So each piece goes after the
 * body's last piece of its own kind, which is our choice, as the page lists' order is, section 328, and at
 * the end of the body where it holds none of that kind, section 378.
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
    // A body with none of its kind, an empty configuration's first device's infrared records, takes it last:
    // where it goes is our choice either way, and Logitech's compiles interleave those records with the
    // state records, 73 of 73 arch 14 compiles, so no one kind marks where the first would go. Section 378.
    body.splice(last < 0 ? body.length : last + 1, 0, piece);
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
  checkComposed(c);
  checkWiring(c);
  checkScreenRecords(c);
  checkFirmwareScreens(c);
  checkScreenTexts(c);
  checkPictures(c);
  const layout = takeApart(c);
  const rebuilt = layOutContainer(withStateTables(layout, buildStateTables(describeStateTables(layout)))).bytes;
  if (!sameBytes(rebuilt, c.blob)) throw new AssemblyError('the state tables do not rebuild from their description');
  if (!sameBytes(layout.keyTable.bytes, modeZeroOf(describeWiring(layout)))) {
    throw new AssemblyError('mode 0\'s key list is not the generated one');
  }
}

/**
 * Mode 0's key list for a wiring: on the Harmony 700 its leading entry sets the low battery variable the
 * wiring names, section 357, and on the Harmony 600 and 650 it takes none.
 */
function modeZeroOf(wiring: WiringSpec): Uint8Array {
  if (wiring.model !== 'harmony-700') return modeZeroKeyList(wiring.model);
  const variable = wiring.variables.lowBattery;
  if (variable === undefined) throw new AssemblyError('the wiring names no low battery variable for mode 0');
  return modeZeroKeyList(wiring.model, { variable });
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
  'corner programs', 'texts', 'pictures', 'letters',
] as const;
export type Attribution = (typeof ATTRIBUTIONS)[number];

export interface AttributedBytes {
  /** Bytes each generator reproduces, and the bytes the generators read rather than compute. */
  generated: Record<Attribution, number>;
  /** The rest, by what claims it, `coverage.ts`'s owner names, a list split into named and not. */
  carried: Map<string, number>;
  total: number;
  /** Per byte of the blob: 0xff where carried, 0 where nothing claims it, else 1 + its `ATTRIBUTIONS` index. */
  owners: Uint8Array;
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
  const tablesSpec = describeStateTables(layout);
  const tables = buildStateTables(tablesSpec);
  const tablesLaid = layOutContainer(withStateTables(layout, tables));
  if (!sameBytes(tablesLaid.bytes, c.blob)) throw new AssemblyError('the state tables do not rebuild from their description');
  for (const piece of [tables.nameTree, tables.stateTable, tables.valueMapTable, ...tables.records, ...tables.valueMaps]) {
    const at = tablesLaid.offsetOf(piece);
    if (at !== undefined) mark(at, piece.bytes.length, 'state tables');
  }
  // What the state tables name and do not build, section 375: the clock's hour list at the index they
  // state, and every value map case that is a `caseProgram`, five bytes queuing one action, the action read
  // and its frame built. On Logitech's compiles the working screen record's idle case queues more and is
  // not one.
  const hourAt = c.blobOffsetOf((c.pointerArray(10) ?? [])[tablesSpec.hourList] ?? -1);
  const hour = hourListBytes();
  if (hourAt !== undefined && sameBytes(c.blob.subarray(hourAt, hourAt + hour.length), hour)) mark(hourAt, hour.length, 'state tables');
  for (const map of valueMaps(c) ?? []) {
    for (const target of [...map.entries.map(([, to]) => to), ...map.ranges.map(([, , to]) => to)]) {
      const at = c.blobOffsetOf(target);
      if (at === undefined) continue;
      const operand = u16(c.blob, at + 1);
      const built = caseProgram(c.blob[at + 3] ?? 0, operand);
      if (!sameBytes(c.blob.subarray(at, at + built.length), built)) continue;
      mark(at + 1, 3, 'description');
      mark(at, built.length, 'state tables');
    }
  }
  // Mode 0, the key table.
  const zeroAt = c.markerOffset + END_MARKER_LENGTH;
  if (sameBytes(layout.keyTable.bytes, modeZeroOf(describeWiring(layout)))) mark(zeroAt, layout.keyTable.bytes.length, 'mode 0');
  // The screens and the texts, through what their own descriptions span.
  checkScreenRecords(c);
  const records = describeScreenRecords(c, layout);
  markSet(records.described, 'description');
  markSet(records.structure, 'screen records');
  checkFirmwareScreens(c);
  const firmware = describeFirmwareScreens(c, layout);
  markSet(firmware.described, 'description');
  markSet(firmware.structure, 'firmware screens');
  // The corner programs every menu and device page queues, each read as `cornerProgram` builds it, its
  // three pieces whole, section 374's shape, which every compile's 70 hold.
  const screenTable = c.pointerArray(archSlot(14, SCREEN_TABLE_SLOT)) ?? [];
  for (const index of cornerPrograms(c)) {
    const root = screenTable[index];
    for (const one of (root === undefined ? undefined : cornerProgramAt(c, root)) ?? []) mark(one.at, one.length, 'corner programs');
  }
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
  // And our own, section 375: a state's colour, the bars made flat, and the six icon pictures in the icons
  // the family offers, each rebuilt from the colours it holds. A picture of Logitech's rebuilds as none.
  const { icons } = fourSlotChoices(undefined);
  for (const one of describePictures(layout)) {
    if (one.entry?.source === 'rule' || ourPictureName(one.piece.bytes, icons) === undefined) continue;
    const at = laidPictures.offsetOf(one.piece);
    if (at !== undefined) mark(at, one.piece.bytes.length, 'pictures');
  }

  // Our letters, section 368: a glyph whose form is one of our faces' letters for its character, in either
  // colouring and whatever inks, `letterForm`. Read only where the character map reads our alphabet, so a
  // Logitech compile has none. A blended copy's glyphs, section 370, are not recognised: their pixels depend
  // on the colour they were blended for, which the copy does not state, so they count as carried until it
  // is read.
  const lettersMap = characterMap(c);
  if (lettersMap?.alphabet === 'oxanium') {
    const forms = oxaniumAlphabet().forms ?? {};
    // A space has no ink and so no form: it is ours when it has the size of one of our faces' spaces.
    const spaces = new Set(LETTERING_FACES.map((face) => maskForm(face, ' ', 'plain')));
    const ours = (rows: readonly (readonly (number | undefined)[])[], ch: string): boolean => {
      if (rows.every((row) => row.every((p) => p === undefined))) {
        return ch === ' ' && spaces.has(`${rows.length}:P:${rows.map((row) => '.'.repeat(row.length)).join('/')}`);
      }
      const form = letterForm(rows);
      return form !== undefined && (forms[form.form] ?? '').includes(ch);
    };
    for (const set of fontSets(c) ?? []) {
      let mine = 0;
      for (const [code, ch] of lettersMap.codes) {
        const glyph = glyphOf(c, set, code);
        if (glyph === undefined || !ours(glyph.rows, ch)) continue;
        mine += 1;
        const at = c.blobOffsetOf(glyph.address);
        if (at !== undefined) mark(at, glyph.length, 'letters');
      }
      // A set every glyph of which is ours is ours whole, its three byte header too: its height is its
      // glyphs', and its first code and count are the character map's, section 375.
      const at = c.blobOffsetOf(set.address);
      if (mine === set.count && at !== undefined) mark(at, IMAGE_SET_HEADER, 'letters');
    }
  }

  // A table's count, which the entries it names state: a count of one, two or three bytes and as many
  // three byte addresses as it says, and nothing else, section 375.
  for (const claim of claims(c)) {
    if (!/^slot-\d+-table$/.test(claim.owner)) continue;
    for (const width of [1, 2, 3]) {
      let count = 0;
      for (let k = width - 1; k >= 0; k -= 1) count = count * 256 + (c.blob[claim.start + k] ?? 0);
      if (width + 3 * count === claim.length) {
        mark(claim.start, width, 'frame');
        break;
      }
    }
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
  return { generated, carried, total: c.blob.length, owners: owner };
}
