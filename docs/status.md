# Where the work stands

The current state of the reverse engineering: what reads, what is measured, what the corpus holds.
A snapshot, dated by its commit, and it is the document [README.md](../README.md) points a reader at
who wants more than the front page.

**This is not the plan.** [roadmap.md](roadmap.md) is the plan of record: the decisions, the
milestones and the sequence, and what gets answered next and why that one. The line between them is
worth stating because this project has already been bitten by the other arrangement, on 8 August 2026,
when an audit found eleven places where the documents contradicted the code and every one of them was
in a summary rather than in [findings.md](findings.md). So: the roadmap says what is intended, this
page says what is true today, and neither restates the other. Where a number appears here it carries a
`fact:` marker and `make facts` recomputes it from the corpus, which is what stops this page becoming
the twelfth.

For the argument behind any claim here, [findings.md](findings.md) is authoritative and numbered by
section. For the format as a specification, [config-format.md](config-format.md).

## Status

The work targets three architectures, and there are four remotes on the bench, two of them
Harmony Ones:

* **arch 12** ("Gin"), Harmony One, plus the spare Harmony One that is the only unit anything may
  ever be written to
* **arch 14**, Harmony 600 and Harmony 700
* **arch 9**, Harmony 525, connected on 8 August 2026 and a target since: its config and its
  firmware are in the lab, and its class 5 infrared, which was the last big gap in the byte
  accounting, is read. It has no write target and will not get one.

Established: the MCU family, firmware load addresses, flash layouts, the firmware image
header and its checksum, the config container, the keypad scanner, and the complete
infrared path from config pointer to LED including the SPI storage layer.

The container is now validated across **four** architectures, because publicly shared sample
sets (arch 8, arch 9 and a Harmony 700 pair) were added as controls. Seventeen samples in the
framing tables, five base addresses, three format versions, three pointer table lengths, all
consistency checks passing; the wider population of everything in the lab that parses is
41<!--fact:parseable_containers--> containers over five architectures, since arch 10's framing
verifies too. It
turns out to be one format with a per architecture cookie rather than one format per
architecture, and the **pointer table is one table too**, with a couple of per architecture
insertions, so a section labelled on one architecture transfers to the others by index.

The **trailer checksum is derived**: a sixteen bit XOR of the container's little endian words
seeded `0x4321`, recomputing on every container in the corpus. That was the last thing standing between
a generated config and a remote that would accept it.

**Every one of the twenty base slots is accounted for**, and every slot from 2 to 19 has a located
firmware consumer: two header records, sixteen named sections, and two that are NULL in every
sample. Among the recent ones is **the timer table**, which is where a backlight timeout and a two hour
power off live: a record says how long to wait and which single instruction to run afterwards, and
the set of records a config's action lists start is exactly the set it declares. Next to it is
**the parameter block**, whose every group has a length the firmware demands and silently ignores
the group if it differs: fourteen such lengths read off two images, holding in every container of
the two architectures those images belong to, and asserted on no other. Then **the touch screen hit map**, which only the Harmony One
carries, because it is the only remote here with a touch panel: per screen page a list of
rectangles, each reporting a key code, and the firmware answers a touch with the first rectangle
the point falls in. The last to fall is **the log area**, which is not a pointer to anything: three
numbers reserving a region of flash above the config that the firmware appends to and never erases,
its write position recovered at boot by scanning for the last byte that is not `0xFF`. A config
**states its own architecture** in section slot 1, which is what lets a config read over USB be
parsed without the file header Logitech's software supplied. Slot 0 is the container's only
`0xFEED`/`0xBEEF` frame, and slot 3 is a second framed record holding **the date and time the
config was built**, decoded by a search that only one field assignment survives and confirmed by a
weekday byte that is days since 1 January 2000 modulo 7. Six more are count prefixed arrays of three byte flash pointers, proved
to be pointers by a controlled pair of configs from one remote in which every entry moved by
exactly the layout shift. One of those six is the **action list table**: on the Harmony 700 it
addresses 8037 lists holding 19651 instructions, and all but four consecutive entries sit exactly
`1 + 3 * count` apart, which is the pointer table and the lists' own count fields agreeing.

The key table is decoded: an event code is an **event type plus the keypad scanner's scan code**,
not the matrix address it was read as here for a while. That correction turned the Harmony 600's
table from something that provably could not describe its own keypad into 54 keys times three
event types, exactly.

