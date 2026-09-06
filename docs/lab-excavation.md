# Excavating the lab: what we are looking for, how it gets logged, and how the digging runs

The plan for step 9 in `todo.md`, which is the step, and decision 12, which is the argument.
This document is the method. It exists because the same failure has now happened **six** times, most
recently section 209, where the check was run correctly on the square the dig started in and the dig
then wandered into one it had not checked. This opening said four until 29 August 2026, while the
"where the digging stands" section below already said six: a
session works something out that the lab already answered, most recently section 197, where
Logitech's own per model protocol specification had been mirrored **and read** for nineteen days
without a single fact crossing into this repository.

**The site is 12506 files and 2.3 GB**, measured on 28 August 2026. Nobody can say how much of the
knowledge in it is already here, and that unknown margin is the whole problem, which is why the
answer is a survey rather than a search.

## The one rule that shapes everything else

**A catalogue is not a claim, and only a claim needs a test.**

* A **claim** says how a remote or a format behaves. "The commit runs only when the remote answers
  `m`." It can be wrong, so it takes the ordinary route: a structured fact, a written argument, a
  regression test, and a sweep of everything that summarised the old answer.
* A **catalogue** says what exists and where. "Their client calls these 308 operations; this one runs
  during a sync; this one probably feeds the device wizard." It cannot be wrong in that way. It can
  only be incomplete or out of date, and a test adds nothing to it.

Most of what the site holds is the second kind, and **demanding a test for a catalogue is what would
keep the site unexcavated**, because it makes writing a row cost more than leaving the knowledge
where it is. That is the mistake this project's own habits pushed towards, corrected on 28 August
2026 by Danny: the four places rule is for facts we depend on, not for an inventory.

So a catalogue entry needs three things and no more: what the artefact is, where it came from, and a
marked confidence. **"Most likely the device wizard" is a useful and honest row.** An unmarked guess
is not.

## Where the digging stands

**Written on 29 August 2026 because this document had no answer to "where are we".** It carried the
method and the want list and no progress at all, so the only way to answer was to write a script over
the register, which means nobody could answer it by reading. It also has no step numbers of its own:
"step 9" is `todo.md`’s own numbering for the whole excavation, and the only numbering here is the
per square loop below.

**The numbers are a command rather than a paragraph**, `make lab-progress`, which recomputes them from
`reference/lab-register.md`. That is deliberate and it is not caution: `CLAUDE.md` carried "58
artefacts" for a day where the register holds 44, because a count in prose has nothing recomputing it.
The command prints the depth of every artefact, a tick per want list tag when all of its artefacts have
landed here, and the list of what is still shut.

What the tick means is narrow: **every artefact carrying that tag has been written up in this
repository**. It does not mean the question is answered. A tag can tick because its one artefact turned
out to hold nothing, which is a result and is why an untagged row is legitimate.

Two states the tick cannot express, and both need reading rather than counting:

* **a tag no artefact carries at all**, which the report calls out separately. That is not progress, it
  is a hole in the survey: `provenance` was in exactly that state on 29 August, with the archived
  firmware packages carrying a stranger's account identifiers and no row saying so.
* **a target the site cannot answer**, as against one nobody has dug for. `compiler` is the case: the
  biggest prize on the list, and `SERVER-DEPENDENCY.md` says the configuration compiler was server side
  and is gone, so its remaining rows are unlikely to move it. A count cannot tell those two apart. Its
  last unopened artefact was dug on 29 August and held **two Java decompilers and a JDK**, section 214,
  so the tag lost a row rather than gaining an answer, which is the shape to expect from the rest of
  them.

**One artefact on the whole site is still `unseen`**, the vendor's icon set, and the excavation is
therefore into its second phase: what is left is reading squares that have been surveyed rather than
finding squares nobody has opened.

## What we are looking for

Seventeen targets, each a tag an artefact row can carry. A row with no tag is an artefact somebody
looked at and found nothing in, which is a result and gets recorded as one.

The tags are **names rather than numbers**, so they stay greppable when the list is reordered, and
the FreeHarmony ones carry an `fh-` prefix so one search answers "what does the site hold for the
application".

### For the format and the protocol

