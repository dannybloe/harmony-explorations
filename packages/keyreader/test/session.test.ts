/**
 * The key reader's modes, learning and testing, and the log a person sends, driven without a page or a
 * remote and read off the **published** `session.js` (`built.ts` says why).
 *
 * The learning mode's one rule is that **a press is recorded against the key asked for**, so that a name
 * never rests on the order keys were pressed in: the Harmony 885's Pause and Play came out swapped when
 * codes were named by a list's order (`tests/test_harmony_885_keys.py`). The replay below is the 885's
 * measured codes, which its drawing carries, pressed in the order the page asks; and the cases around it
 * are what a person gets wrong at the bench: a key pressed twice, a wrong key whose code is already
 * taken, a key their remote lacks, a slip to undo, a press after the end.
 *
 * The log's shape is a fixed set of line patterns, and the test holds every line of a full log to them,
 * with a control showing that a line of any other shape, such as one carrying a serial number, is caught.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUT_DIR } from '../bin/build.ts';
import type * as SessionModule from '../src/session.ts';
import type { Drawing, FaceKey } from '../src/session.ts';

const session = (await import(pathToFileURL(join(OUT_DIR, 'session.js')).href)) as typeof SessionModule;
const { DRAWINGS } = (await import(pathToFileURL(join(OUT_DIR, 'drawings.js')).href)) as { DRAWINGS: readonly Drawing[] };

const h885 = DRAWINGS.find((d) => d.id === 'h885') as Drawing;
const h880 = DRAWINGS.find((d) => d.id === 'h880') as Drawing;

/** Skip keys until `name` is the one asked, as a person would skip keys their remote lacks. */
function skipTo(learning: SessionModule.Learning, name: string): void {
  while (learning.asked !== undefined && learning.asked.name !== name) learning.skip();
}

function code(keys: readonly FaceKey[], name: string): number {
  return keys.find((k) => k.name === name)?.scan as number;
}

// ------------------------------------------------------------------------------------------------
// Learning, with a drawing.

test('the 885 replayed in the order asked learns every key at its measured code', () => {
  const learning = new session.Learning(h885.keys);
  for (const key of h885.keys) {
    assert.equal(learning.asked?.name, key.name);
    const outcome = learning.press(key.scan as number);
    assert.equal(outcome.kind, 'learned', key.name);
  }
  assert.ok(learning.done);
  assert.deepEqual(learning.rows().map((r) => [r.name, r.code]), h885.keys.map((k) => [k.name, k.scan]));
  assert.deepEqual(learning.misfits, []);
});

test('a press is the code of the key asked for, whatever key it came from', () => {
  // Asked for Play, the person presses what is Pause on an 885: the page cannot know, and records 55 as
  // Play. What protects the name is that Pause is then asked for by name, and its own code, 55, is refused.
  const learning = new session.Learning(h885.keys);
  skipTo(learning, 'Play');
  assert.equal(learning.press(55).kind, 'learned');
  skipTo(learning, 'Pause');
  const outcome = learning.press(55);
  assert.equal(outcome.kind, 'misfit');
  assert.deepEqual(outcome.kind === 'misfit' ? outcome.misfit : undefined, { code: 55, asked: 'Pause', reason: 'already', other: 'Play' });
  assert.equal(learning.asked?.name, 'Pause');
});

test('a key pressed twice is noted, not recorded, and the key asked stays asked', () => {
  const learning = new session.Learning(h885.keys);
  learning.press(code(h885.keys, 'AllOff'));
  const again = learning.press(code(h885.keys, 'AllOff'));
  assert.equal(again.kind, 'misfit');
  assert.equal(learning.asked?.name, 'Activities');
  assert.equal(learning.answers.length, 1);
  assert.equal(learning.misfits.length, 1);
});

