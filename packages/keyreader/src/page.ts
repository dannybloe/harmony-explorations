/**
 * The key reader page: connect, choose the model, then three steps: test that every key reaches the page,
 * learn the key map, and check the map by pressing the keys again.
 *
 * This module holds no device. Everything it knows about the remote comes through the `KeyLink` that
 * `connect` returns, which can read the key and let go and nothing else, so nothing written here can send
 * a byte of its own to a remote: `link.ts` explains why that is the whole point. **The three steps add no
 * message to the remote**: they consume the presses `onKey` receives, todo-prepare-885.md 2.6.2 and 2.6.3,
 * and if a mode ever seemed to need more from the remote, that would be a change to `link.ts` and its
 * tests, not to this file.
 *
 * The flow, in the order a person meets it:
 *
 *   1. **Connect.** The remote says which model it is, by its skin, `link.ts`.
 *   2. **Choose the model.** The page proposes the model the remote reported and the person confirms it or
 *      picks another of the models the page reads keys on, `WATCH_BY_SKIN`. The choice decides only what
 *      is drawn and what the log says was chosen; where the key is read stays the remote's own word, since
 *      that is a fact about its firmware and not about its face.
 *   3. **Step 1, test all keys**: press every key once. The page cannot know whether every key of a model
 *      whose codes it does not know works, so the person judges, and every press says at once that a key
 *      was received. A key whose code the drawing knows lights and stays lit; a code no key on the drawing
 *      has is counted and listed. The person moves on whenever they like.
 *   4. **Step 2, learn the key map**, `session.ts`, one key asked at a time. A key that never answered in
 *      step 1 is flagged when it is asked, with the answer that it works but the page does not see it put
 *      first, because that is the likeliest answer for it; the person is never made to give it.
 *   5. **Step 3, check the key map**: every press lights a key by the map just learned, plus the codes the
 *      drawing already knew, so the person sees at once whether each key was learned right; a code the map
 *      does not have is listed. This is the old free standing test, given a purpose.
 *   6. **The key map**, beside the steps all along, growing as answers come, to copy and send.
 *
 * Every step shows the model's drawing where one exists (`drawings.js`, built from `reference/silhouettes/`),
 * and a plain list where none does, the Harmony 880 Pro and 720 today.
 *
 * Presses that arrive before a model is chosen are shown in the readout and go nowhere else: nothing has
 * been asked yet, and a mode starts clean when it starts.
 */
import { NoReply, Refused, connect } from './link.ts';
import type { KeyLink, RemoteSeen } from './link.ts';
import { PressTracker } from './presses.ts';
import type { KeyEvent } from './presses.ts';
import { Learning, Naming, Tester, checkOf, learnedMap, learningLog, misfitWords, neverAnswered, sweepOf } from './session.ts';
import type { Drawing, FaceKey, MapKey, Misfit } from './session.ts';
import { Face } from './face.ts';
import { DRAWINGS } from './drawings.js';
import { WATCH_BY_SKIN } from '@harmony/usb/keys';
import type { WebHid } from './webhid.ts';

/**
 * Time between two polls. A poll this often caught every press when an 885's keys were measured,
 * `tests/test_harmony_885_keys.py`, and a press that is missed still shows in the copy of the last key.
 */
const POLL_MS = 25;

/** The page's own elements, looked up once; a missing one is a broken page and says so at once. */
function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (found === null) throw new Error(`the page has no element #${id}`);
  return found as T;
}

