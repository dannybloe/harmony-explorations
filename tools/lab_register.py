#!/usr/bin/env python3
"""What does the lab register already say about this path?

Section 209 is the sixth time a session derived something the lab had written down, and the fifth
time the fix proposed was a paragraph telling the next session to remember. Section 206 said the
structural fix is to make the check cheap and then did not make it cheaper, which is why this exists:
one command, answered from `reference/lab-register.md`, so the check costs a line rather than a
grep-and-read of a 58 row table.

**Run it on the directory you are about to open, not on the topic you are working on.** Both the
fifth and the sixth occurrences opened a directory the register covers while thinking about a subject
the register does not index, and the sixth had correctly checked the directory its dig *started* in.
A dig wanders; the trigger is the path.

    python3 tools/lab_register.py software/classic/src/hidcommands
    python3 tools/lab_register.py ../lab/firmware/packages      # absolute or lab relative

Every row whose path is a prefix of the query, or vice versa, is printed with its status. A row at
`mined` means somebody has already extracted what the want list asks for, and the honest next move is
to read their extraction rather than the artefact.
"""

import argparse
import collections
import os
import re
import sys

#: Where the register lives, relative to the repository root.
REGISTER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        'reference', 'lab-register.md')

#: A row is a markdown table line whose first cell is a backticked path. The register also holds
#: header and separator rows and prose, and neither matches this. The **status legend** does match
#: the shape, though, and its first cell is a bare word, so a path shape is required as well: a
#: query for `unseen` returning the legend would be an answer that looks like a hit.
#: The path may be followed by prose inside the same cell, as in "`work/myharmony/probe.py` and its
#: scripts", so the cell is matched up to the next pipe rather than required to end at the backtick.
ROW = re.compile(r'^\|\s*`([^`]+)`[^|]*\|(.*)$')
LOOKS_LIKE_A_PATH = re.compile(r'[/.*]')


def rows(text):
    """Every register row, as `(path, cells)`, in file order.

    The cells are kept whole rather than named, because the register's columns differ slightly
    between its three tables and a reader wants the line, not a parse.
    """
    found = []
    for line in text.splitlines():
        match = ROW.match(line.strip())
        if match and LOOKS_LIKE_A_PATH.search(match.group(1)):
            cells = [c.strip() for c in match.group(2).split('|')]
            while cells and not cells[-1]:
                cells.pop()
            found.append((match.group(1).rstrip('/'), cells))
    return found


def normalise(query):
    """A query as a lab relative path, whatever the caller typed.

    Accepts an absolute path, a path through `../lab`, or a path already relative to the lab, so
    that pasting whatever is in the shell works. Anything before a `lab/` component is dropped.
    """
    query = query.replace(os.sep, '/').strip().rstrip('/')
    parts = [p for p in query.split('/') if p not in ('', '.')]
    if 'lab' in parts:
        parts = parts[parts.index('lab') + 1:]
    return '/'.join(parts)


def covering(query, entries):
    """The rows that bear on `query`: an ancestor of it, it, or anything under it.

    Both directions matter. An ancestor row is what says the square has been surveyed; a descendant
    row is what says one file inside it has already been mined, which is the case that caught
    section 209.
    """
    hits = []
    for path, cells in entries:
        if query == path or query.startswith(path + '/') or path.startswith(query + '/'):
            hits.append((path, cells))
    return hits


#: The want list in `docs/lab-excavation.md`, in its own order. Held here so the progress report can
#: name a tag with **no** rows at all, which a scan of the register cannot do: an untagged want is
#: indistinguishable from a want nobody has found anything for, and the two need different action.
WANT_LIST = ('compiler', 'ir-db', 'ir-learn', 'scan-codes', 'models', 'intermediate', 'write-path',
             'restore', 'packages', 'service-api', 'provenance', 'fh-data-model', 'fh-screens',
             'fh-wizard', 'fh-settings', 'fh-limits', 'fh-failures')

#: A row's depth, deepest first. `catalogued` and `mined` are the two that mean the artefact's value
#: has reached this repository; the other three mean it has not.
DEPTHS = ('mined', 'catalogued', 'read', 'surveyed', 'unseen')
LANDED = frozenset({'mined', 'catalogued'})


def depth(cells):
    """The status word of a row, or `unseen` when the cell says nothing recognisable.

    The register writes a status as a backticked word with prose around it, sometimes two of them in
    one cell, as in "`read` in four notes, `unseen` otherwise". The **shallowest** word wins, because
    a row claiming two depths is claiming the deeper one for part of itself only, and this is the
    number a progress report must not flatter.
    """
    status = cells[2] if len(cells) > 2 else ''
    found = [word for word in re.findall(r'`(\w+)`', status) if word in DEPTHS]
    if not found:
        return 'unseen'
    return max(found, key=DEPTHS.index)


def tags(cells):
    """The want list tags a row carries."""
    cell = cells[3] if len(cells) > 3 else ''
    return [tag for tag in re.findall(r'`([\w-]+)`', cell) if tag in WANT_LIST]


def progress(entries):
    """Per tag: how many rows carry it, and how many of those have landed here.

    Returns `(tag, landed, total)` in want list order, so a tag nothing carries reports `0 of 0` and
    is visibly different from a tag whose rows are all still shut.
    """
    counted = collections.defaultdict(lambda: [0, 0])
    for _, cells in entries:
        landed = depth(cells) in LANDED
        for tag in tags(cells):
            counted[tag][1] += 1
            if landed:
                counted[tag][0] += 1
    return [(tag, counted[tag][0], counted[tag][1]) for tag in WANT_LIST]


def report(entries, out=sys.stdout):
    """The whole progress view: depth of the site, then the want list, then what is still shut."""
    by_depth = collections.Counter(depth(cells) for _, cells in entries)
    landed = sum(by_depth[d] for d in LANDED)
    print('%d artefacts, %d of them written up here' % (len(entries), landed), file=out)
    for name in DEPTHS:
        print('  %-12s %d' % (name, by_depth[name]), file=out)

    print('\nthe want list, by how many of its artefacts have landed', file=out)
    for tag, done, total in progress(entries):
        mark = 'x' if total and done == total else ' '
        note = '' if total else '   no artefact carries this tag'
        print('  [%s] %-16s %d of %d%s' % (mark, tag, done, total, note), file=out)

    shut = [(path, depth(cells)) for path, cells in entries if depth(cells) not in LANDED]
    print('\n%d artefacts are not written up here yet' % len(shut), file=out)
    for path, name in sorted(shut, key=lambda row: (DEPTHS.index(row[1]), row[0]), reverse=True):
        print('  %-10s %s' % (name, path), file=out)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('path', nargs='?',
                        help='a lab path, absolute or relative to the lab')
    parser.add_argument('--progress', action='store_true',
                        help='where the digging stands, per want list tag, instead of a query')
    parser.add_argument('--register', default=REGISTER, help='where the register lives')
    args = parser.parse_args(argv)

    with open(args.register, encoding='utf-8') as handle:
        entries = rows(handle.read())

    if args.progress:
        report(entries)
        return 0
    if args.path is None:
        parser.error('give a path, or --progress')

    query = normalise(args.path)
    hits = covering(query, entries)
    if not hits:
        print('%s: no register row covers this. It is either outside the lab or the register is '
              'missing it, and the second is a bug worth fixing before you dig.' % query)
        return 1

    for path, cells in hits:
        status = cells[2] if len(cells) > 2 else ''
        holds = cells[-1] if cells else ''
        print('%s\n  status: %s\n  %s\n' % (path, status, holds))
    return 0


if __name__ == '__main__':
    sys.exit(main())
