"""
PIC18 instruction set: the single source of truth for this project.

Every tool decodes instructions through here. That is deliberate. An earlier version of
this project carried a separate copy of the opcode table in each tool, and two of them
disagreed with the datasheet in ways that silently changed the meaning of real code:

  * `SUBFWB` and `SUBWFB` were swapped, which inverted an arithmetic expression
  * `BTFSC` and `BTFSS` were swapped, which inverted the sense of every bit test

Both are the sort of error that produces a plausible-looking listing rather than an
obvious failure, so there is one table now, it is range-checked at import time, and the
encodings are asserted in `tests/test_isa.py` against the datasheet.

Reference: Microchip PIC18F instruction set summary. Bit fields use the datasheet's
notation:

    f    8-bit file register offset
    a    0 selects the access bank, 1 selects the bank chosen by BSR
    d    0 puts the result in W, 1 puts it back in the file register
    b    bit position, 3 bits
    k    literal or address
    s    CALL shadow-register flag
"""

from __future__ import annotations

from typing import Dict, NamedTuple, Optional

# --------------------------------------------------------------------------------------
# Categories
# --------------------------------------------------------------------------------------

INHERENT = 'inherent'      # no operands
LITERAL = 'literal'        # 8-bit literal in the low byte
BANKSEL = 'banksel'        # MOVLB
FILE_A = 'file_a'          # file register, a flag, no d flag
FILE_DA = 'file_da'        # file register, d and a flags
BIT = 'bit'                # file register, bit number, a flag
MOVFF = 'movff'            # two words, 12-bit source and destination
REL11 = 'rel11'            # BRA, RCALL: 11-bit signed word offset
REL8 = 'rel8'              # conditional branches: 8-bit signed word offset
ABS20 = 'abs20'            # CALL, GOTO: two words, 20-bit word address
LFSR = 'lfsr'              # two words, loads an FSR pair
EXTENDED = 'extended'      # extended instruction set, only valid when XINST is enabled
SECOND_WORD = 'second'     # the 0xFxxx trailing word of a two-word instruction
UNKNOWN = 'unknown'

# --------------------------------------------------------------------------------------
# Tables
# --------------------------------------------------------------------------------------

# Exact single-word encodings with no operands.
INHERENT_OPS: Dict[int, str] = {
    0x0000: 'NOP',
    0x0003: 'SLEEP',
    0x0004: 'CLRWDT',
    0x0005: 'PUSH',
    0x0006: 'POP',
    0x0007: 'DAW',
    0x0008: 'TBLRD*',
    0x0009: 'TBLRD*+',
    0x000A: 'TBLRD*-',
    0x000B: 'TBLRD+*',
    0x000C: 'TBLWT*',
    0x000D: 'TBLWT*+',
    0x000E: 'TBLWT*-',
    0x000F: 'TBLWT+*',
    0x0010: 'RETFIE',
    0x0011: 'RETFIE FAST',
    0x0012: 'RETURN',
    0x0013: 'RETURN FAST',
    0x00FF: 'RESET',
}

# High byte -> mnemonic, for instructions carrying an 8-bit literal.
LITERAL_OPS: Dict[int, str] = {
    0x08: 'SUBLW',
    0x09: 'IORLW',
    0x0A: 'XORLW',
    0x0B: 'ANDLW',
    0x0C: 'RETLW',
    0x0D: 'MULLW',
    0x0E: 'MOVLW',
    0x0F: 'ADDLW',
}

# Base high byte -> mnemonic. Occupies base..base+1, low bit is `a`.
FILE_A_OPS: Dict[int, str] = {
    0x02: 'MULWF',
    0x60: 'CPFSLT',
    0x62: 'CPFSEQ',
    0x64: 'CPFSGT',
    0x66: 'TSTFSZ',
    0x68: 'SETF',
    0x6A: 'CLRF',
    0x6C: 'NEGF',
    0x6E: 'MOVWF',
}

# Base high byte -> mnemonic. Occupies base..base+3, bit 1 is `d`, bit 0 is `a`.
FILE_DA_OPS: Dict[int, str] = {
    0x04: 'DECF',
    0x10: 'IORWF',
    0x14: 'ANDWF',
    0x18: 'XORWF',
    0x1C: 'COMF',
    0x20: 'ADDWFC',
    0x24: 'ADDWF',
    0x28: 'INCF',
    0x2C: 'DECFSZ',
    0x30: 'RRCF',
    0x34: 'RLCF',
    0x38: 'SWAPF',
    0x3C: 'INCFSZ',
    0x40: 'RRNCF',
    0x44: 'RLNCF',
    0x48: 'INFSNZ',
    0x4C: 'DCFSNZ',
    0x50: 'MOVF',
    0x54: 'SUBFWB',
    0x58: 'SUBWFB',
    0x5C: 'SUBWF',
}