const connectButton = element<HTMLButtonElement>('connect');
const stopButton = element<HTMLButtonElement>('stop');
const statusLine = element('status');
const chooseSection = element('choose');
const reportedLine = element('reported');
const modelsBox = element('models');
const confirmButton = element<HTMLButtonElement>('confirm');
const workSection = element('work');
const learnButton = element<HTMLButtonElement>('mode-learn');
const testButton = element<HTMLButtonElement>('mode-test');
const changeButton = element<HTMLButtonElement>('change');
const drawingBox = element('drawing');
const keyList = element('keylist');
const modelLine = element('model-line');
const learnPanel = element('learn-panel');
const promptLine = element('prompt');
const namingForm = element<HTMLFormElement>('naming');
const nameInput = element<HTMLInputElement>('name');
const skipButton = element<HTMLButtonElement>('skip');
const unseenButton = element<HTMLButtonElement>('unseen');
const flagLine = element('flag');
const nextButton = element<HTMLButtonElement>('next');
const checkButton = element<HTMLButtonElement>('mode-check');
const nextCheckButton = element<HTMLButtonElement>('next-check');
const checkPanel = element('check-panel');
const checkCount = element('check-count');
const checkLegend = element('check-legend');
const checkUnknown = element('check-unknown');
const checkUnknownNone = element('check-unknown-none');
const checkClearButton = element<HTMLButtonElement>('check-clear');
const undoButton = element<HTMLButtonElement>('undo');
const finishButton = element<HTMLButtonElement>('finish');
const progressLine = element('progress');
const learnLegend = element('learn-legend');
const testLegend = element('test-legend');
const testPanel = element('test-panel');
const testCount = element('test-count');
const unknownList = element('unknown');
const unknownNone = element('unknown-none');
const testClearButton = element<HTMLButtonElement>('test-clear');
const notice = element('notice');
const heldValue = element('held');
const lastValue = element('last');
const logSection = element('log-section');
const logBox = element<HTMLTextAreaElement>('log');
const copyButton = element<HTMLButtonElement>('copy');

/** One model the person can choose: its skin, its name, and its drawing where one exists. */
interface ModelOption {
  readonly skin: number;
  readonly name: string;
  readonly drawing: Drawing | undefined;
}

/** The models offered: every model the page reads keys on, by skin, in the order of their skins. */
const OPTIONS: readonly ModelOption[] = Object.entries(WATCH_BY_SKIN)
  .map(([skin, watch]) => ({
    skin: Number(skin),
    name: watch.name,
    drawing: DRAWINGS.find((drawing) => drawing.skins.includes(Number(skin))),
  }))
  .sort((a, b) => a.skin - b.skin);

/**
 * Everything the page holds for one chosen model, kept while the person switches modes or models, so that
 * looking at another model does not throw away half a learned remote.
 */
interface ModelSession {
  readonly option: ModelOption;
  /** With a drawing, keys are asked for; without one, they are pressed and then named. */
  readonly learning: Learning | Naming;
  /** The codes pressed in step 1, replayed into a fresh `Tester` on every redraw. */
  readonly tested: number[];
  /** The codes pressed in step 3, the same way. */
  readonly checked: number[];
}

/** The three steps: test all keys, learn the key map, check it. */
type Step = 'test' | 'learn' | 'check';

let link: KeyLink | undefined;
let running = false;
let remote: RemoteSeen | undefined;
let session: ModelSession | undefined;
// Step 1 comes first, so a model starts there.
let mode: Step = 'test';
let face: Face | undefined;
const sessions = new Map<number, ModelSession>();

function say(message: string, kind: 'info' | 'problem' = 'info'): void {
  statusLine.textContent = message;
  statusLine.dataset['kind'] = kind;
}

/** A code as the readout shows it: the number, or a dash for no key. */
function code(value: number): string {
  return value === 0 ? '-' : String(value);
}

/**
 * A line in the notice. A press that did not fit flashes, so that it is seen while looking at the remote; a
 * key received in step 1 pulses, so that every press gives a signal the person can see without looking for
 * it, whether or not the drawing knows the key.
 */
function tell(message: string, kind: 'plain' | 'misfit' | 'received' = 'plain'): void {
  notice.textContent = message;
  notice.classList.remove('flash', 'pulse');
  if (kind === 'plain') {
    delete notice.dataset['kind'];
    return;
  }
  notice.dataset['kind'] = kind;
  // Reading the layout between the two lets the animation start again on a second press in a row.
  void notice.offsetWidth;
  notice.classList.add(kind === 'misfit' ? 'flash' : 'pulse');
}

// ------------------------------------------------------------------------------------------------
// Choosing the model.

/** Show the models, the one the remote reported chosen and said to be so. */
function showChoice(seen: RemoteSeen): void {
  const proposed = OPTIONS.find((option) => option.skin === seen.skin);
  reportedLine.textContent = `Your remote says it is a ${seen.name}, firmware ${seen.firmware}. `
    + 'If the name printed on it says otherwise, choose that one.';
  modelsBox.querySelectorAll('label').forEach((label) => label.remove());
  for (const option of OPTIONS) {
    const label = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'model';
    radio.value = String(option.skin);
    radio.checked = option === (session?.option ?? proposed);
    const name = document.createElement('strong');
    name.textContent = option.name;
    const note = document.createElement('span');
    note.className = 'note';
    const notes = [];
    if (option === proposed) notes.push('what your remote reports');
    notes.push(option.drawing === undefined ? 'no drawing yet: you name each key as you press it' : 'with a drawing');
    note.textContent = notes.join('; ');
    label.append(radio, name, note);
    modelsBox.append(label);
  }
  workSection.hidden = true;
  chooseSection.hidden = false;
}

