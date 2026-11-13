# The hub's hardware, and the commands that drive it

One native program on the hub owns all of its hardware: the Wi-Fi, the infrared, the private 2.4 GHz radio,
the Bluetooth radio, the status light, and the factory data. The engine reaches it by sending it named
commands, and a computer on the cable or on the network reaches the same commands through the engine. This
page is that command set, grouped by what it drives, because it is the list an application needs to make a
hub act, and the list a reader needs to know which commands change the hub and which only ask it
something[^t-hub-hardware].

The commands fall into families by a prefix, and the hub exposes each in two forms that reach the same
handler: a short dotted name, and a path in a file tree, so a host that opens the file protocol writes to a
path and the engine sends a dotted name[^t-hub-hardware]. The behaviour inside the native program was read
from its text only, since the machine has no disassembler for its processor, so a few exact details are left
open and marked[^t-hub-hardware][^unchecked].

## Wi-Fi

This is the command that keeps a hub usable after the service is gone, so it comes first. Setting the hub's
Wi-Fi is one command with three things: the network name, the password, and the security type, where the
security types are the ordinary ones, the two common protected kinds, the old insecure kind, and an open
network[^t-hub-hardware]. Underneath, the native program drives the standard Linux Wi-Fi supplicant with the
same steps any Linux machine uses to join a network, and tells it to save the result, so the mechanism is
well understood and not Logitech's invention[^t-hub-hardware]. Joining a network is reversible: there is a
command to clear the saved networks, and setting a different one replaces it[^t-hub-hardware]. Whether setting
a network also clears earlier ones by itself, rather than adding to them, was not settled from the program's
text[^t-hub-hardware][^unchecked].

The other Wi-Fi commands only ask: one scans for networks in range and returns what it finds, one reports the
current connection, its name and address and signal, and whether a network is saved at all, and one does the
push button pairing some routers offer[^t-hub-hardware]. Of all of these, the only one the hub's own software
ever sends by itself is the status read; setting the network is always something a host asks for[^t-hub-hardware].

## Infrared

The hub sends and learns infrared. A command carries the raw blink pattern and which of the blaster outputs
to use, and the hub blinks it; the default output is the hub's own built in blaster, and another output sends
the pattern through a paired wireless mini blaster placed near a device the hub cannot see[^t-hub-hardware].
There is a learning command that captures a code held in front of the hub, which is how a new device's codes
are taught; the exact shape of what it returns was not read[^t-hub-hardware][^unchecked]. A send through a
wireless blaster that is out of reach fails with a message saying the radio link timed out or was
lost[^t-hub-hardware].

## The private 2.4 GHz radio

The hub has a second radio, separate from Wi-Fi and Bluetooth, which is its private link to Logitech's own
wireless accessories: the Harmony remote of the set itself, and the wireless infrared mini blasters[^t-hub-hardware].
Commands on it open the radio to add a device, remove a device, and report what is paired[^t-hub-hardware].
Once a device is paired, the hub can tunnel the other families to it, so an infrared pattern, a keyboard
keystroke or a Bluetooth action can be sent out through a paired accessory rather than from the hub
itself[^t-hub-hardware]. One command of the engine's own, rather than switching a device, switches the hub's
own infrared to go out through a paired blaster instead of the built in one[^t-hub-hardware].

## Bluetooth and keyboard

The hub drives Bluetooth devices, which is how it controls things a game console understands, and how it can
act as a keyboard for a device that takes one[^t-hub-hardware]. There are commands to connect to and
disconnect from a Bluetooth device, to send it an action, and to report its state, and commands to present a
keyboard and send keystrokes, over Bluetooth or through a paired wireless accessory[^t-hub-hardware]. The hub
also carries a Bluetooth Low Energy side for smart home devices, reached through its home automation layer
rather than this family, [the automation page](automation.md)[^t-hub-hardware].

## The status light and the system commands

A single coloured light on the hub shows everything it is doing, driven from the native program as a small
machine of states, idle, no configuration, pairing, downloading, running on USB power, and the rest, moved
between by events such as a configuration succeeding or failing, the network coming up or going down, an
infrared code firing, or a sync starting[^t-hub-hardware].

The system family is the hub as a whole. Some of it only asks: the hub's identity and firmware and state, a
liveness check, its network address, the system log, and the contents of a system file[^t-hub-hardware]. Some
of it acts: restart the hub, factory reset it by leaving a marker that the next boot acts on, stage and apply
a firmware update, drive the light, and a radio test command meant for the factory[^t-hub-hardware]. The
command that would start the absent remote access service is here too, and does nothing on a shipped hub
because the program it would start is not present[^t-hub-hardware].

## Reads and writes, for a read only application

For an application that reads a hub without changing it, the asking commands are safe: the identity and state,
the Wi-Fi status and scan, the paired device list, the Bluetooth state, the log. The acting commands are the
ones a read only application must not send and a writing one must send deliberately: setting or clearing the
Wi-Fi, pairing or unpairing on the private radio, sending or learning infrared, connecting or acting on
Bluetooth, driving the light, restarting, factory resetting, updating, and the factory radio test[^t-hub-hardware].
The project's own rule, that a hub is read only until a path has its own approval and its own rail, applies to
every command in the acting list.

[^t-hub-hardware]: Read in the firmware. [The test](../../../../tests/harmony_touch/test_harmony_hub_firmware.py)
[^unchecked]: Not checked.
