/**
 * Every choice of ours the four slot family makes, the Harmony 600, 650 and 700, each with the value it
 * had as a constant before `todo-compile-650.md` 10.7.3 as its default. A recipe sets them; nothing in the
 * family's code decides one of these on its own.
 *
 * **What sorted a constant into this file** is that nothing on a remote or in Logitech's compiles fixes
 * it: a colour, a face, a delay a device starts with, which activity key a type of activity takes, what to
 * do with a label too wide for its corner. A constant measured on Logitech's compiles or read in the
 * firmware is a fact and stays in the module that uses it, with its measurement, however arbitrary it
 * looks: a place on the screen, a font's index, an opcode, the order Logitech's compiler sorts in.
 *
 * **One kind of choice stays fixed for now, and why**, so that it is not mistaken for a fact:
 *
 * * **The words**, "Devices", "Back", the menus' titles and bottom words, "Starting", the start up
 *   screen's three lines, "Turning system off" and "Exit". They are a language, and a user's to choose.
 *   But while a configuration is a Logitech compile patched, the pages the donor brings carry Logitech's
 *   English, and several readers find a page by its words (the placeholder, a menu by its title), so a
 *   chosen language would split one remote's screens between two and blind those readers. They become a
 *   choice when a configuration is built rather than patched, todo 11.1.1.
 *
 * Which of our faces letters each of Logitech's sizes is not a choice: each face's rows are Logitech's,
 * measured in 8.2, and the outline is fitted to them. Its weight is, `faceWeights`, since 10.8.5.
 */
import type { ActivityKey } from './activitykeys.ts';

import { rgbTo565 } from '../../png.ts';
import {
  LETTERING_FACES, OXANIUM_WEIGHTS, defaultWeight, type LetterInks, type OxaniumFaceName, type OxaniumWeight,
} from '../../lettering.ts';
import type { WiringSettings } from './wiring.ts';
import { iconNames } from '../../icons.ts';

import type { CommonChoices, DelayDefaults } from '../family.ts';
import { type BackgroundColours } from './backgrounds.ts';
import { type OurPictureName } from './pictures.ts';

export interface FourSlotChoices extends CommonChoices {
  /**
   * Whose letters the screens are drawn in: Logitech's, as the donor carries them, or ours, Oxanium,
   * decision 19 (`withOxaniumFonts`). Every assembly measured against a Logitech compile needs theirs.
   */
  readonly letters: 'logitech' | 'oxanium';
  /**
   * Our letters blended into the one colour under each text, decision 22, `todo-compile-650.md` 8.2.6
   * (`withBlendedLetters`). Only our letters can be blended, since only theirs come with grey levels.
   */
  readonly blendLetters: boolean;
  /**
   * The colours our letters are drawn in, `todo-compile-650.md` 10.7.5: any three different colours, since
   * a letter is read back by its form and not its ink, and two alike would leave its shadow or its colouring
   * unreadable. The default is decision 20's white over a black shadow, and dark on the bars: Logitech's own
   * grey, `0x2104`, the one ink all 39 of their bar fonts hold across the 13 Harmony 650 compiles, kept
   * because the bars stay white; their shadow was dark grey on 130 of the 196 shadowed sets and black on 66.
   */
  readonly letterInks: LetterInks;
  /**
   * The Oxanium weight each of our nine faces is drawn in, `todo-compile-650.md` 10.8.5: decided by look in
   * 8.2, SemiBold for the six label faces and Regular for the three regular ones Logitech draws its start up,
   * Off, Remote Assistant, Help and tour screens in. Any of the seven is read back, since our alphabet holds
   * every weight and a configuration's size table is built from the weights its letters are in, `ladderOf`.
   */
  readonly faceWeights: Readonly<Record<OxaniumFaceName, OxaniumWeight>>;
  /**
   * The six pictures that are no state's background, the start up picture, the corner mark and the four
   * firmware screen pictures: Logitech's, as the donor carries them, or ours, an icon of Material Design
   * Icons each, `todo-compile-650.md` 9.1.2.2 (`buildOurPictures`). Every assembly measured against a
   * Logitech compile needs theirs.
   */
  readonly pictures: 'logitech' | 'ours';
  /**
   * Which icon each of our pictures draws, by Material Design Icons' own name, chosen by look beside
   * Logitech's in 9.1.2.2: a remote for starting an activity, the USB symbol, a battery with an alert, a
   * battery crossed out, two turning arrows for upgrading and learning, and a signal fan for the mark,
   * the one of the candidates still legible at 12 by 10.
   */
  readonly icons: Readonly<Record<OurPictureName, string>>;
  /** The icons' colour, white as Logitech's, and the solid colour under them, Logitech's plain dark grey. */
  readonly iconColour: number;
  readonly iconBackground: number;
  /**
   * The backgrounds of the five designed screens: Logitech's pictures, as the donor carries them, or one
   * flat colour per screen state, decision 20, `todo-compile-650.md` 9.1.2.1 (`withStateBackgrounds`).
   */
  readonly backgrounds: 'designed' | 'state colours';
  /** The colour of each screen state, as RGB565, when `backgrounds` is `state colours`. */
  readonly stateColours: Readonly<BackgroundColours>;
  /**
   * The one colour every state is drawn in on a model drawn in one look, `ONE_LOOK_SKINS`, the Harmony 600,
   * in place of `stateColours`: decided on 14 October 2026, grey 2 of sixteen from black to white, off a
   * preview of `todo-compile-600.md` 1.2.3's test card; not yet seen on the remote. Logitech's own 600 compiles
   * use the same value among their greys.
   */
  readonly oneLookColour: number;
  /**
   * The top and bottom bars' one colour with the state colours: white, decided with them (decision 20),
   * Logitech's shaded light grey bars made flat. The words on them stay dark.
   */
  readonly barColour: number;
  /**
   * A corner label wider than its font lets a corner hold: drawn in the next smaller set that spells it
   * and fits, which is what Logitech's compiler does with `Antenna` (section 323) and what our wider
   * letters make common, `todo-compile-650.md` 8.2.3; or refused, naming the label.
   */
  readonly labelTooWide: 'smaller font' | 'refuse';
  /**
   * MyHarmony's activity type to the activity key an activity of that type is put on; `Custom` holds
   * none. An inference: it agrees with Logitech's compiles of the test setup, the only ones whose types
   * are known here, while section 314 reads the account's root button map as what decides which activity
   * a key starts.
   */
  readonly activityKeys: Readonly<Record<string, ActivityKey | undefined>>;
  /** The remote's settings: how long the screen stays lit, the tilt sensor, Help and the rest. */
  readonly settings: Readonly<WiringSettings>;
  /** The delays a composed device starts with where the catalogue states none. */
  readonly delays: DelayDefaults;
}

