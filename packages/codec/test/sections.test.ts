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
  ACCUMULATOR_LOAD_OPCODE,
  Container,
  FAMILIES,
  FRAME_HEADER,
  NAME_LEVEL_STATE_VARIABLE,
  SECTION_ITEM_SIZE,
  SECTION_TABLE_OFFSET,
  Section,
  nameNodes,
  ACTION_NOOP_LIMIT,
  ACTION_LIST_INDEX_OPCODE,
  archSlot,
  coverage,
  DEVICE_ASSIGN_FIELD_BIT,
  DEVICE_ASSIGN_OPCODE,
  deviceAssignment,
  eventMap,
  handlerSets,
  IR_CLASS_ARCH9,
  IR_CLASS_STREAM,
  IR_HEADER_CLASSES,
  IR_HEADER_BASE,
  IR_HEADER_GROUP,
  IR_HEADER_LENGTH,
  IR_MAX_GROUPS,
  IR_QUANTITY_CAP,
  IR_QUANTITY_OPCODE,
  IR_RECORD_POINTER_BIAS,
  irClass,
  irClass5Body,
  irGroupCount,
  irHeaderLength,
  irQuantity,
  irGroups,
  irPulses,
  irRecordBlocks,
  irRecordStart,
  irRegion,
  irSymbolBlock,
  irSymbolTable,
  MODE_ENTRY_HEADER,
  MODE_PAGE_LEAD_ARCHITECTURES,
  MODE_PAGE_POINTERS,
  modePages,
  modeRecords,
  modeTable,
  pageListCopies,
  parameterGroups,
  parse,
  screenProgram,
  SECOND_SPACE_LIMIT,
  SECOND_SPACE_RANGES,
  subOpcode,
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
 * `[sample, records, pointers, bodies, index bytes, tables, blocks, body/table/block bytes]`.
 * findings.md section 82.
 *
 * Class 5 is class 1 with a dictionary: a header pointer names a body of indices, the body names a
 * symbol table, the table names pulse blocks. Pinned per sample because the sharing is the point:
 * 414 pointers reach 380 distinct bodies, and 380 bodies reach 5 tables.
 */
const CLASS5: readonly [string, number, number, number, number, number, number,
  number, number, number][] = [
  ['h525_config', 200, 414, 380, 22062, 5, 43, 23962, 134, 1680],
  ['h525_config_2', 107, 286, 266, 10270, 1, 7, 11600, 22, 82],
];

for (const [name, records, pointers, bodyCount, indexBytes, tableCount, blockCount,
  bodyBytes, tableBytes, blockBytes] of CLASS5) {
  test(`${name}: class 5 bodies, symbol tables and pulse blocks`, skipUnless(name), () => {
    const c = parse(load(name) as Uint8Array);
    const bodies = new Set<number>();
    const tables = new Set<number>();
    const symbols = new Set<number>();
    let seenRecords = 0;
    let seenPointers = 0;
    let seenIndexBytes = 0;
    for (const group of irGroups(c) ?? []) {
      for (const address of group.addresses) {
        assert.equal(irClass(c, address), IR_CLASS_ARCH9, 'arch 9 is class 5 throughout');
        seenRecords += 1;
        for (const pointer of irRecordBlocks(c, address)) {
          seenPointers += 1;
          bodies.add(pointer);
        }
      }
    }
    for (const address of bodies) {
      const body = irClass5Body(c, address);
      assert.notEqual(body, undefined);
      const { table, indices, length } = body as NonNullable<typeof body>;
      assert.equal(length, 5 + indices.length, 'a body is 5 + n');
      seenIndexBytes += indices.length;
      tables.add(table);
      // Every index is inside its own table. A wrong entry width or a wrong count offset would
      // show up here first, since the streams run to 702 indices.
      const symbolTable = irSymbolTable(c, table);
      assert.notEqual(symbolTable, undefined);
      const { symbols: entries } = symbolTable as NonNullable<typeof symbolTable>;
      for (const index of indices) {
        assert.ok(index < entries.length, `index ${index} of ${entries.length}`);
      }
      for (const symbol of entries) symbols.add(symbol);
    }
    assert.equal(seenRecords, records);
    assert.equal(seenPointers, pointers);
    assert.equal(bodies.size, bodyCount);
    assert.equal(seenIndexBytes, indexBytes);
    assert.equal(tables.size, tableCount);
    assert.equal(symbols.size, blockCount);

    // The independent closure: a table sits exactly on top of the last of its own blocks. Nothing
    // in the reader arranges that, so a wrong stride would move one end and not the other.
    for (const address of tables) {
      const table = irSymbolTable(c, address) as NonNullable<ReturnType<typeof irSymbolTable>>;
      let top = 0;
      for (const symbol of table.symbols) {
        const block = irSymbolBlock(c, symbol) as NonNullable<ReturnType<typeof irSymbolBlock>>;
        top = Math.max(top, block.start + block.length);
      }
      assert.equal(table.start, top, 'the table follows its own blocks with nothing between');
    }

    // Every block ends in a zero word, which the firmware does not read: the count already said
    // where the block stops. So this is an observation about the generator, and the emitter writes
    // a zero rather than copying one.
    let blocks = 0;
    for (const symbol of symbols) {
      const block = irSymbolBlock(c, symbol) as NonNullable<ReturnType<typeof irSymbolBlock>>;
      assert.equal(block.length, 4 + 2 * block.pulses.length);
      const end = block.start + block.length;
      assert.equal(c.blob[end - 2], 0);
      assert.equal(c.blob[end - 1], 0);
      blocks += block.length;
    }

    const owners = new Map(coverage(c).byOwner);
    assert.equal(owners.get('slot-5-class5-body'), bodyBytes);
    assert.equal(owners.get('slot-5-symbol-table'), tableBytes);
    assert.equal(owners.get('slot-5-symbol-block'), blockBytes);
    assert.equal(blocks, blockBytes, 'what the reader walks is what the accounting claims');
  });
}

