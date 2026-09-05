/**
 * Section 229: Logitech's device catalogue as a local source, tested against what we already hold.
 *
 * **Every claim here is pinned to a named path rather than searched for**, which is deliberate and is
 * what keeps this file fast. The discovery ran a full pass over 54118 codesets, about ten seconds, and
 * lives in `bin/catalogue.ts` behind `make catalogue`; what a test needs is the answer that pass found,
 * stated so it can fail. So each identification below names the codeset and asserts the match, and a
 * codeset that stops holding a device's codes fails by name.
 *
 * The archive is a third party's checkout of Logitech's data, so nothing in it is believed on its own
 * word: the tests are the comparison against our own corpus, and the one place the archive's own README
 * is the only source says so in the assertion's comment.
 */
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { IR_ARCHIVE, load, needing, skipUnless, skipWithoutIrArchive } from '@harmony/lab';
import {
  catalogueCommands, catalogueDevice, catalogueManufacturers, catalogueModels, codeKey,
  identifyCodeset, DEVICE_TYPE_NAMES,
} from '../src/catalogue.ts';
import { parse, payloadOf } from '../src/index.ts';
import { irGroups } from '../src/ir.ts';
import { devices, keyCodes } from '../src/inventory.ts';
import { metadataArchive } from '../src/metadata.ts';
import { irFrame } from '../src/irframe.ts';
import { statedCode } from '../src/stated.ts';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/**
 * Which codeset the archive holds for each device of the two calibration configurations.
 *
 * **Found by identification and then pinned**, which is the same arrangement the rhythm table has: the
 * search is a generator's job and the answer is a test's. The two configurations were compiled by
 * Logitech for one account holding these three appliances, so the same three codesets appear in both,
 * in a different group order, which is itself worth having asserted: a group index is per configuration.
 */
const PINNED: Readonly<Record<string, Readonly<Record<number, readonly [string, string]>>>> = {
  calibration_one: {
    0: ['Denon_AV_Receiver', 'codesets/ab/ab7c5a35edb65613.json'],
    1: ['Sony_TV', 'codesets/13/13683a8372275830.json'],
    2: ['Panasonic_Blu-ray_Player', 'codesets/31/31e3ef8da16ec7c7.json'],
  },
  calibration_h600: {
    0: ['Sony_TV', 'codesets/13/13683a8372275830.json'],
    1: ['Panasonic_Blu-ray_Player', 'codesets/31/31e3ef8da16ec7c7.json'],
    2: ['Denon_AV_Receiver', 'codesets/ab/ab7c5a35edb65613.json'],
  },
};

/** The command name per code number, out of one codeset. */
function namesOf(codeset: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const command of catalogueCommands(IR_ARCHIVE!, codeset)) {
    for (const value of command.keycode.matchAll(/\(0x([0-9A-Fa-f]+)\)/g)) {
      const key = codeKey(value[1]!);
      if (!out.has(key)) out.set(key, command.name);
    }
  }
  return out;
}

test('the catalogue states its manufacturers and its device count agrees with the manifest',
  needing(skipWithoutIrArchive()), () => {
  const all = catalogueManufacturers(IR_ARCHIVE!);
  assert.equal(all.length, 7889);
  // The per manufacturer counts sum to the manifest's own device total, which is the check that the
  // index is the whole index rather than a page of it.
  assert.equal(all.reduce((n, one) => n + one.devices, 0), 276236);
  // Two manufacturers whose display name and directory name differ, since that difference is the reason
  // a slug exists at all and a caller that used the display name as a path would work until it did not.
  const sony = all.find((one) => one.name === 'Sony')!;
  assert.deepEqual([sony.slug, sony.devices], ['Sony', 20006]);
  const one = all.find((manufacturer) => manufacturer.name === '3B Technology')!;
  assert.equal(one.slug, '3B_Technology');
});

