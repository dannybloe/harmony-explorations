"""What the platform calls a device's commands, and how a function map is shaped. Section 220.

`UserAccountDirector/FunctionList` returns one map per appliance and one per activity, each a set of
named groups of functions. It is the layer a configuration does not have: a config addresses infrared
codes by number, and this names them.

Two accounts, captured on 30 August 2026, which is what makes the split below a measurement rather
than a description of one household. Needs the lab, since the replies carry account and device
identifiers and stay there.
"""
import collections
import json
import os
import pathlib
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lab  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
MODEL = json.loads((ROOT / 'reference' / 'myharmony-model.json').read_text(encoding='utf-8'))

#: The reply per account, as (label, filename, account selector).
CAPTURES = (
    ('account 1', 'FunctionList_30aug_1.json', 1),
    ('account 2', 'FunctionList.json', 2),
)


def maps(filename, account):
    return lab.response(filename, account)['FunctionMaps']


def kind(entry):
    """The contract name the reply states for itself, without the namespace it carries."""
    return entry['__type'].split(':')[0]


class AFunctionMapIsPerApplianceOrPerActivity(unittest.TestCase):
    """The vendor's own data says the two maps are the same shape, which is the operating concept.

    `docs/how-a-harmony-works.md` states that a device's map and an activity's map are two maps of
    the same keypad, authored separately. Here that is Logitech's schema: both contracts extend one
    `AbstractFunctionMap` carrying the groups, and each adds only the identifier of what it belongs
    to.
    """

    def setUp(self):
        for _label, filename, account in CAPTURES:
            lab.require_responses(filename, account=account)

    def test_both_map_contracts_extend_one_abstract_map(self):
        entities = MODEL['entities']
        for name in ('DeviceFunctionMap', 'ActivityFunctionMap'):
            with self.subTest(name):
                self.assertIn('AbstractFunctionMap', entities[name]['extends'])
        shared = {f['name'] for f in entities['AbstractFunctionMap']['fields']}
        self.assertEqual(shared, {'FunctionGroups', 'UIModeName'})
        self.assertEqual([f['name'] for f in entities['DeviceFunctionMap']['fields']], ['DeviceId'])
        self.assertEqual([f['name'] for f in entities['ActivityFunctionMap']['fields']], ['ActivityId'])

    def test_a_device_map_names_the_default_mode_and_an_activity_map_names_its_activity(self):
        """The mode name is what tells the two apart in a reply, and it is not free text."""
        for label, filename, account in CAPTURES:
            for entry in maps(filename, account):
                with self.subTest('%s %s' % (label, entry['UIModeName'])):
                    if kind(entry) == 'DeviceFunctionMap':
                        self.assertEqual(entry['UIModeName'], 'Functions.Default')
                        self.assertIn('DeviceId', entry)
                    else:
                        self.assertEqual(kind(entry), 'ActivityFunctionMap')
                        self.assertTrue(entry['UIModeName'].startswith('Functions.UserConfigurator.'))

    def test_the_two_accounts_hold_the_counts_the_finding_states(self):
        counted = {}
        for label, filename, account in CAPTURES:
            counted[label] = collections.Counter(kind(e) for e in maps(filename, account))
        self.assertEqual(counted['account 1'], {'DeviceFunctionMap': 4, 'ActivityFunctionMap': 2})
        self.assertEqual(counted['account 2'], {'DeviceFunctionMap': 10, 'ActivityFunctionMap': 7})


class ANamedGroupStatesNoTransportAndMiscellaneousStatesInfrared(unittest.TestCase):
    """The split with no exceptions, over 1191 functions on two accounts.

    A function in one of the platform's named groups, `Power`, `Volume`, `NumericBasic` and the
    rest, states its transport as `None`; a function in `Miscellaneous` states `Infrared`. So the
    named groups are the platform's canonical, transport independent button vocabulary and
    `Miscellaneous` holds what exists only as a concrete infrared command for that appliance.

    Asserted as an exact partition rather than as a tendency, because a single exception would mean
    the reading is wrong rather than that the number moved.
    """

    TRANSPORT = MODEL['entities']['TransportType']['values']

    def setUp(self):
        for _label, filename, account in CAPTURES:
            lab.require_responses(filename, account=account)

    def _functions(self, filename, account):
        for entry in maps(filename, account):
            for group in entry['FunctionGroups']:
                for function in group['Functions']:
                    yield group['Name'], self.TRANSPORT[function['TransportType']]

    def test_the_transport_vocabulary_is_the_one_the_model_publishes(self):
        """The names come from the schema, so a renumbered enum is a failure and not a silent shift."""
        self.assertEqual(self.TRANSPORT[0], 'None')
        self.assertEqual(self.TRANSPORT[1], 'Infrared')
        self.assertEqual(len(self.TRANSPORT), 9)

    def test_the_partition_holds_with_no_exception_on_either_account(self):
        for label, filename, account in CAPTURES:
            for group, transport in self._functions(filename, account):
                with self.subTest('%s %s' % (label, group)):
                    self.assertEqual(transport, 'Infrared' if group == 'Miscellaneous' else 'None')

    def test_the_counts_are_exact(self):
        """Both sides of the partition on both accounts, so a capture going empty fails here.

        The subtest above passes vacuously over an empty reply, which is the shape this project has
        been caught by before.
        """
        expected = {'account 1': (248, 95), 'account 2': (595, 253)}
        for label, filename, account in CAPTURES:
            named = misc = 0
            for group, _transport in self._functions(filename, account):
                if group == 'Miscellaneous':
                    misc += 1
                else:
                    named += 1
            with self.subTest(label):
                self.assertEqual((named, misc), expected[label])

    def test_both_kinds_of_transport_actually_occur(self):
        """The control on the partition: a reply where everything was `None` would also pass it."""
        seen = {t for _label, filename, account in CAPTURES
                for _g, t in self._functions(filename, account)}
        self.assertEqual(seen, {'None', 'Infrared'})


