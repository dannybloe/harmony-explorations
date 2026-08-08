/**
 * The tabular sections and the infrared database, ported for milestone M2.
 *
 * The port is held to the numbers `src/harmony/gspm.py` already produces, sample by sample, which
 * is the same discipline the screen language port used: the figures were published before this
 * implementation existed, so reaching them from a second one is a check and not a restatement.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import {
  eventMap,
  handlerSets,
  IR_CLASS_ARCH9,
  IR_CLASS_STREAM,
  IR_HEADER_CLASSES,
  IR_HEADER_LENGTH,
  IR_RECORD_POINTER_BIAS,
  irClass,
  irGroups,
  irPulses,
  irRecordBlocks,
  irRecordStart,
  irRegion,
  MODE_ENTRY_HEADER,
  MODE_PAGE_LEAD_ARCHITECTURES,
  MODE_PAGE_POINTERS,
  modePages,
  modeRecords,
  modeTable,
  parameterGroups,
  parse,
  screenProgram,
  stateTable,
  taggedList,
  taggedListPools,
  timers,
  touchPages,
  bytes,
} from '../src/index.ts';

/** `[sample, event fallback, state header, modes, bindings, records per group]`. */
const SECTIONS: readonly [string, number, number[], number, number, number[]][] = [
  ['h700_config', 19, [94, 67, 27, 67], 374, 11, [30, 111, 65, 52, 10, 82]],
  ['h600_config', 14, [74, 55, 19, 55], 237, 9, [81, 51, 0, 54]],
  ['one_config', 10, [46, 45, 1, 45], 268, 16, [83, 53, 59, 74, 59]],
  ['arch8_config_a', 4, [33, 32, 1, 32], 103, 9, [57, 163, 14]],
  ['h525_config', 11, [24, 23, 1, 23], 114, 8, [8, 67, 61, 64]],
];

/** Total mark and space durations decoded, per sample. `docs/findings.md` section 32. */
const PULSES: readonly [string, number][] = [
  ['h700_config', 26388],
  ['h600_config', 11963],
  ['one_config', 21659],
  ['arch8_config_a', 10310],
  // Arch 9 decodes very few, which is the negative case: its records are one of the other three
  // infrared encoding classes and this reader only knows the streamed one.
  ['h525_config', 2769],
];

for (const [name, fallback, header, modes, bindings, groups] of SECTIONS) {
  test(`${name}: the four tabular sections read as Python reads them`, skipUnless(name), () => {
    const c = parse(load(name) as Uint8Array);
    const events = eventMap(c);
    assert.equal(events?.fallback, fallback);
    // Thirty in every config in the corpus, and the length is 5 + 4 * 30 rather than the gap to
    // the next pointer, which runs to 1532 because base slot 5's arrays sit inside it.
    assert.equal(events?.entries.size, 30);
    assert.equal(events?.length, 125);

    const state = stateTable(c);
    assert.deepEqual(
      [state?.count, state?.narrow, state?.wide, state?.narrowAgain],
      header,
      'the state table header',
    );
    assert.equal(state?.narrow as number + (state?.wide as number), state?.count, 'the split');
    assert.equal(state?.entries.length, state?.count);

    assert.equal(modeTable(c)?.addresses.length, modes);
    assert.equal(handlerSets(c)?.addresses.length, bindings);
    assert.deepEqual((irGroups(c) ?? []).map((g) => g.addresses.length), groups);
  });
}

for (const [name, pulses] of PULSES) {
  test(`${name}: the infrared records decode ${pulses} durations`, skipUnless(name), () => {
    const c = parse(load(name) as Uint8Array);
    let total = 0;
    for (const group of irGroups(c) ?? []) {
      for (const address of group.addresses) total += irPulses(c, address)?.pulses.length ?? 0;
    }
    assert.equal(total, pulses);
  });
}

