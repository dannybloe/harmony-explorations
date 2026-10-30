"""
The generated keys block of a model's keys page, read back as rows.

**Why the Python side reads Markdown at all.** The scan code of each key is the drawing's data, in
`packages/silhouettes/src/models/`, and `make remote-reference` writes it into
`reference/remotes/<model>/keys.md` between `<!-- generated:keys -->` markers, failing the TypeScript
suite when the page and the drawing differ. A Python test cannot import the drawing, so it reads that
block, which is as good as reading the data for exactly that reason. Until plan 009's step 3.3 the
same codes were a hand kept table in `reference/button-maps.md` that two Python tests parsed; this is
the one reader that replaced both, so a change to the block's shape is made here once.

A row is `| key | kind | name from | scan code | screen zone | printed |`, and a scan cell reads
`26 (0x1A)[^s323]`: the code, its hexadecimal spelling and the footnote of the archive section that
established it, or `25 (0x19)[^t-harmony-350-keys-u]` where a test did, since the archive is frozen and a
later measurement has a test for its source; or `one of ...` or `not measured`.
"""
import os
import re

_HERE = os.path.dirname(os.path.abspath(__file__))
REMOTES = os.path.normpath(os.path.join(_HERE, '..', 'reference', 'remotes'))

_BLOCK = re.compile(r'<!-- generated:keys -->\n(.*?)<!-- /generated -->', re.S)
_ROW = re.compile(r'^\| `([A-Za-z0-9]+)` \| (\w+) \| (\w+) \| ([^|]*) \|', re.M)
_SCAN = re.compile(r'^(\d+) \(0x[0-9A-F]{2}\)\[\^(s\d+|t-[a-z0-9-]+)\]$')


def generated_keys(folder):
    """{name: (kind, name from, scan or None, its footnote label or None)} for one model folder's keys page."""
    with open(os.path.join(REMOTES, folder, 'keys.md'), encoding='utf-8') as handle:
        block = _BLOCK.search(handle.read())
    if block is None:
        raise ValueError('%s/keys.md has no generated keys block' % folder)
    keys = {}
    for name, kind, source, cell in _ROW.findall(block.group(1)):
        scan = _SCAN.match(cell.strip())
        keys[name] = (kind, source, int(scan.group(1)) if scan else None, scan.group(2) if scan else None)
    if not keys:
        raise ValueError('%s/keys.md: the generated block holds no row this reader understands' % folder)
    return keys
