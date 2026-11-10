/**
 * The Harmony 350 test setup built from nothing, step 6 of plan 011: the family's
 * composers emitting their pieces onto the empty configuration of 5.1.5, so no Logitech container goes in.
 *
 * **What it is.** `buildNoScreenSetup` builds the empty configuration for the setup's skin and runs
 * `composeNoScreenSetup` over it: every device of `packages/corpus/setups/h350-test.json` on the key Logitech's service
 * put it on, its keys and its long press; Watch TV with its devices, its inputs and its flag; and the five favourite
 * channels on the KPN. What goes in is the setup, the keys, a moment and the infrared catalogue.
 *
 * **What it took.** Less than plan 011 expected, because the composers already built every piece and appended it to
 * whatever configuration they were handed; what they read off a donor was where to put things and what was there
 * already. Four things changed:
 *
 * * **The timers.** The device composer put a key's two timer records after the last one, and the empty configuration
 *   has none, so it refused. It now puts the first after the last list body, where every Logitech compile of the
 *   family has its timers, after the lists, `composeNoScreenDevice`.
 * * **The activity.** The setup composer kept the configuration's own Watch TV and refused a setup whose activity named
 *   a device it composed; on a configuration with no Watch TV binding it now composes the activity, after the devices
 *   and before the favourites, from the setup's devices, their inputs and the `ChannelChanging` role. The activity
 *   composer already created the flag and every input variable where the configuration had none; on a donor it had
 *   reused the flag. Here it creates it: `flag.reused` is false.
 * * **The order the devices are composed in**: the setup's, each device held back only until what it needs is there,
 *   its key's short press device for a long press and the device whose volume it sends. Until now every short press
 *   went first; on the test setup the two orders are the same, and on a setup listing a long press or a borrower
 *   first they differ, the fourth test. It matters because the composer appends each device to the metadata archive as
 *   it goes, the archive's order is the account's in every Logitech compile, and the activity switches its devices in
 *   the archive's order.
 * * **Nothing in the state tables.** The variables the composers append, each at `narrow` as its device or the
 *   activity goes in, come out numbered exactly as the family's allocator numbers a setup, `noScreenStateVariables`:
 *   power variables in the setup's order, then the inputs, then the flag. The second test holds this byte for byte, so
 *   `statetables.ts`'s "whether a setup composed device by device onto a configuration of none comes out numbered
 *   alike is not checked" is checked now, and it does.
 *
 * **What it settled, against Logitech's second compile of the same setup, part by part**, the way
 * `noscreensetup.test.ts` holds 4.5's composition, every number that follows placement named:
 *
 * * **equal**: the key table, binding for binding and in the same order, Watch TV's binding spelled out to every list
 *   it calls; seven of the eight device maps; every state variable with its transitions, the activity's flag and the
 *   Denon's input of 19 values among them; all 16 timer records; the eleven start up events; the number sender and
 *   its three digit tables; every device's records as a multiset but the KPN's; every list but the KPN's 30 sends;
 *   and the metadata archive's devices, their commands and their order;
 * * **different, and why**:
 *   * **the KPN's map**: Logitech's binds 12 keys, ours the family's 43, every one of Logitech's 12 among them with the
 *     same binding, so the KPN stores 30 records and 30 send lists Logitech's does not. **This is the account and not
 *     a rule of the compile**, 5.1.7, the test of the account's maps: the service compiles a device's keys from its
 *     mode map, the one
 *     `GetDeviceModeButtonMaps` reads, and on this account the KPN's mode map is the map `build-setup.ts` saved with
 *     `SaveButtonMaps` to put the favourites on before the first compile, the same map by its identifier, with the 35
 *     hard buttons that save named reading as unassigned. So neither compile binds them. The same catalogue KPN on an
 *     account where nothing saved its map binds every key ours does, 38 of 38, but two, and those two, Replay and
 *     Advance on the skip keys, are the one difference left between our table and the service's for this device,
 *     the test after it. **So the build keeps the family's table**: reproducing the 12 would be reproducing an edit
 *     the setup file does not state;
 *   * **the numbering**: lists, maps, timers, records and state variables are numbered by our allocators, plan 011
 *     and 5.1.8, so they are compared by content and never by number;
 *   * **the metadata archive's device numbers**: ours count from 1, Logitech's are the account's, a choice plan 011
 *     step 4 makes, and so the archive's bytes;
 *   * **the length**, 124170 bytes against 118513, all of it the KPN's extra records, lists and bindings, the
 *     archive's numbers, where things sit, and since 5.4 the four bytes of the entry binding event `0xFF`;
 *   * **the key table's entry for event `0xFF`**, now: ours binds it, to the list the
 *     `0x30` entry calls, and Logitech's binds nothing to it, decision 28. Every other entry of the key table is
 *     Logitech's, in Logitech's order.
 *
 * **A correction**: until its stored copies were composed, the LG TV's records and two lists differed too, Logitech storing its Back and a copy
 * of a code the catalogue names OK without its opening silence, each with a send list nothing calls, "for no rule
 * read". The rules are read now, `noscreenstored.test.ts`: the OK is the catalogue's channel tuning finish, stored as
 * a one block copy beside the digits' wherever a device states one, and the Back a television's, stored where no key
 * binds it and the setup holds another device. The device composer stores both, and the LG TV is Logitech's.
 *
 * **What it settles for 5.1.7**, the stored but uncalled lists and the Denon's inputs: **the Denon's inputs are done
 * by this build**: the activity composer writes the 19 values, the 19 transitions each calling a send list of its
 * own, and the 19 records, each the one block copy of the catalogue's input command, equal to Logitech's by content.
 * Logitech places those records after the number sender and ours go in the Denon's group where it is; that is
 * placement, carried by the group's addresses. **All 50 lists nothing calls are reproduced**: the 16 silent writes,
 * two per power variable, and the 34 sends, Teletext, the digit copies, the LG TV's finish copy and its Back, by the
 * device composer, `noscreenstored.test.ts` for the rule.
 *
 * **Event `0xFF`, since 5.4.** Until 5.4 the first test held that the key table had no `0xFF` entry, so that 5.2's
 * attribution was checked on a build with nothing of ours Logitech lacks. 5.4 put the entry into the empty
 * configuration, so this build carries it from the start and no composer adds it; the first test now holds it there
 * once, a call of the `0x30` entry's list, and `noscreenacknowledging.test.ts` holds the argument and its control.
 * Attributing every byte to a generator is 5.2's, `noscreenattribution.test.ts`: every byte of this build is one,
 * none carried and none unclaimed.
 *
 * **Controls**, each run and reverted by string replacement in the source unless it is a test of its own:
 * taking out the timer placement of an empty configuration refuses the first device ("raw slot 8 holds no timer");
 * composing every short press before every long press again composes the test setup the same, and the reordered setup
 * of the fourth test is refused, the KPN composed before the Denon whose volume it sends; leaving the activity
 * uncomposed fails every test, the comparison at the key table; the comparison run against Logitech's first compile,
 * without the favourites, fails on the KPN's map, the lists and the number sender, the fifth test; the allocator's
 * tables with two devices' power lists swapped are not the file's, the second test; taking `Back` out of
 * `TELEVISION_STORED_UNBOUND` fails the third test at the LG TV's records, one fewer, and the channel finish's copy
 * left out fails it the same way; the mode maps' count closure, every button counted whether assigned or not, misses
 * the KPN's bindings by 35, the test of the account's maps; and our KPN map against the second compile's, in place of
 * the other account's, differs on 31 tags where the other account's differs on 2, the test after it.
 *
 * **Sources checked first**: plan 011; the family's composers and their
 * tests, `noscreensetup.test.ts`, `noscreenactivity.test.ts`, `noscreenempty.test.ts`, `noscreenstatetables.test.ts`
 * and `noscreennumbering.test.ts`; `reference/architectures/harmony-300-350/memory.md`; the lab's
 * `work/setups/h350-test/chapter4-reading.md`. Logitech's client compiles nothing for this family, the service does.
 * For the KPN's map, 5.1.7: the service's replies the lab holds, the mode maps of the test setup's eight devices,
 * `work/myharmony/responses/20261031-h350-setup_GetDeviceModeButtonMaps-all.json`, and the setup builder's own
 * record of its `GetButtonMaps` and `SaveButtonMaps` calls, `work/setups/h350-test/replies/`; the harvest's compile
 * of eight devices on another account, `work/harvest/check-350-eight/`; `docs/test-notes/harmony-350.md`, which says
 * how the favourites were saved; and MyHarmony's decompiled source, which saves a Harmony 350's favourites with
 * `UpdateDeviceModeButtonMaps`, `reference/logitech/service.md`.
 * **Which architectures**: one setup, built for the Harmony 350's skin; with event `0xFF` bound since 5.4 the same
 * file is the Harmony 300's too, decision 28. It cannot be built for a Harmony 300's own skin: the setup puts four
 * devices on long presses, groups 4 to 7, and the 300's configurations allocate four groups, the last test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertFileFamilyContainer } from '@harmony/usb/rails';
import { IR_ARCHIVE, LAB, needing, skipWithoutIrArchive, skipWithoutLab } from '@harmony/lab';

import { ComposeError, type Container, irGroups, metadataArchive, parse, type Recipe } from '../../../src/index.ts';
import {
  buildNoScreenSetup,
  buildNoScreenStateTables,
  catalogueDevicePlan,
  type ComposedNoScreenSetup,
  composeIrGroup,
  layOutContainer,
  type NoScreenStateDevice,
  takeApart,
  withStateTables,
} from '../../../src/build.ts';
import { stateRecords, stateVariables, taggedList } from '../../../src/internal.ts';
import { nameOfLabel } from '../../../src/shared/core.ts';
import { allLists, maps, records, recordKey, senders, startUp, timerRecords, transitions } from './noscreenparts.ts';
import { archiveAt } from '../../../src/catalogue/catalogue.node.ts';
import { sameBytes } from '../../../src/support/bytes.ts';
import { proves } from '@harmony/testkit/proof';

const needsArchive = needing(skipWithoutIrArchive());
const needs = needing(skipWithoutLab(), skipWithoutIrArchive());

const SECOND = 'work/setups/h350-test/compile-Result.EzHex';
const FIRST = 'work/setups/h350-test/first-compile/compile-Result.EzHex';
/**
 * The file the bench units are given, written by `bin/compose-no-screen-setup.ts --from-nothing`: since 5.4 the one
 * with event `0xFF` bound, for the Harmony 350 and the Harmony 300 alike. The 5.1.6 and 5.1.7 files stay in the lab as
 * they were written, without the entry, and this build no longer rebuilds them.
 */
