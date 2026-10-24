#!/usr/bin/env python3
"""What Logitech's service states about each of six models, read from its own filed answers.

**The facts.** Asked for the capabilities of one product of each model through
`UserAccountDirector/GetProductCapabilities2`, Logitech's configuration service states, per model: the
product family, the compiler architecture, the device and favourite channel maxima, an activity maximum
where it has one, the display (colour or not, and a grid of rows and columns), the remote settings it
offers with their defaults, and a list of named capabilities, none of them denied. `EXPECTED` below is
that statement, model by model, and it is what the model pages of `reference/remotes/` restate in their
"What Logitech's service states" sections, each row footnoted to this file.

**Why a test and not a sentence.** Until `todo-reference.md` 3.4 these answers were restated in a hand
table in `reference/capabilities.md` and in six features pages, and no archive section and no test held
them, so every row resting on them alone was marked not checked. The answers were filed by the probe of
the `myharmony-service` skill, one per model, and this file reads each one and asserts the statement
exactly: a field the service adds or drops, or a capability that appears or goes, fails here rather
than leaving six pages quietly out of date.

**What the filing settled, beside the transcription.** Three things a reader of the old table would not
have known:

* The capability the old table wrote `FavoriteChannelImageScaling` is named `FavoriteChannelImageScaller`
  by the service, misspelt as served. A name is copied, never corrected, since a client matches on it.
* Skin 54's product is named `Harmony One` and displayed as `Harmony One+`, in this answer and in the
  service's product list alike (`tests/test_host_client.py`, `PRODUCTS`). So "Harmony One+" is the
  service's display name for the Harmony One's skin and not a different product.
* The Harmony 650 and 700 state `DefaultSkinId` 71 in their compiler architecture, the Harmony 600's skin,
  and the Harmony 300 and 350 both state 78, the Harmony 300's: the default skin is the architecture's,
  not the model's.

**The plain call agrees but for one capability.** `GetProductCapabilities`, without the 2, answers the
same product with fewer fields and its capabilities as bare numbers. Those numbers are the
`CapabilityId`s of the long answer with one exception on every model: capability 10020,
`FavoriteChannelImageScaller`, is in the long answer of the three models that state it and in none of the
plain ones. So the long call is the complete statement, and the plain one predates that capability or
leaves it out.

**Standing.** The vendor's current word about its own products, "Stated by Logitech, by their service" in
the reference's footnotes. It says what Logitech's software allows a person to set up, and nothing about
what a remote enforces. Every test skips cleanly without the lab, which is where the answers stay.
"""
import unittest

import lab

OPERATION = 'GetProductCapabilities2'

