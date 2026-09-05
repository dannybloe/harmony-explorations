/**
 * The metadata archive a configuration carries, section 260.
 *
 * **The claim with teeth is the negative one.** Two architectures of the five here carry a ZIP inside
 * the container and three do not, so the reader has to find one where there is one and answer nothing
 * where there is not. A search based reader that returned something for a Harmony One would be finding
 * a `PK` in picture data, which is why the length word in front of the archive is part of the test.
 *
 * Nothing asserts a device or a command **name**. Those are the owner's own equipment on a contributed
 * or a bench remote, and this repository publishes no config contents; what is asserted is how many
 * there are and how they line up, which is the part that is about the format.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { skipUnless, require_ } from '@harmony/lab';
import { ACTION_LIST_TABLE_SLOT, archSlot, baseSlot, clockRecord, CLOCK_RECORD_SLOT, parse }
  from '../src/gspm.ts';
import { irBlockWords, irGroups, irHeaderPointers } from '../src/ir.ts';
import { framesOfSegments, irFrames, mergedIntervals } from '../src/irframe.ts';
import { pulsesOfWords } from '../src/irda.ts';
import { PROTOCOLS } from '../src/protocols.ts';
import { metadataArchive } from '../src/metadata.ts';
import { numberSenders } from '../src/tables.ts';

const WITH = ['h350_config', 'h890_config', 'h895_config'];
const WITHOUT = ['one_config', 'h600_config', 'h700_config', 'h525_config', 'arch8_config_885'];

test('exactly two architectures carry a metadata archive', skipUnless(...WITH, ...WITHOUT), () => {
  const seen: Record<string, number> = {};
  for (const name of WITH) {
    const c = parse(require_(name));
    const m = metadataArchive(c);
    assert.ok(m !== undefined, `${name} carries no archive`);
    seen[name] = m.length;
    // The framing: a u32 length in front of the ZIP, stating the archive and not the section.
    assert.equal(m.length, m.xml.length > 1000 ? 1513 : 270);
  }
  // Arch 10's is the same 270 bytes in both of its containers, which is what makes it a generation's
  // habit rather than one file's oddity, and arch 16's is a different document entirely.
  assert.equal(seen['h890_config'], 270);
  assert.equal(seen['h895_config'], 270);
  assert.equal(seen['h350_config'], 1513);
  for (const name of WITHOUT) {
    assert.equal(metadataArchive(parse(require_(name))), undefined,
      `${name} answered with an archive`);
  }
});

test('each architecture gives the archive its own slot, and neither is a base slot',
  skipUnless('h350_config', 'h890_config', 'h895_config'), () => {
    for (const [name, raw] of [['h350_config', 13], ['h890_config', 3], ['h895_config', 3]] as const) {
      const c = parse(require_(name));
      const m = metadataArchive(c)!;
      assert.equal(c.blobOffsetOf(c.sections[raw]!.address), m.offset,
        `${name} does not point at the archive from raw slot ${raw}`);
      // And no base slot claims it, which is why METADATA_SLOT is keyed by architecture: on arch 10
      // raw slot 3 is one of the eight sections 178 to 184 could place nothing on.
      assert.equal(baseSlot(c.architecture as number, raw), undefined,
        `${name} raw slot ${raw} is claimed by a base slot`);
    }
    // On arch 16 it is the last slot with anything in it, raw 14 being NULL.
    const arch16 = parse(require_('h350_config'));
    assert.equal(arch16.sections[14]!.address, 0);
  });

test('the arch 16 archive states the log area\'s record layout', skipUnless('h350_config'), () => {
  const m = metadataArchive(parse(require_('h350_config')))!;
  // Logitech's own words for the section, and the two record kinds a Harmony 350 logs. This is the
  // second source behind raw slot 2 being base slot 2, the log area: the byte match against the
  // Harmony 525 says the section is the same one, and this says what goes in it.
  assert.match(m.xml, /BinarizerConstants\.SECTION_META_DATA/);
  assert.match(m.xml, /<Class name="Infrared" id="0">/);
  assert.match(m.xml, /<Record name="InfraredEvent" id="0">/);
  assert.match(m.xml, /<Class name="Device" id="1">/);
  assert.match(m.xml, /<Record name="DeviceSelected" id="0">/);
  // An infrared event carries a device and a command, which is why the log can name what was sent.
  assert.match(m.xml, /<Field name="Device" type="byte"\/><Field name="Command" type="byte"\/>/);
  // Arch 10's document has none of that: one boolean, and no devices at all.
  const older = metadataArchive(parse(require_('h890_config')))!;
  assert.match(older.xml, /<Class name="HarmonyAssistant" id="0">/);
  assert.equal(older.devices.length, 0);
});

test('the names do not line up with the records, and that is the open half',
  skipUnless('h350_config'), () => {
    const c = parse(require_('h350_config'));
    const m = metadataArchive(c)!;
    const groups = irGroups(c) ?? [];
    assert.equal(m.devices.length, 3);
    assert.equal(groups.length, 8);
    // Named commands per device against records per group, at the device's own index. Both halves
    // fail: there are more names than records, and the device index is not the group index, since
    // this container's third device has 46 names while group 2 is empty and group 3 holds 30.
    const named = m.devices.map((one) => one.commands.length);
    assert.deepEqual(named, [61, 58, 46]);
    assert.deepEqual(groups.map((one) => one.addresses.length), [52, 48, 0, 30, 0, 0, 0, 0]);
    assert.equal(named.reduce((a, b) => a + b, 0), 165);
    // A command's index starts at zero and runs contiguously, so nothing is missing from the naming:
    // what is missing is the join, and asserting it here is what stops the next reader assuming one.
    for (const device of m.devices) {
      assert.deepEqual(device.commands.map((one) => one.index),
        Array.from({ length: device.commands.length }, (_unused, i) => i));
    }
    // The DeviceId is account scoped and not a catalogue id: three consecutive values, where the
    // public archive's own device ids run from 763 to about 523634.
    const ids = m.devices.map((one) => Number(one.deviceId));
    assert.deepEqual(ids.map((one) => one - ids[0]!), [0, 1, 2]);
    assert.ok(ids[0]! > 1e6, 'the id is inside the catalogue id space after all');
  });

/**
 * A send instruction's operand covers its group's records exactly, section 261.
 *
 * **The count is not the claim, the cover is.** A configuration whose send instructions merely numbered
 * the same as its records would prove nothing; what is asserted is that splitting each operand into a
 * group and an index gives, per group, the indices 0 to n-1 with no gap and no repeat, on groups of
 * different sizes. That is the mechanism connecting a pressed key to a stored code, and section 33 read
 * it years of sections ago on other architectures; this is the first check that it **closes**.
 *
 * The population is every configuration whose architecture has an action list slot mapped, so a new
 * architecture joins by having its map filled in rather than by anyone editing this list.
 */
