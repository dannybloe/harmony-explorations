/**
 * What a Harmony Touch receives besides its configuration proper, measured on three recorded syncs: the
 * remote's Context and Settings documents, the three documents its favourite channels are spread over,
 * and the pictures. `reference/architectures/harmony-touch/favourites-and-settings.md` is the page these
 * hold; what the remote does with each field is read in its firmware and held by
 * `tests/test_harmony_touch_favourites.py`, and this file holds the documents that reading runs on.
 *
 * **The question.** `touch-sync-both-ways.test.ts` measured that a sync of an account with favourites and
 * a background delivers three content documents and ten pictures after the six documents, each the same
 * as Logitech's service sent it, and left what is inside them to `todo-touch.md` 3.1: which fields the
 * remote uses, how a favourite becomes key presses, where the order lives, and what decides which
 * pictures are fetched.
 *
 * **What was measured.**
 *
 * 1. **A favourite is split over three documents.** The user document holds, under `preferences`, one key
 *    (a device's `ContentProfileKey`), under it one service, and under that a `stations` list of five
 *    entries whose only field is `id`. The device document holds one service with five `dialPositions`,
 *    each a `station`, a `number`, a `name` and an `added` flag, and one an `image`. The service document
 *    is the provider's line up, 319 channels. **The user document's station ids, in order, are the dial
 *    positions' stations in order**, and the user document holds no dial position anywhere.
 * 2. **Which device**: of five activities exactly one is marked `IsTuningDefault`, it is of `Type` 1, and
 *    its `ChannelChangingActivityRole` names the device whose `ContentProfileKey` is the user document's
 *    only key; the device document's `device_profile_uri` is that device's `DeviceProfileUri`, and the
 *    service is the same id in all three documents. **Every one of the seven devices carries a
 *    `DeviceProfileUri`, and only that one device's document was asked for.**
 * 3. **The addresses close on the documents**: the user document was asked for at `content://1.0/user;`
 *    and Context's `HouseholdUserProfileUri`, which also equals the user document's own
 *    `user_profile_uri`; the device document at `content://1.0/device;` and the device's profile address;
 *    the service at `content://1.0/service/` and the service id. The account part of the reverse sync's
 *    upload address is Context's `AccountId-`.
 * 4. **The dial numbers**: all five are text of digits; for the four from the list (`added` false) each
 *    equals the line up's number for that station; the one added by hand has an `image` and its station
 *    is in no channel of the line up.
 * 5. **The channel tuning documents the engine runs on**, for the tuning device, which the trial sync
 *    holds too under the same device id: in the trial, `FixedDigits` null, no start, greater than ten or
 *    greater than hundred actions, and one finishing `IRPressAction` naming `OK`; in the full sync,
 *    `FixedDigits` 3 and each of the four lists one `IRPressAction` with an empty command name. The device
 *    has commands named `0` to `9` in both. The device's channel tuning was changed on the account between
 *    the two syncs, from sending the number then OK to three digits, which is the person at the bench's
 *    account and not this measurement; the documents are consistent with it. The reference describes the
 *    two by what they send, not by the client's labels for them, which were read off its screen.
 * 6. **Context**: 21 fields, the same as parsed JSON in the trial and the full sync; against
 *    `RemoteContext` in Logitech's data model as `reference/logitech/data-model/model.json` holds it,
 *    sixteen fields, two of them ids that the document spells with a trailing `-`, and exactly five the
 *    model does not name: `CustomerId`, `DataConsent`, `Email`, `LatestSLAAccepted`,
 *    `LatestSLAAcceptedDate`. The reverse sync carries no Context.
 * 7. **Settings**: the four top level fields of `RemoteSettings` and eleven rows, each exactly the six
 *    fields of `RemoteSetting`, in the same order in the trial and the full sync, with no `HapticFlag`,
 *    `HapticEffect` or `ActivityPressDuration` row in any of the three syncs. In the full sync
 *    `ScreenBrightness` and `ScreenTimeout` have no value and a null default, which is the case the
 *    firmware's own defaults are for. `UserImages` allows five values and holds one; the two `https`
 *    pictures are `UserImageBucketUri` with that value and with the same name and `_small` before `.png`.
 *    The settings the reverse sync handed up name as `BackgroundImage` a picture not in `UserImages`.
 * 8. **The ten pictures follow one rule**, built here from the three documents and Settings and compared
 *    with the request list in order: the user background and its twin; then per station of the user
 *    document, in order, the uploaded logo `content-image://1.0/image/<image>;maxX=54;maxY=54` when its
 *    dial position has an `image`, else the station logo
 *    `content-image://1.0/station/<id>/image;maxX=54;maxY=54;type=png`; then the logo of each channel with
 *    a `popularRank`, three, none of them a favourite, compared as a set because the firmware walks them
 *    in no stated order. Sizes from the PNG headers: the background 240 by 320, its twin 60 by 80, the
 *    seven station logos 54 by 54, the uploaded logo 54 by 44.
 * 9. **No answer carries a `cache-Control` field**: none of the 19 documents and pictures written to the
 *    remote in the full sync, which is what the station logos' expiry is computed from.
 * 10. **Settings is the one document asked for untagged**, in the full sync; the answer the client wrote
 *    back to the remote in the reverse sync carries a tag. The cause is not visible here: settings had been
 *    changed on the remote before the full sync, which is consistent with the firmware's reading that a
 *    change on the remote saves Settings without a tag;
 *    the reading is the Python test's.
 *
 * **The closures.** Fact 1's order is two fields of two documents agreeing; fact 3's addresses are the
 * request list against the documents' contents, two different routes through the recording; fact 6 and
 * fact 7 hold the documents against Logitech's data model, which is a file in this repository and not a
 * recording. Each closure has its negative below: the station list reversed does not match, the user
 * and device documents carry different ids, and the model names fields the document does not lack.
 *
 * **Width.** Three syncs of one Harmony Touch on firmware 4.15.330 through Harmony Desktop, one account:
 * one provider, one tuning device, five favourites, one uploaded background. Not exercised: more than
 * one favourites activity, a speaker, Sonos, Roku or Heos device, an antenna only service, MyHarmony as
 * the client, and favourites changed on the remote.
 *
 * **Sources checked first.** `touch-sync-both-ways.test.ts` and `touch-sync.test.ts`, the reference's
 * `reference/architectures/harmony-touch/usb.md` and `reference/remotes/harmony-touch/`, Logitech's data
 * model in `reference/logitech/data-model/`, and the lab's reading of the Touch's screens and decompiled
 * engine for `todo-touch.md` 3.1, which named every field asserted here before this file existed. What each channel
 * tuning setting is called in MyHarmony was seen on its screen when the account was set up
 * (`todo-touch.md` 2.2.1), and is not used as evidence here.
 *
 * The fixtures hold the account's data, so this file asserts names, counts, structure and equalities and
 * prints no value out of them. It skips without the lab.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

import * as lab from '@harmony/lab';
import { answersWritten, commands, records, requestLists, resource, sessions } from './touch-recording.ts';
import type { Answer, Request_, Session } from './touch-recording.ts';

const TRIAL = 'touch_sync_recording';
const FULL = 'touch_full_sync_recording';
const REVERSE = 'touch_reverse_sync_recording';

// The documents are Logitech's JSON, so they are walked as loosely typed records.
type Json = any;

const hlapi = (fixture: string): Session[] => sessions(commands(records(fixture))).filter((s) => s.path === '/sys/hlapi');

/** Every answer written back in a `proxy/response?write`, in order: the shared walk over a recording's sessions. */
const answers = (fixture: string): Answer[] => answersWritten(hlapi(fixture));

