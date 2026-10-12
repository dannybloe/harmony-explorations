/**
 * The edits every composer makes to a configuration, whatever its family: the refusal class, the
 * restamped trailer, state variables and the name tree, action lists and value maps appended, the next
 * device identifier, and the check that a record is the one a composer generated. Plan 007's shared core,
 * cut out of `compose.ts` unchanged; it patches a container in place, as everything here does until the
 * families serialize from a description (`todo-compile-650.md` 11.1.1).
 */
import { STATE_WRITE_BASE, stateVariableSite } from '../actions.ts';
import { u16 as u16le, u24 } from '../bytes.ts';
import { Writer } from '../emit.ts';
import { archSlot, Container, parse, TRAILER_CHECKSUM_OFFSET, trailerChecksum } from '../gspm.ts';
import { deviceIds, firmwareStateVariableMax, stateVariables } from '../inventory.ts';
import { relocate } from '../relocate.ts';
import { SCREEN_END, SCREEN_QUEUE_INSTRUCTION, screenProgram } from '../screen.ts';
import {
  assertStateTableConsistent, NAME_LEVEL_STATE_VARIABLE, nameNodes, STATE_RECORD_HEADER, STATE_TABLE_HEADER,
  STATE_VALUE_LENGTH, stateRecords, stateTable,
} from '../sections.ts';
import { appendTableEntries } from '../shared/infrared.ts';
import { headerOf } from '../shared/spelling.ts';
import { composedNameTreeOrder, type StateVariableSpec, VALUE_MAP_LEAD } from '../statetables.ts';
import {
  countedPointers, VALUE_MAP_COUNT_WIDTH, VALUE_MAP_KEY_WIDTH, VALUE_MAP_SECTION_COUNT_WIDTH, VALUE_MAP_SLOT,
  valueMaps,
} from '../valuemap.ts';

export class ComposeError extends Error {}

/** The action list table's base slot, whose lists are what everything that runs points at. */
export const ACTION_TABLE_SLOT = 10;

/** One past the highest variable a state write can name: the index is the opcode's low seven bits,
 *  `actions.ts`, so 128 is where the write becomes an instruction of a different band. */
export const STATE_WRITE_LIMIT = 128;

/** Tag 5's handler, what the activity switch runs when the activity asked for is the one already
 *  running, section 313. Spelled here because the readers name only tag 1, `ACTIVITY_START_TAG`. */
export const HANDLER_TAG_RESUME = 5;

/** The one integrity field, recomputed over the finished bytes, always last. */
export function restamped(bytes: Uint8Array): Uint8Array {
  bytes.set(new Writer(2).u16(trailerChecksum(bytes)).bytes,
            bytes.length - TRAILER_CHECKSUM_OFFSET);
  return bytes;
}

/**
 * Compose a device whole, as far as the naming half: the infrared group, one action list per
 * command, a power state variable whose transitions run the power command's list, and the name
 * tree node that gives the device its label.
 *
 * After this the device **exists and is named**: `inventory` reports it with its label through the
 * same route it names every corpus device, section 126. What it does not have yet is a screen
 * page, which is the next insertion in the checklist's order.
 */
/**
 * Shift every state variable at or above `from` up by one, rewriting every reference to one.
 *
 * **Same length throughout**, which is what makes it safe: every site is an opcode byte or an
 * operand's low byte already in the container, so nothing moves and no pointer goes stale. The
 * caller then inserts the new entry pointer, which is the only length change.
 *
 * Two kinds of site, and the enumeration of the first is deliberately not here.
 * `stateVariableSite` in `actions.ts` is the one place that knows where an index can sit inside an
 * action list, next to the readings that state the same fact in prose, because a second copy of
 * that list is how 1411 of 1511 references get missed: a first survey used two of the six `0x1F`
 * band sub opcodes and found 100 sites where there are 1511. Section 277.
 *
 * The second is a **name tree node** at level 1, whose index is the variable it names, section 77.
 * Those are `u16` fields at a known offset, so the rewrite is the same shape.
 *
 * What deliberately needs no rewrite, both checked rather than assumed: base slot 14's records are
 * chosen by `0x72`'s **high** byte rather than indexed by the variable, section 39, and base slot
 * 16's are reached through a transition's action list rather than by variable index, section 154.
 * A transition's own `operand` is a list index and not a variable.
 *
 * **The bound is the write band's seven bits.** A variable shifted to 128 would need an opcode of
 * `0x100`, which does not exist, so the shift is refused rather than truncated. Nothing in the
 * corpus comes within 34 of it, which is exactly why the check has to be reasoned about. **Logitech's
 * own eight device compiles do**, lab fixtures outside that population: they hold 112 to 124
 * variables, section 331, so a composer adding several devices to one of them meets this bound, and
 * `devicemode.test.ts` meets it on two.
 */
