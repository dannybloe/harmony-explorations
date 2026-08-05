# The Harmony USB protocol, from the firmware

**Status: in progress.** The transport is complete and quoted from the device's own
descriptors. The command layer has its dispatch table, its length nibble mapping and its
control flow; the per command request and response layouts are still open, and so is the
`MISC` sub-command question. Section 3 lists what is missing. This document is the
deliverable of step 3 of `docs/roadmap.md`, and it is being written as each part is
established rather than at the end.

Scope: the Harmony One 3.4 image (architecture 12) and the Harmony 700 2.8 image
(architecture 14). The Harmony 600 0.2 dump is truncated by concordance at 65536 of 70336
bytes, and several of the things this document needs are past the cut, so the 600 is
confirmed against the live remote instead where that is possible.

Method, and why it matters here: everything is derived from the firmware images.
`concordance/specs/protocol.txt` and the libconcord source are consulted **after** a fact is
derived, as corroboration, never as the source. That is partly licensing (concordance is
GPLv3 and this repository is MIT, so its code is not read for structure or copied) and
partly that concordance has two documented defects on exactly these two architectures. See
`reference/concordance-notes.md`.

## 1. The transport

Every byte of every command crosses one of two interrupt endpoints, 64 bytes at a time. The
remote states all of it at enumeration, so this section is quotation rather than inference.

| | Harmony One 3.4 | Harmony 700 2.8 | Harmony 600 0.2 |
|---|---|---|---|
| Source | image | image | **live device** |
| Descriptor block at | `0x2E38E` | `0x1B7C6` | past the dump's truncation |
| USB version | 2.00 | 2.00 | 2.00 |
| Vendor and product | `046D:C121` | `046D:C122` | `046D:C122` |
| `bcdDevice` | `0x1054` | `0x1066` | `0x1071` |
| Interface class | 3 (HID), subclass 0, protocol 0 | same | same |
| Control endpoint packet size | 8 | 8 | 8 |
| Endpoint 1 | interrupt IN, 64 bytes, 1 ms | same | same |
| Endpoint 2 | interrupt OUT, 64 bytes, 1 ms | same | same |
| Report descriptor | 33 bytes at `0x2E42D` | 33 bytes at `0x1B865` | 33 bytes, identical to the 700's |
| Product string | `Harmony Remote 0-3.4.0` | `Harmony Remote 0-2.8.0` | `Harmony Remote 0-0.2.0` |

Read it with:

```sh
tools/usbdesc.py 700-2.8-Region_2-code-base0x9000.bin 0x9000 --raw
```

### What a host implementation has to get right

* **The endpoint numbering is asymmetric.** IN is endpoint 1, OUT is endpoint **2**. The
  device descriptors say `81 03 40 00 01` and `02 03 40 00 01`, so this is not a symmetric
  pair and code that assumes endpoint 1 in both directions will not talk to the remote.
  Measured on the bench remote as well, see below.
* **64 bytes each way, and no report ids.** The report descriptor declares report size 8 by
  report count 64 for both the input and the output report, and contains no Report ID item.
  So a report is exactly 64 payload bytes. hidapi wants a leading report id byte of zero
  prepended on some platforms; that byte is not part of the protocol.
* **Vendor defined usage page `0xFF00`.** With interface subclass 0 and protocol 0 this is
  not a boot keyboard or mouse, so no operating system claims the device as an input
  device. On Linux a udev rule is still needed for a non-root process to open it.
* **Interrupt polling at 1 ms** in both directions. One 64 byte report per frame is a
  ceiling of 62.5 KiB/s per direction, so reading the Harmony One's 1.6 MiB config cannot
  beat about 26 seconds however efficient the command layer is.
* The configuration descriptor reports `bmAttributes 0xC0`, self powered, and `bMaxPower
  0x32`, so 100 mA. It draws bus power while charging regardless.

### Two closures that make the location trustworthy

Finding a descriptor block by searching for `12 01` alone would be weak: those two bytes
occur in code. Two independent checks confirm the block:

1. **The chain walks.** Nine descriptors, each one's `bLength` landing exactly on the start
   of the next, ending where an unrecognised type begins. Both images give the same nine:
   device, configuration, interface, HID, endpoint, endpoint, then three strings.
2. **`wTotalLength` closes.** The configuration descriptor declares `0x29`, 41 bytes, and
   the configuration, interface, HID and two endpoint descriptors are 9 + 9 + 9 + 7 + 7 = 41.

A third check confirms the block belongs to the image it was found in rather than to some
other firmware sharing the file: the product string states the firmware version, 2.8.0 and
3.4.0, which was already known from the package each image was extracted from.

### Confirmed against the bench remote

The Harmony 600 was plugged into a Mac and enumerated read only, with `ioreg`. No command was
sent to it and no protocol code was involved: this is what the operating system learns at
enumeration and nothing more.

That matters more than an extra sample usually would, because the 600's firmware dump is
truncated before its descriptor block, so everything in this section was previously read from
a remote nobody here owns. It is now measured on the arch 14 remote that will actually be
tested against.

Every field agrees, including `iManufacturer 1, iProduct 2, iSerialNumber 0`, one
configuration, full speed, `bMaxPacketSize0 8`, class and subclass and protocol all as the
images have them, one HID interface with **two** endpoints, 64 byte input and output reports
and a 1 ms report interval.

The endpoint descriptors were read separately, with pyusb, because `ioreg` does not report
them. Also enumeration only: libusb caches a device's descriptors when it enumerates, so
these come out of that cache without an open handle and without a transfer reaching the
remote.

```
046D:C122  bcdDevice 0x1071, so skin 71
  configuration 1: bmAttributes 0xC0, 100 mA
    interface 0 alt 0: class 3, subclass 0, protocol 0
      endpoint 0x81: number 1 in  interrupt 64 bytes every 1 ms
      endpoint 0x02: number 2 out interrupt 64 bytes every 1 ms
```

That is the image's `07 05 81 03 40 00 01` and `07 05 02 03 40 00 01`, field for field,
including the asymmetry: **IN on endpoint 1, OUT on endpoint 2, measured.** With
`bmAttributes 0xC0` and 100 mA from the configuration descriptor as well. Nothing in this
section now rests on the 700 image alone. `tools/usbprobe.py` repeats it.

Two results are worth stating separately.

**`bcdDevice` came back `0x1071`, which was the prediction, and the 600 is skin 71.** The
reading of the field was derived from two images and then predicted a third value before it
was measured.

**The 33 byte report descriptor is byte for byte the 700's**, `81 06` included. So the input
item flag difference described below really does track the architecture rather than the
individual model or firmware version: the live arch 14 remote matches the other arch 14
image, not the arch 12 one. The measured bytes are pinned in `tests/test_usbdesc.py`, which
turns the measurement into a regression test.

### `bcdDevice` carries the skin

The low byte of the device release number, read as BCD, is the remote's skin number. `0x1054`
on a remote known to be skin 54, `0x1066` on one known to be skin 66. Two samples, two
architectures, both known independently, and no other field in the descriptor block plausibly
encodes 54 and 66. The high byte is `0x10` in both and is not identified.

This is more useful than it sounds. **The 600 and the 700 share product id `0xC122`**, so the
product id does not identify an arch 14 model, and the skin does, before a single config byte
is read. It is directly load bearing for the write rails in `docs/roadmap.md`, where a write
must refuse to proceed unless the config's `INTENDEDVERSION` matches the connected remote's
skin.

This was recorded here as a prediction before it was checked: the Harmony 600 should report
`bcdDevice 0x1071`, because that remote is skin 71. **Measured, and it does.** Three samples
now, three skins, two architectures.

### The one byte the two architectures disagree on

The 33 byte report descriptors are identical except a single flag bit: the arch 14 input
report is declared `Relative` (`81 06`) and the arch 12 one `Absolute` (`81 02`). No HID
parser interprets a vendor defined blob, so it changes nothing. Recorded because it is the
only difference, which makes it a fingerprint, and because "identical except one byte" is the
sort of claim worth counting rather than eyeballing. It is counted in
`tests/test_usbdesc.py`.

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