| tag | what would count as a hit |
|---|---|
| `compiler` | how a household becomes a container. The biggest prize here by a wide margin, since generating configs is the whole route this project takes |
| `ir-db` | their device and command database: makes, models, code sets, and the timings per protocol family |
| `ir-learn` | how a captured signal was classified into a storage class, which is the one piece a local learn has to replace |
| `scan-codes` | which button a scan code is, per model. Open on the Harmony One and the Harmony 525, where a circuit board is currently the only route |
| `models` | skins, regional pairs, display sizes, device maximums, capability tables |
| `intermediate` | the form a configuration passes through before it is a container, if there is one, and the rules that lay out an activity's screens |
| `write-path` | the two questions standing in front of the first write: whether the firmware erases before it programs, and whether a host must pace its packets |
| `restore` | recovery procedures and images per model, which is what makes a first write survivable |
| `packages` | the EZUp, EZHex and hfw2 variants across generations, and which models we hold firmware for |
| `service-api` | their service surface: the call list, which operations still answer, and what each is for |
| `provenance` | which artefacts carry somebody's personal data, so the publication rules stay enforceable rather than remembered |

### For FreeHarmony

Added on 28 August 2026 at Danny's request, and the reason to want them is stronger than product
inspiration: **their interface is a labelled view of the config format.** Every setting in their
client corresponds to bytes this project has already read and cannot always name, so an inventory of
their fields is a semantic key for the format as well as a specification of the domain.

| tag | what would count as a hit |
|---|---|
| `fh-data-model` | their entity graph as the service states it: household, account, remote, device, activity, command, button map. What an import has to consume, and the only outside opinion on how these relate |
| `fh-screens` | which screens each client has, what each shows, and what each lets a person change. Three clients of different eras, so where they agree it is the domain talking rather than one designer |
| `fh-wizard` | add a device, add an activity, the guided setup and the order of its questions. Listed as unread in `docs/host-client.md` |
| `fh-settings` | every setting and its type, per device, per activity and per remote: power on delay, inter key delay, input method, repeat rate. Most of these are bytes already read without a name |
| `fh-limits` | name lengths, allowed characters, maximum devices, maximum activities, the sequence step cap. What an interface needs before it can refuse anything |
| `fh-failures` | what their client says when a sync goes wrong, which is what the application has to handle rather than crash on. **No artefact on the site carries this tag now**, since 29 August 2026: `software/classic/reports/` was the only one and section 210 found its failures are ours, a missing server and a toolkit that will not start, rather than a user's account of a remote. The tag stays on the want list because the want is real; what it has lost is its one candidate |

### Deliberately not on the list

* **The emulator.** Deferred, `docs/emulator-design.md`, and it would pull the survey towards firmware
  internals.
* **The hub family.** Out of scope, and large enough to swallow the whole excavation.

Both are exclusions rather than absences: an artefact that is only about one of them gets a row
saying so, and nothing further.

### Two cautions that apply to every FreeHarmony tag

**Their screen designs and their copy are their expression.** A row says what a screen is for and
never lifts its wording or its layout. That is the same line `reference/silhouettes/` sits on, where
the geometry is traced and the printed words are ours.

**This is evidence about the domain, not a design to copy.** Danny's direction for the device library
is already better than theirs, and a survey that reads as "here is what to build" would be worse than
useless.

## How it gets logged

Two layers, because they do different jobs.

### The register, which guarantees coverage

`reference/lab-register.md`, one row per **artefact**. That unit was chosen deliberately on 28 August
2026 and both alternatives were rejected by measurement: one row per file is 12506 rows and
unfinishable, and one row per top level directory is nine rows, which is what step 9 shipped first and
it is useless, since section 197's own square was already named in it. An artefact is one mirrored
client, one firmware package, one contributor's dump, one capture session, one manual.

**The estimate written here was "a few hundred rows" and the survey came in at 44**, which is out by
about a factor of five and is corrected rather than quietly dropped: the number was the argument for
choosing the artefact as the unit, so being wrong about it says the unit is coarser than it looked and
makes the remaining work smaller than this document implied. The register is complete by test, so it
is not going to grow into the old estimate.

| column | what goes in it |
|---|---|
| path | relative to the lab root, with a trailing slash where it is a tree |
| what it is | one line, plain |
| files | how many, because a count is what tells the next person the size of the job |
| origin | where it came from and when, in the manner of `reference/checksums.md` |
| status | `unseen`, `surveyed`, `read`, `catalogued`, or `mined`. See below |
| tags | from the list above, space separated, or empty |
| holds | one line on what is inside, with a marked confidence where it is a guess |

