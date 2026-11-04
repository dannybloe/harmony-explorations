#!/usr/bin/env python3
"""What a Harmony Touch acts on that neither of Logitech's clients lets a person set, read in the production
image, 4.15.330, and in MyHarmony's and Harmony Desktop's code.

**The question.** `todo-touch.md` 5.1: every field the remote's engine and screens read, set against what
MyHarmony and Harmony Desktop let a person set, so that what is left over is a list of what FreeHarmony
could offer beyond Logitech's software. A field read is not a feature, so each item left over was checked
for what the remote does with it, and a field read and then ignored is excluded. Out of scope is fixed
firmware behaviour that no document changes, home control (a hub's) and firmware update. The page is
`reference/remotes/harmony-touch/features.md`, "Beyond Logitech's software".

**How it was read.** Three readings, one per document family (devices; activities and button maps;
favourites, settings and pictures), each field in four columns: what the remote does with it, whether
MyHarmony sets it, whether Harmony Desktop does, and whether the remote's own screens do. Then a review of
the three against their cited lines, which re-read most of them and made searches the readings had not,
and a blind re-reading of seven headline claims by an agent that saw neither the readings nor the
reference. The blind reading agreed on all seven; the review let every item stand, eight of them with a
correction. All of it is in the lab beside the engine's decompiled source, `todo-touch.md` 5.1.

**What is asserted here, and what is the lab's reading.** The screens ship as Lua source in the image, so
what they do is asserted against the image. The engine ships compiled, and what it does is the lab's
reading of it decompiled (`todo-touch.md` 1.3.1); the engine items below are that reading, and what is
asserted of them is only that the compiled files the reading cites carry each field's name. MyHarmony's and Harmony Desktop's code are in the lab, and what is asserted of them is where a
field's name occurs at all, with a control on each side, since a search that finds nothing proves only as
much as a search that can find something.

**The client side, measured.** MyHarmony is decompiled per assembly. Its data contracts are the assemblies
named `Web.Data.*`, the generated proxy and the service model; its screens are the task assemblies,
`Web.MartiniWeb.Tasks.*`. A field the client lets a person set occurs in a task assembly, and the control
holds: `PressMinRepeats`, `FixedDigits`, `PowerOnDelay`, `InterKeyDelay`, `ButtonLongPressAction` and
`BackgroundImage` all do, the last in the remote settings task, which picks a Touch's background.
`GestureRemoteButton`, `ConnectedAppPowerOnDelay`, `GreaterTenActions` and `GreaterHundredActions` occur in
the data contracts and in no task assembly, so the client carries them and no screen sets them. The eleven
gesture event names, `PowerOnSetType` and `PowerOffSetType` occur nowhere. **Of the Touch's eleven settings
both clients set the two background rows and nothing else; the other nine names occur nowhere in
MyHarmony**, which a first draft of this file stated of all eleven until its own control on the background
failed: its dashboard has a remote settings page, offered because the
Touch's product record lists that capability, and the page edits rows named `GlowTime`, `TiltSensor` and
`RemoteAssistant` only, none of which a Touch's settings document holds. Harmony Desktop, one minified
file, names none of the gesture events, none of those nine settings, no connected app delay, no power set
type and no greater than ten actions, while it does name `PressMinRepeats`, `FixedDigits`, `InterKeyDelay`,
`ButtonLongPressAction` and both background rows. Its backlight page writes the first two settings rows by position and its
template offers that page on another family's branch only, which the review read and this file does not
assert.

**The screens, asserted.** The remote's own sliders stop short of what a document can carry: brightness and
key brightness start at 10, the timeout runs 1 to 30. The timeout from a document is multiplied by 1000 and
handed to the suspend timer with no clamp, and the lock screen uses half of it. The edit lock locks the
Remote, Devices and Activities menus and not its own entry. Eleven gesture events land on five gesture
buttons, the four swipes and tap, the held forms and the double tap as that button's long and double
press actions. An empty `HapticEffect` row reads as the text `nil`, since the value is made a string
before the check that would fall back to `"13"`. Every value of `UserImages` is fetched, with its twin.
That the key light turns off below 5 is asserted in `tests/test_harmony_touch_favourites.py`, and so are
the defaults and the rule that a change on the remote adds no row.

**The engine, the lab's reading.** Items the review let stand, with what each needs:

* A command's code and its protocol family are whatever the documents say; a person gets them only from
  Logitech's database, from Logitech's analysis of a learned code, or from learning. What is left over is
  a family or a value of one's own.
* `ConnectedAppPowerOnDelay` replaces an activity's input delay when its input is flagged online; zero
  counts.
* Channel tuning's start actions and its greater than ten and greater than hundred actions; neither client
  sets them (the full sync recorded holds one start action naming an empty command, which sends nothing).
* A timed press (`Duration`) on a step other than a power step.
* `PowerOnSetType` and `PowerOffSetType`, which change only what Help resends in its first stage.
* A device's internal states, which is modelling a device rather than a setting.
* A long press on a screen entry: the engine fires a long action for any button that has one, by the time
  held, and the screens send a hold every 300 ms while an entry is held. Pieced together from several
  places and never exercised, and an entry bound to a sequence sends no holds.
* A sequence in a device's own map: the engine resolves a sequence against the map it belongs to, so a key
  in device mode would run it. Never exercised.
* A key or screen entry inside an activity's or a device's map that starts an activity; the clients set
  that on the root map only.
* An activity hidden by a negative `ActivityOrder`, which also makes it unfindable by id for the screens.
* Favourites on more than one activity, a channel number holding `.` or `-`, and more than five user
  backgrounds, each needing two pictures served.

**Excluded, and why.** A double press on a key, used only for a hub's home control keys; a double press on
a swipe, which no event produces; gestures in a device map, which the gesture screen never reads; the
root map; fields stored and never read, or only reported; `ActivityPressDuration`, read by another
family's screens only; the IR port, a hub feature; anything the clients already set, the repeat count from
0 to 3 among them, which MyHarmony's "device command repeats" screen offers. The lab's setup note said
otherwise about the repeats and about gestures arriving only as Logitech's defaults, and was wrong on both.

**Width.** The production image, 4.15.330, for skin 99; the preview build is not checked. MyHarmony as
decompiled, 24 task and library directories, two of them decompiled for this step (remote settings and
favourites); `Remote.WifiSettings` and `Error.GlobalError` are not, so "nowhere in MyHarmony" means in what
was decompiled.

**Sources checked first.** `reference/architectures/harmony-touch/` and `reference/remotes/harmony-touch/`,
which held most of the screens' side already; the lab's feature list for `todo-touch.md` 1.3.2 and its
setup note for 2.2.1; MyHarmony's decompiled code, decision 2; Harmony Desktop's web application.

**Standing.** The screens' side "Read in the firmware"; the clients' side "Stated by Logitech, in their
client", since what a client offers is the client's to say.
"""
import os
import re
import tempfile
import unittest

