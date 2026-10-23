/**
 * The Harmony One's builders on the composed path, `todo-compile-one.md` 3.2.2: the parts a setup composed onto a
 * Logitech compile used to carry out of the donor, built instead from a description of the configuration being
 * composed, and the measurement that says which bytes of a finished configuration they reproduce.
 *
 * **What runs**, in this order, each one describing the configuration composed so far, building its part and
 * putting it in place of the donor's, `Family.composedBuilders`:
 *
 * 1. the ten firmware screens, section 409, `firmwarescreens.ts`;
 * 2. the twenty three fixed screens past them, section 411, `fixedscreens.ts`, for the configuration's own build
 *    year, the donor's stamp until `composeSetup` stamps the result;
 * 3. the welcome tour and, where the wiring keeps its start ladder, the Remote Assistant, section 412,
 *    `tourscreens.ts`, where the configuration holds them: on the composed path they are left out before any builder
 *    runs unless `TouchChoices.welcomeTour` keeps them, `withTouchComposedBuilders`, section 421, so there this builds
 *    nothing;
 * 4. the twenty nine status screens past code 9's, section 413, `statusscreens.ts`, after the firmware screens
 *    because status code 28's "USB Connected" is drawn by reference to the copy the firmware screen USB Connected
 *    holds: described off the configuration with that screen already built, the home it carries is the built copy;
 * 5. the clock header, base slot 11's four header programs and the six lists the clock calls, section 414,
 *    `clockheader.ts`, after the fixed screens because the clock's sixty minutes are drawn by reference to the
 *    copies the clock pickers hold, the same argument; its sixteen pictures are not its own, the description carrying
 *    where each sits, and on the composed path ours take their place last, step 13;
 * 6. the power off help, section 415, `helpscreens.ts`, after the screens whose texts it may draw by reference
 *    ("Yes", "No", the title), as the status screens follow the firmware screens: the chain the configuration
 *    holds, and since `todo-compile-one.md` 3.2.2.4 four questions for every composed device with a power
 *    variable, `withTouchHelpChain`, after the donor's devices in the order composed, a choice of ours, each sent
 *    unasked where the catalogue states its power discrete, section 415's rule with its exception. The new screens
 *    are numbered from the chain's own by role and take the next free modes and base slot 10 lists, so they add
 *    no base slot 11 entry and change no hit page, and the case entering the attempt screen stays where it is;
 * 7. the activity menu, its screen, its pages' lists and copies, the lists they run and its hit pages, section 419,
 *    `activitymenu.ts`: on the composed path every row is put on by building the whole menu again,
 *    `withTouchActivityMenuRow`, so this rebuilds the menu the composers left and nothing of the donor's is carried.
 *    After the help screens and the screens before them, whose texts it may draw by reference, and before the case
 *    programs and the hit pages, which read the leads it keeps;
 * 7a. the device pages, every device mode's own key map, pages, their lists and copies, the lists they run and their
 *    hit pages, section 420, `devicepages.ts`: on the composed path each composed device's pages are built by the
 *    same template, `withTouchDevicePage`, so this rebuilds those and the donor's devices' alike, and nothing of a
 *    device page is carried. After the activity menu, beside it in kind, and before the case programs and the hit
 *    pages, which read the leads it keeps; the lists a pad calls, a device's commands, stay the device composer's;
 * 7b. every activity's start up screen and working screen, their own key maps, pages, the lists they run but a pad's
 *    command, and their hit pages, section 423, `activityscreens.ts`: on the composed path the activity composer
 *    lays each activity's screens out by the same template, `withTouchActivityScreensRebuilt`, so this rebuilds them,
 *    the donor's activities' and the composed ones alike. After the device pages, beside them in kind, whose words
 *    ("Devices") a working screen may draw by reference, and before the case programs and the hit pages, which read
 *    the leads it keeps; the lists a pad calls, a command or a sequence's steps, stay the composers';
 * 8. base slot 11's case programs of the value maps, the lists the toggles and the all off call, and base slot 11's
 *    table, section 416, `caseprograms.ts`, after the clock header because the table names its four programs at
 *    their entries, and after the composers because the table names every case, the activities' among them. The
 *    table is generated whole, so it is the composition's only because the activity composer enters every case it
 *    makes as Logitech's compiler does, `withTouchScreenTable`, `todo-compile-one.md` 3.2.2.3; the device composer's
 *    one contribution, the all off's power variables and list, is read back off the composed file;
 * 9. the 23 hit pages the fixed screens name and the touch map's table over every page, section 417, `hitpages.ts`,
 *    at any point after the composers, since it reads only the leads of the screen pages naming them and writes
 *    nothing a screen builder reads; each page keeps the index the configuration gave it, so the screens' builders,
 *    which read the same leads, agree with it. The touch map's other pages are the activity menu's, built above, and
 *    the configuration's: a device page's six commands with both page keys and the generic help screen's, named only
 *    by setup screens (`todo-compile-one.md` 4.2 and 4.6), and the donor's pages of its device screens (4.2). The
 *    composed table is not in Logitech's first use order, the composers appending their pages at the end,
 *    `withHitPage`, which is not this builder's to change, since it keeps the numbering it reads. Every page is named
 *    by a mode page since the activity menu is built, section 419: the two named by nothing, section 417, were the
 *    menu's pages of no row and of one, left behind as the copying composer gave each grown page a new hit page;
 * 10. the wiring, section 410, `wiring.ts` over `wiringparts.ts`: the event map, the leading list, the timers, base
 *    slot 9's eight entries, the lists they reach, and through it the log area and the parameter block, section 407;
 * 11. the state records and value maps with their tables, section 407, `statetables.ts` with the family's facts,
 *    after the clock header, whose two calls are instructions of the clock's state records naming its lists by
 *    index: the clock header keeps the indices its description read, so the records' calls stay right;
 * 12. raw slot 18, two zero bytes generated as the constant every One container holds, and base slot 16's
 *    table generated from the number sender records it names, `smalltables.ts`, `todo-compile-one.md` 6.7: the
 *    one refusing a raw slot 18 holding anything else, the other keeping a donor's records as they are;
 * 13. on the composed path only, and after every builder above, ours in place of Logitech's fixed pictures, the
 *    status strip's, the firmware screens', the power off help's, the settings buttons' and the one whole screen
 *    background the charger's screens draw too, `pictures.ts`, `todo-compile-one.md` 5.3.1 and 5.3.3, section 422,
 *    unless `TouchChoices.logitechPictures` keeps them. A choice and not a rebuild, as leaving the tour out is, so
 *    `withTouchBuilders` does not run it and Logitech's compile still comes back byte for byte through the rest;
 *    last, since the screens' descriptions read a picture as a reference and not by its bytes, and the background's
 *    copies and photographs taken out make several references one.
 *
 * **The lists below the screens are the screen sets' and the wiring's**, `todo-compile-one.md` 3.2.2.5, section
 * 418: every list a set's own lists call, through every level, is built either by that set or by the wiring, never
 * both, and none is left to the donor. Logitech's compiler shares a few between sets, the key lights' off lists and
 * the list turning the Remote Assistant on, and each set reaching one states it and builds it alike; `mark` takes
 * the first, so those bytes are the firmware screens' where they reach them and the fixed screens' otherwise. The
 * wiring builds the lists the transitions of its own variables `readyVar`, `relightVar` and `settleVar` call.
 *
 * **Before the look and not after**, because the look blends our letters into the colour under each text,
 * `withBlendedLetters`, and that gives the selects one role makes on several backgrounds several fonts: every
 * screen description here knows a role by one font and refuses the blended file. Built first, the screens go
 * through the blending as the donor's did. The wiring and the state tables would read either way; the look then
 * sets the screen light's duration, a setting the wiring's description reads, and the Remote Assistant's state
 * variable's starting value, which the state tables' description reads, so both come out of the finished file's
 * descriptions all the same. The look also centres every label drawn in a pad by its letters, and the clock
 * pickers' buttons sit where a device page's pads do, so it moves their words after the builder placed them.
 *
 * **Where the output is not the donor's bytes, and why.** The wiring, the state tables, the case programs and the hit
 * pages come out byte for byte as the donor carried them, none of them drawing a text. The screen sets and the clock header do not: every text they centre or end at a
 * place, a line on the screen, a word on a button, "Exit" at 163, the clock's day ending at 138, is placed by the
 * widths of the letters it is drawn in, and the
 * donor is lettered in ours before anything is composed, `letterTouchDonor`, which keeps every text where
 * Logitech placed it for Logitech's letters. So the builders place those texts in our letters' widths, a pixel
 * or a few from where the donor's sat, and nothing else changes: on `harvest_one_two_devices` lettered in ours, the
 * test setup's donor, the x of 10 texts of the firmware screens, 93 of the fixed ones, 32 of the tour's, 37 of the
 * status screens' and 25 of the clock's days and hours, and no other byte but the trailer's,
 * `test/touchbuilders.test.ts`. **The help screens change more**: every block of theirs is wrapped at the questions'
 * 171 pixels, each paragraph flowed as one, and in our letters the attempt line is 177 pixels and breaks in two,
 * three bytes more on that donor, and the "If not" paragraph keeps three lines at other breaks; in Logitech's
 * letters the wrap gives Logitech's own lines, so a compile is rebuilt byte for byte.
 *
 * **Refusals are the composed path's.** A builder that refuses the configuration refuses the composition, with its
 * message, `TouchBuildError`: a donor whose build year offers a leap year (its Day 29 and second Month pickers are
 * not built, section 411), one in another language (the Dutch compile, sections 409, 411 and 412), the everyday
 * One's compile, whose USB Connected screen leaves through a list of its own (section 409), and past those an
 * event map that does not name one status screen per code (section 413), a base slot 11 that does not hold each
 * of the clock header's four programs once (section 414), value maps that do not read as the One's catalogue or
 * whose numbers disagree (section 416), two hit pages read at one index (section 417), and at the help screens a
 * composed device the chain already asks about by name, one whose catalogue states no power type, a donor whose
 * chain asks about no device, and a role of the chain's numbering held two ways (section 415), and a raw slot 18
 * holding anything but two zero bytes (`todo-compile-one.md` 6.7). Nothing falls back
 * to the donor's part.
 *
 * Arch 12 (Harmony One) alone, skin 54 as `composeSetup` takes it; every builder here is the touch family's but the
 * state tables', which is shared and takes the family's facts.
 */
