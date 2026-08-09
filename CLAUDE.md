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
   architectures. **That is the default and not the whole rule since 9 August 2026**: where the
   firmware genuinely cannot settle something, Logitech's own host software may be the source,
   marked as such per fact. The weighing, the legal basis and the ledger of everything currently
   believed on the client's word alone are in `docs/host-client.md`. Its arch 8 constants
   contradict four real configs, so it is a generator of hypotheses and not an authority.
3. **TypeScript owns the config codec, Python stays reverse engineering only.** One codec, in
   the application's language, for the same reason there is one opcode table.
4. **Spec and libraries together, product apart.** The documents, the research tooling and the
   TypeScript libraries stay in one repository, because a codec in a second one drifts away from
   `docs/config-format.md` and the rule that a finding must be executable stops biting. The
   application lives in FreeHarmony and consumes those libraries. This supersedes the earlier
   "monorepo" wording, which put the app here too.
5. **Hardware in the loop first, emulator deferred.** Round trip equality, read back and diff,
   IR cross learning between the two remotes, and live RAM polling over USB do most of what the
   emulator was wanted for, at a fraction of the build. **The RAM polling leg is per architecture**:
   it works on arch 12 and arch 14 and the 525 answers zero for every address, section 90.
6. **Safety rails are absolute.** See "Never write to a remote" below.
7. **Own derivation first.** Upstream findings are hypotheses to test. The format's original
   designer is active in harmony-decompiler discussion #1 and is a privileged source, held in
   reserve for when we are genuinely stuck.
8. **Version 1 of the application is read only.** Write code exists behind a flag that is off.
9. **`docs/findings.md` stays one file.** Splitting it is the obvious idea at 6936 lines and it was
   measured and rejected on 8 August 2026, so do not re-derive this. It **costs no tokens**, because
   it is never loaded whole, only grepped and read in ranges; the per-session cost was `CLAUDE.md`
   and that has been cut. **No cutting line is better than another**: 140 references run between
   sections and both an era split and a subject split push about 40% of them across a file boundary,
   so the correction chains that give the document its value do not survive either. And it is **the
   one document that has never drifted**, because every section in it carries a regression test,
   where the eleven contradictions the audit found were all in summaries. What would reopen it is
   size alone, at roughly 5700 bytes a section: if it outgrows rendering, split by era, keep section
   numbers global, and keep the index at `docs/findings.md` so the 159 references that name that
   path stay correct.

Scope is the Harmony One (arch 12) and the Harmony 600 (arch 14), the remotes on the bench, with
the 700 2.8 image as the arch 14 reference. Arch 8 stays a control for container claims rather than
a target. **Arch 9 is a target now**: the Harmony 525 arrived on 8 August 2026, its config and its
firmware are in the lab, and `docs/memory-map-525.md` records what was predicted before it was
connected against what it measured. Other models are iterated on later.

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
    software/                 Logitech's own PC software, see docs/host-client.md
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

Read paths only, for now. These devices are irreplaceable. Note that patching a concordance
architecture constant to fix the firmware dump also redirects `erase_firmware()` and
`write_firmware_to_remote(direct=1)`, so a patched build must be treated as read-only.

**This section used to say "and Logitech's recovery servers are gone". That is wrong and the
correction is instructive.** Measured on 7 August 2026 from the bench machine:
`sl.dhg.myharmony.com` serves live assets over CloudFront, `svcs.myharmony.com` resolves to an AWS
load balancer named `prod-auto-lb-2` and answers, its certificate was renewed on 5 July 2026, and
the owner can sign in with his account and have a connected remote recognised. What **is**
discontinued is the **classic** service:
`members.harmonyremote.com` serves a page titled "Logitech Harmony Remote Software Discontinuation",
and that is the 7.x software the Harmony One originally shipped with. Two services, one gone and one
not, and the project had collapsed them into one sentence.

The rail does not change and the reason it does not is worth stating: a remote is still
irreplaceable and the service can be withdrawn at any time without notice. This used to add "and
whether it still compiles a new config is not established". **It is established, and it does**:
section 58, a config compiled on 6 August 2026 for a device chosen that day and written to the
spare One. So the premise was wrong twice over, and the rail rests on the half that was always
carrying it. `docs/findings.md` sections 56 and 58.

