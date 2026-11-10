/**
 * A Harmony Touch's **Settings** and **Context** documents composed by us from a description, and what the remote
 * would mishandle in either, `favourites-and-settings.md` "Settings" and "Context".
 *
 * **What the two documents are, in one paragraph.** Settings is the remote's own settings, eleven rows each a name
 * and a list of values of which the remote reads the first: the screen's and the keys' brightness, how long the
 * screen stays on, the clock's format, the lock screen, the edit lock, the background, the motion sensor.
 * Context is about the account the remote belongs to: its number, the address of the user's favourites, the
 * screens' language, the user name shown on the account screen, whether an installer set the remote up, the setup
 * session, the country. Both arrive in every sync down among the six configuration documents,
 * `reference/architectures/harmony-touch/favourites-and-settings.md`, "Settings", "Settings, field by field" and
 * "Context".
 *
 * **Why Settings is composed as a change of rows the remote holds.** Settings is the one document the remote also
 * writes itself: a change on its own settings screens replaces the first value of a row in the document it holds
 * and hands the whole document up at the next sync, and it adds no row, so a setting missing from the document is
 * one nothing on the remote stores. A description therefore names rows by name and gives each a new first value,
 * and every other row, field and value is carried as the remote holds it; a row the remote does not hold is
 * refused rather than added, which is the same rule the remote's screens keep.
 *
 * **What the screens do with each value, read in the lab's firmware copy** (the screens' Lua,
 * `juniper/init.lua` and `appscommon/harmony.lua`; the lab's `work/touch-firmware/notes/8.4-preflight.md` has the
 * lines). `getRemoteSettings` reads a number row's first value with `tonumber` and a yes or no row's as `"true"` or
 * not, and gives the firmware's default when that leaves nothing. At the end of a committed sync the screens empty
 * their document cache and post `syncDone`, whose handler sets the screen's and the keys' backlight, the suspend
 * timeout, the clock and the background from the new document: **so those rows act at the sync's end, with no
 * restart**. The lock screen and the edit lock are read each time they are needed. The motion sensor and the
 * vibration are set only at start and on a change made on the screens, never at a sync's end: **a sync's value for
 * those acts at the next start**. `SETTING_ROWS` holds each row's kind, range and moment.
 *
 * **The ranges a composer allows** are the remote's own sliders where the reading shows a value outside them is
 * mishandled, and the reading's own range where it is designed:
 *
 * * the screen's brightness, 10 to 100: the backlight is held to that, but the fade before the screen sleeps reads
 *   the stored value unheld, `fadeBrightness`, and counts down from the backlight step it gives, so below 4 the
 *   count starts at 0, never meets 0 again, and the fade never ends; above 100 it starts above the backlight's top
 *   step, 26. The slider is 10 to 100;
 * * the keys' brightness, 0 to 100: below 5 the key light is off by design, `getVal`, which only a document
 *   reaches, the slider starting at 10; above 100 it is held to 100;
 * * the screen's timeout, 1 to 30 seconds, the slider's: the value times 1000 goes to the suspend timer unclamped,
 *   so 0 is a timer that fires at once after every wake, inferred, and above 30 is a timeout the slider cannot show;
 * * a yes or no row, `"true"` or `"false"`, the text Logitech's documents and the screens' own writes carry: a JSON
 *   `true` would read as off, since only the text `"true"` is yes.
 *
 * **Why Context is composed whole from a description of the fields that act.** Seven of Context's 21 fields are
 * read on a Touch synced through a computer, the six the reference names as acting and the country the usage report
 * carries; the other fourteen are read by nothing on such a remote or only by a hub's, a network client's or the
 * pairing code. So a description states exactly the seven, and the rest is carried as the remote holds it. Two of
 * the seven are the account's and are refused when they differ from what the remote holds: the account's number,
 * which the screens join into the address of every document they read and hand up, and the household's favourites
 * address, which decides which favourites document the remote asks for. A description that equals what the remote
 * holds gives exactly the document it holds: Context written by us with no change of behaviour.
 *
 * **What the gate refuses beyond the composer**, in `check.ts`, rule `setting mishandled`: the two values above
 * whose cost is more than one screen, a screen brightness whose fade never ends, so the remote never sleeps on
 * battery, and a timeout below a second, so it fades and sleeps right after every wake. Context's values that cost
 * more than one screen were already the gate's, `screens raise`.
 *
 * **Which architectures**: the Harmony Touch alone, firmware 4.15.330; its firmware reports 17 and Logitech's
 * templates file it under 18. The screens read are the production image's `juniper` skin.
 */
