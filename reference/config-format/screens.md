# Screens

A Harmony's screen shows only what its configuration tells it to show. The configuration carries small
programs in a drawing language of its own: fill a rectangle, put a picture here, write this text there,
choose a font, look at a value the remote keeps and pick what to draw from it. The pictures sit in one long
array near the end of the file, the **picture bank**. Letters are pictures too: a font is a table of small
images, and a piece of text is a list of numbers that pick images out of that table, not letters in any
standard encoding. That is why nothing in a configuration says which language it is in, and why adding text
means building the images for it.

This page describes those structures as every architecture shares them, and says where one differs. What a
remote's screen looks like to a person is on its model's display page, for example
[the Harmony One's](../remotes/harmony-one/display.md) or [the Harmony 650's](../remotes/harmony-650/display.md).
What Logitech's compiler draws with them is on the compiler pages of
[the Harmony 600, 650 and 700](../architectures/harmony-600-650-700/compiler.md) and
[the Harmony One](../architectures/harmony-one/compiler.md).

## The screen language

A second interpreter, separate from [the action lists](actions.md), with one byte opcodes of its own. It
draws the display.[^s40] A program is reached three ways: from base slot 11, [the screen program
table](#base-slot-11-the-screen-program-table); from a base slot 14 lookup, [state](state.md); and from a
mode record, whose own program sits immediately after its tagged list, [modes and keys](modes-and-keys.md).
That third way is where the full screen pictures are named. It is measured on arch 8 and 14[^s53], on arch
12[^s54], and on arch 9, where every mode record's program is also a page's program[^s118].

| opcode | operands | meaning |
|---|---|---|
| 0 | none | end |
| 1 | `x`, `y`, `width`, `height`, then a colour high byte first | fill the rectangle with the colour, [below](#filling-a-rectangle) |
| 2 | 2 position bytes, `u24` | draw the picture at that address, [below](#placing-a-picture-opcodes-2-and-3) |
| 3 | 6 position bytes, `u24` | copy a region of the picture at that address, destination first, [below](#placing-a-picture-opcodes-2-and-3) |
| 4 | 2 position bytes, `u24` | draw the glyph string at that address, which is **another program's own**, [below](#text-opcodes-4-and-5) |
| 5 | 2 position bytes, then the string | draw the glyph string inline |
| 16 | 1 byte | select the font, an index into base slot 7 |
| 17 | `u16` operand, `u8` opcode | queue an action list instruction |
| 18, 19 | a switch, below | switch on a state variable and jump |
| 20 | `u24` | jump |
| 21 | 4 bytes | *arch 8 only*, meaning unknown; the length is inferred from the configurations |
| 22 | **per architecture**, [below](#opcodes-22-and-23-per-architecture) | *arch 12*: call. *arch 9*: select a screen page |
| 23 | none | **per architecture**: *arch 12* the return matching opcode 22; *arch 9* the page transfer |

The opcodes and their handlers are read in the firmware of the Harmony One 3.4, the Harmony 600 0.2 and the
Harmony 700 2.8[^s40], opcode 23's empty operand on the Harmony One[^s54b], and opcode 21's length is
inferred from four arch 8 configurations[^s40b].

**22846<!--fact:screen_programs--> programs across 19<!--fact:containers--> containers and four architectures
decode with nothing left over**, which is the check that matters: an instruction has no length field, so a
wrong operand count throws the walk out of step at once.[^s53][^s54]

Read with `gspm.screen_program` and `gspm.screen_program_roots`, or print one with `tools/screen_dump.py`.

### Filling a rectangle

**Opcode 1 fills a rectangle.** Six bytes: `x`, `y`, `width`, `height`, one byte each, then the colour as two
bytes in the order a picture's pixel is stored, high byte first. The remote fills one row at a time from `y`
while the row is below `y + height` **taken in eight bits**, so a rectangle whose `y + height` is 256 or more
draws nothing (220 rows from `y` 40 end at row 4). Each row is clipped to the display, its width to the
columns right of `x`, and a row or a column past the screen is drawn nowhere. A width of 0 is not read.[^s425]

Read in full on the Harmony One 3.4, and on the Harmony 600 and 650 0.2 and the Harmony 700 2.8 as far as the
row loop and the row routine's clip at 128 by 128[^s425]. The Harmony 650 0.4 image and arch 8, 9 and 10 are
not checked[^unchecked]. What Logitech uses it for on the Harmony One is on [its compiler
page](../architectures/harmony-one/compiler.md#pictures), and that the Harmony One draws a page over what the
screen held is on [its display page](../remotes/harmony-one/display.md#how-the-screen-is-drawn). Whether the Harmony 600, 650 and 700 clear the screen before a page is not
read[^unchecked].

### Text, opcodes 4 and 5

**The inline strings are glyph codes, not characters.** The renderer resolves one by indexing the selected
font by the code minus the font's first code, which is one in every generated configuration.[^s46][^s78] A
code with bit 7 set is the first half of a wide code and takes a second byte with it, so a terminator cannot
be found by scanning for a zero.[^s121] Whether any configuration holds a wide code is not
checked[^unchecked]. What a code means is per configuration, and the text is recovered from the glyph's
pixels, [below](#what-a-glyph-code-means-and-how-the-text-is-recovered).

**Opcode 4 is the commoner of the two, and its target is never a place of its own.** In 12052 of 12052
instances, on four architectures, its `u24` lands on the glyph payload of some opcode 5 instruction in another
reachable program, three bytes past that instruction's start. So a string is stored once, inline, by
whichever program draws it that way, and every other program that wants it names those bytes:
15742<!--fact:text_referenced--> of the configurations' 23419<!--fact:text_draws--> drawn strings are
references, two draws in three.[^s121]

The run it names is read exactly as opcode 5's is, ended by a zero byte. It may be **empty**: nine
references in each arch 8 configuration name a string of no length, which is a blank label at a
position.[^s121]

### The switch

Opcodes 18 and 19 differ only in the width of their counts and values:[^s40]

```
u8    state variable index
count                                     u8 in opcode 18, u16 in opcode 19
{ value; u24 target }[count]              value likewise one byte or two
count
{ low; high; u24 target }[count]
```

### Opcodes 22 and 23, per architecture

**Opcode 22 is the one opcode whose operand width is not the same everywhere**, so a parser has to know the
architecture before it can walk past one.

* **Arch 12 (Harmony One)**: **3** bytes, a `u24` target. It seeks there and keeps the position after its
  operands in a link register, which opcode 23 restores: a call and its return, read out of the handlers at
  `0x2966E` and `0x29640` on the Harmony One 3.4 image. There is **one** link register, so calls do not
  nest.[^s64] No arch 12 configuration uses it, so the width is the firmware's and the semantics are not tried
  against data.[^s64b]
* **Arch 10 (Harmony 890 and 895)**: **3** bytes, measured per program: every mode page program that was
  otherwise unread decodes and lands exactly on its own end under three, 49 of 49 on a Harmony 890 and 34 of
  34 on a Harmony 895.[^s185] What it does there is not read, since no firmware image exists[^unchecked].
* **Arch 9 (Harmony 525)**: **1** byte, a page index from 0 to 7, and the instruction after it is an ordinary
  opcode 3 drawing a 96 by 8 strip at `y = 8 * index`. Every mode page's program issues the eight once each,
  and every strip on a page comes from the same 96 by 64 picture, the whole panel.[^s85] The index is sent to
  the display controller as a page address, and **opcode 23 transfers 96 pixels into that page**: the 525's
  panel is addressed as eight pages of eight pixel rows.[^s101] How its display controller is driven is on [the
  525's firmware page](../architectures/harmony-5xx/firmware.md#the-display-driver).
* **Arch 8 and arch 14**: whether either opcode exists there is not read[^unchecked].

### Where a program ends

**A program's storage ends with a `SCREEN_END` byte even where its last instruction is a jump or a switch**,
which no execution can reach. Positionally, in front of a mode page record, 91 to 294 programs a container
end with a terminator that is reached, against 49 to 64 per arch 8 configuration that are not. A jump may
also abut the next structure with no terminator at all, 36 times in a Harmony One configuration, so the byte
belongs to the program only when it is zero.[^s84]

## The picture bank

A picture is a five byte header and then its pixels. **Every picture a configuration holds sits in one
contiguous array**, the picture bank, running from the end of the named content to the trailer, with **no
table, no count and no header**. Walking it from its start lands exactly on the trailer in every container
that has one.[^s55] A Harmony One configuration holds 98 pictures, a Harmony 600's 18, a Harmony 700's 24
and an arch 8 configuration 31 to 33.[^s146] **Every picture in a bank is drawn by a screen program**, on all
four architectures, with two exceptions in all the configurations read and both in the arch 9 safe mode
container; so the bank is the set of pictures the programs draw rather than a region that happens to hold
them.[^s146]

### A picture

```
+0x00  u8   kind
+0x01  u16  stride, the width in pixels
+0x03  u16  rows
+0x05       the pixels
```

* **Kind 0** is raw rows, so it is exactly `5 + 2 * stride * rows` bytes, and consecutive pictures in a bank
  sit exactly that far apart.[^s50][^s54]
* **Kind 1** is encoded: the renderer reads and discards the two sizes and runs the skip and literal
  encoding of a glyph, over **two byte** pixels, ending at a `0x00` control byte, [the font
  table](#base-slot-7-the-font-table). It still breaks rows exactly `rows - 1` times, which is the closure
  its extent rests on, on all 51 encoded pictures of arch 8, 12 and 14.[^s50]
* **Kind 2** is a bare `RETURN` in the arch 12 and arch 14 firmware, valid and drawing nothing, and a higher
  kind returns without reading the header.[^s50] **On arch 9 (Harmony 525) kind 2 is the only kind used,
  one bit a pixel**, since the panel is monochrome. A row is padded to a whole byte, so the picture is
  `5 + ceil(stride / 8) * rows` bytes: a 96 pixel row is 12 bytes and a 19 pixel one 3.[^s62][^s85] Every
  picture in an arch 9 user configuration is 96 by 64, the whole panel, at 773 bytes; the safe mode container
  also carries a 19 by 10 and an 18 by 10.[^s85]

**A pixel is RGB565 stored high byte first**, the one field in this format that is not little endian: it is
the order a display controller takes over a serial bus, so a picture is stored the way it is sent. Read the
other way, the green field shifts across the red and the blue.[^s129] Arch 9 is the exception, one bit a
pixel, and its glyphs are two bits, 1 the ink and 2 the paper, [the 525's
display page](../remotes/harmony-525/display.md#how-a-glyph-is-packed).[^s63]

**A skipped pixel in an encoded picture is transparent, not background**, which is what lets an icon be drawn
over a screen already painted.[^s129] Which of Logitech's pictures leave pixels undrawn is per model, for
example [the Harmony One's gauges](../remotes/harmony-one/display.md#how-the-screen-is-drawn).

**Two size classes.** The pictures base slot 11's programs name are icons, 245 to 1765 bytes. The ones a
**mode record's** program names are full screens: 128 by 128 on arch 14, 128 by 160 on arch 8 and 176 by
220 on arch 12, which is the Harmony One's panel.[^s53] The icons' strides are 12 on the Harmony 600 and
700, 16 to 19 on arch 8 and 20, 22 or 88 on the Harmony One, over 10, 11 or 18 rows.[^s50b]

### Placing a picture, opcodes 2 and 3

**Two opcodes draw a picture**, each naming it in its last three operand bytes, and 4548 of 4548 opcode 3
instructions in the configurations name a picture. Which architecture uses which: arch 12 emits no opcode 3
at all, arch 9 emits nothing else, and arch 8 and arch 14 name most of their pictures with opcode 2 and two
of them with opcode 3.[^s146]

**They are not two spellings of one instruction.** Opcode 2 draws a whole picture at an origin:[^s50]

```
+0x00  u8   x
+0x01  u8   y
+0x02  u24  the picture's address
```

Opcode 3 is a **region copy**, nine operand bytes, the destination first:[^s118][^s148]

```
+0x00  u8   dx     where on the display it lands
+0x01  u8   dy
+0x02  u8   sx     where in the picture it comes from
+0x03  u8   sy
+0x04  u8   w      the region's size in pixels
+0x05  u8   h
+0x06  u24  the picture's address
```

Read as stated, every destination rectangle fits its display and every source rectangle fits the picture it
names, 3540 of 3540; swapping the two pairs puts 292 of the 708 asymmetric arch 8 instructions outside their
own picture, against none as stated.[^s148] On arch 9 the asymmetric ones settle the same order: all 34 are
a one pixel rule at `(0, 12)` under a page title, and the page opcode 22 has just selected contains the first
pair and not the second, 55 of 55.[^s118] 2624 of the 3540 copy a region onto itself, a page strip drawn
where it already sits; why is not read, and it costs nothing since the copy is idempotent.[^s148]

### Where the bank starts

**Where the bank starts is stated three ways, and the third needs no pointer slot.** Base slot 17 names it,
two bytes in front, on arch 8, 9 and 14.[^s62] Arch 12 uses that slot for the touch hit map,
[modes and keys](modes-and-keys.md), so there the bank is found by searching upward from the end of the
named content for the one start whose walk lands exactly on the trailer and contains every picture a
program addresses. Exactly one start satisfies both, except in the arch 9 safe mode container, where two do
because two of its four pictures are addressed by nothing.[^s55][^s146] Both routes need the section
readers. The third needs only the trailer's position, which the framing states, and it is what reads on
arch 10, where no slot reader is trusted:[^s179]

1. walk from every offset in the blob, keeping the offsets whose walk lands exactly on the trailer
2. discard any whose pictures exceed 256 pixels in either axis, which is `PICTURE_CEILING`
3. take the survivor with the most pictures, which is then the lowest

It agrees with the reader route on **14 of 14** containers whose bank that route can locate, start address
and picture count both, over four architectures. Step 3 alone is right on 9 of the 14 and step 1 alone on 4,
so both filters are load bearing. The ceiling is a plateau: 224, 256, 400 and 1024 give the identical answer
everywhere, and 180 does not, because it is below the Harmony One's 220 pixel backgrounds.[^s179]
`pictureBankByClosure`, `gspm.picture_bank`. What it finds on the Harmony 890 and 895 is [their memory
page](../architectures/harmony-890-895/memory.md).

### The display size

**A configuration states its own display size**, twice. The screen programs say it: opcode 2 as an origin
plus the picture's own size, opcode 3 as `dx + w` by `dy + h`; nine containers state it both ways and agree
exactly, on arch 8 and arch 14, and on arch 9 opcode 3 is the only witness.[^s148] And **the largest picture
in a bank is the display size**, which agrees on all four architectures that state one.[^s179] Both are
`SCREEN_SIZES`.

| architecture | display |
|---|---|
| arch 8 (Harmony 880 and 885) | 128 by 160[^s129] |
| arch 9 (Harmony 525) | 96 by 64[^s129] |
| arch 10 (Harmony 890 and 895) | 128 by 160[^s179] |
| arch 12 (Harmony One) | 176 by 220[^s129] |
| arch 14 (Harmony 600, 650 and 700) | 128 by 128[^s129] |

Every architecture's drawn text stops just inside its own figure, and **the pen advances nothing past a
glyph's stated width**: the gap between letters is a background column the glyph itself carries.[^s129]
`packages/codec/src/render.ts` draws a page from these, and every mode page of every container renders with
no picture and no glyph unresolved.[^s129]

### Writing a picture or a glyph back

**A picture and a glyph are written back from their pixels by one rule**, measured on arch 8, 10, 12 and 14
and not on arch 9:[^s363]

* **kind**: encoded (1) when any pixel is undrawn, raw (0) otherwise; no encoded picture in the
  configurations draws every pixel;
* **stream**, kind 1: per row, left to right, maximal runs of undrawn and drawn pixels, each cut at 127
  (measured for a skip only: no drawn run in the configurations exceeds 122); an undrawn run is `0x80 | n`, a
  drawn run is `n` and its `n` pixels high byte first; the row's trailing undrawn run is written; `0x80`
  between rows, `rows - 1` of them; `0x00` after the last row;
* **a glyph**, base slot 7: its width byte, then the same stream with its pixels high byte first, as a
  picture's, since the firmware sends both to the panel in stored order through one routine.[^s367]

The format admits other streams for the same pixels, a row without its trailing skip for one; Logitech's
compiler emits this one for every picture and glyph of the 37 containers measured, so a re-encoded Logitech
image is its original bytes.[^s363] `encodeBitmap`, `encodeGlyph`.

## Base slot 11: the screen program table

```
+0x00  u16  count
+0x02  u24  address[count]
```

One of the six [pointer arrays](container.md). Each entry is a screen program, and the table's one reader
is action `0x73`, which queues the program.[^s40][^s369] On a Harmony 700 configuration 5703 of the 5711
entries are the same two instruction program, queue one action list instruction and end, so the table is
mostly indirection.[^s40b]

**Only entries 0 to 255 can run.** Action `0x73` indexes the table with its operand's low byte, read on the
Harmony 600 0.2, the Harmony 650 0.2 and 0.4, the Harmony 700 2.8 and the Harmony One 3.4; on the four arch 14
images the table is sought at that one site and no other. So an operand of 256 or more runs entry
`operand & 0xff`.[^s369]

What Logitech's compiler keeps in the table differs by platform: the program in the screen's corner that
draws the sending mark on [the Harmony 600, 650 and 700](../architectures/harmony-600-650-700/compiler.md#a-corner-pages-chrome),
and on [the Harmony One](../architectures/harmony-one/compiler.md#the-screen-program-table-and-the-value-maps) a table generated from the clock's
programs and every base slot 14 case's program.

## Status screens

**The container the firmware falls back on is a library of status screens**: its screen programs are the
messages a remote shows when it is not showing a configuration, 30 on a Harmony One and 35 on arch 14, the
arch 12 set being the arch 14 set with its first five removed and the shared 30 in the same order. Five
images across two architectures agree, by two routes, a read off a remote's own flash and Logitech's own
firmware packages. Three of them are about the configuration and they are **three different screens**, an
invalid one, a corrupted one and a request to go to the website and update settings, so which one a remote
shows says what went wrong.[^s244] Where the container sits is on each platform's memory page,
[the Harmony One's](../architectures/harmony-one/memory.md) and
[the Harmony 600, 650 and 700's](../architectures/harmony-600-650-700/memory.md).

**The screen shown is a status code plus a base per container.** The firmware raises a numbered status, the
same number on every architecture, and displays the record at that number plus the container's base: 0 on
the Harmony One, 5 on arch 14 and 11 on the Harmony 525, whose records are read here in a user
configuration rather than a status container. One base per container fits every screen, and neither neighbouring offset does.[^s249] Where arch 9 and arch
14 add their base is not read[^unchecked].

## Base slot 7: the font table

A count prefixed pointer array, indexed by **opcode 16 of the screen language**; Logitech's configurations
hold 5 to 18 entries. Each entry is one typeface:[^s46b]

```
+0x00  u8   glyph height in pixels, shared by every glyph in the set
+0x01  u8   the first glyph code
+0x02  u8   the glyph count
+0x03  u24  glyph[count]     NULL for a code this configuration never draws
```

**unless `+0x02` is zero**, and then the count is at `+0x01` and the first code is 1. That is a
discriminator and not an explanation, and it is what every arch 12 user configuration needs. A code's index
is `code - first`.[^s78]

and each glyph

```
+0x00  u8   width in pixels
```

followed by one byte operations: `0x00` ends the glyph, a byte with bit 7 set skips that many background
pixels, and a byte below `0x80` introduces that many literal pixels of **two bytes** each. A row is exactly
`width` pixels and the next begins as soon as that many are accounted for; the height comes from the set
header rather than from the glyph.[^s46b] Arch 9 packs a glyph differently, two bits a pixel, [the 525's
display page](../remotes/harmony-525/display.md#how-a-glyph-is-packed).[^s63]

The count is the same for every set in every **generated** configuration, 46 to 76, so it is a character set
size chosen per configuration; the arch 9 safe mode container declares 91, 90, 50 and 90 in one container, so
the field is per set and a generator happens to choose once.[^s46b]

**A glyph code is one based** in every generated configuration, because zero ends an inline string and
nothing can name a glyph by the code zero. It is the header that says so, not the format: the arch 9 safe
mode container's sets start at 32 and its codes are ASCII.[^s78]

Three checks, over every container but the Harmony 525's, whose glyphs are packed differently; the totals
including it are 5220<!--fact:glyphs--> glyphs and 67303<!--fact:inline_string_codes--> codes:[^s46b]

* every row comes to exactly `width`, for **4838<!--fact:glyphs_two_byte_pixel--> glyphs**, with no stream
  ending mid row;
* every glyph decodes to exactly the height its set declares, 3933 of 3933 on the twelve containers it was
  first measured on;
* every inline string resolves: **63327<!--fact:string_codes_two_byte_pixel--> glyph codes** land on a
  non-NULL glyph of the font their own program selected, none out of range and none on an empty slot.

Decoding with a one byte pixel instead fails on almost all of them, which is the calibration.[^s46b]

Read the sets and glyphs with `gspm.font_sets`, `gspm.Container.images` and `gspm.Container.glyph`; draw them
with `tools/screen_dump.py --images` or `--strings`.

### A font set is findable with no pointer slot

Base slot 7 names the table, so `fontSets` cannot answer where the slot mapping is not trusted, on arch 10. A
set is findable anyway because of how much it has to get right at once: a candidate is accepted only if
**every** nonzero address in its array decodes into a glyph whose rows tile exactly to its own declared
width, at the set's declared height. `fontSetsByClosure` is exact against the slot route on **14 of 14**
containers, address for address.[^s180]

Two thresholds, and they are separate because a real set can be almost entirely null, one Harmony One set
declaring 73 pointers of which 66 are: the array must hold at least 8 pointers and at least
`FONT_SET_MINIMUM_GLYPHS` of them must decode. The second is a plateau, exact anywhere from 1 to 5, where 0
admits 179 false positives and 8 loses four real sets.[^s180]

**The font table is not next to the picture bank**: over thirteen containers its top sits 1918 to 48385 bytes
below the bank, so the bank does not locate it.[^s180] What the closure finds on the Harmony 890 and 895 is
[their memory page](../architectures/harmony-890-895/memory.md).

### What a glyph code means, and how the text is recovered

**A code is not a character and not an encoding.** It is assigned per configuration, in the order characters
first appear in the generator's own string list, which is not the order the strings sit in the file. So two
configurations of the same remote agree about the codes their shared boilerplate needs and diverge from the
first code the owner's own strings reach: in two Harmony One configurations code 20 is a colon in one and
the digit `1` in the other.[^s112]

What is stable is the **typeface**. The same character at the same size has the same pixels in every
configuration of a skin, so a code is resolved by matching its glyph's pixels:[^s112]

* a shape is keyed by `(font height, pixels)`. Height is part of it because `I` and `l` are the same pixels
  at several sizes, and a key blind to size reads a tall `l` as an `I` from a smaller set;
* evidence is **intersected** across the sets a code appears in, not counted: a size where two characters
  share a shape says less than a size where they do not;
* a **blank** glyph is a space and is evidence about nothing else. A set carries a blank slot for codes it
  does not draw, and the same code is a real letter in another set;
* a shape that draws two characters keeps both. Eight do, all `I` against `l`, and a code that only appears
  at those sizes stays ambiguous and is reported as such.

Seven typefaces cover the configurations read, one alphabet each: the Harmony One's skin (every arch 12 user
configuration), arch 14 (the Harmony 600 and 700), arch 8, the Harmony 525, and the safe mode containers of
arch 9, arch 12 and arch 14. **The arch 12 safe mode container shares not one shape with the arch 12 user
configurations**, so an alphabet is per typeface and not per architecture or per remote.[^s112] **The arch 9
safe mode container's codes are ASCII outright**, its sets starting at code 32, which is how the field at
`+0x01` was read and how the 525's user configuration was decoded without reading its glyphs: the two share a
typeface.[^s78][^s112]

170920<!--fact:text_read--> of 170922<!--fact:text_glyphs--> drawn glyphs come back as characters. The two
that do not are one code drawn once in each Harmony 700 configuration. The closure is that a decoded string
turns up verbatim inside a base slot 0 name, which is ASCII and which this decoder never reads: fifteen of
the sixteen containers with a name tree do it, between three and eleven distinct strings each. The exception
is the arch 9 safe mode container, which names one variable and draws none of it because it holds no
devices.[^s112]

**A glyph code is one character and a character is one code**, which is the generator's own rule: the code
is that character's position in the string list it walks. As a check it found three hand read labels that
were wrong, each showing up as a character sitting on two codes at once. As a resolver it settles the one
pair no shape distinguishes, `I` against `l`, and the other, `O` against a zero drawn without a slash:
whichever member another code has already settled is not available to this one.[^s124]

Read with `characterMap`, `screenStrings` and `textCoverage` in `packages/codec/src/text.ts`, the alphabets
in `packages/codec/src/alphabets.ts`, and `make text` for the per container figures.

### The language a configuration is in

**A configuration's interface is localised and no field says which language.** Every word a remote shows is
in the file as a run of glyph codes, in the language of whoever generated it, and the language is a property
of a few hundred strings and of nothing else. Twelve of the thirteen user configurations read are English and
one is Dutch, and the language is **inferred** from Logitech's own menu and Help wording, which answers on all
thirteen with every rival language at zero and refuses on the three containers that are nobody's
configuration. A third to a half of the mode pages are the Help walkthrough, whose wording is that template
with the owner's own device names in it.[^s149] `configLanguage`, `LANGUAGE_MARKERS`.

## For a writer

* **A string is shared**: opcode 4 names another program's bytes, so editing a string in place changes
  every draw that names it.[^s121] Same family as the shared infrared duration blocks,
  [infrared records](infrared-records.md).
* **Opcode 22's width depends on the architecture**, and on arch 12 its call does not nest.[^s64][^s85][^s185]
* **Opcode 1 counts its rows in eight bits**, so a rectangle reaching row 256 draws nothing.[^s425]
* **A picture's position is implied by everything before it**, so inserting or resizing one moves every
  later address.[^s55] Read with `gspm.bitmaps` and `gspm.bitmap_at`.
* **The renderer loads only the low byte of a picture's stride and row count**, so a value above 255 is
  taken modulo 256 with no error, and **its row loop stops drawing at row 128** but still reads the rest of
  the picture. Read on the Harmony 700 2.8 image[^s50]; other images are not checked[^unchecked].
* **A program of ours that is queued takes a free base slot 11 entry below 256** and is never appended past
  it, since an operand of 256 or more runs entry `operand & 0xff`.[^s369]
* **A picture or a glyph re-encodes to its original bytes** by the rule above, and an editor still carries
  every image it did not change through unchanged.[^s363]
* **The language cannot be changed by editing a field**, because there is none: it means regenerating every
  drawn string.[^s149]
* **Adding text means building a font set and numbering it**, because the codes are the generator's own and
  nothing looks a character up.[^s112]

[^s40]: Read in the firmware. [Section 40](../../docs/findings.md#s40)
[^s53]: Measured in configurations. [Section 53](../../docs/findings.md#s53)
[^s54]: Measured in configurations. [Section 54](../../docs/findings.md#s54)
[^s54b]: Read in the firmware. [Section 54](../../docs/findings.md#s54)
[^s40b]: Measured in configurations. [Section 40](../../docs/findings.md#s40)
[^s425]: Read in the firmware. [Section 425](../../docs/findings.md#s425)
[^s46]: Read in the firmware. [Section 46](../../docs/findings.md#s46)
[^s78]: Measured in configurations. [Section 78](../../docs/findings.md#s78)
[^s121]: Measured in configurations. [Section 121](../../docs/findings.md#s121)
[^s64]: Read in the firmware. [Section 64](../../docs/findings.md#s64)
[^s64b]: Measured in configurations. [Section 64](../../docs/findings.md#s64)
[^s185]: Measured in configurations. [Section 185](../../docs/findings.md#s185)
[^s85]: Measured in configurations. [Section 85](../../docs/findings.md#s85)
[^s101]: Read in the firmware. [Section 101](../../docs/findings.md#s101)
[^s84]: Measured in configurations. [Section 84](../../docs/findings.md#s84)
[^s55]: Measured in configurations. [Section 55](../../docs/findings.md#s55)
[^s146]: Measured in configurations. [Section 146](../../docs/findings.md#s146)
[^s50]: Read in the firmware. [Section 50](../../docs/findings.md#s50)
[^s62]: Measured in configurations. [Section 62](../../docs/findings.md#s62)
[^s129]: Measured in configurations. [Section 129](../../docs/findings.md#s129)
[^s63]: Measured in configurations. [Section 63](../../docs/findings.md#s63)
[^s50b]: Measured in configurations. [Section 50](../../docs/findings.md#s50)
[^s118]: Measured in configurations. [Section 118](../../docs/findings.md#s118)
[^s148]: Measured in configurations. [Section 148](../../docs/findings.md#s148)
[^s179]: Measured in configurations. [Section 179](../../docs/findings.md#s179)
[^s363]: Measured in configurations. [Section 363](../../docs/findings.md#s363)
[^s367]: Read in the firmware. [Section 367](../../docs/findings.md#s367)
[^s369]: Read in the firmware. [Section 369](../../docs/findings.md#s369)
[^s244]: Measured in configurations. [Section 244](../../docs/findings.md#s244)
[^s249]: Read in the firmware. [Section 249](../../docs/findings.md#s249)
[^s46b]: Measured in configurations. [Section 46](../../docs/findings.md#s46)
[^s180]: Measured in configurations. [Section 180](../../docs/findings.md#s180)
[^s112]: Measured in configurations. [Section 112](../../docs/findings.md#s112)
[^s124]: Measured in configurations. [Section 124](../../docs/findings.md#s124)
[^s149]: Measured in configurations. [Section 149](../../docs/findings.md#s149)
[^unchecked]: Not checked.