The five statuses, and the distinction that matters is the last two:

* `unseen`: it is in the register because it exists, and nobody has opened it.
* `surveyed`: somebody has looked at the shape of it, listed it, and can say what kind of thing it is.
* `read`: somebody has read enough to say what is inside.
* `catalogued`: its contents are written up in a document in this repository.

  **Two things promote a row to this, and they are written down because a status pass on 30 August
  2026 moved fourteen rows at once and a judgement call per row is not repeatable.** Either the row
  cites a section here that writes up what the artefact holds, which is what `read` plus a citation
  already means; or the row carries **no want list tag** and its note says why nothing is wanted, which
  is a finished answer and should stop being counted as outstanding work. A Python virtual environment
  and a directory of build products are the clearest cases: leaving them at `surveyed` forever makes
  the progress count read as a backlog when it is a result.

  **An empty note is the state to hunt for, not an artefact with nothing in it.** Section 214 asserted
  that nothing recorded why an abandoned effort stopped, and the record was in a file whose row was
  `read` with a blank note, so the register offered no hint either way. From outside, "nothing is in
  it" and "nobody wrote down what is in it" are the same row. Fill the note or the status is a guess.
* `mined`: everything in it that this project wants has been extracted. Rare, and it is a claim about
  a want list that can change, so a `mined` row names the date it was mined.

### The pages, which hold the value

One document per area, in `reference/`, with a name that says what it is: the service call list, the
client screen inventory, the settings and their types, the package format variants. **These are
catalogues, so they carry no tests**, per the rule at the top. They carry provenance, a date, and a
confidence word on anything inferred.

A page may cite the lab freely by path. It may not contain firmware bytes, config bytes, personal
data, account identifiers, or Logitech's own text.

### What is checkable and what is not

The register is checkable and gets a test: **every artefact in the lab appears in it**. That test is
the half that would have caught section 197, and it survives the session that writes it, which no
habit does.

The pages are not checkable and deliberately get nothing. What replaces a test there is the register
row pointing at the page, so a page that stops matching its artefact is at least findable.

**And landing a claim is unchanged.** If the survey answers a question currently listed as open, that
answer is a hypothesis under decision 7 and then takes the four places. The relaxation at the top of
this document is about cataloguing, not about facts this project relies on.

## How the digging runs

**Survey the whole site before digging anywhere.** Not knowing what is there is the entire failure, so
the first pass is breadth first and shallow: every artefact gets a row, a status of at least
`surveyed`, and its tags guessed from its shape. Cheap enough to finish in one sitting per square.

Then dig in **value order rather than folder order**, which is what the tags are for: the squares
carrying `compiler`, `fh-data-model` and `fh-settings` come before the squares carrying nothing.

Per square, the loop is the same four steps, and **step 0 is a command**:

0. **Ask the register what it already says**, `make lab-check PATH_ARG=<path>`, on the path about to
   be opened. It prints every row bearing on it, ancestors and descendants both, and a row at `mined`
   means the honest next move is to read somebody's extraction rather than the artefact.

1. **List it.** What is in there, by kind and count, without opening much.
2. **Row it.** One register row per artefact, tags guessed, status `surveyed`.
3. **Read the tagged ones.** Enough to replace a guessed tag with a real one and to write the `holds`
   line.
4. **Page it.** Where a square carries something worth having, write the catalogue page and move its
   rows to `catalogued`.

**Step 0 is per path, not per dig, and that distinction is the whole of section 209.**

**It failed twice more in the session that wrote it**, section 213, so read the next paragraph as a
description of something that actually happens rather than as advice. **Step 0 is a hook since then**,
`bin/lab-register-hook.py`: it prints these rows when a lab path is opened and interrupts the first
touch of each directory, so the step happens whether or not anybody performs it. Run `make lab-check`
when you want to ask deliberately; do not rely on remembering to. Both times the check was run on
the paths the dig set out to open, correctly, and then a method name led into a directory whose row
says mined and the check was not re-run, because the subject had not changed. A dig
wanders: a string in one square names a class in another, and following that name is what a dig is
for. Crossing the boundary does not feel like opening a new artefact, so nothing fires. Six digs on
this project have re-derived something the lab already held, and the sixth had run the check
correctly on the square it started in. Run it again whenever the path changes, even when the subject
has not.

