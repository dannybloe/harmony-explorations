/**
 * How much of each container's on screen text can be read, and by which alphabet.
 *
 * ```
 * node packages/codec/bin/text.ts               one line per container
 * node packages/codec/bin/text.ts --detail      plus the codes no shape settles
 * node packages/codec/bin/text.ts --names       plus the closure against base slot 0
 * ```
 *
 * The number to watch is the last column: a container whose alphabet has no seed reads nothing at
 * all rather than reading as nonsense, so a new typeface shows up as a zero and not as a wrong
 * word. `docs/findings.md` section 112.
 *
 * **No decoded string is printed here.** A config's strings are its owner's own equipment names,
 * and this repository is public. `--names` prints how many names matched, never which.
 */
import { LAB, load } from '@harmony/lab';
import { parse, characterMap, drawnCodes, screenStrings, textCoverage, stateVariables } from '../src/index.ts';

const SAMPLES = [
  'one_safemode', 'one34_region2', 'h700_gspm', 'h600_safemode_gspm', 'h650_safemode_gspm',
  'one_config', 'one_config_unprogrammed', 'h600_config', 'h700_config', 'h700_config_2',
  'h525_config', 'arch8_config_a', 'arch8_config_b', 'arch8_config_c', 'arch8_config_d',
  'h525_safemode_ahcm', 'one_spare_before_sync', 'one_spare_after_sync',
];

const detail = process.argv.includes('--detail');
const names = process.argv.includes('--names');

if (LAB === undefined) {
  console.log('no lab directory, so there is nothing to read');
  process.exit(0);
}

let glyphs = 0;
let read = 0;
for (const name of SAMPLES) {
  const blob = load(name);
  if (blob === undefined) {
    console.log(`${name.padEnd(24)} absent`);
    continue;
  }
  const c = parse(blob);
  const map = characterMap(c);
  const coverage = textCoverage(c);
  glyphs += coverage.glyphs;
  read += coverage.read;
  const share = coverage.glyphs === 0 ? '' : `${((100 * coverage.read) / coverage.glyphs).toFixed(1)}%`;
  console.log(
    `arch ${String(c.architecture).padStart(2)} ${name.padEnd(24)} ` +
      `alphabet ${(map?.alphabet ?? 'NONE').padEnd(14)} ` +
      `${String(coverage.strings).padStart(5)} strings ${String(coverage.read).padStart(6)}/${String(coverage.glyphs).padEnd(6)} ${share}`,
  );
  if (detail && map !== undefined) {
    if (map.ambiguous.size > 0) {
      console.log(
        `        codes the pixels cannot settle: ` +
          [...map.ambiguous].map(([code, cands]) => `${code} is one of ${cands.join('')}`).join(', '),
      );
    }
    const unread = [...drawnCodes(c)].filter((code) => !map.codes.has(code)).sort((a, b) => a - b);
    if (unread.length > 0) console.log(`        codes drawn with no shape behind them: ${unread.join(' ')}`);
  }
  if (names) {
    // The closure: a level 1 name is ASCII in base slot 0, and the same words are drawn on screen
    // through a section this decoder never touches. Underscores stand for spaces in a name.
    const strings = screenStrings(c, map).map((one) => one.text);
    // A name is a run of underscore separated words, of which a drawn string is typically the
    // leading part: `Denon AV Receiver` against `Denon_AV_Receiver_Input`. So the test is whether a
    // drawn string sits inside a name, not the other way round.
    const labels = stateVariables(c).map((v) => v.label.replace(/_/g, ' '));
    const worth = [...new Set(strings.filter((text) => text.length >= 4))];
    const matched = worth.filter((text) => labels.some((label) => label.includes(text)));
    if (labels.length > 0) {
      console.log(
        `        strings that appear verbatim in a base slot 0 name: ${matched.length}` +
          ` of ${worth.length} distinct, out of ${labels.length} names`,
      );
    }
  }
}
console.log(`\ncorpus ${read}/${glyphs} glyphs read, ${((100 * read) / glyphs).toFixed(1)}%`);

// Machine readable, for `tools/facts.py`: the two numbers the documents quote, from the one place
// that computes them.
process.stdout.write(`text_read ${read}\n`);
process.stdout.write(`text_glyphs ${glyphs}\n`);
