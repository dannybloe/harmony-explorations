# Harmony 300: firmware

The 300 runs the same program as the Harmony 350: Logitech publishes one firmware package for both, and
its version, layout, routines and source are stated once in
[the family's firmware.md](../../architectures/harmony-300-350/firmware.md).

What is the 300's own is only that the package names it: its list of intended skins is 78, 79 and 104,
the two Harmony 300 skins and the Harmony 350's[^s196], at version 1.4[^s196].

## Not checked

* The version a remote of this model runs, from its own `/sys/sysinfo`.
* Whether Logitech's software update service serves the image when asked by skin 78 or 79 as well as by
  104.
* How safe mode and the bootloader are entered on this model, and what they do: both were read off a
  Harmony 350, [the family's](../../architectures/harmony-300-350/firmware.md#safe-mode-and-recovery), and
  this model's own two images have not been, since Logitech's package carries the application alone.

[^s196]: Stated by Logitech, by their service. [Section 196](../../../docs/findings.md#s196)
