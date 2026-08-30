# A second pair of eyes before the first write to a remote

Written on 27 August 2026, before the first write, which has not happened.

This document is the brief for an independent review of the write path, the record of what was handed
over and what was held back, and the standard the answers get judged against. It is here rather than
in a message because the value of the exercise depends on conditions that have to be written down
before the answers arrive: which inputs the reviewer had, which it did not, and what counts as
agreement. Decided afterwards, all three are worthless.

## Why

Nothing had ever been written to a Harmony remote by this project when this was written; one block
has been now, section 222, on 30 August 2026, and it reproduced bytes already there. The gate in front of the first
write opened on 25 August 2026, rehearsal first, and the derivation behind it landed the same day,
section 175. **That derivation has been read by exactly one party, which is us**, and the remotes are
discontinued and irreplaceable.

Two of the questions a first write depends on are open here, and section 175 says so itself: whether
the firmware erases a region before it programs it, and whether the USB peripheral can lose a report.
So a second reading is not only insurance against our being wrong. It could settle something standing
between the rehearsal and the write, by a route we have not closed ourselves.

**Independence is what decides whether it is worth anything.** This project's sharpest instrument is
two derivations of one thing disagreeing, which is what the golden vectors exist to manufacture. A
reviewer that reads `docs/findings.md` first inherits our answer and returns it in different words,
and a rubber stamp before a first write is worse than no review, because it reads as evidence.

## The four jobs

| # | job | independence | what it protects |
|---|---|---|---|
| 1 | re-derive the write transfer from the firmware | **blind, required** | the derivation the first write rests on |
| 2 | attack the rails | not needed | the code that refuses |
| 3 | find a path where the rehearsal leaves the remote worse | not needed | the hardware |
| 4 | assess the recovery route | not needed | the thing no code review touches |

Job 1 needs the machinery below. Jobs 2 to 4 want the brief and the code in front of them, so they run
afterwards and in the ordinary way.

**Job 1 goes first because the window closes.** A reviewer with no project brief is blind for free;
one that has been given the brief cannot be made blind again.

What Codex shares with this repository today, measured rather than assumed: a publication hook in
`.codex/hooks.json`, which runs the same gate `.claude/settings.json` does, and ten skill documents
symlinked into `.agents/skills/` from `.claude/skills/`. **No project brief**, per the withhold table
below. The skills are the part that needs handling, and residual 3 says how.

## Job 1: the four questions

Two are settled here and two are open, and the difference is stated to the reviewer, because a
question we cannot answer ourselves is where an independent reading is worth most.

| # | question | status here |
|---|---|---|
| 1 | the transfer sequence: which command, what a data packet holds, what answers each step, how a length is stated, whether a whole erase block fits in one transfer | **settled**, and this is the part that checks section 175 |
| 2 | does programming erase first, or is the old content marked invalid and written over | **closed on both bench architectures since 29 August 2026**, and this row said open. Section 186 read the Harmony 600's SPI path and section 191 the Harmony One's resident flash library, where erase and program are separate gates; there is a passing test for the arch 14 half. Still worth an independent reading, but as a check rather than as the open question it was billed as. The hypothesis from Logitech's own client stays withheld |
| 3 | must the host pace its packets | **half settled, and the halves must not be merged.** The firmware asks for no pacing, derived. Whether the USB peripheral can accept a second report before the first is serviced is unread: that is the endpoint's buffer descriptor and its ownership bit |
| 4 | the write protect interlock: which bit, its polarity, its resting state, what sets and clears it | settled, and **the highest value target, because we have got it wrong twice.** Both wrong versions are kept in `reference/superseded.md` |

Question 4 is the one to spend the time on, and the reason is its history rather than its difficulty.
A place where two successive readings of ours were wrong is exactly where a third, independent one
earns its keep. Question 3's peripheral half is second, and it has an additional weakness worth
stating: **the pacing finding has no regression test**, so it is the least pinned of the four.

## The line: instruments yes, conclusions no

Withholding the whole repository would be wrong, because our disassembler is in it and
re-implementing a PIC18 decoder is not the exercise. The line runs between tools and answers.

**May be read and used.** Each was checked for write path content and each is clean:

- `tools/pic18_disasm.py`, `tools/pic18_trace.py`, `tools/pic18_xref.py`, `tools/usbdesc.py`
- `src/harmony/pic18/`, the opcode table, the disassembler, the tracer, the switch chain decoder
- `src/harmony/firmware.py`, `src/harmony/usbdesc.py`
- the five `docs/memory-map*.md` documents, and `reference/checksums.md`
- the Microchip headers the project already relies on, `p18f87j50.inc` and `p18f67j50.inc`

**Must not be read.** This list was built by inventorying the tree rather than from memory, and that
mattered: five documents came **off** an earlier draft of it and nine paths went **on**.

| path | why |
|---|---|
| `docs/findings.md` | section 175 is the answer, and other sections state parts of it |
| `docs/usb-protocol.md` | **a worse leak than section 175.** The wire sequence, an address table across three images, the state table, and the length nibble mapping, which is the chunking rule |
| `reference/superseded.md` | twelve contiguous rows, each pairing an answer we got wrong with the corrected one and its addresses. On question 4 it states both wrong readings and the right one |
| `docs/host-client.md` | question 2's hypothesis, and an independent statement of the transfer shape taken from Logitech's client |
| `CLAUDE.md`, `docs/status.md`, `docs/roadmap.md`, `docs/adding-a-device.md` | all restate the sequence |
| `AGENTS.md` | deliberately absent since 28 August 2026. Codex reads `CLAUDE.md` through `.codex/config.toml`, so both agents use one brief. The row stays reserved so recreating a separate brief cannot silently widen what a reviewer may see |
| `docs/glossary.md`, `docs/growing-a-config.md` | one line each |
| `docs/review-before-first-write.md` | this document, which states which questions are open |
| `packages/usb/` | all of it, the protocol, the rails, the write builder, the scripts and the tests |
| `tests/`, `packages/bench/test/` | the regression tests pin the claims |
| `.claude/skills/recovering-a-remote/SKILL.md`, `.agents/skills/recovering-a-remote` | **added 29 August 2026 and the reason is question 4.** It states the classifying routine, its three callers, what each top byte selects, the ceiling per architecture and the polarity in the words "it rests at refuse", which is the whole of the highest value question in this review. It is reachable both as a skill Codex discovers on its own and as a tracked file |
| `tools/ghidra/seed_code.txt`, `tools/ghidra/seed_funcs.txt` | machine generated branch target seeds |
| the `concordance` checkout | `specs/protocol.txt` documents the protocol independently |

**The sweep is per spelling, not per name**, and this is the part a hand written list gets wrong.
Section 175 writes the data packet one way and every document downstream of it writes the same byte
the other way, so a search for one spelling finds half the tree. The audit patterns are both
spellings, the packet's symbolic name, and both halves of the acknowledgement.

## Residual leaks, recorded rather than hidden

The blind is not perfect, and a comparison is only as good as its stated conditions. Two residuals,
both known before handover:

1. `src/harmony/pic18/chains.py`'s docstring names a state dispatch chain and its address in the
   Harmony 700 reference image. That is the location of machinery rather than an answer, and it is
   **moot in this packet, because the 700 image is not in it.**
2. `docs/memory-map-one.md` says that a stored copy of the firmware sits inside the nominally
   writable region and that our own ceiling protects it. That is a fact about the memory map and
   about a rail of ours, not about the firmware's interlock, and it does not answer question 4.
3. **The shared skills point at withheld documents, and this one is live rather than moot.** There
   are **ten** now rather than seven, and one of the three added since states an answer outright:
   see the correction below this list. Nine of the ten are clean of any write path marker, which is
   the good half. But **six of them name a document on the withhold list and tell the reader to open
   it**, and
   `probe-remote` names `docs/usb-protocol.md` and `packages/usb/src/rails.ts`, which are the two
   worst leaks for this exercise. Codex discovers skills on its own, so this is a path into a
   withheld file that nobody would have to choose to take. The brief therefore carries an explicit
   rule that the withhold list **overrides any instruction from a skill, a docstring, a comment or a
   README**, and that `probe-remote` is not to be followed at all, since it is about a remote that is
   plugged in. Worth stating plainly because it cuts against this project's usual reading: a document
   inside the repository is normally exactly where the rules live, and here six of them would walk a
   blind reviewer into the answer.

