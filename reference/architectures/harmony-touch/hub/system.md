# The hub's Linux system

The hub is a small Linux computer, and this page is what it is made of, how it starts, and where it keeps the
two things worth keeping: the configuration and the Wi-Fi network. It also describes one gate in the firmware
that turns an ordinary read only hub into one that will read and write any file on command, because knowing
that gate exists is part of knowing why the hub must never be put on an untrusted network.

## The computer

The hub runs a Linux built with the Yocto/Poky toolchain, on a 2.6.31 kernel for a big endian MIPS processor,
an Atheros system on a chip[^t-hub-system]. The userland is the small embedded kind: a single BusyBox program
provides the shell and most commands, the C library is uClibc, and there is no large init system, just BusyBox
starting one boot script[^t-hub-system]. The board calls itself by a codename in the firmware, and asks for an
address on the network under the name a person would recognise, Harmony Hub[^t-hub-system].

Three radios and a wired port hang off that computer, each with its own driver loaded at boot: an Atheros
Wi-Fi interface, a separate 2.4 GHz coprocessor for the hub's private link to the remote and its infrared
extenders, a Bluetooth radio, and a USB device mode port that lets the hub speak the file protocol to a
computer on a cable exactly as the handhelds do[^t-hub-system][^t-hub-hardware]. The radios and the hardware
are driven by one native program, [the hardware page](hardware.md).

## How it starts

BusyBox init runs a single boot script, which mounts the filesystems, loads the hardware drivers, starts the
logging and a watchdog, brings up Bluetooth and the network, starts the one native hardware program, and then
starts the engine, the hub's Lua application, pointed at its data folder[^t-hub-system]. The engine runs as a
set of cooperating tasks, one per part of the job, which is how the rest of these pages are organised: the
configuration, the network service, provisioning, home automation, and so on[^t-hub-engine]. The native
hardware program and the other native services start before the engine, so the engine always has its hardware
underneath it[^t-hub-system].

There is no login waiting on a serial port or on the network in the shipped firmware: the boot script's own
remote access service is present as a reference to a program that is not in the image, so that branch does
nothing[^t-hub-system]. A short detour exists for the factory, selected by a hardware flag the boot script
reads, which brings up a radio test setup instead of the normal one; on a shipped hub the flag is off and the
normal path runs[^t-hub-system].

## Where the configuration lives

The operating system itself is on a read only part of the flash. The things that change, the configuration
and the downloads, live on a separate writable area mounted as the data folder, and the firmware image does
not itself say how that area is mounted, which is settled only on a running hub[^t-hub-system][^unchecked].

The configuration is a set of files there: the activities, the devices, the commands, the protocols, the
context and the home automation configuration, each a file under the data folder's resources, with an index
beside them that records a tag per file[^t-hub-engine]. This is the same set the hub hands back when it is
asked for its configuration, [the configuration read](provisioning.md#the-configuration-the-hub-serves). Lua
packages the hub has been sent, and firmware downloads, live in their own folders on the same writable area;
the downloads land in a cache that the boot script clears once an update has been applied[^t-hub-system].

## Where the Wi-Fi network lives

The saved Wi-Fi network is not in the data folder with the configuration. The hub runs the standard Linux
Wi-Fi supplicant, and its one settings file is told to save changes, so when the hub is given a network, that
file is rewritten with it[^t-hub-system][^t-hub-hardware]. How the network is set is one command, [the
hardware page](hardware.md#wi-fi). Whether the saved network then survives a power cycle depends on that
settings file sitting on writable storage that persists, which the firmware image alone does not show and a
running hub would[^t-hub-system][^unchecked].

## The test and development gate

The firmware carries a gate meant for Logitech's own testing, unlocked by the presence of one marker file. It
is worth naming because of what it unlocks, not so anyone opens it. With the marker present, the hub's network
service exposes a pair of commands that will read and write an arbitrary file at an arbitrary path on the hub;
without it, those commands refuse with a message that says the hub is in production mode[^t-hub-system]. The
same marker turns off crash reporting and tags the usage log. Whether the marker can be created from outside
the hub, and under what checks, is in the native program and was not read, so it is left open[^t-hub-system][^unchecked].

The lesson for an application is the one the network page draws out in full: the hub trusts whatever is on its
network, [the network page](network.md#why-the-hub-must-not-face-the-internet). The gate is a second reason,
on top of the login, never to expose a hub to the internet.

## A note on the shipped shell account

The firmware's account file gives the administrator account a password, but with no login service running on
a shipped hub there is nothing on the hub that asks for it, and the remote access program that would is not in
the image[^t-hub-system]. The hub also carries a fixed host key for that absent service, which would be the
same on every hub if the service ran. None of this is reachable on a shipped hub as read; it is recorded so
that a later firmware that did ship the service would be read against it[^t-hub-system].

[^t-hub-system]: Read in the firmware. [The test](../../../../tests/harmony_touch/test_harmony_hub_firmware.py)
[^t-hub-hardware]: Read in the firmware. [The test](../../../../tests/harmony_touch/test_harmony_hub_firmware.py)
[^t-hub-engine]: Read in the firmware. [The test](../../../../tests/harmony_touch/test_harmony_hub_firmware.py)
[^unchecked]: Not checked.
