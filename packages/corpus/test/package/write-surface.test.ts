/**
 * `@harmony/corpus/write`, held to a list: the configuration write and the Touch's sync as
 * functions an application calls. A new name on the write subpath is a line in this file's diff, the rule
 * `packages/usb/test/package/surface.test.ts` keeps for `@harmony/usb/write`, and so is one taken away.
 *
 * **And the write is on no other entry.** Plan 013 settled that a write function is never on a main entry, so an
 * application that only reads imports `@harmony/corpus` and never meets one; this asks every entry
 * `package.json` exports, read from the manifest rather than listed here, so a subpath added there is checked
 * without an edit here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { entryNames } from '@harmony/testkit/surface';

const WRITE = new URL('../../src/write.ts', import.meta.url);
const MANIFEST = new URL('../../package.json', import.meta.url);

/** The write subpath: the names that exist at run time. */
const WRITE_VALUES = [
  'CONFIG_WRITE_MODELS', 'CONFIG_WRITE_UNITS', 'ConfigWriteRefusal', 'RECOVERY', 'SYNC_LINES', 'TOUCH_SYNC_UNITS',
  'answerTouchSync', 'assertTouchSyncAllowed', 'prepareSet', 'writeConfiguration',
];

/** The write subpath: the types and interfaces, which only the source shows. */
const WRITE_TYPES = [
  'ConfigWrite', 'ConfigWriteModel', 'ConfigWriteModelName', 'ConfigWriteResult', 'ConfigWriteStamp',
  'ConfigWriteUnit', 'ConfigWriteUnitLabel', 'SetAnswer', 'TouchSet', 'TouchSyncMode', 'TouchSyncOutcome', 'TouchSyncRun', 'UnitRecords',
];

/** The two functions that write to a remote, which no entry but the write subpath may offer. */
const WRITERS = ['writeConfiguration', 'answerTouchSync'];

test('the write subpath exports exactly its list, by explicit names', async () => {
  const names = entryNames(WRITE);
  assert.deepEqual(names.starExports, [], 'an export * makes every name of a module public by default');
  assert.deepEqual(names.values, WRITE_VALUES);
  assert.deepEqual(names.types, WRITE_TYPES);
  assert.deepEqual(Object.keys(await import(WRITE.href)).sort(), WRITE_VALUES);
});

test('the two write functions are on the write subpath and on no other entry', async () => {
  const exports = (JSON.parse(readFileSync(MANIFEST, 'utf8')) as { exports: Record<string, string> }).exports;
  assert.equal(exports['./write'], './src/write.ts');
  for (const [subpath, file] of Object.entries(exports)) {
    const entry = (await import(new URL(`../../${file}`, import.meta.url).href)) as Record<string, unknown>;
    for (const name of WRITERS) {
      // The control is the write subpath itself, which has to offer both, so the loop is not vacuous.
      assert.equal(typeof entry[name] === 'function', subpath === './write', `${name} on ${subpath}`);
    }
  }
});
