#!/usr/bin/env python3
"""What a Harmony Touch's screens show with no activity and no favourites, and where those words come from, read in
the production image, 4.15.330: `todo-touch.md` 9.2.

**The question.** 9.2 delivered an empty configuration, no device and no activity, to the bench Touch, and the person
at the bench reported, held by no file but one photograph, the favourites page showing "Please sign in to your Harmony
account to add your favorite TV channels.", and right after the sync, off the cable, a text seen once and not brought
back, "the remote says it is empty and something like Please sign in to your Harmony account". Which text that was is
not identified. The run itself is `packages/bench/test/touch92-runs.test.ts`; this file holds what the image says about
the two texts that fit the report, and about the moment the second can appear.

**What was read, and what it settles.**

1. **Both texts are the firmware's**, keys of the screens' string tables, `NO_FAVORITES_SETUP` and `NO_ACTIVITY`, in
   `opt/luadraws/appscommon/locale/strings_<language>.lua` on the read only root, one file per language, thirteen, every
   one defining both. The screens name the folder with `Render:setStringTokenPath` and a widget names the key, so the
   words are the image's per language and a configuration chooses only the language, through Context's `Language`
   (`favourites-and-settings.md`). **The words live in the image**, and a sync delivers documents and pictures to the
   data volume, never a string table, so nothing an answerer delivers can change them: an application that is not
   Logitech's service cannot word them otherwise, and both texts send the person to "your Harmony account".
2. **The favourites page with no favourites** builds its label from `NO_FAVORITES_SETUP` (`juniper/style.lua`, the no
   favourites screen). That is the text in the photograph.
3. **The "no activity" notice** is `noActivityMessage("NO_ACTIVITY", ...)` with an OK button, pushed by `loadScreens` in
   `juniper/init.lua` when the setting `ActivityNotification` is true and the activity list is empty; its OK sets
   `ActivityNotification` false, and the activity list's and the device page's `showActivityWindow` set it true again,
   which by their comments is when a set with activities arrives. Its English text opens "You have not set up any
   Activities." and asks the person to sign in to their Harmony account.
4. **`loadScreens` runs at three moments, not two.** The 9.2 preflight read it at the screens' start and on a
   `PowerOffActivity` event with the list empty, and predicted the notice only after a restart. **It also runs when the
   remote leaves USB power after showing its USB screen**: `updatePowerState`, called for every change of the power
   controller's `powersource` file, pushes the USB screen and sets `activeStack` to `"sync"` when the source becomes
   `usb`, and calls `loadScreens` when it changes away while `activeStack` is `"sync"`. So the notice can appear the moment
   the remote is unplugged after a sync that left no activity, which is where the person saw a text. This corrects the
   preflight's reading; it does not identify the text, since the favourites screen's sentence also fits what was
   reported, and the notice is the reading's candidate only.

**Negative results kept.** No file under `opt/luadraws` outside the locale folder defines either key's text; `hops/`
holds a second copy of both screens, for the hub family's screens, which a Touch does not run (`main.lua`, asserted in
`test_harmony_touch_favourites.py`).

**Sources checked first.** The reference's `answering-a-sync.md`, `favourites-and-settings.md` and the model's
`features.md`; the lab's `notes/9.2-preflight.md` section 3 and `notes/6.10-screens-reads.md`; the image's screens as
named above. Logitech's client was not consulted: what the remote shows is the remote's code.

**Width.** The Harmony Touch's production image 4.15.330 alone; its firmware reports 17 and Logitech's templates file it
under 18. **Standing**: "Read in the firmware" for all of it. The image stays in the lab.
"""
import re
import tempfile
import unittest

import lab
from test_harmony_touch_image import UNSQUASHFS, SquashfsReader, members

IMAGE = 'touch_package_production'

SCREENS = 'opt/luadraws/'
LOCALE = SCREENS + 'appscommon/locale/'
INIT = SCREENS + 'juniper/init.lua'
STYLE = SCREENS + 'juniper/style.lua'
ACTIVITY = SCREENS + 'juniper/activity.lua'
DEVICE_MODE = SCREENS + 'juniper/devicemode.lua'

#: The thirteen languages the screens carry a string table for.
LANGUAGES = ['da', 'de', 'en', 'es', 'fi', 'fr', 'it', 'nb', 'nl', 'pl', 'pt', 'ru', 'sv']


def local_function(source, name):
    """The text of a `local function NAME(` in a screens file, up to the next top level function or callback."""
    start = re.search(r'^local function %s\(' % re.escape(name), source, re.M)
    if not start:
        raise AssertionError('no local function %s' % name)
    end = re.compile(r'^(?:local )?function |^Render:addGlobalCallback', re.M).search(source, start.end())
    return source[start.start():end.start() if end else len(source)]


