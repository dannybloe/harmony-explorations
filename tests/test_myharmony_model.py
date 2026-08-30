"""The MyHarmony data model: the document against the data it reads.

`docs/myharmony/model.json` is the recovered model and `docs/myharmony/model.md` is the
reading of it. That is the two copies state this project's oldest rule warns about, and it is
allowed here for the same reason `docs/config-format.md` restates bytes: one is for a tool and one
is for a person. What makes it safe is this file, which compares every number and every field name
the document states against the data, so the copy cannot drift.

Neither file needs the lab. The model was recovered from an artefact in the lab, but what landed
here is derived, so these tests run in a fresh clone with nothing installed.
"""
import collections
import json
import pathlib
import re
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
import myharmony_model  # noqa: E402  `all_fields`, so the test and the generators agree on what a
                        # field list is. Reimplementing inheritance here is the two copies state.

DOC = ROOT / 'docs' / 'myharmony' / 'model.md'
DATA = ROOT / 'docs' / 'myharmony' / 'model.json'


OPERATIONS = ROOT / 'docs' / 'myharmony' / 'operations.json'


def model():
    return json.loads(DATA.read_text(encoding='utf-8'))


def operations():
    return json.loads(OPERATIONS.read_text(encoding='utf-8'))


def document():
    return DOC.read_text(encoding='utf-8')


def two_column_table(text, heading):
    """The rows of the first two column table under a heading, as a list of pairs.

    Deliberately stops at the next heading rather than reading to the end of the file, so a table
    added later under a different heading cannot silently join the one being checked.
    """
    at = text.index(heading)
    section = text[at + len(heading):]
    # Cut at the next heading of **any** level. Cutting at `## ` alone was the first version and it
    # was wrong in the way that matters: the entity tables are `### `, so one section swallowed the
    # four below it and every field was checked against the wrong table.
    end = re.search(r'\n#+ ', section)
    if end is not None:
        section = section[:end.start()]
    rows = []
    for line in section.splitlines():
        line = line.strip()
        if not line.startswith('|'):
            continue
        cells = [c.strip() for c in line.strip('|').split('|')]
        if len(cells) != 2 or set(cells[1]) <= set('-: '):
            continue
        if cells[0] in ('field', 'area', 'service interface', 'entity'):
            continue
        rows.append((cells[0].strip('`'), cells[1]))
    return rows


class TheDocumentsCountsAreTheModelsOwn(unittest.TestCase):
    """The five totals in the document's shape section, recomputed from the data."""

    def setUp(self):
        self.model = model()
        self.text = document()

    def test_the_stated_counts_are_exact(self):
        counts = self.model['counts']
        for stated, key in (
            (counts['entities'], 'entities'),
            (counts['serviceContracts'], 'serviceContracts'),
            (counts['references'], 'references'),
            (counts['enumValues'], 'enumValues'),
            (counts['areas'], 'areas'),
        ):
            with self.subTest(key):
                self.assertIn(str(stated), self.text)

    def test_the_counts_recompute_from_the_entities(self):
        counts = self.model['counts']
        entities = self.model['entities']
        self.assertEqual(len(entities), counts['entities'])
        self.assertEqual(
            sum(1 for v in entities.values() if v['isServiceContract']),
            counts['serviceContracts'],
        )
        self.assertEqual(len(self.model['references']), counts['references'])
        self.assertEqual(
            sum(len(v['values']) for v in entities.values()),
            counts['enumValues'],
        )
        areas = {v['area'] for v in entities.values() if v['isServiceContract'] and v['area']}
        self.assertEqual(len(areas), counts['areas'])


class TheDocumentedEntitiesFieldTablesAreComplete(unittest.TestCase):
    """Each entity the document tabulates carries every field the model gives it, and no other.

    A subset would be the easy failure here: a table written by hand, then a field added to the
    model, and the document quietly describing a smaller entity than the one that exists.
    """

    ENTITIES = ('Account', 'Remote', 'Device', 'Activity', 'IrProtocol')

    def setUp(self):
        self.model = model()
        self.text = document()

    def test_every_documented_entity_exists_in_the_model(self):
        for name in self.ENTITIES:
            with self.subTest(name):
                self.assertIn(name, self.model['entities'])

    def fields_of(self, name):
        """Every field the entity has, inherited ones included.

        **This read `entity['fields']` until 30 August 2026 and so did the document**, which is why
        a test called "the field names match exactly" passed over a `Device` table missing 17
        fields, among them `Name`, `Model` and `Manufacturer`. The document and its check were two
        copies of one wrong reading, which is the exact failure this repository's oldest rule is
        about, and no amount of comparing them could have found it. Both now go through
        `myharmony_model.all_fields`.
        """
        return myharmony_model.all_fields(self.model['entities'], name)

    def test_the_field_names_match_exactly(self):
        for name in self.ENTITIES:
            with self.subTest(name):
                rows = two_column_table(self.text, '\n### %s\n' % name)
                self.assertEqual(
                    [field for field, _ in rows],
                    [f['name'] for f in self.fields_of(name)],
                )

    def test_the_field_types_match_exactly(self):
        for name in self.ENTITIES:
            with self.subTest(name):
                rows = two_column_table(self.text, '\n### %s\n' % name)
                stated = {field: shown for field, shown in rows}
                for field in self.fields_of(name):
                    shown = stated[field['name']]
                    expected = field['type'] + (' list' if field['many'] else '')
                    self.assertEqual(shown, expected, '%s.%s' % (name, field['name']))


