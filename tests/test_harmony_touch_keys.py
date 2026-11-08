#!/usr/bin/env python3
"""A Harmony Touch's keys, its screen and its power, read in its firmware rather than in its manual.

**The question.** `todo-touch.md` 3.2 asked what of `reference/remotes/harmony-touch/` rests on the user
guide alone, and whether the firmware states it. Until then the model pages said no key on a Touch could
be numbered, that the two marks above the screen might be keys or areas of the touch panel, that the
raster was the size of the manual's screen captures, and, by the manual, that a charging notification
shows in the dock or on a computer and that the battery icon turns red when low<!--superseded-->. This file holds what the
production image, 4.15.330, says instead; the reference pages cite it as `[^t-touch-keys]`.

**How the binaries are read.** Through `tests/test_harmony_touch_image.py`'s readers, imported and never
copied: `members` for the package, `inflated_kernel` for the kernel inside `uImage.bin`, `SquashfsReader`
for the root filesystem. The kernel is linked at `0xC0008000`, so a virtual address in it is its offset
plus that base. ARM instructions are matched as their 32 bit words, whose encodings are standard ARM
(`mov r2, #364` is `E3A02F5B`); the reading behind each was done on a disassembly in the lab, and what
the test pins is the word and its place.

## What was read, and what it settles

**1. The keypad is 27 keys, numbered twice and named once.** The kernel's MSP430 driver reads the
microcontroller's key registers and reports each of 33 bits through a table of 33 standard Linux input key
codes, which sits in the kernel directly after the five pointers naming the power sources and directly
before two `DE AD BE EF` marker words. The loop over the bits splits at bit 27 (it compares the bit number
against 26 and ends at 33), reading the first 27 from one pair of registers and the rest from another;
bits 27 to 32 carry codes the drawing library names `HomeControl1` to `4`, `HomeControlPlus` and
`HomeControlMinus`, keys no screen a Touch runs names. They are the keys of the Harmony Elite and the
Harmony 950, skins `0x6F` and `0x70`, 111 and 112 in Logitech's product table (`tests/test_host_client.py`):
`opt/luadraws/main.lua` loads the `hops` screens for those two skins and the `juniper` ones for every other
skin; the Hops factory button test, `appscommon/tde/testhopsbutton.lua`, lays out 35 keys, the 27, the six
and Home and Favorites, and no `juniper` screen names a home control key. The driver reads all four key
registers with no board or skin test, and `etc/init.d/rcS.local` programs the one `msp430.txt` into
every model's microcontroller, so whether a Touch's microcontroller ever sets the six bits was not read.
The drawing library `opt/lib/luadraws.so.0.0.0` holds
43 pairs of a Linux code and a key name; every one of the 27 keypad codes has a name there and the 27
names are distinct. **The closure** is the factory test screen, `appscommon/tde/testjuniperbutton.lua`,
a third file written independently of both tables, which lays out 29 keys by name, 20 in its lower list
and 9 in its upper one: its 29 names are the 27 plus `Home` and `Favorites`, exactly. The drawing,
`packages/silhouettes/src/models/touch.ts`, carries the same 29 under two other spellings, `Off` for
`PowerOffActivity` and `Dvr` for `DVR`, and no other difference. Both builds hold the kernel table
byte for byte at the same offset; the drawing library and the test screen were read in production only.
The negative: a Linux code beside the table's, 117, finds no name in the library's table.

**2. Home and Favorites are zones of the touch sensor, not keys of the keypad.** `clearpad.ko` keeps its
symbols, and of the handlers it selects by the controller's product id, the two a Touch can run are
`clearpad_irq_tm2176_work` (the controller the image ships firmware for, `TM2176-003`) and
`clearpad_irq_juniper01_work` (`Juniper-01`, the codename's own); which one a unit runs was not read.
Both report `KEY_FAVORITES` (364) and `KEY_HOME` (102) for a finger above the display: in the Juniper
handler a sensor height above 320 leaves the display (`cmp r8, #320`, `bgt`), one above 330 is the strip
(the literal `0x14A`, which is also `BTN_TOUCH`), an X of 89 or less presses
Favorites and an X over 150 presses Home, and 90 to 150 presses nothing, which the test pins as the branch
past the second X comparison landing where no key code is loaded; the TM2176 handler has the same
shape on a finer sensor, with its strip below a flipped height of 110 and its split at 360 and 380. So
**Favorites is the left zone and Home the right**, with a dead band between them, which is where the
drawing puts the star and the house. The test pins the comparisons in each handler and that the last
key code loaded between the two X comparisons is 364 and after the second one 102.

**Why the strip is above the display and not below it.** The Juniper handler reports a finger's height on
the display as 320 minus the sensor's (`rsb r3, r8, #320`), so the sensor's 320 is the display's row 0
and a sensor height past 330 lies beyond row 0. The TM2176 handler flips the same way (`rsb r8, r3, r8`,
the sensor's maximum less the reading) and reports the display's height as the flipped one less 120, so
its strip, a flipped height of 109 or less, also lies before row 0. The drawing library does not flip it
back: of the input devices it opens by name, it sets a height inversion for the `TPS6507x Touchscreen`
alone (`str r8, [r4, #-0x21c]` beside `mov r1, #100`), and its `Synaptics Clearpad` branch stores the two
ranges and the sizes 240 and 320 and nothing else. And the screens' row 0 is the top of the face: the
factory button test lays the upper keys out with Off at the smallest height and the two marks at the
largest, and the lower keys with Exit and Menu first and the colours last, the order on the product. The
drawing agrees, on the assumption that its glass is the display: the centres of the star and the house sit
20 and 21 pixels above the top edge, a sensor height of about 340 in the Juniper handler's units, which
read the display one pixel to a unit, past the strip's edge at 330, and their left to right positions, 48
and 192, fall in Favorites' zone and Home's. The test checks the centres; the star's lowest point sits at
330 itself, so its outline is not wholly inside.

**3. The screen is 240 by 320 pixels, by four programs.** The screens' `draws/render.lua` sets
`SCREEN_WIDTH = 240` and `SCREEN_HEIGHT = 320`; the kernel's framebuffer panel table has an entry named
`ILl9341_240x320` (spelt so) holding 240 and 320 as its two 16 bit size fields, and the board code named
for the Touch's codename, `da850_juniper_init`, hands platform data naming that entry to the display
controller's registration: the word before its "lcdc registration failed" message in its literal pool
points at a record whose maker is `Tiamna` (sic) and whose type is `ILl9341_240x320`. The other two boards
in the kernel, `da850_evm_init` and `da850_apollo_init`, name `Sharp_LK043T1DG01`, a 480 by 272 entry, and
the table's `Sharp_LCD035Q3DG01`, 320 by 240, is named by no board. Which board's code a unit boots is the
boot loader's choice and was not read. The drawing library scales the touch controller's reports to 240
and 320 (`mov r3, #240` and `mov r3, #320`, right after the two `EVIOCGABS` requests), and the Juniper
touch handler reports a finger's height on the display as 320 minus the sensor's (`rsb r3, r8, #320`).
Four files written for different jobs. `SCREEN_SIZES[17]` in
`packages/codec/src/screens/render.ts` is asserted equal to them here, so the codec's row cannot drift from the
firmware.

**4. Off held for 8 seconds restarts the remote.** In the MSP430 handler, a press of bit 0, the Off key,
arms a kernel timer for `msecs_to_jiffies(8000)` (`mov r0, #8000`, `E3A00D7D`), and its release deletes
the timer. The timer's function prints "Power button held, rebooting" and sends `SIGINT` to the process
registered for ctrl alt del; the image's `etc/inittab` maps ctrl alt del to `/sbin/reboot`. The test pins
the `mov` within the handler (the instructions before the literal that points at the key table) and that
it arms the timer at offset 40 of the driver's state (`add r0, r4, #40` then a call, a second time on the
release), that the probe naming `msp430` stores the message's function into that timer (`add r0, r4, #40`
before, `str r3, [r4, #0x38]` after loading it), the string's address as a literal exactly once, and the
init table's line. The timer does not replace the ordinary Off: the screens' key press handler, in
`juniper/init.lua`, ends the running activity on the press of `PowerOffActivity` (it calls `startActivity`
in that branch and returns), so a held Off stops the activity at once and restarts the remote 8 seconds
later. The test pins that branch by its names.

**5. Key combinations.** The screens keep a sum of weights of eleven keys while they are held
(`juniper/init.lua`, `buttonBitmap`): Menu with Mute, 384, opens pairing; Record with Previous, 1536, opens
the screen telling the user to place the remote in its cradle; four more, each starting with Fast Forward
and Stop (7, 67, 11 and 19), answer only when `/etc/tdeenable` exists, which the image does not hold.

**6. Charging, the battery picture and low battery** (`juniper/init.lua`, `juniper/style.lua`). The
"Charging" screen opens when the power source becomes `cradle` or `wall_adapter`, and never for `usb`;
on `usb` the screens push the instructions screen (the USB screen) instead. The charging screen asks the
screen to sleep after 10 seconds. "Fully charged" follows when the charge current falls to 0.3 A or less
while charging, and the screens mark the remote as charging only on a change to `cradle` or
`wall_adapter` (`batteryCharging` is set true in that branch alone), so it never follows a charge on
`usb`. The battery check matches `usb` by a pattern, so `usb_charge` takes the `usb` branch, and the
status bar's table holds no picture for `usb_charge`. On battery, below a smoothed 3.55 V, a "Low battery" screen is pushed and the remote runs
`/sbin/poweroff` 10 seconds later. The status bar shows one picture for `usb`, `cradle` and
`wall_adapter` and on battery one of three by voltage, the full one from 3.85 V, the half from 3.7 V and
the quarter below. **Those four pictures are one near white colour and nothing else**, decoded here
pixel by pixel; the low battery screen's picture is the one with red in it, which is the decoder's
control. The header folder's `red.png` and `low-battery.png` are named by no Touch screen; `red.png` is
named by the `hops` screens, another skin's, which shows the search finds a name when there is one. A
change of power source wakes the screen, which is why lifting the remote from its dock turns it on.

**7. Settings on the remote.** The screen timeout slider runs 1 to 30 seconds; the screen brightness and
key brightness sliders run 10 to 100 each, and a slider past 95 pushes a warning that brighter screen and
buttons drain the battery faster. The vibration and tilt settings are offered only when the native layer
reports the part (`Render:hasHaptic()`, `Render:hasAccel()`), which was not read.

**8. Gestures.** `juniper/gesture.lua`: a swipe is recognised after 60 pixels of travel, or the threshold
its caller passes, and named by the quadrant of its direction; a touch held 700 ms is a Tap with the value
`Hold`, and a swipe held 700 ms past its threshold is that swipe with `Hold`; a second press within 300 ms
makes a `DoubleTap`. Both timers start in the press callback and none in the release, so a tap released
within 300 ms is sent 300 ms after the press, and one released between 300 and 700 ms is sent by neither.
The recogniser is attached in two places only: `juniper/gesturepad.lua`, with no threshold, and the lock
screen in `juniper/init.lua`, with 150. Other taps, swipes and scrolls go through other modules of the
screens' library, which are not read here.

**9. Device mode and the menu.** `juniper/activity.lua` is the home page, the activity list, and its
footer's right hand button opens a menu of Help, Devices, Settings, Edit and the sleep timer, whose
Devices entry is `juniper/devicemode.lua` and Settings `juniper/settings.lua`. In `devicemode.lua`, a
device's command screen sets that device as the current one when it becomes the active window and resets
it to none when it stops being active, unless a screen of its own took over; the device list resets it
too. `juniper/init.lua`'s `fireIr` sends a hard key through the current device's own map when there is
one and through the running activity's otherwise. So device mode lasts while that device's screen is up,
and going Home or to the favourites ends it. Home pressed on the activity list with one window showing
and an activity running goes to that activity's start screen instead (`showHome`): the favourites, the
number pad when the activity has one, the now playing screen when it has speakers, and its commands
otherwise. The test pins the three named cases, their conditions and the fallback.

**10. Parts the kernel declares.** The kernel carries several boards' I2C tables, TI's evaluation
board's among them, and the one holding the touch controller names, with their addresses, `tps6507x` at
`0x48`, `clearpad` at `0x20`, `msp430` at `0x34`, `LIS3DH` at `0x19`, `drv2605` at `0x5A` and `stc3115` at
`0x70`: a power controller, the touch controller, the key microcontroller, an accelerometer, a
haptic driver and a fuel gauge. The screens drive the display's backlight through
`ap3156_backlight` in 26 steps and the key backlight through the LED `tps6507x:white` in 42. A board
table declares what a board may carry; whether a Touch has the accelerometer and the haptic driver is
what the screens ask at run time, and was not read. The kernel registers the display's driver as
`ili9340_lcd` and logs an `ili9341` module id, so the controller is of that family; which module is fitted
was not read.

## Negative results, and what was dropped

* The six home control codes are in the kernel's table and the library's, and on no key of a Touch.
* The note this was landed from also said the MSP430 keeps the clock, from an "RTC" message among the
  MSP430 driver's strings. A string beside others is not a reading of which driver owns it, so that is
  not asserted and the reference does not state it.
* It said the header's `red.png` is named by no screen; it is named by the `hops` screens, and by no
  Touch screen, which is the claim kept.
* It placed the gesture button on an activity's command screen; the footer that carries it is the home
  page's, `juniper/activity.lua`, and that is not asserted either way here.

**Width.** The production image 4.15.330, which its descriptor states is for skins 99, 100, 102, 105, 108,
111 and 112. The screens a Touch runs are the `juniper` ones (`tests/test_harmony_touch_favourites.py`);
what another of those skins does is not asserted. The kernel facts hold on the preview build too, the key
table and the MSP430 handler byte for byte.

**Sources checked first.** `reference/remotes/harmony-touch/` and `reference/architectures/harmony-touch/`,
the drawing, `tests/test_harmony_touch_image.py`, `tests/test_harmony_touch_favourites.py` and
`tests/test_harmony_touch_activities.py`, Logitech's product table capture (`tests/test_host_client.py`,
which now holds skin 99's 15 devices and 50 favourites), and MyHarmony's source for the client's device
and activity limits. The firmware answers every question here without the client; the client was read
for limits, which the remote does not enforce and which are not this file's.

**Standing.** "Read in the firmware" for all of it. The image stays in the lab.
"""
import re
import struct
import tempfile
import unittest
import zlib
from pathlib import Path

