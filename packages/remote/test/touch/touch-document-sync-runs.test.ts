/**
 * A recipe document synced to the bench Harmony Touch through `syncDocument`, the function an application calls, as it
 * ran: the test setup's recipe checked, built into six documents and two pictures at the account's addresses, made into
 * a set, delivered in an answered sync and committed, with every phase reported as an event.
 *
 * **The question.** The set built from nothing had already been delivered and run on this unit by the bench's own script,
 * `touch-nothing-set.ts` building it and `touch-sync.ts --set` answering, `packages/bench/test/harmony-touch/touch-from-nothing-runs.test.ts`.
 * What an application calls is another route: `syncDocument` on `@freeharmony-sdk/remote/write`, which for a Touch is
 * `syncAttachedTouch` in `packages/remote/src/sync.ts`, building with `buildFromRecipe` and `touchSetOf` and handing the
 * set to the same `answerTouchSync`. Does that route, given the recipe the set was built from, send the remote what the
 * script's route sent, and does the remote commit it?
 *
 * **The instrument.** `packages/remote/bin/touch-sync.ts --document <lab copy of packages/remote/setups/touch-test.json>
 * --account <the lab's account description>`, first without `--commit` and then with it, with `getconfighash` read
 * through the request rail before and after. The run's folder keeps every request and answer; the set the build made is
 * kept beside the document before anything is opened, and each run's journal beside it. Nobody was at the bench, by a person's word.
 *
 * **Predicted**, from the set the remote held and the rehearsal on the fake remote, `touch-nothing-run.test.ts`: the
 * build is the from-nothing set; the six documents go 200 under its tags since the remote held the put back's; the
 * favourites 304 with tags of ours; the remote commits, and the hash turns to the set's four tags.
 *
 * **What it measured, each against something independent of it.**
 *
 * 1. **The document and the set.** The lab's document is the repository's recipe byte for byte, and the set the run kept
 *    is the from-nothing set byte for byte, six documents and two pictures, every tag ours. **Built again here from the
 *    document**, a setup file of the earlier form, through that form's own route, `earlierTouchSetupFile`, and
 *    `touchSetOf` at the account's addresses with the lab's fixed sample of the infrared archive (decision 42: no test
 *    reads the checkout), it gives that set answer for answer and tag for tag. The tags are digests of each answer's
 *    content, `ourTag`, so equal tags are equal documents. **The one build an application calls refuses that document**,
 *    as the earlier form, naming the converter, decision 43: an application syncs a document of version 2.
 * 2. **The phases.** The commit's journal reports `identify`, `check`, `build`, `hand-over` and `write`, in that order,
 *    and ends `written, the remote new-configuration`; the dry run's reports the first three and ends as a dry run. The
 *    two attention events a screen gets, not to unplug and safe to unplug, go to the script's terminal and never to the
 *    journal, so no file holds them.
 * 3. **The run.** `finished`, the remote acted on, eight request lists, 20 answers, nothing handed up. The six went 200 with
 *    the set's content and tags in one write of 381470 characters, 13 chunks at the session's chunk size; the three favourites 304 with a tag of ours;
 *    **our background and its twin 304**, asked for with the set's own tags; the eight logos 304; the finish 200: 7
 *    answers 200 and 13 answered 304.
 * 4. **The run sent what the script's forward run of the from-nothing set sent**, answer for answer, but for those two
 *    pictures, which that run delivered 200 because the remote then asked for them without a tag. The request lists
 *    are that run's, entry for entry, but for the picture list, which differs in those two tags alone. Between the two,
 *    the put back and the closing run each asked for ten pictures and for neither of ours, so **the remote kept our
 *    two pictures across two committed sets that did not name them**, and asked for them by the tags we gave them once a
 *    set named them again. The prediction above said nothing about the pictures; the rehearsal's control, written for
 *    another purpose, gives this answer for a remote that holds them.
 * 5. **The configuration hash**, read twice before the run and once after: the four tags of the remote's own documents, which every put back of them shares, both times before,
 *    and the set's after, joined in the remote's order.
 *
 * **The control**: the run's kept write checked against the put back's six fails, and holds against the set; the hash
 * after differs from the hash before; no other order of the four tags gives the hash after; and a document with the
 * screen's brightness lowered builds a set that differs from the kept one in exactly the settings document's tag.
 *
 * **Made before the power source check existed**, so neither journal holds a power source line; the read of the power
 * source on this unit is `packages/usb/test/touch/touch-power-read.test.ts`.
 *
 * **What it does not settle.** **The infrared half was not run**: nothing was heard on the monitor during or after this
 * run, so that the remote plays this set is the from-nothing runs' measurement on a set equal to this one, not this run's.
 * The screens were not looked at. Which screen the remote showed before the run is not known; it was on Off by the
 * memory of the last key pressed, not by a look.
 *
 * **What would have falsified it**: a kept set other than the from-nothing set, or a build here that differs from the
 * kept set; a phase missing, out of order or extra; a 304 for any of the six or a 200 for a favourites document; a
 * picture answered with content where its tag was asked; a hash after the run other than the set's four tags.
 *
 * **Sources checked first**: `docs/test-notes/harmony-touch.md`, `syncAttachedTouch` and `syncDocument` in
 * `packages/remote/src/sync.ts` for what the journal records and what goes only to events, `touch-sync.ts` for what is
 * kept where, `touch-from-nothing-runs.test.ts` and `touch-settings-runs.test.ts`, whose shape this follows,
 * `touch-nothing-set.test.ts` for building with the archive's sample, and `touch-nothing-run.test.ts`. Logitech's client
 * was not consulted: the answers are ours. **Which architectures**: the Harmony Touch on firmware 4.15.330, one unit, one
 * committed run; its firmware reports 17 and Logitech's templates file it under 18.
 *
 * The reads, the sets and the account description hold tags, the account's numbers and the household's address: this
 * file asserts equalities, counts and shapes and prints none of them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

// The Node entry, for the fonts, the icons, the deflate and the SHA-256 the core asks its loader for, and the archive's reader.
import { archiveAt, buildFromRecipe, RecipeError } from '@freeharmony-sdk/config/node';
import { harmonyTouch } from '@freeharmony-sdk/config/build';
import { earlierTouchSetupFile } from '@freeharmony-sdk/config/internal';
import * as lab from '@freeharmony-sdk/lab';
import {
  CONFIGHASH, FINISHED, OURS, WRITE, hasTag, kind, list, reply, resource, written,
  type Request_,
} from '@freeharmony-sdk/testkit/touch-recording';

import type { SyncPhase } from '../../src/sync.ts';
import { touchSetOf, type TouchSet } from '../../src/touchsync.ts';

/** The recipe the lab's document is a copy of. */
const RECIPE = new URL('../../setups/touch-test.json', import.meta.url);