class TheDocumentedVocabulariesAreTheModelsEnums(unittest.TestCase):
    """The enumerations quoted in the document, in the model's own order and complete."""

    #: Every enumeration the core reaches that is short enough to quote whole. The three long ones
    #: are checked by `TheLongVocabulariesAreListedInFull` instead. This named four until 30 August
    #: 2026 and the document quoted four, so the five it said nothing about were invisible to both.
    VOCABULARIES = ('DeviceCategory', 'ActivityType', 'ActivityState', 'ActivityGroup',
                    'KeyboardLayoutType', 'Region')

    def setUp(self):
        self.model = model()
        self.text = document()

    def test_each_vocabulary_is_quoted_whole_and_in_order(self):
        for name in self.VOCABULARIES:
            with self.subTest(name):
                # The line states its own length now, so a vocabulary that grows cannot be quoted
                # short with the count silently left behind.
                pattern = re.compile(r'\*\*`%s`\*\*, (\d+): (.+)' % name)
                found = pattern.search(self.text)
                self.assertIsNotNone(found, 'no line for %s' % name)
                values = self.model['entities'][name]['values']
                quoted = [v.strip().strip('`') for v in found.group(2).split(',')]
                self.assertEqual(quoted, values)
                self.assertEqual(int(found.group(1)), len(values), 'stated count is wrong')


class TheAreaTableNamesEveryAreaWithAnExactCount(unittest.TestCase):
    """Every area, every count, and the 44 contracts that belong to none of them."""

    def setUp(self):
        self.model = model()
        self.text = document()
        self.rows = two_column_table(self.text, '\n## Every area, by how many contracts it holds\n')
        self.actual = collections.Counter(
            v['area'] for v in self.model['entities'].values()
            if v['isServiceContract'] and v['area']
        )

    def test_the_table_names_every_area(self):
        self.assertEqual(sorted(area for area, _ in self.rows), sorted(self.actual))

    def test_every_count_is_exact(self):
        for area, stated in self.rows:
            with self.subTest(area):
                self.assertEqual(int(stated), self.actual[area])

    def test_the_column_sums_to_the_contracts_that_declare_an_area(self):
        self.assertEqual(sum(int(n) for _, n in self.rows), sum(self.actual.values()))

    def test_the_contracts_with_no_area_are_counted_and_explained(self):
        without = self.model['counts']['serviceContracts'] - sum(self.actual.values())
        self.assertEqual(without, 44)
        self.assertIn('44 service contracts declare no namespace', self.text)


class TheModelCarriesSchemaAndNoInstances(unittest.TestCase):
    """The publication rail for both files, asserted rather than assumed.

    What crossed is a schema: type names, field names, enum values, operation names and the
    references between them. It carries no reply, no account and no identifier, which is what makes
    it publishable where a captured reply is not. A future regeneration that started including
    sample values would fail here rather than at a code review.

    The rail lives here once and both files go through it, since two copies of a check are two
    copies until one of them moves. `TheOperationSurfaceCarriesNoInstances` is gone for that
    reason: it was a second copy, and the digit control found the hole in one of them and not the
    other.
    """

    FILES = (DATA, OPERATIONS)

    IDENTITY = re.compile(
        r'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
        r'|@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
    )

    def test_no_guid_and_no_address_appears_anywhere(self):
        for path in self.FILES:
            with self.subTest(path.name):
                found = self.IDENTITY.search(path.read_text(encoding='utf-8'))
                self.assertIsNone(found, 'identity shaped text: %r' % (found and found.group(0)))

    def test_no_account_or_device_identifier_survived_as_a_number(self):
        """An account id is an eight digit number and a device id a longer one, so a run of six or
        more digits anywhere in a file of type names is worth refusing outright.

        **No word boundary**, which the control found: an identifier pasted into a name reads as
        `Op16318180`, where there is no boundary between the letter and the digits, and the bounded
        pattern let it through. Neither clean file contains a run of six digits at all, so the
        unbounded form costs nothing.
        """
        for path in self.FILES:
            with self.subTest(path.name):
                digits = set(re.findall(r'\d{6,}', path.read_text(encoding='utf-8')))
                self.assertEqual(sorted(digits), [])

    def test_an_entity_carries_only_a_shape(self):
        allowed = {'area', 'assembly', 'extends', 'fields', 'isServiceContract', 'kind',
                   'serviceNamespace', 'values'}
        for name, entity in model()['entities'].items():
            with self.subTest(name):
                self.assertLessEqual(set(entity), allowed)

    def test_an_operation_carries_only_a_signature(self):
        allowed = {'action', 'name', 'parameters', 'returns'}
        for service in operations()['services']:
            for op in service['operations']:
                with self.subTest('%s/%s' % (service['configurationName'], op['name'])):
                    self.assertLessEqual(set(op), allowed)


