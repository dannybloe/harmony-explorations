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
| `software/classic/` | the 7.x generation, decompiled | 4809 | `read` in four notes and the HID layer, `unseen` otherwise | `compiler` `ir-learn` `service-api` `fh-data-model` `fh-screens` | see the four notes below; the rest is unopened |
| `software/classic/PROTOCOL-CONSTANTS.md` | our extraction of the command constants | 1 | `mined` 9 August 2026 | `service-api` | `docs/host-client.md` is built on it, and **this is the row to read before opening anything in the client's HID layer**: the seven per architecture constant classes are extracted here whole. Section 206 is a session that dug them up again from the same source and got the same numbers |
| `software/classic/LEARN-IR.md` | our note on the learn session | 1 | `catalogued` | `ir-learn` | crossed into sections 91 and 98 and the ledger. **The `ir-learn` tag is dug as far as this client goes**, section 205: the host measures a capture and judges nothing, its only acceptance test being a duration window, and the storage class was the server's call |
| `software/classic/SERVER-DEPENDENCY.md` | our note, 278 lines, 7 August 2026 | 1 | `mined` 28 August 2026 | `compiler` `fh-data-model` `fh-screens` `restore` | **crossed as section 204**, which is the excavation's first return. Its central claim held and gained a stronger argument on the way: no container cookie appears anywhere in the client, so it never parses a configuration, let alone builds one. The `compiler` tag closes as a **recovery** target. What is still only in the note is its second half, the route it calls "editing instead of building", and its "recorded design decision" heading, which is the state decision 12 forbids |
| `software/classic/README.md` | our note on the square itself | 1 | `read` | | |
| `software/classic/src/` | decompiled Java source | 642 | `surveyed`, one claim checked against it | `compiler` `fh-data-model` `fh-settings` `fh-wizard` `restore` | the class and line references the four notes cite all point in here. Section 204 checked one of those notes against it, by class inventory and by searching every file for every container cookie, which is what closed the `compiler` tag. The 642 files still have not been **read**, only searched. **`software/classic/src/hidcommands/com/logitech/harmony/hid/commands/` is the exception and is fully mined**, into `PROTOCOL-CONSTANTS.md` and `docs/host-client.md`: check that row first, because sections 206 and 209 did not and each lost an afternoon to it. **`software/classic/src/hidcommands/com/logitech/harmony/hid/services/` is not**, and saying "the HID layer" for a day was what made section 209's re-derivation look like new ground: the clock service and the identity block came out of it, section 209, and nothing else there has been opened |
| `software/classic/tools/` | the vendor's own jars and tooling | 616 | `unseen` | `compiler` `packages` | 365 MB, the largest single thing on the site |
| `software/classic/dist/` and `software/classic/orig/` | the shipped application and the untouched original | 289 | `unseen` | `packages` | 299 MB between them |
| `software/classic/reports/` | our own output from decompiling, rebuilding and **running** the classic client, 7 August 2026 | 30 | `mined` 29 August 2026 | `service-api` | **mined as section 210**, and the row above was misleading rather than wrong: these are ours, not Logitech's. Nine decompiler logs, thirteen empty ones, a compiler log, and a repack receipt saying **827 of the client's 829 classes rebuilt from recovered source**, which is an instrument nothing here had recorded. Then three files from running it: a control run with no remote attached, a request log of its four startup calls to a local stand-in, and `run.log`, **69344 packets of Logitech's own client reading a Harmony One**. That last one is the only capture here of a remote driven by an implementation that is not ours, and it is a fixture now, `classic_read_capture`. **The `fh-failures` tag is dropped rather than closed**: the only failures in these logs are our own missing server and a toolkit that will not start, and no user's account of a remote misbehaving is in here |
| `software/classic/res/` | resources: strings, images, layouts | 287 | `surveyed`, three files mined | `fh-screens` `fh-limits` `models` | where the interface's own vocabulary and limits would be, if anywhere. two files are **mined** as section 207. `software/classic/res/client/device.properties` maps each platform codename to its skins, and following it into the unit factories gave the three transports and narrowed `isHarmony`; `software/classic/res/client/skins/logitech/intl/remote/remote.properties` names the model per skin and is where the 46 entry skin table in this directory's `models.md` came from, which nothing had recorded. Joined they give a platform per skin, which neither has. The third is `software/classic/res/client/skins/logitech/intl/images/images.properties`, whose teaching picture keys are an architecture per skin for the old models and fill the gap that join left, section 208. What is still unopened is 96 string bundles in sixteen languages and 66 HTML layouts, and the bundles are **small**, a few kilobytes a language and mostly connection and update messages, so the `fh-limits` tag is unlikely to be answered here: this client is an executor and its interface never named a device |
| `software/classic/build/`, `software/classic/bin/`, `software/classic/debug/`, `software/classic/exclude/`, `software/classic/ui/` | build products of the decompilation | 1112 | `surveyed` | | derived from the original, so nothing here is a source |
| `software/desktop-webapp/` | Harmony Desktop's web application, mirrored 9 August 2026 | 370 | `catalogued` | `service-api` `fh-screens` | sections 132, 197, 198 and 200. **The per skin protocol templates and the packet encoder are here**, and the encoder is what section 200 needed. **Not the reference client**, on Danny's instruction of 28 August 2026: read MyHarmony for how a remote is driven, and this only for the templates, the encoder and the `susKey` |
| `software/MyHarmony/` | the Silverlight client | 317 | `read` | `service-api` `fh-screens` `fh-wizard` | section 132 concluded it holds no protocol; that predates knowing the recovery tool is reached from it, section 196. **This client and its assemblies are the reference for how a remote is driven**, per Danny on 28 August 2026 |
| `software/Harmony Desktop.app` | the native half of the desktop client | 35 | `read` | `service-api` | section 197: a generic packet pipe that knows no protocol |
| `software/LogitechHarmonyRemoteSoftware.app` | the macOS classic application | 208 | `unseen` | `packages` `fh-screens` | 202 MB. probably the same code as `software/classic/orig/`, and that guess is unchecked |
| `software/harmony-remote-software-8.0/` | the 8.0 generation | 1018 | `read` in one note | `service-api` `restore` | `LEADS.md` is ours, with sections headed discharged, open and high value, and not to be pursued |