export function renumberStateVariables(c: Container, from: number): Uint8Array {
  const table = stateTable(c);
  if (table === undefined) throw new ComposeError('base slot 13 does not read as a table');
  if (!Number.isInteger(from) || from < 0 || from > table.count) {
    throw new ComposeError(`${from} is not a position in a table of ${table.count} variables`);
  }
  if (table.count >= STATE_WRITE_LIMIT) {
    throw new ComposeError(
      `renumbering would put a variable at ${table.count}, and a write opcode carries seven bits`);
  }
  const bytes = Uint8Array.from(c.blob);

  // The action lists. `actionLists` gives the parsed instructions and `actionListSites` gives the
  // matching offsets, both off the same pointer table, so the two are index for index.
  if (c.architecture === undefined) throw new ComposeError('the container states no architecture');
  const listTable = c.pointerArrayAt(archSlot(c.architecture, ACTION_TABLE_SLOT));
  const lists = c.actionLists();
  if (listTable === undefined || lists === undefined) {
    throw new ComposeError('base slot 10 does not read as lists');
  }
  listTable.values.forEach((address, li) => {
    const sites = c.actionListSites(address);
    const list = lists[li];
    if (sites === undefined || list === undefined) {
      throw new ComposeError(`action list ${li} does not read back for renumbering`);
    }
    list.forEach((instruction, k) => {
      const site = stateVariableSite(instruction);
      const where = sites[k];
      if (site === undefined || where === undefined || site.index < from) return;
      if (site.where === 'opcode') bytes[where.opcodeAt] = STATE_WRITE_BASE + site.index + 1;
      else bytes[where.operandAt] = site.index + 1;
    });
  });

  // The name tree's level 1 nodes, whose index is the variable.
  for (const node of nameNodes(c) ?? []) {
    if (node.level !== NAME_LEVEL_STATE_VARIABLE || node.index < from) continue;
    bytes.set(new Writer(2).u16(node.index + 1).bytes, node.start + 5);
  }
  return bytes;
}

/**
 * Where a new base slot 13 record goes: after the last existing record, where the generator
 * scatters them.
 *
 * Deliberately not at the section's start: the byte in front of base slot 13's table is the end of
 * the timer table's section, whose reader demands its counted array fill the gap to the next section
 * exactly, so a record wedged there drops the timer table out of the relocation census silently and
 * every timer pointer goes stale on the next insertion below it. Found by the screen half's pool
 * insertion, the first relocation below the timer records.
 */
export function stateRecordEnd(c: Container): number {
  const states = stateTable(c);
  if (states === undefined) throw new ComposeError('base slot 13 does not read as a table');
  return Math.max(...states.entries.map((address) => {
    const off = c.blobOffsetOf(address);
    if (off === undefined) throw new ComposeError('a state record is outside the container');
    return off + STATE_RECORD_HEADER + STATE_VALUE_LENGTH * u16le(c.blob, off + 4);
  }));
}

/**
 * Name a state variable: a level 1 node added to the name tree's frame, the frame's own length grown
 * to say so, and then the level 1 nodes put back in the compiler's order, `orderNameTree`.
 *
 * **The order is the part that was wrong**, section 331. This appended the node at the frame's end, and
 * Logitech's compiler stores level 1 nodes in the bucket order of the variable's index, section 324, so
 * every tree it composed broke that order, twenty of twenty in the lab. Several devices made it worse
 * twice over: more nodes out of place, and the renumbering each one byte insertion performs moves every
 * index at or above `narrow`, which reshuffles the order of nodes that were in place. So the whole level
 * 1 run is reordered after each insertion rather than the new node slotted into a run that is no longer
 * in order. The tree is host side, base slots 0 and 1, and every reader here goes by the index, so the
 * order changes nothing a reader or the remote sees.
 */
