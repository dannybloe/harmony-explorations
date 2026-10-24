# Glossary of this project's own words

The words for how this project works: its corpus, its tooling and its process. The vocabulary of a
Harmony itself, Logitech's words and the standard ones, is [reference/glossary.md](../reference/glossary.md).

## The corpus

**corpus** (our name). Every sample file the project holds: configs, firmware images and the
containers cut out of them. It lives in a private directory called the **lab**, never in this
repository, because the files are Logitech's material and a config records what equipment
somebody owns.

**lab** (our name). That private directory, alongside the repository. `HARMONY_LAB` points at
it, and the test suite skips cleanly when it is absent, so a fresh clone with no lab still
passes.

**sample** (standard). One file in the corpus. "Two samples" is the minimum evidence for a claim
here, and **two samples of one model are much weaker than two architectures**.

**contributor** (our name). Someone who shared a dump. Each contributed directory carries a
`META.md` recording who, when, with what permission, and **what is in the config**, which is the
part that is hardest to recover later and most valuable to have.

**counterexample supply** (our name). A sample kept specifically because it disagrees with the
rest. A claim that every file in the corpus confirms may just mean the corpus agrees with
itself, so a file that breaks a rule is worth more than one that keeps it.

## Tooling and process

**concordance** (someone else's program). The existing open source tool for talking to these
remotes. Used here as a cross-check and as a source of protocol facts, never copied, because its
licence is incompatible with this repository's. It has two known defects on our architectures,
recorded in `docs/concordance-notes.md`.

**Ghidra** (standard tool). A disassembler and decompiler. Its project files embed a copy of the
firmware, so they never go in this repository.

**byte accounting**, printed by `make coverage` (our name). What share of a config the reader can
attribute to a known structure. 100% means nothing is unexplained; **overlaps mean two readers
claim the same byte**, which is a defect rather than something to interpret.

**gap** and **gap family** (our names). A run of bytes nothing claims, and a set of gaps with the
same length. Families are what to look at: five gaps of the same size usually mean one
misunderstood structure rather than five mysteries.

**emitter** and **round trip** (standard terms, our use). Code that writes a config back out from
what the reader understood, and the test that the bytes come back identical. It deliberately builds
into an empty buffer rather than editing a copy, because **an emitter that starts from a copy passes
a round trip test while writing nothing at all**.

**golden vector** (standard practice, our use). A stored expected result, used here to check that
the Python and TypeScript readers agree field for field. Two implementations that quietly diverge
are the failure it exists to prevent.

**regression test** (standard). A test whose job is to fail when a conclusion stops being true.
Every confirmed fact in this project has one, because the analysis is AI produced and published as
such, so a claim that is not executable is only an assertion.

**rail** (our name). A refusal built into the library rather than into an interface, so it cannot
be bypassed by writing a script. The write rails are why exactly one write has ever reached a remote
here.

**fact marker** (our name). An HTML comment written directly after a number in a document, naming
the fact that number states. It does not render, so a reader never sees it, and it lets `make facts`
recompute the value from the corpus and refuse a document that has drifted away from the code.
`tools/facts.py --list` prints every fact available and `make facts-write` updates every copy of
one. No example is spelled out here on purpose: this file would then contain a marker naming a fact
that does not exist, and the check would fail on it.

**superseded** (our name). A claim a later finding killed. Recorded in `docs/superseded.md`
in the same commit, after which the tooling refuses that wording anywhere outside a correction.
This exists because an audit found eleven documents restating claims that `docs/findings.md` had
already corrected.

**correction** (our convention). An error recorded **in place**, with how it happened, rather than
quietly fixed. They are kept deliberately, so a reader can calibrate how much to trust the rest, and
the most instructive are the ones where a wrong rule produced the right answer. The running count
lives in the `docs/findings.md` preamble and is deliberately not repeated here: a number copied into
a second document is a number that goes stale, which is the failure the fact markers above exist to
catch.
