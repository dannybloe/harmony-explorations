# Screens

### The screen language

A second interpreter, unrelated to the action lists, with its own one byte opcodes. It draws the
display. Programs are reached from base slot 11, from a base slot 14 lookup, and on arch 8 and arch
14 from a mode entry.

| opcode | operands | meaning |
|---|---|---|
| 0 | none | end |
| 1 | `x`, `y`, `width`, `height`, then a colour high byte first | fill the rectangle with the colour, **below** |
| 2 | 2 position bytes, `u24` | draw the **bitmap** at that address, below |
| 3 | 6 bytes, `u24` | the same with **destination, source, size**, below |
| 4 | 2 position bytes, `u24` | draw the glyph string at that address, **another program's own**, below |
| 5 | 2 position bytes, then the string | draw the glyph string inline |
| 16 | 1 byte | index base slot 7 by it |
| 17 | `u16` operand, `u8` opcode | queue an action list instruction |
| 18, 19 | a switch, below | switch on a state variable and jump |
| 20 | `u24` | jump |
| 21 | 4 bytes | *arch 8 only*, meaning unknown, length inferred from the corpus |
| 22 | **per architecture**, below | *arch 12*: call. *arch 9*: select a screen row |
| 23 | none | **per architecture**: *arch 12* the return matching opcode 22; *arch 9* the page transfer |

**Opcode 1 is a filled rectangle**, read in the firmware, [findings.md](../../docs/findings.md) section 425. Six bytes: `x`, `y`,
`width`, `height`, each one byte, then the colour as two bytes in the order a picture's pixel is stored, high byte
first, the order read on the Harmony One 3.4 and the Harmony 650 0.2. The remote fills one row at a time from `y` while the row is below `y + height` **taken in eight bits**, so a
rectangle whose `y + height` is 256 or more draws nothing (220 rows from `y` 40 end at row 4); each row is clipped to the
display, its width to the columns right of `x`, and a row or a column past the screen is drawn nowhere. A width of 0 is
not read. Read on the Harmony One 3.4 in full, and on the Harmony 600 and 650 0.2 and the Harmony 700 2.8 to the same
row loop and the row routine's clip at 128 by 128; the Harmony 650 0.4 image and arch 8, 9 and 10 are not checked.
Over the sixteen English compiles of skin 54 Logitech uses it for the welcome tour's black background, 11 a compile,
for a black fill before a full screen picture, 18 in all, and for the four lines two pixels wide that frame a picker's
button, 9 frames a compile, each closing exactly round a button picture drawn there, 144 of 144.

**The Harmony One draws a page over what the screen held**: the routine that draws a mode page runs its program with
no fill before it, and the whole screen fill is reached at start up and from three firmware screens only, by direct
calls. So a pixel a page leaves undrawn keeps the previous screen's, and a background has to draw every pixel.

**Opcode 4 is the commoner of the two text opcodes and its target is never a place of its own.**
Confirmed on every container of the corpus, four architectures: in 12052 of 12052 instances the
`u24` lands on the glyph payload of some opcode 5 instruction in another reachable program, three bytes
past that instruction's start. So a string is stored once, inline, by whichever program draws it that
way, and every other program that wants it names those bytes. 15742<!--fact:text_referenced--> of the
corpus's 23419<!--fact:text_draws--> drawn strings are references, so two draws in three.

Three consequences, all of them load bearing:

* The run is read exactly as opcode 5's is, terminated by a zero byte with a code whose bit 7 is set
  taking a second byte. It may be **empty**: nine references in each arch 8 config name a zero length
  string, which is a blank label at a position.
* **The bytes are shared**, so a writer that edits a string in place changes every draw that names it.
  Same family as the shared infrared duration blocks of section 61.
* The byte accounting closed without anybody following this pointer, because the bytes were already
  claimed by the program holding them. That is why it went unread: nothing was missing.

**Opcode 3's six position bytes are `dx, dy, sx, sy, w, h`, destination first.** Section 118. The
order cannot be read off most of them: 1080 of the 1114 in `h525_config` carry the same pair twice,
which is a full page strip copied to where it already sits. The 34 that differ are all
`(0, 12, 0, 0, 96, 1)`, a one pixel rule, and they settle it two ways:

* **The selected page contains the first pair and not the second**, on 55 of 55 across both arch 9
  user configs and 0 of 55 the other way. Opcode 22 has just selected page 1, rows 8 to 15, and a
  destination of `y = 0` is not in it. The 1080 symmetric draws are the calibration: all of them
  land inside their own selected page too.
