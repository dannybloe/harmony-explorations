# Working brief

Reverse engineering the Logitech Harmony config format so configs can be generated again.
Read `README.md` first for orientation, then `docs/status.md` for where the work stands,
`docs/roadmap.md` for the sequence and `docs/findings.md` for the technical detail. `docs/glossary.md` defines the vocabulary all three
use, and says per term whether it is Logitech's word, this project's invention or a standard one,
which is a distinction the other documents assume rather than state.

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
   it works on arch 12 and arch 14 and the 525 answers zero for every address, section 90, whose
   reason is read now: only selector 1 has a body in arch 9's `READ_MISC` executor, and every other
   selector emits two bytes the firmware has just cleared. Selector 1 **does** answer, and this
   project read it as zero for a year because the reply carries its value in the byte after the one
   the decoder took.
   **Whether it can watch a config being interpreted is also per architecture, and the answer is not
   the one this file carried for a day.** On arch 14 it cannot, section 110: the journal's five
   variables are zero on a connected 600, so nothing loaded the config. On **arch 12 it can**, section
   111: a connected Harmony One's display light band, saved state and cached level agree with each
   other through its own base slot 15, its clock is ticking and `TMR1` is running. The mechanism is in
   the key facts table below, since arch 12 executes its config in place and has no load step to skip.
   So poll RAM on the One, not on the 600, which is the reverse of the architecture this project
   prefers for reading code. What RAM polling is good for on both is hardware state the firmware sets
   up anyway, the battery scale and the flash id, and the SFRs answer on arch 12 as well.
6. **Safety rails are absolute.** See "Never write to a remote" below.
7. **Own derivation first.** Upstream findings are hypotheses to test. The format's original
   designer is active in harmony-decompiler discussion #1 and is a privileged source, held in
   reserve for when we are genuinely stuck.
8. **Version 1 of the application is read only.** Write code exists behind a flag that is off.
9. **`docs/findings.md` stays one file.** Splitting it is the obvious idea at 14957 lines and it was
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
the 700 2.8 image as the arch 14 reference. **Arch 9 is a target**: the Harmony 525 arrived on 8
August 2026, its config and its firmware are in the lab, and `docs/memory-map-525.md` records what
was predicted before it was connected against what it measured. Other models are iterated on later.

**Arch 8 has firmware now and is still not a target**, sections 113, 114 and 116: two application
images of one build, an 880 and an 885, contributed on 10 August 2026, plus **two bootloaders**, plus
eleven configs and an arch 8 safe mode container found inside the application firmware itself. The
bootloaders carry the reset vector and hand both interrupt vectors to the application, so arch 8 is
the only architecture here whose whole program flash is accounted for. It stays a control for container claims, and what the
images bought is a **counterexample supply**: they broke the skin rule, they gave `GET_VERSION` field 6
its fourth value, and they showed that "whatever in the lab table parses as a container" is not a
corpus. Reach for them when a claim holds on every architecture here, because a claim that nothing can
contradict is the failure mode this file warns about throughout.

**Arch 10 exists in the corpus and nothing reads it**, sections 115 and 117: two Harmony 890
configs, format 1.7, 23 pointer slots, both based at flash `0x030000`. The container framing
verifies and **the slot mapping is not a relabelling of the twenty**, which is stronger than the
"unknown" this said for a day: all 1330 placements of three insertions were scored against
seventeen readers and the best reaches 34 of 47 where arch 8, 9 and 14 each score 47 uniquely, with
five readers satisfied by no mapping at all. So every reader stays gated, and **adding an entry to
`INSERTED_SLOTS` to ungate them is the one thing not to do**: a guessed mapping turns twenty
refusals into twenty plausible wrong answers. Two things the samples do say: the clock record is raw
slot 4's target, so arch 10 inserts a slot below base slot 3, and no `0xFEED` frame validates
anywhere in either payload, so an 890 is not known to name its devices and activities at all.

**The container's base address is anchored on the clock record, not on the end marker**, section
117, and that correction is the instructive one in this file. The old
`base = end_addr - offset_of_end_marker` was right on 23 of 24 containers and 864 bytes wrong on the
second 890, and it was **circular**: `end_addr_points_at_end_marker` tested the assumption the base
had just been computed from, so no input could fail it. A wrong base does not error, it reads the
neighbouring bytes. The anchor is one candidate per pointer, filtered by `0x1000` alignment, and
exactly one survives on 26 of the 27 containers here. `packages/probe` had a second copy of the old
reading, which is the two-diverging-derivations state this file warns about below, and it now calls
the codec's.

**The 27th is where the anchor refuses, and that is the behaviour to keep**, section 122: a second
read of the same 890 has its clock record 54 bytes off its pointer, so no candidate is aligned and
none survives. The fallback then returns an unaligned base and the circular check pronounces the file
consistent. So the refusal is the finding and the fallback is the warning, and **why that file is
damaged is now read**: an arch 10 read duplicates whole 54 byte chunks, 16 in the first read of that
remote and 2 in the second, which is what section 117 measured as a generator error.

## The two repositories

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

**FreeHarmony gets these as published packages, eventually, and as the folder next door until then.**
Decided by the owner on 12 August 2026 on one question: somebody who does not have this repository has
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

**A path dependency does work, measured the same day**: an empty project declaring
`"@harmony/codec": "file:../harmony-explorations/packages/codec"` imports 335 exports and parses a
real arch 14 container, with nothing built and nothing published. It works precisely where the git
install cannot, because the install is a symlink and Node resolves the real path, which is outside
`node_modules`.

**What publishing will need is deliberately not built yet**, because one of its inputs is a
FreeHarmony decision nobody has made: a bundler compiles TypeScript sources itself, in which case
source only packages are right and a `dist` is dead weight, and an unbundled Electron main process
needs the opposite. So `exports`, `dist` and dropping `private` wait for that, and the item to carry
is the boundary itself: whatever it becomes, it should be exercised by a probe that installs and
imports rather than by a paragraph like this one.

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
the owner is the only author, so a change needs nobody's consent. Once anyone else has contributed it
needs all of theirs. Nothing about this repository moves: `packages/*` stay MIT, and MIT into GPLv3 is
untroubled in the one direction it has to be.