## 3. The command layer

### The first byte is a command and a length

The low nibble of the first byte is a payload length, and the mapping is not linear:

| Low nibble | Payload bytes |
|---|---|
| `0` to `7` | 0 to 7, unchanged |
| `8` | 15 |
| `9` | 31 |
| `A` | 63 |
| `B` to `F` | unchanged, so 11 to 15; almost certainly unused |

Derived from `0x0BD22` onwards: `SUBLW 0x07` and a carry branch let nibbles 0 to 7 through
untouched, then a comparison chain maps `0x0A`, `0x09` and `0x08` to `0x3F`, `0x1F` and
`0x0F`. **Numeric closure: 63 payload bytes plus the command byte is exactly the 64 byte
report the descriptors declare**, and 15, 31, 63 are 2^4-1, 2^5-1 and 2^6-1. A misreading
would not land on the report size. All three images carry the same mapping with the same
constants.

The high nibble is the command. It is masked out at `0x0BD52` with `ANDLW 0xF0` after the
length has been taken, so the command and its length live in one byte and the payload starts
at byte 1.

### The command table

Every image dispatches the same seven commands. The table below is derived rather than
transcribed, because this compiler emits a switch as a chain of `XORLW` comparisons whose
literals are **not** the case values: each literal is the XOR of one case with the next, so
the case value is the running XOR. `harmony/pic18/chains.py` computes it.

| Command | Name | State it sets | 700 2.8 | 600 0.2 | One 3.4 |
|---|---|---|---|---|---|
| `0x10` | GET_VERSION | 1 | `0x0BDFE` | `0x0BD68` | `0x264B4` |
| `0x30` | WRITE_FLASH | 2 | `0x0C21A` | `0x0C184` | `0x264C2` |
| `0x50` | READ_FLASH | 4 | `0x0C266` | `0x0C1D0` | `0x2650C` |
| `0x70` | START_IRCAP | 5 | `0x0C2B2` | `0x0C21C` | `0x26556` |
| `0xD0` | ERASE_FLASH | 8 | `0x0C2D6` | `0x0C240` | `0x2657A` |
| `0xA0` | WRITE_MISC | 9 | `0x0C364` | `0x0C2CE` | `0x26626` |
| `0xB0` | READ_MISC | 10 | `0x0C4CE` | `0x0C432` | `0x2671E` |
| `0x05` | not a USB command, see below | 13 | `0x0C500` | `0x0C464` | absent |

Names are the ones the protocol is known by. The firmware names nothing.

### A command is parsed in one place and executed in another

Every handler in that table does the same two things and then returns: it sets a state
variable, and it reads its arguments out of the packet. The work happens later, when the main
loop sees the state. So **responses are asynchronous**, which a host implementation has to
allow for: writing a command does not mean a reply is waiting.

**The state numbering is identical in all three images** while the state variable itself is
at a different address in each (`0xEC9` in the 700, `0x1C1` in the 600, `0x284` in the One).
Same protocol implementation, different memory maps, and across two architectures.

The dispatch at `0x0BDCA` is itself gated on that state, at `0x0BDB2`:

* state 0, idle: the table above
* state 2, a flash write in progress: a second, two entry chain at `0x0BD5C` handling `0x40`
  and `0xF0`
* state 5: `0x0C5D4`
* anything else: `0x0C5EE`

**This is why `0x40` WRITE_FLASH_DATA is absent from the main table.** WRITE_FLASH sets state
2 as its first instruction, and state 2 is the only state in which the `0x40` chain runs, so
the firmware accepts flash data only after it has agreed to a write. That is a property of
the device, not of the host, which is worth knowing before trusting any host side guard.

### `0xE0` is an escape with a sub-command byte

