/**
 * The empty configuration on a Harmony Touch, `todo-touch.md` 9.2, as it ran: no device and no activity delivered in a
 * sync and committed, looked at by the person at the bench, and put back with the favourites documents the empty set's
 * commit was read to drop.
 *
 * **What was run.** After commit `dabf48c7`, the 9.2 preparation, in the order of the lab's
 * `work/touch-firmware/notes/9.2-preflight.md` section 8, each run read before the next, Off pressed before each sync,
 * the bench started afresh so the monitor wrote a new log:
 *
 * 1. `getconfighash` through the request rail, the remote holding `8.6-setup-back`;
 * 2. `touch-sync.ts --set 9.2-empty --commit` and `getconfighash`;
 * 3. the look, reported by the person at the bench, below; the person restarted the remote, not through our tooling;
 * 4. `getconfighash` after that restart;
 * 5. `touch-sync.ts --set 9.2-empty-back --commit` and `getconfighash`;
 * 6. one `touch-sync.ts --unchanged --commit`.
 *
 * **What it measured, each against something independent of it.**
 *
 * 1. **The two sets.** The empty set is `8.6-setup-back`'s six with ActivityList, DeviceList, MapList and ProtocolList
 *    emptied under tags of ours, Context and Settings as they were, content and tags; the put back is `8.6-setup-back`'s
 *    six exactly and eleven pieces of content beside them, the user's favourites document, the tuning device's, the line
 *    up, the uploaded logo and seven station logos, each under the tag the remote held it with. How the two are built is
 *    `packages/corpus/test/touch-empty-set.test.ts`.
 * 2. **The empty set answered the four 200 with its content and tags and Context and Settings 304, over four request
 *    lists, and the remote asked for no favourites document**: the lists were the six, an empty one, the two background
 *    pictures, answered 304 against the tags the remote sent, and the finish; nothing handed up, `finished`. The six went
 *    in one write of 1573 characters, one chunk, replied 200 as a write. **No favourites request, and two pictures
 *    asked**, is what the reading in the codec's `empty.ts` predicted: a set with no activity makes the screens ask for no
 *    favourites document, and Settings' one user background makes them ask for two pictures. 8.6's closing run, on the same
 *    remote holding the set before, had asked for three favourites documents, each in a list of its own, and ten pictures.
 * 3. **The put back answered the four 200 with the set's content and tags, Context and Settings 304, the three
 *    favourites documents 200 with the set's content and tags, each asked without a tag in a list of its own, the ten
 *    pictures 304, the finish 200**, over eight lists, nothing handed up, `finished`. Its writes: the six in 567941
 *    characters, 19 chunks, as 8.6's put back; the line up alone in 56446, two chunks, replied 200 as a write, the first
 *    write of a line up by this project; the user's and the tuning device's
 *    favourites in one chunk each. **The tuning device's favourites and the line up were delivered by this project for
 *    the first time.** The closing `--unchanged` run answered every request 304 or the finish.
 * 4. **The pictures were carried across the empty set's commit.** The put back's picture list asked for every logo with
 *    the tag the remote held it with before the empty set, and for the two backgrounds with the tags the empty set's own
 *    picture list sent, which are the tags 8.6's closing run sent; the remote sends a tag only for a file it holds
 *    (`answering-a-sync.md`), so every stored picture survived the commit, as read: the screens copy every stored picture
 *    into the new set when they ask for any. A remote that had lost them would have asked untagged, and the rehearsal's
 *    "not carried" run shows what the answers would then have been.
 * 5. **Whether the favourites documents were dropped is not measured.** The put back asked for them untagged, as every
 *    sync through a computer does whether the remote holds them or not, so the request cannot tell; the empty set's
 *    commit dropping them is the reading the put back was built on, and delivering them with 200 is what made the put
 *    back independent of it.
 * 6. **The first lists and the hash say what was committed.** The empty run asked for the six with `8.6-setup-back`'s
 *    tags; the put back asked for the four with the empty set's tags and Context and Settings with the tags all three sets
 *    carry; the closing run with `8.6-setup-back`'s six. The hash was `8.6-setup-back`'s before, the empty set's after it,
 *    still the empty set's after the person's restart, the read answering `OK`, and `8.6-setup-back`'s after the put back.
 *    So the remote started on the empty set, its configuration task alive.
 * 7. **The monitor heard no code between the empty commit and the put back.** Its log, from its start after the empty
 *    sync to 11:35 UTC, holds 86 frames, every one unreadable at the bench: none fits a code of `8.6-setup-back`'s
 *    documents or of the put back's, and none decodes to a number. 82 of them came in 22 seconds from 11:31:21, one at
 *    11:32:28 and three at 11:33:43; what made them is not recorded. The person did not report pressing Off, a volume key
 *    or a number key, which the preflight predicted would send nothing; so this shows only that nothing that was pressed
 *    sent a code.
 *
 * **Reported by the person at the bench and held by no file but one photograph**, `touch_9_2_favourites_photo`, which this
 * file names and no document embeds:
 *
 * * the favourites page showed the remote's own no favourites screen, the sentence "Please sign in to your Harmony
 *   account to add your favorite TV channels.", `NO_FAVORITES_SETUP` in the firmware's English strings: photographed;
 * * no activities page;
 * * **right after the sync, off the cable, a text was seen once and could not be brought back**; the person reported "the
 *   remote says it is empty and something like Please sign in to your Harmony account". Which string it was is not
 *   identified. The strings file holds two candidates, `NO_ACTIVITY` (the "no activity" notice, "You have not set up any
 *   Activities." and a request to sign in) and `NO_FAVORITES_SETUP`, and this does not choose between them;
 * * **the person restarted the remote**, not through our tooling; afterwards the home screen was a white, empty devices
 *   screen;
 * * the Settings menu looked normal.
 *
 * The look after the put back was not reported in detail, and nothing is claimed of it.
 *
 * **Scored against the preflight's predictions** (section 3 there): the no favourites screen **held**, photographed. The
 * device page as the home page after the restart **is consistent with** the predicted empty device page; its menu,
 * predicted to offer Settings alone, was not reported. The "no activity" notice predicted at a restart **was not
 * reported** after the person's restart. **A text was seen right after the sync instead**, where the reading had the
 * notice appear only at a start or on a `PowerOffActivity` event: that reading missed a moment, since the screens also
 * reload when the remote leaves USB power after its USB screen, which puts the notice up the moment the remote is
 * unplugged after a sync that left no activity, and its OK keeps it from showing again until a set with activities
 * arrives, `tests/test_harmony_touch_empty_screens.py`. That makes the notice a candidate for what was seen and is
 * consistent with no notice after the restart, but the text was not identified and the OK was not reported, so neither is
 * claimed. Off, the volume keys and a number key sending nothing: not reported, so not checked, the monitor above.
 *
 * **So a Touch stores, commits and starts on a configuration with no device and no activity**, its screens showing their
 * own empty pages; it then asks for no favourites document; it carries its stored pictures across that commit; and a put
 * back carrying the favourites documents with the six restored the set before, measured by the hash and by the closing
 * run's first list. What this does not show: what the empty device page and its menu looked like beyond "white, empty",
 * which text was seen after the sync, whether the favourites documents were dropped, the keys on the empty set, and the
 * look after the put back.
 *
 * **The control** answers every list of the empty run by the put back's set instead: its four would then have been
 * answered 200 with the put back's content, not the empty set's, so the check of each answer against its set fails, and
 * the hash after the empty run differs from the put back's. And "no favourites request" is held against 8.6's closing run,
 * which asked for three on the same remote.
 *
 * **What would have falsified it**: a favourites request in the empty run, or a logo asked for; a 200 for Context or
 * Settings or a 304 for any of the four; a hash after the empty run other than its tags, or no answer to the hash after
 * the restart; a put back asking for any picture without a tag, or for the four with any tag but the empty set's; a code
 * of either set heard between the commit and the put back.
 *
 * **Sources checked first**: the lab's `9.2-preflight.md` and `9.2-land-brief.md`, `touch-setup-runs.test.ts`, whose shape
 * this follows, `syncTouch` in `packages/corpus/src/touchsync.ts` for what a run's folder keeps, the codec's `empty.ts`,
 * and the image's screens for the strings and the reload, `tests/test_harmony_touch_empty_screens.py`. Logitech's client
 * was not consulted: the remote runs its own engine and screens and the answers are ours. **Which architectures**: the
 * Harmony Touch on firmware 4.15.330, one unit, one committed run of each set; its firmware reports 17 and Logitech's
 * templates file it under 18.
 *
 * The reads and the sets hold tags, the account's numbers and the household's address: this file asserts equalities,
 * counts and shapes and prints none of them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';

import { harmonyTouch } from '@harmony/codec/node';
import * as lab from '@harmony/lab';
import {
  CONFIGHASH, FINISHED, OURS, WRITE, hasTag, kind, list, reply, resource, written, type Request_,
} from '@harmony/testkit/touch-recording';

import { CodeBook, frameNumber } from '../src/irmonitor.ts';

/** `8.6-setup-back`: what the bench Touch held before 9.2, what the empty set is built from and what the put back restores. */
const SOURCE = 'touch_setup_set_back';
const EMPTY = 'touch_empty_set';
const BACK = 'touch_empty_set_back';
const MONITOR = 'touch_9_2_monitor';
const PHOTO = 'touch_9_2_favourites_photo';
/** 8.6's monitor log, on the same remote, for a frame the book must name: the control of the monitor's test. */
const HEARD_BEFORE = 'touch_8_6_monitor';
/** 8.6's closing run, on the same remote holding the same set, for what a sync with the favourites asked. */
const BEFORE_CLOSING = 'touch_setup_unchanged_';

