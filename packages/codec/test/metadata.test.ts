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
import { baseSlot, parse } from '../src/gspm.ts';
import { irGroups } from '../src/ir.ts';
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
