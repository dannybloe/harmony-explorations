# Logitech's configuration service

MyHarmony and Harmony Desktop are the programs a person sees, but the work happens on a web service
behind them, `svcs.myharmony.com`. It keeps each person's household: their remotes, the devices each
remote drives, the activities, and what every button does. It keeps Logitech's catalogue of devices
and their infrared codes. And it **compiles**: given an account, it builds the configuration file the
remote runs and hands it back as a file, with no remote attached. The service still answers and still
compiles[^s56][^s58]; the older generation's service, the one the classic desktop software used, is the
one that was switched off[^s56].

This page describes that service as a client meets it: how a request is made, what can be asked, and
what the answers have been. What the service **stores**, entity by entity and field by field, is
[the data model](data-model/model.md). Which remotes it serves is [the product line](product-line.md).

## How a client talks to it

**It is JSON over HTTP, not SOAP.** The endpoints are WCF `.svc` addresses, which suggests an
envelope, but the client sends a JSON body to a URL under `json/` or `json2/`, and the word `soap`
appears nowhere in it[^t-host-client]. Every call is a `POST` of a JSON body to
`<service base>/<operation>`[^s132].

**A login comes first and the session rides on a cookie.** `LoginUser` answers with the account's
identifiers; a login with no household behind it answers `AccountId: 0` and `HouseholdId: null` and
still opens the device catalogue[^s132].

**The account scoped addresses are the exception, and they want a `GET`.** They have the form
`.../json/Account/<account>/<name>`, and a `POST` to one answers 405, "Method not allowed"[^s219].

**Not every operation lives where its neighbours do.** The user feature manager is at
`UserFeaturePlatform/UserFeatureManager.svc/json/` and not on `HarmonyPlatform` like the rest, and a
guess at the usual base answers **404 with an empty body**, which looks exactly like an operation that
has been withdrawn[^s235].

## What can be asked of it

Three sources state the service's surface, and none of them contains another.

| source | operations | services |
|---|---|---|
| Harmony Desktop's web application, as it declares its calls | 78 | 14 |
| the service's own Discovery listing, which answers without a login | 308 | 50 |
| MyHarmony's generated service proxy | 298 | 19 |

The first is a count of one client[^t-host-client], the second is what the service advertises[^s132],
and the third is [the data model's](data-model/model.md#what-can-be-asked-of-it) subject, where the
comparison is made in full[^s219]. **Five of Discovery's services Harmony Desktop never mentions**:
`LIPService`, `CloudApi`, `AWSServices`, `ContentService` and a `TimeServer`[^s132]. **Discovery is
not exhaustive either**: `AddEntertainmentSystemToMyHousehold` is absent from it and answers, its reply
wrapped as `CreateNewAccountInHouseholdResult` rather than under its own name, so a name a client uses
is not always the service's[^s135].

Harmony Desktop's own fourteen, which is the surface one client actually uses: 75 operations declared
through the client's service library and three more built by hand, `Account`, `CheckEasyZapperAccount`
and `GetSmartTVMenuNames`[^t-host-client].

| service | operations | what it is for, from the names alone |
|---|---|---|
| `userAccountDirector` | 18 | the account's products, activity roles and recommendations, plus a plain device search |
| `userButtonMappingManager` | 13 | which button sends which command, per device and per activity, with save and reset |
| `accountManager` | 10 | household, password, ratings |
| `deviceManager` | 10 | the device catalogue, below |
| `security` | 8 | login, tokens, impersonation |
| `remoteManager` | 6 | a remote's properties, pairings, sync status |
| `userFeatureManager` | 3 | a device's features, and copying them from a catalogue device |
| `deletionManager` | 2 | delete devices, delete activities |
| `productsManager` | 2 | a product and its button list |
| `compileManager` | 1 | whether a remote needs syncing |
| `downloadManager` | 1 | the compiled configuration |
| `infraredAnalysisManager` | 1 | analyse a learned infrared code |
| `easyZapperManager` | 0 | bound, and its calls are the hand built ones |
| `softwareUpdateService` | 0 | the same |

## The device catalogue is its own call

**A device and its commands can be fetched without an account record, a remote or a compile.** The
catalogue is `deviceManager`: `SearchGlobalDevices` finds a device and `GetGlobalLanguageCommands`
returns its commands, beside `GetCommands` and `GetAllTeachingCommandsForGivenPowerAndInputTypes`;
`userAccountDirector` has a plain search, `SimpleRestSearchGlobalDevices`, and `userFeatureManager`
has `CopyFeaturesFromGlobalDevice`[^t-host-client]. A plain login is enough to use them, and no
household is needed[^s132].

**What it serves is symbolic**: per command a protocol family name and a frame value, with the raw
pulse field empty on every command fetched[^s132]. A frame becomes a pulse train through the family's
rhythm, [Infrared](../infrared/README.md). How the catalogue names devices and commands is
[the device catalogue](device-catalogue.md).

**A command's code is written in a small grammar**, `G:<family>:(<A>)(<B>)(<C>):<n>`, which
[the families](../infrared/families.md#how-the-catalogue-writes-a-code) sets out whole[^s159].

**A catalogue device's features** are its power behaviour, its inputs and how long a power command is
held. `CopyFeaturesFromGlobalDevice` returns them, asked with device 0 and the catalogue entry's own
version identifier, and it changes nothing on the account[^s305].

**A device on an account keeps its delays in its features, not on its record**: `GetUserFeatures`
returns a power feature per device with a `PowerOnDelay` and a `DefaultPowerOnDelay` in milliseconds,
and an `InterDeviceDelay` per device beside them[^s235]. The configuration carries the current value,
`PowerOnDelay`, and not the default[^s235].

**The service can work out which codes a person's own remote sends.** `deviceManager` declares
`DetectLanguage` and `DetectLanguageForMultiCodeDevice`. The request is a device type and the commands
learned so far, each a name, a code and the raw capture; the reply is one of `Success`,
`NeedMoreCommands`, `Failure`, `NoMatchFound` and `NoMoreCommandExist`, and on `NeedMoreCommands` it
names the next button to press, while on `Success` it carries the identifier `GetGlobalLanguageCommands`
takes. The multi code variant takes a catalogue device in place of the type. This is the flow that had
people press buttons on their original remote during setup[^unchecked].

## Compiling

**A compile runs on the service, with the remote unplugged**, and the result is a file[^s58].
`CompileManager/StartCompileWithLocaleAndSettings` answers with a download address per compilation;
the client rewrites `/RemoteConfiguration` in it to `/json2/RemoteConfigurationInJson` and polls[^s132].
**What comes back is a ZIP, not JSON**: a manifest, `Description.xml`, and `Result.EzHex`, which is a
bare configuration container. The manifest names the intended skin and states the container's trailer
checksum with its seed and algorithm[^s132]. The download operation is not in the Discovery listing:
its address arrives only in a compile's answer[^s132].

**Two compiles of the same account are not the same file.** Two compiles eight minutes apart with
nothing changed differ in two thirds of their bytes[^s132]; two compiles that share a build stamp are
identical[^s154].

**MyHarmony picks a route per product, from the product's declared capabilities.** A product declaring
`LocaleEnabled`, a Harmony One or a Harmony 600, takes the compile route, the call above. A product
declaring provisioning support, a Harmony Touch, takes a provisioning route that marks the
configuration as not required and never compiles at all[^s202][^t-host-client]. So a compile that fails
for a Touch is the service being asked for something that product has no route to.

**A compile for a Harmony 525 ends in an error that names nothing**: the compile is accepted, reports
`Compiling`, and ends `<RemoteConfiguration status='Error' length='0'/>`, where the same session
compiles a Harmony One[^s135]. The product table says why: the 525's product is not enabled, below[^s145].

## Which remotes the service serves

**`ProductsManager/GetAllProducts` is the product table**: 120 records over 97 distinct skins, each
stating a display name, an enabled flag and the device and favourite channel maxima[^t-host-client-service].
Logitech's own list of models is [the product line](product-line.md), and each model's maxima are on its
page under [the remotes](../remotes/README.md).

**Enabled is what decides whether a remote can be set up.** 27 of the 120 records are enabled. They
carry 19 distinct skins, and one of those is skin 0, which nine records of the hub generation carry in
place of a skin of their own[^t-host-client-service]; the other 18 are 54, 66, 69, 71, 72, 73, 74, 75, 78,
79, 80, 81, 97, 99, 102, 104, 106 and 112[^s136]. The list the setup flow reads,
`GetHarmonyProducts`, is exactly those 19 skins, with no exception in either direction[^t-host-client-service].
Skin 22, the Harmony 525, is not enabled, which is why no setup flow offers it and why its compile
fails[^s145].

Harmony Desktop carries two hard coded lists, and they mirror that flag[^s136]:

| list | members | what it decides |
|---|---|---|
| `DesktopAppSupportedProducts` | 16 skins: the 18 enabled ones above less the two hubs, 97 and 106 | whether the application handles a detected remote at all |
| `CompilerProducts` | the same without 99, 102 and 112 | the compiler route or the hub route |

**Two fields that would have answered questions are empty.** `CompilerArchitecture` is null on all 120
records, so the service states no architecture per model. `MaxActivities` is null on every enabled
product but one, the Harmony 350, which states 1; the disabled records carry 255[^t-host-client-service].

## Registering a remote

**A household holds one account record per remote**, and a remote's devices and activities hang off
that record rather than off the household. A remote needs its own record first,
`AccountManager/AddEntertainmentSystemToMyHousehold`, and then
`UserAccountDirector/AddRemoteToAccount` attaches it, taking `remoteInfo: { AccountId, KeyPadLayout,
SerialNumber, SkinId, UsbPid, UsbVid }`[^s135]. The serial is three brace wrapped GUIDs, the remote's
48 identity bytes rendered three times[^s135].

**A record that already has a remote refuses a second** with `ErrorCode 5, Message "1175"`, and a
supported skin is refused the same way, so the number is about the record and not about the skin[^s135].
A remote record for a product that is not enabled is accepted; only its compile fails[^s135].

**A serial is validated.** A made up serial is refused with `ErrorCode 5`, "Remote is invalid bearing
serial Number", from `ValidateRemote`, where a real one passes, so a remote nobody owns cannot be
registered and nothing can be compiled for it[^s136].

## Button maps

**Which button sends what is held as button maps**, one per device and one per activity, and the data
model describes their types: [button maps](data-model/model.md#the-button-maps-which-say-which-button-sends-what).
None of the operations around them mentions a scan code, a key matrix or a keypad: a host names a
button and the firmware resolves the name[^t-host-client][^s48].

**The call that reads them is `UserButtonMappingManager/GetButtonMaps`.** It takes `deviceIds` and
`activityIds` as lists of typed identifiers, `remoteSkinId`, `accountId` and a `surfaceId`[^t-ops].
A surface is not a remote: an account and a remote each carry a list of surfaces, and maps are asked
for by surface[^t-model]. Two other names lead elsewhere.
`UserAccountDirector/GetButtonMaps` is declared too and answers 400 with `AuthorizeActionOnAccount`;
sending a remote identifier in place of the surface answers 400 with `ThrowArgumentNullException`, and
neither names what is missing[^unchecked]. And `RemoteManager/GetButtonMaps` in the Discovery listing is
an alias: its address and its operation are `UserButtonMappingManager/GetDeviceModeButtonMaps`[^t-ops].

**A favourite channel is a button, not a structure of its own.** It is a `SoftRemoteButton` on the
television's own device map, whose action is a `ButtonChannelAction` carrying the channel and naming
the device, and whose menu item places it on a menu called `FavoriteChannels`, with its label in
`TextOnRemote`[^t-host-client-service]. **The channel is text**, `"1"`, `"100"`, `"666"`, so a leading zero
can be authored[^t-host-client-service]. Favourite channels belong to the remote and not to the device:
another remote on the same household driving the same television carries none[^t-host-client-service].
**Saving one channel saves that device's whole map**: before, every device's map was a default named by
a string; after, the edited device's is a stored map with an identifier and the others are still
defaults[^t-host-client-service]. How a channel reaches the configuration is
[the state sections](../config-format/state.md).

**Which activity an activity key starts is a button map too**, saved with `SaveButtonMaps`, each key
holding a short and a long press activity; an activity's type and group do not choose its key[^s340].

**A device record carries options the client asks a person about**, among them
`IsScartCableSupported` beside `IsMultiCode`, `IsKeyboardAssociated`, `IsInterKeyDelayOptimized` and
`Characterization`. What the SCART answer changes in a compiled configuration is not known; the
plausible reading is that it chooses which input command an activity sends[^unchecked].

## What a device's commands are called

The service names a device's commands in **function maps**, one per device and one per activity, read
with the account scoped `FunctionList`[^s220]. That layer is in no configuration, which numbers its codes
and names none. The data model describes it:
[what a device's commands are called](data-model/model.md#what-a-devices-commands-are-called).

## The analysis service

**`infraredAnalysisManager.AnalyzeInfrared` is a protocol decoder that can be called**: it takes a
learned code as durations and answers with a protocol family and a value in the catalogue's own code
grammar, and it answers for any code[^s153]. The client keeps the raw capture beside the answer and
uploads both when a learned command is saved[^unchecked].

**The request is one string**, `{ rawSequence }`: `F` and the carrier in hertz, then one letter and one
duration per interval, `P` for a mark and `S` for a space, each number upper case hexadecimal padded to
four digits, or eight where it does not fit, in microseconds[^t-irda]. The client builds it from a
capture by five rules[^unchecked]:

* **the report**: byte 0's high nibble is `0x90` for data and `0xF0` for done; byte 1's high nibble is a
  sequence that advances by one and wraps at fifteen, and its low nibble is an error code, anything but
  zero aborting the capture; the last byte carries the real byte count; the words are big endian from
  offset 2.
* **the calibration**: the first three words are a first pulse time, a header pulse time and a cycle
  count. The count is decremented, and the carrier is `1e6 / (difference / count)` hertz. The difference
  is then emitted as the first mark, so the header pulse is both the calibration and the first interval.
* **the data**: words alternate a mark's length and a gap that is the total elapsed time, so a space is
  the gap less the mark before it, and a gap shorter than its own mark is dropped. A zero word still
  flips between mark and space.
* **the merge**: two intervals of the same kind in a row are one interval, summed.
* **the stop**: an interval longer than 500000 microseconds ends the capture.

**The format is ambiguous above 65535 microseconds**, since `F` is a hexadecimal digit as well as a
token letter and a field is four digits or eight. On a stored record that only ever matters in the
closing silence: every interval above 65535 microseconds in the configurations measured is a code's own
closing silence, so a code sent up to and including that silence, clamped, fits in four digits
throughout. Cutting before the silence is wrong: a pulse width code's last bit is a mark whose space is
the trailing gap[^t-irda-configs].

**Their analyser is not a judge of a rhythm**: what it gets wrong, and why a family is named by the
catalogue instead, is [the families](../infrared/families.md#a-family-is-named-by-logitechs-catalogue).

## Syncing, and what the record says about it

**A sync is recorded when the client says the session finished, not when the remote was programmed.**
A remote's record carries `FirstSyncDate`, `LastSyncDate` and `IsSyncRequired`. A record has been seen
stating no sync at all, both dates empty and `IsSyncRequired` false, for a remote already programmed by
that account's compile; the next sync to complete wrote both dates to the same second and moved nothing
else[^t-host-client-service]. So what is on a remote is established by reading the remote, and
`IsSyncRequired` is not the field the client's interface keys on[^t-host-client-service].

**The sign in is the fragile half.** MyHarmony signs in through Logitech's central sign in service, and
that front end has been seen refusing every account identically with a bare `400` for a morning, from a
placeholder in its own request, while `LoginUser` on the configuration service accepted the same
accounts[^unchecked].

## Not checked

* What the SCART option changes in a compiled configuration[^unchecked].
* Whether `DetectLanguage` behaves as the client describes; no call to it has been made[^unchecked].
* The request shapes of the button map calls beyond the one that reads them; no test holds a
  request[^unchecked].

[^s56]: Stated by Logitech, by their service. [Section 56](../../docs/findings.md#s56)
[^s58]: Stated by Logitech, by their service. [Section 58](../../docs/findings.md#s58)
[^t-host-client]: Stated by Logitech, in their client. [The test](../../tests/test_host_client.py)
[^s132]: Stated by Logitech, by their service. [Section 132](../../docs/findings.md#s132)
[^s219]: Stated by Logitech, by their service. [Section 219](../../docs/findings.md#s219)
[^s235]: Stated by Logitech, by their service. [Section 235](../../docs/findings.md#s235)
[^s135]: Stated by Logitech, by their service. [Section 135](../../docs/findings.md#s135)
[^s159]: Stated by Logitech, in their catalogue. [Section 159](../../docs/findings.md#s159)
[^s305]: Stated by Logitech, by their service. [Section 305](../../docs/findings.md#s305)
[^unchecked]: Not checked.
[^s154]: Stated by Logitech, by their service. [Section 154](../../docs/findings.md#s154)
[^s202]: Stated by Logitech, in their client. [Section 202](../../docs/findings.md#s202)
[^s145]: Stated by Logitech, by their service. [Section 145](../../docs/findings.md#s145)
[^t-host-client-service]: Stated by Logitech, by their service. [The test](../../tests/test_host_client.py)
[^s136]: Stated by Logitech, by their service. [Section 136](../../docs/findings.md#s136)
[^s48]: Read in the firmware. [Section 48](../../docs/findings.md#s48)
[^t-ops]: Stated by Logitech, by their service. [The test](../../tests/test_myharmony_model.py)
[^t-model]: Stated by Logitech, in their client. [The test](../../tests/test_myharmony_model.py)
[^s340]: Stated by Logitech, by their service. [Section 340](../../docs/findings.md#s340)
[^s220]: Stated by Logitech, by their service. [Section 220](../../docs/findings.md#s220)
[^s153]: Stated by Logitech, by their service. [Section 153](../../docs/findings.md#s153)
[^t-irda]: Stated by Logitech, in their client. [The test](../../packages/codec/test/irda.test.ts)
[^t-irda-configs]: Measured in configurations. [The test](../../packages/codec/test/irda.test.ts)
