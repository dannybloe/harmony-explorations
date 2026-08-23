# Predictions: how a sequence's pause is stored

Written on 23 August 2026 **before** the config containing it was compiled, for the same reason
`docs/predictions-number-sender.md` was: a delay has no reading anywhere in this project, so whatever
turns up will look obvious afterwards, and a prediction written first is the only way to tell a real
result from a fitted one. Scored at the bottom, with nothing above the line edited.

## The sample

`MySequence`, authored by hand in Logitech's software inside the activity Danny calls "Tv kijken", and
put on a screen button on the second page of that activity's screen options.

| order | what |
|---|---|
| 1 | a command to the television |
| 2 | wait 1 second |
| 3 | a command to the set top box |
| 4 | wait 2 seconds |
| 5 | a command to the amplifier |
| 6 | wait 3 seconds |

Three sends to **three different appliances**, three **different** delays, and a delay in the **last**
position with nothing after it. A second sequence exists in the same activity, five sends with one
pause, which is the control for anything claimed about sharing.

**Why the delays are 1, 2 and 3.** The ratio is self calibrating: whatever unit the file stores, three
values in that ratio identify the scale without anybody guessing it. Stored as 1, 2, 3 the unit is
seconds; as 100, 200, 300 it is centiseconds; as 1000, 2000, 3000 milliseconds. A single delay would
have left the unit unknowable.

## The two hypotheses, and what separates them

**H1, an inline instruction.** The action list holds a wait opcode with the duration as its operand, so
the whole sequence is one list of six instructions and the interpreter blocks or yields on the wait.

**H2, a chain of timers.** Base slot 12's records are already read as a duration in **seconds** plus
**one** action list instruction, section 43, and one instruction is exactly enough to start the next
segment. Then a sequence with three pauses is four action lists chained by three timers, and the
"single instruction" that looked like a limitation is the mechanism.

They are separated by one query, the count of base slot 12 records, and neither needs the other ruled
out first.

## Numbered predictions

1. **The delays appear as 1, 2 and 3**, literally, because the timer reader already calls its field
   seconds. Falsified by any other triple in the ratio 1:2:3, which would still be a result: it would
   name the unit.
2. **H2 rather than H1**, so base slot 12 gains records and the action list gains no new opcode. The
   reason to expect it: the reading is at 98.4% of instructions with a meaning and no opcode anywhere
   in the corpus is unaccounted for, so an inline wait would have to be an opcode we have already read
   as something else, which is a worse bet than a structure that already exists and already fits.
3. **The trailing delay is emitted.** A pause in the last position does nothing observable, so a
   generator may drop it. Predicting it is kept because a timer whose instruction does nothing is
   harmless and dropping it takes special handling.
4. **Three timers for this sequence**, not one shared by all three pauses, since a timer carries its
   own duration and the three differ.
5. **The three sends name three different groups** in base slot 5, which is the cheap check that the
   right sequence has been found before anything is claimed about it.
6. **The sequence used on a screen button is one action list**, referenced by the page's binding, and
   not copied into it. This is the weakest of the six: nothing in the format needs a sequence to be
   shared, and the corpus already shows base slot 5 duration blocks and base slot 16 digit tables
   shared by address, so sharing is the house style rather than a rule.
7. **No new section and no new base slot.** Every slot is accounted for, so a sequence has to be built
   out of what is there.

## What would make this interesting rather than merely confirmed

If H2 holds, then **a sequence is not a structure in the format at all**. It is an editor concept that
compiles into lists and timers, which would mean the name and the grouping exist only in Logitech's
own account data, exactly as FreeHarmony's `docs/data-model.md` predicts for its own import. That is
worth knowing before an editor is built, because it says the authored form cannot be recovered and has
to be stored by whoever authors it.

## Scored

To be filled in after the file is read, with nothing above this line changed.