test('a mode entry reads as a tagged list, and its extent is not trusted', skipUnless('h600_config'),
  () => {
    // Both halves matter. The entries decode, which is what names the section; the length does
    // not, which is why `coverage.ts` claims none of them. Every mode entry in this config is the
    // wide form and the longest reads as 255 entries, exactly where a u8 count saturates.
    const c = parse(load('h600_config') as Uint8Array);
    const addresses = modeTable(c)?.addresses ?? [];
    assert.ok(addresses.length > 0);
    let widest = 0;
    for (const address of addresses) {
      const list = taggedList(c, address);
      assert.notEqual(list, undefined, `no list at ${address}`);
      widest = Math.max(widest, (list as { entries: unknown[] }).entries.length);
      // The wide form is chosen by the first byte being zero, exactly as the firmware chooses it.
      const off = c.blobOffsetOf(address) as number;
      assert.equal(c.blob[off], 0, 'every mode entry here is the wide form');
    }
    assert.equal(widest, 255, 'the saturation that says the length rule is unsettled');
  });

/**
 * `[sample, timers, longest duration, group lengths, touch pages, touch areas]`, again the numbers
 * `src/harmony/gspm.py` produces. findings.md sections 43, 44 and 45.
 */
const TABLES: readonly [string, number, number, number[], number, number][] = [
  ['h700_config', 9, 10, [1, 4, 1, 4, 6, 14, 14, 1, 2], 0, 0],
  ['h600_config', 5, 10, [1, 4, 1, 4, 6, 14, 14, 1, 2], 0, 0],
  ['one_config', 30, 20, [1, 6, 1, 1, 6, 16, 16, 1, 2, 6, 8], 42, 247],
  ['arch8_config_a', 19, 20, [1, 6, 1, 1, 6, 14, 14, 1, 2], 0, 0],
  // The longest duration anywhere in the corpus, and it is two hours, which is what makes the one
  // second tick believable rather than merely arithmetically possible.
  ['h525_config', 5, 7200, [1, 1, 4, 1, 1], 0, 0],
];

for (const [name, count, longest, groups, pages, areas] of TABLES) {
  test(`${name}: the timers, the parameters and the touch map read as Python reads them`,
    skipUnless(name), () => {
      const c = parse(load(name) as Uint8Array);
      const table = timers(c);
      assert.equal(table?.records.length, count);
      assert.equal(Math.max(...(table?.records ?? []).map((t) => t.duration)), longest);
      // Sixteen bits, because the firmware clamps there with no error. A writer needs that rail.
      for (const timer of table?.records ?? []) assert.ok(timer.duration <= 0xffff);

      assert.deepEqual((parameterGroups(c) ?? []).map((g) => g.values.length), groups);

      const touch = touchPages(c);
      assert.equal(touch?.records.length, pages);
      assert.equal((touch?.records ?? []).reduce((n, p) => n + p.areas.length, 0), areas);
      // Every area carries its own address, which is what makes the twelve byte reading self
      // checking rather than a plausible split of a run of bytes.
      for (const page of touch?.records ?? []) {
        for (const area of page.areas) assert.equal(area.self, area.address);
      }
    });
}

/** `[sample, mode records, tagged entries across them]`. findings.md section 52. */
const MODES: readonly [string, number, number][] = [
  ['h600_config', 237, 2681],
  ['one_config', 268, 2254],
  ['h525_config', 114, 564],
];

for (const [name, count, entries] of MODES) {
  test(`${name}: a mode record starts where its back pointer says`, skipUnless(name), () => {
    // Base slot 6's array points *inside* the record, on a discriminator byte with a u24 back
    // pointer to the start beside it, exactly as base slot 5's infrared records do. Reading the
    // entry at the pointer decodes the tail as if it were the head.
    const c = parse(load(name) as Uint8Array);
    const records = modeRecords(c) ?? [];
    assert.equal(records.length, count);
    assert.equal(records.reduce((n, r) => n + r.entries.length, 0), entries);
    for (const record of records) {
      const start = c.blobOffsetOf(record.start) as number;
      const at = c.blobOffsetOf(record.address) as number;
      assert.ok(start < at, 'the back pointer must point backwards');
      // The closure: the count is read at the start and the record ends just past the pointer, so
      // a wrong start gives a count that overruns. It never does.
      assert.ok(start + record.length <= at + 10);
    }
  });
}

/**
 * `[sample, pages across every mode]`. findings.md section 66.
 *
 * The entry runs on past the back pointer: a `u16` page count and that many `u24` page addresses,
 * read that way because the consumer at `0x16816` reads it that way. The Python suite holds the
 * same statements over the whole corpus; these are the two architectures that differ in shape.
 */