## Our own work against Logitech's services

4557 files, 283 MB. Mostly ours rather than theirs, which is why most of it is already crossed.

| path | what it is | files | status | tags | holds |
|---|---|---|---|---|---|
| `work/myharmony/src/` | **MyHarmony decompiled to C#**, seven assemblies, 1999 source files | 2643 | `read` in one flow | `service-api` `fh-data-model` `fh-screens` `fh-wizard` | **the reference client as source, and the first place to look for what MyHarmony does.** Section 202 read its sync flow out of `Web.Library.Models` and `Web.MartiniWeb.Tasks.Remote.RemoteSync`. This row said "our client for their live services"<!--superseded--> until 28 August 2026, which is `work/myharmony/probe.py` one directory up, and the misdescription is why a session searched the compiled assemblies instead and published a wrong reading |
| `work/myharmony/probe.py` and its scripts | **our** client for their live services | 12 | `catalogued` | `service-api` `provenance` | **`credentials.env` sits beside it**, so nothing in this directory is quotable and no output from it is either. the `myharmony-service` skill is its documentation |
| `work/myharmony/responses*/` | captured replies, five accounts and states | 431 | `catalogued` | `service-api` `models` `fh-data-model` `provenance` | **replies from five accounts, so they carry account ids and remote serials**. sections 56, 58, 125, 131 to 136, 145. **The household JSON is the vendor's own entity model** and is the calibration for every device and activity reader |
| `work/myharmony/compiled*/` | nine configurations their service compiled for us | 19 | `catalogued` | `intermediate` `ir-db` | the corpus's only known answer samples, sections 121 and 125 |
| `work/myharmony/analyzed/` | their analyser's verdicts on our codes | 15 | `catalogued` | `ir-db` | sections 159 to 163 |
| `work/myharmony/xap/` | the Silverlight packages | 314 | `surveyed` | `fh-screens` `fh-wizard` `service-api` | 170 MB, and the client whose recovery screen section 196 came from. **The reference client's own code**, so this is the first place to look for which service call MyHarmony makes and with what: the generated proxy is `*/Web.Data.HarmonyPlatform.dll` and the sync flow is `*/Web.MartiniWeb.Tasks.Remote.RemoteSync.dll`. Both were read on 28 August 2026 by searching the assemblies for names, with no decompiler installed |
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
| `firmware/packages/` | vendor packages: three `.hfw`, eleven from the update service, and the arch 8 contributions | 27 | `catalogued` | `packages` `restore` `provenance` | **the three `.hfw` carry a `Data.xml` with a stranger's Logitech account id, account GUIDs, a server id and a session cookie**, which is why this repository publishes checksums and never files. sections 113, 116 and 196, with the digests in this directory's neighbour |
| `firmware/packages/sus/META.md` | ours, on the update service haul | 1 | `catalogued` | `packages` | section 196 |
| `firmware/derived/` | images decoded out of those packages | 16 | `catalogued` | `packages` `restore` `write-path` | every firmware claim in `docs/findings.md` rests on these |

## Contributed and read configurations

| path | what it is | files | status | tags | holds |
|---|---|---|---|---|---|
| `dumps/danny/` | our own remotes, eight described sets | 35 | `catalogued` | `provenance` | the corpus's arch 12 and arch 14 half. **Three sets carry `concordance -i` output**, whose serial GUIDs are personal data even though they are ours. The contributed dumps were checked on 29 August 2026 and hold none: configs only, no info output and no `Data.xml` |
| `dumps/kkong42/` | four contributed remotes, arch 8 and arch 10 | 47 | `catalogued` | `models` | sections 113 to 117, 177 to 185 |
| `dumps/guyman70718/`, `dumps/dmrzzz/`, `dumps/trelowney/` | three contributors | 12 | `catalogued` | | sections 14, 15, 76 |
| `reads/` | our own read sessions, with notes | 60 | `read` | `ir-db` `write-path` `provenance` | **one read is a Harmony Touch's radio identity**, section 201, so this square is not quotable either. includes the sequence hazard note and the interkey delay predictions, **neither of which is a finding**, by decision, and the Harmony Touch radio file read of 28 August 2026, whose claim **is** one, section 201, with only the identifying values kept here |
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

**One artefact was `read` and not crossed, it was on the highest value tag, and it is crossed now.**
`software/classic/SERVER-DEPENDENCY.md`, 278 lines, written 7 August 2026: the client is an executor
and not a builder, and the configuration compiler was server side and is gone. If that holds it closes
the `compiler` tag as a **recovery** target and makes writing our own the only route, which is what
`docs/roadmap.md` already assumes on no evidence. It takes the ordinary route from here, since it is a
claim. **Done on 28 August 2026, section 204**, and the claim held: the register paid for itself
here, because the column said uncrossed and nobody had to remember.

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
