# How a hub is set up, and what a second hand one does

A hub out of the box is not tied to anyone. Provisioning is how it becomes tied to a setup and an account, and
this page is that process: what the hub stores, the modes a hub and a remote report about themselves, what
happens when a hub that already belongs to someone is re-homed, and how the hub updates its own firmware. The
second hand case is the one with teeth, because the hub arrives carrying a stranger's setup, and the good news
is that the hub clears it by itself when it is given a new one.

## The configuration the hub serves

When the hub is asked for its configuration, it does not hand back a single packed file the way the older
remotes are programmed with. It reassembles the answer from a handful of files it keeps on its own storage:
the activities, the devices, the commands, the protocols, the context, and the home automation configuration,
with a couple more for the map of it all and the hub's capabilities[^t-hub-provisioning]. Each is ordinary
readable data, and each carries a tag, so a short request for just the tags tells a client whether its copy is
still current without fetching the whole thing[^t-hub-provisioning]. This confirms, on the hub's own image,
what the generation's [configuration read](../api/engine.md) could only state for the handheld: the hub's
answer is reassembled readable documents, not a binary container.

## Being provisioned, and the modes

The hub keeps what it has been tied to in a settings store on its writable storage: the account, the login
token, a mode, the owner's address, the hub's own identity, and the addresses of Logitech's services it was
told to use[^t-hub-provisioning]. The hub counts itself provisioned once an owner's address is stored, and
clearing the store un-ties it[^t-hub-provisioning].

The request that ties a hub or a remote to a setup branches on what is asking, a remote or a hub, and records
a mode that says what role the device plays[^t-hub-provisioning]:

| mode | what reports it | meaning |
|---|---|---|
| 0 | a remote | a standalone remote tied straight to an account |
| 1 | a remote | a remote paired to a hub as an extender |
| 2 | a hub | a hub in extender mode, given an account but not logged in to the service |
| 3 | a hub | a hub in full mode, logged in to the service |
| 4 | a remote | a remote that took its setup from a paired hub |

A hub only accepts the extender mode or the full mode, and the full mode needs a service login
token[^t-hub-provisioning]. A remote in the last mode is one that asked a paired hub for its setup and adopted
it, which needs the hub to be in full mode; this is how a remote in a set shows the hub's configuration without
being programmed separately[^t-hub-provisioning].

## A second hand hub

A hub bought used still holds the previous owner's configuration and account until it is re-homed, and the
question is what clears them. The answer is that re-homing clears them by itself: before it ties a hub to a new
setup, the hub compares the new account and setup against the stored one, and if they differ it wipes its
whole data folder and starts the store fresh[^t-hub-provisioning]. So setting a used hub up under a new account
removes the old owner's configuration and account as part of the setup, with no separate factory reset needed
for the configuration, though a factory reset command does exist on [the hardware
page](hardware.md#the-status-light-and-the-system-commands)[^t-hub-provisioning]. The wipe deliberately keeps a
couple of things across it: a paired lighting bridge's own pairing, and any extra home automation code the hub
was sent, which are moved aside and back[^t-hub-provisioning].

## Updating its own firmware

The hub updates itself, and the update is mostly the hub's own but hangs on the service in one place. The hub
asks the service where to download an update from, downloads the package, leaves it in its cache, and restarts
into an update; the early boot applies the cached package and comes back on the new firmware[^t-hub-provisioning].
The package is the same shape the handheld's firmware comes in, [the generation's firmware](../firmware.md).
The one place the service is needed is that the download address is handed back by the service rather than
fixed in the hub, so a hub cut off from the service cannot find an update on its own; the applying of a package
already in the cache is entirely local[^t-hub-provisioning]. So a local stand in for the service would have to
answer the hub's question of where to download from, and the apply would then work as it always does.

[^t-hub-provisioning]: Read in the firmware. [The test](../../../../tests/harmony_touch/test_harmony_hub_firmware.py)
