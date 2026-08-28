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
import io
import os
import re
import unittest

import lab
from harmony import gspm

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


SYNC_REPLIES = ('GetMyHousehold_account2_before_sync.json',
                'GetMyHousehold_account2_after_sync.json')


def only_remote(reply):
    """The one remote record in a household reply, which every account here has exactly one of."""
    accounts = reply['GetMyHouseholdResult']['Accounts']
    assert len(accounts) == 1, len(accounts)
    remotes = accounts[0]['Remotes']
    assert len(remotes) == 1, len(remotes)
    return remotes[0]


class ASyncIsRecordedWhenTheClientSaysSo(unittest.TestCase):
    """The account's record of a sync can disagree with the remote, and this is the pair that shows it.

    On 23 August 2026 the client refused to show its ordinary interface for the spare Harmony One,
    saying setup was not complete, and the re-sync it demanded failed until the machine was restarted.
    The household record was read either side of the sync that finally succeeded.

    **The control is outside the service.** That remote was already carrying the previous day's config,
    which is known from the remote itself rather than from anything Logitech states: it was read off
    over USB and filed as `one_spare_myharmony`, whose own accounting and round trip are asserted in
    `packages/codec/test/calibration.test.ts`. So a programmed remote and a record saying it had never
    been synced existed at the same moment.

    What the pair cannot establish is the mechanism, since it is one occurrence. See
    `docs/host-client.md` for the reading and for why the deliberate repeat is not worth doing.
    """

    def setUp(self):
        lab.require_responses(*SYNC_REPLIES)
        self.before = only_remote(lab.response(SYNC_REPLIES[0]))
        self.after = only_remote(lab.response(SYNC_REPLIES[1]))

    def test_the_account_had_no_record_of_any_sync_while_the_remote_was_programmed(self):
        """Both dates empty is the claim, and `FirstSyncDate` is the half that matters.

        A stale `LastSyncDate` would only say the account had lost track of the latest sync. An empty
        `FirstSyncDate` says it had never recorded one at all, which is what makes the disagreement with
        the hardware total rather than partial.
        """
        self.assertEqual(self.before['FirstSyncDate'], '')
        self.assertEqual(self.before['LastSyncDate'], '')

    def test_the_field_the_interface_keys_on_is_not_the_one_named_for_it(self):
        """`IsSyncRequired` is false on both sides, so it is not what refused the interface.

        Asserted because it is the field a reader would reach for first, and reaching for it would
        produce a client that cannot tell the broken state from the healthy one.
        """
        self.assertIs(self.before['IsSyncRequired'], False)
        self.assertIs(self.after['IsSyncRequired'], False)

    def test_the_sync_wrote_both_dates_at_once_and_moved_nothing_else(self):
        """The negative half: exactly two fields differ across the pair, and they hold one value.

        Both dates being equal is what says the service treated this as the remote's first sync. The
        rest of the record being byte for byte identical is what rules out the two reads having caught
        the account mid-change for some unrelated reason.
        """
        moved = sorted(k for k in set(self.before) | set(self.after)
                       if self.before.get(k) != self.after.get(k))
        self.assertEqual(moved, ['FirstSyncDate', 'LastSyncDate'])
        self.assertNotEqual(self.after['FirstSyncDate'], '')
        self.assertEqual(self.after['FirstSyncDate'], self.after['LastSyncDate'])

    def test_both_reads_are_the_same_remote(self):
        """Without this the pair could be two different remotes and the whole reading would dissolve."""
        for field in ('GlobalRemoteId', 'GlobalRemoteSkinId', 'SkinId'):
            with self.subTest(field=field):
                self.assertEqual(self.before[field], self.after[field])
        # Skin 54 is the Harmony One, which is the unit the control was read off.
        self.assertEqual(self.after['SkinId'], 54)


class SyncingAHarmonyTouchNeverCompilesAConfiguration(unittest.TestCase):
    """Section 202: MyHarmony's sync branches on the product's capabilities, and only one arm compiles.

    Why this is a test and not just a paragraph. The claim is about somebody else's code, which is the
    weakest kind of evidence this project accepts, so the least it can do is be recomputable: a reader
    who doubts it can re-run this against the same source rather than trust a summary. It also guards
    the specific mistake that produced the wrong version, which was reading a method **name** found in
    a compiled assembly as though it were a call site.

    Nothing of Logitech's text is reproduced. What is asserted is which operation is called and on what
    condition, which is functional fact rather than expression.
    """

    def setUp(self):
        lab.require('myharmony_sync_model', 'myharmony_update_manager')
        self.sync = lab.load('myharmony_sync_model').decode('utf-8', 'replace')
        self.update = lab.load('myharmony_update_manager').decode('utf-8', 'replace')

    def test_the_sync_route_is_chosen_by_the_products_capabilities(self):
        """The branch itself: two capabilities divert to provisioning before the compile arm is reached."""
        entry = self.sync[self.sync.index('public void SyncRemote()'):]
        entry = entry[:entry.index('private void')]
        # Capability numbers are the client's own enumeration: 16 provisioning, 18 certificate
        # activation, 12 locale. The first two reach the provisioning call and the third the compile.
        self.assertIn('UpdateProvisionSupportedRemote', entry)
        self.assertIn('UpdateRemote', entry)
        self.assertLess(entry.index('UpdateProvisionSupportedRemote'), entry.index('UpdateRemote(GlobalState'),
                        'the provisioning arms come first, so a Touch never reaches the compile arm')
        for capability in (16, 18, 12):
            with self.subTest(capability=capability):
                self.assertIn('SupportedCapability)%d' % capability, entry)

    def test_the_compile_the_sync_sends_is_the_one_this_project_already_sends(self):
        """The correction: `StartCompileWithLocale` is the simulator's call, not the sync's.

        Asserted from both ends, because the wrong reading was true of one end alone: the sync path
        sends the settings variant, and the plain variant appears only in the simulator's method.
        """
        self.assertIn('StartCompileWithLocaleAndSettingsAsync', self.update)
        self.assertNotIn('StartCompileWithLocaleAsync', self.update)
        simulator = self.sync[self.sync.index('public void CompileEZSim()'):]
        simulator = simulator[:simulator.index('protected void')]
        self.assertIn('StartCompileWithLocaleAsync', simulator)

    def test_the_provisioning_arm_declares_the_configuration_not_required(self):
        """What makes the negative structural rather than a gap: that route asks for no configuration."""
        arm = self.update[self.update.index('public void UpdateProvisionSupportedRemote'):]
        arm = arm[:arm.index('public void UpdateRemote')]
        self.assertIn('ConfigNotRequired = true', arm)
        self.assertNotIn('StartCompile', arm)


