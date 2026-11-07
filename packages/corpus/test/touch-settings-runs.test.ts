/**
 * A Settings of ours and a Context composed by us on the Harmony Touch, `todo-touch.md` 8.4, as it ran: the screen's
 * brightness and its timeout changed in the remote's own settings document, Context rebuilt from a description of the
 * seven fields a Touch reads, both delivered in a sync, seen and timed at the bench, and both put back.
 *
 * **What was run.** After commit `fc56fc19`, the 8.4 preparation, and in the order of the lab's
 * `work/touch-firmware/notes/8.4-preflight.md` section 6, each run read before the next:
 *
 * 1. `getconfighash` through the request rail, the remote holding `8.3-favourites-back`, whose six are
 *    `8.2-activity-back`'s, content and tags;
 * 2. `touch-sync.ts --set 8.4-settings --commit`: the six of `8.3-favourites-back` with two composed by us, Settings
 *    by `composeTouchSettings` from `packages/corpus/touch-settings/8.4-settings.json` (screen brightness 100 to 20,
 *    screen timeout 10 to 30 seconds, every other row as the remote held it) and Context by `composeTouchContext` from
 *    a description of its seven read fields kept in the lab, equal in content to what the remote held, each under the
 *    tag the set's name gives, `touch-device-set.ts --settings`;
 * 3. `getconfighash` again;
 * 4. `touch-sync.ts --set 8.4-settings-back --commit`, the two as the remote held them before, content and tags, and
 *    `getconfighash`;
 * 5. one `touch-sync.ts --unchanged --commit`.
 *
 * No infrared was involved and no bench test file was run: nothing in either document sends a code.
 *
 * **What it measured, each against something independent of it.**
 *
 * 1. **The two sets.** The forward set is the source's six with Settings changed in exactly the two rows and Context
 *    equal in content, key order included, each under a new tag of ours; the put back is the source's six, content and
 *    tags.
 * 2. **Each set run answered Settings and Context 200 with the set's content and tags**, the four other documents 304,
 *    the three favourites documents 304 with a tag of ours, the ten pictures 304, the finish 200, and finished, over
 *    eight request lists. The six went in one write of 4788 characters for the forward set and 4789 for the put back,
 *    each one chunk and each replied 200 as a write. The closing `--unchanged` run answered every request 304 or the
 *    finish.
 * 3. **The first request lists say what the remote had committed.** The forward run asked for the six with the
 *    source's tags; the put back's run asked for Settings and Context with the forward set's tags and the other four
 *    with the source's, so the forward set's two were stored and committed; the closing run asked for all six with the
 *    source's tags again.
 * 4. **The configuration hash** joins the tags of ActivityList, DeviceList, ProtocolList and Context, not Settings: it
 *    was the source's before, the forward set's after it, Context's new tag in it, and the source's after the put back.
 *    So the hash shows that Context arrived; Settings' arrival is the kept write and the put back's first list.
 *
 * **Reported by the person at the bench and held by no file**: after the forward set the screen was dimmed, and off the
 * cable the screen took about 30 seconds after a touch to dim; the timeout before the run was not timed, only
 * remembered as much shorter. After the put back the brightness was at its maximum and the timeout timed about 10
 * seconds. **Whether the brightness changed at the "sync complete" screen itself was not seen either time**, so the
 * moment a delivered Settings acts is the firmware's reading (`syncDone`, `tests/test_harmony_touch_favourites.py`)
 * and not a measurement: what was seen is that it had acted by the time the person looked, with no restart between.
 *
 * **So a Settings document composed by this project, delivered with 200 under a tag of ours, was stored and committed
 * by a Touch and acted on**: a dimmer screen and a longer timeout, and the old ones back after the put back. And a
 * Context composed by us from a description was stored under our tag, which the remote reports in its configuration
 * hash. What this does not show: a Context whose content differs from the remote's, any other Settings row, the
 * motion sensor and vibration rows, which the screens set only at start, and the moment within the sync's end at
 * which the backlight changes.
 *
 * **The control** judges each set run by the other set: by it, the kept write of each run fails on exactly Settings and
 * Context and on nothing else, and the put back's first list would have been the source's tags for all six had the
 * forward set's two not been stored.
 *
 * **What would have falsified it**: a 200 for anything but the two, or a 304 for either; a put back first list asking
 * for Settings or Context with any tag but the forward set's; a hash after the forward run that was not the forward
 * set's; a screen not dimmed after the forward run.
 *
 * **Sources checked first**: the lab's `8.4-preflight.md` and `8.4-land-brief.md`, `touch-favourites-runs.test.ts`, whose shape
 * this follows for the sync half, `touch-settings-set.test.ts`, and the screens' `syncDone` handler and settings code
 * in the lab's firmware copy. Logitech's client was not consulted: the remote runs its own screens and the answers are
 * ours. **Which architectures**: the Harmony Touch on firmware 4.15.330, one unit, one run of each set; its firmware
 * reports 17 and Logitech's templates file it under 18.
 *
 * The reads and the sets hold tags, the account's number, its email address, the household's address and the
 * favourites address: this file asserts equalities, counts and shapes and prints none of them. The Context description
 * in the lab is not read here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';

import * as lab from '@harmony/lab';
import {
  CONFIGHASH, FINISHED, OURS, WRITE, hasTag, kind, list, reply, resource, written,
  type Request_,
} from '@harmony/usb/test/touch-recording';

import { differences } from '../experiments/touchchangedset.ts';
import { settingsChanges } from '../experiments/touchsettingsset.ts';

/** `8.2-activity-back`, whose six `8.3-favourites-back` carries, content and tags: what the remote held before 8.4. */
const SOURCE = 'touch_activity_set_back';
const SET = 'touch_settings_set';
const BACK = 'touch_settings_set_back';

