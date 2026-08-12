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

async function refreshConfigs() {
  const names = await api('/api/configs');
  const list = clear($('configs'));
  if (names.length === 0) {
    list.append(el('p', 'No configs in the lab. Read one from a remote, or set HARMONY_LAB.', 'hint'));
    return;
  }
  for (const name of names) {
    const line = el('div', undefined, 'remote');
    line.append(el('span', name, 'name mono'));
    const choose = el('button', 'inspect');
    choose.addEventListener('click', () => void showInventory(name));
    line.append(choose);
    list.append(line);
  }
}

async function showInventory(name) {
  const inv = await api('/api/inventory', { name });

  const head = clear($('inventory-head'));
  for (const [label, value] of [
    ['config', inv.name],
    // The skin comes from the config's own slot 1, which is per config and not per model: section 81
    // found one Harmony One carrying two different words either side of a sync, and the number a
    // config states is often not the one the remote reports.
    [
      'skin in slot 1',
      inv.skin === undefined
        ? 'not stated'
        : `${inv.skin}${inv.model === undefined ? ', no model known for that number' : `, a Harmony ${inv.model}`}`,
    ],
    ['architecture', inv.architecture ?? 'not stated'],
    ['built', inv.builtAt ?? 'no timestamp'],
    ['devices', inv.devices.length],
    ['activities', inv.activities.length],
    ['idle value', inv.idle ?? 'not stated'],
  ]) {
    row(head, [el('td', label, 'dim'), el('td', value, 'mono')]);
  }

  const devices = clear($('devices'));
  row(devices, [
    el('th', 'group'),
    el('th', 'name'),
    el('th', 'from'),
    el('th', 'codes'),
    el('th', 'can repeat'),
    el('th', 'repeat, ms'),
  ]);
  for (const device of inv.devices) {
    row(devices, [
      el('td', device.group, 'num mono'),
      device.name === undefined ? el('td', 'unnamed', 'dim') : el('td', device.name),
      el('td', device.source ?? '', 'dim'),
      el('td', device.codes, 'num mono'),
      el('td', device.repeating, 'num mono'),
      el('td', device.repeatMs.join(', ') || '', 'mono'),
    ]);
  }

  const activities = clear($('activities'));
  row(activities, [el('th', 'value'), el('th', 'name'), el('th', 'page'), el('th', 'keys'), el('th', 'devices')]);
  for (const activity of inv.activities) {
    row(activities, [
      el('td', activity.activity, 'num mono'),
      activity.name === undefined ? el('td', 'unnamed', 'dim') : el('td', activity.name),
      el('td', activity.page, 'num mono'),
      el('td', activity.scans.join('/'), 'mono'),
      el('td', activity.devices.map((group) => inv.devices[group]?.name ?? `group ${group}`).join(', ')),
    ]);
  }

  const keys = clear($('keys'));
  row(keys, [el('th', 'in'), el('th', 'key'), el('th', 'sends'), el('th', 'repeat, ms')]);
  for (const key of inv.keys) {
    const device = inv.devices[key.group]?.name ?? `group ${key.group}`;
    row(keys, [
      // A page binding is a soft key on a screen; a set binding is a hard key while an activity runs,
      // which is where the volume keys are.
      el('td', `${key.where} ${key.index}`, 'mono dim'),
      el('td', key.event === 2 ? `scan ${key.scan}` : `handler ${key.tag ?? key.scan}`, 'mono'),
      el('td', `${device} #${key.code}${key.sends > 1 ? ` and ${key.sends - 1} more` : ''}`, 'mono'),
      key.repeatMs === undefined
        ? el('td', 'does not repeat', 'dim')
        : el('td', key.repeatMs, 'num mono'),
    ]);
  }

  $('inventory').hidden = false;
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
$('refresh-configs').addEventListener('click', () => void refreshConfigs());
$('read').addEventListener('click', () => void read());
void refreshRemotes();
void refreshConfigs();
void refreshLog();