At `0x0BD58` the masked command is compared against `0xE0`, and if it matches, a second byte
is read and dispatched: **`0x01`, `0x02`, `0x03` and `0x05`**. So the byte the protocol is
known by as `0xE1` RESET is command `0xE0` with length nibble 1 and one payload byte, and
that payload byte selects the kind of reset. Sub-command `0x05` is the one that reaches the
`0x05` row of the table above, by storing `0x05` into the state variable's dispatch input at
`0x0BDA8`, which is what makes that row an internal continuation rather than a command a host
can send directly.

### READ_MISC takes three bytes

```
0c4ce: state = 10
0c4d4: read byte -> 0xED3      which item
0c4e0: read byte -> 0xECF      parameter, high byte
0c4ec: read byte -> 0xECE      parameter, low byte
0c4f8: mark the packet handled, return
```

The item selector and a 16-bit parameter, then deferred execution. WRITE_MISC at `0x0C364` is
the same shape with a value to write.

### READ_FLASH

The one command version 1 of the application actually needs. Addresses are the 700 2.8 image.

**Request: `0x50 | length nibble`, then five bytes.**

| Byte | Meaning |
|---|---|
| 1 | address, most significant byte, **and the region selector** |
| 2 | address, middle byte |
| 3 | address, least significant byte |
| 4 | count, high byte |
| 5 | count, low byte |

So the address is 24 bits and the count 16 bits, both most significant first. The length nibble
of the command byte should therefore be 5.

The address is an address because it becomes one, which is better than an inference. At
`0x13EBA` the three variables are copied into `TBLPTRL`, `TBLPTRH` and `TBLPTRU`, which also
fixes the byte order:

```
13eba: ce ce f6 ff MOVFF 0xece,TBLPTRL
13ebe: cf ce f7 ff MOVFF 0xecf,TBLPTRH
13ec2: d0 ce f8 ff MOVFF 0xed0,TBLPTRU
```

**Correction.** This block was published here as READ_FLASH's read path, bracketed by the
external flash chip select. It is not established that it belongs to READ_FLASH. The routine
containing it, `0x13E90`, has exactly one caller, `0x0C6F2`, which is behind a flag test, and
its other branch calls `0x1B50A`, which sets `EECON1` to `FREE | WREN`. Those are the internal
flash erase enable and write enable bits, so that branch erases rather than reads, and a
routine whose two branches are a read and an erase is not a reading of a read path. `0x13E90`
is more likely part of the erase or write machinery, which on arch 14 has to prepare internal
flash because the config is copied there to execute.

What survives the correction: the three bytes are an address, since they are loaded into
`TBLPTR` somewhere, and the variables are shared, both READ_FLASH and WRITE_FLASH parsing into
them. What does not: that this particular block is what READ_FLASH does, and with it the claim
that READ_FLASH's read has been located at all. It has not.

**Byte 1 is validated, and that is where the regions are.** `0x13DFE` returns 1 for accepted
and 0 for rejected:

* below `0x20`: an ordinary config flash address, and the region marker is cleared
* `0xFE` or `0xFF`: a region that is not the config flash. The marker is set to `0xFE`, the
  low bit of byte 1 is kept as a sub-selector, and the remaining 16 bits are bounded to
  `0xFFC0`, which is `0x10000` minus 64, so an offset plus a full report cannot leave the
  window. That path calls `0x1B50A` with the address triple instead of the flash reader.
* anything else: rejected.

That is the answer to the region question in `docs/roadmap.md` step 3, at least in shape.
**Which region is which is not established**: the sub-selector is one bit, so `0xFE` and `0xFF`
are two regions, and `0x1B50A` has not been read. The protocol is known to name four,
`MCU_FLASH`, `MCU_EEPROM`, `MCU_ID` and `EXT_FLASH`, so either not all four are reachable on
arch 14 or the mapping is not one selector per region.

**Somewhere in the flash machinery, a 16-bit remaining count is chunked at 63 bytes.** This was
published as READ_FLASH's response chunking, and that attribution stays **withdrawn**: which
command reaches `0x0C9B2` has still not been established. What the code there does is not in
doubt. That the count pair is READ_FLASH's count is now established, but by the state machine
below rather than by this code.

