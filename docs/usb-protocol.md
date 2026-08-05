# The Harmony USB protocol, from the firmware

**Status: derived from the firmware, and now read back off a remote.** The transport is complete and
quoted from the device's own descriptors. The command layer has its dispatch table, its length
nibble mapping, its state machine, and the request and response layout of every command. Live RAM
over USB works and event injection does not exist.

**Section 4 is the part a host measured**, on **both architectures**: the programmed Harmony 600 and
the spare Harmony One. Read only. `GET_VERSION`, `READ_MISC` and `READ_FLASH` have run, the flash read
is byte-identical to a dump made months earlier by other software on each unit, and six fields of the
version block were **predicted from the 600 and then confirmed on the One**, which differs in skin,
firmware, hardware version, flash part and architecture.

Three things the hardware corrected are marked in place rather than quietly fixed, and one thing it
did was not expected: a multi chunk read of internal program memory **restarted a remote**. Section 4
says what is known about that and `packages/usb` refuses the case.

This document is the deliverable of step 3 of `docs/roadmap.md`, and it was written as each part was
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

### Every command's response, in one table

| Command | Response | Where |
|---|---|---|
| `0x10` GET_VERSION | `0x28` then 12 bytes | `0x0C906` |
| `0x30` WRITE_FLASH | none from the executor, which is a bare `RETURN` | `0x0D30C` |
| `0x50` READ_FLASH | data in chunks of 63, ending by clearing the state | `0x0C982`, `0x0D3A8` |
| `0x70` START_IRCAP | none of its own; branches straight to the transmitter | `0x0CB1E` |
| `0xA0` WRITE_MISC | `0xF0` `0xA0` | `0x0CB6E` |
| `0xB0` READ_MISC | `0xC2`, the selector, then one byte | `0x0CB92` |
| `0xD0` ERASE_FLASH | `0xF0` `0xD0` | `0x0CB4A` |

**An acknowledgement is `0xF0` followed by the command's own byte.** Two samples, `0xA0` for
WRITE_MISC and `0xD0` for ERASE_FLASH, both built the same way by appending two bytes and
returning. So a host can treat `0xF0 cmd` as "done, no payload" without a per command table.

**Measured addition: the acknowledgement's length nibble is `0`, and the command byte follows it
anyway.** A Harmony 600 ends a `READ_FLASH` with `f0 50`, not `f1 50`. So the low nibble is a
payload length for a request and for a data chunk, and is not one for an acknowledgement. A host
that computes the acknowledged command's position from the nibble finds nothing there;
`packages/usb` did exactly that until the device said otherwise, and its passing test was asserting
the assumption rather than the protocol.

Two of the rows are absences, and both are coherent rather than gaps in the reading.
**WRITE_FLASH's executor is a single `RETURN`**, because the work is not in the state machine at
all: after WRITE_FLASH sets state 2, the data arrives as `0x40` packets handled in the USB
callback. And **START_IRCAP branches straight to `0x0D2E0`**, which is the shared response
transmitter, checking a pending byte count and submitting the IN report, so it emits whatever was
queued and nothing of its own.

### Every command's request, in one table

Derived by walking each parser from its dispatch target and recording where each byte read
from the packet is stored. Each parser is bounded by the next parser's entry address, which is
a branch target and therefore a hard limit for the linear prologue. An earlier version of this
scan had no such bound and ran one handler into the next, reporting eight argument bytes for
READ_FLASH instead of five.

| Command | Bytes | Layout |
|---|---|---|
| `0x10` GET_VERSION | none established | parsed inline in the callback, see below |
| `0x30` WRITE_FLASH | 5 | 24-bit address, 16-bit count. **Identical to READ_FLASH** |
| `0x50` READ_FLASH | 5 | 24-bit address, 16-bit count |
| `0x70` START_IRCAP | **0** | no arguments at all |
| `0xA0` WRITE_MISC | 5 | selector, 16-bit address, 16-bit value |
| `0xB0` READ_MISC | 3 | selector, 16-bit address |
| `0xD0` ERASE_FLASH | **3** | 24-bit address only, no count |
| `0x05` internal | 3 | three bytes, unidentified |

Two of those are worth stating on their own.

**WRITE_FLASH takes the same five bytes as READ_FLASH**, into the same variables, so a host
implementation can share the encoder, and the validator at `0x13DFE` is called by both, so the
region rules below apply to writes too.

