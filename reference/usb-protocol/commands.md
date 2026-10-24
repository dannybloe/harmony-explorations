# Commands

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
* state 2, a flash write in progress: a second, two entry chain handling `0x40` and `0xF0`, at
  `0x0C55C` on the 700, `0x0C4C0` on the 600 and `0x26752` on the One. (This said `0x0BD5C`, which is the `SUBWF` that
  compares the command against `0xE0` in the escape handler, four instructions before the state gate.
  The description was right and the citation named the wrong routine, which nothing caught because no
  test read the address. Section 175.)
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
in firmware, arch 9 included. And the samples **do** reach the host during a session: this feature
was used here with the classic software and the client recognised a received code immediately,
which is a first hand account rather than a measurement and is still the best evidence available.

**What no search has found is the sender.** No state body emits `0x90` on either architecture, 10
states on the One and 70 on the 700; the byte at a time sender's 32 callers all lie in the command
response region; and the response buffer's pointer and counter are touched only inside the USB
transport layer. The capture driver touches none of it. So an assumption in that search is wrong,
and section 91 lists the candidates. The report layout the client expects is in
`reference/logitech/clients.md`, marked unconfirmed.

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

**Arch 12 has the escape too**, at `0x26434`, with sub-commands `0x01`, `0x02` and `0x03` and
without `0x05`. It is easy to miss because it tests with `SUBWF` where arch 14 uses `XORLW`, so it
is not an XOR chain and does not turn up in a search for one. An unrecognised sub-command falls
through into the ordinary command chain on both architectures rather than being rejected.

**What the sub-commands do**, section 97, from the firmware on both bench architectures:

| Sub-command | Effect | One 3.4 | 700 2.8 |
|---|---|---|---|
| `0x01` | clears the command state variable and invalidates the parsed address. **Not a reset.** | `0x2645A` | `0x0BD82` |
| `0x02`, `0x03` | sets a flag that drives the top level mode to 3, which waits and then executes the PIC18 `RESET` instruction | `0x26468`, `RESET` at `0x28D4C` | `0x0BD92`, `RESET` at `0x1642C` |
| `0x05` | arch 14 only, an internal continuation | absent | `0x0BDA0` |

So the reset Logitech's client sends after a config write really does reboot the remote, and there
is exactly one gentler operation, which ends the command session and changes nothing else. Neither
takes a remote out of USB mode, which is what section 95 wanted.

### `WRITE_MISC` selector `0x0A` is the restart command

Entry point in the first byte after the selector, configuration type in the second, which is the
same field order as every other selector's 16 bit address. **On arch 12 it does nothing at all**,
along with selectors `0x05`, `0x08` and `0x0B`. On arch 14 it acts for entry points `0x05`, `0x07`,
`0x08`, `0x09` and `0x0A` and does so by pushing two action list instructions into the interpreter,
operand then opcode, at `0x1AD` through `0x1AF`:

| | operand | opcode |
|---|---|---|
| first | the entry point, high byte `0xB0 \| (configuration type & 0x0F)` | `0x3F` |
| second | `0xFFF4` | `0x07` |

Every other entry point, including terminate, is acknowledged and ignored. `reference/logitech/clients.md`
carries the client's entry point names, whose order the firmware confirms.

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
all: after WRITE_FLASH sets state 2, the data arrives as `0x40` packets handled in the USB callback,
and the reply comes from **state 3**, which `0xF0` moves the remote to and whose executor answers
`0xF0 0x30`, verified on the Harmony One at `0x26A9C` and on the 700 image at `0x0C95C`. The write
data path has its own section below.

And **START_IRCAP branches straight to `0x0D2E0`**, which is the shared response
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

**On arch 9 the granularity is 64 KiB and the sector size is not the only thing the host does not
choose**, section 267. The handler at `0x02F72` switches on the window tag the address classifier
assigns, so one command byte erases three different media: tag `0x00` erases the running firmware's
own internal program flash through `EECON1`, tag `0x20` is a no operation on the EEPROM that
reports success, and tag `0x80` reaches the serial flash and sends the SPI opcode `0xD8`, a 64 KiB
block erase. **Nothing bounds the external arm below the part.** The classifier accepts tags `0x80`
to `0x87` and subtracts `0x80` out of the address, which is exactly the 512 KiB the Harmony 525
carries in eight blocks, so an erase can reach the safe mode image at `0x800000` and the application
firmware at `0x810000` as easily as the configuration. Arch 12 has section 192's classifier ceiling
and section 175's bit doing part of this work in the remote; arch 9 has neither, and
`packages/usb/src/rails.ts` is the only thing in the way.

**The arch 9 granularity is measured on hardware since 6 September 2026**, section 269, where it was
firmware sourced and corroborated by concordance's chip table before that. One block at `0x820000` was
erased and rewritten on the bench Harmony 525 and the blocks either side, `0x810000` and `0x830000`,
are byte identical before and after. So a 64 KiB request is a 64 KiB erase on this part, which is the
claim the paragraph above needed and could not make: the first of those neighbours is the running
application firmware, so on arch 9 the block size being right is what stands between a config erase
and a firmware erase.