export function appendNameNode(c: Container, name: string, variable: number): Uint8Array {
  if (c.architecture === undefined) throw new ComposeError('the container states no architecture');
  const treeSection = c.sections[archSlot(c.architecture, 0)];
  if (treeSection === undefined || c.frameLength === undefined) {
    throw new ComposeError('the container has no name tree to put the label in');
  }
  const treeStart = c.blobOffsetOf(treeSection.address);
  if (treeStart === undefined) throw new ComposeError('the name tree is outside the container');
  const nodeLength = 3 + 4 + name.length;
  const nodeAt = treeStart + c.frameLength;
  const nodeHole = relocate(c, nodeAt, nodeLength);
  const node = new Writer(nodeLength).u8(0xa7).u16(4 + name.length).u16(1).u16(variable);
  node.ascii(name);
  nodeHole.bytes.set(node.bytes, nodeAt);
  nodeHole.bytes.set(new Writer(3).u24(c.frameLength + nodeLength).bytes, treeStart + 2);
  return orderNameTree(parse(nodeHole.bytes));
}

/**
 * The name tree with its level 1 nodes in `composedNameTreeOrder`, the compiler's order, section 331;
 * the same bytes otherwise, so the frame keeps its length and nothing outside it moves.
 *
 * Only a tree of the shape the arch 12 and 14 compilers write is reordered, its level 0 nodes first and
 * every node after them at level 1, which every such tree in the lab is; the Harmony 525's and the
 * Harmony 880's carry a third level 0 node and level 2 nodes whose place is unread, and are left as they
 * are rather than given an order nobody has measured for them.
 */
export function orderNameTree(c: Container): Uint8Array {
  const bytes = Uint8Array.from(c.blob);
  const nodes = nameNodes(c);
  if (nodes === undefined) return bytes;
  const firstLevelOne = nodes.findIndex((node) => node.level === NAME_LEVEL_STATE_VARIABLE);
  if (firstLevelOne < 0) return bytes;
  const head = nodes.slice(0, firstLevelOne);
  const run = nodes.slice(firstLevelOne);
  if (head.some((node) => node.level !== 0) || run.some((node) => node.level !== NAME_LEVEL_STATE_VARIABLE)) {
    return bytes;
  }
  const byIndex = new Map(run.map((node) => [node.index, node]));
  let at = (run[0] as (typeof run)[number]).start;
  for (const index of composedNameTreeOrder(run.map((node) => node.index))) {
    const node = byIndex.get(index) as (typeof run)[number];
    bytes.set(c.blob.subarray(node.start, node.start + node.length), at);
    at += node.length;
  }
  return bytes;
}

/**
 * Add one **one byte** state variable carrying transitions, named, and return where it landed.
 *
 * This is `composeDevice`'s power variable insertion lifted out unchanged so that a device's input
 * variables, `inputs.ts`, go in by the same route rather than a second copy of it, which is the state
 * `CLAUDE.md`'s oldest rule forbids. The reasons for each step are in `composeDevice`'s comments where
 * they were first measured, sections 276 and 277, and are summarised here:
 *
 * 1. the record goes after the last existing record, never at the section's start, `stateRecordEnd`;
 * 2. the pointer goes in at `narrow`, because no two byte variable in the corpus carries a transition,
 *    0 of 64 against 91 of 194 one byte ones, so every variable at or above `narrow` is renumbered
 *    first, `renumberStateVariables`;
 * 3. the header gains one variable and one narrow one, `wide` unchanged, `narrowAgain` moving with
 *    `narrow`;
 * 4. the name tree gains a level 1 node naming the new index.
 *
 * `record` is the whole record, header and transitions, already encoded. Its transitions may name
 * action lists that do not exist yet, since nothing here reads them; an **inline** state write inside
 * a transition names a variable by its opcode, and `renumberStateVariables` does not rewrite records,
 * so a caller writing one inline names a variable below `narrow`, which no later insertion moves.
 *
 * The bytes come back parseable and **not** restamped: the caller stamps once at the end.
 */
