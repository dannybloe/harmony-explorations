# Harmony 525: firmware

The images, how the bootloader installs them and why safe mode is a one way door are stated in
[the architecture's firmware.md](../../architectures/harmony-5xx/firmware.md), since they are read on this
model and are the architecture's as far as anything here knows.

| | value | standing and source |
|---|---|---|
| application | 3.0, product string `Harmony Remote 0-3.0.0` | measured, section 76 |
| safe mode image | 2.0, product string `Harmony Safe Mode!` | measured, section 118 |
| newest firmware the forum table knows | 3.0, which agrees with the unit | third party, `reference/capabilities.md` |
| where it comes from | off a unit; there is no Logitech package of it here, and the manual has the owner update through the Harmony Remote Software | `reference/checksums.md`; Logitech's manual |

## The rail

**Never enter safe mode on a 525 as an experiment.** Holding Off while the batteries go in copies the safe
mode image over the application, and a power cycle does not undo it, measured on a unit, section 118. The
`recovering-a-remote` skill holds what leaving it consists of, and this project's write path does not
perform it.

## Not checked

* Any other firmware version for this model.
* Whether a skin 18 unit runs the same images.