```
0c9b4: 3f 0e       MOVLW 0x3f
0c9b6: d1 5d       SUBWF 0xed1,W      ; 16-bit compare of the remaining count
0c9ba: d2 59       SUBWFB 0xed2,W
0c9bc: 24 e2       BC 0x0ca06         ; a full 63 byte chunk
0c9be: d1 29       INCF 0xed1,W       ; otherwise what is left, plus one
```

63 is exactly what length nibble `0xA` encodes, which remains a real agreement between two
parts of the firmware even with the attribution withdrawn: something in the flash path moves
data in units that match the largest payload the command byte can describe.

The `INCF` on the short path implies the counter holds one **less** than the number of bytes
still to send, which is a common enough convention but rests on that single instruction here.
Whether the count on the wire is already biased that way, or is decremented once on arrival,
is not established.

### The response loop, found the right way

Following the state machine instead of the variables works. State 4 is not compared anywhere
with the `SUBWF` form that most of the state machine uses; it is a case in an `XORLW` chain at
`0x0D388`, whose seven cases are 2, 4, 5, 6, `0x0B`, `0x20` and `0x35`, all plausible small
state values, which is the sanity check that chain decoding needs. **State 4 goes to
`0x0D3A8`**, and its body is READ_FLASH's per chunk step:

```
0d3a8: 10 0e       MOVLW 0x10
0d3ac: d4 27       ADDWF 0xed4,F     ; a counter, advanced 0x10 per pass, purpose unknown
0d3b0: d1 51       MOVF 0xed1,W
0d3b2: d2 11       IORWF 0xed2,W     ; is the remaining count zero?
0d3b4: 03 e1       BNZ 0x0d3bc
0d3b6: c9 6b       CLRF 0xec9        ; yes: state 0, the command is finished
0d3ba: 12 00       RETURN
0d3bc: d3 51       MOVF 0xed3,W      ; the size of the chunk just sent
0d3c8: d1 5f       SUBWF 0xed1,F     ; remaining -= chunk, 16 bits
0d3cc: d2 5b       SUBWFB 0xed2,F
```

So **bytes 4 and 5 are a 16-bit count**, and this time by control flow from the dispatch rather
than by variable following: the pair is decremented by each chunk and the command completes,
returning the state machine to idle, when it reaches zero.

The chunk size comes from `0xED3`, which is also the variable READ_MISC parses its item
selector into, so the sharing that caused the retraction above is confirmed to be real. Whether
the chunk is the 63 seen at `0x0C9B2` is exactly the question that must not be answered by
proximity: it needs following control flow into whatever sets `0xED3` on this path. Not done.

### Still open

* Which `MISC` items the firmware services, and in particular whether `MISC_RAM` reads work
  in normal mode, which is what would give live RAM of a running remote over USB. The
  selector is `0xED3` and its consumers are around `0x0CA00` to `0x0CC00`.
* Whether `MISC_QUEUE_ACTION` and `MISC_QUEUE_EVENT` exist, which would allow driving the
  remote from the host.
* The response layout of each command, which means reading the main loop's state handlers
  rather than the parsers.
* The request layout of GET_VERSION, WRITE_FLASH, ERASE_FLASH and START_IRCAP, each of which
  is a few instructions in the same shape as READ_MISC above. READ_FLASH is done.
* Which region `0xFE` and `0xFF` select, which means reading `0x1B50A`.
* Whether the length nibble mapping differs in safe mode, which is a separate firmware.

## Corroboration used, after the fact

* `USB_PACKET_LENGTH 64` in libconcord's hidapi backend agrees with the 64 byte reports.
* libconcord matches Harmony remotes by vendor `0x046D` and a product id **range**,
  `0xC110` to `0xC14F`, rather than by exact id, so it cannot corroborate or contradict the
  600 and 700 sharing `0xC122`. Our own descriptor read is the better evidence.
