/**
 * The Harmony Touch's first full bench test, `todo-touch.md` 7.1: what a person does at the bench, step by
 * step, and what the remote is predicted to send for it, derived from the documents the remote holds by
 * `touchengine.ts`, never written by hand.
 *
 * **How a test file comes to be.** `touch71Plans` below says what each test does, as actions: an activity
 * started, a key tapped or held, a favourite tapped, a device chosen. `touchTests` walks those actions on the
 * engine model, twice, at the two ends of its timing band, and turns what the model sends into a test
 * definition: each instruction from the actions' words, each expectation from a send, named by the device
 * and the command as the documents state them, which is how the infrared monitor names a code of the
 * Touch's own documents, `irmonitor.ts` `BENCH_TOUCH_SETS`. `bin/touch-tests.ts` writes the files and
 * `test/touch71.test.ts` holds that the files in `irtests/` are what this derivation gives.
 *
 * **Which pauses are judged.** Only those the engine times: between two codes of one activity start, one
 * favourite or one sequence. Between two keys the person sets the pace, so no pause is expected there. A
 * judged pause is the band the model gives, start of one code to start of the next as the monitor hears
 * them, widened by `PAUSE_SLACK_MS` either way, and rounded out to 50 ms.
 *
 * **Every test starts with Off**, which leaves no activity running and every device held off, whatever the
 * remote did before: the Off activity powers off every device the engine still holds on. That step is not
 * judged, since what it sends depends on what ran before the test, which the documents cannot say.
 */
import { harmonyTouch } from '@harmony/codec';

import type { Expectation, TestDefinition, TestStep } from './irsession.ts';
import { TIMING, TouchEngine, type Send } from './touchengine.ts';

type Configuration = harmonyTouch.Configuration;

/**
 * The set the bench Touch holds since `todo-touch.md` 6.9, by its path in the lab: the predictions are made from
 * it, and the monitor names the Touch's codes from it, `BENCH_TOUCH_SETS` in `irmonitor.ts`.
 */
export const TOUCH_7_1_SET = 'work/touch-firmware/sets/6.9-label-back/set.json';

/**
 * The configuration the predictions read: the set's six documents, and the favourites' documents the remote has
 * held since the recorded full sync, which no set of this project carries and every sync of it answered 304.
 * `favourites` is the recorded sync's documents keyed by address, `content://` ones taken and the rest ignored.
 */
export function touch71Configuration(set: { readonly answers: readonly unknown[] }, favourites: Readonly<Record<string, unknown>>): Configuration {
  const documents = Object.create(null) as Record<string, unknown>;
  for (const [address, document] of Object.entries(favourites)) if (address.startsWith('content://')) documents[address] = document;
  Object.assign(documents, harmonyTouch.documentsOfAnswers(set.answers as harmonyTouch.SyncAnswer[]));
  return harmonyTouch.readConfiguration(documents as harmonyTouch.SyncDocuments);
}

/** One thing the person does. */
export type TouchAction =
  /** An activity from the activity list, or Off when `activity` is null. */
  | { readonly start: string | null }
  /** A key of the keypad, tapped or held past the long press. */
  | { readonly key: string; readonly hold?: true }
  /** Device mode for a device, from the Devices list on the screen; sends nothing. */
  | { readonly device: string }
  /** The favourites screen, by the Favorites mark above the screen; sends nothing. */
  | { readonly favourites: true }
  /** A favourite channel on that screen, by the name it shows. */
  | { readonly favourite: string };

export interface TouchStep {
  readonly actions: readonly TouchAction[];
  /** False for a step whose sends depend on what ran before the test: the first Off. */
  readonly judged: boolean;
}

export interface TouchTestPlan {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly steps: readonly TouchStep[];
}

/** How far a judged pause may sit outside the model's band: the 3.2 and 6.9 runs sat within 54 ms of it, touch71.test.ts. */
export const PAUSE_SLACK_MS = 150;

/** The words the keypad's keys are called by in an instruction: the printed word, else what the symbol shows. */
export const KEY_WORDS: Readonly<Record<string, string>> = {
  Menu: 'Menu', Exit: 'Exit', Info: 'Info', Guide: 'Guide', PrevChannel: 'Previous',
  DirectionUp: 'Up', DirectionDown: 'Down', DirectionLeft: 'Left', DirectionRight: 'Right', Select: 'OK',
  VolumeUp: 'Volume Up', VolumeDown: 'Volume Down', VolumeMute: 'Mute', ChannelUp: 'Channel Up', ChannelDown: 'Channel Down',
  Red: 'Red', Green: 'Green', Yellow: 'Yellow', Blue: 'Blue',
  Rewind: 'Rewind', Play: 'Play', Pause: 'Pause', FastForward: 'Fast Forward', Stop: 'Stop', Record: 'Record', DVR: 'DVR',
};

