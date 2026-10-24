#!/usr/bin/env python3
"""
The five guards of `reference/`, plan 009 section 5, and the script that pins their current findings.

    python3 tools/reference_guards.py           every violation, then the counts per guard per folder
    python3 tools/reference_guards.py --counts  the counts only
    python3 tools/reference_guards.py --pin     rewrite the pinned lists in tests/test_reference.py

**Why there is a pinned list at all.** The guards were written in `todo-reference.md` 2.3, before the
reference is clean: chapters 3 and 4 clean it, file by file. A guard that failed until then would be
switched off or ignored, and a guard that passed because it checked less would be worse. So each guard
runs in full, and `tests/test_reference.py` holds the exact list of what it finds today, as counts per
file and per kind. The test fails on anything not on the list and on any count that rose, so nothing
new gets in, and it also fails when a count fell without the list following, so the list can only ever
shrink and always says what is left. `--pin` writes that list; run it after a step removed violations,
and read its diff, because a pin that grows is a violation being waved through.

**The five guards**, each a function returning a `Counter` of `(path, kind) -> count`:

* `bench`: the reference describes no bench. Words that only describe our own work, the lab's fixture
  names (read from `tests/lab.py` at run time) and links into the test notes, the lab register or the
  lab. Logitech's generated data files are exempt, since their words are Logitech's.
* `names`: the reference names no person. The names are read at run time from this repository's commit
  authors and the contributor headings of `docs/checksums.md`, so neither this file nor the test names
  anybody.
* `copy`: the reference never names the copy of Logitech's device database, decision 15's checkout: its
  repository, the variable that locates it, decision 15 itself, and its author, whose names are read
  from the checkout's own commits when `packages/lab` finds it. The patterns apply without the checkout.
* `footnotes`: every footnote is well formed, per plan 009 section 4.
* `links`: every relative link in `reference/`, `docs/`, the root documents and the skills resolves,
  file and anchor. `docs/findings.md` and `docs/decisions.md` are the archive and
  `tests/test_archive.py` checks their links, so they are left out here rather than checked twice.

**A key never carries a person's name.** A link target or a word could, some day, so `redact` replaces
any kind or path containing one with a digest before it is printed or pinned. That is what lets the
test file be checked for names as well.
"""
import argparse
import collections
import hashlib
import os
import re
import subprocess
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEST_FILE = os.path.join(ROOT, 'tests', 'test_reference.py')

GUARDS = ('bench', 'names', 'copy', 'footnotes', 'links')

# Logitech's own generated data, plan 009 section 5: their words, not ours, so the bench words do not
# apply. `model.md` beside them is ours and is not exempt.
EXEMPT_FROM_BENCH = frozenset(
    'reference/logitech/data-model/' + name
    for name in ('model.json', 'operations.json', 'entities.md', 'core-model.mmd'))

# The bench words of plan 009 section 5, each a pattern and the kind it is counted under. Word
# boundaries, so `label` is not `lab` and `todo-reference.md` is `todo`. Case is ignored: "Lab" opens
# a sentence as often as "lab" sits in one.
BENCH_WORDS = (
    ('bench', r'\bbench(?:es)?\b'),
    ('lab', r'\blabs?\b'),
    ('dump', r'\bdump(?:s|ed|ing)?\b'),
    ('test account', r'\btest accounts?\b'),
    ('our unit', r'\bour units?\b'),
    ('the spare', r'\bthe spare\b'),
    ('everyday', r'\beveryday\b'),
    ('friend', r'\bfriend(?:s|\'s)?\b'),
    ('todo', r'\btodo\b'),
)

# The copy's own name and its locating variable. Fixed patterns rather than run time reads, because
# they must bite on a machine without the checkout, which is every fresh clone.
COPY_PATTERNS = (
    ('its repository', r'harmony-ir-archive'),
    ('its checkout', r'\b(?:ir|infrared) archive\b'),
    ('its variable', r'\bHARMONY_IR_ARCHIVE\b'),
    ('decision 15', r'\bdecision 15\b|decisions\.md#d15\b|\[\^d15\]'),
    # How the documents moved in by 2.1 speak of the copy: "the archive" (plan 009's table of passages
    # naming it, "the archive's name", "in the archive", "archive commands"), "catalogue, archived", and
    # the converter's module. Not the container's metadata archive, not an archived firmware package
    # (`archived` is not `archive`), and not the findings archive, which the reference names as an
    # "archive section" or "the findings archive" when it names it in words at all. The hyphenated
    # lookbehinds are the same two names as a link's anchor, `container.md#the-metadata-archive`,
    # which the guard counted as the copy until todo-reference 4.1 named a heading that way.
    ('the archive, meaning the copy',
     r'(?<!metadata )(?<!metadata-)(?<!findings )(?<!findings-)\barchive\b(?!\s+sections?\b)'
     r'|\bcatalogue, archived\b'
     r'|codec/src/archive\w*\.ts'),
)