const SEND_COVER = ['one_config', 'h600_config', 'h700_config', 'h525_config', 'arch8_config_885',
  'h350_config', 'h350_programmed_config', 'h350_three_devices_config', 'h300_config',
  'h300_programmed_config'];

test('every send instruction names a record, and together they name all of them',
  // `skipUnless` up front, not `require_` with a spread inside, which is what stood here and is the
  // shape `CLAUDE.md` warns about twice: `require_` takes one name, so the spread checked the first
  // and the other five went unguarded. With no lab at all it threw instead of skipping, and
  // `make test-nolab` is what caught it.
  skipUnless(...SEND_COVER), () => {
  const names = SEND_COVER;
  let containers = 0;
  let sends = 0;
  for (const name of names) {
    const c = parse(require_(name));
    let table: number[] | undefined;
    try {
      table = c.pointerArray(archSlot(c.architecture as number, ACTION_LIST_TABLE_SLOT));
    } catch { continue; }
    if (table === undefined) continue;
    containers += 1;
    const groups = irGroups(c) ?? [];
    const seen = new Map<number, Set<number>>();
    for (const address of table) {
      const off = c.blobOffsetOf(address);
      if (off === undefined) continue;
      const count = c.blob[off] as number;
      for (let i = 0; i < count; i += 1) {
        const at = off + 1 + 3 * i;
        if (at + 2 >= c.blob.length) break;
        if (c.blob[at + 2] !== 0x7d) continue;
        const operand = (c.blob[at] as number) | (c.blob[at + 1] as number) << 8;
        const group = operand >>> 8;
        const index = operand & 0xff;
        sends += 1;
        (seen.get(group) ?? seen.set(group, new Set()).get(group) as Set<number>).add(index);
      }
    }
    for (const [group, indices] of seen) {
      const records = groups[group]?.addresses.length;
      assert.ok(records !== undefined && records > 0,
        `${name} sends group ${group}, which holds no records`);
      // Every index inside the group, on every architecture. A send naming index 60 of a group of 52
      // is what an identity mapping between the naming and the records would look like.
      for (const index of indices) {
        assert.ok(index < records, `${name} group ${group} index ${index} of ${records}`);
      }
      // **The exact cover is arch 16's and is asserted only there**, deliberately. Elsewhere a
      // device's codeset holds more codes than its activities bind, so a group is referenced in part
      // and a completeness assertion would be false rather than informative. On arch 16 every record
      // is referenced exactly once, which is what makes the split a measurement there.
      //
      // **Both models and a configuration nobody here authored**, section 264: the Harmony 300 read
      // as it arrived, built in 2011 by a previous owner, covers 36 of 36 and 43 of 43. That removes
      // the last reading in which the exactness could have been an artefact of how these particular
      // remotes were set up.
      if (!name.startsWith('h350_') && !name.startsWith('h300_')) continue;
      assert.deepEqual([...indices].sort((a, b) => a - b),
        Array.from({ length: records }, (_unused, i) => i),
        `${name} group ${group} is not covered exactly`);
    }
  }
  assert.equal(containers, 10, 'a container went unwalked');
  // 1843 since the programmed Harmony 350, section 262, whose 142 sends join the 1701 here. Its
  // cover is exact like its factory twin's, which is the point of that section: it was expected to
  // stop being exact once the remote held a real configuration and it does not.
  // 2019 since the Harmony 300, section 264, whose 79 sends join the 1940. Its cover is exact too,
  // on a configuration nobody here authored, which is the strongest form of section 261's claim.
  // 2173 since that Harmony 300 was programmed, section 265, whose 154 sends join the 2019. It is
  // the first arch 16 configuration in which **every** group is occupied, four of four, so the
  // exactness is now measured on a full table as well as on partly filled ones.
  assert.equal(sends, 2173);
});