test('a class 5 body expands to an ordinary NEC frame', skipUnless('h525_config'), () => {
  // The closure that says the three levels mean what they are claimed to mean. Nothing above
  // checks a duration; this expands one code the way the sender would and asks whether the result
  // is a real infrared protocol. findings.md section 82.
  const c = parse(load('h525_config') as Uint8Array);
  const first = (irGroups(c) ?? [])[0]?.addresses[0] as number;
  const body = irClass5Body(c, irRecordBlocks(c, first)[0] as number);
  const { table, indices } = body as NonNullable<typeof body>;
  const entries = (irSymbolTable(c, table) as NonNullable<ReturnType<typeof irSymbolTable>>)
    .symbols;
  const pulses = indices.flatMap(
    (i) => (irSymbolBlock(c, entries[i] as number) as NonNullable<
      ReturnType<typeof irSymbolBlock>
    >).pulses,
  ).map((w) => ({ mark: w >> 15 === 1, microseconds: w & 0x7fff }));

  // NEC: a 9000 and 4500 header, 32 bits of a 560 mark with a 560 or 1690 space, a trailing mark.
  // The stored values are the generator's own, so they are near those rather than equal to them.
  const header = pulses.findIndex((p) => p.mark && p.microseconds === 8990);
  assert.ok(header >= 0, 'a header mark');
  assert.equal(pulses[header + 1]?.microseconds, 4490);
  const bits = pulses.slice(header + 2, header + 2 + 64);
  assert.equal(bits.length, 64, '32 bits of mark and space');
  const zero = bits.filter((p, i) => i % 2 === 1 && p.microseconds === 552).length;
  const one = bits.filter((p, i) => i % 2 === 1 && p.microseconds === 1662).length;
  assert.equal(zero + one, 32, 'every space is one of two values');
  for (let i = 0; i < 64; i += 2) assert.equal(bits[i]?.microseconds, 568, 'every mark is 568');

  // And a repeat frame further down, which is the other half of NEC and the reason the tail
  // symbols are shared by every code in the table.
  assert.ok(
    pulses.some((p, i) => p.mark && p.microseconds === 8990
      && pulses[i + 1]?.microseconds === 2230),
    'a 9000 and 2250 repeat header',
  );
  // A gap longer than a fifteen bit field is split rather than truncated.
  assert.ok(pulses.some((p) => !p.mark && p.microseconds === 0x7fff));
});

test('class 5 is read on the class byte and nothing else', skipUnless('h600_config'), () => {
  // The negative. Class 1's pointers name duration streams, so the class 5 readers must not touch
  // them, and the accounting is where that shows: an arch 14 container claims no body, no symbol
  // table and no symbol block.
  const c = parse(load('h600_config') as Uint8Array);
  const owners = new Map(coverage(c).byOwner);
  for (const owner of ['slot-5-class5-body', 'slot-5-symbol-table', 'slot-5-symbol-block']) {
    assert.equal(owners.get(owner), undefined, `${owner} claimed on a class 1 container`);
  }
  assert.ok((owners.get('slot-5-block') ?? 0) > 0, 'class 1 blocks are claimed instead');
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
    // The pairing is by content, so at least one tag sequence has to be distinguishing for the
    // bijection above to mean anything.
    assert.ok(seen.size > 0);
  });
}

/**
 * `[sample, pages, 0x7f pairs]`. findings.md section 69: the pool list is a second copy of the
 * page's own list, identical in meaning, and the k-th copy belongs to the k-th page.
 *
 * The bijection above pairs by tag sequence, which is weaker than it looks when most sequences
 * repeat. This pairs by **rank** instead, which is the reading, and then demands that every
 * paired entry agrees in form, tag, flags, opcode and operand, with opcode `0x7F` allowed to name
 * a different base slot 10 entry only when that entry holds an identical action list.
 */
const COPIES: readonly [string, number, number][] = [
  ['one_config', 330, 835],
  ['one_config_unprogrammed', 152, 425],
  ['h600_config', 254, 308],
  ['h700_config', 426, 610],
  ['h525_config', 135, 153],
  ['arch8_config_a', 141, 406],
  // The safe mode containers have pages and copies but no `0x7F` at all, which is the negative
  // case: the rank pairing has to hold there too, on nothing but tags and opcodes.
  ['one_safemode', 30, 0],
  ['h600_safemode_gspm', 35, 0],
];

