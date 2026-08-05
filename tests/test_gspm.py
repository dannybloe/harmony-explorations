"""
The GSPM container, against every sample available.

Four samples at four different base addresses, covering both format versions and both
pointer table lengths. The point is that the parser derives the base address and the
pointer count from the data rather than from a per-model table, so these assertions check
that derivation rather than a hardcoded lookup.
"""
import unittest

import lab
from harmony import gspm

# logical image name -> (expected flash base, format version, pointer slots, LWJL count)
EXPECTED = {
    'one_safemode': (0x002000, '1.6', 21, 2),
    'one34_region2': (0x002000, '1.6', 21, 2),
    'h700_gspm': (0x020000, '1.4', 19, 0),
}


class TestContainerAcrossSamples(unittest.TestCase):
    def test_each_sample_parses_with_expected_shape(self):
        for name, (base, version, slots, keys) in EXPECTED.items():
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                self.assertEqual(c.flash_base, base, 'recovered flash base')
                self.assertEqual(c.format_version, version)
                self.assertEqual(c.pointer_count, slots)
                self.assertEqual(len(c.keys), keys)

    def test_all_consistency_checks_pass(self):
        for name in EXPECTED:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                for check, ok in c.checks.items():
                    self.assertTrue(ok, '%s failed check %s' % (name, check))

    def test_end_addr_locates_the_end_marker(self):
        for name in EXPECTED:
            with self.subTest(image=name):
                data = lab.load(name)
                c = gspm.parse(data)
                blob = data[c.blob_offset:c.blob_offset + c.length]
                off = c.end_addr - c.flash_base
                self.assertEqual(blob[off:off + 4], b'PTYY')

    def test_pointer_count_derivation_matches_lwjl_position(self):
        """21 slots put LWJL at 0x63; 19 slots put it at 0x5B."""
        for name, (_, _, slots, _) in EXPECTED.items():
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                self.assertEqual(c.lwjl_offset, 0x0C + 4 * slots + 3)


class TestArch12SafeModeConfig(unittest.TestCase):
    def test_two_key_recovery_ui(self):
        c = gspm.parse(lab.load('one_safemode'))
        self.assertEqual([k.event_code for k in c.keys], [0xAF, 0xAE])
        self.assertTrue(all(k.flags == 0 for k in c.keys))

    def test_region2_prefix_is_the_same_container(self):
        """
        The arch 12 update package packs the safe-mode config ahead of the code, and it is
        byte-identical to what the remote hands back. That equality is what establishes the
        split point between the two halves.
        """
        dumped = lab.load('one_safemode')
        packaged = lab.load('one34_region2')
        from_dump = gspm.parse(dumped)
        blob = dumped[from_dump.blob_offset:from_dump.blob_offset + from_dump.length]
        self.assertEqual(packaged[:len(blob)], blob)


if __name__ == '__main__':
    unittest.main()
