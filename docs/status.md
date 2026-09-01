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

The work targets three architectures. **Seven remotes are on the bench**, and this list is the
hardware, not the model families: two Harmony Ones, a Harmony 600, a Harmony 525, and since 27 August
2026 a Harmony Touch, a Harmony 350 and a Harmony 300. The last three are the file based family and
are **not targets** for the config work: `openHarmony` refuses them by product id
rather than by accident, section 193. What they have bought so far is the reading of the descriptor
field that names a model, section 195, the route to their firmware, section 196, and their whole
protocol as Logitech specifies it, section 198. **There is an implementation now and it has read a
remote**, sections 200 and 201: `packages/usb/src/filepipe.ts`, and a Harmony Touch's `/sys/sysinfo`
opened, read and closed on the bench, 234 bytes in fourteen fields including the architecture the
remote states for itself. This paragraph called it a specification and not an implementation until
29 August 2026. Reading that identity is four commands, ping, open, read and close, and none of them
writes, so `openHarmony`'s refusal is about what has been built for the **config** path rather than
about what is reachable at all. Other models
appear throughout this page as firmware images or contributed configurations, and the Harmony 700 is
the one that gets mistaken for hardware, because it is the best mapped arch 14 image and is quoted
constantly. There has never been a Harmony 700 here.

* **arch 12** ("Gin"), the Harmony One, and the spare Harmony One that is the only unit anything
  may ever be written to
* **arch 14**, the Harmony 600. The Harmony 700 belongs to this architecture and is a **reference
  image**: two configurations and a firmware image, no remote
* **arch 9**, the Harmony 525, connected on 8 August 2026 and a target since: its config and its
  firmware are in the lab, and its class 5 infrared, which was the last big gap in the byte
  accounting, is read. It has no write target and will not get one.

**Firmware is held for four architectures**, 8, 9, 12 and 14, **plus a fifth, architecture 16**: Logitech's own software update service serves the Harmony 300 and Harmony 350
image to an anonymous request, section 196. It is the first firmware here to come from the vendor
rather than from hardware, a contributor or a repair site, and it is an ordinary PIC18 image at the
same load address as arch 14's.

**This said the architecture was not established and that no config of it had been read**, until
29 August 2026, twenty lines above the paragraph in this same document that says a Harmony 350
brought architecture 16 with it. Both halves were already false when written: section 194 read a
Harmony 350's configuration through concordance and it passed all fifteen framing checks, with slot 1
stating architecture 16 and the remote itself reporting the same over USB, which is two routes with
nothing in common. The load address argument was sound and it was answering a question that had been
closed by other means. What remains true is that **this library cannot open one**: the file based
protocol reaches its storage by name and no read path here goes through it.

Established: the MCU family, firmware load addresses, flash layouts, the firmware image
header and its checksum, the config container, the keypad scanner, and the complete
infrared path from config pointer to LED including the SPI storage layer.

The container is now validated across **four** architectures, because publicly shared sample
sets (arch 8, arch 9 and a Harmony 700 pair) were added as controls. Seventeen samples in the
framing tables, five base addresses and three pointer table lengths, which is the same property the
format word states rather than a second one, section 194, so it is counted once. All
consistency checks pass; the wider population of everything in the lab that parses is
44<!--fact:parseable_containers--> containers over **six** architectures, since arch 10's framing
verifies too and a Harmony 350 arrived on 27 August 2026 bringing arch 16 with it, section 194. It
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
the group if it differs: fifteen such lengths read off two images, seven for arch 14 and eight for
arch 12, holding in every container of
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
path, whether the firmware erases before it programs, which is moot for a caller that erases first,
and whether the USB peripheral can accept a report before the firmware has serviced the previous one,
which is a buffer descriptor nobody here has read. The firmware's own answer on pacing is that it
asks for none. What keeps a write from happening is the rails and the unopened door, not an open
question. See
[docs/findings.md](docs/findings.md) for detail and
[docs/config-format.md](docs/config-format.md) for the spec as it firms up.

## What the corpus holds

10<!--fact:corpus_dumps--> dumps from 5<!--fact:corpus_contributors--> contributors, carrying
31<!--fact:corpus_configs--> configs across 5<!--fact:corpus_architectures--> architectures, plus seven
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
| 10 | 890, 895, 890 Pro | 2<!--fact:corpus_arch10_dumps--> | 12<!--fact:corpus_arch10_configs--> | **none** | **firmware**, which is the single hardest blocker here |
| 12 | One | 2<!--fact:corpus_arch12_dumps--> | 2<!--fact:corpus_arch12_configs--> | One 3.4, plus safe mode and both internal pages | nothing: this one is covered |
| 14 | 600, 650, 665, 700 | 2<!--fact:corpus_arch14_dumps--> | 3<!--fact:corpus_arch14_configs--> | 600, 650 and 700 | a 665 config |
| 15 | 900, 1000, 1000i, 1100, 1100i | 0 | 0 | none | out of reach by construction: a network class device, not HID, so this library cannot address one |

**Arch 10 is the interesting gap and it is not for want of configs.** The corpus holds reads of two
Harmony 890s and one Harmony 895, their container framing verifies, and the twenty three pointer slots
are **not** a relabelling of the twenty. That was inferred from reader scores, the best of 1330
placements reaching 34 of 47 where arch 8, 9 and 14 each score 47 uniquely, and it is **proven** since
26 August 2026: the Harmony 895's owner states its six devices, base slot 5's entry count equals the
device count on 9 of 9 configs across the other four architectures, and no arch 10 slot holds a six
entry array at all. Base slot 5 could only land on raw slot 5 to 8 under any placement, three of those
are one, one and three bytes where a six entry array needs nineteen, and the fourth declares nine.

**The mapping was then derived from content rather than fitted, and it is switched on**, sections 183 and
184: fifteen base slots present, five absent and eight raw slots that are no base slot, with base slot
10's packing closure as the anchor that settled it. So a Harmony 890's screens, button bindings, action
lists, build timestamp and **drawn text** all read, the text at 5634 of 5634 glyphs, naming the same four
activities and four appliances as the arch 8 Harmony 880 from the same household. What it does not give
is the device names or the activity count, and that is structural: both routes need base slot 0's name
tree, which arch 10 has no slot for, or base slot 13's transitions, which section 184 refuted. The byte
accounting sits at **99.3% and 97.2%** with zero overlaps, after section 185 read the biggest remaining
family as mode page screen programs: one table entry was missing, the operand width of the single screen
opcode that differs per architecture, and 49 and 34 programs were abandoned unread with a fifth of the
drawn text. That width was measured per program rather than off the coverage percentage, which prefers
a wrong answer that overruns and claims 308344 bytes twice while reporting a clean 100.00%.
**What read there before any of that is what the framing locates**, section 179: the picture
bank is found from the trailer's position alone, calibrated on 14 of 14 containers whose bank is known
by another route, so 57% of a Harmony 890's file and 72% of a Harmony 895's is accounted for as
pictures and both state a **128 by 160** display, the same as a Harmony 885. **Its font sets read the
same way**, section 180: eight of them on each, found by requiring every pointer to decode into a glyph
that tiles exactly, and their shapes are named by the arch 8 alphabet at 213 of 237 where the Harmony
One's alphabet names none. So a Harmony 890 uses the Harmony 885 typeface and its letters read, though
not its words, since a string's address comes out of a screen program and those need the mapping.
**And its infrared database reads**, section 181, because a record states its own address: 300 codes on
the Harmony 890 with all 463 duration blocks decoding, exact against the slot route on 13 of 13
containers elsewhere. The Harmony 895 has **none**, proven rather than unfound. And those three structures then **identified the slots that name
them**, section 182: an arch 10 config does state its architecture after all, 10, at raw slot 0, and it
has no name tree slot at all. **The mapping is determined**, section 183, and corrected and switched
on in section 184: fifteen base slots are present, five are absent, 0, 2, 8, 13 and 14, and eight raw
slots are no base slot. The decisive anchor is the action list table's packing closure, which exactly one
arch 10 slot satisfies with arch 8's own signature. The readers were gated deliberately at first: the
mapping lived as data in a test, because `archSlot` could not express an **absent** base slot and it is
a decision rather than a consequence. Firmware is what settles it, the way arch 9's own firmware settled its
infrared classes. Sections 115, 117 and 178.

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

**Logitech's device catalogue reads locally and it names every command**, section 229. A configuration
numbers its infrared codes and names none of them, so which of a device's ninety codes is volume up came
only from Logitech's button map service through two test accounts. The archived catalogue, 7889
manufacturers and 276236 devices, states a name beside every code: a device group is identified by the
numbers its own records decode to, 36 of 38 groups in this corpus and 31 of them on every number they
send, and 537 of 598 button bindings then get a name, all of them on the two calibration configurations.
It was tested before it was believed, and the closure is that the labels agree: `Roku`, `VCR` and `Denon`
are the config owner's own words, invisible to the archive, and they land on a Roku box, a Panasonic
video recorder and a Denon receiver.

