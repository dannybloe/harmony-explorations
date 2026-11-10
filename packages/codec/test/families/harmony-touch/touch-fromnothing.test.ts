/**
 * The Harmony Touch's documents built from a setup file with no Logitech document as input: the
 * setup file read, Settings and Context written from nothing, the four lists composed onto empty ones, and each device's
 * record written from its catalogue entry in the archive and our own rhythm table, `fromnothing.ts` and
 * `archivedevice.ts`.
 *
 * **What is held here.**
 *
 * 1. **The setup file describes the bench setup as 8.6's description does.** `packages/corpus/setups/touch-test.json`
 *    read by `readTouchSetupFile` and put in 8.6's form by `setupOfSetupFile` is `touch-setups/8.6-test-setup.json`
 *    exactly, devices, activities, every key, step and sequence, with one difference: the setup file states the LG TV's
 *    channel tuning, three digits and empty steps, which 8.6's composer carried whole from Logitech's record and which the
 *    archive does not hold for that entry. The maker and model come from the catalogue record, so the comparison runs on
 *    a catalogue stating 8.6's, and needs no lab and no archive. The file holds no address and no account value.
 * 2. **What the reader refuses**, each case beside a control: a model other than the Touch, favourite channels, no
 *    Touch's part, an id not ours or shared, a power order that does not name the activity's devices, a setting that is
 *    not text, and a device or an activity one part names and the other does not.
 * 3. **Settings from nothing**: the nine rows the remote reads, in Logitech's order, every value the file's but the two
 *    background rows, which name our background, no default the remote falls back on, the user's picture store ours and
 *    the default one empty; and the refusals of a value the remote mishandles or a background given in the file, beside
 *    the range's ends as controls.
 * 3a. **Our background**, the picture that keeps the stored pictures on the remote, `empty.ts` in the codec says why:
 *    240 by 320 and its twin 60 by 80, eight bits a channel with alpha, which the gate's picture rule lets through at
 *    both addresses, the same bytes from every build, named by the digest of its bytes, never in an account
 *    identifier's shape and with no `p`, `n` or `g` before its extension, which the screens' twin rule would rewrite.
 *    The control: the background at its twin's address is refused, larger than the twin's box.
 * 4. **Context from nothing**: the account's seven fields alone, in the alphabetical order Logitech's documents keep,
 *    through `composeTouchContext`'s checks; a made up account here, since the real one is the lab's.
 * 5. **The empty lists** are the four lists' shells and nothing else.
 * 6. **With the archive**, the seven devices' records: their command counts, 63, 118, 31, 59, 38, 54 and 10, 373 in
 *    all; the families each sends, written as definitions of ours under the file's ids; and the features each carries,
 *    the LG TV's two states with 10 and 3 values among them. The six documents built with a made up account read back
 *    as 5 activities, 7 devices, 12 maps and 5 definitions, pass the gate, find the same two findings of the screens'
 *    lists 8.6's set finds, and give the favourites address to the LG TV alone. The controls: a family with no id of
 *    ours, an id that is not ours, two families sharing an id, an entry the archive does not hold, and a favourites
 *    activity with an account that states no favourites, each refused.
 *
 * **Why these counts are the ones to hold.** The 373 commands are the count `packages/corpus/test/touch/touch-nothing-set.test.ts`
 * holds sending the same as the commands of 8.6's set, Logitech's documents, so a reader that drops or doubles a command
 * moves both. The feature counts are the archive's per entry, read through `driving.ts`.
 *
 * **Sources checked first.** The 9.1 brief in the lab; `setup.ts` and `touch-setup.test.ts`, whose composer this feeds;
 * `driving.ts` and `catalogue.ts` and their tests, for what the archive holds per entry; `definition.ts` for the
 * definitions of ours; the reference's `devices-and-infrared.md` "What a writer must carry" and
 * `favourites-and-settings.md`; and the lab's decompiled engine, `userconfigreader.lua`, for which fields the engine reads.
 * Logitech's client was not consulted: what is built is ours, and what it is compared with is the remote's documents.
 *
 * **Which architectures**: the Harmony Touch alone, firmware 4.15.330; its firmware reports 17 and Logitech's templates
 * file it under 18. Nothing here touches a remote, and the half that needs the archive skips without it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { IR_ARCHIVE, skipWithoutIrArchive } from '@harmony/lab';

import { checkConfiguration, findingsByRule, refusalsBeforeASync } from '../../../src/families/harmony-touch/check.ts';
import { ComposeRefusal } from '../../../src/families/harmony-touch/compose.ts';
import type { DeviceWithFeatures, SyncDocuments } from '../../../src/families/harmony-touch/documents.ts';
import { deviceRecordOfArchive } from '../../../src/families/harmony-touch/archivedevice.ts';
import {
  OUR_PICTURE_STORE, SETTINGS_ROWS_WRITTEN, buildTouchDocuments, ourBackground, emptyTouchLists, readTouchSetupFile, contextOfAccount, settingsOfSetupFile,
  setupOfSetupFile, type TouchAccount, type TouchSetupFile,
} from '../../../src/families/harmony-touch/fromnothing.ts';
import { pictureRefusals } from '../../../src/families/harmony-touch/favourites.ts';
import { readConfiguration } from '../../../src/families/harmony-touch/read.ts';
import { readPng } from '../../../src/screens/png.ts';
import type { TouchSetup } from '../../../src/families/harmony-touch/setup.ts';
import { RecipeError } from '../../../src/recipe/recipe.ts';
import { archiveAt } from '../../../src/catalogue/catalogue.node.ts';
import '../../../src/support/resources.node.ts';

// The setup file and the documents are JSON; the broken ones are built as such.
type Json = any;

const SETUP_FILE = new URL('../../../../corpus/setups/touch-test.json', import.meta.url);
const DESCRIPTION = new URL('../../../../corpus/touch-setups/8.6-test-setup.json', import.meta.url);
const raw = (): Json => JSON.parse(readFileSync(SETUP_FILE, 'utf8'));
const file = (): TouchSetupFile => readTouchSetupFile(raw());
const description = (): TouchSetup => (JSON.parse(readFileSync(DESCRIPTION, 'utf8')) as { setup: TouchSetup }).setup;

/** The message a reader or composer refuses with, or nothing when it reads. */
function refusalOf(f: () => unknown): string | undefined {
  try {
    f();
    return undefined;
  } catch (e) {
    if (e instanceof ComposeRefusal || e instanceof RecipeError) return e.message;
    throw e;
  }
}

