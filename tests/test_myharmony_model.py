"""The MyHarmony data model: the document against the data it reads.

`reference/myharmony-model.json` is the recovered model and `docs/myharmony-model.md` is the
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
DOC = ROOT / 'docs' / 'myharmony-model.md'
DATA = ROOT / 'reference' / 'myharmony-model.json'


OPERATIONS = ROOT / 'reference' / 'myharmony-operations.json'


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

    def test_the_field_names_match_exactly(self):
        for name in self.ENTITIES:
            with self.subTest(name):
                rows = two_column_table(self.text, '\n### %s\n' % name)
                entity = self.model['entities'][name]
                self.assertEqual(
                    [field for field, _ in rows],
                    [f['name'] for f in entity['fields']],
                )

    def test_the_field_types_match_exactly(self):
        for name in self.ENTITIES:
            with self.subTest(name):
                rows = two_column_table(self.text, '\n### %s\n' % name)
                entity = self.model['entities'][name]
                stated = {field: shown for field, shown in rows}
                for field in entity['fields']:
                    shown = stated[field['name']]
                    expected = field['type'] + (' list' if field['many'] else '')
                    self.assertEqual(shown, expected, '%s.%s' % (name, field['name']))


class TheDocumentedVocabulariesAreTheModelsEnums(unittest.TestCase):
    """The enumerations quoted in the document, in the model's own order and complete."""

    VOCABULARIES = ('DeviceCategory', 'ActivityType', 'ActivityState', 'ActivityGroup')

    def setUp(self):
        self.model = model()
        self.text = document()

    def test_each_vocabulary_is_quoted_whole_and_in_order(self):
        for name in self.VOCABULARIES:
            with self.subTest(name):
                pattern = re.compile(r'\*\*`%s`\*\*: (.+)' % name)
                found = pattern.search(self.text)
                self.assertIsNotNone(found, 'no line for %s' % name)
                quoted = [v.strip().strip('`') for v in found.group(1).split(',')]
                self.assertEqual(quoted, self.model['entities'][name]['values'])


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


if __name__ == '__main__':
    unittest.main()
