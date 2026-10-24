# Where the work stands

The current state of the reverse engineering: what reads, what is measured, what the corpus holds.
A snapshot, dated by its commit, and it is the document [README.md](../README.md) points a reader at
who wants more than the front page.

**This is not the plan.** [../todo.md](../todo.md) is the plan of record: the decisions, the
milestones and the sequence, and what gets answered next and why that one. **Nor is it a summary of
what is known**: that is [the reference](../reference/README.md), where every conclusion carries a
footnote naming the archive section that argues it, and [findings.md](findings.md) is the archive of
those arguments. This page says where the work stands today, and where a number appears here it
carries a `fact:` marker that `make facts` recomputes from the corpus.

*Until plan 009's step 5.1 this page also carried about 1900 lines of summaries of findings: a status
narrative, headline findings and a rolling account of the newest sections. Step 5.1 checked every one of
the archive's 436 sections against the reference, added what was missing there, and then removed those
summaries, so a claim now has one home.*

## What reads

The units on the bench are listed in [test-notes/README.md](test-notes/README.md), and which models share
an architecture in [the architectures](../reference/architectures/README.md).

**The container** is one format across the architectures, and everything in the lab that parses is
48<!--fact:parseable_containers--> containers over six architectures, [the container](../reference/config-format/container.md).

**The two languages and the text.** Every one of 67303<!--fact:inline_string_codes--> inline string codes
in the corpus resolves to a glyph of the font its own program selected, 22846<!--fact:screen_programs-->
screen programs across 19<!--fact:containers--> containers decode with nothing left over, and
170920<!--fact:text_read--> of 170922<!--fact:text_glyphs--> drawn glyphs read back as characters,
[screens](../reference/config-format/screens.md).

**What a configuration is for.** Every activity in the corpus has its name, 50<!--fact:activities_named-->
of 50<!--fact:activities_total-->, and every device, 63<!--fact:devices_named--> of
63<!--fact:devices_total--> across 15<!--fact:user_configs--> user configurations,
[activities and devices](../reference/config-format/activities-and-devices.md).

**Infrared.** The rhythm table holds 681<!--fact:protocol_entries--> entries over
681<!--fact:protocol_families--> distinct families, 37<!--fact:protocol_measured--> measured and
644<!--fact:protocol_stated--> converted from Logitech's own definitions, and 33<!--fact:protocol_tails_stated-->
of the stated rows carry a whole block, [families](../reference/infrared/families.md).

**The action list language**, by the depth of what is known about each instruction, recomputed by
`make reading` over the population `packages/codec/bin/reading.ts` defines:

| | share of 86947<!--fact:action_instructions--> instructions |
|---|---|
| meaning | 98.6%<!--fact:reading_meaning--> |
| placement only | 1.4%<!--fact:reading_placement--> |
| no reading at all | 0<!--fact:reading_unread--> instructions, nothing left anywhere in the corpus |

Per architecture: 98.6%<!--fact:reading_arch14--> on arch 14, 98.8%<!--fact:reading_arch12--> on arch 12,
98.6%<!--fact:reading_arch8--> on arch 8 and 95.9%<!--fact:reading_arch9--> on arch 9. The population leaves
out 58<!--fact:reading_arguments--> slots that are the arguments of six byte instructions rather than
instructions of their own. What the instructions are is [actions](../reference/config-format/actions.md).

### Byte accounting

*The table below replaced a five row summary of itself on 6 September 2026. That summary lived here
while the full history lived in the roadmap that was retired that day, and it was a strict subset:
the same measurement
with two samples missing and every intermediate column dropped. Two copies of one measurement in two
documents is what the retirement of that document was for, so the full one moved here and the summary
went. `tests/test_documents.py` holds this table's shape.*

**The fraction of a configuration attributed to a structure the codec understands**, with any two
structures claiming the same byte reported as the defect it is. `packages/codec/src/coverage.ts` answers it
and `make coverage` prints it. Each column is named by the archive section that moved it:

| sample | at the start | readers ported | mode records, 53 | opcode 23, 54 | the bank, 55 | infrared, 61 | arch 9, 63 to 65 | pages, 66 | slot 9, 67 | the pool, 67 | header groups, 75 | class 5, 82 | the residue, 83 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Harmony 700 | 11.4% | 26.3% | 59.3% | 87.8% | 91.9% | 98.1% | 98.1% | 99.5% | 99.6% | 100.0% | 100.0% | 100.0% | **100.0%<!--fact:coverage_h700_config-->** |
| Harmony 600 | 9.5% | 24.8% | 57.5% | 86.4% | 87.4% | 98.7% | 98.7% | 99.6% | 99.7% | 100.0% | 100.0% | 100.0% | **100.0%<!--fact:coverage_h600_config-->** |
| Harmony One | 3.2% | 8.0% | 8.6% | 47.9% | 90.0% | 98.0% | 98.0% | 99.6% | 99.8% | 100.0% | 100.0% | 100.0% | **100.0%<!--fact:coverage_one_config-->** |
| Harmony One, spare | 3.2% | 7.5% | 7.9% | 54.5% | 97.0% | 98.6% | 98.6% | 99.8% | 99.8% | 100.0% | 100.0% | 100.0% | **100.0%<!--fact:coverage_one_config_unprogrammed-->** |
| 880, arch 8 | 3.6% | 16.4% | 50.6% | 80.2% | 82.2% | 94.4% | 94.4% | 97.0% | 97.2% | 97.7% | 100.0% | 100.0% | **100.0%<!--fact:coverage_arch8_config_a-->** |
| Harmony 525, arch 9 | 7.2% | 10.4% | 14.1% | 14.1% | 14.1% | 14.6% | 55.1% | 64.1% | 65.1% | 66.4% | 67.1% | 99.9% | **100.0%<!--fact:coverage_h525_config-->** |
| the three safe mode containers | 4.2% | 70.2% | 89.5% | 89.5% | 89.5% | 91.8% | 91.8% | 98.2% | 98.4% | 99.4% | 99.4% | 99.4% | **100.0%<!--fact:coverage_h700_gspm-->** |

**Only the last column carries a `fact:` marker**, and that is the rule rather than an accident: a
historical column is a fixed number and the live one is recomputed from the corpus. Putting a marker
on a history column makes `make facts-write` rewrite the past, which is exactly what happened to
this table for one commit.

**No container in this table has an unaccounted byte left**, and zero bytes are claimed twice: on
eighteen of the nineteen containers every byte belongs to a known structure,
[the configuration format](../reference/config-format/README.md), and the emitter rebuilds every owner the
accounting claims.

## Coverage, and why it is a problem

Everything here is derived from two remotes on a bench and a handful of files. Logitech shipped
rather more than that.

| | count |
|---|---|
| models listed on the harmony-remote-forum comparison page | 42 |
| named models in concordance's skin table | 71, in 120 table positions |
| architectures concordance knows models for | 11 (arch 2, 3, 7, 8, 9, 10, 12, 14, 15, 16, 17) |
| architectures with hardware on this bench | **3** (arch 9, arch 12 and arch 14) |
| architectures with sample files only | **2** (arch 8 and arch 10) |
| architectures with firmware in the lab | **4** (arch 8, 9, 12 and 14) |

So the container claims are validated across **five** architectures and the USB claims across
**three**, out of at least eleven. One boundary is visible without owning anything: the 900, 1000 and
1100 are arch 15 and enumerate as a network class rather than plain HID, so the transport here cannot
reach them at all, never mind parse them.

There is a sharper version of the same point. Logitech's own discontinuation notice of 28 May 2025
names forty models whose accounts it closed, and **not one of them is arch 12 or arch 14**; they
are the older EasyZapper platform, spanning at least six architectures, while the bench holds two
remotes from the platform that came after. [The product line](../reference/logitech/product-line.md) has the
list and [the architectures](../reference/architectures/README.md) the mapping.

