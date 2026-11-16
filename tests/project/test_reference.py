"""
The reference stays a reference: plan 009 section 5, decision 25.

Six guards, each defined once in `tools/reference_guards.py` and each run here in full:

1. **No bench.** `reference/` describes how a Harmony works and never our own work: no bench, lab,
   dump, test account, our unit, the spare, everyday, friend or todo, no lab fixture name, no link into
   the test notes, the lab register or the lab. Logitech's generated data files are exempt.
2. **No person.** The names come from this repository's commit authors and the contributor headings of
   `docs/checksums.md`, read at run time, so this file names nobody, which the last test here checks.
3. **No copy of Logitech's device database.** Its repository, its checkout, the variable that locates
   it, decision 15, "the archive" in the sense of the copy, and its author, read from the checkout's
   own commits when `packages/lab` finds it. Everything but the author applies without the checkout.
4. **Footnotes well formed**, plan 009 section 4: an allowed label, allowed evidence words that match
   the label, every reference defined and every definition referenced, one source per footnote, and
   the archive section, decision or test it names exists.
5. **Links resolve**, file and anchor, in `reference/`, `docs/`, the root documents and the skills.
   The archive's own links are `tests/project/test_archive.py`'s.
6. **The FHSDK's section speaks to a stranger.** `reference/sdk/` is mostly generated from the packages' doc
   comments, whose public part ends at `@privateRemarks`, so its prose carries no findings section, plan, decision or
   requirement number, no todo, no HTML comment but the generator's markers, no date, no relative time, no bench,
   lab, dump or appliance, no architecture number, and no link to `CLAUDE.md`, the findings archive, a plan or a
   test. Prose is the text outside code, and the comments printed inside a code block.

**Two narrowings in that section, each by kind, with the reason beside it in the guards.** The API's own names say
`bench`, `BENCH_MODELS` among them, so in `reference/sdk/` the bench guard counts that word in prose alone and lets it
pass in code formatting, in generated and hand written pages alike, which
`test_the_word_bench_passes_in_the_sdk_section_only_as_code` holds; and the API's parameters name the device archive,
so there the bare word `archive` is not counted while "catalogue, archived", a path to the converter's modules and
"the infrared archive" still are, which `test_the_sdk_section_passes_the_word_archive_and_nothing_else_of_the_copy`
holds.

**The pinned lists, and why they may only shrink.** The reference was not clean when these guards were
written, and was cleaned file by file afterwards. So `PINNED` below holds exactly what each
guard finds today, as counts per file and per kind, written by `tools/reference_guards.py --pin`. Two
tests per guard hold it to that:

* `..._finds_nothing_beyond_its_pinned_list` fails on a file or kind not on the list and on a count
  that rose: nothing new gets into the reference.
* `..._pinned_list_has_only_shrunk` fails when a count fell and the list did not follow. That is the
  moment to run `--pin`: the list then shrinks, and reading its diff shows what a step removed.

**The list may only ever shrink.** A pin that adds an entry or raises a count is a violation being
waved through and must not be committed; the fix is in the document, not here. A person's name never
reaches a key: `redact` turns a key holding one into a digest.

**Each guard was shown failing before it was relied on**, twice over. Once on the real tree, by
planting one violation per guard in a reference page and watching the first test fail. And
permanently, in `PlantedViolations`: each checker is run
over a small synthetic tree holding one violation of each kind it knows, and must report every one of
them and nothing on the clean twin. A guard whose checker went blind would pass its pinned list
trivially, which is the failure that class exists to catch.
"""
import collections
import os
import re
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tools'))

import reference_guards as guards  # noqa: E402

# BEGIN PINNED: written by tools/reference_guards.py --pin, never by hand
PINNED = {
    'bench': {
    },
    'names': {
    },
    'copy': {
    },
    'footnotes': {
    },
    'links': {
    },
    'sdk': {
    },
}
# END PINNED

_RESULTS = None