**That has now been checked against the remote**, by pressing all 54 of its buttons while the host
watched the keypad port over USB. A remote on USB never runs its **keypad handler**, so the scan code
is never computed and only the matrix **column** is observable, a quarter of the mapping. (It does run
the rest of its application, section 111. The broader claim stood here for three days.) That quarter
closes: the measured census is 14, 14, 13, 13 buttons per column, a column holds at most 14, and
the unit's own config carries scan codes contiguous 1 to 54, whose two absentees fall in exactly
the two columns that are short. Which button carries which of the 54 codes is named for 36 of them, through the account that
compiled the calibration configs, section 133 and `reference/button-maps.md`; the rest, and every
contributed config, stay open. **The
Harmony One gives nothing at all**: sixteen buttons from every region of it pull one shared sense
line, so arch 12 wakes differently from arch 14 and USB yields no part of its mapping.

Both of the config's languages are read, and with them the text: base slot 7 is the **font table**,
run length encoded glyphs at two bytes a pixel, or **two bits** on the monochrome 5xx panel, and
every one of 67303<!--fact:inline_string_codes--> inline string codes in the corpus resolves to a glyph of the font its own
program selected. `tools/screen_dump.py --strings` draws them, and they come out as readable
labels. **Action lists** are bytecode for an accumulator machine with a forty instruction queue and
a binary search dispatcher, and the queue is in RAM because the language mutates it: a comparison can
carry an **else** arm, and it cancels the arm it does not take by writing a do nothing instruction
over it, section 140. And a **second interpreter draws the screen**: its own one byte opcodes
for text, bitmaps, a switch on a state variable and a jump, with 22846<!--fact:screen_programs--> programs across
19<!--fact:containers--> containers decoding with nothing left over. Its one instruction that
names an address outside its own program draws a **bitmap**, either raw rows or the same encoding a
glyph uses, and the firmware states two rails a writer needs: only the low byte of each size field
is loaded, and the row loop stops drawing above row 128 while still consuming the stream.

**That region is read now, and with it most of a config.** It used to be the largest single
unknown, 62% of a Harmony 600 and 82% of a Harmony One reachable from nothing named. It is one
contiguous array of screen pictures, rows of big endian RGB565 pixels on three architectures and
one bit a pixel on the Harmony 525's monochrome panel, drawn by programs carried
inside mode records that nothing could reach until a missing operand count was found in the
firmware. A mode turned out to have **pages**, each naming its own key map and its own screen, and
following those took the Harmony One from 28 pictures reached to 98, which is every picture in its
bank. The byte accounting is the measure of it: the fraction of a config attributed to a
structure the codec understands, with any two structures claiming the same byte reported as the
defect it is.

| | at the start | now |
|---|---|---|
| Harmony 700 | 11.4% | **100.0%<!--fact:coverage_h700_config-->** |
| Harmony 600 | 9.5% | **100.0%<!--fact:coverage_h600_config-->** |
| Harmony One | 3.2% | **100.0%<!--fact:coverage_one_config-->** |
| 880, arch 8 | 3.6% | **100.0%<!--fact:coverage_arch8_config_a-->** |
| 525, arch 9 | 7.2% | 100.0%<!--fact:coverage_h525_config--> |

Zero overlapping claims anywhere. `make coverage` prints it. **Every user config is accounted for
to the byte**, not to a rounded percentage: a 1.63 MB Harmony One config has nothing unattributed
in it. That is the point at which an emitter can rebuild a config rather than copy a residue, and
`packages/codec/src/emit.ts` does: every owner the accounting claims is rebuilt on all nineteen
containers, and the residue copy writes **nothing at all** on eighteen of them.
Arch 9 joined the rest once its own firmware was read: class 5 infrared is a dictionary encoding,
section 82.

**A config also says what it is for**, which is what an interface has to show before it can let
anybody edit anything: **a device is an infrared group**, and one state variable, named
`CurrentActivityState` in every container that carries names, counts the **activities**. The
calibration is a config Logitech's own service compiled for one device and one activity while we
watched, which reports one and one. The names in that tree are our own equipment, so what
is published here is counts and shapes rather than anybody's inventory. Section 86.

**A config can be changed now, length and all.** Same length edits came first, then a relocation
pass that inserts bytes and restamps every stated address, section 172, and on top of both a
composer: pick an appliance out of Logitech's catalogue and `composeDevice` plus
`composeDeviceScreen` put it on a real Harmony One config, infrared, state variables, key bindings
and its own screens, with the byte accounting, the round trip and the renderer all closing over the
result, section 173. The check that this is not merely self consistent is section 174: Logitech's
own compiler, asked to add the same television, writes infrared blocks **byte identical** to ours
once two of its spelling conventions are adopted, both measured rather than guessed. Nothing has
been written to a remote; the write gate opened on 25 August 2026 and the packet protocol for a
write was derived the same day, section 175, on both bench architectures.

