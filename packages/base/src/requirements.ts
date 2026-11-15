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
 * An application offers a feature where it is met; the other three are for a developer. The requirements of two
 * subjects, the FHSDK as a whole and what an application builds on, are about the FHSDK rather than any bench remote
 * and carry one status for every model. So do seven requirements listed under other subjects, each an ability that
 * works on a recipe or the catalogue and reaches no remote: finding a device, R9, renaming a device or an activity,
 * R12 and R25, Pronto Hex, R20, identifying a device from taught codes, R57, moving a setup between models, R60, and
 * the report about a remote this project does not support, R68.
 *
 * **Why renaming is no remote's.** An application never changes a configuration in place: it changes a recipe, hands
 * the whole recipe over, and the FHSDK builds and writes it in one go. So an ability that only changes what a recipe
 * says is the same for every model, and what is a model's is what its family builds from the recipe and what the
 * remote then does. Removing a device or an activity, R13 and R26, is the same kind of ability and stays a model's
 * only because the Harmony Touch has it proven on a unit, on the documents it is given; everywhere else it waits on
 * the shared function, which the status says.
 *
 * **What an open status waits on.** Open covers work of four different owners, so every open status names which,
 * `RequirementState.waitsOn`: `shared`, something the FHSDK lacks for every model alike, a thing a recipe cannot
 * state or a function nobody has; `family`, the reader, builder or protocol of the model's family, or the absence of
 * one; `model`, this model's own, a fact to find out on it, its write path, its record, a behaviour not explained;
 * and `bench`, standing alone, where everything is built and tested and only a run on a unit of this model is
 * missing. A status names every one its written reason names, so the 515's open requirements mostly wait on both a
 * shared function and a family. **It is read off the reason as written and judged no further**: it says where work
 * is known to be missing, not that nothing else will turn up once that is done.
 *
 * **Where two requirements touch, the line is this.** R7 is a model's own limits, what its builder and its writer
 * refuse; R78 is the form a check takes for an application, every problem as a list without building. R66 is what a
 * model's read and write report and what the remote itself shows meanwhile; R79 is the one function that carries
 * that to an application as events. R9 is the search in the catalogue; R82 is the same question asked of every
 * source at once. R12, R25, R13 and R26 are abilities an application has; R76 is the functions it has them through.
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

/**
 * What an open requirement waits on, the owner of the work that is missing: `shared`, the FHSDK for every model
 * alike; `family`, the model's family, or the lack of one; `model`, this model's own; `bench`, nothing but a run on
 * a unit of the model. The module's header says how each is judged.
 */
export type RequirementWait = 'shared' | 'family' | 'model' | 'bench';

/** The four, in the order a table or a count lists them: the widest first, the run on a unit last. */
export const REQUIREMENT_WAIT_NAMES: readonly RequirementWait[] = ['shared', 'family', 'model', 'bench'];

/** The four statuses, in the order a table or a count lists them. */
export const REQUIREMENT_STATUS_NAMES: readonly RequirementStatus[] = ['met', 'open', 'impossible', 'unknown'];

/**
 * Whether a requirement has a status per model, or one for the FHSDK as a whole. A whole one is about how the
 * libraries are built and delivered, offline, in a browser, as published packages, or about an ability that works
 * on a recipe or the catalogue alone, and no remote changes it.
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
 * The requirements by subject, each subject's in the order they are numbered and the subjects in the order of their
 * first. Kept as groups so the subject is written once and the document's sections follow it; `REQUIREMENTS` below is
 * the flat list an application reads. **A requirement added to a subject after a later subject was numbered takes the
 * next free number and is listed with its subject**, R89 among the devices', since a number is never moved.
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
      [9, TESTED, 'Find a device in the catalogue by manufacturer, model number and type, with help for typing errors.', 'whole'],
      [10, SHOWN, 'Add a device from the catalogue with its commands, power and inputs, choosing the code set version where a device has several.'],
      [11, SHOWN, 'Add a device the catalogue does not know, from its type and commands taught from its original remote, its definition saying it was learned.'],
      [12, TESTED, 'Rename a device.', 'whole'],
      [13, SHOWN, 'Remove a device, and say and settle what happens to the activities and favourites that used it.'],
      [14, SHOWN, 'Set how a device is powered: one key or two, none, always on, kept on between activities, extra commands to power up, a power code that must be held.'],
      [15, SHOWN, 'Set how a device changes inputs and which inputs it has.'],
      [16, SHOWN, 'Set a device\'s delays, and put them back to their defaults.'],
      [17, SHOWN, 'Set how many times a device\'s commands repeat.'],
      [18, SHOWN, 'Set how a device tunes a channel number.'],
      [19, SHOWN, 'Add, fix and remove a device\'s command, and put a fixed one back to its original code.'],
      // Numbered after the hub's, since a number is never moved, and listed with the devices it is about.
      [89, SHOWN, 'Tune one command of a device: how many times a press sends it, how long a held key waits before it repeats and how fast it then repeats, kept in the document and never replaced by the catalogue\'s value.'],
      [20, TESTED, 'Export and import codes as Pronto Hex.', 'whole'],
    ],
  },
  {
    subject: 'Activities',
    scope: 'model',
    requirements: [
      [21, SHOWN, 'Create an activity of a kind with its devices; starting, switching and Off behave as the manuals describe.'],
      [22, SHOWN, 'Say which device has which role in an activity, and map its keys from that, a learned command with a standard name landing on its usual key.'],
      [23, SHOWN, 'Set each device\'s input in an activity, or leave it alone.'],
      [24, SHOWN, 'Include a pass through device in an activity.'],
      [25, TESTED, 'Rename an activity.', 'whole'],
      [26, SHOWN, 'Remove an activity.'],
      [27, SHOWN, 'Give an activity an icon.'],
      [28, SHOWN, 'Order the activity menu and an activity\'s device list.'],
      [29, SHOWN, 'Choose which activities the activity keys start.'],
      [30, SHOWN, 'Add steps to an activity\'s start and end: commands, pauses, a sequence.'],
      // Numbered after the hub's, since a number is never moved, and listed with the activities they are about.
      [90, SHOWN, 'Choose the order in which an activity switches its devices on and off.'],
      [91, SHOWN, 'Choose the screen an activity opens on, where the remote has more than one.'],
      // Numbered after R91, decision 44, and listed with the activities they are about.
      [92, SHOWN, 'Switch an activity off, so the remote is given everything but it and is told which was left out, and on again as it was.'],
      [93, TESTED, 'Mark every activity that used a device removed from the document as needing attention, saying which of its keys now do otherwise and how, keep building and syncing it, and clear the mark.'],
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
      [57, TESTED, 'Identify a device the catalogue does not recognise from a few taught commands.', 'whole'],
    ],
  },
  {
    subject: 'Backup and restore',
    scope: 'model',
    requirements: [
      [58, SHOWN, 'Back up a remote whole and keep it on the computer.'],
      [59, SHOWN, 'Put a backup back on the same remote.'],
      [60, TESTED, 'Move a setup to another remote or model, or copy devices and activities from one setup into another, adapted to the target\'s limits.', 'whole'],
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
  {
    // Plan 017 and decisions 37, 38 and 41: the outside an application builds against, one status for every model.
    subject: 'What an application builds on',
    scope: 'whole',
    requirements: [
      [76, TESTED, 'Change a recipe through functions that each return a new one and keep it consistent: add, change and remove a device, an activity, a key, a screen item, a sequence and a favourite, with no knowledge of how a recipe is laid out.'],
      [77, TESTED, 'Ask a recipe what it holds: what a key does, which devices an activity uses, what is not yet filled in.'],
      [78, TESTED, 'Check a recipe without building it, and get every problem as a list, each naming the place it concerns.'],
      [79, TESTED, 'Write a recipe to a remote through one function for every model, which reports its phases, its progress, what the user must do or leave and its outcome as events, and stops only where it is safe.'],
      [80, TESTED, 'A pretend remote an application reads and writes with nothing attached, its progress and its failures included.'],
      [81, TESTED, 'Read the catalogue over the network a device at a time, from its index, kept in a local cache; the whole archive on disk is the other source.'],
      [82, TESTED, 'Find a device across every source at once, the archive and Logitech\'s service, each result saying where it came from.'],
    ],
  },
  {
    subject: 'An existing setup',
    scope: 'model',
    requirements: [
      [83, SHOWN, 'Take over a configuration Logitech\'s software built as a recipe that rebuilds to the same behaviour, so an existing setup is not entered again.'],
    ],
  },
  {
    // Decision 40: a hub's own abilities. On a model that is not a hub they stand as impossible by that decision.
    subject: 'The hub',
    scope: 'model',
    requirements: [
      [84, SHOWN, 'Find a hub on the local network and reach it there, with no account and no service of Logitech\'s.'],
      [85, SHOWN, 'Set the Wi-Fi network a hub joins, with no service of Logitech\'s.'],
      [86, SHOWN, 'Take over a hub somebody else set up, so it is the user\'s own and holds nothing of its previous owner.'],
      [87, SHOWN, 'Through a hub, start and stop an activity, send one command of a device, and read which activity is on.'],
      [88, SHOWN, 'Read the smart home devices a hub found, with their kind and what each can do, and leave them intact when a setup is written.'],
    ],
  },
];

/** The subjects, in the order the requirements are numbered and the document lists them. */
export const REQUIREMENT_SUBJECTS: readonly string[] = GROUPS.map((group) => group.subject);

/** Every requirement, in number order, withdrawn ones included. */
export const REQUIREMENTS: readonly Requirement[] = GROUPS.flatMap((group) =>
  group.requirements.map(([number, needsBench, text, scope]) => ({ number, subject: group.subject, text, scope: scope ?? group.scope, needsBench })))
  // The groups list a requirement with its subject, which is not always in number order, R89; the list is.
  .sort((a, b) => a.number - b.number);

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
  | 'harmony-785' | 'harmony-300' | 'harmony-350' | 'harmony-touch' | 'harmony-elite' | 'harmony-hub';

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
 * The thirteen models a unit of which is on the bench, in the order the document's tables list them: the models with a
 * screen first, then the two without, then the Harmony Touch and the two of its generation that work as a set, the
 * Harmony Elite and the Harmony Hub, decision 40.
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
 * `reference/remotes/harmony-touch/README.md`. The Harmony Elite is skin 111, Logitech's `HarmonyElitePlus`, the
 * remote sold with a hub; skin 112, their `HarmonyElite`, is the same name sold alone as the Harmony 950 and is
 * left out, no unit of it being on the bench. The Harmony Hub is skin 106 alone: skin 97, the other hub, is not on
 * the bench. `reference/remotes/README.md` has the names. **Neither has a folder under `reference/remotes/` yet**:
 * what is known of both is the platform's, `reference/architectures/harmony-touch/`, with the hub's pages under
 * `hub/`, and their model pages wait for the bench.
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
  { key: 'harmony-elite', name: 'Harmony Elite', skins: [111] },
  { key: 'harmony-hub', name: 'Harmony Hub', skins: [106] },
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
  /**
   * For an open status, whose work is missing, every owner its reason names, in the order of
   * `REQUIREMENT_WAIT_NAMES`: never empty, and `bench` only alone, since anything else missing has no run on a unit
   * either. Empty for the other three statuses.
   */
  readonly waitsOn: readonly RequirementWait[];
}

/** The written statuses carry no proof; the field is for a met. */
const NO_PROOF: readonly Proof[] = [];

/** What an open status waits on, each combination the data uses written once. */
const SHARED: readonly RequirementWait[] = ['shared'];
const FAMILY: readonly RequirementWait[] = ['family'];
const MODEL: readonly RequirementWait[] = ['model'];
const BENCH: readonly RequirementWait[] = ['bench'];
const SHARED_FAMILY: readonly RequirementWait[] = ['shared', 'family'];
const SHARED_MODEL: readonly RequirementWait[] = ['shared', 'model'];
const FAMILY_MODEL: readonly RequirementWait[] = ['family', 'model'];

/** Only the three statuses below wait on nothing. */
const WAITS_ON_NOTHING: readonly RequirementWait[] = [];

/** Open, saying whose work is missing and what. */
function open(waitsOn: readonly RequirementWait[], why: string): RequirementState {
  return { status: 'open', tests: [], bench: [], proofs: NO_PROOF, reference: [], why, waitsOn };
}

/** Impossible on the model, with the reference page that says so. */
function impossible(reference: readonly string[], why: string): RequirementState {
  return { status: 'impossible', tests: [], bench: [], proofs: NO_PROOF, reference, why, waitsOn: WAITS_ON_NOTHING };
}

/** Unknown, saying what is not known, with the reference page that leaves it open where one does. */
function unknown(why: string, reference: readonly string[] = []): RequirementState {
  return { status: 'unknown', tests: [], bench: [], proofs: NO_PROOF, reference, why, waitsOn: WAITS_ON_NOTHING };
}

/**
 * Every bench model's written status on the requirements of the models, those of R1 to R72 that are not the FHSDK's
 * as a whole and R83 to R93, that no proof makes met:
 * open, impossible or unknown, each with its reason, judged by reading the model's test notes, its bench tests and its
 * reference pages, an open one saying first whose work is missing. A requirement a proof names for the model has no entry here, and one with neither is a fault,
 * `test/requirements.test.ts`: every requirement on every model is proven or written, never both.
 */
