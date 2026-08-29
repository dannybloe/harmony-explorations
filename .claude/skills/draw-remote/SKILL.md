---
name: draw-remote
description: Draw a Harmony model's front face as a measured geometry table that generates an SVG for FreeHarmony's interface. Use when adding a model to packages/silhouettes, when asked for a picture of a remote the interface can colour or click, when a drawing's buttons sit at the wrong angle, and for any change to reference/silhouettes, which is generated output and is never edited by hand.
---

# Drawing a remote for the interface

The product has to show a remote and let somebody work with it: colour every button that drives the
television, select one to show what it sends, click it. That needs three things a decorative picture
does not have. Every visible part has to be addressable, every button has to carry a name that means
the same on all models, and the buttons have to sit where they really sit, because a picture whose
keys are all on a horizontal axis is a picture nobody recognises.

**The geometry is code and the SVG is output.** A model is a measured table in
`packages/silhouettes/src/models/<id>.ts` and `bin/generate.ts` writes
`reference/silhouettes/<id>.svg` from it. Never edit the SVG. A test asserts the checked in file is
byte for byte what the generator produces, so a hand edit fails the suite rather than surviving.

**The count is a claim, not a total.** A Harmony 600 has 54 buttons because six bits of a key event
byte say so and because somebody pressed every key on the bench and got 14, 14, 13, 13 across the
columns. A Harmony 525 has 50, from its firmware, from the remote and from a photograph. A Harmony
One has 44 and that number has no independent check at all, because sixteen of its keys share one
sense line, so there the drawing is the only source and the table says so. Losing a button while
redrawing is the easiest mistake here and the count is what catches it.

## Step 1: the source

There are two, and which one a model has decides most of what follows.

**A traced drawing, where one exists.** `../lab/reference/harmony<model>_remote.svg` is Logitech's own
line drawing out of the documentation, traced by hand, and it is the better source by a wide margin: the
keys on these remotes are four cubic segments with no straight side, so the best rounded rectangle
through one sits a whole unit out on a key nine units tall, and no amount of measuring a photograph
recovers a shape like that. It also carries the tilt, the symbols and the exact proportion.

**A photograph otherwise.** `../lab/reference/forum-images/<model>-full.jpg`. Both stay in the lab: not
published, not committed, not copied into FreeHarmony.

**Tracing was decided by Danny on 21 August 2026, against a recorded objection**, and the objection is
kept here because a decision without the argument it beat reads as an oversight. The objection: a traced
path is arguably Logitech's own expression rather than a fact about the product, and this repository is
public and MIT. What outweighed it is the measurement in the paragraph above, that no drawing measured
off a photograph gets a key's shape right, and the containment that follows from it: the traced SVG
itself never leaves the lab, and what is committed is `bin/extract.ts`'s output in this package's own
coordinates. What that replaced was a schematic drawing, and **placement is no longer schematic**: a
traced key is where it is on the product, which is what unparked the other 33 models.

The photographs are not to a common scale. That comparison table scaled them to fit its rows, so
`600-full.jpg` being 290 by 1000 and `525-full.jpg` being 230 by 875 says nothing about which remote is
longer. Never derive one model's size from another's image. **The two sources also disagree**, and the
drawing wins: a Harmony 600 is 0.248 wide by the drawing and 0.267 by the photograph, because a
photograph carries the lens and the drawing does not.

## Step 2: the geometry, from a traced drawing

`node bin/extract.ts <traced.svg>` prints every shape in the drawing, moved into this package's
coordinates: the case normalised to the nominal height, and every other shape beside it. `--paths` adds
the paths themselves. Two drawing conventions turn up and it handles both, a filled ring with a face
just inside it, which is what a PDF extractor makes of a stroked outline, and a real stroke, where the
centreline is already the shape.

**What the extractor cannot do is the part that matters.** Which shape is a key, what that key is
called, what is printed beside it and which code it sends is a person reading the drawing. Write that
reading as an assignment table and keep it next to the geometry, because a shape index means nothing on
its own.

Reading 68 shapes off a list is slow and unreliable. **Label them on the drawing**: render the traced
SVG and paint each shape's index at its own centre, then read the picture. That is how the Harmony One's
three decorative relief lines, its on screen row rectangles and its shared Activities and Help moulding
were told apart from its keys, and none of them is distinguishable by size or position alone.

Take the path **verbatim**. `traced(path)` derives the box from the path rather than stating it beside
it, so there is nothing to disagree with. Do not fit a pill to it and do not smooth it.