**A code stated as a name and a number becomes pulses**, sections 152 to 169, which is what an
importer of Logitech's still-answering device database needs: their catalogue serves no pulse data,
only a protocol family and a frame value. The rhythm table in `packages/codec/src/protocols.ts`
holds 681<!--fact:protocol_entries--> entries over 681<!--fact:protocol_families--> distinct families, one entry per family, of which
**37<!--fact:protocol_measured--> were measured here and 644<!--fact:protocol_stated--> are Logitech's own definitions converted**, sections 227 and 231.
The measured ones cover **all 33** families this corpus holds a record of, section 233; the stated ones
are families no configuration here has ever carried, so `codes: 0` on such a row is the honest number and
`source` is what tells the two apart. 33<!--fact:protocol_tails_stated--> of the stated rows carry a whole block derived
from Logitech's own statement of it, sections 228 and 233, and the other 611 carry a frame and nothing
after it, so a code of those families can be built and not yet written. It said "A stated row carries no
measured block either, so a code of that family can be built and not yet written"<!--superseded--> for one
day. What holds the 611 back is not the shape, which their definitions state and which reproduces all 29
blocks measured off their compiler exactly, but **how many times a repetition is sent**, which they state
for 39 of 684 families and which is not guessed here. That is now the **only** thing holding any of them
back, section 233: every other reason a stated row had no block has been read. It said "since one family appears at two carrier
frequencies"<!--superseded--> until 31 August 2026, which was true of the table and false about
Logitech: those two entries were two families their analyser both called `SharpO1 48 Bit`, and their
catalogue states one carrier per family. Each entry says which route measured it, most off configurations Logitech's own
compiler was asked to produce for appliances chosen here, and **each family is named by their own
catalogue**, matched on the rhythm their definition states. Their analyser turned out to be a decoder
of their own database rather than of infrared, accepting rhythms their compiler never emits, so it
was retired as evidence and kept as a second opinion. Biphase codes, where the bit is which half of
a cell carries, get their own reader and four families reproduce every record byte for byte.

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

## Where the work stands

*Moved out of `CLAUDE.md` on 29 August 2026, where it was a second copy of this document's own subject.*

`docs/roadmap.md` is the plan of record and tracks its own progress. Steps 1, 2, 4 and 5 are done,
and step 3 is done as far as the firmware can take it. **This section is a status board, not a
summary of what is known**: that is `docs/findings.md`, 237<!--fact:findings_sections--> sections, and `docs/config-format.md`
for the structured form. Section numbers below are the pointer into them.

**The read path works, and one write has been performed**, section 222: one 64 KiB block of the
spare Harmony One's own configuration, erased and put back unchanged on 30 August 2026, verified over
the block and over the whole configuration. `GET_VERSION`, `READ_MISC`
and `READ_FLASH` run from our own host code on both bench architectures, a config read matches each
unit's lab dump byte for byte, and the four remotes this library can open are fully read and verified
against their backups: user config, application firmware, safe mode, and the internal pages where the architecture
serves them, no differences. What is
verified is that each backup is faithful; **restoring from one has never been tried.**

Byte accounting is under "What reads" above, with the figures each architecture started from. **A
second copy of that table stood here from 29 August 2026 until later the same day**, brought in with
the text moved out of `CLAUDE.md`, and it is worth recording rather than quietly removing: the move
was justified as ending a two copies state and it created one in the destination. `make facts` could
not see it, because both copies carried markers and both were correct, which is exactly the state
this project's oldest rule is about. Two right copies are what precede two diverging ones.

## What is still open

*Moved out of `CLAUDE.md` on 29 August 2026. Fourteen entries, of which **twelve are open**: two are struck through and answered, and they stay because a question that turned out to have an answer is worth as much as one that did not. Read when a session needs them rather than carried into every one.*

* **`GET_VERSION` field 6**, a compiled in `0x0C` with no reading, and **field 9's accessor**, a
  table read at program `0x020024` whose byte is `0xDE` while the remote reports `0x16`. The other
  ten fields have a reading, section 59 and section 87. The installed image is ruled out as the
  explanation: the One's own flash dump is byte identical to the package there, so what is left is
  what a `TBLRD` does past the on-chip flash, which is a hardware question and not a firmware one.
  **Field 6 has a reading now and it is unconfirmed rather than absent**, section 116: it names a
  **platform**, not an architecture, and arch 12 and arch 14 are one platform under it. `0x0C` on both
  of those across six images, `0x09` on arch 9, `0x08` on arch 8. **What a recovery role image
  answers is per architecture**, sections 118 and 190: a live Harmony 525 in safe mode reports `0x00`,
  as the arch 8 bootloaders do, and a live **Harmony One in safe mode reports `0x0C`**, the same as
  running normally. So section 118's "for an application image only" was one architecture written as a
  rule, which is what it had just criticised section 116 for in the other direction, and section 116's
  arch 12 figure turns out to have been right. Arch 14 is unmeasured on hardware. The mechanism is
  section 189's, that arch 9 copies its safe mode image over the application and arch 12 copies
  nothing, so the two findings predict each other. **Field 4's low nibble is what actually says which
  state a remote is in**, 0 running and 4 in safe mode, and on a Harmony One it is the only one of the
  twelve fields that moves between them. Everything else already grouped those two: same MCU family, same
  `GSPM` cookie, and Logitech's own platform table calls arch 12 the Gin family. What moved it was the
  population going from four images to eleven; four could not tell "equals the architecture, except
  once" from "equals the platform, always". The `bcdDevice` high byte has the same shape and different
  values, `0x08`, `0x09`, `0x10`, `0x10`, so the two are not one variable.
* **What the One's analogue channel 1 measures**, section 103, and **USB cannot settle it**, section
  111. Two readings fit and they differ only in the sensor's wiring, so the firmware cannot choose, and
  the bench read that was meant to choose landed on outcome 2: the converter is off and its result
  register frozen across 60 seconds while the clock ticks in the same poll, so covering the sensor
  cannot move `0x110`. What the read did settle is that the band, the state and the level in RAM agree
  with each other through the config's own base slot 15, which is how we know an arch 12 remote on USB
  has read its config. Finishing the sensor needs the remote off USB, which no read path reaches.
  Channel 0 is the battery, `0x111`, eight levels, and it reads 7 of 8 on a charging remote.
* **Arch 9 (Harmony 525) has no read path to its data memory at all**, section 137, which the same round
  established with a control worth copying: the `READ_FLASH` window at top byte `0x40` answers zero for
  the bank 2 bytes holding the offset and buffer pointer of the read in progress, so the zeros are the
  window's and not the memory's. `READ_MISC` was already dead there, section 90. So the reading of a
  Harmony 600 (arch 14) is the only bench measurement left of the two, and on arch 14 a remote does not
  load its config on USB at all, section 110, which would make a null result there mean less than it looks.
* **Which routine increments the minute on arch 12 (Harmony One)**, section 111, and the reason it was
  never found is closed rather than the routine: `0x109` is **state variable 1**, section 138, and every
  write to a state variable goes through a store whose `FSR0` is computed from a literal 8 and an index.
  So there is no direct write and no `LFSR` because there is no pointer variable, which was the dead end
  `trace-section` names first and it was the right dead end for the wrong reason. What is left is which
  caller passes index 1, and **nothing depends on it**: the field is named from the firmware's own
  subtraction against base slot 3's record and its behaviour is measured twice.
* **The rate the arch 12 clock loses time**, section 111. Two mechanisms are read and both only lose, so
  5.6 minutes a day is an upper bound rather than a figure. **Deliberately not measured**, decided on 10 August 2026, since
  it would need the One left alone for a day and read at both ends, and no
  document or code anywhere wants the number. Recorded so that the bound is never quoted as a
  measurement.
* **The arch 12 calibration words at `0x01F5C0` and `0x01F5C2`**, section 105: 94 and `0xFFFF` on
  both units, fetched by the same helper as the battery scale, consumer not traced. The scale itself
  is read, `4 + trim/65536` millivolts a converter count, and **section 44's battery conjecture is a
  finding now**. Two hazards worth carrying: `0x01F580` is **on chip**, so a firmware `TBLRD` there
  and a `READ_FLASH` over USB at the same number read different memories; and the words had been in
  the lab for a day, filed as "unidentified" in `docs/memory-map-one.md` two rows above the note that
  says two remotes differ at `+0xF582`.
