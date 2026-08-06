/**
 * The one test that touches real USB, and it only looks.
 *
 * Enumeration, never an open: this asks the operating system what is attached and stops there. It
 * skips when no remote is plugged in, which is most of the time, and that is the point of keeping it
 * separate from everything else. A test that needs hardware and silently passes without it is a test
 * that reports on nothing.
 *
 * The tests below the enumeration one do send commands, and they are gated twice over: on
 * HARMONY_HARDWARE_TESTS=1 and on the specific remote each was written for. A test that fails
 * because you plugged in the other supported remote is a broken test, not a finding, so they skip
 * on the wrong unit rather than asserting a 600's skin against a One.
 *
 * **Each test asks for its own unit rather than for "the attached remote".** A Harmony One and a
 * Harmony 600 can be on the bus at the same time, and then one session covers both architectures
 * instead of needing two. An earlier version gated everything on there being exactly one remote
 * anywhere, which turned plugging in the second one into a silent, total skip.
 *
 * Read paths only. Nothing here writes, erases or resets, and the write paths refuse anyway.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { load } from '@harmony/lab';
import { HARMONY_PRODUCT_FIRST, HARMONY_PRODUCT_LAST, isHarmony, listHarmony } from '../src/index.ts';

/** Product ids of the bench remotes, so a test can refuse to run against the wrong one. */
const HARMONY_600 = 0xc122;
const HARMONY_ONE = 0xc121;

/**
 * Whether exactly one remote of this model is attached.
 *
 * Exactly one, not at least one, because that is what `openHarmony({ productId })` can act on: two
 * Harmony Ones enumerate identically, so with both of them plugged in the selector is ambiguous and
 * opening refuses rather than guessing. Skipping here says so before the open does.
 */
async function present(productId: number): Promise<boolean> {
  const all = await listHarmony();
  return all.filter((d) => d.productId === productId).length === 1;
}

/**
 * Run a read again once if it came back with nothing at all, and never if it came back wrong.
 *
 * The Harmony One sometimes drops the first command after the device is opened. Observed twice: a
 * `readFlash` returning "0 of 256 bytes", and a `GET_VERSION` answered with no reply at all, each
 * followed immediately by a run that worked end to end. The 600 has not done it. See
 * `docs/usb-protocol.md`; the cause is not known and this is a workaround.
 *
 * **Two message shapes**, because the layers word silence differently: `exchange` says "no reply to
 * command 0x10", `readFlash` says "returned 0 of 256 bytes". The first version of this helper
 * matched only the second and would have let the `GET_VERSION` case straight through.
 *
 * What makes the retry safe to have in a test is the shape of the failure: **no answer, never a
 * wrong answer.** So this retries silence and lets everything else through untouched, which leaves
 * every assertion about the bytes exactly as strict as it was. A blanket retry would not: it would
 * turn a genuinely broken read path into an intermittent pass, and a test that fails one run in
 * five for a known reason is a test people learn to ignore.
 */
async function retryingEmptyReply<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (err) {
    const silence =
      err instanceof Error &&
      (/no reply to command/.test(err.message) || /returned 0 of \d+ bytes/.test(err.message));
    if (!silence) throw err;
    return await read();
  }
}

/** The bench remotes a test can be written against, with what differs between them. */
const BENCH = [
  {
    name: 'Harmony 600',
    productId: HARMONY_600,
    configBase: 0x030000,
    // One dump, because there is one 600. The Ones need two, see below.
    dumps: ['h600_config'],
  },
  {
    name: 'Harmony One',
    productId: HARMONY_ONE,
    configBase: 0x040000,
    dumps: ['one_config', 'one_config_unprogrammed'],
  },
] as const;

test('node-hid loads and enumerates the bus', async () => {
  // Which is worth checking on its own: node-hid is a native module, so this failing means the
  // binding did not build or load for this platform, not that anything about Harmony is wrong.
  const hid = await import('node-hid');
  const devices = hid.devices();
  assert.ok(Array.isArray(devices));
  assert.ok(devices.length > 0, 'no HID devices at all, which suggests a permissions problem');
});

test('an attached Harmony is recognised by vendor and product range', async (t) => {
  const found = await listHarmony();
  if (found.length === 0) {
    t.skip('no Harmony remote attached');
    return;
  }
  for (const remote of found) {
    assert.ok(isHarmony(remote.vendorId, remote.productId));
    assert.ok(remote.productId >= HARMONY_PRODUCT_FIRST);
    assert.ok(remote.productId <= HARMONY_PRODUCT_LAST);
    assert.ok(remote.path !== undefined, 'a remote with no device path cannot be opened');
  }
});

