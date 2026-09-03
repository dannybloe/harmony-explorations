"""
Who can erase a Harmony One's external flash, and the answer is one USB command and nothing else.

`docs/findings.md` section 243. The question arrived from the bench rather than from the code: a
64 KiB block of the spare Harmony One's configuration region was found erased with no erase in any
of our own logs, and the hypothesis on the table was the remote doing it to itself, since section
47's log area writer lives in that region and the remote had been holding a configuration it called
corrupt.

The image answers it. The external flash programmer is a library in internal flash reached through
five one instruction gates, section 191, and the application wraps three of those gates in three
routines that differ only in how many data bytes they hand over:

| wrapper | gate | data bytes | so it is |
|---|---|---|---|
| `0x2DE7E` | `0x1E010` | one, from `0x311` | program a byte |
| `0x2DEA0` | `0x1E012` | three, from `0x312` | program three |
| `0x2DECA` | `0x1E00E` | none, address only | **erase the sector** |

The erase wrapper has exactly one caller in the whole application, and that caller reads its address
off a USB report three bytes at a time before it runs. So the application erases external flash only
when a host asks it to, and every erase this project has seen on a Harmony One is its own.

**The claim is bounded by what a cross reference can see.** `trace.xrefs` finds direct transfers, so
a computed jump through `PCL` would be invisible to it. The last test here is the control for that:
the gate's word address appears nowhere in the image as the little endian literal such a jump would
have to load.

One image, the Harmony One 3.4 application, because it is the only arch 12 application firmware in
the lab and the claim is about that architecture's own configuration medium. Nothing here is asserted
of arch 14, where the configuration is copied to internal flash instead.
"""
import unittest

import lab

from harmony.pic18 import isa, trace

ARCH12_BASE = 0x20000

#: The gates into the internal programmer library, section 191.
ERASE_GATE = 0x1E00E
PROGRAM_GATES = (0x1E010, 0x1E012)

#: The application's wrapper around each of those three gates, and the instruction inside each
#: wrapper that calls its gate. A wrapper is four instructions of setup, so the two differ.
ERASE_WRAPPER, ERASE_GATE_CALL = 0x2DECA, 0x2DEDA
PROGRAM_WRAPPERS = (0x2DE7E, 0x2DEA0)
PROGRAM_GATE_CALLS = (0x2DE92, 0x2DEBC)

#: The one caller of the erase wrapper, inside the USB erase command's handler.
ERASE_CALLER = 0x265FC
#: Where the two program wrappers are called from, which is the negative control.
PROGRAM_CALLERS = (0x2B862, 0x2B87E)

#: The routine every USB handler calls to take the next byte out of the report.
REPORT_PARSER = 0x20380
#: The three calls to it that fill the erase request's address, and the byte each one stores.
ADDRESS_FETCHES = ((0x26584, 0x287), (0x26590, 0x286), (0x2659C, 0x285))
#: Where the handler then copies those three bytes for the programmer, low byte first.
PROGRAMMER_ADDRESS = 0x19C
#: And the instruction that starts that copy.
ADDRESS_HANDOFF = 0x265CE


def _image():
    lab.require('one34_code')
    return lab.load('one34_code'), ARCH12_BASE


