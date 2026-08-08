#!/usr/bin/env python3
"""
Disassemble PIC18 code, resolving special function register names.

Ghidra's PIC-18 module ships only a generic variant and leaves SFRs unnamed, which makes
peripheral code unreadable. This names them.

Usage:  pic18_disasm.py <file> <base_addr> <start_addr> <instruction_count> [--part NAME]

Example, the infrared carrier modulator in the Harmony 700 2.8 image:
    pic18_disasm.py 700-2.8-Region_2.bin 0x9000 0x194a4 30

`--part` selects the register map, `67j50` by default and `4550` for a Harmony 525. It is not
cosmetic: 65 of the 4550's 139 register addresses disagree with the 67J50 family's, so the wrong
map produces a listing that reads perfectly and says the wrong thing. `docs/findings.md` section 80.
"""
import sys

import _bootstrap  # noqa: F401
from harmony import ezfile
from harmony.pic18 import disasm, isa


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    part = isa.DEFAULT_PART
    for a in sys.argv[1:]:
        if a.startswith('--part'):
            part = a.split('=', 1)[1] if '=' in a else sys.argv[sys.argv.index(a) + 1]
    args = [a for a in args if a != part]
    if len(args) != 4 or part not in isa.PARTS:
        sys.exit(__doc__)
    path, base, start, count = args[0], int(args[1], 0), int(args[2], 0), int(args[3])
    code = ezfile.load_image(path)
    for line in disasm.disassemble(code, base, start, count, part):
        print(line)


if __name__ == '__main__':
    main()
