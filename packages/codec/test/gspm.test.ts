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

import { load, skipUnless } from '@harmony/lab';
import {
  ACTION_LIST_TABLE_SLOT,
  EVENT_NONE,
  EVENT_PRESS,
  CLOCK_RECORD_LENGTH,
  CLOCK_RECORD_SLOT,
  SECTION_ITEM_SIZE,
  SECTION_TABLE_OFFSET,
  archSlot,
  baseSlot,
  parse,
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
  return available().filter((s) => USER_CONFIGS.includes(s.name));
}

/** Every sample that is actually on this machine, parsed. */
function available(): Array<{ name: string; container: Container; expected: Expectation }> {
  const out: Array<{ name: string; container: Container; expected: Expectation }> = [];
  for (const name of NAMES) {
    const data = load(name);
    if (data === undefined) continue;
    out.push({ name, container: parse(data), expected: EXPECTED[name] as Expectation });
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

test('end_addr locates the end marker', () => {
  const samples = available();
  assert.ok(samples.length > 0, 'no samples available at all');
  for (const { name, container: c } of samples) {
    const off = c.endAddr - c.flashBase;
    assert.equal(
      String.fromCharCode(...c.blob.subarray(off, off + 4)),
      c.family.endMarker,
      name,
    );
  }
});

test('the corpus spans more than one of everything', () => {
  const samples = available();
  if (samples.length < NAMES.length) {
    // Deliberately not a skip: the claim is about the corpus, and a partial corpus cannot make
    // it. Reporting how many were found is more useful than a silent pass.
    assert.fail(`only ${samples.length} of ${NAMES.length} samples present, cannot judge spread`);
  }
  const distinct = <T>(pick: (s: (typeof samples)[number]) => T) =>
    new Set(samples.map(pick)).size;
  assert.ok(distinct((s) => s.container.family.magic) >= 3, 'container cookies');
  assert.ok(distinct((s) => s.container.flashBase) >= 4, 'base addresses');
  assert.ok(distinct((s) => s.container.formatVersion) >= 3, 'format versions');
  assert.ok(distinct((s) => s.container.pointerCount) >= 3, 'table lengths');
  assert.ok(distinct((s) => s.container.architecture) >= 4, 'architectures');
});

test('the architecture is not derivable from the cookie', () => {
  // The reason slot 1 is read at all: GSPM covers both arch 12 and arch 14, so a per cookie
  // table would be wrong for one of them.
  const byCookie = new Map<string, Set<number | undefined>>();
  for (const { container: c } of available()) {
    const set = byCookie.get(c.family.magic) ?? new Set<number | undefined>();
    set.add(c.architecture);
    byCookie.set(c.family.magic, set);
  }
  const gspm = byCookie.get('GSPM');
  if (gspm === undefined) assert.fail('no GSPM sample present');
  assert.deepEqual([...gspm].sort(), [12, 14]);
});

test('arch 14 records 54 scan codes times three event types', () => {
  const samples = available().filter((s) => s.expected.architecture === 14 && s.container.keys.length > 0);
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

test('arch 12 and arch 8 record presses only', () => {
  const samples = available().filter(
    (s) => [8, 12].includes(s.expected.architecture) && s.container.keys.length > 10,
  );
  assert.ok(samples.length > 0, 'no arch 8 or arch 12 config present');
  for (const { name, container: c } of samples) {
    assert.deepEqual(new Set(c.keys.map((k) => k.eventType)), new Set([EVENT_NONE, EVENT_PRESS]), name);
  }
});

test('the same six base slots are pointer arrays in every config', () => {
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

test('every pointer array entry is an address inside the config', () => {
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

test('the action list table and the lists agree on the packing, bar four', () => {
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

test('every action list parses and no list is empty or implausibly long', () => {
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

test('the opcode inventory differs between architectures', () => {
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
  assert.ok([...h700].filter((o) => h525.has(o)).length > 8, 'and yet they share a core');
});

test('a disagreeing pair of architecture bytes is not reported as an architecture', () => {
  // Slot 1 states the architecture twice. Corrupting one copy has to produce "unstated" rather
  // than a plausible number, because a coincidence reported as a fact is the failure mode here.
  const original = load('h700_config');
  if (original === undefined) return;
  const good = parse(original);
  const off = (good.fileOffset(good.sections[1]?.address as number) as number) + 1;
  const broken = new Uint8Array(original);
  broken[off] = (broken[off] as number) ^ 0xff;
  const c = parse(broken);
  assert.equal(c.architecture, undefined);
  assert.equal(c.checks['slot1_states_the_architecture'], false);
});

test('every sample carries a slot 3 timestamp, and the cookie pair is unique in the blob', () => {
  // Unlike slot 0's 0xFEED, which turns up by chance about once per 64 KiB, this pair nine bytes
  // apart occurs exactly once in every blob including the One's 1.6 MB one. That is why the
  // record needs no length field to be recognised.
  const samples = available();
  assert.ok(samples.length >= 9, 'not enough samples for this to mean anything');
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

test('a day of week that disagrees with the date is refused', () => {
  // The check lives in the parser, so a record that fails it reads as absent rather than as a
  // date nobody verified. Mirrors the same test in tests/test_gspm.py.
  const original = load('one_config');
  if (original === undefined) return;
  const good = parse(original);
  const off = good.fileOffset(good.sections[CLOCK_RECORD_SLOT]?.address as number) as number;
  const broken = new Uint8Array(original);
  broken[off + 6] = ((broken[off + 6] as number) + 1) % 7;
  const c = parse(broken);
  assert.equal(c.builtAt, undefined);
  assert.equal(c.checks['slot3_is_a_timestamp'], false);
});

test('the timestamp is a bare local time, with no timezone attached', () => {
  // Formatted by hand rather than through Date.prototype.toISOString, because the value carries
  // no zone: it is whatever clock wrote it. Going through Date would attach one and the golden
  // vectors would then depend on where the tests run, which is the sort of failure that only
  // shows up on somebody else's machine.
  const data = load('one_config');
  if (data === undefined) return;
  const at = parse(data).builtAt as string;
  assert.match(at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  assert.ok(!at.endsWith('Z'), 'no zone designator');
});