import lab
from test_harmony_touch_image import UNSQUASHFS, SquashfsReader, inflated_kernel, members
from test_harmony_touch_favourites import constant

BUILDS = ('touch_package_production', 'touch_package_preview')
IMAGE = 'touch_package_production'
KERNEL_BASE = 0xC0008000
REPO = Path(__file__).resolve().parent.parent

#: The Linux input key code of each MSP430 bit, 0 to 26, and the firmware's name for it.
KEYPAD = [
    (116, 'PowerOffActivity'), (168, 'Rewind'), (167, 'Record'), (105, 'DirectionLeft'), (352, 'Select'),
    (106, 'DirectionRight'), (207, 'Play'), (119, 'Pause'), (114, 'VolumeDown'), (108, 'DirectionDown'),
    (403, 'ChannelDown'), (159, 'FastForward'), (128, 'Stop'), (398, 'Red'), (399, 'Green'), (400, 'Yellow'),
    (115, 'VolumeUp'), (174, 'Exit'), (103, 'DirectionUp'), (139, 'Menu'), (402, 'ChannelUp'), (389, 'DVR'),
    (113, 'VolumeMute'), (395, 'Guide'), (412, 'PrevChannel'), (358, 'Info'), (401, 'Blue'),
]
#: Bits 27 to 32, and what the drawing library calls them.
HOME_CONTROL = [(148, 'HomeControl1'), (149, 'HomeControl3'), (202, 'HomeControl2'), (203, 'HomeControl4'),
                (78, 'HomeControlPlus'), (74, 'HomeControlMinus')]
#: The two zones of the touch strip, as Linux codes.
FAVORITES, HOME = 364, 102
#: The drawing's spelling where it is not the firmware's.
DRAWING_SPELLINGS = {'Off': 'PowerOffActivity', 'Dvr': 'DVR'}
POWER_SOURCES = [b'battery', b'cradle', b'wall_adapter', b'usb', b'usb_charge']
MARKER = bytes.fromhex('deadbeef') * 2

