/**
 * Base slot 16, the number sender, on the two configs that populate it, both of them made for it.
 *
 * **This section was read entirely out of firmware and exercised by nothing for a year.** Section 39
 * decoded the consumer on three images, established the record layout from the bytes it reads in
 * sequence, and had to say plainly that all twenty one containers in the corpus carry a count of zero.
 * So the layout rested on the code alone, and the reader in `tables.ts` had never had a record to read.
 *
 * The sample was **made** rather than found: three favourite channels on a Harmony One, authored in
 * Logitech's own software and compiled by their service, with the numbers chosen in advance and the
 * predictions committed to `docs/predictions-number-sender.md` before the file was fetched. Section 154.
 *
 * `calibration_one` is the control and it is the same account and the same remote **without** the
 * channels, so every claim here has a companion that must come back empty.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { IMAGES, imagePath, load, require_, skipUnless, skipWithoutLab } from '@harmony/lab';
import { parse } from '../src/gspm.ts';
import {
  NUMBER_SENDER_DIGITS,
  NUMBER_SENDER_RECORD_LENGTH,
  NUMBER_SENDER_TABLE_LENGTH,
  numberSenders,
} from '../src/tables.ts';
import { claims, coverage } from '../src/coverage.ts';
import { stateRecords } from '../src/sections.ts';
import { emit } from '../src/emit.ts';
import { IR_CLASS_STREAM, irBlockWords, irClass, irGroups, irHeaderPointers } from '../src/ir.ts';
import { frameKey, framesOfPulses, fromFirstMark } from '../src/irframe.ts';
import { pulsesOfWords } from '../src/irda.ts';

const SAMPLE = 'calibration_favchannels';
/** The same account and remote before the channels existed. */
const CONTROL = 'calibration_one';

test('the count is 1 and not 3, so a record is a method for sending a number',
  skipUnless(SAMPLE), () => {
    // **The prediction that carried the section.** A record holds digit tables, a base and a minimum
    // digit count, and the value reaches it in the accumulator, so one television is one record
    // however many channels point at it. Three records would have meant a record is a channel and
    // section 39's central claim was wrong.
    const table = numberSenders(parse(require_(SAMPLE)));
    assert.notEqual(table, undefined, 'the slot is populated');
    assert.equal(table?.records.length, 1);
  });

test('the record is 23 bytes of the layout section 39 derived, field by field',
  skipUnless(SAMPLE), () => {
    const record = numberSenders(parse(require_(SAMPLE)))?.records[0];
    assert.notEqual(record, undefined);
    // `base` is zero and `digits` is zero: nothing is added to the value and there is no minimum
    // width, so channel 1 is sent as one digit. The prediction said `digits` would be 1, which
    // behaves identically because the conversion raises the floor, and 0 is the honest value.
    assert.equal(record?.base, 0);
    assert.equal(record?.digits, 0);
    // Bit 2, which sets the prefix threshold to a hundred. The prediction said bits 1 and 2 would be
    // clear, and this is the one field it got wrong. The prefix it arms is NULL, so the mechanism is
    // switched on and points at an instruction that does nothing; one sample cannot say why.
    assert.equal(record?.flags, 0x04);
    assert.deepEqual(record?.prefix, { opcode: 0x00, operand: 0x0000 });
    assert.deepEqual(record?.prologue, { opcode: 0x00, operand: 0x0000 });
    // Queued after the last digit, and it is a real instruction: run an action list.
    assert.deepEqual(record?.epilogue, { opcode: 0x7f, operand: 0x0289 });
    // Three distinct pointers, each 30 bytes past the last, so the tables are three copies rather
    // than one address named three times. Their contents are identical.
    const addresses = record?.tables.map((one) => one.address) ?? [];
    assert.equal(new Set(addresses).size, 3);
    assert.deepEqual(addresses, [0x06b5df, 0x06b5fd, 0x06b61b]);
    for (const one of addresses.slice(1)) {
      assert.equal(one - (addresses[0] as number) > 0, true);
    }
    assert.deepEqual(record?.tables[1]?.instructions, record?.tables[0]?.instructions);
    assert.deepEqual(record?.tables[2]?.instructions, record?.tables[0]?.instructions);
    for (const one of record?.tables ?? []) {
      assert.equal(one.instructions.length, NUMBER_SENDER_DIGITS);
    }
  });

