/**
 * Pronto Hex, and our waveforms against Logitech's own renderings of them.
 *
 * **Why this file is the strongest evidence the infrared encoder has.** Everything else that judges it
 * is small: 3017 codes in the corpus, 35 rhythms measured off Logitech's compiler, a few hundred codes
 * a calibration account generated. The archive carries a rendered waveform for **every** command in
 * Logitech's catalogue, produced by somebody else's code from Logitech's own definitions, so it is an
 * answer key two million entries long that nobody here had a hand in.
 *
 * The full run is `make prontocheck` and takes about forty seconds. This file walks a **bounded slice**
 * of it, so the suite stays fast, and pins the classes the full run leaves open: the numbers for those
 * are in `docs/findings.md` section 230 and are not asserted here, because they are a research figure
 * over a checkout at one commit rather than a claim about our code.
 */
import assert from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { IR_ARCHIVE, skipWithoutIrArchive } from '@harmony/lab';
import {
  archiveProtocols, bitsPerDigit, blockOfDefinition, frameWidths, keyCodeOfStatedCode,
  rhythmOfDefinition, waveformOfArchiveCommand, withStatedWidths, withToggleCleared,
} from '../src/archive.ts';
import { pulsesOfBlock } from '../src/irframe.ts';
import {
  PRONTO_CLOCK, prontoCarrier, prontoPairs, prontoUnits, readPronto, writePronto,
} from '../src/pronto.ts';
import { statedCode } from '../src/stated.ts';

test('a Pronto header states the carrier as a count and the sections as pairs', () => {
  // A real learned code, `Sony 12 Bit`, from the archive's own README. 0x0068 is 104, and 104 units of
  // the Philips clock is 25.09 microseconds, which is 39.9 kHz: Sony's 40 kHz to within the resolution
  // the format has. The 13 is the once section's pair count.
  const read = readPronto('0000 0068 000D 0000 0060 0018 0030 0018 0018 0018'
    + ' 0030 0018 0018 0018 0030 0018 0018 0018 0018 0018 0030 0018 0018 0018'
    + ' 0018 0018 0018 0018 0030 0018');
  assert.notEqual(read, undefined);
  assert.equal(read!.carrier, 104);
  assert.equal(Math.round(read!.hz), 39857);
  assert.equal(read!.once.length, 26);
  assert.equal(read!.repeat.length, 0);
  // Odd positions are spaces, and a space is negative, which is what the rest of the codec means by one.
  assert.deepEqual(read!.once.slice(0, 4), [96, -24, 48, -24]);
  // And the carrier word round trips from the frequency it states.
  assert.equal(prontoCarrier(read!.hz), 104);
  assert.equal(prontoCarrier(38000), 109);
});

test('a malformed Pronto string is refused rather than repaired', () => {
  // Each of these is a way a string can be wrong that a lenient reader would paper over, and papering
  // over any of them shows up much later as a waveform that disagrees for a reason nobody can find.
  assert.equal(readPronto(''), undefined, 'nothing at all');
  assert.equal(readPronto('0000 0068'), undefined, 'a header and no bursts');
  assert.equal(readPronto('0100 0068 0001 0000 0060 0018'), undefined, 'the raw format, not learned');
  assert.equal(readPronto('0000 0000 0001 0000 0060 0018'), undefined, 'a carrier of zero');
  assert.equal(readPronto('0000 0068 0002 0000 0060 0018'), undefined, 'two pairs, one present');
  assert.equal(readPronto('0000 0068 0001 0000 0060 zzzz'), undefined, 'not hexadecimal');
  // And a well formed one of the same shape is accepted, so the refusals above are about the defect
  // rather than about the reader being unable to read anything.
  assert.notEqual(readPronto('0000 0068 0001 0000 0060 0018'), undefined);
});