**The full write sequence was not sent and does not have to be on this architecture.** Section 245's
eight steps include dropping the remote's cached region descriptors before the erase and restarting it
afterwards. Neither was sent here. The cache drop matters on arch 12 because that remote executes its
configuration in place out of the flash being erased; arch 9 keeps its configuration on a serial chip
that is not memory mapped, and the remote stayed on the bus through the whole sequence, which the read
back over the same connection is what proves. The restart is refused anyway, because arch 9 has no
`ESCAPE_SUB_COMMANDS` row: nothing has read its escape dispatcher.

**Arch 9's WRITE_FLASH data phase is one whole SPI transaction per byte**, `0x031CE` through
`0x0758E`: a write enable, a three byte address, one data byte, a status poll and a write disable,
repeated. So there is no page boundary for a caller to respect and no partially filled page to
flush, and the cost is a round trip to the part for every byte written.
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
| `0x0C` | `0x0CC02` | **the hardware feature read**, two details and no more. See below |

Anything else falls through the chain.

**Selector `0x0C` is a hardware feature read, and it was "not read yet" here until 29 August 2026.**
Logitech's classic client named it: it passes a detail number, calls detail 0 a hardware flag and
masks it to bit 0, and calls detail 1 the battery level. The firmware agrees, on all three images,
`docs/findings.md` section 212:

| detail | what the firmware does | width |
|---|---|---|
| 0 | clears the reply's high byte and returns one byte of data memory, `0x9FF` on the 700, `0x3FF` on the 600 and `0x32D` on the One | 8 bits |
| 1 | calls a routine and returns `PRODH:PRODL`, `0x0FBE6` on the 700, `0x11184` on the 600 and `0x2372A` on the One | 16 bits |
| 2 and above | **nothing** | stale |

**The third row is the one to build a rail on.** The body writes its two reply bytes only inside an
arm, so a detail nobody implemented does not fail and does not answer: it returns whatever the
previous command left in those two locations, which on the wire is indistinguishable from a real
value. `packages/usb/src/protocol.ts` names the two details as constants for that reason.

The client exposes the battery reading on arch 12 alone. **Both arch 14 images implement it
identically**, so the restriction is a product decision of theirs and not a capability, and this
project has asked no remote for either value yet.

**Selector `0x07` is an arbitrary data memory read:**

```
0cbf4: ce ce e9 ff MOVFF 0xece,FSR0L
0cbf8: cf ce ea ff MOVFF 0xecf,FSR0H
0cbfc: ef cf 64 fd MOVFF INDF0,0xd64
```

The 16-bit parameter becomes `FSR0` and the byte at that data address is what comes back. So
**live RAM of a running remote is readable over USB**, which is the capability
`docs/plans/002-the-roadmap.md` wants in place of the deferred emulator.

**What it is actually good for is narrower than this section first claimed**, and it took two
measurements to bound. A remote on USB is in USB mode, so its interface cannot be driven by hand and
the button mapping experiment is not reachable this way: the keypad scanner never runs, section 48. On
**arch 14** the config is not loaded either, so no per subsystem variable holds anything, section 110.
On **arch 12** it is loaded, section 111, so a variable a config should have filled can be read: a
connected Harmony One's display light band, saved state and cached level agree with each other through
its own base slot 15, and its clock is ticking. Its analogue sampler is stopped, though, so anything
downstream of a measurement is frozen at whatever the last normal mode pass left.

**The special function registers answer on arch 12 as well**, which is worth stating because it is a
whole address range and because arch 9 answers zero for all of it. Measured on the spare One on 10
August 2026: `UCON` `0x08`, `PORTA` `0x29`, `PORTC` `0xB8`, `LATC` `0x37`, `T1CON` `0x1F`, and
`TMR1H:TMR1L` advancing between reads. `UCON` is the positive control, since a part driving USB cannot
have it zero.

**That is an arch 12 and arch 14 fact, and arch 9 does not have it.** Measured on the bench Harmony
525 on 9 August 2026: the selector is accepted, the reply is a well formed `0xC2` echoing `0x07`,
and the byte is **zero for every address**, over 1696 of them spanning six general purpose banks and
the special function register page. The calibration is the same sweep on a 600 and a One, which
return live data in the same banks, and the giveaway is that the 525 reports `PORTC` as zero while
it is driving USB. **Arch 9's `READ_MISC` executor is located and read**, section 137: only selector
`0x01` has a body and every other selector emits two bytes the firmware has just cleared, which is why
the sweep returns zeros. Selector 1 does answer, and this project read it as zero for a year because
the reply carries its value in the byte after the one the decoder took. This paragraph said the body
was not located and the behaviour was open. `docs/findings.md` sections 90 and 137.

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
`0x0B`. Three of them settle open questions, and `0x02` was added to the identified ones by section
246, which read it before this project sent it. **Arch 12 services eight**, the same list without
`0x09`, decoded from its own chain at `0x26626`.

**Selector `0x07` writes RAM**, exactly mirroring the read:

```
0c414: 5e cd e9 ff MOVFF 0xd5e,FSR0L
0c418: 5f cd ea ff MOVFF 0xd5f,FSR0H
0c41c: 61 cd ef ff MOVFF 0xd61,INDF0
```

