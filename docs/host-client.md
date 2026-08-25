# Logitech's own host software as a source

Logitech's classic desktop application, the one the Harmony One shipped with, survives and is
not obfuscated, so it can be read as ordinary source with real class and field names. It is the
software that actually drove these remotes for a decade. Where this project has to infer, that
code can be read.

It is also unlicensed proprietary code, so how it may be used needs stating rather than
assuming. This document is the rule and the ledger: what the rule is, why it is what it is, and
every fact currently believed on the client's word alone.

## Why the rule changed

This project derives the USB protocol clean room from the firmware, deliberately, and that
decision stands as the **default**. It is not being abandoned. Firmware evidence is better
evidence: it says what the remote does, where the client only says what one host believed.
Section 20's off by one lived in two independent parsers for months because both had copied the
same wrong convention from each other.

What changed on 9 August 2026 is the handling of the case where the firmware **cannot** settle
something. The old rule said the client is never a source of record, full stop. Applied
honestly that rule discards facts nobody can recover any other way, and the cost of discarding
them is not abstract: it is remotes that stay unrepairable and get thrown away. That was
weighed against the value of an unqualified clean room claim, and the remotes won.

**The interoperability case is the substantive one, not the licence.** The right to decompile a
program in order to make an independent program work with it is written into European law, in
the Software Directive and in article 45m of the Dutch Auteurswet, and it does not depend on
what licence this repository carries. It permits obtaining the information. It does not permit
republishing the decompiled code, and it does not cover copying expression. So the rule below
is shaped by what that permission actually covers, which is narrower than "we may use it" and
wider than "we may not look".

Changing this repository's licence would not help here and is not the lever it looks like.
Copying from unlicensed proprietary code is an infringement whatever licence the result carries;
MIT is not the obstacle. See `docs/roadmap.md` decision 1 for what the licence question is
actually about, which is libconcord and harmony-decompiler.

## The rule

1. **Firmware first, always.** The client says where to look. If the firmware can answer, the
   firmware answers and the write-up cites the firmware address.
2. **A client-sourced fact is marked as one**, here and wherever it is used, in those words. It
   does not enter `docs/config-format.md` as confirmed and it does not get a regression test
   that asserts it as true. A test may assert that our corpus is consistent with it, which is a
   different claim.
3. **Expression does not travel.** No identifier, no comment, no code, no structure. An address
   is a fact about the hardware; the name Logitech gave it is their writing. Everything below is
   restated in this project's own words for that reason, and the verbatim extraction stays in
   the private lab.
4. **The decompiled source is never published or quoted**, in this repository or anywhere else.
   That is the same rule the lab has always had, and it is also the condition the
   interoperability exception comes with.
5. **A confirmed lead moves out of this document** into the normal places, with the firmware as
   its citation and a line saying the lead came from here. The ledger below should shrink.

## Why the client is not an authority, demonstrated

Its own container constants for arch 8 do not describe any arch 8 config in this corpus. It
declares 20 pointer slots and a trailer at offset 91. Four real arch 8 configs put the marker at
95, which is `0x0B + 4 * 21`, so they carry 21 slots.

This is not a misreading of its convention, because the same convention reproduces arch 9 and
arch 12 exactly. It is the client being wrong, or describing a variant nobody here has, and
either way it is the reason rule 1 exists.

## What it confirms that we already derived

None of this is new knowledge and none of it changes a document. It is recorded because a
confirmation from an independent implementation is worth having, and because it calibrates how
far the rest can be trusted.

| what this project derived | the client agrees |
|---|---|
| the pointer table starts at `0x0B`, an item is 4 bytes and an address 3, section 20 | its three constants are 11, 4 and 3 |
| the marker sits at `0x0B + 4 * N` | its trailer offsets are 91 on arch 9 and 99 on arch 12 |
| 22 pointer slots on arch 12, 20 on arch 9 and 14 | the same three numbers |
| the arch 12 user config is at `0x040000` | the same |
| the arch 12 log area writer refuses outside `[0x040000, 0x400000)`, section 47 | it declares the user config region as exactly that range |
| the arch 12 safe mode container is at flash `0x002000` | the same |
| the arch 14 user config is at `0x030000` | the same |
| the arch 14 safe mode image is at internal `0x1000`, not where the file named `-safe.bin` suggested | the same |
| internal memory is two 64 KiB pages, `0xFE` and `0xFF`, so 128 KiB is reachable | it declares one `0xFE0000` region of `0x20000` |
| base slot 3 is the clock, section 21 | its section index 3 is named for the clock |

## Published user manuals are a third source, and a much easier one

Added 9 August 2026. Logitech's user manuals are documentation written for owners and distributed
freely, and several are still online. They are neither firmware nor decompiled code, so **none of
the rules above applies to them**: quoting a sentence of a manual is ordinary citation, and there is
no expression problem and no interoperability exception to lean on because none is needed.

They are weak on mechanism and strong on intent, which is the opposite of the firmware. The manual
does not say what a packet looks like; it says what the system was for, and that turns out to settle
questions the bytes cannot. The one that paid: the Harmony 880 manual states that a learned infrared
signal is uploaded to Logitech's web site, that **the web site** looks for a matching pattern, and
that a match is converted to a compact form while a miss is stored in its original format. That is
why three of the four infrared encoding classes appear in no config in this corpus, section 42, and
no amount of firmware reading would have said so.

Worth checking a manual before assuming a behaviour is undocumented. `reference/models.md` lists the
forty retired models, and the manuals are indexed under Logitech's support assets.

## Harmony Desktop is a fourth source, and the richest one

Added 9 August 2026, and it is a **different application** from the MyHarmony client the section
near the end of this document reports as empty. That one is the Silverlight era. This one is
`Harmony Desktop.app`, built January 2022, and it is the application used here on 7 August
2026 to program a Harmony One, so it demonstrably still drives an arch 12 remote.

**Its native half knows nothing.** The application binary is 141 KB and the two C++ frameworks
beside it are a transport: a HID channel with a read and a write, a command object that holds
outgoing packets, an expected packet count and a timeout, and a device record of vendor id, product
id, version, report lengths and skin. There is no command name, no opcode, no config structure and
no infrared symbol in any of it. That is a fact about the architecture rather than a jab: the
intelligence is deliberately elsewhere.

**Elsewhere is a hosted web application**, named by the bundle's own setup URL, and it is **data
driven on top of that**. The packet layout for a given remote is not compiled into anything. It is
one file per operation per model, served from Logitech's content network, and the client's own
cache manifest enumerates all of them. Twenty three models, twenty three operations each, and
three of the models are architectures this project works on: arch 12's Harmony One, arch 14 under
an internal codename, and an arch 9 remote.

**The rules above apply unchanged.** The files are Logitech's expression, they stay in the private
lab, nothing is quoted here, and every fact taken from them is marked client sourced and enters the
ledger below rather than `docs/config-format.md`. What makes this source better than the decompiled
client is only that it is **legible**: a packet is stated as a packet rather than reconstructed from
disassembly, so the cost of checking a claim against the firmware drops rather than the standard
for believing one.

**It is live, and that is the reason it was mirrored the same day it was found.** Everything the
manifest lists is in the lab now, with provenance and a hash. The service could be withdrawn at any
time, which is the same argument the write rails rest on.

## The service API, which is a different surface and answers a product question

Added 12 August 2026. Everything above mines this client for the **USB** layer: what a packet looks
like, what an operation sends to a remote. This section is the other half, the **service** the client
talks to, and it was never looked at until a product decision needed it. Decision 11 in
`docs/roadmap.md` says FreeHarmony works offline and may optionally take Logitech's device data while
that service is alive. The question that decision left open was whether the device database is its own
call or only a side effect of compiling a config. **It is its own call.**

Extracted from the mirrored client, offline, with no request made to Logitech and no account involved.
`tests/test_host_client.py` recomputes every figure below, so this is a list nobody has to trust.