# Plan 009 section 4. The label forms, and the evidence words each label may carry. An `x` label is a
# public outside source, which is a third party or Logitech's own public text (a manual, say).
LABEL = re.compile(r'^(?:s(\d+)[a-z]?|d(\d+)|t-[a-z0-9]+(?:-[a-z0-9]+)*|x-[a-z0-9]+(?:-[a-z0-9]+)*|unchecked)$')
LOGITECH = ('Stated by Logitech.', 'Stated by Logitech, in the manual.',
            'Stated by Logitech, by their service.', 'Stated by Logitech, in their client.',
            'Stated by Logitech, in their catalogue.')
MEASURED = ('Read in the firmware.', 'Measured on a unit.', 'Measured in configurations.') + LOGITECH
EVIDENCE = {
    's': MEASURED,
    't': MEASURED,
    'x': ('Stated by a third party.',) + LOGITECH,
    'd': ('Chosen by this project.',),
    'unchecked': ('Not checked.',),
}
ALL_EVIDENCE = tuple(sorted({w for words in EVIDENCE.values() for w in words}, key=len, reverse=True))

# A reference is any `[^label]` in running text, a colon after it included: "as stated[^s1]: ..." is a
# reference. A definition is told apart by where it stands, at the start of a line, which
# `footnote_problems` cuts off before counting references, rather than by the colon after it. The
# colon test this replaced left a reference directly followed by a colon uncounted, so a footnote
# used only that way read as defined and never referenced.
FOOTNOTE_REFERENCE = re.compile(r'\[\^([^\]\s]+)\]')
FOOTNOTE_DEFINITION = re.compile(r'^\[\^([^\]\s]+)\]:\s*(.*)$')

# Links: inline and image links, reference definitions, and the two HTML attributes that carry a path.
INLINE_LINK = re.compile(r'\]\(\s*(<[^>]*>|[^)\s]*)(?:\s+(?:"[^"]*"|\'[^\']*\'))?\s*\)')
REFERENCE_DEFINITION = re.compile(r'^ {0,3}\[[^\]^][^\]]*\]:\s*(<[^>]*>|\S+)')
HTML_LINK = re.compile(r'\b(?:href|src)="([^"]*)"')
SCHEME = re.compile(r'^[a-zA-Z][a-zA-Z0-9+.-]*:')
FENCE = re.compile(r'^ {0,3}(```|~~~)')
INLINE_CODE = re.compile(r'(`+)(?:(?!\1).)+?\1')


# Reading the tree


def rel(path, root=ROOT):
    """A path as the repository names it, with forward slashes."""
    return os.path.relpath(path, root).replace(os.sep, '/')


def read(path):
    with open(path, encoding='utf-8') as handle:
        return handle.read()


def files_under(root, folder, extensions=None):
    """Every file below `root/folder`, sorted, optionally limited to some extensions."""
    out = []
    for directory, subdirectories, names in os.walk(os.path.join(root, folder)):
        subdirectories[:] = sorted(d for d in subdirectories if d != 'node_modules')
        for name in sorted(names):
            if extensions is None or name.endswith(extensions):
                out.append(os.path.join(directory, name))
    return out


def reference_files(root=ROOT):
    """Every text file of the reference: its pages, its drawings and Logitech's data files."""
    return files_under(root, 'reference', ('.md', '.svg', '.json', '.mmd'))


def linked_documents(root=ROOT):
    """The Markdown files whose relative links must resolve, the archive left to its own test."""
    archive = {os.path.join(root, 'docs', 'findings.md'), os.path.join(root, 'docs', 'decisions.md')}
    out = files_under(root, 'reference', ('.md',))
    out += [p for p in files_under(root, 'docs', ('.md',)) if p not in archive]
    out += sorted(os.path.join(root, n) for n in os.listdir(root) if n.endswith('.md'))
    out += files_under(root, os.path.join('.claude', 'skills'), ('.md',))
    return out