class TheOperationSurfaceIsWhatTheDocumentStates(unittest.TestCase):
    """298 operations over 19 service interfaces, every one with a reply type resolved."""

    def setUp(self):
        self.ops = operations()
        self.text = document()

    def test_the_counts_recompute_from_the_services(self):
        counts = self.ops['counts']
        self.assertEqual(len(self.ops['services']), counts['services'])
        self.assertEqual(
            sum(len(s['operations']) for s in self.ops['services']),
            counts['operations'],
        )

    def test_every_operation_resolved_a_reply_type(self):
        """The join of the two halves closed on all of them, which is what makes it a surface.

        An operation is declared twice, as a request carrying the wire action and as an `End` method
        whose return type is the reply. A count above zero here means the join failed somewhere and
        the file is stating a request with no answer.
        """
        unresolved = [
            '%s/%s' % (s['configurationName'], o['name'])
            for s in self.ops['services'] for o in s['operations'] if o['returns'] is None
        ]
        self.assertEqual(unresolved, [])
        self.assertEqual(self.ops['counts']['operationsWithNoReplyType'], 0)

    def test_the_stated_totals_appear_in_the_document(self):
        for value in (self.ops['counts']['operations'], self.ops['counts']['services']):
            with self.subTest(value):
                self.assertIn(str(value), self.text)

    def test_the_service_table_is_complete_and_exact(self):
        rows = two_column_table(self.text, '\n## What can be asked of it\n')
        stated = {name: int(count) for name, count in rows}
        actual = {s['configurationName']: len(s['operations']) for s in self.ops['services']}
        self.assertEqual(stated, actual)

    def test_no_operation_carries_the_asynchronous_plumbing_as_a_parameter(self):
        """`AsyncCallback callback` and `object asyncState` are the calling convention, not the wire.

        Leaving them in would put two invented fields on the request schema of all 298 operations,
        which is the sort of thing that is obvious in one signature and invisible in a total.
        """
        for service in self.ops['services']:
            for op in service['operations']:
                names = {p['name'] for p in op['parameters']}
                with self.subTest('%s/%s' % (service['configurationName'], op['name'])):
                    self.assertNotIn('callback', names)
                    self.assertNotIn('asyncState', names)


class WhichOperationCanReturnWhichEntity(unittest.TestCase):
    """The reachability map, and the one entity that has exactly one way in.

    The counts are read **out of the document** rather than repeated here. A first version listed
    them in a constant beside the assertion, which made the test pass while the document said
    anything at all: three controls that edited the table did not bite.
    """

    def setUp(self):
        self.ops = operations()
        self.reach = self.ops['reachableEntities']
        self.rows = two_column_table(document(), '\n### Which operation can hand back which entity\n')

    def test_the_table_is_not_empty(self):
        """The guard on the guard: an empty table would pass every assertion below it."""
        self.assertEqual(len(self.rows), 5)

    def test_every_documented_reach_count_is_exact(self):
        for name, stated in self.rows:
            with self.subTest(name):
                self.assertEqual(len(self.reach.get(name, [])), int(stated.strip('*')))

    def test_the_document_names_the_protocol_list_as_that_one_way(self):
        self.assertIn('UserAccountDirector/ProtocolList', document())

    def test_the_only_way_to_an_infrared_protocol_is_the_protocol_list(self):
        """The claim the document rests its open lead on, stated as one operation and not as a bound.

        It is reached through its base class, so a literal reading of the reply types finds nothing.
        """
        self.assertEqual(self.reach['IrProtocol'], ['UserAccountDirector/GetProtocolList'])
        model_entities = model()['entities']
        self.assertIn('AbstractProtocol', model_entities['IrProtocol']['extends'])

    def test_every_reachable_entity_is_in_the_model(self):
        entities = model()['entities']
        unknown = sorted(k for k in self.reach if k not in entities)
        self.assertEqual(unknown, [])
        self.assertEqual(len(self.reach), self.ops['counts']['entitiesReachable'])


class NoSourceForTheOperationSurfaceIsASupersetOfAnother(unittest.TestCase):
    """The proxy against the live service's own Discovery listing, section 219.

    Needs the lab, because the listing is a captured reply. The claim is the one the document makes:
    eleven services are in both, and on **every** one of them each source names operations the other
    does not, so neither is the whole platform.
    """

    def setUp(self):
        sys.path.insert(0, str(ROOT / 'tests'))
        import lab
        self.lab = lab
        lab.require_responses('Discovery_GetJsonOperations.json')
        self.listing = lab.response('Discovery_GetJsonOperations.json')['GetJsonOperationsResult']
        self.ops = operations()

    def _advertised(self):
        found = collections.defaultdict(set)
        for row in self.listing:
            service, _, name = row['Identifier'].partition('/')
            found[service].add(name)
        return found

    def _declared(self):
        found = collections.defaultdict(set)
        for service in self.ops['services']:
            found[service['configurationName'].split('.')[0]] |= {
                o['name'] for o in service['operations']}
        return found

    def test_the_listing_is_the_size_the_documents_say(self):
        self.assertEqual(len(self.listing), 308)
        self.assertEqual(len({r['Identifier'].partition('/')[0] for r in self.listing}), 50)

    def test_eleven_services_are_in_both_sources(self):
        shared = set(self._advertised()) & set(self._declared())
        self.assertEqual(len(shared), 11)

    def test_the_proxy_adds_to_the_listing_on_every_shared_service(self):
        """The half that holds on all eleven, which is what makes the listing not a superset."""
        advertised, declared = self._advertised(), self._declared()
        for service in sorted(set(advertised) & set(declared)):
            with self.subTest(service):
                self.assertTrue(declared[service] - advertised[service],
                                'the proxy adds nothing to the listing for %s' % service)

    def test_the_listing_adds_to_the_proxy_on_seven_of_the_eleven(self):
        """The half that does **not** hold everywhere, asserted as the exact count it is.

        The document first claimed both directions on all eleven, generalised from a sample of three,
        and this test refuted it on four. Stating the count rather than "most" is what keeps the
        refutation from being reintroduced.
        """
        advertised, declared = self._advertised(), self._declared()
        shared = sorted(set(advertised) & set(declared))
        adds = [s for s in shared if advertised[s] - declared[s]]
        self.assertEqual(len(adds), 7)
        # And the document has to be saying that number, not just this file.
        self.assertIn('the listing returns the favour on **seven**', document())
        self.assertIn('appear in both this proxy and the Discovery listing', document())
        self.assertEqual(sorted(set(shared) - set(adds)),
                         ['DeletionManager', 'GlobalDeviceManager', 'UserButtonMappingManager',
                          'UserFeatureManager'])

    def test_seven_services_the_proxy_declares_are_not_advertised(self):
        only = sorted(set(self._declared()) - set(self._advertised()))
        self.assertEqual(only, ['AmazonS3ImageManager', 'Authentication', 'DiscoveryService',
                                'HelpContent', 'ProductManager', 'RomDataService',
                                'SecurityDirector'])



