/**
 * What model a connected remote is, and what its hardware can do.
 *
 * The join a user interface needs, and the reason this is in `packages/usb` rather than in the codec:
 * the question starts at the device. `GET_VERSION` reports a **skin** number, `models.ts` turns that
 * into a model, and the model carries the capabilities. A config cannot answer this. It states its
 * architecture, section slot 1, and an architecture spans a monochrome and a colour panel at once.
 *
 * **The capability fields are third party and unconfirmed**, from the comparison table at
 * harmony-remote-forum.de, which is a community site and not Logitech. They have the same standing as
 * an upstream finding: hypotheses to test, useful for deciding what to build, never the basis of a
 * rail. `reference/capabilities.md` holds the argument, the per field confirmation status and the
 * three places our own measurements agree with them. What is **not** third party is `skin` and
 * `architecture`: those come from `reference/models.md`, out of Logitech's own client, with five
 * skins confirmed against firmware literals and live remotes.
 *
 * Only architectures `packages/usb` can address are here. Arch 15, the 900, 1000, 1000i, 1100 and
 * 1100i, enumerates as a network class rather than HID, so the transport cannot reach it and a
 * capability record for it would be a promise this library cannot keep.
 */

/** What kind of panel a model has, which is the field a renderer needs and a config cannot state. */
export type Panel = 'colour' | 'monochrome' | 'none';

/** Whether a model senses movement, and how the table distinguishes two generations of it. */
export type MotionSensor = 'tilt' | 'motion' | 'none';

export interface Model {
  /** The name Logitech marketed it under, in the region the skin belongs to. */
  readonly name: string;
  /**
   * The same product's name in the other region, where there is one, from the comparison table's own
   * "Eur#" column.
   *
   * **An alias is not the same hardware, and this comment said it was for an hour.** The two remotes
   * share a specification row and differ in their keypad: the European 525 carries four colour keys
   * where the 520 has none, and the European 885 carries them where the 880 has a pair of chevrons
   * instead. Two independent pairs differing the same way, with a mechanism, since colour keys are
   * teletext and teletext is European.
   *
   * So the fields in this record are shared and the **button count is not**, which is the better
   * reading of why two skins exist at all: a skin names a keypad, and the keypads happen to split by
   * region. That is also why the firmware needs it. A silhouette therefore belongs to a skin rather
   * than to a model.
   */
  readonly alias?: string;
  /** Which config format and USB rules apply. `reference/models.md`, from Logitech's own client. */
  readonly architecture: number;
  /** Devices the host software would let a config hold. An upper bound, not a promise. */
  readonly maxDevices: number;
  /** Favourite channel buttons, or undefined where the model has none. */
  readonly favourites?: number;
  readonly panel: Panel;
  /**
   * Whether the screen is a touch panel.
   *
   * The one capability field this project has confirmed on its own, and by a negative: base slot 17
   * is a touch hit map on arch 12 and names the picture bank everywhere else, sections 45 and 62. The
   * only arch 12 model here is the One, and it is the only one this table calls touch. So the two
   * agree without either having been derived from the other.
   */
  readonly touch: boolean;
  /** Radio channels for an extender, where the model has one. */
  readonly rfChannels?: number;
  /** Whether the firmware runs action lists of more than one instruction. */
  readonly macros: boolean;
  /**
   * A dedicated button that pages through a mode's screens.
   *
   * Absent on the 5xx, which is consistent with what its configs do rather than a gap: the four soft
   * keys carry opcode `0x7E`, "enter the base slot 6 mode the operand indexes", 57 and 18 times
   * across the two 525 configs, so paging is a soft key binding there.
   */
  readonly pageButton: boolean;
  /** The sound and picture shortcut pair. */
  readonly soundPictureButtons: boolean;
  /**
   * The newest firmware version the comparison table knows about.
   *
   * **A lower bound and out of date, measured rather than assumed**: the table says 2.5.0 for the 700
   * where the lab holds 2.8, and 0.2 for the 650 where it holds 0.4. It is kept because it is right
   * about the two bench remotes, 3.4.0 on the One and 0.2 on the 600, and because a version below it
   * is a remote nobody has updated.
   */
  readonly firmwareSeen?: string;
}

