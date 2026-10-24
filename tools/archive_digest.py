#!/usr/bin/env python3
"""
The archive's freeze, as a digest, and the one script that is allowed to touch the archive.

`docs/findings.md` and `docs/decisions.md` are an archive (decision 25): their wording is frozen, and
plan 009 allows exactly two kinds of change to them, both mechanical:

* an anchor, a line `<a id="sN"></a>` directly above each `## N.` heading of the findings and an inline
  `<a id="dN"></a>` right after the number of each numbered decision, so a footnote can link to a section
  whatever its heading says, and
* a link target corrected when the file it names has moved.

`normalise` is the definition of "nothing else changed": it removes the anchors and blanks every
Markdown link target, so the text that is left is the archive's wording with those two allowed kinds
of change taken out. The digest of that text was taken before the first change and is pinned in
`tests/test_archive.py`. A link's label is wording and stays in the digest; only the target goes.

The archive's plain text mentions of old paths (`docs/config-format.md` in backticks, 267 of them in
the findings) are not links and stay as written: the archive keeps the names things had.

    python3 tools/archive_digest.py            print the digests of the archive as it is now
    python3 tools/archive_digest.py --write    add the anchors and correct moved link targets
                                               (idempotent: a second run changes nothing)
"""
import hashlib
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FINDINGS = os.path.join(ROOT, "docs", "findings.md")
DECISIONS = os.path.join(ROOT, "docs", "decisions.md")

# A whole line holding only a section anchor, and a decision anchor wherever it sits in a line.
SECTION_ANCHOR_LINE = re.compile(r'^<a id="s\d+"></a>\n', re.M)
DECISION_ANCHOR = re.compile(r'<a id="d\d+"></a>')
# Every inline Markdown link target. Blanked wholesale rather than only for moved files, so the
# digest does not depend on which targets the correction touched.
LINK_TARGET = re.compile(r'\]\([^)\s]*\)')

SECTION_HEADING = re.compile(r'^## (\d+)\. ')
# The numbered decisions are the list items whose title is bold.
DECISION_ITEM = re.compile(r'^(\d+)\. (?=\*\*)', re.M)

# Moved by todo-reference 2.1, from `git diff -M` over its commits. A link to a document that plan 009
# cut by heading goes to the README the whole document became when it has no fragment. Keys are the
# target as written in the archive (relative to docs/), values are the target now, also relative to
# docs/.
MOVED = {
    "config-format.md": "../reference/config-format/README.md",
    "usb-protocol.md": "../reference/usb-protocol/README.md",
    "host-client.md": "../reference/logitech/clients.md",
    "how-a-harmony-works.md": "../reference/how-a-harmony-works.md",
    "growing-a-config.md": "../reference/config-format/relocation.md",
    "myharmony/model.md": "../reference/logitech/data-model/model.md",
    "myharmony/entities.md": "../reference/logitech/data-model/entities.md",
    "../reference/superseded.md": "superseded.md",
    "../reference/checksums.md": "checksums.md",
    "../reference/lab-register.md": "lab-register.md",
    "../reference/concordance-notes.md": "concordance-notes.md",
    "../reference/device-categories.md": "../reference/logitech/device-catalogue.md",
    "../reference/remotes/README.md": "../reference/README.md",
}


def normalise(text):
    """The archive's wording with the allowed changes taken out."""
    text = SECTION_ANCHOR_LINE.sub("", text)
    text = DECISION_ANCHOR.sub("", text)
    return LINK_TARGET.sub("]()", text)


def digest(text):
    return hashlib.sha256(normalise(text).encode("utf-8")).hexdigest()


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def add_anchors(findings, decisions):
    """Idempotent: a heading that already has its anchor line is left alone."""
    out, prev = [], None
    for line in findings.split("\n"):
        m = SECTION_HEADING.match(line)
        if m and prev != '<a id="s%s"></a>' % m.group(1):
            out.append('<a id="s%s"></a>' % m.group(1))
        out.append(line)
        prev = line
    findings = "\n".join(out)

    # After the number and not before it, so the item stays a list item when it is rendered.
    decisions = DECISION_ITEM.sub(
        lambda m: '%s. <a id="d%s"></a>' % (m.group(1), m.group(1)), decisions)
    return findings, decisions


def fix_links(text):
    def one(m):
        path, sep, frag = m.group(1).partition("#")
        target = MOVED[path] + sep + frag if path in MOVED else m.group(1)
        return "](" + target + ")"
    return re.sub(r'\]\(([^)\s]*)\)', one, text)


def main():
    findings, decisions = read(FINDINGS), read(DECISIONS)
    if "--write" in sys.argv:
        findings, decisions = add_anchors(findings, decisions)
        findings, decisions = fix_links(findings), fix_links(decisions)
        for path, text in ((FINDINGS, findings), (DECISIONS, decisions)):
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(text)
    print("findings ", digest(findings))
    print("decisions", digest(decisions))


if __name__ == "__main__":
    main()
