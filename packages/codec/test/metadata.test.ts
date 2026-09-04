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
import { ACTION_LIST_TABLE_SLOT, archSlot, baseSlot, parse } from '../src/gspm.ts';
import { irBlockWords, irGroups, irHeaderPointers } from '../src/ir.ts';
import { framesOfSegments, irFrames, mergedIntervals } from '../src/irframe.ts';
import { pulsesOfWords } from '../src/irda.ts';
import { PROTOCOLS } from '../src/protocols.ts';
import { metadataArchive } from '../src/metadata.ts';

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
test('every send instruction names a record, and together they name all of them', () => {
  const names = ['one_config', 'h600_config', 'h700_config', 'h525_config', 'arch8_config_885',
    'h350_config'];
  require_(...(names as [string]));
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
      // and a completeness assertion would be false rather than informative. On the Harmony 350 every
      // record is referenced exactly once, which is what makes the split a measurement there.
      if (name !== 'h350_config') continue;
      assert.deepEqual([...indices].sort((a, b) => a - b),
        Array.from({ length: records }, (_unused, i) => i),
        `${name} group ${group} is not covered exactly`);
    }
  }
  assert.equal(containers, 6, 'a container went unwalked');
  assert.equal(sends, 1701);
});

/**
 * No Harmony 350 record decodes to a number, section 261, which shuts the catalogue naming route.
 *
 * **A negative with a consequence.** Section 229 names a command by identifying its device's codeset
 * out of Logitech's catalogue, which needs the record to decode to a number. All three of this
 * container's device groups are biphase and none of the three readers here reads one, so on this remote
 * the metadata archive is the **only** naming route, where everywhere else the catalogue is.
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
      const hit = PROTOCOLS.find((one) => (one.biphase?.lead.length ?? 0) >= 2
        && (one.biphase as { lead: { mark: boolean; us: number }[] }).lead
          .every((q, i) => pulses[i]?.mark === q.mark && pulses[i]?.us === q.us));
      assert.equal(hit, undefined, `group ${at} matches ${hit?.family ?? ''} after all`);
    }
  });