Writing is a later milestone, and when it arrives the rails live in the code rather than in a
document:

* **Firmware is never written.** `WRITE_FLASH` is restricted to the config region for the
  detected architecture (One `0x040000`, 600/700 `0x030000`) and a write outside it is refused by
  the library, not by the user interface.
* Four remotes are on the bench: a programmed Harmony One, a Harmony 600, a **spare
  Harmony One**, and a **Harmony 525**, which is arch 9 and therefore has no write target either. The spare is the only write target until a write has been
  demonstrated repeatable on it. The spare is arch 12, so **arch 14 has no write target at all**
  and writing to it stays blocked until a second arch 14 remote exists. Reading arch 14 is
  unaffected: the 600 on the bench is arch 14. **The spare is no longer blank**: on 7 August 2026
  Logitech's own software synced a config to it, section 58. Its original contents are in the lab,
  byte for byte and verified against the device, so anything that wanted a virgin arch 12 remote
  wants that dump rather than the unit.
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
  cannot be scoped by the caller, only refused. **How much it destroys is known now**: 64 KiB on
  arch 12, so the rail requires a block aligned address and a whole block inside the region, and
  the ceiling is `0x3D0000` rather than `0x400000` because the **stored application firmware**
  sits inside the nominally writable region. Client sourced and adopted because it only refuses
  more, `docs/host-client.md`.

**Reads of internal program memory restart a remote, so read only is not the same as harmless.**
`READ_FLASH` with top address byte `0xFF`, when the transfer ends in a one byte chunk, makes the
remote leave the USB bus. Reproduced deliberately on the spare One, then still unprogrammed: 5
restarts, all self-recovering, config verified against the dump afterwards. Ruled out: ordering,
chunk count, and the size 63 by itself. **The cause is read now**, section 94: the internal fetch
primitive can only read a word, the loop emits two bytes and subtracts two, and its exit test is
equality with zero, so an **odd** count never terminates and `CLRWDT` inside the loop keeps the
watchdog from ending it. `packages/usb` refuses an odd count. Two earlier refusals were bounds
around the hazard rather than the hazard, and the second would have let 65 and 127 hang a remote.
**The trigger is read all the way through, section 96, and there is no address threshold.** The
sender at `0x20394` has no bound, so an unterminated loop walks a write pointer up through data
memory writing what it reads, and after 2247 bytes it overwrites its own counter. The read returns
if and only if the flash byte it lands on, `0x8C7` above the failing chunk, is **even**. So the
outcome is content, not location: the threshold at `0x010A56` reported earlier the same day was an
artefact of which offsets the bisection tried, and it is corrected in place. The rail refuses odd
counts everywhere, and the case that returns is no better, because it has already scribbled 2247
bytes over the remote's memory.

**A new architecture refuses writes by construction**, because the gate is
`ARCHITECTURES_WITH_A_WRITE_TARGET` in `packages/usb/src/rails.ts` and it is `[12]`. Adding a read
profile does not add a write target and must not.

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
docs/host-client.md             Logitech's own client as a source: the rule, and the ledger of
                                what is believed on its word alone, all of it unconfirmed
docs/memory-map.md              memory maps: the addressing rules and the architecture comparison
docs/memory-map-one.md          where everything lives on a Harmony One, derived, one page
docs/memory-map-600.md          the same for the Harmony 600
docs/memory-map-700.md          the same for the 700, entirely unmeasured, a list of what to read
docs/memory-map-525.md          arch 9, predictions written down before the remote arrives
docs/plan.md                    the earlier proposal, superseded, kept for its arguments
docs/emulator-design.md         design for the emulator harness, deferred, not built
src/harmony/                    the research library, see below
tools/                          thin command line wrappers, no logic of their own
tools/ghidra/                   headless script plus extracted branch target seeds
tests/                          one regression test per documented finding
reference/checksums.md          provenance, load addresses, public sample checksums
reference/superseded.md         claims a finding killed, which no document may restate
reference/models.md             the 40 models Logitech retired in 2025, mapped to architectures
reference/concordance-notes.md  the two concordance defects, with patches
reference/ghidra_functions.txt  derived metadata: 521 functions by reference count
bin/setup-ghidra.sh             build or refresh the Ghidra project
samples/                        empty by policy
```

The TypeScript workspace, per `docs/roadmap.md` step 4:

```
packages/codec/                 TS: the one config codec, container through compiler,
                                src/coverage.ts the M2 byte accounting, src/emit.ts the
                                emitter that reads it back the other way, and src/edit.ts
                                the M3 groundwork: same length edits, rails as refusals
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
`make coverage` prints it; the current figures are in "Where the work stands" below.

