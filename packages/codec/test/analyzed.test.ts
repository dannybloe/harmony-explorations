/**
 * Our frame decoder against Logitech's own, on recorded answers.
 *
 * **This is the only external opinion this project has ever had about a stored code.** Section 133's
 * decoder could be checked against the command catalogue of the one account that generated two
 * configurations, and against nothing else. `AnalyzeInfrared` decodes a rhythm too, it is a different
 * implementation written by the people who wrote the generator, and it answers for any record.
 *
 * The answers are captured in the lab, `work/myharmony/analyzed/`, by `make analyze`. They are a
 * fixture on purpose: the service is one announcement away from being withdrawn, and a recorded reply
 * outlives it. So this test asks the network for nothing.
 *
 * Four claims, and three of them are about the records our own decoder declines.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { LAB, skipWithoutLab } from '@harmony/lab';
import { parse } from '../src/gspm.ts';
import { IR_CLASS_STREAM, irBlockWords, irClass, irHeaderPointers } from '../src/ir.ts';
import { pulsesOfWords } from '../src/irda.ts';
import { frameKey, framesOfPulses, fromFirstMark } from '../src/irframe.ts';
import { imagePath } from '@harmony/lab';

interface Row {
  config: string;
  record: string;
  ours: string;
  kind: string;
  sent: string;
  status: number;
  theirs?: string;
}

/** Every recorded answer. Throws rather than skips on a lab that has the directory and no files. */
function answers(): Row[] {
  const dir = join(LAB ?? '', 'work', 'myharmony', 'analyzed');
  const files = readdirSync(dir).filter((one) => one.endsWith('.json'));
  if (files.length === 0) throw new Error(`no recorded answers in ${dir}; run make analyze`);
  return files.flatMap((one) =>
    (JSON.parse(readFileSync(join(dir, one), 'utf8')) as { rows: Row[] }).rows);
}

const value = (stated: string | undefined): bigint | undefined => {
  const hex = stated?.match(/\(0x([0-9A-Fa-f]+)\)/)?.[1];
  return hex === undefined ? undefined : BigInt(`0x${hex}`);
};

test('the population of recorded answers, per verdict our own decoder gave', skipWithoutLab(), () => {
  // Exact and split by verdict, because each row of this table is a different claim and a total would
  // let one of them go to zero unnoticed.
  const per = new Map<string, { asked: number; named: number }>();
  const configs = new Set<string>();
  for (const row of answers()) {
    configs.add(row.config);
    const one = per.get(row.kind) ?? { asked: 0, named: 0 };
    one.asked += 1;
    if (row.theirs !== undefined) one.named += 1;
    per.set(row.kind, one);
  }
  assert.equal(configs.size, 15, 'every container in the lab with an infrared table');
  assert.deepEqual(Object.fromEntries([...per].sort()), {
    // The codes we read: they read all of them too.
    'one reading': { asked: 180, named: 180 },
    // Biphase, which our decoder refuses because both conventions fit. They name every one.
    'both conventions': { asked: 48, named: 48 },
    // The ones a merge says we should never have read. They name none.
    'one reading, none once merged': { asked: 36, named: 0 },
    // And the ones neither of us reads, bar four.
    'no reading': { asked: 83, named: 4 },
  });
});

test('where both decoders produce a number they agree, 177 of 180', skipWithoutLab(), () => {
  // **The check section 133 could never run.** Two implementations, no shared code, on the same bytes.
  let agreed = 0;
  const differed: string[] = [];
  for (const row of answers()) {
    if (row.kind !== 'one reading') continue;
    const theirs = value(row.theirs);
    assert.notEqual(theirs, undefined, `${row.config} ${row.record} was not named`);
    const ours = BigInt(`0x${row.ours.split(':')[1]}`);
    // On the number, never on the spelling: they pad to whole nibbles and we do not, so a Sony frame
    // comes back as `070` against our `70`. Comparing the text counted that as a disagreement.
    if (ours === theirs) agreed += 1;
    else differed.push(`${row.config} ${row.record} ours ${row.ours} theirs ${row.theirs}`);
  }
  assert.equal(agreed, 177);
  assert.equal(differed.length, 3, differed.join('; '));
});

test('the three that differ are ours with four more bits, not ours being wrong',
  skipWithoutLab(), () => {
  // **The difference is by design and this is what says so.** Our decoder is deliberately protocol
  // agnostic: it reports every bit the rhythm carries and does not know which of them a family treats
  // as payload. Theirs names the family, so it drops what that family says is not the value.
  //
  // The relationship is exact in all three: our value is theirs shifted left by four, so we read four
  // bit cells past the end of the protocol's own field. A checksum or a fixed tail would look like
  // this. It is stated as a shift rather than as "close enough", because a shift can fail.
  for (const row of answers()) {
    if (row.kind !== 'one reading') continue;
    const theirs = value(row.theirs)!;
    const ours = BigInt(`0x${row.ours.split(':')[1]}`);
    if (ours === theirs) continue;
    assert.match(row.theirs!, /Makita 10 Bit/, `${row.config} ${row.record}`);
    assert.equal(ours >> 4n, theirs, `${row.config} ${row.record}`);
    // And the bit count agrees with the shift, which is the half that makes it a reading rather than
    // an arithmetic coincidence: fourteen cells read, ten in the family's name.
    assert.equal(row.ours.split(':')[0], '14');
  }
});