**Correction, 29 August 2026: a fourth residual arrived and it was an answer rather than a pointer.**
On 28 August a restructuring of `CLAUDE.md` moved the recovery material into a new skill,
`recovering-a-remote`, which states the write protect interlock in full: the classifying routine, its
three callers, what each top byte selects, the ceiling per architecture, and the polarity. That is
question 4 entire, and question 4 is the one this brief calls its highest value target. The skill is
now on the withhold list above.

**The instructive part is not the leak, it is that no check could see it.** The list is enforced by
`TheWriteReviewWithholdListIsComplete`, and its sweep skipped every directory whose name begins with
a dot, so `.claude/` and `.agents/` were outside it by construction. Residual 3 names those very
directories as the live risk, which means the document identified the hazard and the test walked past
it. Two changes followed: the sweep now enters dot directories, and it carries markers for the
interlock as well as for the transfer, since a list checked only for question 1's words cannot
protect question 4.

**And it says something about the restructuring rule rather than about this file.** Moving text out
of an always loaded brief into a skill changes who can reach it: a skill is discovered by an agent on
its own, so text that was previously read only by whoever opened `CLAUDE.md` becomes text a reviewer
may meet without choosing to. Any future move of write path material has to ask that question before
it asks about size.

## Orientation, and the control that it is insufficient

The reviewer is given the two images, their load bases, their entry points, their parts, and a plain
description of the command layer: reports arrive over USB HID, the command is in the high nibble of
the first byte, handlers are asynchronous and set a state variable that the main loop acts on later,
and the idle dispatcher is gated on that variable. Plus the one trap that silently produces a wrong
answer, which is that this compiler's switch chains hold differences rather than case values.

**No command table.** Deriving it is a normal part of the exercise and one of its rows is question
1's answer.

**The control is that the packet cannot answer its own questions**, and it is a check rather than an
intention. Both packet documents are searched for the write command, the data packet byte in either
spelling, the acknowledgement, the interlock address, and the words that would give away a polarity.
It runs on every edit to the packet, and **it caught a real leak on the first run**: a row of the
answer template asked what the transfer's opening step carries and named an address and a length,
which is a third of question 1 handed over inside the form asking for it. The row is phrased
neutrally now.

## The packet

The firmware is unlicensed proprietary Logitech code and this repository is public, so no firmware
byte enters the repository. The images stay in the private lab and reach the workspace by symlink.

**The workspace itself sits outside both repositories and outside the lab**, and that location is a
correction rather than a preference:

`../review-20260827-write-transfer/`

It was going to be `../lab/reviews/`, and putting it there would have quietly handed over the whole
lab. `git rev-parse --show-toplevel` from inside that folder returns **the lab**, so a tool that takes
the enclosing repository as its project would have indexed Logitech's own client, which is one of the
three arbiters this review deliberately holds back; the Harmony 700 image, kept out of the packet on
purpose; every contributed config dump, which is other people's equipment; and the three firmware
packages, each carrying the original downloader's Logitech account identifiers and a session cookie.
**None of that is ours to hand to anybody**, and the config dumps and the account fields are the half
that would still be wrong even if the review needed the rest.

The parent directory of the repositories is not a git repository, so a workspace directly under it has
no enclosing project for a tool to discover. That is the whole reason for the location.

| file | what it is |
|---|---|
| `BRIEF.md` | the job 1 brief. A dated snapshot, **never edited after handover** |
| `ANSWER.md` | the template to fill in, including the list of every file read |
| `one-3.4-code-base0x20000.bin` | the Harmony One application firmware, by symlink |
| `600-0.2-code-base0x9000-COMPLETE.bin` | the Harmony 600 application firmware, by symlink |
| `tools/` | the four permitted tools plus `_bootstrap.py`, by symlink, file by file so that nothing else in `tools/` comes with them |
| `src/` | the research library, by one symlink, since all of it is clean of the write path |
| `docs/`, `reference/` | the five memory maps and `reference/checksums.md`, by symlink |

