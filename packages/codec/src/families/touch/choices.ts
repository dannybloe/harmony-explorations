/**
 * Every choice of ours the touch family makes, the Harmony One, with the value it had as a constant before
 * `todo-compile-650.md` 10.7.3 as its default. The rule that sorts a constant here rather than into the
 * module using it is `four-slot/choices.ts`'s: nothing on a remote or in Logitech's compiles fixes it.
 *
 * One survives the sort. The row fonts `menus.ts` keeps are the corpus's own, font 9 for a device page's
 * rows and font 7 for a menu's; the title is where this project departs from it.
 */
import type { OxaniumWeight } from '../../lettering.ts';
import type { CommonChoices } from '../family.ts';

export interface TouchChoices extends CommonChoices {
  /**
   * The font a composed device page's title is drawn in, as a base slot 7 index. The corpus titles its
   * device modes with font 10, which carries only the glyphs the existing titles use, so a new title would
   * be refused for most words; font 9, the row font, is the same height and the one set that carries the
   * whole alphabet the configuration draws anywhere.
   */
  readonly deviceTitleFont: number;
  /**
   * The colours of an activity's boxes, its pads on the working screen and its row on the activity menu, as
   * `#rrggbb`: the one colour it is filled with and the rim drawn around it. Logitech draws its activity pads
   * in a blue gradient and its device pads in orange. Ours were a blue gradient, the look agreed on 15 October
   * 2026, and are one flat blue since 16 October, first the middle of that gradient and then a deeper blue
   * chosen with the colour playground: a label's letters are smoothed against the colour behind them, which a
   * gradient does not have, `todo-compile-one.md` 1.2.11.2.1.
   */
  readonly activityBox: { readonly fill: string; readonly rim: string };
  /**
   * The colours of a device's boxes, its pads on a device page and its row on the device list, as `activityBox`.
   * Flat. A green chosen on 16 October 2026 with the colour playground, after Logitech's own orange-brown, the
   * average `#ae6a37` of its device gradient on the pads of all fifteen Harmony One compiles in the lab, was
   * tried and set aside; the rim is the one chosen for that orange-brown and kept.
   */
  readonly deviceBox: { readonly fill: string; readonly rim: string };
  /**
   * The colours of the settings screens' boxes, as `activityBox`: the rows on Options and the pads of the clock
   * pickers and Screen Sensitivity, which Logitech draws in a green gradient. Neither an activity's colour nor a
   * device's, so a third one, chosen on 18 October 2026 with the colour playground, `todo-compile-one.md` 5.3.2.
   * Nothing draws it yet: the pictures that take it are 5.3.1's.
   */
  readonly settingsBox: { readonly fill: string; readonly rim: string };
  /**
   * The weight a label on one of our boxes is lettered in, when the blending step smooths it against the box,
   * `touchLabelWeight`. Lighter than the Bold the configuration's own sets take, asked for on 16 October 2026.
   */
  readonly labelWeight: OxaniumWeight;
  /**
   * The weight the start up screen's "Starting" title is lettered in, in a set of its own smoothed against the
   * screen, `ExtraFontSet`: lighter than its face's Bold, asked for on 16 October 2026.
   */
  readonly startTitleWeight: OxaniumWeight;
  /**
   * The colour buttons, `colourbuttons.ts`: per colour, the labels that name it, compared without case, and the
   * colour its circle is drawn in. English and Dutch names by default, since the test setup is Dutch; the colours
   * chosen with the colour playground on 16 October 2026.
   */
  readonly colourButtons: Readonly<Record<string, { readonly names: readonly string[]; readonly colour: string }>>;
  /**
   * Whether a colour button keeps its word over the circle. Off by default: the circle alone was asked for first
   * on 16 October 2026, the word put back the same day since the first colours were hard to tell apart, and taken
   * off again once the colours chosen with the colour playground told them apart without it.
   */
  readonly colourButtonLabels: boolean;
  /**
   * The circle's diameter in pixels, alone and with the word, which it must then hold whole, and the outline
   * drawn around it, its colour and its width in pixels.
   */
  readonly colourCircle: {
    readonly alone: number; readonly withLabel: number; readonly outline: { readonly colour: string; readonly width: number };
  };
  /** The grid square, in pixels, an activity's icon is drawn in on its menu row and on its start up screen. */
  readonly activityIconGrid: { readonly row: number; readonly startup: number };
  /**
   * The icon of Material Design Icons, `icons.ts`, an activity of each MyHarmony type wears on its menu row
   * and its start up screen, drawn in white; a type not listed wears `otherActivityIcon`.
   */
  readonly activityIcons: Readonly<Record<string, string>>;
  readonly otherActivityIcon: string;
  /**
   * The icon a device list row wears, by Logitech's numeric device type as the catalogue states it,
   * `CatalogueDevice.deviceType`: only the four types `DEVICE_TYPE_NAMES` names are given one, and every other
   * device wears `otherDeviceIcon`, since an icon for an unnamed type would be a guess at what it is.
   */
  readonly deviceIcons: Readonly<Record<number, string>>;
  readonly otherDeviceIcon: string;
  /**
   * How many seconds the screen stays lit, `withScreenLight`, findings section 400. Logitech's compiles all hold
   * 10, which is the default; the test setup takes longer, asked for at the bench on 16 October 2026 since ten
   * seconds is too short to test with.
   */
  readonly screenLightSeconds: number;
  /**
   * Whether the remote shows the Remote Assistant's welcome, its "devices off" screen and the "Welcome!" screen when
   * it starts, `withoutStartupAssistant`, findings section 403. Logitech's compiles show them, and since a write
   * restarts the remote they come up after every write; off, asked for at the bench on 17 October 2026.
   */
  readonly startupAssistant: boolean;
  /**
   * Whether the configuration keeps the welcome tour (eleven screens) and the Remote Assistant (five) at all, findings
   * sections 412 and 421. Off, decided on 18 October 2026, since a person reads the manual instead: the sixteen
   * screens, the lists, hit pages and pictures only they reach are left out, and Options loses "Turn Remote Assistant
   * On" and "Tutorial", `withoutTourAndAssistant`. On, the configuration keeps Logitech's, and `startupAssistant`
   * decides whether the assistant shows at start.
   */
  readonly welcomeTour: boolean;
}

