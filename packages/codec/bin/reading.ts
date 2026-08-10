/**
 * How much of the corpus's action list language anyone can say the meaning of.
 *
 *   node packages/codec/bin/reading.ts                  every sample in the lab
 *   node packages/codec/bin/reading.ts --detail         plus a line per sample
 *
 * The step 6 progress number, with its depth. `meaning` is an instruction whose effect is tied to
 * something a config describes; `placement` is one whose handler is found and whose effect is not.
 * See `packages/codec/src/actions.ts` for why the distinction exists.
 *
 * **This exists because the number it prints was quoted in prose with nothing recomputing it.**
 * `CLAUDE.md`, `docs/roadmap.md` and `docs/findings.md` all said "97537 instructions" and "97.9%",
 * and on 10 August 2026, changing the figure for the first time since, none of it reproduced: the
 * population was never written down and no sample list gives 97537. That is precisely the failure
 * `tools/facts.py` was built to stop, in the one number the project quotes most often. So the
 * population is defined here, once, and every copy in a document carries a `fact:` marker.
 *
 * The population is every action list base slot 10 addresses, over the fifteen corpus containers.
 * That is a choice and not the only one: mode page lists, base slot 9 sets and base slot 13
 * transitions all carry instructions too. It is the one the tests already used, it is the one an
 * editor walks first, and what matters is that it is stated rather than assumed.
 */
import { IMAGES, load } from '@harmony/lab';

import { archSlot, parse, readingCoverage } from '../src/index.ts';
import type { ReadingCoverage } from '../src/index.ts';

const detail = process.argv.includes('--detail');

/** The corpus, in the order `packages/codec/bin/coverage.ts` prints it. */
const CONTAINERS = [
  'h700_config',
  'h700_config_2',
  'h600_config',
  'h525_config',
  'h525_config_2',
  'one_config',
  'one_config_unprogrammed',
  'arch8_config_a',
  'arch8_config_b',
  'arch8_config_c',
  'arch8_config_d',
  'h600_safemode_gspm',
  'h700_gspm',
  'h650_safemode_gspm',
  'h525_safemode_ahcm',
];

function share(part: number, whole: number): string {
  return whole === 0 ? '0.0%' : `${((100 * part) / whole).toFixed(1)}%`;
}

const corpus: ReadingCoverage = { meaning: 0, placement: 0, total: 0, unread: new Map() };
const perArchitecture = new Map<number, { meaning: number; total: number }>();
let missing = 0;

for (const name of CONTAINERS) {
  if (IMAGES[name] === undefined) throw new Error(`no lab entry named ${name}`);
  const raw = load(name);
  if (raw === undefined) {
    missing += 1;
    continue;
  }
  const c = parse(raw);
  const architecture = c.architecture;
  if (typeof architecture !== 'number') throw new Error(`${name} states no architecture`);
  const table = c.pointerArray(archSlot(architecture, 10)) ?? [];
  const r = readingCoverage(
    table.map((address) => c.actionList(address) ?? []),
    architecture,
  );
  corpus.meaning += r.meaning;
  corpus.placement += r.placement;
  corpus.total += r.total;
  for (const [key, n] of r.unread) corpus.unread.set(key, (corpus.unread.get(key) ?? 0) + n);
  const a = perArchitecture.get(architecture) ?? { meaning: 0, total: 0 };
  a.meaning += r.meaning;
  a.total += r.total;
  perArchitecture.set(architecture, a);
  if (detail) {
    process.stdout.write(
      `${name.padEnd(26)} arch ${String(architecture).padStart(2)}  ` +
        `${String(r.total).padStart(6)} instructions  ${share(r.meaning, r.total)} meaning\n`,
    );
  }
}

if (missing > 0) {
  process.stdout.write(`note: ${missing} of ${CONTAINERS.length} samples absent from the lab\n`);
}
if (corpus.total === 0) {
  process.stdout.write('no samples available, so nothing to report\n');
  process.exit(0);
}
if (detail) process.stdout.write('\n');

// Named as `facts.py` reads them: the fact name, then the value last on the line.
const unread = [...corpus.unread].reduce((n, [, count]) => n + count, 0);
process.stdout.write(`action_instructions ${corpus.total}\n`);
process.stdout.write(`reading_meaning ${share(corpus.meaning, corpus.total)}\n`);
process.stdout.write(`reading_placement ${share(corpus.placement, corpus.total)}\n`);
process.stdout.write(`reading_unread ${unread}\n`);
for (const [architecture, a] of [...perArchitecture].sort((x, y) => x[0] - y[0])) {
  process.stdout.write(`reading_arch${architecture} ${share(a.meaning, a.total)}\n`);
}
if (unread > 0) {
  process.stdout.write(
    `\nno reading at all: ${[...corpus.unread].map(([k, n]) => `${k} x${n}`).join(', ')}\n`,
  );
}