test('no Pronto word is zero, and a section is whole pairs', () => {
  // A duration shorter than half a unit still costs one, because a word of zero states no interval at
  // all and would merge its two neighbours. 20 microseconds at 15.3 kHz is under a third of a unit.
  assert.equal(prontoCarrier(15288), 271);
  const unit = prontoCarrier(15288) * PRONTO_CLOCK;
  assert.equal(Math.round(unit), 65);
  assert.deepEqual(prontoUnits([{ mark: true, us: 20 }, { mark: false, us: 200 }], unit), [1, -3]);
  // The control: without the floor the mark rounds away, which is the bug this pins.
  assert.equal(Math.round(20 / unit), 0);
  // Adjacent intervals of one level are one interval on the wire, which is what makes a trailer and a
  // gap comparable against a renderer that never split them.
  assert.deepEqual(prontoUnits(
    [{ mark: true, us: 500 }, { mark: false, us: 500 }, { mark: false, us: 500 }], 250,
  ), [2, -4]);
  // A zero length interval is not an interval.
  assert.deepEqual(prontoUnits([{ mark: true, us: 0 }, { mark: true, us: 500 }], 250), [2]);
  // A train ending on a mark is padded to a pair with the shortest space that can be written.
  assert.deepEqual(prontoPairs([2, -4, 2]), [2, -4, 2, -1]);
  assert.deepEqual(prontoPairs([2, -4]), [2, -4]);
  // The whole way round: a written string reads back as the train that wrote it.
  const written = writePronto(38000, [{ mark: true, us: 9000 }, { mark: false, us: 4500 },
                                      { mark: true, us: 560 }]);
  assert.equal(written, '0000 006D 0002 0000 0156 00AB 0015 0001');
  assert.deepEqual(readPronto(written)!.once, [342, -171, 21, -1]);
});

/**
 * One command's waveform against Logitech's rendering of it, or undefined where we do not claim one.
 *
 * This is `packages/codec/bin/prontocheck.ts` in miniature and deliberately a second copy of nothing:
 * the four steps are all library calls, and what the binary adds is the walk and the counting.
 */
function compare(
  byName: Map<string, ReturnType<typeof archiveProtocols>[number]>,
  protocolName: string, keycode: string, pronto: string,
): { ours: number[]; theirs: number[]; oursHeld: number[]; theirsHeld: number[] } | undefined {
  const protocol = byName.get(protocolName);
  if (protocol === undefined) return undefined;
  const read = readPronto(pronto);
  if (read === undefined) return undefined;
  // **Through the library's own composition and not a copy of it**, section 232. This function used to
  // do the seven steps itself and fell two readings behind: it built a shape of two fields where there
  // are three, so every cell table family threw here while `make prontocheck` compared them happily,
  // and the same copy had drifted silently once before.
  const built = waveformOfArchiveCommand(protocol, keycode, { storedForm: false });
  if ('refusal' in built) return undefined;
  return {
    ours: prontoPairs(prontoUnits(built.once, read.unitUs)),
    theirs: [...read.once],
    oursHeld: prontoPairs(prontoUnits(built.held, read.unitUs)),
    theirsHeld: [...read.repeat],
  };
}

test('our waveforms reproduce Logitech\'s own renderings over a slice of the catalogue',
  { ...skipWithoutIrArchive() }, () => {
    // A bounded slice, so this stays a test and not a research run: the first 300 code sets in path
    // order, which is stable because the archive is a checkout at a commit and the walk is sorted.
    const root = IR_ARCHIVE!;
    // Read once. Reading the 684 definitions per command took this test to three and a half minutes,
    // which is the quadratic trap this repository has hit twice before in a loop over a corpus.
    const byName = new Map(archiveProtocols(root).map((one) => [one.name, one]));
    let compared = 0;
    let agreed = 0;
    let heldCompared = 0;
    let heldAgreed = 0;
    const families = new Set<string>();
    let sets = 0;
    outer: for (const bucket of readdirSync(join(root, 'codesets')).sort()) {
      for (const file of readdirSync(join(root, 'codesets', bucket)).sort()) {
        sets += 1;
        if (sets > 300) break outer;
        const parsed = JSON.parse(readFileSync(join(root, 'codesets', bucket, file), 'utf8')) as {
          commands?: { keycode: string; protocol: string; pronto?: string }[];
        };
        for (const command of parsed.commands ?? []) {
          if (command.pronto === undefined) continue;
          const both = compare(byName, command.protocol, command.keycode, command.pronto);
          if (both === undefined) continue;
          families.add(command.protocol);
          compared += 1;
          if (both.ours.length === both.theirs.length
            && both.ours.every((v, at) => v === both.theirs[at])) agreed += 1;
          if (both.theirsHeld.length > 0) {
            heldCompared += 1;
            if (both.oursHeld.length === both.theirsHeld.length
              && both.oursHeld.every((v, at) => v === both.theirsHeld[at])) heldAgreed += 1;
          }
        }
      }
    }
    // Exact, per the house rule, and the slice has to be big enough to be a check: a few thousand
    // commands over dozens of families, both sections, with nothing outstanding in it. The counts rose
    // from 10532 over 46 families when this stopped building the waveform itself and called the
    // library's own composition, section 232, since its own copy was two readings behind.
    assert.equal(compared, 10819);
    assert.equal(agreed, 10819);
    assert.equal(heldCompared, 6620);
    assert.equal(heldAgreed, 6620);
    assert.equal(families.size, 52);
  });

