# Harmony 890: features

What a Harmony 890 or 895 can be set up to do, as far as its configurations and Logitech say.

## Capabilities

<!-- generated:capabilities -->
| skin | max devices | favourite channel buttons | sequences | page button | sound and picture keys | long press |
|---|---|---|---|---|---|---|
| 19 | 15 | 16 | yes | yes | no | no |
| 23 | 15 | 16 | yes | yes | no | no |

Generated from `MODELS_BY_SKIN` and `hasLongPress` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

**At most 15 devices** is the community comparison table's figure for both skins.[^x-forum-table] No
configuration read holds that many, so the limit is stated and not demonstrated.[^s136b]

## The infrared database

**A Harmony 890's configuration holds 300 infrared codes**, in four groups, every one of its 463 duration
blocks decoding.[^s181][^s184]

**A Harmony 895's configuration holds none at all**, which is proven by the records' own addresses rather
than a reader that found nothing: a record states its own start address, and no such record exists in it.
Its owner states six devices on it.[^s181] How the remote controls them without an infrared record is not
established.[^unchecked]

## Logitech's service

**Logitech's live service has skins 19 and 23 switched off**: its product table carries an enabled flag,
true for eighteen skins, and neither of these is among them, so it compiles nothing for this model.[^s136]

## Not checked

* Anything a person sets up on a unit, and what the radio channels are used for.[^unchecked]

[^x-forum-table]: Stated by a third party. [The comparison table](https://www.harmony-remote-forum.de/harmony_compare.php)
[^s136b]: Measured in configurations. [Section 136](../../../docs/findings.md#s136)
[^s181]: Measured in configurations. [Section 181](../../../docs/findings.md#s181)
[^s184]: Measured in configurations. [Section 184](../../../docs/findings.md#s184)
[^unchecked]: Not checked.
[^s136]: Stated by Logitech, by their service. [Section 136](../../../docs/findings.md#s136)
