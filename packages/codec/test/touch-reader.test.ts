/**
 * The Harmony Touch reader, `src/families/harmony-touch/`, over the three recorded syncs: what it reads out of Logitech's
 * documents, and the closures that say it reads them the way the remote does.
 *
 * **The question.** `todo-touch.md` 3.3 asks for a reader of the Touch's configuration in the codec. The
 * configuration is the JSON documents a sync hands the remote, `reference/architectures/harmony-touch/`,
 * whose three pages `devices-and-infrared.md`, `activities-and-buttons.md` and `favourites-and-settings.md`
 * say field by field what the remote reads. The reader applies those rules; this file holds it against the
 * only documents that exist, the recordings `packages/usb/src/touchrecording.ts` decodes.
 *
 * **What it asserts, and against what.**
 *
 * 1. **Everything joins.** In the full sync, 373 of 373 commands find the protocol they name, 12 of 12 maps
 *    are found by the identifier the engine builds, 7 of 7 devices and 5 of 5 activities get their own map,
 *    and 654 of 654 command actions find their command on their device, case blind. The counts are the ones
 *    `packages/usb/test/touch-devices.test.ts` and `touch-activities.test.ts` measured with their own walks,
 *    so the reader reaching the same numbers by its own joins is the check that its joins are right.
 * 2. **The codec's one reading of the catalogue notation reads every command**, and resolves each code's
 *    three groups to the segments the Touch would send: 373 of 373, and on all 373 the segments are the ones
 *    the definition's own `KeyCode` field lists. Two fields, a key code per command and a list per family,
 *    so the agreement is a closure and not a restatement; the remote never reads the second,
 *    `devices-and-infrared.md`, "How a code becomes durations".
 * 3. **The widths agree across two sources**: every value of every command, 399, is read at the width the
 *    Touch takes from the segment the value names, its `Payload.NumberOfBits`, which is the width the view
 *    states since `archiveProtocolOf` builds the definition's fields from its segments; and the codec's
 *    reader of the notation, asked with nothing but the code, takes the same 399 widths from the number in
 *    the family's name. A segment's field and a name are two fields, so the agreement is the closure, and
 *    `touch-check.test.ts` holds the case where they disagree and the segment wins.
 * 4. **The favourites close on what the remote asked for.** The reader builds the three favourites
 *    addresses from Context, the device list and the user's document by the rules of "Where each is kept",
 *    and they are exactly the three content addresses of the sync, which are addresses the remote itself
 *    requested. And it builds each favourite's picture address by the rule of "Pictures", and the five are
 *    the first five picture requests of the remote's own list, in order. The negative: the favourites
 *    reversed are not that order.
 * 5. **Settings with the firmware's defaults**: in the full sync the screen's brightness and its timeout
 *    have no value on the account and come out at the firmware's 85 and 10, and vibration, its effect and
 *    the press duration, which no sync carried, come from the firmware too; nothing in this sync comes from
 *    a row's own default. These are the firmware's numbers, not the account's.
 * 6. **The check finds exactly what was measured**: in the full sync the two screen entries overwritten by
 *    a repeated index and the two number pad entries named `Clear`, which the number pad places on no key,
 *    both measured by `touch-activities.test.ts`; in the trial sync one overwritten entry; in the reverse
 *    sync, Settings alone, nothing. **This is a restatement and not a closure**: the check's rules were
 *    written from the reference pages, and those pages took these cases from the same recordings, so the
 *    agreement shows the code says what the pages say about these documents and nothing about the remote.
 * 7. **Nothing is dropped or changed.** Every object of the view that states a `source`, of every kind, from
 *    a protocol to a sequence step, holds the very object its own `document` and `path` lead to, the same
 *    object and not a copy, which checks the paths and the sources against each other; and reading leaves
 *    the documents as they were.
 *
 * **The controls**, each run once by string replacement and failing as it should: the screens' identifier
 * changed to the hubs' `16420`, which fails items 1 and 6; the segments compared against the definition's
 * groups in another order, item 2; the segment width compared one bit wider, item 3; the favourites read in
 * reverse, item 4; a device's source copied instead of kept, item 7. Item 5 cannot be broken here, since
 * no row of these syncs states a default for a number setting: a number reading its row's `DefaultValue` is
 * caught by `touch-check.test.ts`, whose synthetic row states one.
 *
 * **Width.** Three syncs of one Touch on firmware 4.15.330 through Harmony Desktop, one account: seven
 * infrared devices in five code families, five activities, one favourites activity. Roles, actions and
 * kinds the account did not hold are read as their kind and not exercised.
 *
 * **Sources checked first.** The three reference pages above and `usb.md`, the five `packages/usb` tests
 * of the recordings, Logitech's data model in `reference/logitech/data-model/`, and the codec's
 * `stated.ts` and `archive.ts`, whose reader of the notation this reader calls. Logitech's client was not
 * consulted: the remote reads these documents, and the client hands them over unchanged.
 *
 * The fixtures hold the test account's data, so this file asserts counts, structure and equalities and
 * prints no value out of them. It skips without the lab.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';

import * as lab from '@harmony/lab';
import { segmentRefs } from '../src/archive.ts';
import { statedCode } from '../src/stated.ts';
import { checkConfiguration, findingsByRule, refusalsBeforeASync } from '../src/families/harmony-touch/check.ts';
import { documentsOfAnswers, type SyncDocuments } from '../src/families/harmony-touch/documents.ts';
import { FIRMWARE_SETTINGS, readConfiguration, type Configuration } from '../src/families/harmony-touch/read.ts';
import { answersOf, FULL, requestsOf, REVERSE, TRIAL } from './touch-sync.ts';

const cache = new Map<string, { documents: SyncDocuments; c: Configuration }>();
function read(fixture: string): { documents: SyncDocuments; c: Configuration } {
  let one = cache.get(fixture);
  if (one === undefined) {
    const documents = documentsOfAnswers(answersOf(fixture));
    one = { documents, c: readConfiguration(documents) };
    cache.set(fixture, one);
  }
  return one;
}

test('the full sync reads whole: every command finds its protocol, every map its owner, every action its command', lab.skipUnless(FULL), () => {
  const { c } = read(FULL);
  assert.deepEqual(c.absent, []);
  assert.equal(c.protocols.length, 5);
  assert.equal(c.devices.length, 7);
  const commands = c.devices.flatMap((d) => d.commands);
  assert.equal(commands.length, 373);
  assert.equal(commands.filter((x) => x.protocol !== undefined).length, 373);
  assert.equal(c.maps.length, 12);
  assert.equal(c.maps.filter((m) => m.reachable).length, 12);
  assert.equal(c.devices.filter((d) => d.map !== undefined && d.map.kind === 'device').length, 7);
  assert.equal(c.activities.length, 5);
  assert.equal(c.activities.filter((a) => a.map !== undefined && a.map.kind === 'activity').length, 5);
  const actions = c.maps.flatMap((m) => m.buttons).flatMap((b) => [b.press, b.longPress, b.doublePress]).filter((a) => a?.kind === 'command');
  assert.equal(actions.length, 654);
  assert.equal(actions.filter((a) => a!.command !== undefined).length, 654);
  // The roles and the per device view of them, `touch-activities.test.ts` item 12: 17 roles in 13 pairs.
  assert.equal(c.activities.reduce((n, a) => n + a.roles.length, 0), 17);
  assert.equal(c.activities.reduce((n, a) => n + a.devices.length, 0), 13);
});

test('the codec\'s one reading of the notation reads every command, and its segments are the ones the definition lists', lab.skipUnless(FULL), () => {
  const commands = read(FULL).c.devices.flatMap((d) => d.commands);
  assert.equal(commands.filter((x) => x.code !== undefined).length, 373);
  assert.equal(commands.filter((x) => x.segments !== undefined).length, 373);
  const names = (g: readonly { SegmentName: string | null }[] | null | undefined): (string | null)[] => (g ?? []).map((r) => r.SegmentName);
  const agree = commands.filter((x) => {
    const own = x.protocol!.source.KeyCode!;
    return isDeepStrictEqual([names(x.segments!.Start), names(x.segments!.Repeat), names(x.segments!.Finish)], [names(own.Start), names(own.Repeat), names(own.Finish)]);
  });
  assert.equal(agree.length, 373);
});

test('every value is read at the width of the segment it names, and the family\'s name states the same width', lab.skipUnless(FULL), () => {
  let values = 0;
  let fromSegment = 0;
  let fromName = 0;
  for (const x of read(FULL).c.devices.flatMap((d) => d.commands)) {
    const refs = segmentRefs(x.protocol!.archive);
    // The reader asked with the code alone, so its widths are the name's.
    const byName = statedCode(x.keyCode!)?.frames ?? [];
    for (const [at, f] of x.code!.frames.entries()) {
      values += 1;
      const name = refs.get(String(f.index))?.SegmentName;
      const segment = (x.protocol!.source.IRSegments ?? []).find((s) => s.Name === name);
      if (segment?.Payload?.NumberOfBits === f.bits) fromSegment += 1;
      if (byName[at]?.bits === f.bits) fromName += 1;
    }
  }
  assert.equal(values, 399);
  assert.equal(fromSegment, 399);
  assert.equal(fromName, 399);
});

test('the favourites close on the remote\'s own requests: the three documents\' addresses and the pictures in order', lab.skipUnless(FULL), () => {
  const { documents, c } = read(FULL);
  assert.equal(c.favourites.length, 1);
  const [f] = c.favourites;
  const content = Object.keys(documents).filter((k) => k.startsWith('content://')).sort();
  assert.equal(content.length, 3);
  assert.ok(isDeepStrictEqual([f!.addresses.user, f!.addresses.device, f!.addresses.service].sort(), content), 'the addresses built are the addresses asked for');
  assert.equal(f!.missing.length, 0, 'every favourites address the remote would ask for is in the sync');
  assert.equal(f!.favourites.length, 5);
  assert.equal(f!.favourites.filter((x) => typeof x.number === 'string' && /^\d+$/.test(x.number)).length, 5);
  assert.equal(f!.favourites.filter((x) => x.added).length, 1);
  const pictures = requestsOf(FULL).map((r) => r.uri).filter((u) => u.startsWith('content-image://'));
  const logos = f!.favourites.map((x) => x.logo);
  assert.equal(logos.filter((l) => l !== undefined).length, 5);
  assert.ok(isDeepStrictEqual(pictures.slice(0, 5), logos), 'the favourites\' pictures are the first five asked for, in order');
  // The negative: the order is the user document's and not one any order would give.
  assert.ok(!isDeepStrictEqual(pictures.slice(0, 5), [...logos].reverse()), 'reversed, they are not');
});

test('settings take the firmware\'s defaults where the account states no value', lab.skipUnless(FULL), () => {
  const s = read(FULL).c.settings!;
  const read_ = { background: s.background, twelveHourClock: s.twelveHourClock, screenBrightness: s.screenBrightness, screenTimeout: s.screenTimeout,
    screenLock: s.screenLock, editLock: s.editLock, keyBrightness: s.keyBrightness, motionSensor: s.motionSensor, vibration: s.vibration,
    vibrationEffect: s.vibrationEffect, activityPressDuration: s.activityPressDuration };
  const from = (where: string): string[] => Object.entries(read_).filter(([, v]) => v.from === where).map(([k]) => k).sort();
  assert.deepEqual(from('firmware'), ['activityPressDuration', 'screenBrightness', 'screenTimeout', 'vibration', 'vibrationEffect']);
  assert.deepEqual(from('row default'), []);
  assert.equal(from('account').length, 6);
  assert.equal(s.screenBrightness.value, FIRMWARE_SETTINGS.ScreenBrightness);
  assert.equal(s.screenTimeout.value, FIRMWARE_SETTINGS.ScreenTimeout);
  assert.equal(s.rows.size, 11);
});

test('the trial sync has no favourites activity, and the reverse sync holds Settings alone', lab.skipUnless(TRIAL, REVERSE), () => {
  const trial = read(TRIAL).c;
  assert.deepEqual(trial.absent, []);
  assert.equal(trial.activities.filter((a) => a.tuningDefault).length, 0);
  assert.equal(trial.favourites.length, 0);
  const reverse = read(REVERSE).c;
  assert.deepEqual(reverse.absent, ['ActivityList', 'DeviceList', 'MapList', 'Context', 'ProtocolList']);
  assert.ok(reverse.settings !== undefined);
  assert.equal(reverse.devices.length + reverse.maps.length + reverse.activities.length, 0);
});

test('the check reports what the recordings were measured to hold: two overwritten entries and two number pad entries on no key, and no other', lab.skipUnless(FULL, TRIAL, REVERSE), () => {
  assert.deepEqual(findingsByRule(checkConfiguration(read(FULL).c)), { 'repeated screen index': 2, 'number pad entry on no key': 2 });
  assert.deepEqual(findingsByRule(checkConfiguration(read(TRIAL).c)), { 'repeated screen index': 1 });
  assert.deepEqual(findingsByRule(checkConfiguration(read(REVERSE).c)), {});
});

test('the gate before a write passes both recorded sets down whole, and refuses the reverse sync, which holds Settings alone', lab.skipUnless(FULL, TRIAL, REVERSE), () => {
  // The calibration of `refusalsBeforeASync`: Logitech's own two sets down are what a remote took, so the
  // gate refusing either would be the gate's fault. The negative is the reverse sync's one document, which
  // is not a set a sync down can be answered from.
  assert.deepEqual(refusalsBeforeASync(read(FULL).documents), []);
  assert.deepEqual(refusalsBeforeASync(read(TRIAL).documents), []);
  assert.deepEqual(findingsByRule(refusalsBeforeASync(read(REVERSE).documents)), { 'document absent': 5 });
});

/**
 * Every object of the view that states a `source`, found by walking the whole view, each once.
 *
 * The walk does not know the view's kinds, which is the point: a kind added to the view later is walked
 * without this test being told. It follows every value but `source` itself and the configuration's own
 * `documents`, through arrays and maps, and the view's cycles, a device and its map's actions, are cut by
 * remembering what it has seen.
 */
