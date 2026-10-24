# Harmony One: firmware

The One runs one firmware version that anybody here knows of, 3.4, and it can be started in a safe mode
that repairs the remote. The images themselves, where each lives, how Logitech's package loads and what safe
mode can do are the platform's, [the platform's firmware page](../../architectures/harmony-one/firmware.md),
since the One is the only model on it.

## Versions

**3.4** is the only version known for this model, and a remote's application is byte for byte the 3.4
package Logitech published[^s3][^s88]; the newest version the community table knows is the same, in
[the README's skin table](README.md#skins). The images and their versions are
[the platform's](../../architectures/harmony-one/firmware.md#the-images).

The USB descriptor names `Harmony Remote 0-3.4.0` for the application and `4-3.4.0` in safe mode, the
leading digit being the software type[^s190], [the version block reference](../../usb-protocol/version-block.md).
Whether Logitech's software update service serves this model is not checked[^unchecked].

## Safe mode and recovery

* **Entered by holding Off while the battery goes in**, announced in about five seconds[^s190]. What safe
  mode then does, and what the bootloader does before it, is
  [the platform's](../../architectures/harmony-one/firmware.md#safe-mode-the-bootloader-and-recovery).
* Safe mode does not stick: a plain power cycle boots normally again[^s190].

## Not checked

* Which keys produce the bootloader's two key codes[^unchecked].
* Any firmware update path for this model on Logitech's current services[^unchecked].

[^s3]: Read in the firmware. [Section 3](../../../docs/findings.md#s3)
[^s88]: Measured on a unit. [Section 88](../../../docs/findings.md#s88)
[^s190]: Measured on a unit. [Section 190](../../../docs/findings.md#s190)
[^unchecked]: Not checked.