So an arbitrary byte can be written into the data memory of a running remote over USB. It is not
a flash write and nothing survives a power cycle, but it is a write to a live device and this
project is read only, so it belongs in the rails rather than in the toolkit. See
`docs/plans/002-the-roadmap.md`.

**Selector `0x09` is accepted and does nothing:**

```
0c440: 0d 01       MOVLB 0xd
0c442: 01 0e       MOVLW 0x01
0c444: 02 6f       MOVWF 0xd02      ; just the "packet handled" flag
0c446: 42 d0       BRA 0x0c4cc      ; and out
```

**And `0x03` is not in the chain at all.** libconcord's header names `MISC_QUEUE_ACTION` as
`0x03` and `MISC_QUEUE_EVENT` as `0x09`. On the strength of those names, arch 14 does not
implement action queueing<!--superseded--> through `WRITE_MISC`, and implements event queueing as a
no-op that reports success. **Corrected by section 326**: the action queue is reachable another way,
command state `0x34`, in the table of the version request's payload family above. What stays is
that **there is no event injection here**: a key event cannot be queued from the host, so the button
mapping experiment has to be done by hand at the keypad, as the roadmap already assumed. This said
"driving the remote from the host is not available"<!--superseded--> until section 326, which
generalised the missing selector into a missing capability.

That conclusion carries the same caveat as everywhere else in this document: the names are
upstream's, and upstream's `MISC_RAM 0x06` was already wrong for this architecture. What is
established from the image is that `0x09` is a no-op and `0x03` is unhandled. Which capability
those two numbers were meant to be is upstream's claim, not a finding here.

**Selector `0x02` drops three cached region descriptors, and it is not a flash operation at all.**
Section 246, read on arch 12 where the chain is at `0x26626` and this selector's executor at
`0x266B2`. It calls `0x2A05E`, which walks three five byte records in **data memory** based at
`0x0EE8`, clears bit 0 of each, zeroes the other four bytes, and through a leaf at `0x27C62` zeroes a
two byte entry each in a second table at `0x0F24`; the handler then clears bits 2 and 3 of the flags
byte at `0x1A4`. Nothing in that call graph reaches a flash gate, checked with a positive control from
the erase handler, which does. The neighbouring routine `0x2A0C8` walks the same records and
decrements a three byte counter in each, so bit 0 is what makes a descriptor live.

**On arch 14 it drops four, and it arms the next erase for one extra step**, section 282, read on the Harmony 650's own
0.2 build and byte identical on the Harmony 600's. The chain is at `0xC314` and selector `0x02` at
`0xC344`. It calls `0x15E1E`, the same walk over **four** five byte records at `0x0EE6`, with a leaf
at `0x107A2` zeroing a two byte entry each at `0x063`; then clears bits 2 and 4 of the flags byte at
`0x68B`, which are the verdict and the container select bit of section 252, and writes 1 to `0x725`.
That byte has its reader in `ERASE_FLASH`'s parse handler at `0xC240`: the first erase after a drop
clears it wherever it is, and only if that erase is at exactly `0x030000`, the configuration's first
block, does it read setting
`0x80` from the **settings store** in internal program memory at `0x01EC00`, clears its bit 0, and
writes it back. The erase itself goes ahead the same either way. The store is two 1 KiB blocks used
one at a time, each a header and then two byte records, setting and value, appended in order; a
write that changes nothing writes nothing, a full block is copied into the other, and both are
erased only when that copy frees nothing, after which the store holds a bare header and the one
record, every other setting lost. So the drop writes nothing persistent, and what it arms can reach internal
program memory, two blocks below the identity block and never it. **Sent to the Harmony 650 on 27
September 2026**: `0x68B` went from `0x16` to `0x02` and `0x725` from 0 to 1, as read.

concordance names it `invalidate_flash` and sends it as the first step of a config write, "so that
nothing will attempt to reference it while we're working". The purpose is right and the name is not,
which is the third time an upstream selector name has been wrong for this architecture.
`MISC_INVALIDATE` in `packages/usb/src/protocol.ts` carries the correction.

**Sent to a Harmony One on 3 September 2026**, section 247, as the first step of a two block config
write. The remote accepted it, the write completed, and afterwards the remote no longer asked to be
synced with Logitech's website, which every previous write on this bench had left it doing until its
battery came out. That run also sent the reset escape at the end, so the control came next, section
248: the same container written again with this selector and **no** reset left the ordinary screen as
well. So this selector is what closes that symptom, and those same bytes written without it had asked
for a sync every time.

Selector `0x06` pairs with the read's `0x06`, calling `0x1AB96` where the read calls `0x1AB8A`.
**It is the update status byte**, section 298: `0x1AB96` stores the value into data memory `0x100`
when the index is 0, and `0x1AB8A` returns `0x100` when its index is 0 and 0 otherwise. This said it
was "a second address space of some kind" and not identified, until that reading.

