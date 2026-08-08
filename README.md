# harmony-explorations

Reverse engineering notes and tools for Logitech Harmony remotes, focused on the config
file format and the firmware that interprets it.

A config already on a remote can be read off it, but nobody outside Logitech can generate a new one.
The goal here is to change that. Related effort:
[trelowney/harmony-decompiler](https://github.com/trelowney/harmony-decompiler).

This page used to open "Logitech's servers are gone". Measured on 7 August 2026, the MyHarmony
service is not: it answers, and **it still compiles configs**, one of which was built that week for
a device chosen on the spot and written to a remote on this bench. The **classic** service, the one
the Harmony One shipped with, is the one serving a discontinuation notice.
[findings.md](docs/findings.md) sections 56 and 58.

That does not make this project unnecessary, and the reasons are worth being explicit about: a
service that can be withdrawn without notice is not a plan, the software driving it is heavily
reduced from what it replaced, and none of it is under the owner's control. It does mean the
sentence at the top of this page is about who *can* generate a config today, not about who
*could*.

**Where this is going: a local, cross-platform application** that reads a config off a remote,
edits its devices and activities, learns new infrared codes and writes the result back. Self
contained, so the reading, the codec and the USB layer all live here rather than in a
dependency, and nothing goes near a network. [docs/roadmap.md](docs/roadmap.md) is the plan of
record and says which format question is being answered next, and why that one.

**That application is [FreeHarmony](https://github.com/dannybloe/FreeHarmony)**, a separate
repository, AGPL-3.0. This one holds the specification, the research tooling and the TypeScript
libraries that read a remote and parse a config, all MIT, and that is deliberate: the libraries are
the specification in executable form, so they belong next to the documents that argue for them.
FreeHarmony is the product built on top.

**The route is generating config files, not modifying firmware.** Firmware analysis is a means
to an end: a config file is a program in a data format, the firmware is the interpreter, so
the firmware is the authoritative specification for every config field. Reading it turns
format reverse engineering from inference into fact-finding.

## Status

The work targets two architectures, and there are three on the bench:

* **arch 12** ("Gin"), Harmony One
* **arch 14**, Harmony 600 and Harmony 700
* **arch 9**, Harmony 525, connected on 8 August 2026. Read, not targeted: its config and its
  firmware are in the lab, and its class 5 infrared, which was the last big gap in the byte
  accounting, is read.

Established: the MCU family, firmware load addresses, flash layouts, the firmware image
header and its checksum, the config container, the keypad scanner, and the complete
infrared path from config pointer to LED including the SPI storage layer.

The container is now validated across **four** architectures, because publicly shared sample
sets (arch 8, arch 9 and a Harmony 700 pair) were added as controls. Sixteen samples, four base
addresses, three format versions, three pointer table lengths, all consistency checks passing. It
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
the group if it differs: fourteen such lengths read off two images, holding in all thirteen
containers. Then **the touch screen hit map**, which only the Harmony One
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
watched the keypad port over USB. A remote on USB never runs its application, so the scan code is
never computed and only the matrix **column** is observable, a quarter of the mapping. That quarter
closes: the measured census is 14, 14, 13, 13 buttons per column, a column holds at most 14, and
the unit's own config carries scan codes contiguous 1 to 54, whose two absentees fall in exactly
the two columns that are short. Which button carries which of the 54 codes is still open. **The
Harmony One gives nothing at all**: sixteen buttons from every region of it pull one shared sense
line, so arch 12 wakes differently from arch 14 and USB yields no part of its mapping.

Both of the config's languages are read, and with them the text: base slot 7 is the **font table**,
run length encoded glyphs at two bytes a pixel, or **two bits** on the monochrome 5xx panel, and
every one of 58083<!--fact:inline_string_codes--> inline string codes in the corpus resolves to a glyph of the font its own
program selected. `tools/screen_dump.py --strings` draws them, and they come out as readable
labels. **Action lists** are bytecode for an accumulator machine with a forty instruction queue and
a binary search dispatcher, and a **second interpreter draws the screen**: its own one byte opcodes
for text, bitmaps, a switch on a state variable and a jump, with 21552<!--fact:screen_programs--> programs across thirteen
containers decoding with nothing left over. Its one instruction that
names an address outside its own program draws a **bitmap**, either raw rows or the same encoding a
glyph uses, and the firmware states two rails a writer needs: only the low byte of each size field
is loaded, and the row loop stops drawing above row 128 while still consuming the stream.

**That region is read now, and with it most of a config.** It used to be the largest single
unknown, 62% of a Harmony 600 and 82% of a Harmony One reachable from nothing named. It is one
contiguous array of screen pictures, rows of big endian RGB565 pixels, drawn by programs carried
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

Not established: what a binding table entry corresponds to, three of the four infrared encoding
classes, and which physical button each scan code is. See
[docs/findings.md](docs/findings.md) for detail and
[docs/config-format.md](docs/config-format.md) for the spec as it firms up.

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

**The infrared carrier is generated in software**, not by a hardware PWM, with cycle-counted
delays and a per-half-cycle enable mask. The config supplies a 16-bit carrier period and an
8-bit duty value, scaled by `value * 4 / 10` into instruction cycles. Cross-checked: 38 kHz
implies a stored 263, which the code's arithmetic turns into exactly 26.25 us.

## Layout

```
docs/roadmap.md             the plan of record: decisions, milestones, current step
docs/findings.md            the authoritative technical reference
docs/config-format.md       the config format spec, grows as sections are labelled
docs/usb-protocol.md        the USB protocol, both directions of every command
docs/memory-map.md          memory maps: addressing, and how the architectures compare
docs/memory-map-one.md      where everything lives on a Harmony One, on one page
docs/memory-map-600.md      the same for the Harmony 600
docs/memory-map-700.md      the same for the 700, which nobody here has connected
docs/plan.md                the earlier proposal, superseded, kept for its arguments
docs/emulator-design.md     design for the PIC18 harness, deferred rather than dropped
src/harmony/                the research library: one shared PIC18 decoder, plus readers
tools/                      command line wrappers around the library, plus corpus.py
tests/                      a regression test per documented finding
reference/                  checksums, derived metadata, concordance notes
bin/setup-ghidra.sh         build or refresh the Ghidra project
samples/                    sanitisation policy; no samples committed yet
```

The library is deliberately the only place instruction decoding happens. An earlier version
of this work carried a copy of the opcode table in each tool, and two of those copies
disagreed with the datasheet in ways that produced readable but wrong listings. There is one
table now, it is range-checked at import, and `tests/test_isa.py` pins the encodings that
were previously wrong.

## Quickstart

Python 3 and nothing else. Analysis needs a firmware image, which is not in this repository:
see [reference/checksums.md](reference/checksums.md) for how to obtain and verify one.

```sh
# unwrap a .hfw or EZUp/EZHex download into analysable binaries
python3 tools/ezextract.py harmony_700_firmware_2_8.hfw --out ./work

# inspect a config container: base address and pointer count are derived from the data
python3 tools/gspm_parse.py work/Region_3.EZHex

# disassemble, with SFR names Ghidra's generic PIC-18 language does not provide
python3 tools/pic18_disasm.py work/Region_2.EZUpgrade 0x9000 0x194a4 30

# follow a variable: every read, write and bit operation that touches it
python3 tools/pic18_trace.py work/Region_2.EZUpgrade 0x9000 0x08D 0x08E 0x3BF
```

Starting on a model nobody has looked at yet? Find its load address first, because a
disassembler given the wrong base produces a plausible listing rather than an obvious
failure:

```python
from harmony.pic18 import loadaddr
best, ranked = loadaddr.find_base(open('image.bin', 'rb').read())
print(best)            # check the margin over ranked[1] before trusting it
```

### Tests

```sh
make test          # image-backed tests need a lab directory, see below
make lint prose    # syntax, and the document conventions
make ts            # the TypeScript packages: typecheck and test
make hooks         # install the pre-commit checks, once per clone
make all           # everything except Ghidra
```

The application side is TypeScript, and its dependency tree is deliberately two packages: the
compiler and its type definitions. Node 24 runs the test files directly by stripping the types,
so there is no test runner to install. Node 24 or newer, and `pnpm`, are needed for that half;
the research tooling above still needs nothing but Python 3.

Binaries are not in this repository, so anything needing them looks for a `lab` directory
alongside the checkout, or wherever `HARMONY_LAB` points, and skips cleanly when there is
none. `make corpus` inventories the dumps in it.

Every documented finding has a test, so a refactor that breaks a conclusion is visible
rather than silent. That matters here more than usual: the analysis was AI-produced, so the
claims are made executable rather than only written down.

### Ghidra

```sh
make ghidra
```

Imports as `PIC-18:LE:24:PIC-18` at the right base, then seeds the listing from
`tools/ghidra/` before analysing. Auto-analysis alone finds almost nothing on a raw binary,
because there is no entry point to follow; seeding is what reaches 87% coverage.

## What is deliberately not here

**No firmware or config binaries.** Two reasons:

1. They are unlicensed proprietary Logitech code and data.
2. The archived `.hfw` firmware packages contain a `Data.xml` carrying the original
   downloader's Logitech `UserId`, account GUIDs, `ServerID` and an `ASPSESSIONID` session
   cookie. Whoever downloaded that firmware had their session details shipped inside the
   file. Redistributing it redistributes those.

[reference/checksums.md](reference/checksums.md) gives SHA-256 checksums and provenance
instead, so you can obtain the files yourself and confirm you have the identical ones.

**No user config dumps.** Those are personal configuration data belonging to the remote's
owner. See [samples/README.md](samples/README.md).

If this project ever mirrors firmware files, **strip `Data.xml` of the account fields first.**

## If you have a Harmony this project has never seen

Two architectures are covered here out of the eleven concordance knows models for, and there is no
way to learn anything about the other nine without hardware nobody involved owns. So the most useful
thing another remote can produce is a **structural report**: a few kilobytes of JSON describing the
shape of its config and nothing of its contents.

```sh
make probe                                     # a remote attached over USB
make probe PROBE_ARGS="--product 0xc122"       # when more than one is
node packages/probe/bin/probe.ts --file cfg    # a config already on disk, no remote
```

It is read only, and it holds addresses, lengths, counts, the container header and the outcome of
each check. It does not hold a section's bytes, and it does not hold the remote's serial number.
That is enforced rather than promised: `packages/probe/test/report.test.ts` pulls a sixteen byte run
out of every populated section of a real config and asserts none of it survives into the report.
Read the output before you send it, which is the other reason it is small.

What makes it worth running on an unfamiliar model is that the report derives everything rather than
looking it up. An unknown container cookie still yields the flash base, the slot count and the full
section table, with the parser's refusal recorded next to them, because on a new architecture the
refusal is the interesting part. [docs/roadmap.md](docs/roadmap.md) step 8 has the reasoning.

Honest caveat: this currently means cloning the checkout and building a native module, so it is for
people who already do that. A runnable file per platform is real work and belongs with FreeHarmony.

## Provenance

The analysis and tools here were produced by Claude (Anthropic's AI), working from concordance
dumps of three remotes, three archived Logitech firmware packages, configs that other people
published for other architectures, and **four remotes on the bench, read over USB by this
project's own code**. No insider information, and **nothing has ever been written to a remote**.

**This paragraph said "no hardware probing" for longer than it was true**, and the correction is
part of the point: the read path has run against a Harmony One, a 600, a spare One and a 525 since
6 August 2026, and one arch 9 firmware image was taken off a remote rather than out of a package.
`docs/findings.md` carries the same statement and was corrected first; this is a summary, and a
summary is a copy of a fact with no test.

Most of it is still offline analysis of files, so most of it is independently checkable, and it
should be checked. The write-ups show their verification method rather than only their conclusions,
and they record the places where earlier conclusions were wrong and got corrected, on purpose, so
the rest can be calibrated against them. Twenty one so far, all documented in
[docs/findings.md](docs/findings.md), including one that had a real cost: arch 12 and 14 were
described as using a container unrelated to the Harmony 525's, when in fact the 525's frames
are nested inside the GSPM layer. That advised people away from reusable work. One is instructive
in a different way: a rule for deriving the container's section marker from its cookie was wrong,
and still produced the correct answer on the only sample that exercised it. The largest was a
field split. Key codes were read as a matrix address with a flag bit, when the top two bits are
an event type, and rather than treat the resulting nonsense as a signal, the analysis built a
paragraph of explanation on top of it.

The item most worth verifying before relying on it: the arch 12 part number is inferred rather than
read off a board. The SFR map used to be listed here too, on the grounds that it assumed the
standard PIC18 high-end layout rather than the PIC18F67J50 datasheet specifically. It was checked,
eight of 93 names were wrong, and the table now comes from the gputils register headers for both
parts. The `BTFSC`/`BTFSS` polarity that was
previously flagged as a risk here has since been found to be wrong and corrected: see
`tests/test_isa.py`, which now pins both encodings against the datasheet and against a real
wait loop from the firmware.

## Licence

MIT, see [LICENSE](LICENSE). That covers everything in this repository: the tools, the
documents and the derived data.

It does **not** cover the Logitech firmware and config binaries the tools operate on. Those
are not here and are not ours to license. Obtaining them is your affair, and
[reference/checksums.md](reference/checksums.md) says where they came from.

## Safety

**Do not write to, erase, or flash a remote.** These devices are irreplaceable. Note that patching a
concordance architecture constant to fix the firmware dump also redirects `erase_firmware()` and
`write_firmware_to_remote(direct=1)`, so a patched build must be treated as read-only.

This used to add "and Logitech's recovery servers are gone", which is wrong, and the rail stands
anyway: a service that answers today can be withdrawn tomorrow, and it has not been shown to
compile a config any more. See section 56 of [findings.md](docs/findings.md).