test('the digit at index k sends the command Logitech named k, ten of ten',
  skipUnless(SAMPLE, 'account_commands'), () => {
    // **The closure, and the two ends have nothing in common.** The index comes from the firmware's
    // own reading of the record, and the name comes from the account that generated this config,
    // matched by decoding the stored infrared code into the bit frame a device sees. So a table
    // position predicts a word Logitech chose, and the eleventh instruction is a word too.
    const c = parse(require_(SAMPLE));
    const record = numberSenders(c)?.records[0];
    assert.notEqual(record, undefined);

    /** Every command the account states, keyed on the frame value as an integer. */
    const catalogue = new Map<string, string>();
    const path = imagePath('account_commands');
    assert.notEqual(path, undefined);
    const replies: { Name?: string; KeyCode?: string }[] = [];
    JSON.stringify(JSON.parse(readFileSync(path as string, 'utf8').replace(/^﻿/, '')),
      (_key, value) => {
        if (value && typeof value === 'object' && 'Name' in value && 'KeyCode' in value) {
          replies.push(value as { Name?: string; KeyCode?: string });
        }
        return value;
      });
    for (const one of replies) {
      const hex = one.KeyCode?.match(/\(0x([0-9A-Fa-f]+)\)/)?.[1];
      // On the number and never the spelling: they pad to whole nibbles and we do not, so their
      // `0x010` is our `10`. Section 133 records the same trap.
      if (hex !== undefined && one.Name !== undefined) catalogue.set(BigInt(`0x${hex}`).toString(16), one.Name);
    }
    assert.equal(replies.length, 194, 'the account command list, exact');

    /** `0x7D`'s operand is `{ u8 group; u8 index }`, section 33. */
    const named = (operand: number): string | undefined => {
      const record_ = irGroups(c)?.[operand >> 8]?.addresses[operand & 0xff];
      if (record_ === undefined || irClass(c, record_) !== IR_CLASS_STREAM) return undefined;
      const first = irHeaderPointers(c, record_)[0];
      const words = first === undefined ? undefined : irBlockWords(c, first);
      if (words === undefined) return undefined;
      const readings = framesOfPulses(fromFirstMark(pulsesOfWords(words)));
      if (readings.length !== 1) return undefined;
      const value = BigInt(`0x${frameKey(readings[0]!).split(':')[1]}`).toString(16);
      return catalogue.get(value);
    };

    /** A digit's instruction runs an action list, which sends one code. */
    const lists = c.actionLists() ?? [];
    const codeOf = (operand: number): number | undefined => {
      const list = lists[operand];
      return list?.find((one) => one.opcode === 0x7d)?.operand;
    };

    const digits: (string | undefined)[] = [];
    for (const one of record?.tables[0]?.instructions ?? []) {
      assert.equal(one.opcode, 0x7f, 'a digit runs an action list');
      const code = codeOf(one.operand);
      digits.push(code === undefined ? undefined : named(code));
    }
    assert.deepEqual(digits, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    // And the terminator, which section 39 predicted would be an Enter or a Select and is one.
    const epilogueCode = codeOf(record?.epilogue.operand as number);
    assert.equal(epilogueCode === undefined ? undefined : named(epilogueCode), 'Select');
  });

test('the three channels are three action lists, not three records',
  skipUnless(SAMPLE), () => {
    // The other half of the first claim. Each list loads a constant and hands it to record 0 of base
    // slot 16, `0x1F` with the operand's high byte `0xF3`, section 39.
    const c = parse(require_(SAMPLE));
    const found: number[] = [];
    for (const list of c.actionLists() ?? []) {
      const send = list.findIndex((one) => one.opcode === 0x1f && one.operand >> 8 === 0xf3);
      if (send <= 0) continue;
      const load_ = list[send - 1];
      assert.equal(load_?.opcode, 0x7a, 'the instruction before the send loads the accumulator');
      assert.equal((list[send]?.operand ?? 0) & 0xff, 0, 'record 0, the only one there is');
      found.push(load_?.operand as number);
    }
    // The three numbers that were typed into Logitech's software, in the file.
    assert.deepEqual(found.sort((a, b) => a - b), [1, 100, 666]);
  });

test('the control declares the section and puts nothing in it, and grows by three bytes',
  skipUnless(CONTROL, SAMPLE), () => {
    // **What makes the sample a measurement rather than a description.** `calibration_one` is the same
    // Harmony One on the same account compiled ten days earlier, differing in the three channels and
    // nothing else.
    //
    // Its slot is **not** NULL, which is worth stating because the obvious reading is that a config
    // with no channels omits the section: it carries a count of zero and one byte of section. The
    // sample carries four, a count and one pointer, so the section grows by exactly the width of a
    // pointer and by nothing else.
    const before = numberSenders(parse(require_(CONTROL)));
    assert.equal(before?.records.length, 0);
    assert.equal(before?.length, 1);
    const after = numberSenders(parse(require_(SAMPLE)));
    assert.equal(after?.records.length, 1);
    assert.equal(after?.length, 4);
  });

test('two containers declare a method for sending a number, 25 declare none, 9 are unread',
  skipWithoutLab(), () => {
    // Exact, and split three ways, because each column is a different claim and a total would let any
    // of them go to zero unnoticed. The interesting number is the 2: this section stayed unexercised
    // for a year because that column was empty, and both of its members were manufactured.
    let populated = 0;
    let declaredEmpty = 0;
    let unread = 0;
    for (const name of Object.keys(IMAGES)) {
      const data = load(name);
      if (data === undefined) continue;
      let table;
      try {
        table = numberSenders(parse(data));
      } catch {
        continue;
      }
      if (table === undefined) unread += 1;
      else if (table.records.length === 0) declaredEmpty += 1;
      else populated += 1;
    }
    // The sum first, because it is what makes the three below a partition rather than three
    // independent numbers: a lab missing a sample moves this one and fails here.
    assert.equal(populated + declaredEmpty + unread, 36, 'every container the lab can parse');
    assert.equal(populated, 2);
    assert.equal(declaredEmpty, 25);
    // Seven arch 10 (Harmony 890) reads, whose slot mapping is deliberately ungated so the container
    // states no architecture, plus the two containers found inside arch 8 firmware images, which
    // report architecture 0. Counted separately because "the reader declined" and "the config says
    // none" are different answers, and a total would hide the first inside the second.
    assert.equal(unread, 9);
  });

test('the accounting claims the record and its tables, and 113 is the closure',
  skipUnless(SAMPLE), () => {
    // **An independent numeric closure.** The byte accounting knew nothing about base slot 16 until
    // this commit and reported exactly one gap of 113 bytes on this container. Section 39's layout
    // says 23 for the record and 30 for each of three digit tables, which is 113. Two routines with
    // nothing in common agreeing on a number to the byte is the shape the verification standard asks
    // for, and it is why the claim below is stated as its parts rather than as a total.
    const c = parse(require_(SAMPLE));
    const report = coverage(c);
    assert.equal(report.gaps.length, 0);
    assert.equal(report.overlaps.length, 0);
    assert.equal(report.accounted, report.total);
    const per = new Map<string, number>();
    for (const claim of claims(c)) {
      if (!claim.owner.startsWith('slot-16')) continue;
      per.set(claim.owner, (per.get(claim.owner) ?? 0) + claim.length);
    }
    assert.deepEqual(Object.fromEntries([...per].sort()), {
      // A count byte and one three byte pointer.
      'slot-16-table': 4,
      'slot-16-record': NUMBER_SENDER_RECORD_LENGTH,
      'slot-16-digits': 3 * NUMBER_SENDER_TABLE_LENGTH,
    });
    assert.equal(NUMBER_SENDER_RECORD_LENGTH + 3 * NUMBER_SENDER_TABLE_LENGTH, 113);
  });

test('the emitter puts the whole container back byte for byte', skipUnless(SAMPLE), () => {
  // The reader's real test: a field read wrong is a field written wrong. Nothing is copied, so no
  // byte of this container reaches the output without a rebuilder claiming it.
  const data = require_(SAMPLE);
  const report = emit(parse(data));
  assert.deepEqual(report.bytes, data);
  assert.equal(report.copied, 0);
});

/**
 * The fourth known answer sample, and what it settled: a leading zero takes another road entirely.
 *
 * `calibration_favzero` was authored with five favourite channels whose labels and numbers were chosen
 * to force the question. `1`, `11` and `111` are plain numbers; `001` and `011` are the same first two
 * written with a leading zero, so a config that pads would have to say so somewhere.
 *
 * It does not pad. The three plain numbers reach base slot 16 through the accumulator, and the two
 * written with zeros **do not use base slot 16 at all**: their transition runs a list of one send per
 * digit. So the `digits` field, which the firmware treats as a floor the conversion raises, is not how
 * Logitech expresses a leading zero, and a writer therefore has two mechanisms rather than one field.
 *
 * The closure is internal, which is why this needs no outside answer: the two sequences are built from
 * the **same two** send lists, in the two arrangements that spell their own labels.
 */
const ZERO_SAMPLE = 'calibration_favzero';

/** `0x1F` with this operand is what hands the accumulator to the number sender. */
const HANDOVER_OPERAND = 0xf300;
/** Loads a literal into the accumulator. */
const OPCODE_LOAD = 0x7a;
/** Runs another base slot 10 list, its operand naming the entry. */
const OPCODE_RUN = 0x7f;
/** Sends an infrared code, its operand being `{ u8 group; u8 index }`. */
const OPCODE_SEND = 0x7d;
const OPCODE_REGISTER = 0x1f;

/** Every base slot 10 list that hands a value to the number sender, and the value it loads. */
function handoverLists(lists: readonly { opcode: number; operand: number }[][]) {
  const found = new Map<number, number>();
  lists.forEach((list, index) => {
    const hands = list.some((i) => i.opcode === OPCODE_REGISTER && i.operand === HANDOVER_OPERAND);
    const load = list.find((i) => i.opcode === OPCODE_LOAD);
    if (hands && load !== undefined) found.set(index, load.operand);
  });
  return found;
}

test('three channels reach the number sender and the two with a leading zero do not',
  skipUnless(ZERO_SAMPLE), () => {
    const c = parse(require_(ZERO_SAMPLE));
    const lists = c.actionLists() ?? [];
    const senders = handoverLists(lists);
    // Five favourites were authored and only three hand a value over, because 001 and 011 collapse
    // onto 1 and 11 as integers and the generator refuses to lose the zeros that way.
    assert.deepEqual([...senders.values()].sort((a, b) => a - b), [1, 11, 111]);
    // And the record itself carries no minimum digit count, which is the field a padding reading
    // would have had to use.
    const record = numberSenders(c)?.records ?? [];
    assert.equal(record.length, 1);
    assert.equal(record[0]?.digits, 0);
  });

test('the two zero padded channels spell themselves out of one pair of digit codes',
  skipUnless(ZERO_SAMPLE), () => {
    const c = parse(require_(ZERO_SAMPLE));
    const lists = c.actionLists() ?? [];
    const senders = handoverLists(lists);

    // The reference lives in base slot 13, not in a key binding: a favourite is a state variable
    // value whose transition runs the list. Section 154. Two records hold them, a mode page's set
    // and the copy nothing reads, so the assertion is over the record rather than over the corpus.
    const wrappers = new Set<number>();
    lists.forEach((list, index) => {
      if (list.some((i) => i.opcode === OPCODE_RUN && senders.has(i.operand))) wrappers.add(index);
    });
    const holders = (stateRecords(c) ?? []).filter((r) =>
      r.values.some((v) => v.opcode === OPCODE_RUN && wrappers.has(v.operand)));
    assert.equal(holders.length, 2);

    for (const holder of holders) {
      // Five transitions, one per authored favourite, and every one of them wired.
      assert.equal(holder.values.length, 5);
      const spelled: number[][] = [];
      let viaSender = 0;
      for (const value of holder.values) {
        const body = lists[value.operand] ?? [];
        if (body.some((i) => i.opcode === OPCODE_RUN && senders.has(i.operand))) { viaSender += 1; continue; }
        // Otherwise it runs one list per digit, each of which sends a single code.
        const digits = body
          .filter((i) => i.opcode === OPCODE_RUN)
          .map((i) => (lists[i.operand] ?? []).find((x) => x.opcode === OPCODE_SEND)?.operand)
          .filter((x): x is number => x !== undefined);
        if (digits.length > 0) spelled.push(digits);
      }
      assert.equal(viaSender, 3);
      assert.equal(spelled.length, 2);

      // The closure. Two codes only, and each sequence is three digits long.
      const codes = new Set(spelled.flat());
      assert.equal(codes.size, 2);
      assert.deepEqual(spelled.map((s) => s.length), [3, 3]);
      // One sequence uses the first code twice and the other uses the second twice, which is 001
      // against 011. Written as a comparison of the two shapes so it cannot pass by naming a code.
      const shapes = spelled
        .map((s) => s.map((code) => (code === s[0] ? 'a' : 'b')).join(''))
        .sort();
      assert.deepEqual(shapes, ['aab', 'abb']);
    }
  });

test('the control has no digit spelling at all, because none of its channels carries a zero',
  skipUnless(SAMPLE), () => {
    // `calibration_favchannels` authored 1, 100 and 666, so every one of its three is a plain number
    // and all three go through the sender. Without this the test above could be describing any config
    // with favourites rather than the leading zero case.
    const c = parse(require_(SAMPLE));
    const lists = c.actionLists() ?? [];
    const senders = handoverLists(lists);
    assert.deepEqual([...senders.values()].sort((a, b) => a - b), [1, 100, 666]);
  });