**Two things to expect, and neither is a reason to stop.** Most of it is worth nothing, and the value
is being able to say so with a row instead of a shrug. And some of it answers something open, which is
the outcome the decision was taken for.

### Where the parallelism goes, and where it must not

The survey is the one part of this that splits cleanly: squares are independent, the output is rows,
and a wrong guess costs nothing because step 3 corrects it. So a square is a reasonable unit of work
to hand out, and the grid in step 9 is already a set of disjoint paths.

**The unit of work is a square and the unit of conflict is a file, and those are not the same thing.**
This is the part a plan gets wrong by omission: the register is one file, so six workers appending
rows to it collide, and that collision costs more than the parallelism saves. Two rules, and they are
worth stating before anything is spawned rather than discovering them through a merge:

* **A surveyor never writes.** It reads its square and **returns** its rows; one thread writes the
  register. So there is exactly one writer however many readers there are. It has a second benefit
  that was not the reason for it: a worker that cannot write also cannot touch the lab's own git, and
  the lab has an hourly snapshot that would otherwise commit whatever a worker left behind.
* **One page per square**, named after the square, when the deep pass starts. That gives the writing
  half the same property the reading half has.

Reading and paging still do not split as well as surveying, because a page's value is often in
relating things that sit in different squares, and that is exactly what a per square worker cannot
see. The three clients agreeing about a screen is the example: no worker holding one client can notice
it. So the relating passes stay single threaded, by choice rather than by oversight.

**And landing a claim is serial, whatever else is running.** Every claim touches `docs/findings.md`,
`reference/superseded.md` and usually `CLAUDE.md`, so those files are serialisation points by nature.
Parallel workers survey and catalogue; anything that becomes a fact this project depends on comes back
to one thread and takes the four places there.

### The rail that does not move

Reading Logitech's code and firmware is governed by `docs/host-client.md`'s rule already. A fact from
it is marked client sourced, the firmware stays the authority wherever it can settle something, and
nothing from the site is ever committed except our own description of it.

And per decision 12: **a find is not landed until it has taken the ordinary route into this
repository.** Saying so in a lab note is the state the decision forbids, and it is the state that
produced section 197.

### Whose claim is it, and why the register cannot answer that

Section 214, and it is the one failure mode this method had no answer for. The register describes
**artefacts**: what a thing is, how deep anybody has been, and which tags it might answer. It cannot
describe **whose claims are inside one**, and on this site that distinction is not academic, because
this project's own work is scattered through directories that are correctly catalogued as somebody
else's.

The case that made it: a read out this project built in August lives in `software/classic/dist/` as
two source files under a `local` package inside Logitech's own namespace, in a tree whose register row
accurately says "the vendor's decompiled source, surveyed, searched and not read". Its documentation
states that a remote names its own regions. It does not, and establishing that took an afternoon
twenty two days later. Every register status involved was correct and none of them could have helped.

So when a lab file states something about a remote, **check who wrote it before believing it and
before re-deriving it**. The tell is not the directory and not the package name, both of which lied
here; it is the voice and the date. Ours is dated 2026 and reads like this repository's documents.

Two practical consequences for a dig:

* **A find in a lab file that turns out to be ours is not a find, it is an unlanded claim**, and it
  takes the ordinary route into this repository like any other, per decision 12. That is what the rule
  above already says; what section 214 adds is that such a claim can be **wrong**, and that nothing
  here can see it. A claim of ours in a lab docstring is worse than the same claim in a lab note,
  because a note announces itself as ours and a package name announces the opposite.
* **When a square turns out to hold our own material, say so in its register row in the same pass.**
  Three rows have now been corrected in that direction, `reports/`, `tools/` and `dist/`, and in each
  case the row's description of the artefact as Logitech's is what made the square look expensive and
  kept it unopened.

## The grid, and where the excavation stands

*Moved out of `docs/plans/002-the-roadmap.md`'s work sequence on 6 September 2026, when that document was retired.
It belongs beside the method rather than in a plan: `tests/test_toolchain.py` holds the paths named
below against the lab itself, so this is the map the check reads.*

**Decision 12 is the argument; this is the job.** The lab holds 12506 files in 2.3 GB, measured on
28 August 2026, and the knowledge in it is a superset of the knowledge in this repository by an
unknown margin. That margin is the problem: nobody can say how large it is, which is why the answer
is an exhaustive walk rather than a search.

