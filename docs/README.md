# Where things are, and the commands

Moved out of `CLAUDE.md` on 7 October 2026, word for word, so that it is read when it is needed
rather than carried into every session. Where the text says "this file" it means `CLAUDE.md`,
and the rules it argues are stated briefly there.

## Where things go

```README.md                       front page, written for somebody looking for a replacement for
                                Logitech's software rather than for a contributor: what the problem
                                is, what FreeHarmony will be, where the work stands in plain words,
                                and links out for the detail. No architecture numbers, no licence
                                argument, no call for dumps, per decision 10 in docs/decisions.md
docs/status.md                  where the work stands: what reads, what the corpus holds per
                                architecture, the headline findings, what is still open, and what
                                moved most recently. A snapshot, not the plan. The last three
                                sections moved out of this file on 29 August 2026, because carrying
                                them here cost about 12600 tokens in every session to restate
                                claims that live in docs/findings.md with a test each
todo.md                         THE sequence, and the only place it lives: seven numbered chapters
                                as markdown checkboxes, sub-items indented, one line each. Either
                                of us adds, ticks or removes an item. It replaced docs/roadmap.md
                                on 6 September 2026, which was doing four jobs and carried 1121 of
                                its 2404 lines as three separate accounts of what to do next
docs/decisions.md               the numbered decisions, plus what this project is and its
                                context. **The numbers are cited from here, from findings.md and
                                from code comments, so they never change**; a decision that turns
                                out wrong is corrected in place
docs/plans/                     one worked out plan per planning session, NNN-slug.md, each opening
                                with a status line of open, done or superseded. The number is the
                                order it was written and the date lives inside the document, since
                                a date in a filename is wrong the moment a plan is revised.
                                001 is the first proposal, 002 the retired roadmap, kept for the
                                reasoning behind every step taken, and 003 the live plan for
                                chapter 1
docs/findings.md                authoritative technical reference, narrative
docs/config-format.md           the config format spec, structured, for tools to track, ending
                                with the per base slot summary that used to sit in this file
docs/glossary.md                the vocabulary: which terms are Logitech's, which are ours
docs/usb-protocol.md            the USB protocol spec, step 3, transport done, commands open
docs/host-client.md             Logitech's own client as a source: the rule, and the ledger of
                                what is believed on its word alone, all of it unconfirmed
docs/myharmony/             everything about the vendor platform, one subject in one folder since
                                30 August 2026. It was split across docs/ and reference/ before that,
                                which is how half of it went stale without the other half noticing:
                                the listing named types the reading never explained. Danny decided
                                the location; the argument for the old split, read it through versus
                                look one thing up in it, is real and was overruled deliberately
  model.md                      THE reading: what an account holds, every field name, what an
                                activity does, and the vocabularies. **Consult it before naming a
                                field or designing anything about devices, activities or remotes**,
                                here and in FreeHarmony. Decision 14 in docs/decisions.md is why it is
                                here rather than in the lab, and section 218 is the evidence
  model.json                    the schema as data, for a tool to read: 1352 types, 470 service
                                contracts, 366 references, 1291 enum values. Schema only and
                                asserted to be, so no reply, account or identifier is in it
  operations.json               the other half: every operation the platform declares, 298 over 19
                                services, with parameters, reply types, and which entity each one
                                can hand back. Section 219
  entities.md                   every service contract by area with **every field**, 470 of them,
                                marked as its own or inherited. Generated. It gave a field count
                                per contract until 30 August 2026, which made it an index rather
                                than a reference and is why nothing here could answer "what is
                                AbstractActivityAction"
  core-model.mmd                the model drawn: the entities an account actually holds, as a
                                Mermaid diagram. **Generated** by tools/myharmony_model.py and never
                                edited by hand. It draws the **measured** cardinality where the
                                schema cannot state it, one remote per account record, which is
                                section 218's correction
  core-model.pdf                the same cluster laid out by graphviz, `make model-diagram`. A build
                                product, gitignored
  activity-model.pdf            the second drawing, `make model-activity`: what an activity does,
                                its roles and its three kinds of action. It exists because the core
                                diagram names those two types and cannot draw them, neither being a
                                core entity. Also a build product
  model.pdf                     model.md typeset, `make model-pdf`. Also a build product
docs/memory-map.md              memory maps: the addressing rules and the architecture comparison
docs/memory-map-one.md          where everything lives on a Harmony One, derived, one page
docs/memory-map-600.md          the same for the Harmony 600
docs/memory-map-700.md          the same for the 700, entirely unmeasured, a list of what to read
docs/memory-map-525.md          arch 9, predictions written down before the remote arrives
docs/growing-a-config.md        what a length change would move, counted: the stated addresses, the
                                implied positions and the three restamped fields. The survey behind
                                edit.ts's refusal to change a length, and since section 172 also the
                                spec of relocate.ts, the separate entry point that performs it
docs/how-an-activity-is-built.md
                                the anatomy of an activity, written from the factory Harmony One's
                                single activity and then scored against a second and third specimen.
                                Its load bearing claim is that an activity **sets a device's state
                                variables** rather than listing codes, so 424 sends in the corpus
                                are reached through a transition against 12 written inline. The spec of the
                                composer chapter 1.2 asks for
docs/adding-a-device.md         THE checklist for one goal: pick an appliance out of Logitech's
                                catalogue, put it on a Harmony One, press the button and have the
                                appliance respond. Nine phases, each ending in a check that can
                                fail, and the document tracks which are ticked. The write and the
                                button press are behind a gate Danny opened on 25 August 2026
docs/lab-excavation.md          the method for step 9: the seventeen things worth finding in the lab as
                                greppable tags, the register's schema, and the loop per square. Its
                                load bearing rule is that **a catalogue is not a claim and only a
                                claim needs a test**, taken by Danny on 28 August 2026, because
                                demanding a test per row is what keeps the site unexcavated
docs/how-a-harmony-works.md     the operating concept: activities, device mode, the Devices key, what
                                the keypad and the screen each do. Read before designing anything about
                                behaviour, since every other document here is about bytes
docs/review-before-first-write.md
                                the brief for an independent review of the write path, one of whose
                                four jobs is **blind**: a re-derivation from the firmware by a
                                reviewer that has not seen ours. **It carries a withhold list and
                                that list is the operative part**, enforced by
                                TheWriteReviewWithholdListIsComplete, so a new document quoting the
                                transfer fails a test rather than quietly widening what a reviewer
                                may see
docs/predictions-number-sender.md
                                predictions written down before base slot 16 was read, then scored
docs/predictions-arch16-programmed.md
                                eight predictions about a Harmony 350 written before Danny programmed
                                it and it was read, then scored in the same document. Five right or
                                partly so, and the two most useful were wrong: a real configuration is
                                **smaller** than the factory one, and the exact record cover holds on
                                a programmed remote rather than breaking
docs/predictions-sequence-delay.md
                                the same for how a sequence states its delays. **Scored on
                                29 August 2026 and its headline prediction was wrong**: the pause is
                                an opcode inline in the action list rather than something that
                                compiles away, and the unit is tenths of a second. Neither document
                                was named in this map until then, which is how one of them sat
                                unscored for six days after the measurement
docs/predictions-power-hold.md
                                how Logitech's compiler turns a catalogue power press held for a
                                stated time into copies of the code, six compiles in four rounds on the test
                                account's Harmony 650 and 700 records, each predicted before it ran
                                and scored after, for todo L9. The last one is what settled the rule
docs/plans/001-generating-configs.md                    the earlier proposal, superseded, kept for its arguments
docs/emulator-design.md         design for the emulator harness, deferred, not built
src/harmony/                    the research library, see below
tools/                          thin command line wrappers, no logic of their own
tools/ghidra/                   headless script plus extracted branch target seeds
tests/                          one regression test per documented finding
reference/checksums.md          provenance, load addresses, public sample checksums
reference/superseded.md         claims a finding killed, which no document may restate
reference/models.md             the 40 models Logitech retired in 2025, mapped to architectures
reference/capabilities.md       what each model's hardware can do, per skin, with a verification
                                column. Third party and unconfirmed except where that column says
                                otherwise, and `packages/usb/src/models.ts` is the executable form.
                                To be absorbed into reference/remotes/ model by model
reference/remotes/              the per remote technical reference, one folder per model and ten
                                files each: hardware, keys, display, features, behaviour, memory,
                                firmware, usb and misc beside a README. Every fact carries its source
                                and a standing, and what nobody has checked says **not checked** in
                                so many words. Started with the Harmony 650 after a session assumed
                                the Harmony 600, 650 and 700 show a clock, which none of them does.
                                Facts that live in code are **generated** blocks, between
                                `<!-- generated:name -->` markers, by packages/silhouettes/bin/remotes.ts;
                                `make remote-reference` fails on drift. Its README holds the convention
reference/architectures/        what one architecture's models share, stated once and linked from
                                each model folder: harmony-600-650-700/ for arch 14. It carries the
                                architecture's memory layout now, and docs/memory-map-600.md and
                                -700.md keep what is one unit's
reference/silhouettes/          the front face of a model, one SVG per model, **generated** from
                                packages/silhouettes/src/models/<id>.ts and never edited by hand.
                                The geometry is traced from Logitech's own documentation, by hand,
                                which Danny decided on 21 August 2026 against a recorded objection.
                                `.claude/skills/draw-remote/SKILL.md` is the method and holds both
                                the objection and the measurement that outweighed it. A key whose
                                scan code is measured carries it as data-scan and the rest carry
                                none rather than a guess
reference/button-maps.md        which button a scan code is, per model, measured through the account
                                that generated the calibration configs. Partial and honest about it:
                                the scans two buttons share are listed as sets, not assigned
reference/lab-register.md       the lab, artefact by artefact: what each thing is, how deep anybody
                                has been, and which of the excavation's seventeen want list tags it
                                might answer. **A catalogue and not a set of claims**, so it carries
                                no tests of its own, per the rule in docs/lab-excavation.md. Two
                                things about its frame are tested, that every path it names exists
                                and that every artefact in the lab has a row, which is the check the
                                directory level one could not make
reference/concordance-notes.md  the two concordance defects, with patches
reference/ghidra_functions.txt  derived metadata: 521 functions by reference count
bin/setup-ghidra.sh             build or refresh the Ghidra project
bin/lab-register-hook.py        prints the lab register's rows for a path at the moment that path is
                                opened, and interrupts the first touch of each directory so it cannot
                                be scrolled past. The structural fix for a rule written down three
                                times and broken eight, section 213. Fails open by design
bin/finding-gate-hook.py       the same shape for the `finding` skill: interrupts once per session
                                when docs/findings.md gains a section, and points at the two
                                reviewers. Added 6 September 2026 because the gate covers the claim
                                a session knows it is making and not the sentences beside it, which
                                is how section 271 landed a wrong one. Fails open by design
pyrightconfig.json              what pyright checks and, at length, what it deliberately does not
.agents/skills/                 the project skills, as relative symlinks into .claude/skills/, so a
                                second agent runs the same rituals rather than a copy of them. All
                                eleven skills are there. `py-lsp` and `ts-lsp` are there too, as real
                                tracked directories rather than symlinks, which this said they
                                deliberately were not until 29 August 2026. They are a hand
                                maintained second copy of files that point into node_modules, so
                                they are the shape this repository refuses everywhere else and the
                                reason given for excluding them was sound
.codex/hooks.json               the publication check, the lab register hook and the finding gate,
                                wired into Codex's pre-tool hooks. The git hook cannot see a tool
                                call, so the first is the same guard at the other end; the second
                                is the eight occurrence rule made mechanical and the third is the
                                passenger rule; tests/test_toolchain.py fails if either agent's
                                file loses any of them
samples/                        empty by policy
```

