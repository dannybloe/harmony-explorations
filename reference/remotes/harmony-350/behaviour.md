# Harmony 350: behaviour

What the remote does in use. **Nothing has been seen at the bench about the 350 in use**: no infrared bench
run exists for it, and what follows is Logitech's manual and what its configurations say.

## Device mode, without a screen

**A device key is device mode.** Press one of the four device keys, briefly for one device or for two
seconds for another, and the remote controls that device; the power key then switches the selected device
on or off. Logitech's manual, "Buttons" and "Device buttons". There is no list to choose from and no way
back other than Watch TV or another device key, as far as the manual says.

## Watch TV

* Pressing **Watch TV** starts the one activity, switching on the devices it uses; keep the remote pointed
  at the devices until the device keys stop lighting. Pressing it again switches them all off. Logitech's
  manual, "How the remote works".
* "Use Harmony 350 as your only remote; using other remotes could cause the devices in Watch TV Activity
  to become out of sync", Logitech's manual.

## What the configurations say

* **Every send is paired with a `0x7C`**, 602 of 602 lists over the five configurations of this
  architecture, with a third shape not seen elsewhere, read from configurations, section 278.
* A factory configuration sends each code three times a press: 106 of its 130 records state a count, and
  all of them state 3, read from configurations, section 259.

## Not checked

* Anything about the 350 in use at the bench, with or without the infrared receiver.
* What a long press on a device key does when that key holds only one device.
