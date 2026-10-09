# Harmony 300: hardware

What is inside, as far as anything here can say, which is little. No 300 has been opened and the library
reads no memory off one. What the firmware's file table states about storage is the architecture's,
[the architecture's memory.md](../../architectures/harmony-300-350/memory.md).

| | value | standing and source |
|---|---|---|
| processor | a PIC18, by the firmware image it shares with the 350; the part is **not checked** | read in the firmware, section 196 |
| internal flash | 128 KiB, by the firmware's file table | read in the firmware, section 199 |
| external storage | **not checked** on a 300 | |
| power | "Insert the two AA batteries into the battery compartment" | Logitech's manual, the setup guide |
| face | the Harmony 350's moulding, key for key, with different printing | a statement from the bench holding both, `packages/silhouettes/src/models/h300.ts` |

## Not checked

* The processor and storage parts, the RAM size.
* Infrared transmitters, range, learning, backlight, size and weight: the setup guide states none.
* Whether the 300's device keys light while sending, as the 350's manual says the 350's do.