import lab
from test_harmony_touch_favourites import lua_strings
from test_harmony_touch_image import UNSQUASHFS, SquashfsReader, members

IMAGE = 'touch_package_production'
SCREENS = 'opt/luadraws/'
JUNIPER = SCREENS + 'juniper/'
HARMONY = SCREENS + 'appscommon/harmony.lua'
BRIGHTNESS = JUNIPER + 'settings/screenBrightness.lua'
TIMEOUT = JUNIPER + 'settings/screenTimeout.lua'
INIT = JUNIPER + 'init.lua'
LOCKSCREEN = JUNIPER + 'lockscreen.lua'
SETTINGS = JUNIPER + 'settings.lua'
GESTUREPAD = JUNIPER + 'gesturepad.lua'
ENGINE = 'opt/luaworks/tasks/harmonyengine/'
#: The compiled engine files the engine items are read in, and the names each carries.
ENGINE_NAMES = {
    'loader/userconfigreader.lua': ['ConnectedAppPowerOnDelay', 'IsOnline', 'PowerOnSetType', 'PowerOffSetType',
                                    'StartActions', 'GreaterTenActions', 'GreaterHundredActions', 'Duration',
                                    'ActivityOrder', 'longActions'],
    'apihandler/activity.lua': ['ConnectedAppPowerOnDelay', 'longActions'],
}