/** One of the six documents of a sync, by its resource name. */
const document = (fixture: string, name: string): Json =>
  answers(fixture).find((a) => a.uri.startsWith('harmony://') && resource(a.uri) === name)?.resource;

/** A content document of the full sync, by the start of its address. */
const content = (prefix: string): Json => answers(FULL).find((a) => a.uri.startsWith(prefix))!.resource;

/**
 * Two values out of the account's data compared as a boolean, so that a failure names the claim and
 * prints neither value: the documents carry ids, addresses and an email address.
 */
function same(a: unknown, b: unknown, claim: string): void {
  assert.ok(isDeepStrictEqual(a, b), claim);
}

/** The fields of one entity in Logitech's data model as this repository holds it. */
function modelFields(entity: string): string[] {
  const model = JSON.parse(readFileSync(new URL('../../../reference/logitech/data-model/model.json', import.meta.url), 'utf8')) as Json;
  return (model.entities[entity].fields as { name: string }[]).map((f) => f.name);
}

/** The pieces of the favourites, out of the full sync's documents. */
function favourites() {
  const user = content('content://1.0/user');
  const device = content('content://1.0/device');
  const service = content('content://1.0/service');
  const keys = Object.keys(user.preferences);
  const services = user.preferences[keys[0]!];
  const serviceId = Object.keys(services)[0]!;
  const stations: Json[] = services[serviceId].stations;
  const dials: Json[] = device.services[serviceId].dialPositions;
  return { user, device, service, keys, services, serviceId, stations, dials };
}

