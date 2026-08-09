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
(architecture 14). The Harmony 600 0.2 dump was truncated by concordance at 65536 of 70336 bytes
while most of this document was written, so several things here were confirmed against the live
remote instead. **That image is complete now**, read off the remote by the command layer this
document describes and checked by its own header checksum, section 4.

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

### Learning infrared is a bracket, and only two commands are inside it

The state 5 chain at `0x0C5D4` accepts **exactly one command, `0x80`**, and it sets the state
variable to 6. So `0x80` STOP_IRCAP exists only inside a learning session, which is why it is
absent from the idle dispatch table above. **Any other command during a session ends it**: the
fall through at `0x0C5EE` clears the state to 0 and sets the error byte, with no error reply.

States 6 and 7 share one executor, `0x0CB20`, which sets the state to 7 and emits `0xF0` then
`0x70`: the same bare acknowledgement naming its command that WRITE_MISC gives. The 600 0.2 image
carries the identical shape against its own addresses.

So the firmware side of learning is `0x70` in, `0x80` out, `0xF0 0x70` acknowledged, states 5, 6, 7.

**What sends the data is still open, and one wrong answer is recorded rather than deleted.** This
said the response byte is never loaded with `0x90` in either arch 14 image, which is true and
proves nothing: the same scan finds no `0x60` either, and that is `READ_FLASH`'s data code, whose
length nibble is computed so its code byte is never a literal. Section 91 has the correction.

What is established instead is that **every architecture configures CCP2 as a capture on both
edges** while CCP1 does the transmit carrier, so all four remotes have a working infrared receiver
in firmware, arch 9 included. And the samples **do** reach the host during a session: the owner
used this feature with the classic software and the client recognised a received code immediately,
which is a first hand account rather than a measurement and is still the best evidence available.

**What no search has found is the sender.** No state body emits `0x90` on either architecture, 10
states on the One and 70 on the 700; the byte at a time sender's 32 callers all lie in the command
response region; and the response buffer's pointer and counter are touched only inside the USB
transport layer. The capture driver touches none of it. So an assumption in that search is wrong,
and section 91 lists the candidates. The report layout the client expects is in
`docs/host-client.md`, marked unconfirmed.

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

**Response: `0x28` then 12 bytes**, copied out of a block that `0x1422C` builds. On **arch 9** the
response is `0x27` and seven fields; see below.

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

**That is an arch 12 and arch 14 fact, and arch 9 does not have it.** Measured on the bench Harmony
525 on 9 August 2026: the selector is accepted, the reply is a well formed `0xC2` echoing `0x07`,
and the byte is **zero for every address**, over 1696 of them spanning six general purpose banks and
the special function register page. The calibration is the same sweep on a 600 and a One, which
return live data in the same banks, and the giveaway is that the 525 reports `PORTC` as zero while
it is driving USB. Arch 9's `READ_MISC` body is not located in `h525_code` yet, so what it does
instead is open. `docs/findings.md` section 90.

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

**That rule is arch 12 and arch 14's, and arch 9's is a different one.** *Measured on a Harmony
525, live device, 8 August 2026, section 76.* It is **silent** at `0x010000`, `0x020000` and
`0x030000` and answers at `0x800000`, `0x810000`, `0x820000` and `0x870000`, so its serial flash
sits a megabyte up: config at `0x820000`, firmware at `0x810000`, and a second image at
`0x800000`, exactly where concordance's architecture table puts them. Internal program memory is
at plain `0x000000` there, with no `0xFE` window at all, which matters because this project's cap
on internal reads keys on `0xFE` and `0xFF` and therefore protected nothing on arch 9 until
`validateRegionByte` learned about the architecture.

**A rejected address produces silence, not an error.** So a host with the wrong base looks like a
host with a broken cable, and that is how it presented: the first arch 9 config read failed with
"flash read returned 0 of 16 bytes".

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

