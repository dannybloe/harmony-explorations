/**
 * The examples of the API guide on the website, `reference/sdk/guide.md`, each run as the program it is.
 *
 * **Why they are run and not only typechecked.** An example is the one piece of the documentation a reader copies,
 * so one that stopped working is worse than none: it fails in their application rather than here. Each example states
 * what it shows with `assert`, so running it is its test, and the guide shows the file itself, which
 * `packages/lab/bin/api-reference.ts` fills into the page and `packages/lab/test/api-reference.test.ts` holds equal.
 *
 * **Each in a process of its own**, as an application is: an example that imports the config package's Node entry
 * supplies the fonts process wide, which would change what another example's check reports if they shared one.
 * They need no lab and no remote: the documents they start from are in `examples/documents/`, and the remote is the
 * pretend one.
 *
 * **The documents are copies, held equal to what they copy.** A reader copies the examples' folder, so the documents
 * the examples open sit in it rather than in the config package's tests, which a released package does not carry;
 * each copy is the SDK's own test setup of the same name, and a test here fails the moment the two differ.
 *
 * **The read of a remote on the cable is a function and not a program**, `examples/read-attached.ts`, since running
 * it would open a remote. It is typechecked with the rest, and called here with a pretend remote in place of the
 * cable, the same function an application calls.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const EXAMPLES = new URL('../../examples/', import.meta.url);

/** The modules the examples share, imported by them and not programs of their own. */
const SHARED = ['library.ts', 'read-attached.ts'];

const programs = readdirSync(EXAMPLES).filter((name) => name.endsWith('.ts') && !SHARED.includes(name)).sort();

/** The documents the examples start from, each a copy of the SDK's own test setup of the same name. */
const DOCUMENTS = ['one-test.json', 'touch-test.json'];

test('the examples are the ones the guide is written around, so one added or dropped shows in this diff', () => {
  assert.deepEqual(programs, ['add-device.ts', 'build.ts', 'change.ts', 'check.ts', 'create.ts', 'imports.ts', 'keys.ts', 'read.ts', 'sync.ts']);
});

// Side by side, since three of them build a Harmony One's configuration and take seconds each.
test('every example runs to its end, every assertion in it holding', { concurrency: true }, async (t) => {
  await Promise.all(programs.map((name) => t.test(name, async () => {
    try {
      await promisify(execFile)(process.execPath, [fileURLToPath(new URL(name, EXAMPLES))]);
    } catch (error) {
      assert.fail(`${name} failed:\n${(error as { stderr?: string }).stderr ?? String(error)}`);
    }
  })));
});

test('the documents the examples start from are exactly the copies, each equal to the test setup it copies', () => {
  assert.deepEqual(readdirSync(new URL('documents/', EXAMPLES)).sort(), DOCUMENTS);
  for (const name of DOCUMENTS) {
    const copy = readFileSync(new URL(`documents/${name}`, EXAMPLES), 'utf8');
    const reference = readFileSync(new URL(`../../../config/test/references/${name}`, import.meta.url), 'utf8');
    assert.equal(copy, reference, `examples/documents/${name} differs from packages/config/test/references/${name}`);
  }
});

test('the read of a remote on the cable reads a pretend remote handed in its place, and lets it go', async () => {
  const { readRemote } = await import('../../examples/read-attached.ts');
  const { pretendReader, pretendRemote } = await import('@freeharmony-sdk/remote/write');
  const { recipe } = await import('@freeharmony-sdk/config/node');
  const remote = pretendRemote({ model: { name: 'Harmony One' }, holds: recipe.create({ name: 'Harmony One' }) });
  let closed = 0;
  const read = await readRemote(async () => ({ ...pretendReader(remote), close: async () => { closed += 1; } }));
  assert.equal(read.profile.model, 'Harmony One');
  assert.ok(read.bytes.length > 0);
  assert.equal(closed, 1);
  // And let go when the read fails: a pretend remote told to fail its next read.
  const failing = pretendRemote({ model: { name: 'Harmony One' }, holds: recipe.create({ name: 'Harmony One' }), failIn: 'read' });
  await assert.rejects(readRemote(async () => ({ ...pretendReader(failing), close: async () => { closed += 1; } })));
  assert.equal(closed, 2);
});