confirmButton.addEventListener('click', () => {
  const picked = modelsBox.querySelector<HTMLInputElement>('input[name="model"]:checked');
  const option = OPTIONS.find((o) => String(o.skin) === picked?.value);
  if (option === undefined) return;
  let chosen = sessions.get(option.skin);
  if (chosen === undefined) {
    chosen = {
      option,
      learning: option.drawing === undefined ? new Naming() : new Learning(option.drawing.keys),
      tested: [],
      checked: [],
    };
    sessions.set(option.skin, chosen);
  }
  session = chosen;
  // A model chosen for the first time starts with step 1; one returned to carries on where it was.
  if (chosen.tested.length === 0 && !started(chosen)) setModeButtons('test');
  chooseSection.hidden = true;
  workSection.hidden = false;
  modelLine.textContent = option.name;
  // A drawing is built once per choice; a model without one gets the list instead.
  face = option.drawing === undefined ? undefined : new Face(drawingBox, option.drawing);
  if (face === undefined) drawingBox.replaceChildren();
  keyList.hidden = face !== undefined;
  tell('');
  render();
});

changeButton.addEventListener('click', () => {
  if (remote !== undefined) showChoice(remote);
});

// ------------------------------------------------------------------------------------------------
// The modes.

/** Whether any key of a model has been learned or named yet. */
function started(current: ModelSession): boolean {
  return current.learning instanceof Learning ? current.learning.answers.length > 0 : current.learning.named.length > 0;
}

/** Switch the step and the three buttons that show it, without redrawing. */
function setModeButtons(next: Step): void {
  mode = next;
  testButton.setAttribute('aria-pressed', String(mode === 'test'));
  learnButton.setAttribute('aria-pressed', String(mode === 'learn'));
  checkButton.setAttribute('aria-pressed', String(mode === 'check'));
}

function setMode(next: Step): void {
  setModeButtons(next);
  tell('');
  render();
}

learnButton.addEventListener('click', () => setMode('learn'));
testButton.addEventListener('click', () => setMode('test'));
nextButton.addEventListener('click', () => setMode('learn'));
checkButton.addEventListener('click', () => setMode('check'));
nextCheckButton.addEventListener('click', () => setMode('check'));

/** The words for a key on the chosen drawing, by its name, for a notice about another key. */
function wordsOf(name: string | undefined): string {
  const key = session?.option.drawing?.keys.find((k) => k.name === name);
  return key?.words ?? name ?? 'another key';
}

/** A misfit in the page's words, naming keys by their print rather than by the drawing's names. */
function misfitLine(misfit: Misfit): string {
  const named = { ...misfit, other: wordsOf(misfit.other), asked: misfit.asked === undefined ? undefined : wordsOf(misfit.asked) };
  return `Not recorded: ${misfit.code}, ${misfitWords(named)}.`;
}

/** Where a mode hooks in: every press goes to the mode in force; releases change nothing. */
function onKey(event: KeyEvent): void {
  if (event.kind !== 'press' || session === undefined || workSection.hidden) return;
  if (mode === 'test') {
    session.tested.push(event.code);
    const key = face?.drawing.keys.find((k) => k.scan === event.code);
    tell(`Key received: ${key === undefined ? event.code : `${key.words} (${event.code})`}.`, 'received');
  } else if (mode === 'check') {
    session.checked.push(event.code);
    const lit = new Tester(mapOf(session)).press(event.code);
    const names = [...lit.exact, ...lit.possible];
    tell(names.length === 0
      ? `${event.code} is not in the key map.`
      : `${event.code} lights ${names.map(wordsOf).join(' or ')}.`, names.length === 0 ? 'misfit' : 'plain');
  } else if (session.learning instanceof Learning) {
    const outcome = session.learning.press(event.code);
    if (outcome.kind === 'learned') tell(`${outcome.key.words}: ${outcome.code}.`);
    else tell(misfitLine(outcome.misfit), 'misfit');
  } else {
    const outcome = session.learning.press(event.code);
    if (outcome.kind === 'misfit') {
      const misfit = outcome.misfit;
      tell(misfit.reason === 'naming'
        ? `Not recorded: ${misfit.code}, pressed before key ${session.learning.pending} was named. Name that one first.`
        : `Not recorded: ${misfit.code}, already the code of ${misfit.other}.`, 'misfit');
    } else {
      tell('');
      nameInput.value = '';
    }
  }
  render();
  if (mode === 'learn' && session.learning instanceof Naming && session.learning.pending !== undefined) nameInput.focus();
}

