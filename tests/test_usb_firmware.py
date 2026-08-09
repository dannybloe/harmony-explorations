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
from harmony import readloop
from harmony.pic18 import chains, disasm, isa, trace

# image -> (base, command dispatch chain, length nibble chain)
IMAGES = {
    'h700_code': (0x9000, 0x0BDCE, 0x0BD2C),
    'h600_code': (0x9000, 0x0BD38, 0x0BC96),
    'one34_code': (0x20000, 0x26492, 0x26408),
}

# The twelve bytes each bench remote reported, measured over USB. findings.md section 59 checks
# three of them against the program memory the firmware says they come from.
ONE_VERSION_BLOCK = (0x34, 0x05, 0xC8, 0x1F, 0xC0, 0x36, 0x0C, 0x34, 0x34, 0x16, 0x34, 0x34)
H600_VERSION_BLOCK = (0x02, 0x11, 0x1C, 0x15, 0xE0, 0x47, 0x0C, 0x02, 0x00, 0x00, 0x02, 0x02)

# image -> (base, {field: (address of the argument load, the 24 bit program address it builds)}).
#
# These accessors all have one shape: three consecutive RAM bytes loaded with a little endian
# program address, then a call to the image's byte reader. So what each field versions is stated by
# the firmware rather than guessed from the value it happens to hold.
#
# Field 11 is absent for the One because arch 12 reaches its application image a different way, and
# field 8 is absent for both arch 14 images because they hardcode it. Both are asserted elsewhere.
ACCESSOR_ADDRESSES = {
    'h700_code': (0x9000, {7: (0x10654, 0x000017), 10: (0x106B6, 0x001007),
                           11: (0x1067E, 0x009007)}),
    'h600_code_complete': (0x9000, {7: (0x11970, 0x000017), 10: (0x119D2, 0x001007),
                                    11: (0x1199A, 0x009007)}),
    'one34_code': (0x20000, {7: (0x2426E, 0x000017), 8: (0x243E4, 0x01E007),
                             10: (0x2439C, 0x001007)}),
}

# The One's three internal images and the field that carries each one's version. Two are proved by
# the addresses above; field 9 rests on this pairing being exhaustive. findings.md section 59.
INTERNAL_IMAGE_FIELDS = {10: 0x001000, 9: 0x010000, 8: 0x01E000}


def address_argument(code, base, at):
    """The 24 bit program address an accessor builds, by walking it to its call.

    Reading the three literals positionally would break on field 7, whose upper two bytes are
    `CLRF` rather than `MOVLW` because they are zero. So this follows the writes instead: whatever
    lands in the lowest of the three consecutive bytes is the low byte of the address.
    """
    written, literal, addr = {}, None, at
    for _ in range(12):
        instruction = isa.decode(code, addr - base, base)
        if instruction.mnemonic == 'CALL':
            break
        if instruction.mnemonic == 'MOVLW':
            literal = instruction.fields['k']
        elif instruction.mnemonic == 'MOVWF':
            written[instruction.fields['f']] = literal
        elif instruction.mnemonic == 'CLRF':
            written[instruction.fields['f']] = 0
        addr += 4 if instruction.is_two_word else 2
    low = min(written)
    return written[low] | (written[low + 1] << 8) | (written[low + 2] << 16)


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


class TestTheStateMachine(unittest.TestCase):
    """
    The main loop's dispatch on the state variable, which is the way in to every command.

    One chain of 70 cases in the 700 image. Asked for it with the default limit it returned 32,
    which looked like the decoder over-running and was written up that way; it was the limit.
    Hence the explicit limit here and the assertion on the count.
    """

    BASE = 0x9000
    CHAIN = 0x0C720
    EXECUTORS = {0x01: 0x0C906, 0x04: 0x0C982, 0x05: 0x0CB1E,
                 0x08: 0x0CB4A, 0x09: 0x0CB6E, 0x0A: 0x0CB92, 0x0D: 0x0CC46}

    @classmethod
    def table(cls):
        cases = chains.xor_chain(lab.load('h700_code'), cls.BASE, cls.CHAIN, limit=400)
        return {case.value: case.target for case in cases}

    def test_the_chain_is_seventy_distinct_cases(self):
        cases = chains.xor_chain(lab.load('h700_code'), self.BASE, self.CHAIN, limit=400)
        self.assertEqual(len(cases), 70)
        self.assertEqual(len(set(c.value for c in cases)), 70, 'no duplicate cases')
        self.assertEqual(cases[-1].at, 0x0C8FE)

    def test_every_command_state_has_an_executor(self):
        table = self.table()
        for state, executor in self.EXECUTORS.items():
            self.assertEqual(table[state], executor, 'state 0x%02X' % state)

    def test_write_flash_is_the_state_the_chain_does_not_carry(self):
        """
        State 2 is special cased with an ordinary comparison before the chain, so it is absent
        from the table rather than missing from the firmware.
        """
        self.assertNotIn(0x02, self.table())

    def test_read_flash_reaches_the_chunker(self):
        """
        The attribution that was withdrawn and is now restored: state 4's executor is two
        instructions from the branch that reaches the 63 byte comparison.
        """
        code = lab.load('h700_code')
        branch = isa.decode(code, 0x0C988 - self.BASE, self.BASE)
        self.assertEqual(branch.mnemonic, 'BNZ')
        self.assertEqual(branch.fields['target'], 0x0C9B2)
        self.assertEqual(self.table()[0x04], 0x0C982)


class TestEveryCommandsRequestLayout(unittest.TestCase):
    """
    How many bytes each command parses, and where each one goes.

    Each parser is bounded by the next parser's entry address, which is a branch target and so a
    hard limit for a linear prologue. Without that bound the scan ran one handler into the next
    and reported eight argument bytes for READ_FLASH instead of five, which is why the bound is
    part of the derivation rather than a tidy-up.

    GET_VERSION is excluded: it is parsed inline in the USB callback with branches, so it has no
    handler boundary to bound it with.
    """

    BASE = 0x9000
    BYTE_READER = 0x172C6
    EXPECTED = {
        0x30: [0xED0, 0xECF, 0xECE, 0xED2, 0xED1],   # WRITE_FLASH: address, count
        0x50: [0xED0, 0xECF, 0xECE, 0xED2, 0xED1],   # READ_FLASH: the same five
        0x70: [],                                     # START_IRCAP: no arguments
        0xA0: [0xD5D, 0xD5F, 0xD5E, 0xD61, 0xD60],   # WRITE_MISC: selector, address, value
        0xB0: [0xED3, 0xECF, 0xECE],                 # READ_MISC: selector, address
        0xD0: [0xED0, 0xECF, 0xECE],                 # ERASE_FLASH: address only
        0x05: [0xD65, 0xD66, 0xD67],                 # the internal case
    }

    def arguments(self, command):
        table = dispatch('h700_code')
        handler = table[command]
        later = sorted(a for a in table.values() if a > handler)
        stop = later[0] if later else handler + 0x80
        code = lab.load('h700_code')
        addr, bank, out, after = handler, None, [], False
        while addr < stop:
            instr = isa.decode(code, addr - self.BASE, self.BASE)
            if instr.category == isa.BANKSEL:
                bank = instr.fields['k']
            elif (instr.category == isa.ABS20 and instr.mnemonic == 'CALL'
                    and instr.fields['target'] == self.BYTE_READER):
                after = True
            elif after and instr.mnemonic == 'MOVWF' and bank is not None:
                out.append((bank << 8) | instr.fields['f'])
                after = False
            addr += 2 * instr.words
        return out

    def test_layouts(self):
        for command, expected in self.EXPECTED.items():
            self.assertEqual(self.arguments(command), expected,
                             COMMANDS.get(command, 'internal'))

    def test_write_flash_and_read_flash_take_the_same_five_bytes(self):
        """So a host implementation encodes both the same way, and both are validated alike."""
        self.assertEqual(self.arguments(0x30), self.arguments(0x50))

    def test_erase_flash_takes_no_count(self):
        """
        Three bytes, an address and nothing else, so the erase granularity is the hardware's.
        A safety rail consequence: an erase cannot be scoped by the caller, only refused.
        """
        self.assertEqual(len(self.arguments(0xD0)), 3)

    def test_start_ircap_takes_nothing(self):
        self.assertEqual(self.arguments(0x70), [])


class TestTheAcknowledgementShape(unittest.TestCase):
    """
    An acknowledgement is 0xF0 followed by the command's own byte, so a host needs no per command
    table to recognise "done, no payload".
    """

    BASE = 0x9000
    # command -> (address of the MOVLW 0xF0, address of the MOVLW of the command byte)
    ACKS = {0xA0: (0x0CB70, 0x0CB7E), 0xD0: (0x0CB4C, 0x0CB5A)}

    def literal_at(self, addr):
        return isa.decode(lab.load('h700_code'), addr - self.BASE, self.BASE).fields['k']

    def test_both_acknowledgements_are_f0_then_the_command(self):
        for command, (first, second) in self.ACKS.items():
            self.assertEqual(self.literal_at(first), 0xF0, COMMANDS[command])
            self.assertEqual(self.literal_at(second), command, COMMANDS[command])

    def test_write_flash_has_no_executor_body(self):
        """
        A bare RETURN, because the work is not in the state machine: the data arrives as 0x40
        packets handled in the USB callback once WRITE_FLASH has set state 2.
        """
        instr = isa.decode(lab.load('h700_code'), 0x0D30C - self.BASE, self.BASE)
        self.assertEqual(instr.mnemonic, 'RETURN')

    def test_start_ircap_delegates_to_the_shared_transmitter(self):
        instr = isa.decode(lab.load('h700_code'), 0x0CB1E - self.BASE, self.BASE)
        self.assertEqual(instr.mnemonic, 'BRA')
        self.assertEqual(instr.fields['target'], 0x0D2E0)
        self.assertEqual(TestTheStateMachine.table()[0x05], 0x0CB1E)


