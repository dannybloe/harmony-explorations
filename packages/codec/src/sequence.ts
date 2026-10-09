/**
 * A sequence: several commands and pauses run from one key or one screen item, composed.
 *
 * **What a sequence is to somebody holding the remote.** In Logitech's software a sequence is a named,
 * ordered list of steps that belongs to an activity, each step either a command to one device or a
 * wait of some seconds, and a key or a button on the screen can run it: "Netflix" might be the set top
 * box's 2, 0, 0, Red, Red and then five seconds. Their schema states it whole, `Sequence` holding
 * `Actions`, `Name` and `SequenceId`, the actions being `ButtonCommandAction` and `ButtonDelayAction`,
 * `docs/myharmony/model.md`.
 *
 * **What it compiles to, read off the four compiles that hold one**, the spare Harmony One's account after
 * Danny authored two on 23 August 2026, `one_spare_20260830` and the three protocol campaign compiles,
 * against a capture of the same two sequences' steps taken that evening from a second account record.
 * Section 327:
 *
 * * **one action list**, each command step a `0x7F` call of that command's send list and each pause step
 *   a `0x7C` per device of the activity, carrying the wait in tenths of a second, section 235;
 * * every distinct command gets **one** send list, shared by every step and every copy that sends it,
 *   `{0x7D, 0x7C}` with the device's **inter key delay** as the quantity: the 16 set top box lists a
 *   step calls are all 2 where the same box's device mode keys carry 1, and the account states its
 *   inter key delay as 200 milliseconds, the television's and the receiver's as 100, whose lists carry
 *   1. That box is the only separating device in the sequences;
 * * **the record a command sends is one of its own**, a single block record with no held block, where
 *   the key for the same command sends a two block one: the compile added one per command it lacked,
 *   six for the set top box and one each for the television and the receiver. Over the whole
 *   configuration every list sending a record of two or more blocks carries 1, 380 of them, and every
 *   list carrying anything else sends a single block one, so the quantity may belong to the record's
 *   shape rather than to the sequence. The single block lists are not uniform: the receiver's carry 10
 *   on 19 and 1 on 10, so they do not all carry the inter key delay either. **On the Harmony One this
 *   composer makes no record**: it sends the record the caller names, since a One's copy opens with the
 *   device's delay between devices, section 337, which nothing here composes. On the Harmony 600, 650
 *   and 700 it makes the copy Logitech makes, `ComposeSequence.records`, section 349;
 * * the pause names **the activity's devices**, not the device the neighbouring step sends to: the
 *   Netflix sequence sends to the set top box alone and its one pause names all three devices;
 * * a pause is never merged with the next one, and a pause at the end is kept;
 * * one list **per binding**: a screen item's list opens with the beeper every Harmony One screen item
 *   opens with, plus that page's second copy, section 69; a key's list does not.
 *
 * **On a Harmony 600, 650 or 700 none of that had been seen until section 343**, which is the honest scope
 * and the reason this module names its inferences rather than hiding them. No Logitech compile in the lab for those
 * models holds a sequence: none of the thirteen has a run of `0x7C` instructions sharing one wait across
 * several devices, which is what every pause on the Harmony One is. So on arch 14 five things here are
 * **carried over from the Harmony One and unconfirmed**, and `ARCH14_INFERRED` lists them for a caller
 * and a report to quote: the list shape, the pause's devices and their order, the screen copy having no
 * beeper, a long pause written as one instruction rather than in runs of a hundred tenths, and the send
 * carrying the inter key delay.
 *
 * **The remote runs that form**, section 342: on a Harmony 650, one sequence on Red sent its three codes
 * with the 2 and 20 second pauses between them, and a key pressed during the pause was held until the
 * pause ended, since a pause holds every device of the activity. That is the firmware executing the form;
 * **Logitech's compiler writes the same form**, section 343, with one difference the Harmony One already
 * showed: each command goes out as a single block record of its own, where this composer sent the record
 * the key sends, which carries a held block too. **Since section 349 it sends the same record**: the
 * command's one block copy, the first block with its opening silence dropped, the group's own where the
 * compile already holds one and a record appended to the group where it does not. Composed again that
 * way, the Radio item of the 650's test setup stores what Logitech's compile of the same setup stores,
 * block for block, and section 343's sequence stores what theirs does, with the one copy it lacked made.
 *
 * **What does not depend on any of that is the refusal.** Every list composed here, and every list in
 * the configuration that results, goes through `assertQueueFits`, section 238: a sequence is spooled
 * into the remote's forty instruction action queue whole, so a long one with many pauses on a three
 * device activity fills the ring and the remote silently drops the rest. Logitech's own editor allows
 * 25 steps, and a 25 step sequence of 11 commands and 14 pauses on a three device activity is
 * 11 + 14 * 3 = 53 instructions in one list, within the step limit their editor states; no such
 * sequence has been compiled, and the remote would drop what does not fit. So this composer refuses by the queue and never by a step count. The one sequence that hung a Harmony One
 * peaked at 35 of the 40, under the ceiling, so passing this rail is not a promise the remote copes:
 * the softer bound is a decision nobody has taken, section 238.
 */
