/**
 * What the FHSDK must be able to do for an application, numbered, and how far each bench model has it: the
 * requirements and their statuses as data, decision 33.
 *
 * **A requirement** is one ability an application gets from these libraries, stated as what the application can do
 * for its user: read a configuration off the remote, add a device from the catalogue, learn a code. It is not an
 * implementation step and not a screen of any application. Each has a number, `R1` onwards, that is **never
 * renumbered and never reused**: a requirement that is dropped stays in the list with `withdrawn` set, so a number
 * cited in a comment, a test or another repository keeps meaning what it meant. `test/requirements.test.ts` holds
 * the numbers to one run from 1 with no gap, which is what makes a removal fail rather than pass quietly.
 *
 * **A status** says, per bench model, where the requirement stands:
 *
 * * `met`: in the FHSDK, shown by a test in this repository, and, for a requirement whose ability shows on a
 *   remote (`needsBench` below), shown working on a bench unit of that model, by a bench test or a passage of the
 *   model's test notes in `docs/test-notes/`. **A met is proven, never written**: the test says so itself, by a call
 *   of `proves` naming the requirement, the models and the bench record, and the met is derived from those calls,
 *   below. A build that passes every test and never ran on the remote is open.
 * * `open`: the model can plainly do it and the FHSDK does not yet, or does it without that evidence.
 * * `impossible`: the model cannot, by its hardware or firmware, and a page of `reference/` says so; or this project
 *   does not do it on that model by a decision, whose entry in `docs/decisions.md` is then the evidence, as the
 *   firmware install is the Harmony 600, 650 and 700's alone by decision 18. Either way nothing an application could
 *   wait for will change it, which is why a bench model's box can be ticked with an impossible standing.
 * * `unknown`: it is not known whether the model can. It counts as open for anything that plans work.
 *
 * An application offers a feature where it is met; the other three are for a developer. The requirements of the
 * last subject, and R68, the report about a remote this project does not support, are about the FHSDK as a whole
 * rather than any bench remote, and carry one status for every model.
 *
 * **Why this is data in the base rather than a document.** The application asks per model, through the codec's
 * `capabilitiesOf`, which also needs the family registry; a document cannot be asked, and a second copy of the
 * list in code would drift from it. So the list and the statuses live here, importing nothing but the proofs, and
 * `docs/remote-requirements.md`, `docs/remote-requirements-evidence.md` and a checklist per bench remote under
 * `todo/` are generated from them by `packages/codec/bin/requirements.ts`, with a test that fails when a committed
 * file differs from what the data generates.
 *
 * **Where the proofs come from.** An application reads statuses at run time and cannot read test sources, so the
 * generator reads them, statically, and writes what it finds into `proofs.ts` beside this module: every call of
 * `proves` in a test, with the test's file and title. That module is generated and checked against the sources, so
 * it is never edited by hand; a test that gains or loses a proof is followed by `make requirements-write`.
 *
 * **The written statuses were judged conservatively**, by reading every model's test notes and bench tests for both
 * halves of the evidence; one changes here, in the same commit as the test or the bench run that moves it. A status
 * that becomes met is taken out of the data below and its proof put into the test that shows it.
 */
import { PROOFS, type Proof } from './proofs.ts';

// The proofs, so an application and the checks reach them through this module, the one the subpath names.
export { PROOFS };
export type { Proof };

/** Where a requirement stands on one model. */
export type RequirementStatus = 'met' | 'open' | 'impossible' | 'unknown';

/** The four statuses, in the order a table or a count lists them. */
export const REQUIREMENT_STATUS_NAMES: readonly RequirementStatus[] = ['met', 'open', 'impossible', 'unknown'];

/**
 * Whether a requirement has a status per model, or one for the FHSDK as a whole. A whole one is about how the
 * libraries are built and delivered, offline, in a browser, as published packages, and no remote changes it.
 */
export type RequirementScope = 'model' | 'whole';

export interface Requirement {
  /** The permanent number, `R` and this. Never renumbered, never reused. */
  readonly number: number;
  /** The subject it is listed under, one of `REQUIREMENT_SUBJECTS`. */
  readonly subject: string;
  /** What an application can do, in one sentence. */
  readonly text: string;
  readonly scope: RequirementScope;
  /**
   * Whether met needs a bench demonstration as well as a test: true where the ability shows on a remote, a
   * configuration it runs, a device it drives, a read or a write over the cable; false where a test can show it
   * whole, reading a configuration's bytes, searching the catalogue, writing Pronto Hex.
   */
  readonly needsBench: boolean;
  /** Set when the requirement is dropped. It stays in the list, so its number is never given to another. */
  readonly withdrawn?: true;
}

/** True for a requirement whose met needs a bench demonstration, `Requirement.needsBench`; read as the table below is. */
const SHOWN = true;
/** False for a requirement a test shows whole. */
const TESTED = false;

/**
 * The requirements by subject, in the order they are numbered. Kept as groups so the subject is written once and the
 * document's sections follow it; `REQUIREMENTS` below is the flat list an application reads.
 */
const GROUPS: readonly {
  readonly subject: string;
  readonly scope: RequirementScope;
  /** Each requirement; a fourth element sets a scope other than its group's. */
  readonly requirements: readonly (readonly [number: number, needsBench: boolean, text: string, scope?: RequirementScope])[];
}[] = [
  {
    subject: 'The whole configuration',
    scope: 'model',
    requirements: [
      [1, SHOWN, 'Read the configuration off the remote, whole and checked.'],
      [2, TESTED, 'Understand a configuration: its devices, activities, keys, screens, delays and codes, and what each key will send.'],
      [3, TESTED, 'Read a configuration back into a recipe, so a setup can be edited and rebuilt; from our own builds whole, favourites included, through a record of ours carried inside.'],
      [4, SHOWN, 'Build a whole configuration from a recipe.'],
      [5, SHOWN, 'Write a configuration to the remote, verified by reading it back, and the remote runs it.'],
      [6, SHOWN, 'Write the user\'s own remote: take a remote never seen, record its identity and a full backup, and from then on write to that unit only.'],
      [7, TESTED, 'Refuse a configuration that does not fit the model or would be mishandled, and say what is over.'],
      [8, SHOWN, 'Detect changes made on the remote since the app last wrote it, the help\'s own delay fixes among them, and keep or discard them.'],
    ],
  },
  {
    subject: 'Devices and codes',
    scope: 'model',
    requirements: [
      [9, TESTED, 'Find a device in the catalogue by manufacturer, model number and type, with help for typing errors.'],
      [10, SHOWN, 'Add a device from the catalogue with its commands, power and inputs, choosing the code set version where a device has several.'],
      [11, SHOWN, 'Add a device the catalogue does not know, from its type and commands taught from its original remote, its definition saying it was learned.'],
      [12, SHOWN, 'Rename a device.'],
      [13, SHOWN, 'Remove a device, and say and settle what happens to the activities and favourites that used it.'],
      [14, SHOWN, 'Set how a device is powered: one key or two, none, always on, kept on between activities, extra commands to power up, a power code that must be held.'],
      [15, SHOWN, 'Set how a device changes inputs and which inputs it has.'],
      [16, SHOWN, 'Set a device\'s delays, and put them back to their defaults.'],
      [17, SHOWN, 'Set how many times a device\'s commands repeat.'],
      [18, SHOWN, 'Set how a device tunes a channel number.'],
      [19, SHOWN, 'Add, fix and remove a device\'s command, and put a fixed one back to its original code.'],
      [20, TESTED, 'Export and import codes as Pronto Hex.'],
    ],
  },
  {
    subject: 'Activities',
    scope: 'model',
    requirements: [
      [21, SHOWN, 'Create an activity of a kind with its devices; starting, switching and Off behave as the manuals describe.'],
      [22, SHOWN, 'Say which device does which job in an activity, and map its keys from that, a learned command with a standard name landing on its usual key.'],
      [23, SHOWN, 'Set each device\'s input in an activity, or leave it alone.'],
      [24, SHOWN, 'Include a pass through device in an activity.'],
      [25, SHOWN, 'Rename an activity.'],
      [26, SHOWN, 'Remove an activity.'],
      [27, SHOWN, 'Give an activity an icon.'],
      [28, SHOWN, 'Order the activity menu and an activity\'s device list.'],
      [29, SHOWN, 'Choose which activities the activity keys start.'],
      [30, SHOWN, 'Add steps to an activity\'s start and end: commands, pauses, a sequence.'],
    ],
  },
  {
    subject: 'Keys and screens',
    scope: 'model',
    requirements: [
      [31, SHOWN, 'Change what a key does in an activity: any command of its devices, a sequence, or nothing.'],
      [32, SHOWN, 'Change what a key does for a device in device mode, any device\'s command included, such as the receiver\'s volume in TV mode.'],
      [33, SHOWN, 'Give a device its device mode map from the catalogue, every key and screen page, as Logitech\'s software would.'],
      [34, SHOWN, 'Put commands on an activity\'s screen, labelled and ordered, across pages.'],
      [35, SHOWN, 'Put commands on a device\'s screen pages in device mode.'],
      [36, SHOWN, 'A screen button that opens a page of the user\'s own commands, and a button back.'],
      [37, SHOWN, 'Make a named sequence with pauses and put it on a key or the screen, within what the remote survives.'],
      [38, SHOWN, 'Give a key a second command when held.'],
      [39, SHOWN, 'Put devices on the device keys, a short and a long press each.'],
      [40, SHOWN, 'Give an activity\'s touch gestures their commands.'],
      [41, SHOWN, 'Show every screen as the remote will draw it, before writing.'],
      [42, SHOWN, 'Choose the look of the screens: typeface, inks, colours, icons, background, theme, choices per screen.'],
      [43, TESTED, 'Draw the remote\'s face and know which key is which.'],
      [44, SHOWN, 'Give every activity the remote\'s own help, the advanced help and its delay fixing included.'],
    ],
  },
  {
    subject: 'Favourites',
    scope: 'model',
    requirements: [
      [45, SHOWN, 'Favourite channels: the number kept as text, a name, on keys or screen pages, ordered and removed.'],
      [46, SHOWN, 'A favourite with an icon.'],
    ],
  },
  {
    subject: 'Settings',
    scope: 'model',
    requirements: [
      [47, SHOWN, 'Read and change the remote\'s own settings as far as the model offers them, the touch sound and the tutorial after the first write among them, and put them back to defaults.'],
      [48, SHOWN, 'How long the screen stays lit, and its brightness.'],
      [49, SHOWN, 'The motion sensor on or off.'],
      [50, SHOWN, 'The Remote Assistant and the "Starting Activity" message on or off.'],
      [51, SHOWN, 'The kind of help, Smart or Full.'],
      [52, SHOWN, 'The clock: the right time, how it is shown, and read back.'],
      [53, SHOWN, 'A slideshow of the user\'s pictures.'],
    ],
  },
  {
    subject: 'Learning',
    scope: 'model',
    requirements: [
      [54, SHOWN, 'Learn an infrared command from the original remote through the Harmony\'s own receiver.'],
      [55, SHOWN, 'Use a learned code in a device, on any key or screen button, input commands included.'],
      [56, TESTED, 'Recognise a learned code as a known kind and keep it compactly, or as captured when it is not.'],
      [57, TESTED, 'Identify a device the catalogue does not recognise from a few taught commands.'],
    ],
  },
  {
    subject: 'Backup and restore',
    scope: 'model',
    requirements: [
      [58, SHOWN, 'Back up a remote whole and keep it on the computer.'],
      [59, SHOWN, 'Put a backup back on the same remote.'],
      [60, SHOWN, 'Move a setup to another remote or model, or copy devices and activities from one setup into another, adapted to the target\'s limits.'],
      [61, SHOWN, 'Clear a remote\'s setup so it starts fresh, by writing an empty configuration, never through the firmware\'s own reset.'],
    ],
  },
  {
    subject: 'Status and identity',
    scope: 'model',
    requirements: [
      [62, SHOWN, 'Find the attached remotes and their models without claiming them.'],
      [63, SHOWN, 'Tell one unit from another, and say when the wrong one is connected.'],
      [64, SHOWN, 'The firmware version and hardware details.'],
      [65, SHOWN, 'The battery level, and a warning or refusal before a write when it is low.'],
      [66, SHOWN, 'Progress during a read or a write, and the remote showing it is being written.'],
      [67, SHOWN, 'Show live which key is pressed on a connected remote.'],
      [68, SHOWN, 'A report about a remote this project does not support, which its owner can publish.', 'whole'],
    ],
  },
  {
    subject: 'Firmware',
    scope: 'model',
    requirements: [
      [69, SHOWN, 'Know the firmware state: running, safe mode or bootloader, and whether a newer version exists.'],
      [70, SHOWN, 'Install Logitech\'s own unmodified firmware, from a file the user has or from Logitech\'s update service; the 600, 650 and 700 only, by decision 18.'],
      [71, SHOWN, 'Bring a stuck remote back.'],
    ],
  },
  {
    subject: 'Logitech\'s service',
    scope: 'model',
    requirements: [
      [72, TESTED, 'Import devices and activities from the user\'s own Logitech account, if they ask and give their own credentials; the app works the same without it.'],
    ],
  },
  {
    subject: 'The FHSDK as a whole',
    scope: 'whole',
    requirements: [
      [73, TESTED, 'Everything works offline, with no account.'],
      [74, TESTED, 'Reading and building run in a browser or an app window, the USB half in the app\'s main process.'],
      [75, TESTED, 'An app depends on published packages, not on a checkout beside it.'],
    ],
  },
];

