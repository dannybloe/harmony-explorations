# Samples

Empty on purpose, and now for a decided reason rather than an open one.

## The question, and the answer

It was asked directly on 7 August 2026: could the lab dumps be anonymised and committed here, so
the tests have a corpus without a private directory alongside the checkout? The answer is no, and
the reasoning is worth keeping because the obvious objection turns out to be the wrong one.

**Privacy is not what blocks it.** A config carries no account data at all. The `UserId`, the
account GUIDs, the `ServerID` and the session cookie live in the `.hfw` firmware packages, in their
`Data.xml`, and an EZHex config is a different artefact: its header holds `INTENDEDVERSION`,
`BINARYDATASIZE`, the flash and skin identifiers and Logitech's own server hostnames, and nothing
that names a person. Every dump in the lab is also already public at its source, published by its
owner, with the permission recorded in each `META.md`.

What a config does carry is an **equipment inventory**: slot 0 names state variables after the
devices they belong to, the infrared database holds the codes for those exact devices, and the
screen programs hold the labels. That is somebody's living room rather than somebody's account, and
their owners published it knowingly.

**What blocks it is copyright.** A config is Logitech-generated data, including an infrared code
database compiled out of Logitech's own. That is the same reason firmware is excluded here, and
being public somewhere else is not a licence. This repository is MIT and FreeHarmony consumes it,
so content that cannot be MIT licensed does not belong in either.

**A second reason, weaker but real:** a scrub cannot be certified. Base slot 6 is 60628 bytes and
base slot 17 is 434214 bytes in the Harmony 600's config, and no analysis here accounts for every
byte of them. A scrubber removes what is understood, and git history is permanent.

## What is done instead

* **Derived structure is published freely.** That is what `docs/config-format.md` and
  `docs/findings.md` are, and there is no restriction on it in any `META.md`.
* **Checksums and provenance** go in [../reference/checksums.md](../reference/checksums.md), so a
  claim about a file can be checked by anyone holding the same file.
* **The contribution probe**, `packages/probe`, exists precisely for this: a few kilobytes of JSON
  describing a config's shape, its counts, its addresses and its check outcomes, and none of its
  contents. It is designed to be published, and it is how somebody else's remote widens the corpus
  without their config leaving their machine.
* **Golden vectors** hold what the parsers say about each sample, and they live in the lab rather
  than here, because a vector maps somebody's actual configuration.

## What would change the answer

A **synthetic corpus**: take a real config, replace every content field with generated data, and
emit it. Real structure, no real content, no Logitech data. That needs the round trip codec of
milestone M2 first, because you can only safely rewrite what you can rebuild. When M2 lands, this
becomes worth revisiting.

The three **safe mode containers** are a smaller intermediate case that was considered and not
taken. They are 7115 bytes each, they come from the firmware packages so they are identical for
every owner of the model, and their slot 0 holds nothing but `Root` and `State` with no infrared
groups at all. They carry no personal data by construction. The copyright objection still applies,
which is why they are not here either, but they are the first thing to reconsider if that objection
is ever resolved.
