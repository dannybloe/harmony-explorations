# Modes and keys

### Base slot 6: the mode table

**Confirmed on 15<!--fact:user_configs--> user configs across four architectures.**

```
+0x00  u24  count
+0x03  u24  address[count]
```

A `u24` count, where the six recognised pointer arrays use a `u8` or a `u16`, so the parser's array
heuristic does not pick this slot up.

**The count is exactly one more than the largest `0x7E` operand, in every config**, over counts from
75 to 374. Every value in the event map of base slot 4 is in range too. So `0x7E` and the event map
both index this table, and `0x7E` is the instruction that **switches to the entry its operand
names**.

**The pointer does not land on the entry.** It lands inside the record, on a discriminator byte
with a `u24` back pointer to the record's start immediately after it, exactly as base slot 5's
infrared records do:

```
at the record start   u8 count; { u8 tag; u16 operand; u8 opcode }[count]
at the table pointer  u8 kind; u24 the record's own start; u16 pages; u24 page[pages]
```

Records are contiguous and run to about seven hundred bytes, so the pointer lands hundreds of bytes
past the head. Closures over 2926 records in 21 containers: the back pointer always points
backwards, and the count read at the start always gives a list that fits inside the record, where a
wrong start overruns.

`kind` is 0 in 2326 entries and 1 in 70, all of the latter on arch 8 and arch 12. The firmware
tests its bit 0 and branches, so it is a flag; **what it selects is unconfirmed.**

The entry is `6 + 3 * pages` bytes. The offset and the stride are the two literals the consumer at
`0x16816` feeds to its `3 * index + literal` helper, so neither is inferred from the bytes.

An entry maps a **tag** to one action list instruction. Two tags are the handlers: **tag 7 when the
mode is left and tag 6 when it is entered**, the only two either arch 14 image selects, and on both
Harmony Ones every mode carries exactly one of each. The rest are key codes.

**Those key codes are device mode's keypad map.** [findings.md](../../docs/findings.md) section 271. A key press
is resolved against the current page's list, then the current mode record's **own** list, then the
base slot 9 stack, and the second of those is where a device's own commands live: pick a device on the
remote and the whole keypad points at it. For every infrared group in the corpus, the mode whose two
maps are largest for that group is unique, exists, and sends **only** that device:

| | count |
|---|---|
| device groups with at least one infrared code | 62 |
| such a mode exists, uniquely | 62 |
| it addresses exactly one device, on keypad and pages alike | 62 |
| keypad bindings across the 62 | 1609 |
| screen bindings across the 62 | 1818 |

The two halves are comparable in size and **which is larger varies**: the screen half is larger in 8 of
the fifteen configurations and the keypad half in 7, so the corpus total is not a statement that device
mode is mostly screen. They are disjoint populations: no scan code appears in both halves in any of the
fifteen. On arch 12 (Harmony One) the drawn device list's own
row enters exactly this mode, 8 of 8, which is the closure, since that route reads the screen and
never an infrared group.

Read with `deviceModeMaps` in `packages/codec/src/inventory.ts`.

**On arch 14 the same closure holds for 21 of the 23 rows it can compare**, section 285, over the four
arch 14 user configurations and `calibration_h600`. The two that do not are the Harmony 700's A/V switch on
both 700s, and there `deviceModeMaps` is wrong, not the list: that device's mode binds no key, and the
reader considers only modes with a keypad binding and counts a mode's enter handler, tag 6, as one, so it
picks a help screen. The 62 of 62 above includes those two. *Unconfirmed until the reader is fixed.*
#### The key table is the first mode record

**The container's key table is the first mode record**, byte for byte: same offset, same count,
same four byte entries. The tagged list encoding and the key table encoding are one encoding.

So its length is the record's, and a record has two forms: **an empty one is the wide form**, a zero
lead byte and a zero count, two bytes where `1 + 4 * count` says one. That is the whole of it on the
arch 14 safe mode containers. On arch 9 there is no key table at the marker at all and the record
there is an ordinary mode record, 189 bytes in `h525_safemode_ahcm`. `docs/findings.md` section 84.

**A screen program follows the list**, at the record's start plus the list's length, and every
record has one on **every** architecture: 374 of 374, 237 of 237, 268 of 268, 103 of 103, 114 of
114 and 35 of 35 in a safe mode container. That program is where the region's large pictures are
addressed from. [findings.md](../../docs/findings.md) sections 53 and 64.

