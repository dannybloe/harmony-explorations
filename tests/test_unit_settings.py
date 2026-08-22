"""The per unit settings blocks a remote keeps in its own flash, `docs/findings.md` section 150.

Logitech's client names twelve 64 byte records above the application firmware, seven of them settings
of one kind or another, and `docs/host-client.md` recorded that as the answer to "which settings does a
remote have that its config does not carry". It is not the answer. Six of the seven are **erased
flash** on every remote on this bench, so the regions exist and nothing has ever written them.

That is worth a test rather than a note because it closes a route: a settings page in the application
edits base slot 15 of a configuration, and there is nothing per unit for it to read or write.

The reads are already in the lab. Every bench remote's internal pages were read over USB and verified
against its backup, so this needs no hardware and takes no risk.
"""
import unittest

import lab

#: The client's own record names, in order, from `0xF400` in the second internal page. Its map is for
#: arch 14; the two arch 12 units populate exactly the same four offsets, which is the evidence that
#: the layout is shared and only the address spelling differs. Client sourced and unconfirmed except
#: where a value below is measured.
RECORDS = [
    'unit serial',
    'key timing',
    'infrared capture silence',
    'unit settings',
    'keypad settings',
    'display settings',
    'battery calibration',
    'power settings',
    'other settings',
    'manufacturing identifier',
]

RECORD_BASE = 0xF400
RECORD_SIZE = 0x40

#: The seven the client calls settings, which is the question this file answers.
SETTINGS = ['key timing', 'infrared capture silence', 'unit settings', 'keypad settings',
            'display settings', 'power settings', 'other settings']

IMAGES = ('one_page_ff', 'one_spare_page_ff', 'h600_page_ff')


def _record(data, name):
    at = RECORD_BASE + RECORDS.index(name) * RECORD_SIZE
    return data[at:at + RECORD_SIZE]


def _written(record):
    """Bytes that are neither erased flash nor zero, which is what "somebody wrote this" looks like."""
    return [(i, b) for i, b in enumerate(record) if b not in (0x00, 0xFF)]


class ThePerUnitSettingsBlocksAreEmpty(unittest.TestCase):
    def test_every_record_is_addressable_in_every_page(self):
        # The guard that makes the rest mean something: a page too short would give empty records and
        # every claim below would pass by accident.
        lab.require(*IMAGES)
        for name in IMAGES:
            data = lab.load(name)
            self.assertEqual(len(data), 0xFFFE, name)
            for record in RECORDS:
                self.assertEqual(len(_record(data, record)), RECORD_SIZE, f'{name}: {record}')

    def test_six_of_the_seven_settings_records_are_erased_flash(self):
        """The finding. Nothing has ever written them, on any remote here."""
        lab.require(*IMAGES)
        empty = [r for r in SETTINGS if r != 'power settings']
        self.assertEqual(len(empty), 6)
        for name in IMAGES:
            data = lab.load(name)
            for record in empty:
                self.assertEqual(_written(_record(data, record)), [],
                                 f'{name}: {record} has something in it after all')

    def test_power_settings_holds_one_byte_on_arch_12_and_nothing_on_arch_14(self):
        """The seventh, and the one byte in it is a value section 105 left unexplained.

        94 at offset 0, on both Harmony Ones and on neither the Harmony 600. Section 105 read the same
        value at `0x01F5C0` from the firmware side, fetched by the helper that reads the battery scale,
        and could not say what consumed it. The client's label for that address is `power settings`,
        which is a name rather than a reading and is recorded as such.
        """
        lab.require(*IMAGES)
        for name in ('one_page_ff', 'one_spare_page_ff'):
            self.assertEqual(_written(_record(lab.load(name), 'power settings')), [(0, 94)], name)
        self.assertEqual(_written(_record(lab.load('h600_page_ff'), 'power settings')), [],
                         'the Harmony 600 has nothing there')

    def test_the_records_that_are_populated_are_the_same_three_everywhere(self):
        """The control on the claim above: the page is not simply blank.

        If it were, "six settings records are empty" would be true and would say nothing. Three records
        carry something on every unit, and the two arch 12 units carry a fourth.
        """
        lab.require(*IMAGES)
        for name in IMAGES:
            data = lab.load(name)
            populated = [r for r in RECORDS if _written(_record(data, r))]
            expected = ['unit serial', 'battery calibration', 'manufacturing identifier']
            if name != 'h600_page_ff':
                expected = ['unit serial', 'battery calibration', 'power settings',
                            'manufacturing identifier']
            self.assertEqual(populated, expected, name)


if __name__ == '__main__':
    unittest.main()