* Typographically the rule sits between a title at `y = 0` and text at `y = 13`, which is where a
  heading rule belongs and where `y = 12` puts it.

The source is `(0, 0)` of a 96 by 64 solid ink bitmap, so a rule is one row taken off the top of a
filled rectangle. Reading the pairs the other way round draws all 34 along the top edge.

**Opcode 22 is the one opcode whose operand width is not the same everywhere**, so a parser has to
know the architecture before it can walk past one.

On **arch 12** it takes **3** bytes, a `u24` target: it seeks there and leaves the byte after the
operands in a link register, which opcode 23 restores. A call and its return, read out of the
handlers at `0x2966E` and `0x29640` on the Harmony One 3.4 image. There is **one** link register,
so calls do not nest. No config in the corpus uses it, so this is firmware rather than data.

On **arch 9** it takes **1**, a row index from 0 to 7, and the instruction that follows it is an
ordinary opcode 3 drawing a 96 by 8 strip at `y = 8 * row`. Every mode page's program issues the
eight of them once each, and every strip on a page comes from the same picture, which is 96 by 64
in every arch 9 user config: the 525's whole panel, drawn in eight rows.

What the row index is for is **read now**, section 101, and it is not what was guessed here. It is a
**page index sent to the panel**: `0x038EC` keeps it at `0xC0` and derives `row * 8` and `row * 8 + 7`
beside it, and the transfer at `0x03898` sends `0xB0 | row`, the page address command of a page
addressed display controller. So the 525 addresses its screen as eight pages of eight pixel rows,
opcode 22 selects one and **opcode 23 transfers 96 pixels into it**, preceded by a column address in
two nibbles where **the panel's column 0 is the controller's column 3**. The guess recorded here, that
a key press is attributed to a row and this is arch 9's touch hit map, was wrong: nothing reads it
back.

The controller is **ST7565 class and not an SSD1306**, which section 101 corrected on 10 August 2026:
six ST7565 only commands appear in the driver's init sequence and none of the ten SSD1306 only ones
do. The exact part is not established.

The lead came from trelowney and the addresses were verified against this project's own 525 image.

Corrected: this document said **11 operands, the last three naming a picture**, which read the
opcode 3 that follows as part of opcode 22. Both readings consume the same twelve bytes and end on
the same address whenever opcode 22 is followed by opcode 3, and that is 1856 instances out of 1856
in the two arch 9 user configs, so the corpus could not separate them. The arch 9 safe mode
container has four that are followed by something else, and there the 11 byte reading walks a
program off the end. See [findings.md](../../docs/findings.md) section 85.

[findings.md](../../docs/findings.md) section 64.

A switch:

```
u8    state variable index
count                                     u8 in opcode 18, u16 in opcode 19
{ value; u24 target }[count]              value likewise one byte or two
count
{ low; high; u24 target }[count]
```

**The inline strings are glyph indices, not characters.** The renderer resolves one by indexing a
font table by the code minus one. A code with bit 7 set is the first half of a wide one and takes a
second byte with it, so a terminator cannot be found by scanning for a zero; no string in the corpus
is wide. What a code means is under base slot 7 below: the assignment is per config, and the text is
recovered from the glyph's pixels rather than from the code.

**22846<!--fact:screen_programs--> programs across 19<!--fact:containers--> containers and four architectures decode with nothing left over**,
which is the check that matters: instructions are variable length with no length field, so a wrong
operand count desynchronises the walk immediately. Programs are reached from base slot 11, from a
base slot 14 lookup, and on **every** architecture **from a mode record**, whose own program sits
immediately after its tagged list. That third source is 2119 roots and is where the full screen
pictures are named. [findings.md](../../docs/findings.md) sections 53, 54 and 64.

Read with `gspm.screen_program` and `gspm.screen_program_roots`, or dump one with
`tools/screen_dump.py`. [findings.md](../../docs/findings.md) section 40.

#### What opcode 2 draws

The only screen instruction that names a place outside its own program. At the address:

```
+0x00  u8   kind
+0x01  u16  stride, in bytes per row
+0x03  u16  rows
+0x05       the pixels
```

`stride` is in **pixels** and a pixel is two bytes, so `kind` 0 is exactly `5 + 2 * stride * rows`
bytes. Pictures are laid out contiguously and consecutive ones sit exactly that far apart.
`kind` 1 discards the two sizes and uses the base slot 7 glyph encoding instead, skip and literal
over **two byte** pixels, ending at a `0x00` control byte; it breaks rows exactly `rows - 1` times
even though it threw the header away, which is the closure its extent rests on. `kind` 2 is a bare `RETURN` in the firmware, valid and drawing nothing, and a
higher value is not reached at all.

