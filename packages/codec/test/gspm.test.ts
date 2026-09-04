/**
 * The ported container parser, against every sample available.
 *
 * These are the same claims `tests/test_gspm.py` makes, restated against the TypeScript parser:
 * that the base address, the pointer count and the marker position are derived from the data
 * rather than looked up per model. Full behavioural equivalence between the two parsers is a
 * separate matter, and it is proven by the golden vectors rather than by pairs of tests that
 * happen to agree.
 *
 * The two non-GSPM architectures are here on purpose: arch 8 and arch 9 are the samples that
 * could falsify the "one container" claim. They confirm it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { IMAGES, PARSEABLE_EXCLUDED, load, skipUnless, skipWithoutLab, require_ } from '@harmony/lab';
import {
  ACTION_LIST_TABLE_SLOT,
  ARCH_RECORD_SLOT,
  EVENT_NONE,
  EVENT_PRESS,
  CLOCK_RECORD_LENGTH,
  CLOCK_RECORD_SLOT,
  FLASH_BASE_ALIGNMENT,
  MINIMUM_HEADER_LENGTH,
  SECTION_ITEM_SIZE,
  SECTION_TABLE_OFFSET,
  archSlot,
  baseSlot,
  findClockRecords,
  parse,
  recoverFlashBase,
  trailerChecksum,
  TRAILER_CHECKSUM_SEED,
  TRAILER_CHECKSUM_OFFSET,
  type Container,
} from '../src/index.ts';

interface Expectation {
  magic: string;
  base: number;
  version: string;
  slots: number;
  marker: string;
  keys: number;
  /** The architecture, established without reading slot 1: from <PROTOCOL> or from the package. */
  architecture: number;
}

const EXPECTED: Readonly<Record<string, Expectation>> = {
  one_safemode: { magic: 'GSPM', base: 0x002000, version: '1.6', slots: 22, marker: 'LWJL', keys: 2, architecture: 12 },
  one34_region2: { magic: 'GSPM', base: 0x002000, version: '1.6', slots: 22, marker: 'LWJL', keys: 2, architecture: 12 },
  h700_gspm: { magic: 'GSPM', base: 0x020000, version: '1.4', slots: 20, marker: 'LWJL', keys: 0, architecture: 14 },
  // The other two arch 14 safe mode containers, added on 14 August 2026 by decision. They
  // were parsed by every other test in this package and absent from this table, which is the framing
  // claims' population, so those claims covered 13 containers where `tests/test_gspm.py` covered 17.
  // Section 143.
  h600_safemode_gspm: { magic: 'GSPM', base: 0x020000, version: '1.4', slots: 20, marker: 'LWJL', keys: 0, architecture: 14 },
  h650_safemode_gspm: { magic: 'GSPM', base: 0x020000, version: '1.4', slots: 20, marker: 'LWJL', keys: 0, architecture: 14 },
  one_config: { magic: 'GSPM', base: 0x040000, version: '1.6', slots: 22, marker: 'LWJL', keys: 55, architecture: 12 },
  one_config_unprogrammed: { magic: 'GSPM', base: 0x040000, version: '1.6', slots: 22, marker: 'LWJL', keys: 55, architecture: 12 },
  h600_config: { magic: 'GSPM', base: 0x030000, version: '1.4', slots: 20, marker: 'LWJL', keys: 162, architecture: 14 },
  h700_config: { magic: 'GSPM', base: 0x030000, version: '1.4', slots: 20, marker: 'LWJL', keys: 163, architecture: 14 },
  h700_config_2: { magic: 'GSPM', base: 0x030000, version: '1.4', slots: 20, marker: 'LWJL', keys: 163, architecture: 14 },
  h525_config: { magic: 'AHCM', base: 0x020000, version: '1.4', slots: 20, marker: 'CMAH', keys: 0, architecture: 9 },
  // The bench Harmony 525's own config, read over USB, identical in every container field to the
  // published sample from another owner. Section 76.
  h525_config_2: { magic: 'AHCM', base: 0x020000, version: '1.4', slots: 20, marker: 'CMAH', keys: 0, architecture: 9 },
  // And its safe mode container, cut out of the firmware region at flash `0x818000`. Its base is
  // `0x018000`, which is `0x800000` below the address READ_FLASH names, exactly as the user config's
  // `0x020000` is below `0x820000`: two containers, one offset. It is the **fifth** base address in the
  // corpus, and its absence here is why this side reported four while the documents said five.
  h525_safemode_ahcm: { magic: 'AHCM', base: 0x018000, version: '1.4', slots: 20, marker: 'CMAH', keys: 0, architecture: 9 },
  arch8_config_a: { magic: 'TPTP', base: 0x020000, version: '1.5', slots: 21, marker: 'WLWL', keys: 56, architecture: 8 },
  arch8_config_b: { magic: 'TPTP', base: 0x020000, version: '1.5', slots: 21, marker: 'WLWL', keys: 56, architecture: 8 },
  arch8_config_c: { magic: 'TPTP', base: 0x020000, version: '1.5', slots: 21, marker: 'WLWL', keys: 56, architecture: 8 },
  arch8_config_d: { magic: 'TPTP', base: 0x020000, version: '1.5', slots: 21, marker: 'WLWL', keys: 56, architecture: 8 },
};

const NAMES = Object.keys(EXPECTED);

/**
 * The samples that are somebody's actual configuration.
 *
 * The others are containers of the same format with no user assignments in them: the factory config
 * packed inside a firmware image (`h700_gspm`) and four safe mode configs. They have no action lists
 * at all and only some of the pointer array sections, so a claim about "every config" has to mean the
 * twelve. `tests/test_gspm.py` draws the same line.
 *
 * **The list grew on 14 August 2026 and three tests are why it had to.** When `EXPECTED` was widened to
 * the seventeen the Python table already held, the three added safe mode containers arrived on this side
 * of the line and broke `the same six base slots are pointer arrays in every config`, the packing
 * agreement and the action list parse. All three were correct and none of them had ever been asked about
 * a safe mode container: the population was what made them pass. Section 143, and the same shape as the
 * arch 9 safe mode container contradicting six claims when it entered the corpus, sections 77 to 79.
 */