/**
 * No Harmony 350 record decodes to a number, section 261, which shuts the catalogue naming route
 * **on this remote**.
 *
 * **A negative with a consequence.** Section 229 names a command by identifying its device's codeset
 * out of Logitech's catalogue, which needs the record to decode to a number. All three of this
 * container's device groups are biphase and none of the three readers here reads one, so on this remote
 * the metadata archive is the **only** naming route, where everywhere else the catalogue is.
 *
 * **The title says the remote and not the architecture, since section 265 separated them**: three of
 * the four device groups of a programmed Harmony 300 decode and are named out of the catalogue, so what
 * shuts the route is the family a device speaks. This unit is one whose three devices all speak
 * families this decoder refuses, which is why it reads as an architecture wide claim and is not one.
 *
 * Group 1 is named anyway, and by the cheaper route: its lead in matches `Microsoft 30 Bit` in the
 * rhythm table on all thirteen pulses. That is asserted because it is the thing that would break if
 * either the table or the reader moved, and it shows the refusal is the reader's rather than the data
 * being unreadable.
 */
test('the Harmony 350 carries three biphase groups and none of them decodes',
  skipUnless('h350_config'), () => {
    const c = parse(require_('h350_config'));
    const groups = irGroups(c) ?? [];
    let records = 0;
    let decoded = 0;
    for (const group of groups) {
      for (const address of group.addresses) {
        records += 1;
        if (irFrames(c, address).length > 0) decoded += 1;
        const words = irBlockWords(c, irHeaderPointers(c, address)[0] as number);
        if (words === undefined) continue;
        const train = mergedIntervals(pulsesOfWords(words));
        if (framesOfSegments(train).length > 0) decoded += 1;
      }
    }
    assert.equal(records, 130);
    assert.equal(decoded, 0, 'a record decoded, so the catalogue route is open after all');

    // The one group the rhythm table does name, on its lead in alone.
    const first = groups[1]?.addresses[0] as number;
    const held = irBlockWords(c, irHeaderPointers(c, first)[1] as number) as number[];
    const train = mergedIntervals(pulsesOfWords(held));
    const row = PROTOCOLS.find((one) => one.family === 'Microsoft 30 Bit');
    const lead = row?.biphase?.lead as { mark: boolean; us: number }[];
    assert.equal(lead.length, 13);
    for (const [at, one] of lead.entries()) {
      assert.equal(train[at]?.mark, one.mark, `lead pulse ${at} is the wrong kind`);
      assert.equal(train[at]?.us, one.us, `lead pulse ${at} is the wrong length`);
    }
    // And the other two match no row at all, which is what makes them unidentified rather than unread.
    for (const at of [0, 3]) {
      const address = groups[at]?.addresses[0] as number;
      const words = irBlockWords(c, irHeaderPointers(c, address)[1] as number) as number[];
      const pulses = mergedIntervals(pulsesOfWords(words));
      // Narrowed rather than cast. The cast that stood here asserted a mutable `lead` over the
      // table's readonly one, which `node --test` accepts and `tsc --build` refuses, so it passed
      // every test run and failed the typecheck.
      const hit = PROTOCOLS.find((one) => {
        const lead = one.biphase?.lead;
        return lead !== undefined && lead.length >= 2
          && lead.every((q, i) => pulses[i]?.mark === q.mark && pulses[i]?.us === q.us);
      });
      assert.equal(hit, undefined, `group ${at} matches ${hit?.family ?? ''} after all`);
    }
  });

