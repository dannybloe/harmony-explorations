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
import type { HardKey } from '../devicemode.ts';
import type { ActivityKeyRules, DeviceScreenItem } from '../activityroles.ts';
import type { Container, Instruction } from '../gspm.ts';
import type { Edit } from '../edit.ts';
import type { FaceOrRefusal, SetFace, SetMeasurement } from '../fonttable.ts';
import type { OxaniumFaceName } from '../lettering.ts';
import type { StateTableFacts } from '../statetables.ts';
import type { Writer } from '../emit.ts';
import type { ComposeActivity } from '../shared/activities.ts';
import type { ComposeDevice, ComposedDevice } from '../shared/devices.ts';
import type { WiringChecked } from '../wiringparts.ts';
import type { BlendedSet } from '../blending.ts';
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
  /** A screen item's list opens with the beeper, as every menu row of the Harmony One does, section 73. */
  readonly screenItemsBeep: boolean;
}

/** One action list as its instructions, `[operand, opcode]` each, the form `appendActionLists` takes. */
export type ListBody = readonly (readonly [operand: number, opcode: number])[];

/** One send of a device being composed: the record it sends and the quantity its `0x7C` carries. */
export interface DeviceSend {
  readonly record: number;
  readonly quantity: number;
}

/** A device's lists as its family's send lays them out, `DeviceSends.lay`. */
export interface LaidDeviceSends {
  /** The lists from the first of the device's on: one send list per send in their order, then the family's own. */
  readonly bodies: readonly Writer[];
  /** The first list after them, where the shared composer lays out the power actions' own lists. */
  readonly next: number;
  /** The list the power variable runs to switch the device on, or undefined where it runs the on action itself. */
  readonly switchOn: number | undefined;
  /**
   * The family's own fields of `ComposedDevice`, read off the configuration once the power variable went in and
   * renumbered whatever sits above it: the four slot family's two delays, nothing on the touch family.
   */
  described(named: Container): Pick<ComposedDevice, 'delay' | 'powerOnDelay'>;
}

/** What the device composer gets from its family's send before it reads base slot 10, `SendShape.device`. */
export interface DeviceSends {
  /** The configuration the lists go into: the infrared group's, with whatever the family's sends need first. */
  readonly container: Container;
  /** The device's lists, from `firstList` on; `onCalls` are the lists the on action calls, in order. */
  lay(firstList: number, sends: readonly DeviceSend[], onCalls: readonly number[]): LaidDeviceSends;
}

/** A list in a configuration's ordinary send shape, as `SendShape.sendLists` reads it. */
export interface SendList {
  readonly list: number;
  readonly group: number;
  readonly code: number;
  readonly quantity: number;
  /**
   * The four slot family's delay step, section 287: the device's delay list, which every command's private
   * condition list calls, and the operands of the private load and condition. What a new send list's own pair
   * copies, `SendShape.newSendLists`.
   */
  readonly prelude?: { readonly delay: number; readonly load: number; readonly condition: number };
}

/**
 * How a family's commands are sent, `todo-compile-one.md` 3.3.3.4: three lists with a delay prelude on the
 * Harmony 600, 650 and 700, section 287, and the send and its quantity alone on the Harmony One, section 278.
 * One member, asked by every shared composer that builds or matches a send: the device composer, the input
 * composer, the sequence composer and the donor input matcher. Until then each of them tested a trait,
 * `sendPrelude`, and built the shape itself.
 */