const NOT_A_USER_CONFIG = [
  'h700_gspm',
  'one_safemode',
  'one34_region2',
  'h525_safemode_ahcm',
  'h600_safemode_gspm',
  'h650_safemode_gspm',
];
const USER_CONFIGS = NAMES.filter((n) => !NOT_A_USER_CONFIG.includes(n));

function userConfigs(): Array<{ name: string; container: Container; expected: Expectation }> {
  return everySample().filter((s) => USER_CONFIGS.includes(s.name));
}

/**
 * Every sample, parsed, or a throw naming the one that is missing.
 *
 * **It used to skip whatever was absent and was called `available`**, which is the shape no static
 * rule can see: the loading happens in a helper, so a test looked guarded while quietly asserting
 * over a subset. Every caller is a `skipWithoutLab()` test, and that guard means the claim is about
 * the corpus, so an incomplete lab has to fail rather than shrink the claim. `require_` is what makes
 * that real. Measured on 13 August 2026: with one sample removed from the lab, the codec's tests went
 * from 17 failures to 53.
 */
function everySample(): Array<{ name: string; container: Container; expected: Expectation }> {
  const out: Array<{ name: string; container: Container; expected: Expectation }> = [];
  for (const name of NAMES) {
    out.push({ name, container: parse(require_(name)), expected: EXPECTED[name] as Expectation });
  }
  return out;
}

for (const name of NAMES) {
  const expected = EXPECTED[name] as Expectation;

  test(`${name} parses with the expected shape`, skipUnless(name), () => {
    const c = parse(load(name) as Uint8Array);
    assert.equal(c.family.magic, expected.magic);
    assert.equal(c.flashBase, expected.base, 'recovered flash base');
    assert.equal(c.formatVersion, expected.version);
    assert.equal(c.pointerCount, expected.slots);
    assert.equal(c.marker, expected.marker);
    assert.equal(c.keys.length, expected.keys);
  });

  test(`${name} passes every consistency check`, skipUnless(name), () => {
    const c = parse(load(name) as Uint8Array);
    for (const [check, ok] of Object.entries(c.checks)) {
      assert.ok(ok, `${name} failed check ${check}`);
    }
  });

  test(`${name} derives its pointer count from the marker position`, skipUnless(name), () => {
    // The count is not in the header. It follows from where the marker sits, and this is the
    // arithmetic that says so, restated in the opposite direction from the parser's.
    //
    // The table ends exactly at the marker with no remainder. This assertion used to carry a
    // `+ 3`, which is what an off by one looks like before it is understood: those three bytes
    // are the final item's pointer, not padding. `tests/test_gspm.py` says the same.
    const c = parse(load(name) as Uint8Array);
    assert.equal(c.markerOffset, SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE * expected.slots);
    assert.equal((c.markerOffset - SECTION_TABLE_OFFSET) % SECTION_ITEM_SIZE, 0);
    assert.equal(c.pointerCount, expected.slots);
  });

  test(`${name} carries a zero spare byte in every section item`, skipUnless(name), () => {
    // An item is four bytes and a pointer is three. The spare byte is zero in every section of
    // every sample, which is why reading the item as a four byte pointer produced correct
    // addresses; a nonzero one would have added 0x1000000 silently.
    const c = parse(load(name) as Uint8Array);
    assert.ok(c.sections.every((s) => s.spare === 0));
  });

  test(`${name} states its own architecture in slot 1`, skipUnless(name), () => {
    // The calibration set: every entry's architecture is known from the EZHex header's
    // <PROTOCOL> or from the firmware package the container came out of, so this is slot 1
    // being checked against an answer obtained without reading slot 1.
    const c = parse(load(name) as Uint8Array);
    assert.equal(c.architecture, expected.architecture);
  });
}

test('end_addr locates the end marker', skipWithoutLab(), () => {
  const samples = everySample();
  for (const { name, container: c } of samples) {
    const off = c.endAddr - c.flashBase;
    assert.equal(
      String.fromCharCode(...c.blob.subarray(off, off + 4)),
      c.family.endMarker,
      name,
    );
  }
});

test('the corpus spans more than one of everything', skipWithoutLab(), () => {
  // The count check that used to be here is `everySample`'s job now: it throws with the missing
  // sample's name, which is a better message than a count and covers all seven of its callers
  // rather than this one.
  const samples = everySample();
  assert.equal(samples.length, NAMES.length);
  const distinct = <T>(pick: (s: (typeof samples)[number]) => T) =>
    new Set(samples.map(pick)).size;
  // Exact, and all five floors that stood here were **equal** to the span they measured, which is
  // the shape this project's verification standard calls worse than a loose one: it reads as
  // tolerance and has none. Stated exactly, the span is documented and a sample that widens it moves
  // these numbers in the diff instead of passing silently.
  assert.equal(distinct((s) => s.container.family.magic), 3, 'container cookies');
  assert.equal(distinct((s) => s.container.flashBase), 5, 'base addresses');
  assert.equal(distinct((s) => s.container.formatVersion), 3, 'format versions');
  assert.equal(distinct((s) => s.container.pointerCount), 3, 'table lengths');
  assert.equal(distinct((s) => s.container.architecture), 4, 'architectures');
});

test('the architecture is not derivable from the cookie', skipWithoutLab(), () => {
  // The reason slot 1 is read at all: GSPM covers both arch 12 and arch 14, so a per cookie
  // table would be wrong for one of them.
  const byCookie = new Map<string, Set<number | undefined>>();
  for (const { container: c } of everySample()) {
    const set = byCookie.get(c.family.magic) ?? new Set<number | undefined>();
    set.add(c.architecture);
    byCookie.set(c.family.magic, set);
  }
  const gspm = byCookie.get('GSPM');
  if (gspm === undefined) assert.fail('no GSPM sample present');
  assert.deepEqual([...gspm].sort(), [12, 14]);
});