/** A made up account, in the shape the lab's account file holds the real one. */
const ACCOUNT: TouchAccount = {
  context: {
    'AccountId-': 1234, CountryCode: 'GB', Email: 'a person', HouseholdUserProfileUri: 'example.invalid/user/default', InstallerId: null,
    Language: 'en-GB', SetupSession: { Client: 'x', IsStale: false, SetupType: null, Type: 0 },
  },
  tuning: { DeviceProfileUri: 'example.invalid/profile', ContentProfileKey: 77 },
};

test('the setup file describes the bench setup as 8.6\'s description does, seven devices and five activities, but for the LG TV\'s channel tuning, and holds no address', () => {
  const desc = description();
  // The maker and model are the catalogue record's; a catalogue stating 8.6's, with nothing else in it.
  const catalogue = { devices: desc.devices.map((d) => ({ Device: { 'Id-': d.id, Manufacturer: d.manufacturer, Model: d.model }, Commands: [], DeviceFeatures: [] }) as unknown as DeviceWithFeatures), protocols: [] };
  const ours = JSON.parse(JSON.stringify(setupOfSetupFile(file(), catalogue))) as Json;
  assert.deepEqual([ours.devices.length, ours.activities.length], [7, 5]);
  assert.deepEqual(ours.devices.filter((d: Json) => d.channelTuning !== undefined).map((d: Json) => [d.name, d.channelTuning]),
    [['LG TV', { fixedDigits: 3, start: [''], finish: [''], greaterTen: [''], greaterHundred: [''] }]]);
  for (const d of ours.devices) delete d.channelTuning;
  assert.deepEqual(ours, desc);
  const text = readFileSync(SETUP_FILE, 'utf8');
  assert.ok(!text.includes('://') && !text.includes('@'), 'no address of any kind');
});