**A community device database is a direction now, decision 11 in `docs/roadmap.md`, and almost all of
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
value, `Raw` null on all 419 commands fetched, so an importer needs an **infrared encoder per protocol
family** and that is a work item nobody had priced. The cheap route, reading base slot 5 out of a
compiled config, needs none of it. Two things on that list matter beyond the import.
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
  FreeHarmony/              the application, checked out beside this one on 12 August 2026. Its path
                            dependency is `../harmony-explorations/packages/codec`, so the sibling
                            layout is load bearing rather than a convention
  lab/                      private, never in git
    dumps/<person>/<remote>/  concordance dumps, with a META.md each
    firmware/packages/        original Logitech .hfw files
    firmware/derived/         binaries decoded out of them
    ghidra/                   Ghidra projects
    software/                 Logitech's own PC software, see docs/host-client.md
    work/                     scratch
```

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
so the guard and the loop cannot drift apart. The TypeScript one
deliberately skips only when there is **no lab at all**, because a lab that is present and missing
a sample should still fail loudly. That
directory has its own `CLAUDE.md`. Analysis happens there, only shareable output lands here.

`tools/corpus.py` inventories the dumps and, importantly, reports which ones have no
description recorded. A dump whose contributor has moved on is far harder to label later than one
described on arrival, and section 124 is what that is worth: the one config with a written description
beside it is the only place two readers here have ever been checked against something outside the code.
**No new dumps are being solicited**, decision 10 in `docs/roadmap.md`, so the column matters for the
files already here rather than for incoming ones.

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
  **Entering safe mode on arch 9 destroys the application firmware**, section 118, measured on the
  bench 525 by reading its internal flash before and after: the bootloader is byte identical, the
  28 KiB application is gone, and an image under 10 KiB sits in its place with everything above
  `0x3800` erased. The part has 32 KiB, so there is no room for a second image **in internal program
  flash** and safe mode has to be copied over the application. **So safe mode is not a free fallback on
  arch 9 and must never be entered as an experiment**: a power cycle does not leave it, and leaving it
  needs the application copied back, which is why the rail demanding a verified dump of that exact unit
  is what separates a recoverable remote from a lost one. Arch 14 keeps both images resident in
  internal flash and does not have this problem. **On arch 9 both images are resident too, in external
  flash, and the internal region is a copy of whichever the bootloader last put there**: the
  application at `0x810000`, read twice and matching the internal copy byte for byte, and the safe mode
  image at `0x800000`, whose five version accessors are exactly what a stranded 525 reported. That
  second identification is the calibration worth remembering, because the label was written from the
  header on 8 August and the device confirmed it on 11 August. So nothing is transferred from a host to
  enter safe mode and nothing has to be to leave it. What tells the bootloader which image to install
  is **byte 0 of the on chip EEPROM**, section 119, and `0x02` selects the application: 1 and 5 request
  safe mode, 2 requests the application, the bootloader marks 3 or 4 **before** copying, writes **6** on
  success, and the running image consumes the 6 by writing 0 and putting a message on the screen. So 3
  and 4 are in progress marks that make an interrupted install retry, and **0 is the resting value**, at
  which nothing is installed and whatever is resident runs. **The address
  space the protocol calls flash is a set of tagged windows and only one of them is flash**: on arch 9
  top byte `0x00` is 32 KiB of internal program flash, `0x20` is 256 bytes of EEPROM, `0x40` is 2048
  bytes of data memory, `0x30` is eight bytes, and `0x80` to `0x87` is the serial chip. Every bound is
  a documented size of the PIC18F4550. So concordance's `FinishFirmware` byte is **confirmed from the
  firmware and no longer client sourced**, and section 88's arch 9 rule was the validator's default arm
  read as the whole rule, which is why `packages/usb` refused three regions the device serves.
  `ARCH9_WINDOWS` carries them now. **A read only measurement refuted the first reading of the latch**:
  the stranded 525's EEPROM byte 0 is 0, not the 3 predicted, so safe mode persists by being resident
  and not by being reinstalled, and only the byte could tell those apart. **The recovery has been
  performed and it worked**, by the owner, on 11 August 2026, from the private lab script: the 525 came
  back with software type 0, its version reply matching 8 August byte for byte, its application region
  restored including two offsets that were erased flash while it was stranded, and its config intact.
  Its screen said the upgrade was complete, which was observed **before** the firmware path that emits
  that message had been found, and looking for what emitted it is what completed the state machine.
  **This project must still not be what performs the write**: it has never written to a remote, arch 9
  has no write target, and a first write should not install firmware on an irreplaceable unit.
  **Safe mode has a published entry procedure and it is a cold boot key test**, section 118: charge,
  pull the battery, hold Off, insert the battery while still holding, up to 30 seconds. So it involves
  no config, no host and no USB command, which is why searching the running firmware for it failed.
  The source is a third party repair business rather than Logitech, so it is a hypothesis of the same
  standing as an upstream finding, and **the cheap confirmation is read only hardware on the spare
  One** rather than more firmware reading. Firmware side, narrowed not closed: the arch 12 internal
  bootloader has **zero** port reads so it does not test the key, the safe mode image does read the
  matrix, and the config base reaches `TBLPTRU` from a variable with no literal anywhere.
* **A config cannot choose where the remote writes**, section 118, which is the measured answer to the
  caveat that a config might make the runtime write to arbitrary flash including firmware. The path is
  real, action list opcodes `0x65` and `0x66`, and section 108 read it. It is bounded three ways, all
  in the firmware: five zero tests and two range tests that return rather than write, and a region the
  firmware computes rather than the config declaring it. The structural half is stronger than the
  bounds: **arch 14 writes over SPI to a chip its firmware does not live on, and arch 12, whose
  firmware does share the mapped NOR with its config, implements neither opcode.** Scoped to three
  architectures and to the action list language, and no config in the corpus emits either opcode.
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

**A clean read only session does not strand a remote, and that is measured three times out of three.**
On 10 August 2026 three rounds of one plain 32 byte read, then the cable out, each left the spare One
**out** of USB mode and on its normal display. So version 1 of FreeHarmony needs to send nothing at
the end, and the awkward choice section 95 posed does not arise. USB mode's exit is gated on the command state variable
`0x284` being zero, section 99, and a completed `READ_FLASH` clears its own state, so a clean session
leaves the gate open.

**A hang does not strand one either, and it ends in a genuine device reset**, section 100, measured on
10 August 2026: the remote reboots, comes up in USB mode, and **its clock is reset**, which a
re-enumeration does not do. So data memory is reinitialised and no corruption survives a hang, which
refutes the idle flag hypothesis by mechanism rather than by measurement. "A self-clearing restart" was
the weaker name for two days.

**What does strand one is unexplained, and it is PARKED**, by the owner's decision on 10 August 2026,
whose reading is that it may be an anomaly of that one unit: the spare has been synced by Logitech's
software, hung deliberately more than a dozen times and had its batteries pulled repeatedly, and it is
the only remote it has ever happened to. **What reopens it is another occurrence, nothing else.** Three leads followed
and all three dead: the disconnect on its own, falsified by three control rounds; the hang's RAM
corruption, refuted by mechanism since the hang resets the device; and the charger to USB transition,
which behaved like every other round on 10 August 2026. **Do not read that as a narrowing.** A bench
session should expect a stranding, a battery pull clears it, and nothing here knows why. Untested and
not leads until something suggests a mechanism: those two sessions ran dozens of commands where every
round here ran one, and both followed hours of continuous bench work rather than a remote picked up
cold. `session-end-control.ts [--from-charger]` is the instrument, and its charger mode refuses to
start with the remote already on USB because its first wait is the measurement. **Do not re-derive the
dead leads**: each cost a round of hardware, and if it happens again the two things to capture in the
moment are how many commands the session had sent and whether the screen still said USB mode before
anything was unplugged. Every previous occurrence lost both.
`packages/usb/bin/idle-flags-after-hang.ts` is kept for its baseline leg and because it is what
demonstrates the reset. It needs `HARMONY_ODD_READ_EXPERIMENT=1`, which is a **named door** in
`rails.ts` rather than a source edit: the odd count refusal was bypassed twice by patching
`remote.ts` and patching it back, and a rail edited under time pressure with nothing in the tests to
say so is worse than a door that announces itself. `0xE0 0x01` clears the gate and is not a reset, `0xE0 0x02` reboots, section 97;
`packages/usb/bin/end-session-experiment.ts` exists, is gated by `assertSessionEndAllowed`, and is
**deliberately unrun** because the control made it unnecessary.

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
README.md                       front page, written for somebody looking for a replacement for
                                Logitech's software rather than for a contributor: what the problem
                                is, what FreeHarmony will be, where the work stands in plain words,
                                and links out for the detail. No architecture numbers, no licence
                                argument, no call for dumps, per decision 10 in docs/roadmap.md
docs/status.md                  where the work stands: what reads, what the corpus holds per
                                architecture, the headline findings. A snapshot, not the plan
docs/roadmap.md                 THE plan of record: decisions, milestones, sequence
docs/findings.md                authoritative technical reference, narrative
docs/config-format.md           the config format spec, structured, for tools to track
docs/glossary.md                the vocabulary: which terms are Logitech's, which are ours
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
reference/capabilities.md       what each model's hardware can do, per skin, with a verification
                                column. Third party and unconfirmed except where that column says
                                otherwise, and `packages/usb/src/models.ts` is the executable form
reference/silhouettes/          which buttons a model has, as a drawing, one SVG per model, outline
                                only bar the teletext keys. Drawn rather than traced, so it is ours
                                to publish, and tested: the count has to match what the firmware
                                implies, and the case has to be a measured contour rather than a
                                rounded box. The three bench remotes are drawn, 50, 54 and 44
                                buttons. **Not the button map: placement is schematic**, since every
                                key sits on a horizontal axis where real rows are angled or curved,
                                so a hit region must not be taken from these coordinates. Drawing
                                the other 33 models was started on 11 August 2026 and stopped for
                                that reason; it is parked until FreeHarmony needs it
reference/concordance-notes.md  the two concordance defects, with patches
reference/ghidra_functions.txt  derived metadata: 521 functions by reference count
bin/setup-ghidra.sh             build or refresh the Ghidra project
pyrightconfig.json              what pyright checks and, at length, what it deliberately does not
samples/                        empty by policy
```