### The one that cost the most: a transform component nobody read

A traced drawing's `transform` is not decoration. The Harmony One's carries
`translate(...) scale(-1, 1) rotate(-180) translate(...)` on **57** of its elements, which is a mirror top
to bottom, and `parseTransform` knew `matrix`, `translate` and `scale` and **silently dropped the rest**.
Every one of those elements came through mirrored the wrong way. Nothing failed anywhere: a mirror about a
shape's own centre leaves its bounding box alone, so every key sat in the right place and only the
asymmetric shapes were wrong. The two that showed were the case, whose wide end went to the bottom, and
the paging arrows, which pointed inward. Both were read here as a badly traced source before the parser
was suspected, and one of them was written into a model file as a note about the document being wrong.

Three things to carry. The parser **refuses** an unknown transform now rather than skipping it, which is
the fix. `nothing the drawing states sits outside the case` in `test/models.test.ts` is the guard, and it
measures a **depth** with the mirrored case as its own control, 0.327 units against 16 to 31. And when a
traced drawing looks wrong in a way you would blame on the person who traced it, check what the reader
did with it first.

### Shapes are named by position, not by index

`extract.ts` sorts by area, so two parts of the same size are in whatever order the document put them.
That is stable until the paths change: fixing the transform above swapped rewind and fast forward, two
pills of identical size, and the drawing then said fast forward on the left with every test passing. Look
a shape up by its centre and its width and fail loudly when that does not name exactly one.

## Step 2a: the case contour, from a photograph

Only where there is no traced drawing. Sample the half width at named `y` rows, write each sample in a
comment, and mirror about the centre line.

```ts
// 600-full.jpg, half widths left edge against row:
//   26 at y=30, 31 at 92, 34 at 210 (widest, level with the screen),
//   29 at 520 (the waist), 33 at 700, 24 at 940
```

**Sample every row at the ends.** A crown gains most of its width in a few rows, and at one sample every
three the drawing comes out as two straight shoulders meeting in a spike. A curve nobody measured cannot
be interpolated back.

A rounded rectangle is refused, and there is a test for it: the case is one path, it carries at least one
curve command, and a path that spells out a rectangle in straight segments fails. All three drawings
started as a rounded rect and all three had to be replaced.

**Normalise the height.** Every model's case fills the same nominal height and the width follows from
that model's own ratio, so the interface can show two remotes at the same size. The drawing must not
encode which is physically longer; we have no physical measurements and will not guess at them.

## Step 3: the keys, and their angles

**From a traced drawing there is no angle to read.** The tilt is in the path, so `angle` stays 0 and
nothing has to be measured: a Harmony One's `Menu`, `Exit`, `Info` and `Guide` are slanted
parallelograms in the drawing and come across slanted. Their printed words are horizontal on the
product, so the label stays at 0 too, which is the reading to check on the drawing rather than assume.

`angle` exists for a model measured off a photograph, and there it is the step earlier drawings got most
wrong, so it gets the most care.

Read the angle off a **printed edge** of the key itself, the top edge of a pill or the seam across a
rocker, not off an imaginary line through a row. Write the reading in a comment. Positive is clockwise,
which matches SVG's own direction.

```ts
// the four activity keys, angle read off each key's own top edge
{ name: 'WatchTV', angle: -8, shape: pill(38, 88, 62, 20), ... }
```

**A row is not a row.** Measure each key. On a real Harmony the keys of one visual row often sit on
slightly different angles because the row follows a curve across the face, and averaging them is how a
drawing ends up looking almost right and reading as wrong.

**Never carry a key over from another model without checking it against this model's own source.** Two
models that look alike differ in exactly the places that matter: the Harmony 600 has four teletext colour
keys and the Harmony One has none, and a regional pair can differ by nothing else at all.

## Step 3a: a moulding and its segments

A rocker is one physical part with a pivot, and a traced drawing states **one outline** for it and
nothing inside. So a half is not a shape: it is the region it covers, the moulding's own outline is
clipped to it, and the halves together tile the moulding exactly. `segment(path)` is that region, and it
is also what the interface hit tests and colours, which is what it should be.

The same idea takes four segments for a direction pad, as triangles from the centre, so the corners
between the arms belong to an arm rather than to nothing.

**Check whether it is a moulding at all before splitting one.** A Harmony 600's play key looks like a
rocker and is not: the drawing gives it one outline with a smaller `Pause` key inset in its lower half,
so it is an ordinary key with another key drawn on top of it. A test refuses a moulding with one segment,
which is what caught it.

