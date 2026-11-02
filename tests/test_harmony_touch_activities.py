#!/usr/bin/env python3
"""What the Harmony Touch's firmware does with an activity and a button map, as far as the image itself can
show it: which screens run, which fields the engine never reads, how long a long press is, and where the
delays are converted.

**The question.** `todo-touch.md` 3.1 asked what the remote does with every field of the two documents that
describe activities and button maps, `ActivityList` and `MapList`, which the remote fetches as JSON through
the computer (`reference/architectures/harmony-touch/usb.md`). Two programs read them, and they read them
differently: the engine, compiled Lua under `opt/luaworks`, parses both once into its own tables and sends
the commands; the screens, Lua source under `opt/luadraws`, read the JSON themselves, decide what to show
and what a touch means, and then ask the engine to press a button by a map identifier and a button name.

**Where the reading was done, and what this file can hold of it.** The walk from a key press to a command,
the start and stop order of an activity, the role and order rules, and the search for fields nobody reads
were done in the lab's decompiled engine and the screens' source. A decompiled engine is not a fixture here,
so this file asserts only what the image shows directly: string constants, number constants and local
names per compiled function, read by `prototypes` below, and the screens' own source. The rest of the
reading is stated here as the argument and carries "Read in the firmware" on the reference page, which is
`reference/architectures/harmony-touch/activities-and-buttons.md`. What the documents hold is measured in
`packages/usb/test/touch-activities.test.ts`.

## What was read, and what of it this file asserts

1. **The Touch runs the `juniper` screens.** The screens' start script picks the `hops` tree only for
   skins `0x6F` and `0x70` and `juniper` otherwise; the Touch is skin `0x63` (`touch_sysinfo`, asserted in
   `test_harmony_touch_image.py`). Asserted: the skin values the branch names.
2. **A press names a map by `16417`, and `16417` is the screens' own identifier**, the constant they put
   in every button request. The engine builds `16417Device<id>` in device mode, `16417Activity<id>` while
   an activity runs and `16417Root` otherwise, and returns at once when the identifier is not a loaded map:
   the code after that return, which retries without the prefix, is unreachable. The screens' own lookup,
   a separate function that finds a map in the document to draw its lists, accepts either form; the two
   statements are about two programs and do not disagree. Asserted: the constant's value; the one engine function that takes a press by
   `equadId` and has a number pad table holds the strings `Device`, `Activity`, `Root` and `buttonMaps`.
   A second function holds `numPadButtons`, the keyboard map of the hub's identifier `16420`.
3. **The engine's reader takes a key by `ButtonKey`, a screen entry by `MenuItem.IndexInMenu`, keeps
   `FunctionGroupType` 2 in a table of its own (`numPadButtons`), reads the long and double press
   actions and the sequences, and never reads `ButtonState`, `TextOnRemote`, `MenuItem.MenuName`,
   `ButtonImageKey` or `ButtonImagePath`.** Asserted over the reader's string constants, and over every one
   of the 172 engine files for all five names. **The screens handle those five**: they read `ButtonState`
   and `TextOnRemote`, write `ButtonState` themselves, 1 on a button they build, 2 on one added to a list,
   3 on one changed or moved and 4 on one removed, and hide an entry at 4 in several screens; they write
   `MenuName` on an entry they create and `ButtonImageKey` on a gesture they create or change and read
   neither; and they test `ButtonImagePath` before drawing an icon with a comparison that is always false,
   so it never takes effect. Asserted: which screen files name `MenuName`, `ButtonImageKey` and
   `ButtonImagePath`, each the `juniper` file and its `hops` twin. That the comparison is always false is
   read in the source and not asserted. `IsDefault` is named in no Lua file of either program and
   `ImageId` in none of the screens', both asserted; the engine holds `ImageId` only inside the name of
   a function about picture addresses, and a font library is the only other file holding `IsDefault`.
4. **A long press waits 550 ms.** On press the engine records the time and sends nothing for a key with a
   long press; the screens report a hold every 300 ms from the press; the long press fires on the first
   hold report at least 550 ms after the press, about 600 ms in practice, and a release before that sends
   the short action once. The waiting itself is the decompiled reading.
   A key with no long press sends each hold to the infrared sender as a heartbeat. Asserted: exactly one
   compiled function of `apihandler/activity.lua` holds the number 550, and it also holds `longActions`,
   `sendHeartBeat` and `tomillis` and a local named `elapsed`; and the only timer the screens' button
   function starts is 300 ms.
5. **Both delays an activity or a sequence states are multiplied by 1000 and the power on delay of a role
   is not.** `DelayActivityAction.Duration` and `ButtonDelayAction.Duration` become a wait of `Duration *
   1000`; `NextDevicePowerOnDelay` is passed on as it is. The multiplication is the decompiled reading; the
   seconds are the measurement of `touch-activities.test.ts`, whose account entered whole seconds. Asserted: the reader's functions that hold
   `Duration` and a delay action's name are exactly two, one per name, each holds 1000, and the function
   that holds `NextDevicePowerOnDelay` holds no 1000. A third function holds `Duration`, the device
   list's own infrared actions, and names neither.
6. **One function of the engine starts and stops an activity, and it reads all four of an activity's
   step lists**: the new activity's power on steps with their delays, the old activity's end steps, sent
   first as their own list when they are not power offs, its power offs, appended after the new power ons
   and skipped for a device the new activity powers or a device kept on between activities, then the
   input steps, all through one scheduler, then the start steps. Asserted: one function holds
   `powerActions`, `nextDelayActions`, `leaveActions`, `inputActions`, `enterActions` and
   `OnBetweenActivities`. The order itself is the decompiled reading and is not asserted, since the
   strings of a function do not state an order.
7. **Fields of the two documents that no program on the image names.** Searched as bytes in every file
   of the root filesystem, the compiled engine and the native programs included: `DateCreated`,
   `DateModified`, `DefaultStation`, `SurfaceId-`, `RemoteId-`, `ButtonMapId-` and `ImageId-` occur only
   in the sample documents the screens carry under `appscommon/test/data/`, and `ImageId-` and
   `DefaultStation` nowhere at all; `IsDefault` occurs in no Lua file. **This corrects the lab note**,
   which said several of them occur nowhere on the root filesystem: the sample documents hold them. The
   rest of the fields the reference lists as unread have names a byte search cannot settle (`Id`,
   `State`, `Order`, `EventType` among them) and rest on the decompiled reading alone.

**Negative results recorded.** The search for indirect access covered the reader's dispatch, which finds
a type by `string.find` on `__type`, and concatenated keys; none reaches the unread fields. `EventType` is
read by the engine only for home control and program actions. `ButtonDoublePressAction` is read into the
engine and used only for home control rocker keys; a double tap on a gesture is the screens' doing.

**The controls.** Each closure was broken once by hand and its test failed alone: the skin branch
asserted not to name `0x6F`, the long press searched for 551, the timer for 301, `ButtonKey` added to the
unread names and to the names no engine file holds, the power on delay's function swapped for the
activity delay's, and `ButtonImageKey` looked for in the wrong screen file.

**Sources checked first.** `reference/architectures/harmony-touch/` and `reference/remotes/harmony-touch/`,
`reference/logitech/data-model/model.md` and `entities.md` for Logitech's schema, `docs/findings.md`
sections 196 to 203, `test_harmony_touch_image.py` for the image's layout, and Logitech's own client only
through the data model, since the question is what the remote does and the client only hands it the
documents. The lab register's row for the firmware folder was read before the decompiled tree.

**Width.** One firmware build, production 4.15.330 for skin 99; the image is the same for every skin its
descriptor names, so what it holds holds for each of them, while which screens run is per skin and is
asserted for the Touch's. Nothing here is checked on any other build.

**Standing.** Read in the firmware. Nothing in this file quotes Logitech's code: it asserts names, numbers
and counts.
"""
import os
import re
import shutil
import struct
import tempfile
import unittest