The TypeScript workspace, per `docs/roadmap.md` step 4:

```
packages/codec/                 TS: the one config codec, container through compiler,
                                src/coverage.ts the M2 byte accounting, src/emit.ts the
                                emitter that reads it back the other way and is the round trip
                                side on purpose, and src/edit.ts the M3 groundwork: same length
                                edits, rails as refusals, and FIELD_RULES, which is why a round
                                trip and a save differ. src/text.ts reads the screen's text, with
                                src/alphabets.ts generated from the seeds in bin/alphabets.ts
packages/lab/                   TS: finds the private lab directory, mirrors tests/lab.py
packages/usb/                   TS: the command protocol and the write rails, read path measured,
                                plus src/models.ts, which turns the skin a remote reports into a
                                model and its hardware capabilities
packages/corpus/                TS: read a config off a remote and file it, composes the other three
packages/bench/                 TS: the bench instrument, a server plus a page in web/
packages/probe/                 TS: the contribution probe, a report with shape and no contents
```

There is no `apps/` here. The application is FreeHarmony, and the workspace globs say so.

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

**The two skins that did not match a remote are the European models**, section 131, not the numbering
artefact section 81 read them as: 59 is the Harmony One EMEA and 73 the Harmony 600 EMEA, so both bench
remotes' own configs name their region correctly and the run arithmetic that fitted both cases was
reading Logitech's allocation order out of the gaps it left. The source is
`ProductsManager/GetAllProducts` on the live service, which lists 80 skins below 100 against the classic
client table's 46 and pairs 14 models with a regional variant. **What selects one of a pair is still
open.** `packages/usb/src/models.ts` carries 35 skins now, and its one refusal of a vendor number is the
part worth remembering: Logitech says a Harmony 700 takes eight devices, both 700 configs hold exactly
six, and six is kept because it is the only figure in that column with a corroboration.

**Slot 3 holds the config's build timestamp**, an eleven byte record framed by `0xADDF` and
`0xEFBF`, whose day of week byte is days since 1 January 2000 modulo 7. That closure is why the
seven byte field assignment is believed; the assignment itself is the only one of 336 candidates
that fits the corpus, and **confirmed independently in section 58** against a config compiled while
we watched, on a date known before it was read. `docs/findings.md` section 21. Do not use it to
order two configs of the same remote: it contradicts the recorded direction of the Harmony 700 pair
and that is unresolved, though the section 58 pair, whose direction was observed rather than
recorded, is ordered correctly by it.

**On arch 12 it is also what the remote's clock is set to**, at every boot, section 111: a power cycled
Harmony One read this record's date exactly and its time plus its ninety seconds of uptime. **Arch 14
and arch 9 are not measured and must not be assumed**, since both carry the same record and neither has
been power cycled and read. The **rail does not depend on that scope**: a writer stamps this record with
the moment of writing, and on an architecture that ignores it for its clock that is still the correct
provenance value, so the action is right either way and only the reason changes. Reproducing the input's
timestamp is right for a round trip and wrong for a save, and it is the first field where those two come
apart.

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

