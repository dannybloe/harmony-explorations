/**
 * The bench operations, against a fake remote and a temporary lab.
 *
 * No hardware and no server: the dependencies are injected, so what is exercised here is the
 * behaviour the page depends on, including the two things that are safety properties rather than
 * features. An unknown model is reported rather than thrown, and every command that reaches a
 * remote lands in the log.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { decodePayload } from '@harmony/codec';
import { load, skipUnless } from '@harmony/lab';

import { Bench, VERSION_FIELDS, type BenchDeps, type OpenRemote } from '../src/index.ts';

const ONE = 0xc121;
const H600 = 0xc122;
const WHEN = new Date('2026-08-06T12:00:00.000Z');
const VERSION_600 = [0x02, 0x11, 0x1c, 0x15, 0xe0, 0x47, 0x0c, 0x02, 0x00, 0x00, 0x02, 0x02];

function deps(overrides: Partial<BenchDeps> = {}): BenchDeps {
  return {
    async listRemotes() {
      return [];
    },
    async openRemote() {
      throw new Error('no remote in this fixture');
    },
    labRoot: () => undefined,
    now: () => WHEN,
    ...overrides,
  };
}

/** A remote holding one real config at the address the hardware would map it at. */
function remoteHolding(config: Uint8Array, configBase: number, closed: { count: number }): OpenRemote {
  return {
    async getVersion() {
      return Uint8Array.from(VERSION_600);
    },
    async readFlash(address, count) {
      const out = new Uint8Array(count).fill(0xff);
      out.set(config.subarray(address - configBase, Math.min(address - configBase + count, config.length)));
      return out;
    },
    async close() {
      closed.count += 1;
    },
  };
}

test('a model with no config base is listed rather than hidden or thrown', async () => {
  const bench = new Bench(
    deps({
      async listRemotes() {
        return [
          { productId: ONE, product: 'Harmony Remote 0-3.4.0', path: 'p1' },
          { productId: 0xc11f, product: 'Something else', path: 'p2' },
        ];
      },
    }),
  );
  const remotes = await bench.remotes();
  assert.equal(remotes.length, 2);
  assert.equal(remotes[0]?.known, true);
  assert.equal(remotes[0]?.architecture, 12);
  // Two architectures are covered of at least eleven, so an unrecognised remote is the expected
  // case. Showing it and saying it cannot be read beats pretending it is not attached.
  assert.equal(remotes[1]?.known, false);
  assert.equal(remotes[1]?.architecture, undefined);
  assert.equal(remotes[1]?.product, 'Something else');
});

test('the version block is named where a name has been earned and numbered where it has not', async () => {
  const closed = { count: 0 };
  const bench = new Bench(
    deps({
      async openRemote() {
        return remoteHolding(new Uint8Array(0), 0, closed);
      },
    }),
  );
  const identity = await bench.identify(H600);

  assert.deepEqual(identity.fields, VERSION_600);
  assert.equal(identity.named[3]?.name, 'flash manufacturer id');
  assert.equal(identity.named[5]?.name, 'skin');
  // Five fields are still unplaced, and the screen says so rather than inventing labels.
  assert.equal(identity.named[7]?.name, undefined);
  assert.equal(identity.named[10]?.name, undefined);
  assert.equal(VERSION_FIELDS.filter((f) => f === undefined).length, 3);

  assert.equal(closed.count, 1, 'the device is closed even on the happy path');
});

test('every command that reaches a remote lands in the log, including the ones that fail', async () => {
  const bench = new Bench(
    deps({
      async openRemote() {
        return {
          async getVersion() {
            throw new Error('no reply to command 0x10');
          },
          async readFlash() {
            throw new Error('unreachable');
          },
          async close() {},
        };
      },
    }),
  );
  await assert.rejects(bench.identify(H600), /no reply/);
  assert.equal(bench.log.length, 1);
  assert.equal(bench.log[0]?.what, 'GET_VERSION');
  assert.equal(bench.log[0]?.outcome, 'failed');
  assert.equal(bench.log[0]?.at, WHEN.toISOString());
});

test('a read files the config and reports the container', skipUnless('h600_config'), async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'harmony-bench-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const config = decodePayload(load('h600_config') as Uint8Array).payload;
  const closed = { count: 0 };
  const bench = new Bench(
    deps({
      labRoot: () => root,
      async openRemote() {
        return remoteHolding(config, 0x030000, closed);
      },
    }),
  );

  const seen: number[] = [];
  const result = (await bench.read(H600, 'H600', ({ done }) => seen.push(done))) as Record<string, any>;

  assert.equal(result['bytes'], config.length);
  assert.equal(result['container'].architecture, 14);
  assert.equal(result['container'].pointer_count, 20);
  assert.equal(Object.values(result['container'].checks).every(Boolean), true);
  assert.equal(seen.at(-1), config.length, 'progress ran to the end');
  assert.equal(readdirSync(join(root, 'reads')).length, 2, 'the config and its sidecar');
  assert.equal(closed.count, 1);

  assert.equal(bench.log.length, 1);
  assert.equal(bench.log[0]?.what, 'READ_FLASH');
  assert.match(bench.log[0]?.detail ?? '', /filed as .*-h600-config\.bin/);
});

test('a read with nowhere to file it refuses before opening the device', async () => {
  let opened = 0;
  const bench = new Bench(
    deps({
      labRoot: () => undefined,
      async openRemote() {
        opened += 1;
        throw new Error('should not get here');
      },
    }),
  );
  await assert.rejects(bench.read(H600, 'x'), /no lab directory/);
  assert.equal(opened, 0, 'an irreplaceable device is not claimed to then fail on a directory');
});