class AnAccountRecordIsOneRemotesWorld(unittest.TestCase):
    """The shape of the model, and the correction that produced this class. Section 218.

    A `Household` holds `Account` records and each account record holds **exactly one** `Remote`,
    plus that remote's devices and activities. So the product's shape and the schema's are the same
    shape: you own remotes, a remote has devices.

    This document first read the field layout the other way, saw `Remotes` and `Devices` as sibling
    lists on `Account`, and concluded the schema pooled devices at account level in a shape the
    product does not present. The field layout is real; the conclusion is not, and one query refutes
    it. Needs the lab, since the households are captures.
    """

    HOUSEHOLDS = (('account 1', 1), ('account 2', 2))

    def setUp(self):
        sys.path.insert(0, str(ROOT / 'tests'))
        import lab
        self.lab = lab
        for _label, account in self.HOUSEHOLDS:
            lab.require_responses('GetMyHousehold.json', account=account)

    def _records(self, account):
        return self.lab.response('GetMyHousehold.json', account)['GetMyHouseholdResult']['Accounts']

    def test_a_household_holds_account_records(self):
        for label, account in self.HOUSEHOLDS:
            with self.subTest(label):
                self.assertTrue(self._records(account))

    def test_every_account_record_holds_exactly_one_remote(self):
        """The claim, asserted per record rather than as a total, so one exception fails loudly.

        Deliberately **not** a count of records: these are test accounts whose contents change, and
        how many remotes are registered on them is a fact about a moment. How many remotes sit in one
        account record is a fact about the platform.
        """
        seen = 0
        for label, account in self.HOUSEHOLDS:
            for record in self._records(account):
                seen += 1
                with self.subTest('%s %s' % (label, record.get('ProductIdentifier'))):
                    self.assertEqual(len(record['Remotes']), 1)
        self.assertGreater(seen, 0, 'no account records, so the assertion above proved nothing')

    def test_the_devices_hang_off_the_account_record_beside_its_one_remote(self):
        """The field layout the wrong reading was built on, kept as an assertion rather than a memory."""
        for label, account in self.HOUSEHOLDS:
            for record in self._records(account):
                with self.subTest(label):
                    self.assertIsInstance(record['Devices'], list)
                    self.assertIsInstance(record['Activities'], list)

    def test_the_household_level_remotes_list_is_declared_and_empty(self):
        """So the route to a remote is through the account records, which is the shape correction.

        `Household` declares a `Remotes` list in the schema and the service returns null for it on
        both logins, while every account record carries one. Reading the schema alone would suggest
        a household holds its remotes directly.
        """
        entities = model()['entities']
        declared = {f['name']: f for f in entities['Household']['fields']}
        self.assertTrue(declared['Remotes']['many'])
        for label, account in self.HOUSEHOLDS:
            household = self.lab.response('GetMyHousehold.json', account)['GetMyHouseholdResult']
            with self.subTest(label):
                self.assertIsNone(household['Remotes'])
                self.assertTrue(household['Accounts'])

    def test_a_household_has_as_many_remotes_as_it_has_account_records(self):
        """The sentence to keep: a household has zero or more remotes, one per account record."""
        for label, account in self.HOUSEHOLDS:
            records = self._records(account)
            with self.subTest(label):
                self.assertEqual(sum(len(r['Remotes']) for r in records), len(records))

    def test_the_schema_gives_a_remote_no_device_list(self):
        """True, and it is what misled the first reading, so it is written down as compatible.

        With one remote per account record, a remote needing no device list of its own is the
        expected shape rather than evidence of a different one.
        """
        entities = model()['entities']
        remote = {f['name'] for f in entities['Remote']['fields']}
        self.assertNotIn('Devices', remote)
        household = {f['name'] for f in entities['Household']['fields']}
        self.assertIn('Accounts', household)


