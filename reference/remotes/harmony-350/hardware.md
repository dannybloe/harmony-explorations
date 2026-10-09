# Harmony 350: hardware

What is inside, as far as anything here can say, which is little. No 350 has been opened and the library
reads no memory off one. What the firmware's file table states about storage is the architecture's,
[the architecture's memory.md](../../architectures/harmony-300-350/memory.md).

| | value | standing and source |
|---|---|---|
| processor | a PIC18, by its firmware image; the part is **not checked** | read in the firmware, section 196 |
| internal flash | 128 KiB, by the firmware's file table | read in the firmware, section 199 |
| external storage | 512 KiB, 119 KiB in use, as concordance reported it | third party, section 194; the part is **not checked** |
| power | "Insert the two AA batteries (included)" | Logitech's manual |
| USB socket | a cable to a computer for setup and sync | Logitech's manual |
| device keys | each lights while an infrared command is sent | Logitech's manual: "Each Device button will light up when an IR command is being sent" |
| face | the Harmony 300's moulding, key for key, with different printing | a statement from the bench holding both, `packages/silhouettes/src/models/h300.ts` |

## Not checked

* The processor and storage parts, the RAM size.
* Infrared transmitters, range, learning, backlight, size and weight: the manual is a setup guide and
  states none of them.