**Fourteen services and 78 operations.** 75 are declared through the client's own service SDK, and
three more are built by hand, which is why the surface is "at least this" rather than "exactly this".

| service | operations | what it is for, from the names alone |
|---|---|---|
| `userAccountDirector` | 18 | the account's products, activity roles and recommendations, plus a REST device search |
| `userButtonMappingManager` | 13 | button to command mappings, per device mode, with save and reset |
| `accountManager` | 10 | household, password, ratings |
| `deviceManager` | 10 | **the device database**, see below |
| `security` | 8 | login, tokens, impersonation |
| `remoteManager` | 6 | a remote's properties, pairings, sync status |
| `userFeatureManager` | 3 | user features, and copying them from a global device |
| `deletionManager` | 2 | delete devices, delete activities |
| `productsManager` | 2 | a product and its button list |
| `compileManager` | 1 | whether a remote needs syncing |
| `downloadManager` | 1 | **the configuration, in JSON** |
| `infraredAnalysisManager` | 1 | analyse infrared, which is the learning service |
| `easyZapperManager` | 0 | bound but declares nothing: its calls are the hand built ones |
| `softwareUpdateService` | 0 | the same |

**The device database is `deviceManager`**, and six of its operations are the ones that matter:
`SearchGlobalDevices`, `GetCommands`, `GetGlobalLanguageCommands`,
`GetAllTeachingCommandsForGivenPowerAndInputTypes` and, found on 23 August 2026 and missing from this
list until then, `DetectLanguage` and `DetectLanguageForMultiCodeDevice`, which are the two that turn a
button press on somebody's original remote into an appliance. They have their own section below, and the
reason they were missed is worth saying: this table was built from the **discovery document**, and those
two are declared by the client rather than advertised, exactly like `RemoteConfigurationInJson`. `userAccountDirector` carries
`SimpleRestSearchGlobalDevices` as well, whose name says it is the plain REST form of the search, and
`userFeatureManager` has `CopyFeaturesFromGlobalDevice`. So a device can be searched for and its
commands fetched without going anywhere near a config, a remote or a compile.

**The transport is JSON over HTTP, not SOAP.** The endpoints are `.svc`, which means WCF and implies an
envelope to anyone who has met it, and the client uses `json/` and `json2/` path variants and contains
the string `soap` exactly zero times. That halves what a client would cost: a body and a URL, no WSDL
and no generator.

**`downloadManager.RemoteConfigurationInJson` is the prize for this repository rather than for the
application.** A configuration, described in JSON, by the people who wrote the format, for a remote
whose bytes this project already reads to the last one. That is a vendor authored second view of the
same object, which is the strongest kind of cross check there is, and it would either confirm the
readings in `docs/config-format.md` or name the field that is wrong. It needs an account and a
registered remote, so it is not free, and it is the single most valuable call on this list.

**What this does not establish, which was most of it.** No call in the list above had been made by
this project when the list was written, and everything below the next heading is measured now.
The client also names development and integration hosts and carries several API keys in plain text,
which stay in the lab and are deliberately not extracted; nothing measured here needed one.

### The same surface, measured, 13 August 2026

Section 132, and it moves most of this section from a reading of a client to a measurement of a live
service. Three corrections and one addition, all of which the paragraphs above got wrong or could not
know.

**The surface is four times bigger than this client's.** `Discovery/GetJsonOperations` answers without
a login and advertises **308 operations over 50 services** where the client declares 78 over 14. Five
of the extra services, `LIPService`, `CloudApi`, `AWSServices`, `ContentService` and a `TimeServer`,
this client never mentions. So the extraction above is a lower bound on Logitech's platform and an
accurate description of one client.

**`downloadManager` is not in Discovery at all**, which is why the paragraph above calling
`RemoteConfigurationInJson` the prize needed a correction rather than a confirmation. Its URL is not
published: `CompileManager/StartCompileWithLocaleAndSettings` returns a `DownloadUrl` per compilation
and the client rewrites that URL into the JSON variant. **The call exists and it was made.** What comes
back is a ZIP holding a manifest and a bare `GSPM` container, so the JSON name describes the transport
rather than the payload, and the vendor authored second view this section hoped for is the manifest:
`Description.xml`, which states the trailer checksum with its seed and its algorithm and names the
intended skin. That is corroboration of section 41 by its author, and it is less than a JSON
description of every field would have been.

**It needs no registered remote to reach the database, and no account record either.** The paragraph
above guessed that the search might be public and the account scoped calls certainly not. Both halves
are wrong in the interesting direction: the search is **not** public, and the gate is a plain Logitech
login with `AccountId: 0` and no household. A compile does need a remote on the account, and it does
**not** need one plugged in.

**The device data is symbolic**, which no reading of the client would have shown, and it is the one
measured fact here with a cost attached. `GetGlobalLanguageCommands` returns a protocol name and a frame
value per command, `Raw` null on all 419 fetched, so the infrared blocks in base slot 5 are the compiled
form. This concluded that "an importer needs **an encoder per protocol family**"<!--superseded-->, and
section 152 refutes it: a stored record states its own timings, so a frame is rebuilt exactly from five
durations taken off any code of the same appliance, and 52 of 58 device groups in the corpus carry one
set of timings for every code they hold. Section 132 has the numbers for the catalogue itself.

**And the frame value is directly comparable with one this project decodes, which is worth more than the
encoder would have been.** Measured on 22 August 2026: 52 of the 58 commands Logitech states for a
Panasonic television equal a frame `irframe.ts` read out of `h600_config`, byte for byte, on a different
model of the same family. So the catalogue names a code a remote already holds without anything being
encoded at all, which is the whole of what an importer needed for names. The encoder is still what a
**new** device would need, and that is a smaller claim than this document used to make.

**And the button mapping service says more than its name suggested.** The paragraph below is still
right that no operation promises a scan code. But an account's own button maps split
`HardRemoteButton` from `SoftRemoteButton` and carry a **name** on each, which is the same two disjoint
populations section 128 derived from the container, and a compiled config binds a scan code to a list
that sends a named command. So the pair gives a read only route from a scan code to a button name, which
this document had ruled out on the strength of the operation names alone. Unexplored, and section 132
records it as the largest thing left on the table.

**And a name is not a finding, which is the trap this section could have walked into.**
`GetRootButtonMap` and `GetDeviceModeButtonMaps` read exactly like the physical button map that
`CLAUDE.md` lists as open. They are not it. They sit in the user's button **mapping** service beside
`SaveButtonMaps` and `RestoreToDefaultButtonMaps`, so they map a named button to a command, which is
what section 48 derived from the firmware and what this document already says: a host names buttons and
the firmware resolves the name. No operation anywhere in the surface mentions a scan code, a matrix or a
keypad, and the test asserts that too.

### The button maps were read, on 23 August 2026, and a favourite channel is a button

The paragraph above calls an account's own button maps unexplored and the largest thing left on the
table. They were read, for one purpose: base slot 16, the number sender, is the one section of the config
format read entirely out of firmware and exercised by no file, so a config that populates it had to be
manufactured. Danny created three favourite channels on a Harmony One for a television, `Chan1`, `Chan100`
and `Chan666`. This is what the account states about them, with nothing compiled and nothing synced.

**A favourite channel is not a structure of its own.** It is a `SoftRemoteButton` on the television's own
`DeviceButtonMap`, whose `ButtonAction` is a `ButtonChannelAction` carrying a `ChannelNumber` and naming
the device, and whose `MenuItem` puts it at a position on a menu called `FavoriteChannels`. The label is
`TextOnRemote`. Three buttons, positions 0, 1 and 2, all three naming the same device. The other two
remotes on the same account carry none, so the feature is per remote rather than per household, and the
television's map holds 77 buttons of which these three are the addition.

**The channel is text and not a number**, `"1"`, `"100"`, `"666"`. So a leading zero can be authored, and
whatever pads a short channel in the compiled form cannot be a per record field, because two channels of
one television would want different padding.

