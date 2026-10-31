#!/usr/bin/env python3
"""The Harmony 300 and the Harmony 350 do not run one image: the application is one program linked twice
with one change, and the bootloader and safe mode image are different builds.

**The question.** `reference/architectures/harmony-300-350/firmware.md` said one program runs both models,
on Logitech's package manifest, whose `<INTENDED>` names skins 78, 79 and 104. That is Logitech's statement
about a package, not a measurement of what either remote runs, and until the 300 was read nobody had both.
On 31 October 2026 the three images a Harmony 300 serves as files, `/fw/normalmode`, `/fw/bootloader` and
`/fw/safemode`, were read off the bench unit read only, twice, byte for byte alike
(`reads/20261031T-h300-fw/` and `-second/`), and the same day the Harmony 350's application was read the
same way (`reads/20261031T-h350-fw-first/` and `-second/`). Both units report `fw_ver 1.4.0`. The 350's
bootloader and safe mode image are the earlier read in `reads/20261027T1929Z-h350-fw/`.

**Sources checked first.** `tests/test_harmony_350_firmware.py`, `test_harmony_350_boot.py`,
`test_harmony_350_delay.py`, `test_harmony_350_keys.py`, `test_harmony_350_skin.py` and `reference/
architectures/harmony-300-350/firmware.md` for what the routines are called; `src/harmony/firmware.py` for
the header; `docs/findings.md` sections 196 and 199 for the package and its file table. Logitech's client
was not consulted: this is a comparison of two images, and what each routine does was read earlier in the
350's. The constants (`0x7D`, the kind chain at `0x11EAE`, the descriptor at `0x1AC04`) were grepped in the
reference and the tests first, which is where the names below come from.

## What was measured

**1. The 350's package image is what a 350 runs.** The unit's `/fw/normalmode` is the first 73464 bytes of
`h350_code` byte for byte, and the package's last eight are `0xFF`. So the comparison is unit against unit,
not unit against package, and the eight bytes the remote does not serve are not a difference.

**2. The two applications are one program.** They differ in 37809 of 73464 bytes read straight across,
which is what a shift of up to ten bytes does to every address operand and to nothing else. Aligned by
instruction, with every address operand and every literal masked, the two images fall into ten runs of
identical instructions broken by eleven short stretches, each named in `EQUAL_RUNS` and `REWRITTEN`.
Shifts, 350 against 300, from the first byte of each run: 0 below `0x11356`, 2 at `0x11358`, 4 at
`0x1136E`, 8 at `0x1138A` and 10 from `0x11A90` on, the 350's addresses. Inside the runs 30579
instructions are byte for byte equal; 1083 `CALL` and `GOTO` differ only in their target, and every one of
them is the other's target moved by the shift of the place it points at; 54 relative branches differ because
the span they cross holds a shift, and each lands where the 300's lands after the same shift; 9 `MOVLW` carry
the low or high byte of a pointer into the descriptor block and each is the 300's value plus 10; one relative
branch targets the rewritten block and is read below. **Nothing else differs**: the walk raises on any
instruction whose bytes differ and is none of those, and on any pair that is not the same length.

**3. What genuinely differs, in the 350's addresses (the 300's are the same less the shift above).**

* **The header's checksum word and the entry point.** The checksum covers different bytes and verifies in
  both, over the stated length (73472) with the eight unserved bytes taken as `0xFF`, which is what the
  350's package holds there. The entry `GOTO` at offset `0xA` is `0x1AECA` in the 300 and `0x1AED4` in the
  350. The version byte is `0x14` in both, 1.4, and the stated length is the same, 73472 in both: **the
  300's code ends 10 bytes sooner and its image is padded with `0xFF` to that same stated length**.
* **The USB device descriptor's `bcdDevice`**: `0x1078` in the 300, at `0x1AC06`, and `0x1104` in the
  350, at `0x1AC10`, which is the enumeration each reports and no other byte of the descriptor, the
  product string `Harmony Remote 0-1.4.0` included. The six pointers into the descriptor block, the one in
  the code at `0x93B1` and the five of its table at `0x1ACC4`, differ by the shift only.
* **One routine, the arm of the action list dispatcher for `0x7D`, a send**, at `0x1134E` in the 350.
  Before it calls the send handler it maps the operand's high byte, the infrared group, to a send kind in
  `0x203`: group 0 and 3 stay 0 and 3, 1 becomes 2 and 2 becomes 1, **and anything above 3 becomes `0xFF`
  in the 300 and is `0xFF AND 3`, that is 3, in the 350**, whose build stores `kind AND 3` where the 300
  stores the kind as it stands (`ANDLW 0x03` at `0x11356`, `0x1136A` and `0x11384`). The kind selects, at
  `0x11EAE`, the firmware event `0x2D` for 0 and for anything not 1, 2 or 3, `0x2F` for 1, `0x2E` for 2 and
  `0x30` for 3, the four events entry 0 of every configuration of the family binds to a list switching one
  output pin (band `0xE9`). **So the two builds disagree for one input only, a `0x7D` whose group is 4 or
  more: the 300 raises group 0's event and the 350 group 3's.** `0x203` has three accesses in each image,
  its start up `SETF` at `0x10F98`, this store and the chain's read, so nothing else reads what the mask
  changes. **Not one `0x7D` of the five configurations of this family holds a group above 3**, measured
  below, so no configuration read exercises it.
* **A `CALL` where the 300 has an `RCALL`**, at `0x11A8C`: the same target, `0x112B0`, now out of an
  `RCALL`'s reach because of the ten bytes before it. That is a linker's relaxation and not a change.

So the 350's code is the 300's plus the mask, and nothing in either is absent from the other. Total
growth, 10 bytes: 2 for the first mask, 2 for the second with its `MOVLB`, 4 for the third with its `MOVLB`
and the move through `W`, and 2 for the `CALL`. The shift reaching exactly 10 is what `EQUAL_RUNS` asserts.

**4. The two bootloaders and the two safe mode images are different builds**, which is what
`reference/architectures/harmony-300-350/firmware.md` says now in place of a shared image.

* **Safe mode**: the 300's header states version **1.2** (byte 7 `0x12`) and its product string reads
  `Harmony Remote 4-1.2.0`, where the 350's reads 1.4 and `4-1.4.0`; the stated lengths are 25408 and 26048;
  both have the `HG` mark, and the 300's checksum verifies where the 350's cannot be checked, its last eight
  bytes being unread and not `0xFF` (`test_harmony_350_boot.py`). So **the two safe mode images differ in
  version as well as in model, and what is a model's difference and what a version's cannot be told
  apart on two images**. With RAM addresses, literals and branch targets masked the two listings differ in
  24 stretches, nine of replacement, thirteen of insertion and two of deletion: the header and descriptor
  words, one block of 709 instructions that sits `0xF46` higher in the 300, a stretch of 181 instructions,
  408 bytes, that the 350 holds at `0x3B52` and the 300 does not, and eleven smaller ones of up to 45
  instructions. The additions in the 350 include a block of state in bank 14 that holds 15000 and 1000,
  adds a pair of bytes from bank 13 to a counter and compares the sum with 1000. What it times is not read. Whether any of these is in the file protocol that
  carries a configuration, or only in start up, is not read.
* **Bootloader**: 1998 of 4096 bytes differ. Their start decision is the same, the keys `0x14` and `0x2C`
  and the `HG` test, but the build is not: one key of its restart combination differs: the 300's scan tests `PORTD` bit 3 with `PORTB`
  bit 4, code 53, as the application's does, where the 350's tests `PORTE` bit 4 with `PORTB` bit 7, code 20,
  and the rest of that routine is the same; the 350 carries a second
  serial bus routine, a byte exchange on `SSP2` at `0x0E6C` with its pin set up at `0x0E34`, that the 300's
  image has no counterpart of; the two set up their ports and the oscillator with different values (the 350's at
  `0x0D0A` to `0x0D5C`, the 300's at `0x0CEC` to `0x0D3A`); and the 300's start code makes `PORTB` bit 3 an
  output and sets it where the 350's makes `PORTG` bit 0 one and drives it as a counted pattern. What the
  pins are wired to is not read. RAM variables sit at other addresses in each. A bootloader has no header,
  so there is no version field to compare.

**5. Whether a configuration can tell.** The bootloader and safe mode run before the application and never
interpret a configuration's action lists; the application does, and it differs by the one send kind above.
In the five configurations of the family, 602 `0x7D` instructions between them, 79 to 154 in each, no group is above 3
(`test_the_five_configurations_hold_no_group_above_3`), so the one difference is not reached by any of them.
Logitech's service holds a Harmony 300 to four infrared groups and a Harmony 350 to eight
(`reference/architectures/harmony-300-350/README.md`, from the service's capabilities), so a configuration it
compiles for a 300 cannot reach the difference and one for a 350 with a fifth device or more can; what the
raised event does on a unit is not checked.

## What this does not settle

* **Which image Logitech's service serves a Harmony 300.** The 350's package is the one the lab holds;
  its manifest names skins 78, 79 and 104, and the 300 here runs a different build of the same version.
  Fetching the package by skin 78 or 79 would say whether the service serves the 300's build; not done.
* Which build is later. Both say 1.4.0 and the 350's carries the extra mask; nothing orders them.
* That a Harmony 300 of the other printing, skin 78, runs the 300's build: one European unit, skin 79.
* The safe mode and bootloader differences are listed and not read to the end; where an insertion sits in
  the file protocol is not traced.
* Nothing here was done to a unit but the file reads.

**Standing.** Read in the firmware, from the images as two units serve them. The addresses are the 350's
unless a sentence says the 300's. `h350_unit_code`, `h300_code`, `h300_bootloader` and `h300_safemode`
are named in `tests/lab.py` and `packages/lab/src/index.ts`, with paths, since `fw_bootloader.bin` is no
longer a unique name in the lab.
"""
import difflib
import re
import unittest