class AHarmonyTouchFetchesItsOwnConfiguration(unittest.TestCase):
    """Section 203: the remote issues the requests and the client performs them.

    The three things that make it a proxy rather than a download, each asserted separately so a partial
    refutation says which part moved.
    """

    def setUp(self):
        lab.require('myharmony_ds_controller')
        self.source = lab.load('myharmony_ds_controller').decode('utf-8', 'replace')

    def test_the_client_reads_a_request_list_off_the_remote(self):
        self.assertIn('DSRequest', self.source)
        self.assertIn('m_RequestQueue.Enqueue(request)', self.source)
        # A request carries a verb, which is what makes it an HTTP request rather than a command.
        self.assertIn('request.Verb', self.source)
        self.assertIn('request.URI', self.source)

    def test_the_session_is_the_remotes_and_carries_an_identifier(self):
        self.assertIn('m_SessionID', self.source)
        self.assertIn('?read&sessionId=', self.source)

    def test_two_request_forms_are_terminal_rather_than_fetches(self):
        for terminal in ('Finished', 'Abort'):
            with self.subTest(terminal=terminal):
                self.assertIn('request.URI.Contains("%s")' % terminal, self.source)


CLASSIC_SOURCE = ('software', 'classic', 'src')
#: Cookies at offset zero of a configuration container, one per architecture, plus the marker that
#: follows the pointer table. Section 20 for the framing and the key facts table in `CLAUDE.md`.
CONTAINER_COOKIES = ('GSPM', 'PTYY', 'TPTP', 'AHCM', 'WLWL')


def classic_sources():
    """Every decompiled Java file of the classic client, or None when the lab has not got them."""
    if not lab.LAB:
        return None
    root = os.path.join(lab.LAB, *CLASSIC_SOURCE)
    if not os.path.isdir(root):
        return None
    found = []
    for base, _dirs, files in os.walk(root):
        for name in files:
            if name.endswith('.java'):
                found.append(os.path.join(base, name))
    return found


class TheClassicClientIsAnExecutorAndNotABuilder(unittest.TestCase):
    """Section 204: it cannot build a configuration and never looks inside one.

    The note this came from argued it from **absent classes**, which is the weaker half: an absence of
    names is evidence about names. The test that carries the claim is the positive one below, that not
    one container cookie appears anywhere in the client, because a program that never recognises the
    four bytes at the front of a configuration is not a program that composes them.

    Nothing of Logitech's code is reproduced. What is asserted is the absence of a capability, which is
    functional fact.
    """

    def setUp(self):
        self.sources = classic_sources()
        if self.sources is None:
            self.skipTest('no decompiled classic client in the lab')
        # Exact, per this repository's own rule. The population moves only when somebody adds or
        # removes a file, and then it moves in the diff.
        self.assertEqual(len(self.sources), 642, 'decompiled Java files of the classic client')

    def read(self, path):
        with io.open(path, encoding='utf-8', errors='replace') as fh:
            return fh.read()

    def test_no_container_cookie_appears_anywhere_in_the_client(self):
        """The load bearing one. It does not parse a configuration, so it cannot have built one."""
        for cookie in CONTAINER_COOKIES:
            with self.subTest(cookie=cookie):
                naming = [p for p in self.sources if cookie in self.read(p)]
                self.assertEqual(naming, [], 'files naming the %s cookie' % cookie)

    def test_the_control_is_that_this_search_can_find_something(self):
        """Without it the test above passes on a search that matches nothing, whatever the client holds.

        `EZHex` is the file the client **does** handle, so it must be found, and finding it is what says
        the walk reached real source rather than an empty list.
        """
        naming = [p for p in self.sources if 'EZHex' in self.read(p)]
        self.assertEqual(len(naming), 20, 'files naming the configuration file extension')

    def test_it_models_no_activity_and_no_code_set(self):
        """The note's own argument, kept because it says something the cookie test does not."""
        names = sorted(os.path.basename(p)[:-len('.java')] for p in self.sources)
        for concept in ('Activity', 'Codeset', 'CodeSet', 'Compiler'):
            with self.subTest(concept=concept):
                self.assertEqual([n for n in names if concept in n], [])

    def test_every_class_named_for_a_device_is_transport_or_an_exception(self):
        """Thirty of them, and not one is an appliance: this is where the note could have gone wrong."""
        named = sorted(os.path.basename(p)[:-len('.java')] for p in self.sources
                       if 'Device' in os.path.basename(p))
        self.assertEqual(len(named), 30)
        for name in named:
            with self.subTest(name=name):
                self.assertTrue(
                    'Usb' in name or 'USB' in name or 'Exception' in name
                    or 'Controller' in name or name in ('DeviceProperties', 'DevicesStatusRunnable',
                                                        'TcpDeviceCommunicationChannel',
                                                        'HIDUsbDeviceCommunicationChannel'),
                    '%s is named for a device and is not transport' % name)


