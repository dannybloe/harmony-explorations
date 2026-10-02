/**
 * Generate `src/segmentlengths.ts`: every protocol family's segment lengths as Logitech's definitions
 * state them, which is what a held power press is counted against, section 308.
 *
 * `make segmentlengths` compares the file with the archive and `--write` rewrites it. **It reads the
 * archive and nothing else**, deliberately apart from `bin/protocols.ts`, whose measured rows move with
 * the lab: these lengths are a property of the definitions, so the same archive commit always gives the
 * same file. Durations and names cross into the repository through this converter, decision 15.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { IR_ARCHIVE } from '@harmony/lab';
import { segmentLengthsModule } from '../src/archive.ts';

if (IR_ARCHIVE === undefined) {
  console.error('no infrared archive checkout; clone logitech-harmony-ir-archive alongside or set HARMONY_IR_ARCHIVE');
  process.exit(1);
}
const target = join(import.meta.dirname, '..', 'src', 'segmentlengths.ts');
const want = segmentLengthsModule(IR_ARCHIVE);
let have = '';
try { have = readFileSync(target, 'utf8'); } catch { /* absent until the first --write */ }
if (process.argv.includes('--write')) {
  writeFileSync(target, want);
  console.log(`wrote ${target}`);
} else if (have === want) {
  console.log('src/segmentlengths.ts agrees with the archive');
} else {
  console.error('src/segmentlengths.ts differs from the archive; run with --write');
  process.exit(1);
}
