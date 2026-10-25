"""MkDocs hooks for the reference website, todo-reference.md 7.1 and plan 009 section 3.

The site is built from `reference/` alone (`docs_dir: reference` in `mkdocs.yml`), but the reference
links out of that folder all the time, and it does so on purpose: a fact's footnote names the archive
section that holds its argument, `docs/findings.md#s424`, or a decision, `docs/decisions.md#d25`, or
the test that pins it, `packages/usb/test/settings.test.ts`. Plan 009 section 4 writes every such link as
a relative path from the page, so it works in an editor and on GitHub. On the site those paths point at
nothing, since only `reference/` is published, so this module does two things:

1. **It publishes the archive**, `docs/findings.md`, as one page per section under `archive/`:
   `archive/s424.md` for `## 424.`, plus `archive/index.md` for the preamble and a list of sections.
   One page for the whole archive is not an option: it is about four megabytes, too large to load as a
   page and too large for GitHub to render (plan 009, step 7.1, and its open question 3). The pages are
   generated in memory; nothing is written into `reference/`.
2. **It rewrites links that leave `reference/`** before MkDocs validates them. A link to the archive,
   with a section anchor or without, goes to that section's page. Any other link to a file in this
   repository goes to the file on GitHub. A link inside `reference/` is left alone, so MkDocs's own
   validation still checks it, file and anchor, which is the part `--strict` relies on.

**The archive anchors.** Step 2.2 put a line `<a id="s424"></a>` directly above every `## 424.` heading.
This module splits on the headings themselves and drops those anchor lines, so it works with them or
without them, and a section's page does not carry a stray empty anchor of the next section at its foot.
An anchor in a link is accepted in either form a writer might use: `#s424`, or the slug MkDocs or GitHub
would make of the heading, `#424-summary`, read by its leading number.

**What it reports.** A link this module cannot place is a warning on the `mkdocs` logger, which is what
`--strict` counts, so it fails the strict build exactly like a broken link MkDocs found itself: a link to
a file that does not exist in the repository, a link that leaves the repository (`../lab`, which the
reference must never name), and an archive anchor that is not a section number.

3. **It names a remote's drawing for every page of that remote**, so the theme override in
   `tools/site/overrides/partials/toc.html` can show it above the page's contents in the right hand
   column, at most 380 pixels tall. A page under `remotes/harmony-650/` gets `silhouettes/h650.svg`,
   `harmony-one` and `harmony-touch` take `one.svg` and `touch.svg`, and a model with no drawing, such as
   the Harmony 885, gets none because the file does not exist. The drawing is derived from the folder
   name rather than listed, so a model that gains a drawing shows it without an edit here.
4. **It turns the left hand menu into a switcher on a remote's or an architecture's pages**: a list to
   pick another remote, which lands on the same page of that remote, and below it only the current
   remote's pages. `tools/site/overrides/partials/nav.html` draws it on wide screens; on a phone the
   full menu stays, since it is the only navigation there.
5. **It keeps some of `reference/` off the site**, the pages listed under `extra.off_site` in
   `mkdocs.yml`: the detail of Logitech's software, services, catalogue and data model, which belongs in
   the repository and not in a reference a reader browses. Each is dropped from the build, and every link
   to one, from a page or from the archive, goes to the file on GitHub instead, so nothing breaks.

Nothing here is specific to a page's content, and it carries no list of files: what is published is
`reference/` plus the archive, and the navigation is `mkdocs.yml`'s.
"""

from __future__ import annotations

import logging
import posixpath
import re
from pathlib import Path

# MkDocs itself is imported where it is used, in `on_files`, and nowhere at module level, so the pure
# half of this module (the archive split and the link rewrite) imports without MkDocs installed:
# `tests/test_site.py` runs in the ordinary suite, which has no site environment. Pyright, which checks
# `tools/` for imports that resolve, sees the import inside the function as well and cannot resolve it
# outside that environment, so that one line carries an ignore for that one rule.

