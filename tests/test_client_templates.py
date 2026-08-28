"""
Logitech's own protocol templates, section 197.

The mirrored desktop client carries a per skin directory of XML files that **state** the USB
protocol: the command bytes, the field widths, the byte order, the response tags and the addresses.
Twenty three skins, including three of the four architectures this project reads.

Why this file matters more than its size suggests: `packages/usb` was derived clean-room from the
firmware, and these templates are the vendor's own specification of the same thing. So the two can
be compared, and the Harmony One is the calibration case where our answer is already known. A
disagreement here would be the strongest possible signal about our protocol work; agreement is the
strongest available confirmation short of hardware.

The templates are **client sourced** under decision 2. Nothing here adopts a number from them; each
test either compares them against something this project derived independently, or records what they
state about a family we have no other source for.
"""
import re
import unittest

import lab

#: Skin to the architecture the template declares, and Logitech's own codename for the remote.
#: Read out of the files rather than typed: `make` has no target for this, so the test is the record.
DECLARED = {
    68: (9, 'Harmony 510'),
    54: (12, 'Harmony One'),
    78: (16, 'Pepsi'),
    104: (16, 'Templeton'),
    99: (18, 'Juniper'),
}

#: What the Harmony One's template says the protocol is. Every one of these is also derived in
#: `packages/usb`, from the firmware, with no knowledge of this file.
ONE_TEMPLATE = (54, 'identifyremote.xml')


def _description(text, required=True):
    """The attributes of the description element that actually declares an architecture.

    Not simply the first one: skin 68's file opens with a comment only element, `Old HID Harmony
    Remotes - before Molson!`, and taking the first match read that as the remote's description and
    found no architecture at all. The skin is spelled `skinid` on some and `modelid` on others.
    """
    for attrs in re.findall(r'<remotedescription([^>]*)>', text):
        found = {k: v for k, v in re.findall(r'(\w+)="([^"]*)"', attrs)}
        if 'architectureid' in found:
            if 'skinid' not in found and 'modelid' in found:
                found['skinid'] = found['modelid']
            return found
    if required:
        raise AssertionError('no remotedescription declares an architectureid')
    return None


class TheTemplatesDeclareAnArchitecturePerSkin(unittest.TestCase):
    def test_the_declared_architecture_and_codename(self):
        """Scans a skin's whole directory, because not every file declares one.

        Skin 68's `identifyremote.xml` carries a comment only description and its architecture is
        stated in its four other files. So the claim is per skin rather than per file, and asserting
        the files agree is a check the per file version could not make.
        """
        if not lab.template_skins():
            self.skipTest('no mirrored client in the lab')
        for skin, (arch, codename) in sorted(DECLARED.items()):
            with self.subTest(skin=skin):
                declared = set()
                codenames = set()
                for name in lab.template_names(skin):
                    found = _description(lab.template(skin, name), required=False)
                    if found:
                        declared.add(int(found['architectureid']))
                        codenames.add(found.get('comment'))
                self.assertEqual(declared, {arch},
                                 'the files of one skin should agree on its architecture')
                self.assertIn(codename, codenames)

    def test_the_population_is_stated(self):
        """Twenty three skins, so a mirror that gained or lost one moves this number in the diff."""
        skins = lab.template_skins()
        if not skins:
            self.skipTest('no mirrored client in the lab')
        self.assertEqual(len(skins), 23)
        for skin in DECLARED:
            self.assertIn(skin, skins)

    def test_the_two_architectures_we_read_code_on_agree_with_our_own_reading(self):
        """The calibration case: arch 12 and arch 9 are ours, derived from firmware."""
        lab.require_templates((54, 'identifyremote.xml'), (68, 'connectivity.xml'))
        self.assertEqual(int(_description(lab.template(54, 'identifyremote.xml'))['architectureid']),
                         12, 'the Harmony One is architecture 12 here and in docs/findings.md')
        self.assertEqual(int(_description(lab.template(68, 'connectivity.xml'))['architectureid']),
                         9, 'the Harmony 510 shares the Harmony 525 architecture')


