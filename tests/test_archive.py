"""
The archive stays an archive: `docs/findings.md` and `docs/decisions.md`, decision 25 and plan 009.

Three claims, each with its own test, and each was shown failing on a planted violation before it was
relied on (the todo-reference 2.2 note says how):

1. **The archive is frozen.** Its text with the anchor lines removed and every link target blanked has
   the digest it had before the anchors were added. `tools/archive_digest.py` holds the normalisation,
   so what counts as "the same text" is defined once, next to the script that is allowed to change the
   archive. A reworded sentence, a deleted paragraph or an edited number moves the digest; an anchor or a
   corrected link target does not, which is the whole of what plan 009 permits.
   If the archive is edited on purpose some day (a recorded correction in place, say), the new digest
   is pinned here in the same commit and the commit says why.
2. **Every `## N.` heading, 1 to 436, has exactly one anchor line directly above it** and nothing else
   in the file carries an anchor, so a footnote's `#sN` always lands. And each of decisions 1 to 25
   carries its `dN` anchor. The count 436 is the number of sections the archive holds; a new section
   raises it here when it is written.
3. **Every relative link resolves**, to an existing file and, where the link names a fragment, to an
   anchor or heading of that file. Links inside fenced code are examples and are not read.
"""
import importlib.util
import os
import re
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# The normalisation lives with the script. Loaded by path because tools/ is not a package.
_spec = importlib.util.spec_from_file_location(
    "archive_digest", os.path.join(ROOT, "tools", "archive_digest.py"))
archive_digest = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(archive_digest)
_spec = importlib.util.spec_from_file_location(
    "reference_guards", os.path.join(ROOT, "tools", "reference_guards.py"))
reference_guards = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(reference_guards)

# Taken over the archive as it was before any anchor was added or any link target corrected.
FINDINGS_DIGEST = "c4bc62336900cb13eee50b2c375c7a11ca399e67ad9183a44830b8799aa74fc7"
# Repinned for one recorded correction in place: decision 9's last sentence put its rule, its argument and
# its ledger in `reference/logitech/clients.md`, which holds none of the three since plan 009, and now says
# where each is (todo-reference chapter 4's follow-ups, item 125). The digest before it was d6d9727e.
DECISIONS_DIGEST = "39af6d8ede740b46e4873eb421c5edd5133c7cda701e313bcf76aaab1cfe7e5a"

SECTIONS = 436
DECISIONS = 25


def anchor_problems(findings, decisions):
    """Everything wrong with the anchors, as a list of readable lines (empty when all is well)."""
    problems = []
    lines = findings.split("\n")
    headings = [(i, int(m.group(1))) for i, l in enumerate(lines)
                for m in [re.match(r'## (\d+)\. ', l)] if m]
    if [n for _, n in headings] != list(range(1, SECTIONS + 1)):
        problems.append("headings are not exactly sections 1 to %d in order" % SECTIONS)
    for i, n in headings:
        if i == 0 or lines[i - 1] != '<a id="s%d"></a>' % n:
            problems.append("section %d has no anchor directly above its heading" % n)
    # Exactly one: the anchor lines in the file are one per heading and each names its own heading.
    anchors = re.findall(r'<a id="s(\d+)"></a>', findings)
    if sorted(map(int, anchors)) != list(range(1, SECTIONS + 1)):
        problems.append("section anchors are not each of 1 to %d exactly once" % SECTIONS)
    items = re.findall(r'^(\d+)\. <a id="d(\d+)"></a>\*\*', decisions, re.M)
    if [(int(a), int(b)) for a, b in items] != [(n, n) for n in range(1, DECISIONS + 1)]:
        problems.append("decisions 1 to %d do not each start with their own anchor" % DECISIONS)
    if len(re.findall(r'<a id="d\d+"></a>', decisions)) != DECISIONS:
        problems.append("a decision anchor appears other than once per decision")
    return problems


def link_problems(path, text):
    """Relative links of one archive file that do not resolve.

    The resolver is `tools/reference_guards.py`'s, the one that also checks every other document's
    links (`tests/test_reference.py`), so the two link checks cannot come to disagree about what an
    anchor is. Links inside fenced code are examples and are not read.
    """
    return ["%s:%d: %s %s" % (os.path.basename(path), n, target, reason)
            for n, target, reason in reference_guards.broken_links(path, text)]


class ArchiveTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.findings = archive_digest.read(archive_digest.FINDINGS)
        cls.decisions = archive_digest.read(archive_digest.DECISIONS)

    def test_the_archive_text_is_frozen_apart_from_anchors_and_link_targets(self):
        self.assertEqual(archive_digest.digest(self.findings), FINDINGS_DIGEST,
                         "docs/findings.md changed beyond anchors and link targets")
        self.assertEqual(archive_digest.digest(self.decisions), DECISIONS_DIGEST,
                         "docs/decisions.md changed beyond anchors and link targets")

    def test_every_section_has_one_anchor_directly_above_its_heading(self):
        self.assertEqual(anchor_problems(self.findings, self.decisions), [])

    def test_every_relative_link_in_the_archive_resolves(self):
        problems = (link_problems(archive_digest.FINDINGS, self.findings)
                    + link_problems(archive_digest.DECISIONS, self.decisions))
        self.assertEqual(problems, [])


if __name__ == "__main__":
    unittest.main()
