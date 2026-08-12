/**
 * The page in a real browser, because testing the routes is not testing the page.
 *
 * **This exists because of a bug the route tests could not see.** The drawn screens were served
 * correctly, `curl` fetched them, every server test passed, and every image in the browser was broken:
 * the page's content security policy listed `script-src`, `style-src` and `connect-src` and no
 * `img-src`, so `default-src 'none'` blocked them. A policy is enforced by the browser and by nothing
 * else, so only a browser can check it. The same run also catches an empty picker, a dead click and a
 * script error, none of which a fetch of an endpoint would notice.
 *
 * It drives **the Chrome that is already installed** rather than a downloaded browser: `playwright`'s
 * install step is deliberately not approved in `pnpm-workspace.yaml`, so nothing was fetched at install
 * time, and this skips cleanly where there is no Chrome to drive. That keeps a page test from becoming
 * a reason to run somebody else's postinstall script.
 *
 * Not part of `make ts`: it needs `HARMONY_PAGE_TESTS=1`, or `make page`, for the same reason the
 * hardware tests are gated. A browser launch is seconds, and a suite that is slow stops being run.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import type { AddressInfo } from 'node:net';

import { chromium, type Browser } from 'playwright';
import { LAB, load } from '@harmony/lab';

import { Bench, type BenchDeps } from '../src/bench.ts';
import { HOST, createServer } from '../src/server.ts';

/** The page itself, which is what this test is about, so it is served from the source tree. */
const WEB_ROOT = new URL('../web', import.meta.url).pathname;

/**
 * What the page's own objects look like from here.
 *
 * The browser callbacks run in the browser, and this package's TypeScript has no DOM library on
 * purpose: it is Node code, and pulling `dom` in would let a server file reference `window` and
 * typecheck. So the few properties this test reads are declared, and the conditions it waits for are
 * written as expressions the browser evaluates.
 */
interface ImageNode {
  naturalWidth: number;
}

/** Chrome as macOS and Linux install it. No download, so no browser means no test. */
const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

const enabled = process.env['HARMONY_PAGE_TESTS'] === '1';
const chrome = CHROME.find((path) => existsSync(path));
const sample = 'one_config';
const skip = !enabled
  ? { skip: 'set HARMONY_PAGE_TESTS=1 to drive a browser' }
  : chrome === undefined
    ? { skip: 'no Chrome to drive, and no browser is downloaded on purpose' }
    : LAB === undefined || load(sample) === undefined
      ? { skip: `no ${sample} in the lab` }
      : {};

/** Poll a condition for a few seconds. Ten seconds is plenty for a local server drawing one screen. */
async function until(ready: () => Promise<boolean>, complaint: string): Promise<void> {
  for (let tries = 0; tries < 100; tries += 1) {
    if (await ready()) return;
    await new Promise((done) => setTimeout(done, 100));
  }
  assert.fail(complaint);
}

/** The real readers against the real lab, with the hardware half stubbed: no remote is touched. */
function deps(): BenchDeps {
  return {
    listRemotes: async () => [],
    openRemote: async () => {
      throw new Error('the page test never opens a remote');
    },
    labRoot: () => LAB,
    now: () => new Date('2026-08-12T12:00:00Z'),
    configNames: () => [sample],
    loadConfig: (name: string) => (name === sample ? load(name) : undefined),
  };
}

test('a click that is working says so, and a click that fails says that', skip, async () => {
  // **The complaint this is the guard on.** Inspecting a Harmony 700 config took 15.6 seconds, because
  // the view called a four hop reader once per mode page, and the page showed nothing while it did, so
  // the report was "no button click does anything". The quadratic has its own test in
  // `bench.test.ts`; this one is about the other half, that a click is visible even when it is slow.
  //
  // The delay is injected here rather than waited for, since the real call is now fast enough that the
  // busy state would be a race: the route is held open, the state is asserted while the request is in
  // flight, and then it is let through. That is also why this test can assert the failure path, which
  // no amount of clicking a working server would reach.
  const server = createServer(new Bench(deps()), WEB_ROOT);
  await new Promise<void>((done) => server.listen(0, HOST, done));
  const { port } = server.address() as AddressInfo;
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ executablePath: chrome as string });
    const page = await browser.newPage();
    let release: (() => void) | undefined;
    await page.route('**/api/inventory', async (route) => {
      await new Promise<void>((go) => { release = go; });
      await route.continue();
    });
    await page.goto(`http://127.0.0.1:${port}/`);
    const status = page.locator('#config-status');

    await page.getByRole('button', { name: 'inspect' }).first().click();
    // While it is in flight: the body says it is busy, the line names the config, and the panel that
    // holds the previous config is down rather than showing one config's devices under another's name.
    await until(async () => (await page.locator('body').getAttribute('data-busy')) === 'inventory',
      'the page never said it was busy');
    assert.match(await status.textContent() ?? '', new RegExp(sample), 'the line does not name it');
    assert.equal(await page.locator('#inventory').isVisible(), false, 'the old panel stayed up');
    // And a second click cannot queue behind the first.
    assert.equal(await page.getByRole('button', { name: 'inspect' }).first().isDisabled(), true);

    release?.();
    await until(async () => (await page.locator('body').getAttribute('data-busy')) === null,
      'the busy state never cleared');
    assert.equal(await status.isVisible(), false, 'the line stayed up after it finished');
    assert.equal(await page.locator('#inventory').isVisible(), true, 'the panel never came back');

    // The failure path: a refused read has to end up on the page rather than in an empty panel.
    await page.unroute('**/api/inventory');
    await page.route('**/api/inventory', (route) =>
      route.fulfill({ status: 404, contentType: 'application/json', body: '{"message":"gone"}' }));
    await page.getByRole('button', { name: 'inspect' }).first().click();
    await until(async () => (await status.textContent() ?? '').includes('gone'),
      'a refused read said nothing');
    assert.equal(await page.locator('body').getAttribute('data-busy'), null, 'still busy after a failure');
  } finally {
    await browser?.close();
    await new Promise<void>((done) => server.close(() => done()));
  }
});