/**
 * Arch 16's number sender, named by a differential rather than by a shape, section 262.
 *
 * **The pair is the instrument.** The bench Harmony 350 was read twice by this library, once holding
 * the factory configuration and once after Danny put four devices, one activity and five favourite
 * channels on it through Logitech's service. Exactly one slot goes from a count of zero to a count of
 * one across that pair, and base slot 16 is defined as one record per device that takes a number
 * rather than one per channel, so five channels on one device is precisely the count of one it
 * predicts. A shape based search would have had four count prefixed arrays to choose between.
 *
 * The record then reads as base slot 16's layout with nothing adjusted: fourteen bytes of header,
 * every field zero, then three digit table pointers, and each table's ten entries call a list whose
 * send names the group the same device's own digits belong to. So section 154's mechanism is
 * unchanged on this architecture, which is worth asserting because this container's fifteen slots are
 * not the base twenty with insertions and nothing else transfers by index.
 *
 * **What is deliberately not asserted** is which channel numbers are stored. They are on Danny's own
 * remote and this repository publishes no configuration contents; what makes them evidence is that he
 * chose them before the read, and that argument lives in `docs/findings.md`.
 */
test('the Harmony 350 states a number sender, and only the programmed one does',
  skipUnless('h350_config', 'h350_programmed_config'), () => {
  const factory = parse(require_('h350_config'));
  const programmed = parse(require_('h350_programmed_config'));

  // Base slot 16 is raw slot 11 here, and **both** containers declare it. The factory one gives it a
  // single byte holding a count of zero, which `docs/config-format.md` is explicit is not the same
  // answer as a NULL slot, and that is what makes this a differential rather than a slot appearing.
  assert.equal(archSlot(16, 16), 11);
  assert.equal(factory.sectionLength(11), 1, 'the factory configuration does not declare the slot');
  assert.equal(numberSenders(factory)?.records.length, 0, 'the factory sends no numbers');
  assert.equal(numberSenders(programmed)?.records.length, 1,
    'one record per device that takes a number, not one per channel');
  // **`pointerArray` answers `undefined` for the empty one and that is not a defect**, which took a
  // measurement to establish rather than a reading: it infers the array's width from the count, and a
  // count of zero fits both widths, so it cannot represent an empty array at all. `countedPointers`
  // is the reader for a slot whose width is known and `numberSenders` uses it, which is why the two
  // lines above answer where this one cannot. Asserted so the difference is deliberate rather than
  // something the next reader trips over.
  assert.equal(factory.pointerArray(11), undefined, 'pointerArray now infers a zero count');
  const records = programmed.pointerArray(11) as number[];
  assert.equal(records.length, 1, 'one record per device that takes a number, not one per channel');

  const at = programmed.blobOffsetOf(records[0] as number) as number;
  const u24 = (o: number) => (programmed.blob[o] as number)
    | (programmed.blob[o + 1] as number) << 8 | (programmed.blob[o + 2] as number) << 16;
  // The fourteen byte header, every field zero: no flags, no base added, no digit floor, and none of
  // the three queued instructions. The one arch 12 sample declares flags 0x04 and this declares 0, so
  // the field is read here as present and unset rather than as absent.
  for (let o = 0; o < 14; o += 1) {
    assert.equal(programmed.blob[at + o], 0, `header byte ${o} is not zero`);
  }
  const tables = [u24(at + 0x0e), u24(at + 0x11), u24(at + 0x14)];
  assert.equal(new Set(tables).size, 3, 'the three digit tables share an address');
  // Thirty bytes apart, which is ten three byte entries, so the tables tile without a gap.
  assert.deepEqual([tables[1]! - tables[0]!, tables[2]! - tables[1]!], [30, 30]);

  // Every digit of every table calls a list, and every one of those lists sends a code from one
  // group. That group is the device the favourites are on, and it is the same for all thirty
  // entries, which is what makes this a number sender for one device rather than a table of codes.
  const lists = programmed.pointerArray(archSlot(16, ACTION_LIST_TABLE_SLOT)) as number[];
  const groups = new Set<number>();
  let followed = 0;
  for (const table of tables) {
    const off = programmed.blobOffsetOf(table) as number;
    for (let digit = 0; digit < 10; digit += 1) {
      const entry = off + 3 * digit;
      assert.equal(programmed.blob[entry + 2], 0x7f, `digit ${digit} does not call a list`);
      const index = (programmed.blob[entry] as number)
        | (programmed.blob[entry + 1] as number) << 8;
      const listAt = programmed.blobOffsetOf(lists[index] as number) as number;
      const count = programmed.blob[listAt] as number;
      let sends = 0;
      for (let i = 0; i < count; i += 1) {
        const ins = listAt + 1 + 3 * i;
        if (programmed.blob[ins + 2] !== 0x7d) continue;
        sends += 1;
        groups.add(((programmed.blob[ins] as number)
          | (programmed.blob[ins + 1] as number) << 8) >>> 8);
      }
      assert.equal(sends, 1, `the list for digit ${digit} sends ${sends} codes, not one`);
      followed += 1;
    }
  }
  assert.equal(followed, 30, 'a digit went unfollowed');
  assert.equal(groups.size, 1, 'the digits are spread over more than one device');
});

