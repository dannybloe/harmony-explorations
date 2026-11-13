# The hub as a smart home controller

Beyond driving a television and its devices, the hub talks to smart home systems: lights, thermostats, locks,
shades. This is a part the handheld remotes have no equivalent of, and it is a whole task of its own in the
hub's software. This page is what that task does and which home systems it speaks to, so an application knows
what a hub can control and where those controls come from[^t-hub-automation].

## How it works

The home automation is organised around small plug in pieces, one per kind of home system, loaded only when
they are needed[^t-hub-automation]. The hub finds the home systems on the network by asking each plug in to
look for its own kind of gateway or bridge, and collects what they find; if none is found it says so[^t-hub-automation].
Once a system is found, the hub can ask it for the state of a device, set a device's state, toggle it, refresh
it, and arrange devices into the hub's own list, through one command family for all of
them[^t-hub-automation]. Some home systems announce their own changes, and the hub runs a small server to
receive those announcements so its picture stays current[^t-hub-automation].

## Which home systems

The hub carries plug ins for seven kinds of home system, a mix of those reached on the local network and those
reached through the maker's own service[^t-hub-automation]:

| plug in | what it controls | reached |
|---|---|---|
| Philips Hue | lights, through the Hue bridge | local network |
| LIFX | Wi-Fi light bulbs | local network |
| Insteon | an Insteon home automation hub | local network |
| Hunter Douglas | powered shades | local network / bridge |
| Ecobee | thermostats | the maker's service |
| Honeywell | thermostats | the maker's service |
| August | smart locks | the maker's service |

The ones reached on the local network keep working without Logitech's service; the ones reached through their
own maker's service depend on that maker, not on Logitech[^t-hub-automation]. A hub can also be sent extra home
automation code, which lives on its writable storage and is kept across a re-home, [the second hand
hub](provisioning.md#a-second-hand-hub)[^t-hub-automation].

## The networked media devices

Separately from the smart home, the hub controls some devices over the network as ordinary activity devices
rather than by infrared: networked media players and speakers, through their own small plug ins[^t-hub-automation].
These are part of how the hub drives a device in an activity, alongside the infrared, radio and Bluetooth of
[the hardware page](hardware.md), and they too work on the local network without Logitech in the loop[^t-hub-automation].

## One caution about the discovery command

The command that finds home systems on the network is the one a third party's hub rooting method misused as
its way in. Its own job is only to look for gateways on the local network, which is what is described above;
the misuse is a separate matter, out of scope here and refused by the project's rails, and is named only so a
reader knows the command has that history[^t-hub-automation].

[^t-hub-automation]: Read in the firmware. [The test](../../../../tests/harmony_touch/test_harmony_hub_firmware.py)
