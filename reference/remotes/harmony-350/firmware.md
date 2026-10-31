# Harmony 350: firmware

The 350 runs the image Logitech's package carries, byte for byte; the Harmony 300 runs a near copy of it, a
different build of the same version, and Logitech's manifest names skins 78, 79 and 104 for the one. Its
package, version, layout, routines and safe mode are stated once in
[the architecture's firmware.md](../../architectures/harmony-300-350/firmware.md).

| | value |
|---|---|
| version | 1.4[^s196]; the product string says `0-1.4.0`[^s193] |
| where it is served | Logitech's software update service, by product 104[^s196] |

**MyHarmony asks the software update service for the Harmony 350 by name**, where the Harmony 600, 650 and
700 take another route[^s295].

**Entering safe mode or the bootloader on a Harmony 350 destroys nothing.** Both images were read off one,
and safe mode writes the application only when a firmware install asks it to, copying the staged image and
never itself; it is entered by a held key, by the reboot that asks for it, or by an application that fails
its checksum, and in safe mode the product string says `4-1.4.0`. The detail is
[the family's](../../architectures/harmony-300-350/firmware.md#safe-mode-and-recovery)[^t-harmony-350-boot].

## Not checked

* The version a unit runs, from its own `/sys/sysinfo`.
* Which printed keys enter safe mode and the bootloader: the codes are read, the keys they are on are not.

[^s196]: Stated by Logitech, by their service. [Section 196](../../../docs/findings.md#s196)
[^s193]: Measured on a unit. [Section 193](../../../docs/findings.md#s193)
[^s295]: Stated by Logitech, in their client. [Section 295](../../../docs/findings.md#s295)
[^t-harmony-350-boot]: Read in the firmware. [The test](../../../tests/test_harmony_350_boot.py)