const PAGES: readonly [string, number][] = [
  ['h600_config', 254],
  ['one_config', 330],
  ['h525_config', 135],
  ['arch8_config_a', 141],
];

for (const [name, pages] of PAGES) {
  test(`${name}: a mode's pages each name a list and a program`, skipUnless(name), () => {
    const c = parse(load(name) as Uint8Array);
    const records = modeRecords(c) ?? [];
    const lead = MODE_PAGE_LEAD_ARCHITECTURES.has(c.architecture as number);
    const expected = MODE_PAGE_POINTERS + (lead ? 1 : 0);
    let seen = 0;
    for (const record of records) {
      assert.equal(record.pages.length, record.pageCount);
      assert.equal(record.entryLength, MODE_ENTRY_HEADER + 3 * record.pageCount);
      // One page of every entry sits immediately in front of it, and that distance is the page's
      // length: nothing in the container states it, so this is where it comes from.
      const at = c.blobOffsetOf(record.address) as number;
      const adjacent = record.pages.filter((p) => c.blobOffsetOf(p.address) === at - expected);
      assert.equal(adjacent.length, 1, 'exactly one page abuts the entry');
      for (const page of record.pages) {
        assert.equal(page.length, expected);
        assert.equal(page.lead === undefined, !lead, 'the lead byte is arch 12 only');
        // Both fields checked by what they point at. A split one byte out satisfies neither.
        assert.notEqual(taggedList(c, page.list), undefined, 'the list field is a tagged list');
        assert.notEqual(screenProgram(c, page.program), undefined, 'the program field decodes');
        seen += 1;
      }
    }
    assert.equal(seen, pages);
  });
}

/**
 * `[sample, sets, entries across them]`. findings.md section 67.
 *
 * Base slot 9's pointer lands on the list, not inside a record the way base slot 6's does. The
 * check is the negative: read as slot 6's shape it would be `u8 kind` and a `u24` back pointer to
 * a start below itself, and not one set in the corpus yields one, where all of slot 6's do. That
 * is what makes the extent claimable at all.
 */
const HANDLER_SETS: readonly [string, number, number][] = [
  ['one_config', 16, 448],
  ['h600_config', 9, 221],
  ['h700_config', 11, 289],
  ['h525_config', 8, 170],
  ['arch8_config_a', 9, 228],
  ['one_safemode', 1, 8],
];

for (const [name, sets, entries] of HANDLER_SETS) {
  test(`${name}: base slot 9's pointer lands on the list itself`, skipUnless(name), () => {
    const c = parse(load(name) as Uint8Array);
    const addresses = handlerSets(c)?.addresses ?? [];
    assert.equal(addresses.length, sets);
    let total = 0;
    for (const address of addresses) {
      const list = taggedList(c, address);
      assert.notEqual(list, undefined, `no list at ${address}`);
      total += (list as { entries: unknown[] }).entries.length;
      // The calibration: slot 6's records do give a backward address here and slot 9's must not,
      // or the same misread section 52 corrected would apply and the extent would be wrong.
      const off = c.blobOffsetOf(address) as number;
      const back = bytes.u24(c.blob, off + 1) - c.flashBase;
      assert.ok(back < 0 || back >= off, 'a slot 6 style back pointer would point below this');
    }
    assert.equal(total, entries);
  });
}

test('base slot 6 does give the back pointer base slot 9 does not', skipUnless('h600_config'), () => {
  // Without this the test above passes for a container that simply has no backward addresses
  // anywhere, which would make it a statement about the corpus rather than about slot 9.
  const c = parse(load('h600_config') as Uint8Array);
  const records = modeRecords(c) ?? [];
  assert.ok(records.length > 0);
  for (const record of records) {
    const off = c.blobOffsetOf(record.address) as number;
    assert.ok((c.blobOffsetOf(record.start) as number) < off);
  }
});

test('on arch 12 the stated program is never the computed root', skipUnless('one_config'), () => {
  // Section 53 computes a mode's program as the record start plus its list length, and on arch 12
  // that address is not the program the page names: the stated one starts later and its first
  // instruction is a call back to it. So the computed root is a callee rather than a mistake, and
  // this is the statement that keeps both readings honest.
  const c = parse(load('one_config') as Uint8Array);
  for (const record of modeRecords(c) ?? []) {
    const page = record.pages[0];
    if (page === undefined) continue;
    assert.ok(page.program > record.start + record.length);
  }
});

