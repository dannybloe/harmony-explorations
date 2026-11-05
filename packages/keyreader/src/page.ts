/**
 * The key reader page: connect, show which remote answered, and show its keys as they are pressed.
 *
 * This module holds no device. Everything it knows about the remote comes through the `KeyLink` that
 * `connect` returns, which can read the key and let go and nothing else, so nothing written here can send
 * a byte of its own to a remote: `link.ts` explains why that is the whole point.
 *
 * **What is deliberately left for later**, todo-prepare-885.md 2.6.2 and 2.6.3: the drawing of the model
 * (`reference/silhouettes/<id>.svg`, whose keys carry `data-name` and `data-scan`), the guided flow that asks
 * for one key at a time, the key test mode and the log to copy. The page is laid out for them: the
 * `drawing` element is where the face goes, and every key event arrives at `onKey` as a press or a release
 * with its code, which is the one place a mode would hook in.
 */
import { NoReply, Refused, connect } from './link.ts';
import type { KeyLink } from './link.ts';
import { PressTracker } from './presses.ts';
import type { KeyEvent } from './presses.ts';
import type { WebHid } from './webhid.ts';

/**
 * Time between two polls. A poll this often caught every press when an 885's keys were measured,
 * `tests/test_harmony_885_keys.py`, and a press that is missed still shows in the copy of the last key.
 */
const POLL_MS = 25;

/** The page's own elements, looked up once; a missing one is a broken page and says so at once. */
function element(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (found === null) throw new Error(`the page has no element #${id}`);
  return found;
}

const connectButton = element('connect') as HTMLButtonElement;
const stopButton = element('stop') as HTMLButtonElement;
const statusLine = element('status');
const remoteLine = element('remote');
const heldValue = element('held');
const lastValue = element('last');
const pressList = element('presses');
const keysSection = element('keys');

let link: KeyLink | undefined;
let running = false;

function say(message: string, kind: 'info' | 'problem' = 'info'): void {
  statusLine.textContent = message;
  statusLine.dataset['kind'] = kind;
}

/** A code as the page shows it: the number, or a dash for no key. */
function code(value: number): string {
  return value === 0 ? '-' : String(value);
}

/** Where a mode will hook in. For now every press is listed, newest first. */
function onKey(event: KeyEvent): void {
  if (event.kind !== 'press') return;
  const item = document.createElement('li');
  item.textContent = String(event.code);
  item.dataset['scan'] = String(event.code);
  pressList.prepend(item);
}

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
    const { remote } = link;
    remoteLine.textContent = `${remote.name}, firmware ${remote.firmware} (skin ${remote.skin})`;
    keysSection.hidden = false;
    stopButton.disabled = false;
    running = true;
    say('Connected. Press the keys on your remote one at a time.');
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
