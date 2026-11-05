# Harmony Touch API: the engine's requests, `harmony.engine?*`

These are the requests that make a Harmony Touch do what it is for: start and stop an activity, send a
command, change a channel, fix a device that fell out of step, pair a Bluetooth device, run the sleep timer.
**The remote's own screens are their main user**: a tap on an activity, a favourite channel or the help
screen is one of these requests, sent by the screens to the engine on the remote itself. A computer on the
cable can send the same requests, through the file `/sys/hlapi`, and how a request line is framed and
answered there is the [API overview](README.md). A hub runs the same engine in its sibling image, so the
same names were there for Logitech's phone app to send; that side is not checked here[^unchecked].

**Everything here was read in the Touch's production firmware, build 4.15.330**, in the engine and in the
screens; nothing was sent to a remote[^t-touch-api-engine]. The same image runs the other remotes of the
generation and the hubs run a sibling of it; where a request behaves differently by host name or by
provisioning mode, the page says which branch a Touch takes, which is host name `juniper` and, as measured,
mode 0[^t-touch-answers], and marks the other branches not checked.

Each request works on the configuration the remote holds, the documents a sync delivers: the activities and
button maps of [activities and buttons](../activities-and-buttons.md), the devices and their commands of
[devices and infrared](../devices-and-infrared.md), and the context, settings and favourites of
[favourites and settings](../favourites-and-settings.md). Each section below says which of them it reads.

## The requests