/** What a recipe gives: any choice, a settings and colours object in part. */
export type FourSlotChoicesGiven = Partial<Omit<FourSlotChoices, 'settings' | 'stateColours' | 'delays' | 'letterInks' | 'faceWeights' | 'icons'>> & {
  readonly icons?: Partial<Record<OurPictureName, string>>;
  readonly letterInks?: Partial<LetterInks>;
  readonly faceWeights?: Partial<Record<OxaniumFaceName, OxaniumWeight>>;
  readonly settings?: Partial<WiringSettings>;
  readonly stateColours?: Partial<BackgroundColours>;
  readonly delays?: Partial<DelayDefaults>;
};

export const FOUR_SLOT_CHOICES: FourSlotChoices = {
  letters: 'logitech',
  blendLetters: false,
  letterInks: { shadowed: 0xffff, plain: 0x2104, shadow: 0x0000 },
  faceWeights: Object.fromEntries(LETTERING_FACES.map((face) => [face, defaultWeight(face)])) as Record<OxaniumFaceName, OxaniumWeight>,
  pictures: 'logitech',
  icons: {
    'start up picture': 'remote',
    'corner mark': 'wifi',
    'USB Connected': 'usb',
    'Low Battery': 'battery-alert-variant-outline',
    'battery blank screen': 'battery-off-outline',
    'upgrade and learn blank screens': 'sync',
    'charging 1': 'battery-charging-20',
    'charging 2': 'battery-charging-50',
    'charging 3': 'battery-charging-80',
    'charging 4': 'battery-charging-100',
    'charged': 'battery-check-outline',
  },
  iconColour: 0xffff,
  iconBackground: 0x2945,
  backgrounds: 'designed',
  // Decided on 10 October 2026, until a user's setting replaces them.
  stateColours: {
    device: rgbTo565(184, 32, 55),
    activity: rgbTo565(18, 37, 200),
    idle: rgbTo565(1, 136, 53),
  },
  // Grey 2 of sixteen: red and blue 4 of 31, green 8 of 63.
  oneLookColour: 0x2104,
  barColour: 0xffff,
  labelTooWide: 'smaller font',
  activityKeys: {
    WatchTV: 'Watch TV', WatchDvd: 'Watch a Movie', ListenToMusic: 'Listen to Music', Custom: undefined,
  },
  // This track's settings, `todo-compile-650.md`: the screen lit 20 seconds, the 650's default (6.2.13),
  // the tilt sensor on (4.3.3), and the Remote Assistant, the restore of saved delays, Help and the tour
  // all left out (4.3.2, 3.13, 7.4, section 360). The boot step is the Harmony 700's alone.
  settings: {
    glowTime: 20,
    tiltSensor: true,
    remoteAssistant: false,
    bootStep: false,
    tourShown: false,
    delayRestore: false,
    help: false,
  },
  // In tenths. The inter device delay: 15 of the 17 devices with commands Logitech compiled on the four
  // distinct Harmony 600, 650 and 700 configurations carry 5, one 10 and one 3. The power on delay: 9 of
  // the 15 devices with a `Power` variable there carry 15; the other six are 35 to 80 and include all four
  // televisions, none of which carries 15, so a television is better composed with the value given.
  delays: { powerOn: 15, interDevice: 5 },
};

