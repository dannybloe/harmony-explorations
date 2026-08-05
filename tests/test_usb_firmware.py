"""
The USB command layer as the firmware implements it.

Three images, two architectures. The dispatch table and the length nibble mapping are
derived from the images here rather than transcribed, because the compiler emits a switch as
a chain of XORLW comparisons whose literals are not the case values: each literal is the XOR
of one case with the next. Transcribing them gives a wrong table that looks right.

Addresses are recorded per image. Finding them again from scratch is a search; keeping them
is what makes this a regression test.
"""
import unittest

import lab
from harmony.pic18 import chains, disasm, isa, trace

# image -> (base, command dispatch chain, length nibble chain)
IMAGES = {
    'h700_code': (0x9000, 0x0BDCE, 0x0BD2C),
    'h600_code': (0x9000, 0x0BD38, 0x0BC96),
    'one34_code': (0x20000, 0x26492, 0x26408),
}

# The seven commands every image dispatches, by the value left after the length nibble is
# masked off. Names are the ones the protocol is known by; the firmware names nothing.
COMMANDS = {0x10: 'GET_VERSION', 0x30: 'WRITE_FLASH', 0x50: 'READ_FLASH',
            0x70: 'START_IRCAP', 0xA0: 'WRITE_MISC', 0xB0: 'READ_MISC',
            0xD0: 'ERASE_FLASH'}

# Not a USB command. Both arch 14 images reach this case by storing 0x05 into the same
# variable from the 0xE0 escape's sub-command handler, so it is an internal continuation.
INTERNAL_CASE = 0x05


def dispatch(name):
    base, chain, _ = IMAGES[name]
    return chains.chain_table(lab.load(name), base, chain)


def length_map(name):
    """The length nibble mapping, read out of the image.

    Nibbles 0 to 7 are guarded off before the chain and pass through unchanged; the chain
    handles the rest, and each of its targets begins by loading the mapped length as a
    literal.
    """
    base, _, chain = IMAGES[name]
    code = lab.load(name)
    out = {}
    for case in chains.xor_chain(code, base, chain):
        out[case.value] = _first_literal(code, base, case.target)
    return out


def _first_literal(code, base, addr, within=4):
    """The operand of the first MOVLW at or just after `addr`."""
    for _ in range(within):
        instr = isa.decode(code, addr - base, base)
        if instr.mnemonic == 'MOVLW':
            return instr.fields['k']
        addr += 2 * instr.words
    return None


def _first_literal_store(name, handler, within=12):
    """(data address, value) of the first `MOVLW k` then banked `MOVWF f` in a handler.

    Every handler opens by assigning its state, so this finds both which variable holds the
    state and what it is set to. The variable is at a different address in each of the three
    images, so it has to be derived rather than assumed: 0xEC9 in the 700, 0x1C1 in the 600,
    0x284 in the One.
    """
    base, _, _ = IMAGES[name]
    code = lab.load(name)
    addr, bank, pending = handler, None, None
    for _ in range(within):
        instr = isa.decode(code, addr - base, base)
        if instr.category == isa.BANKSEL:
            bank = instr.fields['k']
        elif instr.mnemonic == 'MOVLW':
            pending = instr.fields['k']
        elif (instr.mnemonic == 'MOVWF' and instr.fields['a'] == 1
                and pending is not None and bank is not None):
            return (bank << 8) | instr.fields['f'], pending
        addr += 2 * instr.words
    return None, None


def state_variable(name):
    """The address of the protocol state variable, derived from the WRITE_FLASH handler."""
    address, _ = _first_literal_store(name, dispatch(name)[0x30])
    return address


def handler_state(name, handler, within=12):
    """The state a command handler assigns, read out of the image."""
    wanted = state_variable(name)
    base, _, _ = IMAGES[name]
    code = lab.load(name)
    addr, bank, pending = handler, None, None
    for _ in range(within):
        instr = isa.decode(code, addr - base, base)
        if instr.category == isa.BANKSEL:
            bank = instr.fields['k']
        elif instr.mnemonic == 'MOVLW':
            pending = instr.fields['k']
        elif (instr.mnemonic == 'MOVWF' and instr.fields['a'] == 1 and bank is not None
                and ((bank << 8) | instr.fields['f']) == wanted and pending is not None):
            return pending
        addr += 2 * instr.words
    return None