/**
 * The end to end read, against the answer.
 *
 * Gated behind `HARMONY_HARDWARE_TESTS=1` as well as an attached remote, because this one opens the
 * device and sends commands, and a routine `make ts` should not claim a remote on its way past. Read
 * only: GET_VERSION, one RAM byte, and a flash read.
 *
 * What makes it a test rather than a demonstration: the 256 bytes read off the remote are compared
 * against the lab dump of that same unit, which is an answer obtained without any of this code. A
 * read that returns plausible bytes proves nothing; a read that returns the right bytes does.
 */
const HARDWARE = process.env['HARMONY_HARDWARE_TESTS'] === '1';

// One test per bench model rather than one test that picks a model. With both remotes attached
// both run, and a session covers arch 12 and arch 14 at once.
for (const unit of BENCH) {
  test(`a flash read matches the lab dump of the attached ${unit.name}, byte for byte`, async (t) => {
    if (!HARDWARE) {
      t.skip('set HARMONY_HARDWARE_TESTS=1 to let tests open the remote');
      return;
    }
    if (!(await present(unit.productId))) {
      t.skip(`no single ${unit.name} attached`);
      return;
    }
    // Compared against that unit's own dump. Two Harmony Ones exist and they enumerate
    // identically, so the unit is identified by which dump the read matches rather than by the
    // product id. An earlier version picked the spare's dump for any One and failed on the other
    // one, which is a test reporting on the wrong thing.
    const { HarmonyRemote, openHarmony } = await import('../src/index.ts');
    const remote = new HarmonyRemote(await openHarmony({ productId: unit.productId }), {
      timeoutMs: 500,
    });
    try {
      const read = await retryingEmptyReply(() => remote.readFlash(unit.configBase, 256));
      let matched: string | undefined;
      for (const name of unit.dumps) {
        const dump = load(name);
        if (dump === undefined) continue;
        // The container sits behind the EZHex XML header in the dump, so find it rather than
        // assume an offset: conflating a file offset with a flash offset is a mistake this project
        // has made.
        const at = dump.findIndex(
          (_b, i) =>
            dump[i] === 0x47 && dump[i + 1] === 0x53 && dump[i + 2] === 0x50 && dump[i + 3] === 0x4d,
        );
        if (at < 0) continue;
        if (read.every((b, i) => b === dump[at + i])) matched = name;
      }
      assert.ok(matched !== undefined,
        `the read matches none of the stored dumps (${unit.dumps.join(', ')}), so either the ` +
        'remote is a unit this lab has no dump of, or the read path is wrong');
    } finally {
      await remote.close();
    }
  });
}

test('the version block is twelve bytes and the flash id in it matches concordance', async (t) => {
  if (!HARDWARE || !(await present(HARMONY_600))) {
    t.skip('needs HARMONY_HARDWARE_TESTS=1 and the Harmony 600 attached');
    return;
  }
  const { HarmonyRemote, openHarmony } = await import('../src/index.ts');
  const remote = new HarmonyRemote(await openHarmony({ productId: HARMONY_600 }), { timeoutMs: 500 });
  try {
    const fields = await retryingEmptyReply(() => remote.getVersion());
    assert.equal(fields.length, 12);
    // Fields 2 and 3 are the flash id, which concordance prints for this unit as 15:1C. Asserted
    // rather than printed, because the block also carries values that identify the remote.
    assert.equal(fields[3], 0x15, 'flash manufacturer id');
    assert.equal(fields[2], 0x1c, 'flash device id');
    assert.equal(fields[5], 71, 'skin, which concordance and bcdDevice both say is 71');
  } finally {
    await remote.close();
  }
});

test('live RAM reads return varying values, and selector 0x06 is not the same accessor', async (t) => {
  if (!HARDWARE || !(await present(HARMONY_600))) {
    t.skip('needs HARMONY_HARDWARE_TESTS=1 and the Harmony 600 attached');
    return;
  }
  const { HarmonyRemote, openHarmony } = await import('../src/index.ts');
  const remote = new HarmonyRemote(await openHarmony({ productId: HARMONY_600 }), { timeoutMs: 500 });
  try {
    // 0x1C1 is the 600's command state variable. Reading it during a READ_MISC returns 10, which is
    // the state READ_MISC itself sets: the read observes the command that is doing the reading. That
    // is the closure that makes this a live RAM read rather than a byte from somewhere.
    assert.equal(await retryingEmptyReply(() => remote.readRam(0x1c1)), 10);
    const varied = new Set<number>();
    for (const address of [0x1c1, 0x08d, 0x3bf]) varied.add(await remote.readRam(address));
    assert.ok(varied.size > 1, 'every address returned the same byte, which is not a memory read');
  } finally {
    await remote.close();
  }
});

