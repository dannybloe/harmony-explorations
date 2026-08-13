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

from typing import Dict, NamedTuple, Optional, Tuple

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
        # The second word is `1111 dddd dddd dddd`, so a trailing word outside that is not a
        # MOVFF and claiming two words for it desynchronises everything after it by one word.
        # `CALL`, `GOTO` and `LFSR` below have always tested this and MOVFF did not, which is 14
        # decodes in the Harmony 700 image, 26 in the Harmony One 3.4 image, 4 in the Harmony 525
        # image and 20 in the Harmony 880 image. Same reasoning as `SECOND_WORD` below: reaching
        # this during a linear scan means the scan is misaligned or is walking data.
        if nxt is None or (nxt >> 12) != 0xF:
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
        # Same test as MOVFF, and for the same reason. It used to return a two word instruction
        # with `dst=0` where there is no trailing word at all, which claims a length past the end
        # of the buffer, and to accept any trailing word as the destination.
        if nxt is None or (nxt >> 12) != 0xF:
            return one(mnemonic, UNKNOWN, f=lo)
        return two(mnemonic, EXTENDED, src=lo & 0x7F, dst=nxt & 0x0FFF)

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

# The PIC18F67J50 / PIC18F87J50 SFR map, which is NOT the generic high-end PIC18 map.
#
# It was the generic map until it was checked, and eight of its 93 entries were wrong: this
# family moves the whole CCP and ADC block, so 0xFBD reads as CCP1CON on a PIC18F4550 and is
# CCPR1H here, and 0xFC0 is WDTCON rather than ADCON2. Worse, the USB registers sit at
# 0xF4C to 0xF65 on this family against 0xF66 to 0xF7F on the classic parts, so the entire
# USB block would have been mislabelled as parallel port and CCP registers. Nothing
# published had depended on the wrong names, which was luck rather than process.
#
# Provenance: the gputils 1.5.2 register maps `p18f67j50.inc` and `p18f87j50.inc`, merged.
# Addresses and register names are hardware facts, checkable against the Microchip
# datasheet register file summary for either part.
#
# The two parts share one map, and the 80-pin PIC18F87J50 (the arch 12 candidate) adds
# exactly six registers the 64-pin PIC18F67J50 lacks: PORTH, PORTJ, LATH, LATJ, TRISH and
# TRISJ. They are included here, so a name resolving to one of those six on an arch 14
# image means the address was not an SFR access at all.
SFR: Dict[int, str] = {
    # Parallel master port, and the USB module interleaved with it
    0xF40: 'PMSTAT', 0xF41: 'PMSTATH', 0xF42: 'PMEL', 0xF43: 'PMEH',
    0xF44: 'PMDIN2L', 0xF45: 'PMDIN2H', 0xF46: 'PMDOUT2L', 0xF47: 'PMDOUT2H',
    0xF48: 'PMMODEL', 0xF49: 'PMMODEH', 0xF4A: 'PMCONL', 0xF4B: 'PMCONH',
    0xF4C: 'UEP0', 0xF4D: 'UEP1', 0xF4E: 'UEP2', 0xF4F: 'UEP3',
    0xF50: 'UEP4', 0xF51: 'UEP5', 0xF52: 'UEP6', 0xF53: 'UEP7',
    0xF54: 'UEP8', 0xF55: 'UEP9', 0xF56: 'UEP10', 0xF57: 'UEP11',
    0xF58: 'UEP12', 0xF59: 'UEP13', 0xF5A: 'UEP14', 0xF5B: 'UEP15',
    0xF5C: 'UIE', 0xF5D: 'UEIE', 0xF5E: 'UADDR', 0xF5F: 'UCFG',
    0xF60: 'UFRML', 0xF61: 'UFRMH', 0xF62: 'UIR', 0xF63: 'UEIR',
    0xF64: 'USTAT', 0xF65: 'UCON',
    0xF66: 'PMDIN1L', 0xF67: 'PMDIN1H', 0xF68: 'PMADDRL', 0xF69: 'PMADDRH',
    0xF6A: 'CMSTAT',
    # Second synchronous serial port
    0xF6B: 'SSP2CON2', 0xF6C: 'SSP2CON1', 0xF6D: 'SSP2STAT', 0xF6E: 'SSP2ADD',
    0xF6F: 'SSP2BUF',
    # Capture/compare/PWM 4 and 5, timers 3 and 4, second USART
    0xF70: 'CCP5CON', 0xF71: 'CCPR5L', 0xF72: 'CCPR5H',
    0xF73: 'CCP4CON', 0xF74: 'CCPR4L', 0xF75: 'CCPR4H',
    0xF76: 'T4CON', 0xF77: 'CVRCON', 0xF78: 'TMR4',
    0xF79: 'T3CON', 0xF7A: 'TMR3L', 0xF7B: 'TMR3H',
    0xF7C: 'BAUDCON2', 0xF7D: 'SPBRGH2', 0xF7E: 'BAUDCON1', 0xF7F: 'SPBRGH1',
    # Ports. H and J exist only on the 80-pin part.
    0xF80: 'PORTA', 0xF81: 'PORTB', 0xF82: 'PORTC', 0xF83: 'PORTD', 0xF84: 'PORTE',
    0xF85: 'PORTF', 0xF86: 'PORTG', 0xF87: 'PORTH', 0xF88: 'PORTJ',
    0xF89: 'LATA', 0xF8A: 'LATB', 0xF8B: 'LATC', 0xF8C: 'LATD', 0xF8D: 'LATE',
    0xF8E: 'LATF', 0xF8F: 'LATG', 0xF90: 'LATH', 0xF91: 'LATJ',
    0xF92: 'TRISA', 0xF93: 'TRISB', 0xF94: 'TRISC', 0xF95: 'TRISD', 0xF96: 'TRISE',
    0xF97: 'TRISF', 0xF98: 'TRISG', 0xF99: 'TRISH', 0xF9A: 'TRISJ',
    0xF9B: 'OSCTUNE',
    # Interrupts, flash self programming, first USART
    0xF9C: 'RCSTA2',
    0xF9D: 'PIE1', 0xF9E: 'PIR1', 0xF9F: 'IPR1',
    0xFA0: 'PIE2', 0xFA1: 'PIR2', 0xFA2: 'IPR2',
    0xFA3: 'PIE3', 0xFA4: 'PIR3', 0xFA5: 'IPR3',
    0xFA6: 'EECON1', 0xFA7: 'EECON2',
    0xFA8: 'TXSTA2', 0xFA9: 'TXREG2', 0xFAA: 'RCREG2', 0xFAB: 'SPBRG2',
    0xFAC: 'RCSTA1', 0xFAD: 'TXSTA1', 0xFAE: 'TXREG1', 0xFAF: 'RCREG1',
    0xFB0: 'SPBRG1',
    # Capture/compare/PWM 1 to 3. Not the infrared carrier: that is generated in software
    # at 0x194A4, toggling PORTC bit 2 between measured delays.
    0xFB1: 'CCP3CON', 0xFB2: 'CCPR3L', 0xFB3: 'CCPR3H',
    0xFB4: 'ECCP3DEL', 0xFB5: 'ECCP3AS',
    0xFB6: 'CCP2CON', 0xFB7: 'CCPR2L', 0xFB8: 'CCPR2H',
    0xFB9: 'ECCP2DEL', 0xFBA: 'ECCP2AS',
    0xFBB: 'CCP1CON', 0xFBC: 'CCPR1L', 0xFBD: 'CCPR1H',
    0xFBE: 'ECCP1DEL', 0xFBF: 'ECCP1AS',
    # Watchdog, analogue, first synchronous serial port. The config flash of the 600 and
    # 700 is read over SSP1.
    0xFC0: 'WDTCON', 0xFC1: 'ADCON1', 0xFC2: 'ADCON0',
    0xFC3: 'ADRESL', 0xFC4: 'ADRESH',
    0xFC5: 'SSP1CON2', 0xFC6: 'SSP1CON1', 0xFC7: 'SSP1STAT', 0xFC8: 'SSP1ADD',
    0xFC9: 'SSP1BUF',
    # Timers 1 and 2, comparators, oscillator
    0xFCA: 'T2CON', 0xFCB: 'PR2', 0xFCC: 'TMR2',
    0xFCD: 'T1CON', 0xFCE: 'TMR1L', 0xFCF: 'TMR1H',
    0xFD0: 'RCON', 0xFD1: 'CM2CON', 0xFD2: 'CM1CON', 0xFD3: 'OSCCON',
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

# Ten SFR addresses carry a second register, selected by ADSHR. Setting WDTCON<4> swaps
# the shadow register in at the same address; clearing it swaps the primary back. So a
# disassembly that ignores the bit reports the wrong register for these ten addresses.
#
# The firmware proves the mechanism rather than merely using it. In the 700 2.8 image at
# 0x1B8BC, initialisation writes 0xFC1 and 0xFC2 twice with different values, once on each
# side of `BSF WDTCON,4`, and the shadow values (0xF8 and 0xFF, every pin digital) are
# exactly what ANCON0 and ANCON1 are set to at reset while ADCON0 and ADCON1 get plausible
# converter settings:
#
#     1b8bc: CLRF  ADCON0        1b8c2: BSF   WDTCON,4
#     1b8be: MOVLW 0x86          1b8c4: MOVLW 0xf8
#     1b8c0: MOVWF ADCON1        1b8c6: MOVWF ANCON0
#                                1b8c8: SETF  ANCON1
#                                1b8cc: BCF   WDTCON,4
#
# ANCON0 and ANCON1 are therefore confirmed here. The other eight are the remaining
# alias pairs in the same register map, unexercised by any image read so far.
ADSHR_REGISTER = 0xFC0  # WDTCON
ADSHR_BIT = 4

SFR_SHADOW: Dict[int, str] = {
    0xFC1: 'ANCON0',    # confirmed from the 700 image
    0xFC2: 'ANCON1',    # confirmed from the 700 image
    0xFCB: 'MEMCON',    # 80-pin part only, the external memory bus of the arch 12 remote
    0xFCC: 'PADCFG1',
    0xFCD: 'ODCON3',
    0xFCE: 'ODCON2',
    0xFCF: 'ODCON1',
    0xFD1: 'CM2CON1',
    0xFD2: 'CM1CON1',
    0xFD3: 'REFOCON',
}

# In the access bank (a=0), offsets from this value upwards address the SFR page rather
# than bank 0 general purpose registers.
ACCESS_BANK_SFR_START = 0x60

# Where the SFRs actually begin on this family. The 67J50 and 87J50 put 4 KiB of general
# purpose registers below `0xF40`, so bank 15 is half RAM, and `PMSTAT` at `0xF40` is the
# lowest named register in Microchip's own header.
#
# This constant exists because a `MOVFF` carries a twelve bit absolute address, and calling
# everything at `0xF00` and above an SFR turned ordinary bank 15 variables into `sfrF28` in
# the listings. The interpreter's own stack and its instruction registers live there, so the
# mislabel made interpreter state read as hardware. Same family of error as the generic SFR
# map recorded in `docs/findings.md` section 18, caught the same way: against the header.
SFR_PAGE_START = 0xF40


# The PIC18F4550 map, which the Harmony 525 needs and which shares 74 of its 139 entries with
# the map above and disagrees about the other 65. This is not a refinement, it is a different
# part: the USB block sits at `0xF60` to `0xF7F` where the 67J50 family puts it at `0xF4C` to
# `0xF65`, the whole CCP block moves, and `0xFC0` is `ADCON2` here against `WDTCON` there, so
# there is no `ADSHR` shadow set on this part at all.
#
# The docstring above already named this hazard, `0xFBD` reading as `CCP1CON` on a 4550 and
# `CCPR1H` on a 67J50, and it went from a note to a problem the moment an arch 9 firmware
# existed. The infrared carrier setup at `0x07680` writes `0x0C` to `0xFBD`, which is PWM mode
# in `CCP1CON` and nonsense in `CCPR1H`.
#
# Provenance: gputils 1.5.2 `p18f4550.inc`. Where that header names a sixteen bit pair by its
# low address with no suffix, the L form above is kept, so listings read the same on both parts.
#
# `SFR_PAGE_START` differs too: this part has 2 KiB of general purpose registers and its bank 15
# is SFRs from `0xF60` up, so `0xF00` to `0xF5F` is unimplemented rather than RAM.
SFR_4550: Dict[int, str] = {
    0xF62: 'SPPDATA', 0xF63: 'SPPCFG', 0xF64: 'SPPEPS', 0xF65: 'SPPCON',
    0xF66: 'UFRM', 0xF67: 'UFRMH', 0xF68: 'UIR', 0xF69: 'UIE',
    0xF6A: 'UEIR', 0xF6B: 'UEIE', 0xF6C: 'USTAT', 0xF6D: 'UCON',
    0xF6E: 'UADDR', 0xF6F: 'UCFG', 0xF70: 'UEP0', 0xF71: 'UEP1',
    0xF72: 'UEP2', 0xF73: 'UEP3', 0xF74: 'UEP4', 0xF75: 'UEP5',
    0xF76: 'UEP6', 0xF77: 'UEP7', 0xF78: 'UEP8', 0xF79: 'UEP9',
    0xF7A: 'UEP10', 0xF7B: 'UEP11', 0xF7C: 'UEP12', 0xF7D: 'UEP13',
    0xF7E: 'UEP14', 0xF7F: 'UEP15', 0xF80: 'PORTA', 0xF81: 'PORTB',
    0xF82: 'PORTC', 0xF83: 'PORTD', 0xF84: 'PORTE', 0xF89: 'LATA',
    0xF8A: 'LATB', 0xF8B: 'LATC', 0xF8C: 'LATD', 0xF8D: 'LATE',
    0xF92: 'DDRA', 0xF93: 'DDRB', 0xF94: 'DDRC', 0xF95: 'DDRD',
    0xF96: 'DDRE', 0xF9B: 'OSCTUNE', 0xF9D: 'PIE1', 0xF9E: 'PIR1',
    0xF9F: 'IPR1', 0xFA0: 'PIE2', 0xFA1: 'PIR2', 0xFA2: 'IPR2',
    0xFA6: 'EECON1', 0xFA7: 'EECON2', 0xFA8: 'EEDATA', 0xFA9: 'EEADR',
    0xFAB: 'RCSTA', 0xFAC: 'TXSTA', 0xFAD: 'TXREG', 0xFAE: 'RCREG',
    0xFAF: 'SPBRG', 0xFB0: 'SPBRGH', 0xFB1: 'T3CON', 0xFB2: 'TMR3',
    0xFB3: 'TMR3H', 0xFB4: 'CMCON', 0xFB5: 'CVRCON', 0xFB6: 'CCP1AS',
    0xFB7: 'CCP1DEL', 0xFB8: 'BAUDCON', 0xFBA: 'CCP2CON', 0xFBB: 'CCPR2',
    0xFBC: 'CCPR2H', 0xFBD: 'CCP1CON', 0xFBE: 'CCPR1', 0xFBF: 'CCPR1H',
    0xFC0: 'ADCON2', 0xFC1: 'ADCON1', 0xFC2: 'ADCON0', 0xFC3: 'ADRESL',
    0xFC4: 'ADRESH', 0xFC5: 'SSPCON2', 0xFC6: 'SSPCON1', 0xFC7: 'SSPSTAT',
    0xFC8: 'SSPADD', 0xFC9: 'SSPBUF', 0xFCA: 'T2CON', 0xFCB: 'PR2',
    0xFCC: 'TMR2', 0xFCD: 'T1CON', 0xFCE: 'TMR1L', 0xFCF: 'TMR1H',
    0xFD0: 'RCON', 0xFD1: 'WDTCON', 0xFD2: 'HLVDCON', 0xFD3: 'OSCCON',
    0xFD5: 'T0CON', 0xFD6: 'TMR0L', 0xFD7: 'TMR0H', 0xFD8: 'STATUS',
    0xFD9: 'FSR2L', 0xFDA: 'FSR2H', 0xFDB: 'PLUSW2', 0xFDC: 'PREINC2',
    0xFDD: 'POSTDEC2', 0xFDE: 'POSTINC2', 0xFDF: 'INDF2', 0xFE0: 'BSR',
    0xFE1: 'FSR1L', 0xFE2: 'FSR1H', 0xFE3: 'PLUSW1', 0xFE4: 'PREINC1',
    0xFE5: 'POSTDEC1', 0xFE6: 'POSTINC1', 0xFE7: 'INDF1', 0xFE8: 'WREG',
    0xFE9: 'FSR0L', 0xFEA: 'FSR0H', 0xFEB: 'PLUSW0', 0xFEC: 'PREINC0',
    0xFED: 'POSTDEC0', 0xFEE: 'POSTINC0', 0xFEF: 'INDF0', 0xFF0: 'INTCON3',
    0xFF1: 'INTCON2', 0xFF2: 'INTCON', 0xFF3: 'PRODL', 0xFF4: 'PRODH',
    0xFF5: 'TABLAT', 0xFF6: 'TBLPTRL', 0xFF7: 'TBLPTRH', 0xFF8: 'TBLPTRU',
    0xFF9: 'PCL', 0xFFA: 'PCLATH', 0xFFB: 'PCLATU', 0xFFC: 'STKPTR',
    0xFFD: 'TOSL', 0xFFE: 'TOSH', 0xFFF: 'TOSU',
}

# Named so a caller states which part it is reading, because the default silently produced a
# readable and wrong listing on the 525. `docs/findings.md` section 80.
PARTS: Dict[str, Tuple[Dict[int, str], int]] = {
    '67j50': (SFR, SFR_PAGE_START),
    '87j50': (SFR, SFR_PAGE_START),
    '4550': (SFR_4550, 0xF60),
}
DEFAULT_PART = '67j50'


def sfr_name(addr: int, adshr: bool = False, part: str = DEFAULT_PART) -> str:
    """Name an SFR address, honouring the ADSHR shadow set when that bit is set.

    Below the part's SFR page there is no SFR to name, so the address is reported as the general
    purpose register it is rather than as a peripheral it is not.

    `part` selects the register map. It defaults to the 67J50 family because that is what arch 12
    and arch 14 are; arch 9 is a `PIC18F4550` and 65 of 139 addresses differ, so a listing taken
    with the wrong map is readable and wrong. `PARTS` holds the names this accepts.
    """
    names, page_start = PARTS[part]
    # ADSHR is a 67J50 family bit. The 4550 has no shadow set, and 0xFC0 is ADCON2 there, so
    # honouring the flag on that part would name a register the instruction cannot reach.
    if adshr and names is SFR and addr in SFR_SHADOW:
        return SFR_SHADOW[addr]
    if addr in names:
        return names[addr]
    return ('gpr%03X' if addr < page_start else 'sfr%03X') % addr


def resolve_file(f: int, a: int, bsr: Optional[int] = None,
                 adshr: bool = False, part: str = DEFAULT_PART) -> tuple[Optional[int], str]:
    """Resolve a file operand to (data_address, display_name).

    With a=0 the operand is in the access bank: below `ACCESS_BANK_SFR_START` it is a
    bank 0 GPR, at or above it the SFR page. With a=1 the bank comes from BSR, which a
    linear scan can only know if it has seen a `MOVLB`; pass `bsr=None` when unknown.

    `adshr` names the shadow register at the ten shared addresses. The address returned is
    the same either way, since the two views share it.

    **A banked access to the SFR page is named too**, and it was not. With a known BSR this
    returned a bare `0x%03x`, so the one part of the register map a listing cannot reach any other
    way was the one part it never named: on the 67J50 family the USB block at `0xF40` to `0xF5F`
    sits **below** the access bank, so banked or `MOVFF` is the only route to it, and section 18's
    headline correction is exactly that those registers are there. 27 accesses in the Harmony 700
    image and 25 in the Harmony One 3.4 image printed as `0xf5e` where `sfr_name` already knew
    `UADDR`. Zero in the Harmony 525 image, whose PIC18F4550 page starts at `0xF60` and is
    therefore wholly inside the access bank, which is also why nothing noticed.
    """
    if a == 0:
        if f >= ACCESS_BANK_SFR_START:
            addr = 0xF00 | f
            return addr, sfr_name(addr, adshr, part)
        return f, '0x%02x' % f
    if bsr is None:
        return None, '0x%02x,B' % f
    addr = (bsr << 8) | f
    if addr >= PARTS[part][1]:
        return addr, sfr_name(addr, adshr, part)
    return addr, '0x%03x' % addr
