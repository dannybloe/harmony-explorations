# Harmony Touch: USB

The Touch speaks the **file protocol**, not the command protocol of the Harmony One, 525, 600, 650 and 700.
The protocol is `docs/usb-protocol.md` section 6, from Logitech's own specification, and the read only
transport is `packages/usb/src/filepipe.ts`. The Harmony 300 and 350 speak the same family's protocol,
[their architecture's usb.md](../../architectures/harmony-300-350/usb.md), which is where the transport's
rails are argued.

## Identity on the bus

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | none | `PROFILES` in `packages/corpus/src/read.ts` |
| first refused flash top byte | none read | `FLASH_TOP_BYTE_BOUND` in `packages/usb/src/protocol.ts` |
| escape sub commands dispatched | none read | `ESCAPE_SUB_COMMANDS` in `packages/usb/src/protocol.ts` |

Generated from `packages/corpus` and `packages/usb` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

The block above is empty by construction: `PROFILES` lists the command protocol's remotes, and the Touch is
in `FILE_BASED_PRODUCTS` in `packages/usb/src/transport.ts` instead, as "Harmony Touch, and the Harmony
Ultimate".

| field | value | standing and source |
|---|---|---|
| vendor and product id | `046D:C12B`, which `FILE_BASED_PRODUCTS` also names for the Harmony Ultimate | measured, section 193; `packages/usb/src/transport.ts` |
| `bcdDevice` | `0x1099`, skin 99 | measured, section 195 |
| product string | `Logitech Harmony Remote`, no version | measured, section 193 |
| `/sys/sysinfo` | `arch 0x11`, 17; `skin 0x63`, 99; `fw_ver 4.15.330`; `fw_type 0x00`; `link_packet_length 64`; and a serial, among fourteen fields | measured, sections 200 and 201. The identifying values never appear here |

## The protocol, as far as it was used

* **A packet** is service `0xFF`, a command, a sequence number, a parameter count and the parameters.
  Open is `0x01`, read `0x04`, close `0x07`, a bare ping `0x00`, Logitech's client, section 198.
* **The two directions are framed differently.** A request's string is `0x80`, the characters and a NUL,
  as Logitech's own parameter encoder writes it; a reply's parameters are length prefixed, which is why
  the templates read an open's handle at position 5 and its size at 7. Two guesses at the request framing
  were refuted on hardware before the encoder was read, sections 198 and 200.
* **A reply's third byte is `0xFF` on an error**, and a refusal arrives as `ff 01 ff 01 01 0b`,
  measured, section 198.
* **A file's stated size is its only end**: the last data packet is padded, section 201.

## What this library does with a Touch

| | standing and source |
|---|---|
| **`openHarmony` refuses it**, by product id, and `make remotes` lists it separately | code, `packages/usb/src/transport.ts`, section 193 |
| **`openFileBasedRemote` opened it read only**: a bare ping, an open for reading, a read and a close, and only for the paths on `INERT_PATHS`. Two of those twelve answer on a Touch, `/sys/sysinfo` and `/rf/deviceinfo`; the rest are refused at open | code, `packages/usb/src/filepipe.ts`; measured, sections 200 and 201 |
| any other path needs `HARMONY_FILE_PATH_EXPERIMENT=1`, because **a path can be an action**: `/sys/factoryreset` and `/sys/reboot` open for reading | `CLAUDE.md`; measured, section 200 |
| **nothing is written**: no write, commit, device control, filesystem reset or HBus command is implemented, none has been sent, and no write list in `packages/usb/src/rails.ts` names this model | code; `CLAUDE.md` "Never write to a remote" |

**So there is nothing left to read on a Touch without the named door**, section 201. What the remote asks
for during a sync rides on the HBus command, `0x08`, which has never been sent here, section 203.

## Not checked

* The files `INERT_PATHS` permits and the Touch refuses, beyond their refusal.
* The HBus command and the provisioning session.