import { ComposeRefusal } from './compose.ts';
import type { Context, Settings } from './documents.ts';

/** When a row's new value acts on the remote, read in the screens. */
export type SettingMoment = 'at the sync\'s end' | 'when it is next read' | 'at the next start';

/** One row a description may change: its kind, its range when a number, and when a sync's value acts. */
export type SettingRow =
  | { readonly kind: 'yes or no'; readonly acts: SettingMoment; readonly what: string }
  | { readonly kind: 'whole number'; readonly min: number; readonly max: number; readonly acts: SettingMoment; readonly what: string };

/**
 * The rows a description may change, the module header's ranges and moments. The background and the user's pictures
 * are not here: a background of the user's own needs its picture delivered with it, which is the picture route of
 * `favourites.ts` and not this composer's. `IsWiFiEnabled` and `TimeZoneFlag` are read by nothing on the remote, and
 * `HapticEffect` and `ActivityPressDuration` arrived in no sync measured, so none of them is offered.
 */
export const SETTING_ROWS: Readonly<Record<string, SettingRow>> = {
  ScreenBrightness: { kind: 'whole number', min: 10, max: 100, acts: 'at the sync\'s end', what: 'the screen\'s backlight' },
  KeyBrightness: { kind: 'whole number', min: 0, max: 100, acts: 'at the sync\'s end', what: 'the keys\' backlight, off below 5' },
  ScreenTimeout: { kind: 'whole number', min: 1, max: 30, acts: 'at the sync\'s end', what: 'seconds before the screen fades and sleeps, off USB power' },
  TwelveHourClock: { kind: 'yes or no', acts: 'at the sync\'s end', what: 'the clock in 12 hour form' },
  ScreenLockFlag: { kind: 'yes or no', acts: 'when it is next read', what: 'the lock screen when the screen fades' },
  EditLock: { kind: 'yes or no', acts: 'when it is next read', what: 'the Remote, Devices and Activities menus locked' },
  AccelFlag: { kind: 'yes or no', acts: 'at the next start', what: 'the motion sensor reporting' },
  HapticFlag: { kind: 'yes or no', acts: 'at the next start', what: 'vibration' },
};

/** Rows a description names that this composer does not change, each with the reason. */
const NOT_COMPOSED: Readonly<Record<string, string>> = {
  BackgroundImage: 'a background is a picture, and delivering one belongs to the picture route, not this composer',
  UserImages: 'the user\'s pictures are pictures, and delivering one belongs to the picture route, not this composer',
  IsWiFiEnabled: 'nothing on the remote reads it',
  TimeZoneFlag: 'nothing on the remote reads it',
  HapticEffect: 'no sync measured carried it, and the remote reads it as text with no stated range',
  ActivityPressDuration: 'no sync measured carried it, and no screen asks for it',
};

/** A Settings description, as `packages/corpus/touch-settings/` holds them: rows by name, each its new first value. */
export interface OwnSettings {
  readonly values: Readonly<Record<string, string>>;
}

/**
 * The seven Context fields read on a Touch synced through a computer, the module header: the six that act and the
 * country of the usage report. A description states each of them and nothing else.
 */
export const CONTEXT_FIELDS_READ = ['AccountId-', 'HouseholdUserProfileUri', 'Language', 'Email', 'InstallerId', 'SetupSession', 'CountryCode'] as const;
export type ContextFieldRead = (typeof CONTEXT_FIELDS_READ)[number];