def results():
    """Every guard's findings over the real tree, computed once for the whole module."""
    global _RESULTS
    if _RESULTS is None:
        _RESULTS = guards.run_all()
    return _RESULTS


def compare(found, pinned, uncomputed=()):
    """(new, stale): entries above their pinned count, and pinned entries now below it.

    Kinds in `uncomputed` were not looked for on this machine and are left out of both directions.
    """
    found = {k: v for k, v in found.items() if k[1] not in uncomputed}
    pinned = {k: v for k, v in pinned.items() if k[1] not in uncomputed}
    new = sorted((k, pinned.get(k, 0), v) for k, v in found.items() if v > pinned.get(k, 0))
    stale = sorted((k, v, found.get(k, 0)) for k, v in pinned.items() if found.get(k, 0) < v)
    return new, stale


def describe(rows):
    return '\n'.join('%s: %s, pinned %d, found %d' % (path, kind, was, now)
                     for (path, kind), was, now in rows)


class GuardsAgainstThePinnedList(unittest.TestCase):
    """The real tree against `PINNED`, two tests per guard."""

    def check(self, guard):
        found, uncomputed = results()
        new, stale = compare(found[guard], PINNED.get(guard, {}), uncomputed.get(guard, ()))
        return new, stale

    def assert_nothing_new(self, guard):
        new, _ = self.check(guard)
        self.assertEqual(new, [], 'new %s violations, fix the document rather than the pin:\n%s'
                         % (guard, describe(new)))

    def assert_only_shrunk(self, guard):
        _, stale = self.check(guard)
        self.assertEqual(stale, [], '%s violations were removed: run tools/reference_guards.py --pin '
                         'so the list shrinks with them:\n%s' % (guard, describe(stale)))

    def test_bench_finds_nothing_beyond_its_pinned_list(self):
        self.assert_nothing_new('bench')

    def test_bench_pinned_list_has_only_shrunk(self):
        self.assert_only_shrunk('bench')

    def test_names_finds_nothing_beyond_its_pinned_list(self):
        self.assert_nothing_new('names')

    def test_names_pinned_list_has_only_shrunk(self):
        self.assert_only_shrunk('names')

    def test_copy_finds_nothing_beyond_its_pinned_list(self):
        self.assert_nothing_new('copy')

    def test_copy_pinned_list_has_only_shrunk(self):
        self.assert_only_shrunk('copy')

    def test_footnotes_finds_nothing_beyond_its_pinned_list(self):
        self.assert_nothing_new('footnotes')

    def test_footnotes_pinned_list_has_only_shrunk(self):
        self.assert_only_shrunk('footnotes')

    def test_links_finds_nothing_beyond_its_pinned_list(self):
        self.assert_nothing_new('links')

    def test_links_pinned_list_has_only_shrunk(self):
        self.assert_only_shrunk('links')

    def test_sdk_finds_nothing_beyond_its_pinned_list(self):
        self.assert_nothing_new('sdk')

    def test_sdk_pinned_list_has_only_shrunk(self):
        self.assert_only_shrunk('sdk')

    def test_the_pin_holds_every_guard_and_nothing_else(self):
        """A guard missing from `PINNED` would be compared against an empty list and look clean."""
        self.assertEqual(sorted(PINNED), sorted(guards.GUARDS))

    def test_the_comparison_reports_both_directions(self):
        """`compare` itself: one entry risen, one new, one fallen, one gone, one unchanged."""
        pinned = {('a', 'x'): 2, ('b', 'x'): 1, ('c', 'x'): 3, ('d', 'x'): 1}
        found = collections.Counter({('a', 'x'): 3, ('e', 'x'): 1, ('c', 'x'): 1, ('d', 'x'): 1})
        new, stale = compare(found, pinned)
        self.assertEqual([k for k, _, _ in new], [('a', 'x'), ('e', 'x')])
        self.assertEqual([k for k, _, _ in stale], [('b', 'x'), ('c', 'x')])
        self.assertEqual(compare(found, pinned, uncomputed=('x',)), ([], []))


