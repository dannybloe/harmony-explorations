// The bench page. Plain DOM, no framework and no build step, so what runs in the browser is the
// file on disk. That matters more here than elsewhere: this is the thing you reach for when you are
// trying to work out what a remote is doing, and a build step between you and the code is one more
// thing that can be the reason it does not work.
//
// Kept as an ES module rather than inline script so FreeHarmony can lift it into an Electron
// renderer later without untangling it from the page.

/** @type {number | undefined} */
let selected;

const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = String(text);
  if (className !== undefined) node.className = className;
  return node;
}

function row(table, cells) {
  const tr = document.createElement('tr');
  for (const cell of cells) tr.append(cell instanceof Node ? cell : el('td', cell));
  table.append(tr);
  return tr;
}

const hex = (value, width = 2) => `0x${value.toString(16).padStart(width, '0')}`;

async function api(path, body) {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? `${response.status}`);
  return data;
}

async function refreshRemotes() {
  const remotes = await api('/api/remotes');
  const list = clear($('remotes'));
  if (remotes.length === 0) {
    list.append(el('p', 'Nothing attached.', 'hint'));
    return;
  }
  for (const remote of remotes) {
    const line = el('div', undefined, remote.known ? 'remote' : 'remote unknown');
    line.append(el('span', remote.model ?? remote.product ?? 'unrecognised remote', 'name'));
    line.append(el('span', hex(remote.productId, 4), 'mono dim'));
    line.append(
      el(
        'span',
        remote.known
          ? `architecture ${remote.architecture}`
          : 'no config base known for this model, so it cannot be read yet',
        'dim',
      ),
    );
    if (remote.known) {
      const choose = el('button', 'select');
      choose.addEventListener('click', () => select(remote));
      line.append(choose);
    }
    line.dataset['productId'] = String(remote.productId);
    list.append(line);
  }
}

async function select(remote) {
  selected = remote.productId;
  for (const line of document.querySelectorAll('.remote')) {
    line.setAttribute('aria-selected', String(Number(line.dataset['productId']) === selected));
  }
  $('read-panel').hidden = false;
  await identify();
}

async function identify() {
  const identity = await api('/api/identify', { productId: selected });
  const table = clear($('identity'));
  row(table, [el('th', 'field'), el('th', 'value'), el('th', 'reading')]);
  for (const field of identity.named) {
    row(table, [
      el('td', field.index, 'num mono'),
      el('td', hex(field.value), 'mono'),
      field.name === undefined ? el('td', 'not identified', 'dim') : el('td', field.name),
    ]);
  }
  $('identity-panel').hidden = false;
  await refreshLog();
}

async function read() {
  const label = /** @type {HTMLInputElement} */ ($('label')).value.trim();
  if (label === '') return;
  const button = /** @type {HTMLButtonElement} */ ($('read'));
  button.disabled = true;
  $('progress').hidden = false;
  $('result').hidden = true;

  const response = await fetch('/api/read', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ productId: selected, label }),
  });

  // Newline delimited JSON: one object per line, so a partial chunk is held back until its newline
  // arrives rather than being parsed as truncated garbage.
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim() !== '') handleEvent(JSON.parse(line));
    }
  }
  button.disabled = false;
  await refreshLog();
}

function handleEvent(event) {
  if (event.type === 'progress') {
    $('bar-fill').style.width = `${event.percent}%`;
    $('progress-text').textContent = `${event.done} of ${event.total} bytes (${event.percent}%)`;
    return;
  }
  if (event.type === 'error') {
    $('progress-text').textContent = event.message;
    $('progress-text').className = 'mono bad';
    return;
  }
  $('progress-text').className = 'mono';
  $('progress-text').textContent = `${event.bytes} bytes in ${(event.durationMs / 1000).toFixed(1)}s, filed as ${event.filed.config}`;
  showContainer(event.container);
  $('result').hidden = false;
}

function showContainer(container) {
  const table = clear($('container'));
  const rows = [
    ['architecture', container.architecture],
    ['format', container.format_version],
    ['flash base', hex(container.flash_base, 6)],
    ['end_addr', hex(container.end_addr, 6)],
    ['length', container.length],
    ['section slots', container.pointer_count],
    ['built', container.built_at ?? 'no timestamp'],
  ];
  for (const [name, value] of rows) row(table, [el('td', name, 'dim'), el('td', value, 'mono')]);

  const checks = clear($('checks'));
  for (const [name, passed] of Object.entries(container.checks)) {
    const item = el('li', `${passed ? 'pass' : 'FAIL'}  ${name}`, passed ? 'ok mono' : 'bad mono');
    checks.append(item);
  }

  const sections = clear($('sections'));
  row(sections, [el('th', 'slot'), el('th', 'address'), el('th', 'length'), el('th', 'spare'), el('th', 'label')]);
  for (const section of container.sections ?? []) {
    row(sections, [
      el('td', section.slot, 'num mono'),
      el('td', section.address === 0 ? 'NULL' : hex(section.address, 6), 'mono'),
      el('td', section.length ?? '', 'num mono'),
      el('td', hex(section.spare ?? 0), 'mono dim'),
      el('td', '', 'dim'),
    ]);
  }
}

async function refreshLog() {
  const entries = await api('/api/log');
  const table = clear($('log'));
  row(table, [el('th', 'time'), el('th', 'command'), el('th', 'outcome'), el('th', 'detail')]);
  for (const entry of entries) {
    row(table, [
      el('td', entry.at.slice(11, 19), 'mono dim'),
      el('td', entry.what, 'mono'),
      el('td', entry.outcome, entry.outcome === 'ok' ? 'ok' : 'bad'),
      el('td', entry.detail, 'mono dim'),
    ]);
  }
}

$('refresh').addEventListener('click', () => void refreshRemotes());
$('read').addEventListener('click', () => void read());
void refreshRemotes();
void refreshLog();