class TheDrawnModelIsGeneratedAndCurrent(unittest.TestCase):
    """The diagram and the entity listing, against the model they are drawn from.

    Both are generated by `tools/myharmony_model.py` and never edited by hand, so the only failure
    mode worth guarding is that somebody edits one anyway or that the model moves without them.
    Runs without a lab, since the model is in the repository.
    """

    def setUp(self):
        sys.path.insert(0, str(ROOT / 'tools'))
        import myharmony_model
        self.tool = myharmony_model

    def test_both_generated_files_agree_with_the_model(self):
        self.assertEqual(self.tool.main([]), 0,
                         'run `make MYHARMONY_ARGS=--write myharmony-model`')

    def test_the_diagram_draws_the_measured_cardinality_rather_than_the_schemas(self):
        """The schema types `Account.Remotes` as a list, and drawing that was the wrong picture.

        Section 218's correction. If the override is ever dropped the diagram silently goes back to
        saying an account may hold any number of remotes, which is what nobody noticed for a day.
        """
        drawn = (ROOT / 'docs' / 'myharmony' / 'core-model.mmd').read_text(encoding='utf-8')
        self.assertIn('Account ||--|| Remote', drawn)
        self.assertNotIn('Account ||--o{ Remote', drawn)

    def listing(self):
        return (ROOT / 'docs' / 'myharmony' / 'entities.md').read_text(encoding='utf-8')

    def test_the_diagram_starts_at_the_household(self):
        drawn = (ROOT / 'docs' / 'myharmony' / 'core-model.mmd').read_text(encoding='utf-8')
        self.assertIn('Household ||--o{ Account', drawn)

    def test_the_listing_covers_every_service_contract(self):
        listed = re.findall(r'^### `([A-Za-z0-9_]+)`$', self.listing(), re.M)
        entities = model()['entities']
        contracts = {n for n, e in entities.items() if e['isServiceContract']}
        self.assertEqual(sorted(listed), sorted(contracts))
        self.assertEqual(len(listed), model()['counts']['serviceContracts'])

    def test_the_listing_states_every_field_and_not_a_count_of_them(self):
        """The listing became a reference on 30 August 2026 and this is what says so.

        It carried `| contract | fields | enum values |`, three numbers per contract, which is an
        index: it says a type exists and nothing about what it holds. Danny asked what
        `AbstractActivityAction` was and nothing in the repository answered, because the only place
        that named it gave its field count. Asserting the exact row total is what stops it sliding
        back to counts, since a summary table would pass a mere "is it mentioned" check.
        """
        entities = model()['entities']
        # A type is not always a bare name: fifteen of them are generics such as
        # `Dictionary<ActivityType, RoleToDeviceMapping>`, and a pattern that only allowed
        # identifiers and brackets silently lost all nineteen of their rows.
        rows = re.findall(r'^\| `[A-Za-z0-9_]+` \| `[^`|]+` \| (?:itself|inherited) \|$',
                          self.listing(), re.M)
        expected = sum(len(myharmony_model.all_fields(entities, n))
                       for n, e in entities.items() if e['isServiceContract'])
        self.assertEqual(len(rows), expected)

    def test_the_listing_marks_which_fields_are_inherited(self):
        """`Device` shows 17 inherited and 32 of its own, which is the case that found the bug."""
        entities = model()['entities']
        section = self.listing().split('\n### `Device`\n')[1].split('\n### ')[0]
        own = len(entities['Device']['fields'])
        every = len(myharmony_model.all_fields(entities, 'Device'))
        self.assertEqual(section.count('| inherited |'), every - own)
        self.assertEqual(section.count('| itself |'), own)
        for name in ('Name', 'Model', 'Manufacturer'):
            self.assertIn('| `%s` |' % name, section, 'a device with no %s' % name)

