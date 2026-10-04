// The infrared monitor's page. What arrives is a stream of frames from the bench server, each already
// matched and compared there (packages/bench/src/irmonitor.ts); this page only arranges them. A press
// is one command: a repeat frame belongs to the press before it and updates that press rather than
// adding a line, since a held key is one thing that happened.

import { $, api, clear, el } from './dom.js';

/**
 * Every press, by the `seq` of its first frame.
 * @type {Map<number, {frame: any, repeats: any[], item: HTMLLIElement}>}
 */
const presses = new Map();
/** The press shown in the two large panels. */
let shown;
/** Whether a new press replaces the one shown. Off once somebody picks one from the list. */
let live = true;
let unknown = 0;

const ms = (us) => `${(us / 1000).toFixed(us < 10000 ? 1 : 0)} ms`;
const clock = (iso) => iso.slice(11, 23);

/** One name per device and command, with the bench remotes that hold it. */
function namesOf(frame) {
  const byName = new Map();
  for (const one of frame.matches) {
    const name = `${one.device} · ${one.command ?? `code ${one.code}`}`;
    const list = byName.get(name) ?? [];
    if (!list.includes(one.config)) list.push(one.config);
    byName.set(name, list);
  }
  return [...byName.entries()];
}

/**
 * The headline name: one entry per device. A code number belongs to one configuration, so the same
 * command held by five bench remotes is five numbers, and listing them read as five candidates where
 * there is one command. A device whose command the catalogue did not name is said to be unnamed, and
 * the numbers stay in the panel beside it.
 */
function headline(frame) {
  const byDevice = new Map();
  for (const one of frame.matches) {
    const entry = byDevice.get(one.device) ?? { named: new Set(), codes: new Set() };
    if (one.command !== undefined && one.command !== null) entry.named.add(one.command);
    entry.codes.add(one.code);
    byDevice.set(one.device, entry);
  }
  return [...byDevice.entries()].map(([device, entry]) => {
    if (entry.named.size > 0) return `${device} · ${[...entry.named].join(' / ')}`;
    return entry.codes.size === 1 ? `${device} · code ${[...entry.codes][0]}` : `${device} · unnamed command`;
  });
}

function title(frame) {
  if (frame.bare) return 'Repeat signal only, its command was not heard';
  const names = headline(frame);
  if (names.length > 0) return names.join(' / ');
  if (frame.guesses.length > 0) return 'Not on a bench remote';
  return 'Unknown code';
}

function onFrame(frame) {
  if (frame.repeatOf !== undefined) {
    const press = presses.get(frame.repeatOf);
    if (press === undefined) return;
    press.repeats.push(frame);
    press.item.querySelector('.held').textContent = heldText(press);
    if (shown === frame.repeatOf) showFacts(press);
    return;
  }
  const item = document.createElement('li');
  const known = frame.matches.length > 0;
  if (!known) {
    item.className = 'unknown';
    unknown += 1;
  }
  item.append(el('span', clock(frame.at), 'when'));
  item.append(el('span', title(frame), 'what'));
  item.append(el('span', '', 'held'));
  item.addEventListener('click', () => {
    setLive(false);
    show(frame.seq);
  });
  $('list').prepend(item);
  const press = { frame, repeats: [], item };
  presses.set(frame.seq, press);
  $('count-presses').textContent = String(presses.size);
  $('count-unknown').textContent = String(unknown);
  if (live || shown === undefined) show(frame.seq);
}

function heldText(press) {
  return press.repeats.length === 0 ? '' : `held ×${press.repeats.length}`;
}

function show(seq) {
  const press = presses.get(seq);
  if (press === undefined) return;
  shown = seq;
  for (const [key, one] of presses) one.item.setAttribute('aria-selected', String(key === seq));
  $('empty').hidden = true;
  $('last-body').hidden = false;
  $('last-title').textContent = live ? 'Last command' : 'Selected command';
  showFacts(press);
  showSignal(press.frame);
}