* **Which I2C device sits at address 0x60 on the Harmony One**, section 106. Thirteen channels of
  three states, two eight bit level registers, an enable on `LATC` bit 5 and no readback, which is the
  shape of an LED driver and most plausibly the keypad backlight, dimmed by the same band that dims
  the screen. **Not confirmed and deliberately not named.** A datasheet search on the address and the
  register numbers, or a photograph of the board, settles it; firmware cannot.
* ~~**Our frame decoder reads an unmerged pulse train and should not**~~, **merged now**, section 164.
  Adjacent durations of one kind are one interval physically, so the reader merges them, and it costs 45
  records of three arch 8 (Harmony 880) configs that all read the same eight bit value, which forty five
  different commands cannot be. Logitech's own decoder refuses all 36 of them it was asked about. **It
  cost less than section 153 predicted**, because section 163 landed first: the partition is 3502, **0**
  and 1128 rather than the 3502, 764 and 57 predicted, since requiring a constant non carrying half
  already refuses everything the merge would have made ambiguous. Two things to carry. The merge is
  **not** applied to the biphase reader, where two adjacent cells of one kind are two cells. And after
  it a biphase code can produce a plausible pulse distance reading, two `Magnavox 13 Bit` records among
  them, so the rhythm table's join prefers a reading that lands on a number by **value** over one that
  lands only by matching a width.
* **A frame's non carrying half has to be one length**, sections 163 and 165, which is the rule the
  terminator constant had been standing in for. **One length means it does not split**, by the same ratio
  the carried half has to split by, and not byte identical: exact equality refused ten records of the
  compiled sample whose flat half alternates between 433 and 434, nine of which our reader now puts on
  the exact number Logitech's own analyser states. The margin is 6.1% admitted against 100% refused, with
  nothing in between. `decode` now demands it as `timingsOfFrame` always did, so `GAP_US`
  could rise from 4000 to 8000 and `JerroldO1 16 Bit`, whose set bit is a 4505 space, is the twenty first
  entry in the table. It cost one direction of section 134's biconditional: the 148 records that read
  under **both** conventions now read under none, which is exactly the biphase population, so the
  detector moved to the reader that names the cause.
* ~~**148 biphase codes are readable and we cannot read them**~~, **read now**, section 162. A biphase
  code has one duration, the half cell, and the bit is which half of it carries, so there is nothing for
  `irFrame` to split and its two conventions both fit. `biphaseFrames` reads them and three families are
  in the rhythm table, each reproducing every one of its records byte for byte. The confirmation is that
  the reading, worked out on a configuration Logitech's compiler made for appliances chosen here, lands
  on 48 of 48 records of four **contributed** configs where their analyser had already stated the number.
  `irFrame` still refuses them, which is deliberate: that refusal is the corpus's only detector for the
  family, section 134.
* **Three of the four infrared encoding classes**, used by no config in the corpus, so a firmware
  problem rather than a decoding one, section 42. **Why they are unused is settled**: Logitech's own
  user manuals say the learned signal was uploaded to their web site, which did the pattern matching
  and chose the storage form, so the class was a server decision and the unused ones are the ones
  that service never emitted for these devices. A miss was "stored as-is in its original format",
  which predicts a raw class. That matters for FreeHarmony: the service that made the choice is the
  discontinued one, so learning a code without it means making that choice locally.
* **Where a learn session's samples leave the remote is read**, section 98, and the two searches
  that failed did so because both assumed the bytes are **sent**. They are not. `START_IRCAP` clears
  two 66 byte buffers at `0x0600` and `0x0642` and a toggle at `0x0684`, the capture path fills
  whichever is open, and the transport points the **endpoint 1 IN buffer descriptor** straight at it,
  `0x40E` and `0x40F`, with the count at `0x40D`. So no routine ever emits `0x90`: it is stored into
  the buffer at `0x602`. On arch 12 a report is 64 bytes, `0x90`, a sequence byte advancing by
  `0x10`, then samples as **big endian `u16` durations** differenced from CCP2, with the payload
  length repeated in the last byte. That encoding is the config's own, bit 15 marking a pulse, so
  what comes off the remote is already the shape a record wants. **Arch 14 has the same header**,
  written through `INDF` because it reaches the buffers by `FSR`, which is why a scan keyed on the
  buffer offsets missed it; what stays arch 12 only is the differencing that makes a sample a
  duration. **The reports are unsolicited**, so a
  host must keep reading during the session; that settles section 91's disagreement between the two
  clients in the classic one's favour.
  **Do not argue this from a literal scan**: a data response code carries a computed length nibble
  and never appears as a literal, which cost one wrong negative here, `reference/superseded.md`.
* **The physical button map**, meaning the matrix keypad. **The Harmony One's touch panel is mapped**,
  section 125, and out of the config rather than the hardware: base slot 17's rectangles, the mode page
  byte saying which page is in force, and a transform onto the display. That leaves the 44 keys around
  the panel, and every other model. Measured as far as USB allows and no further, section 48: a remote on
  USB never runs its **keypad handler**, because USB mode's own loop does not scan the matrix. It does
  run the rest of its application, section 111, and "never runs its application" was the wording here
  until a Harmony One was watched ticking. **On arch 14 it does not even load its config**, section
  110: the journal's five variables are zero on the 600, so neither the container's marker check nor
  the allocator has run, and anything the host wants to know it computes from the bytes itself. On arch
  12 it does load it, section 111, because the config is memory mapped and there is no load step.
  Arch 14 yields the **column**
  only, `(code - 1) mod 4`, and arch 12 yields nothing at all, since sixteen buttons from every
  region of the One share one sense line. Finishing it **over USB** needs a RAM write to drive the
  rows, which the rails forbid, and **that is not proposed here.**
  **The cheapest route needs no remote on the bus at all, and it is the board**, section 144: a
  survey of an 885's circuit board, done by somebody else and checked here against our own configs,
  is what settled arch 8's lattice as 4 by 16 with `scan = (line - 1) * 4 + input`. The 885 config's
  column census and that board agree at 14, 14, 14, 13 through routes with nothing in common. **The
  arithmetic is per architecture and must not be ported**: arch 9 (Harmony 525) is `group * 8 +
  column`, arch 14 (Harmony 600 and 700) is 4 by 14, and searching all nine images this project
  holds finds arch 8's encoder in the four arch 8 ones and in none of the others. On arch 12
  (Harmony One) the board is the **only** route left, since a live census there yields nothing.
  **There is a second route that needs no write**,
  section 123: the 525 implements infrared learning, so pointing the original equipment's own remote
  at it and matching the capture against the class 5 records section 82 read names the command, and
  the config already binds a scan code to it. `0x70` is still a command that changes a remote's
  state rather than reading it, so `READ_ONLY_COMMANDS` refuses it and nothing here has sent one. **The refusal is that allow list and not the write flag**, which this said until 29 August 2026: no method sends `0x70`, no rail mentions it, and `HARMONY_ENABLE_WRITES=1` would enable nothing, so whoever implements learning has to add the command, its classification and a rail rather than lift a switch. Neither of Logitech's own applications has
  it either, checked on 9 August 2026: a host names buttons and the firmware resolves the name to
  hardware, so no host ever held the map. `docs/host-client.md`.
  **Arch 9 sits below both and needs no census**, section 89: the 525 senses on a single line like
  the One, so a press is not even worth a column, and its matrix falls out of the firmware instead.
  8 by 8, scan code `group * 8 + column` running 1 to 64, and both its configs bind the same 50
  codes, none a multiple of eight and contiguous in the resulting lattice to 57. So **the 525 has
  fifty matrix buttons**, predicted from firmware plus config and then **counted on the remote**,
  which makes it the one architecture where every matrix button is bound and no bound code lacks a
  button. **Counted a third way on 11 August 2026 and it is fifty**, from a product photograph, which
  is a free confirmation of a number that had cost a firmware read and a hardware census.
  `reference/silhouettes/h525.svg` is that count as a drawing, and what it does
  **not** carry is any scan code, because arch 9 (Harmony 525) has none measured at all: the positions
  are drawn and the assignment is open, since section 48 is why no read path here can produce it. Nor is
  it yet a usable map of **where** the keys are, since every key in it sits on a horizontal axis and a
  525's rows do not, which is what the traced geometry fixes on the models that have it. The four soft keys are narrowed to the set
  `{30, 31, 38, 39}` and deliberately not assigned within it, because nothing establishes which of
  columns 6 and 7 is the left one. A test refuses a `data-scan` attribute anywhere in the file, so
  filling one in has to be a deliberate change with a measurement behind it.
  **The 600 and the One are drawn too**, and the pair is instructive about what a third count is
  worth. The **600 came to 54**, which is exactly what section 17's field split and section 48's
  column census of 14, 14, 13 and 13 both give, so three independent routes agree. The **One came to
  44 and nothing can check it**: arch 12 yields no column from a USB census because sixteen buttons
  share one sense line, so that number is a count of a photograph and the drawing says so rather than
  implying confirmation. Both carry `data-scan` on their measured keys since the traced geometry
  landed on 21 August 2026: the 600 its 36 mapped buttons, the One its 32 plus the two touch arrows
  section 125 placed, which corrects the next paragraph's original ending in place.
  **A scan code has a name now, read only, and it still has no place**, section 133: the code a scan
  sends decodes back into the **bit frame** the device sees, `packages/codec/src/irframe.ts`, and a frame
  matched against the command catalogue and button maps of the account that generated a config names the
  button. 32 buttons of a Harmony One and 36 of a Harmony 600, `reference/button-maps.md`, with nothing
  written to anything. **It is a calibration instrument and not a reader**: it needs the generating
  account, so it works on the two configs Logitech compiled to our specification and cannot name a key in
  a contributed config. Three things to carry. The ambiguity was mostly a **scope** error, eight scans a
  remote down to four: a scan's command is per activity and its button is not, only an `ActivityButtonMap`
  may name an activity's set, and the assignment is globally injective because a button is one physical
  key. The four that remain are real, two up keys and two down keys sending one command each, and no
  decoding breaks a symmetry. So the tables stay out of `packages/usb/src/models.ts`, since the rest is
  **unbound**: these configs drive three devices in two activities and a library answering for a scan
  they never bound would answer from nothing. The silhouettes were going to get no `data-scan` on the
  same ground and got them on 21 August 2026 anyway, for the measured keys only, which serves both: a
  drawn key answers with its code or with nothing, never from nothing. And **the
  geometry does not
  follow**: under section 48's own column formula the digits 1, 2 and 3 of a Harmony 600 sit in columns 3,
  2 and 2, and no divisor to 19 in either direction puts a digit row on one line, so a matrix position is
  a wiring decision and a test asserts it cannot be recovered.
