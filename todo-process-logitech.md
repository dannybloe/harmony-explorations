# Todo: process what was gathered from Logitech's service

**What this is**: [todo-secure-logitech.md](todo-secure-logitech.md) gathers Logitech's compiles into the
lab while their service still runs. This todo works out the rules from those files and lands them in the
proper places in this repository: the rhythm table the composer writes infrared from, the format
specification, the findings and the per remote reference. None of it needs the service.

**The order**: after the gathering todo, before [todo-compile-650.md](todo-compile-650.md) resumes.

---

## 1. A reference folder and a skill for every bench model that gets a compile

The gathering starts each folder with its `features.md` (gathering 3.2); the rest of the folder, laid out
as `reference/remotes/harmony-650/` is, is where this todo lands what it works out. Each model gets a
skill the way the Harmony 650 has `harmony-650`: read the folder first, plus that remote's write and
bench procedure. Moved here from todo-later 5.7; the 525 and the Touch, which get no compile, stay there.

- [x] 1.1 Harmony One, one folder for the model and one skill naming both units: the spare is a write target and the everyday one never is; its behaviour file carries section 337, the click before every screen command and the held touch, now in `docs/how-a-harmony-works.md`; done: `reference/remotes/harmony-one/` and the `harmony-one` skill
- [x] 1.2 Harmony 600, beside the 650 in `reference/architectures/harmony-600-650-700/`; done: `reference/remotes/harmony-600/` and the `harmony-600` skill
- [x] 1.3 Harmony 700, beside the 650 in the same architecture folder; done: `reference/remotes/harmony-700/` and the `harmony-700` skill
- [x] 1.4 Harmony 300 and Harmony 350, the file based family; done: `reference/remotes/harmony-300/` and `harmony-350/`, an architecture folder `reference/architectures/harmony-300-350/`, and one skill `harmony-300-350`, since their procedure is identical

## 2. The infrared families the composer refuses

Measured on 7 October 2026 over the archive, without the service: 641 families hold a command the
composer refuses, and the reason splits three ways.

Done when the composer's own test over the archive refuses no command, `make composecensus`. Before 2.2
four in five commands composed and 10046 of 54118 code sets had none that does; since findings section 348,
1999026 of 2067863 commands compose and 2115 code sets have none, since section 350 1998947 and 2119, and
since section 359 2038021 and 766, and since section 361 2038315 and 761.

- [x] 2.1 The 151 families whose catalogue notation our reader does not read, about 53000 commands; Logitech's definition exists for every one, so this is reading work, checked against the compiles in the lab; check first whether these are the 52517 commands refused because the composer takes digit widths from the family name (was `todo-later.md` 6.14); findings section 359: they are, one rule, 52658 commands of 156 families as measured now, read at the definition's widths 39074 compose, and the rest are refused for a release group, a count of 0 or a conflicting count (2.2.2 to 2.2.4), or are not infrared or misspelt in the catalogue (172)
- [ ] 2.2 The 482 families that lack only the press repeat count, about 339000 commands: take it from the device, `timing.pressMinRepeats` in the archive, where the family states none; `driving.ts` reads it and the composer does not use it; first score it against every Logitech compile in the lab and name the families it gets wrong, `Kreatel IP 22 Bit`'s intro section and the two Memorex families first (was `todo-later.md` 6.16); the archive's README names it as the count (commits ca0349b and fdbaffa)
  - [x] 2.2.1 Scored against our own compiles and used: the device's count holds on 45 of 47 catalogue devices, only three of them stating 1, and the composer builds these families at it, findings section 348; of the 478 families (338578 commands) the table refused for this alone, 128 now write every command and 350 still refuse 15864
  - [ ] 2.2.2 1740 commands in 337 families: a device whose code set holds a family stating a count other than its own; two devices were written at their main family's count, an unconfirmed reading, so these are refused
  - [ ] 2.2.3 13909 commands in 40 families: a code naming a release group, which no compile in the lab shows stored; overlaps 2.5
  - [ ] 2.2.4 215 commands in 6 families: a device stating a count of 0, which no compile in the lab shows
  - [x] 2.2.5 The rhythm table's blocks for families stating no count were each measured on one device, so they hold that device's count for every device: wrong where a device states another count, the Dell 2300MP on 34 of 35 records, about 8900 archive devices exposed; build these at the device's count too, which changes commands that composed before (findings section 348). Done, findings section 350: built from the definition at the device's count, right on 2586 of 2636 records of our compiles where the table was on 2551, two devices moving, the Dell 35 of 35 whole; 8724 archive devices get such a command, and 79 commands are now refused, 64 where table and definition disagree about the frames a press sends
- [x] 2.3 The 8 families left over, 4 with no rhythm and 4 whose block is refused; findings section 361: the 4 with no rhythm are misspellings, 221 commands (222 with a fifth spelling a count of 0 refuses), found by the definition spelt the same but for case and spacing, which is what Logitech's own protocol id names, and the 4 refused blocks are 87 commands built from the definition at the device's count; 217 and 77 now write, the other 14 refused for a conflicting count (2.2.2); three codes word for word against two Harmony One compiles, the rest stated and unverified
- [ ] 2.4 The 10 families that compose except for 231 commands; Logitech's own version of those codes is `todo-secure-logitech.md` 2.4
- [ ] 2.5 Release blocks and toggle bits as Logitech renders them: about 4360 commands compose and differ from Logitech's rendering (was `todo-later.md` 6.15)

The other chapters are decided once the gathering is done, one per kind of knowledge.
