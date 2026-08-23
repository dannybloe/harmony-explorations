#!/usr/bin/env python3
"""The service API surface of Logitech's own client, recomputed rather than transcribed.

`docs/host-client.md` documents which services Harmony Desktop talks to and which operations it
declares on each. That is the answer to a product question, decision 11 in `docs/roadmap.md`: whether
Logitech's device database is reachable as its own call or only as a side effect of compiling a config.
It is reachable as its own call, and the list below is why we believe that.

**A list read off a screen once is a list nobody can check.** The house rule is to count
programmatically, and it exists because a hand count of infrared codes here gave 107 and 55 when the
figures were 108 and 54. So this test re-extracts the whole table from the mirrored client and asserts
the document's figures, which also means that if the client is ever re-mirrored and its surface has
moved, the document fails rather than quietly ages.

What travels is operation names and counts, which is functional fact of the kind the interoperability
rule in `docs/host-client.md` covers. Logitech's code stays in the lab, nothing is quoted, and the API
keys the client carries in plain text are deliberately neither extracted nor asserted here.

**None of this says the service answers.** It says what one client asks for. Section 56 measured
`svcs.myharmony.com` authenticating and section 58 watched it compile a config; no call below has been
made by this project.
"""
import os
import re
import unittest

import lab

#: Every service the client binds a URL for, with how many operations it declares on each. Both halves
#: are asserted: a service with no operations is a real entry, since the client builds those calls by
#: hand instead, and dropping it would hide that.
SERVICES = {
    'accountManager': 10,
    'compileManager': 1,
    'deletionManager': 2,
    'deviceManager': 10,
    'downloadManager': 1,
    'easyZapperManager': 0,
    'infraredAnalysisManager': 1,
    'productsManager': 2,
    'remoteManager': 6,
    'security': 8,
    'softwareUpdateService': 0,
    'userAccountDirector': 18,
    'userButtonMappingManager': 13,
    'userFeatureManager': 3,
}

#: The operations that answer decision 11's question, and the service each one belongs to. Named
#: individually because the count alone would survive any of them being renamed away.
DEVICE_DATABASE = {
    'deviceManager': [
        'SearchGlobalDevices',
        'GetCommands',
        'GetGlobalLanguageCommands',
        'GetAllTeachingCommandsForGivenPowerAndInputTypes',
    ],
    'userAccountDirector': ['SimpleRestSearchGlobalDevices'],
    'userFeatureManager': ['CopyFeaturesFromGlobalDevice'],
    # The one that matters to this repository rather than to the application: a configuration
    # described by its author, in JSON, for a remote whose bytes we already read to the last one.
    'downloadManager': ['RemoteConfigurationInJson'],
}

#: Calls the client builds by hand rather than declaring, so a count of declarations misses them.
#: Three, and the point of asserting them is that the surface is "at least this", never "exactly".
HAND_BUILT = ['Account', 'CheckEasyZapperAccount', 'GetSmartTVMenuNames']


def service_table(source):
    """Which operations each service declares, by walking the file once in order.

    Each service client sets `this.url` from a named field and then declares its methods, so an
    operation belongs to the last URL seen. That is an inference about the client's shape rather than
    a parse of it, which is exactly why the totals are asserted: a wrong attribution would move them.
    """
    table = {}
    current = None
    pattern = re.compile(r'this\.url\s*=\s*f\.([A-Za-z0-9_]+)|declareMethod\("([A-Za-z0-9_]+)"')
    for match in pattern.finditer(source):
        service, method = match.group(1), match.group(2)
        if service is not None:
            current = service
            table.setdefault(current, [])
        elif current is not None:
            table[current].append(method)
    return table


