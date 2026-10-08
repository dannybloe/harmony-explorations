/**
 * A session with Logitech's MyHarmony service: a login, a cookie, and calls that refuse to write unless
 * a named door is open.
 *
 * **Why this exists, and why here.** `todo-secure-logitech.md` gathers what only Logitech's compiler
 * knows while their service still runs, and item 1.1 moves the client for it out of the private lab into
 * this repository. The calls themselves are not secret and are the knowledge being secured: which
 * operation, in which order, with which contract types, puts a device on an account and gets a compile
 * back. What stays in the lab is the credentials and every reply, since a reply can carry an account's
 * identity and a compiled file is Logitech's output.
 *
 * **The rail is the same one the lab's Python client grew, rewritten rather than copied**: a call whose
 * operation name starts with a mutating verb is refused before a request is built, unless the one
 * environment variable naming that operation's door is set to `1`. One door per kind of write, because a
 * flag that opens two writes is a flag whose name no longer says what it permits. The door names are the
 * lab client's, so a go-ahead given for one means the same thing for the other. And the vendor's names
 * are not trusted in the other direction either: `CommandList` reads like a read and **is** a compile,
 * so it is refused outright.
 *
 * Nothing here talks to a remote. A compile is taken as a file; syncing it to a remote is the desktop
 * application's step and is not implemented anywhere in this repository.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LAB } from '@harmony/lab';

export const SVCS = 'https://svcs.myharmony.com';
export const SECURITY = `${SVCS}/CompositeSecurityServices/Security.svc/json/`;
export const DEVICE_MANAGER = `${SVCS}/HarmonyPlatform/DeviceManager.svc/json/`;
export const ACCOUNT_MANAGER = `${SVCS}/HarmonyPlatform/AccountManager.svc/json/`;
export const ACCOUNT_DIRECTOR = `${SVCS}/UserAccountDirectorPlatform/UserAccountDirector.svc/json/`;
export const COMPILE_MANAGER = `${SVCS}/SyncPlatform/CompileManager.svc/json/`;
export const DELETION_MANAGER = `${SVCS}/SyncPlatform/DeletionManager.svc/json/`;

/** Refused before sending, from the lab client's list: the account is evidence, so this is a rail. */
const MUTATING = [
  'update', 'save', 'add', 'delete', 'remove', 'set', 'start', 'end', 'submit', 'upload', 'reset',
  'provision', 'upgrade', 'register', 'accept', 'impersonate', 'import', 'compile', 'logout',
  'notify', 'refine', 'analyze', 'validate', 'detect', 'migrate',
];

/** Measured to write despite a read's name: `CompileManager/CommandList` queued a compile. */
const NOT_A_READ_DESPITE_THE_NAME = new Set(['commandlist']);

/**
 * The writes this client may make, each behind the environment variable that opens it. The names match
 * the lab client's doors on purpose: a go-ahead given as "the device door" must not mean two things.
 */
export const DOORS: ReadonlyMap<string, string> = new Map([
  ['startcompilewithlocaleandsettings', 'MYHARMONY_ALLOW_COMPILE'],
  ['updatemultiple', 'MYHARMONY_ALLOW_DEVICE_WRITE'],
  ['deletedevices', 'MYHARMONY_ALLOW_DELETE'],
  // Saving an activity, opened on 8 October 2026 for the Harmony 650's starting setup,
  // `todo-compile-650.md` 1.6; a kind of write the lab client never made.
  ['saveactivities', 'MYHARMONY_ALLOW_ACTIVITY_WRITE'],
]);

/** A call this client will not send, with the reason, raised before any request exists. */
export class ServiceRefusal extends Error {}

/** One reply as it came back: the raw bytes are kept, because a compile's answer is not JSON. */
export interface Reply {
  readonly status: number;
  readonly bytes: Uint8Array;
  /** The parsed body, or undefined where it is not JSON. */
  readonly json: unknown;
}

/**
 * Whether `operation` may be sent now. Exported so the rail can be tested without a network: a refusal
 * happens here, before `fetch` is ever reached.
 */
export function assertCallAllowed(operation: string, env: NodeJS.ProcessEnv = process.env): void {
  const lowered = operation.toLowerCase();
  if (NOT_A_READ_DESPITE_THE_NAME.has(lowered)) {
    throw new ServiceRefusal(`${operation} is measured to write despite its name, and is never sent`);
  }
  if (!MUTATING.some((verb) => lowered.startsWith(verb))) return;
  const door = DOORS.get(lowered);
  if (door === undefined) {
    throw new ServiceRefusal(`${operation} writes and this client has no door for it`);
  }
  if (env[door] !== '1') throw new ServiceRefusal(`${operation} writes; set ${door}=1 to allow it`);
}