import type { Container, Instruction } from './gspm.ts';
import { parse } from './gspm.ts';
import { archSlot } from './gspm.ts';
import { STATE_BAND, STATE_WRITE_BASE } from './actions.ts';
import { ACTION_LIST_INDEX_OPCODE, HANDLER_TAG_ENTER, handlerSets, taggedList } from './sections.ts';
import {
  CONDITION_OPCODE,
  DEVICE_QUANTITY,
  KEY_EVENT_PRESS,
  KEY_EVENT_SHIFT,
  SCAN_CODE_MASK,
  SEND_INFRARED,
  deviceVariables,
  infraredGroupsPerList,
  sendPreludes,
  stateVariables,
} from './inventory.ts';
import {
  IR_HEADER_BASE, IR_HEADER_GROUP, IR_PULSE_MARK, IR_TABLE_SLOT, irBlockLength, irBuildRecord, irCarrier,
  irGroupCount, irGroups, irHeaderPointers, irRecordStart,
} from './ir.ts';
import { assertQueueFits, queueRun } from './queue.ts';
import { ACTION_TABLE_SLOT, ComposeError, appendActionLists, restamped } from './compose.ts';
import { relocate } from './relocate.ts';
import { Writer } from './emit.ts';
import { EditError } from './edit.ts';
import type { Edit } from './edit.ts';

/** Opcode `0x75`, the beeper, and the operand every Harmony One screen item opens with, section 73. */
export const SCREEN_ITEM_BEEP: Readonly<Instruction> = { opcode: 0x75, operand: 0x0fca };

/**
 * The architectures this composes for: arch 12 (Harmony One), where a compiled sequence exists to
 * score against, and arch 14 (Harmony 600, 650 and 700), where the form is carried over. A send list
 * on arch 8, 9 and 10 has a shape this module has not been taught, so they are refused.
 */
const SEQUENCE_ARCHITECTURES: readonly number[] = [12, 14];

/** The architecture whose send lists open with a delay step, section 287. */
const PRELUDE_ARCHITECTURE = 14;

/**
 * The longest wait one pause step can carry: the operand's low byte, in tenths of a second, so 25.5
 * seconds. Logitech's own editor stops at 20, which their compiler wrote as one instruction of 200 on
 * the Harmony One. A longer wait is two pause steps, which is what a person does in their editor too.
 */
export const PAUSE_TENTHS_MAX = 0xff;

/**
 * What a caller and a report should know is carried over from the Harmony One rather than seen.
 *
 * **Five until section 343, two until section 349, one since.** Logitech's compile of one sequence on a
 * Harmony 650, `h650_sequence_config`, has the list shape, the pause's devices in the activity's order, and a
 * 20 second wait as one `0x7C` of 200 per device, exactly as this composes them, so those three left the
 * list. Their compile of the test setup, `h650_test_config_clean`, binds Radio to a screen item, and its list
 * is the key copy's body with no beeper, so the screen copy left too. Still unseen: the send's quantity,
 * since the one device both sequences send to, the KPN box, states an inter key delay of 100 ms on the
 * account, section 343, and so carries 1 either way.
 */
export const ARCH14_INFERRED: readonly string[] = [
  "a command's send carries the device's inter key delay, as on the Harmony One; on arch 14 Logitech gives that "
    + 'amount to power steps and to some digit copies, section 320, and most commands a list at 1',
];

