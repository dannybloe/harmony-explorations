# Harmony 5xx: miscellaneous

**The rule for this file** is the model folders' rule: a note goes here only when it fits none of the
other files, and a kind of note that recurs gets a file of its own.

## Why an architecture folder for one model read

The Harmony One is the only model on its architecture and has none, `reference/remotes/harmony-one/misc.md`.
This architecture is the opposite case: `models.ts` places seven models on it and one has been read, so a
fact read on the 525 is stated here as the architecture's with that scope named, and a fact a second model
contradicts can be corrected in one place. The folder is named for the series rather than the one model
for the reason the arch 14 folder lists a Harmony 665 nothing has been read of.

## Names

* Logitech's classic client puts skins 18, 22, 36, 41, 48, 67 and 68 on its **Mocha** transport, together
  with the Harmony 600, 650 and 700. That is a transport map and not an architecture map: the two
  architectures share one driver, `reference/models.md`.
* Logitech's own protocol templates carry one skin of this architecture, 68, the Harmony 510, at
  architecture 9, and group 9 with 12 and 14 as the legacy HID protocol, section 197.

## Why this architecture was worth the trouble

Before a unit arrived it was the worst covered architecture in the corpus, because no arch 9 firmware
existed anywhere. With the unit's firmware the byte accounting of its configurations reached the other
architectures' level, chiefly by reading infrared class 5 out of the image, `docs/memory-map-525.md` and
section 82. It is also the second architecture this project wrote to, section 269.

## Configurations in the corpus

Two user configurations of this architecture are in the lab, one read off a unit and one contributed,
plus the safe mode container cut out of that unit's firmware region and its configuration region in five
blocks. Names are in `tests/lab.py` and `packages/lab`, and the corpus totals
in `docs/status.md`; nothing here restates them. **Nothing can compile a new one**: Logitech's service has
the product switched off, section 145.

## Not checked

* Nothing in this file is a claim about a remote beyond the cited sources.