* **`MCU_ID` is unreachable by construction**, not a task: a PIC18 keeps its device id at `0x3FFFFE`
  and the internal read window is two 64 KiB pages. The arch 12 part number stays inferred.

## What moved most recently

*Moved out of `CLAUDE.md` on 29 August 2026, where it was a rolling account of the newest findings.
Every claim in it is in `docs/findings.md` with a section number and a regression test.*

*It restates several findings that "Headline findings" above also covers, deliberately, because a
rolling account is ordered by when something was learned and that section is ordered by subject. The
figures common to both carry `fact:` markers, so `make facts` moves every copy together and they
cannot drift apart; what a reader should not expect is two independent statements of one measurement.
Recorded on 29 August 2026 after an audit found the move had also planted a **second copy of the byte
accounting table** here, which was a real duplicate with nothing added and has been removed.*

**And a configuration our own codec produced is now on a remote**, section 237, which is the last box
in front of adding a device. Everything written before today came off the remote it went back to;
this one the codec emitted, every byte of it, and the remote handed it back identical. The change is
one device's power on delay, six seconds to ten, which is the smallest edit the format admits.

What it cost to find out is the part worth carrying. A **one byte** edit is a **two block** write,
because the checksum at the far end of the file moves with it, so two erases is the floor for any
edit rather than a property of the one case that had been measured. A writer therefore needs a copy
of a whole flash **region** and not of a configuration, since the checksum's block runs off the end of
the file. And the verification read failed while the write succeeded, on a known transport hiccup,
which is the worst way round to fail and is now fixed by reading through the retrying reader.

**A remote's configuration has been changed, and the first change showed nothing**, section 236.
Two writes on the spare Harmony One, one byte of real content each inside a 64 KiB block reproduced
from a verified dump, both read back and compared. The first raised a television's power on delay
from five seconds to ten and the activity behaved exactly as before, which turned out to be what the
firmware requires rather than a failure: the queue that carries commands tags every entry with a
device and holds a command back only when an earlier entry names the **same** device, so a delay
delays one thing, the next command to its own device. That television gets one command in that
activity, so its ten seconds ran down in the background. The second write raised the **receiver's**,
which does get a second command, and its gap grew from about six seconds to about ten on the bench.
One reading, two opposite predictions, both observed. A third write then put all three changed
bytes back, and the whole configuration read off the remote afterwards is **byte identical to the
dump taken before any of this**, so the way back is a measured route rather than a plan.

Two things came with it. The mechanism is read on **both** bench architectures and the routine that
carries it is identical on the two but for one literal, which is what lets a reading taken off a
Harmony 700 image license a claim about the Harmony One that was written to. And the corpus says how
often this bites: of 127 pairs of an activity and a device it switches on, 35 send that device
nothing after the power code, so a quarter of the power on delays in these configurations can never
be felt, with 13 containers holding both kinds at once. An interface that offers "power on delay" as
a pause in the activity would be wrong about those.

**A device's delays were not where the plan said, and the screen is what says whose they are**,
section 234. The plan of record carried "which base slot 15 group holds a device's delays" as the<!--superseded-->
last reading before the first write that changes something, and no group does: that section's shape
is one per architecture over containers holding 0 to 7 devices, and its values are shared across
containers whose device counts differ, so it tracks the **model**. The delays are ordinary state
variables in base slot 13, eight per device, and the unit is a **tenth of a second**, which the
config states itself by drawing 451 labels from `( 0 sec )` to `( 45 sec )`, contiguous, one per
position of the slider the remote's own menu offers. Logitech's service states the same inter device
field in milliseconds at exactly a hundred times the stored number.

Which device a delay belongs to needed a route of its own, because two vocabularies name a device in
one config and base slot 0 relates neither to the other: buttons and infrared groups go by an ASCII
label and delays go by Logitech's numeric device identifier. The **screen** relates them, on the page
that offers to put one device's delays back to their defaults: it draws the label in its title row and
its instructions copy that device's defaults into its current values. 19 of 19 devices over the four
containers that have delays, against 1 and 4 of 19 for the two orderings of the identifiers anybody
would guess, and Logitech's own button maps for the calibration account agree about which device is
which. So changing a delay is a same length edit of one `u16`, the cheapest change this format has.

**And a Harmony One states the same delay, one commit later**, section 235, which is what turns the
reading above into something worth writing. Arch 14 was the odd one out: it keeps the number in a
variable, and the Harmony 880, the Harmony 525 and the Harmony One keep it as one instruction at the
top of the action list that switches the device on. That instruction had been read for weeks as "a
quantity" with the unit unknown, and what settled it was Logitech compiling a configuration for the
**same three devices** twice, once per architecture: the two agree device for device, so the operand
is tenths of a second. 75 of the 83 devices in the lab now state a power on delay, the eight without
one being the things nothing switches on. This matters because the only remote this project may write
to is a Harmony One, and changing a delay there is **one byte** with nothing moving around it.

**And Logitech's own account agrees about the numbers**, the same section. Everything else that
confirms a delay is read out of a configuration, so the check had to come from outside one, and it
needed no write: their service states a power on delay per device in milliseconds. Against the
configuration they compiled for the spare Harmony One it agrees on four of four devices at exactly a
hundred times the stored number, and on two of those the owner has tuned the delay away from the
catalogue default, with the configuration carrying the tuned value. Their record also states an inter
device delay, and no instruction in that configuration carries it, so where the Harmony One keeps
that one stays open on a measurement rather than on nobody having looked.

**Two million of Logitech's own waveforms, against our encoder, and nothing disagrees**,
sections 230 and 231. The infrared archive carries a rendered waveform for every command in their catalogue,
produced by somebody else's code from Logitech's own protocol definitions, which makes it an answer key
two million entries long that nobody here had a hand in. **1,894,306 of 1,894,309 first transmissions
agree exactly, and 1,112,791 of 1,112,794 held repetitions**, agreement meaning every interval identical
rather than close. Nothing else that judges the infrared encoder is remotely that size: the corpus holds
3017 codes and the rhythms measured off Logitech's own compiler cover 35 families.

**The return is seven defects it found**, which is the point rather than the percentage. A frame's width
was taken from the family's name, and on 23 families the name states the **total** across the frames
rather than each, so `Daewoo 16 Bit` went out at twice its bit count on all 9492 of its commands. A
second segment states its own lead in and it need not be the frame's. A command's keycode states its own
cycles and they may not be the family's default: every `RCAV1 24 Bit 2` command repeats the segment whose
lead in is 19800 microseconds where its definition's default repeats the one at 4000. How many frames a
code sends is the greater of what the definition names and what the cycles ask for, and taking it from the
definition alone made `Revox 11 Bit` send its first value twice and its second never, which is the
failure hardest to see from outside because the waveform is well formed and carries the wrong number.
A Pronto section cannot open on silence, and ours was keeping a leading space where Logitech's renderer
drops it. And a pad shared across two copies is wrong wherever those copies carry different values.