class EveryTypeTheCoreReachesIsAccountedFor(unittest.TestCase):
    """The rail behind the completeness claim, and the reason it exists.

    Until 30 August 2026 this document explained the twelve entities the diagram draws and left
    every type they point at as a bare name in a field table. Danny asked what
    `AbstractActivityAction` and `AbstractActivityRole` were, and nothing in the repository
    answered. The listing named them and gave a field count; the reading did not mention them.

    A test that only compared the document against itself could never have found that, because both
    halves agreed. So this walks the model instead: from the twelve, follow every field type and
    every inheritance edge, and require each type reached to be either explained in the reading or
    listed with all of its fields in the reference. It is what makes "complete" a checkable word.
    """

    #: The roots the rail walks from. `CORE` alone reaches 89 types and leaves two whole subsystems
    #: outside: the button and function maps hang off a remote by **identifier** rather than by
    #: reference, so no walk from `Household` can ever arrive there, and the device catalogue is a
    #: separate island too. Danny asked why the core drawing was so small on 30 August 2026, and the
    #: answer was that 12 of 362 substantial types were drawn and the rail only guarded those 12's
    #: neighbourhood. Adding a root here is what makes a new subsystem fall under the rail.
    #:
    #: **They are deliberately redundant and the control says so.** Removing any single one leaves
    #: the reachable set at 150, because `MapList` reaches the button maps, `FunctionList` reaches
    #: the function maps and `IrProtocol` reaches its own base. Removing all of them drops it to 89
    #: and fails, which is the measurement that shows the list is load bearing. Do not read a
    #: passing test after deleting one root as evidence that the root was pointless.
    EXTRA_ROOTS = ('AbstractButtonMap', 'AbstractRemoteButton', 'AbstractButtonAction',
                   'AbstractFunctionMap', 'FunctionBase', 'FunctionList', 'MapList', 'Sequence',
                   'IrProtocol', 'AbstractProtocol')

    def reachable(self):
        entities = model()['entities']
        core = {n for n in myharmony_model.CORE if n in entities}
        core |= {n for n in self.EXTRA_ROOTS if n in entities}

        def onward(name):
            out = {f['type'] for f in myharmony_model.all_fields(entities, name)
                   if f['type'] in entities}
            out |= {o for o in entities if name in entities[o].get('extends', [])}
            out |= {b for b in entities[name].get('extends', []) if b in entities}
            return out

        seen, frontier = set(core), set(core)
        while frontier:
            nxt = {c for n in frontier for c in onward(n) if c not in seen}
            seen |= nxt
            frontier = nxt
        return entities, core, seen

    def test_every_reachable_type_is_listed_in_full(self):
        _entities, _core, seen = self.reachable()
        listing = (ROOT / 'docs' / 'myharmony' / 'entities.md').read_text(encoding='utf-8')
        headings = set(re.findall(r'^### `([A-Za-z0-9_]+)`$', listing, re.M))
        self.assertEqual(sorted(seen - headings), [], 'reachable but absent from the listing')

    def test_the_document_states_the_reachable_count_exactly(self):
        _entities, _core, seen = self.reachable()
        stated = re.search(r'(\d+) types are reachable from the roots', document())
        self.assertIsNotNone(stated, 'the completeness section states no count')
        self.assertEqual(int(stated.group(1)), len(seen))

    def test_the_drawn_core_really_is_twelve(self):
        """The completeness sentence says `twelve`, so this fails if `CORE` changes under it."""
        entities = model()['entities']
        self.assertEqual(len([n for n in myharmony_model.CORE if n in entities]), 12)

    def substantial(self):
        """The contracts worth a box: not an enumeration, not an identifier wrapper."""
        entities = model()['entities']
        out = set()
        for name, entity in entities.items():
            if not entity['isServiceContract'] or entity['kind'] == 'enum':
                continue
            if not myharmony_model.all_fields(entities, name):
                continue
            bases, stack = set(), list(entity.get('extends', []))
            while stack:
                base = stack.pop()
                if base in entities and base not in bases:
                    bases.add(base)
                    stack.extend(entities[base].get('extends', []))
            if 'AbstractId' not in bases:
                out.add(name)
        return entities, out

    def test_the_cluster_table_states_the_real_sizes(self):
        """The three island sizes in the completeness table, measured rather than quoted.

        This is the check behind the answer to "why is the core model so small": it is small
        because it draws twelve of one island of 121, and two islands had no drawing at all.
        """
        entities, substantial = self.substantial()
        adjacent = collections.defaultdict(set)
        for name in substantial:
            for field in myharmony_model.all_fields(entities, name):
                if field['type'] in substantial:
                    adjacent[name].add(field['type'])
                    adjacent[field['type']].add(name)
            for base in entities[name].get('extends', []):
                if base in substantial:
                    adjacent[name].add(base)
                    adjacent[base].add(name)
        seen, sizes = set(), []
        for name in substantial:
            if name in seen:
                continue
            stack, size = [name], 0
            seen.add(name)
            while stack:
                current = stack.pop()
                size += 1
                for other in adjacent[current]:
                    if other not in seen:
                        seen.add(other)
                        stack.append(other)
            sizes.append(size)
        sizes.sort(reverse=True)
        text = document()
        self.assertIn('| the account: what a household holds | %d |' % sizes[0], text)
        self.assertIn('| the device catalogue | %d |' % sizes[1], text)
        self.assertIn('| button and function maps | %d |' % sizes[2], text)
        self.assertIn('and 362 carry substance', text)
        self.assertEqual(len(substantial), 362)

    def test_every_root_exists(self):
        """A root that is renamed away silently shrinks the rail, which is the failure to avoid."""
        entities = model()['entities']
        for name in self.EXTRA_ROOTS:
            with self.subTest(name):
                self.assertIn(name, entities)


class WhatAnActivityDoesIsDescribedExactly(unittest.TestCase):
    """The roles and the actions, which are the substance the reading had been missing."""

    def setUp(self):
        self.entities = model()['entities']
        self.text = document()

    def subclasses(self, base):
        return sorted(n for n in self.entities if base in self.entities[n].get('extends', []))

    def test_the_document_lists_every_role_and_no_others(self):
        roles = self.subclasses('AbstractActivityRole')
        section = self.text.split('### The roles say what each device is for')[1]
        section = section.split('### The actions')[0]
        listed = re.findall(r'^\* `([A-Za-z0-9_]+)`$', section, re.M)
        self.assertEqual(listed, roles)

    def test_only_one_role_declares_a_field_of_its_own(self):
        """21 of 22 are marker types, which is why the document reads them as a vocabulary."""
        roles = self.subclasses('AbstractActivityRole')
        withfields = {n for n in roles if self.entities[n]['fields']}
        self.assertEqual(withfields, {'PowerInputActivityRole'})
        self.assertEqual([f['name'] for f in self.entities['PowerInputActivityRole']['fields']],
                         ['DeviceClassificationName'])

    def test_the_base_carries_the_ordering_and_the_delay(self):
        names = [f['name'] for f in self.entities['AbstractActivityRole']['fields']]
        for expected in ('PowerOnOrder', 'PowerOffOrder', 'NextDevicePowerOnDelay',
                         'SelectedInput', 'DeviceId'):
            self.assertIn(expected, names)

    def test_there_are_exactly_three_kinds_of_action(self):
        self.assertEqual(self.subclasses('AbstractActivityAction'),
                         ['ChannelActivityAction', 'CommandActivityAction', 'DelayActivityAction'])

    def test_the_action_table_states_each_ones_own_fields(self):
        for name in self.subclasses('AbstractActivityAction'):
            with self.subTest(name):
                row = re.search(r'^\| `%s` \| ([^|]+) \|' % name, self.text, re.M)
                self.assertIsNotNone(row, 'no table row for %s' % name)
                stated = [c.strip().strip('`') for c in row.group(1).split(',')]
                self.assertEqual(stated, [f['name'] for f in self.entities[name]['fields']])

    def test_a_delay_action_carries_one_field_and_it_is_a_duration(self):
        """The lead about units rests on this being the whole of what a delay states."""
        self.assertEqual([f['name'] for f in self.entities['DelayActivityAction']['fields']],
                         ['Duration'])

    def test_the_stated_role_to_capability_overlap_is_exact(self):
        roles = self.subclasses('AbstractActivityRole')
        caps = set(self.entities['DeviceCapabilityType']['values'])
        overlap = sum(1 for r in roles if r[:-len('ActivityRole')] in caps)
        stated = re.search(r'has (\d+) values and (\d+) of the (\d+) role names appear', self.text)
        self.assertIsNotNone(stated)
        self.assertEqual(int(stated.group(1)), len(self.entities['DeviceCapabilityType']['values']))
        self.assertEqual(int(stated.group(2)), overlap)
        self.assertEqual(int(stated.group(3)), len(roles))


