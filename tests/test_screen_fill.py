"""
Screen opcode 1 is a filled rectangle, as the firmware implements it. `docs/findings.md` section 425.

Four images, two architectures: the Harmony One 3.4, and the Harmony 600 0.2, the bench Harmony 650's 0.2 and the
Harmony 700 2.8. Per image the handler the screen interpreter's opcode chain sends opcode 1 to is decoded and held to
one shape: four operand bytes read into four consecutive variables, the second added into the fourth, a sixteen bit
colour read, and a loop calling one row routine per row from the second to that sum; and the row routine clips to the
display's own width and height, stated as literals in it. Everything is asserted against instructions decoded through
`isa.py`, so a wrong opcode table fails these too.

**The control** is opcode 2's handler, the picture draw, held to the same shape: it must not fit, or the shape says
nothing about which handler is a fill. And the Harmony One's page draw is checked to call no screen fill before it
runs a page's program, which is what says a pixel a page leaves undrawn keeps what the screen held before.
"""
import unittest

import lab
from harmony.pic18 import chains, isa, trace

# image -> its load address, the screen opcode chain's first XORLW, and what section 425 read off it. `colour` is
# the routine the handler reads its colour with, which on every image calls one fetch twice and stores each byte,
# read in the listing and not asserted beyond its address here.
IMAGES = {
    'one34_code': {
        'base': 0x20000, 'chain': 0x295E6, 'handler': 0x290AA, 'reader': 0x2B8F8, 'colour': 0x2B90A,
        'operands': [0xD1F, 0xD20, 0xD21, 0xD22], 'row': 0x2294C, 'width': 176, 'height': 220,
    },
    'h600_code_complete': {
        'base': 0x9000, 'chain': 0x16E44, 'handler': 0x16A28, 'reader': 0x17ED4, 'colour': 0x17EEC,
        'operands': [0xD2A, 0xD2B, 0xD2C, 0xD2D], 'row': 0x12DA8, 'width': 128, 'height': 128,
    },
    'h650_bench_code': {
        'base': 0x9000, 'chain': 0x16E44, 'handler': 0x16A28, 'reader': 0x17ED4, 'colour': 0x17EEC,
        'operands': [0xD2A, 0xD2B, 0xD2C, 0xD2D], 'row': 0x12DA8, 'width': 128, 'height': 128,
    },
    'h700_code': {
        'base': 0x9000, 'chain': 0x187A8, 'handler': 0x1838C, 'reader': 0x10A46, 'colour': 0x10A5E,
        'operands': [0xD2A, 0xD2B, 0xD2C, 0xD2D], 'row': 0x0DF20, 'width': 128, 'height': 128,
    },
}

#: The opcodes this file reads, `SCREEN_FILL` and `SCREEN_DRAW_IMAGE` in `packages/codec/src/screen.ts`.
FILL = 1
DRAW = 2

CALLS = ('CALL', 'RCALL')


def window(code, base, start, count):
    """`count` decoded instructions from `start`, with their addresses."""
    out = []
    offset = start - base
    for _ in range(count):
        instr = isa.decode(code, offset, base)
        out.append((base + offset, instr))
        offset += 2 * instr.words
    return out


def handler_of(code, base, chain, opcode):
    """Where the opcode chain sends `opcode`: the call its case body makes first."""
    case = chains.chain_table(code, base, chain)[opcode]
    _, first = window(code, base, case, 1)[0]
    if first.mnemonic not in CALLS:
        return None
    return first.fields['target']


def fill_shape(code, base, handler):
    """The fill handler's shape read off `handler`, or None where it does not have it.

    Returns the byte reader, the four operand variables in the order read, the row routine and the sixteen bit
    reader. Bank tracking is the `MOVLB` the window itself holds, which is all these handlers use.
    """
    bsr = None
    reads = []          # (reader, variable) in order
    pending = None      # the reader just called, waiting for its MOVWF
    added = None        # (source, destination) of the first ADDWF into a file register
    calls = []
    looped = False
    for at, instr in window(code, base, handler, 48):
        m = instr.mnemonic
        if m == 'MOVLB':
            bsr = instr.fields['k']
        elif m in CALLS:
            calls.append(instr.fields['target'])
            pending = instr.fields['target']
        elif m == 'MOVWF' and pending is not None and bsr is not None and len(reads) < 4:
            reads.append((pending, (bsr << 8) | instr.fields['f']))
            pending = None
        elif m == 'ADDWF' and added is None and bsr is not None and instr.fields.get('d') == 1:
            added = (bsr << 8) | instr.fields['f']
        elif m == 'BRA' and instr.fields['target'] < at:
            looped = True
        elif m == 'RETURN':
            break
    if len(reads) != 4 or len({reader for reader, _ in reads}) != 1:
        return None
    variables = [variable for _, variable in reads]
    if variables != list(range(variables[0], variables[0] + 4)) or added != variables[3] or not looped:
        return None
    reader = reads[0][0]
    others = [target for target in calls if target != reader]
    if len(others) < 2:
        return None
    return {'reader': reader, 'operands': variables, 'u16': others[0], 'row': others[-1]}


