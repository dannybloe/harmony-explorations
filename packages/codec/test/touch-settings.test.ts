/**
 * Settings of ours and Context composed from a description for a Harmony Touch, and the gate's rule for the Settings
 * values the remote mishandles: `todo-touch.md` 8.4, `packages/codec/src/families/harmony-touch/settings.ts` and the `setting
 * mishandled` rule of `check.ts`.
 *
 * **The facts these rest on**, `reference/architectures/harmony-touch/favourites-and-settings.md`, "Settings",
 * "Settings, field by field" and "Context": eleven rows, the first value read, a number row through `tonumber` and a yes
 * or no row as `"true"` or not; a change on the remote replaces a row's first value and adds no row; seven Context
 * fields read on a Touch synced through a computer. **Read in the screens for this item**, the lab's firmware copy,
 * `juniper/init.lua` and `appscommon/harmony.lua`, lines in the lab's `work/touch-firmware/notes/8.4-preflight.md`:
 *
 * * `getVal` holds the backlight to 10 to 100 and the keys' light to 5 to 100, off below 5; `setBrightness` writes
 *   `floor(26 * level / 100)`;
 * * `fadeBrightness`, the fade before the screen sleeps, reads the stored level **unheld**, starts a count at
 *   `floor(26 * level / 100)`, takes one off every 50 ms and ends only when a step leaves it at 0: a count that starts
 *   at 0 or below never ends, so on battery the remote never sleeps. A level below 4 starts it there;
 * * `setSuspendTimeout` hands the timeout times 1000 to the suspend timer unclamped; the timer is due at `now +
 *   interval`, so 0 is due at once, and the suspend handler on USB power returns the same interval, restarting it;
 * * at a committed sync's end the screens empty their cache, `resMgr.init`, and post `syncDone`, whose handler sets
 *   both backlights, the timeout, the clock and the background: those rows act with no restart. The motion sensor
 *   and the vibration are set at start and on a change made on the screens only;
 * * the remote's own sliders: timeout 1 to 30, both brightness 10 to 100.
 *
 * **What is held here.** The composer changes exactly the rows a description names and carries everything else;
 * refuses each value the reading shows the remote mishandles or its screens cannot show, with the sliders' ends
 * passing as the controls; composes the bench unit's Context back to itself, key order included, from the description
 * of its seven fields, and refuses a description that changes the account's fields or states a value the screens raise
 * on. The gate refuses a screen brightness below 4 and a timeout below a second, read as the screens' `tonumber` reads
 * them, and passes 4, 1 and a value that reads as no number, the controls.
 *
 * **Negative results kept**: a JSON `true` in a yes or no row reads as off, since only the text is yes, so the
 * composer takes text alone; a value that reads as no number takes the firmware's default and raises nothing, so the
 * gate passes it; a second row of the same name is never read, so the gate passes a bad value there.
 *
 * **Sources checked first**: the reference page above, the lab's 6.10 screens reading for the places already refused,
 * the screens' Lua in the lab. Logitech's client was not consulted: what the remote does with a value is the screens'.
 *
 * **Which architectures**: the Harmony Touch, firmware 4.15.330; its firmware reports 17 and Logitech's templates file
 * it under 18.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as lab from '@harmony/lab';

import { checkSettingValues, findingsByRule, refusalsBeforeASync } from '../src/families/harmony-touch/check.ts';
import { ComposeRefusal } from '../src/families/harmony-touch/compose.ts';
import { documentsOfAnswers, type Context, type Settings, type SyncAnswer, type SyncDocuments } from '../src/families/harmony-touch/documents.ts';
import { readSettings } from '../src/families/harmony-touch/read.ts';
import {
  CONTEXT_FIELDS_READ, SETTING_ROWS, composeTouchContext, composeTouchSettings, describeTouchContext, luaNumber, type OwnContext,
} from '../src/families/harmony-touch/settings.ts';

const SIX = 'touch_activity_set_back';

// The documents are JSON; the synthetic ones are built and broken as such.
type Json = any;

const row = (Name: string, SettingId: number, Values: (string | null)[], DefaultValue: string | null): Json =>
  ({ Values, Name, DefaultValue, SettingId, MinCount: 0, MaxCount: 1 });

/** A made up Settings in the eleven rows' shape and order, with values of the kinds the measured documents hold. */
function settings(): Json {
  return {
    RemoteName: 'Synthetic', DefaultImageBucketUri: 'https://example.invalid/default/', UserImageBucketUri: 'https://example.invalid/user/',
    Settings: [
      row('UserImages', 1, [], null), row('BackgroundImage', 2, ['built-in.png'], 'built-in.png'), row('TwelveHourClock', 3, ['false'], 'false'),
      row('ScreenBrightness', 4, ['100'], null), row('ScreenTimeout', 5, ['10'], null), row('IsWiFiEnabled', 6, ['true'], 'true'),
      row('ScreenLockFlag', 11, ['false'], 'true'), row('EditLock', 12, ['false'], 'false'), row('KeyBrightness', 13, ['35'], '35'),
      row('AccelFlag', 16, ['true'], 'true'), row('TimeZoneFlag', 17, ['true'], 'true'),
    ],
  };
}

