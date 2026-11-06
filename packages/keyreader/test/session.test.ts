/**
 * The key reader's modes, learning and testing, and the log a person sends, driven without a page or a
 * remote and read off the **published** `session.js` (`built.ts` says why).
 *
 * The learning mode's one rule is that **a press is recorded against the key asked for**, so that a name
 * never rests on the order keys were pressed in: the Harmony 885's Pause and Play came out swapped when
 * codes were named by a list's order (`tests/test_harmony_885_keys.py`). The replay below is the 885's
 * measured codes, which its drawing carries, pressed in the order the page asks; and the cases around it
 * are what a person gets wrong at the bench: a key pressed again for the next one, a wrong key whose code
 * is already taken, a key their remote lacks, a slip to undo, a press after the end.
 *
 * **Each key asked is pressed twice**, and the second press has to give the first one's code, so that a
 * slip to the neighbouring key is caught when it happens rather than learned under the wrong name. The
 * tests here call `learn` for a key pressed twice; the two press rule has tests of its own, each with a
 * control that disarms one part of it in the published file.
 *
 * The log's shape is a fixed set of line patterns, and the test holds every line of a full log to them,
 * with a control showing that a line of any other shape, such as one carrying a serial number, is caught.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type * as SessionModule from '../src/session.ts';
import { publishedModule, publishedWith } from './built.ts';
import type { Drawing, FaceKey } from '../src/session.ts';

const session = (await publishedModule('session.js')) as typeof SessionModule;
const { DRAWINGS } = (await publishedModule('drawings.js')) as { DRAWINGS: readonly Drawing[] };

const h885 = DRAWINGS.find((d) => d.id === 'h885') as Drawing;
const h880 = DRAWINGS.find((d) => d.id === 'h880') as Drawing;

/** The 885's keys in the order learning asks for them: every key of the drawing but those left out. */
const asked885 = h885.keys.filter((k) => k.ask);

/** Skip keys until `name` is the one asked, as a person would skip keys their remote lacks. */
function skipTo(learning: SessionModule.Learning, name: string): void {
  while (learning.asked !== undefined && learning.asked.name !== name) learning.skip();
}

/** A key pressed twice, as learning asks: the outcome of the second press. */
function learn(learning: SessionModule.Learning, code: number): SessionModule.LearnOutcome {
  learning.press(code);
  return learning.press(code);
}

function code(keys: readonly FaceKey[], name: string): number {
  return keys.find((k) => k.name === name)?.scan as number;
}

// ------------------------------------------------------------------------------------------------
// Learning, with a drawing.

test('the 885 replayed in the order asked learns every key at its measured code, and is not asked Glow', () => {
  const learning = new session.Learning(h885.keys);
  assert.equal(learning.keys.length, 54);
  assert.ok(!learning.keys.some((k) => k.name === 'Glow'));
  for (const key of asked885) {
    assert.equal(learning.asked?.name, key.name);
    assert.equal(learning.press(key.scan as number).kind, 'provisional', key.name);
    assert.equal(learning.press(key.scan as number).kind, 'learned', key.name);
  }
  assert.ok(learning.done);
  assert.deepEqual(learning.rows().map((r) => [r.name, r.code]), asked885.map((k) => [k.name, k.scan]));
  assert.deepEqual(learning.misfits, []);
});

test('a press is the code of the key asked for, whatever key it came from', () => {
  // Asked for Play, the person presses what is Pause on an 885: the page cannot know, and records 55 as
  // Play. What protects the name is that Pause is then asked for by name, and its own code, 55, is refused.
  const learning = new session.Learning(h885.keys);
  skipTo(learning, 'Play');
  assert.equal(learn(learning, 55).kind, 'learned');
  skipTo(learning, 'Pause');
  const outcome = learning.press(55);
  assert.equal(outcome.kind, 'misfit');
  assert.deepEqual(outcome.kind === 'misfit' ? outcome.misfit : undefined, { code: 55, asked: 'Pause', reason: 'already', other: 'Play' });
  assert.equal(learning.asked?.name, 'Pause');
});

test('a learned key pressed again for the next key is noted, not recorded, and the key asked stays asked', () => {
  const learning = new session.Learning(h885.keys);
  learn(learning, code(h885.keys, 'AllOff'));
  const again = learning.press(code(h885.keys, 'AllOff'));
  assert.equal(again.kind, 'misfit');
  assert.equal(learning.asked?.name, 'Activities');
  assert.equal(learning.answers.length, 1);
  assert.equal(learning.misfits.length, 1);
});

