#!/usr/bin/env python3
"""Structural rules about the documents that `tools/facts.py` cannot check itself.

`make facts` compares every marked number against the corpus, which makes it authoritative about
values and blind to where a marker sits. That blindness cost a commit on 8 August 2026: the
coverage table in `docs/roadmap.md` has one column per finding that moved the number, and
`facts-write` rewrote the historical columns too, so section 66's figures ended up under section
65's heading.

The rule that prevents it is that a history column carries a plain number and no marker, and only
the live column is marked. That is a property of the document, so it is testable here rather than
in the tool.
"""
import os
import re
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARKER = re.compile(r'<!--fact:([a-z0-9_]+)-->')


def table_rows(path, first_cell):
    """The body rows of the markdown table whose first data row starts with `first_cell`.

    Located by its first column rather than by a line number, so inserting a paragraph above it
    does not silently make this test check nothing.
    """
    rows, inside = [], False
    with open(path, encoding='utf-8') as fh:
        for line in fh:
            if not line.startswith('|'):
                if inside:
                    break
                continue
            cells = [c.strip() for c in line.strip().strip('|').split('|')]
            if cells and cells[0] == first_cell:
                inside = True
            if inside:
                rows.append(cells)
    return rows


class TestTheCoverageTable(unittest.TestCase):
    """`docs/roadmap.md`: one column per finding, and only the last one is a claim about now."""

    PATH = os.path.join(ROOT, 'docs', 'roadmap.md')

    def setUp(self):
        self.rows = table_rows(self.PATH, 'Harmony 700')
        self.assertTrue(self.rows, 'the coverage table moved or lost its Harmony 700 row')

    def test_the_table_still_covers_every_architecture(self):
        """The span, not the values. A table that quietly loses a row proves less than it looks."""
        self.assertEqual(len(self.rows), 7)
        joined = ' '.join(row[0] for row in self.rows)
        for expected in ('Harmony 700', 'Harmony 600', 'Harmony One', 'arch 8', 'arch 9',
                         'safe mode'):
            self.assertIn(expected, joined)

    def test_only_the_live_column_carries_a_marker(self):
        """The rule the drift broke.

        A marker states what the corpus says today, so `facts-write` rewrites it whenever a
        finding moves the number. A historical column is a fixed number under a heading naming the
        finding that produced it, and the tool cannot update a heading, so marking one makes it
        rewrite the past.
        """
        for row in self.rows:
            with self.subTest(row[0]):
                marked = [i for i, cell in enumerate(row) if MARKER.search(cell)]
                self.assertEqual(marked, [len(row) - 1],
                                 'only the last column may carry a fact marker')

    def test_every_history_column_holds_a_bare_percentage(self):
        """The other half: a history cell has to be a number, not an empty placeholder."""
        for row in self.rows:
            for cell in row[1:-1]:
                with self.subTest(row=row[0], cell=cell):
                    self.assertRegex(cell, r'^\d+(\.\d+)?%$')


if __name__ == '__main__':
    unittest.main()