/** One answer of a set as the lab keeps it, `set.json`. */
interface SetAnswer { uri: string; 'body-type': string; resource: unknown; etag: string }
const setOf = (fixture: string): SetAnswer[] => (JSON.parse(new TextDecoder().decode(lab.require_(fixture))) as { answers: SetAnswer[] }).answers;
const byName = (set: readonly SetAnswer[], name: string): SetAnswer => set.find((a) => resource(a.uri) === name)!;

/** The two documents 8.4 delivers. */
const TWO = ['Settings', 'Context'];
/** The answers of `set` that differ from `before`, content or tag. */
const delivered = (set: readonly SetAnswer[], before: readonly SetAnswer[]): SetAnswer[] =>
  set.filter((a) => !isDeepStrictEqual(a, byName(before, resource(a.uri))));

/** The four documents whose tags `getconfighash` joins, in its order, `touch-confighash.test.ts`. */
const HASHED = ['ActivityList', 'DeviceList', 'ProtocolList', 'Context'];
const hashOf = (set: readonly SetAnswer[]): string => `result=${HASHED.map((d) => byName(set, d).etag).join('')}`;

/** The two set runs, each with the set it delivered, the set the remote held before it, and the size of its kept write. */
const SET_RUNS = [
  { prefix: 'touch_settings_sync_1_', set: SET, before: BACK, length: 4788 },
  { prefix: 'touch_settings_sync_2_', set: BACK, before: SET, length: 4789 },
] as const;
const CLOSING = 'touch_settings_unchanged_';
const ALL_RUNS = [...SET_RUNS.map((r) => r.prefix), CLOSING];

/** The eight request lists every run of 8.4 handed out, as every run of 8.2 and 8.3 did. */
const EIGHT = [
  Array(6).fill('document'), [], ['user favourites'], ['device favourites'], ['line up'], [], Array(10).fill('picture'), ['finished'],
];
const EIGHT_ANSWERED = [1, 3, 4, 5, 7, 8] as const;

const runFiles = (prefix: string): string[] => [
  `${prefix}outcome`, `${prefix}handover_list`, `${prefix}handover_answers`,
  ...EIGHT.map((_, i) => `${prefix}list_${i + 1}`), ...EIGHT_ANSWERED.map((n) => `${prefix}answers_${n}`),
];

/**
 * Every answer of one write against its request: an address the set delivers 200 with the set's type, tag and
 * content, every other tagged request 304 echoing its tag, an untagged favourites request 304 with a tag of ours,
 * the finish 200. 8.3's rule, written again here since a test file cannot import another.
 */
