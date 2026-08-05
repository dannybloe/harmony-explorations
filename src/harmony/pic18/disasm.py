"""
Text formatting for decoded PIC18 instructions.

Ghidra's PIC-18 language module ships only a generic variant, so it leaves special
function registers unnamed. This resolves them, which is the difference between reading
`BSF 0x82,2` and `BSF PORTC,2`.

Bank tracking: banked operands (a=1) need BSR, which is set by `MOVLB`. A linear scan can
only follow that within straight-line code, so the tracked value is reset to unknown at
anything that transfers control. Operands whose bank is unknown are printed with a `,B`
suffix rather than guessed at.
"""

from __future__ import annotations

from typing import Iterator, Optional

from . import isa
from .isa import Instr


def _flow_breaks_bank_tracking(instr: Instr) -> bool:
    """True if BSR cannot be relied on after this instruction."""
    if instr.category in (isa.REL8, isa.REL11, isa.ABS20):
        return True
    return instr.mnemonic in ('RETURN', 'RETURN FAST', 'RETFIE', 'RETFIE FAST',
                              'RETLW', 'RESET')


def format_instr(instr: Instr, bsr: Optional[int] = None) -> str:
    """Render one instruction as assembly text."""
    f = instr.fields
    cat = instr.category
    m = instr.mnemonic

    if cat in (isa.INHERENT, isa.SECOND_WORD):
        return m
    if cat == isa.UNKNOWN:
        return '??? %04x' % instr.raw
    if cat == isa.BANKSEL:
        return 'MOVLB 0x%x' % f['k']
    if cat == isa.LITERAL:
        return '%s 0x%02x' % (m, f['k'])
    if cat == isa.FILE_A:
        _, name = isa.resolve_file(f['f'], f['a'], bsr)
        return '%s %s' % (m, name)
    if cat == isa.FILE_DA:
        _, name = isa.resolve_file(f['f'], f['a'], bsr)
        return '%s %s,%s' % (m, name, 'F' if f['d'] else 'W')
    if cat == isa.BIT:
        _, name = isa.resolve_file(f['f'], f['a'], bsr)
        return '%s %s,%d' % (m, name, f['b'])
    if cat == isa.MOVFF:
        src = isa.SFR.get(f['src'], '0x%03x' % f['src'])
        dst = isa.SFR.get(f['dst'], '0x%03x' % f['dst'])
        return 'MOVFF %s,%s' % (src, dst)
    if cat in (isa.REL8, isa.REL11, isa.ABS20):
        return '%s 0x%05x' % (m, f['target'])
    if cat == isa.LFSR:
        return 'LFSR FSR%d,0x%03x' % (f['fsr'], f['k'])
    if cat == isa.EXTENDED:
        parts = ','.join('%s=0x%x' % (k, v) for k, v in sorted(f.items()))
        return '%s %s  ; extended set, only valid with XINST enabled' % (m, parts)
    return m


def disassemble(code: bytes, base: int, start: int, count: int) -> Iterator[str]:
    """Yield `count` formatted lines starting at address `start`."""
    offset = start - base
    bsr: Optional[int] = None
    emitted = 0
    while emitted < count and offset + 2 <= len(code):
        instr = isa.decode(code, offset, base)
        raw = ' '.join('%02x' % b for b in code[offset:offset + 2 * instr.words])
        yield '  %05x: %-11s %s' % (base + offset, raw, format_instr(instr, bsr))

        if instr.category == isa.BANKSEL:
            bsr = instr.fields['k']
        elif _flow_breaks_bank_tracking(instr):
            bsr = None

        offset += 2 * instr.words
        emitted += 1