**There is a before and an after, and the control is the two devices that did not move.** The same
account's button maps were captured on 13 August 2026, through a different operation, ten days before the
channels existed. The television went from 74 buttons to 77 and the three extra ones are exactly the three
on the `FavoriteChannels` menu, its other 41 soft buttons and 33 hard ones being unchanged in count. Two
different calls could simply count differently, which is why the other two devices matter: they come back
at 77 and 52 in both reads. And **only the edited device has a saved map**. Before, all three were
defaults named by a string; after, the television's is a stored map with a number and the other two are
still defaults. So authoring one channel persists that device's entire button map.

**The request shape is the part worth writing down**, because two spellings of it are refused with no
usable reason. `UserButtonMappingManager/GetButtonMaps` takes `deviceIds` and `activityIds` as **lists**
of `{__type: 'DeviceId:#Logitech.Harmony.Services.Common.Contracts.Data', Value, IsPersisted}`, plus
`remoteSkinId`, `accountId` wrapped as `{Value}`, and a bare `surfaceId`. A **surface** is not a remote:
the household reply carries a `Surfaces` array whose entries pair a surface id with a `RemoteId` and a
`SkinId`, and the button maps are asked for by surface. Sending a `remoteId` instead answers 400 with
`ThrowArgumentNullException`, and `UserAccountDirector/GetButtonMaps` answers 400 with
`AuthorizeActionOnAccount`, neither of which says what is missing.

**Which call serves a remote's favourites is a product decision of theirs, and the One is on the old
side of it.** The client gates the flow on a list holding the Harmony One, the 600, the 650, the 665 and
the 700, and calls that branch by an internal codename; every later remote reads its channels through
`GetDeviceModeButtonMaps` instead, whose request wants `deviceIds` as a list as well. So a reader written
against the newer call would find nothing on a Harmony One and report that the account holds no channels.

**An appliance record carries options their client asks the user about, and one of them was noticed from
the outside.** On 24 August 2026, adding a `Thomson 14MG115` in their client, Danny was asked whether he
uses it with a SCART cable, and the account's own appliance records carry `IsScartCableSupported` beside
`IsMultiCode`, `IsKeyboardAssociated`, `IsInterKeyDelayOptimized` and `Characterization`. The catalogue's
command list for that appliance carries `InputScart1` and its neighbours, so the plausible reading is that
the answer decides which input command an activity uses. **That reading is not tested**: nothing here has
compiled the same appliance both ways, which is the cheap experiment that would settle it, and until then
it is one of this document's hypotheses rather than a fact.

Two reasons it matters beyond curiosity. It is a per appliance **question** rather than a per appliance
measurement, so an importer that fetches a definition from their catalogue has nowhere to put the answer
and no way to know it was asked; and it is evidence that a catalogue appliance is not a closed object,
which is the assumption an import would otherwise make. `docs/adding-a-device.md` phase 4 carries the
consequence.

## The browser sign in is decaying while the JSON service is not, observed 25 August 2026

MyHarmony, the MartiniWeb client at `setup.myharmony.com`, refused to sign any of three accounts in,
identically, on a rebooted machine. The captured request shows why: the client signs in through
Logitech's central SSO, `id.logi.com` posting to `accounts.logi.com/websso/signin`, and the JSON body it
sends carries `"channel_id": "channel_id"`, a literal placeholder where a value belongs. The answer is a
bare `400 Bad Request`, so the refusal happens before any credential is checked, which is what makes
every account fail the same way. The same hour, `LoginUser` on `svcs.myharmony.com` accepted one of
those accounts and returned its household, twice.

Two consequences worth the paragraph. Everything this project does speaks the JSON route and is
unaffected; what the breakage removes, for as long as it lasts, is the **hand** route of adding
appliances in their client. And an importer in FreeHarmony should speak `LoginUser` directly and never
the browser SSO, because the SSO front end is the half already rotting. The shelf life argument this
document and decision 11 lean on is now an observed event with a date rather than a prediction.

## The ledger: believed on the client's word alone

Everything in this section is **unconfirmed**. It is a shopping list for firmware work, in
roughly the order it is worth doing.

### A config is invalidated before it is written

The write sequence is a `WRITE_MISC` with selector 2 and no arguments, then the flash write.
Selector 2 is already known to be serviced on arch 14, `docs/usb-protocol.md`, and has no
reading. Selector 11 does the same thing for the embedded config.

So the remote is not erased before a write, it is marked invalid, and a half written config is
never executed because the mark is still set. A separate constant set names six firmware update
states including one for invalid and one for interrupted, which suggests the mark is a state
value rather than a flag.

**This is the highest value item in the document.** It is the missing rail for any future write
path, and it is cheap to confirm: read what selector 2's body at the selector chain writes.

### There is no factory reset

Command `0xE0` carries four sub-command codes. The client sends three of them and all three
live in its diagnostics layer, not in anything a user reaches: one resets the USB interface, one
resets the remote, and one invalidates a test firmware image. A fourth method exists for
clearing test flags and its body is empty.

This project reads codes 1, 2, 3 and 5 as serviced by the arch 14 firmware,
`docs/findings.md` section 19, and the two lists agree on 1 and 2 and disagree on the rest. So
the correspondence between the code and what it does is open, and the honest statement is only
the negative one: **no path in the vendor's own software returns a remote to a factory state.**
The nearest thing is invalidate and overwrite.

### Base slot 2's region is a timestamped event log the host reads back

Section 47 read base slot 2 as three numbers reserving a region of flash that the firmware
appends to and never erases, and identified what appends: ten call sites on one operand ladder.
What it could not say is what an entry means. The client says, and its reading of the reserving
record is identical to section 47's, stride of 8 included, which section 47 derived from
arithmetic across nineteen containers with no code at all.

An entry is eight bytes, and the byte at `+0x07` says how many are used:

| `+0x07` | layout |
|---|---|
| 5 | `u8 type; u8 index; u24 ticks` |
| 7 | `u16 type; u16 index; u24 ticks` |
| 255 | erased |
| anything else | present, and not parsed |

`ticks` is **signed 24 bit seconds relative to the config's build date**, which is base slot 3.
That ties two sections together that nothing here had connected: slot 3 is the epoch for slot 2's
journal. The host stops reading after more than three consecutive erased entries, which is the
mirror of the firmware's own scan for the last byte that is not `0xFF`.

**This layout is arch 7, 8 and 9 only.** On arch 12 and 14 the client reads the region in raw 256
byte blocks and does not parse it, so it does not know those architectures' layout either, and
neither do we. On arch 12 it does not read the region at all unless a hardware flag is set, which
it asks for with read selector 12.

Worth confirming from the firmware because it is the one part of a config that records what the
owner actually did with the remote, and because an application that offers to show it should be
sure what it is showing.

### Arch 14 keeps per model settings in internal program memory

A run of twelve 64 byte records above the application firmware, at `0x01F400` and every `0x40`
after it, ending at `0x01F640`, followed by a 1024 byte block at `0x01F800`. What the client
believes each holds, restated:

| address | what it holds |
|---|---|
| `0x01F400` | the unit's serial identifier |
| `0x01F440` | key timing |
| `0x01F480` | infrared capture silence timing |
| `0x01F4C0` | unit settings |
| `0x01F500` | keypad settings |
| `0x01F540` | display settings |
| `0x01F580` | battery calibration |
| `0x01F5C0` | power settings |
| `0x01F600` | other settings |
| `0x01F640` | a manufacturing identifier |
| `0x01F800` | test flags, 1024 bytes |

The first address is also declared as the start of a 1024 byte system parameter block, so the
twelve records are probably subdivisions of one block rather than twelve unrelated ones.