/** The activity marked as the tuning default, and the device its channel changing role names. */
function tuning(fixture: string): { activities: Json[]; activity: Json; device: Json } {
  const activities: Json[] = document(fixture, 'ActivityList').Activities;
  const devices: Json[] = document(fixture, 'DeviceList').DevicesWithFeatures;
  const marked = activities.filter((a) => a.IsTuningDefault === true);
  assert.equal(marked.length, 1, 'one activity is the tuning default');
  const role = marked[0].Roles.find((r: Json) => String(r.__type).includes('ChannelChangingActivityRole'));
  const device = devices.find((d) => d.Device['Id-'] === role['DeviceId-']);
  return { activities, activity: marked[0], device };
}

test('a favourite is a station in the user document and a dial position in the device document, in the same order', lab.skipUnless(FULL), () => {
  const { user, device, keys, services, serviceId, stations, dials } = favourites();
  assert.deepEqual(keys.length, 1, 'one device in the preferences');
  assert.equal(Object.keys(services).length, 1, 'one service under it');
  assert.deepEqual(Object.keys(services[serviceId]), ['stations']);
  assert.equal(stations.length, 5);
  assert.deepEqual(stations.map((s) => Object.keys(s)), Array(5).fill(['id']), 'a station is its id and nothing else');
  assert.equal(Object.keys(device.services).length, 1);
  assert.equal(dials.length, 5);
  same(stations.map((s) => s.id), dials.map((d) => d.station), 'the same stations in the same order');
  // The negative: the order is a claim, so the reversed list must not match.
  assert.ok(!isDeepStrictEqual([...stations].reverse().map((s) => s.id), dials.map((d) => d.station)), 'the reversed list differs');
  assert.ok(!JSON.stringify(user).includes('dialPositions'), 'the user document holds no dial position');
  assert.deepEqual(Object.keys(user).sort(), ['id', 'location', 'preferences', 'user_profile_uri']);
  assert.deepEqual(Object.keys(device).sort(), ['device_profile_uri', 'id', 'services']);
  assert.ok(user.id !== device.id, 'the two documents carry different ids');
});

test('on the account measured, the favourites belong to the one tuning default activity and are keyed by its channel changing device', lab.skipUnless(FULL), () => {
  const { activities, activity, device } = tuning(FULL);
  const { device: deviceDoc, service, keys, serviceId } = favourites();
  assert.equal(activities.length, 5);
  assert.equal(activity.Type, 1);
  same(String(device.Device.ContentProfileKey), keys[0], 'the preferences key is the device\'s ContentProfileKey');
  same(deviceDoc.device_profile_uri, device.Device.DeviceProfileUri, 'the device document is that device\'s');
  same(service.id, serviceId, 'the service is named the same in the user document and the line up');
  same(Object.keys(deviceDoc.services), [serviceId], 'and in the device document');
});

test('every device carries a profile address and only the tuning device\'s favourites document is asked for', lab.skipUnless(FULL), () => {
  const devices: Json[] = document(FULL, 'DeviceList').DevicesWithFeatures;
  assert.equal(devices.length, 7);
  assert.equal(devices.filter((d) => typeof d.Device.DeviceProfileUri === 'string' && d.Device.DeviceProfileUri.length > 0).length, 7);
  const asked = requestLists(hlapi(FULL)).flat().filter((r) => r.uri.startsWith('content://1.0/device;'));
  assert.equal(asked.length, 1);
  same(asked[0]!.uri, `content://1.0/device;${tuning(FULL).device.Device.DeviceProfileUri}`, 'at the device\'s profile address');
});