# Under `mkdocs`, so MkDocs's own warning counter sees it and `--strict` fails on it.
log = logging.getLogger("mkdocs.hooks.site")

# Where a link that leaves `reference/` goes. Taken from `git remote -v` when this was written; the site
# is built from `main`, so a link names the file as it is there. Read from `repo_url` in `mkdocs.yml`, with
# the branch here because MkDocs has no setting for it outside `edit_uri`.
BRANCH = "main"

ARCHIVE_SOURCE = "docs/findings.md"  # relative to the repository root
ARCHIVE_DIR = "archive"  # where its pages sit on the site, relative to docs_dir

# `## 424. Title`, the archive's section heading, which step 2.2 left unchanged.
SECTION_HEADING = re.compile(r"^## (\d+)\.\s")
# `<a id="s424"></a>` on a line of its own, step 2.2's anchor. Dropped from the pages, see above.
ANCHOR_LINE = re.compile(r'^\s*<a id="s\d+"></a>\s*$')
# The anchors an archive link may carry: `s424`, or a heading slug that starts with the number.
SECTION_ANCHOR = re.compile(r"^s(\d+)$|^(\d+)(?:-|$)")
FENCE = re.compile(r"^\s{0,3}(`{3,}|~{3,})")

# An inline link's target, `](target)` or `](target "title")`, and a reference definition,
# `[label]: target`. A footnote definition, `[^s424]: ...`, is not a link and is skipped by the `^`.
# Code spans are matched first so a link written inside backticks is left as the text it is.
INLINE = re.compile(
    r"(?P<code>(?P<ticks>`+).*?(?P=ticks))"
    r"|(?P<open>\]\(\s*)(?P<target><[^>]*>|[^)\s]+)(?P<rest>(?:\s+\"[^\"]*\")?\s*\))"
)
DEFINITION = re.compile(r"^(?P<open>\s{0,3}\[(?!\^)[^\]]+\]:\s*)(?P<target>\S+)(?P<rest>.*)$")

# Set in on_config.
_root: Path = Path()
_docs: Path = Path()
_github: str = ""
# Generated page src_uri -> the repository file its links were written relative to. Only the archive's
# pages are in here; every other page's links are relative to its own place in `reference/`.
_origin: dict[str, Path] = {}
# Section numbers that exist, so an anchor to a missing one is reported rather than linked.
_sections: set[int] = set()
# Pages of `reference/` kept off the site, relative to docs_dir: a file, or a folder ending in `/`.
_off_site: tuple[str, ...] = ()


def off_site(docs_relative: str) -> bool:
    """Whether a file of `reference/`, named relative to it, is kept off the site."""
    return any(docs_relative == entry or (entry.endswith("/") and docs_relative.startswith(entry))
               for entry in _off_site)


def configure(root: Path, docs: Path, repo_url: str, sections: set[int] = frozenset()) -> None:
    """Set where the repository and the site's sources are; `on_config` for MkDocs, directly for a test."""
    global _root, _docs, _github
    _root = root.resolve()
    _docs = docs.resolve()
    _github = (repo_url or "").rstrip("/")
    if not _github:
        raise ValueError("mkdocs.yml needs repo_url: links that leave reference/ are rewritten to it")
    if sections:
        _sections.clear()
        _sections.update(sections)


#: The search worker shim Material's offline plugin loads from a CDN in a build for browsing from disk.
#: The plugin names it without a version, which this repository never allows, so it is pinned here to
#: an exact release at least two weeks old when chosen, the rule in tools/site/requirements.txt.
IFRAME_WORKER = "https://unpkg.com/iframe-worker@1.0.4/shim"


def on_config(config):
    global _off_site
    configure(Path(config.config_file_path).parent, Path(config.docs_dir), config.repo_url)
    _off_site = tuple((config.extra or {}).get("off_site", ()))
    # Hooks run after the theme's plugins, so the offline plugin has already added its unpinned shim.
    polyfills = (config.extra or {}).get("polyfills")
    if polyfills:
        config.extra["polyfills"] = [IFRAME_WORKER if "iframe-worker" in url else url for url in polyfills]
    return config


