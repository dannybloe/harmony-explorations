/**
 * The two fixture tables must name the same files under the same logical names.
 *
 * There are two of them because there are two suites, and the port is only provably equivalent
 * if both read the same bytes. A name present on one side only produces a golden vector nobody
 * checks, which looks exactly like a passing test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { IMAGES, PARSEABLE_EXCLUDED } from '../src/index.ts';

const REPO_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');

function pythonImages(): Record<string, string> {
  const source = readFileSync(join(REPO_ROOT, 'tests', 'lab.py'), 'utf8');
  const block = /^IMAGES = \{$(.*?)^\}$/ms.exec(source);
  assert.ok(block, 'tests/lab.py has no IMAGES table in the expected shape');
  const out: Record<string, string> = {};
  for (const m of block[1]!.matchAll(/^\s*'([a-z0-9_]+)':\s*'([^']+)',/gm)) {
    out[m[1]!] = m[2]!;
  }
  return out;
}

test('the TypeScript and Python fixture tables agree', () => {
  assert.deepEqual(IMAGES, pythonImages());
});

test('the Python table was actually parsed, rather than read as empty', () => {
  // Without this, a change to lab.py's formatting would turn the check above into a comparison
  // of two empty objects, and it would pass.
  //
  // Exact, and the number is the point: the floor that stood here was 18, which was the size of the
  // table when it was written. The table is 58 entries now, so the guard had been satisfied by 31% of
  // it for weeks, and a regex that lost two thirds of the lines would have passed.
  //
  // 62 since the Harmony 895 was registered, section 177, 63 since the Harmony 350's config, section
  // 194, 65 since its firmware and the package it came in, section 196, and 68 since three files of
  // MyHarmony's own source, sections 202 and 203. 69 since the classic client's own wire log,
  // section 210, which is the first fixture here that is a capture rather than a file off a device,
  // 72 since the classic client's three single byte memory services, section 211, and 77 since
  // five more of the same client's HID services, section 213. 78 since the update service,
  // section 214, whose region table is the source end of a closure against the wire log above. 80
  // since two regions Logitech's own client read off a Harmony One, section 215.
  // This is a **pure text** check on lab.py, so it runs with no lab at all and is what
  // `make test-nolab` caught, four times now, when the count was left behind by a registration.
  // 81 since `one_spare_20260830`, the fourth state of the spare Harmony One, read on 30 August 2026.
  // 82 since the read taken after the first write, section 222.
  // 90 since the fourth region read of the spare Harmony One, section 246.
  // 91 since the read taken after the write of section 247.
  // 92 since the read taken after the revert of section 248.
  // 93 since the programmed Harmony 350, section 262.
  // 94 since the one device differential, section 263.
  // 95 since the Harmony 300, section 264.
  // 97 since the Harmony 525's erase block, section 268: the first **region** read of a remote other
  // than the spare Harmony One, and the first added because a configuration read was the wrong
  // shape rather than out of date.
  // 101 since the other four blocks of that region, section 270, which completes it: five blocks
  // from `0x820000` to `0x870000`, of which two hold the tail of an earlier configuration and two
  // are erased throughout.
  // 106 since the spare Harmony One's region has been read again before each activity write,
  // sections 276 and 277 and the round after them: a write invalidates the dump the next write
  // compares against, so each one needs its own base and each base is a fixture.
  // 107 since the compare base for the working screen write, section 279.
  // 108 since the compare base for the power off write, section 280.
  // 109 since the Harmony 650's config block, the compare base for its first write, section 281.
  // 110 since the bench Harmony 650's own firmware, which is not the published package's, section 281.
  // 111 since that unit's identity page, which is what keeps the Harmony 600 out, section 281.
  // 112 since that unit's whole configuration region, write-config.ts's compare base, section 282.
  // 113 since that region again after 1.4.2's delay write, the compare base for the revert.
  // 114 since the 650's state variable snapshots across a bare restart, section 283.
  // 115 since its data memory dumps across a third restart.
  // 116 since the variables' own bank across a fourth.
  // 117 since the configuration region after 1.4.3's composed device, section 285.
  // 118 since that region after the introduction tour was skipped, section 286.
  // 120 since the reads either side of 1.4.4's composed activity, section 291.
  // 121 since the region after the screen light timer went to 20 seconds, section 292, 122 at 10.
  // 123 since the spare Harmony One's region before its four page activity menu, section 293.
  // 124 since the 650's region after LG kijken's own device list, section 294.
  // 129 since the Harmony 700's internal pages twice and its staging region, section 295, and 132
  // with its pages after the repair and the 650's page 0xFE beside them.
  // 137 with the five reads either side of section 296's sync, 141 with section 297's four, and 142 with the staging read before that sync, 143 with the 700's configuration region on 2.8, 144 with that region after section 300's write, 145 with that write's output.
  // 154 with section 301's nine: the region after the delay write and after its revert, the three
  // write journals, the three infrared runs and the bench's monitor log. 155 with the Harmony 600's
  // configuration region before its first write, and 159 with section 302's external flash read,
  // rehearsal output and the two reads after it, and 161 with its two internal page reads, and 162 with its region after the KPN delay write,
  // and 172 with that region put back, the two write journals, three memory reads and two bench runs
  // with their monitor logs, section 303.
  // 174 with the two settings store reads over USB, section 304, and 177 with the store before and
  // after the KPN slot was cleared and that write's journal, section 305, and 180 with the bench test,
  // the variable bank and the store read after the start that followed it, and 184 with the 45 written
  // again, heard and put back, and 186 with the Harmony 650's configuration after the same television
  // was added to it and that account record's power settings, and 187 with the catalogue's own,
  // and 188 with that catalogue entry's timing record, and 189 with the archive's raw features capture, and 191 with section 306's two compiles, and 192 with the original remote's power presses, and 194 with the power threshold run, and 197 with section 307's three compiles, and 198 with section 308's one.
  assert.equal(Object.keys(pythonImages()).length, 198, 'every fixture tests/lab.py names');
});

test('the two sides exclude the same fixtures from the parseable population', () => {
  // A second pair of lists that nobody compares is the defect section 141 was written for, and this
  // one decides two corpus wide totals, so it gets the same equality check as IMAGES rather than a
  // comment asking people to keep them in step. Section 215.
  const source = readFileSync(join(REPO_ROOT, 'tests', 'lab.py'), 'utf8');
  const block = /^PARSEABLE_EXCLUDED = \((.*?)\)$/ms.exec(source);
  assert.ok(block, 'tests/lab.py has no PARSEABLE_EXCLUDED tuple in the expected shape');
  // **Comments are stripped before the names are read out, and that is not tidiness.** The first
  // version pulled quoted tokens straight out of the tuple, and an apostrophe in a comment inside it
  // silently re-paired every quote after it: `525's` opened a string that closed on the next real
  // name, so the last entry vanished and the two lists "disagreed" about a name both of them had.
  // That cost a confusing failure on 6 September 2026. A parser reading a language it does not
  // understand has to at least remove the parts of it that are prose.
  const withoutComments = block[1]!.replaceAll(/#[^\n]*/g, '');
  const names = [...withoutComments.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
  assert.deepEqual([...PARSEABLE_EXCLUDED].sort(), names.sort());
  // Eight since 1 September 2026. Three are byte for byte duplicates of a container already counted;
  // two are the reads taken after the writes that **changed** something, each that same container
  // plus two or three known operand bytes; the sixth is that container again read as a flash region
  // rather than as a container, which a write needs because an edit moves the trailer checksum into
  // a block a container stops part way through. Counting any of them would count one configuration
  // twice for every total that does not depend on those bytes, which is all of them. One state of a
  // remote per write is what the write path's compare demands, so this list grows with the writes
  // and that is by design rather than accumulation. The seventh is the first container the codec
  // itself produced, which differs from the pre write read in the one delay it was asked to change
  // and in the checksum that follows from it. The ninth, 3 September 2026, is the remote as the first
  // write that added a device left it, read as a region: section 241's candidate byte for byte, a
  // configuration this project composed rather than one Logitech compiled, so it is not a corpus
  // member either, section 242.
  // The tenth is that same state finished, read again because the write before it invalidated
  // the dump, which is the wart section 237 records rather than solves.
  // The eleventh is that same unit after the write of section 247, which is that container plus
  // one delay operand and the checksum that follows from it.
  // The twelfth is the revert of section 248, which is byte for byte the ninth again.
  // The fourteenth is the Harmony 525's erase block, section 268, and it is the first entry here
  // that is not a Harmony One at all. It is also the first added because a configuration read was
  // the wrong **shape** rather than out of date: a rehearsal compares a whole 64 KiB block and that
  // remote's configuration is 51195 bytes, so a region read was the only way to cover one. Its
  // first 51195 bytes are `h525_config_2` exactly.
  // The fifteenth is the spare Harmony One's region read after the first activity write, section
  // 276, and it is the only entry here holding a container this project **built**. It is excluded
  // for the usual reason, that its configuration would be counted twice, and for one of its own: the
  // remote will not run it, since its base slot 13 header declares more variables than it sizes
  // storage for, so counting it would put a configuration in the corpus that no remote executes.
  // The sixteenth, seventeenth and eighteenth are the same shape as the fifteenth: the region read
  // before each later activity write, excluded because each one's configuration is already counted
  // under the read it was built from.
  // The nineteenth is the compare base for the working screen write, section 279, the same shape.
  // The twentieth is the compare base for the power off write, section 280, the same shape again.
  // **The twenty second is the first of a different kind**, the Harmony 650's configuration region,
  // section 282: its container is counted nowhere, and it is excluded so that registering a compare
  // base does not quietly add a configuration to every corpus wide total. Whether the 650 joins the
  // corpus is a decision of its own.
  // 23 with that region again after 1.4.2's delay write, the same kind, and 24 with it after 1.4.3's
  // composed device, section 285, and 25 with it after the tour skip, section 286, 27 with the reads
  // either side of 1.4.4, section 291, and 28 and 29 with the 20 and 10 second screen timers. 30 is
  // the spare's compare base for its four page activity menu write, section 293, the first shape.
  // 31 with the 650's region after section 294, and 32 with the Harmony 700's external flash, kept for
  // its staged application, whose container is `h700_gspm`'s, section 295, and 33 with the same range
  // after section 296's sync, and 35 with the blank and the 2.8 staged regions of section 297, and 36 with the staging
  // read before section 296's sync, and 37 with the Harmony 700's configuration region on 2.8, and 38
  // with that region after section 300's write, and 40 with the two after section 301's delay write
  // and its revert, and 41 with the Harmony 600's region before its first write, whose container is
  // `h600_config`, and 42 with that region after section 302's write, and 44 with the 600's two
  // external flash reads from 0x000000, whose container is the safe mode one, and 45 and 46 with its
  // region after the KPN delay write and after it was put back, section 303, and 47 with the Harmony
  // 650's configuration after the Panasonic television was added to it, section 305, the 650's kind.
  // 49 with section 306's two compiles, whose test devices no remote ever held, and 52 with 307's three, and 53 with 308's one.
  assert.equal(names.length, 53, 'each one a container already counted, that container plus a known '
    + 'edit, or a compare base whose remote is not yet in the corpus');
});
