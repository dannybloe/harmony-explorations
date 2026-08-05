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

| | Harmony One 3.4 | Harmony 700 2.8 |
|---|---|---|
| Descriptor block at | `0x2E38E` | `0x1B7C6` |
| USB version | 2.00 | 2.00 |
| Vendor and product | `046D:C121` | `046D:C122` |
| `bcdDevice` | `0x1054` | `0x1066` |
| Interface class | 3 (HID), subclass 0, protocol 0 | same |
| Control endpoint packet size | 8 | 8 |
| Endpoint 1 | interrupt IN, 64 bytes, 1 ms | same |
| Endpoint 2 | interrupt OUT, 64 bytes, 1 ms | same |
| Report descriptor | 33 bytes at `0x2E42D` | 33 bytes at `0x1B865` |
| Product string | `Harmony Remote 0-3.4.0` | `Harmony Remote 0-2.8.0` |

Read it with:

```sh
tools/usbdesc.py 700-2.8-Region_2-code-base0x9000.bin 0x9000 --raw
```

### What a host implementation has to get right

* **The endpoint numbering is asymmetric.** IN is endpoint 1, OUT is endpoint **2**. The
  device descriptors say `81 03 40 00 01` and `02 03 40 00 01`, so this is not a symmetric
  pair and code that assumes endpoint 1 in both directions will not talk to the remote.
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

Prediction, which is cheap to check and not yet checked: the Harmony 600 should report
`bcdDevice 0x1071`, because that remote is skin 71. Its firmware dump is truncated before
the descriptor block, so this needs either a complete dump or a look at the live device's
descriptors.

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

### Still open

* Which `MISC` items the firmware services, and in particular whether `MISC_RAM` reads work
  in normal mode, which is what would give live RAM of a running remote over USB. The
  selector is `0xED3` and its consumers are around `0x0CA00` to `0x0CC00`.
* Whether `MISC_QUEUE_ACTION` and `MISC_QUEUE_EVENT` exist, which would allow driving the
  remote from the host.
* The response layout of each command, which means reading the main loop's state handlers
  rather than the parsers.
* The request layout of GET_VERSION, READ_FLASH, WRITE_FLASH, ERASE_FLASH and START_IRCAP,
  each of which is a few instructions in the same shape as READ_MISC above.
* Whether the length nibble mapping differs in safe mode, which is a separate firmware.

## Corroboration used, after the fact

* `USB_PACKET_LENGTH 64` in libconcord's hidapi backend agrees with the 64 byte reports.
* libconcord matches Harmony remotes by vendor `0x046D` and a product id **range**,
  `0xC110` to `0xC14F`, rather than by exact id, so it cannot corroborate or contradict the
  600 and 700 sharing `0xC122`. Our own descriptor read is the better evidence.
