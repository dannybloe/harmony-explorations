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

import { framesOfPulses, pulsesOfFrame } from '../src/irframe.ts';
import { PROTOCOLS } from '../src/protocols.ts';
import { closingSpace, pulsesOfStatedCode, statedCode, statedProtocol, timingsOf }
  from '../src/stated.ts';

test('the table states thirty entries, and what each is worth is its provenance', () => {
  // Exact, per the house rule: a floor would absorb an entry falling out of the generator, and the
  // number moves only when somebody regenerates it, and then it moves in the diff.
  assert.equal(PROTOCOLS.length, 30);
  // **Three provenances, and they are three different strengths of claim.** `corpus` is a record some
  // remote was really carrying, whose family came from Logitech's analyser naming our decoding of it.
  // `compiled` is a record their own compiler produced on request, whose family their own catalogue
  // states, so no decoder of anyone's is involved at either end. `both` is the one to look for: two
  // routes with no shared code landing on the same durations.
  const count = (source: string) => PROTOCOLS.filter((one) => one.source === source).length;
  // **Three sittings on 24 August 2026 took this from 21 entries to 27**, and the middle one cost a
  // provenance that the third one bought back: `Microsoft 30 Bit` fell from `both` to `corpus` when the
  // first sample's catalogue capture was overwritten and had to be rebuilt without the account's own
  // appliance names, and it is `both` again because the appliance was put back on the record and
  // compiled a third time. Its rhythm never moved through any of it.
  assert.deepEqual([count('corpus'), count('compiled'), count('both')], [3, 21, 6]);
  // Nothing in the table rests on published documentation alone any more. It did for a few hours, and
  // the compiled sample refuted that entry's numbers the same day, so the category is deliberately
  // empty rather than corrected: a rhythm their analyser accepts is not a rhythm their compiler emits.
  assert.equal(count('documented'), 0);

  // The three confirmed twice over, named rather than counted, since agreement between two independent
  // routes is the strongest thing this table has and losing one silently is the risk.
  assert.deepEqual(PROTOCOLS.filter((one) => one.source === 'both').map((one) => one.family),
                   ['Logitech 24 Bit', 'Microsoft 30 Bit', 'Kreatel IP 22 Bit', 'Sony 12 Bit',
                    'Pioneer 32 Bit', 'Sony 15 Bit']);
  // And they agree **exactly**, not within a band, which is what makes it a confirmation.
  for (const one of PROTOCOLS.filter((p) => p.source === 'both')) {
    assert.equal(one.spread, 0, `${one.family} disagrees between the two routes`);
    assert.equal(one.exact, one.codes, one.family);
  }

  // **One rhythm under two names, kept rather than collapsed.** Their catalogue says Sharp 48 Bit 2 and
  // their analyser says SharpO1 48 Bit, and at 38 kHz the durations are identical to the microsecond.
  // That is the measurement behind the rule that their two vocabularies are not one.
  const catalogue = PROTOCOLS.find((one) => one.family === 'Sharp 48 Bit 2');
  const analyser = PROTOCOLS.find((one) => one.family === 'SharpO1 48 Bit' && one.periodNs === 26315);
  assert.ok(catalogue !== undefined && analyser !== undefined);
  assert.deepEqual([catalogue.header, catalogue.flat, catalogue.zero, catalogue.one],
                   [analyser.header, analyser.flat, analyser.zero, analyser.one]);

  // **A `Dual` family is the same rhythm as its sibling**, which is what the catalogue notation already
  // implied by stating two values for one command: the word counts frames, not durations.
  for (const [dual, single] of [['Pioneer 32 Bit Dual', 'Pioneer 32 Bit'],
                                ['PioneerO1 32 Bit Dual', 'PioneerO1 32 Bit']]) {
    const a = PROTOCOLS.find((one) => one.family === dual);
    const b = PROTOCOLS.find((one) => one.family === single);
    assert.ok(a !== undefined && b !== undefined, `${dual} and ${single}`);
    assert.deepEqual([a.header, a.flat, a.zero, a.one, a.periodNs],
                     [b.header, b.flat, b.zero, b.one, b.periodNs], `${dual} against ${single}`);
  }

  // **JVC is not NEC**, which section 158 recorded that it was on their analyser's word. Their compiler
  // emits 8400/4200 with 500/500/1600 against NEC's 8990/4490 with 568/552/1662, so a JVC code built
  // from the NEC entry is wrong in its lead in and in every bit cell.
  const jvc = PROTOCOLS.find((one) => one.family === 'JVC 16 Bit');
  const nec = PROTOCOLS.find((one) => one.family === 'MemorexO1 32 Bit');
  assert.ok(jvc !== undefined && nec !== undefined);
  assert.notDeepEqual(jvc.header, nec.header, 'their lead ins differ, which is the whole point');
  assert.deepEqual([jvc.header, jvc.flat, jvc.zero, jvc.one], [[8400, 4200], 500, 500, 1600]);

  // The loose one is named rather than tolerated: NEC at 38 kHz under Logitech's Memorex label, where
  // three duration sets appear across the corpus and the commonest reproduces 81 of 108 exactly and all
  // 108 within two percent. So a code emitted from it is accepted by the equipment and is not byte
  // identical to what their compiler emitted.
  const loose = PROTOCOLS.filter((one) => one.spread > 0);
  assert.deepEqual(loose.map((one) => [one.family, one.spread]), [['MemorexO1 32 Bit', 0.02]]);
  assert.deepEqual(loose.map((one) => [one.exact, one.codes]), [[81, 108]]);
  // Every other entry reproduces every code of its own rows to the microsecond. 29 of 30, the exception
  // being the one loose entry named above.
  assert.equal(PROTOCOLS.filter((one) => one.exact === one.codes).length, 29);

  // **A family whose codes share their first frame with a sibling's is still its own entry**, which is
  // what the generator joining on the whole code bought. `Pioneer 32 Bit 2` and `Pioneer 32 Bit Dual`
  // both open on the value `0xC53A9966` and are told apart only by their second frame, so while the
  // generator's value to family map kept one family per value the three `Pioneer 32 Bit 2` records were
  // all attributed to the sibling and the family had no entry at all. A code stated in their catalogue
  // as `Pioneer 32 Bit 2` could then not be emitted, which is the consequence that made it worth
  // finding. The sibling losing exactly those three is the other half: 37 records before, 34 after.
  const shared = PROTOCOLS.filter((one) => one.family.startsWith('Pioneer 32 Bit'));
  assert.deepEqual(shared.map((one) => [one.family, one.codes]),
    [['Pioneer 32 Bit Dual', 34], ['Pioneer 32 Bit', 19], ['Pioneer 32 Bit 2', 3]]);
  // And their durations are **identical**, which is why nothing about the pulses could have separated
  // them and why the join had to come from the stated code. An entry per family is still right, since
  // the encoder is looked up by the name their catalogue uses.
  const [dual, , second] = shared;
  assert.deepEqual([second!.header, second!.flat, second!.zero, second!.one],
    [dual!.header, dual!.flat, dual!.zero, dual!.one]);
  assert.equal(second!.periodNs, dual!.periodNs);

  // **Two families carry their bits the other way up, and the table says so by its numbers**, section
  // 161. Such a family sends a set bit as the **shorter** space, so its `zero` is longer than its `one`.
  // Nothing in a pulse train says which way round a protocol counts, so this comes from the catalogue
  // stating the complement of what our decoder read, and it needs no field of its own: an encoder
  // reading these two numbers emits the record again.
  //
  // **`RCAV1 LF 24 Bit` is the second, found on 24 August 2026** by this assertion failing when the
  // table grew. `Logitech 24 Bit` was the only one for as long as the table had one sample behind it,
  // which is exactly the shape of claim this project distrusts: a rule no counterexample could reach.
  // 52 of 52 of its records reproduce under it.
  const inverted = PROTOCOLS.filter((one) => (one.zero ?? 0) > (one.one ?? 0));
  assert.deepEqual(inverted.map((one) => [one.family, one.zero, one.one]),
                   [['Logitech 24 Bit', 1000, 500], ['RCAV1 LF 24 Bit', 2010, 1010]]);
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
  assert.equal(zeroes - ones, 12 * (sony.one! - sony.zero!),
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
  // **The Sharp family is the one with no lead in and a longer opening burst**, and both are measured
  // off a configuration Logitech's own compiler produced rather than taken from documentation: a seed
  // at 320/680/1680 was refuted by it the same day. So the frame is thirty pulses with nothing before
  // them, and its first mark is 270 where all fourteen others are 260.
  const sharp = pulsesOfStatedCode('Sharp 15 Bit 2', 15, 0x230Cn);
  assert.equal(sharp?.length, 30, 'fifteen bit cells and no lead in');
  assert.deepEqual(sharp?.slice(0, 4).map((one) => one.us), [270, 790, 260, 1850]);
  assert.equal(new Set(sharp?.slice(2).filter((_, i) => i % 2 === 0).map((one) => one.us)).size, 1,
               'every mark after the first is the same length');
  // **And the frame comes back**, which is the closure that says the opening 270 is a bit cell's own mark
  // and not a lead in. Reading it as a lead in eats the first cell, and that is not hypothetical: it is
  // exactly the misreading that made this family look as though its numbers joined under no transform at
  // all, when in fact the identity carries 162 of 162 of the compiled sample's Sharp frames onto numbers
  // Logitech's catalogue states. So the negative below is the case that was actually got wrong.
  const back = framesOfPulses(sharp!, 0);
  assert.equal(back.length, 1, 'only one convention fits, and it is the space carrying one');
  assert.equal(back[0]?.carries, 'space');
  assert.equal(back[0]?.bits, 15);
  assert.equal(back[0]?.value, 0x230Cn);
  // Read with a lead in, the frame is a cell short. The **width** is what says so, and the value is
  // deliberately not the assertion here: `0x230C` has a clear top bit, so losing that cell leaves the
  // same number in fourteen bits, which is how a wrong reading can look like a right one. A code with
  // its top bit set is the case where the number moves too.
  assert.equal(framesOfPulses(sharp!, 1)[0]?.bits, 14, 'a lead in eats a bit cell');
  const set = pulsesOfStatedCode('Sharp 15 Bit 2', 15, 0x630Cn);
  assert.equal(framesOfPulses(set!, 0)[0]?.value, 0x630Cn);
  assert.notEqual(framesOfPulses(set!, 1)[0]?.value, 0x630Cn);
  // **`Sharp 15 Bit`, without their `2`, answers now**, and it is the entry this refusal used to name.
  // It is a different catalogue family and it was measured on 24 August 2026 off a Denon receiver put on
  // the account for it, 95 of 95 records exact. Its rhythm is close to its sibling's and not equal: 250
  // against 260 flat, 800 against 790 for a clear bit, 1800 against 1850 for a set one, and 36.0 kHz
  // against 37.0. So borrowing the sibling would have emitted something an appliance may well accept and
  // their compiler does not produce, which is why the refusal was right until a measurement replaced it.
  const other = pulsesOfStatedCode('Sharp 15 Bit', 15, 0x1BACn);
  assert.equal(other?.length, 2 * 15);
  assert.deepEqual(other?.slice(0, 2).map((one) => one.us), [250, 800],
                   'its own flat length, then a clear bit, since 0x1BAC opens with one');
  // Close and not equal, which is the point: `timingsOf` takes an entry rather than a name, so both are
  // looked up first, and a missing one would make this pass vacuously.
  const own = statedProtocol('Sharp 15 Bit');
  const sibling = statedProtocol('Sharp 15 Bit 2');
  assert.ok(own !== undefined && sibling !== undefined);
  assert.notDeepEqual(timingsOf(own), timingsOf(sibling));
  assert.notEqual(own.periodNs, sibling.periodNs, '36.0 kHz against 37.0');
  // **`Microsoft 30 Bit` answers now**, section 162, and it is the entry this refusal used to name: it
  // is biphase, so a decoder that knows only mark and space lengths cannot produce its number and no
  // durations could be derived for it. Reading it as half cells settles all three of its unknowns
  // against Logitech's own catalogue, and the frame is 13 lead in intervals plus one word per half cell.
  const rc6 = pulsesOfStatedCode('Microsoft 30 Bit', 30, 0x3FF07BA1n);
  assert.equal(rc6?.length, 13 + 2 * 30);
  assert.deepEqual(rc6?.slice(0, 2).map((one) => one.us), [2632, 900], 'the RC-6 lead in');
  // A set bit is the **space** first on this family and the mark first on the other two, which is a
  // protocol fact rather than a reading. This value's top bit is set, so its first cell opens on
  // silence, and that is the whole of what "the other way up" means.
  assert.equal(rc6?.[13]?.mark, false);
  assert.equal(rc6?.[14]?.mark, true);
  assert.equal(pulsesOfStatedCode('Not In Their Catalogue 9 Bit', 9, 0x1n), undefined);
  // The families the compiled sample did settle do answer, and the largest of them is the one worth
  // asserting: Toshiba 32 Bit is over a third of their whole catalogue.
  const toshiba = pulsesOfStatedCode('Toshiba 32 Bit', 32, 0x20DF08F7n);
  assert.equal(toshiba?.length, 66, 'a lead in pair and thirty two bit cells');
  assert.equal(toshiba?.[0]?.us, 8990, 'the lead in their compiler emits');
  assert.equal(pulsesOfStatedCode('Not A Protocol', 8, 0x12n), undefined);

  // **The inverted family emits from the number Logitech states**, which is the point of carrying the
  // polarity in the table rather than in a caller. A set bit is the short space here, so the first cell
  // of `0x800001` is 500 and the last is 500 while everything between is 1000.
  const logitech = pulsesOfStatedCode('Logitech 24 Bit', 24, 0x800001n);
  assert.equal(logitech?.length, 2 + 2 * 24);
  assert.deepEqual(logitech?.slice(0, 4).map((one) => one.us), [4000, 4500, 400, 500]);
  assert.deepEqual(logitech?.slice(-2).map((one) => one.us), [400, 500]);
  assert.equal(new Set(logitech?.slice(4, -2).filter((_, i) => i % 2 === 1).map((one) => one.us)).size, 1);
  // And decoding it gives the **complement**, which is not a defect and is worth pinning: our decoder
  // reads the longer carried half as a set bit always, because a pulse train does not say which way a
  // protocol counts. The polarity lives in the table, and this is what says so.
  assert.equal(framesOfPulses(logitech!, 1)[0]?.value, ~0x800001n & 0xFFFFFFn);
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
  assert.equal(statedProtocol('SharpO1 48 Bit', 27472)?.header?.[0], 3480);
  assert.equal(statedProtocol('SharpO1 48 Bit', 26315)?.header?.[0], 3364);
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

  // **`Quad` in a family name is the base of its digits, two bits each.** This code was refused for
  // weeks, and rightly: read as hexadecimal its first value needs 26 bits against the 16 its name
  // states, so it would have emitted a command three times too long that looks perfectly valid. Read
  // in base 4 the eight digits are exactly 16 bits. The value is asserted rather than the fact that
  // something came back, since the whole error was a plausible wrong number.
  const quad = statedCode('G:Galaxis 16 Bit Quad Toggle:()(0x02031000_1x0_2x2123201)():3');
  assert.deepEqual(quad?.frames, [{ value: 0x2340n, bits: 16, index: 0 },
                                  { value: 0x0n, bits: 16, index: 1 },
                                  { value: 0x26E1n, bits: 16, index: 2 }]);
  // Which is not what a hexadecimal reading gives, and that is the point of the assertion above.
  assert.notEqual(quad?.frames[0]?.value, 0x02031000n);
  // **A digit outside 0 to 3 on a quaternary family is a refusal**, not a value read in whichever base
  // accepts it. Nothing in the census has one, so this is the guard rather than a measurement.
  assert.equal(statedCode('G:Galaxis 16 Bit Quad Toggle:()(0x0207)():3'), undefined);
  // And the width check that caught the error in the first place still bites on this family: a value
  // needing more than its 16 bits is refused, base or no base. Eight digits is the ceiling here.
  assert.equal(statedCode('G:Galaxis 16 Bit Quad Toggle:()(0x123123123)():3'), undefined);

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