class ServiceSurface(unittest.TestCase):
    def setUp(self):
        lab.require('desktop_webapp_main')
        self.source = lab.load('desktop_webapp_main').decode('utf-8', 'replace')
        self.table = service_table(self.source)

    def test_the_documented_services_and_their_operation_counts(self):
        self.assertEqual({name: len(ops) for name, ops in self.table.items()}, SERVICES)
        # Every declaration is attributed to a service, which is what says the walk did not lose any.
        declared = len(re.findall(r'declareMethod\("', self.source))
        self.assertEqual(sum(SERVICES.values()), declared)

    def test_the_device_database_is_its_own_call_and_not_only_a_compile(self):
        """Decision 11's question. If these move, the plan that rests on them has to move too."""
        for service, operations in DEVICE_DATABASE.items():
            for operation in operations:
                with self.subTest(service=service, operation=operation):
                    self.assertIn(operation, self.table.get(service, []))

    def test_calls_the_client_builds_by_hand_are_counted_too(self):
        found = set(re.findall(r'uriParams\s*=\s*"([A-Za-z0-9_]+)', self.source))
        self.assertEqual(sorted(found), sorted(HAND_BUILT))
        # And they are not in the declared table, which is the reason they need their own assertion.
        declared = {op for ops in self.table.values() for op in ops}
        self.assertEqual(found & declared, set())

    def test_the_transport_is_json_rather_than_soap(self):
        """A `.svc` endpoint implies SOAP to anyone who has met WCF, and this one is not.

        It matters for what a client would cost to write: a JSON body over HTTP rather than an
        envelope, a WSDL and a code generator. Asserted as a negative because the wrong assumption is
        the expensive one.
        """
        self.assertEqual(len(re.findall(r'[Ss]oap', self.source)), 0)
        self.assertGreater(len(re.findall(r'asJSON', self.source)), 0)

    def test_the_button_map_operations_are_about_names_and_not_hardware(self):
        """The trap this project has fallen into before, in a new place.

        `GetRootButtonMap` and `GetDeviceModeButtonMaps` read like the physical button map, which
        `CLAUDE.md` lists as open. They are not: they belong to the user's button **mapping** service,
        alongside save and restore-to-default operations, so they map a named button to a command. That
        agrees with what section 48 concluded from the firmware and with the reading in
        `docs/host-client.md` that a host names buttons and the firmware resolves the name. Pinned so
        that nobody reads the name and reopens a closed question.
        """
        mapping = self.table['userButtonMappingManager']
        for operation in ('GetRootButtonMap', 'GetDeviceModeButtonMaps', 'GetButtonMaps'):
            self.assertIn(operation, mapping)
        for operation in ('SaveButtonMaps', 'RestoreToDefaultButtonMaps'):
            self.assertIn(operation, mapping, 'the save side is what makes it a mapping service')
        # And no operation anywhere promises a scan code, a matrix or a row and column.
        every = {op for ops in self.table.values() for op in ops}
        for word in ('Scan', 'Matrix', 'RowColumn', 'Keypad'):
            self.assertEqual([op for op in every if word.lower() in op.lower()], [])

#: The captured replies this file asserts against, so the guard and the tests cannot drift apart.
PRODUCT_REPLIES = ('GetAllProducts.json', 'GetHarmonyProducts.json')

#: What the product table says about the models this project works on, measured on 21 August 2026
#: from the reply captured on 13 August. Named per skin rather than counted, because the point of
#: each row is a different one.
#:
#: `max_activities` is the column with the lesson in it: the field **exists** and is null on every
#: model anybody here could use, so the standing claim that no source states an activity limit is not
#: merely unrefuted, it is confirmed with the field named. A future reader who finds `MaxActivities`
#: in this reply and thinks the question is answered can read this instead of measuring again.
PRODUCTS = {
    22: {'name': 'Harmony 525', 'enabled': False, 'max_devices': 12, 'favourites': 0,
         'max_activities': 255},
    54: {'name': 'Harmony One+', 'enabled': True, 'max_devices': 15, 'favourites': 24,
         'max_activities': None},
    59: {'name': 'Harmony One EMEA', 'enabled': False, 'max_devices': 15, 'favourites': 0,
         'max_activities': 255},
    66: {'name': 'Harmony 700', 'enabled': True, 'max_devices': 8, 'favourites': 23,
         'max_activities': None},
    71: {'name': 'Harmony 600', 'enabled': True, 'max_devices': 5, 'favourites': 23,
         'max_activities': None},
    73: {'name': 'Harmony 600', 'enabled': True, 'max_devices': 5, 'favourites': 23,
         'max_activities': None},
}