class TheServiceIsAheadOfTheSchemaHereToo(unittest.TestCase):
    """Section 218's finding, on an entity it did not examine.

    The compiled proxy's `FunctionAction` declares five fields and the live reply carries six. So
    the model stays a floor rather than a ceiling, and this is the second entity where that is
    measured rather than assumed.
    """

    def setUp(self):
        for _label, filename, account in CAPTURES:
            lab.require_responses(filename, account=account)

    def test_every_field_the_schema_declares_is_in_the_reply(self):
        declared = {f['name'] for f in MODEL['entities']['FunctionAction']['fields']}
        self.assertEqual(declared,
                         {'CommandName', 'DeviceId', 'FunctionId', 'Label', 'TransportType'})
        for label, filename, account in CAPTURES:
            for entry in maps(filename, account):
                for group in entry['FunctionGroups']:
                    for function in group['Functions']:
                        with self.subTest('%s %s' % (label, function['CommandName'])):
                            self.assertTrue(declared <= set(function))

    def test_the_reply_carries_a_name_the_schema_does_not(self):
        declared = {f['name'] for f in MODEL['entities']['FunctionAction']['fields']}
        extra = set()
        for _label, filename, account in CAPTURES:
            for entry in maps(filename, account):
                for group in entry['FunctionGroups']:
                    for function in group['Functions']:
                        extra |= set(function) - declared - {'__type'}
        self.assertEqual(extra, {'Name'})



DOC = ROOT / 'docs' / 'myharmony-model.md'


class TheDocumentedCommandVocabularyIsWhatTheCapturesHold(unittest.TestCase):
    """The group table in `docs/myharmony-model.md`, against the replies it was built from.

    The table is a copy of a measurement, so it gets the same treatment as every other copy here.
    """

    def setUp(self):
        for _label, filename, account in CAPTURES:
            lab.require_responses(filename, account=account)
        self.named, self.misc = collections.defaultdict(set), set()
        for _label, filename, account in CAPTURES:
            for entry in maps(filename, account):
                for group in entry['FunctionGroups']:
                    for function in group['Functions']:
                        target = self.misc if group['Name'] == 'Miscellaneous' else self.named[group['Name']]
                        target.add(function['CommandName'])
        self.rows = self._rows(DOC.read_text(encoding='utf-8'))

    @staticmethod
    def _rows(text):
        at = text.index('\n| group | command names |\n')
        section = text[at:]
        end = section.index('\n\n')
        rows = {}
        for line in section[:end].strip().splitlines():
            cells = [c.strip() for c in line.strip('|').split('|')]
            if len(cells) != 2 or cells[0] == 'group' or set(cells[1]) <= set('-: '):
                continue
            rows[cells[0].strip('`')] = [c.strip().strip('`') for c in cells[1].split(',')]
        return rows

    def test_the_table_names_every_canonical_group(self):
        self.assertEqual(sorted(self.rows), sorted(self.named))

    def test_every_groups_commands_are_complete_and_in_order(self):
        for group, listed in sorted(self.rows.items()):
            with self.subTest(group):
                self.assertEqual(listed, sorted(self.named[group]))

    def test_the_stated_totals_are_exact(self):
        text = DOC.read_text(encoding='utf-8')
        canonical = set().union(*self.named.values())
        self.assertIn('%d canonical command names and %d device specific'
                      % (len(canonical), len(self.misc)), text)
        self.assertIn('no exceptions over 1191 functions', text)

    def test_eight_names_are_canonical_on_one_appliance_and_device_specific_on_another(self):
        """So the two sets overlap, and the rail below has to be about names, not about membership.

        Found by the rail's first version, which searched the whole document for every
        `Miscellaneous` name and tripped on four that are also canonical. That is not a leak: the
        platform files the same command name in a named group for one appliance and in the catch all
        for another, so being device specific somewhere says nothing about being device specific
        everywhere.
        """
        canonical = set().union(*self.named.values())
        overlap = sorted(canonical & self.misc)
        self.assertEqual(overlap,
                         ['+10', 'Home', 'Options', 'PS', 'PresetNext', 'PresetPrev', 'Select',
                          'Stop'])
        # And the document has to name each of them, since it states the list rather than the count.
        text = DOC.read_text(encoding='utf-8')
        sentence = text[text.index('**The two sets overlap on eight names**'):]
        sentence = sentence[:sentence.index('\n\n')]
        for name in overlap:
            with self.subTest(name):
                self.assertIn('`%s`' % name, sentence)
        self.assertIn('overlap on %s names' % 'eight', text)

    def test_no_purely_device_specific_name_reaches_the_published_table(self):
        """The rail: Logitech's per appliance command names are database content and stay in the lab.

        Scoped to the table rather than to the whole document, because a command name can also be an
        ordinary word: the first version refused `Status`, which is in the document as a field of
        `IrProtocol` and has nothing to do with this table.
        """
        self.assertNotIn('Miscellaneous', self.rows)
        published = {c for commands in self.rows.values() for c in commands}
        canonical = set().union(*self.named.values())
        leaked = sorted(published & (self.misc - canonical))
        self.assertEqual(leaked, [])

if __name__ == '__main__':
    unittest.main()