import lab
from harmony import firmware
from harmony.pic18 import chains, disasm, isa

BASE = 0x9000
SAFE_BASE = 0x1000

# Addresses in each application image, the 300's (A) and the 350's (B), both loaded at 0x9000. A run is a
# stretch of identical instructions, address operands and literals masked, as found by aligning the two
# decodings; `delta` is B's address less A's. The runs and the stretches between them tile both images.
EQUAL_RUNS = [  # (A start, A end, delta), as addresses
    (0x09002, 0x093B0, 0), (0x093B2, 0x11356, 0), (0x11356, 0x11366, 2), (0x1136A, 0x1137E, 4),
    (0x11382, 0x11A84, 8), (0x11A86, 0x1AC06, 10), (0x1AC08, 0x1ACBA, 10), (0x1ACBE, 0x1ACC0, 10),
    (0x1ACC4, 0x1ACC6, 10), (0x1ACC8, 0x1AEEE, 10),
]
REWRITTEN = [  # (A start, A end, B start, B end), as addresses
    (0x09000, 0x09002, 0x09000, 0x09002),      # the header checksum
    (0x093B0, 0x093B2, 0x093B0, 0x093B2),      # one byte of a pointer into the descriptor block
    (0x11356, 0x11356, 0x11356, 0x11358),      # the 350's first ANDLW 0x03
    (0x11366, 0x1136A, 0x11368, 0x1136E),      # the kind 0 and 3 case
    (0x1137E, 0x11382, 0x11382, 0x1138A),      # the store into 0x203
    (0x11A84, 0x11A86, 0x11A8C, 0x11A90),      # RCALL 0x112B0 against CALL 0x112B0
    (0x1AC06, 0x1AC08, 0x1AC10, 0x1AC12),      # bcdDevice
    (0x1ACBA, 0x1ACBE, 0x1ACC4, 0x1ACC8),      # the descriptor pointer table, entries 0 and 1
    (0x1ACC0, 0x1ACC4, 0x1ACCA, 0x1ACCE),      # entries 2 and 3
    (0x1ACC6, 0x1ACC8, 0x1ACD0, 0x1ACD2),      # entry 4
    (0x1AEEE, 0x1AEF8, 0x1AEF8, 0x1AEF8),      # the 300's 0xFF padding, which the 350 has no room for
]
EQUAL_RUNS = [(s - BASE, e - BASE, d) for s, e, d in EQUAL_RUNS]
REWRITTEN = [(a - BASE, b - BASE, c - BASE, d - BASE) for a, b, c, d in REWRITTEN]