class TheIdentifierFamilyAndTheSharedVocabularies(unittest.TestCase):
    def setUp(self):
        self.entities = model()['entities']
        self.text = document()

    def test_the_three_identifiers_that_add_a_field_are_named(self):
        """22 of 25 are pure wrappers and three are not; the document must not round that off."""
        ids = sorted(n for n in self.entities
                     if 'AbstractId' in self.entities[n].get('extends', []))
        adds = sorted(n for n in ids if self.entities[n]['fields'])
        self.assertEqual(adds, ['CompilationId', 'GlobalDeviceVersionId', 'GlobalLanguageVersionId'])
        for name in adds:
            self.assertIn('`%s`' % name, self.text)

    def test_the_base_identifier_carries_a_value_and_a_persisted_flag(self):
        self.assertEqual([f['name'] for f in self.entities['AbstractId']['fields']],
                         ['IsPersisted', 'Value'])

    def test_device_type_is_a_subset_of_icon_with_exactly_two_extra(self):
        """Quoted in the document as one vocabulary rather than two, so it is asserted as one."""
        device_type = self.entities['DeviceType']['values']
        icon = self.entities['Icon']['values']
        self.assertEqual([v for v in device_type if v not in icon], [])
        self.assertEqual([v for v in icon if v not in device_type], ['Revue', 'PCTV'])
        stated = re.search(r'`Icon` adds exactly two that `DeviceType` lacks: `([A-Za-z0-9_]+)` '
                           r'and `([A-Za-z0-9_]+)`', self.text)
        self.assertIsNotNone(stated)
        self.assertEqual(sorted(stated.groups()), sorted(['Revue', 'PCTV']))


class TheActivityDrawingCoversTheCluster(unittest.TestCase):
    """The second diagram, checked as source rather than as a picture.

    Nothing here renders anything: `dot` is a system tool and a test that needs it would skip on a
    fresh clone. What can be checked without it is that the drawing's **subject** still matches the
    data, which is the half that goes wrong. A picture that silently stopped drawing a role type
    would look fine.
    """

    def setUp(self):
        sys.path.insert(0, str(ROOT / 'tools'))
        import model_pdf
        self.tool = model_pdf
        self.entities = model()['entities']

    def test_the_cluster_is_the_activity_and_both_families(self):
        drawn = set(self.tool.activity_cluster(self.entities))
        actions = {n for n in self.entities
                   if 'AbstractActivityAction' in self.entities[n].get('extends', [])}
        self.assertEqual(drawn, {'Activity', 'ActivityInputState', 'AbstractActivityRole',
                                 'AbstractActivityAction'} | actions)

    def test_the_role_vocabulary_is_every_role_type(self):
        roles = sorted(n for n in self.entities
                       if 'AbstractActivityRole' in self.entities[n].get('extends', []))
        self.assertEqual(self.tool.role_vocabulary(self.entities), roles)

    def test_the_source_draws_every_member_and_the_inheritance(self):
        drawn = self.tool.activity_cluster(self.entities)
        source = self.tool.diagram_dot(self.entities, drawn=drawn, rankdir='TB')
        for name in drawn:
            self.assertIn('  %s [label=' % name, source, '%s is not drawn' % name)
        for name in self.entities:
            if 'AbstractActivityAction' in self.entities[name].get('extends', []):
                self.assertIn('%s -> AbstractActivityAction [style=dashed' % name, source)

    def test_a_relation_leaves_the_field_that_defines_it(self):
        """The port is the whole point of the drawing, so it is asserted rather than eyeballed."""
        source = self.tool.diagram_dot(self.entities,
                                       drawn=self.tool.activity_cluster(self.entities))
        self.assertIn('Activity:Roles -> AbstractActivityRole', source)
        self.assertIn('Activity:EnterActions -> AbstractActivityAction', source)
        self.assertIn('Activity:LeaveActions -> AbstractActivityAction', source)

    def test_the_core_drawing_shows_a_device_its_inherited_name(self):
        """The inheritance bug reached the drawing too, so this pins the fix there."""
        source = self.tool.diagram_dot(self.entities)
        device = source.split('Device [label=')[1].split('];')[0]
        for field in ('Name', 'Model', 'Manufacturer'):
            self.assertIn('>%s<' % field, device, 'the device box has no %s' % field)