class ProductTable(unittest.TestCase):
    """What Logitech's own product table states, and the two fields it states nothing in.

    Section 136 read the refusal to compile for a Harmony 525 as "the likeliest reason is a stated per
    product `IsEnabled` flag, false for skin 22, whose true set is exactly the client's own supported
    list". That was an inference from two observations. This is the measurement.
    """

    def setUp(self):
        lab.require_responses(*PRODUCT_REPLIES)
        self.products = lab.response('GetAllProducts.json')
        self.supported = lab.response('GetHarmonyProducts.json')['GetHarmonyProductsResult']

    def test_the_supported_list_is_exactly_the_enabled_set(self):
        """Section 136's inference, now an equality with no exception either way.

        This is why a Harmony 525 cannot be registered and why its compile ends in a bare error: the
        product is in the table, the table says it is not enabled, and the list the setup flow reads is
        the enabled half of it. The equality is asserted in both directions, because a subset in either
        direction would be a different claim and only one of them is true.
        """
        enabled = {p['SkinId'] for p in self.products if p['IsEnabled']}
        listed = {p['SkinId'] for p in self.supported if p.get('SkinId') is not None}
        self.assertEqual(enabled, listed)
        # Exact, and both figures, since a share would hide which side moved. 19 of 120 skins, from
        # 27 records, because a skin can appear more than once in the table.
        self.assertEqual(len(enabled), 19)
        self.assertEqual(len(self.products), 120)
        self.assertNotIn(22, enabled, 'the Harmony 525 is the model this explains')

    def test_the_table_agrees_with_our_own_model_figures(self):
        """The device and favourite counts, which `packages/usb/src/models.ts` already carries.

        Asserted here rather than assumed: section 136 adopted the vendor's device counts, and this is
        the reply that was adopted from. The favourite counts were in our table too and had never been
        checked against it.
        """
        by_skin = {p['SkinId']: p for p in self.products}
        for skin, expected in PRODUCTS.items():
            with self.subTest(skin=skin):
                got = by_skin[skin]
                self.assertEqual(got['DisplayName'], expected['name'])
                self.assertEqual(got['IsEnabled'], expected['enabled'])
                self.assertEqual(got['MaxDevicesPerAccount'], expected['max_devices'])
                self.assertEqual(got['MaxFavoriteChannels'], expected['favourites'])

    def test_two_fields_that_would_have_answered_open_questions_are_empty(self):
        """The negative result, asserted, because it is the one that saves the next afternoon.

        `CompilerArchitecture` would have handed us the architecture per model, which this project
        derives from firmware and from a config's own section slot 1. It is null on all 120.

        `MaxActivities` would have answered the one figure `CLAUDE.md` says exists in no source, and it
        is the more interesting of the two, because **it is served for one model**. The Harmony 350
        states 1, which is true of that remote and is the only enabled model with any value at all.
        Every model this project works on is null, and the disabled half carries a flat 255, which is a
        sentinel rather than a generous limit. So the standing claim survives with its scope named: the
        field exists, Logitech filled it in where they cared, and none of those places is a remote here.
        """
        self.assertEqual([p['CompilerArchitecture'] for p in self.products], [None] * 120)
        by_skin = {p['SkinId']: p for p in self.products}
        for skin, expected in PRODUCTS.items():
            with self.subTest(skin=skin):
                self.assertEqual(by_skin[skin]['MaxActivities'], expected['max_activities'])
        # The one exception, named rather than excluded, because an exception nobody names is a rule
        # nobody can trust. Asserted as the whole set so a second one cannot appear unnoticed.
        stated = {p['SkinId']: p['MaxActivities'] for p in self.products
                  if p['IsEnabled'] and p['MaxActivities'] is not None}
        self.assertEqual(stated, {104: 1})
        self.assertEqual(by_skin[104]['DisplayName'], 'Harmony 350')


#: The button map captures, one per bench remote, and they are the only two files here whose names
#: carry a skin, which is why they are safe to reach by name at all.
BUTTON_MAP_REPLIES = ('GET_MapList_skin54.json', 'GET_MapList_skin71.json')


def button_names(reply):
    """Every button the maps in one reply name, by the kind of map naming it."""
    per_kind = {}
    for button_map in reply['ButtonMaps']:
        kind = button_map['__type'].split(':')[0]
        named = {b['ButtonKey'] for b in button_map['Buttons'] if b.get('ButtonKey')}
        per_kind[kind] = per_kind.get(kind, set()) | named
    return per_kind


