#!/usr/bin/env python3
"""Whether the Harmony 300 and 350's 1.4 firmware ever acts on the skin: it reports it and nothing else.

The question: skins 78 and 79 (the Harmony 300) and 104 (the Harmony 350) are named by one firmware
package, so is the 300 the 350 with other printing, a configuration composed for one behaving the same on
the other? That holds if no code in the image branches on the skin, and this file is the search for such
code, with the method stated for each negative.

## Where the image gets the unit's skin

**One byte of a record in internal flash.** The file table's `/sys/sku` row is the 64 bytes at
`0x01F4C0` (`tests/test_harmony_350_boot.py`, `tests/test_harmony_350_firmware.py`), and the skin is its
byte 2, `0x01F4C2`. The getter is `0x14626`: it loads `0xC2`, `0xF4`, `0x01` into the table read address
at `0xF2` to `0xF4`, calls the table reader `0x1AA8E` and returns the low byte. The two unit reads in the
lab agree with it, `0x4F` on the Harmony 300 and `0x68` on the Harmony 350, each the byte `/sys/sysinfo`
states.

The record's first two bytes are a stored word that the check command compares with the host's, through
`0x14B96`, which is only a two byte table read at the address the caller sets. Its bytes 3 to 6 are
`00 00 00 02` on the unit that states 79 and `00 00 00 01` on the one that states 104, a value nothing
here reads (below).

## Every reader, and what each does

Search one, **the getter's callers**, `trace.xrefs` over the whole image for `0x14626`: three, and each
stores the byte straight into a reply and does nothing else.

| call | what it is | the byte goes to |
|---|---|---|
| `0x13216` | the `/sys/sysinfo` builder, after the string `\\nskin 0x` at `0x920C` | `0x3B4`, the argument of the hex formatter `0x192C6` |
| `0x1389A` | a second builder of the same identity fields, a few hundred bytes on | `0x3B4`, the same |
| `0x0F258` | one of five one byte replies in the reply dispatcher, entered from `0xEBB4` (the others are `0xF1C6`, `0xF1EC`, `0xF220` and `0xF290`) | `0xC00`, then the reply buffer at `0x2C8` |

Search two, **every literal that forms an address in the record's last half**: a byte scan of the image
for `MOVLW 0xF4` with a `MOVLW 0x01` and a `MOVLW` of `0xC0` to `0xFF` within a dozen bytes, which is how
this code builds `0x01F4C0` to `0x01F4FF` and how the getter builds `0x01F4C2`. It finds four sites, and
the other `0xF4` literals are `0x01F400` forms (the unit's GUID record), `0x01F440` and `0x01F480` (two
records the scan routine at `0x1A760` reads, called from `0x181AA` and from the keypad start up at
`0x188F2`) and the constant 500 at `0x16038`. The four: the getter, the check command's read of the
record's word (`0xD776`, handle 9), and two sites inside one routine, below. **What would have been found**: any
routine that fetched the skin by building its address, which is the only way the code reaches the record
other than the generic file read, and that serves bytes to the host and compares nothing.

Search three, **the routine at `0x15288` is the one that does branch on it**. It reads the record's skin
at `0x01F4C2`, returns 0 when it equals the byte at `0x348`, and runs a chain at `0x152C0` whose cases
decode (`chains.chain_table`) as `0xFF`, `0x48` and `0x4F`: a blank record, skin 72 and skin 79. A second
test at `0x1530E` sends skin 72 and skin 79 down a branch that sets a four byte value to 2 where every
other skin gets 1, and the routine then builds a 64 byte record, skin at byte 2, and programs it at
`0x01F4C0`. That is a record writer, and it is **unreachable as far as this search goes**: the
cluster it sits in, `0x15098` to `0x15470`, has no `CALL`, `GOTO`, `RCALL` or `BRA` into its entry points
from outside, no `MOVLW` triple, no raw three byte address and no word address of any of them anywhere
in the image; `trace.xrefs` over every even address of the cluster finds only branches between its own
parts and one `CALL` from outside, at `0x15C76`, to a switch on `0x33E` that the writer also calls. The safe mode image read off a Harmony 350 holds the same routine at `0x3B52`,
with the same silence. **What this does not exclude**: the compiler's call through a pointer, `0x19F1C`,
jumps to a three byte address popped off a software stack, entered from one `RCALL` at `0x19FC8`; the
stack's contents were not enumerated, so a pointer to the cluster pushed from data would not have been
seen. That is the one open door in the negative.

Search four, **the other flash reads and the hardware**: `0x1461C` returns the high nibble of `PORTD`,
which `/sys/sysinfo` states as `hw_ver` and which is 0 on both bench units, so the two models' boards
read the same straps; its callers are `0xF220`, `0x13584` and `0x1379A`, replies again.

## The configuration's own skin

A configuration states its model in raw slot 1, `10 10 <skin> 0D 00 00 00` on this architecture: `0x68`
in the three Harmony 350 files and `0x4F` in the two Harmony 300 files here, **so the 300's configuration
states 79 where `reference/config-format/header-records.md` said both models state 104**. The firmware
never reads it: the section seeker's fourteen callers load raw slots 3 to 12 and the validator reads
header offsets 0, 4 and `0x47`, `tests/test_harmony_350_slots.py`, restated below, and raw slot 1's
pointer sits at `0x0F`. `EZHex`'s `INTENDEDVERSION` skin is the host's, and a read file has no such
header.

## The answer, and what it rests on

**In the 1.4 image read, no reachable code acts on the skin.** The skin is reported three ways and the
only branch on it is in a record writer nothing calls. So the keypad scan, the held event, the file
write path and the configuration validator treat a unit that states 79 exactly as one that states 104,
and nothing caps devices, infrared groups, favourites or activities by skin in the firmware: the caps
this family states per skin, in `reference/architectures/harmony-300-350/README.md`, are Logitech's
service's.

**The image is not known to be what a Harmony 300 runs.** Its USB device descriptor is a constant in
flash at `0x1AC04`: the request handler loads that address into `0x3E1` to `0x3E3` at `0x17924` and the
copy loop at `0x190B0` moves it to the endpoint buffer byte for byte, with no byte of it altered on the
way. Its `bcdDevice` is `0x1104`, the Harmony 350's, and the byte pair `0x78 0x10` appears nowhere in the
image. A Harmony 300 enumerates as `0x1078` (`reference/remotes/harmony-300/usb.md`), so whatever a 300
runs differs from this image in at least that word; the package's manifest naming skins 78, 79 and 104 is
Logitech's word that it is meant for all three, not a read off a 300, whose application nobody has read.

**Which architectures.** Arch 16 alone, one image: the Harmony 350's package, read as `h350_code`, and
the Harmony 350's safe mode image for the one cross check. Nothing is said of the 300's own flash, of
the bootloader (which builds no address in that range), or of any other family.

**Sources checked first.** Logitech's client, `work/myharmony/src/`: not re-read for this question
beyond what `test_harmony_350_recovery.py` cites, since it builds no firmware and cannot say what the
firmware does with a skin. The firmware (this file). `reference/` and the archive: `docs/findings.md` sections 195 and 264 (the
descriptor against `/sys/sysinfo`) and 259 (the seeker), `tests/test_harmony_350_slots.py`,
`test_harmony_350_boot.py`, `test_harmony_350_file_write.py`, `test_harmony_350_keys.py` and
`test_harmony_350_long_press.py`, which read the same image for other questions and found no skin.

**Standing.** Read in the firmware, with two unit reads for the record's bytes and the strap, and
configurations for slot 1. Nothing was sent to a remote.
"""
import os
import re
import unittest

