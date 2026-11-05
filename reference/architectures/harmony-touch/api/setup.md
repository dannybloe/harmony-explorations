# Harmony Touch API: setup

The setup requests are how a Harmony Touch is tied to an account, how a sync is started and ended, and
how the remote's firmware and software packages are checked, fetched and installed. Logitech's desktop
client sends the account and sync requests over the cable during a sync, the conversation measured in
[usb.md](../usb.md#provisioning-instead-of-a-compile); the remote's own screens send the content and
firmware requests and listen for the events several of these requests announce. What an answerer must do
during a sync is [answering a sync](../answering-a-sync.md), which this page links rather than repeats.

**Everything here is read in the production firmware 4.15.330, the build a Touch reports for itself**, and
none of it has been sent to a remote by this project[^t-touch-api-setup]. The same engine runs on the other
remotes of the generation and, as a sibling image, on the hubs; where a request branches on the host name
or on the provisioning mode, the page says which branch a Touch takes, host name `juniper`, and the other
branches are read but not checked against a unit[^unchecked]. How a request travels from the cable to the
engine, the shape of every answer, how a name finds its handler, the checks before it, the provisioning
mode and the kinds are the [API overview](README.md#how-a-request-reaches-its-handler); the branch a Touch
takes is that of modes 0 and 1, [the provisioning mode](README.md#the-provisioning-mode).

## The requests

| request | what it does | kind | checks |
|---|---|---|---|
| `setup.account` | answers the stored provisioning: account, remote number, mode, e-mail | read | `Default` |
| `setup.account?isprovisioned` | answers whether an e-mail is stored, and which | read | `Default` |
| `setup.account?provision` | provisions the remote to an account, or stores a provisioning as given | change | `Default` |
| `setup.account?autoprovisionfromhub` | asks a paired hub for its provisioning and takes it | change | `Default` |
| `setup.account?updatesla` | sends account properties to Logitech's service, then fetches the context | change | `Default` |
| `setup.configchanged` | marks the configuration stale and empties the request queue | change | `Default` |
| `setup.setlanguage` | announces a language to the screens | action | `Default` |
| `setup.sync` | starts a sync down and answers when it ends | change | `IsProvisioned`, `IsSyncComplete`, `IsActivityRunning`, `Default` |
| `setup.sync?begin` | starts a sync down after two seconds and answers at once | change | `IsProvisioned`, `Default` |
| `setup.sync?end` | ends the wait of a sync started on a remote provisioned from a hub | change | `IsProvisioned`, `Default` |
| `setup.sync?contentchanged` | raises the content and state version numbers | change | `IsProvisioned`, `Default` |
| `setup.sync?deleteresources` | deletes every stored document and picture | change | `IsProvisioned`, `Default` |
| `setup.syncremotechanges` | hands the remote's own changes up | change | `Default` |
| `setup.content?getchannels` | asks a network device for its channel list | change | `Default` |
| `setup.content?syncchannels` | rewrites the favourites documents from a network device's channel list | change | `HasUsageLog`, `IsSyncComplete`, `Default` |
| `setup.content?getallmetadata` | asks a network device for its metadata | read | `IsSyncComplete`, `Default` |
| `setup.content?getbtsettings` | answers the stored Bluetooth settings | read | `IsSyncComplete`, `Default` |
| `setup.firmware` | the firmware update machine, by verb: check, prepare, status, update, pause, installed | action | `Default` |
| `setup.firmware?updateneeded` | answers that no update is needed, and the version | read | `Default` |
| `setup.firmware?updateinprogress` | announces an update in progress to the screens | action | `Default` |
| `setup.firmware?reboot` | restarts the remote two seconds later | action | `IsSyncComplete`, `Default` |
| `setup.firmware?packageinstall` | installs a signed software package and runs its installer | action | `Default` |
| `setup.firmware?packageremove` | deletes a package's folder by name | action | `Default` |
| `setup.firmware?packagemanifest` | answers a package's manifest | read | `Default` |

The kinds are the [API overview's](README.md#the-kinds). **Six names of this group are registered with no
verb and so take any verb**, [how a name finds its handler](README.md#how-a-name-finds-its-handler):
`setup.account`, `setup.sync` and `setup.firmware`, whose handlers are given the verb, and
`setup.configchanged`, `setup.setlanguage` and `setup.syncremotechanges`; `setup.content` has no bare
registration, so a verb of it that is not registered finds no handler[^t-touch-api-setup]. Six of these names have a twin under
`harmony.firmware` that reaches the same handler, [system](system.md).

## The account

### `setup.account`

**A read of the stored provisioning.** It takes no parameter and answers 200 with an object. When a mode is
stored, the object holds `discoveryServer` and `discoveryServerCF`, the two addresses of Logitech's discovery
service, `accountId`, `email` and `username`, both the stored e-mail, `activeRemoteId`, the remote number,
`mode`, `susChannel`, the update channel, `language` and `se`, always true. When none is stored it holds the
two addresses and `se` only[^t-touch-api-setup]. The discovery address defaults to Logitech's production
service unless the engine was started with another or a provisioning stored one.

Any verb this group does not register lands here, and **Logitech's client reads it first in every sync**, as
`setup.account?getprovisioninfo`, to learn the two numbers it builds the documents' addresses from,
[answering a sync](../answering-a-sync.md#which-request-names-act)[^t-touch-api-setup]. The answer carries the
account's e-mail address.

### `setup.account?isprovisioned`

**Whether the remote holds an e-mail.** No parameter. It answers 200 with `ProvisionStatus` true and
`ProvisionedEmail`, the address, when one is stored, and 551 with `ProvisionStatus` false otherwise. It reads
the address the handler's module loaded at start or was given by a provisioning since, not the preference
file[^t-touch-api-setup].

### `setup.account?provision`

**Ties the remote to an account, and on a Touch erases nothing.** Parameters:

* `provisionInfo`, required: an object, or text holding one as JSON. Read of it: `mode` (a number, or text
  converted to one), `discoveryServer` (optional), `accountId`, `activeRemoteId`, `username` or `email`,
  `authToken`, `susChannel` and `language`.
* `id`, optional: a second provisioning with a different `id` waits in three second steps until the first
  is done.

It answers 202 while a sync, a hand over of changes or a hub's sync conflict runs, and 505 without
`provisionInfo`. Otherwise, in order[^t-touch-api-setup]:

1. A `discoveryServer` is normalised to an `http` address ending in the discovery path and kept for the
   remote; in mode 3 the services are looked up at once and a failure answers 552.
2. **The request queue is emptied**, the remote's own changes waiting to go up included.
3. The stored account, mode, discovery server and remote number are compared with the new ones. On a
   difference the engine means to remove the remote's data folder, and **on a Touch removes nothing**: that
   folder is named by a variable only the `pimentoblue` branch sets, and on every other host the variable
   is unassigned, so the removal is handed no path and returns. Either way the set aside folder of a sync
   is cleared and the preferences reloaded.
4. **On a Touch, modes 0 and 1 go through the account.** The remote reads its own radio identity from the
   native program, its `RFID`, `EquadID` and paired devices, builds a request with its certificate, and
   queues it for the computer as a `POST` to `harmony://AddRemoteByCertificate`; if the radio identity
   cannot be read twice running, it queues `proxy://Abort` instead. The answer the computer writes back is
   handled by a callback: on 200 it takes the remote number from `AddRemoteByCertificateResult-`, stores
   the account, the mode, the update channel, the e-mail and the language, marks the configuration stale,
   queues `proxy://Finished` and announces status 200 with the remote number; on anything else it queues
   `proxy://Abort`.
5. **Any other mode is stored as given**, with the configuration marked stale and nothing queued.

It then announces status 0 and the provisioning on its own name, and answers 200 with `provisionInfo` as
received. The screens subscribe to that announcement[^t-touch-api-setup].

**A Touch keeps its documents through a provisioning.** The removal of the data folder on a difference
is the hubs' host name, `pimentoblue`; on a Touch the old documents stay in the store until a sync replaces
them, which corrects what [answering a sync](../answering-a-sync.md#which-request-names-act) said
before[^t-touch-api-setup][^t-touch-host]. **And a host can store any mode**: on `juniper` a mode other than
0 or 1 is saved without a question, and several handlers then take a hub's branch, among them the resource
read of [proxy](proxy.md#proxyresourceget). What the rest of the engine does on a Touch in a hub's mode is not
checked[^unchecked].

### `setup.account?autoprovisionfromhub`

**Takes the provisioning of a hub the remote is paired with.** No parameter. It asks the hub over the
radio, through the native program, for its provisioning, waiting up to 180 seconds, and answers 501 when
no answer comes and 500 when the hub's answer is not a success. A hub not in mode 3 gives 304 when the hub
is in mode 2 and the remote in mode 1, and 502 otherwise. A hub in mode 3 has its provisioning taken with
the mode changed to 4; when that equals what is stored the answer is 304, and otherwise it goes through
`setup.account?provision` above, which on a Touch stores mode 4 as given[^t-touch-api-setup].

**A Touch's own screens send it** while the remote sits on its charger, every 30 seconds, whenever the remote
is paired or its mode is not 0, until it succeeds; the screens subscribe to its announcement as well. What
the native program does with a request to a hub is not read[^t-touch-api-setup][^unchecked].

### `setup.account?updatesla`

**Sends account properties to Logitech's service.** Parameter `data`, required, the properties as the
service takes them; 505 without it, 202 while a sync, a hand over of changes or a hub's sync conflict runs.
It posts them to the service's account properties operation, signing in again first when the session has
expired, and then fetches the remote's context document from the service and saves it when the service
answers 200 with a tag. A failure answers the service's error code with its messages. **The engine makes
both calls over its own network connection**, which a Touch does not have, so on a Touch it fails; what it
answers there is not checked[^t-touch-api-setup][^unchecked].

## Configuration and language

### `setup.configchanged`

**Marks the configuration stale.** No parameter. It stores the preference `configStale` as true, empties
the request queue and answers 200[^t-touch-api-setup]. The flag is cleared when a sync is committed. While
it is set, `setup.syncremotechanges` discards the remote's own changes instead of handing them up, which is
the "discards it when the remote is stale" of [answering a sync](../answering-a-sync.md#which-request-names-act).
A provisioning sets the same flag.

### `setup.setlanguage`

**Tells the screens a language.** Parameter `language`, optional, default `en-US`; the request's `id` and
`headers` are passed along. It stores nothing: it announces the language on its own name, and the screens,
which subscribe to it, act on it. It answers 200 with no message[^t-touch-api-setup].

## The sync

The two directions of a sync, and what an answerer does between these requests, are
[usb.md](../usb.md#provisioning-instead-of-a-compile) and [answering a sync](../answering-a-sync.md).

### `setup.sync`

**Starts a sync down and answers when it has run**, with any verb, since the bare name takes every verb
that is not registered. Before the checks of the table, nothing; the handler then[^t-touch-api-setup]:

1. outside mode 3, announces status 0 with the remote number and the e-mail on its own name, which the
   screens subscribe to
2. in mode 4, waits until `setup.sync?end` arrives and answers with the code and message it carried
3. answers 202 when a sync is already running, after announcing status 200
4. marks a sync in progress, clearing the set aside folder, **empties the request queue**, the remote's own
   changes still waiting to go up included, and queues the six requests of a sync down, each with the tag
   of the document it holds
5. on a failure, announces status 553 and the messages, aborts the sync unless it had already aborted, and
   answers 553, or the failure's own code, with the messages; otherwise it answers 200

In mode 3, a hub, it refuses with 202 during a hub's sync conflict and with the network's own code when the
hub has no network, before any of the above. Logitech's client sends it as `vnd.logitech.setup/vnd.logitech.sync`,
[usb.md](../usb.md#provisioning-instead-of-a-compile).

### `setup.sync?begin`

**The same sync, started in the background.** It starts a task that waits two seconds and then runs steps
1 to 5 above with nothing to answer, and answers 200 at once, or 500 when the task cannot be started. The
screens subscribe to its name[^t-touch-api-setup].

### `setup.sync?end`

**Ends the wait of step 2 above**, which only a remote in mode 4 performs. Parameters `errorCode`, default
200, and `errorMessage`, default `OK`, become the answer of the waiting `setup.sync`. It answers nothing
itself: the engine returns no reply, so the envelope carries no status[^t-touch-api-setup].
`proxy.abort` sends it internally in mode 4, [proxy](proxy.md#proxyabort).

### `setup.sync?contentchanged`

**Raises two version numbers.** When parameter `value` is present, the content version and the state
version of the engine's state digest go up by one and the digest is saved; without it, nothing happens. No
reply[^t-touch-api-setup]. The digest is what [connect](connect.md#connectstatedigestget) answers.

### `setup.sync?deleteresources`

**Deletes the remote's whole store of documents and pictures**, the folder every document of a sync is
committed to, and resets the store's state, and returns no reply[^t-touch-api-setup]. It takes no parameter
and checks nothing beyond the provisioning. It is the "delete the resources" of
[answering a sync](../answering-a-sync.md#which-request-names-act); what the engine and the screens show
after it, with no configuration left, is not checked[^unchecked].

### `setup.syncremotechanges`

**Hands the remote's own changes up**, the request Logitech's client sends before a sync down,
[usb.md](../usb.md#provisioning-instead-of-a-compile). No parameter. It drops every `get` and `POST` still in
the queue and resets what was marked as handed over; when the configuration is stale it empties the queue
entirely, so the changes are discarded. With nothing left it queues `proxy://Finished` and answers 200.
Otherwise it announces status 0 with the remote number, copies the store aside as a sync conflict, readies
the queued `put` requests for their answers and answers 200; when the queue turns out empty after all it
announces status 200 as well[^t-touch-api-setup]. The screens subscribe to its name.

## Content

These four serve the favourite channels and players of network devices, a Sonos or a Roku among them,
whose plugins the engine carries; which of them a Touch can reach without a network of its own is not
checked[^unchecked]. The favourites documents themselves are
[favourites and settings](../favourites-and-settings.md).

### `setup.content?getchannels`

**Asks a network device for its channel list.** Parameter `uid`, required, the device's own identifier,
whose prefix names its plugin; 504 without it. A plugin's failure answers its own code and message when it
gives both, and 591 otherwise; on success it raises the content and state version numbers, saves the
digest and answers 200 with `channelList`[^t-touch-api-setup]. It writes no document.

### `setup.content?syncchannels`

**Rewrites the favourites from a device's channel list.** Parameters `deviceId`, required (504), a device of
the device list that was found on the network, and `bcNotRequired`, optional. It looks up the device's own
identifier, 590 without one, and its content profile key, 590 without one, reads the stored device and user
favourites documents, 592 when either is missing, and asks the plugin for the channels, 591 or the plugin's
own code on failure. It replaces that service's dial positions in the device document and the stations in
the user document, under the device and under its profile key, and puts both documents through
`proxy.resource?put` internally, [proxy](proxy.md#proxyresourceput), which saves, queues and reloads. It
answers 200[^t-touch-api-setup]. The `juniper` favourites screen sends it.

### `setup.content?getallmetadata`

**Asks a network device for its metadata**: by `uid`, or by `deviceId` when no `uid` is given, looked up as
above (504, 590); parameter `all` is passed to the plugin. 592 when the plugin returns nothing, 200 with the
metadata as JSON otherwise[^t-touch-api-setup]. The `juniper` speaker and now playing screens send it.

### `setup.content?getbtsettings`

**Answers the stored Bluetooth settings**, the preference file `settings` of the engine's own folder, with
200, or 560 when there is none. No parameter[^t-touch-api-setup]. The `juniper` Bluetooth pairing tutorial
sends it.

## Firmware and packages

**Which of these can write or start installing firmware, said plainly**: `setup.firmware` with the verb
`update` installs firmware and restarts the remote, given an image in its cache; with the verb `prepare` it
downloads an image to the remote, on a hub or a remote provisioned from one; `setup.firmware?packageinstall` installs a software package and runs a program from it;
`setup.firmware?packageremove` deletes files by a name it does not check; and `setup.firmware?reboot`
restarts the remote. Each is documented here and nothing is ever sent[^t-touch-api-setup]. The update of a
Touch through Logitech's client goes by a file instead, `/fw/otaupdate`, [firmware](../firmware.md#the-remotes-package).

### `setup.firmware`

**The firmware update machine, one name with six verbs.** Unprovisioned, it answers 551. In modes 2 and 3,
a hub, it serves either the hub or a remote asking through it, chosen by `EquadID` and `hub` among the
parameters. On a Touch, mode 0 or 1, it runs the verb on the engine's software update module and answers
that verb's code and messages with the update status as the body; any other verb answers 500
[^t-touch-api-setup]. The status a verb answers holds, among others, `status`, `currentVersion`,
`newVersion`, `totalBytes`, `bytesDownloaded`, `isCritical` and `canUpdateOta`; `status` is 0 when nothing is
pending, 1 when an update is available, 2 while a remote's image downloads, 3 when it is downloaded, 4 while
a hub's packages download and 5 while a check runs.

| verb | what it does |
|---|---|
| `check` | asks Logitech's update service whether a newer image exists for the remote's skin, unit and version, over the engine's own network connection, and records what the service says in the update log file `fwUpdate.json`; in mode 4 it asks through the hub instead |
| `prepare` | checks when nothing is known, then **downloads the image** to the remote's cache when one is available, in the background, in modes 2, 3 and 4 |
| `update` | when a downloaded image is in the cache, **renames it to `/cache/ota-update.zip` and restarts the remote one second later into the upgrade**; otherwise checks and downloads as `prepare` does, and installs when the download ends |
| `status` | answers the status; and **restarts the remote** when the status is in a state the engine treats as corrupt, an available update whose new version equals the current one with no package named |
| `pause` | turns a remote's download in progress back into an update available |
| `installed` | marks the remote's image installed in the update log and announces `setup.firmware?installed`; 501 when there is no log |

**On a Touch in mode 0 or 1 the engine downloads nothing**: its download step acts in modes 2, 3 and 4
only, and the check needs a network the Touch does not have. So `update` installs only when an image named
`tempOta` with a version is already in `/cache`, which nothing in modes 0 and 1 writes; the native program's
own firmware file lands in `/cache` under another name, `ota-update.zip`, the name `update` renames to.
Whether a Touch can be brought to hold such an image by another route is not checked[^unchecked]. The engine
starts the module with status 0 on `juniper`, without the package list a hub keeps. The screens send `check`, `prepare`, `status`, `update` and `pause` from their
firmware update functions and subscribe to the answers[^t-touch-api-setup].

### `setup.firmware?updateneeded`

**Always says no update is needed.** It answers 200 with a text naming the update as not needed and the
current firmware version, whatever is pending. No parameter[^t-touch-api-setup].

### `setup.firmware?updateinprogress`

**Announces an update in progress.** It announces status 0 on its own name, passing the request's `id` and
`headers`, and answers 200[^t-touch-api-setup]. The screens subscribe to its `harmony.firmware` twin.

### `setup.firmware?reboot`

**Restarts the remote.** The registered name carries its verb, `reboot`, and the handler starts a task that
waits two seconds and restarts the remote, then answers 200 at once. It is refused with 202 while a sync
runs[^t-touch-api-setup]. It is the engine's restart, beside the native program's `/sys/reboot`,
[recovery](../firmware.md#a-configuration-that-fails-to-load).

### `setup.firmware?packageinstall`

**Installs a software package already on the remote.** Parameters `name` and `file`, both required text,
500 otherwise: the package's name and the path of its `.pkg` file. The engine unpacks the package's
signature, checks it over the package's `SHA-1` with the same public key the firmware image is signed with,
[firmware](../firmware.md#the-remotes-package), and refuses an unsigned or altered one. A valid package's
manifest names an installer, which the engine unpacks, makes executable and **runs as a program**, then
moves the result into the package folder `/pkg/<name>/` and loads its plugin. It answers 200 or 500
[^t-touch-api-setup]. The name and the path are put into shell commands as given, before the signature
check, and are not quoted. Whether any package exists for a Touch is not checked; the hubs' packages are
plugins such as the network discovery[^unchecked].

### `setup.firmware?packageremove`

**Deletes a package folder by name, and does not check the name.** Parameter `name`, required text, 500
otherwise. It runs a recursive delete of `/pkg/` followed by the name, as given, and answers 200
[^t-touch-api-setup]. A name holding a parent folder reaches outside `/pkg/`; that is a reading of the command
it builds and has not been run.

### `setup.firmware?packagemanifest`

**Answers a package's manifest.** Parameter `name`, required text, 500 otherwise; 200 with `manifest`, the
package's `manifest.json` decoded, or empty when there is none. A name holding a `/` is taken as a folder
path as it stands[^t-touch-api-setup].

## Not checked

* What Logitech means by each provisioning mode, and what the engine does in a hub's mode on a
  Touch[^unchecked].
* What `setup.account?updatesla`, the firmware check and the downloads answer on a Touch, which has no
  network of its own[^unchecked].
* Whether a Touch can hold a downloaded image in its cache by any route but the file `/fw/otaupdate`, and
  so whether `setup.firmware` with `update` can install anything on one[^unchecked].
* What the native program does with a request addressed to a paired hub[^unchecked].
* What the remote shows after `setup.sync?deleteresources`[^unchecked].
* Whether any software package exists for the remotes of this generation[^unchecked].
* Which network devices a Touch can reach for the content requests[^unchecked].
* The hubs' branches of every handler here, read and not checked against a unit[^unchecked].

[^t-touch-api-setup]: Read in the firmware. [The test](../../../../tests/test_harmony_touch_api_setup.py)
[^t-touch-host]: Read in the firmware. [The test](../../../../tests/test_harmony_touch_host.py)
[^unchecked]: Not checked.