**This was read as the answer to a question already asked here**, which settings a remote has that
its config does not carry, and **the answer turns out to be none**, section 150. Six of the seven
settings records are erased flash on all three bench remotes: key timing, infrared capture silence,
unit, keypad, display and other settings have never been written. Only `power settings` holds
anything, one byte, 94, on the two Harmony Ones and not on the Harmony 600, and that is the value
section 105 read at `0x01F5C0` and could not attribute.

It said "confirming it needs a remote rather than a disassembler", and it needed **neither**: the<!--superseded-->
internal pages of every bench remote were read over USB months ago and verified against their
backups, so the bytes were already in the lab. `tests/test_unit_settings.py`. The record names stay
here as client sourced labels, since a name is what the client gave and the emptiness is what we
measured.

Arch 12 has the same idea at different addresses: an identifier block at `0xFFF400` and a
manufacturing identifier at `0xFFF640`, both 64 bytes, with a 1024 byte granularity stated for
the first.

### Arch 12 has regions this project has never named

| address | size | what the client calls it, restated |
|---|---|---|
| `0xFE0000` | `0x1000` | the bootstrap, which matches what section 59 found there |
| `0xFE1000` | `0xF000` | the safe mode image |
| `0xFF0000` | `0x4000` | a programmable logic device image |
| `0xFFE000` | `0x1000` | a support library |
| `0x3D0000` | `0x20000` | the stored application firmware |

Two of these settle open questions if they hold. `docs/findings.md` calls the image at `0xFF`
plus `0xE000` "a library or support image, distinct from the bootstrap at zero", which is
exactly what the client calls it. And a programmable logic device on arch 12 is new information
about the hardware, not just the memory map: nothing in this project had suggested the One
carries one.

The last row is the awkward one. `0x3D0000` sits inside the `[0x040000, 0x400000)` region the
same class declares as user configuration, so the usable config region must stop below it. A
writer that trusted the declared range would run into the stored firmware.

### The arch 9 map disagrees with our measurements

The client places the safe mode image at `0x800000`, the application firmware at `0x810000` and
a 32 KiB embedded config at `0x820000`, and states no user configuration base at all.

This project measured a Harmony 525 answering at `0x800000`, `0x810000`, `0x820000` and
`0x870000`, section 76, read the user config at `0x820000` and found the safe mode container at
`0x818000`, inside what the client calls application firmware.

One of the two is wrong about arch 9. Ours is a live measurement of a real remote and the
client's is a constant, so the burden is on the client, but the disagreement is worth keeping
because arch 9 is the architecture this project understands least.

### Confirmed on 21 August 2026, from the captured replies

Section 145, and all of it recomputed by `tests/test_host_client.py` rather than transcribed.

* **`IsEnabled` is real and decides registration.** 19 skins of 120 carry it, and the list the setup
  flow reads holds exactly those 19. Skin 22 is false, which is why a Harmony 525 cannot be registered
  and why its compile ends in a bare error. This was section 136's inference and is now an equality
  with no exception either way.
* **`CompilerArchitecture` is null on all 120.** The field would have handed us the architecture per
  model and it carries nothing.
* **`MaxActivities` is null on every model here.** One enabled product states a value, the Harmony 350
  at 1. Everything else enabled is null and the disabled half is a flat 255. So the claim that no
  source states an activity limit for these remotes holds, with the field named.
* **The device and favourite counts agree with `packages/usb/src/models.ts`** on every model here.
* **An activity is roles plus a wanted state**, and `EnterActions` and `LeaveActions` are empty on both
  captured activities. A role names its device, its selected input by name, and its position in the
  power up and power down order.
* **A `KeyCode` is a grammar, not three shapes**, section 159, measured over 2921 distinct codes from
  106 appliances after section 145 had read three shapes off the 419 available then. It is
  `G:<family>:(<A>)(<B>)(<C>):<n>`; slots A and B both hold content, C is empty in every code and the
  trailing number is 3 in every code. A slot holds items joined by `_`, and an item is a value written
  with a one digit position prefix, or one of the three words `Start`, `Repeat` and `Trailer`, which name
  a standard frame of the protocol instead of stating it. Six item sequences occur and no seventh. The
  family's name states one width per value, checked on 3706 values with none exceeding its width. It also
  states the **base** those digits are written in: `Galaxis 16 Bit Quad Toggle` writes its values in
  quaternary, two bits a digit, and reading them as hexadecimal overstated them threefold and refused all
  69. `packages/codec/src/stated.ts` reads the base out of the name, so the notation reads whole, 2921 of
  2921 distinct codes and 33 of 33 families.
* **Their analyser recognises a rhythm at a bit count, from its own list**, section 159, which bounds how
  far it can be used as a judge. It accepts the Samsung lead in at 32 bits, naming it `GoVideoO1 32 Bit`,
  and refuses the same lead in at 16, 20 and 38 bits, which is where their own catalogue states those
  codes. So a refusal from it is not evidence against a rhythm. Its family names are also coarser than
  the catalogue's: one rhythm answers for both of their Sharp families, and a 48 bit code is named from a
  vendor field inside its own payload. `ProtocolList` is advertised on two services and 404s as a POST on
  both, so the list it decodes from is not reachable.

### Confirmed and moved out

**The platform codenames and the skin number table**, 9 August 2026. A resource file carries nine
USB vendor and product pairs against Logitech's internal platform names, and 46 skin numbers
against models. Five skins this project had already measured, from firmware literals and from live
remotes, all agree exactly, and the full table sharpened section 81's rule for the two containers
that carry a skin their remote does not have. It is in `reference/models.md` with its provenance,
and `tests/test_gspm.py` asserts the corpus against it rather than asserting the table.

That one had already been used as a lead in section 81, before this document existed, which is
part of why the rule needed writing down.

**The erase block table and the writable ceiling**, 9 August 2026, now in
`packages/usb/src/rails.ts` as `ERASE_BLOCK_SIZE` and `WRITABLE_CEILING`. They went into the code
while still client sourced, because of which way they cut: **they make the rail refuse more.**
Tightening a refusal on weak evidence costs a write that might have been fine. Loosening one costs
a remote.

**`WRITABLE_CEILING` was confirmed the same day, and by the device rather than by the firmware.**
Reading a Harmony One's own flash at `0x3D0000` returns an application firmware image, byte
identical to the archived package and to the copy the remote runs from, **on both Harmony Ones**,
one of which has never had vendor software near it. So the client was right and the top 192 KiB of
the nominal config region is not spare. `docs/findings.md` section 88.
`ERASE_BLOCK_SIZE` is still unconfirmed, and confirming it means erasing something, so it will stay
that way for a while.

The confirmation took as long as it did for a reason worth recording here rather than only in the
finding: this project's own address validator refused every arch 12 address above `0x200000`, so
the read that would have checked the client's claim was impossible until that was fixed. A wrong
refusal hides exactly what it refuses.

The client picks a flash block table from the chip's JEDEC manufacturer and device id, which it
reads over USB. For every chip it lists against arch 12 the layout is `16K, 8K, 8K, 32K` and then
uniform 64 KiB to 4 MiB, so **an erase anywhere in the arch 12 config region takes 64 KiB with
it**, and the fine boot blocks are all below `0x010000` and outside anything the rails permit.
Two consequences the rails now enforce:

* an erase address must be a **block boundary**. The client walks its table from zero and starts
  erasing at the first boundary at or after the address, so an unaligned caller gets neither the
  erase it asked for nor an error.
* the writable ceiling is `0x3D0000`, not the nominal `0x400000`, because the client declares the
  remote's **stored application firmware** at `0x3D0000`, inside the region section 47's own
  validator treats as config. A writer that trusted the nominal top would erase the firmware.

`packages/usb/test/rails.test.ts` names those two addresses as the cases that used to be allowed.
Confirmations that cost nothing and came with it: `ERASE_FLASH` is `0xD0` with a 24 bit address
and no count, `WRITE_FLASH` is `0x30` and takes the same five bytes as `READ_FLASH`, and both are
most significant byte first. All three were already read from the firmware.