const FROM_NOTHING = 'work/setups/h350-test/from-nothing-5.4.bin';
/** A moment for the builds that are not the lab's file, which is rebuilt from its own. */
const MOMENT = '2026-11-01T12:00:00';

const RECIPE = JSON.parse(readFileSync(new URL('../../../../corpus/setups/h350-test.json', import.meta.url), 'utf8')) as Recipe;

/** Where Logitech's service put each device, as the setup file's own account of its compile states it. */
const KEYS = {
  'LG TV': { place: 0, press: 'short' }, Knoll: { place: 0, press: 'long' },
  Plasma: { place: 1, press: 'short' }, Kodi: { place: 1, press: 'long' },
  Denon: { place: 2, press: 'short' }, Switch: { place: 2, press: 'long' },
  KPN: { place: 3, press: 'short' }, 'Sony HT': { place: 3, press: 'long' },
} as const;

/** Firmware event `0xFF`, which the empty configuration binds since 5.4 and so every build of the setup. */
const EVENT_FF = 0xff;
/** The send event whose list event `0xFF` is bound to, `ACKNOWLEDGED_AS`, stated here as the test's own literal. */
const EVENT_30 = 0x30;

function labFile(path: string): Container {
  const at = join(LAB!, path);
  // The lab is there, so a missing file fails rather than skips: the claim is about these files.
  assert.ok(existsSync(at), `${path} is in the lab`);
  return parse(new Uint8Array(readFileSync(at)));
}