The kinds are the [API overview's](README.md#the-kinds), `none` among them for a request whose handler does
nothing or does not exist. The verifiers are the checks the engine runs, in order, before the handler; what
each means for a computer on the cable is [below](#the-verifiers-and-what-they-mean-on-the-cable).

| request | what it does | kind | verifiers |
|---|---|---|---|
| `harmony.engine?startactivity` | starts or stops an activity | action | `HasUsageLog`, `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `harmony.engine?holdaction` | presses, holds or releases a command or a sequence named directly | action | `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `harmony.engine?changechannel` | tunes a channel, or sets a speaker group's volume | action | `HasUsageLog`, `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `harmony.engine?getcurrentactivity` | the running activity's number | read | `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `harmony.engine?setdevicestate` | sends the commands that put a device into a power or input state | action | `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `harmony.engine?getallactivities` | the activities as the engine loaded them | read | `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `harmony.engine?getallhadevices` | the home control devices, groups and scenes | read | `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `harmony.engine?config` | a summary of the whole configuration | read | `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `harmony.engine?getconfighash` | the entity tags of the stored documents, joined | read | `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `harmony.engine?helpsync` | the help screen's step: sends one device one power or input command | action | `HasUsageLog`, `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `harmony.engine?helpdiscretes` | the help screen's first step: resends the running activity's power and input commands | action | `HasUsageLog`, `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `harmony.engine?isfilepresent` | whether a path exists on the remote's file system | read | `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `harmony.engine?setdisplaydeviceon` | nothing; answers OK | none | `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `harmony.engine?bluetoothpairing` | pairs or connects a Bluetooth device | action | `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `harmony.engine?bluetoothunpairing` | forgets a Bluetooth device's pairing | action | `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `harmony.engine?bluetoothdisconnect` | disconnects a Bluetooth device | action | `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `harmony.engine?geteventqueuecount` | how many commands wait in the engine's queue | read | `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `harmony.engine?sethiddevice` | chooses the device that takes keyboard input | action | `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `harmony.engine?setsleeptimer` | sets or cancels the sleep timer | change | `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `harmony.engine?gettimerinterval` | the seconds left on the sleep timer | read | `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `harmony.engine?gettime` | the remote's clock and time zone | read | `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `harmony.engine?setremotetime` | sets the remote's clock from a hub's | action | `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `harmony.engine?settimezone` | asks Logitech's service to change the account's time zone | action | `IsSyncComplete`, `WaitAccountRegistered`, `Default` |
| `harmony.engine?pairingbutton` | announces a press of a pairing button inside the engine, where nothing listens | none | `Default`, implied |
| `harmony.engine?allpoweron` | fetches a list of power on codes from Logitech's service and sends them all | action | `IsSyncComplete`, `Default` |
| `harmony.engine?wlanstatus` | tells the engine the Wi-Fi status | change | `Default`, implied |
| `harmony.engine?startippair` | starts pairing a device controlled over the network | action | `Default`, implied |
| `harmony.engine?finishippair` | finishes that pairing with a PIN and keeps the device's cookie | action | `Default`, implied |
| `harmony.engine?addipdevice` | registered with no handler; answers a server error | none | `Default`, implied |
| `harmony.engine?pairstatus` | asks a network device whether it is paired | read | `Default`, implied |
| `harmony.engine?setcommand` | sends a key to a device controlled over the network | action | `Default`, implied |

`Default`, implied, means the registration names no verifier and the engine puts its default one
there[^t-touch-api-engine].

**No request in this group restarts the remote, erases anything, resets it or writes firmware**[^t-touch-api-engine].
The ones that act send infrared or Bluetooth to devices, call devices or Logitech's service over a network,
or set the clock; one, `isfilepresent`, reports whether any path exists on the remote's file system.

## The verifiers and what they mean on the cable

A request names its checks when it is registered, and the engine runs them in that order before the handler;
the first that refuses ends the request with its own answer[^t-touch-api-engine]. This group uses four,
`HasUsageLog`, `IsSyncComplete`, `WaitAccountRegistered` and `Default`, which the other groups share, so
what each checks and what it means on the cable is the API overview's table,
[the checks before a handler](README.md#the-checks-before-a-handler). Of the four only `IsSyncComplete`
refuses on a Touch: a request sent while the computer is itself driving a sync answers 202.
`WaitAccountRegistered` waits for the engine to register its handler for unloading a configuration, which it
does after the first load when that load returns, with a configuration or without one[^t-touch-api-engine].
A load that raises an error ends the task before it registers, and then every request with this check waits
for ever, [recovery](../firmware.md#a-configuration-that-fails-to-load)[^t-touch-recovery]. This said it
registers after the first load "whether that load succeeded or not"<!--superseded-->, which holds for a load
that returns and not for one that raises.

## How the answer comes back

**A request either answers at once or queues its work, and a queued result does not come back over the
cable.** Ten of these requests hand their work to the engine's action queue, where commands are sent
one at a time, and either answer 200 at once or answer nothing; the result is then sent to the client that
asked, by the client number the request arrived with[^t-touch-api-engine]. The screens hold a connection the
engine knows them by, so they receive it. A request from the cable arrives through the engine's local web
connector, which gives every request the same client number and registers no connection under it, so a
queued result addressed to it finds no one and is dropped[^t-touch-api-engine]. Which requests queue is
said per request below.

**Some results are announced to every client instead**: the end of an activity start,
`harmony.engine?startActivityFinished`, carries the activity and an error code to every connection the
engine holds, the screens' among them[^t-touch-api-engine]. The connector a cable request comes
through is not among them.

**The arguments a request line carries are text.** A line's arguments arrive as names and values, and every
value is a string; a JSON object arrives whole under one argument, `hbusData`, which only some handlers
unpack, [the API overview](README.md)[^t-touch-api-engine]. So a handler that compares a value with a number or
with `true` never matches one sent from the cable, and those comparisons are named per request below. Of
this group, `startippair`, `finishippair`, `pairstatus` and `setcommand` unpack `hbusData`, and no other
does[^t-touch-api-engine].

## Each request

### harmony.engine?startactivity

Starts an activity, or switches from the running one, or stops the running one when the activity is `-1`,
the off state[^t-touch-api-engine].

**Handler**: `processStartActivity` in `tasks/harmonyengine/apihandler/harmonyengine.lua`.

**Parameters**: `activityId`, `channel`, `args`, `rule`, `timestamp`, `tsTimeout`, `callbackUrl`, `noResponse`, `group`.

* `activityId`, text, the activity's number as the activity list states it, or `-1` for off. Either it or
  `channel` is required, or the start answers 504, an insufficient-arguments refusal.
* `args`, a table holding `rule`, `start` by default; `end` turns the request into a stop. From the cable it
  can only arrive as text, which this handler does not decode, and setting the default rule on text makes
  the handler fail with 500, so a cable host leaves `args` out and cannot ask for `end` this way; the
  [`harmony.activityengine?runactivity`](activityengine.md#harmonyactivityenginerunactivity) request decodes it.
* `channel`, text: a channel to tune once the activity is up. Asking for the running activity with a channel
  only tunes, without starting it again.
* `timestamp` and `tsTimeout`, milliseconds: a request that arrives later than its timeout, one second by
  default, judged against the same client's recent requests, is dropped with 562, a delayed-request refusal; the screens send both for a channel change.
* `callbackUrl`, an address the engine posts the result to when the start finishes, as a hub does for an app.
* `noResponse`, compared with the value `true`, so it has no effect from the cable. `group`, a speaker group
  for an activity with a target volume.

**What it does.** The handler only announces the start inside the engine, as the message `run_activity`, and
answers 200 at once[^t-touch-api-engine]. On a Touch, mode 0, the activity engine passes that on to a second
function of the same name in `tasks/harmonyengine/apihandler/activity.lua`, which queues the start; the
start itself is the order of [starting, switching and stopping](../activities-and-buttons.md#starting-switching-and-stopping),
read out of the activity list, the device list and the protocol list[^t-touch-activities-firmware]. A rule of
`end` for any activity other than `-1` becomes `-1`. In mode 3, the hub's, the message goes to the activity
engine's program and rule machinery instead, which is not checked.

**Answers.** 200 at once. The progress of the start goes to the asking client as 100, a progress code, with
`done`, `total` and `deviceId`; its end is announced to every client as
`harmony.engine?startActivityFinished` with `activityId`, `errorCode` and `errorString`; an unknown activity
ends it with 567. A cable host receives none of these, by the rule above[^t-touch-api-engine].

**Who calls it.** The screens' favourite channel screen, `favoritechannel.lua`, through `favStartActivity` in
`appscommon/harmony.lua`, with an activity and a channel; the screens subscribe to the same name for the
progress. Inside the engine the sleep timer, `sleeptimer.lua`, and the Sonos plugin send it, and the
activity engine calls the queueing function by this name directly[^t-touch-api-engine]. The screens' launcher
starts an activity through [`harmony.activityengine?runactivity`](activityengine.md#harmonyactivityenginerunactivity) instead.

### harmony.engine?holdaction

Sends one command of one device, or runs a sequence, named in the request rather than looked up from a key
of a button map[^t-touch-api-engine].

**Handler**: `processHoldAction` in `tasks/harmonyengine/apihandler/activity.lua`.

**Parameters**: `status`, `action`, `count`, `delayInMs`, `activityId`, `timestamp`, `buttonKey`, `equadId`, `indexInMenu`, `buttonSource`, `buttonMode`, `ulem`.

* `status`, required: `press`, `hold`, `release` or `pressrelease`; anything else answers 561.
* `action`, required: JSON text holding `deviceId` and `command`, a command name of that device as the device
  list states it, matched without regard to case, or `sequenceId`, a sequence of the running activity's
  button map. Text that decodes to a number answers 504; text that does not decode answers nothing.
* `count` and `delayInMs`, for `pressrelease`: the press and release are repeated `count` times with a 170 ms
  hold and `delayInMs` between them, 10 ms by default. With `count` and no `deviceId` in the action, the
  command is looked up by its label in the running activity's function list, a document a Touch's sync does
  not fetch, so on a Touch that lookup answers 500[^t-touch-api-engine].
* The rest are recorded in the usage event only: `buttonKey`, `equadId`, `indexInMenu`, `buttonSource`,
  `buttonMode`, `ulem`, `activityId`, `timestamp`.

**What it does.** A press, a hold and a release each queue the matching step of sending, the same steps a key
press takes once its button map has been read, [devices and infrared](../devices-and-infrared.md#from-a-key-press-to-the-lamp);
a sequence runs once on the press and its release is ignored[^t-touch-api-engine]. A `pressrelease` queues
press and release itself and blocks for the delays before answering.

**Answers.** A press, a hold and a release answer nothing; `pressrelease` answers 200 when all its steps are
queued. Through the queue, an unknown device answers the asking client 565, an unknown command 566, a sequence
while no activity runs 564 and an unknown sequence 563, and a sequence's end is answered under the request's
own name with the verb `sequenceFinished`[^t-touch-api-engine].

**Who calls it.** Nothing on the image but the screens' test client, `network/testXmppClient.lua`; the
screens send key presses as `control.button?*`, [system](system.md#buttons)[^t-touch-api-engine].

### harmony.engine?changechannel

Tunes a channel on the device that changes channels in the running activity, or on a device named, or sets
the volume or mute of a speaker group[^t-touch-api-engine].

**Handler**: `processChangeChannel` in `tasks/harmonyengine/apihandler/activity.lua`.

**Parameters**: `channel`, `group`, `gVol`, `gMute`, `deviceId`, `primaryDeviceId`, `activityType`, `activity`, `noQueue`, `timestamp`, `tsTimeout`.

* One of `channel`, `group`, `gVol` and `gMute` is required, or it answers 504.
* `deviceId`: the device to tune. Without it the device is the running activity's first of these roles that
  is filled: Roku, Sonos, app, speaker, then the channel changing role, and the default role after that,
  [activities and buttons](../activities-and-buttons.md#an-activity-what-it-is-made-of).
* `primaryDeviceId` and `activityType`: guards; a mismatch answers 412. `activityType` is compared as a
  number, so from the cable it never mismatches.
* `noQueue`, any value: tune now and answer the result, instead of queueing.
* `timestamp` and `tsTimeout`, as for `startactivity`.

**What it does.** The device's own channel rule turns the number into commands, the rule
[favourites and settings](../favourites-and-settings.md#how-a-favourite-becomes-key-presses) describes, read
out of the device list[^t-touch-api-engine].

**Answers.** Queued, it answers nothing at once and the result goes to the asking client, a failure as
`harmony.engine?changeChannelFinished`; with no activity running and no device named, 567; a device not
found, 565. With `noQueue` the result is the answer.

**Who calls it.** The screens' favourite channel and speaker screens, `favoritechannel.lua` and
`speakers.lua`, through `changeChannel` in `appscommon/harmony.lua`; and the activity engine, for a
`runactivity` that asks not to restart a running activity[^t-touch-api-engine].

### harmony.engine?getcurrentactivity

The number of the activity the engine believes is running, `-1` when none[^t-touch-api-engine].

**Handler**: `processGetCurrentActivity` in `tasks/harmonyengine/apihandler/activity.lua`.

**Parameters**: none.

**Answers.** Queued: 200 with `result=` and the number, to the asking client, so a cable host receives
nothing; 560 when no configuration is loaded[^t-touch-api-engine]. **The running state is in the engine's
memory and in no document**; the screens keep their own copy.

**Who calls it.** Nothing on the image but the screens' test client[^t-touch-api-engine].

### harmony.engine?setdevicestate

Sends the commands that bring one device to a stated value of one of its states, such as power on or an
input[^t-touch-api-engine].

**Handler**: `processSetDeviceState` in `tasks/harmonyengine/apihandler/device.lua`.

**Parameters**: `deviceId`, `state`, `value`, `skipIr`.

* `deviceId`, `state` and `value` are all required, or it answers 504. `state` names a state the device list
  gives the device, `Power` or `Input`, and `value` a value of it.
* `skipIr`: the text `true` builds the commands and sends none.

**What it does.** Queues the device's state commands, built from its entry in the device list,
[devices and infrared](../devices-and-infrared.md)[^t-touch-api-engine].

**Answers.** 200 at once; an unknown device is reported to the asking client as 565 through the queue.

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

### harmony.engine?getallactivities

The activities as the engine loaded them, for a client that draws a list of them[^t-touch-api-engine].

**Handler**: `processAllActivities` in `tasks/harmonyengine/apihandler/config.lua`.

**Parameters**: none.

**Answers.** 200 with a JSON object holding `Activities`, an array: the off activity first, then each activity
at its place by its order, each with its number, type, name, picture fields, zones, start steps, whether it
controls audio or video, and, where a program of the home control configuration names it, whether it has a
start and an end rule; 500 when no configuration is loaded[^t-touch-api-engine]. This is built from the
activity list as loaded, [activities and buttons](../activities-and-buttons.md), and it is not the stored
document. It answers at once, so a cable host receives it.

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

### harmony.engine?getallhadevices

The home control part of the configuration: its devices, groups and two lists of scenes[^t-touch-api-engine].

**Handler**: `processGetAllHaDevices` in `tasks/harmonyengine/apihandler/config.lua`.

**Parameters**: none.

**Answers.** 200 with `devices`, `groups`, `scenes` and `scenes2` from the home control configuration, or 500,
a server error, when the remote holds none[^t-touch-api-engine]. **A Touch synced through a computer holds
none**: the request list of that sync names six documents and not the home control configuration, which only
a hub, or a remote that syncs from a hub, fetches, [the platform on the cable](../usb.md)[^t-touch-api-engine].
So on a Touch this answers 500.

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

### harmony.engine?config

A summary of the whole configuration for an app: the devices, the activities with their roles and the state
each leaves every device in, the sequences, the content addresses and the locale[^t-touch-api-engine].

**Handler**: `processConfig` in `tasks/harmonyengine/apihandler/config.lua`, through `createConfig`.

**Parameters**: none.

**Answers.** 200 with a JSON object of `global` (the joined entity tags of `getconfighash`, the account's last
update and the locale), `device`, `activity`, `sequence`, `content`, `sla` and `dataConsent`; or 500 when no
configuration is loaded **or no home control configuration is stored**, which the summary requires even though
it uses only its programs[^t-touch-api-engine]. So on a Touch synced through a computer it answers 500. On a
remote that holds both, it is the nearest any request comes to reading the configuration back, and it is still
a summary built from the loaded configuration, not a stored document. It also looks up the addresses of four
of Logitech's content services.

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

### harmony.engine?getconfighash

The entity tags of the stored documents, joined into one string, so that a client can tell whether the
configuration changed[^t-touch-api-engine].

**Handler**: `processConfigHash` in `tasks/harmonyengine/apihandler/config.lua`, through `getConfigHash`.

**Parameters**: none.

**Answers.** 200 with `result=` and the tags of the activity list, the device list, the function list, the
protocol list, the context and the home control configuration, in that order, each present only when its
document is stored, joined with nothing between them and with every double quote removed; 500 when no
configuration is loaded[^t-touch-api-engine]. It answers at once, so a cable host receives it. **On a Touch
synced through a computer that is four tags**, the activity list's, the device list's, the protocol list's and the context's, since it
fetches no function list and no home control configuration; the button map list and the settings are not
part of it[^t-touch-api-engine]. Each tag is the one the answer that stored the document carried,
[answering a sync](../answering-a-sync.md#the-entity-tag-an-answerer-sends), so a host that knows the tags it
sent can compare: this is the one request in the group that reports the committed documents to a host.

**Who calls it.** Nothing on the image but the screens' test client[^t-touch-api-engine].

### harmony.engine?helpsync

One step of the help screen: sends one device one value of its power or input state, the "is the TV on?"
question and its answer[^t-touch-api-engine].

**Handler**: `processHelpSync` in `tasks/harmonyengine/apihandler/activity.lua`, queueing `helpSync`.

**Parameters**: `deviceId`, `state`, `value`, `smartInput`, `timestamp`, `tsTimeout`.

* `deviceId`, `state` and `value` are required, or it answers 504; `state` is `Power` or `Input` and `value`
  `On`, `Off` or an input's name.
* `smartInput`: an input to select as well.
* `timestamp` and `tsTimeout`, as for `startactivity`.

**What it does.** Builds the device's commands for that state from the device list, in their help form, and
queues them, trying again a command a Bluetooth device was not ready for[^t-touch-api-engine]. It changes
nothing the engine believes about the device.

**Answers.** 200 at once; failures go to the asking client through the queue.

**Who calls it.** The screens' help screen, `help.lua`, and the first time tutorial, `firsttimetutorial.lua`,
through `helpSync` in `appscommon/harmony.lua`. The engine runs the same function itself when an activity's
key is pressed more than once while that activity runs[^t-touch-api-engine].

### harmony.engine?helpdiscretes

The help screen's first step: sends again the running activity's power on commands and input commands, as if
starting it, without changing which activity runs[^t-touch-api-engine].

**Handler**: `processHelpDiscretes` in `tasks/harmonyengine/apihandler/activity.lua`, queueing `startActivity`.

**Parameters**: `timestamp`, `tsTimeout`, `channel`.

**What it does.** Runs the start of the running activity in its help stage: the power steps and their delays,
then the input steps, then the activity's default channel or the one given; it does not send the old
activity's end steps and does not mark an activity starting[^t-touch-api-engine]. Read from the activity list
and the device list, [starting, switching and stopping](../activities-and-buttons.md#starting-switching-and-stopping).

**Answers.** Nothing at once; progress and the end go to the asking client, so a cable host receives nothing.

**Who calls it.** The screens' help screen, `help.lua`, through `helpDiscretes` in `appscommon/harmony.lua`;
the activity engine, for a `runactivity` that starts the activity it believes is running; and the engine
runs the same start itself when an activity's key is pressed while that activity runs[^t-touch-api-engine].

### harmony.engine?isfilepresent

Whether a path exists on the remote's file system[^t-touch-api-engine].

**Handler**: `isFilePresent` in `tasks/harmonyengine/apihandler/harmonyengine.lua`.

**Parameters**: `fileName`, required, a path; without it, 501.

**Answers.** 200 with `isFilePresent`, true or false, at once[^t-touch-api-engine]. **Any path may be asked**,
absolute or relative to the engine's working directory, and nothing is read or changed; it reports existence
only. This is the one request in the group that tells a cable host something about the file system.

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

### harmony.engine?setdisplaydeviceon

Answers 200 and does nothing else[^t-touch-api-engine].

**Handler**: `processSetDisplayDeviceOn` in `tasks/harmonyengine/apihandler/harmonyengine.lua`.

**Parameters**: none.

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

### harmony.engine?bluetoothpairing

Pairs a Bluetooth device of the configuration, or connects one already paired, and makes it the keyboard
device when it takes one[^t-touch-api-engine].

**Handler**: `processBluetoothPairing` in `tasks/harmonyengine/apihandler/activity.lua`.

**Parameters**: `deviceId`, `juniper`, `pin`.

* `deviceId`, required, or 504: a device of the device list with Bluetooth properties.
* `juniper`: any value queues the pairing and answers the asking client later, as the screens do; without it
  the pairing runs inside the request and its result is the answer.
* `pin`: a PIN for the pairing.

**Answers.** With `juniper`, nothing at once. Without it, 200 or the pairing's error code with `deviceId`, or
560 and 565 for no configuration and an unknown device[^t-touch-api-engine]. A cable host gets an answer only
by leaving `juniper` out.

**Who calls it.** The screens' Bluetooth pairing tutorial, `btpairtutorial.lua`, through `initiateBtPairing`
in `appscommon/harmony.lua`, with `juniper`; the screens subscribe to the same name for the
result[^t-touch-api-engine].

### harmony.engine?bluetoothunpairing

Forgets the pairing of one Bluetooth device[^t-touch-api-engine].

**Handler**: `processBluetoothUnpairing` in `tasks/harmonyengine/apihandler/activity.lua`.

**Parameters**: `deviceId`.

**Answers.** 200 at once; 560 with no configuration, 565 for an unknown device.

**Who calls it.** The screens' Bluetooth pairing tutorial, `btpairtutorial.lua`, through `unpairBtDevice` in
`appscommon/harmony.lua`[^t-touch-api-engine].

### harmony.engine?bluetoothdisconnect

Disconnects one Bluetooth device without forgetting it[^t-touch-api-engine].

**Handler**: `processBluetoothDisconnect` in `tasks/harmonyengine/apihandler/activity.lua`, queueing `bluetoothDisconnect`.

**Parameters**: `deviceId`, required, or 504.

**Answers.** 200 at once; the result goes to the asking client through the queue.

**Who calls it.** The screens' device mode and activity command screens, `devicemode.lua` and
`activitycommands.lua`, through `btDisconnect` in `appscommon/harmony.lua`[^t-touch-api-engine].

### harmony.engine?geteventqueuecount

How many commands wait in the engine's action queue, the queue every queued request above goes
through[^t-touch-api-engine].

**Handler**: `processGetEventQueueCount` in `tasks/harmonyengine/apihandler/harmonyengine.lua`.

**Parameters**: none.

**Answers.** 200 with `count`, at once.

**Who calls it.** The screens' start up, `init.lua`, through `getEventQueueCount` in `appscommon/harmony.lua`;
the remote's native USB program holds the name too, with a function to pack its answer, and when it sends it
is not checked[^t-touch-api-engine].

### harmony.engine?sethiddevice

Chooses the device that receives keyboard input, by its keyboard dongle, Bluetooth or network address, and
passes it the running activity's keyboard key codes[^t-touch-api-engine].

**Handler**: `processSetHidDevice` in `tasks/harmonyengine/apihandler/activity.lua`, queueing `setHidDevice`.

**Parameters**: `deviceId`, `connectBtDevice`.

* `deviceId`: the device; without it, the running activity's keyboard role, and 567 when no activity runs.
* `connectBtDevice`: try a Bluetooth connection ten times rather than once.

**What it does.** Reads the device's transport and address from the device list and the activity's keyboard
role from the activity list, and hands the engine's keyboard manager the device and the key codes of the
activity's button map under the identifier `16420`, the keyboard's, [activities and buttons](../activities-and-buttons.md#how-a-key-press-becomes-a-command)[^t-touch-api-engine].

**Answers.** Nothing at once; the result, with `deviceId`, goes to the asking client.

**Who calls it.** Nothing on the image sends this name; the engine chooses the keyboard device the same way
when an activity starts[^t-touch-api-engine].

### harmony.engine?setsleeptimer

Sets the sleep timer, after which the running activity is turned off, or cancels it[^t-touch-api-engine].

**Handler**: `setTimer` in `tasks/harmonyengine/apihandler/sleeptimer.lua`.

**Parameters**: `interval`, required: seconds from now, or `-1` to cancel. Missing, 504; not a number, 412.

**What it does.** Records the target time and starts a task that waits for it. **On a Touch, mode 0, the
engine's timer turns nothing off**: the step that stops the activity returns at once outside mode 3, and the
screens keep their own count and turn the activity off themselves[^t-touch-api-engine]. In mode 3 the timer is
also kept in the state digest and announced.

**Answers.** 200 with `timerId`, at once; in mode 3, when no activity runs, 200 with an error inside.

**Who calls it.** The screens' sleep timer screen, `sleeptimer.lua`[^t-touch-api-engine].

### harmony.engine?gettimerinterval

The seconds left on the sleep timer[^t-touch-api-engine].

**Handler**: `getTimerInterval` in `tasks/harmonyengine/apihandler/sleeptimer.lua`.

**Parameters**: `timerId`, optional: the timer the client set; another number answers `-1` with a timer-id mismatch inside.

**Answers.** 200 with `interval`, at once; `-1` with an error inside when no timer runs[^t-touch-api-engine].

**Who calls it.** The screens' sleep timer screen, `sleeptimer.lua`, and `appscommon/harmony.lua`[^t-touch-api-engine].

### harmony.engine?gettime

The remote's clock, in UTC, and its time zone[^t-touch-api-engine].

**Handler**: `processCmdGetTime` in `tasks/harmonyengine/apihandler/harmonyengine.lua`.

**Parameters**: none.

**Answers.** 200 with `utcTime`, a table of date and time fields, and `tz`; but first it requires a working
Wi-Fi connection, and without an address it answers 506, a no-Wi-Fi error[^t-touch-api-engine]. Whether
a Touch, which syncs through a computer, ever has one is not checked; if not, this answers 506 on a
Touch.

**Who calls it.** Nothing on the image asks the remote's own engine for it. The screens' time zone setting, `setTimeZone.lua`,
and the engine's start up send this name prefixed `hot.1.` over the engine's internal bus instead, and the
engine does so only in mode 4, to set its clock from a hub's[^t-touch-api-engine]; that the prefix reaches a
hub's engine is inferred from that use[^unchecked].

### harmony.engine?setremotetime

Sets the remote's clock and time zone from a hub's[^t-touch-api-engine].

**Handler**: `processCmdSetRemoteTime` in `tasks/harmonyengine/apihandler/harmonyengine.lua`.

**Parameters**: none.

**What it does.** Only in mode 4: asks the hub's engine for its time, then writes the time zone file and sets
the system clock. In any other mode, a Touch's included, it answers 500, an invalid-mode error, and does
nothing[^t-touch-api-engine]. That mode 4 is a remote paired with a hub is read from the message's name and is
not checked.

**Answers.** 200 or 500, at once.

**Who calls it.** The screens' resync screen, `resync.lua`[^t-touch-api-engine].

### harmony.engine?settimezone

Asks Logitech's service to set the account's time zone, and re-reads the time zone on success[^t-touch-api-engine].

**Handler**: `processCmdSetTimeZone` in `tasks/harmonyengine/apihandler/harmonyengine.lua`.

**Parameters**: `timezoneid`, required, or 504.

**What it does.** Posts the account property `UserTimeZone` to the service's account manager, as a web request
of the remote's own, not through the computer[^t-touch-api-engine]. It changes nothing on the remote until the
service answers.

**Answers.** 200 at once, whatever the service answers later.

**Who calls it.** The screens' time zone setting, `setTimeZone.lua`[^t-touch-api-engine].

### harmony.engine?pairingbutton

Announces a press of a pairing button inside the engine, with the request's arguments[^t-touch-api-engine].

**Handler**: `processCmdPairingButton` in `tasks/harmonyengine/apihandler/harmonyengine.lua`.

**Parameters**: none read; all are passed on.

**Answers.** 200 at once. No part of this build's engine listens for the announcement[^t-touch-api-engine].

**Who calls it.** The remote's native USB program holds the name; when it sends it is not checked[^t-touch-api-engine].

### harmony.engine?allpoweron

Fetches Logitech's list of power on codes for every device of the account and sends each one as
infrared[^t-touch-api-engine].

**Handler**: `processCmdAllPowerOn` in `tasks/harmonyengine/apihandler/harmonyengine.lua`, through
`getAllPowerOnCommands` in `tasks/harmonywebservices/proxy/sync.lua`.

**Parameters**: none.

**What it does.** Asks the service for `UserAccountDirector/PowerOnCommandList`, as a web request of the
remote's own, and plays every code in the list through the infrared sender, waiting where the list says
to[^t-touch-api-engine]. **It sends infrared to every device of the account at once**, which is the point of it
and a reason not to send it idly.

**Answers.** 200 once all are sent; 553, or the error the fetch gave, otherwise.

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

### harmony.engine?wlanstatus

Tells the engine the Wi-Fi status, so it notices a connection coming up[^t-touch-api-engine].

**Handler**: `processWlanStatus` in `tasks/harmonyengine/apihandler/harmonyengine.lua`.

**Parameters**: `status`: the word Connected, or another.

**What it does.** On a change to Connected it announces a new address inside the engine, which nothing in
this build listens for, and in mode 3 restarts the discovery of network devices[^t-touch-api-engine].

**Answers.** 200 at once.

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

### harmony.engine?startippair

Starts pairing a device the configuration controls over the network, by its UPnP identifier[^t-touch-api-engine].

**Handler**: `processStartIpPair` in `tasks/harmonyengine/core/ipmanager.lua`.

**Parameters**: `uid`, the device's identifier.

**What it does.** For a device of the device list whose entry carries a registration section, sends that
section's request to the device; otherwise asks the plugin that a network scan matched to the identifier.
**On a Touch neither has anything to work with unless the remote has a network and has scanned**, which is not
checked[^t-touch-api-engine].

**Answers.** 200; 401 when the device asks for authorisation; 607 on failure; 592 when no plugin matches.

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

### harmony.engine?finishippair

Finishes that pairing with the PIN the device showed, and keeps what the device answered for later
commands[^t-touch-api-engine].

**Handler**: `processFinishIpPair` in `tasks/harmonyengine/core/ipmanager.lua`.

**Parameters**: `uid`, `pin` (required, or 599), `renewpin`.

**What it does.** Sends the registration request with the PIN; on success saves the device's cookie and
`renewpin` in the engine's preferences file on the remote, its one write[^t-touch-api-engine].

**Answers.** 200, 607 on failure, 592 when no plugin matches.

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

### harmony.engine?addipdevice

Registered, and its handler does not exist: the module it names defines no function of that name, so the
engine answers 500, a no-handler error, and nothing runs[^t-touch-api-engine].

**Handler**: `processAddIpDevice` in `tasks/harmonyengine/core/ipmanager.lua`, absent.

**Parameters**: none.

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

### harmony.engine?pairstatus

Asks the plugin of a network device whether the device is paired[^t-touch-api-engine].

**Handler**: `processPairStatus` in `tasks/harmonyengine/core/ipmanager.lua`.

**Parameters**: `uid`.

**Answers.** 200 with the plugin's data; 608 when the device does not answer; 609 when it is not paired; 592
when no plugin matches[^t-touch-api-engine].

**Who calls it.** Nothing on the image sends this name; the screens' many uses of the word are about the
remote's own pairing, not this request[^t-touch-api-engine].

### harmony.engine?setcommand

Sends a key code to a device controlled over the network, through its plugin[^t-touch-api-engine].

**Handler**: `processSetCommand` in `tasks/harmonyengine/core/ipmanager.lua`.

**Parameters**: `uid`, `keycode`, `action`.

**Answers.** 200, 607 when the plugin fails, 592 when no plugin matches.

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

## Does any request read a document back

**No request of this group returns a stored document.** Three report what the engine holds:
`getconfighash` returns the stored documents' entity tags, `getallactivities` a list built from the loaded
activities, and `config` a summary of the whole configuration, which a Touch synced through a computer cannot
produce for want of a home control configuration[^t-touch-api-engine]. `getconfighash` is the one that answers
the question [answering a sync](../answering-a-sync.md#which-request-names-act) leaves open, whether an answer
was committed: its tags are the committed set's, read at once and over the cable. Of the three groups on these
pages, the running activity's number reaches a cable host one way only, the refusal of a `runactivity` for an activity that does not
exist, [the activity engine's page](activityengine.md#the-verifier-only-this-group-uses)[^t-touch-api-engine].

**The running state is reported only through the queue** in this group: `getcurrentactivity` answers the asking
client, and a cable host is not one the engine can answer[^t-touch-api-engine].

## Not checked

* That a queued result is dropped on a Touch for a cable host rests on the connector registering no connection
  and on no other file using its client number; it has not been seen[^unchecked].
* Whether a Touch has a network connection of its own, which `gettime`, `settimezone`, `allpoweron` and the
  network pairing requests need[^unchecked].
* What modes 1, 2 and 4 are; mode 3 is the hub's by the message `addprogram` answers outside it, and mode 4 a
  remote paired with a hub only by a message's name[^unchecked].
* When the native USB program sends `pairingbutton` and `geteventqueuecount`[^unchecked].
* The branches for host names other than `juniper` and for modes other than 0, and every request on another
  build or another product of the generation[^unchecked].
* What `setsleeptimer` and the help requests do on the screen of a Touch; read in the engine only[^unchecked].

[^t-touch-recovery]: Read in the firmware. [The test](../../../../tests/test_harmony_touch_recovery.py)
[^t-touch-api-engine]: Read in the firmware. [The test](../../../../tests/test_harmony_touch_api_engine.py)
[^t-touch-activities-firmware]: Read in the firmware. [The test](../../../../tests/test_harmony_touch_activities.py)
[^t-touch-answers]: Measured on a unit. [The test](../../../../packages/usb/test/touch-host.test.ts)
[^unchecked]: Not checked.
