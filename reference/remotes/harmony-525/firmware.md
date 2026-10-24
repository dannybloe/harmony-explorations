# Harmony 525: firmware

A 525 runs firmware 3.0, and keeps a second, smaller safe mode firmware beside it as a stored copy.
The images, how the bootloader installs them and why safe mode is a one way door are stated in
[the architecture's firmware.md](../../architectures/harmony-5xx/firmware.md), since they are read on this
model and are the architecture's as far as anything here knows.

| | value |
|---|---|
| application | 3.0, product string `Harmony Remote 0-3.0.0`[^s76] |
| safe mode image | 2.0, product string `Harmony Safe Mode!`[^s118] |
| newest firmware the forum table knows | 3.0[^x-forum] |
| where it comes from | Logitech publishes no package of it;[^s196] the manual has the owner update through the Harmony Remote Software[^x-manual] |

## The rail

**Never enter safe mode on a 525 as an experiment.** Holding Off while the batteries go in copies the safe
mode image over the application, and a power cycle does not undo it.[^s118] What leaving it consists of is
in [the architecture's firmware.md](../../architectures/harmony-5xx/firmware.md#safe-mode-is-a-one-way-door),
and this library's write path does not perform it.

## Not checked

* Any other firmware version for this model.[^unchecked]
* Whether a skin 18 remote runs the same images.[^unchecked]

[^s76]: Measured on a unit. [Section 76](../../../docs/findings.md#s76)
[^s118]: Measured on a unit. [Section 118](../../../docs/findings.md#s118)
[^x-forum]: Stated by a third party. [The forum comparison table](https://www.harmony-remote-forum.de/harmony_compare.php)
[^s196]: Stated by Logitech, by their service. [Section 196](../../../docs/findings.md#s196)
[^x-manual]: Stated by Logitech, in the manual. [The Harmony 525 user manual](https://www.manualslib.com/manual/454951/Logitech-Harmony-525.html)
[^unchecked]: Not checked.