const MODEL_STATUSES: Readonly<Record<BenchModelKey, Readonly<Record<number, RequirementState>>>> = {
  // The Harmony One.
  'harmony-one': {
    3: open(SHARED, 'Nothing turns a One configuration back into a recipe, and no record of ours is carried inside one yet.'),
    6: open(SHARED, 'The writer permits only the bench units on its list; a One never seen cannot be recorded and made a write target.'),
    8: open(SHARED_FAMILY, 'Nothing reads back what was changed on the One itself, such as its Options settings, so no change is detected or kept.'),
    10: open(SHARED_FAMILY, 'Catalogue devices compose and were heard, but no code set version can be chosen and inputs chosen through a menu are refused.'),
    11: open(FAMILY, 'Nothing learns on a One, so a device the catalogue lacks cannot be built from taught commands.'),
    13: open(SHARED, 'Nothing removes a device or settles the activities and favourites that used it.'),
    14: open(SHARED_FAMILY, 'Catalogue power composes, but a power code that must be held is not composed or tested for the One.'),
    15: open(SHARED_FAMILY, 'Direct inputs come from the catalogue; how a device changes inputs cannot be set, and inputs through a menu are refused.'),
    16: open(SHARED, 'A power on delay was edited and written to the spare; other delays and a return to defaults are not offered.'),
    17: open(SHARED, 'Repeats follow the catalogue\'s count; nothing lets a repeat count be set.'),
    18: open(SHARED_FAMILY, 'Nothing sets how a device tunes a channel number.'),
    19: open(SHARED, 'The toolkit adds a command with its own code to a recipe, gives one a new code and puts the original back, but no build reads a command\'s own code yet, and taking away a command of the definition is not built.'),
    22: open(FAMILY, 'Keys are mapped from roles and the Denon\'s volume was heard; the learned command part does not exist for the One.'),
    24: open(FAMILY, 'The pass through test covers the Harmony 650 only, and no One test note records the switch being driven.'),
    26: open(SHARED, 'Nothing removes an activity from a configuration; only building a recipe without it would leave it out.'),
    27: open(SHARED, 'Icons are chosen per activity type in the look choices, never for one activity.'),
    28: open(FAMILY, 'The menu follows the recipe\'s order, but an activity\'s device list always puts its started devices first and cannot be ordered.'),
    29: impossible(['reference/remotes/harmony-one/keys.md#every-key-on-the-drawing'], 'The One has one Activities key that opens the list and no keys that start an activity.'),
    30: open(SHARED, 'Nothing adds commands, pauses or a sequence to an activity\'s start or end.'),
    31: open(SHARED, 'A sequence on a key is refused; a recipe gives an activity\'s key a command of one of its devices or nothing, built and heard on the spare.'),
    33: open(BENCH, 'Device mode maps compose as Logitech\'s and a page command was heard, but no keypad key in device mode was pressed at the bench.'),
    34: open(FAMILY, 'Screen commands are placed in order and were heard, but no label of the user\'s own can be given and no run showed several pages.'),
    35: open(SHARED, 'A device\'s screen pages are laid out from the catalogue, and a recipe cannot choose or order them.'),
    36: open(SHARED, 'Nothing builds a screen button that opens a page of the user\'s own commands.'),
    37: open(BENCH, 'A named sequence was heard on the spare only in a run composed onto Logitech\'s file; no build from a recipe with a sequence has been on the One.'),
    38: impossible(['reference/remotes/harmony-one/keys.md#what-pressing-or-holding-does'], 'The One has no long press; a held key repeats its command.'),
    39: impossible(['reference/remotes/harmony-one/keys.md#every-key-on-the-drawing'], 'The One has no device keys; a device is picked from the list the Devices key opens.'),
    40: unknown('It is not known whether the One\'s touch panel reads any gesture beyond a touch on a rectangle.'),
    41: open(BENCH, 'One screens render, but no test note compares a rendered screen with what the spare drew.'),
    42: open(FAMILY, 'Letters, inks, box colours and icons are choices; a background picture of the user\'s own and a theme are not.'),
    43: open(MODEL, 'The One is drawn with every key named, but six keys, among them Activities, Help and Off, have no measured scan code.'),
    44: open(FAMILY, 'Only the power off help with nothing running is built; an activity\'s help and the advanced help with delay fixing are not.'),
    45: open(FAMILY, 'Nothing of ours writes a favourite channel for the One, and the builders refuse a recipe that states one.'),
    46: open(FAMILY, 'No favourite channel is built for the One, so none can carry an icon.'),
    47: open(FAMILY, 'Screen light, start assistant and tour are build choices; nothing reads the remote\'s settings, sets screen sounds or restores defaults.'),
    48: open(FAMILY, 'How long the screen stays lit is a choice and was timed on the spare; brightness cannot be set.'),
    49: unknown('The One lights when picked up, but whether that sensing can be switched off is not known.'),
    50: open(FAMILY, 'The assistant at start can be left out, but the assistant after an activity starts and the Starting screen cannot be switched.'),
    51: open(FAMILY, 'Nothing chooses between Smart and Full help on the One.'),
    52: open(FAMILY, 'A write stamps the time and the clock reads over USB, but its format is no choice and the time after a write is unchecked.'),
    53: open(FAMILY, 'Nothing builds a slideshow of the user\'s pictures for the One.'),
    54: open(FAMILY, 'Nothing sends the learning commands to a One.'),
    55: open(FAMILY, 'How a learned code is stored in a One configuration is not known, so none can be used.'),
    56: open(FAMILY, 'A learned code is recognised by the Harmony Touch\'s reader; nothing keeps one in a Harmony One configuration.'),
    59: open(BENCH, 'A whole backup has never been put back on a One; only one block of its own was written back unchanged.'),
    65: open(SHARED_MODEL, 'The One\'s battery reading has not been checked, and nothing warns or refuses a write when it is low.'),
    66: open(SHARED_FAMILY, 'A read reports progress, but a write does not, and nothing makes the One show it is being written.'),
    67: impossible(['reference/remotes/harmony-one/behaviour.md#on-the-cable'], 'On the cable the One\'s keypad handler stops, so a key press cannot be watched live.'),
    69: open(SHARED, 'The version block shows running or safe mode, but nothing knows whether a newer firmware exists.'),
    70: impossible(['docs/decisions.md#d18'], 'Decision 18 allows the firmware install on the Harmony 600, 650 and 700 alone, so the FHSDK never installs firmware here.'),
    71: open(FAMILY, 'Nothing in the FHSDK brings a stuck One back; the recovery paths built are other models\'.'),
    72: open(SHARED, 'Logitech\'s service serves the One, but its client is tied to test accounts and is on no public entry.'),
    83: open(SHARED, 'Nothing turns a configuration Logitech\'s software built into a recipe; a setup is entered again.'),
    84: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub, and the FHSDK reaches it over its cable.'),
    85: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub, and the FHSDK sets no network for it.'),
    86: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub; writing a remote of one\'s own is R6.'),
    87: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub and is driven by its keys.'),
    88: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub and finds no smart home devices.'),
    89: open(SHARED, 'The composer takes explicit blocks per command, and nothing in a recipe reaches them, so no command can be tuned on its own.'),
    90: open(SHARED_FAMILY, 'The start switches the devices on in the order the activity\'s device list puts them, a rule of the build; nothing lets a person choose that order or the order off.'),
    91: unknown('Logitech\'s configurations open every activity on its working screen after the start up screen; whether one of ours could open on another is not checked.', ['reference/remotes/harmony-one/display.md#what-a-person-sees']),
    92: open(BENCH, 'A build from a recipe leaves a switched off activity out, the same configuration as one without it, and a sync says which it left out, but no such build has been sent to the unit.'),
  },
  // The Harmony 600.
  'harmony-600': {
    3: open(SHARED, 'Nothing turns a compiled configuration back into a recipe, and the record of ours carried inside a configuration is not built.'),
    6: open(SHARED, 'Every write path permits only the bench units\' records; taking up a remote never seen as a write target is not built.'),
    8: open(SHARED, 'Saved delays are read and cleared on the 600, but nothing compares with the last write or keeps them in a new build.'),
    10: open(SHARED, 'Catalogue devices with commands, power and inputs ran on the 600; choosing a code set version is not offered.'),
    11: open(FAMILY, 'Learning is not built for this family, so a device taught from its original remote cannot be made.'),
    13: open(SHARED, 'Nothing removes a device and settles the activities and favourites that used it.'),
    14: open(SHARED, 'Keeping a device on ran on the 600; no power, always on, extra power steps and a held power code are not offered.'),
    15: open(SHARED_FAMILY, 'Direct inputs ran on the 600; inputs chosen through a menu are refused, and a recipe cannot state a device\'s inputs.'),
    16: open(SHARED, 'A power on delay edit was heard on the 600; per device inter device and input delays, and a return to defaults, are not offered.'),
    17: open(SHARED, 'Repeat counts are composed from the catalogue; nothing lets an application set them.'),
    18: open(SHARED_FAMILY, 'Channel tuning comes from the catalogue entry; nothing lets an application set it.'),
    19: open(SHARED, 'The toolkit adds a command with its own code to a recipe, gives one a new code and puts the original back, but no build reads a command\'s own code yet, and taking away a command of the definition is not built.'),
    22: open(FAMILY, 'Keys mapped from roles ran on the 600; a learned command landing on its usual key is not built, since learning is not.'),
    24: open(BENCH, 'A pass through device ran on the 600 only in a six device build, made by raising the library\'s refused limit.'),
    26: open(SHARED, 'Nothing removes an activity from an existing setup, and no run on the 600 dropped one.'),
    27: unknown('No reference page says whether the 600\'s monochrome screen can show an activity icon.'),
    28: open(FAMILY, 'The menu follows the recipe\'s order, but no 600 run records the order shown, nor an activity\'s device list order.'),
    30: open(SHARED, 'Extra commands, pauses or a sequence at an activity\'s start or end are not offered.'),
    31: open(SHARED, 'A recipe cannot state a key binding in an activity; the keypad comes from roles only.'),
    32: open(SHARED, 'Device mode\'s map comes from the catalogue only; a recipe cannot change what a key sends there.'),
    33: open(FAMILY, 'Device pages were visited on the 600, but its device mode keypad was not exercised, and the rules differ from Logitech\'s on some devices.'),
    34: open(BENCH, 'Screen commands ran on the 600, but no activity there held more than one page, so paging is not shown.'),
    35: open(SHARED, 'Device pages come from the catalogue only; choosing their commands is not offered.'),
    36: open(SHARED, 'A screen button opening a page of the user\'s own commands is not built.'),
    38: impossible(['reference/remotes/harmony-600/features.md#the-capability-fields', 'reference/architectures/harmony-600-650-700/README.md#keys'], 'The firmware tells no long press from a short one, and Logitech declares none for the 600.'),
    39: impossible(['reference/remotes/harmony-600/behaviour.md#device-mode-in-and-out'], 'The 600 has no device keys; a device is chosen from a list under the centre key.'),
    40: impossible(['reference/remotes/harmony-600/display.md#the-panel'], 'The 600 has no touch panel.'),
    41: open(MODEL, 'Pages render as stored, but what the monochrome panel makes of each colour is not measured.'),
    42: open(FAMILY, 'Letters, blending and the one grey were seen on the 600; state colours are refused and other looks were never written to it.'),
    44: open(FAMILY, 'Help is left out of every build of this family; advanced help and its delay fixing are not built.'),
    45: open(FAMILY, 'Every composer refuses favourites; the 600 shows them on Watch TV\'s screen by its manual.'),
    46: open(FAMILY, 'No favourite is built for the 600, so no favourite icon either.'),
    47: open(FAMILY, 'Settings are not read back, and the tutorial choice was never shown on the 600; it has no touch sound.'),
    48: open(MODEL, 'The stated 20 s screen light was seen on the 600; no other value was written, and a brightness setting is not known.'),
    49: open(BENCH, 'The tilt sensor is a build choice, but no build with it off ran on the 600.'),
    50: open(FAMILY, 'The Remote Assistant is left out of every build; switching it on, or a start message, is not offered.'),
    51: unknown('No reference page says whether the 600 offers Smart or Full help.'),
    52: open(FAMILY, 'The 600 shows no clock; its clock is read only as raw memory, and setting it over USB is deliberately not built.'),
    53: unknown('No reference page says whether the 600 can show a slideshow.'),
    54: open(FAMILY, 'The 600 learns by its manual, but nothing in the FHSDK sends the learning command.'),
    55: open(FAMILY, 'How a learned code is stored on this family is not read, so none can be used.'),
    56: open(FAMILY, 'A learned code is recognised by the Harmony Touch\'s reader; nothing keeps one in a 600 configuration.'),
    62: open(BENCH, 'Listing and the model from the release number are tested, but the 600\'s enumeration was recorded with the system\'s tools, not the FHSDK.'),
    65: open(SHARED_MODEL, 'The battery read exists but was never sent to a 600, and no low battery warning or refusal is built.'),
    66: open(FAMILY, 'Read progress is reported, but nothing makes the remote show it is being written.'),
    67: open(BENCH, 'A watch address exists for the 600, but no run names a pressed key live; on the cable only matrix columns were read.'),
    69: open(SHARED_MODEL, 'Safe mode and the bootloader are not checked on a 600, and Logitech\'s version list is not in the libraries.'),
    70: open(MODEL, 'Staging and reinstall exist for this family but were never sent to a 600, and its newer image is not obtainable.'),
    71: open(MODEL, 'The reinstall request was never sent to a 600, and its safe mode is not checked.'),
    72: open(SHARED, 'Logitech\'s service serves the 600, but the FHSDK\'s account client is on no public entry.'),
    83: open(SHARED, 'Nothing turns a configuration Logitech\'s software built into a recipe; a setup is entered again.'),
    84: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub, and the FHSDK reaches it over its cable.'),
    85: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub, and the FHSDK sets no network for it.'),
    86: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub; writing a remote of one\'s own is R6.'),
    87: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub and is driven by its keys.'),
    88: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub and finds no smart home devices.'),
    89: open(SHARED, 'The composer takes explicit blocks per command, and nothing in a recipe reaches them, so no command can be tuned on its own.'),
    90: open(SHARED_FAMILY, 'The start switches the devices on in the order the activity\'s device list puts them, a rule of the build; nothing lets a person choose that order or the order off.'),
    91: unknown('Logitech\'s configurations open every activity on its working screen; whether one of ours could open on another is not checked.', ['reference/remotes/harmony-600/behaviour.md#starting-switching-and-ending-activities']),
    92: open(BENCH, 'A build from a recipe leaves a switched off activity out, the same configuration as one without it, and a sync says which, but no such build has been sent to the 600.'),
    93: open(FAMILY, 'A removal marks the activities that used the device, but names no key: the family states no maps yet, so what its keys do after the removal is not known.'),
  },
  // The Harmony 650.
  'harmony-650': {
    3: open(SHARED, 'Nothing reads a compiled 650 configuration back into a recipe, and the record of ours carried inside is not built.'),
    4: open(BENCH, 'The 650 test setup builds to its fingerprint, but no test note records a recipe build running, and the build the remote ran differs.'),
    6: open(SHARED, 'Writes go only to units on the bench\'s fixed list; a stranger\'s 650 cannot be recorded and made a write target.'),
    8: open(SHARED, 'The settings store has never been read on a 650, and nothing offers keeping or discarding changes made on the remote.'),
    10: open(SHARED, 'Catalogue devices compose and ran on the 650, but nothing lets the user choose between a device\'s code sets.'),
    11: open(FAMILY, 'Teaching commands from an original remote needs learning, and nothing in the FHSDK learns through a 650.'),
    13: open(SHARED, 'Nothing removes a device and reports or settles the activities and favourites that used it.'),
    14: open(SHARED, 'The held power code ran on the 650; keep on, always on and no power have no test note, and no power is not offered.'),
    15: open(SHARED_FAMILY, 'Direct and stepped inputs compose, inputs chosen through a menu are refused, and no test note shows an input on the 650.'),
    16: open(SHARED, 'A power on delay edit ran on the 650, but nothing sets one device\'s delay between devices or restores defaults.'),
    17: open(SHARED, 'A device\'s repeat count is taken from the catalogue, and nothing lets an application set it.'),
    18: open(SHARED_FAMILY, 'Channel tuning is composed for the Harmony 300, 350 and Touch, not for the 650\'s family.'),
    19: open(SHARED, 'Commands can be chosen when composing a device; the toolkit adds a command with its own code to a recipe, gives one a new code and puts the original back, but no build reads a command\'s own code yet, and taking away a command of the definition is not built.'),
    21: open(BENCH, 'Composed activities started and All Off ran on the 650, but its test notes record no switching between activities.'),
    22: open(FAMILY, 'The key map built from roles ran on the 650, but the learned command half needs learning, which does not exist.'),
    23: open(BENCH, 'An activity\'s device inputs compose, but no test note shows one being set on the 650.'),
    24: open(BENCH, 'A pass through device composes as Logitech\'s does, but the test notes do not record it on the 650.'),
    26: open(SHARED, 'Nothing removes an activity; a rebuild without it is not tested as a removal and not shown on the 650.'),
    27: impossible(['reference/remotes/harmony-650/display.md#what-the-screen-does-not-show'], 'The 650 draws no device or activity icons.'),
    28: open(FAMILY, 'The menu follows the recipe\'s order, an activity\'s device list order is not offered, and neither has a test note.'),
    29: open(SHARED, 'Activity keys can be set and emptied, but a recipe chooses only by type and no test note shows it.'),
    30: open(SHARED, 'Nothing adds commands, pauses or a sequence to an activity\'s start or end.'),
    31: open(SHARED, 'A recipe states no keypad binding for an activity; an edit can only repoint a key the activity already binds.'),
    32: open(SHARED, 'Nothing changes what a key sends in a device\'s own map.'),
    33: open(BENCH, 'Device mode maps compose and composed pages sent on the 650, but no test note shows every key and page.'),
    34: open(BENCH, 'An activity\'s screen items come from the recipe, but no test note shows a composed activity screen on the 650.'),
    36: open(SHARED, 'No screen button that opens a page of the user\'s own commands is built.'),
    38: impossible(['reference/remotes/harmony-650/keys.md#what-pressing-a-key-raises'], 'The firmware raises press, repeat and release only, so no key has a held action.'),
    39: impossible(['reference/remotes/harmony-650/keys.md#what-pressing-a-key-raises'], 'The 650 has no device keys and no long press.'),
    40: impossible(['reference/remotes/harmony-650/display.md#the-panel'], 'The 650\'s screen has no touch, so there are no gestures.'),
    41: open(BENCH, 'Every screen renders, but no test note compares a render with what the 650 drew.'),
    42: open(FAMILY, 'Our letters ran on the 650, but colours, icons and backgrounds have no test note, and nothing is chosen per screen.'),
    43: open(MODEL, 'The face is drawn, but 13 keys have no scan code and the rest are the 600\'s, never measured on a 650.'),
    44: open(FAMILY, 'Help, advanced help and delay fixing are not built; a composed 650 configuration carries no Help.'),
    45: open(FAMILY, 'Every composer refuses favourite channels; only Logitech\'s service compiles them for a 650.'),
    46: open(FAMILY, 'The manual shows a favourite beside its number or icon, and nothing of ours builds a favourite or its icon.'),
    47: open(FAMILY, 'Settings are only build choices, never read back or reset; the 650 has no touch sound.'),
    48: open(MODEL, 'The lit time is a build choice with no test note of ours, and no brightness setting is known.'),
    49: open(BENCH, 'The tilt sensor is a build choice, but no test note shows our setting acting on the 650.'),
    50: open(MODEL, 'The Remote Assistant is a build choice with no test note on the 650; a switch for the start message is not known.'),
    51: unknown('No page says whether a 650 can have Smart or Full help; MyHarmony offers it only three settings.'),
    52: open(FAMILY, 'A write sets the clock, as seen in memory; the 650 cannot show it, and nothing reads it back as a time.'),
    53: unknown('No page says whether a 650 can show a slideshow; only the Harmony One\'s is described.'),
    54: open(FAMILY, 'The manual says the 650 learns up to 200 kHz, and nothing in the FHSDK drives its receiver.'),
    55: open(FAMILY, 'How a compiled remote stores a learned code is not read, so nothing puts one into a 650 device.'),
    56: open(FAMILY, 'A learned code is recognised by the Harmony Touch\'s reader; nothing keeps one in a 650 configuration.'),
    61: open(BENCH, 'The empty 650 builds to its fingerprint, but no test note records it running, and the build written differs.'),
    62: open(FAMILY, 'Listing finds product 0xC122 but names it a Harmony 600 or 700; telling a 650 apart needs its skin.'),
    65: open(SHARED, 'The battery voltage is read on the 650, but there is no level, no threshold and no warning or refusal.'),
    66: open(FAMILY, 'A read reports progress, but nothing makes the 650 show that it is being written.'),
    67: open(MODEL, 'The key watch uses the Harmony 600\'s memory address for every remote of its product id, and the 650\'s is not read.'),
    69: open(SHARED_MODEL, 'The version is read, but safe mode was never entered on a 650 and nothing knows whether a newer version exists.'),
    70: open(MODEL, 'The staging write and reinstall were never sent to a 650, and Logitech\'s update service does not serve it.'),
    71: open(MODEL, 'No recovery has been tried on a 650, and it has no staged application to reinstall.'),
    72: open(SHARED, 'Logitech\'s service still serves the 650, but our client is tied to the test accounts and is on no public entry.'),
    83: open(SHARED, 'Nothing turns a configuration Logitech\'s software built into a recipe; a setup is entered again.'),
    84: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub, and the FHSDK reaches it over its cable.'),
    85: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub, and the FHSDK sets no network for it.'),
    86: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub; writing a remote of one\'s own is R6.'),
    87: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub and is driven by its keys.'),
    88: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub and finds no smart home devices.'),
    89: open(SHARED, 'The composer takes explicit blocks per command, and nothing in a recipe reaches them, so no command can be tuned on its own.'),
    90: open(SHARED_FAMILY, 'The start switches the devices on in the order the activity\'s device list puts them, a rule of the build; nothing lets a person choose that order or the order off.'),
    91: unknown('Logitech\'s configurations open every activity on its working screen; whether one of ours could open on another is not checked.', ['reference/remotes/harmony-650/behaviour.md#starting-and-switching-activities']),
    92: open(BENCH, 'A build from a recipe leaves a switched off activity out, the same configuration as one without it, and a sync says which, but no such build has been sent to the 650.'),
    93: open(FAMILY, 'A removal marks the activities that used the device, but names no key: the family states no maps yet, so what its keys do after the removal is not known.'),
  },
  // The Harmony 700.
  'harmony-700': {
    1: open(BENCH, 'readConfig is tested on the family\'s samples, but the 700 unit was only ever read as raw regions, never through it.'),
    2: open(FAMILY, 'The reader handles the 700\'s compiles, but deviceModeMaps still picks a help screen for their A/V switch, pinned as a fault.'),
    3: open(SHARED, 'Nothing turns a compiled configuration back into a recipe, and no record of ours is carried inside one.'),
    6: open(SHARED, 'Writes are permitted only to the bench units the library lists; a remote never seen cannot be taken on.'),
    8: open(SHARED, 'The settings store reader exists, but the store read was never sent to a 700 and nothing detects changes.'),
    10: open(SHARED, 'Catalogue devices with commands, power and inputs ran on the 700; choosing among a device\'s code set versions is not offered.'),
    11: open(FAMILY, 'Learning is not offered on this model, so a device taught from its original remote cannot be built.'),
    13: open(SHARED, 'A device goes only by rebuilding without it; nothing says or settles what happens to activities and favourites that used it.'),
    14: open(SHARED, 'One key, two keys, kept on and a held power code ran on the 700; no power and always on were not shown.'),
    15: open(SHARED_FAMILY, 'Direct and stepped inputs ran on the 700, but inputs chosen through a menu are refused by the composer.'),
    16: open(SHARED, 'One power on delay was raised and put back, both heard; other delays and a return to defaults are not offered.'),
    17: open(SHARED, 'Repeats are composed from the catalogue; nothing lets an application set them.'),
    18: open(SHARED_FAMILY, 'Channel tuning is taken from the catalogue record; nothing lets an application set it.'),
    19: open(SHARED, 'The toolkit adds a command with its own code to a recipe, gives one a new code and puts the original back, but no build reads a command\'s own code yet, and taking away a command of the definition is not built.'),
    22: open(FAMILY, 'Keys from roles ran on the 700, volume to the receiver and channels to the box; learned commands cannot exist to land.'),
    23: open(BENCH, 'Inputs set per activity ran on the 700; no device with inputs was left alone in any activity run.'),
    24: open(BENCH, 'The one activity with a pass through device was built but never started on the 700.'),
    26: open(SHARED, 'A setup lacking one activity ran on the 700, but removal is only a rebuild from a smaller recipe, untested as such.'),
    27: unknown('No page says whether a 700\'s activity menu can show an icon per activity.'),
    28: open(FAMILY, 'The menu follows the recipe\'s order on the 700; an activity\'s device list order is fixed by the build, not chosen.'),
    30: open(SHARED, 'Starts and ends are composed from the devices; adding commands, pauses or a sequence to them is not offered.'),
    31: open(SHARED, 'A recipe cannot override what a key does in an activity on this family.'),
    32: open(SHARED, 'A recipe cannot change a key or a screen button in device mode on this family.'),
    34: open(BENCH, 'Labelled, ordered activity screen items ran on the 700, but never more than one page of them.'),
    35: open(SHARED, 'Device mode pages follow the catalogue; a recipe cannot choose their commands.'),
    36: open(SHARED, 'Nothing builds a screen button that opens a page of the user\'s own commands.'),
    38: impossible(['reference/remotes/harmony-700/README.md#key-numbers'], 'The 700 has no long press, by Logitech\'s service.'),
    39: impossible(['reference/remotes/harmony-700/behaviour.md#device-mode-in-and-out'], 'The 700 has no device keys; device mode is a list opened by the centre key below the screen.'),
    40: impossible(['reference/remotes/harmony-700/display.md#the-panel'], 'The 700\'s screen has no touch panel, so there are no gestures.'),
    41: open(BENCH, 'The renderer draws the 700\'s pages, but no run compares a preview with what the remote drew.'),
    42: open(FAMILY, 'Our letters, icons and chosen state colours ran on the 700; designed backgrounds and Logitech\'s letters are refused on it.'),
    43: open(MODEL, 'The face is drawn, but 13 keys carry no scan code and the rest are the 600\'s, unmeasured on a 700.'),
    44: open(FAMILY, 'Nothing builds help; activities composed on the 700 bind no Help key.'),
    45: open(FAMILY, 'Favourites reach a 700 only through Logitech\'s service; every composer here refuses a recipe that states any.'),
    46: unknown('No page says a 700 draws a favourite\'s icon; the service lists an image scaling capability only.', ['reference/remotes/harmony-700/features.md#what-logitechs-service-states']),
    47: open(FAMILY, 'Settings are written as build choices; nothing reads them back, and the tutorial and defaults are not offered.'),
    48: open(MODEL, 'The screen went dark at the 20 second default; no other timeout ran, and a brightness setting is not known.'),
    49: open(BENCH, 'The tilt sensor choice exists, but no 700 build with it off was made or run.'),
    50: open(FAMILY, 'The 700 is built with the Assistant off, unobserved on the unit; on, and the starting message, are not built.'),
    51: unknown('No page says whether a 700 offers a choice between Smart and Full help.'),
    52: open(FAMILY, 'The 700 shows no clock; its clock was read once over USB, but nothing sets it or reads it as a time.'),
    53: unknown('No page says whether a 700 can show a slideshow; only the Harmony One\'s page describes one.'),
    54: open(FAMILY, 'The manual gives the 700 learning, but nothing here sends the learning commands.'),
    55: open(FAMILY, 'How a learned code is stored in this family\'s configuration is not known, so none can be used.'),
    56: open(FAMILY, 'A learned code is recognised by the Harmony Touch\'s reader; nothing keeps one in a 700 configuration.'),
    62: open(MODEL, 'The 600, 650 and 700 share one product id, and the 700\'s descriptor word naming its skin was never checked on the unit.'),
    64: open(MODEL, 'Firmware, flash, architecture and skin were read off the unit; the hardware version a 700 reports is not recorded.'),
    65: open(SHARED_MODEL, 'The battery voltage read exists in the 700\'s firmware but was never asked of the unit, and no threshold exists.'),
    66: open(FAMILY, 'Read progress is reported, but nothing makes the remote show that it is being written.'),
    67: open(MODEL, 'The key watch takes the 600\'s address for this product id; the 700\'s own address is not chosen.'),
    69: open(SHARED, 'Safe mode was recognised on this unit, but nothing tells whether a newer firmware exists.'),
    72: open(SHARED, 'Logitech\'s service still answers for the 700, but its client is bound to test accounts and on no public entry.'),
    83: open(SHARED, 'Nothing turns a configuration Logitech\'s software built into a recipe; a setup is entered again.'),
    84: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub, and the FHSDK reaches it over its cable.'),
    85: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub, and the FHSDK sets no network for it.'),
    86: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub; writing a remote of one\'s own is R6.'),
    87: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub and is driven by its keys.'),
    88: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub and finds no smart home devices.'),
    89: open(SHARED, 'The composer takes explicit blocks per command, and nothing in a recipe reaches them, so no command can be tuned on its own.'),
    90: open(SHARED_FAMILY, 'The start switches the devices on in the order the activity\'s device list puts them, a rule of the build; nothing lets a person choose that order or the order off.'),
    91: unknown('Logitech\'s configurations open every activity on its working screen; whether one of ours could open on another is not checked.', ['reference/remotes/harmony-700/behaviour.md#starting-switching-and-ending-activities']),
    92: open(BENCH, 'A build from a recipe leaves a switched off activity out, the same configuration as one without it, and a sync says which, but no such build has been sent to the 700.'),
    93: open(FAMILY, 'A removal marks the activities that used the device, but names no key: the family states no maps yet, so what its keys do after the removal is not known.'),
  },
  // The Harmony 525.
  'harmony-525': {
    3: open(SHARED_FAMILY, 'Nothing turns a compiled configuration back into a recipe, and nothing builds for the 525 that could carry a record of ours.'),
    4: open(FAMILY, 'No codec family serves the 525, so nothing builds a configuration for it from a recipe.'),
    5: open(MODEL, 'Only one block of the unit\'s own bytes was written back; the whole configuration writer refuses a 525.'),
    6: open(SHARED_MODEL, 'Writes are limited to the bench unit\'s record, and nothing takes in an unseen 525 as a write target.'),
    7: open(FAMILY_MODEL, 'A wrong remote\'s configuration and an overflowing sequence are refused, but nothing refuses too many devices, and the 525\'s limit is unknown.'),
    8: open(SHARED_FAMILY, 'Nothing compares a 525\'s configuration with the one last written, and no configuration of ours has been written to it.'),
    10: open(SHARED_FAMILY, 'Nothing composes a catalogue device for the 525.'),
    11: open(FAMILY, 'Nothing composes a learned device for the 525, and learning on it has not been done.'),
    13: open(SHARED_FAMILY, 'Nothing removes a device from a 525 configuration or settles its activities.'),
    14: open(SHARED_FAMILY, 'No part of device power is composed for the 525, since no family serves it.'),
    15: open(SHARED_FAMILY, 'Nothing composes a device\'s inputs for the 525.'),
    16: open(SHARED_FAMILY, 'Power on delays are read in 525 configurations, but nothing sets or resets them for this model.'),
    17: open(SHARED_FAMILY, 'Nothing composes a repeat count for a 525 device.'),
    18: open(SHARED_FAMILY, 'Nothing composes channel tuning for a 525 device.'),
    19: open(SHARED_FAMILY, 'The toolkit adds a command with its own code to a recipe, gives one a new code and puts the original back, but no build reads a command\'s own code yet, and taking away a command of the definition is not built.'),
    21: open(FAMILY, 'Nothing composes an activity for the 525.'),
    22: open(FAMILY, 'No activity key map from device roles is built for the 525.'),
    23: open(FAMILY, 'No activity input setting is built for the 525.'),
    24: open(FAMILY, 'The 525 manual offers a passthrough device, and nothing builds activities for it.'),
    26: open(SHARED_FAMILY, 'Nothing removes an activity from a 525 configuration.'),
    27: unknown('No page says whether a 525 activity can carry an icon on its monochrome screen.'),
    28: open(FAMILY, 'The 525 manual lets activities be reordered, and nothing builds the 525\'s activity menu.'),
    29: impossible(['reference/remotes/harmony-525/keys.md#every-key-on-the-drawing'], 'None of the 525\'s fifty keys is an activity key; activities start from a list opened by the Activities key.'),
    30: open(SHARED_FAMILY, 'Nothing builds an activity\'s start or end steps for the 525.'),
    31: open(SHARED_FAMILY, 'Nothing changes an activity key binding in a 525 configuration.'),
    32: open(SHARED_FAMILY, 'Device mode maps are read on the 525, but nothing changes one.'),
    33: open(FAMILY, 'No device mode map is composed from the catalogue for the 525.'),
    34: open(FAMILY, 'Nothing composes an activity\'s screen pages for the 525.'),
    35: open(SHARED_FAMILY, 'Nothing composes a device\'s screen pages for the 525.'),
    36: open(SHARED_FAMILY, 'The 525 pages by soft key bindings, and nothing builds such pages for it.'),
    37: open(FAMILY, 'The queue limit is read in the 525\'s firmware, but nothing composes a sequence for it.'),
    38: unknown('Logitech\'s service gives the 525 no long press, which was not the firmware\'s limit on the 300, and holding a key is not checked.', ['reference/remotes/harmony-525/keys.md#holding-a-key']),
    39: impossible(['reference/remotes/harmony-525/keys.md#every-key-on-the-drawing'], 'The 525 has no device keys; its Devices key opens a list.'),
    40: impossible(['reference/remotes/harmony-525/display.md#the-panel'], 'The 525\'s screen is not a touch screen.'),
    41: open(FAMILY, 'Every page of a 525 configuration renders, but no rendering was compared with the unit, and nothing is built to write.'),
    42: open(FAMILY, 'Nothing builds 525 screens, so no typeface, picture or theme can be chosen.'),
    43: open(MODEL, 'The face is drawn with fifty keys, but no key\'s scan code is known.'),
    44: open(FAMILY, 'The 525 has on remote help by its manual, and nothing builds it.'),
    45: unknown('Whether the 525 has favourite channels at all is not checked; its manual describes none.', ['reference/remotes/harmony-525/features.md#favourite-channels']),
    46: unknown('Favourites themselves are not known on the 525, so a favourite with an icon is not known either.', ['reference/remotes/harmony-525/features.md#favourite-channels']),
    47: open(FAMILY, 'The manual offers settings such as backlight timing and help, and nothing reads or changes a 525\'s settings.'),
    48: open(FAMILY_MODEL, 'The manual sets backlight timing and nothing composes it for the 525; brightness is not stated.'),
    49: unknown('Motion wakes it from Deep Sleep, and whether that can be switched off is not stated.', ['reference/remotes/harmony-525/hardware.md#light-motion-and-infrared']),
    50: open(FAMILY, 'The manual offers the Remote Assistant switch on the 525, and nothing composes it.'),
    51: open(FAMILY, 'The manual offers Smart or Full help on the 525, and nothing composes it.'),
    52: unknown('Whether the screen shows a clock is not checked, and no read of the running clock is known.', ['reference/remotes/harmony-525/behaviour.md#the-clock']),
    53: unknown('No page says whether the 96 by 64 monochrome 525 could show a slideshow.'),
    54: open(FAMILY, 'The firmware implements the capture, but nothing sends it, and learning on a 525 is not checked.'),
    55: open(FAMILY, 'Nothing puts a learned code into a 525 device.'),
    56: open(FAMILY, 'A learned code is recognised by the Harmony Touch\'s reader; nothing keeps one in a 525 configuration.'),
    59: open(MODEL, 'One block was put back through a script; nothing restores a whole backup to a 525.'),
    61: open(FAMILY, 'Nothing builds an empty configuration for the 525.'),
    65: unknown('No battery reading over USB is known on the 525, and whether one exists is not settled.', ['reference/remotes/harmony-525/hardware.md#power']),
    66: open(FAMILY, 'Read progress is tested only on another model\'s sample, and nothing shows a write on the 525\'s screen.'),
    67: unknown('The scan code\'s address is read in the firmware, but no live memory read of a running 525 is known.', ['reference/remotes/harmony-525/keys.md#fifty-keys-and-every-one-is-bound']),
    69: open(SHARED, 'Safe mode is told apart by the version block measured on the unit, but nothing says whether newer firmware exists.'),
    70: impossible(['reference/remotes/harmony-525/firmware.md#harmony-525-firmware'], 'Logitech publishes no firmware package for the 525, and decision 18 allows the install on the 600, 650 and 700 only.'),
    71: open(FAMILY, 'The unit left safe mode once, by hand, from a lab script; no library function does it.'),
    72: impossible(['reference/remotes/harmony-525/features.md#logitechs-service-has-the-product-switched-off'], 'Logitech\'s service has the 525 switched off and compiles nothing for it.'),
    83: open(SHARED, 'Nothing turns a configuration Logitech\'s software built into a recipe; a setup is entered again.'),
    84: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub, and the FHSDK reaches it over its cable.'),
    85: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub, and the FHSDK sets no network for it.'),
    86: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub; writing a remote of one\'s own is R6.'),
    87: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub and is driven by its keys.'),
    88: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub and finds no smart home devices.'),
    89: open(SHARED_FAMILY, 'Nothing composes a device for a 525, so no command of one can be tuned.'),
    90: open(SHARED_FAMILY, 'Nothing composes an activity for the 525, so no order can be chosen.'),
    91: unknown('Which screen a 525 activity opens on, and whether a configuration could choose another, is not checked.'),
    92: open(SHARED_FAMILY, 'No family serves the 525, so nothing builds one from a recipe or leaves an activity out.'),
    93: open(SHARED_FAMILY, 'No family serves the 525, so no document of one is changed or marked.'),
  },
  // The Harmony 515, on the Harmony 525's platform with an application of its own, 3.4. Its bench unit has only been
  // read, decision 35, so everything that touches a write is open, and what the 525 shows is not assumed.
  'harmony-515': {
    2: open(FAMILY, 'Devices, activities and screens are read in 515 configurations through the 525\'s readers, but no view predicts what each key sends.'),
    3: open(SHARED_FAMILY, 'Nothing turns a compiled configuration back into a recipe, and nothing builds for the 515.'),
    4: open(FAMILY, 'No codec family serves the 515, so nothing builds a configuration for it from a recipe.'),
    5: open(MODEL, 'No write path names the 515; its write end has not been read in its application 3.4.'),
    6: open(SHARED_MODEL, 'The bench unit\'s identity and configuration region are recorded, but no write path takes a 515 or adopts one never seen.'),
    7: open(FAMILY_MODEL, 'Nothing checks a configuration against the 515\'s own limits before a write, and its device limit is the forum table\'s.'),
    8: open(SHARED_FAMILY, 'Nothing compares a 515\'s configuration with the one last written.'),
    10: open(SHARED_FAMILY, 'Nothing composes a catalogue device for the 515.'),
    11: open(FAMILY, 'Nothing composes a learned device for the 515, and learning on it has not been done.'),
    13: open(SHARED_FAMILY, 'Nothing removes a device from a 515 configuration or settles its activities.'),
    14: open(SHARED_FAMILY, 'No part of device power is composed for the 515, since no family serves it.'),
    15: open(SHARED_FAMILY, 'Nothing composes a device\'s inputs for the 515.'),
    16: open(SHARED_FAMILY, 'Nothing sets or resets a device\'s delays for the 515.'),
    17: open(SHARED_FAMILY, 'Nothing composes a repeat count for a 515 device.'),
    18: open(SHARED_FAMILY, 'Nothing composes channel tuning for a 515 device.'),
    19: open(SHARED_FAMILY, 'The toolkit adds a command with its own code to a recipe, gives one a new code and puts the original back, but no build reads a command\'s own code yet, and taking away a command of the definition is not built.'),
    21: open(FAMILY, 'Nothing composes an activity for the 515.'),
    22: open(FAMILY, 'No activity key map from device roles is built for the 515.'),
    23: open(FAMILY, 'No activity input setting is built for the 515.'),
    24: open(FAMILY, 'Nothing builds activities for the 515, so no pass through device either.'),
    26: open(SHARED_FAMILY, 'Nothing removes an activity from a 515 configuration.'),
    27: unknown('No page says whether a 515 activity can carry an icon on its monochrome screen.'),
    28: open(FAMILY, 'Nothing builds the 515\'s activity menu.'),
    29: impossible(['reference/remotes/harmony-515/keys.md#every-key-on-the-drawing'], 'The 515 has the 525\'s face, and none of its keys is an activity key.'),
    30: open(SHARED_FAMILY, 'Nothing builds an activity\'s start or end steps for the 515.'),
    31: open(SHARED_FAMILY, 'Nothing changes an activity key binding in a 515 configuration.'),
    32: open(SHARED_FAMILY, 'Nothing changes a device mode map in a 515 configuration.'),
    33: open(FAMILY, 'No device mode map is composed from the catalogue for the 515.'),
    34: open(FAMILY, 'Nothing composes an activity\'s screen pages for the 515.'),
    35: open(SHARED_FAMILY, 'Nothing composes a device\'s screen pages for the 515.'),
    36: open(SHARED_FAMILY, 'Nothing builds soft key pages for the 515.'),
    37: open(FAMILY, 'Nothing composes a sequence for the 515.'),
    38: unknown('What a held key does on a 515 is not checked.', ['reference/remotes/harmony-515/keys.md#not-checked']),
    39: impossible(['reference/remotes/harmony-515/keys.md#every-key-on-the-drawing'], 'The 515 has the 525\'s face, with no device keys; its Devices key opens a list.'),
    40: unknown('The model table says the 515\'s screen is not a touch screen, which no 515 has been checked against.', ['reference/remotes/harmony-515/display.md#the-panel']),
    41: open(FAMILY, 'No 515 screen was rendered and compared with the unit, and nothing is built to write.'),
    42: open(FAMILY, 'Nothing builds 515 screens, so no typeface, picture or theme can be chosen.'),
    43: open(MODEL, 'The face is drawn, the 525\'s, but no key\'s scan code has been measured on a 515.'),
    44: open(FAMILY, 'Nothing builds the remote\'s help for the 515.'),
    45: unknown('Whether the 515 has favourite channels at all is not checked.'),
    46: unknown('Favourites themselves are not known on the 515, so a favourite with an icon is not known either.'),
    47: open(FAMILY, 'Nothing reads or changes a 515\'s settings.'),
    48: open(FAMILY_MODEL, 'Nothing composes the 515\'s backlight timing; brightness is not known.'),
    49: unknown('Whether the 515 wakes on motion, and whether that can be switched off, is not checked.'),
    50: open(FAMILY, 'Nothing composes the 515\'s Remote Assistant switch.'),
    51: open(FAMILY, 'Nothing composes Smart or Full help for the 515.'),
    52: unknown('Whether the 515 shows a clock is not checked, and no read of its running clock is known.'),
    53: unknown('No page says whether the 96 by 64 monochrome 515 could show a slideshow.'),
    54: open(FAMILY, 'Nothing sends the 515 the learning request, and learning on a 515 is not checked.'),
    55: open(FAMILY, 'Nothing puts a learned code into a 515 device.'),
    56: open(FAMILY, 'Nothing keeps a learned code in a 515 configuration.'),
    59: open(MODEL, 'The configuration region is in the lab, but no write path puts a backup back on a 515.'),
    61: open(FAMILY, 'Nothing builds an empty configuration for the 515.'),
    63: open(MODEL, 'The unit\'s identity is recorded in the lab, but no write rail checks a 515 against its record yet.'),
    65: unknown('No battery reading over USB is known on this platform, and whether one exists is not settled.', ['reference/remotes/harmony-525/hardware.md#power']),
    66: open(FAMILY, 'Read progress is shown, but nothing makes a 515 show it is being written.'),
    67: unknown('No live memory read of a running 515 is known.'),
    69: open(SHARED_MODEL, 'Nothing tells a 515 in safe mode from a running one by its own measurement, and safe mode must not be entered to find out.'),
    70: impossible(['docs/decisions.md#d18'], 'Decision 18 allows the firmware install on the Harmony 600, 650 and 700 alone, so the FHSDK never installs firmware here.'),
    71: open(FAMILY, 'Nothing in the libraries brings a stuck 515 back.'),
    72: unknown('Whether Logitech\'s service still serves the 515\'s skin is not checked.'),
    83: open(SHARED, 'Nothing turns a configuration Logitech\'s software built into a recipe; a setup is entered again.'),
    84: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub, and the FHSDK reaches it over its cable.'),
    85: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub, and the FHSDK sets no network for it.'),
    86: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub; writing a remote of one\'s own is R6.'),
    87: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub and is driven by its keys.'),
    88: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub and finds no smart home devices.'),
    89: open(SHARED_FAMILY, 'Nothing composes a device for a 515, so no command of one can be tuned.'),
    90: open(SHARED_FAMILY, 'Nothing composes an activity for the 515, so no order can be chosen.'),
    91: unknown('Which screen a 515 activity opens on, and whether a configuration could choose another, is not checked.'),
    92: open(SHARED_FAMILY, 'No family serves the 515, so nothing builds one from a recipe or leaves an activity out.'),
    93: open(SHARED_FAMILY, 'No family serves the 515, so no document of one is changed or marked.'),
  },
  // The Harmony 885.
  'harmony-885': {
    2: open(FAMILY, 'Devices, activities, screens and codes are read on the 885, but no view predicts what each key sends there.'),
    3: open(SHARED_FAMILY, 'Nothing turns a compiled 885 configuration back into a recipe.'),
    4: open(FAMILY, 'No build from a recipe serves the 885; a device can only be composed onto an existing configuration.'),
    6: open(SHARED, 'The writer\'s unit list holds only the two bench 885s; nothing records and adopts a remote never seen.'),
    7: open(FAMILY, 'The model check and the queue rail cover the 885; nothing checks a whole configuration\'s 64 state bytes or log area before writing.'),
    8: unknown('The 885 has no settings store, and whether anything a person changes on it reaches its configuration is not known.', ['reference/remotes/harmony-885/memory.md#harmony-885-memory']),
    10: open(SHARED_FAMILY, 'One catalogue device of eight commands was composed and shown; its inputs and a full device are refused.'),
    11: open(FAMILY, 'Nothing learns a code on the 885 or builds a device from taught commands.'),
    13: open(SHARED_FAMILY, 'Nothing removes a device from an 885 configuration, or settles what used it.'),
    14: open(SHARED_FAMILY, 'The catalogue\'s power, long press version included, is composed and heard; none, always on, kept on and extra commands are not.'),
    15: open(SHARED_FAMILY, 'A composed device\'s inputs are refused on the 885.'),
    16: open(SHARED, 'The catalogue\'s delays are composed, but nothing sets or resets them, and the silence was not observed on a unit.'),
    17: open(SHARED, 'A composed device\'s sends go at a fixed quantity of 1; nothing lets it be set.'),
    18: open(SHARED_FAMILY, 'Nothing composes channel entry for an 885 device.'),
    19: open(SHARED_FAMILY, 'The toolkit adds a command with its own code to a recipe, gives one a new code and puts the original back, but no build reads a command\'s own code yet, and taking away a command of the definition is not built.'),
    21: open(FAMILY, 'Activities are not composed for the 885; the family refuses an activity\'s start, menu row and screen.'),
    22: open(FAMILY, 'An activity\'s key map from roles is refused for the 885.'),
    23: open(FAMILY, 'Activities and device inputs are not composed for the 885.'),
    24: open(FAMILY, 'Activities are not composed for the 885, so no pass through device either.'),
    26: open(SHARED_FAMILY, 'Nothing removes an activity from an 885 configuration.'),
    27: open(SHARED_FAMILY, 'Activities are not composed for the 885, so none gets an icon.'),
    28: open(FAMILY, 'The activity menu and an activity\'s device list are not composed for the 885.'),
    29: impossible(['reference/remotes/harmony-885/keys.md#harmony-885-skin-17'], 'The 885\'s 55 keys have one Activities key and no activity keys; activities start from its menu.'),
    30: open(SHARED_FAMILY, 'An activity\'s start is not composed for the 885, so no steps can be added.'),
    31: open(SHARED_FAMILY, 'An activity\'s key map is not composed for the 885.'),
    32: open(SHARED_FAMILY, 'Which command each key takes in an 885 device mode is not read, and nothing changes one.'),
    33: open(FAMILY, 'A full device mode map from the catalogue is refused for the 885; only one labelled screen page is composed.'),
    34: open(FAMILY, 'Activity screens are not composed for the 885.'),
    35: open(SHARED_FAMILY, 'One device page of up to eight commands is composed and was seen; a second page is refused.'),
    36: open(SHARED_FAMILY, 'Nothing builds a sub page button for the 885.'),
    37: open(FAMILY, 'Sequences are not composed for the 885.'),
    38: unknown('The firmware raises a hold event once, but whether it honours a binding of it is not checked.', ['reference/remotes/harmony-885/keys.md#a-press-a-hold-and-a-release']),
    39: impossible(['reference/remotes/harmony-885/keys.md#harmony-885-skin-17'], 'The 885 has one Device key and a device list, and no device keys.'),
    40: impossible(['reference/remotes/harmony-885/display.md#the-panel'], 'The 885\'s screen is not a touch screen, so there are no gestures.'),
    41: open(BENCH, '885 pages render, but no rendered screen was compared with what a unit draws.'),
    42: open(FAMILY, 'The 885\'s fonts and pictures are borrowed from its configuration; nothing of ours chooses its look.'),
    44: open(FAMILY, 'The 885 has on remote help by its manual; none is composed for it.'),
    45: open(FAMILY, 'Unit B\'s own configuration holds favourites, but nothing composes a favourite for the 885.'),
    46: open(FAMILY, 'Nothing composes a favourite, or its icon, for the 885.'),
    47: open(FAMILY, 'The 885\'s settings are neither read nor changed by anything yet.'),
    48: open(FAMILY_MODEL, 'The 885\'s manual offers a backlight timing; nothing sets it, and brightness is not known.'),
    49: open(FAMILY, 'The 885\'s manual offers a tilt sensor switch; nothing sets it.'),
    50: open(FAMILY, 'The 885\'s manual offers both; nothing composes or switches either.'),
    51: open(FAMILY, 'The 885\'s manual offers Smart and Full help; nothing composes help for it.'),
    52: open(FAMILY, 'The stamp sets the clock at the restart and a memory read reads it back; how the clock is shown is not set.'),
    53: open(FAMILY, 'The 885\'s manual offers a slideshow; nothing builds one.'),
    54: open(FAMILY, 'The 885 has a learning sensor; nothing sends it the learning request.'),
    55: open(FAMILY, 'Nothing puts a learned code into an 885 device.'),
    56: open(FAMILY, 'A learned code is recognised by the Harmony Touch\'s reader; nothing keeps one in an 885 configuration.'),
    61: open(FAMILY, 'No empty configuration is built for the 885.'),
    65: unknown('One read takes a hardware measurement, but what it measures is not identified, so a battery level is not known.', ['reference/architectures/harmony-880-885/usb.md#reading-flash']),
    66: open(FAMILY_MODEL, 'Read progress exists, but the 885 showed nothing during a write, and nothing makes it show one.'),
    69: open(SHARED_FAMILY, 'Nothing tells an 885 in its bootloader from a running one, and no list of firmware versions is held.'),
    70: impossible(['docs/decisions.md#d18'], 'Decision 18 allows the firmware install on the Harmony 600, 650 and 700 alone, so the FHSDK never installs firmware here.'),
    71: open(FAMILY, 'Nothing in the libraries brings a stuck 885 back; its recovery has only been read in the firmware.'),
    72: impossible(['reference/remotes/harmony-885/features.md#logitechs-service'], 'Logitech\'s service has the 885\'s skins switched off and refuses its serial, so it serves no 885 account.'),
    83: open(SHARED, 'Nothing turns a configuration Logitech\'s software built into a recipe; a setup is entered again.'),
    84: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub, and the FHSDK reaches it over its cable.'),
    85: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub, and the FHSDK sets no network for it.'),
    86: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub; writing a remote of one\'s own is R6.'),
    87: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub and is driven by its keys.'),
    88: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub and finds no smart home devices.'),
    89: open(SHARED, 'The composer takes explicit blocks per command, and nothing in a recipe reaches them, so no command can be tuned on its own.'),
    90: open(SHARED_FAMILY, 'Activities are not composed for the 885, so no order can be chosen.'),
    91: unknown('Which screen an 885 activity opens on, and whether a configuration could choose another, is not checked.'),
    92: open(SHARED_FAMILY, 'Nothing builds an 885 from a recipe yet, so nothing leaves an activity out of one.'),
    93: open(FAMILY, 'A removal marks the activities that used the device, but names no key: the family states no maps yet, so what its keys do after the removal is not known.'),
  },
  // The Harmony 785, on the Harmony 880 and 885's platform with the Harmony 720's application. Both bench units have
  // only been read, decision 34, so everything that touches a write is open, and what the 885 shows is not assumed.
  'harmony-785': {
    2: open(FAMILY, 'Devices, activities, screens and codes read on the 785 through the 885\'s family, but no view predicts what each key sends there.'),
    3: open(SHARED_FAMILY, 'Nothing turns a compiled 785 configuration back into a recipe.'),
    4: open(FAMILY, 'No build from a recipe serves the 785.'),
    5: open(MODEL, 'No write path names a 785; its write end has not been read in its application 4.5.'),
    6: open(SHARED_MODEL, 'Both bench 785s are recorded with a full backup, but no write path takes a 785 or adopts one never seen.'),
    7: open(FAMILY, 'Nothing checks a configuration against the 785\'s own limits before a write.'),
    8: unknown('Whether anything a person changes on a 785 reaches its configuration is not known.'),
    10: open(SHARED_FAMILY, 'Nothing composes a catalogue device for the 785.'),
    11: open(FAMILY, 'Nothing learns a code on the 785 or builds a device from taught commands.'),
    13: open(SHARED_FAMILY, 'Nothing removes a device from a 785 configuration, or settles what used it.'),
    14: open(SHARED_FAMILY, 'Nothing composes a device\'s power for the 785.'),
    15: open(SHARED_FAMILY, 'Nothing composes a device\'s inputs for the 785.'),
    16: open(SHARED_FAMILY, 'Nothing sets or resets a device\'s delays for the 785.'),
    17: open(SHARED_FAMILY, 'Nothing sets a repeat count for the 785.'),
    18: open(SHARED_FAMILY, 'Nothing composes channel entry for a 785 device.'),
    19: open(SHARED_FAMILY, 'The toolkit adds a command with its own code to a recipe, gives one a new code and puts the original back, but no build reads a command\'s own code yet, and taking away a command of the definition is not built.'),
    21: open(FAMILY, 'Activities are not composed for the 785.'),
    22: open(FAMILY, 'An activity\'s key map is not composed for the 785.'),
    23: open(FAMILY, 'Activities and device inputs are not composed for the 785.'),
    24: open(FAMILY, 'Activities are not composed for the 785, so no pass through device either.'),
    26: open(SHARED_FAMILY, 'Nothing removes an activity from a 785 configuration.'),
    27: open(SHARED_FAMILY, 'Activities are not composed for the 785, so none gets an icon.'),
    28: open(FAMILY, 'The activity menu and an activity\'s device list are not composed for the 785.'),
    29: unknown('The face is drawn, but whether any of the 785\'s keys starts an activity is not read.', ['reference/remotes/harmony-785/keys.md#harmony-785-keys']),
    30: open(SHARED_FAMILY, 'An activity\'s start is not composed for the 785, so no steps can be added.'),
    31: open(SHARED_FAMILY, 'An activity\'s key map is not composed for the 785.'),
    32: open(SHARED_FAMILY, 'Which command each key takes in a 785 device mode is not read, and nothing changes one.'),
    33: open(FAMILY, 'Device mode maps are not composed for the 785.'),
    34: open(FAMILY, 'Activity screens are not composed for the 785.'),
    35: open(SHARED_FAMILY, 'Device screen pages are not composed for the 785.'),
    36: open(SHARED_FAMILY, 'Nothing builds a sub page button for the 785.'),
    37: open(FAMILY, 'Sequences are not composed for the 785.'),
    38: unknown('Whether the 785\'s application honours a binding of a held key is not read.', ['reference/remotes/harmony-785/keys.md#harmony-785-keys']),
    39: unknown('The face is drawn, but whether any of the 785\'s keys picks a device is not read.', ['reference/remotes/harmony-785/keys.md#harmony-785-keys']),
    40: unknown('The model table says the 785\'s screen is not a touch screen, which no 785 has been checked against.', ['reference/remotes/harmony-785/display.md#the-panel']),
    41: open(FAMILY, 'No 785 screen was rendered and compared with what a unit draws.'),
    42: open(FAMILY, 'Nothing of ours chooses the look of a 785\'s screens.'),
    43: open(MODEL, 'The 785\'s face is drawn with 53 keys, but no key\'s scan code has been measured on a 785.'),
    44: open(FAMILY, 'Nothing composes the remote\'s help for the 785.'),
    45: open(FAMILY, 'The bench units\' configurations hold favourites, but nothing composes a favourite for the 785.'),
    46: open(FAMILY, 'Nothing composes a favourite, or its icon, for the 785.'),
    47: open(FAMILY, 'The 785\'s settings are neither read nor changed by anything yet.'),
    48: open(FAMILY, 'Nothing sets the 785\'s backlight timing or brightness.'),
    49: open(FAMILY, 'Nothing sets the 785\'s tilt sensing.'),
    50: open(FAMILY, 'Nothing composes or switches the 785\'s assistants.'),
    51: open(FAMILY, 'Nothing composes help for the 785, so neither Smart nor Full can be chosen.'),
    52: open(FAMILY_MODEL, 'The 785\'s clock has not been read, and nothing sets how it is shown.'),
    53: open(FAMILY, 'Nothing builds a slideshow for the 785.'),
    54: open(FAMILY, 'Nothing sends the 785 the learning request.'),
    55: open(FAMILY, 'Nothing puts a learned code into a 785 device.'),
    56: open(FAMILY, 'Nothing keeps a learned code in a 785 configuration.'),
    59: open(MODEL, 'Both units\' whole flash is in the lab, but no write path puts a backup back on a 785.'),
    61: open(FAMILY, 'No empty configuration is built for the 785.'),
    63: open(MODEL, 'The two units\' identity blocks are recorded and differ, but no write rail checks a 785 against its record yet.'),
    64: open(MODEL, 'The version block was read on both units, but no test holds what a 785 reports.'),
    65: unknown('One read takes a hardware measurement on the 885, but what it measures is not identified, and it was not read on a 785.', ['reference/architectures/harmony-880-885/usb.md#reading-flash']),
    66: open(FAMILY, 'Read progress is shown, but nothing makes a 785 show it is being written.'),
    67: open(BENCH, 'The key page reads the held key on the 885; it has not been tried on a 785.'),
    69: open(SHARED_FAMILY, 'Nothing tells a 785 in its bootloader from a running one, and the two units carry different bootloader builds.'),
    70: impossible(['docs/decisions.md#d18'], 'Decision 18 allows the firmware install on the Harmony 600, 650 and 700 alone, so the FHSDK never installs firmware here.'),
    71: open(FAMILY, 'Nothing in the libraries brings a stuck 785 back.'),
    72: unknown('Whether Logitech\'s service still serves the 785\'s skin is not checked.'),
    83: open(SHARED, 'Nothing turns a configuration Logitech\'s software built into a recipe; a setup is entered again.'),
    84: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub, and the FHSDK reaches it over its cable.'),
    85: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub, and the FHSDK sets no network for it.'),
    86: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub; writing a remote of one\'s own is R6.'),
    87: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub and is driven by its keys.'),
    88: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub and finds no smart home devices.'),
    89: open(SHARED_FAMILY, 'Nothing composes a device for the 785, so no command of one can be tuned.'),
    90: open(SHARED_FAMILY, 'Activities are not composed for the 785, so no order can be chosen.'),
    91: unknown('Which screen a 785 activity opens on, and whether a configuration could choose another, is not checked.'),
    92: open(SHARED_FAMILY, 'Nothing builds a 785 from a recipe yet, so nothing leaves an activity out of one.'),
    93: open(FAMILY, 'A removal marks the activities that used the device, but names no key: the family states no maps yet, so what its keys do after the removal is not known.'),
  },
  // The Harmony 300.
  'harmony-300': {
    1: open(FAMILY, 'The file was read off the unit twice, identical, but no library read restores the end marker and checks the trailer.'),
    2: open(FAMILY, 'Devices and power on delays are read from 300 files, but no library reader says what each key sends.'),
    3: open(SHARED, 'Nothing reads a configuration of this family back into a recipe.'),
    4: open(FAMILY, 'The 350\'s build ran on the 300 and every expected code was heard, but a recipe naming the 300 is refused once it holds a television or a long press, so the 300\'s own recipe does not build whole.'),
    6: open(SHARED, 'The writer serves only the two bench units on its own list; a remote never seen cannot be recorded and written.'),
    8: unknown('Whether a Harmony 300 ever changes its own configuration is not known; it has no help to fix delays.'),
    10: open(SHARED, 'Catalogue devices with power and inputs were built and heard on the unit, but no code set version can be chosen.'),
    11: unknown('Whether the 300 can learn is not known, and nothing composes a learned device for this family.'),
    13: open(SHARED, 'Removing a device is tested on Logitech\'s compiles only, never run on a 300, and favourites using it are not settled.'),
    14: open(SHARED, 'Power comes from the catalogue; one or two keys, none, always on, extra commands and a held power code cannot be set.'),
    15: open(SHARED_FAMILY, 'Inputs come from the catalogue only; how a device changes input cannot be set, and a stepping input is refused.'),
    16: open(SHARED, 'The power on delay was set and heard on the unit, but no other delay is settable and nothing restores defaults.'),
    17: open(SHARED, 'Nothing sets how many times a device\'s commands repeat.'),
    18: open(SHARED, 'Channel digits and the tuning finish follow the catalogue; how a device tunes a number cannot be chosen.'),
    19: open(SHARED, 'The toolkit adds a command with its own code to a recipe, gives one a new code and puts the original back, but no build reads a command\'s own code yet, and taking away a command of the definition is not built.'),
    21: open(FAMILY, 'Watch TV ran on the 300 from a recipe naming the Harmony 350; a recipe naming the 300 that holds a television is refused.'),
    22: open(FAMILY, 'Only the channel changing role picks the map Watch TV ends in; other roles map no keys and learned commands are not handled.'),
    23: open(FAMILY, 'The inputs were heard on the 300 from a recipe naming the Harmony 350; a recipe naming the 300 that holds a television is refused.'),
    24: open(FAMILY, 'A device with no role in an activity is neither tested nor run on a 300.'),
    26: open(SHARED, 'A configuration with no activity builds, but none was written to a 300.'),
    27: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'The 300 has no screen, so an activity icon has nowhere to show.'),
    28: impossible(['reference/how-a-harmony-works.md#a-remote-with-no-screen-holds-exactly-one-activity'], 'With no screen and one activity there is no activity menu or device list to order.'),
    29: impossible(['reference/how-a-harmony-works.md#a-remote-with-no-screen-holds-exactly-one-activity'], 'The 300 holds one activity, started by its Watch TV key, so there is nothing to choose.'),
    30: open(SHARED, 'The activity composer takes devices and a channel device only; it adds no extra start or end steps.'),
    31: open(SHARED, 'Watch TV ends in the channel device\'s map; nothing gives the activity a key map of its own.'),
    32: open(SHARED, 'A device mode remap ran on the unit, made by a lab script; no library function changes one key\'s binding.'),
    33: open(FAMILY, 'Maps follow the 350\'s key table; Logitech binds Teletext to a key on the 300, and no 300 map was checked whole.'),
    34: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'The 300 has no screen.'),
    35: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'The 300 has no screen, so device mode has no screen pages.'),
    36: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'The 300 has no screen to hold a button or a page.'),
    37: open(FAMILY, 'Nothing composes a named sequence for this family, though its lists can send and wait.'),
    38: open(FAMILY, 'A held key only selects a second device on the device keys; no other key gets a held command.'),
    39: open(FAMILY, 'The device keys selected a device short and another long on the 300 from a recipe naming the Harmony 350; a recipe naming the 300 is refused once it holds a long press.'),
    40: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'The 300 has no screen and so no touch gestures.'),
    41: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'The 300 has no screen to draw.'),
    42: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'The 300 has no screen, so there is no look to choose.'),
    43: open(MODEL, 'The European drawing ties 49 of 55 keys on the unit; six keys and the whole US printing are not measured.'),
    44: impossible(['reference/remotes/harmony-300/keys.md#european-printing-skin-79'], 'The 300 has no Help key and no screen, so the remote\'s help cannot run.'),
    45: open(FAMILY, 'The composer refuses the 300\'s favourite order; a 350 build sent one channel from the European Teletext key.'),
    46: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'The 300 has no screen to show a favourite\'s icon.'),
    47: unknown('Logitech lists no settings for the 300, and whether the remote has any is not checked.'),
    48: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'The 300 has no screen to light or dim.'),
    49: unknown('Whether the 300 has a motion sensor is not stated anywhere.'),
    50: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'Both are screen messages, and the 300 has no screen.'),
    51: impossible(['reference/remotes/harmony-300/keys.md#european-printing-skin-79'], 'The 300 has no Help key and no screen, so there is no kind of help to pick.'),
    52: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'Nothing on a 300 can show a clock, and its firmware never moves the hour.'),
    53: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'The 300 has no screen for pictures.'),
    54: unknown('Whether the 300 learns is not checked; its file table names an infrared capture stream that was never opened.'),
    55: open(FAMILY, 'Nothing puts a learned code into a configuration of this family.'),
    56: open(FAMILY, 'A learned code is recognised by the Harmony Touch\'s reader; nothing keeps one in a 300 configuration.'),
    61: open(BENCH, 'The empty configuration builds for the 300 and passes the writer\'s check, but was never written to a 300.'),
    63: open(BENCH, 'Units are told apart by their identity file and the unit matched its record, but a wrong unit was refused only on a fake.'),
    65: unknown('A battery file is in the family\'s file table but was never read, so whether it holds a level is not known.'),
    66: open(FAMILY_MODEL, 'Neither the read nor the write reports progress, and whether the keys light while writing is not checked.'),
    67: unknown('No way to watch key presses live over this family\'s file protocol is known.'),
    69: open(SHARED_FAMILY, 'Nothing reports safe mode or the bootloader for this family, nor whether newer firmware exists.'),
    70: impossible(['docs/decisions.md#d18'], 'Decision 18 allows the firmware install on the Harmony 600, 650 and 700 alone, so the FHSDK never installs firmware here.'),
    71: open(FAMILY_MODEL, 'A battery pull recovered the unit; nothing recovers a stuck 300, whose safe mode image is a different, unread build.'),
    72: open(SHARED, 'Logitech\'s service still compiles for the 300, but the client is bound to test accounts and on no public entry.'),
    83: open(SHARED, 'Nothing turns a configuration Logitech\'s software built into a recipe; a setup is entered again.'),
    84: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub, and the FHSDK reaches it over its cable.'),
    85: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub, and the FHSDK sets no network for it.'),
    86: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub; writing a remote of one\'s own is R6.'),
    87: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub and is driven by its keys.'),
    88: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub and finds no smart home devices.'),
    89: open(SHARED, 'The composer takes explicit blocks per command, and nothing in a recipe reaches them, so no command can be tuned on its own.'),
    90: open(SHARED_FAMILY, 'Nothing lets a person choose the order the activity switches its devices on and off in.'),
    91: impossible(['reference/remotes/harmony-300/display.md#harmony-300-display'], 'The 300 has no screen, so an activity opens on none.'),
    92: open(BENCH, 'A build from a recipe leaves a switched off activity out, the same configuration as one without it, but no such build has been sent to the 300.'),
    93: open(FAMILY, 'A removal marks the activity that used the device, but names no key: the family states no maps yet, so what its keys do after the removal is not known.'),
  },
  // The Harmony 350.
  'harmony-350': {
    2: open(FAMILY, 'The public readers name devices and read 13 of 14 delays; Watch TV and what each key sends are read only through internals.'),
    3: open(SHARED, 'Nothing reads a 350 configuration back into a recipe, and no record of ours is carried inside.'),
    6: open(SHARED, 'The writer\'s unit list holds the bench units only; a remote never seen cannot be recorded and written.'),
    8: open(SHARED, 'The writer refuses a file it did not write, shown on the unit; keeping or discarding that change is not offered.'),
    10: open(SHARED, 'Catalogue devices compose and were heard on the unit; choosing among a device\'s code set versions is not offered.'),
    11: open(FAMILY, 'Nothing builds a device from commands taught from its original remote on this family.'),
    13: open(SHARED, 'Removal refuses devices that Watch TV or favourites use, and nothing settles them; no removal ran on the unit alone.'),
    14: open(SHARED, 'Toggle and separate on and off codes were heard; no power, always on, extra power steps and a held power code are not offered.'),
    15: open(SHARED_FAMILY, 'Direct inputs work; an input that steps or mixes codes and states is refused.'),
    16: open(SHARED, 'The power on delay was changed and heard on the unit; other delays and a return to defaults are not offered.'),
    17: open(SHARED, 'The repeat count follows the catalogue and cannot be set; nothing about it was checked on a remote.'),
    18: open(SHARED, 'Channel tuning comes from the catalogue entry as it is; nothing lets it be set.'),
    19: open(SHARED, 'The toolkit adds a command with its own code to a recipe, gives one a new code and puts the original back, but no build reads a command\'s own code yet, and taking away a command of the definition is not built.'),
    22: open(FAMILY, 'Roles choose Watch TV\'s final device map and volume source; a learned command landing on its usual key is not offered.'),
    24: open(FAMILY, 'No test or run includes a device with no role in Watch TV.'),
    26: open(SHARED_FAMILY, 'A setup with devices and no Watch TV was never built in a test or run on the unit.'),
    27: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'The 350 has no screen to show an icon on.'),
    28: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'With one activity and no screen there is no activity menu or device list to order.'),
    29: impossible(['reference/how-a-harmony-works.md#a-remote-with-no-screen-holds-exactly-one-activity'], 'The 350 holds one activity, always started by its Watch TV key.'),
    30: open(SHARED, 'Watch TV\'s steps are the devices\' power and inputs only; extra commands, pauses or a sequence are not offered.'),
    31: open(SHARED, 'Watch TV ends in one device\'s map and the recipe cannot change what a key does there.'),
    32: open(SHARED, 'A device\'s map comes from the family\'s table and the recipe cannot override a key.'),
    33: open(FAMILY, 'Device maps match Logitech\'s and were heard, except Replay and Advance on the set top box.'),
    34: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'The 350 has no screen.'),
    35: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'The 350 has no screen.'),
    36: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'The 350 has no screen.'),
    37: open(FAMILY_MODEL, 'Nothing composes a named sequence for this family; the limits it would survive were not measured.'),
    38: open(FAMILY, 'Only device keys get a long press, choosing a second device; a held command on any other key is not offered.'),
    40: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'The 350 has no screen, so no touch gestures.'),
    41: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'The 350 has no screen to draw.'),
    42: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'The 350 has no screen.'),
    43: open(MODEL, 'The face is drawn and 53 of 55 keys carry a scan code; DVR and Live are not tied to one.'),
    44: impossible(['reference/remotes/harmony-350/keys.md#every-key-on-the-drawing'], 'The 350 has no Help key and no screen to ask its questions on.'),
    45: open(FAMILY, 'Five channels kept as text were heard in order; removing one was never tested, and names cannot show.'),
    46: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'The 350 has no screen to show a favourite\'s icon.'),
    47: unknown('Logitech lists no settings for the 350; whether its firmware holds any a person would change is not known.', ['reference/remotes/harmony-350/features.md#what-logitechs-service-states']),
    48: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'The 350 has no screen to light.'),
    49: unknown('No page says whether the 350 has a motion sensor.', ['reference/remotes/harmony-350/hardware.md#not-checked']),
    50: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'The 350 has no screen to show the message on.'),
    51: impossible(['reference/remotes/harmony-350/keys.md#every-key-on-the-drawing'], 'The 350 has no Help key and no screen, so there is no kind of help to choose.'),
    52: unknown('Its clock never moves the hour or date and nothing shows it; whether it can be set or read back is not known.', ['reference/architectures/harmony-300-350/memory.md#the-state-variables']),
    53: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'The 350 has no screen.'),
    54: unknown('Whether the 350 has a learning receiver is not checked, though its firmware names an infrared capture file.', ['reference/remotes/harmony-350/hardware.md#not-checked']),
    55: open(FAMILY, 'Nothing puts a learned code into a device of this family.'),
    56: open(FAMILY, 'A learned code is recognised by the Harmony Touch\'s reader; nothing keeps one in a 350 configuration.'),
    62: open(MODEL, 'Enumeration finds it unopened and reads skin 104, but no model record names skin 104 a Harmony 350.'),
    64: open(MODEL, 'The identity text is read and parsed, but no firmware version beyond the product string\'s has been read off the unit.'),
    65: unknown('The battery file was never read, so whether the 350 reports a level is not known.', ['reference/remotes/harmony-350/usb.md#not-checked']),
    66: open(MODEL, 'The writer reports each chunk as it goes; what the remote shows while written is not recorded or offered.'),
    67: unknown('No way to read a key press off a connected 350 is known; its log stays erased.'),
    69: open(SHARED_FAMILY, 'Safe mode shows in the product string and identity file, but nothing reports the state or a newer version.'),
    70: impossible(['docs/decisions.md#d18'], 'Decision 18 allows the firmware install on the Harmony 600, 650 and 700 alone, so the FHSDK never installs firmware here.'),
    71: open(FAMILY, 'A failed write was recovered by writing again on the unit; recovering through safe mode is not offered.'),
    72: open(SHARED, 'Logitech\'s service serves the 350, but the service client is not on any public entry.'),
    83: open(SHARED, 'Nothing turns a configuration Logitech\'s software built into a recipe; a setup is entered again.'),
    84: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub, and the FHSDK reaches it over its cable.'),
    85: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub, and the FHSDK sets no network for it.'),
    86: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub; writing a remote of one\'s own is R6.'),
    87: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub and is driven by its keys.'),
    88: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub and finds no smart home devices.'),
    89: open(SHARED, 'The composer takes explicit blocks per command, and nothing in a recipe reaches them, so no command can be tuned on its own.'),
    90: open(SHARED_FAMILY, 'Nothing lets a person choose the order the activity switches its devices on and off in.'),
    91: impossible(['reference/remotes/harmony-350/display.md#harmony-350-display'], 'The 350 has no screen, so an activity opens on none.'),
    92: open(BENCH, 'A build from a recipe leaves its activity out when switched off, the same configuration as one without it, but no such build has been sent to the 350.'),
    93: open(FAMILY, 'A removal marks the activity that used the device, but names no key: the family states no maps yet, so what its keys do after the removal is not known.'),
  },
  // The Harmony Touch.
  'harmony-touch': {
    1: open(MODEL, 'No route reads the Touch\'s stored documents back; the firmware\'s put and request route is read but has never been sent.'),
    5: open(FAMILY, 'answerTouchSync delivers and the remote commits and runs it, but no library step verifies afterwards; the hash check is a script\'s.'),
    6: open(SHARED, 'The answerer syncs only the one bench unit named in its own list; a stranger\'s Touch cannot be recorded and written.'),
    7: open(FAMILY, 'The gate refuses sets the remote would mishandle and names each, but nothing refuses more than the 15 devices Logitech states.'),
    8: open(SHARED, 'The hand over keeps what the remote hands up and stops on a clash, but offers no keep or discard choice.'),
    10: open(SHARED, 'Devices are built from catalogue entries and heard, but the builder takes the entry\'s one code set and offers no version choice.'),
    11: open(BENCH, 'A learned code becomes a definition in tests, but no device of taught commands has been composed and sent on the unit.'),
    14: open(SHARED, 'Kept on and a held power code compose, but always on, no power, one or two keys and extra power commands are not set or shown.'),
    15: open(SHARED, 'A device\'s inputs and how it changes them come only from its catalogue entry; nothing lets them be set.'),
    16: open(BENCH, 'Delays a setup states are composed and their pauses heard in band, but putting them back to defaults is not shown.'),
    17: open(MODEL, 'A repeat count is composed, but six taps sent four or five frames where three were predicted, unexplained.'),
    18: open(BENCH, 'A channel tuning setting composes, but no composed tuning was heard; the favourites heard ran on Logitech\'s carried tuning.'),
    19: open(SHARED, 'The toolkit adds a command with its own code to a recipe, gives one a new code and puts the original back, but no build reads a command\'s own code yet, and taking away a command of the definition is not built.'),
    22: open(SHARED, 'An activity\'s keys are mapped from its devices\' roles and their default maps and read back from the documents built, but a learned command lands on no key until a build reads a command\'s own code, R19, and no activity mapped that way has been sent to the unit.'),
    27: open(FAMILY, 'The composer writes an activity with no picture of its own, so it shows its type\'s default picture.'),
    28: open(BENCH, 'Places are composed and renumbered after a removal, but reordering the activity list or an activity\'s devices was never shown.'),
    29: impossible(['reference/remotes/harmony-touch/keys.md#every-key-on-the-drawing'], 'The Touch has no activity keys; its 27 keypad keys and two touch zones include none.'),
    32: open(BENCH, 'A device\'s own keys are composed and heard, and a key of its map given another device\'s command is built and read back from the documents, but no device map binding another device\'s command has been sent to the unit.'),
    33: open(FAMILY, 'keysByName binds keys by exact command name only; nothing lays out a device mode map and screen as Logitech\'s software would.'),
    36: unknown('Whether a Touch screen entry can open a page of the user\'s own commands and come back is not known.'),
    39: impossible(['reference/remotes/harmony-touch/keys.md#every-key-on-the-drawing'], 'The Touch has no device keys; its keys and touch zones list none.'),
    40: open(BENCH, 'Gestures are composed in a whole setup, but no gesture has been performed on the unit and heard.'),
    41: open(FAMILY, 'Nothing renders the Touch\'s screens; the remote draws them from the documents.'),
    42: open(FAMILY, 'Only our background picture is drawn and shown; typeface, inks, icons and theme are not offered.'),
    44: open(FAMILY, 'The Touch has help on its screen, but nothing builds or checks it for activities of ours.'),
    45: open(FAMILY, 'Adding and reordering were shown, but no favourite can be removed or named by the composer.'),
    47: open(FAMILY, 'Two settings were changed on the unit and a document takes its family\'s defaults; reading settings off the unit, the vibration and the tutorial are not done.'),
    49: unknown('Whether a Touch carries the accelerometer is not checked, and the bench unit\'s settings offer no tilt entry.'),
    50: unknown('Whether a Touch has a Remote Assistant or a Starting Activity message to switch is not known.'),
    51: unknown('An activity field marks guided or manual help, but whether that is Smart or Full help is not known.'),
    52: open(FAMILY, 'The remote keeps time from every sync, but the answerer sends no clock write and the 12 or 24 hour form is untried.'),
    53: unknown('Whether a Touch offers a slideshow of the user\'s pictures is not known.'),
    54: open(FAMILY, 'The Touch learns through its infrared window by the manual, but nothing here sends a learning request to it.'),
    55: open(BENCH, 'A learned code composes into a device in tests, but none has been sent from the unit.'),
    58: open(MODEL, 'The stored documents cannot be read off the remote, so a backup comes only from a recorded Logitech sync.'),
    62: open(MODEL, 'A Touch is listed as file based without being claimed, but its model is not named: skin 99 has no record.'),
    63: open(BENCH, 'The unit is recorded and matched on the cable, but refusing a wrong unit is shown only in tests.'),
    65: open(SHARED_FAMILY, 'The firmware names battery charge readings, but nothing reads them and no write warns on a low battery.'),
    66: open(FAMILY_MODEL, 'The answerer logs each request list but gives no progress measure, and what the remote shows meanwhile is not recorded.'),
    67: unknown('Whether a Touch can report key presses live over USB is not known; it is never opened that way.'),
    69: open(SHARED_FAMILY, 'The firmware version is read, but its running or recovery state and whether a newer version exists are not.'),
    70: impossible(['docs/decisions.md#d18'], 'Decision 18 allows the firmware install on the Harmony 600, 650 and 700 alone, so the FHSDK never installs firmware here.'),
    72: open(SHARED, 'Logitech\'s service serves the Touch, but the service client is on no public entry, so no import is offered.'),
    83: open(SHARED, 'Nothing turns the documents of a setup made with Logitech\'s software into a recipe; a setup is entered again.'),
    84: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub, and the FHSDK reaches it over its cable.'),
    85: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub, and the FHSDK sets no network for it.'),
    86: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub; writing a remote of one\'s own is R6.'),
    87: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub and is driven by its keys.'),
    88: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: this model is not a hub and finds no smart home devices.'),
    89: open(SHARED_MODEL, 'A command has no timing field in the documents, and how the remote plays a held code has not been read, so nothing tunes one command.'),
    90: open(BENCH, 'A recipe\'s power order for an activity is set by the toolkit and read by the Touch\'s build into the documents, but no document built from one has been sent to the unit.'),
    91: open(BENCH, 'A recipe\'s opening screen for an activity is set by the toolkit, held to the three screens the build takes, and read by the build into the documents, but no document built from one has been sent to the unit.'),
    92: open(BENCH, 'A build leaves a switched off activity out of the documents, the same documents as without it, and a sync to a pretend Touch says which, but no such set has been sent to the unit.'),
  },
  // The Harmony Elite, the remote of the set: skin 111, on the Harmony Touch's image, provisioned from its hub. Nothing
  // is written to it, decision 36, and no family builds for it, so nothing here is proven but what a test proves for
  // every model; what is written is what its two reads, the platform's reference and its test notes leave open.
  'harmony-elite': {
    1: open(MODEL, 'Its identity file and the two reads its request channel allows were answered; the stored set is its hub\'s and is not read off either.'),
    2: open(MODEL, 'No setup of an Elite has been read; the reader of the Touch\'s documents is the same kind and is untried on one.'),
    3: open(SHARED_FAMILY, 'Nothing reads a setup back into a recipe on this generation.'),
    4: open(FAMILY, 'No family builds for skin 111; the Touch\'s document family builds the same kind of documents and is not offered for it.'),
    5: open(MODEL, 'Nothing is written to the bench set, decision 36, and a hub paired remote takes its setup from its hub rather than over its cable.'),
    6: open(SHARED_MODEL, 'No write path names an Elite, the bench\'s or a stranger\'s.'),
    7: open(FAMILY_MODEL, 'Nothing knows an Elite\'s limits, so nothing refuses a setup that does not fit one.'),
    8: open(SHARED_MODEL, 'Nothing compares what an Elite holds with what was last written, since nothing is written.'),
    10: open(SHARED_FAMILY, 'Nothing composes a device for an Elite; its devices are documents its hub holds.'),
    11: open(FAMILY, 'Nothing composes a device of taught commands for an Elite.'),
    13: open(SHARED_FAMILY, 'Nothing removes a device from an Elite\'s setup.'),
    14: open(SHARED_FAMILY, 'Nothing sets how a device is powered in an Elite\'s setup.'),
    15: open(SHARED_FAMILY, 'Nothing sets a device\'s inputs in an Elite\'s setup.'),
    16: open(SHARED_FAMILY, 'Nothing sets a device\'s delays in an Elite\'s setup.'),
    17: open(SHARED_FAMILY, 'Nothing sets how often a device\'s commands repeat in an Elite\'s setup.'),
    18: open(SHARED_FAMILY, 'Nothing sets how a device tunes a channel in an Elite\'s setup.'),
    19: open(SHARED_FAMILY, 'The toolkit adds a command with its own code to a recipe, gives one a new code and puts the original back, but no build reads a command\'s own code yet, and taking away a command of the definition is not built.'),
    21: open(FAMILY, 'Nothing composes an activity for an Elite, and none of ours has run on one.'),
    22: open(FAMILY_MODEL, 'Nothing maps an activity\'s keys from its devices\' roles, and the Elite\'s keys are not read.'),
    23: open(FAMILY, 'Nothing sets a device\'s input in an activity of an Elite\'s setup.'),
    24: open(FAMILY, 'Nothing includes a pass through device in an activity of an Elite\'s setup.'),
    26: open(SHARED_FAMILY, 'Nothing removes an activity from an Elite\'s setup.'),
    27: open(SHARED_FAMILY, 'Nothing gives an activity of an Elite\'s setup an icon.'),
    28: open(FAMILY, 'Nothing orders the activities or an activity\'s devices in an Elite\'s setup.'),
    29: unknown('The Elite\'s keys are not read, so whether it has activity keys to choose activities for is not known here.'),
    30: open(SHARED_FAMILY, 'Nothing adds steps to an activity\'s start or end in an Elite\'s setup.'),
    31: open(SHARED_FAMILY, 'Nothing changes what a key does in an activity on an Elite; its keys are not read.'),
    32: open(SHARED_FAMILY, 'Nothing changes what a key does in device mode on an Elite; its keys are not read.'),
    33: open(FAMILY, 'Nothing lays out a device mode map for an Elite.'),
    34: open(FAMILY, 'Nothing puts commands on an activity\'s screen in an Elite\'s setup.'),
    35: open(SHARED_FAMILY, 'Nothing puts commands on a device\'s screen pages in an Elite\'s setup.'),
    36: unknown('Whether a screen entry on this generation can open a page of the user\'s own commands and come back is not known.'),
    37: open(FAMILY, 'Nothing composes a sequence for an Elite.'),
    38: open(FAMILY, 'Logitech\'s records give skin 111 a long press, but nothing composes a held command for an Elite.'),
    39: unknown('The Elite\'s keys are not read, so whether it has device keys is not known here.'),
    40: open(FAMILY, 'Nothing composes touch gestures for an Elite, and none has been performed on one.'),
    41: open(FAMILY, 'Nothing renders this generation\'s screens; the remote draws them from the documents.'),
    42: open(FAMILY, 'Nothing chooses the look of an Elite\'s screens.'),
    43: open(MODEL, 'No drawing of the Elite\'s face exists, and its keys are not read.'),
    44: open(FAMILY, 'Nothing builds or checks the remote\'s own help for an Elite.'),
    45: open(FAMILY, 'Nothing composes favourite channels for an Elite.'),
    46: open(FAMILY, 'Nothing composes a favourite with an icon for an Elite.'),
    47: open(FAMILY, 'Nothing reads or changes an Elite\'s settings.'),
    48: open(FAMILY, 'Nothing sets how long an Elite\'s screen stays lit or its brightness.'),
    49: unknown('The generation\'s remotes carry an accelerometer by their native program; whether an Elite\'s settings switch it is not known.', ['reference/architectures/harmony-touch/remote-and-hub.md#the-remotes-own-hardware']),
    50: unknown('Whether an Elite has a Remote Assistant or a Starting Activity message to switch is not known.'),
    51: unknown('Whether an Elite offers Smart and Full help is not known.'),
    52: open(MODEL, 'A hub paired remote asks its hub for the time; nothing here reads or sets either clock.'),
    53: unknown('Whether an Elite offers a slideshow of the user\'s pictures is not known.'),
    54: unknown('Whether an Elite learns a code through a window of its own or through its hub is not read, and nothing sends a learning request.'),
    55: open(FAMILY, 'A learned code composes into a device in tests on other models; nothing composes one for an Elite.'),
    56: open(FAMILY, 'A captured code is recognised by the library, but no test does so for this model.'),
    58: open(MODEL, 'The set an Elite shows is stored on its hub, and nothing reads it off either, so there is no backup.'),
    59: open(MODEL, 'There is no backup of an Elite to put back, and nothing is written to the bench set.'),
    61: open(FAMILY, 'Nothing clears an Elite\'s setup; nothing is written to the bench set.'),
    62: open(MODEL, 'An Elite enumerates under the Harmony Touch\'s product number and is listed as file based without being claimed; nothing names it apart from a Touch short of reading its identity file.'),
    63: open(BENCH, 'The unit is recorded by the serial its identity file states and checked before its two reads; refusing a wrong unit is not shown on one.'),
    64: open(MODEL, 'The identity file was read on the unit, firmware 4.15.330 and skin 111, but no test proves the read for this model.'),
    65: open(SHARED_FAMILY, 'The firmware names battery charge readings, but nothing reads them.'),
    66: open(MODEL, 'Nothing is read or written at length on an Elite, so nothing reports progress.'),
    67: unknown('Whether a remote of this generation can report key presses live over USB is not known; it is never opened that way.'),
    69: open(SHARED_FAMILY, 'The firmware version is read, but its running or recovery state and whether a newer version exists are not.'),
    70: impossible(['docs/decisions.md#d18'], 'Decision 18 allows the firmware install on the Harmony 600, 650 and 700 alone, so the FHSDK never installs firmware here.'),
    71: open(MODEL, 'The recovery requests are refused to an Elite by its rail, and nothing else brings one back.'),
    72: open(SHARED_MODEL, 'The service client is on no public entry, so no import is offered; whether Logitech\'s service still sets an Elite up is not checked.'),
    83: open(SHARED, 'Nothing turns the documents of a setup made with Logitech\'s software into a recipe; a setup is entered again.'),
    84: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: the Elite is its hub\'s remote, not a hub, and reaches the network through it.'),
    85: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: the Elite is its hub\'s remote, and the FHSDK sets no network for it.'),
    86: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: the Elite is its hub\'s remote and takes its setup from the hub it is paired to.'),
    87: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: the Elite is its hub\'s remote and is driven by its keys.'),
    88: impossible(['docs/decisions.md#d40'], 'A hub\'s own ability by decision 40: the Elite shows the smart home devices its hub found and finds none itself.'),
    89: open(SHARED_FAMILY, 'No library step tunes one command of a device in an Elite\'s setup.'),
    90: open(SHARED_FAMILY, 'Nothing composes an activity for an Elite, so no order can be chosen.'),
    91: open(SHARED_FAMILY, 'Nothing composes an activity for an Elite, so no start screen can be chosen.'),
    92: open(SHARED_FAMILY, 'Nothing composes an Elite\'s setup, so nothing leaves an activity out of one.'),
    93: open(SHARED_FAMILY, 'No family serves the Elite, so no document of one is changed or marked.'),
  },
  // The Harmony Hub, skin 106: a remote without keys or a screen, reached over the cable for its identity file alone so
  // far. Its request channel is closed, decision 36, and its setup is to be read over the network, plan 016. What its
  // image says it can do is in the platform's hub pages; nothing is proven on the unit, only what a test proves for
  // every model.
  'harmony-hub': {
    1: open(MODEL, 'Only its identity file is read; its setup is to be read over the local network, which is planned and not built, and its request channel is closed by decision 36.'),
    2: open(MODEL, 'A hub\'s setup is the same kind of documents the Harmony Touch is given, by its image; none has been read off a hub.'),
    3: open(SHARED_FAMILY, 'Nothing reads a setup back into a recipe on this generation.'),
    4: open(FAMILY, 'No family builds for a hub; the Touch\'s document family builds the same kind of documents and is not offered for it.'),
    5: open(MODEL, 'Nothing is written to the bench hub, decision 36, and no write path names one.'),
    6: open(SHARED_MODEL, 'No write path names a hub, the bench\'s or a stranger\'s.'),
    7: open(FAMILY_MODEL, 'Nothing knows a hub\'s limits, so nothing refuses a setup that does not fit one.'),
    8: open(SHARED_MODEL, 'Nothing compares what a hub holds with what was last written, since nothing is written.'),
    10: open(SHARED_FAMILY, 'Nothing composes a device for a hub.'),
    11: open(FAMILY, 'Nothing composes a device of taught commands for a hub.'),
    13: open(SHARED_FAMILY, 'Nothing removes a device from a hub\'s setup.'),
    14: open(SHARED_FAMILY, 'Nothing sets how a device is powered in a hub\'s setup.'),
    15: open(SHARED_FAMILY, 'Nothing sets a device\'s inputs in a hub\'s setup.'),
    16: open(SHARED_FAMILY, 'Nothing sets a device\'s delays in a hub\'s setup.'),
    17: open(SHARED_FAMILY, 'Nothing sets how often a device\'s commands repeat in a hub\'s setup.'),
    18: open(SHARED_FAMILY, 'Nothing sets how a device tunes a channel in a hub\'s setup.'),
    19: open(SHARED_FAMILY, 'The toolkit adds a command with its own code to a recipe, gives one a new code and puts the original back, but no build reads a command\'s own code yet, and taking away a command of the definition is not built.'),
    21: open(FAMILY, 'Nothing composes an activity for a hub, and none of ours has run on one.'),
    22: open(FAMILY, 'Nothing maps an activity\'s keys from its devices\' roles for the remotes a hub serves.'),
    23: open(FAMILY, 'Nothing sets a device\'s input in an activity of a hub\'s setup.'),
    24: open(FAMILY, 'Nothing includes a pass through device in an activity of a hub\'s setup.'),
    26: open(SHARED_FAMILY, 'Nothing removes an activity from a hub\'s setup.'),
    27: open(SHARED_FAMILY, 'Nothing gives an activity of a hub\'s setup an icon.'),
    28: open(FAMILY, 'Nothing orders the activities or an activity\'s devices in a hub\'s setup.'),
    29: unknown('A hub has no keys of its own; whether its setup states which activities a paired remote\'s activity keys start is not read.'),
    30: open(SHARED_FAMILY, 'Nothing adds steps to an activity\'s start or end in a hub\'s setup.'),
    31: unknown('A hub has no keys of its own; how its setup carries the key maps of a remote paired to it is not read.'),
    32: unknown('A hub has no keys of its own; how its setup carries a paired remote\'s device mode maps is not read.'),
    33: unknown('A hub has no keys of its own; whether a device mode map is laid out in its setup for a paired remote is not read.'),
    34: unknown('A hub has no screen; whether its setup carries the screen pages a paired remote shows for an activity is not read.', ['reference/architectures/harmony-touch/remote-and-hub.md#the-remotes-own-screen-engine']),
    35: unknown('A hub has no screen; whether its setup carries the screen pages a paired remote shows for a device is not read.', ['reference/architectures/harmony-touch/remote-and-hub.md#the-remotes-own-screen-engine']),
    36: unknown('Whether a screen entry on this generation can open a page of the user\'s own commands and come back is not known.'),
    37: open(FAMILY, 'Nothing composes a sequence for a hub.'),
    38: unknown('A hub has no keys of its own; whether its setup carries a held command for a paired remote\'s key is not read.'),
    39: unknown('A hub has no keys of its own; whether a paired remote has device keys its setup fills is not read.'),
    40: unknown('A hub has no touch panel; whether its setup carries the gestures of a paired remote is not read.'),
    41: impossible(['reference/architectures/harmony-touch/remote-and-hub.md#the-remotes-own-screen-engine'], 'A hub has no screen and no program that draws one, so there is nothing of its own to show before a write.'),
    42: impossible(['reference/architectures/harmony-touch/remote-and-hub.md#the-remotes-own-screen-engine'], 'A hub has no screen, so it has no look to choose.'),
    43: open(MODEL, 'No drawing of the hub exists.'),
    44: impossible(['reference/architectures/harmony-touch/remote-and-hub.md#the-remotes-own-screen-engine'], 'The remote\'s own help is shown on a screen, and a hub has none.'),
    45: open(FAMILY, 'Nothing composes favourite channels for a hub.'),
    46: open(FAMILY, 'Nothing composes a favourite with an icon for a hub.'),
    47: open(FAMILY, 'Nothing reads or changes a hub\'s settings.'),
    48: impossible(['reference/architectures/harmony-touch/remote-and-hub.md#the-remotes-own-screen-engine'], 'A hub has no screen to light.'),
    49: impossible(['reference/architectures/harmony-touch/remote-and-hub.md#the-remotes-own-hardware'], 'The accelerometer is the remote\'s hardware, which a hub has not.'),
    50: unknown('Whether a hub\'s setup switches a Remote Assistant or a Starting Activity message for the remotes it serves is not known.'),
    51: unknown('Whether a hub\'s setup states Smart or Full help for the remotes it serves is not known.'),
    52: open(MODEL, 'A hub keeps the time its remotes ask it for; nothing here reads or sets it.'),
    53: impossible(['reference/architectures/harmony-touch/remote-and-hub.md#the-remotes-own-screen-engine'], 'A hub has no screen to show pictures on.'),
    54: open(FAMILY, 'The hub\'s native program has a command that captures a code, by its image; nothing sends it.'),
    55: open(FAMILY, 'A learned code composes into a device in tests on other models; nothing composes one for a hub.'),
    56: open(FAMILY, 'A captured code is recognised by the library, but no test does so for this model.'),
    58: open(MODEL, 'Nothing reads a hub\'s stored set, so there is no backup of one.'),
    59: open(MODEL, 'There is no backup of a hub to put back, and nothing is written to the bench hub.'),
    61: open(FAMILY, 'Nothing clears a hub\'s setup; nothing is written to the bench hub.'),
    62: open(MODEL, 'A hub on a cable is listed as file based without being claimed; a hub on the network is not looked for.'),
    63: open(BENCH, 'The unit is recorded by the serial its identity file states; refusing a wrong unit is not shown on one.'),
    64: open(MODEL, 'The identity file was read on the unit, firmware 4.15.600 and skin 106, but no test proves the read for this model.'),
    65: impossible(['reference/architectures/harmony-touch/remote-and-hub.md#the-remotes-own-hardware'], 'The battery is the remote\'s hardware, which a hub has not.'),
    66: open(MODEL, 'Nothing is read or written at length on a hub, so nothing reports progress.'),
    67: unknown('A hub has no keys of its own; whether it reports the key presses of a remote paired to it is not known.'),
    69: open(SHARED_FAMILY, 'The firmware version is read, but its running or recovery state and whether a newer version exists are not.'),
    70: impossible(['docs/decisions.md#d18'], 'Decision 18 allows the firmware install on the Harmony 600, 650 and 700 alone, so the FHSDK never installs firmware here.'),
    71: open(FAMILY_MODEL, 'Nothing brings a stuck hub back, and its own recovery is not read.'),
    72: open(SHARED, 'The service client is on no public entry, so no import is offered.'),
    83: open(SHARED, 'Nothing turns the documents of a setup made with Logitech\'s software into a recipe; a setup is entered again.'),
    84: open(MODEL, 'The listeners and the discovery a hub answers on are read in its image; nothing here looks for a hub or connects to one.'),
    85: open(MODEL, 'The command that sets the Wi-Fi network and what it drives are read in the hub\'s image; nothing sends it, and nothing is written to the bench hub.'),
    86: open(MODEL, 'What a hub clears when it is set up for another account is read in its image; nothing here does it.'),
    87: open(MODEL, 'Nothing asks a hub to start an activity, send a command or say which activity is on.'),
    88: open(MODEL, 'The document the smart home devices are kept in is read in the remotes\' image; none has been read off a hub.'),
    89: open(SHARED_FAMILY, 'No library step tunes one command of a device in a hub\'s setup.'),
    90: open(SHARED_FAMILY, 'Nothing composes an activity for a hub, so no order can be chosen.'),
    91: unknown('A hub has no screen; whether its setup carries the start screen a paired remote opens an activity on is not read.', ['reference/architectures/harmony-touch/remote-and-hub.md#the-remotes-own-screen-engine']),
    92: open(SHARED_FAMILY, 'Nothing composes a hub\'s setup, so nothing leaves an activity out of one.'),
    93: open(SHARED_FAMILY, 'No family serves the hub, so no document of one is changed or marked.'),
  },
};