test('arch 14 records 54 scan codes times three event types', skipWithoutLab(), () => {
  const samples = everySample().filter((s) => s.expected.architecture === 14 && s.container.keys.length > 0);
  assert.ok(samples.length > 0, 'no arch 14 config present');
  for (const { name, container: c } of samples) {
    const byEvent = new Map<number, number[]>();
    for (const k of c.keys) {
      byEvent.set(k.eventType, [...(byEvent.get(k.eventType) ?? []), k.scanCode]);
    }
    const virtual = c.keys.filter((k) => !k.isKeypad);
    for (const [event, scans] of byEvent) {
      if (event === EVENT_NONE) continue;
      assert.deepEqual(
        [...scans].sort((a, b) => a - b),
        Array.from({ length: 54 }, (_, i) => i + 1),
        `${name}: event class 0x${event.toString(16)}`,
      );
    }
    assert.equal(c.keys.length, 54 * 3 + virtual.length, name);
  }
});

test('arch 12 and arch 8 record presses only', skipWithoutLab(), () => {
  const samples = everySample().filter(
    (s) => [8, 12].includes(s.expected.architecture) && s.container.keys.length > 10,
  );
  assert.ok(samples.length > 0, 'no arch 8 or arch 12 config present');
  for (const { name, container: c } of samples) {
    assert.deepEqual(new Set(c.keys.map((k) => k.eventType)), new Set([EVENT_NONE, EVENT_PRESS]), name);
  }
});

test('the same six base slots are pointer arrays in every config', skipWithoutLab(), () => {
  // Recognised by shape, not tabulated: a section is an array when `width + 3 * count` accounts
  // for it exactly. That it picks out the same six base slots in every config, across four
  // architectures with different insertions, is what makes the recognition believable.
  const BASE_SLOTS = [5, 7, 10, 11, 12, 15];
  const configs = userConfigs();
  assert.ok(configs.length > 0, 'no config present');
  for (const { name, container: c } of configs) {
    const found = c.pointerArraySlots.map((slot) => baseSlot(c.architecture as number, slot));
    assert.deepEqual(found, BASE_SLOTS, name);
  }
});

test('every pointer array entry is an address inside the config', skipWithoutLab(), () => {
  const configs = userConfigs();
  assert.ok(configs.length > 0, 'no config present');
  for (const { name, container: c } of configs) {
    for (const slot of c.pointerArraySlots) {
      const entries = c.pointerArray(slot) as number[];
      for (const address of entries) {
        assert.ok(
          address >= c.flashBase && address <= c.endAddr,
          `${name} slot ${slot}: 0x${address.toString(16)} outside the container`,
        );
      }
      assert.deepEqual(entries, [...entries].sort((a, b) => a - b), `${name} slot ${slot} ascends`);
    }
  }
});

test('the action list table and the lists agree on the packing, bar the run boundaries', skipWithoutLab(), () => {
  // The addresses come from the pointer table and the counts come from the lists themselves, so
  // agreement between them is two unrelated parts of the file telling the same story. The exceptions
  // are the boundaries between the runs the lists are packed into, so there are one fewer of them than
  // there are runs: four in eleven of the twelve configs and three in the one with four runs. The title
  // said "bar four" until 14 August 2026, when a twelfth config made that false while the test passed
  // on the number being asserted per config.
  const configs = userConfigs();
  assert.ok(configs.length > 0, 'no config present');
  for (const { name, container: c } of configs) {
    const slot = archSlot(c.architecture as number, ACTION_LIST_TABLE_SLOT);
    if (c.pointerArray(slot) === undefined) continue;
    const [fit, of] = c.actionListPacking();
    // Four boundaries means five runs, and one config has four runs and therefore three: the bench
    // Harmony 525's own config, which `tests/test_gspm.py` gives its own test for. It arrived on this
    // side with the population widening of 14 August 2026 and this claim had never met it, so the
    // exception is named here rather than the title being quietly weakened. Section 143.
    assert.equal(of - fit, name === 'h525_config_2' ? 3 : 4, `${name}: ${fit} of ${of} packed`);
  }
});

test('every action list parses and no list is empty or implausibly long', skipWithoutLab(), () => {
  const configs = userConfigs();
  assert.ok(configs.length > 0, 'no config present');
  for (const { name, container: c } of configs) {
    const lists = c.actionLists();
    assert.ok(lists !== undefined, `${name}: no action lists`);
    assert.ok(
      lists.every((l) => l.length >= 1),
      `${name}: an empty action list`,
    );
    assert.ok(
      Math.max(...lists.map((l) => l.length)) < 32,
      `${name}: implausibly long list`,
    );
  }
});

test('the opcode inventory differs between architectures', skipWithoutLab(), () => {
  // Which is why the arch 9 opcode table published upstream cannot simply be adopted: arch 14's
  // third most common opcode never appears in the arch 9 sample.
  const opcodes = (name: string): Set<number> | undefined => {
    const data = load(name);
    if (data === undefined) return undefined;
    const lists = parse(data).actionLists();
    return lists === undefined ? undefined : new Set(lists.flat().map((i) => i.opcode));
  };
  const h700 = opcodes('h700_config');
  const h525 = opcodes('h525_config');
  if (h700 === undefined || h525 === undefined) return; // covered by the skip on the shape tests
  assert.ok(h700.has(0x6c), 'arch 14 uses opcode 0x6C');
  assert.ok(!h525.has(0x6c), 'arch 9 does not');
  // Exact: 11 of the 20 opcodes a Harmony 525 emits are also emitted by a Harmony 700, which is the
  // shared core. A floor of eight could not tell that from a core of nine.
  assert.equal([...h700].filter((o) => h525.has(o)).length, 11, 'and yet they share a core');
  assert.equal(h700.size, 52, 'the arch 14 (Harmony 700) opcode set');
  assert.equal(h525.size, 20, 'and the arch 9 (Harmony 525) one, which is where the 11 sits');
});