**The seventh is the one with a lesson in it.** A cell may state the half that carries the bit **first**,
and our table stored the pair the other way round and got away with it on 30 of the 37 families that do
so, because their own lead in supplies the missing half. On seven it does not, and 1058 commands were
going out wrong. Those seven were **refused** first, a code that would be wrong not being emitted, and
the refusal was the right answer for the day it took to teach the frame emitter the other spelling. No
measured row uses it, the old spelling being exact for all of them.

**Nothing is left, and the last three commands were not what section 230 said they were**, section 231.
Those three were attributed to values written in base four, on the strength of the family's name
containing the word `Quad`. `Quad 5 Bit` states two symbols and five bits and writes its values in
hexadecimal, so the base came from the name and the name was wrong.

**The reading that closed it also took the table from 461 families to 600**, which is the bigger half.
142 of Logitech's families spell a bit as a whole **cell shape** rather than as one of two lengths: a
value is read a digit at a time and each digit picks a cell, out of four or out of sixteen. Base four
and base sixteen looked like two problems and are one shape, so 142 read where 75 were planned, and the
converter now answers for **599 of Logitech's 684** families. **Every command that can be built agrees**:
1,923,128 of 1,923,128 first transmissions and 1,135,097 of 1,135,097 held repetitions, over 428
families, up from 368. The controls did not move: the 34 of 35 rhythm calibration and the 29 of 29
block calibration both pass unaltered.

**And that shape is read too, section 232.** 84,694 commands of 29 families whose press cycle names two
infrared segments with **different** rhythms were refused because a table row held one rhythm: a family
can send several inside one press, and `Classe 16 Bit Toggle` sends four mode bits at a 442 microsecond
half cell, one bit at 880 and sixteen data bits back at 442. That is RC6's shape.

**Then the whole population, section 233: 2,067,623 of 2,067,623 first transmissions agree and all
1,166,798 held repetitions, over 680 families, with nothing outstanding.** The 240 commands not compared
are the ones the archive renders no waveform for, so there is no comparison to make. Nine more readings
did it, each one a refusal in section 232's census: the largest is that a two symbol family whose rhythm
fits none of our specific shapes is a **cell table of two**, which states both intervals of a cell
outright and so can hold a rhythm that will not split into a constant half and a carried one. The others
are a press cycle's third block, sent when the key comes up; a code that states no repetition at all; a
pad whose period is its own rather than the block's; the fourteen segment words a keycode may name; and
a zero length interval keeping its side of the carrier.

Four defects of ours came out of it, three of them silent. Logitech's own field order is `sequence` then
`token` and reading it by token alone is ambiguous on 103 of their definitions, which put a repeat
cycle's value in the start block on 720 commands of one family. A segment's own width sits inside their
`Payload` and this reader had it one level up, so a docstring here said the field was always null. The
comparison **test** built its own waveform rather than calling the library's, and had drifted two
readings behind, which is the two-copies state this project's oldest rule forbids. And the table
generator dropped the new field, exactly as it dropped `carriedFirst` the day before.

`make prontocheck` is the run, about forty seconds, and it needs the public archive checkout and no
network. What is left is the keycode reader's closed set of segment words: 16,476 commands name a fourth,
`Start` on 15,146 and `Finish` on 10,442 among them.

**And which remote is on the cable is read off the remote**, section 226, which was the last of the
three things the write rails took a caller's word for. Two Harmony Ones enumerate identically, so the
question had been recorded as unanswerable; it is not, because the remote holds a 64 byte identity block
in its own program memory whose two GUIDs are exactly what Logitech's own service takes as a serial.
This project's first proposal was to fingerprint the unit by its configuration, and Danny refused it and
asked whether the vendor already had a way, which they do. **The lesson is the ordering rule again**:
look at how their software does it before working out how it should be done. The trap worth knowing is
that the field actually named the serial is `0xEE` on every remote read here, so comparing it matches
every unit against every other and says yes with confidence. The values live in the private lab and
FreeHarmony will keep them with the user's own data; the contribution probe still emits none, because
its report is published by other people. **Exercised on the spare the same day**: it identifies the
unit, the rehearsal's dry run matches it against the recorded value, and both refusals were shown to
bite, a record changed by one character and a record missing altogether. All reads, nothing written.

**The compatibility gate is performed rather than asserted**, section 225, which is the one write
rail with a specific job: refusing a configuration built for a different remote. It took a boolean and
every caller passed true, so the check with the most to say was the caller's opinion. It takes the two
inputs now, what the configuration states and the version block the remote sent, and the rail compares
them, over a mapping that had to be derived: `PROTOCOL` carries the **architecture**, and the byte this
project once called the protocol is `platform`, which is the same on arch 12 (Harmony One) and arch 14
(Harmony 600 and 700), so reading it as that would have accepted a Harmony 600's configuration for a
Harmony One. Fifty comparisons over the corpus, none disagreeing, against four remotes whose values
concordance read independently, with a control of forty configuration and remote combinations of which
32 must refuse. **What it says about the first changing write is the useful half**: a configuration read
off a remote carries no header, so it states none of the six fields, and the gate has something to
compare only once a configuration we produced is being written.

**And the rails had a third bypass of one class**, section 224, found by performing job 2 of the write
review: the guard on the transport was right and the **permission** was public, a method on the very
object `openHarmony` hands back, so two lines erased firmware with writing disabled. Three fixes in a
row asserted a predicate over exported names and twice what reached the device was not an exported
name, so the assertion now enumerates the object's whole surface instead.

**And the layer that names a command is read**, section 220. A configuration addresses infrared codes
by number and says nowhere which one is volume up; the platform holds that separately, as a map of
named commands per device and per activity. Two things came out of it. The vendor's schema says a
device's map and an activity's map are the same shape differing only in what they hang off, which is
this project's own operating concept arriving by a route with nothing in common with the fifteen
configuration measurement that produced it. And the platform separates a **canonical** button
vocabulary, held independently of how a command reaches the device, from a device's own commands,
which exist only as an infrared code. That split held with no exception over the 1191 commands captured
from two test accounts on 30 August 2026, and the named half is published as vocabulary with its
sampling stated: those are working test accounts whose contents change, so the list is a floor rather
than the platform's.

**And what it can be asked is in there too**, section 219: 298 operations over 19 service interfaces,
each with its parameters and the type of its answer, which is what an importer is a sequence of. Three
sources describe that surface and none contains another, Logitech's two clients and the live service's
own listing, so the platform is bigger than any single count of it. The sharpest thing it bought is a
negative: exactly one operation can hand back the vendor's own infrared protocol definition, the thing
sections 159 to 171 measured the hard way, and that operation is **broken on the live service**,
reproducibly on two accounts, while two neighbours on the same address answer normally. So that avenue
is closed rather than unexplored.

**The vendor platform's own data model is in this repository**, section 218 and decision 14, which is
the first time this project has had the schema behind the bytes rather than names inferred from them.
1352 types, of which 470 are the service's contracts, with 366 references between them and 1291 enum
values. It is recovered from the client's **generated service proxy**, so the contracts in it are the
schema the server declared rather than a client's internal model, and it is checked against replies the
live service actually sent: on Account, Activity, Device and Remote every field in the schema appears in
a live reply, 21 of 21, 25 of 25 and 32 of 32 twice. The check also runs the other way and that is a
finding of its own, **the service is ahead of the client build**, returning ten fields on a device that
the proxy has never heard of, three of which name the delays `docs/predictions-sequence-delay.md`
predicted from a config. `docs/myharmony/model.md` is the reading and it is to be consulted before
naming a field. What crossed is schema only, asserted rather than assumed, so no reply, account or
identifier came with it.

**The screen's text reads back**, section 112, which is what the application needed before it could
show a config's activities: their names are drawn by a mode page's screen program and nothing else
names them. A glyph code is **not** a character and not an encoding: it indexes the config's own font
table and is assigned per config, in the order characters first appear in the generator's string list,
so two configs of one remote disagree about code 20. What is stable is the typeface, so a code is
resolved from its glyph's **pixels** against a hand read alphabet, seven of which cover the corpus.
170920<!--fact:text_read--> of 170922<!--fact:text_glyphs--> drawn glyphs come back; `make text`. The
seeds and the method for an eighth typeface are in `packages/codec/bin/alphabets.ts`.

