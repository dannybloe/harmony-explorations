# Harmony 880 and 885: firmware

A Harmony 880 or 885 runs two programs that together fill its first 128 KiB of flash: a bootloader at the
bottom, which starts the remote, owns its interrupt vectors and serves the USB cable itself when it does not
start the application, and the application above it, which does everything else and hands nothing back. One application build serves both models and says which one it is
in two bytes. This page says what each image is, where it loads, how its header differs from every later
Harmony's, and how a copy of one is obtained.

Read in two application images and two bootloaders, an 880's and an 885's of each, which other people
read off their remotes and published; the start of the application, below, was read in three more
application images as well, an 880 Pro's, a second 880's and a Harmony 720's. A Harmony 885's application, read off it over USB, is the 885 image
byte for byte, which measures its load address at `0x010000`.[^t-arch8-usb] Where each image
sits in flash is [memory.md](memory.md).

## The images

| image | version | software type | where it loads | entry | standing |
|---|---|---|---|---|---|
| application | 4.4 | 0, application | `0x010000`, 64 KiB | **not in the image**: the reset vector is the bootloader's | 979 branch targets on an instruction boundary at that base, against 602 for the runner up at `0x00D000`, and concordance's `firmware_base` agrees[^s114][^x-concordance] |
| bootloader | 4.0 | 3, Boot mode | `0x000000`, 64 KiB | reset `GOTO 0x0637C` on the 880 and `0x06392` on the 885, inside itself; the high and low priority interrupt vectors go to `0x010400` and `0x010800`, inside the application | 342 boundary hits against 46 for the runner up, and concordance's `flash_base` agrees[^s116][^x-concordance] |

**One application build serves both models.** The 880's and the 885's images differ at exactly two
offsets, `0x1C4A` and `0xA63C`, `0x0F` against `0x11`: the skin, once in a constant table and once in
the USB descriptor. Their stored checksums are identical, because the two bytes sit at the same parity and
`0x0F ^ 0x11` cancels between them, so a model number can change without changing the checksum.[^s114]

**The two bootloaders are two builds.** They differ in 15694 bytes across 1225 runs, the reset vector
included, and their code ends 22 bytes apart, at `0x0639B` and `0x063B1`.[^s116]