Twice this looked like an architecture that did not carry them, and twice the cause was one
missing operand count rather than a different layout: arch 12 in section 54 and arch 9 in section
64. Neither program was malformed; both were simply unwalkable.

#### A mode's pages

**Confirmed on seventeen containers across four architectures.** Each `page[]` address is a record
of two pointers, and on arch 12 only, one byte in front of them:

```
arch 8, 9, 14   u24 list; u24 program                 6 bytes
arch 12         u8 lead; u24 list; u24 program        7 bytes
```

`list` is a tagged list in the encoding below and `program` is a screen program. The firmware
searches the page's list for a tag first and the mode record's own list second, so a page
**overrides** rather than replaces. Both offsets are read off the code rather than inferred: one
routine runs the list at `page + 0` and then the one at `entry + 1`, section 69. **Every page's
list also has a second copy**, in the pool base slot 9's sets sit in, which nothing reads. Two tags are searched this way, `0x29` and `0x2A`, either side
of the code that moves a wrapping page cursor; **what they name is unconfirmed.** The lead byte
was in that sentence too until section 125 read it: it is the zero based index into base slot 17's
hit map, stating which rectangle page a touch on this mode page consults, see the base slot 17
section below. (This spec said "unknown" for ten days after its own base slot 17 section stated the
answer, which an audit found rather than a test: the two passages share no number a check could
compare.)

Closures: 2906 of 2906 page pointers resolve; the page abutting an entry sits exactly six bytes
before it on arch 8, 9 and 14 and exactly seven on arch 12, in 2396 of 2396 entries, which is where
the length comes from since nothing states it; every `list` decodes as a tagged list and lands in
the run above base slot 7's table, which it fills to within 4 to 34 bytes; every `program` decodes
as a screen program.

**Prefer `program` over the computed root above.** On arch 8, 9 and 14 the first page's program is
usually the same address; on arch 12 it never is, because the stated program begins with a call
(opcode 22) to the fragment sitting where the computation lands. [findings.md](../../docs/findings.md)
section 66.

Read with `gspm.mode_records`, `gspm.mode_pages` and `gspm.mode_program_roots`; `gspm.mode_table`
returns the raw pointers. [findings.md](../../docs/findings.md) sections 52 and 66.

*It is not the activity list*: a Harmony has a handful of activities and this table has hundreds of
entries. What distinguishes one entry from another is not established.
[findings.md](../../docs/findings.md) section 37.

### Tagged lists

Base slots 6 and 9 both point at lists in this encoding, and one firmware routine reads both. Which
of the two forms applies is decided by the first byte, exactly as the firmware decides it:

```
+0x00  u8   count                                     when nonzero
+0x01  { u8 tag; u16 operand; u8 opcode }[count]
```

```
+0x00  u8   0
+0x01  u8   count
+0x02  { u8 flags; u8 tag; u16 operand; u8 opcode }[count]
```

The firmware stops at the **first** entry whose tag matches and runs nothing else, so a duplicate
tag is unreachable through anything but its first copy. A writer that emits two entries with one tag
has emitted dead data, silently. Bit 0 of `flags` in the second form is tested after the match and
what it selects is *not established*.

Read with `gspm.tagged_list`. [findings.md](../../docs/findings.md) section 39.
### Base slot 9: the binding table

**Confirmed on 15<!--fact:user_configs--> user configs across four architectures.**

```
+0x00  u8   count
+0x01  u24  address[count]
```

Six to seventeen entries, each pointing at a tagged list. **The largest index any config uses is
exactly the count minus one, in all fifteen**, over counts from 6 to 17.

**The pointer is the list**, unlike base slot 6's, which lands inside a record. Read a slot 9
target as slot 6's shape, a `u8` and a `u24` back pointer, and not one of the 54 sets in the corpus
gives an address below itself where all 1616 of slot 6's do. So the extent is the list's own
declared length. [findings.md](../../docs/findings.md) section 67.

**A key is resolved against a stack of these lists, top down, first match winning**, and the index
into this array is the low byte of action list opcode `0x1F` with high byte `0xFE` to push and
`0xFD` to remove. So an entry's enter and leave handlers, recorded structurally by section 67, are
the push and the pop. **The ordering is the mechanism**: it is what lets one list override another
instead of merely coexisting with it, which is why this table used to say "sets" and that was wrong
rather than merely loose. The firmware reading is trelowney's, reported 26 August 2026;
[findings.md](../../docs/findings.md) section 176 records what the corpus confirms and what it cannot, since a
count cannot distinguish a push from an unordered insert.

