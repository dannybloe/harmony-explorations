"""
The queue that decides when an infrared command actually goes out. `docs/findings.md` section 236.

Section 70 read the **producer** of the `0x7C` quantity, the pair of handlers that push a send and a
quantity into a circular buffer, and left "the timer that drains the queue" as the unfinished half.
This is that half: the picker that decides whether a queued send may go, the walker that counts a
quantity down, and the scan both of them ask.

**One routine matters more than the rest and it is the scan.** Both the picker and the countdown call
it with the same mode, asking "is there an earlier entry in this queue for the same device". That is
what makes the delay per device rather than a pause in the sequence: a command waits only behind its
own device's entries, so two devices proceed side by side, and a quantity with nothing behind it for
its device is never felt by anybody. That prediction was tested on a Harmony One on 1 September 2026,
both ways round, and section 236 records the measurement.

Two images, one arch 14 (Harmony 700) and one arch 12 (Harmony One), which is the span that matters
here: the hardware confirmation is on a Harmony One and the code was first read on the Harmony 700,
so a reading that held on only one of them would not connect to the measurement. Addresses are
recorded per image for the reason `test_interpreter.py` gives: finding them again is a search, and
keeping them is what makes this a regression test rather than an exploration.
"""
import unittest

import lab
from harmony.pic18 import isa

# image -> base, then the routines this file reads.
IMAGES = {
    'h700_code': {
        'base': 0x9000,
        'scan': 0x13204,        # is there an earlier entry for this device
        'picker': 0x1338A,      # may this queued send go out
        'countdown': 0x13706,   # tick: decrement a quantity, retire it at one
        'buffer_start': 0x65,
        'buffer_wrap': 0x83,
        'read_cursor': 0x083,
        # Arch 14 splits the tag into a four bit kind and a four bit device.
        'kind_mask': 0xF0,
    },
    'one34_code': {
        'base': 0x20000,
        'scan': 0x2706A,
        'picker': 0x2711C,
        'countdown': 0x27318,
        'buffer_start': 0x686,
        'buffer_wrap': 0x6A4,
        'read_cursor': 0x6A4,
        # Arch 12 masks the kind with three bits, and still masks the device with four, so bit 4 of a
        # tag belongs to neither field. Unexplained, and asserted so that it stays visible.
        'kind_mask': 0xE0,
    },
}

ENTRY_BYTES = 2
QUEUE_BYTES = 30

#: The tag's low nibble, on both architectures.
GROUP_MASK = 0x0F

#: `0x0A8` on arch 14 and `0x6C7` on arch 12: bit 2 selects matching on the kind instead of the
#: device, bit 0 keeps the device nibble, bit 1 says a quantity counts as an entry. Three is the mode
#: both callers use, meaning "any entry at all for this device, a quantity included".
ANY_ENTRY_FOR_THIS_DEVICE = 0x03

#: The quantity's kind nibble, which is the bit the `0x7C` handler sets. Section 70.
QUANTITY_KIND = 0x40

#: The kind a retired entry is marked with, which the scan then skips.
RETIRED_KIND = 0x60


def window(name, start, count):
    """`count` decoded instructions from `start`, in the image's own address space."""
    code = lab.load(name)
    base = IMAGES[name]['base']
    out = []
    offset = start - base
    for _ in range(count):
        instruction = isa.decode(code, offset, base)
        out.append(instruction)
        offset += 2 * instruction.words
    return out


def literals(name, start, count):
    """Every literal a window loads, in order, whatever the mnemonic."""
    return [i.fields['k'] for i in window(name, start, count)
            if i.mnemonic in ('MOVLW', 'SUBLW', 'ANDLW', 'XORLW')]


