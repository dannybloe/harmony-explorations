/**
 * The file based family's remote as far as a configuration decides what it sends, walked key by key, for
 * the bench tests that hold a run against the file the unit held.
 *
 * **Why a module of its own.** It was written inside `setup350.test.ts` for the Harmony 350's run on
 * Logitech's compile, and the Harmony 300's key runs need the same walk, `keys300.test.ts`. Two copies of
 * one derivation are two copies until one moves, so it lives here and both import it. What the model reads
 * and what it rests on is argued in the header of `setup350.test.ts`, where it was first written: a key
 * raises press, release and, held, the held event; the event is looked up in the selected key map and then
 * in entry 0; **any instruction the model does not read throws**, so it cannot skip one that sends.
 *
 * It names a key by whatever the test calls it, and the test hands it the scan code for each name: the two
 * models print different words on one moulding, so the table of names belongs to each test.
 */
import assert from 'node:assert/strict';

import { bytes, numberSenders, stateRecords, taggedList, type Container } from '@harmony/codec';

/**
 * What a person does with one key, named by the drawing's key name, or by a scan code where the run is asked
 * which code a pressed key raised.
 */
export type Key = string | number;
export type Action =
  | { readonly short: Key }
  | { readonly long: Key }
  | { readonly press: Key }
  // Press Power in the selected mode, and once more if that press switched the device on: what the bench
  // test asks for as "stop when the last thing heard is its power off". Only the last press is expected.
  | { readonly powerOff: true };

/** Event types in the top two bits of a key map tag. */
export const PRESS = 0x80;
export const RELEASE = 0x40;
export const HELD = 0xC0;

/** One instruction, as raw slot 7 and the key maps hold it: a `u16` operand, low byte first, and an opcode. */
export interface Instruction { readonly operand: number; readonly opcode: number }

/** A code the remote sends: its infrared group, which is the device, and its number in that group. */
export interface Send { readonly group: number; readonly code: number }

/**
 * The remote, as far as the file decides what it sends: the selected key map and the state variables.
 *
 * The state starts at each variable's `first`, which the firmware seeds from on a cold start; whether the
 * bench unit's restart after the write seeded them is not known, which is why the bench test sets the two
 * power states it depends on before Watch TV.
 */
export class Remote {
  private map: number | undefined;
  private register = 0;
  private accumulator = 0;
  private silent = false;
  private readonly values: number[];
  private readonly records: NonNullable<ReturnType<typeof stateRecords>>;
  private readonly maps: Map<number, Instruction>[];
  /** The writes the last key made, for the Power step that presses again when it switched something on. */
  writes: { index: number; value: number }[] = [];

  private readonly c: Container;
  /** The scan code of a key the test names, or the code itself. */
  private readonly scanOf: (key: Key) => number;

  constructor(c: Container, scanOf: (key: Key) => number) {
    this.c = c;
    this.scanOf = scanOf;
    this.records = stateRecords(c)!;
    this.values = this.records.map((one) => one.first);
    this.maps = c.pointerArray(6)!.map((address) => new Map(taggedList(c, address)!.entries
      .map((one) => [one.tag, { operand: one.operand, opcode: one.opcode }] as const)));
  }

  /** A key's events in the order the firmware raises them, and what they sent. */
  act(action: Action): Send[] {
    this.writes = [];
    const code = (key: Key): number => (typeof key === 'number' ? key : this.scanOf(key));
    if ('short' in action) return [...this.event(PRESS | code(action.short)), ...this.event(RELEASE | code(action.short))];
    if ('long' in action) return [...this.event(PRESS | code(action.long)), ...this.event(HELD | code(action.long))];
    if ('press' in action) return [...this.event(PRESS | code(action.press)), ...this.event(RELEASE | code(action.press))];
    const first = this.act({ press: 'Power' });
    // Pressed again only when the first press switched a device on, as the instruction says.
    return this.writes.some((one) => one.value === 1) ? this.act({ press: 'Power' }) : first;
  }

  /** The selected map first, then entry 0, the first that binds the tag. */
  private event(tag: number): Send[] {
    const binding = (this.map === undefined ? undefined : this.maps[this.map]!.get(tag)) ?? this.maps[0]!.get(tag);
    const out: Send[] = [];
    if (binding !== undefined) this.run([binding], out);
    return out;
  }