import type { Container } from '../../gspm.ts';
import { type ContainerLayout, layOutContainer, takeApart } from '../../frame.ts';
import { type BlendedSet, unblendedSelects } from '../../blending.ts';
import { ScreenRecordError, assertRebuilt } from '../../screenrecords.ts';
import { StateTablesError, buildStateTables, describeStateTables, withStateTables } from '../../statetables.ts';
import { WiringError, builtPieces, compareWiring, withWiring } from '../../wiringparts.ts';
import { FirmwareSectionsError } from '../../firmwaresections.ts';
import { ComposeError } from '../../shared/core.ts';
import { buildTouchFirmwareScreens, describeTouchFirmwareScreens, withTouchFirmwareScreens } from './firmwarescreens.ts';
import { buildTouchFixedScreens, describeTouchFixedScreens, withTouchFixedScreens } from './fixedscreens.ts';
import { buildTouchTourScreens, describeTouchTourScreens, withTouchTourScreens } from './tourscreens.ts';
import { buildTouchStatusScreens, describeTouchStatusScreens, withTouchStatusScreens } from './statusscreens.ts';
import { buildTouchClockHeader, describeTouchClockHeader, withTouchClockHeader } from './clockheader.ts';
import { buildTouchCasePrograms, buildTouchScreenTable, describeTouchCasePrograms, withTouchCasePrograms } from './caseprograms.ts';
import { buildTouchHitPages, describeTouchHitPages, withTouchHitPages } from './hitpages.ts';
import { buildTouchActivityMenu, describeTouchActivityMenu, withTouchActivityMenu } from './activitymenu.ts';
import { buildTouchDevicePages, describeTouchDevicePages, withTouchDevicePages } from './devicepages.ts';
import { buildTouchActivityScreenSet, describeTouchActivityScreens, withTouchActivityScreenSet } from './activityscreens.ts';
import { buildTouchHelpScreens, describeTouchHelpScreens, withTouchHelpChain, withTouchHelpScreens } from './helpscreens.ts';
import type { ComposedDeviceNote } from '../family.ts';
import { buildTouchWiring, describeTouchWiring } from './wiring.ts';
import { TOUCH_STATE_TABLES } from './statetables.ts';
import { withCentredPadLabels } from './centring.ts';
import { type WithGenerated, withNumberSenderTable, withTouchInsertedSection } from './smalltables.ts';
import { TOUCH_CHOICES, type TouchChoices } from './choices.ts';
import { withoutTourAndAssistant } from './withouttour.ts';
import { touchOurPictures, withTouchPictures } from './pictures.ts';
import { PictureError } from '../../pictures.ts';

