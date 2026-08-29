---
name: finding
description: Record a confirmed reverse engineering finding across the four places it must land, with a regression test. Use when something new has been established about the config format, the firmware or the USB protocol and it needs writing up, when asked to document a finding, or when a claim in the documents turns out to be wrong and needs correcting in place.
---

# Recording a finding

Every confirmed fact lands in four places at once. Not three, and the fourth was learned the
hard way. The rule exists because the analysis here is AI-produced and published as such, so a
claim that is not executable is only an assertion.

1. **The structured fact** in `docs/config-format.md`, which is what other tools consume.
2. **The reasoning and the evidence** in `docs/findings.md`, which is why anyone should believe
   it.
3. **A regression test** in `tests/`, which is what stops it silently rotting.
4. **A sweep of everything that summarised the old answer**, which is what stops the other
   documents drifting away from it.

**Step 4 is new and it is the one that failed.** An audit on 8 August 2026 found eleven places
where the documents contradicted the code. `docs/findings.md` had not drifted at all, because
every section in it carries step 3. The documents that summarise it had, in eleven places,
because a summary is a copy of a fact with no test. Five of those were claims a later finding had
already corrected in `findings.md` and nowhere else.

Work in that order, and do not start writing until the verification gate below is passed.

## The verification gate

Before anything is written, answer these. If an answer is missing, the finding is not ready and
the honest move is to write it up as unconfirmed, using that word.

* **How many independent samples?** Two is the minimum. Two configs from one remote are not
  two samples for a claim about the format; two architectures are. The corpus is inventoried by
  `make corpus` and currently spans arch 8, 9, 12 and 14. **A span is a claim about independent
  dimensions**, so count them carefully: the container's was written as "four architectures, five
  base addresses, three format versions and three pointer table lengths"<!--superseded--> until section 194 read the
  format word and found it **is** the pointer count. One property counted twice inflates a span, and
  the coverage was one dimension narrower than the claim.
* **Is there an independent closure?** The best findings here check out twice by different
  routes. The IR carrier is believed because 38 kHz implies a stored 263, and the code's own
  arithmetic turns 263 into exactly 26.25 us. Look for that shape before settling for one.
  **A closure is only independent if its test reads both ends**, and that one did not until 13
  August 2026: it was four lines of arithmetic over its own literals, so it passed with no lab and
  would have passed whatever the firmware did. The multiplier, the divisor and the 19 cycle overhead
  are decoded out of the image now. **State the slack**, here 0.2506%, because 26.3 us is not
  representable in whole units of 0.1 us and a closure whose slack nobody wrote down is one nobody
  can check. Related and easy to miss: two numbers are independent when they come from different
  **fields**, not when different arithmetic computes them, which is how a bit count and a header
  timing were held against each other for 2137 records while both came from the same neighbouring
  record.
* **Is there a calibration case?** When deriving something, run the derivation on a case whose
  answer is already known, and report the score for wrong answers too. The base address
  derivation scores 98.9 percent for the right base against 11 to 30 percent for wrong ones.
* **What would falsify it?** If nothing would, it is not a finding, it is a description.
* **Which sources were checked before the work started, and was Logitech's own client one of them? Reading it first is decision 2, and `../lab/work/myharmony/src/` is MyHarmony as C# source** Name them, in the finding. Logitech's own
  client, the firmware, `docs/findings.md`. This is not bureaucracy: on 28 August 2026 a session
  derived a packet framing by six rounds of hardware guessing while the answer sat in one function of
  the mirrored client, section 200, and the same day section 197 found a reading three weeks old that
  had never left a lab note. **Nothing can test that somebody failed to look somewhere**, so the line
  itself is the guard and its absence is the signal. `probe-remote` holds the same gate at the moment
  of the act.

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
  fail if the samples stop covering more than one architecture and base address, because a
  derivation confirmed on one value of a variable is not confirmed. It used to name the format
  version as a third dimension and that was the same double count section 194 corrected: the format
  word is the pointer table length.

### Three rules about the shape of an assertion

Moved out of `CLAUDE.md` on 29 August 2026, where they sat in every session's context to describe a
moment that happens only while writing a test.

* **Assert the count, not a bound under it.** A floor well under the figure absorbs a whole sample
  dropping out, `instructions > 10_000` against 47839. A floor that **equals** the population is
  worse, because it reads as tolerance and has none: `agree >= 62` against 62 fails on the first
  sample that adds a key and passes on any that removes one. Every corpus loop here walks a list that
  is a literal in its own file, so an exact count moves only when somebody changes a reader or adds a
  sample, and then it moves in the diff. Same for a share: state both counts, since `0.95` hides which
  side moved.

  **All of them were measured on 14 August 2026 and there were 93**, section 143, 52 in TypeScript and
  41 in Python, and the two halves were loose in different ways. The TypeScript median floor sat
  **41%** below the value it guarded, because a floor is a **fossil**: `glyphs > 65000` was 0.7% under
  the truth the day it was written and 62% under now. The Python median sat 13% under, and **fifteen
  sat exactly on the value**, four of them on the smallest sample of a per sample loop, which is tight
  on one sample and 39% loose on its neighbour. Two things a floor cannot do at all: notice a total
  moving **up**, which is how a double counted sample gets in, and tell a control's magnitude, where
  54 against 227 is the evidence. Three turned out to want a **closure** rather than a number.

  Both halves are enforced now, by `ABoundOnACorpusTotalIsExact` and
  `APythonBoundOnACorpusTotalIsExact` in `tests/test_toolchain.py`: a numeric lower bound has to be
  named in `TYPESCRIPT_BOUNDS_WITH_A_REASON` or `PYTHON_BOUNDS_WITH_A_REASON`, which hold the 25 and
  the 10 that are a per item claim, a physical band, a consequence beside an exact assertion, somebody
  else's source, or a **churning population**, the last being the one ground only Python needs.

