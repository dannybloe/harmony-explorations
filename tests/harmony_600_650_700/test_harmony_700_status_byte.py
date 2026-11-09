"""
The update status byte's handler and the restart in the Harmony 700's 2.5 and 2.8 applications,
sections 297 and 298.

Logitech's template for skin 66 sets data memory `0x100` with `A3 06 00 02` whether the remote is in
safe mode or running normally, then restarts it with the escape's `0x02`, and at the restart the safe
mode image installs whatever is staged when the byte is 2. Section 295 read only the safe mode image.
These are the two applications, 2.5 as read off the unit's own internal flash while it ran it and 2.8
as Logitech's image: the `WRITE_MISC` selector chain sends 6 to an arm that moves the packet's two
bytes into `0x103` and `0x102` and calls a routine storing `0x103` into `0x100` when `0x102` is 0, and
the escape chain sends 2 to an arm that sets a flag whose reader puts the top level mode to 3, which
waits and executes `RESET`. That reading is what lets the staging and reinstall rails admit either
build while it runs, `STATUS_BYTE_READ_ON_APPLICATION`.

The two builds carry the same code at shifted addresses, so one table of addresses per build drives
every assertion, and a claim that holds on one and not the other fails by name.
"""
import unittest

import lab
from harmony.firmware import parse_header
from harmony.pic18 import chains, isa, trace

BASE = 0x9000

# Per build: where each piece sits. The 2.5 escape handler is at 0xBCBC, which is the address section
# 282 gives on the 0.2 builds of the Harmony 600 and 650.
BUILDS = {
    '2.5': dict(misc_chain=0x0C314, arm=0x0C364, store=0x19868,
                escape=0x0BCBC, escape_chain=0x0BCDA, flag_arm=0x0BCFC, flag=0x1FF,
                flag_reader=0x15398, mode=0x754, mode_chain=0x153E0, reset_block=0x15470,
                reset=0x1548E, clearing=0x19750, startup=0x19748, startup_caller=0x1514A),
    '2.8': dict(misc_chain=0x0C3AA, arm=0x0C400, store=0x1AB96,
                escape=0x0BD52, escape_chain=0x0BD70, flag_arm=0x0BD92, flag=0x6FF,
                flag_reader=0x16336, mode=0x3A5, mode_chain=0x1637E, reset_block=0x1640E,
                reset=0x1642C, clearing=0x1AA7E, startup=0x1AA76, startup_caller=0x160D2),
}


SAMPLES = ('h700_posthd_internal_fe', 'h700_posthd_internal_ff', 'h700_code')


def image(build):
    """The application image from its load address, 2.5 off the unit and 2.8 out of the package."""
    if build == '2.5':
        program = lab.load('h700_posthd_internal_fe') + lab.load('h700_posthd_internal_ff')
        return program[BASE:BASE + 71552]
    return lab.load('h700_code')


def at(code, address):
    return isa.decode(code, address - BASE, BASE)


def banked(code, movlb, instr):
    """The data address a banked instruction reaches, given the MOVLB that set its bank."""
    return (at(code, movlb).fields['k'] << 8) | at(code, instr).fields['f']


