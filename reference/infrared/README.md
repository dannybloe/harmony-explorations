# Infrared

**An infrared command is a lamp blinking in a precise rhythm.** The lamp sits at the front of the remote
and its light is invisible. When it is "on" it does not shine steadily: it flickers tens of thousands of
times a second, most often 38000, and a television's receiver listens only for light flickering at that
rate, which is how it ignores sunlight and lamps in the room.[^s92] That flicker is the **carrier**. A
command is a pattern of bursts of carrier and silences, each lasting somewhere between a few hundred
microseconds and a few milliseconds, and the lengths of those bursts and silences spell out a number.

**A Harmony stores the rhythm, not the meaning.** Its configuration holds every command as a list of
durations, burst, silence, burst, silence, together with the carrier's period, and names none of
them: nothing in the file says which of a television's ninety codes is volume up.[^s229] To send a code
the remote plays those durations back through the lamp, making the carrier itself in software.[^s13] How
the durations sit in the file is [infrared records](../config-format/infrared-records.md).

**The number inside the rhythm follows a protocol family.** Each maker spells numbers in light its own
way, and a code belongs to one of several hundred families that Logitech's device catalogue names and
states the rhythm of.[^s227] Knowing the family is what lets a command be read back as a number, compared
with Logitech's catalogue, given its name, and written again for a device that no configuration has
carried before.

**A press is not one send.** One press usually sends the code three times; holding the key repeats it for
as long as the key is down; and a power code may be held for a stated time so that a slow device
wakes.[^s258][^s308]

**Learning a code was Logitech's service's job.** The Harmony 880 manual says a learned signal is
uploaded to Logitech's web site, which looks for a matching pattern, converts a match into a compact form
and stores a miss as it was captured.[^s42] So the choice between a recognised family and a raw recording
was made on Logitech's server, not on the remote. The firmware of the Harmony One, 600 and 700 can play
four encodings[^s42b], and every record of the configurations measured uses one of them and never the
other three[^s42c]. That the server's choice is why the other three are unused is an inference from the
manual and not checked[^unchecked].

The pages, from the number outwards:

* [Frames](frames.md): how the number is spelt in durations, read back and rebuilt; biphase codes,
  cell tables, the six shapes of frame.
* [Families](families.md): how a family is named, how Logitech's catalogue writes a code, the rhythm
  table, what follows the frame, families sending several rhythms, and naming the commands a
  configuration sends.
* [Sending](sending.md): how many times a press sends a code, held keys and held power codes, how
  Logitech's compiler spells a block, and how the carrier is made.

[^s92]: Measured in configurations. [Section 92](../../docs/findings.md#s92)
[^s229]: Measured in configurations. [Section 229](../../docs/findings.md#s229)
[^s13]: Read in the firmware. [Section 13](../../docs/findings.md#s13)
[^s227]: Stated by Logitech, in their catalogue. [Section 227](../../docs/findings.md#s227)
[^s258]: Measured in configurations. [Section 258](../../docs/findings.md#s258)
[^s308]: Measured in configurations. [Section 308](../../docs/findings.md#s308)
[^s42]: Stated by Logitech, in the manual. [Section 42](../../docs/findings.md#s42)
[^s42b]: Read in the firmware. [Section 42](../../docs/findings.md#s42)
[^s42c]: Measured in configurations. [Section 42](../../docs/findings.md#s42)
[^unchecked]: Not checked.
