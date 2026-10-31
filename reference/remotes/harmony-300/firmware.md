# Harmony 300: firmware

The 300 runs a near copy of the Harmony 350's program: the same code but for one routine, at version 1.4 on
both. Logitech publishes one firmware package that names both, and the image in that package is the
Harmony 350's. Its version, layout, routines and source are stated once in
[the family's firmware.md](../../architectures/harmony-300-350/firmware.md#the-two-models-images-compared).

What is the 300's own: the package names it, its list of intended skins being 78, 79 and 104, the two
Harmony 300 skins and the Harmony 350's[^s196], at version 1.4[^s196]; a Harmony 300 read runs its own build
of it, which differs from the package in the `bcdDevice` word, one routine's mask on the send kind and the
addresses that follow, and has a bootloader and a safe mode image, 1.2, of its own, [the
comparison](../../architectures/harmony-300-350/firmware.md#the-two-models-images-compared)[^t-harmony-300-350-images-u].

## Not checked

* The version a remote of this model runs, from its own `/sys/sysinfo`.
* Whether Logitech's software update service serves the image when asked by skin 78 or 79 as well as by
  104.
* How safe mode and the bootloader are entered on this model, and what they do: [the family's account](../../architectures/harmony-300-350/firmware.md#safe-mode-and-recovery)
  was read in a Harmony 350's two images, and this model's are different builds, so it is the 350's until
  they are read for their own routines[^unchecked].

[^s196]: Stated by Logitech, by their service. [Section 196](../../../docs/findings.md#s196)
[^unchecked]: Not checked.
[^t-harmony-300-350-images-u]: Measured on a unit. [The test](../../../tests/test_harmony_300_350_images.py)