**The software type is Logitech's own word.** The version block's accessor in each image states it, and
Logitech's firmware packages name the values: 0 an application, 1 test, 2 minimal, 3 a bootloader, 4 safe
mode.[^s116][^s7] **No image of type 4 is known on this architecture**: neither of the two ways a host can
read an image here returns one.[^s116] **Two things do what safe mode
does on later platforms.** The bootloader: when it does not start the application it stays resident and
answers the application's own commands, so it is the minimal program a host can reach whenever the bottom
64 KiB are intact, [below](#what-the-bootloader-does-at-power-on).[^t-885-boot] Logitech's classic client
treats it as this platform's safe mode program: asked to write the safe mode firmware, it writes the
bootloader.[^t-885-start-client] And a small configuration built into the application, which the
application runs on its own whenever the user's configuration cannot be trusted,
[below](#what-the-application-does-at-start).[^t-885-start]
This said whether the application has a safe mode of its own<!--superseded--> was not checked, until its start was
read.[^t-885-start] It said before that whether this platform's Boot mode does the work later platforms
split<!--superseded--> into a bootloader and safe mode was not known, until the bootloader was read.[^t-885-boot]

### The Harmony 720's images

**The one Harmony 720 read runs builds of its own, an application 4.5 and a bootloader 4.2.** Both of its
images carry the version accessor the 880's and 885's do: the application's says version
4.5, software type 0, skin 44, and the 64 KiB from the bottom of flash say version 4.2, software type 3, a
bootloader, skin 44, with field 6 zero as in the other two bootloaders, and that image starts itself at
`0x06654`. Their product strings agree, `Harmony Remote 0-4.5.0` and `Harmony Remote 3-4.2.4`, read as the
software type, a dash and the version: every image of this platform that carries such a string is consistent
with that reading, the five applications read and this bootloader, the only bootloader that carries one; the 880's and 885's bootloaders say `Harmony Bootloader`.[^t-885-boot]
The application's 4.5 is a higher version number than the 4.4.2 the community comparison table gives every
model it lists for this platform.[^x-forum-table]

**What of the 720's application has been compared with the 885's**, routine by routine and each to the
extent its test states, the 720's working addresses moved and in some a literal or two different: the start check,[^t-885-start] the action interpreter's dispatcher,[^t-885-actions]
the action queue,[^t-885-queue] the state variable loader,[^t-885-state] the section seeker's slot
literals,[^t-885-slots] base slot 15's demand,[^t-885-parameters] the timers' duration compare,[^t-885-timers]
the number sender,[^t-885-number-sender] the infrared player's class 1 routines,[^t-885-infrared]
the screen dispatcher's eleven opcodes and the fill's two bounds,[^t-885-screens] and the build stamp's start up gate.[^t-885-stamp] Its log writer, its erase
and write paths, its USB dispatch, its base selector and messages, and its bootloader beyond its version
accessor, its product string, its first instruction and its identity block are not read.[^unchecked]

## The header is not the later Harmonys'

Every application image here opens with a header, and the field order differs from the Harmony One's and
the Harmony 600, 650 and 700's, so a disassembler or a parser taking those as the template reads the wrong
fields.[^s114]

| offset | the Harmony One, 600, 650 and 700 | the Harmony 880 and 885 |
|---|---|---|
| 0 | `u16` checksum | `u16` checksum |
| 2 | `0xFFFF` | `0xFF00`, its low byte the first boot mark, below |
| 4 | `u16` size field | **the `HG` magic**, `48 47` |
| 6 | family, version BCD | `0x0000` |
| 8 | the `HG` magic | `0xC000` |
| 10 | a `GOTO` to the entry point | `0x1020` |

**The checksum is the same algorithm with the same seeds**: the even bytes XORed into one seed and the odd
bytes into another, `0x21` and `0x43`, stored at offset 0, and it verifies over the whole 65536 bytes. Several
shorter lengths verify too, because everything above `0x0FB90` is `0xFF` padding and an even number of
`0xFFFF` words XORs to nothing; the one tested length that drops an odd number of them fails, which shows
the passes say nothing about where the image ends.[^s114]

**The bootloaders have no header and no checksum**: their first bytes are the reset vector.[^s116]

**The bootloader checks this checksum at every power on where no key is held, and leaves out the word at
offset 2.** It sums from offset 4 to the end of the 64 KiB, so both bytes at offset 2 can change without
breaking it, and the low one does: when the check passes with `0xFF` there the bootloader shows a screen and programs that byte to
`0x00`, a mark that the image has booted once. Both application images carry `0x00`, and starting the sum
at offset 2 instead fails on both.[^t-885-boot]

## What the bootloader does at power on

In order, read in both bootloader builds:[^t-885-boot]

1. **It clears the request for a staged install, unless the restart came from the firmware itself.** The
   request is a status byte in data memory, `0x100`, that write misc selector 6 sets. It survives a reset
   by the processor's `RESET` instruction, which is how the escape's restart ends, and it is cleared after
   any other reset, so a power on or a battery pull never starts an install. Which reset happened is read
   from bit 4 of the register at `0xFD0`, which the bootloader sets again at every start, so only a `RESET`
   instruction can clear it before the next one; that `0xFD0` is the PIC18's reset control register `RCON`
   is inferred from the processor family and not checked against the part's datasheet.[^t-885-boot]
2. **The staged install**, if the status asks for one. Status 2 copies 64 KiB from `0x1D0000` to the
   application at `0x010000`, status 6 copies them from `0x020000`; 4 and 7 are the same two resumed. The
   sector at `0x010000` is erased first, the status reset to 0 at the end.[^t-885-boot] **The two builds
   differ here**: while copying, the 885's writes status 4 for the
   `0x1D0000` source and 7 for the `0x020000` one, the 880's writes 4 for both, so a copy from `0x020000`
   that an 880 resumed would resume from `0x1D0000`.[^t-885-boot] **A host sets the status and the application
   never does**: its one writer of the byte stores what write misc selector 6 carries, or zero at a start
   that did not come from the `RESET` instruction, and write misc selector 7 reaches the byte as it reaches
   any byte of data memory; the application chooses no value of its own.[^t-885-start] Logitech's classic client stages a new application at `0x1D0000`, its address of
   new code for this platform, and then sets status 2.[^t-885-boot-client][^t-885-start-client] The
   application never chooses status 6, and why the user configuration's base is a copy source is not
   answered.[^t-885-start][^unchecked] What sits at `0x1D0000` on a unit, and what could interrupt a
   copy and leave 4 or 7 behind, are not checked.[^unchecked] This said what sets the status<!--superseded--> was
   not checked, until the application was read.[^t-885-start]
3. **The held key.** If the keypad scan gives scan code 2 or 33 (`0x02` or `0x21`), the bootloader stays
   resident and does not look at the application. Which printed keys those are is not checked.[^t-885-boot][^unchecked]
4. **The image check**: the `HG` magic at `0x010004` and the checksum above. A failure stays resident.[^t-885-boot]
5. **The jump** to `0x010C00`, where the application holds a `GOTO` to its entry.[^t-885-boot]

**Staying resident** means a screen of the bootloader's own and its USB service loop, which speaks the
application's protocol and can rewrite the whole flash, [the bootloader](../../usb-protocol/bootloader.md#the-harmony-880-and-885);
only a host's restart or a reboot leaves it, and a reboot runs the same decision again.[^t-885-boot]

**For a recovery**, that means a remote whose application is destroyed or half written still boots into a
program that answers on the cable, and a host can write the application back through it. What nothing
recovers is the bootloader itself: an erased bootloader sector leaves no program to run at power on, and
erasing one takes an unlock a host has to send on purpose.[^t-885-boot]

## What the application does at start

**The application runs one of two configurations, and which is one bit.** Every time it looks anything up
in a configuration it takes the base from one flag: the user's configuration at `0x020000`, or a
configuration built into the application's own last 8 KiB at `0x01E000`, the safe mode configuration of
[memory.md](memory.md), called the built in configuration below: 7049 bytes in the 880, 885 and 880 Pro
builds, and 6879 of its own in the Harmony 720's.[^t-885-start]

At every start it checks the built in configuration, then looks at the remote's identity block, then
checks the user's configuration, and runs the user's only if it passed:[^t-885-start]

* **A blank identity block**, all 48 bytes from `0x000110` reading `0xFF`, shows a message and the user
  configuration is never checked: the built in one runs. The block is only tested for being blank and is
  compared with nothing in the configuration.[^t-885-start]
* **A failed user configuration** shows a message and the built in one runs. The remote is still the full
  application and still answers on the cable, so the configuration can simply be written again.[^t-885-start]
* **A blank battery calibration word**, `0xFFFF` at `0x000160`, shows a message too, and leaves the remote
  reading the user configuration while every test of whether a configuration is valid sees only the built
  in one. What else that changes is not read.[^t-885-start][^unchecked]

**The check reads four things and nothing else**: the cookie `TPTP` at the base, the marker `WLWL` at base
plus `0x5F`, the end marker `DKDK` at the address the three bytes at base plus 4 state, and the two bytes
before the end marker against the trailer checksum, the even and odd bytes of half of `end - 2 - base`
words, rounded down, from the base XORed into `0x21` and `0x43`.[^t-885-start] So the container's pointer count, its end
address's top byte, every section pointer, its architecture record and its skin are never compared with
anything, and a configuration with any of them wrong passes and misbehaves later; the base is the
firmware's and nothing in the container states it.[^t-885-start] All 16 distinct containers of this
architecture that have been read pass the check as read: ten an 880's, four an 885's, which are one
remote's configuration read four times, one an 880 Pro's and one a Harmony 720's. So do both built in
configurations, the one the 880, 885 and 880 Pro builds share and the 720's own. A flipped bit, a changed
marker or a moved end address fails the check, and a changed pointer count or architecture record with the
checksum restated passes it.[^t-885-start-corpus] Whether the last byte before the checksum is left out when
`end - 2 - base` is odd rests on the code alone, since the two such containers hold zero there.[^t-885-start]

**What the remote shows.** The message number decides the screen, drawn from the user configuration when it
passed and from the built in one otherwise:[^t-885-start]

| message | when | text, by the strings laid out before that screen in the built in configuration |
|---|---|---|
| `0x00` | a cookie, marker or end marker failed | "Go to Website / to update settings" |
| `0x1A` | the markers passed and the checksum did not | "Configuration Corrupted" |
| `0x1B` | the identity block is blank | "Missing License" |
| `0x16` | the battery calibration word is blank | "Battery ADC Not Calibrated" |

The numbers are read in the code; the texts are attributed by layout and not by decoding the screen
programs.[^t-885-start] A message stays for 3000 ticks of the countdown the restart command loads with
500, and no key ends it; that is three seconds if a tick is a millisecond, which is not established.[^t-885-start][^unchecked]
What the built in configuration shows after that is not read.[^unchecked]

**Nothing latches.** The verdict is three bits of one byte of RAM, cleared and recomputed at every start,
and the check's own code writes no flash; the check runs at a start and at no other time.[^t-885-start]
That is unlike the Harmony One, whose validator also runs from its main loop and whose status screen then
stays until a power cycle, [the Harmony One's behaviour](../../remotes/harmony-one/behaviour.md). **After
write misc selector 2 the remote runs the built in configuration until the next start**, which is what
keeps it from reading a region a host is rewriting; nothing but a start sets the user configuration's bit
again, [usb.md](usb.md#how-a-write-ends).[^t-885-start]

**One build, and the Harmony 720's check too.** The 880's, the 885's and the 880 Pro's application images
differ in the skin bytes alone, so all of this holds for each. The Harmony 720's application is a build of
its own, and its check has the 885's instruction sequence, flag bits and literals, with its working
addresses and call targets moved; its base selector and its messages are not compared.[^t-885-start][^unchecked]

## Restarting

**Three routes restart a running remote by the processor's `RESET` instruction, and so keep the staged
install's status**: the bootloader clears the status after any reset that was not that instruction, which
a power on is.[^t-885-end][^t-885-boot] What a watchdog or a supply dip does is not read.[^unchecked]

| route | what it does | |
|---|---|---|
| the escape's restart, `E1 02` or `E1 03` | detaches, waits 500 ticks, executes `RESET`, [usb.md](usb.md#how-a-write-ends) | [^t-885-end] |
| three keys held together | at any key scan, scan codes 2, 33 and 32 all down executes `RESET`, in the application and in both bootloaders. The application also requires two inputs of port B low, and each bootloader three bits of a byte it reads at `0x81`, whose meaning is not read | [^t-885-end][^t-885-boot] |
| the wake from the power down routine | the action interpreter's power down, opcode `0x07` with an operand low byte of `0xF6`, runs a routine copied into RAM in a loop and executes `RESET` once one input of port B reads low or one of port A high | [^t-885-end][^t-885-actions] |
| a power on or a battery pull | clears the status, so no install starts | [^t-885-boot] |

This table said the power down was for "the operand `0xF6`", and the test behind it an operand high byte
reached through the `0x3F` band<!--superseded-->, until the interpreter was read: the band is `0x07`'s, on the low
byte.[^t-885-actions]

Which printed keys have scan codes 2, 33 and 32 is not checked.[^unchecked] The bootloader stays resident
when scan code 2 or 33 is down at power on, but its own key scan restarts on all three, so whether holding
the three keys through the restart leaves a misbehaving remote in its bootloader is not checked.[^t-885-boot][^unchecked]

## The action interpreter

**Most of the Harmony One's and the Harmony 600, 650 and 700's instruction language, dispatched by a ladder
of its own.** The main loop
executes one instruction off the action queue and then rotates what it pushed to the head, as the Harmony
One's does, so a call runs next and the queue of forty holds the call stack.[^t-885-queue] The dispatcher
is a descending chain of comparisons rather than arch 14's binary search: `0x6F` and up go to one handler
each, `0x80` and up being a state variable write, and below that the opcode is a floor, `0x3F`, `0x1F`,
`0x0F` or `0x07`, with the operand's high byte or low byte choosing a band.[^t-885-actions] Where that
differs from what [the actions page](../../config-format/actions.md) states for other platforms:[^t-885-actions]

| | here |
|---|---|
| `0x40` to `0x6E` | no opcode in that range is compared, so all of them, the arithmetic block included, act as `0x3F` with their operand's high byte as the band |
| `0x3F` | bands `0xF0`, `0xE0` and `0xD0`; no `0xC0` or `0xB0`. `0xF0` acts on nibbles 0 to 2 only, so there is no sound gate, and the tone tests nothing before it plays |
| `0x3F` band `0xD0` | the deferred instruction: it takes the next instruction off the action queue and puts both into the infrared queue, whose drain later hands the argument back |
| `0x0F` | bands `0xF0` to `0xA0`, `0x80` and `0x70`; no `0x40` band. `0xE0` is the log append, [memory.md](memory.md#what-the-remote-writes-on-its-own) |
| `0x07` | `0xFF` down to `0xF6` on the low byte; **`0xF6` is the power down**, [below](#restarting); `0xFA` acknowledges the infrared queue's event |
| an all zero instruction | never pushed from a list, so `0x00 0x0000` is not a slot and not an arm; `0x01` to `0x06` are the no-ops |
| `0x70` and `0x71` selectors 6 and 7 | always skip the next instruction, as a false comparison does |
| `0x7C` | no fold: each delay is an entry of its own; whether consecutive ones add up depends on the drain, which is not read |

**Every change of the infrared queue's state waits for the configuration.** The state is state variable
17's byte, and each change raises event `0x2D` and holds the transmitter until the configuration runs `0x07
0xFFFA`; every configuration read answers it, [actions](../../config-format/actions.md#on-arch-8-the-remote-sends-nothing-more-until-the-configuration-answers).[^t-885-actions][^t-885-actions-corpus]

**The Harmony 720's dispatcher is this one**: it has the 885's instructions, literals and bit numbers, 831 of
831, with its working registers moved, and its action queue and state loader have the same
constants.[^t-885-actions][^t-885-queue][^t-885-state] So are its number sender, its infrared player's class 1
routines and its screen dispatcher.[^t-885-number-sender][^t-885-infrared][^t-885-screens] Its pushes, infrared
queue and transmitter are not compared.[^unchecked]
The 880 and 880 Pro builds are the 885's but for the skin bytes.[^t-885-start]

## Routines read and where

| routine | where | source |
|---|---|---|
| the version block's five constants, `RETLW` in the order field 0, field 4 low, field 5, field 6, field 4 high | `0x11C46` in both applications | [^s114] |
| the keypad scan, `scan = (line - 1) * 4 + input`, after a caller that reads `PORTB` | `0x08C26` in both applications, `0x04D06` in the 880's bootloader and `0x04D14` in the 885's | [^s144] |
| the USB device descriptor | `0x1A630` in the applications, `0x06102` in the 880's bootloader and `0x06118` in the 885's, byte for byte the application's | [^s114][^t-885-boot] |
| the bootloader's command switch, an `XORLW` chain | `0x03BD4` in the 880's bootloader and `0x03BE0` in the 885's | [^t-885-boot] |
| the bootloader's power on decision | the status clear at `0x0465E` and `0x0466C`, the staged install at `0x02218` and `0x0221C`, the key test at `0x020A8` and `0x020AC` with its comparison at `0x02096` and `0x0209A`, the image check at `0x020CA` and `0x020CE`, the jump at `0x01DDA` and `0x01DDE` | [^t-885-boot] |
| the bootloader's floor check on erase and write, copied to RAM and run at `0x1FFFE0` | `0x056C0` in the 880's bootloader and `0x056CE` in the 885's | [^t-885-boot] |
| the application's base selector, the user configuration or the built in one by data `0x086` bit 3 | `0x191C2` | [^t-885-start] |
| the start check, its two calls from main, and the message routine | `0x1701E`, `0x16DDE` and `0x16DEC`, `0x16A18` | [^t-885-start] |
| the identity block test and the battery calibration test | `0x182C2`, `0x10DE6` | [^t-885-start] |
| the restart command's wait and `RESET`; the three key combination | `0x16FCA` to `0x16FEC`; `0x189DA` in the applications, `0x04ABA` in the 880's bootloader and `0x04AC8` in the 885's | [^t-885-end][^t-885-boot] |
| the action queue: clear, full test, pop, the two pushes, the fetch and the rotate | `0x12DB4`, `0x12DCA`, `0x12E0A`, `0x12F9A` and `0x12FC2`, `0x13090`, `0x130CC` | [^t-885-queue] |
| the dispatcher and its ladders for `0x3F`, `0x0F` and `0x07` | `0x131E6`, `0x13550`, `0x1383C`, `0x1390C` | [^t-885-actions] |
| the infrared queue's push, its state and event, the acknowledgement, the transmitter's start | `0x14692`, `0x1466E`, `0x1468A`, `0x14ED8` | [^t-885-actions] |
| the state variable loader, store, read and the host's bound | `0x172AA`, `0x176CE`, `0x17718`, `0x176C0` | [^t-885-state] |
| the number sender and the `0x1F` bands `0xF3` to `0xF6` that reach it or base slot 14 | `0x19340`, `0x136DE` | [^t-885-number-sender] |
| the infrared record loader, the carrier's start and stop, the interrupt's word, the slot step, the toggle bit and its flip | `0x17C86`, `0x19E88` and `0x19F18`, `0x19F26`, `0x17FC4`, `0x1A864` and `0x14F1A` | [^t-885-infrared] |
| the main loop's infrared service entering the transmitter only when idle | `0x14E52`, `0x14ED4` | [^t-885-delay] |
| the screen dispatcher, the invert and its row, the fill's row, the switch, the text, the picture kind and the raw renderer | `0x17B9C`, `0x17790` and `0x13CDC`, `0x13EE6`, `0x17A62`, `0x17994`, `0x141E2` and `0x1423E` | [^t-885-screens] |

## Obtaining an image

**On this architecture concordance's firmware read returns the whole application**, where on the Harmony
One and the Harmony 600, 650 and 700 it does not: its table gives architecture 8 a firmware base of its
own at `0x010000`, and the configuration base above it is exactly one 64 KiB read away, so one read covers
the application with nothing cut off and nothing else included.[^x-concordance][^s114] Its safe mode read
takes 64 KiB from the flash base, `0x000000` here, so on this architecture it returns the bootloader and
not a safe mode image.[^s116] The identity block at `0x000110`, the serial field and the two GUIDs, is inside what that second read
returns and outside the first, [memory.md](memory.md#the-address-space).[^x-concordance][^t-885-boot]

No Logitech package of this firmware is known; the images were read off remotes by their owners.[^unchecked]

## Not checked

* Any firmware version but 4.4 and boot 4.0, beyond the Harmony 720's routines compared
  [above](#the-harmony-720s-images).[^unchecked]
* The Harmony 785's and 882's firmware, and the Harmony 720's beyond those routines.[^unchecked]
* Whether a bare send from a transition transmits, and the length of the infrared queue's tick, so whether a
  `0x7C` unit is a tenth of a second here.[^unchecked]
* How a recovery through the bootloader goes on a unit; what the built in configuration offers beyond its
  message screens; how long a tick of the timer is.[^unchecked]

[^s114]: Read in the firmware. [Section 114](../../../docs/findings.md#s114)
[^x-concordance]: Stated by a third party. [concordance](https://github.com/jaymzh/concordance)
[^s116]: Read in the firmware. [Section 116](../../../docs/findings.md#s116)
[^s7]: Stated by Logitech. [Section 7](../../../docs/findings.md#s7)
[^s144]: Read in the firmware. [Section 144](../../../docs/findings.md#s144)
[^unchecked]: Not checked.
[^t-arch8-usb]: Measured on a unit. [The test](../../../tests/test_arch8_usb.py)
[^t-885-boot]: Read in the firmware. [The test](../../../tests/test_harmony_885_bootloader.py)
[^t-885-boot-client]: Stated by Logitech, in their client. [The test](../../../tests/test_harmony_885_bootloader.py)
[^t-885-start]: Read in the firmware. [The test](../../../tests/test_harmony_885_start_check.py)
[^t-885-start-corpus]: Measured in configurations. [The test](../../../tests/test_harmony_885_start_check.py)
[^t-885-start-client]: Stated by Logitech, in their client. [The test](../../../tests/test_harmony_885_start_check.py)
[^t-885-end]: Read in the firmware. [The test](../../../tests/test_harmony_885_write_end.py)
[^t-885-actions]: Read in the firmware. [The test](../../../tests/test_harmony_885_actions.py)
[^t-885-actions-corpus]: Measured in configurations. [The test](../../../tests/test_harmony_885_actions.py)
[^t-885-queue]: Read in the firmware. [The test](../../../tests/test_harmony_885_queue.py)
[^t-885-state]: Read in the firmware. [The test](../../../tests/test_harmony_885_state.py)
[^t-885-number-sender]: Read in the firmware. [The test](../../../tests/test_harmony_885_number_sender.py)
[^t-885-infrared]: Read in the firmware. [The test](../../../tests/test_harmony_885_infrared.py)
[^t-885-delay]: Read in the firmware. [The test](../../../tests/test_harmony_885_delay.py)
[^t-885-screens]: Read in the firmware. [The test](../../../tests/test_harmony_885_screens.py)
[^t-885-slots]: Read in the firmware. [The test](../../../tests/test_harmony_885_slots.py)
[^t-885-parameters]: Read in the firmware. [The test](../../../tests/test_harmony_885_parameters.py)
[^t-885-timers]: Read in the firmware. [The test](../../../tests/test_harmony_885_timers.py)
[^t-885-stamp]: Read in the firmware. [The test](../../../tests/test_harmony_885_stamp.py)
[^x-forum-table]: Stated by a third party. [The comparison table](https://www.harmony-remote-forum.de/harmony_compare.php)