export interface SendShape {
  /** How many lists one send of a composed device's command takes, its own first: 3 or 1. */
  readonly listsPerSend: number;
  /**
   * A device's sends and what they need, `composeDeviceFor`'s family half: `delays` are the family's where
   * the device states none, `CommonChoices.delays`, refused by a family that needs them and has none.
   */
  device(c: Container, group: number, device: ComposeDevice, delays: DelayDefaults | undefined): DeviceSends;
  /**
   * The list a composed device's power variable runs to switch it on, which `composeDeviceInputs` appends its
   * resets to, read off the configuration or the composed device; `list` is the power on delay's list where
   * the device has one of its own.
   */
  switchOnList(c: Container, device: ComposedDevice): { readonly list?: number; readonly on: number } | undefined;
  /**
   * What writes a new send of a composed device's command at list `list`, its own lists from there in order,
   * `composeDeviceInputs`; read off the configuration once, refused where the device's sends do not read.
   */
  sendWriter(c: Container, device: ComposedDevice): (list: number, group: number, record: number, amount: number) => ListBody[];
  /** Every list in the configuration's ordinary send shape, `composeSequence`. */
  sendLists(c: Container): SendList[];
  /** The lists a new send takes from `list` on, given the configuration's own, `composeSequence`. */
  newSendLists(existing: readonly SendList[], group: number, code: number, quantity: number, list: number): ListBody[];
  /** Which record a sequence's command sends where the caller does not say, `ComposeSequence.records`, section 349. */
  readonly sequenceRecords: 'copy' | 'named';
  /** Why a sequence's one block copy is refused on this family, or undefined where it is composed. */
  readonly oneBlockCopyRefusal: string | undefined;
  /**
   * The lists among `lists` that send `operand` alone, a donor's command found by its code,
   * `composeDonorDeviceInputs`. Absent where the family's send has not been matched, which refuses.
   */
  donorSendList?(lists: readonly (readonly Instruction[])[], operand: number): number[];
}

/** The screens an activity's start enters, `ComposeActivity.screen`. */
export type ActivityStartScreen = NonNullable<ComposeActivity['screen']>;

/**
 * The shape of an activity's start, `todo-compile-one.md` 3.3.3.4: what the shared activity composer asks once
 * an activity has its screens. Section 290 on the Harmony 600, 650 and 700, a variable held at 1 while the start
 * runs, gating the inter device delay, and a flag written 1 before the working screen is deferred, whose list
 * enters the working screen itself; section 279 on the Harmony One, the timers cancelled, the "an activity is
 * running" list called, and a deferred list that calls the one showing the working screen. Until then the
 * composer tested a trait, `startSequence`, and built both itself.
 */
export interface ActivityStart {
  /**
   * Refuses a screen this start cannot run, before anything is built: `set` is the activity's keypad map, `lists`
   * how many base slot 10 lists exist, `variables` how many state variables.
   */
  checkScreen(c: Container, screen: ActivityStartScreen, at: { set: number; lists: number; variables: number }): void;
  /**
   * The enter list around `writes`, the activity's own state writes and the counter's last, with the enter
   * list at `first`, the select list after it, and `after` the lists from `first + 2` on.
   */
  lists(screen: ActivityStartScreen, first: number, writes: ListBody): { enter: ListBody; after: readonly ListBody[] };
  /**
   * Tag 5's own list, picking the running activity again, where a caller names none: `inputs` are the start's
   * input writes in its order, section 313. Absent where the family keeps section 273's default, the enter list.
   */
  resume?(screen: ActivityStartScreen, inputs: ListBody): ListBody;
}

/** The delays a composed device starts with where nothing states one, in tenths of a second. */
export interface DelayDefaults {
  readonly powerOn: number;
  readonly interDevice: number;
}

/**
 * The choices a shared composer asks a family for, which every family's own choices include: a family
 * whose devices carry no delay variables, the Harmony One's send, `Family.sends`, has no delays to choose.
 */
export interface CommonChoices {
  readonly delays?: DelayDefaults;
  /**
   * The activity key each MyHarmony type of activity takes, where the family's remotes have activity keys:
   * the Harmony 600, 650 and 700, section 314. The Harmony One has none. A key by the name printed on it,
   * which names the family's `activityKeyEditor` knows.
   */
  readonly activityKeys?: Readonly<Record<string, string | undefined>>;
}