skipButton.addEventListener('click', () => {
  if (session === undefined) return;
  if (session.learning instanceof Learning) {
    const skipped = session.learning.skip();
    if (skipped !== undefined) tell(`Skipped: ${skipped.words}.`);
  } else {
    const dropped = session.learning.discard();
    if (dropped !== undefined) tell(`Forgot the press of ${dropped}.`);
  }
  render();
});

unseenButton.addEventListener('click', () => {
  if (session === undefined || !(session.learning instanceof Learning)) return;
  const unseen = session.learning.unseen();
  if (unseen !== undefined) tell(`Noted: ${unseen.words} works, but the page does not see it.`);
  render();
});

undoButton.addEventListener('click', () => {
  if (session === undefined) return;
  if (session.learning instanceof Learning) {
    const undone = session.learning.undo();
    if (undone !== undefined) tell(`Taken back: ${undone.key.words}. Press it again, or skip it.`);
  } else {
    const undone = session.learning.undo();
    if (undone !== undefined) tell(`Taken back: ${undone.words}.`);
  }
  render();
});

// The key map is on screen all along; done only brings it and its Copy button into view.
finishButton.addEventListener('click', () => {
  logSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  copyButton.focus({ preventScroll: true });
});

namingForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (session === undefined || !(session.learning instanceof Naming)) return;
  const named = session.learning.name(nameInput.value);
  if (named !== undefined) {
    tell(`${named.words}: ${named.code}.`);
    nameInput.value = '';
  }
  render();
});

checkClearButton.addEventListener('click', () => {
  if (session === undefined) return;
  session.checked.length = 0;
  tell('');
  render();
});

testClearButton.addEventListener('click', () => {
  if (session === undefined) return;
  session.tested.length = 0;
  tell('');
  render();
});

// Copy puts exactly the box's text on the clipboard, the text the person can read and scroll through, and
// nothing more; selecting it as well shows what was taken.
copyButton.addEventListener('click', () => {
  logBox.select();
  navigator.clipboard.writeText(logBox.value).then(
    () => tell('Copied. Paste it into a new issue.'),
    () => tell('Select the text and copy it by hand: the browser did not let the page copy it.'),
  );
});

// ------------------------------------------------------------------------------------------------
// Drawing the state.

/** Redraw everything from the session: the cheapest way to never show a state the session is not in. */
function render(): void {
  if (session === undefined) return;
  learnPanel.hidden = mode !== 'learn';
  testPanel.hidden = mode !== 'test';
  checkPanel.hidden = mode !== 'check';
  // The legends describe the drawing's colours, so a model shown as a list has none.
  learnLegend.hidden = face === undefined;
  testLegend.hidden = face === undefined;
  checkLegend.hidden = face === undefined;
  face?.clear();
  if (mode === 'learn') renderLearning(session);
  else if (mode === 'test') renderTest(session);
  else renderCheck(session);
  renderLog(session);
}

/** The key test's result for the log: always against the drawing, which a model without one does not have. */
function sweepFor(current: ModelSession): ReturnType<typeof sweepOf> {
  return sweepOf(current.option.drawing?.keys ?? [], current.tested);
}

/**
 * The map step 3 lights keys by: the drawing's keys at their learned codes, and the codes the drawing
 * already knew for the rest; without a drawing, the keys named in step 2.
 */
function mapOf(current: ModelSession): MapKey[] {
  if (current.option.drawing === undefined) {
    return (current.learning as Naming).named.map((n) => ({ name: n.words, scan: n.code, candidates: [] }));
  }
  return learnedMap(current.option.drawing.keys, current.learning.rows());
}

/** The keys learned in step 2 with a code, by name, which step 3 can confirm. */
function learnedNames(current: ModelSession): string[] {
  return current.learning.rows().filter((row) => typeof row.code === 'number').map((row) => row.name);
}

