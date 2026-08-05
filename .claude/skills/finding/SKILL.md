---
name: finding
description: Record a confirmed reverse engineering finding across the three places it must land, with a regression test. Use when something new has been established about the config format, the firmware or the USB protocol and it needs writing up, when asked to document a finding, or when a claim in the documents turns out to be wrong and needs correcting in place.
---

# Recording a finding

Every confirmed fact lands in three places at once. Not two. The rule exists because the
analysis here is AI-produced and published as such, so a claim that is not executable is only
an assertion.

1. **The structured fact** in `docs/config-format.md`, which is what other tools consume.
2. **The reasoning and the evidence** in `docs/findings.md`, which is why anyone should believe
   it.
3. **A regression test** in `tests/`, which is what stops it silently rotting.

Work in that order, and do not start writing until the verification gate below is passed.

## The verification gate

Before anything is written, answer these. If an answer is missing, the finding is not ready and
the honest move is to write it up as unconfirmed, using that word.

* **How many independent samples?** Two is the minimum. Two configs from one remote are not
  two samples for a claim about the format; two architectures are. The corpus is inventoried by
  `make corpus` and currently spans arch 8, 9, 12 and 14.
* **Is there an independent closure?** The best findings here check out twice by different
  routes. The IR carrier is believed because 38 kHz implies a stored 263, and the code's own
  arithmetic turns 263 into exactly 26.25 us. Look for that shape before settling for one.
* **Is there a calibration case?** When deriving something, run the derivation on a case whose
  answer is already known, and report the score for wrong answers too. The base address
  derivation scores 98.9 percent for the right base against 11 to 30 percent for wrong ones.
* **What would falsify it?** If nothing would, it is not a finding, it is a description.

## Writing it

`docs/config-format.md` is a specification: offsets, widths, endianness, what is derived versus
what is tabulated, and an explicit "unconfirmed" on anything that has not passed the gate. No
narrative.

`docs/findings.md` is the argument: what was traced, which addresses, what the numbers were,
and what else it rules out. Include the negative results. A recorded "I checked and it is not
X" saves the next person the same afternoon.

Both are subject to the house convention: **no em-dashes and no en-dashes**, verified by
`make prose`.

## The test

One test per documented claim, named after the claim rather than after the function. It should
fail if the conclusion stops being true, not merely if the code changes shape. Tests that need
real binaries load them through `tests/lab.py`, which finds `../lab` or `HARMONY_LAB` and skips
cleanly when neither exists.

Two habits worth copying from the existing suite:

* **Assert the negative too.** `test_a_flipped_payload_byte_breaks_the_checksum` exists because
  a checksum that cannot fail is not a check.
* **Assert the span of the corpus**, not just the values. There is a test whose only job is to
  fail if the samples stop covering more than one architecture, base address and format
  version, because a derivation confirmed on one value of a variable is not confirmed.

## Corrections

When something already written turns out to be wrong, **correct it in place and say so**, in
the document, with how the error happened. This is a standing convention here, not a courtesy:
readers calibrate the rest of the analysis against the recorded mistakes, and five are recorded
so far. Update the count in `README.md` and in the `docs/findings.md` preamble.

The most instructive corrections are the ones where the wrong rule produced the right answer.
Say when that happened.

## Finishing

```sh
make prose lint test
make corpus
```

Then a commit whose message says what changed in the understanding, not which files moved.
The publication gate runs automatically before any commit, or by hand:

```sh
python3 bin/check-publishable.py
```

If the finding changes what the project should do next, `docs/roadmap.md` is the plan of record
and needs the edit too. If it changes a load-bearing fact, so does `CLAUDE.md`, which is what a
future session reads first.
