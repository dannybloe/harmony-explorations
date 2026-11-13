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
and device screens[^t-remote-hub]. How a drawn screen becomes pixels was not traced[^unchecked].

## The remote's own hardware

The remote has hardware a hub does not, driven by its own native program: a **vibration motor** for haptic
feedback, with its own calibration; a **battery** and its charging, managed by a power chip; a **screen
backlight**; an **accelerometer**, which is how the screen wakes when the remote is picked up; and a status
light[^t-remote-hub]. These are read as names in the remote's program rather than traced, so their presence is
certain and their exact behaviour is not settled here[^t-remote-hub][^unchecked]. They are the generation's
remote hardware, shared across its remotes, rather than any one model's.

[^t-remote-hub]: Read in the firmware. [The test](../../../tests/harmony_touch/test_harmony_touch_remote_and_hub.py)
[^unchecked]: Not checked.