class TestWriteMisc(unittest.TestCase):
    """
    Nine selectors, and three of them settle open questions: an arbitrary RAM write, a no-op
    where upstream names event queueing, and no action queueing at all.
    """

    BASE = 0x9000
    SELECTOR_CHAIN = 0x0C3AA
    RAM_WRITE = 0x07

    def selectors(self):
        return chains.chain_table(lab.load('h700_code'), self.BASE, self.SELECTOR_CHAIN)

    def text(self, addr):
        return disasm.format_instr(isa.decode(lab.load('h700_code'), addr - self.BASE,
                                              self.BASE), bsr=0xD)

    def test_nine_selectors(self):
        self.assertEqual(sorted(self.selectors()),
                         [0x01, 0x02, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B])

    def test_selector_seven_writes_an_arbitrary_data_address(self):
        """
        The mirror of the RAM read. A write to a live remote, so it belongs behind the write
        flag; this test exists so that fact cannot be lost, not to encourage using it.
        """
        self.assertEqual(self.selectors()[self.RAM_WRITE], 0x0C414)
        self.assertEqual(self.text(0x0C414), 'MOVFF 0xd5e,FSR0L')
        self.assertEqual(self.text(0x0C418), 'MOVFF 0xd5f,FSR0H')
        self.assertEqual(self.text(0x0C41C), 'MOVFF 0xd61,INDF0')

    def test_selector_nine_is_a_no_op(self):
        """
        It sets the packet-handled flag and branches out. Upstream names 0x09
        MISC_QUEUE_EVENT, so on that naming there is no event injection on arch 14.
        """
        self.assertEqual(self.selectors()[0x09], 0x0C440)
        self.assertEqual(self.text(0x0C442), 'MOVLW 0x01')
        self.assertEqual(self.text(0x0C444), 'MOVWF 0xd02')
        self.assertEqual(isa.decode(lab.load('h700_code'), 0x0C446 - self.BASE,
                                    self.BASE).mnemonic, 'BRA')

    def test_selector_three_is_not_serviced(self):
        """Upstream names 0x03 MISC_QUEUE_ACTION. It is absent from the chain."""
        self.assertNotIn(0x03, self.selectors())


class TestEachValidatorBoundsAtItsOwnFlashSize(unittest.TestCase):
    """
    Section 88. Every firmware refuses a flash address outside a window, and the window is that
    model's flash capacity. Three architectures, three different parts, three different windows.

    The point is the agreement, not any one bound: a single firmware refusing addresses above its
    flash would only show that somebody wrote a constant. Three whose constants track three
    different chips shows what the constant is for.
    """

    # image -> (base, {address of the MOVLW: its literal}), and what the window means.
    #
    # Arch 9 is the one that needs a floor as well, because its serial flash is addressed a
    # megabyte up. The other two start at zero and only need a ceiling.
    VALIDATORS = {
        'one34_code': (0x20000, {0x263B0: 0x40}, 0x400000),
        'h700_code': (0x9000, {0x13E38: 0x20}, 0x200000),
        'h525_code': (0x0000, {0x02E30: 0x80, 0x02E46: 0x88}, 0x080000),
    }

    def test_each_image_builds_its_own_bound_as_a_literal(self):
        lab.require(*self.VALIDATORS)
        for image, (base, literals, _) in self.VALIDATORS.items():
            for address, expected in literals.items():
                with self.subTest(image=image, at=hex(address)):
                    instr = isa.decode(lab.load(image), address - base, base)
                    self.assertEqual(instr.mnemonic, 'MOVLW')
                    self.assertEqual(instr.fields['k'], expected)

    def test_the_window_is_the_capacity_of_that_models_flash_part(self):
        """
        The closure. Each span times 64 KiB is the size of the chip the model carries, and the
        three chips are a 4 MiB parallel NOR, a 2 MiB SPI and a 512 KiB SPI.
        """
        spans = {
            'one34_code': (0x00, 0x40),   # Atmel AT49BV322A
            'h700_code': (0x00, 0x20),    # EON F16
            'h525_code': (0x80, 0x88),    # 25F040
        }
        for image, (low, high) in spans.items():
            with self.subTest(image):
                _, _, capacity = self.VALIDATORS[image]
                self.assertEqual((high - low) << 16, capacity)

    def test_the_three_windows_do_not_overlap_in_what_they_permit(self):
        """
        Which is why applying one architecture's rule to another is not a harmless approximation:
        every address arch 9 permits is refused by both others, and half of what arch 12 permits is
        refused by arch 14. That mistake was live in `packages/usb` until section 88.
        """
        arch12 = set(range(0x00, 0x40))
        arch14 = set(range(0x00, 0x20))
        arch9 = set(range(0x80, 0x88))
        self.assertEqual(arch9 & arch12, set())
        self.assertEqual(arch9 & arch14, set())
        self.assertTrue(arch14 < arch12, 'arch 14 permits strictly less than arch 12')
        self.assertEqual(len(arch12 - arch14), 0x20, 'the range that was wrongly refused')


class TestGetVersion(unittest.TestCase):
    """Response code then twelve bytes out of a block another routine fills."""

    BASE = 0x9000
    EXECUTOR = 0x0C906

    def literal_at(self, addr):
        return isa.decode(lab.load('h700_code'), addr - self.BASE, self.BASE).fields['k']

    def test_the_executor_is_the_state_one_body(self):
        self.assertEqual(TestTheStateMachine.table()[0x01], self.EXECUTOR)

    def test_the_block_pointer_and_the_response_code(self):
        block = (self.literal_at(0x0C90C) << 8) | self.literal_at(0x0C908)
        self.assertEqual(block, 0x0D4F)
        self.assertEqual(self.literal_at(0x0C91A), 0x28, 'the response code')

    def test_twelve_bytes_are_copied(self):
        self.assertEqual(self.literal_at(0x0C92A), 0x0C)

    def test_twelve_fields_are_stored_and_twelve_are_copied(self):
        """
        The closure: 0x1422C stores through the pointer at 0xEDD exactly twelve times, and the
        executor copies twelve bytes. Neither count was derived from the other.
        """
        stores = trace.trace(lab.load('h700_code'), self.BASE, (0xEDD,))[0xEDD]
        adds = [a for a in stores if a.kind.startswith('ADDWF')]
        self.assertEqual(len(adds), 12)
        self.assertEqual(self.literal_at(0x0C92A), 12)

    def test_one_field_is_a_sixteen_bit_value_read_over_spi(self):
        """
        Chip select low, a call, then a 16-bit result out of PROD. A 16-bit value from the flash
        chip is its id, which the corpus records per remote as a two byte pair.
        """
        code = lab.load('h700_code')
        self.assertEqual(disasm.format_instr(isa.decode(code, 0x14244 - self.BASE, self.BASE)),
                         'BCF LATF,7')
        for addr, src in ((0x1424A, 0xFF3), (0x1424E, 0xFF4)):   # PRODL, PRODH
            self.assertEqual(isa.decode(code, addr - self.BASE, self.BASE).fields['src'], src)

    def test_one_field_packs_two_nibbles(self):
        """SWAPF then ANDLW 0xf0 then IORWF: two four-bit fields in one of the twelve bytes."""
        code = lab.load('h700_code')
        self.assertEqual(isa.decode(code, 0x14268 - self.BASE, self.BASE).mnemonic, 'SWAPF')
        andlw = isa.decode(code, 0x1426A - self.BASE, self.BASE)
        self.assertEqual((andlw.mnemonic, andlw.fields['k']), ('ANDLW', 0xF0))
        self.assertEqual(isa.decode(code, 0x1426C - self.BASE, self.BASE).mnemonic, 'IORWF')

    def test_the_response_code_length_nibble_does_not_match_the_copy(self):
        """
        Recorded because it is unresolved, not because it is understood. Under the request
        encoding 0x28 would be 15 payload bytes and the loop copies 12, so either responses
        encode length differently or something follows the loop.
        """
        self.assertEqual(TestTheLengthNibbleMapping.EXPECTED[0x28 & 0x0F], 15)
        self.assertNotEqual(15, self.literal_at(0x0C92A))


