# Plan 004: writing an activity to the spare Harmony One

**Status: open.** Written 7 September 2026. This is `todo.md` item 1.3 worked out, and nothing in it
has been sent to a remote. Every number below is measured off the file and the lab dump, so what is
left is the hardware session.

**The goal**: press a row on the spare Harmony One's screen that this project put there, and watch
the television answer. Item 1.2 built what the remote runs, item 1.2.1 built what starts it, and
neither has been on a remote.

---

## What the candidate is

Built by `packages/codec/bin/compose-activity.ts`, the counterpart of `compose-device.ts`:

```
node packages/codec/bin/compose-activity.ts \
  --in <the spare's latest region read> \
  --out <the candidate> \
  --label 'LG kijken' --targets 51=1 \
  --keys 3:4809,4:4810,9:4813,19:4811,20:4812 --icon-like 'LG WebOS'
```

**It invents nothing that sends.** An activity's job is to set devices' state variables and point the
keypad at action lists the configuration already carries, section 273, so every part of this comes
off the host config:

| what | where it comes from |
|---|---|
| the television | the LG added by section 242's write, device group 6, mode 287, six commands |
| switching it on | state variable 51, `LG_Power`, whose 0 to 1 transition runs list 4808, the LG's `Power` |
| volume up and down | scans 3 and 4, the measured Harmony One `VolumeUp` and `VolumeDown`, on lists 4809 and 4810 |
| mute | scan 9, `VolumeMute`, on list 4813 |
| channel up and down | scans 19 and 20, `ChannelUp` and `ChannelDown`, on lists 4811 and 4812 |
| the icon | the existing `LG WebOS` row's, by its drawn label |

The scan codes are `reference/button-maps.md`'s measured ones for skin 54, and the lists are the six
the LG's own device page binds, whose drawn labels read `Power`, `Vol+`, `Vol-`, `Ch+`, `Ch-` and
`Mute`.

**The power code is a toggle**, both transitions running list 4808, so starting the activity switches
the television on if it was off and off if it was on. That is what a device with one `Power` command
gives, and it is the observable rather than a defect.

## What it changes

| | before | after |
|---|---|---|
| container length | 1668291 | 1668486, 195 bytes longer |
| activities | 7 | 8 |
| activity counter's values | 0 to 7, idle 6 | 0 to **8**, idle still 6 |
| keypad map entries | 16 | 17, the new one at index 15 |
| activity menu | 3 pages of 3, 3 and **1** rows | 3 pages of 3, 3 and **2** |
| devices | 7 | 7, none added |
| deepest action list | 35 of 40 queue slots | **35**, unchanged |

The menu's last page had one row of three, which is the case `composeActivityMenuRow` supports: it
fills the page rather than adding one, so none of section 275's unbuilt page work is needed and the
two page turn keys stay deadened correctly, that mode still having one page.

**The queue depth does not move**, which is worth stating because 35 of 40 is where this
configuration already sits and 35 is the sequence that hung a Harmony One, section 238. This activity
adds nothing to it, so the write does not make that worse and does not make it better.

## What the checks say

Every one of these ran on the file and passed:

* every byte accounted for by a reader, no range claimed twice
* the trailer checksum agrees with the bytes, which is the one check the remote itself makes
* the emitter reproduces the container from its own reading of it
* the action queue fits, `assertQueueFits`
* all four hops read back: the menu row is on the page, it runs the composed list, that list selects
  the new keypad map entry, and `handlerSetRoles` calls that entry an activity
* the three menu pages **draw**, with no missing glyph and no undecoded picture, and the new row's
  background, icon and label land on the grid

The drawing is the check a reader cannot make and it is why the pictures were looked at.

## What the write costs

Measured with the writer's own `blocksDiffering` against
`20260903T175608Z-one-spare-reverted-region-0x40000-0x1e0000.bin`:

* **997713 bytes differ**, which is 60% of the container. That is what a length change does: the 195
  bytes go in near the front and everything after them shifts.
* **25 erase blocks of 64 KiB**: `0x40000`, then `0x60000` through `0x1d0000`. `0x50000` is byte
  identical and is not touched.
* **27100 reports**, and the same count as section 242's device write, which was also 25 blocks.
* No block fails a rail: all aligned, all inside the region, all below the `0x3d0000` ceiling, all
  covered by the dump, and both neighbours checkable on every one.

## The sequence, and where it can be stopped

`packages/corpus/bin/write-config.ts` does all of it and has done it four times. Nothing here is new
machinery; what is new is the content.

1. **Confirm what the remote holds.** The compare base is the state section 248's revert left, and
   this project cannot know that is still true. A dry run establishes it: it reads all 25 blocks off
   the remote and refuses unless every one matches the dump byte for byte.
2. **The dry run**, which writes nothing:
   ```
   node packages/corpus/bin/write-config.ts \
     --config <the candidate> --dump one_spare_reverted_region
   ```
   It checks the trailer, the queue, the unit's own identity block against the recorded `one_spare`,
   the architecture off the device, and then reads and compares every block. It prints the plan and
   stops.
3. **The write**, which needs both doors:
   ```
   HARMONY_ENABLE_WRITES=1 HARMONY_FIRST_WRITE=1 node packages/corpus/bin/write-config.ts \
     --config <the candidate> --dump one_spare_reverted_region --commit
   ```
   Per block: read the neighbours, erase 64 KiB, check the neighbours again, write it back, read it
   back and compare. Then the whole container is read off the remote and compared with the file byte
   for byte, and the remote is restarted.
4. **Then the part no software can check.** The remote comes back on its own running its
   application. Its screen should show the ordinary activity menu rather than a status screen, page
   three of the menu should show `LG kijken` under `LG WebOS`, pressing it should make the television
   answer, and volume, channel and mute should reach it.

**Two things to know before it runs.** Every block is compared before any is erased, so a run that
refuses has changed nothing; and a run that fails part way leaves blocks holding either this file's
bytes or erased flash, which the writer recognises on the next attempt, so the correct response to a
failure is to run it again rather than to restore. The journal beside the config records every line
as it is printed, section 243, so a killed run still has an account of itself.

**And a fresh region read afterwards**, because the dump a write compares against is invalidated by
that write, which is the wart section 237 recorded and every write since has added a row for.

## What this plan deliberately does not do

* **No new page on the menu.** Item 1.2.2, and section 275's rail: it needs a page counter, a pool
  copy, a page count and the two page turn keys undeadened. The spare's menu has room, so 1.3 does
  not wait for it.
* **No device.** The LG is already there. Adding a device and an activity in one write would make a
  failure ambiguous.
* **No keypad map for the LG in device mode.** The device composer does not build one, section 271,
  so the LG's own commands are reachable from its screen page and not from the keypad in device mode.
  Unaffected by this write.
* **No clock set over USB.** The writer stamps the container and an arch 12 (Harmony One) remote
  reseeds its clock from that stamp at every boot, section 111.