The grid, with the two squares that matter marked. File counts are what to plan against, not bytes:

| square | size | files | what is known about it |
|---|---|---|---|
| `software/classic/` | 700M | 4809 | the 7.x generation's own software, and the square where most of the want list still points. Sections 204 to 209 worked it: `PROTOCOL-CONSTANTS.md` and `SERVER-DEPENDENCY.md` are mined, `LEARN-IR.md` is catalogued, and `src/` and `res/` are surveyed with the HID command layer and three resource files mined. `reports/` is mined as section 210, and `tools/` and `dist/` were dug on 29 August 2026 and are **ours rather than Logitech's**, sections 214 and 215: two decompilers and a JDK, and our own abandoned rebuild of their application. **Nothing under this square is unopened now.** This row said one file had been read and the other 4808 were unexamined |
| `work/myharmony/` | 234M | 3458 | the service client and its captured replies, plus what looks like a decompiled web application source tree that nothing here has ever opened |
| `software/harmony-remote-software-8.0/` | 7.8M | 1018 | unexamined |
| `software/MyHarmony/` | 183M | 317 | the Silverlight client. Section 132 concluded it holds no protocol; that conclusion predates knowing the recovery tool is reached from it |
| `software/LogitechHarmonyRemoteSoftware.app/` | 202M | 208 | catalogued 29 August 2026, section 214: the **pristine vendor build**, and the copy to compare it against is our repack rather than the unpacked original, which is what its register row had guessed |
| `software/desktop-webapp/` | 21M | 370 | **section 197's square**, and the one that proves the point |
| `reference/logitech-icons/` | 20M | 1560 | opened 30 August 2026, section 216, and it was **ours**: an extraction of every graphic resource in Logitech's software. It was a third complete and is finished now, 1554 distinct images. The artwork stays in the lab; the category names crossed |
| `Docs/` | 20M | 7 | user manuals, the source `docs/how-a-harmony-works.md` rests on |
| `dumps/`, `firmware/`, `reads/`, `golden/`, `ghidra/`, `reviews/`, `units/`, `bin/` | 172M | 258 | the well worked areas, and still to be registered rather than assumed. `units/` is the newest and the smallest, one hex line per bench remote: which unit is on the cable, which is what the write rails compare against and what may not be in a public repository, section 226 |

**`docs/lab-excavation.md` is the method**, written on 28 August 2026 with Danny: the seventeen
things we are looking for as greppable tags, the register's schema, the five statuses, and the loop
per square. Three decisions in it are worth knowing without opening it.

**The unit is the artefact**, one mirrored client or one firmware package or one contributor's dump,
and both alternatives were rejected by measurement: per file is 12506 rows and unfinishable, and per
top level directory is the nine row grid above, which is useless, since section 197's own square was
already named in it.

**A catalogue is not a claim, and only a claim needs a test.** This is a relaxation of this project's
own instincts, taken by Danny on 28 August 2026, and the reason is that the alternative is what keeps
the site unexcavated: if writing down "their client calls these 308 operations, this one probably
feeds the device wizard" costs a finding and a regression test, nobody writes it and the knowledge
stays in the lab. A catalogue can only be incomplete, not wrong, and a marked guess is a useful row.
What is unchanged is that a claim this project **depends on** still takes the four places.

**Six of the seventeen targets are FreeHarmony's**, and the reason is stronger than product
inspiration: their interface is a labelled view of the config format, so an inventory of their
settings is a semantic key for bytes already read and not yet named.

**The deliverable is a register in this repository**, `reference/lab-register.md`, one row per
artefact: what it is, where it came from, what is inside, and a status. **It exists**, 44 rows, with
`TheLabRegisterCoversTheSiteAtArtefactLevel` asserting that every artefact in the lab has one. This
sentence said it did not exist for as long as the paragraph eleven lines below said it did.
`reference/checksums.md` is the model for the tone and `tools/corpus.py` for the idea, since it
already reports which dumps have no description recorded. The register covers the whole site, not
the binaries, and the catalogue pages beside it hold the substance.

**Definition of done, so this cannot be declared finished by feeling.** Every path in the lab appears
in the register with a status; a test walks the lab and fails on an unregistered artefact, skipping
cleanly where there is no lab, exactly as every other lab backed test does. That test is what makes
the mechanism survive the session that builds it, and it is the half that would have caught section
197 nineteen days earlier.