class TheVendorStatesTheProtocolWeDerived(unittest.TestCase):
    """Four independent points of our USB protocol, stated by Logitech for the Harmony One."""

    def setUp(self):
        lab.require_templates(ONE_TEMPLATE)
        self.text = lab.template(*ONE_TEMPLATE)

    def _command(self, cid):
        m = re.search(r'<commandbuilder id="%s".*?</commandbuilder>' % cid, self.text, re.S)
        self.assertIsNotNone(m, 'no command %r in the template' % cid)
        return m.group(0)

    def test_read_flash_is_0x50_with_a_24_bit_address_and_a_16_bit_count(self):
        from harmony import usbdesc  # noqa: F401  (keeps the import surface honest)
        body = self._command('read_guid')
        self.assertIn('<byte>0x50</byte>', body)
        # Widths and byte order, which is the half a command number alone would not pin.
        self.assertRegex(body, r'id="address" length="3" encode="big\.endian"')
        self.assertRegex(body, r'id="size" length="2" encode="big\.endian"')

    def test_the_command_number_equals_the_one_packages_usb_derived(self):
        """Reads the number out of the TypeScript rather than restating it, so the two cannot drift."""
        with open('packages/usb/src/protocol.ts', encoding='utf-8') as fh:
            src = fh.read()
        m = re.search(r'export const READ_FLASH = (0x[0-9a-fA-F]+);', src)
        self.assertIsNotNone(m, 'READ_FLASH is no longer declared where this test looks')
        self.assertEqual(int(m.group(1), 16), 0x50)
        self.assertIn('<byte>0x%02X</byte>' % int(m.group(1), 16), self._command('read_guid'))

    def test_a_read_flash_ends_with_f0_then_the_command_byte(self):
        """Section 94's response tag, stated by the vendor as a check on the last packet."""
        body = self._command('read_guid')
        self.assertRegex(body, r'checkvalues value="F0" index="last" position="0" length="1"')
        self.assertRegex(body, r'checkvalues value="50" index="last" position="1"')

    def test_reset_usb_is_the_escape_byte_then_one(self):
        """Section 97: `0xE0 0x01` clears the gate and is not a reset."""
        body = self._command('reset_usb')
        self.assertIn('<byte>0xE0</byte>', body)
        self.assertIn('<byte>0x01</byte>', body)

    def test_the_identity_block_address_matches_the_page_we_measured_it_on(self):
        """`reference/checksums.md` puts the 64 byte identity block on the 0xFF page."""
        d = _description(self.text)
        self.assertIn('0xFFF400', self.text)
        self.assertIn('0x40', self.text)
        self.assertEqual(int(d['skinid']), 54)


class TheTouchSpeaksAFileProtocol(unittest.TestCase):
    """The only source this project has for the file based family, section 193's open question."""

    def setUp(self):
        lab.require_templates((99, 'getdeviceinfo.xml'))
        self.text = lab.template(99, 'getdeviceinfo.xml')

    def test_it_opens_a_path_and_gets_a_handle(self):
        self.assertIn('<byte type="service.id">0xFF</byte>', self.text)
        self.assertIn('<byte type="command.id">0x01</byte>', self.text)
        self.assertIn('/rf/deviceinfo', self.text)
        # The reply carries a handle and a big endian size, which is what makes it a file protocol
        # rather than an address protocol.
        self.assertRegex(self.text, r'setvalues key="int::file\.handle"')
        self.assertRegex(self.text, r'setvalues key="int:BE::file\.size"')

    def test_reading_is_a_second_command_taking_that_handle(self):
        self.assertIn('<byte type="command.id">0x04</byte>', self.text)
        self.assertIn('##file.handle##', self.text)

    def test_no_flash_address_appears_anywhere_in_it(self):
        """Section 193's claim, made executable: this family names files, not addresses."""
        self.assertNotIn('readflashinterpreter', self.text)
        self.assertNotIn('address.guid', self.text)


class TheClientSplitsThreeArchitecturesFromTheRest(unittest.TestCase):
    def test_the_legacy_list_is_exactly_the_three_this_project_reads(self):
        """Logitech's own grouping, and it is our target set: arch 9, 12 and 14."""
        src = lab.load('desktop_webapp_main').decode('utf-8', 'replace')
        m = re.search(r'supportedLegacyArchitectures=\[([0-9,]+)\]', src)
        self.assertIsNotNone(m, 'the legacy architecture list is no longer in the bundle')
        self.assertEqual(sorted(int(x) for x in m.group(1).split(',')), [9, 12, 14])

    def test_there_are_exactly_two_protocols(self):
        src = lab.load('desktop_webapp_main').decode('utf-8', 'replace')
        self.assertIn('{Hid:0,Molson:1}', src.replace(' ', ''))


if __name__ == '__main__':
    unittest.main()
