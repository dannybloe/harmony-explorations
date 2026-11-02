# Harmony Touch: memory

**No memory has been read off a Touch, and there is no address a host can name.** A host opens a path and
the remote decides what is behind it[^s198]. What is known is which paths open, from nineteen probed on one
remote[^s200][^s201].

## The paths that open

| path | stated size | what it is | evidence |
|---|---|---|---|
| `/sys/sysinfo` | 234 bytes | fourteen lines of a name and a value: architecture, skin, firmware version and type, hardware version, the USB link, `ram_size`, status, feature, a serial | [^s200], [^s201]. On the Harmony 300 and 350 the same path is generated on request rather than stored[^s199]; on the Touch **not checked**[^unchecked] |
| `/rf/deviceinfo` | 83 bytes | the word `Response`, a comma and a JSON object: a radio identity, a list of paired devices and their count. A query answered when opened, not storage | [^s201] |
| `/tde/enable` | 1 byte | not read | [^s200] |
| `/fw/otaupdate`, `/ir/ir_cap` | 0 bytes | not read | [^s200] |
| `/sys/hlapi` | 0 bytes | **the remote's request and answer file**: a request is written into it and the answer read back, which is how Logitech's client syncs the remote in both directions, [usb.md](usb.md). It opened at 0 bytes when probed outside a sync | [^s200], [^t-touch-sync], [^t-touch-both-ways] |
| `/sys/time` | 0 bytes | Logitech's client writes the time and a time zone into it during a sync down, and in both syncs down measured the remote refused the write; a hand over of the remote's changes wrote nothing to it; not read | [^s200], [^t-touch-sync], [^t-touch-both-ways] |
| `/sys/factoryreset`, `/sys/reboot` | 0 bytes | **controls**: opening one is the action, which is why neither may be opened, [usb.md](usb.md) | [^s200] |

**Two files on one remote are two formats**, lines of text and JSON, so a reader must not assume a shape,
and the field set of `/sys/sysinfo` differs from the list in the Harmony 300 and 350's firmware[^s200].

## The configuration is not a file

**`/cfg/usercfg` does not exist on a Touch**, nor do five other spellings, so the Harmony 300 and 350's
configuration path does not transfer[^s200]. That fits Logitech's own template, which carries the read of a
user configuration commented out "for testing only"[^s198b], and the provisioning route, by which the remote
fetches its configuration itself[^s203].

The Harmony 300 and 350's file table, read out of their firmware, is that family's and does not transfer
either: this is a later generation[^s199].

## Not checked

* What `/tde/enable` is, and what `/sys/time` answers when read[^unchecked].
* Where and in what form the remote keeps its configuration[^unchecked].
* The flash and RAM sizes[^unchecked].

[^s198]: Measured on a unit. [Section 198](../../../docs/findings.md#s198)
[^s200]: Measured on a unit. [Section 200](../../../docs/findings.md#s200)
[^s201]: Measured on a unit. [Section 201](../../../docs/findings.md#s201)
[^s199]: Read in the firmware. [Section 199](../../../docs/findings.md#s199)
[^t-touch-sync]: Measured on a unit. [The test](../../../packages/usb/test/touch-sync.test.ts)
[^t-touch-both-ways]: Measured on a unit. [The test](../../../packages/usb/test/touch-sync-both-ways.test.ts)
[^unchecked]: Not checked.
[^s198b]: Stated by Logitech, in their client. [Section 198](../../../docs/findings.md#s198)
[^s203]: Stated by Logitech, in their client. [Section 203](../../../docs/findings.md#s203)