**A code is one character and a character is one code**, section 124, and that rule is the check to
reach for before trusting a seed: it is the generator's own, since a code is a character's position in
the string list it walks. Three hand read labels were wrong and each showed up as a character sitting on
two codes at once, `9` read as `8` on arch 9, a lowercase `z` read as `Z` on arch 14, and an `I` read as
`l` on arch 12. Every one of them was drawn in a single word in its own container, which is why the
proof string each seed carries could not catch any of them, and every one was caught by a **second**
container of the same skin. The rule also resolves what no shape can, `I` against `l`, in place of a
fallback that assumed two configs of one skin number their codes alike. **Adding a gap filling source
labels a shape and not just a code**, so when two characters share a shape both codes have to be named
or the shape is claimed for one of them.

**Which key starts which activity is read**, section 120, and **which drawn name it carries is read on
all four architectures**, sections 121 and 125. The chain is four hops, because nothing in the format names
an activity: a mode page's tagged list binds a key to `0x7F`, that base slot 10 list carries `0x1F` with
operand `0xFF | set` selecting a base slot 9 entry, that entry's list writes `CurrentActivityState` with
`0x80 | n`. Eleven of eleven containers, four architectures. Every binding is a press, every activity is
reachable, and **all of an activity's keys are on one page**, which is what makes "the page that names
this activity" mean something. The structural closure is that an activity page's `0x7F` operands are a
contiguous ascending run of base slot 10 indices, 16 of 16 activity pages against 373 of 1152 pages
generally that are not.

**The idle value is base slot 13's `first`**, the field section 60 marked unconfirmed, and it is exactly
the value no binding writes. `one_config` is what makes that a finding rather than arithmetic: `first` is
7 where the highest is 8 and 8 **is** bound to a key. So section 86's "value 0 is no activity running"
was the wrong reason for a right count, corrected in section 120.

**The name comes from the modes the chain enters**, not from geometry: an activity's lists also carry
`0x7E`, and the mode they enter draws the activity's own name, so the page's string that relates to one
of those is its label. That is how three architectures do it: arch 8 22 of 22, arch 9 4 of 4, arch 14 13
of 13, and with arch 12's own route below, **50<!--fact:activities_named--> of
50<!--fact:activities_total--> activities**, `make activities`. Four rules make it a function and each was found by having it fail: an exact match beats a
contained one, a per mode chrome test, one label to one activity, and a second pass for a label the menu
wrapped onto another row. **The exact match rule is the one to remember**, section 124: an activity's
chain enters the mode that lists the devices, so every activity says every device's name, and reading
containment as sufficient let one label be claimed by all four activities of a Harmony 880 and then
dropped from all four as chrome. The number was 23 of 35 for a day, and three of those 23 were fragments
of a wrapped label, two of them belonging to a different activity than the one they were reported for.

**Arch 12 does not use any of that, and it is the better route**, section 125. No string rule can work on
a touch panel: `one_config`'s three activity pages bind scans {50,51,52}, {50,48,49} and {48,49} while all
three draw labels on the same rows, so no fixed code to row map can exist. What a One needs is base slot
17's hit map, and the missing link was **`ModePage.lead`**, the arch 12 only byte section 66 read and
nobody explained: it is a zero based index into that map, so the rectangle a key covers is **stated** and
the label is the text the firmware's own hit test puts inside it. 11 of 11, and it runs before the string
matching, because a stated answer beats an inferred one. The closure is a demand the container makes on
itself, that a page only binds codes its own hit page offers, 268 of 268 and 104 of 104 where every shift
breaks 54 to 227. `packages/codec/src/touch.ts` also carries the **panel to pixel transform**, whose y
half is arithmetic (872 panel units and 54 pixels are one row measured twice) and whose **x half rests on
one reading** and is marked as such, though no name depends on it. Under it the panel is three blocks at
pixel rows 33, 87 and 141, one or two across and never three, plus a bar from 191 to 253 that runs off a
220 pixel display: which is exactly the unprompted description of the remote itself, two touch points below the
screen and a key at each side, so 48 to 53 are the blocks, 43 and 44 the points and 46 and 47 the keys.
**Which code lands where is per page**, in the order the rectangles are stored, so section 121's proof
holds for the codes too.

**Every key a screen labels now carries that label**, section 128, which is what turns the button table
from `group 3 #29` into a word. Two populations first: a scan bound by a **mode page** is a key the screen
speaks for and a scan bound by a **base slot 9 set** is a key on the keypad, and the two are **disjoint**,
sharing no code at all on arch 9 (Harmony 525), arch 12 (Harmony One) and arch 14 (Harmony 600 and 700)
and exactly one on arch 8 (Harmony 880). Then the place: on a One base slot 17 states the rectangle, so the
label is the text inside it, attributed to the **nearest** region rather than the firmware's own first
match, which is right for a touch and wrong for a label since a long right hand string starts inside the
left hand rectangle. Elsewhere the keys are two columns beside the screen and the rows are **measured**
from where the activities section 121 names without geometry are drawn: four rows on arch 8, two on arch 9
and two on arch 14, with the left of each pair settled per architecture and not assumed. 98.9% of 6989
screen key bindings, and 3100 of the 3106 that send a code.

**The rule that suggested itself fits the counts and is wrong**, and it is the lesson of the section: the
k-th key in ascending scan order taking the k-th row of text pairs four keys with four rows on the 600's
own activity menu and gets two of them wrong, because two keys share a row and the outer rows are chrome.
A key belongs to a **place**. Two closures hold the reading up, one of which reads no text at all: every
two item row in the corpus has its two keys on **different** action lists, with no exception, and the
labels agree with the activity chain on 62 of 63 keys, the exception being a "1 OF 2" page indicator drawn
in the bottom row's continuation slot and left in rather than special cased.

**A config's screens can be drawn now**, section 129, and the bench shows one beside the keys it
binds, made out of the bytes per request. That is the shape FreeHarmony needs, since an editor has to
show what a screen will look like after a change and must not carry a second implementation to do it.
It is `packages/codec/src/render.ts` and `make render`, with the PNG encoding in `src/png.ts` because
the bench serves the same rasters over HTTP and two encoders would be two things to keep right.
It is here rather than in FreeHarmony because it is also the check that fails differently from every other
test in this repository: a reader test says a number came back and cannot see a label half a row out, an
icon over its own caption or a colour channel one bit wrong. **Every mode page of every container
renders with nothing unresolved**, over 1500 pages on four architectures, which needs a picture's
extent, a glyph's encoding, a font set's first code, a referenced string's address and a page's program
pointer all to be right at once. **And that claim was hollow for a month**, section 148: it counts
pictures the renderer looked for and could not decode, so an instruction the renderer never looks at
contributes nothing to it. The renderer knew screen opcode 2 and not opcode 3, and on arch 9 (Harmony
525) every picture is an opcode 3, so a rendered Harmony 525 page drew its text and left 4549 of 6144
pixels untouched while the check reported nothing missing. Same defect as section 103's catch-all
owner: a claim whose falsifier is outside its own population. The test that can fail counts the naming
instructions by walking the programs and compares that with the renderer's own tally, **per
architecture**, because the whole shape of the mistake was one architecture at zero while a total
looked healthy. Three things it needed that no reader did: the display size, which the
configs state through their own full screen pictures, **both picture opcodes saying it and agreeing
exactly on nine containers**, which is what took arch 9 (Harmony 525) from having no witness for its
96 by 64 to having the only one; the pen advance, which is **nothing** because the
gap between letters is a column the glyph carries; and the pixel byte order, where the first reading was
wrong. **A pixel is big endian RGB565**, the only field here that is not little endian, because it is
stored the way a display controller is fed rather than the way the container is written. Little endian
drew a Harmony One's buttons as rainbow stripes, and the test that pins it says out loud that **most
pictures cannot tell the two apart**, since a black and white picture reads the same either way.

**A page is a set of screens, not one**, and `renderVariants` walks the arms: a screen program switches
on a state variable, so each appearance carries the condition that selects it, named through base slot 0
where the variable has a name. The bench offers them as buttons. **What that immediately produced is
section 130**, because it made the question "which variable is this" unavoidable: **base slot 13's first
seven records are the firmware's clock**, `first` being the value a variable holds when the config is
generated, and all seven equal the corresponding field of base slot 3's build timestamp in all 21
containers. Section 74 had read three of them as a date from the action list language alone, and the
weekday's zero is base slot 3's own epoch, a Saturday. That also generalises section 120's idle value:
it is the generated value, and for `CurrentActivityState` the two coincide because nothing is running
when a config is compiled.

