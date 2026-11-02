#!/usr/bin/env python3
"""What a Harmony Touch's firmware does with its Context and Settings documents, its favourite channels and
its pictures, read in the production image, 4.15.330.

**The question.** `todo-touch.md` 3.1 asked, for every field of the documents a sync delivers besides the
configuration proper, what the remote does with it. `packages/usb/test/touch-favourites.test.ts` holds
the documents as three recorded syncs delivered them; this file holds the firmware half, in
`reference/architectures/harmony-touch/favourites-and-settings.md`.

**Two kinds of source, and how each is checked.** The remote's screens ship as Lua source in the image,
`opt/luadraws`, so what they do is asserted here against the image itself: a constant's value, which
function names a field, which functions call another. The engine, `opt/luaworks`, ships as compiled Lua,
`tests/test_harmony_touch_image.py`, so it is asserted only by the names its files carry as string
constants, and **what the engine does with them is the lab's reading of the engine decompiled**, for
`todo-touch.md` 1.3.1; the decompiled files cited there compile back to the originals but for the jumps
of twelve functions in eight files, none of them cited here. The reading, file by file:

* **How a favourite becomes key presses** (`harmonyengine/apihandler/activity.lua`, `model/device.lua`,
  `model/state.lua`, `loader/userconfigreader.lua`). A tap on a favourite sends the engine
  `changeChannel` with the dial number, or `startActivity` with the activity and the number when the
  favourites activity is not running, and the engine sends the number once the start's commands have
  gone, as it does an activity's default channel. The device is the one the request names, else the
  running activity's first role device in the order Roku, Sonos, app, speaker, channel changing, and when
  the device that names is not found, the activity's default role's device; re-measured blind by a
  reviewer on the same decompiled lines. An infrared device refuses a number holding anything but digits, `-` and `.`, then sends the
  channel tuning feature's start actions, the digits, and its finish actions. The digits are padded with
  leading zeros to `FixedDigits` (0, no padding, when the feature states none); a two digit number of 10
  or more is preceded by the greater than ten actions and one of three or more digits of 100 or more by
  the greater than hundred actions; each digit is the device's command named after it, with the device's
  inter key delay. A number holding `-` or `.`, or a device with no channel tuning feature, sends each
  character as its command without the padding. An action naming a command the device lacks, an empty
  name included, sends nothing.
* **How the documents are named and kept** (`harmonywebservices/proxy/sync.lua` and
  `core/resourcemanager.lua`). Each lands in `/data/resources/`, during a sync first in `/data/tmp/`,
  with an entry in `index.json` holding its entity tag, its type and an expiry. The user document is
  `ContentUser.json`; a device document `CD_` and the device's `ContentProfileKey`; the line up `CS_` and
  the service id; a station logo the station id; an uploaded logo its name; a user background its file
  name, each picture with `.png`. **A content document or picture answered without an entity tag is not
  saved.** The expiry is the remote's clock when the answer arrived plus the `max-age` of the answer's
  `cache-Control`, and none without the field. A 304 keeps the held copy.
* **A change on the remote is saved without an entity tag** (`harmonywebservices/apihandler/resource.lua`):
  the engine saves a document handed to it with the tag its request carries, and the screens' request for
  a change carries none, so the next sync asks for that document untagged.
* **Context on a Touch** (`proxy/sync.lua`, `crashlog/apihandler/usagelog.lua`,
  `harmonyengine/apihandler/config.lua`, `activityengine/main.lua`, `connectserver/`). The path a Touch
  syncs by saves Context as it arrives; the hub's path also copies `AccountUri` and `Email` into the
  remote's preferences. `CountryCode` and whether `InstallerId` is set go into the usage report.
  `DataConsent`, `LatestSLAAcceptedDate` and `HouseholdUserProfileUri` are echoed in the engine's answer
  to a network client's configuration request. `Locale` is read only by the activity engine's clock,
  which starts on a hub alone. `Name` is read by the pairing and network discovery code and
  `LatestSLAAccepted` by the firmware check, and whether either runs on a Touch over USB was not settled.
  `ConfigVersion` and `Mode` were found read by nothing, the screens' `incConfigVersion` being a counter
  of their own.

**What this file asserts in the image.**

1. **A Touch runs the `juniper` screens**: `main.lua` loads the `hops` screens only for skins `0x6F` and
   `0x70`, and the Touch is skin 99.
2. **The firmware's settings defaults**: screen brightness 85, screen timeout 10, key brightness 35,
   haptic effect `"13"`, and a default background that is one of the pictures built into the remote.
3. **How a setting is read**: in `getRemoteSettings` the row's `DefaultValue` is named once, inside the
   yes or no branch and before the number branch, so a number setting with no value takes the
   firmware's default and never the row's. **How it is written**: `updateRemoteSettings` replaces a
   row's first value and adds no row.
4. **What the brightness becomes**: the screen level is clamped to 10 to 100 and scaled by 26, the key
   level is clamped to 5 to 100, below 5 off, and scaled by 42.
5. **Six Context fields, five Settings names and six fields of the favourites documents occur in no
   file of the root filesystem** but the screens' own test data, native programs included:
   `GlobalRemoteUri`, `HouseholdId-` (with its dash), `KeyboardLocale`, `RemoteJid`, `CustomerId`,
   `HouseholdDeviceProfileUri`; `IsWiFiEnabled`, `TimeZoneFlag`, `SettingId`, `MinCount`, `MaxCount`;
   `user_profile_uri`, `device_profile_uri`, `postalCode`, `operatorName`, `msoId`, `lineupId`. The
   controls: `HouseholdUserProfileUri` and `AccountId-`, which are read, are found outside the test data.
   The search is exact case, so a local `timezoneFlag` in `juniper/settings/setTimeZone.lua`, which is
   unrelated, does not count as `TimeZoneFlag`.
   The line up's `serviceType` does occur, in the engine's Sonos, WeMo and discovery plugins, so it is not
   on the list, and whether the favourites code reads it was not settled by a search.
6. **The built in backgrounds**: nine pictures with a `_small` twin each, named by a GUID, in the folder
   the screens draw a background from when its name is not a user picture.
7. **Which favourites the remote keeps**: an activity marked `IsTuningDefault` with one of four role
   types; a speaker by device types 19 and 33; the activity of `Type` 1 when none is running; at most 50
   stations, and up to 25 popular channels. **Only the two numbers are asserted**: that the add screen
   refuses a fifty first station with a warning, and that the popular list stops at 25, is read in
   `juniper/favoritechannel.lua` and `appscommon/harmony.lua` around those numbers and not asserted.
8. **Which pictures have an expiry rule**: the screens consult a picture's expiry in exactly three
   functions, the station logo, the popular channel logo and the Sonos or Heos picture; the uploaded
   logo and the backgrounds never. Logos are asked for at 54 by 54. The engine's `proxy/sync.lua` names
   `cache-Control` and the `max-age=` it strips.
9. **The engine's names for channel tuning**: `loader/userconfigreader.lua` names the feature and its
   fields, `model/state.lua` the padding and the two prefixes, and `apihandler/activity.lua` the roles it
   picks a device by, so the reading above is of these files.
10. **Which screens ask for each setting**, by name, over every Lua file of `juniper/` and `appscommon/`:
   the brightness pair in the start up code and the brightness screen, the clock form in the status bar
   and the two time screens, the timeout in the start up code, the lock screen, the timeout screen and the
   Wi-Fi sync screen, and so on, one exact map; `ActivityPressDuration`, `IsWiFiEnabled` and
   `TimeZoneFlag` by none. The vibration and motion screens are offered only after the native layer is
   asked whether the hardware is there. What each reader does with the value (the brightness scales of
   item 4, the clock's two formats, the lock screen on a fade out when the remote is provisioned, the
   timeout's suspend skipped on USB power, the edit lock's message and padlock) is read in those files and
   not asserted beyond the map.
11. **A tap on a favourite** takes its dial number through `getFavoriteDialPositionDetails` and sends
   `harmony.engine?startActivity` or `harmony.engine?changeChannel`; the details return a hand added dial
   position before the line up is consulted, and otherwise fill the short name, the number and the
   station's logo from it. **A change on the favourites screen** hands up both documents when the dial
   list changed and the user document alone when only the order did. **Without Context's
   `HouseholdUserProfileUri`** the remote skips the favourites and asks for its pictures.
12. **The Context fields that act** are named by the screens functions that act on them: the user name
   shown on the account screen is `Email` when there is one, the screens' language `Language`, an
   installer's remote `InstallerId`, a "321" setup `SetupType`, and the activity tutorial is offered only
   when neither holds; the engine's files name the setup session's type and the usage report's country and
   installer flag.
13. **The pictures are asked for in one order**: the activities' own pictures, the backgrounds, the home
   control scenes, then per favourites activity its favourites' logos and its popular channels' logos,
   after every picture already held has been carried into the new set.

**Read and not asserted.** A user background appears in the background picker only once its `_small`
twin is stored in `/data/resources/` (`juniper/settings/background.lua` walks that folder for twins and
lists one only when its full name is in `UserImages`).

**Negative results.** No `HapticFlag`, `HapticEffect` or `ActivityPressDuration` row arrives in any sync
recorded, so the firmware's defaults for them are what a Touch uses. The vibration and motion settings
are offered only when the native layer reports the hardware, which was not checked on a Touch. A
background named neither as a user picture nor built in is fetched from `DefaultImageBucketUri`, with
its twin, and stored in `/data/resources/`, while the screens look for it in the built in folder; read,
never exercised.

**Width.** The production image, 4.15.330, which its descriptor states is for skins 99, 100, 102, 105,
108, 111 and 112; what the screens do on another of those skins depends on its skin number, and only the
Touch's is asserted. The preview build, 4.15.250, is not checked.

**Sources checked first.** `reference/architectures/harmony-touch/` and `reference/remotes/harmony-touch/`,
`tests/test_harmony_touch_image.py` for how the image is read, the lab's notes for `todo-touch.md` 1.3.2,
1.6 and 2.3, which had read parts of this and were wrong in places the reference never carried (the user document
said to hold dial positions, a settings list with three rows missing and three that never arrive, an
empty value said to fall back straight to the firmware's default, and the account's 24 hour clock taken
for a conflict with the firmware's 12 hour default when the default only applies with no value), and
Logitech's data model in `reference/logitech/data-model/`. Logitech's client was not consulted: what the
remote does with a field is the remote's code, and the client only carries the documents.

**Standing.** "Read in the firmware" for all of it. The image stays in the lab.
"""
import re
import tempfile
import unittest