/**
 * Skin number to model. The key is what a remote reports, so this is the lookup a session makes.
 *
 * Bold entries in `reference/models.md` are the five confirmed independently: 15, 22, 54, 66, 71 and
 * 72. The rest are the client's table, which those five calibrate.
 */
export const MODELS_BY_SKIN: Readonly<Record<number, Model>> = {
  3: { name: '768', architecture: 3, maxDevices: 15, panel: 'monochrome', touch: false, macros: true, pageButton: false, soundPictureButtons: false },
  7: { name: '748', architecture: 3, maxDevices: 15, panel: 'monochrome', touch: false, macros: false, pageButton: false, soundPictureButtons: false },
  9: { name: '659', architecture: 7, maxDevices: 15, favourites: 18, panel: 'monochrome', touch: false, macros: true, pageButton: true, soundPictureButtons: true, firmwareSeen: '4.1.0' },
  10: { name: '688', architecture: 7, maxDevices: 15, favourites: 18, panel: 'monochrome', touch: false, macros: true, pageButton: true, soundPictureButtons: true, firmwareSeen: '4.1.0' },
  12: { name: '676', architecture: 7, maxDevices: 15, favourites: 18, panel: 'monochrome', touch: false, macros: true, pageButton: true, soundPictureButtons: true, firmwareSeen: '4.1.0' },
  13: { name: '628', architecture: 7, maxDevices: 12, panel: 'monochrome', touch: false, macros: true, pageButton: false, soundPictureButtons: false, firmwareSeen: '4.1.0' },
  14: { name: '680', architecture: 7, maxDevices: 15, favourites: 18, panel: 'monochrome', touch: false, macros: true, pageButton: false, soundPictureButtons: true, firmwareSeen: '4.1.0' },
  // Confirmed from four configs, and the arch 8 control for container claims.
  15: { name: '880', alias: '885', architecture: 8, maxDevices: 15, favourites: 16, panel: 'colour', touch: false, macros: true, pageButton: true, soundPictureButtons: false, firmwareSeen: '4.4.2' },
  17: { name: '885', alias: '880', architecture: 8, maxDevices: 15, favourites: 16, panel: 'colour', touch: false, macros: true, pageButton: true, soundPictureButtons: false, firmwareSeen: '4.4.2' },
  18: { name: '520', alias: '525', architecture: 9, maxDevices: 15, panel: 'monochrome', touch: false, macros: true, pageButton: false, soundPictureButtons: false, firmwareSeen: '3.0' },
  19: { name: '890', alias: '895', architecture: 10, maxDevices: 15, favourites: 16, panel: 'colour', touch: false, rfChannels: 6, macros: true, pageButton: true, soundPictureButtons: false, firmwareSeen: '4.9.0' },
  // The bench remote, confirmed. Its capabilities are the 520's row, because it is the 520.
  22: { name: '525', alias: '520', architecture: 9, maxDevices: 15, panel: 'monochrome', touch: false, macros: true, pageButton: false, soundPictureButtons: false, firmwareSeen: '3.0' },
  23: { name: '895', alias: '890', architecture: 10, maxDevices: 15, favourites: 16, panel: 'colour', touch: false, rfChannels: 6, macros: true, pageButton: true, soundPictureButtons: false, firmwareSeen: '4.9.0' },
  36: { name: 'Xbox 360', architecture: 9, maxDevices: 11, panel: 'monochrome', touch: false, macros: true, pageButton: false, soundPictureButtons: false, firmwareSeen: '3.0.0' },
  // Gin, confirmed: the Harmony One. The only touch panel this library can address.
  54: { name: 'One', architecture: 12, maxDevices: 15, favourites: 24, panel: 'colour', touch: true, macros: true, pageButton: true, soundPictureButtons: false, firmwareSeen: '3.4.0' },
  65: { name: '610', architecture: 7, maxDevices: 5, favourites: 23, panel: 'monochrome', touch: false, macros: true, pageButton: false, soundPictureButtons: false, firmwareSeen: '3.5.0' },
  // Confirmed from two configs.
  66: { name: '700', architecture: 14, maxDevices: 6, favourites: 23, panel: 'colour', touch: false, macros: true, pageButton: true, soundPictureButtons: false, firmwareSeen: '2.5.0' },
  67: { name: '515', alias: '510', architecture: 9, maxDevices: 5, panel: 'monochrome', touch: false, macros: true, pageButton: false, soundPictureButtons: false, firmwareSeen: '3.4.0' },
  68: { name: '510', alias: '515', architecture: 9, maxDevices: 5, panel: 'monochrome', touch: false, macros: true, pageButton: false, soundPictureButtons: false, firmwareSeen: '3.4.0' },
  // The bench remote, confirmed. Monochrome, and its config carries two byte pixels anyway.
  71: { name: '600', architecture: 14, maxDevices: 5, favourites: 23, panel: 'monochrome', touch: false, macros: true, pageButton: true, soundPictureButtons: false, firmwareSeen: '0.2' },
  // Confirmed from its safe mode container.
  72: { name: '650', architecture: 14, maxDevices: 5, favourites: 23, panel: 'colour', touch: false, macros: true, pageButton: true, soundPictureButtons: false, firmwareSeen: '0.2' },
};