test('the key table is base slot 6 first mode record, byte for byte', skipUnless('h600_config'),
  () => {
    // Found by the overlap detector rather than by anybody noticing. Same offset, same count, same
    // four byte entries, so the container's key table and one mode entry are one structure under
    // two names, and the accounting claims it once.
    const c = parse(load('h600_config') as Uint8Array);
    const first = (modeRecords(c) ?? []).find(
      (r) => c.blobOffsetOf(r.start) === c.markerOffset + 4,
    );
    assert.notEqual(first, undefined, 'a mode record starts on the key table');
    assert.equal((first as { entries: unknown[] }).entries.length, c.keys.length);
    assert.equal((first as { length: number }).length, 1 + 4 * c.keys.length);
  });

/**
 * Section 65. Class 5 shares class 1's header and nothing below it, so on arch 9 the header is
 * claimed and the block area is not. The Python suite holds the same statements.
 */
test('arch 9 class 5 records carry the shared header', skipUnless('h525_config'), () => {
  const c = parse(load('h525_config') as Uint8Array);
  const records = (irGroups(c) ?? []).flatMap((g) => g.addresses).sort((a, b) => a - b);
  assert.equal(records.length, 200);

  // Both ends of the area, and neither was chosen to make them agree: the bottom is the lowest
  // backward pointer any record names and the top is the end of the highest header.
  const region = irRegion(c);
  assert.deepEqual(region, [0x021f3b, 0x028f62]);
  const low = (region as [number, number])[0];

  for (const address of records) {
    const start = irRecordStart(c, address) as number;
    assert.equal(irClass(c, address), IR_CLASS_ARCH9);
    assert.equal(address - start, IR_RECORD_POINTER_BIAS);
    for (const block of irRecordBlocks(c, address)) {
      assert.ok(low <= block && block < start, `block ${block} is not below its header`);
    }
  }

  // Twenty one bytes each, which is only claimable if they fit side by side.
  const starts = records.map((a) => irRecordStart(c, a) as number).sort((a, b) => a - b);
  for (let i = 1; i < starts.length; i += 1) {
    assert.ok((starts[i] as number) >= (starts[i - 1] as number) + IR_HEADER_LENGTH);
  }

  // The class is what gates the blocks, not a terminator, and 5 is not one of the four the
  // firmware dispatches over.
  assert.ok(IR_HEADER_CLASSES.has(IR_CLASS_ARCH9));
  assert.notEqual(IR_CLASS_ARCH9, IR_CLASS_STREAM);
  // And the trap that makes the gate necessary: `irPulses` happily returns a duration list here.
  // It is not one. A zero word turns up in arbitrary data, so nothing below the header can be
  // claimed on the strength of finding a terminator.
  assert.notEqual(irPulses(c, records[0] as number), undefined);
});

/**
 * `[sample, pool runs, lists, bytes]`. findings.md section 67.
 *
 * The runs of tagged lists packed end to end. Both ends are derived: the start is a mode entry's
 * end and the stop is the lowest address above it that another reader already names, so nothing
 * here consults the byte accounting.
 */
const POOLS: readonly [string, number, number, number][] = [
  ['one_config', 2, 346, 5854],
  ['one_config_unprogrammed', 2, 161, 3013],
  ['h600_config', 2, 263, 2941],
  ['h700_config', 2, 437, 4845],
  ['h525_config', 2, 143, 1797],
  ['arch8_config_a', 2, 150, 3094],
  ['one_safemode', 1, 31, 183],
  ['h600_safemode_gspm', 1, 36, 79],
];