**Three pushed values are indirections, not entries**, read on the Harmony 700's 2.8 and the Harmony
600's and 650's 0.2 images, arch 14, [findings.md](../../docs/findings.md) section 333:

| stack byte | resolves through |
|---|---|
| `0xFD` | the current mode: its page's list, then the mode's own list |
| `0xFE` | the running activity's entry, the one `0x1F` band `0xFF` selects (`0x120` on the 700, `0x217` on the 600 and 650) |
| `0xFC` | the entry `0x1F` band `0xE8` names (`0x121`, `0x218`) |
| anything else | that base slot 9 index itself |

One variable holds the running entry, so an activity replaces the idle entry rather than stacking on
it. On all thirteen arch 14 Logitech compiles one boot list pushes `01, FE, FD, FC, 02` in that order
and band `0xE8` names 0, 3 or 4, so a key is looked up in entry 2, the `0xE8` entry, the current mode,
the running entry, then entry 1.

**Help is scan 3, and among the key maps only the running entry binds it**, same section: the release
and the repeat on 40 of 40 activity entries and 13 of 13 idle entries and on no other entry, and
scan 3 in no device mode, 0 of 83. Entries 2 and 3 bind the press of all 54 scans to shared lists, so
Help's press there is any key's press. Modes bind it too, 467 of them, all the remote's own help,
delay and status screens and none a device mode, start up screen or working screen. So an entry with
no scan 3 binding makes Help do nothing on its own screens and in device mode entered from it, which
is the form a composed activity takes.

The sets sit in a pool of tagged lists packed end to end, which also holds one list per mode page.
The pool is bounded at both ends without searching: it begins on the byte after a mode entry's page
array and ends at the lowest address above that which another reader already names, and a run must
hold at least one set on a list boundary. 29 runs in seventeen containers, tiling exactly.

The lists that are not sets are **a second copy of every mode page's own list**, in mode table
order: the k-th copy belongs to the k-th page, 2906 of 2906 in all seventeen containers with
nothing left over on either side. Every empty copy is in the wide form and every wide form one is
empty.

The copy is identical in **meaning** and not in bytes. Form, entry count, tag, flags, opcode and
operand all agree per entry, with one exception: opcode `0x7F`'s operand is an index into base slot
10, and the two copies name different table entries whose **action lists decode identically**, 5861
of 5861 pairs. Comparing the two runs byte for byte therefore says they differ, which is what
section 67 did before section 69 corrected it.

**Nothing reads a copy.** The tagged list runner has five references on each of the two
architectures with a firmware, and every one takes its pointer from a page record or from a mode
entry; and reading every byte position in a container as a `u24` finds 27 that name a copy across
seventeen containers, against 148.8 that chance predicts. An emitter still has to reproduce them
byte for byte, and their position is implied by everything packed before them, as pictures are.
*Why the generator emits them is not established*, and no config can answer it.
[findings.md](../../docs/findings.md) sections 67, 68 and 69.

**A set is one activity's keypad map.** [findings.md](../../docs/findings.md) section 151. Over the fifteen user
configs: 158 sets, 65 installed by something in the config, 50 of those by an activity, and **exactly
those 50 send an infrared code**. No set an activity does not install sends one, so base slot 9 belongs
to the activities and holds no spares. The other 108 send nothing, and 38 of them bind fifty or more keys
to lists of comparisons, register work and mode entries, which is a menu.

**Device mode's map is not here**, and this section said the opposite until 6 September 2026: it read
"no config here holds a keypad map for device mode, which the product certainly has"<!--superseded-->,
which followed from the count above and from taking base slot 9 for the whole of the keypad. A device's
own map is a **base slot 6 mode record's own tagged list**, the one below.
[findings.md](../../docs/findings.md) section 271.

For every pair of a device and a scan code, the command that pair sends is the **same in every activity
map that binds it**, 1096 of 1105, and 47 of 50 devices agree on every one of their buttons. The nine
exceptions are per activity overrides, an amplifier's input selection being the clearest. So:

* a device's button map is the **agreement** across the activity maps, never their union
* 970 of the 1096 are bound in every activity that drives that device and 126 in only some, which is
  authoring rather than structure
* **a writer that changes a device's button has to write every activity map that inherited it**, or the
  change is invisible in the activity a person is sitting in

**Reconstructing a device's map from that agreement is not sound and is not needed**, since section 271
reads the stated one. Scored against it: of 1123 pairs of a device and a key that some activity binds, the
device's own map holds the same command on 896 and a different one on 136 where every activity agrees, and
it binds a further 568 keys no activity binds at all. So the reconstruction is wrong on 13% of what it can
see and blind to a third again as much.
[how-a-harmony-works.md](../how-a-harmony-works.md) is the product side of this.

