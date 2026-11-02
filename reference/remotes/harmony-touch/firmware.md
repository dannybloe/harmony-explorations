# Harmony Touch: firmware

The Touch runs the firmware image Logitech serves for a whole family of later remotes. Which products share
it, the versions that exist, the factory images and Logitech's network reset are
[the platform's firmware](../../architectures/harmony-touch/firmware.md). This page holds what is the
Touch's own.

| | value | evidence |
|---|---|---|
| version | **4.15.330**, the `fw_ver` field of its `/sys/sysinfo`; exactly the production build Logitech's update service serves for skin 99, fetched before the remote was read | [^s200], [^s196] |
| `fw_type` | `0x00`, running normally | [^s200] |
| the image | the production package for skin 99, 13041774 bytes, byte identical to the file served for skin 112, the Harmony 950 | [^s196] |
| a factory image | published on Logitech's content network with no key, for skin 99 and one hub skin only | [^s196] |

The image is a Linux system for TI's DA850 processor, with a signature over what runs, the remote's engine
in compiled Lua and its screens in Lua source; what it holds is
[the platform's firmware](../../architectures/harmony-touch/firmware.md#the-remotes-package)[^t-touch-image].
This said the image's contents had not been examined until it was read.

## Reset and restart

* **Logitech's factory reset** installs a whole factory firmware image fetched over the network, through a
  hidden recovery tool in their desktop clients, [the platform's firmware](../../architectures/harmony-touch/firmware.md).
  It is Logitech's route and this library has no part in it. A Touch reset that way holds a configuration
  of zero bytes[^s195].
* **`/sys/factoryreset` and `/sys/reboot`** are controls rather than files: both open for reading, and
  opening one is to be taken as the action its name says[^s200]. They are kept out of reach by
  `INERT_PATHS`, [usb.md](usb.md).
* Safe mode and a bootloader on this model are **not checked**[^unchecked].

## Not checked

* Where on the remote the firmware and the configuration live[^unchecked].
* Whether the update service's anonymous request serves a different build than a registered unit
  gets[^unchecked].

[^s200]: Measured on a unit. [Section 200](../../../docs/findings.md#s200)
[^s196]: Stated by Logitech, by their service. [Section 196](../../../docs/findings.md#s196)
[^unchecked]: Not checked.
[^s195]: Measured on a unit. [Section 195](../../../docs/findings.md#s195)
[^t-touch-image]: Read in the firmware. [The test](../../../tests/test_harmony_touch_image.py)