let memo: { out: ComposedNoScreenSetup; ours: Container } | undefined;
/** The build, run once. */
function built() {
  if (memo !== undefined) return memo;
  const out = buildNoScreenSetup(archiveAt(IR_ARCHIVE!), { recipe: RECIPE, keys: KEYS, builtAt: MOMENT });
  memo = { out, ours: parse(out.bytes) };
  return memo;
}

/** Two multisets' differences, each side's surplus counted. */
function surplus(a: Map<string, number>, b: Map<string, number>): number {
  let n = 0;
  for (const [key, count] of a) n += Math.max(0, count - (b.get(key) ?? 0));
  return n;
}
const multiset = (items: readonly string[]): Map<string, number> => {
  const out = new Map<string, number>();
  for (const one of items) out.set(one, (out.get(one) ?? 0) + 1);
  return out;
};

/**
 * The setup's description as the family's state allocator takes it, read off a configuration: each device's power
 * lists and, where the activity puts it on one, its input's values and send lists, in the setup's order.
 */
function stateRequest(c: Container): NoScreenStateDevice[] {
  const all = stateRecords(c)!;
  const named = new Map(stateVariables(c).map((one) => [one.name, one.index]));
  return RECIPE.devices.map((device) => {
    const stem = nameOfLabel(device.name);
    const power = all[named.get(`${stem}_Power_2`)!]!.values;
    const input = [...named].find(([name]) => name.startsWith(`${stem}_Input_`));
    const out: { name: string; power: { on: number; off: number }; input?: { values: number; sends?: number[] } } = {
      name: device.name, power: { on: power.find((one) => one.to === 1)!.operand, off: power.find((one) => one.to === 0)!.operand },
    };
    if (input !== undefined) {
      const values = Number(input[0].slice(input[0].lastIndexOf('_') + 1));
      const sends = all[input[1]]!.values;
      out.input = sends.length === 0 ? { values } : { values, sends: Array.from({ length: values }, (_, k) => sends.find((one) => one.to === k)!.operand) };
    }
    return out;
  });
}