for (const [name, pages, sevenF] of COPIES) {
  test(`${name}: a page's list copy is the same list in meaning`, skipUnless(name), () => {
    const c = parse(load(name) as Uint8Array);
    const table = c.pointerArray(archSlot(c.architecture as number, 10)) as number[];
    // Two table entries are the same action list when they decode to the same instructions, which
    // is the whole point: the indices differ and what they name does not.
    const body = (index: number): string =>
      (c.actionList(table[index] as number) ?? [])
        .map((i) => `${i.opcode}:${i.operand}`)
        .join(' ');

    const copies = pageListCopies(c);
    const pageList = modePages(c);
    assert.equal(copies.length, pageList.length, 'one copy per page');
    assert.equal(pageList.length, pages);

    let pairs = 0;
    pageList.forEach((page, k) => {
      const mine = taggedList(c, page.list);
      // `pageListCopies` reports blob offsets, `taggedList` takes flash addresses, and conflating
      // the two is the mistake this repository has already paid for once.
      const copy = taggedList(c, (copies[k] as number) + c.flashBase);
      assert.notEqual(mine, undefined);
      assert.notEqual(copy, undefined);
      const a = mine as NonNullable<typeof mine>;
      const b = copy as NonNullable<typeof copy>;
      assert.equal(a.entries.length, b.entries.length, `page ${k} entry count`);
      a.entries.forEach((x, i) => {
        const y = b.entries[i] as typeof x;
        assert.equal(x.tag, y.tag, `page ${k} entry ${i} tag`);
        assert.equal(x.flags, y.flags, `page ${k} entry ${i} flags, so the form agrees too`);
        assert.equal(x.opcode, y.opcode, `page ${k} entry ${i} opcode`);
        if (x.opcode === ACTION_LIST_INDEX_OPCODE) {
          pairs += 1;
          assert.equal(body(x.operand), body(y.operand), `page ${k} entry ${i} action list`);
        } else {
          assert.equal(x.operand, y.operand, `page ${k} entry ${i} operand`);
        }
      });
    });
    assert.equal(pairs, sevenF);
  });
}

/** `[sample, the best score any shifted pairing reaches]`. findings.md section 69. */
const SHIFTED: readonly [string, number][] = [
  ['one_config', 192],
  ['h600_config', 109],
  ['h700_config', 168],
];

for (const [name, best] of SHIFTED) {
  test(`${name}: pairing the copies off by one stops agreeing`, skipUnless(name), () => {
    const c = parse(load(name) as Uint8Array);
    const copies = pageListCopies(c);
    const pageList = modePages(c);
    // The calibration this repository asks for: run the same comparison against a pairing that is
    // known to be wrong and record what it scores. Without it, agreement on tags proves nothing,
    // because most pages carry the same one or two tags as their neighbours.
    const agree = (shift: number): number => {
      let ok = 0;
      pageList.forEach((page, k) => {
        const a = taggedList(c, page.list);
        const b = taggedList(c, (copies[(k + shift) % copies.length] as number) + c.flashBase);
        if (a === undefined || b === undefined) return;
        if (a.entries.length !== b.entries.length) return;
        if (a.entries.every((x, i) => x.tag === b.entries[i]?.tag && x.opcode === b.entries[i]?.opcode)) {
          ok += 1;
        }
      });
      return ok;
    };
    assert.equal(agree(0), pageList.length, 'the stated pairing agrees everywhere');
    assert.equal(Math.max(agree(1), agree(2)), best, 'and a shifted one does not');
    assert.ok(best < pageList.length);
  });
}

/**
 * `[sample, copies, pointers naming one, what chance predicts]`. findings.md section 69.
 *
 * The negative that carries the reading: nothing names a copy. Every byte position in the
 * container is read as a `u24` and matched against every copy's address, which is the most
 * permissive search there is, and it still comes back under the count a uniform random container
 * of the same size would produce. Recorded with the chance figure so a future reader can see that
 * the handful of hits is noise rather than a route nobody followed.
 */
const UNNAMED: readonly [string, number, number][] = [
  ['one_config', 330, 13],
  ['h600_config', 254, 1],
  ['h700_config', 426, 4],
  ['h525_config', 135, 0],
  ['arch8_config_a', 141, 0],
];

for (const [name, count, hits] of UNNAMED) {
  test(`${name}: nothing in the container names a page list copy`, skipUnless(name), () => {
    const c = parse(load(name) as Uint8Array);
    const copies = pageListCopies(c);
    assert.equal(copies.length, count);
    const want = new Set(copies.map((off) => off + c.flashBase));
    let found = 0;
    for (let i = 0; i + 3 <= c.blob.length; i += 1) {
      if (want.has(bytes.u24(c.blob, i))) found += 1;
    }
    assert.equal(found, hits);
    // Three byte windows over a blob this size hit any given set of addresses at this rate by
    // chance alone. Being at or under it is the claim; the exact count above is only the pin.
    const chance = (c.blob.length * want.size) / 0x1000000;
    assert.ok(found <= chance, `${found} hits against ${chance.toFixed(1)} expected by chance`);
  });
}

/**
 * `[sample, uses, infrared groups]`. findings.md section 70: opcode `0x7C` carries a per group
 * quantity capped at 100, and its group is always one the infrared table has.
 *
 * The same closure section 33 used for `0x7D`, applied to its companion: the operand is checked
 * against a table it was not derived from.
 */