The index is carried by opcode `0x1F` with the operand's high byte `0xFF` and the index in the low
byte. When it changes, the firmware runs the outgoing entry's list with **tag 2** and the incoming
one's with **tag 1**, the same leave and enter arrangement base slot 6 has with tags 7 and 6.

An entry's other tags are **key event codes**, by the same `EVENT_MASK` and `SCAN_MASK` split base
slot 8 uses: `0x81` is a press of scan code 1. So an entry is a set of button bindings with a
lifecycle.

The two Harmony 700 configs differ in exactly one place in this section, one added binding with a
press tag in one entry, and their owner's notes record exactly one added standard button assignment
in one activity.

**An entry is one of three things, and a device is never one of them.** [findings.md](../../docs/findings.md)
section 272. Split the table by which entries the configuration's own `0x1F` ever selects:

| population | what it is | how many |
|---|---|---|
| never selected | a contiguous prefix, per model | 7 on arch 8 and 12, 5 on arch 14, 4 on arch 9 |
| an activity's key map | one per activity, what `activities` reports as its `set` | one per activity |
| the one left over | selected, and carries a tag 1 enter handler | exactly one |

15 of 15 user configs on all four architectures, and the prefix length moves with neither the device
count nor the activity count. **What the left over entry is for is not established**: it is installed
from the boot chain on the factory Harmony One and binds the Devices key there, which is consistent
with its being the idle map, and its bindings send infrared codes in 6 of the 15 and not in the other
9, which one reading would have to explain.

*This section said "devices and activities together is the reading the counts support"*<!--superseded-->
until 6 September 2026. It fits 2 of the 15 containers, both of them the Harmony 700 pair it was
fitted to, where six devices plus five activities and a prefix of five plus five activities plus one
are the same eleven.

Read with `handlerSetRoles` in `packages/codec/src/inventory.ts`.
### Base slot 17: the touch screen hit map

**Confirmed on the two Harmony One configs and the Harmony One 3.4 image.** Empty, with a count of
zero, in the other eleven containers in the corpus: arch 8, arch 9, arch 14 and all three safe mode
ones. The Harmony One is the only remote here with a touch panel.

Where it is empty the section is **two** zero bytes rather than one, because the pointer lands two
bytes in front of the picture bank that follows it, which is the same bias the bank walk starts
from. Both bytes are zero in all thirteen containers that do this, which is every container that is not
arch 12 (Harmony One), since there the slot holds the touch hit map instead.
`docs/findings.md` section 84.

```
+0x00  u8   pages
+0x01  u24  page[pages]
```

each page

```
+0x00  u8   areas
+0x01  u24  area[areas]
```

each area, twelve bytes

```
+0x00  u16  x
+0x02  u16  width
+0x04  u16  y
+0x06  u16  height
+0x08  u8   the key code a hit reports
+0x09  u24  the record's own address
```

The firmware walks a page in order and **returns the first rectangle containing the point**, with
the test half open on both axes, `x <= X < x + width`. Rectangles on a page do overlap, 104 pairs
across the corpus, so a writer must treat a page's order as meaningful. The panel reports thirteen
bit coordinates and the largest rectangle reaches 4437.

A page's areas are laid out contiguously immediately before the page's own header, and each area's
last three bytes are its own address; both hold for every page and every area in both configs.

**A short device list page is the full page's rectangles**, section 241: for `r` rows it carries the
full page's first `r` row rectangles under scans 48 upward, the full page's bottom key rectangle under
scan `48 + r`, then the two edges. Stated by the one row and two row pages beside a full page on two
configurations, and it is how `composeMenuPage` derives a hit page the configuration lacks.

The code at `+0x08` takes ten values, 43, 44, 46, 47 and 48 to 53, which sit inside the block of
scan codes the One's key table carries where arch 14 numbers 41 to 54. A page's codes run 48
upward consecutively, then 43 and 44 for the two largest pages, and always end with 46 and 47,
which are a tall strip at each edge of the panel. Nine page shapes exist and no others.

**A code is a position, not a name**, section 275: the first area a page stores is scan 48, the second
49 and so on, with 46 and 47 carried by the two edges wherever they sit. So which scan is which row
differs from page to page, and it does: on the everyday Harmony One's activity menu the three rows are
scans 50, 51 and 52 on the first page and 48, 49 and 50 on the second. Two consequences for a writer.
A row is recognised by **geometry** and never by its code. And an area appended anywhere but after the
last content one renumbers every area after it, which silently moves a binding the page already had.

