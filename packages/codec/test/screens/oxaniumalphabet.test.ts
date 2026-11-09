/**
 * Our letters' alphabet as generated data, `src/screens/oxaniumalphabet.ts`, held to the font it was computed from, a fix
 * to `todo.md` 7.3.5.
 *
 * **Why the copy exists.** 7.3.5 put Oxanium's files behind a resource only the Node entry supplies, and
 * `characterMap` tries our alphabet on every configuration, Logitech's included, so through the main entry
 * `devices`, `activities` and `inventory` refused on every configuration: FreeHarmony's import test failed 9 of 9
 * with `ResourceError: the codec was supplied no oxanium`. The reader now takes the alphabet from the generated
 * module, `oxaniumAlphabet`, which needs nothing supplied; that it does is `mainentryreads.test.ts`.
 *
 * **Why this test.** A generated copy of a derivation is a second copy, and two copies drift the moment the
 * derivation moves: a face, a weight, a character or the way a form is read. So the alphabet is computed from the
 * font again here, as the reader computed it until the fix, `oxaniumAlphabetFromFont`, and the module has to equal
 * it table for table. The comparison is over the decoded tables and not over the base64, because the base64 is
 * zlib's output and another zlib may write the same tables in other bytes.
 *
 * Measured when the module was written: 10010 forms, 13169 structures, and 98 faces in their weights; the tables
 * are 4.2 MB of JSON and 379624 characters of base64.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { deflateSync } from 'node:zlib';

import '../../src/support/resources.node.ts';
import { OXANIUM_ALPHABET_TABLES } from '../../src/screens/oxaniumalphabet.ts';
import {
  oxaniumAlphabet, oxaniumAlphabetFromFont, packOxaniumAlphabet, unpackOxaniumAlphabet, type OxaniumAlphabet,
} from '../../src/screens/text.ts';

const fromFont: OxaniumAlphabet = oxaniumAlphabetFromFont();

test('the generated alphabet is the one the font gives, every form, structure and face', () => {
  const generated = unpackOxaniumAlphabet(OXANIUM_ALPHABET_TABLES);
  assert.deepStrictEqual(generated, fromFont,
    'src/screens/oxaniumalphabet.ts differs from the font: run node packages/codec/bin/oxaniumalphabet.ts --write');
  // And the reader's door gives the same, so no caller of `oxaniumAlphabet` sees anything else.
  assert.deepStrictEqual(oxaniumAlphabet(), fromFont);
  // The counts, exact, so an alphabet that lost a weight on both sides at once is still seen to move.
  const count = (table: Readonly<Record<string, unknown>> | undefined): number => Object.keys(table ?? {}).length;
  assert.deepEqual(
    [count(fromFont.forms), count(fromFont.structures), count(fromFont.drawnIn), new Set(Object.values(fromFont.drawnIn).flat()).size],
    [10010, 13169, 10010, 98],
  );
  assert.deepEqual(fromFont.shapes, {});
});

test('the control: a module one entry off the font fails the comparison, in each table', () => {
  const generated = unpackOxaniumAlphabet(OXANIUM_ALPHABET_TABLES);
  const [form, characters] = Object.entries(generated.forms ?? {})[0]!;
  const [structure] = Object.keys(generated.structures ?? {});
  const variants: OxaniumAlphabet[] = [
    // A form gone, as a weight dropped from the generator would leave.
    { ...generated, forms: Object.fromEntries(Object.entries(generated.forms ?? {}).slice(1)) },
    // A form naming one character more, as a changed character list would.
    { ...generated, forms: { ...generated.forms, [form]: `${characters}~` } },
    // A structure gone.
    { ...generated, structures: Object.fromEntries(Object.entries(generated.structures ?? {}).filter(([key]) => key !== structure)) },
    // A face gone from the faces that draw a form.
    { ...generated, drawnIn: { ...generated.drawnIn, [form]: (generated.drawnIn[form] ?? []).slice(1) } },
  ];
  for (const variant of variants) assert.ok(!isDeepStrictEqual(variant, fromFont));
  // And the packing round trips, so a failure here is the tables and never the encoding.
  assert.deepStrictEqual(unpackOxaniumAlphabet(packOxaniumAlphabet(fromFont, (bytes) => new Uint8Array(deflateSync(bytes)))), fromFont);
});
