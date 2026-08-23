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

import { PROTOCOLS } from '../src/protocols.ts';
import { closingSpace, pulsesOfStatedCode, statedCode, statedProtocol, timingsOf }
  from '../src/stated.ts';

test('the table states six entries and what each one is worth', () => {
  // Exact, per the house rule: a floor would absorb an entry falling out of the generator, and the
  // number moves only when somebody regenerates it, and then it moves in the diff.
  assert.equal(PROTOCOLS.length, 6);
  assert.equal(PROTOCOLS.reduce((n, one) => n + one.codes, 0), 177);
  assert.equal(PROTOCOLS.reduce((n, one) => n + one.exact, 0), 150);
  // Five of the six reproduce every code of their entry to the microsecond. The sixth is the interesting
  // one and it is named rather than tolerated: NEC at 38 kHz under Logitech's Memorex label, where three
  // duration sets appear across the corpus and the commonest reproduces 81 of 108 exactly and all 108
  // within two percent. So a code emitted from it is accepted by the equipment and is not byte identical
  // to what their compiler emitted.
  const loose = PROTOCOLS.filter((one) => one.spread > 0);
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

test('a catalogue code may state two frames, and reading one is reading half a command', () => {
  // **The notation has an underscore and a first reading of it did not**, which is the kind of quiet
  // mistake this project keeps a rule about: a pattern reading hexadecimal up to the separator takes the
  // first frame, parses cleanly, and emits a command that sends half of what it should.
  const one = statedCode('G:Sony 12 Bit:()(0x910)():3');
  assert.deepEqual(one, { family: 'Sony 12 Bit', bits: 12, frames: [0x910n] });
  const two = statedCode('G:Sharp 15 Bit:()(0x1BAC_0x1853)():3');
  assert.deepEqual(two,
                   { family: 'Sharp 15 Bit', bits: 15, frames: [0x1BACn, 0x1853n], secondPrefix: '0x' });
  // Their own second prefix, kept as written because what it means is unread. Their `1x` appears on the
  // families whose two frames are different widths.
  const wide = statedCode('G:Samsung 16 and 20 Bit:()(0x0400_1xED02F)():3');
  assert.equal(wide?.secondPrefix, '1x');
  assert.deepEqual(wide?.frames, [0x0400n, 0xED02Fn]);
  // A family naming two widths yields the last, and the docstring says that is a guess about their
  // spelling rather than a reading. The parameter slot may be occupied, which their JVC answers do.
  assert.equal(wide?.bits, 20);
  assert.equal(statedCode('G:JVCO1 16 Bit:(Start)(0xC55A)():3')?.bits, 16);
  // And the refusals, which is what stops a malformed code becoming a plausible one.
  assert.equal(statedCode('not their notation at all'), undefined);
  assert.equal(statedCode('G:Mystery Protocol:()(0x12)():3'), undefined, 'no width in the name');
  assert.equal(statedCode('G:Sony 12 Bit:()(0x1_0x2_0x3)():3'), undefined, 'three frames');
});
