/**
 * **Every recipe against its reference**, plan 014 and `todo.md` 7.3.11.6: each recipe in `references/` is built from
 * nothing through `buildFromRecipe` and its fingerprint, `builtDigest`, compared with the one `references.json`
 * recorded, with no lab and no archive. These are the integration tests of the one build: several recipes per remote,
 * a remote with nothing and a full setup, on every remote served but the Harmony 885.
 *
 * **What a reference is, decision 32.** A recipe of ours and the fingerprint of its build; no build is committed, since
 * the bytes a fingerprint stood for are rebuilt from the recipe at the commit that recorded it, and a committed build
 * would grow the repository each time the build moves. `bin/reference.ts --diff --name <reference>` does that rebuild
 * and shows where the two differ.
 *
 * **Which of them a remote ran.** `onRemote` says, per reference, and where a bench file is named the last test holds
 * it, when the lab is there: the build stamped as its write stamped it is that file byte for byte. Measured on
 * 9 November 2026: the Harmony One's empty and test setup, the Harmony 600's empty and five devices, the Harmony 700's
 * test setup in the bench test colours, and the Harmony 350's test setup, which the Harmony 300 ran too. The Harmony
 * 650's two, the Harmony 700's empty and the Harmony 350's empty differ from what their remotes ran only by fixes made
 * after the bench run, each pinned to its commit in `onRemote`; the Harmony Touch's differs by its account, John Doe's
 * here, `john-doe-account.json`, invented.
 *
 * **What each recipe must state**: every device carried, so no archive is read, and every choice its family makes,
 * `unstatedChoices` empty, so a default changed later cannot move a reference without its recipe saying so.
 *
 * **When a fingerprint fails**, the build changed. Run `--diff`, find the commit and say why; then fix the build, or,
 * where the change is wanted, `bin/reference.ts --record --name <reference>` and say in the commit which change moved
 * it and that the new build has not been on a remote, in `onRemote` too.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LAB, skipWithoutLab, slow } from '@harmony/lab';
import '../../src/support/resources.node.ts';
import { buildFromRecipe, builtDigest, parse, saveEdits, unstatedChoices, type Built } from '../../src/node.ts';

const FOLDER = fileURLToPath(new URL('../references/', import.meta.url));

/** One reference, as `references.json` lists it. */
interface Reference {
  readonly name: string;
  readonly about: string;
  readonly builtAt: string;
  readonly sha256: string;
  readonly size: number;
  readonly onRemote: string;
  /** The lab file a remote ran, where this reference's build is that file once stamped as its write stamped it. */
  readonly benchFile?: string;
  readonly stampedAt?: string;
}

const REFERENCES = JSON.parse(readFileSync(join(FOLDER, 'references.json'), 'utf8')) as readonly Reference[];
const ACCOUNT = JSON.parse(readFileSync(join(FOLDER, 'john-doe-account.json'), 'utf8')) as unknown;
const recipeOf = (name: string): Record<string, unknown> => JSON.parse(readFileSync(join(FOLDER, `${name}.json`), 'utf8')) as Record<string, unknown>;
// No archive: a reference recipe carries every device it names.
const build = (recipe: unknown, builtAt: string): Built => buildFromRecipe(recipe, { builtAt, account: ACCOUNT as never });

test('the references listed are the recipes there are, eleven on six models', () => {
  const recipes = readdirSync(FOLDER).filter((f) => f.endsWith('.json') && f !== 'references.json' && f !== 'john-doe-account.json')
    .map((f) => f.slice(0, -5)).sort();
  assert.deepEqual(REFERENCES.map((r) => r.name).sort(), recipes);
  assert.equal(REFERENCES.length, 11);
  const models = new Set(REFERENCES.map((r) => (recipeOf(r.name)['model'] as { name: string }).name));
  assert.deepEqual([...models].sort(), ['Harmony 350', 'Harmony 600 EMEA', 'Harmony 650', 'Harmony 700', 'Harmony One', 'Harmony Touch']);
  for (const r of REFERENCES) {
    assert.match(r.builtAt, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d$/, `${r.name}'s stamp`);
    assert.match(r.sha256, /^[0-9a-f]{64}$/, `${r.name}'s fingerprint`);
    assert.ok(r.onRemote.length > 0, `${r.name} says whether a remote ran it`);
  }
});

/**
 * The full setups of the screen families take seconds each to build, most of this file's time, so they run in the slow
 * tier, `make ts-test-all`; the empty ones, the file family's setup and the Touch's run on every `make ts-test`.
 */
const SLOW: ReadonlySet<string> = new Set(['one-test', 'h650-test', 'h600-five', 'h700-test-bright']);

for (const reference of REFERENCES) {
  test(`${reference.name}: ${reference.about}, every choice stated and every device carried, built to its fingerprint`, SLOW.has(reference.name) ? slow() : {}, () => {
    const recipe = recipeOf(reference.name);
    assert.deepEqual(unstatedChoices(recipe), [], 'every choice of the family stated');
    const devices = recipe['devices'] as { definition?: unknown; name: string }[];
    assert.deepEqual(devices.filter((d) => d.definition === undefined).map((d) => d.name), [], 'every device carried');
    const built = build(recipe, reference.builtAt);
    assert.equal(builtDigest(built), reference.sha256,
      `${reference.name} built differently: node packages/codec/bin/reference.ts --diff --name ${reference.name}`);
  });
}

test('the control: a reference built with another stamp has another fingerprint, so the comparison can fail', () => {
  const r = REFERENCES.find((one) => one.name === 'h350-empty')!;
  assert.notEqual(builtDigest(build(recipeOf(r.name), r.builtAt.replace(/^2026/, '2025'))), r.sha256);
  assert.equal(builtDigest(build(recipeOf(r.name), r.builtAt)), r.sha256);
});

test('the references a remote ran are its bench files byte for byte, stamped as their writes stamped them', slow(skipWithoutLab()), () => {
  const ran = REFERENCES.filter((r) => r.benchFile !== undefined);
  assert.deepEqual(ran.map((r) => r.name), ['one-empty', 'one-test', 'h600-empty', 'h600-five', 'h700-test-bright', 'h350-test']);
  for (const r of ran) {
    const built = build(recipeOf(r.name), r.builtAt);
    assert.equal(built.kind, 'configuration');
    const bytes = (built as { bytes: Uint8Array }).bytes;
    // The configuration writer stamps the moment of the write; the file family's writes nothing over the build.
    const written = r.stampedAt === undefined ? bytes : saveEdits(parse(bytes), [], r.stampedAt).bytes;
    const bench = join(LAB!, r.benchFile!);
    assert.ok(existsSync(bench), `${r.name}: ${r.benchFile} is in the lab`);
    assert.deepEqual(written, new Uint8Array(readFileSync(bench)), `${r.name} against ${r.benchFile}`);
  }
});