export function appendNarrowStateVariable(
  c: Container, record: Uint8Array, name: string,
): { bytes: Uint8Array; variable: number } {
  const states = stateTable(c);
  if (states === undefined) throw new ComposeError('base slot 13 does not read as a table');
  if (states.count < firmwareStateVariableMax(c.architecture) + 1) {
    throw new ComposeError("a table without the firmware's own variables is not one to extend");
  }
  const recordAt = stateRecordEnd(c);
  const recordHole = relocate(c, recordAt, record.length);
  recordHole.bytes.set(record, recordAt);
  const recordAddress = c.flashBase + recordAt;
  let current = parse(recordHole.bytes);

  const grownStates = stateTable(current);
  if (grownStates === undefined) throw new ComposeError('base slot 13 stopped reading');
  const variable = grownStates.narrow;
  // 1. Renumber first, while the table still has its old shape, so the walk sees the old indices.
  current = parse(renumberStateVariables(current, variable));
  // 2. Insert the pointer at the new variable's own position, which is where `narrow` was.
  const inserted = stateTable(current);
  if (inserted === undefined) throw new ComposeError('base slot 13 stopped reading after renumbering');
  const entryAt = inserted.start + STATE_TABLE_HEADER + 3 * variable;
  const entryHole = relocate(current, entryAt, 3);
  entryHole.bytes.set(new Writer(3).u24(recordAddress).bytes, entryAt);
  // 3. The header: one more variable, one more of them narrow, `wide` unchanged.
  entryHole.bytes.set(
    new Writer(8)
      .u16(inserted.count + 1)
      .u16(inserted.narrow + 1)
      .u16(inserted.wide)
      .u16(inserted.narrowAgain + 1).bytes,
    inserted.start);
  current = parse(entryHole.bytes);
  assertStateTableConsistent(current);
  // 4. The name.
  return { bytes: appendNameNode(current, name, variable), variable };
}


/**
 * Append action lists at the foot of the action table, where `composeDevice` puts its own, and
 * return the index of the first. Each list is its instructions, `[operand, opcode]`.
 */
export function appendActionLists(
  c: Container, bodies: readonly (readonly [number, number])[][],
): { bytes: Uint8Array; first: number } {
  if (c.architecture === undefined) throw new ComposeError('the container states no architecture');
  const slot = archSlot(c.architecture, ACTION_TABLE_SLOT);
  const table = c.pointerArrayAt(slot);
  if (table === undefined) throw new ComposeError('base slot 10 does not read as a table');
  const writers = bodies.map((body) => {
    const one = new Writer(1 + 3 * body.length).u8(body.length);
    for (const [operand, opcode] of body) one.u16(operand).u8(opcode);
    return one;
  });
  const at = table.start;
  const hole = relocate(c, at, writers.reduce((sum, one) => sum + one.bytes.length, 0));
  const addresses: number[] = [];
  let next = at;
  for (const one of writers) {
    hole.bytes.set(one.bytes, next);
    addresses.push(c.flashBase + next);
    next += one.bytes.length;
  }
  return { bytes: appendTableEntries(parse(hole.bytes), slot, addresses), first: table.values.length };
}

/**
 * Append a base slot 14 record whose cases, in `keys`' order, run `programs`, one each.
 *
 * **Inserted in three steps, each leaving a container the census can walk**, the order
 * `composeActivityScreen` uses for its one base slot 14 case: a header pointer naming the last
 * record, then the record after the last record with every case naming one of that record's
 * programs, then the programs after the last record's programs, after which the pointers are swapped
 * onto what was composed. **Last and last**, because on all five arch 14 configurations a record's
 * address rises with its index and so does its first program's, and the last record's end and its
 * programs' end are where the records and the programs end; a configuration where either is not
 * true is refused rather than guessed at.
 *
 * Two offsets are read again after the insertion that moves them, and both were once reused, section
 * 287: the header's, which put the pointer into base slot 13, and the last record's programs', which
 * named every program 109 bytes short and led the census to read program bytes as pointer fields.
 */