MYHARMONY = os.path.join(lab.LAB, 'work', 'myharmony', 'src') if lab.LAB else None

#: The settings rows a Touch's screens read, `tests/test_harmony_touch_favourites.py`, less the two
#: background rows, which both clients set.
TOUCH_SETTINGS = ['TwelveHourClock', 'ScreenBrightness', 'ScreenTimeout', 'ScreenLockFlag', 'EditLock',
                  'KeyBrightness', 'AccelFlag', 'HapticFlag', 'HapticEffect']
GESTURE_EVENTS = ['SwipeUp', 'SwipeUpHold', 'SwipeDown', 'SwipeDownHold', 'SwipeRight', 'SwipeRightHold',
                  'SwipeLeft', 'SwipeLeftHold', 'Tap', 'DoubleTap', 'TapHold']
#: In MyHarmony's data contracts and in none of its screens.
CARRIED_NOT_SET = ['GestureRemoteButton', 'ConnectedAppPowerOnDelay', 'GreaterTenActions', 'GreaterHundredActions']
#: Nowhere in MyHarmony. `Tap` alone is left out, being an ordinary word.
NOWHERE = [g for g in GESTURE_EVENTS if g != 'Tap'] + ['PowerOnSetType', 'PowerOffSetType'] + TOUCH_SETTINGS
#: Set by MyHarmony on a screen: the control that a search over the task assemblies finds a field.
SET_BY_MYHARMONY = ['PressMinRepeats', 'FixedDigits', 'PowerOnDelay', 'InterKeyDelay', 'ButtonLongPressAction',
                    'BackgroundImage']
#: The only settings rows MyHarmony's dashboard edits.
DASHBOARD_ROWS = ['GlowTime', 'TiltSensor', 'RemoteAssistant']

#: Nowhere in Harmony Desktop, against the control of what it does name.
HD_NOWHERE = [g for g in GESTURE_EVENTS if g != 'Tap'] + ['GestureRemoteButton', 'ConnectedAppPowerOnDelay',
                                                          'PowerOnSetType', 'PowerOffSetType', 'GreaterTenActions',
                                                          'GreaterHundredActions'] + TOUCH_SETTINGS
HD_NAMES = ['PressMinRepeats', 'FixedDigits', 'InterKeyDelay', 'ButtonLongPressAction', 'BackgroundImage',
            'UserImages']


def function(source, name):
    """The text of a top level Lua function, from its `function` line to the next top level one."""
    start = re.search(r'^function (?:\w+[:.])?%s\(' % re.escape(name), source, re.M)
    if not start:
        raise AssertionError('no function %s' % name)
    end = re.compile(r'^(?:local )?function ', re.M).search(source, start.end())
    return source[start.start():end.start() if end else len(source)]