/** What one activity key does, as a family's `activityKeyEditor` reads it. */
export interface ActivityKeyState {
  /** The key by the name printed on it. */
  readonly key: string;
  /**
   * `activity` when it starts the activity whose key map is base slot 9 entry `set`, `placeholder` when it
   * opens the family's screen for a key with no activity, and `other` for anything else.
   */
  readonly kind: 'activity' | 'placeholder' | 'other';
  readonly set?: number;
}

/**
 * The hard keys that each start one activity, read and put an activity on, where a family's remotes have
 * them: the three of the Harmony 600, 650 and 700, section 314. What a shared composer asks of them, so it
 * neither knows where a family keeps its keys nor which names they have.
 */
export interface ActivityKeyEditor {
  /** Refuses, with the reason, a key this configuration cannot take an activity on; asked before anything is built. */
  check(c: Container, key: string): void;
  /** What each of the family's activity keys does, in the family's order. */
  read(c: Container): readonly ActivityKeyState[];
  /** The edits that put the activity whose key map is base slot 9 entry `set` on `key`. */
  set(c: Container, key: string, set: number): Edit[];
}

/**
 * How a family's font sets are lettered in our letters, `withOxaniumFonts`, `todo-compile-one.md` 3.3.3.5: the
 * shared font table measures each of Logitech's sets the same way on every family and asks this which face of
 * ours it becomes, whether two sets may point at one glyph, and whether the family's faces were measured on
 * the configuration's skin at all.
 */
export interface FamilyFonts {
  /** The faces of ours the family's sets are lettered in, `lettering.ts`'s `OXANIUM_FACE_SPECS`, in the family's order. */
  readonly faces: readonly OxaniumFaceName[];
  /**
   * The face of ours a set measured so is lettered in, or why none of the family's faces fits it, which the
   * font table refuses with. A reason and not a throw, so a family's module needs nothing of the font table's
   * but its types.
   */
  faceOf(set: SetMeasurement): FaceOrRefusal;
  /**
   * Whether two sets may point at one glyph, which needs the firmware's text routine read to find a glyph from
   * its own set's pointer alone, section 368.
   */
  readonly sharesGlyphs: boolean;
  /** Why the font table is not built for a configuration of this family in `skin`, or undefined where it is. */
  refusal(skin: number): string | undefined;
}

/** A composer's options with the family's choices, which default to the family's own. */
export type WithChoices<Options, Choices> = Options & { readonly choices?: Choices };