class TheButtonMapsSayWhichButtonSendsWhat(unittest.TestCase):
    """The cluster that corroborates the operating concept, asserted against the schema.

    `docs/how-a-harmony-works.md` argues that a device's map and an activity's map are two maps of
    the same keypad. That was derived from Logitech's help pages and from counting agreements over
    fifteen configurations. This is the independent source, so what it says has to be pinned: if the
    schema ever stops having two keyed map types, the corroboration is gone and both documents are
    back to one source.
    """

    def setUp(self):
        self.entities = model()['entities']

    def subclasses(self, base):
        return sorted(n for n in self.entities if base in self.entities[n].get('extends', []))

    def test_a_button_map_is_keyed_by_a_device_by_an_activity_or_by_neither(self):
        self.assertEqual(self.subclasses('AbstractButtonMap'),
                         ['ActivityButtonMap', 'DeviceButtonMap', 'RootButtonMap'])
        self.assertEqual([f['name'] for f in self.entities['DeviceButtonMap']['fields']],
                         ['DeviceId'])
        self.assertEqual([f['name'] for f in self.entities['ActivityButtonMap']['fields']],
                         ['ActivityId'])
        self.assertEqual(self.entities['RootButtonMap']['fields'], [],
                         'the root map is keyed by nothing, which is the whole of its interest')

    def test_both_documents_state_the_corroboration(self):
        for text in (document(),
                     (ROOT / 'docs' / 'how-a-harmony-works.md').read_text(encoding='utf-8')):
            self.assertIn('three subclasses', text)

    def test_a_button_holds_a_press_a_long_press_and_a_double_press(self):
        names = [f['name'] for f in self.entities['AbstractRemoteButton']['fields']]
        for expected in ('ButtonAction', 'ButtonLongPressAction', 'ButtonDoublePressAction'):
            self.assertIn(expected, names)

    def test_the_button_kinds_are_the_ones_the_document_names(self):
        kinds = set(self.subclasses('AbstractRemoteButton'))
        kinds |= set(self.subclasses('HardRemoteButton'))
        self.assertEqual(kinds, {'GestureRemoteButton', 'HardRemoteButton', 'SoftRemoteButton',
                                 'VoiceRemoteButton', 'KeyboardButton', 'SlideOutKeypadButton'})
        for name in kinds:
            self.assertIn('`%s`' % name, document())

    def test_every_button_action_is_in_the_table(self):
        for name in self.subclasses('AbstractButtonAction'):
            with self.subTest(name):
                row = re.search(r'^\| `%s` \| ([^|]+) \|' % name, document(), re.M)
                self.assertIsNotNone(row, 'no row for %s' % name)
                stated = [c.strip().strip('`') for c in row.group(1).split(',')]
                self.assertEqual(stated, [f['name'] for f in self.entities[name]['fields']])

    def test_an_event_type_sits_on_every_button_action(self):
        """The vendor's word for the split this project derived from a key code byte."""
        self.assertIn('EventType',
                      [f['name'] for f in self.entities['AbstractButtonAction']['fields']])


class TheCatalogueDescribesAnInfraredCode(unittest.TestCase):
    """Four claims the document makes about codes, each of which we measured independently."""

    def setUp(self):
        self.entities = model()['entities']

    def test_a_code_states_its_frames_in_two_slots(self):
        """Section 159, reached from the corpus. Here it is an enumeration with two values."""
        self.assertEqual(self.entities['SegmentType']['values'], ['IRSegment', 'CodeSegment'])
        fields = {f['name'] for f in myharmony_model.all_fields(self.entities, 'IrProtocol')}
        self.assertIn('CodeSegments', fields)
        self.assertIn('IRSegments', fields)

    def test_a_key_code_is_a_start_a_repeat_and_a_finish(self):
        """The corpus calls the same three once, held and tail."""
        self.assertEqual(sorted(f['name'] for f in self.entities['ParsedKeyCode']['fields']),
                         ['Finish', 'Repeat', 'Start'])

    def test_quad_is_a_base_and_it_sits_among_the_other_bases(self):
        """The reading that cost a day, confirmed by the company that named the family."""
        values = self.entities['EncodingType']['values']
        self.assertIn('QuadEncoding', values)
        for other in ('BitEncoding', 'HexEncoding', 'ByteEncoding', 'BiphasicEncoding'):
            self.assertIn(other, values)

    def test_a_duration_is_a_mark_or_a_space_and_carries_a_tolerance(self):
        self.assertEqual(self.entities['AtomType']['values'], ['Space', 'Pulse'])
        self.assertEqual(sorted(f['name'] for f in self.entities['Atom']['fields']),
                         ['MaxValue', 'MinValue', 'Type', 'Value'])

    def test_the_quoted_enumerations_are_quoted_whole(self):
        text = document()
        for name in ('AtomType', 'EncodingType', 'SegmentType', 'FlagType', 'RelationType'):
            with self.subTest(name):
                for value in self.entities[name]['values']:
                    self.assertIn('`%s`' % value, text, '%s.%s is not quoted' % (name, value))

    def test_infrared_is_one_transport_among_five(self):
        kinds = sorted(n for n in self.entities
                       if 'AbstractProtocol' in self.entities[n].get('extends', []))
        self.assertEqual(kinds, ['BluetoothProtocol', 'HidProtocol', 'IrProtocol', 'RfProtocol',
                                 'UsbHidProtocol'])


if __name__ == '__main__':
    unittest.main()