#: The six models, as the filed answers name them, with what each states. `capabilities` is the whole
#: set, so a capability added or dropped fails the test rather than slipping past a subset check.
#: `display` is (colour, rows, columns), or None where the answer lists no display.
EXPECTED = {
    'one': {
        'skin': 54, 'name': 'Harmony One', 'display_name': 'Harmony One+', 'family': 'HarmonyOne',
        'architecture': 12, 'default_skin': 54, 'max_devices': 15, 'favourites': 24,
        'max_activities': None, 'display': (True, 3, 2), 'settings': {},
        'capabilities': {
            'Activities', 'ActivityCompiledRemoteButtonMapping', 'ActivityReorder', 'ButtonSequences',
            'ColourDisplay', 'DeviceDelay', 'FavoriteChannelImageScaller', 'FavoriteChannels',
            'HarmonyOne', 'LeaveDevicesPoweredOn', 'LocaleEnabled', 'PartiallySetupActivities', 'SmartTV',
            'SupportActivitySequence', 'SupportsChangeUsername', 'SupportsEmailCampaign',
            'SupportsRokuActivity', 'SupportsVideoCalling', 'SupportsWatchApp',
            'SupportsWatchAppleTVActivity',
        },
    },
    '600': {
        'skin': 71, 'name': 'Harmony 600', 'display_name': 'Harmony 600', 'family': 'Molson',
        'architecture': 14, 'default_skin': 71, 'max_devices': 5, 'favourites': 23,
        'max_activities': None, 'display': (False, 2, 2),
        'settings': {'GlowTime': '20', 'TiltSensor': 'true', 'RemoteAssistant': 'true'},
        'capabilities': {
            'Activities', 'ActivityCompiledRemoteButtonMapping', 'ActivityMapping', 'ButtonSequences',
            'DeviceDelay', 'FavoriteChannels', 'Harmony600', 'LeaveDevicesPoweredOn', 'LocaleEnabled',
            'PartiallySetupActivities', 'RemoteSettings', 'SmartTV', 'SupportActivitySequence',
            'SupportsChangeUsername', 'SupportsEmailCampaign', 'SupportsMHAssist', 'SupportsRokuActivity',
            'SupportsVideoCalling', 'SupportsWatchApp', 'SupportsWatchAppleTVActivity',
        },
    },
    '650': {
        'skin': 72, 'name': 'Harmony 650', 'display_name': 'Harmony 650', 'family': 'Molson',
        'architecture': 14, 'default_skin': 71, 'max_devices': 8, 'favourites': 23,
        'max_activities': None, 'display': (True, 2, 2),
        'settings': {'GlowTime': '20', 'TiltSensor': 'true', 'RemoteAssistant': 'true'},
        'capabilities': {
            'Activities', 'ActivityCompiledRemoteButtonMapping', 'ActivityMapping', 'ButtonSequences',
            'ColourDisplay', 'DeviceDelay', 'FavoriteChannelImageScaller', 'FavoriteChannels',
            'Harmony650', 'LeaveDevicesPoweredOn', 'LocaleEnabled', 'PartiallySetupActivities',
            'RemoteSettings', 'SmartTV', 'SupportActivitySequence', 'SupportsChangeUsername',
            'SupportsEmailCampaign', 'SupportsMHAssist', 'SupportsRokuActivity', 'SupportsVideoCalling',
            'SupportsWatchApp', 'SupportsWatchAppleTVActivity',
        },
    },
    '700': {
        'skin': 66, 'name': 'Harmony 700', 'display_name': 'Harmony 700', 'family': 'Molson',
        'architecture': 14, 'default_skin': 71, 'max_devices': 8, 'favourites': 23,
        'max_activities': None, 'display': (True, 2, 2),
        'settings': {'GlowTime': '20', 'TiltSensor': 'true', 'RemoteAssistant': 'true'},
        'capabilities': {
            'Activities', 'ActivityCompiledRemoteButtonMapping', 'ActivityMapping', 'ButtonSequences',
            'ColourDisplay', 'DeviceDelay', 'FavoriteChannelImageScaller', 'FavoriteChannels',
            'Harmony700', 'LeaveDevicesPoweredOn', 'LocaleEnabled', 'PartiallySetupActivities',
            'RemoteSettings', 'SmartTV', 'SupportActivitySequence', 'SupportsChangeUsername',
            'SupportsEmailCampaign', 'SupportsMHAssist', 'SupportsRokuActivity', 'SupportsVideoCalling',
            'SupportsWatchApp', 'SupportsWatchAppleTVActivity',
        },
    },
    '300': {
        'skin': 79, 'name': 'Harmony 300 EMEA', 'display_name': 'Harmony 300', 'family': 'Harmony300',
        'architecture': 16, 'default_skin': 78, 'max_devices': 4, 'favourites': 4,
        'max_activities': None, 'display': None, 'settings': {},
        'capabilities': {
            'CompiledRemoteButtonMapping', 'DeviceDelay', 'FavoriteChannels', 'Harmony300EMEA',
            'PartiallySetupActivities', 'SupportsChangeUsername', 'SupportsEmailCampaign',
        },
    },
    '350': {
        'skin': 104, 'name': 'Harmony 350', 'display_name': 'Harmony 350', 'family': 'Harmony350',
        'architecture': 16, 'default_skin': 78, 'max_devices': 8, 'favourites': 5,
        'max_activities': 1, 'display': None, 'settings': {},
        'capabilities': {
            'Activities', 'CompiledRemoteButtonMapping', 'DeviceDelay', 'FavoriteChannels', 'Harmony350',
            'LongPressAction', 'SupportsChangeUsername', 'SupportsEmailCampaign', 'SupportsMHAssist',
        },
    },
}


def product(model, operation=OPERATION):
    """The product record of one filed answer."""
    return lab.model_response(model, operation)['GetProductCapabilitiesResult']['Product']


