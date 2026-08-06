/**
 * The read pipeline, against a fake remote serving a real config.
 *
 * The fake is not a stub that returns what the code wants: it holds an actual config out of the lab
 * corpus, mapped at the address the real remote would map it at, and answers `readFlash` out of
 * that. So the test exercises the arithmetic that matters, which is working out how much to read
 * before reading it, and it can assert the thing hardware cannot easily be asked: exactly which
 * addresses were requested.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { decodePayload, parse } from '@harmony/codec';
import { load, skipUnless } from '@harmony/lab';

import {
  DEFAULT_CHUNK_BYTES,
  HEADER_PROBE,
  parseHeader,
  profileFor,
  ReadError,
  readConfig,
  type ConfigReader,
  type RemoteProfile,
} from '../src/index.ts';

const ONE = 0xc121;
const H600 = 0xc122;

/** A remote whose config flash holds `config` at `profile.configBase`, and nothing else. */
function fakeRemote(config: Uint8Array, profile: RemoteProfile, versionBlock = new Uint8Array(12)) {
  const asked: Array<{ address: number; count: number }> = [];
  const reader: ConfigReader = {
    async getVersion() {
      return versionBlock;
    },
    async readFlash(address, count) {
      asked.push({ address, count });
      const at = address - profile.configBase;
      if (at < 0) throw new Error(`read below the config base: 0x${address.toString(16)}`);
      // Erased flash past the end of the container, which is what a real remote returns.
      const out = new Uint8Array(count).fill(0xff);
      out.set(config.subarray(at, Math.min(at + count, config.length)));
      return out;
    },
  };
  return { reader, asked, total: () => asked.reduce((sum, a) => sum + a.count, 0) };
}

function configOf(name: string): Uint8Array {
  return decodePayload(load(name) as Uint8Array).payload;
}

test('the two bench models have a config base and everything else is refused', () => {
  assert.equal(profileFor(ONE).configBase, 0x040000);
  assert.equal(profileFor(ONE).architecture, 12);
  assert.equal(profileFor(H600).configBase, 0x030000);
  assert.equal(profileFor(H600).architecture, 14);

  // A model nobody here owns is the expected case, not a fault, so the refusal says where to look.
  assert.throws(() => profileFor(0xc11f), (err: Error) => {
    assert.ok(err instanceof ReadError);
    assert.match(err.message, /coverage section/);
    return true;
  });
});

test('end_addr in the header gives the exact length, on both architectures', skipUnless('one_config', 'h600_config'), () => {
  // The arithmetic this whole pipeline rests on: length = end_addr - configBase + 4. Asserted
  // against the two real configs, whose lengths are known independently from the files themselves.
  for (const [name, productId, expected] of [
    ['one_config', ONE, 1672832],
    ['h600_config', H600, 738149],
  ] as const) {
    const config = configOf(name);
    const profile = profileFor(productId);
    const header = parseHeader(config.subarray(0, HEADER_PROBE), profile);
    assert.equal(header.length, expected, name);
    assert.equal(header.length, config.length, `${name}: and that is the whole file`);
  }
});

test('the read is bounded by the config, not by the config region', skipUnless('one_config'), async () => {
  const config = configOf('one_config');
  const profile = profileFor(ONE);
  const { reader, asked, total } = fakeRemote(config, profile);

  const read = await readConfig(reader, profile);

  assert.deepEqual([...read.bytes], [...config], 'the bytes are the config, exactly');
  assert.equal(total(), config.length, 'and not one byte more was requested');

  // The region is 3840 KiB. Reading it whole would be more than twice the work, which at the
  // measured 30 KB/s is minutes rather than seconds.
  const region = profile.configEnd - profile.configBase;
  assert.ok(total() < region / 2, `read ${total()} of a ${region} byte region`);

  assert.equal(asked[0]?.address, profile.configBase);
  assert.equal(asked[0]?.count, HEADER_PROBE, 'the header probe comes first');
  assert.ok(asked.slice(1).every((a) => a.count <= DEFAULT_CHUNK_BYTES));
});

test('progress runs from the header probe to the whole length, and never past it', skipUnless('h600_config'), async () => {
  const config = configOf('h600_config');
  const profile = profileFor(H600);
  const { reader } = fakeRemote(config, profile);

  const seen: number[] = [];
  const read = await readConfig(reader, profile, {
    chunkBytes: 4096,
    onProgress: ({ done, total }) => {
      assert.equal(total, config.length);
      assert.ok(done <= total, 'progress overshot the total');
      seen.push(done);
    },
  });

  assert.equal(seen[0], HEADER_PROBE);
  assert.equal(seen.at(-1), config.length);
  assert.deepEqual(seen, [...seen].sort((a, b) => a - b), 'progress went backwards');
  assert.equal(read.bytes.length, config.length);
});

test('a base address with no container behind it is refused, not read', async () => {
  const profile = profileFor(ONE);
  const { reader, total } = fakeRemote(new Uint8Array(64), profile);
  await assert.rejects(readConfig(reader, profile), (err: Error) => {
    assert.ok(err instanceof ReadError);
    assert.match(err.message, /no container magic/);
    return true;
  });
  assert.equal(total(), HEADER_PROBE, 'it stopped after the probe rather than reading a region of nothing');
});

test('a config whose end marker is missing is not filed', skipUnless('h600_config'), async () => {
  const config = Uint8Array.from(configOf('h600_config'));
  const profile = profileFor(H600);
  // Damage the marker the header promises is there. Everything else about the read still works,
  // which is the point: this is the check that catches a read that drifted rather than one that
  // failed loudly.
  config[config.length - 2] = 0x00;

  const { reader } = fakeRemote(config, profile);
  await assert.rejects(readConfig(reader, profile), (err: Error) => {
    assert.ok(err instanceof ReadError);
    assert.match(err.message, /PTYY at end_addr/);
    assert.match(err.message, /has not been filed/);
    return true;
  });
});

test('an implausible end_addr is refused before any bulk read happens', () => {
  const profile = profileFor(ONE);
  const head = new Uint8Array(HEADER_PROBE);
  head.set([0x47, 0x53, 0x50, 0x4d]); // GSPM
  // end_addr below the base, which would give a negative length.
  head.set([0x00, 0x00, 0x01, 0x00], 4);
  assert.throws(() => parseHeader(head, profile), /implausible length/);
});

test('what came off the fake remote parses as the same container as the file', skipUnless('one_config'), async () => {
  const config = configOf('one_config');
  const profile = profileFor(ONE);
  const { reader } = fakeRemote(config, profile);
  const read = await readConfig(reader, profile);

  const fromRead = parse(read.bytes);
  const fromFile = parse(config);
  assert.equal(fromRead.flashBase, profile.configBase, 'the recovered base agrees with where we read');
  assert.equal(fromRead.endAddr, fromFile.endAddr);
  assert.deepEqual(
    fromRead.sections.map((s) => s.address),
    fromFile.sections.map((s) => s.address),
  );
});