def _decode_runs(a, b):
    """Walk both images over the equal runs and sort every pair of instructions into a class."""
    classes = {'same': 0, 'target': 0, 'relative': 0, 'literal': 0, 'into_rewritten': 0}
    literals = []

    def shifted(address):
        offset = address - BASE
        for start, end, delta in EQUAL_RUNS:
            if start <= offset < end:
                return address + delta
        return None

    for start, end, delta in EQUAL_RUNS:
        ao = start
        while ao < end:
            ia = isa.decode(a, ao, BASE)
            ib = isa.decode(b, ao + delta, BASE)
            assert ia.words == ib.words and ia.category == ib.category and ia.mnemonic == ib.mnemonic, hex(ao)
            raw_a = a[ao:ao + 2 * ia.words]
            raw_b = b[ao + delta:ao + delta + 2 * ib.words]
            if raw_a == raw_b:
                classes['same'] += 1
            elif ia.category == isa.ABS20:
                assert shifted(ia.fields['target']) == ib.fields['target'], hex(BASE + ao)
                classes['target'] += 1
            elif ia.category in (isa.REL8, isa.REL11):
                moved = shifted(ia.fields['target'])
                if moved is None:
                    classes['into_rewritten'] += 1
                    literals.append(('branch', BASE + ao, ia.fields['target'], ib.fields['target']))
                else:
                    assert moved == ib.fields['target'], hex(BASE + ao)
                    classes['relative'] += 1
            elif ia.category == isa.LITERAL:
                classes['literal'] += 1
                literals.append((ia.mnemonic, BASE + ao, ia.fields['k'], ib.fields['k']))
            else:
                raise AssertionError('an instruction differs and is no address: %05x %s' % (BASE + ao, ia.mnemonic))
            ao += 2 * ia.words
        assert ao == end, 'a run does not end on an instruction boundary at %x' % end
    return classes, literals


