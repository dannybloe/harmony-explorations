# The Harmony Touch's interface, as an API

A Harmony Touch is not configured the way the older remotes are. An older remote is sent one compiled file
and interprets it, so its reference is mostly the layout of that file. A Touch is a small computer that a
program talks to: the computer opens named channels on the remote, writes requests and reads answers, and
the remote fetches its own configuration through the computer rather than being handed one,
[the platform on the cable](../usb.md). So the Touch's reference is an **API**: the set of things it can be
asked to do, and what it answers.

This folder documents that whole API, in full and not only what the application needs. It was read in the
production firmware, build 4.15.330, which serves the Touch and the rest of this
generation[^t-touch-api]. The behaviour stated is a Harmony Touch's, host name `juniper`; a hub's own image
runs a sibling of this software and is not read. **Eight requests have been sent to one Touch by this project**,
through its request rail: the provisioning read and `harmony.engine?getconfighash`, the four requests of a sync
(`setup.syncRemoteChanges`, `setup.sync`, `proxy.request` and `proxy.response`), `proxy.abort` and
`setup.firmware?reboot`, [answering a sync](../answering-a-sync.md)[^t-touch-first-sync][^t-touch-second-sync]. Every
other request and name is a reading of the firmware, and the pages say where a recorded sync of Logitech's client or
a request of this project measured one. This said "Nothing in this folder has been sent to a remote by this
project"<!--superseded--> until the rail's first reads.

## The two layers

**The native layer** is the set of names the remote's own USB program answers directly: files it reads or
writes, hardware it tests, firmware it takes, and the two names that restart or reset the remote. These are
[the names the remote answers to](names.md), spoken over [the file protocol](../../../usb-protocol/file-protocol.md)
as this generation uses it, [the platform on the cable](../usb.md), and among them is one special name,
`/sys/hlapi`.

**The software layer** is everything reached through `/sys/hlapi`. The remote's own software, the engine,
answers requests grouped into areas, and the sync, the companion app and the remote's own screens all speak
to it the same way: a request names an area and a command, with its arguments, and the answer comes back as
JSON. The areas are the remaining pages of this folder. A request from a computer on the cable arrives with a
fixed client number and is answered back down the same channel, [the engine](engine.md).

The sync is the main user of the whole API, and how it drives both layers is
[the sync](../usb.md#provisioning-instead-of-a-compile); what a host other than Logitech's server would have
to answer is [answering a sync](../answering-a-sync.md).

## Who uses it

* **The sync.** Logitech's desktop client, on a computer at the other end of the cable, writes requests into
  `/sys/hlapi` and reads the answers: it reads the provisioning, asks for the remote's own changes, starts a
  sync, and then reads the remote's queue of web requests and writes the answers back, which are
  [setup](setup.md) and [proxy](proxy.md)[^t-touch-sync]. A firmware update goes to the native name
  `/fw/otaupdate` instead, [the names](names.md).
* **The remote's own screens.** The screens are a second program on the remote, and they reach the same
  engine over a local connection of their own rather than through `/sys/hlapi`: every key press, every
  activity started, every favourite and every firmware check of the remote's own menus is one of these
  requests, which makes them the main user of [the engine](engine.md), [the activity engine](activityengine.md)
  and [system](system.md)[^t-touch-api-engine].
* **A companion app.** Logitech's phone app talks to a hub's copy of the same engine over the network, which
  is why so much of [connect](connect.md) and [home control](automation.md) assumes one; a Touch has no
  network of its own, and what reaches its engine that way is not checked[^unchecked].
* **A factory test.** The `/tde/` names and the infrared, radio and system test names of the native layer
  exist for the production line, [the names](names.md), and so does the software layer's
  `connect.jsonfiletransfer`, which is refused unless a test switch file is present, and it is not present in
  the production image, [connect](connect.md#connectjsonfiletransferget)[^t-touch-api-setup].

## The pages

| page | the area | what it covers |
|---|---|---|
| [names.md](names.md) | the native names | the 54 names the USB program answers, files and actions, and `/sys/hlapi`, the one channel to the software |
| [setup.md](setup.md) | `setup.*` | tying a remote to an account, starting and ending a sync, and checking, fetching and installing the firmware and software packages |
| [proxy.md](proxy.md) | `proxy.*` | the remote's half of the sync: the queue of web requests it wants made, the answers written back, and the endings |
| [connect.md](connect.md) | `connect.*` | who the device is and how it is reached, pairing its radio, scanning for devices, and the state digest clients poll |
| [system.md](system.md) | `control.button`, `harmony.system`, `harmony.firmware`, `harmony.manualsync`, `harmony.log` | button presses, the engine's own system information and usage events, the firmware names, the manual sync of an older client, and the crash log |
| [engine.md](engine.md) | `harmony.engine?*` | what makes the remote do its job: start and stop activities, send commands, change channels, pair Bluetooth, the sleep timer |
| [activityengine.md](activityengine.md) | `harmony.activityengine?*` | starting and stopping activities and, on a hub, running programs; on a Touch only `runactivity` matters |
| [automation.md](automation.md) | `harmony.automation?*` | home control: driving lights, locks and thermostats through their own hubs, which is a hub's job and does little on a Touch |

**The engine registers 120 requests, and each is on exactly one of the seven software pages**: 24 on
setup, 7 on proxy, 19 on connect, 22 on system, 31 on the engine's page, 3 on the activity engine's and 14
on home control's, with no request on a page that the engine does not register[^t-touch-api-closure].

## How a request reaches its handler

These rules hold for every request of the software layer, so the pages link here rather than repeat them.

### The request line and its answer

**A request is one line of text**: the area and the command, `setup.account` or the long form
`vnd.logitech.setup/vnd.logitech.sync`, then its arguments URL encoded after it[^t-touch-sync]. The native
program hands the line to the engine as a web request on the remote's own loopback address and looks at
none of it[^t-touch-host]. The engine's connector for the cable gives every such request the same client
number, `FFFFFFFF`, and registers no connection under it, so a result a handler **queues for later** is
addressed to nobody and does not come back; the request's own immediate answer does,
[the engine](engine.md#how-the-answer-comes-back)[^t-touch-api-engine].

**Every argument arrives as text.** The connector splits the arguments on `&` into names and text values, so
a handler that compares a value with a number or with `true` never matches one sent over the cable. It reads
each name up to the first character that is not a letter, digit or dot, so **a name with an underscore, such
as `current_version`, cannot arrive this way**[^t-touch-api-engine]. A request whose text **opens with `{` is
read whole as one JSON object** instead, placed under one argument, `hbusData`, which only the handlers that
look for it unpack[^t-touch-api-engine]. A request whose text runs past one write is announced first by a
`Content-Length` line, which belongs to the answers a sync writes back,
[answering a sync](../answering-a-sync.md#what-the-remote-checks-of-an-answer).

**The answer is one JSON object**, which the native program hands back after the word `Response` and a
comma[^t-touch-sync]. When the name the handler answers under has the long form, with a slash, as every name
Logitech's client sends does, the object holds `mime`, the name, `errorCode`, the status, `errorMessage`
when there is one, and `result`, the body or null; otherwise it holds `code` and, when there is a body,
`data`; either carries the request's own `id` back[^t-touch-api-closure]. The status is the handler's: 200 for success, 202 for a request refused while
something runs, and the numbers each page lists, while the web layer between the two programs says 200
whatever happened.

### How a name finds its handler

Three rules of the engine's dispatcher decide which handler a request reaches[^t-touch-api-setup]:

* **A name is matched in lower case**, so `setup.syncRemoteChanges`, the spelling Logitech's client and the
  screens use, is the registered `setup.syncremotechanges`.
* **A verb that is not registered falls back to the name without it.** `setup.account?getprovisioninfo`,
  which is what Logitech's client sends, is not registered and reaches `setup.account`, whose handler is
  given the verb. The pages say per request which names are registered bare and so take any verb.
* **The long form names the same request**: the last dotted word on each side of the slash is the area and
  the command, so `vnd.logitech.setup/vnd.logitech.sync` is `setup.sync`.

**A name the engine does not register is handed back to the native program when it holds one of six
prefixes**, `sys.`, `ir.`, `rf.`, `bthid.`, `wifi.` and `hid.`, anywhere in the name; it goes over the
remote's internal bus with the default check alone, and the native program's answer comes back as the
request's[^t-touch-api-closure]. The native program's names carry engine names of that shape, among them
`sys.reboot` and `sys.factoryreset`, [the names](names.md#the-whole-table). **What the native program does
with a name it is handed this way is not read**, so whether a request line can reach those two by this route
is not settled[^unchecked]. Any other unregistered name is answered 500 with no handler.

### The checks before a handler

A request is registered with a list of checks, and the engine runs that list in order before the handler
and stops at the first refusal; one registered with none runs the default check alone, and a list replaces
the default check rather than adding to it[^t-touch-api-setup][^t-touch-api-engine]. On a Touch only a few
of them can refuse:

| check | what it checks | on a Touch, from the cable |
|---|---|---|
| `Default` | the token, policy and scope checks of a hub | accepts every request at once on the host name `juniper`, before looking at a token, a policy or a scope, [answering a sync](../answering-a-sync.md#the-remote-cannot-tell-one-answerer-from-another)[^t-touch-host] |
| `IsProvisioned` | refuses with 501 when no provisioning mode is stored | refuses an unprovisioned remote |
| `IsSyncComplete` | refuses with 202 while a sync, or a hand over of the remote's own changes, is running | a request sent while the computer is itself driving a sync is refused |
| `IsActivityRunning` | refuses with 202 while the engine's state digest marks an activity starting or stopping, or while the engine restarts the last activity after a start up | passes: the engine moves those digest fields itself only in mode 3, a hub's, and restarts the last activity only when its state digest names one, which outside mode 3 it never does, [the activity engine](activityengine.md#the-verifier-only-this-group-uses). A client can still write the status itself through `connect.statedigest?update`, in any mode, and so make this refuse until it is set back, [connect](connect.md#connectstatedigestupdate) |
| `HasUsageLog` | takes the usage events a request carries in `ule`, records each in the usage log and removes them | never refuses; a list arrives only as a table, which a request line's text never is |
| `HasParams` | refuses with 599 when a request has no arguments | never refuses: the engine gives every request an empty set of arguments before any check runs |
| `WaitAccountRegistered` | waits, without refusing, until the engine has made its first attempt to load the configuration after starting | a request sent straight after the remote starts is answered late, not refused; it does not wait for a good configuration, but when that first load raises an error it waits for ever, [recovery](../firmware.md#a-configuration-that-fails-to-load)[^t-touch-recovery] |
| `IsFWDownloadComplete` | refuses with 203 while a hub downloads firmware | passes on the host name `juniper` |
| `IsPimentoBlue` | passes only on the host name `pimentoblue`, a hub's | always refuses on a Touch, with 500 |
| `verifierJsonFileTransfer` | refuses with 594 unless the file `/etc/tdeenable` exists | refuses in production, [connect](connect.md#connectjsonfiletransferget) |

The activity engine's own check, `isValidActivity`, is on [its page](activityengine.md), and home control's
five are on [its page](automation.md#the-verifiers-of-this-group)[^t-touch-api-engine].

### The provisioning mode

Many handlers branch on one stored preference, the provisioning mode. **A Touch synced through Logitech's
client reported mode 0** in the two syncs recorded,
[answering a sync](../answering-a-sync.md#which-request-names-act)[^t-touch-answers]; what Logitech sets on a
Touch in general is not checked[^unchecked].
In the engine, modes 0 and 1 are a remote that talks to the account through the computer, modes 2 and 3 are
the hub's own, and mode 4 is a remote provisioned from a hub; what Logitech means by each number is stated
nowhere in the image[^unchecked]. Unless a page says otherwise, the behaviour described is that of modes 0
and 1[^t-touch-api-setup]. A provisioning stores any mode it is given on a Touch's host name, so a Touch can
be put into a hub's mode, [setup](setup.md#setupaccountprovision); what the engine then does is not
checked[^unchecked].

### The kinds

Every table gives each request a kind[^t-touch-api-setup][^t-touch-api-engine]:

* **read** answers without changing what the remote stores or queues, beyond marking how far a client has
  been handed the request queue, which a new session resets (`proxy.request` alone)
* **change** changes what the remote keeps or believes, its stored documents, its preferences, its request
  queue or its version numbers, without acting outside itself
* **action** acts beyond its own data: restarts the remote, installs or removes software, sends infrared or
  Bluetooth to a device, calls a device or Logitech's service over a network, or announces an event the
  screens act on
* **none**, on the engine's three pages only, a request whose handler does nothing or does not exist

The native names have kinds of their own, among them **forward**, [the names](names.md#the-whole-table).

## What the API will and will not do for this project

The library never opens a Touch the ordinary way, and its requests to this API go through a rail of their
own that carries two reads and the four requests of a sync, and, behind a flag of its own, three recovery
requests, the abort, the delete of every stored document and the restart, and nothing else,
[working on the Harmony Touch](../../../remotes/harmony-touch/usb.md)[^d29]. This said the rail carried the reads
and the sync "and nothing else"<!--superseded-->, before the recovery tier was added. **Two native names act on an open for
reading**, the vibration test names `/tde/haptic/diagnostic` and `/tde/haptic/calibrate`, while the names
that restart or reset the remote act on a bare write,
[the names](names.md#the-names-that-act-on-a-write-and-on-an-open)[^t-touch-api]. So a bare open is not safe
by the model, which is why the library keeps the named door in front of every path not already known to be
inert. Of the requests, the ones that restart the remote (`setup.firmware` with `update` or `reboot`, and the
firmware `status` verb, which can restart into an upgrade), install firmware or software, or delete stored
documents (`setup.sync?deleteresources`) are named on [setup](setup.md#firmware-and-packages); no request of
the engine's three pages does any of those[^t-touch-api-setup][^t-touch-api-engine].

**A stored document can be read back by one route, a reading never run on a unit**[^unchecked]: a resource
put that names a document's address and carries no document, after which the remote hands that document over
in its next request list as if it were going up to the account,
[proxy](proxy.md#can-a-stored-document-be-read-back)[^t-touch-api-setup]. It goes through `/sys/hlapi` and
needs no test switch on the remote, though the library's request rail refuses the resource put today, and it
costs something on the remote: the document's tag becomes the one the put carries, a
configuration document reloads the engine, the state of a sync in progress is reset, and the put stays
queued, across a restart too, until an answer clears it.

**The native name `/data/resource` is not a second route.** Over the file protocol its open carries no `file`
argument and the open fails; its real use is the engine's fetch of one of four documents from a paired hub
over the radio, [the names](names.md#dataresource-the-engines-radio-fetch-of-a-document)[^t-touch-api]. This
corrects an earlier reading that it was a second read back route<!--superseded-->.

Which documents are committed can be confirmed without the put: `harmony.engine?getconfighash` answers the
stored documents' entity tags, [the engine](engine.md#harmonyenginegetconfighash)[^t-touch-api-engine].

## Not checked

* Whether the other products of the generation, and the hubs, answer the same requests the same way; only the
  Touch's branches of the remotes' image are read[^unchecked].
* The per operation detail of the infrared, radio and hub names, [the names](names.md#not-checked)[^unchecked].
* What the native program does with a name the engine hands back to it, and so whether a request line can
  reach a native action that way[^unchecked].
* What reaches a Touch's engine other than the cable and its own screens[^unchecked].
* The read back route on a unit[^unchecked].

[^t-touch-api]: Read in the firmware. [The test](../../../../tests/test_harmony_touch_api_names.py)
[^t-touch-api-setup]: Read in the firmware. [The test](../../../../tests/test_harmony_touch_api_setup.py)
[^t-touch-api-engine]: Read in the firmware. [The test](../../../../tests/test_harmony_touch_api_engine.py)
[^t-touch-api-closure]: Read in the firmware. [The test](../../../../tests/test_harmony_touch_api_closure.py)
[^t-touch-host]: Read in the firmware. [The test](../../../../tests/test_harmony_touch_host.py)
[^t-touch-recovery]: Read in the firmware. [The test](../../../../tests/test_harmony_touch_recovery.py)
[^t-touch-sync]: Measured on a unit. [The test](../../../../packages/usb/test/touch-sync.test.ts)
[^t-touch-answers]: Measured on a unit. [The test](../../../../packages/usb/test/touch-host.test.ts)
[^t-touch-first-sync]: Measured on a unit. [The test](../../../../packages/usb/test/touch-first-sync.test.ts)
[^t-touch-second-sync]: Measured on a unit. [The test](../../../../packages/usb/test/touch-second-sync.test.ts)
[^d29]: Chosen by this project. [Decision 29](../../../../docs/decisions.md#d29)
[^unchecked]: Not checked.
