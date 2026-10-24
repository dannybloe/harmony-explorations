# Harmony 600: USB

How the 600 looks on the cable and what it answers. The command set, the rails and the write lists are
the architecture's, [the architecture's usb.md](../../architectures/harmony-600-650-700/usb.md); this page
states what is the 600's own and what has been sent to a 600.

## Identity on the bus

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | 0xC122 | `PROFILES` in `packages/corpus/src/read.ts` |
| first refused flash top byte | 0x20, so external flash ends at 0x200000 | `FLASH_TOP_BYTE_BOUND` in `packages/usb/src/protocol.ts` |
| escape sub commands dispatched | 0x01, 0x02, 0x03, 0x05 | `ESCAPE_SUB_COMMANDS` in `packages/usb/src/protocol.ts` |

Generated from `packages/corpus` and `packages/usb` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

| field | value | standing and source |
|---|---|---|
| vendor and product id | `046D:C122`, the same as the Harmony 650 and 700 | measured, `reference/usb-protocol/README.md` section 1 |
| `bcdDevice` | `0x1071`, BCD of 1000 plus the skin | measured, predicted before the read, section 19 and `reference/usb-protocol/README.md` section 1. The rule's only measurement on this architecture |
| product string | `Harmony Remote 0-0.2.0` | measured, `reference/usb-protocol/README.md` section 1 |
| report descriptor | 33 bytes, identical to the 700 image's | measured, `reference/usb-protocol/README.md` section 1 |
| firmware | 0.2 | measured, version block |
| hardware | 1.1 | measured, version block, section 302 |
| flash id | `15:1C`, EON F16, 2 MiB | measured, version block and section 110 |
| architecture | 14 | measured, version block field 4, section 57 |
| skin | 71 | measured, version block and `bcdDevice` |
| identity block | at internal `0xFF` `+0xF400` | measured; its values are one unit's serial and are never written here |

**Telling the 600 from the 650 and 700**: product id, architecture and flash id cannot. `bcdDevice` and
the skin in the version block can for a person, and the **identity block** is what the write rails
compare, section 281.

**The skin it reports is the firmware's constant**: the 0.2 build's version reply states 71 at `0x11964`
and its descriptor `0x1071`, where the Harmony 650's 0.2 states 72 and `0x1072`, read in the firmware,
section 392. A configuration on the remote may state 73 and the remote still reports 71, measured, section
387; a configuration of this project's states what the version block reports, decision 23.

## What has been sent to a 600

| command | standing and source |
|---|---|
| `GET_VERSION`, `READ_FLASH` external and both internal pages | measured, read only, sections 23, 24 and 88 |
| `READ_MISC` selector 7, live data memory | measured on a connected unit: the state variables from `0xE10`, the clock among them ticking, and the panel's identity byte at `0x384`, section 387; the flash id at `0x686`, section 110. This row said "the configuration's journal variables read zero, so it was not loaded"<!--superseded-->; section 387 found those five variables to be of another kind |
| `ERASE_FLASH` and `WRITE_FLASH`, configuration blocks | measured: a block written back unchanged, section 302; then a delay changed and put back with the whole write sequence, section 303; then configurations built by this project, up to eleven 64 KiB blocks at a time, each read back byte for byte, sections 387, 389 and 390 |
| the cache drop, `WRITE_MISC` selector `0x02`, and the restart | sent as part of that write sequence, section 303 |
| the settings read, `0x13 0xB2` | read in the 600's 0.2 image and its reply measured, section 304; used again before predicting a configuration's timing, sections 387 and 391 |
| the settings write, `0x14 0xB3` | **sent to a 600**, the only arch 14 unit to receive it: a saved delay cleared, and on the 0.2 build a successful write answers 1, section 305. Logitech's clients carry no template for skin 71 and none carries `0xB3`, so the firmware is the only source for this write, Logitech's client, section 305 |
| the battery voltage, `READ_MISC` selector `0x0C` | implemented in the 600's image, section 212; **never sent to a 600** |
| the reinstall, the staging write | **never sent** to a 600 |
| `WRITE_MISC` selector `0x07`, a RAM write | **refused** on this architecture by the rails |

The command table's handler addresses in `reference/usb-protocol/README.md` are given for the 600's 0.2 image and the
Harmony 700's 2.8.

## A tension, now resolved

Section 110 measured five variables of a journal reading zero on a connected 600, and was read as the 600
not loading its configuration on the cable; section 283 read configuration derived variables live on a
Harmony 650. **On a 600 itself the configuration's variables are live on the cable**: section 303 read its
delays there, and section 387 read its clock ticking between two reads and a variable at the value its
configuration starts it at, both from `0xE10` on build 0.2. Section 387 reconciles the two: section 110's
five are variables of another kind and do not say otherwise. This page said that "a connected 600 has not
loaded its configuration"<!--superseded--> and that the two readings "are not reconciled anywhere
here"<!--superseded--> until section 387.

## Not checked

* Safe mode's USB identity on a 600.
* The battery voltage on a 600.
* The data memory, program memory and action queue members of the `0x1N` family, read in the 600's image
  and never sent, section 304.
