# Roadmap: from reverse engineering to a Harmony configuration app

This is the authoritative sequence. [plan.md](plan.md) is the earlier proposal this grew out of
and is kept for its arguments, not as the plan of record.

Status, 2026-08-08: steps 1, 2, 4, 5 and 8 are done, and step 3 is done as far as the firmware images can
take it. Both directions of every command are documented, the container codec exists in TypeScript
and is proven equal to the Python one field for field on thirteen samples, and the command layer and
its write rails are written and tested against a scripted remote.

**The read path now works against both bench remotes**, on both architectures, from this project's
own host code: 256 bytes of config flash come back byte identical to each unit's lab dump, live RAM
reads work, and six fields of the version block were predicted before being measured and held.
Nothing has been written to a remote. Two negative results came out of it: reads of internal program
memory restart a remote when the transfer ends in a one byte chunk, and `MCU_ID` is not reachable
through that window. Section 19 of `docs/findings.md` and section 4 of `docs/usb-protocol.md`.

Two container findings landed after that, both corrections rather than additions: the section table
starts at `0x0B` and had been parsed one slot short since the first day, and section slot 3 holds the
config's build timestamp. Sections 20 and 21.

Then the internal read window turned out to be two pages rather than one, which corrected a measured
claim and, on the 600, **completed a firmware image this project has worked around for months**:
70336 bytes, its own checksum verifying, against concordance's truncated 65536. Sections 22 and 23.