test('skip answers the key asked as skipped; undo takes back the last answer and asks that key again', () => {
  const learning = new session.Learning(h885.keys);
  learning.press(2);
  assert.equal(learning.skip()?.name, 'Activities');
  assert.equal(learning.stateOf('Activities'), 'skipped');
  assert.equal(learning.stateOf('Help'), 'asked');
  assert.equal(learning.stateOf('Enter'), 'waiting');
  assert.equal(learning.undo()?.key.name, 'Activities');
  assert.equal(learning.stateOf('Activities'), 'asked');
  // Undo of a learned key frees its code: 2 is AllOff's no longer, so it can be learned again.
  assert.equal(learning.undo()?.code, 2);
  assert.equal(learning.press(2).kind, 'learned');
  assert.equal(learning.stateOf('AllOff'), 'learned');
});

test('a press once every key is answered is noted as nothing asked', () => {
  const learning = new session.Learning(h885.keys.slice(0, 2));
  learning.press(2);
  learning.skip();
  const late = learning.press(9);
  assert.deepEqual(late.kind === 'misfit' ? late.misfit : undefined, { code: 9, asked: undefined, reason: 'nothing-asked' });
  assert.equal(learning.skip(), undefined);
});

test('the 880 learns its chevron keys like any other, whatever the drawing narrowed them to', () => {
  const learning = new session.Learning(h880.keys);
  skipTo(learning, 'UpArrow');
  assert.equal(learning.press(20).kind, 'learned');
  assert.equal(learning.press(52).kind, 'learned');
  assert.deepEqual(learning.rows().filter((r) => r.name.endsWith('Arrow')).map((r) => [r.name, r.code]),
    [['UpArrow', 20], ['DownArrow', 52]]);
});

// ------------------------------------------------------------------------------------------------
// Learning, without a drawing.

test('without a drawing a press waits for its words, and is recorded against them', () => {
  const naming = new session.Naming();
  assert.equal(naming.name('MUTE'), undefined, 'no words without a press');
  assert.deepEqual(naming.press(20), { kind: 'pending', code: 20 });
  const early = naming.press(21);
  assert.deepEqual(early.kind === 'misfit' ? early.misfit.reason : undefined, 'naming');
  assert.equal(naming.name('   '), undefined, 'no empty words');
  assert.deepEqual(naming.name(' MUTE '), { words: 'MUTE', code: 20 });
  const again = naming.press(20);
  assert.deepEqual(again.kind === 'misfit' ? again.misfit : undefined, { code: 20, asked: undefined, reason: 'already', other: 'MUTE' });
  naming.press(30);
  assert.equal(naming.discard(), 30);
  assert.equal(naming.pending, undefined);
  assert.deepEqual(naming.undo(), { words: 'MUTE', code: 20 });
  assert.deepEqual(naming.rows(), []);
});

// ------------------------------------------------------------------------------------------------
// Testing.

test('a press lights the key whose code it is, and it stays lit', () => {
  const tester = new session.Tester(h885.keys);
  assert.deepEqual(tester.press(55), { code: 55, exact: ['Pause'], possible: [] });
  tester.press(56);
  tester.press(55);
  assert.equal(tester.stateOf('Pause'), 'lit');
  assert.equal(tester.stateOf('Play'), 'lit');
  assert.equal(tester.stateOf('Stop'), 'unlit');
  assert.equal(tester.answered, 2);
  assert.equal(tester.total, 55);
});

test('on the 880 a chevron code lights both chevron keys as possible, and a decided key wins over a candidate', () => {
  const tester = new session.Tester(h880.keys);
  assert.deepEqual(tester.press(52), { code: 52, exact: [], possible: ['UpArrow', 'DownArrow'] });
  assert.equal(tester.stateOf('UpArrow'), 'possible');
  assert.deepEqual(tester.unknown, []);
  // On the 885, 20 is Red's own code, so nothing there is lit as possible.
  const on885 = new session.Tester(h885.keys);
  assert.deepEqual(on885.press(20), { code: 20, exact: ['Red'], possible: [] });
});

test('a code no key carries is listed once, in the order first pressed', () => {
  const tester = new session.Tester(h880.keys);
  // 10 is the 885's Device key, which the 880's drawing has no code for yet.
  tester.press(10);
  tester.press(99);
  tester.press(10);
  assert.deepEqual(tester.unknown, [10, 99]);
  tester.reset();
  assert.deepEqual(tester.unknown, []);
  assert.equal(tester.answered, 0);
});