# ---------------------------------------------------------------------------------------------------
# The archive, one page per section.


def _split_archive(text: str) -> tuple[list[str], list[tuple[int, str, list[str]]]]:
    """The preamble's lines, and per section its number, its heading and its body lines.

    Fence aware, so a `## 7.` inside a code block is not a section, and every step 2.2 anchor line is
    dropped wherever it sits."""
    preamble: list[str] = []
    sections: list[tuple[int, str, list[str]]] = []
    fence: str | None = None
    for line in text.splitlines():
        match = FENCE.match(line)
        if match:
            marker = match.group(1)
            if fence is None:
                fence = marker
            elif marker[0] == fence[0] and len(marker) >= len(fence):
                fence = None
        if fence is None and ANCHOR_LINE.match(line):
            continue
        heading = SECTION_HEADING.match(line) if fence is None else None
        if heading:
            sections.append((int(heading.group(1)), line[3:], []))
        elif sections:
            sections[-1][2].append(line)
        else:
            preamble.append(line)
    return preamble, sections


def _promote(lines: list[str]) -> list[str]:
    """Raise every heading one level, outside fences, so a section's `###` sits under its page title."""
    out = []
    fence: str | None = None
    for line in lines:
        match = FENCE.match(line)
        if match:
            marker = match.group(1)
            if fence is None:
                fence = marker
            elif marker[0] == fence[0] and len(marker) >= len(fence):
                fence = None
        if fence is None and line.startswith("##"):
            line = line[1:]
        out.append(line)
    return out


# The links these two pages add are written the way the archive's own text would write them, relative to
# `docs/` (`findings.md#s423`), because every link on an archive page goes through `_rewrite` with the
# archive as its origin. Written as `s423.md` they would be read as `docs/s423.md` and reported missing.


def _section_page(number: int, heading: str, body: list[str], numbers: list[int]) -> str:
    position = numbers.index(number)
    around = []
    if position > 0:
        around.append(f"[Section {numbers[position - 1]}](findings.md#s{numbers[position - 1]})")
    around.append("[the archive](findings.md)")
    if position + 1 < len(numbers):
        around.append(f"[section {numbers[position + 1]}](findings.md#s{numbers[position + 1]})")
    footer = " | ".join(around)
    source = f"{_github}/blob/{BRANCH}/{ARCHIVE_SOURCE}#s{number}"
    return "\n".join(
        [
            f"# {heading}",
            "",
            *_promote(body),
            "",
            "---",
            "",
            f"{footer}. Section {number} of the findings archive, which is frozen; the reference holds "
            f"the current answer. [The archive on GitHub]({source}).",
            "",
        ]
    )


def _index_page(preamble: list[str], sections: list[tuple[int, str, list[str]]]) -> str:
    listing = [f"* [{heading}](findings.md#s{number})" for number, heading, _ in sections]
    return "\n".join(
        [
            *preamble,
            "",
            "## The sections",
            "",
            "This archive is frozen: nothing is added to it, and where a section's conclusion was later "
            "corrected, the reference holds the current answer. Each section is a page of its own here, "
            "since the whole file is too large for one.",
            "",
            *listing,
            "",
        ]
    )


