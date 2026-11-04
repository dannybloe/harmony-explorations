# Todo: prepare the Harmony 880 and 885 for writing

**The finish line**: every rail a writer needs answered for this platform, from its own firmware where
possible, and then the question whether the bench 885 may be written, asked and not assumed. Nothing is
written to an 885 on this track. The plan, the rows (D1 and so on) and what step 0 found are
[plan 012](../docs/plans/012-the-legacy-remotes.md).

**Before any item**: read `../lab/work/legacy-remotes/HANDOVER.md`, write the item's brief into
`../lab/work/legacy-remotes/notes/harmony-885/` and update the handover's state, both **before** the item
starts. The images are the 880's and the 885's application 4.4 and bootloader 4.0, in the lab.

**Every item asks the architecture question**: the 880 and the 885 share one application build, so a
reading of it holds for both; one of the bootloader holds for the image read. The 720, 785, 880 Pro and 882
are not covered by anything here.

Written on 4 November 2026; linked from `todo-later.md` 5.6.

---

## 1. Recovery and the write path, read in the firmware

- [x] 1.1 The bootloader: what it dispatches over USB, whether it is a flash programmer, and which key held at start keeps it (D8, D9)
- [ ] 1.2 Safe mode: whether this platform has one at all, or whether the bootloader does its job (D8)
- [ ] 1.3 The erase: the address check at `0x19B5C` and what it bounds, the erase block size, and which flash part (D1, D2, D3)
- [ ] 1.4 The write: `WRITE_FLASH`'s data path, whether the remote erases before it programs, the transfer size (D3)
- [ ] 1.5 How a write ends: the `WRITE_MISC` selectors, the unidentified chain testing `0xE0` at `0x14B12`, and what makes the remote take up a new configuration with no escape in its dispatch (D6)
- [ ] 1.6 What the remote checks at start, what it shows when a configuration fails, and whether that latches (D7)
- [ ] 1.7 Other write paths: a data memory write, any settings or EEPROM store, and the "FLASH Memory ID", "Erase" and "Clear" texts in the image (D11)
- [ ] 1.8 The one byte reads at `0x000104` and `0x000105` that call routines, and what a read above `0x200000` returns (D4)
- [ ] 1.9 A section for the Harmony 880 and 885 in the `recovering-a-remote` skill, from 1.1 to 1.6 (D9)

## 2. On the bench, needing an 885 on the cable

- [ ] 2.1 A whole configuration region read off each 885 into the lab, read twice and identical (D4)
- [ ] 2.2 The version block's values compared against the six fields an 880 or 885 configuration's wrapper states (D10)
- [ ] 2.3 The clock read over USB, once 1.x has found the `READ_MISC` selectors (D12)
- [ ] 2.4 Which printed key sends which scan code, and a drawing of the face (F9)

## 3. The file side, read in the firmware

- [ ] 3.1 The action interpreter: the opcode table, a send and its paired delay, power transitions (F4)
- [ ] 3.2 The action queue's depth (F5)
- [ ] 3.3 State variables: the storage, the fill stopping at 63 and whether that is a ceiling for a writer (F3)
- [ ] 3.4 The section seeker, confirming the base slot map (F2)
- [ ] 3.5 Base slot 15's guard: the group lengths and count demanded (F7)
- [ ] 3.6 The timer table: concurrency and the duration clamp (F6)
- [ ] 3.7 The number sender, though no 880 or 885 configuration holds favourite channels (F8)
- [ ] 3.8 The infrared player: carrier, and whether the toggle records' second group is alternated (F11)
- [ ] 3.9 Screen opcode 21, found on this platform only, and opcode 1's clip (F10, F12)
- [ ] 3.10 What reads base slot 3's stamp, and the log area's writer (F13, F14)
- [ ] 3.11 Where this platform keeps an inter device delay, if anywhere (F4)

## 4. Corrections

- [ ] 4.1 Stale lines from step 0: data memory "not checked", which version a unit runs, which bytes are a serial, `docs/status.md`'s count of architectures on the bench, and state.md's fill ceilings without arch 8's 63
- [ ] 4.2 The 720's images: `docs/status.md` says an application and bootloader are held, the platform README says nothing of theirs is read; settle which

## 5. The question

- [ ] 5.1 Whether a bench 885 may be written, asked once chapters 1 and 2 are done, and recorded as a decision either way
