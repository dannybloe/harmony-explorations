# Todo: prepare the Harmony 525 and 515 for writing

**Archived:** its open items went to the Harmony 525's own part, [todo-harmony-525.md](../todo-harmony-525.md).

**The finish line**: every rail a writer needs answered for this platform, from its own firmware where
possible, so that composing for it, `todo-later.md` 5.4, starts from a closed table. The bench 525 is
already a write target, one block written back unchanged (section 269); nothing is composed or written on
this track. The 515 goes with the 525, sharing the platform. The plan, the rows (D1 and so on) and what
step 0 found are [plan 012](../../docs/plans/012-the-legacy-remotes.md).

**Before any item**: read `../lab/work/legacy-remotes/HANDOVER.md`, load the `harmony-525` skill, write
the item's brief into `../lab/work/legacy-remotes/notes/harmony-525/` and update the handover's state,
both **before** the item starts. The images are the 525's application 3.0 and safe mode 2.0 and the 515's
application 3.4, in the lab. **Safe mode is never entered on either model**: on the 525 it overwrites the
application.

**Every item asks the architecture question**: a reading of the 525's 3.0 image holds for that build;
whether it holds for the 515's 3.4 is checked or said to be unchecked.

Written on 4 November 2026; linked from `todo-later.md` 5.4.

---

## 1. Recovery and the write path, read in the firmware

- [ ] 1.1 Whether safe mode accepts an erase and a write, and whether the bootloader is a USB flash programmer (D9)
- [ ] 1.2 Whether the remote erases before it programs, and `WRITE_FLASH`'s data path (D3)
- [ ] 1.3 The restart escape and `WRITE_MISC` selector 2 read, to confirm or refute that a write needs neither (D6)
- [ ] 1.4 What the validator at `0x04DF0` checks: cookies, end marker, checksum and its seed (D7, F1)
- [ ] 1.5 The data memory write's handler, the `0x30` address window, and the EEPROM beyond byte 0 and the identity (D11)
- [ ] 1.6 `READ_MISC` selector 1 decoded correctly, and so a USB read of the clock (D12)
- [ ] 1.7 A configuration larger than one 64 KiB block: how it is laid over the region and written, since the 515's and a contributed 525's are (D1)

## 2. On the bench, needing a unit on the cable

- [ ] 2.1 The second 525: identity and whole region read into the lab, and its identity compared with the first's (D4, D5)
- [ ] 2.2 The 515's identity location written into its reference page, which says it is not checked while its test note says it was recorded (D5)
- [ ] 2.3 Which printed key sends which scan code, and held keys and repeat (F9)
- [ ] 2.4 The clock read over USB, once 1.6 has the selector (D12)

## 3. The file side, read in the firmware

- [ ] 3.1 The main action handler table, from `0x65` up: the send, the delay and their pairing (F4)
- [ ] 3.2 The variable storage ceiling the fill to 64 implies, made a writer rule if it is one (F3)
- [ ] 3.3 The section seeker per base slot, beyond slot 13 (F2)
- [ ] 3.4 Base slot 15's guard: the group lengths and count demanded (F7)
- [ ] 3.5 The timer table: concurrency and the duration clamp (F6)
- [ ] 3.6 The number sender, and whether the 525 has favourite channels at all (F8)
- [ ] 3.7 The screen instructions beyond 22 and 23, and where the status screen base is added (F10)
- [ ] 3.8 The infrared player: toggle flip, carrier, and whether a class 1 record plays, since `composeDevice` writes class 1 into a 525 configuration (F11)
- [ ] 3.9 What reads base slot 3's stamp, the log area's writer, and opcode `0x0F`'s band that is not ignored here (F13, F14); a lead: the 880 and 885 append to the log from `0x0F` band `0xE0` at an address base slot 2 states, and the same eight instruction list sits in 525 configuration `h525_config_2`, `tests/harmony_880_885/test_harmony_885_log_area.py`
- [ ] 3.10 Opcode `0x1F`'s bands `0xD0`, `0xE0` and `0xF0` (F4)
- [ ] 3.11 Any setting kept outside the configuration, such as in the EEPROM (F16)

## 4. Corrections

- [ ] 4.1 "A configuration fits one 64 KiB block" in the 525's memory page, refuted by two configurations, into `docs/superseded.md`
- [ ] 4.2 The fill is "not read" on this platform in the 525's memory page and in state.md, against section 274's reading
- [ ] 4.3 `docs/status.md` saying the platform's class 5 blocks are not read, overturned by section 82
- [ ] 4.4 The 555's firmware, listed in `docs/status.md` and found nowhere in the reference

## 5. The handover

- [ ] 5.1 The rail table closed, and `todo-later.md` 5.4, composing an activity for the 525, taken up from it