def _text(code, base, start, count):
    """The listing's instruction text, without address and bytes."""
    out = []
    for line in disasm.disassemble(code, base, start, count):
        tokens = line.split(':', 1)[1].split()
        while tokens and len(tokens[0]) == 2 and all(c in '0123456789abcdef' for c in tokens[0]):
            tokens.pop(0)
        out.append(' '.join(tokens))
    return out


HEX = re.compile(r'0x[0-9a-f]+')


def _masked(code, base):
    """(address, masked text) for a whole image: RAM addresses, literals and branch targets masked, the
    special function register names kept, which is how two builds with different RAM maps compare."""
    out = []
    count = len(code) // 2
    for line in disasm.disassemble(code, base, base, count):
        address = int(line[2:7], 16)
        text = line[21:]
        out.append((address, HEX.sub('@', text)))
    return out


def _stretches(a, b, base):
    """The stretches where two images' masked listings differ, as (tag, A address, A count, B address,
    B count)."""
    ta, tb = _masked(a, base), _masked(b, base)
    sm = difflib.SequenceMatcher(None, [t for _, t in ta], [t for _, t in tb], autojunk=False)
    out = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            continue
        a0 = ta[i1][0] if i1 < len(ta) else base + len(a)
        b0 = tb[j1][0] if j1 < len(tb) else base + len(b)
        out.append((tag, a0, i2 - i1, b0, j2 - j1))
    return out


def _last_non_ff(data):
    end = len(data)
    while data[end - 1] == 0xFF:
        end -= 1
    return end