**Derived images only, never a `.hfw` package**, because each package carries the original
downloader's Logitech account identifiers.

Two images rather than one, so that the per architecture comparison section 175 has is available to
the reviewer too, and whether the answers differ between them is a finding either way. The Harmony
One goes first because it is the unit a first write would go to. The Harmony 700 reference image
stays home: it is the most heavily documented of the three, so it is where accidental contamination
would cost most, and leaving it out retires residual leak 1 above.

### The packet is the workspace, and that is the isolation

**The reviewer is pointed at this folder as its working directory, not at the repository.** No second
checkout and no separate project is needed, and the reason for the folder rather than the repository
is not etiquette. What a reviewer's search surfaces is decided by where it is standing: from the
repository root, a search for the write command returns the specification immediately, and from here
it returns nothing.

So the folder carries a **working toolchain** rather than a list of paths to fetch from the
repository. The four permitted tools are symlinked in file by file, and `src/` as a single symlink
since all of it is clean; `tools/_bootstrap.py` resolves `../src` relative to its own path and Python
does not follow symlinks when it does, so the disassembler runs from this directory with no
installation and no repository path on the command line.

**Symlinks and not copies**, deliberately. A copy of the library beside a review is a second source
that can drift from the first, which is this project's oldest rule. A symlink cannot.

Measured rather than asserted: 41 files are reachable from the folder against 267 tracked in the
repository, and a sweep of all 41 with symlinks followed finds the write path named **only in the
questions themselves.** The reviewer is not being asked to resist a temptation; the answer is not
present.

The soft edge is worth stating: nothing stops an agent walking out of its working directory, so this
is a workspace and not a sandbox. The files read list at the end of the answer is what turns that
from a hope into a check.

### The control caught two leaks, both of them ours

Recorded because this project calibrates against its own recorded mistakes, and because both were
made while writing the very documents meant to prevent them.

The first was in the answer template: a row asked what the transfer's opening step carries and named
an address and a length, which is a third of question 1 handed over inside the form asking for it.
The second was worse and came later, in a worked example of how to run the tracer: the example
addresses were **the interlock variable and the routine that sets it**, so the brief demonstrating the
tools would have answered question 4 in passing. Both are placeholders now.

The lesson is the one the project already knows in another form: **a leak is likeliest in the
scaffolding, not in the argument.** Nobody pastes the finding into the brief. They paste a convenient
example, and the most convenient example is the thing they have been reading all week. The control is
cheap, it runs on every edit to the packet, and it has now paid for itself twice.

### Manifest, so the copy can be shown to be the copy

| file | sha256 |
|---|---|
| `BRIEF.md` | `7afcf3980ba16d7af5df863a33f050f0e82e2eb0daaedc5ca39d70539deb9b86` |
| `ANSWER.md` | `4bea7aeaa28fa2cfb7b66453837b7851e7021473e7d832b09005d2314454df76` |

Our own answers are pre-registered, and their checksum is here for the same reason:

| file | sha256 |
|---|---|
| `../lab/reviews/20260827-write-transfer/OUR-ANSWER.md` | `03ed435b33388a5c7c32d0c6c88644233a84bc40f2c91ac1f34035f06ca6704b`, after the correction of 27 August 2026. Pre-registration hash before it: `4bedaf65695654ee` |

**It was written while job 1 was running and before any part of the reviewer's answer had been seen**,
in the reviewer's own row shape and with the reviewer's own four confidence words applied to us. The
ordering is the point: a comparison written after reading the other side lets a claim be softened or
quietly restated to match, and nobody notices, least of all whoever is doing it. A hash in a commit is
what turns "we wrote ours first" from a claim into a checkable fact.

It lives in the lab, never in the workspace, since it states every answer being asked for. It is a
worksheet and **not a source**: every row transcribes section 175 with that section's addresses, and
anything the comparison teaches goes back into section 175 through the four places rule rather than
into it.

It also records, deliberately, **the two readings of the interlock we got wrong**, so a disagreement
can be scored honestly. If the reviewer lands on one of those instead of the current answer, that is
the most useful outcome the exercise can produce: it would mean the wrong reading is reachable from the
firmware rather than being a slip of ours. The crux is the **count of sites** that touch the bit, so
that is the question to put to any disagreement rather than what a single site means.