# High nibble -> mnemonic. Occupies nibble<<4 .. nibble<<4 | 0x0F.
# Bits 3..1 of the high byte are the bit number, bit 0 is `a`.
#
# BTFSS is 1010 and BTFSC is 1011. Getting these the wrong way round inverts the sense
# of every conditional in a listing, so `tests/test_isa.py` pins them both against the
# datasheet encoding and against a real wait loop from the Harmony firmware.
BIT_OPS: Dict[int, str] = {
    0x7: 'BTG',
    0x8: 'BSF',
    0x9: 'BCF',
    0xA: 'BTFSS',
    0xB: 'BTFSC',
}

# 8-bit signed relative branches.
REL8_OPS: Dict[int, str] = {
    0xE0: 'BZ',
    0xE1: 'BNZ',
    0xE2: 'BC',
    0xE3: 'BNC',
    0xE4: 'BOV',
    0xE5: 'BNOV',
    0xE6: 'BN',
    0xE7: 'BNN',
}


def _check_tables() -> None:
    """Assert no two tables claim the same high byte. Runs at import."""
    claimed: Dict[int, str] = {}

    def claim(hi: int, who: str) -> None:
        if hi in claimed:
            raise AssertionError(
                'PIC18 opcode table conflict at high byte 0x%02X: %s and %s'
                % (hi, claimed[hi], who))
        claimed[hi] = who

    claim(0x01, 'MOVLB')
    for hi, name in LITERAL_OPS.items():
        claim(hi, name)
    for base, name in FILE_A_OPS.items():
        for hi in (base, base + 1):
            claim(hi, name)
    for base, name in FILE_DA_OPS.items():
        for hi in range(base, base + 4):
            claim(hi, name)
    for nib, name in BIT_OPS.items():
        for hi in range((nib << 4), (nib << 4) | 0x10):
            claim(hi, name)
    for hi in range(0xC0, 0xD0):
        claim(hi, 'MOVFF')
    for hi in range(0xD0, 0xD8):
        claim(hi, 'BRA')
    for hi in range(0xD8, 0xE0):
        claim(hi, 'RCALL')
    for hi, name in REL8_OPS.items():
        claim(hi, name)
    for hi in range(0xE8, 0xEC):
        claim(hi, 'extended')
    claim(0xEC, 'CALL')
    claim(0xED, 'CALL')
    claim(0xEE, 'LFSR')
    claim(0xEF, 'GOTO')
    for hi in range(0xF0, 0x100):
        claim(hi, 'second word')
    # 0x00 holds the inherent ops, 0x03 and 0x05..0x07 are MULWF/DECF continuations
    # already claimed above.


_check_tables()


# --------------------------------------------------------------------------------------
# Decoder
# --------------------------------------------------------------------------------------

class Instr(NamedTuple):
    """One decoded instruction.

    `words` is 1 or 2 and is what a linear scan must advance by. `fields` carries the
    decoded operands, keyed by the datasheet's names (`f`, `a`, `d`, `b`, `k`, `s`,
    `src`, `dst`, `target`, `fsr`).
    """
    mnemonic: str
    words: int
    category: str
    fields: Dict[str, int]
    raw: int
    raw2: Optional[int] = None

    @property
    def is_two_word(self) -> bool:
        return self.words == 2


def _signed(value: int, bits: int) -> int:
    sign = 1 << (bits - 1)
    return value - (1 << bits) if value & sign else value


