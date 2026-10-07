# The two repositories

Moved out of `CLAUDE.md` on 7 October 2026, word for word, so that it is read when it is needed
rather than carried into every session. Where the text says "this file" it means `CLAUDE.md`,
and the rules it argues are stated briefly there.

| | this repository | FreeHarmony |
|---|---|---|
| holds | the API, the evidence, and a bench instrument | the product |
| that is | `packages/usb` and `packages/codec`, plus `docs/`, `src/harmony/`, `tools/`, `tests/` | Electron shell, interface, packaging |
| licence | MIT | GPLv3 |
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

**FreeHarmony has its own plan of record now**, its `docs/plans/002-the-roadmap.md`, written on 14 August 2026 after
its first code existed, and it carries the product as **eight numbered steps written for a reader rather
than for a builder**: no section numbers, no architecture numbers, no code, and every step something a
person can watch appear. That register was asked for on 14 August 2026 after a first version read as a
dependency graph, so **the technical half of the product plan stays here**, as a step to milestone table
in `docs/plans/002-the-roadmap.md`. Its M numbers name the step they feed. The product questions it used to imply
belong there: which version writes, what an interface offers, and which shell, that last one never having
been decided.

**FreeHarmony gets these as published packages, eventually, and as the folder next door until then.**
Decided on 12 August 2026 on one question: somebody who does not have this repository has
to be able to build the application. That makes publishing the endpoint. It does not make it work
today, so until the API stops moving FreeHarmony declares a path dependency on the sibling checkout,
which is what the lab layout already puts there. MIT flows into GPLv3 without trouble; nothing flows
back.