def on_files(files, config):
    from mkdocs.structure.files import File, InclusionLevel  # pyright: ignore[reportMissingImports]

    source = _root / ARCHIVE_SOURCE
    preamble, sections = _split_archive(source.read_text(encoding="utf-8"))
    numbers = [number for number, _, _ in sections]
    if len(set(numbers)) != len(numbers):
        log.warning("%s: a section number appears twice, so one page would replace another", ARCHIVE_SOURCE)
    _sections.clear()
    _sections.update(numbers)
    _origin.clear()

    for kept_off in [f for f in files if off_site(f.src_uri)]:
        files.remove(kept_off)

    pages = {f"{ARCHIVE_DIR}/index.md": _index_page(preamble, sections)}
    for number, heading, body in sections:
        pages[f"{ARCHIVE_DIR}/s{number}.md"] = _section_page(number, heading, body, numbers)
    for src_uri, content in pages.items():
        # Published, searchable and linkable, but deliberately not in the navigation (plan 009 section 1:
        # "The archive is published beside the reference but not in the navigation"). NOT_IN_NAV also
        # keeps `validation.nav.omitted_files` from reporting 437 pages nobody meant to list.
        files.append(File.generated(config, src_uri, content=content, inclusion=InclusionLevel.NOT_IN_NAV))
        _origin[src_uri] = source
    return files


# ---------------------------------------------------------------------------------------------------
# Links that leave reference/.


def _archive_target(fragment: str, where: str) -> str:
    """The archive page a link to `docs/findings.md#fragment` lands on, relative to docs_dir."""
    if not fragment:
        return f"{ARCHIVE_DIR}/index.md"
    match = SECTION_ANCHOR.match(fragment)
    number = int(match.group(1) or match.group(2)) if match else None
    if number is None or number not in _sections:
        log.warning("%s: a link to the archive names #%s, which is not a section", where, fragment)
        return f"{ARCHIVE_DIR}/index.md"
    return f"{ARCHIVE_DIR}/s{number}.md"


def _rewrite(target: str, page_uri: str, origin: Path | None) -> str:
    """The target a link should have on the site, or the target unchanged.

    `page_uri` is the page's place on the site, relative to docs_dir; `origin` is the repository file the
    link was written in, which for a page of `reference/` is the page itself."""
    bracketed = target.startswith("<") and target.endswith(">")
    raw = target[1:-1] if bracketed else target
    if not raw or re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", raw) or raw.startswith("/"):
        return target  # a URL, mailto:, or an absolute path, none of them this module's business
    path, _, fragment = raw.partition("#")
    source = origin if origin is not None else _docs / page_uri
    where = f"{page_uri} ({source.relative_to(_root).as_posix()})" if origin is not None else page_uri

    if not path:
        # A bare `#anchor`. On an archive page, `#s424` meant another section of the same file.
        if origin is not None and origin == _root / ARCHIVE_SOURCE and SECTION_ANCHOR.match(fragment):
            landed = _archive_target(fragment, where)
            return posixpath.relpath(landed, posixpath.dirname(page_uri))
        return target

    resolved = Path(posixpath.normpath((source.parent / path).as_posix()))
    page_dir = posixpath.dirname(page_uri)

    if resolved == _root / ARCHIVE_SOURCE:
        landed = _archive_target(fragment, where)
        return posixpath.relpath(landed, page_dir)

    if resolved.is_relative_to(_docs) and off_site(resolved.relative_to(_docs).as_posix()):
        relative = resolved.relative_to(_root).as_posix()
        return f"{_github}/blob/{BRANCH}/{relative}" + (f"#{fragment}" if fragment else "")

    if resolved.is_relative_to(_docs):
        if origin is None:
            return target  # inside the site: MkDocs validates it, file and anchor
        # Written in the archive, relative to docs/; the same file seen from the archive page.
        landed = resolved.relative_to(_docs).as_posix()
        return posixpath.relpath(landed, page_dir) + (f"#{fragment}" if fragment else "")

    if not resolved.is_relative_to(_root):
        log.warning("%s: a link leaves the repository, %s", where, raw)
        return target

    relative = resolved.relative_to(_root).as_posix()
    if not resolved.exists():
        log.warning("%s: a link names %s, which does not exist in the repository", where, relative)
    kind = "tree" if resolved.is_dir() else "blob"
    return f"{_github}/{kind}/{BRANCH}/{relative}" + (f"#{fragment}" if fragment else "")