def prose_lines(text, keep_code=False):
    """(line number, line) outside fenced code, with inline code removed: what a reader sees as text.

    Fenced and inline code are examples (plan 009 itself shows a footnote in a fence), so the link and
    footnote guards do not read them. The word guards read the whole text instead, since a fixture name
    in a code block still names a fixture. A heading keeps its code (`keep_code`), since GitHub builds
    the heading's anchor from the code's text as well.
    """
    fenced = None
    for number, line in enumerate(text.split('\n'), 1):
        match = FENCE.match(line)
        if match:
            if fenced is None:
                fenced = match.group(1)
            elif match.group(1) == fenced:
                fenced = None
            continue
        if fenced is None:
            yield number, line if keep_code else INLINE_CODE.sub('', line)


# Who counts as a person


def _git_lines(args, cwd):
    try:
        out = subprocess.run(['git'] + args, cwd=cwd, capture_output=True, text=True, check=True)
    except (OSError, subprocess.CalledProcessError):
        return []
    return [line for line in out.stdout.split('\n') if line.strip()]


def name_tokens(names_and_emails):
    """The words a name or an email's local part is made of, three letters or more, lower case."""
    tokens = set()
    for item in names_and_emails:
        local = item.split('@', 1)[0]
        tokens.update(t.lower() for t in re.split(r'[^A-Za-z0-9]+', local) if len(t) >= 3)
    return tokens


def person_names(root=ROOT):
    """Commit authors of this repository and the contributors `docs/checksums.md` names in its headings."""
    people = _git_lines(['log', '--format=%an%n%ae'], root)
    checksums = os.path.join(root, 'docs', 'checksums.md')
    if os.path.exists(checksums):
        people += re.findall(r'^#+ Contributed by ([^,\s]+)', read(checksums), re.M)
    return name_tokens(people)


def catalogue_checkout(root=ROOT):
    """Where `packages/lab` finds the copy of Logitech's device database, or None.

    Asked of `packages/lab` itself, through node, rather than located a second time here, so the two
    languages cannot disagree about where the checkout is.
    """
    script = ("const m = await import(%r); process.stdout.write(m.IR_ARCHIVE ?? '')"
              % os.path.join(root, 'packages', 'lab', 'src', 'index.ts'))
    try:
        out = subprocess.run(['node', '--input-type=module', '-e', script], cwd=root,
                             capture_output=True, text=True, timeout=60, check=True)
    except (OSError, subprocess.SubprocessError):
        return None
    path = out.stdout.strip()
    return path if path and os.path.isdir(path) else None


def catalogue_authors(checkout):
    """The copy's author: its commit authors and the owner its origin names, read from the checkout."""
    if checkout is None:
        return None
    people = _git_lines(['log', '--format=%an%n%ae'], checkout)
    for url in _git_lines(['remote', 'get-url', 'origin'], checkout):
        owner = re.search(r'github\.com[:/]([^/]+)/', url)
        if owner:
            people.append(owner.group(1))
    return name_tokens(people)


_WORD_PATTERNS = {}


def word_pattern(tokens):
    """One compiled pattern per set of tokens, since `redact` asks for it once per key printed."""
    if not tokens:
        return None
    key = frozenset(tokens)
    if key not in _WORD_PATTERNS:
        _WORD_PATTERNS[key] = re.compile(
            r'\b(?:%s)\b' % '|'.join(sorted(map(re.escape, tokens))), re.I)
    return _WORD_PATTERNS[key]


def redact(text, tokens):
    """`text` unchanged, or a digest of it when it contains a person's name."""
    pattern = word_pattern(tokens)
    if pattern and pattern.search(text):
        return 'redacted ' + hashlib.sha256(text.encode('utf-8')).hexdigest()[:12]
    return text


# Links


def heading_slug(heading):
    """GitHub's anchor for a heading: the rendered text, lower case, punctuation gone, spaces hyphens."""
    text = re.sub(r'!?\[([^\]]*)\]\([^)]*\)', r'\1', heading)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\s+#+\s*$', '', text.strip())
    return re.sub(r'[^\w\- ]', '', text.lower()).replace(' ', '-')