function showFacts(press) {
  const { frame, repeats } = press;
  const names = namesOf(frame);
  const name = $('name');
  name.textContent = title(frame);
  name.className = names.length > 0 && !frame.bare ? 'big' : 'big unknown';

  const holders = clear($('holders'));
  const remotes = [...new Set(frame.matches.map((one) => one.config))];
  if (frame.bare) {
    holders.append(el('span', `fits ${frame.matches.length} stored codes on ${remotes.length} remotes`, 'chip'));
  } else {
    for (const remote of remotes) holders.append(el('span', remote, 'chip'));
  }

  const within = frame.compare?.within ?? [];
  const good = within.filter(Boolean).length;
  const gaps = repeats.map((one) => one.gapUs).filter((gap) => gap !== undefined);
  const facts = [
    ['time', clock(frame.at)],
    ['pause before', frame.gapUs === undefined ? 'first heard' : ms(frame.gapUs)],
    ['repeats', String(repeats.length)],
    ['pause between repeats', gaps.length === 0 ? '' : ms(gaps.reduce((a, b) => a + b, 0) / gaps.length)],
    ['code', frame.number === undefined ? 'not a pulse distance code' : `0x${frame.number}`],
    ['bits', frame.bits === undefined ? '' : String(frame.bits)],
    ['frame length', ms(frame.pulses.reduce((n, one) => n + one.us, 0))],
    ['durations', String(frame.pulses.length)],
    ['within tolerance', frame.compare === undefined ? 'nothing stored to compare' : `${good} of ${within.length}`,
      frame.compare !== undefined && good < within.length],
  ];
  const list = clear($('facts'));
  for (const [label, value, off] of facts) {
    const cell = el('div');
    cell.append(el('dt', label));
    cell.append(el('dd', value, off ? 'off' : undefined));
    list.append(cell);
  }

  const guesses = $('guesses');
  clear(guesses);
  guesses.hidden = frame.guesses.length === 0;
  if (frame.guesses.length > 0) {
    guesses.append(el('p', 'What Logitech’s catalogue calls this number, and in how many of its code tables:', 'hint'));
    for (const one of frame.guesses) guesses.append(el('span', `${one.name} (${one.codesets})`, 'chip'));
  }
}

function showSignal(frame) {
  const stored = frame.compare?.stored;
  const first = frame.matches[0];
  $('signal-head').textContent = first === undefined
    ? 'no stored code matches this frame, so there is nothing to compare it with'
    : `stored: ${first.device} code ${first.code} in ${first.config}${first.repeat ? ', its repeat block' : ''}`;
  drawWave(frame.pulses, stored);
  const table = clear($('durations'));
  const head = document.createElement('tr');
  for (const label of ['#', 'kind', 'heard, µs', 'stored, µs', 'difference']) head.append(el('th', label));
  table.append(head);
  const length = Math.max(frame.pulses.length, stored?.length ?? 0);
  for (let i = 0; i < length; i += 1) {
    const heard = frame.pulses[i];
    const want = stored?.[i];
    const ok = frame.compare?.within[i] ?? false;
    const tr = document.createElement('tr');
    tr.append(el('td', i, 'num mono dim'));
    tr.append(el('td', (heard ?? want).mark ? 'flash' : 'pause', 'dim'));
    tr.append(el('td', heard?.us ?? '', 'num mono'));
    tr.append(el('td', want?.us ?? '', 'num mono'));
    const diff = heard === undefined || want === undefined ? '' : `${heard.us - want.us > 0 ? '+' : ''}${heard.us - want.us}`;
    tr.append(el('td', diff, stored === undefined || ok ? 'num mono' : 'num mono off'));
    table.append(tr);
  }
}

