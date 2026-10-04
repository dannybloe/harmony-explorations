# Harmony 650: USB

How the 650 looks on the cable and what it answers. The command set, the rails and the write lists
are the architecture's, [the architecture's usb.md](../../architectures/harmony-600-650-700/usb.md);
this page states what is the 650's own and what has been sent to this unit.

## Identity on the bus

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | 0xC122 | `PROFILES` in `packages/corpus/src/read.ts` |
| first refused flash top byte | 0x20, so external flash ends at 0x200000 | `FLASH_TOP_BYTE_BOUND` in `packages/usb/src/protocol.ts` |
| escape sub commands dispatched | 0x01, 0x02, 0x03, 0x05 | `ESCAPE_SUB_COMMANDS` in `packages/usb/src/protocol.ts` |

Generated from `packages/corpus` and `packages/usb` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

| field | value on the bench 650 | standing and source |
|---|---|---|
| vendor and product id | `046D:C122`, the same as the Harmony 600 and 700 | measured, section 281. `PROFILES` still labels it "Harmony 600 or 700" |
| `bcdDevice` | `0x1072` predicted, from the rule that it is BCD of 1000 plus the skin | **not checked** on this unit; the rule is measured on the 600 (`0x1071`), `docs/usb-protocol.md` section 1 |
| firmware | 0.2 | measured, version block |
| hardware | 1.2, where the 600 reports 1.1 | measured, version block, lab reads |
| flash id | `15:1C`, EON F16, 2 MiB | measured, section 281 |
| architecture | 14 | measured, version block field 4, section 57 |
| skin | 72 | measured, version block |
| software type | 0, running normally | measured, section 282 |
| identity block | two GUIDs at internal `0xFF` `+0xF400` | measured; **the values are the unit's serial and are kept in the lab's `units/h650.txt` only** |

**Telling the 650 from the 600 and 700**: product id, architecture, firmware and flash id cannot; the
skin can for a person, and the **identity block** is what the write rails compare, `assertUnitIsPermitted`,
section 281. Three arch 14 units are on the bench and all enumerate alike.

## What has been sent to this unit

| command | standing and source |
|---|---|
| `GET_VERSION`, `READ_FLASH` external and both internal pages | measured, read only, section 281 |
| `READ_MISC` selector 7, live data memory | measured: config derived variables read live on the 650, section 283 |
| `ERASE_FLASH` and `WRITE_FLASH`, configuration blocks | measured: first a block written back unchanged, section 281; then real changes, sections 283 onwards |
| the cache drop, `WRITE_MISC` selector `0x02` | sent and measured, section 282: verdict `0x68B` from `0x16` to `0x02`, flag `0x725` from 0 to 1 |
| the restart, the escape's `0x02` | sent and measured: off the bus in about 2 seconds, back in about 8, section 282 |
| the settings read, `0x13 0xB2` | the 650's code path is byte identical to the 600's, read in the firmware; the reply shape is measured on the 600 only, section 304. Sent to the 650: **not checked** |
| the settings write, `0x14 0xB3` | read on both 0.2 builds; **sent to the 600 only**, section 305. The rail admits the 650 |
| the reinstall, the staging write | **never sent** to this unit, [firmware.md](firmware.md) |
| `WRITE_MISC` selector `0x07`, a RAM write | **refused** on this architecture by the rails |

The command table's handler addresses in `docs/usb-protocol.md` are given for the 600's and 700's
images. The 600's lie in the part of the program that sits at the same address in the 650's 0.2 build,
section 281, so they very likely hold for the 650; that is this reference's inference, **not checked**
handler by handler.

## A tension worth knowing

`docs/usb-protocol.md`, under `READ_MISC`, says that on arch 14 the configuration is not loaded while
the remote is on the cable, from section 110 on the Harmony 600. Section 283 then read config derived
variables live on the 650. The two are not reconciled in any document here, and this page does not
reconcile them: **not checked** which holds, or whether both do under different conditions.

## Reads that misbehave

Flash reads during write runs occasionally drop out of sequence on this unit, "expected 0x45, got 0x0",
and a rerun succeeds, section 294 and `todo.md` L8. The cause is **not checked**.

## Not checked

* `bcdDevice` on this unit.
* The settings read and write on this unit.
* Safe mode's USB identity on the 650.
* What `WRITE_MISC` selector `0x0A`, which concordance's arch 14 path sends before and after an erase,
  does on this build; this project does not send it, section 282.
