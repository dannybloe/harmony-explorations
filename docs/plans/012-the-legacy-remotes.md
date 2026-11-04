# Plan 012: the legacy remotes, prepared for writing

**Status: open.** Written 4 November 2026. Its items are [todo-prepare-885.md](../../todo/todo-prepare-885.md)
and [todo-prepare-525.md](../../todo/todo-prepare-525.md), linked from `todo-later.md` 5.6 and 5.4. The track
runs beside `todo.md`'s sequence and not in it.

## What the track is

Preparatory work on the older remotes on the bench, so that they can be made writable later: the Harmony
885 (two units, arch 8, one application build shared with the 880) and the Harmony 525 (two units) and 515
(arch 9). **Nothing is programmed on this track.** It collects what a writer would need, lands it in
`reference/` the ordinary way, and ends by asking whether a remote may be written.

The Harmony 890 and 895 (arch 10) are left out because no firmware image of that platform exists, so only
configuration work is possible there. The models known from one contributed configuration each (200i, 555,
720, 900, 880 Pro) are left out too. Either can be a track of its own later.

## Decisions taken in planning

* **The models on the bench first.** The 885 and the 525 and 515: firmware, configurations and a unit
  exist for each, which no other legacy model has.
* **The end goal is that they become writable, and this track does not make them so.** Whether the 885
  becomes a write target is a decision of its own, as decision 26 and 29 were for other units, and it is
  the last item of its todo file. The 525 already is one.
* **The finish line is a rail table with no gaps.** Every rail a writer has to respect, about the device
  and about the file, has an answer for the platform, from its own firmware where possible. The rows are
  below; step 0 scored them.
* **Firmware is read from the configuration's side**: the code that reads a configuration, checks it, plays
  it and writes it, not everything in an image, since only what a configuration can change earns depth.
* **Knowledge lands in `reference/`** with its footnote and a regression test, through the `finding` skill.
  What concerns the bench units goes to `docs/test-notes/`. Firmware bytes, listings and Ghidra projects
  stay in the lab.
* **Every step gets a brief in the lab before it starts**, `../lab/work/legacy-remotes/notes/`, and the
  track's state is kept in `../lab/work/legacy-remotes/HANDOVER.md`. A safety check may stop a session that
  reads firmware, and a stopped session can write nothing afterwards, so the next session continues from
  files. The handover holds the procedure for that case; switching model is the user's decision each time.
  Agents run on the current model.

## The rows

The device rails follow `CLAUDE.md` "Never write to a remote" and the `recovering-a-remote` skill; the file
rails follow the `writing-a-config` skill. An item in the todo files names the rows it closes.

| row | the question |
|---|---|
| D1 | where the configuration lives in flash: region, erase block size, ceiling |
| D2 | what else sits inside an erasable range near it |
| D3 | the flash commands: read, erase, write, who erases before programming, transfer size |
| D4 | read hazards, and a whole region read on a unit |
| D5 | identity: the block that tells one unit from another |
| D6 | the write sequence's cache drop and restart |
| D7 | what the remote does at start with a configuration: validation, what it shows, latching |
| D8 | safe mode: entry, effect on the application, exit |
| D9 | recovery: bootloader, safe mode, restoring a configuration and a firmware |
| D10 | firmware builds, versions and the six `INTENDEDVERSION` fields |
| D11 | other write paths: data memory, settings store, EEPROM |
| D12 | the clock, and a USB read of it |
| F1 | container: cookies, header, pointer table, trailer checksum |
| F2 | the base slot map, confirmed by a firmware routine |
| F3 | state variables: header words, the firmware's block, the clock records, the maximum |
| F4 | actions: the opcode table, send pairing, power transitions |
| F5 | the action queue's depth and the bound on a sequence |
| F6 | the timer table |
| F7 | base slot 15's settings groups |
| F8 | favourite channels and the number sender |
| F9 | keys: scan codes, key table, mode pages and both list copies, page turn keys |
| F10 | screens: instructions, glyph and picture encoding, status screens, menus |
| F11 | infrared records: format, carrier, durations, toggle, once, held and tail; the player |
| F12 | layout and relocation; every byte attributed |
| F13 | base slot 3's timestamp |
| F14 | the log area |
| F15 | shared strings and blocks |
| F16 | settings saved on the remote overriding the configuration |
| F17 | whether anything can still compile a configuration for the model |
| C1 | the corpus, and what the codec reads and builds for the platform |

## What step 0 found

Scored rows and sources are in the lab, `work/legacy-remotes/notes/0-gap-measurement-arch8.md` and
`-arch9.md`; spot checked against the documents.

**Harmony 880 and 885.** Only a few rows are answered from the firmware, though both images are in the lab.
Every write side question is unread: the erase and what its address check bounds, the write path, the
miscellaneous write selectors, what the remote validates at start and what it shows. Its command dispatch
has no case for the escape that restarts a Harmony One or 600, so no restart is known at all. Recovery is a
blank: no safe mode image is known, the bootloader's commands are unread, `recovering-a-remote` has no
section for it, and the bootloader, the application and the configuration likely share one flash part.
The file side rests on configurations; the firmware's fill of the variable storage stops at 63, which may
be a ceiling far below 128 and is examined nowhere.

**Harmony 525 and 515.** The hardware side is largely answered from firmware and the unit: the address
space, the erase hazard, safe mode as a one way door, the boot flow, the queue depth. The configuration's
consumers mostly are not: what the validator checks, base slot 15's guard, timers, the number sender, most
screen instructions, the infrared toggle and carrier, the restart and cache drop handlers. The codec has no
family for the platform, so no layout and no screen encoder, and `composeDevice` writes class 1 infrared
records into a 525 configuration where every 525 record is class 5. Two statements need settling: a
configuration is said to fit one 64 KiB block, which the 515's configuration and a contributed 525 one do
not; and the variable seeder fills to 64, implying a storage ceiling no writer rule states.

## The order, and why

Per model, the same five chapters:

1. **Recovery and the write path, read in the firmware.** First because it decides whether a write can be
   survived, and on the 885 that is entirely unknown. Needs no remote.
2. **On the bench.** What only a unit answers: whole region reads, a second unit's identity, which printed
   key sends which code. Waits until the units are at hand.
3. **The file side, read in the firmware.** The configuration's consumers, row by row.
4. **Corrections.** Lines step 0 found stale or wrong in the documents, corrected in place with
   `docs/superseded.md` where a claim dies.
5. **The question.** For the 885, whether it may be written; for the 525, handing over to `todo-later.md`
   5.4, composing an activity for it.

Where both are possible the 885 goes first, since its recovery is the larger unknown. Neither track blocks
the other.

## What this plan leaves for later

Building for these platforms: a codec family each, a layout, a screen and glyph encoder for the 525, a
composer for the 885. Those follow once the rail table is closed, as `todo-later.md` 5.4 already says for
the 525.
