# Harmony 885: keys

A Harmony 885 has 55 keys and an 880 53. Each key sits at a crossing of the keypad's wiring, and the
firmware turns that crossing into a number, its scan code, which is what a configuration binds a command
to. This page says how the numbers are laid out, which key raises which number, and what a press, a hold
and a release raise. Every key of an 885 was pressed on a unit and its number read off the remote, below;
an 880's were not.

## Every key on the drawing

<!-- generated:keys -->
55 keys on the drawing `h885`, 47 on the keypad and 8 that the screen speaks for. 55 carry a scan code: 55 read off the remote's own memory while each key was pressed, on one unit for every key and on a second for sixteen of them[^t-885-keys-u].

| key | kind | name from | scan code | screen zone | printed on or beside it |
|---|---|---|---|---|---|
| `Activities` | keypad | printed | 1 (0x01)[^t-885-keys-u] |  | ACTIVITIES |
| `AllOff` | keypad | printed | 2 (0x02)[^t-885-keys-u] |  | OFF |
| `Help` | keypad | printed | 3 (0x03)[^t-885-keys-u] |  | HELP |
| `Device` | keypad | printed | 10 (0x0A)[^t-885-keys-u] |  | DEVICE |
| `VolumeMute` | keypad | printed | 11 (0x0B)[^t-885-keys-u] |  | MUTE |
| `ScreenPrev` | keypad | printed | 12 (0x0C)[^t-885-keys-u] |  |  |
| `VolumeUp` | keypad | printed | 13 (0x0D)[^t-885-keys-u] |  |  |
| `DirectionLeft` | keypad | printed | 14 (0x0E)[^t-885-keys-u] |  |  |
| `VolumeDown` | keypad | printed | 15 (0x0F)[^t-885-keys-u] |  |  |
| `DirectionUp` | keypad | printed | 16 (0x10)[^t-885-keys-u] |  |  |
| `Menu` | keypad | printed | 17 (0x11)[^t-885-keys-u] |  | MENU |
| `Exit` | keypad | printed | 18 (0x12)[^t-885-keys-u] |  | EXIT |
| `Green` | keypad | printed | 19 (0x13)[^t-885-keys-u] |  |  |
| `Red` | keypad | printed | 20 (0x14)[^t-885-keys-u] |  |  |
| `Stop` | keypad | printed | 21 (0x15)[^t-885-keys-u] |  | STOP |
| `Record` | keypad | printed | 22 (0x16)[^t-885-keys-u] |  | REC |
| `Rewind` | keypad | printed | 23 (0x17)[^t-885-keys-u] |  | REW |
| `SkipBack` | keypad | printed | 24 (0x18)[^t-885-keys-u] |  | REPLAY |
| `Number1` | keypad | printed | 25 (0x19)[^t-885-keys-u] |  | 1 |
| `Number4` | keypad | printed | 26 (0x1A)[^t-885-keys-u] |  | 4, ghi |
| `Number8` | keypad | printed | 27 (0x1B)[^t-885-keys-u] |  | 8, tuv |
| `Number7` | keypad | printed | 29 (0x1D)[^t-885-keys-u] |  | 7, pqrs |
| `Clear` | keypad | printed | 31 (0x1F)[^t-885-keys-u] |  | CLEAR |
| `Number0` | keypad | printed | 32 (0x20)[^t-885-keys-u] |  | 0 |
| `Select` | keypad | printed | 33 (0x21)[^t-885-keys-u] |  | OK |
| `DirectionDown` | keypad | printed | 34 (0x22)[^t-885-keys-u] |  |  |
| `DirectionRight` | keypad | printed | 35 (0x23)[^t-885-keys-u] |  |  |
| `ChannelDown` | keypad | printed | 36 (0x24)[^t-885-keys-u] |  |  |
| `ChannelUp` | keypad | printed | 37 (0x25)[^t-885-keys-u] |  |  |
| `Media` | keypad | printed | 38 (0x26)[^t-885-keys-u] |  | MEDIA |
| `PrevChannel` | keypad | printed | 40 (0x28)[^t-885-keys-u] |  | PREV |
| `Glow` | keypad | printed | 41 (0x29)[^t-885-keys-u] |  | GLOW |
| `ScreenNext` | keypad | printed | 43 (0x2B)[^t-885-keys-u] |  |  |
| `Guide` | keypad | printed | 50 (0x32)[^t-885-keys-u] |  | GUIDE |
| `Info` | keypad | printed | 51 (0x33)[^t-885-keys-u] |  | INFO |
| `Blue` | keypad | printed | 52 (0x34)[^t-885-keys-u] |  |  |
| `SkipForward` | keypad | printed | 53 (0x35)[^t-885-keys-u] |  | SKIP |
| `FastForward` | keypad | printed | 54 (0x36)[^t-885-keys-u] |  | FWD |
| `Pause` | keypad | printed | 55 (0x37)[^t-885-keys-u] |  | PAUSE |
| `Play` | keypad | printed | 56 (0x38)[^t-885-keys-u] |  | PLAY |
| `Number2` | keypad | printed | 57 (0x39)[^t-885-keys-u] |  | 2, abc |
| `Number3` | keypad | printed | 58 (0x3A)[^t-885-keys-u] |  | 3, def |
| `Number6` | keypad | printed | 59 (0x3B)[^t-885-keys-u] |  | 6, mno |
| `Yellow` | keypad | printed | 60 (0x3C)[^t-885-keys-u] |  |  |
| `Number5` | keypad | printed | 61 (0x3D)[^t-885-keys-u] |  | 5, jkl |
| `Number9` | keypad | printed | 62 (0x3E)[^t-885-keys-u] |  | 9, wxyz |
| `Enter` | keypad | printed | 63 (0x3F)[^t-885-keys-u] |  | E, ENTER |
| `ScreenLeft1` | screen | printed | 5 (0x05)[^t-885-keys-u] | 1 |  |
| `ScreenLeft2` | screen | printed | 6 (0x06)[^t-885-keys-u] | 3 |  |
| `ScreenLeft3` | screen | printed | 7 (0x07)[^t-885-keys-u] | 5 |  |
| `ScreenLeft4` | screen | printed | 8 (0x08)[^t-885-keys-u] | 7 |  |
| `ScreenRight4` | screen | printed | 44 (0x2C)[^t-885-keys-u] | 8 |  |
| `ScreenRight1` | screen | printed | 45 (0x2D)[^t-885-keys-u] | 2 |  |
| `ScreenRight2` | screen | printed | 46 (0x2E)[^t-885-keys-u] | 4 |  |
| `ScreenRight3` | screen | printed | 48 (0x30)[^t-885-keys-u] | 6 |  |