test('the page draws a screen, and the browser is what says so', skip, async () => {
  const server = createServer(new Bench(deps()), WEB_ROOT);
  await new Promise<void>((done) => server.listen(0, HOST, done));
  const { port } = server.address() as AddressInfo;
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ executablePath: chrome as string });
    const page = await browser.newPage();
    // A content security policy violation is a console error and nothing else, so collecting them is
    // the whole mechanism: an empty list is the assertion that the page is not quietly blocked.
    const complaints: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') complaints.push(message.text());
    });
    page.on('pageerror', (error) => complaints.push(String(error)));
    // A failed request is a complaint too, and it names the resource, which a console line does not.
    page.on('requestfailed', (request) => complaints.push(`failed ${request.url()}`));
    page.on('response', (response) => {
      if (!response.ok()) complaints.push(`${response.status()} ${response.url()}`);
    });
    await page.goto(`http://127.0.0.1:${port}/`);

    await page.getByRole('button', { name: 'inspect' }).first().click();
    const picker = page.locator('#screen-page');
    await picker.waitFor();

    // The picker offers every page that binds a key, and the activity pages are in it: taking the list
    // from the key table instead left them out, because an activity key sends no code of its own.
    const options = await picker.locator('option').allTextContents();
    assert.ok(options.length > 100, `only ${options.length} pages offered`);
    assert.ok(options.some((one) => one.includes('starts ')), 'no activity page in the picker');

    // The image has to have actually decoded. `naturalWidth` is zero for a broken one, which is what a
    // blocked image looks like, and the display of a Harmony One is 176 pixels across.
    const image = page.locator('#screen');
    await image.waitFor();
    const width = async (): Promise<number> =>
      image.evaluate((node) => (node as unknown as ImageNode).naturalWidth);
    // Polled with a passed function rather than `waitForFunction`, which evaluates a string and needs
    // `unsafe-eval`: the page's own policy forbids that, and a test that had to relax the policy to run
    // would be testing a page nobody uses. Found by removing `img-src` to check this test fails, which
    // it did, for the wrong reason.
    await until(async () => (await width()) > 0, 'the image never decoded');
    assert.equal(await width(), 176, 'the drawn screen is not a Harmony One display');

    // The keys of that page are listed beside it, with labels rather than indices.
    const keys = await page.locator('#screen-keys tr').count();
    assert.ok(keys > 1, 'no keys listed beside the screen');

    // A page that switches on the state of the remote offers its appearances, and clicking one draws a
    // different picture. The pages that branch are a minority, so this walks the picker until it finds
    // one rather than hard coding an index that a new config would move.
    let switched = false;
    const values = await picker.locator('option').evaluateAll(
      (nodes) => nodes.map((node) => (node as unknown as { value: string }).value),
    );
    for (const value of values.slice(0, 40)) {
      await picker.selectOption(value);
      const buttons = page.locator('#screen-variants button');
      if ((await buttons.count()) < 2) continue;
      const before = await image.getAttribute('src');
      await buttons.nth(1).click();
      // A new src and a decoded image: the first alone would pass on a broken one.
      await until(async () => (await image.getAttribute('src')) !== before && (await width()) > 0,
        'the variant did not draw');
      const conditions = await buttons.first().textContent();
      assert.match(conditions ?? '', /(=|to) \d+/, 'a variant states no condition');
      switched = true;
      break;
    }
    assert.ok(switched, 'no page with more than one appearance was found in the first forty');

    assert.deepEqual(complaints, [], 'the browser complained, which a fetch would never have shown');
  } finally {
    await browser?.close();
    await new Promise<void>((done) => server.close(() => done()));
  }
});