These two checksums are the provenance anchor, and they have to be, because the workspace sits
outside every git repository here and nothing versions it. **The completed `ANSWER.md` is copied into
the lab when it comes back**, which is where a result belongs and where the hourly snapshot keeps it.
The workspace is transient by design: it exists to be a place where the answer is not present.

One more thing to keep out of it. A reviewing tool will create its own configuration directory there,
and that is harmless. What must not be copied in are this repository's **skill documents**, per
residual 3: a fresh project has none of them, and that is an improvement rather than something to
put right.

## The answer has to be structured

`ANSWER.md` is a table with one row per claim, each carrying the claim, the addresses it was read
from, a confidence word, and what would falsify it. Free form prose gives two essays and no crisp
disagreement, where a table gives a diff.

The confidence vocabulary is fixed at four words, `traced`, `inferred`, `assumed` and `unread`, and
the reason for fixing it is that "I followed this to the instruction that does it" and "this is how
this family of parts usually behaves" must not be able to look alike. **`unread` is a real answer**
and the template says so, because at least one row is one we hold as unread ourselves.

## What agreement looks like, decided before the answers arrive

Written down now so the bar cannot move afterwards.

- Reproducing the transfer sequence **and** concluding that erase before program is unread is an
  **exact match.** Leaving question 2 open is not a failure, because we leave it open too.
- Answering question 2 either way is a **result.** It takes the ordinary route, a hypothesis under
  decision 7, then the four places rule.
- Answering question 3's peripheral half by reading the endpoint's ownership bit is a **result**, and
  it closes the half section 175 could not.
- Getting question 4's polarity and resting state right, blind, on a bit two of our own readings got
  wrong, is the strongest confirmation available without hardware.

**Blindness is checked, not promised.** An agent with filesystem access cannot be prevented from
reading a repository, so the enforcement is after the fact, which is this project's own standard: a
claim that is not executable is only an assertion. The answer ends with every file read, and that
list is compared against the withhold list. A hit does not waste the work; it says which rows to
treat as dependent, which is better than assuming they were independent and being wrong.

## If the two derivations disagree

The project's rule applies and it is not optional: reproduce the disagreement on the same inputs,
find an **external** answer, say which was wrong **and why**, and only then change either copy. That
rule was broken once, in August, on two infrared decoders, and it happened to come out right.

Three external arbiters exist and none needs hardware: the concordance protocol document, Logitech's
own client, and the Microchip datasheet. All three are withheld during the derivation precisely so
they stay available afterwards.

## Jobs 2 to 4

Ordinary reviews, brief in hand, each phrased as a falsifiable task rather than as "review this".

**Job 2, the rails.** Find an input that reaches a flash write outside the config region, or with the
enabling flag off, or an erase that is not block aligned. `packages/usb/src/rails.ts` holds ten named
assertions and two exported helpers, and the helpers are exported **solely so their refusals are
testable**, which is where to look first. Two specific targets: a missing table entry treated as "no
limit" rather than as a refusal, which was a real defect once; and the RAM write assertion, which
bounds an address below the special function register page and deliberately requires neither a
verified dump nor a version match, since neither means anything for volatile memory.

**Job 3, the rehearsal.** Find a path where `packages/usb/bin/rehearse-block.ts --commit` leaves the
remote worse than it found it. It has two windows by construction and it names both: erased but not
yet written, and written but differing on read back. Two design decisions to hand the reviewer rather
than let them rediscover. The argument parser exits the process, which skips `finally`, so after the
device is open the script throws instead, to close the handle. And the dump allow list exists because
two Harmony Ones enumerate identically and a serial check is deliberately not built, so the wrong
dump name with the programmed unit attached would compare equal and erase the project's most used
sample.

