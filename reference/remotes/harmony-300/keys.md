# Harmony 300: keys

Fifty five keys, the same keys in the same places as on a Harmony 350, with different words printed on
some of them. The four device keys each pick one device, and nothing yet says which electrical code each
key sends to the remote's processor.

The drawing, [`reference/silhouettes/h300.svg`](../../silhouettes/h300.svg), is generated from
`packages/silhouettes/src/models/h300.ts`, which **takes every shape from the Harmony 350's drawing** and
states only what is printed differently, because the two are one moulding[^t-moulding]. The printing is
read off the cover photograph of Logitech's setup guide, PDF page 2[^t-printing].

## How the printing differs from the 350's

| | Harmony 300 | Harmony 350 |
|---|---|---|
| device keys | TV, Cable/Sat, DVD, VCR/Aux | TV / AVR, Cable/DVD, BD / Media, Game/MP3 |
| power key | `Power` printed under it | |
| the key between the favourites | TV over Input, and no "Favorites" word | Input, under "Favorites" |
| colour keys | yellow, blue, red, green, with A to D under them | red, green, yellow, blue |
| the key the 350 prints DVR | List | DVR |
| the four keys beside play | Replay, Skip, Record and Stop printed under them | |
| the top and bottom of the face | Logitech's logo, and "Harmony 300" | "Harmony" |

All from `h300.ts`, read off Logitech's setup guide[^t-printing].

## Every key on the drawing

<!-- generated:keys -->
55 keys on the drawing `h300`, 55 on the keypad and 0 that the screen speaks for. None carries a scan code.

| key | kind | name from | scan code | screen zone | printed on or beside it |
|---|---|---|---|---|---|
| `Blue` | keypad | printed | not measured |  | B |
| `CableSat` | keypad | printed | not measured |  | Cable/Sat |
| `ChannelDown` | keypad | printed | not measured |  |  |
| `ChannelUp` | keypad | printed | not measured |  |  |
| `Clear` | keypad | printed | not measured |  | Clear |
| `DirectionDown` | keypad | printed | not measured |  |  |
| `DirectionLeft` | keypad | printed | not measured |  |  |
| `DirectionRight` | keypad | printed | not measured |  |  |
| `DirectionUp` | keypad | printed | not measured |  |  |
| `DownArrow` | keypad | printed | not measured |  |  |
| `Dvd` | keypad | printed | not measured |  | DVD |
| `Enter` | keypad | printed | not measured |  | E, Enter |
| `Exit` | keypad | printed | not measured |  | Exit |
| `FastForward` | keypad | printed | not measured |  |  |
| `Favorite1` | keypad | printed | not measured |  | 1 |
| `Favorite2` | keypad | printed | not measured |  | 2 |
| `Favorite3` | keypad | printed | not measured |  | 3 |
| `Favorite4` | keypad | printed | not measured |  | 4 |
| `Favorite5` | keypad | printed | not measured |  | 5 |
| `Green` | keypad | printed | not measured |  | D |
| `Guide` | keypad | printed | not measured |  | Guide |
| `Info` | keypad | printed | not measured |  | Info |
| `Input` | keypad | printed | not measured |  | TV, Input |
| `List` | keypad | printed | not measured |  | List |
| `Live` | keypad | printed | not measured |  | Live |
| `Menu` | keypad | printed | not measured |  | Menu |
| `Number0` | keypad | printed | not measured |  | 0 |
| `Number1` | keypad | printed | not measured |  | 1 |
| `Number2` | keypad | printed | not measured |  | 2, abc |
| `Number3` | keypad | printed | not measured |  | 3, def |
| `Number4` | keypad | printed | not measured |  | 4, ghi |
| `Number5` | keypad | printed | not measured |  | 5, jkl |
| `Number6` | keypad | printed | not measured |  | 6, mno |
| `Number7` | keypad | printed | not measured |  | 7, pqrs |
| `Number8` | keypad | printed | not measured |  | 8, tuv |
| `Number9` | keypad | printed | not measured |  | 9, wxyz |
| `Pause` | keypad | printed | not measured |  |  |
| `Play` | keypad | printed | not measured |  |  |
| `Power` | keypad | printed | not measured |  | Power |
| `PrevChannel` | keypad | printed | not measured |  |  |
| `Record` | keypad | printed | not measured |  | Record |
| `Red` | keypad | printed | not measured |  | C |
| `Rewind` | keypad | printed | not measured |  |  |
| `Select` | keypad | printed | not measured |  | OK |
| `SkipBack` | keypad | printed | not measured |  | Replay |
| `SkipForward` | keypad | printed | not measured |  | Skip |
| `Stop` | keypad | printed | not measured |  | Stop |
| `Tv` | keypad | printed | not measured |  | TV |
| `UpArrow` | keypad | printed | not measured |  |  |
| `VcrAux` | keypad | printed | not measured |  | VCR/Aux |
| `VolumeDown` | keypad | printed | not measured |  |  |
| `VolumeMute` | keypad | printed | not measured |  |  |
| `VolumeUp` | keypad | printed | not measured |  |  |
| `WatchTV` | keypad | printed | not measured |  | Watch TV |
| `Yellow` | keypad | printed | not measured |  | A |

Generated from `packages/silhouettes/src/models/h300.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

## A device key is a slot in the configuration

**The infrared group index is the device key**: TV is group 0, Cable/Sat 1, DVD 2 and VCR/Aux 3, each group
identified in Logitech's catalogue on a configuration given one device per key[^s265]. The key table binds
each key's **press** to selecting its device, under scan codes 5, 1, 7 and 4 in that order, so those four
are the only scan codes known on this remote,
[the family's memory page](../../architectures/harmony-300-350/memory.md#which-infrared-group-a-device-takes)[^t-device-groups-c].
What an infrared group is, is [the configuration format's](../../config-format/infrared-records.md).

## No scan codes

Beyond the four device keys, whose codes come from the configurations above, nothing ties a key on this
family to a scan code, and the keypad scanner of this generation has not been read[^unchecked],
[the family's README](../../architectures/harmony-300-350/README.md). The drawing claims no code and no
candidate on any key, the device keys included until the scanner is read, and its test asserts exactly
that, `tests/test_silhouettes.py`.

## Not checked

* Every scan code but the device keys'.
* Whether the pause half of the play key is a separate part: the setup guide's photograph suggests one,
  and the drawing follows the 350's single part with two halves, since the moulding is the
  350's[^t-moulding].

[^t-moulding]: Measured on a unit. [The test](../../../packages/silhouettes/test/models.test.ts)
[^t-printing]: Stated by Logitech, in the manual. [The test](../../../tests/test_silhouettes.py)
[^s265]: Measured in configurations. [Section 265](../../../docs/findings.md#s265)
[^unchecked]: Not checked.
[^t-device-groups-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_device_groups.py)
