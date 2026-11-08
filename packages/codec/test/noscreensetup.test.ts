/**
 * The Harmony 350 test setup composed whole onto a Logitech compile and held against Logitech's compile of it,
 * `todo-compile-350.md` 4.5: `composeNoScreenSetup`, which runs the family's device and favourite composers in the
 * order they need, and the file the bench unit is given.
 *
 * **The route, and why this one.** Logitech's service compiled the test setup twice for the bench 350's record, first
 * without the five favourite channels and then with them, the lab's `work/setups/h350-test/first-compile/
 * compile-Result.EzHex` and `compile-Result.EzHex`. The first is the donor: the five devices `withoutNoScreenDevice`
 * can take out are taken out of it, the Knoll, Kodi, the Switch and the Sony HT on the long presses and then the
 * Plasma on the top right key's short press, and the setup is composed back onto what is left, every device it now
 * lacks on the key the donor had it on, then the five favourite channels on the KPN. The result is held against the
 * second compile, which is the same account with the channels saved, so every part of it has an answer. Three
 * devices and the activity stay Logitech's: the LG TV, which is on the TV mode group and which the removal refuses;
 * the Denon, whose input variable it refuses; and the KPN, whose codes the activity sends; and so Watch TV, which
 * names all three. The bench 350's own three device file was weighed as the donor and does not fit the setup: its
 * TV mode group holds the plasma, its KPN is another model with five favourite channels of its own, and its
 * Chromecast holds a key with no codes, none of which a step here takes out, so the activity composer's step for step
 * comparison, `noscreenactivity.test.ts`, stays the activity's calibration.
 *
 * **What it settled, in counts.** Composed back, the file is Logitech's second compile read by content: all 331
 * lists as a multiset, every call written out and every number that follows placement named; all nine key maps,
 * binding for binding; every infrared record of every group, the three kept devices' in Logitech's order and the five
 * composed devices' as a set; every state variable with its transitions; all 16 timer records; the start up events;
 * the number sender with its three digit tables; and each device's commands in the metadata archive. The removal took
 * 165 lists out, 15, 51, 11, 30 and 58, and composing the five back adds 165, found by construction rather than by
 * reachability, an independent closure; the favourites add the five that make 331.
 *
 * **A correction**: until `todo-compile-350.md` 5.1.6 the start up events were compared as eleven empty strings on
 * both sides, since the helper read each instruction of raw slot 5 as an address, `startUp` in `noscreenparts.ts`.
 * Spelled out from the slot's bytes they agree, entry 1 selecting the LG TV's map in both, so the claim stands and
 * was not held until then.
 *
 * **What differs, and why each is placement or numbering**, asserted in the second test:
 *
 * * **the length, by 6 bytes, all of it the metadata archive's**, which is ours deflated rather than Logitech's;
 * * **the metadata archive's order**: the composed devices go to its end in the order composed, so the account's
 *   order, LG TV, Plasma, Denon, KPN and on, becomes LG TV, Denon, KPN, Plasma and on, each composed device with a
 *   DeviceId above the last; the activity flips its devices' power in the archive's order, and its three devices
 *   keep theirs;
 * * **the key table's order at one tag**, Kodi's held event, `0xC1`, which shares a slot of the compiler's hash map
 *   with `0x2E` and `0x85`, stored after them by Logitech and put in front by `inCompilerOrder`, as
 *   `noscreenremove.test.ts` found composing the Kodi back alone;
 * * **the order of the records within each composed device's group**, the composer's commands then power steps
 *   where Logitech's follows an order no compile states, so each composed device's codes are numbered otherwise.
 *
 * **What it found on the way**: `inCompilerOrder` sized a stored key map by its entries alone, so the key table left
 * after the five removals, eleven tags still in the 32 slot order Logitech's seventeen were stored in, read as no hash
 * map's and the first device composed back was refused. A Java `HashMap` never shrinks, so the table keeps the size
 * it grew to, and the simulation now takes the smallest size at which the stored order is slot order. Every list it
 * read before is in slot order at the smallest size, so nothing read before reads otherwise.
 *
 * **Controls**, each run and reverted by string replacement in the source: composing every device with its own
 * volume rather than `volumeSource`'s stores the volume and mute records Logitech routes to the Denon, and the
 * closure fails, 176 lists added where 170 are; composing the long presses before the short ones is refused by the
 * device composer, the top right key holding no short press device yet; putting the favourite channels in reversed
 * passes the lists, which are a multiset, and fails the KPN's map; and sizing a stored key map by its entries alone
 * again refuses the composition.
 *
 * **Sources checked first**: the family's composers and their tests, `noscreen.test.ts`, `noscreenremove.test.ts`,
 * `noscreenfavourites.test.ts` and `noscreenactivity.test.ts`; the reference's `harmony-300-350/memory.md`; the lab's
 * `work/setups/h350-test/chapter4-reading.md`. Logitech's client compiles nothing for this family, the service does.
 * **Which architectures**: the Harmony 350 alone, one setup on one account; the Harmony 300 has no long press and no
 * favourite key table and is not run.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertFileFamilyContainer } from '@harmony/usb';
import { IR_ARCHIVE, LAB, needing, skipWithoutIrArchive, skipWithoutLab } from '@harmony/lab';

import {
  ComposeError, composeNoScreenSetup, type ComposedNoScreenSetup, type Container, devicePlaces, metadataArchive,
  parse, type Recipe, taggedList, withoutNoScreenDevice,
} from '../src/index.ts';
import { allLists, maps, records, senders, startUp, timerRecords, transitions } from './noscreenparts.ts';
import { archiveAt } from '../src/catalogue.node.ts';

const needs = needing(skipWithoutLab(), skipWithoutIrArchive());

const FIRST = 'work/setups/h350-test/first-compile/compile-Result.EzHex';
const SECOND = 'work/setups/h350-test/compile-Result.EzHex';
/** The file the bench unit is given, written by `bin/compose-no-screen-setup.ts`. */
const COMPOSED = 'work/setups/h350-test/composed-4.5.bin';
/** The devices taken out of the first compile, in the order the removal allows: a long press before its key's short. */
const TAKEN_OUT = ['Knoll', 'Kodi', 'Switch', 'Sony HT', 'Plasma'];
const KEPT = ['LG TV', 'Denon', 'KPN'];

