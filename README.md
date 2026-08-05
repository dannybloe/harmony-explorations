# harmony-explorations

Reverse engineering notes and tools for Logitech Harmony remotes, focused on the config
file format and the firmware that interprets it.

Logitech's servers are gone, so a config already on a remote can be read off it, but nobody
can generate a new one. The goal here is to change that. Related effort:
[trelowney/harmony-decompiler](https://github.com/trelowney/harmony-decompiler).

**The goal is generating config files, not modifying firmware.** Firmware analysis is a means
to an end: a config file is a program in a data format, the firmware is the interpreter, so
the firmware is the authoritative specification for every config field. Reading it turns
format reverse engineering from inference into fact-finding.

## Status

Covers two architectures, from two remotes and three firmware images:

* **arch 12** ("Gin"), Harmony One
* **arch 14**, Harmony 600 and Harmony 700

Established: the MCU family, firmware load addresses, flash layouts, the firmware image
header and its checksum, the GSPM config container, the keypad scanner, and the complete
infrared path from config pointer to LED including the SPI storage layer.

Not established: the config format itself, beyond the container and one small table. The IR
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
docs/findings.md            the authoritative technical reference
docs/config-format.md       the GSPM config format spec, grows as sections are labelled
docs/forum-post.md          public write-up, as posted to harmony-decompiler
docs/emulator-design.md     design for the PIC18 harness, not yet built
src/harmony/                the library: one shared PIC18 decoder, plus format readers
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
```

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
dumps of two remotes and two archived Logitech firmware packages. No insider information, no
hardware probing, and nothing was ever written to a remote.

That is worth stating plainly because it should affect how you read the findings. All of it is
offline analysis of files, so all of it is independently checkable, and it should be checked.
The write-ups show their verification method rather than only their conclusions, and they
record the places where earlier conclusions were wrong and got corrected, on purpose, so the
rest can be calibrated against them. Four so far, all documented in
[docs/findings.md](docs/findings.md), including one that had a real cost: arch 12 and 14 were
described as using a container unrelated to the Harmony 525's, when in fact the 525's frames
are nested inside the GSPM layer. That advised people away from reusable work.

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
