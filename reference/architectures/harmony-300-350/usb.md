# Harmony 300 and 350: USB

The file based family does not speak the command protocol of the Harmony One and the Harmony 600, 650 and
700. Its protocol is `docs/usb-protocol.md` section 6, from Logitech's own specification, and this file
states what holds for both models and what this library does with them.

## Identity

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | none | `PROFILES` in `packages/corpus/src/read.ts` |
| first refused flash top byte | none read | `FLASH_TOP_BYTE_BOUND` in `packages/usb/src/protocol.ts` |
| escape sub commands dispatched | none read | `ESCAPE_SUB_COMMANDS` in `packages/usb/src/protocol.ts` |

Generated from `packages/corpus` and `packages/usb` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

The block above is empty by construction: `PROFILES` lists the architectures the command protocol reads,
and the file based family is listed instead in `FILE_BASED_PRODUCTS` in `packages/usb/src/transport.ts`,
with `0xC124` "Harmony 300, and measured here on a Harmony 350".

* **One product id for both models**, `046D:C124`, measured, sections 193 and 195.
* **`bcdDevice` is BCD of 1000 plus a skin**: `0x1104` on a 350, and `0x1078` on a 300 whose own
  `/sys/sysinfo` and configuration say skin 79, so on the 300 the descriptor names the family's base skin
  and not the unit's regional one, measured, sections 195 and 264. So the skin can be read from a listing
  without opening the device, with that caveat.
* `/sys/sysinfo` answers its architecture and skin, `arch 0x10 skin 0x68` on a 350 and skin `0x4F` on a
  300, measured, sections 262 and 264; its field names are read in the firmware, `SYSINFO_FIELDS`. The
  `guid` field and `/sys/guid` identify a unit and never leave the terminal.

## The protocol

* A packet is `FF`, a command, a sequence number, a count and parameters. Commands: ping, open, write,
  read, commit, device control, close, a bus command and a control family whose members reset the
  filesystem and reboot. Logitech's client and its specification, section 198 and `docs/usb-protocol.md`
  section 6.
* A request names a file by path; an open reply carries a handle and a big endian size, and a file's
  stated size is its only end, packets padding with NUL. Logitech's client, confirmed on a Harmony Touch,
  sections 200 and 201.

## What this library does with these models

| | standing and source |
|---|---|
| **`openHarmony` refuses them**: `isHarmony` excludes every id in `FILE_BASED_PRODUCTS`, and `make remotes` reports them separately | code, `packages/usb/src/transport.ts`, section 193 |
| **`openFileBasedRemote` reads them**, allowing a bare ping, an open for reading, a read and a close, and only for the paths on `INERT_PATHS`, which include `/cfg/usercfg` | code, `packages/usb/src/filepipe.ts`, section 200 |
| opening any other path needs `HARMONY_FILE_PATH_EXPERIMENT=1`, a door that exists because on this family **a path can be an action**: a Harmony Touch's `/sys/factoryreset` and `/sys/reboot` open for reading | `CLAUDE.md`, section 200 |
| **no write, commit, device control or filesystem reset is implemented**, none has ever been sent, and this architecture is on none of the write lists in `packages/usb/src/rails.ts` | code; `CLAUDE.md` "Never write to a remote" |
| configurations were read this way off both models, after concordance read the first 350's | measured, sections 194, 262 and 264 |

## Not checked

* The unread files, `/sys/battery` and `/cfg/log` among them, on these two models.
* The packet length these models use; it was 64 on a Harmony Touch only.
