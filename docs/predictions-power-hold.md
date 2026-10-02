# Predictions: how Logitech's compiler turns a held power press into copies

Written on 2 October 2026, before the compile they predict, for todo item L9, and scored below against
it. **B's principle was right and most of its counts were wrong**: a copy is a frame, and on one record an
ordinary press's worth is a floor.

## The question

Logitech's catalogue can state a power press with a duration, `{command, durationMs}` in the archive's
schema version 2. Section 305 found one case: a Panasonic television held for 1000 ms, which the remote
holds as seven copies of each power code, and seven copies of 134.6 ms is the most that fits in a second.
One codeset is not a rule. This tests it on devices whose stated holds run from 300 ms to 15 seconds,
with Logitech's own compiler, by putting catalogue devices on two account records and compiling each.
The throwaway records were the first choice and Logitech refused to add to the two tried, which, like
all twelve, carry the Harmony 525's serial; why it refused is not stated in its reply. So the
devices go on the first test account's Harmony 650 and Harmony 700 records, for the compile only, and
are removed afterwards. No remote is involved.

## The hypotheses

* **A, the copies fit whole.** The once block holds `floor(hold / copy)` copies, where `copy` is one
  frame plus the gap after it, as the compiled block states them.
* **B, the last gap is free.** `floor((hold + gap) / copy)`: the gap after the final copy does not count
  against the hold.
* **Neither**: some other count, a cap, or the hold ignored where no activity uses the device.

The section 305 television already scores them, on the compiled lengths: A gives 7, and B gives 7 too,
by 2.1 ms. On the catalogue's own waveforms, which run 0.9 ms per copy shorter than the compiled ones,
B would give 8 for `PowerOn`. So the judgement uses the compiled block's own copy and gap, and the table
below uses the catalogue's waveforms only to say in advance where A and B can part.

## The devices, and the prediction for each

Copy and gap are off the catalogue's Pronto code for the held command. A is the prediction; B is listed
where it differs.

| record | device | power | command | hold ms | copy ms | gap ms | A | B |
|---|---|---|---|---|---|---|---|---|
| Harmony 700 | Panasonic TX-P42GT30E | on | PowerOn | 1000 | 133.7 | 74.8 | 7 | (8) |
| Harmony 700 | Panasonic TX-P42GT30E | off | PowerOff | 1000 | 135.4 | 74.8 | 7 | 7 |
| Harmony 700 | JVC DLA-HD10KU | on and off | PowerOn, PowerOff | 5000 | 57.6 | 20.8 | 86 | 87 |
| Harmony 700 | Barco 6300 | off | PowerToggle | 15000 | 115.9 | 92.9 | 129 | 130 |
| Harmony 650 | Panasonic TX-29AK40F | toggle | PowerToggle | 300 | 133.7 | 74.8 | 2 | 2 |
| Harmony 650 | Knoll HDP-1100 | on | PowerToggle | 800 | 216.0 | 96.1 | 3 | 4 |

What each row is for:

* **TX-P42GT30E** is the control. It is the section 305 television, so it must come out at 7 and 7. If
  it comes out at 1, the hold is applied only where an activity powers the device, since these records'
  activities do not include it, and the rest of the table measures nothing until that is fixed.
* **TX-29AK40F** shares a protocol family with the control and holds 300 ms, which tells rounding down
  from rounding up (3 under rounding up). A Panasonic TX-28PM10 holding 3600 ms was the first choice for
  where A and B part, and was replaced before anything was sent: it shares its command set with the
  TX-29AK40F, and the tool that adds devices refuses a command set a record already holds.
* **JVC DLA-HD10KU** holds both power codes 5000 ms, a fourth family with a short copy, and A and B part
  by one copy with 45 ms of margin under A.
* **Barco 6300** holds for 15 seconds, the longest in the catalogue, in a different protocol family. A
  cap on the number of copies, or on a block's length, would show here as a count well under 129.
* **Mitsubishi CS-40FX1**, a further family with a short copy and 22 copies under both hypotheses, was
  dropped for want of room: the two records take five devices between them, and it parts A from B
  nowhere.
* **Knoll HDP-1100** is a family that sends a repeat frame after the first, `Toshiba 32 Bit`, so one
  press is not one frame, and its Pronto code states 216 ms as its first section. A and B part here
  too. Which unit the compiler repeats for such a family is open, so this row may score neither and
  still answer something.

## What would falsify A

Any held command whose once block holds a count other than `floor(hold / copy)` on the compiled block's
own copy length, the control excepted if it shows the hold is not applied at all.

## Scoring

Scored on 2 October 2026 against the two compiles, section 306. **The principle of B was right and every
count it gave from the catalogue's waveforms but two was wrong**, for two reasons this document did not
anticipate.

| device | hold ms | A | B | compiled | |
|---|---|---|---|---|---|
| TX-P42GT30E, both codes, both records | 1000 | 7 | 7 or 8 | 7 | the control, right under A and under B on the compiled lengths |
| TX-29AK40F | 300 | 2 | 2 | 3 | wrong under both, and right under rounding up, which the control refutes |
| JVC DLA-HD10KU, both codes | 5000 | 86 | 87 | 111 | wrong unit: 111 frames, the first 57.6 ms and every later one 45.0 |
| Barco 6300 | 15000 | 129 | 130 | 130 | B right, A one short |
| Knoll HDP-1100, on | 800 | 3 | 4 | 8 | wrong unit: a frame and seven repeat frames of 107.9 ms |
| Knoll HDP-1100, off | 500 | | | 5 | not predicted; its off list holds the code three times at 500 ms |

* **The control came back at 7 on both records**, with no activity using the television on the 700, so
  the hold is applied to the device and not to an activity's power step.
* **The rule is B's, stated in frames**: as many frames as **end** inside the hold, the gap after the last
  one running past it, which on the compiled lengths fits the nine held records above their minimum
  exactly. There are ten; the tenth is the 300 ms row.
* **The unit was wrong.** This document took the catalogue's Pronto first section as one copy. For the
  JVC and the Knoll families the compiler repeats a shorter frame after the first, and it counts those,
  so a copy is a frame and not the Pronto section.
* **The floor was not predicted at all.** At 300 ms two frames end inside the hold and the compiler sends
  three, what that device's ordinary press sends. One record cannot tell that floor from a hold too short
  to change anything, nor from counting frames that start inside the hold, which gives three too.
* **Rounding up is refuted** by the control, where it gives 8, and the control is the only record that
  refutes it.

## Addendum: the television's own remote, predicted before listening

Written on 2 October 2026 before the run, for a bench session with the Flirc receiver, the Panasonic
TX-P42GT30E's original remote and the Harmony 650. Section 306 says what Logitech's compiler emits;
this asks what the remote the television came with does.

* **The Harmony 650** starting the activity that switches the television on sends `PowerOn` as seven
  frames, 134.6 ms apart, about 0.94 s in all, and its frames are the 650's configuration's.
* **The original remote's power button sends a toggle code**, the catalogue's `PowerToggle` and not
  `PowerOn`, since such remotes have one standby button.
* **Held, it repeats the frame for as long as the button is down**, at about the same 134.6 ms spacing,
  since the spacing is the family's frame and gap and not something the Harmony adds.
* **A quick tap sends fewer frames than seven.** How many is not predicted.
* **Whether the television switches on from a quick tap is not predicted.** If it does, the catalogue's
  one second is a margin of Logitech's; if it needs the button held, the one second is the television's.
