/**
 * The two tables of a Harmony One configuration that no other builder on the composed path writes,
 * `todo-compile-one.md` 6.7: raw slot 18, the section the One's table inserts and the base layout does not
 * have, and base slot 16's table, the number senders. Until this module both came out of the donor as they
 * were, three bytes on the test setup, `test/composesetup.test.ts`.
 *
 * **Raw slot 18 is generated whole, as a constant**, because it is one: two zero bytes on all 36 distinct
 * Harmony One containers in the lab, Logitech's nineteen compiles, ours and the safe mode one alike, with
 * nothing parked in front of it on any of them (`frame.ts`, measured in `test/frame.test.ts`;
 * `todo-compile-one.md` 2.2). The firmware seeks the slot twice, section 38, and what it does with what it
 * finds there is unread. So the builder writes the one form every container shows and **refuses a
 * configuration holding another**, rather than overwriting bytes whose meaning nothing here knows: there is
 * no description to read, so a different value is a configuration nothing here has seen, not one to rebuild.
 *
 * **Base slot 16's table is generated from the records it names**, `numberSenderTable` beside the reader in
 * `tables.ts`: its count and one address per record. The composers make no favourite channel sent as a
 * number, so on the composed test setup it is one byte, a count of zero. A donor that holds records keeps
 * them, carried: building a record is a favourite channel's composer's, and eight of the nineteen One compiles
 * hold one (`calibration_favchannels` among them), so a refusal here would refuse those donors for a part this
 * module does not build. The table is rebuilt over the records in the order the configuration's table named
 * them, and the records themselves are not touched.
 *
 * Each takes a configuration apart and answers it with the generated piece in place, and that piece, so a
 * caller laying the result out can find where it landed: `families/touch/builders.ts` puts both on the
 * composed path after the state tables and counts their bytes in `touchBuiltBytes`. Neither changes a byte of
 * a configuration holding the form every One container holds, so where they run among the builders is free;
 * last, since nothing else reads them.
 *
 * Arch 12 (Harmony One) alone: raw slot 18 is the touch family's own section, `FRAME_ARCHITECTURES`, and the
 * number sender table is the format's on every family but is put on the One's composed path only here.
 */
import type { ContainerLayout, ContainerPiece } from '../../frame.ts';
import { RAW_SLOT_PREFIX } from '../../coverage.ts';
import { ComposeError } from '../../shared/core.ts';
import { NUMBER_SENDER_SLOT, numberSenderTable } from '../../tables.ts';

/** Raw slot 18 of every Harmony One container in the lab, 36 of 36: two zero bytes. */
export const TOUCH_INSERTED_SECTION: Readonly<Uint8Array> = Uint8Array.of(0, 0);

/** A layout with one generated piece put in place, and the piece. */
export interface WithGenerated {
  layout: ContainerLayout;
  piece: ContainerPiece;
}

/**
 * The configuration's inserted section, raw slot 18 on the Harmony One, generated: `TOUCH_INSERTED_SECTION`
 * as its table, whatever was parked in front of it kept where it was (nothing, on every One container).
 *
 * Refuses a layout with no inserted section or more than one, which is not a Harmony One's, and one whose
 * section is not the two zero bytes: what the firmware reads there is unknown, so another value is not one
 * this builder may replace.
 */
export function withTouchInsertedSection(layout: ContainerLayout): WithGenerated {
  const raws = Object.keys(layout.inserted ?? {}).map(Number);
  if (raws.length !== 1) {
    throw new ComposeError(`a Harmony One configuration inserts one section, raw slot 18, and this one inserts ${raws.length}`);
  }
  const raw = raws[0]!;
  const placed = layout.inserted![raw]!;
  const held = placed.head.flatMap((piece) => [...piece.bytes]);
  if (held.length !== TOUCH_INSERTED_SECTION.length || held.some((one, k) => one !== TOUCH_INSERTED_SECTION[k])) {
    throw new ComposeError(`raw slot ${raw} holds ${held.length} bytes, ${Buffer.from(held).toString('hex')}, where every Harmony `
      + `One container holds two zero bytes; what the firmware reads there is unread, so it is not rebuilt`);
  }
  // `raw-18-table`, the owner `coverage.ts` gives the section, so the frame keeps it the inserted slot's own.
  const piece: ContainerPiece = { bytes: TOUCH_INSERTED_SECTION.slice(), refs: [], owner: `${RAW_SLOT_PREFIX}-${raw}-table` };
  return { layout: { ...layout, inserted: { ...layout.inserted, [raw]: { before: placed.before, head: [piece] } } }, piece };
}

/**
 * Base slot 16's table generated from the records the configuration's own table names, in its order, the
 * records and anything after the table in the slot kept as they were.
 *
 * Refuses a table that does not read as a count and one address per record, each naming the start of a
 * piece: a table the frame cut otherwise is not one this rebuilds.
 */
export function withNumberSenderTable(layout: ContainerLayout): WithGenerated {
  const placed = layout.sections[NUMBER_SENDER_SLOT];
  const table = placed?.head[0];
  if (placed === undefined || table === undefined) throw new ComposeError(`base slot ${NUMBER_SENDER_SLOT} has no table`);
  const refs = [...table.refs].sort((a, b) => a.at - b.at);
  const records = refs.flatMap((ref) => ('to' in ref && ref.offset === 0 ? [ref.to] : []));
  if (records.length !== refs.length || table.bytes.length !== 1 + 3 * records.length || table.bytes[0] !== records.length) {
    throw new ComposeError(`base slot ${NUMBER_SENDER_SLOT}'s table does not read as a count and an address per record`);
  }
  const piece = numberSenderTable(records);
  return {
    layout: {
      ...layout,
      sections: layout.sections.map((one, slot) => (slot === NUMBER_SENDER_SLOT ? { before: placed.before, head: [piece, ...placed.head.slice(1)] } : one)),
    },
    piece,
  };
}
