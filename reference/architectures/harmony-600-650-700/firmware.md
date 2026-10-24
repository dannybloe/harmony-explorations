# Harmony 600, 650 and 700: firmware

The firmware is **one program in several builds**: the same routines, mostly at the same addresses
within a build family, with the builds differing by model and version. So nothing read on one build
transfers to another by address without checking, section 281. **The 600's and 650's 0.2 builds are one program**:
every differing byte is code that moved, a reference to it, the header checksum, two routines nothing
calls, or the model number and USB release number each build reports, 71 and `0x1071` on the 600 and 72
and `0x1072` on the 650, section 392. Each model folder lists its own
versions; this file states what is common.

## Builds in the lab

| build | model | where it came from | standing and source |
|---|---|---|---|
| 0.2, application 70336 bytes, entry `0x1A26E` | Harmony 600 | read off the bench unit | measured; `600-0.2-code-base0x9000-COMPLETE.bin`, checksum in `docs/checksums.md` |
| 0.2, application 70336 bytes, entry `0x1A262` | Harmony 650 | read off the bench unit | measured, section 281 |
| 0.4, application 75392 bytes, entry `0x1B658` | Harmony 650 | Logitech's package, repair site | read in the firmware, section 30 |
| 2.5, 71552 bytes | Harmony 700 | the bench unit's staging read | measured, sections 295 and 298 |
| 2.8, application 76672 bytes, entry `0x1BB38` | Harmony 700 | Logitech's package; what the bench 700 runs since section 297 | read in the firmware and measured |

Every image loads at `0x9000`, its header is `0x00` to `0x0F` and its own checksum verifies,
`docs/checksums.md` and sections 1 to 5. **Logitech's software update service answers 404 for
skins 66, 71 and 72**, section 295, so the packages above are all there is.

## Routines read and where

Read on each build named, sections cited. Where a build is missing it is not read.

| routine | builds read | section |
|---|---|---|
| flash address classifier, ceiling `0x200000` | 600 0.2, 650 0.2, 650 0.4, 700 2.8 | 192, 281 |
| external flash eraser, SPI `0xD8`, 64 KiB | the same four | 281 |
| cache drop, `WRITE_MISC` selector `0x02` | 600 and 650 0.2, 650 0.4, 700 2.8 | 282, 283, 299 |
| restart, the escape's `0x02` | 600 and 650 0.2, 700 2.5 and 2.8 | 97, 282, 298 |
| settings store read and write, `0x13 0xB2` and `0x14 0xB3` | 600 and 650 0.2; 700 2.8 reaches its own append, unread | 304, 305 |
| clock routines | 600 and 650 0.2 | 310 |
| state variable seeder | 0.2, 0.4 | 283, 284 |
| update status byte, `WRITE_MISC` selector 6 | 700 2.5 and 2.8; the 2.3 safe mode image | 295, 297, 298 |
| state variable storage sized from `narrow + 2 * wide`, everything above painted `0xFE` at boot | 700 reference image, 600 0.2; the bound check also on 650 0.2 | 276 |
| state transition walker: every transition tested in record order and every match fired, `-2` on any write and `-3` on a change; a fired instruction runs next; the action queue holds 40 | 600 and 650 0.2, one routine; located on 650 0.4 and 700 2.8 | 332 |
| configuration validator: `GSPM` at 0, `LWJL` at `0x5B`, `PTYY` at `end_addr`, and the trailer checksum only while setting `0x80`'s bit 0 is set | 600 and 650 0.2; 700 2.8, gated on `0x3A9` | 354 |
| status screen routine and the five codes it is asked for | 600 and 650 0.2 | 355 |
| which infrared group a send plays, the toggle alternation | 650 0.2; the same update found on 600 0.2, 650 0.4 and 700 2.8 | 365 |
| pixel path, flash to panel in stored order | 600 and 650 0.2, 700 2.8; its shape found on 650 0.4 | 367, 387 |
| text draw: the font select keeps the set's address, a glyph found by its pointer | 650 0.2, 700 2.8 | 368 |
| queued screen program: base slot 11 entry `operand & 0xff` | 600 and 650 0.2, 650 0.4, 700 2.8 | 369 |
| picture and page list placement: nothing found reads a position | 600 and 650 0.2, 650 0.4, 700 2.8 | 328 |
| parameter group 3, a light's levels | 600 0.2, 700 2.8 | 392 |

## Safe mode

* The safe mode **image** is in internal flash at `0xFE` `+0x1000`; the safe mode **configuration** is in
  external flash at `0x020000`. On the Harmony One the arrangement is different, `docs/memory-map.md`.
* **The `-safe.bin` trap**: on this architecture the `*-safe.bin` file concordance's `--dump-safemode`
  writes holds the **application** truncated at 64 KiB, not a safe mode image; the lab keeps the 600's
  as `600-0.2-code-base0x9000-TRUNCATED64k.bin`, `docs/checksums.md` and `CLAUDE.md`.
* Safe mode reports software type 4 over USB, the application 0, `reference/usb-protocol/version-block.md`.
* The status screens a rejected configuration raises are the architecture's 35, section 244, and a failed
  validation re-arms rather than latching, unlike the Harmony One, section 253.
