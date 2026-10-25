---
name: myharmony-service
description: "How to talk to Logitech's two live services, read only by default: the configuration service and the software update service that serves firmware. Carries the account map, the API mechanics, the hidden recovery screens in both clients, the rails and the traps. Use before any session that logs in, fetches the device catalogue or a firmware image, compiles a config, registers or removes anything on an account, or reasons about what an account holds."
---

# Logitech's live services: the instrument, the accounts, the rails

Everything below has been relearned at least once by a session that did not know it. **Three
services, and keeping them apart matters**: the configuration service `svcs.myharmony.com` is alive
and still compiles, [the service](../../../reference/logitech/service.md); the **software update
service** `sus.dhg.myharmony.com` is alive, serves firmware and needs a header before it will admit to
existing, [the update service](../../../reference/logitech/update-service.md); and the classic
`members.harmonyremote.com` service for the 7.x software is discontinued. Any of the live ones can be
withdrawn without notice, which is one of the two reasons the hardware rails never relax because of it.

**This skill is the instrument and its rules.** What the services are and what they answered is in
those two pages and in [the data model](../../../reference/logitech/data-model/model.md); what our
accounts hold and what happened on them is `docs/test-notes/accounts.md`. Read the page before
re-measuring anything it states.

## MyHarmony is the reference client, not Harmony Desktop