**There is deliberately no git dependency, and that is a correction.** This paragraph said FreeHarmony
"consumes `packages/codec` and `packages/usb` as a git dependency pinned to a commit" for weeks as a<!--superseded-->
statement of fact. It was a plan, and when it was finally tried, by installing this repository into an
empty project, it failed twice. `@harmony/codec` does not resolve: a git install lands the whole tree
under one `node_modules/harmony-explorations` and a workspace package name is not an installable
package. And importing the source by path fails with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`,
because **Node refuses to strip types for any file inside `node_modules`**, whatever the flag. That
second one is structural rather than a slip, so the route is abandoned rather than fixed.

**A link dependency works, and the spelling is per package manager, which took a second measurement to
find out.** This said "a path dependency does work" and gave
`"@harmony/codec": "file:../harmony-explorations/packages/codec"`<!--superseded--> on the strength of one
install with npm. FreeHarmony uses pnpm, like this workspace, and under pnpm that spelling **fails**: the
package is copied into `node_modules/.pnpm`, so its real path is inside `node_modules` and Node refuses
to strip its types. All four combinations, measured on 14 August 2026 while installing the dependency for
real:

| tool | spelling | result |
|---|---|---|
| npm | `file:` | works, a direct symlink to the sibling |
| npm | `link:` | installs nothing at all |
| pnpm | `file:` | fails, per above |
| pnpm | `link:` | works, a direct symlink to the sibling |

So **no single spelling works under both**, the mechanism in the old wording was right, and what was
wrong was generalising one tool's behaviour to the claim "a path dependency works". The export count in
the old wording was 335 and is 361 now, which is the library growing rather than a correction.

**What publishing will need is deliberately not built yet**, because one of its inputs is a
FreeHarmony decision nobody has made: a bundler compiles TypeScript sources itself, in which case
source only packages are right and a `dist` is dead weight, and an unbundled Electron main process
needs the opposite. So `exports`, `dist` and dropping `private` wait for that, and the item to carry
is the boundary itself: whatever it becomes, it should be exercised by a probe that installs and
imports rather than by a paragraph like this one. **That probe exists now**, in FreeHarmony's
`test/boundary.test.ts`, and writing it refuted the paragraph above within a minute of running: it
asserts the resolved real path is outside `node_modules`, which is the mechanism, and that the
dependency's spelling matches the stated package manager, which is what a fresh clone needs.

**A hand maintained copy in FreeHarmony is the one route that is refused**, and not on taste: it is
this repository's oldest rule, that two copies of a derivation are two copies until one of them moves.
It has already happened twice here, once in the opcode tables that the rule is named after and once in
base slot 3's day of week, and both were caught because a test could see both copies. Across a repo
boundary nothing can. If FreeHarmony ever has to vendor the code, it vendors a **generated** copy with
a check that it matches a commit, which is a dependency wearing a hat rather than a second source.

**GPLv3 for the product is deliberate, and it is a reversal.** This file argued for the Affero
variant<!--superseded--> until 12 August 2026 on the strength of one clause: a hosted, modified copy
would have to publish its changes. The reversal rests on two things that outweigh it. That clause
fires when a program is **offered to users over a network**, which a desktop application is not, and a
client making outbound requests never becomes: so it guards a case that does not arise here, and it
would still not arise if FreeHarmony grew a device database fetch or an import from Logitech's
surviving service. And the Affero variant is a **one way door with the neighbours**: concordance and
harmony-decompiler are GPLv3, their code can come here, and nothing of ours could ever go back to
them, because a GPLv3 project cannot absorb Affero code without relicensing. Given how much this
project leans on those two, giving something back has to stay possible. The third reason is smaller
and real: many organisations refuse the Affero variant by policy, including for desktop software, so
it costs contributors and buys nothing here.

**Where the clause does belong is a server, if one is ever built.** A shared device database would be
exactly the case for it, and then it is that server's licence, decided when it exists, rather than a
network clause on a desktop application. See the next paragraph for why that is not a plan.

**The first version of this paragraph gave "the README promises no network access at all" as the
reason, and that was the wrong reason for a right answer.** What Affero's clause turns on is whether
the program is offered to users over a network, not whether the program opens a socket. So the licence
argument does not depend on FreeHarmony staying offline, which matters because that promise is under
discussion on its own merits: a device database has to come from somewhere, Logitech's **current**
service is alive and answering, section 56, so importing an existing configuration is a real feature
with a short shelf life, and neither of those would touch the licence.

**The choice is cheap now and expensive later**, which is why it was settled at the placeholder stage:
there is one author, so a change needs nobody's consent. Once anyone else has contributed it
needs all of theirs. Nothing about this repository moves: `packages/*` stay MIT, and MIT into GPLv3 is
untroubled in the one direction it has to be.

**Logitech's device database is archived by a third party and it is a source now**, decision 15 in
`docs/plans/002-the-roadmap.md`, checked out as `../logitech-harmony-ir-archive`: 276236 devices and **Logitech's own
protocol definitions for 685 families, verbatim**, where this project has measured 37. It was tested
before it was believed, and 33 of 33 comparable families agree with our own measurements off their
compiler; the three that disagree are ours, being the three fitted to the corpus rather than measured.
Three things follow. **Durations and names cross into this repository through our own converter**, never
his JSON and never the 13.3 million rendered waveforms, on decision 1's basis that protocol facts are
not expression. **An entry taken from it is marked stated and unverified**, since our corpus holds 3017
codes and every one belongs to the 37 we already have. And **an archive sourced definition may never be
shared**, because decision 11's rule is that only a definition learned from hardware may be, so without
that the archive contaminates the shareable pool.

**Its device half is read too, section 229, and what it buys is the naming layer.** A configuration
numbers its infrared codes and names none of them, so which of a device's ninety codes is volume up was
known only from Logitech's button map service through two test accounts. The archive names every command
locally: **a device group is identified by the numbers its records decode to**, 36 of 38 groups in this
corpus, 31 of them on every number they send, and 537 of 598 button bindings then get a command name,
every one of them on the two calibration configurations. Two things to carry rather than re-derive. The
name must come from the **identified device's own codeset** and never from the catalogue at large, since a
number alone is held by several manufacturers. And **the identification's margin is part of its answer**,
because Logitech's catalogue holds ranges of near identical codesets, so a device matching 108 of 108
often has a runner up at 105 and the honest answer is a model range. `make catalogue` is the measurement,
`packages/codec/src/catalogue.ts` the reader, and every reader in it is lazy except the code index,
because the catalogue is 2.2 GB.

**A community device database is a direction now, decision 11 in `docs/decisions.md`, and almost all of
it is still undecided**: its shape, its licence, where it lives, how an upload is reviewed. That is
deliberate and it gets worked out when FreeHarmony needs it.

**One part of it cannot wait, and it is one field.** A device definition carries its **provenance**,
and only a definition **learned from hardware** may ever be shared. Anything derived from Logitech's
own data stays on the machine that fetched it, which is the same copyright reasoning that keeps configs
out of this repository. The reason to decide it before the format exists is that provenance is not
enforceable in hindsight: add the field later and there is a database whose origins nobody kept, where
the only safe action is to discard it.

**Logitech's live service is an optional import and never a dependency.** Section 56 measured it
answering and section 58 watched it compile a config for a device chosen that day, so its device data
is reachable now and will not be one day. The user decides, supplies their own credentials, and sees
what is fetched; the application works identically for somebody who never touches it. The cheap route
needs no new protocol work at all, since base slot 5 is fully read: a config Logitech compiled can be
read off the remote and converted with today's code.

**The other route is measured now, not just mapped**, `docs/host-client.md` and section 132: the live
service advertises **308 operations over 50 services**, the device database opens for **a plain Logitech
login with no account record and no registered remote**, and the chain is `SearchGlobalDevices` then
`GetGlobalLanguageCommands`. **What it serves is symbolic, not pulses**: a protocol name and a frame
value, `Raw` null on all 419 commands fetched, and on all 5219 the wider census of 24 August 2026
fetched too. That was read as "an importer needs an **infrared encoder per protocol family**"<!--superseded-->
and as "**a work item nobody had priced**"<!--superseded-->, and section 152 refutes both: a record
states its own timings, so a frame is rebuilt from five durations read off any code of the same
appliance a config already holds, exactly, on 3502 of 3502 records. 52 of 58 device groups carry one set
of timings for every code, which is what makes those five numbers transferable. The cheap route, reading
base slot 5 out of a compiled config, still needs none of it.

**Their notation is read as a grammar now and their analyser is not a general decoder**, section 159, and
both matter to an importer. A code states its frames in **two** slots, either of which may hold a word
naming a standard behaviour rather than a value, and reading one slot refused every Toshiba code in the
catalogue and sent half a command on the families that fill both. **The notation reads whole**, 2921 of
2921 distinct codes and 33 of 33 families, since the one family that was refused turned out to state its
digits in **base 4**, the same width check that refused all 69 of its codes accepting all 69 once the base
is right. That was written up as `Quad` in a family name being the base of its digits<!--superseded--> and
section 231 refutes it: it is the base on that one family and is nothing at all on `Quad 5 Bit`, which
states two symbols and five bits. **The base comes from Logitech's definition**, as the number of cells
its frame segment holds, and the name is a fallback only where no definition is in hand.
**Thirty five of the table's 37 families have a rhythm measured off Logitech's own compiler**, sections
160 to 171, of which **nine** are measured off **both** that route and the corpus and two off the corpus
alone. This said "eighteen ... sections 160 to 163"<!--superseded--> until 29 August 2026, which was the
count when that paragraph was written and roughly half of what sections 165 to 171 left it at; the
"three of them agree" below is the same figure and is nine now, three of them added by section 227
without a single new measurement, by naming a rhythm out of Logitech's catalogue instead of out of their
analyser.

**A family is named by their catalogue and never by their analyser**, section 227, which is the rule to
carry rather than the counts above. The analyser was retired as evidence for a **rhythm** by section 160
and stayed the only source of a **name** for a corpus measured entry, and all three entries so named were
wrong: two held another family's durations under a name whose real carrier is 38.2 kHz, and one held
Toshiba's under Memorex's. The catalogue **states** each family's rhythm, 684 definitions of them in the
archive, so the rhythm is looked up rather than named. What makes that believable is the calibration:
**34 of our 35 measured rhythms are reproduced from their own definitions field for field and none
disagrees**, by two routes with nothing in common. The generator refuses to write the table without the
archive, since a regeneration elsewhere would silently restore the analyser's names.

**And the table answers for 600 families now rather than 37**, the same section's second pass plus
section 231: 563 of Logitech's own definitions are entries marked `source: 'stated'`, for families no
configuration here holds a record of. **The distinction is load bearing and is one field.** A stated row
has `codes: 0`, `exact: 0` and `spread: 0`, which are the honest numbers, and no `tailExact`, since that
counts the records that rebuilt from it and there are none. **22 of the 563 carry a whole block and 541
do not**, section 228, so a code of those 541 can be **built and not written** and `blockOfStatedCode`
refuses it.
**139 of the rows are a sixth shape, a cell table**, section 231: 142 of their families spell a bit as a
whole cell rather than as one of two lengths, a value being read a digit at a time with each digit
picking one cell out of four or out of sixteen. Base four and base sixteen are **one** shape and reading
them was one job rather than two. **Which base a family uses comes from its definition and never from
its name**, the cell count, and a field width is then in digits and has to be multiplied out, **per
segment** rather than per family.
**A family can send several rhythms inside one press**, section 232, and 44 of theirs do: `Classe 16 Bit
Toggle` sends four mode bits at a 442 microsecond half cell, one bit at 880 and sixteen data bits back at
442, which is RC6's shape. A block's copy names which rhythm it goes out in and a copy naming one the
shape does not hold **throws** rather than falling back on the first, which would send a segment in
another's rhythm and look well formed. Refusing those families had cost 84694 catalogue commands. Two
rules of Logitech's own came out of it and both are easy to get wrong: their **field order is `sequence`
then `token`**, token alone being ambiguous on 103 definitions, and a **segment states its own width
inside `Payload`**, which is the only place a secondary segment's width is stated.
This said a stated row carries no block at all<!--superseded--> for one day: Logitech's own `KeyCode`
field states a block's shape whole, and reading it reproduces all 29 blocks measured off their compiler
to the microsecond. What their definitions do not state, on 645 of 684, is **how many times a repetition
is sent**, and that is the whole reason 541 stay unwritable. It is stated for 39 families, right on all
five of ours that have it, and **not defaulted**, because three would fit 22 of our 24 unstated families
and fitting the corpus is what put three wrong names in this table to begin with. Any count of what
reproduces a corpus record filters on `source`, and the calibration deliberately excludes stated rows,
since a row generated out of the catalogue agrees with the catalogue by construction. Two rules of ours
turn out to be common rather than odd, which is worth more than the rows: 84 further families send a set
bit as the **shorter** carried half, where four cases out of 37 had made that look like an exception, and
52 further ones have no constant half at all. The route is open: `DeviceManager/UpdateMultiple` takes an operation bag and puts a catalogue appliance on an
account, so their service will compile a configuration containing any family we ask for and the
durations in it are the ones their generator emits. Fifteen appliances, 1143 records, and every family
reproduces its own durations on every one of its records. Three of them agree to the microsecond with
what the corpus already gave, by a route with nothing in common, and `Toshiba 32 Bit` turns out to be the
NEC entry exactly, which is over a third of their catalogue. The thirteenth is the lesson in miniature:
Sharp was written up as two problems, a rhythm that would not split and numbers that joined under no
transform, and it was one. Its opening mark is 270 where every later one is 260, which a strict reader
refuses, and its numbers needed no transform at all: the second half was a pair of numbers compared
without establishing they were the same command, and a set against a set maps 162 of 162 under the
identity. The fourteenth needed the attribution fixed rather than another appliance, section 161: the
join decided which appliance a group of codes belongs to by a vote of overlapping numbers, and the config
**states** it, so four groups of fifteen had been dropped whole. One of them, the PS3's, then joined once
it was allowed to state the **complement** of what our decoder reads, because that family sends a set bit
as the shorter space where every other one here uses the longer.

**Their analyser is retired as evidence for a rhythm**, section 160, and that is the load bearing
correction: it accepted two rhythms their compiler does not emit, `JVC 16 Bit` under NEC's durations and
a Sharp seed whose every duration was out by a fifth to a quarter, and it named both correctly. So a
family judged only by their analyser is a command that will be recognised by their decoder and by no
appliance. **And it is wrong about families too**, section 162: three records on a Denon receiver come
back `Makita 10 Bit` with a ten bit number, where the record is a fifteen bit Sharp code whose durations
their own compiler emits, and their ten bits are ours with the first dropped and the last four cut. `source` on a table entry says which route it came from and the documented category is
deliberately empty.

Two things on that list matter beyond the import.
`downloadManager.RemoteConfigurationInJson` **was called and it is less than its name promised**: the
URL is not advertised, it comes back from a compile, and it returns a ZIP holding a bare `GSPM` container
plus a manifest. The manifest corroborates section 41's trailer checksum, seed and algorithm, from its
author. And `infraredAnalysisManager.AnalyzeInfrared` is the learning service the user manuals describe,
which is the piece M5 has to replace locally.

**The compile is the surprise worth carrying**: it runs server side with the remote unplugged, so
Logitech will compile a config **to our own specification** and hand it over as a file. Two of those
exist, one per bench architecture, and they are the corpus's first **known answer** samples. Three
devices and two activities chosen in advance come back named correctly on both, through routes with no
shared code, section 125 on arch 12 and section 121 on arch 14. `packages/codec/test/calibration.test.ts`
is the test; the containers are lab fixtures and deliberately outside `CONTAINERS`, since that population
is what every corpus wide total is computed from.