class TheApplicationStoresTheStatusByteAndRestarts(unittest.TestCase):

    def setUp(self):
        lab.require(*SAMPLES)
        self.images = {build: image(build) for build in BUILDS}

    def each(self):
        """Every build, its image and its addresses; the caller wraps each in its own subTest."""
        return [(build, self.images[build], where) for build, where in BUILDS.items()]

    def test_each_image_is_the_build_it_is_named_for(self):
        for build, code, _ in self.each():
            with self.subTest(build=build):
                self.assertEqual(parse_header(code).version, build)

    def test_selector_6_goes_to_the_arm(self):
        for build, code, w in self.each():
            with self.subTest(build=build):
                self.assertEqual(chains.chain_table(code, BASE, w['misc_chain']).get(6), w['arm'])

    def test_the_arm_moves_the_two_bytes_and_calls_the_store(self):
        for build, code, w in self.each():
            with self.subTest(build=build):
                first, second, call = at(code, w['arm']), at(code, w['arm'] + 4), at(code, w['arm'] + 8)
                self.assertEqual((first.mnemonic, first.fields['src'], first.fields['dst']), ('MOVFF', 0xD5E, 0x103))
                self.assertEqual((second.mnemonic, second.fields['src'], second.fields['dst']), ('MOVFF', 0xD5F, 0x102))
                self.assertEqual((call.mnemonic, call.fields['target']), ('CALL', w['store']))

    def test_the_store_puts_the_value_into_0x100_when_the_index_is_0(self):
        for build, code, w in self.each():
            with self.subTest(build=build):
                steps = [at(code, w['store'] + d) for d in (0, 2, 4, 6, 10)]
                self.assertEqual([s.mnemonic for s in steps], ['MOVLB', 'MOVF', 'BNZ', 'MOVFF', 'RETURN'])
                self.assertEqual(banked(code, w['store'], w['store'] + 2), 0x102, 'tests 0x102')
                self.assertEqual((steps[3].fields['src'], steps[3].fields['dst']), (0x103, 0x100))

    def test_the_escape_sends_2_and_3_to_the_arm_that_sets_the_restart_flag(self):
        for build, code, w in self.each():
            with self.subTest(build=build):
                # The handler masks the command byte and compares it with 0xE0 before it dispatches.
                self.assertEqual([at(code, w['escape'] + d).mnemonic for d in (0, 4, 6, 10, 12)],
                                 ['MOVLW', 'ANDWF', 'MOVLW', 'SUBWF', 'BNZ'])
                self.assertEqual(at(code, w['escape']).fields['k'], 0xF0)
                self.assertEqual(at(code, w['escape'] + 6).fields['k'], 0xE0)
                table = chains.chain_table(code, BASE, w['escape_chain'])
                self.assertEqual((table.get(2), table.get(3)), (w['flag_arm'], w['flag_arm']))
                self.assertEqual(at(code, w['flag_arm'] + 2).fields['k'], 1)
                self.assertEqual(banked(code, w['flag_arm'], w['flag_arm'] + 4), w['flag'])

    def test_the_flag_puts_the_mode_to_3_and_mode_3_executes_reset(self):
        for build, code, w in self.each():
            with self.subTest(build=build):
                reader = w['flag_reader']
                self.assertEqual(banked(code, reader, reader + 2), w['flag'])
                self.assertEqual(at(code, reader + 4).mnemonic, 'BZ')
                self.assertEqual(at(code, reader + 8).fields['k'], 3)
                self.assertEqual(banked(code, reader + 6, reader + 10), w['mode'])
                self.assertEqual(chains.chain_table(code, BASE, w['mode_chain']).get(3), w['reset_block'])
                self.assertEqual(at(code, w['reset']).mnemonic, 'RESET')
                # The block opens with the 0x01F4 wait section 97 reads on 2.8. The poll and the
                # finishing call between it and the RESET are section 298's listing, not asserted here.
                self.assertEqual(at(code, w['reset_block'] + 2).fields['k'], 0xF4)

    def test_the_application_clears_the_byte_only_after_a_reset_that_was_not_its_own(self):
        # In a routine with one caller, which section 298's blind reviewer followed up from the entry
        # point and this does not, the application clears the restart flag, asks whether RCON's RI bit says a
        # RESET instruction ran, and only if not sets the status byte to 0, by handing the store an
        # index and a value of 0. So a byte set before the escape is not cleared by the application
        # the RESET restarts, and any other kind of start, a power on among them, clears it.
        for build, code, w in self.each():
            with self.subTest(build=build):
                c = w['clearing']
                self.assertEqual(banked(code, c, c + 2), w['flag'])
                callee = at(code, c + 4).fields['target']
                self.assertEqual((at(code, callee).mnemonic, at(code, callee).fields['f'], at(code, callee).fields['b']),
                                 ('BTFSS', 0xD0, 4), 'RCON bit 4, RI, in the access bank')
                # RI set, no RESET instruction, returns 0, which is the arm that clears the byte.
                self.assertEqual([(at(code, callee + d).mnemonic, at(code, callee + d).fields['k']) for d in (2, 4)],
                                 [('RETLW', 1), ('RETLW', 0)])
                self.assertEqual(at(code, c + 10).mnemonic, 'BNZ')
                self.assertEqual(banked(code, c + 12, c + 14), 0x103)
                self.assertEqual(banked(code, c + 16, c + 18), 0x102)
                self.assertEqual([at(code, c + d).mnemonic for d in (14, 18)], ['CLRF', 'CLRF'])
                self.assertEqual(at(code, c + 0x14).mnemonic, 'RCALL')
                self.assertEqual(at(code, c + 0x14).fields['target'], w['store'])
                self.assertEqual(c, w['startup'] + 8, 'the clearing path is the routine body')
                callers = trace.xrefs(code, BASE, [w['startup'], w['store']])
                self.assertEqual([x.addr for x in callers[w['startup']]], [w['startup_caller']])
                self.assertEqual(sorted(x.addr for x in callers[w['store']]), sorted([w['arm'] + 8, c + 0x14]),
                                 'the store has two callers, the selector 6 arm and this')


if __name__ == '__main__':
    unittest.main()