/**
 * The selected account's credentials: `MYHARMONY_EMAIL<n>` and `MYHARMONY_PASSWORD<n>` from the
 * environment, else from the lab's `work/myharmony/credentials.env`, where selector 1 has no suffix and
 * selector 2 the suffix `2`. Parsed rather than sourced, so nothing lands in a process listing; only the
 * two keys are read, and neither value is ever printed.
 */
export function credentials(selector: string, env: NodeJS.ProcessEnv = process.env):
    { email: string; password: string } {
  const suffix = selector === '1' ? '' : selector;
  const keys = [`MYHARMONY_EMAIL${suffix}`, `MYHARMONY_PASSWORD${suffix}`] as const;
  const fromEnv = keys.map((key) => env[key]);
  if (fromEnv[0] && fromEnv[1]) return { email: fromEnv[0], password: fromEnv[1] };
  if (LAB === undefined) throw new ServiceRefusal(`no ${keys.join(' and ')} and no lab to read them from`);
  const found = new Map<string, string>();
  for (const line of readFileSync(join(LAB, 'work', 'myharmony', 'credentials.env'), 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const at = trimmed.indexOf('=');
    if (at > 0) found.set(trimmed.slice(0, at).trim(), trimmed.slice(at + 1).trim().replace(/^["']|["']$/g, ''));
  }
  const email = found.get(keys[0]);
  const password = found.get(keys[1]);
  if (!email || !password) throw new ServiceRefusal(`credentials.env has no ${keys.join(' and ')}`);
  return { email, password };
}

/**
 * The least time between two requests of one session, decided on 8 October 2026: at least five to ten
 * seconds between any two requests to Logitech's service, after the harvest of 7 October got a serial
 * blocked. It is enforced here, in the one place every request passes, rather than left to each
 * script's own pauses, because the harvest script's compile poll asked every three seconds.
 */
export const MINIMUM_GAP_MS = 10_000;

/**
 * One logged in session. `onReply` sees every reply with the operation's name, which is how a caller
 * files the replies in the lab as evidence; this module never writes a file itself.
 */
export class MyHarmonySession {
  private readonly jar = new Map<string, string>();
  private readonly onReply: (operation: string, reply: Reply) => void;
  private readonly gapMs: number;
  /** When the previous request was sent, so the next one waits out the gap from there. */
  private lastSent = 0;

  constructor(onReply: (operation: string, reply: Reply) => void = () => {}, gapMs = MINIMUM_GAP_MS) {
    this.onReply = onReply;
    this.gapMs = gapMs;
  }

  /** Log in. A refusal names only the status: their reply quotes the address and an account id. */
  async login(email: string, password: string): Promise<void> {
    const reply = await this.send('LoginUser', `${SECURITY}LoginUser`, 'POST',
      { email, password, customCredential: null, isPersistent: false }, false);
    if (reply.status !== 200 || this.jar.size === 0) {
      throw new ServiceRefusal(`login refused, status ${reply.status}`);
    }
  }

  /** A POST of `body` to `base + operation`, after the rail. */
  call(operation: string, base: string, body: unknown = {}): Promise<Reply> {
    assertCallAllowed(operation);
    return this.send(operation, `${base}${operation}`, 'POST', body);
  }

  /**
   * A call whose address is not `base + operation`: the compile's polling address comes back from the
   * compile, and the account scoped addresses want a GET. `operation` still names what the rail judges.
   */
  callAt(operation: string, url: string, method: 'GET' | 'POST', body?: unknown): Promise<Reply> {
    assertCallAllowed(operation);
    return this.send(operation, url, method, body);
  }

  private async send(operation: string, url: string, method: 'GET' | 'POST', body: unknown,
      record = true): Promise<Reply> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (method === 'POST') headers['Content-Type'] = 'application/json';
    if (this.jar.size > 0) headers['Cookie'] = [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const wait = this.lastSent + this.gapMs - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    this.lastSent = Date.now();
    const answer = await fetch(url, {
      method, headers, signal: AbortSignal.timeout(90_000),
      ...(method === 'POST' ? { body: JSON.stringify(body ?? {}) } : {}),
    });
    for (const line of answer.headers.getSetCookie()) {
      const [pair] = line.split(';');
      const at = pair?.indexOf('=') ?? -1;
      if (pair && at > 0) this.jar.set(pair.slice(0, at), pair.slice(at + 1));
    }
    const bytes = new Uint8Array(await answer.arrayBuffer());
    let json: unknown;
    try {
      // A reply may open with a byte order mark, which JSON.parse refuses.
      json = JSON.parse(new TextDecoder().decode(bytes).replace(/^﻿/, ''));
    } catch {
      json = undefined;
    }
    const reply = { status: answer.status, bytes, json };
    // The login is not recorded: its reply carries the account's identity and nothing worth keeping.
    if (record) this.onReply(operation, reply);
    return reply;
  }
}