The TypeScript workspace, per `docs/plans/002-the-roadmap.md` step 4:

```packages/codec/                 TS: the one config codec, container through compiler. Reading and
                                writing a container, the byte accounting behind M2, the emitter that
                                reads it back, same length edits with their refusals, the screen's
                                text, the renderer, and the infrared frame decoder and encoder
packages/lab/                   TS: finds the private lab directory, mirrors tests/lab.py. Also
                                finds the **public** infrared archive checkout, which is a
                                separate locator on purpose: both make their tests skip when
                                absent and the rules about what may be copied out of each are
                                opposite
packages/usb/                   TS: the command protocol and the write rails, read path measured.
                                Also the **second** protocol, for the file based family openHarmony
                                refuses, and the table that turns a reported skin into a model and
                                its hardware capabilities. The erase and write sequence has **one**
                                implementation, `writeBlock`, and a caller in this workspace reaches
                                it through the `@harmony/usb/write` subpath rather than the barrel,
                                so that a third write caller is a decision visible in a diff
packages/corpus/                TS: read a config off a remote and file it, read a **stated range**
                                and file that, **and put one back**:
                                since section 237 it also holds the config writer, which is here
                                rather than in packages/usb because it needs the container parser
                                to check the one field the remote itself checks. It is the write
                                path's first caller outside that package, which is why the blind
                                review's withhold list gained a row for it
packages/bench/                 TS: the bench instrument, a server plus two pages in web/. The
                                second, ir.html, is the infrared monitor: what a Flirc USB receiver
                                hears, named against the bench remotes' configurations, plus
                                recordings and a test runner whose step lists live in irtests/ and
                                whose runs are filed in the lab. It only listens; never `sendir`
packages/probe/                 TS: the contribution probe, a report with shape and no contents
```

There is no `apps/` here. The application is FreeHarmony, and the workspace globs say so.

**A source file's own header is where its reading lives, not this map.** Until 29 August 2026 the
block above carried about seven thousand characters describing individual modules: what `irframe.ts`
cuts a train on, which two conventions `frameSegments` tries, why `protocols.ts` is generated and a
hand edit to it dies at the next `--write`. Every one of those was already in that file's own
docstring, in more detail and beside the code it describes, so the map was a second copy of a
derivation, which is the state this file's oldest rule forbids. It was cut rather than moved.

So the map says what a package is and the file says what it does. When a module's reading changes,
the docstring is the one place to change; when a package's **purpose** changes, this is.

**Both halves have a language server, and neither is installed on the machine.**
`.claude/skills/ts-lsp/` and `.claude/skills/py-lsp/` are plugin shaped directories whose `.lsp.json`
names `${CLAUDE_PROJECT_DIR}/node_modules/.bin/typescript-language-server` and the same for
`pyright-langserver` outright, so nothing depends on `PATH`. That is why both servers are **exact
devDependencies of the workspace**, `typescript-language-server` at 5.3.0 and `pyright` at 1.1.411:
the path points into `node_modules`, so the lock file decides the version. Seven packages between
them, four of which are Microsoft's LSP protocol libraries, one an optional macOS file watcher, and
no install script to approve. `tests/test_toolchain.py` is what keeps the two halves together, since
a plugin pointing at a dependency somebody removed fails silently.

