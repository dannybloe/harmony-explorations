/**
 * Which action lists a configuration names, and dropping the ones nothing names: the renumbering of base
 * slot 10 that `todo-compile-650.md` 10.6's assembly runs as its step 12, `docs/findings.md` sections 362
 * and 364.
 *
 * `listCallSites` finds every instruction that names an action list, `namedLists` the lists something
 * reaches, `dropLists` takes lists out and renumbers every place that names one after them, and
 * `checkRenumbering` holds a drop to a census of its own. They read and rewrite the container's own
 * structures, the action lists, the tagged lists, the timers, the state transitions, the screen programs,
 * the number senders and base slot 8's leading list, and name no remote.
 *
 * **Scope, decision 16**: the holders were enumerated and the renumbering measured on arch 14 compiles,
 * `h650_test_config_clean` among them, sections 360 and 362, and the Harmony 600, 650 and 700's assembly was
 * the first caller. **On the Harmony One since `todo-compile-one.md` 4.10**, section 421: base slots 10 and 8 read
 * through `archSlot`, the census finds 102324 sites over the nineteen One compiles and every list nothing reaches
 * drops out of each with every check passing, and the touch family's `withoutTourAndAssistant` is the second
 * caller. On the test setup's donor the 27 three byte runs `lo hi 7F` the walk does not hold are coincidences, in
 * tables, infrared, glyphs or across instructions, and a drop short of any holder but the leading list is refused;
 * the leading list names only the start list, below every drop.
 *
 * **The assembly itself moved into its family** with `todo-compile-one.md` 3.3.3.2,
 * `families/four-slot/assemble.ts`: `assembleSetup`, its checks and `attributeBytes` are the Harmony 600,
 * 650 and 700's chain, and this module was its first half.
 */
import { AssemblyError } from './shared/setup.ts';
import { u16, u8 } from './bytes.ts';
import { ACTION_LIST_TABLE_SLOT, BINDING_SLOT, GspmError, INSTRUCTION_LENGTH, archSlot, parse, type Container } from './gspm.ts';
import {
  ACTION_LIST_INDEX_OPCODE, handlerSets, modePages, modeRecords, pageListCopies, stateRecords, taggedListExtent,
} from './sections.ts';
import { numberSenders, timers } from './tables.ts';
import { SCREEN_QUEUE_INSTRUCTION, reachablePrograms } from './screen.ts';
import type { ContainerLayout, ContainerPiece } from './frame.ts';
import { layOutContainer, takeApart } from './frame.ts';

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
  return instructionSites(c, ACTION_LIST_INDEX_OPCODE).map(({ operand, ...rest }) => ({ ...rest, list: operand }));
}

/** One instruction of a given opcode wherever the configuration holds one: `ListCallSite` for any opcode. */
export interface InstructionSite {
  /** Blob offset of the instruction's operand, the `u16` before its opcode byte. */
  at: number;
  operand: number;
  holder: ListSiteHolder;
  /** For a site inside an action list, that list's index. */
  within?: number;
}

/**
 * Every instruction of `opcode` in the container, by the holders `listCallSites` walks: the action lists' own
 * instructions, every tagged list, the timers, the state transitions, the instructions screen programs queue, the
 * number senders and base slot 8's leading list. `listCallSites` is this for `0x7F`; for `0x7E` it is every place
 * that enters a mode by number, which a renumbering of base slot 6 rewrites, `shared/dropmodes.ts`. An instruction
 * reached twice is one site.
 *
 * **Measured on the Harmony One since `todo-compile-one.md` 4.10**: for `0x7F` it finds 3067 sites on
 * `harvest_one_two_devices`, the figure section 413's blind reviewer counted by a walk of its own, where reading
 * raw slots 10 and 8 found 1553. The holders were enumerated on arch 14 compiles, sections 360 and 362.
 */
export function instructionSites(c: Container, opcode: number): InstructionSite[] {
  const sites = new Map<number, InstructionSite>();
  const blob = c.blob;
  const add = (operandAt: number, holder: ListSiteHolder, within?: number): void => {
    if (operandAt < 0 || operandAt + INSTRUCTION_LENGTH > blob.length) return;
    if (blob[operandAt + 2] !== opcode || sites.has(operandAt)) return;
    sites.set(operandAt, { at: operandAt, operand: u16(blob, operandAt), holder, ...(within === undefined ? {} : { within }) });
  };
  const offsetOf = (address: number): number | undefined => c.blobOffsetOf(address);

  // The two sections read by slot, each through `archSlot`: base slot 10 and base slot 8 are raw slots 11 and 9 on
  // the Harmony One, which inserts a NULL at raw slot 8, so reading raw slots 10 and 8 there walked base slot 9's
  // handler sets as if they were action lists and the inserted NULL as the leading list, todo-compile-one.md 4.10.
  const rawSlot = (base: number): number | undefined => {
    if (c.architecture === undefined) return undefined;
    try {
      return archSlot(c.architecture, base);
    } catch (error) {
      if (error instanceof GspmError) return undefined;
      throw error;
    }
  };
  const tableSlot = rawSlot(ACTION_LIST_TABLE_SLOT);
  const leadSlot = rawSlot(BINDING_SLOT);

  // The action lists, through the table, so a list two entries share is walked once.
  const table = (tableSlot === undefined ? undefined : c.pointerArray(tableSlot)) ?? [];
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
  const lead = leadSlot === undefined ? undefined : c.sections[leadSlot];
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