/** A made up Context in the measured one's shape, every value invented. */
function context(): Json {
  return {
    'AccountId-': 1234, AccountUri: 'https://example.invalid/account', ConfigVersion: null, CountryCode: 'GB', CustomerId: null, DataConsent: true,
    Email: 'a person', GlobalRemoteUri: 'https://example.invalid/remote', HouseholdDeviceProfileUri: null, 'HouseholdId-': 99,
    HouseholdUserProfileUri: 'example.invalid/user/default', InstallerId: null, KeyboardLocale: null, Language: 'en-GB', LatestSLAAccepted: true,
    LatestSLAAcceptedDate: 'a date', Locale: { Location: null, TimeZone: null, UserTimeZone: null }, Mode: 0, Name: 'Synthetic', RemoteJid: null,
    SetupSession: { Client: 'x', IsStale: false, SetupType: null, Type: 0 },
  };
}

/** The message a composer refuses with, or nothing when it composes. */
function refusalOf(f: () => unknown): string | undefined {
  try {
    f();
    return undefined;
  } catch (e) {
    if (e instanceof ComposeRefusal) return e.message;
    throw e;
  }
}

const values = (s: Json): Record<string, unknown> => Object.fromEntries((s.Settings as Json[]).map((r) => [r.Name, r.Values[0]]));

test('composing Settings changes exactly the first value of each row named, and carries every other row and field', () => {
  const held = settings();
  const out = composeTouchSettings({ values: { ScreenBrightness: '20', ScreenTimeout: '30' } }, held) as Json;
  const want = settings();
  want.Settings[3].Values = ['20'];
  want.Settings[4].Values = ['30'];
  assert.deepEqual(out, want);
  // Key order too, which is what the remote stores and a tag of ours digests.
  assert.equal(JSON.stringify(out), JSON.stringify(want));
  assert.deepEqual(held, settings(), 'the held document is not changed');
  const read = readSettings(out as Settings);
  assert.deepEqual([read.screenBrightness, read.screenTimeout], [{ value: 20, from: 'account' }, { value: 30, from: 'account' }]);
});