/** The keypad in the groups a step presses together, top to bottom of the remote. */
export const KEY_GROUPS: readonly (readonly string[])[] = [
  ['Menu', 'Exit', 'Info', 'Guide', 'PrevChannel'],
  ['DirectionUp', 'DirectionDown', 'DirectionLeft', 'DirectionRight', 'Select'],
  ['VolumeUp', 'VolumeDown', 'VolumeMute', 'ChannelUp', 'ChannelDown'],
  ['Red', 'Green', 'Yellow', 'Blue'],
  ['Rewind', 'Play', 'Pause', 'FastForward', 'Stop', 'Record', 'DVR'],
];

/** An action's words in an instruction. */
export function wordsOf(a: TouchAction): string {
  if ('start' in a) return a.start === null ? 'Button: Off' : `Activity: ${a.start}`;
  if ('key' in a) return `Button: ${KEY_WORDS[a.key] ?? a.key}${a.hold === true ? ', hold 1 s' : ''}`;
  if ('device' in a) return `Screen: Devices → Screen: ${a.device}`;
  if ('favourites' in a) return 'Button: Favorites';
  return `Screen: ${a.favourite}`;
}

/**
 * The key steps of one map: every key it holds, tapped, in the keypad's groups, then every key with a long
 * press, held. `keys` is the map's key buttons.
 */
export function keySteps(keys: readonly harmonyTouch.ReadButton[]): TouchStep[] {
  const held = new Set(keys.map((b) => b.key));
  const known = new Set(KEY_GROUPS.flat());
  const stray = keys.filter((b) => !known.has(b.key ?? ''));
  if (stray.length > 0) throw new Error(`keys no group holds: ${stray.map((b) => b.key).join(', ')}`);
  const out: TouchStep[] = KEY_GROUPS
    .map((group) => group.filter((k) => held.has(k)).map((key) => ({ key }) as TouchAction))
    .filter((actions) => actions.length > 0)
    .map((actions) => ({ actions, judged: true }));
  const long = KEY_GROUPS.flat().filter((k) => keys.find((b) => b.key === k)?.longPress !== undefined);
  if (long.length > 0) out.push({ actions: long.map((key) => ({ key, hold: true }) as TouchAction), judged: true });
  return out;
}

/** The favourite named `name` on the activity's favourites screen, with its number. */
function favouriteNumber(c: Configuration, name: string): { activity: string; number: string } {
  for (const f of c.favourites) {
    const found = f.favourites.filter((x) => x.name === name);
    if (found.length === 1 && typeof found[0]!.number === 'string') return { activity: f.activity.name ?? '', number: found[0]!.number };
  }
  throw new Error(`no one favourite named ${name}`);
}

/** What the engine sends for each action of a step, one list per action. */
function walk(e: TouchEngine, c: Configuration, step: TouchStep, mode: { device: string | undefined }): Send[][] {
  return step.actions.map((a) => {
    if ('start' in a) {
      mode.device = undefined;
      return e.start(a.start ?? undefined);
    }
    if ('key' in a) return e.key(a.key, a.hold === true ? 'hold' : 'tap', mode.device);
    if ('device' in a) {
      mode.device = a.device;
      return [];
    }
    if ('favourites' in a) return [];
    const f = favouriteNumber(c, a.favourite);
    return e.favourite(f.activity, f.number);
  });
}

const down50 = (ms: number) => Math.max(0, Math.floor(ms / 50) * 50);
const up50 = (ms: number) => Math.ceil(ms / 50) * 50;