/** Two rows of flashes on one time axis, heard above stored. Drawn with the DOM, no inline style. */
function drawWave(heard, stored) {
  const svgNs = 'http://www.w3.org/2000/svg';
  const total = Math.max(...[heard, stored ?? []].map((list) => list.reduce((n, one) => n + one.us, 0)));
  const width = 1000;
  const scale = width / Math.max(total, 1);
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} 72`);
  const lane = (pulses, y, cls, label) => {
    let t = 0;
    for (const one of pulses) {
      if (one.mark) {
        const rect = document.createElementNS(svgNs, 'rect');
        rect.setAttribute('x', String(t * scale));
        rect.setAttribute('y', String(y));
        rect.setAttribute('width', String(Math.max(one.us * scale, 0.5)));
        rect.setAttribute('height', '20');
        rect.setAttribute('class', cls);
        svg.append(rect);
      }
      t += one.us;
    }
    const text = document.createElementNS(svgNs, 'text');
    text.setAttribute('x', '2');
    text.setAttribute('y', String(y - 3));
    text.textContent = label;
    svg.append(text);
  };
  lane(heard, 14, 'heard', 'heard');
  if (stored !== undefined) lane(stored, 48, 'stored', 'stored');
  const wave = clear($('wave'));
  wave.append(svg);
  wave.append(el('p', `${ms(total)} across`, 'hint'));
}

function setLive(on) {
  live = on;
  const button = $('live');
  button.setAttribute('aria-pressed', String(on));
  button.textContent = on ? 'following live' : 'follow live';
  if (on && presses.size > 0) show(Math.max(...presses.keys()));
}

function status(event) {
  const pill = $('status');
  pill.textContent = event.listening ? 'listening on the Flirc' : `not listening: ${event.detail}`;
  pill.className = event.listening ? 'pill ok' : 'pill bad';
}

async function start() {
  await loadTests();
  try {
    const open = await api('/api/ir/run');
    if (open !== null) showRun(open);
  } catch {
    // No recordings in this bench.
  }
  try {
    const recent = await api('/api/ir/recent');
    for (const frame of recent.frames) onFrame(frame);
  } catch {
    // A bench without the monitor; the stream below says so too.
  }
  const events = new EventSource('/api/ir/events');
  events.onmessage = (message) => {
    const event = JSON.parse(message.data);
    if (event.type === 'status') status(event);
    else if (event.type === 'frame') onFrame(event.frame);
    else if (event.type === 'run') showRun(event.run);
  };
  events.onerror = () => status({ listening: false, detail: 'the bench is not answering' });
}

// Record and Test. The server keeps the run and judges it (packages/bench/src/irsession.ts); this
// page shows it and sends Start, Next and Stop.

let mode = 'live';
/** @type {any} */
let run;
/** @type {{id: string, definition: any}[]} */
let tests = [];
let clockTimer;
/** Which step the note field belongs to, so it is emptied when the step changes and not on every frame. */
let problemStep;

function setMode(next) {
  mode = next;
  for (const button of document.querySelectorAll('.modes button')) {
    button.setAttribute('aria-pressed', String(button.dataset.mode === next));
  }
  const live = next === 'live';
  $('last').hidden = !live;
  $('signal').hidden = !live;
  $('run').hidden = live;
  $('timeline').hidden = live;
  $('record-setup').hidden = next !== 'record';
  $('test-setup').hidden = next !== 'test';
  showRun(run);
}

async function loadTests() {
  try {
    tests = await api('/api/ir/tests');
  } catch {
    tests = [];
  }
  const pick = clear($('test-pick'));
  for (const one of tests) {
    const option = el('option', one.definition.name);
    option.value = one.id;
    pick.append(option);
  }
  aboutTest();
}

function chosenTest() {
  return tests.find((one) => one.id === $('test-pick').value);
}

function aboutTest() {
  const chosen = chosenTest();
  $('test-about').textContent = chosen === undefined
    ? 'no tests in packages/bench/irtests'
    : chosen.definition.description ?? '';
  showSteps();
}

const open = () => run !== undefined && run !== null && run.endedAt === undefined;

/** The run on screen is the test's own, so its steps are what the checklist shows. */
const runIsChosenTest = () => run?.kind === 'test' && (open() || run.name === chosenTest()?.definition.name);

function showRun(next) {
  run = next ?? run;
  const running = open();
  $('run-title').textContent = mode === 'test' ? (running ? run.name : 'Test') : 'Recording';
  $('run-setup').hidden = running;
  // While a test runs, the picker shows it, so the checklist below and the picker agree.
  const ran = running && run.kind === 'test' ? tests.find((one) => one.definition.name === run.name) : undefined;
  if (ran !== undefined && $('test-pick').value !== ran.id) {
    $('test-pick').value = ran.id;
    aboutTest();
  }
  $('run-start').textContent = mode === 'test' ? 'Start test' : 'Start recording';
  $('run-live').hidden = !running;
  if (running) {
    const step = run.steps[run.current];
    const total = plannedSteps().length;
    const last = run.current + 1 >= total;
    $('run-step').textContent = run.kind === 'test' ? `Step ${run.current + 1} of ${total}` : 'recording, Stop when it is done';
    $('run-instruction').textContent = run.kind === 'test' ? step?.instruction ?? '' : run.name;
    $('run-next').hidden = run.kind !== 'test';
    $('run-problem').hidden = run.kind !== 'test';
    $('run-mark').hidden = run.kind !== 'test';
    // A new step starts with an empty note, and a step already marked shows its note to edit.
    if (problemStep !== run.current) {
      problemStep = run.current;
      $('run-problem').value = step?.problem ?? '';
    }
    $('run-mark').textContent = step?.problem === undefined || step?.problem === null ? 'Mark wrong' : 'Update note';
    $('run-next').textContent = last ? 'Done, finish the test' : 'Done, next step';
    $('run-stop').textContent = run.kind === 'test' ? 'Abandon' : 'Stop';
    clearInterval(clockTimer);
    const started = new Date(run.startedAt).getTime();
    clockTimer = setInterval(() => {
      $('run-clock').textContent = `${((Date.now() - started) / 1000).toFixed(0)} s`;
    }, 500);
  } else {
    clearInterval(clockTimer);
  }
  $('run-file').textContent = run?.file === undefined || run?.file === null ? '' : `saved: ${run.file}`;
  showSteps();
  showTimeline();
}

function pressName(press) {
  return press.frame.bare ? 'repeat signal only' : title(press.frame);
}

/** Every step of the test on screen: the run's own as far as it got, the definition's after that. */
function plannedSteps() {
  const definition = run?.kind === 'test'
    ? tests.find((one) => one.definition.name === run.name)?.definition
    : chosenTest()?.definition;
  return definition?.steps ?? [];
}

function expectLabel(want) {
  const devices = typeof want.device === 'string' ? [want.device] : want.device;
  const what = want.command ?? `code ${want.code}`;
  return `${devices.join(' or ')} · ${what}${(want.times ?? 1) > 1 ? ` ×${want.times}` : ''}`;
}

/**
 * The test as a checklist, shown from the moment a test is picked: one row per step with a box that is
 * ticked when the step is done. The step being done is outlined and its box is the same as pressing
 * Done. Under a finished step, what the receiver heard and whether each expectation held.
 */
function showSteps() {
  const list = clear($('run-steps'));
  $('run-summary').textContent = '';
  if (mode !== 'test') return;
  const own = runIsChosenTest();
  const planned = own ? plannedSteps() : chosenTest()?.definition.steps ?? [];
  const taken = own ? run.steps : [];
  const total = Math.max(planned.length, taken.length);
  for (let index = 0; index < total; index += 1) {
    const step = taken[index];
    const plan = planned[index] ?? step;
    const current = own && open() && index === run.current;
    const done = step !== undefined && step.endedMs !== undefined && step.reached !== false;
    const item = document.createElement('li');
    item.className = current ? 'current' : done ? 'done' : 'pending';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = done;
    box.disabled = !current;
    box.title = current ? 'tick when this step is done' : '';
    box.addEventListener('change', () => void runAction('/api/ir/run/next'));
    const label = el('span', `${index + 1}. ${plan.instruction}`, 'instruction');
    item.append(box, label);
    const expect = plan.expect ?? [];
    if (expect.length > 0 && !done && step?.reached !== false) {
      item.append(el('span', `listening for ${expect.map(expectLabel).join(', then ')}`, 'heard'));
    }
    if (step !== undefined && step.presses.length > 0) {
      const heard = step.presses.map((press) => `${pressName(press)}${press.repeats > 0 ? ` held ×${press.repeats}` : ''}`);
      item.append(el('span', `heard: ${heard.join(', ')}`, 'heard'));
    } else if (done) {
      item.append(el('span', 'heard nothing', 'heard'));
    }
    if (step?.reached === false) item.append(el('span', 'not reached, the test was abandoned first', 'heard'));
    if (step?.problem) item.append(el('span', `✗ marked wrong: ${step.problem}`, 'verdict bad marked'));
    for (const verdict of step?.verdicts ?? []) {
      // While a step is being done a missing command is not a failure yet, so it waits in grey.
      const waiting = current && !verdict.ok;
      item.append(el('span', `${verdict.ok ? '✓' : waiting ? '…' : '✗'} ${verdict.expected}: ${waiting ? 'not heard yet' : verdict.detail}`,
        `verdict ${verdict.ok ? 'ok' : waiting ? 'wait' : 'bad'}`));
    }
    list.append(item);
  }
  if (own && !open()) {
    const verdicts = run.steps.flatMap((step) => step.verdicts);
    const passed = verdicts.filter((one) => one.ok).length;
    const reached = run.steps.filter((step) => step.reached !== false).length;
    const abandoned = reached < run.steps.length;
    const marked = run.steps.filter((step) => step.problem).length;
    $('run-summary').textContent = `${abandoned ? 'Abandoned' : 'Finished'}: ${reached} of ${run.steps.length} steps done`
      + (verdicts.length > 0 ? `, ${passed} of ${verdicts.length} checks passed` : '')
      + (marked > 0 ? `, ${marked} marked wrong` : '');
    $('run-summary').className = verdicts.length > passed || abandoned || marked > 0 ? 'summary bad' : 'summary ok';
  }
}

/** One lane per device, the presses placed by time; step boundaries as lines; and the same as a table. */
function showTimeline() {
  const lanes = clear($('lanes'));
  const table = clear($('run-table'));
  if (run === undefined || run === null) return;
  const presses = run.steps.flatMap((step, index) => step.presses.map((press) => ({ press, step: index })));
  const lane = (press) => (press.frame.bare ? 'repeat signal' : press.frame.matches.length === 0 ? 'unknown'
    : [...new Set(press.frame.matches.map((one) => one.device))].join(' / '));
  const names = [...new Set(presses.map(({ press }) => lane(press)))];
  const end = Math.max(1000, ...run.steps.map((step) => step.endedMs ?? 0),
    ...presses.map(({ press }) => press.atMs + 500));
  const svgNs = 'http://www.w3.org/2000/svg';
  const width = 1000;
  const left = 130;
  const scale = (width - left - 10) / end;
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${Math.max(1, names.length) * 26 + 22}`);
  const text = (x, y, content) => {
    const node = document.createElementNS(svgNs, 'text');
    node.setAttribute('x', String(x));
    node.setAttribute('y', String(y));
    node.textContent = content;
    svg.append(node);
  };
  names.forEach((name, index) => text(2, index * 26 + 17, name.length > 20 ? `${name.slice(0, 19)}…` : name));
  for (const step of run.steps.slice(1)) {
    const line = document.createElementNS(svgNs, 'line');
    const x = left + step.startedMs * scale;
    line.setAttribute('x1', String(x));
    line.setAttribute('x2', String(x));
    line.setAttribute('y1', '0');
    line.setAttribute('y2', String(names.length * 26 + 4));
    line.setAttribute('class', 'boundary');
    svg.append(line);
  }
  for (const { press } of presses) {
    const rect = document.createElementNS(svgNs, 'rect');
    rect.setAttribute('x', String(left + press.atMs * scale));
    rect.setAttribute('y', String(names.indexOf(lane(press)) * 26 + 5));
    // A press is drawn as long as it lasted: its frame plus a repeat every 108 ms or so, which makes
    // a held key visibly longer than a tap.
    rect.setAttribute('width', String(Math.max(3, (press.repeats + 1) * 108 * scale)));
    rect.setAttribute('height', '16');
    rect.setAttribute('class', press.frame.matches.length === 0 ? 'press unknown' : 'press');
    svg.append(rect);
  }
  for (let s = 0; s <= end / 1000; s += Math.max(1, Math.ceil(end / 1000 / 10))) {
    text(left + s * 1000 * scale, names.length * 26 + 18, `${s} s`);
  }
  lanes.append(svg);

  const head = document.createElement('tr');
  for (const label of ['at', 'pause', 'command', 'held', run.kind === 'test' ? 'step' : '']) head.append(el('th', label));
  table.append(head);
  let previous;
  for (const { press, step } of presses) {
    const tr = document.createElement('tr');
    tr.append(el('td', `${(press.atMs / 1000).toFixed(2)} s`, 'num mono'));
    tr.append(el('td', previous === undefined ? '' : `${Math.round(press.atMs - previous)} ms`, 'num mono dim'));
    tr.append(el('td', pressName(press), press.frame.matches.length === 0 ? 'bad' : undefined));
    tr.append(el('td', press.repeats > 0 ? `×${press.repeats}` : '', 'mono dim'));
    tr.append(el('td', run.kind === 'test' ? String(step + 1) : '', 'num mono dim'));
    table.append(tr);
    previous = press.atMs;
  }
}

