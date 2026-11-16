/**
 * Measurements over the whole infrared archive that belong with `catalogue.test.ts`, run on request by
 * `make archive-measure` and never by the test suite.
 *
 * A test reads the lab's sample of the archive, a fixed copy of the few files it needs, which `@freeharmony-sdk/lab`
 * locates. What stands here walks the archive itself and states what it counted, which is a statement about
 * one release of a third party's repository and not about this project's code: that the manufacturers' indexes
 * cover every device the manifest counts, and that three devices in all of them have no model name. The first is
 * held to what the archive states about itself and holds at any release; the second is a count of its contents, at
 * the releases of 2 September and 10 November 2026 alike.
 */
import assert from 'node:assert';
import test from 'node:test';
import { IR_ARCHIVE, needing, skipWithoutIrArchive } from '@freeharmony-sdk/lab';
import { catalogueManufacturers, catalogueModels } from '../../src/catalogue/catalogue.node.ts';
import { archiveManifest } from '../../src/catalogue/archive.node.ts';

test('the manufacturers\' indexes cover the archive, and three devices in it have no model name',
  needing(skipWithoutIrArchive()), () => {
  let rows = 0;
  const nameless: { maker: string; file: string; id: number }[] = [];
  for (const maker of catalogueManufacturers(IR_ARCHIVE!)) {
    for (const one of catalogueModels(IR_ARCHIVE!, maker.slug)) {
      rows += 1;
      if (one.model === null) nameless.push({ maker: maker.slug, file: one.file, id: one.globalDeviceId });
    }
  }
  assert.equal(rows, archiveManifest(IR_ARCHIVE!).counts['devices'], 'the manufacturer indexes do not cover the archive');
  assert.equal(nameless.length, 3, 'a device with no model name appeared or went away');
  assert.deepEqual(nameless.map((one) => one.maker).sort(), ['Gemini', 'Sony', 'Thomson']);
});
