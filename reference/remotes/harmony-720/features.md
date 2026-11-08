# Harmony 720: features

What a Harmony 720 can be set up to do, as far as its configuration and Logitech say.

## Capabilities

<!-- generated:capabilities -->
| skin | max devices | favourite channel buttons | sequences | page button | sound and picture keys | long press |
|---|---|---|---|---|---|---|
| 44 | 12 | 24 | yes | yes | no | no |

Generated from `MODELS_BY_SKIN` and `hasLongPress` in `packages/base/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

**At most 12 devices** is Logitech's service's figure, three fewer than the 880's and 885's.[^s136]

## Favourite channels

**The one Harmony 720 configuration read holds one number sender and twenty four lists that hand it a
number**, which read as its favourite channels, and twenty four is the comparison table's count of favourite
channel buttons for this skin.[^t-885-number-sender-corpus][^x-forum-table] The 720's firmware has the
routine that sends them, [state](../../config-format/state.md#base-slot-16-the-number-sender).[^t-885-number-sender-corpus]

## Not checked

* Anything a person sets up on a unit, and learning.[^unchecked]

[^s136]: Stated by Logitech, by their service. [Section 136](../../../docs/findings.md#s136)
[^t-885-number-sender-corpus]: Measured in configurations. [The test](../../../tests/test_harmony_885_number_sender.py)
[^x-forum-table]: Stated by a third party. [The comparison table](https://www.harmony-remote-forum.de/harmony_compare.php)
[^unchecked]: Not checked.