// ------------------------------------------------------------------------------------------------
// The log.

/**
 * Every line shape a log may hold. The head names the model and what the remote reported, its model name,
 * skin and firmware; then one line per key; then the presses that did not fit.
 */
const LINE_SHAPES: readonly RegExp[] = [
  /^Harmony key map, from the key reader page$/,
  /^model chosen: Harmony [0-9A-Za-z ]+$/,
  /^remote reported: Harmony [0-9A-Za-z ]+, skin \d+, firmware [0-9.]+$/,
  /^$/,
  /^keys, in the order (asked|pressed):$/,
  /^[A-Za-z0-9]+( \(.+\))?: (\d+|skipped|not asked)$/,
  /^"[^"]*": \d+$/,
  /^presses that did not fit:$/,
  /^none$/,
  /^\d+: (already the code of .+|pressed after every key was answered|pressed before the words for the previous key were in)$/,
];

/** The lines of a log that match no shape. */
function offShape(log: string): string[] {
  return log.trimEnd().split('\n').filter((line) => !LINE_SHAPES.some((shape) => shape.test(line)));
}

const HEAD = { chosen: 'Harmony 885', reported: 'Harmony 885', skin: 17, firmware: '4.4' };

test('a full 885 log has the head, every key in the order asked, and the presses that did not fit', () => {
  const learning = new session.Learning(h885.keys);
  learning.press(2);
  learning.press(2);
  learning.skip();
  for (const key of h885.keys.slice(2)) learning.press(key.scan as number);
  learning.press(7);
  const log = session.learningLog(HEAD, learning.rows(), learning.misfits);
  assert.deepEqual(offShape(log), []);
  const lines = log.split('\n');
  assert.deepEqual(lines.slice(0, 7), [
    'Harmony key map, from the key reader page',
    'model chosen: Harmony 885',
    'remote reported: Harmony 885, skin 17, firmware 4.4',
    '',
    'keys, in the order asked:',
    'AllOff (OFF): 2',
    'Activities (ACTIVITIES): skipped',
  ]);
  assert.ok(lines.includes('Red (the leftmost of the four keys at the bottom of the curve (red)): 20'));
  assert.ok(lines.includes('2: already the code of AllOff while Activities was asked'));
  assert.ok(lines.includes('7: pressed after every key was answered'));
  assert.equal(lines.filter((l) => /^[A-Za-z0-9]+( \(.+\))?: (\d+|skipped|not asked)$/.test(l)).length, 55);
});

test('a log of keys not reached says so, and a log without a drawing lists keys in the order pressed', () => {
  const learning = new session.Learning(h885.keys);
  learning.press(2);
  const partial = session.learningLog(HEAD, learning.rows(), learning.misfits);
  assert.deepEqual(offShape(partial), []);
  assert.ok(partial.includes('Enter (ENTER): not asked\n'));
  assert.ok(partial.endsWith('presses that did not fit:\nnone\n'));

  const naming = new session.Naming();
  naming.press(11);
  naming.name('the "round" key below SOUND');
  naming.press(12);
  naming.press(13);
  const head = { chosen: 'Harmony 880 Pro', reported: 'Harmony 880 Pro', skin: 39, firmware: '4.4' };
  const named = session.learningLog(head, naming.rows(), naming.misfits, 'pressed');
  assert.deepEqual(offShape(named), []);
  assert.match(named, /keys, in the order pressed:\n"the 'round' key below SOUND": 11\n/);
  assert.match(named, /13: pressed before the words for the previous key were in\n$/);
});

test('control: a line of any other shape is caught, such as a serial number', () => {
  const log = session.learningLog(HEAD, [], []);
  assert.deepEqual(offShape(log), []);
  assert.deepEqual(offShape(`${log}serial: 0x1234abcd\n`), ['serial: 0x1234abcd']);
  assert.deepEqual(offShape(log.replace('firmware 4.4', 'firmware 4.4, guid 7f3c')), [
    'remote reported: Harmony 885, skin 17, firmware 4.4, guid 7f3c',
  ]);
});