// The codec's one byte comparison, `sameBytes`, under the name this file has always used.
const same = sameBytes;

test('the whole test setup builds with no Logitech file: every device, Watch TV with its flag and inputs, and the favourites, and passes the writer\'s checks',
  needsArchive, () => {
    proves(4, ['harmony-350'], ['docs/test-notes/harmony-350.md', 'packages/codec/test/families/harmony-300-350/noscreenfinalunits.test.ts']);
    proves(23, ['harmony-350'], ['docs/test-notes/harmony-350.md']);
    const { out, ours } = built();
    assert.ok(ours.allChecksPass);
    assertFileFamilyContainer(out.bytes);
    // Every device composed, none kept, in the setup's order, which needed nothing held back on this setup.
    assert.deepEqual(out.kept, []);
    assert.deepEqual(out.composed.map((one) => [one.name, one.group]), [
      ['LG TV', 0], ['Plasma', 1], ['Denon', 2], ['KPN', 3], ['Kodi', 5], ['Switch', 6], ['Sony HT', 7], ['Knoll', 4],
    ]);
    // The activity composed, its flag created and not reused, the LG TV's input of one value that sends nothing and
    // the Denon's of 19, each of whose values sends a one block copy the composer added.
    const activity = out.activity!;
    assert.equal(activity.flag.reused, false);
    assert.equal(activity.replaced, undefined);
    assert.deepEqual(activity.inputs.map((one) => [one.device, one.values, one.value]), [['LG TV', 1, 0], ['Denon', 19, 0]]);
    assert.equal(activity.recordsAdded, 19);
    assert.deepEqual(activity.power.map((one) => [one.device, one.kind]), [['LG TV', 'variable'], ['Denon', 'variable'], ['KPN', 'toggle']]);
    // The favourites, four as numbers and 07 digit by digit, on the KPN's map.
    assert.deepEqual(out.favourites[0]!.channels.map((one) => one.sent), ['number', 'number', 'number', 'number', 'digits']);
    assert.equal(ours.pointerArray(7)!.length, 361);
    // Firmware event 0xFF bound once in the key table every lookup falls through to, since 5.4, to a call of the list
    // event 0x30's entry calls: what lets a Harmony 300 send from groups 4 to 7. Until 5.4 this held that it was not.
    const keyTable = taggedList(ours, ours.pointerArray(6)![0]!)!.entries;
    const bound = keyTable.filter((one) => one.tag === EVENT_FF);
    const thirty = keyTable.find((one) => one.tag === EVENT_30)!;
    assert.equal(bound.length, 1);
    assert.deepEqual([bound[0]!.opcode, bound[0]!.operand], [thirty.opcode, thirty.operand]);
    // The start up events spelled out, none empty, which is what the 4.5 comparison did not hold, `noscreenparts.ts`.
    assert.equal(startUp(ours).length, 11);
    assert.equal(startUp(ours).filter((one) => one === '').length, 0);
    // The same inputs build the same bytes.
    assert.ok(same(buildNoScreenSetup(archiveAt(IR_ARCHIVE!), { recipe: RECIPE, keys: KEYS, builtAt: MOMENT }).bytes, out.bytes));
  });

test('its state tables are the family allocator\'s byte for byte, and the file goes through the frame unchanged', needsArchive, () => {
  const { ours } = built();
  // The frame's round trip over a file of ours, as `frame.test.ts` holds it over Logitech's seven.
  assert.ok(same(layOutContainer(takeApart(ours)).bytes, ours.blob));
  // The allocator's tables for the setup, put in place of the file's own: nothing moves, so the composers numbered
  // every variable where the allocator does, the flag included.
  const request = stateRequest(ours);
  const allocated = buildNoScreenStateTables({ devices: request, activity: true }, ours.builtAt!);
  assert.ok(same(layOutContainer(withStateTables(takeApart(ours), allocated.built)).bytes, ours.blob));
  assert.deepEqual(stateVariables(ours).filter((one) => one.index >= 18 && one.name !== '').sort((a, b) => a.index - b.index)
    .map((one) => `${one.index} ${one.name}`), [
    '18 LG_TV_Power_2', '19 Plasma_Power_2', '20 Denon_Power_2', '21 KPN_Power_2', '22 Kodi_Power_2', '23 Switch_Power_2',
    '24 Sony_HT_Power_2', '25 Knoll_Power_2', '26 LG_TV_Input_1', '27 Denon_Input_19', '28 ActivityPowerState_2',
  ]);
  // The control: one device's on and off lists the other way round, and the allocator's tables are not the file's.
  const swapped = request.map((one, k) => (k === 0 ? { ...one, power: { on: one.power!.off, off: one.power!.on } } : one));
  const wrong = buildNoScreenStateTables({ devices: swapped, activity: true }, ours.builtAt!);
  assert.ok(!same(layOutContainer(withStateTables(takeApart(ours), wrong.built)).bytes, ours.blob));
});

