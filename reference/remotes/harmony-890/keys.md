# Harmony 890: keys

What a Harmony 890's or 895's keypad is, as far as its configurations say. Every key is a number, its
scan code, which is what a configuration binds a command to; which printed key sits at which number is not
known, because no unit of this model exists here and the one drawing is the 890 Pro's.

## Every key on the drawing

**The drawing is the Harmony 890 Pro's, skin 40**, generated from `packages/silhouettes/src/models/h890pro.ts`:
the Harmony 880 Pro's face, [the 880 Pro's keys](../harmony-885/keys.md#harmony-880-pro-skin-39), with
`HARMONY 890 PRO` above the screen and nothing else changed. That the two Pro remotes are exactly the same
face apart from the model name above the screen is a statement made holding both[^unchecked], and the
drawing is derived from the 880 Pro's accordingly, a test holding the two equal but for the name and the
drawing's own id.[^t-printing-890pro] This said the right end key prints `PICTURE` in full where the 880 Pro
prints `PIC`<!--superseded-->, until the 880 Pro's reading was corrected: both print `PICTURE`. The
885's drawing falls on the 890 Pro's photograph as it falls on the 880 Pro's, and Logitech's manual for the 890
Pro names its Sound, Picture and Prev keys.[^t-printing-890pro] No key carries a code: no configuration of an 890 Pro is
known.[^unchecked]

* [`reference/silhouettes/h890pro.svg`](../../silhouettes/h890pro.svg), the Harmony 890 Pro, skin 40.

<!-- generated:keys -->
55 keys on the drawing `h890pro`, 47 on the keypad and 8 that the screen speaks for. None carries a scan code.

| key | kind | name from | scan code | screen zone | printed on or beside it |
|---|---|---|---|---|---|
| `Activities` | keypad | printed | not measured |  | ACTIVITIES |
| `AllOff` | keypad | printed | not measured |  | OFF |
| `ChannelDown` | keypad | printed | not measured |  |  |
| `ChannelUp` | keypad | printed | not measured |  |  |
| `Clear` | keypad | printed | not measured |  | CLEAR |
| `Device` | keypad | printed | not measured |  | DEVICE |
| `DirectionDown` | keypad | printed | not measured |  |  |
| `DirectionLeft` | keypad | printed | not measured |  |  |
| `DirectionRight` | keypad | printed | not measured |  |  |
| `DirectionUp` | keypad | printed | not measured |  |  |
| `DownArrow` | keypad | printed | not measured |  |  |
| `Enter` | keypad | printed | not measured |  | E, ENTER |
| `Exit` | keypad | printed | not measured |  | EXIT |
| `FastForward` | keypad | printed | not measured |  | FWD |
| `Glow` | keypad | printed | not measured |  | GLOW |
| `Guide` | keypad | printed | not measured |  | GUIDE |
| `Help` | keypad | printed | not measured |  | HELP |
| `Info` | keypad | printed | not measured |  | INFO |
| `Media` | keypad | printed | not measured |  | MEDIA |
| `Menu` | keypad | printed | not measured |  | MENU |
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
| `Pause` | keypad | printed | not measured |  | PAUSE |
| `Picture` | keypad | printed | not measured |  | PICTURE |
| `Play` | keypad | printed | not measured |  | PLAY |
| `PrevChannel` | keypad | printed | not measured |  | PREV |
| `Record` | keypad | printed | not measured |  | REC |
| `Rewind` | keypad | printed | not measured |  | REW |
| `ScreenNext` | keypad | printed | not measured |  |  |
| `ScreenPrev` | keypad | printed | not measured |  |  |
| `Select` | keypad | printed | not measured |  | OK |
| `SkipBack` | keypad | printed | not measured |  | REPLAY |
| `SkipForward` | keypad | printed | not measured |  | SKIP |
| `Sound` | keypad | printed | not measured |  | SOUND |
| `Stop` | keypad | printed | not measured |  | STOP |
| `UpArrow` | keypad | printed | not measured |  |  |
| `VolumeDown` | keypad | printed | not measured |  |  |
| `VolumeMute` | keypad | printed | not measured |  | MUTE |
| `VolumeUp` | keypad | printed | not measured |  |  |
| `ScreenLeft1` | screen | printed | not measured | 1 |  |
| `ScreenLeft2` | screen | printed | not measured | 3 |  |
| `ScreenLeft3` | screen | printed | not measured | 5 |  |
| `ScreenLeft4` | screen | printed | not measured | 7 |  |
| `ScreenRight1` | screen | printed | not measured | 2 |  |
| `ScreenRight2` | screen | printed | not measured | 4 |  |
| `ScreenRight3` | screen | printed | not measured | 6 |  |
| `ScreenRight4` | screen | printed | not measured | 8 |  |

Generated from `packages/silhouettes/src/models/h890pro.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

## The key positions

**A Harmony 895's key table holds exactly the Harmony 885's 55 positions**, as sets: the table after the
pointer table lists every scan code the firmware can produce, and its 55 press codes are the ones a survey
of an 885's circuit board found populated, with nothing outside them. So this platform's keypad is the
Harmony 880 and 885's 4 by 16 lattice, [the 885's keys](../harmony-885/keys.md).[^s177]

**A code is a position and not a legend.** The 880 and the 885 already differ over two positions of one
lattice, so the same code on an 895 can be a differently printed key, and per key identity needs this
remote's own labels.[^s177]

**Four further entries carry event type `0x00`**, at scan codes 6, 7, 45 and 46, beside the 55 presses: a
fourth event type beside press, release and repeat, which is not read.[^s177]

## Not checked

* Which printed key sits at which scan code.[^unchecked]
* The Harmony 890's and 895's own faces, which are not drawn.[^unchecked]
* Whether a Harmony 890's key table is the 895's: the table was compared on the 895.[^unchecked]

[^s177]: Measured in configurations. [Section 177](../../../docs/findings.md#s177)
[^unchecked]: Not checked.
[^t-printing-890pro]: Stated by Logitech, in the manual. [The test](../../../tests/firmware/test_silhouettes.py)