class TestTheBuffer(unittest.TestCase):
    """Thirty bytes of two byte entries, so fifteen things can be outstanding at once."""

    def test_the_recorded_addresses_span_fifteen_entries_on_both_images(self):
        """Arithmetic over the two numbers this file records, which is all it can be.

        Named the way `test_interpreter.py` names its equivalent, because it opens no image: it would
        pass with both addresses wrong in the same direction. What it catches is a transcription
        slip, and the firmware side is every other test here.
        """
        for name, at in IMAGES.items():
            with self.subTest(image=name):
                span = at['buffer_wrap'] - at['buffer_start']
                self.assertEqual(span, QUEUE_BYTES)
                self.assertEqual(span % ENTRY_BYTES, 0, 'no half entry fits')
                self.assertEqual(span // ENTRY_BYTES, 15)

    def test_the_countdown_states_the_same_bounds(self):
        """The wrap the walker applies is the buffer this file records, read off the image.

        This is the half the test above cannot be: the two addresses appear as literals in the
        instruction stream, so a wrong pair in the table fails here.
        """
        for name, at in IMAGES.items():
            with self.subTest(image=name):
                loaded = literals(name, at['countdown'], 46)
                for bound in (at['buffer_start'], at['buffer_wrap']):
                    self.assertIn(bound & 0xFF, loaded)
                    self.assertIn(bound >> 8, loaded)


class TestTheScan(unittest.TestCase):
    """One routine, asked the same question by both consumers, and it reads identically on both."""

    def test_it_reads_the_same_on_both_architectures_but_for_the_kind_mask(self):
        """The strongest thing here: seven literals, six shared, one per architecture.

        A reading of this routine on the Harmony 700 alone would not license anything said about the
        Harmony One, which is the remote the hardware measurement was made on. The two agreeing
        literal for literal is what joins them.
        """
        seen = {}
        for name, at in IMAGES.items():
            seen[name] = literals(name, at['scan'], 46)
        self.assertEqual(seen['h700_code'],
                         [0x00, 0xF0, GROUP_MASK, 0x04, 0x04, RETIRED_KIND, QUANTITY_KIND])
        self.assertEqual(seen['one34_code'],
                         [0x00, 0xE0, GROUP_MASK, 0x04, 0x04, RETIRED_KIND, QUANTITY_KIND])
        differ = [a for a, b in zip(seen['h700_code'], seen['one34_code']) if a != b]
        self.assertEqual(differ, [0xF0], 'exactly one literal differs, and it is the kind mask')

    def test_the_kind_mask_is_per_architecture_and_the_device_mask_is_not(self):
        """Arch 12 masks the kind with three bits and the device with four, so one bit is in neither.

        Recorded rather than explained. It matters to a writer only in that a tag's bit 4 is not the
        device number's top bit on a Harmony One, which is what reading the arch 14 split across
        would suggest.
        """
        for name, at in IMAGES.items():
            with self.subTest(image=name):
                loaded = literals(name, at['scan'], 46)
                self.assertEqual(loaded[1], at['kind_mask'])
                self.assertEqual(loaded[2], GROUP_MASK)
        self.assertNotEqual(IMAGES['h700_code']['kind_mask'], IMAGES['one34_code']['kind_mask'],
                            'a control on the test above, which would be vacuous if they agreed')

    def test_a_quantity_is_skipped_unless_the_caller_asks_for_it(self):
        """`BTFSC <mode>,1` guarding a comparison against the quantity kind.

        This is the branch that makes the two questions different: without bit 1 the scan reports
        only real work for a device, with it a pending delay counts as well. Both consumers set it.
        """
        for name, at in IMAGES.items():
            with self.subTest(image=name):
                decoded = window(name, at['scan'], 46)
                bit_tests = [i for i in decoded if i.mnemonic == 'BTFSC']
                self.assertEqual(len(bit_tests), 2, 'the device nibble, then the quantity')
                self.assertEqual(bit_tests[1].fields['b'], 1)
                after = [i.fields['k'] for i in decoded[decoded.index(bit_tests[1]):]
                         if i.mnemonic in ('MOVLW', 'SUBLW')]
                self.assertEqual(after[0], QUANTITY_KIND, 'the guarded comparison is against 0x40')


class TestTheConsumers(unittest.TestCase):
    """Both ask the scan the same question, and that is the finding."""

    def test_both_ask_for_any_entry_naming_the_same_device(self):
        """Mode 3 written before the call, in the picker and in the countdown alike.

        A send that finds an earlier entry for its device is passed over, and a quantity that finds
        one is left alone rather than counted down. So the queue is ordered **per device** and not
        globally: this is the whole mechanism, in one shared constant.
        """
        for name, at in IMAGES.items():
            for routine in ('picker', 'countdown'):
                with self.subTest(image=name, routine=routine):
                    decoded = window(name, at[routine], 46)
                    calls = [n for n, i in enumerate(decoded) if i.mnemonic in ('RCALL', 'CALL')]
                    self.assertTrue(calls, 'the scan is called')
                    before = [i.fields['k'] for i in decoded[:calls[0]]
                              if i.mnemonic in ('MOVLW', 'SUBLW')]
                    self.assertEqual(before[-1], ANY_ENTRY_FOR_THIS_DEVICE,
                                     'the last literal before the call is the mode')

    def test_the_countdown_subtracts_one_and_retires_the_entry_at_one(self):
        """`SUBLW 0x01`, then `DECF` on one arm and the retired kind on the other.

        That shape is what makes the quantity a **duration** rather than a repeat count: it is
        decremented once per tick and removed when it runs out, and section 235's unit says each tick
        is a tenth of a second. A repeat count would be decremented per transmission instead.
        """
        for name, at in IMAGES.items():
            with self.subTest(image=name):
                decoded = window(name, at['countdown'], 60)
                mnemonics = [i.mnemonic for i in decoded]
                loaded = [(n, i.fields['k']) for n, i in enumerate(decoded)
                          if i.mnemonic in ('MOVLW', 'SUBLW')]
                floor = [n for n, k in loaded if k == 0x01]
                self.assertEqual(len(floor), 1, 'one comparison against one')
                self.assertIn('DECF', mnemonics[floor[0]:], 'and a decrement after it')
                retire = [n for n, k in loaded if k == RETIRED_KIND and n > floor[0]]
                self.assertTrue(retire, 'the other arm marks the entry retired')

    def test_the_picker_splits_the_tag_the_same_way(self):
        """It applies its architecture's kind mask, like the scan and the countdown do.

        Deliberately `in` rather than a position: the two images order the picker's opening literals
        differently, the Harmony 700 comparing a mode first and the Harmony One the tag. A first
        version of this asserted position and was wrong on both. What pins the address instead is
        `TestTheRecordedAddresses` below.
        """
        for name, at in IMAGES.items():
            with self.subTest(image=name):
                self.assertIn(at['kind_mask'], literals(name, at['picker'], 46))


class TestTheRecordedAddresses(unittest.TestCase):
    """That the three entry points are the three entry points, rather than somewhere inside them.

    **Written because two controls did not bite.** Moving the picker four bytes on and the countdown
    six bytes on left every other test here passing, since they all ask whether a literal appears
    somewhere in a window and a window that starts late still covers the routine. So a table of
    addresses could rot into a table of nearby addresses with nothing failing, and then the next
    person to extend this file would be reading from the wrong place.

    The anchor is that all three routines open by copying the queue's read cursor, which is a
    two instruction preamble no interior point of them has.

    **It bit on the first run, on a real address rather than a planted one**: the Harmony 700's
    countdown was recorded as `0x13712`, which is that routine's loop head, twelve bytes past its
    entry at `0x13706`. Every other test here passed with it, because the window still covered the
    routine.
    """

    def test_all_three_routines_begin_by_copying_the_read_cursor(self):
        for name, at in IMAGES.items():
            for routine in ('scan', 'picker', 'countdown'):
                with self.subTest(image=name, routine=routine):
                    first, second = window(name, at[routine], 2)
                    self.assertEqual(first.mnemonic, 'MOVFF')
                    self.assertEqual(second.mnemonic, 'MOVFF')
                    self.assertEqual(first.fields['src'], at['read_cursor'])
                    self.assertEqual(second.fields['src'], at['read_cursor'] + 1)

    def test_the_read_cursor_sits_where_the_buffer_ends(self):
        """A closure on the two numbers rather than a second reading of them.

        The cursor is a `u16` immediately past the last byte of the circular buffer on both images,
        which is the compiler laying out one structure and is why the two addresses in this table
        cannot both be wrong in an arbitrary way.
        """
        for name, at in IMAGES.items():
            with self.subTest(image=name):
                self.assertEqual(at['read_cursor'], at['buffer_wrap'])


if __name__ == '__main__':
    unittest.main()
