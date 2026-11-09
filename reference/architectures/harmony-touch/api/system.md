# Harmony Touch API: system

The system requests are the button presses, the engine's own system information and usage events, the
firmware names kept under `harmony.`, the manual sync of an older client and the crash log. The button
presses are what the remote's own screens send for every key and every touch, and the log and usage
requests are theirs as well; the rest answer a client that asks. None of them is sent in a sync by
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
| `control.button?press` | queues a button press | action | `HasUsageLog`, `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `control.button?fire` | queues a button press sent once | action | `HasUsageLog`, `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `control.button?hold` | queues a hold report of a button held down | action | `HasUsageLog`, `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `control.button?release` | queues a button's release | action | `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `harmony.system?systeminfo` | answers the engine's system information: architecture, skin, firmware, unit | read | `Default` |
| `harmony.system?usagelog` | records usage events | change | `HasParams`, `Default` |
| `harmony.firmware` | the firmware update machine, the twin of `setup.firmware` | action | `Default` |
| `harmony.firmware?updateneeded` | the twin of `setup.firmware?updateneeded` | read | `Default` |
| `harmony.firmware?updateinprogress` | the twin of `setup.firmware?updateinprogress` | action | `Default` |
| `harmony.firmware?packageinstall` | the twin of `setup.firmware?packageinstall` | action | `Default` |
| `harmony.firmware?packageremove` | the twin of `setup.firmware?packageremove` | action | `Default` |
| `harmony.firmware?packagemanifest` | the twin of `setup.firmware?packagemanifest` | read | `Default` |
| `harmony.manualsync?issyncrequired` | always answers that no sync is required | read | `Default` |
| `harmony.manualsync?state` | always answers a finished, inactive manual sync | read | `Default` |
| `harmony.manualsync?start` | raises, and so answers 500, doing nothing | read | `Default` |
| `harmony.log?create` | records an event asking for the log | change | `IsFWDownloadComplete` |
| `harmony.log?put` | sends the crash logs to a paired hub and deletes them | change | `IsFWDownloadComplete` |
| `harmony.log?run` | uploads the crash logs on a hub; on a Touch prunes them | change | `IsFWDownloadComplete` |
| `harmony.log?usage` | uploads the usage log, on a hub only | action | `Default` |
| `harmony.log?reset` | resets the count of logs uploaded today | change | `Default` |
| `harmony.log?enable` | turns logging on for named loggers | change | `Default` |
| `harmony.log?disable` | turns logging off for named loggers | change | `Default` |

