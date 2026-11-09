# Harmony 720: keys

A Harmony 720 has 49 keys. Each sits at a crossing of the keypad's wiring, and the firmware turns that
crossing into a number, its scan code, which is what a configuration binds a command to. This page lists the
keys on the drawing and the numbers its configuration's key table holds; which key raises which number is not
known, because no 720 has been pressed and only one of its configurations has been read.

## Every key on the drawing

**The drawing is measured off the 720's product photograph**, and the printing on it is checked against the
picture in Logitech's manual for the 720, which agrees: the power key alone at the top left, a wide
Activities key, Devices and Help on one moulding, three keys a side beside the screen, the paging arrows,
Guide and Info, Exit and Menu, two keys printed with a down and an up chevron, the direction pad around OK,
volume on a silver strip down the left and channel down the right, Mute and Prev where the two strips meet
at the bottom, eight transport keys and twelve digit keys.[^t-printing-720] **The 720 has no colour keys and
no Glow key**, where the 885 has both.[^t-printing-720]

* [`reference/silhouettes/h720.svg`](../../silhouettes/h720.svg), from `packages/silhouettes/src/models/h720.ts`.

<!-- generated:keys -->
49 keys on the drawing `h720`, 43 on the keypad and 6 that the screen speaks for. None carries a scan code.

| key | kind | name from | scan code | screen zone | printed on or beside it |
|---|---|---|---|---|---|
| `Activities` | keypad | printed | not measured |  | Activities |
| `AllOff` | keypad | printed | not measured |  |  |
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
| `ScreenLeft1` | screen | printed | not measured | 1 |  |
| `ScreenLeft2` | screen | printed | not measured | 3 |  |
| `ScreenLeft3` | screen | printed | not measured | 5 |  |
| `ScreenRight1` | screen | printed | not measured | 2 |  |
| `ScreenRight2` | screen | printed | not measured | 4 |  |
| `ScreenRight3` | screen | printed | not measured | 6 |  |

Generated from `packages/silhouettes/src/models/h720.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

## The key table

**The configuration's key table holds 49 press codes, 1 to 11, 17 to 25, 27, 33 to 49, 51 to 59, 61 and
62**, which is the drawing's 49 keys.[^t-720-keys] The table lists every code the firmware can produce, as on
the 880 and 885, [the 885's keys](../harmony-885/keys.md#which-positions-hold-a-key).[^s177]

**It is not the 885's lattice with keys left out.** Codes 4, 9, 39, 42, 47 and 49 are in the 720's table and
in no 885's, and the 885's 12 to 16, 26, 29, 31, 32, 50, 60 and 63 are not in the 720's.[^t-720-keys] So a
code is a position on this keypad's own wiring, and the 885's code for a key says nothing about the 720's.

**No key on the drawing carries a code.** Logitech's compiles name a key's code only where two contributors'
configurations agree, [the 880's keys](../harmony-885/keys.md#harmony-880-skin-15), and one 720
configuration is known.[^t-720-keys]

## Watching a key on the cable

**The 720's build keeps the key held at `0x296`, and the last key pressed at `0x3A1`**, so the key reader page
reads it on the cable as it reads an 885, [memory.md](memory.md).[^t-885-keys]

## Not checked

* Which printed key raises which code: no 720 was pressed.[^unchecked]

[^t-printing-720]: Stated by Logitech, in the manual. [The test](../../../tests/firmware/test_silhouettes.py)
[^t-720-keys]: Measured in configurations. [The test](../../../tests/firmware/test_silhouettes.py)
[^s177]: Measured in configurations. [Section 177](../../../docs/findings.md#s177)
[^t-885-keys]: Read in the firmware. [The test](../../../tests/harmony_880_885/test_harmony_885_keys.py)
[^unchecked]: Not checked.
