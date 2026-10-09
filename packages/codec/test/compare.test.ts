/**
 * `todo-compile-650.md` 5.2: our file for the Harmony 650's test setup against Logitech's compile of the
 * same setup, compared by what a person sees and hears, `compare.ts`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import { compareViews, parse, setupView } from '../src/index.ts';

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
