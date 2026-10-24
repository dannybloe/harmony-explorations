# Harmony 600, 650 and 700: firmware

The firmware is the program the remote runs; a configuration is the data it reads. On these three models
the program is **one program in several builds**: the same routines, mostly at the same addresses within
a build family, with the builds differing by model and version. So nothing read on one build transfers
to another by address without checking[^s281b]. **The 600's and 650's 0.2 builds are one program**: every
differing byte is code that moved, a reference to it, the header checksum, two routines nothing calls, or
the model number and USB release number each build reports, 71 and `0x1071` on the 600 and 72 and
`0x1072` on the 650[^s392]. Each model folder lists its own versions; this file states what is common.

## Builds

| build | model | where it came from | evidence |
|---|---|---|---|
| 0.2, application 70336 bytes, entry `0x1A26E` | Harmony 600 | read off a remote, its own header checksum verifying over all of it | [^s23] |
| 0.2, application 70336 bytes, entry `0x1A262` | Harmony 650 | read off a remote | [^s281] |
| 0.4, application 75392 bytes, entry `0x1B658` | Harmony 650 | Logitech's package, from a repair site | [^s30] |
| 2.5, 71552 bytes | Harmony 700 | read out of a remote's staging region | [^s295], [^s298] |
| 2.8, application 76672 bytes, entry `0x1BB38` | Harmony 700 | Logitech's package, installed on a remote by staging it | [^s297] |

Every image loads at `0x9000`, its header is `0x00` to `0x0F` so its code starts at `0x9010`, and its own
checksum verifies[^s5][^s10][^s4]. On the Harmony 600 the 0.2 entry point lies past the first 64 KiB, so
only the complete 70336 byte image holds it, and a copy cut at 64 KiB loses it[^s5]. **Logitech's software
update service answers 404 for skins 66, 71 and 72**[^s295c], so the packages above are all there is.

## Routines read and where

Read on each build named. Where a build is missing it is not read.

| routine | builds read | evidence |
|---|---|---|
| flash address classifier, ceiling `0x200000` | 600 0.2, 650 0.2, 650 0.4, 700 2.8 | [^s192], [^s281c] |
| external flash eraser, SPI `0xD8`, 64 KiB | the same four | [^s281c] |
| cache drop, `WRITE_MISC` selector `0x02` | 600 and 650 0.2, 650 0.4, 700 2.8 | [^s282], [^s283], [^s299] |
| restart, the escape's `0x02` | 600 and 650 0.2, 700 2.5 and 2.8 | [^s97], [^s282], [^s298b] |
| settings store read and write, `0x13 0xB2` and `0x14 0xB3` | 600 and 650 0.2; 700 2.8 reaches its own append, unread | [^s304], [^s305] |
| clock routines | 600 and 650 0.2 | [^s310] |
| state variable seeder | 0.2, 0.4 | [^s283], [^s284] |
| update status byte, `WRITE_MISC` selector 6 | 700 2.5 and 2.8; the 2.3 safe mode image | [^s295b], [^s297b], [^s298b] |
| state variable storage sized from `narrow + 2 * wide`, everything above painted `0xFE` at boot | 700 2.8, 600 0.2; the bound check also on 650 0.2 | [^s276] |
| state transition walker: every transition tested in record order and every match fired, `-2` on any write and `-3` on a change; a fired instruction runs next; the action queue holds 40 | 600 and 650 0.2, one routine; located on 650 0.4 and 700 2.8 | [^s332] |
| configuration validator: `GSPM` at 0, `LWJL` at `0x5B`, `PTYY` at `end_addr`, and the trailer checksum only while setting `0x80`'s bit 0 is set | 600 and 650 0.2; 700 2.8, gated on `0x3A9` | [^s354] |
| status screen routine and the five codes it is asked for | 600 and 650 0.2 | [^s355] |
| which infrared group a send plays, the toggle alternation | 650 0.2; the same update found on 600 0.2, 650 0.4 and 700 2.8 | [^s365] |
| pixel path, flash to panel in stored order | 600 and 650 0.2, 700 2.8; its shape found on 650 0.4 | [^s367], [^s387] |
| text draw: the font select keeps the set's address, a glyph found by its pointer | 650 0.2, 700 2.8 | [^s368] |
| queued screen program: base slot 11 entry `operand & 0xff` | 600 and 650 0.2, 650 0.4, 700 2.8 | [^s369] |
| picture and page list placement: nothing found reads a position | 600 and 650 0.2, 650 0.4, 700 2.8 | [^s328] |
| parameter group 3, a light's levels | 600 0.2, 700 2.8 | [^s392] |
| every configuration byte read: one SPI read primitive at `0x1B9AC`, with its output twin at `0x1B984`, reached through two accessors, so the configuration is read a few bytes at a time and is never mapped | 700 2.8 | [^s13] |
| a reset key combination: before the keypad scan three key intersections are probed, and one executes the processor's `RESET` while its key is held, at `0x19120`, independent of any configuration; the other two gate whether that check runs | 700 2.8 | [^s13] |
| a cycle exact delay, a computed jump into a run of `NOP`s, at `0x10D00`, the infrared carrier's timing and the most called primitive | 700 2.8; at the same address on 600 0.2 | [^s13] |
| the infrared receive timebase, `TMR0` started and stopped around a learned edge, `0x19486` | 700 2.8 | [^s13] |
| port initialisation, every port's direction and level set in one block near the entry, `0x1B8CE` | 700 2.8 | [^s13] |