/** One step of a sequence, in the order a person authored it. */
export type SequenceStep =
  /** Send one command: the device's infrared group and the record number within it. */
  | { readonly send: { readonly group: number; readonly code: number } }
  /** Wait, in tenths of a second, 1 to `PAUSE_TENTHS_MAX`. Logitech's editor states whole seconds. */
  | { readonly pause: number };

/** Which kind of binding a copy of the list is for, since the two differ by the screen's beeper. */
export type SequenceCopy = 'key' | 'screen';

export interface ComposeSequence {
  readonly steps: readonly SequenceStep[];
  /**
   * The infrared groups a pause names, in the order it names them: the activity's devices, which
   * `activityPauseGroups` reads off the activity's start. Taken from the caller because the rule is
   * measured on one activity, in four compiles, see that function.
   */
  readonly pauseGroups: readonly number[];
  /**
   * Each sent device's inter key delay in tenths of a second, keyed by infrared group, which is the
   * quantity a sequence's send carries. Logitech's catalogue and account state it per device, in
   * milliseconds, and it varies, 100 to 500 on the one account measured, so there is no default: a
   * group a step sends to and this does not name is refused. For a device composed from the catalogue
   * it is `interKeyDelay` of `catalogueDevicePower`'s answer, already in tenths, section 320, which is the
   * amount Logitech's arch 14 compiles give every power step of such a device.
   */
  readonly interKeyDelays: Readonly<Record<number, number>>;
  /**
   * One list per binding, Logitech's convention on the Harmony One: a key's copy is the body and a
   * screen item's opens with the beeper there. A screen binding also needs its page's second copy,
   * section 69, which is a second `'screen'` here. One key copy when omitted.
   */
  readonly copies?: readonly SequenceCopy[];
  /**
   * Which record a command step sends. `'copy'`, Logitech's way on the Harmony 600, 650 and 700 and the
   * default there, section 349: the named record's **one block copy**, its first block with the opening
   * silence dropped and no held block, the group's own where it has one and a new record where it does
   * not. `'named'` sends the record the caller names, which is what this composer did until then and
   * what the sequence written to the bench 650 for section 342 sent.
   *
   * On the Harmony One only `'named'`: its copies open with the device's delay between devices rather
   * than with nothing, section 337, which this does not compose, so `'copy'` is refused there.
   */
  readonly records?: SequenceRecords;
}

/** How a command step chooses its record, `ComposeSequence.records`. */
export type SequenceRecords = 'copy' | 'named';

export interface ComposedSequence {
  bytes: Uint8Array;
  /** The base slot 10 list of each copy, in `copies`' order. What a binding names. */
  lists: number[];
  /** The send list each distinct command resolved to, keyed `group:code` by the record the caller named. */
  sendLists: Map<string, number>;
  /** Which of those were appended because the configuration had no send list for that command. */
  created: number[];
  /**
   * The record each distinct command sends, keyed `group:code` by the record the caller named: the
   * same code under `'named'`, its one block copy under `'copy'`.
   */
  sent: Map<string, number>;
  /** The one block copies appended because the group had none, as `group:code` of the new record. */
  recordsCreated: string[];
  /** The deepest the action queue gets running any copy, out of `ACTION_QUEUE_INSTRUCTIONS`. */
  peak: number;
}

/** What a one block copy is made of: the bytes of its one block, and the header fields it keeps. */
interface CopyRecord {
  block: Uint8Array;
  periodNs: number;
  spare: number;
}

/** A block's bytes, its terminating zero included, or undefined where it does not close. */
function blockBytes(c: Container, address: number): Uint8Array | undefined {
  const off = c.blobOffsetOf(address);
  const length = irBlockLength(c, address);
  return off === undefined || length === undefined ? undefined : c.blob.subarray(off, off + length);
}

const sameBytes = (a: Uint8Array, b: Uint8Array): boolean =>
  a.length === b.length && a.every((byte, k) => byte === b[k]);