function checkAnswers(asked: Request_[], ours: ReturnType<typeof written>, label: string, sent: readonly SetAnswer[]): void {
  const byUri = new Map(sent.map((a) => [a.uri, a]));
  assert.deepEqual(ours.map((a) => a.uri), asked.map((r) => r.uri), `${label}: the same addresses in the same order`);
  for (const [i, a] of ours.entries()) {
    const r = asked[i]!;
    const k = kind(r.uri);
    const s = byUri.get(r.uri);
    if (k === 'finished') {
      assert.deepEqual([a.statusCode, 'etag' in a], ['200', false], label);
    } else if (s !== undefined) {
      assert.deepEqual([a.statusCode, a['body-type'], a.etag], ['200', s['body-type'], s.etag], `${label}: ${resource(r.uri)} answered 200 with the set's tag`);
      assert.ok(isDeepStrictEqual(a.resource, s.resource), `${label}: ${resource(r.uri)} is the set's`);
    } else if (hasTag(r)) {
      assert.deepEqual([a.statusCode, a.etag, 'resource' in a], ['304', r.etag, false], `${label}: ${k} answered 304 echoing its tag`);
    } else {
      assert.deepEqual([k.endsWith('favourites') || k === 'line up', a.statusCode, 'resource' in a], [true, '304', false], `${label}: an untagged favourites request kept`);
      assert.match(a.etag ?? '', OURS, `${label}: a tag of ours`);
    }
  }
}

/** One whole run: the outcome, the hand over, the lists' shape and every answer, and the status counts. */
function checkRun(prefix: string, label: string, sent: readonly SetAnswer[]): void {
  const outcome = JSON.parse(new TextDecoder().decode(lab.require_(`${prefix}outcome`))) as { ending: string; acted: boolean; lists: number; answered: number; handedUp: unknown[] };
  assert.deepEqual([outcome.ending, outcome.acted, outcome.lists, outcome.answered, outcome.handedUp.length], ['finished', true, EIGHT.length, 20, 0], `${label}: the answerer's outcome`);
  assert.deepEqual(list(`${prefix}handover_list`).map((r) => [r.verb, r.uri, 'etag' in r]), [['POST', FINISHED, false]], `${label}: the hand over, nothing handed up`);
  assert.deepEqual(written(`${prefix}handover_answers`).map((a) => [a.statusCode, a.uri, 'etag' in a]), [['200', FINISHED, false]], `${label}: the hand over answered`);
  assert.deepEqual(EIGHT.map((_, i) => list(`${prefix}list_${i + 1}`).map((r) => kind(r.uri))), EIGHT, `${label}: the lists`);
  for (const n of EIGHT_ANSWERED) checkAnswers(list(`${prefix}list_${n}`), written(`${prefix}answers_${n}`), `${label}, list ${n}`, sent);
  const all = EIGHT_ANSWERED.flatMap((n) => written(`${prefix}answers_${n}`));
  assert.deepEqual(['200', '304'].map((s) => all.filter((a) => a.statusCode === s).length), [1 + sent.length, 19 - sent.length], `${label}: the statuses`);
}

test('the forward set is the source\'s six with Settings changed in two rows and Context equal in content, both under new tags of ours, and the put back is the source',
  lab.skipUnless(SOURCE, SET, BACK), () => {
    const source = setOf(SOURCE);
    const forward = setOf(SET);
    const back = setOf(BACK);
    assert.deepEqual(back, source, 'the put back is the source, content and tags');
    assert.deepEqual(forward.map((a) => a.uri), source.map((a) => a.uri), 'the six, in the source\'s order');
    assert.deepEqual(delivered(forward, source).map((a) => resource(a.uri)).sort(), [...TWO].sort(), 'only the two differ');
    for (const d of TWO) {
      assert.match(byName(forward, d).etag, OURS, `${d}: a tag of ours`);
      assert.notEqual(byName(forward, d).etag, byName(source, d).etag, d);
    }
    assert.deepEqual(settingsChanges(byName(source, 'Settings').resource, byName(forward, 'Settings').resource), {
      rows: [{ name: 'ScreenBrightness', was: '100', now: '20' }, { name: 'ScreenTimeout', was: '10', now: '30' }], restEqual: true,
    });
    assert.deepEqual(differences(byName(source, 'Context').resource, byName(forward, 'Context').resource), []);
    assert.equal(JSON.stringify(byName(forward, 'Context').resource), JSON.stringify(byName(source, 'Context').resource), 'key order too');
  });