**The two rectangles at the panel's edges are the page turn buttons, and no page binds them**,
section 275. All 778 mode pages of four arch 12 (Harmony One) containers offer both, and 0 of them
carry a binding on scan 46 or 47. Those two rectangles sit outside the drawn area, `x` 765 and 3556
against a display spanning 1257 to 3556, which is the geometry saying the buttons are beside the
screen rather than on it.

**They are bound in two other places**, and **`keyCodes` is the wrong reader to ask** about either:
it reports only bindings that end in an infrared code and answers 0 for these scans.

* **Base slot 9 entries 1, 2, 3 and 4**, a press of each scan in each, so 8 bindings per container
  on all four. Those are the fixed prefix nothing selects, section 272. Entry 1 is the only one
  giving the two scans different lists, `0x0f` with `0xFFA0` against `0xFFA1`, undecoded.
* **A mode record's own tagged list, exactly when the mode has one page.** Both keys on 538 of 538
  single page modes and neither on 0 of 58 multi page ones, 1076 bindings, every one a press, and
  966 of them the **null instruction** of opcode 0 with operand 0, which said 962 until section 293
  recounted it.

So paging is a default the firmware supplies and a screen with nowhere to page turns it **off**. A
writer that adds a second page to a one page menu must remove those two null bindings, or the new
page is unreachable while every count closes and both checksums pass. All 12 one page list menus here
carry them.

**A mode of several pages states its page count in two more places**, section 293, arch 12 only, over
the six Harmony One containers:

```
header (the program every page calls first, one per mode, 656 of 656 distinct)
  op 4 or 5 at (0x17, 0x12)   the total, equal to the page count, 58 of 58; absent on a one page mode
  op 4 or 5 at (0x23, 0x12)   the word, "pages" on all six
  op 0x17; op 0               a one page mode's header ends here, 598 of 598
each page, in its own program or where its switch arms rejoin, after a second switch on 7 of 73
  op 4 or 5 at (18 - w, 18)   its number, right aligned: w is the text's width in its font, so a "4"
                              starts at 12 and a "10" at 8; every page of all 58
  op 4 or 5 at (18, 18)       "/"
```

A one page mode draws neither the total nor a number. **531 of the 598 bind both page turn keys to the
null instruction**, 1086 of 1196 bindings; the other 67 name a list on one key or both, 15 of them only
lists of three null instructions, so a writer that cuts only the null instruction is conservative. The total, the numbers and the bindings are independent, so a page added without restating the
header leaves the old total drawn, which is what the spare Harmony One's nine device lists carry.

**The rectangles at `y` 271 are the two physical buttons below the display**, and which of them a
page enables is the difference between the two list menus, measured over the same containers:

| | a device list page | an activity menu page |
|---|---|---|
| rows | 3 | up to 3 |
| left button, `x` 1257 width 1395 | 1, on **29 of 29** pages | 1, on **6 of 6** |
| right button, `x` 2406 width 1150 | **none, on 29 of 29** | 1, on 6 of 6 |
| what those bind | opcode `0x72`, all 29 | enter a mode, all 12 |
| beside the display | 2, unbound | 2, unbound |

A button with **no rectangle** is how the format says it is not enabled, which is what the right one
is in device mode. The left one is labelled "Activities" there and "Options" in an activity, with
"Devices" on the right, and its `0x72` maps a state variable's value rather than turning a page:
variable 35 on the everyday Harmony One and 40 on the factory one, so where it goes depends on what
is running.

An activity menu's rows are 2600 panel units wide and 807 tall, start at the panel's left edge of
1257, and step down by one `LIST_ROW_PITCH` of 872, on 11 of 11 rows.

**The geometry is not user data.** Two Harmony Ones with entirely different configurations carry
the same 35 rectangle sizes and share 70 of 70 distinct records; only the number of pages differs.

**Which page belongs to which screen is stated by the mode page**, in the arch 12 only `lead` byte in
front of a mode page record's two pointers. It is a zero based index into `page[]` above:

| | `one_config` | `one_config_unprogrammed` |
|---|---|---|
| mode pages | 330 | 152 |
| hit map pages | 42 | 32 |
| distinct `lead` values | 42 | 32 |

Every value in range with no gaps, every hit page named by at least one mode page, and **no mode page
binds a key code its indexed hit page does not offer**, on 268 and 104 pages. Shifting the index breaks
54 to 227 of them. `docs/findings.md` section 125.