import lab
from test_harmony_touch_image import UNSQUASHFS, SquashfsReader, members

IMAGE = 'touch_package_production'

SCREENS = 'opt/luadraws/'
HARMONY = SCREENS + 'appscommon/harmony.lua'
FAVOURITES = SCREENS + 'appscommon/favoritesmanager.lua'
CHANNELS = SCREENS + 'juniper/favoritechannel.lua'
INIT = SCREENS + 'juniper/init.lua'
STYLE = SCREENS + 'juniper/style.lua'
MAIN = SCREENS + 'main.lua'
SCREEN_TEST_DATA = SCREENS + 'appscommon/test/'
ENGINE = 'opt/luaworks/tasks/'

#: Read by nothing in the image, so a Touch ignores them.
CONTEXT_UNREAD = ['GlobalRemoteUri', 'HouseholdId-', 'KeyboardLocale', 'RemoteJid', 'CustomerId',
                  'HouseholdDeviceProfileUri']
SETTINGS_UNREAD = ['IsWiFiEnabled', 'TimeZoneFlag', 'SettingId', 'MinCount', 'MaxCount']
#: Fields of the three favourites documents read by nothing in the image.
CONTENT_UNREAD = ['user_profile_uri', 'device_profile_uri', 'postalCode', 'operatorName', 'msoId', 'lineupId']
#: Read, so a search that finds nothing for these is a search that does not work.
CONTROLS = ['HouseholdUserProfileUri', 'AccountId-']