test('skip answers the key asked as skipped; undo takes back the last answer and asks that key again', () => {
  const learning = new session.Learning(h885.keys);
  learn(learning, 2);
  assert.equal(learning.skip()?.name, 'Activities');
  assert.equal(learning.stateOf('Activities'), 'skipped');
  assert.equal(learning.stateOf('Help'), 'asked');
  assert.equal(learning.stateOf('Enter'), 'waiting');
  assert.equal(learning.undo()?.key.name, 'Activities');
  assert.equal(learning.stateOf('Activities'), 'asked');
  // Undo of a learned key frees its code: 2 is AllOff's no longer, so it can be learned again.
  assert.equal(learning.undo()?.code, 2);
  assert.equal(learn(learning, 2).kind, 'learned');
  assert.equal(learning.stateOf('AllOff'), 'learned');
});

test('a press once every key is answered is noted as nothing asked', () => {
  const learning = new session.Learning(h885.keys.slice(0, 2));
  learn(learning, 2);
  learning.skip();
  const late = learning.press(9);
  assert.deepEqual(late.kind === 'misfit' ? late.misfit : undefined, { code: 9, asked: undefined, reason: 'nothing-asked' });
  assert.equal(learning.skip(), undefined);
});

test('the 880 learns its chevron keys like any other, whatever the drawing narrowed them to', () => {
  const learning = new session.Learning(h880.keys);
  skipTo(learning, 'UpArrow');
  assert.equal(learn(learning, 20).kind, 'learned');
  assert.equal(learn(learning, 52).kind, 'learned');
  assert.deepEqual(learning.rows().filter((r) => r.name.endsWith('Arrow')).map((r) => [r.name, r.code]),
    [['UpArrow', 20], ['DownArrow', 52]]);
});

test('a key that works but is not seen is its own answer, apart from skipped, and undo takes it back', () => {
  const learning = new session.Learning(h885.keys);
  assert.equal(learning.unseen()?.name, 'AllOff');
  assert.equal(learning.skip()?.name, 'Activities');
  assert.equal(learning.stateOf('AllOff'), 'unseen');
  assert.equal(learning.stateOf('Activities'), 'skipped');
  assert.deepEqual(learning.rows().map((r) => r.code), ['not seen', 'skipped']);
  learning.undo();
  assert.equal(learning.undo()?.code, 'not seen');
  assert.equal(learning.stateOf('AllOff'), 'asked');
});

test('the first press of a key is held, and the second press of the same code learns it', () => {
  const learning = new session.Learning(h885.keys);
  const first = learning.press(2);
  assert.equal(first.kind, 'provisional');
  assert.equal(learning.provisional, 2);
  assert.equal(learning.stateOf('AllOff'), 'confirm');
  assert.equal(learning.asked?.name, 'AllOff', 'the key asked stays asked until its second press');
  assert.deepEqual(learning.rows(), [], 'nothing is recorded on one press');
  const second = learning.press(2);
  assert.equal(second.kind, 'learned');
  assert.equal(learning.provisional, undefined);
  assert.equal(learning.stateOf('AllOff'), 'learned');
  assert.equal(learning.asked?.name, 'Activities');
});

test('a second press of another code drops both, keeps the pair as a misfit, and asks the key from the start', () => {
  const learning = new session.Learning(h885.keys);
  learning.press(2);
  const outcome = learning.press(1);
  assert.equal(outcome.kind, 'mismatch');
  assert.deepEqual(outcome.kind === 'mismatch' ? [outcome.key.name, outcome.first, outcome.second] : undefined, ['AllOff', 2, 1]);
  assert.deepEqual(learning.misfits, [{ code: 1, asked: 'AllOff', reason: 'different', first: 2 }]);
  assert.equal(learning.provisional, undefined);
  assert.equal(learning.stateOf('AllOff'), 'asked');
  // From the start: one press of either code is provisional again, not a confirmation.
  assert.equal(learning.press(1).kind, 'provisional');
  assert.equal(learning.press(1).kind, 'learned');
  assert.deepEqual(learning.rows().map((r) => [r.name, r.code]), [['AllOff', 1]]);
});