/** A Context description: the seven fields read, each as the document states it. Kept in the lab, since it holds the account's. */
export type OwnContext = { readonly [field in ContextFieldRead]: unknown };

/** The two fields of the seven that are the account's own and are not changed by a description. */
const ACCOUNT_FIELDS: readonly ContextFieldRead[] = ['AccountId-', 'HouseholdUserProfileUri'];

const refuse = (message: string): never => {
  throw new ComposeRefusal(message);
};

const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/**
 * Compose Settings from a description and the Settings the remote holds: each row the description names gets its
 * new value as its first value, and everything else is the held document's. **Refuses**, naming the row and never
 * quoting a held value: a held document with no list of rows; a description that names no row; a row this composer
 * does not change, with the reason (`NOT_COMPOSED`), or one it does not know; a row the held document lacks, or
 * holds twice; a value that is not text; a yes or no row's value other than `"true"` or `"false"`; a number row's
 * value that is not a whole number in decimal digits, or outside the row's range; and a value equal to the row's
 * first value now, which changes nothing.
 */
export function composeTouchSettings(description: OwnSettings, held: Settings): Settings {
  if (!isObject(held) || !Array.isArray(held.Settings)) refuse('the Settings the remote holds states no list of rows');
  const names = Object.keys(description.values ?? {});
  if (names.length === 0) refuse('the description changes no row');
  const out = copy(held) as Settings & { Settings: { Name?: unknown; Values?: unknown }[] };
  for (const name of names) {
    const value = description.values[name];
    if (NOT_COMPOSED[name] !== undefined) refuse(`${name} is not changed here: ${NOT_COMPOSED[name]}`);
    const row = SETTING_ROWS[name];
    if (row === undefined) refuse(`${name} is not a setting the remote reads`);
    const rows = out.Settings.filter((r) => isObject(r) && r.Name === name);
    if (rows.length !== 1) {
      refuse(`${name}: the Settings the remote holds has ${rows.length === 0 ? 'no such row, and a row is changed here as the remote\'s own screens change one, never added' : 'it twice'}`);
    }
    if (typeof value !== 'string') refuse(`${name}: the value is not text, which is what the remote's own writes and Logitech's documents carry`);
    if (row!.kind === 'yes or no' && value !== 'true' && value !== 'false') refuse(`${name}: a yes or no setting takes "true" or "false"`);
    if (row!.kind === 'whole number') {
      if (!/^(0|[1-9][0-9]*)$/.test(value!)) refuse(`${name}: the value is not a whole number written in decimal digits`);
      const n = Number(value);
      if (n < row!.min || n > row!.max) refuse(`${name}: ${value} is outside ${row!.min} to ${row!.max}, which the remote mishandles or its own screens cannot show`);
    }
    const target = rows[0]! as { Values?: unknown };
    const values: unknown[] = Array.isArray(target.Values) ? target.Values : [];
    if (values[0] === value) refuse(`${name}: the value equals the one the remote holds, which changes nothing`);
    target.Values = [value!, ...values.slice(1)];
  }
  return out;
}

/**
 * The seven fields read, as the Context the remote holds states them: the description that composes that Context
 * again unchanged. For the lab, where a description of the account's own Context is kept; nothing here prints it.
 */
export function describeTouchContext(held: Context): OwnContext {
  if (!isObject(held)) refuse('the Context the remote holds is not a JSON object');
  return Object.fromEntries(CONTEXT_FIELDS_READ.map((f) => [f, copy((held as Record<string, unknown>)[f] ?? null)])) as OwnContext;
}

/**
 * Compose Context from a description of the seven fields read and the Context the remote holds: those seven from the
 * description, the other fourteen carried in the held document's order. **Refuses**, naming the field and never
 * quoting a value: a held document that is not an object; a description field that is not one of the seven, or one of
 * the seven left out; the account's number or the household's favourites address differing from what the remote
 * holds; an account number that is not a whole number or its digits; a language that is not a language and a region
 * joined by a hyphen; a user name that is not text; an installer that is neither null nor text; a setup session that
 * is not an object, whose `Type` is not 0, the setup complete, or whose `SetupType` is neither null nor text; and a
 * country that is neither null nor two capital letters.
 */