def decode(code: bytes, offset: int, base: int = 0) -> Instr:
    """Decode the instruction at `offset` in `code`.

    `base` is the address the image is mapped at, needed only so relative branch targets
    come out as absolute addresses.
    """
    word = int.from_bytes(code[offset:offset + 2], 'little')
    hi, lo = word >> 8, word & 0xFF
    nxt: Optional[int] = None
    if offset + 4 <= len(code):
        nxt = int.from_bytes(code[offset + 2:offset + 4], 'little')

    def one(mnemonic: str, category: str, **fields: int) -> Instr:
        return Instr(mnemonic, 1, category, fields, word)

    def two(mnemonic: str, category: str, **fields: int) -> Instr:
        return Instr(mnemonic, 2, category, fields, word, nxt)

    if word in INHERENT_OPS:
        return one(INHERENT_OPS[word], INHERENT)

    if hi == 0x01:
        return one('MOVLB', BANKSEL, k=word & 0x0F)

    if hi in LITERAL_OPS:
        return one(LITERAL_OPS[hi], LITERAL, k=lo)

    base_a = hi & 0xFE
    if base_a in FILE_A_OPS:
        return one(FILE_A_OPS[base_a], FILE_A, f=lo, a=hi & 1)

    base_da = hi & 0xFC
    if base_da in FILE_DA_OPS:
        return one(FILE_DA_OPS[base_da], FILE_DA, f=lo, d=(hi >> 1) & 1, a=hi & 1)

    nib = hi >> 4
    if nib in BIT_OPS:
        return one(BIT_OPS[nib], BIT, f=lo, b=(hi >> 1) & 7, a=hi & 1)

    if 0xC0 <= hi <= 0xCF:
        if nxt is None:
            return one('MOVFF', UNKNOWN, f=lo)
        return two('MOVFF', MOVFF, src=((hi & 0x0F) << 8) | lo, dst=nxt & 0x0FFF)

    if 0xD0 <= hi <= 0xDF:
        mnemonic = 'BRA' if hi < 0xD8 else 'RCALL'
        off = _signed(word & 0x07FF, 11)
        return one(mnemonic, REL11, target=base + offset + 2 + 2 * off)

    if hi in REL8_OPS:
        off = _signed(lo, 8)
        return one(REL8_OPS[hi], REL8, target=base + offset + 2 + 2 * off)

    if hi in (0xEC, 0xED, 0xEF):
        if nxt is None or (nxt >> 12) != 0xF:
            return one('???', UNKNOWN)
        mnemonic = 'GOTO' if hi == 0xEF else 'CALL'
        k = ((nxt & 0x0FFF) << 8) | lo
        fields = {'target': k * 2}
        if mnemonic == 'CALL':
            fields['s'] = hi & 1
        return two(mnemonic, ABS20, **fields)

    if hi == 0xEE:
        if nxt is None or (nxt >> 8) != 0xF0:
            return one('???', UNKNOWN)
        return two('LFSR', LFSR, fsr=(word >> 4) & 3,
                   k=((word & 0x0F) << 8) | (nxt & 0xFF))

    if 0xE8 <= hi <= 0xEB:
        # Extended instruction set, only meaningful when the XINST configuration bit is
        # set. Compilers normally leave it off, so these bytes are usually data. Decoded
        # anyway, and flagged, because MOVSF and MOVSS are two words and getting their
        # length wrong desynchronises a linear scan.
        if hi == 0xEA:
            return one('PUSHL', EXTENDED, k=lo)
        if hi in (0xE8, 0xE9):
            mnemonic = 'ADDFSR' if hi == 0xE8 else 'SUBFSR'
            fsr = (lo >> 6) & 3
            if fsr == 3:
                return one('ADDULNK' if hi == 0xE8 else 'SUBULNK', EXTENDED, k=lo & 0x3F)
            return one(mnemonic, EXTENDED, fsr=fsr, k=lo & 0x3F)
        mnemonic = 'MOVSS' if lo & 0x80 else 'MOVSF'
        return two(mnemonic, EXTENDED, src=lo & 0x7F,
                   dst=(nxt & 0x0FFF) if nxt is not None else 0)

    if hi >= 0xF0:
        # Trailing word of a two-word instruction. Reaching this during a linear scan
        # means the scan is misaligned or is walking data.
        return one('NOP', SECOND_WORD)

    return one('???', UNKNOWN)


def iter_instructions(code: bytes, base: int = 0, start: int = 0, end: Optional[int] = None):
    """Linear scan yielding (address, Instr). Advances by each instruction's length."""
    offset = start
    limit = len(code) if end is None else end
    while offset + 2 <= limit:
        instr = decode(code, offset, base)
        yield base + offset, instr
        offset += 2 * instr.words


# --------------------------------------------------------------------------------------
# Special function registers
# --------------------------------------------------------------------------------------