/**
 * Models with no skin number recorded anywhere, so a connected one cannot be recognised.
 *
 * Kept because the capability data is worth having when a contributor names their remote, and because
 * an empty list here would suggest the skin table is complete. It is 46 entries against Logitech's
 * own 40 model retirement list plus the four MyHarmony era remotes, and these fall outside it.
 */
export const MODELS_WITHOUT_A_SKIN: readonly Model[] = [
  { name: '550', alias: '555', architecture: 9, maxDevices: 15, panel: 'monochrome', touch: false, macros: true, pageButton: true, soundPictureButtons: true, firmwareSeen: '3.0' },
  { name: '620', architecture: 7, maxDevices: 12, panel: 'monochrome', touch: false, macros: true, pageButton: false, soundPictureButtons: true, firmwareSeen: '4.1.0' },
  { name: '665', architecture: 14, maxDevices: 10, favourites: 23, panel: 'colour', touch: false, macros: true, pageButton: true, soundPictureButtons: false, firmwareSeen: '0.2' },
  { name: '670', architecture: 7, maxDevices: 15, panel: 'monochrome', touch: false, macros: true, pageButton: true, soundPictureButtons: true, firmwareSeen: '4.1.0' },
  { name: '720', alias: '785', architecture: 8, maxDevices: 12, favourites: 24, panel: 'colour', touch: false, macros: true, pageButton: true, soundPictureButtons: false, firmwareSeen: '4.4.2' },
  { name: '745', architecture: 2, maxDevices: 15, panel: 'monochrome', touch: false, macros: true, pageButton: false, soundPictureButtons: false },
  { name: '880 Pro', architecture: 8, maxDevices: 15, favourites: 16, panel: 'colour', touch: false, macros: true, pageButton: true, soundPictureButtons: true, firmwareSeen: '4.4.2' },
  { name: '890 Pro', architecture: 10, maxDevices: 15, favourites: 16, panel: 'colour', touch: false, rfChannels: 6, macros: true, pageButton: true, soundPictureButtons: true, firmwareSeen: '4.9.0' },
];

/**
 * The models this library deliberately cannot describe, and why, so the gap is a statement.
 *
 * Arch 15 enumerates as a network class rather than HID. `openHarmony` will not find one, so a
 * capability record would be reachable only by a caller who already knows the model, which is the
 * opposite of what this module is for.
 */
export const OUT_OF_TRANSPORT_REACH: readonly string[] = ['900', '1000', '1000i', '1100', '1100i'];

/** The model a skin names, or undefined when the table does not have it. */
export function modelForSkin(skin: number | undefined): Model | undefined {
  return skin === undefined ? undefined : MODELS_BY_SKIN[skin];
}

/**
 * Whether an architecture has a touch panel in any model this table knows.
 *
 * The question a reader of base slot 17 wants answered, and it is per architecture rather than per
 * model because that is how the firmware differs: only arch 12 seeks that slot as a hit map.
 */
export function architectureHasTouch(architecture: number): boolean {
  return Object.values(MODELS_BY_SKIN).some(
    (m) => m.architecture === architecture && m.touch,
  );
}
