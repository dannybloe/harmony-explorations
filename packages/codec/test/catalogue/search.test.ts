/**
 * Finding a device: how well a candidate fits what was typed, one search over several sources, the fetch, and the
 * infrared archive on disk as a source, requirements R9, R10 and R82.
 *
 * **What is claimed.**
 *
 * * **The fit** ranks the way a person expects: the same model number whatever its dashes, spaces and capitals is a
 *   whole fit; a number still being typed fits better than a fragment from its middle, and both better than a typing
 *   error; and text that is some other model falls below the least fit and is no result.
 * * **The search** asks every source, gives one list best first with a stated order among equals, cuts it to the
 *   limit, and names a source that failed beside the others' results rather than failing itself. The sources here are
 *   made up, so this half needs no lab.
 * * **The archive on disk** finds a television by its manufacturer and model, typed exactly and with a typing error
 *   in each, states the kind of device, holds a kind that was asked for, and refuses a query naming no manufacturer.
 *   What it fetches is a device a document carries: added to a fresh document through the toolkit, the document
 *   checks clean, with no note about a missing definition.
 *
 * **Over what.** The archive half reads the lab's sample of the archive, decision 42, which holds five
 * manufacturers' indexes whole; the counts below are that sample's and move only when it is taken again.
 *
 * **What is not claimed.** That the ranking is the best one: it is three rules chosen here, and no person's searches
 * were measured. Nor anything about the network's source or Logitech's service, which are not built.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { IR_ARCHIVE_SAMPLE, skipWithoutIrArchiveSample } from '@harmony/lab';
import { ArchiveError, fetchDevice, findDevices, readRecipe, recipe, type DeviceSource, type FoundDevice } from '../../src/index.ts';
import { archiveSourceAt } from '../../src/node.ts';
import { LEAST_MATCH, matchOf } from '../../src/catalogue/search.ts';

test('the fit: punctuation and case say nothing, a start beats a middle beats a typing error, and another model is no result', () => {
  assert.equal(matchOf('KDL-32W705B', 'KDL-32W705B'), 1);
  assert.equal(matchOf('kdl 32w705b', 'KDL-32W705B'), 1);
  assert.equal(matchOf('  KDL32W705B ', 'KDL-32W705B'), 1);
  const start = matchOf('KDL-32W', 'KDL-32W705B');
  const middle = matchOf('32W705', 'KDL-32W705B');
  const typo = matchOf('KDL-32W750B', 'KDL-32W705B');
  // Two neighbours swapped is one edit of ten letters; two digits wrong is two, and ranks under it.
  assert.equal(typo, 0.9);
  assert.equal(matchOf('KDL-32W799B', 'KDL-32W705B'), 0.8);
  assert.ok(start < 1 && start > middle && middle >= LEAST_MATCH, `${start} ${middle}`);
  // More typed of the same start fits better, so a list narrows as a person types.
  assert.ok(matchOf('KDL-32W705', 'KDL-32W705B') > start);
  // Another model of the same series is under the least fit, and nothing typed fits nothing.
  assert.ok(matchOf('AVR-1912', 'KDL-32W705B') < LEAST_MATCH);
  assert.deepEqual([matchOf('', 'KDL-32W705B'), matchOf('---', 'KDL-32W705B'), matchOf('KDL', '')], [0, 0, 0]);
});

/** A made up source that answers with what it was given, or throws. */
function source(name: string, found: readonly Omit<FoundDevice, 'source'>[] | Error): DeviceSource {
  return {
    name,
    async find() {
      if (found instanceof Error) throw found;
      return found.map((one) => ({ source: name, ...one }));
    },
    async fetch(one) {
      return { source: name, entry: one.entry, definition: { record: { codeset: 'c' }, commands: [] }, protocols: [] };
    },
  };
}

test('one search asks every source: one list best first with a stated order among equals, cut to the limit, and a source that failed named beside the rest', async () => {
  const first = source('archive', [
    { entry: 'Sony/B', manufacturer: 'Sony', model: 'B', match: 0.9 },
    { entry: 'Sony/A', manufacturer: 'Sony', model: 'A', match: 1 },
  ]);
  const second = source('library', [
    { entry: 'mine/1', manufacturer: 'Sony', model: 'A', match: 1 },
    { entry: 'mine/2', manufacturer: 'Denon', model: 'Z', match: 0.9 },
  ]);
  const away = source('logitech', new Error('the service did not answer'));
  const all = await findDevices([first, second, away], { manufacturer: 'Sony' });
  // Best first; among equals by manufacturer, model and then source, so the order is the same on every run.
  assert.deepEqual(all.found.map((one) => `${one.source} ${one.entry} ${one.match}`), [
    'archive Sony/A 1', 'library mine/1 1', 'library mine/2 0.9', 'archive Sony/B 0.9',
  ]);
  assert.deepEqual(all.failed, [{ source: 'logitech', message: 'the service did not answer' }]);
  assert.deepEqual((await findDevices([first, second, away], { manufacturer: 'Sony', limit: 2 })).found.map((one) => one.entry), ['Sony/A', 'mine/1']);
  // The control: with the failing source left out nothing is reported as failed, and no source at all is no result.
  assert.deepEqual((await findDevices([first, second], { manufacturer: 'Sony' })).failed, []);
  assert.deepEqual(await findDevices([], { manufacturer: 'Sony' }), { found: [], failed: [] });
});