/** One plan as a test definition: instructions from the actions, expectations from the model. */
export function touchTest(c: Configuration, plan: TouchTestPlan): TestDefinition {
  const low = new TouchEngine(c, TIMING.low);
  const high = new TouchEngine(c, TIMING.high);
  const modes = { low: { device: undefined as string | undefined }, high: { device: undefined as string | undefined } };
  const steps: TestStep[] = plan.steps.map((step) => {
    low.idle();
    high.idle();
    const a = walk(low, c, step, modes.low);
    const b = walk(high, c, step, modes.high);
    const instruction = step.actions.map(wordsOf).join(' → ');
    if (!step.judged) return { instruction };
    const expect: Expectation[] = [];
    a.forEach((sends, at) => {
      const other = b[at]!;
      const key = (s: Send) => `${s.device}\u0000${s.command}`;
      if (sends.map(key).join('|') !== other.map(key).join('|')) {
        throw new Error(`${plan.id}: "${instruction}" sends a different order at the two ends of the timing band`);
      }
      if (sends.filter((s) => s.unordered).length > 1) {
        throw new Error(`${plan.id}: "${instruction}" powers off several devices in an order the engine does not fix`);
      }
      sends.forEach((s, i) => {
        const previous = expect[expect.length - 1];
        // The same code again straight after is one expectation heard that many times.
        if (i > 0 && previous !== undefined && key(sends[i - 1]!) === key(s)) {
          (previous as { times?: number }).times = (previous.times ?? 1) + 1;
          return;
        }
        const one: { device: string; command: string; pauseMs?: [number, number] } = { device: s.device, command: s.command };
        if (i > 0) {
          const x = s.heardMs - sends[i - 1]!.heardMs;
          const y = other[i]!.heardMs - other[i - 1]!.heardMs;
          one.pauseMs = [down50(Math.min(x, y) - PAUSE_SLACK_MS), up50(Math.max(x, y) + PAUSE_SLACK_MS)];
        }
        expect.push(one);
      });
    });
    return expect.length > 0 ? { instruction, expect } : { instruction };
  });
  return { name: plan.name, summary: plan.summary, description: plan.description, steps };
}

const OFF: TouchStep = { actions: [{ start: null }], judged: false };
const OFF_JUDGED: TouchStep = { actions: [{ start: null }], judged: true };
const start = (activity: string): TouchStep => ({ actions: [{ start: activity }], judged: true });

/** The activities by name, in the order the activity list shows them. */
function activityNames(c: Configuration): string[] {
  return [...c.activities].filter((a) => !a.hidden).sort((x, y) => (x.order ?? 0) - (y.order ?? 0)).map((a) => a.name ?? '');
}

/**
 * The plans of 7.1, from the configuration: which activities and devices there are, and which keys each
 * map holds, are read from it, so the plans follow the documents rather than a list kept by hand.
 */