/** One answer of a set as the lab keeps it, `set.json`. */
interface SetAnswer { uri: string; 'body-type': string; resource: unknown; etag: string }
const setOf = (fixture: string): SetAnswer[] => (JSON.parse(new TextDecoder().decode(lab.require_(fixture))) as { answers: SetAnswer[] }).answers;
const isDocument = (a: { uri: string }): boolean => a.uri.startsWith('harmony://');
const sixOf = (set: readonly SetAnswer[]): SetAnswer[] => set.filter(isDocument);
const byName = (set: readonly SetAnswer[], name: string): SetAnswer => set.find((a) => isDocument(a) && resource(a.uri) === name)!;
const text = (fixture: string): string => new TextDecoder().decode(lab.require_(fixture));

/** The four documents the empty set empties. */
const FOUR = ['ActivityList', 'DeviceList', 'MapList', 'ProtocolList'];
/** The answers of `set` that differ from `before`'s answer at the same address, content or tag, or that `before` lacks. */
const delivered = (set: readonly SetAnswer[], before: readonly SetAnswer[]): SetAnswer[] =>
  set.filter((a) => {
    const was = isDocument(a) ? byName(before, resource(a.uri)) : before.find((b) => b.uri === a.uri);
    return was === undefined || !isDeepStrictEqual(a, was);
  });

