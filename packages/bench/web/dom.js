// The DOM helpers both bench pages use, the bench itself and the infrared monitor. One copy, so the
// two pages cannot come to disagree about how a table row or an API error is made.

export const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = String(text);
  if (className !== undefined) node.className = className;
  return node;
}

export function row(table, cells) {
  const tr = document.createElement('tr');
  for (const cell of cells) tr.append(cell instanceof Node ? cell : el('td', cell));
  table.append(tr);
  return tr;
}

export const hex = (value, width = 2) => `0x${value.toString(16).padStart(width, '0')}`;

export async function api(path, body) {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? `${response.status}`);
  return data;
}