class TheTwoApplications(unittest.TestCase):
    def setUp(self):
        lab.require('h300_code', 'h350_unit_code', 'h350_code')
        self.a = lab.load('h300_code')
        self.b = lab.load('h350_unit_code')

    def test_the_350s_package_is_what_the_unit_runs(self):
        package = lab.load('h350_code')
        self.assertEqual((len(self.b), len(package)), (73464, 73472))
        self.assertEqual(package[:73464], self.b)
        self.assertEqual(package[73464:], b'\xFF' * 8)

    def test_read_straight_across_37809_bytes_differ(self):
        self.assertEqual((len(self.a), len(self.b)), (73464, 73464))
        self.assertEqual(sum(x != y for x, y in zip(self.a, self.b)), 37809)

    def test_the_headers_state_one_version_and_one_length_and_both_verify(self):
        ha = firmware.parse_header(self.a, BASE)
        hb = firmware.parse_header(self.b, BASE)
        self.assertEqual((ha.version, hb.version), ('1.4', '1.4'))
        self.assertEqual((ha.stated_size, hb.stated_size), (73472, 73472))
        self.assertEqual((ha.entry_point, hb.entry_point), (0x1AECA, 0x1AED4))
        self.assertEqual((ha.checksum, hb.checksum), (0xAF6A, 0x8F7B))
        # The stated length is eight more than the read, and the eight are 0xFF in the 350's package.
        self.assertTrue(firmware.verify_checksum(self.a + b'\xFF' * 8))
        self.assertTrue(firmware.verify_checksum(self.b + b'\xFF' * 8))
        # Bytes 2 to 7 and the magic are the same in both.
        self.assertEqual(self.a[2:0x0A], self.b[2:0x0A])

    def test_the_300s_code_ends_ten_bytes_sooner_and_is_padded_to_the_same_length(self):
        self.assertEqual((_last_non_ff(self.a), _last_non_ff(self.b)), (73454, 73464))
        self.assertEqual(self.a[73454:], b'\xFF' * 10)

    def test_the_runs_and_stretches_tile_both_images(self):
        # A: every offset is in a run or in a rewritten stretch, once.
        covered_a = sorted([(s, e) for s, e, _ in EQUAL_RUNS] + [(s, e) for s, e, _, _ in REWRITTEN if e > s])
        pos = 0
        for s, e in covered_a:
            self.assertEqual(s, pos, 'a gap or an overlap in the 300 at %x' % pos)
            pos = e
        self.assertEqual(pos, 73464)
        covered_b = sorted([(s + d, e + d) for s, e, d in EQUAL_RUNS] + [(s, e) for _, _, s, e in REWRITTEN if e > s])
        pos = 0
        for s, e in covered_b:
            self.assertEqual(s, pos, 'a gap or an overlap in the 350 at %x' % pos)
            pos = e
        self.assertEqual(pos, 73464)

    def test_inside_the_runs_only_addresses_differ_and_the_counts_are(self):
        classes, literals = _decode_runs(self.a, self.b)
        self.assertEqual(classes, {'same': 30579, 'target': 1083, 'relative': 54, 'literal': 9, 'into_rewritten': 1})
        # Every literal is a pointer byte moved by the shift of ten: the low byte plus 10 modulo 256, and
        # the one high byte after a low byte that carried.
        pairs = [(a, b) for kind, _, a, b in literals if kind == 'MOVLW']
        self.assertEqual(len(pairs), 9)
        self.assertEqual(sorted(((b - a) & 0xFF) for a, b in pairs), [1] + [10] * 8)
        self.assertIn((0xAB, 0xAC), pairs)

    def test_the_one_branch_into_the_rewritten_block_is_the_cases_join(self):
        _, literals = _decode_runs(self.a, self.b)
        self.assertEqual([x for x in literals if x[0] == 'branch'], [('branch', 0x1136A, 0x1137E, 0x1137A)])

    def test_the_rewritten_stretches_are_the_listed_differences(self):
        a, b = self.a, self.b
        # The descriptor: bcdDevice 0x1078 against 0x1104, the product string equal in both.
        self.assertEqual(a[0x1AC06 - BASE:0x1AC08 - BASE], b'\x78\x10')
        self.assertEqual(b[0x1AC10 - BASE:0x1AC12 - BASE], b'\x04\x11')
        string = 'Harmony Remote 0-1.4.0'.encode('utf-16-le')
        self.assertEqual((a.count(string), b.count(string)), (2, 2))
        # A pointer into the block and a table of five, each the 300's plus 10.
        at = 0x093B1 - BASE
        self.assertEqual(int.from_bytes(a[at:at + 3], 'little') + 10, int.from_bytes(b[at:at + 3], 'little'))
        for k in range(5):
            at = 0x1ACBA - BASE + 3 * k
            pa = int.from_bytes(a[at:at + 3], 'little')
            pb = int.from_bytes(b[at + 10:at + 13], 'little')
            self.assertEqual(pa + 10, pb, 'table pointer %d' % k)
        self.assertEqual([int.from_bytes(a[0x1ACBA - BASE + 3 * k:0x1ACBA - BASE + 3 * k + 3], 'little') for k in range(5)],
                         [0x1AC0C, 0x1AC0C, 0x1AC35, 0x1AC39, 0x1AC69])
        # The relaxed call.
        self.assertEqual(_text(a, BASE, 0x11A80, 2), ['MOVFF 0x2b3,0x2ad', 'RCALL 0x112b0'])
        self.assertEqual(_text(b, BASE, 0x11A88, 2), ['MOVFF 0x2b3,0x2ad', 'CALL 0x112b0'])


