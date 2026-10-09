/**
 * `todo-compile-650.md` 5.2: our file for the Harmony 650's test setup against Logitech's compile of the
 * same setup, compared by what a person sees and hears, `compare.ts`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { LAB, require_, skipUnless } from '@harmony/lab';
import { compareViews, parse, setupView } from '../src/index.ts';
import type { Container } from '../src/gspm.ts';
import { activities } from '../src/inventory.ts';

test('a file compared with itself differs nowhere, and the view reaches every part of the 650 test setup',
  skipUnless('h650_test_config'), () => {
    const view = setupView(parse(require_('h650_test_config')));
    assert.deepEqual(compareViews(view, view), []);
    const contexts = new Set([...view.keys()].map((key) => key.split(' | ')[0]));
    // Five activities, seven devices with their screen records, the menu and the device lists.
    assert.equal([...contexts].filter((one) => one?.startsWith('activity ') && one !== 'activity menu').length, 5);
    assert.equal([...contexts].filter((one) => one?.startsWith('device ') && one !== 'device list' && !one.endsWith('screen record')).length, 7);
    assert.ok(contexts.has('activity menu') && contexts.has('device list'));
    assert.equal(view.size, 639);
  });

test('our 5.1 file and Logitech\'s compile of the same setup differ in the menu order, Red in TV kijken and how Radio is stored, and nowhere else',
  skipUnless('h650_milestone_5_1_config', 'h650_test_config'), () => {
    const ours = setupView(parse(require_('h650_milestone_5_1_config')));
    const theirs = setupView(parse(require_('h650_test_config')));
    const differences = compareViews(ours, theirs);
    // In key order, which puts an activity's slots before the menu's.
    assert.deepEqual(differences.map((one) => `${one.kind}: ${one.key}`), [
      // The same two codes heard; Logitech stores a sequence's commands as single copies, section 343.
      'records: activity Plasma kijken | page 1 | scan 34',
      // The account still holds 4.2's sequence on Red, made after the starting compile ours is built on.
      'frames: activity TV kijken | keys | scan 13',
      // Logitech places Plasma kijken second; our composer appends a new activity's row at the end.
      'label: activity menu | page 1 | cell 2',
      'label: activity menu | page 2 | cell 0',
      'label: activity menu | page 2 | cell 2',
      'label: activity menu | page 3 | cell 0',
    ]);
    const red = differences.find((one) => one.kind === 'frames');
    assert.deepEqual(red?.b?.frames, ['KPN 32:20ff8877', 'KPN 32:20ff48b7', 'KPN 32:20ffd02f']);
    // The control: against the starting compile, which lacks Plasma kijken, the view sees the activity
    // missing, its 39 keys, its start, its four corners and its cell on the menu's third page.
    const start = setupView(parse(require_('h650_start_config')));
    assert.equal(compareViews(ours, start).filter((one) => one.kind === 'only in a').length, 45);
  });

test('once the account matches the test setup, Logitech\'s compile and our 5.1 file differ only in the menu order and how Radio is stored',
  skipUnless('h650_milestone_5_1_config', 'h650_test_config_clean'), () => {
    const ours = setupView(parse(require_('h650_milestone_5_1_config')));
    const theirs = setupView(parse(require_('h650_test_config_clean')));
    assert.equal(theirs.size, 639);
    // todo-compile-650 5.2.3: 4.2's sequence taken off TV kijken's Red in MyHarmony and compiled again,
    // so the one difference a person would hear is gone; what stays is 5.2.2's and 5.2.4's.
    assert.deepEqual(compareViews(ours, theirs).map((one) => `${one.kind}: ${one.key}`), [
      'records: activity Plasma kijken | page 1 | scan 34',
      'label: activity menu | page 1 | cell 2',
      'label: activity menu | page 2 | cell 0',
      'label: activity menu | page 2 | cell 2',
      'label: activity menu | page 3 | cell 0',
    ]);
  });

test('with the menu\'s order not counted, our 5.1 file and Logitech\'s clean compile differ only in how Radio is stored, and a missing activity still shows',
  skipUnless('h650_milestone_5_1_config', 'h650_test_config_clean', 'h650_start_config'), () => {
    const ours = setupView(parse(require_('h650_milestone_5_1_config')));
    const theirs = setupView(parse(require_('h650_test_config_clean')));
    // Section 351: nothing a person can set decides the 650's menu order, so it is not a difference.
    assert.deepEqual(compareViews(ours, theirs, { menuOrder: false }).map((one) => `${one.kind}: ${one.key}`), [
      'records: activity Plasma kijken | page 1 | scan 34',
    ]);
    // The control: the starting compile lacks Plasma kijken, and the menu's set says so in one slot.
    const start = setupView(parse(require_('h650_start_config')));
    const menu = compareViews(ours, start, { menuOrder: false }).filter((one) => one.key === 'activity menu | activities');
    assert.deepEqual(menu.map((one) => [one.kind, one.a?.label, one.b?.label]), [[
      'label',
      'Film kijken, Kodi kijken, Muziek, Plasma kijken, TV kijken',
      'Film kijken, Kodi kijken, Muziek, TV kijken',
    ]]);
  });

/** The activity menu as the remote shows it: pages in file order, each page's rows top to bottom. */
const menuOrder = (c: Container): string[] => activities(c).filter((one) => one.at !== undefined)
  .sort((x, y) => x.page - y.page || (x.at?.y ?? 0) - (y.at?.y ?? 0)).map((one) => one.name ?? String(one.activity));