Not established: three of the four infrared encoding classes, which no config in the corpus uses;
which physical button each scan code is beyond the 36 and 32 the calibration account names, and
every button's **position**, which is a wiring decision no read path reaches; and, on the write
path, whether the firmware erases before it programs and whether a host must pace its data
packets, which is what keeps a write refused. See
[docs/findings.md](docs/findings.md) for detail and
[docs/config-format.md](docs/config-format.md) for the spec as it firms up.

## What the corpus holds

9<!--fact:corpus_dumps--> dumps from 5<!--fact:corpus_contributors--> contributors, carrying
26<!--fact:corpus_configs--> configs across 5<!--fact:corpus_architectures--> architectures, plus seven
firmware images and two bootloaders. `make corpus` inventories it and, importantly, reports which
dumps nobody has described: a dump whose contributor has moved on is far harder to label later than one
described on arrival.

| arch | models | dumps | configs | firmware held | what would help most |
|---|---|---|---|---|---|
| 2 | 745 | 0 | 0 | none | anything at all |
| 3 | 748, 768 | 0 | 0 | none | anything at all |
| 7 | 610, 620, 628, 659, 670, 676, 680, 688 | 0 | 0 | none | anything at all: eight models and no sample |
| 8 | 880, 885, 880 Pro, 720, 785 | 3<!--fact:corpus_arch8_dumps--> | 13<!--fact:corpus_arch8_configs--> | 880 and 885, application and bootloader | a 720 or a 785, which no sample here covers |
| 9 | 510, 515, 520, 525, 550, 555 | 1<!--fact:corpus_arch9_dumps--> | 1<!--fact:corpus_arch9_configs--> | 525, application and safe mode | a 55x, and any config off a 51x |
| 10 | 890, 895, 890 Pro | 1<!--fact:corpus_arch10_dumps--> | 7<!--fact:corpus_arch10_configs--> | **none** | **firmware**, which is the single hardest blocker here |
| 12 | One | 2<!--fact:corpus_arch12_dumps--> | 2<!--fact:corpus_arch12_configs--> | One 3.4, plus safe mode and both internal pages | nothing: this one is covered |
| 14 | 600, 650, 665, 700 | 2<!--fact:corpus_arch14_dumps--> | 3<!--fact:corpus_arch14_configs--> | 600, 650 and 700 | a 665 config |
| 15 | 900, 1000, 1000i, 1100, 1100i | 0 | 0 | none | out of reach by construction: a network class device, not HID, so this library cannot address one |

**Arch 10 is the interesting gap and it is not for want of configs.** The corpus holds seven reads of two
Harmony 890s, their container framing verifies, and the twenty three pointer slots are **not** a
relabelling of the twenty: all 1330 placements of three insertions were scored against seventeen readers
and the best reaches 34 of 47 where arch 8, 9 and 14 each score 47 uniquely. So every arch 10 reader is
gated, and guessing a mapping would turn twenty refusals into twenty plausible wrong answers. Firmware is
what settles it, the way arch 9's own firmware settled its infrared classes. Sections 115 and 117.

**Seven reads are not seven configs, and on this architecture that had to be measured**, section 122. One
remote was read twice and gave the same container twice. The other was read **five** times and gave five
files that disagree with each other, not one of which recomputes its own checksum, because **an arch 10
read duplicates whole 54 byte chunks**: 16, 2, 6, 5 and 12 of them, with nothing ever lost. Removing the
duplicates lands every one of the five on the same 396225 bytes, puts the end marker exactly where the
header says, and reproduces the checksum the files declare, which is the closure. Three of those five
arrived after the finding was written and carry 11, 13 and 17 chunks, so the prediction was tested on
files nobody had seen. A contributed 890 config has to be checksum verified before it is believed, and a
failure is a reason to read the remote again rather than to reason about the file.

**Arch 8 is a control rather than a target.** Eleven configs and two application images arrived on 10
August 2026 and what they bought was a counterexample supply: they broke the skin rule, they gave
`GET_VERSION` field 6 its fourth value, and they showed that "whatever parses as a container" is not a
corpus. Reach for them when a claim holds on every architecture, because a claim nothing can contradict
is this project's recorded failure mode.

## Headline findings

