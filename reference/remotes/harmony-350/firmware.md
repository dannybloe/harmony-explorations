# Harmony 350: firmware

The 350 runs the image the Harmony 300 runs: one package from Logitech names skins 78, 79 and 104. Its
package, version, layout, routines and safe mode are stated once in
[the architecture's firmware.md](../../architectures/harmony-300-350/firmware.md).

| | value |
|---|---|
| version | 1.4[^s196]; the product string says `0-1.4.0`[^s193] |
| where it is served | Logitech's software update service, by product 104[^s196] |

**MyHarmony asks the software update service for the Harmony 350 by name**, where the Harmony 600, 650 and
700 take another route[^s295].

## Not checked

* The version a unit runs, from its own `/sys/sysinfo`.
* How safe mode and the bootloader are entered on this model, and what they do: the application's side
  of recovery is [the family's](../../architectures/harmony-300-350/firmware.md#safe-mode-and-recovery), and
  the two images below it have not been read.

[^s196]: Stated by Logitech, by their service. [Section 196](../../../docs/findings.md#s196)
[^s193]: Measured on a unit. [Section 193](../../../docs/findings.md#s193)
[^s295]: Stated by Logitech, in their client. [Section 295](../../../docs/findings.md#s295)
