# Excavating the lab: what we are looking for, how it gets logged, and how the digging runs

The plan for step 9 in `docs/roadmap.md`, which is the step, and decision 12, which is the argument.
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
"step 9" is `docs/roadmap.md`'s numbering for the whole excavation, and the only numbering here is the
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
  and is gone, so its remaining rows are unlikely to move it. A count cannot tell those two apart.

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
| `fh-failures` | what their client says when a sync goes wrong, which is what the application has to handle rather than crash on |

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

**Step 0 is per path, not per dig, and that distinction is the whole of section 209.** A dig
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