**ERASE_FLASH takes an address and no length.** The erase granularity is therefore whatever the
hardware sector size is, not something the host chooses. That matters for the write rails: an
erase cannot be scoped by the caller, so scoping has to come from refusing addresses.

### GET_VERSION

**Request: `0x10 | length nibble`.** The parser is inline in the USB callback at `0x0BDFE`
rather than a separate handler, and it sets state 1.

The executor is state 1, `0x0C906`:

```
0c908: 4f 0e       MOVLW 0x4f         ; a 16-bit pointer, 0x0D4F
0c90a: dd 6f       MOVWF 0xedd
0c90c: 0d 0e       MOVLW 0x0d
0c90e: de 6f       MOVWF 0xede
0c910: 16 ec a1 f0 CALL 0x1422c       ; fills the block at 0x0D4F
0c91a: 28 0e       MOVLW 0x28         ; the response code
0c922: 6d ec b9 f0 CALL 0x172da       ; append it
0c928: 5b 6b       CLRF 0xd5b         ; then copy 12 bytes from 0x0D4F
0c92a: 0c 0e       MOVLW 0x0c
0c92e: 5b 5d       SUBWF 0xd5b,W
0c930: 10 e2       BC 0x0c952
```

**Response: `0x28` then 12 bytes**, copied out of a block that `0x1422C` builds.

**It is twelve fields, and the count closes.** `0x1422C` takes the pointer in `0xEDD` and
`0xEDE` as a base and stores through it with `ADDWF 0xedd,W` at exactly **twelve** sites, from
`0x142C0` to `0x143AE`, one per field, with `0xD1C` as the running offset. Twelve stores, twelve
bytes copied by the executor's loop, and neither number was derived from the other.

Each field comes from its own small accessor. Two of them say something about what they are
without any further work:

* `0x14244` clears `LATF` bit 7, the external flash chip select, then calls `0x10974` and takes a
  **16-bit** result out of `PROD`. A 16-bit value read over SPI from the flash chip is the flash
  id, which the corpus already records per remote as a manufacturer and device byte pair.
* `0x14268` takes two separately fetched values and packs them into one byte, `SWAPF` then
  `ANDLW 0xf0` then `IORWF`, so one of the twelve bytes is **two four-bit fields**. A major and
  minor version pair is the obvious candidate.

Naming the other ten means following their accessors, which is a separate piece of work and is
not done. concordance's `GET_VERSION` yields firmware, hardware, skin, flash id, protocol and
architecture, so those are the candidates, and the honest way to settle it is to compare our
twelve bytes against a concordance run on the same remote once there is a host implementation.
Which is the cross-check roadmap step 3 asks for anyway.

One loose end, recorded rather than smoothed over: `0x28` under the request encoding would be
code `0x20` with length nibble 8, and nibble 8 means **15** payload bytes, not 12. Either the
response length nibble is not the request mapping, or three more bytes follow the loop. Not
resolved.

### READ_MISC, and live RAM over USB

**Request: `0xB0 | length nibble`, then three bytes**: an item selector, then a 16-bit
parameter, high byte first.

```
0c4ce: state = 10
0c4d4: read byte -> 0xED3      which item
0c4e0: read byte -> 0xECF      parameter, high byte
0c4ec: read byte -> 0xECE      parameter, low byte
0c4f8: mark the packet handled, return
```

The executor is state 10, `0x0CB92`. It replies with `0xC2`, then echoes the selector, then the
data:

```
0cb94: c2 0e       MOVLW 0xc2         ; the response code
0cb96: 58 6f       MOVWF 0x358
0cb9c: 6d ec b9 f0 CALL 0x172da       ; append it to the IN report
0cba0: d3 ce 58 f3 MOVFF 0xed3,0x358  ; then the selector back
0cba8: 6d ec b9 f0 CALL 0x172da
0cbb4: d3 51       MOVF 0xed3,W       ; then dispatch on the selector
```

`0xC2` is worth noticing: **responses use the same encoding as requests**, a code in the high
nibble and a payload length in the low one, so `0xC2` is two payload bytes, the selector and one
data byte. WRITE_MISC's executor at `0x0CB6E` replies `0xF0` then `0xA0`, which reads as a bare
acknowledgement naming the command it acknowledges.

**Exactly four selectors are serviced**, and the numbering is not what upstream's header would
suggest:

| Selector | Body | What it does |
|---|---|---|
| `0x01` | `0x0CBC8` | calls `0x17DCA`, then `0x17E28`, returns a 16-bit value in `PROD` |
| `0x06` | `0x0CBE6` | passes the parameter's high byte to `0x1AB8A`, returns one byte |
| `0x07` | `0x0CBF4` | **reads RAM.** See below |
| `0x0C` | `0x0CC02` | not read yet |

Anything else falls through the chain.

**Selector `0x07` is an arbitrary data memory read:**

```
0cbf4: ce ce e9 ff MOVFF 0xece,FSR0L
0cbf8: cf ce ea ff MOVFF 0xecf,FSR0H
0cbfc: ef cf 64 fd MOVFF INDF0,0xd64
```

The 16-bit parameter becomes `FSR0` and the byte at that data address is what comes back. So
**live RAM of a running remote is readable over USB**, which is the capability
`docs/roadmap.md` wants in place of the deferred emulator: poll a variable while operating the
remote by hand. It also means the button mapping experiment is reachable, by watching the keypad
scanner's index variable while pressing every key.

**It is selector `0x07` here, not `0x06`.** libconcord's header names `MISC_RAM` as `0x06`, and
`0x06` on arch 14 is a different accessor that goes through `0x1AB8A`. Whether the upstream
number is right for another architecture is not established, and this is exactly why the project
doctrine derives rather than adopts: taking `0x06` on faith would have produced a read of the
wrong thing that still returned a plausible byte.

### WRITE_MISC, and the answer on event injection

**Request: `0xA0 | length nibble`, then five bytes**: a selector, a 16-bit address and a 16-bit
value. WRITE_MISC parses into bank 13 variables where READ_MISC uses bank 14, so the two are not
mirror images in the firmware even though they are in the protocol. Its executor at `0x0CB6E`
only acknowledges, replying `0xF0` then `0xA0`; the work is done at parse time, and the selector
chain is at `0x0C3AA`.

**Nine selectors are serviced**: `0x01`, `0x02`, `0x05`, `0x06`, `0x07`, `0x08`, `0x09`, `0x0A`,
`0x0B`. Three of them settle open questions.

**Selector `0x07` writes RAM**, exactly mirroring the read:

```
0c414: 5e cd e9 ff MOVFF 0xd5e,FSR0L
0c418: 5f cd ea ff MOVFF 0xd5f,FSR0H
0c41c: 61 cd ef ff MOVFF 0xd61,INDF0
```

So an arbitrary byte can be written into the data memory of a running remote over USB. It is not
a flash write and nothing survives a power cycle, but it is a write to a live device and this
project is read only, so it belongs in the rails rather than in the toolkit. See
`docs/roadmap.md`.

**Selector `0x09` is accepted and does nothing:**

```
0c440: 0d 01       MOVLB 0xd
0c442: 01 0e       MOVLW 0x01
0c444: 02 6f       MOVWF 0xd02      ; just the "packet handled" flag
0c446: 42 d0       BRA 0x0c4cc      ; and out
```

**And `0x03` is not in the chain at all.** libconcord's header names `MISC_QUEUE_ACTION` as
`0x03` and `MISC_QUEUE_EVENT` as `0x09`. On the strength of those names, arch 14 does not
implement action queueing, and implements event queueing as a no-op that reports success. Either
way **there is no event injection here**, so driving the remote from the host is not available
and the button mapping experiment has to be done by hand at the keypad, as the roadmap already
assumed.

That conclusion carries the same caveat as everywhere else in this document: the names are
upstream's, and upstream's `MISC_RAM 0x06` was already wrong for this architecture. What is
established from the image is that `0x09` is a no-op and `0x03` is unhandled. Which capability
those two numbers were meant to be is upstream's claim, not a finding here.

Selector `0x06` pairs with the read's `0x06`, calling `0x1AB96` where the read calls `0x1AB8A`,
so it is a second address space of some kind. Not identified.

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

**And the special region is the MCU's own program memory.** Inside the read path, at `0x0CA74`:

```
0ca74: d5 51       MOVF 0xed5,W        ; the region marker the validator set
0ca76: 32 e0       BZ 0x0cadc          ; 0: the config flash, over SPI
0ca78: fe 0a       XORLW 0xfe
0ca7a: 01 e0       BZ 0x0ca7e          ; 0xFE: here
0ca7c: 4b d0       BRA 0x0cb14         ; anything else: out
0ca7e: ce ce 60 fd MOVFF 0xece,0xd60   ; the 24-bit address, moved along
0ca8a: 60 cd 0a f3 MOVFF 0xd60,0x30a
0ca96: ac ec da f0 CALL 0x1b558        ; and this one does TBLRD*+
```