**This paragraph used to end "it stops there and another reader will not move it", and that was<!--superseded-->
wrong twice over.** It read 26.3% of a Harmony 700 against 98.1% today, and seven readers have
moved it since: sections 53, 54, 55, 61, 63, 64 and 65. The two extents it called deliberately
unclaimed are both read now, base slot 5's record by section 61 and the mode entry by section 52,
which found that the pointer does not land on the entry at all and that the "255 entries" was a
misread tail rather than a saturating count. The lesson worth keeping is the one that still holds:
**both were found by the overlap detector rather than by reading the code**, which is what the byte
accounting is for.

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

When something new is confirmed, four things happen together:

1. the **structured fact** goes in `docs/config-format.md`, which is what other tools consume
2. the **reasoning and evidence** goes in `docs/findings.md`, which is why it is believed
3. a **regression test** goes in `tests/`, which is what stops it silently rotting
4. **everything that summarised the old answer gets swept**, which is what stops the rest of the
   documents drifting away from it

Step 3 is not optional. The analysis here is AI-produced and published as such, so a claim
that is not executable is only an assertion.

**Step 4 was added on 8 August 2026 after an audit found eleven places where the documents
contradicted the code.** `docs/findings.md` had not drifted at all, because every section in it
carries step 3; the documents that summarise it had, because a summary is a copy of a fact with no
test. So the copies are executable now, and `make facts` is the check:

* a number quoted in prose carries a marker naming the fact it states,
  `21552<!--fact:screen_programs-->`, invisible when rendered. `tools/facts.py` recomputes it from
  the corpus, `make facts-write` updates every copy, and `--list` shows what is available.
* a claim that a finding kills goes into `reference/superseded.md` **in the same commit**, and the
  check then refuses that wording anywhere outside a correction. Quoting a dead claim in order to
  refute it is what `<!--superseded-->` on the line is for.

It runs in `make all` and in the pre-commit hook, so a document that contradicts the code cannot be
committed. The numeric half needs a lab and skips cleanly without one; the phrase half is pure text
and always runs, because a fresh clone with no lab still has to be protected by it.

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

**Base slots 0 and 1 are host side.** The firmware's section seeker is called with raw slots 2 to
19 on the One and 3 to 17 on the 700, and with 0 and 1 on neither, so the name tree and the
architecture record are read by the host software and nothing on the remote validates them. That is
why slot 1 can be three bytes in one container and seven in the rest, and why its version word can
name a skin the remote does not report. **The word is per config, not per model**: one Harmony One
carries two different words either side of the sync section 58 watched. Its low byte is a skin
number, and an editor copies it rather than computing it. Section 81.

**Slot 3 holds the config's build timestamp**, an eleven byte record framed by `0xADDF` and
`0xEFBF`, whose day of week byte is days since 1 January 2000 modulo 7. That closure is why the
seven byte field assignment is believed; the assignment itself is the only one of 336 candidates
that fits the corpus, and **confirmed independently in section 58** against a config compiled while
we watched, on a date known before it was read. `docs/findings.md` section 21. Do not use it to
order two configs of the same remote: it contradicts the recorded direction of the Harmony 700 pair
and that is unresolved, though the section 58 pair, whose direction was observed rather than
recorded, is ordered correctly by it.