const QUANTITY: readonly [string, number, number, number][] = [
  ['h700_config', 7272, 6, 100],
  ['h600_config', 4788, 4, 100],
  // The cap is only reached where a quantity above it is spelled out, which arch 12 and arch 9
  // never do in this corpus. So the largest value is a per sample measurement, not the cap.
  ['one_config', 345, 5, 60],
  ['arch8_config_a', 242, 3, 100],
  ['h525_config', 203, 4, 95],
];

for (const [name, uses, groups, largest] of QUANTITY) {
  test(`${name}: every 0x7C names a group the infrared table has`, skipUnless(name), () => {
    const c = parse(load(name) as Uint8Array);
    const table = c.pointerArray(archSlot(c.architecture as number, 10)) as number[];
    assert.equal(irGroups(c)?.length, groups);
    let seen = 0;
    let highest = -1;
    for (const address of table) {
      for (const i of c.actionList(address) ?? []) {
        if (i.opcode !== IR_QUANTITY_OPCODE) continue;
        seen += 1;
        const group = i.operand >>> 8;
        const value = i.operand & 0xff;
        assert.ok(group < groups, `group ${group} against ${groups} infrared groups`);
        assert.ok(group < IR_MAX_GROUPS, 'the queue tag has four bits for the group');
        assert.ok(value <= IR_QUANTITY_CAP, `value ${value} above the cap the firmware enforces`);
        highest = Math.max(highest, value);
      }
    }
    assert.equal(seen, uses);
    assert.equal(highest, largest);
    assert.ok(highest <= IR_QUANTITY_CAP);
  });
}

/**
 * `[sample, groups, lists per group]`. findings.md section 70's closure.
 *
 * Arch 14 carries a generated table of quantities spelled out in capped instructions. Every group
 * gets every total from 101 to 450, once, and nothing else, which is what says the run really does
 * sum rather than merely look like it.
 */
const QUANTITY_TABLE: readonly [string, number, number][] = [
  ['h700_config', 6, 350],
  ['h700_config_2', 6, 350],
  ['h600_config', 4, 350],
];

for (const [name, groups, per] of QUANTITY_TABLE) {
  test(`${name}: the spelled out quantities run 101 to 450 in every group`, skipUnless(name), () => {
    const c = parse(load(name) as Uint8Array);
    const table = c.pointerArray(archSlot(c.architecture as number, 10)) as number[];
    const totals = new Map<number, Set<number>>();
    let lists = 0;
    for (const address of table) {
      const list = c.actionList(address) ?? [];
      if (list.length < 2 || !list.every((i) => i.opcode === IR_QUANTITY_OPCODE)) continue;
      const run = irQuantity(list);
      // A list made entirely of this opcode has to be one well formed run, or the reading is
      // wrong: `irQuantity` refuses a cap anywhere but the end and a change of group.
      assert.notEqual(run, undefined, 'a list of nothing but 0x7C is one run');
      const q = run as NonNullable<typeof run>;
      assert.equal(q.instructions, list.length);
      if (!totals.has(q.group)) totals.set(q.group, new Set());
      const set = totals.get(q.group) as Set<number>;
      assert.ok(!set.has(q.amount), `${q.amount} appears twice in group ${q.group}`);
      set.add(q.amount);
      lists += 1;
    }
    assert.equal(totals.size, groups);
    for (const [group, set] of totals) {
      assert.equal(set.size, per, `group ${group}`);
      const sorted = [...set].sort((a, b) => a - b);
      assert.equal(sorted[0], 101);
      assert.equal(sorted[sorted.length - 1], 450);
      sorted.forEach((v, i) => assert.equal(v, 101 + i, 'contiguous, with no total missing'));
    }
    assert.equal(lists, groups * per);
  });
}

test('a quantity run refuses a shape that is not cap then remainder', () => {
  const at = (group: number, value: number) => ({ operand: (group << 8) | value, opcode: 0x7c });
  // The reading, spelled the way the corpus spells it.
  assert.deepEqual(irQuantity([at(2, 100), at(2, 45)]), { group: 2, amount: 145, instructions: 2 });
  assert.deepEqual(irQuantity([at(2, 100), at(2, 100)]), { group: 2, amount: 200, instructions: 2 });
  assert.deepEqual(irQuantity([at(0, 7)]), { group: 0, amount: 7, instructions: 1 });
  // A run that stops at a different group is that group's business, not this run's.
  assert.deepEqual(irQuantity([at(1, 100), at(3, 4)]), { group: 1, amount: 100, instructions: 1 });
  // And the refusals, which are what stop this summing something it has not read.
  assert.equal(irQuantity([at(2, 45), at(2, 100)]), undefined, 'a cap before the end');
  assert.equal(irQuantity([{ operand: 0, opcode: 0x7d }]), undefined, 'a different opcode');
  assert.equal(irQuantity([]), undefined);
});

/**
 * `[sample, pairs, keys, infrared groups]`. findings.md section 71.
 *
 * `0x6C` never stands alone: it is always the second half of a load-then-assign pair, and the
 * number of distinct keys is the number of infrared groups. Per key the corpus enumerates one
 * field exhaustively from 0 to 450 and the other from 0 to 20, which is what says the two are
 * fields of one record rather than one number with a high bit set.
 */
