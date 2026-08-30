---
name: myharmony-service
description: How to talk to Logitech's two live services, read only by default: the configuration service and the software update service that serves firmware. Carries the account map, the API mechanics, the hidden recovery screens in both clients, the rails and the traps. Use before any session that logs in, fetches the device catalogue or a firmware image, compiles a config, registers or removes anything on an account, or reasons about what an account holds.
---

# Logitech's live services: the instrument, the accounts, the rails

Everything below has been relearned at least once by a session that did not know it. **Three
services, and keeping them apart matters**: the configuration service `svcs.myharmony.com` is alive
(measured since 7 August 2026, section 56); the **software update service** `sus.dhg.myharmony.com`
is alive and serves firmware (section 196, and it needs a header before it will admit to existing);
and the classic `members.harmonyremote.com` service for the 7.x software is discontinued. Any of the
live ones can be withdrawn without notice, which is one of the two reasons the hardware rails never
relax because of it.

## MyHarmony is the reference client, not Harmony Desktop

**Read MyHarmony when the question is which call to make, in which order, with which arguments.** Its
code is `../lab/work/myharmony/xap/`, the Silverlight assemblies, plus `../lab/software/MyHarmony/`.
Danny's instruction of 28 August 2026: everything Harmony Desktop's web application can do MyHarmony
can do too, and better, so a reading off the newer client describes the hub generation rather than the
remotes on this bench.

**And it is decompiled to C# in the lab**, `work/myharmony/src/`, 1999 files across seven assemblies.
Read that, not the compiled DLLs beside it: section 202 was a wrong reading published in four
documents because a method name found by searching an assembly looked like a call site, and the source
was there the whole time.

**What its sync actually does**, section 202, since this is the flow every configuration question runs
into. `SyncRemote` branches on the **product's declared capabilities**: a product with
`LocaleEnabled`, which is a Harmony One or a Harmony 600, takes the compile route and sends
`StartCompileWithLocaleAndSettings`, the same call this project already makes. A product with
`SupportsCertificateActivation` or `SupportsProvisioning`, which is a Harmony Touch, takes a
provisioning route that sets **config not required** and never compiles at all. So a compile that ends
in `status='Error'` for a Touch is the service being asked for an artefact this product has no route
to, rather than a payload this end got wrong. Read the capability list before assuming a remote's
configuration can be fetched: `GetProductCapabilities` on the `UserAccountDirector` base, and the
request is **wrapped**, `{'request': {'accountId': N}}`, because the operation takes one contract
parameter.

**And a sync is not one call.** MyHarmony's sync module works through: has the configuration changed,
save the remote settings, does this remote need a sync, compile, poll for the file, then register the
compile and the sync as successful. A script that sends only the compile is not doing what the button
does, which is the thing to check before concluding a call is broken.

Where Harmony Desktop's mirror is still the only source is the **per skin protocol templates** for the
file based family and the **parameter encoder** in `en.desktop-app-main.js`, both confirmed against
hardware. Reach for it for those and for the `susKey`, and for nothing else.

## The instrument lives in the lab, not in this repository

`../lab/work/myharmony/probe.py` is the client. It handles a credential and talks to a live third
party, which is why it is not in a public checkout. **Do not write a second client**; import probe
and use its `call`, its login and its masking. Everything that matters about it:

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
* Authorised writes sit behind **named doors**, one environment variable each, granted by Danny per
  operation: `compile.py`, `addremote.py` (`MYHARMONY_ALLOW_ADD_REMOTE`), `migrate.py`
  (`MYHARMONY_ALLOW_MIGRATE`), `cleanup.py`, `adddevice.py`. A door is not opened because a task
  would be easier with it; each was authorised once, for the throwaway account, and a new kind of
  write needs his say.

The repository side has two make targets that reach the service and take credentials from
`HARMONY_LOGITECH_EMAIL` and `HARMONY_LOGITECH_PASSWORD` instead: `make analyze` (their analyser
against our decoder) and `make emitcheck` (build a code from their catalogue, ask their analyser to
read it back). Both refuse without credentials and are **never in `make all`**.

## The API mechanics

* Login first, always: `POST` to `CompositeSecurityServices/Security.svc/json/LoginUser` with
  `{email, password, customCredential: null, isPersistent: false}`. The reply's `LoginUserResult`
  carries the account id; the session rides on a **cookie**, so one opener with one cookie jar.
* Every call is a `POST` of a JSON body to `<base>/<Operation>`, `Content-Type: application/json`.
  The bases probe.py names: `HarmonyPlatform/DeviceManager.svc/json/`, `AccountManager`,
  `GlobalDeviceManager`, `ProductsPlatform/ProductsManager.svc/json/`,
  `UserAccountDirectorPlatform/UserAccountDirector.svc/json/`,
  `SyncPlatform/CompileManager.svc/json/`, `AggregationPlatform/AggregationManager.svc/json/`.
* The catalogue advertises **308 operations over 50 services** (section 132); the machine readable
  list is `responses/Discovery_GetJsonOperations.json`. **It is not the whole surface**, section 219:
  MyHarmony's own proxy declares 298 operations over 19 interfaces, with parameters and reply types,
  in `reference/myharmony-operations.json` in the repository, and on the eleven services both describe
  each names operations the other does not. Look in both before concluding a call does not exist.
* **The account scoped addresses want a GET**, and that is the exception to the rule above:
  `.../json/Account/<accountId>/<Name>` answers **405** to a POST. `probe.call` takes a `method`
  argument for it, with the refusal list unchanged and still running first. `ActivityList` and
  `FunctionList` answer; `ProtocolList`, `DeviceList` and `CapabilityList` return a bare **502** on
  both accounts, which is the service being broken rather than the request being wrong, and the two
  that answer are the control that says so. **`FunctionList` is the one worth knowing**, section 220:
  it is the layer that names a device's commands, which no configuration holds, one map per device
  and one per activity. **Both accounts are test accounts whose contents change**, so a capture of it
  is evidence about a moment: `tests/test_function_maps.py` reads dated copies and section 220 says
  why.
* Some requests need a WCF contract marker, `__type: 'SomeRequest:#Namespace'`, or the formatter
  binds only the base class and reports a missing field that is plainly in the payload. Read the
  shape off a client's own call site rather than guessing, which is how `migrate.py` got its payload.
  **Read MyHarmony's**, per the section at the top: its generated proxy in
  `xap/*/Web.Data.HarmonyPlatform.dll` names every operation and its argument properties, findable by
  searching the assembly for the operation name and reading the identifiers around it.
  `../lab/software/desktop-webapp/` is where `migrate.py`'s payload came from and it is the fallback
  now, not the first stop.
* Account scoped REST style reads exist too: `UserAccountDirector` accepts
  `Account/<accountId>/DeviceList` and friends as the path.
* Traps: `GetAccountProducts` answers XML (an error page), `SimpleRestGetHouseholdProducts` answers
  an empty body. `GetMyHousehold` is the read that actually lists an account's remotes.

## The two accounts, and this section was written backwards once

**Read the two address keys in `credentials.env` before assuming which selector is which.** This
file said "account 1 is Danny's real account, read only, always" for a fortnight and it was wrong in
both directions. Corrected 28 August 2026 against the credentials file and against the `Email` field
of each account's own captured `GetMyHousehold`, which is the check to repeat rather than to trust
this table on.

| selector | replies land in | what it is |
|---|---|---|
| 1, the default | `responses/` | a **test account**, whose address says so in its local part. Danny pointed the Harmony Touch work at it by name on 27 August 2026, and it is the account `compile.py` has been authorised against |
| 2 | `responses-account2/` | the account under Danny's own name, and the one that accumulated the calibration records |

So **neither account is read only** and the old rail pointed at the wrong one. The standing rule is
per operation and not per account: reads freely on both, writes only through an existing named door,
and a new kind of write is Danny's decision each time.

**What selector 2 holds** (verified live on 27 August 2026): 17 remote records, of which **one is
real**, the spare Harmony One, synced 23 August, carrying the ten appliances the rhythm and
favourites campaigns used; and **sixteen registration records that were never synced**, left by our
own experiments (the Harmony 525 probing of 13 August, sections 135 and 136, and the made-config
campaigns of 23 and 24 August: favourite channels, the number sender, the sequence, the protocol
rhythms, which registered records for models such as a Harmony 600, 650, 700 and a Harmony 200 EMEA
and migrated devices onto them). The client shows those sixteen as "Remote set up in progress". They
are disposable; everything they produced is archived in the lab. **The One+ record and the devices on
it are evidence and are protected by name in `cleanup.py`'s `PROTECTED` list.**

**The account is full at 17**, which is why "which remote can I remove" is a question that gets
asked. The answer comes from the list above and not from a skin field: see the trap below.

### The trap: a record's skin field does not name the model

**`GlobalRemoteSkinId` reads 22 on every record that was created with the Harmony 525's real
serial**, which is sixteen of the seventeen in selector 2. Read literally, that account looks like
sixteen Harmony 525s. It is not: the client displays a Harmony One+, a 700, a 650, a 700, a 600 and a
600 among them, and the model it shows comes from the record's own `ProductIdentifier`,
`LastProductIdentifier` and `OriginalProductIdentifier`. The 525 is not a MyHarmony model at all, so
"there is a 525 in this account" is never the right answer.

That mismatch is measured and **unresolved**, so when the question is which remote to remove, answer
from what the records hold, a remote plus devices plus activities, and from what the client shows,
never from a skin field.

Do not trust the client's view either, in the other direction: it hides models it does not support
(it cannot show a Harmony 525 at all, section 135), so the service can hold records the screen never
shows. `GetMyHousehold` is the read that lists them; **look before answering**, because this is the
question this skill exists for and it was got wrong four times in a row on 27 August 2026 by
reasoning instead of querying.

## What the service gives us, operation by operation

* **The device catalogue opens for a plain login** with no registered remote:
  `SearchGlobalDevices` then `GetGlobalLanguageCommands`. What it serves is **symbolic**, a protocol
  family name and a frame value, `Raw` null on all 5219 commands censused; a frame is rebuilt from a
  record's own stated timings (section 152) or from the rhythm table `packages/codec/src/protocols.ts`.
* **`ProductsManager/GetAllProducts`** is the product table: 120 records, `SkinId`, `DisplayName`,
  `IsEnabled` (exactly the client's supported list, section 145; false for the Harmony 525, which
  is why its compiles fail), `MaxDevicesPerAccount` (adopted into `packages/usb/src/models.ts`),
  `MaxFavoriteChannels`, `LongPressAction`. `CompilerArchitecture` is null on every record; do not
  go looking for the architecture map there again.
* **The compile runs server side with the remote unplugged** (section 58): `compile.py` queues it,
  the reply carries a `DownloadUrl`, and swapping `/RemoteConfiguration` for
  `/json2/RemoteConfigurationInJson` fetches the same compilation as a ZIP holding a bare `GSPM`
  container plus a manifest (the manifest corroborates the trailer checksum, section 41). Two
  compiles sharing a build timestamp are **byte identical**; otherwise two compiles of one account
  differ in about two thirds of their bytes (section 154).
* **`DeviceManager/UpdateMultiple`** puts a catalogue appliance on an account, which is how the
  eighteen protocol families got their measured rhythms (sections 160 to 163). It is behind the
  device door.
* **`RemoteManager/AddRemoteToAccount`** works only with a serial `ValidateRemote` accepts: a real
  serial off real hardware passes (three brace wrapped GUIDs, the first sixteen `0xEE` bytes on
  every unit read here), a synthetic one is refused with `ErrorCode 5` (section 136). So a model
  nobody here owns cannot be registered, and **a contributor's serial is never used**: their
  hardware's identity is theirs.
* **`AccountManager/RemoveAccountFromHousehold`** is the one write with an undo character:
  `cleanup.py` uses it and refuses any record holding a remote, a device or an activity unless
  named explicitly with `--record`.
* **`infraredAnalysisManager/AnalyzeInfrared`** is the analyser, the second opinion behind
  `make analyze`. **Retired as evidence for a rhythm** (section 160): it names families correctly
  for durations their compiler would never emit, and it is wrong about families outright (section
  162). Lab captured codes **may** be sent to it; that permission is standing, do not re-ask.
* **Button maps**: `RemoteManager/GetButtonMaps` and the `ActivityButtonMap` records, which is
  where `reference/button-maps.md` came from, via the account that generated the calibration
  configs.

## There is a second service, and it serves firmware

Everything above is the **configuration** service, `svcs.myharmony.com`. There is a separate
**software update service**, `sus.dhg.myharmony.com`, and it hands out firmware images to an
anonymous request. Section 196, 28 August 2026.

### How it was found, because that is the part that is easy to lose

Both MyHarmony clients carry a hidden recovery screen, and they are not the same screen.

| | Silverlight MyHarmony, Windows | Harmony Desktop's web application |
|---|---|---|
| reached by | **Alt-F9** after signing in | shift plus double click on the title bar, `app.desktopFlow.RRTmenu()` |
| what it really is | a live page, `https://setup.myharmony.com/remoterecoverytool/DefaultRRT.html`, named by a string inside `MyHarmony.exe` | an `RRTMenu` view inside the mirrored bundle |
| offers | factory and latest firmware for ten products, plus `recoverproducttolatest`, `unpair` and `xmppupdate` | factory reset, update firmware, recover product, unpair |

The older page's buttons each load `recover.aspx?<mode>`, and those pages are byte identical except
for the `Mode=` handed to a Silverlight utility along with
`SUSAddress=https://sus.dhg.myharmony.com, SUSChannel=production, SpecialSUSStream=preview`. The ten
products are the **Linux generation only**: Touch, Ultimate, Ultimate One, Ultimate Home, Elite, 950,
Pro, Home Control, Smart Control, Smart Keyboard. No model of any architecture this project reads is
on that page, and its factory reset installs a whole firmware image rather than sending a command.

### The endpoints, and the header without which they all look dead

The path templates are in `responses/Discovery_GetJsonOperations.json`, already captured:

    https://sus.dhg.myharmony.com/SoftwareUpdatesPlatform/SoftwareUpdates/
        product/{productId}/unit/{unitId}/image/latest?channel=<ch>&criticalOnly=false
        product/{productId}/unit/{unitId}/features
        product/{productId}/unit/{unitId}/info        404 for unit 0
        product/{productId}/unit/{unitId}/streams     404 for unit 0

`{productId}` is the **skin** and `unit/0` is accepted, so no serial and no registered remote is
needed. `image/latest` returns a `GetLatestImageUpdateResult` carrying `Id`, `Size` and a CloudFront
`URI`; fetching that URI needs no header at all.

**The request needs `Logitech-SUS-Key`.** Its forty character value is hardcoded as `susKey` in
`../lab/software/desktop-webapp/en.desktop-app-main.js`. Read it from there at the time of use, do not
copy it into a document, and never into this repository.

**This is the trap that cost a day.** Without the header every path answers 404 or 403, which was
recorded as the service being gone. A service that 404s an unauthenticated request is
indistinguishable from a service that no longer exists, so before concluding a Logitech endpoint is
dead, find a client that calls it and copy its headers.

**Two channels exist and no more**: `production` and `preview`. Nine invented names, `xmpp` and
`xmppupdate` among them, all return the production build **with no error**, so a wrong channel name
gives a wrong answer rather than a failure. Any claim about a channel needs two names that disagree.

There is a second, keyless route for factory images only:
`https://rcbu-prod-ssl-amr.myharmony.com/Firmware/<skin>/firmware_factory.hfw2`, which serves skin 99
and skin 106 and answers 403 for every other skin.

### What is already downloaded, so nobody fetches it twice

Eleven images sit in `../lab/firmware/packages/sus/` with a `META.md` and a `MANIFEST.json` of sizes,
digests and source URLs; the digests are also published in `reference/checksums.md`. **One image
serves a whole family**: skins 99 and 112 are byte identical, as are 97 and 106.

The one that matters to this project is **skin 104, the Harmony 300 and Harmony 350 firmware**: an
ordinary PIC18 image in the same package format as the three `.hfw` files, executing at `0x9000`,
which the existing readers take with no new code, and whose own manifest states the checksum seed and
algorithm section 41 derived from config containers. `tests/test_harmony_350_firmware.py` pins it.

Eight skins have no image on either channel: 78 and 104 by this route, 98, 101, 107, 109, 113, 114.
The Linux images are ARM with a squashfs root and reading them needs squashfs-tools, not installed.

**`xmppupdate` is unidentified.** It is the only mode with no product name, and the hub's preview
build is 4.15.250 against production's 4.15.600, which fits the public episode where XMPP was removed
and then restored as a developer option. Not established: no feature flag on either channel names
XMPP, and `SpecialSUSStream=preview` appears in every mode. Both hub images are in the lab, so
comparing them is what would settle it.

## Rails that do not bend

* Nothing here ever syncs a config to a remote. The compile is taken as a **file**; the sync step
  is the desktop application's and is not implemented.
* **Per operation, not per account**: reads freely on both, writes only through an existing named
  door, and a new kind of write is Danny's decision each time. This rail used to read "account 1:
  reads only", which named the wrong account and has been withdrawn: see the accounts section.
* The update service is **read only by nature** and stays that way. Fetching an image is a download;
  installing one on a remote is not this project's business and no remote here has ever been written
  to. Its key is Logitech's, read from the mirrored client at the time of use, never copied into a
  document and never into this repository.
* The evidence directories are append only in spirit: a rerun that would overwrite a captured reply
  used as evidence in `docs/findings.md` gets a new name.
* Credentials never leave the lab, never appear in output, and nothing from the service that embeds
  an account identity is committed to this repository.
* The service's existence changes no hardware rail: remotes are irreplaceable and the service can
  vanish, so "Logitech could restore it" is never an argument for a risky write.
