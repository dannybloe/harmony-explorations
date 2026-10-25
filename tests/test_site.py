"""
The website's hook, `tools/site/hooks.py`, todo-reference.md 7.1 and plan 009 section 3.

The site itself is checked by `make site`, whose strict build fails on any link it cannot resolve, and
that needs MkDocs, which the ordinary suite does not have. What can be held here without it is the half of
the hook a strict build would not notice going wrong, because a wrong answer from it is still a valid
link:

1. **The archive splits into exactly its sections.** One page per `## N.` heading, 1 to 436 in order,
   none lost to a heading inside a code block, and step 2.2's anchor lines dropped rather than left at the
   foot of the previous section's page. A split that merged two sections would publish a page that
   resolves and holds the wrong text.
2. **A footnote lands on its section's page**, in every form plan 009 section 4 and a writer might use:
   `#s424`, the heading's slug `#424-...`, and no anchor, which is the archive's own index. Pointing every
   footnote at the index would also pass a strict build.
3. **Any other link out of `reference/` goes to the file on GitHub**, a directory as `tree`, a file as
   `blob`, with its fragment; a link inside `reference/` is left exactly as written, so MkDocs validates
   it; and a link into the repository that names a missing file, or one that leaves the repository, is
   reported.

Each was shown failing once on a planted fault before it was relied on: the split with the code fence
tracking removed (a `## ` line inside a fence became a section), the archive target with the slug form
disabled, and the GitHub rewrite with `tree` and `blob` swapped.
"""
import importlib.util
import logging
import os
import re
import unittest
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = Path(HERE).parent

# Loaded by path because tools/ is not a package, the way tests/test_archive.py loads its script.
_spec = importlib.util.spec_from_file_location("site_hooks", ROOT / "tools" / "site" / "hooks.py")
hooks = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hooks)

GITHUB = "https://github.com/dannybloe/harmony-explorations"
SECTIONS = 436  # tests/test_archive.py holds the same number and is where it changes


def configured():
    """The hook pointed at this checkout, as `on_config` would for `mkdocs.yml`."""
    text = (ROOT / hooks.ARCHIVE_SOURCE).read_text(encoding="utf-8")
    _, sections = hooks._split_archive(text)
    hooks.configure(ROOT, ROOT / "reference", GITHUB, {n for n, _, _ in sections})


class ArchiveSplit(unittest.TestCase):
    def test_every_section_once_in_order(self):
        text = (ROOT / hooks.ARCHIVE_SOURCE).read_text(encoding="utf-8")
        preamble, sections = hooks._split_archive(text)
        self.assertEqual([n for n, _, _ in sections], list(range(1, SECTIONS + 1)))
        self.assertTrue(preamble[0].startswith("# "), "the preamble keeps the archive's title")

    def test_anchor_lines_are_dropped(self):
        text = (ROOT / hooks.ARCHIVE_SOURCE).read_text(encoding="utf-8")
        preamble, sections = hooks._split_archive(text)
        left = [line for line in preamble if re.search(r'<a id="s\d+"></a>', line)]
        for _, _, body in sections:
            left += [line for line in body if re.search(r'<a id="s\d+"></a>', line)]
        self.assertEqual(left, [])

    def test_a_heading_inside_a_fence_is_not_a_section(self):
        text = "# T\n\n## 1. One\n\n```\n## 2. Not a section\n```\n\n<a id=\"s2\"></a>\n## 2. Two\nbody\n"
        _, sections = hooks._split_archive(text)
        self.assertEqual([(n, h) for n, h, _ in sections], [(1, "1. One"), (2, "2. Two")])
        self.assertIn("## 2. Not a section", sections[0][2])
        self.assertNotIn('<a id="s2"></a>', sections[0][2])

    def test_headings_inside_a_section_move_up_one_level(self):
        self.assertEqual(hooks._promote(["### Sub", "```", "## kept", "```", "text"]),
                         ["## Sub", "```", "## kept", "```", "text"])