Two things were not established from the images: which of `0xFE` and `0xFF` is which, since the
validator keeps the low bit of byte 1 as a sub-selector and both reach the same body, and how the
24-bit address maps onto the part's program memory.

> **Both were settled on hardware and neither answer is the one this section expected.** They are
> two **pages** rather than a selector and a dud, and it is `0xFE` that maps from program address
> zero; see "Internal memory: `0xFE` and `0xFF` are two pages" below. And `MCU_ID` is **not**
> reachable by this route after all: the window is two 64 KiB pages and a PIC18 keeps its device id
> at `0x3FFFFE`, so the arch 12 part number stays inferred. Read on before acting on the paragraph
> above.

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

### The reply's low nibble is the field count, and twelve is not universal

*Measured on a Harmony 525, live device, 8 August 2026. `docs/findings.md` section 76.*

| architecture | reply byte | fields |
|---|---|---|
| 9 | `0x27` | 7, and every one of them identified |
| 12, 14 | `0x28` | 12, by the firmware's own two counts above |

A 525 answers `27 30 25 12 ff 90 16 09`: firmware 3.0, board 2.5.0, flash `0xFF:0x12`, then `0x90`
for architecture 9, skin 22, and `0x09` where the two MyHarmony era remotes carry a compiled in
`0x0C`. concordance reads the nibble as a length and branches on it, accepting 5, 7 or 8 and giving
up the architecture and the skin below 6 and the protocol below 7, which is the same rule seen from
the other side: the nibble counts where it is small and is a floor at 8, and the arch 12 firmware
settles the real figure at twelve by copying twelve bytes.

**Field 4's high nibble is the architecture, now on three architectures.** That reading came from
four images spanning two, so `0x90` on a third is the test it had been waiting for.

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
| 4 | `0xe0` | `0xc0` | **the architecture** in the high nibble: 14 and 12. Low nibble the **software type** |
| 5 | `0x47` | `0x36` | skin, 71 and 54, which `bcdDevice` says independently |
| 6 | `0x0c` | `0x0c` | **the same on both**, so a constant. `0x0C` is 12, which is also the number of fields |
| 7 | `0x02` | `0x34` | **the version byte at program `0x000017`**, in the boot area |
| 8 | `0x00` | `0x34` | **the version of the image at `0xFF` `+0xE000`**, from `0x01E007` |
| 9 | `0x00` | `0x16` | **the version of the image at `0xFF` `+0x0000`**, by pairing, accessor unexplained |
| 10 | `0x02` | `0x34` | **the safe mode firmware's version**, from `0x001007` |
| 11 | `0x02` | `0x34` | **the running application image's own header version**, from `0x009007` |

That is six fields agreeing across two architectures, with the second remote differing in every one
of the values the reading predicts. Fields 2 and 3 are the 16-bit SPI read the firmware performs with
the chip select low, characterised as "the flash id" from the image alone; fields 0 and 1 are the
packed nibble shape the `SWAPF`, `ANDLW 0xF0`, `IORWF` sequence builds. So two of the six are
agreements between a disassembly and a device.

**Field 4's low nibble is the software type, and this document said it was a compiled in zero.**<!--superseded-->
It comes from its own `RETLW` accessor beside the architecture one, and the two are combined by the
same `SWAPF`, `ANDLW 0xF0`, `IORWF` shape as fields 0 and 1. Zero on all four application images and
**4 on the safe mode image of each bench remote**, whose other four accessors are byte for byte
identical to the application's. Logitech's firmware packages name the values in their own comments:
0 and 4 are "application mode or Safe mode", 1 is Test mode and 3 is Boot mode. The client names
all five independently: 0 application, 1 test, 2 minimal, 3 bootloader, 4 safe mode.
`docs/findings.md` section 87.

So the reply says which of a remote's four firmware personalities is answering. Both bench remotes
read zero because both were running their application. **The prediction, recorded before anyone
tries it**: a 600 in safe mode answers field 4 as `0xE4` and a One as `0xC4`.

