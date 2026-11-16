# `@freeharmony-sdk/silhouettes`

<!-- introduction -->
Each model's front face as data, every key and region measured, and the drawing of it as SVG: an interface shows the
remote with it and asks which key a point falls on.
<!-- /introduction -->

<!-- Generated from the source comments by `make api-reference-write`: change the source, not this page, apart from the introduction above. -->

## Hit testing

Which key a point falls in, and a path's extent.

### `Bounds`

```ts
interface Bounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}
```

The smallest box around a path, in model coordinates.

### `pathBounds`

```ts
function pathBounds(d: string, curves = false): Bounds
```

The bounds of a path made of `M`, `L`, `H`, `V`, `C`, `A` and `Z`, with absolute coordinates.

**An arc's bulge counts and a cubic's does not**, and the difference is deliberate. An arc here is
always an end cap or a corner whose curve reaches well past its own endpoints: the power ring is one
arc whose endpoints span 0.8 vertically where the ring is 1.66, and measuring it by endpoints scaled
the mark up until it overflowed its key. A cubic here is always a segment of a case side fitted
through measured samples, where the curve stays within a fraction of a unit of the samples it passes
through, and including its control points would report a shape wider than the one drawn.

**`curves` asks for a cubic's true extent**, the points where its derivative is zero, which is
neither its endpoints nor its control points. The premise above fails on a case taken from a manual
page: the Harmony Touch's setup guide draws each long side of the case as **one** cubic from shoulder
to foot, which bulges 8.7 units past its endpoints, and a case measured by endpoints came out that
much too narrow and was clipped by its own viewBox on both sides. So the extractor sizes a case with
`curves` on, and the test that a case fills its box measures it that way. The default stays endpoint
only, because every traced key's box, and so every label and mark placed against one, is measured
that way in the committed drawings.