#: Which of the Touch's screens files ask for each setting by name, `juniper/` and `appscommon/` without
#: the test data. `UserImages` is read by walking the rows, not by name, so it is not here.
SETTING_READERS = {
    'BackgroundImage': ['appscommon/harmony.lua', 'juniper/settingsutil.lua'],
    'TwelveHourClock': ['juniper/init.lua', 'juniper/settings/setTime.lua', 'juniper/settings/setTimeZone.lua',
                        'juniper/style.lua'],
    'ScreenBrightness': ['juniper/init.lua', 'juniper/settings/screenBrightness.lua'],
    'ScreenTimeout': ['appscommon/syncwifi.lua', 'juniper/init.lua', 'juniper/lockscreen.lua',
                      'juniper/settings/screenTimeout.lua'],
    'ScreenLockFlag': ['juniper/init.lua', 'juniper/settings/screenTimeout.lua'],
    'EditLock': ['juniper/gesturepad.lua', 'juniper/settings.lua', 'juniper/settings/editlock.lua',
                 'juniper/style.lua'],
    'KeyBrightness': ['juniper/init.lua', 'juniper/settings/screenBrightness.lua'],
    'AccelFlag': ['juniper/init.lua', 'juniper/settings/accel.lua'],
    'HapticFlag': ['juniper/init.lua', 'juniper/settings/haptic.lua'],
    'HapticEffect': ['juniper/init.lua', 'juniper/settings/haptic.lua'],
    'ActivityPressDuration': [],
    'IsWiFiEnabled': [],
    'TimeZoneFlag': [],
}