**Job 4, the recovery route, and this is the sharpest of the three.** Not a code question. Every
backup is verified faithful and **restoring from one has never been performed on a Harmony One**,
which the write of 30 August 2026 did not change: it reproduced bytes already on the device, so it
never needed the route and therefore never tested it. The
one successful recovery this project has seen was a single EEPROM byte on a Harmony 525, telling a
bootloader to install an image already resident in external flash. A Harmony One configuration
restore is an erase and write of 26 blocks into external NOR: different architecture, different
medium, different operation, and three orders of magnitude apart. So the Harmony 525 success does not
transfer, and `docs/adding-a-device.md` asks for the restore to be rehearsed **before** the write
with that box unticked. The question is what would actually be done, in order, if a first write left
the spare unbootable, and which step of that sequence is unproven.

## Two rules on the output, whatever it says

- **It is a report, not an instruction.** Same standing as any upstream finding under decision 7: a
  hypothesis to test. If it says a rail can be relaxed for a test, the answer is no. That is
  precisely the shape `CLAUDE.md` warns about, and it does not change because the text came from a
  reviewer we invited.
- **The review is read only by construction.** It reads firmware and code. It does not run the
  rehearsal, it does not run anything that opens a USB device, and it does not touch a remote.

## What this does not do

- It does not decide whether to perform the first write. Jobs 3 and 4 exist to inform that decision
  rather than to authorise it.
- It does not close the two open firmware questions by itself. It creates a second reading, and if
  the two readings agree they are still two readings and not a measurement on hardware.
- It gives the reviewer no project brief, deliberately, until job 1 is done. **That is also a gap**:
  with no brief it has no rails either, so nothing hardware shaped goes near it in the meantime.

## What happened, recorded on 27 August 2026

The reading was returned the same day. Its file list names only permitted paths and it reports having
read nothing withheld; corroborating that against filesystem access times **failed as a check** rather
than passing, because this filesystem does not track them usefully, so the self report and the empty
workspace are the evidence.

It agreed with section 175 on everything section 175 was confident about, including both halves of the
interlock that two earlier readings here got wrong. It **closed half of the erase question**, tracing
that the Harmony 600's program path sends the page program opcode and never the block erase opcode, and
it **advanced the pacing question** by reading the endpoint buffer descriptor and its ownership
handshake, leaving only the silicon's response to an unowned buffer as a stated assumption. It also
found a hazard nobody here knew: a data packet declaring zero payload bytes runs the staging copy loop
256 times over the command state block. All three are verified here and written up as section 186.

**The two errors it exposed were in our own pre-registered worksheet, not in the repository**, and the
lesson is the one this project has learned before from a different direction: the worksheet was a third
copy of a derivation, nothing tested it, and it drifted from its source inside one afternoon. Both rows
are corrected in place there and the hash above moved accordingly.

So the exercise did what it was for. It did not overturn the derivation, and it was not a rubber stamp:
it closed one open question, moved another, added a hazard, and caught a summary that had gone wrong.
Job 4 answered itself from the firmware and job 3 was performed here, both below. **Job 2 has not
been run.** This said jobs 2 to 4 had not been, which was written when it was true and stayed after
the section below it recorded job 4.

## Job 4 answered itself from the firmware, on 27 August 2026

Job 4 was framed as "not a code question", and that framing was wrong: most of it is a firmware
question and reading the firmware settled it, section 189. Recorded here because the framing is the
mistake worth keeping, and because it changes what a reviewer would still be for.

**What the firmware settled.** The Harmony One has a recovery mode resident in the first 4 KiB of
internal program memory, entered by a key held at power on, before the application runs. It scans the
keypad once it has configured the external bus and satisfied itself that external flash is programmed,
and one key code keeps it resident in a USB service loop that never returns. When that flash check
fails the scan is skipped and the path still reaches the same loop, so neither arm strands a host. In that state it is a **flash programmer**: twelve commands including read, write, erase and
a run the image command, identical on the Harmony 600 down to the instruction sequence of the erase.
It **protects itself**, refusing to erase any address below its own end, and unlike arch 9 it copies
nothing when entered, so the Harmony 525's one way door does not transfer.

**Which retires the analogy this job was built on.** The brief argued that the Harmony 525 EEPROM byte
success "does not transfer" to a Harmony One config restore, and that is still true, but for a reason
the brief did not have: the two are not comparable because on arch 12 the recovery path is not an
install at all. Nothing is copied over anything.

