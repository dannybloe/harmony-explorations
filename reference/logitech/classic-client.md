# Logitech's classic client on the wire

## 7. Measured against Logitech's own client, on the wire

Everything in sections 1 to 5 was derived from the firmware and then checked against this project's
own implementation. This section is different in kind: it is a packet log of **Logitech's classic
client** reading a Harmony One end to end, so the bytes were produced by an implementation that has
never seen ours. `docs/findings.md` section 210 is the argument and
`packages/usb/test/classic-capture.test.ts` is the check.

The capture is a lab fixture, not a device, so nothing here needs hardware.

### The whole read is three commands

| command | times | note |
|---|---|---|
| `0xE0` with sub-command `0x01` | 1 | the **first** command of the session, before the version read |
| `GET_VERSION` | 1 | |
| `READ_FLASH` | 1310 | each acknowledged once by `0xF0 0x50` |

Nothing else is sent. `READ_ONLY_COMMANDS` holds exactly these three, chosen by reading the
firmware, and the vendor uses precisely them to read a remote.

### Every request is byte identical to what this project builds

1312 of 1312, with the address as three bytes most significant first and the count as two. The
requests exercise length nibbles 0, 1 and 5 only, so they confirm the linear part of the mapping.

### The replies confirm the non-linear part, arithmetically

For each of the 1310 flash reads, the reply chunks' length nibbles decoded through
`payloadLengthForNibble`, less one sequence byte each, sum to exactly the byte count requested.
1310 of 1310. A linear reading of the nibble would account for 500 bytes of a 3100 byte read, so
this is a real constraint rather than a restatement.

| nibble | payload bytes | times seen |
|---|---|---|
| `0xA` | 63 | 65402 |
| `0x8` | 15 | 5 |
| `0x9` | 31 | 3 |
| `0x5` | 5 | 1 |

The short nibbles occur only as the tail of a transfer that is not a whole number of full chunks.

### What it reads on a Harmony One

| extent | bytes | reads |
|---|---|---|
| `0xFF` `+0xF400`, the identity block | 48 | 1 |
| `0x002000` to `0x020000` | 122880 | 40 |
| `0x040000` to `0x400000` | 3932160 | 1269 |

The application firmware between `0x020000` and `0x040000` is never requested. The two config
extents sum to the byte total the client itself reported.

**Sixteen regions is the client's own loop bound, not the remote's.** Its log warns that fourteen
regions could not be read, and no command is sent for any of them: it looks the region up in a table
keyed on architecture and index, and this build has entries only for architecture 12, regions 3 and
4, which are the second and third extents above. The remote is never asked.

### Its transfer unit is 3100 bytes

1307 of the 1310 reads, the rest being the identity block and one short tail per extent. 3100 is 50
times the 62 data bytes a full chunk carries, so a transfer is sized in whole packets. This project
uses 16384 and works, so the figure is a choice rather than a limit.
## Why the client is not an authority, demonstrated

Its own container constants for arch 8 do not describe any arch 8 config in this corpus. It
declares 20 pointer slots and a trailer at offset 91. Four real arch 8 configs put the marker at
95, which is `0x0B + 4 * 21`, so they carry 21 slots.

This is not a misreading of its convention, because the same convention reproduces arch 9 and
arch 12 exactly. It is the client being wrong, or describing a variant nobody here has, and
either way it is the reason rule 1 exists.

## What it confirms that we already derived

None of this is new knowledge and none of it changes a document. It is recorded because a
confirmation from an independent implementation is worth having, and because it calibrates how
far the rest can be trusted.