test('a disagreeing pair of architecture bytes is not reported as an architecture', skipUnless('h700_config'), () => {
  // Slot 1 states the architecture twice. Corrupting one copy has to produce "unstated" rather
  // than a plausible number, because a coincidence reported as a fact is the failure mode here.
  const original = require_('h700_config');
  const good = parse(original);
  const off = (good.fileOffset(good.sections[1]?.address as number) as number) + 1;
  const broken = new Uint8Array(original);
  broken[off] = (broken[off] as number) ^ 0xff;
  const c = parse(broken);
  assert.equal(c.architecture, undefined);
  assert.equal(c.checks['slot1_states_the_architecture'], false);
});

test('every sample carries a slot 3 timestamp, and the cookie pair is unique in the blob', skipWithoutLab(), () => {
  // Unlike slot 0's 0xFEED, which turns up by chance about once per 64 KiB, this pair nine bytes
  // apart occurs exactly once in every blob including the One's 1.6 MB one. That is why the
  // record needs no length field to be recognised.
  const samples = everySample();
  assert.equal(samples.length, 17, 'the samples this claim is asserted over');
  for (const { name, container } of samples) {
    assert.notEqual(container.builtAt, undefined, `${name} has no timestamp`);
    const off = container.blobOffsetOf(
      container.sections[CLOCK_RECORD_SLOT]?.address as number,
    ) as number;
    const hits: number[] = [];
    for (let i = 0; i + CLOCK_RECORD_LENGTH <= container.blob.length; i += 1) {
      if (container.blob[i] === 0xdf && container.blob[i + 1] === 0xad &&
          container.blob[i + 9] === 0xbf && container.blob[i + 10] === 0xef) {
        hits.push(i);
      }
    }
    assert.deepEqual(hits, [off], `${name} cookie pair is not unique`);
  }
});

test('the two One factory configs agree on their timestamp to the second', () => {
  // One dumped off a remote, one extracted from firmware 3.4, so this is two files obtained by
  // completely different routes agreeing on a value that neither alone could confirm.
  const a = load('one_safemode');
  const b = load('one34_region2');
  if (a === undefined || b === undefined) return;
  assert.equal(parse(a).builtAt, parse(b).builtAt);
  assert.equal(parse(a).builtAt, '2007-10-24T02:22:08');
});

test('a day of week that disagrees with the date is refused', skipUnless('one_config'), () => {
  // The check lives in the parser, so a record that fails it reads as absent rather than as a
  // date nobody verified. Mirrors the same test in tests/test_gspm.py.
  const original = require_('one_config');
  const good = parse(original);
  const off = good.fileOffset(good.sections[CLOCK_RECORD_SLOT]?.address as number) as number;
  const broken = new Uint8Array(original);
  broken[off + 6] = ((broken[off + 6] as number) + 1) % 7;
  const c = parse(broken);
  assert.equal(c.builtAt, undefined);
  assert.equal(c.checks['slot3_is_a_timestamp'], false);
});

