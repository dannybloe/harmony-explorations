# Predictions for Logitech's compile of the Harmony 350's test setup on the Harmony 300, written before it is run

`todo-compile-300.md` 4.3. The bench Harmony 300 is to be given the file the bench Harmony 350 ran its
twenty step test on, Logitech's compile of the test setup, the lab's `work/setups/h350-test/compile-Result.EzHex`
(fixture `h350_logitech_setup_ir`, the test `packages/bench/irtests/done/350-3-3-logitech-setup.json`), and
the test `packages/bench/irtests/300-4-3-350-compile.json` is to be pressed through with the Flirc listening.
This is what that run should hear, written down and committed before it, so the run can refute it.

**Where the prediction comes from.** The two remotes are one moulding and run one program, linked twice with
one change, `tests/test_harmony_300_350_images.py`. The 300's keys raise the codes of the 350's keys in the
same place, 49 of them heard, `reference/remotes/harmony-300/keys.md`. A configuration is a program for that
firmware and nothing in either build reads which model a configuration states,
`tests/test_harmony_350_skin.py`. So the prediction is that **the file does on the 300 what it does on the
350, key for key**, with the keys read by place: the 350's TV/Media, Cable/PC, AVR/Game and DVD/Music are the
300's TV, Cable/Sat, DVD and VCR/Aux (top left, top right, bottom left, bottom right), the 350's favourite
block is the European 300's (below), and the colour keys are not pressed. What each press sends is read out
of the file by the 350's own test, `packages/bench/test/setup350.test.ts`, and is not derived again.

## The predictions

**P1. The write is accepted.** `write-file-config.ts --unit h300` reads the unit's identity, finds the unit
check passing and the unit holding its own configuration (the backup), writes the file in 39 chunks as it did
on the 350, the check answers `m`, the read back is identical less the end marker and the reboot is sent.
*Falsified by* a refusal, a failed check or a read back that differs. **Not checked**: that the 300's
configuration file has room for this file, 118513 bytes against the 97470 the 300 held; nothing states the
limit and the dry run only counts chunks.

**P2. Every step hears what the 350's did, on the 300's keys.** Step by step, as codes of the file:

| step | presses | predicted |
|---|---|---|
| 1 | TV short, Volume Up, Info | LG TV Volume Up (code 1), LG TV Info (code 15) |
| 2 | TV long, Volume Up, up key | Denon Volume Up (14), Knoll Timer (code 3) |
| 3 | Cable/Sat short, Volume Up, Menu | Plasma Volume Up (42), Plasma Menu (32) |
| 4 | Cable/Sat long, Volume Up, Exit | Denon Volume Up (14), Kodi code 2 |
| 5 | DVD short, Volume Up, Info | Denon Volume Up (14), Denon Info (11) |
| 6 | DVD long, Volume Up, digit 1 | Denon Volume Up (14), Switch Input 1 (code 1) |
| 7 | VCR/Aux short, Volume Up, Previous Channel, List | Denon Volume Up (14), KPN Channel Previous (4), KPN code 14 |
| 8 | VCR/Aux long, Volume Up, Stop | Denon Volume Up (14), Sony HT Stop (20) |
| 9 | TV short, Power (once or twice) | ends on LG TV Power Off (49) |
| 10 | DVD short, Power (once or twice) | ends on Denon code 12 |
| 11 | Watch TV | LG TV Power On (38), Denon code 6, KPN Power Toggle (9), Denon CBL/SAT input (31) |
| 12 | Volume Up, Previous Channel | Denon Volume Up (14), KPN Channel Previous (4) |
| 13 | Channel Up, digit 1 | silence |
| 14 | Watch TV | LG TV Power Off (49), Denon code 12, KPN Power Toggle (9), no input |
| 15 to 19 | the five favourite keys, P6 | channels 1, 2, 3, 666 and 07 |
| 20 | TV short, Volume Up | LG TV Volume Up (code 1) |

*Falsified for a step* by a different code, a missing one or a sound where silence is predicted. Two of the
350's keys are replaced, which is a change to the test and not a prediction: **Enter by Exit**, since no
Enter code was ever heard on a 300 (`reference/remotes/harmony-300/keys.md`, "Not checked") and Kodi's map
binds Exit (scan code 12, measured on a 300) to its code 2, and **DVR by List**, the 300's key in the place of the
350's DVR, whose code 16 the KPN's map binds to the code 14 the 350 heard.