const RECIPE = JSON.parse(readFileSync(new URL('../../corpus/setups/h350-test.json', import.meta.url), 'utf8')) as Recipe;

/**
 * Where Logitech's service put each device, as the setup file's own account of its compile states it: top left the LG
 * TV and the Knoll, top right the Plasma and Kodi, bottom left the Denon and the Switch, bottom right the KPN and the
 * Sony HT, short and long.
 */
const KEYS = {
  'LG TV': { place: 0, press: 'short' }, Knoll: { place: 0, press: 'long' },
  Plasma: { place: 1, press: 'short' }, Kodi: { place: 1, press: 'long' },
  Denon: { place: 2, press: 'short' }, Switch: { place: 2, press: 'long' },
  KPN: { place: 3, press: 'short' }, 'Sony HT': { place: 3, press: 'long' },
} as const;

function labFile(path: string): Container {
  const at = join(LAB!, path);
  // The lab is there, so a missing file fails rather than skips: the claim is about these files.
  assert.ok(existsSync(at), `${path} is in the lab`);
  return parse(new Uint8Array(readFileSync(at)));
}

let memo: { first: Container; donor: Container; dropped: number[]; out: ComposedNoScreenSetup; ours: Container; theirs: Container } | undefined;
/** The route, run once: the first compile, the five taken out, the setup composed back. */
function composed() {
  if (memo !== undefined) return memo;
  const first = labFile(FIRST);
  let donor = first;
  const dropped: number[] = [];
  for (const name of TAKEN_OUT) {
    const removed = withoutNoScreenDevice(donor, name);
    dropped.push(removed.lists.length);
    donor = parse(removed.bytes);
  }
  const out = composeNoScreenSetup(donor, archiveAt(IR_ARCHIVE!), { recipe: RECIPE, keys: KEYS });
  memo = { first, donor, dropped, out, ours: parse(out.bytes), theirs: labFile(SECOND) };
  return memo;
}

/** The labels a configuration names its devices by. */
const label = (name: string): string => name.replaceAll(' ', '_');
const omit = <T>(record: Record<string, T>, keys: readonly string[]): Record<string, T> =>
  Object.fromEntries(Object.entries(record).filter(([name]) => !keys.includes(name)));

