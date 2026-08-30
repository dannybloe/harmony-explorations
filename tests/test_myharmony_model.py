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
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOC = ROOT / 'docs' / 'myharmony-model.md'
DATA = ROOT / 'reference' / 'myharmony-model.json'


def model():
    return json.loads(DATA.read_text(encoding='utf-8'))


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
        if cells[0] in ('field', 'area'):
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
    """The publication rail for this file, asserted rather than assumed.

    The model is a schema: type names, field names and enum values. It carries no reply, no account
    and no identifier, which is what makes it publishable where a captured reply is not. A future
    regeneration that started including sample values would fail here rather than at a code review.
    """

    IDENTITY = re.compile(
        r'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
        r'|@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
    )

    def test_no_guid_and_no_address_appears_anywhere_in_the_model(self):
        found = self.IDENTITY.search(DATA.read_text(encoding='utf-8'))
        self.assertIsNone(found, 'identity shaped text in the model: %r' % (found and found.group(0)))

    def test_an_entity_carries_only_a_shape(self):
        allowed = {'area', 'assembly', 'extends', 'fields', 'isServiceContract', 'kind', 'serviceNamespace', 'values'}
        for name, entity in model()['entities'].items():
            with self.subTest(name):
                self.assertLessEqual(set(entity), allowed)


if __name__ == '__main__':
    unittest.main()