**The survey pass is done, 28 August 2026**, and `reference/lab-register.md` is the register: 44
artefacts across the eleven squares, each with a status and the want list tags it might answer, and
`TheLabRegisterCoversTheSiteAtArtefactLevel` is the test, controlled by creating an unregistered
directory and watching exactly one test name it.

**So the stated definition of done is met and has been since the survey**, and saying only that would be
a declaration by wording rather than by feeling. The digging the paragraph above left behind is what is
actually outstanding, and as at 30 August 2026 it is this:

* **Nothing is unopened.** The last artefact at `unseen` was dug on 30 August 2026, section 216, and
  like the two before it, it held our own work rather than Logitech's. So the phrase "the rows at status
  `unseen`" now names an empty set, down from five in two days.
* **That pass was done on 30 August 2026**, section 217, and it moved fourteen rows without opening
  anything: 36 of the 44 are written up here now, against 22 two days earlier. The rule it applied is
  in `docs/lab-excavation.md` beside the status definitions, so the next one is repeatable.
* **Eight rows are genuinely outstanding**, and they are the reading work this step has left: the
  Silverlight packages at 170 MB, MyHarmony's decompiled source where one flow of 2643 files has been
  read, the classic client's `src` and `res`, the 8.0 generation, our own read session notes, the draft
  material, and the classic client's parent row whose children carry the detail.
* **Three of the seventeen targets are closed**, `intermediate`, `packages` and `scan-codes`, the last
  of them by the status pass, and it closed because its one artefact was already written up rather than
  because anything new was found. A tag can close that way, which is a result and not a gap. **Three cannot be closed
  from this site**: `compiler`, because the configuration compiler was server side and is gone;
  `fh-failures`, which no artefact carries; and `fh-limits`, which section 207 judged unlikely here
  because this client is an executor whose interface never named a device.

The honest summary is that the excavation is **past its discovery phase and into its reading phase**:
finding squares nobody has touched is **finished**, and what remains is reading squares that have been
surveyed. Those are worth doing in tag order and none of them is urgent, since the two squares that
carried the highest value tags are both dug.

**The survey paid for itself on its first square**, which is the argument for having done it before
digging anywhere. `software/classic/SERVER-DEPENDENCY.md` is 278 lines written on 7 August 2026 and
never crossed, and it says the client is an **executor and not a builder**: reading, writing, learning
and firmware update are all local and work today, and the device database, the interface and the
**configuration compiler** were server side and are gone.

**Three squares dug on 28 August 2026, and the third is a warning.** Section 206 went into the same
client's HID layer, extracted its seven per architecture constant tables, and found that all of them
had been extracted on 9 August and that `docs/host-client.md` is built on them. The register said so,
on its own row, and was not read. So the excavation's own instrument works and the discipline of using
it does not yet, which is the **fifth** time this project has re-derived something the lab already
held: decision 12 was itself taken after the fourth, and section 209 later made a sixth. This said
fourth, which made the next paragraph's "a sixth time" skip a number.
The register's rows now point at the extraction from both directions, and what the afternoon did buy
is worth having: the ledger of client sourced numbers had **no executable check at all** and has one
now, and three of its rows moved, two arch 12 regions explained from internal pages already in the lab
and the arch 14 logging region corroborated by every arch 14 safe mode container in the corpus.

**The `reports/` square, dug on 29 August 2026, and it is the excavation's best return so far.**
Section 210. It was catalogued as "run logs from the application" and the files turn out to be
**ours**: the 7 August session decompiled the classic client, rebuilt 827 of its 829 classes from the
recovered source, and **ran it against a Harmony One** with a local stand-in for the dead server. So
the site holds a working copy of Logitech's own executor, which nothing had recorded. What it left
behind is 69344 packets of that client reading a remote, and that is the first thing this project has
ever had to check its own USB code against something other than itself: our encoder reproduces all
1312 of its requests byte for byte, and its replies confirm the non-linear length nibble
arithmetically, 1310 reads out of 1310. Two other things fall out. Reading a remote takes exactly the
three commands our allow list holds, and **the client's first command of every session is the
`0xE0 0x01` that `end-session-experiment.ts` has never dared send**. The `fh-failures` tag loses its
only candidate, since the failures in these logs are our own.

