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
    configNames: () => [],
    loadConfig: () => undefined,
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

test('the inventory view says what a config is for, and needs no remote', skipUnless('one_config'), () => {
  // The composed view sections 120 to 127 add up to, and the reason it lives in the codec with only
  // a projection here: an interface that ordered those readers itself would be a second copy of the
  // order. **No name is asserted.** They are the config owner's own equipment, and this repository is
  // public, so the assertions are about shape: how many devices, that every one is named, that a key
  // sends a code its device has.
  const bench = new Bench(deps({
    configNames: () => ['one_config'],
    loadConfig: (name: string) => (name === 'one_config' ? load('one_config') : undefined),
  }));
  assert.deepEqual(bench.configs(), ['one_config']);
  const view = bench.inventory('one_config');
  assert.equal(view.architecture, 12);
  // The skin a config states is not always the one its remote reports: this file says 59 where the
  // unit reports 54. **It is nameable now**, section 131, because 59 is the European Harmony One, and
  // until 13 August 2026 this assertion read `undefined` and cited section 81's numbering artefact.
  // The bench could not name the model of our own config, which is what that cost.
  assert.equal(view.skin, 59);
  assert.equal(view.model, 'One EMEA');
  assert.equal(view.devices.length, 5);
  assert.equal(view.activities.length, 8);
  for (const device of view.devices) {
    assert.ok(device.name !== undefined, `group ${device.group} is unnamed`);
    assert.ok(device.repeating <= device.codes);
    // A period is milliseconds to one decimal, and a code that repeats does so in tens of them.
    for (const period of device.repeatMs) assert.ok(period > 20 && period < 2000, String(period));
  }
  for (const activity of view.activities) {
    assert.ok(activity.devices.length >= 1, `activity ${activity.activity} drives nothing`);
    for (const group of activity.devices) assert.ok(group < view.devices.length);
  }
  assert.equal(view.keys.length, 461, 'keys that send a code in the config the bench inspects');
  for (const key of view.keys) {
    const device = view.devices[key.group];
    assert.ok(device !== undefined && key.code < device.codes, `key ${key.scan} names a missing code`);
    assert.ok(key.sends >= 1);
  }
  // The one thing this view exists to show that no other reader does: a held key's repeat interval,
  // present for some keys and absent for others, in the same table.
  assert.ok(view.keys.some((key) => key.repeatMs !== undefined), 'some keys repeat');
  assert.ok(view.keys.some((key) => key.repeatMs === undefined), 'and some do not');
  // And the labels, section 128, which is what makes the table read as a remote rather than as a list
  // of indices. On a Harmony One every one of them is stated by the hit map, so a `row` here would mean
  // the touch route had stopped answering.
  // Over the screen keys, since a hard key sits on the keypad and no screen names it.
  const soft = view.keys.filter((key) => key.where === 'page');
  const labelled = soft.filter((key) => key.label !== undefined);
  // The counts, because the comment above says "every one of them" and a share above 0.95 does not:
  // six of the 241 screen keys of this config carry no label, and those six are the interesting half.
  // A share also hides which side moved, so a route that stopped answering for six more keys and one
  // that gained six pages read the same.
  assert.deepEqual([labelled.length, soft.length], [235, 241], `${labelled.length} of ${soft.length}`);
  for (const key of labelled) {
    assert.equal(key.labelSource, 'touch');
    assert.ok((key.label as string).trim().length > 0);
  }
});

test('the biggest config in the lab is inspected in well under a second',
  skipUnless('h700_config'), () => {
    // **A timing test, deliberately, and the reason is that nothing else here can see this defect.**
    // The `pages` view called `activities` inside its per page loop, so a Harmony 700 config with 289
    // pages ran the four hop activity chain 289 times and took 15.6 seconds to inspect. Every
    // assertion in this file still passed: the view was correct, it was just useless, because a click
    // that takes fifteen seconds with no indication reads as a click that did nothing. That is how it
    // was found, by using the bench.
    //
    // The ceiling is coarse on purpose. It is roughly seven times the measured 0.4 seconds, so it says
    // nothing about a slow machine or a cold cache and everything about an accidental quadratic, which
    // is the only failure mode worth a wall clock assertion.
    const bench = new Bench(deps({
      configNames: () => ['h700_config'],
      loadConfig: (name: string) => (name === 'h700_config' ? load('h700_config') : undefined),
    }));
    const started = performance.now();
    const view = bench.inventory('h700_config');
    const took = performance.now() - started;
    // The work is real, so this is not passing by returning nothing: the sample has 289 mode pages and
    // the view has to reach every one of them.
    assert.equal(view.pages.length, 289, 'pages in that config');
    assert.equal(view.activities.length, 5, 'and its activities');
    assert.ok(took < 3000, `inspecting one config took ${Math.round(took)}ms`);
  });

test('a screen key on a 525 is labelled by its row, and the page can say so',
  skipUnless('h525_config'), () => {
    // The other route, and the reason the view carries the source rather than only the text: on
    // everything but a Harmony One the label comes from the measured screen rows, section 128, which is
    // a reading of where the keys are rather than something the config states. The page dims it for
    // exactly that reason, so a caller that dropped the field would silently present the two as equal.
    const bench = new Bench(deps({
      configNames: () => ['h525_config'],
      loadConfig: (name: string) => (name === 'h525_config' ? load('h525_config') : undefined),
    }));
    const view = bench.inventory('h525_config');
    const labelled = view.keys.filter((key) => key.label !== undefined);
    // Every screen key, which is what `> 50` was standing in front of: 130 of this config's keys are
    // bound by a mode page and all 130 are labelled, so the floor was under a fifth of the figure and
    // a route that lost half of them would have passed. The other 92 are keypad keys, and the loop
    // below is what says they carry no label.
    const soft = view.keys.filter((key) => key.where === 'page');
    assert.deepEqual([labelled.length, soft.length, view.keys.length], [130, 130, 222]);
    for (const key of labelled) assert.equal(key.labelSource, 'row');
    // A hard key is not labelled at all, since no screen names the keys around it.
    for (const key of view.keys) {
      if (key.where === 'set') assert.equal(key.label, undefined, `scan ${key.scan}`);
    }
  });