test('the timestamp is a bare local time, with no timezone attached', skipUnless('one_config'), () => {
  // Formatted by hand rather than through Date.prototype.toISOString, because the value carries
  // no zone: it is whatever clock wrote it. Going through Date would attach one and the golden
  // vectors would then depend on where the tests run, which is the sort of failure that only
  // shows up on somebody else's machine.
  const data = require_('one_config');
  const at = parse(data).builtAt as string;
  assert.match(at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  assert.ok(!at.endsWith('Z'), 'no zone designator');
});

const TRAILER_SAMPLES = [
  'h700_config',
  'h700_config_2',
  'h600_config',
  'h525_config',
  'one_config',
  'one_config_unprogrammed',
  'arch8_config_a',
  'arch8_config_b',
  'arch8_config_c',
  'arch8_config_d',
  'h600_safemode_gspm',
  'h650_safemode_gspm',
  'h700_gspm',
  'one_safemode',
];

// A test called `without the seed nothing matches, which is what pins 0x4321` sat below this and was
// **algebra rather than a measurement**: `trailerChecksum(blob) ^ SEED` is the unseeded body XOR, so
// requiring it to differ from the stored value reduces to `SEED != 0` and held for any nonzero seed
// whatever the bytes were.
//
// **It was deleted for that on 13 August 2026 and deleting it was wrong**, per the rule that a
// test only goes when the code it exercises does. The seed is still here, so the right answer was a body
// that can fail, and the test below is it: the checksum is XOR linear in the seed, so one container
// **determines** the seed rather than merely being consistent with it, and every container has to name
// the same one.
//
// Where the value comes from is a firmware question and cannot be asked from here, since this package
// has no disassembler and must not grow a second one. `tests/test_gspm.py` decodes the boot validator's
// two literals on three images. Section 41.
test('the trailer checksum recomputes on every container in the corpus', skipWithoutLab(), () => {
  for (const name of TRAILER_SAMPLES) {
    const data = require_(name);
    const c = parse(data);
    assert.equal(trailerChecksum(c.blob), c.trailerChecksum, name);
    assert.equal(c.checks['trailer_checksum_recomputes'], true, name);
  }
});

test('every container solves for the same seed, and it is 0x4321', skipWithoutLab(), () => {
  // The measurement the deleted test should have been. `trailerChecksum` starts from `SEED` and XORs
  // every word of the body, so `stored == SEED ^ body` and therefore `SEED == stored ^ body`, where
  // `body` is the same walk with a zero seed. So each container **states** the seed on its own, and the
  // claim is that fourteen independent files agree on the value.
  //
  // This can fail, which is the whole point of it existing: a wrong seed, a wrong extent or a wrong word
  // order all move `body` and each container would name a different number.
  const solved = new Map<number, number>();
  for (const name of TRAILER_SAMPLES) {
    const c = parse(require_(name));
    let body = 0;
    const end = c.blob.length - TRAILER_CHECKSUM_OFFSET;
    for (let at = 0; at + 1 < end; at += 2) {
      body ^= (c.blob[at] as number) | ((c.blob[at + 1] as number) << 8);
    }
    const seed = c.trailerChecksum ^ body;
    solved.set(seed, (solved.get(seed) ?? 0) + 1);
  }
  // One seed, and the count, so a shrunken corpus cannot satisfy it.
  assert.deepEqual([...solved], [[TRAILER_CHECKSUM_SEED, TRAILER_SAMPLES.length]]);
  assert.equal(TRAILER_CHECKSUM_SEED, 0x4321);
});

test('a flipped byte is caught', skipUnless('h600_safemode_gspm'), () => {
  // A word XOR misses a byte swap but not a changed byte, which is the case that matters.
  const data = require_('h600_safemode_gspm');
  const c = parse(data);
  const damaged = Uint8Array.from(c.blob);
  damaged[0x40] = damaged[0x40]! ^ 0x01;
  assert.notEqual(trailerChecksum(damaged), c.trailerChecksum);
});

test('a three byte architecture record carries no version word',
  skipUnless('h525_safemode_ahcm'), () => {
    // Section 79. The record is seven bytes in every generated config and three here, so its
    // extent is the gap to the next pointer like every other section's. A fixed seven byte read
    // takes the word out of base slot 2 and reports 0x0012, which is plausible and wrong.
    const c = parse(load('h525_safemode_ahcm') as Uint8Array);
    assert.equal(c.sectionLength(ARCH_RECORD_SLOT), 3);
    assert.equal(c.architecture, 9);
    assert.equal(c.versionWord, undefined);
    const full = require_('h525_config');
    // The negative: the same architecture with room for the word does carry one.
    assert.notEqual(parse(full).versionWord, undefined);
  });

// Section 117. The base used to come out of the end marker's position, and the check meant to
// validate it asked whether `endAddr` lands on the marker, which it then always did. These are the
// two halves: the anchor recovers every base already established, and the check it frees up fails
// on a real sample. The Python side asserts the same things in `tests/test_gspm.py`.

test('every container holds exactly one validating clock record', skipWithoutLab(), () => {
  // The premise. One record is what makes it an anchor rather than a search.
  for (const name of NAMES) {
    const data = require_(name);
    assert.equal(findClockRecords(parse(data).blob).length, 1, name);
  }
});

test('the clock anchor recovers every base the marker subtraction got right',
  skipWithoutLab(), () => {
    // The calibration, and it is the argument: every container whose base was already established
    // is recovered, across five architectures and six distinct bases.
    for (const name of NAMES) {
      const data = require_(name);
      const c = parse(data);
      const anchored = recoverFlashBase(c.blob, c.sections.map((s) => s.address));
      assert.equal(anchored, EXPECTED[name]?.base, name);
      assert.equal(c.flashBase, EXPECTED[name]?.base, name);
    }
  });

test('the two readings disagree on one sample and the anchor is the right one',
  skipUnless('h890_config', 'h890_config_2'), () => {
    // `H890-Bedroom-2` declares an end 864 bytes before its own end marker, so the marker
    // subtraction returns a base 864 too low, silently. Believed over it because the consistent
    // sibling gives the same answer and because the record the anchor lands on validates its own
    // day of week.
    const c = parse(load('h890_config_2') as Uint8Array);
    const markerReading = c.endAddr - (c.blob.length - c.family.endMarker.length);
    assert.equal(markerReading, 0x02fca0);
    assert.equal(c.flashBase, 0x030000);
    assert.equal(c.flashBase - markerReading, 864);
    assert.equal(c.flashBase % FLASH_BASE_ALIGNMENT, 0);
    assert.equal(parse(load('h890_config') as Uint8Array).flashBase, 0x030000);
  });

test('the end marker check can now fail, and does', skipUnless('h890_config', 'h890_config_2'),
  () => {
    // The negative. Under the old reading no input could fail this check at all.
    assert.equal(parse(load('h890_config') as Uint8Array).checks['end_addr_points_at_end_marker'],
      true);
    assert.equal(parse(load('h890_config_2') as Uint8Array).checks['end_addr_points_at_end_marker'],
      false);
  });

test('a container with no clock record falls back rather than guessing',
  skipUnless('h600_config'), () => {
    // Nothing in the corpus reaches this path, so it is exercised by damaging a copy.
    const c = parse(load('h600_config') as Uint8Array);
    const damaged = Uint8Array.from(c.blob);
    const off = findClockRecords(c.blob)[0] as number;
    damaged[off] = 0;
    damaged[off + 1] = 0;
    assert.deepEqual(findClockRecords(damaged), []);
    assert.equal(recoverFlashBase(damaged, c.sections.map((s) => s.address)), undefined);
    assert.equal(parse(damaged).flashBase, c.flashBase);
  });

test('arch 10 is aligned now, and the refusal moved from the architecture to the absent slot', () => {
  // **This test's claim was reversed by section 184 and it is kept because the subject did not go
  // away**, per the house rule: the gate exists, and what changed is where it stands. It used to
  // refuse every base slot on arch 10, on section 178's reasoning that a guessed mapping turns twenty
  // refusals into twenty plausible wrong answers. The mapping is derived from content now, so the
  // architecture answers and the refusal is per base slot: five of the twenty are simply not there.
  //
  // No lab, so a fresh clone is protected by this. `arch10.test.ts` carries the whole table.
  for (const base of [3, 5, 10, 17]) {
    assert.equal(typeof archSlot(10, base), 'number', `base slot ${base} answers`);
  }
  for (const base of [0, 2, 8, 13, 14]) {
    assert.throws(() => archSlot(10, base), /has no base slot/, `base slot ${base} is absent`);
  }
  // `baseSlot` asks the other question, so it answers with undefined rather than throwing for a raw
  // slot that is not a base slot, and there are eight of those on arch 10.
  assert.equal(baseSlot(10, 0), 1, 'raw slot 0 is the architecture record');
  for (const raw of [1, 2, 3, 7, 8, 13, 16, 17]) {
    assert.equal(baseSlot(10, raw), undefined, `raw slot ${raw} is not a base slot`);
  }
  // And an architecture nobody has aligned still refuses wholesale, which is the older rail intact.
  assert.throws(() => archSlot(7, 5), /alignment/);
  assert.throws(() => baseSlot(7, 5), /alignment/);
});

test('the arch 10 clock record sits one slot later, and reading it is what dated a Harmony 890',
  skipUnless('h890_config', 'h890_config_2', 'arch8_config_880'), () => {
    // This was the first arch 10 anchor: the single validating record is raw slot 4's target, where
    // every other architecture has it at raw slot 3. Its second half used to assert that `builtAt` is
    // undefined, because the reader went through an alignment arch 10 did not have. Section 184 gave
    // it one, so the same two containers now state their dates and the assertion is the date.
    for (const name of ['h890_config', 'h890_config_2']) {
      const c = parse(load(name) as Uint8Array);
      const off = findClockRecords(c.blob)[0] as number;
      const landing = c.sections
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => !s.isNull && s.address - c.flashBase === off)
        .map(({ i }) => i);
      assert.deepEqual(landing, [4], name);
      assert.equal(c.checks['slot3_is_a_timestamp'], true, `${name} passes the check now`);
    }
    // **And this is the unprompted confirmation that the mapping is right**, which nothing was
    // looking for. Three of this contributor's configurations, two remotes and two architectures,
    // land inside fifteen minutes of one afternoon: one person at one sitting, compiling what they
    // had. The arch 8 date was already read and believed; the two arch 10 ones come out of a slot the
    // arch 8 map does not use, so nothing could have been adjusted to make them agree.
    assert.equal(parse(load('arch8_config_880') as Uint8Array).builtAt, '2025-05-14T21:25:34');
    // The second Harmony 890 is a damaged read, section 122, and its record survives anyway.
    assert.equal(parse(load('h890_config_2') as Uint8Array).builtAt, '2025-05-14T21:37:44');
    assert.equal(parse(load('h890_config') as Uint8Array).builtAt, '2025-05-14T21:40:26');
  });