test('the remote asks for the user, device and service documents at addresses built from Context and the documents', lab.skipUnless(FULL), () => {
  const context = document(FULL, 'Context');
  const { user, serviceId } = favourites();
  const all = requestLists(hlapi(FULL)).flat().map((r) => r.uri);
  const users = all.filter((u) => u.startsWith('content://1.0/user;'));
  const services = all.filter((u) => u.startsWith('content://1.0/service/'));
  same(users, [`content://1.0/user;${context.HouseholdUserProfileUri}`], 'the user document at Context\'s household user profile');
  same(user.user_profile_uri, context.HouseholdUserProfileUri, 'which the user document names as its own');
  same(services, [`content://1.0/service/${serviceId}`], 'the line up at the service id');
});

test('the account number of the remote\'s upload address is Context\'s account id', lab.skipUnless(FULL, REVERSE), () => {
  const put = requestLists(hlapi(REVERSE))[0]![0]!;
  const account = /^harmony:\/\/Account\/(\d+)\/Remote\/[^/]+\/Settings$/.exec(put.uri);
  assert.ok(account, 'the upload goes to the account\'s remote settings');
  same(Number(account[1]), document(FULL, 'Context')['AccountId-'], 'the account part is Context\'s AccountId-');
});

test('a dial number is text of digits, the line up\'s number for a listed station, and a hand added station is not in the line up', lab.skipUnless(FULL), () => {
  const { service, dials } = favourites();
  const channels: Json[] = service.channels;
  assert.equal(channels.length, 319);
  assert.equal(new Set(channels.map((c) => c.number)).size, 319, 'no two channels share a number');
  assert.equal(new Set(channels.map((c) => c.station.id)).size, 264, 'and a station can be on more than one');
  assert.ok(dials.every((d) => typeof d.number === 'string' && /^\d+$/.test(d.number)));
  const listed = dials.filter((d) => d.added === false);
  const added = dials.filter((d) => d.added === true);
  assert.equal(listed.length, 4);
  assert.equal(added.length, 1);
  for (const d of listed) {
    const inLineUp = channels.filter((c) => c.station.id === d.station);
    assert.ok(inLineUp.length > 0, 'a listed station is in the line up');
    same(inLineUp[0].number, d.number, 'and its dial number is the line up\'s');
  }
  assert.equal(channels.filter((c) => c.station.id === added[0].station).length, 0);
  assert.equal(typeof added[0].image, 'string');
  assert.equal(listed.filter((d) => 'image' in d).length, 0);
});