class TheClassicClientMeasuresACaptureAndJudgesNothing(unittest.TestCase):
    """Section 205: the only local acceptance test is a duration window; the server decided the rest.

    The two claims that carry weight are the negative one, that no classification happens on the host,
    and the merge, which agrees with section 164 by a route with nothing in common. Both are asserted
    against the source rather than summarised, because a negative claim about somebody else's code is
    the easiest kind to get wrong by not looking hard enough.
    """

    RECORDER = ('clientcommon', 'com', 'logitech', 'harmony', 'common', 'device', 'services',
                'learnir', 'CarrierRecorder.java')
    OPERATION = ('clientcommon', 'com', 'logitech', 'harmony', 'common', 'operation',
                 'LearningOperation.java')

    def setUp(self):
        if not lab.LAB:
            self.skipTest('no lab directory')
        root = os.path.join(lab.LAB, *CLASSIC_SOURCE)
        if not os.path.isdir(root):
            self.skipTest('no decompiled classic client in the lab')
        self.recorder = self.read(os.path.join(root, *self.RECORDER))
        self.operation = self.read(os.path.join(root, *self.OPERATION))

    def read(self, path):
        with io.open(path, encoding='utf-8', errors='replace') as fh:
            return fh.read()

    def test_the_carrier_is_measured_from_the_remotes_own_cycle_count(self):
        """Not a table lookup and not an assumption, which is what makes it comparable to section 92."""
        self.assertIn('i_numClocksInInitialEnvelope', self.recorder)
        self.assertIn('i_initialEnvelopeTimeInMicroseconds / i_numClocksInInitialEnvelope',
                      self.recorder)
        self.assertIn('1000000.0 / periodInMicroseconds', self.recorder)

    def test_adjacent_durations_of_one_kind_are_added_rather_than_appended(self):
        """Section 164's merge, in the vendor's own capture path and reached by a different argument."""
        self.assertIn('addTimeInMicroseconds', self.recorder)
        merge = self.recorder[self.recorder.index('public void onCarrierIrDuration'):]
        merge = merge[:merge.index('public void onCarrierIrFinished')]
        self.assertIn('isCarrier() == i_isCarrier', merge)
        self.assertIn('addTimeInMicroseconds(i_timeInMicroseconds)', merge)

    def test_the_only_acceptance_test_is_a_duration_window(self):
        """Ten milliseconds to one second, and nothing else stands between a capture and the upload."""
        self.assertIn('MIN_CARRIER_LENGTH = 10000', self.operation)
        self.assertIn('MAX_CARRIER_LENGTH = 1000000', self.operation)
        self.assertIn('infraredLength < 10000', self.operation)
        self.assertIn('infraredLength > 1000000', self.operation)

    def test_the_verdict_comes_back_from_the_server(self):
        """`TRYAGAIN` plus user messages, which is a judgement the host asks for rather than makes."""
        self.assertIn('TRYAGAIN', self.operation)
        self.assertIn('uploadDataToWebsite', self.operation)

    def test_nothing_on_the_host_classifies_a_capture(self):
        """The negative that section 42 predicted, checked over the whole client and not just this file."""
        sources = classic_sources()
        self.assertIsNotNone(sources)
        for word in ('protocol family', 'RC5', 'RC6', 'NEC ', 'codeset', 'CodeSet'):
            with self.subTest(word=word):
                naming = [p for p in sources if word in self.read(p)]
                self.assertEqual(naming, [], 'files naming %r' % word)


#: The per architecture constant classes in the classic client's HID layer, section 206. One file per
#: architecture, each a list of `private static final int`. They are `private` and nothing outside them
#: names them, because the compiler inlined every use, so what survives decompilation is a declaration
#: list: a table of names against values and no code. That is why it reads as documentation.
PROTOCOL_CLASSES = ('software', 'classic', 'src', 'hidcommands', 'com', 'logitech', 'harmony',
                    'hid', 'core')
#: Which remote each of the seven is about. The four this project reads are the four it can check.
PROTOCOL_ARCHITECTURES = (2, 3, 7, 8, 9, 12, 14)


def protocol_constants(architecture):
    """Every `static final int` of one Protocol class, as a name to value mapping.

    Recomputed from the source each run rather than transcribed, for the reason the module docstring
    gives: a table typed out once is a table nobody can check against the thing it came from.
    """
    if not lab.LAB:
        return None
    path = os.path.join(lab.LAB, *PROTOCOL_CLASSES)
    path = os.path.join(path, 'Protocol%d.java' % architecture)
    if not os.path.isfile(path):
        return None
    with io.open(path, encoding='utf-8', errors='replace') as fh:
        text = fh.read()
    found = {}
    for name, value in re.findall(
            r'static final int ([A-Z_0-9]+)\s*=\s*(0[xX][0-9a-fA-F]+|-?\d+)', text):
        found[name] = int(value, 0)
    return found


