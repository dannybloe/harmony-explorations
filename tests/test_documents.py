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
import collections
import re
import sys
import os
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))

import facts  # noqa: E402

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


class TestTheCorrectionExemption(unittest.TestCase):
    """`tools/facts.py`: which line openings excuse a dead phrase, and which must not.

    The phrase check allows a superseded claim inside a correction, because recording corrections
    in place is the house convention. It decides that from how the line opens, and `*` used to
    match a line opening in **bold** as well as one opening in *italics*. These documents open a
    load-bearing sentence in bold constantly, so the exemption was widest exactly where a summary
    would restate a dead claim. Found on 8 August 2026 by removing a correction marker to confirm
    the guard fired, and watching it not fire.
    """

    def test_bold_is_not_a_correction(self):
        self.assertFalse(facts.is_correction('**A claim stated in bold, which is not a note.**'))

    def test_the_forms_actually_in_use_still_are(self):
        """Assert the positives too: a fix that made the check refuse every correction would
        pass a test that only checked the negative."""
        self.assertTrue(facts.is_correction('> a blockquote, the long form'))
        self.assertTrue(facts.is_correction('~~struck through, the in place form~~'))
        self.assertTrue(facts.is_correction('*an italic note, the short form*'))
        self.assertTrue(facts.is_correction('* a bullet, which the lists of consequences use'))


class TestAPhraseCanHideInALineBreak(unittest.TestCase):
    """`docs/findings.md` section 74's sweep.

    The phrase check scanned line by line, and these documents wrap at about a hundred characters,
    so a banned phrase long enough to straddle a wrap was invisible to it. Measured before the fix:
    two of seventeen occurrences in the tree, both of the same 29 character phrase, and one of them
    was a real restatement that had survived two sweeps.
    """

    def test_the_flattened_text_carries_a_line_number_per_character(self):
        lines = ['first line', 'second line']
        flat, owner = facts.flatten(lines)
        self.assertEqual(flat, 'first line second line')
        self.assertEqual(len(owner), len(flat))
        self.assertEqual(owner[0], 0)
        self.assertEqual(owner[flat.index('second')], 1)

    def test_indentation_does_not_survive_flattening(self):
        """Otherwise a phrase wrapping into an indented continuation would still be missed."""
        flat, _ = facts.flatten(['a claim that', '    continues indented'])
        self.assertEqual(flat, 'a claim that continues indented')

    def test_a_phrase_split_across_a_wrap_is_found(self):
        """The behaviour the fix exists for, stated against the checker's own search."""
        # The phrase is dead and quoted on purpose, which is what the escape token is for.
        lines = ['some text wanting a', 'firmware nobody has, restated']  # <!--superseded-->
        flat, owner = facts.flatten(lines)
        at = flat.lower().find('wanting a firmware nobody has')  # <!--superseded-->
        self.assertGreaterEqual(at, 0, 'a wrapped phrase must be visible once flattened')
        # And it must report the line the phrase starts on, not the one it ends on.
        self.assertEqual(owner[at], 0)

    def test_the_documents_are_clean_under_the_flattened_check(self):
        """The check itself, over the real tree. Pure text, so it needs no lab."""
        self.assertEqual(facts.check_phrases(), [])

    def test_the_check_reads_the_source_and_not_only_the_documents(self):
        """The hole section 139 closed, asserted rather than assumed.

        The check walked `*.md` alone, so a comment restating a superseded claim was unguarded, which
        is the half where it matters: a stale document misleads a reader and a stale comment misleads
        whoever edits the code beside it. Twenty hits the day it was switched on, two of them written
        that morning by the commit that superseded them.
        """
        seen = list(facts.sources())
        self.assertTrue(any(p.endswith('gspm.py') for p in seen))
        self.assertTrue(any(p.endswith('gspm.ts') for p in seen))
        # Nothing from a build output or a dependency, which would be somebody else's prose.
        for path in seen:
            for skipped in facts.SKIP_DIRECTORIES:
                self.assertNotIn(os.sep + skipped + os.sep, path, path)

    def test_a_source_comment_may_not_lean_on_the_markdown_escapes(self):
        """Only the explicit token counts in source, and the reason is mechanical.

        Every line of a JSDoc block opens with `*`, which `is_correction` reads as a markdown bullet,
        so honouring the structural forms in a `.ts` file makes the check pass on any comment in
        `packages/`. It did: a dead screen program count sat in `screen.ts` behind exactly that.
        """
        dead = 'The header is 21 bytes'  # <!--superseded-->, quoted to check the checker
        self.assertIn(dead, [p for p, _ in facts.superseded_phrases()])
        # A bullet is the escape in markdown and is not one in source. Asserted through the checker's
        # own predicate, so the test fails if the convention changes rather than if the wording does.
        self.assertTrue(facts.is_correction('* %s' % dead))
        self.assertFalse(facts.QUOTED in '* %s' % dead)


class TestTheDetachedMarkerDiagnostic(unittest.TestCase):
    """`tools/facts.py`: which site the "no number in front of it" complaint names.

    The complaint is a diagnostic rather than a check, and it named the wrong site. `attached` was
    a **set** of fact names, so two properly attached uses of one fact in a document collapsed to a
    single entry and the second use was reported as detached, while the real offender elsewhere in
    the same file went unnamed. It needs a document that uses one fact twice **and** carries a
    genuinely detached marker, which is why it survived: the second condition is rare and the
    message is believed. Found on 14 August 2026 while adding `container_checks`, which supplied
    the detached marker to `docs/roadmap.md`, where `text_glyphs` appears twice.
    """

    def complaints(self, text):
        """What the diagnostic says about one document's text, with the rest of the tool stubbed."""
        seen = []
        attached = collections.Counter(m.group(2) for m in facts.MARKER.finditer(text))
        for name in facts.ANY_MARKER.findall(text):
            if attached[name] > 0:
                attached[name] -= 1
                continue
            seen.append(name)
        return seen

    def test_a_fact_used_twice_and_attached_twice_is_not_reported(self):
        text = 'a 5<!--fact:alpha--> and later 7<!--fact:alpha--> again'
        self.assertEqual(self.complaints(text), [])

    def test_the_detached_marker_is_the_one_named(self):
        """The case that was wrong: the innocent duplicate used to be reported and the guilty one not."""
        text = ('a 5<!--fact:alpha--> and later 7<!--fact:alpha--> again, '
                'plus fifteen<!--fact:beta--> spelled out')
        self.assertEqual(self.complaints(text), ['beta'])

    def test_a_genuinely_detached_marker_is_still_caught(self):
        """So the fix cannot have been to stop complaining."""
        self.assertEqual(self.complaints('fifteen<!--fact:beta--> spelled out'), ['beta'])

    def test_the_shipped_tool_agrees_with_this_reading(self):
        """Against `tools/facts.py` itself, so the two cannot drift apart."""
        source = open(os.path.join(ROOT, 'tools', 'facts.py'), encoding='utf-8').read()
        self.assertIn('collections.Counter(m.group(2) for m in MARKER.finditer(text))', source)
        self.assertNotIn('attached = {m.group(2) for m in MARKER.finditer(text)}', source)


if __name__ == '__main__':
    unittest.main()