test('the keys the setup is composed on are where Logitech\'s service put each device, in both of its compiles', needs, () => {
  const placed = (c: Container) => Object.fromEntries(Object.entries(devicePlaces(c)).map(([name, where]) => [name, { ...where }]));
  const keys = Object.fromEntries(Object.entries(KEYS).map(([name, where]) => [label(name), { ...where }]));
  assert.deepEqual(placed(labFile(FIRST)), keys);
  assert.deepEqual(placed(labFile(SECOND)), keys);
});

test('composed back onto Logitech\'s first compile with five devices taken out, the whole setup is Logitech\'s second compile read by content',
  needs, () => {
    const { donor, dropped, out, ours, theirs } = composed();
    assert.ok(ours.allChecksPass);
    assert.deepEqual(out.composed.map((one) => [one.name, one.group]), [['Plasma', 1], ['Kodi', 5], ['Switch', 6], ['Sony HT', 7], ['Knoll', 4]]);
    assert.deepEqual(out.kept, KEPT);
    // The closure: the removal found its lists by reachability, the composers make their own by construction.
    assert.deepEqual(dropped, [15, 51, 11, 30, 58]);
    assert.equal(donor.pointerArray(7)!.length, 326 - 165);
    assert.equal(out.favourites.length, 1);
    // A list per channel, and no digit copy, since Logitech's KPN holds its copies already.
    assert.equal(out.favourites[0]!.copiesAdded, 0);
    assert.equal(ours.pointerArray(7)!.length - donor.pointerArray(7)!.length, 165 + 5);
    assert.equal(ours.pointerArray(7)!.length, 331);
    assert.equal(theirs.pointerArray(7)!.length, 331);
    // Every list, as a multiset with every call written out and every placement number named.
    assert.deepEqual(allLists(ours), allLists(theirs));
    // Every map, binding for binding: the key table and each device's, by the device's name.
    const [mine, logitech] = [maps(ours), maps(theirs)];
    assert.deepEqual(Object.keys(mine).sort(), Object.keys(logitech).sort());
    assert.equal(Object.keys(logitech).length, 9);
    for (const name of Object.keys(logitech)) assert.deepEqual(mine[name], logitech[name], name);
    // The channels as entered, four as numbers and 07 digit by digit, each on the key Logitech's map binds it to.
    assert.deepEqual(out.favourites[0]!.channels.map((one) => one.sent), ['number', 'number', 'number', 'number', 'digits']);
    // Every record: the kept devices' in Logitech's order, the composed ones' as a set.
    const composedLabels = TAKEN_OUT.map(label);
    assert.deepEqual(omit(records(ours), composedLabels), omit(records(theirs), composedLabels));
    for (const name of composedLabels) assert.deepEqual([...records(ours)[name]!].sort(), [...records(theirs)[name]!].sort(), name);
    assert.equal(Object.values(records(theirs)).flat().length, 250);
    // Every state variable with its transitions, every timer, the start up events and the number sender.
    assert.deepEqual(transitions(ours), transitions(theirs));
    assert.deepEqual(timerRecords(ours), timerRecords(theirs));
    assert.equal(timerRecords(theirs).length, 16);
    assert.deepEqual(startUp(ours), startUp(theirs));
    assert.deepEqual(senders(ours), senders(theirs));
    assert.equal(senders(theirs).length, 1);
    // Each device's commands in the metadata archive, by its name.
    const commands = (c: Container) => Object.fromEntries(metadataArchive(c)!.devices.map((one) => [one.name, one.commands.map((x) => x.name)]));
    assert.deepEqual(commands(ours), commands(theirs));
  });

