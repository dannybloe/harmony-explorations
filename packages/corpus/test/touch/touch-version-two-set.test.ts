/**
 * **The six documents of the Harmony Touch's test setup built from a document of version 2, compared field by field
 * with the six built from the same setup's earlier form**, decision 43.
 *
 * **The question.** The application's path builds a Touch's set from a document of version 2 alone, through
 * `buildFromRecipe`; the bench Touch's sets were built from setup files of the earlier form, with a block of the
 * Touch's own. The codec's round trip, `touch-resolve.test.ts`, showed the two give the composer the same setup but for
 * nine fields of four kinds. Do those nine reach the documents as nine, and does nothing else differ?
 *
 * **The instrument.** The reference document, `packages/codec/test/references/touch-test.json`, the converter's output,
 * built by the one build an application calls, against the document it was converted from,
 * `packages/codec/test/families/harmony-touch/touch-test-earlier-form.json`, built by the earlier form's route,
 * `earlierTouchSetupFile` on `@harmony/codec/internal`; both with the definitions the documents carry, so no lab and no
 * archive, and both with John Doe's made up account, its household address filled in as the sync tests fill it. The
 * comparison is the from-nothing work's, `compareSetup` over the six documents, with no normalisation and no explained
 * difference, so every field that differs is counted; lists are matched by what the remote finds an entry by.
 *
 * **What it measured.**
 *
 * * **The device list: 5 fields**, the control port of the Blu-ray, the Plex, the KPN, the Xbox and the Switch, 0 where
 *   the earlier form has 7, the first of the nine.
 * * **The maps: 4 buttons**, each differing in one field from its earlier self, so each is a button the comparison
 *   finds once on each side, all its fields counted: the LG TV's `-` entry at place 5 where it was stacked on 11, the
 *   Xbox's `#` at 16 where it was stacked on 11, the Xbox's pad key left of 0 labelled `NumberPlus` where it was `.`,
 *   and Play a Game's Exit key in the list's group, 0, where it was in the pad's, 2. These are the other four of the
 *   nine, one button each: the two stacked entries, the pad label and the key's group.
 * * **The order of the buttons in every map, 12 of 12**: the earlier form listed each map's buttons in the order its
 *   block stated them, Logitech's, and a document of version 2 in the order the family derives them. The codec's round
 *   trip does not compare that order, and says why: the engine finds a key by its name and an entry by its place,
 *   `reference/architectures/harmony-touch/activities-and-buttons.md`. **That the remote does not act on it otherwise
 *   is the reference's reading, not a measurement of this set on a remote.**
 * * **Everything else equal**: the activity list, every other field of the device list and the maps, Context, Settings
 *   and the protocol list.
 *
 * **The gate before a sync**, `refusalsBeforeASync`, passes the set built from the document of version 2.
 *
 * **The control.** The document with the KPN's own delay between keys taken out differs from the earlier form's set in
 * exactly one field more, that device's delay between keys, so the comparison sees a field a document drops.
 *
 * **What it does not settle.** Whether the bench Touch acts on this set as it did on the earlier form's: nothing here
 * touches a remote, and the reference records that this build has not been on one. **Width**: the Harmony Touch alone,
 * one setup of seven devices and five activities; its firmware reports architecture 17 and Logitech's templates file
 * it under 18.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The Node entry, for the deflate and the SHA-256 the core asks its loader for.
import { buildFromRecipe } from '@harmony/codec/node';
import { harmonyTouch } from '@harmony/codec/build';
import { carriedCatalogue, earlierTouchSetupFile } from '@harmony/codec/internal';

import { compareSetup, comparisonLines, type ComparisonRules } from '../../experiments/touchsetupset.ts';
import { NOTHING_DOCUMENTS } from '../../experiments/touchnothingset.ts';

type Json = any;

const REFERENCES = new URL('../../../codec/test/references/', import.meta.url);
const EARLIER = new URL('../../../codec/test/families/harmony-touch/touch-test-earlier-form.json', import.meta.url);
const BUILT_AT = '2026-11-09T12:00:00';

const JOHN_DOE = JSON.parse(readFileSync(new URL('john-doe-account.json', REFERENCES), 'utf8')) as { context: Record<string, unknown> };
/** John Doe's made up account with a household address, which the gate requires and the reference leaves empty. */
const ACCOUNT = { ...JOHN_DOE, context: { ...JOHN_DOE.context, HouseholdUserProfileUri: 'https://example.invalid/john-doe/household' } };

