# Working brief

Reverse engineering the Logitech Harmony config format so configs can be generated again.
Read `README.md` first for orientation, then `docs/roadmap.md` for the sequence and
`docs/findings.md` for the technical detail.

**The end goal is an application**: local, cross-platform, self-contained, which reads a config
off a remote, edits devices and activities, learns new IR codes and writes the result back. The
reverse engineering is the cost of that application. `docs/roadmap.md` is the plan of record and
sequences the format work by what the application needs next; `docs/plan.md` is the earlier
proposal, kept for its arguments.

The route is **generating config files**, not modifying firmware. A config is a program in a
data format and the firmware is its interpreter, so the firmware is the authoritative spec for
every config field. Reading it turns format work from inference into fact-finding. Never
propose firmware modification as a route to anything.

## Decisions already taken, do not relitigate

1. **Licence stays MIT.** libconcord and harmony-decompiler are GPLv3, so their code is not
   copied or ported here. Running concordance as a program has no licensing consequence, and
   protocol facts are not copyrightable expression.
2. **The USB protocol is derived clean-room from the firmware**, with
   `concordance/specs/protocol.txt` as corroboration and concordance kept as a cross-check
   oracle. Both are also technically necessary: concordance has two known defects on these
   architectures.
3. **TypeScript owns the config codec, Python stays reverse engineering only.** One codec, in
   the application's language, for the same reason there is one opcode table.
4. **Monorepo**, so the spec and the codec cannot drift apart.
5. **Hardware in the loop first, emulator deferred.** Round trip equality, read back and diff,
   IR cross learning between the two remotes, and live RAM polling over USB do most of what the
   emulator was wanted for, at a fraction of the build.
6. **Safety rails are absolute.** See "Never write to a remote" below.
7. **Own derivation first.** Upstream findings are hypotheses to test. The format's original
   designer is active in harmony-decompiler discussion #1 and is a privileged source, held in
   reserve for when we are genuinely stuck.
8. **Version 1 of the application is read only.** Write code exists behind a flag that is off.

Scope is the Harmony One (arch 12) and the Harmony 600 (arch 14), the two remotes on the bench,
with the 700 2.8 image as the arch 14 reference. Arch 8 and arch 9 samples are controls for
container claims, not targets. Other models are iterated on later.

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

`.githooks/pre-commit` is the second line: it checks **staged content**, so a rename, a
`git add -f`, or an extension the `.gitignore` does not list gets caught anyway, and so does
anything shaped like an account GUID or an identity field with a value in it. Install it with
`make hooks`, which is per clone, so a fresh checkout has no hooks until someone runs it.

Binaries live outside this repository, in a `lab` directory alongside it:

```
harmony/
  harmony-explorations/     this repo: code and documents, publishable
  lab/                      private, never in git
    dumps/<person>/<remote>/  concordance dumps, with a META.md each
    firmware/packages/        original Logitech .hfw files
    firmware/derived/         binaries decoded out of them
    ghidra/                   Ghidra projects
    work/                     scratch
```

The tooling finds `../lab` automatically, so no environment variable is needed in a normal
checkout; `HARMONY_LAB` overrides it. Tests skip cleanly when no lab is present. That
directory has its own `CLAUDE.md`. Analysis happens there, only shareable output lands here.

`tools/corpus.py` inventories the dumps and, importantly, reports which ones have no
description recorded. Phase 1 needs labelled samples, and a dump whose contributor has moved
on is far harder to label later than one described on arrival.

## Never write to a remote

Read paths only, for now. These devices are irreplaceable and Logitech's recovery servers are
gone. Note that patching a concordance architecture constant to fix the firmware dump also
redirects `erase_firmware()` and `write_firmware_to_remote(direct=1)`, so a patched build must be
treated as read-only.

Writing is a later milestone, and when it arrives the rails live in the code rather than in a
document:

* **Firmware is never written.** `WRITE_FLASH` is restricted to the config region for the
  detected architecture (One `0x040000`, 600/700 `0x030000`) and a write outside it is refused by
  the library, not by the user interface.
* Three remotes are on the bench: a programmed Harmony One, a Harmony 600, and a **spare
  unprogrammed Harmony One**. The spare is the only write target until a write has been
  demonstrated repeatable on it. The spare is arch 12, so **arch 14 has no write target at all**
  and writing to it stays blocked until a second arch 14 remote exists. Reading arch 14 is
  unaffected: the 600 on the bench is arch 14.
* No write proceeds without a verified original dump of that exact unit in the lab, and without
  the config's `INTENDEDVERSION` matching the connected remote's protocol, skin, board and flash
  id.
* Every write is followed by a `READ_FLASH` of the same range and a byte comparison. A mismatch
  is a failure, not a warning.
