# Logitech's configuration service

## The service API, which is a different surface and answers a product question

Added 12 August 2026. Everything above mines this client for the **USB** layer: what a packet looks
like, what an operation sends to a remote. This section is the other half, the **service** the client
talks to, and it was never looked at until a product decision needed it. Decision 11 in
`docs/decisions.md` says FreeHarmony works offline and may optionally take Logitech's device data while
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

**`userFeatureManager` was called on 31 August 2026 and it is where a device's delays are**, which
is worth a paragraph because the obvious place is wrong twice over. A device's power on delay is not
on the device record that `GetDevicesInAccount` returns, so the lab's `setdelay.py` cannot reach it;
it is on a `PowerFeature` hanging off the device, fetched with `GetUserFeatures`. And that manager
does **not** live on `HarmonyPlatform` where every other one here does: it is
`UserFeaturePlatform/UserFeatureManager.svc/json/`, read off the service's own discovery reply. A
guess at the usual platform answers **404 with an empty body**, which is indistinguishable from the
operation having been withdrawn, so it is the same trap as the update service's missing header. What
it gives is a per device `PowerOnDelay` and `DefaultPowerOnDelay` in milliseconds, which is the only
statement of those numbers outside a configuration and is therefore the external check on
`docs/findings.md` section 235. All reads.

**The transport is JSON over HTTP, not SOAP.** The endpoints are `.svc`, which means WCF and implies an
envelope to anyone who has met it, and the client uses `json/` and `json2/` path variants and contains
the string `soap` exactly zero times. That halves what a client would cost: a body and a URL, no WSDL
and no generator.

**`downloadManager.RemoteConfigurationInJson` is the prize for this repository rather than for the
application.** A configuration, described in JSON, by the people who wrote the format, for a remote
whose bytes this project already reads to the last one. That is a vendor authored second view of the
same object, which is the strongest kind of cross check there is, and it would either confirm the
readings in `reference/config-format/README.md` or name the field that is wrong. It needs an account and a
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

**A third source exists and it is the biggest of the three**, section 219, added 30 August 2026:
MyHarmony's own generated service proxy declares **298 operations over 19 service interfaces**, with a
reply type resolved for every one. That does not correct the 78 over 14 above, which is Harmony
Desktop's web application and a different client; it adds a third surface. Eleven services are in both
the proxy and the Discovery listing, and neither contains the other: the proxy adds operations on all
eleven and the listing adds operations on seven. So "the extraction above is a lower bound" holds and
is now bounded from a second direction as well. `reference/logitech/data-model/operations.json` is the data.

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

**It cleared the same morning**: a later attempt signed in normally, with nothing changed on the
machine in between. So the observation is an intermittent failure of their SSO front end and not a
permanent one, and "already rotting" would overstate it. What stands is narrower and still worth
having: the failure mode exists, it is theirs, it refuses before any credential is checked, and while
it lasts every account fails identically.

Two consequences worth the paragraph. Everything this project does speaks the JSON route and was
unaffected even while the SSO refused; what such an outage removes, for as long as it lasts, is the
**hand** route of adding appliances in their client. And an importer in FreeHarmony should speak
`LoginUser` directly and never the browser SSO, because the SSO is the half that has now been seen
failing. The shelf life argument this document and decision 11 lean on gained a dated observation,
of an outage rather than of a death.
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