/** The four documents whose tags `getconfighash` joins, in its order, `touch-confighash.test.ts`. */
const HASHED = ['ActivityList', 'DeviceList', 'ProtocolList', 'Context'];
const hashOf = (set: readonly SetAnswer[]): string => `result=${HASHED.map((d) => byName(set, d).etag).join('')}`;
const hashRead = (fixture: string): unknown => {
  const q = reply(fixture);
  assert.deepEqual([q.errorCode, q.errorMessage, q.mime], ['200', 'OK', CONFIGHASH], fixture);
  return q.result;
};

/** 31000 characters a chunk, as `touch-changed-set-sync.test.ts` derives it from the session's shapes. */
const CHUNK = 31000;
const chunks = (length: number): number => Math.ceil(length / CHUNK);

const EMPTY_RUN = 'touch_empty_sync_1_';
const BACK_RUN = 'touch_empty_sync_2_';
const CLOSING = 'touch_empty_unchanged_';

/** The four request lists of the empty run: the six, none, the two backgrounds, the finish. */
const FOUR_LISTS = [Array(6).fill('document'), [], ['picture', 'picture'], ['finished']];
const FOUR_ANSWERED = [1, 3, 4] as const;
/** The eight request lists of the put back and the closing run, as every run of 8.2 to 8.6 handed out. */
const EIGHT = [
  Array(6).fill('document'), [], ['user favourites'], ['device favourites'], ['line up'], [], Array(10).fill('picture'), ['finished'],
];
const EIGHT_ANSWERED = [1, 3, 4, 5, 7, 8] as const;

const runFiles = (prefix: string, lists: readonly unknown[], answered: readonly number[]): string[] => [
  `${prefix}outcome`, `${prefix}handover_list`, `${prefix}handover_answers`,
  ...lists.map((_, i) => `${prefix}list_${i + 1}`), ...answered.map((n) => `${prefix}answers_${n}`),
];
const EMPTY_FILES = runFiles(EMPTY_RUN, FOUR_LISTS, FOUR_ANSWERED);
const BACK_FILES = runFiles(BACK_RUN, EIGHT, EIGHT_ANSWERED);
const CLOSING_FILES = runFiles(CLOSING, EIGHT, EIGHT_ANSWERED);