**The panel to pixel transform**, needed because a rectangle is in panel coordinates and a drawn label
is at a pixel:

```
panel_y = 4356 - (872 / 54) * pixel_y
panel_x = 1257 + ((3556 - 1257) / 176) * pixel_x
```

The y half is **measured**: 872 panel units is one list row and 54 pixels is one text row, so the scale
is their ratio exactly and only the offset is fitted, at 233 of 235 paired rows within five pixels. The
x half is **unconfirmed**, in that word: it takes the display to span the gap between the inner edges of
the two edge strips, codes 46 and 47, and containment barely constrains it because almost every
rectangle is full width. No activity name depends on it.

Under that transform the rectangles are a grid, and it is the hardware the owner of the remote
describes: blocks at pixel rows 33 to 83, 87 to 137 and 141 to 191, **one block or two side by side and
never three**, plus a bar from 191 to 253 which runs past the bottom of a 220 pixel display. So codes 48
to 53 are the up to six blocks on the screen, 43 and 44 the two touch points below it, and 46 and 47 the
two keys at its sides. **Which code lands where is per page**, in the order the container stores the
rectangles: one activity page has the bar on 48 and 49 with the blocks on 50 to 52, and the next has the
blocks on 48 to 50 with the bar on 51 and 52.

Read with `gspm.touch_pages` and `gspm.Container.touch_hit`, or in TypeScript with `touchPages`,
`touchPageOf` and `touchOwner`. [findings.md](../../docs/findings.md) sections 45 and 125.

**The hit pages the fixed screens name, built**, section 417: `families/touch/hitpages.ts`. The 103 pages of the
firmware, status, fixed, tour and Remote Assistant screens name 23 hit pages on each of the sixteen English compiles
of skin 54, each screen page the same one on all sixteen; section 405's 25 hit pages in every compile are those 23
and two named by setup screens alone, a device page's six commands with both page keys and the generic help screen's, mode 69 on `harvest_one_two_devices`, which the device pages (section 420) and the help screens (section 429) build.
Rebuilt byte for byte with the table on the sixteen; 1898 bytes of pages and the
table's `1 + 3 * pages`, 1986 on `harvest_one_two_devices`.

| what | rule, measured on all nineteen Harmony One compiles |
|---|---|
| an area's code | its place among the page's areas before the edges: 48 to 53, then 43, 44; 2524 of 2524 areas |
| the edges | last on every page, 765 and 3556, width 492, y 1400, height 2000, codes 46 and 47; 662 of 662 pages |
| a button's rectangle | held in the module as the picture's place, measured against every page: a 50 row picture on rows 38, 92 or 146: 81 wide at x 6, 48 or 89 gives x 1257, 1772 or 2422 and width 1284, 1284 or 1134; 164 wide at x 6 gives 1257 and 2600; y 3016, 2144 or 1272, height 807, section 125's formula rounded with the rows exactly 872 apart; 8430 of 8430 such buttons, as distinct rectangles per page. The x columns are a table, not a map from pixels |
| the left key, 1257, 1395, 271, 1001 | on a page only where it draws a word on the left half at y 190 or below, 3064 of 3064; 3064 of the 3128 pages drawing one, the other 64 activity start up screens drawing no key word, their body line "your system." starting left of centre at y 191 |
| the right key, 2406, 1150, 271, 1001 | where and only where a page draws a word on the right half at y 190 or below, 2871 of 2871 both ways |
| stated | 34 of the 23 pages' 79 rectangles: the tour's 30, and the body rectangles of the message and OK page, the message page, the confirmation and the Remote Assistant's question |
| a page's bytes | its areas, twelve bytes each ending in its own address, then its header, a count and the areas' addresses; no area shared between pages; 662 of 662 |
| the table | a count and each page's header address in index order |
| the index of a page | the description's, read from the lead of one screen page that names it, 23 bytes; Logitech numbers by first use, a page's index the number of distinct pages named before it walking modes and pages in order, 19 of 19, so the head's first three modes name 0, 1 and 2 |
| where the pages sit | the configuration's places, two runs on Logitech's compiles, pages 0 to 2 after base slot 13's records and the rest after base slot 14's or 16's |

**Unconfirmed**: whether the firmware takes the hit map from the status container while it draws that container's
screens, which would make indices 0 to 2 a demand rather than Logitech's numbering.
### Base slot 8: key press bindings

