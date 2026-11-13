# The remote and the hub

Some remotes of this generation work on their own, and some drive a hub. The Harmony Touch is a remote that
works on its own: it has its own infrared blaster and sends to a television directly. The Harmony Elite is a
remote and a hub together, and the remote mostly tells the hub what to do while the hub does it. This page is
how a hub paired remote relates to its hub, read in the remotes' image, because it is a side of the product
the standalone Touch does not show and the hub pages only see from the other end[^t-remote-hub].

**This is the generation's, not one model's.** The behaviour here belongs to any remote of this generation
that is paired with a hub, which the Elite is one of, alongside the Ultimate and Ultimate Home remotes. It is
written here at the platform level for that reason, and a model's own page would state only what is that
model's. The remotes' image is the same one the Touch runs, already read for the generation's engine and
screens, [the API](api/README.md) and [the firmware](firmware.md); what follows is only the part about talking
to a hub[^t-remote-hub].

## How a remote drives its hub

A hub paired remote addresses its hub as device number one and sends it the same kind of request it would run
itself, and the radio carries that request to the hub. It is the exact mirror of the hub's own side, where the
hub reaches a paired accessory by the same numbered convention, [the hub's radio](hub/hardware.md#the-private-24-ghz-radio):
the two ends tunnel to each other's hardware the same way[^t-remote-hub]. So a key press or an activity on the
remote becomes a request the hub carries out, and the remote is, for most of what it does, a screen and a
keypad in front of the hub.

What the remote hands to the hub rather than doing itself, each read in the engine[^t-remote-hub]:

* its **clock**: the remote asks the hub for the time;
* its **configuration**: the remote pulls its own configuration documents from the hub rather than from
  Logitech directly, which is why a remote in a set shows what the hub holds, [provisioning](hub/provisioning.md);
* its **firmware**: firmware requests go to the hub;
* its **identity, Wi-Fi, power and light**: the remote reads these off the hub.

What the remote keeps for itself is its **own infrared blaster**: the same engine code the hub runs lets the
remote send a code from its own blaster or route it through the hub, so a hub paired remote can still blast
infrared directly, which is why one reports an infrared feature of its own[^t-remote-hub].

## Taking its setup from the hub

A remote that is paired to a hub does not have to be tied to an account by itself. It asks the hub for the
hub's own setup and adopts it: it sends the hub a request for its provisioning, requires the hub to be in full
hub mode, and on success records that it is a remote provisioned from a hub and stores what the hub gave,
[the provisioning modes](hub/provisioning.md#being-provisioned-and-the-modes)[^t-remote-hub]. After that the
remote is a view of the hub, its account, its configuration and its clock all the hub's. A standalone remote,
by contrast, is tied to an account directly and fetches its own configuration. The mode a remote reports says
which of the two it is.

## The remote's own screen engine

The remote draws its screens with a program of its own that the hub has not, since a hub has no
screen[^t-remote-hub]. It is a separate process from the engine, started at boot, a small drawing toolkit that
talks to the engine over the same local request channel the rest of the system uses: it draws the screens and
sends the user's taps back to the engine as requests. Its screens include the ones a standalone infrared
remote has no use for, the smart home control screens for lights, blinds and speakers, alongside the activity
and device screens; how those smart home screens know what to show is the capability model below. How a drawn
screen becomes pixels was not traced[^unchecked].

## The smart home screens, and the capability model

A smart home screen, the one for the lights or the blinds, is drawn from two sources at once, and keeping them
apart is the whole of how it works. What devices there are, what kind each is and what each can do comes from
the configuration the remote synced from the hub; what each device is doing at this moment, whether a light is
on and how bright, comes from a live request to the hub for its current state[^t-remote-hub].

The structure is one of the synced configuration documents, the automation configuration, filled by the hub
from what [its smart home side](hub/automation.md) found on the network and read on the remote out of the
synced resources rather than fetched again for each screen[^t-remote-hub]. It lists the bridges the hub found,
the devices behind them, the groups and the scenes, and for each device a kind and a table of
capabilities[^t-remote-hub]. The kind is lamp, plug, lock, blind, thermostat, water heater or a kind of
sensor. The capabilities are what choose the controls the screen draws: a lamp that can be dimmed is given a
brightness control and a colour one, a lamp that cannot is treated as a plug and given an on and off switch and
nothing more, and a sensor's capability names what it senses, presence or temperature or smoke and the
rest[^t-remote-hub]. So one screen program draws a different set of controls for each device, from what that
device itself declares, and which bridge or maker a device came from is not built into the drawing.

The live values are a request the remote tunnels to the hub, and a tap writes the new value back the same way:
the remote asks the hub for the state of the devices on the screen, and when the user moves a slider or presses
a switch it sends the hub the new state for that one device, keyed by the device's kind, a light's brightness
and colour, a lock's locked flag, a blind's position[^t-remote-hub]. If the radio link to the hub has dropped,
the request comes back refused and the remote tells the user the hub cannot be reached[^t-remote-hub].

The smart home devices are not a menu of their own. They are merged into the one device list, alongside the
infrared and networked devices, and a tap on a row is routed by the device's kind to the screen that kind
uses[^t-remote-hub]. The whole smart home side is shown only on a remote that took its setup from a hub,
[provisioned in full hub mode](hub/provisioning.md#being-provisioned-and-the-modes): a standalone remote is
never in that state and shows none of it, and a category the hub found no bridge for simply draws no
rows[^t-remote-hub].

End to end, then: the hub discovers a device through its own plug in and records it in the automation
configuration with a kind and its capabilities; that document syncs to the remote with the rest of the
configuration; the remote reads the synced structure to decide which rows and which controls to draw, and asks
the hub for the live values to fill them; and a tap sends the new state back through the hub[^t-remote-hub].
The remote holds no plug in and no device driver of its own. It is a renderer over the hub's automation
configuration and the hub's live state, driven by what each device declares it can do. One qualification: the
remote does carry a few fixed bounds for the controls it draws, the per maker temperature limits for a
thermostat and the range of a light's colour control among them, so the bounds are the remote's while the
choice of control is the device's[^t-remote-hub].

The configuration does not only flow from the hub to the remote. When the user reorders the commands on a
device, the remote writes the changed ordering back to the hub as a configuration document of its own, so the
remote is an editor of that document and not only a reader of it[^t-remote-hub].

## The remote's own hardware

The remote has hardware a hub does not, driven by its own native program: a **vibration motor** for haptic
feedback, with its own calibration; a **battery** and its charging, managed by a power chip; a **screen
backlight**; an **accelerometer**, which is how the screen wakes when the remote is picked up; and a status
light[^t-remote-hub]. These are read as names in the remote's program rather than traced, so their presence is
certain and their exact behaviour is not settled here[^t-remote-hub][^unchecked]. They are the generation's
remote hardware, shared across its remotes, rather than any one model's.

[^t-remote-hub]: Read in the firmware. [The test](../../../tests/harmony_touch/test_harmony_touch_remote_and_hub.py)
[^unchecked]: Not checked.