class TheClassicClientCarriesAPerArchitectureConstantTable(unittest.TestCase):
    """The seven per architecture tables, recomputed and checked against our own derivations.

    **These tables are not a new find.** They were extracted on 9 August 2026 and `docs/host-client.md`
    is built on them; section 206 is the day a later session dug them up again from the same source
    and had to be told so by its own register. What that session did leave behind is this class, which
    is the thing the ledger never had: an executable check. Every number below is one this project
    derived on its own, from the firmware or from the corpus, and the client is the second route.

    Client sourced under decision 2, so the firmware and the corpus stay the authority. Nothing of
    Logitech's code is reproduced: what travels is numbers this repository already publishes.
    """

    def setUp(self):
        self.tables = {}
        for architecture in PROTOCOL_ARCHITECTURES:
            table = protocol_constants(architecture)
            if table is None:
                self.skipTest('no decompiled classic client in the lab')
            self.tables[architecture] = table

    def test_all_seven_tables_are_present_and_carry_constants(self):
        """The control. Without it every assertion below passes on an empty mapping."""
        self.assertEqual(sorted(self.tables), sorted(PROTOCOL_ARCHITECTURES))
        sizes = {a: len(t) for a, t in self.tables.items()}
        self.assertEqual(sizes, {2: 26, 3: 14, 7: 13, 8: 29, 9: 26, 12: 43, 14: 54})

    def test_the_pointer_table_starts_where_section_20_corrected_it_to(self):
        """`0x0B`, not `0x0C`, on every architecture whose table states it.

        Section 20's correction, which both parsers here had wrong: an item is a spare byte and a
        three byte address, so the table begins one byte earlier than a `u32` reading suggests.
        """
        for architecture in (8, 9, 12, 14):
            with self.subTest(architecture=architecture):
                table = self.tables[architecture]
                self.assertEqual(table['ADDRESS_MAGIC_SECTION_START'], gspm.SECTION_TABLE_OFFSET)
                self.assertEqual(table['ITEM_SIZE'], gspm.SECTION_ITEM_SIZE)
                self.assertEqual(table['POINTER_SIZE'], 3)

    def test_the_section_count_is_the_pointer_count_this_project_reads(self):
        """22 on the Harmony One and 20 on the other three, which is what the containers carry."""
        counts = {a: self.tables[a]['NUM_SECTIONS'] for a in (7, 8, 9, 12, 14)}
        self.assertEqual(counts, {7: 20, 8: 20, 9: 20, 12: 22, 14: 20})

    def test_the_trailer_offset_closes_on_the_table_it_follows(self):
        """`section start + 4 * count`, exactly, wherever both ends are stated.

        The same arithmetic that made section 20's reading believable, arriving from the other side:
        it is the vendor's own two numbers agreeing with the vendor's own third.
        """
        for architecture in (8, 9, 12):
            with self.subTest(architecture=architecture):
                table = self.tables[architecture]
                self.assertEqual(
                    table['ADDRESS_MAGIC_TRAILER'],
                    table['ADDRESS_MAGIC_SECTION_START'] + table['ITEM_SIZE'] * table['NUM_SECTIONS'])

    def test_the_first_four_sections_carry_the_vendors_own_names(self):
        """Base slots 0 to 3, named identically on all five architectures that have a section table.

        `SECTION_FLASH_STORAGE` is base slot 2, which section 47 read as the log area from the
        firmware and named for itself; `SECTION_CLOCK` is base slot 3.
        """
        for architecture in (7, 8, 9, 12, 14):
            with self.subTest(architecture=architecture):
                table = self.tables[architecture]
                self.assertEqual(table['SECTION_DATA'], 0)
                self.assertEqual(table['SECTION_COMPILE_INFORMATION'], 1)
                self.assertEqual(table['SECTION_FLASH_STORAGE'], 2)
                self.assertEqual(table['SECTION_CLOCK'], 3)

    def test_the_clock_records_frame_is_the_one_section_21_derived(self):
        """`0xADDF` and `0xEFBF`, which this project found by searching for a repeated pair."""
        header = int.from_bytes(gspm.CLOCK_COOKIE, 'little')
        trail = int.from_bytes(gspm.CLOCK_END, 'little')
        for architecture in (8, 12):
            with self.subTest(architecture=architecture):
                table = self.tables[architecture]
                self.assertEqual(table['CONFIGURATION_BASE_DATE_MAGIC_HEADER'], header)
                self.assertEqual(table['CONFIGURATION_BASE_DATE_MAGIC_TRAIL'], trail)

    def test_the_oldest_generation_frames_its_clock_one_less(self):
        """`0xADDE` and `0xEFBE` on the second architecture, which is a generation this project holds
        nothing else on. The pair moved by one at some point and the corpus cannot see it, because no
        container here is older than arch 8."""
        table = self.tables[2]
        self.assertEqual(table['CONFIGURATION_BASE_DATE_MAGIC_HEADER'], 0xADDE)
        self.assertEqual(table['CONFIGURATION_BASE_DATE_MAGIC_TRAIL'], 0xEFBE)

    def test_the_magic_header_word_is_the_cookies_first_two_bytes_except_on_one_architecture(self):
        """And the exception is asserted rather than explained away.

        Arch 8 is `TP` of `TPTP`, arch 9 is `AH` of `AHCM`, arch 7 is `BM`, which corroborates
        concordance's `BMBM` for a generation nobody here has a sample of. Arch 12 and arch 14 both
        carry `GSPM` and their words are `PM` and `QM`, so the rule does not hold there and what the
        client is matching on those two is unread.
        """
        pairs = {a: self.tables[a]['MAGIC_HEADER'].to_bytes(2, 'little')
                 for a in (7, 8, 9, 12, 14)}
        self.assertEqual(pairs[8], b'TP')
        self.assertEqual(pairs[9], b'AH')
        self.assertEqual(pairs[7], b'BM')
        self.assertEqual(pairs[12], b'PM')
        self.assertEqual(pairs[14], b'QM')

    def test_three_named_offsets_are_the_item_layout_stated_a_fourth_time(self):
        """`CONFIGURATION_DATA`, `..._EVENT` and `..._BASEDATE` are base slots 0, 2 and 3's address
        fields, each one byte past its item's start.

        That `+ 1` is the spare byte, so these three constants restate section 20's
        `{ u8 spare; u24 address }` without ever saying so, and they restate it on the one
        architecture whose table does not begin at `0x0B`: arch 7's begins at 8, which is what its
        trailer implies, and all three offsets follow.
        """
        for architecture in (7, 8, 9, 12, 14):
            with self.subTest(architecture=architecture):
                table = self.tables[architecture]
                start = table.get('ADDRESS_MAGIC_SECTION_START')
                if start is None:
                    # Arch 7 states no section start. Recover it from the trailer, which is the only
                    # other end of the same table, and the three offsets then have to agree with it.
                    start = table['ADDRESS_MAGIC_TRAILER'] - table['ITEM_SIZE'] * table['NUM_SECTIONS']
                    self.assertEqual(start, 8)
                item = table['ITEM_SIZE']
                self.assertEqual(table['CONFIGURATION_DATA_OFFSET'], start + item * 0 + 1)
                self.assertEqual(table['CONFIGURATION_EVENT_OFFSET'], start + item * 2 + 1)
                self.assertEqual(table['CONFIGURATION_BASEDATE_OFFSET'], start + item * 3 + 1)

    def test_the_two_oldest_generations_have_no_section_table_at_all(self):
        """Arch 2 and arch 3 name no sections and no item size, and their three offsets are not four
        apart, so the pointer table is something the format grew rather than something it had."""
        for architecture in (2, 3):
            with self.subTest(architecture=architecture):
                table = self.tables[architecture]
                self.assertNotIn('NUM_SECTIONS', table)
                self.assertNotIn('ITEM_SIZE', table)
                self.assertNotIn('SECTION_CLOCK', table)

    def test_the_configuration_bases_are_the_ones_in_the_key_facts_table(self):
        """`0x040000` on the Harmony One and `0x030000` on the Harmony 600 and 700."""
        self.assertEqual(self.tables[12]['CONFIGURATION_BASE'], 0x040000)
        self.assertEqual(self.tables[14]['CONFIGURATION_BASE'], 0x030000)

    def test_the_stored_application_is_where_the_write_rail_puts_its_ceiling(self):
        """`0x3D0000` for `0x20000`, inside the nominally writable configuration region.

        That overlap is the reason `packages/usb` refuses an erase above `0x3D0000` rather than up to
        the end of the part, and it was adopted from Logitech's host software with no firmware behind
        it. This is a second, independent statement of the same two numbers.
        """
        table = self.tables[12]
        self.assertEqual(table['CODE_NORMAL_APP_ADDRESS'], 0x3D0000)
        self.assertEqual(table['CODE_NORMAL_APP_SIZE'], 0x20000)
        self.assertEqual(table['CODE_USER_CONFIGURATION_ADDRESS'], 0x040000)
        self.assertEqual(table['CODE_USER_CONFIGURATION_SIZE'], 0x400000 - 0x040000)

    def test_the_harmony_525s_two_firmware_images_are_where_the_bench_found_them(self):
        """`0x800000` and `0x810000`, read off the remote on 8 and 11 August 2026, section 118.

        The safe mode image and the application, both identified from their own headers at the time
        and then confirmed by a stranded remote reporting the safe mode one's version accessors.
        """
        table = self.tables[9]
        self.assertEqual(table['CODE_SAFEMODE_ADDRESS'], 0x800000)
        self.assertEqual(table['CODE_APP_FIRMWARE_ADDRESS'], 0x810000)
        self.assertEqual(table['CODE_BOOT_ONLY_ADDRESS'], 0x000000)
        self.assertEqual(table['CODE_BOOT_ONLY_SIZE'], 0x1000)

    def test_the_harmony_525s_eeprom_window_is_the_one_section_118_measured(self):
        """Top byte `0x20`, which that section read as 256 bytes of EEPROM inside the address space
        the protocol calls flash. The client calls the same number a virtual EEPROM address."""
        self.assertEqual(self.tables[9]['VIRTUAL_PIC_EEPROM_ADDRESS'], 0x200000)


