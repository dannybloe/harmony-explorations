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

**Measured on 23 August 2026, and scored here on 29 August 2026**, which is six days later than it
should have been: the measurement had landed in the `writing-a-config` skill and in `CLAUDE.md`'s rails
table while this document still read as an open prediction. The whole value of a predictions document
is its record of which predictions were wrong, so an unscored one is the one state that makes it
worthless.

**The headline prediction is refuted. It is H1, not H2.**

| # | prediction | outcome |
|---|---|---|
| headline | H2: a sequence compiles away into lists and timers, and the action list gains no new opcode | **wrong.** It is H1: the pause is an opcode, `0x7C`, inline in the action list |
| the unit | seconds, on the strength of Logitech's own interface offering whole seconds | **wrong.** Tenths of a second, in the low byte, so 25.5 seconds is the ceiling the format can express and their stated 20 second limit sits just under it |
| 6 | a sequence on a screen button is one action list, referenced rather than copied | not separately measured; the delay reading did not turn on it |
| 7 | no new section and no new base slot | **right.** A sequence is built out of what is already there |

**What the run found instead is worth more than the arithmetic was**, and it is a hazard rather than a
format fact: a 25 item sequence at Logitech's own stated maximum expands to roughly 55 three byte
instructions, and heavy tapping of the touch panel while it runs hung a Harmony One three times out of
three, batteries out each time, against five runs that completed. Reproducible rather than variance,
and the mechanism is open. So **their stated maximum is not a safe bound**, and the rail a writer needs
is bounded by the **peak depth** of the forty instruction action queue rather than by their item count.
Section 238 derived that number from the firmware and `assertQueueFits` implements it; this document
said the rail was implemented nowhere, which was true until 1 September 2026.

**On "what would make this interesting" above**: H2 is refuted, so the question it raises does not
arise. A sequence's delays are in the config, in the action list, and a reader can recover them.