export function appendValueMap(
  c: Container, keys: readonly number[], programs: readonly Uint8Array[],
): { bytes: Uint8Array; table: number } {
  if (c.architecture === undefined) throw new ComposeError('the container states no architecture');
  if (keys.length !== programs.length || keys.length === 0) {
    throw new ComposeError('a base slot 14 record needs one program per case');
  }
  const slot = archSlot(c.architecture, VALUE_MAP_SLOT);
  const counter = VALUE_MAP_COUNT_WIDTH[c.architecture];
  const headerOf = (one: Container) => {
    const header = countedPointers(one, slot, VALUE_MAP_SECTION_COUNT_WIDTH);
    if (header === undefined) throw new ComposeError('base slot 14 does not read');
    return header;
  };
  if (counter === undefined) throw new ComposeError('base slot 14 does not read');
  const header = headerOf(c);
  const table = header.values.length;
  if (table === 0 || table >= 0xff) throw new ComposeError('base slot 14 is empty or full');

  // 1. A header pointer naming the last record, so the census sees a record there.
  const pointerAt = header.start + VALUE_MAP_SECTION_COUNT_WIDTH + 3 * table;
  const pointerHole = relocate(c, pointerAt, 3);
  pointerHole.bytes.set(new Writer(3).u24(header.values[table - 1] as number).bytes, pointerAt);
  pointerHole.bytes[header.start] = table + 1;
  let current = parse(pointerHole.bytes);

  // 2. The record, after the last one.
  const recordEnd = (one: { address: number; length: number }): number =>
    (current.blobOffsetOf(one.address) as number) + one.length;
  const records = (valueMaps(current) ?? []).slice(0, table);
  const previous = records.at(-1);
  if (previous === undefined || current.blobOffsetOf(previous.address) === undefined) {
    throw new ComposeError('base slot 14 stopped reading');
  }
  const tableAt = recordEnd(previous);
  if (records.some((one) => recordEnd(one) > tableAt)) {
    throw new ComposeError('the last base slot 14 record does not end where the records end');
  }
  const stride = VALUE_MAP_KEY_WIDTH + 3;
  const tableLength = 1 + counter + stride * keys.length + 1;
  current = parse(relocate(current, tableAt, tableLength).bytes);
  const stand = (valueMaps(current) ?? [])[table - 1]?.entries[0]?.[1];
  if (stand === undefined) throw new ComposeError('base slot 14 stopped reading');
  const record = new Writer(tableLength).u8(VALUE_MAP_LEAD);
  if (counter === 2) record.u16(keys.length);
  else record.u8(keys.length);
  for (const key of keys) record.u16(key).u24(stand);
  record.u8(0);
  if (record.remaining !== 0) throw new ComposeError(`the record is ${record.remaining} bytes short`);
  current.blob.set(record.bytes, tableAt);
  const moved = headerOf(current);
  current.blob.set(new Writer(3).u24(current.flashBase + tableAt).bytes,
                   moved.start + VALUE_MAP_SECTION_COUNT_WIDTH + 3 * table);
  current = parse(current.blob);

  // 3. The programs, after the last record's, then the cases swapped onto them.
  const programEnd = (target: number): number => {
    const last = screenProgram(current, target)?.at(-1);
    if (last === undefined) throw new ComposeError('a base slot 14 case does not read as a program');
    return last.start + last.length;
  };
  const before = (valueMaps(current) ?? []).slice(0, table);
  const lastRecord = before.at(-1);
  if (lastRecord === undefined) throw new ComposeError('base slot 14 stopped reading');
  const programsAt = Math.max(...lastRecord.entries.map(([, target]) => programEnd(target)));
  if (before.some((one) => one.entries.some(([, target]) => programEnd(target) > programsAt))) {
    throw new ComposeError("the last base slot 14 record's programs do not end where the programs end");
  }
  const programHole = relocate(current, programsAt, programs.reduce((sum, one) => sum + one.length, 0));
  const starts: number[] = [];
  let next = programsAt;
  for (const program of programs) {
    programHole.bytes.set(program, next);
    starts.push(next);
    next += program.length;
  }
  current = parse(programHole.bytes);
  const composed = valueMaps(current)?.[table];
  const composedAt = composed === undefined ? undefined : current.blobOffsetOf(composed.address);
  if (composedAt === undefined) throw new ComposeError('the composed record stopped reading');
  starts.forEach((start, k) => {
    current.blob.set(new Writer(3).u24(current.flashBase + start).bytes,
                     composedAt + 1 + counter + stride * k + VALUE_MAP_KEY_WIDTH);
  });
  return { bytes: parse(current.blob).blob, table };
}