class TestEveryCommandSetsTheSameStateOnBothArchitectures(unittest.TestCase):
    """
    A command is parsed in the USB callback and executed later, and the handover is a state
    variable. The numbering is identical in all three images, which is a strong sign the two
    architectures run the same protocol implementation rather than two that merely agree on
    the command bytes: the 600 is firmware 0.2 and the One is a different architecture
    entirely.
    """

    STATES = {0x10: 0x01, 0x30: 0x02, 0x50: 0x04, 0x70: 0x05,
              0xD0: 0x08, 0xA0: 0x09, 0xB0: 0x0A}

    def test_states(self):
        for name in IMAGES:
            table = dispatch(name)
            for command, state in self.STATES.items():
                self.assertEqual(handler_state(name, table[command]), state,
                                 '%s, %s' % (name, COMMANDS[command]))

    def test_the_internal_case_has_its_own_state(self):
        for name in ('h700_code', 'h600_code'):
            self.assertEqual(handler_state(name, dispatch(name)[INTERNAL_CASE]), 0x0D, name)

    def test_the_state_variable_is_at_a_different_address_in_each_image(self):
        """
        Which is why it is derived rather than assumed, and why the identical state numbering
        above is evidence of a shared implementation rather than a shared memory map.
        """
        self.assertEqual(state_variable('h700_code'), 0xEC9)
        self.assertEqual(state_variable('h600_code'), 0x1C1)
        self.assertEqual(state_variable('one34_code'), 0x284)

    def test_write_flash_claims_the_state_that_enables_flash_data(self):
        """
        WRITE_FLASH sets state 2, and state 2 is the only state in which the 0x40
        WRITE_FLASH_DATA chain runs. So flash data is accepted only after a write has been
        requested, and that is a property of the firmware rather than of the host.
        """
        for name in IMAGES:
            self.assertEqual(handler_state(name, dispatch(name)[0x30]), 0x02, name)


class TestTheCommandDispatchTable(unittest.TestCase):
    def test_every_image_dispatches_the_same_seven_commands(self):
        for name in IMAGES:
            table = dispatch(name)
            for value, command in COMMANDS.items():
                self.assertIn(value, table, '%s is missing %s' % (name, command))

    def test_nothing_else_is_dispatched_except_the_internal_case(self):
        for name in IMAGES:
            extra = set(dispatch(name)) - set(COMMANDS)
            self.assertLessEqual(extra, {INTERNAL_CASE}, name)

    def test_the_internal_case_is_an_arch_14_difference(self):
        """
        Both arch 14 images carry it and the arch 12 image does not, so it tracks the
        architecture rather than the firmware version: the 600 is firmware 0.2 and the 700
        is 2.8.
        """
        self.assertIn(INTERNAL_CASE, dispatch('h700_code'))
        self.assertIn(INTERNAL_CASE, dispatch('h600_code'))
        self.assertNotIn(INTERNAL_CASE, dispatch('one34_code'))

    def test_the_targets_are_distinct_and_inside_the_image(self):
        for name in IMAGES:
            base, _, _ = IMAGES[name]
            table = dispatch(name)
            self.assertEqual(len(set(table.values())), len(table), name)
            for target in table.values():
                self.assertLess(base, target, name)
                self.assertLess(target, base + len(lab.load(name)), name)

    def test_write_flash_data_is_not_in_the_table(self):
        """
        0x40 is a real command and it is deliberately absent: it is dispatched from a second
        chain that only runs while a flash write is in progress, which is why the firmware
        cannot be tricked into taking flash data it did not ask for.
        """
        for name in IMAGES:
            self.assertNotIn(0x40, dispatch(name), name)


class TestTheLengthNibbleMapping(unittest.TestCase):
    """
    The low nibble of the command byte is a payload length, and the mapping is not linear.

    Numeric closure: 63 payload bytes plus the command byte is exactly the 64 byte report
    the descriptors declare, and 15, 31, 63 are 2^4-1, 2^5-1, 2^6-1. A misreading would not
    land on the report size.
    """

    EXPECTED = {0x08: 0x0F, 0x09: 0x1F, 0x0A: 0x3F}

    def test_the_three_mapped_nibbles(self):
        for name in IMAGES:
            self.assertEqual(length_map(name), self.EXPECTED, name)

    def test_low_nibbles_are_guarded_off_before_the_chain(self):
        """`SUBLW 0x07` then a carry branch: nibbles 0 to 7 skip the chain unchanged."""
        for name, (base, _, chain) in IMAGES.items():
            code = lab.load(name)
            guard = isa.decode(code, chain - base - 8, base)
            self.assertEqual(guard.mnemonic, 'SUBLW', name)
            self.assertEqual(guard.fields['k'], 0x07, name)
            branch = isa.decode(code, chain - base - 6, base)
            self.assertEqual(branch.mnemonic, 'BC', name)

    def test_the_longest_payload_fills_the_report(self):
        self.assertEqual(max(self.EXPECTED.values()) + 1, 64)


