# harmony-explorations

Reverse engineering notes and tools for Logitech Harmony remotes, focused on the config
file format and the firmware that interprets it.

Logitech's servers are gone, so a config already on a remote can be read off it, but nobody
can generate a new one. The goal here is to change that. Related effort:
[trelowney/harmony-decompiler](https://github.com/trelowney/harmony-decompiler).

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

The work targets two architectures, the two remotes on the bench:

* **arch 12** ("Gin"), Harmony One
* **arch 14**, Harmony 600 and Harmony 700

Established: the MCU family, firmware load addresses, flash layouts, the firmware image
header and its checksum, the config container, the keypad scanner, and the complete
infrared path from config pointer to LED including the SPI storage layer.

The container is now validated across **four** architectures, because publicly shared sample
sets (arch 8, arch 9 and a Harmony 700 pair) were added as controls. Thirteen samples, five base
addresses, three format versions, three pointer table lengths, all consistency checks passing. It
turns out to be one format with a per architecture cookie rather than one format per
architecture, and the **pointer table is one table too**, with a couple of per architecture
insertions, so a section labelled on one architecture transfers to the others by index.

Nine of the twenty to twenty two sections now have something said about them. A config
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

Not established: the config format itself, beyond the container and two small tables. The IR
device database, activities, menus and display are still opaque. That is the bulk of the
remaining work. See [docs/findings.md](docs/findings.md) for detail and
[docs/config-format.md](docs/config-format.md) for the spec as it firms up.

## Headline findings

**`concordance --dump-firmware` does not return firmware.** This is why the firmware had not
been examined before. On arch 12 it returns a small config blob from the wrong flash region.
On arch 14 it returns real code, silently truncated to 64 KiB when the image is larger. Both
read `flash_base` = 0. See [reference/concordance-notes.md](reference/concordance-notes.md).

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

## Provenance

The analysis and tools here were produced by Claude (Anthropic's AI), working from concordance
dumps of three remotes, two archived Logitech firmware packages, and five configs that other
people published for other architectures. No insider information, no hardware probing, and
nothing was ever written to a remote.

That is worth stating plainly because it should affect how you read the findings. All of it is
offline analysis of files, so all of it is independently checkable, and it should be checked.
The write-ups show their verification method rather than only their conclusions, and they
record the places where earlier conclusions were wrong and got corrected, on purpose, so the
rest can be calibrated against them. Seven so far, all documented in
[docs/findings.md](docs/findings.md), including one that had a real cost: arch 12 and 14 were
described as using a container unrelated to the Harmony 525's, when in fact the 525's frames
are nested inside the GSPM layer. That advised people away from reusable work. One is instructive
in a different way: a rule for deriving the container's section marker from its cookie was wrong,
and still produced the correct answer on the only sample that exercised it. The largest was a
field split. Key codes were read as a matrix address with a flag bit, when the top two bits are
an event type, and rather than treat the resulting nonsense as a signal, the analysis built a
paragraph of explanation on top of it.

Items most worth verifying before relying on them: the SFR map assumes the standard PIC18
high-end register layout rather than the PIC18F67J50 datasheet specifically; the arch 12 part
number is inferred rather than read off a board. The `BTFSC`/`BTFSS` polarity that was
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

**Do not write to, erase, or flash a remote.** These devices are irreplaceable and Logitech's
recovery servers are gone. Note that patching a concordance architecture constant to fix the
firmware dump also redirects `erase_firmware()` and `write_firmware_to_remote(direct=1)`, so a
patched build must be treated as read-only.