**P3. A short press chooses on release and a long press chooses when held, on the 300 as on the 350.** The
file binds each device key's press to a pin and two timers, its release to the short press device and its
held event to the long press device, which is how a 350 and not how the 300's own configurations select,
whose press selects (`reference/architectures/harmony-300-350/memory.md`, "A device key and its long press").
The keypad scan that raises a release and a held event is one routine in the two images. So a device key
pressed briefly selects its device when it is let go, and one held for about two seconds selects the long
press device without the release choosing the short press one: **steps 2, 4, 6 and 8 hear the Knoll, Kodi,
the Switch and the Sony HT, and not the LG TV, the Plasma, the Denon and the KPN.** *Falsified by* any long
press that is heard in its short press device. A key that stays on its short press device after two seconds
would say the 300's hold time is not the file's.

**P4. Watch TV does what it did on the 350.** From everything off, the four codes of step 11 in that order
with the Denon's input after its two second wait, and from everything on, step 14's three. The state is the
file's own variables, so a power state different from the 350's would come from the remote's memory and not
from the model. *Falsified by* a different order, a missing code or an input to the TV.

**P5. The power on delays are the 350's.** Those of the file, 10 s for the LG TV and so on, as step 1 of
the 350's run predicted and its two runs found. Nothing is predicted of a key for another device pressed
inside a wait, which nobody has tried.

**P6. The favourites, by the codes of the places.** The 350's favourites are code 8 (1, left of Input), 9 (2,
below left), 11 (3, below middle), 34 (4, below right) and 2 (5, right of Input), carrying channels 1, 2, 3,
666 and 07 in the KPN's map. The European 300 keys of the same places are the key printed 1, the key
printed 2, **Teletext**, the key printed 4 and the key printed 3, so the five presses of steps 15 to 19 should
send channel 1, 2, 3, 666 and 07 in that order. This depends on the 300's favourite codes being the 350's by
place: codes 8, 9, 2 and 34 were heard for the four keys printed 1 to 4 from the order they were pressed in,
and Teletext is 11 by elimination only (`keys.md`). **A competing reading is on the record**:
on an earlier compile the key printed 2 sent the channel the key printed 3 should have, which was not
explained, so the keys printed 2 and 3 may be swapped against the places. If steps 16 and 19 come out
swapped, that is the finding and the channel heard names the code. *Falsified by* any other digits.

**P7. A send from groups 4 to 7 changes a pin's list and no code.** The four long press devices send from
groups 4 to 7. On the 300 that send raises firmware event `0x2D`, group 0's, where the 350 raises `0x30`,
group 3's; each event's list in this file is one list on one output pin and nothing else,
`tests/test_harmony_300_350_send_events.py`, so **every code of steps 2, 4, 6 and 8 is the 350's, and the
only difference is the pin**. A receiver cannot hear that, and what the pins drive is not known, though the
manual says the Device buttons light while the remote sends. If they are the device key lights, then while a
group 4 to 7 device sends (the up key of step 2, Exit of step 4, the 1 of step 6, Stop of step 8) the same
light or lights glow as while the LG TV, group 0, sends (step 1's Volume Up), and **not** those that glow while
the KPN, group 3, sends (step 7's List); on a 350 it would be the other way round. The steps ask for the
lights as an observation with no verdict, since the mapping of pins to lights is not read. *Falsified, if
the lights are those pins,* by a long press device sending with the KPN's light and not the LG TV's. If no key
lights in any step, the half about lights is not tested.

**P8. Teletext is code 11.** In the KPN's mode the key sends channel 3 (P6). Its press in the TV's mode, not
tested here, was heard as the TV's Teletext.

**P9. Nothing is left in a state the 300 cannot leave.** After the run, a briefly pressed device key selects
and the remote answers as before. Writing the unit's own configuration back, `h300_programmed_config`, restores it; that
restore is the way out of the run and not a prediction.

## Why these and not more

The run is the 350's test, so a failure on the 300 is a difference between the models and not a new fact
about the file, which is what 4.3 is for. The long presses are in because they are the one place the
two images disagree. The colour keys and the rest of the 350's key table were heard on the 300 by
`packages/bench/irtests/done/300-2-1-every-key.json` and are not pressed again.
