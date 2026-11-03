# Harmony Touch API: home control, `harmony.automation?*`

Home control is the part of Logitech's software that drives lights, blinds, locks and thermostats through
their own hubs and bridges, which Logitech's software calls gateways: a Philips Hue bridge, an August lock,
an Insteon hub and others, each reached by a plugin. These fourteen requests discover a gateway, pair
with it, read and set its devices' states and run a few utilities. **They are a hub's**: the image registers
them on a Harmony Touch as well, and on a Touch synced through a computer every one of them is refused before
its handler runs, for want of the configuration they work on. How a request line reaches the engine over the
cable is the [API overview](README.md).

**Everything here was read in the Touch's production firmware, build 4.15.330**, in the engine and in the
screens; nothing was sent to a remote[^t-touch-api-engine]. A Touch's host name is `juniper` and its
provisioning mode, as measured, 0[^t-touch-answers]. What the handlers do past their checks is the hub's
behaviour as the shared engine states it, and is not checked on a hub.

## Why every request is refused on a Touch

**The home control configuration is a document of its own**, `AutomationConfig`, holding the gateways, the
devices, the groups, the scenes and the programs; it is none of the documents of
[devices and infrared](../devices-and-infrared.md), [activities and buttons](../activities-and-buttons.md) or
[favourites and settings](../favourites-and-settings.md). Every request in this group checks for it before
anything else but a running sync, and refuses with 587, a missing-home-control-configuration refusal, when the
remote holds none[^t-touch-api-engine].

**A Touch that syncs through a computer never fetches it.** The request list the remote hands the computer
names six documents, and in modes 3 and 4 a seventh, the capability list, and never the home control
configuration; the lists that name it are a hub's own, fetching from Logitech's service, and the one a remote
uses to sync from a hub, [the platform on the cable](../usb.md)[^t-touch-api-engine]. So on a Touch every request below answers 587.

**And the home control task does not start on a Touch.** The engine's home control task returns at once on
the host name `juniper`, so it sets up no plugin when the remote starts; a plugin is otherwise marked ready by
its own setup or by a successful `pair`, which the 587 refusal stops first[^t-touch-api-engine].

