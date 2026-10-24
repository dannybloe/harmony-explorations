# Harmony 890 and 895: firmware

**No firmware image of this architecture exists anywhere**, in any published package or read off any
remote, so nothing on these pages was read in code.[^s115][^s122] That is the one gap that most limits what
can be said about the platform, and this page lists what it leaves open.

## What is known about it without an image

* **Logitech's classic client updates it over the tunnel.** Among the services the client registers on
  this platform's datagram channel is one named for updates, beside system, diagnostic, learn, time, a
  remote interface and a Z-Wave module, [usb.md](usb.md).[^s207] How an image travels through it is not
  read.[^unchecked]
* **The newest version the community comparison table knows is 4.9.0**, for every skin of the platform,
  in the generated table in [the README](README.md).[^x-forum-table]

## What an image would settle

* **Whether the slot map is right**: it was placed from the sections' contents alone, with no section
  seeker in a firmware to confirm which slot each caller asks for, [memory.md](memory.md).[^s183]
* **Where the duplicated chunks of a damaged read come from**, the remote or the tool that read it, and
  why the unit is 54 bytes, [usb.md](usb.md).[^s122]
* **How `bcdDevice` encodes the skin.** `0x0A` in the high byte is the obvious guess for the older form
  and is deliberately not implemented, since a prediction committed to code cannot be told from a
  measurement afterwards.[^s113]
* **Which part the processor is**, and whether the platform runs the Harmony 880 and 885's code, as the
  identical keypad positions, typeface and picture sizes suggest without showing.[^unchecked]

## Not checked

* Whether Logitech's software update service, or any other source, serves an image for skins 19, 23 or
  40.[^unchecked]
* Safe mode, the bootloader and recovery.[^unchecked]

[^s115]: Measured in configurations. [Section 115](../../../docs/findings.md#s115)
[^s122]: Measured in configurations. [Section 122](../../../docs/findings.md#s122)
[^s207]: Stated by Logitech, in their client. [Section 207](../../../docs/findings.md#s207)
[^unchecked]: Not checked.
[^x-forum-table]: Stated by a third party. [The comparison table](https://www.harmony-remote-forum.de/harmony_compare.php)
[^s183]: Measured in configurations. [Section 183](../../../docs/findings.md#s183)
[^s113]: Measured in configurations. [Section 113](../../../docs/findings.md#s113)