class TestFieldFourIsTheArchitecture(unittest.TestCase):
    """
    findings.md section 57. Field 4's high nibble was written down as "protocol" because that is
    what it is conventionally called; it is the architecture number, and four images say so.

    The five accessors the version block calls for fields 0, 4 and 5 are `RETLW`, so their values
    are compiled in per image and readable without running anything. That makes the section's claim
    a table lookup rather than an argument.
    """

    # image -> (base, address of the five RETLW accessors, firmware, skin, architecture)
    #
    # The accessors sit consecutively, two bytes apart, in the order the version block consumes
    # them: field 0, field 4's low nibble, field 5, field 6's constant, field 4's high nibble.
    TABLES = {
        'h700_code': (0x9000, 0x10648, 0x28, 66, 14),
        'h600_code_complete': (0x9000, 0x11964, 0x02, 71, 14),
        'h650_code': (0x9000, 0x138C8, 0x04, 72, 14),
        'one34_code': (0x20000, 0x24262, 0x34, 54, 12),
    }

    LOW, SKIN, CONSTANT, HIGH = 1, 2, 3, 4

    def literal(self, image, base, table, index):
        """The literal an accessor returns, checked to actually be a RETLW rather than assumed."""
        addr = table + 2 * index
        instruction = isa.decode(lab.load(image), addr - base, base)
        self.assertEqual(instruction.mnemonic, 'RETLW', 'at 0x%05X in %s' % (addr, image))
        return instruction.fields['k']

    def test_the_constant_is_the_architecture_on_every_image(self):
        """
        The closure. Three arch 14 images with three different firmware versions and three
        different skins all return 14, and the arch 12 image returns 12. So the byte tracks the
        architecture and tracks neither the model nor the firmware version, which is what
        separates "the architecture" from "a protocol revision that happens to match twice".
        """
        lab.require(*self.TABLES)
        for image, (base, table, firmware, skin, architecture) in self.TABLES.items():
            with self.subTest(image):
                # Firmware and skin are read alongside, as the evidence that the table has been
                # located rather than that an address happened to hold the right byte.
                self.assertEqual(self.literal(image, base, table, 0), firmware)
                self.assertEqual(self.literal(image, base, table, self.SKIN), skin)
                self.assertEqual(self.literal(image, base, table, self.HIGH), architecture)

    # The same five accessors inside each remote's **safe mode** image, which is a second
    # firmware sitting beside the application in internal memory. Section 87.
    SAFE_MODE = {
        'h600_internal_fe': (0xFE0000, 0xFE41FA, 0x02, 71, 14),
        'one_internal_fe': (0xFE0000, 0xFE54DE, 0x34, 54, 12),
    }

    def test_the_low_nibble_is_the_software_type(self):
        """
        Section 87, and this test used to say the nibble was undetermined.

        It is zero on all four **application** images and 4 on both **safe mode** images, of the
        same two remotes. Those two images differ in exactly one of the five accessors, which is
        what makes this an identification rather than an observation about two numbers: the other
        four, firmware version, skin, the field 6 constant and the architecture, are byte for byte
        the same in a remote's two images.

        Logitech's own firmware package names the values, in a comment beside the version list it
        accepts: 3 is Boot mode, 1 is Test mode, and the two it accepts, 0 and 4, are "application
        mode or Safe mode". Every user config in the corpus declares 0, and a user config is
        written to a remote running its application, so 0 is the application and 4 is safe mode.
        The images agree with that assignment rather than being read through it.
        """
        lab.require(*self.TABLES)
        for image, (base, table, _, _, _) in self.TABLES.items():
            with self.subTest(image):
                self.assertEqual(self.literal(image, base, table, self.LOW), 0)

        lab.require(*self.SAFE_MODE)
        for image, (base, table, firmware, skin, architecture) in self.SAFE_MODE.items():
            with self.subTest(image):
                self.assertEqual(self.literal(image, base, table, self.LOW), 4)
                # The other four match the application image of the same remote, which is what
                # rules out having found some unrelated run of RETLW.
                self.assertEqual(self.literal(image, base, table, 0), firmware)
                self.assertEqual(self.literal(image, base, table, self.SKIN), skin)
                self.assertEqual(self.literal(image, base, table, self.CONSTANT), 0x0C)
                self.assertEqual(self.literal(image, base, table, self.HIGH), architecture)

    def test_the_version_block_ors_the_software_type_under_the_architecture(self):
        """
        Where the byte goes: `SWAPF` the architecture into the high nibble, mask, then `IORWF`
        the software type into the low one. So a remote reports which of its images is running,
        and both bench remotes read zero because both were running their application.

        The prediction that follows, written down before anyone tries it: a Harmony 600 in safe
        mode answers field 4 as `0xE4` and a Harmony One as `0xC4`.
        """
        code = lab.load('h600_code_complete')
        base = 0x9000
        # CALL the software type accessor, then the architecture one, then combine.
        self.assertEqual(isa.decode(code, 0x1395E - base, base).mnemonic, 'SWAPF')
        andlw = isa.decode(code, 0x13960 - base, base)
        self.assertEqual((andlw.mnemonic, andlw.fields['k']), ('ANDLW', 0xF0))
        self.assertEqual(isa.decode(code, 0x13962 - base, base).mnemonic, 'IORWF')
        # And the operand of the IORWF is the byte the software type accessor was stored into,
        # two instructions after its own call. The SWAPF reads a different byte, the one the
        # architecture accessor filled, so the two nibbles come from two accessors and not from
        # one value being taken apart.
        software_type = isa.decode(code, 0x13954 - base, base).fields['f']
        self.assertEqual(isa.decode(code, 0x13962 - base, base).fields['f'], software_type)
        self.assertNotEqual(isa.decode(code, 0x1395E - base, base).fields['f'], software_type)

    def test_field_six_is_a_compiled_in_constant_and_not_a_field_count(self):
        """
        0x0C on both bench remotes invited reading it as the number of fields. It is the same
        0x0C on the arch 12 image and on all three arch 14 ones, from its own accessor, so it is
        a constant that happens to equal twelve.
        """
        lab.require(*self.TABLES)
        for image, (base, table, _, _, _) in self.TABLES.items():
            with self.subTest(image):
                self.assertEqual(self.literal(image, base, table, self.CONSTANT), 0x0C)

    def test_the_architecture_accessor_has_exactly_one_caller(self):
        """
        It is reported and never consulted. That matters for the naming: the firmware does not
        compare this constant against the architecture the config states in its own slot 1, so
        the agreement between the two is evidence rather than a tautology.
        """
        base, accessor = 0x9000, 0x10648 + 2 * self.HIGH
        callers = trace.xrefs(lab.load('h700_code'), base, (accessor,))
        self.assertEqual(len(callers[accessor]), 1)

    def test_the_version_fields_name_program_addresses(self):
        """
        findings.md section 59. Fields 7, 10 and 11 come from accessors that pass a 24 bit program
        address to one reader routine, so what they version is stated by the firmware rather than
        inferred from the value. The byte at each address is then checked against what the remote
        actually reported, which is the half that makes this a measurement.
        """
        lab.require(*ACCESSOR_ADDRESSES)
        for image, (base, cases) in ACCESSOR_ADDRESSES.items():
            code = lab.load(image)
            for field, (accessor, expected) in cases.items():
                with self.subTest('%s field %d' % (image, field)):
                    self.assertEqual(address_argument(code, base, accessor), expected)

    def test_the_addressed_byte_is_the_one_the_remote_reported(self):
        """
        The other half. Each address is resolved in that unit's own memory dumps and compared with
        its measured version block. The One's `0xFF` page is deliberately absent from `lab.py`
        because it carries the unit's identity block, so field 8's address is pinned above and its
        value cannot be checked here.
        """
        lab.require('one_internal_fe', 'h600_internal_fe', 'h600_code_complete')
        for label, fe, application, app_base, reported in (
            ('One 3.4', 'one_internal_fe', None, None, ONE_VERSION_BLOCK),
            ('600 0.2', 'h600_internal_fe', 'h600_code_complete', 0x9000, H600_VERSION_BLOCK),
        ):
            memory = lab.load(fe)
            code = None if application is None else lab.load(application)
            for field, addr in ((7, 0x000017), (10, 0x001007), (11, 0x009007)):
                if addr >= 0x9000 and code is not None:
                    byte = code[addr - app_base]
                elif addr >= 0x9000:
                    continue      # the One runs its application from external memory
                else:
                    byte = memory[addr]
                with self.subTest('%s field %d' % (label, field)):
                    self.assertEqual(byte, reported[field])

    def test_arch_fourteen_hardcodes_the_two_fields_whose_images_it_lacks(self):
        """
        Fields 8 and 9 are `CLRF INDF0` on the 700, a compiled in zero rather than a read that
        found nothing. That is the correction in section 59: the Harmony 600 reporting `0x00` for
        both was taken as an absent image answering zero, and it is not evidence of anything. It is
        consistent, though, and that is the closure: arch 14 zeroes exactly the two fields naming
        images that only arch 12 carries.
        """
        code = lab.load('h700_code')
        for addr in (0x14378, 0x1438C):
            instruction = isa.decode(code, addr - 0x9000, 0x9000)
            self.assertEqual(instruction.mnemonic, 'CLRF')
            self.assertEqual(instruction.fields['f'], 0xEF, 'INDF0')

    def test_the_three_internal_images_pair_onto_three_fields(self):
        """
        The One holds exactly three images in internal memory and the version block has exactly
        three fields naming one each. Two are proved by address; the pairing is what carries the
        third, whose accessor section 59 records as unresolved.
        """
        self.assertEqual(sorted(INTERNAL_IMAGE_FIELDS), [8, 9, 10])
        self.assertEqual(len(set(INTERNAL_IMAGE_FIELDS.values())), 3)

    def test_field_nine_reads_an_address_the_device_does_not_answer_with(self):
        """The open half of section 59, pinned so it cannot quietly stop being open.

        Field 9's accessor is a bare table read of program `0x020024` and the byte there is `0xDE`,
        while the One reports `0x16`. What this adds is a negative: the byte is `0xDE` in the
        package image **and** in the same unit's own dump of external flash at `0x020000`, which
        are byte identical over the package's length, so the discrepancy is not the installed
        image differing from the one that was published.
        """
        lab.require('one34_code')
        code = lab.load('one34_code')
        base = 0x20000
        # The routine, in full: three writes to TBLPTR, a TBLRD, and the result on its way out.
        # Read as literals rather than through `address_argument`, which walks to a CALL and this
        # accessor makes none: that is the whole point of it being the odd one.
        written, literal = {}, None
        for at in range(0x24290, 0x2429A, 2):
            instruction = isa.decode(code, at - base, base)
            if instruction.mnemonic == 'MOVLW':
                literal = instruction.fields['k']
            elif instruction.mnemonic == 'MOVWF':
                written[instruction.fields['f']] = literal
            elif instruction.mnemonic == 'CLRF':
                written[instruction.fields['f']] = 0
        upper, high, low = written[0xF8], written[0xF7], written[0xF6]
        self.assertEqual((upper << 16) | (high << 8) | low, 0x020024)
        self.assertEqual(isa.decode(code, 0x2429A - base, base).mnemonic, 'TBLRD*')
        self.assertEqual(code[0x020024 - base], 0xDE)
        self.assertEqual(ONE_VERSION_BLOCK[9], 0x16, 'what the remote answers instead')

    def test_the_packing_can_only_express_fifteen_architectures(self):
        """
        A writer rail worth having: the high nibble is built with ANDLW 0xF0 after a SWAPF, so an
        architecture above 15 cannot be reported in this byte at all. Every architecture named in
        this project is below that, which is why nothing has hit it.
        """
        andlw = isa.decode(lab.load('h700_code'), 0x1426A - 0x9000, 0x9000)
        self.assertEqual((andlw.mnemonic, andlw.fields['k']), ('ANDLW', 0xF0))
        self.assertLess(max(a for _, _, _, _, a in self.TABLES.values()), 16)


