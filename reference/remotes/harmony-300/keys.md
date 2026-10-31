# Harmony 300: keys

Fifty five keys, the same keys in the same places as on a Harmony 350, with different words printed on
some of them. **The model comes in two printings**: the US one, skin 78, and the European one, skin 79,
which Logitech names the Harmony 300 EMEA. They differ in the colour keys and in the favourite block, and
each has a drawing of its own. The four device keys each pick one device. **Each key raises the code of
the Harmony 350 key in the same place**: pressed one by one on a European Harmony 300 with an infrared
receiver listening, 49 keys were tied to their code and every one was that code[^t-harmony-300-keys-u],
[below](#scan-codes).

The two drawings are generated from `packages/silhouettes/src/models/`, and both **take every shape from
the Harmony 350's drawing** and state only what is printed differently, because the two models are one
moulding[^t-moulding]:

* [`reference/silhouettes/h300.svg`](../../silhouettes/h300.svg), the US printing, skin 78, from `h300.ts`,
  read off the cover photograph of Logitech's setup guide, PDF page 2[^t-printing];
* [`reference/silhouettes/h300eu.svg`](../../silhouettes/h300eu.svg), the European printing, skin 79, from
  `h300eu.ts`, as stated by a person holding a skin 79 remote[^t-printing-eu]. No manual or photograph of
  the European model was read.

## How the printing differs from the 350's

| | Harmony 300, skin 78 | Harmony 300, skin 79 | Harmony 350 |
|---|---|---|---|
| device keys | TV, Cable/Sat, DVD, VCR/Aux | as skin 78 | TV/Media, Cable/PC, AVR/Game, DVD/Music, or in an earlier printing TV / AVR, Cable/DVD, BD / Media, Game/MP3 |
| power key | `Power` printed under it | as skin 78 | |
| the key in the middle of the favourite block | TV over Input, and no "Favorites" word | as skin 78 | Input, under "Favorites" |
| the favourites | five, 1 and 5 beside TV Input, 2, 3 and 4 below it | four and Teletext: 1 left of TV Input and 3 right of it, and below them 2, Teletext with a teletext glyph, and 4 | five, as skin 78 |
| colour keys | yellow, blue, red, green, with A to D under them | red, green, yellow, blue, with nothing under them | red, green, yellow, blue |
| the key the 350 prints DVR | List | as skin 78 | DVR |
| the four keys beside play | Replay, Skip, Record and Stop printed under them | as skin 78 | |
| the top and bottom of the face | Logitech's logo, and "Harmony 300" | as skin 78 | "Harmony" |

The skin 78 column is read off Logitech's setup guide[^t-printing]. The skin 79 column is what a person
holding a skin 79 remote stated differs from skin 78, the colour keys and the favourite block, and the
rest as skin 78[^t-printing-eu]. Where on or beside the Teletext key its word is printed was not
stated[^unchecked]. The skin 78 drawing served both skins until the skin 79 printing was stated.

## Every key on the drawings

### US printing, skin 78

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

### European printing, skin 79

<!-- generated:keys-h300eu -->
55 keys on the drawing `h300eu`, 55 on the keypad and 0 that the screen speaks for. 49 carry a scan code: 49 heard by pressing each key with a receiver listening, in two device modes, its code the one of the 56 that, raised at that point of the presses, gives what was heard[^t-harmony-300-keys-u].

| key | kind | name from | scan code | screen zone | printed on or beside it |
|---|---|---|---|---|---|
| `CableSat` | keypad | printed | 1 (0x01)[^t-harmony-300-keys-u] |  | Cable/Sat |
| `Favorite3` | keypad | printed | 2 (0x02)[^t-harmony-300-keys-u] |  | 3 |
| `Power` | keypad | printed | 3 (0x03)[^t-harmony-300-keys-u] |  | Power |
| `VcrAux` | keypad | printed | 4 (0x04)[^t-harmony-300-keys-u] |  | VCR/Aux |
| `Tv` | keypad | printed | 5 (0x05)[^t-harmony-300-keys-u] |  | TV |
| `WatchTV` | keypad | printed | 6 (0x06)[^t-harmony-300-keys-u] |  | Watch TV |
| `Dvd` | keypad | printed | 7 (0x07)[^t-harmony-300-keys-u] |  | DVD |
| `Favorite1` | keypad | printed | 8 (0x08)[^t-harmony-300-keys-u] |  | 1 |
| `Favorite2` | keypad | printed | 9 (0x09)[^t-harmony-300-keys-u] |  | 2 |
| `Menu` | keypad | printed | 10 (0x0A)[^t-harmony-300-keys-u] |  | Menu |
| `Teletext` | keypad | printed | 11 (0x0B)[^t-harmony-300-keys-u] |  | Teletext |
| `Exit` | keypad | printed | 12 (0x0C)[^t-harmony-300-keys-u] |  | Exit |
| `Red` | keypad | printed | 13 (0x0D)[^t-harmony-300-keys-u] |  |  |
| `DirectionLeft` | keypad | printed | 14 (0x0E)[^t-harmony-300-keys-u] |  |  |
| `VolumeMute` | keypad | printed | 15 (0x0F)[^t-harmony-300-keys-u] |  |  |
| `List` | keypad | printed | 16 (0x10)[^t-harmony-300-keys-u] |  | List |
| `Number4` | keypad | printed | 17 (0x11)[^t-harmony-300-keys-u] |  | 4, ghi |
| `Number7` | keypad | printed | 18 (0x12)[^t-harmony-300-keys-u] |  | 7, pqrs |
| `Number0` | keypad | printed | 20 (0x14)[^t-harmony-300-keys-u] |  | 0 |
| `SkipBack` | keypad | printed | 21 (0x15)[^t-harmony-300-keys-u] |  | Replay |
| `Rewind` | keypad | printed | 22 (0x16)[^t-harmony-300-keys-u] |  |  |
| `Record` | keypad | printed | 23 (0x17)[^t-harmony-300-keys-u] |  | Record |
| `Number1` | keypad | printed | 24 (0x18)[^t-harmony-300-keys-u] |  | 1 |
| `Green` | keypad | printed | 27 (0x1B)[^t-harmony-300-keys-u] |  |  |
| `Yellow` | keypad | printed | 28 (0x1C)[^t-harmony-300-keys-u] |  |  |
| `Blue` | keypad | printed | 29 (0x1D)[^t-harmony-300-keys-u] |  |  |
| `FastForward` | keypad | printed | 30 (0x1E)[^t-harmony-300-keys-u] |  |  |
| `DirectionRight` | keypad | printed | 31 (0x1F)[^t-harmony-300-keys-u] |  |  |
| `PrevChannel` | keypad | printed | 32 (0x20)[^t-harmony-300-keys-u] |  |  |
| `Guide` | keypad | printed | 33 (0x21)[^t-harmony-300-keys-u] |  | Guide |
| `Favorite4` | keypad | printed | 34 (0x22)[^t-harmony-300-keys-u] |  | 4 |
| `Info` | keypad | printed | 36 (0x24)[^t-harmony-300-keys-u] |  | Info |
| `Number6` | keypad | printed | 37 (0x25)[^t-harmony-300-keys-u] |  | 6, mno |
| `SkipForward` | keypad | printed | 38 (0x26)[^t-harmony-300-keys-u] |  | Skip |
| `Number3` | keypad | printed | 39 (0x27)[^t-harmony-300-keys-u] |  | 3, def |
| `Stop` | keypad | printed | 40 (0x28)[^t-harmony-300-keys-u] |  | Stop |
| `ChannelDown` | keypad | printed | 41 (0x29)[^t-harmony-300-keys-u] |  |  |
| `DirectionDown` | keypad | printed | 42 (0x2A)[^t-harmony-300-keys-u] |  |  |
| `Play` | keypad | printed | 44 (0x2C)[^t-harmony-300-keys-u] |  |  |
| `Number9` | keypad | printed | 45 (0x2D)[^t-harmony-300-keys-u] |  | 9, wxyz |
| `Pause` | keypad | printed | 46 (0x2E)[^t-harmony-300-keys-u] |  |  |
| `Number2` | keypad | printed | 47 (0x2F)[^t-harmony-300-keys-u] |  | 2, abc |
| `Number5` | keypad | printed | 48 (0x30)[^t-harmony-300-keys-u] |  | 5, jkl |
| `VolumeUp` | keypad | printed | 49 (0x31)[^t-harmony-300-keys-u] |  |  |
| `Select` | keypad | printed | 50 (0x32)[^t-harmony-300-keys-u] |  | OK |
| `DirectionUp` | keypad | printed | 51 (0x33)[^t-harmony-300-keys-u] |  |  |
| `VolumeDown` | keypad | printed | 52 (0x34)[^t-harmony-300-keys-u] |  |  |
| `Number8` | keypad | printed | 53 (0x35)[^t-harmony-300-keys-u] |  | 8, tuv |
| `ChannelUp` | keypad | printed | 55 (0x37)[^t-harmony-300-keys-u] |  |  |
| `Clear` | keypad | printed | not measured |  | Clear |
| `DownArrow` | keypad | printed | not measured |  |  |
| `Enter` | keypad | printed | not measured |  | E, Enter |
| `Input` | keypad | printed | not measured |  | TV, Input |
| `Live` | keypad | printed | not measured |  | Live |
| `UpArrow` | keypad | printed | not measured |  |  |

Generated from `packages/silhouettes/src/models/h300eu.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

## A device key is a slot in the configuration

**The infrared group index is the device key**: TV is group 0, Cable/Sat 1, DVD 2 and VCR/Aux 3, each group
identified in Logitech's catalogue on a configuration given one device per key[^s265]. The key table binds
each key's **press** to selecting its device, under scan codes 5, 1, 7 and 4 in that order,
[the family's memory page](../../architectures/harmony-300-350/memory.md#which-infrared-group-a-device-takes)[^t-device-groups-c].
Pressed on a remote, each of the four selected its device: the keys pressed after it sent that device's
codes[^t-harmony-300-keys-u]. What an infrared group is, is
[the configuration format's](../../config-format/infrared-records.md).

## Scan codes

**The codes are the Harmony 350's, place for place**, [its table](../harmony-350/keys.md#scan-codes): both
run the one 1.4 image, whose keypad scan numbers a key 1 to 56,
[the family's firmware page](../../architectures/harmony-300-350/firmware.md#the-keypad-scan). **On a skin
79 remote every key was pressed** with an infrared receiver listening, in the television's mode and the set
top box's, on a configuration of four devices, and in the television's mode again on a copy binding every
key; each key's code is the one of the 56 that, raised in its place, gives what the receiver heard. **49
keys were tied that way and each is the code of the 350 key in the same place**, the device keys, Watch
TV, Power, the favourites and Teletext among them[^t-harmony-300-keys-u]. The six left are Clear, Enter,
TV Input, Live and the two arrows between Menu, Info, Exit and Guide: neither configuration binds them in
the modes pressed, and they sent nothing[^t-harmony-300-keys-u].

The device keys are codes 5, 1, 7 and 4, TV, Cable/Sat, DVD and VCR/Aux, which this model's configurations
select **on the press**, where the Harmony 350 waits for the release[^t-harmony-350-keys-c]. Before the keys
were pressed this page took the codes from configurations alone: the commands the two models'
configurations send from each code carry the same names, with a minority that disagrees, one of this
model's configurations naming its television's volume codes `DirectionRight` and `DirectionLeft`, which is
not explained[^t-harmony-350-keys-c].

**The colour keys of skin 79 send the colour printed on them.** Left to right they sent the television's
red, green, yellow and blue, codes 13, 27, 28 and 29, the 350's red, green, yellow and blue; pressed by
colour in the set top box's mode, yellow, blue, red and green, they raised 28, 29, 13 and
27[^t-harmony-300-keys-u]. **Skin 78 prints yellow, blue, red and green on those four
places**[^t-printing], while both of this model's configurations send the `Red` command from code 13 and
`Green`, `Yellow` and `Blue` from 27, 28 and 29[^t-harmony-350-keys-c]. So on skin 78 either the keys send
another colour's command than the one printed on them, or the photograph's printing was read wrong; no
skin 78 remote has been pressed[^unchecked]. This paragraph said the colour keys disagree with the
printing on the whole model until the skin 79 printing was stated and pressed.

**The favourites of skin 79** are codes 8, 9, 2 and 34 for the keys printed 1, 2, 3 and 4, and Teletext is
code 11, the places of the 350's favourites 1, 2, 5 and 4 and its favourite 3[^t-harmony-300-keys-u]. On a
configuration Logitech's service compiled with the channels 1, 2, 3 and 666, the key printed 1 sent channel
1, printed 2 channel 3, printed 3 channel 2 and printed 4 channel 666: the configuration binds the four
channels to codes 8, 2, 9 and 34 in that order, so the second and third channels sit on the keys printed 3
and 2[^t-harmony-300-keys-u]. Why the compile put them there is not explained; the order in which the
channels were entered is not known here[^unchecked]. Code 11 sends the television's Teletext in that
configuration and the set top box's code 22, a command bound to no other key[^t-harmony-300-keys-u].

**The skin 79 drawing carries the 49 codes**, and the skin 78 drawing none: no skin 78 remote has been
pressed, and its printing puts other colours on the colour keys, so that its keys raise the same codes by
place is the moulding's inference and not a measurement[^unchecked]. Neither drawing carries the 350's
candidate codes for Live.

## Not checked

* Any key of skin 78, by pressing it with a receiver listening; and what its colour keys send against what
  they print.
* The codes of Clear, Enter, TV Input, Live and the two arrows on either printing: no configuration on the
  remote pressed bound them.
* Where the word Teletext is printed on skin 79, and the exact form of its teletext glyph.
* Whether the pause half of the play key is a separate part: the setup guide's photograph suggests one,
  and the drawings follow the 350's single part with two halves, since the moulding is the
  350's[^t-moulding].

[^t-moulding]: Measured on a unit. [The test](../../../packages/silhouettes/test/models.test.ts)
[^t-printing]: Stated by Logitech, in the manual. [The test](../../../tests/test_silhouettes.py)
[^t-printing-eu]: Measured on a unit. [The test](../../../tests/test_silhouettes.py)
[^s265]: Measured in configurations. [Section 265](../../../docs/findings.md#s265)
[^unchecked]: Not checked.
[^t-device-groups-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_device_groups.py)
[^t-harmony-350-keys-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_keys.py)
[^t-harmony-300-keys-u]: Measured on a unit. [The test](../../../tests/test_harmony_300_keys.py)