import lab
from harmony.pic18 import chains, isa, trace
from test_harmony_350_slots import BASE, CONFIGS, HEADER_READ, SEEKER, _Config, _code, _text

SKIN_GETTER = 0x14626
RECORD_WRITER = 0x15288
RECORD_WRITER_CHAIN = 0x152C0
STRAP_GETTER = 0x1461C
POINTER_CALL = 0x19F1C

DESCRIPTOR = 0x1AC04
DESCRIPTOR_BCD = 0x1AC10

SAFEMODE_BASE = 0x1000
SAFEMODE_WRITER = 0x3B52

#: The one place each unit's own reads are kept, under the lab, named by what they are.
H300_READ = 'reads/20261031T1205Z-h300-backup'
H350_READ = 'reads/20261027T1700Z-h350-backup'


def _unit_file(directory, name):
    """A unit's read file, or a clean skip: these are bench reads that a clone does not have."""
    if not lab.LAB:
        raise unittest.SkipTest('no lab found; set HARMONY_LAB')
    path = os.path.join(lab.LAB, directory, name)
    if not os.path.isfile(path):
        raise unittest.SkipTest('no %s/%s in the lab' % (directory, name))
    with open(path, 'rb') as fh:
        return fh.read()


def _sysinfo_skin(directory):
    text = _unit_file(directory, 'sys_sysinfo.bin').decode('ascii', 'replace')
    return int(re.search(r'skin 0x([0-9A-Fa-f]+)', text).group(1), 16)