/**
 * The two arch 16 remotes' favourite channels, and the claim about them that was withdrawn.
 *
 * **This test was written to prove something it cannot.** Its first version was called "the programmed
 * Harmony 300 carries favourites nobody set up for it" and asserted that "**a favourite channel belongs
 * to the account's device and not to the remote**",<!--superseded--> the Harmony 300's four being four
 * of the five set up through the Harmony 350 and truncated by the skin's stated maximum. Danny entered
 * those four on the Harmony 300 himself. The premise, that no favourite was set up for it, was inferred
 * from his not having mentioned any, and no assertion in this file could ever have caught that.
 *
 * **What it asserts now is a known answer check.** Asked rather than assumed, Danny entered 1, 2, 3 and
 * 666 on the Harmony 300, which is exactly what the container states, so four channels chosen in
 * advance produce four here on a second model of this architecture. The stated maxima are 4 and 5 and
 * neither is doing any work: the two remotes carry four and five because four and five were entered.
 * All four values have no leading zero and all four take the number sender route, which is what
 * section 156 predicts and is the claim this half is worth keeping for.
 *
 * **The part that carries its own weight is group 1**, which the catalogue cannot name: none of that
 * group's 44 records decodes into a number, so identifying it against Logitech's codesets is impossible
 * and what names it is these digits, which all send from group 1 and are the set top box's channels.
 * That is the one conclusion here independent of who typed the numbers in.
 */