/** The subjects, in the order the requirements are numbered and the document lists them. */
export const REQUIREMENT_SUBJECTS: readonly string[] = GROUPS.map((group) => group.subject);

/** Every requirement, in number order, withdrawn ones included. */
export const REQUIREMENTS: readonly Requirement[] = GROUPS.flatMap((group) =>
  group.requirements.map(([number, needsBench, text, scope]) => ({ number, subject: group.subject, text, scope: scope ?? group.scope, needsBench })));

/** The requirement with this number, or undefined for a number never given. */
export function requirement(number: number): Requirement | undefined {
  return REQUIREMENTS.find((one) => one.number === number);
}

// ---------------------------------------------------------------------------------------------------
// The bench models
// ---------------------------------------------------------------------------------------------------

/**
 * The bench models by a stable key an application can store: the name of the model's folder under
 * `reference/remotes/`, so a key also finds the model's facts.
 */
export type BenchModelKey =
  | 'harmony-one' | 'harmony-600' | 'harmony-650' | 'harmony-700' | 'harmony-525' | 'harmony-515' | 'harmony-885'
  | 'harmony-785' | 'harmony-300' | 'harmony-350' | 'harmony-touch';

export interface BenchModel {
  readonly key: BenchModelKey;
  /** Logitech's name for the model, as the family registry's `chooseByModel` asks for it with the first skin. */
  readonly name: string;
  /**
   * The skins a remote of this model reports, which is how a connected remote finds its model, the first the one the
   * family registry chooses the model's family by. The skins and their models are `models.ts` and, for the models
   * that table holds no record of, the registry's `MODELS_OUTSIDE_THE_TABLE`.
   */
  readonly skins: readonly number[];
}

/**
 * The eleven models a unit of which is on the bench, in the order the document's tables list them: the models with a
 * screen first, then the two without, then the Harmony Touch.
 *
 * **The skins are only those this library can tell apart as this model.** The Harmony One and the 600, 650 and 700
 * each have a European skin beside the American one, the same hardware in another region, `models.ts`. The Harmony
 * 525 is skin 22 alone: skin 18, the 520, is the same row of the comparison table and a different keypad, without
 * the colour keys. The Harmony 515 is skin 67 alone: skin 68, the 510, is its regional twin by the model
 * table, and whether the 510's face is the 515's is not checked. The Harmony 885 is skin 17 alone for the same reason, the 880, skin 15, carrying a pair of chevrons
 * where the 885 has the colour keys. The Harmony 785 is skin 45 alone: the model table names skin 44, the Harmony 720, its
 * regional twin, but the 785's face carries keys the 720's does not, `reference/remotes/harmony-785/README.md`. The
 * Harmony 300 is skin 79, the European one a unit of which is on the bench;
 * skin 78 is its American printing, which the registry does not choose a family for, so it is left out rather than
 * answered with statuses measured on the other printing. The Harmony 350 is skin 104 and the Harmony Touch skin 99,
 * `reference/remotes/harmony-touch/README.md`.
 */
export const BENCH_MODELS: readonly BenchModel[] = [
  { key: 'harmony-one', name: 'Harmony One', skins: [54, 59] },
  { key: 'harmony-600', name: 'Harmony 600', skins: [71, 73] },
  { key: 'harmony-650', name: 'Harmony 650', skins: [72, 74] },
  { key: 'harmony-700', name: 'Harmony 700', skins: [66, 69] },
  { key: 'harmony-525', name: 'Harmony 525', skins: [22] },
  { key: 'harmony-515', name: 'Harmony 515', skins: [67] },
  { key: 'harmony-885', name: 'Harmony 885', skins: [17] },
  { key: 'harmony-785', name: 'Harmony 785', skins: [45] },
  { key: 'harmony-300', name: 'Harmony 300', skins: [79] },
  { key: 'harmony-350', name: 'Harmony 350', skins: [104] },
  { key: 'harmony-touch', name: 'Harmony Touch', skins: [99] },
];

/** The bench model a key or a reported skin names, or undefined where it names none. */
export function benchModel(keyOrSkin: BenchModelKey | number): BenchModel | undefined {
  return typeof keyOrSkin === 'number'
    ? BENCH_MODELS.find((model) => model.skins.includes(keyOrSkin))
    : BENCH_MODELS.find((model) => model.key === keyOrSkin);
}

// ---------------------------------------------------------------------------------------------------
// The statuses and their evidence
// ---------------------------------------------------------------------------------------------------

/**
 * One requirement's status on one model, with what it rests on. Every path is relative to the repository's root and
 * names a file that exists, a test-notes passage by its heading's anchor; `test/requirements.test.ts` holds both.
 *
 * **A met is never written here.** It is derived from the proofs, the calls of `proves` inside the tests that show a
 * requirement, which `packages/codec/bin/requirements.ts` reads off the test sources into `proofs.ts`: a requirement
 * is met on a model when at least one proof names it for that model, and its tests and bench records are the
 * proofs'. What is written by hand below is the other three, open, impossible and unknown, each with its reason. So
 * a test rewritten to show something else takes its proof with it, where a met typed here would have stayed.
 */
export interface RequirementState {
  readonly status: RequirementStatus;
  /** The test files whose proofs make it met, in the order of the proofs. Empty but for met. */
  readonly tests: readonly string[];
  /** Where it was shown on a bench unit of the model, the proofs' bench records together. Empty but for met. */
  readonly bench: readonly string[];
  /** The proofs a met rests on, each naming its test by file and title. Empty but for met. */
  readonly proofs: readonly Proof[];
  /**
   * The reference pages a status rests on: for impossible the page that says the model cannot, or the entry of
   * `docs/decisions.md` that rules it out, one of the two required; for unknown the page that leaves the question
   * open, where one does.
   */
  readonly reference: readonly string[];
  /**
   * In one sentence: what is missing, why not, or what is not known, as written; for a met, generated from its
   * proofs, saying how many tests prove it and whether it was shown on a unit, since the tests' own titles say what.
   */
  readonly why: string;
}

/** The written statuses carry no proof; the field is for a met. */
const NO_PROOF: readonly Proof[] = [];

/** Open, saying what is missing. */
function open(why: string): RequirementState {
  return { status: 'open', tests: [], bench: [], proofs: NO_PROOF, reference: [], why };
}

/** Impossible on the model, with the reference page that says so. */
function impossible(reference: readonly string[], why: string): RequirementState {
  return { status: 'impossible', tests: [], bench: [], proofs: NO_PROOF, reference, why };
}

/** Unknown, saying what is not known, with the reference page that leaves it open where one does. */
function unknown(why: string, reference: readonly string[] = []): RequirementState {
  return { status: 'unknown', tests: [], bench: [], proofs: NO_PROOF, reference, why };
}

/**
 * Every bench model's written status on the requirements of the models, R1 to R72 but R68, that no proof makes met:
 * open, impossible or unknown, each with its reason, judged by reading the model's test notes, its bench tests and its
 * reference pages. A requirement a proof names for the model has no entry here, and one with neither is a fault,
 * `test/requirements.test.ts`: every requirement on every model is proven or written, never both.
 */