**Fields 8 and 9 are both placed now, and by the thing this paragraph used to say did not exist.** It read: "`0x16` on
the One is the only value in the block that has no counterpart anywhere in concordance's output".
The counterpart is not in concordance's output, it is in the remote. Reading the One's internal
memory in full turned up three images carrying the `48 47` header, and the one at `0xFF` `+0x0000`
has `0x16` in its header's version byte. On the 600 that address holds no image, only zeros, and the
600's field 9 is `0x00`. Two remotes, a distinctive value in a block otherwise full of `0x34`, and an
absence matching an absence.

> **Corrected in section 59 of `docs/findings.md`.** The two paragraphs below place fields 8 and 9
> correctly and argue for them wrongly. Both rest on the Harmony 600 reporting `0x00` as an absent
> image answering zero, and on the 700 image those two bytes are `CLRF INDF0`, a compiled in
> constant. Arch 14 zeroes exactly the two fields that name images only arch 12 carries, which is
> consistent with the assignment but is not a measurement of it. Field 8 is now proved by the
> address its accessor builds, `0x01E007`, and field 9 by the three internal images pairing onto
> three fields with the other two proved. Field 9's own accessor is a table read whose address does
> not explain its value, and that is unresolved.

**Field 8 was settled the same way, by the two reads named as the test.** Both candidate addresses
were then read on the 600. It has an image at `0xFE` `+0x1000`, the safe mode one, 24320 bytes at
version `0x02`, and its checksum verifies. And it has **nothing at all at `0xFF` `+0xE000`**, which is
erased. Field 8 is `0x00`. So field 8 is the version of the image at `0xFF` `+0xE000`, and the
alternative is ruled out rather than merely unfavoured: if field 8 named the safe mode image, the 600
would report `0x02` there, and it does not.

**Fields 4, 5 and 6 come from compiled in literals, and that names field 4.** The version block's
accessors for them are five consecutive `RETLW` instructions, so their values are readable off any
image without running anything. On the 700 2.8 they are at `0x10648`, on the complete 600 0.2 at
`0x11964`, on the 650 0.4 at `0x138C8` and on the One 3.4 at `0x24262`, in the order field 0, field
4's low nibble, field 5, field 6, field 4's high nibble.

| Image | field 0 | field 5 | field 4 high | architecture |
|---|---|---|---|---|
| 700 2.8 | `0x28` | `0x42`, so skin 66 | `0x0e` | 14 |
| 600 0.2 | `0x02` | `0x47`, so skin 71 | `0x0e` | 14 |
| 650 0.4 | `0x04` | `0x48`, so skin 72 | `0x0e` | 14 |
| One 3.4 | `0x34` | `0x36`, so skin 54 | `0x0c` | 12 |

Three arch 14 images with three different firmware versions and three different skins all report
14, and the arch 12 image reports 12, so the byte tracks the architecture and nothing else. It also
matches the architecture each bench remote's own config states in base slot 1, on all three units.
That agreement is evidence rather than a tautology, because the accessor has exactly one caller and
the firmware never compares the constant against the config. Read as "protocol" until then;
`docs/findings.md` section 57.

Two predictions fall out for remotes nobody here has connected, and they are recorded now so that
connecting one is a test rather than a confirmation: a Harmony 700 should enumerate `bcdDevice`
`0x1066` and a Harmony 650 `0x1072`, since the skin is reported in binary here and in BCD there.

**What is still not claimed.** ~~Fields 7, 10 and 11 repeating field 0 is an observation, not a
reading.~~ **All three have readings now**, in section 59: field 7 is the version byte at program
`0x000017`, field 10 the safe mode firmware's, and field 11 the running application image's own
header. They agree with field 0 because they version four things a firmware release stamps
together, which is what this section already suspected and rightly declined to claim. It read:

> Three copies of the firmware version is a strange thing for a version block to carry, and the
> likelier explanation is that they version other components which happen to match. One candidate
> is now visible: the safe mode image at `0xFE` `+0x1000` carries the same version as the
> application on both remotes, `0x34` and `0x02`, so a field naming it would be indistinguishable
> from a field naming the application. That is exactly why nothing is claimed.

The candidate was the right one and the objection was the right objection. What answered it was not
a better comparison of values but the address the accessor builds, `0x001007`, which cannot be the
application on either architecture.

Concordance prints three things this block could plausibly carry that are still unplaced: firmware
type, the third component of the hardware version, and `IRL, ORL, FRL`.

### Internal memory: `0xFE` and `0xFF` are two pages, not one selector and a dud

**Corrected.** This section said, from a measurement, that "a `READ_FLASH` with top address byte
`0xFF` returns internal program memory; the same read with `0xFE` returns nothing at all". Both
halves of that are wrong, and they are wrong the other way round.

Measured again on the spare unprogrammed Harmony One, the same offset through both sub-selectors,
six offsets, 62 bytes each:

| Offset | `0xFE` | `0xFF` |
|---|---|---|
| `0x0000` | the reset vector, PIC18 code | a `48 47` image header |
| `0x0040` | code | data |
| `0x1000` | a `48 47` image header | erased |
| `0x8000` | code | erased |
| `0xE000` | erased | a `48 47` image header |
| `0xF400` | erased | 64 bytes of per unit identity |

**Every pair differs, and neither selector returns nothing.** They are two separate 64 KiB pages,
and the earlier reading came from a single read at offset zero through one selector, with the other
attributed a null result it never gave.

It is `0xFE` that maps one to one from program address zero, and what is there says so:

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

#### What the two pages hold

Three of the offsets probed carry the **`48 47` image header this project already parses**, the one
`src/harmony/firmware.py` reads at offset 8. So they are not loose code, they are packaged images,
and `firmware.parse_header` reads all three without complaint:

| Image at | size field | version | entry point |
|---|---|---|---|
| `0xFE` `+0x1000` | 45348 | 3.4 | `0xC0C4` |
| `0xFF` `+0x0000` | 8430 | 1.6 | none in the header |
| `0xFF` `+0xE000` | 626 | 3.4 | none in the header |

The `0xFF` `+0xE000` one opens with a run of `BRA` instructions, which is a jump table, so it is a
callable library rather than a standalone program.

**The `0xFF` page holds a 64 byte identity block at `+0xF400`**, confirmed on three remotes across
both architectures, and everything else from `0xF000` to
the `0xFFC0` bound is erased apart from four bytes at `+0xF580` and an eleven byte record at
`+0xF640`. The identity block is four 16 byte fields:

```
+0x00  the unit serial, all 0xEE on this remote, which is the unprogrammed spare
+0x10  a GUID
+0x20  a GUID
+0x30  sixteen zero bytes
```

**Closure, and it is a strong one.** `concordance -i` prints three GUIDs for a connected remote, and
the lab holds that output for this exact unit from months earlier. All three appear in this block, in
the same order, at `+0x00`, `+0x10` and `+0x20`, the latter two in mixed endian byte order. So an
address predicted in advance returns three values obtained without this code, in order. The values
themselves are not published here, per `CLAUDE.md`: a remote's serial GUIDs are personal data.

That the first field is `0xEE` filled is itself consistent. This is the never programmed spare, and
`concordance -i` reports its serial as all E's, so both readers of that location agree it is unset.

#### A second prediction, for the Harmony 600, before reading it

Everything above is one remote and one architecture, so it predicts the other. Arch 14 differs where
it matters most: the application runs from **internal** flash with an exec base of `0x9000`, where
arch 12 runs from external NOR. So if the paging is the same, the 600's own firmware is inside this
window and readable.

| Predicted | Why it is worth writing down |
|---|---|
| `0xFE` maps from program address zero, with the three PIC18 vectors | the paging is a property of the command, not of the model |
| an identity block at `0xFF` `+0xF400` holding the three GUIDs `concordance -i` reports for that unit | same offset as the One, which the arch 12 result alone cannot establish |
| `0xFE` `+0x9000` onward is the 600's application firmware | arch 14's exec base, already established from its image |