class TestReadMisc(unittest.TestCase):
    """
    The command that makes live RAM readable over USB, which is what replaces the deferred
    emulator for section labelling and the button mapping experiment.

    **On arch 12 and arch 14 only.** The 525 accepts selector 0x07 and answers zero for every
    address, 1696 of them, so arch 9 has no live RAM at all and the emulator argument does not
    carry there. That is a hardware fact and it is pinned where hardware can refute it,
    `packages/usb/test/hardware.test.ts`. findings.md section 90.
    """

    BASE = 0x9000
    EXECUTOR = 0x0CB92
    SELECTOR_CHAIN = 0x0CBB6
    RAM_SELECTOR = 0x07

    def text(self, addr, bsr=0xE):
        return disasm.format_instr(isa.decode(lab.load('h700_code'), addr - self.BASE,
                                              self.BASE), bsr=bsr)

    def selectors(self):
        return chains.chain_table(lab.load('h700_code'), self.BASE, self.SELECTOR_CHAIN)

    def test_exactly_four_selectors_are_serviced(self):
        self.assertEqual(self.selectors(), {0x01: 0x0CBC8, 0x06: 0x0CBE6,
                                            0x07: 0x0CBF4, 0x0C: 0x0CC02})

    def test_the_ram_selector_is_seven_and_not_the_upstream_six(self):
        """
        libconcord's header names MISC_RAM as 0x06. On arch 14 the selector that reads an
        arbitrary data address is 0x07, and 0x06 is a different accessor. Taking the upstream
        number on faith would have read the wrong thing and still returned a plausible byte.
        """
        self.assertIn(self.RAM_SELECTOR, self.selectors())
        self.assertNotEqual(self.selectors()[self.RAM_SELECTOR],
                            self.selectors()[0x06])

    def test_the_ram_selector_turns_the_parameter_into_fsr0_and_returns_the_byte(self):
        self.assertEqual(self.text(0x0CBF4), 'MOVFF 0xece,FSR0L')
        self.assertEqual(self.text(0x0CBF8), 'MOVFF 0xecf,FSR0H')
        self.assertEqual(self.text(0x0CBFC), 'MOVFF INDF0,0xd64')

    def test_the_response_echoes_the_selector_after_a_code_byte(self):
        """
        0xC2 then the selector then the data. The response reuses the request's encoding, a
        code in the high nibble and a payload length in the low one, so 0xC2 is two payload
        bytes: the selector and one byte of data.
        """
        self.assertEqual(self.text(0x0CB94), 'MOVLW 0xc2')
        self.assertEqual(self.text(0x0CBA0), 'MOVFF 0xed3,0x358')
        self.assertEqual(0xC2 & 0x0F, 2)

    def test_the_executor_is_the_state_ten_body(self):
        self.assertEqual(TestTheStateMachine.table()[0x0A], self.EXECUTOR)


class TestInfraredLearningIsABracket(unittest.TestCase):
    """findings.md section 91: what the firmware settles about learning infrared.

    Two arch 14 images rather than one, because the addresses differ per build and the shape is
    what is being claimed. The client dig said where to look; everything asserted here is read out
    of the firmware, and the parts only the client knows are in `docs/host-client.md` instead,
    unconfirmed, with no test asserting them as true.
    """

    # image -> (base, state 5 command chain, the shared state 6 and 7 executor, state variable)
    LEARNING = {
        'h700_code': (0x9000, 0x0C5D4, 0x0CB20, 0xEC9),
        'h600_code_complete': (0x9000, 0x0C538, 0x0CA62, 0x1C1),
    }

    # Whichever file register the response builder reads, per image, as the bare offset a banked
    # MOVWF encodes. The 700's is 0x358 and the 600's is 0x707, both already established here.
    RESPONSE_BYTE = {'h700_code': (0x9000, 0x58), 'h600_code_complete': (0x9000, 0x07)}

    def instructions(self, name, base, start, count):
        image = lab.load(name)
        out, at = [], start
        for _ in range(count):
            instr = isa.decode(image, at - base, base)
            out.append((at, instr))
            at += 2 * instr.words
        return out

    def test_a_learning_session_accepts_only_the_stop_command(self):
        """The state 5 chain is one comparison against 0x80 and nothing else, so no other command
        is serviced while learning. A second case appearing here would mean the bracket is wider
        than section 91 claims."""
        for name, (base, chain, _, _) in self.LEARNING.items():
            with self.subTest(image=name):
                literals = [i.fields['k'] for _, i in self.instructions(name, base, chain, 8)
                            if i.mnemonic == 'XORLW']
                self.assertEqual(literals, [0x80])

    def test_the_stop_command_moves_the_state_from_five_to_six(self):
        """The number is the content: 6 is a state the idle dispatch table never sets, so it can
        only be reached from inside a session."""
        for name, (base, chain, _, state) in self.LEARNING.items():
            with self.subTest(image=name):
                pairs = self.instructions(name, base, chain, 12)
                loads = [(a, i) for a, i in pairs if i.mnemonic == 'MOVLW']
                self.assertTrue(loads, 'no literal loaded in the stop branch')
                self.assertEqual(loads[0][1].fields['k'], 6)
                stores = [i for _, i in pairs if i.mnemonic == 'MOVWF']
                self.assertEqual(stores[0].fields['f'], state & 0xFF)

    def test_states_six_and_seven_share_an_executor_that_acknowledges(self):
        """It sets state 7 and then emits 0xF0 followed by 0x70, which is the acknowledgement shape
        WRITE_MISC uses: a bare acknowledgement naming the command it acknowledges."""
        for name, (base, _, executor, state) in self.LEARNING.items():
            with self.subTest(image=name):
                pairs = self.instructions(name, base, executor, 16)
                literals = [i.fields['k'] for _, i in pairs if i.mnemonic == 'MOVLW']
                self.assertEqual(literals[:3], [7, 0xF0, 0x70])
                stores = [i for _, i in pairs if i.mnemonic == 'MOVWF']
                self.assertEqual(stores[0].fields['f'], state & 0xFF)

    def test_the_main_state_chain_points_both_states_at_it(self):
        """Only checkable on the 700, whose state chain address is already derived here. Six and
        seven sharing a target is what makes the executor re-entrant across the session."""
        table = TestTheStateMachine.table()
        self.assertEqual(table[6], self.LEARNING['h700_code'][2])
        self.assertEqual(table[7], self.LEARNING['h700_code'][2])

    def test_a_literal_scan_cannot_see_a_data_response_at_all(self):
        """The retraction, pinned so the wrong inference cannot come back.

        Section 91 first argued that no literal 0x90 reaches the response byte, so nothing sends
        capture data. The facts hold and the inference does not: the identical scan finds no 0x60
        either, and 0x60 is READ_FLASH's data code, which this project has driven thousands of
        times. A data response carries a computed length nibble, so its code byte is assembled at
        run time and is never a literal.

        Asserting both absences together is the point. The 0x60 line is what makes the 0x90 line
        worthless, and a future reader who finds only the second would draw the same wrong
        conclusion.
        """
        for name, (base, slot) in self.RESPONSE_BYTE.items():
            with self.subTest(image=name):
                image = lab.load(name)
                seen = set()
                for off in range(0, len(image) - 3, 2):
                    a = isa.decode(image, off, base)
                    b = isa.decode(image, off + 2, base)
                    if a.mnemonic == 'MOVLW' and b.mnemonic == 'MOVWF' and b.fields['f'] == slot:
                        seen.add(a.fields['k'])
                self.assertIn(0x70, seen, 'the response byte was not found, so the scan proves nothing')
                self.assertIn(0xF0, seen)
                self.assertNotIn(0x60, seen, 'READ_FLASH returns data, so this absence is the '
                                             'proof that the scan cannot see data responses')
                self.assertNotIn(0x90, seen)