**On the Harmony 700's 2.3 safe mode image it is the update status byte**, section 295, and it does
not take the shape the table above gives. The parser reads the packet's bytes in order into `0xD09`,
`0xD0B`, `0xD0A`, `0xD0D` and `0xD0C`, the chain sends 6 to `0x039B6`, and that arm takes `0xD0B` as a
one byte index and `0xD0A` as a one byte value, so the value is the packet's **third** byte after the command byte, the fourth in all, and a
sixteen bit address and value would store the address's low byte. Index 0 is data memory `0x100`.
Logitech's `firmwareupgrade.xml` for skin 66 sends `A3 06 00 02`, reads it back with `B2 06 00`, reply
`C2 06 02`, and restarts the remote with the escape's `0x02`; at start up the safe mode image's
install routine at `0x02B90` copies the application staged at external `0x000000` into internal
`0x9000` when the byte is 2 or 6, clamped to `0x15C00` bytes, and stores 0 back. `updateStatusWriteRequest`
and `updateStatusReadRequest` in `packages/usb` build those bytes, and `requestFirmwareReinstall` sends
them behind `assertReinstallAllowed`. **Sent to a Harmony 700 in safe mode on 29 September 2026** and
it installed its own staged application and came back running it. The Harmony 600's and Harmony 650's
0.2 safe mode images carry the routine's status normalisation, once each, inside a routine at
`0x01A80` called from `0x0107E`; their selector 6 handlers and every safe mode image's escape handler
are unread.

**On the Harmony 700's 2.5 application it is the same byte**, section 297: the selector chain at
`0x0C314` sends 6 to `0x0C364`, which moves the packet's third byte, as `0xD5F`, into `0x102` and its
fourth, as `0xD5E`, into `0x103`, and calls `0x19868`, which stores `0x103` into `0x100` when `0x102`
is 0. So `A3 06 00 02` means the same to the running application as to the safe mode image, which is
what Logitech's template assumes when it sends it in either mode. **Sent to that application once**,
with the escape's `0x02` after it, and the safe mode image installed the staged 2.8 at the restart;
and section 298 reads the 2.5 application's escape handler, the same code as 2.8's at other
addresses. On 2.8 the arm is at `0x0C400` and calls `0x1AB96`, the same five instructions.
`tests/test_harmony_700_status_byte.py`.

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

**Arch 9's address space is a set of tagged windows and only one of them is flash**, section 119. The
validator is an `XORLW` chain and the flash range test is its default arm, so four windows sit above
it: `0x00` is 32 KiB of internal program flash, `0x20` is 256 bytes of **on chip EEPROM**, `0x40` is
2048 bytes of **data memory**, and `0x30` is eight bytes whose read arm fetches nothing. Every bound
is a documented size of the PIC18F4550. `ARCH9_WINDOWS` in `packages/usb/src/protocol.ts` carries
them with those bounds enforced, and reading three of them is new: the library refused them while the
firmware served them. The EEPROM one is what concordance writes to in order to finish a firmware
update, and its byte 0 is the bootloader's image selector.

**Data memory at tag `0x40` is a second route to RAM on arch 9**, distinct from `READ_MISC`
selector `0x06`. Both answer all zeros on the bench 525, which is what section 90 already recorded,
so this does not reopen RAM polling there. It does mean the zeros are the remote's answer twice over
rather than one path being wrong.

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
table read, which makes this the route to the **`MCU_ID`** that `docs/plans/002-the-roadmap.md` wants in order to
measure the arch 12 part number rather than infer it.

Two things were not established from the images: which of `0xFE` and `0xFF` is which, since the
validator keeps the low bit of byte 1 as a sub-selector and both reach the same body, and how the
24-bit address maps onto the part's program memory.

**The arch 12 validator says the same thing and it is read now**, `0x2637A`: it clears bit 0 of the
top byte before comparing with `0xFE`, writes `0xFE` back so the read body's own branch matches, and
reduces the top byte to its bit 0, which becomes the top byte of the address the read loop walks. So
the two pages are program `0x00xxxx` and `0x01xxxx`. It bounds the offset at `0xFFF8`, and it does
not touch the count. `docs/findings.md` section 94.

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

### WRITE_FLASH's data path

Section 175, read on 25 August 2026 when phase 8's gate opened. The announce packet is above, with
`READ_FLASH`'s, since the two are identical; this is what happens to the bytes.

A transfer is three parts on the wire:

| direction | packet | reply |
|---|---|---|
| host to remote | `0x35`, then a 24 bit address and a 16 bit count | none |
| host to remote | `0x4A`, then 63 payload bytes, repeated | **none, per packet** |
| host to remote | `0xF1 0x30` | `0xF0 0x30`, once, from state 3 |

Those command bytes are the length nibble mapping above applied to this transfer, not new
constants: nibbles 0 to 7 pass through unchanged, so five argument bytes make the announce `0x35`
and the done packet's one argument makes it `0xF1`, and nibble `0x0A` is 63, so a full data packet
is `0x4A`. A short final data packet uses whichever nibble states its length.

**Corroboration, after the fact.** That decode is exactly concordance's "for writing flash" map,
`{?, 1, 2, 3, 4, 5, 6, 7, 15, 31, 63}`, where its other map ends `14, 30, 62`. The pair had read as
two conventions with no reason; the firmware says the first is simply what the length nibble means,
and the second counts a read response's data after its sequence byte.

