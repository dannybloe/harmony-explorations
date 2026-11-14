/**
 * **The whole path through the contracts, on the Harmony One**: a device found and fetched, put in a document with
 * a second one, an activity made of both, a key chosen otherwise in the activity and one in a device's own map,
 * the document checked and built, and the built configuration read back, requirements R9, R10, R31, R32 and R78.
 *
 * **What is claimed.** That the functions an application is given fit each other with nothing in between: what a
 * search fetches is what `addDevice` takes, what the toolkit writes is what the build reads, and a document the
 * check lists no error for builds with no catalogue given, since it carries its devices' definitions. And that the
 * two key choices arrive: the television's volume up key in the television's own map sends the receiver's volume
 * up, R32's example, and the activity's Info key sends the receiver's mute.
 *
 * **Why the read back is believed.** What a chosen key sends is compared with a key nobody chose, read off the same
 * configuration: the receiver's own map binds its VolumeUp to its volume up key and its Mute to its mute key by the
 * family's key table, a route that never looks at a recipe's choice. A name through the toolkit and a key table
 * through the builder meet on one code. **The control**: the television's volume down key, which nobody chose,
 * still sends the television's own code, so the choice moved one key and not the map.
 *
 * **Over what.** The lab's sample of the infrared archive, decision 42, for the two devices; one build, which is why
 * this is in the slow tier. **Scope**: the Harmony One, the one family that builds a key's choice. Read in the
 * built configuration; no remote has been given it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { IR_ARCHIVE_SAMPLE, needing, skipWithoutIrArchiveSample, slow } from '@harmony/lab';
import {
  activities, archiveSourceAt, buildFromRecipe, deviceModeMaps, devices, fetchDevice, findDevices, keyCodes, parse,
  readRecipe, recipe,
} from '../../src/node.ts';

/**
 * The Harmony One's keys used here, by the scan codes its drawing gives them, which is how the readers report a key.
 * The document names a key by its word instead, as an application does, and the family turns the word into the scan:
 * so a key chosen by word and read back by the drawing's scan is two routes meeting on one key.
 */
const VOLUME_UP = 3;
const VOLUME_DOWN = 4;
const MUTE = 9;
const INFO = 10;
/** A key code's event type for a press. */
const PRESS = 2;

test('a device found, fetched and added, an activity made, two keys chosen, the document checked and built: both keys send what was chosen',
  needing(skipWithoutIrArchiveSample(), slow()), async () => {
    const sources = [archiveSourceAt(IR_ARCHIVE_SAMPLE as string)];
    // The television is found by what a person types; the receiver by a result an application kept, since the
    // sample holds its device and not its manufacturer's index.
    const search = await findDevices(sources, { manufacturer: 'sony', model: 'kdl 32w705b' });
    assert.deepEqual(search.failed, []);
    const found = search.found[0]!;
    assert.deepEqual([found.entry, found.match], ['Sony/KDL-32W705B', 1]);
    const kept = { source: 'archive', entry: 'Denon/AVR-1912', manufacturer: 'Denon', model: 'AVR-1912', match: 1 };

    let document = recipe.create({ name: 'Harmony One', skin: 54 });
    document = recipe.addDevice(document, { name: 'Television', device: await fetchDevice(sources, found) }).document;
    document = recipe.addDevice(document, { name: 'Receiver', device: await fetchDevice(sources, kept) }).document;
    document = recipe.addActivity(document, {
      name: 'Watch TV', type: 'WatchTV',
      devices: [{ device: 'd1', roles: ['Display', 'ChannelChanging'] }, { device: 'd2', roles: ['Volume'] }],
    }).document;
    // The keys a choice is made for are the model's to list, by word, and the commands the document's own.
    const keys = recipe.keyNames(document);
    assert.ok(keys.includes('VolumeUp') && keys.includes('Info'));
    const receiverCommands = recipe.commands(document, 'd2').map((one) => one.name);
    assert.ok(receiverCommands.includes('VolumeUp') && receiverCommands.includes('Mute'));
    document = recipe.setKey(document, { owner: { device: 'd1' }, key: 'VolumeUp' }, { device: 'd2', command: 'VolumeUp' }).document;
    document = recipe.setKey(document, { owner: { activity: 'a1' }, key: 'Info' }, { device: 'd2', command: 'Mute' }).document;
    assert.deepEqual(recipe.check(document), []);
    // It is a recipe as it stands: written to disk and read back, it is the same document.
    assert.deepEqual(readRecipe(JSON.parse(JSON.stringify(document))), document);

    // Built with no catalogue given: everything the build reads is in the document.
    const built = buildFromRecipe(document, { builtAt: '2026-11-14T10:00:00' });
    assert.equal(built.kind, 'configuration');
    const c = parse((built as { bytes: Uint8Array }).bytes);

    const groupOf = (name: string): number => devices(c).find((one) => one.name === name)?.group as number;
    const television = groupOf('Television');
    const receiver = groupOf('Receiver');
    assert.ok(television !== undefined && receiver !== undefined && television !== receiver);
    /** What the press of a key sends in a device's own map, as `group.code` per code sent. */
    const inMode = (group: number, scan: number): string[] => (deviceModeMaps(c).find((one) => one.group === group)?.keypad ?? [])
      .filter((one) => one.event === PRESS && one.scan === scan).flatMap((one) => one.codes.map((code) => `${code.group}.${code.code}`));
    // What nobody chose, off the receiver's own map: its volume up and its mute, each one code of its own.
    const volumeUp = inMode(receiver, VOLUME_UP);
    const mute = inMode(receiver, MUTE);
    assert.equal(volumeUp.length, 1);
    assert.equal(mute.length, 1);
    assert.ok(volumeUp[0]!.startsWith(`${receiver}.`) && mute[0]!.startsWith(`${receiver}.`) && volumeUp[0] !== mute[0]);

    // R32: the television's volume up key, in the television's own map, sends the receiver's volume up.
    assert.deepEqual(inMode(television, VOLUME_UP), volumeUp);
    // The control: the key beside it, which nobody chose, still sends a code of the television's own.
    const volumeDown = inMode(television, VOLUME_DOWN);
    assert.equal(volumeDown.length, 1);
    assert.ok(volumeDown[0]!.startsWith(`${television}.`));

    // R31: the activity's Info key sends the receiver's mute.
    const activity = activities(c).find((one) => one.name === 'Watch TV');
    assert.ok(activity !== undefined);
    const inActivity = (scan: number): string[] => keyCodes(c)
      .filter((one) => one.where === 'set' && one.index === activity.set && one.event === PRESS && one.scan === scan)
      .flatMap((one) => one.codes.map((code) => `${code.group}.${code.code}`));
    assert.deepEqual(inActivity(INFO), mute);
    // And its volume up key, which the receiver's job in the activity gives it and nobody chose, sends the receiver's.
    assert.deepEqual(inActivity(VOLUME_UP), volumeUp);
  });