The one new protocol shape is a **sixth byte**: both flash commands have a variant that appends a
memory type selector, and both erase variants likewise. Nothing here has seen one sent, and the
firmware reading has the five byte form, so it is recorded and not acted on.

**Base slot 0's frame length is 24 bits, not 16**, 9 August 2026. The client reads three bytes at
`+0x02` of the `0xFEED` frame, where this project read two and described the byte at `+0x04` as a
spare that is "zero in every sample". It is zero in every sample because the largest name tree in
the corpus is 2326 bytes, twenty eight times below the 16 bit boundary, so **no sample here can
separate the two readings**.

Adopted anyway, in both codecs, because the readings cannot disagree on anything this project has
and the wider one survives a config the corpus does not contain. `tests/test_gspm.py` states
exactly that: the byte is zero everywhere, the narrow read equals the wide one everywhere, and the
largest tree is pinned so a sample that could tell them apart fails loudly.

The same routine confirms two things already believed: the terminator is `0xBEEF` at
`start + length`, which is section 83's `length + 2` from a different direction, and an older
architecture uses a different magic with a 16 bit length, which is why the width is stated per
magic rather than per architecture.

**The file format classes, 9 August 2026, and this one is different in kind**: it corrected four
things and none of the corrections needed the client's word for anything. `docs/findings.md`
section 87. The EZ container's split rule is structural rather than arithmetic, both declarations
in the header are optional, the compatibility gate compares six fields rather than four, and an
arch 12 firmware package states its own two way split in `<PHASE>` elements. Every one of those was
then checked against files this project has held since the first week, so what the client supplied
was the **question**, and the corpus supplied the answer.

That is the shape this document argued the client was for, and it is worth naming as a fourth
category beside the ledger, the confirmations and the dead ends: a source can be worth reading
because of what it makes you go and measure, without a single fact travelling from it.

**The platform codenames no longer rest on the client at all**, same date. Logitech's firmware
packages carry a comment naming the architecture on every entry of the list they refuse, so
Espresso, Mocha, Cappuccino, Cognac, Gin and Molson are corroborated by a shipped data file rather
than by decompiled code. The skin table above is unaffected and still client sourced.

**The software type values**, same date, and they came from a package rather than from the client:
0 application, 4 safe mode, 1 test, 3 boot. Section 87 places them in `GET_VERSION` field 4's low
nibble by reading the same accessor out of each bench remote's application and safe mode images.

### Infrared learning: the data stream's shape

The firmware settles the bracket and this document holds the rest. `docs/findings.md` section 91
has the full argument; what is believed on the client's word alone is:

* A learn data report has a **zero length nibble** and carries its real byte count in the **last
  byte of the report**, which no other command in this protocol does. Between them: a byte of two
  nibble counters, then big endian `u16` words, `(count - 2) / 2` of them.
* The two counters are a sequence 0 to 15 and a dropped counter. An increase in the dropped counter
  means twice that many samples were lost, so **samples go in pairs**.
* **The first three words are calibration**: a last pulse on time, a first pulse time and a clock
  count. Carrier period is the gap between the times over one less than the count, in microseconds.
* Then envelope and gap alternate. An envelope word is microseconds on every architecture this
  project targets and a count of carrier cycles only below architecture id 2. A gap word is total
  elapsed time, so the envelope before it is subtracted.
* **Stopping a learn can restart the remote**: the client waits an architecture specific reboot
  delay after the stop before doing anything else.

Worth confirming in the order given: the report framing first, because it is what an implementation
gets wrong silently, and the calibration arithmetic second, because section 32 already knows the
carrier from the transmit side and the two should agree.

#### What the analysis service takes, and it is one string

The desktop client turns a capture into a single string and posts it to
`infraredAnalysisManager.AnalyzeInfrared` as `{ rawSequence }`. The answer carries a `KeyCode` in the
same notation the device database uses, section 132, so **the service is a protocol decoder we can
call**: durations in, a protocol name and a frame value out. The client keeps the raw string beside the
answer and uploads both when the command is saved, as `KeyCode` and `RawInfrared`.

The string is `F` and the carrier in hertz, then one letter and one duration per interval: `P` for a
mark, which the client calls a carrier interval because that is when the emitter modulates, and `S` for
a space. Every number is upper case hexadecimal padded to four digits, or eight where it does not fit.
Microseconds throughout.

Five modules build it and each states one rule:

* **the report**, `infrareddata`: byte 0's high nibble is `0x90` for data and `0xF0` for done, byte 1's
  high nibble is a sequence that must advance by one and wrap at fifteen, byte 1's **low nibble is an
  error code** and anything but zero aborts the capture, the **last byte** carries the real byte count,
  and the words are big endian starting at offset 2. That confirms the report framing above from a
  second client, and it **corrects one part**: this document read byte 1's low nibble as a dropped
  sample counter whose increase means samples were lost in pairs. The desktop client treats it as a
  hard error. Both may be true of the same field, and only a capture settles it.
* **the calibration**, `carrierprocessor`: the first three words are a first pulse time, a header pulse
  time and a cycle count. The count is decremented, the difference of the times must be positive, and
  the carrier is `1e6 / (difference / count)` hertz. The difference is then **emitted as the first
  mark**, so the header pulse is both the calibration and the first interval of the code.
* **the data**, the same module: words alternate envelope and gap. An envelope word is the mark's own
  length. A **gap word is total elapsed time**, so the space is that minus the preceding mark, and a
  gap shorter than its own mark is dropped. A zero word still flips the phase, which is a trap for
  anyone implementing it.
* **the merge**, `carrierrecorder`: two intervals of the same kind in a row are one interval, summed.
  This is the rule that matters most for reusing the service on a stored record, since a stored
  duration is fifteen bits and a long silence is spelled as several words.
* **the stop**, the same module: an interval longer than **500000 microseconds** ends the capture.

`packages/codec/src/irda.ts` builds the string, with the merge, and `packages/codec/test/irda.test.ts`
asserts it over the corpus. **Nothing here has yet seen the service accept one.**

**The format is ambiguous above 65535 microseconds and the corpus says it does not have to matter.** `F`
is a hexadecimal digit as well as a token letter, so a duration cannot be found by scanning for
letters: 1647 of 4323 class 1 records hold one whose four digits contain an `F`. And a field that is
four digits or eight cannot be read at a fixed width either. Both problems live entirely in the closing
silence: 3309 records hold an interval above 65535 microseconds and **none holds one before its own
closing silence**. So a caller sends the code up to and including the silence that closes it, clamped,
and every duration fits in four digits. Cutting **before** that silence is wrong, and measurably: a
pulse width frame's last bit is a mark whose space is the trailing gap, so a Sony code read as twelve
bits over the whole block reads as eleven over a train cut short of it.

#### What the clients offer around a learned code, and one of them names an unread section

Asked on 23 August 2026, because a stored code may be one somebody taught their remote and a taught
command may be several presses. What the two clients offer, from their own vocabulary:

* **The teaching flow is server driven in both eras.** The classic client has `EZTutor`, which fetches a
  list of commands to teach by name, walks it, captures each and uploads it, and uploads an **empty**
  capture for one the user skipped. Its default when the list is empty is a single `PowerToggle`. That is
  the same shape as `DetectLanguage` above, twelve years earlier.
* **The classic client uploads XML where the desktop one uploads a string**: `PULSESEQUENCES` holding an
  `IRSEQUENCE` with a `FREQUENCY` and a `PULSESEQUENCE` of `PULSE` and space elements in microseconds.
  Different transport, and behind it the **same class names**, `CarrierRecorder` and an `Interval` with
  `isCarrier` and a time in microseconds. So the merge rule is one derivation in two eras rather than a
  detail of the newer client.
* **A button map carries `Sequences` beside `Buttons`**, and a step is a `ButtonSequenceAction`. So a
  command made of several presses is a property of the map, not of the infrared record, which agrees
  with what the configs show: an action list sends several codes in order.
