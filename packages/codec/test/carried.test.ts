/**
 * A recipe's own codes, `carriedCatalogue` and `carryCodes`, plan 014 and `todo.md` 7.3.11.1.
 *
 * **The claim**: a device carried in a recipe builds exactly as the archive's file of it does, so a recipe with its
 * codes needs no archive. Measured first on the two test setups whole, the Harmony One's and the Harmony 650's seven
 * devices and 407 commands each, built with `bin/build-recipe.ts` from the archive and from the carried copy with
 * `--no-archive`: equal byte for byte, 905173 and 851139 bytes. Held here on a smaller recipe, two devices and the
 * activity that uses them on the Harmony 650, built both ways; and with no archive at all, on what serving order and
 * refusals the carried catalogue keeps.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { IR_ARCHIVE, skipWithoutIrArchive } from '@harmony/lab';
import '../src/support/resources.node.ts';
import { carriedCatalogue } from '../src/catalogue/carried.ts';
import { archiveAt, buildFromRecipe, carryCodes, readRecipe, type Built } from '../src/node.ts';

const BUILT_AT = '2026-11-09T12:00:00';

/** Two devices of the Harmony 650 test setup and one activity using both. */
const SMALL = {
  model: { name: 'Harmony 650', skin: 72 },
  devices: [{ name: 'LG TV', device: 'LG/OLED65G26LA' }, { name: 'Denon', device: 'Denon/AVR-X4800H' }],
  activities: [{
    name: 'TV kijken', type: 'WatchTV',
    devices: [{ device: 'LG TV', input: 'HDMI 1', roles: ['Display'] }, { device: 'Denon', input: 'CBL/SAT', roles: ['Volume'] }],
  }],
};

const bytes = (built: Built): Uint8Array => {
  assert.equal(built.kind, 'configuration');
  return (built as { bytes: Uint8Array }).bytes;
};

test('a recipe with its codes carried builds as the archive does, byte for byte, with no archive', skipWithoutIrArchive(), () => {
  const carried = carryCodes(SMALL, IR_ARCHIVE!);
  const fromArchive = bytes(buildFromRecipe(SMALL, { builtAt: BUILT_AT, archive: archiveAt(IR_ARCHIVE!) }));
  const fromRecipe = bytes(buildFromRecipe(carried, { builtAt: BUILT_AT }));
  assert.deepEqual(fromRecipe, fromArchive);
  // The control: one code changed in the carried copy changes the build, so the build read the carried codes.
  const devices = carried['devices'] as { definition: { commands: { name: string; keycode: string }[] } }[];
  const commands = devices[0]!.definition.commands;
  const at = commands.findIndex((c) => c.name === 'VolumeUp');
  const other = commands.find((c) => c.keycode !== commands[at]!.keycode)!;
  commands[at] = { ...commands[at]!, keycode: other.keycode };
  assert.notDeepEqual(bytes(buildFromRecipe(carried, { builtAt: BUILT_AT })), fromArchive);
});

test('the carried catalogue serves the recipe\'s devices first, the archive\'s after, and refuses what neither holds', () => {
  const recipe = readRecipe({
    model: { name: 'Harmony 650', skin: 72 }, activities: [],
    devices: [{
      name: 'TV', device: 'Acme/One',
      definition: { record: { manufacturer: 'Acme', model: 'One', deviceType: 1, globalDeviceId: 7, codeset: 'codesets/00/acme.json' }, commands: [{ name: 'PowerOn', keycode: 'G:Acme:(0x1)():1' }] },
    }],
    protocols: [{ name: 'Acme' }],
  });
  const alone = carriedCatalogue(recipe)!;
  assert.equal(alone.device('Acme', 'One').manufacturer, 'Acme');
  assert.equal(alone.device('Acme', 'One.json').manufacturer, 'Acme', 'a file name with its extension names the same entry');
  assert.deepEqual(alone.commands('codesets/00/acme.json'), [{ name: 'PowerOn', keycode: 'G:Acme:(0x1)():1' }]);
  assert.deepEqual(alone.protocols().map((p) => p.name), ['Acme']);
  assert.throws(() => alone.device('Other', 'Two'), /carries no definition of Other\/Two, and no archive was given/);
  assert.throws(() => alone.commands('codesets/00/acme.json', { pronto: true }), /no rendered waveforms/);
  // Over an archive: the recipe's first, the archive's for the rest, a protocol the recipe carries not taken twice.
  const archive = {
    protocols: () => [{ name: 'Acme', carrierHz: 1 }, { name: 'Other', carrierHz: 2 }] as never,
    device: (slug: string) => ({ manufacturer: `archive ${slug}` }) as never,
    commands: () => [{ name: 'archive', keycode: 'x' }],
    driving: () => ({}) as never,
  };
  const over = carriedCatalogue(recipe, archive)!;
  assert.equal(over.device('Acme', 'One').manufacturer, 'Acme');
  assert.equal(over.device('Other', 'Two').manufacturer, 'archive Other');
  assert.deepEqual(over.protocols().map((p) => p.name), ['Acme', 'Other']);
  assert.equal((over.protocols()[0] as unknown as { carrierHz?: number }).carrierHz, undefined, 'the recipe\'s Acme, not the archive\'s');
  // Nothing carried: the archive as given, and none where none is given.
  const plain = readRecipe({ model: { name: 'Harmony 650', skin: 72 }, devices: [], activities: [] });
  assert.equal(carriedCatalogue(plain, archive), archive);
  assert.equal(carriedCatalogue(plain), undefined);
});