const reference = (): Json => JSON.parse(readFileSync(new URL('touch-test.json', REFERENCES), 'utf8'));

/** The six documents of a document of version 2, by the one build an application calls. */
function versionTwoSet(json: Json): harmonyTouch.SyncDocuments {
  const built = buildFromRecipe(json, { builtAt: BUILT_AT, account: ACCOUNT as never });
  assert.equal(built.kind, 'documents');
  return (built as { documents: harmonyTouch.SyncDocuments }).documents;
}

/** The six documents of the earlier form, by its own route, with the definitions the document carries. */
function earlierSet(): harmonyTouch.SyncDocuments {
  const file = earlierTouchSetupFile.readEarlierTouchSetupFile(JSON.parse(readFileSync(EARLIER, 'utf8')));
  const { touch: _touch, ...plain } = file;
  return earlierTouchSetupFile.buildEarlierTouchDocuments(file, { archive: carriedCatalogue(plain)!, account: ACCOUNT as never });
}

/** Every field counted: no normalisation and no explained difference, the six documents. */
const EVERY_FIELD: ComparisonRules = { documents: NOTHING_DOCUMENTS, normalisations: [], differences: [] };

/** A map's buttons as text, each with its map, so a button differing in any field is one on each side. */
function buttons(docs: harmonyTouch.SyncDocuments): Set<string> {
  const out = new Set<string>();
  for (const map of docs.MapList!.ButtonMaps ?? []) for (const b of map.Buttons ?? []) out.add(`${String(map.ButtonMapIdentifier)} ${JSON.stringify(b)}`);
  return out;
}

/** The buttons only one side holds, each said by its owner's name and the one field the four differ in. */
function onlyIn(docs: harmonyTouch.SyncDocuments, other: harmonyTouch.SyncDocuments): string[] {
  const theirs = buttons(other);
  const names = new Map<string, string>();
  const read = harmonyTouch.readConfiguration(docs);
  for (const d of read.devices) names.set(harmonyTouch.mapIdentifier('device', d.id), d.name ?? '?');
  for (const a of read.activities) names.set(harmonyTouch.mapIdentifier('activity', a.id), a.name ?? '?');
  const out: string[] = [];
  for (const map of docs.MapList!.ButtonMaps ?? []) {
    for (const b of (map.Buttons ?? []) as Json[]) {
      if (theirs.has(`${String(map.ButtonMapIdentifier)} ${JSON.stringify(b)}`)) continue;
      const what = b.ButtonKey !== undefined ? `key ${b.ButtonKey}` : `entry ${b.TextOnRemote}`;
      out.push(`${names.get(String(map.ButtonMapIdentifier))}: ${what}, group ${b.FunctionGroupType}${b.MenuItem === undefined ? '' : `, place ${b.MenuItem.IndexInMenu}`}`);
    }
  }
  return out;
}