The third one carries a check worth more than the other two together. The lab holds a dump of the
600's firmware made by other software months ago, `600-0.2-code-base0x9000-TRUNCATED64k.bin`, which
covers program `0x09000` to `0x19000`. **65536 bytes have to match byte for byte.**

And if they do, the 4800 bytes concordance never returned, program `0x19000` to `0x1A2C0`, come back
with them. That is one of the open items at the end of this document, and it would be closed not by
trusting this read path but by 65536 bytes of it agreeing with an answer obtained without it.

Reads needed: 462 through `0xFE` and 674 through `0xFF`, at 62 bytes each.

#### The 600, measured, and the firmware that came with it

All three held.

| Predicted | Measured |
|---|---|
| `0xFE` maps from program zero, PIC18 vectors | `84 ef 07 f0` at `0x0000`, `00 ef 4a f0` at `0x0008` |
| identity block at `0xFF` `+0xF400`, three GUIDs from `concordance -i` | all three present, at `+0x00`, `+0x10`, `+0x20` |
| `0xFE` `+0x9000` is the application firmware | a `48 47` image header, exactly there |

So the paging is a property of the command rather than of the model, and **the identity block sits
at the same offset on both architectures**, which one remote could not have established. One
difference worth recording rather than explaining: the One's second and third GUIDs match in mixed
endian byte order and the 600's in big endian.

The firmware read follows from the third row. 1136 reads of 62 bytes, five seconds, program `0x09000`
to `0x1A2C0` across both pages. Against the truncated dump made by other software months earlier:

```
0xFE page vs dump    28670 bytes compared, 28670 identical, 0 differ
0xFF page vs dump    36864 bytes compared, 36864 identical, 0 differ
unreachable          2 bytes, program 0x0FFFE and 0x0FFFF, the offset clamp
```

**65534 of 65536, no differences**, and the 4800 bytes concordance never returned arrive with them.
The image's own header checksum then verifies over all 70336 bytes, where the truncated file verifies
at no candidate length. `docs/findings.md` section 23.

The two unreachable bytes are a protocol fact worth stating on its own: the firmware clamps the read
offset at `0xFFC0` and a 62 byte read from there ends at `0xFFFD`, so **the last two bytes of each
page cannot be read** by this path. They came from the truncated dump instead, and they are inside
the checksum that verifies.

#### A third prediction, for the second Harmony One

The One's internal dump rests on its own three checksums and nothing else, because arch 12 keeps no
copy of that memory in any package. A second Harmony One running the same firmware would supply what
the 600 had all along: an independent copy.

Written down before it is attached.

| Predicted | What it would settle |
|---|---|
| both pages byte identical to the spare's, **except** the identity block at `0xFF` `+0xF400`, the record at `+0xF640` and the four bytes at `+0xF580` | that the pages are firmware, not per unit state |
| its own three GUIDs from `concordance -i`, at `+0x00`, `+0x10`, `+0x20` | the identity block on a third unit |
| version block fields 8 and 9 both unchanged, `0x34` and `0x16` | that field 9 tracks the image and not the unit |

The first row is the one with teeth, because it predicts an exact set of exceptions. Anything
differing outside those three regions falsifies "this is the firmware" and means part of what was
read is per unit state that happens to look like code.

One thing it cannot settle: whether the serial field is genuinely unused. It is `0xEE` filled on the
spare One and on the 600, and the spare has never been programmed, so a programmed unit with a real
serial there would be informative and a third `0xEE` would make it look like a field nobody writes.

#### The second One, measured

| Predicted | Measured |
|---|---|
| both pages identical except three regions | `0xFE` identical over all 65534 bytes; `0xFF` differs in **39 bytes and nowhere else** |
| its three GUIDs at `+0x00`, `+0x10`, `+0x20` | all three, same offsets, same mixed endian order as the spare |
| fields 8 and 9 unchanged, `0x34` and `0x16` | the version block is identical to the spare's, byte for byte |