class TheThreeRegionsTheLedgerCouldNotExplain(unittest.TestCase):
    """Section 206: two of the client's unexplained arch 12 regions, and its arch 14 logging region.

    All three sat in `docs/host-client.md` as client sourced and unconfirmed for nineteen days while
    the bytes that settle them were already in the lab. None of this needed a remote, a disassembler
    or a service call, which is the whole point of recording it.
    """

    #: Internal program page `0xFF` covers `0x010000` to `0x020000`, so an address in that page is at
    #: `address - PAGE_FF_BASE` of the image.
    PAGE_FF_BASE = 0x010000
    #: What the client calls a support library, and what section 191 read as the external flash
    #: programmer the application calls at `0x01E018`.
    PIC_LIBRARY = (0x01E000, 0x1000)
    #: What the client calls a programmable logic device image, which is a claim about the hardware
    #: rather than about the memory map: nothing else here suggests a Harmony One carries one.
    CPLD_IMAGE = (0x010000, 0x4000)
    #: Section 191's figure, from the other end: the resident programmer is 601 bytes.
    PROGRAMMER_BYTES = 601

    def setUp(self):
        names = ('one_page_ff', 'one_spare_page_ff', 'h600_page_ff')
        # Guard up front rather than per image, so a half present lab skips the whole claim instead
        # of asserting a count over whichever units happen to be there.
        lab.require(*names)
        self.pages = {name: lab.load(name) for name in names}

    #: Every region the client names in this page, address and size. `PIC_CONFIG` is the part's own
    #: configuration words, which are a PIC18 fact rather than a Logitech one and sit at the top of
    #: program memory on this family.
    NAMED_REGIONS = ((0x010000, 0x4000), (0x01E000, 0x1000), (0x01F400, 0x400),
                     (0x01F800, 0x400), (0x01FFF8, 8))

    def named(self, address, shift=0):
        """Whether an address falls inside a region the client names."""
        return any(start + shift <= address < start + shift + size
                   for start, size in self.NAMED_REGIONS)

    def used(self, image, address, size):
        """How many bytes of a region are not erased flash."""
        start = address - self.PAGE_FF_BASE
        return sum(1 for b in image[start:start + size] if b != 0xFF)

    def test_the_support_library_holds_exactly_section_191s_programmer(self):
        """601 bytes, on both Harmony Ones, which is the figure that section read off the code.

        Two routes with nothing in common: section 191 measured the routine by disassembling it and
        matching it against the copy inside the safe mode image, and this counts the bytes of the
        region the client names. So `a support library` is not a lead any more, it is the external
        flash programmer, and the row in the ledger can say so.
        """
        for name in ('one_page_ff', 'one_spare_page_ff'):
            with self.subTest(unit=name):
                self.assertEqual(self.used(self.pages[name], *self.PIC_LIBRARY),
                                 self.PROGRAMMER_BYTES)

    def test_the_programmable_logic_image_is_populated_rather_than_reserved(self):
        """5939 bytes of 16384 on both Harmony Ones, so the region is used and not merely declared.

        That does not read the image and does not confirm what the device is. It moves the claim from
        `the client says there is a CPLD` to `there is an image where the client says one is`, which
        is the difference between a name and a region nobody has looked in.
        """
        for name in ('one_page_ff', 'one_spare_page_ff'):
            with self.subTest(unit=name):
                self.assertEqual(self.used(self.pages[name], *self.CPLD_IMAGE), 5939)

    def test_every_used_byte_of_a_harmony_ones_second_internal_page_is_named(self):
        """6627 bytes on each of the two units, and every one inside a region the client names.

        This is the closure, and it is stronger than either count above, because a wrong map does not
        merely give a wrong number here, it leaves bytes outside every region. The page is the logic
        device image, then forty kilobytes of erased flash, then the programmer, then the per unit
        settings section 150 read, then the part's own configuration words at the very top.

        The Harmony 600 is deliberately not in this test. Its application firmware lives in internal
        flash and occupies the same page, so there is nothing for a map of empty space to close on.
        That is the per architecture difference rather than a gap in the evidence: on a Harmony One
        the configuration and the application are both in external flash, which is what leaves this
        page free enough to be accounted for.
        """
        for name in ('one_page_ff', 'one_spare_page_ff'):
            with self.subTest(unit=name):
                image = self.pages[name]
                used = [self.PAGE_FF_BASE + i for i, b in enumerate(image) if b != 0xFF]
                self.assertEqual(len(used), 6627)
                outside = [a for a in used if not self.named(a)]
                self.assertEqual(outside, [])

    def test_the_map_covers_a_third_of_the_page_and_holds_all_of_its_content(self):
        """The control, and it is about width rather than position.

        A map that named the whole page would close on anything, so the question is how much of the
        page it leaves out: 22536 bytes of 65536, a little over a third, and the other 43000 hold not
        one byte that is not erased flash. Shifting the map instead is the weaker control and was
        tried first: the logic device region alone is 16 KiB, so a shift of `0x100` still covers all
        but 551 of the used bytes, which would read as a near miss rather than a refutation.
        """
        covered = sum(size for _, size in self.NAMED_REGIONS)
        self.assertEqual(covered, 22536)
        image = self.pages['one_page_ff']
        unnamed_and_used = [i for i, b in enumerate(image)
                            if b != 0xFF and not self.named(self.PAGE_FF_BASE + i)]
        self.assertEqual(unnamed_and_used, [])
        self.assertEqual(len(image) - covered, 65534 - 22536)

