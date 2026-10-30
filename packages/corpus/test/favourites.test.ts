/**
 * The favourites stage's offline half, `todo-compile-350.md` 3.1: the `SaveButtonMaps` payload that puts a
 * setup's favourite channels on a device of a test account's record, its door, and the read back's verdict.
 * Nothing here touches the network.
 *
 * **Why a captured reply and not only a made up map.** The payload is the device's map as the service
 * returned it with buttons appended, so what can go wrong is a member dropped, renamed or reordered on the
 * way through, or a new button shaped unlike the ones the service stores. The first is checked on a real
 * `GetButtonMaps` reply in the lab, and the second against the three favourite channels MyHarmony's own
 * screen saved on a Harmony One, which are the only stored favourites anybody here has read: the buttons
 * built here have to carry exactly their members, in their order, and the same action and menu place
 * where the two can agree. The reply carries an account identity, so it stays in the lab and the test
 * names no identifier out of it; without the lab those two tests skip, and the made up map's tests still
 * pin the exact shape the Harmony 350's setup sends.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LAB } from '@harmony/lab';

import { ServiceRefusal, assertCallAllowed } from '../src/myharmony.ts';
import {
  FAVOURITE_MENU, favouriteButton, favouriteIndexBase, favouritesOnMap, favouritesPayload, favouritesSavedProblems,
  getButtonMapsRequest, type Setup,
} from '../src/setup.ts';

const H350 = JSON.parse(readFileSync(new URL('../setups/h350-test.json', import.meta.url), 'utf8')) as Setup;

/** The device and record the brief names, made up only in the sense that nothing is read back here. */
const KPN = 83962906;
const SURFACE = 4242;
const MAPPING = 'Logitech.Harmony.Services.DataContract.UserButtonMapping';

/** A default device map, shaped as a `GetButtonMaps` reply's, with one hard and one soft button. */
function defaultMap(device: number): Record<string, unknown> {
  return {
    __type: `DeviceButtonMap:#${MAPPING}`,
    ButtonMapId: null,
    ButtonMapIdentifier: `device_${device}`,
    ButtonMapSurfaceId: null,
    Buttons: [
      { __type: `HardRemoteButton:#${MAPPING}`, ButtonAction: null, ButtonId: 11, ButtonState: 1 },
      { __type: `SoftRemoteButton:#${MAPPING}`, ButtonAction: null, ButtonId: 12, ButtonState: 1,
        MenuItem: { IndexInMenu: 0, MenuName: `Device.${device}` }, TextOnRemote: 'Home' },
    ],
    DateModified: null,
    RemoteId: { IsPersisted: true, Value: 77 },
    Sequences: null,
    SurfaceId: null,
    DeviceId: { IsPersisted: true, Value: device },
  };
}

test('saving a button map needs its own door, and no other door opens it', () => {
  const others = { MYHARMONY_ALLOW_COMPILE: '1', MYHARMONY_ALLOW_DEVICE_WRITE: '1', MYHARMONY_ALLOW_DELETE: '1',
    MYHARMONY_ALLOW_ACTIVITY_WRITE: '1', MYHARMONY_ALLOW_FEATURE_WRITE: '1' };
  assert.throws(() => assertCallAllowed('SaveButtonMaps', others), ServiceRefusal);
  assert.doesNotThrow(() => assertCallAllowed('SaveButtonMaps', { MYHARMONY_ALLOW_BUTTONMAP_WRITE: '1' }));
  // The read it is built from is a read, behind no door.
  assert.doesNotThrow(() => assertCallAllowed('GetButtonMaps', {}));
});

test('the Harmony 350 setup states five favourite channels on the KPN, as text, the last with its leading zero', () => {
  assert.deepEqual(H350.favourites, [{ device: 'KPN', channels: ['1', '2', '3', '666', '07'] }]);
  assert.ok(H350.devices.some((one) => one.name === 'KPN'));
});

test('a favourite channel\'s place on its menu starts at 1 on the Harmony 350, after MyHarmony\'s Commands entry, and at 0 on a Harmony One', () => {
  assert.equal(favouriteIndexBase('Harmony 350'), 1);
  assert.equal(favouriteIndexBase('Harmony 300'), 1);
  assert.equal(favouriteIndexBase('Harmony One'), 0);
  assert.throws(() => favouriteIndexBase('Harmony Touch'), /not read/);
});

test('the read asks for the one device by a typed identifier, with the record as the account and the surface as a number', () => {
  assert.deepEqual(getButtonMapsRequest([KPN], 104, 16321262, SURFACE), {
    deviceIds: [{ __type: 'DeviceId:#Logitech.Harmony.Services.Common.Contracts.Data', IsPersisted: true, Value: KPN }],
    activityIds: [],
    remoteSkinId: 104,
    accountId: { IsPersisted: true, Value: 16321262 },
    surfaceId: SURFACE,
  });
});