const ASSIGNMENTS: readonly [string, number, number][] = [
  ['h700_config', 2832, 6],
  ['h700_config_2', 2832, 6],
  ['h600_config', 1888, 4],
];

for (const [name, pairs, keys] of ASSIGNMENTS) {
  test(`${name}: every 0x6C is a device assignment, one key per infrared group`,
    skipUnless(name), () => {
      const c = parse(load(name) as Uint8Array);
      const table = c.pointerArray(archSlot(c.architecture as number, 10)) as number[];
      const byKey = new Map<number, [Set<number>, Set<number>]>();
      let seen = 0;
      let alone = 0;
      for (const address of table) {
        const list = c.actionList(address) ?? [];
        list.forEach((i, k) => {
          if (i.opcode !== DEVICE_ASSIGN_OPCODE) return;
          seen += 1;
          if (list[k - 1]?.opcode !== ACCUMULATOR_LOAD_OPCODE) { alone += 1; return; }
          const a = deviceAssignment(list, k - 1) as NonNullable<ReturnType<typeof deviceAssignment>>;
          if (!byKey.has(a.key)) byKey.set(a.key, [new Set(), new Set()]);
          (byKey.get(a.key) as [Set<number>, Set<number>])[a.field as 0 | 1].add(a.value);
        });
      }
      assert.equal(seen, pairs);
      // The negative that makes the pairing a reading: not one use stands on its own.
      assert.equal(alone, 0, 'a 0x6C with no accumulator load before it');
      assert.equal(byKey.size, keys);
      assert.equal(irGroups(c)?.length, keys, 'one key per infrared group');
      for (const [key, [plain, flagged]] of byKey) {
        const check = (set: Set<number>, top: number) => {
          const v = [...set].sort((a, b) => a - b);
          assert.equal(v.length, top + 1, `key 0x${key.toString(16)}`);
          v.forEach((x, i) => assert.equal(x, i, 'contiguous from zero'));
        };
        check(plain, 450);
        check(flagged, 20);
      }
    });
}

test('a device assignment is refused unless both halves are there', () => {
  const load16 = (v: number) => ({ operand: v, opcode: ACCUMULATOR_LOAD_OPCODE });
  const assign = (v: number) => ({ operand: v, opcode: DEVICE_ASSIGN_OPCODE });
  assert.deepEqual(deviceAssignment([load16(0x1e04), assign(450)]),
    { key: 0x1e04, field: 0, value: 450 });
  // Bit 15 is stripped into its own field, which is what the handler does before storing.
  assert.deepEqual(deviceAssignment([load16(0x1e04), assign(DEVICE_ASSIGN_FIELD_BIT | 20)]),
    { key: 0x1e04, field: 1, value: 20 });
  assert.equal(deviceAssignment([assign(1), load16(2)]), undefined, 'the wrong way round');
  assert.equal(deviceAssignment([load16(1)]), undefined, 'no assign');
  assert.equal(deviceAssignment([]), undefined);
});

/**
 * findings.md section 72: below `0x65` the operand carries a second opcode field.
 *
 * The corpus check is the closure. Exactly five opcodes appear below the limit, one per range the
 * dispatcher splits into, and not one instruction lands in a band the firmware states it ignores.
 */
// The names this needs, listed once so the guard and the loop cannot drift apart. Guarded up front
// rather than by `continue`, because the totals below are corpus wide: skipping a sample inside the
// loop lets the loop finish and the aggregates then assert against zero. Same shape as the Python
// failure trelowney reported on 10 August 2026, and `make test-nolab` now runs both sides.
const SECOND_SPACE_SAMPLES = ['h700_config', 'h700_config_2', 'h600_config', 'one_config',
  'one_config_unprogrammed', 'arch8_config_a', 'h525_config'];

test('the second operand space is a sub opcode field, and nothing lands outside it',
    skipUnless(...SECOND_SPACE_SAMPLES), () => {
  const seen = new Map<number, number>();
  let total = 0;
  let ignored = 0;
  let noop = 0;
  let noopArgument = 0;
  for (const name of SECOND_SPACE_SAMPLES) {
    const blob = load(name);
    if (blob === undefined) continue;
    const c = parse(blob);
    const table = c.pointerArray(archSlot(c.architecture as number, 10));
    if (table === undefined) continue;
    for (const address of table) {
      for (const i of c.actionList(address) ?? []) {
        if (i.opcode >= SECOND_SPACE_LIMIT) continue;
        total += 1;
        seen.set(i.opcode, (seen.get(i.opcode) ?? 0) + 1);
        if (i.opcode < ACTION_NOOP_LIMIT) {
          noop += 1;
          // The dispatcher returns before looking at the operand, and the generator emits zero.
          if (i.operand !== 0) noopArgument += 1;
          assert.equal(subOpcode(i), undefined);
          continue;
        }
        const sub = subOpcode(i) as NonNullable<ReturnType<typeof subOpcode>>;
        assert.equal(sub.byte, i.opcode >= 0x1f ? 'high' : 'low');
        // The two bands the firmware states it ignores.
        if (i.opcode >= 0x3f && sub.value < 0xb0) ignored += 1;
        if (i.opcode >= 0x0f && i.opcode < 0x1f && sub.value >= 0xf0) ignored += 1;
      }
    }
  }
  assert.equal(total, 9725, 'instructions below the limit in these seven containers');
  assert.equal(ignored, 0, 'an instruction the firmware would silently drop');
  assert.equal(noopArgument, 0, 'a no-op carrying an operand');
  assert.equal(noop, 2075);
  // One opcode per range, and each is the top of its range, which is 2^n - 1.
  assert.deepEqual([...seen.keys()].sort((a, b) => a - b), [0x00, 0x07, 0x0f, 0x1f, 0x3f]);
  for (const boundary of SECOND_SPACE_RANGES) {
    assert.equal(boundary & (boundary + 1), 0, `0x${boundary.toString(16)} is 2^n - 1`);
  }
});