Four project skills carry the rituals that are easy to half-perform:

* **`trace-section`**, the method for labelling a config section by finding the firmware code
  that consumes its pointer, with the pitfalls that have already cost time here.
* **`finding`**, the verification gate plus the three places a confirmed fact must land, and the
  convention for correcting an earlier claim in place.
* **`probe-remote`**, how to measure a connected remote read only: the rails, which enumeration
  commands actually work on this machine, and where a hardware number has to land.
* **`code-navigation`**, ask the language index rather than grepping for a symbol, with the two
  pitfalls that make it worse than grep when they are not known: the IDE does not index Python and
  answers anyway, from the directory, and the reply's `resolvedSymbol` is what says so.

```
make test          run the suite; image-backed tests need a lab directory
make test-nolab    the suite against a nonexistent lab: it must skip, never assert
make test-verbose  one line per test
make lint          byte-compile everything
make pyright       the Python type checks, at the level pyrightconfig.json argues for. Skips with a
                   note where pyright is absent, since a Python 3 install is still the floor here
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
make reading       the step 6 depth number, meaning against placement; READING_ARGS=--detail
make text          how much on screen text reads back as characters; TEXT_ARGS=--detail
make render        draw a config's screens as PNG files, into the lab and never into the repository.
                   RENDER_ARGS=--config one_config --page 45, or --sheet for every page, or
                   --undrawn to paint the pixels nothing reached. The check that fails differently
                   from every other one here, since a reader test cannot see a label half a row out
make activities    which activity each key starts and which drawn label is its name, per model
make devices       which devices a config drives, what each is called and which route named it
make alphabets     regenerate the glyph shape table from the hand read seeds; ALPHABETS_ARGS=--write
make remotes       list attached remotes, enumeration only, opens nothing
make page          drive the bench page in the Chrome already installed, which is what checks the
                   page rather than the routes. Gated on HARMONY_PAGE_TESTS=1 and skips with no
                   Chrome, because playwright's browser download is deliberately not approved
make bench         start the bench instrument on 127.0.0.1:8731, Ctrl-C to stop. It also inspects a
                   config the lab already holds, with no remote attached: devices, activities, and
                   what each button sends including the repeat interval of a held key, plus the
                   **drawn screen** of any page beside the keys that page binds, `GET /api/screen`,
                   made out of the bytes per request rather than read off disk
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
HARMONY_ENABLE_WRITES=1 node packages/usb/bin/end-session-experiment.ts
                       THE ONLY SCRIPT HERE THAT SENDS A COMMAND WHICH IS NOT A READ, one
                       `0xE0 0x01`, which zeroes one variable and touches no storage. Refuses
                       to start without the flag. Unrun; section 99 holds its prediction and
                       names the control that comes first.
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
* **Testing a route is not testing the page, and a content security policy is where that bites.**
  Every drawn screen in the bench was a broken image while `curl` fetched the same URL happily and
  every server test passed: the policy listed `script-src`, `style-src` and `connect-src` and no
  `img-src`, so `default-src 'none'` blocked them. A policy is enforced by the browser and by nothing
  else. There are two checks now, and both were needed: `make page` drives the page in Chrome and
  asserts the console stays clean and that the image actually decoded, and a test in
  `packages/bench/test/server.test.ts` reads the page and demands a directive for every kind of
  resource it references, which runs without a browser. **The browser test's own control matters**: with
  `img-src` removed it has to fail, and the first version failed for the wrong reason, because
  `waitForFunction` evaluates a string and the page's own policy forbids `unsafe-eval`. It polls with a
  passed function now.
* **A population that only holds what sends a code loses the pages that matter.** The screen picker was
  built from the key table, which only reports bindings that end in an infrared code, so every activity
  page was missing from it: an activity key selects a handler set and sends nothing itself. Same trap as
  `keyCodes` versus `pageScans`, twice in two days. When listing pages, use `pageScans`.
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
* **A reader called inside a per page loop is a quadratic, and every test still passes.** The bench's
  inventory view called `activities`, which is a four hop chain, once per mode page, so inspecting a
  Harmony 700 config took 15.6 seconds against 0.4 after hoisting it. Nothing failed: the view was
  correct, and a click that takes fifteen seconds with no indication reads as a click that did nothing,
  which is how the owner found it while using the bench. Second one of these here, after an O(n squared)
  `indexOf` in a test. So hoist a whole corpus reader out of any loop over pages or keys, and where the
  cost is user facing put a coarse wall clock ceiling on it: `packages/bench/test/bench.test.ts` has one
  at seven times the measured figure, which catches an accidental quadratic and says nothing about a
  slow machine.
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
summary of what is known**: that is `docs/findings.md`, 132 sections, and `docs/config-format.md`
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
| 0 | a `0xFEED` framed tree of state variable names, which say what each variable is for and which device it belongs to | 20, 77, 86, 126 |
| 1 | seven bytes stating the architecture, the only place the config says it | 20 |
| 2 | the log area: three numbers reserving flash above the config, arch 12 only writer | 47 |
| 3 | the clock. Starts Timer 1; on arch 12 its build timestamp is what the clock is set to | 21, 38, 111 |
| 4 | the firmware event map | 36, 39 |
| 5 | the infrared database: one group per device, then records. Class 5 spells a code from a dictionary; a record's three block pointers are once, held and tail | 32, 42, 61, 65, 82, 86, 126, 127 |
| 6 | the mode table. A record carries a screen program, and its entry an array of pages, each with a tagged list and a copy of it | 37, 52, 53, 66, 68, 69 |
| 7 | the font table, indexed by screen opcode 16. A glyph code is per config, and the text reads back from the pixels | 46, 63, 112 |
| 8 | key press bindings: one leading action list, then every mode page's list | 27, 38, 83 |
| 9 | the binding table: sets of button bindings with an enter and a leave handler | 39, 67, 69 |
| 10 | the action list table | 38 |
| 11 | screen language programs | 40 |
| 12 | the timer table | 43 |
| 13 | the state variable table: a range, and transitions carrying one instruction | 35, 60, 86 |
| 14 | the state value map, indexed by opcode `0x72`'s high byte | 39 |
| 15 | the parameter block: numbered groups of `u16` | 44 |
| 16 | the number sender. Used by no config in the corpus | 39 |
| 17 | the touch screen hit map on arch 12, indexed by a mode page's spare byte; elsewhere the picture bank | 45, 62, 125 |

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

* **Base slot 13's first seven records are the clock and are stamped too**, section 130: `first` is the
  value a variable holds when the config is generated, and records 0 to 6 are second, minute, hour, day,
  weekday, month and year, each equal to the corresponding field of base slot 3's timestamp in all 21
  containers. So a carried over config carries a stale clock in two places, not one, and the seven must
  never be reused for anything else, which section 74 had already said of 3, 5 and 6. **It is eight
  values and not seven**, which building the rail found rather than reading it: six maxima are constants
  and the year's is that year plus one, so stamping the year without its maximum leaves a config
  declaring a value outside a variable's own range. `clockStateEdits` in `packages/codec/src/edit.ts`,
  and it refuses a base slot 13 whose other six maxima are not the clock's.
* **Base slot 3's timestamp is stamped at write time, not copied**, section 111: an arch 12 remote sets
  its clock from it at every boot, so a stale timestamp is a wrong clock by exactly its staleness. The
  rail holds on the other architectures too without needing their measurement, because stamping the
  moment of writing is the right provenance value whatever the remote does with it. This is the one
  field where reproducing the input byte for byte, which is what a round trip test wants, is the wrong
  thing for a save.
* **`end_addr` is restamped when anything changes length**, and it is the only header field that
  moves with a section's growth, which is also why the container's base is anchored on the clock
  record here rather than computed from the marker. **This used to add "and a real generator got that<!--superseded-->
  wrong", and no generator did**, section 122: the Harmony 890 config that declared an end 864 bytes
  before its own end marker was a **read** with 16 duplicated 54 byte chunks in it, and a second read
  of the same remote duplicated 2. So no config in the corpus shows a generator getting this wrong,
  and what the case actually demonstrates is the next rail down.
* **A read can insert bytes without losing any, so a config that parses is not a config that
  arrived**, section 122. Every read of an arch 10 remote here came back with 2 to 28 surplus chunks,
  and the two that were usable were the two where the duplicates happened to land in the zero fill
  past the container. The two independent checks are the trailer checksum, which the boot validator
  computes, and the end marker's position against the declared `end_addr`. Neither is sufficient: a
  duplicated run of zeroes leaves the checksum untouched, and the checksum is blind to two transposed
  words. `packages/corpus/src/read.ts` performs both after every read, and the checksum half was
  added because of this, not before it.
* **Parsing is not validating, and somebody else's experiment is the proof**, section 117:
  harmony-decompiler's author cloned a device into an arch 9 config, and the result passed both
  checksums, rendered every screen pixel identical, closed its counts and **was accepted by this
  project's parser**, while every infrared command in it addressed the wrong place. Inserting bytes
  moved the class 5 symbol tables that section 82 reads, and pointers inside a carried run are
  checked by nothing here. This is the demonstration behind `edit.ts` refusing to change a length.
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
* **A record's three block pointers are once, held and tail**, section 127: the firmware samples the
  keypad at every block boundary, so slot 1 is sent only while the key is down and then **repeats for as
  long as it is**, and the interval a user feels is that block's own duration. Editing its trailing gap
  is how a repeat rate changes, per code, and a duration word caps at 32767 us so a same length edit can
  only reach the ceiling of the words already there. `0x7C` is **not** what repeats a held key, which is
  the reading section 70 guessed at and this refutes.
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
  outside `[0x040000, 0x400000)` zeroes the remaining count instead of writing. **On arch 12 that is
  what actually happens**, section 111: both One configs declare `[0x3FFFF0, 0x400000)`, which is the
  top sixteen bytes of a 64 KiB block both bench units carry a `00 FF` pattern in, so the boot scan
  recovers `0x400000` and the writer disarms itself. The rail read as protection against a bad config
  is what fires on a good one, and using the facility at all would need a 64 KiB erase inside the
  config region.
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
  **Field 6 has a reading now and it is unconfirmed rather than absent**, section 116: it names a
  **platform**, not an architecture, and arch 12 and arch 14 are one platform under it. `0x0C` on both
  of those across six images, `0x09` on arch 9, `0x08` on arch 8. **For an application image only**,
  section 118: a live 525 in safe mode reports `0x00`, as the arch 8 bootloaders do. Everything else already grouped those two: same MCU family, same
  `GSPM` cookie, and Logitech's own platform table calls arch 12 the Gin family. What moved it was the
  population going from four images to eleven; four could not tell "equals the architecture, except
  once" from "equals the platform, always". The `bcdDevice` high byte has the same shape and different
  values, `0x08`, `0x09`, `0x10`, `0x10`, so the two are not one variable.
* **What the One's analogue channel 1 measures**, section 103, and **USB cannot settle it**, section
  111. Two readings fit and they differ only in the sensor's wiring, so the firmware cannot choose, and
  the bench read that was meant to choose landed on outcome 2: the converter is off and its result
  register frozen across 60 seconds while the clock ticks in the same poll, so covering the sensor
  cannot move `0x110`. What the read did settle is that the band, the state and the level in RAM agree
  with each other through the config's own base slot 15, which is how we know an arch 12 remote on USB
  has read its config. Finishing the sensor needs the remote off USB, which no read path reaches.
  Channel 0 is the battery, `0x111`, eight levels, and it reads 7 of 8 on a charging remote.
* **Whether arch 14 and arch 9 also set their clocks from base slot 3**, section 111. Measured on arch
  12 and on nothing else, and all three carry the same eleven byte record. **Not a blocker for anything**:
  the write rail is to stamp the record at write time, which is the right value whichever way this goes,
  so the answer would change a sentence and no code. One round of hardware settles it per architecture,
  the same one as on the One: batteries out, batteries in, cable in, read `0x108` to `0x10E` on arch 12's
  numbering or wherever the equivalent fields sit. **The 600 is the awkward one**, because a remote on
  arch 14 does not load its config on USB at all, section 110, so its clock may have no config derived
  value to show and a null result there would mean less than it looks.
* **Where the minute is incremented on arch 12**, section 111. No direct write to `0x109` exists in the
  image and no `LFSR` reaches the range, so the pointer comes from a variable, which is the `FSR` dead
  end `trace-section` names first. The field is named from the firmware's own subtraction against the
  record and its behaviour is measured twice, so **this is an attribution gap and not a reading gap**,
  and nothing depends on closing it.
* **The rate the arch 12 clock loses time**, section 111. Two mechanisms are read and both only lose, so
  5.6 minutes a day is an upper bound rather than a figure. **Deliberately not measured**, by the owner's
  decision on 10 August 2026: it would need the One left alone for a day and read at both ends, and no
  document or code anywhere wants the number. Recorded so that the bound is never quoted as a
  measurement.
* **The arch 12 calibration words at `0x01F5C0` and `0x01F5C2`**, section 105: 94 and `0xFFFF` on
  both units, fetched by the same helper as the battery scale, consumer not traced. The scale itself
  is read, `4 + trim/65536` millivolts a converter count, and **section 44's battery conjecture is a
  finding now**. Two hazards worth carrying: `0x01F580` is **on chip**, so a firmware `TBLRD` there
  and a `READ_FLASH` over USB at the same number read different memories; and the words had been in
  the lab for a day, filed as "unidentified" in `docs/memory-map-one.md` two rows above the note that
  says two remotes differ at `+0xF582`.
* **Which I2C device sits at address 0x60 on the Harmony One**, section 106. Thirteen channels of
  three states, two eight bit level registers, an enable on `LATC` bit 5 and no readback, which is the
  shape of an LED driver and most plausibly the keypad backlight, dimmed by the same band that dims
  the screen. **Not confirmed and deliberately not named.** A datasheet search on the address and the
  register numbers, or a photograph of the board, settles it; firmware cannot.
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
* **The physical button map**, meaning the matrix keypad. **The Harmony One's touch panel is mapped**,
  section 125, and out of the config rather than the hardware: base slot 17's rectangles, the mode page
  byte saying which page is in force, and a transform onto the display. That leaves the 44 keys around
  the panel, and every other model. Measured as far as USB allows and no further, section 48: a remote on
  USB never runs its **keypad handler**, because USB mode's own loop does not scan the matrix. It does
  run the rest of its application, section 111, and "never runs its application" was the wording here
  until a Harmony One was watched ticking. **On arch 14 it does not even load its config**, section
  110: the journal's five variables are zero on the 600, so neither the container's marker check nor
  the allocator has run, and anything the host wants to know it computes from the bytes itself. On arch
  12 it does load it, section 111, because the config is memory mapped and there is no load step.
  Arch 14 yields the **column**
  only, `(code - 1) mod 4`, and arch 12 yields nothing at all, since sixteen buttons from every
  region of the One share one sense line. Finishing it needs a RAM write to drive the rows, which
  the rails forbid, and **that is not proposed here.** **There is a route that needs no write**,
  section 123: the 525 implements infrared learning, so pointing the original equipment's own remote
  at it and matching the capture against the class 5 records section 82 read names the command, and
  the config already binds a scan code to it. `0x70` is still a command that changes a remote's
  state rather than reading it, so it sits behind the write flag, and nothing here has sent one. Neither of Logitech's own applications has
  it either, checked on 9 August 2026: a host names buttons and the firmware resolves the name to
  hardware, so no host ever held the map. `docs/host-client.md`.
  **Arch 9 sits below both and needs no census**, section 89: the 525 senses on a single line like
  the One, so a press is not even worth a column, and its matrix falls out of the firmware instead.
  8 by 8, scan code `group * 8 + column` running 1 to 64, and both its configs bind the same 50
  codes, none a multiple of eight and contiguous in the resulting lattice to 57. So **the 525 has
  fifty matrix buttons**, predicted from firmware plus config and then **counted on the remote**,
  which makes it the one architecture where every matrix button is bound and no bound code lacks a
  button. **Counted a third way on 11 August 2026 and it is fifty**, from a product photograph, which
  is a free confirmation of a number that had cost a firmware read and a hardware census.
  `reference/silhouettes/h525.svg` is that count as a drawing, and what it does
  **not** carry is any scan code: the positions are drawn and the assignment is open, since section 48
  is why no read path here can produce it. Nor is it a usable map of **where** the keys are, since every
  key in it sits on a horizontal axis and a 525's rows do not. The four soft keys are narrowed to the set
  `{30, 31, 38, 39}` and deliberately not assigned within it, because nothing establishes which of
  columns 6 and 7 is the left one. A test refuses a `data-scan` attribute anywhere in the file, so
  filling one in has to be a deliberate change with a measurement behind it.
  **The 600 and the One are drawn too**, and the pair is instructive about what a third count is
  worth. The **600 came to 54**, which is exactly what section 17's field split and section 48's
  column census of 14, 14, 13 and 13 both give, so three independent routes agree. The **One came to
  44 and nothing can check it**: arch 12 yields no column from a USB census because sixteen buttons
  share one sense line, so that number is a count of a photograph and the drawing says so rather than
  implying confirmation. Neither carries a `data-scan` or even a candidate set, since nothing narrows
  either.
* **`MCU_ID` is unreachable by construction**, not a task: a PIC18 keeps its device id at `0x3FFFFE`
  and the internal read window is two 64 KiB pages. The arch 12 part number stays inferred.

## Next

**The screen's text reads back**, section 112, which is what the application needed before it could
show a config's activities: their names are drawn by a mode page's screen program and nothing else
names them. A glyph code is **not** a character and not an encoding: it indexes the config's own font
table and is assigned per config, in the order characters first appear in the generator's string list,
so two configs of one remote disagree about code 20. What is stable is the typeface, so a code is
resolved from its glyph's **pixels** against a hand read alphabet, seven of which cover the corpus.
170920<!--fact:text_read--> of 170922<!--fact:text_glyphs--> drawn glyphs come back; `make text`. The
seeds and the method for an eighth typeface are in `packages/codec/bin/alphabets.ts`.

**A code is one character and a character is one code**, section 124, and that rule is the check to
reach for before trusting a seed: it is the generator's own, since a code is a character's position in
the string list it walks. Three hand read labels were wrong and each showed up as a character sitting on
two codes at once, `9` read as `8` on arch 9, a lowercase `z` read as `Z` on arch 14, and an `I` read as
`l` on arch 12. Every one of them was drawn in a single word in its own container, which is why the
proof string each seed carries could not catch any of them, and every one was caught by a **second**
container of the same skin. The rule also resolves what no shape can, `I` against `l`, in place of a
fallback that assumed two configs of one skin number their codes alike. **Adding a gap filling source
labels a shape and not just a code**, so when two characters share a shape both codes have to be named
or the shape is claimed for one of them.

**Which key starts which activity is read**, section 120, and **which drawn name it carries is read on
all four architectures**, sections 121 and 125. The chain is four hops, because nothing in the format names
an activity: a mode page's tagged list binds a key to `0x7F`, that base slot 10 list carries `0x1F` with
operand `0xFF | set` selecting a base slot 9 entry, that entry's list writes `CurrentActivityState` with
`0x80 | n`. Eleven of eleven containers, four architectures. Every binding is a press, every activity is
reachable, and **all of an activity's keys are on one page**, which is what makes "the page that names
this activity" mean something. The structural closure is that an activity page's `0x7F` operands are a
contiguous ascending run of base slot 10 indices, 16 of 16 activity pages against 373 of 1152 pages
generally that are not.

**The idle value is base slot 13's `first`**, the field section 60 marked unconfirmed, and it is exactly
the value no binding writes. `one_config` is what makes that a finding rather than arithmetic: `first` is
7 where the highest is 8 and 8 **is** bound to a key. So section 86's "value 0 is no activity running"
was the wrong reason for a right count, corrected in section 120.

**The name comes from the modes the chain enters**, not from geometry: an activity's lists also carry
`0x7E`, and the mode they enter draws the activity's own name, so the page's string that relates to one
of those is its label. That is how three architectures do it: arch 8 22 of 22, arch 9 4 of 4, arch 14 13
of 13, and with arch 12's own route below, **50<!--fact:activities_named--> of
50<!--fact:activities_total--> activities**, `make activities`. Four rules make it a function and each was found by having it fail: an exact match beats a
contained one, a per mode chrome test, one label to one activity, and a second pass for a label the menu
wrapped onto another row. **The exact match rule is the one to remember**, section 124: an activity's
chain enters the mode that lists the devices, so every activity says every device's name, and reading
containment as sufficient let one label be claimed by all four activities of a Harmony 880 and then
dropped from all four as chrome. The number was 23 of 35 for a day, and three of those 23 were fragments
of a wrapped label, two of them belonging to a different activity than the one they were reported for.

**Arch 12 does not use any of that, and it is the better route**, section 125. No string rule can work on
a touch panel: `one_config`'s three activity pages bind scans {50,51,52}, {50,48,49} and {48,49} while all
three draw labels on the same rows, so no fixed code to row map can exist. What a One needs is base slot
17's hit map, and the missing link was **`ModePage.lead`**, the arch 12 only byte section 66 read and
nobody explained: it is a zero based index into that map, so the rectangle a key covers is **stated** and
the label is the text the firmware's own hit test puts inside it. 11 of 11, and it runs before the string
matching, because a stated answer beats an inferred one. The closure is a demand the container makes on
itself, that a page only binds codes its own hit page offers, 268 of 268 and 104 of 104 where every shift
breaks 54 to 227. `packages/codec/src/touch.ts` also carries the **panel to pixel transform**, whose y
half is arithmetic (872 panel units and 54 pixels are one row measured twice) and whose **x half rests on
one reading** and is marked as such, though no name depends on it. Under it the panel is three blocks at
pixel rows 33, 87 and 141, one or two across and never three, plus a bar from 191 to 253 that runs off a
220 pixel display: which is exactly what the owner described unprompted, two touch points below the
screen and a key at each side, so 48 to 53 are the blocks, 43 and 44 the points and 46 and 47 the keys.
**Which code lands where is per page**, in the order the rectangles are stored, so section 121's proof
holds for the codes too.

**Every key a screen labels now carries that label**, section 128, which is what turns the button table
from `group 3 #29` into a word. Two populations first: a scan bound by a **mode page** is a key the screen
speaks for and a scan bound by a **base slot 9 set** is a key on the keypad, and the two are **disjoint**,
sharing no code at all on arch 9 (Harmony 525), arch 12 (Harmony One) and arch 14 (Harmony 600 and 700)
and exactly one on arch 8 (Harmony 880). Then the place: on a One base slot 17 states the rectangle, so the
label is the text inside it, attributed to the **nearest** region rather than the firmware's own first
match, which is right for a touch and wrong for a label since a long right hand string starts inside the
left hand rectangle. Elsewhere the keys are two columns beside the screen and the rows are **measured**
from where the activities section 121 names without geometry are drawn: four rows on arch 8, two on arch 9
and two on arch 14, with the left of each pair settled per architecture and not assumed. 98.9% of 6989
screen key bindings, and 3100 of the 3106 that send a code.