const DOCUMENT = 'touch_document_sync_document';
const KEPT = 'touch_document_sync_set';
const DRY_JOURNAL = 'touch_document_sync_dry_run_journal';
const JOURNAL = 'touch_document_sync_journal';
const RUN = 'touch_document_sync_';
/** The from-nothing set, its put back, which the remote held before this run, and the account it was built for. */
const NOTHING = 'touch_nothing_set';
const BACK = 'touch_nothing_set_back';
const ACCOUNT = 'touch_nothing_account';
/** The script's forward run of the from-nothing set, its put back and the closing run after it. */
const SCRIPT_RUN = 'touch_nothing_sync_1_';
const SCRIPT_BACK = 'touch_nothing_sync_2_';
const SCRIPT_CLOSING = 'touch_nothing_unchanged_';

const text = (fixture: string): string => new TextDecoder().decode(lab.require_(fixture));

/** One answer of a set as the lab keeps it. */
interface SetAnswer { uri: string; 'body-type': string; resource: unknown; etag: string }
const setOf = (fixture: string): SetAnswer[] => (JSON.parse(text(fixture)) as { answers: SetAnswer[] }).answers;
const isDocument = (a: { uri: string }): boolean => a.uri.startsWith('harmony://');
const byName = (set: readonly SetAnswer[], name: string): SetAnswer => set.find((a) => isDocument(a) && resource(a.uri) === name)!;