class TheSkinRoutinesAreInTheSharedRuns(unittest.TestCase):
    """`tests/test_harmony_350_skin.py` read the skin in the 350's image: the getter at 0x14626 and the record
    writer at 0x15288, both above the last shift, so the 300's are ten lower and identical."""

    def test_the_getter_and_the_record_writer_are_the_same_code_in_both(self):
        lab.require('h300_code', 'h350_unit_code')
        a, b = lab.load('h300_code'), lab.load('h350_unit_code')
        for at, count in ((0x14626, 8), (0x15288, 40)):
            self.assertTrue(any(s - BASE + 10 <= at - BASE < e - BASE + 10 for s, e, d in
                                [(x + BASE, y + BASE, z) for x, y, z in EQUAL_RUNS] if d == 10), hex(at))
            ta = [HEX.sub('@', t) for t in _text(a, BASE, at - 10, count)]
            tb = [HEX.sub('@', t) for t in _text(b, BASE, at, count)]
            self.assertEqual(ta, tb, hex(at))


class TheOneFunctionThatDiffers(unittest.TestCase):
    """The `0x7D` arm: the 300 stores the send kind as it stands and the 350 masks it to two bits."""

    def setUp(self):
        lab.require('h300_code', 'h350_unit_code')
        self.a = lab.load('h300_code')
        self.b = lab.load('h350_unit_code')

    def test_the_300_stores_the_kind_and_the_350_masks_it_in_three_places(self):
        # The 300: cases 0 and 3 copy the operand's high byte, 1 and 2 swap, the rest SETF.
        self.assertEqual(_text(self.a, BASE, 0x11354, 16),
                         ['MOVF 0xb4,B,W', 'XORLW 0x02', 'BZ 0x11372', 'XORLW 0x03', 'BZ 0x1136c',
                          'XORLW 0x01', 'BZ 0x11366', 'XORLW 0x03', 'BNZ 0x1137a', 'MOVFF 0x2b4,0xd06', 'BRA 0x1137e',
                          'MOVLB 0xd', 'MOVLW 0x02', 'BRA 0x11376', 'MOVLB 0xd', 'MOVLW 0x01'])
        self.assertEqual(_text(self.a, BASE, 0x1137A, 7),
                         ['MOVLB 0xd', 'SETF 0xd06', 'MOVFF 0xd06,0x203', 'MOVFF 0x2b3,0x09b',
                          'MOVFF 0x2b4,0x09a', 'CALL 0x11ffa', 'IORLW 0x00'])
        # The 350: the same chain behind `ANDLW 0x03`, and the same store behind another.
        self.assertEqual(_text(self.b, BASE, 0x11354, 4), ['MOVF 0xb4,B,W', 'ANDLW 0x03', 'XORLW 0x02', 'BZ 0x11376'])
        self.assertEqual(_text(self.b, BASE, 0x11368, 3), ['MOVF 0xb4,B,W', 'ANDLW 0x03', 'MOVLB 0xd'])
        self.assertEqual(_text(self.b, BASE, 0x1137E, 12),
                         ['MOVLB 0xd', 'SETF 0xd06', 'MOVF 0xd06,W', 'ANDLW 0x03', 'MOVLB 0x2', 'MOVWF 0x203',
                          'MOVFF 0x2b3,0x09b', 'MOVFF 0x2b4,0x09a', 'CALL 0x12004', 'IORLW 0x00', 'BZ 0x1139e',
                          'GOTO 0x11d20'])

    def test_the_kind_has_three_accesses_in_each_and_the_chain_is_the_same(self):
        # Three accesses each, by `tools/pic18_trace.py`: `SETF` at 0x10F98 in both, the store, and the
        # chain's read. The start up value is therefore 0xFF, the one no case matches.
        self.assertEqual(_text(self.a, BASE, 0x10F96, 3)[1:], _text(self.b, BASE, 0x10F96, 3)[1:])
        # The bank is the tracer's inference, `MOVLB 2` sitting well before; the address is bank 2, offset 3.
        self.assertEqual(_text(self.b, BASE, 0x10F96, 2), ['MOVWF 0x02,B', 'SETF 0x03,B'])
        # The chain reads 0x203 at 0x11EA2 in the 300 and 0x11EAC in the 350, ten apart, and routes 0xFF to
        # the default.
        ta = chains.chain_table(self.a, BASE, 0x11EA4)
        tb = chains.chain_table(self.b, BASE, 0x11EAE)
        self.assertEqual({k: v - 10 for k, v in tb.items()}, ta)
        self.assertEqual(set(tb), {1, 2, 3}, 'a kind of 0xFF is none of the cases and falls through to kind 0')
        self.assertEqual(_text(self.b, BASE, 0x11EAA, 2), ['MOVLB 0x2', 'MOVF 0x203,W'])
        self.assertEqual(_text(self.a, BASE, 0x11EA0, 2), ['MOVLB 0x2', 'MOVF 0x203,W'])

    def test_the_mask_changes_the_kind_only_above_3(self):
        def a_kind(group):
            return {0: 0, 3: 3, 1: 2, 2: 1}.get(group, 0xFF)

        def b_kind(group):
            return a_kind(group) & 3
        differing = [g for g in range(256) if a_kind(g) != b_kind(g)]
        self.assertEqual(differing, list(range(4, 256)))
        self.assertEqual({b_kind(g) for g in differing}, {3})
        self.assertEqual({a_kind(g) for g in differing}, {0xFF})

    def test_the_five_configurations_hold_no_group_above_3(self):
        import test_harmony_350_keys as keys
        total = 0
        highest = 0
        for config in keys._configs():
            count = config.u(config.pointer(7), 2)
            for index in range(count):
                for operand, opcode in config.action_list(index):
                    if opcode == 0x7D:
                        total += 1
                        highest = max(highest, operand >> 8)
        self.assertEqual((total, highest), (602, 3))


