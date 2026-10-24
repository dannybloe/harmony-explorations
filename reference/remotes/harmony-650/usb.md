# Harmony 650: USB

How the 650 looks on the cable and what it answers. To a computer the 600, 650 and 700 look alike: one
product id, one command set, one set of rails. That shared part is
[the architecture's usb.md](../../architectures/harmony-600-650-700/usb.md); this page states what is the
650's own.

## Identity on the bus

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | 0xC122 | `PROFILES` in `packages/corpus/src/read.ts` |
| first refused flash top byte | 0x20, so external flash ends at 0x200000 | `FLASH_TOP_BYTE_BOUND` in `packages/usb/src/protocol.ts` |
| escape sub commands dispatched | 0x01, 0x02, 0x03, 0x05 | `ESCAPE_SUB_COMMANDS` in `packages/usb/src/protocol.ts` |

Generated from `packages/corpus` and `packages/usb` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

| field | on the 650 | evidence |
|---|---|---|
| vendor and product id | `046D:C122`, the same as the Harmony 600 and 700 | [^s281] |
| skin | 72, which the 0.2 build reports as a constant of its own in its version reply, where the 600's build has 71 | [^s281]; [^s392] |
| `bcdDevice` | `0x1072`, the 0.2 build's USB device descriptor release number, which fits the rule that it is BCD of 1000 plus the skin, [the transport](../../usb-protocol/transport.md#bcddevice-carries-the-skin-in-one-of-two-encodings). **Not measured** on the bus | [^s392]; [^unchecked] |
| firmware | 0.2, [firmware.md](firmware.md) | [^s281] |
| flash id, architecture, software type and identity block | the architecture's: flash id `15:1C`, architecture 14, software type 0 while running normally, and two GUIDs at internal `0xFF` `+0xF400`, [the architecture's usb.md](../../architectures/harmony-600-650-700/usb.md#identity) | [^s281], [^s282] |

**Telling the 650 from the 600 and 700**: the product id, the architecture, the firmware version and the
flash id cannot. The skin can, which is a model, and the identity block can, which is one
remote[^s281].

## What a 650 answers

Each of these has been sent to a 650 and its answer measured:

* **`READ_FLASH`** of the external flash and of both internal pages, read only[^s281].
* **Live data memory**, `READ_MISC` selector 7: the configuration's state variables read while the remote
  is on the cable, the verdict flags at `0x68B` and setting `0x80`'s copy at `0x744`[^s283][^s354].
* **The battery voltage**, `READ_MISC` selector `0x0C` detail 1, in millivolts, a little below what a
  meter shows on the cells since it is measured under load[^s340],
  [the architecture's usb.md](../../architectures/harmony-600-650-700/usb.md#commands).
* **`ERASE_FLASH` and `WRITE_FLASH`** of configuration blocks: a block written back unchanged, then real
  changes, the blocks either side byte identical before and after an erase[^s281][^s283].
* **The cache drop**, `WRITE_MISC` selector `0x02`: the verdict at `0x68B` went from `0x16` to `0x02` and
  the flag at `0x725` from 0 to 1[^s282].
* **The restart**, the escape's `0x02`: off the bus in about 2 seconds, back in about 8[^s282].

The settings read and write, `0x13 0xB2` and `0x14 0xB3`, follow a code path that is byte identical to
the 600's 0.2[^s304][^s305]; neither has been sent to a 650[^unchecked], and the reply shape is measured
on the 600[^s304b]. The firmware reinstall and the staging write have never been sent to a 650,
[firmware.md](firmware.md), and a data memory write, `WRITE_MISC` selector `0x07`, is refused on this
architecture, [the architecture's write standing](../../architectures/harmony-600-650-700/usb.md#write-standing).

**Handler addresses**: the command table in
[the command reference](../../usb-protocol/commands.md#the-command-table) gives them for the 600's 0.2
and the 700's 2.8. The 600's lie in the part of the program that sits at the same address in the 650's
0.2 build[^s281], so they very likely hold for the 650; that is this reference's inference and is not
checked handler by handler[^unchecked].

## Not checked

* `bcdDevice` on a 650 as the bus reports it; the build's value is read, above[^unchecked].
* The settings read and write on a 650[^unchecked].
* Safe mode's USB identity on the 650[^unchecked].
* `WRITE_MISC` selector `0x0A` on the 650's build. It is read on the architecture,
  [the command reference](../../usb-protocol/commands.md#write_misc-selector-0x0a-is-the-restart-command);
  concordance's path for this architecture sends it before and after an erase, and a write to a 650 works
  without it[^s282].

[^s281]: Measured on a unit. [Section 281](../../../docs/findings.md#s281)
[^s392]: Read in the firmware. [Section 392](../../../docs/findings.md#s392)
[^unchecked]: Not checked.
[^s282]: Measured on a unit. [Section 282](../../../docs/findings.md#s282)
[^s283]: Measured on a unit. [Section 283](../../../docs/findings.md#s283)
[^s354]: Measured on a unit. [Section 354](../../../docs/findings.md#s354)
[^s340]: Measured on a unit. [Section 340](../../../docs/findings.md#s340)
[^s304]: Read in the firmware. [Section 304](../../../docs/findings.md#s304)
[^s305]: Read in the firmware. [Section 305](../../../docs/findings.md#s305)
[^s304b]: Measured on a unit. [Section 304](../../../docs/findings.md#s304)
