"""
The golden vectors, from the side that generates them.

`packages/codec/test/golden.test.ts` asserts the TypeScript parser reproduces these. This file
asserts the Python parser still produces what is stored, which is the other half: without it, a
change to `gspm.py` would silently move the reference the port is measured against, and the
comparison would go on passing while both sides drifted together.

Generate or refresh with `tools/golden.py --write`.
"""
import json
import os
import sys
import unittest

import lab
from harmony import gspm

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools'))

import golden  # noqa: E402


class TestTheStoredVectorsStillDescribeTheSamples(unittest.TestCase):
    def setUp(self):
        if golden.directory() is None:
            self.skipTest('no lab directory; set HARMONY_LAB')

    def test_every_available_sample_reproduces_its_vector(self):
        checked = 0
        for name in golden.CONTAINERS:
            path = golden.vector_path(name)
            if not lab.path(name) or not os.path.exists(path):
                continue
            with self.subTest(sample=name):
                with open(path) as fh:
                    stored = json.load(fh)
                self.assertEqual(golden.generate(name), stored)
                checked += 1
        if checked == 0:
            self.skipTest('no vectors present; run tools/golden.py --write')

    def test_the_vector_list_covers_every_container_in_the_corpus(self):
        """
        A sample that holds a container but is missing from `CONTAINERS` is a gap that nothing
        else would report: the vector simply would not exist, and both suites would skip it
        without saying so. So the list is checked against the corpus rather than trusted.
        """
        holds_container = []
        for name in lab.IMAGES:
            path = lab.path(name)
            if not path or path.endswith('.hfw'):
                continue
            with open(path, 'rb') as fh:
                data = fh.read()
            try:
                gspm.parse(data)
            except Exception:
                continue
            holds_container.append(name)
        if not holds_container:
            self.skipTest('no images available')
        self.assertEqual(sorted(holds_container), sorted(golden.CONTAINERS))

    def test_a_vector_is_not_nearly_empty(self):
        """The comparison has to have something in it, on this side too."""
        for name in golden.CONTAINERS:
            path = golden.vector_path(name)
            if not os.path.exists(path):
                continue
            with open(path) as fh:
                vector = json.load(fh)
            with self.subTest(sample=name):
                self.assertGreaterEqual(len(vector['sections']), 19)
                self.assertGreaterEqual(len(vector['checks']), 7)
                for field in ('flash_base', 'end_addr', 'pointer_count', 'trailer_checksum'):
                    self.assertIn(field, vector)

    def test_the_summary_shape_matches_what_the_tool_prints(self):
        """
        `tools/gspm_parse.py --json` and the vectors are the same object by construction now, and
        this is what keeps it that way: the tool delegating to `gspm.summary` is the only reason
        the golden format is a contract rather than two similar dictionaries.
        """
        name = next((n for n in golden.CONTAINERS if lab.path(n)), None)
        if name is None:
            self.skipTest('no images available')
        with open(lab.path(name), 'rb') as fh:
            container = gspm.parse(fh.read())
        self.assertEqual(sorted(gspm.summary(container)), sorted(golden.generate(name)))


if __name__ == '__main__':
    unittest.main()