test('composing Settings refuses each value the remote mishandles or its screens cannot show, and passes the sliders\' ends, the controls', () => {
  const r = (v: Record<string, string>, held: Json = settings()) => refusalOf(() => composeTouchSettings({ values: v }, held));
  const refused: [Record<string, string>, RegExp][] = [
    [{}, /changes no row/],
    [{ BackgroundImage: 'x.png' }, /BackgroundImage is not changed here: a background is a picture/],
    [{ UserImages: 'x.png' }, /UserImages is not changed here/],
    [{ IsWiFiEnabled: 'false' }, /IsWiFiEnabled is not changed here: nothing on the remote reads it/],
    [{ TimeZoneFlag: 'false' }, /TimeZoneFlag is not changed here: nothing on the remote reads it/],
    [{ Brightness: '20' }, /Brightness is not a setting the remote reads/],
    [{ HapticFlag: 'false' }, /HapticFlag: the Settings the remote holds has no such row/],
    [{ ScreenLockFlag: 'yes' }, /ScreenLockFlag: a yes or no setting takes "true" or "false"/],
    [{ ScreenBrightness: '020' }, /not a whole number written in decimal digits/],
    [{ ScreenBrightness: '20.5' }, /not a whole number written in decimal digits/],
    [{ ScreenBrightness: '9' }, /ScreenBrightness: 9 is outside 10 to 100/],
    [{ ScreenBrightness: '101' }, /ScreenBrightness: 101 is outside 10 to 100/],
    [{ ScreenTimeout: '0' }, /ScreenTimeout: 0 is outside 1 to 30/],
    [{ ScreenTimeout: '31' }, /ScreenTimeout: 31 is outside 1 to 30/],
    [{ KeyBrightness: '101' }, /KeyBrightness: 101 is outside 0 to 100/],
    [{ ScreenBrightness: '100' }, /ScreenBrightness: the value equals the one the remote holds, which changes nothing/],
  ];
  for (const [v, why] of refused) assert.match(r(v) ?? 'composed', why, JSON.stringify(v));
  assert.match(refusalOf(() => composeTouchSettings({ values: { ScreenTimeout: 20 as unknown as string } }, settings())) ?? '', /the value is not text/);
  const twice = settings();
  twice.Settings.push(row('ScreenTimeout', 5, ['10'], null));
  assert.match(r({ ScreenTimeout: '20' }, twice) ?? '', /ScreenTimeout: the Settings the remote holds has it twice/);
  assert.match(r({ ScreenTimeout: '20' }, { RemoteName: 'x' }) ?? '', /states no list of rows/);
  // The controls: each range's ends, and a yes or no row.
  for (const v of [{ ScreenBrightness: '10' }, { ScreenBrightness: '99' }, { ScreenTimeout: '1' }, { ScreenTimeout: '30' }, { KeyBrightness: '0' },
    { KeyBrightness: '100' }, { EditLock: 'true' }, { TwelveHourClock: 'true' }, { AccelFlag: 'false' }]) {
    assert.equal(r(v), undefined, JSON.stringify(v));
  }
});

test('the rows a description may change are the eight the screens read, with the moment each acts', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(SETTING_ROWS).map(([k, v]) => [k, v.acts])), {
    ScreenBrightness: 'at the sync\'s end', KeyBrightness: 'at the sync\'s end', ScreenTimeout: 'at the sync\'s end', TwelveHourClock: 'at the sync\'s end',
    ScreenLockFlag: 'when it is next read', EditLock: 'when it is next read', AccelFlag: 'at the next start', HapticFlag: 'at the next start',
  });
});

test('composing Context from the description of its seven fields gives the held document back, key order included', () => {
  const held = context();
  const description = describeTouchContext(held);
  assert.deepEqual(Object.keys(description), [...CONTEXT_FIELDS_READ]);
  assert.equal(JSON.stringify(composeTouchContext(description, held)), JSON.stringify(held));
  // A field the remote shows and that is not the account's may change, and only it changes.
  const renamed = composeTouchContext({ ...description, Email: 'another person' }, held) as Json;
  assert.deepEqual(Object.keys(renamed).filter((k) => JSON.stringify(renamed[k]) !== JSON.stringify(held[k])), ['Email']);
});

