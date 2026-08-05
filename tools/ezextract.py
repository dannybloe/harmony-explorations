#!/usr/bin/env python3
"""
Unwrap Logitech container files into analysable binaries.

Handles `.hfw` (a ZIP of region files), `.EZUpgrade`/`.EZUp` (hex payload in <DATA>
elements) and `.EZHex` (raw payload after an XML header). For an architecture 12
`Region_2`, which packs a config and the code into one region, `--split` separates them at
the boundary the GSPM header marks.

Data.xml is printed with the original downloader's account and session fields removed. Do
not mirror unscrubbed `.hfw` files.

Usage:
    ezextract.py <file> [--list] [--out DIR] [--split] [--metadata]
"""
import os
import sys

import _bootstrap  # noqa: F401
from harmony import ezfile


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    path = sys.argv[1]
    args = sys.argv[2:]
    out_dir = None
    if '--out' in args:
        out_dir = args[args.index('--out') + 1]
        os.makedirs(out_dir, exist_ok=True)

    if '--metadata' in args:
        print(ezfile.read_hfw_metadata(path))
        return

    if path.lower().endswith('.hfw'):
        if '--list' in args:
            for name in ezfile.region_names(path):
                print(name)
            return
        regions = ezfile.read_hfw(path)
    else:
        regions = {os.path.basename(path): ezfile.decode_payload(open(path, 'rb').read(), path)}

    for name, region in sorted(regions.items()):
        print('%-28s %7d bytes  %-20s %s' % (
            name, len(region.payload), region.encoding,
            'GSPM container' if region.looks_like_gspm else 'code or opaque'))
        pieces = [(name, region.payload)]
        if '--split' in args and region.looks_like_gspm:
            config, code = ezfile.split_arch12_region2(region.payload)
            if code:
                pieces = [(name + '.config.bin', config), (name + '.code.bin', code)]
                print('    split at 0x%X: %d bytes config, %d bytes code'
                      % (len(config), len(config), len(code)))
        if out_dir:
            for piece_name, blob in pieces:
                dest = os.path.join(out_dir, piece_name.replace('/', '_'))
                with open(dest, 'wb') as fh:
                    fh.write(blob)
                print('    wrote %s' % dest)


if __name__ == '__main__':
    main()