def anchors(text):
    """Every fragment a Markdown file offers: explicit ids and names, and heading slugs, duplicates
    numbered the way GitHub numbers them."""
    out = set(re.findall(r'\b(?:id|name)="([^"]+)"', text))
    seen = collections.Counter()
    for _, line in prose_lines(text, keep_code=True):
        match = re.match(r'^ {0,3}#{1,6} +(.*)$', line)
        if match:
            slug = heading_slug(match.group(1))
            out.add(slug if not seen[slug] else '%s-%d' % (slug, seen[slug]))
            seen[slug] += 1
    return out


def links(text):
    """(line number, target) for every link in the prose of a Markdown file."""
    for number, line in prose_lines(text):
        for pattern in (INLINE_LINK, REFERENCE_DEFINITION, HTML_LINK):
            for match in pattern.finditer(line):
                yield number, match.group(1).strip('<>')


# Anchors per file, kept for the life of the process. Parsing a file's headings is the expensive part
# of resolving a link (docs/findings.md is 27000 lines), and the guards resolve thousands of links
# into a handful of files, so reading them once per link was most of the run time. The key carries the
# file's mtime and size, so a file a test rewrites between two calls is read again.
_ANCHOR_CACHE = {}


def _anchors_of(destination, cache=None):
    stat = os.stat(destination)
    key = (destination, stat.st_mtime_ns, stat.st_size)
    store = _ANCHOR_CACHE if cache is None else cache
    if key not in store:
        store[key] = anchors(read(destination))
    return store[key]


def resolve(source, target, root=ROOT, cache=None):
    """Where a relative link lands, and what is wrong with it: (path, None) or (path, reason).

    The path is None for a link that is not relative (a scheme, or nothing at all), which no guard here
    checks. A reason is one of: the file is missing, the link leaves the repository (it works on this
    machine and nowhere else), or the fragment is not an anchor of the file it names.
    """
    if not target or SCHEME.match(target):
        return None, None
    file_part, _, fragment = target.partition('#')
    file_part = urllib.parse.unquote(file_part)
    if not file_part:
        destination = source
    elif file_part.startswith('/'):
        destination = os.path.normpath(os.path.join(root, file_part.lstrip('/')))
    else:
        destination = os.path.normpath(os.path.join(os.path.dirname(source), file_part))
    if os.path.commonpath([os.path.abspath(root), os.path.abspath(destination)]) != os.path.abspath(root):
        return destination, 'leaves the repository'
    if not os.path.exists(destination):
        return destination, 'missing file'
    if not fragment:
        return destination, None
    if os.path.isdir(destination):
        destination = os.path.join(destination, 'README.md')
        if not os.path.exists(destination):
            return destination, 'missing anchor'
    if not destination.endswith('.md'):
        # GitHub's line anchors on a source file, which hold while the file is that long.
        line = re.match(r'^L(\d+)(?:-L(\d+))?$', fragment)
        if line:
            with open(destination, encoding='utf-8', errors='replace') as handle:
                length = sum(1 for _ in handle)
            return destination, None if int(line.group(2) or line.group(1)) <= length else 'missing anchor'
        return destination, 'missing anchor'
    return destination, None if fragment in _anchors_of(destination, cache) else 'missing anchor'


def broken_links(path, text, root=ROOT, cache=None):
    """(line number, target, reason) for each relative link of one file that does not resolve."""
    out = []
    for number, target in links(text):
        _, reason = resolve(path, target, root, cache)
        if reason:
            out.append((number, target, reason))
    return out


# The guards


def bench_violations(root=ROOT, fixtures=()):
    found = collections.Counter()
    words = [(kind, re.compile(pattern, re.I)) for kind, pattern in BENCH_WORDS]
    fixture = word_pattern_exact(fixtures)
    for path in reference_files(root):
        name = rel(path, root)
        if name in EXEMPT_FROM_BENCH:
            continue
        text = read(path)
        for kind, pattern in words:
            count = len(pattern.findall(text))
            if count:
                found[(name, kind)] += count
        if fixture:
            for match in fixture.findall(text):
                found[(name, 'fixture ' + match)] += 1
        if name.endswith('.md'):
            for _, target in links(text):
                destination, _ = resolve(path, target, root)
                if destination is None:
                    continue
                where = rel(destination, root)
                if where.startswith('docs/test-notes'):
                    found[(name, 'link into docs/test-notes/')] += 1
                elif where == 'docs/lab-register.md':
                    found[(name, 'link to docs/lab-register.md')] += 1
                elif where.startswith('../lab/') or where == '../lab':
                    found[(name, 'link into the lab')] += 1
    return found