GUID_PNG = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(_small)?\.png$')


def function(source, name):
    """The text of a top level Lua function, from its `function` line to the next top level one."""
    start = re.search(r'^function %s\(' % re.escape(name), source, re.M)
    if not start:
        raise AssertionError('no function %s' % name)
    end = re.compile(r'^(?:local )?function ', re.M).search(source, start.end())
    return source[start.start():end.start() if end else len(source)]


def constant(source, name):
    """The value of `local NAME = <number or string>` in a screens file."""
    found = re.findall(r'^local %s\s*=\s*("[^"]*"|\d+)\s*$' % re.escape(name), source, re.M)
    if len(found) != 1:
        raise AssertionError('%s is defined %d times' % (name, len(found)))
    value = found[0]
    return value[1:-1] if value.startswith('"') else int(value)


def calls(source, callee):
    """The top level functions whose text calls `callee`, in file order."""
    names = re.findall(r'^function ([\w.:]+)\(', source, re.M)
    return [n for n in names if callee in function(source, n)]


def lua_strings(chunk):
    """Every string constant of a compiled Lua 5.1 chunk, as the `size_t` length, the bytes and a NUL.

    A scan rather than a walk: any run that a four byte little endian length announces and a NUL closes,
    of printable bytes. It finds more than the constants, which is harmless for asserting that a name is
    there.
    """
    found = set()
    for at in range(len(chunk) - 5):
        length = int.from_bytes(chunk[at:at + 4], 'little')
        if 2 <= length <= 200 and at + 4 + length <= len(chunk) and chunk[at + 3 + length] == 0:
            text = chunk[at + 4:at + 3 + length]
            if all(32 <= b < 127 for b in text):
                found.add(text.decode('ascii'))
    return found