test('built from nothing, the setup is Logitech\'s second compile by content but for the KPN\'s map', needs, () => {
  const { ours } = built();
  const theirs = labFile(SECOND);
  // The key table, binding for binding, Watch TV's spelled out, and seven of the eight device maps. Ours binds event
  // 0xFF as well, 5.4, to what Logitech's 0x30 entry calls, and Logitech's binds nothing to it; the rest is theirs.
  const [mine, logitech] = [maps(ours), maps(theirs)];
  assert.deepEqual(Object.keys(mine).sort(), Object.keys(logitech).sort());
  const { ff, ...keysWithoutFf } = mine['keys']!;
  assert.equal(logitech['keys']!['ff'], undefined);
  assert.equal(ff, logitech['keys']!['30']);
  assert.deepEqual(keysWithoutFf, logitech['keys']);
  for (const name of Object.keys(logitech)) if (name !== 'KPN' && name !== 'keys') assert.deepEqual(mine[name], logitech[name], name);
  // The key table in the same order too, 0xFF aside: built from nothing it grows as Logitech's did, where 4.5's,
  // composed onto a table that had shrunk, put one tag in front of two others. 0xFF sits where the compiler's hash
  // order puts it, between 0x2D and 0x30, as it did in the file the bench Harmony 300 ran, `noscreeneventff.test.ts`.
  const tags = (c: Container) => taggedList(c, c.pointerArray(6)![0]!)!.entries.map((one) => one.tag);
  assert.deepEqual(tags(ours).filter((tag) => tag !== EVENT_FF), tags(theirs));
  assert.deepEqual(tags(ours).slice(tags(ours).indexOf(EVENT_FF) - 1, tags(ours).indexOf(EVENT_FF) + 2), [0x2d, EVENT_FF, 0x30]);
  // The KPN's: Logitech's 12 bindings all ours, and 31 more of the family's table.
  const [kpn, theirKpn] = [mine['KPN']!, logitech['KPN']!];
  assert.equal(Object.keys(theirKpn).length, 12);
  assert.equal(Object.keys(kpn).length, 43);
  for (const [tag, binding] of Object.entries(theirKpn)) assert.equal(kpn[tag], binding, `KPN ${tag}`);
  // Every record, per device as a multiset: equal but the KPN's 30 more; the LG TV's Back and finish copy are there.
  const [ourRecords, theirRecords] = [records(ours), records(theirs)];
  const extra = Object.fromEntries(Object.keys(theirRecords).map((name): [string, [number, number]] => [name, [
    surplus(multiset(ourRecords[name]!), multiset(theirRecords[name]!)), surplus(multiset(theirRecords[name]!), multiset(ourRecords[name]!)),
  ]]).filter(([, [a, b]]) => a + b > 0));
  assert.deepEqual(extra, { KPN: [30, 0] });
  assert.equal(Object.values(theirRecords).flat().length, 250);
  assert.equal(Object.values(ourRecords).flat().length, 280);
  // Every list as a multiset, each send named by its whole record: the KPN's 30 sends more and nothing fewer.
  const [ourLists, theirLists] = [allLists(ours, Number.MAX_SAFE_INTEGER), allLists(theirs, Number.MAX_SAFE_INTEGER)];
  assert.equal(surplus(ourLists, theirLists), 30);
  assert.equal(surplus(theirLists, ourLists), 0);
  assert.equal(theirs.pointerArray(7)!.length, 331);
  // Every state variable with its transitions, every timer, the start up events and the number sender.
  assert.deepEqual(transitions(ours), transitions(theirs));
  assert.deepEqual(timerRecords(ours), timerRecords(theirs));
  assert.equal(timerRecords(theirs).length, 16);
  assert.deepEqual(startUp(ours), startUp(theirs));
  assert.deepEqual(senders(ours), senders(theirs));
  // The metadata archive: the same devices with the same commands in the same order; the numbers are ours.
  const listed = (c: Container) => metadataArchive(c)!.devices.map((one) => `${one.index} ${one.name} ${one.commands.map((x) => x.name).join(',')}`);
  assert.deepEqual(listed(ours), listed(theirs));
  assert.deepEqual(metadataArchive(ours)!.devices.map((one) => one.deviceId), ['1', '2', '3', '4', '5', '6', '7', '8']);
  assert.deepEqual(metadataArchive(theirs)!.devices.map((one) => one.deviceId).slice(0, 2), ['83962903', '83962904']);
  // And the archive inflated whole, 5.2.4: its text is Logitech's character for character once the device ids, the
  // account's numbers where ours count from 1, are blanked on both sides. 25032 characters each.
  const blanked = (c: Container) => metadataArchive(c)!.xml.replace(/<DeviceId>\d+<\/DeviceId>/g, '<DeviceId>#</DeviceId>');
  assert.equal(blanked(ours).length, 25032);
  assert.equal(blanked(ours), blanked(theirs));
  // The control: unblanked, the texts differ, and only by the ids.
  assert.notEqual(metadataArchive(ours)!.xml, metadataArchive(theirs)!.xml);
  // 124170 since 5.4, the four bytes of the entry binding event 0xFF; 124166 before.
  assert.equal(ours.blob.length, 124170);
  assert.equal(theirs.blob.length, 118513);
});