* Recovery paths first: the safe mode config dumped per unit (`*-safe.bin`) and the hardwired
  reset key combination at `0x19120`.
* **Flash is not the only write path.** `WRITE_MISC` selector `0x07` writes an arbitrary byte
  into the data memory of a running remote over USB, the mirror of the RAM read that replaces the
  emulator. Volatile, so it cannot brick anything, but it is still a write to a live device and
  it sits behind the same flag. `ERASE_FLASH` takes an address and **no** count, so an erase
  cannot be scoped by the caller, only refused.

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
docs/roadmap.md                 THE plan of record: decisions, milestones, sequence
docs/findings.md                authoritative technical reference, narrative
docs/config-format.md           the config format spec, structured, for tools to track
docs/usb-protocol.md            the USB protocol spec, step 3, transport done, commands open
docs/plan.md                    the earlier proposal, superseded, kept for its arguments
docs/emulator-design.md         design for the emulator harness, deferred, not built
src/harmony/                    the research library, see below
tools/                          thin command line wrappers, no logic of their own
tools/ghidra/                   headless script plus extracted branch target seeds
tests/                          one regression test per documented finding
reference/checksums.md          provenance, load addresses, public sample checksums
reference/concordance-notes.md  the two concordance defects, with patches
reference/ghidra_functions.txt  derived metadata: 521 functions by reference count
bin/setup-ghidra.sh             build or refresh the Ghidra project
samples/                        empty by policy
```

The TypeScript workspace, per `docs/roadmap.md` step 4:

```
packages/codec/                 TS: the one config codec, container through compiler
packages/lab/                   TS: finds the private lab directory, mirrors tests/lab.py
packages/usb/                   TS: HID transport plus the Harmony command protocol, planned
apps/studio/                    Electron: the application, planned
```

**The test runner is Node's own, not `vitest`.** Node 24 strips the types and runs a `.ts` test
file directly, so the dependency tree is `typescript` plus `@types/node` and nothing else, where
`vitest` brings 71 packages including a CSS toolchain. Two consequences that are enforced rather
than remembered: `erasableSyntaxOnly` is on, so no enums, namespaces or parameter properties, and
`node:test` cannot skip from inside a test, so `packages/lab` hands back a skip option
(`skipUnless`) that the test declares up front.

**Every npm dependency is pinned to an exact version. No `^`, no `~`, ever**, in any
`package.json` in the workspace, and that includes transitive additions and anything an
`apps/studio` later wants. A range means the bytes that get installed are decided by whoever
published last, not by whoever reviewed the change; a lock file narrows that window but does not
close it, since any `pnpm add` or lock refresh silently moves the range. Pinning makes a
dependency update a diff someone has to approve. `pnpm-lock.yaml` is committed as well, so the
transitive tree is pinned too.

Never add a dependency without checking what it pulls in: `make audit` is the floor, not the
check. `vitest` was rejected on exactly this basis, and `node-hid` was accepted after looking
(two dependencies, `node-addon-api` and `pkg-prebuilds`).

The library:

```
harmony/pic18/isa.py       THE opcode table and decoder. Single source of truth.
harmony/pic18/disasm.py    text formatting, SFR names, bank and ADSHR tracking
harmony/pic18/trace.py     find every access to a data address, and every call to a routine
harmony/pic18/chains.py    decode an XORLW switch chain, whose literals are not its cases
harmony/pic18/loadaddr.py  determine the base address of an unknown image
harmony/firmware.py        image header, checksum, size recovery from truncated dumps
harmony/gspm.py            the config container
harmony/ezfile.py          .hfw / EZUp / EZHex readers, and the Data.xml scrubber
harmony/usbdesc.py         find and decode the USB descriptor block in an image
```

**Never add a second opcode table.** Everything decodes through `isa.py`. The reason is in
its docstring: two tools once carried diverging copies and both produced readable but wrong
listings. If a mnemonic is missing, add it there and assert its encoding in
`tests/test_isa.py`.

When something new is confirmed, three things happen together:

1. the **structured fact** goes in `docs/config-format.md`, which is what other tools consume
2. the **reasoning and evidence** goes in `docs/findings.md`, which is why it is believed
3. a **regression test** goes in `tests/`, which is what stops it silently rotting

Step 3 is not optional. The analysis here is AI-produced and published as such, so a claim
that is not executable is only an assertion.

## Key facts

| | arch 12 (Gin, One) | arch 14 (600 / 700) |
|---|---|---|
| MCU | PIC18, 80-pin, external memory bus, likely `PIC18F87J50` (inferred) | `PIC18F67J50` |
| Firmware exec base | `0x020000` | `0x009000` |
| Entry point | `0x02EA38` (One 3.4) | `0x01BB38` (700 2.8), `0x01A26E` (600 0.2) |
| Config storage | parallel NOR, memory-mapped, executes in place | SPI serial, not mapped, copied to internal flash |
| User config at | flash `0x040000` | flash `0x030000` |
| Container format / pointer slots | `0x1600` (1.6) / 21 | `0x1400` (1.4) / 19 |

Container cookies, since the container is one format across architectures: `TPTP`/`DKDK` on
arch 8, `AHCM`/`MCHA` on arch 9, `GSPM`/`PTYY` on arch 12 and 14, and `BMBM` on arch 7 per
concordance's table, unverified here. The marker after the pointer table is `WLWL`, `CMAH` and
`LWJL` respectively. `format` is not an architecture identifier: arch 9 and arch 14 both carry
`0x1400`. **The architecture is stated by the config**, in section slot 1, which is the only
way to tell arch 12 from arch 14 without the EZHex header.

**The pointer table is one table across architectures too.** Arch 9 and 14 carry the base
layout of 19 slots; arch 8 inserts a NULL at slot 8; arch 12 inserts that plus a real section at
slot 18. So a section labelled on arch 14 transfers to the One by index, through
`gspm.base_slot` and `gspm.arch_slot`. Slot numbers in `docs/config-format.md` are base slots.
Six of them (base 5, 7, 10, 11, 12, 15) are count prefixed arrays of **three byte** flash
pointers.

Ghidra language: `PIC-18:LE:24:PIC-18`, generic variant only, so SFRs are unnamed.
`analyzeHeadless` rejects relative project paths.

**Prefer arch 14 (the 700 image) over arch 12 for format work**, even though the One is the
more popular remote. On arch 14 every config byte read passes through one SPI primitive at
`0x1B9AC`, a single instrumentable choke point. On arch 12 the config is memory-mapped and
reads are scattered everywhere. Decode arch 14, then port. Use the 700 image rather than the
600 dump, because the 600 dump is truncated by concordance.

## Commands

Three project skills carry the rituals that are easy to half-perform:

* **`trace-section`**, the method for labelling a config section by finding the firmware code
  that consumes its pointer, with the pitfalls that have already cost time here.
* **`finding`**, the verification gate plus the three places a confirmed fact must land, and the
  convention for correcting an earlier claim in place.
* **`probe-remote`**, how to measure a connected remote read only: the rails, which enumeration
  commands actually work on this machine, and where a hardware number has to land.

```
make test          run the suite; image-backed tests need a lab directory
make test-verbose  one line per test
make lint          byte-compile everything
make prose         check documents for em-dashes and en-dashes
make corpus        inventory the dumps, and flag the undescribed ones
make ghidra        build or refresh the Ghidra project
make ts            typecheck and test the TypeScript packages
make audit         check the npm dependency tree for known vulnerabilities
make hooks         install .githooks/pre-commit, once per clone
make all           everything except ghidra
```

```
tools/ezextract.py     <file> [--list] [--out DIR] [--split] [--metadata]
tools/gspm_parse.py    <file> [--json]
tools/pic18_disasm.py  <file> <base> <addr> <count>
tools/pic18_trace.py   <file> <base> <addr> [<addr> ...]
tools/pic18_xref.py    <file> <base> <code_addr> [<code_addr> ...]
tools/corpus.py        [lab_directory] [--json]
tools/usbdesc.py       <file> <base> [--raw] [--json]
tools/usbprobe.py      [--json]   reads a CONNECTED remote, enumeration only, needs pyusb
```

`pic18_trace.py` is the highest-value one: the entire IR chain came out of pointing it at three
variables. It sees banked accesses and `MOVFF`; indirect access through FSR is invisible to it,
so a variable written only via `INDF` will look like it has no writers. Search for the FSR setup
instead.

`loadaddr.find_base` is what to reach for on a model nobody has examined yet. Check the margin
over the runner-up before trusting its answer.

## Pitfalls already hit, do not repeat

* **PIC18 opcode ranges.** `SUBFWB` is `0x54-0x57`, `SUBWFB` is `0x58-0x5B`, `INCFSZ` is
  `0x3C-0x3F`, `INFSNZ` is `0x48-0x4B`. An early version of the disassembler had these wrong,
  which silently changed the meaning of a whole block. Verify against the datasheet before
  adding mnemonics.
* **Count programmatically, never by eye.** A hand count of LWJL codes gave 107/55 when the
  figure was 108/54. Both numbers were counting the wrong thing anyway, see the next entry.
* **A key code is an event type plus a scan code**, mask `0xC0` and `0x3F`, not
  `0x80 | (row << 3) | col`. The wrong split made the arch 14 table look like 108 matrix codes
  against 54 non matrix ones, which describes no possible keypad, and a paragraph of the analysis
  was built on explaining that away. It is 54 scan codes times three event types, press, release
  and repeat. `docs/findings.md` section 17. When a structure refuses to make sense, suspect the
  field split before inventing a reason.
* **Bit test polarity.** `BTFSS` is `0xA0-0xAF` and `BTFSC` is `0xB0-0xBF`. These were once
  swapped here, which inverted the stated sense of the infrared enable mask, the keypad columns
  and the reset key combination. All three are active low. Pinned in `tests/test_isa.py`,
  including a semantic check that does not depend on the datasheet.
* **The SFR map is the PIC18F67J50 / 87J50 one, never the generic PIC18 map.** This family
  moves the whole capture, compare and analogue block, and puts the USB registers at `0xF4C`
  to `0xF65` where classic parts put the parallel port. `UCON` is `0xF65`, `WDTCON` is
  `0xFC0`, `CCP1CON` is `0xFBB`. The table here was the generic map until it was checked, and
  eight of 93 names were wrong. Authoritative source, installed locally:
  `$(brew --prefix)/share/gputils/header/p18f67j50.inc` and `p18f87j50.inc`. `docs/findings.md`
  section 18.
* **`WDTCON` bit 4 is `ADSHR`, and it changes what ten addresses mean.** Setting it swaps a
  shadow register in, so the same address is `ADCON1` or `ANCON0` depending on a bit set two
  instructions earlier. `disasm.py` tracks it; a hand reading of a listing must too.
* **Follow control flow, not variables, when attributing code to a command.** The USB command
  handlers parse their arguments into shared variables, so finding code that uses those
  variables proves what the variables hold and nothing about which command runs it. That
  mistake put READ_FLASH's response in `docs/usb-protocol.md` when only its request had been
  found, twice in one commit. Start from the dispatch table or the state machine.
* **An `XORLW` chain's literals are not its case values.** The compiler emits a switch as a
  chain that XORs with the difference to the next case, so the case value is the running XOR
  of every literal so far. Reading them literally gave `0x20` twice, and a duplicate case is
  the only warning you get. Decode with `harmony/pic18/chains.py`, never by hand. That module
  cannot tell where a chain ends either, so check the case values are plausible for the
  variable being switched on before believing the table.
* **`system_profiler SPUSBDataType` returns nothing at all on this machine**, not even for
  unrelated devices, and it exits 0 while doing it. So any script that greps it for a remote
  concludes "not connected" and is believed. That already produced one false negative here: a
  six minute watcher reported no remote while the remote was plugged in. Use `ioreg`, and see
  the `probe-remote` skill.
* **Ghidra 12 API.** `Memory.getNumInitializedAddresses()` does not exist, use `getSize()`,
  and remember it includes the auto-created 4096-byte `GPR` DATA block, so subtract that before
  quoting code coverage.
* **`concordance --dump-firmware` does not return firmware.** See
  `reference/concordance-notes.md`. This is why the firmware had gone unexamined.

## Verification standard

Output here is AI-produced and published as such, so claims are expected to be checkable.
Established norms:

* Prefer two independent samples. The container is validated against thirteen, spanning four
  architectures, five base addresses, three format versions and four pointer table lengths.
  Two samples of one model prove much less than two architectures.
* Prefer an independent numeric closure. The IR carrier finding is confirmed by 38 kHz implying
  a stored 263, which the code's arithmetic turns into exactly 26.25 us.
* When deriving something like a load address, include a calibration case where the answer is
  already known, and report the score for wrong answers too. The base-address test scores 98.9%
  for the correct base against 11 to 30% for wrong ones.
* Record corrections in place rather than quietly fixing them, so readers can calibrate.
* Mark anything unconfirmed as unconfirmed. `docs/config-format.md` does this explicitly.

## Next up

Full detail in `docs/roadmap.md`, which tracks its own progress. Steps 1 and 2 are done: the
corpus now spans four architectures, and the container parser is general across all of them.

Step 3 is current: **the USB protocol, clean-room from the firmware.** Deliverable is
`docs/usb-protocol.md` covering each command's request and response layout, the length nibble
mapping the firmware actually implements, and which of `MISC_RAM`, `MISC_QUEUE_ACTION` and
`MISC_QUEUE_EVENT` it services. First payoff of our own read path is a complete firmware dump of
both remotes on the bench plus their `MCU_ID`, since concordance truncates the 600 at 65536 of
70336 bytes and the arch 12 part number is currently inferred rather than measured. While in the
firmware, locate the routine that validates a config on boot, because the trailer checksum lives
there.

Then, in order: the TypeScript codec and the read-only application (steps 4 and 5), then the
first reverse engineering block proper (step 6): label the section pointers by function using the
proven consumer method plus live RAM polling, extract the IR database, derive the trailer
checksum, and run the button mapping experiment by polling the keypad scanner's RAM variable
while pressing every key.