class TheArch14LoggingRegionIsWhatItsSafeModeConfigsDeclare(unittest.TestCase):
    """Section 206: a client sourced number the corpus turns out to state, exactly.

    `docs/host-client.md` listed `USERLOGGING_BASE` as a smaller lead: arch 14 declares a 128 KiB
    logging region at `0x0E0000`, and since section 47 found the log area's writer is arch 12 only,
    all that could be said was that the region exists on paper. Every arch 14 safe mode container in
    the corpus declares exactly that range in base slot 2, so it comes off the unconfirmed ledger.

    The user configs of the same architecture declare a range one megabyte higher, which is the top
    128 KiB of a part twice the size, and the two are recorded side by side rather than reconciled.
    """

    #: `USERLOGGING_BASE` and `USERLOGGING_SIZE` from the arch 14 table.
    CLIENT_REGION = (0x0E0000, 0x20000)
    #: The three arch 14 containers Logitech shipped inside firmware, which are the ones that agree.
    SAFE_MODE = ('h600_safemode_gspm', 'h700_gspm', 'h650_safemode_gspm')
    #: The three arch 14 configurations compiled for a remote, which declare the higher range.
    USER_CONFIGS = ('h600_config', 'h700_config', 'h700_config_2')

    def setUp(self):
        table = protocol_constants(14)
        if table is None:
            self.skipTest('no decompiled classic client in the lab')
        self.table = table
        lab.require(*(self.SAFE_MODE + self.USER_CONFIGS))

    def declared(self, name):
        """Base slot 2's start and limit, as the container states them."""
        container = gspm.parse(lab.load(name))
        raw = gspm.arch_slot(container.architecture, gspm.LOG_SLOT)
        section = container.sections[raw]
        blob = container.blob
        at = section.address - container.flash_base
        # Eight bytes on arch 14: a u16 capacity, then two three byte addresses.
        start = int.from_bytes(blob[at + 2:at + 5], 'little')
        limit = int.from_bytes(blob[at + 5:at + 8], 'little')
        return start, limit

    def test_the_client_states_the_region_the_shipped_containers_declare(self):
        """`0x0E0000` to `0x100000`, on all three, against the client's base and size."""
        base, size = self.CLIENT_REGION
        self.assertEqual(self.table['USERLOGGING_BASE'], base)
        self.assertEqual(self.table['USERLOGGING_SIZE'], size)
        for name in self.SAFE_MODE:
            with self.subTest(container=name):
                self.assertEqual(self.declared(name), (base, base + size))

    def test_a_compiled_configuration_puts_it_a_megabyte_higher(self):
        """`0x1E0000` to `0x200000`, which is the same 128 KiB at the top of a 2 MiB part.

        Section 192 read arch 14's external medium as ending at `0x200000`, so a compiled config
        reserves the top of the part it is actually on and the shipped containers reserve the top of
        one half that size. Which of the two a given remote wants is not established here, and it
        matters to a writer, because base slot 2 is a field a save would have to reproduce.
        """
        base, size = self.CLIENT_REGION
        for name in self.USER_CONFIGS:
            with self.subTest(container=name):
                start, limit = self.declared(name)
                self.assertEqual((start, limit), (0x1E0000, 0x200000))
                self.assertEqual(limit - start, size)
                self.assertEqual(start - base, 0x100000)


