---
name: myharmony-service
description: How to talk to Logitech's live MyHarmony service, read only by default, with the account map, the API mechanics, the rails and the traps. Use before any session that logs in, fetches the device catalogue, compiles a config, registers or removes anything on an account, or reasons about what an account holds.
---

# Logitech's live service: the instrument, the accounts, the rails

Everything below has been relearned at least once by a session that did not know it. The service is
**alive** (`svcs.myharmony.com`, measured since 7 August 2026, section 56); what is discontinued is
the classic `members.harmonyremote.com` service for the 7.x software. It can be withdrawn without
notice, which is one of the two reasons the hardware rails never relax because of it.

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
  list is `responses/Discovery_GetJsonOperations.json`.
* Some requests need a WCF contract marker, `__type: 'SomeRequest:#Namespace'`, or the formatter
  binds only the base class and reports a missing field that is plainly in the payload. Read the
  shape off the desktop app's own call site in `../lab/software/desktop-webapp/` rather than
  guessing (that is how `migrate.py` got its payload).
* Account scoped REST style reads exist too: `UserAccountDirector` accepts
  `Account/<accountId>/DeviceList` and friends as the path.
* Traps: `GetAccountProducts` answers XML (an error page), `SimpleRestGetHouseholdProducts` answers
  an empty body. `GetMyHousehold` is the read that actually lists an account's remotes.

## The two accounts

**Account 1 is Danny's real account.** Real remotes, real history. Read only, always; nothing was
ever authorised against it beyond reads.

**Account 2 is the throwaway created for calibration**, and it is where every authorised write has
happened. What it holds (verified live on 27 August 2026): **one real remote**, the spare Harmony
One, synced 23 August, carrying the ten appliances the rhythm and favourites campaigns used; and
**sixteen registration records that were never synced**, left by our own experiments (the Harmony
525 probing of 13 August, sections 135 and 136, and the made-config campaigns of 23 and 24 August:
favourite channels, the number sender, the sequence, the protocol rhythms, which registered records
for models such as a Harmony 600, 650, 700 and a Harmony 200 EMEA and migrated devices onto them).
The client shows those sixteen as "Remote set up in progress". They are disposable; everything they
produced is archived in the lab. **The One+ record and the devices on it are evidence and are
protected by name in `cleanup.py`'s `PROTECTED` list.**

Do not trust the client's view of an account: it hides models it does not support (it cannot show a
Harmony 525 at all, section 135), so the service can hold records the screen never shows. Do not
trust a remote record's skin fields against what the client displays either; the record carries
`OriginalProductIdentifier` and `LastProductIdentifier` as well, and the mismatch between those
fields and the client's rendering is measured and **unresolved**.

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

## Rails that do not bend

* Nothing here ever syncs a config to a remote. The compile is taken as a **file**; the sync step
  is the desktop application's and is not implemented.
* Account 1: reads only. Account 2: reads freely, writes only through an existing named door, and a
  new kind of write is Danny's decision each time.
* The evidence directories are append only in spirit: a rerun that would overwrite a captured reply
  used as evidence in `docs/findings.md` gets a new name.
* Credentials never leave the lab, never appear in output, and nothing from the service that embeds
  an account identity is committed to this repository.
* The service's existence changes no hardware rail: remotes are irreplaceable and the service can
  vanish, so "Logitech could restore it" is never an argument for a risky write.