# Standard PIC18 high-end SFR map. Confirm against the PIC18F67J50 datasheet before
# relying on any single entry: this is the least independently verified table here.
SFR: Dict[int, str] = {
    0xF80: 'PORTA', 0xF81: 'PORTB', 0xF82: 'PORTC', 0xF83: 'PORTD', 0xF84: 'PORTE',
    0xF85: 'PORTF', 0xF86: 'PORTG',
    0xF89: 'LATA', 0xF8A: 'LATB', 0xF8B: 'LATC', 0xF8C: 'LATD', 0xF8D: 'LATE',
    0xF8E: 'LATF', 0xF8F: 'LATG',
    0xF92: 'TRISA', 0xF93: 'TRISB', 0xF94: 'TRISC', 0xF95: 'TRISD', 0xF96: 'TRISE',
    0xF97: 'TRISF', 0xF98: 'TRISG',
    0xF9D: 'PIE1', 0xF9E: 'PIR1', 0xF9F: 'IPR1',
    0xFA0: 'PIE2', 0xFA1: 'PIR2', 0xFA2: 'IPR2',
    0xFBA: 'CCP2CON', 0xFBB: 'CCPR2L', 0xFBC: 'CCPR2H',
    0xFBD: 'CCP1CON', 0xFBE: 'CCPR1L', 0xFBF: 'CCPR1H',
    0xFC0: 'ADCON2', 0xFC1: 'ADCON1', 0xFC2: 'ADCON0',
    0xFC3: 'ADRESL', 0xFC4: 'ADRESH',
    0xFC6: 'SSPCON1', 0xFC7: 'SSPSTAT', 0xFC9: 'SSPBUF',
    0xFCA: 'T2CON', 0xFCB: 'PR2', 0xFCC: 'TMR2',
    0xFCD: 'T1CON', 0xFCE: 'TMR1L', 0xFCF: 'TMR1H',
    0xFD0: 'RCON', 0xFD1: 'WDTCON', 0xFD3: 'OSCCON',
    0xFD5: 'T0CON', 0xFD6: 'TMR0L', 0xFD7: 'TMR0H', 0xFD8: 'STATUS',
    0xFD9: 'FSR2L', 0xFDA: 'FSR2H', 0xFDB: 'PLUSW2', 0xFDC: 'PREINC2',
    0xFDD: 'POSTDEC2', 0xFDE: 'POSTINC2', 0xFDF: 'INDF2',
    0xFE0: 'BSR', 0xFE1: 'FSR1L', 0xFE2: 'FSR1H', 0xFE3: 'PLUSW1',
    0xFE4: 'PREINC1', 0xFE5: 'POSTDEC1', 0xFE6: 'POSTINC1', 0xFE7: 'INDF1',
    0xFE8: 'WREG', 0xFE9: 'FSR0L', 0xFEA: 'FSR0H', 0xFEB: 'PLUSW0',
    0xFEC: 'PREINC0', 0xFED: 'POSTDEC0', 0xFEE: 'POSTINC0', 0xFEF: 'INDF0',
    0xFF0: 'INTCON3', 0xFF1: 'INTCON2', 0xFF2: 'INTCON',
    0xFF3: 'PRODL', 0xFF4: 'PRODH', 0xFF5: 'TABLAT',
    0xFF6: 'TBLPTRL', 0xFF7: 'TBLPTRH', 0xFF8: 'TBLPTRU',
    0xFF9: 'PCL', 0xFFA: 'PCLATH', 0xFFB: 'PCLATU',
    0xFFC: 'STKPTR', 0xFFD: 'TOSL', 0xFFE: 'TOSH', 0xFFF: 'TOSU',
}

# In the access bank (a=0), offsets from this value upwards address the SFR page rather
# than bank 0 general purpose registers.
ACCESS_BANK_SFR_START = 0x60


def resolve_file(f: int, a: int, bsr: Optional[int] = None) -> tuple[Optional[int], str]:
    """Resolve a file operand to (data_address, display_name).

    With a=0 the operand is in the access bank: below `ACCESS_BANK_SFR_START` it is a
    bank 0 GPR, at or above it the SFR page. With a=1 the bank comes from BSR, which a
    linear scan can only know if it has seen a `MOVLB`; pass `bsr=None` when unknown.
    """
    if a == 0:
        if f >= ACCESS_BANK_SFR_START:
            addr = 0xF00 | f
            return addr, SFR.get(addr, 'sfr%03X' % addr)
        return f, '0x%02x' % f
    if bsr is None:
        return None, '0x%02x,B' % f
    addr = (bsr << 8) | f
    return addr, '0x%03x' % addr
