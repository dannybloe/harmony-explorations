# The Harmony Hub

The Harmony Hub is the part of Logitech's last generation that sits by the television instead of in the
hand. The handheld remotes of this generation, the Harmony Touch and its relatives, send their commands to
a hub, and the hub is what actually blinks the infrared, talks to a game console over Bluetooth, or reaches
a networked speaker. A set such as the Harmony Elite is a remote and a hub together, and the remote's screen
is a window onto a configuration that lives on the hub[^t-hub-platform].

The hub runs a sibling of the handheld's software: the same engine, the same request API, the same
configuration documents, built for the hub's own processor[^t-hub-platform]. So most of what this generation
does is already written down for the whole generation, and this folder does not repeat it. What it holds is
what the hub is on its own and the handheld is not: a small networked Linux computer, reached over the home
network rather than only by a cable, with radios for Wi-Fi, a private 2.4 GHz link, Bluetooth and infrared,
and a role as a smart home controller.

**Why this matters for keeping a hub alive.** Logitech's service for this generation can be withdrawn, and
the point of reading the firmware is to know what a hub still does without it. The short answer, argued in
the pages below, is: a great deal. The hub answers on the local network with no cloud involved; its Wi-Fi is
set by one ordinary command; and a second hand hub re-homes itself to a new setup by itself. The parts that
do lean on Logitech's service, and what a local stand in would have to answer, are named where they
occur[^t-hub-platform].

**One image has been read, the hubs' production firmware 4.15.600**, the package Logitech's service serves
for the hub skins, read only, in its Linux filesystem, its engine and its one native program[^t-hub-platform].
Nothing here was sent to a hub. Where a fact needs a running hub to settle, or needs the processor's own
instructions disassembled, the page says so and the claim is marked unconfirmed. The units this project has
read, and what they answered, are not here; those are its test notes.

## What the hub is

A small Linux computer on an Atheros chip, with a 2.4 GHz radio coprocessor for its private link to the
remote and its infrared extenders, a Bluetooth radio, Wi-Fi, and a wired USB port that speaks the same file
protocol the handhelds use on a cable[^t-hub-system][^t-hub-hardware]. It keeps its configuration as a set of
files on its own writable storage, serves it to the remote and to an application over the network, and drives
real devices through one native program that owns all the hardware[^t-hub-system][^t-hub-hardware].

## The pages

* **[system.md](system.md)**: the Linux system, how it boots, where it keeps the configuration and the Wi-Fi
  network, and the test and development gate that unlocks a file read and write service.
* **[network.md](network.md)**: how the hub is reached, the local network listeners, the local login that
  needs no cloud password, how a client finds the hub, and which of all this survives Logitech's service
  going away.
* **[hardware.md](hardware.md)**: the one native program and the commands that drive Wi-Fi, infrared, the
  2.4 GHz radio, Bluetooth and the status light.
* **[provisioning.md](provisioning.md)**: how a hub is tied to a setup, the modes a hub and remote report,
  what a second hand hub does when it is re-homed, and how the hub updates its own firmware.
* **[automation.md](automation.md)**: the hub as a smart home controller, and the home systems it speaks to.

The shared engine, its request API and the configuration documents are the generation's, one level up:
[the API](../api/README.md), [the firmware](../firmware.md), and the platform
[on the cable](../usb.md).

[^t-hub-platform]: Read in the firmware. [The test](../../../../tests/harmony_touch/test_harmony_hub_firmware.py)
[^t-hub-system]: Read in the firmware. [The test](../../../../tests/harmony_touch/test_harmony_hub_firmware.py)
[^t-hub-hardware]: Read in the firmware. [The test](../../../../tests/harmony_touch/test_harmony_hub_firmware.py)