/**
 * Every container the lab can parse, which is a wider population than `EXPECTED`.
 *
 * `EXPECTED` is the thirteen samples whose header fields are pinned one by one; the checks below
 * are properties of the parser rather than of a sample, so they are stated over everything that
 * parses. That difference is the point of the count being asserted: three source comments quoted
 * "all thirteen samples" and "all 24 containers" while the lab held 33.
 *
 * **37 since 24 August 2026**, when the configuration Logitech's compiler produced for fifteen chosen
 * appliances was given a name in the lab index, section 165. It joins this population and not
 * `CONTAINERS`, which is where every corpus wide total is computed from: the checks below are properties
 * of the parser, so a further real container can only strengthen them, and a calibration sample inside a
 * corpus total would be counting our own request as evidence.
 *
 * **41 since 25 August 2026**, the phase 7 pair, section 174: the same account compiled without and
 * with the television the composer adds, both bare containers like every compiled to order sample.
 *
 * **42 since 26 August 2026**, the Harmony 895, section 177. It joins this population for exactly the
 * reason the paragraph above gives: the checks below are properties of the parser, and an arch 10
 * container whose framing verifies while every one of its content readers is gated is a real
 * strengthening of them. It stays outside every corpus wide total, as the 890s do.
 *
 * **43 since 27 August 2026**, the Harmony 350, section 194, and it is the strongest member this
 * population has gained: architecture 16, a generation nothing here was written for, read off the
 * remote with concordance because this project's own transport does not reach it at all. Every one
 * of the framing checks passes on it, which is what these tests are about, and it is the container
 * that showed the format word to be the pointer count. It stays outside every corpus wide total.
 *
 * **44 since 30 August 2026**, a fourth state of the spare Harmony One, read because the write
 * rehearsal refused: the unit holds a configuration none of its three earlier dumps matches. It
 * joins this population automatically, being a name in `IMAGES` that parses, and it is right that it
 * does, since the checks below are properties of the parser and this is a container nothing here has
 * ever parsed. It is **not** in `CONTAINERS`, so no corpus wide total moves: that list is stated
 * rather than discovered, exactly so a new dump cannot quietly change every accounting figure.
 */
const PARSEABLE = 44;

function parseable(): { name: string; container: Container }[] {
  const out: { name: string; container: Container }[] = [];
  for (const name of Object.keys(IMAGES)) {
    // A fixture whose container is already in this population under another name is skipped, or
    // every total over it counts one config twice. Section 215.
    if (PARSEABLE_EXCLUDED.includes(name)) continue;
    const data = load(name);
    if (data === undefined) continue;
    try {
      out.push({ name, container: parse(data) });
    } catch {
      // Not a container. The population is what parses, not what is named.
    }
  }
  return out;
}