test('a device names its codeset, and the codeset names commands our own reader parses',
  needing(skipWithoutIrArchive()), () => {
  // The whole per device path, end to end, on a television this project has a configuration for: the
  // manufacturer index, then the model index, then the device, then its commands.
  const models = catalogueModels(IR_ARCHIVE!, 'Sony');
  assert.equal(models.length, 20006);
  const wanted = models.find((one) => one.model === 'KDL-32W705B')!;
  assert.equal(wanted.file, 'KDL-32W705B.json');
  const device = catalogueDevice(IR_ARCHIVE!, 'Sony', wanted.file);
  assert.deepEqual([device.manufacturer, device.model, device.deviceType, device.globalDeviceId],
                   ['Sony', 'KDL-32W705B', 1, 260473]);
  const commands = catalogueCommands(IR_ARCHIVE!, device.codeset!);
  assert.equal(commands.length, 73);
  // **The keycode needs no adapter**, which is the claim that makes the archive a drop in for the live
  // device fetch: `statedCode` was written against what their service returns and parses this unchanged.
  const volume = commands.find((command) => command.name === 'VolumeUp')!;
  const read = statedCode(volume.keycode)!;
  assert.equal(volume.keycode, 'G:Sony 12 Bit:()(0x490)():3');
  assert.equal(read.family, 'Sony 12 Bit');
  assert.equal(read.frames.length, 1);
  assert.deepEqual([read.frames[0]!.bits, read.frames[0]!.value], [12, 0x490n]);
  // The rendered waveform is left out unless asked for, since it is most of the file's bytes.
  assert.equal(volume.pronto, undefined);
  assert.ok(catalogueCommands(IR_ARCHIVE!, device.codeset!, { pronto: true })
    .find((command) => command.name === 'VolumeUp')!.pronto!.startsWith('0000 '));
});

test('the archive holds every code our own configurations\' devices send, bar one',
  needing(skipWithoutIrArchive(), skipUnless('calibration_one', 'calibration_h600')), () => {
  // **The measurement the archive had to pass before being believed**, and the strongest form available:
  // a configuration numbers its codes, so decoding a device group's records gives a set of numbers that
  // nothing in the archive has ever seen, and the codeset the identification picked has to hold them.
  let checked = 0;
  const missing: string[] = [];
  for (const [name, groups] of Object.entries(PINNED)) {
    const container = parse(payloadOf(load(name)!));
    const labels = new Map(devices(container).map((one) => [one.group, one.name]));
    for (const [group, [label, codeset]] of Object.entries(groups)) {
      // The configuration's own label for the device, asserted so the rows below cannot drift onto a
      // different group when a reader changes: it is the user's own words and the archive never saw it.
      assert.equal(labels.get(Number(group)), label, `${name} group ${group}`);
      const table = namesOf(codeset);
      for (const address of irGroups(container)![Number(group)]!.addresses) {
        const frame = irFrame(container, address);
        if (frame === undefined) continue;
        checked += 1;
        const key = codeKey(frame.value.toString(16));
        if (!table.has(key)) missing.push(`${name} group ${group} ${frame.bits}:${key}`);
      }
    }
  }
  assert.equal(checked, 482);
  // **One code of 482 is not in the archive and it is the odd one out on its own terms too.** Record 4
  // of the receiver's group is a 14 bit code at 37 kHz where its other 91 are 48 bit at 38 kHz, so it is
  // not of that appliance's protocol at all. Whether it was learned from a handset or belongs to a
  // second protocol the model accepts is not established here; what is established is that the archive's
  // codeset for the receiver holds the 91 and not this one.
  assert.deepEqual(missing, ['calibration_one group 0 14:12e4', 'calibration_h600 group 2 14:12e4']);
});