test('the tuning device\'s channel tuning: the number then OK in the trial sync, three digits in the full one', lab.skipUnless(TRIAL, FULL), () => {
  const tv = tuning(FULL).device;
  const trialTv = (document(TRIAL, 'DeviceList').DevicesWithFeatures as Json[]).find((d) => d.Device['Id-'] === tv.Device['Id-']);
  assert.ok(trialTv, 'the trial holds the same device');
  /** A feature's four action lists, each as the command names its presses send. */
  const shape = (d: Json) => {
    const features: Json[] = d.DeviceFeatures.filter((f: Json) => String(f.__type).includes('ChannelTuningFeature'));
    assert.equal(features.length, 1);
    const f = features[0];
    const list = (k: string) => (f[k] as Json[]).map((a) => [String(a.__type).split(',')[0]!.split('.').at(-1), a.IRCommandName]);
    return { FixedDigits: f.FixedDigits, Start: list('StartActions'), Ten: list('GreaterTenActions'), Hundred: list('GreaterHundredActions'), Finish: list('FinishActions') };
  };
  assert.deepEqual(shape(trialTv), { FixedDigits: null, Start: [], Ten: [], Hundred: [], Finish: [['IRPressAction', 'OK']] });
  const press = [['IRPressAction', '']];
  assert.deepEqual(shape(tv), { FixedDigits: 3, Start: press, Ten: press, Hundred: press, Finish: press });
  for (const d of [trialTv, tv]) {
    const digits = (d.Commands as Json[]).map((c) => c.Name).filter((n: string) => /^\d$/.test(n)).sort();
    assert.deepEqual(digits, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  }
});

test('Context is the same in both syncs and names five fields Logitech\'s data model does not', lab.skipUnless(TRIAL, FULL, REVERSE), () => {
  const full = document(FULL, 'Context');
  same(document(TRIAL, 'Context'), full, 'the trial and the full sync deliver the same Context');
  assert.equal(document(REVERSE, 'Context'), undefined, 'the hand over carries no Context');
  const keys = Object.keys(full);
  assert.equal(keys.length, 21);
  const model = modelFields('RemoteContext');
  assert.equal(model.length, 16);
  // The two ids are spelt with a trailing dash in the document, `AccountId-`, as every id is.
  const spelt = (k: string) => k.replace(/-$/, '');
  assert.deepEqual(keys.filter((k) => !model.includes(spelt(k))).sort(), ['CustomerId', 'DataConsent', 'Email', 'LatestSLAAccepted', 'LatestSLAAcceptedDate']);
  assert.deepEqual(model.filter((m) => !keys.map(spelt).includes(m)), [], 'every field the model names is present');
  assert.deepEqual(keys.filter((k) => k.endsWith('-')).sort(), ['AccountId-', 'HouseholdId-']);
  assert.deepEqual(Object.keys(full.SetupSession).sort(), modelFields('SetupSession').sort());
  assert.deepEqual(Object.keys(full.Locale).sort(), modelFields('Locale').sort());
});

const ROWS = ['UserImages', 'BackgroundImage', 'TwelveHourClock', 'ScreenBrightness', 'ScreenTimeout', 'IsWiFiEnabled', 'ScreenLockFlag', 'EditLock', 'KeyBrightness', 'AccelFlag', 'TimeZoneFlag'];

test('Settings is eleven rows of Logitech\'s RemoteSetting under the four fields of RemoteSettings', lab.skipUnless(TRIAL, FULL, REVERSE), () => {
  const put = requestLists(hlapi(REVERSE))[0]![0]!;
  const uploaded = JSON.parse(decodeURIComponent(put.resource!.replace(/\+/g, ' '))) as Json;
  for (const [name, doc] of [['trial', document(TRIAL, 'Settings')], ['full', document(FULL, 'Settings')], ['upload', uploaded]] as const) {
    assert.deepEqual(Object.keys(doc).sort(), modelFields('RemoteSettings').sort(), `${name}: the top level fields`);
    assert.deepEqual((doc.Settings as Json[]).map((r) => r.Name), ROWS, `${name}: the rows, in order`);
    for (const r of doc.Settings as Json[]) assert.deepEqual(Object.keys(r).sort(), modelFields('RemoteSetting').sort(), `${name}: ${r.Name}`);
    assert.ok(!(doc.Settings as Json[]).some((r) => ['HapticFlag', 'HapticEffect', 'ActivityPressDuration'].includes(r.Name)));
  }
  const full: Json[] = document(FULL, 'Settings').Settings;
  const row = (n: string) => full.find((r) => r.Name === n);
  for (const n of ['ScreenBrightness', 'ScreenTimeout']) {
    assert.deepEqual(row(n).Values, [], `${n} has no value`);
    assert.equal(row(n).DefaultValue, null, `${n} has no default`);
  }
  assert.deepEqual([row('UserImages').Values.length, row('UserImages').MaxCount], [1, 5]);
});

test('a user background is fetched with its small twin from the user image store, and the upload chose one that is not a user picture', lab.skipUnless(FULL, REVERSE), () => {
  const settings = document(FULL, 'Settings');
  const value: string = settings.Settings.find((r: Json) => r.Name === 'UserImages').Values[0];
  const https = requestLists(hlapi(FULL)).flat().map((r) => r.uri).filter((u) => u.startsWith('https://'));
  same(https, [settings.UserImageBucketUri + value, settings.UserImageBucketUri + value.replace('.png', '_small.png')], 'the picture and its twin from the user image store');
  const put = requestLists(hlapi(REVERSE))[0]![0]!;
  const uploaded = JSON.parse(decodeURIComponent(put.resource!.replace(/\+/g, ' '))) as Json;
  const chosen: string = uploaded.Settings.find((r: Json) => r.Name === 'BackgroundImage').Values[0];
  const users: string[] = uploaded.Settings.find((r: Json) => r.Name === 'UserImages').Values;
  assert.ok(!users.includes(chosen), 'the chosen background is not one of the user pictures');
  same(users, [value], 'the user picture is still listed');
});

/** The picture requests the firmware's rule predicts, from the documents alone. */
function predictedPictures(): { ordered: string[]; popular: Set<string> } {
  const settings = document(FULL, 'Settings');
  const { stations, dials, service } = favourites();
  const ordered: string[] = [];
  for (const v of settings.Settings.find((r: Json) => r.Name === 'UserImages').Values as string[]) {
    ordered.push(settings.UserImageBucketUri + v, settings.UserImageBucketUri + v.replace('.png', '_small.png'));
  }
  const logo = (id: string) => `content-image://1.0/station/${id}/image;maxX=54;maxY=54;type=png`;
  for (const s of stations) {
    const dial = dials.find((d) => d.station === s.id);
    if (!dial) ordered.push(logo(s.id));
    else if (dial.image) ordered.push(`content-image://1.0/image/${dial.image};maxX=54;maxY=54`);
    else if (dial.added === false) ordered.push(logo(s.id));
  }
  const popular = new Set<string>((service.channels as Json[]).filter((c) => c.popularRank !== undefined).map((c) => logo(c.station.id)));
  return { ordered, popular };
}

test('the ten pictures are the user background, each favourite\'s logo in list order, then the popular channels\' logos', lab.skipUnless(FULL), () => {
  const pictures = requestLists(hlapi(FULL))[5]!.map((r: Request_) => r.uri);
  const { ordered, popular } = predictedPictures();
  assert.equal(pictures.length, 10);
  assert.equal(ordered.length, 7);
  assert.equal(popular.size, 3);
  same(pictures.slice(0, 7), ordered, 'the backgrounds and the favourites\' logos, in order');
  same(new Set(pictures.slice(7)), popular, 'then the popular channels\' logos');
  const { stations } = favourites();
  assert.equal([...popular].filter((p) => stations.some((s) => p.includes(`/station/${s.id}/`))).length, 0, 'no popular channel is a favourite');
  // The negative: the favourites in reverse order would not be what the remote asked for.
  assert.ok(!isDeepStrictEqual(pictures.slice(2, 7), ordered.slice(2, 7).reverse()), 'the reversed favourites differ');
});

test('the pictures are PNGs: the background 240 by 320, its twin 60 by 80, a station logo 54 by 54, the uploaded logo 54 by 44', lab.skipUnless(FULL), () => {
  const sizes = answers(FULL)
    .filter((a) => a['body-type'] === 'image/png')
    .map((a) => {
      const png = Buffer.from(a.resource as string, 'base64');
      assert.equal(png.subarray(12, 16).toString('latin1'), 'IHDR');
      const kind = a.uri.startsWith('https://') ? 'user' : a.uri.includes('/station/') ? 'station' : 'uploaded';
      return `${kind} ${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
    });
  assert.deepEqual(sizes, ['user 240x320', 'user 60x80', 'uploaded 54x44', ...Array<string>(7).fill('station 54x54')]);
});

test('no answer written to the remote carries a cache-Control field, so no logo is given an expiry', lab.skipUnless(FULL), () => {
  const given = answers(FULL).filter((a) => a.uri !== 'proxy://Finished');
  assert.equal(given.length, 19);
  assert.equal(given.filter((a) => Object.keys(a).some((k) => k.toLowerCase() === 'cache-control')).length, 0);
  // The control: the field the firmware reads would be seen if it were there.
  assert.deepEqual([...new Set(given.flatMap((a) => Object.keys(a)))].sort(), ['body-type', 'etag', 'resource', 'statusCode', 'uri']);
});

test('Settings is the one document asked for untagged in the full sync, and the answer written back in the reverse sync carries a tag', lab.skipUnless(FULL, REVERSE), () => {
  const first = requestLists(hlapi(FULL))[0]!;
  assert.deepEqual(first.filter((r) => !r.etag).map((r) => resource(r.uri)), ['Settings']);
  const back = answers(REVERSE).filter((a) => a.uri.startsWith('harmony://'));
  assert.deepEqual(back.map((a) => resource(a.uri)), ['Settings']);
  assert.ok(typeof back[0]!.etag === 'string' && back[0]!.etag.length > 0);
});