def defined(table, key):
    """The text a string table gives `key`, `KEY = "..."`, or None."""
    found = re.findall(r'^\s*%s\s*=\s*"((?:[^"\\]|\\.)*)"' % re.escape(key), table, re.M)
    return found[0] if len(found) == 1 else None


@unittest.skipUnless(UNSQUASHFS, 'unsquashfs is not installed')
class WhatTheScreensShowWithNoActivity(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        lab.require(IMAGE)
        cls.tmp = tempfile.TemporaryDirectory()
        cls.rootfs = SquashfsReader(members(IMAGE)['harmony-image.squashfs'], cls.tmp.name)
        cls.names = cls.rootfs.names()
        wanted = [INIT, STYLE, ACTIVITY, DEVICE_MODE] + [LOCALE + 'strings_%s.lua' % l for l in LANGUAGES]
        cls.text = {p: b.decode('utf-8') for p, b in cls.rootfs.each(wanted).items()}

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_the_two_texts_are_keys_of_the_images_string_tables_one_per_language(self):
        tables = sorted(n[len(LOCALE):] for n in self.names if n.startswith(LOCALE) and n.endswith('.lua'))
        self.assertEqual(tables, ['strings_%s.lua' % l for l in LANGUAGES])
        for l in LANGUAGES:
            table = self.text[LOCALE + 'strings_%s.lua' % l]
            for key in ('NO_FAVORITES_SETUP', 'NO_ACTIVITY'):
                self.assertTrue(defined(table, key), '%s defines no %s' % (l, key))
        english = self.text[LOCALE + 'strings_en.lua']
        self.assertEqual(defined(english, 'NO_FAVORITES_SETUP'),
                         'Please sign in to your Harmony account to add your favorite TV channels.')
        self.assertTrue(defined(english, 'NO_ACTIVITY').startswith('You have not set up any Activities.'))
        self.assertIn('Sign in to your Harmony account', defined(english, 'NO_ACTIVITY'))
        # The screens read their words from that folder.
        self.assertIn('Render:setStringTokenPath("appscommon/locale")', self.text[INIT])

    def test_the_favourites_page_with_no_favourites_labels_itself_with_no_favorites_setup(self):
        style = self.text[STYLE]
        self.assertEqual(len(re.findall(r'Label:new\("NO_FAVORITES_SETUP"', style)), 1)

    def test_the_no_activity_notice_is_pushed_by_load_screens_and_its_ok_stops_it_until_activities_return(self):
        init = self.text[INIT]
        load = local_function(init, 'loadScreens')
        self.assertIn('Settings:get("ActivityNotification") and (not activities or not next(activities))', load)
        self.assertIn('noActivityMessage("NO_ACTIVITY", footerList)', load)
        self.assertIn('Settings:update("ActivityNotification", false)', load)
        for path in (ACTIVITY, DEVICE_MODE):
            show = local_function(self.text[path], 'showActivityWindow')
            self.assertIn('Settings:update("ActivityNotification", true)', show, path)

    def test_load_screens_runs_when_the_remote_leaves_usb_power_after_its_usb_screen(self):
        init = self.text[INIT]
        power = local_function(init, 'updatePowerState')
        usb, rest = power.split('elseif activeStack == "sync" then', 1)
        self.assertIn('if value == "usb" then', usb)
        self.assertIn('activeStack = "sync"', usb)
        self.assertIn('loadScreens()', rest.split('end', 1)[0])
        # It is called for every change of the power controller's power source file.
        self.assertRegex(init, r'filename ~= tps6507 \.\. "powersource"[\s\S]{0,200}updatePowerState\(value or "battery"\)')
        # The control: the two moments the preflight read are there too, so the search finds what it looks for.
        self.assertRegex(init, r'addGlobalCallback\("PowerOffActivity"[\s\S]{0,400}loadScreens\(\)')
        self.assertEqual(len(re.findall(r'^loadScreens\(\)$', init, re.M)), 1, 'the call at the screens\' start')

    def test_no_screens_file_outside_the_locale_folder_holds_either_texts_words(self):
        lua = [n for n in self.names if n.startswith(SCREENS) and n.endswith('.lua') and not n.startswith(LOCALE)]
        sources = self.rootfs.each(lua)
        english = self.text[LOCALE + 'strings_en.lua']
        for key in ('NO_FAVORITES_SETUP', 'NO_ACTIVITY'):
            words = defined(english, key).split('\\n')[0].encode()
            self.assertEqual([p for p, b in sources.items() if words in b], [], key)


if __name__ == '__main__':
    unittest.main()