/**
 * The record a sequence sends for one command on the Harmony 600, 650 and 700: the code of its one
 * block copy in the same group where there is one, or what a new copy would hold where there is not.
 *
 * **The copy is the first block with its opening silence dropped and nothing else**, section 337 for the
 * copies a configuration already carries and section 349 for the ones a compile adds for a sequence: on
 * the KPN box of the Harmony 650's test setup, 11 of 38 two block records have one, each the record's
 * first block less its two words of 50 ms silence, at the same carrier, no held block and no tail, and
 * none has two. A named record that already has no held block is sent as it is: it is a copy, or a power
 * step's own record, and nothing here makes a copy of a copy.
 */
function oneBlockCopy(
  c: Container, records: readonly number[], code: number,
): { code: number } | { copy: CopyRecord } {
  const address = records[code] as number;
  const [once = 0, held = 0, tail = 0] = irHeaderPointers(c, address);
  if (held === 0) return { code };
  if (irGroupCount(c, address) !== 1 || tail !== 0 || once === 0) {
    throw new ComposeError(`code ${code}'s record is not one group of a first and a held block, `
      + 'which is the only record a copy has been measured for');
  }
  const first = blockBytes(c, once);
  if (first === undefined) throw new ComposeError(`code ${code}'s first block does not close`);
  // The opening silence is every space word before the first mark: two words of 50 ms on every two
  // block record of the Harmony 650 measured, `COMPILED_LEAD_IN_US`.
  let lead = 0;
  while (2 * lead + 2 < first.length) {
    const word = (first[2 * lead] as number) | ((first[2 * lead + 1] as number) << 8);
    if ((word & IR_PULSE_MARK) !== 0) break;
    lead += 1;
  }
  const block = first.slice(2 * lead);
  const carrier = irCarrier(c, address);
  if (carrier === undefined || carrier.onNs !== carrier.periodNs >> 1) {
    throw new ComposeError(`code ${code}'s carrier is not one this can copy`);
  }
  const start = irRecordStart(c, address);
  const spare = start === undefined ? undefined : c.blob[c.blobOffsetOf(start) ?? -1];
  if (spare === undefined) throw new ComposeError(`code ${code}'s record has no header`);
  // The group's own copy, the lowest where there were several: none of the KPN box's has two.
  const found = records.findIndex((other) => {
    const [o = 0, h = 0, t = 0] = irHeaderPointers(c, other);
    if (h !== 0 || t !== 0 || o === 0 || irGroupCount(c, other) !== 1) return false;
    const bytes = blockBytes(c, o);
    return bytes !== undefined && sameBytes(bytes, block) && irCarrier(c, other)?.periodNs === carrier.periodNs;
  });
  if (found >= 0) return { code: found };
  return { copy: { block, periodNs: carrier.periodNs, spare } };
}

/**
 * Append one record to an existing infrared group: its one block and its header where `composeIrGroup`
 * puts a new group's, immediately below base slot 5's table, and one more entry in the group's array.
 *
 * **Two relocations, in an order where nothing the census cannot see ever moves.** The array entry
 * first, holding for now the address of the group's first record, so the second relocation's census
 * reads a whole container; then the hole for the block and the header above every group array, so the
 * entry just written stays where it is; then the entry is pointed at the new header. The other way
 * round, the header would sit in unreferenced bytes while the array grew beneath it, and the census
 * would move it without rewriting the addresses inside it.
 *
 * Logitech's compiler puts a copy among the group's own records and numbers it in among them, renumbering
 * every later code of that group; this appends it, so its code is the group's old count and no other
 * code moves. Both send the same bytes.
 */