/** The key map check's result for the log and for step 3's count. */
function checkFor(current: ModelSession): ReturnType<typeof checkOf> {
  return checkOf(mapOf(current), learnedNames(current), current.checked);
}

/** The keys a test lights up: the drawing's, or without one the keys named in this visit. */
function testKeys(current: ModelSession): readonly Pick<FaceKey, 'name' | 'scan' | 'candidates'>[] {
  if (current.option.drawing !== undefined) return current.option.drawing.keys;
  const naming = current.learning as Naming;
  return naming.named.map((n) => ({ name: n.words, scan: n.code, candidates: [] }));
}

function renderLearning(current: ModelSession): void {
  const learning = current.learning;
  if (learning instanceof Learning) {
    namingForm.hidden = true;
    for (const key of learning.keys) {
      const state = learning.stateOf(key.name);
      face?.look(key.name, state === 'waiting' ? undefined : state);
    }
    const asked = learning.asked;
    promptLine.textContent = asked === undefined ? 'Every key is answered.' : `Press ${asked.words}`;
    // A key the test never saw is asked like any other, with the answer that fits it most often put first.
    const flagged = asked !== undefined && neverAnswered(learning.keys, current.tested).has(asked.name);
    flagLine.hidden = !flagged;
    unseenButton.hidden = false;
    unseenButton.disabled = asked === undefined;
    unseenButton.classList.toggle('primary', flagged);
    // The tag beside the drawing names a key by its print; a key named by its position is pointed at.
    face?.point(asked?.name, asked === undefined ? '' : asked.words.length <= 12 ? asked.words : 'this key');
    const count = (code: 'skipped' | 'not seen') => learning.answers.filter((a) => a.code === code).length;
    const skipped = count('skipped');
    const unseen = count('not seen');
    const learned = learning.answers.length - skipped - unseen;
    progressLine.textContent = `${learning.answers.length} of ${learning.keys.length} keys answered: `
      + `${learned} learned, ${skipped} skipped, ${unseen} not seen.`;
    skipButton.disabled = asked === undefined;
    skipButton.textContent = 'Skip: my remote has no such key';
    undoButton.disabled = learning.answers.length === 0;
  } else {
    const pending = learning.pending;
    // Without a drawing nothing is asked, so no key can be answered as not seen.
    unseenButton.hidden = true;
    flagLine.hidden = true;
    namingForm.hidden = pending === undefined;
    promptLine.textContent = pending === undefined
      ? 'Press a key on your remote.'
      : `You pressed key ${pending}.`;
    progressLine.textContent = `${learning.named.length} keys named.`;
    skipButton.disabled = pending === undefined;
    skipButton.textContent = 'Forget that press';
    undoButton.disabled = learning.named.length === 0;
    keyList.replaceChildren(...learning.named.map((n) => {
      const item = document.createElement('li');
      item.textContent = `${n.words}: ${n.code}`;
      return item;
    }));
  }
}

function renderTest(current: ModelSession): void {
  const tester = new Tester(testKeys(current));
  for (const pressed of current.tested) tester.press(pressed);
  if (face !== undefined) {
    for (const key of face.drawing.keys) {
      const state = tester.stateOf(key.name);
      face.look(key.name, state === 'unlit' ? undefined : state);
    }
  } else {
    keyList.replaceChildren(...testKeys(current).map((key) => {
      const item = document.createElement('li');
      item.textContent = `${key.name}: ${key.scan ?? '?'}`;
      if (tester.stateOf(key.name) === 'lit') item.dataset['kr'] = 'lit';
      return item;
    }));
  }
  // How many different keys reached the page is the measure that works for every model; how many of the
  // drawing's keys lit says which ones, where the drawing knows their codes.
  const seen = new Set(current.tested).size;
  const others = tester.unknown.length;
  testCount.textContent = tester.total === 0
    ? `${seen} different keys have reached the page.`
    : `${seen} different keys have reached the page: ${tester.answered} of the ${tester.total} keys `
      + `${face === undefined ? 'named' : 'on the drawing'} are marked, and ${others} other keys answered.`;
  unknownList.replaceChildren(...tester.unknown.map((value) => {
    const item = document.createElement('li');
    item.textContent = String(value);
    return item;
  }));
  unknownNone.hidden = tester.unknown.length > 0;
}