**The two commands inside a transfer cannot be sent outside one.** `WRITE_FLASH` sets state 2, and
the state gate sends state 2 to a two case chain of its own that accepts `0x40` and `0xF0` and
nothing else. Anything else there falls through to the exit that clears the state, so a stray command
ends the transfer rather than being obeyed.

Three images, and both remotes on the bench are among them. The Harmony 600 is the arch 14 remote;
the 700 is an arch 14 **reference image** and there is no such remote here, which the first version
of this section got wrong by calling the pair "both bench architectures". Section 175 records the
correction.

| | Harmony One | Harmony 600 | 700 image |
|---|---|---|---|
| state 2's chain | `0x26752` | `0x0C4C0` | `0x0C55C` |
| the `0x40` handler | `0x26760` | `0x0C4CE` | `0x0C56A` |
| the `0xF0` handler | `0x267AA` | `0x0C518` | `0x0C5B4` |
| the staging buffer | `0x01A5` | `0x068C` | `0x068F` |
| pending flag, packet length | `0x28D`, `0x28E` | `0x723`, `0x724` | `0x37E`, `0x37F` |
| the drain executor | `0x267FE` | `0x0C578` | `0x0C614` |
| destination selector | `0x28B` | `0x1CD` | `0xED5` |
| announced count remaining | `0x288`, `0x289` | `0x1C9`, `0x1CA` | `0xED1`, `0xED2` |
| target address | `0x285` to `0x287` | not read | `0xECE` to `0xED0` |

**The buffer holds one packet, not the transfer.** Its address is two literals reloaded at the top of
every packet rather than advanced across them, and what the handler records beside it is the
**packet's own decoded length**, not a share of the announced count. So the firmware writes what the
packet says it carries.

**The destination selector is the validator's output and serves both directions.** The validator sets
it while parsing either command: `0x00` for external storage, `0xFE` for internal program flash, and
the write executor forks on it exactly as the read body does. `0xFF` is a third value that both arms
refuse, and `0xE0 0x01` sets it, so ending a session disarms the destination until an address is
validated again.

**An internal write is the part's own self programming sequence.** A byte reaches `TABLAT` and the
holding registers through `TBLWT`, and a commit setting `EECON1` to `0x04` runs only when the low six
bits of the address are all set. So internal program flash goes in 64 byte blocks and a transfer that
ends mid block leaves its tail in the holding registers, unprogrammed, with no error.

**Arch 12 keeps its low region behind an interlock.** A write below `0x020000` is performed only
while bit 5 of `0x1A4` is clear, and that bit is **set at boot and re-set on every main loop pass**, by
`0x2B824` in the routine the entry point at `0x2EA38` calls first and the main loop calls forever. A
write at or above `0x020000` sets it too. The one instruction that clears it is `0x26612`, reached when
ERASE_FLASH is given an address below `0x020000`. So the region below, which holds the safe mode
container at `0x002000`, is closed in the ordinary running state and opens only just after a low erase.
Arch 14 has nothing equivalent; neither of its write executors tests a bit at all. The validator knows
nothing about any of this: section 88 accepts every top byte below `0x40` on arch 12, the whole part.
**Two earlier versions of this paragraph were wrong in opposite directions**, one calling the bit a
permit and one calling the region freely writable at session start, and section 175 keeps both because
the pair is the lesson.

**The internal offset bound is per architecture**: `0xFFC0` on arch 14 and `0xFFF8` on arch 12.
`packages/usb` applies the arch 14 value to both, which is stricter than the Harmony One's firmware
and therefore safe.

**The firmware imposes no pacing requirement on the data packets**, which is the fact a writer most
needs. The command dispatcher returns whether work is pending as its value and its caller drains the
staging buffer in the same service call, `0x267E4` and `0x202E8` on the Harmony One, `0x0C600` and
`0x0C614` on the 700, `0x0C566` and `0x0C578` on the Harmony 600. So a packet is programmed before the
dispatcher can be entered again, and the done cannot overtake the last packet. Section 175, which
first recorded the opposite as an open risk and then briefly overstated the answer.

**What that does not settle is whether the USB hardware can drop a report**, and the distinction
matters to a host that streams: the endpoint's buffer descriptor and its ownership bit decide that,
and they are not read. The usual arrangement makes the endpoint refuse rather than overwrite, so
streaming is expected to work; the firmware side is derived and the silicon side is an expectation.
`writeFlash` therefore sends without a delay by default and takes one as an option.

**Two things about the medium are still unread**, and neither changes what a host sends: arch 12's
external mechanism, which pokes a bank register rather than writing directly, and **why** arch 14's
external path issues an SPI read setup before it programs. The **whether** of that second one is
settled on both images now, `0x18D98` on the 700 and `0x17434` on the Harmony 600. **Whether the
firmware erases before it programs is also unread**, and it is moot for any caller that erases first,
since erasing an erased block changes nothing.

### The address a host sends is classified before it is used

**Structured form of `docs/findings.md` section 192.** A request's 24 bit flash address is not used as
an address. One routine reads its top byte and picks a target, and the write, read and erase handlers
are its only three callers in every image where it has been located.

