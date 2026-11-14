/**
 * Measurements over the whole infrared archive that belong with `pronto.test.ts`, run on request by
 * `make archive-measure` and never by the test suite.
 *
 * A test reads the lab's sample of the archive, a fixed copy of the few files it needs, which `@harmony/lab`
 * locates. What stands here walks the archive itself and states what it counted, which is a statement about
 * one release of a third party's repository and not about this project's code:
 * how many of the first 300 codesets' Pronto renderings our waveforms reproduce.
 * A measurement whose numbers move with the archive is bound to the release it was taken at and is skipped, never
 * passed, at any other; moving one to a newer release is to measure again and repin. What each establishes and why
 * is argued in the header of the test file beside this one.
 */
import assert from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { IR_ARCHIVE, skipUnlessIrArchiveRelease } from '@harmony/lab';
import { waveformOfArchiveCommand } from '../../src/catalogue/archive.ts';
import { archiveProtocols } from '../../src/catalogue/archive.node.ts';
import { prontoPairs, prontoUnits, readPronto } from '../../src/infrared/pronto.ts';

/**
 * One command's waveform against the archive's rendering of it, or undefined where we do not claim one.
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
  { ...skipUnlessIrArchiveRelease() }, () => {
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
    // library's own composition, section 232, since its own copy was two readings behind, and again to
    // 11445 over 58 when section 233 read the last of the refusals.
    assert.equal(compared, 11445);
    assert.equal(agreed, 11445);
    assert.equal(heldCompared, 6741);
    assert.equal(heldAgreed, 6741);
    assert.equal(families.size, 58);
  });