| what this project derived | the client agrees |
|---|---|
| the pointer table starts at `0x0B`, an item is 4 bytes and an address 3, section 20 | its three constants are 11, 4 and 3 |
| the marker sits at `0x0B + 4 * N` | its trailer offsets are 91 on arch 9 and 99 on arch 12 |
| 22 pointer slots on arch 12, 20 on arch 9 and 14 | the same three numbers |
| the arch 12 user config is at `0x040000` | the same |
| the arch 12 log area writer refuses outside `[0x040000, 0x400000)`, section 47 | it declares the user config region as exactly that range |
| the arch 12 safe mode container is at flash `0x002000` | the same |
| the arch 14 user config is at `0x030000` | the same |
| the arch 14 safe mode image is at internal `0x1000`, not where the file named `-safe.bin` suggested | the same |
| internal memory is two 64 KiB pages, `0xFE` and `0xFF`, so 128 KiB is reachable | it declares one `0xFE0000` region of `0x20000` |
| base slot 3 is the clock, section 21 | its section index 3 is named for the clock |
#### And the session around it, from the Desktop client, for the Harmony One specifically

A second client, independently, and this one states the whole sequence rather than the report
format. Four commands, and the two sources agree wherever they overlap:

1. **Enter learning.** A restart command with a subcommand, an entry point selecting start learn,
   and a configuration type selecting the current firmware: `0xA0 0x0A 0x07 0x00`. One reply packet,
   beginning `0xF0 0xA0`.
2. **Start capture.** `0x70`, with a timeout far longer than any other command here, answered by
   exactly **two** packets.
3. **Stop capture.** `0x80`, answered by an **unspecified number** of packets, the last of which
   begins `0xF0 0x70`.
4. **Leave learning.** The same restart command with the stop learn entry point,
   `0xA0 0x0A 0x08 0x00`, preceded by a two byte no-op and ending on `0xF0 0xA0`.

**This narrows what section 91 could not find, and does not close it.** That section established the
bracket from the firmware, `0x70` opening and `0x80` closing and states 6 and 7 acknowledging with
`0xF0 0x70`, and then failed to find any code that sends capture data. What this client adds is that
the sample packets are **collected under the two capture commands and terminated by that same
acknowledgement**: it reads a fixed two packets after the start and an unspecified number after the
stop, stopping at `0xF0 0x70`. So the samples ride the ordinary response path on the one IN
endpoint, which is why no separate sender was ever going to turn up.

**The two clients do not obviously agree here**, and the disagreement is the useful part. The
classic client, section 91, takes learn reports off a queue its reader thread has already filled,
sending nothing, which reads as the remote pushing reports unsolicited while a session is open. This
one models the same bytes as a command's response stream. Both end at `0xF0 0x70` on the same
endpoint, so they can be the same wire behaviour described from two heights, but which it is decides
what an implementation has to do: keep reading during the session, or read after the stop. **Not
established, and it is the question to put to the firmware**, whose answer is the response path of
the `0x70` and `0x80` handlers rather than a search for a sender that does not exist.

The **restart command is `WRITE_MISC` selector `0x0A`** and it is wider than
learning. Its entry points cover terminate, default, before and after a config update, after a
firmware update, start and stop update, start and stop learn, and start and stop upgrade; its
configuration types are current firmware, user configuration and embedded configuration.

**Read from the firmware on 9 August 2026, section 97, and it partly contradicts this file.** On
arch 14 the selector acts for exactly five entry points, and numbering the client's list from zero
those are start update, start learn, stop learn, start upgrade and stop upgrade. The client's own
`0x07` and `0x08` land on start learn and stop learn, so **the firmware confirms this list's order**,
which is the first check of it against anything. Terminate is entry point zero, and it does nothing.

**On arch 12 the whole selector is a no-op**, four instructions that set a "packet handled" flag. So
the `0xA0 0x0A 0x07 0x00` this file records the client sending **to a Harmony One** is ignored by the
Harmony One. That is what a host written across skins looks like rather than an error in the
reading, and it is this file's standing caveat in one example: the client says what it sends, never
what the remote does with it.

**It is a write, whatever the flash rails say.** Sending it restarts a remote into a mode, so an
implementation belongs behind `WRITES_ENABLED` in `packages/usb/src/rails.ts` alongside the flash
writes, and nothing in a read path may issue it. Section 97 does not soften that: on arch 14 it
injects two action list instructions into a running interpreter.
### Its liveness ping is a macOS workaround, and that is the row to act on