class TheTwoSafeModeImages(unittest.TestCase):
    def setUp(self):
        lab.require('h300_safemode', 'h350_safemode')
        self.a = lab.load('h300_safemode')
        self.b = lab.load('h350_safemode')

    def test_the_300s_is_version_1_2_and_the_350s_is_1_4(self):
        ha = firmware.parse_header(self.a, SAFE_BASE)
        hb = firmware.parse_header(self.b, SAFE_BASE)
        self.assertEqual((ha.has_magic, hb.has_magic), (True, True))
        self.assertEqual((ha.version, hb.version), ('1.2', '1.4'))
        self.assertEqual((ha.stated_size, hb.stated_size), (25408, 26048))
        self.assertEqual((len(self.a), len(self.b)), (25400, 26040))
        self.assertEqual((ha.entry_point, hb.entry_point), (0x72D2, 0x758E))
        # The 300's verifies over its stated length with the eight unserved bytes as 0xFF; the 350's
        # cannot be checked, its last eight bytes being a routine that was not read.
        self.assertTrue(firmware.verify_checksum(self.a + b'\xFF' * 8))
        self.assertFalse(firmware.verify_checksum(self.b + b'\xFF' * 8))

    def test_the_product_string_and_bcddevice_say_the_same(self):
        for data, version in ((self.a, '1.2.0'), (self.b, '1.4.0')):
            string = ('Harmony Remote 4-' + version).encode('utf-16-le')
            self.assertEqual(data.count(string), 2)
        self.assertEqual(self.a[0x2A:0x2C], b'\x78\x10')
        self.assertEqual(self.b[0x2A:0x2C], b'\x04\x11')

    def test_with_ram_and_literals_masked_the_listings_differ_in_24_stretches(self):
        stretches = _stretches(self.a, self.b, SAFE_BASE)
        self.assertEqual(len(stretches), 24)
        for tag, a0, na, b0, nb in stretches:
            self.assertIn(tag, ('replace', 'insert', 'delete'))
        self.assertEqual({t: sum(1 for s in stretches if s[0] == t) for t in ('replace', 'insert', 'delete')},
                         {'replace': 9, 'insert': 13, 'delete': 2})
        # The block of 709 instructions that moved, and the 890 instruction stretch it is matched to.
        self.assertIn(('delete', 0x454A, 709, 0x4D8E, 0), stretches)
        self.assertIn(('insert', 0x35C4, 0, 0x3604, 890), stretches)
        # What the 350 holds that the 300 does not, within that stretch: 181 instructions, 408 bytes, from 0x3B52.
        ta, tb = _masked(self.a, SAFE_BASE), _masked(self.b, SAFE_BASE)
        ia = next(k for k, (at, _) in enumerate(ta) if at == 0x454A)
        ib = next(k for k, (at, _) in enumerate(tb) if at == 0x3604)
        sm = difflib.SequenceMatcher(None, [t for _, t in ta[ia:ia + 709]], [t for _, t in tb[ib:ib + 890]],
                                     autojunk=False)
        differing = [(tag, tb[ib + j1][0], j2 - j1) for tag, i1, i2, j1, j2 in sm.get_opcodes() if tag != 'equal']
        self.assertEqual([d for d in differing if d[0] == 'insert'], [('insert', 0x3604, 1), ('insert', 0x3B52, 181)])
        self.assertEqual((0x3CEA - 0x3B52, 204 - 181), (408, 23), 'a stretch of 408 bytes, 181 instructions, 23 of them two words')

    def test_the_350_holds_a_15000_and_a_1000_in_bank_14_that_the_300_does_not(self):
        # `MOVLW 0x98 / MOVWF 0x7c, MOVLW 0x3a / MOVWF 0x7d` is 15000, `MOVLW 0xe8 ... MOVLW 0x03` 1000.
        b = _text(self.b, SAFE_BASE, 0x13B4, 5)
        self.assertEqual(b, ['MOVLB 0xe', 'MOVLW 0x98', 'MOVWF 0xe7c', 'MOVLW 0x3a', 'MOVWF 0xe7d'])
        self.assertEqual(0x3A98, 15000)
        self.assertIn(('insert', 0x13AE, 0, 0x13B2, 7), _stretches(self.a, self.b, SAFE_BASE))