test('the flash base is block aligned, and the three that are not took the fallback',
  skipWithoutLab(), () => {
    // The one thing about a fallback base that can fail. `end_addr_points_at_end_marker` cannot,
    // because a fallback base is computed from the marker's own position, which is section 117's
    // circularity surviving inside the second arm of the `??`. The docstring said nothing in the
    // corpus reaches that arm; three reads of one Harmony 890 do.
    const all = parseable();
    assert.equal(all.length, PARSEABLE);
    const unaligned = all
      .filter(({ container }) => container.checks['flash_base_is_block_aligned'] === false)
      .map(({ name }) => name);
    assert.deepEqual(unaligned.sort(), [
      'h890_config_2_redump_2', 'h890_config_2_redump_3', 'h890_config_2_rescan',
    ]);
    for (const name of unaligned) {
      const c = parse(require_(name));
      // Each took the fallback, which is what makes the alignment the only test left, and each is
      // then pronounced consistent by the check that cannot fail on a fallback base.
      assert.equal(recoverFlashBase(c.blob, c.sections.map((s) => s.address)), undefined, name);
      assert.notEqual(c.flashBase % FLASH_BASE_ALIGNMENT, 0, name);
      assert.equal(c.checks['end_addr_points_at_end_marker'], true, name);
    }
  });

test('the format word has nothing in its high half, and a byte there would be refused',
  skipWithoutLab(), () => {
    const all = parseable();
    assert.equal(all.length, PARSEABLE);
    for (const { name, container } of all) {
      assert.equal(container.checks['format_high_half_is_zero'], true, name);
      assert.equal(container.checks['sections_ascend'], true, name);
    }
    // The negative, which is what makes it a check: the version reads the top two nibbles only, so
    // without this a 0x00011600 renders as "17.6" and nothing anywhere says the file is wrong.
    const edited = new Uint8Array(require_('h700_config'));
    const c = parse(edited);
    // The word is a little endian u32 at +8, so the high half is the last two bytes of it.
    edited[c.blobOffset + 10] = 0x01;
    const bad = parse(edited);
    // h700_config is format 1.4, and one bit set sixteen places up renders it as 17.4: the major
    // digit is `formatRaw >>> 12`, so bits nobody reads become part of the number that is read.
    assert.equal(c.formatVersion, '1.4');
    assert.equal(bad.formatVersion, '17.4');
    assert.equal(bad.checks['format_high_half_is_zero'], false);
  });

test('24 of the parseable containers have an odd body and 19 of those verify',
  skipWithoutLab(), () => {
    // The comment above `trailerChecksum` said no container in the corpus has an odd body,<!--superseded--> and
    // invited a reader to fold the trailing byte in on the grounds that nothing would catch it.
    const all = parseable();
    assert.equal(all.length, PARSEABLE);
    const odd = all.filter(({ container }) => (container.blob.length - TRAILER_CHECKSUM_OFFSET) % 2 === 1);
    // 21 and 16 since the compiled sample was named, section 165, and the second compiled sample of 24
    // August 2026 did **not** move them: its body is even. 22 and 17 since the phase 7 pair, whose
    // before container is the odd one. **23 and 18 since the Harmony 895**: it is odd bodied and its
    // checksum recomputes, so it moves **both** counts, which a first guess here got wrong by
    // assuming an arch 10 container would fail the second. It is **not** a further independent
    // statement that the consensus read is clean, which a draft of this comment claimed: "its
    // checksum recomputes" is the checksum check, counted once. What it adds is that the check runs
    // over an odd body, so the loop's own arithmetic is exercised on this container. The title
    // carries the counts, so a move shows.
    // 24 and 19 since the Harmony 350, section 194: odd bodied and its checksum recomputes, so it
    // moves both, the same way the Harmony 895 did. Predicted from `tools/facts.py` recomputing the
    // marked numbers in the documents before this test was touched, which is the two halves of
    // `make facts` agreeing with each other for once rather than one correcting the other.
    assert.equal(odd.length, 24);
    const verifying = odd.filter(({ container }) => container.checks['trailer_checksum_recomputes']);
    assert.equal(verifying.length, 19);
    // Every one of the eighteen recomputes under the loop as written, which is what makes the
    // behaviour tested rather than assumed. Folding the trailing byte in would break the three whose
    // trailing byte is not zero, and be invisible on the other fifteen: so the comment was inviting
    // a change that five sixths of the corpus could not detect, which is the worse half of it.
    let breaks = 0;
    for (const { name, container } of verifying) {
      const blob = container.blob;
      const end = blob.length - TRAILER_CHECKSUM_OFFSET;
      let recomputed = TRAILER_CHECKSUM_SEED;
      for (let o = 0; o + 1 < end; o += 2) {
        recomputed ^= (blob[o] as number) | ((blob[o + 1] as number) << 8);
      }
      assert.equal(recomputed, container.trailerChecksum, name);
      const tail = blob[end - 1] as number;
      if (tail !== 0) {
        breaks += 1;
        assert.notEqual(recomputed ^ tail, container.trailerChecksum, name);
      }
    }
    // 3 since the Harmony 895, whose trailing byte is nonzero as well as its body being odd. So the
    // sample that moved both counts in the title moves the detector too, which is the direction that
    // matters: it makes the invited change one byte easier to catch rather than one byte harder.
    assert.equal(breaks, 3, 'containers whose trailing byte would change the answer');
  });

test('the last section ends at the end marker, not at the declared end',
  skipWithoutLab(), () => {
    // `endAddr` is a declared field and where a container ends is data, which is the same
    // correction the base got in section 117. They agree on 37 of 39; the two that disagree are
    // the damaged Harmony 890 reads, where the old reading reported the last section short.
    const all = parseable();
    assert.equal(all.length, PARSEABLE);
    let agree = 0;
    const differ: string[] = [];
    for (const { name, container: c } of all) {
      const marker = c.flashBase + c.blob.length - 4;
      if (marker === c.endAddr) agree += 1;
      else differ.push(name);
      const last = c.sections.filter((s) => !s.isNull).at(-1);
      if (last === undefined) continue;
      assert.equal(c.sectionLength(last.slot), marker - last.address, name);
    }
    // 37 since the third compiled sample, 24 August 2026; 39 since the phase 7 pair; **40 since the
    // Harmony 895**, whose declared end and whose end marker agree exactly. That is one of the three
    // independent statements that its consensus of five reads is clean, with the trailer checksum and
    // the EZHex split, and it is the one this
    // architecture makes least often: every previous arch 10 container here failed it, section 122.
    // 41 since the Harmony 350, section 194.
    // 42 since `one_spare_20260830`, read on 30 August 2026 because the write rehearsal refused
    // against all three earlier dumps of that unit: its declared end and its end marker agree, as
    // every arch 12 container here does.
    assert.equal(agree, 42);
    // The two that disagree are the claim and they are unchanged, both being damaged reads of one
    // Harmony 890. Asserted by name rather than by count, because a count would let a **different**
    // container fail while one of these silently started passing.
    assert.deepEqual(differ.sort(), ['h890_config_2', 'h890_config_2_redump_1']);
  });