**Read MyHarmony when the question is which call to make, in which order, with which arguments.** Its
code is `../lab/work/myharmony/xap/`, the Silverlight assemblies, plus `../lab/software/MyHarmony/`.
Decided on 28 August 2026: everything Harmony Desktop's web application can do MyHarmony can do too,
and better, so a reading off the newer client describes the hub generation rather than the remotes on
this bench, [the clients](../../../reference/logitech/clients.md#harmony-desktop).

**And it is decompiled to C# in the lab**, `work/myharmony/src/`, thirteen assemblies and 3414 `.cs`
files: the first seven held 1999, five more followed, and the dashboard assembly
`Web.MartiniWeb.Tasks.Dashboard.Main` came with section 351. Other assemblies in
`xap/` are still compiled only; `ilspycmd` with `DOTNET_ROOT` set to Homebrew's dotnet decompiles one.
Read that, not the compiled DLLs beside it: section 202 was a wrong reading published in four
documents because a method name found by searching an assembly looked like a call site, and the source
was there the whole time.

**Its sync picks a route per product from the product's declared capabilities**, compile for a
Harmony One or 600 and provisioning for a Harmony Touch, which never compiles:
[compiling](../../../reference/logitech/service.md#compiling) and
[provisioning instead of a compile](../../../reference/architectures/harmony-touch/usb.md#provisioning-instead-of-a-compile).
So a compile that ends in `status='Error'` for a Touch is the service being asked for an artefact that
product has no route to, rather than a payload this end got wrong. **Read the capability list before
assuming a remote's configuration can be fetched**: `GetProductCapabilities` on the
`UserAccountDirector` base, and the request is **wrapped**, `{'request': {'accountId': N}}`, because
the operation takes one contract parameter.

**And a sync is not one call.** MyHarmony's sync module works through: has the configuration changed,
save the remote settings, does this remote need a sync, compile, poll for the file, then register the
compile and the sync as successful. A script that sends only the compile is not doing what the button
does, which is the thing to check before concluding a call is broken.

Where Harmony Desktop's mirror is still the only source is the **per skin protocol templates** for the
file based family and the **parameter encoder** in `en.desktop-app-main.js`, both confirmed against
hardware. Reach for it for those and for the `susKey`, and for nothing else.

## Two clients now, and which one to use

**For adding devices, compiling and removing devices, use the repository's client**:
`packages/corpus/src/myharmony.ts` and `packages/corpus/bin/harvest.ts`, written on 7 October 2026 for
`todo-secure-logitech.md` 1.1. The calls are the knowledge being secured, so they belong where this
repository's checks can see them; the credentials still come from the lab's `credentials.env` (or
`MYHARMONY_EMAIL<n>` and `MYHARMONY_PASSWORD<n>` in the environment), and every reply and compiled file
is filed in the lab, never here. Its writes sit behind **the same named doors** as the lab client's, so a
go-ahead for one door means the same thing for both. **For those three steps the lab client is retired**;
do not extend it for them.

**For everything else, the lab client below is still the instrument**: the other doors (adding a
remote, migrating, `UpdateMyData`), the evidence directories, and the reads the earlier sections cite.
A further kind of write goes into the repository's client, not into a third one.

## The lab's client

`../lab/work/myharmony/probe.py`. It handles a credential and talks to a live third party, which is why
it was kept out of a public checkout until the repository's client existed. Import probe and use its
`call`, its login and its masking rather than writing another Python client. Everything that matters about it:

* `MYHARMONY_ACCOUNT=2 python3 probe.py` selects the account. Credentials come from
  `credentials.env` beside it (`MYHARMONY_EMAIL`/`MYHARMONY_PASSWORD`, suffix `2` for the second
  pair), never from the shell and never echoed.
* **Replies are evidence and land per account**: `responses/` for account 1,
  `responses-account2/` for account 2. The directory is derived from the selector inside probe.py
  precisely so a session cannot write account 2's replies over account 1's, which nearly happened
  once. Saved replies may carry a UTF-8 BOM: parse with `encoding='utf-8-sig'`.
* **It refuses mutations by verb**, before building the request. The list is `MUTATING` in
  probe.py, and `NOT_A_READ_DESPITE_THE_NAME` catches the vendor's misnamed writes: measured,
  `CompileManager/CommandList` **is** the compile. Nothing goes on that list by reasoning.
* Authorised writes sit behind **named doors**, one environment variable each, granted per operation:
  `compile.py`, `addremote.py` (`MYHARMONY_ALLOW_ADD_REMOTE`), `migrate.py`
  (`MYHARMONY_ALLOW_MIGRATE`), `cleanup.py`, `adddevice.py`. A door is not opened because a task
  would be easier with it; each was authorised once, for the throwaway account, and a new kind of
  write needs a go-ahead of its own.

The repository side has two make targets that reach the service and take credentials from
`HARMONY_LOGITECH_EMAIL` and `HARMONY_LOGITECH_PASSWORD` instead: `make analyze` (their analyser
against our decoder) and `make emitcheck` (build a code from their catalogue, ask their analyser to
read it back). Both refuse without credentials and are **never in `make all`**.

## The API mechanics

How a request is made is [how a client talks to it](../../../reference/logitech/service.md#how-a-client-talks-to-it);
what follows is what a script has to get right.

* Login first, always: `POST` to `CompositeSecurityServices/Security.svc/json/LoginUser` with
  `{email, password, customCredential: null, isPersistent: false}`. The reply's `LoginUserResult`
  carries the account id; the session rides on a **cookie**, so one opener with one cookie jar.
* Every call is a `POST` of a JSON body to `<base>/<Operation>`, `Content-Type: application/json`.
  The bases probe.py names: `HarmonyPlatform/DeviceManager.svc/json/`, `AccountManager`,
  `GlobalDeviceManager`, `ProductsPlatform/ProductsManager.svc/json/`,
  `UserAccountDirectorPlatform/UserAccountDirector.svc/json/`,
  `SyncPlatform/CompileManager.svc/json/`, `AggregationPlatform/AggregationManager.svc/json/`. The user
  feature manager is elsewhere, and a guess at the usual base answers 404 with an empty body.
* **Look in both listings before concluding a call does not exist.** The service's Discovery listing,
  `responses/Discovery_GetJsonOperations.json`, and MyHarmony's proxy,
  `reference/logitech/data-model/operations.json`, each name operations the other does not, and
  neither is the whole surface: [what can be asked of it](../../../reference/logitech/service.md#what-can-be-asked-of-it).
* **The account scoped addresses want a GET**, and that is the exception to the rule above:
  `.../json/Account/<accountId>/<Name>` answers **405** to a POST. `probe.call` takes a `method`
  argument for it, with the refusal list unchanged and still running first. On the
  `UserAccountDirector` base, `ActivityList` and `FunctionList` answer a GET normally, and
  `ProtocolList`, `DeviceList` and `CapabilityList` do not: a GET to any of the three answers a bare
  gateway error page with status **502** on an account that holds devices, reproducibly on both
  accounts, and 200 with an empty body on an account that holds none, while a POST answers 405 like
  every account scoped address. The proxy's own name, `UserAccountDirector/GetProtocolList`, answers an
  error page as well, so the catalogue's protocol definitions cannot be had by any name or verb tried,
  [the data model](../../../reference/logitech/data-model/model.md). That is the service being broken
  rather than the request being wrong, and the two that answer are the control that says so.
  **`FunctionList` is the one worth knowing**: it is the layer that names a device's commands, which no
  configuration holds, [what a device's commands are called](../../../reference/logitech/service.md#what-a-devices-commands-are-called).
  Test accounts' contents change, so a capture of it is evidence about a moment:
  `tests/test_function_maps.py` reads dated copies and section 220 says why.
* Some requests need a WCF contract marker, `__type: 'SomeRequest:#Namespace'`, or the formatter
  binds only the base class and reports a missing field that is plainly in the payload. Read the
  shape off a client's own call site rather than guessing, which is how `migrate.py` got its payload.
  **Read MyHarmony's**, per the section at the top: its generated proxy in
  `xap/*/Web.Data.HarmonyPlatform.dll` names every operation and its argument properties, findable by
  searching the assembly for the operation name and reading the identifiers around it.
  `../lab/software/desktop-webapp/` is where `migrate.py`'s payload came from and it is the fallback
  now, not the first stop.
* Traps: `GetAccountProducts` answers XML (an error page), `SimpleRestGetHouseholdProducts` answers
  an empty body. `GetMyHousehold` is the read that actually lists an account's remotes.

## The two accounts

**Read the two address keys in `credentials.env` before assuming which selector is which**, and check
the `Email` field of each account's own `GetMyHousehold`: this section once named the wrong account as
the real, read only one, and the map is `docs/test-notes/accounts.md`, which also says what each holds.
**Neither account is read only.** The standing rule is per operation and not per account: reads freely
on both, writes only through an existing named door, and a new kind of write needs a go-ahead each
time. When an account is full and the question is which record can go, the disposable records and the
protected one are in that file.

### The trap: a record's skin field does not name the model

**`GlobalRemoteSkinId` is not the model.** It reads 22, the Harmony 525, on every record created with
that remote's serial, whatever model the record is for; the model the client shows comes from the
record's `ProductIdentifier`, `LastProductIdentifier` and `OriginalProductIdentifier`, and the 525 is
not a MyHarmony model at all. The measurement is `docs/test-notes/accounts.md`. So when the question is
which remote to remove, answer from what the records hold, a remote plus devices plus activities, and
from what the client shows, never from a skin field.

Do not trust the client's view either, in the other direction: it hides models it does not support
(it cannot show a Harmony 525 at all, section 135), so the service can hold records the screen never
shows. `GetMyHousehold` is the read that lists them; **look before answering**, because this question
was got wrong four times in a row on 27 August 2026 by reasoning instead of querying.

## What the service gives us, operation by operation

What each operation is and what it answered is [the service](../../../reference/logitech/service.md);
this list is how to use it and what to watch for.

* **The device catalogue opens for a plain login** with no registered remote:
  `SearchGlobalDevices` then `GetGlobalLanguageCommands`. What it serves is **symbolic**, a family name
  and a frame value, [the device catalogue is its own call](../../../reference/logitech/service.md#the-device-catalogue-is-its-own-call);
  a frame is rebuilt through the rhythm table `packages/codec/src/protocols.ts`.
* **`ProductsManager/GetAllProducts`** is the product table, [which remotes the service serves](../../../reference/logitech/service.md#which-remotes-the-service-serves).
  Its `MaxDevicesPerAccount` is adopted into `packages/usb/src/models.ts`. `CompilerArchitecture` is
  null on every record; do not go looking for the architecture map there again.
* **The compile runs server side with the remote unplugged**: `compile.py` queues it, the reply carries
  a `DownloadUrl`, and swapping `/RemoteConfiguration` for `/json2/RemoteConfigurationInJson` fetches
  the same compilation as a ZIP, [compiling](../../../reference/logitech/service.md#compiling). Two
  compiles of one account are not the same file unless they share a build stamp, so a diff between two
  compiles is mostly noise and not the change that was made.
* **`DeviceManager/UpdateMultiple`** puts a catalogue device on an account, which is how the protocol
  families got their measured rhythms (sections 160 to 163). It is behind the device door. A device
  added this way arrives with its input and power records already complete
  (`UserFeatureManager/GetUserFeatures`), so nothing else is needed before an activity names its
  inputs, measured on seven devices on 8 October 2026.
* **Which activity each activity key starts is a button map**, saved through `SaveButtonMaps`, section
  340, [button maps](../../../reference/logitech/service.md#button-maps). **A device's "keep on when
  switching Activities"** is `IsPoweredOnBetweenActivities` in its power feature, saved with
  `UserFeatureManager/SaveUserFeatures` behind `MYHARMONY_ALLOW_FEATURE_WRITE`, `build-setup.ts --stage
  options`.
* **`UserAccountDirector/SaveActivities`** puts an activity on a record, one call per activity,
  behind its own door, `MYHARMONY_ALLOW_ACTIVITY_WRITE`. Read off MyHarmony's activity wizard and
  first sent on 8 October 2026 by `packages/corpus/bin/build-setup.ts`, four activities, each
  accepted and listed back. `packages/corpus/src/setup.ts` holds the payload and what each field
  means; the service fills in the ids, the power order, the start screen and the group itself.
* **A compile can hang at `Compiling`**, and on 8 October 2026 one polled for about fifty answers
  ended in `ErrorCode` 3, "Internal Error", source `DeEncrypt`: the compile was dropped, not
  refused. MyHarmony's own sync then compiled the same record and wrote it to the remote. So the
  route past a hung compile is a sync from MyHarmony, or one fresh compile, never a series of them.
* **`UserAccountDirector/AddRemoteToAccount`** works only with a serial `ValidateRemote` accepts,
  [registering a remote](../../../reference/logitech/service.md#registering-a-remote): a synthetic one is
  refused with `ErrorCode 5` (section 136), so a model nobody here owns cannot be registered, and **a
  contributor's serial is never used**: their hardware's identity is theirs. A remote given to the
  project is not a contributor's: the friend's Harmony One and Harmony 525 are the project's, serials
  included, decision 21, so either may be registered, synced or put at risk of a block; the friend's
  One is linked to the first test account and carries its legacy setup since 11 October 2026.
* **`AccountManager/RemoveAccountFromHousehold`** is the one write with an undo character:
  `cleanup.py` uses it and refuses any record holding a remote, a device or an activity unless
  named explicitly with `--record`.
* **`infraredAnalysisManager/AnalyzeInfrared`** is the analyser, the second opinion behind
  `make analyze`. **Retired as evidence for a rhythm** (sections 160 and 162),
  [the analysis service](../../../reference/logitech/service.md#the-analysis-service). Lab captured
  codes **may** be sent to it; that permission is standing, do not re-ask.
* **A catalogue device's features**, power, inputs and the hold time of a power command, which the
  third party archive carries itself since its schema version 2, so read it there first: `UserFeatureManager/CopyFeaturesFromGlobalDevice` with
  `deviceId` 0 and `globalDeviceVersionId.Value` set to the archive's own `globalDeviceId`. Measured
  a read on 1 October 2026, section 305, with the account record identical before and after; the
  version id an account record names is refused. `GetGlobalFeatures` answers access denied.
  Two more catalogue reads answer on the `GlobalDeviceManager` base, both keyed by the **version id**
  (`Value` plus `VersionId`, as `CopyFeaturesFromGlobalDevice` reports it): `GetGlobalDevices` with
  `deviceVersionIds`, the entry's delays and minimum repeats, and `GetInputInfo` with `versionIds`, its
  input type and named inputs. `DeviceManager/GetGlobalDevices` with plain ids answers an internal
  error. Replies in `responses/20261001-catalogue-reads/`.
* **Button maps**: `UserButtonMappingManager/GetButtonMaps`, [button maps](../../../reference/logitech/service.md#button-maps).
  The drawings' scan codes came from it, through the calibration account, `docs/test-notes/accounts.md`.

## There is a second service, and it serves firmware

The **software update service**, `sus.dhg.myharmony.com`, hands out firmware images to an anonymous
request: its endpoints, channels, the factory route and what it serves are
[the update service](../../../reference/logitech/update-service.md). Section 196.

**How it was found, because that is the part that is easy to lose**: both MyHarmony clients carry a
hidden recovery tool, reached with **Alt-F9** after signing in to Silverlight MyHarmony and with shift
plus double click on the title bar in Harmony Desktop (`app.desktopFlow.RRTmenu()`). They are not the
same tool, and what each offers is
[the recovery tool that names it](../../../reference/logitech/update-service.md#the-recovery-tool-that-names-it).

**The request needs `Logitech-SUS-Key`.** Its forty character value is hardcoded as `susKey` in
`../lab/software/desktop-webapp/en.desktop-app-main.js`. Read it from there at the time of use, do not
copy it into a document, and never into this repository.

**This is the trap that cost a day.** Without the header every path answers 404 or 403, which was
recorded as the service being gone. A service that 404s an unauthenticated request is
indistinguishable from a service that no longer exists, so before concluding a Logitech endpoint is
dead, find a client that calls it and copy its headers.

**A wrong channel name is not an error.** Two channels exist, `production` and `preview`, and any other
name returns the production build with no error, so a wrong channel gives a wrong answer rather than a
failure. Any claim about a channel needs two names that disagree.

**MyHarmony's generation does not ask this service**: it reads a version list on Logitech's file
server, whose images are gone, [MyHarmony's own version list](../../../reference/logitech/update-service.md#myharmonys-own-version-list).
The list is filed in the lab's `firmware/packages/versiondb/`. Whether the missing images are where
MyHarmony's sync of the 600 and the 700 stopped is not established, and the bench Harmony 650 does not
fit that reading, `docs/test-notes/harmony-650.md`.

**What is already downloaded, so nobody fetches it twice**: eleven images in
`../lab/firmware/packages/sus/`, with a `META.md` and a `MANIFEST.json` of sizes, digests and source
URLs; the digests are also published in `docs/checksums.md`. The one that matters to this project is
skin 104, the Harmony 300 and 350 firmware, which `tests/test_harmony_350_firmware.py` pins,
[its page](../../../reference/architectures/harmony-300-350/firmware.md). The Linux generation's images
are [that generation's firmware](../../../reference/architectures/harmony-touch/firmware.md); only the
hubs' package has been opened, so the remotes' processor is not known. **`xmppupdate` is
unidentified**, and both hub images are in the lab, so comparing them is what would settle it.

## A remote's serial can be blocked, and a harvest did it

**Read this before any write to either account.** On 7 October 2026 the family harvest of
`todo-secure-logitech.md` 2.2 got the **spare Harmony One** blocked by Logitech's service, after about
42 device adds with their removals on the one entry carrying its serial; Logitech lifted the block,
reported on 12 October 2026. The remote kept working over USB, because the block is on the service's
side; what is lost while it lasts is everything that goes through their service for that serial. The
Harmony 525's serial was found blocked the same day. What happened, step by step, which entry carries
which remote's serial, and the stated quota that may be what was hit, is `docs/test-notes/accounts.md`.
**Not known**: the threshold, whether it counts adds, removals or both, whether a time window applies,
and whether a block is ever lifted by itself.

### The rules this leaves

* **Know whose serial an entry carries before writing to it**, by comparing its serial fields with the
  lab's `units/`, and treat a write as spending that remote's access to the service. **Compare the last
  eight bytes of each GUID**: the service writes the first three groups in a different byte order from
  the identity block, so a whole GUID comparison matches nothing, which is how the harvest's entry was
  wrongly cleared. Never write to an entry carrying the everyday Harmony One's serial.
* **`ErrorCode` 5 means stop.** Never split a batch around it and never retry it; `harvest.ts` stops
  at it. It is the only warning that came before the block.
* **Volume per entry stays far below what triggered this**, about 42 device adds with their removals
  on one entry in one sitting. The safe number is not known, so the plan that resumes the harvest
  chooses one deliberately and spreads it over entries and over time.
* **There is no made up serial to fall back on.** The service validates a serial when an entry is
  registered and refuses an invented one, `ErrorCode` 5 from `ValidateRemote`, measured for a Harmony
  880 and a Harmony 300 in section 136. So every entry that can compile carries a real remote's serial.
* **Whether a serial is blocked is a read**: `UserAccountDirector/GetGlobalRemote` with the entry's
  `SerialNumber` answers `IsBanished`, the flag MyHarmony itself checks before a sync. The flag only
  shows a block after the fact, so it protects nothing by itself.

## Rails that do not bend

* Nothing here ever syncs a config to a remote. The compile is taken as a **file**; the sync step
  is the desktop application's and is not implemented.
* **Per operation, not per account**: reads freely on both, writes only through an existing named
  door, and a new kind of write needs a go-ahead each time. This rail used to read "account 1:
  reads only", which named the wrong account and has been withdrawn: see the accounts section.
* The update service is **read only by nature** and stays that way. Fetching an image is a download;
  putting one on a remote goes only through the firmware rails in `CLAUDE.md`, never through this
  service. Its key is Logitech's, read from the mirrored client at the time of use, never copied into a
  document and never into this repository.
* The evidence directories are append only in spirit: a rerun that would overwrite a captured reply
  used as evidence gets a new name.
* Credentials never leave the lab, never appear in output, and nothing from the service that embeds
  an account identity is committed to this repository.
* The service's existence changes no hardware rail: remotes are irreplaceable and the service can
  vanish, so "Logitech could restore it" is never an argument for a risky write.