@unittest.skipUnless(UNSQUASHFS, 'unsquashfs is not installed')
class WhatTheTouchsScreensAllowAgainstWhatADocumentCarries(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        lab.require(IMAGE)
        cls.tmp = tempfile.TemporaryDirectory()
        rootfs = SquashfsReader(members(IMAGE)['harmony-image.squashfs'], cls.tmp.name)
        wanted = [HARMONY, BRIGHTNESS, TIMEOUT, INIT, LOCKSCREEN, SETTINGS, GESTUREPAD]
        cls.text = {p: b.decode('utf-8') for p, b in rootfs.each(wanted).items()}
        cls.engine = {f: lua_strings(rootfs.cat(ENGINE + f)) for f in ENGINE_NAMES}

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_the_engine_files_the_reading_cites_carry_the_fields(self):
        # The engine is compiled, so this pins only that the files read carry the names; what they do
        # with them is the lab's reading in the header.
        self.assertEqual({f: [n for n in names if n not in self.engine[f]] for f, names in ENGINE_NAMES.items()},
                         {f: [] for f in ENGINE_NAMES})

    def test_the_remotes_own_sliders_stop_short_of_the_documents_range(self):
        brightness = self.text[BRIGHTNESS]
        groups = re.findall(r'brightnessGrp\(\{text="(\w+)",value=\w+,min=(\d+)\}\)', brightness)
        self.assertEqual(groups, [('SETTINGS_BRIGHTNESS', '10'), ('SETTINGS_KEYBRIGHTNESS', '10')])
        self.assertTrue('max=100' in brightness)
        self.assertEqual(re.findall(r'^local min, max = (\d+), (\d+)$', self.text[TIMEOUT], re.M), [('1', '30')])

    def test_the_timeout_from_a_document_is_not_clamped_and_the_lock_screen_halves_it(self):
        init = self.text[INIT]
        suspend = re.search(r'local function setSuspendTimeout\(\)(.*?)\nend', init, re.S)
        self.assertIsNotNone(suspend)
        self.assertTrue('Render:setSuspendTimeout(timeout * 1000)' in suspend.group(1))
        for clamp in ('math.min', 'math.max', '> 30', '>30'):
            self.assertFalse(clamp in suspend.group(1), clamp)
        self.assertTrue('timeout = (timeout/2) * 1000' in self.text[LOCKSCREEN])

    def test_the_edit_lock_locks_three_menus_and_not_its_own_switch(self):
        settings = self.text[SETTINGS]
        top = re.search(r'local settingsList = \{(.*?)\n\}', settings, re.S).group(1)
        entries = re.findall(r'\{"(\w+)", [^,}]+(, true)?\}', top)
        self.assertEqual(entries, [('SETTINGS_MENU_REMOTE', ', true'), ('SETTINGS_EDIT_LOCK', ''),
                                   ('SETTINGS_MENU_GENERAL', '')])
        inserted = re.findall(r'table\.insert\(settingsList, 2,\s*\{"(\w+)", \w+, true\}\)', settings)
        self.assertEqual(sorted(set(inserted)), ['SETTINGS_MENU_ACTIVITIES', 'SETTINGS_MENU_DEVICES'])
        self.assertTrue('if lock and Harmony:getRemoteSettings("EditLock") then' in settings)

    def test_eleven_gesture_events_land_on_five_gesture_buttons(self):
        table = re.search(r'local GestureEventMappingTable = \{(.*?)\}', self.text[GESTUREPAD], re.S).group(1)
        pairs = dict(re.findall(r'(\w+) = "(\w+)"', table))
        self.assertEqual(sorted(pairs), sorted(GESTURE_EVENTS))
        self.assertEqual(sorted(set(pairs.values())), ['SwipeDown', 'SwipeLeft', 'SwipeRight', 'SwipeUp', 'Tap'])
        self.assertEqual(sorted(e for e, b in pairs.items() if e != b),
                         ['DoubleTap', 'SwipeDownHold', 'SwipeLeftHold', 'SwipeRightHold', 'SwipeUpHold', 'TapHold'])

    def test_the_gesture_editor_writes_the_held_forms_and_the_double_tap_and_binds_three_kinds(self):
        pad = self.text[GESTUREPAD]
        update = re.search(r'local function updateGestureSettings\(.*?\nend\n', pad, re.S).group(0)
        held = update.index('string.match(buttonKey, "Hold")')
        self.assertLess(held, update.index('button.ButtonLongPressAction = gestureInfo'))
        double = update.index('buttonKey == "DoubleTap"')
        self.assertLess(double, update.index('button.ButtonDoublePressAction = gestureInfo'))
        self.assertLess(update.index('button.ButtonLongPressAction'), double)
        # A command, a sequence or the number pad, which is the client action named 123.
        self.assertTrue('["__type"] = "ButtonSequenceAction"' in pad)
        self.assertTrue('["__type"] = "ButtonClientAction"' in pad)
        self.assertTrue('TextOnRemote == "123"' in pad)
        # And the edit lock stops it.
        self.assertTrue('if Harmony:getRemoteSettings("EditLock") then' in pad)

    def test_an_empty_vibration_effect_reads_as_the_text_nil(self):
        read = function(self.text[HARMONY], 'getRemoteSettings')
        made_a_string = read.index('value = tostring(value)')
        fallback = read.index('if value == nil then')
        self.assertLess(read.index('key == "HapticEffect"'), made_a_string)
        # tostring(nil) is "nil", which is not nil, so the default is never reached for an empty row.
        self.assertLess(made_a_string, fallback)

    def test_every_user_background_is_fetched_with_its_twin(self):
        submit = function(self.text[HARMONY], 'submitBackgroundImageRequest')
        loop = submit.index('for _, v in ipairs(s.Values) do')
        self.assertLess(submit.index('s.Name == "UserImages"'), loop)
        self.assertTrue('"_small.png"' in submit[loop:])
        self.assertFalse('Values[1]' in submit, 'not only the first value')


def task_and_contract_hits(root, name):
    """The MyHarmony assemblies a whole word occurs in, as the set of top level directory names."""
    pattern = re.compile(r'\b%s\b' % re.escape(name))
    found = set()
    for assembly in sorted(os.listdir(root)):
        for folder, _, files in os.walk(os.path.join(root, assembly)):
            for f in files:
                if f.endswith('.cs'):
                    with open(os.path.join(folder, f), encoding='utf-8', errors='replace') as fh:
                        if pattern.search(fh.read()):
                            found.add(assembly)
                            break
            if assembly in found:
                break
    return found


@unittest.skipUnless(MYHARMONY and os.path.isdir(MYHARMONY), 'MyHarmony decompiled is not in the lab')
class WhatMyHarmonyLetsAPersonSetForATouch(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        names = CARRIED_NOT_SET + NOWHERE + SET_BY_MYHARMONY + DASHBOARD_ROWS
        cls.hits = {n: task_and_contract_hits(MYHARMONY, n) for n in names}

    def screens(self, name):
        return sorted(a for a in self.hits[name] if a.startswith('Web.MartiniWeb.Tasks.'))

    def test_the_control_fields_myharmony_sets_occur_in_its_screens(self):
        for name in SET_BY_MYHARMONY:
            self.assertTrue(self.screens(name), name)

    def test_gestures_the_connected_app_delay_and_two_tuning_lists_are_carried_and_never_set(self):
        for name in CARRIED_NOT_SET:
            self.assertTrue(self.hits[name], name + ' is in the data contracts')
            self.assertTrue(all(a.startswith('Web.Data.') for a in self.hits[name]), name)
            self.assertEqual(self.screens(name), [], name)

    def test_the_gesture_events_the_power_set_types_and_the_touchs_settings_occur_nowhere(self):
        self.assertEqual({n: sorted(self.hits[n]) for n in NOWHERE if self.hits[n]}, {})

    def test_the_dashboards_settings_page_edits_another_familys_rows(self):
        for name in DASHBOARD_ROWS:
            self.assertEqual(self.screens(name), ['Web.MartiniWeb.Tasks.Dashboard.Main'], name)


class WhatHarmonyDesktopLetsAPersonSetForATouch(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        lab.require('desktop_webapp_main')
        with open(lab.path('desktop_webapp_main'), encoding='utf-8', errors='replace') as fh:
            cls.source = fh.read()

    def count(self, name):
        return len(re.findall(r'\b%s\b' % re.escape(name), self.source))

    def test_the_control_names_occur(self):
        for name in HD_NAMES:
            self.assertGreater(self.count(name), 0, name)

    def test_none_of_the_fields_left_over_is_named(self):
        self.assertEqual({n: self.count(n) for n in HD_NOWHERE if self.count(n)}, {})


if __name__ == '__main__':
    unittest.main()
