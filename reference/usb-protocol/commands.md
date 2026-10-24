# Commands

A computer talks to a Harmony One, 525, 600, 650 or 700 by sending it short reports of 64 bytes and
reading the reports that come back. The first byte of a report says what is asked and how many bytes of
argument follow. There are seven requests: ask the remote what it is, read its flash, write its flash,
erase a block of it, read one small item, write one small item, and start learning an infrared code. A
remote does not do the work while it reads the request: it notes what was asked and does it a moment
later, so a reply may not be waiting the instant a request has gone.

This page describes each request and its reply, how an address picks which memory is read, and the hazards
a host has to know about. How the remote presents itself on the bus is [the transport](transport.md), the
reply to the version request is [the version block](version-block.md), and what each architecture answers
differently is on its own page: [the Harmony 525](../architectures/harmony-5xx/usb.md),
[the Harmony One](../architectures/harmony-one/usb.md) and
[the Harmony 600, 650 and 700](../architectures/harmony-600-650-700/usb.md). Everything that writes is
refused by `packages/usb` unless its rail in `packages/usb/src/rails.ts` lets it through; where this page
says what the library does, that code is the evidence.

Addresses of firmware routines below are the Harmony 700's 2.8 image unless a row or a sentence names
another build.

## The first byte is a command and a length

The low nibble of the first byte is a payload length, and the mapping is not linear[^s19][^t-usb-firmware]:

| low nibble | payload bytes |
|---|---|
| `0` to `7` | 0 to 7, unchanged |
| `8` | 15 |
| `9` | 31 |
| `A` | 63 |
| `B` to `F` | unchanged, so 11 to 15; no use of them is known |

The code at `0x0BD22` lets nibbles 0 to 7 through untouched with `SUBLW 0x07` and a carry branch, then a
comparison chain maps `0x0A`, `0x09` and `0x08` to `0x3F`, `0x1F` and `0x0F`. **63 payload bytes plus the
command byte is exactly the 64 byte report** the descriptors declare, and 15, 31 and 63 are 2^4-1, 2^5-1
and 2^6-1, so a misreading would not land on the report size. The Harmony One 3.4, Harmony 600 0.2 and
Harmony 700 2.8 images carry the same mapping with the same constants[^s19][^t-usb-firmware]. Logitech's
classic client's replies, captured on the wire, use the same nibbles in the proportions this mapping
predicts, [the classic client](../logitech/classic-client.md)[^s210].

The high nibble is the command. It is masked out at `0x0BD52` with `ANDLW 0xF0` after the length has been
taken, so the command and its length share one byte and the payload starts at byte 1[^s19].

**A reply uses the same encoding**: a code in the high nibble and a length in the low one, so `0xC2` is a
code `0xC0` carrying two bytes[^s19]. The one exception is an acknowledgement, below.

## The command table

Every image dispatches the same seven commands, from a chain of `XORLW` comparisons whose literals are
**not** the case values: each literal is the XOR of one case with the next, so the case value is the
running XOR, which `src/harmony/pic18/chains.py` computes[^s19][^t-usb-firmware]. The names are the ones
the protocol is known by; the firmware names nothing.

| command | name | state it sets |
|---|---|---|
| `0x10` | GET_VERSION | 1 |
| `0x30` | WRITE_FLASH | 2 |
| `0x50` | READ_FLASH | 4 |
| `0x70` | START_IRCAP | 5 |
| `0xD0` | ERASE_FLASH | 8 |
| `0xA0` | WRITE_MISC | 9 |
| `0xB0` | READ_MISC | 10 |
| `0x05` | not a command a host sends: the escape's internal continuation, below; absent on the Harmony One | 13 |

