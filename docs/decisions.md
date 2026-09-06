# Decisions, and what this project is

**The numbered decisions are load bearing and are cited by number** from `CLAUDE.md`, from
`docs/findings.md` and from comments in the code. **The numbers never change.** A decision that turns
out to be wrong is corrected in place with the reason, the way every other claim here is.

*Moved out of `docs/plans/002-the-roadmap.md` on 6 September 2026, when that document was retired. It was doing four
jobs at once, and 1121 of its 2404 lines were three separate accounts of what to do next. `todo.md` is
the sequence now, `docs/plans/` holds the worked out plans, and this file holds the part that outlives
both.*

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


## Context

`docs/plans/001-generating-configs.md` is the first proposal, out of the harmony-decompiler
discussion. It treats the
user-facing tool as Phase 6, last, because it was written as an argument for how to reverse
engineer the format. The actual goal here is the opposite way round: a local,
cross-platform, fully self-contained application that reads a Harmony config off a remote,
edits devices and activities, learns new IR codes and writes the result back. The reverse
engineering is the cost of that application, not the deliverable.

This plan re-sequences the work so that every stage produces something usable, and so that the
format questions get answered in the order the application needs them. It also records eight
decisions taken in the planning session, because several of them are one-way doors.

Scope for now is deliberately narrow: the Harmony One (arch 12) and the Harmony 600 (arch 14),
both of which are on the desk. The Harmony 700 2.8 image was the arch 14 reference while
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
   repository, [FreeHarmony](https://github.com/dannybloe/FreeHarmony), GPLv3, consuming these
   libraries. The line runs between library and product, not between documents and code. See "The two
   repositories" in `CLAUDE.md`.

   **Its licence is GPLv3 and that is a reversal**, decided on 12 August 2026 while FreeHarmony was
   still a placeholder with a single author. The Affero variant was chosen here for its network
   clause and dropped for two better reasons: that clause fires when a program is **offered to users
   over a network**, which a desktop application is not and a network client never becomes, and Affero
   is a one way door with concordance and harmony-decompiler, whose GPLv3 code can come here while
   nothing of ours could ever go back. If a shared server is ever built, the clause belongs to that
   server. Note what the argument deliberately does **not** rest on: whether the application itself
   ever uses the network, which is a product question and is open. `CLAUDE.md` carries both.

   **How it consumes them was decided on 12 August 2026 and it is not a git dependency.** *This
   decision said "as a pinned git dependency" until that was tried and failed twice: a git install of
   this repository resolves no `@harmony/*` package, and Node refuses to strip types for any file
   inside `node_modules`, so `exports` pointing at `src/index.ts` cannot work for a consumer on any
   version.* The endpoint is **published packages**, on the answer to the only question that
   changes anything: somebody who does not have this repository has to be able to build the
   application. Until the API stops moving, FreeHarmony declares a **path dependency on the sibling
   checkout**, which is measured working today where the git route cannot work at all. What publishing
   needs, an `exports` map and possibly a build, waits on a FreeHarmony decision: a bundler compiles
   these sources itself and wants no `dist`, an unbundled Electron main process wants one.

   **A hand maintained copy of the codec in FreeHarmony is refused**, by the rule this repository is
   built on rather than by preference: two copies of a derivation stay two copies until one moves, it
   has happened here twice, and both times a test could see both copies. Across a repository boundary
   nothing can. A **generated** vendor copy with a check against a commit is acceptable if
   distribution ever demands it.
5. **Hardware in the loop first, emulator deferred.** The emulator remains the right tool for
   activity semantics, but it is the largest single build in the plan and the app would sit
   behind it for months. The cheap substitutes are a byte-identical round trip, a read back and
   diff after every write, IR cross learning between the two remotes, and live RAM polling over
   USB. **The last of those is weaker than it reads and it is per architecture**, sections 110 and
   111: on arch 14 the config loader's own variables read zero on a connected 600, so RAM polling sees
   hardware state and not a config being interpreted; on arch 12 a connected Harmony One has read its
   base slot 15 and is executing, so some derived state is there to see. Even on arch 12 the remote is
   in USB mode, so its interface cannot be driven and its analogue sampler is stopped, which is not
   what activity semantics would need. The decision stands on the first three.
6. **Safety rails are absolute.** Firmware is never written. **Two units may be written to**, the
   spare Harmony One and the Harmony 525, Danny's decision of 5 September 2026, which replaces "the
   spare Harmony One is the only write target"<!--superseded-->. His everyday Harmony One and the
   Harmony 600 stay refused, the 600 because it is the only arch 14 remote here. **The 525 became a write
   target on 6 September 2026**, when the demonstration was authorised and performed, section 269.
   Before that it was "permitted and the rail still refuses it"<!--superseded-->, because permission
   is not capability, which had itself replaced arch 9 having "no `CONFIG_REGION_BASE` entry and no
   `ERASE_BLOCK_SIZE`"<!--superseded-->: section 267 supplied all three constants off the 525's own
   firmware, leaving the refusal resting on the absence of a demonstration rather than of a number.
   **Adding it to the list opened two further paths and the suite refused them**, which is the lesson
   worth more than the permission: the reset escape and the RAM write have lists of their own now, so
   a demonstration buys the path it demonstrated and nothing beside it. **The reason to be
   careful got stronger rather than weaker**: its application firmware sits one 64 KiB step below its
   configuration and the safe mode image below that, and the firmware bounds an erase to the flash
   part and nowhere finer, so both images are inside what the remote will accept. Details below.
7. **Heads down on our own derivation.** The findings in harmony-decompiler discussion #1 are
   treated as hypotheses to test, not as facts to adopt. The original format designer
   (`glenharris`) is active there and is a privileged source, but asking is held in reserve for
   when we are genuinely stuck.
8. **Version 1 of the app is read only.** Detect the remote, read the config, show the container
   and the labelled sections, export IR codes. The write rails, the erase scoping and the request
   encoders are written and sit behind a flag that is off in release builds. The `WRITE_FLASH` data
   path was read on 25 August 2026, section 175, so the packets are known and `writeFlash` sends
   them, behind the flag and behind a second named door for the first write. What is still unsettled
   is **the silicon half of pacing**: whether the USB peripheral can accept a second report before
   the first is serviced, which is the endpoint's buffer descriptor and its ownership bit, and which
   nothing here has read. The **firmware** half was answered by reading the same day, and the two
   halves must not be collapsed, which is what `reference/superseded.md` records and what this
   paragraph did by saying "one thing rather than two"<!--superseded--> until 29 August 2026. Erase
   before program is closed on both bench architectures since sections 186 and 191, and it was moot
   anyway for a caller that erases first.
9. **Logitech's own client is read alongside the firmware, not as a fallback.** *Taken 9 August 2026
   as a fallback, and reordered by Danny on 28 August 2026.* Before deriving anything about how a
   remote is driven, what a packet looks like or which call to make, **look in their code and in the
   image**. Neither is junior: the firmware is as important as the client and often more, and what
   the client offers is that it is cheap and legible, so it is the fastest way to find out whether an
   answer exists at all. The old wording made it a fallback
   admitted only "where the firmware genuinely cannot settle something"<!--superseded-->, which put
   the expensive work first by default; the measured cost of that ordering is sections 197, 200 and
   202. The client to read is **MyHarmony**, decompiled to C# in the lab, and not Harmony Desktop's
   web application.
   **The firmware is still the preferred evidence and still wins a disagreement**, because it says
   what the remote does where the client only says what one host believed, and where neither firmware
   nor hardware can answer the fact is marked as client-sourced wherever it appears. Where a lead
   comes from and what confirms it are two questions, and the old rule collapsed them. What travels is
   the mechanism: addresses, command numbers, field widths, the order of operations. What does not
   travel is expression: names, comments, code, structure. Everything here is implemented our own
   way from a description of the behaviour, never by transcribing theirs. The reason the balance
   moved is that discarding facts nobody can recover another way means remotes that stay
   unrepairable, and that cost is real where an unqualified clean room claim is a comfort. The
   basis is the interoperability exception in the Software Directive and article 45m of the Dutch
   Auteurswet, which permits obtaining the information and does not permit republishing the code,
   which is why the decompiled source stays in the private lab. **A licence change is not the
   lever**: copying unlicensed proprietary code infringes whatever licence the result carries, so
   MIT is not the obstacle and moving to GPL would not create a permission. The rule, the legal
   argument and the ledger of everything currently believed on the client's word alone are in
   `docs/host-client.md`.

10. **The application comes before a wider corpus.** *Taken 12 August 2026, and it reverses the
   posture the front page had carried.* No general call for dumps goes out, and the eight unseen models
   and the arch 10 firmware stop being wanted things. The reasoning is the shape of the cost rather than
   the value: broadening the corpus answers questions about hardware nobody here owns, each answer costs
   a firmware read or a bench session, and none of it is on the path to an application that works on the
   four remotes already here. The realistic alternative was several more months of analysis and still no
   FreeHarmony. **What replaces it**: the two people already contributing, who have both offered, are
   asked for a specific measurement when a specific question needs one, which is how sections 90, 101,
   122 and 123 were settled anyway. The contribution probe of step 8 stays built and stays unadvertised.
   **What this does not license** is loosening any rail, since the write target is still one spare
   Harmony One, or quietly narrowing a claim to the bench: a reading that only holds on arch 12 and arch
   14 still says so.

11. **Offline is the floor, Logitech's live service is an optional import, and provenance decides what
   may be shared.** *Taken 12 August 2026, and it is the first decision here about the
   product rather than about the format.* Three parts, in the order they constrain each other.

   **FreeHarmony works with no server and, ideally, with no network at all.** Not a preference: it is
   the entire reason the project exists, since Logitech's software needed a server for everything and
   then the server went. So nothing may become a runtime dependency on anything remote. No account is
   ever required, and a build with the network unplugged reads a remote, shows a config and edits it.

   **While Logitech's service is alive, taking its device data is worth doing, optionally and by the
   user's own hand.** Section 56 measured it answering and section 58 watched it compile a config for a
   device chosen that day, so the data is reachable **now** and will not be one day. The user decides,
   supplies their own credentials if it needs them, and sees what is fetched; the application must work
   identically for somebody who never touches it. What arrives is converted into **our** device
   definition format and stored locally, which is what makes it survive the service.

   **There are two routes to that data and the cheap one already exists.** Reading it out of a config
   Logitech compiled needs no new protocol work at all: base slot 5 is fully read on four
   architectures, so a synced remote can be read and its infrared records converted with today's code.
   The expensive route is a direct client against `svcs.myharmony.com`.

   **The reconnaissance on that second route is done, the same day, and it changes the picture.** This
   decision said nobody here had looked at what the service serves, which was true for an hour. It is
   mapped now, offline, out of the client already mirrored in the lab and with no request made to
   Logitech: fourteen services, 78 operations, JSON over HTTP rather than SOAP, and **the device
   database is its own call**, `deviceManager.SearchGlobalDevices` with `GetCommands` beside it and a
   REST form of the search on another service. So the expensive route is real rather than hypothetical.
   `docs/host-client.md` has the map and `tests/test_host_client.py` recomputes it.

   **One operation on that list is worth more to this repository than to the application**:
   `downloadManager.RemoteConfigurationInJson`, a configuration described in JSON by the people who
   wrote the format, for a remote whose bytes we already read to the last one. A vendor authored second
   view of the same object would confirm `docs/config-format.md` or name the field that is wrong, which
   is a stronger check than anything available here.

   **The requests were made on 13 August 2026, with authorisation and a throwaway account,
   and the route works end to end.** Section 132. What the paragraph above listed as unknown is
   measured now, and four things follow for this decision.

   The database needs **a plain Logitech login and nothing else**: no registered remote, no Harmony
   account record. That is what makes the import worth building, because the user it is for is the
   second hand buyer, and Harmony Desktop refuses to register a Harmony 525 at all. The chain is
   `SearchGlobalDevices` then `GetGlobalLanguageCommands`; `GetCommands` is a dead end that reads the
   caller's own devices.

   **The cost this decision was afraid of is not there, and section 152 is why.** It read: the expensive
   route acquired a cost nobody had priced, an infrared encoder, because Logitech stores a protocol name
   and a frame value and not pulses, so converting a catalogue device into our format means implementing
   the protocol families, of which six devices gave nine. What that missed is that **a stored record
   states its own timings**. Five durations read off any code of the same appliance rebuild a frame
   exactly, on 3502 of 3502 records in the corpus, and 52 of 58 device groups use one set of timings for
   every code they carry. So a command fetched from the catalogue is written using the timings a config
   already holds, and the nine families are nine names rather than nine encoders.

   **What is genuinely unpriced is everything after the frame.** A block repeats the frame and then goes
   quiet, and that tail is 140 distinct shapes across the corpus, with a per family rule for 29<!--fact:protocol_tails--> of the
   rhythm table's 37<!--fact:protocol_measured--> measured entries since section 171, plus 33<!--fact:protocol_tails_stated--> derived from Logitech's own
   statement of it since section 228, and none for the remaining 541, so it is emitted where there is a
   rule and copied
   from a record of the same appliance rather than computed. That is a smaller job and a different one:
   it needs a record to copy from, which means the catalogue import wants a configuration beside it
   rather than standing alone. **The cheap route** still reads base slot 5 out of a compiled config and
   needs neither, so it stays the first version, but no longer because the other one is expensive.

   `downloadManager.RemoteConfigurationInJson` **was called, and it is less than this decision hoped.**
   Discovery does not advertise the service; the URL comes back from a compile. What it returns is a ZIP
   holding a bare `GSPM` container and a manifest, so the vendor authored second view is the manifest
   rather than a described configuration. The manifest does corroborate the trailer checksum, seed and
   algorithm, from its author.

   **And the compile itself is the useful surprise.** It runs server side with the remote unplugged and
   hands back a file, so this project can have Logitech compile a configuration **to its own
   specification** and never write to hardware. Two of those exist, one per bench architecture, and they
   are the corpus's first known answer samples: three devices and two activities chosen in advance,
   read back correctly by four readers that had only ever been checked against configs found in the
   wild. `packages/codec/test/calibration.test.ts`.

   What is still unknown, and smaller than what was: which member of a regional skin pair a compile
   produces, section 131, and whether the protocol timings are reachable, since the endpoint that would
   plausibly carry them returns 502 on an account with content. The **value still decays**, so a
   measurement that is worth having is worth making now.

   **A community database is a direction now rather than an idea, and it has one hard rule**: a
   definition carries its **provenance**, and only a definition learned from hardware may be shared.
   Anything derived from Logitech's data stays on the machine that fetched it. That is the same
   copyright reasoning that keeps configs out of this repository, and the reason to record it before a
   line of the format is written: provenance has to be a field in the definition from the first
   version, because retrofitting it means auditing a database whose origins nobody kept.

12. **The lab is an archaeology site, and its knowledge is not knowledge until it is in this
   repository.** *Taken 28 August 2026, by Danny, after the fourth time a session discovered that
   something it was working out had already been established in the lab and written down there.*

   **The failure is structural, not carelessness.** Every rule this project has for keeping facts
   straight operates on the repository: `make facts` recomputes marked numbers and refuses dead
   phrasings, `reference/superseded.md` kills old wording, a finding needs a regression test, and
   the four places rule makes a fact land in all of them or none. The lab is **deliberately outside
   all of it**, because it holds unlicensed firmware, contributors' configs and Logitech's own
   client code, and that is the right decision for what may be published. The consequence is that a
   fact recorded only in a lab `META.md` is invisible to every check here, and no amount of care
   inside the repository can see it.

   Section 197 is the case that forced this. Logitech's own per model protocol specification was
   mirrored on 9 August 2026 and **read**: the lab notes beside it carry the architecture map, the
   vendor's codenames and the Harmony One's entire infrared learn session, which is section 91's
   open question. None of it crossed into a finding, a structured fact, a test or a line of code
   for nineteen days. The same notes file also stated, thirty lines above that description, that
   those files had not been fetched at all. One file, two paragraphs, contradicting each other,
   with nothing able to notice.

   **So the site gets excavated once, as a grid, and every find gets registered.** Not searched for
   what is wanted this week, which is exactly how a folder nobody had a reason to open stays shut:
   walked exhaustively, square by square, with each find recorded whether or not it is useful now.
   An artefact whose value is not yet apparent is the one most worth cataloguing, because the
   session that needs it will not know to go looking.

   **The register is the deliverable and it lives here, not there.** Names, provenance, what an
   artefact is, what has been extracted from it and what has not: our own text about what exists,
   so it is publishable, where the artefacts themselves never are. A find with no register row is
   the state this decision exists to forbid.

   **Afterwards it is per arrival.** Anything new in the lab gets its row in the session that puts
   it there, the same way a confirmed fact gets its four places.

13. **`docs/findings.md` stays one file.** Splitting it is the obvious idea at 27175 lines and it was
   measured and rejected on 8 August 2026, so do not re-derive this. It **costs no tokens**, because
   it is never loaded whole, only grepped and read in ranges; the per-session cost was `CLAUDE.md`
   and that has been cut. **No cutting line is better than another**: 140 references run between
   sections and both an era split and a subject split push about 40% of them across a file boundary,
   so the correction chains that give the document its value do not survive either. And it is **the
   one document that has never drifted**, because every section in it carries a regression test,
   where the eleven contradictions the audit found were all in summaries. What would reopen it is
   size alone, at roughly 8060 bytes a section over 209 sections: if it outgrows rendering, split by era, keep section
   numbers global, and keep the index at `docs/findings.md` so the 159 references that name that
   path stay correct.
14. **The vendor's data model moves into this repository whole.** *Taken by Danny on 30 August 2026,
   overruling a narrower reading of decision 9 that this assistant had raised.* The platform's schema,
   what an account holds and what every field is called, is recovered in `docs/myharmony/model.json`
   with `docs/myharmony/model.md` as its reading, and **it is to be consulted before naming a field or
   designing anything about devices, activities or remotes**, in this repository and in FreeHarmony
   both. The concern raised was decision 9's boundary, that Logitech's code stays in the lab. It does:
   what crosses is a **schema**, names of types and fields and the references between them, which is
   the same class of thing as a command byte or a length nibble, and decision 1 already records that
   such facts are not copyrightable expression. No source, no comment and no structure of theirs
   travels, the extractor stays in the lab, and `TheModelCarriesSchemaAndNoInstances` asserts that no
   instance, account or identifier came with it. The argument for moving it rather than citing it from
   the lab is decision 12's, in one sentence: a fact recorded only in the lab is invisible to every
   check this project has, and this one is too useful to leave there. Section 218.

15. **A third party's archive of Logitech's device database is a source, on the same footing as the
   live service.** *Taken by Danny on 31 August 2026, after Eric Schewe wrote to say he had archived
   it and concordance pointed him here.* It is checked out as a sibling,
   `../logitech-harmony-ir-archive`, and it holds 276236 devices from 7889 manufacturers, 257720 of
   them with codes, and **Logitech's own protocol definitions for 685 families, verbatim**, down to
   the internal type marker their software stamps on them. The keycode strings are character for
   character what `GetGlobalLanguageCommands` returns on the live service.

   **It was tested before it was believed, per decision 7.** We hold measured rhythms for 37 families,
   35 of them read off Logitech's own compiler by having their service build configurations to our
   specification, so this project could check the archive rather than admire it. **33 of 33 fully
   comparable families agree on every field compared**: carrier, lead mark and gap, both bit
   durations, the unit pulse and the frame length. Two more agree on carrier where our shape is a quad
   or long toggle form the comparison does not model. The three that disagree are **ours**, and they
   are exactly the three we fitted to the corpus instead of measuring off the compiler.

   **What crosses into this repository is durations and names in our own schema, through our own
   converter.** Not his JSON, not his 13.3 million rendered waveforms, and not the 685 definition
   files. Decision 1 is the basis and it already covers our existing 37: protocol facts are not
   copyrightable expression. The **selection and arrangement** of a database is a different thing from
   a duration, so bulk vendoring is refused and is also unnecessary, since the archive is a sibling
   checkout that anybody can clone.

   **His own position is worth recording**, since it is the reason this needed a decision at all: he
   releases his conversions and schema under CC0 and says outright that the underlying codes and
   definitions originate with Logitech and that he makes no representation about their copyright
   status. So the archive does not launder anything, and our position rests on decision 1 rather than
   on his licence.

   **Every entry taken from it enters marked, and this is the load bearing part.** Our corpus cannot
   verify the other 648 families: it holds 3017 infrared codes and every one belongs to the 37 we
   already have. So a converted entry arrives as **stated by Logitech and unverified**, with its
   exact and spread counts at zero, beside the 35 we can stand behind, and any family that matters is
   upgraded to measured later by the route that produced those 35. The check that **is** free is our
   conversion against his own rendered waveforms, which tests our reading of his format rather than
   the definition's truth, over millions of commands instead of 37 families.

   **It interacts with decision 11 and the interaction is a refusal.** That decision's hard rule is
   that only a device definition **learned from hardware** may ever be shared, and nothing out of this
   archive is. So an archive sourced definition is usable locally and is **never** uploadable to a
   community database, and its provenance field has to say so from the first version rather than being
   audited in later. Without this paragraph the archive would quietly contaminate the shareable pool,
   which is the exact failure decision 11 exists to prevent.

Scope is the Harmony One (arch 12) and the Harmony 600 (arch 14), the remotes on the bench, with
the 700 2.8 image as the arch 14 reference. **Arch 9 is a target**: the Harmony 525 arrived on 8
August 2026, its config and its firmware are in the lab, and `docs/memory-map-525.md` records what
was predicted before it was connected against what it measured. **It will not get a known answer sample**,
sections 135 and 136: the live service accepts a skin 22 remote record and names it a Harmony 525, so
Harmony Desktop's refusal to see one is the client's, but the compile is accepted and then ends in a bare
`status='Error'`. **The reason is confirmed and it is a policy field**, section 145: a stated per product
`IsEnabled` flag, false for skin 22, whose true set is exactly the client's own supported list, 19 skins
of 120 with no exception in either direction. The earlier reading added "minus the two hubs"<!--superseded-->,
which was an artefact of comparing 27 records against 19 skins rather than skins against skins. **And no other model can be
tried**, because `ValidateRemote` refuses a synthetic serial, so registering a remote nobody here owns is
not possible: an 880 or an 890 needs the hardware, and the contributed dumps carry no serial. Other models are iterated on later.

**Arch 8 has firmware now and is still not a target**, sections 113, 114 and 116: two application
images of one build, an 880 and an 885, contributed on 10 August 2026, plus **two bootloaders**, plus
eleven configs and an arch 8 safe mode container found inside the application firmware itself. The
bootloaders carry the reset vector and hand both interrupt vectors to the application, so arch 8 is
the only architecture here whose whole program flash is accounted for. It stays a control for container claims, and what the
images bought is a **counterexample supply**: they broke the skin rule, they gave `GET_VERSION` field 6
its fourth value, and they showed that "whatever in the lab table parses as a container" is not a
corpus. Reach for them when a claim holds on every architecture here, because a claim that nothing can
contradict is the failure mode this file warns about throughout.

**Arch 10 has a known answer now and still nothing reads it**, sections 115, 117 and 178. A Harmony
895 arrived on 26 August 2026 with its contents stated by its owner, six devices, which is the
calibration case the slot mapping search never had. It **refutes** the insertion model, though **not for the reason section 178 gave**, sections 181
and 182: that argument needed the Harmony 895's base slot 5 to hold six entries because its owner
states six devices, and the 895 turns out to have **no infrared records at all**, so the premise fails.
The real reason is that arch 10 carries **nineteen** base slots and four insertions rather than twenty
and three, because **base slot 0 is absent**: raw slot 0 holds the architecture record, `0a 0a` plus
the skin, so **an arch 10 config does state its architecture and it is 10**, skin 19 for a Harmony 890
and 23 for a Harmony 895. Seven base slots are anchored by content, base 1 to raw 0, 3 to 4, 5 to 6,
7 to 10, 17 to 20 and 18 and 19 to the trailing NULLs, and **the mapping is determined since section 183**
and corrected in section 184: fifteen base slots are present, five are absent and eight raw slots are
not base slots at all, per the paragraph below. The anchor that closed it is base slot 10's **packing closure**, that consecutive table entries
sit `1 + 3 * count` apart with the addresses coming from the table and the counts from the lists: on both
arch 10 containers exactly one slot scores like arch 8's, raw 12, with the same four breaks, where every
other array scores near zero. That forced base slot 9 onto raw 11, twelve tagged lists and 323 bindings
against the Harmony 880's twelve and 322, and left base slot 8 nowhere to go. **Section 182's own
arithmetic was wrong about five slots** and the lesson is the instrument: it assumed a shape for the
difference, insertions only, and one free parameter against seven constraints looked conclusive and was
not. **The mapping is adopted since section 184**, on Danny's call of 26 August 2026, and the two objections
it waited on were both settled: `SLOT_MAPS` is a table per architecture now, so a base slot can be
**absent**, with the four insertion architectures still derived from `INSERTED_SLOTS` so their alignment
is stated once. `archSlot` **throws** for an absent base slot rather than returning a number, which is
the section 178 rail relocated rather than removed, since a number would hand a reader the neighbouring
section. `INSERTED_SLOTS` still gets no arch 10 entry and never will.

**Switching it on corrected the mapping it adopted, and the four rows placed by order were the risk in
exactly the way section 183 named**: base slots 4 and 6 confirmed on content, base slots **13 and 14
refuted and absent**. So the standing figures are **fifteen** base slots present, **five** absent, 0, 2,
8, 13 and 14, and **eight** raw slots that are not base slots. Base slot 13's refutation is the strong
one, because section 130 gives it the best closure in the container: its first seven records hold the
build timestamp's own fields, and no run of pointers in either payload has targets carrying those seven
values, at any field offset and either width, where an arch 8 container hits exactly once. **The lesson
is section 183's own sentence turned around**: a slot with only one home under a monotone mapping is not
thereby a slot that is there, and the argument that placed four rows equally permitted the two absences.
What separated 4 and 6 from 13 and 14 was reading the bytes.

**What it bought**: the screens, the button bindings, the mode pages, the action lists with arch 8's
exact packing signature of four breaks, and the **drawn text**, 5634 of 5634 glyphs on the Harmony 890
and 6486 of 6490 on the Harmony 895, which name the same four activities and four appliances as the
arch 8 Harmony 880 from the same household. **What it did not buy is the device names and the activity
count**, and that is structural rather than pending: both routes need base slot 0's name tree, which
arch 10 has no slot for, or base slot 13's transitions, which is the slot just refuted.

**The byte accounting sits at 99.3% and 97.2% with zero overlaps**, where the corpus is at 100%. Section
185 read the biggest remaining family, 18 runs of 111 bytes and 21, and they were **mode page screen
programs** blocked by one table entry: screen opcode 22 is the one opcode whose operand width is per
architecture and arch 10 had none, so 49 and 34 programs were abandoned unread along with a fifth of the
drawn text. **The instrument is the thing to carry from it, not the width**: measured off the coverage
percentage, width 2 gives the Harmony 895 a clean 100.00% and is wrong, because a program read short
overruns and claims what follows, 308344 bytes of overlap. Measured per program, asking whether a decode
lands exactly on the run's own end, width 3 gets 49 of 49 and 34 of 34 and the others get 0 and 1. A
percentage is a sum, and a sum cannot be falsified by one term being wrong in the generous direction.
What is left is runs with no family, the largest a single 7187 bytes on the Harmony 895, plus the eight
raw slots that are no base slot, of which three are the same size on both containers and therefore
fixed structures.

**The unprompted confirmation is the best evidence the mapping is right**, and nothing was looking for
it: with the clock routed through the map, three of one contributor's configurations, two remotes and
two architectures, were built inside fifteen minutes of one afternoon, the Harmony 880 at 21:25:34 and
the two Harmony 890 reads at 21:37:44 and 21:40:26. The arch 8 date was already believed and the arch 10
ones come out of a slot the arch 8 map does not use. What does read on arch 10 without any mapping at
all is everything the header
or the marker locates rather than a pointer slot: the framing, the checksum, the base anchor, the
key table, which is how section 177 matched a hand probed circuit board without any mapping at all,
and since sections 179, 180 and 181 the **picture bank**, the **font sets** and the **infrared
records**. Those two were section
178's own prediction and it paid off the same day: the bank is found from the trailer's position alone,
so a Harmony 890 and a Harmony 895 now state their display, **128 by 160**, the same as a Harmony 885,
with the same ten distinct picture sizes where a Harmony 600 and a Harmony One share none of them; and
their eight font sets are found by requiring every pointer to decode into a glyph that tiles exactly,
which names 213 of 237 glyph shapes against the arch 8 alphabet and **0** against the Harmony One's.
A Harmony 890's whole
infrared database reads, 300 codes with every duration block decoding, and a Harmony 895 turns out to
have **none**, which is proven rather than unfound. **The common mechanism is the thing to reach for,
not the four results**: a structure that refuses to decode when misread can be located by trying every
offset, so it needs no pointer slot, and a record is the cleanest case because it **states its own
address**. The shape filter around a hit is not optional: an ascending pointer table crosses the self
pointer line dozens of times, which is the misaligned ascending table pitfall again, and 198 such hits
in the Harmony 895 look exactly like a result. It is also
**not** progress towards the mapping, and the alphabet was not the words either, since a string's address
comes out of a screen program: that stood until the mapping was switched on and it is dead now, per the
paragraph above. Section 179's own next step was **wrong** and
measuring it cost nothing: the font table is not at the bank's lower edge, it is 1918 to 48385 bytes
below it.
The earlier state of this entry, and the two Harmony 890 samples it describes: two Harmony 890
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

    *Moved here from `CLAUDE.md` on 29 August 2026, where thirteen thousand characters
    of it sat in every session to argue a question that arises once a year. It is the plan
    of record that holds decisions, and this is one.*