**On arch 9 `kind` 2 is the only kind used and it is one bit a pixel**, since the 5xx panel is
monochrome. A row is padded to a whole byte, so the record is `5 + ceil(stride / 8) * rows`: a 96
pixel row is 12 bytes and a 19 pixel one is 3, not 2.375. Every picture in an arch 9 user config is
96 by 64, the whole panel, at 773 bytes; the safe mode container also carries a 19 by 10 and an 18
by 10. Corrected from `5 + stride * rows / 8`, which agrees for every width that is a multiple of
eight and so for everything the user configs contain. [findings.md](../../docs/findings.md) section 85.

Two rails for a writer, both read off the firmware and invisible in the corpus:

* only the **low byte** of each `u16` is loaded, so a value above 255 is taken modulo 256, silently,
* the row loop stops drawing above **row 128** but still advances the stream.

Every opcode 2 address in the corpus decodes. Strides are per model, 12 on the 600 and the 700, 16
to 19 on arch 8, and 20, 22 or 88 on the One; row counts are 10, 11 or 18. Arch 9 and the safe mode
containers emit no opcode 2 and hold no bitmaps.

**Two size classes.** The ones a base slot 11 program names are icons, 245 to 1765 bytes. The ones a
**mode record's** program names are full screens: stride 128 over 128 rows on arch 14, 128 over 160
on arch 8, and **176 over 220 on arch 12**, which is the Harmony One's panel.

#### The picture bank

Pictures do not sit where they are addressed; they sit in **one contiguous array** running from the
end of the named content to the trailer, with **no table, no count and no header**. Walking it from
its start lands exactly on the trailer in every container that has one: 98 pictures on a Harmony
One, 18 on a 600, 24 on a 700, 31 to 33 on arch 8. **Every entry of a bank is drawn by a screen
program**, on all four architectures, with two exceptions in the whole corpus and both in the arch 9
safe mode container. So the bank is the set of pictures the programs draw rather than a region that
happens to contain them. [findings.md](../../docs/findings.md) sections 66 and 146.

**Where the bank starts is stated three ways, and the third needs no pointer slot.** Base slot 17
names it, two bytes in front, on arch 8, 9 and 14; arch 12 uses that slot for the touch hit map, so
the bank is found by searching upward from the end of the named content and constraining the answer by
the pictures screen programs address. Both routes need the section readers. The third route needs only
the trailer's position, which the framing states, and is what reads on **arch 10 (Harmony 890 and
895)** where every slot reader is gated:

1. walk from every offset in the blob, keeping the offsets whose walk lands exactly on the trailer
2. discard any whose pictures exceed 256 pixels in either axis, which is `PICTURE_CEILING`
3. take the survivor with the most pictures, which is then the lowest

Confirmed against the reader route on **14 of 14** containers whose bank it can locate, start address
and picture count both, over four architectures. Step 3 alone is right on 9 of the 14 and step 1 alone
on 4, so both filters are load bearing. The ceiling is a plateau: 224, 256, 400 and 1024 give the
identical answer everywhere, and 180 does not, because it is below the Harmony One's 220 pixel
backgrounds. `pictureBankByClosure`. [findings.md](../../docs/findings.md) section 179.

**The largest picture in a bank is the display size**, which is the second independent statement of
`SCREEN_SIZES`: the first reads where programs draw pictures, this one reads the array, and they agree
on all four architectures that state one. On arch 10 it gives **128 by 160 for the Harmony 890 and
895**, with five full screen pictures each, and those two payloads use exactly the ten distinct
picture sizes a Harmony 880 and 885 use, where a Harmony 600 and a Harmony One share none of them.
[findings.md](../../docs/findings.md) section 179.

**Two opcodes draw one**, 2 and 3, each naming it in its last three operand bytes. This said "exactly
two per container are not" drawn on arch 8 and arch 14 until section 146, and those were opcode 3's:<!--superseded-->
4548 of 4548 opcode 3 instructions in the corpus name a picture, arch 12 emits none at all and arch 9
emits nothing else, which is why a reader written from opcode 2 looked complete on the architecture
this project reads code on and reported zero pictures for a Harmony 525.

**They are not two spellings of one instruction.** Opcode 2 draws a whole picture at an origin, two
operand bytes:

```
+0x00  u8   x
+0x01  u8   y
...          the last three bytes are the u24 address
```

Opcode 3 is a **region copy**, nine operands, and the destination comes first:

```
+0x00  u8   dx     where on the display it lands
+0x01  u8   dy
+0x02  u8   sx     where in the picture it comes from
+0x03  u8   sy
+0x04  u8   w      in pixels, both ends
+0x05  u8   h
+0x06  u24  the picture's address
```

Read as stated, every destination rectangle fits its display and every source rectangle fits the
picture it names, 3540 of 3540 across the corpus. Swapping the two pairs puts 292 of the 708
asymmetric arch 8 instructions outside their own picture, against none as stated.
[findings.md](../../docs/findings.md) sections 118 and 148.

2624 of the 3540 copy a rectangle onto itself, which is a page strip drawn where it already sits.
Why is unread and it costs nothing either way, since the copy is idempotent.

**On the Harmony One the whole screen background is all black and stored more than once**: raw, 176 by 220, every
pixel `0x0000`, 77445 bytes, three times on four of the sixteen English compiles of skin 54 and four times on the
other twelve, each copy byte identical. Six of the seven blank screens a timer enters draw three photographs of the same size
instead, two screens each, and the seventh draws the charging screen's picture. A configuration of ours holds the background once and those screens draw it too, every
reference to a copy or a photograph pointed at the one; and since section 425 that one is not a picture but one fill of
the screen per draw, opcode 1 with 0, 0, 176, 220 and colour 0, seven bytes where a draw is six, `withPictureFilled`,
unless `TouchChoices.backgroundFill` keeps the picture. **A picture nothing names is not a piece of its own** to
`takeApart`: its bytes are carried on the end of the piece before it, so taking one out is a cut by the extent its
header states. [findings.md](../../docs/findings.md) section 422.

**Which of the Harmony One's fixed pictures leave pixels undrawn**, the same on every stored copy of all nineteen One
compiles: of the 29 images behind the 23 drawings `families/touch/pictures.ts` names, the ten battery gauge pictures,
20 by 11, and the charging problem's cross, 87 by 62, and no other. Every gauge picture leaves its row 0 and column 0
undrawn, 30 pixels, but the battery gauge's level 0, Logitech's grey question mark, which is drawn at every pixel;
eight leave three or four pixels more at the picture's corners, the charging animation's third frame a fifth inside
its body; level 3 leaves 69, its bottom row and most of the right end of its body and tip among them. The cross leaves
4028 of its 5394 undrawn, everything outside its circle's silhouette, a roughly round blob of 1366 drawn pixels.
**Ours are transparent where our own drawing leaves a pixel empty** since section 428, by default, and what it leaves
empty is a choice: the gauges at row 0 and column 0 alone, as nine of Logitech's ten do, the box from x 1 and y 1
drawn black where no ink falls; the cross at every pixel outside its circle that the icon does not ink, 4458, its
paper a disc of radius 10 of the icon font's 24 units, encoded at 2069 bytes; and every other picture at no pixel. Built with no configuration, `touchFixedPictures`; the
masked form of section 422, Logitech's undrawn pixels taken off the picture replaced, is `TouchChoices.logitechMasks`.
[findings.md](../../docs/findings.md) section 428.

**A config's interface is localised and no field says which language.** Every word a remote shows is
in the file as a run of glyph codes, in the language of whoever generated it, and the language itself
is a property of a few hundred strings and of nothing else. Twelve of the thirteen user configs here
are English and one is Dutch. It is therefore **inferred**, from Logitech's own menu and Help wording,
which answers on all thirteen with every rival language at zero and refuses on the three containers
that are nobody's config. A third to a half of the mode pages are the Help walkthrough, whose wording
is that template with the user's own device names in it, so a generator has to know the language and a
reader does not. `configLanguage`, `LANGUAGE_MARKERS`. [findings.md](../../docs/findings.md) section 149.

**For a writer:** the language cannot be changed by editing a field, because there is no field. It
means regenerating every drawn string, and the service that held Logitech's translations is the
discontinued one.

**A config states its own display size**, and both opcodes say it: opcode 2 as an origin plus the
picture's own dimensions, opcode 3 as `dx + w` by `dy + h` from the instruction itself. Nine
containers state it both ways and agree exactly, on arch 8 and arch 14, which is what makes opcode 3
trustworthy on arch 9, where it is the only witness and where the 96 by 64 rested on nothing in the
container until section 148. `SCREEN_SIZES`. [findings.md](../../docs/findings.md) section 148.

The start is found by trying offsets above the named content under two constraints, the exact
landing and the presence of every addressed picture; exactly one candidate satisfies both, except in
the arch 9 safe mode container, where two do because two of its four pictures are addressed by
nothing.
`gspm.picture_bank`. [findings.md](../../docs/findings.md) sections 49 to 55.

