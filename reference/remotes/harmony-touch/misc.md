# Harmony Touch: miscellaneous

**The rule for this file**: a note goes here only when it fits none of the other nine files. If the same
kind of note would appear in the `misc.md` of several models, it deserves a file of its own in every
model folder instead, and `reference/remotes/README.md` and the generator's test get updated with it.

## Why there is no architecture folder

An architecture folder states what several models share, and nothing here has read a second model on
either of the Touch's two numbers. Logitech's templates put skin 99 at 18 with the Ultimate, Ultimate One,
Elite and others, and the remote says 17, a number the same templates give the hub family, section 197.
So a folder named for either would be a claim about which is right. Some skins appear at both numbers in
the templates, which fits 17 being a hub and 18 its remote, and that is **not established**, section 197.

## The architecture disagreement, and why nothing catches it

Logitech's client parses the template's `architectureid` into its ROM validator and then compares only the
model id and the flash ids, so the number is never checked against a device; its one other consumer gives
the same answer for 17 and 18, section 197. A field nothing can falsify is the condition under which a
value drifts unseen. The reading off the hardware keeps precedence here, decision 2.

## The first contact with the file based family

The Touch was the first remote of its family this project sent a packet to, and the first read taken from
it, sections 198 and 200. Two lessons came out of it that the rails carry: that a path can be an action,
`INERT_PATHS`, and that Logitech's own encoder in the lab was the cheap answer to a framing question two
guesses on hardware had failed at, section 200.

## Logitech's service and the Touch

Every attempt to fetch a Touch configuration from the service as a compile ends in an error, which
section 202 explained: the client never compiles for this product. The service still treats it as a
supported product, `IsEnabled` true, section 202.

## Not checked

* Nothing in this file is a claim about the remote beyond the cited sources.