**The table starts at `0x0B`, and an item is `{ u8 spare; u24 address }`.** Not a `u32` pointer
table at `0x0C`, which is what both parsers had, one slot short, with the last section's address
dismissed as padding. Corrected in `docs/findings.md` section 20; the closure is that
`0x0B + 4 * N` hits the marker offset exactly on sixteen samples where the old reading needed an
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
make facts         check the documents against the code; facts-write fixes the numbers
make corpus        inventory the dumps, and flag the undescribed ones
make ghidra        build or refresh the Ghidra project
make ts            typecheck and test the TypeScript packages
make audit         check the npm dependency tree for known vulnerabilities
make hooks         install .githooks/pre-commit, once per clone
make golden        compare the golden vectors; golden-write regenerates them
make coverage      byte accounting per sample, the M2 progress number; COVERAGE_ARGS=--detail
make emit          how much of each sample the emitter puts back, and whether it round trips
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
tools/pic18_disasm.py  <file> <base> <addr> <count> [--part 4550]
tools/pic18_trace.py   <file> <base> <addr> [<addr> ...]
tools/pic18_xref.py    <file> <base> <code_addr> [<code_addr> ...]
tools/corpus.py        [lab_directory] [--json]
tools/golden.py        [--write]   golden vectors for the Python/TypeScript comparison
tools/facts.py         [--write] [--list]   the document checks behind `make facts`
tools/usbdesc.py       <file> <base> [--raw] [--json]
tools/usbprobe.py      [--json]   reads a CONNECTED remote, enumeration only, needs pyusb
node packages/usb/bin/list-remotes.ts    the same question over HID, also enumeration only
node packages/usb/bin/read-window.ts --address 0x... [--count 16] [--compare 0x...]
                       read one window of external flash and print it, and optionally read a
                       second and say whether they are identical. For a question about a
                       specific address, which read-config.ts cannot answer. Opens the device.
node packages/usb/bin/read-ram.ts --address 0x... [--count 64] [--summary]
                       the same for data memory. Reach for this before believing a watcher's
                       silence: watch-keys reports changes, so it cannot tell a variable that
                       never moves from an address the remote does not serve, and on arch 9 it
                       is the second. --summary counts nonzero bytes, which is the question a
                       positive control asks. Opens the device.
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
* **The SFR map is per part, and choosing wrong is silent.** `isa.PARTS` holds two: the
  PIC18F67J50 / 87J50 map for arch 12 and arch 14, and the **PIC18F4550** map for arch 9, which
  disagrees about 65 of 139 shared addresses. Pass `--part 4550` for a 525 listing. Section 80.
* **The 67J50 map is not the generic PIC18 map either.** This family
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
* **`concordance --dump-firmware` returns no usable firmware on arch 12 or arch 14**, which is why
  the firmware had gone unexamined. **The scope is the whole point and this line used to omit it**:
  the defect is two entries in concordance's architecture table, not the tool, and on **arch 8 and
  arch 9 the same command returns the complete firmware region**, because `firmware_base` is its
  own region there and `config_base - firmware_base` is exactly `FIRMWARE_MAX_SIZE`. So asking a
  contributor for `concordance -b -f` is the route to an arch 8 image, and it is how the incoming
  525 gets dumped. `reference/concordance-notes.md`, asserted in `tests/test_concordance_notes.py`.
* **A misaligned read of an ascending table is itself ascending.** Twice a long run of ascending
  `u24` values looked like an undiscovered pointer table into the picture region, and twice it was
  base slot 10's own array read one byte late: a real entry with a constant high byte puts that
  constant in the low position and multiplies every delta by 256. Check the alignment against a
  known table before believing a new one. `docs/findings.md` sections 49 and 55.
* **Infer a structure's form from the byte that states it, never from its contents.** An **empty**
  wide tagged list has no entry to carry a flags byte, so inferring the form from the entries makes
  it look narrow and the length comes out a byte short. Same family as the two entries above about
  field splits: when the data could tell you and a header does tell you, believe the header.
* **"Prefer arch 14, then port" is a rule about reading code, not about finding data.** Base slots
  17 and 2 both stayed unnamed for a while because arch 14 never seeks them: the touch hit map is
  arch 12 only and so is the log area's writer. If a slot looks empty on the architecture you are
  reading, check the others before concluding anything about the slot.

## Verification standard

Output here is AI-produced and published as such, so claims are expected to be checkable.
Established norms:

* Prefer two independent samples. The container is validated against sixteen, spanning four
  architectures, four base addresses, three format versions and three pointer table lengths.
  Two samples of one model prove much less than two architectures.
* Prefer an independent numeric closure. The IR carrier finding is confirmed by 38 kHz implying
  a stored 263, which the code's arithmetic turns into exactly 26.25 us.
* When deriving something like a load address, include a calibration case where the answer is
  already known, and report the score for wrong answers too. The base-address test scores 98.9%
  for the correct base against 11 to 30% for wrong ones.
* Record corrections in place rather than quietly fixing them, so readers can calibrate.
* Mark anything unconfirmed as unconfirmed. `docs/config-format.md` does this explicitly.

## Where the work stands

`docs/roadmap.md` is the plan of record and tracks its own progress. Steps 1, 2, 4 and 5 are done,
and step 3 is done as far as the firmware can take it. **This section is a status board, not a
summary of what is known**: that is `docs/findings.md`, 95 sections, and `docs/config-format.md`
for the structured form. Section numbers below are the pointer into them.

**The read path works and nothing has ever been written to a remote.** `GET_VERSION`, `READ_MISC`
and `READ_FLASH` run from our own host code on both bench architectures, a config read matches each
unit's lab dump byte for byte, and all three remotes are fully read and verified against their
backups: user config, application firmware, safe mode, both internal pages, no differences. What is
verified is that each backup is faithful; **restoring from one has never been tried.**

Byte accounting, `make coverage`, zero overlaps everywhere:

| arch 8 | arch 9 | arch 12 | arch 14 |
|---|---|---|---|
| 100.0%<!--fact:coverage_arch8_config_a--> | 100.0%<!--fact:coverage_h525_config--> | 100.0%<!--fact:coverage_one_config--> | 100.0%<!--fact:coverage_h600_config--> |

## What is known, by base slot

Twenty base slots, all accounted for. 0 and 1 are header records, 2 to 17 are named sections, 18
and 19 are NULL in all thirteen containers. `gspm.base_slot` and `gspm.arch_slot` translate, since
arch 8 inserts a NULL at slot 8 and arch 12 inserts that plus a real section at slot 18.

| slot | what it is | sections |
|---|---|---|
| 0 | a `0xFEED` framed tree of state variable names, which say what each variable is for | 20, 77, 86 |
| 1 | seven bytes stating the architecture, the only place the config says it | 20 |
| 2 | the log area: three numbers reserving flash above the config, arch 12 only writer | 47 |
| 3 | the clock. Starts Timer 1, and holds the config's build timestamp | 21, 38 |
| 4 | the firmware event map | 36, 39 |
| 5 | the infrared database: one group per device, then records. Class 5 spells a code from a dictionary | 32, 42, 61, 65, 82, 86 |
| 6 | the mode table. A record carries a screen program, and its entry an array of pages, each with a tagged list and a copy of it | 37, 52, 53, 66, 68, 69 |
| 7 | the font table, indexed by screen opcode 16 | 46, 63 |
| 8 | key press bindings: one leading action list, then every mode page's list | 27, 38, 83 |
| 9 | the binding table: sets of button bindings with an enter and a leave handler | 39, 67, 69 |
| 10 | the action list table | 38 |
| 11 | screen language programs | 40 |
| 12 | the timer table | 43 |
| 13 | the state variable table: a range, and transitions carrying one instruction | 35, 60, 86 |
| 14 | the state value map, indexed by opcode `0x72`'s high byte | 39 |
| 15 | the parameter block: numbered groups of `u16` | 44 |
| 16 | the number sender. Used by no config in the corpus | 39 |
| 17 | the touch screen hit map on arch 12; elsewhere it names the picture bank | 45, 62 |

**Most of a config is pictures**, sections 49 to 55, 62 and 66: one contiguous array from the end of
the named content to the trailer, no table and no count, addressed only by screen opcode 2 inside
mode programs. `u8 kind; u16 stride; u16 rows`, stride in **pixels**, two bytes a pixel on arch 8, 12
and 14 and one bit on arch 9. Walking the array lands exactly on the trailer in all nine containers
that have one, and **every picture in an arch 12 bank is drawn by a program**, 98 of 98 and 70 of
70, with exactly two per container unreached on arch 8 and arch 14.