/** A builder on the composed path refusing the configuration, with the part it was building. */
export class TouchBuildError extends Error {}

/** The parts the builders make, in the order they run and the order `touchBuiltBytes` attributes a byte. */
export const TOUCH_BUILT = [
  'firmware screens', 'fixed screens', 'tour and Remote Assistant', 'status screens', 'clock header', 'help screens',
  'activity menu', 'device pages', 'activity screens', 'case programs', 'hit pages', 'wiring', 'state tables', 'raw slot 18',
  'number senders', 'pictures',
] as const;
export type TouchBuilt = (typeof TOUCH_BUILT)[number];

/**
 * The parts `withTouchBuilders` rebuilds, every one but the pictures: those are ours in place of Logitech's, a choice
 * the composed path makes, `withTouchComposedBuilders`, and not a part rebuilt as the configuration holds it.
 */
export const TOUCH_REBUILT: readonly TouchBuilt[] = TOUCH_BUILT.filter((what) => what !== 'pictures');

/**
 * The two small tables, `smalltables.ts`, `todo-compile-one.md` 6.7: each a configuration taken apart and
 * answered with its generated piece in place, so the path lays it out and the attribution finds the piece.
 */
const SMALL_TABLES: Readonly<Record<'raw slot 18' | 'number senders', (c: Container) => WithGenerated>> = {
  'raw slot 18': (c) => withTouchInsertedSection(takeApart(c)),
  'number senders': (c) => withNumberSenderTable(takeApart(c)),
};