**Pinning pyright matters more than pinning the other one**, and that is the reason to spend a
dependency on it: pyright's version decides which diagnostics exist, so an upgrade can turn
`make pyright` from zero errors into a dozen with no line of code changed. `make pyright` therefore
prefers the workspace copy, falls back to `PATH`, and skips with a note when there is neither, because
a Python 3 install is still this repository's floor.

**The explicit path was read off a running process rather than reasoned about**, and the first version
of this paragraph had it wrong: it said a plugin's bare command resolves through the project's own
`node_modules/.bin`, which the evidence does not show. What the evidence shows is a server for another
repository on this machine running from that repository's own `node_modules/.bin`, which is exactly
where its `.lsp.json` points. Two mechanisms that produce the same process listing, and only one of
them is what is configured here. `enabledPlugins` in `.claude/settings.json` is empty as a result: an
official `typescript-lsp` or `pyright-lsp` alongside these would start a second server from `PATH`, at
whatever version the machine holds.

Two things make an editor and a script agree, which is the only reason either is worth configuring. The
language server uses the workspace's own pinned TypeScript, so it and `make ts` are the same compiler;
and **`make pyright` runs exactly what `pyrightconfig.json` says**, so a Python check does not exist
only in an editor.

**Pyright's level is an argument, and it is written out in `pyrightconfig.json` rather than here.** The
short version: type checking is off and about a dozen rules that catch what a compiler catches are on
individually, because at pyright's own `basic` mode this code reports 512 errors of which some 500 are
one shape, an inferred `X | None` subscripted by a caller a test has already guarded. Each rule turned
off carries the count it costs and why, so nobody has to re-measure to decide whether to turn it back
on. Two things were genuinely wrong when it first ran and both are fixed: a vestigial `__all__` in
`src/harmony/__init__.py` and a module level loop in `readloop.py` that left its variable bound and
`del`ed it. **Raising it is a project, not a commit.**

**A file no tsconfig claims is not typechecked, and it does not announce that.** `packages/codec`
included `src` and `test` and not `bin`, alone among the packages with a `bin`, so the nine scripts
behind `make coverage`, `make reading`, `make text` and the rest were checked by nothing and a
language server gave them default options. Fixed on 12 August 2026, and it typechecks clean, so
nothing was hiding in there. When adding a directory of TypeScript, add it to the project in the same
commit.

**The codec port is complete**, and base slot 16 was the last **reader** gap. Every reader
`src/harmony/gspm.py` has now exists in `packages/codec` too. **A reader was the wrong unit to count
in, which an audit found on 29 August 2026**: this said the port was complete while base slot 15's
demanded group lengths and the check over them existed only in Python. That is not a reader, it is a
**rail**, and it is the one whose failure is silent, since a group of the wrong length is replaced by
compiled in defaults with no error anywhere. So the only checker for it sat in the language that
never writes, while TypeScript owns the codec and the whole write path. It is ported now,
`parameterGroupLengthsMatch` in `packages/codec/src/tables.ts`, and the two copies of the table are
compared entry for entry by `TheTwoParameterGroupTablesAgree` so they cannot drift. When judging this
claim again, count the rails and not the readers. The number sender was left out on the
grounds that its count is zero in every config, which was true of every config that had been
**found**; section 154 made one, so it is ported, claimed by the accounting, rebuilt by the emitter
and compared between the two implementations by a golden vector. **The reverse is deliberately not
true**, section 139: the Python
side reads infrared durations and does not decode them into a bit frame, because for a day it did and
the two decoders disagreed about 37 records of one arch 8 (Harmony 880) config. A reader that exists
twice is the state this file's oldest rule forbids, so the direction to add one is towards
`packages/codec` and the direction to remove one is away from Python. `packages/codec/src/coverage.ts` is the M2 progress number and
`make coverage` prints it; the current figures are in `docs/status.md`.

**This paragraph used to end "it stops there and another reader will not move it", and that was<!--superseded-->
wrong twice over.** It read 26.3% of a Harmony 700 against 98.1% today, and seven readers have
moved it since: sections 53, 54, 55, 61, 63, 64 and 65. The two extents it called deliberately
unclaimed are both read now, base slot 5's record by section 61 and the mode entry by section 52,
which found that the pointer does not land on the entry at all and that the "255 entries" was a
misread tail rather than a saturating count. The lesson worth keeping is the one that still holds:
**both were found by the overlap detector rather than by reading the code**, which is what the byte
accounting is for.

**The write rails live in `packages/usb/src/rails.ts` and on the transport, and both halves are load bearing**, section 188. `rails.ts` guards `HarmonyRemote`'s methods; it cannot guard a caller who builds a report itself, and the barrel star exports the generic encoder, the command numbers, the address encoder and a public `Transport.write`. That bypass was demonstrated with writing **disabled**, for an address outside the config region and for an unaligned one, and it is **the same hole as 13 August 2026**: that round hid the four named request builders and left the generic encoder, so the fix addressed the instance rather than the class, and the test written to catch it matches on a name shape that `encodeRequest` slips through. So `openHarmony` returns a **guarded** transport: an allow list of the three commands that only read, so an unclassified command is refused rather than sent, and a per report, byte exact, single use authorisation that `HarmonyRemote` issues after the rail has passed. A fake transport is deliberately unguarded, so tests keep raw access.

**And it was the same hole a third time, section 224, closed on 30 August 2026.** The guard was right and the **permission** was public: `authoriseReport` was a method on the very transport `openHarmony` hands back, so `t.authoriseReport(r); await t.write(r)` erased firmware at `0x3D0000` with writing disabled. It lives in `packages/usb/src/authorise.ts` now, keyed by transport, and the barrel does not re-export it. **The lesson is about the shape of the check and not about this bug**: three fixes in a row asserted a predicate over **exported names**, and twice what reached hardware was not an exported name at all. A rail on an object's surface needs an assertion that **enumerates that surface**, which `rails.test.ts` now does for the guarded transport: exactly `close`, `read` and `write`, and a fourth property is a hole until proven otherwise. **The three facts in a `WritePermission` are still caller assertions** the library cannot check, and `rehearse-block.ts` hardcodes two of them, which is open. A rail
enforced by a user interface is enforced until somebody writes a script. `WRITES_ENABLED` is off
unless `HARMONY_ENABLE_WRITES=1`, and the tests are refusals: with the flag off every write path
refuses with everything else in order, and with the flag on in a subprocess each remaining
condition still refuses by itself. `node-hid` is installed and its build script is
approved in `pnpm-workspace.yaml`, with the reason recorded there; pnpm blocks such scripts by
default and that default is right, so **any further approval is a decision to take on its own, not a side
effect of a commit.**

**Enumerating is not opening.** `listHarmony` and `packages/usb/bin/list-remotes.ts` ask the
operating system what is attached; `openHarmony` claims an irreplaceable device. Anything that only
needs to know whether a remote is plugged in uses the first. **That separation is what caught section
193** before any harm was done: a Harmony Touch and a Harmony 350 were identified from enumeration
alone, and both turned out to be inside the range that gates opening one.