## The state variable seeder

At start the firmware writes each state variable's starting value, the `first` its record in the
configuration states, [state](../../config-format/state.md#a-variables-record), unless a checksum says the
variables already in memory are good, so a restart that keeps data memory keeps the running values. On the
600's and 650's 0.2 builds the seeder is at `0x16024`, called from the boot path at `0x14F9C` and from
`0x0F390`[^s283]:

* **It runs only when a container validated**, the user container or the one at external `0x020000`[^s283].
* **The checksum** is an XOR seeded `0xA5` over the variable array from its nineteenth byte, so the clock
  and the firmware's own variables are outside it: 174 bytes from data `0xE22` on the 0.2 builds, 237 bytes
  from `0x912` on the Harmony 700's 2.8 and the Harmony 650's 0.4. A matching sum makes the loop store
  nothing, and every store restamps the sum; where it sits is [memory.md](memory.md)[^s283].
* **Then a paint**: `0xFE` over everything above the table's size, the fill
  [state](../../config-format/state.md#what-the-four-header-words-do) describes[^s283].
* **A user container that fails validation does not reload.** That path ends in the paint from byte 18,
  so the configuration's variables are erased rather than reloaded[^s283].
* **The 700 2.8 and the 650's 0.4 force a reload after a cache drop.** The drop sets a flag, `0x1E9` on the
  700 and `0x0E9` on the 0.4, which the next boot clears while spoiling the sum, at `0x1EC` and `0x0EC`, so
  the seeder reloads every variable. The 0.2 builds have no such flag[^s283][^s299].

How the seeder differs on the Harmony One and the Harmony 525 is [state](../../config-format/state.md#a-variables-record).

## Safe mode

Safe mode is a second, smaller program the remote falls back on when its application or configuration
cannot be used.

* The safe mode **image** is in internal flash at `0xFE` `+0x1000`; the safe mode **configuration** is in
  external flash at `0x020000`, [memory.md](memory.md). On the Harmony One the arrangement is different,
  [its memory page](../harmony-one/memory.md).
* **The `-safe.bin` trap**: on this architecture the `*-safe.bin` file concordance writes when asked for
  the safe mode image holds the **application** truncated at 64 KiB, not a safe mode image: on a Harmony
  600 it is the first 65536 bytes of the 70336 byte application[^s23].
* Safe mode reports software type 4 over USB, the application 0,
  [the version block](../../usb-protocol/version-block.md)[^s87].
* The status screens a rejected configuration raises are the architecture's 35[^s244], and a failed
  validation re-arms rather than latching, unlike the Harmony One[^s253].
* **The status screens live in the safe mode configuration** at external `0x020000`, linked for that
  address[^s353]. One bit, data memory `0x68B` bit 4 on the 0.2 builds, chooses whether a read goes there
  or to the configuration at `0x030000`, and the status screen routine reads them from there with the
  configuration's verdict clear; **the thirty status screens a user configuration carries are not
  drawn**, as far as the 0.2 code reads[^s355].
* **What a configuration must pass is its three markers.** The checksum is checked only while setting
  `0x80`'s bit 0 is set, which it is not on the Harmony 600 and 650 read, so "Configuration Corrupted"
  can come from the configuration there only with that bit set[^s354]. A Harmony 650 ran a configuration
  that was the status screen library, moved, on those markers alone[^s354b].

## Installing firmware

Nothing here writes the processor's flash. Two routes exist and both make the **remote** install:

1. **Reinstall what is staged**: set the update status byte to 2 and restart, and safe mode copies the
   application staged at external `0x000000`. Read on the 700's 2.3 safe mode image and run on a
   700[^s295b][^s295]; the 600's and 650's 0.2 safe mode images carry part of the routine, at `0x01A8C`,
   and are otherwise unread[^s295b].
2. **Stage an image first**: Logitech's own unmodified image written into external `0x000000` to
   `0x020000`[^d18]; run on a 700, taking it from 2.5 to 2.8[^s297].

**An install copies at most up to internal `0x1EC00`**, where the settings store begins: the install
routine ends any copy there, so an application image can be at most 89088 bytes, `0x1EC00` less the
`0x9000` it loads at[^s295b]. The Harmony 700's 2.8, at 76672 bytes and ending at `0xFF` `+0xBB80`, is
well inside it[^s297].

The rails and the named doors are in [usb.md](usb.md) and `packages/usb/src/rails.ts`.

## Not checked

* The Harmony 700's 2.8 build compared with the 0.2 builds routine by routine[^unchecked]. Why the 600's
  and 650's 0.2 builds differ is read: one program, its code moved and its model number its own[^s392].
  This listed "Why builds of the same version differ between the 600 and 650"<!--superseded--> as not
  checked until then.
* The 600's and 650's safe mode handling of the status byte, end to end[^unchecked].
* Safe mode entry by keys on any remote of this architecture: the bootloader compares two key codes,
  `0x14` and `0x2C`[^s87], which is a reading and has not been tried[^unchecked].
* The 0.4 package's validator and clock routines[^unchecked].

## The USB stack inside the firmware

Addresses in this section are the Harmony 700 2.8 image unless stated otherwise, read in its
firmware[^s19].

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
requires[^s19].

`UCON` bit 3, `USBEN`, is set at `0x17294`, which is the attach[^s19].

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
descriptor is held by the firmware until it has something to send[^s19].

### From buffer to handler

The buffers are only ever reached through FSR, so `pic18_trace.py` cannot see them; the path
was found through the accessors instead, using `pic18_xref.py` to walk callers[^s19].

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
`0x1ADE0` and `0x1AE4E`, each followed by a bit test, dispatching on the interrupt source[^s19].

### The command handlers

What each command of [the command table](../../usb-protocol/commands.md#the-command-table) runs, on the two
builds read for it. A handler sets the state variable and parses its arguments; the executor the main loop
reaches for that state does the work[^s19][^t-usb-firmware].

| command | name | state | handler, 700 2.8 | handler, 600 0.2 | executor, 700 2.8 |
|---|---|---|---|---|---|
| `0x10` | GET_VERSION | 1 | `0x0BDFE` | `0x0BD68` | `0x0C906` |
| `0x30` | WRITE_FLASH | 2 | `0x0C21A` | `0x0C184` | `0x0D30C`, through the test before the chain |
| `0x50` | READ_FLASH | 4 | `0x0C266` | `0x0C1D0` | `0x0C982` starts a chunk, `0x0D3A8` finishes one |
| `0x70` | START_IRCAP | 5 | `0x0C2B2` | `0x0C21C` | `0x0CB1E`, a branch to the shared transmitter at `0x0D2E0` |
| `0xD0` | ERASE_FLASH | 8 | `0x0C2D6` | `0x0C240` | `0x0CB4A` |
| `0xA0` | WRITE_MISC | 9 | `0x0C364` | `0x0C2CE` | `0x0CB6E` |
| `0xB0` | READ_MISC | 10 | `0x0C4CE` | `0x0C432` | `0x0CB92` |
| `0x05` | the escape's internal continuation | 13 | `0x0C500` | `0x0C464` | `0x0CC46` |

Two states have an executor and no command: 3, a write transfer that has finished, at `0x0C95C`, and 6 and 7,
learning stopped, at `0x0CB20`[^s19][^s175].

**The state variable** is at `0xEC9` on the 700 2.8 and `0x1C1` on the 600 0.2. While a flash write is in
progress, state 2, the dispatch goes to a two entry chain accepting `0x40` and `0xF0`, at `0x0C55C` on the 700
and `0x0C4C0` on the 600[^s19][^t-usb-firmware].

[^s281b]: Read in the firmware. [Section 281](../../../docs/findings.md#s281)
[^s392]: Read in the firmware. [Section 392](../../../docs/findings.md#s392)
[^s23]: Measured on a unit. [Section 23](../../../docs/findings.md#s23)
[^s281]: Measured on a unit. [Section 281](../../../docs/findings.md#s281)
[^s30]: Read in the firmware. [Section 30](../../../docs/findings.md#s30)
[^s295]: Measured on a unit. [Section 295](../../../docs/findings.md#s295)
[^s298]: Measured on a unit. [Section 298](../../../docs/findings.md#s298)
[^s297]: Measured on a unit. [Section 297](../../../docs/findings.md#s297)
[^s5]: Read in the firmware. [Section 5](../../../docs/findings.md#s5)
[^s10]: Read in the firmware. [Section 10](../../../docs/findings.md#s10)
[^s4]: Read in the firmware. [Section 4](../../../docs/findings.md#s4)
[^s295c]: Stated by Logitech, by their service. [Section 295](../../../docs/findings.md#s295)
[^s192]: Read in the firmware. [Section 192](../../../docs/findings.md#s192)
[^s281c]: Read in the firmware. [Section 281](../../../docs/findings.md#s281)
[^s282]: Read in the firmware. [Section 282](../../../docs/findings.md#s282)
[^s283]: Read in the firmware. [Section 283](../../../docs/findings.md#s283)
[^s299]: Read in the firmware. [Section 299](../../../docs/findings.md#s299)
[^s97]: Read in the firmware. [Section 97](../../../docs/findings.md#s97)
[^s298b]: Read in the firmware. [Section 298](../../../docs/findings.md#s298)
[^s304]: Read in the firmware. [Section 304](../../../docs/findings.md#s304)
[^s305]: Read in the firmware. [Section 305](../../../docs/findings.md#s305)
[^s310]: Read in the firmware. [Section 310](../../../docs/findings.md#s310)
[^s284]: Read in the firmware. [Section 284](../../../docs/findings.md#s284)
[^s295b]: Read in the firmware. [Section 295](../../../docs/findings.md#s295)
[^s297b]: Read in the firmware. [Section 297](../../../docs/findings.md#s297)
[^s276]: Read in the firmware. [Section 276](../../../docs/findings.md#s276)
[^s332]: Read in the firmware. [Section 332](../../../docs/findings.md#s332)
[^s354]: Read in the firmware. [Section 354](../../../docs/findings.md#s354)
[^s355]: Read in the firmware. [Section 355](../../../docs/findings.md#s355)
[^s365]: Read in the firmware. [Section 365](../../../docs/findings.md#s365)
[^s367]: Read in the firmware. [Section 367](../../../docs/findings.md#s367)
[^s387]: Read in the firmware. [Section 387](../../../docs/findings.md#s387)
[^s368]: Read in the firmware. [Section 368](../../../docs/findings.md#s368)
[^s369]: Read in the firmware. [Section 369](../../../docs/findings.md#s369)
[^s328]: Read in the firmware. [Section 328](../../../docs/findings.md#s328)
[^s13]: Read in the firmware. [Section 13](../../../docs/findings.md#s13)
[^s87]: Read in the firmware. [Section 87](../../../docs/findings.md#s87)
[^s244]: Measured in configurations. [Section 244](../../../docs/findings.md#s244)
[^s253]: Read in the firmware. [Section 253](../../../docs/findings.md#s253)
[^s353]: Measured in configurations. [Section 353](../../../docs/findings.md#s353)
[^s354b]: Measured on a unit. [Section 354](../../../docs/findings.md#s354)
[^d18]: Chosen by this project. [Decision 18](../../../docs/decisions.md#d18)
[^unchecked]: Not checked.
[^s19]: Read in the firmware. [Section 19](../../../docs/findings.md#s19)
[^t-usb-firmware]: Read in the firmware. [The test](../../../tests/test_usb_firmware.py)
[^s175]: Read in the firmware. [Section 175](../../../docs/findings.md#s175)