class ButtonMapCompleteness(unittest.TestCase):
    """Whether `reference/button-maps.md` used every name the vendor offered, and invented none.

    Section 133 derived that document by decoding a scan code's infrared record into the bit frame a
    device sees and looking the frame up in the catalogue and button maps of the account that generated
    the config. What it never checked is the **other** direction: that the vendor's own maps hold no
    button the document failed to place, and that the document holds no button the maps do not name.

    Both sides come out exact on both remotes, which is a completeness closure rather than a new name:
    the document places 32 of the Harmony One's buttons and leaves 4 in two symmetric pairs, and the
    vendor names exactly 36. The Harmony 600 is 36 placed plus 4 undecided against 40 named. Nothing
    left over either way, on either remote.
    """

    def setUp(self):
        lab.require_responses(*BUTTON_MAP_REPLIES)
        here = os.path.dirname(os.path.abspath(__file__))
        with open(os.path.join(here, '..', 'reference', 'button-maps.md'), encoding='utf-8') as fh:
            self.document = fh.read()

    def placed(self, heading):
        """The buttons the document gives a scan code, from its own table."""
        block = self.document.split(heading)[1].split('\n## ')[0]
        return set(re.findall(r'^\| \d+ \| `([A-Za-z0-9]+)`', block, re.M))

    def undecided(self, heading):
        """The buttons it names in pairs it deliberately refuses to split."""
        block = self.document.split(heading)[1].split('\n## ')[0]
        found = set()
        for pair in re.findall(r'`([A-Za-z0-9]+)` and `([A-Za-z0-9]+)`', block):
            found.update(pair)
        return found

    def test_every_name_the_vendor_offers_is_accounted_for(self):
        for reply, table, pairs, placed_count in (
            ('GET_MapList_skin54.json', '## Harmony One, skin 54', '### Harmony One', 32),
            ('GET_MapList_skin71.json', '## Harmony 600, skin 71', '### Harmony 600', 36),
        ):
            with self.subTest(reply=reply):
                kinds = button_names(lab.response(reply))
                # A `RootButtonMap` is neither a device layout nor an activity's, and on the Harmony 600
                # it holds exactly the two activity keys, which send no infrared code at all and are
                # named by section 120's chain instead. So the population to compare against is the
                # activity and device maps, and the root map is asserted separately below.
                offered = kinds.get('ActivityButtonMap', set()) | kinds.get('DeviceButtonMap', set())
                placed = self.placed(table)
                self.assertEqual(len(placed), placed_count)
                accounted = placed | self.undecided(pairs)
                self.assertEqual(offered - accounted, set(), 'a name the document never placed')
                self.assertEqual(accounted - offered, set(), 'a name the vendor never offered')

    def test_the_root_map_holds_the_keys_that_send_nothing(self):
        """The exception, named, because `button-maps.md` already claims it in prose.

        Its "what is deliberately not here" section says the Harmony 600's activity keys are hard
        buttons in its maps and never appear in the table, because an activity key selects a handler set
        and sends nothing itself. This is that claim as a measurement: they are the whole content of the
        root map, and they are in no other map.
        """
        kinds = button_names(lab.response('GET_MapList_skin71.json'))
        self.assertEqual(kinds.get('RootButtonMap'), {'MovieActivity', 'WatchTVActivity'})
        others = kinds.get('ActivityButtonMap', set()) | kinds.get('DeviceButtonMap', set())
        self.assertEqual(kinds['RootButtonMap'] & others, set())


#: The three surfaces' button maps, read on 23 August 2026 once three favourite channels existed on the
#: Harmony One, plus the reply from ten days earlier that is the before half of the control.
CHANNEL_REPLIES = ('GetButtonMaps_skin54.json', 'GetButtonMaps_skin71.json',
                   'GetButtonMaps_skin22.json', 'GET_MapList_skin54.json')


def device_maps(maps):
    """The device maps in a `GetButtonMaps` reply, keyed on their own identifier."""
    return {m.get('ButtonMapIdentifier'): m
            for m in maps if m['__type'].split(':')[0] == 'DeviceButtonMap'}


def channel_buttons(reply):
    """Every button in a reply whose action carries a channel number."""
    found = []
    for button_map in reply['GetButtonMapsResult']:
        for button in button_map['Buttons']:
            action = button.get('ButtonAction') or {}
            if 'ButtonChannelAction' in str(action.get('__type')):
                found.append((button, action))
    return found