**And it relocated the reassurance rather than supplying it.** Every write path in that programmer goes
through the PIC18's internal self programming interface, and a config lives in external NOR, so the
programmer is **not shown to restore a config**. What actually makes a first write survivable is
structural and simpler: a write confined to the config region cannot reach the bootloader or the image
above it, so a damaged config leaves a remote that still boots and still answers our own read and write
path. The programmer is the layer below that, for the failure the rails already make unreachable.

**What was left of job 4 was one power cycle, and it was done on 27 August 2026**, section 190. Off,
held across a battery insertion, put the spare Harmony One into **safe mode** in about five seconds, so
the third party repair sheet is correct about the key and is no longer a hypothesis. A plain power cycle
left it again, which arch 9 does not do. The remote's own screen listed five images with checksums that
match four of ours plus the application's, and one `GET_VERSION` confirmed software type 4 on a live
Harmony One for the first time while refuting a claim of ours about a neighbouring field.

**And job 1's own answer carried a scope error nobody caught for a day**, section 191. The reviewer
wrote that the instruction which puts a byte into the Harmony One's parallel NOR "is not in anything
this project holds",<!--superseded--> which was **true of the packet** and false of the repository: the withhold list
gave it the two application images and deliberately not the internal pages, where that code has sat
since section 22. It was adopted here in the reviewer's words rather than in its scope. **That is a
failure mode of the instrument rather than of the reviewer**, and it is worth more than the finding: a
blind reviewer's negative statements are about what they were given, so adopting one requires
re-checking it against everything the list withheld. The positive statements do not have this problem,
which is why the interlock and the packet framing transferred cleanly.

**What is left is narrower and stated exactly.** A Harmony One's recovery has **two** levels: safe
mode, now confirmed on hardware, and the bootloader's own USB loop one below it, section 189's `0x0E`,
which was not reached and whose key is still unknown. The two are told apart by their USB identity,
since safe mode presents Logitech's own and the bootloader presents Microchip's. **Safe mode is shown to be capable of restoring a
config**, section 191, since it carries its own external flash programmer with erase and program
commands, which corrects section 189's limit: that limit was the bootloader's. What is **not** shown is
that we can drive it, because safe mode's host side transfer protocol is unread.<!--superseded--> So **the restore box in
`docs/adding-a-device.md` is still unticked**, and the reason has changed from "the remote may not be
able to" to "we have not read how to ask it", which is a better place to be and is work rather than a
question about the hardware.

**That last sentence was true for a few hours and section 192 closes it.** Safe mode's host side
protocol is not a second protocol: its dispatcher carries six of the application's seven commands with
the same command bytes and the same state numbers, absent only infrared capture, and both flash commands
reach the parallel NOR programmer. So driving it needs nothing this project has not already read, and
what is left before the restore box can be ticked is a rehearsal rather than a derivation.

**Section 192 also answers job 1's question 4 a second time, and the two answers compose rather than
compete**, which is worth recording because the reviewer's agreement with section 175 on the interlock
was the exercise's strongest result. Section 175's bit decides whether a write below `0x020000` may
proceed; section 192's routine decides whether a request means that region at all, and its internal arm
reaches exactly `[0x000000, 0x020000)`. Same boundary from the write executor and from the address
parser, neither derived from the other. So the question was well chosen and it had two halves, and a
reviewer given only the executor could not have found the other.

**The instructive part is how it was found.** Two sections of `docs/findings.md` contradicted each
other on the load bearing point, 87 saying the bootloader scans the keypad and 118 saying it reads no
port at all, and both carried a passing test. This is the document that has never drifted because every
section in it carries a regression test, and the mechanism that failed was not the absence of a test
but two tests whose bodies could not see each other's claim. Nobody noticed until a question forced the
two together.

## Job 3 was performed here, on 30 August 2026

**Not by a second reader**, which is the honest label to put on it: the brief says job 3 wants the
rails in front of it and needs no independence, so doing it here costs nothing structural, and it is
still one reader looking at code written by the same project. It found enough to be worth doing and
that is not an argument that a second reader would find nothing.