**Two thirds of a config's drawn text had never been read**, section 121, which is what fell out on the
way. Screen opcode 4 draws the glyph string at a `u24`, and in 12052 of 12052 instances that address is
the payload of an opcode 5 instruction in **another** program, so a string is stored once inline and
referenced everywhere else. `make text` went from 65456 glyphs to 146846 on the day, and stands at
170922<!--fact:text_glyphs--> now that two more configs are in its population, with every sample still
reading at 100.0%. Nobody had followed the pointer because the byte accounting never
complained: the bytes were already claimed by the program holding them, and a comment in `screen.ts`
said opcode 2 was the only instruction naming a place outside its own program. **A shared string is a
writer rail**: editing one in place changes every draw that names it.

Step 8, the contribution probe, exists. **Step 6's action list language is read**, section 73:
both dispatchers, every branch, to the `RETURN`. All twenty base slots were already labelled, so
what is left of step 6 is small and it is measured rather than estimated.

**The number now carries a depth, and that distinction is the point.** Knowing which routine an
opcode reaches is not knowing what it means for a config, and counting the first as the second
reported 100% for a language a tenth of which nobody can name. `packages/codec/src/actions.ts` is
the table, `reading` gives one instruction's, `readingCoverage` gives a config's:

| | share of 86947<!--fact:action_instructions--> instructions |
|---|---|
| meaning | 98.6%<!--fact:reading_meaning--> |
| placement only | 1.4%<!--fact:reading_placement--> |
| no reading at all | 0<!--fact:reading_unread--> instructions, nothing left anywhere in the corpus |

**The population is 58<!--fact:reading_arguments--> smaller than it was, and that is a correction**,
section 139: `0x3F` with a high byte in `0xD0` to `0xDF` is a **six byte** instruction and the slot after
it is its argument, which the table had been resolving as an instruction of its own at depth `meaning`
every time. Section 73 wrote that consequence down and nothing acted on it for a month. `takesFollowingSlot`
is the predicate; `Container.actionList` still returns the slot, because the emitter reproduces it.

Against 24.5% with no reading before sections 70 to 74. Per architecture: 98.6%<!--fact:reading_arch14-->
on arch 14, 98.8%<!--fact:reading_arch12--> on arch 12, 98.6%<!--fact:reading_arch8--> on arch 8 and
95.9%<!--fact:reading_arch9--> on arch 9. **Every figure here is recomputed**, `make reading`, and
that is new: the table used to quote 97537 instructions and 97.9% and nothing checked either, so when
section 103 moved the number for the first time it turned out that no sample list reproduces 97537 at
all. The population is defined in `packages/codec/bin/reading.ts` and nowhere else now.

**The unread column is empty and the state is unreachable**, sections 107 and 108: `0x6E` was the
last opcode in it, six instructions, and it is a modulo, and section 108 read the last three opcodes
that had a handler and no reading, `0x65`, `0x66` and `0x76`. **An action list can make a remote write
to its own external flash**, which is what those first two do, and the region they write to is one the
firmware allocates itself rather than the one base slot 2 declares. What is left is all placement and mostly one thing, `0x3F` band `0xC0` on arch 12, and
it is hardware state rather than config structure. Section 102 read it and it stayed placement;
**section 103 read the state machine behind selector 17 and it did not**, which is 68 of the band's
106 uses per config. The band is three
fields, `{ bit 0; bits 1 to 3; bits 4 to 8 }`, and three mechanisms: selector 17 sets the display's
light level, from four levels, three thresholds and a fade rate that base slot 15 states; selector 16
enables an I2C device at address 0x60 through `LATC` bit 5; and 0 to 12 set that device's thirteen
channels from a two bit table in base slot 15's twelve spare bytes. **Which device it is is not
established**, section 106, and the firmware never switches it on: only a config does. Two closures: the corpus uses **exactly** the fifteen
selector values the handler accepts out of thirty two, and the light level is an index into the 27
distinct `CVREF` voltages the part can produce, a table derivable from the datasheet. **Do not expect
what is left to move by comparing configs**: the band's uses are identical in both One configs despite
one having five devices and eight activities and the other one and one.

**The two biggest items turned out to be things the remote does, not things a config describes.**
`0x75` is the **beeper**, four tones from 461 Hz to 4.7 kHz, gated by `0x3F` high byte `0xF3`; and
`0x07` high byte `0xF8` **steps a date** held in state variables 3, 5 and 6, which are therefore
firmware defined and must not be reused. Sections 73 and 74.

**Read a dispatcher, not one handler at a time**, and **count who uses an opcode before choosing
which firmware to open**. The second rule is new and it cost three misreadings in one section:
`0x73` and two `0x3F` bands were all read on arch 14 and all used only elsewhere. One query says
which image to open.

Above `0x65` the opcode is the instruction and the binary search at `0x0EC8E` names a handler for
each; `0x80 | n` is one instruction with a seven bit field, a write into state variable `n`. **Below
`0x65` the operand carries the rest of the opcode**, in bands: `0x1F` is a register machine, `0x07`
thirteen operations with no argument, `0x0F` peripherals and diagnostics, `0x3F` four bands one of
which is a six byte instruction. **`0x3F`'s bands are the only structure in the format that is not<!--superseded-->
one table across architectures**, so they must not be ported. Nor may `0x0F`'s, section 139.

**Below `0x65` the dispatcher tests ranges rather than those four values**, section 108, so `0x20`
behaves exactly like `0x1F`; the corpus only ever emits the canonical four, which is why reading it as
four exact cases never showed up in a number. **Three structures are not one table**, sections 107 and
139: `0x3F`'s bands, the whole opcode block `0x65` to `0x6E`, which only arch 14 implements, and
`0x0F`'s bands, whose table was read from arch 12 (Harmony One) and arch 14 (Harmony 600 and 700) and
answered for arch 9 (Harmony 525) too, calling a call a no-op twelve times per config. Arch 9 and arch 12 test each of those ten opcodes in
the same ladder and branch to the dispatcher's exit, and their configs never emit one. So the shift,
the boolean operations, the device record writer and the **modulo** are arch 14's alone, while the
multiply and divide just above them, `0x78` and `0x77`, are everyone's. `0x6F` belongs to nobody: it
tests the accumulator and returns from both arms, on all three architectures we hold firmware for.

The byte accounting has **no architecture sized remainder left**. It used to name two: 5437 bytes<!--superseded-->
in the arch 12 safe mode container, which was one font set the reader had cut to a single glyph,
section 78; and 25819 on arch 9, which was infrared class 5 and is section 82. Section 83 then took
the six shapes that were left in every container down to three: base slot 0's frame is `length + 2`
because the terminator sits outside the field, an empty counted array is still an array, and the 4
or 34 bytes above base slot 7's table are **base slot 8's leading action list**, which also turned
up that every mode page's list is inside base slot 8's section. Section 84 read the last three and
two more: a screen program carries a `SCREEN_END` even where a jump means nothing reaches it, which
was the whole arch 8 family of 49 to 64 single zero bytes; base slot 3's section is three bytes
longer than the clock record and base slot 17's is two where it names the picture bank; the key
table's extent is its mode record's, and an empty record is the **wide** form; and twelve arch 12
bytes belong to base slot 15 and to no group, by position rather than by reading. **Those twelve are
read now**, section 103: group 9 continuing past the six entries its header declares, four bytes as
one more pair of device levels and eight as a table of two bit fields, with no remainder. **And they
are claimed by reading now too**, which took a year longer than reading them: the accounting kept a
`slot-15-spare` owner filling whatever was unclaimed between the lowest group and the pointer array,
so zeroing any group's entry count let the catch-all absorb what the group stopped claiming and the
report still said 100.00% with no gap and no overlap, over 32 bytes on a Harmony One and 28 on a
Harmony 600 and a Harmony 880. A claim made because a run was left over cannot fail, which is the
same defect as an unfalsifiable test and it sat inside the number that measures M2.

**Every user config is accounted for to the byte**, sections 66, 67, 75, 82, 83 and 84, with zero
overlaps in all nineteen containers. Not 100.0% to one decimal, which it reached a section earlier:
nothing unattributed at all, in eighteen of the nineteen containers. The last
structure was a pool of tagged lists packed end to end, one per mode page plus one per base slot 9
set, bounded below by a mode entry's end and above by the lowest address another reader names.
That completes the first two of milestone M2's three parts on every architecture. **The exception is
`h525_safemode_ahcm`**, the arch 9 safe mode container, at 98.2% after section 85, which corrected
two arch 9 readers that every other container agreed with: opcode 22 takes **one** operand and not
eleven, so the picture belongs to the opcode 3 after it, and a monochrome picture row is padded to a
whole byte. Both were invisible until a container turned up with an odd width and four instructions
in an order the corpus had never carried. Its last 283 bytes are four runs nothing points at, named
in section 85 and deliberately unclaimed.