| the request's top byte | target | bound on the rest | selector value |
|---|---|---|---|
| `0xFE` or `0xFF` | internal program flash, page `top & 1` | low sixteen bits at most `0xFFF8` | `0xFE` |
| below the architecture's ceiling | the external medium | the ceiling | `0x00` |
| anything else | none | | left as it was |

The first row is one row because the routine clears bit 0 before comparing with `0xFE`, then masks with
`0x01`. That is the same mapping the read path's own measurement gives, two pages rather than one
selector and a dud, and it is now stated by the firmware as well.

| image | classifier entry | ceiling | so addresses below |
|---|---|---|---|
| Harmony One safe mode | `0x07CAC` | `0x40` | `0x400000` |
| Harmony One application | `0x02637A` | `0x40` | `0x400000` |
| Harmony 600 application | `0x0134F4` | `0x20` | `0x200000` |
| Harmony 700 application | `0x013DFE` | `0x20` | `0x200000` |

**The interlock is a byte and its resting value refuses.** `0x1EE` on the Harmony One in safe mode and
`0x28B` in its application: `0x00` selects the external medium, `0xFE` internal program flash, and any
other value dispatches nowhere. Seven sites in safe mode set it to `0xFF`, at session reset and after
every erase, and only the classifier writes anything else. The erase handler does not read the
classifier's return value at all, it reads the selector, so a rejected address is a no operation.

**On arch 12 the top byte is a page number, not an address.** Before every access the firmware writes
`top - 3` to a register at external `0x020025`, a bus write in the same way the memory mapped keypad at
`0x020020` is, and then replaces the requested top byte with `0x13`. Sixteen bits of offset remain, so
the window is 64 KiB and that is where the erase block size comes from. The register is built 20 times
in safe mode, 46 times in the application, and never in either arch 14 image.

**Safe mode carries six of these seven commands**, same bytes and same state numbers, absent only
`0x70` START_IRCAP, and both flash commands reach the parallel NOR programmer. So restoring a Harmony
One needs no protocol this project has not already read.

**`ERASE_FLASH` is the only route to an external erase on arch 12, and the application has no other.**
The programmer library's erase gate at internal `0x1E00E` has exactly one caller, the wrapper at
`0x2DECA`, and that wrapper has exactly one caller in the whole application, the `ERASE_FLASH` handler
at `0x265FC`, which takes its three address bytes out of the report through the parser at `0x20380`
before it runs. The two program gates are reached from their own wrappers, called from the
application's own flash access layer at `0x2B862` and `0x2B87E`, so the firmware **can** program
external flash unasked and **cannot** erase it. Since programming only clears bits, nothing running on
the remote can turn a block of the configuration region into `0xff`. Section 243, and
`tests/test_external_erase.py`.

### The state machine, in full

The main loop's dispatch on the state variable is **one chain of 70 cases** running from
`0x0C720` to `0x0C8FE`, with values from `0x01` to `0xD6`, all distinct, reaching 31 distinct
bodies. States 2 and `0x0B` are special cased just before it, with ordinary `SUBWF`
comparisons, and go to `0x0D30C`.

The command states and their executors, in the 700 2.8 image. **State 3 was missing from this table
for as long as it existed**, which review caught: it is not a command a host sends, so it never turned
up in a survey of commands, and it is the state a write transfer spends its final moment in. Section
175.

| State | Command | Executor |
|---|---|---|
| 1 | GET_VERSION | `0x0C906` |
| 2 | WRITE_FLASH | `0x0D30C`, via the special case before the chain |
| 3 | a write transfer that has finished, which answers `0xF0 0x30` and is entered by the done packet rather than by a command a host names | `0x0C95C` |
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

**Confirmed from the firmware since section 192**, by a route with nothing in common with this
measurement: the routine that classifies a requested address clears bit 0 of the top byte, compares it
with `0xFE`, and masks the byte with `0x01` to pick the page. So `0xFE` is page 0 and `0xFF` is page 1
because that is the arithmetic, and the naming this document chose from six probes is the firmware's
own.

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

**That is arch 12 and arch 14 only, and arch 9 keeps the same block somewhere else**, section 268.
A Harmony 525 has no `0xFF` window at all, so this address does not merely return something wrong
there, it is refused by the address validator. concordance states the location per architecture in
its own `ArchList`: `0xFFF400` for arch 12, which is a second source for the address below, and
`0x200010` for arch 9, whose top byte `0x20` is the **on chip EEPROM** window. `IDENTITY_ADDRESS` in
`packages/usb/src/identity.ts` carries the table and refuses an architecture with no row rather than
guessing a page. Measured on the bench 525 on 6 September 2026: the block there passes
`identifiesAUnit`, so the EEPROM location really does carry a per unit value.

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

**This block is what identifies a unit, and `packages/usb` reads it since section 226**:
`readUnitIdentity` is one `READ_FLASH` of this window, `IDENTITY_PAGE` and `IDENTITY_OFFSET` in
`identity.ts`, and the write rails compare what the remote reports against what the caller recorded.
Two consequences a reimplementation has to get right.

**The field named the serial identifies nothing.** It is `0xEE` on all three remotes read here, per the
paragraph above, so a comparison of that field alone matches every unit against every other and reports
a confident yes. The per unit values are the two GUIDs at `+0x10` and `+0x20`, and an identity whose
GUID fields are uniform filler is refused rather than matched, since the truth there is "this cannot be
told" and not "a different unit".