import lab
from test_harmony_touch_image import SquashfsReader, members

IMAGE = 'touch_package_production'
UNSQUASHFS = shutil.which('unsquashfs')

ENGINE = 'opt/luaworks/'
READER = ENGINE + 'tasks/harmonyengine/loader/userconfigreader.lua'
ACTIVITY_API = ENGINE + 'tasks/harmonyengine/apihandler/activity.lua'
SCREENS = 'opt/luadraws/'
SAMPLE_DOCUMENTS = SCREENS + 'appscommon/test/data/'

#: Fields the reference lists as read by nothing, which a byte search can settle.
UNREAD_NAMES = ['DateCreated', 'DateModified', 'DefaultStation', 'SurfaceId-', 'RemoteId-', 'ButtonMapId-',
                'ImageId-']
#: Of those, the ones no file holds at all, sample documents included.
NOWHERE = ['DefaultStation', 'ImageId-']


def prototypes(chunk):
    """Every function of a compiled Lua 5.1 chunk, each as its constants and its local names.

    The layout is the stock one `stock_51_length` in `test_harmony_touch_image.py` walks, which that file
    shows every engine file follows to its last byte; this walk keeps what the other one skips. A string
    constant is bytes without its terminating NUL, a number a float.
    """
    at = 12
    out = []

    def take(fmt):
        nonlocal at
        value = struct.unpack_from(fmt, chunk, at)[0]
        at += struct.calcsize(fmt)
        return value

    def string():
        nonlocal at
        size = take('<I')
        value = chunk[at:at + size].rstrip(b'\0')
        at += size
        return value

    def prototype():
        nonlocal at
        string()                        # source name
        take('<i'); take('<i')          # first and last line
        at += 4                         # upvalues, parameters, vararg flag, stack size
        count = take('<i')
        at += 4 * count                 # instructions
        constants = []
        for _ in range(take('<i')):
            tag = take('<B')
            if tag == 1:
                constants.append(bool(take('<B')))
            elif tag == 3:
                constants.append(take('<d'))
            elif tag == 4:
                constants.append(string())
            elif tag == 0:
                constants.append(None)
            else:
                raise ValueError('constant tag %d is not stock Lua 5.1' % tag)
        function = {'constants': constants, 'locals': []}
        out.append(function)
        for _ in range(take('<i')):
            prototype()
        count = take('<i')
        at += 4 * count                 # line information
        for _ in range(take('<i')):
            function['locals'].append(string())
            take('<i'); take('<i')
        for _ in range(take('<i')):
            string()

    prototype()
    if at != len(chunk):
        raise ValueError('the walk stopped at %d of %d bytes' % (at, len(chunk)))
    return out


