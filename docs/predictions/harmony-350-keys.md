# Predictions for the Harmony 350's keys, written before they were pressed

`todo-compile-350.md` 2.2. Every key of the bench Harmony 350 is to be pressed in two device modes with
the Flirc listening, `packages/bench/irtests/350-2-2-keys.json`. This is what that run should hear, written
down before it, so the run can refute it.

**Where the prediction comes from.** The firmware numbers a key 1 to 56 from where it sits on the keypad
grid and hands that number to the key maps unchanged, read in the 1.4 image; which printed key carries
which number is inferred from what five configurations bind and send,
`tests/test_harmony_350_keys.py` and `packages/bench/test/keys350.test.ts`, with the table on
`reference/remotes/harmony-350/keys.md`. What each key sends below is then read out of the configuration
the unit holds, `lab/work/350-delay/before.bin`: an LG television on infrared group 0 and a Denon receiver
on group 2, and nothing else. The names are the monitor's, from Logitech's catalogue; where the catalogue
has none, the code number in that file is given. The device keys are named by position and by what the bench
unit prints on them, TV/Media, Cable/PC, AVR/Game and DVD/Music, which is not the printing of Logitech's setup
guide.

## The predictions

**P1. The receiver is on the bottom left device key**, which the bench unit prints AVR/Game. Its map is
selected by code 7, and the group on that position is 2, the receiver's. The top right and bottom right keys,
Cable/PC and DVD/Music on the bench unit, do nothing on this file. If the receiver turns up on another key, the device key half of the table is wrong.

**P2. A device key sends nothing**, on its press or its release. It switches a pin and starts two timers on
the press and changes the mode on the release.

**P3. Exactly one favourite key sends the TV's `Home`**, in the TV's mode, and the other four send
nothing. Which one is the first measurement of which favourite is code 2; the table cannot say.

**P4. The upper of the two arrow keys between Menu, Info, Exit and Guide sends the receiver's
`ChannelUp`**, and the lower its `ChannelDown`, in the receiver's mode. Both send nothing in the TV's mode.
That 25 is the upper one is a guess from the names this file gives the two codes; the key table leaves it
open.

**P5. Every other key sends what the table says, in both modes**:

| key | code | the TV's mode | the receiver's mode |
|---|---|---|---|
| top left device key, TV/Media | 5 | nothing; selects the TV | nothing; selects the TV |
| top right device key, Cable/PC | 1 | nothing | nothing |
| bottom left device key, AVR/Game | 7 | nothing; selects the receiver | nothing; selects the receiver |
| bottom right device key, DVD/Music | 4 | nothing | nothing |
| Watch TV | 6 | nothing, this file has no activity | nothing |
| Power | 3 | `PowerOn` and `PowerOff`, alternately | code 20 and code 13, its on and off, alternately |
| Input | 35 | `Input` | the TV's `Input` |
| the five favourites | 2, 8, 9, 11, 34 | one of them `Home`, P3 | nothing |
| Menu | 10 | nothing | nothing |
| Info | 36 | `Info` | `Info` |
| Exit | 12 | `Exit` | `Back` |
| Guide | 33 | `Guide` | nothing |
| the arrow pair | 25, 26 | nothing | `ChannelUp`, `ChannelDown`, P4 |
| red, green, yellow, blue | 13, 27, 28, 29 | `Red`, `Green`, `Yellow`, `Blue` | nothing |
| Volume Up, Volume Down | 49, 52 | `VolumeUp`, `VolumeDown` | `VolumeUp`, `VolumeDown` |
| Mute | 15 | `Mute` | `Mute` |
| the direction keys up, right, down, left | 51, 31, 42, 14 | `DirectionUp`, `DirectionRight`, `DirectionDown`, `DirectionLeft` | the same |
| OK | 50 | `OK` | `Enter` |
| Channel Up, Channel Down | 55, 41 | `ChannelUp`, `ChannelDown` | nothing |
| Previous Channel | 32 | `Qview` | `Back` |
| DVR | 16 | nothing | nothing |
| Live | 43 or 56 | nothing | nothing |
| Rewind, Fast Forward | 22, 30 | `Rewind`, `FastForward` | nothing |
| Play, Pause | 44, 46 | `Play`, `Pause` | `iPodPause` for both, codes 14 and 3, which are the same signal |
| skip back, skip forward | 21, 38 | nothing | `TuneDown`, `TuneUp` |
| Record | 23 | `Record` | nothing |
| Stop | 40 | `LiveTv`, the monitor's name for the TV code this file binds to code 40 | nothing |
| the digits | 24, 47, 39, 17, 48, 37, 18, 53, 45, 20 | `1` to `9` and `0` | the same |
| Clear | 19 | `-` | nothing |
| Enter | 54 | nothing | nothing |

So 38 keys send something in the TV's mode, counting Power and one favourite, and 29 in the receiver's,
counting Power and Input. A key that sends something the table says it should not, or the TV's code where
the receiver's is expected, is a wrong row in the key table.

## What this does not test

* DVR, Live, Menu and Enter send nothing in either mode on this file, so their codes are not checked by this
  run, only that they are not one of the codes that send.
* Which code Live is.
