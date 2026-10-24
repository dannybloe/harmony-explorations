# Harmony 350: behaviour

What the remote does in use. It is told here from Logitech's setup guide and from what its configurations
hold; nothing about the 350 in use has been observed on a unit.

## Device mode, without a screen

**A device key is device mode.** Press one of the four device keys, briefly for one device or for two
seconds for another, and the remote controls that device; the power key then switches the selected device
on or off[^x-manual]. There is no list to choose from, and the guide says nothing about leaving it other
than pressing Watch TV or another device key. What device mode is on every Harmony is in
[how a Harmony works](../../how-a-harmony-works.md#the-two-things-a-harmony-can-be-doing).

## Watch TV

* Pressing **Watch TV** starts the one activity, switching on the devices it uses; keep the remote pointed
  at the devices until the device keys stop lighting. Pressing it again switches them all off[^x-manual].
* "Use Harmony 350 as your only remote; using other remotes could cause the devices in Watch TV Activity
  to become out of sync"[^x-manual].

## What the configurations say

* **Every send is paired with a `0x7C`**, 602 of 602 lists over the five configurations of this
  architecture, and some of them as a third shape, `{0x07, 0x7D, 0x7C}`, beside the plain pair[^s278].
  The rule is every architecture's, [the action language](../../config-format/actions.md).
* One configuration compiled for a 350 sends each code three times a press: 106 of its 130 records state
  a count, and every one of them states 3[^s259].

## Not checked

* Anything about the 350 in use, with or without an infrared receiver to watch it.
* What a long press on a device key does when that key holds only one device.

[^x-manual]: Stated by Logitech, in the manual. [The Harmony 350 setup guide](https://www.logitech.com/assets/51207/harmony-350-qsg-and-iid.pdf)
[^s278]: Measured in configurations. [Section 278](../../../docs/findings.md#s278)
[^s259]: Measured in configurations. [Section 259](../../../docs/findings.md#s259)