test('every button of the calibration configurations gets a command name',
  needing(skipWithoutIrArchive(), skipUnless('calibration_one', 'calibration_h600')), () => {
  // **The gap this closes.** A configuration says a key sends record 7 of group 2 and nothing else: the
  // command has no name anywhere in the file. Until now the only naming came from Logitech's button map
  // service through two test accounts. The archive names them locally and does not expire.
  //
  // **Named out of the button's own device's codeset, not out of the catalogue**, which matters: a code
  // number alone is held by several manufacturers, so a global lookup gives a handful of candidate names
  // and the device is what settles it.
  const totals: [string, number, number][] = [];
  for (const [name, groups] of Object.entries(PINNED)) {
    const container = parse(payloadOf(load(name)!));
    const tables = new Map(Object.entries(groups)
      .map(([group, [, codeset]]) => [Number(group), namesOf(codeset)] as const));
    let sends = 0;
    let named = 0;
    for (const binding of keyCodes(container)) {
      if (binding.where !== 'set' || binding.event !== 2) continue;
      for (const code of binding.codes) {
        const address = irGroups(container)![code.group]?.addresses[code.code];
        if (address === undefined) continue;
        const frame = irFrame(container, address);
        if (frame === undefined) continue;
        sends += 1;
        if (tables.get(code.group)?.has(codeKey(frame.value.toString(16))) === true) named += 1;
      }
    }
    totals.push([name, named, sends]);
  }
  // Exact and equal, not a floor: every one of them is named, and the day one is not, the pair diverges.
  assert.deepEqual(totals, [['calibration_one', 70, 70], ['calibration_h600', 78, 78]]);
});