test('the Harmony 350 save: the map as read with its surface set, and five channel buttons appended, exactly', () => {
  const map = defaultMap(KPN);
  const { channels } = H350.favourites![0]!;
  const payload = favouritesPayload(map, KPN, channels, SURFACE, favouriteIndexBase(H350.model.name));
  assert.deepEqual(Object.keys(payload), ['buttonMaps']);
  const maps = payload['buttonMaps'] as Record<string, unknown>[];
  assert.equal(maps.length, 1);
  const [sent] = maps as [Record<string, unknown>];
  // Every member of the map in the order the service returned them, `__type` first, and only the two
  // surface members and the buttons changed.
  assert.deepEqual(Object.keys(sent), Object.keys(map));
  assert.deepEqual(Object.keys(map).filter((key) => JSON.stringify(sent[key]) !== JSON.stringify(map[key])),
    ['ButtonMapSurfaceId', 'Buttons', 'SurfaceId']);
  assert.deepEqual([sent['ButtonMapSurfaceId'], sent['SurfaceId']],
    [{ IsPersisted: true, Value: SURFACE }, { IsPersisted: true, Value: SURFACE }]);
  const buttons = sent['Buttons'] as Record<string, unknown>[];
  assert.equal(buttons.length, 7);
  assert.deepEqual(buttons.slice(0, 2), map['Buttons']);
  // The five new buttons, whole: this is the JSON the service is sent.
  assert.deepEqual(buttons.slice(2), [['1', 1], ['2', 2], ['3', 3], ['666', 4], ['07', 5]].map(([channel, index]) => ({
    __type: `SoftRemoteButton:#${MAPPING}`,
    ButtonAction: { __type: `ButtonChannelAction:#${MAPPING}`, EventType: 0, Id: 0, Order: 0, ChannelNumber: channel,
      DeviceId: { IsPersisted: true, Value: KPN } },
    ButtonDoublePressAction: null,
    ButtonId: 0,
    ButtonLongPressAction: null,
    ButtonState: 2,
    FunctionGroupType: 0,
    ButtonImageKey: null,
    ButtonImagePath: null,
    ImageId: null,
    MenuItem: { IndexInMenu: index, MenuName: 'FavoriteChannels' },
    TextOnRemote: channel,
  })));
  // The leading zero survives serialisation as text, which a number would not.
  const wire = JSON.stringify(payload);
  assert.ok(wire.includes('"ChannelNumber":"07"'));
  assert.ok(!wire.includes('"ChannelNumber":7'));
  // The deserialiser binds a subclass only when `__type` comes first.
  for (const button of buttons.slice(2)) {
    assert.equal(Object.keys(button)[0], '__type');
    assert.equal(Object.keys(button['ButtonAction'] as object)[0], '__type');
  }
  // Nothing in the map that was read is changed by building the save.
  assert.deepEqual(map, defaultMap(KPN));
});