class Rewrite(unittest.TestCase):
    def setUp(self):
        configured()

    def rewrite(self, target, page="remotes/harmony-650/keys.md", origin=None):
        return hooks._rewrite(target, page, origin)

    def test_footnote_forms_land_on_the_section(self):
        self.assertEqual(self.rewrite("../../../docs/findings.md#s424"), "../../archive/s424.md")
        self.assertEqual(self.rewrite("../../../docs/findings.md#424-the-harmony-one"),
                         "../../archive/s424.md")
        self.assertEqual(self.rewrite("../docs/findings.md#s1", page="glossary.md"), "archive/s1.md")

    def test_no_anchor_is_the_archive_index(self):
        self.assertEqual(self.rewrite("../docs/findings.md", page="glossary.md"), "archive/index.md")

    def test_a_section_that_does_not_exist_is_reported(self):
        with self.assertLogs("mkdocs.hooks.site", logging.WARNING):
            self.rewrite("../docs/findings.md#s9999", page="glossary.md")

    def test_other_files_go_to_github(self):
        self.assertEqual(self.rewrite("../../../docs/decisions.md#d25"),
                         GITHUB + "/blob/main/docs/decisions.md#d25")
        self.assertEqual(self.rewrite("../../../packages/usb/src/rails.ts"),
                         GITHUB + "/blob/main/packages/usb/src/rails.ts")
        self.assertEqual(self.rewrite("../../../packages/usb"), GITHUB + "/tree/main/packages/usb")

    def test_links_inside_the_reference_are_untouched(self):
        for target in ("../harmony-600/keys.md", "../../glossary.md#remote", "#a-heading",
                       "https://example.org/x", "mailto:x@example.org"):
            self.assertEqual(self.rewrite(target), target)

    def test_missing_files_and_the_outside_are_reported(self):
        with self.assertLogs("mkdocs.hooks.site", logging.WARNING):
            self.rewrite("../../../packages/no-such-file.ts")
        with self.assertLogs("mkdocs.hooks.site", logging.WARNING):
            self.rewrite("../../../../lab/units")

    def test_pages_kept_off_the_site_go_to_github(self):
        """`extra.off_site` in mkdocs.yml: the detail of Logitech's side stays in the repository, and a
        link to it, from a page or from the archive, opens the file on GitHub rather than breaking. A page
        that stays on the site beside it is untouched, so this cannot pass by sending everything away."""
        saved = hooks._off_site
        hooks._off_site = ("logitech/service.md", "logitech/data-model/")
        try:
            self.assertEqual(self.rewrite("../../logitech/service.md#accounts"),
                             GITHUB + "/blob/main/reference/logitech/service.md#accounts")
            self.assertEqual(self.rewrite("../../logitech/data-model/model.md"),
                             GITHUB + "/blob/main/reference/logitech/data-model/model.md")
            self.assertEqual(self.rewrite("../../logitech/product-line.md"), "../../logitech/product-line.md")
            archive = ROOT / hooks.ARCHIVE_SOURCE
            self.assertEqual(self.rewrite("../reference/logitech/service.md", page="archive/s7.md", origin=archive),
                             GITHUB + "/blob/main/reference/logitech/service.md")
        finally:
            hooks._off_site = saved

    def test_archive_pages_resolve_from_docs(self):
        archive = ROOT / hooks.ARCHIVE_SOURCE
        page = "archive/s7.md"
        self.assertEqual(self.rewrite("findings.md#s8", page=page, origin=archive), "s8.md")
        self.assertEqual(self.rewrite("#s9", page=page, origin=archive), "s9.md")
        self.assertEqual(self.rewrite("../reference/config-format/README.md", page=page, origin=archive),
                         "../config-format/README.md")
        self.assertEqual(self.rewrite("decisions.md#d3", page=page, origin=archive),
                         GITHUB + "/blob/main/docs/decisions.md#d3")

    def test_markdown_rewrite_leaves_code_alone(self):
        text = ("See [s](../docs/findings.md#s3) and `[s](../docs/findings.md#s3)`.\n"
                "```\n[s](../docs/findings.md#s3)\n```\n"
                "[ref]: ../docs/decisions.md#d1\n"
                "[^s3]: Read in the firmware. [Section 3](../docs/findings.md#s3)\n")
        out = hooks._rewrite_markdown(text, "glossary.md", None).split("\n")
        self.assertEqual(out[0], "See [s](archive/s3.md) and `[s](../docs/findings.md#s3)`.")
        self.assertEqual(out[2], "[s](../docs/findings.md#s3)")
        self.assertEqual(out[4], "[ref]: " + GITHUB + "/blob/main/docs/decisions.md#d1")
        self.assertEqual(out[5], "[^s3]: Read in the firmware. [Section 3](archive/s3.md)")


if __name__ == "__main__":
    unittest.main()