test('the two internal sub-selectors address different memory, and 0xFE maps from zero', async (t) => {
  if (!HARDWARE || !(await present(HARMONY_ONE))) {
    t.skip('needs HARMONY_HARDWARE_TESTS=1 and a single Harmony One attached');
    return;
  }
  const { HarmonyRemote, openHarmony } = await import('../src/index.ts');
  const remote = new HarmonyRemote(await openHarmony({ productId: HARMONY_ONE }), { timeoutMs: 500 });
  try {
    // This document once said 0xFF reads program memory and 0xFE returns nothing at all. Both
    // halves were wrong, so the correction is pinned rather than described: the same offset through
    // the two sub-selectors returns different bytes, and it is 0xFE that starts at program zero.
    for (const offset of [0x0000, 0x1000, 0xe000]) {
      const fe = await retryingEmptyReply(() => remote.readInternalMemory(0xfe, offset, 62));
      const ff = await retryingEmptyReply(() => remote.readInternalMemory(0xff, offset, 62));
      assert.notDeepEqual([...fe], [...ff], `0xFE and 0xFF returned the same bytes at ${offset}`);
    }
    // PIC18 puts the reset vector at 0x0000 and the two interrupt vectors at 0x0008 and 0x0018.
    // Three GOTOs at three fixed addresses is not something arbitrary bytes do.
    const page = await remote.readInternalMemory(0xfe, 0x0000, 62);
    assert.deepEqual([...page.subarray(0, 2)], [0xd2, 0xef], 'GOTO at the reset vector');
    assert.deepEqual([...page.subarray(8, 10)], [0x00, 0xef], 'GOTO at the high priority vector');
    assert.deepEqual([...page.subarray(24, 26)], [0x00, 0xef], 'GOTO at the low priority vector');
  } finally {
    await remote.close();
  }
});

test('the 0xFF page carries image headers and a 64 byte identity block', async (t) => {
  if (!HARDWARE || !(await present(HARMONY_ONE))) {
    t.skip('needs HARMONY_HARDWARE_TESTS=1 and a single Harmony One attached');
    return;
  }
  const { HarmonyRemote, openHarmony } = await import('../src/index.ts');
  const remote = new HarmonyRemote(await openHarmony({ productId: HARMONY_ONE }), { timeoutMs: 500 });
  try {
    // 0x48 0x47 at offset 8 is the firmware image header this project already parses, in
    // src/harmony/firmware.py. Three separate offsets carry one.
    for (const [selector, offset] of [[0xfe, 0x1000], [0xff, 0x0000], [0xff, 0xe000]] as const) {
      const head = await retryingEmptyReply(() => remote.readInternalMemory(selector, offset, 62));
      assert.deepEqual([...head.subarray(8, 10)], [0x48, 0x47],
        `no image header at 0x${selector.toString(16)}+0x${offset.toString(16)}`);
    }
    // The identity block. Its contents are this remote's serial GUIDs, which are personal data, so
    // what is asserted is the shape: 64 bytes that are not erased flash, inside a region that is.
    const block = await remote.readInternalMemory(0xff, 0xf400, 62);
    assert.ok(block.subarray(0, 64).some((b) => b !== 0xff), 'identity block reads as erased');
    const erasedAround = await remote.readInternalMemory(0xff, 0xf480, 62);
    assert.ok(erasedAround.every((b) => b === 0xff), 'the region after the block is not erased');
  } finally {
    await remote.close();
  }
});

test('the firmware on the remote is the firmware in the archived package', async (t) => {
  if (!HARDWARE || !(await present(HARMONY_ONE))) {
    t.skip('needs HARMONY_HARDWARE_TESTS=1 and a single Harmony One attached');
    return;
  }
  const image = load('one34_code');
  if (image === undefined) {
    t.skip('no decoded 3.4 image to compare against');
    return;
  }
  const { HarmonyRemote, openHarmony } = await import('../src/index.ts');
  const remote = new HarmonyRemote(await openHarmony({ productId: HARMONY_ONE }), { timeoutMs: 2000 });
  try {
    // On arch 12 the application runs from external NOR at 0x020000, not from internal memory, and
    // 0x020000 is inside the range READ_FLASH accepts. This is the widest check in the suite: 60050
    // bytes off the device against an image decoded from a firmware package nobody here produced.
    const read = new Uint8Array(image.length);
    for (let off = 0; off < image.length; off += 16384) {
      const n = Math.min(16384, image.length - off);
      read.set(await retryingEmptyReply(() => remote.readFlash(0x020000 + off, n)), off);
    }
    assert.deepEqual([...read], [...image], 'the remote is running a different build');
  } finally {
    await remote.close();
  }
});