/**
 * Section 75: an infrared record header is a counted list of pointer groups.
 *
 * The count is the discriminator, so these tests are about it rather than about the bytes: one
 * number explains a short header, an unclaimed block and the gap between them, and getting it
 * wrong is what left arch 8 short of a hundred percent for as long as the accounting existed.
 */
const GROUPS: [string, number, Record<number, number>][] = [
  ['arch8_config_a', 8, { 1: 197, 2: 37 }],
  ['arch8_config_c', 8, { 1: 417, 2: 37 }],
  ['h700_config', 14, { 1: 350 }],
  ['one_config', 12, { 1: 328 }],
  ['h525_config', 9, { 1: 139, 2: 61 }],
];

for (const [name, architecture, expected] of GROUPS) {
  test(`${name}: the header states how many pointer groups it has`, skipUnless(name), () => {
    const c = parse(load(name)!);
    assert.equal(c.architecture, architecture);
    const counts: Record<number, number> = {};
    for (const group of irGroups(c) ?? []) {
      for (const address of group.addresses) {
        const n = irGroupCount(c, address);
        counts[n] = (counts[n] ?? 0) + 1;
        // The header length follows from the count and nothing else.
        assert.equal(irHeaderLength(c, address), IR_HEADER_BASE + IR_HEADER_GROUP * n);
      }
    }
    assert.deepEqual(counts, expected);
  });
}

test('only arch 8 and arch 9 carry a second pointer group', skipUnless('one_config'), () => {
  // The reason section 61 read the header as a flat 21 bytes and it held for three architectures:
  // a count of one is exactly that header. Assert the negative, or the reading is untested.
  for (const name of ['one_config', 'h700_config', 'h600_config']) {
    if (!load(name)) continue;
    const c = parse(load(name)!);
    for (const group of irGroups(c) ?? []) {
      for (const address of group.addresses) {
        assert.equal(irGroupCount(c, address), 1, `${name} at 0x${address.toString(16)}`);
        assert.equal(irHeaderLength(c, address), IR_HEADER_LENGTH);
      }
    }
  }
});

test('every arch 8 config has exactly 37 two group records', skipUnless('arch8_config_a'), () => {
  // The four configs carry 234, 397, 454 and 462 records between them, and the count of two group
  // ones does not move. Whatever selects the second group, it is not how much the config holds.
  for (const name of ['arch8_config_a', 'arch8_config_b', 'arch8_config_c', 'arch8_config_d']) {
    if (!load(name)) continue;
    const c = parse(load(name)!);
    let two = 0;
    for (const group of irGroups(c) ?? []) {
      for (const address of group.addresses) if (irGroupCount(c, address) === 2) two += 1;
    }
    assert.equal(two, 37, name);
  }
});

test('a second group names blocks the first does not', skipUnless('arch8_config_a'), () => {
  const c = parse(load('arch8_config_a')!);
  let twoGroup = 0;
  for (const group of irGroups(c) ?? []) {
    for (const address of group.addresses) {
      if (irGroupCount(c, address) !== 2) continue;
      twoGroup += 1;
      const blocks = irRecordBlocks(c, address);
      // Every one of the 37 names at least one block beyond the first group's three pointers,
      // which is what the unclaimed tails were.
      const off = c.blobOffsetOf(irRecordStart(c, address)!)!;
      const byte = (at: number): number => c.blob[at] ?? 0;
      const first = [0, 3, 6]
        .map((d) => byte(off + IR_HEADER_BASE + d) |
          (byte(off + IR_HEADER_BASE + d + 1) << 8) |
          (byte(off + IR_HEADER_BASE + d + 2) << 16))
        .filter((v) => v !== 0);
      assert.ok(blocks.length > first.length, `0x${address.toString(16)} gained no block`);
    }
  }
  assert.equal(twoGroup, 37);
});

/**
 * Base slot 0's named nodes, section 77.
 *
 * The corpus wide closures are the argument, so they are the test: the nodes tile the frame
 * exactly, level 0's indices are a permutation, and every level 1 index is inside base slot 13's
 * count. Each one would fail on a wrong node stride, which is the mistake this reading could make.
 */