def word_pattern_exact(names):
    """A pattern matching any of `names` as a whole token, where a token may hold dots and hyphens."""
    if not names:
        return None
    alternatives = '|'.join(sorted(map(re.escape, set(names)), key=len, reverse=True))
    return re.compile(r'(?<![\w.-])(?:%s)(?![\w-]|\.\w)' % alternatives)


def lab_fixtures(root=ROOT):
    """The lab's fixture names, logical and file names both, read from `tests/lab.py`."""
    sys.path.insert(0, os.path.join(root, 'tests'))
    try:
        import lab  # noqa: E402
    finally:
        sys.path.pop(0)
    return set(lab.IMAGES) | {os.path.basename(v) for v in lab.IMAGES.values()}


def name_violations(root=ROOT, people=None):
    people = person_names(root) if people is None else people
    pattern = word_pattern(people)
    found = collections.Counter()
    if pattern is None:
        return found
    for path in reference_files(root):
        count = len(pattern.findall(read(path)))
        if count:
            found[(rel(path, root), 'a person')] += count
    return found


def copy_violations(root=ROOT, authors=None):
    """The copy's patterns, plus its author when the checkout was found (`authors` not None)."""
    found = collections.Counter()
    patterns = [(kind, re.compile(pattern, re.I)) for kind, pattern in COPY_PATTERNS]
    author = word_pattern(authors) if authors else None
    for path in reference_files(root):
        text = read(path)
        name = rel(path, root)
        for kind, pattern in patterns:
            count = len(pattern.findall(text))
            if count:
                found[(name, kind)] += count
        if author:
            count = len(author.findall(text))
            if count:
                found[(name, 'its author')] += count
    return found


def _sections(root):
    path = os.path.join(root, 'docs', 'findings.md')
    return {int(n) for n in re.findall(r'^## (\d+)\. ', read(path), re.M)} if os.path.exists(path) else set()


def _decisions(root):
    path = os.path.join(root, 'docs', 'decisions.md')
    if not os.path.exists(path):
        return set()
    return {int(n) for n in re.findall(r'^(\d+)\. (?:<a id="d\d+"></a>)?\*\*', read(path), re.M)}


def footnote_problems(path, text, root=ROOT, sections=None, decisions=None):
    """(label, kind) for each fault of one page's footnotes, plan 009 section 4."""
    sections = _sections(root) if sections is None else sections
    decisions = _decisions(root) if decisions is None else decisions
    references, definitions, problems = collections.Counter(), collections.defaultdict(list), []
    for _, line in prose_lines(text):
        definition = FOOTNOTE_DEFINITION.match(line)
        if definition:
            definitions[definition.group(1)].append(definition.group(2))
            line = line[definition.end(1) + 2:]
        for label in FOOTNOTE_REFERENCE.findall(line):
            references[label] += 1
    for label in sorted(set(references) | set(definitions)):
        match = LABEL.match(label)
        if not match:
            problems.append((label, 'label not of an allowed form'))
        if label not in definitions:
            problems.append((label, 'referenced and never defined'))
            continue
        if label not in references:
            problems.append((label, 'defined and never referenced'))
        if len(definitions[label]) > 1:
            problems.append((label, 'defined more than once'))
        if not match:
            continue
        body = definitions[label][0]
        kind = 'unchecked' if label == 'unchecked' else label[0]
        words = next((w for w in ALL_EVIDENCE if body.startswith(w)), None)
        if words is None:
            problems.append((label, 'evidence words not allowed'))
        elif words not in EVIDENCE[kind]:
            problems.append((label, 'evidence words do not match the label'))
        targets = [t for _, t in links(body)]
        if kind == 'unchecked':
            if targets:
                problems.append((label, 'links although not checked'))
            continue
        if len(targets) != 1:
            problems.append((label, 'does not name exactly one source'))
            continue
        target = targets[0]
        if kind == 'x':
            if not re.match(r'^https?://', target):
                problems.append((label, 'outside source without a public address'))
            continue
        destination, reason = resolve(path, target, root)
        if destination is None or reason == 'missing file' or reason == 'leaves the repository':
            problems.append((label, 'names a file that does not exist'))
            continue
        where, fragment = rel(destination, root), target.partition('#')[2]
        if kind == 's':
            number = int(match.group(1))
            if where != 'docs/findings.md' or fragment != 's%d' % number:
                problems.append((label, 'does not link its own archive section'))
            elif number not in sections:
                problems.append((label, 'names a section the archive does not hold'))
        elif kind == 'd':
            number = int(match.group(2))
            if where != 'docs/decisions.md' or fragment != 'd%d' % number:
                problems.append((label, 'does not link its own decision'))
            elif number not in decisions:
                problems.append((label, 'names a decision that does not exist'))
        elif kind == 't':
            if not re.search(r'(^|/)tests?/', where) or os.path.isdir(destination):
                problems.append((label, 'does not link a test file'))
    return problems


