# Logitech's classic client on the wire

The classic client is the desktop software Logitech shipped before MyHarmony, the one the Harmony One
came with. It is written in Java and not obfuscated, so what it does to a remote can be read, and its
read of a Harmony One has been captured packet by packet. This page is what that software sends and what
it believes: the commands of a read, how it writes, how it reads the clock, and the memory regions it
names for each architecture.

**A client says what it sends, never what the remote does with it.** Where the firmware has been read,
[the commands](../usb-protocol/commands.md) is the authority and wins any disagreement[^d9]; a fact on
this page that nothing else confirms is marked as stated in their client. One demonstration of why: the
client's own container constants for the Harmony 880 and 885 declare 20 pointer slots and a trailer at
offset 91, while every configuration of that architecture puts its marker at 95, which is
`0x0B + 4 * 21`, so they carry 21 slots[^t-gspm][^s206]. The same convention reproduces the Harmony 525's
and the Harmony One's tables exactly, so this is the client being wrong rather than a misreading of
it[^t-host-client].

## A whole read of a Harmony One is three commands

| command | times | note |
|---|---|---|
| `0xE0` with sub-command `0x01` | 1 | the **first** command of the session, before the version read |
| `GET_VERSION` | 1 | |
| `READ_FLASH` | 1310 | each acknowledged once by `0xF0 0x50` |