The kinds are the [API overview's](README.md#the-kinds). **The three log requests that name only
`IsFWDownloadComplete` run no default check at all**, since a list of checks replaces it; on a Touch that
check passes, so the difference shows only on a hub[^t-touch-api-setup].

## Buttons

What a press does once it reaches the engine, which map and button it names, the long press, the number
pad and sequences, is [activities and buttons](../activities-and-buttons.md#how-a-key-press-becomes-a-command);
this section is the request itself. **The answer comes before any command is sent**: each of the four queues
an event and answers 200, and what the press did reaches the client later as a separate response, or as an
announcement[^t-touch-api-setup].

### `control.button?press`

**Queues a press.** Parameters, read by the handler and the event it queues[^t-touch-api-setup]:

* `equadId`, required: the identifier of the screens' map family, 16417 on a Touch, which the map's name
  starts with; without it the answer is 504
* `buttonKey`, the button's name, or `indexInMenu`, a screen entry's place, used when there is no
  `buttonKey`
* `deviceId`, optional: present in device mode, naming the device whose map is used
* `functionGroupType`, optional: 2 takes the button from the number pad
* `sequenceId`, optional: runs a sequence of the map instead of a button, used when no button is named
* `hidCode` and `cursor`, optional: a keyboard code sent to a Bluetooth device instead of a button
* `timestamp`, optional, the client's time of the press in milliseconds, and `tsTimeout`, optional: a press
  whose timestamp is more than `tsTimeout`, default one second, behind the engine's running estimate of the
  client's clock is dropped; without a `timestamp` the engine stamps the press with its own time
* `keyLatency`, optional, default 0, passed to the infrared sender
* `ule` and `ulem`, optional usage events, taken by the `HasUsageLog` check

It answers 404 when the button is an activity's and that activity is already queued or starting, so a
second tap does not start it twice. A sequence the map does not hold is announced as finished with error 563
under the name `control.button?sequenceFinished`; a short press of a button that also has a long press is
announced under `control.button?pressType`. **Both are announcement names, not requests**: the screens
subscribe to them and the engine registers neither[^t-touch-api-setup]. A button named `DumpLog` that no map
holds sends nothing: its press starts a timer, and its hold handling, past four seconds, records an event
for Logitech's log service and shows the screen for submitting logs; what follows on that screen is not
checked[^unchecked].

### `control.button?fire`

**The same press, sent once.** It takes the parameters of `control.button?press` and queues the same event
with the status `fire`: the infrared sender sends the command once, complete, where a `press` starts it and
a `release` ends it. A button with a long press sends nothing on a `fire` unless a press of it is waiting,
and then sends the short action[^t-touch-api-setup].

### `control.button?hold`

**A hold report.** The screens send one every 300 milliseconds while a key stays down; the engine queues it,
marked as a long press in the usage event, and answers 200. A hold is what fires a long press and what keeps
a held key sending, [activities and buttons](../activities-and-buttons.md#holding-a-key-and-the-long-press)
[^t-touch-api-setup].

### `control.button?release`

**A release.** For a home control rocker key, a `buttonKey` that names a rocker or the home control plus or
minus, it empties the home control queue, sends the release to the home control manager and answers 200.
For any other key it clears the queued hold reports and queues the release, which sends the short action of
a button with a long press when the long press has not fired. It is the one button request without the
`HasUsageLog` check[^t-touch-api-setup].

## System information and usage

### `harmony.system?systeminfo`

**The engine's own system information**, as text: `arch`, always `0x11`, then `skin`, `usb_vendor_id` and
`usb_product_id` from the unit's manufacturing record, `fw_ver`, `fw_type` and `hw_ver`, both `0x00`, and
`unit_id`, joined by colons, with 200. No parameter[^t-touch-api-setup]. **This is what asks the engine for the
architecture number**, over `/sys/hlapi` like every request here, and it passes the default check on a
Touch; why the number is 17 and how it differs from the native program's is
[firmware](../firmware.md#the-architecture-number-the-firmware-reports).

### `harmony.system?usagelog`

**Records usage events.** Parameter `events`, a list, or `event`, one event; each is handed to the usage
log, which keeps it for a later upload. It answers 200[^t-touch-api-setup]. Its `HasParams` check cannot
refuse, [the API overview](README.md#the-checks-before-a-handler). The screens send it.

## Firmware

**The six `harmony.firmware` names reach the same handlers as their `setup.firmware` twins**, with the same
parameters and answers, [setup](setup.md#firmware-and-packages); that page says which of them write or install
firmware or software. The twins differ in one place: `setup.firmware?reboot` has no `harmony.firmware`
twin, and `harmony.firmware?reboot` falls back to the bare `harmony.firmware`, which knows no `reboot` verb
and answers 500[^t-touch-api-setup].

### `harmony.firmware`

The twin of [`setup.firmware`](setup.md#setupfirmware): with the verb `update` it installs an image in the
cache and restarts the remote, with `prepare` it downloads one on a hub, and its other verbs check and
report[^t-touch-api-setup].

### `harmony.firmware?updateneeded`

The twin of [`setup.firmware?updateneeded`](setup.md#setupfirmwareupdateneeded): it always answers that no
update is needed[^t-touch-api-setup].

### `harmony.firmware?updateinprogress`

The twin of [`setup.firmware?updateinprogress`](setup.md#setupfirmwareupdateinprogress); the screens
subscribe to this name, not the other[^t-touch-api-setup].

### `harmony.firmware?packageinstall`

The twin of [`setup.firmware?packageinstall`](setup.md#setupfirmwarepackageinstall): it installs a signed
package and runs its installer[^t-touch-api-setup].

### `harmony.firmware?packageremove`

The twin of [`setup.firmware?packageremove`](setup.md#setupfirmwarepackageremove): it deletes a package
folder by a name it does not check[^t-touch-api-setup].

### `harmony.firmware?packagemanifest`

The twin of [`setup.firmware?packagemanifest`](setup.md#setupfirmwarepackagemanifest)[^t-touch-api-setup].

## The manual sync

These three answer a sync driven by hand from a client and do nothing on this build[^t-touch-api-setup].

### `harmony.manualsync?issyncrequired`

**Always 200 with `false`.** No parameter.

### `harmony.manualsync?state`

**Always 200 with the same text**: the next state inactive, the action to continue, progress one of one and
error 0. No parameter.

### `harmony.manualsync?start`

**Answers 500 and does nothing.** The handler means to announce that the manual sync is done and answer 500,
and raises before the announcement: it reads the request's headers from a variable named for the parameter
table that the function names differently, which is unassigned, so the engine's own error answer, 500, is
what returns[^t-touch-api-setup].

## The crash log

The engine keeps crash logs and update logs in its cache folder and uploads them to Logitech's log service
from a hub; a remote hands them to its hub over the radio[^t-touch-api-setup].

### `harmony.log?create`

**Records an event that the log was asked for**, at information level, and answers 200. No parameter.
Whether the event writes a crash log file of its own is not read[^unchecked].

### `harmony.log?put`

**Sends the logs to a paired hub and deletes them.** On a hub, mode 3, it saves the logs it is given under
`resource` and answers 200 with them. On a Touch[^t-touch-api-setup]:

* in test mode, the file `/etc/tdeenable` present, it prunes the crash logs and answers 201
* otherwise it answers 202 when a transfer is already running; with `userRequest`, it first asks the hub to
  upload what it holds; it then deletes the update logs in the cache, and sends each crash log to the hub
  over the radio as `hot.1.harmony.log?put`, deleting each the hub took, and asks the hub to upload. The
  first failure answers the hub's code; success answers 200

The screens send it when logs are submitted from the remote. With no hub paired the transfer fails and the
logs stay, except the update logs, which are deleted before any transfer[^t-touch-api-setup].

### `harmony.log?run`

**Uploads the crash logs, on a hub.** Parameter `disableUpload`, optional. It answers 202 while an upload it
started less than ten minutes ago runs, and returns no reply when that upload is older, after pruning. Then
it deletes the placeholder logs a failed delete leaves, and: with `disableUpload`, prunes and answers 201;
while a sync runs, prunes and answers 202; in mode 3 with a network, uploads up to the day's limit of 100;
**on a Touch, prunes the crash logs to the newest 19 and answers 201**[^t-touch-api-setup].

### `harmony.log?usage`

**Uploads the usage log, on a hub only**: outside mode 3 it returns at once. It answers 200 either
way[^t-touch-api-setup].

### `harmony.log?reset`

**Resets the count of logs uploaded today**, writing the counter file, and answers 200. No parameter
[^t-touch-api-setup].

### `harmony.log?enable`

**Turns logging on.** Parameters `tags`, a list of logger names, and `mode`, both required, 500 otherwise;
each named logger is set to the mode, a name the logger does not know being skipped. It answers 200
[^t-touch-api-setup].

### `harmony.log?disable`

**Turns logging off** for `tags`, required, 500 otherwise, with `mode` passed along when given. It answers
200[^t-touch-api-setup].

## Not checked

* What the native program does with the log transfer addressed to a paired hub[^unchecked].
* Whether `harmony.log?create` writes a crash log file[^unchecked].
* What older client sends the manual sync requests[^unchecked].
* The hubs' branches of these handlers, read and not checked against a unit[^unchecked].

[^t-touch-api-setup]: Read in the firmware. [The test](../../../../tests/harmony_touch/test_harmony_touch_api_setup.py)
[^unchecked]: Not checked.