* **An activity's actions are a typed list**: `CommandActivityAction`, `DelayActivityAction` with a
  duration, and `ChannelActivityAction`, each with an `ActionOrder`.

**And the feature list is per product, which is the find.** A product record carries a numbered
capability set, over a hundred flags, and four of them are this mechanism: `FavoriteChannels` is 1,
`SupportActivitySequence` 21, `ButtonSequences` 22 and `ActivityStartUpChannel` 63. Others worth noting
are `ModeMap` 2, `FunctionMapping` 6, `DeviceDelay` 14 and `LongPressAction` 29. It is reachable live,
since `productsManager` carries `GetProduct` and `GetProductButtonList`, so `reference/capabilities.md`
has a vendor source for its verification column beyond the device count section 136 adopted.

**A channel is a number, and base slot 16 is the number sender.** Section 39 read that section out of
three firmware images down to the decimal conversion, and it is empty in all 21 containers, so what its
`flags` bits above 2 do and what its `base` field is could not be read from anything. The client says
what would fill it: a favourite channel or an activity's start up channel is a **number** the remote has
to spell out one digit at a time, which is exactly what that section does. Not proven, and cheap to
prove: setting a favourite channel on an account with a bench remote and compiling would produce the
first config anywhere with base slot 16 populated, with the number known in advance. That is the same
known answer trick that produced the two calibration configs.

#### DetectLanguage: the service works out which code set an appliance uses

This is the flow the user manuals gesture at and never describe, and it is the reason a Harmony asked
people to press buttons on their original remote. `deviceManager` carries two operations this document's
own service table missed, `DetectLanguage` and `DetectLanguageForMultiCodeDevice`, and the client's
teach page has three modes: detect the language, teach a missing command, teach a missing input.

The request is smaller than expected:

```
DetectLanguage { deviceType, maxNewCommands: 1, learnedCommands: [ { Name, KeyCode, RawInfrared } ] }
```

**A device type and nothing else.** No manufacturer, no model number. The reply is a status of five,
`Success`, `NeedMoreCommands`, `Failure`, `NoMatchFound` and `NoMoreCommandExist`, plus
`DetectLanguageCommands`, which on `NeedMoreCommands` names **the next button to press**, and on
`Success` an `UpdateLanguageOperation` carrying the `GlobalLanguageVersionId`. That identifier is what
`GetGlobalLanguageCommands` takes, so one loop of press, ask, press again ends with every command of
the appliance as a protocol and a frame value.

The multi code variant is for an appliance already chosen from the catalogue whose model has several
code sets, and it takes a `publicGlobalDeviceId` in place of the type. When detection gives up the
client falls back to a search by make and model, which is the route Logitech's wizard is remembered
for.

**Unconfirmed here, entirely.** Nothing in this project has called either operation.

#### And the session around it, from the Desktop client, for the Harmony One specifically

A second client, independently, and this one states the whole sequence rather than the report
format. Four commands, and the two sources agree wherever they overlap:

1. **Enter learning.** A restart command with a subcommand, an entry point selecting start learn,
   and a configuration type selecting the current firmware: `0xA0 0x0A 0x07 0x00`. One reply packet,
   beginning `0xF0 0xA0`.
2. **Start capture.** `0x70`, with a timeout far longer than any other command here, answered by
   exactly **two** packets.
3. **Stop capture.** `0x80`, answered by an **unspecified number** of packets, the last of which
   begins `0xF0 0x70`.
4. **Leave learning.** The same restart command with the stop learn entry point,
   `0xA0 0x0A 0x08 0x00`, preceded by a two byte no-op and ending on `0xF0 0xA0`.

**This narrows what section 91 could not find, and does not close it.** That section established the
bracket from the firmware, `0x70` opening and `0x80` closing and states 6 and 7 acknowledging with
`0xF0 0x70`, and then failed to find any code that sends capture data. What this client adds is that
the sample packets are **collected under the two capture commands and terminated by that same
acknowledgement**: it reads a fixed two packets after the start and an unspecified number after the
stop, stopping at `0xF0 0x70`. So the samples ride the ordinary response path on the one IN
endpoint, which is why no separate sender was ever going to turn up.

**The two clients do not obviously agree here**, and the disagreement is the useful part. The
classic client, section 91, takes learn reports off a queue its reader thread has already filled,
sending nothing, which reads as the remote pushing reports unsolicited while a session is open. This
one models the same bytes as a command's response stream. Both end at `0xF0 0x70` on the same
endpoint, so they can be the same wire behaviour described from two heights, but which it is decides
what an implementation has to do: keep reading during the session, or read after the stop. **Not
established, and it is the question to put to the firmware**, whose answer is the response path of
the `0x70` and `0x80` handlers rather than a search for a sender that does not exist.

The **restart command is `WRITE_MISC` selector `0x0A`** and it is wider than
learning. Its entry points cover terminate, default, before and after a config update, after a
firmware update, start and stop update, start and stop learn, and start and stop upgrade; its
configuration types are current firmware, user configuration and embedded configuration.

**Read from the firmware on 9 August 2026, section 97, and it partly contradicts this file.** On
arch 14 the selector acts for exactly five entry points, and numbering the client's list from zero
those are start update, start learn, stop learn, start upgrade and stop upgrade. The client's own
`0x07` and `0x08` land on start learn and stop learn, so **the firmware confirms this list's order**,
which is the first check of it against anything. Terminate is entry point zero, and it does nothing.

**On arch 12 the whole selector is a no-op**, four instructions that set a "packet handled" flag. So
the `0xA0 0x0A 0x07 0x00` this file records the client sending **to a Harmony One** is ignored by the
Harmony One. That is what a host written across skins looks like rather than an error in the
reading, and it is this file's standing caveat in one example: the client says what it sends, never
what the remote does with it.

**It is a write, whatever the flash rails say.** Sending it restarts a remote into a mode, so an
implementation belongs behind `WRITES_ENABLED` in `packages/usb/src/rails.ts` alongside the flash
writes, and nothing in a read path may issue it. Section 97 does not soften that: on arch 14 it
injects two action list instructions into a running interpreter.

### The whole arch 12 config write, in order

Read 9 August 2026 from the Desktop client's own file for the Harmony One. This is the sequence
this project has never performed and, per decision 8, will not perform in version 1. It is recorded
because a write rail is only as good as its knowledge of what a legitimate write looks like.

Restated as commands, each with its acknowledgement:

1. Reset the USB side, no reply expected.
2. `WRITE_MISC` selector `0x0A`, the restart command from the learn section above, with the entry
   point meaning **start upgrade**.
3. `WRITE_MISC` selector `0x06`, address 0, value 0, then `READ_MISC` on the same selector and
   address to confirm the byte reads back as 0.
4. `WRITE_MISC` selector `0x02`, which the client calls invalidating the flash region. **This is the
   ledger's first item confirmed by a second client**, independently.
5. `ERASE_FLASH` per block, walking the region from its base for as many blocks as the file covers.
6. Per chunk: `WRITE_FLASH` with a base address and a size, then 150 `WRITE_FLASH_DATA` packets of
   63 bytes each, then a done packet. A chunk is 9450 bytes.
7. `WRITE_MISC` selector `0x06`, address 0, value 2, then read it back to confirm.
8. Reset the device, wait for it to reboot.

**So selector `0x06` is an update status byte at address 0**, 0 meaning none and 2 meaning a new
image is present, written before the erase and again after the write. That is what
`docs/usb-protocol.md` calls one of the bodies this project located and never read, and it is the
most testable item here.

Addresses are three bytes and sizes two, high byte first, which agrees with this project's own
encoder.

**A caution about the literal bytes in these files.** They are inconsistent about whether the
leading byte already carries the length nibble: some commands are written as the bare command code
with the nibble left for the builder, and some are written with it folded in. So a byte from here is
read as a command plus a selector plus arguments, and the nibble is recomputed rather than copied.
This project's `encodeRequest` already computes it.