/**
 * The written statuses of the requirements about the FHSDK as a whole, one each and shared by every model, for those
 * no proof makes met; R12, R20, R25, R73, R74 and R80 are proven, so they are not here. Each waits on the FHSDK itself, since no
 * family and no model has a part in it.
 */
const WHOLE_STATUSES: Readonly<Record<number, RequirementState>> = {
  9: open(SHARED, 'The catalogue lists manufacturers and each one\'s models; nothing searches across them by type or helps with a typing error.'),
  57: open(SHARED, 'Code numbers are ranked against the catalogue\'s codesets, but no test identifies a device from a few taught commands.'),
  60: open(SHARED, 'Nothing adapts a setup to another model\'s limits, or copies devices and activities from one setup into another.'),
  68: open(SHARED, 'The probe builds a publishable report from a configuration and from a remote on the cable, but no run of it on a remote outside the thirteen bench models is recorded.'),
  75: open(SHARED, 'Every package is private and unpublished, and an application links the folder beside it.'),
  76: open(SHARED, 'Every change is a function that returns a new recipe and keeps it consistent, and the same call for every model; a key is set only on the Harmony One and the Harmony Touch, whose families state their maps, every other model answering not built, as every change needing the family does on the Harmony 525 and 515, which no family serves. Still not built on any model: favourite channels, the look of the screens, a device\'s inputs, an activity\'s icon and its activity key.'),
  77: open(SHARED, 'Which devices an activity uses, the sequences an activity holds and what is not filled in can be asked of any document; on the Harmony One and the Harmony Touch so can what every key of a device or an activity does, with how its command is sent or the steps of the sequence it runs, and what its screen shows, from the maps their builds bind by. Every other model answers not built, since its family has no maps yet or, on the Harmony 525 and 515, no family serves it, and a document\'s favourite channels cannot be asked on any model.'),
  78: open(SHARED, 'The check lists a recipe\'s problems without building it, each naming its place: a name taken, a limit passed, a choice the model cannot bind or its family refuses, a command a device lacks and a field no build reads; a problem only a build meets, such as a code in a definition the family cannot send, is still found by building.'),
  79: open(SHARED, 'One function, syncDocument, chooses the write path by the document\'s model and reports its phases, progress, what a person must do or leave and its outcome as events, stopping only where it is safe; it is built for the Harmony One, 600, 650 and 700 and the Harmony Touch, and not yet for the Harmony 300, 350 and 885.'),
  81: open(SHARED, 'The archive is read from a checkout on disk, through a source a builder is handed; no source reads it over the network or keeps a cache.'),
  82: open(SHARED, 'The catalogue is asked from the archive alone; nothing searches Logitech\'s service beside it or says per result where it came from.'),
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
  return { status: 'met', tests, bench, proofs, reference: [], why, waitsOn: WAITS_ON_NOTHING };
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