const SIX = ['ActivityList', 'DeviceList', 'MapList', 'Context', 'Settings', 'ProtocolList'];

/** The four documents whose tags `getconfighash` joins, in its order, `touch-confighash.test.ts`. */
const HASHED = ['ActivityList', 'DeviceList', 'ProtocolList', 'Context'];
const join = (set: readonly SetAnswer[], order: readonly string[]): string => `result=${order.map((d) => byName(set, d).etag).join('')}`;
const hashRead = (fixture: string): unknown => {
  const q = reply(fixture);
  assert.deepEqual([q.errorCode, q.mime], ['200', CONFIGHASH], fixture);
  return q.result;
};

/** 31000 characters a chunk, as `touch-changed-set-sync.test.ts` derives it from the session's shapes. */
const CHUNK = 31000;
const chunks = (length: number): number => Math.ceil(length / CHUNK);

/** The eight request lists every committed run since the activity set has handed out, and which of them were answered. */
const EIGHT = [
  Array(6).fill('document'), [], ['user favourites'], ['device favourites'], ['line up'], [], Array(10).fill('picture'), ['finished'],
];
const EIGHT_ANSWERED = [1, 3, 4, 5, 7, 8] as const;
const runFiles = (prefix: string): string[] => [
  `${prefix}outcome`, `${prefix}handover_list`, `${prefix}handover_answers`,
  ...EIGHT.map((_, i) => `${prefix}list_${i + 1}`), ...EIGHT_ANSWERED.map((n) => `${prefix}answers_${n}`),
];

/**
 * Every answer of one write against its request: an address the set holds 200 with the set's type, tag and content,
 * unless the request carries the set's own tag, which is 304 echoing it like every other tagged request; an untagged
 * favourites request 304 with a tag of ours; the finish 200. The from-nothing runs' rule, written again here since a
 * test file cannot import another. Compared as booleans, so a failure prints no value out of a document.
 */
function checkAnswers(asked: Request_[], ours: ReturnType<typeof written>, label: string, set: readonly SetAnswer[]): void {
  const byUri = new Map(set.map((a) => [a.uri, a]));
  assert.ok(isDeepStrictEqual(ours.map((a) => a.uri), asked.map((r) => r.uri)), `${label}: the same addresses in the same order`);
  for (const [i, a] of ours.entries()) {
    const r = asked[i]!;
    const k = kind(r.uri);
    const s = byUri.get(r.uri) ?? (isDocument(r) ? set.find((x) => isDocument(x) && resource(x.uri) === resource(r.uri)) : undefined);
    if (k === 'finished') {
      assert.deepEqual([a.statusCode, 'etag' in a], ['200', false], label);
    } else if (s !== undefined && !(hasTag(r) && r.etag === s.etag)) {
      assert.ok(a.statusCode === '200' && a['body-type'] === s['body-type'] && a.etag === s.etag && isDeepStrictEqual(a.resource, s.resource),
        `${label}: ${k} answered 200 with the set's content and tag`);
    } else if (hasTag(r)) {
      assert.ok(a.statusCode === '304' && a.etag === r.etag && !('resource' in a), `${label}: ${k} answered 304 echoing its tag`);
    } else {
      assert.deepEqual([k.endsWith('favourites') || k === 'line up', a.statusCode, 'resource' in a], [true, '304', false], `${label}: an untagged favourites request kept`);
      assert.ok(OURS.test(a.etag ?? ''), `${label}: a tag of ours`);
    }
  }
}

// ---- the document and the set ----

test('the lab\'s document is the repository\'s recipe byte for byte, and the set the run kept is the from-nothing set byte for byte, six documents and two pictures under tags of ours',
  lab.skipUnless(DOCUMENT, KEPT, NOTHING), () => {
    assert.ok(Buffer.from(lab.require_(DOCUMENT)).equals(readFileSync(RECIPE)), 'the document is packages/remote/setups/touch-test.json');
    assert.ok(Buffer.from(lab.require_(KEPT)).equals(Buffer.from(lab.require_(NOTHING))), 'the kept set is the from-nothing set');
    const kept = setOf(KEPT);
    assert.deepEqual(kept.map((a) => (isDocument(a) ? resource(a.uri) : kind(a.uri))), [...SIX, 'picture', 'picture']);
    assert.equal(kept.filter((a) => OURS.test(a.etag)).length, 8, 'every tag ours');
  });