That gap is what step 8 exists for, and **as of 12 August 2026 it is not what the project spends its
time on**: decision 10 below puts the application first and stops soliciting dumps. The gap is real, the
table above stays honest about it, and closing it is not the next job.

*Moved out of `docs/plans/002-the-roadmap.md` on 6 September 2026 when that document was retired. It is a
measurement of where the reading stands, which is this document's job, and `tests/test_documents.py`
holds the table's shape.*

## What the corpus holds

23<!--fact:corpus_dumps--> dumps from 9<!--fact:corpus_contributors--> contributors, carrying
44<!--fact:corpus_configs--> configs across 5<!--fact:corpus_architectures--> architectures, plus the
firmware images and bootloaders the table lists per architecture. `make corpus` inventories it and, importantly, reports which
dumps nobody has described: a dump whose contributor has moved on is far harder to label later than one
described on arrival.

| arch | models | dumps | configs | firmware held | what would help most |
|---|---|---|---|---|---|
| 2 | 745 | 0 | 0 | none | anything at all |
| 3 | 748, 768 | 0 | 0 | none | anything at all |
| 7 | 610, 620, 628, 659, 670, 676, 680, 688 | 0 | 0 | none | anything at all: eight models and no sample |
| 8 | 880, 885, 880 Pro, 720, 785 | 6<!--fact:corpus_arch8_dumps--> | 16<!--fact:corpus_arch8_configs--> | 880, 885 and 720, application and bootloader; the 880 Pro's is the 880's build with its own skin | a 785, which no sample here covers |
| 9 | 510, 515, 520, 525, 550, 555 | 3<!--fact:corpus_arch9_dumps--> | 3<!--fact:corpus_arch9_configs--> | 525, 515 and 555, application and safe mode, three different builds | a 510, 520 or 550 |
| 10 | 890, 895, 890 Pro | 2<!--fact:corpus_arch10_dumps--> | 12<!--fact:corpus_arch10_configs--> | **none** | **firmware**, which is the single hardest blocker here |
| 12 | One | 2<!--fact:corpus_arch12_dumps--> | 2<!--fact:corpus_arch12_configs--> | One 3.4, plus safe mode and both internal pages | nothing: this one is covered |
| 14 | 600, 650, 665, 700 | 6<!--fact:corpus_arch14_dumps--> | 7<!--fact:corpus_arch14_configs--> | 600, 650 and 700 | a 665 config |
| 15 | 900, 1000, 1000i, 1100, 1100i | 0 | 0 | none | out of reach by construction: a network class device, not HID, so this library cannot address one. One contributed 900 configuration sits in the lab, a file system of XML and settings files that `make corpus` does not count |

**Arch 10 is read from configurations alone**: what reads there, the slot mapping and the read defect
that makes a contributed Harmony 890 configuration need its checksum verified before it is believed are
[the Harmony 890 and 895](../reference/architectures/harmony-890-895/README.md).

**Arch 8 is a control rather than a target.** Eleven configs and two application images arrived on 10
August 2026 and what they bought was a counterexample supply: they broke the skin rule, they gave
`GET_VERSION` field 6 its fourth value, and they showed that "whatever parses as a container" is not a
corpus. Reach for them when a claim holds on every architecture, because a claim nothing can contradict
is this project's recorded failure mode.

## Where the work stands

*Moved out of `CLAUDE.md` on 29 August 2026, where it was a second copy of this document's own subject.*

`todo.md` is the plan of record and tracks its own progress. Steps 1, 2, 4 and 5 are done,
and step 3 is done as far as the firmware can take it. **This section is a status board, not a
summary of what is known**: that is [the reference](../reference/README.md), and the arguments are
`docs/findings.md`'s 436<!--fact:findings_sections--> sections. Section numbers below are the pointer into them.