test('the header guard is long enough for the longest header in the lab', skipWithoutLab(), () => {
  // It was the literal 0x68, which is 104 and three bytes short of an arch 10 (Harmony 890)
  // header, while its message claimed to have proved there is room for one.
  assert.equal(MINIMUM_HEADER_LENGTH, 108);
  for (const { name, container } of parseable()) {
    const header = SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE * container.pointerCount + 1;
    assert.ok(header <= MINIMUM_HEADER_LENGTH, `${name} needs ${header}`);
  }
  assert.throws(() => parse(new Uint8Array(0)), /no PTYY|magic|short/);
});

test('an address outside the blob has no offset, rather than a number outside the blob',
  skipWithoutLab(), () => {
    // It tested `address === 0` only, so it was a NULL test with a range test's signature: every
    // caller guarded the upper bound and none guarded the lower.
    const c = parse(require_('one_config'));
    assert.equal(c.blobOffsetOf(0), undefined);
    assert.equal(c.blobOffsetOf(c.flashBase - 16), undefined);
    assert.equal(c.blobOffsetOf(c.flashBase + c.blob.length), undefined);
    assert.equal(c.blobOffsetOf(c.flashBase + 1), 1);
    assert.equal(c.fileOffset(c.flashBase - 16), undefined);
  });

test('the frame tiles to the next section on every container that has one', skipWithoutLab(), () => {
  // `frameLength` is the field and the field is zero for an empty frame, which is a sentinel for
  // `EMPTY_FRAME_LENGTH` that nothing in the type says. Three call sites decoded it separately.
  // Written as `frameLength + FRAME_END_LENGTH`, the tiling closes on 26 of the 28 containers with
  // a frame and misses exactly the two empty ones; through `frameExtent` it closes on all 28.
  let framed = 0;
  let naive = 0;
  for (const { name, container: c } of parseable()) {
    if (c.frameLength === undefined) continue;
    framed += 1;
    const start = c.blobOffsetOf((c.sections[0] as { address: number }).address);
    const next = c.sections.slice(1).find((s) => !s.isNull);
    assert.ok(start !== undefined && next !== undefined, name);
    const target = c.blobOffsetOf(next.address);
    assert.equal(start + (c.frameExtent as number), target, name);
    if (start + c.frameLength + 2 === target) naive += 1;
  }
  // 32 since the third compiled sample and 34 since the phase 7 pair; the two the sentinel misses
  // are still exactly the two empty frames, which is the claim rather than the total.
  // 35 since the Harmony 350, section 194: its slot 0 frame tiles to the next section too.
  // 36 and 34 since `one_spare_20260830`, 30 August 2026: it moves both by one and so leaves the
  // gap alone, which is the claim.
  assert.equal(framed, 36);
  // 33 since the Harmony 350: its frame is non empty, so the naive arithmetic gets it right too and
  // the gap between the two counts stays at exactly two, which is the claim rather than either total.
  assert.equal(naive, 34, 'the two the sentinel gets wrong are the two empty frames');
  assert.equal(framed - naive, 2, 'and the gap is the two empty frames, whatever the totals are');
});

/**
 * Arch 16's map is partial and refuses the rest, section 259.
 *
 * **The refusals are the assertion, not the six.** A map with a hopeful entry in it would pass a test
 * that only checked what is named, and on this architecture a guessed alignment is worse than none:
 * its fifteen slots are not the base twenty with insertions, so a wrong entry lands on real bytes and
 * reads as a plausible structure. Same rail as arch 10 above, for the opposite reason: there an
 * `undefined` means the container has no such slot, here it means nobody has read it.
 *
 * No lab, so a fresh clone is protected by this too. The Python mirror is in `tests/test_gspm.py`,
 * and the golden vectors compare the two copies, which is the only thing keeping them one table.
 */
test('arch 16 places six slots and refuses the other fourteen', () => {
  const named: Record<number, number> = { 0: 0, 1: 1, 3: 3, 5: 4, 10: 7, 15: 10 };
  for (const [base, raw] of Object.entries(named)) {
    assert.equal(archSlot(16, Number(base)), raw, `base slot ${base} moved`);
  }
  const unread = [2, 4, 6, 7, 8, 9, 11, 12, 13, 14, 16, 17, 18, 19];
  for (const base of unread) {
    assert.throws(() => archSlot(16, base), /has no base slot/, `base slot ${base} answered`);
  }
  // The control on the pair: neither list may quietly shrink.
  assert.deepEqual([...Object.keys(named).map(Number), ...unread].sort((a, b) => a - b),
    Array.from({ length: 20 }, (_unused, i) => i));
  // Raw slots the container holds that are not base slots: nine of the fifteen, which is the other
  // direction and the honest count of what section 259 left open.
  const unnamedRaw = [2, 5, 6, 8, 9, 11, 12, 13, 14];
  for (const raw of unnamedRaw) {
    assert.equal(baseSlot(16, raw), undefined, `raw slot ${raw} is claimed by a base slot`);
  }
  assert.equal(baseSlot(16, 4), 5, 'raw slot 4 is the infrared database');
  assert.equal(baseSlot(16, 7), 10, 'raw slot 7 is the action list table');
  assert.equal(baseSlot(16, 10), 15, 'raw slot 10 is the parameter block');
});
