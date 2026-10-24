# Harmony 525 test notes

The bench Harmony 525: what was done to it, in order, and what this project holds of it. What the remote
and its platform are is [the reference](../../reference/architectures/harmony-5xx/README.md); what was
predicted before each step and how it scored is [the predictions](../predictions/harmony-525.md). This file
started as the session records of the 525's memory map, moved here by plan 009.

## Why architecture 9 was worth the trouble

It **was** the worst covered architecture in the corpus by a wide margin, and it is not any more: the byte
accounting reads **100.0%<!--fact:coverage_h525_config-->** against 100.0% on both target architectures,
with nothing left unattributed in either of its user configurations since section 84, and its safe mode
container at 98.2% since section 85. The reasons it lagged were all the same reason: there was no arch 9
firmware anywhere, so every structure that did not decode had nothing to appeal to. That changed on 8
August 2026, when the application image came off this unit's external flash and its internal program flash
came off over USB.

**The margin was almost entirely one structure**, infrared class 5, which was 24467 of the 26368 bytes then
unaccounted, until section 82 read it out of that firmware. Two items came off the list before the remote
arrived and without the code: base slot 7's two bit glyphs, section 63, and the mode record tail, section
64, which between them took the accounting from 14.6% to 49.8%, and section 65's header reading took it to
55.1%. Not every arch 9 gap needed the code.

## The configurations

Two user configurations of this architecture are in the lab, one read off this unit, 51195 bytes and in
Dutch, section 149, and one published by another owner before the unit arrived, 78486 bytes; plus the safe mode container cut out of this unit's firmware
region at flash `0x818000`, and its configuration region in five 64 KiB blocks. The names are in
`tests/lab.py` and `packages/lab`, and the corpus totals in `docs/status.md`.

All 14<!--fact:container_checks_arch9--> container checks pass on the contributed sample. Fourteen and not
fifteen because the `AHCM` family carries no key table after the marker, so `key_table_is_complete` does
not apply here.

**Nothing can compile a new one**: Logitech's service has the product switched off, section 145. So **what
can put a configuration back on this unit is this project's own region reads**: the five blocks of the
configuration region were read before the first write, and a block of them can be written back, section
269. The 8629 bytes above the end of the current configuration on this unit are not erased, the tail of an
earlier one, section 270.

## The first session, 8 August 2026

Five things to settle, kept in the original order and wording with the outcome against each, because a
list of intentions rewritten after the fact teaches nobody anything.

| | outcome |
|---|---|
| 1. the command layer | works, with three arch 12 assumptions removed from `packages/usb` first |
| 2. the version block | seven of seven predicted bytes right, and the block is seven fields rather than twelve |
| 3. product id and `bcdDevice` | both exactly as reported; the `PROFILES` entry existed and its base was wrong |
| 4. a configuration read | 51195 bytes, filed, checksum recomputes, a second arch 9 sample at last |
| 5. the firmware | in the lab, load address derived with a wide margin |

In rough order of value, as written before the session:

1. **Whether the USB command layer works at all.** `packages/usb` was derived from arch 12 and arch 14
   firmware, and nothing established that an EasyZapper era remote answers the same commands with the same
   length nibble mapping. `GET_VERSION` is the whole test, and if it fails, everything below waits.
2. **The version block**, against the predicted table. Twelve bytes, seven of them predicted.
3. **The product id and the `bcdDevice`**, against `0xC111` and `0x0916`. A `PROFILES` entry in
   `packages/corpus/src/read.ts` carries the product id, the base and the 512 KiB ceiling, with
   `unverified: true` so that the difference between a measured profile and a reported one is in the data
   and not only in a comment. If the report is right, a configuration read simply works. If it is wrong
   the failure is loud rather than silent: `readConfig` checks for the container magic at the base and
   refuses when it is not there.

   **This entry did not exist until 8 August 2026, and the memory map claimed it did**, in those words,
   from the day it was written. Nobody would have found out until the remote was plugged in and the read
   refused. Worth recording because the document's whole purpose was to make the first session a test, and
   an untested claim about our own code is the one kind of prediction that cannot teach anything when it
   fails.
4. **A configuration read**, verified against its own container checks and filed in the lab. That is a
   second arch 9 sample, which the corpus had never had, and two samples is where this project's
   verification standard starts.
5. **The firmware.** The prize, and the least predictable part. `loadaddr.find_base` is what to reach for
   once there are bytes, and the margin over the runner up is what says whether to believe it.

## Data memory and `READ_MISC`, 9 and 13 August 2026

A `READ_MISC` selector `0x07` sweep of 1696 addresses over six general purpose banks and the special
function register page answered zero for every one, against a Harmony 600 and a Harmony One that return
live data in the same banks, section 90. A sweep of nine selectors, 1 among them, answered zero too, and
for selector 1 that was the decoder reading the wrong byte of the reply, section 90's correction. Selector 1
has not been sent to this unit since the decoder was corrected.

The data memory window was read on 13 August 2026 with the application running and answered zeros with a
control, the clock prediction's outcome 1, section 137.

## Safe mode, 11 August 2026

The unit was put into safe mode by the published key procedure and would not come out, so the state was
measured rather than wasted, section 118: internal program flash before and after, the stored copies, the
version block and the product string in safe mode. EEPROM byte 0, the bootloader's install byte, read 0
while it was stranded, section 119.

Leaving it was done once, by hand, from a script in the private lab that set byte 0 to 2 and restarted the
remote, and the unit came back with its application and its configuration intact, section 119. This
project's write path does not do it, and the 525 skill and `CLAUDE.md` forbid entering safe mode as an
experiment.

## The first write, 6 September 2026

One block at `0x820000`, the unit's own bytes put back unchanged, with both neighbouring blocks read before
the erase and after it and found byte identical, and the whole configuration read back through a different
reader with the SHA-256 of the August read, section 269. The remote did not restart. No edit has been
written to this unit.