**The count must stay even.** 64 is, and an internal read of an odd count never terminates and hangs
the remote, section 94, so the length of this read is a rail rather than a choice.

The values themselves stay in the private lab, which is why nothing here or in `packages/usb` carries a
table of units: this repository is public, and a unit identity is that remote's hardware identity.
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
the spare unprogrammed Harmony One, with the restart watched at the remote itself, so it is the device
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

What 63 has that 64 and 124 do not is **an odd byte count**, and that is diagnosed now rather than
described: section 94 reads the loop, and a sixth deliberate restart on 9 August 2026 confirmed the
case that separates the two readings, 65 bytes, which hangs a remote and is not `62n + 1`. Offset
zero was **retested on 9 August 2026 and returns**: 63 bytes there returns 63 bytes and leaves the
remote running, against the same read at `+0x1000` which restarts it. That is not an exemption for
offset zero, section 96: it is one byte of flash, `0x8C7` further on, that happens to be even.

Every restart recovered on its own, and afterwards the config read back byte-identical to its dump
across three separate windows. So this is disruption rather than damage.

**There is no boundary and the whole hazard is read**, `docs/findings.md` section 96. An odd count
never terminates at any address, section 94, and the response sender at `0x20394` has no bound, so
the loop walks a write pointer up through data memory writing what it reads. After 2247 bytes it
overwrites its own counter, and the read completes if and only if the flash byte it lands on is
even. So the outcome is decided by content `0x8C7` above the failing chunk, not by where the read
starts, and the threshold reported on 9 August 2026 was an artefact of which offsets the bisection
tried. `packages/usb` refuses an odd count, which is now the right refusal for the right reason:
even the case that returns has overwritten 2247 bytes of the remote's memory, so its reply is not
trustworthy either. Worth stating plainly for anyone building on this: **every command involved was
a read**, and reads of this region still restart a running remote.

~~It used to refuse an internal read of more than one chunk~~<!--superseded-->, which is a bound
around the hazard rather than the hazard: 64 and 124 byte reads were already recorded as safe in the
table above when that cap was written. Narrowed on 9 August 2026 with those reads repeated on the
spare, `docs/findings.md` section 93, and then **explained** the same day: the fetch primitive can
only read a word, the loop subtracts two and exits on zero, so an odd count never terminates,
section 94. The refusal is an odd count.

**It bounds the offset and the count now**, and until 14 August 2026 it bounded only the offset. The
`0xFFC0` bound is the firmware's own, `0x10000` less a full report, and it was justified in this
library's comment by "an offset plus one report cannot leave the window", which is a sentence about
the cap struck out above. Once that cap turned out never to have existed, a 512 byte read from
`0xFFC0` walked past the end of the 64 KiB page with nothing to say so, and what the device serves
there has never been read. `docs/findings.md` section 139 entry 24.

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
### Still open

* **Why the One drops that first command**, per the section above. Capped rather than understood,
  which is the same shape as the internal-read restart below.
* **What fields 7, 10 and 11 are versions of**, given that they repeat field 0 on both remotes.
  Concordance prints firmware type and `IRL, ORL, FRL`, neither of which is placed. *The third
  component of the hardware version was on that list and is off it since section 225: it is not in
  the block at all. concordance sets it to zero outright, with a comment saying only the later
  network connected remotes carry a non-zero one, so there was nothing to place.* *Fields 8 and 9 were on this line until they were placed: field 9
  versions the image at `0xFF` `+0x0000` and field 8 the one at `0xFF` `+0xE000`, both `0x00` when
  the image is absent, with the 600 as the negative case for each.*
* ~~Why a one byte final chunk on the internal memory path restarts a remote, and why offset zero is
  exempt.~~ **Both halves are answered and this entry outlived them**, until 29 August 2026. Sections
  94 and 96 read the mechanism: the fetch loop reads a word, subtracts two and exits on zero, so any
  **odd** count runs away and the final chunk's shape is not the variable. Offset zero is not exempt
  either; the byte that made it look so is one byte of flash `0x8C7` further on that happens to be
  even. `packages/usb` refuses odd counts, which this document already says a hundred lines above,
  and nothing was ever "capped".
* ~~Another route to `MCU_ID`.~~ **Closed as unreachable rather than answered.** The internal window
  is two 64 KiB pages and a PIC18 keeps its device id at `0x3FFFFE`, outside both, so there is no
  route through this command set. The arch 12 part number stays inferred. `docs/findings.md`
  section 22, and section 25 for the weak corroboration that it is a 128 KiB part.
* Whether the length nibble mapping differs in safe mode, which is a separate firmware.
* Whether `0x28`, GET_VERSION's code, means anything in its low nibble. It is not a payload length:
  it would say 15 where the firmware copies 12, and the acknowledgement shows the nibble is not a
  length for every response.
### There is no factory reset over the command protocol, and there is one over the network

Command `0xE0` carries four sub-command codes. The client sends three of them and all three
live in its diagnostics layer, not in anything a user reaches: one resets the USB interface, one
resets the remote, and one invalidates a test firmware image. A fourth method exists for
clearing test flags and its body is empty.

