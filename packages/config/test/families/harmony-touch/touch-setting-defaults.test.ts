/**
 * **The Harmony Touch's default settings**, `TOUCH_SETTING_DEFAULTS` and `TOUCH_SETTINGS` in
 * `packages/config/src/families/harmony-touch/settings.ts`: the value a Settings of ours writes for a row a document does
 * not state, and the rows a document may state. `reference/architectures/harmony-touch/favourites-and-settings.md`,
 * "Settings", is the page this holds.
 *
 * **Where the defaults were read.** From a **Settings document Logitech's service wrote**: the one their client wrote
 * to the bench Touch in the earliest sync recorded, the lab's `touch_sync_recording`, and again in the full sync after
 * the account's setup was filled, `touch_full_sync_recording`, each recorded whole through Harmony Desktop. A Settings
 * row is a name, a list of values of which the remote reads the first, and a `DefaultValue`, Logitech's
 * `RemoteSetting`. Stated by Logitech, by their service: the values are what their service sends, not what this
 * project measured the remote doing with them.
 *
 * **What was found.** Both documents hold eleven rows in one order and the same name, values and default on each of
 * the seven a Settings of ours writes. **Five state a value, and each value equals the row's own default**: the clock
 * not in 12 hour form, the lock screen on, the edit lock off, the keys' light at 35 and the motion sensor on. **Two
 * state no value and no default**, the screen's brightness and its timeout, and on such a row the remote reads the
 * firmware's own default, 85 and 10 seconds, read in the firmware, `FIRMWARE_SETTINGS` in `read.ts`; the table takes
 * those two, so a row of ours states what the remote would read on Logitech's. **Two of Logitech's five differ from the
 * firmware's own**, which the firmware takes for a row with no value: the clock, 12 hour there, and the lock screen,
 * off there. So the table is not the firmware's, and a document of ours with no settings starts where an account
 * Logitech's service made starts, which is what a person moving from Logitech's software has seen.
 *
 * **The rows not written from a document.** Of Logitech's eleven, the two background rows hold a picture, which a
 * Settings of ours fills with our background, and the two that nothing on the remote reads, `IsWiFiEnabled` and
 * `TimeZoneFlag`, are no setting of the model's; the firmware also knows the vibration, its effect and the activity
 * press duration, which no sync measured carried. The test below holds that every row of Logitech's document is in
 * exactly one of the table, the rows not built and the two nothing reads.
 *
 * **Only booleans and numbers are compared**, never the background rows' values or the document's addresses, which
 * name the test account's pictures; a failure names the row and not the value.
 *
 * **Negative result kept**: the defaults do not come from Logitech's client. Their client writes the service's document
 * to the remote as it arrives, and decides no setting itself, so the service's document is the source; the client was
 * not read for this.
 *
 * **Sources checked first**: the reference page above and its firmware reading, `FIRMWARE_SETTINGS`, and the test that
 * already reads these two documents' shape, `packages/usb/test/touch/touch-favourites.test.ts`.
 *
 * **Which architectures**: the Harmony Touch alone, firmware 4.15.330; its firmware reports 17 and Logitech's templates
 * file it under 18. One account, so one sample of what Logitech's service writes for an account: another region or a
 * later account could be given other values, not checked.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as lab from '@freeharmony-sdk/lab';
import { answersWritten, commands, records, resource, sessions } from '@freeharmony-sdk/testkit/touch-recording';

import { SETTINGS_ROWS_WRITTEN } from '../../../src/families/harmony-touch/fromnothing.ts';
import { FIRMWARE_SETTINGS } from '../../../src/families/harmony-touch/read.ts';
import { SETTING_ROWS, settingText, TOUCH_SETTING_DEFAULTS, TOUCH_SETTINGS } from '../../../src/families/harmony-touch/settings.ts';

const EARLIEST = 'touch_sync_recording';
const FULL = 'touch_full_sync_recording';

/** One row of Logitech's Settings, the members compared here. */
interface Row {
  readonly Name: string;
  readonly Values: readonly (string | null)[];
  readonly DefaultValue: string | null;
}