/**
 * The builders whose part is screens and screen programs, in the order they run: each a description of what it
 * draws over a configuration that keeps every other byte where it was, so they chain, one described off the one
 * before, and the attribution counts them by what their descriptions span. The clock header is screen programs
 * rather than screens, built through the same template engine and described the same way; the case programs are
 * screen programs and their table, and the hit pages what a screen is touched through, each described the same way
 * too, by what it spans and reads, so they chain with the rest.
 */
const SCREEN_BUILT = [
  'firmware screens', 'fixed screens', 'tour and Remote Assistant', 'status screens', 'clock header', 'help screens',
  'activity menu', 'device pages', 'activity screens', 'case programs', 'hit pages',
] as const;
type ScreenBuilt = (typeof SCREEN_BUILT)[number];

/**
 * One screen set as its builder reads and makes it: what the description spans of the configuration, which of
 * those bytes it read as values, where its own pieces sat, and the layout with the built ones in their place.
 */
interface ScreenBuild {
  described: ReadonlySet<number>;
  structure: ReadonlySet<number>;
  regions: { from: number; to: number; what: string }[];
  layout: ContainerLayout;
}

/** The screen sets and the clock header, each described off `c` and built: the same three calls each module's check makes. */
const SCREENS: Readonly<Record<ScreenBuilt, (c: Container) => ScreenBuild>> = {
  'firmware screens': (c) => {
    const layout = takeApart(c);
    const d = describeTouchFirmwareScreens(c, layout);
    return { ...d, layout: withTouchFirmwareScreens(layout, buildTouchFirmwareScreens(c, d.spec), d.place) };
  },
  'fixed screens': (c) => {
    const layout = takeApart(c);
    const d = describeTouchFixedScreens(c, layout);
    return { ...d, layout: withTouchFixedScreens(layout, buildTouchFixedScreens(c, d.spec), d.place) };
  },
  'tour and Remote Assistant': (c) => {
    const layout = takeApart(c);
    const d = describeTouchTourScreens(c, layout);
    return { ...d, layout: withTouchTourScreens(layout, buildTouchTourScreens(c, d.spec), d.place) };
  },
  'status screens': (c) => {
    const layout = takeApart(c);
    const d = describeTouchStatusScreens(c, layout);
    return { ...d, layout: withTouchStatusScreens(layout, buildTouchStatusScreens(c, d.spec), d.place) };
  },
  'clock header': (c) => {
    const layout = takeApart(c);
    const d = describeTouchClockHeader(c, layout);
    return { ...d, layout: withTouchClockHeader(layout, buildTouchClockHeader(c, d.spec), d.place) };
  },
  // The chain as the configuration holds it. On the composed path the composed devices' screens are added first,
  // `withTouchHelpChain`, so what this describes there, and what the attribution describes, is the whole chain.
  'help screens': (c) => {
    const layout = takeApart(c);
    const d = describeTouchHelpScreens(c, layout);
    return { ...d, layout: withTouchHelpScreens(layout, buildTouchHelpScreens(c, d.spec), d.place) };
  },
  // The menu as the configuration holds it: on the composed path every row was put on by building the menu again,
  // `withTouchActivityMenuRow`, so this rebuilds the same bytes, and the attribution describes it the same way.
  'activity menu': (c) => {
    const layout = takeApart(c);
    const d = describeTouchActivityMenu(c, layout);
    return { ...d, layout: withTouchActivityMenu(layout, buildTouchActivityMenu(c, d.spec), d.place) };
  },
  // Every device mode as the configuration holds it: on the composed path each composed device's pages were built by
  // the same template, `withTouchDevicePage`, so this rebuilds them and the donor's devices' alike.
  'device pages': (c) => {
    const layout = takeApart(c);
    const d = describeTouchDevicePages(c, layout);
    return { ...d, layout: withTouchDevicePages(layout, buildTouchDevicePages(c, d.spec), d.place) };
  },
  // Every activity's two screens as the configuration holds them: on the composed path each composed activity's were
  // laid out by the same template, `withTouchActivityScreensRebuilt`, so this rebuilds them and Logitech's alike.
  'activity screens': (c) => {
    const layout = takeApart(c);
    const d = describeTouchActivityScreens(c, layout);
    return { ...d, layout: withTouchActivityScreenSet(layout, buildTouchActivityScreenSet(c, d.spec), d.place) };
  },
  // The table is generated whole from the clock header's entries and the value maps, so on a configuration whose
  // table the rule does not give, the composition before `todo-compile-one.md` 3.2.2.3 among them, the rebuild is
  // another length and the comparison refuses it.
  'case programs': (c) => {
    const layout = takeApart(c);
    const d = describeTouchCasePrograms(c, layout);
    const table = buildTouchScreenTable(d.table.header, d.table.valueMaps);
    return { ...d, layout: withTouchCasePrograms(layout, buildTouchCasePrograms(d.spec), d.place, table) };
  },
  'hit pages': (c) => {
    const layout = takeApart(c);
    const d = describeTouchHitPages(c, layout);
    return { ...d, layout: withTouchHitPages(layout, buildTouchHitPages(d.spec), d.place) };
  },
};

