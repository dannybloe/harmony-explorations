# Reaching the hub over the network

The handheld remotes of this generation are reached only by a cable. The hub is reached over the home network,
and that is most of what makes it a hub. This page is what listens, how a client finds the hub, what the hub
asks of a client before it will take a command, and, the part that matters for preservation, how much of this
still works when Logitech's service is gone.

## What listens

Once the hub has a network address it opens several listeners, and it does this on getting the address, not on
being tied to an account, so a hub answers on the network before it belongs to anyone[^t-hub-network]. Two of
the listeners take commands from the network; the rest are either for the hub's own processes or only announce
the hub.

* A messaging port, the kind instant messaging uses, open to the network. It carries the hub's commands. It is
  only opened when the hub's loaded configuration turns it on, so whether a given hub is listening on it
  depends on that hub's configuration[^t-hub-network].
* A web port, open to the network, that carries the same commands wrapped as web requests, both as a plain
  request and as a long lived web socket. This one comes up whenever the hub has an address[^t-hub-network].
* A web port bound to the hub itself and a second local only port, both reachable only from inside the hub,
  for its own programs to talk to each other[^t-hub-network].
* Two announcing channels, described under finding the hub below[^t-hub-network].

The commands these carry are the generation's own request grammar, the same `area.command?verb` requests the
handheld speaks over a cable, [the API](../api/README.md). So the hub is the same engine's requests carried
over the network instead of over USB.

## What the hub asks before it takes a command

This is the part to understand before putting a hub anywhere, so it is stated plainly: **the hub's network
listeners do not ask for a secret.** 

The messaging port offers one login method and then does not check the password at all; it accepts a built in
guest name outright, and otherwise accepts any name when the hub has not yet learned its own identity, and the
hub's own identity once it has[^t-hub-network]. The web port checks only that the request claims the hub's own
numeric identity and setup, both of which the hub itself hands out to anyone who asks on the network, and
guards against a web browser being tricked into sending the request from the wrong site[^t-hub-network]. None
of these is a password. They are a design that trusts whatever is already on the home network.

## Finding the hub

A client on the network finds the hub two ways, both without any credential[^t-hub-network]. One is the
standard home network discovery that media devices use, where the hub answers a search with its web address
and a description naming it as a Harmony Hub. The other is a small channel of the hub's own, where a client
sends a datagram and the hub connects back with its details. Either way, what the client learns includes the
numeric identity that the web port then asks for, which is why that identity is not a secret.

## Why the hub must not face the internet

Put the two facts together, that the listeners ask for no secret and that the hub publishes the one identity
they do check, and the rule follows: **anything on the same network can fully drive the hub, so a hub must
never be exposed to the internet or placed on an untrusted network**[^t-hub-network]. The test and development
gate on [the system page](system.md#the-test-and-development-gate) is a second reason: it would turn the same
network service into one that reads and writes files. This is a local trust design, correct for a device on a
home network and wrong for anything else, and an application built on it inherits the same rule.

## What survives Logitech's service going away

This is the preservation question, and the answer is the reason the hub is worth saving. The listeners that
take commands are the hub's own and run on the local network with nothing from Logitech in the loop, so they
keep working when the service is gone[^t-hub-network]. The hub also keeps outbound connections to Logitech, a
messaging client to the service and a relay used so an application can reach the hub from outside the home;
those are the hub dialing out, and when the service is gone they simply fail to connect and the local
listeners are unaffected[^t-hub-network]. So an application on the home network can keep reading the hub's
configuration and driving it after the service stops.

What does not survive on its own is anything the hub fetches from the service: its account login, and the
address it is told to download a firmware update from, [provisioning](provisioning.md). Those would need a
local stand in that answers in the service's place, which is a separate undertaking from talking to the hub.

## For this project, this is read only

Everything above is read in the firmware; nothing has been sent to a hub over the network by this project.
Sending a hub anything over the network is a new path with none of the safety the cable path has, and even a
read means opening a connection to the hub and logging in through its open local login, so the first contact
is an experiment to be approved, not a step taken unasked. The planned sequence, a narrow read only
network channel and a written prediction before anything is sent, is the project's plan for this and is not
part of the reference.

[^t-hub-network]: Read in the firmware. [The test](../../../../tests/harmony_touch/test_harmony_hub_firmware.py)