class TestReadFlash(unittest.TestCase):
    """
    The one command version 1 of the application actually needs.

    Addresses are the 700 2.8 image. The argument variables are named by what they turn out to
    hold: the address triple is loaded straight into TBLPTR, which settles it.
    """

    BASE = 0x9000
    BYTE_READER = 0x172C6       # returns the next byte of the packet in W
    ADDRESS_HIGH = 0xED0        # doubles as the region selector
    ADDRESS_MID = 0xECF
    ADDRESS_LOW = 0xECE
    COUNT_HIGH = 0xED2
    COUNT_LOW = 0xED1

    def parsed_argument_order(self, handler, within=40):
        """Where each byte read from the packet is stored, in order."""
        code = lab.load('h700_code')
        addr, bank, out, after_read = handler, None, [], False
        for _ in range(within):
            instr = isa.decode(code, addr - self.BASE, self.BASE)
            if instr.category == isa.BANKSEL:
                bank = instr.fields['k']
            elif (instr.category == isa.ABS20 and instr.mnemonic == 'CALL'
                    and instr.fields['target'] == self.BYTE_READER):
                after_read = True
            elif after_read and instr.mnemonic == 'MOVWF' and bank is not None:
                out.append((bank << 8) | instr.fields['f'])
                after_read = False
            addr += 2 * instr.words
        return out

    def literal_at(self, addr):
        return isa.decode(lab.load('h700_code'), addr - self.BASE, self.BASE).fields['k']

    def movff_at(self, addr):
        f = isa.decode(lab.load('h700_code'), addr - self.BASE, self.BASE).fields
        return f['src'], f['dst']

    def test_five_argument_bytes_in_this_order(self):
        order = self.parsed_argument_order(dispatch('h700_code')[0x50])
        self.assertEqual(order, [self.ADDRESS_HIGH, self.ADDRESS_MID, self.ADDRESS_LOW,
                                self.COUNT_HIGH, self.COUNT_LOW])

    def test_the_address_triple_is_an_address_because_it_becomes_tblptr(self):
        """
        Not an inference: the three bytes are copied into TBLPTRL, TBLPTRH and TBLPTRU. Which
        also fixes the byte order, most significant first on the wire.
        """
        self.assertEqual(self.movff_at(0x13EBA), (self.ADDRESS_LOW, 0xFF6))   # TBLPTRL
        self.assertEqual(self.movff_at(0x13EBE), (self.ADDRESS_MID, 0xFF7))   # TBLPTRH
        self.assertEqual(self.movff_at(0x13EC2), (self.ADDRESS_HIGH, 0xFF8))  # TBLPTRU

    def test_the_chip_select_brackets_the_read(self):
        """
        LATF bit 7 is the external flash chip select, established in findings section 13. It
        goes low before the address is loaded and high after the transfer, which is what makes
        this the config flash read path rather than an internal table read.
        """
        code = lab.load('h700_code')
        before = disasm.format_instr(isa.decode(code, 0x13EB8 - self.BASE, self.BASE))
        after = disasm.format_instr(isa.decode(code, 0x13ECE - self.BASE, self.BASE))
        self.assertEqual(before, 'BCF LATF,7')
        self.assertEqual(after, 'BSF LATF,7')

    def test_the_validator_rejects_out_of_range_selectors(self):
        """
        0x13DFE returns 1 or 0. The high address byte is accepted below 0x20, or as 0xFE and
        0xFF which select a region that is not the config flash, and rejected otherwise.
        """
        self.assertEqual(self.literal_at(0x13E0C), 0xFE)   # the special region test
        self.assertEqual(self.literal_at(0x13E38), 0x20)   # the ordinary address bound
        for addr, value in ((0x13E84, 1), (0x13E86, 0), (0x13E8C, 1), (0x13E8E, 0)):
            instr = isa.decode(lab.load('h700_code'), addr - self.BASE, self.BASE)
            self.assertEqual(instr.mnemonic, 'RETLW', hex(addr))
            self.assertEqual(instr.fields['k'], value, hex(addr))

    def test_the_special_region_leaves_room_for_one_report(self):
        """0xFFC0 is 0x10000 minus 64, so an offset plus a full read cannot leave the window."""
        bound = (self.literal_at(0x13E70) << 8) | self.literal_at(0x13E6C)
        self.assertEqual(bound, 0xFFC0)
        self.assertEqual(0x10000 - bound, 64)

    def test_the_count_is_chunked_at_the_payload_size(self):
        """
        The remaining count is a 16-bit pair compared against 63 and sent 63 bytes at a time,
        and 63 is exactly what length nibble 0xA encodes. Third independent agreement on the
        64 byte report, after the descriptors and the length nibble mapping itself.
        """
        self.assertEqual(self.literal_at(0x0C9B4), 0x3F)
        self.assertEqual(self.literal_at(0x0C9C6), 0x3F)
        self.assertEqual(TestTheLengthNibbleMapping.EXPECTED[0x0A], 0x3F)
        self.assertEqual(0x3F + 1, 64)