*This was an unconfirmed candidate, described as "per assignment records, possibly bytecode" on the
strength of being the only section whose size changed in the controlled pair. It is read now.*

```
+0x00  u8 count; { u16 operand; u8 opcode }[count]      one ordinary action list
       then repeated to the end of the section:
         u8 count; { u8 tag; u16 operand; u8 opcode }[count]
         0x00 bytes between records are skipped
```

An entry is an action list instruction with a tag byte in front. The walk consumes the section
exactly, on seven configs across architectures 8, 9, 12 and 14, and a walk that starts one byte out
desynchronises immediately, which is what makes consuming it the validation.

**The repeated records are the mode page lists**, section 83. Every mode page's list is inside this
section in all nineteen containers, and the leading action list plus those lists tile the section
exactly, so the walk above and the tagged list reading of base slot 6 are two names for one
structure: a record is a narrow tagged list, and the `0x00` it skips is the wide form's lead byte.
The leading list is the section's own and is `1 + 3 * count` bytes, 4 on arch 8 and arch 12 and 34
on arch 9 and arch 14.
On arch 14 it is the eleven start up entry points the firmware queues by index, generated by
`buildWiring`, "The firmware's own wiring on arch 14" above, [findings.md](../../docs/findings.md) section 347.

**The tag is a key press.** Under the same `EVENT_MASK` and `SCAN_MASK` split as the key table,
every tag in every sample is a press, `0x80`, and the scan codes are model specific: 2, 8, 9 and 34
on architecture 14; 43, 44 and 48 to 53 on architecture 12; 30, 31, 38 and 39 on architecture 9;
5 to 8, 44 to 46 and 48 on architecture 8.

**Those are the keys the screen labels, and the two populations are disjoint**, section 128. A scan
bound here is a key the screen speaks for; a scan bound by a base slot 9 handler set is a key on the
keypad, and across the corpus the two share no code at all on architectures 9, 12 and 14 and exactly
one on architecture 8. One arch 9 config binds a fifth screen key, scan 22, on a page that labels
nothing.

**A screen key's label is the text drawn in its place**, section 128, and the place comes from two
sources. On architecture 12 base slot 17 states it: the key's rectangle, with the label attributed to
the **nearest** region rather than the first one containing its start point, and several strings in one
region joined in reading order. Elsewhere the keys sit in two columns beside the screen and the rows
are measured, from where activities whose names section 121 derives without geometry are drawn:

| architecture | rows, at pixel row | keys, left then right | line pitch |
|---|---|---|---|
| 8 | 42, 74, 106, 138 | 5/45, 6/46, 7/48, 8/44 | 14 |
| 9 | 13, 35 | 39/38, 31/30 | 11 |
| 14 | 35, 79 | 2/8, 9/34 | 14 |

A row's band is about a line and a half deep, since an item may wrap; a continuation line is at most
16 pixels below the line it continues, which is what keeps a menu footer out of a label. A row holds
one item across, belonging to both its keys, or one per column, split at the widest gap between
adjacent x positions when that gap is at least 24 pixels. 2001 labels come from the hit map and 4914
from this table, 98.9% of every screen key binding in the corpus, and they agree with the activity
chain on 62 of the 63 keys where both have an opinion.

**The controlled pair closes it.** The owner's account of the one change includes two new additional
buttons. Slot 8 grew by 8 bytes, an entry is 4, the record count is unchanged, and exactly one
record went from two entries to four. [findings.md](../../docs/findings.md) section 27.

Slot 8's `0x7F` instructions also call **every** action list in the final packed run, exactly once
each, which is the only thing that reaches those lists.

Still established negatively, and still worth stating: **the key table is not the button to action
map.** It is byte identical across that pair while the described change reassigned buttons. Slot 8
is where a press meets an action list; the key table is something else.
## The key table: `LWJL`, `WLWL`

```
u8   event_code    event type in the top two bits, scan code in the rest
u16  operand       the operand of one action list instruction
u8   opcode        that instruction's opcode
```

**It is mode 0's own tagged list**, section 52, and each entry is a key event with one action list
instruction, run when mode 0 is on screen and the event matches. `docs/findings.md` section 311, read
in the Harmony 600's 0.2 firmware. Mode 0 is the "Use the Harmony setup software to add an Activity on
this button" screen on a Harmony 600 and 650, which an empty activity key opens by pushing the mode and
entering mode 0; a page with no text on a Harmony 700, whose placeholder is mode 4; and "The battery
level is low!" on a Harmony One. An entry of `00 00 00` is a deliberate swallow: the key matches, the
all zero instruction is dropped, and nothing below it sees the key.