class TheTwoBootloaders(unittest.TestCase):
    def setUp(self):
        lab.require('h300_bootloader', 'h350_bootloader')
        self.a = lab.load('h300_bootloader')
        self.b = lab.load('h350_bootloader')

    def test_1998_of_4096_bytes_differ(self):
        self.assertEqual((len(self.a), len(self.b)), (4096, 4096))
        self.assertEqual(sum(x != y for x, y in zip(self.a, self.b)), 1998)

    def test_the_masked_listings_differ_in_40_stretches(self):
        self.assertEqual(len(_stretches(self.a, self.b, 0)), 40)

    def test_the_restart_combination_swaps_code_53_for_code_20_in_the_350s(self):
        self.assertEqual(_text(self.a, 0, 0x380, 4), ['BCF PORTD,3', 'BTFSC PORTB,4', _text(self.a, 0, 0x384, 1)[0],
                                                       'BSF PORTD,3'])
        self.assertEqual(_text(self.b, 0, 0x380, 2), ['BCF PORTE,4', 'BTFSC PORTB,7'])
        # By the scan's formula, 4 * line + return: PORTD bit 3 is line 13 and PORTB bit 4 return 1, 53;
        # PORTE bit 4 is line 4 and PORTB bit 7 return 4, 20.
        self.assertEqual((4 * 13 + 1, 4 * 4 + 4), (53, 20))

    def test_the_start_decision_tests_the_same_keys_and_the_same_mark(self):
        for data, at in ((self.a, 0x848), (self.b, 0x726)):
            listing = _text(data, 0, at, 26)
            self.assertIn('MOVLW 0x14', listing)
            self.assertIn('MOVLW 0x2c', listing)
        for data in (self.a, self.b):
            text = '\n'.join(_text(data, 0, 0, 2048))
            self.assertIn('MOVLW 0x48', text)
            self.assertIn('MOVLW 0x47', text)

    def test_only_the_350s_has_a_second_serial_bus_exchange(self):
        count = {}
        for name, data in (('300', self.a), ('350', self.b)):
            text = '\n'.join(_text(data, 0, 0, 2048))
            count[name] = (text.count('SSP2BUF'), text.count('SSP2CON1'))
        # The 300's one mention is `BCF SSP2CON1,5` at 0x0E18, the port switched off.
        self.assertEqual(count, {'300': (0, 1), '350': (2, 6)})


if __name__ == '__main__':
    unittest.main()