Nothing else is sent[^t-capture]. The three are the commands a read only host needs, and the firmware's
own dispatch says the same, [the command table](../usb-protocol/commands.md#the-command-table).

**Every request is byte identical to one built from the firmware reading**, 1312 of 1312, with the
address as three bytes, most significant first, and the count as two[^t-capture]. The requests use length
nibbles 0, 1 and 5 only, so they confirm the linear part of the mapping from nibble to length.

**The replies confirm the rest of it, arithmetically.** For each of the 1310 flash reads, the reply
chunks' payload lengths, each less its sequence byte, sum to exactly the byte count requested, 1310 of
1310[^t-capture]. A linear reading of the nibble would account for 500 bytes of a 3100 byte read, so the
closure constrains the mapping rather than restating it.

| nibble | payload bytes | times seen |
|---|---|---|
| `0xA` | 63 | 65402 |
| `0x8` | 15 | 5 |
| `0x9` | 31 | 3 |
| `0x5` | 5 | 1 |

The short nibbles occur only as the tail of a transfer that is not a whole number of full
chunks[^t-capture].

### What it reads

| extent | bytes | reads |
|---|---|---|
| internal page `0xFF` `+0xF400`, the identity block | 48 | 1 |
| flash `0x002000` to `0x020000`, the embedded configuration | 122880 | 40 |
| flash `0x040000` to `0x400000`, the user configuration | 3932160 | 1269 |

**The application firmware between `0x020000` and `0x040000` is never requested**, and the two
configuration extents sum to the byte total the client itself reports[^t-capture].

**Sixteen regions is the client's own loop bound, not the remote's.** Its log warns that fourteen regions
could not be read, and no command is sent for any of them: it looks each region up in a table keyed on
architecture and index, and that table has entries only for the Harmony One's regions 3 and 4, the
second and third extents above[^t-capture][^s214]. The region table is below.

**Its transfer unit is 3100 bytes**, 1307 of the 1310 reads, the rest being the identity block and one
short tail per extent. 3100 is 50 times the 62 data bytes a full chunk carries, so a transfer is sized in
whole packets[^t-capture]. A Harmony One answers larger reads as well, so the figure is the client's
choice rather than a limit[^s210].

## What its constants agree with

None of this is new, and it is recorded because a confirmation from an implementation that never saw the
firmware readings is worth having[^t-host-client].

| what the firmware or the configurations show | the client states |
|---|---|
| the pointer table starts at `0x0B`, an item is 4 bytes and an address 3 | the three constants 11, 4 and 3 |
| the marker sits at `0x0B + 4 * N` | trailer offsets of 91 on the Harmony 525 and 99 on the Harmony One |
| 22 pointer slots on the Harmony One, 20 on the Harmony 525, 600, 650 and 700 | the same three numbers |
| the Harmony One's user configuration is at `0x040000` | the same |
| the Harmony 600, 650 and 700's user configuration is at `0x030000` | the same |
| the Harmony 525's safe mode image at `0x800000` and application at `0x810000` | the same, with an embedded configuration of 32 KiB at `0x820000` |
| base slot 3 holds the configuration's build stamp, framed by `0xADDF` and `0xEFBF` | its section index 3 is named for the clock, with the same two words |

A test holds every row[^t-host-client]. The client also declares the Harmony One's user configuration
region as exactly `[0x040000, 0x400000)`, the range that model's log area writer refuses outside[^s47],
and its embedded configuration at flash `0x002000`[^t-host-client].

## Learning a code, as Harmony Desktop states it for the Harmony One

Harmony Desktop, a later client, describes the learning session for the Harmony One by name, in four
commands[^s91]:

1. **Enter learning**: the restart command with an entry point selecting start learn and a configuration
   type selecting the current firmware, `0xA0 0x0A 0x07 0x00`. One reply, beginning `0xF0 0xA0`.
2. **Start capture**: `0x70`, with a timeout far longer than any other command, answered by two packets.
3. **Stop capture**: `0x80`, answered by any number of packets, the last beginning `0xF0 0x70`.
4. **Leave learning**: the restart command with the stop learn entry point, `0xA0 0x0A 0x08 0x00`,
   after a two byte no-op, ending on `0xF0 0xA0`.

**The two clients disagreed about the samples and the firmware sides with the classic one**: Harmony
Desktop reads them as a command's reply stream after the stop, while the classic client takes reports
its reader thread collected during the session. The remote pushes them unsolicited, so a host keeps
reading for the whole session[^s98]. Where they leave the remote is
[the commands](../usb-protocol/commands.md#learning-infrared).

**The restart command is `WRITE_MISC` selector `0x0A`, and the client's list of entry points is wider
than learning**: terminate, default, before and after a configuration update, after a firmware update,
start and stop update, start and stop learn, and start and stop upgrade, with configuration types for
the current firmware, the user configuration and the embedded configuration[^s97b]. The firmware confirms
the order of that list, and **on the Harmony One the whole selector does nothing**, so the
`0xA0 0x0A 0x07 0x00` this client sends a Harmony One is ignored by it[^s97],
[the restart command](../usb-protocol/commands.md#write_misc-selector-0x0a-is-the-restart-command).
Sending it is a write all the same: on the Harmony 600, 650 and 700 it puts two instructions into the
running interpreter[^s97].

## Its liveness ping, on macOS only

Every access to a running remote is followed by a ping whose body is a platform test: **on macOS it sends
one harmless read, and on every other system it does nothing**[^t-host-client]. The read is the version
block, or on one architecture the first byte of EEPROM, and a reply that does not parse counts as a
failure; two in a row are logged as a thread that could not be recovered[^t-host-client]. It follows every
RAM read and write, every state variable read and write, every erased flash block and every written flash
chunk[^s213].

So Logitech met something on macOS that made them insert a read after every operation. Whether it is the
same thing as a Harmony One dropping the first command after sitting idle on the cable,
[its behaviour](../remotes/harmony-one/behaviour.md#the-first-command-after-idling), is not
known[^unchecked].

## How it writes

**A flash write is an announce, a batch and one reply**[^t-host-client]:

1. an announce naming the address and the length,
2. every data packet built into an array, with a done packet as its **last element**,
3. the whole array handed to the sender in **one call**,
4. one reply read after the batch.

**Nothing is paced and nothing is read between packets**, and there is no sleep anywhere in the send
path[^s213]. A chunk is fifty whole packets, the same fifty as a read; a failed chunk is **retried once**,
and if the retry fails the whole write aborts and the remote is pinged[^t-host-client].

**Erasing first is the caller's decision, not the write's.** The write takes a flag, and when it is set
the range is erased first, block by block[^t-host-client]. The one caller that writes a region passes true,
and invalidates the region beforehand[^s213].

**The write does not verify itself.** No comparison happens in the chunk loop; the read back, with three
retries, is one layer up, in the caller that owns the erase, and the method for an on device checksum
exists and throws[^s213].

**Every single byte write is read back, with no unverified variant.** RAM, on chip EEPROM and internal
program memory each have one read and one write, and the write writes, reads the same address back and
throws on a mismatch[^t-host-client].

### Its address bounds, which are only assertions

| what | the client's bound |
|---|---|
| RAM | address below 256, value a byte |
| on chip EEPROM | address below 256, value below 16384 |
| internal program memory | address below 8192, value below 16384 |

**All three are Java assertions, which run only when the virtual machine is started with them enabled**,
and the client's launcher does not enable them, so they say where Logitech expected these commands to be
used and nothing about what the firmware accepts[^t-host-client]. The value widths disagree with each
other: a byte wide on chip EEPROM has no use for 16383, and nothing available decides whether that
assertion was copied from the program memory service or the field is wider than the storage[^t-host-client].

### Erasing the identity block

The one operation in this client that would destroy something irreplaceable, and it differs by
architecture[^t-host-client]:

| architecture | what it does |
|---|---|
| Harmony One | reads a **kilobyte** at the identity block, blanks the first 64 bytes, writes the kilobyte back |
| Harmony 600, 650 and 700 | writes 64 blank bytes, with no read at all |
| arch 7, and the Harmony 880 and 885 | writes a **bootloader unlock** value first, then reads 64 KiB, blanks 48 bytes of it and writes it back |

The block is **64** bytes when it is erased and **48** when it is read, the same boundary
[the Harmony One's memory](../architectures/harmony-one/memory.md) describes as 64 bytes ending in sixteen
zero bytes. The arch 7 and 8 arm is the only place in this client where anything is unlocked before a
write[^s213]. Writing a serial back is the mirror of this, and its Harmony 525 arm alone passes erase
first as **false**: that remote keeps its identity in on chip EEPROM, which takes a write without an
erase[^s213].

## State variables are read and written by name

The reader walks the architecture's data table, keeps the entries of one type and reads each by index.
The writer **re-reads the whole set, refuses unless the names still match, and looks each name's index up
again** before writing, and it never writes a variable it counts as a system one[^t-host-client]. So an
index is not assumed stable between a read and a write.

**A variable is a word on the Harmony 880 and 885, the Harmony 525 and the Harmony One, and a byte below
architecture 8.** The Harmony 600, 650 and 700 fall into the byte path, whose own assertion is that the
architecture is below 8, and the region table below has a Harmony One arm and no other, so this build
drove the Harmony One and was never exercised on the Harmony 600, 650 or 700[^t-host-client].

### The clock, by name

**The client sets a remote's clock by writing state variables 0 to 6 in order**, as second, minute, hour,
day of month, day of week, month and year, and reads them back the same way[^t-host-client]. That is base
slot 13's first seven records, [the clock records](../config-format/state.md)[^s209].

* **The day of the month counts from 0**: the client reads the stored value plus one and writes it minus
  one, and the firmware's month end routine agrees[^s322].
* **The weekday counts from Sunday**: the client writes Java's day of week minus one, and so does the
  record[^s322].
* **The client is wrong about where the month is on two architectures.** It takes the day of week only on
  the Harmony 880 and 885 and the Harmony One, and on every other architecture reads the month from index
  4 and the year from index 5. The Harmony 525, 600, 650 and 700 keep the weekday at index 4 and the month
  at index 5 like the others, measured in their configurations, so the client would put the wrong date on
  those remotes[^t-host-client-configs].

After writing it sends **misc selector 8**, a clock recalculate, and only on the two architectures it
believes carry a weekday[^t-host-client]. On the Harmony One selector 8 does nothing at all, so there it is
not a repair, [READ_MISC and WRITE_MISC](../usb-protocol/commands.md#write_misc-and-the-answer-on-event-injection).

## The region numbers

**The client uses one set of region numbers for two different things**[^s212]:

| index | what it names | where the remote states it |
|---|---|---|
| 0 | the bootloader | version block field 7 |
| 1 | safe mode | field 10 |
| 2 | normal mode, the application | field 11 |
| 3 | the embedded configuration | flash `0x002000`, 122880 bytes |
| 4 | the user configuration | flash `0x040000`, `0x3C0000` bytes |
| 5 | the CPLD image | field 9 |
| 7 | the Z-Wave module | no field on either architecture read |
| 11 | the PIC library | field 8 |

**Indices 3 and 4 are storage it reads; the rest are images with a version.** Its list of region ids
returns 0, 1, 2, 5 and 11, plus 7 when the remote reports a Z-Wave version, and never 3 or 4, and that
list is **computed from the version block, not asked of the remote**: it is empty when the reply carries
no bootloader version, and no packet is sent[^s212][^s214].

**Where a region read may go is two regions on one architecture.** The client carries an address and a
size per region and names exactly two, both on the Harmony One[^t-host-client]:

| architecture | region | address | size | ends at |
|---|---|---|---|---|
| Harmony One | 3, the embedded configuration | `0x002000` | 122880 | `0x020000` |
| Harmony One | 4, the user configuration | `0x040000` | `0x3C0000` | `0x400000` |

**That table predicts the capture exactly**, on all four numbers, by a route with nothing in common with
it[^t-host-client][^t-capture]. Asking for a region an architecture has no entry for throws while the call
is being built, so it costs an exception and no packet; and a region read is an ordinary flash read of the
table's address, with nothing on the wire that says region[^t-host-client].

[^d9]: Chosen by this project. [Decision 9](../../docs/decisions.md#d9)
[^t-gspm]: Measured in configurations. [The test](../../tests/test_gspm.py)
[^s206]: Stated by Logitech, in their client. [Section 206](../../docs/findings.md#s206)
[^t-host-client]: Stated by Logitech, in their client. [The test](../../tests/test_host_client.py)
[^t-capture]: Stated by Logitech, in their client. [The test](../../packages/usb/test/classic-capture.test.ts)
[^s214]: Stated by Logitech, in their client. [Section 214](../../docs/findings.md#s214)
[^s210]: Measured on a unit. [Section 210](../../docs/findings.md#s210)
[^s47]: Read in the firmware. [Section 47](../../docs/findings.md#s47)
[^s91]: Stated by Logitech, in their client. [Section 91](../../docs/findings.md#s91)
[^s98]: Read in the firmware. [Section 98](../../docs/findings.md#s98)
[^s97b]: Stated by Logitech, in their client. [Section 97](../../docs/findings.md#s97)
[^s97]: Read in the firmware. [Section 97](../../docs/findings.md#s97)
[^s213]: Stated by Logitech, in their client. [Section 213](../../docs/findings.md#s213)
[^unchecked]: Not checked.
[^s209]: Stated by Logitech, in their client. [Section 209](../../docs/findings.md#s209)
[^s322]: Read in the firmware. [Section 322](../../docs/findings.md#s322)
[^t-host-client-configs]: Measured in configurations. [The test](../../tests/test_host_client.py)
[^s212]: Stated by Logitech, in their client. [Section 212](../../docs/findings.md#s212)