export function touch71Plans(c: Configuration): TouchTestPlan[] {
  const activities = activityNames(c);
  const common = 'todo-touch.md 7.1, on the bench Harmony Touch holding work/touch-firmware/sets/6.9-label-back (the recorded full sync\'s documents under tags of ours, 6.8 and 6.9). Every expectation is derived from those documents by packages/bench/src/touchengine.ts, a model of the engine read in the firmware, and named as the monitor names a code of the Touch\'s own documents. Step 1 presses Off so no activity runs and the engine holds every device off; what it sends depends on what ran before and is not judged.';
  const wait = 'Wait for the codes to stop before pressing Next: an activity start runs about 15 seconds, most of it the LG TV\'s 10 second power on delay.';
  const plans: TouchTestPlan[] = [];
  plans.push({
    id: 'touch-7-1-1-starts',
    name: 'Harmony Touch 7.1, every activity started from Off, and Off',
    summary: 'Each activity from Off, then Off: power on, inputs, start steps and power off, in order, with their delays.',
    description: `${common} Each activity is started with every device off and ended with Off. Predicted: a device powered in two states gets its PowerOn, one that steps (the KPN, Plex) its PowerToggle; the power ons in PowerOnOrder, each held back by the previous code and the device's InterDeviceDelay; then the inputs, but a device still in its power on delay is passed over, so the Denon's input (3.5 s delay) goes before the LG TV's (10 s), and the Switch's (1.5 s) before the LG TV's; then the start steps added by hand (Switch Box: the KPN's Info, 2 s, the KPN's 7). Off sends the end steps that are not power offs first (Switch Box: the LG TV's Mute), then each device's power off in PowerOffOrder. The Xbox holds its PowerOn and PowerOff for 2 s, its Duration. ${wait}`,
    steps: [OFF, ...activities.flatMap((a) => [start(a), OFF_JUDGED])],
  });
  plans.push({
    id: 'touch-7-1-2-switches',
    name: 'Harmony Touch 7.1, switching between activities',
    summary: 'One activity to the next: the new power ons first, then the old power offs, the Denon kept on.',
    description: `${common} Each activity is started while another runs. Predicted: the old activity's end steps that are not power offs first (from Switch Box the LG TV's Mute), then the new activity's power ons, but only for devices the engine holds off, then the old activity's power offs for devices the new one does not use, then the new inputs. The Denon is kept on between activities (IsPoweredOnBetweenActivities), so leaving an activity for one without it does not switch it off; only Off does. An input is sent every time, even when the device is already on it. ${wait}`,
    steps: [OFF, start('Watch TV'), start('Switch Box'), start('Watch a Blu-ray'), start('Play a Game'), start('Listen to Music'), start('Watch TV'), OFF_JUDGED],
  });
  const tuning = c.favourites[0];
  if (tuning === undefined || c.favourites.length !== 1) throw new Error('the plans expect one favourites activity');
  const names = tuning.favourites.map((f) => f.name ?? '');
  plans.push({
    id: 'touch-7-1-3-favourites',
    name: 'Harmony Touch 7.1, the favourite channels and their logos',
    summary: 'Each favourite tapped: its channel as digits to the LG TV; and whether each logo shows.',
    description: `${common} The favourites belong to ${tuning.activity.name}, tuned through the ${tuning.device?.name}, whose channel tuning pads a number to ${tuning.tuning?.fixedDigits ?? 'no fixed'} digits and sends nothing before or after it (its start, finish and prefix commands name no command). The favourites screen shows ${names.length}, in this order: ${tuning.favourites.map((f) => `${f.name} (channel ${f.number}${f.added ? ', added by hand, with its own uploaded picture' : ''})`).join(', ')}. In step 2, before tapping, write in the step's problem field whether each of the ${names.length} logos shows, and which do not; the monitor cannot see them. Predicted: a favourite tapped with no activity running starts ${tuning.activity.name} first and sends the digits at the end of the start; with it running, only the digits, each digit about ${tuning.device?.interKeyDelayMs ?? 0} ms (the LG TV's InterKeyDelay) after the one before. Two equal digits in a row are separate presses about 250 ms apart in silence; if the monitor shows one press with a repeat instead, read the frames before calling the step failed. ${wait}`,
    steps: [
      OFF,
      { actions: [{ favourites: true }, { favourite: names[1]! }], judged: true },
      ...[names[0]!, ...names.slice(2)].map((n) => ({ actions: [{ favourite: n }] as TouchAction[], judged: true })),
      OFF_JUDGED,
    ],
  });
  for (const [at, a] of activities.entries()) {
    const read = c.activities.find((x) => x.name === a)!;
    plans.push({
      id: `touch-7-1-${4 + at}-${slug(a)}-keys`,
      name: `Harmony Touch 7.1, the keys in ${a}`,
      summary: `Every key ${a}'s map holds, tapped, then every long press held.`,
      description: `${common} Then ${a} is started (judged as in the starts test) and every key its map binds is tapped, in groups from the top of the keypad, then every key with a long press is held for about 1 s. Predicted per key: the command the map binds, to the device it names (the volume keys to the activity's volume device); a key with a long press sends nothing when it goes down and its short command when let go inside about 0.55 s, its long command once held past that. A key the map does not bind sends nothing and is not pressed here.${read.map!.sequences.length > 0 ? ` A key bound to a sequence sends the sequence's commands as one list, a delay step sleeping its Duration: ${read.map!.sequences.map((s) => `${s.name}, ${s.steps.map((x) => (x.kind === 'delay' ? `${(x.durationMs ?? 0) / 1000} s` : x.commandName)).join(', ')}`).join('; ')}.` : ''} A tap held too long sends the long command instead: repeat the step and note it.`,
      steps: [OFF, start(a), ...keySteps(read.map!.keys), OFF_JUDGED],
    });
  }
  const withKeys = c.devices.filter((d) => (d.map?.keys.length ?? 0) > 0);
  const half = Math.ceil(withKeys.length / 2);
  for (const [part, devices] of [withKeys.slice(0, half), withKeys.slice(half)].entries()) {
    plans.push({
      id: `touch-7-1-${4 + activities.length}${'ab'[part]}-device-mode`,
      name: `Harmony Touch 7.1, device mode ${part + 1} of 2: ${devices.map((d) => d.name).join(', ')}`,
      summary: `Each device's own keys in device mode, tapped, then its long presses held.`,
      description: `${common} Each device is chosen from the Devices list with no activity running, and every key its own map binds is tapped, then every key with a long press held about 1 s. Predicted per key: the command the device's own map binds, to that device; activities play no part. Devices whose map binds no key are left out: ${c.devices.filter((d) => (d.map?.keys.length ?? 0) === 0).map((d) => d.name).join(', ') || 'none'}. A tap held too long sends the long command instead: repeat the step and note it.`,
      steps: [OFF, ...devices.flatMap((d) => [
        { actions: [{ device: d.name ?? '' }], judged: true } as TouchStep,
        ...keySteps(d.map!.keys),
      ])],
    });
  }
  return plans;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Every 7.1 test, derived. */
export function touch71Tests(c: Configuration): { id: string; definition: TestDefinition }[] {
  return touch71Plans(c).map((plan) => ({ id: plan.id, definition: touchTest(c, plan) }));
}