/**
 * Every answer of one write against its request: an address the set delivers 200 with the set's type, tag and content,
 * unless the request carries the set's own tag, every other tagged request 304 echoing its tag, an untagged favourites request 304 with a tag of ours, the finish 200.
 * 8.4's rule, written again here since a test file cannot import another. Compared as booleans, so a failure prints no
 * value out of a document.
 */
function checkAnswers(asked: Request_[], ours: ReturnType<typeof written>, label: string, sent: readonly SetAnswer[]): void {
  const byUri = new Map(sent.map((a) => [a.uri, a]));
  assert.ok(isDeepStrictEqual(ours.map((a) => a.uri), asked.map((r) => r.uri)), `${label}: the same addresses in the same order`);
  for (const [i, a] of ours.entries()) {
    const r = asked[i]!;
    const k = kind(r.uri);
    const s = byUri.get(r.uri) ?? (isDocument(r) ? sent.find((x) => isDocument(x) && resource(x.uri) === resource(r.uri)) : undefined);
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

/** One whole run: the outcome, the hand over, the lists' shape and every answer, and the status counts. */
function checkRun(prefix: string, label: string, lists: readonly string[][], answered: readonly number[], sent: readonly SetAnswer[], statuses: readonly [number, number]): void {
  const outcome = JSON.parse(text(`${prefix}outcome`)) as { ending: string; acted: boolean; lists: number; answered: number; handedUp: unknown[] };
  assert.deepEqual([outcome.ending, outcome.acted, outcome.lists, outcome.answered, outcome.handedUp.length],
    ['finished', true, lists.length, statuses[0] + statuses[1], 0], `${label}: the answerer's outcome`);
  assert.deepEqual(list(`${prefix}handover_list`).map((r) => [r.verb, r.uri, 'etag' in r]), [['POST', FINISHED, false]], `${label}: the hand over, nothing handed up`);
  assert.deepEqual(written(`${prefix}handover_answers`).map((a) => [a.statusCode, a.uri, 'etag' in a]), [['200', FINISHED, false]], `${label}: the hand over answered`);
  assert.deepEqual(lists.map((_, i) => list(`${prefix}list_${i + 1}`).map((r) => kind(r.uri))), lists, `${label}: the lists`);
  for (const n of answered) checkAnswers(list(`${prefix}list_${n}`), written(`${prefix}answers_${n}`), `${label}, list ${n}`, sent);
  const all = answered.flatMap((n) => written(`${prefix}answers_${n}`));
  assert.deepEqual(['200', '304'].map((s) => all.filter((a) => a.statusCode === s).length), [...statuses], `${label}: the statuses`);
}

/** Which set's tag a document request of a first list carries: the empty set's alone, the one before it, or another. */
function whose(q: Request_): string {
  const d = resource(q.uri);
  const empty = byName(setOf(EMPTY), d).etag;
  const before = byName(setOf(SOURCE), d).etag;
  if (q.etag === empty && q.etag !== before) return 'empty';
  if (q.etag === before) return 'before';
  return 'another';
}

test('the empty set is 8.6-setup-back\'s six with the four lists emptied under tags of ours, and the put back is 8.6-setup-back\'s six with eleven pieces of content',
  lab.skipUnless(SOURCE, EMPTY, BACK), () => {
    const source = sixOf(setOf(SOURCE));
    const empty = setOf(EMPTY);
    const back = setOf(BACK);
    assert.deepEqual(empty.map((a) => a.uri), source.map((a) => a.uri), 'the six alone, in the source\'s order');
    assert.deepEqual(delivered(empty, source).map((a) => resource(a.uri)), FOUR, 'only the four differ');
    for (const d of FOUR) {
      assert.ok(OURS.test(byName(empty, d).etag), `${d}: a tag of ours`);
      assert.notEqual(byName(empty, d).etag, byName(source, d).etag, d);
    }
    const read = (set: readonly SetAnswer[]) => harmonyTouch.readConfiguration(harmonyTouch.documentsOfAnswers(set as unknown as harmonyTouch.SyncAnswer[]));
    const e = read(empty);
    assert.deepEqual([e.activities.length, e.devices.length, e.maps.length, e.protocols.length, e.favourites.length], [0, 0, 0, 0, 0]);
    assert.ok(isDeepStrictEqual(sixOf(back), source), 'the put back\'s six are the source\'s, content and tags');
    assert.deepEqual(back.filter((a) => !isDocument(a)).map((a) => kind(a.uri)),
      ['user favourites', 'device favourites', 'line up', ...Array(8).fill('picture')]);
    const b = read(back);
    assert.deepEqual([b.activities.filter((a) => !a.hidden).length, b.devices.length, b.favourites.map((f) => [f.device?.name, f.favourites.length, f.missing.length])],
      [5, 7, [['LG TV', 5, 0]]]);
  });

// ---- the committed runs ----

test('the empty run: the four 200 with the set\'s content and tags, Context and Settings 304, then the two backgrounds 304 and the finish, over four request lists, and no favourites request',
  lab.skipUnless(SOURCE, EMPTY, ...EMPTY_FILES), () => {
    const sent = delivered(setOf(EMPTY), sixOf(setOf(SOURCE)));
    assert.deepEqual(sent.map((a) => resource(a.uri)), FOUR);
    checkRun(EMPTY_RUN, 'the empty run', FOUR_LISTS, FOUR_ANSWERED, sent, [5, 4]);
    // No favourites document, and no logo, was asked for in any list.
    const asked = FOUR_LISTS.flatMap((_, i) => list(`${EMPTY_RUN}list_${i + 1}`));
    assert.deepEqual(asked.filter((r) => kind(r.uri).endsWith('favourites') || kind(r.uri) === 'line up' || r.uri.startsWith('content-image://')), []);
    assert.ok(asked.filter((r) => kind(r.uri) === 'picture').every((r) => r.uri.startsWith('https://') && hasTag(r)), 'the two pictures are the backgrounds, asked with tags');
  });

test('against 8.6\'s closing run on the same remote, which asked for three favourites documents and ten pictures, the empty run asked for none and two',
  lab.skipUnless(...[3, 4, 5, 7].map((n) => `${BEFORE_CLOSING}list_${n}`), `${EMPTY_RUN}list_3`), () => {
    assert.deepEqual([3, 4, 5].map((n) => list(`${BEFORE_CLOSING}list_${n}`).map((r) => kind(r.uri))), [['user favourites'], ['device favourites'], ['line up']]);
    assert.equal(list(`${BEFORE_CLOSING}list_7`).length, 10);
    assert.equal(list(`${EMPTY_RUN}list_3`).length, 2);
  });

test('the empty run\'s six went in one write of 1573 characters, one chunk, replied 200 as a write',
  lab.skipUnless(`${EMPTY_RUN}answers_1`, `${EMPTY_RUN}reply_1`), () => {
    const length = text(`${EMPTY_RUN}answers_1`).length;
    assert.deepEqual([length, chunks(length)], [1573, 1]);
    const q = reply(`${EMPTY_RUN}reply_1`);
    assert.deepEqual([q.errorCode, q.mime], ['200', WRITE]);
  });

test('the put back: the four 200 with the set\'s content and tags, Context and Settings 304, the three favourites documents 200 with the set\'s content and tags, the ten pictures 304, over eight request lists',
  lab.skipUnless(EMPTY, BACK, ...BACK_FILES), () => {
    const sent = delivered(setOf(BACK), setOf(EMPTY));
    assert.deepEqual(sent.map((a) => (isDocument(a) ? resource(a.uri) : kind(a.uri))), [...FOUR, 'user favourites', 'device favourites', 'line up', ...Array(8).fill('picture')]);
    checkRun(BACK_RUN, 'the put back', EIGHT, EIGHT_ANSWERED, sent, [8, 12]);
    // The pictures were all asked with a tag, so none of the set's eight logos went out: each answered 304.
    assert.deepEqual(written(`${BACK_RUN}answers_7`).map((a) => a.statusCode), Array(10).fill('304'));
  });

test('the put back\'s writes: the six in 567941 characters, 19 chunks; the line up alone in 56446, two chunks; the two favourites documents one chunk each; each replied 200 as a write',
  lab.skipUnless(...EIGHT_ANSWERED.map((n) => `${BACK_RUN}answers_${n}`), `${BACK_RUN}reply_1`, `${BACK_RUN}reply_5`), () => {
    const lengths = EIGHT_ANSWERED.map((n) => text(`${BACK_RUN}answers_${n}`).length);
    assert.deepEqual([lengths[0], lengths[3]], [567941, 56446]);
    assert.deepEqual(lengths.map(chunks), [19, 1, 1, 2, 1, 1]);
    for (const r of ['reply_1', 'reply_5']) {
      const q = reply(`${BACK_RUN}${r}`);
      assert.deepEqual([q.errorCode, q.mime], ['200', WRITE], r);
    }
    // Only the first write holds any of the six; the line up's is the line up alone.
    const documents = (n: number) => written(`${BACK_RUN}answers_${n}`).filter(isDocument).length;
    assert.deepEqual(EIGHT_ANSWERED.map(documents), [6, 0, 0, 0, 0, 0]);
    assert.deepEqual(written(`${BACK_RUN}answers_5`).map((a) => [kind(a.uri), a.statusCode]), [['line up', '200']]);
  });

test('the closing run answered every request 304 or the finish, over eight lists', lab.skipUnless(...CLOSING_FILES), () => {
  checkRun(CLOSING, 'the closing run', EIGHT, EIGHT_ANSWERED, [], [1, 19]);
});

test('the pictures were carried: the put back asked for every logo with the tag the remote held it with and the backgrounds with the tags the empty run and 8.6\'s closing run sent',
  lab.skipUnless(BACK, `${EMPTY_RUN}list_3`, `${BACK_RUN}list_7`, `${CLOSING}list_7`, `${BEFORE_CLOSING}list_7`), () => {
    const back = setOf(BACK);
    const pictures = list(`${BACK_RUN}list_7`);
    const logos = pictures.filter((r) => r.uri.startsWith('content-image://'));
    assert.equal(logos.length, 8);
    assert.ok(logos.every((r) => hasTag(r) && back.find((a) => a.uri === r.uri)?.etag === r.etag), 'every logo with the tag the remote held it with before the empty set');
    const tagsOf = (fixture: string) => list(fixture).filter((r) => r.uri.startsWith('https://')).map((r) => `${r.uri} ${r.etag}`);
    const backgrounds = tagsOf(`${BACK_RUN}list_7`);
    assert.equal(backgrounds.length, 2);
    assert.ok(isDeepStrictEqual(tagsOf(`${EMPTY_RUN}list_3`), backgrounds), 'the empty run\'s backgrounds');
    assert.ok(isDeepStrictEqual(tagsOf(`${BEFORE_CLOSING}list_7`), backgrounds), '8.6\'s closing run\'s backgrounds');
    // The whole picture list, addresses and tags, is the one 8.6's closing run and 9.2's closing run sent.
    const all = (fixture: string) => list(fixture).map((r) => `${r.uri} ${r.etag}`);
    assert.ok(isDeepStrictEqual(all(`${BACK_RUN}list_7`), all(`${BEFORE_CLOSING}list_7`)));
    assert.ok(isDeepStrictEqual(all(`${CLOSING}list_7`), all(`${BEFORE_CLOSING}list_7`)));
  });

test('the first lists: the set before\'s six at the empty run, the four with the empty set\'s tags at the put back, the set before\'s six at the close',
  lab.skipUnless(SOURCE, EMPTY, `${EMPTY_RUN}list_1`, `${BACK_RUN}list_1`, `${CLOSING}list_1`, ...[BACK_RUN, CLOSING].flatMap((p) => [3, 4, 5].map((n) => `${p}list_${n}`))), () => {
    const source = sixOf(setOf(SOURCE));
    const asked = [EMPTY_RUN, BACK_RUN, CLOSING].map((p) => list(`${p}list_1`));
    for (const l of asked) assert.deepEqual(l.map((q) => q.uri), source.map((a) => a.uri));
    assert.deepEqual(asked.map((l) => l.map((q) => `${resource(q.uri)} ${whose(q)}`)), [
      source.map((a) => `${resource(a.uri)} before`),
      source.map((a) => `${resource(a.uri)} ${FOUR.includes(resource(a.uri)) ? 'empty' : 'before'}`),
      source.map((a) => `${resource(a.uri)} before`),
    ]);
    for (const p of [BACK_RUN, CLOSING]) {
      assert.deepEqual([3, 4, 5].map((n) => list(`${p}list_${n}`).map((q) => hasTag(q))), [[false], [false], [false]], p);
    }
  });

test('the configuration hash was the set before\'s before, the empty set\'s after it and after the person\'s restart, and the set before\'s after the put back',
  lab.skipUnless(SOURCE, EMPTY, BACK, 'touch_empty_confighash_before', 'touch_empty_confighash_after', 'touch_empty_confighash_restarted', 'touch_empty_confighash_back'), () => {
    const expected = [SOURCE, EMPTY, EMPTY, BACK].map((s) => hashOf(setOf(s)));
    assert.equal(expected[3], expected[0], 'the put back\'s hash is the set before\'s');
    assert.notEqual(expected[1], expected[0], 'the control: the empty set moves the hash');
    assert.ok(isDeepStrictEqual(['before', 'after', 'restarted', 'back'].map((w) => hashRead(`touch_empty_confighash_${w}`)), expected));
    // Three of the four hashed documents are among the four delivered; Context is not.
    assert.deepEqual(HASHED.filter((d) => byName(setOf(EMPTY), d).etag !== byName(setOf(SOURCE), d).etag), ['ActivityList', 'DeviceList', 'ProtocolList']);
  });

test('the control: the empty run\'s answers checked against the put back\'s set fail, where they hold against the empty set',
  lab.skipUnless(SOURCE, EMPTY, BACK, `${EMPTY_RUN}list_1`, `${EMPTY_RUN}answers_1`), () => {
    const wrong = delivered(setOf(BACK), setOf(EMPTY));
    assert.throws(() => checkAnswers(list(`${EMPTY_RUN}list_1`), written(`${EMPTY_RUN}answers_1`), 'the control', wrong), assert.AssertionError);
    checkAnswers(list(`${EMPTY_RUN}list_1`), written(`${EMPTY_RUN}answers_1`), 'the empty run', delivered(setOf(EMPTY), sixOf(setOf(SOURCE))));
  });

/** Where 9.2's look ends: the hash after the person's restart was read at 11:35 UTC, before the put back. */
const LOG_END = '2026-11-07T11:35:00';

test('the monitor heard no code between the empty commit and the put back: 86 frames, every one unreadable, none fitting a code of either set and none decoding to a number',
  lab.needing(lab.skipUnless(SOURCE, BACK, MONITOR, HEARD_BEFORE)), () => {
    const lines = text(MONITOR).split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l) as { at: string; type?: string; pulses?: { mark: boolean; us: number }[]; unreadable?: boolean; repeatOf?: number | null });
    // The monitor started after the empty sync, which ran at 11:25 UTC.
    assert.ok(lines[0]!.at >= '2026-11-07T11:25' && lines[0]!.pulses === undefined, 'the log opens with the tool\'s own line');
    const frames = lines.filter((f) => f.pulses !== undefined && f.at < LOG_END);
    assert.equal(frames.length, 86);
    assert.equal(lines.filter((f) => f.pulses !== undefined && f.at >= LOG_END).length, 0, 'nothing after, up to where the log was taken');
    assert.ok(frames.every((f) => f.unreadable === true && (f.repeatOf === undefined || f.repeatOf === null)), 'every frame unreadable at the bench');
    const book = new CodeBook((name) => ([SOURCE, BACK].includes(name) ? lab.require_(name) : undefined), [], undefined, [SOURCE, BACK]);
    assert.equal(frames.filter((f) => book.match(f.pulses!).length > 0).length, 0, 'none fits a code of the set before or of the put back');
    assert.equal(frames.filter((f) => frameNumber(f.pulses!) !== undefined).length, 0, 'none decodes to a number');
    // When: 82 in 22 seconds from 11:31:21, one at 11:32:28, three at 11:33:43.
    const minute = (f: { at: string }) => f.at.slice(11, 16);
    assert.deepEqual(['11:31', '11:32', '11:33'].map((m) => frames.filter((f) => minute(f) === m).length), [82, 1, 3]);
    // The control: the same book names the first code 8.6's monitor heard on the same remote, so "none fits" can fail.
    const heard = text(HEARD_BEFORE).split('\n').filter((l) => l.includes('"pulses"')).map((l) => JSON.parse(l) as { pulses: { mark: boolean; us: number }[]; unreadable?: boolean })
      .find((f) => f.unreadable !== true)!;
    assert.ok(book.match(heard.pulses).length > 0);
  });

test('the person\'s photograph of the favourites page on the empty set is kept in the lab, a PNG; what it shows is the person\'s report in this file\'s header',
  lab.skipUnless(PHOTO), () => {
    const bytes = lab.require_(PHOTO);
    assert.deepEqual([...bytes.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });
