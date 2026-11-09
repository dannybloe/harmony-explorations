# Harmony Touch API: connect

The connect requests answer who the device is and how it can be reached, pair its radio, scan a network
for devices and keep the engine's state digest, a short summary of what the device is doing that clients
poll. Most of them are a hub's: they assume a network, a companion app or a paired remote, and on a Harmony
Touch several refuse or find nothing to talk to. The remote's own screens send only
`connect.statedigest?update` among them and listen for the digest's announcement; none is sent in a sync by
Logitech's desktop client, [usb.md](../usb.md#provisioning-instead-of-a-compile).

**Read in the production firmware 4.15.330**, the build a Touch reports for itself; nothing here has been
sent to a remote by this project[^t-touch-api-setup]. Where a handler branches on the host name or the
provisioning mode, the page says which branch a Touch takes, host name `juniper` and mode 0 or 1,
[the provisioning mode](README.md#the-provisioning-mode); the other branches are read and not checked against a
unit[^unchecked]. How a name finds its handler, and the checks before it, are
[the API overview](README.md#how-a-request-reaches-its-handler).

## The requests

| request | what it does | kind | checks |
|---|---|---|---|
| `connect.deviceinfo?get` | answers the radio's identity and its paired devices | read | `Default` |
| `connect.discoveryinfo?get` | answers what a client needs to find and identify the device | read | `WaitAccountRegistered`, `Default` |
| `connect.jsonfiletransfer?get` | reads a file of the data folder, in test mode only | read | `verifierJsonFileTransfer`, `Default` |
| `connect.jsonfiletransfer?put` | writes a file of the data folder, in test mode only | change | `verifierJsonFileTransfer`, `Default` |
| `connect.pair` | answers the device's identity, or saves its pairings, or switches its infrared path for a hub | action | `Default` |
| `connect.unpair` | unpairs a radio device, on a hub only | action | `Default` |
| `connect.ping` | answers that the device is alive, echoing the parameters | read | `Default` |
| `connect.resync` | starts a sync down without the checks `setup.sync` makes | change | `Default` |
| `connect.rf?pair` | opens the radio for pairing for 30 seconds | action | `Default` |
| `connect.rf?info` | answers the radio's identity and its paired devices | read | `Default` |
| `connect.ssdp?scan` | scans the network for devices and answers what it found | action | `Default` |
| `connect.ssdp?lastscanresults` | answers the last scan's devices | read | `Default` |
| `connect.ssdp?startbgndscan` | starts a scan in the background | action | `Default` |
| `connect.ssdp?pollbgndscan` | answers the background scan's devices so far | read | `Default` |
| `connect.ssdp?stopbgndscan` | stops the background scan | action | `Default` |
| `connect.statedigest?get` | answers the state digest when its version moved | read | `Default` |
| `connect.statedigest?update` | writes any field of the state digest and saves it | change | `Default` |
| `connect.sysinfo?get` | answers the native program's system information, on a hub only | read | `IsPimentoBlue`, `Default` |
| `connect.powerstate?get` | asks the native program for a power state | read | `Default` |

The kinds are the [API overview's](README.md#the-kinds). `connect.pair`, `connect.unpair`, `connect.ping` and
`connect.resync` are registered without a verb, so every verb reaches them and the handler is given
it[^t-touch-api-setup].

## Identity and reachability

### `connect.deviceinfo?get`

**The radio's identity.** No parameter. It asks the native program for its radio information, trying up to
three times and keeping the first good answer for the rest of the engine's life, and answers 200 with that
information as JSON text, or 501 when the native program does not answer. An answer with any other code
gets no reply at all[^t-touch-api-setup]. The information holds the remote's own `RFID` and `EquadID`, a
`DeviceCount` and the paired `Devices`, each with its `EquadID`, `RFID` and `SkinId`; the same
information is what a provisioning sends with the remote's certificate, [setup](setup.md#setupaccountprovision).

### `connect.rf?info`

**The same radio information, as an object** rather than JSON text: 200 with the data, 501 without an
answer, no reply on another code[^t-touch-api-setup].

### `connect.discoveryinfo?get`

**What a client needs to find and identify the device.** Parameter `format`, optional: `json` gives a JSON
object, anything else a text of `name:value` pairs separated by semicolons. The fields are `email`, `mode`,
`accountId`, `ip`, `port`, always 5222, `uuid`, the unit's own identifier from its manufacturing record,
`hubId`, the skin, `current_fw_version`, `productId`, four fields of the setup session, `setupStatus`,
which is 0 when the configuration holds a device and -1 otherwise, `host_name` and `friendlyName`, the two
discovery addresses, three open API version numbers, `protocolVersion`, `hubProfiles`, `remoteId` and
`oohEnabled`[^t-touch-api-setup]. It answers 200, or 501 when no data could be built.

**Two of its fields come out of a stored document**: the name and the setup session are read from the
context document in the store, when no sync is running; without one the name falls back to the stored
provisioning's, and then to a hub's default[^t-touch-api-setup]. The context document itself is
[favourites and settings](../favourites-and-settings.md#context).

### `connect.ping`

**Answers that the device is alive.** It answers 200 with a text naming the status as alive and the unit's
identifier, followed by every parameter it was given as `name=value`, separated by colons, except
`headers`; the `clientId` the engine adds is dropped, and a parameter `binary` is returned as the binary
part of the answer. The engine's own parameters, such as the transport it adds before the checks, are
echoed too. A parameter whose value is not text or a number makes the handler raise, and the engine answers
500[^t-touch-api-setup].

### `connect.sysinfo?get`

**Refused on a Touch.** Its check passes only on the host name `pimentoblue`, so on a Touch it answers 500
before the handler runs. On that host it asks the native program, or a paired device's, for its system
information and answers it[^t-touch-api-setup]. A Touch's own system information is its file
`/sys/sysinfo`, [the Touch's usb.md](../../../remotes/harmony-touch/usb.md), and the engine's version of it is
`harmony.system?systeminfo`, [system](system.md#harmonysystemsysteminfo).

### `connect.powerstate?get`

**Asks the native program for a power state**, by the command `hot.1.tde.powerstate`, the name a request
to the first paired device carries; 200 with its data, 500 on its time out, 503 on a lost link, 501 on no
answer or anything else. No parameter[^t-touch-api-setup]. What the native program of a Touch answers to a
command addressed that way is not read[^unchecked].

## Pairing

### `connect.pair`

**Three requests under one name, chosen by the parameter `name` and the verb**[^t-touch-api-setup]:

* **`name` is `hub`**: with the verb `pair` the engine sends its infrared to the native path
  `/rf/hot/1/ir/ir_send`, over the radio to the first paired device, instead of the remote's own
  `/ir/ir_send`, sends its status light commands the same way, and asks for the hub's system information
  again; with `unpair` it turns both back. It answers 200. The switch applies to a command that names its
  output ports; one sent to port 0 goes to the remote's own path outside mode 3 whatever the switch says.
  **On a Touch with no hub it would divert that infrared to nothing**, nothing stored records it, and the
  engine sets the remote's own path again when it starts[^t-touch-api-setup]. Which ports a Touch's commands
  name is not checked[^unchecked].
* **The verb `pair` or `unpair`, with a remote number stored**: it queues an action that sends the remote's
  radio pairings to Logitech's service, and answers 200 at once; the service's answer goes to the client
  later as a separate response. The service is reached over the engine's own network connection, which a
  Touch does not have[^unchecked].
* **No verb**: an identity text naming the unit's identifier as the server's identity, the skin as `hubId`,
  `identity`, which is the unit's identifier again when a `name` was given and empty otherwise, a status of
  success, the protocol version, the hub profiles, the product id and the friendly name, which is the
  configuration's context name or `unknown`. It answers 200.

Any other verb, or `pair` and `unpair` with no remote number, answers 500.

### `connect.unpair`

**Unpairs one radio device, on a hub only.** In modes 2 and 3 it takes `deviceIdx`, a number from 1 to 6,
answering 501 when it is missing, not a number or out of range, and asks the native program, or the
paired device's, to unpair that slot. **On a Touch it answers 500 and does nothing**[^t-touch-api-setup].

### `connect.rf?pair`

**Opens the radio for pairing.** No parameter. It asks the native program to pair with a time out of 30
seconds and waits up to 30 seconds for the answer: 200 on success, 501 without an answer, no reply on
another code[^t-touch-api-setup]. What the radio pairs with on a Touch, the receivers this generation sends
to, is not read[^unchecked].

## The network scan

**These five are a hub's.** They run the network discovery plugin, which the image carries at
`tasks/connectserver/plugins/ssdp.lua` and which a package can replace; it searches the network by SSDP,
mDNS and the protocols of a few device makers, and a Touch has no network to search. Each answers 500 with
an empty `scanArray` when the plugin cannot be loaded[^t-touch-api-setup]. What they answer on a Touch is not
checked[^unchecked].

### `connect.ssdp?scan`

**Scans and answers when done**: it starts a background scan, checks every five seconds for up to 35
seconds, stopping early after ten seconds with no new device, stops the scan and waits up to 30 seconds more
for it to end. 200 with `scanResults`, or 588 when nothing was found. No parameter[^t-touch-api-setup].

### `connect.ssdp?lastscanresults`

**The last scan's devices**: 200 with `scanResults`, or 588 when there are none. No parameter
[^t-touch-api-setup].

### `connect.ssdp?startbgndscan`

**Starts a background scan**: 610 when one is running, otherwise 200 at once with the scan running as a
task of its own. No parameter[^t-touch-api-setup].

### `connect.ssdp?pollbgndscan`

**The background scan's devices so far**: 613 when polled within about a second of the last poll, 200 with
`scanArray` while the scan runs, 612 with the last results when it does not. No parameter
[^t-touch-api-setup].

### `connect.ssdp?stopbgndscan`

**Asks the background scan to stop**: 614 with the devices so far when none runs, 200 with them otherwise.
No parameter[^t-touch-api-setup].

## The state digest

The state digest is the engine's summary of itself: its time and time zone, the version numbers of its
state, configuration and content, the account, remote number and mode, the firmware version, whether it has
a network, the running activity and its status, the sleep timer, the sync status and the setup state. The
engine saves it to a file of its own and loads it at start, leaving the state version, the sync status and
the sequence flag out, and clearing a named activity and its status unless the status is 2[^t-touch-api-setup].

### `connect.statedigest?get`

**Answers the digest when it moved.** Parameter `current_version`, a number. It answers 304 when that equals
the digest's state version, and also while the engine has not loaded its configuration or the setup task is
not up. Otherwise it refreshes the time, the time zone offset, the account fields, the firmware version and
the network status, and answers 200 with the digest: as JSON text with `format` `json`, as an object
otherwise[^t-touch-api-setup].

### `connect.statedigest?update`

**Writes any field of the digest.** Parameter `digest`, an object, required: 504 without it. Every key of it
is copied into the digest as given, the state version goes up by one, the digest is saved to its file and
announced to the screens as `connect.stateDigest?notify`. It answers 200[^t-touch-api-setup]. **Nothing limits
which fields**: the activity status is among them, and `IsActivityRunning` reads it, so a digest written
with an activity starting makes `setup.sync` answer 202 until something sets the status back, and since the
start clears a status only when an activity is named, a status written with no activity outlasts a restart.
The screens send it from the first time tutorial[^t-touch-api-setup].

## Syncing

### `connect.resync`

**Starts a sync down with none of `setup.sync`'s checks.** It marks a sync in progress, which clears the set
aside folder, announces status 0 on its name, and queues the requests of a sync down, as
[`setup.sync`](setup.md#setupsync) does; on a failure it announces status 553 and the messages. It returns no
reply, so the envelope carries no status[^t-touch-api-setup]. **What it does not do, and `setup.sync` does**:
it checks no provisioning, no running sync and no running activity, and it **does not empty the queue**, so
the remote's own changes waiting to go up stay queued beside the sync's requests. **On a failure the sync stays
marked as running**, since nothing aborts it, and every request with `IsSyncComplete` then answers 202 until
a sync ends or the engine restarts[^t-touch-api-setup].

## Files

### `connect.jsonfiletransfer?get`

**Reads any file of the data folder, and is refused in production.** Its check answers 594 unless the file
`/etc/tdeenable` exists, which marks a unit in test mode; then 595 without `file` and 596 without `path`.
The handler reads the file `file` in the folder `path`, relative to the engine's data folder `/data`, and
answers 200 with its text as stored, or 598 with the reason it could not[^t-touch-api-setup]. **The production
root filesystem holds no `/etc/tdeenable`**, so on a unit running it as built this request is refused
before the handler; whether a unit can be put in test mode is not checked[^unchecked]. The native name that
creates or removes `/etc/tdeenable` is `/tde/enable`, written over the cable,
[the names](names.md#tdeenable-the-test-mode-switch-the-file-requests-check), so that name, this check and the
data folder form a chain. A name starting with `/` is refused by the engine's file opener; a parent folder in
`path` or `file` is not.

### `connect.jsonfiletransfer?put`

**Writes a file of the data folder, in test mode only**, with the same check. Parameter `content`, required,
597 without it: an object, written as JSON, or text, which must decode as JSON, 598 otherwise, and is
written as given. It writes `file` in `path` as above and answers 200, or 599 when the write
failed[^t-touch-api-setup].

## Not checked

* What the native program of a Touch answers to a command addressed to a paired device, `hot.1.` and the
  rest of the name[^unchecked].
* Whether a Touch can be put in test mode, and so whether the file requests can reach its data
  folder[^unchecked].
* What the network scan and the pairing upload do on a Touch, which has no network of its own[^unchecked].
* What `connect.rf?pair` pairs a Touch with[^unchecked].
* The hubs' branches of these handlers, read and not checked against a unit[^unchecked].

[^t-touch-api-setup]: Read in the firmware. [The test](../../../../tests/harmony_touch/test_harmony_touch_api_setup.py)
[^unchecked]: Not checked.