#: ARM words pinned below, each with its instruction.
MOV_R2_FAVORITES = 0xE3A02F5B   # mov r2, #364
MOV_R2_HOME = 0xE3A02066        # mov r2, #102
CMP_R7_26 = 0xE357001A          # cmp r7, #26, the split between the two register pairs
CMP_R7_33 = 0xE3570021          # cmp r7, #33, the end of the loop over the bits
MOV_R0_8000 = 0xE3A00D7D        # mov r0, #8000, the hold before the restart
RSB_320 = 0xE2683D05            # rsb r3, r8, #320, a display height from the sensor's
ADD_R0_R4_40 = 0xE2840028       # add r0, r4, #40, the timer inside the MSP430 driver's state
STR_R3_R4_38 = 0xE5843038       # str r3, [r4, #0x38], that timer's function field
MOV_R12_SP = 0xE1A0C00D         # mov r12, sp, the first instruction of every kernel function here
CMP_R8_320 = 0xE3580D05         # cmp r8, #320, the Juniper handler's display edge
BGT_STRIP = 0xCA00002D          # bgt to the Juniper handler's strip branch
#: The TM2176 handler's flip: flipped = maximum - reading, the display edge, the display height, the strip.
TM2176_FLIP = (0xE0638008, 0xE3580077, 0xE2483078, 0xE358006D)
#: The drawing library: its Clearpad branch's sizes, and the TPS6507x branch's height inversion.
LIB_MOV_R3_240, LIB_MOV_R3_320 = 0xE3A030F0, 0xE3A03D05
LIB_EVIOCGABS_X, LIB_EVIOCGABS_Y = 0x80184540, 0x80184541
LIB_STR_Y_FLIP = 0xE504821C     # str r8, [r4, #-0x21c], r8 being 1
LIB_MOV_R1_100 = 0xE3A01064     # mov r1, #100, the TPS6507x branch's first instruction
#: Each handler's comparisons: the display's edge, the strip's edge, and the two X limits.
STRIP = {
    'clearpad_irq_juniper01_work': {'edge': [0xE3580D05], 'x': (0xE3590059, 0xE3590096)},  # 320; 89, 150
    'clearpad_irq_tm2176_work': {'edge': [0xE3580077, 0xE358006D], 'x': (0xE3590F5A, 0xE3590F5F)},  # 119, 109; 360, 380
}

SCREENS = 'opt/luadraws/'
RENDER = SCREENS + 'draws/render.lua'
TEST_SCREEN = SCREENS + 'appscommon/tde/testjuniperbutton.lua'
INIT = SCREENS + 'juniper/init.lua'
STYLE = SCREENS + 'juniper/style.lua'
GESTURE = SCREENS + 'juniper/gesture.lua'
DEVICE_MODE = SCREENS + 'juniper/devicemode.lua'
ACTIVITY_LIST = SCREENS + 'juniper/activity.lua'
SETTINGS = SCREENS + 'juniper/settings.lua'
TIMEOUT = SCREENS + 'juniper/settings/screenTimeout.lua'
BRIGHTNESS = SCREENS + 'juniper/settings/screenBrightness.lua'
HEADER = SCREENS + 'appscommon/asset/header/'
LOW_BATTERY_PICTURE = SCREENS + 'appscommon/asset/notification/lowbattery.png'
LIBRARY = 'opt/lib/luadraws.so.0.0.0'
#: The one colour of the status bar's battery pictures.
NEAR_WHITE = (245, 247, 246)