**The rule that suggested itself fits the counts and is wrong**, and it is the lesson of the section: the
k-th key in ascending scan order taking the k-th row of text pairs four keys with four rows on the 600's
own activity menu and gets two of them wrong, because two keys share a row and the outer rows are chrome.
A key belongs to a **place**. Two closures hold the reading up, one of which reads no text at all: every
two item row in the corpus has its two keys on **different** action lists, with no exception, and the
labels agree with the activity chain on 62 of 63 keys, the exception being a "1 OF 2" page indicator drawn
in the bottom row's continuation slot and left in rather than special cased.

**A config's screens can be drawn now**, section 129, and the bench shows one beside the keys it
binds, made out of the bytes per request. That is the shape FreeHarmony needs, since an editor has to
show what a screen will look like after a change and must not carry a second implementation to do it.
It is `packages/codec/src/render.ts` and `make render`, with the PNG encoding in `src/png.ts` because
the bench serves the same rasters over HTTP and two encoders would be two things to keep right.
It is here rather than in FreeHarmony because it is also the check that fails differently from every other
test in this repository: a reader test says a number came back and cannot see a label half a row out, an
icon over its own caption or a colour channel one bit wrong. **Every mode page of every container
renders with nothing unresolved**, over 1500 pages on four architectures, which needs a picture's
extent, a glyph's encoding, a font set's first code, a referenced string's address and a page's program
pointer all to be right at once. Three things it needed that no reader did: the display size, which the
configs state through their own full screen pictures; the pen advance, which is **nothing** because the
gap between letters is a column the glyph carries; and the pixel byte order, where the first reading was
wrong. **A pixel is big endian RGB565**, the only field here that is not little endian, because it is
stored the way a display controller is fed rather than the way the container is written. Little endian
drew a Harmony One's buttons as rainbow stripes, and the test that pins it says out loud that **most
pictures cannot tell the two apart**, since a black and white picture reads the same either way.

