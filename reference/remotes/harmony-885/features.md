# Harmony 885: features

What a Harmony 885 can be set up to do: how many devices it holds, how it learns a code it does not know,
and what Logitech's service still does for it.

## Capabilities

<!-- generated:capabilities -->
| skin | max devices | favourite channel buttons | sequences | page button | sound and picture keys | long press |
|---|---|---|---|---|---|---|
| 15 | 15 | 16 | yes | yes | no | no |
| 17 | 15 | 16 | yes | yes | no | no |

Generated from `MODELS_BY_SKIN` and `hasLongPress` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

**At most 15 devices** is both the community comparison table's figure and Logitech's own: its live
service states 15 for the Harmony 880, and the two sources agree on it.[^s131] No configuration read holds
that many, so the limit is stated and not demonstrated.[^s136b]

## Learning a code

**A code the remote learns from an original remote is not stored as it was learned.** The Harmony 880's
manual describes the remote uploading the signal over its cable to Logitech's web site, which looks for a
matching pattern in its database: a match is converted to a compact form, and a miss is stored in its
original format. So the choice of encoding was made on Logitech's server and not on the remote.[^s42] Where
the sensor is, is in [hardware.md](hardware.md).

## Logitech's service

**Logitech's live service has skins 15 and 17 switched off**: its product table carries an enabled flag,
true for eighteen skins, and neither of these is among them. It also checks a remote's serial number and
refuses one it does not know, which it did for a Harmony 880.[^s136] So the service compiles no
configuration for this model from here.

## Not checked

* Anything a person sets up on a unit: activities, sequences, favourite channels.[^unchecked]

[^s131]: Stated by Logitech, by their service. [Section 131](../../../docs/findings.md#s131)
[^s136b]: Measured in configurations. [Section 136](../../../docs/findings.md#s136)
[^s42]: Stated by Logitech, in the manual. [Section 42](../../../docs/findings.md#s42)
[^s136]: Stated by Logitech, by their service. [Section 136](../../../docs/findings.md#s136)
[^unchecked]: Not checked.