/** The wiring described off `c` and built, `checkTouchWiring`'s two calls kept apart so the pieces can be counted. */
function wiringOf(c: Container): { layout: ContainerLayout; built: ReturnType<typeof buildTouchWiring> } {
  const layout = takeApart(c);
  return { layout, built: buildTouchWiring(describeTouchWiring(layout)) };
}

/** The state tables described off `c` with the family's facts and built. */
function stateTablesOf(c: Container): { layout: ContainerLayout; built: ReturnType<typeof buildStateTables> } {
  const layout = takeApart(c);
  return { layout, built: buildStateTables(describeStateTables(layout, TOUCH_STATE_TABLES), TOUCH_STATE_TABLES) };
}

/** A builder's own refusal, as against a fault in the code, which is left to propagate as it is. */
const isRefusal = (error: unknown): error is Error => error instanceof ScreenRecordError || error instanceof WiringError
  || error instanceof StateTablesError || error instanceof FirmwareSectionsError || error instanceof ComposeError
  || error instanceof PictureError;

/** Run one builder, its refusal named with the part it was building. */
function building<T>(what: TouchBuilt, run: () => T): T {
  try {
    return run();
  } catch (error) {
    if (isRefusal(error)) throw new TouchBuildError(`building the Harmony One's ${what}: ${error.message}`);
    throw error;
  }
}