**`concordance --dump-firmware` returns no usable firmware on the two architectures here.** This
is why the firmware had not been examined before. On arch 12 it returns a small config blob from
the wrong flash region. On arch 14 it returns real code, silently truncated to 64 KiB when the
image is larger. Both read `flash_base` = 0. It is an architecture table entry rather than the
tool, though, and on **arch 8 and arch 9 the same command returns the whole firmware region**, so
it stays the way to obtain an image for a model nobody here owns. See
[reference/concordance-notes.md](reference/concordance-notes.md).

**It is a Microchip PIC18, and it disassembles cleanly** once you have the right file at the
right load address. 87% of the Harmony 700 image resolves into 521 functions.

| Image | Size | Execution base | Entry point |
|---|---|---|---|
| Harmony One 3.4 | 60050 | `0x020000` | `0x02EA38` |
| Harmony 600 0.2 | 70336 | `0x009000` | `0x01A26E` |
| Harmony 700 2.8 | 76672 | `0x009000` | `0x01BB38` |

**The two architectures store and execute firmware differently**, which explains a lot of
otherwise confusing detail. Arch 12 uses a parallel NOR flash mapped into program space and
executes in place. Arch 14 uses an SPI serial flash, which is not executable, so the
bootloader copies the image into internal flash. That conclusion was reached twice
independently, once from branch target analysis and once from finding the SPI code.

**The screen's text reads back, and a glyph code turns out not to be a character.** It is an index
into the config's own font table, assigned per config in the order characters first appear in the
generator's string list, so two configs of the same remote disagree about it. What is stable is the
typeface, so a code is resolved by matching its glyph's pixels: seven hand read alphabets cover the
corpus and 170920<!--fact:text_read--> of 170922<!--fact:text_glyphs--> drawn glyphs come back as
characters. The closure is that a decoded string turns up verbatim inside a base slot 0 name, which is
ASCII and which the decoder never reads. `make text`, and section 112.

**Two thirds of that text is drawn by reference, and nothing read it for months.** Screen opcode 4 draws
the glyph string at an address, and in 12052 of 12052 instances across the corpus that address is the
payload of an opcode 5 instruction in **another** program: a string is stored once inline and referenced
everywhere else. The byte accounting never complained, because the bytes were already claimed by the
program holding them. Section 121.

**A config says which key starts which activity**, sections 120 and 121, in four hops through a page's
key bindings, an action list, a base slot 9 set and a write to `CurrentActivityState`. The value that
means "no activity" is a field base slot 13 had carried unconfirmed since section 60, and one config
separates it from every rule that would have guessed it. **Every activity in the corpus has its name**,
50<!--fact:activities_named--> of 50<!--fact:activities_total--> on all four architectures, 22 of 22, 4
of 4, 11 of 11 and 13 of 13. `make activities`.

**The Harmony One got there by a different route, and a better one**, section 125. On a touch panel no
fixed scan code to row map can exist, which section 121 proved, so a One's names cannot come from what
its modes say. They come from the hit map instead: the arch 12 only spare byte in front of a mode page's
pointers is the index into base slot 17, so the rectangle a key covers is stated by the container, and
the label is the text the firmware's own hit test puts inside it. That also read the panel's geometry,
which turns out to be three blocks down the screen, at most two side by side, plus a bar of two touch
points below the display and a key at each side of it. Nothing was fitted to get there bar one offset.

**Every device in the corpus has its name too**, section 126, 63<!--fact:devices_named--> of
63<!--fact:devices_total--> across 15<!--fact:user_configs--> user configs, and this one is ASCII rather than pixels. A
device's label is a prefix of one of its state variables' names, and what says which infrared group the
label belongs to is the variable's own transitions: they carry the action list that performs the change,
and for a power or input variable that list is the one that sends the code. 102 variables reach exactly
one group and none reaches two. The independent check is that the label is also **drawn** on the screen,
53 of 55 exactly, which is base slot 0's ASCII and base slot 7's glyph pixels agreeing through readers
that share no code. `make devices`.

**And every key a screen labels carries that label**, section 128, which is the last place this project
could see a name and not say whose it was. Which keys a screen speaks for is stated: a scan bound by a
mode page is one of them, a scan bound by a base slot 9 set is a key on the keypad, and the two
populations are disjoint. Where the label is depends on the remote. A Harmony One states it in the hit
map. Everything else puts its screen keys in two columns beside the display, and those rows are measured
from where the activities of section 121, named without any geometry, are actually drawn: four rows on a
Harmony 880, two on a 525, two on a 600 or 700. 98.9% of 6989 screen key bindings get a label, and 3100 of
the 3106 that send an infrared code do. The rule that suggested itself, the k-th key taking the k-th row
of text, fits the counts and gets two of four wrong on the 600's own activity menu, so it is recorded as
refuted rather than quietly dropped.

