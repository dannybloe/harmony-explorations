/**
 * What a drawn remote is, as data.
 *
 * The geometry is the source of truth and `reference/silhouettes/<id>.svg` is generated from it.
 * That is not a preference about file formats: FreeHarmony needs the list of buttons as data, to
 * colour every key that drives one device and to say which key a click landed on, and a list that
 * exists only as XML attributes would either be parsed back at runtime or copied into a second
 * table. Two copies of a derivation is this repository's oldest rule.
 *
 * Coordinates are this model's own, with y growing downward as SVG has it, and the case fills
 * `CASE_HEIGHT` exactly. Every model shares that height so the interface can show a Harmony 525 and
 * a Harmony 600 at the same size; the width follows from the model's own proportions. Nothing here
 * encodes which remote is physically longer, because nobody has measured that and guessing it would
 * look like a measurement.
 */

/** The nominal height every model's case fills. Arbitrary, and the same for all of them on purpose. */
export const CASE_HEIGHT = 1000;

/**
 * Where a button's name came from.
 *
 * `catalogue` means the name is in `reference/button-maps.md`, recovered from a config Logitech
 * compiled for this project by decoding what each scan code sends and looking the frame up in that
 * account's own command catalogue. Those are Logitech's own words for these keys.
 *
 * `printed` means we chose the name because the key says it: `Help`, `Activities`, `Glow`. Sound,
 * and not a measurement, which is why the two are told apart rather than merged. A test asserts the
 * split in both directions.
 */
export type Provenance = 'catalogue' | 'printed';

/**
 * Which population a key belongs to, which is a real division and not a label.
 *
 * `docs/findings.md` section 128: a scan bound by a mode page is a key the screen speaks for, a scan
 * bound by a base slot 9 set is a key on the keypad, and the two share no code at all on three of
 * the four architectures and exactly one on arch 8. It matters to the interface because colouring by
 * device works on the keypad group, while what a screen key does depends on the page in force.
 *
 * `touch` is arch 12 (Harmony One) only: base slot 17 states the rectangle, so those keys have no
 * shape of their own on the case at all.
 */
export type KeyKind = 'keypad' | 'screen' | 'touch';

/** The layers, each switchable so a thumbnail can drop the text and keep the shape. */
export const LAYERS = ['case', 'screen', 'keys', 'icons', 'text'] as const;
export type LayerName = (typeof LAYERS)[number];

/**
 * A drawn outline in model coordinates.
 *
 * Everything becomes a path, including what starts as a rectangle, because the vocabulary has to
 * cover all three models and two of them need more than a box: a Harmony One's transport keys are
 * slanted wedges and a Harmony 525's volume and channel keys are segments of a ring around its
 * direction pad, which no rotated rectangle can be.
 *
 * `angle` is **not** baked into `path`. It becomes a rotation on the key's own group, so the
 * lettering and the symbol rotate with the key for free, which is what they do on the real remote
 * because they are printed on it.
 */
export interface Shape {
  /**
   * What kind of shape it is, which is a note to a reader rather than something the drawing uses.
   *
   * `traced` means the path came out of the traced drawing and was not rebuilt from a box and a radius.
   * That distinction is worth keeping visible: the keys on these remotes are not pills, they are four
   * cubics with no straight side at all, and fitting a rounded rectangle to one sits a whole unit out
   * on a key nine units tall. So a traced shape is the drawing's own outline, and nothing here should
   * try to improve it.
   */
  readonly form: 'pill' | 'roundRect' | 'circle' | 'poly' | 'arc' | 'traced';
  readonly path: string;
  /** The centre, which is what a label and a symbol are placed against and what a rotation turns about. */
  readonly cx: number;
  readonly cy: number;
  /** The extent before rotation, used to place a label beside the key and to size its symbol. */
  readonly w: number;
  readonly h: number;
}

/** Where a printed word sits relative to its key. On the real remotes all five of these occur. */
export type LabelPlace = 'on' | 'above' | 'below' | 'left' | 'right';

export interface Label {
  /**
   * An absolute place, in model coordinates, for a word whose key is not a useful guide.
   *
   * Normally a label is placed against its key's own box by `place`. That fails for a **moulding
   * segment**, whose box is the whole part: `Glow` on a Harmony 525 is printed at the bottom of a band
   * whose segment covers a quarter of the remote, so the rule would centre it on the direction pad.
   */
  readonly x?: number;
  readonly y?: number;
  readonly text: string;
  readonly place: LabelPlace;
  /**
   * `small` is for the secondary printing: `abc` under a digit, `Replay` under a key whose face
   * carries only a symbol, `Vol` between the halves of a rocker.
   */
  readonly size?: 'normal' | 'small';
  /** Extra offset in model units, for the cases where the printing is not where the rule puts it. */
  readonly dx?: number;
  readonly dy?: number;
}

