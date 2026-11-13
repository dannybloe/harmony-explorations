# Harmony 785: keys

A Harmony 785 has 53 keys. Each sits at a crossing of the keypad's wiring, and the firmware turns that
crossing into a number, its scan code, which is what a configuration binds a command to. This page lists the
keys on the drawing and the numbers its configurations' key tables hold; which key raises which number is not
known, because no 785 has been pressed.

## Every key on the drawing

**The face is the [Harmony 720's](../harmony-720/keys.md) with a row of four colour keys** between the
transport keys and the digits, red, green, yellow and blue from the left, which the manual calls the
teletext buttons.[^t-printing-785] The manual's picture and the product photograph show each colour key with
the outline and the column of the transport key above it, one row below the Rec row, and the whole key in its
colour with nothing printed on it.[^t-printing-785] To make room the transport keys sit a little higher than
on the 720 and the digits a little lower; every other key, and its printing, is the 720's, but for `Vol` and
`Ch`, which the 785 prints without the 720's full stop, and the model name above the screen.[^t-printing-785]

* [`reference/silhouettes/h785.svg`](../../silhouettes/h785.svg), from `packages/silhouettes/src/models/h785.ts`.

<!-- generated:keys -->
53 keys on the drawing `h785`, 47 on the keypad and 6 that the screen speaks for. None carries a scan code.

| key | kind | name from | scan code | screen zone | printed on or beside it |
|---|---|---|---|---|---|
| `Activities` | keypad | printed | not measured |  | Activities |
| `AllOff` | keypad | printed | not measured |  |  |
| `Blue` | keypad | printed | not measured |  |  |
| `ChannelDown` | keypad | printed | not measured |  |  |
| `ChannelUp` | keypad | printed | not measured |  |  |
| `Clear` | keypad | printed | not measured |  | *, clear |
| `Device` | keypad | printed | not measured |  | Devices |
| `DirectionDown` | keypad | printed | not measured |  |  |
| `DirectionLeft` | keypad | printed | not measured |  |  |
| `DirectionRight` | keypad | printed | not measured |  |  |
| `DirectionUp` | keypad | printed | not measured |  |  |
| `DownArrow` | keypad | printed | not measured |  |  |
| `Enter` | keypad | printed | not measured |  | #, enter |
| `Exit` | keypad | printed | not measured |  | Exit |
| `FastForward` | keypad | printed | not measured |  | Fwd |
| `Green` | keypad | printed | not measured |  |  |
| `Guide` | keypad | printed | not measured |  | Guide |
| `Help` | keypad | printed | not measured |  | Help |
| `Info` | keypad | printed | not measured |  | Info |
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
| `Pause` | keypad | printed | not measured |  | Pause |
| `Play` | keypad | printed | not measured |  | Play |
| `PrevChannel` | keypad | printed | not measured |  | Prev |
| `Record` | keypad | printed | not measured |  | Rec |
| `Red` | keypad | printed | not measured |  |  |
| `Rewind` | keypad | printed | not measured |  | Rew |
| `ScreenNext` | keypad | printed | not measured |  |  |
| `ScreenPrev` | keypad | printed | not measured |  |  |
| `Select` | keypad | printed | not measured |  | OK |
| `SkipBack` | keypad | printed | not measured |  | Replay |
| `SkipForward` | keypad | printed | not measured |  | Skip |
| `Stop` | keypad | printed | not measured |  | Stop |
| `UpArrow` | keypad | printed | not measured |  |  |
| `VolumeDown` | keypad | printed | not measured |  |  |
| `VolumeMute` | keypad | printed | not measured |  | Mute |
| `VolumeUp` | keypad | printed | not measured |  |  |
| `Yellow` | keypad | printed | not measured |  |  |
| `ScreenLeft1` | screen | printed | not measured | 1 |  |
| `ScreenLeft2` | screen | printed | not measured | 3 |  |
| `ScreenLeft3` | screen | printed | not measured | 5 |  |
| `ScreenRight1` | screen | printed | not measured | 2 |  |
| `ScreenRight2` | screen | printed | not measured | 4 |  |
| `ScreenRight3` | screen | printed | not measured | 6 |  |

Generated from `packages/silhouettes/src/models/h785.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

## The key table

**The configurations' key tables hold 53 press codes, the Harmony 720's 49 and 12, 26, 28 and 63**, which is
the drawing's 53 keys: the 720's 49 and the four colour keys. Two configurations, read off two remotes, hold
the same 53.[^t-785-keys] So the colour keys raise four of those four codes, but which raises which is not
known, and the 885's code for a colour key says nothing about a 785, since the 720's wiring is its own,
[the 720's keys](../harmony-720/keys.md#the-key-table).[^t-720-keys]

**No key on the drawing carries a code**, since no 785 has been pressed.[^t-785-keys]

## Not checked

* Which printed key raises which code, whether any starts an activity or picks a device, and what a held key
  does.[^unchecked]

[^t-printing-785]: Stated by Logitech, in the manual. [The test](../../../tests/firmware/test_silhouettes.py)
[^t-785-keys]: Measured in configurations. [The test](../../../tests/firmware/test_silhouettes.py)
[^t-720-keys]: Measured in configurations. [The test](../../../tests/firmware/test_silhouettes.py)
[^unchecked]: Not checked.
