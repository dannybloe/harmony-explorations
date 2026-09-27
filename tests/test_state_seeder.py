"""
The state variable seeder, on all three architectures whose firmware is in hand.

`docs/findings.md` section 274. Every state variable's **starting value** is the `first` field of its
own base slot 13 record, and at boot the firmware walks that section and writes each one into the
variable array. That is what makes the value meaning "no activity is running" a stated number rather
than something a reader has to work out, which is the question this section was written to answer.

Section 138 read the seeder on the Harmony One (arch 12) alone. What is added here is that arch 14
and arch 9 do the same thing, and that **arch 9 does it with two differences that matter**:

* arch 12 and arch 14 test the value against `0xFEFE` and skip the store, which is how a record says
  "this variable has no initial value". Arch 9 has no such test in the loop and fills the array's
  unused tail with `0xFE` afterwards instead;
* the guard is per variable on arch 9 and all or nothing on the other two. Arch 12 and arch 14 carry
  one byte that, when nonzero, skips the store for **every** variable. Arch 9's, when zero, skips
  only indices 0 to 12, which are the thirteen the firmware owns, and seeds everything above them.

Arch 9's guard is traced too: one reader, one writer, and that writer copies it from a byte with
exactly two writers, each a literal followed immediately by the call. The literal 1 site is the
**application's startup**, so a Harmony 525 seeds its clock at boot exactly as a Harmony One does on a
power cycle. The literal 0 site is a runtime path this file does not name, and the test asserts the
shape of both rather than a story about either.

The closure is the seeker census. Each architecture's section seeker takes a raw slot in a register
that every caller loads with a literal, so one scan names every slot the firmware ever fetches. Slot
13 is on all three lists and **slots 0 and 1 are on none**, which is section 47's arch 12 and arch 14
result reproduced on a third architecture by a route that had nothing to do with it.

No remote is needed. These are images.
"""
import unittest

import lab
from harmony.pic18 import isa

# Per architecture: the image, its execution base, and the seeker whose call sites are the census.
ARCHITECTURES = {
    12: {'image': 'one34_code', 'base': 0x20000, 'seeker': 0x2BA76, 'loop': 0x2A2DE},
    14: {'image': 'h700_code', 'base': 0x9000, 'seeker': 0x10B92, 'loop': 0x179F0},
    9: {'image': 'h525_code', 'base': 0x0000, 'seeker': 0x066A8, 'loop': 0x047D6},
}