**A moulding's own outline may not be in the drawing either.** The Harmony 525's volume, channel and Glow
band is drawn as two separate open strokes with nothing closing it, so there is no shape to take. Close it
by joining the two: run the inner edge forward, then the outer edge back, reversing each of its cubics by
swapping the two control points. Every number is still the drawing's own, which is the difference between
closing a shape and inventing one. Where the segments are then wedges rather than halves, cut them at the
angles the drawing's **own seams** sit at, and derive the mark positions from those same angles so a
symbol cannot end up on a different segment from the wedge it belongs to.

**A cut only separates a key from its neighbour, so do not cut where the part simply ends.** The end
wedges of that band were cut at the angle of the band's own tips, which sounds right and is not: a radial
ray from the pad centre crosses a strip diagonally, so it lopped the inner half off each shoulder. Run
those wedges well past the end instead, to twelve o'clock here, and let the moulding say where the key
stops. **The failure is invisible in an outline drawing**, because the moulding's outline is drawn on top
either way, and it is obvious the instant a key is filled: the fill stops on a diagonal rather than
following the strip. So a segmented moulding gets a tinted render before it is believed, not just an
outline one.

## Step 4: names, and where a name came from

A key's identity is a name from **Logitech's own vocabulary**, so that "which key is the mute key"
is one lookup on every model. The measured names are in `reference/button-maps.md`: `VolumeMute`,
`Play`, `Pause`, `Rewind`, `SkipBack`, `SkipForward`, `FastForward`, `Stop`, `Record`, `Select`,
`Menu`, `Exit`, `Info`, `Guide`, `ChannelUp`, `ChannelDown`, `VolumeUp`, `VolumeDown`,
`PrevChannel`, `NumberPlus`, `Number0` to `Number9`, `DirectionLeft`, `DirectionRight`,
`DirectionUp`, `DirectionDown`, `UpArrow`, `DownArrow`, `Red`, `Green`, `Yellow`, `Blue`.

Every key carries where its name came from:

* `src: 'catalogue'`, the name is in those tables, measured from a config Logitech compiled for us.
* `src: 'printed'`, we chose the name because the marking on the key says it, `Help` or `Activities`.

A test reads `reference/button-maps.md` and checks both directions, so a `catalogue` name that is
not in the tables fails and so does a `printed` name that is.

**Never invent a scan code.** `scan` is present only where those tables name it, which is 32 of 44
keys on a Harmony One, 36 of 54 on a Harmony 600 and none of the 50 on a Harmony 525. A wrong scan
code is invisible: the interface then shows the wrong assignment beside a key with complete
confidence. Where the name is settled and the code is not, use `scanCandidates`. That is the case
for the four arrow keys of a Harmony One, where the shape says which is `DirectionUp` and which is
`UpArrow` while nothing says which scan belongs to which, because both send the same command.

`kind` records which population a key is in, and the two do not overlap: a key bound by a screen
page is one the screen speaks for, and a key bound by a keypad set is one on the keypad. On a
Harmony One the first group sits on the touch panel; on a Harmony 600 and a Harmony 525 those are
the physical keys flanking the display.

## Step 5: printed text and symbols

**Only the shapes and the contours come from the traced drawing. The symbols and the words are ours.**
Decided on 21 August 2026. The reason is not taste: one readable face across every model is the
requirement the drawings exist for, and a traced document can be wrong about its own product, which the
Harmony 525's is twice over. It prints text on the two central bars that the product does not have, and
it prints `Off` under the power key where the product prints nothing.

So **read the marking off the photograph**, key by key, and expect the two sources to disagree.

All printed text comes along, at the place it is printed, including the letter groups on the digits and
the words that sit beside a key rather than on it. Text beside a key lives inside that key's group, so it
lights up when the interface highlights that key. The click region stays the key shape alone, otherwise
the word `Replay` and the key under it fight over the same pixels. **Where the text sits is per model**: a
Harmony 600 prints `abc` under its `2` and a Harmony 525 prints it beside the digit on the key's own face.

Symbols come from the shared set in `src/icons.ts`. **Do not add a second play triangle.** If a model
needs a symbol the set does not have, add it there once and every model gets it, which is how `dot`
arrived: a Harmony 525's teletext keys carry a coloured circle where a Harmony 600 carries a bar. Unicode characters are not used: the crossed out speaker and the return arrow do not exist as
characters, which is why two of the old drawings had the words `mute` and `back` printed on keys that
carry a symbol.