  private list(index: number): Instruction[] {
    const at = this.c.blobOffsetOf(this.c.pointerArray(7)![index]!)!;
    return Array.from({ length: bytes.u8(this.c.blob, at) }, (_, k) => ({
      operand: bytes.u16(this.c.blob, at + 1 + 3 * k), opcode: bytes.u8(this.c.blob, at + 3 + 3 * k),
    }));
  }

  /** A run of instructions in order, with a `0x71` taking the one or two after it as its arms. */
  private run(body: readonly Instruction[], out: Send[]): void {
    for (let i = 0; i < body.length; i += 1) {
      const one = body[i]!;
      if (one.opcode !== 0x71) {
        this.step(one, out);
        continue;
      }
      const variable = one.operand & 0xFF;
      const operation = (one.operand >> 8) & 0x0F;
      assert.ok(operation === 0 || operation === 1, `a 0x71 comparison ${operation} the model does not read`);
      const holds = operation === 0 ? this.register === this.values[variable] : this.register !== this.values[variable];
      if ((one.operand & 0x8000) !== 0) {
        this.step(holds ? body[i + 1]! : body[i + 2]!, out);
        i += 2;
      } else {
        if (holds) this.step(body[i + 1]!, out);
        i += 1;
      }
    }
  }

  private step(one: Instruction, out: Send[]): void {
    const { operand, opcode } = one;
    const band = operand >> 8;
    if (opcode === 0x7F) this.run(this.list(operand), out);
    else if (opcode === 0x7D) out.push({ group: band, code: operand & 0xFF });
    else if (opcode === 0x7C || opcode === 0x00) return;
    else if (opcode === 0x07 && operand === 0xFFFF) this.silent = true;
    else if (opcode === 0x07 && operand === 0xFFFB) return;
    else if (opcode === 0x1F && band === 0xFB) this.register = operand & 0xFF;
    else if (opcode === 0x1F && band === 0xFF) this.map = operand & 0xFF;
    else if (opcode === 0x1F && (band === 0xE9 || band === 0xEB)) return;
    else if (opcode === 0x7A) this.accumulator = operand;
    else if (opcode === 0x1F && band === 0xF3) this.sendNumber(operand & 0xFF, out);
    else if (opcode >= 0x80) this.write(opcode & 0x7F, operand, out);
    else assert.fail(`an instruction the model does not read: ${opcode.toString(16)} ${operand.toString(16)}`);
  }

  /**
   * `0x1F` band `0xF3`: the number sender's record, given the accumulator.
   *
   * The prefix fires only with `flags` bit 1 or 2, and which of the three digit tables a lone digit takes is
   * not stated, so the model refuses a record that needs either answer: on this file `flags` is 0 and the
   * three tables are the same thirty bytes, which a test below asserts.
   */
  private sendNumber(index: number, out: Send[]): void {
    const record = numberSenders(this.c)!.records[index]!;
    assert.equal(record.flags & 0x06, 0, 'a number sender whose prefix can fire');
    const [first, middle, last] = record.tables.map((one) => JSON.stringify(one.instructions));
    assert.ok(first === middle && middle === last, 'three different digit tables');
    const digits = String(this.accumulator + record.base).padStart(record.digits, '0');
    this.step(record.prologue, out);
    for (const digit of digits) this.step(record.tables[0]!.instructions[Number(digit)]!, out);
    this.step(record.epilogue, out);
  }

  /** `0x80 | n`: store, then fire every transition whose `from` and `to` match, in record order. */
  private write(index: number, value: number, out: Send[]): void {
    const old = this.values[index]!;
    this.values[index] = value;
    this.writes.push({ index, value });
    if (this.silent) {
      this.silent = false;
      return;
    }
    const matches = (end: number, against: number): boolean =>
      end === against || end === -2 || (end === -3 && old !== value);
    for (const one of this.records[index]!.values) {
      if (matches(one.from, old) && matches(one.to, value)) this.step({ operand: one.operand, opcode: one.opcode }, out);
    }
  }
}