test('a code already learned is refused on either press, and leaves a first press waiting', () => {
  const learning = new session.Learning(h885.keys);
  learn(learning, 2);
  assert.equal(learning.press(2).kind, 'misfit');
  learning.press(1);
  assert.equal(learning.press(2).kind, 'misfit');
  assert.equal(learning.provisional, 1, 'the refused press neither confirms nor drops the first');
  assert.equal(learning.press(1).kind, 'learned');
});

test('undo during a first press takes back only that press; skip and not seen need no second press', () => {
  const learning = new session.Learning(h885.keys);
  learn(learning, 2);
  learning.press(1);
  assert.deepEqual(learning.undo(), { key: learning.asked, code: 1, provisional: true });
  assert.equal(learning.provisional, undefined);
  assert.equal(learning.asked?.name, 'Activities');
  assert.deepEqual(learning.rows().map((r) => r.code), [2], 'the learned key before it is kept');
  // Skip and not seen answer at once, and a first press made before either goes with it.
  learning.press(9);
  assert.equal(learning.skip()?.name, 'Activities');
  assert.equal(learning.provisional, undefined);
  assert.equal(learning.unseen()?.name, 'Help');
  assert.deepEqual(learning.rows().map((r) => r.code), [2, 'skipped', 'not seen']);
});

/** A Learning class from the published file with one piece of `press` or `undo` replaced. */
async function learningWith(from: string, to: string): Promise<typeof SessionModule.Learning> {
  return ((await publishedWith('session.js', from, to)) as typeof SessionModule).Learning;
}

test('control: with the first press not held, one press learns a key', async () => {
  const Disarmed = await learningWith('if (first === undefined) {', 'if (false) {');
  assert.equal(new Disarmed(h885.keys).press(2).kind, 'learned');
});

test('control: with the comparison of the two presses disarmed, a slip on the second press is learned', async () => {
  const Disarmed = await learningWith('if (first !== undefined && first !== code) {', 'if (false) {');
  const learning = new Disarmed(h885.keys);
  learning.press(2);
  assert.equal(learning.press(1).kind, 'learned');
  assert.deepEqual(learning.rows().map((r) => r.code), [1]);
});

test('control: with undo not knowing a first press, it takes back the key learned before', async () => {
  const Disarmed = await learningWith('if (first !== undefined && asked !== undefined) {', 'if (false) {');
  const learning = new Disarmed(h885.keys);
  learn(learning, 2);
  learning.press(1);
  assert.equal(learning.undo()?.key.name, 'AllOff');
});

test('the keys the test never lit are the known ones no press reached; none when nothing was pressed', () => {
  // On the 885 every key's code is known, so a test of all but Pause and Enter flags exactly those two.
  const all = h885.keys.map((k) => k.scan as number).filter((c) => c !== 55 && c !== 63);
  assert.deepEqual([...session.neverAnswered(h885.keys, all)].sort(), ['Enter', 'Pause']);
  assert.deepEqual([...session.neverAnswered(h885.keys, [])], []);
  // On the 880 a key with no known code is never flagged, since a press of it is just another unknown code;
  // the chevrons are, until 20 or 52 is pressed.
  const flagged880 = session.neverAnswered(h880.keys, [11]);
  assert.ok(!flagged880.has('Activities'));
  assert.ok(flagged880.has('UpArrow') && flagged880.has('DownArrow'));
  assert.ok(!session.neverAnswered(h880.keys, [11, 52]).has('UpArrow'));
});

test('the key test counts different keys, and lists the codes no key on the drawing has', () => {
  assert.deepEqual(session.sweepOf(h880.keys, [11, 11, 10, 52, 99, 10]), { seen: 4, unknown: [10, 99] });
  assert.deepEqual(session.sweepOf([], [5, 6]), { seen: 2, unknown: [5, 6] });
});

