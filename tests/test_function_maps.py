"""What the platform calls a device's commands, and how a function map is shaped. Section 220.

`UserAccountDirector/FunctionList` returns one map per device and one per activity, each a set of
named groups of functions. It is the layer a configuration does not have: a config addresses infrared
codes by number, and this names them.

**The two accounts are test accounts and their contents change.** Danny adds and removes remotes and
devices on them as experiments need, so "ten device maps" is a fact about a moment and not about the
platform. That shapes this whole file, and getting it wrong was the defect it was rewritten to fix:

* every count is asserted against a **dated capture**, `FunctionList_20260830.json`, which is evidence
  and is never overwritten, rather than against `FunctionList.json`, which is the probe's ordinary
  output and is rewritten by the next run;
* a count is therefore a claim about that capture, and the class names say so. The claims about the
  **platform** are the structural ones, the shape of a map and the transport split, and those are
  asserted as holding without exception rather than by counting.

Needs the lab, since the replies carry account and device identifiers and stay there.
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
DOC = ROOT / 'docs' / 'myharmony-model.md'
MODEL = json.loads((ROOT / 'reference' / 'myharmony-model.json').read_text(encoding='utf-8'))

#: The dated captures, as (label, filename, account selector).
#:
#: **Dated on purpose.** The probe writes `FunctionList.json` on every run, so a test pointed at that
#: name asserts against whatever the account looked like the last time anybody ran the probe.
CAPTURED = '20260830'
CAPTURES = (
    ('account 1', 'FunctionList_%s.json' % CAPTURED, 1),
    ('account 2', 'FunctionList_%s.json' % CAPTURED, 2),
)


def maps(filename, account):
    return lab.response(filename, account)['FunctionMaps']


def kind(entry):
    """The contract name the reply states for itself, without the namespace it carries."""
    return entry['__type'].split(':')[0]


def functions(filename, account, transports):
    """Every function in a capture, as (group name, transport name)."""
    for entry in maps(filename, account):
        for group in entry['FunctionGroups']:
            for function in group['Functions']:
                yield group['Name'], transports[function['TransportType']]


class RequireCaptures(unittest.TestCase):
    """Both dated captures, or the whole class skips. Never a per sample skip inside a loop."""

    def setUp(self):
        for _label, filename, account in CAPTURES:
            lab.require_responses(filename, account=account)


class TheCapturesAreEvidenceRatherThanTheProbesLatestOutput(RequireCaptures):
    """The guard on everything below, and the reason this file was rewritten.

    A test that reads `FunctionList.json` measures whatever these accounts held when somebody last
    ran the probe, and they are test accounts whose contents change. Pointing the captures back at
    an undated name has to fail here rather than quietly turn every count below into a moving target.
    """

    def test_every_capture_names_a_date(self):
        for _label, filename, _account in CAPTURES:
            with self.subTest(filename):
                self.assertIn(CAPTURED, filename)

    def test_the_probes_own_output_file_is_not_what_is_asserted_against(self):
        self.assertNotIn('FunctionList.json', [f for _l, f, _a in CAPTURES])


class AFunctionMapIsPerDeviceOrPerActivity(RequireCaptures):
    """The vendor's own data says the two maps are the same shape, which is the operating concept.

    `docs/how-a-harmony-works.md` states that a device's map and an activity's map are two maps of
    the same keypad, authored separately. Here that is Logitech's schema: both contracts extend one
    `AbstractFunctionMap` carrying the groups, and each adds only the identifier of what it belongs
    to. **A claim about the platform**, so it holds whatever these accounts happen to contain.
    """

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

    def test_a_reply_carries_no_third_kind_of_map(self):
        seen = {kind(e) for _label, filename, account in CAPTURES for e in maps(filename, account)}
        self.assertEqual(seen, {'DeviceFunctionMap', 'ActivityFunctionMap'})


class ANamedGroupStatesNoTransportAndMiscellaneousStatesInfrared(RequireCaptures):
    """The finding, and **a claim about the platform** rather than about these accounts.

    A function in one of the platform's named groups, `Power`, `Volume`, `NumericBasic` and the rest,
    states its transport as `None`; a function in `Miscellaneous` states `Infrared`. So the named
    groups are the platform's transport independent button vocabulary and `Miscellaneous` holds what
    exists only as a concrete infrared command for that device.

    Asserted as a partition with no exception, so it neither depends on nor states how many devices
    these accounts hold. A single exception means the reading is wrong.
    """

    TRANSPORT = MODEL['entities']['TransportType']['values']

    def test_the_transport_vocabulary_is_the_one_the_model_publishes(self):
        """The names come from the schema, so a renumbered enum is a failure and not a silent shift."""
        self.assertEqual(self.TRANSPORT[0], 'None')
        self.assertEqual(self.TRANSPORT[1], 'Infrared')
        self.assertEqual(len(self.TRANSPORT), 9)

    def test_the_partition_holds_with_no_exception(self):
        for label, filename, account in CAPTURES:
            for group, transport in functions(filename, account, self.TRANSPORT):
                with self.subTest('%s %s' % (label, group)):
                    self.assertEqual(transport, 'Infrared' if group == 'Miscellaneous' else 'None')

    def test_both_sides_of_the_partition_actually_occur(self):
        """The control: a capture where everything was `None` would satisfy the test above.

        Stated as a set rather than as counts, because how many of each there are is a property of
        whatever devices these test accounts hold today.
        """
        seen = collections.Counter()
        for _label, filename, account in CAPTURES:
            for group, transport in functions(filename, account, self.TRANSPORT):
                seen[(group == 'Miscellaneous', transport)] += 1
        self.assertEqual(sorted(seen), [(False, 'None'), (True, 'Infrared')])
        for key, count in seen.items():
            with self.subTest(key):
                self.assertGreater(count, 0)


class TheServiceIsAheadOfTheSchemaHereToo(RequireCaptures):
    """Section 218's finding, on an entity it did not examine, and again about the platform.

    The compiled proxy's `FunctionAction` declares five fields and every live function carries six.
    """

    DECLARED = {'CommandName', 'DeviceId', 'FunctionId', 'Label', 'TransportType'}

    def test_the_schema_declares_the_five_fields_this_test_reasons_about(self):
        self.assertEqual({f['name'] for f in MODEL['entities']['FunctionAction']['fields']},
                         self.DECLARED)

    def test_every_field_the_schema_declares_is_in_every_live_function(self):
        for label, filename, account in CAPTURES:
            for entry in maps(filename, account):
                for group in entry['FunctionGroups']:
                    for function in group['Functions']:
                        with self.subTest('%s %s' % (label, function['CommandName'])):
                            self.assertTrue(self.DECLARED <= set(function))

    def test_the_reply_carries_exactly_one_field_the_schema_does_not(self):
        extra = set()
        for _label, filename, account in CAPTURES:
            for entry in maps(filename, account):
                for group in entry['FunctionGroups']:
                    for function in group['Functions']:
                        extra |= set(function) - self.DECLARED - {'__type'}
        self.assertEqual(extra, {'Name'})


class WhatTheThirtiethOfAugustCapturesHeld(RequireCaptures):
    """The counts, stated as what they are: a description of two captures on one day.

    Kept exact rather than dropped, because the numbers in section 220 have to be checkable. What
    changed is the claim they support: these say what was captured, not what an account contains.
    """

    TRANSPORT = MODEL['entities']['TransportType']['values']
    MAPS = {'account 1': {'DeviceFunctionMap': 4, 'ActivityFunctionMap': 2},
            'account 2': {'DeviceFunctionMap': 10, 'ActivityFunctionMap': 7}}
    SPLIT = {'account 1': (248, 95), 'account 2': (595, 253)}

    def test_the_map_counts_are_what_section_220_states(self):
        for label, filename, account in CAPTURES:
            with self.subTest(label):
                self.assertEqual(collections.Counter(kind(e) for e in maps(filename, account)),
                                 self.MAPS[label])

    def test_the_transport_split_is_what_section_220_states(self):
        for label, filename, account in CAPTURES:
            named = misc = 0
            for group, _transport in functions(filename, account, self.TRANSPORT):
                if group == 'Miscellaneous':
                    misc += 1
                else:
                    named += 1
            with self.subTest(label):
                self.assertEqual((named, misc), self.SPLIT[label])

    def test_the_total_the_document_quotes_is_the_sum_of_the_two(self):
        total = sum(sum(v) for v in self.SPLIT.values())
        self.assertEqual(total, 1191)
        self.assertIn('No exceptions in the two captures of 30 August 2026, %d functions' % total,
                      DOC.read_text(encoding='utf-8'))


class TheDocumentedCommandVocabularyIsWhatTheCapturesHeld(RequireCaptures):
    """The group table in `docs/myharmony-model.md`, against the captures it was built from.

    **The table is a sample and the document has to say so.** It is the union of the groups two test
    accounts' devices happened to use on one day, so it is a floor on the platform's vocabulary and
    not the platform's vocabulary. A test cannot check that the document is honest, so it checks the
    sentence that makes it honest is there.
    """

    def setUp(self):
        super().setUp()
        self.named, self.device_specific = collections.defaultdict(set), set()
        for _label, filename, account in CAPTURES:
            for entry in maps(filename, account):
                for group in entry['FunctionGroups']:
                    for function in group['Functions']:
                        target = (self.device_specific if group['Name'] == 'Miscellaneous'
                                  else self.named[group['Name']])
                        target.add(function['CommandName'])
        self.text = DOC.read_text(encoding='utf-8')
        self.rows = self._rows(self.text)

    @staticmethod
    def _rows(text):
        at = text.index('\n| group | command names |\n')
        section = text[at:]
        rows = {}
        for line in section[:section.index('\n\n')].strip().splitlines():
            cells = [c.strip() for c in line.strip('|').split('|')]
            if len(cells) != 2 or cells[0] == 'group' or set(cells[1]) <= set('-: '):
                continue
            rows[cells[0].strip('`')] = [c.strip().strip('`') for c in cells[1].split(',')]
        return rows

    def test_the_table_names_every_group_the_captures_hold(self):
        self.assertEqual(sorted(self.rows), sorted(self.named))

    def test_every_groups_commands_are_complete_and_in_order(self):
        for group, listed in sorted(self.rows.items()):
            with self.subTest(group):
                self.assertEqual(listed, sorted(self.named[group]))

    def test_the_document_states_the_table_is_a_sample_from_test_accounts(self):
        """The honesty check, and the one that would have stopped the first version of this section."""
        for phrase in ('test accounts', 'a floor', '30 August 2026'):
            with self.subTest(phrase):
                self.assertIn(phrase, self.text)

    def test_the_stated_totals_are_exact(self):
        canonical = set().union(*self.named.values())
        self.assertIn('%d command names in named groups and %d device specific ones'
                      % (len(canonical), len(self.device_specific)), self.text)

    def test_some_names_are_in_a_named_group_for_one_device_and_the_catch_all_for_another(self):
        """So the two sets overlap, and the rail below has to be about names, not about membership.

        Found by the rail's first version, which searched the whole document for every device
        specific name and tripped on four that are also in a named group. That is not a leak: the
        platform files the same command name in a named group for one device and in the catch all
        for another.
        """
        overlap = sorted(set().union(*self.named.values()) & self.device_specific)
        self.assertTrue(overlap, 'no overlap in these captures, so the sentence should go')
        sentence = self.text[self.text.index('**The two sets overlap'):]
        sentence = sentence[:sentence.index('\n\n')]
        for name in overlap:
            with self.subTest(name):
                self.assertIn('`%s`' % name, sentence)

    def test_no_purely_device_specific_name_reaches_the_published_table(self):
        """The rail: Logitech's per device command names are database content and stay in the lab.

        Scoped to the table rather than to the whole document, because a command name can also be an
        ordinary word: the first version refused `Status`, which is in the document as a field of
        `IrProtocol` and has nothing to do with this table.
        """
        self.assertNotIn('Miscellaneous', self.rows)
        published = {c for commands in self.rows.values() for c in commands}
        canonical = set().union(*self.named.values())
        self.assertEqual(sorted(published & (self.device_specific - canonical)), [])


if __name__ == '__main__':
    unittest.main()