**And a config's screens can be drawn**, section 129: `make render` writes the picture a page would put
on the display, which is the check no other test here can perform, since a reader that returns a number
cannot see a label half a row out of place. Every mode page of every config in the collection draws with
no picture and no glyph unresolved, on all four architectures. It also corrected something: a pixel is
stored high byte first, the only field in the format that is not little endian, and reading it the usual
way turned a Harmony One's buttons into rainbow stripes.

**And the remote's clock is in the config twice**, section 130, which fell out of drawing the screens: a
screen switches on the state of the remote, asking which variable that is led to base slot 13's first
field, and it turns out to be the value a variable holds when the config is generated. Records 0 to 6
are second, minute, hour, day, weekday, month and year, every one of them equal to the build timestamp
in all 21 containers. A writer has to stamp them, or the remote's clock comes up set to whenever the old
config was made.

**And a hard key has its name**, section 133, which is the part of that sentence which used to stop at
the screen. The durations a record stores decode back into the **bit frame** the device sees, and a frame
is a number that can be matched against a catalogue of named commands, where a duration stream could only
ever be compared to another duration stream. Matching against the catalogue and button maps of the
account that generated a config names the button a scan code belongs to: 32 buttons of a Harmony One and
36 of a Harmony 600, in [reference/button-maps.md](../reference/button-maps.md), read only and with
nothing written to either remote, which is what section 48 said needed a write into a running remote's
memory. It is a calibration instrument rather than a reader, since it needs the generating account. And
the **position** of a key still does not follow: under the electrical column formula the digits 1, 2 and 3
of a Harmony 600 sit in columns 3, 2 and 2, so a matrix number is a wiring decision.

**The same decoder answered a question that had been open since arch 8 closed**, section 134: the second
pointer group 37 infrared records carry is the same code with **one biphase bit cell inverted**, which is
a bit the protocol makes the sender alternate between presses. It was found by the decoder refusing to
read those records, they all belong to one device, and the two arch 8 configs contributed later have none,
so the 37 was never a property of the architecture.

**So a config now reads as what it is for**: which devices, what each is called, which activities, what
each is called, which key starts it, which devices it drives, what each button sends and what the screen
calls it.
`packages/codec/src/inventory.ts`, one call, which is the shape FreeHarmony consumes rather than seven
readers it would have to order itself.

**One config's device and activity counts are checked against its owner's own written description**,
section 124, which is the first ground truth this project has had for either: four devices and four
activities, on a menu of five entries whose fifth is the remote's own settings page.

**The infrared carrier is generated in software**, not by a hardware PWM, with cycle-counted
delays and a per-half-cycle enable mask. The config supplies a 16-bit carrier period and an
8-bit duty value, scaled by `value * 4 / 10` into instruction cycles. Cross-checked: 38 kHz
implies a stored 263, which the code's arithmetic turns into exactly 26.25 us.

**A code stated as a name and a number becomes pulses**, sections 152 to 169, which is what an
importer of Logitech's still-answering device database needs: their catalogue serves no pulse data,
only a protocol family and a frame value. The rhythm table in `packages/codec/src/protocols.ts`
holds 38 families, each entry saying which route measured it, most off configurations Logitech's own
compiler was asked to produce for appliances chosen here. Their analyser turned out to be a decoder
of their own database rather than of infrared, accepting rhythms their compiler never emits, so it
was retired as evidence and kept as a second opinion. Biphase codes, where the bit is which half of
a cell carries, get their own reader and three families reproduce every record byte for byte.

**A favourite channel is not a key binding**, sections 154 and 156: it lands in four sections at
once, and a channel with a leading zero is spelled out digit by digit instead of going through the
number sender, so a writer chooses a mechanism per channel. Measured by compiling configs with
favourites chosen for the purpose, which also gave base slot 16, the number sender, its first
populated samples: seven made configs populate it and no found one does.

**A television this project composed is byte for byte what Logitech's compiler writes**, section
174. Their service compiled the same account twice, either side of their own generator adding the
television `composeDevice` adds here, and their infrared records for the same catalogue codes match
ours block for block once two of their generator's spelling conventions are adopted: every once
block opens with a lead in silence, and an over-long duration is spelt as maximal words with the
remainder balanced across the last two. Both conventions were measured before being adopted, and
the five remaining differences between their addition and ours are bookkeeping, written down in the
finding.
