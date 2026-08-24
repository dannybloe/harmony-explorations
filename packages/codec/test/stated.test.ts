/**
 * That a protocol family's own durations reproduce the codes of the corpus, which is what a device built
 * from nothing needs.
 *
 * **The claim is the one `bin/protocols.ts` measures, asserted here so it cannot rot.** Logitech's device
 * database states a code as a family and a number and never a rhythm, so a document starting from nothing
 * has to get the rhythm from somewhere. Section 152 got it from a sibling code of the same appliance,
 * which a fresh document has not got. This gets it from the family.
 *
 * The table is generated from the corpus, so a test that only read the table would be circular. What
 * makes these assertions bite is that two of them come from outside it: Sony's frame period against the
 * published constant, and every entry's own measured spread.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { pulsesOfFrame } from '../src/irframe.ts';
import { PROTOCOLS } from '../src/protocols.ts';
import { closingSpace, pulsesOfStatedCode, statedCode, statedProtocol, timingsOf }
  from '../src/stated.ts';

test('the table states seven entries, six measured and one documented, and what each is worth', () => {
  // Exact, per the house rule: a floor would absorb an entry falling out of the generator, and the
  // number moves only when somebody regenerates it, and then it moves in the diff.
  assert.equal(PROTOCOLS.length, 7);
  // **The two provenances are two different claims and the test keeps them apart.** A measured entry
  // reproduces what Logitech's compiler emitted, and `exact` counts that. A documented entry is the
  // published nominal rhythm of a family the corpus holds no record of at all, so `codes` is zero
  // because it was measured over none, and what it has instead is their own analyser hearing our train
  // and recovering the bits.
  const measured = PROTOCOLS.filter((one) => one.source === 'corpus');
  const documented = PROTOCOLS.filter((one) => one.source === 'documented');
  assert.equal(measured.length, 6);
  assert.deepEqual(documented.map((one) => [one.family, one.codes, one.readBack]),
                   [['Sharp 15 Bit', 0, 17]]);
  assert.deepEqual(documented.map((one) => one.heardAs), ['Proceed 14 Bit'],
                   'their analyser names it something else, which is coarser and not a disagreement');
  // The one entry in the table with no lead in, which is what the Sharp scheme is.
  assert.deepEqual(PROTOCOLS.filter((one) => one.header[0] === 0).map((one) => one.family),
                   ['Sharp 15 Bit']);
  assert.equal(measured.reduce((n, one) => n + one.codes, 0), 177);
  assert.equal(measured.reduce((n, one) => n + one.exact, 0), 150);
  // Five of the six reproduce every code of their entry to the microsecond. The sixth is the interesting
  // one and it is named rather than tolerated: NEC at 38 kHz under Logitech's Memorex label, where three
  // duration sets appear across the corpus and the commonest reproduces 81 of 108 exactly and all 108
  // within two percent. So a code emitted from it is accepted by the equipment and is not byte identical
  // to what their compiler emitted.
  const loose = measured.filter((one) => one.spread > 0);
  assert.deepEqual(loose.map((one) => [one.family, one.spread]), [['MemorexO1 32 Bit', 0.02]]);
  assert.deepEqual(loose.map((one) => [one.exact, one.codes]), [[81, 108]]);
});

test("Sony's frame period is the published 45 ms, which nothing here fitted to", () => {
  // **The independent closure, and the reason the pulse width families are believed.** The period is not
  // a field anywhere: it is the sum of a code's own header, bits and closing space, computed per code and
  // then found to be the same number for every code of the family. That it lands on exactly 45000
  // microseconds, which is the frame period Sony's protocol is documented with, is a second route to the
  // same value. Keying the closing space into the table instead made Sony 12 Bit look like three
  // protocols over three codes.
  for (const family of ['Sony 12 Bit', 'Sony 15 Bit']) {
    const entry = statedProtocol(family);
    assert.ok(entry !== undefined, family);
    assert.equal(entry.framePeriod, 45000, `${family} pads its frame out to a constant`);
    assert.equal(entry.carries, 'mark', 'a pulse width protocol, which is why it has a period at all');
  }
  // And the consequence, which is what the period is for: the closing space is shorter by one bit's worth
  // for every one bit, so two codes of one protocol have different closing spaces and the same durations.
  const sony = statedProtocol('Sony 12 Bit')!;
  const zeroes = closingSpace(sony, 12, 0x000n);
  const ones = closingSpace(sony, 12, 0xFFFn);
  assert.ok(zeroes !== undefined && ones !== undefined);
  assert.equal(zeroes - ones, 12 * (sony.one - sony.zero),
               'the gap gives back exactly what the one bits took');
});

test('a stated code becomes a frame, and an unknown family becomes nothing', () => {
  const built = pulsesOfStatedCode('Sony 12 Bit', 12, 0x910n);
  assert.ok(built !== undefined);
  // Two pulses of header plus one pair per bit, and it starts on a mark.
  assert.equal(built.length, 2 + 2 * 12);
  assert.equal(built[0]?.mark, true);
  assert.equal(built[0]?.us, 2400);
  // The whole frame lasts the protocol's own period, which is the closure above seen from the encoder.
  assert.equal(built.reduce((n, p) => n + p.us, 0), 45000);
  // **The refusal, which is the half that matters.** The biphase families are absent from the table on
  // purpose: our own decoder cannot produce their number, so no durations were ever derived, and a
  // guessed rhythm would be a command that does nothing presented as one that works.
  // The documented entry goes down the same path, and its train opens on a bit cell rather than a lead
  // in, which is the whole reason the encoder had to learn a header of nothing.
  const sharp = pulsesOfStatedCode('Sharp 15 Bit', 15, 0x1BACn);
  assert.equal(sharp?.length, 30, 'fifteen pairs and nothing before them');
  assert.equal(sharp?.[0]?.us, 320, 'the first pulse is the first bit cell');
  assert.equal(pulsesOfStatedCode('Microsoft 30 Bit', 30, 0x3FF07BA1n), undefined);
  assert.equal(pulsesOfStatedCode('Not A Protocol', 8, 0x12n), undefined);
});

test('a family at two carriers is two entries, and asking without one picks the larger', () => {
  // The measured reason the carrier is part of the key: SharpO1 48 Bit came out as two duration sets
  // until it was split this way, after which each half reproduces every one of its codes exactly.
  const sharp = PROTOCOLS.filter((one) => one.family === 'SharpO1 48 Bit');
  assert.equal(sharp.length, 2);
  assert.deepEqual(sharp.map((one) => one.periodNs).sort((a, b) => a - b), [26315, 27472]);
  assert.deepEqual(sharp.map((one) => one.spread), [0, 0]);
  // Different durations, which is the point: one entry cannot serve both.
  assert.notDeepEqual(timingsOf(sharp[0]!), timingsOf(sharp[1]!));
  // Asked with a carrier it is exact; asked without, it is whichever was measured over more codes, and
  // that is a documented best guess rather than an answer.
  assert.equal(statedProtocol('SharpO1 48 Bit', 27472)?.header[0], 3480);
  assert.equal(statedProtocol('SharpO1 48 Bit', 26315)?.header[0], 3364);
  assert.equal(statedProtocol('SharpO1 48 Bit')?.codes, 33);
  assert.equal(statedProtocol('SharpO1 48 Bit', 12345), undefined);
});

test('a catalogue code is a grammar, and reading one slot of it reads half a command', () => {
  // **Their string is `G:<family>:(<A>)(<B>)(<C>):<n>` and slots A and B both hold content.** The first
  // reading here treated A as parameters to skip. Six item sequences occur across the 2921 distinct
  // codes measured, and one literal of each is asserted here so a parser change cannot quietly drop one.
  const shape = (keyCode: string): string =>
    (statedCode(keyCode)?.items ?? []).map((one) => one.kind === 'word' ? one.word : 'v').join('+');
  assert.equal(shape('G:Sony 12 Bit:()(0x910)():3'), 'v');
  assert.equal(shape('G:Toshiba 32 Bit:(0x20DF08F7)(Repeat)():3'), 'v+Repeat');
  assert.equal(shape('G:Sharp 15 Bit:()(0x1BAC_0x1853)():3'), 'v+v');
  assert.equal(shape('G:JVCO1 16 Bit:(Start)(0xC55A)():3'), 'Start+v');
  assert.equal(shape('G:Philips Hurd 16 Bit LongToggle:()(0x7_1x0_2xFBFF)():3'), 'v+v+v');
  assert.equal(shape('G:MitsubishiO1 Dual 8 16 Bit:()(Start_0x40_0x98_Trailer)():3'),
               'Start+v+v+Trailer');

  // **The two corrections, each named, because each was a command that would have gone out wrong.**
  // Toshiba puts its number in slot A and the word `Repeat` in slot B, so a reader wanting a number in
  // slot B refused every Toshiba code in the catalogue, and Toshiba is the family the most appliances
  // in the census use.
  const toshiba = statedCode('G:Toshiba 32 Bit:(0x20DF08F7)(Repeat)():3');
  assert.deepEqual(toshiba?.frames, [{ value: 0x20DF08F7n, bits: 32, index: 0 }]);
  assert.deepEqual(toshiba?.words, ['Repeat']);
  // And Pioneer puts a frame in each slot, so reading slot B alone emitted the second frame as though
  // it were the whole command. It parses, and their own analyser answers with the number it was built
  // from, so nothing about the result says half the command is missing.
  const pioneer = statedCode('G:Pioneer 32 Bit 2:(0xC53A9966)(0xF50A5DA2)():3');
  assert.deepEqual(pioneer?.frames.map((one) => one.value), [0xC53A9966n, 0xF50A5DA2n]);
  assert.equal(pioneer?.bits, 32, 'the first frame, which is what an encoder is handed');

  // **A family naming two widths states one per frame, in order**, which is the reading that makes
  // "Samsung 16 and 20 Bit" mean something. The old code took the last width for the whole code.
  const wide = statedCode('G:Samsung 16 and 20 Bit:()(0x0400_1xED02F)():3');
  assert.deepEqual(wide?.frames, [{ value: 0x0400n, bits: 16, index: 0 },
                                  { value: 0xED02Fn, bits: 20, index: 1 }]);
  // Their position digit, kept as written. What it indexes is unread: across every code the digits form
  // exactly the runs 0, 00, 01 and 012.
  assert.deepEqual(statedCode('G:Sharp 15 Bit:()(0x1BAC_0x1853)():3')?.frames.map((f) => f.index),
                   [0, 0], 'both zero where the two frames are the same width');

  // **A value too big for the width its family names is a refusal.** One family in the census fails it,
  // all 69 of its codes, and the cause is that its digits are quaternary rather than hexadecimal, so
  // reading them as hexadecimal would emit a command three times too long that looks perfectly valid.
  assert.equal(statedCode('G:Galaxis 16 Bit Quad Toggle:()(0x02031000_1x0_2x2123201)():3'), undefined);
  // The negative that makes that check mean something: the same shape with values that do fit is read.
  assert.notEqual(statedCode('G:Galaxis 16 Bit Quad Toggle:()(0x0203_1x0_2x2123)():3'), undefined);

  // And the rest of the refusals, which is what stops a malformed code becoming a plausible one.
  assert.equal(statedCode('not their notation at all'), undefined);
  assert.equal(statedCode('G:Mystery Protocol:()(0x12)():3'), undefined, 'no width in the name');
  assert.equal(statedCode('G:Sony 12 Bit:()(Dither)():3'), undefined, 'a word outside the closed set');
});

test('a protocol with no lead in emits none, rather than a pair of zero length pulses', () => {
  // **Some families open on their first bit.** The Sharp scheme has no lead in at all, so a table entry
  // for it has to be able to say so, and `[0, 0]` is how. Emitting it literally would put a pair in the
  // train that no receiver can see and that our own decoder would then read as a bit cell.
  const headerless = pulsesOfFrame(
    { header: [0, 0], flat: 320, zero: 680, one: 1680, carries: 'space' }, 4, 0b1010n);
  assert.equal(headerless.length, 8, 'four bit cells and nothing before them');
  assert.deepEqual(headerless.map((one) => one.us), [320, 1680, 320, 680, 320, 1680, 320, 680]);
  // The control, so the test is about the zero and not about the loop: a real header is still emitted.
  const withHeader = pulsesOfFrame(
    { header: [3400, 1700], flat: 320, zero: 680, one: 1680, carries: 'space' }, 4, 0b1010n);
  assert.equal(withHeader.length, 10);
  assert.deepEqual(withHeader.slice(0, 2).map((one) => one.us), [3400, 1700]);
});