test('the setup\'s order holds a device back only until what it needs is there: a long press for its key, a device for the volume it sends',
  needsArchive, () => {
    // The Knoll, a long press on the LG TV's key whose volume is the Denon's, and the KPN, whose volume is the Denon's
    // too, first: each waits for what it needs, the Knoll for both, and the rest keep the setup's order.
    const order = ['Knoll', 'KPN', 'LG TV', 'Plasma', 'Denon', 'Kodi', 'Switch', 'Sony HT'];
    const recipe: Recipe = { ...RECIPE, devices: order.map((name) => RECIPE.devices.find((one) => one.name === name)!) };
    const out = buildNoScreenSetup(archiveAt(IR_ARCHIVE!), { recipe, keys: KEYS, builtAt: MOMENT });
    assert.deepEqual(out.composed.map((one) => one.name), ['LG TV', 'Plasma', 'Denon', 'Knoll', 'KPN', 'Kodi', 'Switch', 'Sony HT']);
    // The archive lists them as composed, and the activity switches its devices in that order.
    assert.deepEqual(metadataArchive(parse(out.bytes))!.devices.map((one) => one.name), out.composed.map((one) => one.name));
    assert.deepEqual(out.activity!.power.map((one) => one.device), ['LG TV', 'Denon', 'KPN']);
    // Refused before anything is composed: a setup with no skin, an activity ending in no device's map, and a long
    // press on a key that holds no short press device.
    assert.throws(() => buildNoScreenSetup(archiveAt(IR_ARCHIVE!), { recipe: { ...RECIPE, model: { name: 'Harmony 350' } }, keys: KEYS, builtAt: MOMENT }),
      (error: unknown) => error instanceof ComposeError && /states no skin/.test(error.message));
    const activity = RECIPE.activities[0]!;
    const noChannel = { ...RECIPE, activities: [{ ...activity, devices: activity.devices.map((one) => ({ ...one, roles: [] })) }] };
    assert.throws(() => buildNoScreenSetup(archiveAt(IR_ARCHIVE!), { recipe: noChannel, keys: KEYS, builtAt: MOMENT }), /gives 0 devices the ChannelChanging role/);
    const { 'LG TV': _, ...noTv } = KEYS;
    const withoutTv: Recipe = { ...RECIPE, devices: RECIPE.devices.filter((one) => one.name !== 'LG TV'), activities: [], favourites: [] };
    assert.throws(() => buildNoScreenSetup(archiveAt(IR_ARCHIVE!), { recipe: withoutTv, keys: noTv, builtAt: MOMENT }), /Knoll cannot be composed/);
  });

test('the comparison bites: against Logitech\'s first compile, without the favourites, the KPN\'s map, the lists and the number sender differ', needs, () => {
  const { ours } = built();
  const first = labFile(FIRST);
  // The same comparison as above, of which only what the five channels change can fail.
  assert.notDeepEqual(maps(ours)['KPN'], maps(first)['KPN']);
  assert.notEqual(surplus(allLists(ours, Number.MAX_SAFE_INTEGER), allLists(first, Number.MAX_SAFE_INTEGER)), 30);
  assert.equal(senders(first).length, 0);
  assert.notDeepEqual(senders(ours), senders(first));
  // And what the channels do not touch still agrees, so the comparison is not failing on everything.
  assert.deepEqual(transitions(ours), transitions(first));
  assert.deepEqual(startUp(ours), startUp(first));
});

test('the file in the lab for the bench unit is this build from its own stamp, byte for byte, and passes the writer\'s checks', needs, () => {
  const at = join(LAB!, FROM_NOTHING);
  assert.ok(existsSync(at), `${FROM_NOTHING} is in the lab, written by bin/compose-no-screen-setup.ts --from-nothing`);
  const file = new Uint8Array(readFileSync(at));
  const stamp = parse(file).builtAt!;
  const again = buildNoScreenSetup(archiveAt(IR_ARCHIVE!), { recipe: RECIPE, keys: KEYS, builtAt: stamp });
  assert.ok(same(file, again.bytes));
  // GSPM and PTYY, the end marker, end_addr at it and the trailer checksum, as write-file-config.ts checks them.
  const checked = assertFileFamilyContainer(file);
  assert.equal(checked.readLength, file.length - 4);
});