def _literal_sites(code, base):
    """Aligned `MOVLW 0xF4` sites with a `MOVLW 0x01` and a `MOVLW 0xC0`..`0xFF` within a dozen bytes."""
    sites = []
    for m in re.finditer(rb'\xf4\x0e', code):
        i = m.start()
        if i % 2:
            continue
        window = code[max(0, i - 12):i + 14]
        low = [window[j] for j in range(0, len(window) - 1) if window[j + 1] == 0x0E and 0xC0 <= window[j] != 0xF4]
        if b'\x01\x0e' in window and low:
            sites.append(base + i)
    return sites


class TheSkinIsOneByteOfTheSkuRecord(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_the_getter_reads_byte_2_of_the_record_at_0x1f4c0(self):
        self.assertEqual(_text(self.code, SKIN_GETTER, 8),
                         ['MOVLB 0x0', 'MOVLW 0xc2', 'MOVWF 0x0f2', 'MOVLW 0xf4', 'MOVWF 0x0f3',
                          'MOVLW 0x01', 'MOVWF 0x0f4', 'CALL 0x1aa8e'])
        self.assertEqual(0x01F4C0 + 2, 0x01F4C2, 'the file table row is 0x01F4C0, the getter reads +2')

    def test_each_unit_states_the_byte_its_record_holds_at_offset_2(self):
        """The calibration: the byte the getter fetches is the skin each unit reports, on two models."""
        for directory, skin in ((H300_READ, 0x4F), (H350_READ, 0x68)):
            with self.subTest(directory):
                record = _unit_file(directory, 'sys_sku.bin')
                self.assertEqual(len(record), 64)
                self.assertEqual(record[2], skin)
                self.assertEqual(_sysinfo_skin(directory), skin)

    def test_the_record_ends_in_a_value_that_differs_between_the_two_skins_and_is_read_by_nothing(self):
        self.assertEqual(_unit_file(H300_READ, 'sys_sku.bin')[3:7], bytes([0, 0, 0, 2]))
        self.assertEqual(_unit_file(H350_READ, 'sys_sku.bin')[3:7], bytes([0, 0, 0, 1]))
        self.assertEqual(set(_unit_file(H300_READ, 'sys_sku.bin')[7:]), {0xFF})
        # Read by nothing: the only literals building an address in 0x01F4C0 to 0x01F4FF are listed below.

    def test_the_getter_has_three_callers_and_each_only_stores_the_byte(self):
        callers = sorted(ref.addr for ref in trace.xrefs(self.code, BASE, [SKIN_GETTER])[SKIN_GETTER])
        self.assertEqual(callers, [0x0F258, 0x13216, 0x1389A])
        # After the call the byte goes into a reply argument and nothing tests it.
        self.assertEqual(_text(self.code, 0x13216, 3), ['CALL 0x14626', 'MOVLB 0x3', 'MOVWF 0x3b4'])
        self.assertEqual(_text(self.code, 0x1389A, 3), ['CALL 0x14626', 'MOVLB 0x3', 'MOVWF 0x3b4'])
        self.assertEqual(_text(self.code, 0x0F258, 12)[:5],
                         ['CALL 0x14626', 'MOVLB 0xc', 'MOVWF 0xc00', 'MOVFF 0x331,0x2be', 'MOVFF 0x332,0x2bf'])
        self.assertEqual(_text(self.code, 0x0F27E, 1), ['MOVFF 0xc00,0x2c8'])
        # The sysinfo builder's string before the first call is the skin's own name.
        self.assertEqual(self.code[0x920C - BASE:0x920C - BASE + 9], b'\nskin 0x\x00')

    def test_the_first_call_site_is_the_sysinfo_skin_field_and_the_dispatcher_entry_is_a_reply(self):
        entries = trace.xrefs(self.code, BASE, [0xF258])[0xF258]
        self.assertEqual([ref.addr for ref in entries], [0xEBB4])

    def test_four_sites_build_an_address_in_the_records_last_half_and_no_other_does(self):
        self.assertEqual(_literal_sites(self.code, BASE), [0xD77A, 0x1462C, 0x1528E, 0x153B2])

    def test_the_check_commands_read_of_the_record_is_a_word_read_not_a_test(self):
        listing = _text(self.code, 0xD774, 9)
        self.assertEqual(listing[:7], ['MOVLB 0x0', 'MOVLW 0xc0', 'MOVWF 0x0dc', 'MOVLW 0xf4',
                                       'MOVWF 0x0dd', 'MOVLW 0x01', 'MOVWF 0x0de'])
        self.assertEqual(listing[7], 'CALL 0x14b96')
        self.assertEqual(_text(self.code, 0x14B96, 4),
                         ['MOVFF 0x0dc,0x0f2', 'MOVFF 0x0dd,0x0f3', 'MOVFF 0x0de,0x0f4', 'GOTO 0x1aa8e'])

    def test_the_strap_the_board_reports_is_a_port_nibble_and_reported_only(self):
        self.assertEqual(_text(self.code, STRAP_GETTER, 3), ['SWAPF PORTD,W', 'ANDLW 0x0f', 'RETURN'])
        callers = sorted(ref.addr for ref in trace.xrefs(self.code, BASE, [STRAP_GETTER])[STRAP_GETTER])
        self.assertEqual(callers, [0x0F220, 0x13584, 0x1379A])
        # Both bench units state it as 0, so the two boards' straps read the same.
        for directory in (H300_READ, H350_READ):
            with self.subTest(directory):
                self.assertIn(b'hw_ver 0x00', _unit_file(directory, 'sys_sysinfo.bin'))


class TheOnlyBranchOnTheSkinIsInARecordWriterNothingCalls(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_the_chain_names_a_blank_record_skin_72_and_skin_79(self):
        cases = chains.chain_table(self.code, BASE, RECORD_WRITER_CHAIN)
        self.assertEqual(cases, {0xFF: 0x152F8, 0x48: 0x152E6, 0x4F: 0x152E6})

    def test_skins_72_and_79_set_a_value_to_2_where_the_others_get_1(self):
        self.assertEqual(_text(self.code, 0x1530C, 6),
                         ['MOVF 0x48,B,W', 'XORLW 0x48', 'BZ 0x15316', 'XORLW 0x07', 'BNZ 0x15322', 'MOVLB 0xd'])
        self.assertEqual(_text(self.code, 0x15316, 2), ['MOVLB 0xd', 'MOVLW 0x02'])
        self.assertEqual(_text(self.code, 0x15300, 2), ['MOVLW 0x01', 'MOVWF 0x4e,B'])

    def test_it_programs_a_record_at_0x1f4c0_with_the_skin_at_byte_2(self):
        self.assertEqual(_text(self.code, 0x153AE, 6), ['MOVLW 0xc0', 'MOVWF 0x00,B', 'MOVLW 0xf4',
                                                         'MOVWF 0x01,B', 'MOVLW 0x01', 'MOVWF 0x02,B'])
        # The skin lands at record byte 2: buffer 0xD03 + 2, filled from 0x348 at 0x15362.
        self.assertEqual(_text(self.code, 0x15352, 2), ['MOVLW 0x02', 'MOVWF 0x44,B'])
        self.assertEqual(_text(self.code, 0x15362, 1), ['MOVFF 0x348,INDF0'])

    def test_nothing_in_the_image_transfers_to_it_or_names_its_address(self):
        refs = trace.xrefs(self.code, BASE, [RECORD_WRITER])[RECORD_WRITER]
        self.assertEqual(refs, [])
        # Every even address of the cluster: the only transfers into it come from inside it.
        cluster = range(0x15098, 0x15474, 2)
        outside = [(target, ref.addr) for target, found in trace.xrefs(self.code, BASE, cluster).items()
                   for ref in found if not 0x15090 <= ref.addr < 0x15474]
        self.assertEqual(sorted(outside), [(0x150DA, 0x15C76)],
                         'the one outside caller, 0x15C76, reaches 0x150DA, a switch on the byte at 0x33E '
                         'that the writer itself calls and that never transfers to the writer')
        low, high, upper = RECORD_WRITER & 0xFF, (RECORD_WRITER >> 8) & 0xFF, RECORD_WRITER >> 16
        self.assertEqual(self.code.find(bytes([low, high, upper])), -1, 'no raw three byte pointer')
        self.assertEqual(self.code.find(bytes([(RECORD_WRITER >> 1) & 0xFF, (RECORD_WRITER >> 9) & 0xFF])), -1,
                         'no word address, little endian')
        movlw = [i for i in range(0, len(self.code) - 1, 2)
                 if self.code[i] == low and self.code[i + 1] == 0x0E
                 and bytes([high, 0x0E]) in self.code[max(0, i - 20):i + 20]]
        self.assertEqual(movlw, [], 'no MOVLW pair that loads the address')

    def test_the_computed_call_helper_has_one_caller_and_its_pointers_were_not_enumerated(self):
        """The open door, kept visible: a pointer pushed from data would not be seen by any search here."""
        self.assertEqual(_text(self.code, POINTER_CALL, 6),
                         ['MOVF TBLPTRU,W', 'MOVWF PCLATU', 'MOVF TBLPTRH,W', 'MOVWF PCLATH',
                          'MOVF TBLPTRL,W', 'MOVWF PCL'])
        callers = [ref.addr for ref in trace.xrefs(self.code, BASE, [POINTER_CALL])[POINTER_CALL]]
        self.assertEqual(callers, [0x19FC8])

    def test_the_safe_mode_image_holds_the_same_routine_equally_unreferenced(self):
        lab.require('h350_safemode')
        with open(lab.path('h350_safemode'), 'rb') as fh:
            safe = fh.read()
        self.assertEqual(safe[SAFEMODE_WRITER - SAFEMODE_BASE:SAFEMODE_WRITER - SAFEMODE_BASE + 4],
                         bytes.fromhex('0d01c20e'))
        self.assertEqual(trace.xrefs(safe, SAFEMODE_BASE, [SAFEMODE_WRITER])[SAFEMODE_WRITER], [])

    def test_the_bootloader_builds_no_address_in_that_range(self):
        lab.require('h350_bootloader')
        with open(lab.path('h350_bootloader'), 'rb') as fh:
            boot = fh.read()
        self.assertEqual(_literal_sites(boot, 0), [])


class TheDescriptorIsAConstantThatNamesSkin104(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_the_device_descriptor_is_in_flash_and_states_0x1104(self):
        at = DESCRIPTOR - BASE
        self.assertEqual(self.code[at:at + 12].hex(), '12010002000000086d0424c1')
        self.assertEqual(self.code[DESCRIPTOR_BCD - BASE:DESCRIPTOR_BCD - BASE + 2], b'\x04\x11')
        self.assertEqual(self.code.find(bytes([0x78, 0x10])), -1, 'the 300 enumerates 0x1078: not in this image')
        self.assertEqual(self.code.count(bytes.fromhex('12010002000000086d0424c1')), 1)

    def test_the_request_handler_points_at_it_and_the_copy_loop_changes_no_byte(self):
        self.assertEqual(_text(self.code, 0x17918, 12),
                         ['MOVLB 0x3', 'MOVLW 0x01', 'MOVWF 0x3e0', 'MOVLB 0x3', 'MOVLW 0x04', 'MOVWF 0x3e1',
                          'MOVLW 0xac', 'MOVWF 0x3e2', 'MOVLW 0x01', 'MOVWF 0x3e3', 'MOVLW 0x12', 'BRA 0x17a50'])
        self.assertEqual(_text(self.code, 0x190B0, 8),
                         ['MOVFF 0x3e1,TBLPTRL', 'MOVFF 0x3e2,TBLPTRH', 'MOVFF 0x3e3,TBLPTRU', 'TBLRD*',
                          'MOVF TABLAT,W', 'MOVFF 0x3e4,FSR0L', 'MOVFF 0x3e5,FSR0H', 'MOVWF INDF0'])
        loads = [i for i in range(0, len(self.code) - 1, 2)
                 if self.code[i] == 0xAC and self.code[i + 1] == 0x0E
                 and bytes([0x04, 0x0E]) in self.code[max(0, i - 8):i]]
        self.assertEqual([BASE + i for i in loads], [0x17924], 'one place loads the descriptor address')


class TheConfigurationsSkinIsNeverSought(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_no_seek_and_no_header_read_reaches_raw_slot_1(self):
        literals = set()
        for ref in trace.xrefs(self.code, BASE, [SEEKER])[SEEKER]:
            literals.add(isa.decode(self.code, ref.addr - 4 - BASE, BASE).fields['k'])
        self.assertEqual(sorted(literals), list(range(3, 13)))
        self.assertNotIn(1, literals)
        offsets = set()
        for ref in trace.xrefs(self.code, BASE, [HEADER_READ])[HEADER_READ]:
            if ref.addr == 0x10BE0:
                continue
            before = _text(self.code, ref.addr - 2, 1)[0]
            offsets.add(0 if before.startswith('CLRF') else
                        isa.decode(self.code, ref.addr - 4 - BASE, BASE).fields['k'])
        self.assertEqual(offsets, {0x00, 0x04, 0x47})
        self.assertNotIn(0x0B + 4 * 1, offsets)

    def test_the_configurations_state_their_own_models_skin(self):
        lab.require(*CONFIGS)
        stated = {}
        for name in CONFIGS:
            c = _Config(name)
            at = c.pointer(1) - 0x020000
            stated[name] = c.blob[at:at + 7].hex()
        self.assertEqual(stated, {
            'h350_config': '1010680d000000',
            'h350_programmed_config': '1010680d000000',
            'h350_three_devices_config': '1010680d000000',
            'h300_config': '10104f0d000000',
            'h300_programmed_config': '10104f0d000000',
        })


if __name__ == '__main__':
    unittest.main()