Generated from `packages/silhouettes/src/models/h885.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

## Which key raises which code

**Every key was pressed on a unit and the number it raised read off the remote over the cable**: all 55 on
one Harmony 885, and 16 of them again on a second, which raised the same number for each.[^t-885-keys-u]
**The nine numbers no key raised are exactly the nine the configuration's key table leaves empty**, so the
keys pressed and the key table, one read from the remote's working memory and the other from its flash,
agree on every position of the lattice.[^t-885-keys-u] Each key is named by the order the keys were
pressed in, a key asked for at each point, so a swap between two neighbours pressed out of order would not
show; the second unit agrees on every key it was asked for.[^t-885-keys-u] The names are short forms of what
each key carries; the exact printed text of each key is not recorded here.[^unchecked]

| key | scan code | pressed on |
|---|---|---|
| Activities | 1 | two units |
| Power | 2 | one unit |
| Help | 3 | two units |
| the first key left of the screen, from the top | 5 | one unit |
| the second key left of the screen | 6 | one unit |
| the third key left of the screen | 7 | one unit |
| the fourth key left of the screen, from the top | 8 | two units |
| Device | 10 | one unit |
| Mute | 11 | one unit |
| the arrow left, below the screen | 12 | one unit |
| Vol + | 13 | one unit |
| left on the d-pad | 14 | one unit |
| Vol - | 15 | one unit |
| up on the d-pad | 16 | one unit |
| Menu | 17 | one unit |
| Exit | 18 | two units |
| Green | 19 | one unit |
| Red | 20 | one unit |
| Stop | 21 | one unit |
| Rec | 22 | one unit |
| Rew | 23 | one unit |
| Replay | 24 | one unit |
| 1 | 25 | one unit |
| 4 | 26 | one unit |
| 8 | 27 | one unit |
| 7 | 29 | one unit |
| Clear | 31 | one unit |
| 0 | 32 | two units |
| OK | 33 | two units |
| down on the d-pad | 34 | one unit |
| right on the d-pad | 35 | two units |
| Ch - | 36 | one unit |
| Ch + | 37 | one unit |
| Media | 38 | one unit |
| Prev | 40 | one unit |
| Glow | 41 | one unit |
| the arrow right, below the screen | 43 | one unit |
| the fourth key right of the screen, from the top | 44 | one unit |
| the first key right of the screen, from the top | 45 | two units |
| the second key right of the screen | 46 | one unit |
| the third key right of the screen | 48 | one unit |
| Guide | 50 | two units |
| Info | 51 | two units |
| Blue | 52 | two units |
| Skip | 53 | two units |
| Fwd | 54 | two units |
| Pause | 55 | one unit, and on the other as a pair with Play |
| Play | 56 | one unit, and on the other as a pair with Pause |
| 2 | 57 | one unit |
| 3 | 58 | one unit |
| 6 | 59 | one unit |
| Yellow | 60 | one unit |
| 5 | 61 | one unit |
| 9 | 62 | one unit |
| Enter | 63 | two units |

## A press, a hold and a release

**A key raises a press when it registers, a hold once when it has stayed down for the hold delay, and a
release only when it is let go before that delay.** So on this platform a release means a short press
ended and a hold means held: the hold does not repeat while the key stays down, and a key let go after it
raises nothing more. That differs from the press, release and repeat the Harmony 600, 650 and 700
enumerate, [key codes](../../config-format/modes-and-keys.md#key-codes-and-scan-codes).[^t-885-keys] The
event is ORed onto the scan code only as it is raised and put on the action queue; the scan code itself is
kept bare.[^t-885-keys]

**The hold delay is ten of the firmware's time units times a value that is 75 after every start**, and one
action instruction sets that value; how long a unit lasts was not read, so the delay in seconds is not
known.[^t-885-keys][^unchecked] Configurations bind presses only[^s17], so in every configuration read the hold
and the release reach no binding; whether the firmware would honour a binding of either is not
checked.[^unchecked]

Read in the 885's application. The 880's and the 880 Pro's carry the same routines byte for byte, and the
Harmony 720's press handler is the same routine built with other addresses; its scanner and its hold timer
were not compared.[^t-885-keys][^unchecked]

## Watching a key on the cable

**The remote keeps the key held at data memory `0x295`, 0 when none is, and the last key pressed at
`0x3A1`, which no instruction clears**; the Harmony 720's build keeps the held key at `0x296` instead,
[the platform's data memory](../../architectures/harmony-880-885/memory.md#data-memory).[^t-885-keys] **The
remote scans its keys while it is on the cable**, showing its USB screen, so both bytes can be read with
`READ_MISC` selector 7 while somebody presses keys, [USB](usb.md#what-reads-off-it). Mute held for 3.85
seconds kept its number in `0x295` the whole time and cleared on release, and one press too short to be
seen in `0x295` still showed in `0x3A1`. Neither byte ever held an event type.[^t-885-keys-u]

## The lattice

**The keypad is 4 inputs by 16 lines**, and the firmware computes a key's scan code as
`(line - 1) * 4 + input`, with the input running 1 to 4 and the line 1 to 16, so the codes run 1 to 64.
A line of zero means no key. The same routine is in both application images and both bootloaders, and in
no image of another architecture, so the arithmetic is this architecture's and not to be carried to
another.[^s144]

**Every configuration agrees**: each code any of six configurations binds with a press falls in 1 to 64,
all four inputs are occupied in every one, and nothing binds 64, so line 16 input 4 has no key on either
model. Counted by input, an 885 configuration's press codes split 14, 14, 14 and 13.[^s144b]

## Which positions hold a key

| model | positions | empty scan codes |
|---|---|---|
| Harmony 885 | 55 | 4, 9, 28, 30, 39, 42, 47, 49 and 64 |
| Harmony 880 | 53 | the 885's nine, and 19 and 60 |

**The key table states the hardware, and it matches a survey of both circuit boards exactly**, as sets:
the table after the pointer table lists every scan code the firmware can produce rather than what one
configuration happens to bind, and the 880's two missing codes are exactly the two colour buttons the
survey names as the 885's alone.[^s177] How a person meets the colour keys is in [README.md](README.md).

**A code is a position, not a legend.** The 880 and the 885 already differ over two positions of one
lattice, so the same code on another model of this platform can be a differently printed key.[^s177]

## The keys beside the screen

**Eight keys sit in two columns beside the screen, and their labels in four rows**, at pixel rows 42,
74, 106 and 138 with a line pitch of 14. The left column is 5, 6, 7 and 8 and the right column 45, 46,
48 and 44, top to bottom: one configuration's activity menu names all eight keys of one page, and draws
four of the names at x 3 and four at x 70 to 97.[^s128] Pressed on a unit in that order, the eight keys
raise those numbers.[^t-885-keys-u] Those are the keys the screen speaks for, and on
this architecture they share exactly one scan code with the keypad's bindings, where every other
architecture measured shares none.[^s128]

## The keys held at power on

**Scan codes 2 and 33 keep the remote in its bootloader**: if either is down when the bootloader scans the
keypad at power on, it stays resident on the cable instead of starting the application, in both the 880's
and the 885's bootloader,
[the architecture's firmware page](../../architectures/harmony-880-885/firmware.md#what-the-bootloader-does-at-power-on).[^t-885-boot]
Those are Power and OK: the application raised 2 and 33 for them on a unit, and the bootloader numbers
its keys with the same arithmetic.[^t-885-keys-u][^s144] Whether holding one at power on works as read is not
checked.[^unchecked]

**Scan codes 2, 33 and 32 held together restart the remote**, tested at every key scan by the application
and by both bootloaders, each with a further condition on inputs whose meaning differs between them; the
restart is the processor's `RESET` instruction, so a staged install asked for before it still runs,
[the architecture's firmware page](../../architectures/harmony-880-885/firmware.md#restarting).[^t-885-end][^t-885-boot]
Scan code 32 is 0, so the three are Power, OK and 0, by the same route.[^t-885-keys-u][^s144] Whether
holding them restarts the
remote as read is not checked.[^unchecked]

## Not checked

* An 880's keys: its 53 codes are an 885's less 19 and 60, which are Green and Yellow on an 885, and no
  880 was pressed.[^unchecked]
* The exact printed text of each key, and how long the hold delay lasts in seconds.[^unchecked]
* The Harmony 785's keys and where it keeps the key held.[^unchecked]

[^s144]: Read in the firmware. [Section 144](../../../docs/findings.md#s144)
[^s144b]: Measured in configurations. [Section 144](../../../docs/findings.md#s144)
[^s177]: Measured in configurations. [Section 177](../../../docs/findings.md#s177)
[^s128]: Measured in configurations. [Section 128](../../../docs/findings.md#s128)
[^unchecked]: Not checked.
[^t-885-boot]: Read in the firmware. [The test](../../../tests/test_harmony_885_bootloader.py)
[^t-885-end]: Read in the firmware. [The test](../../../tests/test_harmony_885_write_end.py)
[^t-885-keys]: Read in the firmware. [The test](../../../tests/test_harmony_885_keys.py)
[^t-885-keys-u]: Measured on a unit. [The test](../../../tests/test_harmony_885_keys.py)
[^s17]: Measured in configurations. [Section 17](../../../docs/findings.md#s17)