**For a writer:** a picture's position is implied by everything before it, so inserting or resizing
one moves every later address.
Read with `gspm.bitmaps` and `gspm.bitmap_at`. [findings.md](../../docs/findings.md) section 50.

**A pixel is RGB565 stored high byte first**, section 129, which is the one field in this format that is
not little endian: it is the order a display controller takes over a serial bus, so a picture is stored
the way it is sent. Reading it the other way shifts the green field across the red and the blue and
draws a rainbow. Arch 9 (Harmony 525) is the exception, one bit a pixel with the row padded to a whole
byte, and its glyphs are two bit grey where 1 is ink and 2 is paper.

**A skipped pixel in an encoded picture is transparent, not background**, which is what lets an icon be
drawn over a screen already painted.

**A picture and a glyph are written back from their pixels by one rule**, section 363, measured on arch 8,
10, 12 and 14 and not on arch 9 (Harmony 525):

* **kind**: encoded (1) when any pixel is undrawn, raw (0) otherwise; no encoded picture in the corpus draws
  every pixel;
* **stream**, kind 1: per row, left to right, maximal runs of undrawn and drawn pixels, each cut at 127 (measured
  for a skip only: no drawn run in the corpus exceeds 122); an
  undrawn run is `0x80 | n`, a drawn run is `n` and its `n` pixels high byte first; the row's trailing undrawn
  run is written; `0x80` between rows, `rows - 1` of them; `0x00` after the last row;
* **a glyph**, base slot 7: its width byte, then the same stream with pixels high byte first, as a
  picture's: the firmware sends both to the panel in stored order through one routine, section 367. This
  said "low byte first"<!--superseded--> until then, which was the reader's assumption and drew every text in the wrong colour.

The format admits other streams for the same pixels, a row without its trailing skip for one; Logitech's
compiler emits this one for every picture and glyph of the 37 containers on arch 8, 10, 12 and 14 measured,
so a re-encoded Logitech image is its original bytes. `encodeBitmap`, `encodeGlyph`.

**The display is what the config's own full screen pictures say**, section 129: 128 by 160 on arch 8
(Harmony 880), 96 by 64 on arch 9 (Harmony 525), 176 by 220 on arch 12 (Harmony One) and 128 by 128 on
arch 14 (Harmony 600 and 700). Every architecture's drawn text stops just inside its own figure.

**The pen advance past a glyph's stated width is nothing**, section 129: the gap between letters is a
background column the glyph itself carries. `packages/codec/src/render.ts` draws a page from these, and
every mode page of every container in the corpus renders with no picture and no glyph unresolved.

Opcode 3 draws the same object with a six byte position record instead of two. On arch 8, 12 and 14
it is used by one instruction in the whole corpus, so its operand layout there is read from the
firmware and exercised by almost nothing. **On arch 9 it is the ordinary way to draw**, 1856 times
across the two user configs, always preceded by an opcode 22 naming the row: two `(0, 8 * row)`
pairs, then 96 by 8, then the picture. [findings.md](../../docs/findings.md) section 85.

#### What fills the region

The pictures above, and nothing else. The region is one contiguous array of them from the end of
the named content to the trailer, walkable end to end in all nine containers that have a **bank**,
and screen opcode 2 inside a mode program is what addresses them.

**This subsection used to say the opposite and the correction is worth reading.** It described the
region as raw image data with **no header and no framing**, so that "where one image starts is<!--superseded-->
unknown and nothing found so far addresses them", and it gave the arch 14 width as not<!--superseded--> established.
All three were wrong, and each fell to a different finding:

* the framing is the picture header, `u8 kind; u16 stride; u16 rows`, section 54;
* what addresses them is screen opcode 2 in a mode record's own program, which was unreachable
  until an operand count was fixed, sections 53, 54 and 64;
* the arch 14 width is stated by `stride` like every other, so nothing has to be recovered.

What survives is the arch 12 **geometry**, and it survives as an independent confirmation rather
than as the reading: rows of 176 big endian RGB565 pixels over 220 rows, recovered on both Harmony
Ones by minimising the vertical pixel difference across candidate widths, with the height fixed by
blank screens of exactly 77440 bytes. Section 54 then found the header states `stride 176,
rows 220`. A measurement and a declaration agreeing is worth more than either alone, which is why
`harmony/region.py` is kept even though nothing needs it any more. It is reverse engineering only
and deliberately not in `packages/codec`: a width recovered by minimisation is a measurement, not a
reader. [findings.md](../../docs/findings.md) sections 51, 54 and 55.

