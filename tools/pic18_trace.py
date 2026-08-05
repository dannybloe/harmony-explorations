#!/usr/bin/env python3
"""
Find every access to a given PIC18 data memory address in a firmware image.

This is the tool that made the Harmony IR chain tractable: point it at a variable and
it reports every read, write and bit operation touching it, which lets you walk a data
flow backwards from a hardware register to the config field that feeds it.

PIC18 data addresses are 12 bits, reached two ways, and both are handled:

  * **Banked access.** The instruction carries an 8-bit offset and the high nibble comes
    from the BSR, set by `MOVLB`. The scan tracks the most recent `MOVLB` to resolve the
    full address.
  * **`MOVFF`.** Carries both source and destination as full 12-bit addresses, so no bank
    tracking is needed. Reported separately.

Access-bank instructions (a=0) are deliberately ignored, because those resolve to either
bank 0 GPRs or the SFR page rather than to a banked variable.

Caveat: `MOVLB` tracking is a linear scan, so it is exact for straight-line code and
approximate across branch targets. In practice compilers emit `MOVLB` immediately before
each banked access, so it works well, but treat hits as leads to confirm in a
disassembler rather than as proof.

Usage:
    pic18_trace.py <image> <base_addr> <data_addr> [<data_addr> ...]

Example, tracing the three IR carrier variables in the Harmony 700 2.8 image:
    pic18_trace.py 700-2.8-Region_2.bin 0x9000 0x08D 0x08E 0x3BF
"""
import collections
import struct
import sys

WRITE = {0x6E: 'MOVWF', 0x6A: 'CLRF', 0x68: 'SETF', 0x6C: 'NEGF'}
READ = {0x50: 'MOVF', 0x66: 'TSTFSZ', 0x64: 'CPFSEQ', 0x62: 'CPFSGT',
        0x60: 'CPFSLT', 0x02: 'MULWF'}
# read-modify-write; d bit selects whether the result goes to W or back to the file
RMW = {0x04: 'DECF', 0x10: 'IORWF', 0x14: 'ANDWF', 0x18: 'XORWF', 0x1C: 'COMF',
       0x20: 'ADDWFC', 0x24: 'ADDWF', 0x28: 'INCF', 0x2C: 'DECFSZ',
       0x30: 'RRCF', 0x34: 'RLCF', 0x38: 'SWAPF', 0x3C: 'INCFSZ',
       0x40: 'RRNCF', 0x44: 'RLNCF', 0x48: 'INFSNZ', 0x4C: 'DCFSNZ',
       0x54: 'SUBFWB', 0x58: 'SUBWFB', 0x5C: 'SUBWF'}
BIT = {0x7: 'BTG', 0x8: 'BSF', 0x9: 'BCF', 0xA: 'BTFSC', 0xB: 'BTFSS'}


def trace(code, base, targets):
    """Return {data_addr: [(code_addr, description), ...]}."""
    n = len(code) // 2
    words = struct.unpack('<%dH' % n, code[:n * 2])
    hits = collections.defaultdict(list)
    targets = set(targets)
    bsr = None
    i = 0
    while i < n:
        w = words[i]
        hi, lo = w >> 8, w & 0xFF
        addr = base + i * 2
        step = 1

        if hi == 0x01:                                    # MOVLB k
            bsr = w & 0x0F
        elif (hi & 0xF0) == 0xC0:                         # MOVFF src,dst
            step = 2
            src = ((hi & 0x0F) << 8) | lo
            dst = words[i + 1] & 0xFFF if i + 1 < n else None
            if src in targets:
                hits[src].append((addr, 'MOVFF read  -> 0x%03X' % dst))
            if dst in targets:
                hits[dst].append((addr, 'MOVFF WRITE <- 0x%03X' % src))
        elif hi in (0xEC, 0xED, 0xEE, 0xEF):              # two-word CALL/GOTO/LFSR
            step = 2
        elif (hi & 1) and bsr is not None:                # banked access, a=1
            ea = (bsr << 8) | lo
            if ea in targets:
                kind = None
                if (hi & 0xFE) in WRITE:
                    kind = WRITE[hi & 0xFE] + ' WRITE'
                elif (hi & 0xFE) in READ:
                    kind = READ[hi & 0xFE] + ' read'
                elif (hi & 0xFC) in RMW:
                    to_file = (hi >> 1) & 1
                    kind = RMW[hi & 0xFC] + (' WRITE(F)' if to_file else ' read(W)')
                elif 0x70 <= hi <= 0xBF and (hi >> 4) in BIT:
                    kind = '%s bit%d' % (BIT[hi >> 4], (hi >> 1) & 7)
                if kind:
                    hits[ea].append((addr, kind))
        i += step
    return hits


def main():
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    path, base = sys.argv[1], int(sys.argv[2], 0)
    targets = [int(a, 0) for a in sys.argv[3:]]
    code = open(path, 'rb').read()
    hits = trace(code, base, targets)
    for t in targets:
        found = hits.get(t, [])
        print('=== data 0x%03X (bank %d offset 0x%02X): %d accesses ==='
              % (t, t >> 8, t & 0xFF, len(found)))
        for a, k in found:
            print('   0x%05X  %s' % (a, k))
        if not found:
            print('   none found (only banked and MOVFF accesses are detected)')


if __name__ == '__main__':
    main()