test('the two arch 16 remotes state their favourite channels, and group 1 is the set top box',
  skipUnless('h300_programmed_config', 'h350_programmed_config'), () => {
  const c = parse(require_('h300_programmed_config'));
  assert.equal(numberSenders(c)?.records.length, 1, 'no number sender where a favourite is stated');

  const lists = c.pointerArray(archSlot(16, ACTION_LIST_TABLE_SLOT)) as number[];
  /** Every channel an action list loads into the accumulator and hands to the number sender. */
  const channels: number[] = [];
  for (const address of lists) {
    const off = c.blobOffsetOf(address);
    if (off === undefined) continue;
    const count = c.blob[off] as number;
    let loaded: number | undefined;
    for (let k = 0; k < count; k += 1) {
      const at = off + 1 + 3 * k;
      const operand = (c.blob[at] as number) | (c.blob[at + 1] as number) << 8;
      // `0x7A` loads the accumulator and `0x1F` hands it on, so a list that does both is one channel.
      if (c.blob[at + 2] === 0x7a) loaded = operand;
      else if (c.blob[at + 2] === 0x1f && loaded !== undefined) { channels.push(loaded); break; }
    }
  }
  assert.deepEqual(channels.sort((a, b) => a - b), [1, 2, 3, 666],
    'the four channels this configuration states');

  // Four here and five there, which is what was entered on each and **not** either skin's stated
  // maximum doing any work, although both happen to sit at it. Asserted as the counts entered, since
  // the reading that took the gap for a limit was withdrawn.
  const other = parse(require_('h350_programmed_config'));
  const otherLists = other.pointerArray(archSlot(16, ACTION_LIST_TABLE_SLOT)) as number[];
  let otherChannels = 0;
  for (const address of otherLists) {
    const off = other.blobOffsetOf(address);
    if (off === undefined) continue;
    const count = other.blob[off] as number;
    for (let k = 0; k < count; k += 1) {
      if (other.blob[off + 1 + 3 * k + 2] === 0x7a) { otherChannels += 1; break; }
    }
  }
  assert.equal(otherChannels, 5, 'the Harmony 350 does not state five');
  assert.equal(channels.length, 4, 'the Harmony 300 does not state four');

  // Every digit of the record's tables sends from one group, and that group is 1, which is the set
  // top box: the channels are its, and this is the only route that names group 1 at all, since its
  // records do not decode. This half of the test is unaffected by the withdrawal above.
  const record = (c.pointerArray(11) as number[])[0] as number;
  const at = c.blobOffsetOf(record) as number;
  const u24 = (o: number) => (c.blob[o] as number)
    | (c.blob[o + 1] as number) << 8 | (c.blob[o + 2] as number) << 16;
  const groupsSeen = new Set<number>();
  let digits = 0;
  for (const table of [u24(at + 0x0e), u24(at + 0x11), u24(at + 0x14)]) {
    const off = c.blobOffsetOf(table) as number;
    for (let digit = 0; digit < 10; digit += 1) {
      const entry = off + 3 * digit;
      assert.equal(c.blob[entry + 2], 0x7f, `digit ${digit} does not call a list`);
      const index = (c.blob[entry] as number) | (c.blob[entry + 1] as number) << 8;
      const listAt = c.blobOffsetOf(lists[index] as number) as number;
      const count = c.blob[listAt] as number;
      for (let i = 0; i < count; i += 1) {
        const ins = listAt + 1 + 3 * i;
        if (c.blob[ins + 2] !== 0x7d) continue;
        groupsSeen.add(((c.blob[ins] as number) | (c.blob[ins + 1] as number) << 8) >>> 8);
      }
      digits += 1;
    }
  }
  assert.equal(digits, 30, 'a digit went unfollowed');
  assert.deepEqual([...groupsSeen], [1], 'the digits do not all send from the set top box');
});

