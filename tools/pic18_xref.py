#!/usr/bin/env python3
"""
Find every call or branch that reaches a code address.

The counterpart to pic18_trace.py: that one walks a data flow towards the hardware, this
one walks the call graph backwards from a routine to whatever uses it. Point it at a
low-level helper and it tells you which subsystem the helper belongs to.

Only direct transfers are seen. A computed jump, meaning a write to PCL or a table read into
PCLATH, is invisible, so no references is not proof a routine is dead.

Usage:  pic18_xref.py <file> <base_addr> <code_addr> [<code_addr> ...]

Example, who fetches the address of the USB output report buffer:
    pic18_xref.py 700-2.8-Region_2-code-base0x9000.bin 0x9000 0x17332
"""
import sys

import _bootstrap  # noqa: F401
from harmony import ezfile
from harmony.pic18 import trace


def main():
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    path, base = sys.argv[1], int(sys.argv[2], 0)
    targets = [int(a, 0) for a in sys.argv[3:]]
    code = ezfile.load_image(path)
    for line in trace.report_xrefs(trace.xrefs(code, base, targets), targets):
        print(line)


if __name__ == '__main__':
    main()