### The arch 12 flash regions, including the two nobody here had named

Seven named regions for the Harmony One, and the ones this project already knows agree exactly:

| region | address | status here |
|---|---|---|
| boot loader | `0xFE0000` | internal, page `0xFE` |
| safe mode | `0xFE1000` | internal, and the safe mode image this project has read |
| normal mode | `0x3D0000` | the stored application firmware, already adopted as the write ceiling |
| embedded config | `0x002000` | the safe mode container, known |
| user config | `0x040000` | known |
| CPLD image | `0xFF0000` | **new**, and unexplained here |
| PIC library | `0xFFE000` | **new**, and unexplained here |

The unit's own identity block is named separately, 64 bytes at `0xFFF400`, read with an ordinary
`READ_FLASH`. That is the region this repository's policy keeps out of any published dump.

The last two are candidates for the unexplained arch 12 regions in the ledger above.

### Flash block geometry, which changes an erase rail

The client states the block table for arch 12 as counts and sizes: **eight blocks of 8192 bytes,
then sixty three of 65536**. The 64 KiB figure is what this project measured and built its erase
rail on, and it is right for everything above the first 64 KiB. What is new is that **the bottom
64 KiB of flash erases in 8 KiB blocks**, and that is exactly where the embedded config at
`0x002000` lives.

A rail that requires a 64 KiB aligned address and a whole 64 KiB block inside the region is
therefore too coarse at the bottom of flash and would refuse a legitimate erase there, which is the
safe direction, but it also means the rail's stated reason is wrong for that range. Client sourced,
unconfirmed, and worth measuring before an erase rail is relied on for anything below `0x010000`.

### The version reply's field map, which agrees with ours field for field

The client's identify operation reads `GET_VERSION` and assigns the same fields this project derived
from disassembly and prediction: firmware version and hardware version as nibble pairs, then flash
device id, then flash manufacturer id, then a byte carrying the architecture in the high nibble and
the software type in the low, then the skin. Six fields, the same six, in the same order.

It stops there. It has no name for field 6, the compiled in `0x0C` this project cannot explain, nor
for anything above it, so the client does not settle that and never did.

**One agreement and one contradiction, both measured.** The arch 9 skin declares a flash device id
of `0x12` and a manufacturer of `0xFF`, and the bench Harmony 525 reports exactly that pair. The
Harmony One skin declares `0xF9` and `0x01`, and the bench Harmony One reports `0xC8` and `0x1F`.
Either the One shipped with more than one flash part or the file is wrong; either way **a writer
must take the flash id from the remote and never from this table**, and `rails.ts` already says the
config's declared version is matched against the remote rather than against a constant.

### The read selector names, which reframe an earlier correction

The client names the `READ_MISC` and `WRITE_MISC` selectors. Four are serviced for reading on arch
14, and the client has a name for each: selector 1 is a state accessor, 6 is memory, 7 is registers,
and 12 asks what hardware features the remote has. That last one is `docs/usb-protocol.md`'s "not
read yet" body, and the first and second are bodies this project has located and not read either.

**It does not overturn the `0x07` correction and it does sharpen it.** This project derived from the
firmware that selector 7 turns its parameter into a pointer and returns the byte it names, and that
6 is a different accessor. The client agrees there are two and disagrees about which one deserves
the word memory. Nothing about behaviour changes: 7 is the one that reads an arbitrary data address
on arch 12 and arch 14, measured on both.

**Tested and refused on arch 9.** Since selector 7 answers zero for every address on a Harmony 525,
the client's naming made 6 the obvious thing to try. All nine selectors return zero on a window that
is demonstrably live on a 600. `docs/findings.md` section 90.

### Smaller leads

* Arch 14 declares a user logging region at `0x0E0000` of 128 KiB, which is where a log area
  pointer on arch 14 would have to point. Section 47 found the writer is arch 12 only, so this
  says the region exists on arch 14 even though nothing writes it.
* **The pointer table starts at `0x08` on arch 7**, not `0x0B`. The client's three per
  architecture offsets are all `table_start + 1 + 4 * slot`, exactly, for slots 0, 2 and 3, which
  gives 11 on arch 8, 9, 12 and 14 and 8 on arch 7. There is no arch 7 sample here, so this is a
  prediction for whenever one arrives rather than something to act on.
* Arch 12 and arch 14 each declare an embedded configuration region, `0x1E000` and `0x4000`,
  distinct from the safe mode image and from the user config.
* Read selector 12 is `docs/usb-protocol.md`'s "not read yet" selector `0x0C`. The client uses
  it to ask what hardware features the remote has.
* **Flash `0x200000` on arch 9 has left this ledger**, section 119, and it is the first entry to do so
  by being confirmed rather than refuted. It was here as concordance's claim that the address is a
  firmware update state cell, `0x00` while staging and `0x02` to install, with `0x200010` holding the
  serial, and with the awkward note that section 88 read the 525's validator as refusing every top
  byte outside `0x80` to `0x87`. Both halves are now read out of the 525's own firmware. The
  validator's chain has four windows above its flash range test and `0x20` is the **on chip EEPROM**,
  bounded to 256 bytes, which is why `0x200010` is the serial and why section 88's rule described only
  the default arm. The bootloader reads EEPROM byte 0 at every boot and `0x02` is the value that makes
  it install the application. So the client was right, and it was right about something it had no way
  to explain. What has **not** changed is the action: this project does not perform that write, arch 9
  has no write target, and **no concordance command line reaches that step alone**, section 118, so it
  is reachable only as four library calls that belong in the private lab and never in this MIT
  repository since they call into GPLv3 code.

## MyHarmony was checked and holds no protocol, and why that is worth knowing

*9 August 2026. A negative result, recorded because it closes a route that looked obvious and
would otherwise be proposed again.*

The classic client is one of Logitech's two desktop applications. The other is MyHarmony, which
replaced it, and the reasonable expectation was that the newer software knows at least as much.
It does not, and the reason is structural rather than accidental.

**It is not a native application.** MyHarmony is a Silverlight application inside a Chromium
shell, so the interesting half is managed .NET rather than machine code, and a disassembler is
the wrong tool for it. The application itself is not installed either: it was downloaded from
Logitech's servers at run time. What survives is 16 copies in the shell's browser cache, in two
vintages, from our own sessions. They decompile to about 244000 lines of readable C#.

**Its USB layer carries no protocol constants at all.** In 17800 lines of driver code there are
nine distinct byte-valued hex literals and not one of them is a command byte. Every operation is
a *string name*, `readflashinterpreter`, `send`, `packet`, resolved against XML the server sends
at run time. There is a packet writer and interpreter per platform family, arch 14 among them,
and they assemble packets from a script rather than from knowledge. So the protocol knowledge
was moved to the server between the two generations.

> ~~and the server is gone~~. **Wrong, corrected 9 August 2026, and it is the second time this
> project has killed a live service on paper.** `svcs.myharmony.com` answered on 7 August 2026,
> its certificate had been renewed that July, and section 58 had it compile a config for a device
> chosen from its catalogue that week and sync it to a remote. The classic service is the one that
> is discontinued, section 56, and this sentence collapsed the two again exactly as `CLAUDE.md`
> warns.

That inverts the expectation and it is the useful part: **the classic client is not merely the
better source, it is plausibly the last copy of that knowledge outside the firmware itself.**

**The correction changes what MyHarmony is worth, and upwards.** If the packet scripts are XML the
server sends at run time, and the server answers, then those scripts are **retrievable** rather than
lost. That is a larger prize than the device catalogue: it would be an independent statement of the
command layer per platform family, including families whose firmware nobody here has. It is
untested, and it is the reason this section no longer ends the conversation.