test('clearing the toggle bit is what makes a toggle family agree, and it is checked on one',
  { ...skipWithoutIrArchive() }, () => {
    // **The slice above does not reach this**, measured: removing the toggle clearing leaves it passing,
    // because none of its 10532 commands is of a toggle family with the bit set. So the condition gets
    // its own control, and the command is **found** in the archive rather than written down here: a
    // Pronto string is one of the renderings decision 15 keeps out of this repository, so a fixture of
    // one would be his data committed here.
    const root = IR_ARCHIVE!;
    const byName = new Map(archiveProtocols(root).map((one) => [one.name, one]));
    const family = 'Thomson 12 Bit Toggle';
    const protocol = byName.get(family)!;
    const bit = 1n << BigInt(12 - 1 - protocol.keycodeFields!['Code0']!.toggleBit!);
    let found: { keycode: string; pronto: string } | undefined;
    outer: for (const bucket of readdirSync(join(root, 'codesets')).sort()) {
      for (const file of readdirSync(join(root, 'codesets', bucket)).sort()) {
        const parsed = JSON.parse(readFileSync(join(root, 'codesets', bucket, file), 'utf8')) as {
          commands?: { keycode: string; protocol: string; pronto?: string }[];
        };
        for (const command of parsed.commands ?? []) {
          if (command.protocol !== family || command.pronto === undefined) continue;
          const code = statedCode(command.keycode);
          if (code === undefined || (code.frames[0]!.value & bit) === 0n) continue;
          found = { keycode: command.keycode, pronto: command.pronto };
          break outer;
        }
      }
    }
    // The population is what makes this a control rather than a lucky find: the family has commands and
    // some of them carry the bit, so a run that finds none is a defect and not an empty case.
    assert.notEqual(found, undefined, `no ${family} command carries its toggle bit set`);
    const both = compare(byName, family, found!.keycode, found!.pronto);
    assert.notEqual(both, undefined);
    assert.deepEqual(both!.ours, both!.theirs);
    // And with the bit left as the command states it, the waveform disagrees, on that bit alone.
    const rhythm = rhythmOfDefinition(protocol);
    assert.ok(!('refusal' in rhythm));
    const code = statedCode(found!.keycode)!;
    const keyCode = keyCodeOfStatedCode(protocol, code)!;
    const built = blockOfDefinition(protocol, 1, { storedForm: false, keyCode });
    assert.ok(!('refusal' in built));
    const read = readPronto(found!.pronto)!;
    const asStated = prontoPairs(prontoUnits(
      pulsesOfBlock({ timings: rhythm.timings, biphase: rhythm.biphase }, code.frames, built.tail),
      read.unitUs,
    ));
    assert.notDeepEqual(asStated, both!.theirs);
    assert.equal(asStated.length, both!.theirs.length);
    // **Two intervals and not one**, which is the family's own padding rather than a second error: the
    // bit rides in the space, and the block is padded out to a constant total, so a longer space is paid
    // for by a shorter gap at the end.
    assert.equal(asStated.filter((v, at) => v !== both!.theirs[at]).length, 2);
  });

