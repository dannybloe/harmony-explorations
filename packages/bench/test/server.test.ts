/**
 * The server, started on a real socket and fetched from.
 *
 * Port 0 so the operating system picks a free one and the suite never collides with a bench that
 * somebody left running.
 *
 * The tests that matter most here are the negative ones. A listening port is a concession this
 * project makes for a bench tool, so the shape of what it exposes is a safety property: loopback
 * only, no route that writes, and no way to walk out of the web directory.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';

import { Bench, createServer, HOST, type BenchDeps } from '../src/index.ts';

const WEB_ROOT = fileURLToPath(new URL('../web/', import.meta.url));

function deps(): BenchDeps {
  return {
    async listRemotes() {
      return [{ productId: 0xc122, product: 'Harmony Remote 0-0.2.0', path: 'p' }];
    },
    async openRemote() {
      return {
        async getVersion() {
          return Uint8Array.from([2, 17, 28, 21, 224, 71, 12, 2, 0, 0, 2, 2]);
        },
        async readFlash() {
          throw new Error('not in this fixture');
        },
        async close() {},
      };
    },
    configNames: () => [],
    loadConfig: () => undefined,
    labRoot: () => undefined,
    now: () => new Date('2026-08-06T12:00:00.000Z'),
  };
}

/** `fetch` answers `unknown`, and every assertion below is about a field of the reply. */
async function getJson(url: string, init?: RequestInit): Promise<any> {
  const response = init === undefined ? await fetch(url) : await fetch(url, init);
  return response.json();
}

async function withServer(run: (base: string) => Promise<void>): Promise<void> {
  const server = createServer(new Bench(deps()), WEB_ROOT);
  await new Promise<void>((resolve) => server.listen(0, HOST, resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://${HOST}:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test('it binds to loopback and not to anything else', async () => {
  await withServer(async (base) => {
    const server = new URL(base);
    assert.equal(server.hostname, '127.0.0.1');
    const response = await fetch(`${base}/api/remotes`);
    assert.equal(response.status, 200);
  });
});

test('the page and its two assets are served, and nothing above them is', async () => {
  await withServer(async (base) => {
    for (const path of ['/', '/app.js', '/app.css']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200, path);
    }
    // The process can see the whole lab directory, so a path that climbs out of the web root is
    // the difference between a bench tool and a file server for somebody's config dumps.
    for (const path of ['/../src/server.ts', '/..%2f..%2fpackage.json', '/../../../etc/hosts']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 404, path);
    }
  });
});

test('the route table is six reads and nothing that writes', async () => {
  await withServer(async (base) => {
    const remotes = await getJson(`${base}/api/remotes`);
    assert.equal(remotes[0].architecture, 14);

    const identity = await getJson(`${base}/api/identify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 0xc122 }),
    });
    assert.equal(identity.fields.length, 12);

    const log = await getJson(`${base}/api/log`);
    assert.equal(log[0].what, 'GET_VERSION');

    // The two config routes need no hardware, and the fixture's lab is empty, so the honest answer
    // is an empty list and a refusal rather than an error.
    assert.deepEqual(await getJson(`${base}/api/configs`), []);
    const missing = await fetch(`${base}/api/inventory`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    assert.equal(missing.status, 400);
    const absent = await fetch(`${base}/api/inventory`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'one_config' }),
    });
    assert.equal(absent.status, 500, 'a config the lab does not have is an error, not an empty view');

    // The screen route is a GET because a browser has to name it in an `img` tag, so it is the one
    // route whose refusals are worth checking here: no name is a 400 and an absent config is a 500,
    // and neither returns an image.
    const noName = await fetch(`${base}/api/screen`);
    assert.equal(noName.status, 400);
    const noConfig = await fetch(`${base}/api/screen?config=one_config&page=0`);
    assert.equal(noConfig.status, 500);
    assert.notEqual(noConfig.headers.get('content-type'), 'image/png');

    const noVariants = await fetch(`${base}/api/variants`);
    assert.equal(noVariants.status, 400);

    // There is no generic command endpoint, which is the rail: a page that is broken, or a script
    // somebody points at this port, cannot express a write because no route accepts one.
    for (const path of ['/api/write', '/api/erase', '/api/command', '/api/writeFlash']) {
      const response = await fetch(base + path, { method: 'POST' });
      assert.equal(response.status, 404, path);
    }
  });
});

test('a read without a label is refused rather than filed under nothing', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/read`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 0xc122, label: '  ' }),
    });
    assert.equal(response.status, 400);
    const body = (await response.json()) as { message: string };
    assert.match(body.message, /label is required/);
  });
});

test('a failing read ends the stream with an error line rather than hanging', async () => {
  await withServer(async (base) => {
    // labRoot is undefined in this fixture, so the read refuses. The page has to be told.
    const response = await fetch(`${base}/api/read`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 0xc122, label: 'x' }),
    });
    assert.equal(response.status, 200, 'the stream opened before the failure was known');
    const lines = (await response.text()).trim().split('\n').map((l) => JSON.parse(l));
    assert.equal(lines.at(-1).type, 'error');
    assert.match(lines.at(-1).message, /no lab directory/);
  });
});