/** The account the build is handed, out of the lab's description: its identifiers and the documents' addresses. */
const accountOf = (): { readonly addresses: Readonly<Record<string, string>> } & Record<string, unknown> =>
  (JSON.parse(text(ACCOUNT)) as { account: { addresses: Record<string, string> } & Record<string, unknown> }).account;

/**
 * The set the run sent, rebuilt from its document with the lab's sample of the archive. **The document is a setup file
 * of the earlier form**, with a block of the Touch's own, which the one build an application calls refuses, naming the
 * converter, decision 43; so the set is built here by that form's reader and builder, `earlierTouchSetupFile` on
 * `@freeharmony-sdk/config/internal`,
 * and the pictures every set of ours carries, `HARMONY_TOUCH_FAMILY.buildPictures`, into the same shape the one build
 * gave, so the closure below holds what was sent byte for byte.
 */
function builtSet(json: unknown): TouchSet {
  const account = accountOf();
  const archive = archiveAt(lab.IR_ARCHIVE_SAMPLE!);
  const file = earlierTouchSetupFile.readEarlierTouchSetupFile(json);
  const built = {
    kind: 'documents' as const, model: file.model.name, skin: file.model.skin ?? 99,
    documents: earlierTouchSetupFile.buildEarlierTouchDocuments(file, { archive, account: account as never }),
    pictures: harmonyTouch.HARMONY_TOUCH_FAMILY.buildPictures(file),
    leftOut: [],
  };
  const made = touchSetOf(built, account.addresses);
  assert.ok(!('refusals' in made), 'the gate passes the set');
  return (made as { set: TouchSet }).set;
}

const BUILDS = lab.needing(lab.skipWithoutIrArchiveSample(), lab.skipUnless(DOCUMENT, KEPT, ACCOUNT));

test('the closure: the lab\'s document built again by the route the one build took for it then, the earlier form\'s, and touchSetOf at the account\'s addresses gives the kept set, answer for answer and tag for tag',
  BUILDS, () => {
    const ours = builtSet(JSON.parse(text(DOCUMENT)));
    const kept = setOf(KEPT);
    assert.equal(ours.answers.length, kept.length);
    assert.deepEqual(ours.answers.map((a, i) => a.uri === kept[i]!.uri), Array(8).fill(true), 'the same addresses in the same order');
    assert.deepEqual(ours.answers.map((a, i) => a.etag === kept[i]!.etag), Array(8).fill(true), 'the same tags');
    assert.ok(isDeepStrictEqual(JSON.parse(JSON.stringify(ours.answers)), kept), 'the same answers, content and all');
  });