**And the physical button map is not there either.** That was the stated justification for
looking, since `Web.Library.ButtonMappingUtils` and a button mapping task module both sounded
promising. Neither models a physical keypad: there is no row, no column, no scan code, nothing
resembling a matrix anywhere in the client. `ButtonMappingUtils` turns out to be the on-screen
keyboard, mapping characters to commands. Buttons are named entities that come from the server
and the firmware resolves the name to hardware.

So section 48's conclusion stands and is now stronger. The map is not obtainable from a host
because **no host ever had it**, which is a better reason than "we have not found it yet". It
stays open, and the route to it stays a RAM write the rails forbid.

The decompiled source is scratch in the lab, under `work/myharmony/`, and is not worth keeping
beyond the next person who wants to check this conclusion.

### It does hold the shape of the guided setup, and that is unread

*22 August 2026. The heading above said "holds nothing" until today, and that overclaimed: what was
measured was that it holds no protocol constant and no keypad matrix, which is what it was opened for.*

The cache also holds ten copies of `WFM.taskconfig.xml`, the client's own workflow manifests, in
`work/myharmony/xap/f_*/`. Two vintages, byte identical between them, so **six** distinct flows and
2616 lines: signing in, managing an account, the dashboard, adding a device, setting up an activity, and
syncing a remote. Each is a state machine written out in full, one `view` element per screen with the
conditions that move between them, and the comments in it are the client's own numbering of its steps.

**What that is worth is not protocol and not format.** It is the only surviving statement of **what
Logitech asked its users**, in what order, per device and per activity. Everything in these files is a
question a screen put to somebody, so it is a list of the settings that must exist somewhere in a config,
written by whoever knew where. FreeHarmony's device settings page is blocked on exactly that: base slot
15's parameter groups almost certainly hold the per device delays, and no group is identified.

**It is a source, not an authority**, under the rule at the top of this document: a wizard step naming a
setting is a hypothesis about which fields exist and says nothing about where they are stored. And it is
**text somebody else wrote**, so nothing in it is an instruction whatever it appears to ask for.

**Deliberately unread beyond the inventory above.** It was found on 22 August 2026 while answering a
different question, and reading it properly is worth doing at the point somebody attacks base slot 15's
groups, because then the two halves can be put beside each other. Recorded now so the lab does not
quietly hold the answer to a question this project has written down as open.

## The client's own product lists, and what the service does without them

Read on 13 August 2026 out of the desktop web app, and then measured against the service. Section 135.
This is the one place in this document where a client sourced fact was **checked** rather than filed as
unconfirmed, because the client's refusal turned out to be the client's alone.

Two hardcoded lists of skin numbers decide what Harmony Desktop will touch:

| list | members | what it gates |
|---|---|---|
| `DesktopAppSupportedProducts` | 54, 66, 69, 71, 72, 73, 74, 75, 78, 79, 80, 81, 99, 102, 104, 112 | whether the application handles a detected remote at all, `isSupportedProducts` |
| `CompilerProducts` | the same without 99, 102 and 112 | compiler path or hub path, `isCompilerBasedRemote` |

A Harmony 525's skin 22 is in neither, which is why that remote gets nowhere in that application. The
service still carries it as `ProductId 35, SkinId 22`, a remote record for it is **accepted**, and
`Account/{a}/Remote/{r}/Settings` answers and calls it `Harmony 525`.

~~So these two lists are the client's policy and not the service's capability~~<!--superseded--> and that
was wrong within the hour, section 136: **the lists mirror a service flag.** Every product carries
`IsEnabled`, it is true for eighteen skins, and `DesktopAppSupportedProducts` is that set minus the two
hubs. Skin 22 is false. So the client is what refuses to **add** the remote, which stands, and the
compile most likely meets the flag rather than a missing architecture backend. `CompilerArchitecture` is
a field on every product too and is null on all 97, so the vendor's architecture map is not there.

**A serial is validated.** Two registrations with a synthetic serial, for a Harmony 880 and a Harmony
300, are refused with `ErrorCode 5, "Remote is invalid bearing serial Number: ...", Source:
ValidateRemote`, where the 525's real one passed. So a remote nobody owns cannot be registered, and the
compile route is closed for every model not on the bench.

**`MaxDevicesPerAccount` is stated per product** and agrees with `packages/usb/src/models.ts` on 28 of
35 shared skins, which is the strongest corroboration that table has had. The seven disagreements went
the vendor's way in section 136, because in each one our figure was an inference or a count mistaken for
a ceiling.

### Adding a remote, which is three facts and one trap

`UserAccountDirector/AddRemoteToAccount` takes `remoteInfo: { AccountId, KeyPadLayout, SerialNumber,
SkinId, UsbPid, UsbVid }`, where the serial is three brace wrapped GUIDs, concordance's 48 bytes
rendered three times. **Devices and activities hang off the account record, not the household**, and a
household holds one record per remote, so a remote needs its own record from
`AccountManager/AddEntertainmentSystemToMyHousehold` first. Attaching to a record that already has a
remote is refused with `ErrorCode 5, Message "1175"`, and the trap is that an opaque number arriving
right after an unsupported skin reads as being about the skin: it is not, a supported skin is refused
identically.

**`Discovery/GetJsonOperations` is not exhaustive.** That account operation is absent from the 308 it
lists and answers anyway, and its reply is wrapped in `CreateNewAccountInHouseholdResult` rather than in
its own name. So the operation census is a floor, and the names the client uses are not always the
service's.

### A sync is recorded when the client says so, not when the remote is programmed

Measured on 23 August 2026, on our own second account, and it is a before and after on the service's
own record rather than a reading of the client. The client showed the spare Harmony One as setup not
complete, refused the ordinary interface until a re-sync, and that re-sync then failed repeatedly. The
household record at that moment stated:

```
Remotes[0].FirstSyncDate  = ''
Remotes[0].LastSyncDate   = ''
Remotes[0].IsSyncRequired = False
```

After the sync finally went through, both dates hold the same timestamp to the second and nothing else
about the remote's record moved. So `FirstSyncDate` was written on that retry, which is the field that
makes this a finding rather than an anecdote: the account had never recorded a completed sync for that
remote at all.

**The control is that the remote was already programmed.** The previous day's sync did reach it, and we
know that independently of anything the service says, because the config was read off the remote and
filed byte for byte as `one_spare_myharmony`. So there was a fully programmed remote and an account
record stating it had never been synced, at the same moment.

The reading is that the service records a sync when the client reports the session finished, and the
client reports that only after it sees the remote come back on the bus. That matches what was observed
from the other side: after an earlier sync the remote restarted and the client sat waiting for a
connection that never arrived. Section 155 is the same phenomenon measured from our own host code, where
a remote left idle in USB mode drops the first command it is given and answers the next.

**One occurrence, so the mechanism stays a reading.** What would settle it is interrupting a sync
deliberately at the moment the remote restarts, which is not a thing to do to an irreplaceable remote.
What the measurement does settle, without the mechanism, is that the record can disagree with the
hardware and that `IsSyncRequired` is not the field the interface keys on, since it was false throughout.

The consequence for FreeHarmony is a design rule rather than a protocol fact: what is on a remote is
established by reading the remote, never by a bookkeeping field a lost handshake can leave empty. The
captured pair is `GetMyHousehold_account2_before_sync.json` and `..._after_sync.json`, and
`tests/test_host_client.py` asserts the transition.

### The compile refuses architecture 9, without saying so

With devices and activities in place the compile is accepted, reports `Compiling`, and ends
`<RemoteConfiguration status='Error' length='0'/>`, twice, with no reason. The same session compiled a
Harmony One to `Successful, length 288096` minutes later, so the compiler works; and the 525's settings,
device command counts and activity count are indistinguishable from the remotes that succeed. The
architecture is what is left, and it stays a reading rather than a fact because the error names nothing.

## Where the extraction lives

The verbatim extraction, with Logitech's identifiers, is `software/classic/PROTOCOL-CONSTANTS.md`
in the private lab. That directory is not published and does not become published by this
document existing.