This project reads codes 1, 2, 3 and 5 as serviced by the arch 14 firmware,
`docs/findings.md` section 19, and the two lists agree on 1 and 2 and disagree on the rest. So
the correspondence between the code and what it does is open, and over this protocol the nearest
thing to a reset is invalidate and overwrite.

**This section used to conclude that no path in the vendor's own software returns a remote to a
factory state**,<!--superseded--> and that is withdrawn, section 196. Both MyHarmony clients carry a hidden recovery
tool, Alt-F9 in the Silverlight one and shift plus double click on the title bar in the web one, whose
first button is a factory reset per model. It was performed successfully on a Harmony Touch on 27
August 2026. **The mechanism is why the old sentence was wrong in a way worth keeping**: it is not a
command at all, it installs a whole factory firmware image fetched over the network, so a search of
the command protocol could never have found it and finding it says nothing new about `0xE0`. It is
also published for the Linux generation only, so no remote of any architecture this project reads has
one.
### Infrared learning: the data stream's shape

The firmware settles the bracket and this document holds the rest. `docs/findings.md` section 91
has the full argument; what is believed on the client's word alone is:

* A learn data report has a **zero length nibble** and carries its real byte count in the **last
  byte of the report**, which no other command in this protocol does. Between them: a byte of two
  nibble counters, then big endian `u16` words, `(count - 2) / 2` of them.
* The two counters are a sequence 0 to 15 and a dropped counter. An increase in the dropped counter
  means twice that many samples were lost, so **samples go in pairs**.
* **The first three words are calibration**: a last pulse on time, a first pulse time and a clock
  count. Carrier period is the gap between the times over one less than the count, in microseconds.
* Then envelope and gap alternate. An envelope word is microseconds on every architecture this
  project targets and a count of carrier cycles only below architecture id 2. A gap word is total
  elapsed time, so the envelope before it is subtracted.
* **Stopping a learn can restart the remote**: the client waits an architecture specific reboot
  delay after the stop before doing anything else.

Worth confirming in the order given: the report framing first, because it is what an implementation
gets wrong silently, and the calibration arithmetic second, because section 32 already knows the
carrier from the transmit side and the two should agree.
### The whole arch 12 config write, in order

Read 9 August 2026 from the Desktop client's own file for the Harmony One. This is the sequence
this project has never performed and, per decision 8, will not perform in version 1. It is recorded
because a write rail is only as good as its knowledge of what a legitimate write looks like.

Restated as commands, each with its acknowledgement:

1. Reset the USB side, no reply expected.
2. `WRITE_MISC` selector `0x0A`, the restart command from the learn section above, with the entry
   point meaning **start upgrade**.
3. `WRITE_MISC` selector `0x06`, address 0, value 0, then `READ_MISC` on the same selector and
   address to confirm the byte reads back as 0.
4. `WRITE_MISC` selector `0x02`, which the client calls invalidating the flash region. **This is the
   ledger's first item confirmed by a second client**, independently.
5. `ERASE_FLASH` per block, walking the region from its base for as many blocks as the file covers.
6. Per chunk: `WRITE_FLASH` with a base address and a size, then 150 `WRITE_FLASH_DATA` packets of
   63 bytes each, then a done packet. A chunk is 9450 bytes.
7. `WRITE_MISC` selector `0x06`, address 0, value 2, then read it back to confirm.
8. Reset the device, wait for it to reboot.

**So selector `0x06` is an update status byte at address 0**, 0 meaning none and 2 meaning a new
image is present, written before the erase and again after the write. That is what
`reference/usb-protocol/README.md` calls one of the bodies this project located and never read, and it is the
most testable item here.

Addresses are three bytes and sizes two, high byte first, which agrees with this project's own
encoder.

**A caution about the literal bytes in these files.** They are inconsistent about whether the
leading byte already carries the length nibble: some commands are written as the bare command code
with the nibble left for the builder, and some are written with it folded in. So a byte from here is
read as a command plus a selector plus arguments, and the nibble is recomputed rather than copied.
This project's `encodeRequest` already computes it.
### The read selector names, which reframe an earlier correction

The client names the `READ_MISC` and `WRITE_MISC` selectors. Four are serviced for reading on arch
14, and the client has a name for each: selector 1 is a state accessor, 6 is memory, 7 is registers,
and 12 asks what hardware features the remote has. That last one is `reference/usb-protocol/README.md`'s "not
read yet" body, and the first and second are bodies this project has located and not read either.

**It does not overturn the `0x07` correction and it does sharpen it.** This project derived from the
firmware that selector 7 turns its parameter into a pointer and returns the byte it names, and that
6 is a different accessor. The client agrees there are two and disagrees about which one deserves
the word memory. Nothing about behaviour changes: 7 is the one that reads an arbitrary data address
on arch 12 and arch 14, measured on both.

**Tested and refused on arch 9.** Since selector 7 answers zero for every address on a Harmony 525,
the client's naming made 6 the obvious thing to try. All nine selectors return zero on a window that
is demonstrably live on a 600. `docs/findings.md` section 90.