test('what differs from Logitech\'s second compile is placement and numbering: the archive\'s deflate and order, one tag of the key table, and the order of the composed devices\' records',
  needs, () => {
    const { ours, theirs } = composed();
    // The metadata archive is the last section, so its length is the file's from its start, and the whole length
    // difference is there.
    const archive = (c: Container) => c.blob.length - c.blobOffsetOf(c.sections[13]!.address)!;
    // -6 while the archive went through Node's zlib; -4 since our own deflate writes Logitech's streams, 5.1.4,
    // so what is left is the archive's order.
    assert.equal(ours.blob.length - theirs.blob.length, -4);
    assert.equal(archive(ours) - archive(theirs), -4);
    // The archive's order: the composed devices at its end, in the order composed, each with a DeviceId above the last.
    const listed = (c: Container) => metadataArchive(c)!.devices.map((one) => `${one.index} ${one.name} ${one.deviceId}`);
    assert.deepEqual(listed(theirs), ['0 LG TV 83962903', '1 Plasma 83962904', '2 Denon 83962905', '3 KPN 83962906', '4 Kodi 83962907',
      '5 Switch 83962908', '6 Sony HT 83962909', '7 Knoll 83962910']);
    assert.deepEqual(listed(ours), ['0 LG TV 83962903', '1 Denon 83962905', '2 KPN 83962906', '3 Plasma 83962907', '4 Kodi 83962908',
      '5 Switch 83962909', '6 Sony HT 83962910', '7 Knoll 83962911']);
    // The key table holds the same seventeen tags, in Logitech's order but for Kodi's held tag.
    const tags = (c: Container) => taggedList(c, c.pointerArray(6)![0]!)!.entries.map((one) => one.tag.toString(16));
    assert.deepEqual(tags(theirs), ['44', '45', '47', '41', 'c5', '81', 'c4', 'c7', '2e', '85', 'c1', '2f', '84', '87', '86', '2d', '30']);
    assert.deepEqual(tags(ours), ['44', '45', '47', '41', 'c5', '81', 'c4', 'c7', 'c1', '2e', '85', '2f', '84', '87', '86', '2d', '30']);
    // The records of each composed device are Logitech's in another order, which is why its codes number otherwise.
    const reordered = TAKEN_OUT.map(label).filter((name) => records(ours)[name]!.join() !== records(theirs)[name]!.join());
    assert.deepEqual(reordered, TAKEN_OUT.map(label));
    assert.deepEqual(KEPT.map(label).filter((name) => records(ours)[name]!.join() !== records(theirs)[name]!.join()), []);
  });

test('the file in the lab for the bench unit is this composition byte for byte, and passes the writer\'s container checks', needs, () => {
  const { out } = composed();
  const at = join(LAB!, COMPOSED);
  assert.ok(existsSync(at), `${COMPOSED} is in the lab, written by bin/compose-no-screen-setup.ts`);
  const file = new Uint8Array(readFileSync(at));
  assert.deepEqual(file, out.bytes);
  // GSPM and PTYY, the end marker, end_addr at it and the trailer checksum, as write-file-config.ts checks them.
  const checked = assertFileFamilyContainer(file);
  assert.equal(checked.readLength, file.length - 4);
});

test('the setup composer refuses a key that disagrees with the configuration, a device with no key, and an activity naming a composed device',
  needs, () => {
    const { donor } = composed();
    assert.throws(() => composeNoScreenSetup(donor, archiveAt(IR_ARCHIVE!), { recipe: RECIPE, keys: { ...KEYS, 'LG TV': { place: 1, press: 'short' }, Plasma: { place: 0, press: 'short' } } }),
      (error: unknown) => error instanceof ComposeError && /holds LG TV on group 0, and the keys put it on group 1/.test(error.message));
    const { Knoll: _, ...noKnoll } = KEYS;
    assert.throws(() => composeNoScreenSetup(donor, archiveAt(IR_ARCHIVE!), { recipe: RECIPE, keys: noKnoll }), /give Knoll no place/);
    assert.throws(() => composeNoScreenSetup(donor, archiveAt(IR_ARCHIVE!), { recipe: RECIPE, keys: { ...KEYS, Knoll: { place: 1, press: 'long' } } }),
      /Knoll and Kodi are both on group 5|Kodi and Knoll are both on group 5/);
    const activity = RECIPE.activities[0]!;
    const naming = { ...RECIPE, activities: [{ ...activity, devices: [...activity.devices, { device: 'Plasma', roles: [] }] }] };
    assert.throws(() => composeNoScreenSetup(donor, archiveAt(IR_ARCHIVE!), { recipe: naming, keys: KEYS }), /names Plasma, which is composed here/);
  });