export const TOUCH_CHOICES: TouchChoices = {
  deviceTitleFont: 9,
  screenLightSeconds: 10,
  startupAssistant: false,
  welcomeTour: false,
  activityBox: { fill: '#166fa7', rim: '#bfeeff' },
  deviceBox: { fill: '#1c9c53', rim: '#e8cbb4' },
  settingsBox: { fill: '#f76100', rim: '#ffefde' },
  labelWeight: 'Medium',
  startTitleWeight: 'Medium',
  colourButtons: {
    red: { names: ['Red', 'Rood'], colour: '#db1200' },
    green: { names: ['Green', 'Groen'], colour: '#74a470' },
    yellow: { names: ['Yellow', 'Geel'], colour: '#e6c419' },
    blue: { names: ['Blue', 'Blauw'], colour: '#1164e8' },
  },
  colourButtonLabels: false,
  colourCircle: { alone: 32, withLabel: 38, outline: { colour: '#ffffff', width: 1.5 } },
  activityIconGrid: { row: 32, startup: 40 },
  activityIcons: {
    WatchTV: 'television-classic', WatchDvd: 'movie-open', ListenToMusic: 'music', PlayGame: 'gamepad-variant',
  },
  otherActivityIcon: 'remote-tv',
  deviceIcons: { 1: 'television', 2: 'vhs', 4: 'disc-player', 5: 'audio-video' },
  otherDeviceIcon: 'remote',
};