**Two interpreters, both read.** The action list language, a 120 byte circular queue of three byte
instructions dispatched by binary search on the opcode, section 34. And the screen language, one
byte opcodes, section 40, whose closure is that 21552<!--fact:screen_programs--> programs across the
corpus decode with nothing left over.

## Rails a writer will have to respect

Collected here because they are scattered across a dozen findings and every one of them is a way to
produce a config the remote accepts and mishandles.

* **The trailer checksum is weak**, section 41: a `u16` XOR of little endian words seeded `0x4321`.
  Blind to two transposed words, so passing means the remote will not refuse the file, not that the
  file is right. **Demonstrated rather than argued now**: writing one operand into a mode page's
  list and into its copy leaves the checksum bit for bit identical, because the two edits sit at the
  same word parity and cancel. `packages/codec/test/edit.test.ts`.
* **Base slot 15's group lengths are demanded by the firmware**, section 44. A group whose length
  differs is silently replaced by compiled in defaults. A group index is **not** portable between
  architectures, unlike every other indexed structure here.
* **Base slot 15's entry count** is likewise demanded, 9 on arch 14 and 11 on arch 12: a different
  count gets a silent no-op, not an error.
* **A timer fires one instruction, not a list**, and its duration is clamped to sixteen bits with no
  error, section 43.
* **Infrared duration blocks are shared** between records, section 61, so a writer cannot edit one
  in place without checking who else names it.
* **A record's carrier period is truncated, not rounded**, section 92: it is `floor(1e9 / f)` in
  nanoseconds, so 36 kHz is stored as 27777 and a writer that rounds emits 27778 and differs from
  Logitech's generator by one byte per device. The carrier is per record, not per device.
* **A picture's position is implied by everything before it**, section 55, so inserting or resizing
  one moves every later address.
* **Every mode page's tagged list has a second copy that nothing reads**, section 69, whose position
  is likewise implied rather than stated. An editor that changes a page's bindings has to change
  both, and an emitter that omits the copy still passes every check the remote makes.
* **A section's size is not the gap to the next pointer**, section 36. Slot 4 holds 125 bytes where
  the gap is up to 1532, because slot 5's group arrays sit inside it.
* **The log area's writer refuses out of range rather than erroring**, section 47: an address
  outside `[0x040000, 0x400000)` zeroes the remaining count instead of writing.
* **A glyph and an encoded picture cannot be re-encoded from their pixels**, which the emitter
  found rather than the firmware: several control streams draw the same image, so re-encoding one
  produces a valid file that is not the original. An editor carries every image it did not change
  through byte for byte.
* **A small logical change reshuffles the whole image.** Three arch 8 configs generated ten minutes
  apart differ in 73 to 84% of their bytes. So an editor makes minimal diffs against an existing
  config; reproducing what Logitech's generator would have emitted is not achievable.

## Open

* **`GET_VERSION` field 6**, a compiled in `0x0C` with no reading, and **field 9's accessor**, a
  table read at program `0x020024` whose byte is `0xDE` while the remote reports `0x16`. The other
  ten fields have a reading, section 59 and section 87. The installed image is ruled out as the
  explanation: the One's own flash dump is byte identical to the package there, so what is left is
  what a `TBLRD` does past the on-chip flash, which is a hardware question and not a firmware one.
  Field 6 is narrowed rather than open: it is one of five per image build constants beside the
  firmware version, the software type, the skin and the architecture, and it is `0x09` on arch 9
  where it is `0x0C` on both others.