test('the reader refuses another model, favourite channels, no Touch\'s part, an id not ours or shared, a power order off the devices and a setting not text', () => {
  const r = (x: Json) => refusalOf(() => readTouchSetupFile(x));
  const t = raw();
  const part = (change: (p: Json) => void): Json => {
    const x = raw();
    change(x.touch);
    return x;
  };
  const refused: [Json, RegExp][] = [
    [{ ...t, model: { name: 'Harmony One', skin: 54 } }, /is for the Harmony One, not the Harmony Touch/],
    [{ ...t, favourites: [{ device: 'KPN', channels: ['1'] }] }, /states favourite channels/],
    [(() => { const { touch: _, ...x } = t; return x; })(), /has no Touch's part/],
    [part((p) => { p.devices[0].id = 12; }), /the device "LG TV"'s id is not one of ours/],
    [part((p) => { p.devices[1].id = p.devices[0].id; }), /the device "Denon AV Receiver"'s id is another's too/],
    [part((p) => { p.protocols['Sony 20 Bit'] = p.devices[0].id; }), /the device "LG TV"'s id is another's too/],
    [part((p) => { delete p.activities[0].powerOrder[Object.keys(p.activities[0].powerOrder)[0]!]; }), /power order does not name exactly its devices/],
    [part((p) => { p.settings.ScreenTimeout = 10; }), /the setting ScreenTimeout is not text/],
    [part((p) => { p.devices.pop(); }), /the recipe's device "Switch" has no part of the Touch's/],
    [part((p) => { p.activities[0].activity = 'Watch Telly'; }), /names an activity "Watch Telly" the recipe does not/],
    [part((p) => { p.activities[0].startScreen = 'nowhere'; }), /opens on no screen a Touch has/],
  ];
  for (const [x, why] of refused) assert.match(r(x) ?? 'read', why);
  // The control: the file as it stands reads.
  assert.equal(r(t), undefined);
});

test('Settings from nothing: the nine rows in Logitech\'s order, the file\'s values but the background, ours, no default to fall back on, and a value the remote mishandles refused', () => {
  const s = settingsOfSetupFile(file()) as Json;
  const ours = ourBackground().name;
  assert.deepEqual(Object.keys(s), ['RemoteName', 'DefaultImageBucketUri', 'Settings', 'UserImageBucketUri']);
  assert.deepEqual([s.RemoteName, s.DefaultImageBucketUri, s.UserImageBucketUri], ['Harmony Touch', '', OUR_PICTURE_STORE]);
  assert.deepEqual(s.Settings.map((x: Json) => x.Name), [...SETTINGS_ROWS_WRITTEN]);
  assert.deepEqual(s.Settings.map((x: Json) => x.DefaultValue), SETTINGS_ROWS_WRITTEN.map(() => null));
  const values = raw().touch.settings as Record<string, string>;
  assert.deepEqual(s.Settings.map((x: Json) => x.Values),
    SETTINGS_ROWS_WRITTEN.map((n) => (n === 'UserImages' || n === 'BackgroundImage' ? [ours] : [values[n]])));
  const r = (change: Record<string, unknown>) => refusalOf(() => settingsOfSetupFile({ ...file(), touch: { ...file().touch, settings: { ...values, ...change } as Record<string, string> } }));
  const refused: [Record<string, unknown>, RegExp][] = [
    [{ UserImages: 'x' }, /UserImages is not given a value: the background is the picture of ours/],
    [{ BackgroundImage: 'x.png' }, /BackgroundImage is not given a value: the background is the picture of ours/],
    [{ IsWiFiEnabled: 'true' }, /IsWiFiEnabled is not a setting a Settings of ours writes/],
    [{ ScreenBrightness: '9' }, /ScreenBrightness: 9 is outside 10 to 100/],
    [{ ScreenTimeout: '0' }, /ScreenTimeout: 0 is outside 1 to 30/],
    [{ ScreenTimeout: '31' }, /ScreenTimeout: 31 is outside 1 to 30/],
    [{ KeyBrightness: '1e1' }, /not a whole number written in decimal digits/],
    [{ EditLock: 'yes' }, /a yes or no setting takes "true" or "false"/],
  ];
  for (const [change, why] of refused) assert.match(r(change) ?? 'written', why, JSON.stringify(change));
  const { EditLock: _, ...withoutEditLock } = values;
  assert.match(refusalOf(() => settingsOfSetupFile({ ...file(), touch: { ...file().touch, settings: withoutEditLock } })) ?? '', /EditLock is given no value/);
  // The controls: each range's ends.
  for (const change of [{ ScreenBrightness: '10' }, { ScreenBrightness: '100' }, { ScreenTimeout: '1' }, { ScreenTimeout: '30' }, { KeyBrightness: '0' }, { EditLock: 'true' }]) {
    assert.equal(r(change), undefined, JSON.stringify(change));
  }
});

test('our background: 240 by 320 and a 60 by 80 twin in the form the gate takes, the same bytes every build, named by their digest, at the two addresses the screens build', () => {
  const b = ourBackground();
  const shape = (png: Uint8Array) => { const h = readPng(png); return [h.width, h.height, h.bitDepth, h.colourType, h.interlace]; };
  assert.deepEqual([shape(b.picture), shape(b.twin)], [[240, 320, 8, 6, 0], [60, 80, 8, 6, 0]]);
  assert.deepEqual([pictureRefusals(b.addresses.picture, b.picture), pictureRefusals(b.addresses.twin, b.twin)], [[], []]);
  const again = ourBackground();
  assert.ok(Buffer.from(again.picture).equals(Buffer.from(b.picture)) && Buffer.from(again.twin).equals(Buffer.from(b.twin)));
  assert.equal(b.name, `${createHash('sha256').update(b.picture).digest('hex').slice(0, 32)}.png`);
  assert.match(b.name, /^[0-9a-f]{32}\.png$/);
  assert.deepEqual(b.addresses, { picture: `${OUR_PICTURE_STORE}${b.name}`, twin: `${OUR_PICTURE_STORE}${b.name.slice(0, 32)}_small.png` });
  // The screens' own twin rule, `gsub(v, ".png", "_small.png")` with the dot matching any character, gives the twin's name.
  assert.equal(b.name.replace(/.png/g, '_small.png'), b.addresses.twin.slice(OUR_PICTURE_STORE.length));
  // The control: the background at the twin's address is larger than the twin's box.
  assert.match(pictureRefusals(b.addresses.twin, b.picture).join(' '), /240 by 320, larger than the 60 by 80/);
});

test('Context from nothing is the account\'s seven fields alone, in alphabetical order, checked as a composed Context is', () => {
  const c = contextOfAccount(ACCOUNT) as Json;
  assert.deepEqual(Object.keys(c), ['AccountId-', 'CountryCode', 'Email', 'HouseholdUserProfileUri', 'InstallerId', 'Language', 'SetupSession']);
  assert.deepEqual(c, ACCOUNT.context);
  assert.match(refusalOf(() => contextOfAccount({ context: { ...ACCOUNT.context, Language: 'English' } })) ?? '', /Language is not a language and a region/);
});

test('the four lists a setup is composed onto are each one empty list and nothing more', () => {
  assert.deepEqual(emptyTouchLists(), { ActivityList: { Activities: [] }, DeviceList: { DevicesWithFeatures: [] }, MapList: { ButtonMaps: [] }, ProtocolList: { Protocols: [] } });
});

const ENTRIES = ['LG/OLED65G36LA', 'Denon/AVC-X4800H', 'Sony/BDP-S6500', 'Plex/Plex_Player', 'KPN/TV6000COK', 'Microsoft/XBox_360_Elite', 'Ligawo/3090063'];

test('with the archive: each device\'s record, its commands, the families it sends under our ids and its features; 373 commands in all', skipWithoutIrArchive(), () => {
  const f = file();
  assert.deepEqual(f.devices.map((d) => d.device), ENTRIES);
  const kinds = (r: DeviceWithFeatures) => (r.DeviceFeatures as Json[]).map((x) => `${String(x.__type).split(':')[0]}${x.Inputs?.length ? ` ${x.Inputs.length}` : ''}${x.StateValues ? ` ${x.StateValues.length}` : ''}`);
  const written = f.devices.map((r) => {
    const p = f.touch.devices.find((x) => x.device === r.name)!;
    const w = deviceRecordOfArchive(archiveAt(IR_ARCHIVE!), { entry: r.device, id: p.id, protocolIds: f.touch.protocols });
    assert.equal(w.record.Device['Id-'], p.id);
    for (const d of w.protocols) assert.equal(d['Id-'], f.touch.protocols[d.Name as string], `${r.name} ${String(d.Name)}`);
    return [r.name, w.record.Commands?.length ?? 0, w.protocols.map((d) => d.Name).join(' and '), kinds(w.record)];
  });
  assert.deepEqual(written, [
    ['LG TV', 63, 'Toshiba 32 Bit', ['InputFeature 12', 'PowerFeature', 'ChannelTuningFeature', 'InternalStateFeature 10', 'InternalStateFeature 3']],
    ['Denon AV Receiver', 118, 'Sharp 48 Bit 2 and Sharp 15 Bit 2', ['InputFeature 19', 'PowerFeature', 'ChannelTuningFeature']],
    ['Blu-ray', 31, 'Sony 20 Bit', ['InputFeature 1', 'PowerFeature', 'ChannelTuningFeature']],
    ['Plex', 59, 'Toshiba 32 Bit', ['InputFeature 1', 'PowerFeature', 'ChannelTuningFeature']],
    ['KPN', 38, 'Toshiba 32 Bit', ['InputFeature 1', 'PowerFeature', 'ChannelTuningFeature']],
    ['Xbox', 54, 'Microsoft 30 Bit', ['InputFeature', 'PowerFeature', 'ChannelTuningFeature']],
    ['Switch', 10, 'Toshiba 32 Bit', ['InputFeature 3', 'PowerFeature', 'ChannelTuningFeature']],
  ]);
  assert.equal(written.reduce((n, w) => n + (w[1] as number), 0), 373);
});

test('with the archive: the refusals of a family with no id of ours, an id not ours, a shared id and an entry the archive does not hold, beside the control', skipWithoutIrArchive(), () => {
  const f = file();
  const ids = f.touch.protocols;
  const r = (entry: string, id: number, protocolIds: Record<string, number>) => refusalOf(() => deviceRecordOfArchive(archiveAt(IR_ARCHIVE!), { entry, id, protocolIds }));
  const { 'Sony 20 Bit': _, ...withoutSony } = ids;
  assert.match(r('Sony/BDP-S6500', 900000103, withoutSony) ?? '', /of the family Sony 20 Bit, which the setup names no protocol id for/);
  assert.match(r('Sony/BDP-S6500', 12, ids) ?? '', /device id 12 is not one of ours/);
  assert.match(r('Sony/BDP-S6500', 900000103, { ...ids, 'Toshiba 32 Bit': ids['Sony 20 Bit']! }) ?? '', /is given to both/);
  assert.match(r('Sony/no-such-entry', 900000103, ids) ?? 'written', /Sony\/no-such-entry: the archive holds no such entry/);
  assert.equal(r('Sony/BDP-S6500', 900000103, ids), undefined);
});

test('with the archive: the six documents from nothing read back as the bench setup, pass the gate, and give the favourites address to the tuning device alone', skipWithoutIrArchive(), () => {
  const docs: SyncDocuments = buildTouchDocuments(file(), { archive: archiveAt(IR_ARCHIVE!), account: ACCOUNT });
  assert.deepEqual(Object.keys(docs), ['ActivityList', 'DeviceList', 'MapList', 'Context', 'Settings', 'ProtocolList']);
  const read = readConfiguration(docs);
  assert.deepEqual([read.activities.length, read.devices.length, read.maps.length, read.protocols.length], [5, 7, 12, 5]);
  assert.deepEqual(refusalsBeforeASync(docs), []);
  assert.deepEqual(findingsByRule(checkConfiguration(read)), { 'repeated screen index': 2, 'number pad entry on no key': 2 });
  const devices = (docs.DeviceList as Json).DevicesWithFeatures as Json[];
  assert.deepEqual(devices.filter((d) => d.Device.DeviceProfileUri !== undefined).map((d) => [d.Device.Name, d.Device.DeviceProfileUri, d.Device.ContentProfileKey]),
    [['LG TV', ACCOUNT.tuning!.DeviceProfileUri, ACCOUNT.tuning!.ContentProfileKey]]);
  // The control: an account with no favourites is refused, since the favourites activity's device needs them.
  assert.match(refusalOf(() => buildTouchDocuments(file(), { archive: archiveAt(IR_ARCHIVE!), account: { context: ACCOUNT.context } })) ?? '', /the account states no favourites address and key/);
});