class WhatTheServiceStatesPerModel(unittest.TestCase):
    """Each model's statement, field by field, against `EXPECTED`."""

    def setUp(self):
        # Up front, so a lab missing one answer skips the whole test rather than five subtests passing.
        lab.require_model_responses(OPERATION, *EXPECTED)

    def test_the_product_fields(self):
        for model, want in EXPECTED.items():
            with self.subTest(model=model):
                p = product(model)
                self.assertEqual(p['SkinId'], want['skin'])
                self.assertEqual(p['ProductIdentifier'], str(want['skin']))
                self.assertEqual(p['Name'], want['name'])
                self.assertEqual(p['DisplayName'], want['display_name'])
                self.assertEqual(p['ProductFamily'], want['family'])
                self.assertEqual(p['CompilerArchitecture']['Architecture'], want['architecture'])
                self.assertEqual(p['CompilerArchitecture']['DefaultSkinId'], want['default_skin'])
                self.assertEqual(p['MaxDevicesPerAccount'], want['max_devices'])
                self.assertEqual(p['MaxFavoriteChannels'], want['favourites'])
                self.assertEqual(p['MaxActivities'], want['max_activities'])
                # 100 on every model, and nothing in this project knows what enforces it.
                self.assertEqual(p['NumOfAddDevice'], 100)

    def test_the_display(self):
        """Colour or not and the grid, which is what the panel field of a model page rests on."""
        for model, want in EXPECTED.items():
            with self.subTest(model=model):
                displays = product(model)['Displays']
                if want['display'] is None:
                    self.assertEqual(displays, [])
                    continue
                self.assertEqual(len(displays), 1)
                d = displays[0]
                self.assertEqual((d['ColorDisplay'], d['NumRows'], d['NumColumns']), want['display'])

    def test_the_settings_and_their_defaults(self):
        for model, want in EXPECTED.items():
            with self.subTest(model=model):
                got = {s['Setting']['Name']: s['DefaultValue'] for s in product(model)['ProductSettings']}
                self.assertEqual(got, want['settings'])

    def test_the_capabilities_are_the_whole_set_and_none_is_denied(self):
        for model, want in EXPECTED.items():
            with self.subTest(model=model):
                caps = product(model)['SupportedCapabilities']
                self.assertEqual({c['Name'] for c in caps}, want['capabilities'])
                self.assertEqual([c['Name'] for c in caps if c['IsDeny']], [])

    def test_the_plain_call_names_the_same_capabilities_by_number_but_one(self):
        """The plain call's numbers are the long one's ids, less 10020 wherever the long one has it."""
        lab.require_model_responses('GetProductCapabilities', *EXPECTED)
        for model in EXPECTED:
            with self.subTest(model=model):
                plain = product(model, 'GetProductCapabilities')['SupportedCapabilities']
                long_caps = product(model)['SupportedCapabilities']
                long_ids = {c['CapabilityId'] for c in long_caps}
                # The capability the plain call leaves out is 10020 wherever it is stated.
                name = 'FavoriteChannelImageScaller'
                scaller = {c['CapabilityId'] for c in long_caps if c['Name'] == name}
                stated = name in EXPECTED[model]['capabilities']
                self.assertEqual(scaller, {10020} if stated else set())
                self.assertEqual(set(plain), long_ids - {10020})


class TheDifferencesTheModelPagesState(unittest.TestCase):
    """The comparisons the model pages draw, asserted as comparisons so that a page cannot drift."""

    def setUp(self):
        lab.require_model_responses(OPERATION, *EXPECTED)
        self.caps = {m: {c['Name'] for c in product(m)['SupportedCapabilities']} for m in EXPECTED}

    def test_the_600_lacks_exactly_the_two_colour_capabilities_of_the_650_and_700(self):
        for sibling in ('650', '700'):
            with self.subTest(sibling=sibling):
                self.assertEqual(self.caps[sibling] - self.caps['600'] - {'Harmony' + sibling},
                                 {'ColourDisplay', 'FavoriteChannelImageScaller'})
        # And the 650 and 700 state the same list but for the capability naming the model.
        self.assertEqual(self.caps['650'] - {'Harmony650'}, self.caps['700'] - {'Harmony700'})

    def test_what_the_600_650_and_700_state_and_the_one_does_not(self):
        shared = self.caps['600'] & self.caps['650'] & self.caps['700']
        self.assertEqual(shared - self.caps['one'],
                         {'RemoteSettings', 'ActivityMapping', 'SupportsMHAssist'})
        self.assertEqual(self.caps['one'] - self.caps['650'] - {'HarmonyOne'}, {'ActivityReorder'})

    def test_the_300_states_no_activities_and_the_350_states_one(self):
        self.assertNotIn('Activities', self.caps['300'])
        self.assertIn('PartiallySetupActivities', self.caps['300'])
        self.assertIn('Activities', self.caps['350'])
        self.assertNotIn('PartiallySetupActivities', self.caps['350'])
        self.assertEqual(product('350')['MaxActivities'], 1)

    def test_only_the_350_states_a_long_press(self):
        self.assertEqual([m for m in EXPECTED if 'LongPressAction' in self.caps[m]], ['350'])


if __name__ == '__main__':
    unittest.main()
