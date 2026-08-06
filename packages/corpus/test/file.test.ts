/**
 * Filing a read, into a temporary directory rather than the real corpus.
 *
 * The naming is worth pinning because it is what somebody reads a year later when they are trying
 * to work out which remote a file came off, and by then nobody remembers.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { decodePayload } from '@harmony/codec';
import { load, skipUnless } from '@harmony/lab';

import {
  describe,
  fileNames,
  fileRead,
  FileError,
  profileFor,
  readConfig,
  slug,
  stamp,
  type ConfigReader,
} from '../src/index.ts';

const H600 = 0xc122;
const WHEN = new Date('2026-08-06T11:45:09.000Z');

test('the stamp is UTC and sorts', () => {
  assert.equal(stamp(WHEN), '20260806T1145Z');
  assert.ok(stamp(new Date('2026-08-06T09:00:00Z')) < stamp(WHEN), 'earlier reads sort earlier');
});

test('a label cannot escape the directory it is written into', () => {
  assert.equal(slug('OneRes'), 'oneres');
  assert.equal(slug('Harmony 600'), 'harmony-600');
  assert.equal(slug('../../etc/passwd'), 'etc-passwd');
  assert.throws(() => slug('///'), FileError);
});

test('both files share a base name so they stay together', () => {
  const names = fileNames('OneRes', WHEN);
  assert.equal(names.config, '20260806T1145Z-oneres-config.bin');
  assert.equal(names.sidecar, '20260806T1145Z-oneres-config.json');
});

/** A remote holding one real config, enough to produce a read worth filing. */
async function readFromFile(name: string, productId: number) {
  const config = decodePayload(load(name) as Uint8Array).payload;
  const profile = profileFor(productId);
  const reader: ConfigReader = {
    async getVersion() {
      return Uint8Array.from([0x02, 0x1c, 0x15, 0x02, 71, 0, 0, 0, 0, 0, 0, 0]);
    },
    async readFlash(address, count) {
      const at = address - profile.configBase;
      const out = new Uint8Array(count).fill(0xff);
      out.set(config.subarray(at, Math.min(at + count, config.length)));
      return out;
    },
  };
  let clock = 0;
  return readConfig(reader, profile, { now: () => (clock += 1000) });
}

test('the sidecar records what the blob cannot say about itself', skipUnless('h600_config'), async () => {
  const read = await readFromFile('h600_config', H600);
  const meta = describe(read, 'H600', WHEN) as Record<string, Record<string, unknown>>;

  assert.equal(meta['label'], 'H600');
  assert.equal(meta['read_at'], '2026-08-06T11:45:09.000Z');
  assert.equal(meta['remote']?.['product_id'], '0xc122');
  assert.equal(meta['remote']?.['architecture'], 14);
  assert.equal(meta['flash']?.['base'], '0x030000');
  assert.equal(meta['flash']?.['end_addr'], '0x0e4361');
  assert.equal(meta['flash']?.['length'], 738149);
  // The container summary is the same shape the golden vectors use, so a sidecar can be compared
  // against one without a converter.
  assert.equal(meta['container']?.['architecture'], 14);
});

test('a read lands as two files and refuses to overwrite an earlier one', skipUnless('h600_config'), async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'harmony-corpus-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const read = await readFromFile('h600_config', H600);
  const filed = fileRead(root, read, 'H600', WHEN);

  const written = readdirSync(filed.directory).sort();
  assert.deepEqual(written, [filed.config, filed.sidecar].sort());
  assert.deepEqual(
    [...readFileSync(join(filed.directory, filed.config))],
    [...read.bytes],
    'the filed config is the bytes that came off the remote, untouched',
  );
  const meta = JSON.parse(readFileSync(join(filed.directory, filed.sidecar), 'utf8'));
  assert.equal(meta.flash.length, read.bytes.length);

  // Two reads in the same minute would otherwise replace each other silently, and the survivor is
  // the one you were not comparing against.
  assert.throws(() => fileRead(root, read, 'H600', WHEN), FileError);
});
