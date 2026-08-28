# The lab register: every artefact on the site, what it is, and how deep anybody has been

The deliverable of step 9 in `docs/roadmap.md`, and `docs/lab-excavation.md` is the method. **This is a
catalogue, not a set of claims**, so it carries no tests and a marked guess is a legitimate row. What it
is for is turning "did we already know this" from a memory exercise into a search.

The lab is private and this file is public. It records **paths, sizes and descriptions**, which are ours,
and never contents: no firmware bytes, no configuration bytes, no account identifiers, no serial numbers
and none of Logitech's own text.

Surveyed on 28 August 2026. **11 squares, 12506 files, 2.3 GB.**

## How to read a row

**Status** is how deep anybody has been, not how valuable it is.

| status | meaning |
|---|---|
| `unseen` | it is here and nobody has opened it |
| `surveyed` | its shape is known: what kind of thing, how much of it |
| `read` | somebody has read enough to say what is inside |
| `catalogued` | its contents are written up in this repository |
| `mined` | everything the want list asks of it has been extracted, as at the date given |

**Tags** are the want list in `docs/lab-excavation.md`. An empty tag column means an artefact somebody
looked at and found nothing in, which is a result. The `fh-` tags are FreeHarmony's.

## Logitech's own software

The largest square and the least read. 6758 files, 1.1 GB.

| path | what it is | files | status | tags | holds |
|---|---|---|---|---|---|
| `software/classic/` | the 7.x generation, decompiled | 4809 | `read` in four notes, `unseen` otherwise | `compiler` `ir-learn` `service-api` `fh-data-model` `fh-screens` | see the four notes below; the rest is unopened |
| `software/classic/PROTOCOL-CONSTANTS.md` | our extraction of the command constants | 1 | `catalogued` | `service-api` | `docs/host-client.md` is built on it |
| `software/classic/LEARN-IR.md` | our note on the learn session | 1 | `catalogued` | `ir-learn` | crossed into sections 91 and 98 and the ledger |
| `software/classic/SERVER-DEPENDENCY.md` | our note, 278 lines, 7 August 2026 | 1 | `read`, **not crossed** | `compiler` `fh-data-model` `fh-screens` `restore` | **the client is an executor and not a builder**: read, write, learn and firmware update are all local and work today; the device database, the interface and the configuration compiler were server side and are gone. Also a route it calls "editing instead of building", and a heading reading "recorded design decision", which is the state decision 12 forbids |
| `software/classic/README.md` | our note on the square itself | 1 | `read` | | |
| `software/classic/src/` | decompiled Java source | 642 | `unseen` | `compiler` `fh-data-model` `fh-settings` `fh-wizard` `restore` | the class and line references the four notes cite all point in here, so it is the evidence behind them and has never been read directly |
| `software/classic/tools/` | the vendor's own jars and tooling | 616 | `unseen` | `compiler` `packages` | 365 MB, the largest single thing on the site |
| `software/classic/dist/` and `software/classic/orig/` | the shipped application and the untouched original | 289 | `unseen` | `packages` | 299 MB between them |
| `software/classic/reports/` | run logs from the application | 30 | `unseen` | `fh-failures` `service-api` | one is cited in `SERVER-DEPENDENCY.md` as showing the native layer load |
| `software/classic/res/` | resources: strings, images, layouts | 287 | `unseen` | `fh-screens` `fh-limits` `models` | where the interface's own vocabulary and limits would be, if anywhere |
| `software/classic/build/`, `software/classic/bin/`, `software/classic/debug/`, `software/classic/exclude/`, `software/classic/ui/` | build products of the decompilation | 1112 | `surveyed` | | derived from the original, so nothing here is a source |
| `software/desktop-webapp/` | Harmony Desktop's web application, mirrored 9 August 2026 | 370 | `catalogued` | `service-api` `fh-screens` | sections 132, 197, 198 and 200. **The per skin protocol templates and the packet encoder are here**, and the encoder is what section 200 needed |
| `software/MyHarmony/` | the Silverlight client | 317 | `read` | `service-api` `fh-screens` `fh-wizard` | section 132 concluded it holds no protocol; that predates knowing the recovery tool is reached from it, section 196 |
| `software/Harmony Desktop.app` | the native half of the desktop client | 35 | `read` | `service-api` | section 197: a generic packet pipe that knows no protocol |
| `software/LogitechHarmonyRemoteSoftware.app` | the macOS classic application | 208 | `unseen` | `packages` `fh-screens` | 202 MB. probably the same code as `software/classic/orig/`, and that guess is unchecked |
| `software/harmony-remote-software-8.0/` | the 8.0 generation | 1018 | `read` in one note | `service-api` `restore` | `LEADS.md` is ours, with sections headed discharged, open and high value, and not to be pursued |

## Our own work against Logitech's services

4557 files, 283 MB. Mostly ours rather than theirs, which is why most of it is already crossed.