test('the one build an application calls refuses the run\'s document, as the earlier form, naming the converter', BUILDS, () => {
  assert.throws(() => buildFromRecipe(JSON.parse(text(DOCUMENT)), { builtAt: '2026-11-14T20:52:00', account: accountOf() as never, archive: archiveAt(lab.IR_ARCHIVE_SAMPLE!) }),
    (error: unknown) => error instanceof RecipeError && /a Harmony Touch's own block, touch, the earlier form/.test(error.message) && /describeTouchDocument/.test(error.message));
});

test('the control: the document with the screen\'s brightness lowered builds a set that differs from the kept one in exactly the settings document\'s tag',
  BUILDS, () => {
    const json = JSON.parse(text(DOCUMENT)) as { touch: { settings: Record<string, string> } };
    assert.equal(json.touch.settings['ScreenBrightness'], '100');
    json.touch.settings['ScreenBrightness'] = '90';
    const ours = builtSet(json);
    const kept = setOf(KEPT);
    const moved = ours.answers.filter((a, i) => a.etag !== kept[i]!.etag).map((a) => (isDocument(a) ? resource(a.uri) : kind(a.uri)));
    assert.deepEqual(moved, ['Settings']);
  });

// ---- the phases ----

/** Every phase a sync can report, held to the library's type; the journal names a phase as `sync: <phase>` and nothing else so. */
const PHASES: readonly SyncPhase[] = ['identify', 'check', 'build', 'backup', 'hand-over', 'write', 'verify', 'restart'];
const journalLines = (fixture: string): string[] => text(fixture).split('\n').filter((l) => l !== '' && !l.startsWith('#'));
const phasesOf = (fixture: string): string[] =>
  journalLines(fixture).filter((l) => PHASES.some((p) => l === `sync: ${p}`)).map((l) => l.slice('sync: '.length));

test('the commit\'s journal reports identify, check, build, hand-over and write in that order and ends written; the dry run\'s the first three and ends as a dry run',
  lab.skipUnless(JOURNAL, DRY_JOURNAL), () => {
    assert.deepEqual(phasesOf(JOURNAL), ['identify', 'check', 'build', 'hand-over', 'write']);
    assert.equal(journalLines(JOURNAL).at(-1), 'sync: written, the remote new-configuration');
    assert.equal(journalLines(JOURNAL).filter((l) => l.startsWith('kept the set built, 8 answers')).length, 1, 'the set kept before the remote was opened');
    // The control: the dry run reached no phase that acts on the remote, and kept nothing.
    assert.deepEqual(phasesOf(DRY_JOURNAL), ['identify', 'check', 'build']);
    assert.match(journalLines(DRY_JOURNAL).at(-1)!, /^sync: dry-run, the remote as-before: .* 6 documents and 2 pictures$/);
    assert.equal(journalLines(DRY_JOURNAL).filter((l) => l.startsWith('kept the set built')).length, 0);
    for (const j of [JOURNAL, DRY_JOURNAL]) {
      assert.equal(journalLines(j).filter((l) => l === 'sync: built 6 documents and 2 pictures, a set of 8 answers the gate passes').length, 1, j);
      // Made before the power source check existed.
      assert.equal(journalLines(j).filter((l) => l.startsWith('sync: power source')).length, 0, j);
    }
  });

test('the journal\'s account of each request list is the run\'s folder\'s: one answered in the hand over, then 6, none, 1, 1, 1, none, 10 and 1',
  lab.skipUnless(JOURNAL, `${RUN}handover_list`, ...EIGHT.map((_, i) => `${RUN}list_${i + 1}`)), () => {
    const said = journalLines(JOURNAL).filter((l) => l.startsWith('sync: request list ') || l.startsWith('sync: hand over, request list '));
    const listed = [list(`${RUN}handover_list`), ...EIGHT.map((_, i) => list(`${RUN}list_${i + 1}`))].map((l) => l.length);
    assert.deepEqual(listed, [1, 6, 0, 1, 1, 1, 0, 10, 1]);
    assert.deepEqual(said, [
      'sync: hand over, request list 1, 1 answered',
      ...listed.slice(1).map((n, i) => `sync: request list ${i + 1}, ${n === 0 ? 'empty' : `${n} answered`}`),
    ]);
  });

// ---- the run ----

test('the run: finished and acted on, nothing handed up, the six 200 with the set\'s content and tags, our two pictures and every other request 304, the finish, over eight request lists',
  lab.skipUnless(KEPT, ...runFiles(RUN)), () => {
    const outcome = JSON.parse(text(`${RUN}outcome`)) as { ending: string; acted: boolean; lists: number; answered: number; handedUp: unknown[] };
    assert.deepEqual([outcome.ending, outcome.acted, outcome.lists, outcome.answered, outcome.handedUp.length], ['finished', true, 8, 20, 0]);
    assert.deepEqual(list(`${RUN}handover_list`).map((r) => [r.verb, r.uri, 'etag' in r]), [['POST', FINISHED, false]], 'the hand over, nothing handed up');
    assert.deepEqual(written(`${RUN}handover_answers`).map((a) => [a.statusCode, a.uri, 'etag' in a]), [['200', FINISHED, false]], 'the hand over answered');
    assert.deepEqual(EIGHT.map((_, i) => list(`${RUN}list_${i + 1}`).map((r) => kind(r.uri))), EIGHT, 'the lists');
    const kept = setOf(KEPT);
    for (const n of EIGHT_ANSWERED) checkAnswers(list(`${RUN}list_${n}`), written(`${RUN}answers_${n}`), `list ${n}`, kept);
    const all = EIGHT_ANSWERED.flatMap((n) => written(`${RUN}answers_${n}`));
    assert.deepEqual(['200', '304'].map((s) => all.filter((a) => a.statusCode === s).length), [7, 13], 'the statuses');
    assert.deepEqual(all.filter((a) => a.statusCode === '200' && isDocument(a)).map((a) => resource(a.uri)), SIX, 'the 200s: the six and the finish');
    // Our two pictures, asked for with the set's own tags and so answered 304, the logos with theirs.
    const pictures = list(`${RUN}list_7`);
    assert.deepEqual(pictures.map((r) => {
      const s = kept.find((a) => a.uri === r.uri);
      return [s !== undefined, hasTag(r), s !== undefined && r.etag === s.etag];
    }), [[true, true, true], [true, true, true], ...Array(8).fill([false, true, false])]);
  });

test('the six went in one write of 381470 characters, 13 chunks, the picture list\'s answers in one of 2308, each replied 200 as a write, and no other write holds any of the six',
  lab.skipUnless(...EIGHT_ANSWERED.map((n) => `${RUN}answers_${n}`), `${RUN}reply_1`, `${RUN}reply_7`), () => {
    const lengths = EIGHT_ANSWERED.map((n) => text(`${RUN}answers_${n}`).length);
    assert.deepEqual([lengths[0], lengths[4]], [381470, 2308]);
    assert.deepEqual(lengths.map(chunks), [13, 1, 1, 1, 1, 1]);
    for (const r of ['reply_1', 'reply_7']) {
      const q = reply(`${RUN}${r}`);
      assert.deepEqual([q.errorCode, q.mime], ['200', WRITE], r);
    }
    assert.deepEqual(EIGHT_ANSWERED.map((n) => written(`${RUN}answers_${n}`).filter(isDocument).length), [6, 0, 0, 0, 0, 0]);
  });

test('the first list asked for the six with the put back\'s tags, and the three favourites untagged',
  lab.skipUnless(KEPT, BACK, `${RUN}list_1`, ...[3, 4, 5].map((n) => `${RUN}list_${n}`)), () => {
    const back = setOf(BACK);
    const kept = setOf(KEPT);
    const asked = list(`${RUN}list_1`);
    assert.deepEqual(asked.map((q) => resource(q.uri)), SIX);
    assert.deepEqual(asked.map((q) => [q.etag === byName(back, resource(q.uri)).etag, q.etag === byName(kept, resource(q.uri)).etag]), Array(6).fill([true, false]));
    assert.deepEqual([3, 4, 5].map((n) => list(`${RUN}list_${n}`).map((q) => hasTag(q))), [[false], [false], [false]]);
  });

// ---- against the script's run of the same set ----

test('the run sent what the script\'s forward run of the from-nothing set sent, answer for answer, but our two pictures, 304 here and 200 there',
  lab.skipUnless(...EIGHT_ANSWERED.flatMap((n) => [`${RUN}answers_${n}`, `${SCRIPT_RUN}answers_${n}`])), () => {
    const differing: string[] = [];
    for (const n of EIGHT_ANSWERED) {
      const here = written(`${RUN}answers_${n}`);
      const there = written(`${SCRIPT_RUN}answers_${n}`);
      assert.equal(here.length, there.length, `list ${n}`);
      here.forEach((a, i) => {
        if (!isDeepStrictEqual(a, there[i])) differing.push(`list ${n} answer ${i + 1}: ${a.statusCode} here, ${there[i]!.statusCode} there`);
      });
    }
    assert.deepEqual(differing, ['list 7 answer 1: 304 here, 200 there', 'list 7 answer 2: 304 here, 200 there']);
  });

test('the request lists are the script\'s forward run\'s, but the picture list asks for our two pictures with the set\'s tags where that run asked untagged',
  lab.skipUnless(KEPT, `${RUN}handover_list`, `${SCRIPT_RUN}handover_list`, ...EIGHT.flatMap((_, i) => [`${RUN}list_${i + 1}`, `${SCRIPT_RUN}list_${i + 1}`])), () => {
    assert.ok(isDeepStrictEqual(list(`${RUN}handover_list`), list(`${SCRIPT_RUN}handover_list`)), 'the hand over');
    const same = EIGHT.map((_, i) => isDeepStrictEqual(list(`${RUN}list_${i + 1}`), list(`${SCRIPT_RUN}list_${i + 1}`)));
    assert.deepEqual(same, [true, true, true, true, true, true, false, true]);
    const kept = setOf(KEPT);
    const here = list(`${RUN}list_7`);
    const there = list(`${SCRIPT_RUN}list_7`);
    assert.deepEqual(here.map((r, i) => [r.uri === there[i]!.uri, hasTag(r), hasTag(there[i]!), isDeepStrictEqual(r, there[i])]),
      [[true, true, false, false], [true, true, false, false], ...Array(8).fill([true, true, true, true])]);
    assert.deepEqual(here.slice(0, 2).map((r) => r.etag === kept.find((a) => a.uri === r.uri)?.etag), [true, true]);
  });

test('between the two, the put back and the closing run each finished having asked for ten pictures and neither of ours',
  lab.skipUnless(KEPT, `${SCRIPT_BACK}list_7`, `${SCRIPT_CLOSING}list_7`, `${SCRIPT_BACK}outcome`, `${SCRIPT_CLOSING}outcome`), () => {
    const ours = setOf(KEPT).filter((a) => !isDocument(a)).map((a) => a.uri);
    assert.equal(ours.length, 2);
    for (const p of [SCRIPT_BACK, SCRIPT_CLOSING]) {
      assert.equal(list(`${p}list_7`).length, 10, `${p}: ten pictures asked for`);
      assert.equal(list(`${p}list_7`).filter((r) => ours.includes(r.uri)).length, 0, p);
      assert.equal((JSON.parse(text(`${p}outcome`)) as { ending: string }).ending, 'finished', `${p}: committed`);
    }
  });

// ---- the configuration hash ----

test('the configuration hash was the four tags of the remote\'s own documents twice before the run and the set\'s after it',
  lab.skipUnless(KEPT, BACK, `${RUN}confighash_first`, `${RUN}confighash_before`, `${RUN}confighash_after`), () => {
    const expected = [BACK, BACK, KEPT].map((s) => join(setOf(s), HASHED));
    assert.notEqual(expected[0], expected[2], 'the control: the set moves the hash');
    assert.ok(isDeepStrictEqual(['first', 'before', 'after'].map((w) => hashRead(`${RUN}confighash_${w}`)), expected));
    assert.deepEqual(HASHED.filter((d) => byName(setOf(KEPT), d).etag !== byName(setOf(BACK), d).etag), HASHED, 'all four tags new');
  });

test('the control: no other order of the four tags gives the hash after the run',
  lab.skipUnless(KEPT, `${RUN}confighash_after`), () => {
    const after = hashRead(`${RUN}confighash_after`);
    const orders = (rest: readonly string[]): string[][] =>
      rest.length === 0 ? [[]] : rest.flatMap((d) => orders(rest.filter((x) => x !== d)).map((o) => [d, ...o]));
    const all = orders(HASHED);
    assert.equal(all.length, 24);
    const giving = all.filter((o) => join(setOf(KEPT), o) === after);
    assert.deepEqual(giving, [HASHED]);
  });

test('the control: the run\'s kept write checked against the put back\'s six fails, where it holds against the set',
  lab.skipUnless(KEPT, BACK, `${RUN}list_1`, `${RUN}answers_1`), () => {
    assert.throws(() => checkAnswers(list(`${RUN}list_1`), written(`${RUN}answers_1`), 'the control', setOf(BACK)), assert.AssertionError);
    checkAnswers(list(`${RUN}list_1`), written(`${RUN}answers_1`), 'the run', setOf(KEPT));
  });