class TestTheEndpointSetup(unittest.TestCase):
    """
    The registers the firmware writes at attach, which agree with the descriptors it hands
    out. Addresses are from the 700 2.8 image.
    """

    BASE = 0x9000

    def literal_written_to(self, addr_of_movlw):
        code = lab.load('h700_code')
        return isa.decode(code, addr_of_movlw - self.BASE, self.BASE).fields['k']

    def test_ucfg_is_full_speed_with_internal_pullups_and_no_ping_pong(self):
        ucfg = self.literal_written_to(0x16E08)
        self.assertEqual(ucfg, 0x14)
        self.assertTrue(ucfg & 0x10, 'UPUEN, internal pull-ups')
        self.assertTrue(ucfg & 0x04, 'FSEN, full speed')
        self.assertFalse(ucfg & 0x08, 'UTRDIS clear, transceiver enabled')
        self.assertEqual(ucfg & 0x03, 0, 'PPB, no ping-pong buffering')

    def test_endpoint_1_is_in_only_and_endpoint_2_is_out_only(self):
        """
        UEP bits are EPSTALL 0, EPINEN 1, EPOUTEN 2, EPCONDIS 3, EPHSHK 4. Both endpoints
        disable control transfers and enable handshaking, and each enables one direction,
        matching the endpoint descriptors exactly.
        """
        uep1, uep2 = self.literal_written_to(0x16E2C), self.literal_written_to(0x16E30)
        self.assertEqual((uep1, uep2), (0x1A, 0x1C))
        for uep in (uep1, uep2):
            self.assertTrue(uep & 0x10, 'EPHSHK')
            self.assertTrue(uep & 0x08, 'EPCONDIS')
            self.assertFalse(uep & 0x01, 'EPSTALL')
        self.assertTrue(uep1 & 0x02, 'endpoint 1 IN enabled')
        self.assertFalse(uep1 & 0x04, 'endpoint 1 OUT disabled')
        self.assertFalse(uep2 & 0x02, 'endpoint 2 IN disabled')
        self.assertTrue(uep2 & 0x04, 'endpoint 2 OUT enabled')

    def test_the_report_buffers(self):
        """
        Buffer descriptors are four bytes per direction from 0x400 with ping-pong off, so
        endpoint 2 OUT is 0x410 and endpoint 1 IN is 0x40C. Each is given a 64 byte buffer,
        and the two buffers are adjacent.
        """
        out_low, out_high = self.literal_written_to(0x16E3A), self.literal_written_to(0x16E3E)
        in_low, in_high = self.literal_written_to(0x16E48), self.literal_written_to(0x16E4C)
        out_buffer = (out_high << 8) | out_low
        in_buffer = (in_high << 8) | in_low
        self.assertEqual(out_buffer, 0x0428)
        self.assertEqual(in_buffer, 0x0468)
        self.assertEqual(in_buffer - out_buffer, 64)
        self.assertEqual(self.literal_written_to(0x16E36), 64, 'OUT byte count')
        self.assertEqual(self.literal_written_to(0x16E50), 0x40, 'IN status, DTS with UOWN clear')

    def test_endpoint_1_out_is_never_used(self):
        """
        The third statement of the same asymmetry, after the endpoint descriptors and UEP1.
        Buffer descriptor 0x408 is endpoint 1 OUT and nothing addresses it directly, while
        its neighbours are addressed dozens of times. Indirect access through FSR would be
        invisible, so this is confirmation rather than proof on its own.
        """
        hits = trace.trace(lab.load('h700_code'), self.BASE, (0x400, 0x408, 0x40C, 0x410))
        self.assertEqual(hits[0x408], [], 'endpoint 1 OUT descriptor')
        neighbours = len(hits[0x400]) + len(hits[0x40C]) + len(hits[0x410])
        self.assertGreater(neighbours, 20)

    def test_the_out_descriptor_is_handed_to_the_hardware_and_the_in_one_is_not(self):
        """
        0x88 sets UOWN, so the serial interface engine may fill the OUT buffer immediately.
        The IN descriptor gets 0x40, UOWN clear, so the firmware keeps it until it has a
        response to send. Getting this backwards is a hung endpoint.
        """
        self.assertEqual(self.literal_written_to(0x16E42), 0x88)
        self.assertTrue(0x88 & 0x80, 'UOWN')
        self.assertFalse(0x40 & 0x80, 'UOWN clear on the IN descriptor')


if __name__ == '__main__':
    unittest.main()