const FRAMED: readonly [string, number][] = [
  ['h700_gspm', 2],
  ['h600_safemode_gspm', 2],
  ['h650_safemode_gspm', 2],
  ['h525_config', 13],
  ['h525_config_2', 9],
  ['arch8_config_a', 12],
  ['arch8_config_b', 17],
  ['arch8_config_c', 18],
  ['arch8_config_d', 18],
  ['one_config', 14],
  ['one_config_unprogrammed', 9],
  ['h600_config', 43],
  ['h700_config', 62],
  ['h700_config_2', 62],
  ['one_spare_before_sync', 9],
  ['one_spare_after_sync', 7],
];

/**
 * The two containers with no nodes, and they are not a gap in the reading. Both are the One's safe
 * mode config, whose frame is the degenerate empty one: cookie, a zero length, a zero byte,
 * terminator. `nameNodes` refusing them is the same refusal it gives a misread frame, which is why
 * the caller checks `frameLength` first.
 */
const UNFRAMED = ['one34_region2', 'one_safemode'];

for (const [name, count] of FRAMED) {
  test(`${name} holds ${count} named nodes that tile its frame`, skipUnless(name), () => {
    const c = parse(load(name) as Uint8Array);
    const nodes = nameNodes(c);
    assert.ok(nodes !== undefined, 'the frame did not read as nodes');
    assert.equal(nodes.length, count);
    // Tiling: `nameNodes` returns undefined unless the walk lands on the stated end, so this
    // checks the arithmetic from the other side rather than trusting that refusal.
    const total = nodes.reduce((n, node) => n + node.length, 0);
    assert.equal(total + FRAME_HEADER, c.frameLength as number);

    const level0 = nodes.filter((n) => n.level === 0).map((n) => n.index).sort((a, b) => a - b);
    assert.deepEqual(level0, level0.map((_, i) => i), 'level 0 indices are a permutation');

    const state = stateTable(c);
    for (const node of nodes.filter((n) => n.level === NAME_LEVEL_STATE_VARIABLE)) {
      assert.ok(state !== undefined && node.index < state.count,
        `${node.name} indexes state variable ${node.index} of ${state?.count}`);
    }
  });
}

for (const name of UNFRAMED) {
  test(`${name} has an empty frame and therefore no nodes`, skipUnless(name), () => {
    const c = parse(load(name) as Uint8Array);
    assert.equal(c.frameLength, 0);
    assert.equal(nameNodes(c), undefined);
  });
}

test('the framed containers span four architectures', () => {
  // The house habit: a reading confirmed on one value of a variable is not confirmed. Sixteen of
  // the eighteen containers are framed and they cover arch 8, 9, 12 and 14, so the node layout is
  // not an arch 12 accident.
  const architectures = new Set<number>();
  for (const [name] of FRAMED) {
    const data = load(name);
    if (data === undefined) continue;
    const arch = parse(data).architecture;
    if (arch !== undefined) architectures.add(arch);
  }
  if (architectures.size === 0) return; // no lab
  assert.deepEqual([...architectures].sort((a, b) => a - b), [8, 9, 12, 14]);
});

test('a node stride one byte out stops the frame tiling', skipUnless('one_config'), () => {
  // The negative. A walk that cannot fail proves nothing, and an off by one in the node header is
  // exactly the mistake available here: the stated length counts the two u16 fields and not the
  // tag, so reading it as either neighbour still produces plausible names for a while.
  const c = parse(load('one_config') as Uint8Array);
  const start = c.blobOffsetOf((c.sections[0] as { address: number }).address) as number;
  const blob = Uint8Array.from(c.blob);
  const at = start + FRAME_HEADER + 1; // the first node's stated length
  blob[at] = ((blob[at] as number) + 1) & 0xff;
  const broken = new Container({ ...c, blob });
  assert.equal(nameNodes(broken), undefined);
});

test('the first node is not always called Root, which is what opened this section', () => {
  // `Root` was recorded as a fixed prologue for months and it is simply the name of the first
  // node in every config anyone had. The arch 9 safe mode container's first node is a state
  // variable, so the prologue reading would refuse a container the firmware accepts. The container
  // itself is not in the corpus yet, section 76, so this pins the shape rather than that sample.
  const blob = new Uint8Array(64);
  blob.set([0xed, 0xfe, 0x00, 0x00, 0x00], 0);
  // One node, level 1, index 14, named "A".
  blob.set([0xa7, 0x05, 0x00, 0x01, 0x00, 0x0e, 0x00, 0x41], FRAME_HEADER);
  const length = FRAME_HEADER + 8;
  blob[2] = length & 0xff;
  blob.set([0xef, 0xbe], length);
  const c = new Container({
    // A nonzero flash base, because address zero is how a NULL section is spelled and slot 0
    // has to be a real one here.
    blobOffset: 0, length: blob.length, flashBase: 0x1000, endAddr: blob.length - 4,
    formatRaw: 0x1400, pointerCount: 2, markerOffset: SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE * 2,
    marker: 'CMAH', family: FAMILIES[0] as (typeof FAMILIES)[number], trailerChecksum: 0, blob,
    sections: [new Section(0, 0x1000), new Section(1, 0)],
  });
  c.frameLength = length;
  const nodes = nameNodes(c);
  assert.ok(nodes !== undefined);
  assert.deepEqual(nodes.map((n) => [n.level, n.index, n.name]), [[1, 14, 'A']]);
});