/**
 * What a device costs the Harmony 350's container, section 263.
 *
 * **A three container differential, and the arithmetic is the claim.** The factory configuration holds
 * three devices, the programmed one four, and the third the same four with the Playstation removed. Two
 * slots move with the device count and their lengths are exact functions of it: raw 6 is devices plus
 * one and raw 8 is devices times two, on all three.
 *
 * **The Chromecast is the control nobody arranged.** It has no infrared commands at all and no group in
 * the infrared table, and it still counts in both slots, so they count devices rather than devices that
 * can send something. Without it the two slots would have been indistinguishable from a count of
 * devices that carry codes.
 *
 * Neither slot is placed in `ARCH16_SLOT_MAP`, and this test deliberately does not name a base slot for
 * either: knowing what a slot counts is not knowing which slot it is. The cross architecture route was
 * measured and fails, which the section records.
 *
 * The infrared group count is asserted alongside, because it is the same shape of claim with the
 * opposite answer: it does **not** move with the devices. Eight groups in all three containers, which
 * is the `MaxDevicesPerAccount` Logitech states for this skin, where base slot 5 on every other
 * architecture here holds exactly one group per device.
 */
test('a device costs an arch 16 container one entry, and the infrared table is sized by the skin',
  skipUnless('h350_config', 'h350_programmed_config', 'h350_three_devices_config', 'h300_config',
    'h300_programmed_config'),
  () => {
  // devices, the skin's stated maximum devices, raw slot 8's length, and the date the configuration
  // states it was built on. Two of the rows are a different **model**, which is what makes the third
  // column a claim rather than a coincidence, and one is a different **compiler**, which is what
  // section 265 needed a second read to see.
  const expected: Readonly<Record<string, readonly [number, number, number, string]>> = {
    h350_config: [3, 8, 6, '2026-07-20'],
    h350_programmed_config: [4, 8, 8, '2026-09-04'],
    h350_three_devices_config: [3, 8, 6, '2026-09-04'],
    h300_config: [2, 4, 0, '2011-05-03'],
    h300_programmed_config: [4, 4, 8, '2026-09-04'],
  };
  let walked = 0;
  for (const [name, [devices, maxDevices, slotEight, built]] of Object.entries(expected)) {
    const c = parse(require_(name));
    // The device count comes from the archive's own names, which is the only place this architecture
    // states it: `deviceCount` reads a base slot this map does not place.
    assert.equal(metadataArchive(c)?.devices.length, devices, `${name} names a different number`);
    // **Devices plus one, on two models and on a configuration nobody here authored.** That is what
    // makes it structural rather than an artefact of how the bench remote was set up. The spare entry
    // is still unexplained: the prediction that retired the activity candidate for it was withdrawn
    // by Danny, and Logitech's own product record declares `PartiallySetupActivities` on both Harmony
    // 300 skins, so this model has activities of a kind. Section 265.
    assert.equal((c.pointerArray(6) ?? []).length, devices + 1, `${name} raw slot 6`);
    // **Raw slot 8 is twice the device count on every configuration a current compiler built**, and
    // zero on the one built in 2011, section 265. Section 264 read that zero as a property of the
    // **model**, since the Harmony 300 was the only second model in the population and also the only
    // old configuration; a second read off the same remote holds eight and separates them. So the
    // date is asserted beside the length, because it is the discriminator and without it this table
    // is five measured numbers rather than a rule that can fail.
    const section = c.sections[CLOCK_RECORD_SLOT];
    const at = section === undefined || section.isNull
      ? undefined : c.blobOffsetOf(section.address);
    const stamp = at === undefined ? undefined : clockRecord(c.blob, at);
    assert.equal(stamp?.slice(0, 10), built, `${name} states a different build date`);
    assert.equal((c.pointerArray(8) ?? []).length, slotEight, `${name} raw slot 8`);
    assert.equal((c.pointerArray(8) ?? []).length, built.startsWith('2011') ? 0 : 2 * devices,
      `${name} breaks the rule that raw slot 8 is twice the devices once a current compiler built it`);
    // **The infrared table is sized by the skin's maximum and not by the configuration**, which is
    // this architecture's own behaviour: 8 groups on the Harmony 350 and 4 on the Harmony 300,
    // matching each skin's `MaxDevicesPerAccount`, with the unused groups empty. Every other
    // architecture here holds exactly one group per device.
    assert.equal((irGroups(c) ?? []).length, maxDevices, `${name} infrared groups`);
    // At most, not fewer than: the programmed Harmony 300 is the first container here that **fills**
    // its table, four devices in four groups, so the claim rests on the other four rows for its
    // margin and on this one only for the equality.
    assert.ok(devices <= maxDevices, `${name} declares fewer groups than it has devices`);
    walked += 1;
  }
  assert.equal(walked, 5, 'a container went unwalked');
  // The claims rest on the columns varying, so assert that they do. Without this every equality
  // above could be one number, which is the shape section 32 failed on.
  assert.deepEqual([...new Set(Object.values(expected).map((r) => r[0]))].sort(), [2, 3, 4]);
  assert.deepEqual([...new Set(Object.values(expected).map((r) => r[1]))].sort(), [4, 8]);
  assert.deepEqual([...new Set(Object.values(expected).map((r) => r[2]))].sort((a, b) => a - b),
    [0, 6, 8]);
  // And that a container fills its table in one row and not in the others, which is what makes the
  // "sized by the skin" claim distinguishable from "sized by the device count".
  assert.equal(Object.values(expected).filter((r) => r[0] === r[1]).length, 1);
});

