/**
 * `@harmony/usb`'s main entry, held to a list, plan 013 decision 6: a new public name is a line
 * in this file's diff, and so is one taken away. The lists are read off the entries' source,
 * `@harmony/testkit/surface`, which shows the types a loaded module does not, and each loaded module is held to the
 * same values, so a reading of the source that missed a name fails here.
 *
 * **And the rail surface, the review's point A3.** The rails are not on the main entry: it carries `RailError`, the
 * refusal a caller of `HarmonyRemote` meets, and no other name of `rails.ts`; the rails whole are `./rails`, and
 * `./write` carries the three a block writer asserts beside the machinery that erases and writes flash, held to its
 * own list here, so a second write caller is a decision visible in this diff. That no entry offers a request
 * builder that writes or a way to authorise one is `rails.test.ts`'s, over every entry. `CLAUDE.md` "Never write to
 * a remote" is the rule.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { entryNames } from '@harmony/testkit/surface';

const ENTRY = new URL('../../src/index.ts', import.meta.url);
const WRITE = new URL('../../src/write.ts', import.meta.url);
const MANIFEST = new URL('../../package.json', import.meta.url);

/** The main entry: the names that exist at run time. */
const VALUES = [
  'COMPARABLE_FIELDS', 'CompatibilityError', 'HarmonyRemote', 'LOGITECH_VENDOR', 'ProtocolError', 'RailError',
  'RemoteError', 'TransportError', 'UnitIdentityError', 'VERSION_FIELD_NAMES', 'architectureFromVersion',
  'compareIntendedVersion', 'compareIntendedVersionAgainstBlock', 'delaySlots', 'identifiesAUnit',
  'isFileBasedRemote', 'isHarmony', 'isMicrochipBootloader', 'isTunnelledRemote', 'latestSettings',
  'listFileBasedRemotes', 'listHarmony', 'listMicrochipBootloaders', 'listTunnelledRemotes', 'openFileBasedRemote',
  'openHarmony', 'parseSysInfo', 'readFile', 'readSysInfo', 'readVersion', 'sameUnit', 'skinId',
  'unitIdentityFromSerial', 'unitIdentityFromText', 'unitIdentityText',
];

/** The main entry: the types and interfaces, which only the source shows. */
const TYPES = [
  'Compatibility', 'CompatibilityField', 'DelaySlot', 'FieldVerdict', 'FoundRemote', 'RemoteOptions',
  'RemoteSelector', 'StatedVersion', 'Transport', 'VersionReading',
];

/**
 * The write subpath, `./write`: the names that exist at run time. `writeFileFamilyConfiguration` is
 * the whole file write for the Harmony 300 and 350 as one function an application calls, where
 * the script's body had been; its rails are `writeFileConfig`'s and the transport's, unchanged. `FILE_FAMILY_UNITS`
 * joined with it after the review: the units it may write, which the library holds and the script reads.
 */
const WRITE_VALUES = [
  'BlockWriteError', 'CONFIG_REGION_BASE', 'FILE_FAMILY_UNITS', 'FileWriteError', 'MAX_TRANSFER', 'NOMINAL_FLASH_SIZE',
  'assertFirstWriteAllowed', 'assertUnitIsPermitted', 'blocksDiffering', 'chunksFor', 'failureLine',
  'firstDifference', 'judgeCurrentContent', 'neighbourBlocks', 'readFileWriteFacts', 'reportCount', 'transfersFor',
  'withEndMarker', 'writeBlock', 'writeFileConfig', 'writeFileFamilyConfiguration',
];

/** The write subpath, `./write`: the types and interfaces, which only the source shows; the three `FileFamily` ones with the whole file write. */
const WRITE_TYPES = [
  'BlockWrite', 'CurrentContent', 'FileConfigWrite', 'FileFamilyUnit', 'FileFamilyWrite', 'FileFamilyWriteResult',
  'FileWriteFacts', 'FileWriteResult', 'WritePermission',
];

/** Every subpath `package.json` exports, `.` the main entry. */
const SUBPATHS = [
  '.', './write', './rails', './touchsession', './touchrecording', './protocol', './readwindow', './internal',
  './models', './keys', './trailer',
];

test('the main entry exports exactly its list, by explicit names', async () => {
  const names = entryNames(ENTRY);
  assert.deepEqual(names.starExports, [], 'an export * makes every name of a module public by default');
  assert.deepEqual(names.values, VALUES);
  assert.deepEqual(names.types, TYPES);
  // The loaded module agrees with the reading of its source.
  assert.deepEqual(Object.keys(await import(ENTRY.href)).sort(), VALUES);
});

test('the rails are off the main entry but for the refusal a caller meets, and whole on a subpath', async () => {
  const main = await import(ENTRY.href) as Record<string, unknown>;
  const rails = await import('../../src/rails.ts') as Record<string, unknown>;
  assert.deepEqual(Object.keys(rails).filter((name) => name in main), ['RailError']);
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as { exports: Record<string, string> };
  assert.equal(manifest.exports['./rails'], './src/rails.ts', 'the rails whole, as one module');
  // The control: the module is the rails, so an intersection of one is not an empty module.
  assert.equal(typeof rails['assertFlashWriteAllowed'], 'function');
});

test('the write subpath exports exactly its list', async () => {
  const names = entryNames(WRITE);
  assert.deepEqual(names.starExports, []);
  assert.deepEqual(names.values, WRITE_VALUES);
  assert.deepEqual(names.types, WRITE_TYPES);
  assert.deepEqual(Object.keys(await import(WRITE.href)).sort(), WRITE_VALUES);
});

test('the package exports exactly its list of subpaths, and no test file', () => {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as { exports: Record<string, string> };
  assert.deepEqual(Object.keys(manifest.exports), SUBPATHS);
  // The test helpers it exported until this step are the test kit's, `packages/testkit`.
  assert.deepEqual(Object.values(manifest.exports).filter((file) => !file.startsWith('./src/')), []);
});