for (const r of SET_RUNS) {
  test(`${r.prefix}: Settings and Context answered 200 with the set's content and tags, the rest 304, the finish 200, over eight request lists`,
    lab.skipUnless(r.set, r.before, ...runFiles(r.prefix)), () => {
      const sent = delivered(setOf(r.set), setOf(r.before));
      assert.deepEqual(sent.map((a) => resource(a.uri)).sort(), [...TWO].sort());
      checkRun(r.prefix, r.prefix, sent);
    });

  test(`${r.prefix}: the six went in one write of ${r.length} characters, replied 200 as a write`,
    lab.skipUnless(`${r.prefix}answers_1`, `${r.prefix}reply_1`), () => {
      const length = new TextDecoder().decode(lab.require_(`${r.prefix}answers_1`)).length;
      // 31000 characters a chunk, as `touch-changed-set-sync.test.ts` derives it from the session's shapes.
      assert.equal(length, r.length);
      assert.ok(length < 31000, 'one chunk');
      const q = reply(`${r.prefix}reply_1`);
      assert.deepEqual([q.errorCode, q.mime], ['200', WRITE]);
    });
}

test('the closing run answered every request 304 or the finish, over eight lists', lab.skipUnless(...runFiles(CLOSING)), () => {
  checkRun(CLOSING, 'the closing run', []);
});

test('the first lists: the source\'s six before, Settings and Context with the forward set\'s tags at the put back, the source\'s six at the close',
  lab.skipUnless(SOURCE, SET, ...ALL_RUNS.map((p) => `${p}list_1`)), () => {
    const source = setOf(SOURCE);
    const forward = setOf(SET);
    const whose = (q: Request_): string => {
      const d = resource(q.uri);
      return q.etag === byName(forward, d).etag && q.etag !== byName(source, d).etag ? 'forward' : q.etag === byName(source, d).etag ? 'source' : 'another';
    };
    const asked = ALL_RUNS.map((p) => list(`${p}list_1`));
    for (const l of asked) assert.deepEqual(l.map((q) => q.uri), source.map((a) => a.uri));
    assert.deepEqual(asked.map((l) => l.map((q) => `${resource(q.uri)} ${whose(q)}`)), [
      source.map((a) => `${resource(a.uri)} source`),
      source.map((a) => `${resource(a.uri)} ${TWO.includes(resource(a.uri)) ? 'forward' : 'source'}`),
      source.map((a) => `${resource(a.uri)} source`),
    ]);
    // The three favourites documents untagged in every run, as in 8.3.
    for (const p of ALL_RUNS) {
      assert.deepEqual([3, 4, 5].map((n) => list(`${p}list_${n}`).map((q) => hasTag(q))), [[false], [false], [false]], p);
    }
  });

test('the configuration hash was the source\'s before, the forward set\'s after it with Context\'s new tag, and the source\'s after the put back',
  lab.skipUnless(SOURCE, SET, BACK, 'touch_settings_confighash_before', 'touch_settings_confighash_after', 'touch_settings_confighash_back'), () => {
    const read = (fixture: string): unknown => {
      const q = reply(fixture);
      assert.deepEqual([q.errorCode, q.mime], ['200', CONFIGHASH]);
      return q.result;
    };
    const expected = [BACK, SET, BACK].map((s) => hashOf(setOf(s)));
    assert.notEqual(expected[0], expected[1], 'Context\'s tag moves the hash');
    assert.equal(hashOf(setOf(SOURCE)), expected[0]);
    assert.deepEqual(['before', 'after', 'back'].map((w) => read(`touch_settings_confighash_${w}`)), expected);
    // Settings is not in the hash: a forward set with the source's Settings tag gives the same hash.
    const sourceSettings = setOf(SET).map((a) => (resource(a.uri) === 'Settings' ? byName(setOf(SOURCE), 'Settings') : a));
    assert.equal(hashOf(sourceSettings), expected[1]);
  });

test('the control: judged by the other set, each run\'s kept write fails on exactly Settings and Context, and by its own on nothing',
  lab.skipUnless(SET, BACK, ...SET_RUNS.flatMap((r) => [`${r.prefix}list_1`, `${r.prefix}answers_1`])), () => {
    for (const r of SET_RUNS) {
      const asked = list(`${r.prefix}list_1`);
      const ours = written(`${r.prefix}answers_1`);
      const failing = (by: string): string[] => {
        const sent = delivered(setOf(by), setOf(by === SET ? BACK : SET));
        return asked.filter((q, i) => {
          try {
            checkAnswers([q], [ours[i]!], r.prefix, sent);
            return false;
          } catch {
            return true;
          }
        }).map((q) => resource(q.uri)).sort();
      };
      const other = r.set === SET ? BACK : SET;
      assert.deepEqual([failing(r.set), failing(other)], [[], [...TWO].sort()], r.prefix);
    }
  });
