#!/usr/bin/env python3
"""
Parse a GSPM config container and report its structure.

Takes a filename and nothing else: the flash base address and the pointer table length
are both recovered from the data. Accepts a bare blob, an EZHex/EZUp file, or a raw flash
dump with the container somewhere inside it.

Usage:  gspm_parse.py <file> [--json]
"""
import json
import sys

import _bootstrap  # noqa: F401
from harmony import ezfile, gspm


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    path = sys.argv[1]
    try:
        data = ezfile.load_image(path)
    except Exception:
        with open(path, 'rb') as fh:
            data = fh.read()

    container = gspm.parse(data)
    if '--json' in sys.argv:
        # The shape lives in `gspm.summary`, not here: it is the golden vector format, and
        # `packages/codec` has to produce the same object.
        print(json.dumps(gspm.summary(container), indent=2))
    else:
        for line in gspm.report(container):
            print(line)
    return 0 if container.all_checks_pass else 1


if __name__ == '__main__':
    sys.exit(main())