test('composing Context refuses a field outside the seven, a field left out, a change of the account\'s, and values the screens mishandle', () => {
  const held = context();
  const d = describeTouchContext(held);
  const r = (x: Json) => refusalOf(() => composeTouchContext(x as OwnContext, held));
  const { CountryCode: _, ...withoutCountry } = d as Json;
  const refused: [Json, RegExp][] = [
    [{ ...d, AccountUri: 'x' }, /AccountUri is not one of the seven Context fields/],
    [withoutCountry, /leaves out CountryCode/],
    [{ ...d, 'AccountId-': 1235 }, /AccountId- differs from the Context the remote holds, and it is the account's/],
    [{ ...d, HouseholdUserProfileUri: 'example.invalid/other' }, /HouseholdUserProfileUri differs/],
    [{ ...d, Language: 'en' }, /Language is not a language and a region joined by a hyphen/],
    [{ ...d, Language: 'English' }, /Language is not a language and a region/],
    [{ ...d, Email: null }, /Email is not text/],
    [{ ...d, InstallerId: 5 }, /InstallerId is neither null nor text/],
    [{ ...d, SetupSession: null }, /SetupSession is not an object/],
    [{ ...d, SetupSession: { ...(d.SetupSession as object), Type: 1 } }, /SetupSession.Type is not 0/],
    [{ ...d, SetupSession: { ...(d.SetupSession as object), SetupType: 321 } }, /SetupType is neither null nor text/],
    [{ ...d, CountryCode: 'gb' }, /CountryCode is neither null nor two capital letters/],
  ];
  for (const [x, why] of refused) assert.match(r(x) ?? 'composed', why);
  // An account id the remote states as a number cannot be changed to its digits either, since the document would differ.
  assert.match(r({ ...d, 'AccountId-': '1234' }) ?? '', /AccountId- differs/);
  // The controls.
  for (const x of [{ ...d, Language: 'nl-NL' }, { ...d, InstallerId: 'someone' }, { ...d, CountryCode: null }, { ...d, SetupSession: { ...(d.SetupSession as object), SetupType: '321' } }]) {
    assert.equal(r(x), undefined, JSON.stringify(x));
  }
  assert.match(refusalOf(() => composeTouchContext(d, null as unknown as Context)) ?? '', /not a JSON object/);
});

test('a value is read as the screens\' tonumber reads it', () => {
  assert.deepEqual(['20', ' 20 ', '+3', '-5', '3.9', '1e1', '0x10', '', ' ', 'abc', '20 s', null, true, 7].map((x) => luaNumber(x)),
    [20, 20, 3, -5, 3.9, 10, 16, undefined, undefined, undefined, undefined, undefined, undefined, 7]);
});

test('the gate refuses a screen brightness whose fade never ends and a timeout below a second, and passes the values beside them, the controls', () => {
  const withValue = (name: string, value: unknown): SyncDocuments => {
    const s = settings();
    s.Settings.find((x: Json) => x.Name === name).Values = [value];
    return { Settings: s } as SyncDocuments;
  };
  const rules = (d: SyncDocuments) => checkSettingValues(d).map((f) => [f.rule, f.effect, f.document, f.path]);
  for (const v of ['3', '3.8', '0', '-5', 3, '0x3']) {
    assert.deepEqual(rules(withValue('ScreenBrightness', v)), [['setting mishandled', 'refused', 'Settings', 'Settings[3].Values[0]']], `ScreenBrightness ${String(v)}`);
  }
  for (const v of ['0', '0.5', '-1', 0]) {
    assert.deepEqual(rules(withValue('ScreenTimeout', v)), [['setting mishandled', 'refused', 'Settings', 'Settings[4].Values[0]']], `ScreenTimeout ${String(v)}`);
  }
  // The controls: the first level whose fade ends, a timeout of a second, values that read as no number and take the
  // firmware's default, and a second row of a name, which the screens never read.
  for (const [name, v] of [['ScreenBrightness', '4'], ['ScreenBrightness', '3.85'], ['ScreenBrightness', 'abc'], ['ScreenBrightness', null], ['ScreenTimeout', '1'], ['ScreenTimeout', ' ']] as const) {
    assert.deepEqual(rules(withValue(name, v)), [], `${name} ${String(v)}`);
  }
  const second = settings();
  second.Settings.push(row('ScreenBrightness', 4, ['1'], null));
  assert.deepEqual(rules({ Settings: second } as SyncDocuments), []);
  assert.deepEqual(rules(settings() as SyncDocuments), []);
});

test('the gate refuses those values in the bench unit\'s own documents and passes the documents as they are, the control',
  lab.needing(lab.skipUnless(SIX)), () => {
    const six = (): Json => documentsOfAnswers((JSON.parse(new TextDecoder().decode(lab.require_(SIX))) as { answers: SyncAnswer[] }).answers);
    assert.deepEqual(refusalsBeforeASync(six()), []);
    const bad = six();
    bad.Settings.Settings.find((x: Json) => x.Name === 'ScreenBrightness').Values = ['2'];
    bad.Settings.Settings.find((x: Json) => x.Name === 'ScreenTimeout').Values = ['0'];
    assert.deepEqual(findingsByRule(refusalsBeforeASync(bad)), { 'setting mishandled': 2 });
    // The unit's Context composes back to itself from its description, and its Settings takes the description of 8.4.
    const held = six();
    assert.equal(JSON.stringify(composeTouchContext(describeTouchContext(held.Context), held.Context)), JSON.stringify(held.Context));
    const changed = composeTouchSettings({ values: { ScreenBrightness: '20', ScreenTimeout: '30' } }, held.Settings) as Json;
    const was = values(held.Settings);
    const now = values(changed);
    assert.deepEqual(Object.keys(now).filter((k) => now[k] !== was[k]), ['ScreenBrightness', 'ScreenTimeout']);
    assert.deepEqual(refusalsBeforeASync({ ...held, Settings: changed }), []);
  });
