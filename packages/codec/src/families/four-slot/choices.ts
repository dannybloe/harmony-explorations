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
 * **Three kinds of choice stay fixed for now, and why**, so that none is mistaken for a fact:
 *
 * * **The words**, "Devices", "Back", the menus' titles and bottom words, "Starting", the start up
 *   screen's three lines, "Turning system off" and "Exit". They are a language, and a user's to choose.
 *   But while a configuration is a Logitech compile patched, the pages the donor brings carry Logitech's
 *   English, and several readers find a page by its words (the placeholder, a menu by its title), so a
 *   chosen language would split one remote's screens between two and blind those readers. They become a
 *   choice when a configuration is built rather than patched, todo 11.1.1.
 * * **The letters' colours**, white over a black shadow and dark grey on the bars, decision 20
 *   (`lettering.ts`). The alphabet that reads our letters back recognises a glyph by those exact inks, so
 *   another ink would draw and then not read, and the byte tally counts our letters the same way. They
 *   become a choice once our letters are read by their shape alone, the way a blended letter already is
 *   (`letterStructure`), `todo-compile-650.md` 10.7.5.
 * * **Which of our faces letters each size**, `withOxaniumFonts`'s pick by a set's height and weight. The
 *   composers measure every label, title and counter in a ladder of sizes built from those faces,
 *   `OXANIUM_LABEL_SIZES`, and recognise a configuration in our letters by it, so another face would be
 *   measured in the wrong widths. It becomes a choice when the ladder is computed from the faces a
 *   configuration carries, which rendering any face on demand needs anyway, 10.8.
 */
import type { ActivityKey } from '../../activitykeys.ts';
import type { BackgroundColours } from '../../backgrounds.ts';
import { rgbTo565 } from '../../png.ts';
import type { WiringSettings } from '../../wiring.ts';
import type { CommonChoices, DelayDefaults } from '../family.ts';

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
   * The backgrounds of the five designed screens: Logitech's pictures, as the donor carries them, or one
   * flat colour per screen state, decision 20, `todo-compile-650.md` 9.1.2.1 (`withStateBackgrounds`).
   */
  readonly backgrounds: 'designed' | 'state colours';
  /** The colour of each screen state, as RGB565, when `backgrounds` is `state colours`. */
  readonly stateColours: Readonly<BackgroundColours>;
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
export type FourSlotChoicesGiven = Partial<Omit<FourSlotChoices, 'settings' | 'stateColours' | 'delays'>> & {
  readonly settings?: Partial<WiringSettings>;
  readonly stateColours?: Partial<BackgroundColours>;
  readonly delays?: Partial<DelayDefaults>;
};

export const FOUR_SLOT_CHOICES: FourSlotChoices = {
  letters: 'logitech',
  blendLetters: false,
  backgrounds: 'designed',
  // Decided on 10 October 2026, until a user's setting replaces them.
  stateColours: {
    device: rgbTo565(184, 32, 55),
    activity: rgbTo565(18, 37, 200),
    idle: rgbTo565(1, 136, 53),
  },
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

/** A recipe's choice this family does not make, named, so a misspelt one is not silently a default. */
export class ChoiceError extends Error {}

/** The family's choices with a recipe's over its defaults. */
export function fourSlotChoices(given: FourSlotChoicesGiven = {}): FourSlotChoices {
  for (const name of Object.keys(given)) {
    if (!(name in FOUR_SLOT_CHOICES)) throw new ChoiceError(`the Harmony 600, 650 and 700 make no choice called ${name}`);
  }
  for (const [name, part, defaults] of [
    ['settings', given.settings, FOUR_SLOT_CHOICES.settings],
    ['stateColours', given.stateColours, FOUR_SLOT_CHOICES.stateColours],
    ['delays', given.delays, FOUR_SLOT_CHOICES.delays],
  ] as const) {
    for (const key of Object.keys(part ?? {})) {
      if (!(key in defaults)) throw new ChoiceError(`${name} has no ${key}`);
    }
  }
  return {
    ...FOUR_SLOT_CHOICES,
    ...given,
    settings: { ...FOUR_SLOT_CHOICES.settings, ...given.settings },
    stateColours: { ...FOUR_SLOT_CHOICES.stateColours, ...given.stateColours },
    delays: { ...FOUR_SLOT_CHOICES.delays, ...given.delays },
  };
}