async function runAction(path, body) {
  try {
    showRun(await api(path, body ?? {}));
  } catch (error) {
    $('run-file').textContent = error instanceof Error ? error.message : String(error);
  }
}

for (const button of document.querySelectorAll('.modes button')) {
  button.addEventListener('click', () => setMode(button.dataset.mode));
}
$('test-pick').addEventListener('change', aboutTest);
$('run-start').addEventListener('click', () => void runAction('/api/ir/run/start', mode === 'test'
  ? { kind: 'test', test: $('test-pick').value }
  : { kind: 'recording', name: $('record-name').value }));
/** Save the note on the open step. A mark with nothing typed still records that the step was wrong. */
async function markStep() {
  const text = $('run-problem').value.trim();
  await runAction('/api/ir/run/mark', { text: text === '' ? 'marked wrong, no note' : text });
}
$('run-mark').addEventListener('click', () => void markStep());
$('run-problem').addEventListener('keydown', (event) => { if (event.key === 'Enter') void markStep(); });
// Next with a note typed and not yet saved saves it first, so a note is never lost by moving on.
$('run-next').addEventListener('click', async () => {
  const typed = $('run-problem').value.trim();
  const saved = run?.steps?.[run.current]?.problem ?? '';
  if (open() && run.kind === 'test' && typed !== '' && typed !== saved) await markStep();
  await runAction('/api/ir/run/next');
});
$('run-stop').addEventListener('click', () => void runAction('/api/ir/run/stop'));

$('live').addEventListener('click', () => setLive(!live));
$('clear').addEventListener('click', () => {
  presses.clear();
  shown = undefined;
  unknown = 0;
  clear($('list'));
  $('count-presses').textContent = '0';
  $('count-unknown').textContent = '0';
  $('empty').hidden = false;
  $('last-body').hidden = true;
  clear($('wave'));
  clear($('durations'));
  $('signal-head').textContent = '';
});
void start();