class AFavouriteChannelIsAButton(unittest.TestCase):
    """What the account states about a favourite channel, which is the input side of base slot 16.

    Base slot 16 is the one section of the config format read entirely out of firmware and populated by
    no file in the corpus, so a sample had to be manufactured: three favourite channels were created on
    a Harmony One for a television, labelled `Chan1`, `Chan100` and `Chan666`. This test is what the
    service says about them **before** anything is compiled, so that the compiled form is compared
    against a stated intent rather than against a memory of one.

    The claim is that a favourite channel is not a structure of its own. It is a soft button on the
    television's own device map, on a menu Logitech calls `FavoriteChannels`, whose action carries the
    channel and names the device.
    """

    def setUp(self):
        lab.require_responses(*CHANNEL_REPLIES)

    def test_the_three_channels_are_three_buttons_on_one_device(self):
        found = channel_buttons(lab.response('GetButtonMaps_skin54.json'))
        self.assertEqual(len(found), 3)
        # The channel is **text**, which is why these are compared as strings: a leading zero can be
        # authored, so nothing downstream may treat the field as a number.
        self.assertEqual([a['ChannelNumber'] for _, a in found], ['1', '100', '666'])
        self.assertEqual([b['TextOnRemote'] for b, _ in found], ['Chan1', 'Chan100', 'Chan666'])
        self.assertEqual([b['MenuItem']['MenuName'] for b, _ in found], ['FavoriteChannels'] * 3)
        self.assertEqual([b['MenuItem']['IndexInMenu'] for b, _ in found], [0, 1, 2])
        self.assertEqual([b['__type'].split(':')[0] for b, _ in found], ['SoftRemoteButton'] * 3)
        # All three name the same device, and it is one of the account's three.
        self.assertEqual({a['DeviceId']['Value'] for _, a in found}, {83281442})

    def test_the_feature_is_per_remote_and_not_per_household(self):
        """The other two remotes on the same account carry none, over the same three devices.

        Worth asserting because the alternative reading is that a channel belongs to the device, in
        which case every remote that drives that television would carry it.
        """
        for reply in ('GetButtonMaps_skin71.json', 'GetButtonMaps_skin22.json'):
            with self.subTest(reply=reply):
                self.assertEqual(len(channel_buttons(lab.response(reply))), 0)

    def test_creating_a_channel_added_exactly_three_buttons(self):
        """The before and after control, and the point is the two devices that did not move.

        The two reads are **different operations** ten days apart, `MapList` then `GetButtonMaps`, so a
        difference in one map proves nothing on its own: the two calls could simply count differently.
        The other two devices come back identical across both, which is what makes the third one's three
        extra buttons the three channels rather than an artefact of the call.
        """
        before = device_maps(lab.response('GET_MapList_skin54.json')['ButtonMaps'])
        after = device_maps(lab.response('GetButtonMaps_skin54.json')['GetButtonMapsResult'])
        for device, count in (('83281443', 77), ('83281444', 52)):
            with self.subTest(device=device):
                self.assertEqual(len(before['16417Device%s' % device]['Buttons']), count)
                self.assertEqual(len(after['device_%s' % device]['Buttons']), count)
        # The television is the one map whose identifier is gone, because it is the one that got saved.
        television = after[None]
        self.assertEqual(len(before['16417Device83281442']['Buttons']), 74)
        self.assertEqual(len(television['Buttons']), 77)
        self.assertEqual(len(channel_buttons(
            {'GetButtonMapsResult': [television]})), 3)

    def test_only_the_edited_device_has_a_saved_map(self):
        """A default map is named by a string and a saved one by a number, which is the state change.

        Before, none of the three devices had a saved map identifier. After, the television has one and
        the other two are still defaults. So authoring a channel persists that device's whole button map,
        which is why a writer cannot treat a channel as an addition to something it does not own.
        """
        before = device_maps(lab.response('GET_MapList_skin54.json')['ButtonMaps'])
        after = device_maps(lab.response('GetButtonMaps_skin54.json')['GetButtonMapsResult'])
        self.assertEqual([m.get('ButtonMapId') for m in before.values()], [None, None, None])
        saved = {k: (m.get('ButtonMapId') or {}).get('Value') is not None for k, m in after.items()}
        self.assertEqual(saved, {None: True, 'device_83281443': False, 'device_83281444': False})



if __name__ == '__main__':
    unittest.main()