function appendCopyRecord(c: Container, group: number, copy: CopyRecord): { bytes: Uint8Array; code: number } {
  const slot = archSlot(c.architecture as number, IR_TABLE_SLOT);
  const before = (irGroups(c) ?? [])[group];
  if (before === undefined) throw new ComposeError(`there is no infrared group ${group}`);
  const code = before.addresses.length;
  // A send names its record in the operand's low byte.
  if (code > 0xff) throw new ComposeError(`group ${group} already holds ${code} records, and a send names 256`);
  const end = before.start + before.length;
  const holder = before.addresses[0] as number;
  const grown = relocate(c, end, 3);
  const holderLands = c.blobOffsetOf(holder) ?? 0;
  grown.bytes.set(new Writer(3).u24(holderLands >= end ? holder + 3 : holder).bytes, end);
  grown.bytes.set(new Writer(2).u16(code + 1).bytes, before.start + 1);
  const middle = parse(restamped(grown.bytes));

  const table = middle.pointerArrayAt(slot);
  if (table === undefined) throw new ComposeError('base slot 5 does not read as a group table');
  const at = table.start;
  if (end + 3 > at) throw new ComposeError(`group ${group}'s array does not sit below base slot 5's table`);
  const headerLength = IR_HEADER_BASE + IR_HEADER_GROUP;
  const second = relocate(middle, at, copy.block.length + headerLength);
  const base = middle.flashBase + at;
  const record = irBuildRecord({
    periodNs: copy.periodNs, start: base + copy.block.length, pointers: [base, 0, 0], spare: copy.spare,
  });
  second.bytes.set(copy.block, at);
  second.bytes.set(record.bytes, at + copy.block.length);
  second.bytes.set(new Writer(3).u24(record.pointer).bytes, end);
  const bytes = restamped(second.bytes);
  if ((irGroups(parse(bytes)) ?? [])[group]?.addresses[code] !== record.pointer) {
    throw new ComposeError(`group ${group}'s new record does not read back where it was put`);
  }
  return { bytes, code };
}

/**
 * The body of a sequence list, given each command's send list: no container, so the rule can be
 * scored on its own and the composer below cannot drift from it.
 */
export function sequenceBody(
  steps: readonly SequenceStep[],
  sendList: (group: number, code: number) => number,
  pauseGroups: readonly number[],
): Instruction[] {
  const body: Instruction[] = [];
  for (const step of steps) {
    if ('send' in step) {
      body.push({ opcode: ACTION_LIST_INDEX_OPCODE, operand: sendList(step.send.group, step.send.code) });
      continue;
    }
    const tenths = step.pause;
    if (!Number.isInteger(tenths) || tenths < 1 || tenths > PAUSE_TENTHS_MAX) {
      throw new ComposeError(`a pause is 1 to ${PAUSE_TENTHS_MAX} tenths of a second, not ${tenths}`);
    }
    if (pauseGroups.length === 0) throw new ComposeError('a pause names the activity\'s devices and none were given');
    // One per device, in the caller's order, never merged with a neighbour: the Harmony One compile
    // wrote its 3 and 20 second pauses as two runs back to back. Interleaving the devices is also what
    // keeps the firmware's fold rule, section 70, from collapsing the two into the larger: the fold
    // compares a new quantity only with the queue's last entry, which here names another device.
    for (const group of pauseGroups) body.push({ opcode: DEVICE_QUANTITY, operand: (group << 8) | tenths });
  }
  return body;
}

/**
 * The devices an activity switches on, as infrared groups, in the order its start switches them.
 *
 * **This is the pause's device list on all four compiles that hold a sequence.** The Harmony One's TV
 * kijken switches on the television, the set top box and the receiver in that order, and every pause of
 * both sequences names exactly those three in exactly that order: groups 3, 2 and 0 on the spare's own
 * compile, and 6, 14 and 9, then 4, 14 and 6, then 2, 7 and 4 on the three protocol compiles, whose
 * added devices renumber them. So descending group order, which fits the first, fails the other three.
 * The order of the activity's roles in the account is the same order in all four and is not separated;
 * the account's own `PowerOnOrder`, receiver first, does **not** fit and is not used. A device the activity
 * uses that has no power variable, a media player for instance, is outside this list, and whether a
 * pause names it is unmeasured: in the sample all three devices have one.
 *
 * Read by walking the enter handler, tag 1, through every `0x7F` it calls, collecting writes of 1 into
 * a device's `Power` variable.
 */
