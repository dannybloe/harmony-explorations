# Harmony One test notes

#### A third prediction, for the second Harmony One

The One's internal dump rests on its own three checksums and nothing else, because arch 12 keeps no
copy of that memory in any package. A second Harmony One running the same firmware would supply what
the 600 had all along: an independent copy.

Written down before it is attached.

| Predicted | What it would settle |
|---|---|
| both pages byte identical to the spare's, **except** the identity block at `0xFF` `+0xF400`, the record at `+0xF640` and the four bytes at `+0xF580` | that the pages are firmware, not per unit state |
| its own three GUIDs from `concordance -i`, at `+0x00`, `+0x10`, `+0x20` | the identity block on a third unit |
| version block fields 8 and 9 both unchanged, `0x34` and `0x16` | that field 9 tracks the image and not the unit |

The first row is the one with teeth, because it predicts an exact set of exceptions. Anything
differing outside those three regions falsifies "this is the firmware" and means part of what was
read is per unit state that happens to look like code.

One thing it cannot settle: whether the serial field is genuinely unused. It is `0xEE` filled on the
spare One and on the 600, and the spare has never been programmed, so a programmed unit with a real
serial there would be informative and a third `0xEE` would make it look like a field nobody writes.

#### The second One, measured

| Predicted | Measured |
|---|---|
| both pages identical except three regions | `0xFE` identical over all 65534 bytes; `0xFF` differs in **39 bytes and nowhere else** |
| its three GUIDs at `+0x00`, `+0x10`, `+0x20` | all three, same offsets, same mixed endian order as the spare |
| fields 8 and 9 unchanged, `0x34` and `0x16` | the version block is identical to the spare's, byte for byte |

The 39 differing bytes are 32 inside the identity block, two at `+0xF582` and seven at `+0xF643`,
which is the predicted set of exceptions and nothing outside it. So **the internal pages are
firmware**, and section 23's caveat that the One's dump had no second copy to check against is
answered: it has one now, another physical remote.

Two things fell out of it.

**The serial field is one nobody writes.** It is `0xEE` filled on all three remotes now, including
both programmed ones, so the earlier reading that a blank meant "never programmed" was wrong: the
spare being unprogrammed had nothing to do with it. The GUIDs that do carry values are the second
and third.

**Their byte order tracks the architecture.** Both Harmony Ones store the second and third GUID in
mixed endian and the Harmony 600 stores them big endian, which one remote per architecture could not
have separated from a per unit quirk.
#### Every bench remote, checked against its own backups

The question this answered was whether there is enough on disk to restore these remotes if something
goes wrong. A directory listing cannot answer it, so each stored file was read back off the device it
came from and compared. All three units, read only:

| | user config | application firmware | safe mode region | internal pages |
|---|---|---|---|---|
| One, operational | 1672832 of 1672832 | 60050 of 60050 | 65536 of 65536 | both, complete |
| One, spare | 1232237 of 1232237 | 60050 of 60050 | 65536 of 65536 | both, complete |
| Harmony 600 | 738149 of 738149 | 70336, own checksum | the image at `0xFE` `+0x1000`, own checksum | both, complete |

No differences anywhere. The two Ones run bit for bit the same application firmware as the archived
3.4 package, and the same `0xFE` internal page as each other.

Three things this changes, none of them about bytes:

* **A backup nobody has compared against the device is an assumption.** These are not assumptions
  now. That is a different statement from "the files exist", which is all that could be said before.
* **The 600's recovery file was the wrong file**, see `docs/findings.md` section 23, and only a
  comparison against the device could have shown it.
* **Restoring is still untested.** The one write this project has performed, section 222, reproduced
  bytes that were already there and so never needed a restore, so every one of these
  backups is verified as a *copy* and unverified as a *restore*. (This said the flash write data path
  "does not exist", which section 175 read on 25 August 2026 and `packages/usb/src/writes.ts` now
  builds. What has never happened is the sending, and that is the half this bullet is about.) That gap is procedural rather than a gap in the data, and it is why the spare was the
  first write target when writing arrived, and why the units permitted since, the Harmony 525 and the
  Harmony 650, are ones a failed restore would not cost Danny his everyday remote.

## The memory maps of the Harmony Ones read here

Moved out of the Harmony One's memory map and the architecture folder's memory page when plan 009's step
3.2 put the One's memory into `reference/architectures/harmony-one/memory.md`, which states the layout
without saying whose remote it was read off.

**Which units.** The map was written from three Harmony Ones, all read only at the time: two programmed
and one unprogrammed spare. The spare has been written to since, from section 222 on, so "unprogrammed"
describes it as it was read and not as it is; the friend's Harmony One of decision 21 was not among the
three.

**The flash map, read end to end on the operational unit.** Asked whether the operational One's firmware
had ever been downloaded, the answer at that point was no: every read had gone to internal memory or to
the configuration at `0x040000`, and on this architecture the application runs from external NOR at
`0x020000`, an address `READ_FLASH` accepts and nobody had asked for. It reads:

| flash | contents | checked against |
|---|---|---|
| `0x000000` to `0x010000` | the safe mode region, a `GSPM` container at `0x002000` | that unit's own `--dump-safemode`, **65536 of 65536** |
| `0x010000` to `0x020000` | erased | |
| `0x020000` to `0x02EA92` | the application, 60050 bytes, 3.4 | the image decoded from the 3.4 `.hfw`, **60050 of 60050**, and its own header checksum |
| `0x02EA92` to `0x040000` | erased | |
| `0x040000` onward | the user configuration, 1672832 bytes | that unit's own `.EZHex`, **1672832 of 1672832** |

**One number in that table came from a mistake worth recording.** The safe mode comparison first reported
13586 differing bytes: `concordance --dump-safemode` starts at flash zero and the read started at
`0x002000`, so two windows 8192 bytes apart were laid on top of each other. Reading the same region as the
dump gives 65536 of 65536. A mismatch whose first difference is at offset zero should have suggested
alignment before corruption.

**The last two rows of the external table were found late**, section 88, and the reason is instructive:
`packages/usb` refused every address above `0x200000` on this architecture, because the Harmony 600's
bound had been applied to the One too. So the upper half of the flash had never been read, and the map
claimed it was erased. Both the stored firmware copy at `0x3D0000` and the `00 FF` block at `0x3F0000`
were read off both programmed remotes and are identical on them.

**The two configurations read here** occupy 1672832 and 1232237 bytes of the region, which is the ground
for the reference's statement that a configuration's length varies and only the region is fixed.

**What concordance returns on this architecture.** `concordance --dump-safemode` returns `0x000000` to
`0x010000`, all 64 KiB, mostly erased. So does `--dump-firmware`, which is why that option was useless
here: on this architecture it contains no code at all. `docs/concordance-notes.md` has why.

**The record at `0xFF` `+0xF640` on the spare** reads `09 00 20 11 02 18 e0 3c 00 67 01`, and seven of its
bytes, from `+0xF643`, differ on the other One, so it is per unit data of some kind; nothing identifies it.

**The battery scale.** The calibration words at `0xFF` `+0xF5C0` had been in the lab for a day, filed as
"unidentified" two rows above the note that the two remotes differ at `+0xF582`, before section 105 joined
the two facts up.