**A page is a set of screens, not one**, and `renderVariants` walks the arms: a screen program switches
on a state variable, so each appearance carries the condition that selects it, named through base slot 0
where the variable has a name. The bench offers them as buttons. **What that immediately produced is
section 130**, because it made the question "which variable is this" unavoidable: **base slot 13's first
seven records are the firmware's clock**, `first` being the value a variable holds when the config is
generated, and all seven equal the corresponding field of base slot 3's build timestamp in all 21
containers. Section 74 had read three of them as a date from the action list language alone, and the
weekday's zero is base slot 3's own epoch, a Saturday. That also generalises section 120's idle value:
it is the generated value, and for `CurrentActivityState` the two coincide because nothing is running
when a config is compiled.

**Two thirds of a config's drawn text had never been read**, section 121, which is what fell out on the
way. Screen opcode 4 draws the glyph string at a `u24`, and in 12052 of 12052 instances that address is
the payload of an opcode 5 instruction in **another** program, so a string is stored once inline and
referenced everywhere else. `make text` went from 65456 glyphs to 146846 on the day, and stands at
170922<!--fact:text_glyphs--> now that two more configs are in its population, with every sample still
reading at 100.0%. Nobody had followed the pointer because the byte accounting never
complained: the bytes were already claimed by the program holding them, and a comment in `screen.ts`
said opcode 2 was the only instruction naming a place outside its own program. **A shared string is a
writer rail**: editing one in place changes every draw that names it.