Uses [`Bounds`](#bounds).

### `pathPolygon`

```ts
function pathPolygon(d: string, steps = 16): [number, number][][]
```

Flatten a path into one polygon per subpath, so a point can be tested against it.

Written because a bounding box cannot tell two shapes apart that share one: the Harmony One's traced
drawing carries its case outline **twice**, the second copy mirrored top to bottom, and both have the
same box and the same area. The extractor picked the mirrored one and the whole body came out upside
down, which showed up as the power key sitting outside the outline. Containment is what separates
them, and it needs the real edge rather than the box.

`steps` is per curve. Sixteen is far finer than anything here needs: the question is always whether a
point is well inside or well outside, never whether it is within a tenth of a unit of an edge.

### `pointInPath`

```ts
function pointInPath(d: string, px: number, py: number): boolean
```

Is the point inside the path, by an even odd crossing count over every subpath at once?

Even odd rather than nonzero, because a band traced inner edge then outer edge is one subpath with a
hole and the two rules disagree about the hole. Nothing here asks about a point in a hole, and even
odd is the rule that needs no winding direction, which a traced drawing does not promise.

## Icons

The icons a key is drawn with.

### `extentOf`

```ts
function extentOf(icon: Icon): { w: number; h: number }
```

How much of the unit box a symbol actually uses, measured from its own path.

Uses [`Icon`](#icon).

### `Icon`

```ts
interface Icon {
  readonly parts: readonly IconPart[];
}
```

A symbol printed on a key, such as play or mute, as its parts.

Uses [`IconPart`](#iconpart).

### `IconPart`

```ts
interface IconPart {
  readonly d: string;
  readonly mode: 'fill' | 'stroke';
  readonly accent?: boolean;
}
```

One stroke or fill of a symbol, as an SVG path in the symbol's unit box.

### `ICONS`

```ts
const ICONS: Readonly<Record<string, Icon>>
```

Every symbol a key is drawn with, by name.

Uses [`Icon`](#icon).

## The drawing

A model's face as SVG.

Each model's geometry table under its own name, the same objects [`MODELS`](#models) holds by key.

### `DEFAULTS`

```ts
const DEFAULTS = {
  caseFill: '#fff',
  caseStroke: '#333',
  recessFill: '#eee',
  keyFill: '#fff',
  keyStroke: '#666',
  keyText: '#222',
  accent: '#d23c3c',
  font: 'system-ui, sans-serif',
} as const
```

The default value of every custom property, and the one place it is written.

### `DETAIL`

```ts
const DETAIL = {
  full: LAYERS,
  /** Shape only: what reads at the size of a list row, where text would be a grey smear. */
  thumbnail: ['case', 'screen', 'keys'],
  /** The bare outline, for an icon. */
  outline: ['case'],
} satisfies Record<string, readonly LayerName[]>
```

Layer sets worth naming, since a caller should not have to remember which layers a thumbnail wants.

Typed with `satisfies` rather than annotated as a record, so [`DETAIL.thumbnail`](#detail) is known to exist:
a `Record<string, ...>` makes every lookup possibly undefined and pushes a check onto every caller
for keys that are right here in the file.

### `elementId`

```ts
function elementId(name: string): string
```

The element id for a key: `VolumeMute` becomes `k-volume-mute`.

Not a lowercased run of the name, which gave `k-screenupperleft`. A digit stays attached to the word
it belongs to, so `Number4` is `k-number4` rather than `k-number-4`, because the digit is part of
the button's name and not a separate word.

Two rules, not one. The first splits a capital after a lowercase or a digit; the second splits a
capital that begins a word after another capital, which is what `WatchAMovie` needs. With only the
first it came out `k-watch-amovie`.

### `H300`

```ts
const H300: Model
```

Uses [`Model`](#model).

### `H300EU`

```ts
const H300EU: Model
```

Uses [`Model`](#model).

### `H350`

```ts
const H350: Model
```

Uses [`Model`](#model).

### `H515`

```ts
const H515: Model
```

Uses [`Model`](#model).

### `H525`

```ts
const H525: Model
```

Uses [`Model`](#model).

### `H600`

```ts
const H600: Model
```

Uses [`Model`](#model).

### `H650`

```ts
const H650: Model
```

Uses [`Model`](#model).

### `H700`

```ts
const H700: Model
```

Uses [`Model`](#model).

### `H720`

```ts
const H720: Model
```

Uses [`Model`](#model).

### `H785`

```ts
const H785: Model
```

Uses [`Model`](#model).

### `H880`

```ts
const H880: Model
```

Uses [`Model`](#model).

### `H880PRO`

```ts
const H880PRO: Model
```

Uses [`Model`](#model).

### `H885`

```ts
const H885: Model
```

Uses [`Model`](#model).

### `H890PRO`

```ts
const H890PRO: Model
```

Uses [`Model`](#model).

### `keyOf`

```ts
function keyOf(model: Model, name: string): Key | undefined
```

The key a name refers to on this model.

This is the whole reason a key carries Logitech's own word rather than an id of ours: the question
"which key is the mute key" has one answer per model and the caller should not have to know whether
this remote prints a crossed out speaker or the word Mute.

Uses [`Model`](#model), [`Key`](#key).

### `keyOfScan`

```ts
function keyOfScan(model: Model, scan: number): Key | undefined
```

The key a scan code belongs to, where that has been measured. Undefined is the honest answer.

Uses [`Model`](#model), [`Key`](#key).

### `MODELS`

```ts
const MODELS: Readonly<Record<string, Model>>
```

Every model that is drawn. A model absent from here has not been measured yet.

Uses [`Model`](#model).

### `ONE`

```ts
const ONE: Model
```

Uses [`Model`](#model).

### `SvgOptions`

```ts
interface SvgOptions {
  /**
   * Which layers to emit. Omitting a layer keeps the file small, which is the point for a real
   * thumbnail; a host that wants to switch one off live hides the layer's class instead.
   */
  readonly layers?: readonly LayerName[];
}
```

How [`toSvg`](#tosvg) draws: which layers it includes.

Uses [`LayerName`](#layername).

### `toSvg`

```ts
function toSvg(model: Model, options: SvgOptions = {}): string
```

A model's face as an SVG document. Every key is a group with an id from [`elementId`](#elementid), and every colour is a
custom property with a default, so an interface colours and hides keys with its own style sheet.

Uses [`Model`](#model), [`SvgOptions`](#svgoptions).

### `TOUCH`

```ts
const TOUCH: Model
```

Uses [`Model`](#model).

## The geometry table

A model, its keys and regions, and where each fact came from.

### `CASE_HEIGHT`

```ts
const CASE_HEIGHT = 1000
```

The nominal height every model's case fills. Arbitrary, and the same for all of them on purpose.

### `Key`

```ts
interface Key {
  /**
   * The identity. Logitech's own word where there is one, so that "which key is the mute key" is one
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
   * The scan code, present **only** where something established it, and `scanFrom` says what: 38 of 44
   * keys on a Harmony One, 41 of 54 on a Harmony 600, none of the 50 on a Harmony 525, 53 of the 55 on a
   * Harmony 350, 49 of the 55 on the Harmony 300's European printing and none on its US printing, all 55 on
   * a Harmony 885, 29 of the 53 on a Harmony 880, and none of the 29 on a Harmony Touch. Never filled in on a
   * guess. A wrong scan
   * code is invisible, because the interface would then show the wrong assignment beside a key with
   * complete confidence.
   */
  readonly scan?: number;
  /** The evidence that established `scan`, a key of `SCAN_SOURCES`, present exactly when `scan` is. */
  readonly scanFrom?: ScanSource;
  /**
   * Where the name is settled and the code is narrowed to a set but not decided. The Harmony 525's four
   * soft keys are the case: the firmware's own matrix arithmetic puts them in one block of four codes and
   * nothing says which column is the left one. The Harmony 350's Live key is the other.
   */
  readonly scanCandidates?: readonly number[];
  /** The screen zone this key answers for, where the model has keys flanking its display. */
  readonly zone?: number;
}
```

One key of a model: its name, its outline and angle, its words and symbols, and where each was measured.

Uses [`Provenance`](#provenance), [`KeyKind`](#keykind), [`Shape`](#shape), [`Label`](#label), [`ScanSource`](#scansource).

### `KeyKind`

```ts
type KeyKind = 'keypad' | 'screen' | 'touch';
```

Which population a key belongs to, which is a real division and not a label.

A scan bound by a mode page is a key the screen speaks for, a scan bound by a base slot 9 set is a key on the
keypad, and the two share no code at all on the Harmony 525, the Harmony One and the Harmony 600, 650 and 700, and
exactly one on the Harmony 880 and 885. It matters
to the interface because colouring by device works on the keypad group, while what a screen key does depends on the
page in force.

`touch` is a key with no moulded part, answering a touch on the case. On the Harmony One base
slot 17 states its rectangle; on a Harmony Touch it is the star and the house printed above the
screen, which its manual lists as buttons and says to tap, and nothing about its configuration has
been read, so there the kind says what the product is and nothing about a population.

### `Label`

```ts
interface Label {
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
   * carries only a symbol, `Vol` between the halves of a rocker. `tiny` is for a word that has to fit
   * across a small key, a Harmony 350's `DVD/Music`.
   */
  readonly size?: 'normal' | 'small' | 'tiny';
  /** Extra offset in model units, for the cases where the printing is not where the rule puts it. */
  readonly dx?: number;
  readonly dy?: number;
  /**
   * Degrees, positive clockwise, where the word runs at an angle of its own rather than the key's.
   *
   * A key's `angle` turns its lettering with it, which is right for a word printed across a tilted key. It
   * cannot say a word printed **along** a key: a Harmony 885 prints `MUTE` and `PREV` running down its two
   * edge keys and `VOL` and `CH` along its band, and `DEVICE` and `MEDIA` climb across two crescents whose
   * outline is measured in place and must not turn. The word turns about its own anchor, after the key's.
   */
  readonly rotate?: number;
}
```

A word printed on or beside a key, and where it sits.

Uses [`LabelPlace`](#labelplace).

### `LabelPlace`

```ts
type LabelPlace = 'on' | 'above' | 'below' | 'left' | 'right';
```

Where a printed word sits relative to its key. On the real remotes all five of these occur.

### `LayerName`

```ts
type LayerName = (typeof LAYERS)[number];
```

One layer of the drawing, as [`SvgOptions.layers`](#svgoptions) names it.

Uses [`LAYERS`](#layers).

### `LAYERS`

```ts
const LAYERS = ['case', 'screen', 'keys', 'icons', 'text'] as const
```

The layers, each switchable so a thumbnail can drop the text and keep the shape.

### `Model`

```ts
interface Model {
  readonly id: string;
  readonly label: string;
  /**
   * The skins this drawing serves, from `packages/base/src/models.ts`. A regional alias is not the
   * same hardware: the two members of a 5xx pair differ by exactly the four teletext keys.
   */
  readonly skins: readonly number[];
  readonly architecture: number;
  /**
   * `photograph` where no drawing of Logitech's existed and every shape was measured off a product
   * photograph, the Harmony 885 the first. Absent for a model whose shapes come from a traced or extracted
   * drawing, which is every earlier one. The drawing's own description says which, since a reader of the
   * SVG cannot tell and the precision of the two differs: a photograph 235 pixels wide is good to about a
   * pixel, which is a unit and a quarter here.
   */
  readonly source?: 'photograph';
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
  /**
   * Words printed on the case that name a **group** of keys rather than one: `My Devices` over a Harmony
   * 350's four device keys, `Favorites` between its five favourite keys.
   *
   * Not a key's label, deliberately. A label lives inside its key's group so it lights up when the
   * interface highlights that key, and putting `Favorites` on any one of five keys would light it up
   * with the wrong one. Not a moulding's label either, since there is no moulding. So it is printing on
   * the case, drawn in the text layer beside the nameplate and belonging to nothing clickable.
   */
  readonly captions?: readonly (Label & { readonly x: number; readonly y: number })[];
}
```

A model's front face: its case, its screen, its keys and regions, each measured.

Uses [`Region`](#region), [`Rocker`](silhouettes-types.md#rocker), [`Screen`](#screen), [`Key`](#key), [`Label`](#label).

### `Provenance`

```ts
type Provenance = 'catalogue' | 'printed';
```

Where a button's name came from.

`catalogue` means the name is one Logitech's own button maps give this key, recovered from a config
Logitech compiled to a known setup by decoding what each scan code sends and looking the frame up in
the command catalogue and button maps its service states for that setup. Those are Logitech's own words for these keys, and every key named that way carries the scan code
it was named against, `scanFrom` saying how.

`printed` means the name was chosen because the key says it: `Help`, `Activities`, `Glow`. Sound,
and not a measurement, which is why the two are told apart rather than merged.

### `Region`

```ts
interface Region {
  readonly id: string;
  readonly path: string;
  /** `recess` takes the recess fill, `seam` is a stroke only. */
  readonly form: 'recess' | 'seam';
}
```

A visible part of the face that is not a button: a recessed bay, a bezel, a seam where the case
changes material. Drawn because it is most of what makes a model recognisable, and given no `k-`
id so nothing counts it as a key.

### `SCAN_SOURCES`

```ts
const SCAN_SOURCES = {
  133: "named through Logitech's button maps for a configuration compiled to a known setup",
  323: "decided by the devices' own maps, since every activity gives both keys of a pair one command",
  398: "decided by the devices' own maps, since every activity gives both keys of a pair one command",
  125: "from the touch hit map, which holds one rectangle for each of these codes on every page",
  333: "bound by every activity Logitech compiles to that activity's own help",
  't-harmony-350-keys-u': 'heard by pressing each key with a receiver listening, its code the one binding of '
    + 'the configuration on the remote that sends what was heard',
  't-harmony-350-setup-u': 'heard by pressing each key with a receiver listening, on a configuration that binds '
    + 'it, its code the one of the 56 that, raised at that point of the presses, gives what was heard',
  't-harmony-300-keys-u': 'heard by pressing each key with a receiver listening, in two device modes, its code '
    + 'the one of the 56 that, raised at that point of the presses, gives what was heard',
  't-885-keys-u': "read off the remote's own memory while each key was pressed, on one unit for every key and "
    + 'on a second for sixteen of them',
  't-880-keys-c': "from the command Logitech's compiles for this model bind on that code, named for the key in "
    + 'configurations from two contributors',
  't-880pro-keys-u': "read by the key page on a contributor's unit, each key asked by name and confirmed in a "
    + 'second pass',
} as const
```

Where a scan code on a drawing came from: each key of this record names one piece of evidence, by the number of
the passage of the findings archive that argues it or by the footnote label of a test, and its value is the words
the generated keys pages print for it.

### `ScanSource`

```ts
type ScanSource = keyof typeof SCAN_SOURCES;
```

Where a key's scan code was read, a key of [`SCAN_SOURCES`](#scan_sources).

Uses [`SCAN_SOURCES`](#scan_sources).

### `Screen`

```ts
interface Screen {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly pixels: { readonly width: number; readonly height: number };
  /**
   * Whether the glass is a touch panel. The Harmony One, where base slot 17 is a touch hit map,
   * and the Harmony Touch, whose own manual calls it an LCD touch screen. On the Touch the raster is
   * not from `SCREEN_SIZES` either, which has no entry for its architecture, but from the size of the
   * screen captures in its user guide.
   */
  readonly touch: boolean;
}
```

The display, with the size the architecture's own firmware uses.

The rectangle is where the glass sits in model coordinates and `pixels` is the raster size from
[`SCREEN_SIZES`](config.md#screen_sizes) in [`packages/config/src/screens/render.ts`](../../../packages/config/src/screens/render.ts). Carrying both is what lets something expressed
in screen pixels, a rendered page or a touch rectangle out of the config, land in the right place
without whoever draws it knowing this model's coordinates.

### `Shape`

```ts
interface Shape {
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
```

A drawn outline in model coordinates.

Everything becomes a path, including what starts as a rectangle, because the vocabulary has to
cover all three models and two of them need more than a box: a Harmony One's transport keys are
slanted wedges and a Harmony 525's volume and channel keys are segments of a ring around its
direction pad, which no rotated rectangle can be.

`angle` is **not** baked into `path`. It becomes a rotation on the key's own group, so the
lettering and the symbol rotate with the key for free, which is what they do on the real remote
because they are printed on it.