| path | what it is | files | status | tags | holds |
|---|---|---|---|---|---|
| `work/myharmony/src/` | our client for their live services | 2643 | `catalogued` | `service-api` | the `myharmony-service` skill is its documentation |
| `work/myharmony/responses*/` | captured replies, five accounts and states | 431 | `catalogued` | `service-api` `models` `fh-data-model` | sections 56, 58, 125, 131 to 136, 145. **The household JSON is the vendor's own entity model** and is the calibration for every device and activity reader |
| `work/myharmony/compiled*/` | nine configurations their service compiled for us | 19 | `catalogued` | `intermediate` `ir-db` | the corpus's only known answer samples, sections 121 and 125 |
| `work/myharmony/analyzed/` | their analyser's verdicts on our codes | 15 | `catalogued` | `ir-db` | sections 159 to 163 |
| `work/myharmony/xap/` | the Silverlight packages | 314 | `unseen` | `fh-screens` `fh-wizard` `service-api` | 170 MB, and the client whose recovery screen section 196 came from |
| `work/myharmony/PREDICTIONS.md` | ours, written before measuring | 1 | `read` | | the honest habit, kept |
| `work/silhouettes/` | the traced remote geometry | 130 | `catalogued` | `models` | the generated SVGs in this repository come from it |
| `work/render/` | rendered config screens | 25 | `catalogued` | | output of `make render`, which never enters this repository |
| `work/compose-screens/`, `work/desings-sketches/`, `work/drafts/`, `work/github/` | working material and draft text | 13 | `surveyed` | `fh-screens` | the drafts include a FreeHarmony README and two upstream discussion posts |
| `work/*.bin` | internal flash reads of both bench architectures | 10 | `catalogued` | `restore` `write-path` | sections 87, 118, 189 to 192 |
| `work/venv/` | a Python environment | 908 | `surveyed` | | not an artefact |
| `work/src-review-2026-08-13.md`, `work/test-sweep-2026-08-13.md` | our review notes | 2 | `read` | | sections 139 to 143 |

## Firmware

| path | what it is | files | status | tags | holds |
|---|---|---|---|---|---|
| `firmware/packages/` | vendor packages: three `.hfw`, eleven from the update service, and the arch 8 contributions | 27 | `catalogued` | `packages` `restore` | sections 113, 116 and 196, with the digests in this directory's neighbour |
| `firmware/packages/sus/META.md` | ours, on the update service haul | 1 | `catalogued` | `packages` | section 196 |
| `firmware/derived/` | images decoded out of those packages | 16 | `catalogued` | `packages` `restore` `write-path` | every firmware claim in `docs/findings.md` rests on these |

## Contributed and read configurations

| path | what it is | files | status | tags | holds |
|---|---|---|---|---|---|
| `dumps/danny/` | our own remotes, eight described sets | 35 | `catalogued` | | the corpus's arch 12 and arch 14 half |
| `dumps/kkong42/` | four contributed remotes, arch 8 and arch 10 | 47 | `catalogued` | `models` | sections 113 to 117, 177 to 185 |
| `dumps/guyman70718/`, `dumps/dmrzzz/`, `dumps/trelowney/` | three contributors | 12 | `catalogued` | | sections 14, 15, 76 |
| `reads/` | our own read sessions, with notes | 60 | `read` | `ir-db` `write-path` | includes the sequence hazard note and the interkey delay predictions, **neither of which is a finding**, by decision, and the Harmony Touch radio file read of 28 August 2026, whose claim **is** one, section 201, with only the identifying values kept here |
| `golden/` | the cross language golden vectors | 43 | `catalogued` | | `make golden` |

## Reference material

| path | what it is | files | status | tags | holds |
|---|---|---|---|---|---|
| `Docs/` | the vendor's user manuals | 7 | `catalogued` | `fh-screens` `fh-wizard` | `docs/how-a-harmony-works.md` rests on these |
| `reference/logitech-icons/` | the vendor's device icon set | 877 | `unseen` | `fh-screens` | 17 MB. Their own iconography, which is their expression and cannot be shipped |
| `reference/forum-images/` | photographs from forums | 37 | `read` | `models` `scan-codes` | section 144's circuit board survey is here |
| `reference/*.svg` | hand traced remote faces | 3 | `catalogued` | `models` | the traced source the generated SVGs in this repository come from |
| `ghidra/` | Ghidra projects | 10 | `surveyed` | | embed firmware, so never publishable |
| `reviews/20260827-write-transfer/` | the blind write review, both answers | 5 | `catalogued` | `write-path` | `docs/review-before-first-write.md` |
| `bin/` | two private scripts | 2 | `surveyed` | `restore` | one performed the Harmony 525 recovery, section 118 |

## What the survey found on its first pass

Recorded here rather than in a finding, because it is about the site and not about a remote.

**One artefact is `read` and not crossed, and it is on the highest value tag.**
`software/classic/SERVER-DEPENDENCY.md`, 278 lines, written 7 August 2026: the client is an executor
and not a builder, and the configuration compiler was server side and is gone. If that holds it closes
the `compiler` tag as a **recovery** target and makes writing our own the only route, which is what
`docs/roadmap.md` already assumes on no evidence. It takes the ordinary route from here, since it is a
claim.

**The unopened squares cluster on FreeHarmony's tags rather than on the format's.**
`software/classic/src` at 642 files, `software/classic/res` at 287, `work/myharmony/xap` at 314 and
`reference/logitech-icons` at 877 are all `fh-screens`, `fh-settings`, `fh-wizard` or `fh-limits`. That
is not a coincidence: this project has always dug where the bytes were, and the interface questions are
the ones nobody had a reason to ask until there was an application.

**The four notes in `software/classic/` are the pattern in miniature.** Two crossed, one crossed
partially, and one did not, and nothing distinguished them except which session happened to need them.

**The 642 files behind the notes have never been read directly.** Every class and line reference in
those notes points into `software/classic/src`, so the notes are summaries of a body of evidence that
no session has opened. A summary with no test is exactly what step 4 of the four places rule exists to
catch, and here both halves sit outside this repository.