test('step 3 lights keys by the map just learned, and the codes the drawing knew for the rest', () => {
  // On the 880 the person learns Activities at 1 and a chevron at 20, and skips the other chevron.
  const learning = new session.Learning(h880.keys);
  learn(learning, 2);
  learn(learning, 1);
  skipTo(learning, 'UpArrow');
  learn(learning, 20);
  learning.skip();
  const map = session.learnedMap(h880.keys, learning.rows());
  const tester = new session.Tester(map);
  // A learned code lights its key; the drawing's own code still lights a key nobody learned (VolumeUp, 13).
  assert.deepEqual(tester.press(1), { code: 1, exact: ['Activities'], possible: [] });
  assert.deepEqual(tester.press(13), { code: 13, exact: ['VolumeUp'], possible: [] });
  // The skipped chevron keeps the drawing's candidates, so 52 may still be it; 20 is the learned one's alone.
  assert.deepEqual(tester.press(20), { code: 20, exact: ['UpArrow'], possible: [] });
  assert.deepEqual(tester.press(52), { code: 52, exact: [], possible: ['DownArrow'] });
  const learned = learning.rows().filter((r) => typeof r.code === 'number').map((r) => r.name);
  assert.deepEqual(session.checkOf(map, learned, [1, 13, 20, 52, 77]), { confirmed: 2, learned: 3, unknown: [77] });
});

test('step 3 confirms only by a press of the learned code: a key learned wrong does not light where pressed', () => {
  // The person meant AllOff but pressed what is Activities, 1; the map lights AllOff for 1, which the person
  // sees is wrong, and pressing AllOff's real code, 2, is a code the map does not have.
  const learning = new session.Learning(h885.keys);
  learn(learning, 1);
  const map = session.learnedMap(h885.keys.slice(0, 1), learning.rows());
  assert.deepEqual(session.checkOf(map, ['AllOff'], [2]), { confirmed: 0, learned: 1, unknown: [2] });
  assert.deepEqual(session.checkOf(map, ['AllOff'], [1]), { confirmed: 1, learned: 1, unknown: [] });
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
  /^key test: \d+ different keys answered$/,
  /^key test, codes no key on the drawing has: (none|\d+(, \d+)*)$/,
  /^[A-Za-z0-9]+( \(.+\))?: (\d+|skipped|not seen)$/,
  /^"[^"]*": \d+$/,
  /^presses that did not fit:$/,
  /^key map check: \d+ of \d+ learned keys confirmed$/,
  /^key map check, codes the map does not have: (none|\d+(, \d+)*)$/,
  /^none$/,
  /^\d+: (already the code of .+|pressed after every key was answered|pressed before the words for the previous key were in|the second press, after \d+ while [A-Za-z0-9 ]+ was asked; both were dropped)$/,
];

/** The lines of a log that match no shape. */
function offShape(log: string): string[] {
  return log.trimEnd().split('\n').filter((line) => !LINE_SHAPES.some((shape) => shape.test(line)));
}

const HEAD = { chosen: 'Harmony 885', reported: 'Harmony 885', skin: 17, firmware: '4.4' };

/** A check of nothing yet, for logs whose third step is not the point. */
const NO_CHECK = { confirmed: 0, learned: 0, unknown: [] };

test('a full 885 log has the head, every key in the order asked, and the presses that did not fit', () => {
  const learning = new session.Learning(h885.keys);
  learn(learning, 2);
  learning.press(2);
  learning.skip();
  learning.unseen();
  // Asked for Menu, the person slips to Exit on the second press: the pair is dropped, then Menu is learned.
  for (const key of asked885.slice(3)) {
    if (key.name === 'Menu') {
      learning.press(key.scan as number);
      learning.press(code(h885.keys, 'Exit'));
    }
    learn(learning, key.scan as number);
  }
  learning.press(7);
  const sweep = session.sweepOf(h885.keys, [2, 1, 2, 99, 41, 120]);
  const map = session.learnedMap(h885.keys, learning.rows());
  const learnedNames = learning.rows().filter((r) => typeof r.code === 'number').map((r) => r.name);
  const check = session.checkOf(map, learnedNames, [2, 3, 120]);
  const log = session.learningLog(HEAD, sweep, check, learning.rows(), learning.misfits);
  assert.deepEqual(offShape(log), []);
  const lines = log.split('\n');
  assert.deepEqual(lines.slice(0, 11), [
    'Harmony key map, from the key reader page',
    'model chosen: Harmony 885',
    'remote reported: Harmony 885, skin 17, firmware 4.4',
    '',
    'key test: 5 different keys answered',
    'key test, codes no key on the drawing has: 99, 120',
    '',
    'keys, in the order asked:',
    'AllOff (OFF): 2',
    'Activities (ACTIVITIES): skipped',
    'Help (HELP): not seen',
  ]);
  assert.ok(!lines.some((l) => l.startsWith('Glow')), 'Glow is not asked, so not in the log');
  // 2 is AllOff's learned code and confirms it; 3 lights Help by the drawing's code, and Help was answered
  // not seen rather than learned, so it confirms nothing; 120 is in no map.
  assert.deepEqual(lines.slice(-3), [
    'key map check: 1 of 52 learned keys confirmed',
    'key map check, codes the map does not have: 120',
    '',
  ]);
  // The steps are called by their names on screen; this project's own word for the first never appears.
  assert.ok(!/sweep/i.test(log));
  assert.ok(lines.includes('Red (the leftmost of the four keys at the bottom of the curve (red)): 20'));
  assert.ok(lines.includes('2: already the code of AllOff while Activities was asked'));
  assert.ok(lines.includes('7: pressed after every key was answered'));
  const menu = code(h885.keys, 'Menu');
  const exit = code(h885.keys, 'Exit');
  assert.ok(lines.includes(`${exit}: the second press, after ${menu} while Menu was asked; both were dropped`));
  assert.ok(lines.includes(`Menu (MENU): ${menu}`), 'the key is logged once, at its confirmed code');
  assert.equal(lines.filter((l) => /^[A-Za-z0-9]+( \(.+\))?: (\d+|skipped|not seen)$/.test(l)).length, 54);
});