**A writer emits it as a constant per model**, and these are the constants. On arch 14 the writer
generates it rather than copying it, `modeZeroKeyList` in `packages/codec/src/families/four-slot/modezero.ts`, ordered by
the hash rule under "The order is a hash table's bucket order" below:

| model | entries | content | containers carrying exactly these bytes |
|---|---|---|---|
| Harmony 600 and 650 | 162 | every scan 1 to 54 as release, press and repeat, each `00 00 00`, except the press of scan 25, `FC FF 07`: instruction `0x07` with `0xFFFC`, pop the mode stack | 19 |
| Harmony 700 | 163 | an enter handler, tag `0x06`, setting one state variable to 1 (opcode `0x80` plus its number: the low battery flag, the variable the Low Battery screen's Exit clears, which every battery screen sets on entry, section 357; 40, 43 or 44 so far), then the 600's 162 key events in the same order, all `00 00 00`, scan 25 included | 10, in 3 variants by that one byte |
| Harmony One | 55 | each `0x7F`, calling the action list numbered by its own position, 0 to 54 | 34, every user configuration |

Elsewhere it is not one constant: arch 8, 10 and 16 samples agree in some pairs and differ in others,
section 311 lists which.

An **event code is not a matrix address.** The top two bits are the event type and the rest is
the keypad scanner's own scan code:

| Bits 7,6 | Event |
|---|---|
| `00` | none, the handful of codes that are not keypad events at all |
| `01` | release |
| `10` | press |
| `11` | repeat |

Corrected: this document previously stated `0x80 | (row << 3) | col` with bit 7 marking a matrix
key, which made the arch 14 table describe a keypad that cannot exist. See
[findings.md](../../docs/findings.md) section 17 for the three agreements that settle it.

| Sample | count | Shape |
|---|---|---|
| 700 user config, arch 14 | 163 | scan codes 1 to 54 in each of release, press and repeat, plus `0x06` with no event bits. The opcode is `0x00` or `0xA8`. |
| 600 user config, arch 14 | 162 | exactly 54 scan codes times 3 event types, nothing else. The opcode is `0x00` or `0x07`. |
| One user config, arch 12 | 55 | 52 press codes plus `0x06`, `0x07`, `0x2D` with no event bits. No release or repeat entries at all. The opcode is `0x7F` throughout. |
| 88x class config, arch 8 | 56 | 53 press codes plus the same three, in the same order on `arch8_config_a` to `_d` and `arch8_config_880`, with operands differing in 2 of 56; `arch8_config_885` has 58 entries, section 311. |
| One safe-mode config | 2 | press of scan 47 and scan 46. A two button recovery UI. |
| 700 `Region_3` | 0 | empty |
| 525 config, arch 9 | n/a | the byte where a count would sit after `CMAH` is zero, so no table is claimed there. Arch 9 binds its keys in the mode records instead, see below |

So arch 14 enumerates all three event types for every key while arch 12 and arch 8 record presses
only. That is a real difference between the architectures rather than an artefact of the reading.

### A scan code's arithmetic is per architecture

The scanner that produces the code is not one routine across the family, so the same number means a
different position on each. Confirmed on arch 8 and arch 9 from the firmware and on arch 14 from a
live census; arch 12 is stated as the shape its sense wiring implies and is **unconfirmed**, since
no measurement there can produce a code.

| Arch | Lattice | Scan code | Range | Source |
|---|---|---|---|---|
| 8 (880, 885) | 4 by 16 | `(line - 1) * 4 + input`, `input` 1 to 4 | 1 to 64, nothing binds 64 | firmware, all four images, [findings.md](../../docs/findings.md) section 144 |
| 9 (525) | 8 by 8 | `group * 8 + column`, both 1 to 8 | 1 to 64, nothing binds a multiple of 8 | firmware, section 89 |
| 14 (600, 700) | 4 by 14 | column is `(code - 1) mod 4` | 1 to 54 bound of 56 | 54 buttons pressed on the bench, section 48 |
| 12 (One) | not established | not established | 1 to 55 bound | sixteen buttons share one sense line, so no census yields a code. Section 48 |

The **position** of a key is a separate question and is not established anywhere: an encoding says
which cell a code is, not which printed button sits in that cell. Section 133 measured that it does
not follow from the codes either, since no divisor puts a Harmony 600's digit row on one line.
Recovering it needs the board, which is how the arch 8 lattice above was corroborated.
