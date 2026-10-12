/**
 * What a family of remotes does that another family does differently, plan 007: today, the three
 * composers whose work depends on the kind of screen, and the traits the shared composers ask about. A family is a plain object implementing this, put
 * together from its own modules and the shared ones; nothing inherits from anything, because the
 * differences between remotes cut across each other (the Harmony One and the 650 share a container and
 * infrared but not a screen) and a base class would grow conditions for its exceptions.
 *
 * The interface grows with plan 007's pipeline, the layout and serializer steps next. A new family
 * implements every member; the compiler refuses one that does not. `FamilyTraits` carries what differs
 * as data, for the shared composers, and `choices` every choice of ours the family makes, at its default,
 * `todo-compile-650.md` 10.7.3: a composer takes its family's choices in its options and falls back to
 * these.
 */
import type { Container, Instruction } from '../gspm.ts';
import type {
  ComposeActivityRowOptions, ComposeActivityScreenOptions, ComposedActivityRow, ComposedActivityScreen, ComposedScreen,
  ComposeRow, ComposeScreenOptions,
} from '../shared/menus.ts';

/**
 * The ways a family's action lists differ from another's that the shared composers have to know about,
 * read off Logitech's compiles of each family. Data and not code, so a shared composer asks a question
 * of its family rather than testing which remote it is for.
 */
export interface FamilyTraits {
  /**
   * Every command opens with the `0x7F` delay step, and a device carries its two delay variables and the
   * tables that map them, sections 287 and 288: the Harmony 600, 650 and 700.
   */
  readonly sendPrelude: boolean;
  /**
   * The shape of an activity's start. `start variable and flag`, section 290: a variable held at 1 while
   * the start runs, gating the inter device delay, and a flag written 1 before the working screen is
   * deferred, whose list enters the working screen itself. `timer cancel and active list`, section 279:
   * the timers cancelled, the "an activity is running" list called, and a deferred list that calls the
   * one showing the working screen.
   */
  readonly startSequence: 'start variable and flag' | 'timer cancel and active list';
  /** A screen item's list opens with the beeper, as every menu row of the Harmony One does, section 73. */
  readonly screenItemsBeep: boolean;
}

/** The delays a composed device starts with where nothing states one, in tenths of a second. */
export interface DelayDefaults {
  readonly powerOn: number;
  readonly interDevice: number;
}

/**
 * The choices a shared composer asks a family for, which every family's own choices include: a family
 * whose devices carry no delay variables, `FamilyTraits.sendPrelude` false, has no delays to choose.
 */
export interface CommonChoices {
  readonly delays?: DelayDefaults;
}

/** A composer's options with the family's choices, which default to the family's own. */
export type WithChoices<Options, Choices> = Options & { readonly choices?: Choices };

export interface Family<Choices extends CommonChoices = CommonChoices> {
  /** For a refusal or a report: the models this family serves, as a person names them. */
  readonly name: string;
  readonly traits: FamilyTraits;
  /** Every choice of ours this family makes, at its default: what a recipe may set for it. */
  readonly choices: Choices;
  /** A device's own screen: its page or pages, `composeDeviceScreen`. */
  composeDeviceScreen(c: Container, label: string, rows: readonly ComposeRow[], options: WithChoices<ComposeScreenOptions, Choices>): ComposedScreen;
  /** A row on the activity menu, once the shared prelude has found the menu and its marker. */
  composeActivityRow(
    c: Container, label: string, set: number, menu: number, marker: Instruction, options: WithChoices<ComposeActivityRowOptions, Choices>,
  ): ComposedActivityRow;
  /** An activity's working screen, `composeActivityScreen`. */
  composeActivityScreen(
    c: Container, activity: number, label: string, rows: readonly ComposeRow[], options: WithChoices<ComposeActivityScreenOptions, Choices>,
  ): ComposedActivityScreen;
}