test('the cell\'s own order is what makes six of seven families agree, and stripping it breaks them',
  { ...skipWithoutIrArchive() }, () => {
    // **The capability that replaced two refusals**, section 230. Logitech states a cell as (space, mark)
    // on 37 families where our table stores (mark, space), and for 30 of them the wire is the same
    // either way. On seven it is not, and this is both halves of that: they agree now, and they disagree
    // with the flag stripped, which is what the refusals were protecting against.
    const root = IR_ARCHIVE!;
    const byName = new Map(archiveProtocols(root).map((one) => [one.name, one]));
    // Named as a set rather than counted: an eighth appearing means a definition took this shape, and
    // one dropping out means the reader stopped seeing it.
    const carried = [...byName.values()].filter((one) => {
      const rhythm = rhythmOfDefinition(one);
      return !('refusal' in rhythm) && rhythm.timings?.carriedFirst === true;
    }).map((one) => one.name);
    assert.deepEqual([...carried].sort(), [
      'AMC 5 Bit', 'Antique 12 Bit', 'Bell 16 Bit', 'Bell 16 Bit 2', 'GPX 8 Bit', 'Goelst 12 Bit',
      'Panasonic 31 Bit',
    ]);

    // One command of each family that the catalogue actually holds codes for, found rather than written
    // down: a Pronto string is one of the renderings decision 15 keeps out of this repository.
    const wanted = new Set(carried);
    const found = new Map<string, { keycode: string; pronto: string }>();
    outer: for (const bucket of readdirSync(join(root, 'codesets')).sort()) {
      for (const file of readdirSync(join(root, 'codesets', bucket)).sort()) {
        const parsed = JSON.parse(readFileSync(join(root, 'codesets', bucket, file), 'utf8')) as {
          commands?: { keycode: string; protocol: string; pronto?: string }[];
        };
        for (const command of parsed.commands ?? []) {
          if (!wanted.has(command.protocol) || command.pronto === undefined) continue;
          if (found.has(command.protocol)) continue;
          found.set(command.protocol, { keycode: command.keycode, pronto: command.pronto });
          if (found.size === wanted.size) break outer;
        }
      }
    }
    // All seven have commands in the catalogue. Asserted rather than assumed, since a shrinking set here
    // is the comparison quietly covering less.
    assert.deepEqual([...found.keys()].sort(), [...carried].sort());
    // **Six of them compare, and the seventh is named with its reason.** Every `Bell 16 Bit 2` code is
    // written `(Start_0xBBFF)(RepeatStart_0xBBFF)`, and `RepeatStart` is not one of the three segment
    // words our keycode reader accepts. That closed set is deliberate, a fourth word being a refusal
    // rather than a guess, so this is a reading still to do and not a defect here.
    const declined = [...found.keys()].filter((family) => statedCode(found.get(family)!.keycode)
      === undefined);
    assert.deepEqual(declined, ['Bell 16 Bit 2']);

    for (const [family, command] of found) {
      if (declined.includes(family)) continue;
      const both = compare(byName, family, command.keycode, command.pronto);
      assert.notEqual(both, undefined, family);
      assert.deepEqual(both!.ours, both!.theirs, `${family} first transmission`);
      if (both!.theirsHeld.length > 0) {
        assert.deepEqual(both!.oursHeld, both!.theirsHeld, `${family} held repetition`);
      }
      // **The control, and it has to bite on every one of them.** With the flag stripped the frame goes
      // out in our table's other spelling, which is the waveform that was being emitted before.
      const protocol = byName.get(family)!;
      const rhythm = rhythmOfDefinition(protocol);
      assert.ok(!('refusal' in rhythm) && rhythm.timings !== undefined);
      const code = statedCode(command.keycode)!;
      const keyCode = keyCodeOfStatedCode(protocol, code)!;
      const built = blockOfDefinition(protocol, 1, { storedForm: false, keyCode });
      assert.ok(!('refusal' in built));
      const frames = withToggleCleared(protocol, withStatedWidths(protocol, code.frames));
      const stripped = { ...rhythm.timings, carriedFirst: false };
      const wrong = prontoPairs(prontoUnits(
        pulsesOfBlock({ timings: stripped }, frames, built.tail), readPronto(command.pronto)!.unitUs,
      ));
      assert.notDeepEqual(wrong, both!.theirs, `${family} disagrees without the cell's own order`);
    }
  });

