# Harmony 600: keys

**The Harmony 600's drawing is the architecture's drawing.**
[`reference/silhouettes/h600.svg`](../../silhouettes/h600.svg) is generated from
`packages/silhouettes/src/models/h600.ts`, traced from Logitech's own documentation of this model, and
the Harmony 650 and 700 drawings take every shape and scan code from it by reference, changing only the
nameplate: the three share one layout and one form factor, a statement from the bench holding all three.
The manual's button page names the same keys with the same printed words, "The buttons on your Harmony
600", Logitech's manual page 5.

![The Harmony 600's face](../../silhouettes/h600.svg)

## Where the scan codes come from

**The scan codes on this drawing are measured on the 600**, from a calibration configuration generated
for this model through an account this project controls, by decoding each code a scan sends and looking
it up in that account's named commands and button maps, section 133 and `reference/button-maps.md`. So
the 650 and 700 carry the 600's numbers, and this is the model they were measured on.

The count is 54, three routes agreeing: the key table's field split, section 17; a hardware census per
matrix column of 14, 14, 13 and 13, measured on a unit, section 48 and `tests/test_keypad.py`; and the drawing, `reference/capabilities.md`. The
keypad scanner is a 14 by 4 matrix returning `row * 4 + column`, read in the Harmony 700's 2.8 image,
section 13; no 600 has been opened to check the board.

## The two populations

A key is either on the **keypad**, bound by the activity and device maps, or one **the screen speaks
for**, whose meaning is whatever the current page draws beside it. On this architecture the two share no
scan code, section 128. The screen keys' scans are the architecture's and are listed in the Harmony 650's
[keys.md](../harmony-650/keys.md): 8, 2, 9 and 34 for the four corners and 25 for the centre key below
the display, read from configurations including the 600's own, sections 285 and 311.

The 600's manual: "The arrow buttons below the screen allow you to move through various options on the
remote screen. The center button below the remote screen and the side buttons beside the screen let you
choose those options." Logitech's manual page 5.

## Every key on the drawing

<!-- generated:keys -->
54 keys on the drawing `h600`, 42 on the keypad and 12 that the screen speaks for. 36 carry a measured scan code and 4 are left between two candidates by the drawing.

| key | kind | name from | scan code | screen zone | printed on or beside it |
|---|---|---|---|---|---|
| `Menu` | keypad | catalogue | 10 (0x0A) |  | Menu |
| `Exit` | keypad | catalogue | 12 (0x0C) |  | Exit |
| `Red` | keypad | catalogue | 13 (0x0D) |  |  |
| `VolumeUp` | keypad | catalogue | 14 (0x0E) |  |  |
| `VolumeDown` | keypad | catalogue | 15 (0x0F) |  |  |
| `VolumeMute` | keypad | catalogue | 16 (0x10) |  |  |
| `Number4` | keypad | catalogue | 17 (0x11) |  | 4, ghi |
| `Number7` | keypad | catalogue | 18 (0x12) |  | 7, pqrs |
| `NumberPlus` | keypad | catalogue | 19 (0x13) |  | clear |
| `Number0` | keypad | catalogue | 20 (0x14) |  | 0 |
| `SkipBack` | keypad | catalogue | 21 (0x15) |  | Replay |
| `Rewind` | keypad | catalogue | 22 (0x16) |  |  |
| `Record` | keypad | catalogue | 23 (0x17) |  |  |
| `Number1` | keypad | catalogue | 24 (0x18) |  | 1 |
| `Yellow` | keypad | catalogue | 28 (0x1C) |  |  |
| `Blue` | keypad | catalogue | 29 (0x1D) |  |  |
| `FastForward` | keypad | catalogue | 30 (0x1E) |  |  |
| `ChannelUp` | keypad | catalogue | 31 (0x1F) |  |  |
| `ChannelDown` | keypad | catalogue | 32 (0x20) |  |  |
| `Guide` | keypad | catalogue | 33 (0x21) |  | Guide |
| `Info` | keypad | catalogue | 36 (0x24) |  | Info |
| `Number6` | keypad | catalogue | 37 (0x25) |  | 6, mno |
| `SkipForward` | keypad | catalogue | 38 (0x26) |  | Skip |
| `Number3` | keypad | catalogue | 39 (0x27) |  | 3, def |
| `Stop` | keypad | catalogue | 40 (0x28) |  |  |
| `DirectionRight` | keypad | catalogue | 41 (0x29) |  |  |
| `PrevChannel` | keypad | catalogue | 43 (0x2B) |  |  |
| `Play` | keypad | catalogue | 44 (0x2C) |  |  |
| `Number9` | keypad | catalogue | 45 (0x2D) |  | 9, wxyz |
| `Pause` | keypad | catalogue | 46 (0x2E) |  |  |
| `Number2` | keypad | catalogue | 47 (0x2F) |  | 2, abc |
| `Number5` | keypad | catalogue | 48 (0x30) |  | 5, jkl |
| `Green` | keypad | catalogue | 49 (0x31) |  |  |
| `Select` | keypad | catalogue | 51 (0x33) |  | OK |
| `DirectionLeft` | keypad | catalogue | 52 (0x34) |  |  |
| `Number8` | keypad | catalogue | 53 (0x35) |  | 8, tuv |
| `AllOff` | keypad | printed | not measured |  | All Off |
| `DirectionDown` | keypad | catalogue | one of 27 or 42 |  |  |
| `DirectionUp` | keypad | catalogue | one of 26 or 50 |  |  |
| `DownArrow` | keypad | catalogue | one of 27 or 42 |  |  |
| `Enter` | keypad | printed | not measured |  | E, enter |
| `UpArrow` | keypad | catalogue | one of 26 or 50 |  |  |
| `Help` | screen | printed | not measured |  | Help |
| `ListenToMusic` | screen | printed | not measured |  | Listen to Music |
| `MoreActivities` | screen | printed | not measured |  | More Activities |
| `ScreenLowerLeft` | screen | printed | not measured | 3 |  |
| `ScreenLowerRight` | screen | printed | not measured | 4 |  |
| `ScreenNext` | screen | printed | not measured |  |  |
| `ScreenPrev` | screen | printed | not measured |  |  |
| `ScreenSelect` | screen | printed | not measured | 5 |  |
| `ScreenUpperLeft` | screen | printed | not measured | 1 |  |
| `ScreenUpperRight` | screen | printed | not measured | 2 |  |
| `WatchAMovie` | screen | printed | not measured |  | Watch a Movie |
| `WatchTV` | screen | printed | not measured |  | Watch TV |

Generated from `packages/silhouettes/src/models/h600.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

## What the drawing does not yet carry

| key | the measurement | standing and source |
|---|---|---|
| the four up and down keys | **decided** since section 323: 26 is `UpArrow`, 27 `DownArrow`, 50 `DirectionUp`, 42 `DirectionDown` | from the device maps of the 600's calibration configuration, `reference/button-maps.md`. The drawing still leaves each between two candidates |
| the four screen corners and the centre key | 8, 2, 9, 34 and 25 | read from configurations, sections 285 and 311 |
| Watch TV, Watch a Movie, Listen to Music | 5, 1 and 7 | read from Logitech's compiles of this architecture, section 314; Listen to Music by elimination |
| More Activities | 4 | **not measured**, section 314 |

The drawing calls the activity keys and Help `screen` keys, which is a statement about the drawing's
layers; in the configuration they are hard keys bound by the always installed key map, section 314.

## What pressing a key raises

Three events per key, press, release and repeat, the event type in the top two bits of a key code and the
scan in the low six, section 17. The firmware's own reading of them, and that it tells no long press from
a short one, was done on the Harmony 650's 0.2 build, section 340; the 600's 0.2 build is the same program
in another build, and the key handler on it is **not read** separately.

**Mode 0**, the screen an activity key with no activity opens, binds every scan from 1 to 54 and swallows
all but the centre key, which returns, section 311.

## Not checked

* The scan codes of the two arrows below the display, Help, All Off, Enter and More Activities.
* The key handler on the 600's own 0.2 build.
* Whether a skin 73 unit's keypad differs in its printing: section 24 found the 600's and 700's safe mode
  configurations differing in 83 bytes, almost all in the key table, and nothing has read why.