class TestEveryArchitectureConfiguresAnInfraredReceiver(unittest.TestCase):
    """findings.md section 91: the capture hardware, which is what settles the question a literal
    scan could not.

    A PIC18 states a CCP module's mode in the low nibble of its control register: 0100 to 0111 are
    the four capture modes, 10xx compare, 11xx PWM. So which modes an image can select answers
    whether it can receive infrared at all, without finding the code that ships the samples.
    """

    # image -> (base, part). The 525 is a PIC18F4550 and its register map disagrees with the
    # 67J50 family about 65 of 139 addresses, so passing the part is not optional here.
    IMAGES = {
        'one34_code': (0x20000, '67j50'),
        'h700_code': (0x9000, '67j50'),
        'h600_code_complete': (0x9000, '67j50'),
        'h525_code': (0x0000, '4550'),
    }

    def modes_written(self, name, base, part):
        """Every literal written to a CCPxCON register, keyed by register name."""
        image = lab.load(name)
        sfr = isa.PARTS[part][0]
        targets = {a: n for a, n in sfr.items() if n.startswith('CCP') and n.endswith('CON')}
        out = {}
        for off in range(0, len(image) - 3, 2):
            a = isa.decode(image, off, base)
            b = isa.decode(image, off + 2, base)
            if a.mnemonic != 'MOVLW' or b.mnemonic != 'MOVWF':
                continue
            addr, _ = isa.resolve_file(b.fields['f'], b.fields.get('a', 0), part=part)
            if addr in targets:
                out.setdefault(targets[addr], set()).add(a.fields['k'])
        return out

    def test_every_image_selects_a_capture_mode(self):
        """Arch 9, 12 and 14 alike. A remote that could not capture would have no capture mode
        anywhere, and that is what this would catch."""
        for name, (base, part) in self.IMAGES.items():
            with self.subTest(image=name):
                modes = self.modes_written(name, base, part)
                captures = {v for values in modes.values() for v in values if 0x4 <= v & 0xF <= 0x7}
                self.assertTrue(captures, 'no capture mode selected anywhere in this image')

    def test_the_capture_is_on_both_edges_and_lives_on_ccp2(self):
        """Both edges is the content: measuring an envelope and then a gap needs a falling edge and
        a rising one, which is the alternation a learn stream is made of."""
        for name, (base, part) in self.IMAGES.items():
            with self.subTest(image=name):
                self.assertEqual(self.modes_written(name, base, part).get('CCP2CON'), {0x04, 0x05})

    def test_ccp1_is_the_transmitter_and_never_a_capture(self):
        """PWM, which is section 32's carrier read from the other side. If this ever selected a
        capture the two roles would not be separable and section 32's arithmetic would need
        rechecking."""
        for name, (base, part) in self.IMAGES.items():
            with self.subTest(image=name):
                self.assertEqual(self.modes_written(name, base, part).get('CCP1CON'), {0x0C})