def footnote_violations(root=ROOT):
    found = collections.Counter()
    sections, decisions = _sections(root), _decisions(root)
    for path in files_under(root, 'reference', ('.md',)):
        name = rel(path, root)
        if name in EXEMPT_FROM_BENCH:
            # Logitech's generated listing: its brackets are theirs, not footnotes of ours.
            continue
        for label, kind in footnote_problems(path, read(path), root, sections, decisions):
            found[(name, '%s: %s' % (label, kind))] += 1
    return found


def link_violations(root=ROOT):
    found = collections.Counter()
    cache = {}
    for path in linked_documents(root):
        for _, target, reason in broken_links(path, read(path), root, cache):
            found[(rel(path, root), '%s: %s' % (reason, target))] += 1
    return found


def run_all(root=ROOT):
    """Every guard's findings, keys redacted, and which guards ran only in part.

    The copy guard's author half needs the checkout; without it that kind is not computed, and the
    caller has to know, so a pinned author entry is neither reported new nor stale on such a machine.
    """
    people = person_names(root)
    authors = catalogue_authors(catalogue_checkout(root))
    results = {
        'bench': bench_violations(root, lab_fixtures(root)),
        'names': name_violations(root, people),
        'copy': copy_violations(root, authors),
        'footnotes': footnote_violations(root),
        'links': link_violations(root),
    }
    hidden = people | (authors or set())
    redacted = {}
    for guard, counter in results.items():
        redacted[guard] = collections.Counter()
        for (path, kind), count in counter.items():
            redacted[guard][(redact(path, hidden), redact(kind, hidden))] += count
    uncomputed = {'copy': {'its author'}} if authors is None else {}
    return redacted, uncomputed


# The pin


BEGIN = '# BEGIN PINNED: written by tools/reference_guards.py --pin, never by hand\n'
END = '# END PINNED\n'


def render(results):
    lines = [BEGIN, 'PINNED = {\n']
    for guard in GUARDS:
        lines.append('    %r: {\n' % guard)
        for (path, kind), count in sorted(results[guard].items()):
            lines.append('        (%r, %r): %d,\n' % (path, kind, count))
        lines.append('    },\n')
    lines += ['}\n', END]
    return ''.join(lines)


def pin(results, test_file=TEST_FILE):
    text = read(test_file)
    start, end = text.index(BEGIN), text.index(END) + len(END)
    with open(test_file, 'w', encoding='utf-8') as handle:
        handle.write(text[:start] + render(results) + text[end:])


def folder(path):
    """The folder a count is reported under: a model or architecture folder, else the file's folder."""
    parts = path.split('/')
    if parts[:2] in (['reference', 'remotes'], ['reference', 'architectures']) and len(parts) > 3:
        return '/'.join(parts[:3])
    return '/'.join(parts[:-1]) or '(root)'


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    parser.add_argument('--pin', action='store_true', help='rewrite the pinned lists in the test')
    parser.add_argument('--counts', action='store_true', help='print the counts only')
    args = parser.parse_args(argv)
    results, uncomputed = run_all()
    if uncomputed:
        print('not computed, no checkout of the copy was found: the author half of the copy guard')
    if not args.counts:
        for guard in GUARDS:
            for (path, kind), count in sorted(results[guard].items()):
                print('%-9s %s: %s (%d)' % (guard, path, kind, count))
    for guard in GUARDS:
        per_folder = collections.Counter()
        for (path, _), count in results[guard].items():
            per_folder[folder(path)] += count
        print('%s: %d' % (guard, sum(per_folder.values())))
        for name, count in sorted(per_folder.items()):
            print('    %-48s %d' % (name, count))
    if args.pin:
        if uncomputed:
            sys.exit('refusing to pin without the checkout: the author half would be pinned as empty')
        pin(results)
        print('pinned into %s' % rel(TEST_FILE))


if __name__ == '__main__':
    main()
