/**
 * A code in the shape Logitech's own analysis service takes, `docs/host-client.md`.
 *
 * The claim with teeth is the merging: a stored duration is fifteen bits, so a long silence is several
 * words in a row, and the client's recorder sees one interval where the block holds four. A builder
 * that copied the words across one for one would describe a different code.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { skipWithoutLab, require_ } from '@harmony/lab';
import { parse } from '../src/gspm.ts';
import { IR_CLASS_STREAM, irBlockWords, irCarrier, irClass, irGroups, irHeaderPointers }
  from '../src/ir.ts';
import { irdaString, pulsesOfWords, untilSilence } from '../src/irda.ts';
import type { Pulse } from '../src/irframe.ts';
import { frameKey, framesOfPulses, fromFirstMark, mergedIntervals } from '../src/irframe.ts';

const CONTAINERS = [
  'one_config', 'one_config_unprogrammed', 'h600_config', 'h700_config', 'h700_config_2',
  'h525_config', 'h525_config_2', 'arch8_config_a', 'arch8_config_b', 'arch8_config_c',
  'arch8_config_d', 'arch8_config_880', 'arch8_config_885', 'one_spare_before_sync',
  'one_spare_after_sync', 'calibration_one', 'calibration_h600',
];

test('durations of the same kind next to each other become one interval', () => {
  // The unit of the rule, before the corpus is asked whether it matters.
  assert.deepEqual(mergedIntervals([
    { mark: true, us: 500 }, { mark: false, us: 32767 }, { mark: false, us: 32767 },
    { mark: false, us: 1200 }, { mark: true, us: 500 },
  ]), [
    { mark: true, us: 500 }, { mark: false, us: 66734 }, { mark: true, us: 500 },
  ]);
  // A zero word is the block's terminator and is not an interval of zero microseconds.
  assert.deepEqual(mergedIntervals([{ mark: true, us: 500 }, { mark: false, us: 0 },
    { mark: true, us: 500 }]), [{ mark: true, us: 1000 }]);
  // Which is the trap in the other direction: dropping the zero joins its neighbours, and that is
  // right, because the words either side of a terminator are not two intervals in a real capture.
});

test('the string is the carrier and then a letter and a duration per interval', () => {
  const train = [{ mark: true, us: 3480 }, { mark: false, us: 1730 }, { mark: true, us: 425 }];
  // 36 kHz, four digits each, mark is P because that is when the emitter modulates.
  assert.equal(irdaString(train, 36000), 'F8CA0P0D98S06C2P01A9');
  assert.equal(parseInt('8CA0', 16), 36000);
  assert.equal(parseInt('0D98', 16), 3480);
  // Eight digits once a value does not fit in four, which is the client's own rule and is what a
  // merged silence needs: 66734 microseconds is five digits.
  assert.match(irdaString([{ mark: false, us: 66734 }], 36000), /S000104AE$/);
  assert.equal(parseInt('000104AE', 16), 66734);
  assert.throws(() => irdaString(train, 0));
});

test('merging is not cosmetic: it changes most codes in the corpus', skipWithoutLab(), () => {
  // **The falsifier for the rule being worth having.** If almost no block held consecutive words of
  // one kind, copying them across would be as good and this file would be ceremony. Counted per
  // container, exactly, so a container dropping out shows up rather than shrinking a share.
  const per: Record<string, { blocks: number; merged: number }> = {};
  for (const name of CONTAINERS) {
    const c = parse(require_(name));
    const counts = { blocks: 0, merged: 0 };
    for (const group of irGroups(c) ?? []) {
      for (const record of group.addresses) {
        // **Class 1 only, and the test found this rather than the author knowing it.** An arch 9
        // (Harmony 525) record is class 5, where the header pointer names a body of dictionary
        // indices and not a duration block, section 82. `irBlockWords` does not know the class, so
        // it happily reads those indices as microseconds: 200 and 107 arch 9 records came back as
        // trains, 119 and 36 of them with runs that looked mergeable. A string built from those
        // would describe a code that does not exist, and the service would have answered something
        // about it.
        if (irClass(c, record) !== IR_CLASS_STREAM) continue;
        const first = irHeaderPointers(c, record)[0];
        if (first === undefined) continue;
        const words = irBlockWords(c, first);
        if (words === undefined) continue;
        const train = fromFirstMark(pulsesOfWords(words));
        if (train.length === 0) continue;
        counts.blocks += 1;
        if (mergedIntervals(train).length !== train.filter((one) => one.us !== 0).length) {
          counts.merged += 1;
        }
      }
    }
    per[name] = counts;
  }
  assert.deepEqual(per, {
    one_config: { blocks: 328, merged: 328 },
    one_config_unprogrammed: { blocks: 97, merged: 97 },
    h600_config: { blocks: 186, merged: 186 },
    h700_config: { blocks: 350, merged: 350 },
    h700_config_2: { blocks: 350, merged: 350 },
    // Arch 9 (Harmony 525) stores class 5 records, which hold no duration block at the record, so
    // there is nothing to merge and nothing to copy either.
    h525_config: { blocks: 0, merged: 0 },
    h525_config_2: { blocks: 0, merged: 0 },
    arch8_config_a: { blocks: 234, merged: 234 },
    arch8_config_b: { blocks: 397, merged: 397 },
    arch8_config_c: { blocks: 454, merged: 454 },
    arch8_config_d: { blocks: 462, merged: 462 },
    arch8_config_880: { blocks: 300, merged: 300 },
    arch8_config_885: { blocks: 460, merged: 460 },
    one_spare_before_sync: { blocks: 97, merged: 97 },
    one_spare_after_sync: { blocks: 125, merged: 125 },
    calibration_one: { blocks: 241, merged: 241 },
    calibration_h600: { blocks: 242, merged: 242 },
  });
});

test('cutting at the first silence makes every duration four digits, on every record',
  skipWithoutLab(), () => {
  // **The claim that makes the format usable, and it is a measurement rather than a convention.**
  // `F` is a hexadecimal digit as well as a token letter, so a duration cannot be found by scanning
  // for letters, and a field that is four digits or eight cannot be read at a fixed width either.
  // Both problems are in the closing silence and nowhere else.
  let records = 0;
  let wide = 0;
  let letterInside = 0;
  let wideBeforeSilence = 0;
  let compared = 0;
  let changed = 0;
  for (const name of CONTAINERS) {
    const c = parse(require_(name));
    for (const group of irGroups(c) ?? []) {
      for (const record of group.addresses) {
        if (irClass(c, record) !== IR_CLASS_STREAM) continue;
        const first = irHeaderPointers(c, record)[0];
        if (first === undefined) continue;
        const words = irBlockWords(c, first);
        if (words === undefined) continue;
        const train = fromFirstMark(pulsesOfWords(words));
        if (train.length === 0) continue;
        records += 1;
        const merged = mergedIntervals(train);
        if (merged.some((one) => one.us > 0xffff)) wide += 1;
        if (merged.some((one) => one.us.toString(16).toUpperCase().padStart(4, '0').includes('F'))) {
          letterInside += 1;
        }
        const head = untilSilence(train);
        if (head.some((one) => one.us > 0xffff)) wideBeforeSilence += 1;
        // **And cutting must not change what the code is**, which is the claim rather than a length.
        // A first version asserted the kept part held at least eighteen intervals, which is a made up
        // floor and it failed on a Harmony 700 record whose whole block is a fifteen interval repeat
        // frame. What matters is that the frame decoded from the kept part is the frame decoded from
        // the whole block, on every record where there is one to compare.
        assert.equal(head[0]?.mark, true, `${name} 0x${record.toString(16)}`);
        // **Merged against merged**, which the first version got wrong and the mistake is the
        // finding: it compared the raw block's reading with the truncated one's, and a truncated
        // train is merged. Merging is not cosmetic for a biphase code, where the block spells two
        // adjacent cells of one length as two words and the emitter sends one interval of twice it.
        // So the comparison has to be between two merged trains or it is measuring the merge.
        //
        // The reader merges on its own since section 164, so passing the merged train is no longer what
        // makes this true. It is left explicit because the sentence above is the reason the comparison
        // is fair, and a reader of this test should not have to know what `framesOfPulses` does inside.
        const whole = framesOfPulses(merged);
        const cut = framesOfPulses(head);
        if (whole.length === 1) {
          assert.deepEqual(cut.map(frameKey), whole.map(frameKey),
            `${name} 0x${record.toString(16)} reads differently once cut`);
          compared += 1;
        } else if (cut.length !== whole.length) {
          // **Cutting can create a reading, and that is worth counting rather than hiding.** A record
          // that reads under both conventions or under none is a two group biphase code, section 134,
          // and truncating one leaves a head that does decode. It does not affect the population this
          // test asserts over, and it does say that a truncated block is not the same object as the
          // block: a learn capture is one press, where a stored block is Logitech's compiled form of
          // it, so the two were never going to have the same tail.
          changed += 1;
        }
      }
    }
  }
  // Exact, all six. `wideBeforeSilence` at zero is the claim; the other five say what population it
  // is a claim about, and `changed` at zero is what says cutting never alters an identification.
  assert.deepEqual({ records, wide, letterInside, wideBeforeSilence, compared, changed },
    { records: 4323, wide: 3309, letterInside: 1647, wideBeforeSilence: 0, compared: 3502,
      changed: 0 });
});

test('a real record becomes a well formed string, with its own carrier', skipWithoutLab(), () => {
  // End to end on the corpus: every record that has a block produces a string, the string parses back
  // into the same intervals, and the carrier in it is the record's own rather than a constant.
  let built = 0;
  const carriers = new Set<number>();
  for (const name of CONTAINERS) {
    const c = parse(require_(name));
    for (const group of irGroups(c) ?? []) {
      for (const record of group.addresses) {
        // **Class 1 only, and the test found this rather than the author knowing it.** An arch 9
        // (Harmony 525) record is class 5, where the header pointer names a body of dictionary
        // indices and not a duration block, section 82. `irBlockWords` does not know the class, so
        // it happily reads those indices as microseconds: 200 and 107 arch 9 records came back as
        // trains, 119 and 36 of them with runs that looked mergeable. A string built from those
        // would describe a code that does not exist, and the service would have answered something
        // about it.
        if (irClass(c, record) !== IR_CLASS_STREAM) continue;
        const first = irHeaderPointers(c, record)[0];
        if (first === undefined) continue;
        const words = irBlockWords(c, first);
        if (words === undefined) continue;
        const train = fromFirstMark(pulsesOfWords(words));
        if (train.length === 0) continue;
        const hertz = irCarrier(c, record)?.hertz;
        assert.notEqual(hertz, undefined, `${name} 0x${record.toString(16)} states no carrier`);
        const head = untilSilence(train);
        const s = irdaString(head, hertz!);
        // Read it back at a **fixed width of four**, which is the only way the format can be read and
        // is sound here because the test above establishes that nothing wider survives the cut. The
        // first version of this test scanned for the next token letter, which is wrong twice over:
        // `F` is a hexadecimal digit, and an eight digit duration then splits into an orphan.
        const tokens = [...s.matchAll(/([FPS])([0-9A-F]{4})/g)];
        assert.equal(tokens.length, head.length + 1, s.slice(0, 60));
        assert.equal(tokens[0]![1], 'F');
        assert.deepEqual(tokens.slice(1).map((t) => ({ mark: t[1] === 'P', us: parseInt(t[2]!, 16) })),
          head);
        carriers.add(Math.round(hertz!));
        built += 1;
      }
    }
  }
  assert.equal(built, 4323, 'every class 1 record in the corpus');
  // More than one carrier, which is what says the frequency is read rather than assumed. Exact,
  // because the set of frequencies the corpus uses is a fact about it.
  //
  // **Two of these eleven are artefacts and it is worth knowing which.** A record stores the period
  // truncated, `floor(1e9 / f)`, section 92, so dividing back can land one hertz high: 36000 Hz is
  // stored as 27777 nanoseconds and 1e9 over 27777 is 36001.0. So `36001` and `38001` here are
  // Logitech's 36000 and 38000, and `36200` and the rest are genuinely those values. It matters for
  // the analysis service only if that service is fussier than a receiver is, since three thousandths
  // of a percent is far inside any carrier's tolerance, and it matters for a writer because section
  // 92's rail is to truncate rather than round.
  assert.deepEqual([...carriers].sort((a, b) => a - b),
    [36001, 36200, 36401, 37000, 37237, 37900, 37954, 38001, 39325, 40000, 56303]);
});

test('a block may hold a second, different code, which a writer cannot copy', skipWithoutLab(), () => {
  // **Section 152 said a writer copies the tail from a record of the same appliance, and that is too
  // simple.** Danny asked whether a command made of several presses plays into this, and the answer is
  // that 226 records in the corpus hold more than one distinct code in one block. Copying such a tail
  // from a sibling would emit the sibling's second code, which is a different command.
  //
  // A press is a burst, so the block is split on silences longer than ten milliseconds and each burst
  // read on its own, with a closing silence given back because a pulse width frame needs one. What the
  // pairs turn out to be is systematic rather than authored: a code and its exact complement, a code
  // and a near variant, or a constant lead in followed by the command. So this is protocol structure
  // and the hazard for a writer is real either way.
  const QUIET = 10_000;
  const per: Record<string, number> = {};
  const shapes = new Map<string, number>();
  for (const name of CONTAINERS) {
    const c = parse(require_(name));
    let counted = 0;
    for (const group of irGroups(c) ?? []) {
      for (const record of group.addresses) {
        if (irClass(c, record) !== IR_CLASS_STREAM) continue;
        const first = irHeaderPointers(c, record)[0];
        if (first === undefined) continue;
        const words = irBlockWords(c, first);
        if (words === undefined) continue;
        const train = mergedIntervals(fromFirstMark(pulsesOfWords(words)));
        if (train.length === 0) continue;
        const bursts: Pulse[][] = [];
        let one: Pulse[] = [];
        for (const pulse of train) {
          if (!pulse.mark && pulse.us > QUIET) {
            if (one.length > 0) bursts.push(one);
            one = [];
            continue;
          }
          one.push(pulse);
        }
        if (one.length > 0) bursts.push(one);
        const codes = new Set<string>();
        for (const burst of bursts) {
          const readings = framesOfPulses([...burst, { mark: false, us: 20_000 }]);
          if (readings.length === 1) codes.add(frameKey(readings[0]!));
        }
        if (codes.size > 1) {
          counted += 1;
          const shape = `${bursts.length} bursts, ${codes.size} codes`;
          shapes.set(shape, (shapes.get(shape) ?? 0) + 1);
        }
      }
    }
    if (counted > 0) per[name] = counted;
  }
  // Per container and exact, since the point is that this is not one architecture's habit: it happens
  // on arch 8, 12 and 14, and in a configuration Logitech compiled to our own specification.
  assert.deepEqual(per, {
    one_config: 13,
    h600_config: 2,
    h700_config: 29,
    h700_config_2: 29,
    arch8_config_b: 18,
    arch8_config_c: 18,
    arch8_config_d: 18,
    arch8_config_885: 88,
    one_spare_after_sync: 9,
    calibration_one: 1,
    calibration_h600: 1,
  });
  assert.equal(Object.values(per).reduce((a, b) => a + b, 0), 226);
  assert.deepEqual([...shapes].sort((a, b) => b[1] - a[1]),
    [['6 bursts, 2 codes', 117], ['2 bursts, 2 codes', 58], ['3 bursts, 2 codes', 47],
      ['36 bursts, 4 codes', 4]]);
});
