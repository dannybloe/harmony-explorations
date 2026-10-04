# Harmony 650: miscellaneous

**The rule for this file**: a note goes here only when it fits none of the other nine files. If the same
kind of note would appear in the `misc.md` of several models, it deserves a file of its own in every
model folder instead, and `reference/remotes/README.md` and the generator's test get updated with it.

## Where the 650's work is planned

`todo-compile-650.md` is the plan for composing whole configurations for this model, and the place to
look for what is next on it. It is not restated here.

## The test account

The 650's bench unit is registered on the second MyHarmony test account, the one `MYHARMONY_EMAIL`
selects, lab `reads/20260927T0840Z-h650-programmed-NOTES.md` and the `myharmony-service` skill. The
account's contents change and are never asserted, per the project's rule that test accounts are not a
population.

## Infrared bench runs on this unit

Step lists in `packages/bench/irtests/` for the 650: `done/650-activities.json`, the reference run of its
activities and Off; `done/650-panasonic-power-hold.json`, section 306; `done/650-lg-volume.json`, the
runner's smoke test; `done/650-composed-power.json`, section 320; and `650-combined.json`, the combined
bench file. Their recordings are in the lab's `reads/`.

## The configuration's history on the unit

The lab's `reads/` holds the 650's configuration and region reads in the order they were taken, from
the as found read through every write; `tests/lab.py` and `packages/lab` name the ones the tests use,
all beginning `h650_`. Which one is current is the newest read, and nothing here asserts it.

## Not checked

* Nothing in this file is a claim about the remote beyond the cited sections.