The 39 differing bytes are 32 inside the identity block, two at `+0xF582` and seven at `+0xF643`,
which is the predicted set of exceptions and nothing outside it. So **the internal pages are
firmware**, and section 23's caveat that the One's dump had no second copy to check against is
answered: it has one now, another physical remote.

Two things fell out of it.

**The serial field is one nobody writes.** It is `0xEE` filled on all three remotes now, including
both programmed ones, so the earlier reading that a blank meant "never programmed" was wrong: the
spare being unprogrammed had nothing to do with it. The GUIDs that do carry values are the second
and third.

**Their byte order tracks the architecture.** Both Harmony Ones store the second and third GUID in
mixed endian and the Harmony 600 stores them big endian, which one remote per architecture could not
have separated from a per unit quirk.

#### The arch 12 flash map, read end to end

Asked whether the operational One's firmware had been downloaded, the honest answer at that point was
no. Everything read so far was **internal** memory, and on arch 12 the application does not run from
there: it runs from external NOR at `0x020000`. That address is inside the range `READ_FLASH` accepts,
top byte below `0x20`, and it had simply never been asked for. Every config read had gone to
`0x040000`.

It reads. The whole of the One's low flash, measured on the operational unit:

| Flash | Contents | Checked against |
|---|---|---|
| `0x000000` to `0x010000` | the safe mode region, with a `GSPM` container at `0x002000` | that unit's own `--dump-safemode`, **65536 of 65536** |
| `0x010000` to `0x020000` | erased, all `0xFF` | |
| `0x020000` to `0x02EA92` | the application firmware, 60050 bytes, version 3.4 | the image decoded from the 3.4 `.hfw`, **60050 of 60050**, and its own header checksum |
| `0x02EA92` to `0x040000` | erased, all `0xFF` | |
| `0x040000` onward | the user config, 1672832 bytes | that unit's own `.EZHex`, **1672832 of 1672832** |

So the firmware running on the remote is bit for bit the firmware in the archived package, which is
worth having on both sides: it confirms the read path over 60 KiB against an answer obtained without
it, and it confirms that the archived package is what the device is actually running.

**One number in that table came from a mistake worth recording.** The safe mode comparison first
reported 13586 differing bytes. `concordance --dump-safemode` starts at flash zero and the read
started at `0x002000`, so two windows 8192 bytes apart were laid on top of each other. Reading the
same region as the dump gives 65536 of 65536. Nothing was wrong with either the dump or the read, and
a mismatch whose first difference is at offset zero should have suggested alignment before corruption.

#### Every bench remote, checked against its own backups

The question this answered was whether there is enough on disk to restore these remotes if something
goes wrong. A directory listing cannot answer it, so each stored file was read back off the device it
came from and compared. All three units, read only:

| | user config | application firmware | safe mode region | internal pages |
|---|---|---|---|---|
| One, operational | 1672832 of 1672832 | 60050 of 60050 | 65536 of 65536 | both, complete |
| One, spare | 1232237 of 1232237 | 60050 of 60050 | 65536 of 65536 | both, complete |
| Harmony 600 | 738149 of 738149 | 70336, own checksum | the image at `0xFE` `+0x1000`, own checksum | both, complete |

No differences anywhere. The two Ones run bit for bit the same application firmware as the archived
3.4 package, and the same `0xFE` internal page as each other.

Three things this changes, none of them about bytes:

* **A backup nobody has compared against the device is an assumption.** These are not assumptions
  now. That is a different statement from "the files exist", which is all that could be said before.
* **The 600's recovery file was the wrong file**, see `docs/findings.md` section 23, and only a
  comparison against the device could have shown it.
