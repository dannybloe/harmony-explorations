# Predictions: how Logitech's compiler turns a held power press into copies

Written on 2 October 2026, before the compile they predict, for todo item L9. Scored below once the
compiled files are read.

## The question

Logitech's catalogue can state a power press with a duration, `{command, durationMs}` in the archive's
schema version 2. Section 305 found one case: a Panasonic television held for 1000 ms, which the remote
holds as seven copies of each power code, and seven copies of 134.6 ms is the most that fits in a second.
One codeset is not a rule. This tests it on devices whose stated holds run from 300 ms to 15 seconds,
with Logitech's own compiler, by putting catalogue devices on two account records and compiling each.
The throwaway records were the first choice and Logitech refused to add to them, since every one was
registered with the Harmony 525's serial and the service treats that model as unsupported. So the
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

Not yet scored.