Section 213, and it is the only thing found in this client so far that bears on a fault this project
has actually seen on hardware.

Every access to a running remote in this client is followed by `selectivePingUnit`, whose entire body
is a platform test: **on macOS it pings the unit, and on every other operating system it does
nothing.** The ping is not a network ping despite its inherited name. It sends one harmless read, the
version block, or on one architecture the first byte of EEPROM, and treats a reply that does not parse
as a failure. Two consecutive failures log that the thread could not be recovered.

It is called after every RAM read, every RAM write, every state variable read and write, every erased
flash block, and every written flash chunk.

**Why it matters here.** This project develops and measures on macOS, and it carries two intermittent
faults it cannot explain: a Harmony One that drops the first command of a session, which
`packages/corpus/src/read.ts` works around by sending the first command twice, and a Harmony One that
strands after sitting idle on USB and needs its batteries pulled. Logitech shipped a workaround for
something platform specific on the same platform, in the same place a command completes. That does not
identify the cause and it is not evidence that the causes are the same. It does say the vendor met a
macOS specific stall and chose to insert an extra read after every operation, which is a cheap thing
to try.

Client sourced and unconfirmed, like everything else here. What would settle it is a bench measurement
rather than more reading.

### The write transfer, from an implementation that is not ours

Section 213, and it agrees with section 175 in shape while being an entirely separate reading:

1. an announce naming the address and the length,
2. every data packet built into an array, with a done packet appended as its **last element**,
3. the whole array handed to the sender in **one call**,
4. one reply read after the batch.

**Nothing is paced and nothing is read between packets**, and there is no sleep anywhere in the send
path. `docs/review-before-first-write.md` keeps the pacing question open because the firmware side was
read and the USB peripheral's own buffer ownership was not; this is the client's answer to the same
question and it is "no pacing at all". It is not proof about the endpoint.

Two more rules of theirs worth having:

* a chunk is sized at fifty whole packets, which is the same fifty the read path uses, section 210
* a failed chunk is **retried once**, and if the retry fails the whole write aborts and the unit is
  pinged. Not per byte, and not indefinitely.

**Erasing before programming is the caller's decision, not the write's.** Their write takes a flag,
and when it is set the whole range is erased first, block by block. So this client cannot answer
"does programming erase first"; it answers "when the caller says so". The one caller that writes a
region passes true, and invalidates the region beforehand.

**Their write does not verify itself either**, which is this project's own arrangement arrived at
separately: no comparison happens anywhere in their chunk loop, and the read back with three retries
lives one layer up, in the caller that owns the erase. And there is no on device checksum to lean on
instead, since the method for it exists and throws.

### Erasing the identity block is a write path nothing here had described

Section 213. It is the one operation in this client that would destroy something irreplaceable, so it
is written down rather than left in a note.

| architecture | what it does |
|---|---|
| 12 | reads a **kilobyte** at the identity block, blanks the first 64 bytes, writes the kilobyte back |
| 14 | writes 64 blank bytes, with no read at all |
| 7 and 8 | writes a **bootloader unlock** value first, then reads 64 KiB, blanks 48 bytes of it and writes it back |

Three things follow. The block is **64** bytes when it is being erased and **48** when it is being
read, which is the same boundary `docs/memory-map-one.md` describes as 64 bytes with its fourth field
erased. The arch 7 and 8 arm is the only place in this whole client where anything is unlocked before
a write, so if a write protect interlock exists on those architectures, that constant pair is where it
is named; this repository has no arch 7 or 8 write target and does not need it, and it is recorded
because `docs/review-before-first-write.md` calls the interlock the highest value target it has.

Writing a serial back is the mirror of this and its arch 9 arm passes erase-all **false**, alone among
the flash writes here. That is consistent rather than odd: arch 9 keeps its identity in on chip EEPROM,
which takes a write without an erase.