// ---------------------------------------------------------------------------------------------------------------
// The KPN's map, 5.1.7: the account's, not a rule of the compile.

/** The service's mode maps of the test setup's eight devices, read off the live service into the lab. */
const MODE_MAPS = 'work/myharmony/responses/20261031-h350-setup_GetDeviceModeButtonMaps-all.json';
/** The setup builder's record of its calls, numbered in the order it made them. */
const REPLIES = 'work/setups/h350-test/replies';
/** The harvest's compile of eight devices on another account, the same catalogue KPN among them. */
const EIGHT = 'work/harvest/check-350-eight/compile-001-Result.EzHex';

interface ModeButton { ButtonKey: string; ButtonAssignment: unknown }
interface ModeMap { Key: { Value: number }; Value: { ButtonMapId: { Value: number }; Buttons: ModeButton[] } }
interface UserMap { ButtonMapId: { Value: number } | null; Buttons: { __type: string; ButtonKey?: string }[] }

const json = <T>(path: string): T => {
  const at = join(LAB!, path);
  assert.ok(existsSync(at), `${path} is in the lab`);
  return JSON.parse(readFileSync(at, 'utf8')) as T;
};

/** The button keys of the service's mode maps that the Harmony 350's keypad lacks: Teletext, `STORED_UNBOUND`. */
const NOT_ON_THE_350 = new Set(['Teletext']);

test('the account\'s mode maps are what Logitech binds, 8 of 8 devices, and the KPN\'s is the map the setup builder saved, its 35 hard buttons unassigned',
  needs, () => {
    const theirs = labFile(SECOND);
    const modeMaps = json<{ GetDeviceModeButtonMapsResult: ModeMap[] }>(MODE_MAPS).GetDeviceModeButtonMapsResult;
    // The account's device numbers are the metadata archive's, so each mode map is named by its device there.
    const nameOf = new Map(metadataArchive(theirs)!.devices.map((one) => [Number(one.deviceId), one.name]));
    const logitech = maps(theirs);
    // The closure: per device, the buttons its mode map assigns on keys the Harmony 350 has, against the bindings of
    // Logitech's map for it, counted from the compile's bytes. Two sources, the service's reply and the compiler's
    // output, and they agree on every device; counting every button the map lists, assigned or not, is the control.
    const counts: Record<string, [number, number, number]> = {};
    for (const one of modeMaps) {
      const name = nameOf.get(one.Key.Value)!;
      const on350 = one.Value.Buttons.filter((button) => !NOT_ON_THE_350.has(button.ButtonKey));
      counts[name] = [on350.filter((button) => button.ButtonAssignment !== null).length, Object.keys(logitech[nameOfLabel(name)]!).length,
        on350.length];
    }
    assert.deepEqual(counts, {
      'LG TV': [38, 38, 38], Plasma: [40, 40, 40], Denon: [29, 29, 29], KPN: [12, 12, 47],
      Kodi: [41, 41, 41], Switch: [8, 8, 8], 'Sony HT': [30, 30, 30], Knoll: [11, 11, 11],
    });
    // The KPN's mode map is the one map that lists buttons it leaves unassigned, 35 of them.
    const kpn = modeMaps.find((one) => nameOf.get(one.Key.Value) === 'KPN')!;
    const unassigned = kpn.Value.Buttons.filter((button) => button.ButtonAssignment === null).map((button) => button.ButtonKey);
    assert.equal(unassigned.length, 35);
    assert.equal(modeMaps.filter((one) => one.Value.Buttons.some((button) => button.ButtonAssignment === null)).length, 1);
    // And it is the map the setup builder saved: before its one `SaveButtonMaps` the KPN's map was the service's
    // default, with no identifier and a command on each of those 35 hard buttons; after it, a stored map whose
    // identifier is the mode map's, naming exactly those 35 hard buttons.
    const replies = readdirSync(join(LAB!, REPLIES)).sort();
    const saves = replies.filter((file) => file.endsWith('-SaveButtonMaps.bin'));
    assert.equal(saves.length, 1);
    const before = json<{ GetButtonMapsResult: UserMap[] }>(`${REPLIES}/${replies[replies.indexOf(saves[0]!) - 1]!}`).GetButtonMapsResult[0]!;
    const after = json<{ GetButtonMapsResult: UserMap[] }>(`${REPLIES}/${replies[replies.indexOf(saves[0]!) + 1]!}`).GetButtonMapsResult[0]!;
    assert.equal(before.ButtonMapId, null);
    assert.equal(after.ButtonMapId!.Value, kpn.Value.ButtonMapId.Value);
    const hard = (map: UserMap) => map.Buttons.filter((button) => button.__type.startsWith('HardRemoteButton:')).map((button) => button.ButtonKey!).sort();
    assert.deepEqual(hard(before), [...unassigned].sort());
    assert.deepEqual(hard(after), [...unassigned].sort());
    // No other device's map has that identifier, and the save came before the first compile was asked for.
    assert.equal(modeMaps.filter((one) => one.Value.ButtonMapId.Value === kpn.Value.ButtonMapId.Value).length, 1);
    assert.ok(replies.indexOf(saves[0]!) < replies.findIndex((file) => file.endsWith('-StartCompileWithLocaleAndSettings.bin')));
  });