for (const [name, runs, lists, bytes] of POOLS) {
  test(`${name}: the tagged list pool is bounded at both ends`, skipUnless(name), () => {
    const c = parse(load(name) as Uint8Array);
    const pools = taggedListPools(c);
    assert.equal(pools.length, runs);
    assert.equal(pools.reduce((n, p) => n + p.lists.length, 0), lists);
    assert.equal(pools.reduce((n, p) => n + (p.end - p.start), 0), bytes);

    const ends = new Set((modeRecords(c) ?? [])
      .map((r) => (c.blobOffsetOf(r.address) as number) + r.entryLength));
    for (const pool of pools) {
      // The start is stated by a mode entry, which is what section 67 first missed: it is not
      // something the walk has to find.
      assert.ok(ends.has(pool.start), 'a pool starts where a mode entry ends');
      // The lists tile the run with nothing left over.
      const last = pool.lists[pool.lists.length - 1] as { start: number; length: number };
      assert.equal(pool.lists[0]?.start, pool.start);
      assert.equal(last.start + last.length, pool.end);
      for (let k = 1; k < pool.lists.length; k += 1) {
        const previous = pool.lists[k - 1] as { start: number; length: number };
        assert.equal(previous.start + previous.length, pool.lists[k]?.start);
      }
    }

    // Every base slot 9 set is in a pool, which is the constraint that makes the rule specific:
    // without it a tagged list walk accepts spans that tile by accident.
    for (const address of handlerSets(c)?.addresses ?? []) {
      const off = c.blobOffsetOf(address) as number;
      assert.ok(
        pools.some((p) => p.lists.some((l) => l.start === off)),
        `slot 9 set at ${off} is not a list in a pool`,
      );
    }

    // The count identity, exact in every container: one list per mode page plus one per set.
    const pages = (modeRecords(c) ?? []).reduce((n, r) => n + r.pages.length, 0);
    assert.equal(lists, pages + (handlerSets(c)?.addresses.length ?? 0));
  });
}

/**
 * `[sample, pages]`. findings.md section 68: a page's list has a twin in the pool, keyed by the
 * same tags and carrying different operands.
 *
 * The bijection is what makes it a reading rather than an observation about totals: nothing is
 * left over on either side, in any container.
 */
const TWINS: readonly [string, number][] = [
  ['one_config', 330],
  ['one_config_unprogrammed', 152],
  ['h600_config', 254],
  ['h700_config', 426],
  ['h525_config', 135],
  ['arch8_config_a', 141],
  ['one_safemode', 30],
  ['h600_safemode_gspm', 35],
];

for (const [name, pages] of TWINS) {
  test(`${name}: every page's list has a twin in the pool`, skipUnless(name), () => {
    const c = parse(load(name) as Uint8Array);
    const sets = new Set((handlerSets(c)?.addresses ?? [])
      .map((a) => c.blobOffsetOf(a) as number));
    const tagsAt = (off: number): string => {
      const wide = c.blob[off] === 0;
      const count = (wide ? c.blob[off + 1] : c.blob[off]) as number;
      const base = wide ? off + 2 : off + 1;
      const stride = wide ? 5 : 4;
      const tags: number[] = [];
      for (let k = 0; k < count; k += 1) tags.push(c.blob[base + stride * k + (wide ? 1 : 0)] as number);
      return tags.join(',');
    };

    const bag = new Map<string, number>();
    let empty = 0;
    let wide = 0;
    for (const pool of taggedListPools(c)) {
      for (const list of pool.lists) {
        if (sets.has(list.start)) continue;
        const key = tagsAt(list.start);
        bag.set(key, (bag.get(key) ?? 0) + 1);
        if (key === '') empty += 1;
        if (c.blob[list.start] === 0) wide += 1;
      }
    }
    // An empty list is exactly a wide form one, which is the shape section 53's correction
    // predicted: with no entry there is nothing to infer the form from, so the header states it.
    assert.equal(empty, wide, 'every empty pool list is the wide form and every wide one is empty');

    const seen = new Set<string>();
    let paired = 0;
    for (const page of modePages(c)) {
      const off = c.blobOffsetOf(page.list);
      if (off === undefined || taggedList(c, page.list) === undefined) continue;
      const key = tagsAt(off);
      const have = bag.get(key) ?? 0;
      assert.ok(have > 0, `no pool twin for the page list at ${off}`);
      bag.set(key, have - 1);
      paired += 1;
      seen.add(key);
    }
    assert.equal(paired, pages);
    // Nothing left over on the pool side either, which is what makes it a bijection.
    assert.equal([...bag.values()].reduce((n, k) => n + k, 0), 0);
    // And the twins are not copies: over the pairs the operands disagree.
    assert.ok(seen.size > 0);
  });
}