Next is step 5, and decision 4 has been revised: the product lives in
[FreeHarmony](https://github.com/dannybloe/FreeHarmony) while the spec and the libraries stay here.
Read the next section before the milestones, because that revision changed what this repository is
for and the milestone list was written when it was going to hold everything.

## What this project is

Three things, and the third one is easy to lose sight of.

**The API.** `packages/usb` against the hardware: connect, identify, read, and one day write behind
the flag. `packages/codec` against the format: take a config apart, and eventually put one back
together. That pair is what FreeHarmony imports, and it is the reason the libraries stay here rather
than moving to the product: they are the specification in executable form.

**The evidence that the API is right.** The documents, the corpus, the golden vectors and one
regression test per documented finding. Analysis here is AI-produced and published as such, so a
claim that is not executable is only an assertion.

**A bench instrument that drives the API.** Rough on purpose, and not a product. It exists because
an API nobody has used interactively is an API nobody knows is usable, and because step 6 cannot be
done without one: polling a running remote's RAM while a human presses every key is not a script you
run once, it is a screen with values moving on it. The first write to the spare remote wants a
finger on a button too, not a test runner.

FreeHarmony is the product built on top: the polished interface, the packaging, and whatever it
grows into. Nothing in this repository waits for it.

## Coverage, and why it is a problem

Everything here is derived from two remotes on a bench and a handful of files. Logitech shipped
rather more than that.

| | count |
|---|---|
| models listed on the harmony-remote-forum comparison page | 42 |
| named models in concordance's skin table | 71, in 120 table positions |
| architectures concordance knows models for | 11 (arch 2, 3, 7, 8, 9, 10, 12, 14, 15, 16, 17) |
| architectures with hardware on this bench | **3** (arch 9, arch 12 and arch 14) |
| architectures with sample files only | 1 (arch 8) |

So the container claims are validated across four architectures and the USB claims across **three**,
out of at least eleven. The third arrived on 8 August 2026 and cost three changes to `packages/usb`,
every one of them an arch 12 assumption written as a universal: section 76. One boundary is already visible without owning anything: the 900, 1000 and 1100
are arch 15 and enumerate as a network class rather than plain HID, so the transport here cannot
reach them at all, never mind parse them.

There is a sharper version of the same point. Logitech's own discontinuation notice of 28 May 2025
names forty models whose accounts it closed, and **not one of them is arch 12 or arch 14**; they
are the older EasyZapper platform, spanning at least six architectures, while the bench holds two
remotes from the platform that came after. `reference/models.md` has the list and the mapping.

That gap is what step 8 exists for.

## Context

`docs/plan.md` is the roadmap that came out of the harmony-decompiler discussion. It treats the
user-facing tool as Phase 6, last, because it was written as an argument for how to reverse
engineer the format. The project owner's actual goal is the opposite way round: a local,
cross-platform, fully self-contained application that reads a Harmony config off a remote,
edits devices and activities, learns new IR codes and writes the result back. The reverse
engineering is the cost of that application, not the deliverable.

This plan re-sequences the work so that every stage produces something usable, and so that the
format questions get answered in the order the application needs them. It also records eight
decisions taken in the planning session, because several of them are one-way doors.

Scope for now is deliberately narrow: the Harmony One (arch 12) and the Harmony 600 (arch 14),
both of which the owner has on the desk. The Harmony 700 2.8 image was the arch 14 reference while
the 600 dump was truncated; the 600's own image is complete now, read off the remote, so the 700
image is a second sample rather than a stand in. Other models are iterated on later.

## Decisions taken

1. **Licence stays MIT.** libconcord and harmony-decompiler are both GPLv3, so their code cannot
   be copied or ported into this repository without relicensing it, which cannot be undone.
   Running concordance as a separate program has no licensing consequence at all, and protocol
   facts (command bytes, length nibble mappings) are not copyrightable expression.
2. **The USB protocol is derived clean-room from the firmware**, which is also what the project
   doctrine already demands: the firmware is the spec. `concordance/specs/protocol.txt` serves as
   corroboration of facts, and concordance itself stays in use as a cross-check oracle and as the
   tool that produces corpus dumps. There are technical reasons beyond the licence: concordance
   has two documented defects on these two architectures, `--dump-firmware` was silently wrong
   for years, and arch 14 IR learning is listed upstream as "believed working" rather than
   confirmed.
3. **TypeScript owns the config codec, Python stays reverse engineering only.** The app-relevant
   Python code is 461 lines today (`ezfile.py` 168, `gspm.py` 180, `firmware.py` 113) and will be
   five times larger in six months, so this is the cheapest moment to move it. The PIC18 tooling
   (`isa.py`, `disasm.py`, `trace.py`, `loadaddr.py`, 694 lines) and the eventual emulator are
   research tools the app never calls. The repository doctrine "never a second opcode table"
   applies equally to config codecs: there will be exactly one, in TypeScript.
4. **Spec and libraries together, product apart.** *Revised. This decision originally read
   "monorepo" and put the application here as well.* The documents, the research tooling, the
   TypeScript libraries and the tests stay in one repository, because a codec in a second one drifts
   away from `docs/config-format.md`, and the rule that a confirmed fact must land as a regression
   test only bites while the code sits next to the documents. The **application** is a separate
   repository, [FreeHarmony](https://github.com/dannybloe/FreeHarmony), AGPL-3.0, consuming these
   libraries as a pinned git dependency until they are stable enough to publish. The line runs
   between library and product, not between documents and code. See "The two repositories" in
   `CLAUDE.md`.
5. **Hardware in the loop first, emulator deferred.** The emulator remains the right tool for
   activity semantics, but it is the largest single build in the plan and the app would sit
   behind it for months. The cheap substitutes are a byte-identical round trip, a read back and
   diff after every write, IR cross learning between the two remotes, and live RAM polling over
   USB.
6. **Safety rails are absolute.** Firmware is never written. The spare Harmony One
   is the only write target. Details below.
7. **Heads down on our own derivation.** The findings in harmony-decompiler discussion #1 are
   treated as hypotheses to test, not as facts to adopt. The original format designer
   (`glenharris`) is active there and is a privileged source, but asking is held in reserve for
   when we are genuinely stuck.
8. **Version 1 of the app is read only.** Detect the remote, read the config, show the container
   and the labelled sections, export IR codes. The write code is written but sits behind a flag
   that is off in release builds.

## Facts established during planning

* Arch 12 and arch 14 both use the plain non-z-wave HID class in libconcord, 64-byte reports in
  both directions. `node-hid` and Python `hidapi` both cover Windows, macOS and Linux. Linux
  needs a udev rule either way.
* The command set is small: `GET_VERSION 0x10`, `WRITE_FLASH 0x30`, `WRITE_FLASH_DATA 0x40`,
  `READ_FLASH 0x50`, `START_IRCAP 0x70`, `STOP_IRCAP 0x80`, `WRITE_MISC 0xA0`, `READ_MISC 0xB0`,
  `ERASE_FLASH 0xD3`, `RESET 0xE1`, plus a length nibble whose mapping is non-linear and differs
  between mode 0 (safe mode) and the other modes.
  **Now derived from the firmware**, with two differences from the list above: the dispatch is on
  the high nibble, so `ERASE_FLASH` is `0xD0` and `RESET` is `0xE0` with a sub-command byte, and
  `STOP_IRCAP 0x80` is not dispatched at all in the idle table. The mapping is `0` to `7`
  literally, then `8`, `9` and `A` to 15, 31 and 63. Safe mode is a separate firmware and
  unchecked.
* `READ_MISC`/`WRITE_MISC` carry a `MISC_RAM 0x06` sub-command, exposed upstream as
  `ReadRam`/`WriteRam`. **Live RAM of a running remote is readable over USB.** The header also
  defines `MISC_QUEUE_ACTION 0x03` and `MISC_QUEUE_EVENT 0x09`, which concordance never uses;
  whether the firmware services them is an open question worth answering, because event
  injection would let us drive the remote from the host.
  **Superseded in part.** The RAM read is confirmed on arch 14 and **its selector is `0x07`, not
  `0x06`**: see `docs/usb-protocol.md`. Read `0x06` above as the upstream claim it was, not as a
  fact about these remotes. The queue sub-commands are still open.
* Our parsers reject the two extra sample sets: `gspm.parse` and `ezfile.decode_payload` hardcode
  the `GSPM` magic, so `AHCM` (arch 9, Harmony 525) and `TPTP` (arch 8, 720/785/88x) both fail.
  The claim in `docs/config-format.md` that the container is shared across architectures is
  therefore currently untested against the two architectures that would best prove it.
  **Done in step 2.** The container is now general and the claim held.
* Five extra config samples are available in the sibling `harmony-decompiler/samples` checkout,
  already published with permission, `UserId` 0, no account data: four arch 8 and one arch 9.
* Three of the four arch 8 configs were generated within about half an hour of each other, per
  their own build timestamps, and still differ in 73 to 84 percent of their bytes, first
  difference at offset `0x000004`. **A small logical change
  reshuffles the whole image.** Consequence for the app: byte-identical round tripping is
  achievable, but reproducing what Logitech's generator would have emitted is not, so the editor
  must make minimal diffs against an existing config rather than regenerate one.
* The keypad scanner at `0x190A6` returns a linear index, 1 to 56, rows active low. Polling the
  RAM variable that receives that index, over USB, while a human presses each key, is a route to
  the button mapping that upstream's three failed attempts did not try. Supporting evidence that
  the scanner keeps running while USB is attached: upstream observed a key press toggling a
  backlight boolean. **Update since:** the experiment got cheaper, because the config's key codes
  turn out to carry that linear index directly, so there is no translation layer to find first.
* Upstream reports a config interpreter in firmware, an accumulator machine at `0x01C86` to
  `0x02401` on their architecture, so action lists are bytecode rather than data. Their claimed
  key chain is physical button, scan code, event code, key table, action list, IR command, with
  event type in the top bits (`0x80` press, `0x40` release, `0xC0` repeat). **The event type part
  is confirmed on arch 12 and 14**, section 17, and it replaced our own wrong reading of the code
  as a matrix address. The key table is **not** the link to the action list, though: it is byte
  identical across a pair of configs whose buttons were reassigned, section 16. Action lists
  themselves are found, at base slot 10; their opcodes are not.
* The format's designer stated the pointer table "is probably pointing to data for each of the
  various subsystems (IR sending, state variables, menus, action lists etc)". Treat as a prior
  for section labelling, not as an answer.

## Target repository shape

```
src/harmony/            unchanged: PIC18 disassembler, tracer, load address, emulator later
tools/                  unchanged: reverse engineering command line
packages/codec/         TS: EZHex container, GSPM/AHCM/TPTP, records, round trip compiler
packages/lab/           TS: locates the private lab directory, so TS tests can skip cleanly
packages/usb/           TS: HID transport plus the Harmony command protocol
tests/                  Python reverse engineering tests stay; TS tests live with their package
docs/                   plus docs/usb-protocol.md and this roadmap
```

No `apps/` directory. This plan named `apps/studio` when the application was going to live here;
per the revision to decision 4 it is FreeHarmony, a separate repository, and the `apps/*` glob is
out of `pnpm-workspace.yaml`.

Conventions: pnpm workspaces, `.nvmrc`, TypeScript strict, and **Node's own test runner rather
than `vitest`**, which this plan named until the dependency tree was actually looked at. `vitest`
installs 71 packages including `vite`, `rolldown`, `lightningcss` and `postcss`, a CSS toolchain,
to run tests that read bytes out of firmware images. Node 24 runs TypeScript test files directly
by stripping the types, so the whole tree is the compiler and its type definitions: three
packages, and `make audit` reports on them. The cost is real but small: type stripping cannot
erase enums, namespaces or parameter properties, so `erasableSyntaxOnly` is on and the compiler
refuses them, and `node:test` has no skip-from-inside-the-test, so `packages/lab` returns a skip
option instead. Revisit if FreeHarmony wants a browser-side runner; that is a decision for the
repository that needs it, not for this workspace.

TS tests that need real dumps resolve `../lab` or `HARMONY_LAB` and skip cleanly when absent,
mirroring `tests/lab.py`. The two fixture tables are asserted equal, because a golden vector the
other suite cannot find is a test that passes without checking anything. Fixtures never enter
git; checksums go in `reference/checksums.md`.

**Every dependency is pinned to an exact version**, with no `^` or `~` anywhere, and
`pnpm-lock.yaml` is committed on top of that. A range hands the choice of which bytes get
installed to whoever published most recently; a lock file narrows that but does not close it,
because any `pnpm add` moves the range. Pinning makes a dependency update a reviewable diff. No
dependency is added without looking at what it pulls in: that is what rejected `vitest`.

## Milestones

These were written when this repository was going to hold the application too, so each one now says
which side of the split it belongs to. **Here** means the API and the evidence and the bench
instrument; **FH** means the product.

**M0 Infrastructure. Done. Here.** Corpus widened to four architectures, container generalised
across all of them, the workspace standing with the codec ported and proven equal by golden vectors,
and the USB command layer written from the firmware with its rails.

**M1 Read path. Done. Here.** The reading itself is measured rather than planned: whole configs come
off all three bench remotes byte identical to their own dumps. ~~What remains is filing every read
into the corpus automatically, and a bench instrument.~~ **Both exist**, `packages/corpus` and
`packages/bench`, and step 5 below records them as built and run against both architectures; this
paragraph said "Next" for longer than it was true. FH will have its own interface over the same API;
that is not this.

**M2 Round trip codec. Here. Two of its three parts are done on both target architectures and the
third round trips.** Decompile
and recompile byte-identical across the whole corpus, and the trailer checksum reproducible. This is
the gate for any editing at all, and it is squarely an API milestone.

Of the three parts below, **the first two are complete for arch 12 and arch 14**: every reader
reports its extent and the accounting reaches 100.0% with no overlaps, 24 bytes short on a Harmony
One and 41 on a 600. Arch 9 is not there, and its remainder is infrared, on an architecture no
firmware image exists for. Arch 8 is there as of section 75.

**The third part exists and round trips**, `packages/codec/src/emit.ts`, and `make emit` is its
number. Every structure `coverage` claims is rebuilt except one, the output is byte identical to
the input on all seventeen containers, and what is left to copy is 198 to 2367 bytes of a config
rather than the whole of it.

**Three numbers, not one.** `framed` bytes are computed from typed fields, `carried` bytes came out
of a reader as an opaque run, `copied` is what no rebuilder claims. Collapsing them is how an
emitter that copies a config claims to rebuild it, which is the mistake `actions.ts` made with its
own numbers and the reason that file reports a depth.

The rows name samples rather than remotes, so each one reads the same as the fact marker beside it,
and so this table cannot be mistaken for the coverage one below by anything looking for a row.

| sample | framed | what is carried |
|---|---|---|
| `one_config`, arch 12 | 13.4%<!--fact:framed_one_config--> | 1.45 MB of picture and glyph bodies |
| `h600_config`, arch 14 | 28.1%<!--fact:framed_h600_config--> | 529 KB, the same |
| `h700_config`, arch 14 | 25.9%<!--fact:framed_h700_config--> | 724 KB, the same |
| `arch8_config_a` | 21.6%<!--fact:framed_arch8_config_a--> | 348 KB, the same |
| `h525_config`, arch 9 | 27.7%<!--fact:framed_h525_config--> | 31 KB, and 26 KB still copied: class 5 infrared |

**Carried is not a shortcut, it is a rail.** A glyph and an encoded picture decode to pixels, and
pixels do not determine the bytes back: the encoder chose where to skip and where to emit literals,
and several encodings draw the same image. Re-encoding one produces a valid file that is not this
file, so an editor has to carry every image it did not change through verbatim.

**Whether those bytes should ever become framed is a real question and it is open.** Moving them
needs either a reader that returns the **control stream** rather than the pixels, which is
determined and would round trip, or an encoder, which is not and would not. Neither adds
understanding: what a picture means is already read, section 50 and section 54, and the number
would move by 60 to 80 points while nothing became clearer, which is the inflation the depth split
exists to prevent. What does depend on it is **editing an image**, since a carried body is one
this codec can reproduce and cannot change. So it is a product question rather than a format one,
and it is not scheduled here.

**One structure is not rebuilt at all, and finding out which was worth the exercise.** Base slot 0,
the `0xFEED` frame. The accounting counts it because the frame states its own length, and no field
inside it has ever been read, so `coverage` reports 100% of a Harmony One config attributed while
277 of those bytes are understood only as far as "this many of them". The emitter is what makes
that difference visible, and `emit.test.ts` asserts the leftover set is exactly that one name.

**Measuring it first changed what it is.** The obvious reading of M2 is "write an emitter", and it
is wrong: an emitter can only rebuild what a reader can attribute, so the first question is what
fraction of a config is attributed at all. `packages/codec/src/coverage.ts` answers it and
`make coverage` prints it. Where it started on 7 August 2026, and where the first two ports took
it the same day:

| sample | at the start | readers ported | mode records, 53 | opcode 23, 54 | the bank, 55 | infrared, 61 | arch 9, 63 to 65 | pages, 66 | slot 9, 67 | the pool, 67 | header groups, 75 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Harmony 700 | 11.4% | 26.3% | 59.3% | 87.8% | 91.9% | 98.1% | 98.1% | 99.5% | 99.6% | 100.0% | **100.0%<!--fact:coverage_h700_config-->** |
| Harmony 600 | 9.5% | 24.8% | 57.5% | 86.4% | 87.4% | 98.7% | 98.7% | 99.6% | 99.7% | 100.0% | **100.0%<!--fact:coverage_h600_config-->** |
| Harmony One | 3.2% | 8.0% | 8.6% | 47.9% | 90.0% | 98.0% | 98.0% | 99.6% | 99.8% | 100.0% | **100.0%<!--fact:coverage_one_config-->** |
| Harmony One, spare | 3.2% | 7.5% | 7.9% | 54.5% | 97.0% | 98.6% | 98.6% | 99.8% | 99.8% | 100.0% | **100.0%<!--fact:coverage_one_config_unprogrammed-->** |
| 880, arch 8 | 3.6% | 16.4% | 50.6% | 80.2% | 82.2% | 94.4% | 94.4% | 97.0% | 97.2% | 97.7% | **100.0%<!--fact:coverage_arch8_config_a-->** |
| Harmony 525, arch 9 | 7.2% | 10.4% | 14.1% | 14.1% | 14.1% | 14.6% | 55.1% | 64.1% | 65.1% | 66.4% | **67.1%<!--fact:coverage_h525_config-->** |
| the three safe mode containers | 4.2% | 70.2% | 89.5% | 89.5% | 89.5% | 91.8% | 91.8% | 98.2% | 98.4% | 99.4% | **99.4%<!--fact:coverage_h700_gspm-->** |

**Only the last column carries a `fact:` marker**, and that is the rule rather than an accident: a
historical column is a fixed number and the live one is recomputed from the corpus. Putting a marker
on a history column makes `make facts-write` rewrite the past, which is exactly what happened to
this table for one commit.

The sixth column is two readers landing the same day: base slot 13's records, found by asking the
deliberately built config pair of section 58 one question, and the infrared records, whose header
points **backwards** at duration blocks below it. Its length was read as a flat 21 bytes and is
`12 + 9 * count`, section 75, which is the last column.

**The last column is one byte.** An infrared header states how many nine byte pointer groups it
carries, and 37 records a config on arch 8 carry two. That closed arch 8 outright, from 97.7% to
100.0%, and moved arch 9 as well, and it needed no firmware: the reading came from the corpus, out
of three gap families whose counts were all 37. Section 75.

**The seventh column is where "arch 9 barely moves" stopped being true**, which this table asserted
for a day. Three findings on 7 and 8 August: its glyphs are two bits a pixel rather than two bytes,
one missing operand count was hiding every one of its mode programs, and its infrared records share
class 1's header. Nothing else moved in that column, and the reading at the time was that the other
architectures were at the ceiling. **They were not**, which the eighth column says: base slot 6's
entry had a page count and an array of pages nobody had read, and following them moved every
architecture at once. What looked like a ceiling was one unread field.

Neither the fourth nor the fifth column is a reader. Section 53 is one rule, that a mode record
carries its own screen program, and section 54 is two corrections: opcode 23 takes no operand, which
is what was holding arch 12 shut, and a picture's `stride` is in pixels rather than bytes, which had
halved every raw extent. Together they take the region from an unknown to **98% pictures on a
Harmony 600, 93% on a 700 and 97% on arch 8**, with the Harmony One at 48% and left as the open
item. Section 66 closed that one: every picture in an arch 12 bank is drawn by a program that can be
reached, 98 of 98 and 70 of 70.

Lower than the sixteen named sections suggest, and the reason is the shape of the file rather than
a gap in the analysis. Most of a config is a **pooled data region** that the sections index into,
and the readers return values without returning the bytes they consumed. Every screen program in
the corpus decodes with nothing left over, section 40, and not one of them can yet say which bytes
it occupied.

So M2 is three things in order, and only the third is the emitter:

1. **Readers that report their extent.** The size rule has to live in the reader that already
   computes it, never in the accounting beside it, for the same reason there is one opcode table.
   `pointerArrayAt` is the pattern: `pointerArray` is that function with the extent dropped.
2. **Coverage as the number**, which is also a check. Two claims on one byte means one is sized
   wrong, and that is invisible in a reader's own tests, because values read from slightly the
   wrong span still look like values. The corpus reports no overlaps today and the synthetic case
   in the test proves the detector works.
3. **The emitter**, rebuilding what is accounted and copying the rest, with byte equality as the
   test. The copied residue shrinks as coverage rises, so progress is measurable at every step
   rather than only at the end.

   **The residue is copied by name, into a buffer filled with poison.** The obvious version starts
   from a copy of the input and overwrites what it rebuilds, and that version passes its round trip
   test whether or not the emitter writes anything, because the right bytes are already there. So
   equality alone proves nothing and the tests that carry weight are the negatives: a rebuilder
   whose bytes do not fill the extent it declared is an error rather than a short write, a section
   address and a key record changed in the parse reach the output, and a flipped payload byte moves
   the trailer checksum, which is what says the checksum is computed rather than copied.

   The buffer still starts as `0xA5` rather than as a copy of the input, which was the guard while
   the residue was a single named span. Now that the residue is the complement of the rebuild list,
   poison cannot survive a correct run, and what it protects against is narrower: a rebuild that
   marks bytes written without writing them.

Ported: the header, the section table, the marker, the trailer, the key table, slots 0, 1, 2 and
3, the six counted pointer arrays, the action lists, and then the two that carried the mass, the
**screen language** and the **font table** with base slot 14 alongside them because its lookups
supply half the screen programs' entry points.

**Those two proved themselves by arithmetic rather than by golden vectors**, which is worth more.
Section 40 states 21503<!--fact:screen_programs--> programs across the corpus and section 46 states 3933<!--fact:glyphs_two_byte_pixel--> glyphs and 54107<!--fact:string_codes_two_byte_pixel-->
resolving string codes, all three produced by `src/harmony/gspm.py` and published before this port
existed. The TypeScript readers reach the same three numbers. A vector file compares an
implementation against a recording of itself; this compares two implementations against a number
that was already in the document.

Still to port, in rough order of mass: the mode table (base slot 6), the binding table (base slot
9), the infrared records (base slot 5), the number sender, the state table, the timers, the
parameter block, the touch map and the firmware event map.

**Five of those have landed**, in `packages/codec/src/sections.ts` and `src/ir.ts`: the firmware
event map, the mode table, the binding table, the state variable table and the infrared database,
each held to the figures Python already published. Two of them raised a question rather than a
number. **A base slot 5 record has no established extent**, so the located duration run is a
heuristic and claiming it puts one or two runs per config on top of an action list; only the group
arrays are claimed. And **every mode entry in the corpus reads as the wide tagged list form with
the longest at 255 entries**, exactly where a `u8` count saturates, so claiming their extents
overlaps base slots 5 and 10 by hundreds of bytes. Both were found by the overlap detector rather
than by reading the code, which is the argument for having built it.

**The timer table, the parameter block and the touch map followed**, in
`packages/codec/src/tables.ts`, and with them **every reader Python has is now in TypeScript** bar
one: base slot 16, the number sender, whose count is zero in every config in the corpus, so a port
would add no bytes and be exercised by nothing. The touch map is what moves the Harmony One, from
7.7% to 8.0%, because it is the only remote here that carries one.

So the port is done and the ceiling is where section 49 said it would be. **Coverage stops in the
mid twenties on arch 14 and at 8% on arch 12, and the region is the whole of the difference.** The
next thing M2 needs is not another reader.

**The region is one contiguous array of pictures**, sections 51 to 55. Section 51 measured the
geometry off the bytes, 176 pixels by 220 rows on arch 12; section 54 found the format states it;
section 55 found that the pictures nothing addresses sit in the same array as the ones that do, and
that walking it lands exactly on the trailer in all nine containers that have one. There was never a
second referent.

**What is left is arch 9 and the low part of a config**, not the region. *This used to add that the
525 sits at 14.1% and that only 43 of its 114 mode records decode, "so its record tail is a
different shape". The tail is not a different shape at all: section 64 found one missing operand
count, and it is 114 of 114 and 55.1%. An architecture that will not decode is worth suspecting the
reader for before the data.*

**And the accounting immediately found the thing that caps M2.** `docs/findings.md` section 49:
most of a config is one region at the top of the file that no named section reaches, 62% of a
Harmony 600 and 82% of a Harmony One, and it is not padding. Screen opcode 2 is its only known
referent and every target it names lands there, in every container that emits one; the containers
that emit none were taken to have no such region.<!--superseded--> So porting the remaining twelve
readers takes coverage to roughly 35% and no further, and **decoding that region is what M2
actually needs next.**

*Half of that closure did not hold, and the "roughly 35%" did not either.* Section 62 found four
pictures in the 525's config regardless, named by base slot 17, and section 64 found the opcode 2
instructions that draw them, inside mode programs nothing could reach at the time. Only the three
safe mode containers really have no region. The ceiling went too, once the region turned out to be
pictures rather than something a reader could not attribute.

**Opcode 2's handler has now been read, and it does not explain the region.** Section 50: the
instruction draws a bitmap with a five byte header that states its own size, and the sizes are 125
to 885 bytes, 3 to 16 per config. All sixteen of the Harmony One's come to under seven kilobytes of
its 1.37 MB region, which is why the column above hardly moves. Three follow-up measurements came
back negative and are recorded so they are not repeated: the bitmaps do not tile, the region's only
ascending pointer-shaped runs are misaligned reads of base slot 10's array, and the bytes are
suggestive of pixels without being a decode. **The next move is to find the second referent**, by
sweeping addresses out of the sections that are decoded but whose record fields are not all named,
rather than to read more of the dispatcher.

**M3 Offline editor. FH.** Edit understood fields, minimal diff against the original, every change
validated by recompiling. The codec support for it is M2 and lives here; the editing experience does
not.

**M4 Writer. Both.** The write path, its rails and the read-back-and-compare belong to the API and
therefore here, first exercised on the spare Harmony One through the bench instrument. The user
facing "write my config" is FH.

**M5 Learning. Both.** IR capture over USB and the encoder from raw timings to a config record are
API. The learning interface is FH.

**M6 Authoring. FH**, on top of the action list bytecode, which is M2 territory and comes from here.

## Work sequence

### Step 1: corpus and provenance. Done

* The five public samples are in the lab as `dumps/guyman70718/harmony-88x-arch8/` (four arch 8
  configs) and `dumps/trelowney/harmony-525/` (arch 9), each with a `META.md` recording
  contributor, source, permission status and the device details read out of the file itself.
  Checksums match the upstream `SHA256SUMS.txt` and are recorded in
  `reference/checksums.md`.
* `tools/corpus.py` now accepts a dump directory that has a `META.md` and a config but no
  concordance identity output, taking the device details from the config's own XML header. The
  corpus reports 5 dumps over 4 architectures, with the arch 8 set correctly flagged as having
  no recorded description.

Still open from this step: all three `lab/dumps/danny/*/META.md` record "Publishing the dump
itself or its contents: no". If any of those dumps has since been shared publicly, the META files
are stale and need correcting, because later policy decisions read them.

### Step 2: generalise the container. Done

* `src/harmony/gspm.py` works from a family table (`GSPM`/`PTYY`, `TPTP`/`DKDK`, `AHCM`/`MCHA`)
  rather than one hardcoded magic, and derives the marker after the pointer table from the data.
  `src/harmony/ezfile.py` gained `parse_ezhex`, which splits a config on its declared
  `BINARYDATASIZE` and verifies the `0x69`-seeded XOR `CHECKSUM` and the `INTENDEDVERSION` block.
* Result: thirteen samples, four architectures, five base addresses, three format versions, three
  pointer table lengths, all consistency checks passing. The container claim in
  `docs/config-format.md` is no longer a claim about two models.
* A Harmony 700 config arrived afterwards, which gave arch 14 a second sample and, more to the
  point, a config from the same model as the arch 14 firmware image. Two findings came out of
  it, in `docs/findings.md` section 15: **a config states its own architecture** in section slot
  1, needed because `GSPM` covers both arch 12 and arch 14 and a config read over USB has no
  file header to consult; and slot 0 is the container's **only** `0xFEED` frame, which corrected
  an earlier claim here that every section was one.
* Findings that came out of it, written up in `docs/findings.md` section 14 with tests in
  `tests/test_gspm.py`: `WLWL` on arch 8 is the same key table as `LWJL`; arch 8 and arch 12
  share 47 codes in identical order apart from one transposition, which suggests the key order
  is canonical across the family; `format` is not an architecture identifier, since arch 9 and
  arch 14 both carry `0x1400`.

### Step 3: the USB protocol, clean room

**In progress.** `docs/usb-protocol.md` exists and holds the transport in full plus the
command layer's structure. Done so far, all of it against three images rather than the two
this step asked for, the truncated 600 dump having turned out to reach far enough for the
protocol code:

* The transport, quoted from the descriptor block: two interrupt endpoints, IN on 1 and OUT
  on **2**, 64 byte reports each way, no report ids, vendor usage page. `harmony/usbdesc.py`
  and `tools/usbdesc.py` read it out of any image.
* `bcdDevice` carries the skin in BCD, which is the only thing that separates a 600 from a
  700 before a config is read, since both are product id `0xC122`. Load bearing for the
  write rail that requires `INTENDEDVERSION` to match the connected remote.
* The endpoint setup: `UCFG`, `UEP1`, `UEP2`, no ping-pong buffering, and the two report
  buffers at `0x0428` and `0x0468`.
* The command entry point, the dispatch table for seven commands in all three images, the
  state machine the dispatch is gated on, and the non-linear length nibble mapping.
* Two new tools that this step needed and the project lacked: `tools/pic18_xref.py`, which
  answers "what calls this routine" where `pic18_trace.py` answers "what touches this
  variable", and `harmony/pic18/chains.py`, which decodes the compiler's `XORLW` switch
  chains correctly.

Still to do, in the order the application needs them:

* Per command request and response layouts, which means reading the main loop's state
  handlers rather than the packet parsers. `READ_FLASH` first, since the read path is what
  version 1 of the application is.
* **Two cheap ways to stop depending on the 700 image for arch 14.** The Harmony 700 is not
  on the bench, the Harmony 600 is, and the 600 is also arch 14, so hardware testing was
  never the problem. The problem is that the 600 dump is truncated at `0x19000`, which is why
  a remote nobody here owns is the arch 14 reading reference. It turns out to matter less
  than it looks: the command parser and the USB device layer are both **below** the cut, so
  every protocol claim above was derived from the 600's own firmware as well. What rests on
  the 700 alone is everything above `0x19000`: the descriptor block at `0x1B7C6`, the
  interrupt service at `0x1AD80`, the SPI primitive at `0x1B9AC`, the keypad scanner at
  `0x190A6`, the infrared modulator at `0x194A4` and the reset combination at `0x19120`.
  1. **Done.** The 600's live descriptors were read, enumeration only, no handle opened and no
     transfer sent. Predicted `bcdDevice 0x1071` and got it; the 33 byte HID report descriptor
     came back byte for byte identical to the 700 image's; and the endpoint descriptors match
     field for field including the asymmetry, IN on 1 and OUT on 2. So the transport rests on
     hardware now rather than on a proxy, and the 700 is a sound proxy this far.
     `docs/findings.md` section 19, `tools/usbprobe.py`, and the `probe-remote` skill for the
     method and the rails.
  2. **Look for a Harmony 600 firmware package.** The archive has only the One 3.4 and the
     700 2.8. A 600 `.hfw` would give an untruncated image of the exact model on the bench
     and retire the proxy outright, which is cheaper than any amount of careful reasoning
     about whether the 700 is representative.
* **Answered, half of it.** `READ_MISC` services exactly four selectors, and the one that reads
  an arbitrary data address through `FSR0` is **`0x07`**, not the `0x06` libconcord's header
  calls `MISC_RAM`. So live RAM of a running remote is readable over USB, which is what replaces
  the deferred emulator, and the upstream number would have read the wrong thing while still
  returning a plausible byte. `MISC_QUEUE_ACTION` and `MISC_QUEUE_EVENT` are writes and are
  answered too, and negatively. `WRITE_MISC`'s selector chain is at parse time and services nine
  selectors. `0x07` **writes** an arbitrary data address, the mirror of the read, which is now in
  the rails. `0x09` is accepted and does nothing, and `0x03` is not serviced, so on upstream's
  naming there is **no event injection** on arch 14 and the button mapping experiment stays a
  human at the keypad.
* **Answered in shape.** `READ_FLASH`'s top address byte is the selector. Below `0x20` is the
  external config flash over SPI. `0xFE` and `0xFF` reach **internal program memory** by table
  read, which is where a PIC18 J-series part keeps its device id and configuration words, so that
  is the route to the `MCU_ID` that would measure the arch 12 part number instead of inferring it.
  *It is not: the window is two 64 KiB pages and a PIC18 keeps its device id at `0x3FFFFE`, so this
  was closed as unreachable rather than answered. See the entry further down.*
  Anything else is refused. **Both are pages rather than one selector and a dud**, and it is `0xFE`
  that maps from program address zero; `docs/usb-protocol.md` has the measurement. The four named
  PROM types do not map one-to-one onto what arch 14 implements.
* **Done for the 600.** The first deliverable of our own read path was a complete firmware dump of
  the bench remotes. The 600's is read: 70336 bytes across both internal pages, where concordance
  truncated at 65536 and lost the entry point. It is not believed because the reader says so, it is
  believed because the image's own header checksum verifies over all 70336 bytes and the 65534 bytes
  the truncated dump can also express agree byte for byte. `docs/findings.md` section 23. The One's
  internal memory reads the same way and has not been swept in full yet. `MCU_ID` turned out not to
  be reachable through this path at all, so the arch 12 part number stays inferred. Read only
  throughout, and none of this replaces the archived `.hfw` packages, which cover models nobody here
  owns.
* **Done.** The routine that validates a config on boot is located in both images: the cookie
  check at `0x16492` (700 2.8) and `0x28DAC` (One 3.4), the end marker check at `0x1652C` and
  `0x28E18`. Found by searching for the marker spelled as four `MOVLW` instructions, because
  neither image carries it as text and neither address has a direct caller. One constraint on the
  algorithm came free: the 700 image contains exactly one 16-bit accumulate anywhere, nowhere
  near a config read, so the checksum is not a plain 16-bit sum accumulated that way. Derived in
  step 6.
* Cross-check the documented protocol against a concordance run on the owner's remotes: same
  bytes on the wire, same answers.

### Step 4: the TypeScript workspace and the codec

* **Done.** Stand up pnpm workspaces, `packages/codec`, `packages/lab` as the fixture resolver,
  and the test and typecheck commands. `packages/usb` arrives with the work that needs it, because
  a project with no input files is a build error rather than a placeholder.
  See the conventions above for why the test runner is `node:test` and not `vitest`.
* **Done.** Port the container logic to `packages/codec`: EZHex container, XML header with
  `BINARYDATASIZE` and the `0x69`-seeded XOR checksum, GSPM family header, derived base address,
  derived pointer count, LWJL, pointer arrays, action lists. The `.hfw` reader stays in Python:
  it is a ZIP of firmware regions, which the application never opens, and porting it would mean a
  ZIP dependency or a hand written inflate for files that get read once, by hand, in the lab.
* **Done.** Cross-validate: `tools/golden.py --write` generates one vector per sample from the
  Python parser, and both suites assert against it. Thirteen samples across four architectures
  match field for field, including the three that are not somebody's configuration, because an
  implementation can agree on the ordinary cases and diverge on the degenerate ones. The vectors
  live in the lab directory, not in git: a vector maps a stranger's remote, and publishing a
  checksum is not the same as publishing that. Each side also guards its own half, so the
  reference cannot drift while the comparison keeps passing.
* Retire the Python container parser once the application actually uses the TypeScript one. Not
  yet: `tools/golden.py` generates the vectors from it, and the reverse engineering tools read
  configs through it.
* **Done, except for touching a remote.** `packages/usb` carries the command layer from
  `docs/usb-protocol.md` and the rails, both tested against a scripted remote that behaves the way
  the firmware is documented to: asynchronously, so a host that assumes a reply is already waiting
  fails in the test rather than on the bench. Writes are refused in the library, not in a user
  interface, and the tests are refusals: with the flag off every write path refuses even with
  everything else in order, and with the flag on in a subprocess each remaining condition still
  refuses on its own.
* **`node-hid` is installed and its build script is approved**, by the owner, after looking at what
  it pulls in: two dependencies, `node-addon-api` and `pkg-prebuilds`, maintained under the
  node-hid organisation, no advisories. `pnpm-workspace.yaml` carries the approval with the reason
  next to it, because pnpm blocks dependency build scripts by default and that default is right: an
  install script runs arbitrary code with no review.
* `listHarmony` and `packages/usb/bin/list-remotes.ts` enumerate without opening anything, which is
  the distinction that matters: listing reads what the operating system already knows, opening
  claims an irreplaceable device. `packages/usb/test/hardware.test.ts` is the only test that touches
  real USB, and it skips when no remote is attached rather than passing. Its enumeration tests only
  look; the rest open the device and are gated on `HARMONY_HARDWARE_TESTS=1`. Each asks for its own
  model by product id, so both bench remotes can be attached at once and one session covers both
  architectures.
* **Done, on hardware.** The read path is measured on all three bench remotes: whole configs,
  application firmware and both internal pages, byte identical to each unit's own dumps. The three
  questions this step left open, `READ_FLASH`'s reply code, how the final short chunk is signalled
  and whether the wire count is biased, are answered in `docs/usb-protocol.md` section 4.

### Step 5: M1, the read path and the bench instrument. Done

**The read pipeline. Done, on both architectures.** `packages/corpus`, with `bin/read-config.ts` as
the command. Run against the spare Harmony One and the Harmony 600: 1232237 bytes in 40 seconds and
738149 bytes in 24, both at about 30 KiB/s, and **both byte identical to that unit's stored dump**
with all ten container checks passing. The sidecar carries the version block, the addresses and the
timings. Fifteen tests drive it from a fake remote serving a real config at the address the hardware
would map it at, which is how the address arithmetic is asserted without hardware.

* Read a whole config off a remote and file it in the lab corpus automatically, with a timestamp,
  because a dump taken before an experiment is the only cheap insurance there is. No new
  dependencies: `packages/usb` and `packages/codec` already do the work, and the measured rate is
  about 30 KB/s.
* **Let the data bound the read.** Sixteen bytes at the config base carry `end_addr`, the absolute
  flash address of the trailing marker, so the exact length is known before the bulk read starts.
  On the One that is `0x1D867C` minus `0x040000` plus four, 1672832 bytes; on the 600 `0x0E4361`
  minus `0x030000` plus four, 738149. Both are the known file sizes to the byte. That reads 1.6 MB
  instead of the 3840 KiB the config region spans, and the length checks itself: if the marker is
  not where `end_addr` promised, something is wrong before anything is filed.
* This composes all three packages and writes to disk, which none of them should do, so it gets its
  own small package rather than being bolted onto one of them.

**Then the bench instrument. Built, and running against both bench remotes.** `packages/bench`,
started with `make bench`. Node plus a browser page, not Electron.

* A small Node process serves a page and holds the USB side; the browser is the window. No new
  dependencies, since Node has an HTTP server built in, and it is cross platform for free.
* **A local listening port is acceptable here and not in the product.** "Nothing goes near a
  network" is a requirement on FreeHarmony, enforced there by a content security policy. This is a
  bench tool for one machine, and stretching the product rule to cover it silently would be worse
  than writing the difference down.
* The page is plain DOM modules with no framework and no bundler, `tsc` to native ES modules. That
  keeps the dependency tree this workspace already argued for, and the same modules can be dropped
  into an Electron renderer later, so the work is not thrown away when FH starts.
* First views: what is attached, identity from `GET_VERSION`, a config read with progress, the
  container summary with its ten checks, and the section table whose mostly empty label column is
  this project's real progress bar.
* A visible log of every command sent to a remote. In a project built on restraint, it should be
  possible to see that nothing happened that was not asked for.
* Nothing that writes, and no disabled control that hints at it, until step 6 has a reason and the
  rails are exercised.

The IR extractor stays where it already is, in step 6, with the scope it already has: get the codes
out of a config into documented JSON. **A community device database is a separate idea and is not
designed yet.** It gets thought about properly when FreeHarmony starts.

### Step 6: the first reverse engineering block, section labelling

* Statically: find every RAM location a config-derived pointer is copied into, then find its
  consumers, exactly as `0x3BD`/`0x3BE` was resolved into the IR subsystem pointer. Prior from
  the designer: IR sending, state variables, menus, action lists.
* **Start from the controlled pair, which is in hand with its description.** Both of dmrzzz's
  Harmony 700 dumps are in the corpus, and their owner's written account of the difference is in
  harmony-decompiler issue 9: one new sequence, one reassigned standard button, two new additional
  buttons, no device touched. Written up in `docs/findings.md` section 16. It has already produced
  the three byte pointer arrays, the single pointer table across all four architectures, and two
  negatives worth more than a guess: the key table is not the button to action map, and nothing the
  pointer arrays index is allocated per assignment.
* **First target is the action list opcode table, in the arch 14 firmware.** Base slot 10 is
  established as the action list address table, so the lists are readable now and their meanings
  are not. harmony-decompiler publishes a partial opcode table derived from the arch 9 firmware,
  and our own data says it does not transfer as it stands: arch 14's third most common opcode is
  `0x6C`, which never appears in the arch 9 sample. So this has to be read out of the 700 image,
  and it is the single highest value thing to do while in there.

  **This is now the whole of what step 6 has left, and it is measured.** Every one of the twenty
  base slots is labelled, so section labelling is done; what is not done is the language inside the
  lists. When that was first measured, 56424 of 97537 action list instructions, 57.8%, used one of
  65 opcodes with no reading.

  Four findings closed it. Section 70 read `0x7C`, the most used instruction in the corpus at 21882
  uses: a per device quantity capped at 100 and spelled out above that. Section 71 then read the
  **dispatcher** rather than a handler and took nine opcodes at once, `0x65` to `0x6D`, an
  accumulator machine plus `0x6C`, a write into a per device record. Section 72 did the same for
  the second dispatcher and found the space below `0x65` is not one instruction per opcode at all:
  the operand carries the rest of the opcode, and opcodes under `0x07` do nothing. **Section 73
  read every remaining branch of both dispatchers**, which is where the method paid: the `0x80`
  family and two of `0x1F`'s bands end in the same routine, and that join is only visible if you
  read both rather than one at a time.

  Section 74 then closed the arch 12 gap that measurement had exposed, by applying the rule
  section 73 had just paid three times to learn: count who uses an opcode before choosing which
  firmware to open. The two largest items were not config structure at all. `0x75` is the
  **beeper**, four tones between 461 Hz and 4.7 kHz whose pitch closes against the clock the
  infrared carrier gives; and `0x07`'s `0xF8` band **steps a date** held in state variables 3, 5
  and 6, closed by a thirty day month table and a modulo 12.

  **The number is executable**, in `packages/codec/src/actions.ts`, and it carries a depth, because
  knowing which routine runs is not knowing what an instruction means for a config. **97.9% of the
  corpus has a meaning**, 2.1% has a placement only, and 6 instructions of 97537 have neither. Per
  architecture: 98.5% on the 700, 97.6% on arch 8, 97.1% on arch 9, 97.0% on the One.

  **What is left is not a codec problem.** The largest remaining family is `0x3F` band `0xC0` on
  arch 12, 424 uses, a peripheral selected by operand bits 4 to 8. Hardware state, not config
  structure, which is what the rest of the remainder is too.
* **Second target is section slot 8**, the only section whose size changed under the described
  change. Candidate, not a label: two other sections were rewritten as heavily without changing
  size. Confirm it the proper way, from the routine that reads the pointer, which on arch 14 is
  reachable through the SPI primitive at `0x1B9AC`.
* **Upstream hypotheses worth testing while in the firmware**, from harmony-decompiler
  discussions 5, 6 and 7. None adopted, all cheap to check against our own images: that `LATE`
  bit 2 is the external flash chip select and `TBLPTR` a 24 bit cursor into it (their arch 9,
  our equivalent is the SPI path); that a key event code binds to an action list index somewhere,
  which cannot be the key table because ours is byte identical across a pair whose buttons were
  reassigned; and that the codes carrying no event bits are non keypad event producers, which on
  arch 9 they report as five specific values while ours are `0x06`, `0x07` and `0x2D`.
* Dynamically: poll those RAM slots over USB while operating the remote by hand, and see which
  pointer is live for which on-screen activity or device. This is the poor version of the
  emulator's read trace and it costs a day rather than a month.
* First visible payoff: an IR database extractor, exporting the codes people cannot recreate out
  of configs they already own, into documented JSON in the explorer. **Done, and earlier than
  planned.** It did not need the firmware: base slot 5 turned out to be the infrared database, and
  it was reached by counting the `0x7C` opcode's group index against the section table. Records are
  mark and space durations in microseconds, `tools/ir_extract.py` writes them out, and the closure
  is that the bit count implied by a record's length matches the bit count of the protocol its
  header timings name, for 1365 records with no exception. `docs/findings.md` section 32. What
  remains is the other three infrared encoding classes, and section 42 narrows what that means: a
  record's first byte is its class, all 2858 records on arch 8, 12 and 14 are class 1, and no
  config in the corpus uses another. So the other three are a firmware-only problem with nothing
  to decode against, and the records this reader cannot frame are class 1 as well.
* **The trailer checksum is derived**, from the boot validation routine located in step 3: a
  sixteen bit XOR of the container's little endian words seeded `0x4321`, recomputing on all
  fourteen containers across four architectures. That was the last item on the critical path for
  writing. `docs/findings.md` section 41.
* **Section labelling is at thirteen slots of twenty**, and the newest is base slot 12, **the timer
  table**: a seven byte record holding a duration and the single instruction to queue when it
  expires, started and cancelled by two branches of the opcode `0x1F` ladder. The closure is that
  the set of indices a config's action lists start is exactly `0` to `count - 1`, in all ten configs
  across four architectures, with the three safe mode containers carrying neither. It also yields
  two writer rails: a timer fires one instruction rather than a list, and its duration is clamped to
  sixteen bits without an error. `docs/findings.md` section 43. **Base slot 15 followed**, section 44, and it corrects section 38's
  reading of it: it is the parameter block, numbered groups of sixteen bit constants, and the
  firmware demands the length of every group as well as the section's count. Fourteen such lengths
  are literals in two images and every one holds in all thirteen containers. **Slot 17 followed**, section 45: it is the touch
  screen hit map, populated only on arch 12 because the Harmony One is the only remote here with a
  touch panel, and empty in the other eleven containers, which is why decoding arch 14 first could
  never have found it. **Slot 2 closed the table**, section 47: it is the log area, three numbers
  reserving a region of flash above the config that the arch 12 firmware appends to and never
  erases. All twenty base slots are now accounted for.
* The button mapping experiment was **run and it does not work this way**, section 48. A remote on
  USB sits in sync mode and never runs its application, so the scanner never runs and the variable
  the mapping was to be read from never changes. Checked three ways, including that sync comes up
  before the host sends anything. What the firmware does instead is park all fourteen rows low and
  wait for an interrupt on the column port, which makes the **column** readable and the row not, so
  a press yields `(code - 1) mod 4`.

  All 54 buttons of the Harmony 600 were pressed anyway, because that quarter is permanent and it
  closes against an independent artefact: the census is 14, 14, 13, 13 per column, a column holds
  at most 14, and the unit's own config carries scan codes contiguous 1 to 54, whose two absentees
  55 and 56 sit in exactly the two columns that are short. That checks section 17's key code split
  and section 13's `row * 4 + column` against hardware for the first time.

  **Arch 12 was tried too and gives nothing**, which closes the USB route rather than leaving it
  half open. Sixteen buttons spread across the spare Harmony One all pull one shared sense line,
  and the One image has no per column reader at all, so there is no equivalent quarter to collect.
  What remains is the row on arch 14, 14 candidates per button. The route that would finish it is a
  RAM write to drive the rows from the host, and the rails allow no write target on arch 14, so it
  stays shut.
* **A mode has pages**, section 66, and that is where the last large structure was. Base slot 6's
  entry was read as four bytes and it is `6 + 3 * pages`: a `u16` count and an array of page
  addresses, each page naming a tagged list of its own and a screen program. Found by asking the
  byte accounting for its **whole** gap list rather than the twenty largest it prints, and noticing
  that on all four architectures the leftovers formed two families with the same number of gaps in
  each, which was the mode count. Coverage moves to 99.6% on a Harmony One and a 600, and every
  picture in an arch 12 bank is now drawn by a program that can be reached.

  **What remains is two runs per container**, both after a mode entry: 5854 bytes on the Harmony
  One, 2941 on the 600, 4845 on the 700, against the 268 and 237 separate gaps they replace. That
  is the next thing to read, and it is the same structure on every architecture.

* **Those runs are a pool of tagged lists**, section 67, and reading them takes **both target
  architectures to 100.0%**: 24 bytes unattributed in a 1.63 MB Harmony One config, 41 in a 600,
  zero overlaps anywhere. Base slot 9's sets live in the pool, and the reason they were never
  claimed is settled by a negative: read as base slot 6's shape, `u8 kind` and a `u24` back pointer,
  not one of the 54 sets in the corpus gives an address below itself where all 1616 of slot 6's do.

  The pool is bounded without searching. It begins on the byte after a mode entry's page array,
  which section 66 made a stated quantity, and ends at the lowest address above that which another
  reader already names, with the condition that a run hold at least one slot 9 set on a list
  boundary. That accepts two runs of seven candidates in a Harmony One and two of 206 in the 525.

  **This section first concluded the opposite**, that the pool was not claimable, because the
  picture bank's derivation gives 35 to 1275 candidate starts here. That measurement is right and
  the conclusion was not: the start never had to be searched for, because a mode entry states it.

  What the pool holds is settled, over sections 68 and 69. Each of its non slot 9 lists is a
  **second copy of one mode page's own list**, the k-th copy belonging to the k-th page in mode
  table order, 2906 of 2906 in all seventeen containers with nothing left over on either side. The
  copy is identical in meaning: every field agrees except opcode `0x7F`'s operand, where the two
  indices name base slot 10 entries holding identical action lists, 5861 of 5861 pairs.

  **Nothing reads it.** The tagged list runner has five references on each architecture with a
  firmware, and every one takes its pointer from a page record or a mode entry; reading every byte
  position as a `u24` finds 27 pointers to a copy against 148.8 that chance predicts. An emitter
  still has to reproduce them, and their position is implied by the packing rather than stated, so
  they are a rail rather than a curiosity.

  Section 68 said the opposite on two points, and both were the same mistake: it paired the two runs
  **by address** where the order is mode table order, and it compared them **byte for byte** where
  the difference is one remapped index. The lesson is the one section 67 already recorded, applied
  to a comparison instead of a start: when a structure has a stated order, use it.

### Step 7: keep the documents honest

Ongoing rather than a step, and it applies to every step above: a confirmed fact lands in
`docs/config-format.md`, its reasoning in `docs/findings.md`, and a regression test in `tests/`
or in the TypeScript package's own suite. `CLAUDE.md` and `README.md` state the product goal and
these decisions so a future session does not relitigate them.

### Step 8: the contribution probe, so other people's remotes count. Tier 1 done

The coverage section above is the argument: two architectures of at least eleven, and no way to
learn anything about the other nine without hardware nobody here owns. The probe is how somebody
else's remote becomes evidence. Read only, and it produces one of two things.

**Tier 1, a structural report. Built.** `packages/probe`, run with `make probe` or
`node packages/probe/bin/probe.ts`, with `--file <config>` for a config already on disk so the
output can be inspected without a remote attached. Everything about the shape and nothing about the
contents:

* USB identity: vendor, product id, `bcdDevice` and therefore the skin, the endpoints
* the version block, all twelve fields
* the container header: magic, `end_addr`, format, the recovered flash base, the slot count, the
  marker, and the `spare` bytes
* the section table: per slot the address and the length, **never** the contents
* the outcome of each of the ten container checks, and any parse failure in full

A few kilobytes of JSON, which the contributor can read before sending. It answers the questions
that actually block generalisation: does the pointer table rule hold on arch 10, how many slots does
arch 16 carry, does the USB command layer work at all on a model this project has never seen.

**The point of tier 1 is that it is publishable.** A concordance dump is not: it records what
equipment somebody owns and carries their remote's GUIDs, which is why there is not one in this
repository and why `reference/checksums.md` publishes sums rather than files. A structural report
has nowhere for either to hide, so it can go straight into the corpus, into a test, and into a
document.

**That property is tested rather than promised.** `packages/probe/test/report.test.ts` takes a
sixteen byte run out of every populated section of a real config, serialises the report, and asserts
that none of those runs appears in it, as hex or as an array of numbers. A report that quietly grew
a "first bytes of each section" field would pass every other test in the file and fail that one. Two
things are left out of the USB half on the same reasoning: the device's serial number string, which
`node-hid` offers and `listHarmony` deliberately does not carry through, and nothing else, since the
version block was measured identical on two different Harmony Ones and so describes a model rather
than a unit.

**The probe does not refuse a remote it does not recognise, which is the whole point.**
`packages/corpus` maps a product id onto a config base and refuses anything else, which is right for
a backup and wrong here. The probe instead tries each base this project has evidence for, sixteen
bytes at a time, and accepts any four uppercase letters as a container cookie with an `end_addr`
that lands plausibly above the base. Everything the report states is then derived rather than looked
up: the flash base from `end_addr` and the blob length, the slot count from the marker offset, the
section lengths from the pointers ascending. So an unknown magic still yields a full section table,
and the codec's refusal is reported verbatim next to it, because on a new architecture the refusal
is the interesting part.

**Tier 2, a full dump**, stays what it already is: an explicit, separate act, filed in the private
lab with a `META.md`, exactly as the existing contributions from guyman70718 and trelowney were.
That path needs no new tooling.

**What is not solved.** A stranger will not clone a checkout and build a native module. Tier 1
therefore starts as something for people who can already do that, and shipping a runnable file per
platform is real work that probably belongs with FreeHarmony rather than here. Say so rather than
implying a general audience.

Also unsolved: **no report from an unfamiliar architecture exists yet**, because that needs somebody
else's remote, which is the thing this step is trying to arrange. What is verified is that the probe
produces a correct report for every sample in the corpus, spanning four architectures, and that it
still produces the shape when the cookie is rewritten to a magic no family claims.

## Hardware safety rails

Not optional, and they belong in the code rather than in a document:

* Firmware is never written. `WRITE_FLASH` is restricted to the config region for the detected
  architecture (One `0x040000`, 600/700 `0x030000`) and a write outside it is refused by the
  library, not by the UI.
* The programmed Harmony One and the Harmony 600 are read only in practice. The spare
  spare One is the only write target until a write has been demonstrated repeatable there.
* **There is no spare for architecture 14, and that blocks writing to it entirely.** The spare
  is a Harmony One, so it is arch 12. Writing to the 600 means writing to the only 600 on the
  bench, which the rail above already forbids and which no amount of read-back verification makes
  acceptable. This used to say "with Logitech's recovery servers gone"; see section 56, they are
  not, but a withdrawable service is not a recovery plan either. So arch 14 writing waits for a second
  arch 14 remote, a 600 or a 700, bought used. Not urgent, since version 1 of the application
  is read only, but worth arranging before the moment it is wanted rather than at it: these
  are discontinued devices and the supply only shrinks.
* No write proceeds unless a verified original dump of that exact unit exists in the lab, with a
  matching checksum, and unless the config's `INTENDEDVERSION` matches the connected remote's
  protocol, skin, board and flash id.
* Every write is followed by a `READ_FLASH` of the same range and a byte comparison. A mismatch is
  reported as a failure, not a warning.
* Recovery paths are documented before the first write: the safe mode config already dumped for
  each unit (`*-safe.bin`), and the hardwired reset key combination at `0x19120`.
* Concordance stays available as an independent second opinion, and a patched concordance build is
  treated as read only because the architecture patch also redirects `erase_firmware()`.

## Verification

* `make test`, `make lint`, `make prose`, `make corpus` keep working unchanged; the Python suite
  gains arch 8 and arch 9 container cases.
* `make ts` typechecks and runs the TS suite (`pnpm run typecheck`, `pnpm test`). Every finding
  that lands in `packages/codec` also lands as a test over a lab fixture, and skips cleanly
  without a lab. `make audit` reports known vulnerabilities in the dependency tree, and `make all`
  runs everything but Ghidra.
* Golden vectors shared between the Python and TS suites during the port window, so equivalence is
  proven rather than assumed.
* Round trip harness: for every config in the corpus, decompile then recompile and assert byte
  equality. Report coverage as the fraction of bytes that are decoded rather than opaque, so
  progress is a number.
* USB layer: compare our command traces against concordance's behaviour on the same operation, and
  assert that a config read by us and a config read by concordance are identical.
* End to end for M1: plug in the Harmony 600, run the app, read the config, confirm the container
  summary matches `python3 tools/gspm_parse.py` on the same file.

## Known unknowns, unchanged

* Three of the four IR encoding classes at the dispatcher `0x12F08`. No config in the corpus
  carries one, section 42, so the firmware is the only evidence there will be.
* The encoder from raw learned timings to a config IR record. This ran on Logitech's servers, so
  nobody has it, and M5 depends on deriving it from the four decoder classes.
* Activity semantics. The accumulator machine is read, `docs/findings.md` section 34, and so is
  the second interpreter that draws the screen, section 40; what an entry of the binding table
  corresponds to is the part still open.
* The LWJL difference between architectures, and the translation from the scanner's linear index
  to config event codes.
* Whether the firmware implements event injection over USB.
* **What the log area holds.** Base slot 2 is named, section 47, so the pointer table is complete;
  what remains is what the five append cases record, and why the region is measured in eight byte
  units on the three architectures whose firmware never reads it. Nothing in the corpus appends,
  so this is a firmware only question, like the three unused IR classes above.
* **What the glyph codes mean.** Base slot 7 is the font table and the whole text path is traced,
  section 46: opcode 16 loads `0x398` from the slot, and a string's code minus one indexes it. What
  is left is that the codes are a per config character set, so nothing says code 5 is a space in
  anyone else's config, and a writer that wants to add text has to build a set and number it.