/**
 * A dated account capture in the lab: it carries an account identity, and the account is a live thing
 * whose contents change, so a test reads the reply captured with the compile rather than asking today.
 */
const captured = (...path: string[]): unknown =>
  JSON.parse(readFileSync(join(LAB!, 'work', ...path), 'utf8').replace(/^\uFEFF/, ''));

/** An account's activities in its stored `ActivityOrder`, as MyHarmony lists and saves them. */
const accountOrder = (...path: string[]): string[] =>
  (captured(...path) as { Activities: { Name: string; ActivityOrder: number }[] }).Activities
    .slice().sort((x, y) => x.ActivityOrder - y.ActivityOrder).map((one) => one.Name);

test('MyHarmony offers activity reordering to every remote with a screen but the Harmony 600, 650, 665 and 700, section 351',
  skipUnless('one_spare_myharmony'), () => {
    // Capability 11, ActivityReorder, is what makes the dashboard list the reorder screen.
    const products = captured('myharmony', 'responses-account2', 'GetAllProducts.json') as
      { SkinId: number; DisplayName: string; IsEnabled: boolean; SupportedCapabilities: { CapabilityId: number }[] | null }[];
    const lacking = products.filter((one) => !(one.SupportedCapabilities ?? []).some((cap) => cap.CapabilityId === 11));
    assert.equal(products.length, 120);
    assert.equal(lacking.length, 81);
    // The enabled ones: three models with no screen for an activity menu, two hubs with no remote of
    // their own, and the 600 family, each in both regional variants.
    assert.deepEqual([...new Set(lacking.filter((one) => one.IsEnabled).map((one) => one.DisplayName.trim()))].sort(), [
      'Harmony 200', 'Harmony 300', 'Harmony 350', 'Harmony 600', 'Harmony 650', 'Harmony 665', 'Harmony 700',
      'Harmony Hub / Home Hub', 'Harmony Ultimate Hub',
    ]);
    // The control, by skin: the Harmony One+ (54) and One EMEA (59) carry it, and so does the 800 (86).
    const carries = (skin: number): boolean | undefined => products.find((one) => one.SkinId === skin)
      ?.SupportedCapabilities?.some((cap) => cap.CapabilityId === 11);
    assert.deepEqual([54, 59, 86, 71, 72, 66].map(carries), [true, true, true, false, false, false]);
  });

test('the Harmony One\'s activity menu follows its account\'s stored order and the Harmony 650\'s does not, section 351',
  skipUnless('one_spare_myharmony', 'h650_start_config', 'h650_assistant_off_config', 'h650_test_config_clean'), () => {
    // The spare Harmony One: the account's order, which is neither creation nor id order, is the menu.
    const one = accountOrder('myharmony', 'responses-account2', 'ActivityList.json');
    assert.deepEqual(one, ['Bluetooth', 'HDMI Extra', 'Heos/Spotify', 'PlayStation 3', 'Kodi kijken', 'TV kijken', 'LG WebOS']);
    assert.deepEqual(menuOrder(parse(require_('one_spare_myharmony'))), one);
    // The bench Harmony 650: the account's order, captured with each compile session, is the order the
    // activities were made in, and no menu follows it. Both activities added later landed second.
    const start = accountOrder('setups', 'h650-start', 'replies', '0037-ActivityList.bin');
    assert.deepEqual(start, ['TV kijken', 'Film kijken', 'Muziek', 'Kodi kijken']);
    assert.deepEqual(menuOrder(parse(require_('h650_start_config'))), ['Kodi kijken', 'Muziek', 'TV kijken', 'Film kijken']);
    // Captured at the start of the next session; a 650 owner has no control that could have moved it.
    assert.deepEqual(accountOrder('setups', 'h650-test', 'replies', '0003-ActivityList.bin'), [...start, 'Watch TV2']);
    assert.deepEqual(menuOrder(parse(require_('h650_assistant_off_config'))),
      ['Kodi kijken', 'Watch TV2', 'Muziek', 'TV kijken', 'Film kijken']);
    assert.deepEqual(accountOrder('setups', 'h650-test', 'replies', '0015-ActivityList.bin'), [...start, 'Plasma kijken']);
    assert.deepEqual(menuOrder(parse(require_('h650_test_config_clean'))),
      ['Kodi kijken', 'Plasma kijken', 'Muziek', 'TV kijken', 'Film kijken']);
  });