# What each seeker's callers ask for, as the exact set rather than a range, because arch 12 has a
# hole in the middle of its range and a range hides it: **raw slot 8 is its NULL slot**, so nothing
# fetches it. Section 47 published the ranges and the site counts; the counts are reproduced here by
# an independent scan, 24 and 19, which is what makes this a check rather than a restatement.
SEEKED_SLOTS = {
    12: [2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    14: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
    9: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
}
SEEKER_CALL_SITES = {12: 24, 14: 19, 9: 17}

# Arch 9's firmware owns state variables 0 to 12, and its loop names the 13 as a literal. Section 138 read
# that as every architecture's block; section 284 found 0 to 17 on arch 8, 12 and 14.
FIRMWARE_STATE_VARIABLES = 13
# The record's "no initial value" marker on arch 12 and arch 14, one byte of it.
NO_INITIAL_VALUE_BYTE = 0xFE

# Arch 9's guard, section 274: the routine that copies it in, the seeder it then calls, the two sites
# that set it with a literal, and the application entry that reaches the one meaning "seed the clock".
GUARD_WRITER = 0x07930
SEEDER_ENTRY = 0x0479A
GUARD_SITES = {0x04C72: 1, 0x02498: 0}
APPLICATION_ENTRY = 0x07FB4
MAIN = 0x04BFA


def instructions(name, base, start, count):
    """`count` decoded instructions from `start`, as (address, Instr) pairs."""
    code = lab.load(name)
    out = []
    offset = start - base
    for _ in range(count):
        instr = isa.decode(code, offset, base)
        out.append((base + offset, instr))
        offset += 2 * instr.words
    return out


def literals(pairs):
    """Every `MOVLW` literal in a decoded run, in order."""
    return [p.fields['k'] for _, p in pairs if p.mnemonic == 'MOVLW']


class TheSeederExistsOnEveryArchitectureWeHaveAnImageFor(unittest.TestCase):
    """One loop per architecture, each walking base slot 13 and storing each record's `first`."""

    def test_every_architecture_seeks_base_slot_13(self):
        """The census, which is what says the loop is reading the state table at all."""
        lab.require(*(one['image'] for one in ARCHITECTURES.values()))
        for arch, where in ARCHITECTURES.items():
            with self.subTest(architecture=arch):
                code = lab.load(where['image'])
                sites = _call_sites(code, where['base'], where['seeker'])
                slots = _slot_per_site(code, where['base'], sites)
                self.assertNotIn(None, slots,
                                 f'arch {arch}: a call site whose slot literal is unresolved')
                self.assertEqual(len(sites), SEEKER_CALL_SITES[arch],
                                 f'arch {arch}: call sites, section 47 for the two it published')
                self.assertEqual(sorted(set(slots)), SEEKED_SLOTS[arch],
                                 f'arch {arch}: the slots its firmware fetches')
                self.assertIn(13, slots, f'arch {arch}: base slot 13 is fetched')
                # The half section 47 drew the conclusion from, reproduced on arch 9 as well: the
                # name tree and the architecture record are read by the host and by nothing here.
                self.assertNotIn(0, slots, f'arch {arch}: raw slot 0 is never fetched')
                self.assertNotIn(1, slots, f'arch {arch}: raw slot 1 is never fetched')

    def test_arch_12_and_arch_14_skip_a_record_that_says_it_has_no_initial_value(self):
        """`0xFEFE` in `first` means "leave this variable alone", tested a byte at a time."""
        lab.require('one34_code', 'h700_code')
        for arch in (12, 14):
            with self.subTest(architecture=arch):
                where = ARCHITECTURES[arch]
                run = instructions(where['image'], where['base'], where['loop'], 30)
                marker = [one for one in literals(run) if one == NO_INITIAL_VALUE_BYTE]
                self.assertEqual(len(marker), 2,
                                 f'arch {arch}: both bytes of the marker are compared')
                # The comparison is an XOR against the value, which is what makes it a test for
                # equality rather than a store of 0xFE.
                self.assertTrue(any(p.mnemonic == 'XORWF' for _, p in run),
                                f'arch {arch}: the marker is compared, not written')

    def test_arch_9s_guard_is_set_from_two_places_and_the_startup_one_seeds_everything(self):
        """One reader, one writer, and two literals behind it. Section 274."""
        lab.require('h525_code')
        code = lab.load('h525_code')
        base = ARCHITECTURES[9]['base']
        # The writer copies the flag in and calls the seeder in the next instruction.
        run = instructions('h525_code', base, GUARD_WRITER, 2)
        self.assertEqual(run[0][1].mnemonic, 'MOVFF')
        self.assertEqual(run[1][1].fields['target'], SEEDER_ENTRY,
                         'the guard is set immediately before the loop runs')
        # And the flag itself is a literal at each of the two sites, one of them the startup path.
        for site, expected in GUARD_SITES.items():
            with self.subTest(site=hex(site)):
                pair = instructions('h525_code', base, site, 2)
                if expected == 0:
                    self.assertEqual(pair[0][1].mnemonic, 'CLRF')
                else:
                    self.assertEqual(literals(instructions('h525_code', base, site - 2, 1)),
                                     [expected])
                self.assertEqual(pair[1][1].fields['target'], GUARD_WRITER,
                                 'each site calls the routine that copies the flag in')
        # The startup site's routine is entered from the C runtime that calls it in an endless loop,
        # which is what says "boot" rather than "some path that happens to seed everything".
        entry = instructions('h525_code', base, APPLICATION_ENTRY, 5)
        self.assertEqual([p.mnemonic for _, p in entry][:3], ['LFSR', 'LFSR', 'CLRF'])
        self.assertEqual(entry[4][1].fields['target'], MAIN,
                         'the application entry calls main, which is the flag 1 site')

    def test_arch_9_has_no_such_test_and_guards_the_firmware_variables_by_index(self):
        """The difference, and it is the reason this file exists rather than a note on section 138."""
        lab.require('h525_code')
        where = ARCHITECTURES[9]
        run = instructions(where['image'], where['base'], where['loop'], 30)
        self.assertNotIn(NO_INITIAL_VALUE_BYTE, literals(run),
                         'arch 9 does not compare a record against the no initial value marker')
        # Instead the loop carries the firmware's own variable count as a literal, and the branch
        # after it is a borrow test, so an index below 13 takes the skip.
        self.assertIn(FIRMWARE_STATE_VARIABLES, literals(run),
                      'arch 9 compares the index against the thirteen the firmware owns')
        after = [p.mnemonic for _, p in run]
        self.assertIn('SUBWF', after, 'the index is compared by subtraction')
        self.assertIn('BNC', after, 'and the borrow is what skips the firmware variables')


def _call_sites(code, base, target):
    """Every address that calls `target`, by decoding the whole image once."""
    out = []
    offset = 0
    while offset + 1 < len(code):
        instr = isa.decode(code, offset, base)
        if (instr.mnemonic in ('CALL', 'RCALL', 'GOTO')
                and instr.fields.get('target') == target):
            out.append(base + offset)
        offset += 2 * instr.words
    return out


def _slot_per_site(code, base, sites):
    """The literal each call site loads, walking back up to eight instructions from it."""
    out = []
    for site in sites:
        found = None
        for back in range(2, 18, 2):
            if site - back < base:
                break
            instr = isa.decode(code, site - back - base, base)
            if instr.mnemonic == 'MOVLW':
                found = instr.fields['k']
                break
        out.append(found)
    return out


if __name__ == '__main__':
    unittest.main()
