/**
 * Which activity each key starts, and which drawn label belongs to it. Sections 120, 121 and 124.
 *
 * ```
 * node packages/codec/bin/activities.ts            one line per container, plus the corpus totals
 * node packages/codec/bin/activities.ts --detail   plus one line per activity
 * ```
 *
 * The number to watch is the last column, and it is complete on all four architectures since section
 * 125. It has a per architecture form because the routes differ: arch 8, 9 and 14 resolve an activity's
 * name from what the modes it enters say, and arch 12 cannot, because a Harmony One's activity mode does
 * not repeat the name its menu draws and no fixed scan code to row map can exist on a touch panel. A One
 * uses base slot 17's hit map instead, through the index in the mode page's spare byte.
 *
 * **No label is printed here.** An activity's name is the config owner's own words, and this
 * repository is public; `--detail` prints its length and where it is drawn, never the text. That is
 * the same rule `bin/text.ts` follows and for the same reason.
 *
 * The fact lines at the end are what `tools/facts.py` reads, so a document quoting these numbers has
 * them recomputed rather than remembered.
 */
import { LAB, load } from '@harmony/lab';
import { parse, activityNames } from '../src/index.ts';
import { CONTAINERS } from './corpus.ts';

// The two arch 8 configs of 12 August 2026 are in, for the reason `bin/text.ts` states: the 880 is
// the corpus's only container with a written description of what is in it, so it is the one place a
// count of activities can be checked against something outside this codebase.
const SAMPLES = [...CONTAINERS, 'arch8_config_880', 'arch8_config_885'];

const detail = process.argv.includes('--detail');

if (LAB === undefined) {
  console.log('no lab directory, so there is nothing to read');
  process.exit(0);
}

let named = 0;
let total = 0;
const perArchitecture = new Map<number, { named: number; total: number }>();
for (const name of SAMPLES) {
  const blob = load(name);
  if (blob === undefined) continue;
  const c = parse(blob);
  const rows = activityNames(c);
  if (rows.length === 0) continue;
  const here = rows.filter((one) => one.name !== undefined).length;
  named += here;
  total += rows.length;
  const architecture = c.architecture as number;
  const seen = perArchitecture.get(architecture) ?? { named: 0, total: 0 };
  seen.named += here;
  seen.total += rows.length;
  perArchitecture.set(architecture, seen);
  console.log(
    `arch ${String(architecture).padStart(2)} ${name.padEnd(24)} ` +
      `${String(rows.length).padStart(2)} activities  ` +
      `${String(here).padStart(2)} named  ` +
      `${new Set(rows.map((one) => one.page)).size} page(s)`,
  );
  if (detail) {
    for (const one of rows) {
      console.log(
        `        activity ${String(one.activity).padStart(2)} ` +
          `scans ${one.scans.join('/')} modes ${one.modes.join('/')} ` +
          (one.name === undefined
            ? 'no label resolves'
            : `label of ${one.name.length} characters at (${one.at?.x}, ${one.at?.y})`),
      );
    }
  }
}

const share = total === 0 ? '' : `${((100 * named) / total).toFixed(1)}%`;
console.log(`\ncorpus ${named}/${total} activities named, ${share}`);
for (const architecture of [...perArchitecture.keys()].sort((a, b) => a - b)) {
  const here = perArchitecture.get(architecture) as { named: number; total: number };
  console.log(`       arch ${String(architecture).padStart(2)}  ${here.named}/${here.total}`);
}
console.log(`activities_named ${named}`);
console.log(`activities_total ${total}`);