const MODEL_STATUSES: Readonly<Record<BenchModelKey, Readonly<Record<number, RequirementState>>>> = {
  // The Harmony One.
  'harmony-one': {
    3: open('Nothing turns a One configuration back into a recipe, and no record of ours is carried inside one yet.'),
    6: open('The writer permits only the bench units on its list; a One never seen cannot be recorded and made a write target.'),
    8: open('Nothing reads back what was changed on the One itself, such as its Options settings, so no change is detected or kept.'),
    9: open('The catalogue lists manufacturers and models, but there is no search by type and no help for typing errors.'),
    10: open('Catalogue devices compose and were heard, but no code set version can be chosen and inputs chosen through a menu are refused.'),
    11: open('Nothing learns on a One, so a device the catalogue lacks cannot be built from taught commands.'),
    12: open('A device\'s name is set only when a recipe is built; no test or run shows an existing device renamed.'),
    13: open('Nothing removes a device or settles the activities and favourites that used it.'),
    14: open('Catalogue power composes, but a power code that must be held is not composed or tested for the One.'),
    15: open('Direct inputs come from the catalogue; how a device changes inputs cannot be set, and inputs through a menu are refused.'),
    16: open('A power on delay was edited and written to the spare; other delays and a return to defaults are not offered.'),
    17: open('Repeats follow the catalogue\'s count; nothing lets a repeat count be set.'),
    18: open('Nothing sets how a device tunes a channel number.'),
    19: open('Nothing adds, fixes or removes one command of a device, or puts back its original code.'),
    22: open('Keys are mapped from roles and the Denon\'s volume was heard; the learned command part does not exist for the One.'),
    24: open('The pass through test covers the Harmony 650 only, and no One test note records the switch being driven.'),
    25: open('An activity\'s name is set only when a recipe is built; no test or run shows an existing activity renamed.'),
    26: open('Nothing removes an activity from a configuration; only building a recipe without it would leave it out.'),
    27: open('Icons are chosen per activity type in the look choices, never for one activity.'),
    28: open('The menu follows the recipe\'s order, but an activity\'s device list always puts its started devices first and cannot be ordered.'),
    29: impossible(['reference/remotes/harmony-one/keys.md#every-key-on-the-drawing'], 'The One has one Activities key that opens the list and no keys that start an activity.'),
    30: open('Nothing adds commands, pauses or a sequence to an activity\'s start or end.'),
    31: open('A recipe cannot bind a key in an activity; the keypad comes only from the devices\' roles.'),
    32: open('A recipe cannot bind a key in device mode; the map comes only from the catalogue.'),
    33: open('Device mode maps compose as Logitech\'s and a page command was heard, but no keypad key in device mode was pressed at the bench.'),
    34: open('Screen commands are placed in order and were heard, but no label of the user\'s own can be given and no run showed several pages.'),
    35: open('A device\'s screen pages are laid out from the catalogue, and a recipe cannot choose or order them.'),
    36: open('Nothing builds a screen button that opens a page of the user\'s own commands.'),
    37: open('A named sequence was heard on the spare only in a run composed onto Logitech\'s file; no build from a recipe with a sequence has been on the One.'),
    38: impossible(['reference/remotes/harmony-one/keys.md#what-pressing-or-holding-does'], 'The One has no long press; a held key repeats its command.'),
    39: impossible(['reference/remotes/harmony-one/keys.md#every-key-on-the-drawing'], 'The One has no device keys; a device is picked from the list the Devices key opens.'),
    40: unknown('It is not known whether the One\'s touch panel reads any gesture beyond a touch on a rectangle.'),
    41: open('One screens render, but no test note compares a rendered screen with what the spare drew.'),
    42: open('Letters, inks, box colours and icons are choices; a background picture of the user\'s own and a theme are not.'),
    43: open('The One is drawn with every key named, but six keys, among them Activities, Help and Off, have no measured scan code.'),
    44: open('Only the power off help with nothing running is built; an activity\'s help and the advanced help with delay fixing are not.'),
    45: open('Nothing of ours writes a favourite channel for the One, and the builders refuse a recipe that states one.'),
    46: open('No favourite channel is built for the One, so none can carry an icon.'),
    47: open('Screen light, start assistant and tour are build choices; nothing reads the remote\'s settings, sets screen sounds or restores defaults.'),
    48: open('How long the screen stays lit is a choice and was timed on the spare; brightness cannot be set.'),
    49: unknown('The One lights when picked up, but whether that sensing can be switched off is not known.'),
    50: open('The assistant at start can be left out, but the assistant after an activity starts and the Starting screen cannot be switched.'),
    51: open('Nothing chooses between Smart and Full help on the One.'),
    52: open('A write stamps the time and the clock reads over USB, but its format is no choice and the time after a write is unchecked.'),
    53: open('Nothing builds a slideshow of the user\'s pictures for the One.'),
    54: open('Nothing sends the learning commands to a One.'),
    55: open('How a learned code is stored in a One configuration is not known, so none can be used.'),
    56: open('A learned code is recognised by the Harmony Touch\'s reader; nothing keeps one in a Harmony One configuration.'),
    57: open('Code numbers are ranked against the catalogue\'s codesets, but no test identifies a device from a few taught commands.'),
    59: open('A whole backup has never been put back on a One; only one block of its own was written back unchanged.'),
    60: open('Nothing adapts a setup to another model or copies devices and activities from one setup into another.'),
    65: open('The One\'s battery reading has not been checked, and nothing warns or refuses a write when it is low.'),
    66: open('A read reports progress, but a write does not, and nothing makes the One show it is being written.'),
    67: impossible(['reference/remotes/harmony-one/behaviour.md#on-the-cable'], 'On the cable the One\'s keypad handler stops, so a key press cannot be watched live.'),
    69: open('The version block shows running or safe mode, but nothing knows whether a newer firmware exists.'),
    70: impossible(['docs/decisions.md#d18'], 'Decision 18 allows the firmware install on the Harmony 600, 650 and 700 alone, so the FHSDK never installs firmware here.'),
    71: open('Nothing in the FHSDK brings a stuck One back; the recovery paths built are other models\'.'),
    72: open('Logitech\'s service serves the One, but its client is tied to test accounts and is on no public entry.'),
  },
  // The Harmony 600.
  'harmony-600': {
    3: open('Nothing turns a compiled configuration back into a recipe, and the record of ours carried inside a configuration is not built.'),
    6: open('Every write path permits only the bench units\' records; taking up a remote never seen as a write target is not built.'),
    8: open('Saved delays are read and cleared on the 600, but nothing compares with the last write or keeps them in a new build.'),
    9: open('The catalogue lists manufacturers and models, but offers no help for typing errors.'),
    10: open('Catalogue devices with commands, power and inputs ran on the 600; choosing a code set version is not offered.'),
    11: open('Learning is not built for this family, so a device taught from its original remote cannot be made.'),
    12: open('A device\'s name comes from the recipe, but no run on the 600 changed a name and showed the new one.'),
    13: open('Nothing removes a device and settles the activities and favourites that used it.'),
    14: open('Keeping a device on ran on the 600; no power, always on, extra power steps and a held power code are not offered.'),
    15: open('Direct inputs ran on the 600; inputs chosen through a menu are refused, and a recipe cannot state a device\'s inputs.'),
    16: open('A power on delay edit was heard on the 600; per device inter device and input delays, and a return to defaults, are not offered.'),
    17: open('Repeat counts are composed from the catalogue; nothing lets an application set them.'),
    18: open('Channel tuning comes from the catalogue entry; nothing lets an application set it.'),
    19: open('Nothing adds, fixes or removes one command of a device, or puts a fixed one back.'),
    22: open('Keys mapped from roles ran on the 600; a learned command landing on its usual key is not built, since learning is not.'),
    24: open('A pass through device ran on the 600 only in a six device build, made by raising the library\'s refused limit.'),
    25: open('An activity\'s name comes from the recipe, but no run on the 600 changed a name and showed the new one.'),
    26: open('Nothing removes an activity from an existing setup, and no run on the 600 dropped one.'),
    27: unknown('No reference page says whether the 600\'s monochrome screen can show an activity icon.'),
    28: open('The menu follows the recipe\'s order, but no 600 run records the order shown, nor an activity\'s device list order.'),
    30: open('Extra commands, pauses or a sequence at an activity\'s start or end are not offered.'),
    31: open('A recipe cannot state a key binding in an activity; the keypad comes from roles only.'),
    32: open('Device mode\'s map comes from the catalogue only; a recipe cannot change what a key sends there.'),
    33: open('Device pages were visited on the 600, but its device mode keypad was not exercised, and the rules differ from Logitech\'s on some devices.'),
    34: open('Screen commands ran on the 600, but no activity there held more than one page, so paging is not shown.'),
    35: open('Device pages come from the catalogue only; choosing their commands is not offered.'),
    36: open('A screen button opening a page of the user\'s own commands is not built.'),
    38: impossible(['reference/remotes/harmony-600/features.md#the-capability-fields', 'reference/architectures/harmony-600-650-700/README.md#keys'], 'The firmware tells no long press from a short one, and Logitech declares none for the 600.'),
    39: impossible(['reference/remotes/harmony-600/behaviour.md#device-mode-in-and-out'], 'The 600 has no device keys; a device is chosen from a list under the centre key.'),
    40: impossible(['reference/remotes/harmony-600/display.md#the-panel'], 'The 600 has no touch panel.'),
    41: open('Pages render as stored, but what the monochrome panel makes of each colour is not measured.'),
    42: open('Letters, blending and the one grey were seen on the 600; state colours are refused and other looks were never written to it.'),
    44: open('Help is left out of every build of this family; advanced help and its delay fixing are not built.'),
    45: open('Every composer refuses favourites; the 600 shows them on Watch TV\'s screen by its manual.'),
    46: open('No favourite is built for the 600, so no favourite icon either.'),
    47: open('Settings are not read back, and the tutorial choice was never shown on the 600; it has no touch sound.'),
    48: open('The stated 20 s screen light was seen on the 600; no other value was written, and a brightness setting is not known.'),
    49: open('The tilt sensor is a build choice, but no build with it off ran on the 600.'),
    50: open('The Remote Assistant is left out of every build; switching it on, or a start message, is not offered.'),
    51: unknown('No reference page says whether the 600 offers Smart or Full help.'),
    52: open('The 600 shows no clock; its clock is read only as raw memory, and setting it over USB is deliberately not built.'),
    53: unknown('No reference page says whether the 600 can show a slideshow.'),
    54: open('The 600 learns by its manual, but nothing in the FHSDK sends the learning command.'),
    55: open('How a learned code is stored on this family is not read, so none can be used.'),
    56: open('A learned code is recognised by the Harmony Touch\'s reader; nothing keeps one in a 600 configuration.'),
    57: open('Code numbers are ranked against the catalogue\'s codesets, but no test identifies a device from a few taught commands.'),
    60: open('A setup past the 600\'s limits is refused, not adapted; the five device setup was cut by hand.'),
    62: open('Listing and the model from the release number are tested, but the 600\'s enumeration was recorded with the system\'s tools, not the FHSDK.'),
    65: open('The battery read exists but was never sent to a 600, and no low battery warning or refusal is built.'),
    66: open('Read progress is reported, but nothing makes the remote show it is being written.'),
    67: open('A watch address exists for the 600, but no run names a pressed key live; on the cable only matrix columns were read.'),
    69: open('Safe mode and the bootloader are not checked on a 600, and Logitech\'s version list is not in the libraries.'),
    70: open('Staging and reinstall exist for this family but were never sent to a 600, and its newer image is not obtainable.'),
    71: open('The reinstall request was never sent to a 600, and its safe mode is not checked.'),
    72: open('Logitech\'s service serves the 600, but the FHSDK\'s account client is on no public entry.'),
  },
  // The Harmony 650.
  'harmony-650': {
    3: open('Nothing reads a compiled 650 configuration back into a recipe, and the record of ours carried inside is not built.'),
    4: open('The 650 test setup builds to its fingerprint, but no test note records a recipe build running, and the build the remote ran differs.'),
    6: open('Writes go only to units on the bench\'s fixed list; a stranger\'s 650 cannot be recorded and made a write target.'),
    8: open('The settings store has never been read on a 650, and nothing offers keeping or discarding changes made on the remote.'),
    9: open('The catalogue lists manufacturers and their models, but there is no search by type and no help with typing errors.'),
    10: open('Catalogue devices compose and ran on the 650, but nothing lets the user choose between a device\'s code sets.'),
    11: open('Teaching commands from an original remote needs learning, and nothing in the FHSDK learns through a 650.'),
    12: open('A recipe names each device, but no test renames one and no rename has been shown on the 650.'),
    13: open('Nothing removes a device and reports or settles the activities and favourites that used it.'),
    14: open('The held power code ran on the 650; keep on, always on and no power have no test note, and no power is not offered.'),
    15: open('Direct and stepped inputs compose, inputs chosen through a menu are refused, and no test note shows an input on the 650.'),
    16: open('A power on delay edit ran on the 650, but nothing sets one device\'s delay between devices or restores defaults.'),
    17: open('A device\'s repeat count is taken from the catalogue, and nothing lets an application set it.'),
    18: open('Channel tuning is composed for the Harmony 300, 350 and Touch, not for the 650\'s family.'),
    19: open('Commands can be chosen when composing a device, but nothing fixes a command\'s code or puts the original back.'),
    21: open('Composed activities started and All Off ran on the 650, but its test notes record no switching between activities.'),
    22: open('The key map built from roles ran on the 650, but the learned command half needs learning, which does not exist.'),
    23: open('An activity\'s device inputs compose, but no test note shows one being set on the 650.'),
    24: open('A pass through device composes as Logitech\'s does, but the test notes do not record it on the 650.'),
    25: open('An activity\'s name comes from the recipe, but no test renames one and no rename is shown on the 650.'),
    26: open('Nothing removes an activity; a rebuild without it is not tested as a removal and not shown on the 650.'),
    27: impossible(['reference/remotes/harmony-650/display.md#what-the-screen-does-not-show'], 'The 650 draws no device or activity icons.'),
    28: open('The menu follows the recipe\'s order, an activity\'s device list order is not offered, and neither has a test note.'),
    29: open('Activity keys can be set and emptied, but a recipe chooses only by type and no test note shows it.'),
    30: open('Nothing adds commands, pauses or a sequence to an activity\'s start or end.'),
    31: open('A recipe states no keypad binding for an activity; an edit can only repoint a key the activity already binds.'),
    32: open('Nothing changes what a key sends in a device\'s own map.'),
    33: open('Device mode maps compose and composed pages sent on the 650, but no test note shows every key and page.'),
    34: open('An activity\'s screen items come from the recipe, but no test note shows a composed activity screen on the 650.'),
    36: open('No screen button that opens a page of the user\'s own commands is built.'),
    38: impossible(['reference/remotes/harmony-650/keys.md#what-pressing-a-key-raises'], 'The firmware raises press, repeat and release only, so no key has a held action.'),
    39: impossible(['reference/remotes/harmony-650/keys.md#what-pressing-a-key-raises'], 'The 650 has no device keys and no long press.'),
    40: impossible(['reference/remotes/harmony-650/display.md#the-panel'], 'The 650\'s screen has no touch, so there are no gestures.'),
    41: open('Every screen renders, but no test note compares a render with what the 650 drew.'),
    42: open('Our letters ran on the 650, but colours, icons and backgrounds have no test note, and nothing is chosen per screen.'),
    43: open('The face is drawn, but 13 keys have no scan code and the rest are the 600\'s, never measured on a 650.'),
    44: open('Help, advanced help and delay fixing are not built; a composed 650 configuration carries no Help.'),
    45: open('Every composer refuses favourite channels; only Logitech\'s service compiles them for a 650.'),
    46: open('The manual shows a favourite beside its number or icon, and nothing of ours builds a favourite or its icon.'),
    47: open('Settings are only build choices, never read back or reset; the 650 has no touch sound.'),
    48: open('The lit time is a build choice with no test note of ours, and no brightness setting is known.'),
    49: open('The tilt sensor is a build choice, but no test note shows our setting acting on the 650.'),
    50: open('The Remote Assistant is a build choice with no test note on the 650; a switch for the start message is not known.'),
    51: unknown('No page says whether a 650 can have Smart or Full help; MyHarmony offers it only three settings.'),
    52: open('A write sets the clock, as seen in memory; the 650 cannot show it, and nothing reads it back as a time.'),
    53: unknown('No page says whether a 650 can show a slideshow; only the Harmony One\'s is described.'),
    54: open('The manual says the 650 learns up to 200 kHz, and nothing in the FHSDK drives its receiver.'),
    55: open('How a compiled remote stores a learned code is not read, so nothing puts one into a 650 device.'),
    56: open('A learned code is recognised by the Harmony Touch\'s reader; nothing keeps one in a 650 configuration.'),
    57: open('Code numbers are ranked against the catalogue\'s codesets, but no test identifies a device from a few taught commands.'),
    60: open('Nothing moves a setup to another remote, or copies devices and activities from one setup into another.'),
    61: open('The empty 650 builds to its fingerprint, but no test note records it running, and the build written differs.'),
    62: open('Listing finds product 0xC122 but names it a Harmony 600 or 700; telling a 650 apart needs its skin.'),
    65: open('The battery voltage is read on the 650, but there is no level, no threshold and no warning or refusal.'),
    66: open('A read reports progress, but nothing makes the 650 show that it is being written.'),
    67: open('The key watch uses the Harmony 600\'s memory address for every remote of its product id, and the 650\'s is not read.'),
    69: open('The version is read, but safe mode was never entered on a 650 and nothing knows whether a newer version exists.'),
    70: open('The staging write and reinstall were never sent to a 650, and Logitech\'s update service does not serve it.'),
    71: open('No recovery has been tried on a 650, and it has no staged application to reinstall.'),
    72: open('Logitech\'s service still serves the 650, but our client is tied to the test accounts and is on no public entry.'),
  },
  // The Harmony 700.
  'harmony-700': {
    1: open('readConfig is tested on the family\'s samples, but the 700 unit was only ever read as raw regions, never through it.'),
    2: open('The reader handles the 700\'s compiles, but deviceModeMaps still picks a help screen for their A/V switch, pinned as a fault.'),
    3: open('Nothing turns a compiled configuration back into a recipe, and no record of ours is carried inside one.'),
    6: open('Writes are permitted only to the bench units the library lists; a remote never seen cannot be taken on.'),
    8: open('The settings store reader exists, but the store read was never sent to a 700 and nothing detects changes.'),
    9: open('The catalogue lists manufacturers, models and types, but nothing helps with a misspelt search.'),
    10: open('Catalogue devices with commands, power and inputs ran on the 700; choosing among a device\'s code set versions is not offered.'),
    11: open('Learning is not offered on this model, so a device taught from its original remote cannot be built.'),
    12: open('Device names come from the recipe, but no record says the 700\'s device list labels were checked on the unit.'),
    13: open('A device goes only by rebuilding without it; nothing says or settles what happens to activities and favourites that used it.'),
    14: open('One key, two keys, kept on and a held power code ran on the 700; no power and always on were not shown.'),
    15: open('Direct and stepped inputs ran on the 700, but inputs chosen through a menu are refused by the composer.'),
    16: open('One power on delay was raised and put back, both heard; other delays and a return to defaults are not offered.'),
    17: open('Repeats are composed from the catalogue; nothing lets an application set them.'),
    18: open('Channel tuning is taken from the catalogue record; nothing lets an application set it.'),
    19: open('Nothing adds, fixes, removes or restores a single command of a device.'),
    22: open('Keys from roles ran on the 700, volume to the receiver and channels to the box; learned commands cannot exist to land.'),
    23: open('Inputs set per activity ran on the 700; no device with inputs was left alone in any activity run.'),
    24: open('The one activity with a pass through device was built but never started on the 700.'),
    25: open('Activity names come from the recipe; renaming is a rebuild, and no rename was run on the 700.'),
    26: open('A setup lacking one activity ran on the 700, but removal is only a rebuild from a smaller recipe, untested as such.'),
    27: unknown('No page says whether a 700\'s activity menu can show an icon per activity.'),
    28: open('The menu follows the recipe\'s order on the 700; an activity\'s device list order is fixed by the build, not chosen.'),
    30: open('Starts and ends are composed from the devices; adding commands, pauses or a sequence to them is not offered.'),
    31: open('A recipe cannot override what a key does in an activity on this family.'),
    32: open('A recipe cannot change a key or a screen button in device mode on this family.'),
    34: open('Labelled, ordered activity screen items ran on the 700, but never more than one page of them.'),
    35: open('Device mode pages follow the catalogue; a recipe cannot choose their commands.'),
    36: open('Nothing builds a screen button that opens a page of the user\'s own commands.'),
    38: impossible(['reference/remotes/harmony-700/README.md#key-numbers'], 'The 700 has no long press, by Logitech\'s service.'),
    39: impossible(['reference/remotes/harmony-700/behaviour.md#device-mode-in-and-out'], 'The 700 has no device keys; device mode is a list opened by the centre key below the screen.'),
    40: impossible(['reference/remotes/harmony-700/display.md#the-panel'], 'The 700\'s screen has no touch panel, so there are no gestures.'),
    41: open('The renderer draws the 700\'s pages, but no run compares a preview with what the remote drew.'),
    42: open('Our letters, icons and chosen state colours ran on the 700; designed backgrounds and Logitech\'s letters are refused on it.'),
    43: open('The face is drawn, but 13 keys carry no scan code and the rest are the 600\'s, unmeasured on a 700.'),
    44: open('Nothing builds help; activities composed on the 700 bind no Help key.'),
    45: open('Favourites reach a 700 only through Logitech\'s service; every composer here refuses a recipe that states any.'),
    46: unknown('No page says a 700 draws a favourite\'s icon; the service lists an image scaling capability only.', ['reference/remotes/harmony-700/features.md#what-logitechs-service-states']),
    47: open('Settings are written as build choices; nothing reads them back, and the tutorial and defaults are not offered.'),
    48: open('The screen went dark at the 20 second default; no other timeout ran, and a brightness setting is not known.'),
    49: open('The tilt sensor choice exists, but no 700 build with it off was made or run.'),
    50: open('The 700 is built with the Assistant off, unobserved on the unit; on, and the starting message, are not built.'),
    51: unknown('No page says whether a 700 offers a choice between Smart and Full help.'),
    52: open('The 700 shows no clock; its clock was read once over USB, but nothing sets it or reads it as a time.'),
    53: unknown('No page says whether a 700 can show a slideshow; only the Harmony One\'s page describes one.'),
    54: open('The manual gives the 700 learning, but nothing here sends the learning commands.'),
    55: open('How a learned code is stored in this family\'s configuration is not known, so none can be used.'),
    56: open('A learned code is recognised by the Harmony Touch\'s reader; nothing keeps one in a 700 configuration.'),
    57: open('Code numbers are ranked against the catalogue\'s codesets, but no test identifies a device from a few taught commands.'),
    60: open('The 650\'s test setup was rebuilt for the 700 and ran; copying parts between setups and fitting to limits are not offered.'),
    62: open('The 600, 650 and 700 share one product id, and the 700\'s descriptor word naming its skin was never checked on the unit.'),
    64: open('Firmware, flash, architecture and skin were read off the unit; the hardware version a 700 reports is not recorded.'),
    65: open('The battery voltage read exists in the 700\'s firmware but was never asked of the unit, and no threshold exists.'),
    66: open('Read progress is reported, but nothing makes the remote show that it is being written.'),
    67: open('The key watch takes the 600\'s address for this product id; the 700\'s own address is not chosen.'),
    69: open('Safe mode was recognised on this unit, but nothing tells whether a newer firmware exists.'),
    72: open('Logitech\'s service still answers for the 700, but its client is bound to test accounts and on no public entry.'),
  },
  // The Harmony 525.
  'harmony-525': {
    3: open('Nothing turns a compiled configuration back into a recipe, and nothing builds for the 525 that could carry a record of ours.'),
    4: open('No codec family serves the 525, so nothing builds a configuration for it from a recipe.'),
    5: open('Only one block of the unit\'s own bytes was written back; the whole configuration writer refuses a 525.'),
    6: open('Writes are limited to the bench unit\'s record, and nothing takes in an unseen 525 as a write target.'),
    7: open('A wrong remote\'s configuration and an overflowing sequence are refused, but nothing refuses too many devices, and the 525\'s limit is unknown.'),
    8: open('Nothing compares a 525\'s configuration with the one last written, and no configuration of ours has been written to it.'),
    9: open('The catalogue can be browsed by manufacturer and model, but no search helps with typing errors.'),
    10: open('Nothing composes a catalogue device for the 525.'),
    11: open('Nothing composes a learned device for the 525, and learning on it has not been done.'),
    12: open('No edit or build renames a device in a 525 configuration.'),
    13: open('Nothing removes a device from a 525 configuration or settles its activities.'),
    14: open('No part of device power is composed for the 525, since no family serves it.'),
    15: open('Nothing composes a device\'s inputs for the 525.'),
    16: open('Power on delays are read in 525 configurations, but nothing sets or resets them for this model.'),
    17: open('Nothing composes a repeat count for a 525 device.'),
    18: open('Nothing composes channel tuning for a 525 device.'),
    19: open('Nothing adds, fixes or restores a device command in a 525 configuration.'),
    21: open('Nothing composes an activity for the 525.'),
    22: open('No activity key map from device roles is built for the 525.'),
    23: open('No activity input setting is built for the 525.'),
    24: open('The 525 manual offers a passthrough device, and nothing builds activities for it.'),
    25: open('Nothing renames an activity in a 525 configuration.'),
    26: open('Nothing removes an activity from a 525 configuration.'),
    27: unknown('No page says whether a 525 activity can carry an icon on its monochrome screen.'),
    28: open('The 525 manual lets activities be reordered, and nothing builds the 525\'s activity menu.'),
    29: impossible(['reference/remotes/harmony-525/keys.md#every-key-on-the-drawing'], 'None of the 525\'s fifty keys is an activity key; activities start from a list opened by the Activities key.'),
    30: open('Nothing builds an activity\'s start or end steps for the 525.'),
    31: open('Nothing changes an activity key binding in a 525 configuration.'),
    32: open('Device mode maps are read on the 525, but nothing changes one.'),
    33: open('No device mode map is composed from the catalogue for the 525.'),
    34: open('Nothing composes an activity\'s screen pages for the 525.'),
    35: open('Nothing composes a device\'s screen pages for the 525.'),
    36: open('The 525 pages by soft key bindings, and nothing builds such pages for it.'),
    37: open('The queue limit is read in the 525\'s firmware, but nothing composes a sequence for it.'),
    38: unknown('Logitech\'s service gives the 525 no long press, which was not the firmware\'s limit on the 300, and holding a key is not checked.', ['reference/remotes/harmony-525/keys.md#holding-a-key']),
    39: impossible(['reference/remotes/harmony-525/keys.md#every-key-on-the-drawing'], 'The 525 has no device keys; its Devices key opens a list.'),
    40: impossible(['reference/remotes/harmony-525/display.md#the-panel'], 'The 525\'s screen is not a touch screen.'),
    41: open('Every page of a 525 configuration renders, but no rendering was compared with the unit, and nothing is built to write.'),
    42: open('Nothing builds 525 screens, so no typeface, picture or theme can be chosen.'),
    43: open('The face is drawn with fifty keys, but no key\'s scan code is known.'),
    44: open('The 525 has on remote help by its manual, and nothing builds it.'),
    45: unknown('Whether the 525 has favourite channels at all is not checked; its manual describes none.', ['reference/remotes/harmony-525/features.md#favourite-channels']),
    46: unknown('Favourites themselves are not known on the 525, so a favourite with an icon is not known either.', ['reference/remotes/harmony-525/features.md#favourite-channels']),
    47: open('The manual offers settings such as backlight timing and help, and nothing reads or changes a 525\'s settings.'),
    48: open('The manual sets backlight timing and nothing composes it for the 525; brightness is not stated.'),
    49: unknown('Motion wakes it from Deep Sleep, and whether that can be switched off is not stated.', ['reference/remotes/harmony-525/hardware.md#light-motion-and-infrared']),
    50: open('The manual offers the Remote Assistant switch on the 525, and nothing composes it.'),
    51: open('The manual offers Smart or Full help on the 525, and nothing composes it.'),
    52: unknown('Whether the screen shows a clock is not checked, and no read of the running clock is known.', ['reference/remotes/harmony-525/behaviour.md#the-clock']),
    53: unknown('No page says whether the 96 by 64 monochrome 525 could show a slideshow.'),
    54: open('The firmware implements the capture, but nothing sends it, and learning on a 525 is not checked.'),
    55: open('Nothing puts a learned code into a 525 device.'),
    56: open('A learned code is recognised by the Harmony Touch\'s reader; nothing keeps one in a 525 configuration.'),
    57: open('Code numbers are ranked against the catalogue\'s codesets, but no test identifies a device from a few taught commands.'),
    59: open('One block was put back through a script; nothing restores a whole backup to a 525.'),
    60: open('Nothing reads a 525 setup into a recipe or builds one for it.'),
    61: open('Nothing builds an empty configuration for the 525.'),
    65: unknown('No battery reading over USB is known on the 525, and whether one exists is not settled.', ['reference/remotes/harmony-525/hardware.md#power']),
    66: open('Read progress is tested only on another model\'s sample, and nothing shows a write on the 525\'s screen.'),
    67: unknown('The scan code\'s address is read in the firmware, but no live memory read of a running 525 is known.', ['reference/remotes/harmony-525/keys.md#fifty-keys-and-every-one-is-bound']),
    69: open('Safe mode is told apart by the version block measured on the unit, but nothing says whether newer firmware exists.'),
    70: impossible(['reference/remotes/harmony-525/firmware.md#harmony-525-firmware'], 'Logitech publishes no firmware package for the 525, and decision 18 allows the install on the 600, 650 and 700 only.'),
    71: open('The unit left safe mode once, by hand, from a lab script; no library function does it.'),
    72: impossible(['reference/remotes/harmony-525/features.md#logitechs-service-has-the-product-switched-off'], 'Logitech\'s service has the 525 switched off and compiles nothing for it.'),
  },
  // The Harmony 515, on the Harmony 525's platform with an application of its own, 3.4. Its bench unit has only been
  // read, decision 35, so everything that touches a write is open, and what the 525 shows is not assumed.
  'harmony-515': {
    2: open('Devices, activities and screens are read in 515 configurations through the 525\'s readers, but no view predicts what each key sends.'),
    3: open('Nothing turns a compiled configuration back into a recipe, and nothing builds for the 515.'),
    4: open('No codec family serves the 515, so nothing builds a configuration for it from a recipe.'),
    5: open('No write path names the 515; its write end has not been read in its application 3.4.'),
    6: open('The bench unit\'s identity and configuration region are recorded, but no write path takes a 515 or adopts one never seen.'),
    7: open('Nothing checks a configuration against the 515\'s own limits before a write, and its device limit is the forum table\'s.'),
    8: open('Nothing compares a 515\'s configuration with the one last written.'),
    9: open('The catalogue can be browsed by manufacturer and model, but no search helps with typing errors.'),
    10: open('Nothing composes a catalogue device for the 515.'),
    11: open('Nothing composes a learned device for the 515, and learning on it has not been done.'),
    12: open('No edit or build renames a device in a 515 configuration.'),
    13: open('Nothing removes a device from a 515 configuration or settles its activities.'),
    14: open('No part of device power is composed for the 515, since no family serves it.'),
    15: open('Nothing composes a device\'s inputs for the 515.'),
    16: open('Nothing sets or resets a device\'s delays for the 515.'),
    17: open('Nothing composes a repeat count for a 515 device.'),
    18: open('Nothing composes channel tuning for a 515 device.'),
    19: open('Nothing adds, fixes or restores a device command in a 515 configuration.'),
    21: open('Nothing composes an activity for the 515.'),
    22: open('No activity key map from device roles is built for the 515.'),
    23: open('No activity input setting is built for the 515.'),
    24: open('Nothing builds activities for the 515, so no pass through device either.'),
    25: open('Nothing renames an activity in a 515 configuration.'),
    26: open('Nothing removes an activity from a 515 configuration.'),
    27: unknown('No page says whether a 515 activity can carry an icon on its monochrome screen.'),
    28: open('Nothing builds the 515\'s activity menu.'),
    29: impossible(['reference/remotes/harmony-515/keys.md#every-key-on-the-drawing'], 'The 515 has the 525\'s face, and none of its keys is an activity key.'),
    30: open('Nothing builds an activity\'s start or end steps for the 515.'),
    31: open('Nothing changes an activity key binding in a 515 configuration.'),
    32: open('Nothing changes a device mode map in a 515 configuration.'),
    33: open('No device mode map is composed from the catalogue for the 515.'),
    34: open('Nothing composes an activity\'s screen pages for the 515.'),
    35: open('Nothing composes a device\'s screen pages for the 515.'),
    36: open('Nothing builds soft key pages for the 515.'),
    37: open('Nothing composes a sequence for the 515.'),
    38: unknown('What a held key does on a 515 is not checked.', ['reference/remotes/harmony-515/keys.md#not-checked']),
    39: impossible(['reference/remotes/harmony-515/keys.md#every-key-on-the-drawing'], 'The 515 has the 525\'s face, with no device keys; its Devices key opens a list.'),
    40: unknown('The model table says the 515\'s screen is not a touch screen, which no 515 has been checked against.', ['reference/remotes/harmony-515/display.md#the-panel']),
    41: open('No 515 screen was rendered and compared with the unit, and nothing is built to write.'),
    42: open('Nothing builds 515 screens, so no typeface, picture or theme can be chosen.'),
    43: open('The face is drawn, the 525\'s, but no key\'s scan code has been measured on a 515.'),
    44: open('Nothing builds the remote\'s help for the 515.'),
    45: unknown('Whether the 515 has favourite channels at all is not checked.'),
    46: unknown('Favourites themselves are not known on the 515, so a favourite with an icon is not known either.'),
    47: open('Nothing reads or changes a 515\'s settings.'),
    48: open('Nothing composes the 515\'s backlight timing; brightness is not known.'),
    49: unknown('Whether the 515 wakes on motion, and whether that can be switched off, is not checked.'),
    50: open('Nothing composes the 515\'s Remote Assistant switch.'),
    51: open('Nothing composes Smart or Full help for the 515.'),
    52: unknown('Whether the 515 shows a clock is not checked, and no read of its running clock is known.'),
    53: unknown('No page says whether the 96 by 64 monochrome 515 could show a slideshow.'),
    54: open('Nothing sends the 515 the learning request, and learning on a 515 is not checked.'),
    55: open('Nothing puts a learned code into a 515 device.'),
    56: open('Nothing keeps a learned code in a 515 configuration.'),
    57: open('No test identifies a device from a few taught commands.'),
    59: open('The configuration region is in the lab, but no write path puts a backup back on a 515.'),
    60: open('Nothing reads a 515 setup into a recipe or builds one for it.'),
    61: open('Nothing builds an empty configuration for the 515.'),
    63: open('The unit\'s identity is recorded in the lab, but no write rail checks a 515 against its record yet.'),
    65: unknown('No battery reading over USB is known on this platform, and whether one exists is not settled.', ['reference/remotes/harmony-525/hardware.md#power']),
    66: open('Read progress is shown, but nothing makes a 515 show it is being written.'),
    67: unknown('No live memory read of a running 515 is known.'),
    69: open('Nothing tells a 515 in safe mode from a running one by its own measurement, and safe mode must not be entered to find out.'),
    70: impossible(['docs/decisions.md#d18'], 'Decision 18 allows the firmware install on the Harmony 600, 650 and 700 alone, so the FHSDK never installs firmware here.'),
    71: open('Nothing in the libraries brings a stuck 515 back.'),
    72: unknown('Whether Logitech\'s service still serves the 515\'s skin is not checked.'),
  },
  // The Harmony 885.
  'harmony-885': {
    2: open('Devices, activities, screens and codes are read on the 885, but no view predicts what each key sends there.'),
    3: open('Nothing turns a compiled 885 configuration back into a recipe.'),
    4: open('No build from a recipe serves the 885; a device can only be composed onto an existing configuration.'),
    6: open('The writer\'s unit list holds only the two bench 885s; nothing records and adopts a remote never seen.'),
    7: open('The model check and the queue rail cover the 885; nothing checks a whole configuration\'s 64 state bytes or log area before writing.'),
    8: unknown('The 885 has no settings store, and whether anything a person changes on it reaches its configuration is not known.', ['reference/remotes/harmony-885/memory.md#harmony-885-memory']),
    9: open('The catalogue browses by manufacturer and model; there is no search by type and no help for typing errors.'),
    10: open('One catalogue device of eight commands was composed and shown; its inputs and a full device are refused.'),
    11: open('Nothing learns a code on the 885 or builds a device from taught commands.'),
    12: open('Nothing renames a device in an 885 configuration.'),
    13: open('Nothing removes a device from an 885 configuration, or settles what used it.'),
    14: open('The catalogue\'s power, long press version included, is composed and heard; none, always on, kept on and extra commands are not.'),
    15: open('A composed device\'s inputs are refused on the 885.'),
    16: open('The catalogue\'s delays are composed, but nothing sets or resets them, and the silence was not observed on a unit.'),
    17: open('A composed device\'s sends go at a fixed quantity of 1; nothing lets it be set.'),
    18: open('Nothing composes channel entry for an 885 device.'),
    19: open('Nothing adds, fixes, removes or restores a single command in an 885 configuration.'),
    21: open('Activities are not composed for the 885; the family refuses an activity\'s start, menu row and screen.'),
    22: open('An activity\'s key map from roles is refused for the 885.'),
    23: open('Activities and device inputs are not composed for the 885.'),
    24: open('Activities are not composed for the 885, so no pass through device either.'),
    25: open('Nothing renames an activity in an 885 configuration.'),
    26: open('Nothing removes an activity from an 885 configuration.'),
    27: open('Activities are not composed for the 885, so none gets an icon.'),
    28: open('The activity menu and an activity\'s device list are not composed for the 885.'),
    29: impossible(['reference/remotes/harmony-885/keys.md#harmony-885-skin-17'], 'The 885\'s 55 keys have one Activities key and no activity keys; activities start from its menu.'),
    30: open('An activity\'s start is not composed for the 885, so no steps can be added.'),
    31: open('An activity\'s key map is not composed for the 885.'),
    32: open('Which command each key takes in an 885 device mode is not read, and nothing changes one.'),
    33: open('A full device mode map from the catalogue is refused for the 885; only one labelled screen page is composed.'),
    34: open('Activity screens are not composed for the 885.'),
    35: open('One device page of up to eight commands is composed and was seen; a second page is refused.'),
    36: open('Nothing builds a sub page button for the 885.'),
    37: open('Sequences are not composed for the 885.'),
    38: unknown('The firmware raises a hold event once, but whether it honours a binding of it is not checked.', ['reference/remotes/harmony-885/keys.md#a-press-a-hold-and-a-release']),
    39: impossible(['reference/remotes/harmony-885/keys.md#harmony-885-skin-17'], 'The 885 has one Device key and a device list, and no device keys.'),
    40: impossible(['reference/remotes/harmony-885/display.md#the-panel'], 'The 885\'s screen is not a touch screen, so there are no gestures.'),
    41: open('885 pages render, but no rendered screen was compared with what a unit draws.'),
    42: open('The 885\'s fonts and pictures are borrowed from its configuration; nothing of ours chooses its look.'),
    44: open('The 885 has on remote help by its manual; none is composed for it.'),
    45: open('Unit B\'s own configuration holds favourites, but nothing composes a favourite for the 885.'),
    46: open('Nothing composes a favourite, or its icon, for the 885.'),
    47: open('The 885\'s settings are neither read nor changed by anything yet.'),
    48: open('The 885\'s manual offers a backlight timing; nothing sets it, and brightness is not known.'),
    49: open('The 885\'s manual offers a tilt sensor switch; nothing sets it.'),
    50: open('The 885\'s manual offers both; nothing composes or switches either.'),
    51: open('The 885\'s manual offers Smart and Full help; nothing composes help for it.'),
    52: open('The stamp sets the clock at the restart and a memory read reads it back; how the clock is shown is not set.'),
    53: open('The 885\'s manual offers a slideshow; nothing builds one.'),
    54: open('The 885 has a learning sensor; nothing sends it the learning request.'),
    55: open('Nothing puts a learned code into an 885 device.'),
    56: open('A learned code is recognised by the Harmony Touch\'s reader; nothing keeps one in an 885 configuration.'),
    57: open('Code numbers are ranked against the catalogue\'s codesets, but no test identifies a device from a few taught commands.'),
    60: open('Nothing moves a setup to another model or copies devices and activities between setups, adapted to limits.'),
    61: open('No empty configuration is built for the 885.'),
    65: unknown('One read takes a hardware measurement, but what it measures is not identified, so a battery level is not known.', ['reference/architectures/harmony-880-885/usb.md#reading-flash']),
    66: open('Read progress exists, but the 885 showed nothing during a write, and nothing makes it show one.'),
    69: open('Nothing tells an 885 in its bootloader from a running one, and no list of firmware versions is held.'),
    70: impossible(['docs/decisions.md#d18'], 'Decision 18 allows the firmware install on the Harmony 600, 650 and 700 alone, so the FHSDK never installs firmware here.'),
    71: open('Nothing in the libraries brings a stuck 885 back; its recovery has only been read in the firmware.'),
    72: impossible(['reference/remotes/harmony-885/features.md#logitechs-service'], 'Logitech\'s service has the 885\'s skins switched off and refuses its serial, so it serves no 885 account.'),
  },
  // The Harmony 785, on the Harmony 880 and 885's platform with the Harmony 720's application. Both bench units have
  // only been read, decision 34, so everything that touches a write is open, and what the 885 shows is not assumed.
  'harmony-785': {
    2: open('Devices, activities, screens and codes read on the 785 through the 885\'s family, but no view predicts what each key sends there.'),
    3: open('Nothing turns a compiled 785 configuration back into a recipe.'),
    4: open('No build from a recipe serves the 785.'),
    5: open('No write path names a 785; its write end has not been read in its application 4.5.'),
    6: open('Both bench 785s are recorded with a full backup, but no write path takes a 785 or adopts one never seen.'),
    7: open('Nothing checks a configuration against the 785\'s own limits before a write.'),
    8: unknown('Whether anything a person changes on a 785 reaches its configuration is not known.'),
    9: open('The catalogue browses by manufacturer and model; there is no search by type and no help for typing errors.'),
    10: open('Nothing composes a catalogue device for the 785.'),
    11: open('Nothing learns a code on the 785 or builds a device from taught commands.'),
    12: open('Nothing renames a device in a 785 configuration.'),
    13: open('Nothing removes a device from a 785 configuration, or settles what used it.'),
    14: open('Nothing composes a device\'s power for the 785.'),
    15: open('Nothing composes a device\'s inputs for the 785.'),
    16: open('Nothing sets or resets a device\'s delays for the 785.'),
    17: open('Nothing sets a repeat count for the 785.'),
    18: open('Nothing composes channel entry for a 785 device.'),
    19: open('Nothing adds, fixes, removes or restores a single command in a 785 configuration.'),
    21: open('Activities are not composed for the 785.'),
    22: open('An activity\'s key map is not composed for the 785.'),
    23: open('Activities and device inputs are not composed for the 785.'),
    24: open('Activities are not composed for the 785, so no pass through device either.'),
    25: open('Nothing renames an activity in a 785 configuration.'),
    26: open('Nothing removes an activity from a 785 configuration.'),
    27: open('Activities are not composed for the 785, so none gets an icon.'),
    28: open('The activity menu and an activity\'s device list are not composed for the 785.'),
    29: unknown('Whether the 785 has keys that start an activity is not read; its face is not drawn.', ['reference/remotes/harmony-785/keys.md#harmony-785-keys']),
    30: open('An activity\'s start is not composed for the 785, so no steps can be added.'),
    31: open('An activity\'s key map is not composed for the 785.'),
    32: open('Which command each key takes in a 785 device mode is not read, and nothing changes one.'),
    33: open('Device mode maps are not composed for the 785.'),
    34: open('Activity screens are not composed for the 785.'),
    35: open('Device screen pages are not composed for the 785.'),
    36: open('Nothing builds a sub page button for the 785.'),
    37: open('Sequences are not composed for the 785.'),
    38: unknown('Whether the 785\'s application honours a binding of a held key is not read.', ['reference/remotes/harmony-785/keys.md#harmony-785-keys']),
    39: unknown('Whether the 785 has device keys is not read; its face is not drawn.', ['reference/remotes/harmony-785/keys.md#harmony-785-keys']),
    40: unknown('The model table says the 785\'s screen is not a touch screen, which no 785 has been checked against.', ['reference/remotes/harmony-785/display.md#the-panel']),
    41: open('No 785 screen was rendered and compared with what a unit draws.'),
    42: open('Nothing of ours chooses the look of a 785\'s screens.'),
    43: open('The 785\'s face is not drawn, and none of its keys has a measured scan code.'),
    44: open('Nothing composes the remote\'s help for the 785.'),
    45: open('The bench units\' configurations hold favourites, but nothing composes a favourite for the 785.'),
    46: open('Nothing composes a favourite, or its icon, for the 785.'),
    47: open('The 785\'s settings are neither read nor changed by anything yet.'),
    48: open('Nothing sets the 785\'s backlight timing or brightness.'),
    49: open('Nothing sets the 785\'s tilt sensing.'),
    50: open('Nothing composes or switches the 785\'s assistants.'),
    51: open('Nothing composes help for the 785, so neither Smart nor Full can be chosen.'),
    52: open('The 785\'s clock has not been read, and nothing sets how it is shown.'),
    53: open('Nothing builds a slideshow for the 785.'),
    54: open('Nothing sends the 785 the learning request.'),
    55: open('Nothing puts a learned code into a 785 device.'),
    56: open('Nothing keeps a learned code in a 785 configuration.'),
    57: open('No test identifies a device from a few taught commands.'),
    59: open('Both units\' whole flash is in the lab, but no write path puts a backup back on a 785.'),
    60: open('Nothing moves a setup to another model or copies devices and activities between setups, adapted to limits.'),
    61: open('No empty configuration is built for the 785.'),
    63: open('The two units\' identity blocks are recorded and differ, but no write rail checks a 785 against its record yet.'),
    64: open('The version block was read on both units, but no test holds what a 785 reports.'),
    65: unknown('One read takes a hardware measurement on the 885, but what it measures is not identified, and it was not read on a 785.', ['reference/architectures/harmony-880-885/usb.md#reading-flash']),
    66: open('Read progress is shown, but nothing makes a 785 show it is being written.'),
    67: open('The key page reads the held key on the 885; it has not been tried on a 785.'),
    69: open('Nothing tells a 785 in its bootloader from a running one, and the two units carry different bootloader builds.'),
    70: impossible(['docs/decisions.md#d18'], 'Decision 18 allows the firmware install on the Harmony 600, 650 and 700 alone, so the FHSDK never installs firmware here.'),
    71: open('Nothing in the libraries brings a stuck 785 back.'),
    72: unknown('Whether Logitech\'s service still serves the 785\'s skin is not checked.'),
  },
  // The Harmony 300.
  'harmony-300': {
    1: open('The file was read off the unit twice, identical, but no library read restores the end marker and checks the trailer.'),
    2: open('Devices and power on delays are read from 300 files, but no library reader says what each key sends.'),
    3: open('Nothing reads a configuration of this family back into a recipe.'),
    4: open('The 350\'s build ran on the 300 and every expected code was heard, but a recipe naming the 300 is refused once it holds a television or a long press, so the 300\'s own recipe does not build whole.'),
    6: open('The writer serves only the two bench units on its own list; a remote never seen cannot be recorded and written.'),
    8: unknown('Whether a Harmony 300 ever changes its own configuration is not known; it has no help to fix delays.'),
    9: open('The catalogue lists manufacturers and models, but offers no help for typing errors.'),
    10: open('Catalogue devices with power and inputs were built and heard on the unit, but no code set version can be chosen.'),
    11: unknown('Whether the 300 can learn is not known, and nothing composes a learned device for this family.'),
    12: open('Device names go into the file from the recipe, but no renamed device was written to a 300 and read back.'),
    13: open('Removing a device is tested on Logitech\'s compiles only, never run on a 300, and favourites using it are not settled.'),
    14: open('Power comes from the catalogue; one or two keys, none, always on, extra commands and a held power code cannot be set.'),
    15: open('Inputs come from the catalogue only; how a device changes input cannot be set, and a stepping input is refused.'),
    16: open('The power on delay was set and heard on the unit, but no other delay is settable and nothing restores defaults.'),
    17: open('Nothing sets how many times a device\'s commands repeat.'),
    18: open('Channel digits and the tuning finish follow the catalogue; how a device tunes a number cannot be chosen.'),
    19: open('Nothing adds, fixes or removes one command of a device, or restores its original code, for this family.'),
    21: open('Watch TV ran on the 300 from a recipe naming the Harmony 350; a recipe naming the 300 that holds a television is refused.'),
    22: open('Only the channel changing role picks the map Watch TV ends in; other roles map no keys and learned commands are not handled.'),
    23: open('The inputs were heard on the 300 from a recipe naming the Harmony 350; a recipe naming the 300 that holds a television is refused.'),
    24: open('A device with no role in an activity is neither tested nor run on a 300.'),
    25: unknown('Whether this family\'s configuration stores an activity\'s name at all is not stated; its metadata names devices.'),
    26: open('A configuration with no activity builds, but none was written to a 300.'),
    27: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'The 300 has no screen, so an activity icon has nowhere to show.'),
    28: impossible(['reference/how-a-harmony-works.md#a-remote-with-no-screen-holds-exactly-one-activity'], 'With no screen and one activity there is no activity menu or device list to order.'),
    29: impossible(['reference/how-a-harmony-works.md#a-remote-with-no-screen-holds-exactly-one-activity'], 'The 300 holds one activity, started by its Watch TV key, so there is nothing to choose.'),
    30: open('The activity composer takes devices and a channel device only; it adds no extra start or end steps.'),
    31: open('Watch TV ends in the channel device\'s map; nothing gives the activity a key map of its own.'),
    32: open('A device mode remap ran on the unit, made by a lab script; no library function changes one key\'s binding.'),
    33: open('Maps follow the 350\'s key table; Logitech binds Teletext to a key on the 300, and no 300 map was checked whole.'),
    34: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'The 300 has no screen.'),
    35: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'The 300 has no screen, so device mode has no screen pages.'),
    36: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'The 300 has no screen to hold a button or a page.'),
    37: open('Nothing composes a named sequence for this family, though its lists can send and wait.'),
    38: open('A held key only selects a second device on the device keys; no other key gets a held command.'),
    39: open('The device keys selected a device short and another long on the 300 from a recipe naming the Harmony 350; a recipe naming the 300 is refused once it holds a long press.'),
    40: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'The 300 has no screen and so no touch gestures.'),
    41: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'The 300 has no screen to draw.'),
    42: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'The 300 has no screen, so there is no look to choose.'),
    43: open('The European drawing ties 49 of 55 keys on the unit; six keys and the whole US printing are not measured.'),
    44: impossible(['reference/remotes/harmony-300/keys.md#european-printing-skin-79'], 'The 300 has no Help key and no screen, so the remote\'s help cannot run.'),
    45: open('The composer refuses the 300\'s favourite order; a 350 build sent one channel from the European Teletext key.'),
    46: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'The 300 has no screen to show a favourite\'s icon.'),
    47: unknown('Logitech lists no settings for the 300, and whether the remote has any is not checked.'),
    48: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'The 300 has no screen to light or dim.'),
    49: unknown('Whether the 300 has a motion sensor is not stated anywhere.'),
    50: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'Both are screen messages, and the 300 has no screen.'),
    51: impossible(['reference/remotes/harmony-300/keys.md#european-printing-skin-79'], 'The 300 has no Help key and no screen, so there is no kind of help to pick.'),
    52: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'Nothing on a 300 can show a clock, and its firmware never moves the hour.'),
    53: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'The 300 has no screen for pictures.'),
    54: unknown('Whether the 300 learns is not checked; its file table names an infrared capture stream that was never opened.'),
    55: open('Nothing puts a learned code into a configuration of this family.'),
    56: open('A learned code is recognised by the Harmony Touch\'s reader; nothing keeps one in a 300 configuration.'),
    57: open('Code numbers are ranked against the catalogue\'s codesets, but no test identifies a device from a few taught commands.'),
    60: open('The 350\'s build ran unchanged on the 300, but nothing adapts a setup to another model or copies devices between setups.'),
    61: open('The empty configuration builds for the 300 and passes the writer\'s check, but was never written to a 300.'),
    63: open('Units are told apart by their identity file and the unit matched its record, but a wrong unit was refused only on a fake.'),
    65: unknown('A battery file is in the family\'s file table but was never read, so whether it holds a level is not known.'),
    66: open('Neither the read nor the write reports progress, and whether the keys light while writing is not checked.'),
    67: unknown('No way to watch key presses live over this family\'s file protocol is known.'),
    69: open('Nothing reports safe mode or the bootloader for this family, nor whether newer firmware exists.'),
    70: impossible(['docs/decisions.md#d18'], 'Decision 18 allows the firmware install on the Harmony 600, 650 and 700 alone, so the FHSDK never installs firmware here.'),
    71: open('A battery pull recovered the unit; nothing recovers a stuck 300, whose safe mode image is a different, unread build.'),
    72: open('Logitech\'s service still compiles for the 300, but the client is bound to test accounts and on no public entry.'),
  },
  // The Harmony 350.
  'harmony-350': {
    2: open('The public readers name devices and read 13 of 14 delays; Watch TV and what each key sends are read only through internals.'),
    3: open('Nothing reads a 350 configuration back into a recipe, and no record of ours is carried inside.'),
    6: open('The writer\'s unit list holds the bench units only; a remote never seen cannot be recorded and written.'),
    8: open('The writer refuses a file it did not write, shown on the unit; keeping or discarding that change is not offered.'),
    9: open('The catalogue can be browsed by manufacturer and model, but nothing helps with typing errors.'),
    10: open('Catalogue devices compose and were heard on the unit; choosing among a device\'s code set versions is not offered.'),
    11: open('Nothing builds a device from commands taught from its original remote on this family.'),
    12: open('A device\'s name lives only in the file\'s metadata the remote never shows; no test or run renames one.'),
    13: open('Removal refuses devices that Watch TV or favourites use, and nothing settles them; no removal ran on the unit alone.'),
    14: open('Toggle and separate on and off codes were heard; no power, always on, extra power steps and a held power code are not offered.'),
    15: open('Direct inputs work; an input that steps or mixes codes and states is refused.'),
    16: open('The power on delay was changed and heard on the unit; other delays and a return to defaults are not offered.'),
    17: open('The repeat count follows the catalogue and cannot be set; nothing about it was checked on a remote.'),
    18: open('Channel tuning comes from the catalogue entry as it is; nothing lets it be set.'),
    19: open('Nothing adds, fixes or removes a single command of a device on this family.'),
    22: open('Roles choose Watch TV\'s final device map and volume source; a learned command landing on its usual key is not offered.'),
    24: open('No test or run includes a device with no role in Watch TV.'),
    25: open('The activity\'s name is stored nowhere the 350 shows; nothing renames it and no run shows one.'),
    26: open('A setup with devices and no Watch TV was never built in a test or run on the unit.'),
    27: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'The 350 has no screen to show an icon on.'),
    28: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'With one activity and no screen there is no activity menu or device list to order.'),
    29: impossible(['reference/how-a-harmony-works.md#a-remote-with-no-screen-holds-exactly-one-activity'], 'The 350 holds one activity, always started by its Watch TV key.'),
    30: open('Watch TV\'s steps are the devices\' power and inputs only; extra commands, pauses or a sequence are not offered.'),
    31: open('Watch TV ends in one device\'s map and the recipe cannot change what a key does there.'),
    32: open('A device\'s map comes from the family\'s table and the recipe cannot override a key.'),
    33: open('Device maps match Logitech\'s and were heard, except Replay and Advance on the set top box.'),
    34: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'The 350 has no screen.'),
    35: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'The 350 has no screen.'),
    36: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'The 350 has no screen.'),
    37: open('Nothing composes a named sequence for this family; the limits it would survive were not measured.'),
    38: open('Only device keys get a long press, choosing a second device; a held command on any other key is not offered.'),
    40: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'The 350 has no screen, so no touch gestures.'),
    41: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'The 350 has no screen to draw.'),
    42: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'The 350 has no screen.'),
    43: open('The face is drawn and 53 of 55 keys carry a scan code; DVR and Live are not tied to one.'),
    44: impossible(['reference/remotes/harmony-350/keys.md#every-key-on-the-drawing'], 'The 350 has no Help key and no screen to ask its questions on.'),
    45: open('Five channels kept as text were heard in order; removing one was never tested, and names cannot show.'),
    46: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'The 350 has no screen to show a favourite\'s icon.'),
    47: unknown('Logitech lists no settings for the 350; whether its firmware holds any a person would change is not known.', ['reference/remotes/harmony-350/features.md#what-logitechs-service-states']),
    48: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'The 350 has no screen to light.'),
    49: unknown('No page says whether the 350 has a motion sensor.', ['reference/remotes/harmony-350/hardware.md#not-checked']),
    50: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'The 350 has no screen to show the message on.'),
    51: impossible(['reference/remotes/harmony-350/keys.md#every-key-on-the-drawing'], 'The 350 has no Help key and no screen, so there is no kind of help to choose.'),
    52: unknown('Its clock never moves the hour or date and nothing shows it; whether it can be set or read back is not known.', ['reference/architectures/harmony-300-350/memory.md#the-state-variables']),
    53: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'The 350 has no screen.'),
    54: unknown('Whether the 350 has a learning receiver is not checked, though its firmware names an infrared capture file.', ['reference/remotes/harmony-350/hardware.md#not-checked']),
    55: open('Nothing puts a learned code into a device of this family.'),
    56: open('A learned code is recognised by the Harmony Touch\'s reader; nothing keeps one in a 350 configuration.'),
    57: open('Code numbers are ranked against the catalogue\'s codesets, but no test identifies a device from a few taught commands.'),
    60: open('Nothing moves another remote\'s setup onto a 350 adapted to its limits.'),
    62: open('Enumeration finds it unopened and reads skin 104, but no model record names skin 104 a Harmony 350.'),
    64: open('The identity text is read and parsed, but no firmware version beyond the product string\'s has been read off the unit.'),
    65: unknown('The battery file was never read, so whether the 350 reports a level is not known.', ['reference/remotes/harmony-350/usb.md#not-checked']),
    66: open('The writer reports each chunk as it goes; what the remote shows while written is not recorded or offered.'),
    67: unknown('No way to read a key press off a connected 350 is known; its log stays erased.'),
    69: open('Safe mode shows in the product string and identity file, but nothing reports the state or a newer version.'),
    70: impossible(['docs/decisions.md#d18'], 'Decision 18 allows the firmware install on the Harmony 600, 650 and 700 alone, so the FHSDK never installs firmware here.'),
    71: open('A failed write was recovered by writing again on the unit; recovering through safe mode is not offered.'),
    72: open('Logitech\'s service serves the 350, but the service client is not on any public entry.'),
  },
  // The Harmony Touch.
  'harmony-touch': {
    1: open('No route reads the Touch\'s stored documents back; the firmware\'s put and request route is read but has never been sent.'),
    5: open('answerTouchSync delivers and the remote commits and runs it, but no library step verifies afterwards; the hash check is a script\'s.'),
    6: open('The answerer syncs only the one bench unit named in its own list; a stranger\'s Touch cannot be recorded and written.'),
    7: open('The gate refuses sets the remote would mishandle and names each, but nothing refuses more than the 15 devices Logitech states.'),
    8: open('The hand over keeps what the remote hands up and stops on a clash, but offers no keep or discard choice.'),
    9: open('The catalogue can be listed by manufacturer and model, but nothing helps with typing errors.'),
    10: open('Devices are built from catalogue entries and heard, but the builder takes the entry\'s one code set and offers no version choice.'),
    11: open('A learned code becomes a definition in tests, but no device of taught commands has been composed and sent on the unit.'),
    12: open('No library step renames a device, and no renamed device has been delivered to the unit.'),
    14: open('Kept on and a held power code compose, but always on, no power, one or two keys and extra power commands are not set or shown.'),
    15: open('A device\'s inputs and how it changes them come only from its catalogue entry; nothing lets them be set.'),
    16: open('Delays a setup states are composed and their pauses heard in band, but putting them back to defaults is not shown.'),
    17: open('A repeat count is composed, but six taps sent four or five frames where three were predicted, unexplained.'),
    18: open('A channel tuning setting composes, but no composed tuning was heard; the favourites heard ran on Logitech\'s carried tuning.'),
    19: open('No library step adds, fixes or removes one command of a device, or restores a fixed one.'),
    22: open('The Touch\'s maps are stated key by key; nothing maps an activity\'s keys from its devices\' jobs.'),
    25: open('A rename was shown on the unit only through an experiment\'s hand edit; no library function renames an activity.'),
    27: open('The composer writes an activity with no picture of its own, so it shows its type\'s default picture.'),
    28: open('Places are composed and renumbered after a removal, but reordering the activity list or an activity\'s devices was never shown.'),
    29: impossible(['reference/remotes/harmony-touch/keys.md#every-key-on-the-drawing'], 'The Touch has no activity keys; its 27 keypad keys and two touch zones include none.'),
    32: open('A device\'s own keys are composed and heard, but a device map can bind only that device\'s commands, never another\'s.'),
    33: open('keysByName binds keys by exact command name only; nothing lays out a device mode map and screen as Logitech\'s software would.'),
    36: unknown('Whether a Touch screen entry can open a page of the user\'s own commands and come back is not known.'),
    39: impossible(['reference/remotes/harmony-touch/keys.md#every-key-on-the-drawing'], 'The Touch has no device keys; its keys and touch zones list none.'),
    40: open('Gestures are composed in a whole setup, but no gesture has been performed on the unit and heard.'),
    41: open('Nothing renders the Touch\'s screens; the remote draws them from the documents.'),
    42: open('Only our background picture is drawn and shown; typeface, inks, icons and theme are not offered.'),
    44: open('The Touch has help on its screen, but nothing builds or checks it for activities of ours.'),
    45: open('Adding and reordering were shown, but no favourite can be removed or named by the composer.'),
    47: open('Two settings were changed on the unit; reading settings off it, the touch sound, the tutorial and defaults are not done.'),
    49: unknown('Whether a Touch carries the accelerometer is not checked, and the bench unit\'s settings offer no tilt entry.'),
    50: unknown('Whether a Touch has a Remote Assistant or a Starting Activity message to switch is not known.'),
    51: unknown('An activity field marks guided or manual help, but whether that is Smart or Full help is not known.'),
    52: open('The remote keeps time from every sync, but the answerer sends no clock write and the 12 or 24 hour form is untried.'),
    53: unknown('Whether a Touch offers a slideshow of the user\'s pictures is not known.'),
    54: open('The Touch learns through its infrared window by the manual, but nothing here sends a learning request to it.'),
    55: open('A learned code composes into a device in tests, but none has been sent from the unit.'),
    57: open('identifyCodeset ranks codes against the catalogue, but no test identifies a device from taught captures end to end.'),
    58: open('The stored documents cannot be read off the remote, so a backup comes only from a recorded Logitech sync.'),
    60: open('Nothing moves a Touch setup to another remote or model, or copies devices between setups adapted to limits.'),
    62: open('A Touch is listed as file based without being claimed, but its model is not named: skin 99 has no record.'),
    63: open('The unit is recorded and matched on the cable, but refusing a wrong unit is shown only in tests.'),
    65: open('The firmware names battery charge readings, but nothing reads them and no write warns on a low battery.'),
    66: open('The answerer logs each request list but gives no progress measure, and what the remote shows meanwhile is not recorded.'),
    67: unknown('Whether a Touch can report key presses live over USB is not known; it is never opened that way.'),
    69: open('The firmware version is read, but its running or recovery state and whether a newer version exists are not.'),
    70: impossible(['docs/decisions.md#d18'], 'Decision 18 allows the firmware install on the Harmony 600, 650 and 700 alone, so the FHSDK never installs firmware here.'),
    72: open('Logitech\'s service serves the Touch, but the service client is on no public entry, so no import is offered.'),
  },
};