**A document of that kind could still arrive**: a resource put names the home control configuration by its
address, which the engine maps to `AutomationConfig`, so a direct put, [answering a
sync](../answering-a-sync.md#the-direct-resource-put-and-why-a-whole-configuration-should-still-go-by-the-sync),
would store one and lift the refusal[^t-touch-api-engine]. What the requests then do on a Touch, with no
plugin started and no network of its own known, is not checked[^unchecked].

## The requests

The kinds and the shared verifiers are as on the [engine's page](engine.md#the-requests). This group adds a
check of its own before the default one, `verifierGetAutomationConfig`, and five requests a second, below.

| request | what it does | kind | verifiers |
|---|---|---|---|
| `harmony.automation?discover` | searches the network for gateways | action | `IsSyncComplete`, `verifierGetAutomationConfig`, `Default` |
| `harmony.automation?pair` | pairs with a gateway | action | `IsSyncComplete`, `verifierGetAutomationConfig`, `Default` |
| `harmony.automation?getstate` | the states of home control devices | read | `IsSyncComplete`, `verifierGetAutomationConfig`, `verifierGetState`, `Default` |
| `harmony.automation?setstate` | sets the states of home control devices | action | `IsSyncComplete`, `verifierGetAutomationConfig`, `verifierSetState`, `Default` |
| `harmony.automation?remove` | removes a gateway | action | `IsSyncComplete`, `verifierGetAutomationConfig`, `verifierRemove`, `Default` |
| `harmony.automation?toggle` | switches a group's or a gateway's lamps off, back, or on | action | `IsSyncComplete`, `verifierGetAutomationConfig`, `verifierToggle`, `Default` |
| `harmony.automation?refresh` | asks gateways to refresh their devices | action | `IsSyncComplete`, `verifierGetAutomationConfig`, `Default` |
| `harmony.automation?status` | each gateway's status | read | `IsSyncComplete`, `verifierGetAutomationConfig`, `Default` |
| `harmony.automation?addprogram` | stores a program in the home control configuration | change | `IsSyncComplete`, `verifierGetAutomationConfig`, `Default` |
| `harmony.automation?adddevice` | adds a device to a gateway | action | `IsSyncComplete`, `verifierGetAutomationConfig`, `Default` |
| `harmony.automation?removedevice` | removes a device from a gateway | action | `IsSyncComplete`, `verifierGetAutomationConfig`, `Default` |
| `harmony.automation?getutilitymenu` | the utility menu entries the gateways' plugins offer | read | `IsSyncComplete`, `verifierGetAutomationConfig`, `Default` |
| `harmony.automation?indicate` | passes a device's own report to its plugin | change | `IsSyncComplete`, `verifierGetAutomationConfig`, `Default` |
| `harmony.automation?identify` | makes a device blink so a person can find it | action | `IsSyncComplete`, `verifierGetAutomationConfig`, `Default` |

**None of the fourteen restarts, erases, resets or writes firmware.** Two write the stored home control
configuration, `addprogram` and `remove` for an unsupported gateway, and the rest act on gateways and devices
over the network[^t-touch-api-engine].

## The verifiers of this group

| verifier | what it checks | on a Touch, from the cable |
|---|---|---|
| `IsSyncComplete` | refuses with 202 while a sync runs, [the API overview](README.md#the-checks-before-a-handler) | as there |
| `verifierGetAutomationConfig` | reads the stored home control configuration and refuses with 587 when there is none; otherwise prompts the activity engine to run its programs, which it does only in mode 3, and passes | refuses, as above |
| `verifierGetState` | notes the devices asked about for the default verifier's policy, and marks the request a read | never refuses |
| `verifierSetState` | refuses with 504, a missing-states refusal, without `state` or a JSON object; otherwise notes the devices and marks a write | refuses a request with neither |
| `verifierRemove` | refuses with 504 without `gatewayId`; otherwise marks a write | refuses a request without it |
| `verifierToggle` | refuses with 589, a bad-arguments refusal, unless `groupId` names a group with devices or `gatewayId` is given; marks a read and a write | refuses as stated |
| `Default` | the policy check those notes feed | checks nothing on `juniper`, [answering a sync](../answering-a-sync.md)[^t-touch-host] |

So on a Touch the four second verifiers are never reached, and the policy notes they make would be read by a
check that is switched off[^t-touch-api-engine].

**Arguments.** `getstate`, `toggle`, `refresh`, `status` and `addprogram` unpack a JSON object sent as one
argument, and `setstate` takes such an object as its whole map of states; the others read only names and
text values, [the API overview](README.md)[^t-touch-api-engine]. Every request here answers at once, so a cable
host receives each answer.

## Each request

### harmony.automation?discover

Searches the local network for gateways of one kind, or of every kind the image has a plugin for, and keeps
what it finds in memory for `pair`[^t-touch-api-engine].

**Handler**: `discover` in `tasks/automation/apihandler/automation.lua`.

**Parameters**: `type`, `gatewayType`: either names a plugin; with neither, every plugin under
`tasks/automation/plugins` is asked, which in this build are August, ecobee, Honeywell, Hue, Hunter Douglas,
Insteon, LIFX and WeMo.

**What it does.** Forgets the gateways found before, then asks each plugin's discovery.

**Answers.** 200 with the gateways found, as JSON; 580, a none-discovered answer; 592 when a named plugin is not
there[^t-touch-api-engine].

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

### harmony.automation?pair

Pairs with a gateway, by the plugin of its kind, and marks that plugin ready[^t-touch-api-engine].

**Handler**: `pair` in `tasks/automation/apihandler/automation.lua`.

**Parameters**: `gatewayId`, `gateway`, `authUri`.

* `gatewayId` or `gateway` is required, or 504. `gateway` is the gateway's description itself; `gatewayId`
  finds one among those `discover` found, then among those the configuration holds, or answers 504, a none-found refusal.
* `authUri`: an address, given in the request, from which the remote fetches a secret for the gateway,
  adding to it a key the firmware carries; a failure answers 581.

**Answers.** 200; 582, a pairing-failed error; 592 when no plugin of the gateway's kind is there.

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

### harmony.automation?getstate

The current states of home control devices, as their plugins report them[^t-touch-api-engine].

**Handler**: `getstate` in `tasks/automation/apihandler/automation.lua`.

**Parameters**: `gatewayId`, `deviceIds`, `groupId`, `forceUpdate`.

* One of `gatewayId`, `deviceIds`, a list, or `groupId` narrows the devices; with none, every gateway's.
* `forceUpdate`: passed to the plugin, which may then ask the device rather than answer from memory.

**Answers.** 200 with a JSON object of states by device; a device whose plugin gave nothing is reported with
status 2 and `nocon`, and a gateway whose plugin is not ready reports its devices with status 2 and `notrdy`;
583 when there is nothing at all[^t-touch-api-engine].

**Who calls it.** The screens' home control interface, `hainterface.lua`, which asks only when it finds a home
control configuration among the remote's documents itself; and, in mode 3, the activity engine, to seed the
state its rules compare against[^t-touch-api-engine].

### harmony.automation?setstate

Sets the states of home control devices, a light's power and brightness for example[^t-touch-api-engine].

**Handler**: `setstate` in `tasks/automation/apihandler/automation.lua`.

**Parameters**: `state`: a map from device to the state wanted; or the whole request as a JSON object of that
map. One of the two is required, or 504.

**What it does.** Groups the devices by plugin, drops null values from each state, and hands each plugin its
devices, all at once when it can take several; it records a usage count per plugin[^t-touch-api-engine].

**Answers.** 200; 584 when any plugin failed.

**Who calls it.** The screens' home control interface, `hainterface.lua`, under the same condition as
`getstate`; and, in mode 3, the activity engine when a rule sets a state[^t-touch-api-engine].

### harmony.automation?remove

Removes a gateway: its plugin forgets it and is unloaded[^t-touch-api-engine].

**Handler**: `remove` in `tasks/automation/apihandler/automation.lua`.

**Parameters**: `gatewayId`, required, or 504.

**What it does.** Asks the gateway's plugin to remove it, stops the plugin and unloads it. **For a gateway of
four kinds the image no longer has plugins for**, `rheem`, `icontrol`, `danalock` and `zulidemo`, it deletes the
gateway and its devices from the home control configuration and stores the result through a resource put,
which also queues it for the account[^t-touch-api-engine].

**Answers.** 200; 585, a removal-failed error.

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

### harmony.automation?toggle

Meant to switch a group's or a gateway's lamps: off when any is on, remembering how they were; back to how they
were; or on at full brightness when nothing is remembered[^t-touch-api-engine].

**Handler**: `toggle` in `tasks/automation/apihandler/automation.lua`.

**Parameters**: `groupId` or `gatewayId`; without either, 589.

**What it does, as read.** The test for a lamp names a variable the function never sets, so no device passes
it, nothing is switched and the request answers 200 having done nothing[^t-touch-api-engine]. That reading
has not been seen on a hub[^unchecked].

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

### harmony.automation?refresh

Asks gateways to refresh what they know of their devices[^t-touch-api-engine].

**Handler**: `refresh` in `tasks/automation/apihandler/automation.lua`.

**Parameters**: `gatewayId`; without it, every gateway whose status is ok.

**Answers.** 200; 588, a refresh-failed error, when any plugin failed or was not ready.

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

### harmony.automation?status

Each gateway's status, as its plugin reports it[^t-touch-api-engine].

**Handler**: `status` in `tasks/automation/apihandler/automation.lua`.

**Parameters**: `gatewayId`; without it, every gateway.

**Answers.** 200 with the statuses by gateway, a plugin not ready giving `errorStatus` 3; 583 when there is
none; 592 when a plugin is missing[^t-touch-api-engine].

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

### harmony.automation?addprogram

Stores a program, the activity engine's rule set, in the home control configuration and restarts the
activity engine on it[^t-touch-api-engine].

**Handler**: `addprogram` in `tasks/automation/apihandler/automation.lua`.

**Parameters**: `program` and `programId`, both required, or 504.

**What it does.** **Only in mode 3**: elsewhere it answers 500, a not-in-hub-mode refusal, which is how this page
knows mode 3 is the hub's. In mode 3 it writes the program into the configuration, stores it through a
resource put, queued for the account as well, and announces the change to the activity
engine[^t-touch-api-engine].

**Answers.** 200, or 500 outside mode 3.

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

### harmony.automation?adddevice

Adds a device to a gateway through the gateway's plugin, such as a new bulb to a bridge[^t-touch-api-engine].

**Handler**: `adddevice` in `tasks/automation/apihandler/automation.lua`.

**Parameters**: `gatewayType`, required, or 504; `deviceInfo`, `timeout`, `cancel` and `done`, passed to the
plugin.

**Answers.** 200 with the devices added; the plugin's error, or 596; 592 when the plugin is missing or not ready.

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

### harmony.automation?removedevice

Removes a device from its gateway through the plugin[^t-touch-api-engine].

**Handler**: `removedevice` in `tasks/automation/apihandler/automation.lua`.

**Parameters**: `gatewayId`, `deviceId`, `gatewayType`: one is required, or 504; `timeout` and `cancel`, passed
to the plugin.

**Answers.** 200; the plugin's error, or 597; 592 when the plugin is missing or not ready.

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

### harmony.automation?getutilitymenu

The extra menu entries the gateways' plugins offer, in a language[^t-touch-api-engine].

**Handler**: `getUtilityMenu` in `tasks/automation/apihandler/automation.lua`.

**Parameters**: `language`.

**Answers.** 200 with `utilities`; 592 with what was gathered when any plugin is missing or not ready.

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

### harmony.automation?indicate

Passes a report a device sent of itself, a value at a path, to the device's plugin[^t-touch-api-engine].

**Handler**: `indicate` in `tasks/automation/apihandler/automation.lua`.

**Parameters**: `type`, `dev`, `path` and `value`, all required, or 504. `dev` is the device's hardware
address with underscores for colons, matched against the configuration's devices.

**Answers.** 200; 587, a device-not-found error; 592 when the plugin is missing.

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

### harmony.automation?identify

Makes a device show itself, by switching it back and forth, so a person can tell which it is[^t-touch-api-engine].

**Handler**: `identify` in `tasks/automation/apihandler/automation.lua`.

**Parameters**: `deviceId` or `cancel`, one required, or 504. `cancel` stops one under way.

**What it does.** A plugin with its own way of identifying is asked to use it, and its answer is the answer;
otherwise a task toggles the device's state ten times, 600 ms apart, or a second apart for a lock, and then
restores what it was[^t-touch-api-engine].

**Answers.** 200; 592 when the plugin is missing or not ready.

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

## Does any request read a document back

No. `getstate`, `status` and `getutilitymenu` report what plugins say about gateways and devices, not the
stored home control configuration, and on a Touch none gets that far[^t-touch-api-engine]. The home control
devices, groups and scenes of the stored configuration are what
[`harmony.engine?getallhadevices`](engine.md#harmonyenginegetallhadevices) returns, where there is one.

## Not checked

* Every handler past `verifierGetAutomationConfig`, on any remote: read in the shared engine only[^unchecked].
* What these requests do on a Touch after a direct put of a home control configuration[^unchecked].
* That `toggle` does nothing, which rests on the decompiled reading of one variable[^unchecked].
* Whether the activity engine's prompt from `verifierGetAutomationConfig` does anything outside mode 3[^unchecked].
* Other host names, other modes, other builds and other products of the generation[^unchecked].

[^t-touch-api-engine]: Read in the firmware. [The test](../../../../tests/test_harmony_touch_api_engine.py)
[^t-touch-host]: Read in the firmware. [The test](../../../../tests/test_harmony_touch_host.py)
[^t-touch-answers]: Measured on a unit. [The test](../../../../packages/usb/test/touch-host.test.ts)
[^unchecked]: Not checked.
