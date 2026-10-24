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
numbers its infrared codes and names none of them, and the copy names every command locally, which
before it was known only from Logitech's button map service through two test accounts. How a device is
identified from the numbers its codes decode to, and why a name is taken from the identified codeset
and never from the catalogue at large, is Logitech's catalogue's own shape and lives with it:
[the device catalogue](../reference/logitech/device-catalogue.md#how-it-names-a-devices-commands) and
[naming the commands a configuration sends](../reference/infrared/families.md#naming-the-commands-a-configuration-sends).
`make catalogue` is the measurement, `packages/codec/src/catalogue.ts` the reader, and every reader in it
is lazy except the code index, because the copy is 2.2 GB.

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

**What the live service offers an importer is [the service page](../reference/logitech/service.md)**:
the device catalogue opens to a plain login, and it serves a family name and a value per command rather
than pulses, [the device catalogue is its own call](../reference/logitech/service.md#the-device-catalogue-is-its-own-call).
That was read as "an importer needs an **infrared encoder per protocol family**"<!--superseded-->
and as "**a work item nobody had priced**"<!--superseded-->, and section 152 refutes both: a record
states its own timings, so a frame is rebuilt from five durations read off any code of the same
appliance a configuration already holds. The cheap route, reading base slot 5 out of a compiled
configuration, needs none of it.

**What the copy contributes to the infrared side is Logitech's own statements, and those live in the
reference**: how their catalogue writes a code, [how the catalogue writes a code](../reference/infrared/families.md#how-the-catalogue-writes-a-code);
the rhythm table and its stated rows, [the rhythm table](../reference/infrared/families.md#the-rhythm-table);
the cell tables and the families that send several rhythms in one press,
[several rhythms in one press](../reference/infrared/families.md#several-rhythms-in-one-press); and why a
family is named by their catalogue and never by their analyser,
[a family is named by Logitech's catalogue](../reference/infrared/families.md#a-family-is-named-by-logitechs-catalogue).
This document used to carry all of it, with counts that went stale here while the reference moved on;
plan 009 moved it out in steps 4.3 and 4.5.

**What stays here is the provenance rule those statements obey.** A row the generator writes out of the
copy is marked `source: 'stated'` and carries the honest zeroes, no code reproduced and none exact, and
every count of what reproduces a recorded code filters on `source`, because a row generated out of the
catalogue agrees with the catalogue by construction. The generator refuses to write the table without the
copy, since a regeneration elsewhere would silently restore the analyser's names, and a definition sourced
from the copy is never shared, decision 11. **Where a stated count was not given, it is not defaulted**:
three repetitions would fit most measured families that state none, and fitting the corpus is what once
put three wrong names in the table.

**Two of the service's calls matter beyond the import**, [the service page](../reference/logitech/service.md):
a compile's download is a ZIP holding a bare container and a manifest, which corroborates section 41's
trailer checksum, seed and algorithm from its author; and the analysis service is the learning service
the user manuals describe, which is the piece M5 has to replace locally.

**The compile is the surprise worth carrying**: it runs server side with the remote unplugged, so
Logitech will compile a config **to our own specification** and hand it over as a file. Two of those
exist, one per bench architecture, and they are the corpus's first **known answer** samples. Three
devices and two activities chosen in advance come back named correctly on both, through routes with no
shared code, section 125 on arch 12 and section 121 on arch 14. `packages/codec/test/calibration.test.ts`
is the test; the containers are lab fixtures and deliberately outside `CONTAINERS`, since that population
is what every corpus wide total is computed from.