test('a result is fetched from the source that found it, and refused where that source was not handed in', async () => {
  const archive = source('archive', []);
  const library = source('library', []);
  const found: FoundDevice = { source: 'library', entry: 'mine/1', manufacturer: 'Sony', model: 'A', match: 1 };
  assert.deepEqual([(await fetchDevice([archive, library], found)).source, (await fetchDevice([archive, library], found)).entry], ['library', 'mine/1']);
  await assert.rejects(() => fetchDevice([archive], found), (error: unknown) =>
    error instanceof ArchiveError && error.message === 'mine/1 was found by library, which is not among the sources given');
});

test('the archive on disk finds a Sony television typed exactly and with a typing error in each field, states its kind, and holds a kind asked for',
  skipWithoutIrArchiveSample(), async () => {
    const archive = archiveSourceAt(IR_ARCHIVE_SAMPLE!);
    const exact = await archive.find({ manufacturer: 'Sony', model: 'KDL-32W705B' });
    assert.deepEqual(exact[0], {
      source: 'archive', entry: 'Sony/KDL-32W705B', manufacturer: 'Sony', model: 'KDL-32W705B', type: 'Television', match: 1,
    });
    // Best first, and nothing under the least fit.
    assert.ok(exact.every((one, at) => at === 0 || exact[at - 1]!.match >= one.match));
    assert.ok(exact.every((one) => one.match >= LEAST_MATCH));
    // A letter doubled in the manufacturer and two letters swapped in the model: the same television, first.
    const typed = await archive.find({ manufacturer: 'Sonny', model: 'kld 32w705b' });
    assert.equal(typed[0]!.entry, 'Sony/KDL-32W705B');
    // A typing error that lands as near to a neighbour is a tie, and a tie is shown as one: two digits swapped
    // is one edit from this television and one from the KDL-32W700B, and neither is put above the other by fit.
    const tied = await archive.find({ manufacturer: 'Sony', model: 'kdl 32w750b', limit: 2 });
    assert.deepEqual(tied.map((one) => [one.entry, one.match]), [['Sony/KDL-32W700B', 0.9], ['Sony/KDL-32W705B', 0.9]]);
    // Two doubts multiplied: under 1, and above every other model of the series, which the order already says.
    assert.ok(typed[0]!.match < 1 && typed[0]!.match > typed[1]!.match, `${typed[0]!.match} ${typed[1]!.match}`);
    // A kind asked for is held: as a television it is found, as a receiver it is not.
    assert.equal((await archive.find({ manufacturer: 'Sony', model: 'KDL-32W705B', type: 'Television', limit: 1 }))[0]!.entry, 'Sony/KDL-32W705B');
    assert.ok(!(await archive.find({ manufacturer: 'Sony', model: 'KDL-32W705B', type: 'StereoReceiver' })).some((one) => one.entry === 'Sony/KDL-32W705B'));
    // The limit is the number of results, and a manufacturer nothing fits gives none.
    assert.equal((await archive.find({ manufacturer: 'Sony', model: 'KDL', limit: 3 })).length, 3);
    assert.deepEqual(await archive.find({ manufacturer: 'Zzyzzxqq', model: 'KDL-32W705B' }), []);
  });

test('the archive on disk refuses a query naming no manufacturer, which a search reports for that source and goes on',
  skipWithoutIrArchiveSample(), async () => {
    const archive = archiveSourceAt(IR_ARCHIVE_SAMPLE!);
    await assert.rejects(() => archive.find({ model: 'KDL-32W705B' }), /searched by manufacturer first, and the query names none/);
    const other = source('library', [{ entry: 'mine/1', manufacturer: 'Sony', model: 'KDL-32W705B', match: 1 }]);
    const all = await findDevices([archive, other], { model: 'KDL-32W705B' });
    assert.deepEqual(all.found.map((one) => one.entry), ['mine/1']);
    assert.deepEqual(all.failed, [{ source: 'archive', message: 'the archive is searched by manufacturer first, and the query names none' }]);
  });

test('what the archive fetches is a device a document carries: added to a fresh document it checks clean, and reads back as a recipe',
  skipWithoutIrArchiveSample(), async () => {
    const sources = [archiveSourceAt(IR_ARCHIVE_SAMPLE!)];
    const { found } = await findDevices(sources, { manufacturer: 'Sony', model: 'KDL-32W705B', limit: 1 });
    const fetched = await fetchDevice(sources, found[0]!);
    assert.deepEqual([fetched.source, fetched.entry], ['archive', 'Sony/KDL-32W705B']);
    assert.equal(typeof fetched.definition.record['codeset'], 'string');
    // Counts of the sample's copy of this device, never the record itself: a codeset is large.
    assert.deepEqual([fetched.definition.commands.length, fetched.protocols.map((one) => one['name'])], [73, ['Sony 12 Bit', 'Sony 15 Bit']]);
    assert.ok(fetched.definition.commands.every((one) => typeof one.name === 'string' && typeof one.keycode === 'string'));
    const added = recipe.addDevice(recipe.create({ name: 'Harmony One', skin: 54 }), { name: 'Television', device: fetched }).document;
    // No problem at all: in particular no note that the device carries no definition, which is the control, since
    // the same device named without one does get that note.
    assert.deepEqual(recipe.check(added), []);
    const bare = recipe.open({ model: { name: 'Harmony One', skin: 54 }, devices: [{ name: 'Television', device: 'Sony/KDL-32W705B' }], activities: [] });
    assert.deepEqual(recipe.check(bare).map((one) => one.code), ['no-definition']);
    assert.deepEqual(readRecipe(JSON.parse(JSON.stringify(added))), added);
    // A version asked of a source that offers none is refused by name.
    await assert.rejects(() => fetchDevice(sources, found[0]!, { version: '2' }), /the archive offers no versions of Sony\/KDL-32W705B/);
  });