`0x1B558` is the internal read primitive, a table read. It is one of three siblings that share
the same address setup: `0x1B50A` sets `EECON1` to `FREE | WREN` and erases, `0x1B53C` sets it to
`WREN` and writes, `0x1B558` reads. So **a `READ_FLASH` with a top address byte of `0xFE` or
`0xFF` reads internal program memory by table read**, not the external config flash.

That is worth having for a reason beyond completeness. On a PIC18 J-series part the device id
words and the configuration words live at the top of program memory and are reachable only by
table read, which makes this the route to the **`MCU_ID`** that `docs/roadmap.md` wants in order to
measure the arch 12 part number rather than infer it.

Two things still not established: which of `0xFE` and `0xFF` is which, since the validator keeps
the low bit of byte 1 as a sub-selector and both reach the same body, and how the 24-bit address
maps onto the part's program memory. Both are cheap once a host implementation can issue the
command and compare against the datasheet's device id.

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

### The state machine, in full

The main loop's dispatch on the state variable is **one chain of 70 cases** running from
`0x0C720` to `0x0C8FE`, with values from `0x01` to `0xD6`, all distinct, reaching 31 distinct
bodies. States 2 and `0x0B` are special cased just before it, with ordinary `SUBWF`
comparisons, and go to `0x0D30C`.

The seven command states and their executors, in the 700 2.8 image:

| State | Command | Executor |
|---|---|---|
| 1 | GET_VERSION | `0x0C906` |
| 2 | WRITE_FLASH | `0x0D30C`, via the special case before the chain |
| 4 | READ_FLASH | `0x0C982` |
| 5 | START_IRCAP | `0x0CB1E` |
| 8 | ERASE_FLASH | `0x0CB4A` |
| 9 | WRITE_MISC | `0x0CB6E` |
| 10 | READ_MISC | `0x0CB92` |
| 13 | the internal case | `0x0CC46` |

That table is the way in to every remaining command, and it is what should have been derived
before anything else in this section.

**The 63 byte chunking is READ_FLASH's after all.** State 4 goes to `0x0C982`, and the
comparison against `0x3F` at `0x0C9B2` is reached from `0x0C988` two instructions later. So the
attribution withdrawn above is restored, this time by control flow from the state dispatch
rather than by finding code that touches the same variables. 63 payload bytes is what length
nibble `0xA` encodes, so the response fills a report exactly.

### A second dispatch site for state 4

There is also an `XORLW` chain at `0x0D388`, seven cases, 2, 4, 5, 6, `0x0B`, `0x20` and `0x35`,
in which **state 4 goes to `0x0D3A8`** instead. Both are real dispatch sites on the same
variable, reached from different places. What each body does suggests the division, and that
much is inference: `0x0C982` starts a chunk, `0x0D3A8` finishes one. Its body:

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

## 4. Measured against two bench remotes

Everything above was derived from firmware images. This section is what a host actually observed on
the wire, from `packages/usb`, on **both architectures**:

| | Harmony 600 | Harmony One |
|---|---|---|
| Unit | programmed | the **spare, unprogrammed** one |
| Architecture | 14 | 12 |
| Identified as | `0x046D:0xC122`, `bcdDevice 0x1071` | `0x046D:0xC121`, `bcdDevice 0x1054` |
| Skin, firmware | 71, 0.2 | 54, 3.4 |
| Config at | `0x030000` | `0x040000` |

Read only throughout: `GET_VERSION`, `READ_MISC` and `READ_FLASH`, no writes of any kind by any path.

Which Harmony One is on the bench was determined from the data rather than from the label: 256 bytes
read at `0x040000` are identical to the unprogrammed unit's dump and differ from the programmed one's
at offset 4, which is `end_addr` and therefore the config length.

### The flash read, against an answer obtained without it

256 bytes read from each remote's config base are **byte-identical to the lab dump of that same
unit**. That is the verification that matters: a read returning plausible bytes proves nothing, and
the dumps were made by concordance months earlier, so they are independent answers. Pinned in
`packages/usb/test/hardware.test.ts`, behind `HARMONY_HARDWARE_TESTS=1` so a routine test run does
not claim a remote.