export interface Family<Choices extends CommonChoices = CommonChoices> {
  /** For a refusal or a report: the models this family serves, as a person names them. */
  readonly name: string;
  readonly traits: FamilyTraits;
  /** Every choice of ours this family makes, at its default: what a recipe may set for it. */
  readonly choices: Choices;
  /**
   * Which command each hard key sends in a catalogue device's device mode, as Logitech's compiler binds them
   * for this family: per key, the commands it takes in order of preference, `deviceModeLayout`.
   */
  readonly deviceModeKeys: readonly HardKey[];
  /** The keys section 323's activity keypad rule names, on this family's keypad. */
  readonly activityKeyRules: ActivityKeyRules;
  /**
   * The family's activity keys, where its remotes have them: the Harmony 600, 650 and 700's three, section
   * 314. Absent on the Harmony One, which has none, so a composer asked to put an activity on one refuses.
   */
  readonly activityKeyEditor?: ActivityKeyEditor;
  /**
   * What `buildStateTables` builds this family's base slots 0, 13 and 14 from, and `describeStateTables` reads
   * them by: the Harmony 600, 650 and 700's, `todo-compile-650.md` 10.3, and the Harmony One's, whose tables
   * differ in four values, `todo-compile-one.md` 2.3, built since 6.4.
   */
  readonly stateTables: StateTableFacts;
  /**
   * The family's own wiring, the event map, the leading list, the timers, base slot 9's fixed entries and the
   * lists they reach: a configuration's checked against what the family's builder makes from the description
   * read off it, byte for byte, refused at the first difference. The Harmony 600, 650 and 700's is
   * `families/four-slot/wiring.ts`, sections 347 and 360; the Harmony One's `families/touch/wiring.ts`, section 410.
   */
  readonly wiring: { check(c: Container): WiringChecked };
  /**
   * How the family's font sets become our letters: the Harmony 600, 650 and 700's nine faces, measured on the
   * 650 alone, `families/four-slot/fonts.ts`; the Harmony One's five, `families/touch/fonts.ts`, section 396.
   */
  readonly fonts: FamilyFonts;
  /**
   * How the family's commands are sent: the Harmony 600, 650 and 700's delay prelude,
   * `families/four-slot/sends.ts`, and the Harmony One's send and quantity alone, `families/touch/sends.ts`.
   */
  readonly sends: SendShape;
  /**
   * The shape of an activity's start: the Harmony 600, 650 and 700's, `families/four-slot/start.ts`, and the
   * Harmony One's, `families/touch/start.ts`.
   */
  readonly activityStart: ActivityStart;
  /**
   * What composing an activity changes in the family's own wiring, asked before anything is built with the key
   * the activity goes on: undefined where nothing changes, or what rebuilds the finished configuration's
   * wiring. On the Harmony 600, 650 and 700 the first activity, or one put on an empty key, changes scan 4's
   * front list and the empty keys' own, section 379. Absent on the Harmony One, whose wiring an activity leaves.
   */
  activityRewiring?(c: Container, activityKey: string | undefined): ((bytes: Uint8Array) => Uint8Array) | undefined;
  /** The commands a mode's pages show, page by page in this family's item order, with each one's drawn label. */
  screenItems(c: Container, mode: number): DeviceScreenItem[];
  /** Whether an item is drawn the way this family draws a command called `name`. */
  drawsName(c: Container, item: DeviceScreenItem, name: string): boolean;
  /** A device's own screen: its page or pages, `composeDeviceScreen`. */
  composeDeviceScreen(c: Container, label: string, rows: readonly ComposeRow[], options: WithChoices<ComposeScreenOptions, Choices>): ComposedScreen;
  /**
   * The activity menu's mode, or undefined where the configuration has none this family can find. How a
   * family finds it differs: by structure on the four slot screens, section 375, by its rows on the touch
   * screens, section 275.
   */
  activityMenu(c: Container): number | undefined;
  /**
   * The menu marker as a writer other than a menu row names it, or undefined where the family has none
   * measured, which `menuMarkerOf` holds to the rows' answer: on the four slot screens the list the press of
   * More Activities runs from base slot 9 entry 1 writes it 0 first, section 375.
   */
  menuMarkerWriter(c: Container): number | undefined;
  /** A row on the activity menu, once the shared prelude has found the menu and its marker. */
  composeActivityRow(
    c: Container, label: string, set: number, menu: number, marker: Instruction, options: WithChoices<ComposeActivityRowOptions, Choices>,
  ): ComposedActivityRow;
  /**
   * The device list an activity's Devices key opens, given after the activity has its row: one of the activity's
   * own on both families, every device with those its start switches on first, `startSwitchedOn`; the Harmony 600,
   * 650 and 700's `composeActivityDeviceList`, section 352, and the Harmony One's `withTouchActivityDeviceList`,
   * section 424. Returns the configuration's bytes.
   */
  activityDeviceList(c: Container, activity: number): Uint8Array;
  /** An activity's working screen, `composeActivityScreen`. */
  composeActivityScreen(
    c: Container, activity: number, label: string, rows: readonly ComposeRow[], options: WithChoices<ComposeActivityScreenOptions, Choices>,
  ): ComposedActivityScreen;
  /**
   * The family's look over a setup composed onto a Logitech compile, `composeSetup`, where it has one: the donor
   * lettered in ours before anything is composed, and the rest over the composed file. Absent, the composed
   * file keeps the donor's look. The Harmony One's, `todo-compile-one.md` 1.2.11.2.7.
   */
  readonly composedLook?: {
    letterDonor(c: Container, choices: Choices): { readonly bytes: Uint8Array; readonly faces: readonly SetFace[] };
    /**
     * The faces of a donor of ours, an empty configuration of the family's, which is in our letters already and is
     * not lettered again; undefined for a Logitech compile. Refuses a donor of ours that is blended, since the look's
     * blending runs once, over the composed file. The Harmony One's, `todo-compile-one.md` 8.1.2. Absent, every donor
     * is lettered.
     */
    donorOfOurs?(c: Container, choices: Choices): readonly SetFace[] | undefined;
    /**
     * The look over the composed file, with the copies of each set its blending made, `withBlendedLetters`, so
     * that a reader of the result can point a blended select back at the set it was blended from,
     * `unblendedSelects`; empty where the look blends nothing.
     */
    look(c: Container, faces: readonly SetFace[], choices: Choices, deviceType: (name: string | undefined) => number | undefined):
      { readonly container: Container; readonly blended: readonly BlendedSet[] };
  };
  /**
   * The parts the family's builders make from a description over a setup composed onto a Logitech compile,
   * `composeSetup`, where it has builders for parts the donor carries: run after the composers and before the
   * look, each part described off the configuration composed so far, built, and put in place of the donor's,
   * so its bytes come out of the builder rather than out of the donor. Refuses with the builder's refusal where
   * a builder refuses the configuration, never falling back to the donor's part; returns the configuration and
   * the names of the parts built, in the order built. The Harmony One's, `todo-compile-one.md` 3.2.2:
   * `families/touch/builders.ts`. Absent, every part no composer writes stays the donor's.
   *
   * `composed` is the devices the composers added, in the order composed, since `todo-compile-one.md` 3.2.2.4:
   * a part that asks about every device, the Harmony One's power off help, has to be told which devices are new
   * and what the catalogue states of them, which the configuration does not say.
   *
   * `choices` is the family's, since `todo-compile-one.md` 4.10: what a configuration of ours holds that Logitech's
   * do not, the Harmony One's welcome tour and Remote Assistant left out unless chosen, is the builders' to make.
   */
  composedBuilders?(
    c: Container, composed: readonly ComposedDeviceNote[], choices: Choices, options?: ComposedBuildersOptions,
  ): { readonly container: Container; readonly built: readonly string[] };
  /**
   * The skins `composeSetup` has been run on for this family, where it composes a setup onto a donor at all; a
   * skin outside it is refused. Absent, the family's setups are not composed that way. The Harmony One's is skin
   * 54, which the spare Harmony One reports, `todo-compile-one.md` 1.2; it was a set in `shared/setup.ts` until
   * 3.3.3.2.
   */
  readonly composedSkins?: ReadonlySet<number>;
}

/** What `composedBuilders` is told of the donor beyond the configuration itself. */
export interface ComposedBuildersOptions {
  /**
   * Whether the donor is one of ours, `composedLook.donorOfOurs`, `todo-compile-one.md` 8.1.2: its pictures are ours
   * already, so no step turning Logitech's into ours runs.
   */
  readonly donorOfOurs?: boolean;
}

/**
 * A device the composers added to a donor, as a builder on the composed path is told of it, `composedBuilders`:
 * what the setup and the catalogue say of it that the configuration does not.
 */
export interface ComposedDeviceNote {
  /** The setup's name for it, which a screen asking about it draws. */
  readonly name: string;
  /** Its label in the configuration, the stem of its state variables' names, `deviceVariables`. */
  readonly label: string;
  /** The power type the catalogue states, where it states one: a toggle sends the same steps on and off. */
  readonly power?: 'discrete' | 'toggle';
}