test('built from nothing, the KPN\'s map is the same catalogue KPN\'s on an account where nothing saved its map, 38 of 38 keys, but Replay and Advance',
  needs, () => {
    const { ours } = built();
    const eight = labFile(EIGHT);
    const mine = maps(ours)['KPN']!;
    const other = maps(eight)['KPN_TV6000COK']!;
    const second = maps(labFile(SECOND))['KPN']!;
    // The five favourite channels' keys are this setup's own; the other account has none.
    const favourites = ['82', '88', '89', '8b', 'a2'];
    const differing = (a: Record<string, string>, b: Record<string, string>) => [...new Set([...Object.keys(a), ...Object.keys(b)])]
      .filter((tag) => !favourites.includes(tag) && a[tag] !== b[tag]).sort();
    assert.equal(Object.keys(mine).filter((tag) => !favourites.includes(tag) && mine[tag] === other[tag]).length, 38);
    // The two keys the other account's map binds and ours does not: skip back and skip forward, scans 21 and 38.
    assert.deepEqual(differing(mine, other), ['95', 'a6']);
    assert.equal(mine['95'], undefined);
    assert.equal(mine['a6'], undefined);
    // Which commands they send: the catalogue's Replay and Advance, which the family's table gives no key, and which
    // the service's own default map before the save put on SkipBack and SkipForward.
    const plan = catalogueDevicePlan(eight, archiveAt(IR_ARCHIVE!), { manufacturer: 'KPN', model: 'TV6000COK', label: 'KPN', full: true });
    const scratch = parse(composeIrGroup(eight, plan.device.commands).bytes);
    const codeOf = (name: string) => recordKey(scratch, irGroups(scratch)!.at(-1)!.addresses[plan.wanted.indexOf(name)]!).slice(0, 40);
    assert.ok(other['95']!.includes(codeOf('Replay')));
    assert.ok(other['a6']!.includes(codeOf('Advance')));
    // The control: against the second compile of the test setup, whose KPN map is the saved one, 31 tags differ.
    assert.equal(differing(mine, second).length, 31);
  });

// ---------------------------------------------------------------------------------------------------------------
// The Harmony 300, 5.4: the 350's build is its file, since a build for its own skin is refused.

test('the test setup cannot be built for the Harmony 300\'s own skin, so the Harmony 350 build, with event 0xFF bound, is the file for both',
  needsArchive, () => {
    proves(7, ['harmony-300']);
    // Skin 79, the bench Harmony 300's: the device composer refuses a television's favourite key, whose command is
    // measured on the 350 alone, and even a setup with no television refuses a long press, since the 300's
    // configurations allocate four infrared groups and a long press takes a group from 4 up.
    const as300: Recipe = { ...RECIPE, model: { ...RECIPE.model, skin: 79 } };
    assert.throws(() => buildNoScreenSetup(archiveAt(IR_ARCHIVE!), { recipe: as300, keys: KEYS, builtAt: MOMENT }),
      (error: unknown) => error instanceof ComposeError && /television's favourite key .* not skin 79/.test(error.message));
    const twoDevices: Recipe = {
      ...as300, devices: as300.devices.filter((one) => one.name === 'Denon' || one.name === 'Switch'), activities: [], favourites: [],
    };
    assert.throws(() => buildNoScreenSetup(archiveAt(IR_ARCHIVE!), { recipe: twoDevices, keys: KEYS, builtAt: MOMENT }),
      (error: unknown) => error instanceof ComposeError && /holds 4 groups, so there is no group 6/.test(error.message));
    // The control: the same two devices on the 350's skin build, so it is the skin that refuses and not the pair.
    assert.doesNotThrow(() => buildNoScreenSetup(archiveAt(IR_ARCHIVE!), { recipe: { ...twoDevices, model: RECIPE.model }, keys: KEYS, builtAt: MOMENT }));
    // And the 350's build carries what the 300 needs: event 0xFF bound, the first test, and eight groups, four of them
    // long presses a 300 sends from only through that entry.
    assert.equal(irGroups(built().ours)!.length, 8);
  });