Where each build keeps the handler for each command, and the executor that does its work, is that
architecture's firmware page: [the Harmony 600, 650 and 700](../architectures/harmony-600-650-700/firmware.md#the-command-handlers)
and [the Harmony One](../architectures/harmony-one/firmware.md#the-command-handlers)[^s19].

The Harmony 525 dispatches the same seven, [its usb page](../architectures/harmony-5xx/usb.md)[^s267]. Two
further commands exist inside a state rather than in this table: `0x40`, a write's data packet, only while
a write is in progress, and `0x80`, stop learning, only while learning; both are below. On the Harmony 600,
650 and 700 a version request **with** a payload is a second command family, which reads and writes the
settings store and more, [their usb page](../architectures/harmony-600-650-700/usb.md)[^s304].

## A command is parsed in one place and executed in another

Every handler in the table does two things and returns: it sets a state variable and reads its arguments
out of the packet. The work happens later, when the main loop sees the state. So **a reply is
asynchronous**, and a host has to allow for it: writing a command does not mean a reply is
waiting[^s19].

**The state numbering is the same in all three images** while the state variable sits at a different
address in each, listed with the handlers on each firmware page[^s19][^t-usb-firmware].

The dispatch at `0x0BDCA` is itself gated on that state, at `0x0BDB2`[^s19][^s175]:

* state 0, idle: the command table
* state 2, a flash write in progress: a two entry chain accepting `0x40` and `0xF0`
* state 5, learning: `0x0C5D4`
* anything else: `0x0C5EE`, which clears the state

## Every command's request, in one table

Read by walking each parser from its dispatch target, each bounded by the next parser's entry[^s19][^t-usb-firmware]:

| command | argument bytes | layout |
|---|---|---|
| `0x10` GET_VERSION | none | parsed inline in the callback at `0x0BDFE` |
| `0x30` WRITE_FLASH | 5 | 24 bit address, 16 bit count, **the same as READ_FLASH** |
| `0x50` READ_FLASH | 5 | 24 bit address, 16 bit count |
| `0x70` START_IRCAP | **0** | none |
| `0xA0` WRITE_MISC | 5 | selector, 16 bit address, 16 bit value |
| `0xB0` READ_MISC | 3 | selector, 16 bit address |
| `0xD0` ERASE_FLASH | **3** | 24 bit address only, **no count** |
| `0x05` internal | 3 | three bytes, not identified |

Every multi byte argument is most significant byte first[^s19]. **WRITE_FLASH takes the same five bytes as
READ_FLASH**, into the same variables, and both go through the same address classifier, so the region
rules below apply to writes too[^s19][^s192]. **ERASE_FLASH takes an address and no length**, so the size
of an erase is the hardware's block and not the host's choice, and an erase can only be scoped by refusing
addresses, [ERASE_FLASH](#erase_flash)[^s19].

## Every command's response, in one table

| command | response |
|---|---|
| `0x10` GET_VERSION | `0x28` then 12 bytes on the One, 600, 650 and 700; `0x27` then 7 on the 525, [the version block](version-block.md) |
| `0x30` WRITE_FLASH | none from its executor, a bare `RETURN`; the reply comes when the transfer ends, [below](#write_flashs-data-path) |
| `0x50` READ_FLASH | data in chunks, then an acknowledgement, [below](#what-a-read-sends-back) |
| `0x70` START_IRCAP | none of its own: it branches to the shared transmitter, which sends whatever was queued |
| `0xA0` WRITE_MISC | `0xF0 0xA0` |
| `0xB0` READ_MISC | `0xC2`, the selector, then one byte |
| `0xD0` ERASE_FLASH | `0xF0 0xD0` |

Read in the firmware[^s19][^t-usb-firmware].

**An acknowledgement is `0xF0` followed by the command's own byte**, built the same way for WRITE_MISC and
ERASE_FLASH, so a host can treat `0xF0 cmd` as "done, no payload" without a table per
command[^s19][^t-usb-firmware]. **Its low nibble is `0` and the command byte follows it anyway**: a
Harmony 600 ends a READ_FLASH with `f0 50`, not `f1 50`. So the nibble is a payload length for a request
and for a data chunk and is not one for an acknowledgement, and a host that finds the acknowledged
command by the nibble finds nothing there[^s19b][^t-remote].

## The state machine, in full

The main loop's dispatch on the state variable is **one chain of 70 cases** from `0x0C720` to `0x0C8FE`,
values `0x01` to `0xD6`, all distinct, reaching 31 distinct bodies. States 2 and `0x0B` are tested just
before it with ordinary `SUBWF` comparisons and go to the write executor[^s19][^t-usb-firmware]. The
command states, whose executors' addresses are with the handlers on
[the firmware page](../architectures/harmony-600-650-700/firmware.md#the-command-handlers):

| state | command |
|---|---|
| 1 | GET_VERSION |
| 2 | WRITE_FLASH, through the test before the chain |
| 3 | a write transfer that has finished: entered by the done packet, not by a command a host names, and answers `0xF0 0x30` |
| 4 | READ_FLASH |
| 5 | START_IRCAP |
| 6, 7 | learning, stopped |
| 8 | ERASE_FLASH |
| 9 | WRITE_MISC |
| 10 | READ_MISC |
| 13 | the internal case |

State 3 is the one a survey of commands misses, since no host sends it[^s175].

**State 4 has a second dispatch site.** An `XORLW` chain at `0x0D388`, seven cases (2, 4, 5, 6, `0x0B`,
`0x20` and `0x35`), sends state 4 to `0x0D3A8`, which subtracts the chunk just sent, held in `0xED3`, from
the 16 bit remaining count in `0xED1` and `0xED2`, and clears the state to idle when the count reaches
zero[^s19][^t-usb-firmware]. So `0x0C982` starts a chunk and `0x0D3A8` finishes one, and **bytes 4 and 5 of
a READ_FLASH are the count** by control flow from the dispatch. `0xED3` is also where READ_MISC parses its
selector, so the two commands share that variable. What sets `0xED3` on this path, and with it the chunk
size, is not followed in this image[^unchecked]; the Harmony One's chunker is read, below.

## GET_VERSION

**Request: `0x10` with a length nibble of 0.** The reply is the version block, `0x28` then twelve bytes on
the Harmony One, 600, 650 and 700 and `0x27` then seven on the Harmony 525, and what each field means is
[the version block](version-block.md)[^s19][^s76].

## READ_FLASH

The one command a reader needs.

**Request: `0x55`, that is `0x50` with five argument bytes**[^s19]:

| byte | meaning |
|---|---|
| 1 | address, most significant byte, **which picks the memory**, below |
| 2 | address, middle byte |
| 3 | address, least significant byte |
| 4 | count, high byte |
| 5 | count, low byte |

**The count on the wire is the number of bytes wanted**, not one less: 256 asked for are 256
delivered[^t-remote].

### What a read sends back

The data comes back in chunks, then an acknowledgement[^t-remote]:

```
6a 01 <62 data bytes>      chunk 1
6a 12 <62 data bytes>      chunk 2
6a 23 <62 data bytes>      chunk 3
...
67 45 <6 data bytes>       a short chunk, its nibble the literal length
63 56 <2 data bytes>
f0 50                      done
```

* **The code is `0x60`**, and the nibble is the chunk's payload length[^t-remote].
* **The first payload byte is a sequence number**, so a full chunk carries 62 data bytes, not 63: 63 is the
  largest payload a nibble can describe and one of those bytes is the sequence. 256 bytes come back as
  62+62+62+62+6+2[^t-remote]. The firmware's side of it: state 4 compares the remaining count against
  `0x3F` at `0x0C9B2`, reached from `0x0C988`[^s19], and the Harmony One's chunker clamps at 63 and sends
  the clamped payload less its sequence byte[^s94][^t-usb-firmware].
* **The sequence advances by `0x11`**: `0x01`, `0x12`, `0x23`, `0x34`, `0x45`, `0x56`, the low nibble this
  chunk's number and the high nibble the previous one's. A report dropped by the host is this transfer's
  real failure mode, and a host that does not check the sequence turns it into silent corruption inside a
  configuration; `packages/usb` refuses a chunk out of sequence[^t-remote][^s223].
* **A read ends at its acknowledgement and not at its byte count.** A reader that stops as soon as it has
  the bytes leaves `f0 50` in the pipe, and the next command reads it first and concludes its own transfer
  is over, which looks exactly like a remote with a strange size limit[^t-remote].

**A rejected address produces silence, not an error**, so a host using the wrong base looks like a host
with a broken cable: "flash read returned 0 of 16 bytes"[^s76].

Logitech's classic client reads a Harmony One with nothing but the reset escape, GET_VERSION and this
command, in 3100 byte transfers, and every one of its requests is byte for byte what `packages/usb` builds,
[the classic client](../logitech/classic-client.md)[^s210].

### Addressing, in short

Every page of this reference writes a memory address the way a host sends it in `READ_FLASH`: 24 bits,
whose top byte picks the memory before the rest is used as an offset[^s192].

| top byte | reaches |
|---|---|
| below the architecture's ceiling, `0x40` on the Harmony One and `0x20` on the Harmony 600, 650 and 700 | the external flash |
| `0xFE` | internal program memory, from program address zero |
| `0xFF` | internal program memory, from program address `0x10000` |
| anything else | nothing: the request is refused in silence |

The Harmony 525's address space is a set of tagged windows instead, set out in
[its memory page](../architectures/harmony-5xx/memory.md)[^s119].

So the two internal pages are 64 KiB each, 128 KiB in all, and an address in them is written `0xFE`
`+0x1000`: `0xFE` maps one to one from program address zero, so `0xFF` `+0x1234` is program address
`0x11234` and the top of the `0xFF` page is the top of program memory[^s22]. In every memory table, erased
means `0xFF` bytes, and a range with no row is erased.

**An internal read must ask for an even number of bytes.** The fetch loop reads a word at a time,
subtracts two from the count and stops only on zero, so an odd count never terminates: the loop walks on
through the remote's working memory, writing what it reads, and the remote restarts or hangs[^s94][^s96].
`packages/usb` refuses an odd internal count for that reason, and only the named door
`HARMONY_ODD_READ_EXPERIMENT` opens it.

**The offset within a page is bounded by the firmware**, at `0xFFC0` on the Harmony 600 and 700 and at
`0xFFF8` on the Harmony One, and `packages/usb` applies `0xFFC0` to both[^s175]. The two bytes above the
configuration words, program `0x1FFFE` and `0x1FFFF`, are neither program memory nor configuration words,
so nothing is lost where a read stops short of them[^s25]. Whether any read reaches them is not
checked[^unchecked].

### The address a host sends is classified before it is used

A request's 24 bit address is not used as an address. One routine reads its top byte and picks a target,
and the write, read and erase handlers are its only three callers in every image where it has been
located[^s192]:

| the request's top byte | target | bound on the rest | selector value |
|---|---|---|---|
| `0xFE` or `0xFF` | internal program flash, page `top & 1` | low sixteen bits at most `0xFFF8` | `0xFE` |
| below the architecture's ceiling | the external medium | the ceiling | `0x00` |
| anything else | none | | left as it was |

The first row is one row because the routine clears bit 0 before comparing with `0xFE`, then masks with
`0x01`, and that is the same two page mapping a read measures[^s192][^s22].

| image | classifier entry | ceiling | so addresses below |
|---|---|---|---|
| Harmony One safe mode | `0x07CAC` | `0x40` | `0x400000` |
| Harmony One application | `0x02637A` | `0x40` | `0x400000` |
| Harmony 600 application | `0x0134F4` | `0x20` | `0x200000` |
| Harmony 700 application | `0x013DFE` | `0x20` | `0x200000` |

Read in the firmware[^s192][^s88]. The ceiling is each model's flash size: the Harmony One's classifier
accepts every top byte below `0x40`, the whole 4 MiB part, and so it bounds nothing finer than the
part[^s88].

**The selector is a byte and its resting value refuses.** `0x1EE` on the Harmony One in safe mode and
`0x28B` in its application: `0x00` selects the external medium, `0xFE` internal program flash, and any
other value dispatches nowhere. Seven sites in safe mode set it to `0xFF`, at session reset and after every
erase, and only the classifier writes anything else. The erase handler reads the selector and not the
classifier's return value, so a rejected address is a no operation[^s192]. The same selector serves
both directions: the write executor forks on it exactly as the read body does, and the escape's `0x01`
sets it to `0xFF`, so ending a session disarms the destination until an address is classified
again[^s175].

**On the Harmony One the top byte is a page number, not an address.** Before every access the firmware
writes `top - 3` to a register at external `0x020025` and replaces the top byte with `0x13`, so every
access goes through one 64 KiB window, which is where the erase block size comes from; the register is
built 20 times in safe mode, 46 times in the application, and never in the Harmony 600 or 700 image,
[the Harmony One's memory](../architectures/harmony-one/memory.md)[^s192].

### Internal memory

A READ_FLASH whose top byte is `0xFE` or `0xFF` reads the processor's own program memory by table read,
through the internal read primitive at `0x1B558`, one of three siblings that share the same address setup:
`0x1B50A` sets `EECON1` to `FREE | WREN` and erases, `0x1B53C` sets it to `WREN` and writes, and `0x1B558`
reads[^s19][^t-usb-firmware]. **They are two pages, and `0xFE` is the one at program address zero**: it
starts with the PIC18 reset vector and the two interrupt vectors at `0x0000`, `0x0008` and `0x0018`, and
each pair of reads through the two top bytes at the same offset differs[^s22]. The Harmony One's
validator at `0x2637A` states the same mapping, clearing bit 0 of the top byte before comparing it with
`0xFE` and keeping it as the page[^s94].

What the two pages hold, the bootloader, the safe mode image, the other images and the per unit records,
is each architecture's memory page: [the Harmony One](../architectures/harmony-one/memory.md) and
[the Harmony 600, 650 and 700](../architectures/harmony-600-650-700/memory.md). The Harmony 525 has no
`0xFF` window at all and keeps the same identity block in its EEPROM,
[its usb page](../architectures/harmony-5xx/usb.md)[^s268].

**The identity block is what tells one remote from another**, 64 bytes at `0xFF` `+0xF400` on the Harmony
One, 600, 650 and 700, four fields of sixteen bytes[^s22][^s226]:

| offset | field |
|---|---|
| `+0x00` | the field named the serial |
| `+0x10` | a GUID |
| `+0x20` | a GUID |
| `+0x30` | sixteen zero bytes |

The three GUIDs concordance prints for a remote are the serial field and the two GUIDs, in this order, the
two GUIDs in mixed endian byte order[^s22][^x-concordance].

`readUnitIdentity` in `packages/usb` is one READ_FLASH of it, and the write rails compare what it returns
with a record of a permitted unit. Two things a reimplementation has to get right[^s226]:

* **The field named the serial identifies nothing.** It holds `0xEE` on every remote read, so comparing it
  matches every unit with every other. The two GUIDs are what differ, and a block whose GUID fields are
  uniform filler is refused rather than matched, since the truth there is "this cannot be told" and not "a
  different unit".
* **Its count is even**, 64, because an odd internal count hangs the remote.

The values of any unit's identity block are that remote's serial and this reference never states them.

**What an internal read cannot reach.** The window is two 64 KiB pages and a PIC18 keeps its device id at
`0x3FFFFE`, outside both, so the processor's part number is not readable through this command set and the
Harmony One's stays inferred[^s22][^s25]. Read in 62 byte chunks, a page comes back as 65534 bytes: the
offset bound is `0xFFC0` and a 62 byte read from there ends at `0xFFFD`[^s23]. `packages/usb` refuses a
read that would run past the end of a 64 KiB page, since what the device serves there is not
checked[^unchecked]; the code is `readInternalMemory` in `packages/usb/src/remote.ts`.

### The odd count hazard

An internal read of an odd count is the one **read** that can disrupt a running remote, and it took
several readings to understand, so the result is set out whole.

* **The mechanism.** The fetch primitive reads a word. The loop around it emits two bytes, subtracts two
  from the count and exits only when the count equals zero, so an odd count steps past zero and never
  ends, and the `CLRWDT` inside the loop keeps the watchdog from ending it[^s94][^t-usb-firmware].
* **There is no address threshold.** The response sender at `0x20394` on the Harmony One has no bound, so
  the runaway loop walks a write pointer up through data memory writing what it reads, and after 2247
  bytes it overwrites its own counter. The read then completes if and only if the flash byte it lands on,
  `0x8C7` above the failing chunk, is even. So the outcome is decided by content and not by where the read
  starts, and **even a read that returns has overwritten 2247 bytes** of the remote's memory, so its reply
  cannot be trusted either[^s96][^t-usb-firmware].
* **What it looks like.** On a Harmony One, 63 bytes at `+0x1000` restart the remote every time, while 64
  and 124 bytes there, two full chunks, return; 63 bytes at offset zero return, because of the byte
  `0x8C7` further on, and 65 bytes hang as 63 do. So it is not the ordering, the number of chunks or the
  size 63 by itself, and the count's parity is the whole of it[^s93][^s94][^s96]. A hang ends in a genuine
  device reset, with data memory reinitialised and the clock reset, and the remote recovers on its own
  with its configuration intact[^s100].

`packages/usb` refuses an odd internal count everywhere, which is the right refusal for the right reason:
two earlier refusals, of a one byte final chunk and of more than one chunk, were bounds around the hazard,
and the second would have let 65 and 127 hang a remote[^s93][^s94].

## WRITE_FLASH's data path

How the bytes of a write reach storage[^s175]. The announce is the five bytes READ_FLASH takes; a
transfer is three parts on the wire:

| direction | packet | reply |
|---|---|---|
| host to remote | `0x35`, then a 24 bit address and a 16 bit count | none |
| host to remote | `0x4A`, then 63 payload bytes, repeated | **none, per packet** |
| host to remote | `0xF1 0x30` | `0xF0 0x30`, once, from state 3 |

Those bytes are the length nibble mapping applied to this transfer and not new constants: five argument
bytes make the announce `0x35`, the done packet's one argument makes it `0xF1`, and a full data packet of
63 bytes is `0x4A`. A short final packet carries whichever nibble states its length[^s175]. That decode is
concordance's "for writing flash" map, `{?, 1, 2, 3, 4, 5, 6, 7, 15, 31, 63}`, where its read map ends
`14, 30, 62` because a read chunk's data follows its sequence byte[^s175][^x-concordance].

**The two commands inside a transfer cannot be sent outside one.** WRITE_FLASH sets state 2, and state 2
sends a packet to a two case chain that accepts `0x40` and `0xF0` and nothing else; anything else falls
through to the exit that clears the state, so a stray command ends the transfer rather than being
obeyed. This is a property of the remote and not of the host, which is worth knowing before trusting any
host side guard[^s19][^s175][^t-usb-firmware].

| | Harmony One 3.4 | Harmony 600 0.2 | Harmony 700 2.8 |
|---|---|---|---|
| state 2's chain | `0x26752` | `0x0C4C0` | `0x0C55C` |
| the `0x40` handler | `0x26760` | `0x0C4CE` | `0x0C56A` |
| the `0xF0` handler | `0x267AA` | `0x0C518` | `0x0C5B4` |
| the state 3 executor, which answers `0xF0 0x30` | `0x26A9C` | | `0x0C95C` |
| the staging buffer | `0x01A5` | `0x068C` | `0x068F` |
| pending flag, packet length | `0x28D`, `0x28E` | `0x723`, `0x724` | `0x37E`, `0x37F` |
| the drain executor | `0x267FE` | `0x0C578` | `0x0C614` |
| destination selector | `0x28B` | `0x1CD` | `0xED5` |
| announced count remaining | `0x288`, `0x289` | `0x1C9`, `0x1CA` | `0xED1`, `0xED2` |
| target address | `0x285` to `0x287` | not read | `0xECE` to `0xED0` |

Read in the firmware[^s175].

**The buffer holds one packet, not the transfer.** Its address is two literals reloaded at the top of every
packet, and what the handler records beside it is the **packet's own decoded length**, not a share of the
announced count. So the firmware writes what each packet says it carries[^s175].

**An internal write is the processor's own self programming sequence.** A byte reaches `TABLAT` and the
holding registers through `TBLWT`, and a commit setting `EECON1` to `0x04` runs only when the low six bits
of the address are all set. So internal program flash goes in 64 byte blocks, and a transfer that ends mid
block leaves its tail in the holding registers, unprogrammed, with no error[^s175].

**The Harmony One keeps its low region behind an interlock.** A write below `0x020000` is performed only
while bit 5 of `0x1A4` is clear, and that bit is set at boot and again on every main loop pass, by
`0x2B824` in the routine the entry point at `0x2EA38` calls first and the main loop calls forever. A write
at or above `0x020000` sets it too. The one instruction that clears it is `0x26612`, reached when
ERASE_FLASH is given an address below `0x020000`. So the region below, which holds the safe mode
configuration at `0x002000`, is closed in the ordinary running state and opens only just after a low
erase. The Harmony 600 and 700 have nothing equivalent: neither of their write executors tests a bit at
all. The classifier knows nothing of this, since it accepts every top byte below `0x40` on the Harmony
One[^s175][^s88].

**The firmware imposes no pacing on the data packets**, which is the fact a writer most needs. The command
dispatcher returns whether work is pending and its caller drains the staging buffer in the same service
call, `0x267E4` and `0x202E8` on the Harmony One, `0x0C600` and `0x0C614` on the 700 and `0x0C566` and
`0x0C578` on the 600. So a packet is programmed before the dispatcher can be entered again, and the done
cannot overtake the last packet[^s175]. **Whether the USB hardware can drop a report** is a different
question: the endpoint's buffer descriptor and its ownership bit decide it, and they are not read, so
streaming is expected to work rather than shown[^unchecked]. `writeFlash` in `packages/usb` therefore
sends without a delay by default and takes one as an option.

**A transfer is 3150 bytes**, fifty packets of 63, in Logitech's classic client, which sends fifty whole
packets per announce[^s213], and in concordance, whose largest chunk is the same[^x-concordance];
`MAX_TRANSFER` in `packages/usb` is 3150 too. The Desktop client's file for a Harmony One announces 150
packets at a time, 9450 bytes, [below](#a-configuration-write-in-order)[^s245b]; the firmware's buffer
holds one packet either way, so both sizes are the host's choice.

**On the Harmony 525 the data phase is one whole SPI transaction per byte**, `0x031CE` through `0x0758E`:
a write enable, a three byte address, one data byte, a status poll and a write disable, repeated. So there
is no page boundary to respect and no partial page to flush, and every byte costs a round trip to the
part[^s267].

**Not read**, and none of it changes what a host sends: the Harmony One's external mechanism, which pokes a
bank register rather than writing directly; why the Harmony 600 and 700's external path issues an SPI
read setup before it programs, whose presence is read at `0x17434` on the 600 and `0x18D98` on the 700;
and whether the firmware erases before it programs, which is moot for a caller that erases
first[^s175][^unchecked].

## ERASE_FLASH

**Request: `0xD3`, that is `0xD0` with a 24 bit address and no count**, acknowledged `0xF0 0xD0`[^s19].
What one request erases is the hardware's block: **64 KiB** on the Harmony One, where it follows from the
page register's 64 KiB window, and on the Harmony 525 and the Harmony 600, 650 and 700, whose firmware
sends the SPI block erase opcode `0xD8`; each is also measured by checking that the blocks either side of
an erase did not change[^s192][^s222][^s267][^s269][^s281].

**On the Harmony One an erase of the external flash can only come from a host.** The programmer library's
erase gate at internal `0x1E00E` has one caller, the wrapper at `0x2DECA`, and that wrapper has one caller
in the whole application, the ERASE_FLASH handler at `0x265FC`, which takes its three address bytes from
the report. The two program gates are reached from the application's own flash layer at `0x2B862` and
`0x2B87E`, so the firmware **can** program external flash unasked and **cannot** erase it; since
programming only clears bits, nothing running on the remote turns a block of its configuration into
`0xFF`[^s243][^t-external-erase].

**On the Harmony 525 one command erases three different media**, chosen by the window the address falls
in, and the firmware bounds the serial flash arm by the part and nowhere finer, so both firmware images
are reachable; [its usb page](../architectures/harmony-5xx/usb.md) has the arms and why the library's rail
is the only protection there[^s267]. On the Harmony 600, 650 and 700 the first erase after a cache drop
may update a setting in the remote's settings store, [WRITE_MISC](#write_misc-and-the-answer-on-event-injection)
below[^s282].

**Safe mode carries six of the seven commands** on the Harmony One, with the same bytes and the same
states, without START_IRCAP, and both flash commands reach the external flash programmer, so restoring a
Harmony One needs no protocol beyond the application's[^s191][^s192].

## READ_MISC, and live RAM over USB

**Request: `0xB3`, that is `0xB0` with three bytes**: a selector and a 16 bit parameter, high byte first,
parsed into `0xED3`, `0xECF` and `0xECE`. The executor is state 10 at `0x0CB92`, and it replies `0xC2`,
echoes the selector, then dispatches on the selector and appends one byte[^s19][^t-usb-firmware].

**Four selectors are serviced** on the Harmony One, 600, 650 and 700; anything else falls through the
chain[^s19][^t-usb-firmware]. Logitech's client has a name for each[^s212b]:

| selector | body | what it does | the client's name |
|---|---|---|---|
| `0x01` | `0x0CBC8` | calls `0x17DCA` then `0x17E28` and returns a 16 bit value from `PROD` | a state accessor |
| `0x06` | `0x0CBE6` | **the update status byte**: returns data memory `0x100` when the index is 0 and 0 otherwise, through `0x1AB8A` | memory |
| `0x07` | `0x0CBF4` | **reads data memory**: the parameter becomes `FSR0` and the byte at that data address comes back | registers |
| `0x0C` | `0x0CC02` | **the hardware feature read**, below | hardware features |

Read in the firmware[^s19][^s212][^s298]. The client's names put "memory" on selector 6 and "registers" on
7[^s212b], and the firmware says 7 is the one that reads an arbitrary data address[^s19]; it answers live
values on a Harmony 600, a Harmony One and a Harmony 650[^s19b][^s111][^s283].

**A read of the command state variable observes itself**: selector 7 at the address the disassembly
predicts for it, `0x1C1` on a Harmony 600, answers 10, which is the state READ_MISC itself sets, so the
read is live memory of a running remote at a predicted address. **concordance's header names `MISC_RAM` as
`0x06`**, and the same address read through 6 answers 0[^s19b][^x-concordance]. Taking the upstream number
on faith would have produced a read of the wrong thing that still returned a plausible byte.

**Selector `0x0C` is a hardware feature read with two details**, read on the 600, 700 and One images[^s212]:

| detail | what the firmware does | width |
|---|---|---|
| 0 | clears the reply's high byte and returns one byte of data memory: `0x9FF` on the 700, `0x3FF` on the 600, `0x32D` on the One | 8 bits |
| 1 | **the battery voltage**: calls a routine and returns `PRODH:PRODL`, `0x0FBE6` on the 700, `0x11184` on the 600, `0x2372A` on the One. Two bytes, high first, in millivolts, measured under load | 16 bits |
| 2 and above | **nothing** | stale |

**The last row is the one to build a rail on.** The body writes its two reply bytes only inside an arm, so a
detail nobody implemented does not fail and does not answer: it returns whatever the previous command
left, which on the wire looks like a real value. `packages/usb/src/protocol.ts` names the two details as
constants for that reason[^s212]. The battery reading has been taken from a Harmony 650[^s340]. Logitech's
client offers it for the Harmony One alone, so on the 600, 650 and 700 it is not a product
feature[^s212b].

**What a data memory read is good for differs by architecture**: a remote on the cable is in USB mode,
so the keypad scanner does not run, and what else is live is per architecture and set out on each
architecture's usb page, [the Harmony One](../architectures/harmony-one/usb.md) and
[the Harmony 600, 650 and 700](../architectures/harmony-600-650-700/usb.md)[^s48][^s111]. On a Harmony One
the special function registers answer too: `UCON` reads non zero, as a part driving USB must, and `TMR1`
advances between reads[^s111].

**On the Harmony 525 the executor serves selector 1 and nothing else**, and every other selector returns the
two bytes it has just cleared, so no read path to that remote's working memory is known. A sweep there read
every selector as zero, selector 1 included; the handler, read afterwards, puts selector 1's value in the
byte after the one that sweep took, so selector 1 does answer and what it answers on a running remote is not
read, [its usb page](../architectures/harmony-5xx/usb.md)[^s90][^s90b].

## WRITE_MISC, and the answer on event injection

**Request: `0xA5`, that is `0xA0` with five bytes**: a selector, a 16 bit address and a 16 bit value.
WRITE_MISC parses into bank 13 variables where READ_MISC uses bank 14, and its work is done at parse time,
from the selector chain at `0x0C3AA`; the executor at `0x0CB6E` only acknowledges, `0xF0 0xA0`[^s19].

**Nine selectors are serviced** on the Harmony 600, 650 and 700: `0x01`, `0x02`, `0x05`, `0x06`, `0x07`,
`0x08`, `0x09`, `0x0A`, `0x0B`. **The Harmony One services eight**, the same without `0x09`, from its own
chain at `0x26626`, and four of them do nothing there: `0x05`, `0x08`, `0x0A` and
`0x0B`[^s19][^s97][^t-usb-firmware].

| selector | what it does |
|---|---|
| `0x02` | drops the cached region descriptors, below |
| `0x06` | sets the update status byte, below |
| `0x07` | writes a byte of data memory, mirroring READ_MISC's `0x07` |
| `0x09` | nothing: it marks the packet handled and leaves |
| `0x0A` | the restart command, below |
| `0x03` | not in the chain at all |

**Selector `0x07` writes data memory** at the parameter's address, `0x0C414` to `0x0C41C`[^s19][^t-usb-firmware].
Nothing it writes survives a power cycle, but the address is sixteen bits and reaches the special function
registers, which on these parts include the self programming path, `EECON1`, `EECON2`, `TABLAT` and
`TBLPTR`. So `assertRamWriteAllowed` in `packages/usb/src/rails.ts` refuses any address from the register
page at `0xF40` up and admits only the architectures on `ARCHITECTURES_WITH_A_RAM_WRITE_TARGET`, which is
the Harmony One's alone; whether the firmware bounds the address itself is not read[^unchecked].

**There is no event injection.** concordance's header names `MISC_QUEUE_ACTION` as `0x03` and
`MISC_QUEUE_EVENT` as `0x09`[^x-concordance]; on these remotes `0x03` is unhandled and `0x09` is a no
operation that reports success, so a key event cannot be queued from a host[^s19][^t-usb-firmware]. **An
action can be**, on the Harmony 600, 650 and 700, through command state `0x34` of the version request's
payload family, [their usb page](../architectures/harmony-600-650-700/usb.md)[^s326]. Which capability
upstream meant by the two numbers is upstream's claim; what the images show is a no operation and an
absence.

### Selector `0x02` drops the cached region descriptors

**It is not a flash operation.** On the Harmony One its executor at `0x266B2` calls `0x2A05E`, which walks
three five byte records in **data memory** at `0x0EE8`, clears bit 0 of each, zeroes the other four bytes,
and through a leaf at `0x27C62` zeroes a two byte entry each in a second table at `0x0F24`; the handler
then clears bits 2 and 3 of the flags byte at `0x1A4`. Nothing in that call graph reaches a flash gate,
checked with a positive control from the erase handler, which does. The neighbouring routine `0x2A0C8`
walks the same records and decrements a three byte counter in each, so bit 0 is what makes a descriptor
live[^s246].

**On the Harmony 600, 650 and 700 it drops four, and arms the next erase for one extra step.** Read on the
Harmony 650's 0.2 build and byte identical on the Harmony 600's: the chain is at `0xC314` and selector
`0x02` at `0xC344`. It calls `0x15E1E`, the same walk over **four** records at `0x0EE6`, with a leaf at
`0x107A2` zeroing a two byte entry each at `0x063`; then clears bits 2 and 4 of the flags byte at `0x68B`,
which are the verdict and the bit that selects which container a read goes to, and writes 1 to `0x725`.
That byte is read by ERASE_FLASH's parse handler at `0xC240`: the first erase after a drop clears it
wherever the erase is, and only if that erase is at exactly `0x030000`, the configuration's first block,
does it read setting `0x80` from the settings store in internal program memory, clear its bit 0, and write
it back. The erase itself goes ahead either way[^s282]. How the store keeps its records, and what is lost
when it is compacted, is [their memory page](../architectures/harmony-600-650-700/memory.md). So the drop
writes nothing persistent itself, and what it arms can reach internal program memory, two blocks below the
identity block and never the block itself[^s282]. On a Harmony 650 the drop takes `0x68B` from `0x16` to
`0x02` and `0x725` from 0 to 1, as read[^s282b].

**What it is for**: a remote re-validates its configuration only when its verdict is gone, so the drop is
what makes it re-check the bytes just written rather than keep a verdict earned against the old ones; a
write without it leaves a Harmony One with a status screen asking to be synced, and a write with it does
not[^s250][^s247][^s248]. concordance names it `invalidate_flash` and sends it as the first step of a
configuration write; the purpose is right and the name is not, and `MISC_INVALIDATE` in
`packages/usb/src/protocol.ts` carries the correction[^x-concordance][^s246]. `packages/usb` sends it behind `assertInvalidateAllowed`, and it has
been sent to a Harmony One and a Harmony 650[^s247][^s282b].

### Selector `0x06` sets the update status byte

Data memory `0x100` holds the **update status byte**, and at start up a safe mode image that finds it 2 or 6
installs the application staged in external flash[^s295]. Selector 6 writes it and READ_MISC's selector 6
reads it[^s298].

* **On the Harmony 700's 2.3 safe mode image** the parser reads the packet's bytes in order into `0xD09`,
  `0xD0B`, `0xD0A`, `0xD0D` and `0xD0C`, the chain sends 6 to `0x039B6`, and that arm takes `0xD0B` as a
  one byte index and `0xD0A` as a one byte value. So the value is the packet's **fourth** byte, not the low
  byte of a sixteen bit value, and index 0 is data memory `0x100`[^s295].
* **On the Harmony 700's 2.5 application** the chain at `0x0C314` sends 6 to `0x0C364`, which moves the
  packet's third byte into `0x102` and its fourth into `0x103` and calls `0x19868`, which stores `0x103`
  into `0x100` when `0x102` is 0[^s297]. **On 2.8** the arm is at `0x0C400` and calls `0x1AB96`, the same
  five instructions[^s298].

So `A3 06 00 02` means the same to the running application as to the safe mode image, which is what
Logitech's firmware template for skin 66 assumes: it sends `A3 06 00 02`, reads it back with `B2 06 00`
expecting `C2 06 02`, and restarts the remote with the escape's `0x02`[^s295c]. The safe mode image's
install routine at `0x02B90` then copies the application staged at external `0x000000` into internal
`0x9000`, clamped to `0x15C00` bytes, and stores 0 back[^s295]. `updateStatusWriteRequest` and
`updateStatusReadRequest` in `packages/usb` build those bytes, and `requestFirmwareReinstall` sends them
behind `assertReinstallAllowed`; a Harmony 700 asked this way, in safe mode and from its 2.5 application,
installed its staged image both times[^s295b][^s297b][^t-status-byte]. The Harmony 600's and 650's 0.2
safe mode images carry the routine's status normalisation, inside a routine at `0x01A80` called from
`0x0107E`; their selector 6 handlers and every safe mode image's escape handler are not
read[^s295][^unchecked].

### `WRITE_MISC` selector `0x0A` is the restart command

The first byte after the selector is an **entry point** and the second a configuration type, the same field
order as every other selector's 16 bit address[^s97]. **On the Harmony One it does nothing at all.** On the
Harmony 600, 650 and 700 it acts for entry points `0x05`, `0x07`, `0x08`, `0x09` and `0x0A`, by pushing two
action list instructions into the interpreter, operand then opcode, at `0x1AD` through
`0x1AF`[^s97][^t-usb-firmware]:

| | operand | opcode |
|---|---|---|
| first | the entry point, high byte `0xB0 \| (configuration type & 0x0F)` | `0x3F` |
| second | `0xFFF4` | `0x07` |

Every other entry point, terminate included, is acknowledged and ignored. Logitech's client numbers eleven
entry points, start and stop learn among them, and the five the firmware acts on fall on its start update,
start learn, stop learn, start upgrade and stop upgrade, which confirms the client's order; the client's
names and its learn session are [the classic client](../logitech/classic-client.md)[^s97]. So the learn
session the client sends a Harmony One through this selector is ignored by that remote[^s97].

## `0xE0` is an escape with a sub-command byte

At `0x0BD58` the masked command is compared against `0xE0`, and if it matches, a second byte is read and
dispatched: **`0x01`, `0x02`, `0x03` and `0x05`**. So the byte known as `0xE1` RESET is command `0xE0`
with a length nibble of 1 and one payload byte, which selects the kind of reset. Sub-command `0x05`
stores `0x05` into the state variable's dispatch input at `0x0BDA8`, which is what makes the `0x05` row of
the command table an internal continuation rather than a command a host sends[^s19][^t-usb-firmware].

**The Harmony One has the escape too**, at `0x26434`, with `0x01`, `0x02` and `0x03` and without `0x05`. It
tests with `SUBWF` where the others use `XORLW`, so it is not an XOR chain and a search for one misses it.
An unrecognised sub-command falls through into the ordinary command chain on both rather than being
rejected[^s97][^t-usb-firmware]. Which sub-commands each architecture dispatches is generated into each
architecture's usb page from `ESCAPE_SUB_COMMANDS`; on the Harmony 525 the escape is not read.

| sub-command | effect | One 3.4 | 700 2.8 |
|---|---|---|---|
| `0x01` | clears the command state variable and disarms the parsed address. **Not a reset** | `0x2645A` | `0x0BD82` |
| `0x02`, `0x03` | sets a flag that drives the top level mode to 3, which waits and then executes the PIC18 `RESET` instruction | `0x26468` | `0x0BD92`, `RESET` at `0x1642C` |
| `0x05` | the internal continuation | absent | `0x0BDA0` |

Read in the firmware[^s97][^s298]. So the reset Logitech's client sends after a configuration write really
does restart the remote, and the one gentler operation ends the command session and changes nothing else;
neither takes a remote out of USB mode[^s97]. A clean session that ends without either does not leave a
remote stuck in USB mode, since USB mode's exit is gated on the command state being zero and a completed
read clears it[^s99].

**There is no factory reset in this protocol.** Logitech's client sends three of the escape's codes, all
from its diagnostics layer: one resets the USB interface, one resets the remote and one invalidates a test
firmware image, and a fourth method, for clearing test flags, has an empty body. The first two match the
firmware's `0x01` and `0x02`. No archive section holds the client's list, and which code the third is,
and what it does on a remote, is not checked[^unchecked]. The factory reset Logitech does offer is not a command at all: a hidden recovery tool
in its clients installs a whole factory firmware image fetched over the network, and only for the
generation of the Harmony Touch, [the Touch's firmware](../architectures/harmony-touch/firmware.md)[^s196].

## Learning infrared

A remote learns a code by watching its own infrared receiver while somebody presses a key on the old
remote, and the samples go to the host as they arrive.

**It is a bracket, and only two commands are inside it.** START_IRCAP, `0x70`, sets state 5, and the state
5 chain at `0x0C5D4` accepts exactly one command, `0x80` STOP_IRCAP, which sets state 6; that is why `0x80`
is absent from the idle command table. **Any other command during a session ends it**: the fall through at
`0x0C5EE` clears the state and sets the error byte, with no error reply. States 6 and 7 share the executor
at `0x0CB20`, which sets state 7 and acknowledges `0xF0 0x70`. The Harmony 600 0.2 image carries the same
shape at its own addresses[^s91][^t-usb-firmware]. Every architecture, the Harmony 525 included, configures
CCP2 as a capture on both edges while CCP1 drives the transmit carrier, so all of them have an infrared
receiver in firmware[^s91][^t-usb-firmware].

**The samples are never sent by a routine: the endpoint is pointed at them.** START_IRCAP clears two 66
byte buffers at `0x0600` and `0x0642` and a toggle at `0x0684`; the capture path fills whichever is open,
and the transport points the endpoint 1 IN buffer descriptor straight at it, `0x40E` and `0x40F`, with the
count at `0x40D`. So no routine emits the report code `0x90`: it is stored into the buffer at
`0x602`[^s98]. **The reports are unsolicited**, so a host has to keep reading through the session[^s98].

On the Harmony One a learn report is 64 bytes: `0x90`, a sequence byte advancing by `0x10`, then samples as
**big endian `u16` durations** differenced from CCP2, with the payload length repeated in the last byte.
That is the configuration's own encoding, bit 15 marking a pulse, so what comes off the remote is already
the shape an infrared record wants. The Harmony 600, 650 and 700 write the same header, through `INDF`;
the differencing that turns a capture into a duration is the Harmony One's alone[^s98].

**What Logitech's client expects of the stream**, on its word alone[^s91b]:

* a learn report has a **zero length nibble** and carries its real byte count in the **last byte** of the
  report, which agrees with the firmware above; between them, a byte of two nibble counters, then big
  endian `u16` words, `(count - 2) / 2` of them
* the two counters are a sequence from 0 to 15 and a dropped counter; an increase of the dropped counter
  means twice that many samples were lost, so **samples go in pairs**
* **the first three words are calibration**: a last pulse on time, a first pulse time and a clock count,
  the carrier period being the gap between the times over one less than the count, in microseconds
* then envelope and gap alternate. An envelope is microseconds on every architecture this reference
  covers, and a count of carrier cycles only below architecture 2; a gap is total elapsed time, so the
  envelope before it is subtracted
* **stopping a learn can restart the remote**, and the client waits an architecture specific delay after
  the stop before anything else

The calibration arithmetic and the counters have not been checked against a remote[^unchecked]. The
client's own session, entering and leaving learning through the restart command, is
[the classic client](../logitech/classic-client.md).

## A configuration write, in order

Logitech's Desktop client's file for the Harmony One writes a configuration in eight steps, each with its
acknowledgement[^s245b]:

1. Reset the USB side, no reply expected.
2. `WRITE_MISC` selector `0x0A`, the restart command, with the entry point meaning **start upgrade**.
3. `WRITE_MISC` selector `0x06`, address 0, value 0, then `READ_MISC` on the same selector and address to
   confirm the byte reads back as 0.
4. `WRITE_MISC` selector `0x02`, which the client calls invalidating the flash region.
5. `ERASE_FLASH` per block, walking the region from its base for as many blocks as the file covers.
6. Per chunk: `WRITE_FLASH` with a base address and a size, then 150 data packets of 63 bytes, then a done
   packet. A chunk is 9450 bytes.
7. `WRITE_MISC` selector `0x06`, address 0, value 2, then read it back to confirm.
8. Restart the remote and wait for it to come back.

So the update status byte is written 0 before the erase and 2 after the write, which is the value that
asks a safe mode image to install a staged application; and on a Harmony One step 2 does nothing, since
selector `0x0A` is ignored there[^s245b][^s97][^s298]. Addresses are three bytes and sizes two, high byte
first, as `packages/usb` encodes them[^s245b].

**The literal bytes in these files are not consistent** about whether the leading byte already carries
the length nibble: some commands are written as the bare command code and some with the nibble folded
in. So a byte from them is read as a command, a selector and arguments, and the nibble is recomputed
rather than copied, which `encodeRequest` in `packages/usb` does[^s245b].

concordance writes a configuration in eight steps of its own, dropping the cached descriptors first and
restarting the remote last, and setting the remote's clock among them[^x-concordance].
`packages/usb` sends the drop before the first erase and the restart after the last write, each behind its
own rail, and does not set the clock, since its writer stamps the configuration instead. A Harmony One
written that way came back on its own and did not ask to be synced[^s247].

## Not checked

* Whether the length nibble mapping differs in safe mode, which is a separate firmware[^unchecked].
* What the low nibble of GET_VERSION's code `0x28` means, if anything, [the version block](version-block.md)[^unchecked].
* What sets the chunk size `0xED3` on the Harmony 700's READ_FLASH path[^unchecked].
* What three bytes the internal case `0x05` parses[^unchecked].
* Whether the USB hardware can drop a streamed report[^unchecked].
* The escape and WRITE_MISC on the Harmony 525, beyond what its dispatch shows[^unchecked].

[^s19]: Read in the firmware. [Section 19](../../docs/findings.md#s19)
[^t-usb-firmware]: Read in the firmware. [The test](../../tests/test_usb_firmware.py)
[^s210]: Measured on a unit. [Section 210](../../docs/findings.md#s210)
[^s267]: Read in the firmware. [Section 267](../../docs/findings.md#s267)
[^s304]: Read in the firmware. [Section 304](../../docs/findings.md#s304)
[^s175]: Read in the firmware. [Section 175](../../docs/findings.md#s175)
[^s192]: Read in the firmware. [Section 192](../../docs/findings.md#s192)
[^s19b]: Measured on a unit. [Section 19](../../docs/findings.md#s19)
[^t-remote]: Measured on a unit. [The test](../../packages/usb/test/remote.test.ts)
[^unchecked]: Not checked.
[^s76]: Measured on a unit. [Section 76](../../docs/findings.md#s76)
[^s94]: Read in the firmware. [Section 94](../../docs/findings.md#s94)
[^s223]: Measured on a unit. [Section 223](../../docs/findings.md#s223)
[^s119]: Read in the firmware. [Section 119](../../docs/findings.md#s119)
[^s22]: Measured on a unit. [Section 22](../../docs/findings.md#s22)
[^s96]: Read in the firmware. [Section 96](../../docs/findings.md#s96)
[^s25]: Measured on a unit. [Section 25](../../docs/findings.md#s25)
[^s88]: Read in the firmware. [Section 88](../../docs/findings.md#s88)
[^s268]: Measured on a unit. [Section 268](../../docs/findings.md#s268)
[^s226]: Measured on a unit. [Section 226](../../docs/findings.md#s226)
[^x-concordance]: Stated by a third party. [concordance](https://github.com/jaymzh/concordance)
[^s23]: Measured on a unit. [Section 23](../../docs/findings.md#s23)
[^s93]: Measured on a unit. [Section 93](../../docs/findings.md#s93)
[^s100]: Measured on a unit. [Section 100](../../docs/findings.md#s100)
[^s213]: Stated by Logitech, in their client. [Section 213](../../docs/findings.md#s213)
[^s245b]: Stated by Logitech, in their client. [Section 245](../../docs/findings.md#s245)
[^s222]: Measured on a unit. [Section 222](../../docs/findings.md#s222)
[^s269]: Measured on a unit. [Section 269](../../docs/findings.md#s269)
[^s281]: Measured on a unit. [Section 281](../../docs/findings.md#s281)
[^s243]: Read in the firmware. [Section 243](../../docs/findings.md#s243)
[^t-external-erase]: Read in the firmware. [The test](../../tests/test_external_erase.py)
[^s282]: Read in the firmware. [Section 282](../../docs/findings.md#s282)
[^s191]: Read in the firmware. [Section 191](../../docs/findings.md#s191)
[^s212b]: Stated by Logitech, in their client. [Section 212](../../docs/findings.md#s212)
[^s212]: Read in the firmware. [Section 212](../../docs/findings.md#s212)
[^s298]: Read in the firmware. [Section 298](../../docs/findings.md#s298)
[^s111]: Measured on a unit. [Section 111](../../docs/findings.md#s111)
[^s283]: Measured on a unit. [Section 283](../../docs/findings.md#s283)
[^s340]: Measured on a unit. [Section 340](../../docs/findings.md#s340)
[^s48]: Measured on a unit. [Section 48](../../docs/findings.md#s48)
[^s90]: Read in the firmware. [Section 90](../../docs/findings.md#s90)
[^s90b]: Measured on a unit. [Section 90](../../docs/findings.md#s90)
[^s97]: Read in the firmware. [Section 97](../../docs/findings.md#s97)
[^s326]: Read in the firmware. [Section 326](../../docs/findings.md#s326)
[^s246]: Read in the firmware. [Section 246](../../docs/findings.md#s246)
[^s282b]: Measured on a unit. [Section 282](../../docs/findings.md#s282)
[^s250]: Read in the firmware. [Section 250](../../docs/findings.md#s250)
[^s247]: Measured on a unit. [Section 247](../../docs/findings.md#s247)
[^s248]: Measured on a unit. [Section 248](../../docs/findings.md#s248)
[^s295]: Read in the firmware. [Section 295](../../docs/findings.md#s295)
[^s297]: Read in the firmware. [Section 297](../../docs/findings.md#s297)
[^s295c]: Stated by Logitech, in their client. [Section 295](../../docs/findings.md#s295)
[^s295b]: Measured on a unit. [Section 295](../../docs/findings.md#s295)
[^s297b]: Measured on a unit. [Section 297](../../docs/findings.md#s297)
[^t-status-byte]: Read in the firmware. [The test](../../tests/test_harmony_700_status_byte.py)
[^s99]: Read in the firmware. [Section 99](../../docs/findings.md#s99)
[^s196]: Stated by Logitech, in their client. [Section 196](../../docs/findings.md#s196)
[^s91]: Read in the firmware. [Section 91](../../docs/findings.md#s91)
[^s98]: Read in the firmware. [Section 98](../../docs/findings.md#s98)
[^s91b]: Stated by Logitech, in their client. [Section 91](../../docs/findings.md#s91)
