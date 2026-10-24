# The Harmony USB protocol, from the firmware

**Status: derived from the firmware, and now read back off a remote.** The transport is complete and
quoted from the device's own descriptors. The command layer has its dispatch table, its length
nibble mapping, its state machine, and the request and response layout of every command. Live RAM
over USB works, event injection does not exist, and on arch 14 an action instruction can be queued
through command state `0x34`, section 326, read and never sent.

**Section 4 is the part a host measured**, on **both architectures**: the programmed Harmony 600 and
the spare Harmony One. Read only. `GET_VERSION`, `READ_MISC` and `READ_FLASH` have run, the flash read
is byte-identical to a dump made months earlier by other software on each unit, and six fields of the
version block were **predicted from the 600 and then confirmed on the One**, which differs in skin,
firmware, hardware version, flash part and architecture.

Three things the hardware corrected are marked in place rather than quietly fixed, and one thing it
did was not expected: a read of internal program memory whose final chunk is one byte **restarted a
remote**. Section 4 says what is known about that and `packages/usb` refuses that exact case.

This document is the deliverable of step 3 of `docs/plans/002-the-roadmap.md`, and it was written as each part was
established rather than at the end.

Scope: the Harmony One 3.4 image (architecture 12) and the Harmony 700 2.8 image
(architecture 14). The Harmony 600 0.2 dump was truncated by concordance at 65536 of 70336 bytes
while most of this document was written, so several things here were confirmed against the live
remote instead. **That image is complete now**, read off the remote by the command layer this
document describes and checked by its own header checksum, section 4.

Method, and why it matters here: everything is derived from the firmware images.
`concordance/specs/protocol.txt` and the libconcord source are consulted **after** a fact is
derived, as corroboration, never as the source. That is partly licensing (concordance is
GPLv3 and this repository is MIT, so its code is not read for structure or copied) and
partly that concordance has two documented defects on exactly these two architectures. See
`docs/concordance-notes.md`.

## Pages

* [Transport](transport.md)
* [Commands](commands.md)
* [The version block](version-block.md)
* [The bootloader](bootloader.md)
* [The file based protocol](file-protocol.md)

### Answered since this list was first written

Recorded rather than deleted, because three of the four were open questions this step was set up
to settle, and a list that only ever grows is not a status.

* **Which `MISC` items the firmware services**, and whether `MISC_RAM` works in normal mode: yes,
  four read selectors and nine write ones, and RAM is selector `0x07` and not upstream's `0x06`.
* **Whether `MISC_QUEUE_ACTION` and `MISC_QUEUE_EVENT` exist**: `0x03` is unhandled and `0x09` is a
  no-op that reports success, so there is no event injection. **An action can be queued all the same**,
  through command state `0x34`, section 326.
* **The response layout of each command**: the table above, from the state handlers rather than the
  parsers.
* **GET_VERSION's block is twelve fields**, by two independent counts. **Eleven of the twelve now
  have a reading**, from sections 57 and 59 of `docs/findings.md`: field 4 is the architecture, from
  a compiled in literal in four images, and fields 7, 10 and 11 are version bytes at program
  addresses the accessors state outright. Only **field 6** has no reading, and only **field 9's
  accessor** is located without explaining its value. **Field 6 has a reading now**, section 116, and
  it is unconfirmed rather than absent: it names a **platform** and not an architecture. `0x0C` on
  arch 12 and arch 14 alike across six images, `0x09` on arch 9, `0x08` on arch 8. What moved it was the
  population going from four images to eleven, which is what separates "equals the architecture,
  except once" from "equals the platform, always". **A third leg fell away**, section 118: a live 525
  in safe mode reports field 6 as `0x00`, so a recovery role image answers zero and the reading holds
  for an application image only. The `bcdDevice` high byte has the same shape and different values, so the two
  are not one variable.

## Corroboration used, after the fact

* `USB_PACKET_LENGTH 64` in libconcord's hidapi backend agrees with the 64 byte reports.
* libconcord matches Harmony remotes by vendor `0x046D` and a product id **range**,
  `0xC110` to `0xC14F`, rather than by exact id, so it cannot corroborate or contradict the
  600 and 700 sharing `0xC122`. Our own descriptor read is the better evidence.