export interface Key {
  /**
   * The identity. Logitech's own word where we have it, so that "which key is the mute key" is one
   * lookup that gives the same answer on every model, whether that model prints a crossed out
   * speaker or the word Mute.
   */
  readonly name: string;
  readonly src: Provenance;
  readonly kind: KeyKind;
  readonly shape: Shape;
  /** Degrees, positive clockwise, read off one printed edge of this key and not off its row. */
  readonly angle: number;
  readonly labels?: readonly Label[];
  readonly icon?: string;
  /**
   * Where this key's symbol goes, in model coordinates, for a key whose own shape is not a useful guide.
   *
   * A moulding segment is a wedge or a rectangle covering a whole quarter of the part, so its centre is
   * the part's centre. Without this, five symbols landed on top of each other in the middle of a Harmony
   * 525's direction pad.
   */
  readonly markAt?: { readonly x: number; readonly y: number };
  /**
   * How wide the symbol is, in model coordinates, measured off the photograph.
   *
   * The default fits a mark to a fraction of the key's own box, and that fraction was read off a Harmony
   * 600's teletext key, which is a **pill**: a bar across 20 of its 35 units. A circle cannot take a
   * mark that size, because its corners are not there, and on a Harmony 525's round transport keys the
   * default drew a stop square two thirds of the diameter where the product prints about four tenths. So
   * a size is stated rather than derived wherever the product's own marking says something different,
   * which is most keys on a model whose symbols are ours rather than the document's.
   */
  readonly markSize?: number;
  /**
   * The marks printed on this key, as paths in model coordinates, taken from the traced drawing.
   *
   * Where these are present they are the document's own symbols and `icon` is not used. A mark carries
   * its own place, so nothing here scales or centres it: it was drawn on the key and it stays there.
   * They go in the symbols layer, so a thumbnail drops them with everything else.
   *
   * `icon` remains for a model drawn without a traced source, where a symbol has to come from the set
   * this package draws itself.
   */
  readonly marks?: readonly string[];
  /**
   * The colour of this key's marking, where the colour **is** the button's identity rather than
   * decoration. The teletext keys are the case and so far the only one: four identical light pills
   * with a coloured bar inside, and without the colour there is nothing to tell them apart. It
   * colours the marking and not the key, so `--key-fill` stays free for the interface to use.
   */
  readonly accent?: string;
  /**
   * The scan code, present **only** where `reference/button-maps.md` names it: 32 of 44 keys on a
   * Harmony One, 36 of 54 on a Harmony 600, none of the 50 on a Harmony 525. Never filled in by
   * hand. A wrong scan code is invisible, because the interface would then show the wrong
   * assignment beside a key with complete confidence.
   */
  readonly scan?: number;
  /**
   * Where the name is settled and the code is not. The four arrow keys of a Harmony One are the
   * case: the shape says which is `DirectionUp` and which is `UpArrow`, and nothing says which scan
   * belongs to which, because both send the same command in every activity of both configs.
   */
  readonly scanCandidates?: readonly number[];
  /** The screen zone this key answers for, where the model has keys flanking its display. */
  readonly zone?: number;
}

/**
 * A visible part of the face that is not a button: a recessed bay, a bezel, a seam where the case
 * changes material. Drawn because it is most of what makes a model recognisable, and given no `k-`
 * id so nothing counts it as a key.
 */
export interface Region {
  readonly id: string;
  readonly path: string;
  /** `recess` takes the recess fill, `seam` is a stroke only. */
  readonly form: 'recess' | 'seam';
}

/**
 * One physical key that pivots and reports more than one code: a volume or channel rocker, a page
 * rocker, a play and pause column, the arms of a direction pad.
 *
 * It exists because drawing the halves as separate keys is **wrong about the hardware**, and it looked
 * wrong: four loose rectangles where the remote has one moulding with a pivot. So the moulding is
 * drawn once, outlined, and its halves are fills inside it with no outline of their own. The halves
 * stay separately addressable, which is what the interface needs, and the drawing stays honest about
 * there being one key there.
 *
 * `seams` is for a parting line the product actually shows. The Harmony 600's play and pause column
 * has one across it and its volume rocker does not, so this is per model and measured rather than a
 * rule applied to every rocker.
 */
export interface Rocker {
  readonly id: string;
  readonly path: string;
  /** The names of the keys that are this moulding's segments. */
  readonly keys: readonly string[];
  readonly seams?: readonly string[];
  /**
   * Printing that belongs to the moulding and not to either half. `Vol` and `Ch` on a Harmony 600 are
   * printed on the pivot between the two ends, so they belong to neither, and putting them on the
   * upper half had the lower half's fill draw straight over them.
   */
  readonly labels?: readonly (Label & { readonly x: number; readonly y: number })[];
}

/**
 * The display, with the size the architecture's own firmware uses.
 *
 * The rectangle is where the glass sits in model coordinates and `pixels` is the raster size from
 * `SCREEN_SIZES` in `packages/codec/src/render.ts`. Carrying both is what lets something expressed
 * in screen pixels, a rendered page or a touch rectangle out of the config, land in the right place
 * without whoever draws it knowing this model's coordinates.
 */
export interface Screen {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly pixels: { readonly width: number; readonly height: number };
  /** True only on arch 12 (Harmony One), where base slot 17 is a touch hit map. */
  readonly touch: boolean;
}

export interface Model {
  readonly id: string;
  readonly label: string;
  /** The skins this drawing serves, from `packages/usb/src/models.ts`. A regional alias is not the
   * same hardware: the two members of a 5xx pair differ by exactly the four teletext keys. */
  readonly skins: readonly number[];
  readonly architecture: number;
  readonly width: number;
  readonly height: number;
  /** The case as one contour. A rounded rectangle is refused and there is a test for it. */
  readonly case: string;
  readonly regions: readonly Region[];
  readonly rockers?: readonly Rocker[];
  readonly screen?: Screen;
  readonly keys: readonly Key[];
  /** The model name as printed on the face, and where. */
  readonly nameplate?: Label & { readonly x: number; readonly y: number };
}
