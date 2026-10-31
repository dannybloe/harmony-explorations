# Predictions for the Harmony 300's keys, written before they were pressed

`todo-compile-300.md` 2.2. Every key of the bench Harmony 300 is to be pressed in two device modes with the
Flirc listening, `packages/bench/irtests/300-2-2-keys.json`. This is what that run should hear, written down
and committed before it, so the run can refute it.

**Where the prediction comes from.** The 300 and the 350 are one moulding with different printing, a
statement made holding both units and recorded in `packages/silhouettes/src/models/h300.ts`, and they run
one firmware image whose keypad scan numbers a key 1 to 56 from where it sits. The 350's keys were tied to
their codes at its bench, `reference/remotes/harmony-350/keys.md`. So the prediction is that **every key of
the 300 raises the code of the 350 key in the same place**. What each key sends below is then read out of
the configuration the unit holds, the lab's `work/300-delay/before.bin`, its own four device configuration,
traced through its lists by the generator kept beside the lab's `work/300-every-key/` files. Names are the
monitor's, from Logitech's catalogue; the KPN's codes have no names there and are given by number.

## The predictions

**P1. Every key raises the 350's code for its place.** In the television's mode 39 keys send a code no other
key of that mode sends, and in the KPN box's mode 32 do, so between the two modes every key but nine is tied
to one code by what it sends. If a key sends another key's code, or a key predicted silent sends anything,
P1 is wrong for that key.

**P2. The nine keys the file cannot tie.** Clear, Enter, TV Input, Live and the two arrows in the middle of
Menu, Info, Exit and Guide are bound in neither mode and are predicted to send nothing in both. Favourites
1, 2 and 5 send in the KPN box's mode only, and send a digit the digit keys send too, so they are checked by
position in the step and not by a code of their own.

**P3. The device keys.** TV, top left, selects the Panasonic television's mode and Cable/Sat, top right, the
KPN box's, and neither sends anything, as the 1.4 and 2.1 runs already showed.

**P4. The favourites in the KPN box's mode**: favourite 1 sends the KPN's 1, favourite 2 its 3, favourite 3
its code 22, favourite 4 three 6s, and favourite 5 its 2. These come from the number sender and the KPN's
map, read out of the file; the four channels the unit was given were 1, 2, 3 and 666, so a favourite
sending 3 and another sending code 22 is what the file says and is not explained here.

**P5. Every other key in both modes as the test's expectations state**, each traced through the file.