* **Restoring is still untested.** Nothing has ever been written to a remote and the flash write data
  path does not exist, so every one of these backups is verified as a *copy* and unverified as a
  *restore*. That gap is procedural rather than a gap in the data, and it is why the spare is the
  only write target when writing arrives.

#### How the prediction did

Recorded above before any of this was read:

| Predicted | Outcome |
|---|---|
| `0xE000` a library or support image | **confirmed**, an image header and a jump table |
| `0xF400` a per unit identifier, 64 bytes | **confirmed**, exactly 64 non-erased bytes, three known GUIDs in it |
| `0xF640` a manufacturing identifier, 64 bytes | **partly**: a record is there, but eleven bytes, not 64, and unidentified |

Three offsets named in advance, in a region that is otherwise erased for four kilobytes around them,
all three holding non-code data. The eleven bytes at `+0xF640` are `09 00 20 11 02 18 e0 3c 00 67 01`
and nothing in the corpus explains them yet.

**`MCU_ID` is not reachable this way.** The conclusion survives the correction above but its reason
changes, so both are stated. The address is 24 bits with the top byte spent on the selector, and the
firmware bounds the remaining 16 to `0xFFC0`. That was read here as a single 64 KiB window; it is two,
one per sub-selector, so **128 KiB is reachable, not 64**. A PIC18 keeps its device id at `0x3FFFFE`,
outside either. So the arch 12 part number stays inferred and the route to measuring it is still not
this one, but the window is twice the size this document claimed.

A consequence worth naming: 128 KiB of internal memory is now readable in full, at 62 bytes a read.
That is the internal half of the complete firmware dump on the open list below, and it is a matter of
about two thousand reads rather than an unknown.

#### A prediction about three offsets inside that window, written down before reading them

What has been read of this region so far is its first 62 bytes, which is why it has been described
as "whatever bootstraps the application" and nothing more. The window runs to `0xFFC0`, and the
hypothesis under test is that the top of it is not code at all but per unit data:

| Offset | Predicted contents |
|---|---|
| `0xE000` | a library or support image, distinct from the bootstrap at zero |
| `0xF400` | a per unit identifier, 64 bytes |
| `0xF640` | a manufacturing identifier, 64 bytes |

Recorded in advance because one of these has an answer obtained without this code: `concordance -i`
prints a `Serial Number` for the connected remote, and the lab holds that output for this exact
unit, taken months earlier. So `0xF400` either matches a value nobody derived from here, or it does
not.

If it does hold, then the `MCU_ID` negative result above needs re-examining. Not because the device
id moves, but because "the reachable window is application bootstrap code" would turn out to be an
assumption made from one 62 byte read at offset zero rather than a fact about the window.

The offsets themselves are a hypothesis and are not derived here. They are worth testing rather
than arguing about, since a read costs nothing and the answer is checkable.

**A read of this region can restart the remote.** Found by accident, then reproduced deliberately on
the spare unprogrammed Harmony One, with the owner watching the device restart, so it is the device
resetting and not a host artefact.

| Read | Result |
|---|---|
| 63 bytes at `0x1000` | **restarts it, 3 of 3**, wherever it sits in a sequence |
| 63 bytes at `0x0040` | the transfer completed, and the remote died immediately afterwards |
| 63 bytes at `0x0000` | fine, twice |
| 64 bytes at `0x1000` | fine, twice |
| 124 bytes at `0x1000` | fine, twice, and that is two full chunks |

Three things are ruled out by that table. It is **not the ordering**, because the failing case fails
last as readily as first. It is **not the chunk count**, because 124 bytes is two chunks and is fine.
And it is **not the size 63 by itself**, because 63 at offset zero is fine.

What 63 has that 64 and 124 do not is **a final chunk of exactly one byte**. Offset zero is somehow
exempt from it. Beyond that this is not diagnosed, and five restarts is enough hardware to spend on
one question that has a cheap workaround.