**The read path works, and flash has been written on five units**, the first in section 222:
one 64 KiB block of the spare Harmony One's own configuration, erased and put back unchanged on 30
August 2026, verified over the block and over the whole configuration. This said "one write has been
performed" long after it stopped being true; the spare Harmony One, the Harmony 525 and the Harmony 650
have all been written since, and a Harmony 700 was sent one reinstall request, section 295, which
writes no flash from the host, and then had Logitech's 2.8 image staged into its external flash and
installed by its own safe mode image, section 297, which is the one write outside a configuration
region, decision 18, and then had one configuration block written back unchanged, section 300, and its Denon's power on delay
raised and put back, section 301, the change heard by an infrared receiver both ways; and the Harmony
600 had one configuration block written back unchanged after a full backup, section 302, and its KPN box's power on
delay raised and put back, section 303, which landed and was overridden by a delay saved on the remote. `GET_VERSION`, `READ_MISC`
and `READ_FLASH` run from our own host code on both bench architectures, a config read matches each
unit's lab dump byte for byte, and the four remotes this library could open when this sentence was written are fully read and verified
against their backups: user config, application firmware, safe mode, and the internal pages where the architecture
serves them, no differences. What is
verified is that each backup is faithful; **restoring from one has never been tried.**

## What is still open

*Moved out of `CLAUDE.md` on 29 August 2026. The entries answered since left in plan 009's step 5.1,
their conclusions being in the reference. Read when a session needs them rather than carried into
every one.*

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
* **Which I2C device sits at address 0x60 on the Harmony One**, section 106. Thirteen channels of
  three states, two eight bit level registers, an enable on `LATC` bit 5 and no readback, which is the
  shape of an LED driver and most plausibly the keypad backlight, dimmed by the same band that dims
  the screen. **Not confirmed and deliberately not named.** A datasheet search on the address and the
  register numbers, or a photograph of the board, settles it; firmware cannot.
* **Three of the four infrared encoding classes**, used by no config in the corpus, so a firmware
  problem rather than a decoding one, section 42. **Why they are unused is settled**: Logitech's own
  user manuals say the learned signal was uploaded to their web site, which did the pattern matching
  and chose the storage form, so the class was a server decision and the unused ones are the ones
  that service never emitted for these devices. A miss was "stored as-is in its original format",
  which predicts a raw class. That matters for FreeHarmony: the service that made the choice is the
  discontinued one, so learning a code without it means making that choice locally.
* **The physical button map**, meaning the matrix keypad. **The Harmony One's touch panel is mapped**,
  section 125, and out of the config rather than the hardware: base slot 17's rectangles, the mode page
  byte saying which page is in force, and a transform onto the display. That leaves the 40 keys around
  the panel, and every other model; this said 44 until 9 October 2026, the drawing's count, which
  includes the panel's four touch areas. Measured as far as USB allows and no further, section 48: a
  remote on USB never runs its **keypad handler**, because USB mode's own loop does not scan the matrix. It does
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
  hardware, so no host ever held the map. `reference/logitech/service.md`.
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
  button. 32 buttons of a Harmony One and 36 of a Harmony 600, the drawings' keys pages, with nothing
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

### The configuration format's open questions

1. ~~What are the 19, 20 or 21 section slots?~~ **Answered.** All twenty base slots are accounted
   for: two header records, sixteen named sections, and 18 and 19 NULL in all 21 containers.
   Section 47 closed the last one. What is open is now one level down, inside the sections, and
   each entry above says which part of itself is not established.