test('a repetition can send several rhythms, and one of them alone emits a fraction of the command',
  { ...skipWithoutIrArchive() }, () => {
    // **The capability that replaced the largest refusal there was**, section 232: 84694 commands over 29
    // families whose press cycle names two infrared segments stating different rhythms. `Classe 16 Bit
    // Toggle` is RC6's shape and the clearest case: four mode bits at a 442 microsecond half cell, then
    // **one** bit at 880, then sixteen data bits back at 442. Our table held one rhythm per family, so a
    // block of it could only carry a third of the command.
    const root = IR_ARCHIVE!;
    const byName = new Map(archiveProtocols(root).map((one) => [one.name, one]));
    // Named as a set rather than counted, and it is the number of **rhythms** rather than of segments: a
    // dual family states two frames of one shape and that is still one rhythm. A family appearing here
    // means a definition took this shape; one dropping out means the reader stopped seeing it.
    const several = [...byName.values()].map((one) => {
      const built = blockOfDefinition(one, one.pressMinimumRepeats ?? 3);
      return 'refusal' in built ? null : [one.name, built.also.length + 1] as const;
    }).filter((one): one is readonly [string, number] => one !== null && one[1] > 1);
    assert.equal(several.length, 23);
    assert.equal(several.filter(([, n]) => n === 3).length, 9);
    assert.equal(several.filter(([, n]) => n === 2).length, 14);

    // One command of each, found in the archive rather than written down here: a Pronto string is one of
    // the renderings decision 15 keeps out of this repository.
    const wanted = new Set(several.map(([name]) => name));
    const found = new Map<string, { keycode: string; pronto: string }>();
    outer: for (const bucket of readdirSync(join(root, 'codesets')).sort()) {
      for (const file of readdirSync(join(root, 'codesets', bucket)).sort()) {
        const parsed = JSON.parse(readFileSync(join(root, 'codesets', bucket, file), 'utf8')) as {
          commands?: { keycode: string; protocol: string; pronto?: string }[];
        };
        for (const command of parsed.commands ?? []) {
          if (!wanted.has(command.protocol) || command.pronto === undefined) continue;
          if (found.has(command.protocol)) continue;
          found.set(command.protocol, { keycode: command.keycode, pronto: command.pronto });
          if (found.size === wanted.size) break outer;
        }
      }
    }
    // All 23 have commands in the catalogue, asserted rather than assumed: a shrinking set here is the
    // comparison quietly covering less.
    assert.equal(found.size, 23);

    let checked = 0;
    for (const [family, command] of found) {
      const both = compare(byName, family, command.keycode, command.pronto);
      // Some of the 13 are declined by the keycode reader for a reason of their own, a segment word
      // outside its closed set among them, and those are counted rather than asserted over.
      if (both === undefined) continue;
      checked += 1;
      assert.deepEqual(both.ours, both.theirs, `${family} first transmission`);
      if (both.theirsHeld.length > 0) {
        assert.deepEqual(both.oursHeld, both.theirsHeld, `${family} held repetition`);
      }
      // **The control, and it has to bite on every one of them.** With the other rhythms dropped, a copy
      // naming one of them throws, which is the emitter refusing rather than falling back on the frame's
      // shape and sending a segment in the wrong rhythm. Where a family's copies all name shape 0 the
      // block is unaffected, so this asserts on the ones that name another.
      const protocol = byName.get(family)!;
      const rhythm = rhythmOfDefinition(protocol);
      assert.ok(!('refusal' in rhythm));
      const widths = frameWidths(protocol);
      const code = statedCode(command.keycode, widths === undefined
        ? { bitsPerDigit: bitsPerDigit(protocol) }
        : { widths, bitsPerDigit: bitsPerDigit(protocol) });
      const keyCode = code === undefined ? undefined : keyCodeOfStatedCode(protocol, code);
      if (code === undefined || keyCode === undefined) continue;
      const built = blockOfDefinition(protocol, 1, { storedForm: false, keyCode });
      assert.ok(!('refusal' in built));
      const names = [...built.tail.items, ...built.held.items]
        .some((item) => 'copy' in item && (item.shape ?? 0) > 0);
      if (!names) continue;
      const frames = withToggleCleared(protocol, withStatedWidths(protocol, code.frames));
      const shape = { ...rhythm.timings === undefined ? {} : { timings: rhythm.timings },
                      ...rhythm.biphase === undefined ? {} : { biphase: rhythm.biphase },
                      ...rhythm.cells === undefined ? {} : { cells: rhythm.cells } };
      assert.throws(() => pulsesOfBlock(shape, frames, built.tail),
                    /states no rhythm/, `${family} needs its other rhythms`);
    }
    // Exact, so a family falling out of the comparison shows up here rather than passing quietly. One of
    // the 23 is declined by the keycode reader, `Imon Multi2 Bit Hex`, whose codes name a segment word
    // outside the closed set of three: that is a reading still to do and not a defect here.
    assert.equal(checked, 22);
  });

