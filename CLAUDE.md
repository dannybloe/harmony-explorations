# Working brief

Reverse engineering the Logitech Harmony config format so configs can be generated again.
Read `README.md` first for orientation, then `docs/findings.md` for the technical detail.

The goal is **generating config files**, not modifying firmware. A config is a program in a
data format and the firmware is its interpreter, so the firmware is the authoritative spec for
every config field. Reading it turns format work from inference into fact-finding. Never
propose firmware modification as a route to anything.

## This repository is public

Nothing sensitive may be committed. `.gitignore` blocks the obvious cases, but it is a safety
net, not a policy:

* **No firmware or config binaries.** Unlicensed proprietary Logitech code. Also, the archived
  `.hfw` packages contain a `Data.xml` with a stranger's Logitech `UserId`, account GUIDs,
  `ServerID` and `ASPSESSIONID` session cookie. Publish checksums, never files. See
  `reference/checksums.md`.
* **No config dumps or `concordance -i` output.** Personal data: a config records what
  equipment someone owns, and the info output carries the remote's unique serial GUIDs. See
  `samples/README.md` for the unresolved sanitisation question.
* **No Ghidra projects.** They embed an imported copy of the firmware.

Binaries live outside this repository. The working copies are in
`/Users/dannybloemendaal/harmony-backups/harmony-one-programmed/extracted/`, which is the
private lab holding the two remote dumps and a persisted Ghidra project. That folder has its
own `CLAUDE.md`. Analysis happens there; only shareable output lands here.

## Never write to a remote

Read paths only. These devices are irreplaceable and Logitech's recovery servers are gone.
Note that patching a concordance architecture constant to fix the firmware dump also redirects
`erase_firmware()` and `write_firmware_to_remote(direct=1)`, so a patched build must be treated
as read-only.

## Documents must not contain em-dashes or en-dashes

Convention for everything published here. Verify with a check that does not itself contain the
characters:

```
python3 -c "import sys; d=open(sys.argv[1]).read(); print(sum(d.count(c) for c in '\u2014\u2013'))" <file>
```

All current documents report zero.

## Where things go

```
README.md                       front page: status, headline findings, quickstart
docs/findings.md                authoritative technical reference, narrative
docs/config-format.md           the GSPM spec, structured, for tools to track
docs/forum-post.md              the public write-up as posted
tools/                          original analysis tools
tools/ghidra/                   headless script plus extracted branch target seeds
reference/checksums.md          provenance and load addresses
reference/concordance-notes.md  the two concordance defects, with patches
reference/ghidra_functions.txt  derived metadata: 521 functions by reference count
samples/                        empty by policy
```

When something new is confirmed, put the **structured fact** in `docs/config-format.md` and the
**reasoning and evidence** in `docs/findings.md`. Keep them in sync but do not duplicate: the
spec is what other tools consume, the findings document is why it is believed.

## Key facts

| | arch 12 (Gin, One) | arch 14 (600 / 700) |
|---|---|---|
| MCU | PIC18, 80-pin, external memory bus, likely `PIC18F87J50` (inferred) | `PIC18F67J50` |
| Firmware exec base | `0x020000` | `0x009000` |
| Entry point | `0x02EA38` (One 3.4) | `0x01BB38` (700 2.8), `0x01A26E` (600 0.2) |
| Config storage | parallel NOR, memory-mapped, executes in place | SPI serial, not mapped, copied to internal flash |
| User config at | flash `0x040000` | flash `0x030000` |
| GSPM format / pointer slots | `0x1600` (1.6) / 21 | `0x1400` (1.4) / 19 |

Ghidra language: `PIC-18:LE:24:PIC-18`, generic variant only, so SFRs are unnamed.
`analyzeHeadless` rejects relative project paths.

**Prefer arch 14 (the 700 image) over arch 12 for format work**, even though the One is the
more popular remote. On arch 14 every config byte read passes through one SPI primitive at
`0x1B9AC`, a single instrumentable choke point. On arch 12 the config is memory-mapped and
reads are scattered everywhere. Decode arch 14, then port. Use the 700 image rather than the
600 dump, because the 600 dump is truncated by concordance.

## Tools

```
tools/gspm_parse.py    <file> [--json]                      parse a GSPM config container
tools/pic18_disasm.py  <file> <base> <addr> <count>          disassemble with SFR names
tools/pic18_trace.py   <file> <base> <addr> [<addr> ...]     find all accesses to a data address
```

`pic18_trace.py` is the highest-value one: the entire IR chain came out of pointing it at three
variables. It detects banked accesses and `MOVFF` only, deliberately ignoring access-bank
instructions, which resolve to bank 0 or the SFR page rather than to a banked variable.

## Pitfalls already hit, do not repeat

* **PIC18 opcode ranges.** `SUBFWB` is `0x54-0x57`, `SUBWFB` is `0x58-0x5B`, `INCFSZ` is
  `0x3C-0x3F`, `INFSNZ` is `0x48-0x4B`. An early version of the disassembler had these wrong,
  which silently changed the meaning of a whole block. Verify against the datasheet before
  adding mnemonics.
* **Count programmatically, never by eye.** A hand count of LWJL codes gave 107/55 when the
  real figure is 108/54.
* **Ghidra 12 API.** `Memory.getNumInitializedAddresses()` does not exist, use `getSize()`,
  and remember it includes the auto-created 4096-byte `GPR` DATA block, so subtract that before
  quoting code coverage.
* **`concordance --dump-firmware` does not return firmware.** See
  `reference/concordance-notes.md`. This is why the firmware had gone unexamined.

## Verification standard

Output here is AI-produced and published as such, so claims are expected to be checkable.
Established norms:

* Prefer two independent samples. The GSPM container is validated against four.
* Prefer an independent numeric closure. The IR carrier finding is confirmed by 38 kHz implying
  a stored 263, which the code's arithmetic turns into exactly 26.25 us.
* When deriving something like a load address, include a calibration case where the answer is
  already known, and report the score for wrong answers too. The base-address test scores 98.9%
  for the correct base against 11 to 30% for wrong ones.
* Record corrections in place rather than quietly fixing them, so readers can calibrate.
* Mark anything unconfirmed as unconfirmed. `docs/config-format.md` does this explicitly.

## Next up

Priority order, with detail in `docs/forum-post.md` section 13:

1. **Label the GSPM section pointers by function.** Method proven: the firmware copies each
   config pointer into a per-subsystem RAM variable, so finding the consumer labels the section.
   The IR section was identified exactly this way via `0x3BD/0x3BE`.
2. **The config trailer checksum algorithm.** Located but not derived. On the critical path,
   since nothing can be uploaded without it.
3. **The other three IR encoding classes.** The dispatcher at `0x12F08` routes four selectors;
   only selector 2 is traced.
4. **The encoder at `0x17E00-0x18400`**, which turns config records into the ring buffer command
   stream.
5. **A PIC18 emulator harness.** Argued as the highest-leverage item: it makes config generation
   an automated test instead of an experiment on irreplaceable hardware.
6. **An IR code extractor**, which needs only read-side understanding and delivers value
   immediately, since the codes people cannot recreate are already on their own remotes.