Step 8, the contribution probe, exists. **Step 6's action list language is read**, section 73:
both dispatchers, every branch, to the `RETURN`. All twenty base slots were already labelled, so
what is left of step 6 is small and it is measured rather than estimated.

**The number now carries a depth, and that distinction is the point.** Knowing which routine an
opcode reaches is not knowing what it means for a config, and counting the first as the second
reported 100% for a language a tenth of which nobody can name. `packages/codec/src/actions.ts` is
the table, `reading` gives one instruction's, `readingCoverage` gives a config's:

| | share of 87005<!--fact:action_instructions--> instructions |
|---|---|
| meaning | 98.4%<!--fact:reading_meaning--> |
| placement only | 1.6%<!--fact:reading_placement--> |
| no reading at all | 0<!--fact:reading_unread--> instructions, nothing left anywhere in the corpus |

Against 24.5% with no reading before sections 70 to 74. Per architecture: 98.5%<!--fact:reading_arch14-->
on arch 14, 98.5%<!--fact:reading_arch12--> on arch 12, 98.1%<!--fact:reading_arch8--> on arch 8 and
96.0%<!--fact:reading_arch9--> on arch 9. **Every figure here is recomputed**, `make reading`, and
that is new: the table used to quote 97537 instructions and 97.9% and nothing checked either, so when
section 103 moved the number for the first time it turned out that no sample list reproduces 97537 at
all. The population is defined in `packages/codec/bin/reading.ts` and nowhere else now.