### State variables are addressed by name, and are word wide above architecture 7

Section 213. Their reader walks the per architecture data table, keeps the entries of one type, and
reads each by index; their writer **re-reads the whole set, refuses unless the names still match, and
then looks up each name's current index** before writing. It never writes a variable it considers a
system one.

That is their version of the rail this project states as base slot 13's first records belonging to the
firmware, and it is stricter in one way worth copying: an index is not assumed stable between a read
and a write.

Word wide on architectures 8, 9 and 12, byte wide below 8. **Architecture 14 falls between the two**,
into a byte path whose own assertion is that the architecture is under 8, so a Harmony 600 or 700 would
violate it. Read together with this build's region table, which has an architecture 12 arm and no
other, the reading is that **this build drove arch 12 and was never exercised on arch 14**.

### The region index space, and what each index names

Section 212. The client uses one set of region numbers for two different things, and keeping them
apart matters because the numbers overlap nothing.

| index | what it names | where this project already had it |
|---|---|---|
| 0 | boot loader | version block field 7, program `0x000017` |
| 1 | safe mode | field 10, `0x001007` |
| 2 | normal mode, the application | field 11, `0x009007` |
| 3 | the embedded configuration | flash `0x002000`, 122880 bytes, section 210 |
| 4 | the user configuration | flash `0x040000`, `0x3C0000` bytes, section 210 |
| 5 | the CPLD image | field 9, `0xFF0000` |
| 7 | the Z-Wave module | no field on either architecture this project reads |
| 11 | the PIC library | field 8, `0xFFE000` |

**Indices 3 and 4 are storage it reads; the rest are images with a version.** Its list of region ids
returns `0, 1, 2, 5, 11`, plus `7` when the remote reports a Z-Wave version, and it never includes 3
or 4. So a region id in one call is not a region id in the other.

**That list is computed from the version block, not asked of the remote.** It is gated on the reply
carrying a bootloader version and returns nothing at all when it does not, and no packet is sent. This
document is where that belongs precisely because it is easy to read the method's name as a query: it
is not one, and section 210's capture shows the remote is never asked.

**That warning was already earned, in the lab, before it was written.** A read out this project built
on 7 August 2026 documents `getRegionIds` as the remote naming its own regions, which is the same
misreading, and it sat in a file inside Logitech's package name where nothing here could see it.
Section 214.

### Where a region read is allowed to go, and what it closes on

Section 214. The addresses in the table above are not only measurements off a capture. The client
carries them, in `UpdateHidService`, as one switch for the address and one for the size, and between
them they name **two regions and one architecture**:

| architecture | region | address | size | ends at |
|---|---|---|---|---|
| 12 | 3, the embedded configuration | 8192 | 122880 | `0x020000` |
| 12 | 4, the user configuration | 262144 | `0x3C0000` | `0x400000` |

**This predicts the extents the client actually read**, exactly, on all four numbers: section 210's
capture went from `0x002000` to `0x020000` and from `0x040000` to `0x400000` and nowhere else in
flash. The table was read on 29 August 2026 and the capture made on 7 August, by routes with nothing in
common, and neither was derived from the other, so this is the independent closure the rest of this
document mostly cannot offer. Both ends carry a test.

Two consequences. **The vendor's own classic client reads a region on a Harmony One and on no other
architecture**, and the refusal is thrown while the call is being built rather than answered by a
device, so asking for a region an architecture has no entry for costs an exception and no packet.
Section 213 noted the single architecture arm in passing; this is the same fact with its numbers. And a
region is **not a second protocol**: `readRegion` sizes a buffer from the table and hands the matching
address to the ordinary flash read, so nothing on the wire says region.

### Every single byte write it makes is read back, and there is no unverified variant

Section 211, out of the three single byte memory services: RAM, on chip EEPROM and internal program
memory. Each offers one read and one write, the write is named for verifying, and its body writes,
reads the same address back and compares. A mismatch throws. There is no second method that writes
without the read back, so a caller cannot choose to skip it.