/**
 * Every part this module builds put in place of the configuration's own, in `TOUCH_BUILT`'s order, each from a
 * description read off the configuration as the step before left it. `Family.composedBuilders` for the touch
 * family; refuses with `TouchBuildError` where a builder refuses. `composed` is the devices the composers added,
 * which the help screens ask about too; `parts` runs only those named, in the same order, for a caller measuring
 * what one part changes (`test/touchbuilders.test.ts` holds the help screens apart, since they change the file's
 * length in our letters). The pictures are not among them, `TOUCH_REBUILT`: named, they are passed over.
 */
export function withTouchBuilders(
  c: Container, composed: readonly ComposedDeviceNote[] = [], parts: readonly TouchBuilt[] = TOUCH_REBUILT,
): { container: Container; built: TouchBuilt[] } {
  let out = c;
  for (const what of SCREEN_BUILT) {
    if (!parts.includes(what)) continue;
    // The help screens grow by the composed devices' questions, `withTouchHelpChain`; every other set is described
    // and rebuilt where it sits.
    out = building(what, () => (what === 'help screens' ? withTouchHelpChain(out, composed)
      : layOutContainer(SCREENS[what](out).layout).container));
  }
  if (parts.includes('wiring')) {
    out = building('wiring', () => {
      const { layout, built } = wiringOf(out);
      return layOutContainer(withWiring(layout, built)).container;
    });
  }
  if (parts.includes('state tables')) {
    out = building('state tables', () => {
      const { layout, built } = stateTablesOf(out);
      return layOutContainer(withStateTables(layout, built)).container;
    });
  }
  // Last, since nothing reads them: on a configuration holding the form every One container holds, neither
  // changes a byte, so their place among the builders is free.
  for (const what of ['raw slot 18', 'number senders'] as const) {
    if (parts.includes(what)) out = building(what, () => layOutContainer(SMALL_TABLES[what](out).layout).container);
  }
  return { container: out, built: TOUCH_REBUILT.filter((what) => parts.includes(what)) };
}

/**
 * `Family.composedBuilders` for the touch family: the welcome tour and the Remote Assistant left out first unless the
 * choice keeps them, `withoutTourAndAssistant`, `todo-compile-one.md` 4.10, and then every builder, `withTouchBuilders`,
 * so each describes the configuration as it will be: Options in its one page, no tour for the tour's builder to read
 * and the hit pages without theirs; and last ours in place of Logitech's fixed pictures unless the choice keeps
 * theirs, `withTouchPictures`, `todo-compile-one.md` 5.3. A refusal of either step is the composition's, named as the
 * builders' are.
 */
export function withTouchComposedBuilders(
  c: Container, composed: readonly ComposedDeviceNote[], choices: TouchChoices,
): { container: Container; built: TouchBuilt[] } {
  const start = choices.welcomeTour ? c : building('tour and Remote Assistant', () => withoutTourAndAssistant(c).container);
  const built = withTouchBuilders(start, composed);
  if (choices.logitechPictures) return built;
  const container = building('pictures', () => withTouchPictures(built.container, choices).container);
  return { container, built: [...built.built, 'pictures'] };
}

// ---------------------------------------------------------------------------------------------------------
// Which bytes the builders reproduce