class TestReadFlash(unittest.TestCase):
    """
    The one command version 1 of the application actually needs.

    Addresses are the 700 2.8 image. The argument variables are named by what they turn out to
    hold: the address triple is loaded straight into TBLPTR, which settles it.

    Scope note, after a correction. Everything here is about the **request**: the parser, the
    validator it calls, and the proof that the address triple is an address. The response side
    was published as located and is not: see the correction in docs/usb-protocol.md. The two
    tests below that touch 0x13E90 and 0x0C9B2 assert what that code does, not which command
    it serves.
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

    def test_the_chip_select_brackets_the_transfer(self):
        """
        LATF bit 7 is the external flash chip select, established in findings section 13. It
        goes low before the address is loaded and high after the transfer.

        Which command this serves is NOT asserted. The routine's other branch calls 0x1B50A,
        which sets EECON1 to FREE | WREN, an erase, so this is probably not a read path at all.
        Pinned because the bracket itself is a fact worth keeping while the ownership is open.
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

    STATE_CHAIN = 0x0D388       # a second dispatch site on the state variable
    STATE_4_BODY = 0x0D3A8      # READ_FLASH's per chunk step, from that site

    def test_state_four_is_dispatched_from_two_places(self):
        """
        Attribution by control flow, which is what the earlier mistake lacked. Both sites are
        real: the main state machine sends state 4 to 0x0C982, and a second chain at 0x0D388
        sends it to 0x0D3A8. Which body does what is inference; that both are reached is not.
        """
        code = lab.load('h700_code')
        second = chains.chain_table(code, self.BASE, self.STATE_CHAIN)
        self.assertEqual(sorted(second), [0x02, 0x04, 0x05, 0x06, 0x0B, 0x20, 0x35])
        self.assertEqual(second[0x04], self.STATE_4_BODY)
        self.assertEqual(TestTheStateMachine.table()[0x04], 0x0C982)

    def test_the_count_pair_is_the_remaining_count(self):
        """
        In READ_FLASH's own state body: the two bytes are OR'd to test for zero, the command
        ends by clearing the state when they reach it, and otherwise the chunk size is
        subtracted from them as a 16-bit quantity.
        """
        code = lab.load('h700_code')

        def text(addr):
            return disasm.format_instr(isa.decode(code, addr - self.BASE, self.BASE), bsr=0xE)

        self.assertEqual(text(0x0D3B0), 'MOVF 0xed1,W')
        self.assertEqual(text(0x0D3B2), 'IORWF 0xed2,W')     # zero test over both bytes
        self.assertEqual(text(0x0D3B8), 'CLRF 0xec9')        # finished, back to idle
        self.assertEqual(text(0x0D3C8), 'SUBWF 0xed1,F')     # remaining -= chunk
        self.assertEqual(text(0x0D3CC), 'SUBWFB 0xed2,F')

    def test_the_state_cleared_at_the_end_is_the_one_the_handlers_set(self):
        """The loop ends the command by clearing the same variable READ_FLASH set to 4."""
        self.assertEqual(state_variable('h700_code'), 0xEC9)

    def test_the_special_region_is_internal_program_memory(self):
        """
        Inside the read path the region marker branches, and the 0xFE branch calls 0x1B558,
        which does TBLRD*+. So the special region is the MCU's own program memory read by table
        read, not the external config flash. Its siblings 0x1B50A and 0x1B53C erase and write the
        same memory, which is how the earlier misattribution happened.
        """
        code = lab.load('h700_code')
        self.assertEqual(self.literal_at(0x0CA78), 0xFE)
        call = isa.decode(code, 0x0CA96 - self.BASE, self.BASE)
        self.assertEqual((call.mnemonic, call.fields['target']), ('CALL', 0x1B558))
        self.assertEqual(isa.decode(code, 0x1B566 - self.BASE, self.BASE).mnemonic, 'TBLRD*+')

    def test_the_internal_memory_primitives_are_told_apart_by_eecon1(self):
        """FREE | WREN erases, WREN alone writes. The read sibling touches EECON1 not at all."""
        self.assertEqual(self.literal_at(0x1B518), 0x14)   # 0x1B50A, erase
        self.assertEqual(self.literal_at(0x1B54A), 0x04)   # 0x1B53C, write

    def test_something_in_the_flash_path_chunks_at_the_payload_size(self):
        """
        A 16-bit remaining count compared against 63 and moved 63 bytes at a time, on the same
        variable pair READ_FLASH parses its last two bytes into. 63 is exactly what length
        nibble 0xA encodes, so two parts of the firmware agree on the payload size.

        Not asserted: that this is READ_FLASH's response. That attribution was withdrawn.
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


class TestTheInternalReadLoopCannotEndOnAnOddCount(unittest.TestCase):
    """Section 94: an odd internal read count never terminates on a Harmony One.

    The claim is about three instructions, so it is asserted against the image rather than
    described. `0x26BC8` is the loop head and `0x26C18` branches back to it.
    """

    NAME, BASE = 'one34_code', 0x20000
    LOOP_HEAD = 0x26BC8
    LOOP_BACK = 0x26C18
    WORD_READ = 0x2E70A

    def at(self, code, addr):
        return isa.decode(code, addr - self.BASE, self.BASE)

    def test_the_loop_subtracts_two_and_exits_only_on_zero(self):
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        # `SUBLW 0x00` sets carry only when the value is zero, and the branch back is `BNC`. A
        # signed or a "less than" test would terminate on an odd count; this one cannot.
        self.assertEqual(self.at(code, 0x26C16).mnemonic, 'SUBLW')
        back = self.at(code, self.LOOP_BACK)
        self.assertEqual(back.mnemonic, 'BNC')
        self.assertEqual(back.fields['target'], self.LOOP_HEAD)
        # And the step is two, so an odd remaining count steps 1, 255, 253 and never lands on zero.
        self.assertEqual(self.at(code, 0x26C0C).mnemonic, 'MOVLW')
        self.assertEqual(self.at(code, 0x26C0C).fields['k'], 2)
        self.assertEqual(self.at(code, 0x26C10).mnemonic, 'SUBWF')

    def test_the_fetch_it_calls_can_only_read_a_word(self):
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        # Two table reads and no single byte entry point, so the loop is committed to two bytes a
        # pass whatever it was asked for.
        self.assertEqual(self.at(code, 0x2E718).mnemonic, 'TBLRD*+')
        self.assertEqual(self.at(code, 0x2E71E).mnemonic, 'TBLRD*')
        # The loop calls exactly that routine.
        call = self.at(code, 0x26BD6)
        self.assertEqual(call.mnemonic, 'CALL')
        self.assertEqual(call.fields['target'], self.WORD_READ)

    def test_the_watchdog_is_fed_inside_the_loop(self):
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        # So the watchdog cannot end the loop either, which is why a remote hangs and drops off the
        # bus rather than resetting cleanly.
        self.assertEqual(self.at(code, self.LOOP_HEAD).mnemonic, 'CLRWDT')


class TestTheArch12AddressValidatorNormalisesThePageBit(unittest.TestCase):
    """Section 94: `0xFE` and `0xFF` are one internal path plus a page bit.

    This is what settles that page `0xFF` reaches the read loop at `0x26BC8`, whose branch tests
    the top byte against `0xFE` only. Asserted against the image because the whole argument is
    three instructions and a write back.
    """

    NAME, BASE = 'one34_code', 0x20000
    VALIDATOR = 0x2637A

    def at(self, code, addr):
        return isa.decode(code, addr - self.BASE, self.BASE)

    def test_bit_zero_of_the_top_byte_is_cleared_before_the_comparison(self):
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        clear = self.at(code, 0x2637E)
        self.assertEqual(clear.mnemonic, 'BCF')
        self.assertEqual(clear.fields['b'], 0)
        # And the value it is then compared against is 0xFE, so 0xFF matches too.
        self.assertEqual(self.at(code, 0x26384).mnemonic, 'MOVLW')
        self.assertEqual(self.at(code, 0x26384).fields['k'], 0xFE)
        self.assertEqual(self.at(code, 0x26386).mnemonic, 'XORWF')

    def test_the_normalisation_is_written_back_and_the_page_bit_kept(self):
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        # 0x28B := 0xFE unconditionally, which is the byte the read body branches on.
        self.assertEqual(self.at(code, 0x263D4).fields['k'], 0xFE)
        self.assertEqual(self.at(code, 0x263D6).mnemonic, 'MOVWF')
        # 0x287 &= 1, so the page survives as the top byte of the address the loop is handed.
        self.assertEqual(self.at(code, 0x263D8).fields['k'], 0x01)
        self.assertEqual(self.at(code, 0x263DA).mnemonic, 'ANDWF')
        # And the internal arm accepts.
        self.assertEqual(self.at(code, 0x263DC).mnemonic, 'RETLW')
        self.assertEqual(self.at(code, 0x263DC).fields['k'], 0x01)


class TestTheArch12ReadFlashChunker(unittest.TestCase):
    """Section 94: `0x28A` is the chunk size, and nothing on the path tests the offset.

    The second half is a negative and it is asserted rather than described, because a negative
    nobody can check is what sends the next reader through the same four routines again.
    """

    NAME, BASE = 'one34_code', 0x20000
    CLAMP = 0x26AF0
    CHUNK_SIZE_WRITE = 0x26B50
    PARSE_SITES = (0x264E8, 0x26532)

    def at(self, code, addr):
        return isa.decode(code, addr - self.BASE, self.BASE)

    def test_the_chunk_size_is_the_clamped_payload_less_its_sequence_byte(self):
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        self.assertEqual(self.at(code, 0x26B4C).mnemonic, 'DECF')
        store = self.at(code, self.CHUNK_SIZE_WRITE)
        self.assertEqual(store.mnemonic, 'MOVWF')
        self.assertEqual(store.fields['f'], 0x8A)

    def test_the_remaining_count_is_clamped_at_63_like_arch_14(self):
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        self.assertEqual(self.at(code, self.CLAMP + 2).fields['k'], 0x3F)
        self.assertEqual(self.at(code, self.CLAMP + 4).mnemonic, 'SUBWF')

    def test_both_parse_sites_end_in_the_validator(self):
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        # READ_FLASH and WRITE_FLASH parse into the same variables, which is why the two blocks are
        # identical and why a claim about one has to name which.
        for site in self.PARSE_SITES:
            call = self.at(code, site + 0x1C)
            self.assertEqual(call.mnemonic, 'RCALL')
            self.assertEqual(call.fields['target'], 0x2637A)

    def test_the_address_is_compared_against_the_execution_base(self):
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        # Found while checking a negative that turned out to be vacuous. `0x268AC` compares the
        # whole 24 bit address against 0x020000, the arch 12 execution base, and sets or clears a
        # flag bit accordingly. It is in the flash machinery rather than on the READ_FLASH path
        # traced above, and it is pinned because it is the kind of thing a later reader will find
        # again and wonder about.
        self.assertEqual(self.at(code, 0x268AE).mnemonic, 'SUBWF')
        self.assertEqual(self.at(code, 0x268B2).mnemonic, 'SUBWFB')
        self.assertEqual(self.at(code, 0x268B4).fields['k'], 0x02)
        self.assertEqual(self.at(code, 0x268B6).mnemonic, 'SUBWFB')


class TestTheResponseSenderHasNoBound(unittest.TestCase):
    """Section 96: the sender writes past the buffer, which is what decides the restart.

    The threshold at program `0x010A56` reported in section 94 does not exist. What decides
    whether an unterminated read ends is a byte of the memory being read, `DECIDING_DISTANCE`
    above the failing chunk, because the sender walks its pointer into the loop's own counter.
    """

    NAME, BASE = 'one34_code', 0x20000
    SENDER = 0x20394
    #: The nine instructions of the sender, in order. A bound would have to be one of them.
    SENDER_BODY = [
        'MOVLB', 'MOVFF', 'MOVFF', 'INCF', 'MOVLW', 'ADDWFC', 'MOVFF', 'MOVLB', 'INCF', 'RETURN',
    ]
    #: Anything that could refuse a byte: a comparison, a skip, or a branch out.
    TESTS = {'CPFSEQ', 'CPFSGT', 'CPFSLT', 'BTFSS', 'BTFSC', 'TSTFSZ', 'SUBLW', 'SUBWF',
             'SUBFWB', 'SUBWFB', 'BC', 'BNC', 'BZ', 'BNZ', 'BRA', 'GOTO', 'DECFSZ', 'INCFSZ'}

    def at(self, code, addr):
        return isa.decode(code, addr - self.BASE, self.BASE)

    def walk(self, code, start, count):
        addr, out = start, []
        for _ in range(count):
            instr = self.at(code, addr)
            out.append(instr)
            addr += instr.words * 2
        return out

    def test_the_sender_is_nine_instructions_and_none_of_them_is_a_test(self):
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        body = self.walk(code, self.SENDER, len(self.SENDER_BODY))
        self.assertEqual([i.mnemonic for i in body], self.SENDER_BODY)
        # The negative is the whole point: if a bound is ever found, this is what has to give.
        self.assertEqual([i.mnemonic for i in body if i.mnemonic in self.TESTS], [])

    def test_the_write_pointer_is_reloaded_before_every_response(self):
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        # `MOVLW 0x68` / `MOVWF 0x2C7` then `MOVLW 0x04` / `MOVWF 0x2C8`, so the buffer base is
        # 0x0468 and it is set per report rather than per command. That is what makes the deciding
        # distance a constant instead of depending on how much came before.
        self.assertEqual(self.at(code, 0x2015C).fields['k'], readloop.BUFFER_BASE & 0xFF)
        self.assertEqual(self.at(code, 0x2015E).mnemonic, 'MOVWF')
        self.assertEqual(self.at(code, 0x20160).fields['k'], readloop.BUFFER_BASE >> 8)
        self.assertEqual(self.at(code, 0x20162).mnemonic, 'MOVWF')

    def test_the_loop_sends_two_bytes_before_it_starts(self):
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        # The response code and 0x28C, so the loop's first data byte lands two into the buffer.
        for site in (0x26B9C, 0x26BA8):
            call = self.at(code, site)
            self.assertEqual(call.mnemonic, 'CALL')
            self.assertEqual(call.fields['target'], self.SENDER)
        self.assertEqual(readloop.PREAMBLE, 2)

    def test_the_counter_sits_that_far_above_where_the_loop_starts_writing(self):
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        # 0xD31 is the count, from `MOVFF 0x28A,0xD31` at 0x26BAC, and the address follows it at
        # 0xD34 so the count is overwritten first. 0xD31 - 0x046A is 0x8C7, or 1124 passes.
        self.assertEqual(self.at(code, 0x26BAC).mnemonic, 'MOVFF')
        self.assertEqual(readloop.DECIDING_DISTANCE, 0x8C7)
        self.assertGreater(readloop.ADDRESS, readloop.COUNTER)

    def synthetic(self, deciding, elsewhere=0x00):
        """A page whose only interesting byte is the one the model says decides the outcome."""
        page = bytearray([elsewhere]) * 0x4000
        page[62 + readloop.DECIDING_DISTANCE] = deciding
        return readloop.word_reader(bytes(page), 0x010000)

    def test_the_deciding_byte_decides_and_nothing_else_does(self):
        # An odd count with an even byte in that one position comes back; the same read with an odd
        # byte there does not. No image needed, so this runs without a lab.
        self.assertTrue(readloop.read_returns(self.synthetic(0xFE), 0x010000, 63))
        self.assertFalse(readloop.read_returns(self.synthetic(0x01), 0x010000, 63))

    def test_an_even_count_comes_back_whatever_is_there(self):
        # The loop's own arithmetic still terminates, so the sender never reaches its counter.
        for count in (62, 64, 124):
            self.assertTrue(readloop.read_returns(self.synthetic(0x01), 0x010000, count), count)

    def test_a_neighbouring_byte_does_not_decide(self):
        # The assertion that would fail if the distance were off by one, which is the mistake this
        # reading is most likely to be making.
        page = bytearray(0x4000)
        for delta in (-1, 1, 2):
            page[:] = bytearray(0x4000)
            page[62 + readloop.DECIDING_DISTANCE + delta] = 0x01
            reader = readloop.word_reader(bytes(page), 0x010000)
            self.assertTrue(readloop.read_returns(reader, 0x010000, 63), delta)


class TestTheRestartCommandAndTheEscape(unittest.TestCase):
    """Section 97: what a polite session end would actually cost.

    Two candidate commands, read on both bench architectures. The claim a product decision rests
    on is that `0xE0 0x01` is not a reset and `0xE0 0x02` is, so both halves are asserted.
    """

    IMAGES = {
        'one34_code': (0x20000, 0x2666C),          # arch 12, the WRITE_MISC selector chain
        'h700_code': (0x9000, 0x0C3AA),            # arch 14
    }
    #: Selectors serviced, per architecture. Arch 14 has one more.
    SELECTORS = {
        'one34_code': {0x01, 0x02, 0x05, 0x06, 0x07, 0x08, 0x0A, 0x0B},
        'h700_code': {0x01, 0x02, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B},
    }

    def at(self, code, base, addr):
        return isa.decode(code, addr - base, base)

    def test_both_selector_chains_decode_and_0x07_is_the_known_ram_write(self):
        lab.require(*self.IMAGES)
        for name, (base, start) in self.IMAGES.items():
            code = lab.load(name)
            table = chains.chain_table(code, base, start)
            self.assertEqual(set(table), self.SELECTORS[name], name)
            # The calibration case: 0x07 is the RAM write this project already uses, so a chain
            # that puts something else there has been decoded wrong.
            body = table[0x07]
            self.assertEqual(self.at(code, base, body).mnemonic, 'MOVFF', name)
            self.assertEqual(self.at(code, base, body).fields['dst'], 0xFE9, name)  # FSR0L

    def test_the_restart_selector_does_nothing_on_arch_12(self):
        lab.require('one34_code')
        code = lab.load('one34_code')
        table = chains.chain_table(code, 0x20000, 0x2666C)
        # Four instructions: set the packet handled flag, branch out. If a future reader finds the
        # arch 12 restart doing something, this is what has to fail first.
        for selector in (0x08, 0x0A, 0x0B):
            body = table[selector]
            got = [self.at(code, 0x20000, body + n).mnemonic for n in (0, 2, 4, 6)]
            self.assertEqual(got, ['MOVLB', 'MOVLW', 'MOVWF', 'BRA'], hex(selector))
        # 0x05 is the same nothing with an empty conditional in front of it: it reads the entry
        # point byte and branches to the same address either way, which is source left in place.
        body = table[0x05]
        self.assertEqual(self.at(code, 0x20000, body + 2).mnemonic, 'MOVF')
        self.assertEqual(self.at(code, 0x20000, body + 4).mnemonic, 'BNZ')
        self.assertEqual(self.at(code, 0x20000, body + 4).fields['target'],
                         self.at(code, 0x20000, body + 6).fields['target'])

    def test_the_restart_selector_acts_on_five_entry_points_on_arch_14(self):
        lab.require('h700_code')
        code = lab.load('h700_code')
        body = chains.chain_table(code, 0x9000, 0x0C3AA)[0x0A]
        # Five `MOVLW n` / `SUBWF` / branch tests before the shared arm. Numbering the client's
        # entry point list from zero these are start update, start learn, stop learn, start upgrade
        # and stop upgrade, and the client's own learn sequence uses 0x07 and 0x08.
        wanted = []
        for step in range(5):
            wanted.append(self.at(code, 0x9000, body + step * 8).fields['k'])
        self.assertEqual(wanted, [0x07, 0x08, 0x05, 0x09, 0x0A])

    def test_the_escape_exists_on_both_and_arch_12_tests_it_with_a_subtraction(self):
        lab.require(*self.IMAGES)
        # Arch 12 was missed once because a search for an XOR chain cannot see a SUBWF compare.
        one = lab.load('one34_code')
        self.assertEqual(self.at(one, 0x20000, 0x26434).fields['k'], 0xE0)
        self.assertEqual(self.at(one, 0x20000, 0x26438).mnemonic, 'SUBWF')
        seven = lab.load('h700_code')
        self.assertEqual(self.at(seven, 0x9000, 0x0BD58).fields['k'], 0xE0)
        self.assertEqual(self.at(seven, 0x9000, 0x0BD5C).mnemonic, 'SUBWF')

    def test_sub_command_one_clears_the_command_state_and_is_not_a_reset(self):
        lab.require(*self.IMAGES)
        # `CLRF <command state>` then `SETF <parsed top address byte>`, the same two instructions on
        # both architectures, and no RESET on that path.
        for name, (base, clear, state, setf) in (
            ('one34_code', (0x20000, 0x2645C, 0x284, 0x26460)),
            ('h700_code', (0x9000, 0x0BD84, 0xEC9, 0x0BD88)),
        ):
            code = lab.load(name)
            cleared = self.at(code, base, clear)
            self.assertEqual(cleared.mnemonic, 'CLRF', name)
            # And it is the command state that is cleared, not some neighbour: the low byte of the
            # address, since a banked access carries only that.
            self.assertEqual(cleared.fields['f'], state & 0xFF, name)
            self.assertEqual(self.at(code, base, setf).mnemonic, 'SETF', name)
            reached = [self.at(code, base, clear + n).mnemonic for n in range(0, 12, 2)]
            self.assertNotIn('RESET', reached, name)

    def test_sub_command_two_reaches_a_software_reset_on_both(self):
        lab.require(*self.IMAGES)
        # The flag, its one reader turning the top level mode into 3, and the RESET that mode 3
        # runs. Asserted as the whole path, because six RESET instructions exist in the One image
        # and finding one proves nothing.
        for name, base, mode_site, reset in (
            ('one34_code', 0x20000, 0x28C3E, 0x28D4C),
            ('h700_code', 0x9000, 0x16340, 0x1642C),
        ):
            code = lab.load(name)
            self.assertEqual(self.at(code, base, mode_site - 2).fields['k'], 0x03, name)
            self.assertEqual(self.at(code, base, mode_site).mnemonic, 'MOVWF', name)
            self.assertEqual(self.at(code, base, reset).mnemonic, 'RESET', name)


class TestTheSameSenderDefectOnEveryArchitecture(unittest.TestCase):
    """Section 96: the unbounded sender is not arch 12's, it is all three.

    Named as not established when section 96 landed, and closed the same day. The four things that
    make the defect a defect are asserted per architecture, so a future image that fixes any one of
    them fails here rather than silently widening the claim.
    """

    IMAGES = {12: ('one34_code', 0x20000), 14: ('h700_code', 0x9000), 9: ('h525_code', 0x0000)}

    def at(self, code, base, addr):
        return isa.decode(code, addr - base, base)

    def test_every_exit_test_is_equality_with_zero(self):
        lab.require(*(name for name, _ in self.IMAGES.values()))
        for arch, (name, base) in self.IMAGES.items():
            code, profile = lab.load(name), readloop.PROFILES[arch]
            # SUBLW 0x00 sets carry only for zero, and the branch back is BNC. A "less than" test
            # would terminate on an odd count on any of them.
            exit_test = self.at(code, base, profile['exit'])
            self.assertEqual(exit_test.mnemonic, 'SUBLW', arch)
            self.assertEqual(exit_test.fields['k'], 0, arch)
            back = self.at(code, base, profile['exit'] + 2)
            self.assertEqual(back.mnemonic, 'BNC', arch)
            self.assertEqual(back.fields['target'], profile['loop'], arch)

    def test_no_sender_bounds_anything(self):
        lab.require(*(name for name, _ in self.IMAGES.values()))
        tests = {'CPFSEQ', 'CPFSGT', 'CPFSLT', 'BTFSS', 'BTFSC', 'TSTFSZ', 'SUBLW', 'SUBWF',
                 'SUBFWB', 'SUBWFB', 'BC', 'BNC', 'BZ', 'BNZ', 'DECFSZ', 'INCFSZ'}
        for arch, (name, base) in self.IMAGES.items():
            code, profile = lab.load(name), readloop.PROFILES[arch]
            addr, seen = profile['sender'], []
            while True:
                instr = self.at(code, base, addr)
                seen.append(instr.mnemonic)
                if instr.mnemonic == 'RETURN' or len(seen) > 12:
                    break
                addr += instr.words * 2
            self.assertIn('RETURN', seen, arch)
            # The store through the pointer is there, and nothing decides whether to do it.
            self.assertIn('MOVFF', seen, arch)
            self.assertEqual([m for m in seen if m in tests], [], arch)

    def test_the_buffer_base_is_the_same_literal_everywhere(self):
        lab.require(*(name for name, _ in self.IMAGES.values()))
        sites = {12: 0x2015C, 14: 0x170EE, 9: 0x0156A}
        for arch, site in sites.items():
            name, base = self.IMAGES[arch]
            code = lab.load(name)
            self.assertEqual(self.at(code, base, site).fields['k'], 0x68, arch)
            self.assertEqual(self.at(code, base, site + 4).fields['k'], 0x04, arch)
            self.assertEqual(readloop.PROFILES[arch]['buffer'], 0x0468, arch)

    def test_the_counter_always_sits_below_the_address_it_would_corrupt(self):
        # The ordering is what makes the outcome a parity test rather than a jump: the pointer only
        # climbs, so whichever of the loop's variables is lowest is the one it reaches first.
        addresses = {12: 0xD34, 14: 0xD60, 9: 0x70E}
        for arch, address in addresses.items():
            profile = readloop.PROFILES[arch]
            self.assertLess(profile['counter'], address, arch)
            self.assertEqual(profile['distance'], profile['counter'] - 0x046A, arch)

    def test_arch_9_decides_soonest(self):
        # Worth pinning as a number rather than as prose: a 525 reaches the deciding byte in a third
        # of the passes, so it damages least and fails fastest.
        self.assertLess(readloop.PROFILES[9]['distance'], readloop.PROFILES[12]['distance'])
        self.assertLess(readloop.PROFILES[12]['distance'], readloop.PROFILES[14]['distance'])
        self.assertEqual(readloop.PROFILES[9]['distance'], 0x2A1)


class TestTheLearnSamplesAreNeverSent(unittest.TestCase):
    """Section 98: the endpoint is pointed at the capture buffer, so nothing sends the samples.

    Two searches failed by assuming the bytes go through the byte sender. The assertions here are
    the ones that would have to break for that assumption to come back: `START_IRCAP` names the
    buffers, and the transport writes their address into the endpoint's buffer descriptor.
    """

    ARCH = {12: ('one34_code', 0x20000, 0x26556), 14: ('h700_code', 0x9000, 0x0C2B2)}
    #: The two ping pong buffers and the toggle, the same addresses on both architectures.
    BUFFERS = (0x600, 0x601, 0x642, 0x643)
    TOGGLE = 0x684

    def at(self, code, base, addr):
        return isa.decode(code, addr - base, base)

    def test_start_ircap_clears_both_buffers_and_the_toggle_on_both_architectures(self):
        lab.require(*(name for name, _, _ in self.ARCH.values()))
        for arch, (name, base, handler) in self.ARCH.items():
            code = lab.load(name)
            cleared, addr = [], handler
            for _ in range(12):
                instr = self.at(code, base, addr)
                if instr.mnemonic == 'CLRF':
                    cleared.append(0x600 + instr.fields['f'])
                addr += instr.words * 2
            self.assertEqual(cleared, list(self.BUFFERS), arch)

    def test_the_endpoint_descriptor_is_pointed_at_the_chosen_buffer(self):
        lab.require('one34_code')
        code = lab.load('one34_code')
        # 0x40D is the buffer descriptor's byte count and 0x40E/0x40F its address. A full report,
        # then the buffer's own address, which is what makes the samples never pass through a sender.
        self.assertEqual(self.at(code, 0x20000, 0x2028A).fields['k'], 0x40)
        self.assertEqual(self.at(code, 0x20000, 0x2028C).fields['f'], 0x0D)
        self.assertEqual(self.at(code, 0x20000, 0x2029E).fields['dst'], 0x40E)
        self.assertEqual(self.at(code, 0x20000, 0x202A2).fields['dst'], 0x40F)

    def test_the_ordinary_response_path_uses_the_same_descriptor_with_a_fixed_buffer(self):
        lab.require('one34_code')
        code = lab.load('one34_code')
        # The calibration: the command path sets the same count and the literal 0x0468, which is
        # what identifies 0x40D..0x40F as the descriptor rather than as a software counter.
        self.assertEqual(self.at(code, 0x20000, 0x2017A).fields['k'], 0x40)
        self.assertEqual(self.at(code, 0x20000, 0x2017C).fields['f'], 0x0D)
        self.assertEqual(self.at(code, 0x20000, 0x20180).fields['k'], 0x68)
        self.assertEqual(self.at(code, 0x20000, 0x20184).fields['k'], 0x04)

    def test_the_response_code_is_stored_into_the_buffer_not_emitted(self):
        lab.require('one34_code')
        code = lab.load('one34_code')
        # Both buffers, at their payload offset. This is why a search for code that sends 0x90
        # found nothing twice.
        for site, target in ((0x2B742, 0x602), (0x2B7AA, 0x644)):
            self.assertEqual(self.at(code, 0x20000, site).fields['k'], 0x90, hex(site))
            self.assertEqual(0x600 + self.at(code, 0x20000, site + 2).fields['f'], target, hex(site))

    def test_a_sample_is_a_difference_of_captures_so_it_is_a_duration(self):
        lab.require('one34_code')
        code = lab.load('one34_code')
        # SUBWF then SUBWFB into the staged 16 bit value, and CCP2 is what feeds it.
        self.assertEqual(self.at(code, 0x20000, 0x2B646).mnemonic, 'SUBWF')
        self.assertEqual(self.at(code, 0x20000, 0x2B650).mnemonic, 'SUBWFB')
        self.assertEqual(self.at(code, 0x20000, 0x2B66A).fields['f'], 0xB7)  # CCPR2L
        self.assertEqual(self.at(code, 0x20000, 0x2B670).fields['f'], 0xB8)  # CCPR2H

    def test_arch_14_stores_the_same_header_through_indf(self):
        lab.require('h700_code')
        code = lab.load('h700_code')
        # This test replaces one that asserted arch 14 had no such store. That assertion passed and
        # was misleading: arch 14 reaches the buffers through FSR, so the store is MOVWF INDF0 and a
        # search keyed on the literal buffer offsets cannot see it. INDF0 is 0xEF.
        self.assertEqual(self.at(code, 0x9000, 0x0938C).fields['k'], 0x90)
        self.assertEqual(self.at(code, 0x9000, 0x0938E).mnemonic, 'MOVWF')
        self.assertEqual(self.at(code, 0x9000, 0x0938E).fields['f'], 0xEF)
        # The sequence byte follows it and advances by 0x10, as on arch 12.
        self.assertEqual(self.at(code, 0x9000, 0x093A2).fields['k'], 0x10)
        self.assertEqual(self.at(code, 0x9000, 0x093A6).mnemonic, 'ADDWF')
        # And a buffer closes at the same length.
        self.assertEqual(self.at(code, 0x9000, 0x0932E).fields['k'], 0x3D)

    def test_both_architectures_cap_a_report_at_the_same_length(self):
        lab.require('one34_code', 'h700_code')
        for name, base, site in (('one34_code', 0x20000, 0x2B6B0), ('h700_code', 0x9000, 0x0932E)):
            code = lab.load(name)
            self.assertEqual(self.at(code, base, site).fields['k'], 0x3D, name)


class TestUsbModeHasAGatedExit(unittest.TestCase):
    """Section 99: the exit from USB mode is conditional on the command state being zero.

    This overturns section 97's "a polite end is a reboot, or it is nothing", so the chain it
    rests on is asserted step by step rather than summarised.
    """

    NAME, BASE = 'one34_code', 0x20000
    MODE = 0x315
    STATE = 0x284

    def at(self, code, addr):
        return isa.decode(code, addr - self.BASE, self.BASE)

    def test_mode_one_polls_a_port_pin_and_the_suspend_bit(self):
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        # PORTA is 0xF80, read twice and masked with 0x10 each time. The polarity of that pin is
        # deliberately not asserted anywhere: this only pins that the poll exists.
        for site in (0x28CF2, 0x28CF8):
            self.assertEqual(self.at(code, site).fields['f'], 0x80, hex(site))
            self.assertEqual(self.at(code, site + 2).fields['k'], 0x10, hex(site))
        # UCON is 0xF65 on this family and bit 1 is SUSPND, so the mask is 0x02.
        self.assertEqual(self.at(code, 0x28D02).fields['f'], 0x65)
        self.assertEqual(self.at(code, 0x28D04).fields['k'], 0x02)

    def test_one_exit_is_conditional_on_the_command_state(self):
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        self.assertEqual(self.at(code, 0x28D18).mnemonic, 'MOVF')
        self.assertEqual(self.at(code, 0x28D18).fields['f'], self.STATE & 0xFF)
        self.assertEqual(self.at(code, 0x28D1A).mnemonic, 'BNZ')

    def test_the_other_exit_clears_the_command_state_first(self):
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        call = self.at(code, 0x28D0E)
        self.assertEqual(call.mnemonic, 'CALL')
        self.assertEqual(call.fields['target'], 0x26366)
        # And that routine is a full command reset, starting with the gate itself.
        self.assertEqual(self.at(code, 0x26368).mnemonic, 'CLRF')
        self.assertEqual(self.at(code, 0x26368).fields['f'], self.STATE & 0xFF)

    def test_leaving_the_mode_drops_the_mode_variable(self):
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        # The exit releases two port bits and branches to the arm that clears 0x315, which is what
        # puts the top level loop back where it can enter the application.
        self.assertEqual(self.at(code, 0x28D24).mnemonic, 'BSF')
        self.assertEqual(self.at(code, 0x28D28).fields['target'], 0x28D7C)
        self.assertEqual(self.at(code, 0x28D7E).mnemonic, 'CLRF')
        self.assertEqual(self.at(code, 0x28D7E).fields['f'], self.MODE & 0xFF)

    def test_a_handled_command_leaves_the_state_set(self):
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        # The shared exit clears the state only when the packet was NOT handled, which is why a
        # session that just stops can leave the gate closed.
        self.assertEqual(self.at(code, 0x267E6).mnemonic, 'MOVF')
        self.assertEqual(self.at(code, 0x267E8).mnemonic, 'BNZ')
        self.assertEqual(self.at(code, 0x267EC).mnemonic, 'CLRF')
        self.assertEqual(self.at(code, 0x267EC).fields['f'], self.STATE & 0xFF)
        # Skipped when handled: the branch target is past the clear.
        self.assertGreater(self.at(code, 0x267E8).fields['target'], 0x267EC)

    def test_the_gentle_escape_clears_exactly_that_gate(self):
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        # Section 97's 0xE0 0x01, tied to section 99's gate: the same address.
        self.assertEqual(self.at(code, 0x2645C).mnemonic, 'CLRF')
        self.assertEqual(self.at(code, 0x2645C).fields['f'], self.STATE & 0xFF)