* **The status screens live in the safe mode configuration** at external `0x020000`, linked for that
  address, section 353. One bit, data memory `0x68B` bit 4 on the 0.2 builds, chooses whether a read goes
  there or to the configuration at `0x030000`, and the status screen routine reads them from there with
  the configuration's verdict clear; **the thirty status screens a user configuration carries are not
  drawn**, as far as the 0.2 code reads, section 355.
* **What a configuration must pass is its three markers.** The checksum is checked only while setting
  `0x80`'s bit 0 is set, which it is not on the Harmony 600 and 650 read, so "Configuration Corrupted"
  can come from the configuration there only with that bit set, section 354. The Harmony 650 ran a
  configuration that was the status screen library, moved, on those markers alone.

## Installing firmware

Nothing here writes the processor's flash. Two routes exist and both make the **remote** install:

1. **Reinstall what is staged**: set the update status byte to 2 and restart, and safe mode copies the
   application staged at external `0x000000`. Read on the 700's 2.3 safe mode image and run on the 700,
   section 295; the 600's and 650's 0.2 safe mode images carry part of the routine, at `0x01A8C`, and are
   otherwise unread.
2. **Stage an image first**: Logitech's own unmodified image written into external `0x000000` to
   `0x020000`, decision 18; run on the 700, taking it from 2.5 to 2.8, section 297.

The rails, the named doors and the unit list are `CLAUDE.md`'s "Never write to a remote" and
[usb.md](usb.md). The `recovering-a-remote` skill holds the route.

## Not checked

* The Harmony 700's 2.8 build compared with the 0.2 builds routine by routine. Why the 600's and 650's 0.2
  builds differ is read: one program, its code moved and its model number its own, section 392. This
  listed "Why builds of the same version differ between the 600 and 650"<!--superseded--> as not checked
  until then.
* The 600's and 650's safe mode handling of the status byte, end to end.
* Safe mode entry by keys on any unit of this architecture: the bootloader compares two scan codes,
  `0x14` and `0x2C`, section 87, which is a reading and has not been tried.
* The 0.4 package's validator and clock routines.

## 2. The USB stack inside the firmware

Addresses in this section are the Harmony 700 2.8 image unless stated otherwise.

### Attach

```
16e08: MOVLW 0x14      16e2c: MOVLW 0x1a      16e30: MOVLW 0x1c
16e0a: MOVWF UCFG      16e2e: MOVWF UEP1      16e32: MOVWF UEP2
```

* `UCFG = 0x14`: `UPUEN` set, so the internal pull-ups are used and no external resistor is
  involved; `FSEN` set, so full speed; `UTRDIS` clear, so the on-chip transceiver;
  **`PPB = 00`, so ping-pong buffering is off**, which fixes the buffer descriptor table
  layout at four bytes per endpoint direction from `0x400`.
* `UEP1 = 0x1A`: `EPHSHK`, `EPCONDIS`, `EPINEN`. Handshaking on, control transfers refused,
  **IN only**.
* `UEP2 = 0x1C`: `EPHSHK`, `EPCONDIS`, `EPOUTEN`. **OUT only.**

Both agree with the endpoint descriptors, and the agreement is three-way: the buffer
descriptor for endpoint 1 OUT at `0x408` is **never touched anywhere in the image**, which is
what `UEP1` with `EPOUTEN` clear implies and what an endpoint descriptor set with no EP1 OUT
requires.

`UCON` bit 3, `USBEN`, is set at `0x17294`, which is the attach.

### The report buffers

```
16e36: MOVLW 0x40   -> BD2OUT_CNT  0x411   64 byte capacity
16e3a: MOVLW 0x28   -> BD2OUT_ADRL 0x412
16e3e: MOVLW 0x04   -> BD2OUT_ADRH 0x413   buffer at 0x0428
16e42: MOVLW 0x88   -> BD2OUT_STAT 0x410   UOWN set, hardware may fill it now
16e48: MOVLW 0x68   -> BD1IN_ADRL  0x40E
16e4c: MOVLW 0x04   -> BD1IN_ADRH  0x40F   buffer at 0x0468
16e50: MOVLW 0x40   -> BD1IN_STAT  0x40C   UOWN clear, firmware keeps it
```

**Every command the host sends lands at data address `0x0428`, and every response is built at
`0x0468`.** The two buffers are adjacent and 64 bytes each. The ownership bits are the right
way round: the OUT descriptor is handed to the serial interface engine immediately, the IN
descriptor is held by the firmware until it has something to send.

### From buffer to handler

The buffers are only ever reached through FSR, so `pic18_trace.py` cannot see them; the path
was found through the accessors instead, using `pic18_xref.py` to walk callers.

| Address | What it is |
|---|---|
| `0x17332` | returns `0x0428`, the OUT buffer address |
| `0x17344` | returns `0x0468`, the IN buffer address |
| `0x1737A` | returns `BD2OUT_CNT`, so how many bytes arrived |
| `0x1736A` | rewinds the OUT cursor and clears its count |
| `0x17380` | rewinds the IN cursor and clears its count |
| `0x172C6` | reads the next byte from the current packet |
| `0x172DA` | appends a byte to the response and increments `BD1IN_CNT` |
| `0x0BAFC` | copies a received packet out of the OUT buffer |
| `0x0BD0A` | **the command entry point**, called from `0x1715E` and `0x171E8` |

The interrupt service routine is `0x1AD80` to `0x1AF00`: eight reads of `UIR` between
`0x1ADE0` and `0x1AE4E`, each followed by a bit test, dispatching on the interrupt source.
