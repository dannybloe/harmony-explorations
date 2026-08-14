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

import { IMAGES, load, skipUnless, skipWithoutLab, require_ } from '@harmony/lab';
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
  one_config: { magic: 'GSPM', base: 0x040000, version: '1.6', slots: 22, marker: 'LWJL', keys: 55, architecture: 12 },
  one_config_unprogrammed: { magic: 'GSPM', base: 0x040000, version: '1.6', slots: 22, marker: 'LWJL', keys: 55, architecture: 12 },
  h600_config: { magic: 'GSPM', base: 0x030000, version: '1.4', slots: 20, marker: 'LWJL', keys: 162, architecture: 14 },
  h700_config: { magic: 'GSPM', base: 0x030000, version: '1.4', slots: 20, marker: 'LWJL', keys: 163, architecture: 14 },
  h700_config_2: { magic: 'GSPM', base: 0x030000, version: '1.4', slots: 20, marker: 'LWJL', keys: 163, architecture: 14 },
  h525_config: { magic: 'AHCM', base: 0x020000, version: '1.4', slots: 20, marker: 'CMAH', keys: 0, architecture: 9 },
  arch8_config_a: { magic: 'TPTP', base: 0x020000, version: '1.5', slots: 21, marker: 'WLWL', keys: 56, architecture: 8 },
  arch8_config_b: { magic: 'TPTP', base: 0x020000, version: '1.5', slots: 21, marker: 'WLWL', keys: 56, architecture: 8 },
  arch8_config_c: { magic: 'TPTP', base: 0x020000, version: '1.5', slots: 21, marker: 'WLWL', keys: 56, architecture: 8 },
  arch8_config_d: { magic: 'TPTP', base: 0x020000, version: '1.5', slots: 21, marker: 'WLWL', keys: 56, architecture: 8 },
};

const NAMES = Object.keys(EXPECTED);

/**
 * The samples that are somebody's actual configuration.
 *
 * The other three are containers of the same format with no user assignments in them: the factory
 * config packed inside a firmware image (`h700_gspm`) and the two safe mode configs. They have no
 * action lists at all and only some of the pointer array sections, so a claim about "every
 * config" has to mean these ten. `tests/test_gspm.py` draws the same line.
 */
const USER_CONFIGS = NAMES.filter(
  (n) => !['h700_gspm', 'one_safemode', 'one34_region2'].includes(n),
);

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
  assert.equal(distinct((s) => s.container.flashBase), 4, 'base addresses');
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

test('the action list table and the lists agree on the packing, bar four', skipWithoutLab(), () => {
  // The addresses come from the pointer table and the counts come from the lists themselves, so
  // agreement between them is two unrelated parts of the file telling the same story. The four
  // exceptions are the boundaries between the runs the lists are packed into.
  const configs = userConfigs();
  assert.ok(configs.length > 0, 'no config present');
  for (const { name, container: c } of configs) {
    const slot = archSlot(c.architecture as number, ACTION_LIST_TABLE_SLOT);
    if (c.pointerArray(slot) === undefined) continue;
    const [fit, of] = c.actionListPacking();
    assert.equal(of - fit, 4, `${name}: ${fit} of ${of} packed`);
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
  assert.equal(samples.length, 13, 'the samples this claim is asserted over');
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
// **It was deleted for that on 13 August 2026 and deleting it was wrong**, per the owner's rule that a
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

test('arch 10 has no slot alignment, so every reader refuses', () => {
  // The gate the two Harmony 890 configs sit behind. An entry here without a derived mapping turns
  // twenty refusals into twenty plausible wrong answers.
  for (const base of [0, 3, 5, 10, 17]) {
    assert.throws(() => archSlot(10, base), /alignment/);
    assert.throws(() => baseSlot(10, base), /alignment/);
  }
});

test('the arch 10 clock record sits one slot later than everywhere else',
  skipUnless('h890_config', 'h890_config_2'), () => {
    // The one thing the mapping does say: the single validating record is raw slot 4's target,
    // where every other architecture has it at raw slot 3. So `slot3_is_a_timestamp` fails for
    // want of an alignment and not for want of a record.
    for (const name of ['h890_config', 'h890_config_2']) {
      const c = parse(load(name) as Uint8Array);
      const off = findClockRecords(c.blob)[0] as number;
      const landing = c.sections
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => !s.isNull && s.address - c.flashBase === off)
        .map(({ i }) => i);
      assert.deepEqual(landing, [4], name);
      assert.equal(c.checks['slot3_is_a_timestamp'], false, name);
      assert.equal(c.builtAt, undefined, name);
    }
  });

/**
 * Every container the lab can parse, which is a wider population than `EXPECTED`.
 *
 * `EXPECTED` is the thirteen samples whose header fields are pinned one by one; the checks below
 * are properties of the parser rather than of a sample, so they are stated over everything that
 * parses. That difference is the point of the count being asserted: three source comments quoted
 * "all thirteen samples" and "all 24 containers" while the lab held 33.
 */
const PARSEABLE = 33;

function parseable(): { name: string; container: Container }[] {
  const out: { name: string; container: Container }[] = [];
  for (const name of Object.keys(IMAGES)) {
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

test('19 of the parseable containers have an odd body and 14 of those verify',
  skipWithoutLab(), () => {
    // The comment above `trailerChecksum` said no container in the corpus has an odd body,<!--superseded--> and
    // invited a reader to fold the trailing byte in on the grounds that nothing would catch it.
    const all = parseable();
    assert.equal(all.length, PARSEABLE);
    const odd = all.filter(({ container }) => (container.blob.length - TRAILER_CHECKSUM_OFFSET) % 2 === 1);
    assert.equal(odd.length, 19);
    const verifying = odd.filter(({ container }) => container.checks['trailer_checksum_recomputes']);
    assert.equal(verifying.length, 14);
    // Every one of the fourteen recomputes under the loop as written, which is what makes the
    // behaviour tested rather than assumed. Folding the trailing byte in would break the two whose
    // trailing byte is not zero, and be invisible on the other twelve: so the comment was inviting
    // a change that six sevenths of the corpus could not detect, which is the worse half of it.
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
    assert.equal(breaks, 2, 'containers whose trailing byte would change the answer');
  });

test('the last section ends at the end marker, not at the declared end',
  skipWithoutLab(), () => {
    // `endAddr` is a declared field and where a container ends is data, which is the same
    // correction the base got in section 117. They agree on 31 of 33; the two that disagree are
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
    assert.equal(agree, 31);
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
  // Written as `frameLength + FRAME_END_LENGTH`, the tiling closes on 24 of the 26 containers with
  // a frame and misses exactly the two empty ones; through `frameExtent` it closes on all 26.
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
  assert.equal(framed, 26);
  assert.equal(naive, 24, 'the two the sentinel gets wrong are the two empty frames');
});
