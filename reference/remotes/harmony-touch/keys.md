# Harmony Touch: keys

The drawing, [`reference/silhouettes/touch.svg`](../../silhouettes/touch.svg), is generated from
`packages/silhouettes/src/models/touch.ts`. Its geometry is Logitech's own vector drawing from the setup
guide's "Know your product" page, moved into the drawing's coordinates[^x-touch-manual]; its symbols and words
are read off a photograph of the whole face, and drawing and photograph agree mark for mark, `touch.ts`.

## Every key on the drawing

<!-- generated:keys -->
29 keys on the drawing `touch`, 27 on the keypad, 2 on the touch panel and 0 that the screen speaks for. None carries a scan code.

| key | kind | name from | scan code | screen zone | printed on or beside it |
|---|---|---|---|---|---|
| `Blue` | keypad | printed | not measured |  |  |
| `ChannelDown` | keypad | printed | not measured |  |  |
| `ChannelUp` | keypad | printed | not measured |  |  |
| `DirectionDown` | keypad | printed | not measured |  |  |
| `DirectionLeft` | keypad | printed | not measured |  |  |
| `DirectionRight` | keypad | printed | not measured |  |  |
| `DirectionUp` | keypad | printed | not measured |  |  |
| `Dvr` | keypad | printed | not measured |  | DVR |
| `Exit` | keypad | printed | not measured |  | Exit |
| `FastForward` | keypad | printed | not measured |  |  |
| `Green` | keypad | printed | not measured |  |  |
| `Guide` | keypad | printed | not measured |  | Guide |
| `Info` | keypad | printed | not measured |  | Info |
| `Menu` | keypad | printed | not measured |  | Menu |
| `Off` | keypad | printed | not measured |  | Off |
| `Pause` | keypad | printed | not measured |  |  |
| `Play` | keypad | printed | not measured |  |  |
| `PrevChannel` | keypad | printed | not measured |  |  |
| `Record` | keypad | printed | not measured |  |  |
| `Red` | keypad | printed | not measured |  |  |
| `Rewind` | keypad | printed | not measured |  |  |
| `Select` | keypad | printed | not measured |  | OK |
| `Stop` | keypad | printed | not measured |  |  |
| `VolumeDown` | keypad | printed | not measured |  |  |
| `VolumeMute` | keypad | printed | not measured |  |  |
| `VolumeUp` | keypad | printed | not measured |  |  |
| `Yellow` | keypad | printed | not measured |  |  |
| `Favorites` | touch | printed | not measured |  |  |
| `Home` | touch | printed | not measured |  |  |