test('a config whose skin the table knows names its model', skipUnless('h525_config'), () => {
  // The contrast with the assertion above, and the reason the view carries both fields: a Harmony
  // 525's config states the skin its remote reports, so the lookup succeeds there and fails on the
  // One. Showing the number either way is what keeps the page honest about which happened.
  const bench = new Bench(deps({ loadConfig: () => load('h525_config') }));
  const view = bench.inventory('h525_config');
  assert.equal(view.skin, 22);
  assert.equal(view.model, '525');
  assert.equal(view.architecture, 9);
});

test('a screen is drawn on the way out, with no file anywhere', skipUnless('one_config'), () => {
  // What the renderer buys the product, section 129: a config is bytes, and a picture of one of its
  // screens is a function of those bytes. So this asserts the image is a PNG of the display's own size
  // and that the bench never writes one, which is what makes it usable on a config just read off a
  // remote.
  const bench = new Bench(deps({
    configNames: () => ['one_config'],
    loadConfig: (name: string) => (name === 'one_config' ? load('one_config') : undefined),
  }));
  const drawn = bench.screen('one_config', 45);
  assert.equal(drawn.width, 176, 'a Harmony One display');
  assert.equal(drawn.height, 220);
  assert.deepEqual([...drawn.png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  // The IHDR body starts at byte 16 and states the size, which is the cheapest check that the encoder
  // and the raster agree.
  const view = new DataView(drawn.png.buffer, drawn.png.byteOffset);
  assert.equal(view.getUint32(16), 176);
  assert.equal(view.getUint32(20), 220);
  assert.ok(drawn.pictures > 0 && drawn.strings > 0, 'and the page has something on it');
  assert.throws(() => bench.screen('one_config', 99999), /no page/);
});

test('a page that switches on the state of the remote offers every appearance it has',
  skipUnless('one_config'), () => {
    // Section 129's variant walk through the bench, and what the interface must not do is show one of
    // several and stay quiet about it. A Harmony One page that branches has more than one entry, each
    // with its condition in words, and a page that does not has exactly one with no condition at all.
    const bench = new Bench(deps({
      configNames: () => ['one_config'],
      loadConfig: (name: string) => (name === 'one_config' ? load('one_config') : undefined),
    }));
    const branching = bench.variants('one_config', 55);
    assert.equal(branching.truncated, false);
    assert.ok(branching.variants.length > 1, 'this page branches');
    for (const variant of branching.variants) {
      assert.ok(variant.conditions.length >= 1, `variant ${variant.index} states no condition`);
      // A condition names a variable and a value, and the variable is named where the config names it.
      for (const condition of variant.conditions) assert.match(condition, /(=|to) \d+$/);
    }
    // The images differ, which is the whole reason for offering the choice.
    const first = bench.screen('one_config', 55, 0);
    const second = bench.screen('one_config', 55, 1);
    assert.notDeepEqual([...first.png], [...second.png], 'two variants that draw the same thing');

    const plain = bench.variants('one_config', 0);
    assert.deepEqual(plain.variants, [{ index: 0, conditions: [] }]);
    assert.throws(() => bench.screen('one_config', 55, 99), /no variant/);
  });

test('a config the lab does not have is refused rather than answered emptily', () => {
  const bench = new Bench(deps());
  assert.throws(() => bench.inventory('nothing_like_this'), /no config called/);
});

test('no field label states a value that a remote on this bench contradicts', () => {
  // Field 6 read "constant 0x0C on every remote seen", and it had been false since 8 August 2026:
  // the bench Harmony 525 reports 0x09, section 76. Field 6 names a **platform**, section 116, with
  // arch 12 (Harmony One) and arch 14 (Harmony 600 and 700) sharing one, so no single value is
  // right for it. The Harmony 525 enumerates on this machine, so the page was printing 9 beside a
  // label saying it is always 0x0C, and `make facts` cannot see prose living inside code.
  // Section 139.
  assert.equal(VERSION_FIELDS[6], 'platform');
  // The general form, which is what stops the next one: a label is a name, not a measurement. No
  // label may quote a byte value, since a value that holds on the remotes seen so far is exactly
  // the claim a new remote refutes, and the label is then wrong on the screen with nothing to say
  // so.
  // Fields 8 and 9 carry an **address**, which is a place and not a measurement of what the byte
  // holds, so they are the named exception rather than a gap in the rule.
  const NAMES_A_PLACE = new Set([8, 9]);
  for (const [index, label] of VERSION_FIELDS.entries()) {
    if (label === undefined) continue;
    if (!NAMES_A_PLACE.has(index)) {
      assert.doesNotMatch(label, /0x[0-9a-f]+/i, `field ${index} states a value: ${label}`);
    }
    assert.doesNotMatch(label, /\bevery remote\b|\balways\b|\bconstant\b/i, `field ${index}: ${label}`);
  }
  assert.equal(VERSION_FIELDS[8], 'version of the image at 0xFF +0xE000');
  assert.equal(VERSION_FIELDS[9], 'version of the image at 0xFF +0x0000');
});