/**
 * The written statuses of the requirements about the FHSDK as a whole, R68 and R73 to R75, one each and shared by
 * every model, for those no proof makes met. R73 and R74 are proven, so they are not here.
 */
const WHOLE_STATUSES: Readonly<Record<number, RequirementState>> = {
  75: open('Every package is private and unpublished, and an application links the folder beside it.'),
  68: open('The probe builds a publishable report from a configuration and from a remote on the cable, but no run of it on a remote outside the eleven bench models is recorded.'),
};

/**
 * The written status of a requirement on a model, or undefined where none is written: the model's own, or for a
 * requirement about the FHSDK as a whole, the one every model shares. For the checks over the data, which need to
 * see a written status and a proof side by side; an application asks `requirementState`.
 */
export function writtenStatus(model: BenchModelKey, number: number): RequirementState | undefined {
  const asked = requirement(number);
  if (asked === undefined) return undefined;
  return asked.scope === 'whole' ? WHOLE_STATUSES[number] : MODEL_STATUSES[model][number];
}

/** The proofs among `proofs` that prove requirement `number` for `model`: those naming the model, or every model. */
export function proofsFor(proofs: readonly Proof[], model: BenchModelKey, number: number): Proof[] {
  return proofs.filter((proof) => proof.requirement === number && (proof.models === 'every' || proof.models.includes(model)));
}