function viewsWithASource(c: Configuration): { document: string; path: string; source: unknown }[] {
  const out: { document: string; path: string; source: unknown }[] = [];
  const seen = new Set<object>();
  const walk = (x: unknown): void => {
    if (x === null || typeof x !== 'object' || seen.has(x)) return;
    seen.add(x);
    if (x instanceof Map) {
      for (const one of x.values()) walk(one);
      return;
    }
    if (Array.isArray(x)) {
      for (const one of x) walk(one);
      return;
    }
    const o = x as Record<string, unknown>;
    if ('source' in o && typeof o.document === 'string' && typeof o.path === 'string') {
      out.push({ document: o.document, path: o.path, source: o.source });
    }
    for (const [key, value] of Object.entries(o)) if (key !== 'source' && key !== 'documents') walk(value);
  };
  walk(c);
  return out;
}

/** The object a path such as `Activities[0].Roles[1]` leads to inside a document; `''` is the document. */
function at(document: unknown, path: string): unknown {
  let here = document;
  for (const step of path.split('.').filter((one) => one !== '')) {
    const [, field, ...indices] = /^([^[]+)((?:\[\d+\])*)$/.exec(step) ?? [];
    here = (here as Record<string, unknown> | undefined)?.[field ?? ''];
    for (const index of (indices[0] ?? '').match(/\d+/g) ?? []) here = (here as unknown[] | undefined)?.[Number(index)];
  }
  return here;
}

test('every object of the view keeps the document object its place leads to as its source, and reading changes no document', lab.skipUnless(FULL), () => {
  const before = documentsOfAnswers(answersOf(FULL));
  const frozen = JSON.stringify(before);
  const c = readConfiguration(before);
  checkConfiguration(c);
  assert.ok(JSON.stringify(before) === frozen, 'reading and checking leave the documents as they were');
  const views = viewsWithASource(c);
  const kept = views.filter((v) => at((before as Record<string, unknown>)[v.document], v.path) === v.source);
  // Counted per kind of place, so a failure says which kind came loose without printing a document.
  const kinds = (xs: typeof views): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const v of xs) {
      const kind = `${v.document} ${v.path.replace(/\[\d+\]/g, '[]')}`;
      out[kind] = (out[kind] ?? 0) + 1;
    }
    return out;
  };
  assert.deepEqual(kinds(kept), kinds(views), 'per kind of place, every object\'s source is what its place leads to');
  assert.equal(kept.length, views.length);
  // The counts the other tests measured with their own walks, here as kinds of place the view holds.
  const all = kinds(views);
  assert.equal(all['ProtocolList Protocols[]'], 5);
  assert.equal(all['DeviceList DevicesWithFeatures[]'], 7);
  assert.equal(all['DeviceList DevicesWithFeatures[].Commands[]'], 373);
  assert.equal(all['MapList ButtonMaps[]'], 12);
  assert.equal(all['ActivityList Activities[]'], 5);
  assert.equal(all['ActivityList Activities[].Roles[]'], 17);
  assert.equal(all['Settings '], 1);
  assert.equal(all['Context '], 1);
  // And the view walks every kind of object it builds: each of these kinds of place is in it.
  for (const kind of ['DeviceList DevicesWithFeatures[].DeviceFeatures[]', 'DeviceList DevicesWithFeatures[].DeviceFeatures[].Inputs[]',
    'MapList ButtonMaps[].Buttons[]', 'MapList ButtonMaps[].Buttons[].ButtonAction', 'MapList ButtonMaps[].Buttons[].ButtonLongPressAction',
    'MapList ButtonMaps[].Sequences[]', 'MapList ButtonMaps[].Sequences[].Actions[]', 'ActivityList Activities[].EnterActions[]']) {
    assert.ok((all[kind] ?? 0) > 0, `the view holds ${kind}`);
  }
});