### Base slot 11: the screen program table

```
+0x00  u16  count
+0x02  u24  address[count]
```

One of the six recognised pointer arrays. Each entry is a screen program. On arch 14, 5703 of the
700's 5711 entries are the same two instruction program, queue one action list instruction and end,
so the table is mostly indirection.

**Only entries 0 to 255 can run.** Action `0x73` is the table's one reader and it indexes with the
operand's low byte, read on the Harmony 600 0.2, the Harmony 650 0.2 and 0.4, the Harmony 700 2.8 and
the Harmony One 3.4; on the four arch 14 images the table is sought at that one site and no other. So
an operand of 256 or more runs entry `operand & 0xff`, and a program of ours has to take a free entry
below 256 rather than be appended. [findings.md](../../docs/findings.md) section 369.

**The corner program**, which the codec named a battery program until its names took up section 369, and which draws the sending mark,
section 369, is one shape on every Harmony 600, 650 and 700 compile, 70 of 70 on 24, three runs back to
back, section 374:

```
+0x00  12 11 01 00 u24 case0  01 01 03 u24 range   switch on variable 17: case 0, range 1 to 3
+0x0D  11 FA FF 07 00                              the tail: queue 0x07 0xFFFA, end
+0x12  02 72 70 u24 patch  14 u24 tail             case 0: the state's 12 by 10 patch at 114, 112
+0x1C  02 72 70 u24 mark   14 u24 tail             range: the mark at 114, 112
```

What `0x07 0xFFFA` does is not read.

**A configuration of ours holds one corner program per state it draws**, section 377: the idle one from
the start at entry 0, and the device state's appended at the table's length when the first device is
composed, with the state's flat background and patch beside it. Both are this shape, the patch in the
state's colour and the mark the same picture. Found again by content in the colour, `stateLookOf`.

**On the Harmony One the table is generated and every case program is built**, section 416,
`families/touch/caseprograms.ts`. On all nineteen One compiles the table is the clock header's four
programs at their entries (section 414), then every base slot 14 case's program in record order, each
record's cases in stored order and its ranges after, no program twice: `4 + ours + 4 × activities`
entries, 805 over the nineteen. Base slot 14 is one catalogue of sixteen records on every compile,
fifteen on the everyday One's, which keeps no Remote Assistant; the order of the records differs by
compile. Every case program is five bytes queuing one instruction (`11 lo hi op 00`), a lone `00`, or a
frame of four fills.

| role | keyed by | its cases |
|---|---|---|
| devices route, working route, select route | the location | at 0, `0x72` on the record named, on the activity counter |
| idle | the location | at 0, write the idle value into the counter |
| menu, help | the location | at 0, `0x7E` the activity menu; `0x7E` the power off help screen, help looked up by one handler set's tag `0xA6` alone |
| all off | the location | at 0, every power variable: a lone `00` with none, the one write `Power := 0` with one, `0x7F` a list of every power variable's write with several (1, 2 and 16 of 19) |
| devices, devices unread | the counter's values | at the idle value `0x7E` the idle device list; per activity, the activity's; the unread copy is looked up by nothing, 19 of 19 |
| working | the counter | at the idle value `0x72` menu on the location; per activity `0x7E` its working screen |
| select | the counter | none at the idle value; per activity `1F FF00 | set` |
| page | a variable the keys of the device pages, Options and the device lists look up | at 0 `0x7F` `[75 0FCA, 0x72 menu]`, at 1 `0x7F` `[75 0FCA, 0x72 working route]`, both on the location |
| assistant | the start up variable, section 403 | at 3 `0x7F` `[75 0FCA, v := 1, 07 FFF7]`, at 0 to 2 the same writing 3 |
| sound | the button sound variable | at 0 `0x7F` `[75 0FCA, 3F F300, v := 1, 07 FFF7]`, at 1 `[75 0FCA, 3F F301, v := 0, 07 FFF7]` |
| grid, column | a clock picker's variable | a frame per cell, `01 x y w h 07 EC` four times: cell k of the grid at x `4 + 83 (k mod 2)`, y `36 + 54 floor(k / 2)`, 83 wide; the column's three 166 wide; edges left (2, 52), right at x + w (2, 54), top (w, 2), bottom at y + 52 (w, 2) |