function renderCheck(current: ModelSession): void {
  const map = mapOf(current);
  const tester = new Tester(map);
  for (const pressed of current.checked) tester.press(pressed);
  if (face !== undefined) {
    for (const key of map) {
      const state = tester.stateOf(key.name);
      face.look(key.name, state === 'unlit' ? undefined : state);
    }
  } else {
    keyList.replaceChildren(...map.map((key) => {
      const item = document.createElement('li');
      item.textContent = `${key.name}: ${key.scan ?? '?'}`;
      if (tester.stateOf(key.name) === 'lit') item.dataset['kr'] = 'lit';
      return item;
    }));
  }
  const check = checkFor(current);
  checkCount.textContent = check.learned === 0
    ? 'No keys are learned yet: learn them in step 2 first.'
    : `${check.confirmed} of the ${check.learned} keys you learned have lit when pressed.`;
  checkUnknown.replaceChildren(...check.unknown.map((value) => {
    const item = document.createElement('li');
    item.textContent = String(value);
    return item;
  }));
  checkUnknownNone.hidden = check.unknown.length > 0;
}

/**
 * The key map, shown all along, both steps, and grown as answers come: an answer appears as it is given and
 * goes on undo, since the box is rewritten from the session every time. What the box holds is exactly what
 * Copy copies. When it grows, it is scrolled to the end so the newest lines are in view.
 */
function renderLog(current: ModelSession): void {
  if (remote === undefined) return;
  const head = { chosen: current.option.name, reported: remote.name, skin: remote.skin, firmware: remote.firmware };
  const learning = current.learning;
  const sweep = sweepFor(current);
  const check = checkFor(current);
  const text = learning instanceof Learning
    ? learningLog(head, sweep, check, learning.rows(), learning.misfits)
    : learningLog(head, sweep, check, learning.rows(), learning.misfits, 'pressed');
  if (text === logBox.value) return;
  const grew = text.length > logBox.value.length;
  logBox.value = text;
  if (grew) logBox.scrollTop = logBox.scrollHeight;
}

// ------------------------------------------------------------------------------------------------
// The connection, as 2.6.1 built it.

/** Words for a failure that a person can act on, rather than the error's own text. */
function explain(error: unknown): string {
  if (error instanceof Refused) return `Not read: ${error.message}.`;
  if (error instanceof NoReply) return 'The remote stopped answering. Check the cable, then connect again.';
  if (error instanceof Error && error.name === 'NotFoundError') return 'No remote was chosen.';
  return `Something went wrong: ${error instanceof Error ? error.message : String(error)}`;
}

async function poll(open: KeyLink): Promise<void> {
  const tracker = new PressTracker();
  while (running) {
    const state = await open.readKeys();
    heldValue.textContent = code(state.held);
    lastValue.textContent = code(state.last);
    for (const event of tracker.update(state.held, state.last)) onKey(event);
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

async function start(): Promise<void> {
  const hid = (navigator as Navigator & { hid?: WebHid }).hid;
  if (hid === undefined) {
    say('This browser cannot talk to USB devices. Use Chrome or Edge on a computer.', 'problem');
    return;
  }
  connectButton.disabled = true;
  try {
    say('Choose your remote in the window the browser opens.');
    link = await connect(hid);
    if (link === undefined) {
      say('No remote was chosen.');
      return;
    }
    // A different remote is a different visit: what was learned on the last one is not this one's.
    if (remote !== undefined && remote.skin !== link.remote.skin) {
      sessions.clear();
      session = undefined;
    }
    remote = link.remote;
    stopButton.disabled = false;
    running = true;
    say(`Connected to a ${remote.name}.`);
    if (session === undefined) showChoice(remote);
    else render();
    await poll(link);
    say('Stopped. You can unplug the remote.');
  } catch (error) {
    say(explain(error), 'problem');
  } finally {
    running = false;
    await link?.close().catch(() => undefined);
    link = undefined;
    connectButton.disabled = false;
    stopButton.disabled = true;
  }
}

connectButton.addEventListener('click', () => {
  void start();
});

stopButton.addEventListener('click', () => {
  // The loop finishes the read it is in and then lets go of the remote, in `start`'s finally.
  running = false;
  stopButton.disabled = true;
});

// The remote unplugged mid-read ends the loop through its next read failing; this only says why.
(navigator as Navigator & { hid?: WebHid }).hid?.addEventListener('disconnect', () => {
  if (running) say('The remote was unplugged.', 'problem');
  running = false;
});

// The tag beside the drawing is placed from the key's box on screen, which moves when the window does.
window.addEventListener('resize', () => render());