export function activityPauseGroups(c: Container, set: number): number[] {
  const lists = c.actionLists();
  const address = handlerSets(c)?.addresses[set];
  if (lists === undefined || address === undefined) throw new ComposeError(`base slot 9 has no entry ${set}`);
  const enter = taggedList(c, address)?.entries.find((one) => one.tag === HANDLER_TAG_ENTER);
  if (enter?.opcode !== ACTION_LIST_INDEX_OPCODE) throw new ComposeError(`entry ${set} has no enter list`);

  // Power variable to group, through what its switch on transition sends, section 86: the list a
  // `Power` variable's move to 1 runs sends that device's code and no other device's. Not through the
  // device's label, which `devices` pairs with a group by several routes and which on the spare Harmony
  // One after the sequences were authored leaves the set top box's power variable unnamed.
  const power = new Map<number, number>();
  const sends = infraredGroupsPerList(c);
  const records = new Map(stateVariables(c).map((one) => [one.index, one.record]));
  for (const variable of deviceVariables(c)) {
    if (variable.property !== 'Power') continue;
    for (const value of records.get(variable.index)?.values ?? []) {
      if (value.to !== 1 || value.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
      const groups = sends.get(value.operand);
      if (groups?.size === 1) power.set(variable.index, [...groups][0] as number);
    }
  }
  const out: number[] = [];
  const seen = new Set<number>();
  const walk = (index: number, depth: number): void => {
    if (seen.has(index) || depth > 6) return;
    seen.add(index);
    for (const one of lists[index] ?? []) {
      if (one.opcode === ACTION_LIST_INDEX_OPCODE) walk(one.operand, depth + 1);
      else if (one.opcode >= STATE_WRITE_BASE && one.operand === 1) {
        const group = power.get(one.opcode - STATE_WRITE_BASE);
        if (group !== undefined && !out.includes(group)) out.push(group);
      }
    }
  };
  walk(enter.operand, 0);
  return out;
}

interface SendList {
  list: number;
  group: number;
  code: number;
  quantity: number;
  /**
   * Arch 14 only: the device's delay list, which every command's private condition list calls, and the
   * operands of the private load and condition, section 287. What a new send list's own pair copies.
   */
  prelude?: { delay: number; load: number; condition: number };
}

/**
 * Every list in the configuration's ordinary send shape: `{0x7D, 0x7C}` naming one device on the
 * Harmony One, and the delay step `sendPreludes` reads in front of that on the 600, 650 and 700.
 */
function sendListsOf(c: Container): SendList[] {
  const lists = c.actionLists() ?? [];
  const out: SendList[] = [];
  if (c.architecture === PRELUDE_ARCHITECTURE) {
    for (const one of sendPreludes(c)) {
      const body = lists[one.list] as Instruction[];
      const send = body[1] as Instruction;
      const quantity = body[2] as Instruction;
      if (quantity.operand >>> 8 !== one.group) continue;
      out.push({
        list: one.list, group: one.group, code: send.operand & 0xff,
        quantity: quantity.operand & 0xff,
        prelude: { delay: one.delay, load: one.loadOperand, condition: one.conditionOperand },
      });
    }
    return out;
  }
  lists.forEach((body, list) => {
    if (body.length !== 2) return;
    const [send, quantity] = body as [Instruction, Instruction];
    if (send.opcode !== SEND_INFRARED || quantity.opcode !== DEVICE_QUANTITY) return;
    if (send.operand >>> 8 !== quantity.operand >>> 8) return;
    out.push({ list, group: send.operand >>> 8, code: send.operand & 0xff, quantity: quantity.operand & 0xff });
  });
  return out;
}

/**
 * Compose a sequence onto a configuration: a send list for every command that lacks one, and one
 * sequence list per copy, appended to base slot 10.
 *
 * **Refused when the result does not fit the action queue**, by `assertQueueFits` over the whole
 * configuration, so a sequence is judged together with whatever calls it. The error is the queue's own
 * `QueueError`, which names the list and its peak.
 *
 * What it does not do is bind the copies: a key binding is `bindKeyToList`, and a screen item belongs
 * to the page composers. So the lists exist and nothing runs them until a binding names them.
 */
export function composeSequence(given: Container, sequence: ComposeSequence): ComposedSequence {
  const architecture = given.architecture;
  if (architecture === undefined || !SEQUENCE_ARCHITECTURES.includes(architecture)) {
    throw new ComposeError(
      `a sequence is composed for a Harmony One or a Harmony 600, 650 or 700, not architecture ${architecture ?? 'none'}`);
  }
  if (sequence.steps.length === 0) throw new ComposeError('a sequence has at least one step');
  const groups = irGroups(given) ?? [];
  const checkGroup = (group: number, what: string): void => {
    if (!Number.isInteger(group) || group < 0 || group >= groups.length) {
      throw new ComposeError(`${what} names group ${group} and the configuration has ${groups.length}`);
    }
  };
  for (const group of sequence.pauseGroups) checkGroup(group, 'a pause');
  if (new Set(sequence.pauseGroups).size !== sequence.pauseGroups.length) {
    throw new ComposeError('a pause names each device once');
  }
  for (const step of sequence.steps) {
    if (!('send' in step)) continue;
    const { group, code } = step.send;
    checkGroup(group, 'a command');
    const records = (groups[group] as { addresses: number[] }).addresses.length;
    if (!Number.isInteger(code) || code < 0 || code >= records) {
      throw new ComposeError(`group ${group} holds ${records} codes, so code ${code} sends nothing`);
    }
    const quantity = Object.hasOwn(sequence.interKeyDelays, group) ? sequence.interKeyDelays[group] : undefined;
    if (quantity === undefined || !Number.isInteger(quantity) || quantity < 0 || quantity > 0xff) {
      throw new ComposeError(`group ${group} needs its inter key delay, 0 to 255 tenths, and has ${quantity}`);
    }
  }

  // The record each command sends, before any list is made, since a copy the group lacks is a record
  // appended to base slot 5 and the lists below are numbered in the container that results.
  const mode = sequence.records ?? (architecture === PRELUDE_ARCHITECTURE ? 'copy' : 'named');
  if (mode === 'copy' && architecture !== PRELUDE_ARCHITECTURE) {
    throw new ComposeError('a one block copy is composed on the Harmony 600, 650 and 700 only: the Harmony One\'s '
      + 'open with the device\'s delay between devices, section 337, which this does not compose');
  }
  let c = given;
  const sent = new Map<string, number>();
  const recordsCreated: string[] = [];
  for (const step of sequence.steps) {
    if (!('send' in step)) continue;
    const { group, code } = step.send;
    const key = `${group}:${code}`;
    if (sent.has(key)) continue;
    if (mode === 'named') {
      sent.set(key, code);
      continue;
    }
    const found = oneBlockCopy(c, (irGroups(c) ?? [])[group]?.addresses ?? [], code);
    if ('code' in found) {
      sent.set(key, found.code);
      continue;
    }
    const appended = appendCopyRecord(c, group, found.copy);
    c = parse(appended.bytes);
    sent.set(key, appended.code);
    recordsCreated.push(`${group}:${appended.code}`);
  }

  // Resolve every distinct command to a send list: the configuration's own where one sends that code at
  // the device's inter key delay, and a new one otherwise. The Harmony One compile made its own for the
  // eighteen commands no list sent at that amount and shared one per command between every step and copy.
  const existing = sendListsOf(c);
  const table = c.pointerArrayAt(archSlot(architecture, ACTION_TABLE_SLOT));
  if (table === undefined) throw new ComposeError('base slot 10 does not read as a table');
  let next = table.values.length;
  const sendLists = new Map<string, number>();
  const created: number[] = [];
  const bodies: (readonly [number, number])[][] = [];
  for (const step of sequence.steps) {
    if (!('send' in step)) continue;
    const { group } = step.send;
    const key = `${group}:${step.send.code}`;
    if (sendLists.has(key)) continue;
    // The record this command sends, which under `'copy'` is not the one the caller named.
    const code = sent.get(key) as number;
    const quantity = sequence.interKeyDelays[group] as number;
    const found = existing.find((one) => one.group === group && one.code === code && one.quantity === quantity);
    if (found !== undefined) {
      sendLists.set(key, found.list);
      continue;
    }
    created.push(next);
    sendLists.set(key, next);
    if (architecture !== PRELUDE_ARCHITECTURE) {
      bodies.push([[(group << 8) | code, SEND_INFRARED], [(group << 8) | quantity, DEVICE_QUANTITY]]);
      next += 1;
      continue;
    }
    // On arch 14 a send opens with a delay step of three lists, section 287: a load and a condition
    // **private to the command**, then a delay list **shared by the device**, which queues its inter
    // device delay while a start, All Off or Help runs, section 335. So a new send gets a new pair, laid out after it in
    // `composeDevice`'s order, calling the device's one delay list with the operands its other
    // commands' pairs carry. More than one delay list or operand for one device is a configuration this
    // was not measured on.
    const preludes = existing.filter((one) => one.group === group).map((one) => one.prelude);
    const distinct = new Set(preludes.map((one) => `${one?.delay}:${one?.load}:${one?.condition}`));
    if (distinct.size !== 1 || preludes[0] === undefined) {
      throw new ComposeError(`group ${group}'s send lists open with ${distinct.size} different delay steps`);
    }
    const { delay, load, condition } = preludes[0];
    bodies.push(
      [[next + 1, ACTION_LIST_INDEX_OPCODE], [(group << 8) | code, SEND_INFRARED],
       [(group << 8) | quantity, DEVICE_QUANTITY]],
      [[load, STATE_BAND], [next + 2, ACTION_LIST_INDEX_OPCODE]],
      [[condition, CONDITION_OPCODE], [delay, ACTION_LIST_INDEX_OPCODE]],
    );
    next += 3;
  }

  const body = sequenceBody(sequence.steps, (group, code) => sendLists.get(`${group}:${code}`) as number,
                            sequence.pauseGroups);
  const copies = sequence.copies ?? ['key'];
  if (copies.length === 0) throw new ComposeError('a sequence needs at least one copy to be bound');
  const lists: number[] = [];
  for (const copy of copies) {
    // The beeper on the Harmony One's screen copy only: no screen item on the 600, 650 or 700 opens
    // with one, and Logitech's compile of the Harmony 650's test setup gives its Radio item the key
    // copy's body with none, section 349.
    const opened = copy === 'screen' && architecture !== PRELUDE_ARCHITECTURE ? [SCREEN_ITEM_BEEP, ...body] : body;
    if (opened.length > 0xff) throw new ComposeError(`a list states its count in a byte and this is ${opened.length}`);
    bodies.push(opened.map((one) => [one.operand, one.opcode] as const));
    lists.push(next);
    next += 1;
  }

  const appended = appendActionLists(c, bodies);
  const result = parse(restamped(appended.bytes));
  // The rail. Over the whole configuration rather than the new lists alone, so a composed sequence and
  // whatever already calls into the lists it reuses are judged together.
  assertQueueFits(result);
  let peak = 0;
  for (const list of lists) peak = Math.max(peak, queueRun(result, list)?.peak ?? 0);
  return { bytes: Uint8Array.from(result.blob), lists, sendLists, created, sent, recordsCreated, peak };
}

/**
 * Point one key of a base slot 9 entry at a list, as a same length edit: what a key bound to a
 * sequence is, on the Harmony One's sample, a press entry calling the sequence's key copy.
 *
 * **Only a key the entry already binds, by a press and nothing else.** Adding an entry is a length
 * change this edit does not make, and a key that also has a release or repeat entry would keep doing
 * its old command when held, which is a key that does two things.
 */
export function bindKeyToList(c: Container, set: number, scan: number, list: number): Edit[] {
  const address = handlerSets(c)?.addresses[set];
  if (address === undefined) throw new EditError(`base slot 9 has no entry ${set}`);
  const tagged = taggedList(c, address);
  if (tagged === undefined) throw new EditError(`base slot 9 entry ${set} does not read as a tagged list`);
  if (!Number.isInteger(list) || list < 0 || list > 0xffff || list >= (c.actionLists()?.length ?? 0)) {
    throw new EditError(`there is no base slot 10 list ${list}`);
  }
  const forScan = tagged.entries.map((one, index) => ({ one, index }))
    .filter(({ one }) => (one.tag & SCAN_CODE_MASK) === scan);
  const press = (KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | scan;
  if (forScan.length === 0) throw new EditError(`entry ${set} does not bind scan ${scan}, and adding it changes a length`);
  if (forScan.length !== 1 || (forScan[0] as { one: { tag: number } }).one.tag !== press) {
    throw new EditError(`entry ${set} binds scan ${scan} ${forScan.length} times, not by one press alone`);
  }
  const { index } = forScan[0] as { index: number };
  const stride = tagged.wide ? 5 : 4;
  const at = tagged.start + (tagged.wide ? 2 : 1) + stride * index + stride - 3;
  return [{
    start: at,
    bytes: Uint8Array.from([list & 0xff, list >>> 8, ACTION_LIST_INDEX_OPCODE]),
    owner: `entry ${set} scan ${scan}`,
  }];
}