/** A screen program queueing one action instruction, `0x11 operand opcode; end`. */
export function queueing(operand: number, opcode: number): Uint8Array {
  return new Writer(5).u8(SCREEN_QUEUE_INSTRUCTION).u16(operand).u8(opcode).u8(SCREEN_END).bytes;
}

/** The identifier of the first device of a configuration that has none: eight digits, as the compiler writes, the lowest. */
export const FIRST_DEVICE_IDENTIFIER = 10_000_000;

/**
 * The identifier a device composed onto `c` takes, section 319: one more than the highest any of the
 * configuration's variable names carries.
 *
 * **What an identifier is**: Logitech's own key for the device on the account, eight digits, which
 * the compiler writes into the names of the device's delay variables, `PowerOnDelay_<identifier>`.
 * Nothing in the remote reads a name, and the composer emits none of section 303's programs that save
 * a device's delays in the settings store under a key of its own, so for a composed device it only has
 * to be a number no other device here carries, in the shape `stateVariables` reads back as an
 * identifier. Whether that key is derived from the identifier is unexamined, and matters once those
 * programs are composed.
 *
 * **Why one past the highest rather than any free number**: it is what Logitech's own numbering does
 * to a configuration. Their identifiers look like one counter on their side: the two test accounts'
 * devices interleave, 83915449 to 83915451 added on the Harmony 700's and 83915452 and 83915453 on the
 * 650's. On those two accounts' compiles, a device one compile holds and another of the same account
 * lacks is numbered above every device both hold, 17 such devices of 17; that is stronger than "added
 * devices come last", since it also says the devices removed again were the recent ones, which is how
 * the test accounts were used. Two accounts only, and no third has a pair of compiles. One past the
 * highest is that rule with their counter's gaps left out: the actual next identifiers were 5798 and
 * 1349 above it. This reads which numbers are taken, which is the input every composer reads to place
 * anything; the number itself is built, and is checked against nothing else in the configuration.
 *
 * **A configuration that names no identifier takes `FIRST_DEVICE_IDENTIFIER`**, one of ours built from
 * nothing, section 376: a choice with nothing to measure it against, since nothing on the remote reads a
 * name, made in the shape the compiler writes.
 */
export function nextDeviceIdentifier(c: Container): number {
  const identifiers = deviceIds(c);
  if (identifiers.length === 0) return FIRST_DEVICE_IDENTIFIER;
  const identifier = Math.max(...identifiers) + 1;
  // `stateVariables` reads six digits or more as an identifier and the compiler writes eight, so a
  // ninth digit would still read back; a number that would not is refused rather than written.
  if (!Number.isSafeInteger(identifier) || String(identifier).length < 6) {
    throw new ComposeError(`${identifier} would not read back as a device identifier`);
  }
  return identifier;
}

/**
 * Refuse unless variable `index` is the unnamed record `spec` describes: its value, its maximum and
 * no transition, the shape `statetables.ts` generates for it. A variable a reader picked out by its
 * use that held something else would be another variable used the same way, so it is refused rather
 * than taken.
 */
export function assertGeneratedRecord(c: Container, index: number, spec: StateVariableSpec, what: string): void {
  const record = (stateRecords(c) ?? [])[index];
  if (record === undefined || record.first !== spec.first || record.second !== spec.max
      || record.count !== (spec.transitions?.length ?? 0)) {
    throw new ComposeError(`${what}, variable ${index}, is not the record built for it: it holds `
      + `${record?.first}/${record?.second} with ${record?.count} transitions, and ${spec.first}/${spec.max} `
      + 'with none is built');
  }
  if (stateVariables(c).some((one) => one.index === index)) {
    throw new ComposeError(`${what}, variable ${index}, has a name, and the one built has none`);
  }
}