Generated from `packages/silhouettes/src/models/touch.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

## The key numbers

**Every key on the keypad has a number, twice over, and a name.** A small microcontroller, an MSP430,
watches the keys and tells the main processor which are down as one bit per key; the kernel turns each
bit into a standard Linux input key code, and the screens' drawing library turns that code into the key's
name, which is the name the button maps use[^t-touch-keys]. The kernel's table has 33 codes: the Touch's
27 keypad keys, then six home control keys of the Harmony Elite and the Harmony 950, skins 111 and 112,
which run the same image with screens of their own, the Hops screens[^t-touch-keys][^t-touch-products]. **Home and Favorites are not among the 27**: they are two
zones of the touch sensor, in the strip it reaches past the top of the display[^t-touch-keys].

So the drawing still carries no scan code, and that is a choice rather than a gap: a scan code on the
other models is the number a configuration binds a key by, and a Touch's documents bind a key by its
name, [the platform's activities and buttons](../../architectures/harmony-touch/activities-and-buttons.md).
The numbers are the table below, read in the firmware, production image 4.15.330, the kernel's table in
the preview build too[^t-touch-keys].

| key on the drawing | the firmware's name | microcontroller bit | Linux key code |
|---|---|---|---|
| `Off` | `PowerOffActivity` | 0 | 116 |
| `Rewind` | `Rewind` | 1 | 168 |
| `Record` | `Record` | 2 | 167 |
| `DirectionLeft` | `DirectionLeft` | 3 | 105 |
| `Select` | `Select` | 4 | 352 |
| `DirectionRight` | `DirectionRight` | 5 | 106 |
| `Play` | `Play` | 6 | 207 |
| `Pause` | `Pause` | 7 | 119 |
| `VolumeDown` | `VolumeDown` | 8 | 114 |
| `DirectionDown` | `DirectionDown` | 9 | 108 |
| `ChannelDown` | `ChannelDown` | 10 | 403 |
| `FastForward` | `FastForward` | 11 | 159 |
| `Stop` | `Stop` | 12 | 128 |
| `Red` | `Red` | 13 | 398 |
| `Green` | `Green` | 14 | 399 |
| `Yellow` | `Yellow` | 15 | 400 |
| `VolumeUp` | `VolumeUp` | 16 | 115 |
| `Exit` | `Exit` | 17 | 174 |
| `DirectionUp` | `DirectionUp` | 18 | 103 |
| `Menu` | `Menu` | 19 | 139 |
| `ChannelUp` | `ChannelUp` | 20 | 402 |
| `Dvr` | `DVR` | 21 | 389 |
| `VolumeMute` | `VolumeMute` | 22 | 113 |
| `Guide` | `Guide` | 23 | 395 |
| `PrevChannel` | `PrevChannel` | 24 | 412 |
| `Info` | `Info` | 25 | 358 |
| `Blue` | `Blue` | 26 | 401 |
| `Favorites` | `Favorites` | none: the touch sensor's left zone | 364 |
| `Home` | `Home` | none: the touch sensor's right zone | 102 |

**The drawing and the firmware differ in two spellings and nothing else**: the drawing's `Off` is the
firmware's `PowerOffActivity` and its `Dvr` is `DVR`[^t-touch-keys]. The drawing keeps its own spellings.
The factory test screen in the image lays out the same 29 keys by the firmware's names, which is the third
source the table closes against[^t-touch-keys]. The driver reads the six home control keys past bit 26
from a second pair of registers on every board; the drawing library names them `HomeControl1` to `4`,
`HomeControlPlus` and `HomeControlMinus`, only the Hops screens and their factory button test use them,
and no screen a Touch runs names one; nor does the Touch's face carry one[^t-touch-keys][^x-touch-manual].

This section was headed "No scan codes, and none can be had here"<!--superseded--> until the firmware
was read, since no key had been read off a Touch and its configuration is not a file a host can open[^s200]; that stays
true of the configuration, and the firmware numbers the keys without it.

## The two marks above the screen

**Home and Favorites are zones of the touch sensor, not keys of the keypad.** The sensor reaches past the
top of the display, and a finger in that strip is reported as a key press: the left zone as Favorites,
the right as Home, and the band between the two as nothing[^t-touch-keys]. That is where the product
prints a star and a house with no key edge around either, and where the manual's legend lists both among
the buttons[^x-touch-manual]. They are drawn as touch keys for that reason. The touch controller's driver
handles more than one sensor model and the two a Touch can carry place the zones alike; which one a unit
carries is **not checked**[^unchecked]. The drawing agrees, on an assumption: taking the glass of Logitech's
own drawing as the display, the centre of the star lies 20 pixels above its top edge and 48 from its left,
and the centre of the house 21 above and 192 from the left, inside the strip one of the driver's two layouts
reads, which starts 10 pixels above the top edge, with Favorites up to 89 and Home from 151; the driver
states no upper edge short of the sensor's own reach[^t-touch-keys].

**Favorites opens the favourite channels, and Home the activities**[^x-touch-manual]. **Pressed on the
activity list while an activity runs, Home goes to that activity's start screen instead**: its favourites,
its number pad, the now playing screen or its commands, as the activity is set up and as far as the
activity has a number pad or speakers to show[^t-touch-keys].

## Held together

The screens recognise two combinations of held keys[^t-touch-keys]:

* **Menu with Mute** opens the radio pairing screen.
* **Record with Previous** opens a setup screen telling the user to place the remote in its cradle.

Four more, each beginning with Fast Forward and Stop, open factory test and debugging screens, and
answer only on a remote carrying a factory flag file that the image does not hold[^t-touch-keys].

## What the keys do, by Logitech's legend

| key | what it does | evidence |
|---|---|---|
| Off | "turns off all of the devices for an activity" rather than one device | [^x-touch-manual], "Turning your system off" |
| Off, held for 8 seconds | ends the running activity as it goes down, like any press of Off: the kernel's key driver starts a timer when Off goes down and stops it when Off comes up, and a timer that runs out is read in the firmware as rebooting the remote. That reboot is not confirmed: on a held Off the activity ended but the remote did not restart by itself, so whether it reboots or powers off is unsettled | [^t-touch-keys][^unchecked] |
| Home | shows the activities on the screen; in device mode the way to the device list; with an activity running and its list showing, that activity's start screen | [^x-touch-manual], "Using your Activities" and "Using Devices"; [^t-touch-keys] |
| Favorites | shows the favourite channels | [^x-touch-manual] |
| the colour keys | cable, satellite or Blu-ray functions | [^x-touch-manual], "Know your product" |
| DVR, Guide, Info | the set top box's record menu, programme listings and information | [^x-touch-manual] |
| Menu, Exit, OK, the direction pad | the television's menus | [^x-touch-manual] |
| volume and channel rockers, mute, previous | as printed; the rockers print `Vol` and `Ch` and nothing else | [^x-touch-manual] |

## The names the documents give the keys

**Logitech's button maps name the keys with 26 names**: the 27 keypad keys of the drawing less Off, with
`DVR` where the drawing says `Dvr`[^t-touch-activities]. Off, Home and Favorites never reach a map, since the
remote's screens handle all three themselves, Off by ending the running activity[^t-touch-activities-firmware]. The
firmware's own name for Off is `PowerOffActivity`, [the key numbers](#the-key-numbers)[^t-touch-keys].
The engine accepts `Dvr` as well as `DVR`, read in the decompiled engine and held by no
test[^t-touch-activities-firmware]. How a key's name becomes a command is
[the platform's activities and buttons](../../architectures/harmony-touch/activities-and-buttons.md).

## Holding a key

**A long press exists on this model**: Logitech's product record declares `LongPressAction` for skin
99[^t-long-press]. A key with one cannot also repeat, because the firmware has to wait to learn which was
meant, [how a Harmony works](../../how-a-harmony-works.md), and on the Touch that is read in the firmware:
**a key with a long press sends nothing when it goes down, sends its long press once it has been held about
600 ms, and sends its short press if it is let go before that**; a key without one keeps sending for as long
as it is held[^t-touch-activities-firmware]. The long press fires on the first hold report at least 550 ms
after the press, about 600 ms in practice, since a held key is reported every 300 ms. Read in the decompiled
engine and the screens' source; the test holds the two numbers[^t-touch-activities-firmware].

**Which keys have one is the button map's choice, not the key's.** In the documents measured the long presses
sit on Rewind, FastForward, Menu, PrevChannel, ChannelUp, ChannelDown, Info, Guide, Yellow and Stop, on
the Tap, SwipeLeft and SwipeRight gestures, and never on a screen entry[^t-touch-activities].

**Measured on a unit with an infrared receiver**: every key with a long press in those maps, held about a second,
sent its long press command and not its short one, and tapped sent its short command alone, 32 long presses over
five activities' maps and six devices' own maps; two of them and one tap were heard only on a second
try[^t-touch-in-use].

## Not checked

* Which of the touch controller's sensor models a Touch carries, and so which of the driver's two layouts
  of the Home and Favorites zones it runs; the two agree on left and right[^unchecked].
* Why a colour key in device mode has been seen to keep its short press as its long one where another key
  took a long press of its own[^unchecked]. MyHarmony's code does not explain it: it offers a long press on
  every key that has a command, and refuses one only on Yellow while Philips Hue is set on it, and on no
  screen entry or gesture[^t-touch-beyond-client].
* The long press's timing measured on a remote rather than read: the infrared receiver hears the code and not the
  press[^unchecked].
* Whether a held Off reboots the remote or powers it off: the firmware reads a reboot, but a check of a held
  Off did not see the remote restart by itself. The two key combinations are still tried on a remote rather
  than read[^unchecked].
* Whether the microcontroller's firmware, one file programmed into every model the image serves, can set
  the six home control bits on a Touch[^unchecked].

[^x-touch-manual]: Stated by Logitech, in the manual. [The Harmony Touch user guide](https://www.manualslib.com/manual/641224/Logitech-Harmony-Touch.html)
[^s200]: Measured on a unit. [Section 200](../../../docs/findings.md#s200)
[^t-long-press]: Stated by Logitech, by their service. [The test](../../../packages/base/test/models.test.ts)
[^t-touch-activities]: Measured on a unit. [The test](../../../packages/usb/test/touch/touch-activities.test.ts)
[^t-touch-activities-firmware]: Read in the firmware. [The test](../../../tests/harmony_touch/test_harmony_touch_activities.py)
[^unchecked]: Not checked.
[^t-touch-keys]: Read in the firmware. [The test](../../../tests/harmony_touch/test_harmony_touch_keys.py)
[^t-touch-in-use]: Measured on a unit. [The test](../../../packages/bench/test/harmony-touch/touch-full-bench-runs.test.ts)
[^t-touch-products]: Stated by Logitech, by their service. [The test](../../../tests/logitech/test_host_client.py)
[^t-touch-beyond-client]: Stated by Logitech, in their client. [The test](../../../tests/harmony_touch/test_harmony_touch_beyond_the_clients.py), class `WhichKeysMyHarmonyGivesALongPressInDeviceMode`