def _rewrite_markdown(markdown: str, page_uri: str, origin: Path | None) -> str:
    out = []
    fence: str | None = None
    for line in markdown.split("\n"):
        match = FENCE.match(line)
        if match:
            marker = match.group(1)
            if fence is None:
                fence = marker
            elif marker[0] == fence[0] and len(marker) >= len(fence):
                fence = None
            out.append(line)
            continue
        if fence is not None:
            out.append(line)
            continue

        definition = DEFINITION.match(line)
        if definition:
            target = _rewrite(definition.group("target"), page_uri, origin)
            out.append(definition.group("open") + target + definition.group("rest"))
            continue

        def inline(m: re.Match[str]) -> str:
            if m.group("code"):
                return m.group(0)
            return m.group("open") + _rewrite(m.group("target"), page_uri, origin) + m.group("rest")

        out.append(INLINE.sub(inline, line))
    return "\n".join(out)


def on_page_markdown(markdown: str, page, config, files) -> str:
    # Runs before MkDocs converts the page, and so before it validates the links, which is the point:
    # a link this rewrote is checked in its rewritten form.
    return _rewrite_markdown(markdown, page.file.src_uri, _origin.get(page.file.src_uri))


#: A page of one remote: `remotes/<folder>/<page>.md`, the folder named `harmony-<model>`.
REMOTE_PAGE = re.compile(r"^remotes/harmony-([a-z0-9]+)/[^/]+\.md$")


def drawing_for(src_uri: str, docs_dir: str) -> str | None:
    """The site path of the drawing for a remote's page, or None when the page is not a remote's or the
    model has no drawing. `harmony-650` is `h650.svg`, while `harmony-one` and `harmony-touch` keep their
    word, `one.svg` and `touch.svg`, which is how `packages/silhouettes` names its models."""
    match = REMOTE_PAGE.match(src_uri)
    if not match:
        return None
    model = match.group(1)
    name = ("h%s" % model if model.isdigit() else model) + ".svg"
    path = "silhouettes/" + name
    return path if (Path(docs_dir) / path).is_file() else None


#: The sections whose members are all the same kind of thing with the same pages, where the left hand
#: menu becomes a switcher: pick a remote, or an architecture, and see only its pages.
SWITCHED = ("remotes/", "architectures/")


def _first_page(section):
    """The first page in a navigation section, its index page when it has one."""
    for child in section.children:
        if child.is_page:
            return child
    return None


def switcher_for(page) -> dict | None:
    """What the left hand switcher shows for a page of one remote or one architecture, or None.

    A page qualifies when it sits in a group section, `Harmony 650`, inside a top section whose pages
    live under one of `SWITCHED`. The switcher lists every group of that top section, each pointing at
    **the page of the same name** in that group, so moving from the 650's `features.md` to the One's
    lands on the One's `features.md`; a group without that page, such as the Touch's architecture which
    has three files, falls back to its first page. Below it come the current group's own pages.
    """
    group = page.parent
    top = group.parent if group else None
    if top is None or not any(page.file.src_uri.startswith(prefix) for prefix in SWITCHED):
        return None
    name = posixpath.basename(page.file.src_uri)
    choices = []
    for member in top.children:
        if not member.is_section:
            continue
        same = next((c for c in member.children
                     if c.is_page and posixpath.basename(c.file.src_uri) == name), None)
        target = same or _first_page(member)
        if target is not None:
            choices.append({"title": member.title, "url": target.url, "current": member is group})
    pages = [{"title": "Overview" if c.file.src_uri.endswith("README.md") else c.title,
              "url": c.url, "current": c is page}
             for c in group.children if c.is_page]
    return {"label": top.title, "choices": choices, "pages": pages}


def on_page_context(context, page, config, nav):
    drawing = drawing_for(page.file.src_uri, config["docs_dir"])
    if drawing:
        context["harmony_drawing"] = drawing
        context["harmony_drawing_alt"] = "The face of the " + (page.parent.title if page.parent else "remote")
    context["harmony_switcher"] = switcher_for(page)
    return context