**And the square next door, section 211**, which the first one led into: the three single byte
memory services, in no note and in no document. Every write the client makes there is read back and
compared, with no unverified variant anywhere, which is the rail this project imposes on itself
arrived at independently and applied where it costs the most. Its own address bounds are sixteen times
tighter than ours for RAM, and they are Java assertions that do not run in a shipped build, so they
are an intent rather than a limit and the rail is left alone. The register's row for that directory
was corrected on the way, from a blanket "not mined" to one status per subdirectory, since the blanket
sent a dig at a subdirectory that is extracted whole. `system/` is the next square and section 211
says what is in it.

**And the third square that day, section 212, the client's system service.** It closes an open row
in this project's own USB spec: one of the four things `READ_MISC` services had never been read, and it
is a hardware feature read whose detail 1 is the battery gauge. The client named it in a line and the
firmware confirmed it on all three images, including the part the client cannot tell you, that a detail
above 1 returns stale bytes rather than an error. Its region numbering then places version block fields
8 and 9, one of which our own test comment flags as its weakest placement, by a route with nothing in
common with ours. The correction in it is the lesson: section 211 had said one of its calls asks the
remote for a region list, from the method's name, and it does not ask the remote at all.

**The last of the client's HID services, section 213, and it is two things at once.** The dig
finished the directory and its best return is a lead about this bench rather than about their software:
their liveness ping, sent after every single operation, is **macOS only**, and macOS is where this
project's two unexplained intermittent faults live, a Harmony One dropping the first command of a
session and a Harmony One stranding after idle. That is cheap to try and it has a control. The section
also confirms section 175's write transfer from an implementation with nothing in common, records the
identity block erase as a write path nothing here had described, and finds the arch 9 two address space
split stated as the vendor's own arithmetic.

**And it is the seventh and eighth times a dig re-derived the lab, in the same session that fixed the
instrument for it.** Section 212's provenance is corrected in place: the client's name for the selector
it read was already in a lab note, unfollowed for twenty days. This dig then followed a method into
`core/flash`, whose register row says mined, and got `PROTOCOL-CONSTANTS.md` back. Both are section
209's failure exactly, whose stated fix, that the trigger is the path and not the dig, was written four
sections earlier by this same project and did not fire.

**Two more squares on 29 August 2026, and the second is the same warning a sixth time.** Section 208
is the good one: a third resource file in the same client, the **teaching pictures**, keys its drawings
by architecture and skin, which fills eight of the eleven gaps section 207's platform join left and
agrees with concordance on nine of nine models. Section 209 is the warning, and its subject is the dig
that produced it. The register was checked for the square the dig started in, correctly, and the dig
then followed a resource key into `hid/commands/`, whose own row says it is mined. Everything read
there was already in the lab. **So the trigger is the path and not the dig**, and the fix is finally an
instrument rather than a paragraph: `make lab-check PATH_ARG=<path>` prints every register row bearing
on a path. What the dig did buy is one thing, the clock service, which reads and writes base slot 13's
first seven records over USB by name and disagrees with our measurement of two of the fields.

**Two more squares dug on 28 August 2026.** Section 204 is the first and section 205 the second, which
takes the `ir-learn` tag as far as this client goes: the host measures a capture, merges it and uploads
it, and the only test it applies is that the signal lasts between 10 milliseconds and 1 second.
Everything else, including whether to keep the capture and how to store it, came back from the server.
So what a local learn has to build is narrower than section 42 implied and it is a judgement rather
than a decoder.

Section 204's own square, and the claim held with a stronger argument than its
own: no container cookie appears anywhere in the client's 642 files, so it never parses a
configuration, let alone composes one. **So the `compiler` tag closes as a recovery target**, and
writing our own is the only route, which this document had been assuming with nothing behind it. What
the square still holds is the note's second half, a route it calls editing instead of building, and
the 642 files themselves, which have now been searched but not read.

**Two things to expect and neither is a reason to stop.** Most of it will be worth nothing, and the
value is in being able to say so with a row rather than a shrug. And some of it will answer a
question currently listed as open, which is the outcome the decision was taken for; **that** kind of
answer takes the ordinary route, a hypothesis under decision 7 and then the four places, where a
catalogue row does not.

**One rail is unchanged.** Reading Logitech's code and firmware is what `docs/host-client.md`'s rule
already governs: a fact from it is marked as client sourced, the firmware stays the authority where
it can settle something, and nothing from the site is committed but our own description of it.