export interface TouchBuiltBytes {
  /** Per byte of the configuration: 0 where none of the builders reproduces it, else 1 + its builder's index in `TOUCH_BUILT`. */
  owners: Uint8Array;
  /** Bytes each builder reproduces, its description's included. */
  generated: Record<TouchBuilt, number>;
  /** Of those, the bytes each builder read off the configuration as its description rather than computing them. */
  described: Record<TouchBuilt, number>;
}

/**
 * Which bytes of a Harmony One configuration this module's builders reproduce, measured on the finished file with
 * no memory of how it was made, as `families/four-slot/assemble.ts`' `attributeBytes` measures the Harmony 600
 * family's: each builder describes the configuration, rebuilds its part, the rebuild is held to the configuration
 * byte for byte, and only then are the bytes of its part counted, the screens' by what their descriptions span
 * and the wiring's and the state tables' by the pieces they build. A byte two builders reach is the first's.
 *
 * **The screens are read through `unblendedSelects`**, `blended` being what the look's blending made: their
 * descriptions know a role by one font, and the blending splits a role's selects by background. The view is the
 * configuration with those selects pointed back, the same length, so its offsets are the configuration's; the
 * select bytes the blending changed are counted with the builder that made the select, their value being the
 * look's. A Logitech compile, which blends nothing, takes `[]`. **And through the look's centring**: the look moves
 * the words of the clock pickers' buttons, which sit where a device page's pads do, to centre them by their
 * letters, so a screen set's rebuild is centred the same way before it is compared, and the y of a word the look
 * moved is counted with the builder too, its value being the look's.
 *
 * **The pictures by what they are**: a picture is ours where one of `pictures.ts`' drawings, inside the picture's own
 * mask, gives its bytes exactly, in `choices`' colours and icons, `touchOurPictures`. No byte of one is read as a
 * value: the mask says only which pixels are drawn.
 *
 * Refuses, with the builder's message, where a builder refuses the configuration or does not rebuild it.
 */
