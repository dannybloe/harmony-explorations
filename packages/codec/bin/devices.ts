/**
 * Which devices a config drives, and what each one is called. Section 126.
 *
 * ```
 * node packages/codec/bin/devices.ts            one line per container, plus the corpus totals
 * node packages/codec/bin/devices.ts --detail   plus one line per device
 * ```
 *
 * The column to watch is the source, not the count, because the three routes are not equally strong.
 * `names` is base slot 0's own ASCII tied to an infrared group by the variable's transitions, which is
 * stated. `elimination` is the one label left for the one group left. `screen` is a title decoded from
 * glyph pixels, and it is the last resort. A run where the first column shrinks and the third grows is
 * a regression even if the total holds.
 *
 * **No device name is printed here.** They are the config owner's own equipment and this repository is
 * public, so `--detail` prints a length and a source, never the text, which is the rule `bin/text.ts`
 * and `bin/activities.ts` follow.
 *
 * The fact lines at the end are what `tools/facts.py` reads, so a document quoting these numbers has
 * them recomputed rather than remembered.
 */
import { LAB, load } from '@harmony/lab';
import { parse, devices } from '../src/index.ts';
import { CONTAINERS } from './corpus.ts';

// The same population as `bin/activities.ts`, for the same reason: the 880 is the one container whose
// contents are described in writing by their owner, so it is the one place a device count can be
// checked against something outside this codebase.
const SAMPLES = [...CONTAINERS, 'arch8_config_880', 'arch8_config_885'];

const detail = process.argv.includes('--detail');

if (LAB === undefined) {
  console.log('no lab directory, so there is nothing to read');
  process.exit(0);
}

let named = 0;
let total = 0;
const perSource = new Map<string, number>();
const perArchitecture = new Map<number, { named: number; total: number }>();
for (const name of SAMPLES) {
  const blob = load(name);
  if (blob === undefined) continue;
  const c = parse(blob);
  const rows = devices(c);
  if (rows.length === 0) continue;
  const here = rows.filter((one) => one.name !== undefined).length;
  named += here;
  total += rows.length;
  for (const one of rows) {
    if (one.source === undefined) continue;
    perSource.set(one.source, (perSource.get(one.source) ?? 0) + 1);
  }
  const architecture = c.architecture as number;
  const seen = perArchitecture.get(architecture) ?? { named: 0, total: 0 };
  seen.named += here;
  seen.total += rows.length;
  perArchitecture.set(architecture, seen);
  console.log(
    `arch ${String(architecture).padStart(2)} ${name.padEnd(24)} ` +
      `${String(rows.length).padStart(2)} devices  ` +
      `${String(here).padStart(2)} named  ` +
      `${rows.reduce((sum, one) => sum + one.codes, 0)} codes`,
  );
  if (detail) {
    for (const one of rows) {
      console.log(
        `        group ${String(one.group).padStart(2)} ` +
          `${String(one.codes).padStart(3)} codes ` +
          `${one.variables.length} variable(s) ` +
          (one.name === undefined
            ? 'unnamed'
            : `name of ${one.name.length} characters, from ${one.source}`),
      );
    }
  }
}

const share = total === 0 ? '' : `${((100 * named) / total).toFixed(1)}%`;
console.log(`\ncorpus ${named}/${total} devices named, ${share}`);
for (const architecture of [...perArchitecture.keys()].sort((a, b) => a - b)) {
  const here = perArchitecture.get(architecture) as { named: number; total: number };
  console.log(`       arch ${String(architecture).padStart(2)}  ${here.named}/${here.total}`);
}
for (const source of ['names', 'elimination', 'screen']) {
  console.log(`       by ${source.padEnd(12)} ${perSource.get(source) ?? 0}`);
}
console.log(`devices_named ${named}`);
console.log(`devices_total ${total}`);