/** Each distinct value of a list once, in the order first met. */
const once = (values: readonly string[]): string[] => [...new Set(values)];

/** A count in words for a short sentence: one, two, ... and the digits past ten. */
function counted(n: number, noun: string): string {
  const words = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  return `${words[n] ?? String(n)} ${noun}${n === 1 ? '' : 's'}`;
}

/** The met a set of proofs gives, its tests, bench records and a sentence saying what it rests on. */
function metBy(proofs: readonly Proof[]): RequirementState {
  const tests = once(proofs.map((proof) => proof.test));
  const bench = once(proofs.flatMap((proof) => proof.bench));
  const shown = bench.length === 0 ? '' : `, and shown working on a unit in ${counted(bench.length, 'record')}`;
  const why = `Proven by ${counted(proofs.length, 'test')} in ${counted(tests.length, 'file')}${shown}.`;
  return { status: 'met', tests, bench, proofs, reference: [], why };
}

/**
 * The status of a requirement on a model given a set of proofs: the written one where there is one, otherwise met
 * by the proofs that name it for the model. Throws for a number never given, and for a requirement with neither a
 * written status nor a proof, which `test/requirements.test.ts` rules out for the committed data. The generator asks
 * this with the proofs it has just read off the sources, so a document it writes agrees with the module it writes.
 */
