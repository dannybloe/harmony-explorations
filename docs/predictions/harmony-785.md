# Predictions for a Harmony 785, written before it was read

Written on 10 November 2026, before the first Harmony 785 on the bench was asked anything over USB, and
committed before the read so that what it confirms is worth something. No configuration and no image of a
785 exists in the lab, so the predictions come from the platform it shares with the Harmony 880 and 885,
[the architecture folder](../../reference/architectures/harmony-880-885/README.md), and from the Harmony
720's application image, which the model table names as the 785's regional twin. The outcomes go beside the
predictions once the unit is read, rather than over them.

## What was already seen before this was written

The remote was enumerated, which sends it nothing, before these predictions were written, so these two rows
are observations and not predictions:

| | seen |
|---|---|
| vendor and product id | `0x046D:0xC110`, the platform's |
| `bcdDevice` | `0x082D`: protocol 8 in the high byte and 45 in plain binary in the low, the 785's skin, in the older form the 880 and 885 use |
| product string | `Harmony Remote 0-4.5.0`, the string the Harmony 720's application image carries |

## The version block, predicted field by field

| field | predicted | from |
|---|---|---|
| 0 | `0x45` | application 4.5, from the product string and the 720's image |
| 1 | not predicted | the hardware version; the 885's units report 2.1, and no 785 or 720 unit has been read |
| 2, 3 | `0x49` from manufacturer `0x01`, **if it carries the 885's 2 MiB part** | the platform's flash ends at `0x200000` and the configuration region is laid out for that size |
| 4 | `0x80` | architecture 8 in the high nibble, software type 0 (a running application) in the low |
| 5 | `0x2D` | skin 45 |
| 6 | `0x08` | the platform byte, `0x08` on every Harmony 880 and 885 application image |
| 7, 10, 11 | `0x45` | they repeat field 0 on the images read |
| 8, 9 | not predicted | |

## The memory, predicted

* The identity block at `0x000110`, holding two GUIDs as on the 885, so the unit can be told from the
  second 785 by them.
* The configuration at `0x020000`, with a container that states architecture 8 and skin 45 in base slot 1.
* Base slot 2 as every Harmony 880 and 885 configuration states it, `15360, 0x1E0000, 0x1FE000`.
* A bootloader below `0x010000` and the application from `0x010000`, as on the 885.

## Outcomes

Not read yet.