export function touchBuiltBytes(c: Container, blended: readonly BlendedSet[], choices: TouchChoices = TOUCH_CHOICES): TouchBuiltBytes {
  const owners = new Uint8Array(c.blob.length);
  const isDescribed = new Uint8Array(c.blob.length);
  const mark = (from: number, length: number, who: TouchBuilt, described: (k: number) => boolean): void => {
    const tag = TOUCH_BUILT.indexOf(who) + 1;
    for (let k = from; k < from + length && k < owners.length; k += 1) {
      if (owners[k] !== 0) continue;
      owners[k] = tag;
      if (described(k)) isDescribed[k] = 1;
    }
  };

  // The screen sets and the clock header rebuilt one after the other into one configuration, each described off the
  // one before, which holds the same bytes at the same offsets wherever it is not a rebuilt screen or program, so
  // every set's offsets are the view's: a screen or a program rebuilt is the same length as the one it replaces.
  // In the order the composed path builds them, so a text drawn by reference into an earlier set, status code 28's
  // "USB Connected" and the clock's sixty minutes, is read off the copy the earlier builder made.
  const view = unblendedSelects(c, blended);
  let rebuilt = view;
  const sets: { what: TouchBuilt; one: ScreenBuild }[] = [];
  // The rebuild so far held to the configuration. The look centres every label drawn in a pad by its letters,
  // `withCentredPadLabels`, and the clock pickers' buttons sit where a device page's pads do, so their words are
  // moved after the builder placed them; the rebuild takes the same step, which moves nothing the look has centred
  // already. Over all the sets built so far at once, since the step draws every page of the configuration, and
  // the first byte that differs named by the set whose structure holds it.
  const compare = (): void => {
    const centred = withCentredPadLabels(rebuilt).blob;
    const at = centred.findIndex((one, k) => one !== view.blob[k]);
    if (at >= 0 || centred.length !== view.blob.length) {
      const whose = sets.find((set) => set.one.structure.has(at));
      building(whose?.what ?? 'firmware screens', () => assertRebuilt(centred, view, sets.flatMap((set) => set.one.regions)));
    }
  };
  for (const what of SCREEN_BUILT) {
    building(what, () => {
      const one = SCREENS[what](rebuilt);
      const next = layOutContainer(one.layout).container;
      // A rebuild of another length moves every byte after it, so the comparison would name the first of them,
      // the header's end address, and blame the first set. So the sets before are compared first, which names a
      // set that rebuilt otherwise before this one, the donor lettered in ours at its firmware screens' first text
      // since the help screens joined the path; and only where they rebuilt is this set named, by the length: the
      // case programs, whose table is generated whole, on a configuration whose table the rule does not give, and
      // the help screens on a configuration whose lines our letters wrap otherwise.
      if (next.blob.length !== rebuilt.blob.length) {
        compare();
        const by = next.blob.length - rebuilt.blob.length;
        throw new ScreenRecordError(`the rebuild is ${Math.abs(by)} bytes ${by > 0 ? 'longer' : 'shorter'} than the configuration`);
      }
      rebuilt = next;
      sets.push({ what, one });
    });
  }
  compare();
  for (const { what, one } of sets) {
    // A description also reads bytes outside what it builds, the glyph codes of a text kept elsewhere that a
    // screen draws by reference; those stay where they are and are not this builder's.
    for (const k of one.structure) mark(k, 1, what, (offset) => one.described.has(offset));
  }
  building('wiring', () => {
    const { layout, built } = wiringOf(c);
    compareWiring(c, layout, built);
    const laid = layOutContainer(withWiring(layout, built));
    for (const piece of builtPieces(built)) {
      const at = laid.offsetOf(piece);
      if (at === undefined) continue;
      const described = new Set((built.described.get(piece) ?? []).map((k) => at + k));
      mark(at, piece.bytes.length, 'wiring', (k) => described.has(k));
    }
  });
  building('state tables', () => {
    const { layout, built } = stateTablesOf(c);
    const laid = layOutContainer(withStateTables(layout, built));
    if (laid.bytes.length !== c.blob.length || laid.bytes.some((one, k) => one !== c.blob[k])) {
      throw new StateTablesError('the state tables do not rebuild from their description');
    }
    // Whole pieces, as `attributeBytes` counts the Harmony 600 family's: what a record or a value map holds is
    // the description's, and the builder makes every byte of it from that.
    for (const piece of [built.nameTree, built.stateTable, built.valueMapTable, ...built.records, ...built.valueMaps]) {
      const at = laid.offsetOf(piece);
      if (at !== undefined) mark(at, piece.bytes.length, 'state tables', () => false);
    }
  });
  // The two small tables, each generated whole and held to the configuration before its bytes are counted.
  // Nothing of either is read as a value: raw slot 18 is a constant, and base slot 16's table is a count and
  // addresses, the addresses the frame's, so neither has a described byte.
  for (const what of ['raw slot 18', 'number senders'] as const) {
    building(what, () => {
      const { layout, piece } = SMALL_TABLES[what](c);
      const laid = layOutContainer(layout);
      if (laid.bytes.length !== c.blob.length || laid.bytes.some((one, k) => one !== c.blob[k])) {
        throw new ComposeError(`${what === 'raw slot 18' ? 'raw slot 18' : 'the number sender table'} does not rebuild from the configuration`);
      }
      const at = laid.offsetOf(piece);
      if (at !== undefined) mark(at, piece.bytes.length, what, () => false);
    });
  }
  building('pictures', () => {
    for (const one of touchOurPictures(c, choices)) mark(one.offset, one.length, 'pictures', () => false);
  });

  const generated = Object.fromEntries(TOUCH_BUILT.map((who) => [who, 0])) as Record<TouchBuilt, number>;
  const described = Object.fromEntries(TOUCH_BUILT.map((who) => [who, 0])) as Record<TouchBuilt, number>;
  owners.forEach((tag, k) => {
    if (tag === 0) return;
    const who = TOUCH_BUILT[tag - 1] as TouchBuilt;
    generated[who] += 1;
    if (isDescribed[k] === 1) described[who] += 1;
  });
  return { owners, generated, described };
}