class TestOpcodeOneIsAFilledRectangle(unittest.TestCase):
    """Every test states its population up front, the four images, so a partial lab skips it whole."""

    def test_the_chain_sends_opcode_1_to_the_recorded_handler_on_every_image(self):
        lab.require(*IMAGES)
        for name, at in IMAGES.items():
            with self.subTest(image=name):
                self.assertEqual(handler_of(lab.load(name), at['base'], at['chain'], FILL), at['handler'])

    def test_the_handler_reads_four_bytes_and_a_colour_and_calls_one_routine_per_row(self):
        lab.require(*IMAGES)
        for name, at in IMAGES.items():
            with self.subTest(image=name):
                shape = fill_shape(lab.load(name), at['base'], at['handler'])
                self.assertIsNotNone(shape)
                self.assertEqual(shape['reader'], at['reader'])
                self.assertEqual(shape['u16'], at['colour'])
                self.assertEqual(shape['operands'], at['operands'])
                self.assertEqual(shape['row'], at['row'])

    def test_the_row_routine_clips_to_the_display_it_was_written_for(self):
        """The width and the height are literals in the row routine: 176 and 220 on the One, 128 and 128 on arch 14."""
        lab.require(*IMAGES)
        for name, at in IMAGES.items():
            with self.subTest(image=name):
                literals = [i.fields['k'] for _, i in window(lab.load(name), at['base'], at['row'], 24) if i.mnemonic == 'MOVLW']
                self.assertEqual(literals[:3], [at['width'], at['width'], at['height']])

    def test_the_ones_row_routine_writes_the_colour_twice_per_pixel_to_the_panel(self):
        """Two table writes, the colour's two bytes, inside a loop counted down in W, after the window is set."""
        lab.require('one34_code')
        at = IMAGES['one34_code']
        body = window(lab.load('one34_code'), at['base'], at['row'], 60)
        mnemonics = [i.mnemonic for _, i in body]
        loop = mnemonics.index('DECFSZ')
        self.assertEqual(mnemonics[loop - 4:loop].count('TBLWT*'), 2)

    def test_control_the_picture_draw_does_not_have_the_fill_shape(self):
        """Opcode 2 on the same images: if this fitted, the shape would not tell a fill from anything else."""
        lab.require(*IMAGES)
        for name, at in IMAGES.items():
            with self.subTest(image=name):
                code = lab.load(name)
                draw = handler_of(code, at['base'], at['chain'], DRAW)
                self.assertIsNotNone(draw)
                self.assertIsNone(fill_shape(code, at['base'], draw))


@unittest.skipUnless(lab.path('one34_code'), 'needs the Harmony One 3.4 image in the lab')
class TestTheOnesPageDrawClearsNothing(unittest.TestCase):
    """A page's program is run with nothing filled before it, so an undrawn pixel shows the screen before."""

    BASE = 0x20000
    #: The routine that draws a mode page: two seeks into the page record, then the interpreter.
    PAGE_DRAW = 0x28166
    INTERPRETER = 0x295AC
    #: The whole screen fill, 220 rows of 176, and its two wrappers: black and white.
    SCREEN_FILL = 0x22E10
    BLACK = 0x22E44
    WHITE = 0x22E4E

    def test_the_page_draw_calls_the_interpreter_and_no_fill(self):
        code = lab.load('one34_code')
        called = []
        for _, instr in window(code, self.BASE, self.PAGE_DRAW, 80):
            if instr.mnemonic in CALLS:
                called.append(instr.fields['target'])
            if instr.mnemonic == 'RETURN':
                break
        self.assertEqual(called[-1], self.INTERPRETER)
        for fill in (self.SCREEN_FILL, self.BLACK, self.WHITE, IMAGES['one34_code']['row']):
            self.assertNotIn(fill, called)

    def test_the_whole_screen_fill_has_three_direct_callers_and_two_wrappers_and_no_other_reference(self):
        """Direct references only: a computed jump is invisible to `xrefs`, which section 425 says.

        Every reference of any kind, so a third wrapper's `GOTO` would fail this: three calls, and the two wrappers'
        jumps, at `0x22E4A` inside the black one and `0x22E54` inside the white one. The black wrapper is called once,
        at `0x28A4A`, before the main loop; that it is start up is the reading, not asserted here.
        """
        code = lab.load('one34_code')
        hits = trace.xrefs(code, self.BASE, [self.SCREEN_FILL, self.BLACK, self.WHITE])
        callers = lambda target: sorted(x.addr for x in hits[target] if x.mnemonic in CALLS)
        self.assertEqual(sorted((x.addr, x.mnemonic) for x in hits[self.SCREEN_FILL]), [
            (0x20B52, 'CALL'), (0x22E4A, 'GOTO'), (0x22E54, 'GOTO'), (0x2886A, 'CALL'), (0x2894C, 'CALL'),
        ])
        self.assertEqual(callers(self.BLACK), [0x28A4A])
        self.assertEqual(callers(self.WHITE), [])


if __name__ == '__main__':
    unittest.main()