test('the archive names commands where our button map names keys, and the difference is not an error',
  needing(skipWithoutIrArchive(), skipUnless('calibration_one', 'calibration_h600')), () => {
  // **Two tables built by routes with nothing in common, and they are answering different questions.**
  // `reference/button-maps.md` says which **physical key** a scan code is, read out of Logitech's button
  // map service through the account that generated these configurations, section 133. The archive says
  // which **command** a code is. A key called `Number4` sending a command called `4` is two right
  // answers, so an agreement rate would be the wrong measurement; what is worth pinning is the exact set
  // of pairs where they differ, since a genuine error would appear as a new pair in it.
  const text = readFileSync(join(REPO, 'reference', 'button-maps.md'), 'utf8');
  const pairs = new Set<string>();
  const identical: number[] = [];
  for (const [name, groups] of Object.entries(PINNED)) {
    const heading = name === 'calibration_one' ? 'Harmony One, skin 54' : 'Harmony 600, skin 71';
    const buttons = new Map<number, string>();
    for (const section of text.split(/^## /m).slice(1)) {
      if (!section.startsWith(heading)) continue;
      for (const row of section.matchAll(/^\| (\d+) \| `(\w+)` \| `([^`]*)` \|$/gm)) {
        buttons.set(Number(row[1]), row[2]!);
      }
    }
    assert.ok(buttons.size > 0, `${name} has a table in reference/button-maps.md`);
    const container = parse(payloadOf(load(name)!));
    const tables = new Map(Object.entries(groups)
      .map(([group, [, codeset]]) => [Number(group), namesOf(codeset)] as const));
    let same = 0;
    for (const binding of keyCodes(container)) {
      if (binding.where !== 'set' || binding.event !== 2) continue;
      const button = buttons.get(binding.scan);
      if (button === undefined) continue;
      for (const code of binding.codes) {
        const address = irGroups(container)![code.group]?.addresses[code.code];
        if (address === undefined) continue;
        const frame = irFrame(container, address);
        if (frame === undefined) continue;
        const label = tables.get(code.group)?.get(codeKey(frame.value.toString(16)));
        if (label === undefined) continue;
        if (label === button) same += 1; else pairs.add(`${button}/${label}`);
      }
    }
    identical.push(same);
  }
  assert.deepEqual(identical, [31, 39]);
  // Twenty distinct pairs, and every one of them is one of three kinds. A digit key against its digit
  // command, ten of them. A synonym for the same function, six: `VolumeMute`/`Mute`, `Menu`/`Home`,
  // `PrevChannel`/`ChannelPrev`, `Select`/`OK`, `Info`/`Display`, `NumberPlus`/`*`. And four where the
  // configuration binds a key to a command of a genuinely different function, which is what an activity
  // map is for: `Guide` sends the Blu-ray player's `OK`, `ChannelUp` and `ChannelDown` send its
  // `SkipForward` and `SkipBack`, and `PrevChannel` sends its `*`.
  assert.deepEqual([...pairs].sort(), [
    'ChannelDown/SkipBack', 'ChannelUp/SkipForward', 'Guide/OK', 'Info/Display', 'Menu/Home',
    'Number0/0', 'Number1/1', 'Number2/2', 'Number3/3', 'Number4/4', 'Number5/5', 'Number6/6',
    'Number7/7', 'Number8/8', 'Number9/9', 'NumberPlus/*', 'PrevChannel/*', 'PrevChannel/ChannelPrev',
    'Select/OK', 'VolumeMute/Mute',
  ]);
});

test('an identification reports its margin, because a model range is not a model', () => {
  // No archive needed: the ranking is the function's own arithmetic and a hand built index is the
  // clearest way to state what it must do.
  //
  // **The margin is the reason this returns what it returns.** Logitech's catalogue holds ranges of near
  // identical codesets, one per model, so the honest answer to "which device is this" is often a range:
  // `make catalogue` finds a television matching 108 of 108 with the runner up at 105. A caller that
  // read only the winner would report a model where the evidence supports a family of them.
  const index = new Map<string, string[]>([
    ['a', ['one', 'two']],
    ['b', ['one', 'two']],
    ['c', ['one']],
    ['d', ['three']],
  ]);
  const found = identifyCodeset(index, ['a', 'b', 'c']);
  assert.deepEqual(found, { codeset: 'one', hits: 3, runnerUp: 2, of: 3 });
  // A tie is reported as a tie rather than broken, since breaking it would invent a winner.
  const tied = identifyCodeset(index, ['a', 'b']);
  assert.deepEqual([tied?.hits, tied?.runnerUp], [2, 2]);
  // Nothing known is undefined rather than a zero scoring guess.
  assert.equal(identifyCodeset(index, ['zzz']), undefined);
  // And a number nothing holds does not lower the winner's hits, only the total it is out of, which is
  // what makes `hits` and `of` two numbers rather than a ratio.
  assert.deepEqual(identifyCodeset(index, ['a', 'b', 'c', 'zzz']),
                   { codeset: 'one', hits: 3, runnerUp: 2, of: 4 });
});

test('a numeric device type is named from Logitech\'s own reply, and it is not our enum\'s index', () => {
  // Runs without the archive, since it is a claim about a mapping this repository states.
  //
  // **Three of the four names are Logitech's own words**, from a captured live reply that pairs the
  // number with a display name, and the fourth is corroborated rather than stated: the one device group
  // whose owner labelled it `VCR` identifies a device the archive types 2, and the archive's own README
  // says 2 is a VCR. That README is a third party's text, so it is a hypothesis, and here it is a
  // hypothesis our own corpus agrees with.
  assert.deepEqual([...DEVICE_TYPE_NAMES.entries()].sort((a, b) => a[0] - b[0]),
                   [[1, 'Television'], [2, 'VCR'], [4, 'DVD'], [5, 'StereoReceiver']]);
  // **The control, and the trap it guards.** `docs/myharmony/model.json` holds a `DeviceType` enum of 61
  // values, and reading the wire number as an index into it is the obvious mistake: index 1 there is
  // `Default` and index 4 is `CableBox`, because a WCF enum is serialised in alphabetical order. So the
  // two orderings are different and neither can be derived from the other.
  const model = JSON.parse(
    readFileSync(join(REPO, 'docs', 'myharmony', 'model.json'), 'utf8'),
  ) as { entities: Record<string, { values: string[] }> };
  const values = model.entities['DeviceType']!.values;
  assert.equal(values.length, 61);
  assert.deepEqual([values[1], values[4], values[5]], ['Default', 'CableBox', 'CDJukebox']);
  for (const [number, label] of DEVICE_TYPE_NAMES) assert.notEqual(values[number], label);
});

/**
 * Which device owns which infrared group on a Harmony 300, identified out of the catalogue, section 265.
 *
 * **This is what settled a question two sections could not.** Sections 261 and 263 both proposed that a
 * group's index is a position in the archive's device list, one forwards and one backwards, and each was
 * fitted to a container where it could not fail. The catalogue answers it directly: take the numbers a
 * group's records send, find the codeset that holds them, and read off the appliance. Three of the four
 * groups come back as exactly the device Danny assigned to the button of that index.
 *
 * **The margin is part of the answer and is deliberately not asserted as a single codeset**, per
 * section 229: Logitech's catalogue holds ranges of near identical codesets, so a group matching 40 of
 * 40 has runners up at 40 as well and the honest claim is the model range. What is asserted is that the
 * device Danny assigned is among the best, which is falsifiable and is the claim being made.
 *
 * **Group 1 is absent from this test on purpose.** None of its 44 records decodes into a number, so
 * there is nothing to look up; `metadata.test.ts` names it from the favourite channels instead.
 */
test('a Harmony 300 device group is indexed by its device type button',
  needing(skipWithoutIrArchive(), skipUnless('h300_programmed_config')), () => {
  const c = parse(payloadOf(load('h300_programmed_config')!));
  /** The button each index is, in the order they sit on the remote, and what Danny put on it. */
  const assigned: readonly (readonly [number, string, string, string])[] = [
    [0, 'TV', 'Panasonic', 'TX-P42GT30E'],
    [2, 'DVD', 'Panasonic', 'DVD-S35'],
    [3, 'VCR or Aux', 'Sony', 'SLV-N700'],
  ];
  const groups = irGroups(c) ?? [];
  assert.equal(groups.length, 4, 'the table is not the skin maximum of four');
  assert.deepEqual(groups.map((g) => g.addresses.length), [50, 44, 25, 35]);

  let checked = 0;
  for (const [at, button, maker, model] of assigned) {
    // What Logitech says that appliance sends, from its own catalogue entry.
    const hit = catalogueModels(IR_ARCHIVE!, maker).find((one) => one.model === model)!;
    const device = catalogueDevice(IR_ARCHIVE!, maker, hit.file);
    const theirs = new Set<string>();
    for (const command of catalogueCommands(IR_ARCHIVE!, device.codeset!)) {
      for (const value of command.keycode.matchAll(/\(0x([0-9A-Fa-f]+)\)/g)) {
        theirs.add(codeKey(value[1]!));
      }
    }
    // What the group sends, as this codec decodes it.
    const ours = new Set<string>();
    for (const address of groups[at]!.addresses) {
      const frame = irFrame(c, address);
      if (frame !== undefined) ours.add(codeKey(frame.value.toString(16)));
    }
    assert.ok(ours.size > 0, `group ${at} decodes nothing, so it cannot be identified`);
    let hits = 0;
    for (const number of ours) if (theirs.has(number)) hits += 1;
    assert.equal(hits, ours.size,
      `group ${at}, the ${button} button, sends numbers the ${maker} ${model} does not hold`);
    checked += 1;
  }
  assert.equal(checked, 3, 'a group went unchecked');

  // **The control that makes it a placement claim rather than three lookups.** The archive names the
  // four devices in a different order, alphabetically, so a group index is provably not a position in
  // that list: the set top box is named first and owns group 1.
  // `devices()` gives one entry per occupied group here and names none of them, which is the state to
  // assert rather than to work around: on this architecture the name lives in the metadata archive and
  // nothing joins the two, which is exactly the gap this test fills from outside the file.
  assert.deepEqual(devices(c).map((one) => one.group), [0, 1, 2, 3]);
  for (const one of devices(c)) {
    assert.equal((one as { name?: string }).name, undefined, 'devices() names arch 16 now');
  }
  const archive = metadataArchive(c)!.devices.map((one) => one.name);
  assert.equal(archive.length, 4);
  assert.deepEqual([...archive].sort(), archive, 'the archive is not in alphabetical order');
  // The television owns group 0 and is third alphabetically, which is the disagreement itself.
  assert.equal(archive.findIndex((one) => one.toLowerCase().includes('tv')), 2);
});
