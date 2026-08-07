# Working brief

Reverse engineering the Logitech Harmony config format so configs can be generated again.
Read `README.md` first for orientation, then `docs/roadmap.md` for the sequence and
`docs/findings.md` for the technical detail.

**The end goal is an application**: local, cross-platform, self-contained, which reads a config
off a remote, edits devices and activities, learns new IR codes and writes the result back. The
reverse engineering is the cost of that application. `docs/roadmap.md` is the plan of record and
sequences the format work by what the application needs next; `docs/plan.md` is the earlier
proposal, kept for its arguments.

**That application is a separate repository.** It is called
[FreeHarmony](https://github.com/dannybloe/FreeHarmony) and it holds the product: the Electron
shell, the interface and the packaging. This repository holds the knowledge
and the libraries that make it possible. See "The two repositories" below for where the line runs
and why it is not drawn between documents and code.

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
4. **Spec and libraries together, product apart.** The documents, the research tooling and the
   TypeScript libraries stay in one repository, because a codec in a second one drifts away from
   `docs/config-format.md` and the rule that a finding must be executable stops biting. The
   application lives in FreeHarmony and consumes those libraries. This supersedes the earlier
   "monorepo" wording, which put the app here too.
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

## The two repositories

| | this repository | FreeHarmony |
|---|---|---|
| holds | the API, the evidence, and a bench instrument | the product |
| that is | `packages/usb` and `packages/codec`, plus `docs/`, `src/harmony/`, `tools/`, `tests/` | Electron shell, interface, packaging |
| licence | MIT | AGPL-3.0 |
| moves at | the pace of what can be proven | its own pace |

**There is a user interface here too, and it is not the product.** A rough bench instrument, Node
serving a page to a browser, because an API nobody has driven interactively is an API nobody knows
is usable, and because step 6 needs a screen with live RAM values on it rather than a script. A
local listening port is acceptable for a bench tool and not for FreeHarmony, which gets a content
security policy instead; that difference is written down rather than left to be inferred.

**The line is between library and product, not between documents and code.** The TypeScript
libraries belong here because they are the spec in executable form: the rule that a confirmed fact
lands as a structured fact, a written argument and a regression test only works if the code
implementing it sits next to the documents. Move the codec out and a finding can land in `docs/`
and never reach the code.

FreeHarmony consumes `packages/codec` and `packages/usb` as a git dependency pinned to a commit,
until they are stable enough to publish. MIT flows into AGPL without trouble; nothing flows back.

**AGPL for the product is deliberate.** concordance and harmony-decompiler are both GPLv3, so a
copyleft licence keeps their work available rather than off limits, and GPLv3 permits combining
with AGPL. The network clause is inert for an application with no network, but anything shared
between users later would plausibly grow a server, and that is where it does work GPL would not.

**A community device database is an idea, not a plan.** It gets worked out when FreeHarmony starts,
not here and not now. Nothing about its shape, its licence or how contributions would work is
decided, and this file should not pretend otherwise.

## This repository is public

Nothing sensitive may be committed. `.gitignore` blocks the obvious cases, but it is a safety
net, not a policy:

* **No firmware or config binaries.** Unlicensed proprietary Logitech code. Also, the archived
  `.hfw` packages contain a `Data.xml` with a stranger's Logitech `UserId`, account GUIDs,
  `ServerID` and `ASPSESSIONID` session cookie. Publish checksums, never files. See
  `reference/checksums.md`.
* **No config dumps or `concordance -i` output.** Decided on 7 August 2026, and **not for the
  reason everyone assumes**: a config carries no account data at all, only an equipment inventory
  its owner published knowingly, and `samples/README.md` now records the check. What blocks it is
  **copyright**, since a config is Logitech generated data including an infrared database compiled
  from Logitech's own, which is the same reason firmware is excluded and which this MIT repository
  cannot pass to FreeHarmony. The info output is a separate matter: it carries the remote's unique
  serial GUIDs and that is personal data. A synthetic corpus after M2 is what would change the
  answer.
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
checkout; `HARMONY_LAB` overrides it. Tests skip cleanly when no lab is present, and **that is now
enforced rather than assumed**: `make test` and `make ts` were both run against a nonexistent lab
and nine Python tests plus ten TypeScript ones failed instead of skipping. The cause is the same
on both sides. A skip raised inside `subTest`, or a per sample `skipUnless`, skips that sample and
lets the loop finish, so a corpus wide total afterwards is asserted against zero. Guard such a test
up front with `lab.require(...)` in Python or `skipWithoutLab()` in TypeScript. The TypeScript one
deliberately skips only when there is **no lab at all**, because a lab that is present and missing
a sample should still fail loudly. That
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
* Recovery paths first, and **check what the file actually holds before trusting its name**. On
  arch 12 `*-safe.bin` is flash `0x000000` to `0x010000`, which contains the safe mode `GSPM`
  container at `0x002000`, and the One's has been verified against the device byte for byte. On
  **arch 14 the file called `-safe.bin` is not a safe mode image at all**: the 600's is the
  application firmware from program `0x9000`, truncated at 64 KiB, byte identical to
  `600-0.2-code-base0x9000-TRUNCATED64k.bin`. Its real safe mode is the 24320 byte image at
  internal `0xFE+0x1000`, which verifies its own checksum and was first read in August 2026. A rail
  that says "restore from the safe dump" would have restored the wrong thing on arch 14.
  The hardwired reset key combination at `0x19120` is the other path.
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
docs/memory-map.md              memory maps: the addressing rules and the architecture comparison
docs/memory-map-one.md          where everything lives on a Harmony One, derived, one page
docs/memory-map-600.md          the same for the Harmony 600
docs/memory-map-700.md          the same for the 700, entirely unmeasured, a list of what to read
docs/plan.md                    the earlier proposal, superseded, kept for its arguments
docs/emulator-design.md         design for the emulator harness, deferred, not built
src/harmony/                    the research library, see below
tools/                          thin command line wrappers, no logic of their own
tools/ghidra/                   headless script plus extracted branch target seeds
tests/                          one regression test per documented finding
reference/checksums.md          provenance, load addresses, public sample checksums
reference/models.md             the 40 models Logitech retired in 2025, mapped to architectures
reference/concordance-notes.md  the two concordance defects, with patches
reference/ghidra_functions.txt  derived metadata: 521 functions by reference count
bin/setup-ghidra.sh             build or refresh the Ghidra project
samples/                        empty by policy
```

The TypeScript workspace, per `docs/roadmap.md` step 4:

```
packages/codec/                 TS: the one config codec, container through compiler
                                and src/coverage.ts, the M2 byte accounting
packages/lab/                   TS: finds the private lab directory, mirrors tests/lab.py
packages/usb/                   TS: the command protocol and the write rails, read path measured
packages/corpus/                TS: read a config off a remote and file it, composes the other three
packages/bench/                 TS: the bench instrument, a server plus a page in web/
packages/probe/                 TS: the contribution probe, a report with shape and no contents
```

There is no `apps/` here. The application is FreeHarmony, and the workspace globs say so.

**The codec port is complete.** Every reader `src/harmony/gspm.py` has now exists in
`packages/codec` too, bar base slot 16, the number sender, whose count is zero in every config so a
port would be exercised by nothing. `packages/codec/src/coverage.ts` is the M2 progress number and
`make coverage` prints it: 26.3% of a Harmony 700 and 8.0% of a Harmony One, zero overlaps
everywhere. **It stops there and another reader will not move it**, because the rest is the region
of section 49. Two extents are deliberately unclaimed and the reasons are in the code: a base slot
5 record has none established, and every mode entry reads as the wide tagged list form with the
longest at 255 entries, exactly where a `u8` count saturates. Both were found by the overlap
detector rather than by reading the code.

**The write rails live in `packages/usb/src/rails.ts`, and that is where they stay.** A rail
enforced by a user interface is enforced until somebody writes a script. `WRITES_ENABLED` is off
unless `HARMONY_ENABLE_WRITES=1`, and the tests are refusals: with the flag off every write path
refuses with everything else in order, and with the flag on in a subprocess each remaining
condition still refuses by itself. `node-hid` is installed and its build script is
approved in `pnpm-workspace.yaml`, with the reason recorded there; pnpm blocks such scripts by
default and that default is right, so **any further approval is the owner's decision, not a side
effect of a commit.**

**Enumerating is not opening.** `listHarmony` and `packages/usb/bin/list-remotes.ts` ask the
operating system what is attached; `openHarmony` claims an irreplaceable device. Anything that only
needs to know whether a remote is plugged in uses the first. `packages/usb/test/hardware.test.ts` is
the only test that touches USB, and it skips rather than passes when nothing is attached. Its
enumeration tests only look; the rest open the device and send read commands, and those are gated on
`HARMONY_HARDWARE_TESTS=1` so a routine `make ts` never claims a remote on its way past. Each test
asks for **its own model** by product id, so a Harmony One and a Harmony 600 can be attached at once
and one session covers both architectures. Exactly one of that model, though: two Harmony Ones
enumerate identically and `openHarmony` refuses an ambiguous selector rather than guessing.

**The test runner is Node's own, not `vitest`.** Node 24 strips the types and runs a `.ts` test
file directly, so the dependency tree is `typescript` plus `@types/node` and nothing else, where
`vitest` brings 71 packages including a CSS toolchain. Two consequences that are enforced rather
than remembered: `erasableSyntaxOnly` is on, so no enums, namespaces or parameter properties, and
`node:test` cannot skip from inside a test, so `packages/lab` hands back a skip option
(`skipUnless`) that the test declares up front.

**Every npm dependency is pinned to an exact version. No `^`, no `~`, ever**, in any
`package.json` in the workspace, and that includes transitive additions. FreeHarmony inherits the
rule rather than being bound by this file. A range means the bytes that get installed are decided by whoever
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
| Container format / pointer slots | `0x1600` (1.6) / 22 | `0x1400` (1.4) / 20 |

Container cookies, since the container is one format across architectures: `TPTP`/`DKDK` on
arch 8, `AHCM`/`MCHA` on arch 9, `GSPM`/`PTYY` on arch 12 and 14, and `BMBM` on arch 7 per
concordance's table, unverified here. The marker after the pointer table is `WLWL`, `CMAH` and
`LWJL` respectively. `format` is not an architecture identifier: arch 9 and arch 14 both carry
`0x1400`. **The architecture is stated by the config**, in section slot 1, which is the only
way to tell arch 12 from arch 14 without the EZHex header.

**The pointer table is one table across architectures too.** Arch 9 and 14 carry the base
layout of 20 slots; arch 8 inserts a NULL at slot 8; arch 12 inserts that plus a real section at
slot 18. So a section labelled on arch 14 transfers to the One by index, through
`gspm.base_slot` and `gspm.arch_slot`. Slot numbers in `docs/config-format.md` are base slots.
Six of them (base 5, 7, 10, 11, 12, 15) are count prefixed arrays of **three byte** flash
pointers, and base 18 and 19 are NULL on all four architectures.

**Slot 3 holds the config's build timestamp**, an eleven byte record framed by `0xADDF` and
`0xEFBF`, whose day of week byte is days since 1 January 2000 modulo 7. That closure is why the
seven byte field assignment is believed; the assignment itself is the only one of 336 candidates
that fits the corpus. `docs/findings.md` section 21. Do not use it to order two configs of the same
remote: it contradicts the recorded direction of the Harmony 700 pair and that is unresolved.

**The table starts at `0x0B`, and an item is `{ u8 spare; u24 address }`.** Not a `u32` pointer
table at `0x0C`, which is what both parsers had, one slot short, with the last section's address
dismissed as padding. Corrected in `docs/findings.md` section 20; the closure is that
`0x0B + 4 * N` hits the marker offset exactly on fifteen samples where the old reading needed an
unexplained `- 3`. Read three byte addresses and check `spare`, because a nonzero `spare` read as
part of a `u32` adds `0x1000000` silently.

Ghidra language: `PIC-18:LE:24:PIC-18`, generic variant only, so SFRs are unnamed.
`analyzeHeadless` rejects relative project paths.

**Prefer arch 14 (the 700 image) over arch 12 for format work**, even though the One is the
more popular remote. On arch 14 every config byte read passes through one SPI primitive at
`0x1B9AC`, a single instrumentable choke point. On arch 12 the config is memory-mapped and
reads are scattered everywhere. Decode arch 14, then port. **Use `600-0.2-code-base0x9000-COMPLETE.bin`
for the bench remote**: the 600 image is no longer truncated, it was read off the remote and its own
header checksum verifies over all 70336 bytes. The 700 2.8 image stays the reference for anything
about the 700 itself, and as a second arch 14 sample.

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
make golden        compare the golden vectors; golden-write regenerates them
make coverage      byte accounting per sample, the M2 progress number; COVERAGE_ARGS=--detail
make remotes       list attached remotes, enumeration only, opens nothing
make bench         start the bench instrument on 127.0.0.1:8731, Ctrl-C to stop
make probe         structural report about an attached remote; PROBE_ARGS=--file <config>
make all           everything except ghidra and bench
```

```
tools/ezextract.py     <file> [--list] [--out DIR] [--split] [--metadata]
tools/gspm_parse.py    <file> [--json]
tools/ir_extract.py    <file> [--json] [--pulses]   the infrared database, grouped
tools/screen_dump.py   <file> [--json] [--all]      the screen language programs, disassembled
tools/pic18_disasm.py  <file> <base> <addr> <count>
tools/pic18_trace.py   <file> <base> <addr> [<addr> ...]
tools/pic18_xref.py    <file> <base> <code_addr> [<code_addr> ...]
tools/corpus.py        [lab_directory] [--json]
tools/golden.py        [--write]   golden vectors for the Python/TypeScript comparison
tools/usbdesc.py       <file> <base> [--raw] [--json]
tools/usbprobe.py      [--json]   reads a CONNECTED remote, enumeration only, needs pyusb
node packages/usb/bin/list-remotes.ts    the same question over HID, also enumeration only
node packages/corpus/bin/read-config.ts --label <name> [--product 0xc121]
                       reads the whole config off a remote and files it in the lab.
                       Opens the device, unlike the two above, so reach for it deliberately.
node packages/probe/bin/probe.ts [--product 0xc122] [--file <config>]
                       the contribution probe: a few kilobytes of JSON describing a config's
                       shape and nothing of its contents, meant to be published. Opens the
                       device unless --file is given.
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

* Prefer two independent samples. The container is validated against fifteen, spanning four
  architectures, four base addresses, three format versions and three pointer table lengths.
  Two samples of one model prove much less than two architectures.
* Prefer an independent numeric closure. The IR carrier finding is confirmed by 38 kHz implying
  a stored 263, which the code's arithmetic turns into exactly 26.25 us.
* When deriving something like a load address, include a calibration case where the answer is
  already known, and report the score for wrong answers too. The base-address test scores 98.9%
  for the correct base against 11 to 30% for wrong ones.
* Record corrections in place rather than quietly fixing them, so readers can calibrate.
* Mark anything unconfirmed as unconfirmed. `docs/config-format.md` does this explicitly.

## Next up

Full detail in `docs/roadmap.md`, which tracks its own progress. Steps 1, 2 and 4 are done, and
step 3 is done as far as the firmware can take it: the corpus spans four architectures, the
container parser is general across all of them and now exists twice, in Python and TypeScript, held
equal by golden vectors, and `docs/usb-protocol.md` covers both directions of every command.

**The read path works on both architectures**, from our own host code: GET_VERSION, READ_MISC and
READ_FLASH on the programmed Harmony 600 and on the spare Harmony One. On each, 256 bytes of config
flash come back byte-identical to that unit's lab dump. Six fields of the version block were predicted
from the 600 and confirmed on the One. **Nothing has been written to a remote.**
`docs/usb-protocol.md` section 4 is the measured part.

**Reads of internal program memory restart a remote.** `READ_FLASH` with top address byte `0xFF`, when
the transfer ends in a one byte chunk, makes the remote leave the USB bus. Reproduced deliberately on
the spare unprogrammed One: 5 restarts, all self-recovering, config verified against the dump
afterwards. Ruled out: ordering, chunk count, and the size 63 by itself. `packages/usb` caps an
internal read at one chunk. **This is the one path where read only is not the same as harmless**, and
the cap is a workaround, not an explanation.

**`MCU_ID` is not reachable** and that is now a finding rather than a task: a PIC18 keeps its device id
at `0x3FFFFE` and the internal read window is two 64 KiB pages, `0xFE` and `0xFF`, so 128 KiB total.
The arch 12 part number stays inferred. **Both sub-selectors read**, which corrects an earlier
measurement that had `0xFF` reading program memory and `0xFE` returning nothing; it is `0xFE` that maps
from program address zero. The `0xFF` page carries a 64 byte identity block at `+0xF400` holding the
three GUIDs `concordance -i` reports, so that block is personal data and never gets published.

What still waits:

* what fields 7, 10 and 11 of the version block are versions of, fields 8 and 9 being placed,
* naming ten of GET_VERSION's twelve fields.

Two items came off that list rather than being solved. **The concordance cross-check of a full
config read is done**: each unit's stored `.EZHex` *is* concordance output, and all three configs
were read off their remotes and matched it in full, 1672832, 1232237 and 738149 bytes. And
**`MCU_ID` is unreachable by construction**, per the paragraph above, so it is a finding rather than
a task.

**The Harmony 600's firmware is no longer truncated.** Read off the remote across both internal
pages, 70336 bytes, and its own header checksum verifies over all of them where the 65536 byte
concordance dump does not. The 65534 bytes both can express agree byte for byte.

**All three bench remotes are fully read and verified against their own backups**, read only: user
config, application firmware, safe mode and both internal pages, with no differences anywhere. The
two Ones run bit for bit the archived 3.4 image. What is verified is that each backup is a faithful
copy; **restoring from one has never been tried**, because nothing has ever been written to a remote.

**The operational One is fully read and fully verified**, and that is the answer to "do we have
enough to restore it". Flash `0x000000` to `0x010000` matches its own safe mode dump, 65536 of 65536.
The application firmware at `0x020000`, 60050 bytes, matches the image decoded from the 3.4 package,
60050 of 60050, and verifies its own header checksum. The user config at `0x040000` matches its own
`.EZHex`, 1672832 of 1672832. `0x010000` to `0x020000` and the tail above the firmware are erased.
On arch 12 the application runs from **external NOR**, so `READ_FLASH` at `0x020000` is how you get
it; internal memory holds the bootloader and support images, not the application.

**The 600 is now covered too.** Both internal pages swept, its config verified against its own
`.EZHex` at 738149 of 738149 bytes, and its safe mode found: a 24320 byte image at `0xFE+0x1000`,
version 0.2, checksum verifying, which nothing had read before. Its `0xFF` page carries no image at
all, only the identity block.

**Version block fields 8 and 9 are placed**, which closes that open item. Field 9 is the version of
the image at `0xFF+0x0000` and field 8 the version of the image at `0xFF+0xE000`; both read `0x00`
when the image is absent, and the 600 is the negative case for both.

**The One's internal memory is dumped too**, both pages, `one-3.4-internal-page-fe.bin` and `-ff.bin`.
It holds three images with the `48 47` header and all three verify their own checksums: 45356 bytes
at `0xFE+0x1000`, 8438 at `0xFF+0x0000`, 634 at `0xFF+0xE000`. This is code no `.hfw` contains, since
arch 12 runs its application from external NOR. The `0xFF` page is **not** in `tests/lab.py`, on
purpose: it carries that unit's identity block. **Version block field 9 is the version of the image
at `0xFF+0x0000`**, which is what `0x16` on the One was.

**The 600's safe mode config is measured rather than borrowed.** Its address, external `0x020000`,
had rested on the 700's update package and no 700 has ever been connected here. Reading it on the
600 returns a container whose recovered base is `0x020000`, format 1.4, 7115 bytes, all ten checks
passing. It is the same length as the 700's with an identical section table and 83 differing bytes,
74 of them in the `LWJL` key table. `docs/findings.md` section 24.

**Most of a config is a region nothing named reaches**, section 49, found by M2's byte accounting
rather than by looking for it. 62% of a Harmony 600 and 82% of a Harmony One sit above the highest
byte any of the sixteen named sections claims, and it is not padding: 140 distinct byte values, 35%
zero, 0.6% `0xFF`. **Screen opcode 2 is the only known referent** and every address it names lands
there, 4 of 4 on the 600 and 141 of 141 on the One, while opcode 4 has the same shape and never
does. The closure is that the two container kinds emitting no opcode 2, the arch 9 sample and the
three safe mode containers, have no such region. This caps M2's coverage at roughly 35% however
many readers are ported.

**Opcode 2 draws a bitmap and that does not explain the region**, section 50, which answers section
49's conjecture and refuses its hope. `u8 kind; u16 stride; u16 rows` then pixels; kind 0 is raw and
exactly `5 + stride * rows` bytes, kind 1 is the base slot 7 glyph encoding walked to its `0x00`
terminator, kind 2 is a bare `RETURN`. The encoded extent has its own closure: the body **discards
the header** and then breaks rows exactly `rows - 1` times anyway, in all 51 encoded pictures. Two writer rails from the code: only the **low byte** of
each `u16` is loaded, and the row loop stops drawing above **row 128** while still advancing. But a
picture is 125 to 885 bytes and there are 3 to 16 per config, so the One's sixteen come to under
seven kilobytes of a 1.37 MB region. Three negatives are recorded rather than left to be redone: the
bitmaps **do not tile**, the region's only ascending pointer-shaped runs are **misaligned reads of
base slot 10's own array** (a misaligned read of an ascending table is itself ascending), and 40% of
the 600's non-zero big endian words are exact RGB565 greys against 31056 distinct words on the
colour-screen One, which is suggestive of pixels and **is not a decode**. Next is the second
referent, swept out of the decoded sections whose record fields are not all named.

Step 5 is next, and FreeHarmony is deliberately out of scope for now, so both halves of it are here.

**The read pipeline.** Read a whole config off a remote and file it in the lab corpus with a
timestamp, because a dump taken before an experiment is the only cheap insurance there is. No new
dependencies; `packages/usb` and `packages/codec` already do the work. The read bounds itself: the
sixteen bytes at the config base carry `end_addr`, so the exact length is known before the bulk read
starts, which is 1672832 bytes on the One rather than the 3840 KiB the region spans.

**Then the bench instrument.** Node serving a page, browser as the window, no Electron and no new
dependencies. What is attached, identity from `GET_VERSION`, a config read with progress, the
container summary with its ten checks, the section table, and a visible log of every command sent.
Plain DOM modules, so FreeHarmony can reuse them in a renderer later.

**Then step 8, the contribution probe**, which is what makes somebody else's remote count. Two
architectures are covered here out of at least eleven that exist, so the structural report is how
that changes. It is publishable precisely because it carries shape and not contents.

Then the first reverse engineering block proper (step 6): label the section pointers by function
using the proven consumer method plus live RAM polling, and read the action list opcode table out of
the arch 14 firmware.

**The button mapping experiment was run on the 600 and it does not work by polling RAM**, section
48. A remote on USB sits in sync mode and never runs its application, so the keypad handler never
runs and no scan code is ever computed; checked three ways, including that sync comes up before the
host sends anything. The firmware instead parks all fourteen row lines low and waits for an
interrupt on the column port, which makes the **column** readable and the row not, so a press
yields `(code - 1) mod 4` and nothing else. All 54 buttons were pressed anyway, and that quarter
closes against an independent artefact: the census is 14, 14, 13, 13 per column, a column holds at
most 14, and the unit's own config carries scan codes contiguous 1 to 54 whose two absentees, 55
and 56, sit in exactly the two columns that are short. First hardware check of section 17's key
code split and of section 13's `row * 4 + column`. `tools`: `make watch-columns`,
`packages/usb/bin/watch-columns.ts`, pinned in `tests/test_keypad.py`. The row stays open, 14
candidates per button. **Arch 12 gives nothing at all**, measured the same evening on the spare
One: sixteen buttons from every region of the remote all pull one shared sense line, `PORTB` bit 5,
and no other bit on any of the seven ports moves. That is a proof rather than an impression, since
a column cannot hold sixteen of the One's forty buttons, and the One image has no column reader of
the arch 14 shape at all. So the USB ceiling is a quarter on arch 14 and zero on arch 12. **The
route that would finish it is a RAM write to drive the rows, which the rails forbid on arch 14 and
which is not proposed here.**

**The action list interpreter is located and read**, on the Harmony 700 2.8 image and confirmed on
the complete 600 0.2: a 120 byte circular queue holding exactly 40 three byte instructions, an
executor, and a dispatcher that is a **binary search on the opcode**, which is why section 26's
XORLW chain search could not have found it. `0x10E/0x10F` is a sixteen bit accumulator; `0x7A`
loads it and `0x79` adds to it; `0x70` and `0x71` are comparisons whose operator is the low nibble
of the operand's high byte. Everything at opcode `0x80` and above is one routine with bit 7
stripped. `docs/findings.md` section 34, `tests/test_interpreter.py`.

**Part of step 6 is already done, from the config side rather than the firmware.** Base slot 5 is
**the infrared database**: two levels of pointer array over records of mark and space durations in
microseconds, decoded and extractable with `tools/ir_extract.py`. `docs/findings.md` section 32.
Base slot 4 is the firmware event map, base slot 6 the mode table, base slot 8 key press bindings,
base slot 10 the action list table and base slot 13 the state variable table. Section 39 adds three
more: base slot 9 is **the binding table**, eight to sixteen sets of button bindings with an enter
and a leave handler, whose index maxes out at the count minus one in all ten configs and where the
Harmony 700 pair differs by exactly one binding matching its owner's one added button; base slot 14
is **the state value map**, which opcode `0x72` indexes with its high byte while its low byte names
the state variable, both bounds holding everywhere; and base slot 16 is **the number sender**, which
converts a value to decimal and queues one action list per digit, read from three images and used by
no config in the corpus. That made it ten, counting slot 3; the running total is at the end of this
file. Opcode `0x7E`
enters the mode its operand indexes; an entry has an enter handler
and a leave handler and the firmware selects no other tag. Note
that **a section's size is not the gap to the next pointer**: slot 4 holds 125 bytes and the gap is
up to 1532, because slot 5's infrared group arrays sit in it. `docs/findings.md` section 36. A scan of the firmware's section seeker
gives a **named entry point for every slot, on all three images**: raw 3 to 17 on the two arch 14
ones and raw 2 to 19 on the One, which never seeks raw slot 8 because that is the NULL arch 12
inserts. The map is in `docs/findings.md` sections 35 and 38, and it turns labelling the rest from
a search into a reading. **Base slot 3 starts Timer 1**, so it is the clock, and **base slot 15's
entry count is demanded by the firmware**, 9 on arch 14 and 11 on arch 12: a writer that emits a
different count gets a silent no-op, not an error. That section also confirms the
`0x0B + 4 * slot` table layout **in code** rather than by arithmetic. Opcodes `0x7F`, `0x7C`, `0x7A`/`0x6C` are placed, and `0x07`, `0x0F`, `0x1F`,
`0x3F` are partitioned into a family that addresses a second operand space, section 31. **What the
accumulator is for** is answered in section 39: the high band ladder pairs it and a byte register
with the two number renderers, base slots 16 and 14.

**The second interpreter is decoded**, section 40. `0x1879C` on the 700, `0x16E38` on the 600,
`0x295AC` on the One: a one byte opcode language that **draws the screen**, with ten opcodes on all
three images, two more in the arch 12 dispatcher and one more that arch 8 configs use and no
available firmware implements. Its programs live in **base slot 11**, in base slot 14's lookups and
in mode entries, and **base slot 7 is what its opcode 16 indexes**, which names slot 7's caller.
The closure is that **18252 programs in ten configs decode with nothing left over**, which is a
real check because the instructions are variable length with no length field. Its inline strings
are **glyph indices, not characters**: none decode as ASCII. Dump them with
`tools/screen_dump.py`. That took the total to twelve.

**The trailer checksum is derived**, section 41, which was the last item on the critical path for
writing. A sixteen bit XOR of the container's little endian words seeded `0x4321`, from the first
byte to the stored value six from the end. It recomputes on all fourteen containers across four
architectures, it exists in both codecs and the parse reports it as a container check. It is a
**weak** check: blind to two transposed words, so a passing checksum means the remote will not
refuse the file, not that the file is right. Brute force over 636 standard algorithms found
nothing first, which is why the firmware was the route.

**The infrared class byte**, section 42, reframes a roadmap item rather than closing it. The
pointer array lands seven bytes into a record, on a byte the firmware branches on, and the three
bytes after it point back to the start; that distance is seven in all 2858 records. Every record on
arch 8, 12 and 14 is **class 1**, no config mixes classes, and arch 9 reads 5 with no firmware to
explain it. So the other three classes are used by nothing in the corpus, which makes them a
firmware-only problem, and **the records section 32 cannot frame are class 1 too**, not another
class as `docs/config-format.md` used to say.

**Base slot 12 is the timer table**, section 43, the thirteenth of twenty slots named. A count
prefixed pointer array over seven byte records, `{ u8 kind; u24 duration; u24 instruction }`, and a
firmware module of four RAM entries with a start, a cancel and a poll routine. Opcode `0x1F` with
operand high `0xEB` starts a timer and `0xEA` cancels it, the low byte being the index, and **the
set of indices started is exactly the section's own count** in all ten configs across four
architectures, with the three safe mode containers as the negative case. `T1CON` and the tick's bit
selection make the unit exactly one second on a 32.768 kHz Timer 1 crystal, and the largest duration
in the corpus is 7200, which is two hours. Two rails for a writer: **a timer fires one instruction,
not a list**, and the duration is **clamped to sixteen bits** with no error.

**Base slot 15 is the parameter block**, section 44, the fourteenth slot named, which corrects
section 38's reading of it as a membership test. Numbered groups of `{ u8 entries; u16 value[] }`,
laid out contiguously before the pointer array, and the firmware demands **every group's length**
as well as the section's count: fourteen literals read off the 700 and the One, holding in all
thirteen containers, and a group whose length differs is silently replaced by compiled in defaults.
`gspm.PARAMETER_GROUP_COUNTS` carries the table. A group index is **not** portable between
architectures, unlike every other indexed structure here. Group 7 is a timeout in seconds, groups 5
and 6 are a measurement to level curve that reads like battery millivolts and is marked a
conjecture, and group 4 is one constant across twelve containers.

**Base slot 17 is the touch screen hit map**, section 45, and with it **only base slot 2 is left
unnamed** (18 and 19 are NULL everywhere). Two levels of count prefixed array over a twelve byte
record, `{ u16 x; u16 width; u16 y; u16 height; u8 code; u24 self }`, and the firmware returns the
**first** rectangle containing the point, so a page's order is data: 104 pairs overlap. It is
populated **only on arch 12**, count zero in the other eleven containers, which is why it stayed
unnamed: the project decodes arch 14 first and arch 14 never uses it. The codes are ten of the
One's 43 to 53 scan code block, and the geometry is identical on two unrelated Harmony Ones, so it
is a layout resource rather than user data. `gspm.touch_pages`, `gspm.Container.touch_hit`.

**Base slot 2 is the log area**, section 47, and with it **every one of the twenty base slots is
accounted for**: 0 and 1 are the header records, 2 to 17 are sixteen named sections, 18 and 19 are
NULL in all thirteen containers. It is not a pointer to a structure but three numbers,
`{ u16 capacity; u24 start; u24 limit }` and a `u24` capacity on arch 12, reserving a region of
flash above the config, and `limit - start == capacity * stride` closes exactly in every container
with a stride of 8 on arch 8, 9 and 14 and 1 on arch 12. The arch 12 firmware scans it at boot for
the last byte that is not `0xFF`, which is how an append only journal in erased flash recovers its
write position, and appends one byte per call with two compiled in rails: an address outside
`[0x040000, 0x400000)` zeroes the remaining count instead of writing, and a full region refuses.
The only writers are five branches of the timer ladder, operand high `0xE1` to `0xE5`, and **no
config in the corpus uses any of them**, so the naming rests on the arch 12 firmware alone. Arch
14 never seeks the slot at all, which is the second time after slot 17 that "prefer arch 14, then
port" hid a section: it is a rule about reading code, not about finding data.

**Base slot 7 is the font table**, section 46, and the whole text path now works end to end. A set
is `{ u8 height; u8; u8; u24 glyph[count] }` where one of the two middle bytes is the count, 46 to
76 and the same for every set in a container; a glyph is `u8 width` then one byte operations where
`0x00` ends it, bit 7 set skips that many background pixels and a byte below `0x80` introduces that
many literal **two byte** pixels. Three closures on twelve containers: 3933 glyphs whose every row
is exactly `width`, every glyph decoding to exactly its set's declared height, and **16054 inline
string codes all resolving** to a non-NULL glyph of the font their own program selected, taken as
one based. A one byte pixel fails almost all of them. Arch 9 packs it differently and the reader
refuses it. `tools/screen_dump.py --strings` draws the strings, which come out as readable labels.

**That section was corrected in place the next day and the correction is the instructive part.**
The first reading took the set header's first byte for a slot count when it is the glyph height,
which shrank every set from ~75 glyphs to ~15, undercounted the corpus by a factor of four, and
then made the inline codes look like they overran their set, so the section confidently declared
the correct reading ruled out. **When a structure refuses to make sense, suspect the field
assignment before writing up the anomaly**, which is the same lesson as the key code split in
section 17.