**The unread column is empty and the state is unreachable**, sections 107 and 108: `0x6E` was the
last opcode in it, six instructions, and it is a modulo, and section 108 read the last three opcodes
that had a handler and no reading, `0x65`, `0x66` and `0x76`. **An action list can make a remote write
to its own external flash**, which is what those first two do, and the region they write to is one the
firmware allocates itself rather than the one base slot 2 declares. What is left is all placement and mostly one thing, `0x3F` band `0xC0` on arch 12, and
it is hardware state rather than config structure. Section 102 read it and it stayed placement;
**section 103 read the state machine behind selector 17 and it did not**, which is 68 of the band's
106 uses per config. The band is three
fields, `{ bit 0; bits 1 to 3; bits 4 to 8 }`, and three mechanisms: selector 17 sets the display's
light level, from four levels, three thresholds and a fade rate that base slot 15 states; selector 16
enables an I2C device at address 0x60 through `LATC` bit 5; and 0 to 12 set that device's thirteen
channels from a two bit table in base slot 15's twelve spare bytes. **Which device it is is not
established**, section 106, and the firmware never switches it on: only a config does. Two closures: the corpus uses **exactly** the fifteen
selector values the handler accepts out of thirty two, and the light level is an index into the 27
distinct `CVREF` voltages the part can produce, a table derivable from the datasheet. **Do not expect
what is left to move by comparing configs**: the band's uses are identical in both One configs despite
one having five devices and eight activities and the other one and one.

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
which is a six byte instruction. **`0x3F`'s bands are the only structure in the format that is not<!--superseded-->
one table across architectures**, so they must not be ported.

**Below `0x65` the dispatcher tests ranges rather than those four values**, section 108, so `0x20`
behaves exactly like `0x1F`; the corpus only ever emits the canonical four, which is why reading it as
four exact cases never showed up in a number. **Two structures are not one table, not one**, section
107: `0x3F`'s bands, and the whole opcode block `0x65` to `0x6E`, which only arch 14 implements. Arch 9 and arch 12 test each of those ten opcodes in
the same ladder and branch to the dispatcher's exit, and their configs never emit one. So the shift,
the boolean operations, the device record writer and the **modulo** are arch 14's alone, while the
multiply and divide just above them, `0x78` and `0x77`, are everyone's. `0x6F` belongs to nobody: it
tests the accumulator and returns from both arms, on all three architectures we hold firmware for.

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
bytes belong to base slot 15 and to no group, by position rather than by reading. **Those twelve are
read now**, section 103: group 9 continuing past the six entries its header declares, four bytes as
one more pair of device levels and eight as a table of two bit fields, with no remainder.

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

**Every device in the corpus has its name, section 126**, 63<!--fact:devices_named--> of
63<!--fact:devices_total--> in fifteen containers, and the route is ASCII rather than pixels. Base slot 0
names no devices: a device's label is a **prefix** of a state variable's name, `<label>_<property>_<values>`,
where a name belonging to the config has a **number** in the property's place instead, which is the
discriminator. What ties a label to an infrared group is base slot 13: the variable's transitions carry
one action list instruction, and for a `Power` or `Input` variable that list is the one that sends the
code, so `0x7D`'s own operand names the device. 102 variables reach exactly one group and **none reaches
two**. Behind that, elimination for 5 and a mode's drawn title for 3, in that order because the title is
the label on arch 9 and arch 14 and a command name on arch 8 and arch 12. Two closures: the ASCII label
is also **drawn**, 53 of 55 exactly, which is two readers with no shared code agreeing; and on arch 9 and
14 shifting the pairing to the next group breaks 16 of 16. `make devices`, and the column to watch is the
source rather than the total.

**The shared walk from a list to the groups it sends to must not be memoised**, section 126, and only
arch 14 could show it: a nested walk stops at whatever the outer one had visited, so caching it lets a
list inherit a truncated answer. Arch 8, 9 and 12 carry `0x7D` directly and passed; arch 14 emits
`{0x7F, 0x7D, 0x7C}` with the send one list down, and every arch 14 device lost its name at once, 63 to
47.

**And `0x7D` answers two more questions the application asks**, section 126: **what a button sends**,
3106 bindings across the corpus and **every one of them a press**, 85 of those macros of several codes in
an order that matters; and **which devices an activity drives**, the groups its base slot 9 set
addresses, one to three per activity. `inventory` composes devices, activities, the build timestamp and
the idle value into one object, which exists so that FreeHarmony does not assemble it and become the
second copy.

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