* **A test's title is a claim and gets checked like one.** Four titles in that sweep named more than
  their bodies carried, and the failure is invisible because the test passes: `every key a screen
  labels gets a label` where 74 of 6988 have none, `six reads and nothing that writes` over a table of
  nine routes that nothing counted. When a body cannot reach the claim, rename the body's claim and
  say where the real one is tested.

* **Two population lists that nobody compares will differ.** `packages/codec/test`'s `ACCOUNTED`,
  `REBUILT` and `ALL_CONTAINERS` are the same nineteen containers, and one held eighteen for as long
  as that sample had existed, because each file's own totals stayed self consistent.
  `TheCorpusWidePopulationsAgree` compares them statically, in a fresh clone with no lab. The same
  check was needed one boundary further out, sections 140 and 141: the Python side had its own corpus
  of fifteen against those nineteen, and twenty nine hand written populations between the test files,
  nine of them smaller than the claim above them. There are three lists now and each states its
  question: `lab.ALL_CONTAINERS` at 21 for a per container claim, `lab.CONTAINERS` at
  19<!--fact:containers--> for a corpus wide total, `lab.USER_CONFIGS` at 15 for every programmed
  config. **The corpus is nineteen and that was decided rather than derived**, section 142, on the
  ground that a corpus wide total measures what a reader can read and not how many remotes exist, so
  the unit is the container. **Prefer a predicate to a list**: the three sites that could not simply be
  widened are the ones where the exclusion had a reason, and stating the reason as a measurement turns
  an exclusion into a check.

  **A third pair turned up the same day**, section 143: the `EXPECTED` tables every container framing
  claim is asserted over held **17** names in `tests/test_gspm.py` and **13** in
  `packages/codec/test/gspm.test.ts`, the Python set a strict superset, so the two sides reported 5
  base addresses and 4 from the same reader on the same corpus. It surfaced only because making both
  spans exact put two numbers beside each other that a pair of floors had hidden, which is the lesson:
  **when two lists disagree, look for the assertion that was letting them.**
  `TheTwoExpectationTablesNameTheSameContainers` keeps them equal now. The data entry was the cheap
  part: four names broke three tests and falsified a fourth title, so `NOT_A_USER_CONFIG` is named and
  asserted, and a claim about "every config" has to say which population it means.


## Corrections

When something already written turns out to be wrong, **correct it in place and say so**, in
the document, with how the error happened. This is a standing convention here, not a courtesy:
readers calibrate the rest of the analysis against the recorded mistakes, and five are recorded
so far. Update the count in `README.md` and in the `docs/findings.md` preamble.

The most instructive corrections are the ones where the wrong rule produced the right answer.
Say when that happened.

**Then kill the old phrasing everywhere else**, which is step 4 and is not optional:

* Add the dead wording to the table in `reference/superseded.md`, in the same commit. `make facts`
  then fails for anyone who restates it, including you in six weeks.
* Choose a phrase that is dead in **every** context, not just the one that prompted it. A figure
  that stays correct under a narrower scope does not belong in that table; mark the live value
  with a `fact:` marker instead.
* Grep the summaries yourself as well: `README.md`, `CLAUDE.md`, `docs/roadmap.md`,
  `docs/config-format.md` and the memory maps. The table only catches the exact wording you
  thought to record.
* If the finding moves a corpus total, the value carries a `<!--fact:name-->` marker wherever it
  is quoted, and `make facts-write` updates every copy. Add the fact to `tools/facts.py` if it is
  a new one.

**`make facts-write` is not the end of step 4, it is the middle.** It prints every value it
rewrote; read that list against the diff, because the two things a marker cannot see are the
sentence beside the number and the heading above it.

* **A marker is a claim about now, never about the past.** `docs/roadmap.md` carries a coverage
  table with one column per finding that moved the number. History columns carry a plain number
  and **no marker**. A new finding **adds a column**; it does not overwrite the live one, because
  the live column's heading names the finding that produced it and `facts-write` cannot update a
  heading.
* That is not hypothetical. On 8 August 2026 a `facts-write` run put section 66's numbers under
  section 65's heading and left the paragraph below asserting the other architectures had been at
  their ceiling, one commit after the tool that was supposed to prevent exactly this.
* So after a rewrite, **re-read the prose around every number it touched**, not the number. Phrases
  like "nothing else moved", "at the ceiling", "about a third" are summaries of a figure with no
  figure in them, so nothing mechanical will ever catch them. Kill them through
  `reference/superseded.md` like any other dead claim.

## Finishing

```sh
make prose facts lint test
make corpus
```

`make facts` is the mechanical half of step 4: it recomputes every marked number from the corpus
and refuses any superseded phrasing outside a correction. It also runs in the pre-commit hook, so
a document that contradicts the code cannot be committed without `--no-verify`.

Then a commit whose message says what changed in the understanding, not which files moved.
The publication gate runs automatically before any commit, or by hand:

```sh
python3 bin/check-publishable.py
```

If the finding changes what the project should do next, `docs/roadmap.md` is the plan of record
and needs the edit too. If it changes a load-bearing fact, so does `CLAUDE.md`, which is what a
future session reads first.