test('the log grows answer by answer and loses one on undo, and without a drawing lists keys in the order pressed', () => {
  const learning = new session.Learning(h885.keys);
  const log = () => session.learningLog(HEAD, session.sweepOf(h885.keys, []), NO_CHECK, learning.rows(), learning.misfits);
  const TAIL = '\nkey map check: 0 of 0 learned keys confirmed\nkey map check, codes the map does not have: none\n';
  assert.ok(log().endsWith(`keys, in the order asked:\n\npresses that did not fit:\nnone\n${TAIL}`));
  learning.press(2);
  assert.ok(!log().includes('AllOff'), 'a first press alone is not in the log');
  learning.press(2);
  learning.skip();
  const partial = log();
  assert.deepEqual(offShape(partial), []);
  assert.ok(partial.endsWith(`keys, in the order asked:\nAllOff (OFF): 2\nActivities (ACTIVITIES): skipped\n\npresses that did not fit:\nnone\n${TAIL}`));
  assert.ok(!partial.includes('Enter'), 'a key not reached has no line');
  learning.undo();
  assert.ok(!log().includes('Activities'), 'undo takes its line away');

  const naming = new session.Naming();
  naming.press(11);
  naming.name('the "round" key below SOUND');
  naming.press(12);
  naming.press(13);
  const head = { chosen: 'Harmony 880 Pro', reported: 'Harmony 880 Pro', skin: 39, firmware: '4.4' };
  const named = session.learningLog(head, session.sweepOf([], [11, 12]), NO_CHECK, naming.rows(), naming.misfits, 'pressed');
  assert.deepEqual(offShape(named), []);
  assert.match(named, /keys, in the order pressed:\n"the 'round' key below SOUND": 11\n/);
  assert.match(named, /13: pressed before the words for the previous key were in\n\n/);
  assert.match(named, /key test: 2 different keys answered\nkey test, codes no key on the drawing has: 11, 12\n/);
});

test('control: a line of any other shape is caught, such as a serial number or an answer of another word', () => {
  const log = session.learningLog(HEAD, session.sweepOf([], []), NO_CHECK, [], []);
  assert.deepEqual(offShape(log), []);
  assert.deepEqual(offShape(`${log}Glow (GLOW): not heard\n`), ['Glow (GLOW): not heard']);
  assert.deepEqual(offShape(log.replace('codes no key on the drawing has: none', 'codes no key on the drawing has: 0x1e')),
    ['key test, codes no key on the drawing has: 0x1e']);
  assert.deepEqual(offShape(log.replace('0 of 0 learned keys confirmed', '0 of 0 learned keys confirmed by unit 7')),
    ['key map check: 0 of 0 learned keys confirmed by unit 7']);
  assert.deepEqual(offShape(`${log}serial: 0x1234abcd\n`), ['serial: 0x1234abcd']);
  assert.deepEqual(offShape(log.replace('firmware 4.4', 'firmware 4.4, guid 7f3c')), [
    'remote reported: Harmony 885, skin 17, firmware 4.4, guid 7f3c',
  ]);
});