/** The label faces drawn on the same geometry as a regular face, `oxaniumFacesOf`. */
const TWIN_FACES = [['F15', 'R15'], ['F13', 'R13']] as const;

/** A recipe's choice this family does not make, named, so a misspelt one is not silently a default. */
export class ChoiceError extends Error {}

/** The family's choices with a recipe's over its defaults. */
/**
 * The defaults of a build from nothing, on a donor of ours, the empty configuration, `todo-compile-650.md` 11:
 * our letters, the state colours and our pictures, which such a donor already is and the assembly refuses
 * any other for, and our letters blended, decided on 13 October 2026. `FOUR_SLOT_CHOICES` keeps the values
 * the constants had, Logitech's look, because an assembly on one of Logitech's compiles is held to their
 * compile byte for byte with those defaults, and only our letters can be blended.
 */
export const OUR_FOUR_SLOT_CHOICES: FourSlotChoices = {
  ...FOUR_SLOT_CHOICES,
  letters: 'oxanium',
  blendLetters: true,
  pictures: 'ours',
  backgrounds: 'state colours',
};

/**
 * A recipe's choices over the defaults, checked: `FOUR_SLOT_CHOICES` on one of Logitech's compiles and
 * `OUR_FOUR_SLOT_CHOICES` on a donor of ours. The two differ in four top level choices only, so the
 * parts given in part are completed from either.
 */
export function fourSlotChoices(given: FourSlotChoicesGiven = {}, defaults: FourSlotChoices = FOUR_SLOT_CHOICES): FourSlotChoices {
  for (const name of Object.keys(given)) {
    if (!(name in FOUR_SLOT_CHOICES)) throw new ChoiceError(`the Harmony 600, 650 and 700 make no choice called ${name}`);
  }
  for (const [name, part, defaults] of [
    ['settings', given.settings, FOUR_SLOT_CHOICES.settings],
    ['stateColours', given.stateColours, FOUR_SLOT_CHOICES.stateColours],
    ['delays', given.delays, FOUR_SLOT_CHOICES.delays],
    ['letterInks', given.letterInks, FOUR_SLOT_CHOICES.letterInks],
    ['faceWeights', given.faceWeights, FOUR_SLOT_CHOICES.faceWeights],
    ['icons', given.icons, FOUR_SLOT_CHOICES.icons],
  ] as const) {
    for (const key of Object.keys(part ?? {})) {
      if (!(key in defaults)) throw new ChoiceError(`${name} has no ${key}`);
    }
  }
  for (const [face, weight] of Object.entries(given.faceWeights ?? {})) {
    if (!(OXANIUM_WEIGHTS as readonly string[]).includes(weight)) {
      throw new ChoiceError(`${face} cannot be drawn in ${weight}: Oxanium's weights are ${OXANIUM_WEIGHTS.join(', ')}`);
    }
  }
  for (const [picture, icon] of Object.entries(given.icons ?? {})) {
    if (!iconNames().has(icon)) throw new ChoiceError(`the ${picture} cannot draw ${icon}: Material Design Icons has no icon of that name`);
  }
  // A label face and the regular face of its height are one geometry in two weights, so a reader tells
  // them apart only by Logitech's convention, the label face the heavier, `ladderOf`.
  const weights = { ...FOUR_SLOT_CHOICES.faceWeights, ...given.faceWeights };
  for (const [label, regular] of TWIN_FACES) {
    if (OXANIUM_WEIGHTS.indexOf(weights[label]) < OXANIUM_WEIGHTS.indexOf(weights[regular])) {
      throw new ChoiceError(`${label} in ${weights[label]} is lighter than ${regular} in ${weights[regular]}, `
        + 'and a label face must not be lighter than the regular face of its height or neither could be read back');
    }
  }
  return {
    ...defaults,
    ...given,
    settings: { ...FOUR_SLOT_CHOICES.settings, ...given.settings },
    stateColours: { ...FOUR_SLOT_CHOICES.stateColours, ...given.stateColours },
    delays: { ...FOUR_SLOT_CHOICES.delays, ...given.delays },
    letterInks: { ...FOUR_SLOT_CHOICES.letterInks, ...given.letterInks },
    faceWeights: { ...FOUR_SLOT_CHOICES.faceWeights, ...given.faceWeights },
    icons: { ...FOUR_SLOT_CHOICES.icons, ...given.icons },
  };
}