Every restart recovered on its own, and afterwards the config read back byte-identical to its dump
across three separate windows. So this is disruption rather than damage. `packages/usb` refuses an
internal read of more than one chunk, which is a cap rather than a fix, and 62 bytes at a time is
enough for what this region is wanted for. Worth stating plainly for anyone building on this: **every
command involved was a read**, and reads of this region still restart a running remote.

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
* **GET_VERSION's block is twelve fields**, by two independent counts. **Eleven of the twelve now
  have a reading**, from sections 57 and 59 of `docs/findings.md`: field 4 is the architecture, from
  a compiled in literal in four images, and fields 7, 10 and 11 are version bytes at program
  addresses the accessors state outright. Only **field 6** has no reading, and only **field 9's
  accessor** is located without explaining its value.

### The Harmony One drops its first command, sometimes

Observed twice on 6 August 2026, both times on a Harmony One, both times the first command after the
device was opened:

| Command | Symptom | Immediately afterwards |
|---|---|---|
| `READ_FLASH`, 256 bytes at `0x040000` | `flash read returned 0 of 256 bytes` | the same test passed, and a 60050 byte firmware read passed in the same run |
| `GET_VERSION` | `no reply to command 0x10 within 3 polls of 2000 ms` | a rerun read the whole 1232237 byte config without a hiccup |

**The Harmony 600 has not done it**, on either occasion, including runs where its first command came
before the One's. So the honest statement is about the One, not about remotes in general.

What can be said: the failure is **silence, never a wrong answer**. No case has produced bytes that
turned out to be incorrect. What cannot be said is why. Candidates nobody here has separated: a wake
from sleep, since the One has a rechargeable cell and a screen where the 600 runs on AA cells; a
first-read-after-open effect in the host stack; or an idle timeout rather than anything to do with
opening at all. Two observations do not distinguish them, and the experiment that would, opening the
device repeatedly at measured intervals, has not been run.

The workaround is one retry of the **first** command only, and only on silence, in
`packages/corpus`. Everything after the first command stays strict: widening the retry would be more
than the evidence supports and would turn a genuinely failing transfer into an intermittent success,
which is the worst property for the code that files backups. The same rule, with the same two
message shapes, is in `packages/usb/test/hardware.test.ts`.

### Still open

* **Why the One drops that first command**, per the section above. Capped rather than understood,
  which is the same shape as the internal-read restart below.
* **What fields 7, 10 and 11 are versions of**, given that they repeat field 0 on both remotes.
  Concordance prints firmware type, the third component of the hardware version, and `IRL, ORL,
  FRL`, none of which is placed. *Fields 8 and 9 were on this line until they were placed: field 9
  versions the image at `0xFF` `+0x0000` and field 8 the one at `0xFF` `+0xE000`, both `0x00` when
  the image is absent, with the 600 as the negative case for each.*
* **Why a one byte final chunk on the internal memory path restarts a remote, and why offset zero is
  exempt.** Narrowed to that by experiment, capped rather than understood.
* ~~Another route to `MCU_ID`.~~ **Closed as unreachable rather than answered.** The internal window
  is two 64 KiB pages and a PIC18 keeps its device id at `0x3FFFFE`, outside both, so there is no
  route through this command set. The arch 12 part number stays inferred. `docs/findings.md`
  section 22, and section 25 for the weak corroboration that it is a 128 KiB part.
* Whether the length nibble mapping differs in safe mode, which is a separate firmware.
* Whether `0x28`, GET_VERSION's code, means anything in its low nibble. It is not a payload length:
  it would say 15 where the firmware copies 12, and the acknowledgement shows the nibble is not a
  length for every response.

## Corroboration used, after the fact

* `USB_PACKET_LENGTH 64` in libconcord's hidapi backend agrees with the 64 byte reports.
* libconcord matches Harmony remotes by vendor `0x046D` and a product id **range**,
  `0xC110` to `0xC14F`, rather than by exact id, so it cannot corroborate or contradict the
  600 and 700 sharing `0xC122`. Our own descriptor read is the better evidence.
