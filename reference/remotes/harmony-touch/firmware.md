# Harmony Touch: firmware

The Touch runs the firmware image Logitech serves for a whole family of later remotes. Which products share
it, the versions that exist, the factory images and Logitech's network reset are
[the platform's firmware](../../architectures/harmony-touch/firmware.md). This page holds what is the
Touch's own.

| | value | evidence |
|---|---|---|
| version | **4.15.330**, the `fw_ver` field of its `/sys/sysinfo`; exactly the production build Logitech's update service serves for skin 99, fetched before the remote was read | [^s200], [^s196] |
| `fw_type` | `0x00`, running normally | [^s200] |
| the image | `skin99-touch-production-4.15.330.hfw2`, 13041774 bytes, byte identical to the file served for skin 112, the Harmony 950 | [^s196] |
| a factory image | published on Logitech's content network with no key, for skin 99 and one hub skin only | [^s196] |

The image's contents have not been examined[^unchecked].

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

* The image's contents, and where on the remote the firmware and the configuration live[^unchecked].
* Whether the update service's anonymous request serves a different build than a registered unit
  gets[^unchecked].

[^s200]: Measured on a unit. [Section 200](../../../docs/findings.md#s200)
[^s196]: Stated by Logitech, by their service. [Section 196](../../../docs/findings.md#s196)
[^unchecked]: Not checked.
[^s195]: Measured on a unit. [Section 195](../../../docs/findings.md#s195)