2. Three of the four IR encoding classes. The dispatcher routes four selectors and only one is
   traced. **Corrected here:** this entry used to say arch 8's second population with headers near
   303 / 310 was one of the other classes. It is not. Every record's first byte is its class, and
   all 2858 records on arch 8, 12 and 14 are class 1, so the records the framer cannot read are
   class 1 too. The other three classes are used by no config in the corpus at all, which makes
   them a firmware-only problem rather than a decoding one. `docs/findings.md` section 42.
   Arch 9 reads a fifth value, 5, which is not one of the four the firmware dispatches over; its
   header is read and its blocks are not, `docs/findings.md` section 65.
3. The key table's semantic difference between architectures, and the meaning of `flags`
   (`0x00`, `0x07`, `0x73`, `0x7F` observed) and of `index` (sequential on the One, all zero on
   the 600, small values plus an outlier on arch 8).
4. The 288-byte table at arch 12 flash `0x000000-0x00011F`, in which every nibble is one of
   {6, 7, E, F}. On NOR flash that is the signature of a counter advanced by clearing one bit
   at a time. Boot counter, config generation counter and wear map are all plausible. Diffing
   that range across two dumps of the same remote taken at different times would settle it.

## Known unknowns

*Moved out of `docs/plans/002-the-roadmap.md` on 6 September 2026. It sat there as a second list of open questions
beside "What is still open" above, both with corrections written in place, and neither knowing about
the other. They are deliberately **not** merged into one list: the section above is about what a
reader or a writer cannot yet do, and this one is about what the firmware has not told us. Where they
overlap, the overlap is the interesting part.*

The heading said "unchanged" until 25 August 2026, and by then five of its entries were answered in
this document's own body, which is the drift `make facts` cannot see: a list of open questions has no
number to recompute. Answered entries are corrected in place below rather than deleted.

* Three of the four IR encoding classes at the dispatcher `0x12F08`. No config in the corpus
  carries one, section 42, so the firmware is the only evidence there will be.
* The encoder from raw learned timings to a config IR record. This ran on Logitech's servers, so
  nobody had it. **Mostly built since**: a code stated as a name and a number becomes pulses through
  the rhythm table, sections 157 to 169, and the block spelling matches Logitech's own generator byte
  for byte, section 174. What learning still needs is the tail shape, section 152, and the storage
  class choice, section 42.
* Activity semantics. **Closed**: the accumulator machine is read, section 34, the screen
  interpreter is read, section 40, and a binding table entry is an activity's handler set in the four
  hop chain that starts it, sections 120 and 121, all fifty activities named.
* The LWJL difference between architectures. The other half of this entry, the translation from
  the scanner's linear index to config event codes, is answered: the codes carry the index directly,
  section 89 and the step 6 narrative above.
* Whether the firmware implements event injection over USB. **Answered no on arch 14**, in this
  document's own step 6 narrative; arch 12 unexamined and nothing wants it. **Queueing an action
  instruction is another matter**: the Harmony 600, 650 and 700 do it through command state `0x34`,
  section 326, read and never sent.
* **What the log area holds.** Base slot 2 is named, section 47, so the pointer table is complete.
  **One of the five append cases is read**, section 111: case 3's six bytes are the clock's own fields
  copied in descending significance, so its record is a timestamp. What remains is the other four, and
  why the region is measured in eight byte units on the three architectures whose firmware never reads
  it. Nothing in the corpus appends, so this is a firmware only question, like the three unused IR
  classes above, and on **arch 12 it is worse than unused**: both bench Harmony Ones already have the
  declared region written, so the appender disarms itself at the first attempt, section 111.
* **Which activity a drawn name belongs to.** **Closed**, sections 120, 121, 124 and 125: all
  50<!--fact:activities_total--> activities in the corpus carry their drawn name, through the modes an
  activity's chain enters on three architectures and through the hit map on the Harmony One, and
  `make activities` prints it. The sentence that used to stand here, that the tie from a name to an
  activity number was not read, was already contradicted by the M3 section above when the list's
  heading said "unchanged". A **writer** still has to build a font set and number
  it rather than look a character up, since the codes are assigned per config in the order characters
  first appear in the generator's string list.