/**
 * findings.md section 102: the arch 12 `0x3F` band `0xC0` selector respects a firmware bound.
 *
 * `0x24F24` accepts 0 to 12 plus 16 and 17 and drops the other seventeen values of a five bit
 * field. That the data never uses one of the dropped values is the field split confirming itself,
 * and it is the only closure this band has, since its uses do not vary with what the config
 * describes.
 */
test('the arch 12 0xC0 band only ever selects what its handler accepts',
    skipUnless('one_config', 'one_config_unprogrammed'), () => {
  const accepted = new Set([...Array.from({ length: 13 }, (_, i) => i), 16, 17]);
  const perConfig: {
    total: number;
    distinct: number;
    dominant: number;
    light: number;
    pin: number;
  }[] = [];
  for (const name of ['one_config', 'one_config_unprogrammed']) {
    const c = parse(load(name) as Uint8Array);
    const combinations = new Map<string, number>();
    let total = 0;
    for (const address of c.pointerArray(archSlot(c.architecture as number, 10)) ?? []) {
      for (const i of c.actionList(address) ?? []) {
        if (i.opcode !== 0x3f) continue;
        const high = i.operand >>> 8;
        if (high < 0xc0 || high > 0xcf) continue;
        total += 1;
        const selector = (i.operand >>> 4) & 0x1f;
        assert.ok(accepted.has(selector), `selector ${selector} is one the handler drops`);
        const key = `${selector}/${(i.operand >>> 1) & 7}/${i.operand & 1}`;
        combinations.set(key, (combinations.get(key) ?? 0) + 1);
      }
    }
    perConfig.push({
      total,
      distinct: combinations.size,
      dominant: combinations.get('17/6/0') ?? 0,
      light: [...combinations].filter(([k]) => k.startsWith('17/'))
        .reduce((n, [, v]) => n + v, 0),
      pin: [...combinations].filter(([k]) => k.startsWith('16/')).reduce((n, [, v]) => n + v, 0),
    });
  }
  // Identical in both, which is the finding: one config has five devices and eight activities and
  // the other has one and one, so this band carries none of that. A future config that differs here
  // is the sample that could tie it to content, and it should fail this test loudly.
  assert.deepEqual(perConfig[0], perConfig[1]);
  // `light` is selector 17, the display light state machine, and it is the majority. `dominant` is
  // its state 6 without a fade, "bring the light up to whatever the band says", which is 64 of the
  // 68 on its own. Section 103.
  assert.deepEqual(perConfig[0],
    { total: 106, distinct: 33, dominant: 64, light: 68, pin: 2 });
});

/**
 * findings.md section 103: what base slot 15's four display light groups carry, in the config.
 *
 * The firmware side is `tests/test_backlight.py`. This is the other half: the values a real config
 * puts in those groups, checked against the constraints the firmware imposes on them rather than
 * against a copy of themselves. A level above the ceiling would be silently refused by the setter,
 * so a writer needs this to be a rail.
 */
test('base slot 15s display light groups obey the bounds the firmware imposes',
    skipUnless('one_config', 'one_config_unprogrammed'), () => {
  const LEVEL_CEILING = 27; // the number of distinct CVREF settings the part can produce
  for (const name of ['one_config', 'one_config_unprogrammed']) {
    const c = parse(load(name) as Uint8Array);
    const groups = parameterGroups(c);
    assert.ok(groups !== undefined, name);
    const values = (index: number) => (groups[index] as { values: number[] }).values;

    // Group 1: six entries, of which the code reads all six and keeps the last four as levels.
    const group1 = values(1);
    assert.equal(group1.length, 6, `${name}: the length the guard demands`);
    const levels = group1.slice(2);
    for (const level of levels) {
      assert.ok(level <= LEVEL_CEILING, `${name}: level ${level} is above the ceiling`);
    }
    assert.deepEqual(levels, [...levels].sort((a, b) => a - b), `${name}: brighter with the band`);
    // And the two entries nothing reads are above the ceiling, which is how we know nothing does.
    for (const spare of group1.slice(0, 2)) {
      assert.ok(spare > LEVEL_CEILING, `${name}: entry ${spare} could have been a level`);
    }

    // Group 4: three threshold pairs, each pair two apart, which is the hysteresis.
    const group4 = values(4);
    assert.equal(group4.length, 6, name);
    for (let i = 0; i < 6; i += 2) {
      assert.ok((group4[i] as number) < (group4[i + 1] as number), `${name}: pair ${i / 2}`);
    }
    assert.deepEqual(group4, [...group4].sort((a, b) => a - b), `${name}: ascending bands`);

    // Group 9: four pairs of device levels at four bytes each, so the declared six entries hold three
    // and the fourth is in the spare run. The three declared ones ascend, and the spare pair
    // continues. Section 103 read these as timeouts and section 106 corrected it: both halves go
    // straight out to an I2C device's registers and nothing counts them down.
    const group9 = values(9);
    assert.equal(group9.length, 6, name);
    assert.deepEqual(group9, [...group9].sort((a, b) => a - b), `${name}: longer with the band`);

    // Group 0: one value, the fade's per step delay, and it has to fit the byte it is copied into.
    const group0 = values(0);
    assert.equal(group0.length, 1, name);
    assert.ok((group0[0] as number) <= 0xff, `${name}: the delay is copied into a byte`);
  }
});
