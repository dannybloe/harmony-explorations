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

- [ ] 1.1 Harmony One, one folder for the model and one skill naming both units: the spare is a write target and the everyday one never is; its behaviour file carries section 337, the click before every screen command and the held touch, now in `docs/how-a-harmony-works.md`
- [ ] 1.2 Harmony 600, beside the 650 in `reference/architectures/harmony-600-650-700/`
- [ ] 1.3 Harmony 700, beside the 650 in the same architecture folder
- [ ] 1.4 Harmony 300 and Harmony 350, the file based family

## 2. The infrared families the composer refuses

Measured on 7 October 2026 over the archive, without the service: 641 families hold a command the
composer refuses, and the reason splits three ways.

- [ ] 2.1 The 151 families whose catalogue notation our reader does not read, 53000 commands; Logitech's definition exists for every one, so this is reading work, checked against the compiles already in the lab
- [ ] 2.2 The 482 families with a rhythm and no block, 339000 commands, which lack only the press repeat count: measure "the stated count, else three" against every compile in the lab, and name the kinds of family it gets wrong, the two Memorex families first; the count to measure is the device's own, `timing.pressMinRepeats` in the archive, which `driving.ts` reads and the composer does not use, and which the archive's README now names as the count (commits ca0349b and fdbaffa), not the family's
- [ ] 2.3 The 8 families left over, 4 with no rhythm and 4 whose block is refused

The other chapters are decided once the gathering is done, one per kind of knowledge.