class TheOnlyRouteToAnExternalEraseIsTheUsbCommand(unittest.TestCase):
    """The claim this file exists for, and the reason it is a test rather than a note."""

    def test_the_erase_wrapper_has_exactly_one_caller(self):
        code, base = _image()
        hits = trace.xrefs(code, base, [ERASE_WRAPPER])[ERASE_WRAPPER]
        self.assertEqual([(x.addr, x.mnemonic) for x in hits], [(ERASE_CALLER, 'CALL')])

    def test_the_erase_gate_is_reached_only_from_inside_that_wrapper(self):
        """So a second wrapper around the same gate would fail this, not just a second caller."""
        code, base = _image()
        hits = trace.xrefs(code, base, [ERASE_GATE])[ERASE_GATE]
        self.assertEqual([x.addr for x in hits], [ERASE_GATE_CALL])
        self.assertLess(ERASE_WRAPPER, ERASE_GATE_CALL, 'the call sits inside the wrapper')
        self.assertLess(ERASE_GATE_CALL, ERASE_WRAPPER + 0x14, 'and within its four instructions')

    def test_that_caller_reads_its_address_out_of_a_usb_report(self):
        """Three fetches from the report parser, into the three bytes the erase then uses.

        This is what makes the single caller a **host** command rather than housekeeping that
        happens to erase: the address is not computed anywhere, it is taken off the wire a byte at
        a time, top byte first, and handed to the programmer unchanged.
        """
        code, base = _image()
        for at, stored in ADDRESS_FETCHES:
            call = isa.decode(code, at - base, base)
            self.assertEqual((call.mnemonic, call.fields['target']), ('CALL', REPORT_PARSER),
                             'a parser call at 0x%05X' % at)
            # The instruction two words on is the MOVWF that banks the byte it returned.
            store = isa.decode(code, at + 6 - base, base)
            self.assertEqual(store.mnemonic, 'MOVWF')
            where, _ = isa.resolve_file(store.fields['f'], store.fields['a'], bsr=0x2)
            self.assertEqual(where, stored)
        # And the handoff, which is what connects those three bytes to the programmer's arguments.
        for step, byte in enumerate((0x285, 0x286, 0x287)):
            move = isa.decode(code, ADDRESS_HANDOFF + 4 * step - base, base)
            self.assertEqual(move.mnemonic, 'MOVFF')
            self.assertEqual((move.fields['src'], move.fields['dst']),
                             (byte, PROGRAMMER_ADDRESS + step))

    def test_the_program_gates_are_a_different_pair_of_wrappers(self):
        """The negative that makes the erase claim mean something.

        If every gate had one caller in one routine, the finding would be about the library's shape
        rather than about who can erase. The program gates have their own wrappers, called from
        somewhere else entirely, and the erase handler calls neither.
        """
        code, base = _image()
        gate_hits = trace.xrefs(code, base, PROGRAM_GATES)
        self.assertEqual([[x.addr for x in gate_hits[g]] for g in PROGRAM_GATES],
                         [[call] for call in PROGRAM_GATE_CALLS])
        wrapper_hits = trace.xrefs(code, base, PROGRAM_WRAPPERS)
        self.assertEqual([[x.addr for x in wrapper_hits[w]] for w in PROGRAM_WRAPPERS],
                         [[caller] for caller in PROGRAM_CALLERS])
        self.assertNotIn(ERASE_CALLER, [x.addr for w in PROGRAM_WRAPPERS for x in wrapper_hits[w]])

    def test_the_three_wrappers_share_one_address_handoff_byte_for_byte(self):
        """Why the three are one mechanism, asserted as equality rather than read three times.

        Each wrapper guards the bus, copies the same three address bytes into the library's argument
        slots, calls its gate and unguards. The run in the middle is identical in all three, which
        is what makes the data byte count the only difference between programming and erasing.
        """
        code, base = _image()
        run = slice(ERASE_WRAPPER + 4 - base, ERASE_WRAPPER + 16 - base)
        for wrapper in PROGRAM_WRAPPERS:
            self.assertEqual(code[wrapper + 4 - base:wrapper + 16 - base], code[run],
                             'wrapper 0x%05X copies the address the same way' % wrapper)

    def test_no_jump_table_in_the_image_holds_the_erase_gate(self):
        """The control for what a cross reference cannot see.

        A computed jump loads a word address into `PCLATU`, `PCLATH` and `PCL`, so such a table
        would carry the gate's word address as three consecutive bytes. It appears nowhere. The
        reversed order does appear twice and both are ordinary instructions, asserted rather than
        argued, since a coincidence dismissed by eye is not a control.
        """
        code, base = _image()
        word = ERASE_GATE >> 1
        low_first = bytes((word & 0xFF, (word >> 8) & 0xFF, (word >> 16) & 0xFF))
        self.assertEqual(code.find(low_first), -1, 'no table entry for the gate')
        high_first = bytes(reversed(low_first))
        at = code.find(high_first)
        self.assertNotEqual(at, -1, 'the reversed form is expected to occur, as code')
        while at != -1:
            # It falls inside a MOVFF, whose second word carries the two bytes that look like an
            # address. Decoding from the instruction boundary two bytes back proves it.
            instr = isa.decode(code, at - 2, base)
            self.assertEqual(instr.mnemonic, 'MOVFF', 'at 0x%05X' % (base + at))
            at = code.find(high_first, at + 1)


if __name__ == '__main__':
    unittest.main()
