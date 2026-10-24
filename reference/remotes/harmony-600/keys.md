# Harmony 600: keys

The 600 has 54 keys. Most sit on the **keypad** and do what the running activity, or the device chosen in
device mode, says they do. The rest are keys **the screen speaks for**: the four beside the screen, the
three below it and the activity keys, whose meaning is whatever the current screen draws next to them.
The manual's button page names every key with the words printed on the remote, "The buttons on your
Harmony 600" on page 5[^x-manual].

**The 600's drawing is also the Harmony 650's and 700's.** The three share one face, one layout and one
form factor, [the architecture's README](../../architectures/harmony-600-650-700/README.md), so the 650
and 700 drawings take every shape and every scan code from this one and change only the nameplate.
[`reference/silhouettes/h600.svg`](../../silhouettes/h600.svg) is generated from
`packages/silhouettes/src/models/h600.ts`, traced from Logitech's own documentation of this model.

![The Harmony 600's face](../../silhouettes/h600.svg)

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

## Where the scan codes come from

A scan code is the number the remote gives a key internally; a configuration binds commands to scan codes.
**The scan codes on the drawing were measured on the 600**: a configuration was generated for this model
by Logitech's own service, each code a key sends was decoded and looked up in that service's named
commands and button maps for the same configuration[^s133]. So the 650 and 700 carry the 600's numbers.

**There are 54**, and three routes agree: the key table's split of a key code into an event and a
scan[^s17]; the keys pressed one by one on a unit, which fall into the four columns of the keypad matrix
as 14, 14, 13 and 13[^t-keypad]; and the drawing. The keypad scanner is a matrix of 14 rows by 4 columns
returning `row * 4 + column`, read in the Harmony 700's 2.8 image[^s13], the same architecture; no 600 has
been opened to check the board[^unchecked].

## The two populations

A key is either on the **keypad**, bound by the activity and device maps, or one **the screen speaks
for**. On this architecture the two share no scan code[^s128]. The manual: "The arrow buttons below the
screen allow you to move through various options on the remote screen. The center button below the
remote screen and the side buttons beside the screen let you choose those options."[^x-manual]

## What the drawing does not yet carry

| key | the measurement | evidence |
|---|---|---|
| the four up and down keys | 26 is `UpArrow`, 27 `DownArrow`, 50 `DirectionUp`, 42 `DirectionDown`, from the device maps of the configuration the scan codes were measured on; the drawing still leaves each between two candidates | [^s323] |
| the four screen corners and the centre key below the screen | 8, 2, 9 and 34 for the corners, 25 for the centre key | [^s285], [^s311] |
| Watch TV, Watch a Movie, Listen to Music | 5, 1 and 7; Listen to Music by elimination | [^s314] |
| More Activities | 4, **not measured** | [^s314] |

The drawing calls the activity keys and Help `screen` keys, which is a statement about the drawing's
layers; in the configuration they are hard keys bound by the key map that is always installed[^s314].

## What pressing a key raises

Three events per key, press, release and repeat: the event in the top two bits of a key code and the
scan code in the low six[^s17]. The firmware's own reading of them, and that it tells no long press from
a short one, was read on the Harmony 650's 0.2 build[^s340]; the 600's 0.2 build is the same program in
another build, [firmware.md](firmware.md), and its key handler is **not read** separately[^unchecked].

**Mode 0**, the screen an activity key with no activity opens, binds every scan code from 1 to 54 and
swallows all but the centre key, which returns[^s311].

## Not checked

* The scan codes of the two arrows below the screen, Help, All Off, Enter and More Activities[^unchecked].
* The key handler on the 600's own 0.2 build[^unchecked].
* Whether a skin 73 unit's keypad differs in its printing. The 600's and 700's safe mode configurations
  differ in 83 bytes, almost all in the key table, and nothing has read why[^s24].

[^x-manual]: Stated by Logitech, in the manual. [The Harmony 600 user manual](https://support.myharmony.com/harmony-600-user-manual)
[^s133]: Measured in configurations. [Section 133](../../../docs/findings.md#s133)
[^s17]: Measured in configurations. [Section 17](../../../docs/findings.md#s17)
[^t-keypad]: Measured on a unit. [The test](../../../tests/test_keypad.py)
[^s13]: Read in the firmware. [Section 13](../../../docs/findings.md#s13)
[^unchecked]: Not checked.
[^s128]: Measured in configurations. [Section 128](../../../docs/findings.md#s128)
[^s323]: Measured in configurations. [Section 323](../../../docs/findings.md#s323)
[^s285]: Measured in configurations. [Section 285](../../../docs/findings.md#s285)
[^s311]: Measured in configurations. [Section 311](../../../docs/findings.md#s311)
[^s314]: Measured in configurations. [Section 314](../../../docs/findings.md#s314)
[^s340]: Read in the firmware. [Section 340](../../../docs/findings.md#s340)
[^s24]: Measured on a unit. [Section 24](../../../docs/findings.md#s24)
