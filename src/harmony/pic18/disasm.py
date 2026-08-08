"""
Text formatting for decoded PIC18 instructions.

Ghidra's PIC-18 language module ships only a generic variant, so it leaves special
function registers unnamed. This resolves them, which is the difference between reading
`BSF 0x82,2` and `BSF PORTC,2`.

Two pieces of processor state have to be tracked for a name to be right:

  * **BSR.** Banked operands (a=1) need it, and it is set by `MOVLB`. A linear scan can only
    follow that within straight-line code, so the tracked value is reset to unknown at
    anything that transfers control. Operands whose bank is unknown are printed with a `,B`
    suffix rather than guessed at.
  * **ADSHR**, `WDTCON` bit 4. It swaps a second register in at ten shared addresses, so
    ignoring it names the wrong register there. Unlike BSR it is an ordinary register bit
    and survives control flow, so it is not reset at a branch. See `isa.SFR_SHADOW`.
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


def _movff_operand(addr: int, adshr: bool, part: str = isa.DEFAULT_PART) -> str:
    """Name a MOVFF operand, which carries a full 12-bit address."""
    if addr >= 0xF00:
        return isa.sfr_name(addr, adshr, part)
    return '0x%03x' % addr


def format_instr(instr: Instr, bsr: Optional[int] = None, adshr: bool = False,
                 part: str = isa.DEFAULT_PART) -> str:
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
        _, name = isa.resolve_file(f['f'], f['a'], bsr, adshr, part)
        return '%s %s' % (m, name)
    if cat == isa.FILE_DA:
        _, name = isa.resolve_file(f['f'], f['a'], bsr, adshr, part)
        return '%s %s,%s' % (m, name, 'F' if f['d'] else 'W')
    if cat == isa.BIT:
        _, name = isa.resolve_file(f['f'], f['a'], bsr, adshr, part)
        return '%s %s,%d' % (m, name, f['b'])
    if cat == isa.MOVFF:
        return 'MOVFF %s,%s' % (_movff_operand(f['src'], adshr, part),
                                _movff_operand(f['dst'], adshr, part))
    if cat in (isa.REL8, isa.REL11, isa.ABS20):
        return '%s 0x%05x' % (m, f['target'])
    if cat == isa.LFSR:
        return 'LFSR FSR%d,0x%03x' % (f['fsr'], f['k'])
    if cat == isa.EXTENDED:
        parts = ','.join('%s=0x%x' % (k, v) for k, v in sorted(f.items()))
        return '%s %s  ; extended set, only valid with XINST enabled' % (m, parts)
    return m


def _adshr_change(instr: Instr, bsr: Optional[int]) -> Optional[bool]:
    """True or False if this instruction sets or clears ADSHR, else None.

    Only an explicit bit operation on WDTCON counts. `MOVWF WDTCON` also changes the bit,
    but with a value a linear scan does not have, so it is left alone rather than guessed
    at: no image read so far writes WDTCON that way.
    """
    if instr.category != isa.BIT or instr.fields['b'] != isa.ADSHR_BIT:
        return None
    addr, _ = isa.resolve_file(instr.fields['f'], instr.fields['a'], bsr)
    if addr != isa.ADSHR_REGISTER:
        return None
    if instr.mnemonic == 'BSF':
        return True
    if instr.mnemonic == 'BCF':
        return False
    return None


def disassemble(code: bytes, base: int, start: int, count: int,
                part: str = isa.DEFAULT_PART) -> Iterator[str]:
    """Yield `count` formatted lines starting at address `start`.

    `part` selects the SFR map, and it matters: the 525 is a `PIC18F4550` and 65 of its 139
    register addresses disagree with the 67J50 family's. See `isa.PARTS`.
    """
    offset = start - base
    bsr: Optional[int] = None
    # ADSHR is clear after reset, and this firmware sets it only in windows a few
    # instructions long that always close with a matching BCF, so assuming clear at an
    # arbitrary entry point is right nearly everywhere. Unlike BSR it survives control
    # flow, being an ordinary register bit, so it is not reset at a branch.
    adshr = False
    emitted = 0
    while emitted < count and offset + 2 <= len(code):
        instr = isa.decode(code, offset, base)
        raw = ' '.join('%02x' % b for b in code[offset:offset + 2 * instr.words])
        yield '  %05x: %-11s %s' % (base + offset, raw, format_instr(instr, bsr, adshr, part))

        changed = _adshr_change(instr, bsr)
        if changed is not None:
            adshr = changed

        if instr.category == isa.BANKSEL:
            bsr = instr.fields['k']
        elif _flow_breaks_bank_tracking(instr):
            bsr = None

        offset += 2 * instr.words
        emitted += 1
