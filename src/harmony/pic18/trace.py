"""
Find every access to a given PIC18 data memory address.

This is the workhorse for following a data flow backwards from a hardware register to the
config field that feeds it. The Harmony infrared chain was decoded by pointing it at three
variables.

PIC18 data addresses are 12 bits, reached two ways, and both are handled:

  * **Banked access.** The instruction carries an 8-bit offset; the high nibble comes from
    BSR, set by `MOVLB`. A linear scan follows `MOVLB` and drops back to unknown at
    anything that transfers control, so accesses whose bank cannot be established are
    reported separately rather than silently attributed to the wrong bank.
  * **`MOVFF`.** Carries both source and destination as full 12-bit addresses, so no bank
    tracking is needed.

Access-bank instructions (a=0) resolve to bank 0 GPRs or the SFR page, not to a banked
variable, so they are matched against those addresses instead.

Known limitation: indirect access through FSR0/1/2 is invisible here. A variable written
only via `INDF` will appear to have no writers. Search for the FSR setup instead.
"""

from __future__ import annotations

import collections
from typing import Dict, Iterable, List, Optional, Tuple

from . import isa
from .isa import Instr

# category -> how an access to the file operand should be described
_WRITE_ONLY = {'MOVWF', 'CLRF', 'SETF', 'NEGF'}
_READ_ONLY = {'MOVF', 'TSTFSZ', 'CPFSEQ', 'CPFSGT', 'CPFSLT', 'MULWF'}


class Access(collections.namedtuple('Access', 'addr kind detail bank_known')):
    """One access to a data address, at code address `addr`."""

    def __str__(self) -> str:
        suffix = '' if self.bank_known else '   (bank inferred, verify)'
        detail = ('  %s' % self.detail) if self.detail else ''
        return '0x%05X  %s%s%s' % (self.addr, self.kind, detail, suffix)


def _describe(instr: Instr) -> Optional[str]:
    """How this instruction touches its file operand, or None if it does not."""
    m, cat = instr.mnemonic, instr.category
    if cat == isa.FILE_A:
        if m in _WRITE_ONLY:
            return '%s WRITE' % m
        if m in _READ_ONLY:
            return '%s read' % m
        return '%s access' % m
    if cat == isa.FILE_DA:
        return '%s %s' % (m, 'WRITE(F)' if instr.fields['d'] else 'read(W)')
    if cat == isa.BIT:
        return '%s bit%d' % (m, instr.fields['b'])
    return None


def trace(code: bytes, base: int, targets: Iterable[int]) -> Dict[int, List[Access]]:
    """Return {data_address: [Access, ...]} for each requested address."""
    wanted = set(targets)
    hits: Dict[int, List[Access]] = {t: [] for t in wanted}
    bsr: Optional[int] = None

    for addr, instr in isa.iter_instructions(code, base):
        if instr.category == isa.BANKSEL:
            bsr = instr.fields['k']
            continue

        if instr.category == isa.MOVFF:
            src, dst = instr.fields['src'], instr.fields['dst']
            if src in wanted:
                hits[src].append(Access(addr, 'MOVFF read', '-> 0x%03X' % dst, True))
            if dst in wanted:
                hits[dst].append(Access(addr, 'MOVFF WRITE', '<- 0x%03X' % src, True))
        elif instr.category in (isa.FILE_A, isa.FILE_DA, isa.BIT):
            resolved, _ = isa.resolve_file(instr.fields['f'], instr.fields['a'], bsr)
            if resolved is not None and resolved in wanted:
                kind = _describe(instr)
                if kind:
                    hits[resolved].append(
                        Access(addr, kind, '', bank_known=instr.fields['a'] == 0))

        if instr.category in (isa.REL8, isa.REL11, isa.ABS20) or instr.mnemonic in (
                'RETURN', 'RETURN FAST', 'RETFIE', 'RETFIE FAST', 'RETLW', 'RESET'):
            bsr = None

    return hits


def report(hits: Dict[int, List[Access]], targets: Iterable[int]) -> Iterable[str]:
    """Render a trace result as text."""
    for t in targets:
        found = hits.get(t, [])
        yield '=== data 0x%03X (bank %d offset 0x%02X): %d accesses ===' % (
            t, t >> 8, t & 0xFF, len(found))
        for access in found:
            yield '   %s' % access
        if not found:
            yield '   none found (indirect access through FSR is not detected)'