test('every code we refuse for being biphase, they name, and it is one family',
  skipWithoutLab(), () => {
  // **A capability gap rather than a defect, and section 134 confirmed from outside.** A biphase code
  // encodes a bit in a transition, so both of our conventions fit it and `irFrame` refuses rather than
  // guessing. Logitech names all 48 of them, and names them one thing: `Microsoft 30 Bit`, which is
  // RC6. Section 134 read those records as RC6 mode 6 out of the bytes alone, so this is that
  // identification arriving by a route with nothing in common.
  const families = new Set<string>();
  let counted = 0;
  for (const row of answers()) {
    if (row.kind !== 'both conventions') continue;
    assert.notEqual(row.theirs, undefined, `${row.config} ${row.record}`);
    families.add(row.theirs!.split(':')[1] ?? '?');
    counted += 1;
  }
  assert.equal(counted, 48);
  assert.deepEqual([...families], ['Microsoft 30 Bit']);
});

test('the readings a merge takes away are refused by their decoder too', skipWithoutLab(), () => {
  // **The settled case, and the merge has been made since 24 August 2026**, section 164. The fixture's
  // `ours` column is what our decoder said before it, a frame; it reads nothing there now, which is the
  // whole point of the change and is allowed by name in the test below. The internal argument that the
  // merged answer is right is that 45 different commands read as one value, and a remote cannot send
  // the same code for 45 buttons.
  //
  // This is the external half: their decoder produces nothing for a single one of the 36 asked about,
  // in any of the three forms tried by hand, merged and cut, merged whole, and the raw words. And it
  // is not that they cannot do this shape of code, since the test above has them naming 48 biphase
  // ones.
  let refused = 0;
  const values = new Set<string>();
  for (const row of answers()) {
    if (row.kind !== 'one reading, none once merged') continue;
    assert.equal(row.theirs, undefined, `${row.config} ${row.record} was named after all`);
    values.add(row.ours);
    refused += 1;
  }
  assert.equal(refused, 36);
  // All one value, which is the internal falsifier: these are different commands.
  assert.deepEqual([...values], ['8:ef']);
});

test('the decoder still says today what it said when the answers were recorded',
  skipWithoutLab(), () => {
  // **This is what makes the fixture a regression test rather than a report.** Every row names a
  // record and what our decoder said about it. Reading those records now has to give the same answer,
  // so a change to `irframe.ts` that moves any of 347 codes fails here, against an oracle that is not
  // ours and cannot be quietly updated to match.
  const configs = new Map<string, ReturnType<typeof parse>>();
  let checked = 0;
  let moved = 0;
  let merged = 0;
  for (const row of answers()) {
    let c = configs.get(row.config);
    if (c === undefined) {
      const path = imagePath(row.config);
      assert.notEqual(path, undefined, `${row.config} is not in the lab`);
      c = parse(new Uint8Array(readFileSync(path!)));
      configs.set(row.config, c);
    }
    const record = Number.parseInt(row.record, 16);
    assert.equal(irClass(c, record), IR_CLASS_STREAM, `${row.config} ${row.record}`);
    const first = irHeaderPointers(c, record)[0];
    const words = first === undefined ? undefined : irBlockWords(c, first);
    assert.notEqual(words, undefined, `${row.config} ${row.record} has no block`);
    const readings = framesOfPulses(fromFirstMark(pulsesOfWords(words!)));
    const said = readings.length === 1 ? frameKey(readings[0]!)
      : readings.length === 2 ? 'ambiguous' : 'no reading';
    // **One transition is expected and it is named**, section 163. The fixture's `ours` column is a
    // snapshot of what this decoder said on the day Logitech was asked, and requiring a constant non
    // carrying half took the biphase records from reading under **both** conventions to reading under
    // none. That is a deliberate change with a measured cost, so it is allowed here by name and by
    // count rather than by regenerating the column, which would let the next change through unnoticed.
    if (said === 'no reading' && row.ours === 'ambiguous') {
      moved += 1;
    } else if (said === 'no reading' && row.kind === 'one reading, none once merged') {
      // **The second named transition, and this one the column predicted**, section 164. These rows were
      // recorded as reading one way unmerged and nothing merged, which is what the merge made true. Keyed
      // on the recorded kind rather than on the value, so a record that stops reading for some other
      // reason still fails above.
      merged += 1;
    } else {
      assert.equal(said, row.ours, `${row.config} ${row.record} reads differently now`);
    }
    checked += 1;
  }
  assert.equal(checked, 347);
  // Exactly the population section 153 counted, and every one of them a biphase code that
  // `biphaseFrames` reads. Any other record moving fails above.
  assert.equal(moved, 48, 'the biphase records that stopped being ambiguous');
  // And exactly the population the test above counts, which is what says the merge took nothing else.
  assert.equal(merged, 36, 'the records whose reading the merge takes away');
  // And the records asked about are real records of real containers, which the loop above proves by
  // having found every one of them. The count is stated so a fixture shrinking is a failure.
  assert.equal(configs.size, 15);
});