class TheClientPicksATransportFromTheProductId(unittest.TestCase):
    """Section 207: three unit factories, and only one of them speaks the command protocol.

    This is the claim `packages/usb`'s `isTunnelledRemote` rests on, so it is checked against the
    client's own source rather than remembered. What travels is which platform names appear in which
    factory, which is functional fact of the kind the interoperability rule covers.
    """

    RESOURCES = ('software', 'classic', 'res', 'client', 'device.properties')
    HID_FACTORY = ('hidcommands', 'com', 'logitech', 'harmony', 'hid', 'unit',
                   'HidUnitFactoryImp.java')
    CAPPUCCINO_FACTORY = ('cappuccino', 'com', 'logitech', 'harmony', 'cappuccino', 'unit',
                          'CappuccinoUnitFactory.java')
    COGNAC_FACTORY = ('cognac', 'com', 'logitech', 'harmony', 'cognac', 'unit',
                      'CognacUnitFactory.java')

    def setUp(self):
        if not lab.LAB:
            self.skipTest('no lab directory')
        self.properties = os.path.join(lab.LAB, *self.RESOURCES)
        root = os.path.join(lab.LAB, *CLASSIC_SOURCE)
        if not os.path.isfile(self.properties) or not os.path.isdir(root):
            self.skipTest('no decompiled classic client in the lab')
        self.root = root

    def read(self, *parts):
        with io.open(os.path.join(self.root, *parts), encoding='utf-8', errors='replace') as fh:
            return fh.read()

    def skins(self, platform):
        """The skins one platform's keys name, recomputed from the shipped properties file."""
        with io.open(self.properties, encoding='utf-8', errors='replace') as fh:
            text = fh.read()
        pattern = r'Device\.%s\.Skin\d+\s*=\s*(\d+)' % re.escape(platform)
        return sorted(int(value) for value in re.findall(pattern, text))

    def test_the_platforms_the_hid_factory_accepts_are_the_ones_we_read(self):
        """Espresso, Mocha and Gin, and nothing else reaches a command report.

        Those are architectures 8, 9 and 12, plus arch 14, whose skins the file lists inside the
        Mocha group with the Molson name in a comment. So the HID family is exactly the four
        architectures `packages/usb` opens.
        """
        source = self.read(*self.HID_FACTORY)
        for platform in ('Espresso', 'Mocha', 'Gin'):
            with self.subTest(platform=platform):
                self.assertIn('get%sSkins()' % platform, source)
        for platform in ('Cappuccino', 'Whisky', 'Sugar', 'Cognac'):
            with self.subTest(platform=platform, absent=True):
                self.assertNotIn('get%sSkins()' % platform, source)

    def test_the_other_two_factories_take_the_platforms_the_first_refuses(self):
        """And they put a datagram channel on the wire instead of command reports.

        The names asserted are class names in the client, which is what makes this a check on the
        transport rather than on a comment: a factory that constructed a plain channel would not
        mention them.
        """
        cappuccino = self.read(*self.CAPPUCCINO_FACTORY)
        for platform in ('Cappuccino', 'Whisky', 'Sugar'):
            with self.subTest(platform=platform):
                self.assertIn('get%sSkins()' % platform, cappuccino)
        self.assertIn('UdpTcpUsbDeviceCommunicationChannel', cappuccino)
        self.assertNotIn('HidChannel', cappuccino)

        cognac = self.read(*self.COGNAC_FACTORY)
        self.assertIn('getCognacSkins()', cognac)
        self.assertIn('TcpDeviceCommunicationChannel', cognac)
        self.assertIn('usblan', cognac)

    def test_the_two_platforms_this_project_can_check_carry_the_skins_it_measured(self):
        """The calibration, and the only part of the map with a second source.

        Skin 15 is a Harmony 880 and 17 an 885, both arch 8, and the file puts both in Espresso; 22
        is the bench Harmony 525, arch 9, and it is in Mocha; 19 is a Harmony 890 and 23 an 895, both
        arch 10, and both are in Cappuccino. Each of those five was measured here from a config or a
        remote before this file was read.
        """
        self.assertIn(15, self.skins('Espresso'))
        self.assertIn(17, self.skins('Espresso'))
        self.assertIn(22, self.skins('Mocha'))
        self.assertIn(19, self.skins('Cappuccino'))
        self.assertIn(23, self.skins('Cappuccino'))

    def test_gin_is_one_skin_and_the_harmony_one_is_it(self):
        """54 alone, which section 131 concluded from the allocation gaps and this states outright."""
        self.assertEqual(self.skins('Gin'), [54])

    def test_one_skin_is_in_two_platforms_and_that_is_recorded_rather_than_resolved(self):
        """46 is listed under both Espresso and Mocha, which no reading here explains.

        It matters because the factory chain tries Cognac, then Cappuccino, then HID, and both
        groups that hold 46 are inside the HID one, so the client cannot notice. Recorded so that a
        later reading of the skin table does not treat the platform map as a function.
        """
        self.assertIn(46, self.skins('Espresso'))
        self.assertIn(46, self.skins('Mocha'))
        overlaps = set(self.skins('Espresso')) & set(self.skins('Mocha'))
        self.assertEqual(overlaps, {46}, 'the only skin two platforms share')

    def test_the_join_with_the_model_names_has_the_shape_the_reference_states(self):
        """35 of 46 named skins placed, 11 not, and 17 placed that no name covers.

        `reference/models.md` publishes the join, so the counts are asserted here rather than left to
        a reader to recount. The nine unplaced 6xx and 7xx models are unplaceable for a stated reason
        and the check for that is the next assertion: their platform key holds a product id and no
        skin list, which is why they fall out of a skin keyed join at all.
        """
        placed = {}
        with io.open(self.properties, encoding='utf-8', errors='replace') as fh:
            text = fh.read()
        for platform, skin in re.findall(r'Device\.([A-Za-z.]+)\.Skin\d+\s*=\s*(\d+)', text):
            placed.setdefault(int(skin), set()).add(platform)

        named = set()
        remote = os.path.join(lab.LAB, 'software', 'classic', 'res', 'client', 'skins', 'logitech',
                              'intl', 'remote', 'remote.properties')
        if not os.path.isfile(remote):
            self.skipTest('no skin bundle in the lab')
        with io.open(remote, encoding='utf-8', errors='replace') as fh:
            for line in fh:
                match = re.match(r'Remote\.Skin\d+\s*=\s*(\d+)', line)
                if match:
                    named.add(int(match.group(1)))

        self.assertEqual(len(named), 46, 'skins the client has a model name for')
        self.assertEqual(len(placed), 52, 'skins the client places on a platform')
        self.assertEqual(len(named & set(placed)), 35, 'skins with both')
        self.assertEqual(sorted(named - set(placed)), [3, 7, 9, 10, 11, 12, 13, 14, 16, 50, 58])
        self.assertEqual(sorted(set(placed) - named),
                         [26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 37, 38, 42, 43, 46, 47, 51])

        # The old 6xx and 7xx family is keyed by product id and carries no skin list, which is the
        # reason nine of the eleven fall out. Asserting the absence alone would not show that.
        self.assertIn('Device.Intrigue.ProductId1', text)
        self.assertNotIn('Device.Intrigue.Skin', text)

    def test_the_platform_groups_are_transports_and_not_architectures(self):
        """The Harmony 700, 600 and 650 sit in the group whose other members are Harmony 525s.

        This is the assertion that stops the table in `reference/models.md` being read as an
        architecture map. Skins 66, 71 and 72 are architecture 14 and skin 22 is architecture 9, and
        all four are in Mocha, because what the group decides is which driver speaks to the remote.
        """
        mocha = set(self.skins('Mocha'))
        for skin in (66, 71, 72):
            with self.subTest(skin=skin):
                self.assertIn(skin, mocha, 'an arch 14 remote in the arch 9 platform group')
        self.assertIn(22, mocha, 'and the Harmony 525 is in it too, which is the point')

    def test_two_cognac_skins_are_marked_as_having_no_zwave(self):
        """A subset key, which is what makes the Z-Wave module a platform feature rather than a
        transport one, and corroborates concordance's name for the range from the other side."""
        self.assertEqual(self.skins('Cognac.NoZwave'), [52, 56])
        for skin in (52, 56):
            self.assertIn(skin, self.skins('Cognac'))


if __name__ == '__main__':
    unittest.main()