**The third part exists and round trips**, `packages/codec/src/emit.ts`, `make emit`. `rebuilds` is
the mirror of `claims`, owner name for owner name, and **every owner the accounting claims is
rebuilt**; the bytes come back identical on all nineteen containers and **the residue copy writes
nothing at all** on eighteen of them, since every byte is now written by a rebuilder. It builds into
a buffer
filled with `0xA5` rather than into a copy of its input,
because **an emitter that starts from a copy passes a round trip test while writing nothing at
all**, so the tests that carry weight are the negatives.

**The number has a depth, the same way `actions.ts` does.** `framed` bytes come from typed fields,
5.5% to 38.3% depending on the sample; `carried` bytes came out of a reader as an opaque run, and
that is nearly all of a config, because **a glyph and an encoded picture cannot be re-encoded from
their pixels**: the encoder chose where to skip and where to emit literals and several encodings
draw the same image. **Do not treat moving those bytes as the obvious next job**: what a picture
means is already read, so framing the body would move the number 60 to 80 points without anything
becoming clearer. What it would buy is the ability to **change** an image rather than reproduce
one, which is a product question. `docs/roadmap.md`, milestone M2.

**Base slot 0 is read**, section 77, and it was the emitter that found it worth reading: it was the
one section whose bytes the accounting counted while nothing inside it had ever been named, because
its `0xFEED` frame states its own length. It is a list of `0xA7` framed nodes, `u8 tag; u16 4 +
len(name); u16 level; u16 index; char name[]`, and **level 1 names base slot 13's state variables,
entry by entry**. What opened it was the arch 9 safe mode container, whose first node is not called
`Root`: `FRAME_PROLOGUE` was never a prologue, it was the first node, and two of its nine bytes were
that node's own length.

**Every device in the corpus has its name, section 126**, 63<!--fact:devices_named--> of
63<!--fact:devices_total--> in 15<!--fact:user_configs--> user configs, and the route is ASCII rather than pixels. Base slot 0
names no devices: a device's label is a **prefix** of a state variable's name, `<label>_<property>_<values>`,
where a name belonging to the config has a **number** in the property's place instead, which is the
discriminator. What ties a label to an infrared group is base slot 13: the variable's transitions carry
one action list instruction, and for a `Power` or `Input` variable that list is the one that sends the
code, so `0x7D`'s own operand names the device. 102 variables reach exactly one group and **none reaches
two**. Behind that, elimination for 5 and a mode's drawn title for 3, in that order because the title is
the label on arch 9 and arch 14 and a command name on arch 8 and arch 12. Two closures: the ASCII label
is also **drawn**, 53 of 55 exactly, which is two readers with no shared code agreeing; and on arch 9 and
14 shifting the pairing to the next group breaks 16 of 16. `make devices`, and the column to watch is the
source rather than the total.

**The shared walk from a list to the groups it sends to must not be memoised**, section 126, and only
arch 14 could show it: a nested walk stops at whatever the outer one had visited, so caching it lets a
list inherit a truncated answer. Arch 8, 9 and 12 carry `0x7D` directly and passed; arch 14 emits
`{0x7F, 0x7D, 0x7C}` with the send one list down, and every arch 14 device lost its name at once, 63 to
47.

**And `0x7D` answers two more questions the application asks**, section 126: **what a button sends**,
3106 bindings across the corpus and **every one of them a press**, 85 of those macros of several codes in
an order that matters; and **which devices an activity drives**, the groups its base slot 9 set
addresses, one to three per activity. `inventory` composes devices, activities, the build timestamp and
the idle value into one object, which exists so that FreeHarmony does not assemble it and become the
second copy.

**A config states its devices and its activities, section 86, which is what the application needs
before it can show anything.** A level 1 name is `<label>_<qualifier>_<values>` and `values` is its
variable's highest value plus one, 250 of 250, which settles the field section 60 could not explain.
Every container with a name tree names exactly one `CurrentActivityState`, whose highest value is
the **number of activities**, and **a device is an infrared group**. The calibration is section 58's
deliberate pair: a config Logitech compiled for one device and one activity reports one and one, and
the arch 9 safe mode container reports zero activities. The record's eight byte values are
transitions, `u8 zero; i16 from; i16 to; { u16 operand; u8 opcode }`, and the instruction is an
action list one. `packages/codec/src/inventory.ts` is the application's view of it.

**The names are the user's own equipment, so no brand out of a contributor's config is quoted**, in
a document or in a test: counts and shapes. The generic role words the generator emits are structure
and appear freely, and the one brand in the repository is from our own sync, section 58.

**What the pool holds is settled too**, section 69: each non slot 9 list is a second copy of one
mode page's own list, the k-th copy belonging to the k-th page in mode table order, identical in
meaning except that opcode `0x7F`'s operand names a different base slot 10 entry holding an
identical action list. Nothing reads a copy, and an emitter must still reproduce it. Section 68 got
this wrong twice by pairing the runs by address rather than by mode table order and by comparing
them byte for byte.

**Arch 8 closed on 8 August 2026 and needed no firmware to do it**, section 75. Its whole
remainder came from one byte: an infrared record header is `12 + 9 * count` with the count at
`+0x0B`, not the flat 21 bytes section 61 read, and 37 records of that contributor's four configs
carry a second pointer group. That one number explained three separate gap families at once, 37 short
headers, 37 unclaimed blocks and the 37 gaps between them, and none of the counts moves when the
config grows from 234 records to 462.

**What that second group holds is read now, and the 37 was never a property of arch 8**, section 134.
It is the same code with **one biphase bit cell inverted**, a mark and a space of equal duration
exchanged at a fixed offset, in every block pair of every one of the 37; the records read as RC6 mode 6
at 36200 Hz, they all sit in **one device group**, and the two arch 8 configs contributed later have
**zero**. So the count follows the equipment. Two things to carry from it. The test asserting the
count was called `every arch 8 config has exactly 37 two group records`<!--superseded--> and its body
looped over four configs of one contributor, so **its title was false while it passed**, which is
section 75's own falsifier met and unnoticed. And it was found by a decoder **declining** to read
those records rather than by looking for it, which is the second time a rule survived because the
corpus agreed with itself.

**Read the whole gap list before choosing a target**, and this is the second finding it produced:
`make coverage --detail` used to print only the largest few of 128, and both this and section 66
came from asking for all of them and noticing families with the same count. **It prints the
families now**, length times count sorted by total bytes, computed over every gap rather than the
listed ones, so the next one of these does not need the hand count.

**Arch 9's class 5 infrared is read**, section 82, out of the 525's own firmware: `h525_code` is its
whole internal program flash, loading at `0x0000` with the application from `0x1000`, and its SPI
primitive at `0x07F8E` is arch 9's single config read choke point, the analogue of arch 14's
`0x1B9AC`. Class 5 turned out to be **class 1 with a dictionary**: a header pointer names a body of
one byte indices, the body names a symbol table, and the table names short pulse blocks that every
code with that pulse pair reuses. One body expands to a textbook NEC frame, repeat header included,
which is the closure. Every field width is a literal in the firmware that reads it.

**Disassemble it with `--part 4550`.** The 525 is a PIC18F4550 and the default register map is the
67J50 family's: 65 of 139 addresses disagree, the whole CCP block moves, and the infrared carrier
setup reads as a duty cycle write instead of a PWM mode write. The wrong map produces a listing
that is readable and wrong, which is the failure this project has recorded twice before.

**Its safe mode config was the next piece of work and it was bigger than it looked.** Found at
flash `0x818000`, it parses, its checksum recomputes, and it contradicted six claims the corpus
asserts. **All six are re-derived and not one of them was a fix**, sections 77 to 79. Four became
findings: base slot 0 is a list of named nodes, and a font set's second header byte is the **first
glyph code** with the count not keyed on the architecture, which took the arch 12 safe mode
container from 39.1% attributed to 99.6%. Two dissolved on measurement: base slot 1's extent is the
gap to the next pointer like every section's, and the log area's range obeys every rule section 47
states once it is not measured against a chip size taken from the same field.

**It is in the corpus now**, `h525_safemode_ahcm`, and in the corpus wide claim lists rather than
excluded from them, where it is the counterexample two of them name: its font sets start at code 32
and declare four counts. **Excluding it would have left the corpus agreeing with itself**, which is
the condition that hid the first glyph code, and section 85 is the same lesson twice more: it holds
the only picture whose width is not a multiple of eight and the only opcode 22 that is not followed
by an opcode 3, and each of those broke a rule every other container had confirmed. Three arch 12 assumptions came out of `packages/usb`
on the way: the version reply was matched as a whole byte, its length was fixed at twelve, and the
region validator was hard coded. `docs/memory-map-525.md` holds the predictions against the
measurements.