test('the three conditions the comparison honours each change the answer',
  { ...skipWithoutIrArchive() }, () => {
    const root = IR_ARCHIVE!;
    // **A toggle bit is state and not identity**, and the archive renders every one at zero. This is a
    // `Philips RC5 13 Bit Toggle` command whose own keycode carries the bit set, so clearing it is what
    // makes the comparison possible at all.
    const rc5 = archiveProtocols(root).find((one) => one.name === 'Philips RC5 13 Bit Toggle')!;
    const withBit = statedCode('G:Philips RC5 13 Bit Toggle:()(0x1C01)():3')!;
    assert.equal(withBit.frames[0]!.value, 0x1C01n);
    // Bit 1 counting from the top of 13 is 0x0800, and it is the only bit that moves.
    assert.deepEqual(withToggleCleared(rc5, withBit.frames).map((one) => one.value), [0x1401n]);
    // The control that makes that a position rather than a guess: a value with the bit already clear is
    // handed back unchanged, so the assertion above is about bit 11 and not about masking something.
    const without = statedCode('G:Philips RC5 13 Bit Toggle:()(0x1401)():3')!;
    assert.deepEqual(withToggleCleared(rc5, without.frames).map((one) => one.value), [0x1401n]);
    // The control: a family with no toggle bit is handed back untouched.
    const nec = archiveProtocols(root).find((one) => one.name === 'Toshiba 32 Bit')!;
    const plain = statedCode('G:Toshiba 32 Bit:(0x77E1BA3A)(Repeat)():3')!;
    assert.deepEqual(withToggleCleared(nec, plain.frames).map((one) => one.value),
                     plain.frames.map((one) => one.value));

    // **A frame's width comes from the definition and not from the family's name**, because on some
    // families the name states the total across the frames. `Daewoo 16 Bit` sends two frames of eight.
    const daewoo = archiveProtocols(root).find((one) => one.name === 'Daewoo 16 Bit')!;
    assert.deepEqual(frameWidths(daewoo), [8, 8]);
    assert.deepEqual(statedCode('G:Daewoo 16 Bit:()(0x32_1x0F)():3')!.frames.map((one) => one.bits),
                     [16, 16]);
    // And a family whose name states each width agrees with its definition, which is the majority case
    // and is why the name was believed for as long as it was.
    const akai = archiveProtocols(root).find((one) => one.name === 'Akai 32 Bit');
    if (akai !== undefined) assert.deepEqual(frameWidths(akai), [32, 32]);

    // **A command's keycode states its own cycles and may name other segments than the family's
    // default.** `RCAV1 24 Bit 2` defaults to repeating its second segment, whose lead in is 4000
    // microseconds; its commands all repeat the **first**, whose lead in is 19800.
    const rcav1 = archiveProtocols(root).find((one) => one.name === 'RCAV1 24 Bit 2')!;
    assert.deepEqual(rcav1.definition.KeyCode!.Repeat!.map((one) => one.SegmentName),
                     ['RCAV1 24 Bit 2 1']);
    const own = keyCodeOfStatedCode(rcav1, statedCode('G:RCAV1 24 Bit 2:(0xE301CF)(0xE301CF)():3')!)!;
    assert.deepEqual(own.Repeat!.map((one) => one.SegmentName), ['RCAV1 24 Bit 2']);
    // The two blocks differ, which is what makes the distinction load bearing rather than tidy.
    const byDefault = blockOfDefinition(rcav1, 1, { storedForm: false });
    const byCode = blockOfDefinition(rcav1, 1, { storedForm: false, keyCode: own });
    assert.ok(!('refusal' in byDefault) && !('refusal' in byCode));
    assert.notDeepEqual(byDefault.held, byCode.held);
  });

test('the stored form and the signal differ by one microsecond, and it is the compiler\'s',
  { ...skipWithoutIrArchive() }, () => {
    // The one microsecond Logitech's compiler adds to a block's last duration is not in the waveform
    // their renderer produces. Before that was separated, every padded family disagreed on its last
    // word and nothing else, which read as our arithmetic being wrong.
    const root = IR_ARCHIVE!;
    const nec = archiveProtocols(root).find((one) => one.name === 'Toshiba 32 Bit')!;
    const stored = blockOfDefinition(nec, 1);
    const signal = blockOfDefinition(nec, 1, { storedForm: false });
    assert.ok(!('refusal' in stored) && !('refusal' in signal));
    assert.notDeepEqual(stored.tail, signal.tail);
    // And it is exactly one, in whichever of the two places a block ends.
    const totals = [stored.tail.total, signal.tail.total];
    if (totals[0] !== undefined && totals[1] !== undefined) {
      assert.equal(totals[0] - totals[1], 1);
    }
  });