**One host side bug, worth recording because its symptom was a lie about the device.** A read that
stopped as soon as it had the bytes it asked for left the trailing `0xF0 0x50` in the pipe, and the
next command read that first and concluded its own transfer was over. The observed pattern was a 32
byte read succeeding, the next 62 byte read returning nothing, a 63 byte read returning 62 and a 256
byte read returning 124: exactly what a device with a strange size limit would look like, and
entirely one stale report. A transfer here has to be drained to its acknowledgement, not to its byte
count.

The reply layout, which was not established from the images:

```
6a 01 <62 data bytes>      chunk 1
6a 12 <62 data bytes>      chunk 2
6a 23 <62 data bytes>      chunk 3
...
67 45 <6 data bytes>       a short chunk, literal nibble
63 56 <2 data bytes>
f0 50                      done
```

* **The code is `0x60`.** The withdrawn attribution is now settled from the outside rather than by
  proximity in the disassembly.
* **The nibble is the payload length, and the first payload byte is a sequence number**, so a full
  chunk carries 62 data bytes, not 63. That closes the 63 the firmware compares against: 63 is the
  largest payload a length nibble can describe, and one of those bytes is the sequence.
* **The sequence advances by `0x11`**: `0x01`, `0x12`, `0x23`, `0x34`, `0x45`, `0x56`. So the low
  nibble is this chunk's number and the high nibble the previous one's. Worth checking in a host: a
  dropped report over HID is this transfer's real failure mode, and unchecked it is silent
  corruption inside a config rather than an error.
* **The count on the wire is not biased by one.** 256 requested, 256 delivered, as
  62+62+62+62+6+2. The `INCF` that suggested a bias belongs to something else.

### GET_VERSION's twelve bytes, six identified by prediction

The 600 gave `02 11 1c 15 e0 47 0c 02 00 00 02 02`. Laid beside `concordance -i` on the same unit,
six fields had a reading. **That reading was then written down as a prediction for the Harmony One,
before the One was read**, and the One gave `34 05 c8 1f c0 36 0c 34 34 16 34 34`: the first six
bytes exactly as predicted.

| Field | 600 | One | Reading |
|---|---|---|---|
| 0 | `0x02` | `0x34` | firmware version, as two nibbles: `0.2` and `3.4` |
| 1 | `0x11` | `0x05` | hardware version, as two nibbles: `1.1` and `0.5` |
| 2 | `0x1c` | `0xc8` | flash device id |
| 3 | `0x15` | `0x1f` | flash manufacturer id, so the pairs are `15:1C` and `1F:C8` |
| 4 | `0xe0` | `0xc0` | protocol in the high nibble: 14 and 12 |
| 5 | `0x47` | `0x36` | skin, 71 and 54, which `bcdDevice` says independently |
| 6 | `0x0c` | `0x0c` | **the same on both**, so a constant. `0x0C` is 12, which is also the number of fields |
| 7 | `0x02` | `0x34` | equals field 0 on both |
| 8 | `0x00` | `0x34` | unidentified. Equals field 0 on the One and not on the 600 |
| 9 | `0x00` | `0x16` | unidentified |
| 10 | `0x02` | `0x34` | equals field 0 on both |
| 11 | `0x02` | `0x34` | equals field 0 on both |

That is six fields agreeing across two architectures, with the second remote differing in every one
of the values the reading predicts. Fields 2 and 3 are the 16-bit SPI read the firmware performs with
the chip select low, characterised as "the flash id" from the image alone; fields 0 and 1 are the
packed nibble shape the `SWAPF`, `ANDLW 0xF0`, `IORWF` sequence builds. So two of the six are
agreements between a disassembly and a device.

**What is not claimed.** Fields 7, 10 and 11 repeating field 0 is an observation, not a reading:
three copies of the firmware version is a strange thing for a version block to carry, and the more
likely explanation is that they are version numbers of other components which happen to match on both
of these remotes. Fields 8 and 9 are unexplained, and `0x16` on the One is the only value in the block
that has no counterpart anywhere in concordance's output. Concordance prints three things this block
could plausibly carry that are still unplaced: firmware type, the third component of the hardware
version, and `IRL, ORL, FRL`.

### Internal program memory: `0xFF` reads it, `0xFE` does not, and `MCU_ID` is out of reach

Sent to the Harmony One. **A `READ_FLASH` with top address byte `0xFF` returns internal program
memory; the same read with `0xFE` returns nothing at all.** That answers which of the two the
sub-selector wants, which the images could not: both values reach the same body, and only one of them
produces data.

The window maps one to one from program address zero, and what is there says so:

```
d2 ef 07 f0   GOTO, at program address 0x0000, the reset vector
12 00         RETURN
...
00 ef 02 f1   GOTO, at 0x0008, the high priority interrupt vector
...
00 ef 04 f1   GOTO, at 0x0018, the low priority interrupt vector
```

PIC18 puts exactly those three vectors at exactly those addresses, so this is the MCU's own flash at
its own address zero, not a window onto something else. **This is code no image in the corpus
contains**, because on arch 12 the application runs from external NOR at `0x020000`; what is here is
whatever bootstraps that.

**`MCU_ID` is not reachable this way.** The address is 24 bits with the top byte spent on the region
selector, and the firmware bounds the remaining 16 to `0xFFC0`, so the reachable window is the first
64 KiB of program memory. A PIC18 keeps its device id at `0x3FFFFE`, far outside it. So the arch 12
part number stays inferred, and the route to measuring it is not this one. Recorded as a negative
result rather than left as a task, because the task as written cannot be done.

**A multi chunk read of this region restarted a remote.** With the pipe clean, 32 bytes read fine, 62
read fine, and 63 produced no data and then the remote left the USB bus. It re-enumerated by itself,
came back healthy, and its config still reads byte-identical to its dump. The owner saw it restart, so
this is the device resetting and not a host artefact. Sixty-three is the first size that needs a
second chunk on this path, for a single byte, while the config flash path handles 64, 100 and 256
without complaint.

Not diagnosed, and not retried. `packages/usb` refuses an internal read of more than one chunk, which
is a cap and not a fix; 62 bytes at a time is enough for what this region is wanted for. Worth stating
plainly for anyone building on this: **every command in this session was a read**, and a read of this
region still perturbed a running remote.

### Live RAM, and upstream's selector confirmed wrong for this architecture

`READ_MISC` selector `0x07` at data address `0x1C1`, the 600's command state variable, returns
**10**, and so does `0x284` on the Harmony One, which is where the same variable lives on arch 12. Ten
is the state `READ_MISC` itself sets. So the read observes the command that is doing the
reading, which is a closure that no amount of plausible-looking bytes could fake: it is live memory
of a running remote, at an address predicted from the disassembly, holding the value the
disassembly says it should hold at that instant.

Other addresses return different values, so it is not a stuck byte. And the same address through
selector `0x06`, which is what libconcord's header calls `MISC_RAM`, returns `0` instead of `10`.
Both selectors are serviced and they are not the same accessor, which is what deriving rather than
adopting bought here.

### Answered since this list was first written

Recorded rather than deleted, because three of the four were open questions this step was set up
to settle, and a list that only ever grows is not a status.

* **Which `MISC` items the firmware services**, and whether `MISC_RAM` works in normal mode: yes,
  four read selectors and nine write ones, and RAM is selector `0x07` and not upstream's `0x06`.
* **Whether `MISC_QUEUE_ACTION` and `MISC_QUEUE_EVENT` exist**: `0x03` is unhandled and `0x09` is a
  no-op that reports success, so there is no event injection.
* **The response layout of each command**: the table above, from the state handlers rather than the
  parsers.
* **GET_VERSION's block is twelve fields**, by two independent counts. Ten of them are still
  unnamed, which is the entry below.

### Still open

* **Fields 8 and 9 of the version block**, and what fields 7, 10 and 11 are versions of, given that
  they repeat field 0 on both remotes. Concordance prints firmware type, the third component of the
  hardware version, and `IRL, ORL, FRL`, none of which is placed.
* **Why a 63 byte read of internal program memory restarts a remote.** Capped rather than understood.
* **Another route to `MCU_ID`**, since the internal read window is the first 64 KiB and the device id
  is at `0x3FFFFE`. The arch 12 part number stays inferred until one is found.
* Whether the length nibble mapping differs in safe mode, which is a separate firmware.
* Whether `0x28`, GET_VERSION's code, means anything in its low nibble. It is not a payload length:
  it would say 15 where the firmware copies 12, and the acknowledgement shows the nibble is not a
  length for every response.

## Corroboration used, after the fact

* `USB_PACKET_LENGTH 64` in libconcord's hidapi backend agrees with the 64 byte reports.
* libconcord matches Harmony remotes by vendor `0x046D` and a product id **range**,
  `0xC110` to `0xC14F`, rather than by exact id, so it cannot corroborate or contradict the
  600 and 700 sharing `0xC122`. Our own descriptor read is the better evidence.
