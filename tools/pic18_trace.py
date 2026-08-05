#!/usr/bin/env python3
"""
Find every access to a given PIC18 data memory address.

Point it at a variable and it reports every read, write and bit operation touching it,
which is how you walk a data flow backwards from a hardware register to the config field
that feeds it. The Harmony infrared chain was decoded this way.

Banked accesses are resolved by tracking MOVLB; accesses whose bank cannot be established
from straight-line code are flagged rather than silently attributed. Indirect access
through FSR is not detected, so a variable written only via INDF will appear to have no
writers.

Usage:  pic18_trace.py <file> <base_addr> <data_addr> [<data_addr> ...]

Example, the three infrared carrier variables:
    pic18_trace.py 700-2.8-Region_2.bin 0x9000 0x08D 0x08E 0x3BF
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
    for line in trace.report(trace.trace(code, base, targets), targets):
        print(line)


if __name__ == '__main__':
    main()
