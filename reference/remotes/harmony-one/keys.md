# Harmony One: keys

The One has a keypad below its screen and a touch screen that speaks for itself, plus four keys around
the screen that belong to neither cleanly. Its drawing,
[`reference/silhouettes/one.svg`](../../silhouettes/one.svg), is generated from
`packages/silhouettes/src/models/one.ts`: the shapes are traced from Logitech's own documentation and the
words read off a photograph.

![The Harmony One's face](../../silhouettes/one.svg)

## Every key on the drawing

<!-- generated:keys -->
44 keys on the drawing `one`, 40 on the keypad, 4 on the touch panel and 0 that the screen speaks for. 34 carry a measured scan code and 4 are left between two candidates by the drawing.

| key | kind | name from | scan code | screen zone | printed on or beside it |
|---|---|---|---|---|---|
| `Number4` | keypad | catalogue | 1 (0x01) |  | 4, ghi |
| `Exit` | keypad | catalogue | 2 (0x02) |  | Exit |
| `VolumeUp` | keypad | catalogue | 3 (0x03) |  |  |
| `VolumeDown` | keypad | catalogue | 4 (0x04) |  |  |
| `Rewind` | keypad | catalogue | 5 (0x05) |  |  |
| `SkipBack` | keypad | catalogue | 6 (0x06) |  | Replay |
| `Record` | keypad | catalogue | 7 (0x07) |  |  |
| `Number1` | keypad | catalogue | 8 (0x08) |  | 1 |
| `VolumeMute` | keypad | catalogue | 9 (0x09) |  |  |
| `Info` | keypad | catalogue | 10 (0x0A) |  | Info |
| `DirectionLeft` | keypad | catalogue | 11 (0x0B) |  |  |
| `NumberPlus` | keypad | catalogue | 12 (0x0C) |  | clear |
| `Number0` | keypad | catalogue | 14 (0x0E) |  | 0 |
| `Number9` | keypad | catalogue | 15 (0x0F) |  | 9, wxyz |
| `Number8` | keypad | catalogue | 16 (0x10) |  | 8, tuv |
| `Number6` | keypad | catalogue | 17 (0x11) |  | 6, mno |
| `Guide` | keypad | catalogue | 18 (0x12) |  | Guide |
| `ChannelUp` | keypad | catalogue | 19 (0x13) |  |  |
| `ChannelDown` | keypad | catalogue | 20 (0x14) |  |  |
| `FastForward` | keypad | catalogue | 21 (0x15) |  |  |
| `SkipForward` | keypad | catalogue | 22 (0x16) |  | Skip |
| `Stop` | keypad | catalogue | 23 (0x17) |  |  |
| `Number3` | keypad | catalogue | 24 (0x18) |  | 3, def |
| `Number5` | keypad | catalogue | 25 (0x19) |  | 5, jkl |
| `Select` | keypad | catalogue | 28 (0x1C) |  | OK |
| `Play` | keypad | catalogue | 30 (0x1E) |  |  |
| `Pause` | keypad | catalogue | 31 (0x1F) |  |  |
| `Number2` | keypad | catalogue | 32 (0x20) |  | 2, abc |
| `DirectionRight` | keypad | catalogue | 33 (0x21) |  |  |
| `PrevChannel` | keypad | catalogue | 35 (0x23) |  |  |
| `Number7` | keypad | catalogue | 39 (0x27) |  | 7, pqrs |
| `Menu` | keypad | catalogue | 40 (0x28) |  | Menu |
| `Activities` | keypad | printed | not measured |  | Activities |
| `DirectionDown` | keypad | catalogue | one of 26 or 29 |  |  |
| `DirectionUp` | keypad | catalogue | one of 27 or 36 |  |  |
| `DownArrow` | keypad | catalogue | one of 26 or 29 |  |  |
| `Enter` | keypad | printed | not measured |  | E, enter |
| `Help` | keypad | printed | not measured |  | Help |
| `Off` | keypad | printed | not measured |  | Off |
| `UpArrow` | keypad | catalogue | one of 27 or 36 |  |  |
| `ScreenPrev` | touch | printed | 46 (0x2E) |  |  |
| `ScreenNext` | touch | printed | 47 (0x2F) |  |  |
| `SoftLeft` | touch | printed | not measured | 1 |  |
| `SoftRight` | touch | printed | not measured | 2 |  |

Generated from `packages/silhouettes/src/models/one.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

## Where the scan codes come from

32 keys are named against a scan, from a calibration configuration generated through an account this
project controls, by decoding the code each scan sends and looking it up in that account's named commands
and button maps, section 133 and `reference/button-maps.md`. Logitech's maps name 36 buttons, the 32 plus
the four of two pairs below, with none left over.

**Two pairs stay undecided**: scans 27 and 36 are `DirectionUp` and `UpArrow`, and 26 and 29 are
`DirectionDown` and `DownArrow`, because every activity gives both members of a pair the same command,
`reference/button-maps.md`. The Harmony 600's pairs were decided from device maps in section 323; the
One's were not.

Off, Activities, Help and Enter carry no scan because no configuration read binds them,
`reference/button-maps.md`.

## The key count has no cross check

| count | source |
|---|---|
| 44 on the drawing: 40 keypad keys and 4 touch keys | `one.ts`; `reference/capabilities.md` says nothing checks it |
| "42 buttons in the photograph, two of which are the touch areas flanking the screen, leaving 40 in the matrix" | section 48 |

A USB census on this model gives nothing, because the keypad shares one sense line, [hardware.md](hardware.md).
The two counts agree on 40 matrix keys and differ on how many touch keys are counted beside them.

## The key table

The configuration's key table holds 52 press codes, scans 1 to 40, 43 to 53 and 55, and arch 12 records
presses only, where arch 14 records press, release and repeat, read from configurations, sections 17 and 48.
**That 1 to 40 are the matrix keys, 43 to 53 the touch panel and 55 not a key is a prediction nobody has
tested**, section 48.

## The touch codes

| codes | what they are | standing and source |
|---|---|---|
| 46 and 47 | the strips at each side of the display, the page arrows; no mode page binds them, 778 of 778 over four configurations | read from configurations, sections 125 and 275 |
| 48 to 53 | up to six blocks on the screen; which code is which row is **per page**, so a row is recognised by its place and never by its code | read from configurations, sections 125 and 275 |
| 43 and 44 | the two touch points below the screen | read from configurations, section 125 |
| 45 | never in the hit map | read from configurations, section 45 |

Screen keys and keypad keys share no scan code, four of four configurations, section 128.

**The two keys below the screen are labelled by the screen**: "Options" and "Devices" on the activity menu,
"Activities" and nothing on the device list, read from configurations and seen, sections 125 and 275;
Logitech's manual calls them the function buttons, "dynamic". **A one page screen deadens both page
arrows**, and a screen of several pages leaves them live, read from configurations, sections 275 and 293.

## What pressing or holding raises

* **Held, a key repeats the code's held block**, read in the firmware, section 127; on a held volume key
  the repeat is too fast to land on a level, seen at the bench, section 127.
* **A held touch repeats like a held key**, read in the firmware, section 337, which corrects section 127;
  [behaviour.md](behaviour.md).
* **No long press**, Logitech's service, `reference/capabilities.md`.
* **Off held while inserting the battery enters safe mode**, in about five seconds, seen at the bench,
  section 190. The bootloader also compares two key codes, `0x0E` and `0x1E`, read in the firmware,
  sections 87 and 189; which physical keys give them is **not checked**.

## Not checked

* The two undecided pairs.
* The physical matrix: the board is the only route left, `docs/status.md`.
* Which keys give the bootloader's codes `0x0E` and `0x1E`.
