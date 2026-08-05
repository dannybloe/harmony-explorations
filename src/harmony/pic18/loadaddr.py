"""
Determine the address a raw PIC18 image was linked for.

Needed because a disassembler given the wrong base produces a plausible-looking listing
rather than an obvious failure, so the base has to be established before anything else.
Any new firmware image, for a model not yet examined, starts here.

Method. Decode every absolute `CALL` and `GOTO`, whose targets are absolute addresses
independent of where the image sits in a file. For a candidate base, two things are
measured:

  reach     the fraction of targets that land inside the image
  boundary  of those, the fraction immediately preceded by something that ends a
            basic block: RETURN, RETFIE, RESET, RETLW, an unconditional BRA, or the
            trailing word of a two-word instruction

Reach alone is weak, because a base that is merely close scores well on it. Boundary is
the discriminator: real call targets are function entry points, so they sit just after
whatever ended the previous function. On the images examined the correct base scores
around 98% boundary while bases that are wrong by a single 4 KiB page score 11 to 30%.

Calibrated in `tests/test_loadaddr.py` against images whose base is known independently,
from the destination recorded in the firmware update package.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Tuple

from . import isa

# Instructions after which a new function may plausibly begin.
_BLOCK_ENDERS = frozenset({'RETURN', 'RETURN FAST', 'RETFIE', 'RETFIE FAST',
                           'RESET', 'RETLW', 'BRA', 'GOTO'})

DEFAULT_CANDIDATE_STEP = 0x1000
DEFAULT_MAX_BASE = 0x40000


@dataclass
class Score:
    base: int
    targets: int
    in_range: int
    boundary_hits: int

    @property
    def reach(self) -> float:
        return self.in_range / self.targets if self.targets else 0.0

    @property
    def boundary(self) -> float:
        return self.boundary_hits / self.in_range if self.in_range else 0.0

    def __str__(self) -> str:
        return ('base=0x%06X  reach %4d/%4d (%5.1f%%)  boundary %4d (%5.1f%%)'
                % (self.base, self.in_range, self.targets, 100 * self.reach,
                   self.boundary_hits, 100 * self.boundary))


def absolute_targets(code: bytes) -> List[int]:
    """Every absolute CALL and GOTO target in the image, as byte addresses."""
    out = []
    for _, instr in isa.iter_instructions(code, 0):
        if instr.category == isa.ABS20:
            out.append(instr.fields['target'])
    return out


def score_base(code: bytes, base: int, targets: Optional[List[int]] = None) -> Score:
    """Score one candidate base address."""
    if targets is None:
        targets = absolute_targets(code)
    in_range = [t for t in targets if base <= t < base + len(code)]
    hits = 0
    for t in in_range:
        offset = t - base
        if offset < 2:
            continue
        prev = isa.decode(code, offset - 2, base)
        # The trailing word of a two-word instruction decodes as SECOND_WORD here, which
        # means the previous instruction was a CALL or GOTO: also a block end.
        if prev.mnemonic in _BLOCK_ENDERS or prev.category == isa.SECOND_WORD:
            hits += 1
    return Score(base, len(targets), len(in_range), hits)


def find_base(code: bytes, step: int = DEFAULT_CANDIDATE_STEP,
              max_base: int = DEFAULT_MAX_BASE) -> Tuple[Score, List[Score]]:
    """Search candidate bases and return (best, all_scores_sorted_by_boundary).

    `best` is the highest boundary score among candidates with meaningful reach. Check the
    margin over the runner-up before trusting it: a clear answer separates by a wide gap,
    as documented in the module docstring.
    """
    targets = absolute_targets(code)
    if not targets:
        raise ValueError('no absolute CALL or GOTO instructions found; '
                         'is this really PIC18 code?')
    scores = [score_base(code, base, targets)
              for base in range(0, max_base + 1, step)]
    plausible = [s for s in scores if s.reach >= 0.5]
    ranked = sorted(plausible or scores,
                    key=lambda s: (s.boundary, s.reach), reverse=True)
    return ranked[0], ranked


def entry_point(code: bytes, base: int) -> Optional[int]:
    """The entry point from the image header, if the header looks like one.

    Harmony firmware images carry a `GOTO` at offset 0x0A that jumps to the real entry
    point, which sits near the end of the image.
    """
    if len(code) < 0x0E:
        return None
    instr = isa.decode(code, 0x0A, base)
    if instr.mnemonic == 'GOTO':
        return instr.fields['target']
    return None