@unittest.skipUnless(UNSQUASHFS, 'unsquashfs is not installed')
class TheTouchsFavouritesAndSettings(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        lab.require(IMAGE)
        cls.tmp = tempfile.TemporaryDirectory()
        cls.rootfs = SquashfsReader(members(IMAGE)['harmony-image.squashfs'], cls.tmp.name)
        wanted = [HARMONY, FAVOURITES, CHANNELS, INIT, STYLE, MAIN]
        cls.text = {p: b.decode('utf-8') for p, b in cls.rootfs.each(wanted).items()}

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def engine(self, path):
        return lua_strings(self.rootfs.cat(ENGINE + path))

    def test_a_touch_runs_the_juniper_screens(self):
        main = self.text[MAIN]
        hops = re.findall(r'skinId\s*==\s*(0x[0-9A-Fa-f]+)', main)
        self.assertEqual([int(h, 16) for h in hops], [0x6F, 0x70])
        self.assertNotIn(99, [int(h, 16) for h in hops])
        self.assertTrue('"juniper/?.lua"' in main, 'the other screens are juniper')

    def test_the_firmware_defaults_for_the_settings(self):
        harmony = self.text[HARMONY]
        self.assertEqual(constant(harmony, 'DEFAULT_SCREEN_BRIGHTNESS'), 85)
        self.assertEqual(constant(harmony, 'DEFAULT_SCREEN_TIMEOUT'), 10)
        self.assertEqual(constant(harmony, 'DEFAULT_KEY_BRIGHTNESS'), 35)
        self.assertEqual(constant(harmony, 'DEFAULT_HAPTIC_EFFECT'), '13')
        defaults = function(harmony, 'getSettingsDefaultValue')
        # Each yes or no setting is named in the branch that sets its value, and the branch's value
        # follows its names: true for the clock form, the motion sensor and vibration, false for the
        # two locks.
        true_branch = defaults.index('value = true')
        false_branch = defaults.index('value = false')
        for name in ('"TwelveHourClock"', '"AccelFlag"', '"HapticFlag"'):
            self.assertLess(defaults.index(name), true_branch, name)
        for name in ('"EditLock"', '"ScreenLockFlag"'):
            self.assertLess(true_branch, defaults.index(name), name)
            self.assertLess(defaults.index(name), false_branch, name)

    def test_the_default_background_is_one_of_the_built_in_pictures(self):
        folder = re.findall(r'^BACKGROUND_IMAGE_PATH\s*=\s*"([^"]+)"', self.text[STYLE], re.M)
        self.assertEqual(folder, ['appscommon/asset/background/'])
        inside = [n[len(SCREENS + folder[0]):] for n in self.rootfs.names()
                  if n.startswith(SCREENS + folder[0])]
        pictures = sorted(n for n in inside if GUID_PNG.match(n))
        self.assertEqual(len([n for n in pictures if not n.endswith('_small.png')]), 9)
        self.assertEqual(sorted(n.replace('_small.png', '.png') for n in pictures if n.endswith('_small.png')),
                         [n for n in pictures if not n.endswith('_small.png')], 'each has a small twin')
        self.assertEqual(len(inside) - len(pictures), 2, 'and two pictures of the picker itself')
        default = re.findall(r'"([^"]+\.png)"', function(self.text[HARMONY], 'getSettingsDefaultValue'))
        self.assertEqual(len(default), 1)
        self.assertIn(default[0], pictures)

    def test_a_number_setting_ignores_the_rows_default_and_a_change_adds_no_row(self):
        read = function(self.text[HARMONY], 'getRemoteSettings')
        # The field as a word, so the calls to `getSettingsDefaultValue` are not counted.
        named = [m.start() for m in re.finditer(r'\bDefaultValue\b', read)]
        self.assertEqual(len(named), 1)
        self.assertLess(read.index('"HapticFlag"'), named[0], 'inside the yes or no branch')
        self.assertLess(named[0], read.index('"ScreenBrightness"'), 'before the number branch')
        self.assertIn('getSettingsDefaultValue', read)
        write = function(self.text[HARMONY], 'updateRemoteSettings')
        # Booleans, so a failure prints no firmware source.
        self.assertTrue('Values[1]' in write, 'the first value is replaced')
        self.assertFalse('table.insert' in write, 'no row or value is added')
        self.assertTrue('putResource' in write, 'the document is queued')

    def test_which_screens_ask_for_each_setting(self):
        lua = [p for p in self.rootfs.names() if p.endswith('.lua') and not p.startswith(SCREEN_TEST_DATA)
               and (p.startswith(SCREENS + 'juniper/') or p.startswith(SCREENS + 'appscommon/'))]
        sources = {p[len(SCREENS):]: b.decode('utf-8', 'replace') for p, b in self.rootfs.each(lua).items()}
        found = {name: sorted(p for p, text in sources.items() if 'getRemoteSettings("%s"' % name in text)
                 for name in SETTING_READERS}
        self.assertEqual(found, SETTING_READERS)
        # The settings screen offers vibration and the motion sensor only when the native layer reports
        # the hardware, which is why their rows matter only there.
        settings = sources['juniper/settings.lua']
        self.assertLess(settings.index('hasHaptic()'), settings.index('settings/haptic.lua'))
        self.assertLess(settings.index('hasAccel()'), settings.index('settings/accel.lua'))

    def test_a_tap_on_a_favourite_sends_its_dial_number_and_a_change_hands_up_one_or_two_documents(self):
        channels = self.text[CHANNELS]
        tap = function_of_local(channels, 'tuneToChannel')
        for name in ('getFavoriteDialPositionDetails', 'favStartActivity', 'changeChannel'):
            self.assertTrue(name in tap, name)
        harmony = self.text[HARMONY]
        self.assertTrue('harmony.engine?startActivity' in function(harmony, 'favStartActivity'))
        self.assertTrue('harmony.engine?changeChannel' in function(harmony, 'changeChannel'))
        # A changed dial list hands up both documents; a changed order alone, the user document only.
        upload = function_of_local(channels, 'putFavoriteResource')
        self.assertEqual(re.findall(r'putFavoritesConfig\((\w+), (\w+)', upload), [('cuInfo', 'cdInfo'), ('cuInfo', 'nil')])
        self.assertLess(upload.index('modifiedDialListFlag'), upload.index('modifiedStationListFlag'))
        # Without Context's household user profile the remote goes straight to the pictures.
        user = function(harmony, 'submitContentUserRequest')
        self.assertLess(user.index('HouseholdUserProfileUri'), user.index('submitImageRequest'))
        # A hand added dial position is returned as it stands; the others are filled from the line up.
        details = function(harmony, 'getFavoriteDialPositionDetails')
        self.assertLess(details.index('dialPosition.added'), details.index('getContentServiceChannels'))
        for field in ('shortName', 'channel.number', 'channel.station.id'):
            self.assertTrue(field in details, field)

    def test_the_context_fields_that_act_are_named_where_the_page_says(self):
        harmony = self.text[HARMONY]
        named = {'getUserName': 'Email', 'loadRemoteContext': 'Language', 'isInstaller': 'InstallerId',
                 'is321User': 'SetupType', 'submitContentUserRequest': 'HouseholdUserProfileUri'}
        for name, field in named.items():
            self.assertTrue(field in function(harmony, name), '%s names %s' % (name, field))
        self.assertTrue('"321"' in function(harmony, 'is321User'))
        others = self.rootfs.each([SCREENS + 'juniper/settings.lua', SCREENS + 'appscommon/settings/account.lua'])
        settings = others[SCREENS + 'juniper/settings.lua'].decode('utf-8')
        # The activity tutorial is offered only when the remote is neither an installer's nor a "321" one.
        self.assertLess(settings.index('is321User()'), settings.index('SETTINGS_ACTIVITY_TUTORIAL'))
        self.assertLess(settings.index('isInstaller()'), settings.index('SETTINGS_ACTIVITY_TUTORIAL'))
        self.assertTrue(b'getUserName()' in others[SCREENS + 'appscommon/settings/account.lua'])
        # The engine's halves, by name: the setup session's type, and the country and installer in the
        # usage report.
        self.assertTrue({'SetupSession', 'Type'} <= self.engine('harmonywebservices/core/resourcemanager.lua'))
        self.assertTrue({'CountryCode', 'InstallerId', 'isPro', 'country'}
                        <= self.engine('crashlog/apihandler/usagelog.lua'))

    def test_the_pictures_are_asked_for_in_one_order_after_the_held_ones_are_carried_over(self):
        images = function(self.text[HARMONY], 'submitImageRequest')
        order = ['submitActivityImageRequest', 'submitBackgroundImageRequest', 'submitScenesImageRequest',
                 'submitUserSelectedImageRequest', 'submitPopularImageRequest', 'copyImages']
        self.assertEqual(sorted(order, key=images.index), order)

    def test_the_brightness_scales(self):
        init = self.text[INIT]
        self.assertEqual(constant(init, 'MAX_LCD_BRIGHTNESS'), 26)
        self.assertEqual(constant(init, 'MAX_KEY_BRIGHTNESS'), 42)
        self.assertEqual(constant(init, 'BRI_MIN_LEVEL'), 10)
        self.assertEqual(constant(init, 'KEY_MIN_LEVEL'), 5)
        self.assertEqual(constant(init, 'MAX_LEVEL'), 100)

    def test_seventeen_names_occur_nowhere_but_in_the_screens_test_data(self):
        paths = [p for p in self.rootfs.names() if self.rootfs.sizes[p] > 0]
        everything = self.rootfs.each(paths)
        # Every regular file of the image with a byte in it, native programs included.
        self.assertEqual(len(paths), 2433)
        outside = {p: b for p, b in everything.items() if not p.startswith(SCREEN_TEST_DATA)}
        self.assertEqual(len(everything) - len(outside),
                         len([p for p in paths if p.startswith(SCREEN_TEST_DATA)]))
        for name in CONTEXT_UNREAD + SETTINGS_UNREAD + CONTENT_UNREAD:
            found = sorted(p for p, b in outside.items() if name.encode() in b)
            self.assertEqual(found, [], name)
        for name in CONTROLS:
            found = [p for p, b in outside.items() if name.encode() in b]
            self.assertNotEqual(found, [], 'the control %s is found' % name)

    def test_which_favourites_the_remote_keeps(self):
        favourites = self.text[FAVOURITES]
        self.assertIn('IsTuningDefault', favourites)
        roles = re.findall(r'"(\w+ActivityRole)"', function_of_local(favourites, 'updateInfoFromActivity'))
        self.assertEqual(roles, ['ChannelChangingActivityRole', 'ControlsRokuActivityRole',
                                 'ControlsSonosActivityRole', 'ControlsSpeakerActivityRole'])
        self.assertEqual(sorted(int(n) for n in re.findall(r'DeviceType == (\d+)', favourites)), [19, 33])
        self.assertEqual(re.findall(r'\.Type == (\d+)', function(favourites, 'getFirstActivityId')), ['1'])
        self.assertEqual(re.findall(r'#stations >= (\d+)', self.text[CHANNELS]), ['50'])
        self.assertEqual(constant(self.text[HARMONY], 'NUM_POPULAR_CHANNELS'), 25)

    def test_only_three_kinds_of_picture_consult_an_expiry(self):
        harmony = self.text[HARMONY]
        self.assertEqual(calls(harmony, 'getMaxAge'),
                         ['submitStationImageRequest', 'submitSpeakerImageRequest', 'submitPopularImageRequest'])
        for never in ('submitCustomStationImageRequest', 'submitBackgroundImageRequest'):
            self.assertFalse('getMaxAge' in function(harmony, never), never)
        self.assertEqual((constant(harmony, 'maxX'), constant(harmony, 'maxY')), ('54', '54'))
        sync = self.engine('harmonywebservices/proxy/sync.lua')
        self.assertTrue({'cache-Control', 'max%-age=', 'etag'} <= sync, sorted({'cache-Control', 'max%-age='} - sync))

    def test_the_engine_names_what_the_channel_reading_is_of(self):
        reader = self.engine('harmonyengine/loader/userconfigreader.lua')
        state = self.engine('harmonyengine/model/state.lua')
        device = self.engine('harmonyengine/model/device.lua')
        activity = self.engine('harmonyengine/apihandler/activity.lua')
        for names, found in (
                ({'ChannelTuningFeature', 'ChannelTune', 'FixedDigits', 'GreaterTenActions',
                  'GreaterHundredActions', 'StartActions', 'FinishActions'}, reader),
                ({'fixedDigits', 'greaterTenActions', 'greaterHundredActions'}, state),
                ({'getChangeChannelCommands', 'fireChannel', 'interKeyDelay'}, device),
                ({'changeChannel', 'ChannelChangingActivityRole', 'ControlsRokuActivityRole',
                  'ControlsSonosActivityRole', 'ControlsAppActivityRole', 'ControlsSpeakerActivityRole'},
                 activity)):
            self.assertEqual(sorted(names - found), [])

    def test_the_string_scan_finds_nothing_that_is_not_there(self):
        # The negative for the scan above: a name from another subsystem is absent from a file that has
        # no reason to hold it.
        self.assertNotIn('ChannelTuningFeature', self.engine('harmonyengine/model/state.lua'))


def function_of_local(source, name):
    """The text of a `local function` in a screens file, to the next top level function."""
    start = re.search(r'^local function %s\(' % re.escape(name), source, re.M)
    if not start:
        raise AssertionError('no local function %s' % name)
    end = re.compile(r'^(?:local )?function ', re.M).search(source, start.end())
    return source[start.start():end.start() if end else len(source)]


if __name__ == '__main__':
    unittest.main()
