# Harmony 600: USB

How the 600 looks on the cable and what it answers. On the bus it is one of three look alikes: the Harmony
600, 650 and 700 share a USB product id and a command set, and what tells them apart is a number in the
release field of the USB descriptor and the model number in the version block. The command set, the
write rails and which paths are open on this architecture are
[the architecture's usb.md](../../architectures/harmony-600-650-700/usb.md); the protocol itself is
[the USB protocol reference](../../usb-protocol/README.md). This page states what is the 600's own.

## Identity on the bus

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | 0xC122 | `PROFILES` in `packages/corpus/src/read.ts` |
| first refused flash top byte | 0x20, so external flash ends at 0x200000 | `FLASH_TOP_BYTE_BOUND` in `packages/usb/src/protocol.ts` |
| escape sub commands dispatched | 0x01, 0x02, 0x03, 0x05 | `ESCAPE_SUB_COMMANDS` in `packages/usb/src/protocol.ts` |

Generated from `packages/corpus` and `packages/usb` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

| field | value | evidence |
|---|---|---|
| vendor and product id | `046D:C122`, the same as the Harmony 650 and 700 | [^t-usbdesc], [^s281] |
| `bcdDevice` | `0x1071`, BCD of 1000 plus the skin; predicted before it was read, and the rule's only measurement on this architecture, [transport](../../usb-protocol/transport.md#bcddevice-carries-the-skin-in-one-of-two-encodings) | [^s19] |
| product string | `Harmony Remote 0-0.2.0` | [^t-usbdesc] |
| report descriptor | 33 bytes, identical to the 700 image's | [^t-usbdesc] |
| firmware and hardware in the version block | 0.2 and 1.1 | [^s302] |
| flash id | `15:1C`, EON's 2 MiB part | [^s88], [^s110] |
| architecture, version block field 4 | 14 | [^s57] |
| skin, version block | 71 | [^s302] |
| identity block | at internal `0xFF` `+0xF400`, [memory.md](memory.md); its values are one remote's serial and never appear in this reference | [^s23] |

**Telling the 600 from the 650 and 700**: the product id, the architecture and the flash id cannot. The
`bcdDevice` and the skin in the version block can tell the model; what tells one remote from another is
the **identity block**[^s281].

**The skin it reports is the firmware's constant**: the 0.2 build's version reply states 71 at `0x11964`
and its descriptor `0x1071`, where the Harmony 650's 0.2 states 72 and `0x1072`[^s392]. A configuration
on the remote may state 73 and the remote still reports 71[^s387], [README.md](README.md).

## What the 600 answers

| command | what the 600 does | evidence |
|---|---|---|
| `GET_VERSION`, `READ_FLASH` of external flash and both internal pages | answers; both internal pages and the configuration region read whole | [^s23], [^s24], [^s88] |
| `READ_MISC` selector 7, live data memory | answers with live values: the state variables from `0xE10`, the clock among them ticking, and the panel's identity byte at `0x384`; the flash id at `0x686` | [^s387], [^s110] |
| `ERASE_FLASH` and `WRITE_FLASH` on configuration blocks | a block written back unchanged leaves the blocks either side untouched and the remote running; a whole configuration of eleven 64 KiB blocks reads back byte for byte | [^s302], [^s389] |
| the cache drop, `WRITE_MISC` selector `0x02`, and the restart | a write with both lands, and the remote runs it after the restart | [^s303] |
| the settings read, `0x13 0xB2` | answers with the settings store's records | [^s304] |
| the settings write, `0x14 0xB3` | appends a record to the settings store, and on the 0.2 build a successful write answers 1; measured on the 600 alone of the three models. No template of Logitech's clients carries `0xB3` and none exists for skin 71, so the firmware is the only source for this write | [^s305], [^s305b] |
| the battery voltage, `READ_MISC` selector `0x0C` | implemented in the 600's image; not asked of a 600 | [^s212] |
| the reinstall and the staging write | not tried on a 600 | [^unchecked] |
| `WRITE_MISC` selector `0x07`, a RAM write | refused on this architecture by this project's rails, [the architecture's usb.md](../../architectures/harmony-600-650-700/usb.md#write-standing) | |

The command table's handler addresses in [the command reference](../../usb-protocol/commands.md) are
given for the 600's 0.2 image and the Harmony 700's 2.8.

The state variables of a connected 600 were once read as not loaded, from five variables that read zero;
those are variables of another kind, and the configuration's own are live on the cable[^s387],
[the architecture's usb.md](../../architectures/harmony-600-650-700/usb.md#commands).

## Not checked

* Safe mode's USB identity on a 600[^unchecked].
* The battery voltage on a 600[^unchecked].
* The data memory, program memory and action queue members of the `0x1N` family, read in the 600's image
  and never sent[^s304b].

[^t-usbdesc]: Measured on a unit. [The test](../../../tests/test_usbdesc.py)
[^s281]: Measured on a unit. [Section 281](../../../docs/findings.md#s281)
[^s19]: Measured on a unit. [Section 19](../../../docs/findings.md#s19)
[^s302]: Measured on a unit. [Section 302](../../../docs/findings.md#s302)
[^s88]: Measured on a unit. [Section 88](../../../docs/findings.md#s88)
[^s110]: Measured on a unit. [Section 110](../../../docs/findings.md#s110)
[^s57]: Measured on a unit. [Section 57](../../../docs/findings.md#s57)
[^s23]: Measured on a unit. [Section 23](../../../docs/findings.md#s23)
[^s392]: Read in the firmware. [Section 392](../../../docs/findings.md#s392)
[^s387]: Measured on a unit. [Section 387](../../../docs/findings.md#s387)
[^s24]: Measured on a unit. [Section 24](../../../docs/findings.md#s24)
[^s389]: Measured on a unit. [Section 389](../../../docs/findings.md#s389)
[^s303]: Measured on a unit. [Section 303](../../../docs/findings.md#s303)
[^s304]: Measured on a unit. [Section 304](../../../docs/findings.md#s304)
[^s305]: Measured on a unit. [Section 305](../../../docs/findings.md#s305)
[^s305b]: Stated by Logitech, in their client. [Section 305](../../../docs/findings.md#s305)
[^s212]: Read in the firmware. [Section 212](../../../docs/findings.md#s212)
[^unchecked]: Not checked.
[^s304b]: Read in the firmware. [Section 304](../../../docs/findings.md#s304)