def words(data):
    """A blob as little endian 32 bit words, for matching ARM instructions."""
    return list(struct.unpack_from('<%dI' % (len(data) // 4), data))


def key_table(kernel):
    """The kernel's 33 key codes: the words between the power source pointers and the marker."""
    marker = kernel.find(MARKER)
    assert marker > 0 and kernel.count(MARKER) == 1, 'one marker'
    codes = struct.unpack_from('<33I', kernel, marker - 33 * 4)
    pointers = struct.unpack_from('<5I', kernel, marker - 38 * 4)
    named = []
    for p in pointers:
        at = p - KERNEL_BASE
        named.append(kernel[at:kernel.index(b'\0', at)])
    return marker - 33 * 4, list(codes), named


def pc_loads(blob, slot, reach=0x1000):
    """Where an `ldr rd, [pc, #imm]` within `reach` bytes before `slot` loads the word at `slot`."""
    found = []
    for at in range(max(0, slot - reach) & ~3, slot, 4):
        word, = struct.unpack_from('<I', blob, at)
        if word & 0xFFFF0000 == 0xE59F0000 and at + 8 + (word & 0xFFF) == slot:
            found.append(at)
    return found


def pointer_to(kernel, text):
    """The one literal slot holding the address of `text`, which must occur once."""
    at = kernel.index(text)
    assert kernel.count(text) == 1, text
    slots = [m.start() for m in re.finditer(re.escape(struct.pack('<I', KERNEL_BASE + at)), kernel)]
    assert len(slots) == 1, (text, slots)
    return slots[0]


def word_at(kernel, at):
    return struct.unpack_from('<I', kernel, at)[0]


def lcd_type(kernel, pdata):
    """The panel type a da8xx LCD platform data record names: a 10 byte maker, padding, a pointer, the type."""
    at = pdata - KERNEL_BASE
    return kernel[at:kernel.index(b'\0', at)], kernel[at + 16:kernel.index(b'\0', at + 16)]


def panel_size(kernel, name):
    """The width and height of the panel table's entry of that name, the one occurrence holding a size."""
    sizes = [struct.unpack_from('<HH', kernel, m.start() + 26)
             for m in re.finditer(re.escape(name + b'\0'), kernel)]
    return [z for z in sizes if 100 < z[0] < 1000 and 100 < z[1] < 1000]


def menu_heights(source, which):
    """A factory test menu's names with their heights, which may be written as `a-b`."""
    body = re.search(r'local %s = \{(.*?)\n\}' % which, source, re.S).group(1)
    out = {}
    for m in re.finditer(r'^\s*\{\s*"(\w+)".*,\s*(\d+)\s*,\s*(\d+)(?:\s*-\s*(\d+))?\s*\},?\s*$', body, re.M):
        out[m.group(1)] = int(m.group(3)) - int(m.group(4) or 0)
    return out


def drawing_mark_centres():
    """The centres of the drawing's star and house, and its glass, in the drawing's units."""
    source = (REPO / 'packages/silhouettes/src/models/touch.ts').read_text()
    centres = {}
    for name in ('Favorites', 'Home'):
        path = re.search(r"\{ name: '%s', [^\n]*?traced\('([^']*)'\)" % name, source).group(1)
        numbers = [float(n) for n in re.findall(r'-?\d+(?:\.\d+)?', path)]
        xs, ys = numbers[0::2], numbers[1::2]
        centres[name] = ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)
    glass = re.search(r'screen: \{ x: ([\d.]+), y: ([\d.]+), w: ([\d.]+), h: ([\d.]+),', source).groups()
    return centres, tuple(float(v) for v in glass)


def handler_literals(kernel, table):
    """Where the kernel names the key table's address with the bit loop's two bounds just before it."""
    literal = struct.pack('<I', KERNEL_BASE + table)
    found = []
    for m in re.finditer(re.escape(literal), kernel):
        before = words(kernel[m.start() - 0x200:m.start()])
        if CMP_R7_26 in before and CMP_R7_33 in before:
            found.append(m.start())
    return found


def elf_sections(elf):
    """Section headers of a 32 bit little endian ELF, as name to (type, address, offset, size, link)."""
    shoff, = struct.unpack_from('<I', elf, 32)
    shentsize, shnum, shstrndx = struct.unpack_from('<HHH', elf, 46)
    raw = [struct.unpack_from('<10I', elf, shoff + i * shentsize) for i in range(shnum)]
    names = raw[shstrndx]

    def name(at):
        start = names[4] + at
        return elf[start:elf.index(b'\0', start)].decode()
    return {name(s[0]): (s[1], s[3], s[4], s[5], s[6]) for s in raw}, raw


def elf_functions(elf):
    """A module's function symbols, as name to (offset into .text, size)."""
    sections, raw = elf_sections(elf)
    _, _, symoff, symsize, link = sections['.symtab']
    strtab = raw[link][4]
    out = {}
    for at in range(symoff, symoff + symsize, 16):
        name, value, size, info = struct.unpack_from('<IIIB', elf, at)
        if info & 0xF == 2:  # STT_FUNC
            out[elf[strtab + name:elf.index(b'\0', strtab + name)].decode()] = (value, size)
    return out


def library_names(so):
    """The drawing library's table of Linux code and key name, found by the pair naming Off.

    The library's data segment is loaded at its file offset plus `0x8000`; a pointer is followed into
    the read only segment, loaded at offset 0. The table is walked both ways from `(116, PowerOffActivity)`
    for as long as an entry is a small code and a pointer to an identifier.
    """
    phoff, = struct.unpack_from('<I', so, 28)
    phnum, = struct.unpack_from('<H', so, 44)
    loads = [struct.unpack_from('<8I', so, phoff + 32 * i) for i in range(phnum)]
    loads = [(p[2], p[1], p[4]) for p in loads if p[0] == 1]  # vaddr, offset, file size

    def text(va):
        for vaddr, offset, size in loads:
            if vaddr <= va < vaddr + size:
                at = va - vaddr + offset
                s = so[at:so.index(b'\0', at)]
                return s.decode() if re.fullmatch(rb'[A-Za-z][A-Za-z0-9]{1,30}', s) else None
        return None

    def entry(at):
        code, pointer = struct.unpack_from('<II', so, at)
        name = text(pointer) if code < 0x300 else None
        return (code, name) if name else None

    seeds = [at for at in range(0, len(so) - 8, 4) if entry(at) == (116, 'PowerOffActivity')]
    assert len(seeds) == 1, seeds
    start = end = seeds[0]
    while entry(start - 8):
        start -= 8
    while entry(end + 8):
        end += 8
    return [entry(at) for at in range(start, end + 8, 8)]


def png_colours(data):
    """Every colour of a PNG's pixels that are more than half opaque, with its count. RGB or RGBA, 8 bit."""
    # A PNG's first chunk is its header, so these are always set before they are read; the
    # assertion after the loop says so to the type checker as well as to a malformed file.
    at, idat = 8, b''
    width = height = colour = None
    while at < len(data):
        length, kind = struct.unpack_from('>I4s', data, at)
        body = data[at + 8:at + 8 + length]
        if kind == b'IHDR':
            width, height, depth, colour = struct.unpack_from('>IIBB', body)
            assert depth == 8 and colour in (2, 6), (depth, colour)
        elif kind == b'IDAT':
            idat += body
        at += 12 + length
    assert width is not None and height is not None, 'no IHDR chunk'
    bpp = 4 if colour == 6 else 3
    raw, stride = zlib.decompress(idat), width * bpp
    previous, at, found = bytearray(stride), 0, {}
    for _ in range(height):
        kind, line = raw[at], bytearray(raw[at + 1:at + 1 + stride])
        at += 1 + stride
        for x in range(stride):
            a = line[x - bpp] if x >= bpp else 0
            b = previous[x]
            c = previous[x - bpp] if x >= bpp else 0
            if kind == 1:
                line[x] = (line[x] + a) & 255
            elif kind == 2:
                line[x] = (line[x] + b) & 255
            elif kind == 3:
                line[x] = (line[x] + (a + b) // 2) & 255
            elif kind == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        previous = line
        for x in range(width):
            pixel = tuple(line[x * bpp:x * bpp + bpp])
            if bpp == 3 or pixel[3] > 128:
                found[pixel[:3]] = found.get(pixel[:3], 0) + 1
    return found


def coloured(found):
    """How many pixels have a colour rather than a grey: channels more than 30 apart."""
    return sum(n for rgb, n in found.items() if max(rgb) - min(rgb) > 30)


def top_level(source, opening):
    """A top level Lua block, from the line matching `opening` to the next `end` or `end)` in column 0."""
    start = re.search(opening, source, re.M)
    if not start:
        raise AssertionError('no %s' % opening)
    end = re.compile(r'^end\)?\s*$', re.M).search(source, start.end())
    return source[start.start():end.end()]


def drawing_names():
    """The names of the keys on the drawing, read out of its model file."""
    source = (REPO / 'packages/silhouettes/src/models/touch.ts').read_text()
    return re.findall(r"\{ name: '(\w+)'", source)


class TheKernel(unittest.TestCase):
    """Facts 1, 3, 4 and 10 as the kernel holds them, on both builds."""

    @classmethod
    def setUpClass(cls):
        lab.require(*BUILDS)
        cls.kernels = {name: inflated_kernel(members(name)['uImage.bin']) for name in BUILDS}

    def test_the_driver_numbers_33_bits_and_the_first_27_are_the_keypad(self):
        for name, kernel in self.kernels.items():
            with self.subTest(build=name):
                at, codes, pointers = key_table(kernel)
                self.assertEqual(pointers, POWER_SOURCES, 'the table follows the power source names')
                self.assertEqual(codes, [c for c, _ in KEYPAD] + [c for c, _ in HOME_CONTROL])
                # The loop that reads the table: its literal pool names the table's address once, and
                # the loop's two bounds sit in the instructions before it.
                # The loop that reads the table: of the places that name the table's address, exactly one
                # has the loop's two bounds in the instructions before it.
                self.assertEqual(len(handler_literals(kernel, at)), 1)

    def test_both_builds_hold_the_table_and_the_handler_byte_for_byte(self):
        production, preview = (self.kernels[b] for b in BUILDS)
        at, _, _ = key_table(production)
        self.assertEqual(key_table(preview)[0], at)
        self.assertEqual(production[at:at + 33 * 4], preview[at:at + 33 * 4])
        literal, = handler_literals(production, at)
        self.assertEqual(handler_literals(preview, at), [literal])
        self.assertEqual(production[literal - 0x320:literal], preview[literal - 0x320:literal],
                         'the handler, from its entry to the literal naming the table')
        self.assertNotEqual(production, preview, 'and the two kernels are not one file')

    def test_off_held_8_seconds_restarts_the_remote(self):
        for name, kernel in self.kernels.items():
            with self.subTest(build=name):
                at, _, _ = key_table(kernel)
                literal, = handler_literals(kernel, at)
                handler = words(kernel[literal - 0x320:literal])
                self.assertEqual(handler.count(MOV_R0_8000), 1, 'the timer is armed for 8000 ms')
                # The 8000 goes to msecs_to_jiffies and the sum to mod_timer on the timer at offset 40;
                # the release deletes the same timer.
                arm = handler.index(MOV_R0_8000)
                self.assertIn(ADD_R0_R4_40, handler[arm:arm + 5])
                after = handler.index(ADD_R0_R4_40, arm)
                self.assertEqual(handler[after + 1] >> 24, 0xEB, 'a call follows')
                self.assertEqual(handler[arm:].count(ADD_R0_R4_40), 2, 'armed on the press, deleted on the release')
                message = kernel.index(b'<5>Power button held, rebooting')
                self.assertEqual(kernel.count(b'Power button held, rebooting'), 1)
                self.assertEqual(kernel.count(struct.pack('<I', KERNEL_BASE + message)), 1,
                                 'one function prints it')
                printer = self.function_naming(kernel, KERNEL_BASE + message)
                self.assertEqual(self.timers_installed(kernel, printer), 1,
                                 'the probe naming msp430 puts that function into the timer at offset 40')
                self.assertIn(b'ctrl-alt-del', kernel)

    @staticmethod
    def function_naming(kernel, address):
        """The address of the function whose literal pool holds `address`, by its first instruction."""
        slot, = [m.start() for m in re.finditer(re.escape(struct.pack('<I', address)), kernel)]
        for at in range(slot - 4, slot - 0x40, -4):
            if word_at(kernel, at) == MOV_R12_SP:
                return KERNEL_BASE + at
        raise AssertionError('no function start before the literal')

    @staticmethod
    def timers_installed(kernel, function):
        """How many places load `function` from a pool beside a pointer to `msp430` and store it as the
        function of the timer at offset 40, right after initialising that timer."""
        def names_msp430(at):
            near = words(kernel[at - 0x20:at + 0x20])
            return any(KERNEL_BASE <= w < KERNEL_BASE + len(kernel)
                       and kernel[w - KERNEL_BASE:w - KERNEL_BASE + 7] == b'msp430\0' for w in near)
        count = 0
        for m in re.finditer(re.escape(struct.pack('<I', function)), kernel):
            if not names_msp430(m.start()):
                continue
            for at in pc_loads(kernel, m.start()):
                before = words(kernel[at - 0x10:at])
                if word_at(kernel, at + 4) == STR_R3_R4_38 and ADD_R0_R4_40 in before:
                    count += 1
        return count

    def test_the_panel_entry_is_240_by_320_and_the_board_names_it(self):
        for name, kernel in self.kernels.items():
            with self.subTest(build=name):
                found = [m.start() for m in re.finditer(rb'ILl9341_240x320\0', kernel)]
                self.assertEqual(len(found), 2, 'the panel table and the board data')
                # da8xx's panel entry: a 25 byte name, padded to 26, then the width and the height.
                sizes = [struct.unpack_from('<HH', kernel, at + 26) for at in found]
                self.assertEqual(sizes.count((240, 320)), 1, 'one entry holds the size')
                # The board code named for the codename hands that entry to the display controller: the
                # pool word before its registration failure message is its platform data.
                slot = pointer_to(kernel, b'<4>da850_juniper_init: lcdc registration failed')
                self.assertEqual(lcd_type(kernel, word_at(kernel, slot - 4)), (b'Tiamna', b'ILl9341_240x320'))

    def test_the_other_two_boards_name_a_panel_that_is_not_240_by_320(self):
        # The control: the same reading on the evaluation board's and apollo's code finds another panel.
        for name, kernel in self.kernels.items():
            for board in (b'da850_evm_init', b'da850_apollo_init'):
                with self.subTest(build=name, board=board):
                    slot = pointer_to(kernel, b'<4>' + board + b': lcd initialization failed')
                    maker, panel = lcd_type(kernel, word_at(kernel, slot + 4))
                    self.assertEqual((maker, panel), (b'sharp', b'Sharp_LK043T1DG01'))
                    self.assertEqual(panel_size(kernel, panel), [(480, 272)])
                    self.assertNotEqual(panel_size(kernel, panel), [(240, 320)])

    def test_the_board_declares_six_parts_on_the_bus_the_screens_use(self):
        kernel = self.kernels[IMAGE]
        # i2c_board_info here: a 20 byte type, a 16 bit flags word, a 16 bit address, then 12 bytes. The
        # kernel carries more than one board's tables, TI's evaluation board's among them, and the one
        # with the touch controller in it is this board's.
        starts = [m.start() for m in re.finditer(rb'tps6507x\0{12}', kernel)
                  if kernel[m.start() + 0x24:m.start() + 0x2D] == b'clearpad\0']
        self.assertEqual(len(starts), 1)
        at = starts[0]
        table = []
        for entry in range(6):
            base = at + entry * 0x24
            table.append((kernel[base:base + 20].rstrip(b'\0'), struct.unpack_from('<H', kernel, base + 22)[0]))
        self.assertEqual(table, [(b'tps6507x', 0x48), (b'clearpad', 0x20), (b'msp430', 0x34),
                                 (b'LIS3DH', 0x19), (b'drv2605', 0x5A), (b'stc3115', 0x70)])
        # The display's controller, by the names the kernel registers and logs it under.
        self.assertEqual(kernel.count(b'ili9340_lcd\0'), 1)
        self.assertEqual(kernel.count(b'ili9341'), 1)


class TheKeysPage(unittest.TestCase):
    """The key table of `reference/remotes/harmony-touch/keys.md` is typed by hand, so it is held against
    `KEYPAD`, which the firmware tests above hold against the kernel: one derivation, two places, compared."""

    def test_the_pages_key_table_is_keypad_row_for_row(self):
        page = (REPO / 'reference/remotes/harmony-touch/keys.md').read_text()
        rows = re.findall(r'^\| `(\w+)` \| `(\w+)` \| (\d+) \| (\d+) \|$', page, re.M)
        self.assertEqual([(int(code), name, int(bit)) for _, name, bit, code in rows],
                         [(code, name, bit) for bit, (code, name) in enumerate(KEYPAD)])
        self.assertEqual({d: f for d, f, _, _ in rows if d != f}, DRAWING_SPELLINGS)
        zones = re.findall(r'^\| `(\w+)` \| `(\w+)` \| none: [^|]+ \| (\d+) \|$', page, re.M)
        self.assertEqual(sorted((n, int(c)) for n, _, c in zones), [('Favorites', FAVORITES), ('Home', HOME)])


@unittest.skipUnless(UNSQUASHFS, 'unsquashfs is not installed')
class TheRootFilesystem(unittest.TestCase):
    """Facts 1 to 9 as the touch driver, the drawing library and the screens hold them, production only."""

    @classmethod
    def setUpClass(cls):
        lab.require(IMAGE)
        cls.tmp = tempfile.TemporaryDirectory()
        cls.rootfs = SquashfsReader(members(IMAGE)['harmony-image.squashfs'], cls.tmp.name)
        sources = [RENDER, TEST_SCREEN, INIT, STYLE, GESTURE, DEVICE_MODE, SETTINGS, TIMEOUT, BRIGHTNESS,
                   ACTIVITY_LIST]
        cls.text = {p: b.decode('utf-8') for p, b in cls.rootfs.each(sources).items()}
        cls.kernel = inflated_kernel(members(IMAGE)['uImage.bin'])

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def file(self, suffix):
        paths = [p for p in self.rootfs.names() if p.endswith(suffix)]
        self.assertEqual(len(paths), 1, suffix)
        return self.rootfs.cat(paths[0])

    # Fact 1

    def test_the_library_names_every_keypad_code_once_and_the_names_are_distinct(self):
        table = library_names(self.file(LIBRARY))
        self.assertEqual(len(table), 43)
        names = dict(table[8:])  # the first eight are F1 to F8, a desktop keyboard's
        self.assertEqual([c for c, _ in table[:8]], list(range(59, 67)))
        self.assertEqual([names.get(c) for c, _ in KEYPAD], [n for _, n in KEYPAD])
        self.assertEqual(len({n for _, n in KEYPAD}), 27)
        self.assertEqual([names.get(c) for c, _ in HOME_CONTROL], [n for _, n in HOME_CONTROL])
        self.assertEqual((names.get(FAVORITES), names.get(HOME)), ('Favorites', 'Home'))
        # The negative: a code beside the table's finds nothing, so the lookup is not merely lenient.
        self.assertNotIn(117, dict(table))

    def test_the_six_codes_past_the_keypad_are_the_hops_remotes_keys(self):
        main = self.rootfs.cat(SCREENS + 'main.lua').decode()
        # By names: the one test of the skin, against 0x6F and 0x70, chooses the screens' folder.
        branch = re.search(r'^if skinId == 0x6F or skinId == 0x70 then[^\n]*\n(.*?)^else\n(.*?)^end', main, re.M | re.S)
        self.assertIsNotNone(branch)
        self.assertEqual(re.findall(r'"(\w+)/\?\.lua"', branch.group(1)), ['hops'])
        self.assertEqual(re.findall(r'"(\w+)/\?\.lua"', branch.group(2)), ['juniper'])
        hops_test = self.rootfs.cat(SCREENS + 'appscommon/tde/testhopsbutton.lua').decode()
        names = set()
        for which in ('bottomMenu', 'HCMenu', 'topMenu'):
            body = re.search(r'local %s = \{(.*?)\n\}' % which, hops_test, re.S).group(1)
            names |= set(re.findall(r'^\s*\{\s*"(\w+)"', body, re.M))
        hc = re.search(r'local HCMenu = \{(.*?)\n\}', hops_test, re.S).group(1)
        self.assertEqual(set(re.findall(r'^\s*\{\s*"(\w+)"', hc, re.M)), {n for _, n in HOME_CONTROL},
                         'a list of their own for the six')
        self.assertEqual(names, {n for _, n in KEYPAD} | {n for _, n in HOME_CONTROL} | {'Home', 'Favorites'})
        self.assertEqual(len(names), 35)
        juniper = [n for n in self.rootfs.names() if n.startswith(SCREENS + 'juniper/') and n.endswith('.lua')]
        self.assertEqual(len(juniper), 60, 'every screen a Touch runs, its settings screens included')
        named = [n for n, text in self.rootfs.each(juniper).items() if b'HomeControl' in text]
        self.assertEqual(named, [], 'no screen a Touch runs names a home control key')
        # One microcontroller firmware for every model, written with no test of the skin.
        start = self.rootfs.cat('etc/init.d/rcS.local').decode()
        msp430 = start.split('/dev/clearpad')[0]
        self.assertEqual(len(re.findall(r'msp430\.txt\W+/dev/mspfw', msp430)), 2)
        self.assertNotIn('skin', msp430)

    def test_the_factory_test_screen_lays_out_the_same_29_names(self):
        source = self.text[TEST_SCREEN]
        lists = {}
        for which in ('bottomMenu', 'topMenu'):
            body = re.search(r'local %s = \{(.*?)\n\}' % which, source, re.S).group(1)
            lists[which] = re.findall(r'^\s*\{\s*"(\w+)"', body, re.M)
        self.assertEqual((len(lists['bottomMenu']), len(lists['topMenu'])), (20, 9))
        self.assertEqual(set(lists['bottomMenu'] + lists['topMenu']),
                         {n for _, n in KEYPAD} | {'Home', 'Favorites'})
        self.assertEqual(lists['topMenu'][0], 'PowerOffActivity')

    def test_the_drawing_differs_from_the_firmware_in_two_spellings_only(self):
        drawn = drawing_names()
        self.assertEqual(len(drawn), 29)
        self.assertEqual({DRAWING_SPELLINGS.get(n, n) for n in drawn},
                         {n for _, n in KEYPAD} | {'Home', 'Favorites'})
        self.assertEqual(sorted(set(drawn) - {n for _, n in KEYPAD} - {'Home', 'Favorites'}), ['Dvr', 'Off'])

    # Fact 2

    def test_home_and_favorites_are_the_right_and_left_zones_of_the_touch_strip(self):
        module = self.file('/clearpad.ko')
        sections, _ = elf_sections(module)
        text_offset = sections['.text'][2]
        functions = elf_functions(module)
        for handler, wanted in STRIP.items():
            with self.subTest(handler=handler):
                value, size = functions[handler]
                body = words(module[text_offset + value:text_offset + value + size])
                for word in wanted['edge']:
                    self.assertIn(word, body)
                left, right = (body.index(w) for w in wanted['x'])
                self.assertLess(left, right)

                def last_key(span):
                    return [w for w in span if w in (MOV_R2_FAVORITES, MOV_R2_HOME)][-1]
                self.assertEqual(last_key(body[left:right]), MOV_R2_FAVORITES, 'low X presses Favorites')
                self.assertEqual(last_key(body[right:]), MOV_R2_HOME, 'high X presses Home')
                # The band between: past the second X comparison, the branch taken when neither zone
                # matched lands where no key code is loaded before the handler returns.
                exit_branch = next(i for i in range(right, right + 6) if body[i] >> 24 == 0x0A)
                offset = body[exit_branch] & 0xFFFFFF
                target = exit_branch + 2 + (offset - (1 << 24) if offset & 0x800000 else offset)
                self.assertGreater(target, exit_branch)
                self.assertFalse({MOV_R2_FAVORITES, MOV_R2_HOME} & set(body[target:]), 'the band presses nothing')
        # The product ids the probe chooses among, each named once.
        for product in (b'TM2176-003\0', b'Juniper-01\0', b'Hops-00001\0', b'Hops-00002\0'):
            self.assertEqual(module.count(product), 1, product)

    def handler_body(self, handler):
        module = self.file('/clearpad.ko')
        sections, _ = elf_sections(module)
        value, size = elf_functions(module)[handler]
        start = sections['.text'][2] + value
        return words(module[start:start + size])

    def test_the_strip_lies_past_the_top_row_of_the_display(self):
        juniper = self.handler_body('clearpad_irq_juniper01_work')
        edge = juniper.index(CMP_R8_320)
        self.assertIn(BGT_STRIP, juniper[edge + 1:edge + 5], 'a height past 320 leaves the display')
        self.assertIn(RSB_320, juniper, "the display's height is 320 less the sensor's")
        self.assertEqual(juniper[-1], 330, 'the strip starts past 330, the pool literal')
        tm2176 = self.handler_body('clearpad_irq_tm2176_work')
        for word in TM2176_FLIP:
            self.assertIn(word, tm2176)
        # The drawing library inverts a height for the resistive TPS6507x panel only, not for the Clearpad.
        library = words(self.file(LIBRARY))
        self.assertEqual(library.count(LIB_STR_Y_FLIP), 1)
        flip = library.index(LIB_STR_Y_FLIP)
        self.assertIn(LIB_MOV_R1_100, library[flip - 12:flip])
        clearpad = library.index(LIB_MOV_R3_240)
        self.assertNotIn(LIB_STR_Y_FLIP, library[clearpad - 16:clearpad + 16])
        # The screens' row 0 is the top of the face: the factory test draws the face's keys top down.
        top = menu_heights(self.text[TEST_SCREEN], 'topMenu')
        bottom = menu_heights(self.text[TEST_SCREEN], 'bottomMenu')
        self.assertEqual((len(top), len(bottom)), (9, 20))
        self.assertEqual(min(top, key=top.get), 'PowerOffActivity')
        self.assertEqual(top['Favorites'], max(top.values()))
        self.assertEqual(top['Home'], max(top.values()))
        self.assertEqual(min(bottom.values()), bottom['Exit'])
        self.assertEqual(sorted(bottom, key=bottom.get)[-4:], sorted(['Red', 'Green', 'Yellow', 'Blue'],
                                                                     key=bottom.get))

    def test_the_drawing_puts_the_star_and_the_house_inside_the_strip(self):
        juniper = self.handler_body('clearpad_irq_juniper01_work')
        strip, display = juniper[-1], 320
        left, right = 89, 150
        self.assertIn(0xE3590000 | left, juniper)
        self.assertIn(0xE3590000 | right, juniper)
        centres, (gx, gy, gw, gh) = drawing_mark_centres()
        placed = {}
        for name, (x, y) in centres.items():
            # Taking the glass as the display: pixels from its left edge, and the sensor height the
            # Juniper handler would read there, one unit a pixel and counting up past the top row.
            placed[name] = ((x - gx) * 240 / gw, display + (gy - y) * 320 / gh)
        for name, (px, raw) in placed.items():
            with self.subTest(mark=name):
                # The driver states no upper edge short of the sensor's reach, so there is none to test.
                self.assertGreater(raw, strip, 'inside the strip, past the top of the display')
        self.assertLessEqual(placed['Favorites'][0], left)
        self.assertGreater(placed['Home'][0], right)

    # Fact 3

    def test_the_screen_is_240_by_320_by_four_programs_and_the_codec_agrees(self):
        library = words(self.file(LIBRARY))
        pool = library.index(LIB_EVIOCGABS_X)
        self.assertEqual(library[pool + 1], LIB_EVIOCGABS_Y)
        self.assertEqual((library.count(LIB_MOV_R3_240), library.count(LIB_MOV_R3_320)), (1, 1))
        width, height = library.index(LIB_MOV_R3_240), library.index(LIB_MOV_R3_320)
        self.assertTrue(width < height < pool and height - width < 10, 'the Clearpad branch sets both')
        render = self.text[RENDER]
        self.assertEqual(re.findall(r'^SCREEN_WIDTH = (\d+)$', render, re.M), ['240'])
        self.assertEqual(re.findall(r'^SCREEN_HEIGHT = (\d+)$', render, re.M), ['320'])
        found = [m.start() for m in re.finditer(rb'ILl9341_240x320\0', self.kernel)]
        self.assertIn((240, 320), [struct.unpack_from('<HH', self.kernel, at + 26) for at in found])
        module = self.file('/clearpad.ko')
        sections, _ = elf_sections(module)
        value, size = elf_functions(module)['clearpad_irq_juniper01_work']
        start = sections['.text'][2] + value
        self.assertIn(RSB_320, words(module[start:start + size]))
        codec = (REPO / 'packages/codec/src/screens/render.ts').read_text()
        self.assertEqual(re.findall(r'^\s*17: \{ width: (\d+), height: (\d+) \},$', codec, re.M), [('240', '320')])

    # Fact 4

    def test_off_ends_the_activity_on_the_press(self):
        handler = top_level(self.text[INIT], r'^Render:addGlobalCallback\("keyPress"')
        branch = handler.split('"PowerOffActivity" then', 1)[1].split('\n\t\treturn\n\tend', 1)[0]
        self.assertIn('startActivity', branch)
        self.assertIn('ACTIVITY_STOPS', branch)
        # The control: the key release handler holds no such branch.
        release = top_level(self.text[INIT], r'^Render:addGlobalCallback\("keyRelease"')
        self.assertNotIn('"PowerOffActivity" then', release)

    def test_home_on_the_activity_list_goes_to_one_of_four_start_screens(self):
        # The start screen the activity names, where the screens can show it, and its commands otherwise:
        # the favourites, the number pad when the activity has one, the now playing screen when it has
        # speakers. The branch is taken only with one window showing, an activity running and the list
        # in front.
        home = top_level(self.text[INIT], r'^local function showHome\(')
        branch = home.split('currentWindow == "home"', 1)[1].split('\n\telseif', 1)[0]
        cases = re.findall(r'StartScreen == "(\w+)"(?: and Harmony:(\w+)\()?[^\n]*\n\t+Carousel:jumpTo\("(\w+)"\)', branch)
        self.assertEqual(cases, [('Favorites', '', 'favorites'), ('Numpad', 'hasNumpad', 'numpad'),
                                 ('Nowplaying', 'hasSpeakers', 'nowplaying')])
        self.assertEqual(re.findall(r'\telse\n\t+Carousel:jumpTo\("(\w+)"\)', branch), ['activitycommands'])
        self.assertIn('getCurrentActivity', home)

    def test_the_init_table_maps_ctrl_alt_del_to_a_reboot(self):
        inittab = self.rootfs.cat('etc/inittab').decode()
        self.assertEqual(re.findall(r'^::ctrlaltdel:(.*)$', inittab, re.M), ['/sbin/reboot'])

    # Fact 5

    def test_the_key_combinations_and_the_factory_flag_the_image_lacks(self):
        init = self.text[INIT]
        table = re.search(r'^local buttonBitmap = \{(.*?)\n\}', init, re.M | re.S).group(1)
        weights = {k: int(v) for k, v in re.findall(r'^\t(\w+) = (\d+),', table, re.M)}
        self.assertEqual(len(weights), 12, 'eleven keys and the desktop debug key')
        self.assertEqual(weights['Menu'] + weights['VolumeMute'], 384)
        self.assertEqual(weights['Record'] + weights['PrevChannel'], 1536)
        self.assertEqual(weights['FastForward'] + weights['Stop'] + weights['VolumeUp'], 7)
        self.assertEqual(weights['FastForward'] + weights['Stop'] + weights['Blue'], 67)
        self.assertEqual(weights['FastForward'] + weights['Stop'] + weights['Red'], 11)
        self.assertEqual(weights['FastForward'] + weights['Stop'] + weights['Green'], 19)
        handler = top_level(init, r'^Render:addFilterCallback\("keyPress"')
        combos = [(int(m.group(1)), m.start()) for m in re.finditer(r'\bcombo == (\d+)\b', handler)]
        self.assertEqual([c for c, _ in combos], [384, 1536, 7, 67, 11, 19])
        gate = handler.index('tdeEnable()')
        self.assertEqual([c for c, at in combos if at < gate], [384, 1536], 'the two that need no flag')
        self.assertIn('settings/pairing.lua', handler[combos[0][1]:combos[1][1]])
        self.assertIn('PLACE_IN_CRADLE_SETUP', top_level(init, r'^local function pushSetupModeScreen\('))
        self.assertIn('/etc/tdeenable', top_level(init, r'^local function tdeEnable\('))
        self.assertNotIn('etc/tdeenable', self.rootfs.names())

    def test_keys_are_dropped_while_syncing_unprovisioned_on_link_loss_and_while_starting(self):
        handler = top_level(self.text[INIT], r'^Render:addGlobalCallback\("keyPress"')
        cleared = re.search(r'^\tignoreKeyPress = false', handler, re.M).start()
        for condition in ('isSyncInProgress', 'isProvisioned', '"linkloss"', 'isStartingActivity'):
            self.assertLess(handler.index(condition), cleared, condition)

    # Fact 6

    def test_the_charging_screen_is_for_the_dock_and_the_adapter_and_usb_gets_the_usb_screen(self):
        init = self.text[INIT]
        battery = top_level(init, r'^local function checkBattery\(')
        charging = battery.index('"ICON_BATTERY_CHARGING"')
        self.assertEqual(battery.count('"ICON_BATTERY_CHARGING"'), 1)
        self.assertLess(battery.index('"cradle"'), charging)
        self.assertLess(battery.index('"wall_adapter"'), charging)
        self.assertGreater(battery.index('"usb"'), charging, 'usb is not among the charging sources')
        self.assertEqual(re.findall(r'\bbatteryVbat < ([\d.]+)', battery), ['3.55'])
        low = battery.index('"ICON_BATTERY_LOW"')
        off = battery.index('/sbin/poweroff')
        self.assertEqual(re.findall(r'addTimer\((\d+)', battery[low:off]), ['10000'])
        self.assertEqual(re.findall(r'\bbattcharge > ([\d.]+)', battery), ['0.3'])
        self.assertLess(battery.index('battcharge >'), battery.index('"ICON_BATTERY_FULL"'))
        window = top_level(init, r'^local function openChargingWindow\(')
        self.assertEqual(re.findall(r'addTimer\((\d+)', window), ['10000'])
        self.assertIn('suspendTimeout', window[window.index('addTimer'):])
        # Charging is marked in the dock and adapter branch alone, and cleared on battery and on full.
        self.assertEqual(len(re.findall(r'batteryCharging = true', battery)), 1)
        self.assertLess(battery.index('"wall_adapter"'), battery.index('batteryCharging = true'))
        self.assertLess(battery.index('batteryCharging = true'), charging)
        self.assertEqual(init.count('batteryCharging = true'), 1, 'set nowhere else')
        # usb is matched as a pattern, which usb_charge also matches.
        self.assertRegex(battery, r'\bmatch\(\s*batterySource\s*,\s*"usb"')
        self.assertNotIn('usb_charge', self.text[STYLE])
        power = top_level(init, r'^local function updatePowerState\(')
        usb = power.index('"usb"')
        self.assertLess(usb, power.index('appscommon/instructions.lua'))
        self.assertLess(power.index('appscommon/instructions.lua'), power.index('"sync"'))

    def test_the_status_bar_steps_through_three_white_pictures_and_red_is_the_low_battery_screen(self):
        style = self.text[STYLE]
        images = re.search(r'local powersourceImages = \{(.*?)\n\}', style, re.S).group(1)
        self.assertEqual(re.findall(r'(\w+) = BATTERY_IMAGE_PATH \.\."(\w+\.png)"', images),
                         [('usb', 'charging.png'), ('cradle', 'charging.png'), ('wall_adapter', 'charging.png')])
        self.assertEqual(re.findall(r'BATTERY_IMAGE_PATH \.\."(level\d+\.png)"', images),
                         ['level100.png', 'level50.png', 'level25.png'])
        self.assertEqual(re.findall(r'^local BATTERY_IMAGE_PATH = "([^"]+)"', style, re.M), ['appscommon/asset/header/'])
        header = top_level(style, r'^\tlocal function updateHeaderCallback\(').split('-- update clock')[0]
        # The voltage below which each picture is chosen, and its place in the list of three.
        self.assertEqual(re.findall(r'power\.vbat < ([\d.]+) then\s+imageIndex = (\d)', header),
                         [('3.7', '3'), ('3.85', '2')])
        # One near white and nothing else in each, and fewer of its pixels the emptier the battery.
        for picture, pixels in (('level100.png', 153), ('level50.png', 118), ('level25.png', 83),
                                ('charging.png', 75)):
            with self.subTest(picture=picture):
                found = png_colours(self.rootfs.cat(HEADER + picture))
                self.assertEqual(found, {NEAR_WHITE: pixels})
                self.assertEqual(coloured(found), 0)
        # The control: the decoder sees red where there is red, 299 of the low battery picture's 2053, and
        # every one of its coloured pixels is red, its red channel more than 30 above both others.
        found = png_colours(self.rootfs.cat(LOW_BATTERY_PICTURE))
        self.assertEqual((coloured(found), sum(found.values())), (299, 2053))
        self.assertEqual(sum(n for (r, g, b), n in found.items() if r > g + 30 and r > b + 30), 299)
        battery = top_level(self.text[INIT], r'^local function checkBattery\(')
        self.assertIn('notification/lowbattery.png', battery)

    def test_no_touch_screen_names_the_red_or_low_battery_header_pictures(self):
        screens = [p for p in self.rootfs.names()
                   if p.endswith('.lua') and p.startswith((SCREENS + 'juniper/', SCREENS + 'appscommon/'))]
        hops = [p for p in self.rootfs.names() if p.endswith('.lua') and p.startswith(SCREENS + 'hops/')]
        text = self.rootfs.each(screens)
        for picture in ('header/red.png', 'header/low-battery.png'):
            self.assertEqual([p for p, b in text.items() if picture.encode() in b], [], picture)
        # The control: another skin's screens do name one of them, so the search can find it.
        self.assertTrue(any(b'header/red.png' in b for b in self.rootfs.each(hops).values()))

    def test_a_change_of_power_source_wakes_the_screen(self):
        init = self.text[INIT]
        watcher = init[init.index('Render:addGlobalCallback("sysfs"'):]
        watcher = watcher[:watcher.index('\nend)')]
        self.assertIn('powersource', watcher)
        self.assertLess(watcher.index('Render:wakeup()'), watcher.index('updatePowerState('))

    # Fact 7

    def test_the_remotes_own_sliders(self):
        timeout = self.text[TIMEOUT]
        self.assertEqual(re.findall(r'^local min, max = (\d+), (\d+)$', timeout, re.M), [('1', '30')])
        self.assertIn('SETTINGS_TIMEOUT_SEC', timeout)
        brightness = self.text[BRIGHTNESS]
        self.assertEqual(constant(brightness, 'WARNING_LEVEL'), 95)
        self.assertEqual(re.findall(r'Slider:new\(\{[^}]*\bmax=(\d+)', brightness), ['100'])
        self.assertEqual(re.findall(r'"(SETTINGS_\w*BRIGHTNESS)"[^}]*\bmin=(\d+)', brightness),
                         [('SETTINGS_BRIGHTNESS', '10'), ('SETTINGS_KEYBRIGHTNESS', '10')])
        self.assertEqual(len(re.findall(r'> WARNING_LEVEL\b', brightness)), 2, 'on drag and on release')
        self.assertIn('SETTINGS_BRIGHTNESS_MESSAGE', brightness)
        settings = self.text[SETTINGS]
        for probe, entry in (('hasHaptic', 'SETTINGS_HAPTIC'), ('hasAccel', 'SETTINGS_ACCEL')):
            self.assertLess(settings.index(probe), settings.index(entry), entry)
        init = self.text[INIT]
        self.assertEqual((constant(init, 'MAX_LCD_BRIGHTNESS'), constant(init, 'MAX_KEY_BRIGHTNESS')), (26, 42))
        self.assertIn('/sys/class/backlight/ap3156_backlight/', init)
        self.assertIn('/sys/class/leds/tps6507x:white/', init)

    # Fact 8

    def test_the_gesture_recogniser_constants(self):
        gesture = self.text[GESTURE]
        self.assertEqual([constant(gesture, n) for n in ('GESTURE_THRESHOLD', 'HOLD_TIMEOUT', 'DOUBLE_TAP_TIMEOUT')],
                         [60, 700, 300])
        self.assertEqual(sorted(set(re.findall(r'"(Swipe\w+)"', gesture))),
                         ['SwipeDown', 'SwipeLeft', 'SwipeRight', 'SwipeUp'])
        self.assertEqual(gesture.count('"DoubleTap"'), 1)
        self.assertEqual(gesture.count('"Hold"'), 2, 'a held tap and a held swipe')

    def test_the_gesture_recogniser_is_attached_to_the_gesture_pad_and_the_lock_screen_only(self):
        # Every screen file a Touch can load: all but the Hops remotes' own and the library's examples.
        screens = [n for n in self.rootfs.names() if n.startswith(SCREENS) and n.endswith('.lua')
                   and not n.startswith((SCREENS + 'hops/', SCREENS + 'examples/'))]
        attached = []
        for name, text in sorted(self.rootfs.each(screens).items()):
            for argument in re.findall(r'addBehaviour\(Gesture(?:, (\d+))?\)', text.decode('utf-8', 'replace')):
                attached.append((name[len(SCREENS):], argument))
        self.assertEqual(attached, [('juniper/gesturepad.lua', ''), ('juniper/init.lua', '150')])
        gesture = self.text[GESTURE]
        self.assertIn('self.threshold or GESTURE_THRESHOLD', gesture)
        press = top_level(gesture, r'^local function pressCallback\(')
        release = top_level(gesture, r'^local function SwipeRelease\(')
        for timer in ('HOLD_TIMEOUT', 'DOUBLE_TAP_TIMEOUT'):
            self.assertIn(timer, press)
            self.assertNotIn(timer, release)

    def test_settings_and_devices_are_entries_of_the_menu_at_the_foot_of_the_activity_list(self):
        self.assertIn('Carousel:addPage("home", win1)', self.text[INIT])
        self.assertIn('/activity.lua")', self.text[INIT][:self.text[INIT].index('Carousel:addPage("home"')])
        listing = self.text[ACTIVITY_LIST]
        entries = re.search(r'^local menuEntries = \{(.*?)\n\}', listing, re.M | re.S).group(1)
        self.assertEqual(re.findall(r'^\t(\w+) = ', entries, re.M), ['help', 'devices', 'settings', 'edit', 'sleepTimer'])
        footer = re.search(r'^local footerList = \{(.*?)\n\}', listing, re.M | re.S).group(1)
        self.assertEqual(len(re.findall(r'^\t\S', footer, re.M)), 3)
        self.assertIn('newMenuButton(menuEntries)', footer.strip().splitlines()[-1], 'the right hand button')
        menu = re.search(r'^local menuList = \{(.*?)\n\}', self.text[STYLE], re.M | re.S).group(1)
        targets = dict(re.findall(r'^\t(\w+) = \{[^}]*?appName \.\. "/(\w+)\.lua"', menu, re.M))
        self.assertEqual((targets['devices'], targets['settings']), ('devicemode', 'settings'))

    # Fact 9

    def test_device_mode_lasts_while_the_devices_screen_is_active(self):
        mode = self.text[DEVICE_MODE]
        active = mode[mode.index('deviceCommandListGroup:addCallback("windowActive"'):]
        inactive = active.index('deviceCommandListGroup:addCallback("windowInactive"')
        after = active.index('addCallback(', inactive + len('deviceCommandListGroup:addCallback('))
        self.assertEqual(re.findall(r'setCurrentDevice\((\w+)\)', active[:inactive]), ['deviceId'])
        self.assertEqual(re.findall(r'setCurrentDevice\((\w+)\)', active[inactive:after]), ['0'])
        self.assertIn('cursorWindow', active[inactive:after])
        # The device list's own screen drops the device as well.
        listing = mode[mode.index('local function checkForUpdatesDeviceMode('):]
        self.assertEqual(re.findall(r'setCurrentDevice\((\w+)\)', listing[:listing.index('\nend')]), ['0'])
        fire = top_level(self.text[INIT], r'^local function fireIr\(')
        self.assertLess(fire.index('devId > 0'), fire.index('getDeviceHardButton'))
        self.assertLess(fire.index('getDeviceHardButton'), fire.index('getHardButton(activityId'))


if __name__ == '__main__':
    unittest.main()
