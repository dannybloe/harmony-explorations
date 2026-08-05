#!/usr/bin/env python3
"""
Disassemble PIC18 code, resolving special function register names.

Ghidra's PIC-18 module ships only a generic variant and leaves SFRs unnamed, which makes
peripheral code unreadable. This names them.

Usage:  pic18_disasm.py <file> <base_addr> <start_addr> <instruction_count>

Example, the infrared carrier modulator in the Harmony 700 2.8 image:
    pic18_disasm.py 700-2.8-Region_2.bin 0x9000 0x194a4 30
"""
import sys

import _bootstrap  # noqa: F401
from harmony import ezfile
from harmony.pic18 import disasm


def main():
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    path, base, start, count = sys.argv[1], int(sys.argv[2], 0), int(sys.argv[3], 0), int(sys.argv[4])
    code = ezfile.load_image(path)
    for line in disasm.disassemble(code, base, start, count):
        print(line)


if __name__ == '__main__':
    main()
