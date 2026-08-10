/**
 * How much of a config this codec can put back, per sample.
 *
 *   node packages/codec/bin/emit.ts                 every sample in the lab
 *   node packages/codec/bin/emit.ts --file <config> one file, no lab needed
 *   node packages/codec/bin/emit.ts --detail        plus framed bytes per owner
 *
 * The other half of `coverage.ts`. That one asks what a reader can attribute; this asks whether
 * the reading is enough to reproduce the bytes, which is milestone M2's third part.
 *
 * Three numbers rather than one, and the split is the point. **framed** bytes are computed from
 * typed fields. **carried** bytes came out of a reader as an opaque run, which is honest for a
 * glyph or a picture body, since the pixels do not determine the encoding back, and dishonest to
 * count as understanding. **copied** is what no rebuilder claims at all.
 *
 * `equal` is the check the whole thing rests on: the emitted bytes are the parsed bytes.
 */
import { readFileSync } from 'node:fs';

import { IMAGES, load } from '@harmony/lab';

import { emit, parse, payloadOf, roundTrip } from '../src/index.ts';
import type { Container } from '../src/index.ts';
import { CONTAINERS } from './corpus.ts';

const detail = process.argv.includes('--detail');

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

function show(label: string, c: Container): void {
  const result = roundTrip(c);
  const percent = ((100 * result.framed) / result.total).toFixed(1);
  process.stdout.write(
    `${label.padEnd(26)} arch ${String(c.architecture ?? '?').padStart(2)}  ` +
      `framed ${String(result.framed).padStart(8)}  carried ${String(result.carried).padStart(8)}  ` +
      `copied ${String(result.copied).padStart(7)}  ${percent.padStart(5)}%  ` +
      (result.equal ? 'equal' : `DIFFERS at 0x${result.firstDifference?.toString(16)}`) +
      '\n',
  );
  if (!detail) return;
  for (const [owner, bytes] of emit(c).byOwner) {
    process.stdout.write(`    ${owner.padEnd(22)} ${String(bytes).padStart(8)}\n`);
  }
  process.stdout.write('\n');
}

const file = argument('file');
if (file !== undefined) {
  const data = new Uint8Array(readFileSync(file));
  let blob: Uint8Array;
  try {
    blob = payloadOf(data, file);
  } catch {
    blob = data;
  }
  show(file, parse(blob));
} else {
  let anything = false;
  for (const name of CONTAINERS) {
    // The same named population `coverage.ts` uses, and for the same reason: an arch 8 firmware
    // image parses as a container, so "whatever in IMAGES parses" is not the corpus.
    if (IMAGES[name] === undefined) throw new Error(`no lab entry named ${name}`);
    const data = load(name);
    if (data === undefined) continue;
    anything = true;
    show(name, parse(data));
  }
  if (!anything) {
    process.stderr.write('no containers found; set HARMONY_LAB or pass --file\n');
    process.exit(1);
  }
}