def write(root, relative, text):
    path = os.path.join(root, relative)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as handle:
        handle.write(text)
    return path


# A token no person carries, standing in for a name, so the controls name nobody either.
NOT_A_NAME = 'qwxyzzyv'


class PlantedViolations(unittest.TestCase):
    """Every checker on a synthetic tree: each planted violation found, the clean twin silent."""

    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = self.temporary.name
        write(self.root, 'docs/findings.md', '# Findings\n\n<a id="s1"></a>\n## 1. One\n\ntext\n')
        write(self.root, 'docs/decisions.md', '# Decisions\n\n1. <a id="d1"></a>**One.** text\n')
        write(self.root, 'docs/test-notes/harmony-one.md', '# Notes\n')
        write(self.root, 'tests/test_thing.py', '"""The argument."""\n')

    def tearDown(self):
        self.temporary.cleanup()

    def kinds(self, counter):
        return sorted({kind for _, kind in counter})

    def test_bench(self):
        write(self.root, 'reference/clean.md', '# Clean\n\nA label, a dumpling, a benchmark.\n')
        write(self.root, 'reference/logitech/data-model/entities.md', 'the lab, the bench\n')
        write(self.root, 'reference/page.md', (
            'Read off the bench, from a dump in the lab, on our unit, the spare, the everyday one, a '
            "friend's, a test account; see todo.md, and the fixture `h600_config` or one.bin.\n"
            '[notes](../docs/test-notes/harmony-one.md)\n'))
        # A footnote's link to a test in the package called `bench` is a path, not prose about the bench.
        write(self.root, 'reference/measured.md', 'Heard[^t-x].\n\n[^t-x]: Measured on a unit. '
              '[The test](../packages/bench/test/x.test.ts)\n')
        found = guards.bench_violations(self.root, fixtures={'h600_config', 'one.bin'})
        self.assertEqual({path for path, _ in found}, {'reference/page.md'})
        self.assertEqual(self.kinds(found), sorted(
            [kind for kind, _ in guards.BENCH_WORDS]
            + ['fixture h600_config', 'fixture one.bin', 'link into docs/test-notes/']))

    def test_the_word_bench_passes_in_the_sdk_section_only_as_code(self):
        """In code formatting, generated page or hand written: passes. In prose, or in a comment in a block: counted."""
        write(self.root, 'reference/sdk/api/page.md', (
            '# Page\n\nThe models `BENCH_MODELS` lists, `Proof.bench`.\n\n```ts\nconst BENCH_MODELS: readonly '
            'BenchModel[]\n```\n'))
        write(self.root, 'reference/sdk/guide.md', 'Ask `benchModel` for one.\n')
        self.assertEqual(dict(guards.bench_violations(self.root)), {})
        write(self.root, 'reference/sdk/api/page.md', (
            '# Page\n\nRead off the bench.\n\n```ts\ninterface Proof {\n  /** Where it was shown on the bench. */\n'
            '  readonly bench: string;\n}\n```\n'))
        write(self.root, 'reference/sdk/guide.md', 'Off the bench, `BENCH_MODELS`.\n')
        self.assertEqual(dict(guards.bench_violations(self.root)), {
            ('reference/sdk/api/page.md', 'bench'): 2, ('reference/sdk/guide.md', 'bench'): 1})

    def test_the_sdk_section_passes_the_word_archive_and_nothing_else_of_the_copy(self):
        """The bare word passes in the section; the rest of its kind, and every other kind, is counted there."""
        write(self.root, 'reference/sdk/guide.md', 'The device archive, `BuildSources.archive`, an archive source.\n')
        self.assertEqual(dict(guards.copy_violations(self.root, authors=None)), {})
        write(self.root, 'reference/sdk/guide.md', (
            'The infrared archive; the catalogue, archived; '
            '[the converter](../../packages/config/src/catalogue/archive.ts); cloned from logitech-harmony-ir-archive.\n'))
        self.assertEqual(dict(guards.copy_violations(self.root, authors=None)), {
            ('reference/sdk/guide.md', 'its checkout'): 1,
            ('reference/sdk/guide.md', 'the archive, meaning the copy'): 2,
            ('reference/sdk/guide.md', 'its repository'): 1})

    def test_sdk(self):
        """Each kind of the section's guard planted once, in prose or in a comment printed in a block, and the clean twin."""
        write(self.root, 'CLAUDE.md', '# Brief\n')
        write(self.root, 'docs/plans/001-a-plan.md', '# A plan\n')
        write(self.root, 'packages/base/test/x.test.ts', '// a test\n')
        clean = (
            '# Page\n\n<!-- introduction -->\nWhat it is.\n<!-- /introduction -->\n\n'
            '<!-- Generated from the source comments by `make api-reference-write`: change the source. -->\n\n'
            '<!-- example:packages/remote/examples/x.ts -->\n```ts\nconst R12 = 1; // the twelfth\n```\n'
            '<!-- /example -->\n\n<!-- shape:@freeharmony-sdk/base#Proof -->\n```ts\ninterface Proof {\n'
            '  /** Where it was shown on a remote. */\n  readonly bench: string;\n}\n```\n<!-- /shape -->\n\n'
            'A `section 3`, `R12`, `decision 4` and `plan 013` in code; a label, a dumpling, a benchmark; built at a '
            'moment, a fortnightly, the 16th of the month. [The guide](guide.md). An `arch 14` in code, an '
            'architecture, the archives, ARCH_8_PRODUCT.\n\n'
            '```ts\nconst MODELS = {\n  \'Harmony 650\': { architecture: 14 },\n};\n```\n')
        write(self.root, 'reference/sdk/api/clean.md', clean)
        write(self.root, 'reference/sdk/guide.md', '# Guide\n')
        self.assertEqual(dict(guards.sdk_violations(self.root)), {})
        write(self.root, 'reference/sdk/api/page.md', (
            '# Page\n\nSee section 128, plan 013 and decision 44, R92 and a todo; a <!--superseded--> claim and an '
            '&lt;!--superseded--> one; on 16 November 2026, and recently; the bench, the lab, a dump, an appliance; '
            'on arch 14 and Arch 0x10, architecture 12 and architectures 8.\n\n'
            '```ts\ninterface Thing {\n  /** Read for weeks, section 7, on arch 9. */\n  readonly a: number;\n}\n```\n\n'
            '[brief](../../../CLAUDE.md) [archive](../../../docs/findings.md) [plan](../../../docs/plans/001-a-plan.md) '
            '[test](../../../packages/base/test/x.test.ts)\n'))
        found = guards.sdk_violations(self.root)
        self.assertEqual({path for path, _ in found}, {'reference/sdk/api/page.md'})
        self.assertEqual(dict(found), {
            ('reference/sdk/api/page.md', 'section number'): 2,
            ('reference/sdk/api/page.md', 'plan number'): 1,
            ('reference/sdk/api/page.md', 'decision number'): 1,
            ('reference/sdk/api/page.md', 'requirement number'): 1,
            ('reference/sdk/api/page.md', 'todo'): 1,
            ('reference/sdk/api/page.md', 'html comment'): 2,
            ('reference/sdk/api/page.md', 'date'): 1,
            ('reference/sdk/api/page.md', 'relative time'): 2,
            ('reference/sdk/api/page.md', 'bench'): 1,
            ('reference/sdk/api/page.md', 'lab'): 1,
            ('reference/sdk/api/page.md', 'dump'): 1,
            ('reference/sdk/api/page.md', 'appliance'): 1,
            ('reference/sdk/api/page.md', 'architecture number'): 5,
            ('reference/sdk/api/page.md', 'link to CLAUDE.md'): 1,
            ('reference/sdk/api/page.md', 'link to docs/findings.md'): 1,
            ('reference/sdk/api/page.md', 'link to a plan'): 1,
            ('reference/sdk/api/page.md', 'link to a test'): 1,
        })
        self.assertEqual(sorted({kind for _, kind in found}), sorted(
            [kind for kind, _, _ in guards.SDK_WORDS] + ['html comment'] + [kind for kind, _ in guards.SDK_LINKS]))

    def test_names(self):
        write(self.root, 'reference/clean.md', 'Nobody here.\n')
        write(self.root, 'reference/page.md', 'As %s said.\n' % NOT_A_NAME.capitalize())
        found = guards.name_violations(self.root, people={NOT_A_NAME})
        self.assertEqual(dict(found), {('reference/page.md', 'a person'): 1})
        self.assertEqual(guards.redact('by %s' % NOT_A_NAME, {NOT_A_NAME})[:9], 'redacted ')
        self.assertEqual(guards.redact('by nobody', {NOT_A_NAME}), 'by nobody')

    def test_names_come_from_the_contributor_headings(self):
        write(self.root, 'docs/checksums.md', '## Contributed by %s, a date\n' % NOT_A_NAME)
        self.assertIn(NOT_A_NAME, guards.person_names(self.root))

    def test_copy(self):
        write(self.root, 'reference/clean.md', (
            'The metadata archive, an archived package, archive section 3, the findings archive.\n'))
        write(self.root, 'reference/page.md', (
            'Cloned from logitech-harmony-ir-archive, located by HARMONY_IR_ARCHIVE under decision 15, '
            'the infrared archive by %s; the archive names it.\n' % NOT_A_NAME))
        with_author = guards.copy_violations(self.root, authors={NOT_A_NAME})
        self.assertEqual({path for path, _ in with_author}, {'reference/page.md'})
        self.assertEqual(self.kinds(with_author),
                         sorted([kind for kind, _ in guards.COPY_PATTERNS] + ['its author']))
        without = guards.copy_violations(self.root, authors=None)
        self.assertNotIn('its author', self.kinds(without))
        self.assertEqual(len(self.kinds(without)), len(guards.COPY_PATTERNS))

    def test_footnotes(self):
        good = (
            'Fact[^s1], choice[^d1], later[^t-thing], outside[^x-forum], open[^unchecked], again[^s1b],\n'
            'read[^r-timers].\n\n'
            # A reference directly followed by a colon is still a reference: the guard once told a
            # definition by its colon and missed this one.
            'As measured[^s1c]: a colon after a reference.\n\n'
            # And one at a line's start behind inline code: the definition test once read the line
            # with its code removed, so this read as a second definition of s1c.
            '`57`[^s1c]: a line that opens with code.\n\n'
            '[^s1]: Read in the firmware. [Section 1](../docs/findings.md#s1)\n'
            '[^d1]: Chosen by this project. [Decision 1](../docs/decisions.md#d1)\n'
            '[^t-thing]: Measured on a unit. [The test](../tests/test_thing.py)\n'
            '[^x-forum]: Stated by a third party. [The table](https://example.org/table)\n'
            '[^unchecked]: Not checked.\n'
            '[^s1b]: Stated by Logitech, in their client. [Section 1](../docs/findings.md#s1)\n'
            '[^s1c]: Measured on a unit. [Section 1](../docs/findings.md#s1)\n'
            '[^r-timers]: Read in the firmware. The application 4.4, the table at `0x223`.\n'
            '```\n[^s9]: an example in a fence is not a footnote\n```\n')
        path = write(self.root, 'reference/clean.md', good)
        self.assertEqual(guards.footnote_problems(path, good, self.root), [])
        bad = (
            'A[^S1] b[^s2] c[^s1] d[^d1] e[^d7] f[^t-thing] g[^x-a] h[^unchecked] i[^s3] j[^nodef] k[^d2]\n'
            'l[^r-linked] m[^r-bare] n[^r-chosen].\n\n'
            '[^S1]: Read in the firmware. [Section 1](../docs/findings.md#s1)\n'
            '[^s2]: Read in the firmware. [Section 2](../docs/findings.md#s2)\n'
            '[^s1]: Guessed. [Section 1](../docs/findings.md#s1)\n'
            '[^d1]: Read in the firmware. [Decision 1](../docs/decisions.md#d1)\n'
            '[^d7]: Chosen by this project. [Decision 7](../docs/decisions.md#d7)\n'
            '[^t-thing]: Measured on a unit. [Not a test](../docs/findings.md)\n'
            '[^x-a]: Stated by a third party. [Local](../docs/findings.md)\n'
            '[^unchecked]: Not checked. [Section 1](../docs/findings.md#s1)\n'
            '[^s3]: Read in the firmware. [Section 1](../docs/findings.md#s1) [Section 3](../docs/findings.md#s3)\n'
            '[^orphan]: Not checked.\n'
            '[^r-linked]: Read in the firmware. [Section 1](../docs/findings.md#s1)\n'
            '[^r-bare]: Read in the firmware.\n'
            '[^r-chosen]: Chosen by this project. The table at `0x223`.\n'
            '[^d2]: Chosen by this project. [Decision 1](../docs/decisions.md#d1)\n'
            '[^s1]: Read in the firmware. [Section 1](../docs/findings.md#s1)\n')
        path = write(self.root, 'reference/page.md', bad)
        problems = set(guards.footnote_problems(path, bad, self.root))
        self.assertEqual(problems, {
            ('S1', 'label not of an allowed form'),
            ('s2', 'names a section the archive does not hold'),
            ('s1', 'evidence words not allowed'),
            ('s1', 'defined more than once'),
            ('d1', 'evidence words do not match the label'),
            ('d7', 'names a decision that does not exist'),
            ('t-thing', 'does not link a test file'),
            ('x-a', 'outside source without a public address'),
            ('unchecked', 'links although not checked'),
            ('s3', 'does not name exactly one source'),
            ('nodef', 'referenced and never defined'),
            ('nodef', 'label not of an allowed form'),
            ('orphan', 'defined and never referenced'),
            ('orphan', 'label not of an allowed form'),
            ('d2', 'does not link its own decision'),
            ('r-linked', 'links although it says in words where it was read'),
            ('r-bare', 'does not say where it was read'),
            ('r-chosen', 'evidence words do not match the label'),
        })
        counted = guards.footnote_violations(self.root)
        self.assertEqual({path for path, _ in counted}, {'reference/page.md'})

    def test_links(self):
        write(self.root, 'reference/target.md', (
            '# Target\n\n## A heading, with `code` and [a link](clean.md)\n\n## Twice\n\n## Twice\n\n'
            '<a id="s5"></a>\n'))
        clean = ('[a](target.md) [b](target.md#a-heading-with-code-and-a-link) '
                 # `#twice-1`, GitHub's number for the second heading, is refused since the website numbers it `_1`,
                 # test_an_anchor_counts_only_where_github_and_the_website_agree
                 '[d](target.md#s5) [e](#self) [f](https://example.org/x) ![g](target.md)\n\n'
                 '## Self\n\n`[not](a-link.md)`\n\n```\n[not](a-link.md)\n```\n[ref]: target.md#twice\n')
        path = write(self.root, 'reference/clean.md', clean)
        self.assertEqual(guards.broken_links(path, clean, self.root), [])
        bad = ('[a](gone.md) [b](../reference/target.md#nowhere) [c](../../outside.md) [d](#nothing)\n'
               '[ref]: gone-too.md\n<a href="also-gone.md">e</a>\n')
        path = write(self.root, 'docs/page.md', bad)
        self.assertEqual(sorted(reason for _, _, reason in guards.broken_links(path, bad, self.root)),
                         ['leaves the repository', 'missing anchor', 'missing anchor',
                          'missing file', 'missing file', 'missing file'])
        self.assertEqual({p for p, _ in guards.link_violations(self.root)}, {'docs/page.md'})

    def test_links_leave_the_archive_to_its_own_test(self):
        write(self.root, 'docs/findings.md', '[a](gone.md)\n')
        self.assertEqual(guards.link_violations(self.root), collections.Counter())

    def test_an_anchor_counts_only_where_github_and_the_website_agree(self):
        """A link the guard passed and the website's strict build refused, found by step 6.2.

        A heading holding `|` is `0x80--n` on GitHub and `0x80-n` on the website, and a repeated
        heading is numbered `-1` on one and `_1` on the other. Each check accepted one form, so a link
        passed here and broke there. Both forms of each are refused now, and a plain heading still
        resolves, so this cannot pass by refusing everything.
        """
        write(self.root, 'reference/a.md', '# Page\n\n## 0x80 | n calls a list\n\n## Twice\n\n## Twice\n\n## Plain words\n')
        write(self.root, 'reference/b.md', ''.join('[x](a.md#%s)\n' % anchor for anchor in (
            '0x80--n-calls-a-list', '0x80-n-calls-a-list', 'twice-1', 'twice_1', 'twice', 'plain-words')))
        found = guards.link_violations(self.root)
        self.assertEqual(sum(found.values()), 4, found)
        self.assertEqual({p for p, _ in found}, {'reference/b.md'})