/** The rows of the Settings document the client wrote to the remote in a recorded sync. */
function settingsRows(fixture: string): Row[] {
  const hlapi = sessions(commands(records(fixture))).filter((s) => s.path === '/sys/hlapi');
  const answer = answersWritten(hlapi).filter((one) => one.uri.startsWith('harmony://') && resource(one.uri) === 'Settings');
  assert.equal(answer.length, 1, `${fixture}: one Settings written`);
  return (answer[0]!.resource as { Settings: Row[] }).Settings;
}

/** A default of the table as the text a Settings row holds it in. */
const asText = (value: boolean | number): string => String(value);

test('the table is the value Logitech\'s Settings states, each the row\'s own default, and the firmware\'s where it states none', lab.skipUnless(EARLIEST, FULL), () => {
  for (const fixture of [EARLIEST, FULL]) {
    const rows = settingsRows(fixture);
    const stating: string[] = [];
    const empty: string[] = [];
    for (const [name, value] of Object.entries(TOUCH_SETTING_DEFAULTS)) {
      const found = rows.filter((one) => one.Name === name);
      assert.equal(found.length, 1, `${fixture}: ${name} once`);
      const row = found[0]!;
      if (row.Values.length === 0) {
        // No value and no default: the remote reads the firmware's, which the table holds.
        assert.equal(row.DefaultValue, null, `${fixture}: ${name} has no default either`);
        assert.equal(value, FIRMWARE_SETTINGS[name as keyof typeof FIRMWARE_SETTINGS], `${fixture}: ${name} is the firmware's`);
        empty.push(name);
      } else {
        assert.deepEqual([row.Values.length, row.Values[0] === asText(value), row.DefaultValue === asText(value)], [1, true, true], `${fixture}: ${name}`);
        stating.push(name);
      }
    }
    assert.deepEqual(stating, ['TwelveHourClock', 'ScreenLockFlag', 'EditLock', 'KeyBrightness', 'AccelFlag'], fixture);
    assert.deepEqual(empty, ['ScreenBrightness', 'ScreenTimeout'], fixture);
  }
});

test('every row of Logitech\'s Settings is a row of the table, a row not built yet, or one nothing on the remote reads', lab.skipUnless(EARLIEST), () => {
  const names = settingsRows(EARLIEST).map((one) => one.Name);
  const table = TOUCH_SETTINGS.rows.map((one) => one.name);
  const notBuilt = Object.keys(TOUCH_SETTINGS.notBuilt);
  const readByNothing = ['IsWiFiEnabled', 'TimeZoneFlag'];
  assert.equal(names.length, 11);
  for (const name of names) {
    assert.equal([table.includes(name), notBuilt.includes(name), readByNothing.includes(name)].filter(Boolean).length, 1, name);
  }
  assert.deepEqual(names.filter((name) => notBuilt.includes(name)), ['UserImages', 'BackgroundImage']);
});

test('the table is the seven rows a Settings of ours writes from a document, in that order, each default taken by the row\'s own check', () => {
  assert.deepEqual(TOUCH_SETTINGS.rows.map((one) => one.name), SETTINGS_ROWS_WRITTEN.filter((name) => name !== 'UserImages' && name !== 'BackgroundImage'));
  for (const row of TOUCH_SETTINGS.rows) {
    const own = SETTING_ROWS[row.name]!;
    assert.equal(row.takes.kind, own.kind, row.name);
    if (row.takes.kind === 'whole number' && own.kind === 'whole number') assert.deepEqual([row.takes.min, row.takes.max], [own.min, own.max], row.name);
    assert.equal(settingText(row.name, row.default), asText(row.default), row.name);
    assert.equal(TOUCH_SETTINGS.refusedValue(row.name, row.default), undefined, row.name);
  }
  // The rows the firmware knows that no document states yet, each with the requirement it waits on.
  assert.deepEqual(TOUCH_SETTINGS.notBuilt, { HapticFlag: 47, HapticEffect: 47, ActivityPressDuration: 47, BackgroundImage: 42, UserImages: 42 });
});

test('the control: the table differs from the firmware\'s own defaults on exactly the clock and the lock screen', () => {
  const differing = Object.entries(TOUCH_SETTING_DEFAULTS)
    .filter(([name, value]) => FIRMWARE_SETTINGS[name as keyof typeof FIRMWARE_SETTINGS] !== value).map(([name]) => name);
  assert.deepEqual(differing, ['TwelveHourClock', 'ScreenLockFlag']);
});