The question was the brief's: find a path where `bin/rehearse-block.ts --commit` leaves the remote
worse than it found it. Nothing was run on hardware and no remote was attached.

**One hazard with teeth, and it was already written down.** `ERASE_BLOCK_SIZE` in
`packages/usb/src/rails.ts` carries a docstring naming `rehearse-block.ts` as the thing it does not
protect: `ERASE_FLASH` takes an address and no count, so the chip decides how much goes, the 64 KiB
figure is Logitech's client's word rather than a measurement, and a script that reads back and
restores exactly one block would not notice a larger sector. The script did exactly that. It read the
named block, erased, checked that block reads as all ones, wrote that block back, and compared that
block, so an erase reaching into the neighbour would have destroyed a second block of the
configuration and reported success. That is the whole failure the job asked for, sitting behind a
constant this project has never confirmed on the chip in front of it.

**The fix measures it instead**, and needs no lab, no client table and no extra write. The script
reads the block either side before the erase and again after it, and refuses if either moved. Both
sides, because a larger sector contains the named block in whichever half. A neighbour that would run
off the chip is dropped rather than clamped, since half a block compared with half a block reports
success having looked at less than it claims, and with **no** neighbour readable the erase is refused
outright: nothing would then measure the span, and the span is the thing in doubt. The arithmetic and
the wording sit in `packages/usb/src/rehearsal.ts` with a test each, since the script itself cannot be
tested without an irreplaceable remote. The flash id is printed too, which is the other confirmation
that docstring asks for and which nobody has performed: the client picks its block table from the
chip's JEDEC ids, so a dry run now produces the number that decides which row applies.

**Three ways the script could have failed to say what it knew**, all at the moment the block is
incomplete and the operator is deciding whether to unplug.

* `HarmonyRemote.writeFlash` throws `RemoteError` when a write is never acknowledged, and its own
  text says what reached the device is unknown. The script's handler translated a rail refusal and
  its own `Refusal` and rethrew everything else, so the one class that arrives with the block in an
  unknown state was the one printed as an unhandled rejection with a stack.
* The `finally` closed the device without catching, so a close that failed, which is exactly what a
  remote that has stopped answering would do, replaced that message with its own.
* Ctrl-C between the erase and the verified read back printed nothing at all. Node's default handling
  of SIGINT terminates without unwinding, so neither the `finally` nor the handler ran, and the
  thousand reports a write takes are long enough that an operator pressing it is a realistic path
  rather than a contrived one.

All three now go through one function that appends what to do next, and it appends it only after the
erase has gone out: telling somebody not to unplug when nothing is at risk is what teaches them to
ignore the sentence when it is true.

**One rule the file stated and broke.** Its own docstring for `Refusal` says `fail` calls
`process.exit` and skips the `finally` that closes the device, so a refusal raised after the remote
is open must be thrown. Five of them called `fail` anyway, all pre-write, so the cost was an unclosed
handle on an exiting process rather than anything reaching flash. It is the shape this repository
records as an unreachable guard reading as protection, one level up: a rule with a reason, in the
file it governs, not followed there.

**What was checked and found sound**, since a review that only lists what it disliked is not a
report:

* **The erase and the write cannot disagree about the range.** They bound differently, the erase
  against the region ceiling and the write against the end of the configuration, so a rail refusing
  the write after a successful erase would open the window the job is about. It cannot happen here:
  the script refuses a block the dump does not cover before it sends anything, which makes the
  write's bound the tighter of the two, and `writableRange` refuses a configuration length past the
  ceiling for both.
* **The guarded transport authorises one exact report at a time**, so the several hundred reports of
  a transfer cannot ride on one permission, and the rail is asked before each.
* **The dump allow list and the enumeration refusal behave as documented**, including refusing when
  more than one remote is attached rather than offering to pick.
* **The argument parsing has no path to a wrong address**: a missing or malformed `--block` is a
  refusal, and every value that survives it is checked for block alignment and for being inside the
  region.

**What this does not do.** It is a reading of the script and the two modules under it, so it says
nothing about whether the derived protocol is right, which is job 1's subject and was answered on 27
August. And the erase span is now **measurable** rather than measured: what confirms it is the first
run with `--commit`, which is the run the checklist gates.