The location takes one value, 0. The cases at an activity's value are the activity's: one per activity
in each of devices, devices unread, working and select, 256 over the nineteen for 64 activities.
**Laid out** in table order, back to back, in two runs, the frames the second. **Described**: which
record each role is, the location, the counter, the idle value, the three modes, the six toggle lists'
indices and two toggle variables, and the all off's power variables in its order and its list; 24 bytes
read, besides the records' positions found by look, plus one per power variable and two for the all off's list, each number read once. **Generated**: every
opcode and the queue framing, the case values, the routes' and the page lists' `0x72` operands, the
clicks and constants, the unread copy's case, the frames, and the table. Rebuilt byte for byte on all
nineteen. **Unconfirmed**: what `07 FFF7` and the `3F F3vv` instruction do; which cell of a picker the
framed one is to a person.

**A program's storage ends with a `SCREEN_END` byte even where the last instruction is a jump or a
switch**, which no execution can reach. Confirmed positionally: in the same place, in front of a
mode page record, 91 to 294 programs per container end with a terminator that is reached, against
49 to 64 per arch 8 config that are not. A jump may also abut the next structure with no terminator
at all, 36 times on the One, so the byte is part of the program only when it is zero.
`docs/findings.md` section 84.

**The container at flash `0x002000` is the firmware's status screen library**, section 244, and
calling it the safe mode container understates it. Its screen programs are the messages a remote
shows when it is not showing a configuration: 30 on a Harmony One and 35 on arch 14, the arch 12 set
being the arch 14 set with its first five removed and the shared 30 in the same order. Five images
across two architectures agree, by two routes, a read off a remote's own flash and Logitech's own
firmware packages. Three of the 35 are about the configuration and they are **three different
screens**, an invalid one, a corrupted one and a request to go to the website and update settings, so
which one a stranded remote shows is diagnostic. Which condition selects a screen is **unread**, and
position does not: the website message is entry 0 on arch 12 and entry 5 on arch 14.

### Base slot 7: the font table

A count prefixed pointer array of 5 to 18 entries, indexed by **opcode 16 of the screen language**.
Each entry is one typeface:

```
+0x00  u8   glyph height in pixels, shared by every glyph in the set
+0x01  u8   the first glyph code
+0x02  u8   the glyph count
+0x03  u24  glyph[count]     NULL for a code this config never draws
```

**unless `+0x02` is zero**, and then the count is at `+0x01` and the first code is 1. That is a
discriminator and not an explanation, and it is what every arch 12 user config needs. A code's
index is `code - first`.

and each glyph

```
+0x00  u8   width in pixels
```

followed by one byte operations: `0x00` ends the glyph, a byte with bit 7 set skips that many
background pixels, and a byte below `0x80` introduces that many literal pixels of **two bytes**
each. A row is exactly `width` pixels and the next begins as soon as that many are accounted for;
the height comes from the set header rather than from the glyph.

The count is the same for every set in every **generated** config, 46 to 76, so it is a character
set size chosen per config. The arch 9 safe mode container declares 91, 90, 50 and 90 in one
container, so the field is per set and a generator happens to choose once.

**A glyph code is one based** in every generated config, because zero terminates an inline string
and nothing can name a glyph by the code zero. It is the header that says so, not the format: the
arch 9 safe mode container's sets start at 32 and its codes are ASCII, which is how the field was
read at all. `findings.md` section 78.

Three checks, on twelve containers across three architectures. Arch 9 is excluded because it packs
a glyph differently and has its own figures in the subsection below; the corpus totals including it
are 5220<!--fact:glyphs--> glyphs and 67303<!--fact:inline_string_codes--> codes.

* every row comes to exactly `width`, for **4838<!--fact:glyphs_two_byte_pixel--> glyphs**, with no stream ending mid row
* every glyph decodes to exactly the height its set declares, 3933 of 3933
* every inline string resolves: **63327<!--fact:string_codes_two_byte_pixel--> glyph codes** land on a non-NULL glyph of the font their
  own program selected, none out of range and none on an empty slot

Decoding with a one byte pixel instead fails on almost all of them, which is the calibration.

#### A font set is findable with no pointer slot

Base slot 7 names the table, so `fontSets` cannot answer on **arch 10 (Harmony 890 and 895)** where
the slot mapping is refuted. A set is findable anyway because of how much it has to get right at
once: a candidate is accepted only if **every** nonzero address in its array decodes into a glyph
whose rows tile exactly to its own declared width, at the set's declared height. `fontSetsByClosure`
is exact against the slot route on **14 of 14** containers, address for address.

Two thresholds, and they are separate because a real set can be almost entirely null, one Harmony One
set declaring 73 pointers of which 66 are: the array must hold at least 8 pointers and at least
`FONT_SET_MINIMUM_GLYPHS` of them must decode. That second one is a plateau, exact anywhere from 1 to
5, where 0 admits 179 false positives and 8 loses four real sets.