class ThisGuardNamesNobody(unittest.TestCase):
    """Plan 009 section 5: the names are read at run time, so the guard's own files carry none."""

    def test_neither_the_test_nor_the_script_names_a_person(self):
        people = guards.person_names()
        authors = guards.catalogue_authors(guards.catalogue_checkout()) or set()
        pattern = guards.word_pattern(people | authors)
        self.assertIsNotNone(pattern, 'no names were read, so this checks nothing')
        for path in (os.path.abspath(__file__), os.path.join(ROOT, 'tools', 'reference_guards.py')):
            with open(path, encoding='utf-8') as handle:
                self.assertEqual(pattern.findall(handle.read()), [], path)


class EveryPageIsOnTheSiteMenu(unittest.TestCase):
    """
    The site's strict build refuses a page in `reference/` that `mkdocs.yml`'s navigation leaves out, and a
    page the navigation names that does not exist. That build runs only on GitHub after a push and as
    `make site`, which `make all` does not run, so a page added without its menu entry passed every local
    check and failed the published site on every push: the Harmony 515's ten pages, from their first commit
    on, until this test. It reads the two lists itself, with no MkDocs installed, so it runs in `make test`
    and in the pre-commit hook's suite.

    A page is covered when the navigation names it or `extra.off_site` names it or a folder above it,
    the pages `tools/site/hooks.py` keeps off the site on purpose.
    """

    @staticmethod
    def _menu_and_off_site():
        menu, off_site, block = set(), [], None
        with open(os.path.join(ROOT, 'mkdocs.yml'), encoding='utf-8') as handle:
            for line in handle:
                if re.match(r'^\S', line):
                    block = 'nav' if line.startswith('nav:') else None
                elif re.match(r'^  off_site:', line):
                    block = 'off_site'
                elif re.match(r'^  \S', line) and block == 'off_site':
                    block = None
                found = re.search(r'(\S+(?:\.md|/))\s*$', line)
                if found and block == 'nav':
                    menu.add(found.group(1))
                elif found and block == 'off_site':
                    off_site.append(found.group(1))
        return menu, off_site

    def test_every_reference_page_is_on_the_menu_or_kept_off_the_site(self):
        menu, off_site = self._menu_and_off_site()
        self.assertTrue(menu and off_site, 'mkdocs.yml read as having no menu or no off site list')
        pages = set()
        for folder, _, files in os.walk(os.path.join(ROOT, 'reference')):
            for name in files:
                if name.endswith('.md'):
                    pages.add(os.path.relpath(os.path.join(folder, name), os.path.join(ROOT, 'reference')))
        left_out = sorted(p for p in pages - menu
                          if not any(p == o or (o.endswith('/') and p.startswith(o)) for o in off_site))
        self.assertEqual(left_out, [], 'add these to the nav in mkdocs.yml')
        self.assertEqual(sorted(p for p in menu if p not in pages), [], 'the nav names pages that do not exist')


if __name__ == '__main__':
    unittest.main()
