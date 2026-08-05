"""
Decode the `XORLW` comparison chain, which is how this compiler emits a switch.

A PIC18 has no compare-with-literal instruction, so a switch over byte values comes out as a
chain that XORs the accumulator with the difference to the next case and branches on zero:

    MOVF  cmd,W
    XORLW 0x05      ; W = cmd ^ 0x05, zero iff cmd == 0x05
    BNZ   next
    BRA   handler_05
  next:
    XORLW 0xb5      ; W = cmd ^ 0xb0, zero iff cmd == 0xb0
    ...

The literals are therefore **not** the case values: each one is the XOR of the previous case
with the next, so the case value is the running XOR of every literal so far. Reading the
literals as case values gives a plausible looking table that is wrong for every entry after
the first, which is exactly the sort of error this project has already been bitten by, so
the running value is computed here rather than by hand.

The chain is followed as straight-line code and stops at the first instruction that is
neither part of the pattern nor the branch that skips a case, so the default branch that
follows the last case is not included: ask for it separately.

**Nothing here tells you where a chain ends.** The walk stops when the pattern stops, and if
the code after a chain has the same shape it will keep going. Pointed at the state dispatch at
`0x0C720` in the 700 image it returned 32 cases, and whether all 32 are one switch is not
established: the disassembly there is continuous, so they may well be.

A repeated case value ends the walk, since a switch cannot test the same value twice, so a
repeat means the running XOR has stopped tracking anything real. That catches one failure mode
and not this one. The defence that works is the caller's: **if the case values are not
plausible values for the variable being switched on, disassemble the chain and read it.** The
command table was trusted because its eight values are seven known command bytes and no
duplicates; the 32 case result was not trusted, for the opposite reason.
"""

from __future__ import annotations

import dataclasses
from typing import Dict, List, Optional

from . import isa

# The two conditional branches a case can use. With BNZ the case body is reached by the
# instruction after the branch; with BZ the branch itself is the case body's entry.
_SKIP_IF_NOT_EQUAL = 'BNZ'
_TAKE_IF_EQUAL = 'BZ'


@dataclasses.dataclass(frozen=True)
class Case:
    """One case of a switch: `value` reaches `target`, tested at `at`."""

    at: int
    value: int
    target: int


def xor_chain(code: bytes, base: int, start: int, limit: int = 32) -> List[Case]:
    """Decode a chain of XORLW comparisons beginning at `start`.

    `start` must be the address of the first `XORLW`. The accumulated value starts at zero,
    so the first case value is the first literal.
    """
    cases: List[Case] = []
    seen = set()
    accumulated = 0
    addr = start

    while len(cases) < limit:
        instr = _at(code, base, addr)
        if instr is None or instr.mnemonic != 'XORLW':
            break
        accumulated ^= instr.fields['k']
        if accumulated in seen:
            break       # a switch cannot repeat a case: the walk has left the chain
        test_at = addr
        addr += 2 * instr.words

        branch = _at(code, base, addr)
        if branch is None or branch.mnemonic not in (_SKIP_IF_NOT_EQUAL, _TAKE_IF_EQUAL):
            break
        addr += 2 * branch.words

        if branch.mnemonic == _TAKE_IF_EQUAL:
            # BZ jumps straight to the case body.
            cases.append(Case(test_at, accumulated, branch.fields['target']))
            seen.add(accumulated)
            continue

        # BNZ skips the case body, which is the unconditional branch that follows.
        body = _at(code, base, addr)
        if body is None or body.category not in (isa.REL8, isa.REL11, isa.ABS20):
            break
        cases.append(Case(test_at, accumulated, body.fields['target']))
        seen.add(accumulated)
        addr += 2 * body.words

    return cases


def chain_table(code: bytes, base: int, start: int) -> Dict[int, int]:
    """The same chain as a plain {case value: target} mapping."""
    return {case.value: case.target for case in xor_chain(code, base, start)}


def _at(code: bytes, base: int, addr: int) -> Optional[isa.Instr]:
    offset = addr - base
    if offset < 0 or offset + 2 > len(code):
        return None
    return isa.decode(code, offset, base)
