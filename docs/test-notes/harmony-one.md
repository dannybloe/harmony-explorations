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