export function composeTouchContext(description: OwnContext, held: Context): Context {
  if (!isObject(held)) refuse('the Context the remote holds is not a JSON object');
  const given = Object.keys(description);
  for (const f of given) if (!(CONTEXT_FIELDS_READ as readonly string[]).includes(f)) refuse(`${f} is not one of the seven Context fields a Touch reads, and the others are carried as the remote holds them`);
  for (const f of CONTEXT_FIELDS_READ) if (!given.includes(f)) refuse(`the description leaves out ${f}, one of the seven Context fields a Touch reads`);
  const h = held as Record<string, unknown>;
  for (const f of ACCOUNT_FIELDS) {
    if (JSON.stringify(description[f] ?? null) !== JSON.stringify(h[f] ?? null)) refuse(`${f} differs from the Context the remote holds, and it is the account's, which a description does not change`);
  }
  const account = description['AccountId-'];
  if (!(typeof account === 'number' && Number.isInteger(account) && account > 0) && !(typeof account === 'string' && /^[1-9][0-9]*$/.test(account))) {
    refuse('AccountId- is not a whole number or its digits, and the screens join it into the address of every document they read');
  }
  const household = description.HouseholdUserProfileUri;
  if (household !== null && typeof household !== 'string') refuse('HouseholdUserProfileUri is neither null nor text');
  const language = description.Language;
  if (typeof language !== 'string' || !/^[a-z]{2,3}-[A-Za-z]{2,4}$/.test(language)) {
    refuse('Language is not a language and a region joined by a hyphen, the part before which the screens take as their language');
  }
  if (typeof description.Email !== 'string') refuse('Email is not text, and the account screen shows it as the user name');
  const installer = description.InstallerId;
  if (installer !== null && typeof installer !== 'string') refuse('InstallerId is neither null nor text');
  const session = description.SetupSession;
  if (!isObject(session)) refuse('SetupSession is not an object, which the screens read into when an activity first starts');
  const s = session as Record<string, unknown>;
  if (s['Type'] !== 0) refuse('SetupSession.Type is not 0, which marks the setup complete');
  if (s['SetupType'] !== null && s['SetupType'] !== undefined && typeof s['SetupType'] !== 'string') refuse('SetupSession.SetupType is neither null nor text');
  const country = description.CountryCode;
  if (country !== null && !(typeof country === 'string' && /^[A-Z]{2}$/.test(country))) refuse('CountryCode is neither null nor two capital letters');

  // The held document's own order, the seven replaced where they stand and appended where it lacks one.
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(h)) out[k] = (CONTEXT_FIELDS_READ as readonly string[]).includes(k) ? copy(description[k as ContextFieldRead]) : copy(v);
  for (const f of CONTEXT_FIELDS_READ) if (!(f in out)) out[f] = copy(description[f]);
  return out as Context;
}

/**
 * A value as the screens' `tonumber` reads it, LuaJIT's: a JSON number as it is, a string of decimal or hexadecimal
 * digits with an optional sign and surrounding blanks as that number; anything else gives nothing, which the screens
 * replace with the firmware's default. A string LuaJIT would read some other way, `inf` or `nan`, is not modelled.
 */
export function luaNumber(x: unknown): number | undefined {
  if (typeof x === 'number') return Number.isFinite(x) ? x : undefined;
  if (typeof x !== 'string') return undefined;
  const t = x.trim();
  if (/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(t)) return Number(t);
  const hex = /^([+-]?)0[xX]([0-9a-fA-F]+)$/.exec(t);
  if (hex !== null) return (hex[1] === '-' ? -1 : 1) * Number.parseInt(hex[2]!, 16);
  return undefined;
}

/** The screen backlight's top step, `MAX_LCD_BRIGHTNESS` in the screens: a level of 100 is step 26. */
export const BACKLIGHT_STEPS = 26;