def strings_of(functions):
    return {c for f in functions for c in f['constants'] if isinstance(c, bytes)}


@unittest.skipUnless(UNSQUASHFS, 'unsquashfs is not installed')
class TheImage(unittest.TestCase):
    """Facts 1 to 7 of the header, out of the production root filesystem."""

    @classmethod
    def setUpClass(cls):
        lab.require(IMAGE)
        cls.tmp = tempfile.TemporaryDirectory()
        cls.reader = SquashfsReader(members(IMAGE)['harmony-image.squashfs'], cls.tmp.name)
        names = cls.reader.names()
        cls.files = {}
        # In slices, so no one command line grows with the image.
        for at in range(0, len(names), 200):
            cls.files.update(cls.reader.each(names[at:at + 200]))
        cls.engine = {p: d for p, d in cls.files.items() if p.startswith(ENGINE) and p.endswith('.lua')}

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_the_touch_runs_the_juniper_screens_and_hops_is_for_two_other_skins(self):
        start = self.files[SCREENS + 'main.lua'].decode()
        branch = re.findall(r'^if skinId == (0x[0-9A-Fa-f]+) or skinId == (0x[0-9A-Fa-f]+) then', start, re.M)
        self.assertEqual(branch, [('0x6F', '0x70')])
        self.assertNotIn(0x63, [int(v, 16) for v in branch[0]])
        self.assertIn('"juniper/"', start)

    def test_the_screens_identify_themselves_as_16417_and_the_engine_press_function_names_the_three_map_kinds(self):
        screens = self.files[SCREENS + 'appscommon/harmony.lua'].decode()
        self.assertEqual(re.findall(r'\bJUNIPER_EQUADID\s*=\s*"(\d+)"', screens), ['16417'])
        press = [f for f in prototypes(self.engine[ACTIVITY_API])
                 if b'numPadButtons' in f['constants'] and b'equadId' in f['constants']]
        self.assertEqual(len(press), 1, 'one function looks up a pressed button by its identifier')
        for name in (b'equadId', b'Device', b'Activity', b'Root', b'buttonMaps', b'buttons'):
            self.assertIn(name, press[0]['constants'], name)

    def test_the_reader_names_what_it_reads_and_no_engine_file_names_five_fields_the_screens_handle(self):
        read = strings_of(prototypes(self.engine[READER]))
        for name in (b'ButtonMapIdentifier', b'ButtonKey', b'IndexInMenu', b'FunctionGroupType', b'numPadButtons',
                     b'ButtonLongPressAction', b'ButtonDoublePressAction', b'Sequences', b'PowerOnOrder',
                     b'PowerOffOrder', b'ActionOrder', b'ActivityGroup', b'Zones'):
            self.assertIn(name, read, name)
        for name in (b'MenuName', b'ButtonImagePath', b'StartScreen'):
            self.assertNotIn(name, read, name)
        self.assertEqual(len(self.engine), 172)
        for name in (b'ButtonState', b'TextOnRemote', b'MenuName', b'ButtonImageKey', b'ButtonImagePath'):
            self.assertEqual([p for p, d in self.engine.items() if name in d], [], name)
        for name in (b'ButtonState', b'TextOnRemote'):
            # The negative: the screens do name both, so the search can find them where they are.
            for screen in ('juniper/style.lua', 'juniper/activitycommands.lua'):
                self.assertIn(name, self.files[SCREENS + screen], (name, screen))

    def test_550_is_a_constant_of_one_engine_function_beside_the_long_press_names_and_the_button_timer_is_300(self):
        functions = prototypes(self.engine[ACTIVITY_API])
        holding = [f for f in functions if 550.0 in f['constants']]
        self.assertEqual(len(holding), 1)
        for name in (b'longActions', b'sendHeartBeat', b'tomillis'):
            self.assertIn(name, holding[0]['constants'], name)
        self.assertIn(b'elapsed', holding[0]['locals'])
        screens = self.files[SCREENS + 'appscommon/harmony.lua'].decode()
        body = screens.split('\nfunction buttonControl(', 1)[1].split('\nfunction ', 1)[0]
        self.assertEqual(re.findall(r'addTimer\((\d+)', body), ['300'])

    def test_1000_is_a_constant_of_both_delay_readers_and_not_of_the_role_reader(self):
        functions = prototypes(self.engine[READER])
        delays = (b'DelayActivityAction', b'ButtonDelayAction')
        timed = [f for f in functions if b'Duration' in f['constants'] and any(n in f['constants'] for n in delays)]
        self.assertEqual(len(timed), 2)
        self.assertEqual(sorted(n for f in timed for n in delays if n in f['constants']), sorted(delays))
        for f in timed:
            self.assertIn(1000.0, f['constants'])
        roles = [f for f in functions if b'NextDevicePowerOnDelay' in f['constants']]
        self.assertEqual(len(roles), 1)
        self.assertNotIn(1000.0, roles[0]['constants'])

    def test_one_engine_function_names_all_four_step_lists_of_an_activity(self):
        names = (b'powerActions', b'nextDelayActions', b'leaveActions', b'inputActions', b'enterActions',
                 b'OnBetweenActivities')
        starting = [f for f in prototypes(self.engine[ACTIVITY_API]) if all(n in f['constants'] for n in names)]
        self.assertEqual(len(starting), 1)

    def test_seven_unread_field_names_occur_only_in_the_screens_sample_documents(self):
        for name in UNREAD_NAMES:
            holders = [p for p, d in self.files.items() if name.encode() in d]
            self.assertEqual([p for p in holders if not p.startswith(SAMPLE_DOCUMENTS)], [], name)
            self.assertEqual(holders == [], name in NOWHERE, name)
        lua = {p: d for p, d in self.files.items() if p.endswith('.lua')}
        self.assertEqual([p for p, d in lua.items() if b'IsDefault' in d], [])
        self.assertEqual([p for p, d in lua.items() if b'ImageId' in d and p.startswith(SCREENS)], [])
        # The negative: a name the engine does read is found by the same search, outside the samples.
        self.assertTrue([p for p, d in self.files.items() if b'ButtonKey' in d and not p.startswith(SAMPLE_DOCUMENTS)])

    def test_the_screens_name_menuname_buttonimagekey_and_buttonimagepath_in_one_file_each(self):
        screens = {p: d for p, d in self.files.items() if p.startswith(SCREENS) and p.endswith('.lua')}
        for name, file in (('MenuName', 'activitycommands.lua'), ('ButtonImageKey', 'gesturepad.lua'),
                           ('ButtonImagePath', 'style.lua')):
            holders = sorted(p for p, d in screens.items() if name.encode() in d)
            self.assertEqual(holders, [SCREENS + 'hops/' + file, SCREENS + 'juniper/' + file], name)


if __name__ == '__main__':
    unittest.main()