* **How big the arch 14 external flash is**, 2 MiB by three routes and 4 MiB by concordance's
  architecture table alone, section 87. One read of the 600 settles it and it is written down.
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
* **The physical button map.** Measured as far as USB allows and no further, section 48: a remote on
  USB never runs its application, so the keypad handler never runs. Arch 14 yields the **column**
  only, `(code - 1) mod 4`, and arch 12 yields nothing at all, since sixteen buttons from every
  region of the One share one sense line. Finishing it needs a RAM write to drive the rows, which
  the rails forbid, and **that is not proposed here.** Neither of Logitech's own applications has
  it either, checked on 9 August 2026: a host names buttons and the firmware resolves the name to
  hardware, so no host ever held the map. `docs/host-client.md`.
  **Arch 9 sits below both and needs no census**, section 89: the 525 senses on a single line like
  the One, so a press is not even worth a column, and its matrix falls out of the firmware instead.
  8 by 8, scan code `group * 8 + column` running 1 to 64, and both its configs bind the same 50
  codes, none a multiple of eight and contiguous in the resulting lattice to 57. So **the 525 has
  fifty matrix buttons**, predicted from firmware plus config and then **counted on the remote**,
  which makes it the one architecture where every matrix button is bound and no bound code lacks a
  button.
* **`MCU_ID` is unreachable by construction**, not a task: a PIC18 keeps its device id at `0x3FFFFE`
  and the internal read window is two 64 KiB pages. The arch 12 part number stays inferred.

## Next

Step 8, the contribution probe, exists. **Step 6's action list language is read**, section 73:
both dispatchers, every branch, to the `RETURN`. All twenty base slots were already labelled, so
what is left of step 6 is small and it is measured rather than estimated.

**The number now carries a depth, and that distinction is the point.** Knowing which routine an
opcode reaches is not knowing what it means for a config, and counting the first as the second
reported 100% for a language a tenth of which nobody can name. `packages/codec/src/actions.ts` is
the table, `reading` gives one instruction's, `readingCoverage` gives a config's:

| | share of 97537 instructions |
|---|---|
| meaning | 97.9% |
| placement only | 2.1% |
| no reading at all | 6 instructions, one opcode, `0x6E` |

Against 24.5% with no reading before sections 70 to 74. Per architecture: 98.5% on arch 14, 97.6%
on arch 8, 97.1% on arch 9 and **97.0% on the One**, whose gap section 74 closed. What is left is
mostly one thing, `0x3F` band `0xC0` on arch 12 at 424 uses, and it is hardware state rather than
config structure.

**The two biggest items turned out to be things the remote does, not things a config describes.**
`0x75` is the **beeper**, four tones from 461 Hz to 4.7 kHz, gated by `0x3F` high byte `0xF3`; and
`0x07` high byte `0xF8` **steps a date** held in state variables 3, 5 and 6, which are therefore
firmware defined and must not be reused. Sections 73 and 74.

**Read a dispatcher, not one handler at a time**, and **count who uses an opcode before choosing
which firmware to open**. The second rule is new and it cost three misreadings in one section:
`0x73` and two `0x3F` bands were all read on arch 14 and all used only elsewhere. One query says
which image to open.

Above `0x65` the opcode is the instruction and the binary search at `0x0EC8E` names a handler for
each; `0x80 | n` is one instruction with a five bit field, a write into state variable `n`. **Below
`0x65` the operand carries the rest of the opcode**, in bands: `0x1F` is a register machine, `0x07`
thirteen operations with no argument, `0x0F` peripherals and diagnostics, `0x3F` four bands one of
which is a six byte instruction. **`0x3F`'s bands are the only structure in the format that is not
one table across architectures**, so they must not be ported.

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
bytes belong to base slot 15 and to no group, by position rather than by reading.

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
and appear freely, and the one brand in the repository is from the owner's own sync, section 58.

**What the pool holds is settled too**, section 69: each non slot 9 list is a second copy of one
mode page's own list, the k-th copy belonging to the k-th page in mode table order, identical in
meaning except that opcode `0x7F`'s operand names a different base slot 10 entry holding an
identical action list. Nothing reads a copy, and an emitter must still reproduce it. Section 68 got
this wrong twice by pairing the runs by address rather than by mode table order and by comparing
them byte for byte.

**Arch 8 closed on 8 August 2026 and needed no firmware to do it**, section 75. Its whole
remainder came from one byte: an infrared record header is `12 + 9 * count` with the count at
`+0x0B`, not the flat 21 bytes section 61 read, and 37 records a config carry a second pointer
group. That one number explained three separate gap families at once, 37 short headers, 37
unclaimed blocks and the 37 gaps between them, and none of the counts moves when the config grows
from 234 records to 462.

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