export function requirementStateFrom(proofs: readonly Proof[], model: BenchModelKey, number: number): RequirementState {
  const asked = requirement(number);
  if (asked === undefined) throw new RangeError(`no requirement R${number}`);
  const written = writtenStatus(model, number);
  if (written !== undefined) return written;
  const proving = proofsFor(proofs, model, number);
  if (proving.length === 0) throw new RangeError(`R${number} has no status for the ${model}`);
  return metBy(proving);
}

/**
 * Every state asked for once, kept, so the same question answers with the same object, which an application may
 * compare by identity; the proofs are fixed data, so nothing changes what a key answers.
 */
const ANSWERED = new Map<string, RequirementState>();

/**
 * The status of a requirement on a model: the model's own, or for a requirement about the FHSDK as a whole, the one
 * every model shares; met where the committed proofs, `proofs.ts`, prove it. Throws for a number never given, since
 * asking for one is a mistake in the caller and not a status. Every model has a status for every requirement,
 * `test/requirements.test.ts`.
 */
export function requirementState(model: BenchModelKey, number: number): RequirementState {
  const asked = requirement(number);
  if (asked === undefined) throw new RangeError(`no requirement R${number}`);
  // A whole requirement is one status for every model, so it is kept once rather than once per model.
  const key = asked.scope === 'whole' ? `whole:${number}` : `${model}:${number}`;
  const known = ANSWERED.get(key);
  if (known !== undefined) return known;
  const state = requirementStateFrom(PROOFS, model, number);
  ANSWERED.set(key, state);
  return state;
}