test('the six built from the document of version 2 differ from the earlier form\'s only where the nine setup differences reach them, 5 control ports and 4 buttons, and in the order of every map\'s buttons', () => {
  const ours = versionTwoSet(reference());
  const theirs = earlierSet();
  const comparison = compareSetup(ours, theirs, EVERY_FIELD);
  const counts = Object.fromEntries(comparison.map((c) => [c.document, c.different]));
  assert.deepEqual(counts, { ActivityList: 0, DeviceList: 5, MapList: 106, Context: 0, Settings: 0, ProtocolList: 0 }, comparisonLines(comparison).join('\n'));
  // The device list's five: the control port alone, on five devices.
  const deviceRows = comparison.find((c) => c.document === 'DeviceList')!.rows;
  assert.deepEqual(deviceRows.map((r) => [r.field, r.count]), [['DevicesWithFeatures[].Device.ControlPort', 5]]);
  const ports = (docs: harmonyTouch.SyncDocuments): [string, unknown][] =>
    (docs.DeviceList!.DevicesWithFeatures ?? []).map((d) => [String(d.Device.Name), d.Device.ControlPort]);
  assert.deepEqual(ports(theirs).filter(([, port]) => port !== 0).map(([name, port]) => [name, port]),
    [['Blu-ray', 7], ['Plex', 7], ['KPN', 7], ['Xbox', 7], ['Switch', 7]]);
  assert.deepEqual(ports(ours).map(([, port]) => port), [0, 0, 0, 0, 0, 0, 0]);
  // The maps: four buttons, each the same button on both sides but for one field, the other four setup differences.
  assert.deepEqual(onlyIn(ours, theirs), [
    'LG TV: entry -, group 0, place 5', 'Xbox: entry NumberPlus, group 2, place 9', 'Xbox: entry #, group 0, place 16', 'Play a Game: key Exit, group 0',
  ]);
  assert.deepEqual(onlyIn(theirs, ours), [
    'LG TV: entry -, group 0, place 11', 'Xbox: entry ., group 2, place 9', 'Xbox: entry #, group 0, place 11', 'Play a Game: key Exit, group 2',
  ]);
  // Each of the four counted once on each side in every field the comparison reads, and the order of 12 maps' buttons.
  const mapRows = comparison.find((c) => c.document === 'MapList')!.rows;
  const order = mapRows.filter((r) => r.field.endsWith('(order)'));
  assert.deepEqual(order.map((r) => [r.field, r.count]), [['ButtonMaps[].Buttons (order)', 12]]);
  assert.equal((ours.MapList!.ButtonMaps ?? []).length, 12);
  const moved = mapRows.filter((r) => !r.field.endsWith('(order)'));
  assert.ok(moved.every((r) => r.why === 'unexplained, added' || r.why === 'unexplained, left out'), 'the four buttons are each one left out and one added');
  assert.equal(moved.reduce((n, r) => n + r.count, 0), 106 - 12);
  // The fields of a button the comparison reads, each on both sides of the four, but the three a key has no value in:
  // a key has no label and no place, and the place and label are the key of an entry, which the four are told by.
  const perField = new Map<string, number>();
  for (const r of moved) perField.set(r.field, (perField.get(r.field) ?? 0) + r.count);
  assert.deepEqual(perField.get('ButtonMaps[].Buttons[].ButtonAction.CommandName'), 8);
  assert.deepEqual(perField.get('ButtonMaps[].Buttons[].MenuItem.IndexInMenu'), 6);
  assert.deepEqual(perField.get('ButtonMaps[].Buttons[].ButtonKey'), 2);
});

test('the set built from the document of version 2 passes the Harmony Touch\'s own checks before a sync', () => {
  assert.deepEqual(harmonyTouch.refusalsBeforeASync(versionTwoSet(reference())), []);
  // The control: the same set with John Doe's household address left empty, as the reference's account has it, is
  // refused by the check, so it reads what it is given.
  const built = buildFromRecipe(reference(), { builtAt: BUILT_AT, account: JOHN_DOE as never });
  assert.ok(built.kind === 'documents' && harmonyTouch.refusalsBeforeASync(built.documents).length > 0);
});

test('the control: the document with the KPN\'s own delay between keys taken out differs from the earlier form\'s set in exactly one field more', () => {
  const json = reference();
  const kpn = json.devices.find((d: Json) => d.name === 'KPN');
  assert.deepEqual(kpn.timing, { interKeyDelay: 400 });
  delete kpn.timing;
  const comparison = compareSetup(versionTwoSet(json), earlierSet(), EVERY_FIELD);
  const rows = comparison.find((c) => c.document === 'DeviceList')!.rows.map((r) => [r.field, r.count]);
  assert.deepEqual(rows, [['DevicesWithFeatures[].Device.ControlPort', 5], ['DevicesWithFeatures[].Device.InterKeyDelay', 1]]);
  assert.equal(comparison.find((c) => c.document === 'MapList')!.different, 106);
});