That is the same rail this project already imposes on flash, "every write is followed by a read of
the same range and a byte comparison", arrived at independently. It is worth recording because it is
the vendor doing it at the finest granularity there is, one byte, where the cost of the extra round
trip is highest.

### Its own address bounds, and why they are a lead rather than a limit

| what | the client's bound | this project's rail |
|---|---|---|
| RAM | address below 256, value a byte | address below `0xF40`, the special function register page |
| on chip EEPROM | address below 256, value below 16384 | none, nothing here writes EEPROM |
| internal program memory | address below 8192, value below 16384 | none, nothing here writes program memory |

**All three are Java assertions, which do not run unless the virtual machine is started with them
enabled**, and nothing in the client's own launcher does. So these are the author's statement of
intent and not a guard in the shipped software, which is exactly why they are a lead: they say where
Logitech expected these commands to be used, and they say nothing about what the firmware accepts.

The RAM row is the one that touches a rail here. `packages/usb/src/rails.ts` bounds a RAM write below
`0xF40` because bank 15 holds the self programming registers, and the reasoning behind that is
unchanged and still right. What is new is that the vendor never intends an address above 255 at all,
which is sixteen times tighter. **Tightening our rail to match is not done here**, because a rail is
a decision rather than a consequence, and the argument for it should be made on its own.

The value widths disagree with each other and the disagreement is recorded rather than explained: RAM
asserts a byte, while EEPROM and program memory both assert fourteen bits. A byte wide on chip EEPROM
has no use for 16383, so either that assertion is copied from the program memory service or the
command's field is wider than the storage it addresses. Nothing available here decides which.
### The clock is read and written over USB by name, and it agrees with the firmware

*`hid/services/time/TimeHidService.java`, read 28 August 2026, section 209. Unlike everything above it
this comes out of `hid/services/` rather than `hid/commands/`, which is the half of the layer the lab
extraction never opened.*

The client sets a remote's clock by writing **state variables 0 to 6**, in order, as second, minute,
hour, day of month, day of week, month and year, and reads them back the same way. That is base slot
13's first seven records exactly as section 130 reads them and as section 111 measured them live in a
Harmony One's data memory, which is a third route to a field assignment that already had two.

This said three details disagree with us. **Two of them were ours, `docs/findings.md` section 322**:
the client was right about the day and the weekday, and the firmware's month end routine says so on
every image read. The third stands.

* the client reads the day of month as the stored value **plus one** and writes it **minus one**, and
  that is how the field counts: the 1st is 0. This said section 111 measured the byte as 6 on 6 August
  2026, so the field held the day itself; the day was the 7th, and the 6th came from the stamp read
  that same wrong way.
* the client takes the day of week only on architectures 8 and 12, and on every other one it reads the
  month from index 4 and the year from index 5. Architecture 9 (Harmony 525) and architecture 14
  (Harmony 600 and 700) put the month at index 5 like the others, measured: one Harmony 525 config
  stores 3, 9 and 13 at indices 4, 5 and 6 for a build stamped 2 October 2013, where 3 is the weekday
  counted from Sunday, 9 is the zero based month and 13 is the year since 2000.
* the client writes the weekday as Java's `DAY_OF_WEEK` minus one, which counts from **Sunday**, and
  so does the record. Section 111's Saturday epoch was the Sunday count of the day after, which is
  what the misread day made it look like.

The client does send a **clock recalculate**, misc selector 8, after writing, which is the one thing
that could repair the second. It sends it only on the two architectures it believes carry a
day of week, and `reference/usb-protocol/commands.md` reads selector 8 as doing nothing at all on architecture 12,
so on the one bench architecture where it is sent it is not the repair.

**What this is evidence for is the field assignment and its counting.** It was written up as evidence
against trusting a client, on two disagreements that were this project's own misreading; the one left,
the month's index on architectures 9 and 14, would put the wrong date on those remotes' screens.