test('a map that already holds favourites is refused rather than overwritten, and so is another device\'s map', () => {
  const map = defaultMap(KPN);
  const holding = { ...map, Buttons: [...(map['Buttons'] as unknown[]), favouriteButton('9', KPN, 1)] };
  assert.deepEqual(favouritesOnMap(holding), [{ channel: '9', device: KPN, index: 1 }]);
  assert.throws(() => favouritesPayload(holding, KPN, ['1'], SURFACE, 1), /already holds 1 favourite channels, 9/);
  assert.throws(() => favouritesPayload(defaultMap(KPN + 1), KPN, ['1'], SURFACE, 1), /not device 83962906's map/);
  assert.throws(() => favouritesPayload({ ...map, __type: `ActivityButtonMap:#${MAPPING}` }, KPN, ['1'], SURFACE, 1),
    /not a device's button map/);
  assert.throws(() => favouritesPayload(map, KPN, [], SURFACE, 1), /no channel/);
});

test('the read back passes a stored map holding exactly the channels in order, and names each way it can fail', () => {
  const before = defaultMap(KPN);
  const channels = ['1', '2', '3', '666', '07'];
  const sent = (favouritesPayload(before, KPN, channels, SURFACE, 1)['buttonMaps'] as Record<string, unknown>[])[0]!;
  // The service gives the saved map a number and the new buttons ids of their own.
  const after: Record<string, unknown> = { ...sent, ButtonMapId: { IsPersisted: true, Value: 5 }, ButtonMapIdentifier: null };
  assert.deepEqual(favouritesSavedProblems(before, after, KPN, channels), []);
  assert.deepEqual(favouritesSavedProblems(before, { ...after, ButtonMapId: null }, KPN, channels),
    ['the map has no stored identifier']);
  const seven = { ...after, Buttons: (after['Buttons'] as Record<string, unknown>[]).map((button) =>
    (button['ButtonAction'] as { ChannelNumber?: string } | null)?.ChannelNumber === '07'
      ? { ...button, ButtonAction: { ...(button['ButtonAction'] as object), ChannelNumber: '7' } } : button) };
  assert.deepEqual(favouritesSavedProblems(before, seven, KPN, channels), ['the map holds favourites 1, 2, 3, 666, 7, not 1, 2, 3, 666, 07']);
  const short = { ...after, Buttons: (after['Buttons'] as unknown[]).slice(0, -1) };
  assert.deepEqual(favouritesSavedProblems(before, short, KPN, channels), [
    'the map holds favourites 1, 2, 3, 666, not 1, 2, 3, 666, 07', 'the map held 2 buttons and holds 6, not 7']);
});

/**
 * The captured reply: three device maps of a Harmony One's record, read after MyHarmony's screen saved three
 * favourite channels on one of them. Guarded on the file itself, so a lab without it reads as a skip.
 */
const CAPTURE = LAB === undefined ? undefined : join(LAB, 'work', 'myharmony', 'responses', 'GetButtonMaps_skin54.json');
const needCapture = { skip: CAPTURE !== undefined && existsSync(CAPTURE) ? false as const : 'no captured GetButtonMaps reply in the lab' };

function capturedMaps(): Record<string, unknown>[] {
  const reply = JSON.parse(readFileSync(CAPTURE!, 'utf8').replace(/^﻿/, '')) as { GetButtonMapsResult: Record<string, unknown>[] };
  return reply.GetButtonMapsResult;
}
const deviceOf = (map: Record<string, unknown>): number => (map['DeviceId'] as { Value: number }).Value;

test('on a captured reply: of three device maps one holds MyHarmony\'s three favourites and is refused, and the other two carry through whole',
  needCapture, () => {
    const maps = capturedMaps();
    assert.equal(maps.length, 3);
    const holding = maps.filter((map) => favouritesOnMap(map).length > 0);
    assert.equal(holding.length, 1);
    assert.deepEqual(favouritesOnMap(holding[0]!).map((one) => [one.channel, one.index]), [['1', 0], ['100', 1], ['666', 2]]);
    assert.throws(() => favouritesPayload(holding[0]!, deviceOf(holding[0]!), ['1'], SURFACE, 0), /already holds 3 favourite channels, 1, 100, 666/);
    for (const map of maps.filter((one) => favouritesOnMap(one).length === 0)) {
      const sent = (favouritesPayload(map, deviceOf(map), ['1', '07'], SURFACE, 0)['buttonMaps'] as Record<string, unknown>[])[0]!;
      assert.deepEqual(Object.keys(sent), Object.keys(map));
      const before = map['Buttons'] as unknown[];
      const buttons = sent['Buttons'] as unknown[];
      assert.equal(buttons.length, before.length + 2);
      assert.deepEqual(buttons.slice(0, before.length), before);
    }
  });

test('on a captured reply: a button built here has exactly the members of a favourite MyHarmony saved, in order, and the same action and place',
  needCapture, () => {
    const holding = capturedMaps().find((map) => favouritesOnMap(map).length > 0)!;
    const theirs = (holding['Buttons'] as Record<string, unknown>[])
      .filter((button) => (button['MenuItem'] as { MenuName?: string } | null)?.MenuName === FAVOURITE_MENU);
    assert.equal(theirs.length, 3);
    // The Harmony One's places start at 0; the three were saved as channels 1, 100 and 666.
    const ours = ['1', '100', '666'].map((channel, k) => favouriteButton(channel, deviceOf(holding), favouriteIndexBase('Harmony One') + k));
    for (const [k, one] of theirs.entries()) {
      const mine = ours[k]!;
      assert.deepEqual(Object.keys(mine), Object.keys(one));
      assert.deepEqual(Object.keys(mine['ButtonAction'] as object), Object.keys(one['ButtonAction'] as object));
      assert.deepEqual(mine['ButtonAction'], one['ButtonAction']);
      assert.deepEqual(mine['MenuItem'], one['MenuItem']);
      // What differs is what the service assigns or the person typed: the id, the state once stored, the
      // picture's id, and a label, which these three were given and the 350's setup does not give.
      assert.deepEqual(Object.keys(mine).filter((key) => JSON.stringify(mine[key]) !== JSON.stringify(one[key])),
        ['ButtonId', 'ButtonState', 'ImageId', 'TextOnRemote']);
    }
  });