/**
 * A unit's own skin is not the one its USB descriptor states, section 264.
 *
 * **The part that can be tested off a file is the configuration's half**, and it is the half that
 * matters: the bench Harmony 300's container states skin 79 in its version word, where section 195
 * recorded 78 for that unit from `bcdDevice`. Both are a Harmony 300 in Logitech's product table, 78
 * for one region and 79 for the other, so the descriptor names the family's base skin and the remote
 * names its own regional variant. A reader that takes the skin from the descriptor gets the region
 * wrong.
 *
 * **The control is the other model.** The Harmony 350 is the only skin in its family and its
 * descriptor and its container agree, 104 both ways, so the two sources agree where there is no
 * regional pair and disagree where there is one. The descriptor values themselves are hardware
 * readings and live in `docs/findings.md`; what is asserted here is what the files say.
 *
 * Section 81 is the reason this is worth a test rather than a note: the version word is per config
 * rather than per model, an editor copies it rather than computing it, and it has already been seen
 * naming a skin the remote does not report. So this pair could have drifted for that reason instead,
 * and the thing that rules it out is the remote's own `/sys/sysinfo` agreeing with the container.
 */
test('the arch 16 containers state their own skin, and the Harmony 300 states the European one',
  skipUnless('h300_config', 'h350_config', 'h350_programmed_config', 'h350_three_devices_config'),
  () => {
  // Low byte of the version word is the skin, section 81.
  const skinOf = (name: string) => (parse(require_(name)).versionWord as number) & 0xff;
  assert.equal(skinOf('h300_config'), 79, 'the Harmony 300 no longer states the European skin');
  for (const name of ['h350_config', 'h350_programmed_config', 'h350_three_devices_config']) {
    assert.equal(skinOf(name), 104, `${name} states a different skin`);
  }
  // The two skins are different numbers, which is what makes the line above a claim: a reader that
  // returned a constant would pass one of these two assertions and not both.
  assert.notEqual(skinOf('h300_config'), skinOf('h350_config'));
});