**State the size, do not let it be derived.** `markSize` is the mark's width in model units, measured off
the photograph. The default fits a mark to a fraction of the key's box and that fraction came off a
Harmony 600 teletext key, which is a **pill**: a bar across 20 of its 35 units. A circle cannot take a
mark that size because its corners are not there, and on a Harmony 525's round transport keys the default
drew a stop square two thirds of the diameter where the product prints about four tenths. `markAt` is the
separate question of **where**, and a moulding segment needs it: its box is the whole part, so five
symbols landed on top of each other in the middle of a direction pad.

**On a narrow band, compute the midline rather than reading the position off the photograph.** The
Harmony 525's `+`, `-`, `Vol.` and `Ch.` were placed by eye and every one of them straddled the band's
inner edge or sat hard against it. The band's two edges are known paths, so bisect each for x at the
height wanted and take the middle; here that is 30.54 on the volume side and 231.33 on the channel side
against a strip 27 units across. A caption uses the same x, and remember its `y` is a **baseline**, so
add about a third of the font size to centre it optically.

**The photograph and the trace can be registered on a seam, and then each is trusted for what it is good
at.** That band's seam sits at y 595.835 in the trace and the photograph puts it at 596, so the heights
of the markings could be read straight off the photograph while their x came from the trace's own
geometry. Check such a landmark before mixing the two sources: the same drawings disagree about that
band's width by nine units, so an x taken from the photograph would have been wrong.

**A symbol only one model uses may be rebuilt from that model's photograph.** `plus` and `minus` were
single strokes taking the shared 0.16 stroke width, a tenth of the mark across, where the Harmony 525
prints a plus 11.3 wide with bars 2.8 across, a quarter. They are filled paths at the measured proportion
now. Check who else uses a symbol before touching it, with a grep over `src/models/`, because the whole
point of one set is that the other models move with it.

**Leave out what is not the remote.** The Logitech logo and wordmark are in the drawings and stay out;
`bin/extract.ts` reports marks belonging to no key, which is how they were found rather than assumed. So
do the decorative relief lines across a face, any on screen rectangles, and a battery indicator drawn
inside a screen, because a screen's contents come from a config and not from here.

**A feature in the drawing that the photograph does not show is drawn, and is not a key.** Logitech's
Harmony 600 drawing has a rounded panel at the top right where the product is smooth silver. It is a
region, so the drawing reproduces the document without offering a button nobody can press, and the model
file says which source disagreed.

## Step 6: layers and colour

Five layers, each addressable so the host can switch one off for a thumbnail:
`layer-case`, `layer-screen`, `layer-keys`, `layer-icons`, `layer-text`. `toSvg` also takes a detail
level that omits a layer outright, for when the file itself should be small.

Every fill and stroke comes from a custom property with a default. No shape carries a colour of its
own, and there is a test for it. The defaults are white case, white keys, a visible key outline, and
the host overrides whatever it likes:

```css
[data-name="VolumeMute"] { --key-fill: #2f9e44 }
```

Strokes carry `vector-effect="non-scaling-stroke"`, so a thumbnail keeps its lines instead of going
grey.

The screen area is a rectangle with the **real aspect ratio of that architecture's display**, from
`SCREEN_SIZES` in `packages/codec/src/render.ts`: 176 by 220 for a Harmony One, 128 by 128 for a
Harmony 600, 96 by 64 for a Harmony 525. It also carries the transform from display pixels into
drawing coordinates, so anything expressed in screen pixels lands in the right place later.

## Step 7: what a new model needs before it is done

* a class in `tests/test_silhouettes.py` naming the file and its button count, and an entry in
  `DRAWN`, since a drawing nobody wrote a class for sits there with its count unasserted
* the checked in SVG regenerated, so the byte for byte test passes
* every name unique within the model, and every `catalogue` name present in
  `reference/button-maps.md`
* at least one key row genuinely at an angle, so a drawing that forgot this step fails rather than
  passes

## Step 8: the check that actually decides it

```sh
make silhouettes SILHOUETTE_ARGS=--preview
```

That writes an HTML page **into the lab**, never into the repository, with the drawing beside the
forum photograph at full size, at half size and as a thumbnail, plus a control that colours a few
keys so the theming hooks are visibly working.

**Every test above can pass on a drawing with a key at the wrong angle, a label half a row out or a
symbol on the wrong key.** So this is the check that counts, and it is the one a person has to do.
Show one model before drawing the rest: a fault in the method costs one drawing that way and three
otherwise.