**The font table is not adjacent to the picture bank**, which was checked before being relied on: over
thirteen containers its top sits 1918 to 48385 bytes below the bank. [findings.md](../../docs/findings.md)
section 180.

**On arch 10 this gives eight sets** on both clean reads, 282 glyphs on the Harmony 890 and 277 on the
Harmony 895, heights 8, 11, 13, 14 and 15, 70 slots each and a first code of 1. The heights come in
the Harmony 880's own order, 14, 14, 15, 14, 13, 13, 8, 11. The encoding is two bytes a pixel, which
is **measured**: the arch 9 packed form finds zero sets in either container and the unpacked form
finds all eight. And the glyph shapes are named by the arch 8 alphabet at 213 of 237 and 212 of 229,
against 44 and 42 for the Harmony 600's and **0** for the Harmony One's, so a Harmony 890 uses the
Harmony 885 typeface. [findings.md](../../docs/findings.md) section 180.

**This does not give arch 10 its text.** A string's address comes out of a screen program, base slot
11, and these sets declare a first code of 1 rather than 32, so the codes are per container and a run
of printable bytes is not a string. `usesAscii` is false on both.
#### What a glyph code means, and how the text is recovered

**A code is not a character and not an encoding.** It is assigned per config, in the order
characters first appear in the generator's own string list, which is not the order the strings sit in
the file. So two configs of the same remote agree about the codes their shared boilerplate needs and
diverge from the first code the user's own strings reach: on the two Harmony Ones code 20 is a colon
in one and the digit `1` in the other.

What is stable is the **typeface**. The same character at the same size has the same pixels in every
config of a skin, so a code is resolved by matching its glyph's pixels:

* a shape is keyed by `(font height, pixels)`. Height is part of it because `I` and `l` are the same
  pixels at several sizes, and a size blind key reads a tall `l` as an `I` from a smaller set.
* evidence is **intersected** across the sets a code appears in, not counted: a size where two
  characters share a shape says less than a size where they do not.
* a **blank** glyph is a space and is evidence about nothing else. A set carries a blank slot for
  codes it does not draw, and the same code is a real letter in another set.
* a shape that draws two characters keeps both. Eight in the corpus do, all `I` against `l`, and a
  code that only appears at those sizes stays ambiguous and is reported as such.

Seven typefaces cover the corpus, one alphabet each: the Harmony One skin (all four arch 12 user
configs), arch 14 (the 600 and both 700s), arch 8 (all four), the Harmony 525, the arch 9 safe mode
container, the arch 12 safe mode container and the arch 14 safe mode container. **The arch 12 safe
mode container shares not one shape with the arch 12 user configs**, so an alphabet is per typeface
and not per architecture or per remote.

**The arch 9 safe mode container's codes are ASCII outright**, its sets starting at code 32, which is
both how the field at `+0x01` was read, section 78, and how the 525's user config was decoded without
reading its glyphs: the two share a typeface.

170920<!--fact:text_read--> of 170922<!--fact:text_glyphs--> drawn glyphs across the corpus come back as
characters. The two that do not are one code drawn once in each Harmony 700 config. The closure is
that a decoded string turns up verbatim inside a base slot 0 name, which is ASCII and which this
decoder never reads: fifteen of the sixteen containers with a name tree do it, between three and
eleven distinct strings each. The exception is the arch 9 safe mode container, which names one variable
and draws none of it because it holds no devices.

**A glyph code is one character and a character is one code**, which is the generator's own rule: the
code is that character's position in the string list it walks. Two uses, section 124. As a check it
found three hand read labels that were wrong, each showing up as a character sitting on two codes at
once. As a resolver it settles the one pair no shape distinguishes, `I` against `l`, and the other,
`O` against a zero drawn without a slash: whichever member another code has already settled is not
available to this one.

A **writer** gets no shortcut from any of this: to add text it has to build a font set and number it,
because the codes are the generator's own and nothing looks a character up.

Read with `characterMap`, `screenStrings` and `textCoverage` in `packages/codec/src/text.ts`, the
alphabets in `packages/codec/src/alphabets.ts`, and `make text` for the per container figures.
[findings.md](../../docs/findings.md) section 112.

Read the sets and glyphs with `gspm.font_sets`, `gspm.Container.images` and `gspm.Container.glyph`;
draw them with `tools/screen_dump.py --images` or `--strings`. [findings.md](../../docs/findings.md) sections 46
and 63.