**A Harmony in the range is not a Harmony this library speaks to**, sections 193 and 207, and there
are **two** such families rather than one. The **tunnelled** family is the second and is the further
below; the **file based**
family keeps its config in a named file rather than at a flash address, so **no read path here reaches
one**: no way to ask for an address over USB, no RAM, no config. **The config does have an address**, section 199: the remote's own file table gives `/cfg/usercfg` external flash `0x020000` for 256 KiB on a Harmony 350, so it is the host that lacks it rather than the storage. This used to end "no address, no firmware, no RAM"<!--superseded-->
and the firmware third is now false, section 196: Logitech's own update service serves the Harmony 300
and Harmony 350 firmware to an anonymous request, it is an ordinary PIC18 image at `0x9000`, and it
reads with no new code. So the claim is about the **protocol** and has to say so; the storage being
addressed by filename and the processor being a PIC18 were never in tension.

**And the protocol third is answered too now, section 198, so the refusal stands on a different
footing.** Logitech specifies that family's protocol whole, per skin, in the mirrored client:
service `0xFF`, nine commands, open a path and get a handle, and a big endian size in the reply. The
split is exact and disjoint, nineteen skins in the file family against four in the one this project
reads, and those four are architectures 12 (Harmony One), 14 (Harmony 600 and 700) and 9 (Harmony
510, being the Harmony 525's architecture) plus one skin declaring none. **Reading a Harmony Touch's
identity is four commands and none of them writes**, ping, open `/sys/sysinfo` for reading, read, close,
and it returns the same seven identity fields the version block carries. So `openHarmony`'s refusal is
now a choice about what has been built rather than a statement that nothing could be, and **that is
the honest wording to keep**: nothing here has sent one of these packets, no implementation exists, and
the family's own transfer, commit and device control commands are writes and belong behind
`WRITES_ENABLED`. Client sourced under decision 2, and its skin 96 contradiction is deliberately
unresolved.

**And it has been tried on hardware now, which is where it stops being a paragraph.** A Harmony Touch
answers an open of `/sys/sysinfo` and **refuses** it, `ff 01 ff 01 01 0b`, identically for two paths
and both sequence numbers, so the packet is understood and something in it is wrong. Three things to
carry rather than re-derive: a packet the remote dislikes leaves it **silent for the rest of the
session**, so a run of attempts through one handle measures the first and then nothing; a bare ping is
not the missing step, measured; and the remote is unharmed and enumerates normally afterwards.
`openFileBasedRemote` is the door, deliberately separate from `openHarmony` rather than a widening of
it. Section 198.

**And it reads now, section 200.** A Harmony Touch's `/sys/sysinfo` opened, read and closed, 234 bytes
of plain text in fourteen fields. **`arch 0x11` is 17**, so section 197's disagreement is settled on the
hardware's side and is real rather than a mistake in either source; its firmware version matches the
package the update service served for that skin, by two routes with nothing in common; and
`link_packet_length 64` is the report size this project has used since section 3 and had never seen a
remote state.

**A file states its end in one place and it is the open reply, section 201.** The last data packet
declares a full payload and pads it with NUL, so a packet's own length is the transfer unit and not the
number of bytes belonging to the file, and `readOpenFile` was returning the padding as content: 124
bytes for an 83 byte file and 248 for a 234 byte one. That is what section 200's field count was, since
a run of NUL parses as a field, and it would have been worse on a config, because a container arriving
with bytes on the end fails its checksum in the way a bad read does rather than in the way a bad
reader does. A **short** read is still returned short, deliberately. The other file with content on a
Harmony Touch, `/rf/deviceinfo`, turns out to be **a query rather than storage**: its 83 bytes are the
word `Response`, a comma and a JSON object naming a radio identity and a list of paired devices, which
is empty on the bench unit. So two files on one remote are two formats, and a filesystem that
synthesises an answer on open is the deeper reason `INERT_PATHS` exists rather than a mode check.

**What made it work was reading Logitech's own encoder instead of guessing, and Danny asked for that.**
`molsonparamwriter.getBytes` in the mirrored client: a **string** parameter is `0x80`, the characters
and a NUL, where every other type states its own width. Two guesses were tried on hardware first and
both are refuted, a bare NUL terminated string and a plain length prefix. The encoder had been in the
lab the whole time, which is decision 12 in one paragraph.

**A path on this protocol can be an action, and that is a rail.** `/sys/factoryreset` and `/sys/reboot`
both **open for reading** on a Harmony Touch, and both were opened here while probing which paths
exist, with nothing happening by luck rather than by design. So a mode of `R` says what a handle will be
used for and nothing about what opening the path does. `INERT_PATHS` is the allow list and
`HARMONY_FILE_PATH_EXPERIMENT=1` the named door. **The general form applies beyond this family**: a rail
derived from what a command is can be defeated by what an operand names.

**A Harmony Touch's configuration is not reachable as a file**, six spellings tried including the
Harmony 350's own `/cfg/usercfg`, which is consistent with the read of a user configuration being
commented out in Logitech's own template.

**Nor is it reachable as a compile, and that is settled rather than unfound**, section 202. Logitech's
service will not produce one: MyHarmony's sync branches on the product's declared capabilities, a
Harmony One and a Harmony 600 take the compile route that yields a file, and a Harmony Touch takes a
**provisioning** route that sets config not required and never calls the compiler. Every compile
requested for one ends in a bare `status='Error'` six seconds in, which is the service being asked for
an artefact this product has no route to. So neither of the two ways this project has ever obtained a
configuration reaches that generation, and what does is unread.

Its five product ids sit **inside** `0xC110` to `0xC14F`, so `isHarmony`
excludes them explicitly and `isFileBasedRemote` reports them, which is section 189's second predicate
applied to the opposite case, since here the devices really are Harmonys.

**There is a third such family and it was claimable until section 207**, `isTunnelledRemote`: the
Harmony 890 platform and the two beside it, plus the Harmony 1000 family one step out. This file said
`0xC112` to `0xC115` was "deliberately still claimable"<!--superseded--> on the ground that excluding
it "would make a Harmony 890 unopenable and arch 10 is an architecture this project reads", and that
concordance's `ZWAVE` label was upstream's word that nothing here could check. **Both halves were
wrong.** Logitech's own classic client hands those product ids to a different unit factory, which
wraps the USB channel in a datagram protocol and registers named services on it rather than sending
command reports; concordance's class for the same range opens with a command named for initiating a
TCP channel. So a Harmony 890 was never openable here, its configs arrived as files through
concordance, and reading a config is not the same capability as speaking to a remote.

The rule is unchanged and it is what produced both answers: exclude where we provably have no
protocol, as with the file based family, and not where we might have one and cannot verify the reason
to refuse. What changed is that two independent sources can now verify it. **The instructive part is
that a correct rule was applied to an unexamined premise**, one sentence long, and no amount of care
about the rule would have caught it.

**A remote in recovery is not a Harmony by vendor id, and enumeration reported it as nothing at all
until section 189.** Both bench bootloaders present `04D8:000B`, Microchip's vendor with no strings,
where a booted Harmony One is `046D:C121` naming itself, so the recovery state has a signature and
`listMicrochipBootloaders` is the question. It is **deliberately a second predicate rather than a
wider `isHarmony`**: that one gates `openHarmony`, and a bootloader speaks a different protocol
entirely, so widening it would let this library open a device and send it commands it cannot answer.
A test asserts the two are disjoint across the whole Harmony product range. The name says Microchip
and not Harmony because the identity is a stock one, so a hit means a device in that state and not a
model. What it is for is telling "the remote went into recovery" from "nothing is plugged in", which
is the difference between a bench measurement and a shrug. `packages/usb/test/hardware.test.ts` is
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

**`playwright` is a dev dependency of `packages/bench` and its browser download is not approved**,
which is the arrangement to keep: the npm side is two packages, `playwright` and `playwright-core`, and
`pnpm-workspace.yaml` deliberately does not allow its install script, so nothing is fetched at install
time. `packages/bench/test/page.test.ts` drives the Chrome that is already on the machine and skips
where there is none. Approving the download would be a separate decision, and the test does not need
it.

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

**The rule is about derivations and not only about that table**, and it was broken inside the
TypeScript codec on 10 August 2026 without anything failing: `emit.ts` and `edit.ts` each derived
base slot 3's day of week, with a different spelling of the same epoch and a different parser for the
same string, both correct. **Two right copies is the state that precedes two diverging ones**, and no
test can see it, so it is caught by looking. A field's encoder lives next to its decoder, once:
`clockRecordFields` beside `clockRecord` in `packages/codec/src/gspm.ts`, with a test that walks the
corpus asserting they invert.

**When two copies are found already disagreeing, the disagreement is the finding, and it gets measured
before either copy is touched.** This was got wrong on 13 August 2026 and calling it unacceptable was right:
two infrared frame decoders differed on 100 records of one config, and the losing one was
deleted on the strength of its **provenance**, that only the other had ever been checked against a
catalogue outside the code. The measurement came afterwards, prompted by a question, and it happened to agree.
That is luck and not method: had it gone the other way, the correct decoder and the evidence against the
broken one would have gone in one commit. A disagreement between two independent implementations is the
most informative signal this repository produces, which is what the golden vectors exist to manufacture,
so destroying half of it is the one response that cannot be right. The order is: reproduce the
disagreement on the same inputs, find an **external** answer, say which copy was wrong **and why**, and
only then remove one. The why is not optional either, because it is what stops the same mistake being
written again: the decoder that was removed measured the wrong half of a mark and space pair and dropped
the last bit of every pulse width code, and `irframe.ts` had that lesson in its own docstring.

**Never delete a test unless the thing it tests has left the repository.** A rule taken on 13 August
2026, and it is narrower than it sounds on purpose: a test whose claim has been refuted is rewritten to
state what is true, a test whose title overclaims is renamed, a test that cannot fail is given a body
that can, and a test whose subject moved to the other language moves with it. What none of those is, is
deletion. The only case that justifies removing one outright is that the code it exercises is gone, and
then the commit says which code and why it went.

Two things this rules out that had looked reasonable. **A test that reduces to algebra is not therefore
worthless**, it is a test with the wrong body: `without the seed nothing matches, which is what pins
0x4321` was dropped on 13 August 2026 because its assertion reduced to `SEED != 0`, and the right answer
was to solve the seed out of one container and assert it equals `0x4321`, which is a measurement and can
fail. And **a test does not go away because its implementation is about to**: measure first, per the rule
above, because the test is often the only thing that can tell you which of two implementations to keep.

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
  `22846<!--fact:screen_programs-->`, invisible when rendered. `tools/facts.py` recomputes it from
  the corpus, `make facts-write` updates every copy, and `--list` shows what is available.
* a claim that a finding kills goes into `reference/superseded.md` **in the same commit**, and the
  check then refuses that wording anywhere outside a correction. Quoting a dead claim in order to
  refute it is what `<!--superseded-->` on the line is for.
* **the phrase half reads the source too**, `.ts` and `.py`, since section 139. It walked `*.md` alone,
  so a comment restating a dead reading was unguarded, which is the half that matters more: a stale
  document misleads a reader and a stale comment misleads whoever edits the reader beside it. Twenty
  hits the day it was switched on, two of them written that morning by the commit that superseded them.
  **In source only the explicit token counts**, because every JSDoc line opens with `*` and the checker
  reads that as a markdown bullet, so allowing the structural forms there passes anything in
  `packages/`.

It runs in `make all` and in the pre-commit hook, so a document that contradicts the code cannot be
committed. The numeric half needs a lab and skips cleanly without one; the phrase half is pure text
and always runs, because a fresh clone with no lab still has to be protected by it.

## Commands

Eleven project skills carry the rituals that are easy to half-perform, and three of them exist
because the guidance was too long to keep in this file:

* **`trace-section`**, the method for labelling a config section by finding the firmware code
  that consumes its pointer, with the pitfalls that have already cost time here.
* **`draw-a-diagram`**, the rule that a generated picture is laid out by graphviz and never by a
  layout engine of ours, with the two failures of 30 August 2026 that produced it: a line drawn
  through the midpoint between its ends runs through any box that sits between them, and the fix for
  that reported itself complete while a check still found four crossings. It also holds the port
  trick, which is what puts a relation line on the attribute that defines it.
* **`draw-remote`**, how a model's front face is traced from Logitech's own documentation into
  `packages/silhouettes`, carrying the objection Danny overruled on 21 August 2026 and the
  measurement that outweighed it. It had no entry here while this list claimed to name ten, which is
  a partial list wearing a complete one's label.
* **`finding`**, the verification gate plus the four places a confirmed fact must land, the
  convention for correcting an earlier claim in place, and since 29 August 2026 the three rules
  about the shape of an assertion that used to sit under "Verification standard" here.
  **Since 6 September 2026 it also carries two reviewers**, run on the whole diff before the commit:
  one re-measures blind without our answer, the other audits every figure's granularity and every
  comparative word against the corpus. The second is the one that earns its keep, because the gate
  covers the claim a session knows it is making and the errors ride alongside it.
  `bin/finding-gate-hook.py` is what makes the skill fire without being remembered.
* **`probe-remote`**, how to measure a connected remote read only: the rails, which enumeration
  commands actually work on this machine, and where a hardware number has to land. **It also holds the
  gate in front of an experiment**: before sending a packet to learn a format rather than to check one,
  check Logitech's own client and the firmware, and write down which. Added 28 August 2026 after six
  rounds of hardware guessed a framing that sat in one function of the mirrored client, section 200.
  The failure mode is momentum rather than ignorance, so the trigger is the **act** of experimenting
  and not the subject being worked on.
* **`code-navigation`**, ask the language index rather than grepping for a symbol, with the two
  pitfalls that make it worse than grep when they are not known: the IDE does not index Python and
  answers anyway, from the directory, and the reply's `resolvedSymbol` is what says so.
* **`how-a-harmony-works`**, the operating concept of the product, and the rule that a corpus
  measurement cannot answer a question about behaviour. Read before designing anything.
* **`status-report`**, how to say where the work stands: short, plain, one concrete example
  with real numbers, where that puts us in `todo.md`, and one next step so that "doe maar" is a
  complete answer. It carries a good example and a bad one, because the bad one is what gets written by
  default.
* **`writing-a-config`**, every rail a config writer must respect and the evidence behind each,
  which is what the table under "Rails a writer will have to respect" points at. Invoke it before
  changing any byte of a container, not after: each rail is a way to produce a file the remote
  accepts and mishandles, and one of them hung a Harmony One three times out of three, each time
needing the batteries out.
* **`recovering-a-remote`**, what a restore consists of per architecture: safe mode, the
  bootloader, the flash programmer, the EEPROM latch and the write protect interlock. Invoke it
  before planning a write and before entering safe mode on any model, since on a Harmony 525 that is
  a one way door.
* **`myharmony-service`**, how to talk to Logitech's live services, both of them: the configuration
  service and the **software update service** that serves firmware, plus the hidden recovery screen in
  each client that is how the second one was found. The instrument in the lab, the two
  accounts and what each holds, the named doors in front of every write, and the traps already met,
  starting with the read that is secretly a compile. Written on 27 August 2026 after a session had to
  be reminded of all of it.

`probe-remote` also holds what a bench session does to a remote, measured, which moved out of "Never
write to a remote" on 29 August 2026: the odd read hazard's mechanism, the three-of-three control
showing a clean session strands nothing, the reset a hang ends in, and the parked stranding with its
three dead leads.

```
make test          run the suite; image-backed tests need a lab directory
make test-nolab    the suite against a nonexistent lab: it must skip, never assert
make test-partial  the suite against a lab holding one sample: no test may report a pass having
                   skipped some of its own samples. The half test-nolab cannot see, since there it
                   is passing that is the bug
make test-verbose  one line per test
make lint          byte-compile everything
make pyright       the Python type checks, at the level pyrightconfig.json argues for. Skips with a
                   note where pyright is absent, since a Python 3 install is still the floor here
make prose         check documents for em-dashes and en-dashes
make facts         check the documents against the code; facts-write fixes the numbers
make corpus        inventory the dumps, and flag the undescribed ones
make lab-check     what the lab register already says about a path, PATH_ARG=<lab path>. Run it on
                   the directory about to be opened, not on the topic: **eight** digs have
                   re-derived something the lab held, and the last two happened in the session that
                   fixed the sixth, each having checked the paths it meant to open and then followed
                   a name into one it had not, sections 209 and 213
make ghidra        build or refresh the Ghidra project
make ts            typecheck and test the TypeScript packages
make audit         check the npm dependency tree for known vulnerabilities
make hooks         install .githooks/pre-commit, once per clone
make golden        compare the golden vectors; golden-write regenerates them. Since section 139
                   they carry the infrared header reading, which is what caught the two codecs
                   disagreeing about 328 block pointers with every test on both sides passing
make coverage      byte accounting per sample, the M2 progress number; COVERAGE_ARGS=--detail
make emit          how much of each sample the emitter puts back, and whether it round trips
make growth        what a length change would move, per sample: addresses stated, positions implied,
                   and the cost of making room in three places. GROWTH_ARGS=--detail
make reading       the step 6 depth number, meaning against placement; READING_ARGS=--detail
make text          how much on screen text reads back as characters; TEXT_ARGS=--detail
make emitcheck     build a code from a name and a number out of Logitech's catalogue and ask their own
                   analyser to read it back, which is the closed loop for writing infrared. Needs the
                   network and their credentials, never in `make all`. EMITCHECK_ARGS=--limit 40, and
                   `--only <family>` plus `--per-family N`, because without a filter the budget goes on
                   families settled weeks ago in whatever order the census happened to walk them
make myharmony-model
                   check the drawn model against docs/myharmony/model.json, the diagram and the
                   entity listing both. MYHARMONY_ARGS=--write regenerates them. No lab, no network
make model-pdf     docs/myharmony/model.md as a PDF, diagram drawn in, for reading outside a
                   terminal. Graphviz lays the diagram out, Chrome sets the document. A build
                   product, gitignored
make model-diagram the entity diagram alone as a one page PDF beside the .mmd, laid out by
                   graphviz, which sizes the sheet to the graph so nothing is paged or cut. Every
                   relation line leaves the **attribute that defines it** rather than the box, which
                   is what graphviz calls a port. Also a build product. **This needs `dot`**,
                   `brew install graphviz`, and there is deliberately no fallback layout: the tool
                   drew its own until 30 August 2026, and a hand written layout engine kept beside a
                   real one is two copies of the same derivation with the unwatched copy rotting
make catalogue     what Logitech's device catalogue says about the devices our own configs drive:
                   which device each group is, and the command name behind every button. Needs the
                   archive checkout and the lab, no network, and deliberately not in `make all`, since
                   it is a ten second full pass over 54118 files. CATALOGUE_ARGS=--detail
make catalogue-raw pull the archive checkout, fetch its newest raw release when the lab's SHA256SUMS
                   differ, and derive from the 5.5 GB capture a seekable copy, an index and a side file
                   of the fields the archive drops, into the lab. About four minutes when it derives.
                   **Never print a raw line or a whole device**: one line is up to 35000 tokens.
                   Not in `make all`. CATALOGUE_RAW_ARGS=--force, --no-pull, --offline
make protocols     what rhythm each protocol family uses, measured off the corpus against the family
                   names Logitech's analyser gave it, and the table that turns a code stated as a name
                   and a number into pulses. --write regenerates it. Needs a lab, no network
make prontocheck   our own waveforms against the ones Logitech's renderer produced for every command in
                   their catalogue, both sections of a Pronto string, sections 230 to 232. Two million commands
                   in about forty seconds, needs the public archive checkout and no network and no lab,
                   and it is the strongest check the infrared encoder gets: everything else that judges
                   it is 3017 corpus codes or 35 measured families. PRONTOCHECK_ARGS=--codesets 400 for
                   a sample, --only '<family>' --detail to see one family's disagreements in full. Not
                   in `make all`, since a fresh clone has no archive
make composecensus which of the archive's commands the catalogue composer writes and why it refuses the
                   rest, by family and by reason, beside the verdict of the rhythm table alone. The
                   composer's own test over the archive, todo-process-logitech chapter 2, judged per
                   device since section 348. Needs the archive checkout, no lab and no network, about
                   forty seconds. Not in `make all`
make analyze       ask Logitech's own analyser what a code in the corpus is and compare it with ours,
                   which is the only second opinion available on `irframe.ts` for a code no calibration
                   account generated. Needs HARMONY_LOGITECH_EMAIL and HARMONY_LOGITECH_PASSWORD and
                   refuses without them. Never in `make all`. ANALYZE_ARGS=--config h600_config --limit 25
make render        draw a config's screens as PNG files, into the lab and never into the repository.
                   RENDER_ARGS=--config one_config --page 45, or --sheet for every page, or
                   --undrawn to paint the pixels nothing reached. The check that fails differently
                   from every other one here, since a reader test cannot see a label half a row out
make activities    which activity each key starts and which drawn label is its name, per model
make devices       which devices a config drives, what each is called and which route named it
make alphabets     regenerate the glyph shape table from the hand read seeds; ALPHABETS_ARGS=--write
make remotes       list attached remotes, enumeration only, opens nothing. Four buckets, and the
                   three extra ones exist because each was once invisible or once wrongly claimed. A
                   device in a Microchip bootloader is reported separately, which is what a Harmony
                   in recovery looks like, since filtering on Logitech's vendor id alone made that
                   state indistinguishable from an empty bus. The **file based** family is reported
                   separately the other way round: those are Harmonys, they are inside the product
                   range, and this library cannot drive them, so openHarmony refuses them while this
                   still says they are there, section 193. And the **tunnelled** family is the same
                   shape found the same way, section 207: the Harmony 890 platform and the two beside
                   it carry a datagram protocol over USB rather than this command set, so they are
                   reported and refused, where they used to be claimed as openable
make remote-reference
                   check the generated blocks in reference/remotes/ and reference/architectures/
                   against the code they come from, naming the file and block that drifted.
                   remote-reference-write rewrites them. Not called `remotes`, which is taken by
                   the line above. No lab, no network
make page          drive the bench page in the Chrome already installed, which is what checks the
                   page rather than the routes. Gated on HARMONY_PAGE_TESTS=1 and skips with no
                   Chrome, because playwright's browser download is deliberately not approved
make bench         start the bench instrument on 127.0.0.1:8731, Ctrl-C to stop. It also inspects a
                   config the lab already holds, with no remote attached: devices, activities, and
                   what each button sends including the repeat interval of a held key, plus the
                   **drawn screen** of any page beside the keys that page binds, `GET /api/screen`,
                   made out of the bytes per request rather than read off disk. **`/ir.html` is
                   the infrared monitor**, which starts the Flirc's own listener when the page
                   opens: a test written in packages/bench/irtests is performed at the bench, step
                   by step, and its run lands in the lab's reads/ for a session to compare against
                   what the configuration says it sends. Firmware 4.9.7 of the Flirc dropped the
                   long Denon codes without a trace and 4.10.7 reports them, so check its version
                   before blaming a remote for a silent step
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
tools/lab_register.py  <lab path>   which register rows bear on a path, ancestors and descendants
tools/golden.py        [--write]   golden vectors for the Python/TypeScript comparison
tools/facts.py         [--write] [--list]   the document checks behind `make facts`
tools/usbdesc.py       <file> <base> [--raw] [--json]
tools/usbprobe.py      [--json]   reads a CONNECTED remote, enumeration only, needs pyusb
node packages/usb/bin/list-remotes.ts    the same question over HID, also enumeration only
node packages/usb/bin/read-burst-probe.ts [--count 16384] [--stall-after N] [--stall-ms MS]
                       the positive control for a dropped chunk, section 223: read one window report
                       by report and optionally hold the process up in the middle, which makes the
                       host's USB library discard the oldest of its own queue. Reach for it before
                       calling an intermittent read failure unexplained, since the loss count is
                       predictable from the transfer rate and a queue depth of 31. All reads, and it
                       deliberately leaves the pipe dirty, so a failing run poisons the next one.
node packages/usb/bin/read-window.ts --address 0x... [--count 16] [--compare 0x...]
                       read one window of external flash and print it, and optionally read a
                       second and say whether they are identical. For a question about a
                       specific address, which read-config.ts cannot answer. Opens the device.
node packages/usb/bin/read-identity.ts [--product 0xc121]
                       print a connected remote's version block: firmware, hardware, flash id,
                       architecture, **software type**, skin and platform, then the raw block with
                       the unidentified bytes labelled as such. One `GET_VERSION` and nothing else.
                       The field worth the trip is the software type, 0 running normally and 4 in
                       safe mode, since section 87 derived its safe mode column from the images
                       rather than from a remote. Opens the device.
node packages/usb/bin/read-ram.ts --address 0x... [--count 64] [--summary]
                       the same for data memory. Reach for this before believing a watcher's
                       silence: watch-keys reports changes, so it cannot tell a variable that
                       never moves from an address the remote does not serve, and on arch 9 it
                       is the second. --summary counts nonzero bytes, which is the question a
                       positive control asks. Opens the device.
node packages/usb/bin/read-battery.ts
                       ask a connected remote for its battery voltage, `READ_MISC` selector
                       `0x0C` detail 1, and print it in millivolts, high byte first. It also
                       reads detail 0 and the data memory byte it is built from, as an agreement
                       check. Refused on arch 9, whose executor answers only selector 1. First
                       sent to a Harmony 650, section 340. Opens the device.
node packages/usb/bin/read-file-identity.ts [--product 0xc12b] [--raw]
                       read the identity of a remote in the **file based** family: open
                       `/sys/sysinfo` for reading, read it, close it. A different door from
                       `openHarmony`, which still refuses this family, with its own allow list of
                       four commands and no write path at all. **It reads on a Harmony Touch**,
                       fourteen fields including the architecture the remote itself states, sections
                       200 and 201. That paragraph said the open was refused for as long as the
                       framing was guessed. Opens the device.
node packages/usb/bin/read-file.ts --file <path> [--product 0xc12b] [--device <path>]
                       the general form of the above: read any path on `INERT_PATHS` and print it as
                       bytes and, where it is printable, as text. Deliberately does not parse, since
                       one file on a Harmony Touch is lines of a name and a value and another is JSON
                       behind a `Response,` prefix, so a reader that assumed either would mangle the
                       other. A path off that list needs `HARMONY_FILE_PATH_EXPERIMENT=1`, because on
                       this protocol a path can be an action. **What it prints may identify a unit**,
                       so the output stays on a terminal. Opens the device.
node packages/usb/bin/read-settings.ts [--product 0xc122] [--compare <lab page ff dump>]
                       read the saved delays out of a Harmony 600, 650 or 700's settings store,
                       forty one `0x13 0xB2` reads, and compare them with a lab dump of the same
                       unit's internal page `0xFF`. Section 304. All reads; a reply in any shape but
                       the one the firmware states stops the run with its bytes. Opens the device.
node packages/corpus/bin/read-config.ts --label <name> [--product 0xc121]
                       reads the whole config off a remote and files it in the lab.
                       Opens the device, unlike the two above, so reach for it deliberately.
node packages/corpus/bin/read-region.ts --label <name> --address 0x820000 [--count 0x10000]
                       reads a **stated range** of flash and files it in the lab, which is the only
                       way to obtain a whole erase block. All reads. The two come apart on the
                       Harmony 525, whose configuration is 51195 bytes against a 64 KiB block, so a
                       config read covers no block and the rehearsal has nothing to compare against;
                       on a Harmony One the configuration is 1.6 MB and a config read happened to be
                       a region read too. **A region is more sensitive than a config, not less**,
                       section 215: past the end of the current configuration sit the remains of a
                       previous one, so it never leaves the lab. Refuses a range outside the config
                       region unless `--anywhere`, which is about what the artefact gets filed as
                       rather than about what is safe to read. Opens the device.
node packages/corpus/bin/harvest.ts --record <id> --model <skin> --label <name> --device <make>/<file>.json
                       todo-secure-logitech's harvest: catalogue devices onto an empty remote record of a
                       test account, a Logitech compile, the file and every reply into the lab's
                       `work/harvest/<label>/`, the devices removed again. Never touches a remote. Without
                       `--commit` it only reads; with it, three account writes, each behind the lab
                       client's own door. Load the `gathering-logitech` skill first.
node packages/probe/bin/probe.ts [--product 0xc122] [--file <config>]
                       the contribution probe: a few kilobytes of JSON describing a config's
                       shape and nothing of its contents, meant to be published. Opens the
                       device unless --file is given.
node packages/usb/bin/session-end-control.ts [--from-charger]
                       one round of the session-end control: a plain read, close the handle, then
                       it walks the operator through pulling the cable and plugging back in and
                       says which outcome it saw. Enumeration after a replug is the machine
                       readable proxy, since a stuck remote does not come back on the bus.
                       Opens the device once, for the read. One round per run, on purpose.
HARMONY_ODD_READ_EXPERIMENT=1 node packages/usb/bin/idle-flags-after-hang.ts
                       hangs the remote on purpose and then reads what the runaway left in its
                       data memory: the four idle flags, two controls below the write pointer,
                       and 48 bytes against the page 0xFF image. All reads. Unrun; section 99
                       holds its three predictions. Take the batteries out afterwards.
node packages/usb/bin/rehearse-block.ts --dump <image> --block 0x040000 [--commit]
                       the write rehearsal, M4: read one 64 KiB erase block off a remote, compare it
                       with the lab dump, and print what a write would send. **Five units**: the spare
                       Harmony One, the Harmony 525 since 6 September 2026, the Harmony 650 since
                       27 September, section 281, and the Harmony 600 and the Harmony 700 since 29
                       September, each with a registered dump and one block written back, sections 300 and 302. The dump names the unit and the
                       identity read off the remote has to match it, since three arch 14 units
                       enumerate alike. **All of them may be written**, which
                       said "only the first may be written"<!--superseded--> for the few hours before
                       the 525's demonstration ran.
                       A 525 run needs two things first, both reads: a region read covering a whole
                       block, and that filename plus the unit's identity registered in the lab. Only
                       block `0x820000` is registered, so no other 525 block can be rehearsed until a
                       region read covers it. **Without `--commit` it
                       writes nothing**, and that half is worth running on its own, because the
                       compare is what turns `originalDumpVerified` from a caller's assertion into a
                       measurement for the range about to be written. `--commit` needs
                       HARMONY_ENABLE_WRITES=1 **and** HARMONY_FIRST_WRITE=1, erases the block, writes
                       the dump's own bytes back, and reads them back to compare, so a success changes
                       nothing on the remote. It also reads the block **either side** before the erase
                       and again after it, because `ERASE_FLASH` carries no count and the 64 KiB block
                       size was Logitech's client's word: without that, a larger sector would destroy
                       a neighbouring block and the run would report success. **Run with `--commit` on
                       30 August 2026 and it succeeded**, which is this project's first write: the
                       erase stayed inside its block on both sides, so the block size is measured now
                       rather than believed, and the whole configuration reads back identical.
                       **Run on the Harmony 525 on 6 September 2026 and it succeeded there too**,
                       section 269, so the block size is measured on both parts. That neighbour check
                       earns more on arch 9 than on arch 12, because the block one step below the
                       configuration is the running application firmware and nothing in that remote
                       refuses an erase of it. Sections 175, 221, 222, 267 and 269, plus the job 3
                       review in docs/review-before-first-write.md
node packages/usb/bin/reinstall-firmware.ts --unit <label> [--commit]
                       ask a Harmony 700 stuck in safe mode to reinstall the application already
                       staged in its own external flash, section 295; it also takes the Harmony 600
                       and 650, where the routine is only partly read. Without
                       `--commit` it reads only: the unit against the lab record, the software type,
                       the staged image's checksum and which pages of the installed one differ.
                       `--commit` needs HARMONY_ENABLE_WRITES=1 **and** HARMONY_FIRMWARE_REINSTALL=1,
                       sets the update status byte to 2 and restarts, and the remote does the copy.
                       Without `--image` it sends no firmware and writes no flash from the host, and it
                       was run so once, on the Harmony 700 that arrived in safe mode, which came back
                       running its application.
                       With `--image <file> --backup <lab region read>` it first **stages** that image,
                       decision 18 and section 297, needing HARMONY_FIRMWARE_STAGE=1 as well: the backup
                       must equal the remote's staging region, or the region be erased and the backup
                       hold a verifying image, before anything is erased. Run twice so: the first stopped
                       past its erase and installed nothing, the second took the bench 700 to 2.8.
HARMONY_ENABLE_WRITES=1 node packages/usb/bin/end-session-experiment.ts
                       THE ONLY SCRIPT HERE THAT SENDS A COMMAND WHICH IS NOT A READ, one
                       `0xE0 0x01`, which zeroes one variable and touches no storage. Refuses
                       to start without the flag. Unrun; section 99 holds its prediction and
                       names the control that comes first. **Logitech's own client sends exactly
                       those two bytes as the first command of every session**, before it even
                       identifies the remote, and then reads four megabytes off a Harmony One
                       successfully, section 210. That is one observation on one unit and a
                       command's effect depends on the state it arrives in, so it does not make
                       the experiment safe; what it changes is that this is the vendor's opening
                       move rather than a command nobody has been seen to use.
```

`pic18_trace.py` is the highest-value one: the entire IR chain came out of pointing it at three
variables. It sees banked accesses and `MOVFF`; indirect access through FSR is invisible to it,
so a variable written only via `INDF` will look like it has no writers. Search for the FSR setup
instead.

`loadaddr.find_base` is what to reach for on a model nobody has examined yet. Check the margin
over the runner-up before trusting its answer.

## Tests and the lab

The tooling finds `../lab` automatically, so no environment variable is needed in a normal
checkout; `HARMONY_LAB` overrides it. Tests skip cleanly when no lab is present, and **`make test-nolab`
is what enforces that, in `make all`**. It used to say "enforced rather than assumed" on the strength of
having been run by hand once, and nothing ran it afterwards: on 10 August 2026 trelowney pointed
`HARMONY_LAB` at a directory that does not exist and found one Python test and one TypeScript test that
had slipped through. **A claim of enforcement with no check behind it is the failure this file warns
about everywhere else**, so the check exists now. The cause is the same
on both sides. A skip raised inside `subTest`, or a per sample `skipUnless`, skips that sample and
lets the loop finish, so a corpus wide total afterwards is asserted against zero. Guard such a test
up front with `lab.require(...)` in Python or `skipUnless(...)` in TypeScript, listing the samples once
so the guard and the loop cannot drift apart. The TypeScript `skipWithoutLab()`
deliberately skips only when there is **no lab at all**, because a lab that is present and missing
a sample should still fail loudly.

**That intent was defeated in every test that carried it, and finding out cost nothing but removing one
sample.** 52 of the 57 TypeScript sites sat inside `skipWithoutLab()` tests and then wrote
`const data = load(name); if (data === undefined) continue;`, so the guard said "fail on an incomplete
lab" and the body carried on. `require_` in `packages/lab` is the fix and it **already existed, unused,
with a docstring saying exactly this**. Measured with one config removed: `packages/codec` went from 17
failures to 53, so 36 tests had been passing on evidence they did not have. So the rule is per claim,
not per file: a claim about the corpus takes `skipWithoutLab()` **and** `require_`, and a claim about
named samples takes `skipUnless(...)`, which skips. Two tests are allowed the old shape and named in
`TYPESCRIPT_LOOPS_ALLOWED_TO_SKIP_A_SAMPLE`, because they ask which **unit** is attached by matching
against whatever dumps are present.

**`make test-nolab` cannot catch the case in between, by construction, and `make test-partial` is
that half**, added on 13 August 2026 in `make all`: it runs the suite against a lab holding **one**
sample and fails on any test that reports successful with one of its own subtests skipped. `test-nolab`
looks for a **failure**, and here passing is the bug, so no amount of running it would have found this.
The number it found was **43 tests**, which is the measurement to quote rather than the shape: a test
whose samples are half present asserts over half of them, keeps the claim in its own title, and
reports a pass. All 43 now call `lab.require` and the count is zero.
`ASampleLoopStatesItsPopulation` in `tests/test_toolchain.py` is the static half and is the cheaper
one, since it names an offender in a fresh clone with nothing installed and nothing run. **Keep both**:
a static rule cannot see a loop that loads through a helper, which is how one test checked one
container of fifteen and passed the static guard, and the runtime one needs a real lab.
**34 dead `if <sample> is None` arms went with it**, because `lab.load` raises `SkipTest` and never
returns `None`, so every one of them was unreachable; an unreachable guard is worse than none, since it
reads as protection. Four looked identical and were **not** dead, the ones testing `lab.load(...)`
inline, where the call in the condition is what raises.
